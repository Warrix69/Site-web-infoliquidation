<?php
/**
 * Session admin, port de src/lib/admin-auth.ts + logique de src/middleware.ts.
 *
 * Cookie signé HMAC-SHA256 : `v2.<émis le>.<expiration>.<signature hex>`.
 * - Clé : ADMIN_SESSION_SECRET (32+ caractères, obligatoire ; plus de repli sur le mot de passe).
 * - Révocation côté serveur : la déconnexion écrit dans storage/admin_sessions_valid_after
 *   l'heure à partir de laquelle les sessions sont valides ; tout jeton émis avant est refusé.
 * - Changer ADMIN_SESSION_SECRET déconnecte aussi toutes les sessions.
 * - Mot de passe : ADMIN_PASSWORD_HASH (recommandé, voir tools/hash-password.php) ou, à défaut,
 *   ADMIN_PASSWORD en clair (gardé pour ne bloquer personne).
 */

const ADMIN_COOKIE = 'ilr_admin';
/** En HTTPS : préfixe __Host- (Secure, Path=/, sans Domain : impossible à poser depuis un sous-domaine). */
const ADMIN_COOKIE_HTTPS = '__Host-ilr_admin';
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 h, durée absolue
const ADMIN_SECRET_MIN_LENGTH = 32;
/** Longueur maximale d'un mot de passe accepté (évite un hachage démesuré). */
const ADMIN_PASSWORD_MAX_BYTES = 1024;
/** Cookie anti-CSRF du flow OAuth Google (auth-start → callback). */
const OAUTH_STATE_COOKIE = 'ilr_google_oauth_state';

function admin_signing_secret(): ?string
{
    $secret = env('ADMIN_SESSION_SECRET');
    if ($secret === null || strlen($secret) < ADMIN_SECRET_MIN_LENGTH) return null;
    return "ilr-admin-session|$secret";
}

/**
 * Admin utilisable : identifiant + mot de passe (haché ou en clair) + clé de session solide,
 * et, en production, SITE_URL défini (anti-CSRF et OAuth en dépendent).
 */
function admin_is_configured(): bool
{
    return env('ADMIN_USERNAME') !== null
        && (env('ADMIN_PASSWORD_HASH') !== null || env('ADMIN_PASSWORD') !== null)
        && admin_signing_secret() !== null
        && (app_is_dev() || env('SITE_URL') !== null || env('NEXT_PUBLIC_SITE_URL') !== null);
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
    $hash = env('ADMIN_PASSWORD_HASH');
    $plain = env('ADMIN_PASSWORD');
    if ($user === null || ($hash === null && $plain === null)) return false;
    if (strlen($password) > ADMIN_PASSWORD_MAX_BYTES) return false;

    // Un haché d'un algorithme absent de ce serveur (ex. Argon2id généré ailleurs) : repli sur le clair
    if ($hash !== null && password_get_info($hash)['algoName'] === 'unknown') {
        security_log('admin_password_hash_unusable', ['outcome' => 'error']);
        $hash = null;
        if ($plain === null) return false;
    }

    // Les deux comparaisons sont toujours faites (pas de court-circuit)
    $okUser = admin_safe_equal($username, $user);
    $okPass = $hash !== null ? password_verify($password, $hash) : admin_safe_equal($password, (string) $plain);
    return $okUser && $okPass;
}

/* ---------- Révocation côté serveur ---------- */

function admin_revocation_file(): string
{
    return STORAGE_DIR . '/admin_sessions_valid_after';
}

/** Horodatage (s) avant lequel tout jeton est refusé ; PHP_INT_MAX si le fichier existe mais est illisible. */
function admin_sessions_valid_after(): int
{
    $file = admin_revocation_file();
    if (!is_file($file)) return 0;
    $raw = @file_get_contents($file);
    if ($raw === false || !preg_match('/^\d+$/D', trim($raw))) return PHP_INT_MAX; // fail closed
    return (int) trim($raw);
}

/** Invalide toutes les sessions émises jusqu'à maintenant. */
function admin_revoke_sessions(): bool
{
    $file = admin_revocation_file();
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (@file_put_contents($tmp, (string) time(), LOCK_EX) === false) return false;
    @chmod($tmp, 0600);
    if (!@rename($tmp, $file)) {
        @unlink($tmp);
        return false;
    }
    return true;
}

/* ---------- Jeton de session ---------- */

