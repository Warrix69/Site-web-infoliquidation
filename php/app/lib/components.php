<?php
/** Composants serveur partagés (port de src/components/ui|services|home côté serveur). */

/**
 * <PageHero> — $image : null | ['kind' => 'object', 'src' => …, 'width' => 72] | ['kind' => 'photo', 'src' => …]
 * $childrenHtml : HTML ajouté sous l'intro.
 */
function page_hero(?string $eyebrow, string $title, ?string $intro = null, ?array $image = null, string $size = 'default', string $childrenHtml = ''): string
{
    $compact = $size === 'compact';
    $h = '<header data-theme="green" class="relative isolate overflow-hidden text-mist ' . ($compact ? 'pb-10 pt-32 sm:pb-12 sm:pt-36' : 'pb-16 pt-32 sm:pb-24 sm:pt-40') . '">';
    $h .= '<div class="mx-auto w-full max-w-6xl px-5 sm:px-8 ' . ($image ? 'grid items-center gap-12 lg:grid-cols-12 lg:gap-10' : '') . '">';
    $h .= '<div class="' . ($image ? 'lg:col-span-7' : '') . '"' . reveal() . '>';
    if ($eyebrow) $h .= '<p class="mb-4 inline-flex rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-paper">' . e($eyebrow) . '</p>';
    $h .= '<h1 class="max-w-4xl font-display font-extrabold leading-[1.04] tracking-[-0.03em] text-mist ' . ($compact ? 'text-3xl sm:text-4xl lg:text-[2.75rem]' : 'text-4xl sm:text-5xl lg:text-6xl') . '">' . e($title) . '</h1>';
    if ($intro) $h .= '<p class="mt-6 max-w-2xl text-base leading-relaxed text-moss sm:text-lg">' . e($intro) . '</p>';
    $h .= $childrenHtml . '</div>';

    if (($image['kind'] ?? null) === 'object') {
        $h .= '<div aria-hidden="true" class="relative mx-auto w-full lg:col-span-5 ' . ($compact ? 'max-w-[220px] sm:max-w-[260px] lg:max-w-[300px]' : 'max-w-[300px] sm:max-w-[360px] lg:max-w-none') . '">'
            . '<div class="relative aspect-square">'
            . '<div class="absolute inset-[10%] rounded-full bg-paper/25"></div>'
            . '<div class="absolute bottom-[14%] left-1/2 h-5 w-1/2 -translate-x-1/2 rounded-[50%] bg-black/30 blur-lg"></div>'
            . '<div class="absolute inset-0 flex items-center justify-center" style="animation:heroFadeIn 900ms ease-out 150ms both">'
            . '<div class="animate-float" style="width:' . (int) ($image['width'] ?? 72) . '%">'
            . '<img src="' . e($image['src']) . '" alt="" width="560" height="560" fetchpriority="high" class="h-auto w-full drop-shadow-[0_24px_28px_rgba(0,0,0,0.45)]">'
            . '</div></div></div></div>';
    } elseif (($image['kind'] ?? null) === 'photo') {
        $h .= '<div aria-hidden="true" class="relative lg:col-span-5">'
            . '<div class="absolute -bottom-4 -left-4 h-full w-full rounded-3xl bg-ink"></div>'
            . '<div class="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]" style="animation:heroFadeIn 900ms ease-out 150ms both">'
            . '<img src="' . e($image['src']) . '" alt="" fetchpriority="high" class="absolute inset-0 h-full w-full object-cover">'
            . '</div></div>';
    }
    return $h . '</div></header>';
}

/** <CtaBanner> → formulaire de ramassage. */
function cta_banner(string $title, ?string $text = null, ?string $buttonLabel = null): string
{
    return '<section class="relative overflow-hidden bg-sand py-16 sm:py-24"><div class="mx-auto w-full max-w-6xl px-5 sm:px-8">'
        . '<div class="relative overflow-hidden rounded-3xl bg-forest px-6 py-12 text-center text-mist shadow-[0_30px_60px_-30px_rgba(15,61,46,0.6)] sm:px-12 sm:py-16"' . reveal() . '>'
        . '<div data-theme="dark" class="relative">'
        . '<h2 class="mx-auto max-w-2xl font-display text-3xl font-bold leading-tight text-mist sm:text-4xl">' . e($title) . '</h2>'
        . ($text ? '<p class="mx-auto mt-4 max-w-xl text-base text-moss sm:text-lg">' . e($text) . '</p>' : '')
        . '<div class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">'
        . primary_button(path('/formulaire-de-ramassage'), $buttonLabel ?? t('common.requestPickup'))
        . '<a href="' . e(SITE['phoneHref']) . '" class="inline-flex items-center gap-2 font-display text-sm font-semibold text-mist transition-colors hover:text-emerald sm:text-base">'
        . icon('Phone', 'h-4 w-4 text-emerald') . te('common.orCallUs') . ' ' . e(SITE['phoneDisplay']) . '</a>'
        . '</div></div></div></div></section>';
}

