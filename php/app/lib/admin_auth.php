<?php
/**
 * Session admin, port de src/lib/admin-auth.ts + logique de src/middleware.ts.
 *
 * Cookie signé HMAC-SHA256 : `<expiration>.<signature hex>` (format identique à
 * la version Next.js, un cookie émis par l'un est valide pour l'autre).
 * La clé est dérivée de ADMIN_SESSION_SECRET (ou, à défaut, de ADMIN_PASSWORD) :
 * changer le mot de passe déconnecte toutes les sessions.
 */

const ADMIN_COOKIE = 'ilr_admin';
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 h
/** Cookie anti-CSRF du flow OAuth Google (auth-start → callback). */
const OAUTH_STATE_COOKIE = 'ilr_google_oauth_state';

function admin_signing_secret(): ?string
{
    $secret = env('ADMIN_SESSION_SECRET') ?? env('ADMIN_PASSWORD');
    return $secret !== null ? "ilr-admin-session|$secret" : null;
}

function admin_is_configured(): bool
{
    return env('ADMIN_USERNAME') !== null && env('ADMIN_PASSWORD') !== null;
}

function admin_hmac(string $secret, string $message): string
{
    return hash_hmac('sha256', $message, $secret);
}

/** Comparaison à temps constant de deux chaînes (HMAC à clé aléatoire pour égaliser les longueurs). */
function admin_safe_equal(string $a, string $b): bool
{
    $k = random_bytes(32);
    return hash_equals(hash_hmac('sha256', $a, $k), hash_hmac('sha256', $b, $k));
}

function admin_verify_credentials(string $username, string $password): bool
{
    $user = env('ADMIN_USERNAME');
    $pass = env('ADMIN_PASSWORD');
    if ($user === null || $pass === null) return false;
    // Les deux comparaisons sont toujours faites (pas de court-circuit)
    $okUser = admin_safe_equal($username, $user);
    $okPass = admin_safe_equal($password, $pass);
    return $okUser && $okPass;
}

function admin_create_session_token(): ?string
{
    $secret = admin_signing_secret();
    if ($secret === null) return null;
    $exp = (string) (time() + ADMIN_SESSION_TTL_SECONDS);
    return $exp . '.' . admin_hmac($secret, $exp);
}

function admin_verify_session_token($token): bool
{
    $secret = admin_signing_secret();
    if ($secret === null || !is_string($token) || $token === '') return false;
    $parts = explode('.', $token);
    $expStr = $parts[0];
    $sig = $parts[1] ?? '';
    if ($expStr === '' || $sig === '' || !preg_match('/^\d+$/D', $expStr)) return false;
    if ((float) $expStr < time()) return false;
    return admin_safe_equal($sig, admin_hmac($secret, $expStr));
}

/** Valeur brute d'un cookie de la requête (null si absent ou invalide). */
function admin_read_cookie(string $name): ?string
{
    $v = $_COOKIE[$name] ?? null;
    return is_string($v) ? $v : null;
}

/** Admin configuré ET cookie de session valide (équivalent de `authed` dans middleware.ts). */
function admin_is_authed(): bool
{
    return admin_is_configured() && admin_verify_session_token(admin_read_cookie(ADMIN_COOKIE));
}

/**
 * Garde des routes API admin : 503 si non configuré, 401 si non connecté
 * (mêmes corps JSON que middleware.ts / requireAdmin). Ne retourne que si l'accès est autorisé.
 */
function admin_require_api(): void
{
    if (!admin_is_configured()) {
        json_response(['error' => 'Admin non configuré'], 503);
    }
    if (!admin_verify_session_token(admin_read_cookie(ADMIN_COOKIE))) {
        json_response(['error' => 'Authentification requise'], 401);
    }
}

/** Requête reçue en HTTPS (directement ou derrière un proxy) : drapeau Secure des cookies. */
function admin_is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off') return true;
    if ((string) ($_SERVER['SERVER_PORT'] ?? '') === '443') return true;
    $proto = strtolower(trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));
    return $proto === 'https';
}

/**
 * Pose le cookie de session (httpOnly, SameSite=Lax, path /, 8 h).
 * Crée le jeton si aucun n'est fourni ; retourne false si aucune clé de signature n'est configurée.
 */
function admin_set_session_cookie(?string $token = null): bool
{
    $token = $token ?? admin_create_session_token();
    if ($token === null) return false;
    setcookie(ADMIN_COOKIE, $token, [
        'expires' => time() + ADMIN_SESSION_TTL_SECONDS,
        'path' => '/',
        'secure' => admin_is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    return true;
}

function admin_clear_session_cookie(): void
{
    setcookie(ADMIN_COOKIE, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

/** Origine de la requête (schéma + hôte), équivalent de new URL(request.url).origin. */
function request_origin(): string
{
    $scheme = admin_is_https() ? 'https' : 'http';
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    if ($host === '' || !preg_match('/^[A-Za-z0-9.\-]+(:\d+)?$|^\[[0-9A-Fa-f:.]+\](:\d+)?$/D', $host)) {
        return defined('SITE_URL') ? SITE_URL : 'https://infoliquidationrecycle.com';
    }
    return "$scheme://$host";
}