function admin_create_session_token(): ?string
{
    $secret = admin_signing_secret();
    if ($secret === null) return null;
    $iat = time();
    // Jeton émis dans la seconde d'une déconnexion : daté juste après, pour rester valide
    // (la vérification exige iat > valid_after).
    $validAfter = admin_sessions_valid_after();
    if ($validAfter !== PHP_INT_MAX && $iat <= $validAfter) $iat = $validAfter + 1;
    $payload = 'v2.' . $iat . '.' . ($iat + ADMIN_SESSION_TTL_SECONDS);
    return $payload . '.' . admin_hmac($secret, $payload);
}

function admin_verify_session_token($token): bool
{
    $secret = admin_signing_secret();
    if ($secret === null || !is_string($token) || strlen($token) > 200) return false;
    if (!preg_match('/^v2\.(\d{1,12})\.(\d{1,12})\.([0-9a-f]{64})$/D', $token, $m)) return false;
    [, $iat, $exp, $sig] = $m;
    if (!admin_safe_equal($sig, admin_hmac($secret, "v2.$iat.$exp"))) return false;
    $now = time();
    if ((int) $exp < $now || (int) $iat > $now + 60) return false;
    if ((int) $exp - (int) $iat > ADMIN_SESSION_TTL_SECONDS) return false;
    // Strictement après la déconnexion : un jeton émis dans la même seconde que celle-ci est refusé
    return (int) $iat > admin_sessions_valid_after();
}

/** Valeur brute d'un cookie de la requête (null si absent ou invalide). */
function admin_read_cookie(string $name): ?string
{
    $v = $_COOKIE[$name] ?? null;
    return is_string($v) ? $v : null;
}

/** Nom du cookie de session selon le protocole (le préfixe __Host- exige HTTPS). */
function admin_cookie_name(): string
{
    return request_is_https() ? ADMIN_COOKIE_HTTPS : ADMIN_COOKIE;
}

/** Admin configuré ET cookie de session valide (équivalent de `authed` dans middleware.ts). */
function admin_is_authed(): bool
{
    return admin_is_configured() && admin_verify_session_token(admin_read_cookie(admin_cookie_name()));
}

/**
 * Garde des routes API admin : 503 si non configuré, 401 si non connecté, 403 si l'Origin
 * est étrangère, 415 si un corps n'est pas du JSON. Ne retourne que si l'accès est autorisé.
 */
function admin_require_api(): void
{
    if (!admin_is_configured()) {
        json_response(['error' => 'Admin non configuré'], 503);
    }
    if (!admin_verify_session_token(admin_read_cookie(admin_cookie_name()))) {
        security_log('admin_api_denied', ['outcome' => 'denied', 'status' => 401]);
        json_response(['error' => 'Authentification requise'], 401);
    }
    $method = request_method();
    if ($method !== 'GET' && $method !== 'HEAD') {
        require_same_origin();
        if (in_array($method, ['POST', 'PUT', 'PATCH'], true) && request_content_type() !== 'application/json') {
            security_log('admin_api_denied', ['outcome' => 'denied', 'status' => 415]);
            json_response(['error' => 'Content-Type application/json requis'], 415);
        }
    }
}

/** Requête reçue en HTTPS (X-Forwarded-Proto seulement derrière un proxy de TRUST_PROXY). */
function admin_is_https(): bool
{
    return request_is_https();
}

/**
 * Pose le cookie de session (HttpOnly, SameSite=Lax, Path=/, 8 h ; Secure + __Host- en HTTPS).
 * SameSite=Lax et non Strict : le retour de Google OAuth (/api/google/callback) est une
 * navigation venant d'un autre site et doit recevoir le cookie. Le CSRF est bloqué par
 * la vérification d'Origin et du Content-Type (admin_require_api).
 * Crée le jeton si aucun n'est fourni ; retourne false si aucune clé de signature n'est configurée.
 */
function admin_set_session_cookie(?string $token = null): bool
{
    $token = $token ?? admin_create_session_token();
    if ($token === null) return false;
    setcookie(admin_cookie_name(), $token, [
        'expires' => time() + ADMIN_SESSION_TTL_SECONDS,
        'path' => '/',
        'secure' => request_is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    return true;
}

function admin_clear_session_cookie(): void
{
    $https = request_is_https();
    setcookie(ADMIN_COOKIE, '', ['expires' => time() - 3600, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
    if ($https) {
        setcookie(ADMIN_COOKIE_HTTPS, '', ['expires' => time() - 3600, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
    }
}

/** Adresse de retour OAuth Google : toujours construite depuis SITE_URL (jamais depuis l'en-tête Host). */
function google_redirect_uri(): string
{
    return SITE_URL . '/api/google/callback';
}