/** <ZoneChips> */
function zone_chips(): string
{
    $z = locale() === 'fr' ? ['Montréal', 'Rive-Nord', 'Rive-Sud'] : ['Montreal', 'North Shore', 'South Shore'];
    $chip = 'glass-light inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-mist/90';
    $pin = icon('MapPin', 'h-3.5 w-3.5 text-emerald');
    return '<div class="flex flex-wrap gap-3">'
        . '<a href="' . e(path('/[ville]', ['ville' => 'montreal'])) . '" class="' . $chip . ' transition-colors hover:border-emerald/40 hover:text-emerald">' . $pin . e($z[0]) . '</a>'
        . '<span class="' . $chip . '">' . $pin . e($z[1]) . '</span>'
        . '<span class="' . $chip . '">' . $pin . e($z[2]) . '</span>'
        . '</div>';
}

/** <CitiesMarquee> */
function cities_marquee(string $label): string
{
    $inner = '';
    foreach (CITIES as $c) {
        $inner .= '<a href="' . e(path('/[ville]', ['ville' => $c['slug']])) . '" class="glass-light inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-mist/90 transition-colors hover:border-emerald/40 hover:text-emerald">'
            . icon('MapPin', 'h-3.5 w-3.5 text-emerald') . e($c[locale()]) . '</a>';
    }
    return marquee($inner, $label, 'py-2');
}

/** <ServicesGrid heading={eyebrow,title,subtitle}> */
function services_grid(array $heading): string
{
    $objects = [
        'computer' => ['/images/bac/portable.webp', 560, 253, '78%'],
        'pickupForm' => ['/images/bac/bac.webp', 900, 1150, '34%'],
        'data' => ['/images/objets/disque-dur.webp', 1100, 625, '70%'],
        'materials' => ['/images/objets/matieres.webp', 900, 493, '74%'],
        'procedure' => ['/images/objets/palette.webp', 900, 800, '54%'],
        'hardDrives' => ['/images/objets/dechiquete.webp', 900, 470, '74%'],
        'phones' => ['/images/bac/telephone.webp', 560, 216, '64%'],
    ];
    $h = '<div class="mx-auto w-full max-w-6xl px-5 sm:px-8">'
        . '<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div class="max-w-2xl">'
        . '<p class="text-sm font-semibold text-emerald">' . e($heading['eyebrow']) . '</p>'
        . '<h2 class="mt-3 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-ink sm:text-4xl lg:text-[2.75rem]">' . e($heading['title']) . '</h2>'
        . '</div><p class="max-w-md text-base leading-relaxed text-moss">' . e($heading['subtitle']) . '</p></div>'
        . '<ul class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">';
    foreach (SERVICES as $i => $s) {
        [$src, $w, $hh, $size] = $objects[$s['key']];
        $h .= '<li class="' . ($i === 0 ? 'sm:col-span-2' : '') . '">'
            . '<a href="' . e(path($s['route'])) . '" class="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-paper transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-emerald/40 hover:shadow-[0_24px_50px_-28px_rgba(10,10,10,0.35)]">'
            . '<div class="relative flex h-44 items-center justify-center bg-sand sm:h-48">'
            . '<span aria-hidden="true" class="absolute bottom-6 left-1/2 h-4 w-1/2 -translate-x-1/2 rounded-[50%] bg-ink/15 blur-md"></span>'
            . '<div class="relative transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-105" style="width:' . $size . '">'
            . '<img src="' . $src . '" alt="" width="' . $w . '" height="' . $hh . '" loading="lazy" decoding="async" class="mx-auto h-auto max-h-36 w-auto object-contain sm:max-h-40">'
            . '</div></div>'
            . '<div class="flex flex-1 items-start justify-between gap-3 p-5"><div>'
            . '<h3 class="font-display text-base font-bold leading-snug text-ink sm:text-lg">' . te("services.{$s['key']}.title") . '</h3>'
            . '<p class="mt-1.5 text-sm leading-relaxed text-moss">' . te("services.{$s['key']}.desc") . '</p>'
            . '</div><span class="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors duration-300 group-hover:border-emerald group-hover:bg-emerald group-hover:text-paper">'
            . icon('ArrowUpRight', 'h-4 w-4') . '</span></div></a></li>';
    }
    return $h . '</ul></div>';
}
