<?php
/** Port de src/app/[locale]/a-propos/page.tsx */
$t = fn(string $k, array $v = []) => te("about.$k", $v);
ob_start(); ?>
<?= page_hero(t('about.eyebrow'), t('about.title'), null, ['kind' => 'photo', 'src' => '/images/centre/allee.webp']) ?>

<?= section_open('pt-0') ?>
  <div class="grid gap-8 lg:grid-cols-5">
    <?php /* Fondateur */ ?>
    <div class="lg:col-span-2"<?= reveal() ?>>
      <div class="glass relative h-full overflow-hidden rounded-3xl p-7 sm:p-8">
        <div aria-hidden="true" class="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald/15 blur-2xl"></div>
        <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-accent text-ink shadow-glow">
          <?= icon('UserRound', 'h-7 w-7') ?>
        </span>
        <h2 class="mt-5 font-display text-2xl font-bold text-mist"><?= $t('founderName') ?></h2>
        <p class="mt-1 text-sm font-semibold uppercase tracking-[0.14em] text-emerald"><?= $t('founderRole') ?></p>
        <p class="mt-5 leading-relaxed text-moss"><?= $t('founderText') ?></p>
        <p class="mt-6 border-t border-line pt-5 text-sm text-moss">
          <?= icon('Award', 'mb-0.5 me-2 inline h-4 w-4 text-emerald') ?>
          Info Liquidation Recycle · <?= e(SITE['foundedYear']) ?>
        </p>
      </div>
    </div>

    <?php /* Entreprise + mission */ ?>
    <div class="space-y-8 lg:col-span-3">
      <div<?= reveal(0.1) ?>>
        <div class="glass rounded-3xl p-7 sm:p-8">
          <h2 class="font-display text-2xl font-bold text-mist"><?= $t('companyTitle') ?></h2>
          <p class="mt-4 leading-relaxed text-moss"><?= $t('p1') ?></p>
          <p class="mt-4 leading-relaxed text-moss"><?= $t('p2') ?></p>
        </div>
      </div>
      <div<?= reveal(0.2) ?>>
        <div class="glass relative overflow-hidden rounded-3xl p-7 sm:p-8">
          <div aria-hidden="true" class="absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-lime/10 blur-2xl"></div>
          <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-soft text-emerald">
            <?= icon('Recycle', 'h-6 w-6') ?>
          </span>
          <h2 class="mt-4 font-display text-2xl font-bold text-mist"><?= $t('missionTitle') ?></h2>
          <p class="mt-4 leading-relaxed text-moss"><?= $t('p3') ?></p>
          <p class="mt-4 leading-relaxed text-moss"><?= $t('p4') ?></p>
        </div>
      </div>
    </div>
  </div>
<?= section_close() ?>

<?= cta_banner(t('about.ctaTitle'), t('about.ctaText')) ?>
<?php return [
    'content' => ob_get_clean(),
    'meta' => page_meta('about', '/a-propos'),
];
