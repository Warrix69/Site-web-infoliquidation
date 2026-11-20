<?php
/**
 * GET /api/google/auth-start — démarre le flow OAuth Google Calendar
 * (port de src/app/api/google/auth-start/route.ts).
 * Redirige (307) vers l'écran de consentement Google, avec un cookie anti-CSRF
 * (state) vérifié par /api/google/callback.
 */

require_once dirname(__DIR__, 2) . '/lib/admin_auth.php';
require_once dirname(__DIR__, 2) . '/lib/google_calendar.php';

if (request_method() !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    exit;
}

admin_require_api();

$clientId = env('GOOGLE_CLIENT_ID');
$clientSecret = env('GOOGLE_CLIENT_SECRET');
if ($clientId === null || $clientSecret === null) {
    json_response(['error' => 'Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET'], 500);
}

$redirectUri = request_origin() . '/api/google/callback';

// Jeton anti-CSRF vérifié par /api/google/callback
$state = bin2hex(random_bytes(24));

$url = GOOGLE_AUTH_URL . '?' . http_build_query([
    'access_type' => 'offline', // obligatoire pour obtenir un refresh_token
    'prompt' => 'consent',      // force Google à redemander le consentement et émettre un nouveau refresh_token
    'scope' => implode(' ', [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
    ]),
    'state' => $state,
    'response_type' => 'code',
    'client_id' => $clientId,
    'redirect_uri' => $redirectUri,
], '', '&', PHP_QUERY_RFC3986);

setcookie(OAUTH_STATE_COOKIE, $state, [
    'expires' => time() + 10 * 60,
    'path' => '/api/google',
    'secure' => admin_is_https(),
    'httponly' => true,
    'samesite' => 'Lax',
]);
redirect($url, 307);
