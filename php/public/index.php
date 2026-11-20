<?php
/**
 * Contrôleur frontal : toutes les requêtes non statiques passent ici
 * (voir .htaccess). Équivalent du middleware + routeur de Next.js.
 */

require dirname(__DIR__) . '/app/bootstrap.php';

// En-têtes de sécurité (port de next.config.ts)
header('Strict-Transport-Security: max-age=63072000; includeSubDomains');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()');
header("Content-Security-Policy: base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'");
header_remove('X-Powered-By');

$uri = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$uri = '/' . trim(preg_replace('#/+#', '/', $uri), '/');

// Serveur intégré de PHP (php -S) : laisser passer les fichiers statiques
if (PHP_SAPI === 'cli-server' && $uri !== '/' && is_file(PUBLIC_DIR . $uri)) {
    return false;
}

// ---------- Fichiers générés ----------
if ($uri === '/sitemap.xml') { require APP_DIR . '/views/sitemap.php'; exit; }
if ($uri === '/robots.txt') { require APP_DIR . '/views/robots.php'; exit; }

// ---------- API ----------
if (str_starts_with($uri, '/api/')) {
    header('X-Robots-Tag: noindex, nofollow');
    $apiPath = substr($uri, 5);
    // Les identifiants d'événements Google contiennent _ @ . et des majuscules
    $isEvent = (bool) preg_match('#^calendar/events/[A-Za-z0-9_@.\-]+$#', $apiPath);
    if (!$isEvent && !preg_match('#^[a-z0-9\-/]+$#', $apiPath)) json_response(['error' => 'Not found'], 404);

    if (preg_match('#^(ebay|calendar|google)(/|$)#', $apiPath)) {
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

// ---------- Admin ----------
if (preg_match('#^/admin/login(\.html)?$#', $uri)) {
    header('X-Robots-Tag: noindex, nofollow');
    header('Cache-Control: no-store');
    header('Content-Type: text/html; charset=utf-8');
    readfile(PUBLIC_DIR . '/admin/login.html');
    exit;
}
if (preg_match('#^/(en/)?admin(/.*)?$#', $uri)) {
    require_once APP_DIR . '/lib/admin_auth.php';
    header('X-Robots-Tag: noindex, nofollow');
    header('Cache-Control: no-store');
    if (!admin_is_configured() || !admin_is_authed()) redirect('/admin/login', 307);
    if (preg_match('#^/(en/)?admin/?$#', $uri)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile(PUBLIC_DIR . '/admin/dashboard.html');
        exit;
    }
    // Fichiers de l'admin (logo…) servis par Apache ; le reste est introuvable
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
