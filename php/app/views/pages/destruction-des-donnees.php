<?php
/** Port de src/app/[locale]/destruction-des-donnees/page.tsx */
$t = fn($k, $v = []) => t("svcData.$k", $v);
$standards = tr('svcData.standards') ?? [];
$alt = locale() === 'fr'
    ? "Destruction physique d'un disque dur pour protéger les données"
    : 'Physical destruction of a hard drive to protect data';

ob_start(); ?>
<?= page_hero($t('eyebrow'), $t('title'), $t('intro'), ['kind' => 'object', 'src' => '/images/bac/ecran.webp', 'width' => 70]) ?>

<?= section_open('pt-0 overflow-x-clip') ?>
  <div class="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
    <div<?= reveal() ?>>
      <p class="leading-relaxed text-moss"><?= e($t('p1')) ?></p>
      <p class="mt-4 leading-relaxed text-moss"><?= e($t('p2')) ?></p>
      <p class="mt-4 leading-relaxed text-moss"><?= e($t('p3')) ?></p>

      <p class="mt-8 text-sm font-semibold uppercase tracking-[0.14em] text-emerald"><?= e($t('standardsLabel')) ?></p>
      <div class="mt-4 flex flex-wrap gap-3">
        <?php foreach ($standards as $standard): ?>
          <span class="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display text-sm font-bold text-mist">
            <?= icon('ShieldCheck', 'h-4 w-4 text-emerald') ?><?= e($standard) ?>
          </span>
        <?php endforeach; ?>
      </div>
    </div>

    <div class="space-y-8">
      <div<?= reveal(0.1) ?>>
        <div class="relative">
          <div aria-hidden="true" class="absolute -inset-6 rounded-[2rem] bg-emerald/10 blur-2xl"></div>
          <img src="/images/destruction-disque-dur.jpg" alt="<?= e($alt) ?>" width="1920" height="800" loading="lazy" decoding="async" class="relative aspect-[16/9] w-full rounded-3xl border border-line object-cover">
        </div>
      </div>

      <div<?= reveal(0.2) ?>>
        <aside class="glass relative overflow-hidden rounded-3xl border-s-4 border-s-lime p-7">
          <div aria-hidden="true" class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-lime/10 blur-2xl"></div>
          <p class="inline-flex items-center gap-2 font-display text-lg font-bold text-mist">
            <?= icon('AlertTriangle', 'h-5 w-5 text-lime') ?><?= e($t('knowTitle')) ?>
          </p>
          <p class="mt-3 text-sm leading-relaxed text-moss sm:text-base"><?= e($t('knowText')) ?></p>
        </aside>
      </div>
    </div>
  </div>
<?= section_close() ?>

<?= cta_banner($t('ctaTitle'), $t('ctaText')) ?>
<?php return [
    'content' => ob_get_clean(),
    'meta' => page_meta('data', '/destruction-des-donnees'),
];
