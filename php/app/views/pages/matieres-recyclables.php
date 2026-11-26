<?php
/** Port de src/app/[locale]/matieres-recyclables/page.tsx */
$t = fn($k, $v = []) => t("svcMaterials.$k", $v);
$categories = tr('svcMaterials.categories') ?? [];
$faq = tr('svcMaterials.faq') ?? [];
$categoryIcons = ['Cpu', 'Monitor', 'PhoneCall', 'BatteryCharging', 'Cable'];
$alt = locale() === 'fr'
    ? 'Symbole de recyclage composé de circuits imprimés'
    : 'Recycling symbol made of printed circuit boards';

ob_start(); ?>
<?= page_hero($t('eyebrow'), $t('title'), $t('intro'), ['kind' => 'photo', 'src' => '/images/centre/matieres.webp']) ?>

<?= section_open('pt-0') ?>
  <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    <?php foreach ($categories as $i => $category):
        $iconName = $categoryIcons[$i] ?? 'Cpu';
        ob_start(); ?>
        <div class="glass flex h-full flex-col rounded-3xl p-6 sm:p-7">
          <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald"><?= icon($iconName, 'h-6 w-6') ?></span>
          <h2 class="mt-4 font-display text-lg font-bold leading-snug text-mist"><?= e($category['title']) ?></h2>
          <p class="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-emerald"><?= e($t('examplesLabel')) ?></p>
          <ul class="mt-2 space-y-1.5">
            <?php foreach ($category['examples'] as $example): ?>
              <li class="flex items-start gap-2 text-sm text-moss"><?= icon('Check', 'mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald') ?><?= e($example) ?></li>
            <?php endforeach; ?>
          </ul>
        </div>
        <?php $card = ob_get_clean(); ?>
      <div<?= reveal(min($i * 0.08, 0.4)) ?>><?= tilt_card($card, 'h-full rounded-3xl') ?></div>
    <?php endforeach; ?>

    <div<?= reveal(0.4) ?>>
      <div class="glass flex h-full flex-col items-center justify-center gap-4 rounded-3xl p-6 text-center">
        <?php $listeV = image_variants('/images/liste-matieres.png'); /* WebP 500 px généré au build, sinon le PNG */ ?>
        <img src="<?= e($listeV ? image_variant_url('/images/liste-matieres.png', $listeV[3][0], $listeV[2]) : '/images/liste-matieres.png') ?>" alt="<?= e($alt) ?>" width="220" height="190" loading="lazy" decoding="async" class="h-auto w-44">
        <p class="text-sm leading-relaxed text-moss"><?= e($t('note')) ?></p>
      </div>
    </div>
  </div>
<?= section_close() ?>

<?= section_open('bg-surface/30') ?>
  <?= section_heading(null, $t('faqTitle'), null, 'center', 'mb-10') ?>
  <div class="mx-auto max-w-3xl"><?= accordion($faq) ?></div>
<?= section_close() ?>

<?= cta_banner($t('ctaTitle'), $t('ctaText')) ?>
<?php return [
    'content' => ob_get_clean(),
    'meta' => page_meta('materials', '/matieres-recyclables'),
];
