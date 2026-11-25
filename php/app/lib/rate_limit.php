<?php
/**
 * Limiteur de débit (fenêtre fixe, par clé), port de src/lib/rate-limit.ts.
 *
 * Next.js gardait les compteurs en mémoire ; en PHP chaque requête est un
 * processus neuf, donc les compteurs vivent dans des fichiers JSON sous
 * storage/ratelimit/ (un fichier par clé, verrou flock).
 * En cas d'erreur d'écriture, la limite laisse passer (fail open) et journalise.
 */

function rl_dir(): string
{
    $base = defined('STORAGE_DIR') ? STORAGE_DIR : dirname(__DIR__, 2) . '/storage';
    return $base . '/ratelimit';
}

function rl_now_ms(): float
{
    return floor(microtime(true) * 1000);
}

function rl_file(string $key): string
{
    return rl_dir() . '/' . hash('sha256', $key) . '.json';
}

/** Ménage occasionnel : supprime les compteurs non touchés depuis plus de 25 h (fenêtre max : 24 h). */
function rl_gc(): void
{
    if (mt_rand(1, 200) !== 1) return;
    $files = glob(rl_dir() . '/*.json');
    if (!$files) return;
    $limit = time() - 25 * 3600;
    foreach ($files as $f) {
        $mtime = @filemtime($f);
        if ($mtime !== false && $mtime < $limit) @unlink($f);
    }
}

/**
 * Ouvre le compteur d'une clé sous verrou exclusif, applique $fn et réécrit le résultat.
 * $fn reçoit ['count' => int, 'resetAt' => float(ms)] ou null, et retourne
 * [nouvel état (ou null pour ne rien écrire), valeur de retour].
 */
function rl_update(string $key, callable $fn)
{
    $dir = rl_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        error_log('[infoliquidation] rate-limit : dossier non inscriptible ' . $dir);
        return $fn(null)[1];
    }
    $fh = @fopen(rl_file($key), 'c+');
    if ($fh === false) {
        error_log('[infoliquidation] rate-limit : fichier non inscriptible');
        return $fn(null)[1];
    }
    try {
        flock($fh, LOCK_EX);
        $raw = stream_get_contents($fh);
        $bucket = null;
        if (is_string($raw) && $raw !== '') {
            $d = json_decode($raw, true);
            if (is_array($d) && isset($d['count'], $d['resetAt'])) {
                $bucket = ['count' => (int) $d['count'], 'resetAt' => (float) $d['resetAt']];
            }
        }
        [$next, $result] = $fn($bucket);
        if ($next !== null) {
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, json_encode($next));
            fflush($fh);
        }
        return $result;
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}

/** @return array{ok: bool, retryAfter: int} */
function rate_limit(string $key, int $limit, int $windowMs): array
{
    rl_gc();
    $now = rl_now_ms();
    return rl_update($key, function (?array $bucket) use ($limit, $windowMs, $now) {
        if ($bucket === null || $bucket['resetAt'] <= $now) {
            return [['count' => 1, 'resetAt' => $now + $windowMs], ['ok' => true, 'retryAfter' => 0]];
        }
        $bucket['count'] += 1;
        if ($bucket['count'] > $limit) {
            $retry = (int) ceil(($bucket['resetAt'] - $now) / 1000);
            return [$bucket, ['ok' => false, 'retryAfter' => $retry]];
        }
        return [$bucket, ['ok' => true, 'retryAfter' => 0]];
    });
}

/**
 * Nombre d'événements enregistrés pour cette clé dans la fenêtre en cours (sans incrémenter).
 * @return array{count: int, retryAfter: int}
 */
function rate_peek(string $key): array
{
    $file = rl_file($key);
    if (!is_file($file)) return ['count' => 0, 'retryAfter' => 0];
    $now = rl_now_ms();
    return rl_update($key, function (?array $bucket) use ($now) {
        if ($bucket === null || $bucket['resetAt'] <= $now) return [null, ['count' => 0, 'retryAfter' => 0]];
        return [null, ['count' => $bucket['count'], 'retryAfter' => (int) ceil(($bucket['resetAt'] - $now) / 1000)]];
    });
}

/** Enregistre un événement (ex. échec de connexion) dans une fenêtre fixe. */
function rate_record(string $key, int $windowMs): void
{
    rate_limit($key, PHP_INT_MAX, $windowMs);
}

function rate_clear(string $key): void
{
    $file = rl_file($key);
    if (is_file($file)) @unlink($file);
}

/* ---------- Anti-spam des formulaires publics ---------- */

const FORM_MAX_SENDS = 5;                 // envois permis…
const FORM_WINDOW_MS = 15 * 60 * 1000;    // …par tranche de 15 min, par adresse IP
const FORM_BLOCK_MS = 60 * 60 * 1000;     // au-delà : bloqué 1 h

function form_rate_reject(int $seconds): never
{
    json_response(['ok' => false, 'error' => 'rate_limited', 'retryAfter' => $seconds], 429, ['Retry-After' => (string) $seconds]);
}

/**
 * Bloque une même adresse IP après 5 envois VALIDES en 15 min, pendant 1 h.
 * Appelé après la validation : un client qui corrige des erreurs n'est jamais compté.
 * $form : 'pickup' ou 'contact' (compteurs séparés).
 */
function form_rate_guard(string $form): void
{
    $ip = client_ip();
    $blockKey = "$form-block:$ip";
    $block = rate_peek($blockKey);
    if ($block['count'] > 0) form_rate_reject(max(1, $block['retryAfter']));

    $limit = rate_limit("$form:$ip", FORM_MAX_SENDS, FORM_WINDOW_MS);
    if (!$limit['ok']) {
        rate_record($blockKey, FORM_BLOCK_MS);
        error_log("[infoliquidation] anti-spam : $form bloqué 1 h pour $ip");
        form_rate_reject((int) (FORM_BLOCK_MS / 1000));
    }
}

/**
 * Piège à robots : le champ caché « website » est invisible pour les humains.
 * On ne jette JAMAIS une demande (un remplissage automatique du navigateur
 * pourrait le remplir chez un vrai client) : on la marque « à vérifier ».
 * @return bool true si le champ piège est rempli (probablement un robot)
 */
function form_honeypot(&$value): bool
{
    // Le corps JSON est décodé en objet (stdClass) ; on accepte aussi un tableau
    if (is_object($value)) {
        $trap = $value->website ?? '';
        unset($value->website);
    } elseif (is_array($value)) {
        $trap = $value['website'] ?? '';
        unset($value['website']);
    } else {
        return false;
    }
    $suspect = is_string($trap) && trim($trap) !== '';
    if ($suspect) error_log('[infoliquidation] anti-spam : champ piège rempli, demande marquée à vérifier');
    return $suspect;
}

/** Préfixe du sujet du courriel quand la demande ressemble à un robot. */
const FORM_SUSPECT_PREFIX = '[À vérifier : possible robot] ';
