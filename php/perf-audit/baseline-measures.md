# Mesures de performance de base — version PHP (avant optimisation)

Date : 2026-11-25, branche `performance-optimization`, build servi de `php/public/assets/` (horodaté 15:58:07, empreintes md5 dans `raw/baseline-weight.json` → `build`). Aucun fichier du site n'a été modifié.

## Méthodologie (court)

- **Serveur** : PHP 8.3.36 intégré, `http://localhost:8080`. Il ne compresse pas (pas de gzip) et n'applique pas `.htaccess` (pas d'en-têtes de cache). Les audits Lighthouse « compression » / « cache » et tous les temps de téléchargement sous réseau ralenti sont donc **pessimistes** par rapport à la prod. Les tailles « gzip » ci-dessous sont calculées avec `zlib.gzipSync` niveau 6 (équivalent `mod_deflate` par défaut) sur les octets réellement servis.
- **Lighthouse 13.6.0** (CLI, Chrome 157 headless), catégorie performance seulement. Mobile = réglage par défaut (Moto G Power émulé, 4G lent simulé, CPU 4x) ; desktop = `--preset=desktop`. 1 passe par page ; **3 passes (médiane, plage min–max entre parenthèses)** pour `/`, `/recyclage-ordinateur`, `/formulaire-de-ramassage`. La bannière de témoins n'est **pas** masquée dans Lighthouse (1re visite réelle) — elle est l'élément LCP sur `/en` mobile.
- **Playwright-core 1.64.1 + Chrome 157.0.8103.80 headless** (`channel: 'chrome'`) pour le poids, le défilement et les interactions. Bannière de témoins masquée par CSS injecté. rAF tourne bien en headless (60 fps mesurés sur les pages simples). GPU réel utilisé : ANGLE / NVIDIA RTX 4060 (D3D11) — le ralentissement CPU **ne ralentit pas le GPU**, donc le coût du rendu 3D d'un vrai téléphone est sous-estimé.
- **Défilement** : 2000 px/s constant. Desktop : vraie molette (`mouse.wheel` 100 px / 50 ms, passe par Lenis). Mobile (`isMobile`, `hasTouch`, DPR 3, UA Android) : `scrollTo({behavior:'instant'})` piloté par rAF (Lenis est désactivé au doigt ; `instant` est nécessaire car `html{scroll-behavior:smooth}`). CPU via `Emulation.setCPUThrottlingRate`, réseau mobile via `Network.emulateNetworkConditions` (150 ms RTT, 1,6 Mb/s ↓, 750 kb/s ↑). Début de mesure 4 s après `load`. « Frame manquée » = intervalle rAF > 18 ms (16,7 ms + gigue vsync) ; « > 33 » = > 33,4 ms. Long Tasks via `PerformanceObserver('longtask')`. Sections = enfants de `<main>` (les wrappers d'îlots `display:contents` sont ramenés à la boîte de leurs enfants), section attribuée selon le centre du viewport.
- **Navigation** : depuis l'accueil chargé (+2,5 s), `element.click()` sur le lien (les liens du sous-menu sont cachés), puis temps mesurés sur l'horloge `performance.timeOrigin` des deux pages : clic → début de navigation / TTFB / FCP / LCP / load.
- **Interactions** : Event Timing API (`type:'event'`, `durationThreshold:16`), vrais clics / taps / frappes Playwright, CPU 4x, 3 répétitions (menu, accordéon). Les durées Event Timing sont arrondies à 8 ms par le navigateur.
- **Relancer** (mesure « après » de la phase 3) : voir l'en-tête de `scripts/run-all.mjs` — `TAG=apres node php/perf-audit/scripts/run-all.mjs` puis `node php/perf-audit/scripts/make-tables.mjs apres`.

## Constats principaux

1. **L'accueil (FR et EN) est la seule page lourde.** Lighthouse mobile 64 (62–64), TBT **4,2 s** (3,8–4,3 s) ; `/en` mobile 43, TBT 4,9 s. Desktop 67 (TBT 1,3 s). Toutes les autres pages : 83–94 en mobile, 97–100 en desktop (sauf formulaire, voir 4).
2. **Cause : le héros 3D.** `HeroDevices` (three.js + @react-three/fiber + drei + postprocessing) = **1 297 Ko bruts / 424 Ko gzip**, chargé dès l'arrivée sur l'accueil, **aussi en profil mobile**. JS total de l'accueil : 1 728 Ko bruts / 567 Ko gzip. Dans Lighthouse mobile, le temps de script est attribué à `chunk-GXJ7SPYC` (planificateur React : 6,5 s, exécute le rendu des îlots) et à `HeroDevices` (1,8 s) ; plus longue tâche 2,95 s.
3. **Saccades de défilement concentrées sur l'accueil** ; les autres pages restent à 60 fps même en CPU 6x. Accueil desktop : 57 fps (1x) → 49 fps / 18,6 % de frames manquées (4x) → **33 fps / 47 %** de frames manquées, 32 Long Tasks (2,2 s) (6x, 1366×657). Les pires zones : **héros épinglé** (scrollY 0–2365 à 1366 px : 94 % de frames manquées en 6x), **DataDestruction** (5857–7434 : 94 %, 20 Long Tasks) et la section « Partout dans le Grand Montréal » ; en 1x, petite saccade sur **StepsTimeline** (14 %). Mobile 390 / 360 CPU 4x + 4G : 53–54 fps, 10–11 % de frames manquées, surtout DataDestruction, « Partout dans le Grand Montréal » et « Rien n'est perdu ».
4. **Formulaire de ramassage : CLS 0,43 en desktop** (3 passes identiques), décalage attribué à `body > footer` (le pied de page bouge quand l'îlot React du formulaire s'affiche). Mobile : LCP 5,8 s, score 69 (62–74). `/contact` charge **~1,6 Mo de JS Google Maps tiers** (iframe) : 2 264 Ko bruts / 686 Ko gzip au total, LCP mobile 6,3 s.
5. **Interactions correctes, navigation rapide en local.** Latence max (≈ INP, CPU 4x) : ouverture menu mobile 88 ms (puis 40), sous-menu Services desktop 96 ms (puis 48–56), accordéon FAQ 56 ms, focus/frappe formulaire 32–40 ms — tout < 200 ms. Clic → FCP de la page suivante : 230–260 ms (CPU 4x, sans réseau), 1,5–2,0 s en 4G lent. Clic → LCP ≈ FCP + 700 ms de façon constante : le titre LCP est révélé par l'animation (`is-visible`).

## Contenu des gros chunks (`php/public/assets/chunks/`)

| Fichier | Brut / gzip (Ko) | Contenu identifié | Chargé sur |
| --- | --- | --- | --- |
| `HeroDevices-Y4AYAUH7.js` | 1297 / 424 | three.js + @react-three/fiber + drei + @react-three/postprocessing (EffectComposer) | `/`, `/en` (desktop et mobile), dès le chargement |
| `hls-C7J4DJNU.js` | 573 / 180 | hls.js | **jamais** (aucun import ne le référence) |
| `islands.js` (racine) | 206 / 64 | react-dom + chargeur d'îlots | toute page avec îlot (accueil, formulaire, contact) |
| `vision_bundle-QYRALJU6.js` | 135 / 40 | MediaPipe vision | **jamais** (aucun import ne le référence) |
| `chunk-OOVSVHCH.js` | 135 / 45 | framer-motion | accueil, formulaire, contact |
| `chunk-YKGBALLS.js` | 105 / 30 | react-hook-form + zod | formulaire, contact |
| `chunk-JXIQEI4U.js` | 8 / 3 | React | pages à îlots |
| `chunk-GXJ7SPYC.js` | 4 / 2 | planificateur React (`scheduler`) | pages à îlots |
| `site.js` (racine) | 26 / 8 | JS vanilla + Lenis | toutes les pages (seul JS des pages sans îlot, avec `chunk-7FMWBHZO`) |

## Résultats détaillés

Tous les chiffres viennent de `raw/` (tableaux régénérables par `scripts/make-tables.mjs`).

### Lighthouse mobile

| Page | Score | FCP | LCP | TBT (ms) | CLS | Speed Index | Passes | Élément LCP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 64 (62–64) | 2.14 s (2.13 s–2.14 s) | 2.14 s (2.13 s–2.14 s) | 4244 (3795–4263) | 0.001 (0.000–0.001) | 4.74 s (4.62 s–5.53 s) | médiane de 3 | `?` |
| `/a-propos` | 85 | 1.81 s | 4.21 s | 0 | 0.027 | 1.81 s | 1 | `er.relative > div.mx-auto > div.lg:col-span-7 > h1.max-w-4xl` |
| `/recyclage-ordinateur` | 91 (90–92) | 1.96 s (1.96 s–1.97 s) | 3.27 s (3.19 s–3.28 s) | 0 (0–103) | 0.013 (0.000–0.013) | 1.96 s (1.96 s–2.33 s) | médiane de 3 | `header.relative > div.mx-auto > div.lg:col-span-7 > p.mt-6` |
| `/destruction-des-disques-durs` | 90 | 1.96 s | 3.35 s | 0 | 0.023 | 1.96 s | 1 | `er.relative > div.mx-auto > div.lg:col-span-7 > h1.max-w-4xl` |
| `/destruction-des-donnees` | 91 | 1.81 s | 3.36 s | 0 | 0.000 | 1.81 s | 1 | `div.relative > div.absolute > div.animate-float > img.h-auto` |
| `/formulaire-de-ramassage` | 69 (62–74) | 1.83 s (1.82 s–3.75 s) | 5.82 s (5.80 s–5.85 s) | 98 (70–122) | 0.000 (0.000–0.301) | 3.75 s (1.90 s–4.38 s) | médiane de 3 | `main#main > header.relative > div.mx-auto > h1.mt-2` |
| `/contact` | 75 | 1.98 s | 6.33 s | 113 | 0.000 | 1.98 s | 1 | `er.relative > div.mx-auto > div.lg:col-span-7 > h1.max-w-4xl` |
| `/blog` | 88 | 1.96 s | 3.61 s | 115 | 0.022 | 1.96 s | 1 | `er.relative > div.mx-auto > div.lg:col-span-7 > h1.max-w-4xl` |
| `/blog/cybersecurite-et-recycla…` | 93 | 1.97 s | 3.01 s | 0 | 0.000 | 1.97 s | 1 | `header.relative > div.mx-auto > div.is-visible > p.mt-5` |
| `/laval` | 83 | 1.97 s | 4.37 s | 108 | 0.000 | 1.97 s | 1 | `header.relative > div.mx-auto > div.lg:col-span-7 > p.mt-6` |
| `/faq` | 94 | 1.81 s | 2.84 s | 0 | 0.017 | 1.81 s | 1 | `eader.relative > div.mx-auto > div.is-visible > h1.max-w-4xl` |
| `/en` | 43 | 2.12 s | 6.10 s | 4924 | 0.000 | 4.72 s | 1 | `body > div.cookie-panel > div.rounded-2xl > p.text-sm` |

### Lighthouse desktop

| Page | Score | FCP | LCP | TBT (ms) | CLS | Speed Index | Passes | Élément LCP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 67 (57–67) | 0.54 s (0.52 s–0.55 s) | 1.26 s (1.23 s–2.36 s) | 1302 (1253–1453) | 0.001 (0.001–0.001) | 1.32 s (1.30 s–1.40 s) | médiane de 3 | `er-events-none > div.absolute > div.lg:text-right > p.mt-0.5` |
| `/a-propos` | 99 | 0.48 s | 0.94 s | 0 | 0.001 | 0.61 s | 1 | `er.relative > div.mx-auto > div.lg:col-span-7 > h1.max-w-4xl` |
| `/recyclage-ordinateur` | 99 (96–99) | 0.55 s (0.54 s–0.56 s) | 0.87 s (0.86 s–0.87 s) | 0 (0–0) | 0.001 (0.001–0.001) | 0.57 s (0.56 s–1.89 s) | médiane de 3 | `er.relative > div.mx-auto > div.lg:col-span-7 > h1.max-w-4xl` |
| `/destruction-des-disques-durs` | 99 | 0.55 s | 0.86 s | 0 | 0.001 | 0.57 s | 1 | `er.relative > div.mx-auto > div.lg:col-span-7 > h1.max-w-4xl` |
| `/destruction-des-donnees` | 100 | 0.49 s | 0.79 s | 0 | 0.001 | 0.54 s | 1 | `div.mx-auto > div.grid > div.is-visible > p.leading-relaxed` |
| `/formulaire-de-ramassage` | 78 (78–78) | 0.51 s (0.48 s–0.51 s) | 1.18 s (1.14 s–1.21 s) | 0 (0–0) | 0.430 (0.430–0.430) | 0.55 s (0.52 s–0.59 s) | médiane de 3 | `main#main > header.relative > div.mx-auto > h1.mt-2` |
| `/contact` | 97 | 0.51 s | 1.30 s | 0 | 0.001 | 0.69 s | 1 | `div.relative > div.absolute > div.animate-float > img.h-auto` |
| `/blog` | 99 | 0.53 s | 0.83 s | 0 | 0.001 | 0.55 s | 1 | `er.relative > div.mx-auto > div.lg:col-span-7 > h1.max-w-4xl` |
| `/blog/cybersecurite-et-recycla…` | 98 | 0.54 s | 0.84 s | 0 | 0.001 | 1.34 s | 1 | `header.relative > div.mx-auto > div.is-visible > h1.mt-3` |
| `/laval` | 99 | 0.55 s | 0.98 s | 0 | 0.001 | 0.55 s | 1 | `er.relative > div.mx-auto > div.lg:col-span-7 > h1.max-w-4xl` |
| `/faq` | 99 | 0.53 s | 0.83 s | 0 | 0.001 | 0.53 s | 1 | `eader.relative > div.mx-auto > div.is-visible > h1.max-w-4xl` |
| `/en` | 56 | 0.54 s | 2.42 s | 1232 | 0.000 | 1.47 s | 1 | `er-events-none > div.absolute > div.lg:text-right > p.mt-0.5` |

### Poids par page — desktop (Ko ; brut / gzip estimé ; « +défil. » = chargé après défilement complet)

| Page | HTML gz | JS brut | JS gzip | dont JS tiers gzip | JS +défil. gzip | CSS gzip | Images (initial) | Images +défil. | Polices | Média +défil. | Requêtes init / +défil. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 10.9 | 1727.7 | 566.6 | 0.0 | 0.0 | 16.3 | 137.6 | 1118.1 | 77.8 | 0.0 | 31 / 14 |
| `/a-propos` | 7.1 | 26.8 | 8.2 | 0.0 | 0.0 | 16.4 | 317.2 | 0.0 | 60.6 | 0.0 | 12 / 0 |
| `/recyclage-ordinateur` | 9.5 | 26.8 | 8.2 | 0.0 | 0.0 | 16.3 | 104.8 | 0.0 | 70.2 | 0.0 | 13 / 0 |
| `/destruction-des-disques-durs` | 8.9 | 26.8 | 8.2 | 0.0 | 0.0 | 16.3 | 146.2 | 0.0 | 70.2 | 0.0 | 13 / 0 |
| `/destruction-des-donnees` | 7.4 | 26.8 | 8.2 | 0.0 | 0.0 | 16.3 | 159.5 | 0.0 | 70.2 | 0.0 | 13 / 0 |
| `/formulaire-de-ramassage` | 7.2 | 510.2 | 159.5 | 0.0 | 0.0 | 16.3 | 7.1 | 0.0 | 70.3 | 0.0 | 19 / 0 |
| `/contact` | 8.9 | 2264.1 | 685.7 | 541.1 | 12.2 | 20.5 | 142.6 | 112.0 | 112.3 | 0.0 | 38 / 24 |
| `/blog` | 8.4 | 26.8 | 8.2 | 0.0 | 0.0 | 16.3 | 141.9 | 0.0 | 70.2 | 0.0 | 12 / 0 |
| `/blog/cybersecurite-et-recycla` | 8.5 | 26.8 | 8.2 | 0.0 | 0.0 | 16.3 | 7.1 | 0.0 | 62.6 | 0.0 | 10 / 0 |
| `/laval` | 7.8 | 26.8 | 8.2 | 0.0 | 0.0 | 16.3 | 317.2 | 0.0 | 70.2 | 0.0 | 12 / 0 |
| `/faq` | 6.9 | 26.8 | 8.2 | 0.0 | 0.0 | 16.3 | 7.1 | 0.0 | 70.2 | 0.0 | 11 / 0 |
| `/en` | 10.6 | 1727.7 | 566.6 | 0.0 | 0.0 | 16.3 | 596.8 | 659.0 | 77.8 | 0.0 | 40 / 5 |

Chunks de `assets/chunks/` chargés (desktop) :

| Page | Chunks (i = initial, s = après défilement) |
| --- | --- |
| `/` | chunk-7FMWBHZOⁱ (0.6), chunk-GXJ7SPYCⁱ (1.7), chunk-JXIQEI4Uⁱ (3.1), Heroⁱ (4.6), StepsTimelineⁱ (4.4), BinSectionⁱ (3.7), DataDestructionⁱ (2.7), ClosingBinⁱ (1.3), chunk-USJPHMT7ⁱ (0.9), chunk-YESRAG6Sⁱ (0.3), chunk-25HKPAJSⁱ (2.5), chunk-B2M5X6SXⁱ (0.5), chunk-YBDN47BJⁱ (0.2), chunk-OOVSVHCHⁱ (45.2), HeroDevicesⁱ (423.5) |
| `/a-propos` | chunk-7FMWBHZOⁱ (0.6) |
| `/recyclage-ordinateur` | chunk-7FMWBHZOⁱ (0.6) |
| `/destruction-des-disques-durs` | chunk-7FMWBHZOⁱ (0.6) |
| `/destruction-des-donnees` | chunk-7FMWBHZOⁱ (0.6) |
| `/formulaire-de-ramassage` | chunk-7FMWBHZOⁱ (0.6), chunk-GXJ7SPYCⁱ (1.7), chunk-JXIQEI4Uⁱ (3.1), PickupFormⁱ (4.7), chunk-YKGBALLSⁱ (29.7), chunk-25HKPAJSⁱ (2.5), chunk-B2M5X6SXⁱ (0.5), chunk-OOVSVHCHⁱ (45.2) |
| `/contact` | chunk-7FMWBHZOⁱ (0.6), chunk-GXJ7SPYCⁱ (1.7), chunk-JXIQEI4Uⁱ (3.1), ContactFormⁱ (1.9), chunk-YKGBALLSⁱ (29.7), chunk-25HKPAJSⁱ (2.5), chunk-B2M5X6SXⁱ (0.5), chunk-OOVSVHCHⁱ (45.2) |
| `/blog` | chunk-7FMWBHZOⁱ (0.6) |
| `/blog/cybersecurite-et-recycla` | chunk-7FMWBHZOⁱ (0.6) |
| `/laval` | chunk-7FMWBHZOⁱ (0.6) |
| `/faq` | chunk-7FMWBHZOⁱ (0.6) |
| `/en` | chunk-7FMWBHZOⁱ (0.6), chunk-GXJ7SPYCⁱ (1.7), chunk-JXIQEI4Uⁱ (3.1), StepsTimelineⁱ (4.4), Heroⁱ (4.6), DataDestructionⁱ (2.7), ClosingBinⁱ (1.3), BinSectionⁱ (3.7), chunk-USJPHMT7ⁱ (0.9), chunk-YESRAG6Sⁱ (0.3), chunk-25HKPAJSⁱ (2.5), chunk-B2M5X6SXⁱ (0.5), chunk-YBDN47BJⁱ (0.2), chunk-OOVSVHCHⁱ (45.2), HeroDevicesⁱ (423.5) |

### Poids par page — mobile (Ko ; brut / gzip estimé ; « +défil. » = chargé après défilement complet)

| Page | HTML gz | JS brut | JS gzip | dont JS tiers gzip | JS +défil. gzip | CSS gzip | Images (initial) | Images +défil. | Polices | Média +défil. | Requêtes init / +défil. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 10.9 | 1727.7 | 566.6 | 0.0 | 0.0 | 16.3 | 130.5 | 1125.2 | 78.0 | 0.0 | 30 / 15 |
| `/a-propos` | 7.1 | 26.8 | 8.2 | 0.0 | 0.0 | 16.3 | 317.2 | 0.0 | 70.4 | 0.0 | 12 / 0 |
| `/recyclage-ordinateur` | 9.5 | 26.8 | 8.2 | 0.0 | 0.0 | 16.3 | 104.8 | 0.0 | 70.4 | 0.0 | 13 / 0 |
| `/destruction-des-disques-durs` | 8.9 | 26.8 | 8.2 | 0.0 | 0.0 | 16.3 | 146.2 | 0.0 | 70.4 | 0.0 | 13 / 0 |
| `/destruction-des-donnees` | 7.4 | 26.8 | 8.2 | 0.0 | 0.0 | 16.3 | 159.5 | 0.0 | 70.4 | 0.0 | 13 / 0 |
| `/formulaire-de-ramassage` | 7.2 | 510.2 | 159.5 | 0.0 | 0.0 | 16.3 | 7.1 | 0.0 | 70.5 | 0.0 | 19 / 0 |
| `/contact` | 8.8 | 2264.1 | 685.7 | 541.1 | 12.2 | 16.3 | 157.8 | 48.2 | 70.4 | 0.0 | 37 / 10 |
| `/blog` | 8.4 | 26.8 | 8.2 | 0.0 | 0.0 | 16.3 | 141.9 | 0.0 | 70.4 | 0.0 | 12 / 0 |
| `/blog/cybersecurite-et-recycla` | 8.5 | 26.8 | 8.2 | 0.0 | 0.0 | 16.3 | 7.1 | 0.0 | 62.8 | 0.0 | 10 / 0 |
| `/laval` | 7.8 | 26.8 | 8.2 | 0.0 | 0.0 | 16.3 | 317.2 | 0.0 | 70.4 | 0.0 | 12 / 0 |
| `/faq` | 6.9 | 26.8 | 8.2 | 0.0 | 0.0 | 16.3 | 7.1 | 0.0 | 70.4 | 0.0 | 11 / 0 |
| `/en` | 10.6 | 1727.7 | 566.6 | 0.0 | 0.0 | 16.3 | 596.8 | 659.0 | 78.0 | 0.0 | 40 / 5 |

Chunks de `assets/chunks/` chargés (mobile) :

| Page | Chunks (i = initial, s = après défilement) |
| --- | --- |
| `/` | chunk-7FMWBHZOⁱ (0.6), chunk-GXJ7SPYCⁱ (1.7), chunk-JXIQEI4Uⁱ (3.1), Heroⁱ (4.6), StepsTimelineⁱ (4.4), BinSectionⁱ (3.7), DataDestructionⁱ (2.7), ClosingBinⁱ (1.3), chunk-USJPHMT7ⁱ (0.9), chunk-YESRAG6Sⁱ (0.3), chunk-25HKPAJSⁱ (2.5), chunk-B2M5X6SXⁱ (0.5), chunk-YBDN47BJⁱ (0.2), chunk-OOVSVHCHⁱ (45.2), HeroDevicesⁱ (423.5) |
| `/a-propos` | chunk-7FMWBHZOⁱ (0.6) |
| `/recyclage-ordinateur` | chunk-7FMWBHZOⁱ (0.6) |
| `/destruction-des-disques-durs` | chunk-7FMWBHZOⁱ (0.6) |
| `/destruction-des-donnees` | chunk-7FMWBHZOⁱ (0.6) |
| `/formulaire-de-ramassage` | chunk-7FMWBHZOⁱ (0.6), chunk-GXJ7SPYCⁱ (1.7), chunk-JXIQEI4Uⁱ (3.1), PickupFormⁱ (4.7), chunk-YKGBALLSⁱ (29.7), chunk-B2M5X6SXⁱ (0.5), chunk-25HKPAJSⁱ (2.5), chunk-OOVSVHCHⁱ (45.2) |
| `/contact` | chunk-7FMWBHZOⁱ (0.6), chunk-GXJ7SPYCⁱ (1.7), chunk-JXIQEI4Uⁱ (3.1), ContactFormⁱ (1.9), chunk-YKGBALLSⁱ (29.7), chunk-25HKPAJSⁱ (2.5), chunk-B2M5X6SXⁱ (0.5), chunk-OOVSVHCHⁱ (45.2) |
| `/blog` | chunk-7FMWBHZOⁱ (0.6) |
| `/blog/cybersecurite-et-recycla` | chunk-7FMWBHZOⁱ (0.6) |
| `/laval` | chunk-7FMWBHZOⁱ (0.6) |
| `/faq` | chunk-7FMWBHZOⁱ (0.6) |
| `/en` | chunk-7FMWBHZOⁱ (0.6), chunk-GXJ7SPYCⁱ (1.7), chunk-JXIQEI4Uⁱ (3.1), Heroⁱ (4.6), StepsTimelineⁱ (4.4), BinSectionⁱ (3.7), DataDestructionⁱ (2.7), ClosingBinⁱ (1.3), chunk-USJPHMT7ⁱ (0.9), chunk-YESRAG6Sⁱ (0.3), chunk-25HKPAJSⁱ (2.5), chunk-B2M5X6SXⁱ (0.5), chunk-YBDN47BJⁱ (0.2), chunk-OOVSVHCHⁱ (45.2), HeroDevicesⁱ (423.5) |

### Taille des fichiers du build mesuré (Ko)

| Fichier | Brut | Gzip (niv. 6) | md5 |
| --- | --- | --- | --- |
| `chunks/HeroDevices-Y4AYAUH7.js` | 1297.4 | 423.5 | 136324d5 |
| `chunks/hls-C7J4DJNU.js` | 572.5 | 180.2 | 2fd496ff |
| `islands.js` | 205.9 | 63.9 | d54cd79d |
| `chunks/vision_bundle-QYRALJU6.js` | 134.9 | 40.4 | ed08f74f |
| `chunks/chunk-OOVSVHCH.js` | 134.5 | 45.2 | eaf89dcb |
| `chunks/chunk-YKGBALLS.js` | 104.8 | 29.7 | 37744bae |
| `app.css` | 86.1 | 15.2 | 3dffb8d9 |
| `site.js` | 25.8 | 7.6 | 3e5729ff |
| `chunks/PickupForm-7VDAF5YO.js` | 19.3 | 4.7 | 189da944 |
| `chunks/Hero-OLMXXX7Z.js` | 12.1 | 4.6 | c7ac0f6a |
| `chunks/StepsTimeline-OPI7MBZL.js` | 11.0 | 4.4 | b7aa72b2 |
| `chunks/BinSection-TERS6J6O.js` | 9.1 | 3.7 | 83e9d7e5 |
| `chunks/chunk-JXIQEI4U.js` | 8.1 | 3.1 | 1c795a2c |
| `chunks/DataDestruction-RRANA2VD.js` | 6.7 | 2.7 | e5423a4c |
| `chunks/chunk-25HKPAJS.js` | 6.3 | 2.5 | 5ecd2f25 |
| `chunks/ContactForm-FEC7PSOD.js` | 5.3 | 1.9 | 96d7afd3 |
| `chunks/chunk-GXJ7SPYC.js` | 3.8 | 1.7 | b90e2a2e |
| `chunks/ClosingBin-XHZUZXNU.js` | 2.8 | 1.3 | b685631f |
| `chunks/chunk-USJPHMT7.js` | 1.7 | 0.9 | 9c8307cc |
| `chunks/chunk-7FMWBHZO.js` | 1.0 | 0.6 | 73a65f4b |
| `chunks/chunk-B2M5X6SX.js` | 0.8 | 0.5 | 73f88a50 |
| `chunks/chunk-YESRAG6S.js` | 0.5 | 0.3 | 7f942f3d |
| `chunks/chunk-YBDN47BJ.js` | 0.2 | 0.2 | ef16f411 |

### Défilement — Desktop (frame manquée = intervalle > 18 ms)

| Page | Config | fps moy. | % > 16,7 | % > 33 | p95 (ms) | Pire frame (ms) | Long Tasks (nb / total / max ms) | Chargement (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | d1366-cpu1 | 57.2 | 2.2 | 1.5 | 17 | 116.6 | 1 / 126 / 126 | 609 |
| `/` | d1366-cpu4 | 49.4 | 18.6 | 4.3 | 33.4 | 66.7 | 2 / 132 / 71 | 1105 |
| `/` | d1366-cpu6 | 33.4 | 47.3 | 22 | 66.7 | 183.3 | 32 / 2214 / 166 | 1812 |
| `/` | d1920-cpu1 | 60 | 0 | 0 | 17 | 17.2 | 0 / 0 / 0 | 674 |
| `/` | d1920-cpu4 | 50 | 16.8 | 3.5 | 33.4 | 83.5 | 4 / 264 / 86 | 1100 |
| `/` | d1920-cpu6 | 35.5 | 43 | 20.1 | 50.2 | 166.7 | 33 / 2179 / 157 | 1929 |
| `/recyclage-ordinateur` | d1366-cpu1 | 60 | 0 | 0 | 17 | 17.2 | 0 / 0 / 0 | 384 |
| `/recyclage-ordinateur` | d1366-cpu4 | 60 | 0 | 0 | 16.8 | 16.9 | 0 / 0 / 0 | 880 |
| `/recyclage-ordinateur` | d1366-cpu6 | 60 | 0 | 0 | 16.8 | 16.9 | 0 / 0 / 0 | 2383 |
| `/recyclage-ordinateur` | d1920-cpu1 | 60 | 0 | 0 | 17 | 17.1 | 0 / 0 / 0 | 363 |
| `/recyclage-ordinateur` | d1920-cpu4 | 60 | 0 | 0 | 16.8 | 17 | 0 / 0 / 0 | 925 |
| `/recyclage-ordinateur` | d1920-cpu6 | 60 | 0 | 0 | 16.8 | 16.8 | 0 / 0 / 0 | 1428 |
| `/destruction-des-disques-durs` | d1366-cpu1 | 60 | 0 | 0 | 17 | 17.2 | 0 / 0 / 0 | 399 |
| `/destruction-des-disques-durs` | d1366-cpu4 | 60 | 0 | 0 | 16.8 | 16.9 | 0 / 0 / 0 | 877 |
| `/destruction-des-disques-durs` | d1366-cpu6 | 60 | 0 | 0 | 16.8 | 16.8 | 0 / 0 / 0 | 1330 |
| `/destruction-des-disques-durs` | d1920-cpu1 | 60 | 0 | 0 | 17 | 17.2 | 0 / 0 / 0 | 391 |
| `/destruction-des-disques-durs` | d1920-cpu4 | 60 | 0 | 0 | 16.8 | 16.8 | 0 / 0 / 0 | 884 |
| `/destruction-des-disques-durs` | d1920-cpu6 | 59.7 | 0.5 | 0 | 16.8 | 33.4 | 0 / 0 / 0 | 1390 |
| `/laval` | d1366-cpu1 | 60 | 0 | 0 | 17 | 17.1 | 0 / 0 / 0 | 376 |
| `/laval` | d1366-cpu4 | 59 | 0.6 | 0.6 | 16.8 | 66.7 | 1 / 74 / 74 | 823 |
| `/laval` | d1366-cpu6 | 57.9 | 0.5 | 0.5 | 16.8 | 133.4 | 1 / 147 / 147 | 1453 |
| `/laval` | d1920-cpu1 | 60 | 0 | 0 | 17 | 17.2 | 0 / 0 / 0 | 404 |
| `/laval` | d1920-cpu4 | 58.9 | 0.6 | 0.6 | 16.8 | 66.7 | 1 / 69 / 69 | 2352 |
| `/laval` | d1920-cpu6 | 57.4 | 1.7 | 0.6 | 16.8 | 116.6 | 1 / 129 / 129 | 1279 |

### Défilement — Mobile (frame manquée = intervalle > 18 ms)

| Page | Config | fps moy. | % > 16,7 | % > 33 | p95 (ms) | Pire frame (ms) | Long Tasks (nb / total / max ms) | Chargement (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | m390-cpu4-4g | 53.6 | 10.3 | 1.8 | 33.3 | 66.7 | 2 / 120 / 70 | 2989 |
| `/` | m360-cpu4-4g | 53.4 | 11.1 | 1.3 | 33.3 | 83.3 | 2 / 138 / 87 | 2949 |
| `/recyclage-ordinateur` | m390-cpu4-4g | 60 | 0 | 0 | 16.8 | 16.9 | 0 / 0 / 0 | 2592 |
| `/recyclage-ordinateur` | m360-cpu4-4g | 60 | 0 | 0 | 16.8 | 16.8 | 0 / 0 / 0 | 2459 |
| `/destruction-des-disques-durs` | m390-cpu4-4g | 60 | 0 | 0 | 16.8 | 16.8 | 0 / 0 / 0 | 4726 |
| `/destruction-des-disques-durs` | m360-cpu4-4g | 60 | 0 | 0 | 16.7 | 16.9 | 0 / 0 / 0 | 2792 |
| `/laval` | m390-cpu4-4g | 59.1 | 0.5 | 0.5 | 16.8 | 66.6 | 1 / 75 / 75 | 3067 |
| `/laval` | m360-cpu4-4g | 59.1 | 0.5 | 0.5 | 16.8 | 66.7 | 1 / 72 / 72 | 3078 |

### Défilement — sections les plus saccadées (% frames > seuil, par config, sections ≥ 10 frames)

| Page / config | Section (plage scrollY) | Frames | % > 16,7 | % > 33 | Pire (ms) | Long Tasks |
| --- | --- | --- | --- | --- | --- | --- |
| home / d1366-cpu1 | #2 island=StepsTimeline (2638–4609) | 58 | 14 | 9 | 66.5 | 0 (0 ms) |
| home / d1366-cpu1 | #0 island=Hero (0–2365) | 72 | 1 | 1 | 116.6 | 1 (126 ms) |
| home / d1366-cpu4 | #4 island=DataDestruction (5857–7434) | 48 | 73 | 8 | 50.1 | 0 (0 ms) |
| home / d1366-cpu4 | #5 "Partout dans le Grand Montréal" (7434–8071) | 20 | 65 | 15 | 49.9 | 0 (0 ms) |
| home / d1366-cpu4 | #0 island=Hero (0–2365) | 75 | 29 | 15 | 66.7 | 2 (132 ms) |
| home / d1366-cpu6 | #0 island=Hero (0–2365) | 64 | 94 | 45 | 183.3 | 10 (773 ms) |
| home / d1366-cpu6 | #4 island=DataDestruction (5857–7434) | 48 | 94 | 71 | 133.2 | 20 (1314 ms) |
| home / d1366-cpu6 | #5 "Partout dans le Grand Montréal" (7434–8071) | 19 | 79 | 32 | 83.4 | 1 (72 ms) |
| home / d1920-cpu4 | #4 island=DataDestruction (8322–10595) | 74 | 59 | 11 | 50.1 | 0 (0 ms) |
| home / d1920-cpu4 | #0 island=Hero (0–3409) | 98 | 26 | 7 | 83.5 | 3 (199 ms) |
| home / d1920-cpu4 | #5 "Partout dans le Grand Montréal" (10595–11232) | 22 | 14 | 0 | 33.3 | 0 (0 ms) |
| home / d1920-cpu6 | #0 island=Hero (0–3409) | 92 | 85 | 42 | 166.7 | 15 (1065 ms) |
| home / d1920-cpu6 | #5 "Partout dans le Grand Montréal" (10595–11232) | 16 | 81 | 31 | 66.6 | 2 (127 ms) |
| home / d1920-cpu6 | #4 island=DataDestruction (8322–10595) | 72 | 76 | 47 | 83.3 | 12 (748 ms) |
| home / m390-cpu4-4g | #6 "Rien n’est perdu." (7744–8974) | 23 | 57 | 9 | 50 | 1 (50 ms) |
| home / m390-cpu4-4g | #4 island=DataDestruction (5482–6943) | 27 | 52 | 7 | 66.6 | 0 (0 ms) |
| home / m390-cpu4-4g | #5 "Partout dans le Grand Montréal" (6943–7744) | 16 | 38 | 6 | 50 | 0 (0 ms) |
| home / m360-cpu4-4g | #4 island=DataDestruction (5303–6711) | 26 | 58 | 12 | 49.9 | 1 (51 ms) |
| home / m360-cpu4-4g | #5 "Partout dans le Grand Montréal" (6711–7512) | 16 | 56 | 0 | 33.4 | 0 (0 ms) |
| home / m360-cpu4-4g | #6 "Rien n’est perdu." (7512–8792) | 28 | 32 | 4 | 50.1 | 0 (0 ms) |
| destruction-disques / d1920-cpu6 | #5 "Détruisez vos disques durs en to" (4166–4704) | 16 | 6 | 0 | 33.4 | 0 (0 ms) |
| ville-laval / d1366-cpu4 | #1 "Ce que nous récupérons à Laval" (690–1384) | 21 | 5 | 5 | 66.7 | 1 (74 ms) |
| ville-laval / d1366-cpu6 | #1 "Ce que nous récupérons à Laval" (690–1384) | 28 | 4 | 4 | 133.4 | 1 (147 ms) |
| ville-laval / d1920-cpu4 | #0 "Recyclage informatique et électr" (0–690) | 14 | 7 | 7 | 66.7 | 1 (69 ms) |
| ville-laval / d1920-cpu6 | #0 "Recyclage informatique et électr" (0–690) | 10 | 10 | 10 | 116.6 | 0 (0 ms) |
| ville-laval / d1920-cpu6 | #3 "Autres villes desservies" (1970–2387) | 13 | 8 | 0 | 33.3 | 0 (0 ms) |
| ville-laval / d1920-cpu6 | #1 "Ce que nous récupérons à Laval" (690–1384) | 36 | 3 | 0 | 33.3 | 1 (129 ms) |
| ville-laval / m390-cpu4-4g | #1 "Ce que nous récupérons à Laval" (1008–1920) | 25 | 4 | 4 | 66.6 | 1 (75 ms) |
| ville-laval / m360-cpu4-4g | #1 "Ce que nous récupérons à Laval" (1038–1998) | 26 | 4 | 4 | 66.7 | 1 (72 ms) |

### Navigation : du clic sur l'accueil à la page suivante (ms)

| Profil | Lien | Clic → début nav. | Clic → TTFB | Clic → FCP | Clic → LCP | Clic → load |
| --- | --- | --- | --- | --- | --- | --- |
| desktop-cpu4 | `/a-propos` | 4 | 690 | 908 | 1608 | 866 |
| desktop-cpu4 | `/recyclage-ordinateur` | 4 | 15 | 252 | 952 | 251 |
| desktop-cpu4 | `/formulaire-de-ramassage` | 6 | 330 | 518 | 1018 | 526 |
| desktop-cpu4 | `/contact` | 4 | 16 | 244 | 976 | 976 |
| mobile-cpu4 | `/a-propos` | 5 | 288 | 485 | 1169 | 454 |
| mobile-cpu4 | `/recyclage-ordinateur` | 4 | 18 | 232 | 932 | 224 |
| mobile-cpu4 | `/formulaire-de-ramassage` | 3 | 322 | 571 | 971 | 607 |
| mobile-cpu4 | `/contact` | 4 | 16 | 228 | 960 | 926 |
| mobile-cpu4-4g | `/a-propos` | 5 | 336 | 1721 | 2821 | 2803 |
| mobile-cpu4-4g | `/recyclage-ordinateur` | 6 | 163 | 1462 | 2146 | 1460 |
| mobile-cpu4-4g | `/formulaire-de-ramassage` | 5 | 161 | 1469 | 2137 | 2346 |
| mobile-cpu4-4g | `/contact` | 6 | 163 | 1962 | 2494 | 3087 |

### Latence d'interaction (Event Timing, seuil 16 ms ; « < 16 » = aucune entrée ≥ 16 ms)

| Profil | Interaction | Échantillons (ms) | Max (≈ INP) |
| --- | --- | --- | --- |
| desktop-cpu4 | sousMenuServices | 96, 56, 48 | 96 |
| desktop-cpu4 | accordeonFaq | 56, 24, 24 | 56 |
| desktop-cpu4 | formulaire (focus / frappe) | focus 40 ; frappe 32 (72 entrées) | 40 |
| mobile-cpu4 | menuMobile | 88, 40, 40 | 88 |
| mobile-cpu4 | accordeonFaq | 56, 40, 40 | 56 |
| mobile-cpu4 | formulaire (focus / frappe) | focus 32 ; frappe 32 (53 entrées) | 32 |

### WebKit (Playwright Windows, profil iPhone 13) — PAS Safari iOS

| Page | fps moy. | % > 16,7 | % > 33 | Pire (ms) | Chargement (ms) |
| --- | --- | --- | --- | --- | --- |
| `/` | 20.4 | 79.3 | 55.3 | 275 | 187 |
| `/recyclage-ordinateur` | 25.1 | 67.7 | 34.4 | 188 | 165 |

## Limites et ce qui n'a pas été mesuré

- **iPhone / Safari iOS : non mesuré** (pas d'appareil iOS). Le test WebKit ci-dessus utilise le WebKit Windows de Playwright (v27.2, profil iPhone 13, sans ralentissement CPU, sans Long Tasks). Il donne **20 fps sur l'accueil mais aussi 25 fps sur `/recyclage-ordinateur`**, une page qui tourne à 60 fps dans Chrome même en CPU 6x : ce moteur headless est lui-même limité, donc ces chiffres ne disent rien de fiable sur Safari iOS.
- **INP réel** : non mesurable en labo ; on donne TBT (Lighthouse) et la latence Event Timing de 3 interactions scriptées (≈ INP). Les interactions < 16 ms ne sont pas rapportées par l'API.
- **Compression et cache** : absents en local (serveur PHP intégré, `.htaccess` non appliqué). Les temps sous 4G lent incluent donc des fichiers non compressés (ex. `HeroDevices` 1,3 Mo au lieu d'environ 424 Ko).
- **GPU** : CPU ralenti mais GPU de bureau (RTX 4060) ; le rendu three.js d'un vrai téléphone sera plus lent que ce qui est mesuré.
- **Élément LCP de l'accueil** : Lighthouse 13 n'a pas renvoyé de nœud pour l'accueil FR (mobile et desktop « ? » ou un `<p>` dans le héros) ; LCP ≈ FCP en mobile (2,14 s).
- **Serveur partagé / mono-thread** : un autre serveur PHP (lancé à 15:24 avec `display_errors=1`, même dossier) écoutait déjà sur le port 8080 ; les requêtes ont pu être servies par l'un ou l'autre (même code). Il n'a pas été arrêté (pas lancé par cette mesure). Les TTFB de 300–700 ms sur certains clics de navigation viennent de la file d'attente du serveur mono-thread (requêtes de l'accueil encore en cours), pas du PHP lui-même (TTFB normal : 15–18 ms).
- **Build modifié pendant la mesure** : les assets ont été regénérés par un autre processus à 15:54 puis 15:58:07 (nouveaux `PickupForm-7VDAF5YO.js`, `ContactForm-FEC7PSOD.js`). Seule la 1re passe Lighthouse de l'accueil mobile chevauche ce moment (chunks de l'accueil identiques) ; toutes les autres mesures portent sur le build de 15:58:07.
- **Variance** : 3 passes seulement sur 3 pages ; une passe Lighthouse sur les autres. Plages observées : score accueil mobile 62–64, desktop 57–67 ; formulaire mobile 62–74 (CLS 0–0,30 selon la passe).
