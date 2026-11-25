<?php
/** Port de src/app/[locale]/formulaire-de-ramassage/page.tsx */
$t = fn($k, $v = []) => t("pickup.$k", $v);

// Même ordre que QUANTITY_KEYS (src/lib/schemas.ts)
$quantityKeys = ['towers', 'servers', 'laptops', 'tablets', 'switches', 'lcd', 'deskPhones', 'cellphones', 'printers', 'photocopiers', 'audioVideo', 'ups'];
$quantities = [];
foreach ($quantityKeys as $key) $quantities[$key] = $t("quantities.$key");

$labels = [
    'requiredNote' => $t('requiredNote'),
    'minItemsNote' => $t('minItemsNote'),
    'identityTitle' => $t('identityTitle'),
    'quantitiesTitle' => $t('quantitiesTitle'),
    'certificateTitle' => $t('certificateTitle'),
    'fields' => [
        'title' => $t('fields.title'),
        'titleOptions' => ['mr' => $t('fields.titleOptions.mr'), 'mrs' => $t('fields.titleOptions.mrs')],
        'firstName' => $t('fields.firstName'),
        'lastName' => $t('fields.lastName'),
        'company' => $t('fields.company'),
        'email' => $t('fields.email'),
        'phone' => $t('fields.phone'),
        'address' => $t('fields.address'),
        'city' => $t('fields.city'),
        'postalCode' => $t('fields.postalCode'),
        'otherEquipment' => $t('fields.otherEquipment'),
        'otherEquipmentPlaceholder' => $t('fields.otherEquipmentPlaceholder'),
        'extraNamePlaceholder' => $t('fields.extraNamePlaceholder'),
        'extraQuantityPlaceholder' => $t('fields.extraQuantityPlaceholder'),
        'extraAdd' => $t('fields.extraAdd'),
        'extraRemove' => $t('fields.extraRemove'),
    ],
    'quantities' => $quantities,
    'decrease' => $t('decrease'),
    'increase' => $t('increase'),
    'certificateQuestion' => $t('certificateQuestion'),
    'yes' => $t('yes'),
    'no' => $t('no'),
    'submit' => $t('submit'),
    'submitting' => $t('submitting'),
    'bottomNote' => $t('bottomNote'),
    'successTitle' => $t('successTitle'),
    'successText' => $t('successText'),
    'errorTitle' => $t('errorTitle'),
    'errorText' => $t('errorText'),
    // Anti-spam : message quand la même personne envoie trop de fois
    'rateLimitedTitle' => locale() === 'en' ? 'Too many submissions' : "Trop d'envois",
    'rateLimitedText' => locale() === 'en'
        ? 'To protect the site against spam, new submissions are blocked for {minutes} min. You can also call us at ' . SITE['phoneDisplay'] . '.'
        : 'Pour protéger le site contre le pourriel, les envois sont bloqués pendant {minutes} min. Vous pouvez aussi nous appeler au ' . SITE['phoneDisplay'] . '.',
    'newRequest' => $t('newRequest'),
    'errors' => [
        'titleRequired' => $t('errors.titleRequired'),
        'firstNameRequired' => $t('errors.firstNameRequired'),
        'lastNameRequired' => $t('errors.lastNameRequired'),
        'emailInvalid' => $t('errors.emailInvalid'),
        'phoneRequired' => $t('errors.phoneRequired'),
        'addressRequired' => $t('errors.addressRequired'),
        'cityRequired' => $t('errors.cityRequired'),
        'postalCodeInvalid' => $t('errors.postalCodeInvalid'),
        'certificateRequired' => $t('errors.certificateRequired'),
        'minItems' => $t('errors.minItems'),
    ],
    // t.raw() : gabarit non interpolé (le composant remplace {count} lui-même)
    'totalItemsTemplate' => (string) tr('pickup.totalItems'),
];

// Contenu affiché avant le montage de l'îlot React
$fallback = '<p class="glass rounded-3xl p-7 text-center text-moss">'
    . '<a href="' . e(SITE['phoneHref']) . '" class="font-display font-semibold text-mist hover:text-emerald">' . e(SITE['phoneDisplay']) . '</a>'
    . ' · <a href="mailto:' . e(SITE['email']) . '" class="font-display font-semibold text-mist [overflow-wrap:anywhere] hover:text-emerald">' . e(SITE['email']) . '</a>'
    . '</p>';

ob_start(); ?>
<?php
// Faits officiels (CLAUDE.md) affichés en pastilles sous le titre
$facts = locale() === 'en'
    ? [['Check', '100% free'], ['Clock', 'Reply within 24 h'], ['Truck', 'Pick-up within 72 h max'], ['Package', 'Min. 10 items']]
    : [['Check', '100 % gratuit'], ['Clock', 'Réponse en 24 h'], ['Truck', 'Ramassage en 72 h max'], ['Package', 'Min. 10 items']];
?>
<!-- Héros compact : on voit le formulaire dès l'arrivée -->
<header data-theme="green" class="relative overflow-hidden pb-8 pt-[8.5rem] sm:pb-10 sm:pt-36">
  <div class="mx-auto w-full max-w-3xl px-5 sm:px-8"<?= reveal() ?>>
    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-paper/80"><?= e($t('eyebrow')) ?></p>
    <h1 class="mt-2 font-display text-3xl font-bold leading-[1.08] tracking-[-0.02em] text-paper sm:text-4xl lg:text-5xl"><?= e($t('title')) ?></h1>
    <ul class="mt-5 flex flex-wrap gap-2">
      <?php foreach ($facts as [$ic, $label]): ?>
        <li class="inline-flex items-center gap-1.5 rounded-full bg-ink/85 px-3 py-1.5 text-xs font-semibold text-paper sm:text-sm">
          <?= icon($ic, 'h-3.5 w-3.5 text-lime') ?><?= e($label) ?>
        </li>
      <?php endforeach; ?>
    </ul>
  </div>
</header>

<section class="relative pb-24 pt-8 sm:pt-10">
  <div class="mx-auto w-full max-w-3xl px-5 sm:px-8">
    <?= island('PickupForm', ['labels' => $labels], $fallback) ?>
  </div>
</section>
<?php return [
    'content' => ob_get_clean(),
    'meta' => page_meta('pickup', '/formulaire-de-ramassage'),
];
