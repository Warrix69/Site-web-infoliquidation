<?php
/** Port de src/app/[locale]/politique-de-temoins/page.tsx */
$sections = tr('cookies.sections') ?? [];
ob_start(); ?>
<?= page_hero(t('cookies.eyebrow'), t('cookies.title'), t('cookies.intro')) ?>
<?= section_open('pt-0') ?>
  <div class="mx-auto max-w-3xl">
    <?php foreach ($sections as $i => $s): ?>
    <div class="mt-8 first:mt-0"<?= reveal(0.05 * $i) ?>>
      <h2 class="font-display text-xl font-bold text-mist sm:text-2xl"><?= e($s['h']) ?></h2>
      <p class="mt-3 leading-relaxed text-moss"><?= e($s['p']) ?></p>
    </div>
    <?php endforeach; ?>
  </div>
<?= section_close() ?>
<?php return [
    'content' => ob_get_clean(),
    'meta' => page_meta('cookies', '/politique-de-temoins'),
];
