<?php
/** Port de src/app/[locale]/merci/page.tsx (textes des étapes en dur, comme l'original). */
$steps = [
    ['title' => 'On vous appelle sous 24 h', 'desc' => 'Pour valider votre demande et confirmer la date de ramassage.'],
    ['title' => 'Regroupez le matériel', 'desc' => "À un endroit facile d'accès (entrée, quai, hall)."],
    ['title' => 'Sauvegardez vos données', 'desc' => "On s'occupe de la destruction si vous l'avez demandée."],
    ['title' => 'On ramasse, on part', 'desc' => 'Accueillez notre équipe. Transport gratuit, aucuns frais.'],
    ['title' => 'Certificat par courriel', 'desc' => 'Avec numéros de série, pour la conformité Loi 25.'],
];
ob_start(); ?>
<?php /* Confirmation */ ?>
<?= section_open('pb-10 pt-40') ?>
  <div class="mx-auto max-w-2xl text-center">
    <div<?= reveal() ?>>
      <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-soft">
        <?= icon('CheckCircle2', 'h-10 w-10 text-emerald') ?>
      </div>
      <p class="mt-6 font-manifest text-xs uppercase tracking-[0.22em] text-emerald">Demande reçue</p>
      <h1 class="mt-4 font-display text-4xl font-bold leading-tight text-ink sm:text-5xl"><?= te('merci.title') ?></h1>
      <p class="mt-5 text-lg leading-relaxed text-moss"><?= te('merci.intro') ?></p>
      <p class="mt-3 text-base leading-relaxed text-moss"><?= te('merci.next') ?></p>
    </div>
  </div>
<?= section_close() ?>

<?php /* Étapes qui suivent — fond vert très doux pour l'emphase */ ?>
<section class="relative overflow-hidden bg-emerald-soft py-16 sm:py-20">
  <div class="mx-auto w-full max-w-6xl px-5 sm:px-8">
    <div class="mb-10 text-center"<?= reveal() ?>>
      <p class="font-manifest text-xs uppercase tracking-[0.22em] text-emerald">La suite</p>
      <h2 class="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">Ce qui se passe maintenant</h2>
      <p class="mt-4 text-base leading-relaxed text-moss">Pour accélérer le ramassage et éviter tout tracas le jour J, voici les 5 étapes clés.</p>
    </div>

    <?php /* Grille horizontale : 5 étapes, de gauche à droite */ ?>
    <ol class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
      <?php foreach ($steps as $i => $step): ?>
      <div<?= reveal($i * 0.05) ?>>
        <li class="flex h-full flex-col rounded-3xl bg-paper p-6 sm:p-7">
          <span aria-hidden="true" class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald font-display text-lg font-bold text-paper"><?= $i + 1 ?></span>
          <h3 class="mt-6 font-display text-lg font-bold leading-snug text-ink"><?= e($step['title']) ?></h3>
          <p class="mt-2 text-sm leading-relaxed text-moss"><?= e($step['desc']) ?></p>
        </li>
      </div>
      <?php endforeach; ?>
    </ol>
  </div>
</section>

<?php /* Contact + CTAs */ ?>
<?= section_open() ?>
  <div class="mx-auto max-w-6xl">
    <div class="rounded-2xl border border-ink/10 bg-paper p-6 shadow-sm sm:p-8"<?= reveal() ?>>
      <div class="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="font-manifest text-[11px] uppercase tracking-[0.2em] text-emerald">Besoin de nous joindre</p>
          <p class="mt-2 font-display text-xl font-bold text-ink">Nos représentants restent disponibles.</p>
          <p class="mt-1 text-sm text-moss">Lundi au jeudi 8 h – 17 h, vendredi 8 h – 16 h.</p>
        </div>
        <div class="flex flex-col gap-2 sm:items-end">
          <a href="<?= e(SITE['phoneHref']) ?>" class="inline-flex items-center gap-2 font-display text-xl font-bold text-emerald hover:text-lime">
            <?= icon('PhoneCall', 'h-5 w-5') ?>
            <?= e(SITE['phoneDisplay']) ?>
          </a>
          <a href="mailto:<?= e(SITE['email']) ?>" class="text-sm font-semibold text-moss underline decoration-emerald/50 underline-offset-4 hover:text-emerald"><?= e(SITE['email']) ?></a>
        </div>
      </div>
    </div>

    <?php /* CTAs */ ?>
    <div class="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
      <?= primary_button(path('/'), t('merci.home')) ?>
      <?= ghost_button(path('/contact'), t('merci.contact')) ?>
    </div>
  </div>
<?= section_close() ?>
<?php return [
    'content' => ob_get_clean(),
    'meta' => [
        'title' => 'Merci | Info Liquidation Recycle',
        'robots' => 'noindex, follow',
    ],
];
