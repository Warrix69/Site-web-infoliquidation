<?php
/**
 * Journal de sécurité : une ligne JSON par événement dans storage/logs/security.log.
 *
 * Champs : ts (UTC), event, outcome, ip, ua (tronqué), rid (identifiant de requête),
 * method, path (sans la chaîne de requête, qui peut contenir un code OAuth) + détails.
 * Jamais de mot de passe, jeton, cookie ni donnée personnelle de formulaire :
 * les clés sensibles sont masquées et les retours de ligne supprimés.
 * Rotation simple : au-delà de 5 Mo, le fichier devient security.log.1 (l'ancien .1 est écrasé).
 */

const SECURITY_LOG_MAX_BYTES = 5 * 1024 * 1024;
const SECURITY_LOG_REDACT = '/password|passwd|token|secret|authorization|cookie|api[_-]?key/i';

function security_log_dir(): string
{
    $base = defined('STORAGE_DIR') ? STORAGE_DIR : dirname(__DIR__, 2) . '/storage';
    return $base . '/logs';
}

/** Retire les caractères de contrôle (CR/LF…) et masque les jetons connus dans un texte libre. */
function security_log_scrub(string $s, int $max = 500): string
{
    $s = mb_scrub($s, 'UTF-8');
    $s = preg_replace('/[\x00-\x1F\x7F\x{2028}\x{2029}]+/u', ' ', $s) ?? '';
    $s = preg_replace(
        [
            '/(Bearer\s+)[^\s"\']+/i',
            '/ya29\.[A-Za-z0-9._\-]+/',
            '/1\/\/0[A-Za-z0-9._\-]+/',
            '/v\^1\.1#[^\s"\']+/',
            '/GOCSPX-[A-Za-z0-9_\-]+/',
            '/re_[A-Za-z0-9_]{16,}/',
        ],
        ['$1[masqué]', '[masqué]', '[masqué]', '[masqué]', '[masqué]', '[masqué]'],
        $s
    ) ?? '';
    return mb_substr($s, 0, $max, 'UTF-8');
}

/** Masque récursivement les valeurs dont la clé ressemble à un secret. */
function security_log_redact(array $data, int $depth = 0): array
{
    $out = [];
    foreach ($data as $k => $v) {
        if (is_string($k) && preg_match(SECURITY_LOG_REDACT, $k)) {
            $out[$k] = '[masqué]';
        } elseif (is_array($v)) {
            $out[$k] = $depth < 3 ? security_log_redact($v, $depth + 1) : '[…]';
        } elseif (is_string($v)) {
            $out[$k] = security_log_scrub($v);
        } elseif (is_scalar($v) || $v === null) {
            $out[$k] = $v;
        } else {
            $out[$k] = '[' . gettype($v) . ']';
        }
    }
    return $out;
}

function security_log(string $event, array $details = []): void
{
    $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
    $entry = [
        'ts' => gmdate('Y-m-d\TH:i:s\Z'),
        'event' => security_log_scrub($event, 64),
        'outcome' => isset($details['outcome']) ? security_log_scrub((string) $details['outcome'], 64) : null,
        'ip' => function_exists('client_ip') ? client_ip() : ($_SERVER['REMOTE_ADDR'] ?? 'cli'),
        'ua' => security_log_scrub((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 200),
        'rid' => function_exists('request_id') ? request_id() : null,
        'method' => security_log_scrub((string) ($_SERVER['REQUEST_METHOD'] ?? 'CLI'), 10),
        'path' => security_log_scrub(is_string($path) ? $path : '', 200),
    ];
    unset($details['outcome']);
    if ($details) $entry['details'] = security_log_redact($details);

    $line = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE) . "\n";
    $dir = security_log_dir();
    $file = $dir . '/security.log';
    $ok = false;
    if (is_dir($dir) || @mkdir($dir, 0700, true) || is_dir($dir)) {
        clearstatcache(true, $file);
        if (@filesize($file) > SECURITY_LOG_MAX_BYTES) @rename($file, $file . '.1');
        $ok = @file_put_contents($file, $line, FILE_APPEND | LOCK_EX) !== false;
    }
    // Repli : journal d'erreurs PHP (jamais affiché au visiteur en production)
    if (!$ok) error_log('[security] ' . rtrim($line));
}
