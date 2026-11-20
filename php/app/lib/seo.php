<?php
/** Métadonnées par page (port de src/lib/seo.ts). */

/**
 * @param string $ns     clé sous `meta` (ex. « home », « city »)
 * @param string $route  route interne (ex. '/a-propos')
 */
function page_meta(string $ns, string $route, array $params = [], array $values = []): array
{
    $title = t("meta.$ns.title", $values);
    $description = t("meta.$ns.description", $values);
    $urlFor = fn(string $l) => SITE_URL . path($route, $params, $l);
    $languages = [];
    foreach (LOCALES as $l) $languages[$l] = $urlFor($l);
    $languages['x-default'] = $urlFor(DEFAULT_LOCALE);
    return [
        'title' => $title,
        'description' => $description,
        'canonical' => $urlFor(locale()),
        'languages' => $languages,
        'og' => true,
    ];
}

function render_meta(array $meta): string
{
    $title = $meta['title'] ?? t('meta.home.title');
    $desc = $meta['description'] ?? t('meta.home.description');
    $h = '<title>' . e($title) . '</title>';
    $h .= '<meta name="description" content="' . e($desc) . '">';
    if (!empty($meta['robots'])) $h .= '<meta name="robots" content="' . e($meta['robots']) . '">';
    if (!empty($meta['canonical'])) {
        $h .= '<link rel="canonical" href="' . e($meta['canonical']) . '">';
        foreach ($meta['languages'] ?? [] as $l => $u) {
            $h .= '<link rel="alternate" hreflang="' . e($l) . '" href="' . e($u) . '">';
        }
    }
    if (!empty($meta['og'])) {
        $type = $meta['ogType'] ?? 'website';
        $img = $meta['ogImage'] ?? '/images/ordinateurs-portables-recyclage.jpg';
        $h .= '<meta property="og:title" content="' . e($title) . '">'
            . '<meta property="og:description" content="' . e($desc) . '">'
            . '<meta property="og:url" content="' . e($meta['canonical'] ?? SITE_URL) . '">'
            . '<meta property="og:site_name" content="' . e(SITE['name']) . '">'
            . '<meta property="og:locale" content="' . (locale() === 'fr' ? 'fr_CA' : 'en_CA') . '">'
            . '<meta property="og:type" content="' . e($type) . '">'
            . '<meta property="og:image" content="' . e(SITE_URL . $img) . '">'
            . '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="675">'
            . '<meta property="og:image:alt" content="' . e(SITE['name']) . '">'
            . '<meta name="twitter:card" content="summary_large_image">'
            . '<meta name="twitter:title" content="' . e($title) . '">'
            . '<meta name="twitter:description" content="' . e($desc) . '">';
        foreach ($meta['extra'] ?? [] as $prop => $val) {
            $h .= '<meta property="' . e($prop) . '" content="' . e($val) . '">';
        }
    }
    return $h;
}

function local_business_json_ld(): array
{
    return [
        '@context' => 'https://schema.org',
        '@type' => 'LocalBusiness',
        '@id' => SITE_URL . '/#business',
        'name' => SITE['legalName'],
        'url' => SITE_URL,
        'logo' => SITE_URL . '/logo.png',
        'image' => SITE_URL . '/images/ordinateurs-portables-recyclage.jpg',
        'telephone' => '+1-450-473-4636',
        'email' => SITE['email'],
        'foundingDate' => (string) SITE['foundedYear'],
        'founder' => ['@type' => 'Person', 'name' => SITE['founder']],
        'slogan' => 'La référence pour votre recyclage informatique et électronique',
        'address' => [
            '@type' => 'PostalAddress',
            'streetAddress' => SITE['address']['street'],
            'addressLocality' => SITE['address']['city'],
            'addressRegion' => SITE['address']['region'],
            'postalCode' => SITE['address']['postalCode'],
            'addressCountry' => SITE['address']['country'],
        ],
        'geo' => ['@type' => 'GeoCoordinates', 'latitude' => SITE['address']['geo']['lat'], 'longitude' => SITE['address']['geo']['lng']],
        'openingHoursSpecification' => [
            ['@type' => 'OpeningHoursSpecification', 'dayOfWeek' => ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], 'opens' => '08:00', 'closes' => '17:00'],
            ['@type' => 'OpeningHoursSpecification', 'dayOfWeek' => 'Friday', 'opens' => '08:00', 'closes' => '16:00'],
        ],
        'sameAs' => [SITE['facebook']],
        'areaServed' => ['Montréal', 'Laval', 'Rive-Nord', 'Rive-Sud', 'Grand Montréal'],
    ];
}
