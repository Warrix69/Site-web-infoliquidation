# Analyse statique de performance — version PHP (base de référence)

Branche `performance-optimization`, code lu le 2026-11-25. Lecture seule : aucune modification.
Chemins relatifs à la racine du projet. Les tailles « gz » sont mesurées avec `gzip -9` sur `php/public/assets/` (build du jour).

Poids JS actuels : `islands.js` 211 Ko (65 Ko gz, React DOM) · chunk framer-motion 138 Ko (46 Ko gz) · chunk react-hook-form/zod 107 Ko (30 Ko gz) · `HeroDevices` 1,33 Mo (433 Ko gz, three.js + r3f + drei + postprocessing) · `site.js` 26 Ko (8 Ko gz) · `app.css` 88 Ko (15 Ko gz).

---

## ÉLEVÉ

### E1. Le héros de l'accueil n'existe qu'après le JavaScript : LCP bloqué par une chaîne de 4-5 requêtes JS
- **Où** : `php/app/views/pages/home.php:23-29` (contenu de secours), `:32` (îlot Hero) ; `php/js/islands.tsx:22-37` (montage par `createRoot`, qui remplace le HTML de secours) ; `php/app/views/layout.php:35-37` ; `src/components/home/Hero.tsx:144-151` (image `hero-studio.webp`).
- **Appareil** : les deux (pire sur mobile).
- **Pourquoi** : le HTML PHP ne contient qu'un titre sur fond vert uni, sans l'image de fond. L'image `hero-studio.webp` (prioritaire) et le vrai titre n'apparaissent qu'après : `islands.js` → ses imports statiques → `Hero-*.js` → chunk framer-motion et autres → montage React. Aucun `<link rel="preload">` ni `modulepreload`, donc chaque niveau coûte au moins un aller-retour réseau. Le nouveau `<h1>` et l'image sont de nouveaux nœuds : ils deviennent le candidat LCP au moment du montage. L'animation CSS du titre redémarre aussi à ce moment.
- **Correction** :
  1. Dans `$heroFallback`, reproduire la structure du héros React : piste `h-[300vh] lg:h-[360vh] motion-reduce:h-auto`, bloc `sticky h-[100svh]`, `<img src="/images/hero-studio.webp" fetchpriority="high" …>` avec les mêmes classes et le même dégradé. L'image est alors peinte dès le HTML, et le nœud React (même taille, déjà en cache) ne crée pas de nouveau LCP plus grand.
  2. Ajouter dans `$head` de l'accueil : `<link rel="preload" as="image" href="/images/hero-studio.webp" fetchpriority="high">`.
  3. Faire écrire un manifeste par `php/build.mjs` (option `metafile: true` d'esbuild), puis émettre des `<link rel="modulepreload">` pour `islands.js`, le chunk `Hero-*` et ses dépendances statiques sur l'accueil (et pour `PickupForm`/`ContactForm` sur leurs pages).
- **Risque visuel** : faible. Seul l'état avant montage change, et il se rapproche du rendu final (aujourd'hui l'image apparaît d'un coup après le JS).

