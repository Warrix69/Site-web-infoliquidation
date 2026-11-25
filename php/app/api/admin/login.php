<?php
/**
 * POST /api/admin/login (formulaire de /admin/login), port de src/app/api/admin/login/route.ts.
 * Vérifie ADMIN_USERNAME / ADMIN_PASSWORD et pose un cookie de session signé.
 * Toutes les réponses sont des redirections 303 relatives :
 *   /admin (succès), /admin/login?e=1 (identifiants), ?e=rate (trop d'essais), ?e=config.
 *
 * Limites par IP (seuls les ÉCHECS comptent ; une connexion réussie remet le compteur à zéro) :
 *   requêtes totales 30 / 15 min, échecs 10 / 15 min, échecs 30 / 24 h.
 */

require_once dirname(__DIR__, 2) . '/lib/admin_auth.php';
require_once dirname(__DIR__, 2) . '/lib/rate_limit.php';

if (request_method() !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit;
}

const LOGIN_MIN_MS = 60 * 1000;
// 5 mauvais mots de passe en 15 min → bloqué 15 min ; 20 en 24 h → bloqué jusqu'à 24 h
const LOGIN_LIMITS = [
    'requests' => ['max' => 30, 'windowMs' => 15 * LOGIN_MIN_MS],
    'burst' => ['max' => 5, 'windowMs' => 15 * LOGIN_MIN_MS],
    'daily' => ['max' => 20, 'windowMs' => 24 * 60 * LOGIN_MIN_MS],
];

if (!admin_is_configured()) redirect('/admin/login?e=config', 303);

$ip = client_ip();
$burstKey = "login-fail-15m:$ip";
$dailyKey = "login-fail-24h:$ip";

$requests = rate_limit("login-req:$ip", LOGIN_LIMITS['requests']['max'], LOGIN_LIMITS['requests']['windowMs']);
$burst = rate_peek($burstKey);
$daily = rate_peek($dailyKey);
if (!$requests['ok']) {
    $blocked = $requests['retryAfter'];
} elseif ($daily['count'] >= LOGIN_LIMITS['daily']['max']) {
    $blocked = $daily['retryAfter'];
} elseif ($burst['count'] >= LOGIN_LIMITS['burst']['max']) {
    $blocked = $burst['retryAfter'];
} else {
    $blocked = 0;
}
if ($blocked) {
    header('Retry-After: ' . $blocked);
    redirect('/admin/login?e=rate&m=' . max(1, (int) ceil($blocked / 60)), 303);
}

// Équivalent de request.formData() : seuls les corps de formulaire sont acceptés
$contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? ''));
if (!str_contains($contentType, 'application/x-www-form-urlencoded') && !str_contains($contentType, 'multipart/form-data')) {
    redirect('/admin/login?e=1', 303);
}
$username = is_string($_POST['username'] ?? null) ? mb_substr($_POST['username'], 0, 200, 'UTF-8') : '';
$password = is_string($_POST['password'] ?? null) ? mb_substr($_POST['password'], 0, 200, 'UTF-8') : '';

if (!admin_verify_credentials($username, $password)) {
    rate_record($burstKey, LOGIN_LIMITS['burst']['windowMs']);
    rate_record($dailyKey, LOGIN_LIMITS['daily']['windowMs']);
    $after = rate_peek($burstKey);
    if ($after['count'] >= LOGIN_LIMITS['burst']['max']) {
        redirect('/admin/login?e=rate&m=' . max(1, (int) ceil($after['retryAfter'] / 60)), 303);
    }
    redirect('/admin/login?e=1', 303);
}

rate_clear($burstKey);
rate_clear($dailyKey);

if (!admin_set_session_cookie()) redirect('/admin/login?e=config', 303);
redirect('/admin', 303);
