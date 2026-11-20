<?php
/** Port de src/app/[locale]/recyclage-telephones/page.tsx */
$t = fn($k, $v = []) => t("svcPhones.$k", $v);
$components = tr('svcPhones.components') ?? [];
$reasons = tr('svcPhones.reasons') ?? [];
$faq = tr('svcPhones.faq') ?? [];

ob_start(); ?>
<?= page_hero($t('eyebrow'), $t('title'), $t('intro'), ['kind' => 'object', 'src' => '/images/bac/telephone.webp', 'width' => 84]) ?>

<?= section_open('pt-0') ?>
  <div class="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
    <div<?= reveal() ?>>
      <h2 class="font-display text-2xl font-bold text-mist sm:text-3xl"><?= e($t('componentsTitle')) ?></h2>
      <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <?php foreach ($components as $component): ?>
          <div class="glass rounded-2xl p-4 text-center">
            <p class="font-display text-xl font-bold text-gradient"><?= e($component['value']) ?></p>
            <p class="mt-1 text-xs text-moss sm:text-sm"><?= e($component['name']) ?></p>
          </div>
        <?php endforeach; ?>
      </div>
    </div>

    <div<?= reveal(0.15) ?>>
      <div class="glass relative overflow-hidden rounded-3xl p-7 sm:p-8">
        <div aria-hidden="true" class="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald/15 blur-2xl"></div>
        <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald"><?= icon('Smartphone', 'h-6 w-6') ?></span>
        <h2 class="mt-4 font-display text-xl font-bold text-mist"><?= e($t('reasonsTitle')) ?></h2>
        <ul class="mt-4 space-y-3">
          <?php foreach ($reasons as $reason): ?>
            <li class="flex items-start gap-3 text-sm text-mist/90 sm:text-base"><?= icon('CheckCircle2', 'mt-0.5 h-5 w-5 shrink-0 text-emerald') ?><?= e($reason) ?></li>
          <?php endforeach; ?>
        </ul>
        <h3 class="mt-7 font-display text-sm font-bold uppercase tracking-[0.14em] text-emerald"><?= e($t('zonesTitle')) ?></h3>
        <div class="mt-3"><?= zone_chips() ?></div>
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
    'meta' => page_meta('phones', '/recyclage-telephones'),
];
