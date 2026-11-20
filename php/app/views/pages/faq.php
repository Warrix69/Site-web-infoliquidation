<?php
/** Port de src/app/[locale]/faq/page.tsx */
$items = tr('faqItems') ?? [];

$faqJsonLd = [
    '@context' => 'https://schema.org',
    '@type' => 'FAQPage',
    'mainEntity' => array_map(fn($item) => [
        '@type' => 'Question',
        'name' => $item['q'],
        'acceptedAnswer' => ['@type' => 'Answer', 'text' => $item['a']],
    ], $items),
];

ob_start(); ?>
<?= page_hero(t('faqPage.eyebrow'), t('faqPage.title'), t('faqPage.subtitle')) ?>

<?= section_open('pt-0') ?>
  <div class="mx-auto max-w-3xl">
    <?= accordion($items) ?>
    <div class="glass mt-10 rounded-3xl p-7 text-center sm:p-8"<?= reveal() ?>>
      <p class="font-display text-xl font-bold text-mist"><?= te('faqPage.ctaTitle') ?></p>
      <p class="mt-2 text-moss"><?= te('faqPage.ctaText') ?></p>
      <div class="mt-6">
        <?= ghost_button(path('/contact'), t('faqPage.ctaButton'), '', true) ?>
      </div>
    </div>
  </div>
<?= section_close() ?>

<?= cta_banner(t('home.finalCta.title'), t('home.finalCta.subtitle')) ?>
<?php return [
    'content' => ob_get_clean(),
    'meta' => page_meta('faq', '/faq'),
    'jsonLd' => [$faqJsonLd],
];
