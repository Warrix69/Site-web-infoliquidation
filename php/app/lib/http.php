<?php
/** Petites fonctions HTTP partagées par les pages et les API. */

/** Identifiant unique de la requête (en-tête X-Request-Id, journaux et réponses d'erreur). */
function request_id(): string
{
    static $id = null;
    return $id ??= bin2hex(random_bytes(8));
}

function json_response($data, int $status = 200, array $headers = []): never
{
    // Les erreurs portent l'identifiant de requête (à donner au support ; à chercher dans les journaux)
    if ($status >= 400 && is_array($data) && !isset($data['requestId'])) $data['requestId'] = request_id();
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    foreach ($headers as $k => $v) header("$k: $v");
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function redirect(string $to, int $status = 302): never
{
    header("Location: $to", true, $status);
    header('Cache-Control: no-store');
    exit;
}

function request_method(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

/**
 * La connexion vient-elle d'un proxy de confiance ? TRUST_PROXY = liste d'adresses IP
 * exactes séparées par des virgules ; REMOTE_ADDR doit en faire partie.
 * (L'ancienne valeur « 1 » n'est plus acceptée : elle laissait n'importe qui choisir son IP.)
 */
function trusted_proxies(): array
{
    static $list = null;
    if ($list !== null) return $list;
    $list = [];
    foreach (explode(',', (string) env('TRUST_PROXY', '')) as $p) {
        $bin = @inet_pton(trim($p));
        if ($bin !== false) $list[] = $bin;
    }
    return $list;
}

function is_trusted_proxy(string $ip): bool
{
    $bin = @inet_pton($ip);
    return $bin !== false && in_array($bin, trusted_proxies(), true);
}

function from_trusted_proxy(): bool
{
    return is_trusted_proxy((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
}

function client_ip(): string
{
    $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    // Les en-têtes X-Forwarded-For / CF-Connecting-IP ne sont lus que si la connexion vient d'un
    // proxy listé dans TRUST_PROXY ; sinon n'importe qui pourrait contourner le blocage des connexions.
    if (!from_trusted_proxy()) return $remote;
    $cf = trim((string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? ''));
    if ($cf !== '' && filter_var($cf, FILTER_VALIDATE_IP)) return $cf;
    // X-Forwarded-For : l'entrée la plus à droite qui n'est pas un proxy de confiance
    $hops = array_reverse(array_map('trim', explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''))));
    foreach ($hops as $hop) {
        if ($hop === '' || !filter_var($hop, FILTER_VALIDATE_IP)) break;
        if (!is_trusted_proxy($hop)) return $hop;
    }
    $real = trim((string) ($_SERVER['HTTP_X_REAL_IP'] ?? ''));
    if ($real !== '' && filter_var($real, FILTER_VALIDATE_IP)) return $real;
    return $remote;
}

/**
 * Clé d'adresse pour les limiteurs de débit : IPv4 telle quelle, IPv6 regroupée par /64
 * (un abonné reçoit souvent tout un /64 et pourrait sinon changer d'adresse à volonté).
 */
function rate_limit_ip(): string
{
    $ip = client_ip();
    $bin = @inet_pton($ip);
    if ($bin === false || strlen($bin) !== 16) return $ip;
    // IPv4 encapsulée (::ffff:a.b.c.d) → IPv4
    if (str_starts_with($bin, str_repeat("\0", 10) . "\xff\xff")) return inet_ntop(substr($bin, 12));
    return inet_ntop(substr($bin, 0, 8) . str_repeat("\0", 8)) . '/64';
}

/** Requête reçue en HTTPS (X-Forwarded-Proto seulement depuis un proxy de confiance). */
function request_is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off') return true;
    if ((string) ($_SERVER['SERVER_PORT'] ?? '') === '443') return true;
    if (!from_trusted_proxy()) return false;
    $proto = strtolower(trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));
    return $proto === 'https';
}

/** Origine (schéma://hôte[:port]) d'une URL, en minuscules ; null si invalide. */
function url_origin(string $url): ?string
{
    $p = parse_url($url);
    if (!is_array($p) || empty($p['scheme']) || empty($p['host'])) return null;
    $scheme = strtolower($p['scheme']);
    $port = isset($p['port']) && !(($scheme === 'https' && $p['port'] === 443) || ($scheme === 'http' && $p['port'] === 80))
        ? ':' . $p['port'] : '';
    return $scheme . '://' . strtolower($p['host']) . $port;
}

/**
 * L'en-tête Origin (s'il est présent) est-il celui du site ? Accepte l'origine de SITE_URL,
 * sa variante avec/sans « www. » et, en développement seulement, localhost / 127.0.0.1.
 */
function request_origin_allowed(): bool
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
    if ($origin === null || $origin === '') return true; // pas d'Origin : requête non issue d'un navigateur moderne
    $got = url_origin((string) $origin);
    if ($got === null) return false; // « null » (iframe sandbox, redirection…) refusé
    $site = url_origin(SITE_URL);
    if ($site !== null) {
        $alt = str_contains($site, '://www.') ? str_replace('://www.', '://', $site) : str_replace('://', '://www.', $site);
        if ($got === $site || $got === $alt) return true;
    }
    return app_is_dev() && (bool) preg_match('#^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$#D', $got);
}

/** Anti-CSRF des requêtes qui modifient quelque chose : 403 si l'Origin est étrangère. */
function require_same_origin(): void
{
    if (request_origin_allowed()) return;
    security_log('csrf_origin_rejected', ['outcome' => 'denied', 'origin' => (string) ($_SERVER['HTTP_ORIGIN'] ?? '')]);
    json_response(['error' => 'Forbidden'], 403);
}

/** Type MIME du corps (sans paramètres, en minuscules). */
function request_content_type(): string
{
    $ct = (string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
    return strtolower(trim(explode(';', $ct)[0]));
}

/** Échappement HTML — à utiliser pour toute valeur affichée. */
function e($v): string
{
    return htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Options cURL communes. Sous Windows (tests locaux), PHP n'a pas de liste de
 * certificats : on utilise celle de Windows. Sans effet sur l'hébergeur Linux.
 */
function curl_base_opts(): array
{
    if (PHP_OS_FAMILY === 'Windows' && defined('CURLSSLOPT_NATIVE_CA')) {
        return [CURLOPT_SSL_OPTIONS => CURLSSLOPT_NATIVE_CA];
    }
    return [];
}
