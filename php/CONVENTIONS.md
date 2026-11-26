# Version PHP — conventions

Port 1:1 du site Next.js (`src/`). Même rendu, mêmes textes (`app/messages/*.json` = copie de `src/messages`), mêmes URL.

## Structure
- `public/` = racine web (index.php contrôleur frontal, .htaccess, assets compilés, images).
- `app/views/pages/<nom>.php` = une page. `app/views/partials/` = morceaux. `app/lib/` = fonctions.
- `js/` + `css/` = sources compilées par `node php/build.mjs` vers `public/assets/`.

## Écrire une page (`app/views/pages/xxx.php`)
Variables disponibles : `$route` (route interne, ex. '/a-propos'), `$params` (ex. ['ville' => 'laval'], ['slug' => …]).
```php
<?php
$t = fn($k, $v = []) => t("about.$k", $v);   // optionnel : raccourci de namespace
ob_start(); ?>
<?= page_hero(t('about.hero.eyebrow'), t('about.hero.title'), t('about.hero.intro'), ['kind' => 'photo', 'src' => '/images/x.jpg']) ?>
<section class="…"> … </section>
<?php return [
  'content' => ob_get_clean(),
  'meta' => page_meta('about', '/a-propos'),           // pageMetadata({ ns, href })
  'jsonLd' => [ [...], ],                              // facultatif : JSON-LD supplémentaires
];
```
- Toujours échapper : `e($x)` ; `te('clé')` = t() échappé. `tr('clé')` = t.raw() (tableaux).
- Liens : `path('/a-propos')`, `path('/[ville]', ['ville' => 'laval'])`, `path('/blog/[slug]', ['slug' => $s])`. Jamais d'URL en dur.
- `locale()` = 'fr' | 'en'. `SITE`, `SERVICES`, `CITIES`, `BLOG_SLUGS`, `get_city()` dans `lib/site.php`.

## Équivalences composants (lib/view.php, lib/components.php)
| React | PHP |
|---|---|
| `<Reveal delay={d} className="c">…</Reveal>` | `<div class="c"<?= reveal(d) ?>>…</div>` |
| `<Counter value suffix plain/>` | `counter($value, $suffix, $plain)` |
| `<Magnetic strength>` | `magnetic($html, $strength)` |
| `<TiltCard className>` | `tilt_card($html, $class)` |
| `<Accordion items>` | `accordion($items)` |
| `<Marquee label>` | `marquee($halfHtml, $label, $class)` |
| `<WordReveal text accentWords as>` | `word_reveal($text, $class, $accentWords, $delay, $tag)` |
| `<ContainerScroll titleComponent>` | `container_scroll($titleHtml, $innerHtml)` |
| `<PrimaryButtonLink>` / `<GhostButtonLink>` | `primary_button($href, $label, $class, $arrow)` / `ghost_button(...)` |
| `<Section>` / `<SectionHeading>` | `section_open($class,$id,$theme)` … `section_close()` / `section_heading(...)` |
| `<PageHero>` | `page_hero($eyebrow, $title, $intro, $image, $size, $childrenHtml)` |
| `<CtaBanner>` | `cta_banner($title, $text, $buttonLabel)` |
| `<ZoneChips>` / `<CitiesMarquee>` / `<ServicesGrid>` | `zone_chips()` / `cities_marquee($label)` / `services_grid($heading)` |
| lucide `<MapPin className/>` | `icon('MapPin', 'classes')` (liste dans lib/icons.php ; régénérer avec `node php/tools/gen-icons.mjs` après ajout du nom) |
| `next/image` | `<img … loading="lazy" decoding="async">` (`fetchpriority="high"` si `priority`; `fill` → `class="absolute inset-0 h-full w-full …"`) |
| Composant client lourd (Hero, StepsTimeline, BinSection, DataDestruction, ClosingBin, PickupForm, ContactForm) | `island('Nom', $props, $fallbackHtml)` — monté par React dans le navigateur ; props = mêmes que dans page.tsx (JSON). Ajouter le nom dans `js/islands.tsx` s'il manque. |

## Surcharges PHP (`js/overrides/`)
- `Hero.tsx`, `HeroDevices.tsx`, `DataDestruction.tsx` sont des copies de `src/components/home/` optimisées pour la version PHP seulement (performance, rendu identique) ; `src/` reste celui du site Next.js et n'est pas modifié.
- `HeroEffects.tsx` (post-traitement de la 3D, extrait de `HeroDevices.tsx`) n'existe que côté PHP : chargé en mode high seulement.
- `build.mjs` (plugin `php-overrides`) redirige tout import de l'original vers la copie ; les autres imports des copies s'écrivent en `@/…` (résolus dans `src/`, et `tsc` les trouve).
- Toute modification de l'original dans `src/components/home/` doit être reportée à la main dans la copie (sinon la version PHP garde l'ancien comportement).
