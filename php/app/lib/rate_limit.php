<?php
/**
 * Limiteur de débit (fenêtre fixe, par clé), port de src/lib/rate-limit.ts.
 *
 * Next.js gardait les compteurs en mémoire ; en PHP chaque requête est un
 * processus neuf, donc les compteurs vivent dans des fichiers JSON sous
 * storage/ratelimit/ (un fichier par clé, verrou flock).
 * - Les adresses IPv6 sont regroupées par /64 (rate_limit_ip()).
 * - Au-delà de RL_MAX_FILES compteurs, les nouvelles clés partagent un compteur
 *   commun (« débordement ») au lieu de créer des fichiers : le disque ne peut pas être rempli.
 * - En cas d'erreur d'écriture, rl_failed() devient vrai : la connexion admin refuse
 *   (fail closed), les formulaires publics laissent passer et journalisent (fail open).
 */

const RL_MAX_FILES = 20000;
const RL_OVERFLOW_KEY = 'global:overflow';
/** Ménage : 1 requête sur 50, au plus 0,5 s. */
const RL_GC_ODDS = 50;
const RL_GC_BUDGET_S = 0.5;

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

/** Une écriture de compteur a échoué pendant cette requête. */
function rl_failed(?bool $set = null): bool
{
    static $failed = false;
    if ($set !== null) $failed = $set;
    return $failed;
}

/** Le dossier des compteurs existe (ou peut être créé) et est inscriptible. */
function rl_storage_ok(): bool
{
    $dir = rl_dir();
    return (is_dir($dir) || @mkdir($dir, 0700, true) || is_dir($dir)) && is_writable($dir);
}

/** Nombre approximatif de compteurs (recompté au plus toutes les 60 s, mis en cache dans .count). */
function rl_file_count(): int
{
    static $count = null;
    if ($count !== null) return $count;
    $meta = rl_dir() . '/.count';
    $raw = @file_get_contents($meta);
    if ($raw !== false && preg_match('/^(\d+) (\d+)$/D', trim($raw), $m) && (int) $m[2] > time() - 60) {
        return $count = (int) $m[1];
    }
    $count = 0;
    if ($dh = @opendir(rl_dir())) {
        while (($f = readdir($dh)) !== false) {
            if ($f[0] !== '.') $count++;
        }
        closedir($dh);
    }
    @file_put_contents($meta, $count . ' ' . time(), LOCK_EX);
    return $count;
}

/**
 * Fichier du compteur d'une clé. Les clés « global:… » ont toujours leur propre fichier ;
 * les autres basculent sur le compteur de débordement quand le dossier est plein.
 */
function rl_file_for(string $key): string
{
    $file = rl_file($key);
    if (str_starts_with($key, 'global:') || is_file($file) || rl_file_count() < RL_MAX_FILES) return $file;
    static $warned = false;
    if (!$warned) {
        $warned = true;
        security_log('ratelimit_overflow', ['outcome' => 'degraded', 'files' => rl_file_count()]);
    }
    return rl_file(RL_OVERFLOW_KEY);
}

/** Ménage occasionnel : supprime les compteurs non touchés depuis plus de 25 h (fenêtre max : 24 h). */
function rl_gc(): void
{
    if (mt_rand(1, RL_GC_ODDS) !== 1) return;
    $dir = rl_dir();
    $dh = @opendir($dir);
    if (!$dh) return;
    $limit = time() - 25 * 3600;
    $deadline = microtime(true) + RL_GC_BUDGET_S;
    while (($f = readdir($dh)) !== false) {
        if ($f[0] === '.' || !str_ends_with($f, '.json')) continue;
        $path = "$dir/$f";
        $mtime = @filemtime($path);
        if ($mtime !== false && $mtime < $limit) @unlink($path);
        if (microtime(true) > $deadline) break;
    }
    closedir($dh);
}

/**
 * Ouvre le compteur d'une clé sous verrou exclusif, applique $fn et réécrit le résultat.
 * $fn reçoit ['count' => int, 'resetAt' => float(ms)] ou null, et retourne
 * [nouvel état (ou null pour ne rien écrire), valeur de retour].
 */
function rl_update(string $key, callable $fn)
{
    if (!rl_storage_ok()) {
        rl_failed(true);
        security_log('ratelimit_storage_error', ['outcome' => 'error', 'reason' => 'dossier non inscriptible']);
        return $fn(null)[1];
    }
    $fh = @fopen(rl_file_for($key), 'c+');
    if ($fh === false) {
        rl_failed(true);
        security_log('ratelimit_storage_error', ['outcome' => 'error', 'reason' => 'fichier non inscriptible']);
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
            if (fwrite($fh, json_encode($next)) === false) rl_failed(true);
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
    $file = rl_file_for($key);
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
    // Jamais le compteur de débordement (partagé) : seulement le fichier propre à la clé
    $file = rl_file($key);
    if (is_file($file)) @unlink($file);
}

/* ---------- Anti-spam des formulaires publics ---------- */

const FORM_MAX_SENDS = 5;                 // envois permis…
const FORM_WINDOW_MS = 15 * 60 * 1000;    // …par tranche de 15 min, par adresse IP
const FORM_BLOCK_MS = 60 * 60 * 1000;     // au-delà : bloqué 1 h

function form_rate_reject(string $form, int $seconds): never
{
    security_log('form_submission', ['outcome' => 'rate_limited', 'form' => $form, 'status' => 429]);
    json_response(['ok' => false, 'error' => 'rate_limited', 'retryAfter' => $seconds], 429, ['Retry-After' => (string) $seconds]);
}

/**
 * Bloque une même adresse IP (IPv6 : son /64) après 5 envois VALIDES en 15 min, pendant 1 h.
 * Appelé après la validation : un client qui corrige des erreurs n'est jamais compté.
 * Si storage/ n'est pas inscriptible, l'envoi passe (fail open) et c'est journalisé.
 * $form : 'pickup' ou 'contact' (compteurs séparés).
 */
function form_rate_guard(string $form): void
{
    $ip = rate_limit_ip();
    $blockKey = "$form-block:$ip";
    $block = rate_peek($blockKey);
    if ($block['count'] > 0) form_rate_reject($form, max(1, $block['retryAfter']));

    $limit = rate_limit("$form:$ip", FORM_MAX_SENDS, FORM_WINDOW_MS);
    if (!$limit['ok']) {
        rate_record($blockKey, FORM_BLOCK_MS);
        security_log('form_blocked', ['outcome' => 'blocked', 'form' => $form, 'minutes' => (int) (FORM_BLOCK_MS / 60000)]);
        form_rate_reject($form, (int) (FORM_BLOCK_MS / 1000));
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
    if ($suspect) security_log('form_honeypot', ['outcome' => 'suspect']);
    return $suspect;
}

/** Préfixe du sujet du courriel quand la demande ressemble à un robot. */
const FORM_SUSPECT_PREFIX = '[À vérifier : possible robot] ';