### E2. three.js (433 Ko gz) téléchargé et évalué dès le chargement, même sur mobile
- **Où** : `src/components/home/Hero.tsx:63-89` (ligne 86 : `import("./HeroDevices")` dans le premier `useEffect`, minuterie de 600 ms ligne 87) ; `src/components/home/HeroDevices.tsx:3-5` (postprocessing importé statiquement) et `:105-117` (`gl.compile` des 5 appareils).
- **Appareil** : surtout mobile (Lighthouse mobile émule un pointeur « coarse », donc le mode « low » télécharge quand même toute la 3D).
- **Pourquoi** : 1,33 Mo de JS (433 Ko gz) partent en même temps que les images et les polices. Avec la limitation 4G de Lighthouse, ça fait environ 2 s de bande passante. Ensuite viennent l'évaluation du module, la création du contexte WebGL et la compilation de shaders `MeshPhysicalMaterial` (clearcoat), qui produisent des tâches longues sur le fil principal (TBT et INP). `EffectComposer`, `N8AO`, `Bloom` et `SMAA` ne servent qu'en mode « high » (ordinateur), mais ils sont dans le même chunk et donc aussi téléchargés sur mobile.
- **Correction** :
  - (a) Sans effet visuel : mettre le post-traitement dans un composant séparé, chargé par `lazy()` seulement si `quality === "high"`. Le chunk mobile perd postprocessing + N8AO (gain à mesurer).
  - (b) À valider : sur mobile seulement, lancer `import("./HeroDevices")` après l'événement `load` + `requestIdleCallback`, au lieu de le faire dès le montage. La 3D apparaîtrait un peu plus tard.
  - (c) `React.memo` sur `SafeHeroDevices`/`HeroCopy`, pour que le `setDevice` (`HeroDevices.tsx:198-201`) ne re-rende pas tout le héros pendant le scroll.
- **Risque visuel** : (a) et (c) aucun. (b) à valider avec Anthony.

### E3. Compression serveur incomplète : le JS risque de partir non compressé, et pas de Brotli
- **Où** : `php/public/.htaccess:37-39`.
- **Appareil** : les deux.
- **Pourquoi** : seul `application/javascript` est déclaré. Selon la version d'Apache ou de cPanel, `.js` peut être servi en `text/javascript` (type officiel depuis la RFC 9239). Dans ce cas, `islands.js` et le chunk 3D partent bruts : 1,33 Mo au lieu de 433 Ko. Il n'y a pas non plus de Brotli, `.mjs`/`text/plain`/`application/xml` (sitemap) ne sont pas listés, et rien n'est prévu si `mod_deflate` est absent.
- **Correction** : `AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/x-javascript application/json image/svg+xml application/xml text/xml text/plain`. Ajouter un bloc `<IfModule mod_brotli.c> AddOutputFilterByType BROTLI_COMPRESS …</IfModule>`. Option : précompresser `.br`/`.gz` dans `build.mjs` et les servir par réécriture.
- **Risque visuel** : aucun.
- **À vérifier en une commande** : `curl -sI -H "Accept-Encoding: br, gzip" https://<domaine>/assets/islands.js` doit répondre avec un en-tête `Content-Encoding`. On ne peut pas le vérifier en local avec `php -S`.

### E4. 3D sur ordinateur : rendu continu à 60 i/s avec N8AO + Bloom + SMAA jusqu'à DPR 2, pendant toute la piste de 360vh
- **Où** : `src/components/home/HeroDevices.tsx:33` (`dpr={[1, 2]}`), `:37` (`frameloop="always"` en mode high), `:73-79` (EffectComposer avec `enableNormalPass`) ; seuil « high » dans `Hero.tsx:78-83`.
- **Appareil** : desktop, en particulier les portables à GPU intégré (8 cœurs et 8 Go suffisent pour obtenir « high ») et les écrans Retina.
- **Pourquoi** : la scène est redessinée à chaque image, même immobile, à cause de l'oscillation `Math.sin(t*0.3)` et de `<Float>`. Sur un écran 2× qui couvre 56 % de la largeur, le N8AO avec passe de normales double le rendu de la scène. Lenis fait défiler par le fil principal, donc le moindre retard GPU ou JS se voit en saccade pendant tout l'épinglage du héros.
- **Correction** :
  - Sans effet visuel : `frameloop="demand"` quand `prefers-reduced-motion` est actif, car la scène est alors statique mais elle est redessinée quand même.
  - À valider : plafonner le DPR à 1,5 en mode high ; ajouter `<PerformanceMonitor>` de drei pour baisser le DPR ou couper N8AO si les i/s chutent ; limiter l'oscillation à 30 i/s.
