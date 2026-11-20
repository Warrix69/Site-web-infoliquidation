<?php
/** sitemap.xml (port de src/app/sitemap.ts). */
$static = [
    ['/', '1.0', 'weekly'], ['/formulaire-de-ramassage', '0.9', 'monthly'], ['/recyclage-ordinateur', '0.8', 'monthly'],
    ['/destruction-des-donnees', '0.8', 'monthly'], ['/destruction-des-disques-durs', '0.8', 'monthly'],
    ['/matieres-recyclables', '0.7', 'monthly'], ['/procedure-de-recuperation', '0.7', 'monthly'],
    ['/recyclage-telephones', '0.7', 'monthly'], ['/a-propos', '0.6', 'yearly'], ['/informations', '0.6', 'yearly'],
    ['/faq', '0.6', 'monthly'], ['/blog', '0.6', 'weekly'], ['/contact', '0.7', 'yearly'],
];
$entries = [];
foreach ($static as [$r, $p, $f]) $entries[] = [$r, [], $p, $f];
foreach (CITIES as $c) $entries[] = ['/[ville]', ['ville' => $c['slug']], '0.7', 'monthly'];
foreach (BLOG_SLUGS as $s) $entries[] = ['/blog/[slug]', ['slug' => $s], '0.5', 'yearly'];

$now = gmdate('Y-m-d\TH:i:s.v\Z');
header('Content-Type: application/xml; charset=utf-8');
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";
foreach ($entries as [$r, $params, $prio, $freq]) {
    echo "<url>\n<loc>" . e(SITE_URL . path($r, $params, DEFAULT_LOCALE)) . "</loc>\n";
    foreach (LOCALES as $l) {
        echo '<xhtml:link rel="alternate" hreflang="' . $l . '" href="' . e(SITE_URL . path($r, $params, $l)) . '" />' . "\n";
    }
    echo "<lastmod>$now</lastmod>\n<changefreq>$freq</changefreq>\n<priority>$prio</priority>\n</url>\n";
}
echo '</urlset>';
