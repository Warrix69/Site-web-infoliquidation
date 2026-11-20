<?php
header('Content-Type: text/plain; charset=utf-8');
echo "User-Agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /en/admin\n\nHost: " . SITE_URL . "\nSitemap: " . SITE_URL . "/sitemap.xml\n";
