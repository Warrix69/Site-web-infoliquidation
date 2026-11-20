<?php
/** Accueil (port de src/app/[locale]/page.tsx). Les sections interactives sont des îlots React. */

$heroLabels = [
    'titleLead' => t('home.hero.titleLead'),
    'titleAccent' => t('home.hero.titleAccent'),
    'since' => t('home.hero.since'),
    'years' => tr('home.hero.years'),
    'promise' => t('home.hero.promise'),
    'ctaPrimary' => t('home.hero.ctaPrimary'),
    'ctaHow' => t('home.hero.ctaHow'),
    'devices' => tr('home.hero.devices'),
];
$stats = tr('home.stats.items') ?? [];
$regions = tr('home.zones.regions') ?? [];
$flow = tr('home.flow');
$flowVisuals = [
    ['/images/objets/camionnette-logo.webp', 1200, 497, 'w-[88%]'],
    ['/images/objets/dechiquete.webp', 900, 470, 'w-[78%]'],
    ['/images/objets/matieres.webp', 900, 493, 'w-[78%]'],
];

// Contenu de secours du héros (avant le montage React, et pour les robots)
$heroFallback = '<section aria-label="' . e($heroLabels['titleAccent']) . '" class="relative bg-vivid text-paper">'
    . '<div class="relative h-[100svh] min-h-[560px] lg:min-h-[640px]"><div class="relative mx-auto flex h-full w-full max-w-7xl flex-col px-5 pb-5 pt-[7.25rem] sm:px-8 lg:justify-center lg:pb-10 lg:pt-28">'
    . '<h1 class="font-display text-[clamp(2.4rem,7vw,5.5rem)] font-bold leading-[1.02] tracking-[-0.035em] text-paper">'
    . e($heroLabels['titleLead']) . ' <span class="text-ink">' . e($heroLabels['titleAccent']) . '</span></h1>'
    . '<p class="mt-4 max-w-xl text-base text-paper/90 sm:text-lg">' . e($heroLabels['promise']) . '</p>'
    . '</div></div></section>';

ob_start(); ?>
<?= island('Hero', ['labels' => $heroLabels], $heroFallback) ?>

<!-- Chiffres clés -->
<section data-theme="dark" class="relative overflow-hidden text-mist">
  <div class="mx-auto grid w-full max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-5 py-16 sm:grid-cols-3 sm:px-8 lg:grid-cols-5 lg:py-20">
    <?php foreach ($stats as $i => $item): ?>
      <div<?= reveal($i * 0.08) ?>>
        <?php if (!empty($item['prefix'])): ?>
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-moss"><?= e($item['prefix']) ?></p>
        <?php endif; ?>
        <p class="mt-2 font-display text-3xl font-bold leading-none text-lime sm:text-4xl">
          <?= !empty($item['text']) ? e($item['text']) : counter($item['value'] ?? 0, ($item['suffix'] ?? '') ?: null, !empty($item['plain'])) ?>
        </p>
        <p class="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-moss sm:text-sm"><?= e($item['label']) ?></p>
      </div>
    <?php endforeach; ?>
  </div>
</section>

<!-- Comment ça marche : 3 étapes interactives -->
<section class="relative bg-paper">
  <?= island('StepsTimeline', [
      'heading' => ['eyebrow' => t('home.steps.eyebrow'), 'title' => t('home.steps.title'), 'subtitle' => t('home.steps.subtitle')],
      'items' => tr('home.steps.short'),
      'mock' => tr('home.steps.mock'),
      'cta' => t('home.steps.cta'),
  ], '<div class="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">' . section_heading(t('home.steps.eyebrow'), t('home.steps.title'), t('home.steps.subtitle')) . '</div>') ?>
</section>

<!-- Le bac bleu se remplit : minimum 10 items -->
<?= island('BinSection', ['labels' => tr('home.hero.bin'), 'cta' => t('home.hero.ctaPrimary')], '<div class="min-h-[100svh] bg-paper"></div>') ?>

<!-- Destruction des données -->
<?= island('DataDestruction', ['labels' => tr('home.destruction')], '<div class="min-h-[100svh] bg-ink"></div>') ?>

<!-- Zones desservies -->
<section class="relative overflow-hidden bg-sand py-16 sm:py-24">
  <div class="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12">
    <div class="lg:col-span-5"<?= reveal() ?>>
      <p class="text-sm font-semibold text-emerald"><?= te('home.zones.eyebrow') ?></p>
      <h2 class="mt-3 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-ink sm:text-4xl lg:text-[2.75rem]"><?= te('home.zones.title') ?></h2>
      <p class="mt-4 text-base leading-relaxed text-moss sm:text-lg"><?= te('home.zones.desc') ?></p>
      <a href="<?= e(path('/contact')) ?>" class="mt-6 inline-flex items-start gap-2 text-sm font-semibold text-ink underline decoration-emerald/50 underline-offset-4 transition-colors hover:text-emerald">
        <?= icon('MapPin', 'mt-0.5 h-4 w-4 shrink-0 text-emerald') ?><?= te('home.zones.addressNote') ?>
      </a>
    </div>
    <div class="lg:col-span-7"<?= reveal(0.1) ?>>
      <ul class="grid grid-cols-2 gap-3 sm:gap-4">
        <?php foreach ($regions as $i => $region): ?>
          <li class="flex h-28 flex-col justify-between rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1 sm:h-32 <?= $i === 0 ? 'bg-ink text-paper' : 'bg-paper text-ink' ?>">
            <span class="flex h-9 w-9 items-center justify-center rounded-full <?= $i === 0 ? 'bg-lime text-ink' : 'bg-sand text-emerald' ?>"><?= icon('MapPin', 'h-4 w-4') ?></span>
            <span class="font-display text-lg font-bold leading-tight sm:text-xl"><?= e($region) ?></span>
          </li>
        <?php endforeach; ?>
      </ul>
    </div>
  </div>
  <div class="mt-12"><?= cities_marquee(t('home.zones.marqueeLabel')) ?></div>
