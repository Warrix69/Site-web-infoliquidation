<?php
/** Port de src/app/[locale]/contact/page.tsx */
$t = fn($k, $v = []) => t("contact.$k", $v);
$tc = fn($k, $v = []) => t("common.$k", $v);

$labels = [
    'fields' => [
        'name' => $t('fields.name'),
        'email' => $t('fields.email'),
        'phone' => $t('fields.phone'),
        'message' => $t('fields.message'),
    ],
    'errors' => [
        'nameRequired' => $t('errors.nameRequired'),
        'emailInvalid' => $t('errors.emailInvalid'),
        'messageRequired' => $t('errors.messageRequired'),
    ],
    'submit' => $t('submit'),
    'submitting' => $t('submitting'),
    'successTitle' => $t('successTitle'),
    'successText' => $t('successText'),
    'errorTitle' => $t('errorTitle'),
    'errorText' => $t('errorText'),
    // Anti-spam : message quand la même personne envoie trop de fois
    'rateLimitedTitle' => locale() === 'en' ? 'Too many submissions' : "Trop d'envois",
    'rateLimitedText' => locale() === 'en'
        ? 'To protect the site against spam, new submissions are blocked for {minutes} min. You can also call us at ' . SITE['phoneDisplay'] . '.'
        : 'Pour protéger le site contre le pourriel, les envois sont bloqués pendant {minutes} min. Vous pouvez aussi nous appeler au ' . SITE['phoneDisplay'] . '.',
    'newRequest' => $tc('contactUs'),
];

// Initiales du propriétaire (ex. « Éric Després » → « ÉD »)
$initials = '';
foreach (preg_split('/\s+/u', $t('ownerName'), -1, PREG_SPLIT_NO_EMPTY) as $w) $initials .= mb_substr($w, 0, 1);
$initials = mb_strtoupper(mb_substr($initials, 0, 2));

// Le propriétaire (ligne directe), puis l'équipe de l'atelier (ligne principale) ; badge = HTML
$contacts = [
    ['badge' => e($initials), 'name' => $t('ownerName'), 'role' => $t('ownerRole'), 'phone' => SITE['ownerPhoneDisplay'], 'href' => SITE['ownerPhoneHref']],
    ['badge' => icon('Users', 'h-7 w-7'), 'name' => $t('teamName'), 'role' => $t('teamRole'), 'phone' => SITE['phoneDisplay'], 'href' => SITE['phoneHref']],
];

$mapSrc = 'https://www.google.com/maps?q=Info+Liquidation+Recycle+514+Chemin+de+la+Rivi%C3%A8re+Sud+Saint-Eustache&output=embed';

// Contenu affiché avant le montage de l'îlot React
$fallback = '<p class="glass rounded-3xl p-7 text-center text-moss">'
    . '<a href="' . e(SITE['phoneHref']) . '" class="font-display font-semibold text-mist hover:text-emerald">' . e(SITE['phoneDisplay']) . '</a>'
    . ' · <a href="mailto:' . e(SITE['email']) . '" class="font-display font-semibold text-mist [overflow-wrap:anywhere] hover:text-emerald">' . e(SITE['email']) . '</a>'
    . '</p>';

ob_start(); ?>
<?= page_hero($t('eyebrow'), $t('title'), null, ['kind' => 'object', 'src' => '/images/bac/bac-plein.webp', 'width' => 52], 'compact') ?>

