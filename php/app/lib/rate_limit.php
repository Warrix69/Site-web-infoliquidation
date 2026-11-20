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
