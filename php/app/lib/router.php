<?php
/**
 * Chemins traduits (port de src/i18n/routing.ts) et résolution d'URL.
 * FR sans préfixe, EN sous /en.
 */

const ROUTES = [
    '/' => ['fr' => '/', 'en' => '/'],
    '/a-propos' => ['fr' => '/a-propos', 'en' => '/about'],
    '/informations' => ['fr' => '/informations', 'en' => '/information'],
    '/recyclage-ordinateur' => ['fr' => '/recyclage-ordinateur', 'en' => '/computer-recycling'],
    '/formulaire-de-ramassage' => ['fr' => '/formulaire-de-ramassage', 'en' => '/pick-up-form'],
    '/destruction-des-donnees' => ['fr' => '/destruction-des-donnees', 'en' => '/data-destruction'],
    '/matieres-recyclables' => ['fr' => '/matieres-recyclables', 'en' => '/recyclable-materials'],
    '/procedure-de-recuperation' => ['fr' => '/procedure-de-recuperation', 'en' => '/recovery-procedure'],
    '/destruction-des-disques-durs' => ['fr' => '/destruction-des-disques-durs', 'en' => '/hard-drive-destruction'],
    '/recyclage-telephones' => ['fr' => '/recyclage-telephones', 'en' => '/phone-recycling'],
    '/faq' => ['fr' => '/faq', 'en' => '/faq'],
    '/blog' => ['fr' => '/blog', 'en' => '/blog'],
    '/blog/[slug]' => ['fr' => '/blog/[slug]', 'en' => '/blog/[slug]'],
    '/contact' => ['fr' => '/contact', 'en' => '/contact'],
    '/merci' => ['fr' => '/merci', 'en' => '/thank-you'],
    '/politique-de-temoins' => ['fr' => '/politique-de-temoins', 'en' => '/cookie-policy'],
    '/[ville]' => ['fr' => '/[ville]', 'en' => '/[ville]'],
];

/** Fichier de vue (app/views/pages/…) par route interne. */
const ROUTE_VIEWS = [
    '/' => 'home',
    '/a-propos' => 'a-propos',
    '/informations' => 'informations',
    '/recyclage-ordinateur' => 'recyclage-ordinateur',
    '/formulaire-de-ramassage' => 'formulaire-de-ramassage',
    '/destruction-des-donnees' => 'destruction-des-donnees',
    '/matieres-recyclables' => 'matieres-recyclables',
    '/procedure-de-recuperation' => 'procedure-de-recuperation',
    '/destruction-des-disques-durs' => 'destruction-des-disques-durs',
    '/recyclage-telephones' => 'recyclage-telephones',
    '/faq' => 'faq',
    '/blog' => 'blog',
    '/blog/[slug]' => 'blog-article',
    '/contact' => 'contact',
    '/merci' => 'merci',
    '/politique-de-temoins' => 'politique-de-temoins',
    '/[ville]' => 'ville',
];

/**
 * URL publique d'une route interne — équivalent de getPathname() / <Link href>.
 * path('/a-propos') ; path('/[ville]', ['ville' => 'laval']) ; path('/', [], 'en')
 */
function path(string $route, array $params = [], ?string $locale = null): string
{
    $locale ??= locale();
    $p = ROUTES[$route][$locale] ?? $route;
    foreach ($params as $k => $v) $p = str_replace("[$k]", rawurlencode((string) $v), $p);
    if ($locale !== DEFAULT_LOCALE) $p = '/' . $locale . ($p === '/' ? '' : $p);
    return $p;
}

/**
 * Résout un chemin de requête → [locale, route interne, params] ou null (404).
 */
function resolve_route(string $uri): ?array
{
    $uri = '/' . trim($uri, '/');
    $locale = DEFAULT_LOCALE;
    if ($uri === '/en' || str_starts_with($uri, '/en/')) {
        $locale = 'en';
        $uri = substr($uri, 3) ?: '/';
    }
    foreach (ROUTES as $route => $paths) {
        $pattern = $paths[$locale];
        if (!str_contains($pattern, '[')) {
            if ($pattern === $uri) return [$locale, $route, []];
            continue;
        }
        $regex = '#^' . preg_replace('#\\\\\[(\w+)\\\\\]#', '(?P<$1>[^/]+)', preg_quote($pattern, '#')) . '$#';
        if (preg_match($regex, $uri, $m)) {
            $params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
            $params = array_map('rawurldecode', $params);
            if ($route === '/[ville]' && !get_city($params['ville'])) continue;
            if ($route === '/blog/[slug]' && !in_array($params['slug'], BLOG_SLUGS, true)) continue;
            return [$locale, $route, $params];
        }
    }
    return null;
}

/** Route courante (renseignée par le contrôleur frontal). */
function current_route(): array
{
    return $GLOBALS['__route'] ?? ['route' => '/', 'params' => []];
}

/** Lien vers la même page dans l'autre langue (LangSwitcher). */
function alternate_path(string $targetLocale): string
{
    $r = current_route();
    return path($r['route'], $r['params'], $targetLocale);
}

/** Redirections 301 (port de next.config.ts). */
function legacy_redirects(): array
{
    $map = [
        '/blog/5-conseils-pour-un-recyclage-electronique-reussi' => '/blog/nos-5-conseils-pour-un-recyclage-reussi',
        '/blog/destruction-securisee-des-disques-durs-et-loi-25' => '/blog/destruction-securisee-des-disques-durs-protegez-vos-donnees-sensibles',
        '/politique-de-temoins-ca' => '/politique-de-temoins',
        '/recyclage-ordinateur/montreal-west-island' => '/montreal',
        '/recyclage-ordinateur/rive-nord' => '/saint-eustache',
        '/recyclage-ordinateur/rive-sud' => '/longueuil',
    ];
    // Articles que WordPress publiait à la racine
    foreach (BLOG_SLUGS as $slug) $map["/$slug"] = "/blog/$slug";
    return $map;
}