</section>

<!-- Rien n'est perdu : ramasser, détruire, recycler -->
<section data-theme="dark" class="relative py-20 text-mist sm:py-28">
  <div class="mx-auto w-full max-w-6xl px-5 sm:px-8">
    <div class="max-w-2xl"<?= reveal() ?>>
      <h2 class="font-display text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[1.02] tracking-[-0.03em] text-mist"><?= e($flow['title']) ?></h2>
      <p class="mt-4 text-base leading-relaxed text-moss sm:text-lg"><?= e($flow['text']) ?></p>
    </div>
    <ol class="mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
      <?php foreach ($flow['items'] as $i => $item): $v = $flowVisuals[$i] ?? null; ?>
        <li class="relative">
          <div class="group h-full"<?= reveal($i * 0.12) ?>>
            <div class="flex h-full flex-col overflow-hidden rounded-3xl bg-surface transition-colors duration-300 hover:bg-surface-2">
              <div class="relative flex h-48 items-center justify-center sm:h-56">
                <span aria-hidden="true" class="absolute bottom-7 left-1/2 h-4 w-1/2 -translate-x-1/2 rounded-[50%] bg-black/50 blur-md"></span>
                <?php if ($v): ?>
                  <div class="relative <?= $v[3] ?> transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-105">
                    <img src="<?= $v[0] ?>" alt="" width="<?= $v[1] ?>" height="<?= $v[2] ?>" loading="lazy" decoding="async" class="mx-auto h-auto max-h-40 w-auto object-contain sm:max-h-44">
                  </div>
                <?php endif; ?>
              </div>
              <div class="flex flex-1 items-start gap-4 p-6 pt-2">
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime font-display text-sm font-bold text-ink"><?= $i + 1 ?></span>
                <div>
                  <h3 class="font-display text-xl font-bold leading-snug text-mist"><?= e($item['title']) ?></h3>
                  <p class="mt-1.5 text-sm leading-relaxed text-moss sm:text-base"><?= e($item['text']) ?></p>
                </div>
              </div>
            </div>
          </div>
          <?php if ($i < count($flow['items']) - 1): ?>
            <span aria-hidden="true" class="absolute -right-[26px] top-24 z-10 hidden h-8 w-8 items-center justify-center rounded-full bg-lime text-ink md:flex"><?= icon('ArrowRight', 'h-4 w-4') ?></span>
          <?php endif; ?>
        </li>
      <?php endforeach; ?>
    </ol>
  </div>
</section>

<!-- Services -->
<section class="relative bg-paper py-16 sm:py-24">
  <?= services_grid(['eyebrow' => t('home.servicesSection.eyebrow'), 'title' => t('home.servicesSection.title'), 'subtitle' => t('home.servicesSection.subtitle')]) ?>
</section>

<!-- CTA final plein écran -->
<section data-theme="green" class="relative isolate flex min-h-[80vh] items-center overflow-hidden py-20 sm:py-24" style="background-color:var(--color-vivid-deep)">
  <div class="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-12">
    <div class="order-2 text-center lg:order-1 lg:col-span-7 lg:text-left"<?= reveal() ?>>
      <h2 class="font-display text-[clamp(2.2rem,5.4vw,4rem)] font-bold leading-[1.08] text-mist">
        <?= te('home.finalCta.title') ?><br><span class="text-paper"><?= te('home.finalCta.subtitle') ?></span>
      </h2>
      <div class="mt-10 flex flex-col items-center gap-5 sm:flex-row lg:items-center">
        <?= magnetic(primary_button(path('/formulaire-de-ramassage'), t('home.finalCta.button'), 'px-10 py-5 text-lg sm:whitespace-nowrap'), 0.25) ?>
        <a href="<?= e(SITE['phoneHref']) ?>" class="font-display text-base font-semibold text-mist transition-colors hover:text-emerald sm:whitespace-nowrap"><?= te('common.orCallUs') ?> <?= e(SITE['phoneDisplay']) ?></a>
      </div>
    </div>
    <div class="order-1 lg:order-2 lg:col-span-5">
      <?= island('ClosingBin', [], '<div class="aspect-square"></div>') ?>
    </div>
  </div>
</section>
<?php return [
    'content' => ob_get_clean(),
    'meta' => page_meta('home', '/'),
];
