<?php
/** Port de src/app/[locale]/recyclage-ordinateur/page.tsx */
$t = fn($k, $v = []) => t("svcComputer.$k", $v);
$deeeItems = tr('svcComputer.deeeItems') ?? [];
$faq = tr('svcComputer.faq') ?? [];
$alt = locale() === 'fr'
    ? 'Ordinateurs portables en attente de recyclage avec certificat de destruction'
    : 'Laptops awaiting recycling with destruction certificate';

ob_start(); ?>
<?= page_hero($t('eyebrow'), $t('title'), $t('intro'), ['kind' => 'object', 'src' => '/images/bac/portable.webp', 'width' => 86]) ?>

<?= section_open('pt-0 overflow-x-clip') ?>
  <div class="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
    <div<?= reveal() ?>>
      <h2 class="font-display text-2xl font-bold text-mist sm:text-3xl"><?= e($t('whyTitle')) ?></h2>
      <p class="mt-4 leading-relaxed text-moss"><?= e($t('whyText')) ?></p>

      <h2 class="mt-10 font-display text-2xl font-bold text-mist sm:text-3xl"><?= e($t('deeeTitle')) ?></h2>
      <p class="mt-4 leading-relaxed text-moss"><?= e($t('deeeText')) ?></p>
      <ul class="mt-5 flex flex-wrap gap-2.5">
        <?php foreach ($deeeItems as $item): ?>
          <li class="glass-light inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-mist/90">
            <?= icon('CircleSlash', 'h-3.5 w-3.5 text-emerald') ?><?= e($item) ?>
          </li>
        <?php endforeach; ?>
      </ul>
    </div>

    <div<?= reveal(0.15) ?>>
      <div class="relative">
        <div aria-hidden="true" class="absolute -inset-6 rounded-[2rem] bg-emerald/10 blur-2xl"></div>
        <img src="/images/ordinateurs-portables-recyclage.jpg" alt="<?= e($alt) ?>" width="800" height="534" loading="lazy" decoding="async" class="relative w-full rounded-3xl border border-line object-cover">
      </div>
      <div class="glass mt-8 rounded-3xl p-7">
        <h2 class="font-display text-xl font-bold text-mist"><?= e($t('howTitle')) ?></h2>
        <p class="mt-3 leading-relaxed text-moss"><?= e($t('howText')) ?></p>
        <h3 class="mt-6 font-display text-sm font-bold uppercase tracking-[0.14em] text-emerald"><?= e($t('zonesTitle')) ?></h3>
        <div class="mt-3"><?= zone_chips() ?></div>
      </div>
    </div>
  </div>
<?= section_close() ?>

<?= section_open('bg-surface/30') ?>
  <?= section_heading(null, $t('benefitsTitle'), $t('benefitsIntro'), 'center', 'mb-12') ?>
  <div class="grid gap-6 md:grid-cols-2">
    <div<?= reveal() ?>>
      <div class="glass h-full rounded-3xl p-7 sm:p-8">
        <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald"><?= icon('Leaf', 'h-6 w-6') ?></span>
        <h3 class="mt-4 font-display text-xl font-bold text-mist"><?= e($t('benefit1Title')) ?></h3>
        <p class="mt-3 leading-relaxed text-moss"><?= e($t('benefit1Text')) ?></p>
      </div>
    </div>
    <div<?= reveal(0.12) ?>>
      <div class="glass h-full rounded-3xl p-7 sm:p-8">
        <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald"><?= icon('Briefcase', 'h-6 w-6') ?></span>
        <h3 class="mt-4 font-display text-xl font-bold text-mist"><?= e($t('benefit2Title')) ?></h3>
        <p class="mt-3 leading-relaxed text-moss"><?= e($t('benefit2Text')) ?></p>
      </div>
    </div>
  </div>
<?= section_close() ?>

<?= section_open() ?>
  <?= section_heading(null, $t('faqTitle'), null, 'center', 'mb-10') ?>
  <div class="mx-auto max-w-3xl"><?= accordion($faq) ?></div>
<?= section_close() ?>

<?= cta_banner($t('ctaTitle'), $t('ctaText')) ?>
<?php return [
    'content' => ob_get_clean(),
    'meta' => page_meta('computer', '/recyclage-ordinateur'),
];
