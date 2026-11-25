<?php
/**
 * POST /api/contact — formulaire de contact (port de src/app/api/contact/route.ts).
 * Réponses : 200 {ok:true} | 400 {ok:false[, issues]} | 403 (Origin) | 413 | 429 (Retry-After) | 502 (envoi échoué).
 */

require_once dirname(__DIR__) . '/lib/rate_limit.php';
require_once dirname(__DIR__) . '/lib/validation.php';
require_once dirname(__DIR__) . '/lib/mailer.php';

if (request_method() !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit;
}

// Anti-CSRF : envoi depuis le site seulement (403 si l'Origin est étrangère)
if (!request_origin_allowed()) security_log('form_submission', ['outcome' => 'rejected_origin', 'form' => 'contact']);
require_same_origin();

// Refuse les corps démesurés : Content-Length annoncé, puis lecture plafonnée (corps « chunked »)
$input = request_content_length() > JSON_BODY_MAX_BYTES ? ['ok' => false, 'tooLarge' => true] : read_json_input();
if (!empty($input['tooLarge'])) {
    security_log('form_submission', ['outcome' => 'too_large', 'form' => 'contact', 'status' => 413]);
    json_response(['ok' => false], 413);
}
if (!$input['ok']) {
    security_log('form_submission', ['outcome' => 'invalid_json', 'form' => 'contact']);
    json_response(['ok' => false], 400);
}
$suspect = form_honeypot($input['value']);

$parsed = validate_contact($input['value']);
if (!$parsed['ok']) {
    security_log('form_submission', ['outcome' => 'rejected_validation', 'form' => 'contact']);
    json_response(['ok' => false, 'issues' => $parsed['issues']], 400);
}

// Anti-spam : 5 envois valides / 15 min par IP, puis bloqué 1 h (les erreurs de saisie ne comptent pas)
form_rate_guard('contact');

$data = $parsed['data'];
$html = "\n    <h2>Nouveau message du formulaire de contact</h2>"
    . "\n    <p>"
    . "\n      <strong>" . escape_html($data['name']) . '</strong><br/>'
    . "\n      Courriel : " . escape_html($data['email']) . '<br/>'
    . "\n      " . (($data['phone'] ?? '') !== '' ? 'Téléphone : ' . escape_html($data['phone']) . '<br/>' : '')
    . "\n    </p>"
    . "\n    <p>" . str_replace("\n", '<br/>', escape_html($data['message'])) . '</p>'
    . "\n  ";

$sent = send_business_email(
    ($suspect ? FORM_SUSPECT_PREFIX : '') . "Message de contact — {$data['name']}",
    $html,
    $data['email']
);

if (!$sent) {
    security_log('form_submission', ['outcome' => 'mail_failed', 'form' => 'contact', 'status' => 502]);
    json_response(['ok' => false], 502);
}
security_log('form_submission', ['outcome' => 'accepted', 'form' => 'contact', 'suspect' => $suspect]);
json_response(['ok' => true]);