<?= section_open('pt-12 sm:pt-16') ?>
  <!-- Grille 2 × 2 : téléphones | formulaire, puis adresse et heures | carte (même cadre que le formulaire) -->
  <div class="grid gap-8 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-8">
    <div class="lg:col-span-5">
      <div<?= reveal() ?>>
        <div data-theme="dark" class="rounded-3xl p-6 text-mist sm:p-8">
          <?php foreach ($contacts as $i => $c): ?>
            <div<?= $i > 0 ? ' class="mt-7 border-t border-white/10 pt-7"' : '' ?>>
              <div class="flex items-center gap-4">
                <span aria-hidden="true" class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-lime font-display text-xl font-extrabold text-ink"><?= $c['badge'] ?></span>
                <div>
                  <p class="font-display text-2xl font-bold leading-tight text-mist"><?= e($c['name']) ?></p>
                  <p class="mt-0.5 text-sm font-semibold text-lime"><?= e($c['role']) ?></p>
                </div>
              </div>

              <a href="<?= e($c['href']) ?>" class="group mt-5 flex items-center justify-between gap-4 rounded-2xl bg-lime px-5 py-4 text-ink transition-colors hover:bg-paper">
                <span>
                  <span class="block text-xs font-bold uppercase tracking-[0.12em] text-ink/70"><?= e($tc('phoneLabel')) ?></span>
                  <span class="mt-0.5 block font-display text-2xl font-bold tracking-[-0.01em] sm:text-3xl"><?= e($c['phone']) ?></span>
                </span>
                <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition-transform group-hover:scale-105"><?= icon('Phone', 'h-5 w-5') ?></span>
              </a>
            </div>
          <?php endforeach; ?>

          <a href="mailto:<?= e(SITE['email']) ?>" class="group mt-3 flex items-center justify-between gap-4 rounded-2xl bg-white/[0.06] px-5 py-4 ring-1 ring-white/10 transition-colors hover:bg-white/[0.1]">
            <span class="min-w-0">
              <span class="block text-xs font-bold uppercase tracking-[0.12em] text-moss"><?= e($tc('emailLabel')) ?></span>
              <span class="mt-0.5 block font-display text-[13px] font-semibold text-mist [overflow-wrap:anywhere] sm:text-base"><?= e(SITE['email']) ?></span>
            </span>
            <?= icon('Mail', 'h-5 w-5 shrink-0 text-lime') ?>
          </a>
        </div>
      </div>
    </div>

    <div class="lg:col-span-7"<?= reveal(0.12) ?>>
      <h2 class="mb-4 font-display text-2xl font-bold text-mist"><?= e($t('formTitle')) ?></h2>
      <?= island('ContactForm', ['labels' => $labels], $fallback) ?>
    </div>

    <div class="lg:col-span-5">
      <div class="h-full"<?= reveal(0.08) ?>>
        <div class="h-full rounded-3xl bg-sand p-6 sm:p-8">
          <a href="<?= e(SITE['address']['mapsUrl']) ?>" target="_blank" rel="noopener noreferrer" class="group flex items-start gap-4">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-paper text-emerald"><?= icon('MapPin', 'h-5 w-5') ?></span>
            <span class="min-w-0 flex-1">
              <span class="block text-xs font-bold uppercase tracking-[0.12em] text-moss"><?= e($tc('addressLabel')) ?></span>
              <span class="mt-1 block font-display text-lg font-semibold leading-snug text-ink">
                <?= e(SITE['address']['street']) ?><br>
                <?= e(SITE['address']['city']) ?>, <?= e(SITE['address']['region']) ?> <?= e(SITE['address']['postalCode']) ?>
              </span>
            </span>
            <?= icon('ArrowUpRight', 'mt-1 h-5 w-5 shrink-0 text-ink/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5') ?>
          </a>

          <div class="mt-6 flex items-start gap-4 border-t border-ink/10 pt-6">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-paper text-emerald"><?= icon('Clock', 'h-5 w-5') ?></span>
            <span>
              <span class="block text-xs font-bold uppercase tracking-[0.12em] text-moss"><?= e($tc('hoursLabel')) ?></span>
              <span class="mt-1 block text-sm font-medium leading-relaxed text-ink sm:text-base">
                <?= e($tc('hoursMonThu')) ?><br>
                <?= e($tc('hoursFri')) ?><br>
                <?= e($tc('hoursWeekend')) ?>
              </span>
            </span>
          </div>

          <a href="<?= e(SITE['address']['mapsUrl']) ?>" target="_blank" rel="noopener noreferrer" class="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-emerald">
            <?= icon('Navigation', 'h-4 w-4') ?><?= e($t('directions')) ?>
          </a>
        </div>
      </div>
    </div>

    <!-- Carte : à droite de l'adresse et des heures, dans le même cadre que le formulaire -->
    <div class="flex flex-col lg:col-span-7"<?= reveal(0.12) ?>>
      <h2 class="mb-4 font-display text-2xl font-bold text-mist"><?= e(locale() === 'en' ? 'Find us' : 'Nous trouver') ?></h2>
      <div class="glass flex flex-1 overflow-hidden rounded-3xl p-2">
        <iframe title="<?= e($t('mapTitle')) ?>" src="<?= e($mapSrc) ?>" width="100%" height="360" loading="lazy" referrerpolicy="no-referrer-when-downgrade" class="min-h-[320px] w-full flex-1 rounded-2xl border-0"></iframe>
      </div>
    </div>
  </div>
<?= section_close() ?>
<?php return [
    'content' => ob_get_clean(),
    'meta' => page_meta('contact', '/contact'),
];
