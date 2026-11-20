<?php
/** Port de src/app/[locale]/blog/[slug]/page.tsx — le slug est validé par resolve_route(). */
if (!function_exists('blog_format_date')) {
    /** Équivalent de toLocaleDateString(fr-CA|en-CA, { year: numeric, month: long, day: numeric }). */
    function blog_format_date(string $date): string
    {
        $ts = strtotime($date . ' UTC');
        if ($ts === false) return $date;
        $d = (int) gmdate('j', $ts);
        $m = (int) gmdate('n', $ts);
        $y = gmdate('Y', $ts);
        if (locale() === 'fr') {
            $months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
            return $d . ' ' . $months[$m - 1] . ' ' . $y;
        }
        $months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return $months[$m - 1] . ' ' . $d . ', ' . $y;
    }
}

$slug = $params['slug'];
$article = tr("blog.articles.$slug") ?? ['title' => '', 'date' => '', 'excerpt' => '', 'sections' => []];

$others = [];
foreach (BLOG_SLUGS as $s) {
    if ($s === $slug) continue;
    $others[] = ['slug' => $s] + (tr("blog.articles.$s") ?? []);
}

$articleJsonLd = [
    '@context' => 'https://schema.org',
    '@type' => 'BlogPosting',
    'headline' => $article['title'],
    'description' => $article['excerpt'],
    'datePublished' => $article['date'],
    'inLanguage' => locale(),
    'author' => ['@type' => 'Organization', 'name' => SITE['name']],
    'publisher' => [
        '@type' => 'Organization',
        'name' => SITE['legalName'],
        'logo' => ['@type' => 'ImageObject', 'url' => SITE_URL . '/logo.png'],
    ],
];

$canonical = SITE_URL . path('/blog/[slug]', ['slug' => $slug]);

ob_start(); ?>
<article>
  <header data-theme="green" class="relative overflow-hidden pb-12 pt-32 sm:pb-16 sm:pt-40">
    <div class="mx-auto w-full max-w-3xl px-5 sm:px-8">
      <div<?= reveal() ?>>
        <a href="<?= e(path('/blog')) ?>" class="inline-flex items-center gap-1.5 text-sm font-medium text-emerald transition-colors hover:text-lime">
          <?= icon('ArrowLeft', 'h-4 w-4') ?>
          <?= te('blog.backToBlog') ?>
        </a>
        <p class="mt-6 inline-flex items-center gap-1.5 text-sm text-moss">
          <?= icon('CalendarDays', 'h-4 w-4 text-emerald') ?>
          <?= te('blog.publishedOn') ?> <?= e(blog_format_date($article['date'])) ?>
        </p>
        <h1 class="mt-3 font-display text-3xl font-bold leading-[1.12] text-mist sm:text-4xl lg:text-5xl"><?= e($article['title']) ?></h1>
        <p class="mt-5 text-lg leading-relaxed text-moss"><?= e($article['excerpt']) ?></p>
      </div>
    </div>
  </header>

  <?= section_open('pt-4') ?>
    <div class="mx-auto max-w-3xl">
      <?php foreach ($article['sections'] as $i => $section): ?>
      <div class="mt-8 first:mt-0"<?= reveal(0.05 * $i) ?>>
        <h2 class="font-display text-xl font-bold text-mist sm:text-2xl"><?= e($section['h']) ?></h2>
        <p class="mt-3 leading-relaxed text-moss"><?= e($section['p']) ?></p>
      </div>
      <?php endforeach; ?>
    </div>
  <?= section_close() ?>
</article>

<?php /* À lire aussi */ ?>
<?= section_open('bg-surface/30') ?>
  <h2 class="mb-8 font-display text-2xl font-bold text-mist"><?= te('blog.moreArticles') ?></h2>
  <div class="grid gap-6 md:grid-cols-3">
    <?php foreach ($others as $other): ?>
    <div<?= reveal() ?>>
      <a href="<?= e(path('/blog/[slug]', ['slug' => $other['slug']])) ?>" class="glass group flex h-full flex-col rounded-3xl p-6 transition-colors duration-300 hover:border-emerald/40">
        <p class="text-xs font-medium text-emerald"><?= e(blog_format_date($other['date'])) ?></p>
        <h3 class="mt-2 font-display text-base font-bold leading-snug text-mist group-hover:text-emerald"><?= e($other['title']) ?></h3>
        <p class="mt-2 line-clamp-3 text-sm text-moss"><?= e($other['excerpt']) ?></p>
      </a>
    </div>
    <?php endforeach; ?>
  </div>
<?= section_close() ?>

<?= cta_banner(t('blog.subtitle')) ?>
<?php return [
    'content' => ob_get_clean(),
    'meta' => [
        'title' => $article['title'] . ' | Info Liquidation Recycle',
        'description' => $article['excerpt'],
        'canonical' => $canonical,
        'og' => true,
        'ogType' => 'article',
    ],
    'jsonLd' => [$articleJsonLd],
];
