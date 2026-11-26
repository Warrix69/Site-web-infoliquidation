<?php
/**
 * /api/outreach — courriels de l'onglet Relance (réservé à l'admin connecté).
 * L'envoi passe par app/lib/mail_transport.php (le système de courriel de l'hébergeur) ;
 * l'historique est gardé dans storage/sent_emails.json (0600), partagé par l'équipe.
 *
 * GET  → { emails: [ {id, to, toName, subject, template, templateName, date, status} ] }   (plus récents d'abord)
 * POST { action: "send", to, toName, subject, body, template, templateName } → { ok, email } | 502 { error, email }
 */

require_once dirname(__DIR__) . '/lib/admin_auth.php';
require_once dirname(__DIR__) . '/lib/validation.php';
require_once dirname(__DIR__) . '/lib/rate_limit.php';
require_once dirname(__DIR__) . '/lib/mailer.php';

admin_require_api();

const OUTREACH_KEEP = 2000;                 // envois gardés dans l'historique
const OUTREACH_MAX_PER_HOUR = 100;          // garde-fou contre les envois en masse

function outreach_file(): string
{
    $base = defined('STORAGE_DIR') ? STORAGE_DIR : dirname(__DIR__, 2) . '/storage';
    return $base . '/sent_emails.json';
}

function outreach_read(): array
{
    $file = outreach_file();
    $d = is_file($file) ? json_decode((string) @file_get_contents($file), true) : null;
    return is_array($d['emails'] ?? null) ? $d['emails'] : [];
}

/** Ajoute un envoi en tête de l'historique, sous verrou. */
function outreach_append(array $rec): bool
{
    $file = outreach_file();
    $dir = dirname($file);
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) return false;
    $fh = @fopen($file, 'c+');
    if ($fh === false) return false;
    try {
        flock($fh, LOCK_EX);
        $raw = stream_get_contents($fh);
        $d = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
        $list = is_array($d['emails'] ?? null) ? $d['emails'] : [];
        array_unshift($list, $rec);
        $json = json_encode(['emails' => array_slice($list, 0, OUTREACH_KEEP)], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) return false;
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, $json);
        fflush($fh);
        @chmod($file, 0600);
        return true;
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}

function outreach_clean($v, int $max): string
{
    if (!is_string($v)) return '';
    return mb_substr(trim((string) preg_replace('/[\x00-\x1F\x7F]+/u', ' ', mb_scrub($v, 'UTF-8'))), 0, $max, 'UTF-8');
}

$method = request_method();
if ($method === 'GET') json_response(['emails' => outreach_read()]);
if ($method !== 'POST') {
    header('Allow: GET, POST');
    json_response(['error' => 'Méthode non permise'], 405);
}

$input = read_json_input();
if (!$input['ok']) json_response(['error' => 'Requête invalide'], !empty($input['tooLarge']) ? 413 : 400);
$b = json_decode((string) json_encode($input['value']), true);
if (!is_array($b) || ($b['action'] ?? '') !== 'send') json_response(['error' => 'Action inconnue'], 400);

$to = mail_safe_address(is_string($b['to'] ?? null) ? $b['to'] : null);
if ($to === null) json_response(['error' => 'Adresse courriel invalide.'], 400);
$subject = outreach_clean($b['subject'] ?? '', 200);
$text = is_string($b['body'] ?? null) ? mb_substr(trim(str_replace("\r\n", "\n", mb_scrub($b['body'], 'UTF-8'))), 0, 20000, 'UTF-8') : '';
$text = (string) preg_replace('/[\x00-\x09\x0B-\x1F\x7F]/u', '', $text);
if ($subject === '' || $text === '') json_response(['error' => 'Remplis l\'objet et le message.'], 400);

$limit = rate_limit('outreach:' . session_id_hint(), OUTREACH_MAX_PER_HOUR, 60 * 60 * 1000);
if (!$limit['ok']) json_response(['error' => 'Trop d\'envois en une heure. Réessaie plus tard.'], 429, ['Retry-After' => (string) $limit['retryAfter']]);

$ok = send_client_message($to, $subject, $text);
$rec = [
    'id' => 'em-' . bin2hex(random_bytes(6)),
    'to' => $to,
    'toName' => outreach_clean($b['toName'] ?? '', 120),
    'subject' => $subject,
    'template' => outreach_clean($b['template'] ?? 'custom', 60) ?: 'custom',
    'templateName' => outreach_clean($b['templateName'] ?? 'Personnalisé', 60) ?: 'Personnalisé',
    'date' => date('c'), // heure locale (America/Toronto) : les compteurs « aujourd'hui » de l'admin comparent la date locale
    'status' => $ok ? 'sent' : 'failed',
];
outreach_append($rec);
security_log('outreach_email', ['outcome' => $ok ? 'success' : 'error']);
if (!$ok) {
    json_response(['error' => 'Envoi impossible pour le moment : le courriel du site n\'est pas encore branché (voir app/lib/mail_transport.php) ou a été refusé.', 'email' => $rec], 502);
}
json_response(['ok' => true, 'email' => $rec]);

/** Compteur d'envois par adresse IP de l'employé (pas de données personnelles). */
function session_id_hint(): string
{
    return function_exists('rate_limit_ip') ? rate_limit_ip() : client_ip();
}
