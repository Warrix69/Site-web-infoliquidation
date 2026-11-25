<?php
/**
 * GET /api/ebay/auth-start — renouvelle la connexion eBay en un clic.
 * Redirige vers l'écran de consentement eBay (compte vendeur), avec un cookie
 * anti-CSRF (state) vérifié par /api/ebay/callback.
 *
 * Prérequis (une seule fois, portail développeur eBay > User Tokens > RuName) :
 * « Your auth accepted URL » = <SITE_URL>/api/ebay/callback. EBAY_RUNAME = ce RuName.
 */

require_once dirname(__DIR__, 2) . '/lib/admin_auth.php';
require_once dirname(__DIR__, 2) . '/lib/ebay.php';

if (request_method() !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    exit;
}

admin_require_api();

$appId = env('EBAY_APP_ID');
$ruName = env('EBAY_RUNAME');
if ($appId === null || $ruName === null || env('EBAY_CERT_ID') === null) {
    json_response(['error' => 'eBay non configuré (EBAY_APP_ID / EBAY_CERT_ID / EBAY_RUNAME manquants).'], 500);
}

$state = bin2hex(random_bytes(24));

$url = 'https://auth.ebay.com/oauth2/authorize?' . http_build_query([
    'client_id' => $appId,
    'redirect_uri' => $ruName, // eBay attend le RuName, pas une URL
    'response_type' => 'code',
    'scope' => implode(' ', EBAY_SCOPES),
    'state' => $state,
    'prompt' => 'login',
], '', '&', PHP_QUERY_RFC3986);

setcookie(EBAY_OAUTH_STATE_COOKIE, $state, [
    'expires' => time() + 10 * 60,
    'path' => '/api/ebay',
    'secure' => request_is_https(),
    'httponly' => true,
    'samesite' => 'Lax',
]);
security_log('ebay_oauth_start', ['outcome' => 'redirect']);
redirect($url, 307);
