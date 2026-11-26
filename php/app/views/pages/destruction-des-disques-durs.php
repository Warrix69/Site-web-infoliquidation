<?php
/** Port de src/app/[locale]/destruction-des-disques-durs/page.tsx */
$t = fn($k, $v = []) => t("svcHardDrives.$k", $v);
$bullets = tr('svcHardDrives.whyBullets') ?? [];
$steps = tr('svcHardDrives.steps') ?? [];
$faq = tr('svcHardDrives.faq') ?? [];
$alt = locale() === 'fr' ? 'Destruction de disques durs sur place' : 'On-site hard drive destruction';

ob_start(); ?>
<?= page_hero($t('eyebrow'), $t('title'), null, ['kind' => 'object', 'src' => '/images/bac/disque-dur.webp', 'width' => 80]) ?>

<?= section_open('pt-0 overflow-x-clip') ?>
  <div class="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
    <div<?= reveal() ?>>
      <h2 class="font-display text-2xl font-bold text-mist sm:text-3xl"><?= e($t('whyTitle')) ?></h2>
      <p class="mt-4 leading-relaxed text-moss"><?= e($t('whyP1')) ?></p>
      <p class="mt-4 leading-relaxed text-moss"><?= e($t('whyP2')) ?></p>
      <ul class="mt-6 space-y-3">
        <?php foreach ($bullets as $bullet): ?>
          <li class="flex items-start gap-3 text-sm text-mist/90 sm:text-base"><?= icon('CheckCircle2', 'mt-0.5 h-5 w-5 shrink-0 text-emerald') ?><?= e($bullet) ?></li>
        <?php endforeach; ?>
      </ul>

      <h2 class="mt-10 font-display text-2xl font-bold text-mist sm:text-3xl"><?= e($t('whereTitle')) ?></h2>
      <p class="mt-4 leading-relaxed text-moss"><?= e($t('whereText')) ?></p>
    </div>

    <div<?= reveal(0.15) ?>>
      <div class="relative">
        <div aria-hidden="true" class="absolute -inset-6 rounded-[2rem] bg-emerald/10 blur-2xl"></div>
        <img src="/images/destruction-disque-dur.jpg" alt="<?= e($alt) ?>" width="1920" height="800" loading="lazy" decoding="async" class="relative aspect-[16/10] w-full rounded-3xl border border-line object-cover">
      </div>
    </div>
  </div>
<?= section_close() ?>

<?= section_open('bg-surface/30') ?>
  <?= section_heading(null, $t('methodsTitle'), null, 'center', 'mb-12') ?>
  <div class="grid gap-6 md:grid-cols-2">
    <div<?= reveal() ?>>
      <div class="glass h-full rounded-3xl p-7 sm:p-8">
        <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald"><?= icon('Scissors', 'h-6 w-6') ?></span>
        <h3 class="mt-4 font-display text-xl font-bold text-mist"><?= e($t('method1Title')) ?></h3>
        <p class="mt-3 leading-relaxed text-moss"><?= e($t('method1Text')) ?></p>
      </div>
    </div>
    <div<?= reveal(0.12) ?>>
      <div class="glass h-full rounded-3xl p-7 sm:p-8">
        <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald"><?= icon('Hammer', 'h-6 w-6') ?></span>
        <h3 class="mt-4 font-display text-xl font-bold text-mist"><?= e($t('method2Title')) ?></h3>
        <p class="mt-3 leading-relaxed text-moss"><?= e($t('method2Text')) ?></p>
      </div>
    </div>
  </div>
<?= section_close() ?>

<?= section_open() ?>
  <?= section_heading(null, $t('stepsTitle'), null, 'center', 'mb-12') ?>
  <ol class="relative mx-auto max-w-3xl space-y-6 before:absolute before:bottom-6 before:start-6 before:top-6 before:w-px before:bg-gradient-to-b before:from-emerald/60 before:via-lime/40 before:to-emerald/10">
    <?php foreach ($steps as $i => $step): ?>
      <li class="relative">
        <div class="flex gap-6"<?= reveal($i * 0.08) ?>>
          <span class="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-accent font-display text-lg font-bold text-ink shadow-glow"><?= $i + 1 ?></span>
          <div class="glass flex-1 rounded-2xl p-5 sm:p-6">
            <h3 class="font-display text-lg font-bold text-mist"><?= e($step['title']) ?></h3>
            <p class="mt-2 text-sm leading-relaxed text-moss sm:text-base"><?= e($step['text']) ?></p>
          </div>
        </div>
      </li>
    <?php endforeach; ?>
  </ol>
<?= section_close() ?>

<?= section_open('bg-surface/30') ?>
  <?= section_heading(null, $t('faqTitle'), null, 'center', 'mb-10') ?>
  <div class="mx-auto max-w-3xl"><?= accordion($faq) ?></div>
<?= section_close() ?>

<?= cta_banner($t('ctaTitle'), $t('ctaText')) ?>
<?php return [
    'content' => ob_get_clean(),
    'meta' => page_meta('hardDrives', '/destruction-des-disques-durs'),
];
