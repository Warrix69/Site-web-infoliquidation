<?php
/**
 * Aides de gabarit : vues, icônes, composants partagés (boutons, sections,
 * révélation au scroll) et « îlots » React pour les parties interactives.
 */

require_once __DIR__ . '/icons.php';

/** Rendu d'un fichier de vue avec des variables locales ; retourne le HTML. */
function render(string $view, array $vars = []): string
{
    extract($vars, EXTR_SKIP);
    ob_start();
    require APP_DIR . "/views/$view.php";
    return ob_get_clean();
}

/** Icône lucide en SVG inline. */
function icon(string $name, string $class = 'h-4 w-4', array $attrs = []): string
{
    $inner = ICONS[$name] ?? '';
    $extra = '';
    foreach ($attrs as $k => $v) $extra .= ' ' . $k . '="' . e($v) . '"';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide ' . e($class) . '" aria-hidden="true"' . $extra . '>' . $inner . '</svg>';
}

/** Attributs de révélation au scroll (remplace <Reveal>). */
function reveal(float $delay = 0, int $y = 28): string
{
    $a = ' data-reveal';
    if ($delay) $a .= ' style="--reveal-delay:' . $delay . 's;--reveal-y:' . $y . 'px"';
    elseif ($y !== 28) $a .= ' style="--reveal-y:' . $y . 'px"';
    return $a;
}

/** Compteur animé (remplace <Counter>). */
function counter($value, ?string $suffix = null, bool $plain = false): string
{
    $loc = locale() === 'fr' ? 'fr-CA' : 'en-CA';
    $display = $plain ? (string) $value : number_format((float) $value, 0, ',', locale() === 'fr' ? "\u{202F}" : ',');
    return '<span data-counter="' . e($value) . '" data-locale="' . $loc . '"' . ($plain ? ' data-plain' : '') . '>' . e($display) . '</span>' . ($suffix ? e($suffix) : '');
}

function primary_button(string $href, string $label, string $class = '', bool $arrow = true): string
{
    return '<a href="' . e($href) . '" class="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-accent px-7 py-3.5 font-display text-sm font-bold tracking-wide text-ink shadow-glow transition-all duration-300 hover:shadow-glow-lg hover:brightness-110 focus-visible:shadow-glow-lg sm:text-base ' . e($class) . '">'
        . e($label)
        . ($arrow ? icon('ArrowRight', 'h-4 w-4 transition-transform duration-300 group-hover:translate-x-1') : '')
        . '</a>';
}

function ghost_button(string $href, string $label, string $class = '', bool $arrow = false): string
{
    return '<a href="' . e($href) . '" class="group inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface/40 px-7 py-3.5 font-display text-sm font-semibold text-mist backdrop-blur transition-all duration-300 hover:border-emerald/50 hover:bg-emerald-soft sm:text-base ' . e($class) . '">'
        . e($label)
        . ($arrow ? icon('ArrowRight', 'h-4 w-4 transition-transform duration-300 group-hover:translate-x-1') : '')
        . '</a>';
}

/** Ouverture/fermeture d'une <Section>. */
function section_open(string $class = '', ?string $id = null, string $theme = 'light'): string
{
    $dark = $theme === 'dark';
    return '<section' . ($id ? ' id="' . e($id) . '"' : '') . ($dark ? ' data-theme="dark"' : '')
        . ' class="relative py-16 sm:py-24 ' . ($dark ? 'bg-ink text-mist ' : '') . e($class) . '">'
        . '<div class="mx-auto w-full max-w-6xl px-5 sm:px-8">';
}

function section_close(): string
{
    return '</div></section>';
}

function section_heading(?string $eyebrow, string $title, ?string $subtitle = null, string $align = 'center', string $class = ''): string
{
    $alignCls = $align === 'center' ? 'mx-auto text-center' : 'text-left';
    $h = '<div class="max-w-3xl ' . $alignCls . ' ' . e($class) . '"' . reveal() . '>';
    if ($eyebrow) $h .= '<span class="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-emerald-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald">' . e($eyebrow) . '</span>';
    $h .= '<h2 class="font-display text-3xl font-bold leading-tight text-mist sm:text-4xl lg:text-[2.75rem]">' . e($title) . '</h2>';
    if ($subtitle) $h .= '<p class="mt-4 text-base leading-relaxed text-moss sm:text-lg">' . e($subtitle) . '</p>';
    return $h . '</div>';
}

/**
 * Îlot React : le composant est monté côté navigateur par assets/islands.js.
 * $fallback : HTML affiché avant le montage (et pour les robots).
 */
function island(string $name, array $props = [], string $fallback = '', string $class = '', string $tag = 'div'): string
{
    $GLOBALS['__islands_used'][$name] = true;
    $json = json_encode($props, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP);
    return '<' . $tag . ' data-island="' . e($name) . '"' . ($class ? ' class="' . e($class) . '"' : '')
        . '><script type="application/json" data-props>' . $json . '</script>' . $fallback . '</' . $tag . '>';
}

/**
 * <link rel="modulepreload"> pour islands.js, ses imports statiques et les chunks des îlots
 * présents sur la page (assets/modules.json, écrit par php/build.mjs). Les imports
 * dynamiques internes (la 3D du héros) ne sont pas préchargés.
 */
function islands_modulepreload(): string
{
    if (empty($GLOBALS['__islands_used'])) return '';
    $file = PUBLIC_DIR . '/assets/modules.json';
    $m = is_file($file) ? (json_decode((string) file_get_contents($file), true) ?: []) : [];
    $files = $m['islands'] ?? [];
    foreach (array_keys($GLOBALS['__islands_used']) as $name) array_push($files, ...($m[$name] ?? []));
    $h = '<link rel="modulepreload" href="' . e(asset('assets/islands.js')) . '">';
    foreach (array_unique($files) as $f) $h .= "\n" . '<link rel="modulepreload" fetchpriority="low" href="/assets/' . e($f) . '">';
    return $h;
}

