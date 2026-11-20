<?php
/** Port de src/app/[locale]/procedure-de-recuperation/page.tsx */
$t = fn($k, $v = []) => t("svcProcedure.$k", $v);
$blocks = tr('svcProcedure.blocks') ?? [];
$blockIcons = ['Tv', 'Monitor', 'Cpu'];

ob_start(); ?>
<?= page_hero($t('eyebrow'), $t('title'), $t('intro'), ['kind' => 'photo', 'src' => '/images/centre/allee.webp']) ?>

<?= section_open('pt-0') ?>
  <div class="space-y-6">
    <?php foreach ($blocks as $i => $block): ?>
      <div<?= reveal($i * 0.08) ?>>
        <article class="glass relative overflow-hidden rounded-3xl p-7 sm:p-9">
          <div aria-hidden="true" class="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-emerald/10 blur-2xl"></div>
          <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
            <span class="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-accent text-ink shadow-glow"><?= icon($blockIcons[$i] ?? 'Cpu', 'h-7 w-7') ?></span>
            <div>
              <h2 class="font-display text-2xl font-bold text-mist"><?= e($block['title']) ?></h2>
              <p class="mt-3 leading-relaxed text-moss"><?= e($block['text']) ?></p>
            </div>
          </div>
        </article>
      </div>
    <?php endforeach; ?>
  </div>
<?= section_close() ?>

<?= cta_banner($t('ctaTitle'), $t('ctaText')) ?>
<?php return [
    'content' => ob_get_clean(),
    'meta' => page_meta('procedure', '/procedure-de-recuperation'),
];
