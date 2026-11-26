<?php
/** Pied de page (port de Footer.tsx). */
$loc = locale();
$navLinks = [['nav.home', '/'], ['nav.about', '/a-propos'], ['nav.informations', '/informations'], ['nav.faq', '/faq'], ['nav.blog', '/blog'], ['nav.contact', '/contact']];
$riveNord = $loc === 'fr' ? 'Rive-Nord' : 'North Shore';
$riveSud = $loc === 'fr' ? 'Rive-Sud' : 'South Shore';
$others = array_values(array_filter(CITIES, fn($c) => $c['slug'] !== 'montreal'));
$dot = '<span aria-hidden="true" class="ms-2 text-line">·</span>';
?>
<footer data-theme="dark" class="relative border-t border-line text-mist" style="background-color:var(--color-forest-deep)">
  <div class="border-b border-line">
    <div class="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-5 px-5 py-10 text-center sm:flex-row sm:px-8 sm:text-left">
      <p class="font-display text-xl font-bold text-mist sm:text-2xl"><span class="text-gradient"><?= te('footer.bannerTitle') ?></span></p>
      <?= primary_button(path('/formulaire-de-ramassage'), t('footer.bannerCta')) ?>
    </div>
  </div>

  <div class="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
    <div class="space-y-4">
      <a href="<?= e(path('/')) ?>" aria-label="Info Liquidation Recycle" class="inline-block">
        <span class="inline-flex items-center"><img src="/logo.png" alt="Info Liquidation Recycle" width="150" height="36" loading="lazy" class="h-auto w-auto" style="max-width:150px"></span>
      </a>
      <p class="font-display text-sm font-bold tracking-[0.2em] text-emerald"><?= te('common.experts') ?></p>
      <p class="text-sm leading-relaxed text-moss"><?= te('footer.aboutText') ?></p>
      <a href="<?= e(SITE['facebook']) ?>" target="_blank" rel="noopener noreferrer" aria-label="<?= te('footer.facebookLabel') ?>" class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-emerald-soft text-emerald transition-[color,background-color,box-shadow,outline-color,outline-width,outline-offset,border-radius] duration-300 hover:bg-gradient-accent hover:text-ink hover:shadow-glow">
        <?= icon('Facebook', 'h-5 w-5') ?>
      </a>
    </div>

    <nav aria-label="<?= te('footer.navTitle') ?>">
      <p class="mb-4 font-display text-sm font-bold uppercase tracking-[0.18em] text-mist"><?= te('footer.navTitle') ?></p>
      <ul class="space-y-2.5">
        <?php foreach ($navLinks as [$k, $r]): ?>
          <li><a href="<?= e(path($r)) ?>" class="text-sm text-moss transition-colors hover:text-emerald"><?= te($k) ?></a></li>
        <?php endforeach; ?>
      </ul>
    </nav>

    <nav aria-label="<?= te('footer.servicesTitle') ?>">
      <p class="mb-4 font-display text-sm font-bold uppercase tracking-[0.18em] text-mist"><?= te('footer.servicesTitle') ?></p>
      <ul class="space-y-2.5">
        <?php foreach (SERVICES as $s): ?>
          <li><a href="<?= e(path($s['route'])) ?>" class="text-sm text-moss transition-colors hover:text-emerald"><?= te("services.{$s['key']}.title") ?></a></li>
        <?php endforeach; ?>
      </ul>
    </nav>

    <div>
      <p class="mb-4 font-display text-sm font-bold uppercase tracking-[0.18em] text-mist"><?= te('footer.contactTitle') ?></p>
      <ul class="space-y-3 text-sm text-moss">
        <li>
          <a href="<?= e(SITE['address']['mapsUrl']) ?>" target="_blank" rel="noopener noreferrer" class="flex items-start gap-2.5 transition-colors hover:text-emerald">
            <?= icon('MapPin', 'mt-0.5 h-4 w-4 shrink-0 text-emerald') ?>
            <span><?= e(SITE['address']['street']) ?><br><?= e(SITE['address']['city'] . ', ' . SITE['address']['region'] . ' ' . SITE['address']['postalCode']) ?></span>
          </a>
        </li>
        <li><a href="<?= e(SITE['phoneHref']) ?>" class="flex items-center gap-2.5 transition-colors hover:text-emerald"><?= icon('Phone', 'h-4 w-4 shrink-0 text-emerald') ?><?= e(SITE['phoneDisplay']) ?></a></li>
        <li><a href="mailto:<?= e(SITE['email']) ?>" class="flex items-center gap-2.5 break-all transition-colors hover:text-emerald"><?= icon('Mail', 'h-4 w-4 shrink-0 text-emerald') ?><?= e(SITE['email']) ?></a></li>
        <li class="flex items-start gap-2.5">
          <?= icon('Clock', 'mt-0.5 h-4 w-4 shrink-0 text-emerald') ?>
          <span><?= te('common.hoursMonThu') ?><br><?= te('common.hoursFri') ?><br><?= te('common.hoursWeekend') ?></span>
        </li>
      </ul>
    </div>
  </div>

  <div class="border-t border-line">
    <div class="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <p class="mb-4 font-display text-sm font-bold uppercase tracking-[0.18em] text-mist"><?= te('footer.citiesTitle') ?></p>
      <ul class="flex flex-wrap gap-x-2 gap-y-2 text-sm text-moss">
        <li><a href="<?= e(path('/[ville]', ['ville' => 'montreal'])) ?>" class="transition-colors hover:text-emerald"><?= $loc === 'fr' ? 'Montréal' : 'Montreal' ?></a><?= $dot ?></li>
        <li><?= e($riveNord) ?><?= $dot ?></li>
        <li><?= e($riveSud) ?><?= $dot ?></li>
        <?php foreach ($others as $i => $c): ?>
          <li><a href="<?= e(path('/[ville]', ['ville' => $c['slug']])) ?>" class="transition-colors hover:text-emerald"><?= e($c[$loc]) ?></a><?= $i < count($others) - 1 ? $dot : '' ?></li>
        <?php endforeach; ?>
      </ul>
    </div>
  </div>

  <div class="border-t border-line">
    <div class="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs text-moss sm:flex-row sm:px-8">
      <p><?= te('footer.copyright') ?></p>
      <a href="/sitemap.xml" class="transition-colors hover:text-emerald"><?= te('footer.sitemap') ?></a>
    </div>
  </div>
</footer>