/* ---------- Équivalents PHP des petits composants client ---------- */

/** <Magnetic> : entoure $inner (HTML). */
function magnetic(string $inner, float $strength = 0.25, string $class = ''): string
{
    return '<span data-magnetic="' . $strength . '" class="inline-flex transition-transform duration-300 ease-out will-change-transform ' . e($class) . '">' . $inner . '</span>';
}

/** <TiltCard> : entoure $inner (HTML). */
function tilt_card(string $inner, string $class = ''): string
{
    return '<div data-tilt class="group relative transition-transform duration-200 will-change-transform ' . e($class) . '" style="transform-style:preserve-3d">'
        . '<div aria-hidden="true" class="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100" style="background:radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(16,185,129,0.14), transparent 65%)"></div>'
        . $inner . '</div>';
}

/** <Accordion items={[{q,a}]}> — le premier élément est ouvert. */
function accordion(array $items, string $class = ''): string
{
    static $n = 0;
    $n++;
    $h = '<div data-accordion class="space-y-3 ' . e($class) . '">';
    foreach ($items as $i => $item) {
        $open = $i === 0;
        $bid = "acc$n-btn-$i";
        $pid = "acc$n-panel-$i";
        $h .= '<div data-acc-item class="glass overflow-hidden rounded-2xl transition-colors duration-300 ' . ($open ? 'border-emerald/40' : 'hover:border-emerald/30') . '">'
            . '<button id="' . $bid . '" type="button" data-acc-btn aria-expanded="' . ($open ? 'true' : 'false') . '" aria-controls="' . $pid . '" class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5">'
            . '<span class="font-display text-base font-semibold text-mist sm:text-lg">' . e($item['q']) . '</span>'
            . '<span data-acc-badge class="shrink-0 rounded-full p-1.5 transition-transform duration-300 ' . ($open ? 'bg-gradient-accent text-ink' : 'bg-emerald-soft text-emerald') . '"' . ($open ? ' style="transform:rotate(180deg)"' : '') . '>' . icon('ChevronDown', 'h-4 w-4') . '</span>'
            . '</button>'
            . '<div id="' . $pid . '" data-acc-panel role="region" aria-labelledby="' . $bid . '" class="overflow-hidden"' . ($open ? '' : ' hidden') . '>'
            . '<p class="px-5 pb-5 text-sm leading-relaxed text-moss sm:px-6 sm:text-base">' . e($item['a']) . '</p>'
            . '</div></div>';
    }
    return $h . '</div>';
}

/** <Marquee> : $inner est le contenu d'une moitié (dupliqué automatiquement). */
function marquee(string $inner, ?string $label = null, string $class = ''): string
{
    return '<div data-marquee class="relative overflow-hidden ' . e($class) . '" role="marquee"' . ($label ? ' aria-label="' . e($label) . '"' : '') . '>'
        . '<div data-marquee-track class="flex w-max items-center gap-4 will-change-transform">'
        . '<div data-marquee-half class="flex items-center gap-4">' . $inner . '</div>'
        . '<div data-marquee-clone class="flex items-center gap-4" aria-hidden="true" inert>' . $inner . '</div>'
        . '</div></div>';
}

/** <WordReveal> : titre révélé mot par mot (animation CSS). */
function word_reveal(string $text, string $class = '', array $accentWords = [], float $delay = 0.15, string $tag = 'h1'): string
{
    $words = explode(' ', $text);
    $h = '<' . $tag . ' class="' . e($class) . '" aria-label="' . e($text) . '">';
    foreach ($words as $i => $w) {
        $h .= '<span class="inline-block overflow-hidden pb-1 align-bottom' . ($i < count($words) - 1 ? ' me-[0.28em]' : '') . '" aria-hidden="true">'
            . '<span class="word-reveal inline-block' . (in_array($i, $accentWords, true) ? ' text-gradient' : '') . '" style="animation-delay:' . round($delay + $i * 0.08, 2) . 's">' . e($w) . '</span></span>';
    }
    return $h . '</' . $tag . '>';
}

/** <ContainerScroll titleComponent={…}>{children}</ContainerScroll> */
function container_scroll(string $titleHtml, string $inner): string
{
    return '<div data-container-scroll class="relative flex h-[60rem] items-center justify-center p-2 md:h-[80rem] md:p-20">'
        . '<div class="relative w-full py-10 md:py-40" style="perspective:1000px">'
        . '<div data-cs-header class="div mx-auto max-w-5xl text-center">' . $titleHtml . '</div>'
        . '<div data-cs-card class="mx-auto -mt-12 h-[30rem] w-full max-w-5xl rounded-[30px] border-4 border-[#01a447]/40 bg-[#0A0A0A] p-2 shadow-2xl md:h-[40rem] md:p-6" style="transform:rotateX(20deg) scale(1.05);box-shadow:0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003">'
        . '<div class="h-full w-full overflow-hidden rounded-2xl bg-gray-100 md:rounded-2xl md:p-0">' . $inner . '</div>'
        . '</div></div></div>';
}

function json_ld(array $data): string
{
    return '<script type="application/ld+json">' . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) . '</script>';
}

/** Version des fichiers statiques (cache-busting). */
function asset(string $path): string
{
    $file = PUBLIC_DIR . '/' . ltrim($path, '/');
    $v = is_file($file) ? filemtime($file) : 0;
    return '/' . ltrim($path, '/') . '?v=' . $v;
}
