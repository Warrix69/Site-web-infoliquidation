<?php
/** Gabarit HTML commun (port de app/[locale]/layout.tsx). Variables : $content, $meta, $head, $jsonLd. */
$meta ??= [];
?><!doctype html>
<html lang="<?= e(locale()) ?>" class="no-js" data-route="<?= e(current_route()['route']) ?>" data-params="<?= e(json_encode(current_route()['params'] ?: new stdClass())) ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>document.documentElement.classList.replace('no-js','js')</script>
<?= render_meta($meta) ?>
<link rel="icon" href="/favicon-logo.png" type="image/png">
<?php /* Polices auto-hébergées (php/css/fonts.css, fichiers dans public/fonts) : on précharge
   celle du titre principal (Poppins 800 pour page_hero, 700 ailleurs) ; le reste arrive par app.css. */ ?>
<link rel="preload" href="/fonts/poppins-<?= !empty($GLOBALS['__page_hero']) ? '800' : '700' ?>-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="<?= asset('assets/app.css') ?>">
<?= ($head ?? '') . "\n" ?>
<?= islands_modulepreload() . "\n" ?>
<script type="module" src="<?= asset('assets/site.js') ?>"></script>
</head>
<body>
<a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-gradient-accent focus:px-5 focus:py-2.5 focus:font-semibold focus:text-ink"><?= te('common.skipToContent') ?></a>
<?= render('partials/header') ?>
<main id="main"><?= $content ?></main>
<?= render('partials/footer') ?>
<div data-cookie-banner hidden class="cookie-panel fixed inset-x-4 bottom-4 z-[80] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-sm" role="dialog" aria-live="polite" aria-label="Cookie consent">
  <div class="rounded-2xl border border-line bg-paper p-4 shadow-[0_20px_50px_-20px_rgba(10,10,10,0.45)] sm:p-5">
    <p class="text-sm leading-relaxed text-mist"><?= te('cookieBanner.message') ?></p>
    <div class="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" data-cookie-accept class="inline-flex items-center justify-center rounded-full bg-gradient-accent px-5 py-2 text-sm font-semibold text-ink transition-transform hover:scale-[1.02]"><?= te('cookieBanner.accept') ?></button>
      <a href="<?= e(path('/politique-de-temoins')) ?>" class="text-sm font-semibold text-moss underline decoration-emerald/50 underline-offset-4 transition-colors hover:text-emerald"><?= te('cookieBanner.learnMore') ?></a>
    </div>
  </div>
</div>
<?= json_ld(local_business_json_ld()) ?>
<?php foreach ($jsonLd ?? [] as $ld) echo json_ld($ld); ?>
<?php if (!empty($GLOBALS['__islands_used'])): ?>
<script type="module" src="<?= asset('assets/islands.js') ?>"></script>
<?php endif; ?>
</body>
</html>
