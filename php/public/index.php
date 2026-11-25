<?php
/**
 * Contrôleur frontal : toutes les requêtes non statiques passent ici
 * (voir .htaccess). Équivalent du middleware + routeur de Next.js.
 */

// Dossier public = dossier de ce fichier (php/public/ ou public_html/ selon le déploiement)
define('PUBLIC_DIR', __DIR__);
require dirname(__DIR__) . '/app/bootstrap.php';

$uri = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$uri = '/' . trim(preg_replace('#/+#', '/', $uri), '/');

// Serveur intégré de PHP (php -S) : laisser passer les fichiers statiques, sauf les fichiers
// cachés (.htaccess…) qu'Apache refuse aussi
if (PHP_SAPI === 'cli-server' && $uri !== '/' && !str_contains($uri, '/.') && is_file(PUBLIC_DIR . $uri)) {
    return false;
}

// En-têtes de sécurité (port de next.config.ts). Les fichiers statiques reçoivent les mêmes via .htaccess.
header('X-Request-Id: ' . request_id());
header('Strict-Transport-Security: max-age=63072000; includeSubDomains');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()');
header('Cross-Origin-Opener-Policy: same-origin');
$upgrade = request_is_https() ? '; upgrade-insecure-requests' : ''; // en http (tests locaux), ne pas forcer https
header("Content-Security-Policy: base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'$upgrade");
header_remove('X-Powered-By');

/** En-têtes des réponses admin et API : jamais en cache, jamais indexées. */
function private_response_headers(): void
{
    header('X-Robots-Tag: noindex, nofollow');
    header('Cache-Control: no-store');
}

/**
 * CSP complète en mode « rapport seulement » (ne bloque rien ; les violations apparaissent dans
 * la console du navigateur). À passer en Content-Security-Policy une fois vérifiée sans violation.
 */
function csp_report_only(bool $admin): void
{
    $upgrade = request_is_https() ? '; upgrade-insecure-requests' : '';
    if ($admin) {
        // Dashboard : scripts et gestionnaires en ligne ; polices Google ; images eBay (https:)
        $csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            . "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self'; "
            . "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
    } else {
        // Site public : seul script en ligne = bascule no-js → js (autorisé par son empreinte SHA-256).
        // Polices et HDR auto-hébergés ; carte Google en iframe sur /contact ; three.js utilise blob: et data:.
        $hash = "'sha256-" . base64_encode(hash('sha256', NO_JS_INLINE_SCRIPT, true)) . "'";
        $csp = "default-src 'self'; script-src 'self' $hash; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; "
            . "font-src 'self'; connect-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; frame-src https://www.google.com; "
            . "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
    }
    header("Content-Security-Policy-Report-Only: $csp$upgrade");
}

/** Sert une page de l'admin depuis app/views/admin/ (hors de la racine web). */
function serve_admin_file(string $name, string $type): never
{
    $file = APP_DIR . '/views/admin/' . $name;
    if (!is_file($file)) {
        error_log("[infoliquidation] Fichier admin manquant : app/views/admin/$name (lancer node php/build.mjs)");
        http_response_code(503);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Admin indisponible.';
        exit;
    }
    header("Content-Type: $type");
    readfile($file);
    exit;
}

// ---------- Fichiers générés ----------
if ($uri === '/sitemap.xml') { require APP_DIR . '/views/sitemap.php'; exit; }
if ($uri === '/robots.txt') { require APP_DIR . '/views/robots.php'; exit; }

// ---------- API ----------
if (str_starts_with($uri, '/api/')) {
    private_response_headers();
    $apiPath = substr($uri, 5);
    // Identifiants d'événements Google : lettres, chiffres, _ @ - (jamais de point : « .. » refusé)
    $isEvent = (bool) preg_match('#^calendar/events/[A-Za-z0-9_@\-]+$#', $apiPath);
    if (!$isEvent && !preg_match('#^[a-z0-9\-/]+$#', $apiPath)) json_response(['error' => 'Not found'], 404);

    if (preg_match('#^(ebay|calendar|google|clients|certificates|templates)(/|$)#', $apiPath)) {
        require_once APP_DIR . '/lib/admin_auth.php';
        admin_require_api();
    }

    $ROUTE_PARAMS = [];
    if (preg_match('#^calendar/events/([^/]+)$#', $apiPath, $m)) {
        $ROUTE_PARAMS['id'] = $m[1];
        $apiPath = 'calendar/event';
    }
    $file = APP_DIR . "/api/$apiPath.php";
    if (!is_file($file)) json_response(['error' => 'Not found'], 404);
    require $file;
    exit;
}

// ---------- Admin (pages hors de la racine web, servies seulement par PHP) ----------
if (preg_match('#^/admin/login(\.html)?$#', $uri)) {
    private_response_headers();
    csp_report_only(true);
    serve_admin_file('login.html', 'text/html; charset=utf-8');
}
if (preg_match('#^/(en/)?admin(/.*)?$#', $uri)) {
    require_once APP_DIR . '/lib/admin_auth.php';
    private_response_headers();
    if (!admin_is_configured() || !admin_is_authed()) redirect('/admin/login', 307);
    if (preg_match('#^/(en/)?admin/?$#', $uri)) {
        csp_report_only(true);
        serve_admin_file('dashboard.html', 'text/html; charset=utf-8');
    }
    // Images du dashboard (ex. byebyeboss-logo.png), après la vérification de session
    if (preg_match('#^/admin/([a-z0-9][a-z0-9\-]*\.(png|webp|jpg|svg))$#D', $uri, $m)) {
        $types = ['png' => 'image/png', 'webp' => 'image/webp', 'jpg' => 'image/jpeg', 'svg' => 'image/svg+xml'];
        if (is_file(APP_DIR . '/views/admin/' . $m[1])) serve_admin_file($m[1], $types[$m[2]]);
    }
    http_response_code(404);
    exit;
}

// ---------- Redirections 301 (anciennes URL WordPress) ----------
$legacy = legacy_redirects();
if (isset($legacy[$uri])) redirect($legacy[$uri], 301);

// Barre oblique finale → version sans (comme Next.js)
$rawPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if ($rawPath !== '/' && str_ends_with($rawPath, '/')) {
    $qs = $_SERVER['QUERY_STRING'] ?? '';
    redirect(rtrim($rawPath, '/') . ($qs ? "?$qs" : ''), 308);
}

// ---------- Pages ----------
csp_report_only(false);
$resolved = resolve_route($uri);
if (!$resolved) {
    // Locale tirée du préfixe pour la page 404
    set_locale(str_starts_with($uri, '/en/') || $uri === '/en' ? 'en' : 'fr');
    http_response_code(404);
    $page = ['content' => render('pages/not-found'), 'meta' => ['title' => t('meta.notFound.title'), 'robots' => 'noindex']];
} else {
    [$locale, $route, $params] = $resolved;
    set_locale($locale);
    $GLOBALS['__route'] = ['route' => $route, 'params' => $params];
    // Chaque vue de page retourne ['content' => html, 'meta' => [...], 'jsonLd' => [...], 'head' => '...']
    $page = (function () use ($route, $params) {
        return require APP_DIR . '/views/pages/' . ROUTE_VIEWS[$route] . '.php';
    })();
}

header('Content-Type: text/html; charset=utf-8');
echo render('layout', $page);
