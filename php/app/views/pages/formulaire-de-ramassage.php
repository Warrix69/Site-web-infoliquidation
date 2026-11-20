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
<header data-theme="green" class="relative overflow-hidden pb-12 pt-32 sm:pb-16 sm:pt-40">
  <div class="mx-auto w-full max-w-3xl px-5 text-center sm:px-8">
    <div<?= reveal() ?>>
      <span class="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald">
        <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald"></span>
        <?= e($t('eyebrow')) ?>
      </span>
      <h1 class="mx-auto font-display text-4xl font-bold leading-[1.05] text-mist sm:text-5xl lg:text-6xl"><?= e($t('title')) ?></h1>
      <p class="mx-auto mt-6 max-w-xl text-base leading-relaxed text-moss sm:text-lg">
        Réponse en <span class="font-semibold text-emerald">24 h</span>, ramassage en <span class="font-semibold text-emerald">72 h max</span>.
      </p>
    </div>
  </div>
</header>

<section class="relative pb-24">
  <div class="mx-auto w-full max-w-3xl px-5 sm:px-8">
    <?= island('PickupForm', ['labels' => $labels], $fallback) ?>
  </div>
</section>
<?php return [
    'content' => ob_get_clean(),
    'meta' => page_meta('pickup', '/formulaire-de-ramassage'),
];
