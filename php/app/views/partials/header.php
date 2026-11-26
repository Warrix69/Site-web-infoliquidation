<?php
/** En-tête fixe : topbar, nav, menu Services, FR/EN, CTA (port de Header.tsx ; JS dans assets/site.js). */
$cur = current_route()['route'];
$before = [['nav.home', '/'], ['nav.about', '/a-propos'], ['nav.informations', '/informations']];
$after = [['nav.faq', '/faq'], ['nav.blog', '/blog'], ['nav.contact', '/contact']];
$linkCls = fn(bool $active) => 'rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200 ' . ($active ? 'text-emerald' : 'text-mist/90 hover:text-emerald');
$logoW = 180;
$logoH = (int) round($logoW * 80 / 338);
?>
<div class="fixed inset-x-0 top-0 z-50" data-header>
  <div data-topbar class="max-h-10 overflow-hidden bg-forest transition-[max-height] duration-300 ease-out motion-reduce:transition-none">
    <div class="mx-auto flex h-10 w-full max-w-6xl items-center justify-between gap-4 px-5 text-xs sm:px-8">
      <a href="<?= e(SITE['phoneHref']) ?>" class="inline-flex shrink-0 items-center gap-1.5 font-semibold text-paper transition-opacity hover:opacity-90">
        <?= icon('Phone', 'h-3.5 w-3.5') ?><?= e(SITE['phoneDisplay']) ?>
      </a>
      <p class="hidden truncate text-paper/90 md:block"><?= te('topbar.message') ?></p>
      <?= render('partials/lang-switcher') ?>
    </div>
  </div>

  <header data-headbar class="border-b border-line bg-paper/95 backdrop-blur transition-[box-shadow] duration-300">
    <div class="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
      <a href="<?= e(path('/')) ?>" aria-label="Info Liquidation Recycle" class="shrink-0">
        <span class="inline-flex items-center"><img src="/logo.png" alt="Info Liquidation Recycle" width="<?= $logoW ?>" height="<?= $logoH ?>" fetchpriority="high" class="h-auto w-auto" style="max-width:<?= $logoW ?>px"></span>
      </a>

      <nav aria-label="<?= te('nav.mainNavLabel') ?>" class="hidden items-center gap-1 lg:flex">
        <?php foreach ($before as [$k, $r]): ?>
          <a href="<?= e(path($r)) ?>" class="<?= $linkCls($cur === $r) ?>"><?= te($k) ?></a>
        <?php endforeach; ?>

        <div class="relative" data-services>
          <button type="button" aria-expanded="false" aria-haspopup="true" aria-label="<?= te('nav.servicesMenuLabel') ?>" data-services-btn class="inline-flex items-center gap-1 <?= $linkCls(false) ?>">
            <?= te('nav.services') ?>
            <?= icon('ChevronDown', 'h-3.5 w-3.5 transition-transform duration-200') ?>
          </button>
          <div data-services-panel hidden class="dropdown-panel absolute left-1/2 top-full w-[600px] -translate-x-1/2 pt-3">
            <div class="grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-paper p-2 shadow-[0_24px_60px_-20px_rgba(10,10,10,0.35)]">
              <?php foreach (SERVICES as $s): $current = $cur === $s['route']; ?>
                <a href="<?= e(path($s['route'])) ?>"<?= $current ? ' aria-current="page"' : '' ?> class="group/item flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-colors <?= $current ? 'bg-emerald text-paper' : 'bg-sand/60 text-ink hover:bg-ink hover:text-paper' ?>">
                  <?= te("services.{$s['key']}.title") ?>
                  <?= icon('ArrowUpRight', 'h-4 w-4 shrink-0 opacity-60 transition-transform group-hover/item:-translate-y-0.5 group-hover/item:translate-x-0.5 group-hover/item:opacity-100') ?>
                </a>
              <?php endforeach; ?>
            </div>
          </div>
        </div>

        <?php foreach ($after as [$k, $r]): ?>
          <a href="<?= e(path($r)) ?>" class="<?= $linkCls($cur === $r) ?>"><?= te($k) ?></a>
        <?php endforeach; ?>
      </nav>

      <div class="flex items-center gap-3">
        <a href="<?= e(path('/formulaire-de-ramassage')) ?>" class="hidden rounded-full bg-gradient-accent px-5 py-2.5 font-display text-sm font-bold text-ink shadow-glow transition-[box-shadow,filter,outline-color,outline-width,outline-offset,border-radius] duration-300 hover:shadow-glow-lg hover:brightness-110 md:inline-flex"><?= te('common.freePickupCta') ?></a>
        <button type="button" data-menu-btn aria-expanded="false" aria-label="<?= te('nav.openMenu') ?>" data-label-open="<?= te('nav.openMenu') ?>" data-label-close="<?= te('nav.closeMenu') ?>" class="glass-light inline-flex h-10 w-10 items-center justify-center rounded-full text-mist lg:hidden">
          <span data-icon-open><?= icon('Menu', 'h-5 w-5') ?></span>
          <span data-icon-close hidden><?= icon('X', 'h-5 w-5') ?></span>
        </button>
      </div>
    </div>
  </header>

  <nav data-mobile-menu hidden aria-label="<?= te('nav.mainNavLabel') ?>" class="mobile-panel mx-4 mt-2 max-h-[calc(100dvh-120px)] overflow-y-auto rounded-2xl border border-line bg-paper p-4 shadow-[0_24px_60px_-20px_rgba(10,10,10,0.35)] lg:hidden">
    <div class="flex flex-col">
      <?php foreach ($before as [$k, $r]): ?>
        <a href="<?= e(path($r)) ?>" class="rounded-xl px-4 py-3 font-display text-base font-semibold text-mist hover:bg-emerald-soft hover:text-emerald"><?= te($k) ?></a>
      <?php endforeach; ?>
      <p class="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-emerald"><?= te('nav.services') ?></p>
      <?php foreach (SERVICES as $s): ?>
        <a href="<?= e(path($s['route'])) ?>" class="rounded-xl px-4 py-2.5 text-sm text-mist/90 hover:bg-emerald-soft hover:text-emerald"><?= te("services.{$s['key']}.title") ?></a>
      <?php endforeach; ?>
      <div class="my-2 border-t border-line"></div>
      <?php foreach ($after as [$k, $r]): ?>
        <a href="<?= e(path($r)) ?>" class="rounded-xl px-4 py-3 font-display text-base font-semibold text-mist hover:bg-emerald-soft hover:text-emerald"><?= te($k) ?></a>
      <?php endforeach; ?>
      <a href="<?= e(path('/formulaire-de-ramassage')) ?>" class="mt-3 inline-flex items-center justify-center rounded-full bg-gradient-accent px-5 py-3 font-display text-sm font-bold text-ink shadow-glow"><?= te('common.freePickupCta') ?></a>
    </div>
  </nav>
</div>
