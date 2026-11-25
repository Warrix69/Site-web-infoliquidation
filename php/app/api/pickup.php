<?php
/**
 * POST /api/pickup — demande de ramassage (port de src/app/api/pickup/route.ts).
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

const PICKUP_LABELS = [
    'towers' => "Tours d'ordinateur",
    'servers' => 'Serveurs',
    'laptops' => 'Ordinateurs portables',
    'tablets' => 'Tablettes',
    'switches' => 'Switch',
    'lcd' => 'Écrans LCD',
    'deskPhones' => 'Téléphones de bureau',
    'cellphones' => 'Cellulaires',
    'printers' => 'Imprimantes',
    'photocopiers' => 'Photocopieurs',
    'audioVideo' => 'Systèmes Audio/Vidéo',
    'ups' => 'UPS',
];

// Anti-CSRF : envoi depuis le site seulement (403 si l'Origin est étrangère)
if (!request_origin_allowed()) security_log('form_submission', ['outcome' => 'rejected_origin', 'form' => 'pickup']);
require_same_origin();

// Refuse les corps démesurés : Content-Length annoncé, puis lecture plafonnée (corps « chunked »)
$input = request_content_length() > JSON_BODY_MAX_BYTES ? ['ok' => false, 'tooLarge' => true] : read_json_input();
if (!empty($input['tooLarge'])) {
    security_log('form_submission', ['outcome' => 'too_large', 'form' => 'pickup', 'status' => 413]);
    json_response(['ok' => false], 413);
}
if (!$input['ok']) {
    security_log('form_submission', ['outcome' => 'invalid_json', 'form' => 'pickup']);
    json_response(['ok' => false], 400);
}
$suspect = form_honeypot($input['value']);

$parsed = validate_pickup($input['value']);
if (!$parsed['ok']) {
    security_log('form_submission', ['outcome' => 'rejected_validation', 'form' => 'pickup']);
    json_response(['ok' => false, 'issues' => $parsed['issues']], 400);
}

// Anti-spam : 5 envois valides / 15 min par IP, puis bloqué 1 h (les erreurs de saisie ne comptent pas)
form_rate_guard('pickup');

$data = $parsed['data'];
$total = total_items($data['quantities'], $data['extras']);

$rows = '';
foreach (QUANTITY_KEYS as $key) {
    if ($data['quantities'][$key] > 0) {
        $rows .= '<tr><td>' . PICKUP_LABELS[$key] . '</td><td align="right">' . $data['quantities'][$key] . '</td></tr>';
    }
}

$extraRows = '';
foreach ($data['extras'] as $extra) {
    if (js_trim($extra['name']) !== '' && $extra['quantity'] > 0) {
        $extraRows .= '<tr><td>' . escape_html($extra['name']) . '</td><td align="right">' . $extra['quantity'] . '</td></tr>';
    }
}

$html = "\n    <h2>Nouvelle demande de ramassage</h2>"
    . "\n    <p>"
    . "\n      <strong>" . ($data['title'] === 'mr' ? 'M.' : 'Mme') . ' ' . escape_html($data['firstName']) . ' ' . escape_html($data['lastName']) . '</strong><br/>'
    . "\n      " . (($data['company'] ?? '') !== '' ? 'Compagnie : ' . escape_html($data['company']) . '<br/>' : '')
    . "\n      Courriel : " . escape_html($data['email']) . '<br/>'
    . "\n      Téléphone : " . escape_html($data['phone']) . '<br/>'
    . "\n      Adresse : " . escape_html($data['address']) . ', ' . escape_html($data['city']) . ', ' . escape_html($data['postalCode'])
    . "\n    </p>"
    . "\n    <h3>Quantités approximatives (total : $total)</h3>"
    . "\n    " . '<table border="1" cellpadding="6" cellspacing="0">' . ($rows !== '' ? $rows : '<tr><td>Aucune quantité indiquée</td></tr>') . '</table>'
    . "\n    " . ($extraRows !== '' ? '<h3>Autres équipements</h3><table border="1" cellpadding="6" cellspacing="0">' . $extraRows . '</table>' : '')
    . "\n    <p><strong>Certificat de destruction demandé :</strong> " . ($data['certificate'] === 'yes' ? 'Oui' : 'Non') . '</p>'
    . "\n  ";

$sent = send_business_email(
    ($suspect ? FORM_SUSPECT_PREFIX : '') . "Demande de ramassage — {$data['firstName']} {$data['lastName']} ($total items)",
    $html,
    $data['email']
);

if (!$sent) {
    security_log('form_submission', ['outcome' => 'mail_failed', 'form' => 'pickup', 'status' => 502]);
    json_response(['ok' => false], 502);
}
security_log('form_submission', ['outcome' => 'accepted', 'form' => 'pickup', 'suspect' => $suspect]);
json_response(['ok' => true]);
