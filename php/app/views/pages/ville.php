<?php
/** Port de src/app/[locale]/[ville]/page.tsx — la ville est validée par resolve_route(). */
$ville = $params['ville'];
$city = get_city($ville);
$t = fn($k, $v = []) => t("city.$k", $v);
$cityName = $city[locale()];
$regionLabel = $t("regionLabels.{$city['region']}");
$steps = tr('home.steps.items') ?? [];

$serviceJsonLd = [
    '@context' => 'https://schema.org',
    '@type' => 'Service',
    'serviceType' => locale() === 'fr' ? 'Recyclage informatique et électronique' : 'Computer and electronic recycling',
    'provider' => ['@type' => 'LocalBusiness', 'name' => SITE['legalName'], 'telephone' => '+1-450-473-4636'],
    'areaServed' => ['@type' => 'City', 'name' => $cityName],
    'url' => SITE_URL . path('/[ville]', ['ville' => $ville]),
];

$otherCities = array_filter(CITIES, fn($c) => $c['slug'] !== $ville);
$chip = 'glass-light inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-mist/90';

ob_start(); ?>
<p class="mt-6 max-w-2xl text-base leading-relaxed text-moss sm:text-lg"><?= e($t('intro', ['city' => $cityName])) ?></p>
<div class="mt-6 flex flex-wrap gap-3">
  <span class="<?= $chip ?>"><?= icon('MapPin', 'h-3.5 w-3.5 text-emerald') ?><?= e($regionLabel) ?></span>
  <span class="<?= $chip ?>"><?= icon('CheckCircle2', 'h-3.5 w-3.5 text-emerald') ?><?= e($t('minNote')) ?></span>
  <?php if ($city['region'] === 'rive-sud'): ?>
    <span class="<?= $chip ?>"><?= e($t('southShoreNote')) ?></span>
  <?php endif; ?>
</div>
<?php $heroChildren = ob_get_clean();

ob_start(); ?>
<?= page_hero($t('eyebrow') . ' · ' . $regionLabel, $t('title', ['city' => $cityName]), null, ['kind' => 'photo', 'src' => '/images/centre/allee.webp'], 'default', $heroChildren) ?>

<?= section_open('pt-0') ?>
  <div class="grid gap-10 lg:grid-cols-2 lg:gap-16">
    <div<?= reveal() ?>>
      <h2 class="font-display text-2xl font-bold text-mist sm:text-3xl"><?= e($t('whatTitle', ['city' => $cityName])) ?></h2>
      <p class="mt-4 leading-relaxed text-moss"><?= e($t('whatText', ['city' => $cityName])) ?></p>
      <div class="mt-6 grid grid-cols-3 gap-4">
        <?php foreach ([[24, 'h'], [72, 'h'], [0, '$']] as [$value, $suffix]): ?>
          <div class="glass rounded-2xl p-4 text-center">
            <p class="font-display text-2xl font-bold text-gradient sm:text-3xl"><?= counter($value, $suffix) ?></p>
          </div>
        <?php endforeach; ?>
      </div>
    </div>

    <div<?= reveal(0.12) ?>>
      <div class="glass rounded-3xl p-7 sm:p-8">
        <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-accent text-ink shadow-glow"><?= icon('Building2', 'h-6 w-6') ?></span>
        <h2 class="mt-4 font-display text-xl font-bold text-mist"><?= e($t('servicesTitle', ['city' => $cityName])) ?></h2>
        <ul class="mt-4 grid gap-2">
          <?php foreach (SERVICES as $s): ?>
            <li>
              <a href="<?= e(path($s['route'])) ?>" class="group flex items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm text-mist/90 transition-colors hover:bg-emerald-soft hover:text-emerald">
                <?= te("services.{$s['key']}.title") ?>
                <?= icon('ArrowUpRight', 'h-4 w-4 shrink-0 text-emerald opacity-0 transition-opacity group-hover:opacity-100') ?>
              </a>
            </li>
          <?php endforeach; ?>
        </ul>
      </div>
    </div>
  </div>
<?= section_close() ?>

<?= section_open('bg-surface/30') ?>
  <?= section_heading(null, $t('howTitle'), null, 'center', 'mb-12') ?>
  <div class="grid gap-6 md:grid-cols-3">
    <?php foreach ($steps as $i => $step): ?>
      <div<?= reveal($i * 0.1) ?>>
        <div class="glass h-full rounded-3xl p-6 sm:p-7">
          <span class="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-accent font-display text-lg font-bold text-ink shadow-glow"><?= $i + 1 ?></span>
          <h3 class="mt-4 font-display text-lg font-bold text-mist"><?= e($step['title']) ?></h3>
          <p class="mt-2 text-sm leading-relaxed text-moss"><?= e($step['desc']) ?></p>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
<?= section_close() ?>

<?= section_open() ?>
  <?= section_heading(null, $t('otherCities'), null, 'center', 'mb-8') ?>
  <div<?= reveal() ?>>
    <ul class="flex flex-wrap justify-center gap-3">
      <?php foreach ($otherCities as $other): ?>
        <li>
          <a href="<?= e(path('/[ville]', ['ville' => $other['slug']])) ?>" class="glass-light inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-mist/90 transition-colors hover:border-emerald/40 hover:text-emerald">
            <?= icon('MapPin', 'h-3.5 w-3.5 text-emerald') ?><?= e($other[locale()]) ?>
          </a>
        </li>
      <?php endforeach; ?>
    </ul>
  </div>
<?= section_close() ?>

<?= cta_banner($t('ctaTitle', ['city' => $cityName]), $t('ctaText')) ?>
<?php return [
    'content' => ob_get_clean(),
    'meta' => page_meta('city', '/[ville]', ['ville' => $ville], ['city' => $cityName]),
    'jsonLd' => [$serviceJsonLd],
];