- **Risque visuel** : à valider avec Anthony (netteté et qualité de l'occlusion ambiante sur les machines faibles).

---

## MOYEN

### M1. Ruban des villes : 40 pastilles avec `backdrop-filter` qui bougent à chaque image
- **Où** : `php/app/lib/components.php:67-75` (`glass-light` sur chaque ville, 20 villes × 2 avec le clone) ; `src/app/globals.css:173-177` (`backdrop-filter: blur(10px)`) ; boucle `php/js/site.ts:286-298`.
- **Appareil** : les deux (lourd sur GPU mobile).
- **Pourquoi** : chaque élément avec `backdrop-filter` qui se déplace oblige le GPU à refaire un flou de l'arrière-plan à chaque image, ici 40 fois. Le fond de la section est uni (`bg-sand`), donc le flou ne change rien à l'image affichée.
- **Correction** : retirer `backdrop-filter` des pastilles du ruban seulement, avec une variante de classe sans flou qui garde le même fond `rgba(10,10,10,.04)` et la même bordure. Complément : mettre en cache `half.offsetWidth` (`site.ts:289`) avec un `ResizeObserver` au lieu de le lire à chaque image.
- **Risque visuel** : aucun (flou sur fond uni), à confirmer d'un coup d'œil.

### M2. DataDestruction : copie et `putImageData` du canevas entier à chaque image, en DPR 2
- **Où** : `src/components/home/DataDestruction.tsx:58` (`dpr = min(2, …)`), `:126-149` (`buf.set(base)` puis boucles de pixels puis `ctx.putImageData`), `:152-166`.
- **Appareil** : les deux (mobile surtout).
- **Pourquoi** : à chaque image de scroll, le code recopie W×H×DPR²×4 octets (environ 6,7 Mo pour 700×600 en DPR 2), remplit les fragments pixel par pixel en JS, puis renvoie toute l'image au GPU. Tout ça se fait sur le fil principal pendant le défilement. La boucle s'arrête bien quand le scroll se stabilise : c'est déjà bien.
- **Correction** :
  - Sans effet visuel : dessiner l'image de base avec `drawImage`, effacer les cases détachées avec `clearRect`, et dessiner les fragments en vol avec `fillStyle` + `globalAlpha` + `fillRect`. Le canevas est accéléré par le GPU et il n'y a plus de transfert d'image complète.
  - À valider : DPR 1,5 sur mobile.
- **Risque visuel** : faible (même rendu de blocs pleins). Le changement de DPR est à valider.

### M3. Tous les îlots sont montés au chargement, même loin sous la ligne de flottaison, et leurs espaces réservés n'ont pas la bonne hauteur
- **Où** : `php/js/islands.tsx:22-37` ; espaces réservés dans `php/app/views/pages/home.php:53-58` (StepsTimeline : titre seul, alors que la piste fait 280vh/300vh), `:62` (BinSection : `min-h-[100svh]`, réel 170vh/190vh), `:65` (DataDestruction : `100svh`, réel 220vh/240vh), `:148` ; héros `100svh` alors que le réel fait 300vh/360vh.
- **Appareil** : les deux.
- **Pourquoi** : au démarrage, React monte 5 sections. Il télécharge leurs chunks et leurs images, crée les `IntersectionObserver`, `ResizeObserver` et canevas, et décode l'image du disque dur, tout ça en concurrence avec le héros. La page grandit d'environ 6 à 7 hauteurs d'écran au montage, ce qui casse aussi la restauration du scroll au retour arrière et les liens d'ancre.
- **Correction** : donner à chaque espace réservé la hauteur réelle de la piste (mêmes classes `h-[…vh] motion-reduce:h-auto`), puis monter les îlots hors écran avec un `IntersectionObserver` (`rootMargin` ≈ 1 écran) ou `requestIdleCallback`. Le héros reste monté tout de suite.
- **Risque visuel** : faible si les hauteurs correspondent. À vérifier en scroll rapide (une section ne doit jamais apparaître vide).

### M4. Photos des en-têtes de pages en 1920 px servies au mobile, sans srcset
- **Où** : `php/app/lib/components.php:29-33` (photo `fetchpriority="high"`, sans `srcset`/`sizes`/`width`/`height`) ; utilisées par `a-propos`, `blog`, `informations`, `matieres-recyclables`, `procedure-de-recuperation` et les 20 pages `ville` (×2 langues) : `centre/allee.webp` 310 Ko, `centre/matieres.webp` 224 Ko, `centre/etabli.webp` 135 Ko, tous en 1920×1080.
- **Appareil** : mobile.
- **Pourquoi** : sur un téléphone, la photo s'affiche sur environ 335 px CSS (670 px en 2×). On télécharge donc environ 3 fois trop d'octets, et en haute priorité, sur des pages d'atterrissage SEO, ce qui retarde le LCP.
- **Correction** : générer au build des variantes 640, 960 et 1280 px (par exemple avec `sharp` dans `build.mjs`) et ajouter `srcset` et `sizes="(min-width:1024px) 40vw, 100vw"`.
- **Risque visuel** : aucun (même image, résolution adaptée).

### M5. Images des îlots : l'émulation de `next/image` sert toujours l'original, sans srcset
- **Où** : `php/js/shims/next-image.tsx:15-30` (pas de `srcSet` ; `sizes` est transmis mais ne sert à rien sans srcset) ; images du bac `php/public/images/bac/*.webp` (560 px, 30 à 73 Ko chacune ; `bac-plein.webp` 900×1485, 136 Ko) affichées à environ 60-150 px dans `BinSection`/`ClosingBin` ; `objets/camionnette-logo.webp` 1200 px.
- **Appareil** : mobile surtout.
- **Pourquoi** : la version Next.js redimensionnait ces images (`/_next/image` d'après `sizes`), mais la version PHP envoie les originaux. Le commit « images du bac différées et redimensionnées » ne s'applique donc pas ici.
- **Correction** : générer au build des variantes de largeur (par exemple 160, 320 et 640 px) et faire produire `srcSet` par l'émulation à partir de `width` et `sizes`.
- **Risque visuel** : aucun.

### M6. Polices Google : feuille tierce bloquante, 3 familles et 10 graisses
- **Où** : `php/app/views/layout.php:12-14`.
- **Appareil** : les deux.
- **Pourquoi** : le premier affichage attend le CSS de `fonts.googleapis.com` (DNS + TLS vers 2 domaines tiers), puis les fichiers de `fonts.gstatic.com`. Avec `display=swap`, le titre géant en Poppins change de police en cours de route, ce qui peut produire un décalage (CLS). Inter 500 et 600 sont peu utilisés, et JetBrains Mono ne sert qu'à 3 endroits (`font-manifest`). Note Loi 25 : chaque visite envoie l'IP du visiteur à Google.
- **Correction** : auto-héberger les woff2 latins (mêmes fichiers Google) dans `public/fonts/`, avec `@font-face` + `font-display: swap`, précharger Poppins 700 et Inter 400, et charger JetBrains Mono seulement où il sert. Option : police de secours ajustée (`size-adjust`) pour réduire le décalage au changement de police.
- **Risque visuel** : aucun (mêmes polices). La police de secours ajustée est à valider.

### M7. Titres des en-têtes de pages invisibles tant que site.js n'a pas tourné
- **Où** : `php/app/lib/components.php:13` (`reveal()` sur le bloc qui contient le `<h1>`) ; `php/css/php.css:19-29` (`.js [data-reveal]{opacity:0}`) ; `php/js/site.ts:120-146`.
- **Appareil** : les deux (mobile surtout).
- **Pourquoi** : sur toutes les pages intérieures, le `<h1>` (souvent l'élément LCP) reste à `opacity:0` jusqu'à l'exécution du module `site.js` et au déclenchement de l'`IntersectionObserver`. Le LCP dépend donc du JS. Le filet de sécurité n'arrive qu'à 1500 ms.
- **Correction** : pour le bloc du héros de page, utiliser une animation CSS qui démarre au premier affichage (comme `.hero-item` dans `globals.css:320-336`) plutôt que l'observateur JS.
- **Risque visuel** : à valider avec Anthony (même effet de montée, mais déclenché par le CSS).

### M8. Arrivée de la camionnette (étape 3) : flou SVG recalculé à chaque image, plus fumée en canevas DPR 2
- **Où** : `src/components/home/StepsTimeline.tsx:363-366` (`setAttribute("stdDeviation")` + `style.filter = url(#…)` à chaque image, sur une image qui a déjà un `drop-shadow`), `:302` et `:380-399` (canevas plein cadre en DPR 2), `:436` (roues en `backdrop-blur-[3px]`), `:176-181` (transition de panneau animée en `filter: blur(6px)` + `y`, donc calculée par JS chez Framer).
- **Appareil** : les deux (mobile surtout).
- **Pourquoi** : un filtre SVG sur du HTML force un nouveau rendu de l'élément à chaque image, sur le fil principal ou en rastérisation. Ça arrive en même temps que la transition floutée du panneau, pendant un scroll épinglé.
- **Correction** : plafonner le canevas de fumée à DPR 1,5 sur mobile. Le reste (remplacer le flou SVG par une image floutée précalculée qu'on fait apparaître en fondu ; retirer `filter` des transitions de panneau) modifie l'effet.
- **Risque visuel** : DPR faible. Le reste est à valider avec Anthony.

### M9. Formulaires : rien d'utilisable avant environ 145 Ko gz de JS, puis décalage de mise en page
- **Où** : `php/app/views/pages/formulaire-de-ramassage.php:70` et `:99` ; `php/app/views/pages/contact.php:46` et `:124` (secours = un simple paragraphe `glass`). Le chunk `PickupForm` importe framer-motion (138 Ko) et react-hook-form/zod (107 Ko), en plus de React DOM (211 Ko).
- **Appareil** : mobile surtout.
- **Pourquoi** : le formulaire, élément clé de conversion, apparaît tard. En remplaçant un paragraphe court par un long formulaire, il pousse le contenu en dessous (la carte Google sur la page contact), ce qui donne probablement du CLS.
- **Correction** : donner au secours une `min-height` proche de celle du formulaire, et ajouter `modulepreload` (voir E1). À plus long terme : formulaire HTML rendu en PHP, amélioré ensuite par le JS.
- **Risque visuel** : faible pour la `min-height`.

### M10. Aucun préchargement des pages internes
- **Où** : `php/app/views/layout.php` (rien).
- **Appareil** : les deux.
- **Pourquoi** : le site PHP est multipage. Chaque clic attend la réponse du serveur, puis le CSS, les polices et le JS (en cache, mais réévalués).
- **Correction** : `<script type="speculationrules">{"prefetch":[{"where":{"and":[{"href_matches":"/*"},{"not":{"href_matches":"/(api|admin)/*"}}]},"eagerness":"moderate"}]}</script>` (Chromium seulement, sans effet ailleurs). Éviter `prerender` sur l'accueil, qui lancerait la 3D en arrière-plan. La CSP actuelle (`index.php:15`) ne bloque pas les scripts en ligne.
- **Risque visuel** : aucun.

### M11. En-tête fixe avec `backdrop-blur` au-dessus de tout le contenu qui défile
- **Où** : `php/app/views/partials/header.php:21` (`bg-paper/95 backdrop-blur transition-all`), `:56` (`glass-light` sur le bouton du menu).
- **Appareil** : mobile.
- **Pourquoi** : le GPU refait le flou de la zone sous l'en-tête à chaque image de scroll, sur toutes les pages. Avec un fond opaque à 95 %, le flou est presque invisible.
- **Correction** : `bg-paper` opaque, ou garder le flou seulement à partir de `lg:`.
- **Risque visuel** : faible, à valider (la différence à 95 % d'opacité est à peine perceptible).

---

## FAIBLE

### F1. `tilt` actif sur écran tactile et lecture de mise en page à chaque `mousemove`
- **Où** : `php/js/site.ts:198-213`, `will-change-transform` permanent dans `php/app/lib/view.php:107` (cartes du blog et des matières), aussi `:101` et `:138`.
- **Appareil** : mobile (tilt déclenché par le `mousemove` émulé au toucher, puis bloqué) et desktop (`getBoundingClientRect` à chaque événement, qui peut arriver plusieurs fois par image).
- **Correction** : ne pas activer si `!finePointer` ; mettre en cache le rect au `pointerenter` et regrouper les mises à jour dans un `requestAnimationFrame` ; poser `will-change` seulement au survol.
- **Risque visuel** : aucun sur desktop. Sur mobile, l'inclinaison parasite au toucher disparaît.

### F2. Écouteur de scroll de la 3D actif toute la vie de la page
- **Où** : `src/components/home/HeroDevices.tsx:135-161`.
- **Appareil** : les deux.
- **Pourquoi** : à chaque événement de scroll, même loin sous le héros, le code fait un `querySelector` puis un `getBoundingClientRect` sans passer par un `requestAnimationFrame`.
- **Correction** : mettre en cache l'élément et ne rien faire quand `active` est faux.
- **Risque visuel** : aucun.

### F3. Boucle `requestAnimationFrame` de Lenis permanente, et défilement par le fil principal
- **Où** : `php/js/site.ts:21-35`.
- **Appareil** : desktop.
- **Pourquoi** : la boucle tourne même au repos (coût minime). Surtout, avec Lenis, le scroll dépend du fil principal : la moindre tâche longue (3D, M2, M8) se voit en saccade.
- **Correction** : `autoRaf: true` (Lenis ≥ 1.1) ou arrêter la boucle au repos. Le reste se règle en allégeant les tâches citées plus haut.
- **Risque visuel** : aucun.

### F4. Accordéon animé en `height`
- **Où** : `php/js/site.ts:235-257`.
- **Appareil** : les deux.
- **Pourquoi** : la hauteur est une animation de mise en page (350 ms), seulement au clic. Coût faible.
- **Correction** : laisser, ou passer à `grid-template-rows: 0fr → 1fr`.
- **Risque visuel** : à valider.

### F5. `transition-all` et `box-shadow` animés
- **Où** : `header.php:21` (l'ombre change au scroll > 24 px), `view.php:46` (`primary_button` : `transition-all` + `hover:shadow-glow-lg` + `brightness`), `StepsTimeline.tsx:104` (`box-shadow`), points du héros `Hero.tsx:199` (`width`).
- **Appareil** : desktop surtout.
- **Pourquoi** : repeints ponctuels, sans boucle.
- **Correction** : remplacer `transition-all` par une liste de propriétés explicite.
- **Risque visuel** : aucun.

### F6. Champs de formulaire en 14 px : zoom automatique sur iOS
- **Où** : `src/components/forms/PickupForm.tsx:145-146` et l'input quantité `:405-414` (`text-sm`) ; `src/components/forms/ContactForm.tsx:66-67`.
- **Appareil** : mobile iOS.
- **Pourquoi** : iOS zoome sur tout champ dont la police fait moins de 16 px, ce qui décale la page et donne une impression de lenteur. Les types sont corrects (`email`, `tel`, `number` + `inputMode`). Le code postal pourrait avoir `autoCapitalize="characters"`.
- **Correction** : `text-base sm:text-sm` sur les champs.
- **Risque visuel** : à valider avec Anthony (texte de 16 px dans les champs sur mobile).

### F7. Zones de toucher de moins de 44 px
- **Où** : `php/app/views/partials/lang-switcher.php:8` (FR/EN `px-2.5 py-1 text-xs`, environ 26 px) ; téléphone de la barre du haut `header.php:13` (texte de 12 px, sans hauteur propre) ; boutons − / + `PickupForm.tsx:397-404` (`h-8 w-8`, 32 px) ; menu `header.php:56` (40 px).
- **Appareil** : mobile.
- **Correction** : agrandir la zone cliquable sans changer le dessin (padding + marge négative, ou pseudo-élément `::after` agrandi).
- **Risque visuel** : faible, à valider.

### F8. Images non versionnées avec cache `immutable` d'un an
- **Où** : `php/public/.htaccess:31-35`, alors que `asset()` (`php/app/lib/view.php:173-178`) ne sert qu'à `app.css`, `site.js` et `islands.js`.
- **Constat** : pour `app.css`, `site.js` et `islands.js`, le `?v=filemtime` est présent ; les chunks esbuild ont un hash. Donc pas de risque de JS ou CSS périmé. En revanche, les `/images/*` et `/logo.png` ne sont pas versionnés. Si une image est remplacée sous le même nom (par exemple `objets/camionnette.webp`, en cours de modification), les visiteurs qui reviennent garderont l'ancienne jusqu'à un an.
- **Effet secondaire** : `build.mjs:19` vide `assets/` avant de reconstruire. Un onglet resté ouvert sur l'ancienne version qui charge un îlot après le déploiement aura un 404 sur le chunk, et l'îlot restera sur son contenu de secours (pas de `.catch` dans `islands.tsx:31`).
- **Correction** : passer les images par `asset()` (ou un hash) ou réduire leur `max-age` ; garder les anciens chunks un déploiement de plus.
- **Risque visuel** : aucun.

### F9. Coût PHP par requête
- **Où** : `php/app/lib/i18n.php:24-31`.
- **Pourquoi** : `json_decode` de `fr.json` (80 Ko) à chaque page, et aucun cache de page alors que les pages publiques sont statiques par langue. C'est probablement 1 à 2 ms : le temps de réponse sur un hébergement mutualisé dépend surtout du serveur.
- **Correction** : générer `messages/fr.php` (`var_export`), que l'OPcache garde en mémoire ; ou un cache de page sur disque pour les pages GET publiques.
- **Risque visuel** : aucun.

### F10. Divers
- `liste-matieres.png` : PNG de 1600×1392 (356 Ko) affiché sur 176 px CSS (`php/app/views/pages/matieres-recyclables.php:35`). Le convertir en WebP de 440 px donnerait environ 20 Ko. Risque : aucun.
- Logo en `fetchpriority="high"` sur toutes les pages (`header.php:24`) : sur l'accueil, il passerait devant l'image du héros si celle-ci est mise dans le HTML (E1). Le passer en priorité normale. Risque : aucun.
- Chunks `hls-*.js` (586 Ko) et `vision_bundle-*.js` (138 Ko) générés par esbuild (imports dynamiques de drei éliminés) mais référencés par aucun fichier : aucun coût pour les visiteurs, seulement du poids au déploiement. Les supprimer en post-build ou les marquer `external`. Risque : aucun.
- Mobile : le `mask-image` du conteneur 3D (`Hero.tsx:173`) recompose le masque à chaque rendu du canevas WebGL. Coût probablement faible (voir hypothèses).
- Tous les matériaux 3D passent en `transparent = true` (`HeroDevices.tsx:173`), et le mobile utilise des `MeshPhysicalMaterial` avec clearcoat (`:264-320`). Passer en `MeshStandardMaterial` sur mobile serait plus léger. Risque : à valider (aspect du reflet).

---

## Déjà bien fait
- `islands.js` n'est chargé que sur les pages qui ont un îlot (`layout.php:35-37`), et chaque îlot est un `import()` séparé : les pages sans îlot ne chargent pas React.
- Pas de JS bloquant : `site.js` et `islands.js` sont en `type="module"` (différés), il n'y a qu'un mini-script en ligne pour `no-js→js`, et `preconnect` est déjà là pour Google Fonts.
- Contournement du cache correct pour les points d'entrée (`asset()` + `?v=filemtime`), chunks hachés par esbuild.
- Repli sur appareil faible déjà en place : `Hero.tsx:63-77` (`saveData`, 2g/3g, `deviceMemory ≤ 2`, `hardwareConcurrency ≤ 2`, pas de WebGL) affiche une image fixe sans télécharger three.js. Le mode « low » (`Hero.tsx:78-83`) s'active sur tactile, sous 1024 px ou à 4 cœurs ou 4 Go maximum : DPR 1,25, `frameloop="demand"`, pas de post-traitement. Il y a aussi un repli si le contexte WebGL est perdu, et le rendu 3D est coupé hors écran (`IntersectionObserver` → `frameloop="never"`).
- Environnement 3D généré localement (`resolution 128, frames 1`), matériaux collectés une seule fois, précompilation des shaders pour éviter les à-coups au changement d'appareil.
- BinSection, DataDestruction et ClosingBin : `requestAnimationFrame` seulement pendant le mouvement, écouteurs `passive`, mises en pause par `IntersectionObserver`, dimensions mises en cache par `ResizeObserver`, lectures avant écritures dans la même image. Ruban mis en pause hors écran.
- Animations du héros, de la révélation au scroll, des titres mot par mot, du menu mobile, du menu Services et de la bannière : en `transform`/`opacity` uniquement (gérées par le compositeur).
- `prefers-reduced-motion` est respecté partout : CSS (`php.css:51-55`, `globals.css:344-346` et `:382-390`), Lenis désactivé, compteurs, ruban, pistes épinglées (`motion-reduce:h-auto`), 3D.
- Lenis est désactivé sur tactile (pointeur non « fine »), donc le défilement mobile reste natif.
- Unités `svh`/`dvh` pour les sections épinglées et le menu (aucun `100vh` problématique trouvé).
- Images en WebP pour la plupart, `width`/`height` et `loading="lazy"` + `decoding="async"` sous la ligne de flottaison, iframe de la carte en `lazy`. L'image du héros est légère (24 Ko).
- Tailwind v4 limite `hover:` aux appareils qui ont un vrai survol, donc pas d'état de survol qui reste bloqué au toucher.
- Pas de session PHP ni de cookie sur les pages publiques.

## Hypothèses à confirmer par les mesures
1. **Élément LCP de l'accueil et son moment** (mobile et desktop) : est-ce le `<h1>` de secours ou l'image et le titre montés par React ? Mesurer l'écart entre le premier affichage et le montage de l'îlot Hero (E1).
2. **CLS au montage** : héros (100svh → 300vh), formulaires (secours → formulaire, page contact), passage de Poppins (M6). Probablement faible sur l'accueil (contenu sous l'écran), probablement réel sur la page contact.
3. **Compression en production** : `Content-Encoding` sur `assets/*.js` et le type MIME envoyé pour `.js` (E3).
4. **iPhone** : WebKit pourrait renvoyer un `navigator.hardwareConcurrency` réduit. Si c'est ≤ 2, tous les iPhone reçoivent l'image fixe au lieu de la 3D (`Hero.tsx:73`). À vérifier sur un vrai appareil : comportement voulu ou non ?
5. **Temps d'image GPU sur desktop** pendant l'épinglage du héros, sur un portable à GPU intégré en DPR 2, avec et sans N8AO (E4).
6. **Tâches longues sur mobile** : évaluation de three.js, création du contexte et `gl.compile` (E2) ; poids du post-traitement dans le chunk 3D (gain de E2a).
7. **Coût du `backdrop-filter`** du ruban (M1) et de l'en-tête (M11) : panneau Rendering → Layers / Frame rendering stats sur mobile.
8. **Temps d'image de DataDestruction** pendant le scroll (M2) et de l'arrivée de la camionnette (M8).
9. **Temps de réponse serveur** sur l'hébergement réel (F9) : la part du PHP est probablement négligeable.
10. **`hls-*.js` et `vision_bundle-*.js` jamais demandés** (onglet Réseau) (F10).
11. **Coût du `mask-image`** sur le canevas 3D mobile (F10).
