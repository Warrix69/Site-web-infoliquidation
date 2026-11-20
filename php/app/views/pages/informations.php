<?php
/** Port de src/app/[locale]/informations/page.tsx */
$t = fn(string $k, array $v = []) => te("informations.$k", $v);
$batteriesStats = tr('informations.batteriesStats') ?? [];
$banner = '<blockquote class="glass mt-8 max-w-3xl rounded-2xl border-s-4 border-s-emerald px-6 py-5 font-display text-lg font-semibold leading-relaxed text-mist sm:text-xl">'
    . $t('banner') . '</blockquote>';
ob_start(); ?>
<?= page_hero(t('informations.eyebrow'), t('informations.title'), null, ['kind' => 'photo', 'src' => '/images/centre/matieres.webp'], 'default', $banner) ?>

<?php /* Pourquoi recycler */ ?>
<?= section_open('pt-0') ?>
  <div class="mx-auto max-w-3xl"<?= reveal() ?>>
    <h2 class="font-display text-3xl font-bold text-mist"><?= $t('whyTitle') ?></h2>
    <p class="mt-5 leading-relaxed text-moss"><?= $t('whyP1') ?></p>
    <p class="mt-4 leading-relaxed text-moss"><?= $t('whyP2') ?></p>
  </div>
<?= section_close() ?>

<?php /* Le recyclage des piles */ ?>
<?= section_open('bg-surface/30') ?>
  <?= section_heading(t('informations.eyebrow'), t('informations.batteriesTitle'), null, 'left', 'mb-10') ?>
  <div class="grid gap-10 lg:grid-cols-2 lg:gap-16">
    <div<?= reveal() ?>>
      <p class="leading-relaxed text-moss"><?= $t('batteriesP1') ?></p>
      <p class="mt-4 leading-relaxed text-moss"><?= $t('batteriesP2') ?></p>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <?php foreach ($batteriesStats as $i => $stat): ?>
      <div<?= reveal($i * 0.08) ?>>
        <div class="glass h-full rounded-2xl p-5 text-center">
          <p class="font-display text-3xl font-bold text-gradient">
            <?= counter($stat['value'], $stat['suffix'] ?? null) ?>
          </p>
          <p class="mt-2 text-xs leading-snug text-moss sm:text-sm"><?= e($stat['label']) ?></p>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
<?= section_close() ?>

<?php /* Que deviennent vos produits ? */ ?>
<?= section_open() ?>
  <?= section_heading(null, t('informations.productsTitle'), null, 'center', 'mb-12') ?>
  <div class="grid gap-6 md:grid-cols-2">
    <div<?= reveal() ?>>
      <div class="glass h-full rounded-3xl p-7 sm:p-8">
        <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald">
          <?= icon('PackageSearch', 'h-6 w-6') ?>
        </span>
        <h3 class="mt-4 font-display text-xl font-bold text-mist"><?= $t('collectTitle') ?></h3>
        <p class="mt-3 leading-relaxed text-moss"><?= $t('collectText') ?></p>
      </div>
    </div>
    <div<?= reveal(0.12) ?>>
      <div class="glass h-full rounded-3xl p-7 sm:p-8">
        <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald">
          <?= icon('ShieldCheck', 'h-6 w-6') ?>
        </span>
        <h3 class="mt-4 font-display text-xl font-bold text-mist"><?= $t('dataTitle') ?></h3>
        <p class="mt-3 leading-relaxed text-moss"><?= $t('dataText') ?></p>
      </div>
    </div>
  </div>
<?= section_close() ?>

<?= cta_banner(t('informations.ctaTitle'), t('informations.ctaText')) ?>
<?php return [
    'content' => ob_get_clean(),
    'meta' => page_meta('informations', '/informations'),
];
