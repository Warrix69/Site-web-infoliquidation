<?php
/** Port de src/app/[locale]/blog/page.tsx */
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

$articles = [];
foreach (BLOG_SLUGS as $slug) {
    $articles[] = ['slug' => $slug] + (tr("blog.articles.$slug") ?? []);
}

ob_start(); ?>
<?= page_hero(t('blog.eyebrow'), t('blog.title'), t('blog.subtitle'), ['kind' => 'photo', 'src' => '/images/centre/etabli.webp']) ?>

<?= section_open('pt-0') ?>
  <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    <?php foreach ($articles as $i => $article): ?>
    <div<?= reveal(min($i * 0.08, 0.3)) ?>>
      <?= tilt_card(
          '<a href="' . e(path('/blog/[slug]', ['slug' => $article['slug']])) . '" class="glass group/card flex h-full flex-col rounded-3xl p-6 transition-colors duration-300 hover:border-emerald/40 sm:p-7">'
          . '<p class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald">'
          . icon('CalendarDays', 'h-3.5 w-3.5')
          . e(blog_format_date($article['date']))
          . '</p>'
          . '<h2 class="mt-3 font-display text-lg font-bold leading-snug text-mist">' . e($article['title']) . '</h2>'
          . '<p class="mt-3 flex-1 text-sm leading-relaxed text-moss">' . e($article['excerpt']) . '</p>'
          . '<span class="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald">'
          . te('blog.readArticle')
          . icon('ArrowUpRight', 'h-4 w-4 transition-transform duration-300 group-hover/card:-translate-y-0.5 group-hover/card:translate-x-0.5')
          . '</span></a>',
          'h-full rounded-3xl'
      ) ?>
    </div>
    <?php endforeach; ?>
  </div>
<?= section_close() ?>

<?= cta_banner(t('blog.subtitle')) ?>
<?php return [
    'content' => ob_get_clean(),
    'meta' => page_meta('blog', '/blog'),
];
