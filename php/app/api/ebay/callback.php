<?php
/**
 * GET /api/ebay/callback — retour de l'autorisation eBay.
 * Échange le code contre un jeton longue durée (18 mois) et l'enregistre dans
 * storage/ebay_refresh_token.json (0600, prioritaire sur EBAY_REFRESH_TOKEN du .env),
 * avec sa date d'expiration pour le rappel de l'admin. Le jeton n'est jamais affiché.
 */

// L'URL contient le code d'autorisation : ne jamais l'envoyer en Referer
header('Referrer-Policy: no-referrer');

require_once dirname(__DIR__, 2) . '/lib/admin_auth.php';
require_once dirname(__DIR__, 2) . '/lib/mailer.php';
require_once dirname(__DIR__, 2) . '/lib/ebay.php';

if (request_method() !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    exit;
}

admin_require_api();

function ebay_callback_page(string $body): never
{
    setcookie(EBAY_OAUTH_STATE_COOKIE, '', ['expires' => time() - 3600, 'path' => '/api/ebay']);
    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    echo '<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Connexion eBay</title>
<style>
  body { font: 15px -apple-system, system-ui, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 20px; color: #0a0a0a; line-height: 1.5; }
  code { background: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 13px; }
  a { color: #16a34a; }
  h1 { font-size: 24px; margin-bottom: 12px; }
</style></head><body>' . $body . '</body></html>';
    exit;
}

$qs = fn (string $k): ?string => isset($_GET[$k]) && is_string($_GET[$k]) ? $_GET[$k] : null;
$code = $qs('code');
$error = $qs('error');

if ($error !== null && $error !== '') {
    security_log('ebay_oauth_connect', ['outcome' => 'denied', 'message' => mb_substr($error, 0, 100, 'UTF-8')]);
    ebay_callback_page('<h1 style="color:#dc2626">Autorisation eBay refusée</h1><p>'
        . escape_html(mb_substr($error, 0, 200, 'UTF-8')) . '</p><p><a href="/api/ebay/auth-start">Recommencer</a></p>');
}
if ($code === null || $code === '') {
    ebay_callback_page('<h1>Code manquant</h1><p><a href="/api/ebay/auth-start">Démarrer la connexion eBay</a></p>');
}

// Anti-CSRF : le state doit correspondre au cookie posé par /api/ebay/auth-start
$state = $qs('state') ?? '';
$expected = admin_read_cookie(EBAY_OAUTH_STATE_COOKIE) ?? '';
if ($expected === '' || !admin_safe_equal($state, $expected)) {
    ebay_callback_page('<h1 style="color:#dc2626">Requête invalide</h1><p>Le paramètre state ne correspond pas. <a href="/api/ebay/auth-start">Recommencer</a></p>');
}

$appId = env('EBAY_APP_ID');
$certId = env('EBAY_CERT_ID');
$ruName = env('EBAY_RUNAME');
if ($appId === null || $certId === null || $ruName === null) {
    ebay_callback_page('<h1 style="color:#dc2626">Config manquante</h1><p>EBAY_APP_ID / EBAY_CERT_ID / EBAY_RUNAME non définis dans le .env.</p>');
}

$res = ebay_http('POST', 'https://api.ebay.com/identity/v1/oauth2/token', [
    'Authorization: Basic ' . base64_encode("$appId:$certId"),
    'Content-Type: application/x-www-form-urlencoded',
], http_build_query([
    'grant_type' => 'authorization_code',
    'code' => $code,
    'redirect_uri' => $ruName,
]));
$data = json_decode($res['body'], true);
$refreshToken = is_array($data) && is_string($data['refresh_token'] ?? null) ? $data['refresh_token'] : '';

if ($res['error'] !== null || $res['status'] < 200 || $res['status'] >= 300 || $refreshToken === '') {
    security_log('ebay_oauth_connect', ['outcome' => 'failure', 'message' => $res['error'] ?? ebay_stringify($res['body'])]);
    ebay_callback_page('<h1 style="color:#dc2626">Échec de la connexion eBay</h1><p>eBay a refusé l\'échange (réf. '
        . escape_html(request_id()) . ', détail dans storage/logs/security.log).</p><p><a href="/api/ebay/auth-start">Recommencer</a></p>');
}

// eBay : 47 304 000 s (18 mois) par défaut
$expiresIn = (int) ($data['refresh_token_expires_in'] ?? 47304000);
if (!ebay_store_refresh_token($refreshToken, $expiresIn)) {
    security_log('ebay_oauth_connect', ['outcome' => 'storage_error']);
    ebay_callback_page('<h1 style="color:#dc2626">Jeton non enregistré</h1><p>Le dossier <code>storage/</code> n\'est pas inscriptible par PHP (réf. '
        . escape_html(request_id()) . '). Corrige les permissions puis <a href="/api/ebay/auth-start">recommence</a>.</p>');
}

security_log('ebay_oauth_connect', ['outcome' => 'success']);
$until = date('j/m/Y', time() + $expiresIn);
ebay_callback_page('
      <h1 style="color:#16a34a">✅ eBay connecté</h1>
      <p>La connexion eBay est enregistrée sur le serveur et reste valide jusqu\'au <b>' . escape_html($until) . '</b>. L\'admin affichera un rappel 30 jours avant ; il suffira de recliquer sur « Renouveler eBay ».</p>
      <p>Retourne sur <a href="/admin">/admin</a>.</p>
    ');
