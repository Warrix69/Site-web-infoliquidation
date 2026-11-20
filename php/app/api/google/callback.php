<?php
/**
 * GET /api/google/callback — callback de l'autorisation Google
 * (port de src/app/api/google/callback/route.ts).
 * Échange le code contre un refresh token et affiche une page HTML avec le
 * token à copier dans php/.env (GOOGLE_REFRESH_TOKEN).
 * Chaque page HTML efface le cookie anti-CSRF.
 */

require_once dirname(__DIR__, 2) . '/lib/admin_auth.php';
require_once dirname(__DIR__, 2) . '/lib/mailer.php';
require_once dirname(__DIR__, 2) . '/lib/google_calendar.php';

if (request_method() !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    exit;
}

admin_require_api();

function google_callback_page(string $body): never
{
    setcookie(OAUTH_STATE_COOKIE, '', ['expires' => time() - 3600, 'path' => '/api/google']);
    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    echo '<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Google OAuth</title>
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
    google_callback_page(
        '<h1 style="color:#dc2626">Erreur d\'autorisation</h1><p>' . escape_html(mb_substr($error, 0, 200, 'UTF-8')) . '</p>
       <p><a href="/api/google/auth-start">Recommencer</a></p>'
    );
}

if ($code === null || $code === '') {
    google_callback_page('<h1>Code manquant</h1><p><a href="/api/google/auth-start">Démarrer l\'autorisation</a></p>');
}

// Anti-CSRF : le state doit correspondre au cookie posé par /api/google/auth-start
$state = $qs('state') ?? '';
$expected = admin_read_cookie(OAUTH_STATE_COOKIE) ?? '';
if ($expected === '' || !admin_safe_equal($state, $expected)) {
    google_callback_page(
        '<h1 style="color:#dc2626">Requête invalide</h1><p>Le paramètre state ne correspond pas. <a href="/api/google/auth-start">Recommencer</a></p>'
    );
}

$clientId = env('GOOGLE_CLIENT_ID');
$clientSecret = env('GOOGLE_CLIENT_SECRET');
if ($clientId === null || $clientSecret === null) {
    google_callback_page('<h1 style="color:#dc2626">Config manquante</h1><p>GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET non définis dans php/.env</p>');
}

$redirectUri = request_origin() . '/api/google/callback';

try {
    $tokens = google_token_request([
        'code' => $code,
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'redirect_uri' => $redirectUri,
        'grant_type' => 'authorization_code',
    ]);
} catch (Throwable $err) {
    google_callback_page(
        '<h1 style="color:#dc2626">Échec de l\'échange du code</h1><p>' . escape_html(mb_scrub($err->getMessage(), 'UTF-8'))
        . '</p><p><a href="/api/google/auth-start">Recommencer</a></p>'
    );
}

$refreshToken = is_string($tokens['refresh_token'] ?? null) ? $tokens['refresh_token'] : '';

if ($refreshToken === '') {
    google_callback_page('
        <h1 style="color:#f59e0b">Pas de refresh token reçu</h1>
        <p>Google ne te donne un refresh token que la 1<sup>re</sup> fois que tu autorises l\'app, OU quand tu passes <code>prompt=consent</code>.</p>
        <p>Va révoquer l\'accès ici : <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a> → cherche <b>InfoLiquidationRecycle Dashboard</b> → <b>Supprimer l\'accès</b></p>
        <p>Puis <a href="/api/google/auth-start">recommence</a>.</p>
      ');
}

google_callback_page('
      <h1 style="color:#16a34a">✅ Refresh token obtenu !</h1>
      <p>Copie cette valeur et colle-la dans <code>php/.env</code> à la place de la valeur actuelle de <code>GOOGLE_REFRESH_TOKEN</code> :</p>
      <pre style="background:#0a0a0a;color:#86efac;padding:16px;border-radius:8px;overflow-x:auto;font-family:monospace;font-size:13px;white-space:pre-wrap;word-break:break-all">GOOGLE_REFRESH_TOKEN=' . escape_html($refreshToken) . '</pre>
      <p>Puis retourne sur <a href="/admin">/admin</a> (aucun redémarrage nécessaire).</p>
    ');
