<?php
/**
 * POST /api/admin/login (formulaire de /admin/login), port de src/app/api/admin/login/route.ts.
 * Vérifie ADMIN_USERNAME / ADMIN_PASSWORD_HASH (ou ADMIN_PASSWORD) et pose un cookie de session signé.
 * Réponses : redirections 303 relatives /admin (succès), /admin/login?e=1 (identifiants), ?e=config ;
 * trop d'essais → 429 + Retry-After (la page renvoie aussitôt vers /admin/login?e=rate&m=N) ;
 * Origin étrangère → 403 ; storage/ non inscriptible → 503 (fail closed).
 *
 * Limites (seuls les ÉCHECS comptent ; une connexion réussie remet le compteur de l'IP à zéro) :
 *   par IP (IPv6 : par /64) : requêtes 30 / 15 min, échecs 5 / 15 min, échecs 20 / 24 h ;
 *   toutes IP confondues : 50 échecs / 1 h → connexion fermée 15 min pour tout le monde.
 *   Compromis voulu : une attaque distribuée peut bloquer l'admin 15 min, mais ne peut plus
 *   essayer plus de ~200 mots de passe par heure.
 */

require_once dirname(__DIR__, 2) . '/lib/admin_auth.php';
require_once dirname(__DIR__, 2) . '/lib/rate_limit.php';

if (request_method() !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit;
}

// Anti-CSRF : formulaire envoyé depuis le site seulement (le corps reste en form-urlencoded)
require_same_origin();

const LOGIN_MIN_MS = 60 * 1000;
// 5 mauvais mots de passe en 15 min → bloqué 15 min ; 20 en 24 h → bloqué jusqu'à 24 h
const LOGIN_LIMITS = [
    'requests' => ['max' => 30, 'windowMs' => 15 * LOGIN_MIN_MS],
    'burst' => ['max' => 5, 'windowMs' => 15 * LOGIN_MIN_MS],
    'daily' => ['max' => 20, 'windowMs' => 24 * 60 * LOGIN_MIN_MS],
    'global' => ['max' => 50, 'windowMs' => 60 * LOGIN_MIN_MS],
    'globalLock' => ['windowMs' => 15 * LOGIN_MIN_MS],
];
const LOGIN_GLOBAL_FAIL_KEY = 'global:login-fail-1h';
const LOGIN_GLOBAL_LOCK_KEY = 'global:login-lock';

/** Trop d'essais : 429 + Retry-After ; la page redirige aussitôt vers le message de la page de connexion. */
function login_reject_rate(int $seconds, string $scope): never
{
    $seconds = max(1, $seconds);
    $minutes = max(1, (int) ceil($seconds / 60));
    security_log('admin_login_lockout', ['outcome' => 'rate_limited', 'scope' => $scope, 'retryAfter' => $seconds]);
    $to = '/admin/login?e=rate&m=' . $minutes;
    http_response_code(429);
    header('Retry-After: ' . $seconds);
    header('Cache-Control: no-store');
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=' . e($to) . '">'
        . '<title>Trop de tentatives</title></head><body><p>Trop de tentatives. Réessaie dans ' . $minutes
        . ' min. <a href="' . e($to) . '">Retour</a></p></body></html>';
    exit;
}

function login_storage_unavailable(): never
{
    security_log('admin_login', ['outcome' => 'storage_unwritable', 'status' => 503]);
    http_response_code(503);
    header('Retry-After: 300');
    header('Cache-Control: no-store');
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Connexion temporairement indisponible.';
    exit;
}

if (!admin_is_configured()) {
    security_log('admin_login', ['outcome' => 'not_configured']);
    redirect('/admin/login?e=config', 303);
}

// Sans compteurs fiables, pas de connexion (fail closed)
if (!rl_storage_ok()) login_storage_unavailable();

$ip = rate_limit_ip();
$burstKey = "login-fail-15m:$ip";
$dailyKey = "login-fail-24h:$ip";

$lock = rate_peek(LOGIN_GLOBAL_LOCK_KEY);
if ($lock['count'] > 0) login_reject_rate($lock['retryAfter'], 'global');

$requests = rate_limit("login-req:$ip", LOGIN_LIMITS['requests']['max'], LOGIN_LIMITS['requests']['windowMs']);
$burst = rate_peek($burstKey);
$daily = rate_peek($dailyKey);
if (rl_failed()) login_storage_unavailable();
if (!$requests['ok']) login_reject_rate($requests['retryAfter'], 'ip-requests');
if ($daily['count'] >= LOGIN_LIMITS['daily']['max']) login_reject_rate($daily['retryAfter'], 'ip-daily');
if ($burst['count'] >= LOGIN_LIMITS['burst']['max']) login_reject_rate($burst['retryAfter'], 'ip-burst');

// Équivalent de request.formData() : seuls les corps de formulaire sont acceptés
$contentType = request_content_type();
if ($contentType !== 'application/x-www-form-urlencoded' && $contentType !== 'multipart/form-data') {
    security_log('admin_login', ['outcome' => 'failure', 'reason' => 'content_type']);
    redirect('/admin/login?e=1', 303);
}
$username = is_string($_POST['username'] ?? null) ? mb_substr($_POST['username'], 0, 200, 'UTF-8') : '';
// Mot de passe : refusé (pas tronqué) au-delà de 1024 octets
$password = is_string($_POST['password'] ?? null) ? $_POST['password'] : '';

if (!admin_verify_credentials($username, $password)) {
    rate_record($burstKey, LOGIN_LIMITS['burst']['windowMs']);
    rate_record($dailyKey, LOGIN_LIMITS['daily']['windowMs']);
    rate_record(LOGIN_GLOBAL_FAIL_KEY, LOGIN_LIMITS['global']['windowMs']);
    if (rl_failed()) login_storage_unavailable();
    security_log('admin_login', ['outcome' => 'failure']);

    $global = rate_peek(LOGIN_GLOBAL_FAIL_KEY);
    if ($global['count'] >= LOGIN_LIMITS['global']['max']) {
        rate_record(LOGIN_GLOBAL_LOCK_KEY, LOGIN_LIMITS['globalLock']['windowMs']);
        rate_clear(LOGIN_GLOBAL_FAIL_KEY);
        login_reject_rate((int) (LOGIN_LIMITS['globalLock']['windowMs'] / 1000), 'global');
    }
    $after = rate_peek($burstKey);
    if ($after['count'] >= LOGIN_LIMITS['burst']['max']) login_reject_rate($after['retryAfter'], 'ip-burst');
    redirect('/admin/login?e=1', 303);
}

rate_clear($burstKey);
rate_clear($dailyKey);

if (!admin_set_session_cookie()) redirect('/admin/login?e=config', 303);
security_log('admin_login', ['outcome' => 'success']);
redirect('/admin', 303);
