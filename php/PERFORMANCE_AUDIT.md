# Audit de performance — version PHP du site — PHASE 1 (mesure de base)

Date des mesures : 2026-11-25. Aucune optimisation n'a encore été faite : ce rapport décrit le site **tel qu'il est aujourd'hui**.
Sources des chiffres : `php/perf-audit/baseline-measures.md` (mesures), `php/perf-audit/raw/` (données brutes), `php/perf-audit/baseline-issues.md` (analyse du code).

---

## 0. Résumé

- **Sur ordinateur, le site est rapide** : toutes les pages ont 97 à 100 sur 100 dans Lighthouse, sauf l'accueil (67, et 56 pour `/en`) et le formulaire de ramassage (78).
- **Sur mobile, c'est plus faible** : l'accueil a 64 (43 pour `/en`), les autres pages ont entre 69 et 94. Sur presque toutes les pages, le titre principal s'affiche trop tard (LCP de 2,8 à 6,3 s, objectif : moins de 2,5 s).
- **L'accueil est la page problème** : le téléphone reste « occupé » 4,2 s (TBT), et le défilement saccade quand le processeur est lent (33 i/s et 47 % d'images manquées sur ordinateur ralenti 6 fois).
- **Causes principales** : (1) l'animation 3D du héros (1 297 Ko de JavaScript, 424 Ko compressés) est téléchargée et lancée dès l'arrivée, même sur téléphone ; (2) la section « destruction des données » et le ruban des villes recalculent beaucoup d'images pendant le défilement ; (3) les titres des pages intérieures restent invisibles tant que le JavaScript n'a pas tourné ; (4) le formulaire de ramassage fait sauter le pied de page à l'affichage (CLS 0,43 sur ordinateur).
- **Ce qui va déjà bien** : les clics (menu, sous-menu, FAQ, formulaire) répondent en moins de 100 ms ; le changement de page est rapide ; les pages intérieures défilent à 60 i/s même avec un processeur 6 fois plus lent ; les appareils faibles reçoivent déjà une image fixe au lieu de la 3D ; les préférences « réduire les animations » sont respectées.

---

## 1. Lighthouse (note sur 100 et indicateurs clés)

**Ce que veulent dire les colonnes**
- **Performance** : note globale de Lighthouse. Objectif : **90 ou plus**.
- **LCP** : temps avant que le plus gros élément visible (souvent le titre ou la grande photo) soit affiché. Objectif : **moins de 2,5 s**.
- **CLS** : à quel point la page « saute » pendant qu'elle se charge. Objectif : **moins de 0,1**.
- **TBT** : temps total pendant lequel le navigateur est trop occupé pour réagir à un clic. Objectif : **bas** (Lighthouse le juge bon sous 200 ms).
- **INP** (réactivité réelle aux clics) : **ne se mesure pas en laboratoire**, seulement chez de vrais visiteurs. On utilise donc le TBT comme indicateur, et la latence maximale mesurée sur de vrais clics scriptés (section 4).

Les valeurs **en gras** ratent l'objectif. Pour `/`, `/recyclage-ordinateur` et `/formulaire-de-ramassage`, c'est la médiane de 3 passes (plage min–max entre parenthèses) ; les autres pages : 1 passe.

### Ordinateur (desktop)

| Page | Performance | LCP | CLS | TBT (ms) |
| --- | --- | --- | --- | --- |
| `/` (accueil) | **67** (57–67) | 1,26 s (1,23–2,36) | 0,001 | **1 302** (1 253–1 453) |
| `/a-propos` | 99 | 0,94 s | 0,001 | 0 |
| `/recyclage-ordinateur` | 99 (96–99) | 0,87 s | 0,001 | 0 |
| `/destruction-des-disques-durs` | 99 | 0,86 s | 0,001 | 0 |
| `/destruction-des-donnees` | 100 | 0,79 s | 0,001 | 0 |
| `/formulaire-de-ramassage` | **78** (78–78) | 1,18 s (1,14–1,21) | **0,430** (identique sur les 3 passes) | 0 |
| `/contact` | 97 | 1,30 s | 0,001 | 0 |
| `/blog` | 99 | 0,83 s | 0,001 | 0 |
| `/blog/cybersecurite-et-recycla…` | 98 | 0,84 s | 0,001 | 0 |
| `/laval` | 99 | 0,98 s | 0,001 | 0 |
| `/faq` | 99 | 0,83 s | 0,001 | 0 |
| `/en` (accueil anglais) | **56** | 2,42 s | 0,000 | **1 232** |

### Mobile (téléphone Android émulé, 4G lente, processeur 4 fois plus lent)

| Page | Performance | LCP | CLS | TBT (ms) |
| --- | --- | --- | --- | --- |
| `/` (accueil) | **64** (62–64) | 2,14 s (2,13–2,14) | 0,001 | **4 244** (3 795–4 263) |
| `/a-propos` | **85** | **4,21 s** | 0,027 | 0 |
| `/recyclage-ordinateur` | 91 (90–92) | **3,27 s** (3,19–3,28) | 0,013 | 0 (0–103) |
| `/destruction-des-disques-durs` | 90 | **3,35 s** | 0,023 | 0 |
| `/destruction-des-donnees` | 91 | **3,36 s** | 0,000 | 0 |
| `/formulaire-de-ramassage` | **69** (62–74) | **5,82 s** (5,80–5,85) | 0,000 (**0,301** sur une passe) | 98 (70–122) |
| `/contact` | **75** | **6,33 s** | 0,000 | 113 |
| `/blog` | **88** | **3,61 s** | 0,022 | 115 |
| `/blog/cybersecurite-et-recycla…` | 93 | **3,01 s** | 0,000 | 0 |
| `/laval` | **83** | **4,37 s** | 0,000 | 108 |
| `/faq` | 94 | **2,84 s** | 0,017 | 0 |
| `/en` (accueil anglais) | **43** | **6,10 s** | 0,000 | **4 924** |

À noter :
- Sur `/en` mobile, l'élément le plus gros détecté est la **bannière de témoins** (Lighthouse simule une 1re visite et ne la masque pas).
- Sur l'accueil FR mobile, le LCP (2,14 s) est égal au premier affichage : le problème de l'accueil n'est pas le LCP mais le **TBT** (le téléphone est bloqué par le JavaScript).

---

## 2. Taille du JavaScript par page

« Brut » = taille du fichier ; « gzip » = taille une fois compressée par le serveur (calculée, car le serveur local ne compresse pas).

| Page | JS brut (Ko) | JS gzip (Ko) | dont JS tiers gzip (Ko) |
| --- | --- | --- | --- |
| `/` et `/en` | 1 727,7 | 566,6 | 0 |
| `/contact` | 2 264,1 | 685,7 | 541,1 (Google Maps) |
| `/formulaire-de-ramassage` | 510,2 | 159,5 | 0 |
| Toutes les autres pages | 26,8 | 8,2 | 0 |

Les pages sans formulaire ni accueil ne chargent que 8,2 Ko compressés : c'est très léger.

### Gros fichiers et leur rôle

| Fichier | Brut / gzip (Ko) | Rôle | Chargé sur |
| --- | --- | --- | --- |
| `HeroDevices-Y4AYAUH7.js` | 1 297 / 424 | Moteur 3D du héros (three.js et ses extensions, dont les effets visuels de post-traitement) | `/` et `/en`, **dès l'arrivée, aussi sur mobile** |
| `islands.js` | 206 / 64 | React (fait fonctionner les blocs interactifs) | accueil, formulaire, contact |
| `chunk-OOVSVHCH.js` | 135 / 45 | framer-motion (animations) | accueil, formulaire, contact |
| `chunk-YKGBALLS.js` | 105 / 30 | Validation des formulaires | formulaire, contact |
| `site.js` | 26 / 8 | Petit JS du site + défilement doux (Lenis) | toutes les pages |
| Google Maps (iframe, tiers) | environ 1,6 Mo brut | Carte | `/contact` |

### Fichiers jamais chargés

| Fichier | Brut / gzip (Ko) | Constat |
| --- | --- | --- |
| `hls-C7J4DJNU.js` | 573 / 180 | Aucun fichier ne le demande : **aucun coût pour les visiteurs**, seulement du poids sur le serveur. |
| `vision_bundle-QYRALJU6.js` | 135 / 40 | Idem. |

---

## 3. Défilement avec un processeur ralenti (ordinateur)

On simule un ordinateur plus lent (processeur 4 fois et 6 fois plus lent) et on fait défiler la page à vitesse constante.
- **i/s** = images par seconde (60 = parfaitement fluide).
- **% images manquées** = part des images arrivées en retard (l'œil voit une saccade).
- **Tâches longues** = moments où le navigateur est bloqué plus de 50 ms.

Écran 1366 px de large :

| Page | Processeur | i/s moyen | % images manquées | Pire image (ms) | Tâches longues (nombre / total) |
| --- | --- | --- | --- | --- | --- |
| `/` | normal | 57,2 | 2,2 | 116,6 | 1 / 126 ms |
| `/` | 4x plus lent | 49,4 | 18,6 | 66,7 | 2 / 132 ms |
| `/` | **6x plus lent** | **33,4** | **47,3** | 183,3 | **32 / 2 214 ms** |
| `/recyclage-ordinateur` | 6x plus lent | 60 | 0 | 16,9 | 0 |
| `/destruction-des-disques-durs` | 6x plus lent | 60 | 0 | 16,8 | 0 |
| `/laval` | 6x plus lent | 57,9 | 0,5 | 133,4 | 1 / 147 ms |

Écran 1920 px de large, accueil : 60 i/s (normal), 50 i/s et 16,8 % (4x), 35,5 i/s et 43 % (6x, 33 tâches longues, 2 179 ms).

**Seul l'accueil saccade.** Les sections en cause (écran 1366 px) :

| Section de l'accueil | Processeur | % images manquées | Tâches longues |
| --- | --- | --- | --- |
| Héros 3D épinglé (haut de page) | 6x | **94 %** | 10 (773 ms) |
| Destruction des données (DataDestruction) | 6x | **94 %** | 20 (1 314 ms) |
| « Partout dans le Grand Montréal » (ruban des villes) | 6x | 79 % | 1 (72 ms) |
| Destruction des données | 4x | 73 % | 0 |
| « Partout dans le Grand Montréal » | 4x | 65 % | 0 |
| Étapes / arrivée de la camionnette (StepsTimeline) | normal | 14 % | 0 |

---

## 4. Changement de page et réactivité aux clics

### Du clic sur l'accueil à l'affichage de la page suivante

« Premier affichage » = la page commence à apparaître ; « contenu principal » = le titre est visible (LCP).

| Profil | Page ouverte | Clic → premier affichage | Clic → contenu principal |
| --- | --- | --- | --- |
| Ordinateur (processeur 4x) | `/recyclage-ordinateur` | 252 ms | 952 ms |
| Ordinateur (processeur 4x) | `/contact` | 244 ms | 976 ms |
| Mobile (processeur 4x) | `/recyclage-ordinateur` | 232 ms | 932 ms |
| Mobile (processeur 4x) | `/contact` | 228 ms | 960 ms |
| Mobile (processeur 4x + 4G lente) | `/recyclage-ordinateur` | 1 462 ms | 2 146 ms |
| Mobile (processeur 4x + 4G lente) | `/a-propos` | 1 721 ms | 2 821 ms |
| Mobile (processeur 4x + 4G lente) | `/contact` | 1 962 ms | 2 494 ms |

Sans réseau lent, la page suivante commence à s'afficher en environ 230–260 ms. Le titre arrive toujours **environ 700 ms après** le premier affichage : c'est le temps de l'animation d'apparition du titre (voir problème M7).
Certains clics vers `/a-propos` et `/formulaire-de-ramassage` ont été plus lents (premier affichage 485–908 ms) à cause du serveur local qui ne traite qu'une requête à la fois (voir section 8), pas du site lui-même.

### Réactivité aux clics (processeur 4x plus lent)

| Interaction | Ordinateur (pire) | Mobile (pire) |
| --- | --- | --- |
| Ouverture du menu mobile | — | 88 ms |
| Sous-menu Services | 96 ms | — |
| Accordéon de la FAQ | 56 ms | 56 ms |
| Formulaire (clic dans un champ / frappe) | 40 ms | 32 ms |

**Tout est sous 200 ms** (seuil considéré comme bon) : les clics sont réactifs.

---

## 5. Mobile

- **Lighthouse mobile** : voir le tableau mobile de la section 1.
- **Android milieu de gamme émulé** (processeur 4x plus lent + 4G lente, écrans 390 et 360 px) :

| Page | Écran | i/s moyen | % images manquées | Pire image (ms) |
| --- | --- | --- | --- | --- |
| `/` | 390 px | 53,6 | 10,3 | 66,7 |
| `/` | 360 px | 53,4 | 11,1 | 83,3 |
| `/recyclage-ordinateur` | 390 / 360 px | 60 | 0 | 16,9 / 16,8 |
| `/destruction-des-disques-durs` | 390 / 360 px | 60 | 0 | 16,8 / 16,9 |
| `/laval` | 390 / 360 px | 59,1 | 0,5 | 66,6 / 66,7 |

  Sur l'accueil mobile, les saccades se concentrent dans : la destruction des données (52–58 % d'images manquées), « Partout dans le Grand Montréal » (38–56 %) et « Rien n'est perdu » (32–57 %).

- **iPhone / Safari : NON MESURÉ.** Il n'y a pas d'iPhone ni de Mac disponible pour ce test. Un essai a été fait avec le moteur WebKit (celui de Safari) dans sa version Windows, mais il n'est **pas fiable** : il donne 20 i/s sur l'accueil et aussi 25 i/s sur `/recyclage-ordinateur`, une page qui tourne à 60 i/s partout ailleurs, même avec un processeur 6 fois plus lent. Ce moteur de test est donc lent par lui-même et ses chiffres ne disent rien sur un vrai iPhone.

---

## 6. Liste des problèmes

Repris de l'analyse du code (`baseline-issues.md`) et reliés aux mesures.
Colonne « Mesure » : **confirmé** = un chiffre le montre ; **non mesuré** = rien dans les mesures ne permet de trancher ; **contredit / nuancé** = les chiffres ne vont pas dans le sens de l'analyse.

### ÉLEVÉ

| N° | Problème | Fichier | Appareil | Correction proposée | Risque visuel | Mesure |
| --- | --- | --- | --- | --- | --- | --- |
| E1 | Le héros de l'accueil n'apparaît qu'après le chargement de plusieurs fichiers JavaScript | `php/app/views/pages/home.php:23-32`, `php/js/islands.tsx:22-37` | les deux | Mettre l'image et la structure du héros directement dans le HTML ; précharger l'image et les fichiers JS du héros | faible | **Nuancé** : sur l'accueil mobile, le LCP (2,14 s) est déjà égal au premier affichage, sous l'objectif. Le vrai problème mesuré de l'accueil est le TBT (4,2 s), pas le LCP. |
| E2 | La 3D (424 Ko compressés) est téléchargée et lancée dès l'arrivée, même sur mobile | `src/components/home/Hero.tsx:63-89`, `src/components/home/HeroDevices.tsx:3-5` | surtout mobile | (a) séparer les effets visuels réservés à l'ordinateur ; (b) sur mobile, lancer la 3D après le chargement de la page ; (c) éviter de redessiner tout le héros pendant le défilement | (a), (c) aucun ; (b) à valider | **Confirmé** : chargée aussi en profil mobile ; TBT mobile 4,2 s (accueil) et 4,9 s (`/en`) ; plus longue tâche 2,95 s. |
| E3 | Compression serveur incomplète (le JS risque de partir non compressé) | `php/public/.htaccess:37-39` | les deux | Compléter la liste des types compressés, ajouter Brotli | aucun | **Non mesuré** (le serveur local ne compresse jamais). À vérifier sur l'hébergement réel. |
| E4 | 3D sur ordinateur : redessinée en continu avec des effets lourds pendant tout le héros | `src/components/home/HeroDevices.tsx:33-79` | desktop | Arrêter le redessin si « réduire les animations » est actif ; limiter la netteté et les effets sur machines faibles | à valider | **Confirmé** côté processeur : 94 % d'images manquées dans le héros (6x). Le coût de la carte graphique n'est pas mesuré (voir section 8). |

### MOYEN

| N° | Problème | Fichier | Appareil | Correction proposée | Risque visuel | Mesure |
| --- | --- | --- | --- | --- | --- | --- |
| M1 | Ruban des villes : 40 pastilles avec effet de flou qui bougent en permanence | `php/app/lib/components.php:67-75`, `php/js/site.ts:286-298` | les deux | Retirer le flou des pastilles (fond uni, il ne se voit pas) | aucun (à confirmer d'un coup d'œil) | **Confirmé** : section « Partout dans le Grand Montréal » 65 % (4x) et 79 % (6x) d'images manquées sur ordinateur, 38–56 % sur mobile. |
| M2 | Section destruction des données : toute l'image du canevas recopiée à chaque image | `src/components/home/DataDestruction.tsx:58-166` | les deux | Dessiner autrement (même rendu) ; option : moins de netteté sur mobile | faible ; netteté à valider | **Confirmé** : 94 % d'images manquées et 20 tâches longues (6x) ; 52–58 % sur mobile. Section la plus saccadée. |
| M3 | Tous les blocs interactifs de l'accueil démarrent au chargement ; leurs espaces réservés n'ont pas la bonne hauteur | `php/js/islands.tsx:22-37`, `php/app/views/pages/home.php:53-148` | les deux | Bonnes hauteurs d'emblée, démarrer les blocs à l'approche de l'écran | faible | **Non mesuré** séparément (contribue probablement au TBT de l'accueil). CLS de l'accueil mesuré bas (0,001). |
| M4 | Photos d'en-tête en 1920 px envoyées aux téléphones | `php/app/lib/components.php:29-33` | mobile | Versions plus petites de la même photo selon l'écran | aucun | **Cohérent** : `/a-propos` et `/laval` chargent 317,2 Ko d'images au départ, LCP mobile 4,21 s et 4,37 s. |
| M5 | Images des blocs interactifs toujours envoyées en taille originale | `php/js/shims/next-image.tsx:15-30` | surtout mobile | Versions plus petites générées au build | aucun | **Non mesuré** séparément (accueil : 1 118–1 125 Ko d'images chargées en défilant). |
| M6 | Polices Google : feuille externe bloquante, 3 familles, 10 graisses | `php/app/views/layout.php:12-14` | les deux | Héberger les mêmes polices sur le site, ne charger que le nécessaire | aucun (police de secours ajustée : à valider) | **Non mesuré** séparément (polices : 60–112 Ko par page). |
| M7 | Titres des pages intérieures invisibles tant que le JavaScript n'a pas tourné | `php/app/lib/components.php:13`, `php/css/php.css:19-29`, `php/js/site.ts:120-146` | les deux, surtout mobile | Faire démarrer l'animation du titre par le CSS dès l'affichage | à valider | **Confirmé** : le titre est l'élément LCP sur la plupart des pages intérieures (LCP mobile 2,84–6,33 s), et il arrive toujours environ 700 ms après le premier affichage. |
| M8 | Arrivée de la camionnette : flou recalculé à chaque image + fumée en haute résolution | `src/components/home/StepsTimeline.tsx:176-436` | les deux | Moins de netteté pour la fumée sur mobile ; le reste modifie l'effet | netteté faible ; reste à valider | **Partiel** : seule saccade visible à vitesse normale (14 % dans StepsTimeline), mais pas parmi les pires sections en 4x/6x. |
| M9 | Formulaires : rien d'utilisable avant le JavaScript, puis la page saute | `php/app/views/pages/formulaire-de-ramassage.php:70,99`, `php/app/views/pages/contact.php:46,124` | surtout mobile | Réserver la hauteur du formulaire ; précharger ses fichiers | faible | **Confirmé pour le formulaire de ramassage** : CLS 0,43 sur ordinateur (le pied de page bouge), LCP mobile 5,82 s. **Contredit pour `/contact`** : CLS mesuré 0,000–0,001, contrairement à ce que l'analyse supposait. |
| M10 | Aucun préchargement des pages internes | `php/app/views/layout.php` | les deux | Demander au navigateur de précharger les pages au survol des liens | aucun | **Nuancé** : en local, le changement de page est déjà rapide (230–260 ms) ; le gain se verrait surtout en 4G (1,5–2,0 s). |
| M11 | Barre du haut avec effet de flou au-dessus de tout le contenu | `php/app/views/partials/header.php:21,56` | mobile | Fond opaque, ou flou seulement sur grand écran | faible, à valider | **Non mesurable ici** (le coût est sur la carte graphique, non ralentie ; les pages intérieures sont à 60 i/s). |

### FAIBLE

| N° | Problème | Fichier | Appareil | Correction proposée | Risque visuel | Mesure |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Effet d'inclinaison des cartes actif au toucher, calculs à chaque mouvement de souris | `php/js/site.ts:198-213`, `php/app/lib/view.php:101-138` | les deux | Désactiver au toucher, regrouper les calculs | aucun (mobile : l'inclinaison parasite disparaît) | non mesuré |
| F2 | Écouteur de défilement de la 3D actif même loin du héros | `src/components/home/HeroDevices.tsx:135-161` | les deux | Ne rien faire hors du héros | aucun | non mesuré |
| F3 | Boucle du défilement doux (Lenis) permanente | `php/js/site.ts:21-35` | desktop | Arrêter la boucle au repos | aucun | non mesuré |
| F4 | Accordéon animé en hauteur | `php/js/site.ts:235-257` | les deux | Laisser, ou autre technique d'animation | à valider | **Cohérent** : accordéon FAQ 56 ms au pire, coût faible. |
| F5 | Transitions « tout » et ombres animées | `header.php:21`, `view.php:46`, `StepsTimeline.tsx:104`, `Hero.tsx:199` | surtout desktop | Lister les propriétés animées | aucun | non mesuré |
| F6 | Champs de formulaire en 14 px : zoom automatique sur iPhone | `src/components/forms/PickupForm.tsx:145-146,405-414`, `src/components/forms/ContactForm.tsx:66-67` | mobile iOS | Texte des champs en 16 px sur mobile | à valider | non mesuré (pas d'iPhone) |
| F7 | Zones de toucher de moins de 44 px | `lang-switcher.php:8`, `header.php:13,56`, `PickupForm.tsx:397-404` | mobile | Agrandir la zone cliquable sans changer le dessin | faible, à valider | non mesuré |
| F8 | Images gardées un an en cache sans numéro de version | `php/public/.htaccess:31-35`, `php/app/lib/view.php:173-178` | les deux | Versionner les images ou réduire la durée de cache | aucun | non mesuré (cache absent en local) |
| F9 | Coût PHP par requête (lecture des traductions à chaque page) | `php/app/lib/i18n.php:24-31` | les deux | Mettre les traductions en cache | aucun | **Cohérent** : temps de réponse du serveur normal 15–18 ms. |
| F10 | Divers : PNG trop gros (`liste-matieres.png`), priorité du logo, fichiers JS inutilisés, masque et matériaux 3D | voir `baseline-issues.md` F10 | les deux | Convertir l'image, baisser la priorité du logo, supprimer les fichiers inutiles ; matériaux 3D plus légers sur mobile | aucun ; matériaux 3D à valider | **Confirmé** pour les fichiers inutilisés : `hls` et `vision_bundle` jamais chargés. |

### Constats des mesures absents de l'analyse

- **Google Maps sur `/contact`** : environ 1,6 Mo de JavaScript tiers (541,1 Ko compressés), LCP mobile 6,33 s. L'analyse du code ne le classe pas ; aucune correction n'est encore proposée.
- **Bannière de témoins** : c'est l'élément LCP de `/en` mobile (6,10 s) lors d'une 1re visite.
- **Le planificateur de React** (`chunk-GXJ7SPYC`, 4 Ko) concentre 6,5 s de temps de script dans Lighthouse mobile de l'accueil : ce petit fichier exécute le rendu de tous les blocs interactifs, ce qui va dans le sens de M3 et E2.

### Petites différences de chiffres entre l'analyse et les mesures

L'analyse donne `HeroDevices` à 1,33 Mo / 433 Ko compressés, `hls` à 586 Ko et `vision_bundle` à 138 Ko ; les mesures donnent 1 297 / 424 Ko, 573 Ko et 135 Ko. L'écart vient de la méthode (compression maximale `gzip -9` contre niveau 6, et calcul des Ko). Il ne change aucune conclusion. Ce rapport utilise les chiffres des mesures.

---

## 7. Questions pour Anthony avant la phase 2

Ces corrections peuvent changer un peu l'apparence du site. Rien ne sera fait sans ton accord.

1. **3D sur téléphone (E2 b)** : accepterais-tu que l'animation 3D apparaisse un peu plus tard sur téléphone (après le chargement de la page), pour que le téléphone ne soit plus bloqué au départ ?
2. **3D sur ordinateur (E4)** : peut-on rendre la 3D légèrement moins nette et alléger les ombres sur les ordinateurs moins puissants quand ils ralentissent ?
3. **Matériaux 3D sur mobile (F10)** : peut-on utiliser des reflets un peu plus simples sur les appareils 3D, sur téléphone seulement ?
4. **Destruction des données (M2)** : peut-on dessiner cette animation un peu moins nette sur téléphone ?
5. **Camionnette (M8)** : peut-on simplifier les effets de flou de l'arrivée de la camionnette et des panneaux ? (L'effet changerait légèrement.)
6. **Titres des pages (M7)** : la même animation de montée des titres, mais déclenchée par le navigateur dès l'affichage plutôt que par le JavaScript : est-ce acceptable ?
7. **Barre du haut (M11)** : peut-on retirer l'effet de flou de la barre du haut sur téléphone ? (Elle est déjà presque opaque, la différence est à peine visible.)
8. **Champs de formulaire (F6)** : sur téléphone, peut-on afficher le texte des champs en 16 px (un peu plus gros) pour éviter le zoom automatique de l'iPhone ?
9. **Zones de toucher (F7)** : peut-on agrandir la zone cliquable de FR/EN, du téléphone, des boutons − / + et du menu, sans changer leur dessin ?
10. **Accordéon FAQ (F4)** : faut-il changer la technique d'animation de l'accordéon, ou le laisser tel quel (coût faible) ?
11. **Petites corrections à risque faible** (E1 héros dans le HTML, M2 nouvelle façon de dessiner, M3 démarrage différé des blocs, M9 hauteur réservée du formulaire, M6 police de secours ajustée) : on les fait et tu valides en regardant le résultat ?

Les corrections sans risque visuel (E2 a et c, E3, M1, M4, M5, M6, M10, F1, F2, F3, F5, F8, F9, et F10 sauf les matériaux 3D) peuvent se faire sans changer l'apparence.

---

## 8. Limites de la mesure

- **Serveur local simplifié** : le serveur PHP de test ne compresse pas les fichiers et n'applique pas le fichier `.htaccess` (pas de cache). Les temps sous 4G lente sont donc plus pessimistes qu'en production (par exemple, la 3D est envoyée à 1,3 Mo au lieu d'environ 424 Ko).
- **Carte graphique non ralentie** : le ralentissement simule un processeur lent, mais la carte graphique de ce PC (NVIDIA RTX 4060) reste rapide. Sur un vrai téléphone, la 3D et les effets de flou seront plus lents que mesuré.
- **Pas d'iPhone** : aucune mesure fiable sur Safari iOS (voir section 5).
- **Deux serveurs sur le même port** : un autre serveur PHP (même dossier, même code) écoutait déjà sur le port 8080 pendant une partie des mesures ; certaines requêtes ont pu passer par l'un ou l'autre. Le serveur ne traite qu'une requête à la fois, ce qui explique quelques temps de réponse de 300–700 ms lors des changements de page (au lieu de 15–18 ms normalement).
- **Build modifié pendant la mesure** : les fichiers du site ont été regénérés par un autre processus à 15:54 puis 15:58. La 1re passe Lighthouse mobile de l'accueil s'est faite sur l'ancien build (fichiers de l'accueil identiques) ; toutes les autres mesures portent sur le build de 15:58.
- **Fichiers d'autres sessions** : `php/0`, `php/SECURITY_AUDIT_FINDINGS.md`, `php/SECURITY_MAP.md` et `php/SECRETS_AUDIT.md` sont apparus pendant l'audit. Ils viennent d'autres travaux et n'ont aucun lien avec cette mesure.
- **Peu de répétitions** : 3 passes Lighthouse sur 3 pages, 1 passe sur les autres. Les notes varient d'une passe à l'autre (accueil mobile 62–64, accueil ordinateur 57–67, formulaire mobile 62–74).
- **INP réel** : impossible à mesurer en laboratoire (voir section 1).

---

## 9. Comment relancer les mesures (pour la phase 3)

1. Démarrer le serveur PHP local (dans un autre terminal), depuis la racine du projet :
   ```
   "C:/Users/Admin/AppData/Local/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/php.exe" -d extension_dir=.../ext -d extension=curl -d extension=openssl -d extension=mbstring -S localhost:8080 -t php/public php/public/index.php
   ```
2. Lancer toutes les mesures (poids, Lighthouse, défilement, interactions, WebKit), depuis la racine du projet :
   - PowerShell : `$env:TAG="apres"; node php/perf-audit/scripts/run-all.mjs`
   - bash : `TAG=apres node php/perf-audit/scripts/run-all.mjs`
3. Produire les tableaux : `node php/perf-audit/scripts/make-tables.mjs apres` (résultat dans `php/perf-audit/raw/apres-tables.md`).

Pour sauter une étape : `SKIP=lighthouse,scroll` (noms possibles : `check, weight, lighthouse, scroll, interactions, webkit, tables`).
Conseil : s'assurer qu'aucun autre serveur n'utilise le port 8080 et qu'aucun build ne tourne pendant la mesure.

---

## Phase 3 — AVANT / APRÈS

Date : 2026-11-25. Branche `performance-optimization`.

**Sources.** AVANT = `php/perf-audit/raw/avant-*` (et `avant-tables.md`). APRÈS = `php/perf-audit/raw/apres-*` (et `apres-tables.md`), plus deux passes de plus pour l'accueil (`apres2-*`, `apres3-*`).
**Conditions APRÈS.** Build `node php/build.mjs` du HEAD. Serveur PHP intégré seul sur le port 8090. Mêmes scripts que pour AVANT.
**Passes.** Lighthouse : médiane de 3 passes pour `/`, `/recyclage-ordinateur` et `/formulaire-de-ramassage`, 1 passe pour les autres pages (comme AVANT). Les 3 passes APRÈS sont très proches (écart de 1 point au plus).
Défilement de l'accueil, navigation et clics : médiane de 3 passes APRÈS. AVANT n'a qu'une passe pour ces mesures.

### Résumé

- **Mobile : l'accueil passe de 44 à 67.** Le premier affichage arrive plus tôt (FCP 2,13 s → 1,68 s). Mais le téléphone reste occupé plus de 4 s (TBT 3 520 → 4 416 ms). Le travail du processeur, lui, ne change pas : le TBT monte parce que la même tâche 3D tombe maintenant dans sa fenêtre de calcul (voir « Enquête sur les reculs »).
- **Pages intérieures : 91 à 96 sur mobile** (sauf formulaire 65 et contact 75), **100 sur ordinateur** (sauf contact 98 et formulaire 80). Le FCP mobile gagne environ 0,4 s partout.
- **Le LCP mobile des pages intérieures reste au-dessus de 2,5 s** (2,7 à 3,4 s ; contact 7,8 s ; formulaire 5,3 s).
- **Le formulaire de ramassage saute toujours** (CLS 0,40 ordinateur, 0,30 mobile).
- **Défilement de l'accueil avec processeur 6x plus lent : inchangé.** La mesure ci-dessous donnait 33,1 → 27,6 i/s à 1366 px. En passes alternées dans la même période : 29,0 → 29,8 i/s. L'écart venait de la charge de la machine.
- **Changement de page depuis l'accueil : plus lent qu'avant** (+70 à +160 ms jusqu'au premier affichage sans limite réseau). Cause : les polices auto-hébergées (`3504ac4`), qui donnent aussi le 44 → 67 de l'accueil. Gardées.
- **WebKit (pas Safari iOS) : défilement de l'accueil 20,9 → 10,4 i/s.** Cause : les speculation rules (`b6ffe8a`), qui accélèrent le changement de page dans Chrome. Gardées.
- **JS de l'accueil sur mobile : −152 Ko compressés** (le post-traitement 3D n'est plus chargé sur téléphone).

### Lighthouse — ordinateur (AVANT → APRÈS)

| Page | Score | LCP | TBT (ms) | CLS | FCP |
| --- | --- | --- | --- | --- | --- |
| `/` | 67 → 70 | 1,25 s → 0,35 s * | 1204 → 1171 | 0,005 → 0,000 | 0,53 s → 0,35 s |
| `/a-propos` | 98 → 100 | 1,07 s → 0,68 s | 0 → 0 | 0,004 → 0,001 | 0,65 s → 0,38 s |
| `/recyclage-ordinateur` | 99 → 100 | 0,84 s → 0,76 s | 0 → 0 | 0,001 → 0,001 | 0,52 s → 0,43 s |
| `/destruction-des-disques-durs` | 99 → 100 | 0,87 s → 0,77 s | 0 → 0 | 0,001 → 0,001 | 0,54 s → 0,35 s |
| `/destruction-des-donnees` | 100 → 100 | 0,79 s → 0,77 s | 0 → 0 | 0,001 → 0,001 | 0,47 s → 0,35 s |
| `/formulaire-de-ramassage` | 78 → 80 | 1,21 s → 1,08 s | 0 → 0 | **0,430 → 0,402** | 0,50 s → 0,35 s |
| `/contact` | 97 → 98 | 1,28 s → 1,17 s | 0 → 0 | 0,001 → 0,002 | 0,65 s → 0,35 s |
| `/blog` | 99 → 100 | 0,84 s → 0,72 s | 0 → 0 | 0,001 → 0,001 | 0,53 s → 0,34 s |
| `/blog/cybersecurite-…` | 100 → 100 | 0,82 s → 0,63 s | 0 → 0 | 0,001 → 0,000 | 0,52 s → 0,34 s |
| `/laval` | 99 → 100 | 0,98 s → 0,72 s | 0 → 0 | 0,001 → 0,001 | 0,51 s → 0,35 s |
| `/faq` | 100 → 100 | 0,79 s → 0,64 s | 0 → 0 | 0,001 → 0,001 | 0,48 s → 0,39 s |
| `/en` | 56 → 67 | 1,25 s → 1,29 s | 1108 → 1147 | 0,205 → 0,001 | 0,68 s → 0,35 s |

\* Accueil APRÈS : Lighthouse n'a pas identifié l'élément LCP (LCP = FCP). À lire avec prudence.

### Lighthouse — mobile (AVANT → APRÈS)

| Page | Score | LCP | TBT (ms) | CLS | FCP |
| --- | --- | --- | --- | --- | --- |
| `/` | **44 → 67** | 5,88 s → 1,68 s * | **3520 → 4416** | 0,001 → 0,000 | 2,13 s → 1,68 s |
| `/a-propos` | 85 → 92 | **4,21 s → 3,34 s** | 74 → 0 | 0,027 → 0,000 | 1,81 s → 1,37 s |
| `/recyclage-ordinateur` | 91 → 92 | **3,20 s → 3,35 s** | 97 → 0 | 0,013 → 0,000 | 1,96 s → 1,53 s |
| `/destruction-des-disques-durs` | 90 → 91 | **3,35 s → 3,42 s** | 119 → 0 | 0,023 → 0,000 | 1,96 s → 1,53 s |
| `/destruction-des-donnees` | 91 → 91 | **3,33 s → 3,41 s** | 0 → 66 | 0,012 → 0,012 | 1,81 s → 1,38 s |
| `/formulaire-de-ramassage` | **62 → 65** | **5,79 s → 5,33 s** | 65 → 44 | **0,301 → 0,301** | 1,82 s → 1,38 s |
| `/contact` | **76 → 75** | **6,40 s → 7,78 s** | 102 → 6 | 0,000 → 0,000 | 1,82 s → 1,38 s |
| `/blog` | 88 → 92 | **3,61 s → 3,34 s** | 119 → 0 | 0,022 → 0,000 | 1,96 s → 1,53 s |
| `/blog/cybersecurite-…` | 93 → 95 | **2,99 s → 2,73 s** | 0 → 69 | 0,000 → 0,000 | 1,96 s → 1,52 s |
| `/laval` | 83 → 92 | **4,44 s → 3,34 s** | 0 → 0 | 0,000 → 0,000 | 1,96 s → 1,52 s |
| `/faq` | 94 → 96 | **2,83 s → 2,74 s** | 0 → 0 | 0,017 → 0,017 | 1,81 s → 1,37 s |
| `/en` | **65 → 67** | 2,12 s → 1,68 s | **4428 → 3778** | 0,005 → 0,000 | 2,12 s → 1,68 s |

En gras : valeur APRÈS qui rate l'objectif (score 90+, LCP < 2,5 s, CLS < 0,1, TBT < 200 ms).
\* Accueil APRÈS : élément LCP non identifié par Lighthouse (LCP = FCP). AVANT, l'élément LCP était le texte de la bannière de témoins.
Sur l'accueil mobile, le temps de calcul vient surtout de React et de la scène 3D (fichiers `chunk-LBWOCNDW` ≈ 6,0 s et `chunk-G6GION6J` ≈ 1,5 s de calcul dans la passe 1).

### Poids du JavaScript de l'accueil

| Profil | AVANT brut / gzip | APRÈS brut / gzip |
| --- | --- | --- |
| Ordinateur | 1 727,7 / 566,6 Ko | 1 733,6 / 571,6 Ko |
| Mobile | 1 727,7 / 566,6 Ko | 1 415,5 / 414,6 Ko |

Sur ordinateur, la 3D est maintenant en 3 morceaux (scène 25 Ko, three.js 244,5 Ko, post-traitement 157 Ko, gzip). Sur mobile, le post-traitement (157 Ko gzip) n'est plus chargé. three.js reste chargé sur mobile.
Pages intérieures : 8,2 → 8,9 Ko gzip de JS (site.js). Formulaire : 159,5 → 160,5 Ko gzip.

### Défilement — ordinateur, processeur 6x plus lent

| Page | Config | fps AVANT → APRÈS | % images > 16,7 ms AVANT → APRÈS | Longues tâches (total ms) AVANT → APRÈS |
| --- | --- | --- | --- | --- |
| `/` (médiane 3 passes APRÈS) | 1366 px | 33,1 → **27,6** | 43,8 → **50,9** | 2 675 → 6 088 |
| `/` (médiane 3 passes APRÈS) | 1920 px | 33,2 → 32,8 | 48,7 → 47,2 | 2 856 → 3 604 |
| `/recyclage-ordinateur` | 1366 px | 60 → 59,7 | 0 → 0,4 | 0 → 0 |
| `/destruction-des-disques-durs` | 1366 px | 59,5 → 59,5 | 0,9 → 0,8 | 0 → 0 |
| `/laval` | 1366 px | 54,3 → 55,8 | 3,3 → 4,3 | 294 → 117 |

Accueil, processeur 4x plus lent (pour info) : 1366 px 47,8 → 48,4 i/s ; 1920 px 50,4 → 51,0 i/s.
Accueil 1366 px, 6x : la section du héros a 37 longues tâches (2 659 ms) dans la passe 1 APRÈS, contre 13 (926 ms) AVANT. En passes alternées (voir « Enquête sur les reculs »), il n'y a pas de recul : c'était du bruit.

### Défilement — mobile, processeur 4x plus lent, 4G

| Page | Config | fps AVANT → APRÈS | % images > 16,7 ms AVANT → APRÈS |
| --- | --- | --- | --- |
| `/` (médiane 3 passes APRÈS) | 390 px | 48,2 → 50,8 | 18,2 → 14,5 |
| `/` (médiane 3 passes APRÈS) | 360 px | 53,7 → 51,1 | 10,3 → 14,4 |
| `/recyclage-ordinateur` | 390 px | 60 → 60 | 0 → 0 |
| `/destruction-des-disques-durs` | 390 px | 60 → 60 | 0 → 0 |
| `/laval` | 390 px | 58,8 → 58,8 | 0,5 → 0,5 |

WebKit (Playwright sur Windows, profil iPhone 13, **pas Safari iOS**) : accueil 20,7 → 10,3–11,0 i/s (3 passes) ; `/recyclage-ordinateur` 24,8 → 20,2–22,4 i/s. Recul net sur l'accueil dans ce moteur. Cause : `b6ffe8a` (voir « Enquête sur les reculs »).

### Changement de page depuis l'accueil (clic → premier affichage, ms ; médiane 3 passes APRÈS)

| Profil | Lien | Clic → FCP AVANT → APRÈS | Clic → LCP AVANT → APRÈS |
| --- | --- | --- | --- |
| ordinateur, CPU 4x | `/a-propos` | 236 → 306 | 920 → 1 090 |
| ordinateur, CPU 4x | `/recyclage-ordinateur` | 221 → 380 | 905 → 1 212 |
| ordinateur, CPU 4x | `/formulaire-de-ramassage` | 139 → 285 | 623 → 950 |
| ordinateur, CPU 4x | `/contact` | 196 → 344 | 1 012 → 1 398 |
| mobile, CPU 4x | `/a-propos` | 212 → 328 | 896 → 1 112 |
| mobile, CPU 4x | `/recyclage-ordinateur` | 212 → 335 | 896 → 1 203 |
| mobile, CPU 4x | `/formulaire-de-ramassage` | 168 → 241 | 604 → 846 |
| mobile, CPU 4x | `/contact` | 232 → 342 | 948 → 1 337 |
| mobile, CPU 4x, 4G | `/a-propos` | 1 544 → 1 800 | 2 644 → 3 084 |
| mobile, CPU 4x, 4G | `/recyclage-ordinateur` | 1 448 → 1 672 | 2 116 → 2 072 |
| mobile, CPU 4x, 4G | `/formulaire-de-ramassage` | 1 512 → 2 622 | 2 212 → 3 006 |
| mobile, CPU 4x, 4G | `/contact` | 2 652 → 3 049 | 3 152 → 4 101 |

Le temps de réponse du serveur ne change pas (TTFB ≈ 16–24 ms sans 4G). C'est l'affichage de la page d'arrivée qui prend plus de temps. AVANT n'a qu'une passe. Causes : `3504ac4` et, en 4G vers le formulaire et contact, `fa23faa`. Les chiffres 4G de ce tableau sont sans compression : avec gzip, l'écart est bien plus petit (voir « Enquête sur les reculs »).

### Réactivité aux clics (latence maximale, ms ; seuil de mesure 16 ms)

| Profil | Interaction | AVANT | APRÈS (3 passes) |
| --- | --- | --- | --- |
| ordinateur, CPU 4x | sous-menu Services | 80 | 88 / 88 / 104 |
| ordinateur, CPU 4x | accordéon FAQ | 40 | 40 / 48 / 48 |
| ordinateur, CPU 4x | formulaire (focus / frappe) | 40 / 32 | 48 / 32 ; 40 / 32 ; 32 / 40 |
| mobile, CPU 4x | menu mobile | 88 | 96 / 88 / 128 |
| mobile, CPU 4x | accordéon FAQ | 48 | 48 / 48 / 56 |
| mobile, CPU 4x | formulaire (focus / frappe) | 48 / 32 | 40 / 40 ; 48 / 32 ; 56 / 40 |

Toutes les valeurs restent sous 200 ms. C'est une mesure en laboratoire, pas l'INP de vrais visiteurs.

### Enquête sur les reculs (passes alternées)

Date : 2026-11-25. But : vérifier si les reculs ci-dessus sont réels, trouver le commit responsable et l'annuler s'il n'apporte rien d'autre.

**Méthode.** Deux serveurs en même temps : HEAD (`2bb307c`, port 8090) et un worktree temporaire (AVANT `6d5495d` ou un commit intermédiaire, port 8091). Les passes alternent A, B, B, A… dans la même période ; on compare les médianes. Mêmes scripts que plus haut, limités à la page concernée (`run-scroll`, `run-lighthouse`, `run-webkit`, navigation de `run-interactions`). Pour la 4G, un mandataire gzip (niveau 6) est placé devant chaque serveur, car le serveur PHP intégré ne compresse pas. Bissection sur `365327d`, `3504ac4`, `6d1c267`, `fa23faa`, `b6ffe8a` et `61ea127`.

**Résultat : aucun commit annulé.** Deux reculs sont du bruit. Le TBT monte sans travail en plus. Les trois autres viennent de commits qui ont aussi un gain mesuré : ce sont des compromis.

| Recul signalé | Passes alternées, AVANT → APRÈS | Verdict | Commit | Décision |
| --- | --- | --- | --- | --- |
| Défilement accueil 1366 px, CPU 6x | 29,0 → 29,8 i/s ; longues tâches 4 427 → 4 559 ms ; dont héros 1 979 → 1 777 ms (6 passes chacun) | bruit | — | rien à annuler |
| TBT Lighthouse mobile, accueil | 3 459 → 4 437 ms (5 passes chacun) | réel dans la note, pas plus de travail | aucun seul commit | rien à annuler |
| WebKit, défilement accueil | 20,9 → 10,4 i/s (5 passes chacun) | réel | `b6ffe8a` | gardé (compromis) |
| Clic depuis l'accueil → FCP, sans limite réseau, CPU 4x | ordinateur 245 → 321 ms ; mobile 227 → 321 ms (5 passes × 4 liens) | réel | `3504ac4` | gardé (compromis) |
| Clic depuis l'accueil, 4G lent + CPU 4x, gzip | FCP +60 à +130 ms ; LCP `/a-propos` 2 210 → 2 581, `/contact` 1 858 → 2 540, `/recyclage-ordinateur` 1 540 → 1 322, formulaire 1 472 → 1 312 ms (3 passes) | réel, plus petit que sans gzip | `3504ac4`, `fa23faa` | gardés (compromis) |
| LCP Lighthouse mobile, `/contact` | médiane 6 403 → 7 033 ms, moyenne 7 129 → 7 169 ms ; score 74 → 76 (13 passes chacun) | bruit | — | rien à annuler |

**TBT de l'accueil.** Avant et après, Lighthouse voit les mêmes longues tâches : environ 2,7 s et 0,5 s (le gros chunk JS de l'accueil), 1,5 s (scène 3D) et 0,2 s. Le temps bloquant de toutes les longues tâches ne change pas (4 978 → 4 963 ms, médianes de 5). Le travail total non plus (9,83 → 9,88 s). Le TTI arrive plus tôt (18,4 → 16,0 s). Mais le TBT ne compte que la fenêtre entre FCP et TTI. Tout arrive plus tôt, et la tâche de 1,5 s de la scène 3D tombe maintenant dans cette fenêtre ; avant, elle tombait surtout après le TTI. Pas de commit unique : TBT 4 132 ms à `6d1c267` (avant les polices), 3 886 ms à `3504ac4`, 4 315 ms à `365327d` (3 passes chacun).

**WebKit : `b6ffe8a` (speculation rules).** Bissection : 20,2 i/s à `fa23faa`, 10,5 i/s à `b6ffe8a` et 10,4 i/s à `61ea127`. À HEAD, la même page sans la balise donne 20,4 i/s, contre 10,35 avec (4 passes chacun). Le WebKit de Playwright (version 27.2) reconnaît `speculationrules`. Aucune page n'est préchargée pendant le test. Ce n'est donc pas un téléchargement : chaque image est lente (100 % des images au-delà de 18 ms). Sans la seule clause `selector_matches`, rien ne change (10,5 i/s).
Gain mesuré à HEAD, avec et sans la balise (Chrome ordinateur, CPU 4x, 4G lent, gzip, survol 300 ms puis clic depuis `/faq`, 3 passes × 4 liens) : clic → TTFB environ 205 → 50 ms, clic → FCP 875 → 749 ms, clic → LCP 1 323 → 1 161 ms. Les pages arrivent en `navigational-prefetch`.
Compromis : gain réel dans Chrome et Edge, perte dans ce WebKit, qui n'est pas Safari iOS. On ne sait pas si Safari iOS applique ces règles. Gardé.

**Changement de page : `3504ac4` (polices auto-hébergées).** Bissection (sans limite réseau, CPU 4x, 2 passes alternées avec HEAD, 4 liens, ordinateur / mobile) : à `6d1c267`, 246 / 232 ms (HEAD 290 / 313) ; à `3504ac4`, 318 / 339 ms (HEAD 304 / 335). Le serveur répond aussi vite qu'avant (début de navigation ≈ 5 ms, TTFB ≈ 16 ms) : c'est le premier affichage de la page d'arrivée qui attend environ 80 ms de plus.
Gain du même commit (Lighthouse mobile, 3 passes à `6d1c267` puis à `3504ac4`) : accueil 44 → 67, LCP 5,89 → 1,68 s, FCP 2,13 → 1,68 s. Gardé.

**4G : `3504ac4` et `fa23faa`.** Sans gzip, la bissection donne : `/a-propos` FCP 1 564 ms (`6d1c267`) → 1 768 ms (`3504ac4`) ; formulaire 1 656 ms (`3504ac4`) → 2 559 ms (`fa23faa`) ; contact 2 256 → 2 916 ms. Sans gzip, le TTFB de contact varie aussi d'une passe à l'autre (160 à 800 ms) ; avec gzip, de 160 à 290 ms.
`fa23faa` ne garde le modulepreload que sur `/formulaire-de-ramassage` et `/contact`. Mesuré à HEAD, avec et sans ce modulepreload (gzip, mobile, CPU 4x, 4G lent) :
- clic depuis l'accueil : FCP à ±30 ms près ; LCP formulaire 1 092 → 1 296 ms (+204), contact 2 128 → 2 555 ms (+427) (3 passes) ;
- page ouverte directement (cache vide) : formulaire monté (îlot React) 2 297 → 1 712 ms (−585), contact 2 696 → 2 137 ms (−559) ; LCP formulaire 1 464 → 1 440 ms, contact 2 104 → 2 544 ms (+440) (5 passes) ;
- Lighthouse mobile : formulaire 78 → 81 (LCP 3,15 → 2,65 s), contact 80 → 85 (LCP 5,33 → 4,47 s) (3 passes).
Compromis : le formulaire est utilisable environ 0,6 s plus tôt et la note Lighthouse monte ; le titre de contact s'affiche environ 0,4 s plus tard en vraie 4G. Gardé. Le même commit précharge aussi l'image du héros de l'accueil.

**LCP de `/contact`.** L'élément LCP est le titre `h1`, avant comme après. AVANT, Lighthouse donne soit environ 6,3 s, soit 7,8 à 8,2 s, selon la passe (6 249 à 8 201 ms) ; APRÈS, de 5 939 à 7 898 ms. Les moyennes sont égales. Le FCP gagne bien 0,6 s (1 975 → 1 382 ms).

### Vérifications de non-régression (Playwright, Chrome sans fenêtre)

Script : `php/perf-audit/scripts/run-regression.mjs`. Résultat : `raw/apres-regression.json`.

- **Console et fichiers manquants** : 12 pages × ordinateur 1366 px et mobile 390 px, avec défilement complet. Aucune erreur dans la console. Aucune réponse 404 ni autre erreur réseau.
- **Défilement horizontal** : 12 pages × 360×780, 390×844 et paysage 844×390. `scrollWidth` = `clientWidth` partout (36 cas sur 36).
- **Lenis (ordinateur, accueil et `/recyclage-ordinateur`)** : un lien ancre (ajouté pour le test, vers le pied de page) fait défiler jusqu'à la cible. Page suivante, Espace, flèche bas, Fin et Début font défiler. Après 4 s sans rien faire, la molette refait défiler (900 px), et `scrollTo` aussi.
- **Menu mobile (390 px)** : s'ouvre et se ferme (`aria-expanded` et `hidden` corrects). La page défile après la fermeture.
- **Héros 3D** : la scène 3D est affichée sur l'accueil, sur ordinateur (canevas 717×656) et sur mobile (canevas 350×281). Vérifié aussi sur capture d'écran.

### Optimisations faites (`git log --oneline 6d5495d..HEAD`)

- `a3c0e9b` Compression serveur : Brotli et types JS/XML/texte manquants (.htaccess).
- `3d5e550` Photos des en-têtes de pages : variantes 640/960/1280 px et srcset.
- `fa4633f` Images des îlots : srcSet à partir de variantes générées au build.
- `78df0fa` liste-matieres en WebP 500 px, logo sans fetchpriority, chunks orphelins retirés.
- `6d1c267` Retour du fetchpriority sur le logo (le FCP mobile s'était dégradé).
- `3504ac4` Polices auto-hébergées (Inter, Poppins, JetBrains Mono) au lieu de Google Fonts.
- `fa23faa` Accueil et îlots : préchargement de l'image du héros et des modules JS.
- `b6ffe8a` Préchargement des pages internes au survol (speculation rules, prefetch moderate).
- `61ea127` Champs de formulaire en 16 px sur téléphone (évite le zoom automatique d'iOS).
- `3953fd6` Accueil : pas de modulepreload des îlots (garde le préchargement de l'image).
- `11cf2a9` Ruban des villes : pastilles sans backdrop-filter, largeur mise en cache.
- `6885ed4` Cartes inclinables : rect en cache pendant le survol, écritures regroupées par image.
- `2c924ba` Lenis : boucle requestAnimationFrame arrêtée au repos.
- `365327d` transition-all remplacé par la liste exacte des propriétés animées.
- `9f45e3c` Copies de Hero, HeroDevices et DataDestruction dans `php/js/overrides`.
- `0bb118c` Héros 3D : post-traitement dans un chunk à part, jamais chargé sur mobile.
- `6a1ce67` Héros : le changement d'appareil au scroll ne re-rend plus la scène 3D.
- `5709b2d` Héros 3D : écouteur de scroll sans travail quand la scène est en pause.
- `a3c5f8f` DataDestruction : plus de copie ni de putImageData du canevas entier à chaque image.
- `581263a` Pages services : plus de débordement horizontal de 4 px sur téléphone.
- `c27b685` Héros 3D : la scène se monte une fois la 3D et le post-traitement chargés.
- `a09e88c` Surcharges PHP : imports en `@/` pour que tsc les résolve.

### Objectifs non atteints

- **Lighthouse 90+** : raté sur l'accueil (70 ordinateur, 67 mobile), `/en` (67 / 67), le formulaire (80 / 65) et contact sur mobile (75). Raison principale pour l'accueil : la scène 3D (React + three.js) occupe le processeur au chargement (TBT 4,4 s sur mobile). three.js reste chargé sur mobile, car Anthony a refusé de retarder ou d'alléger la 3D.
- **LCP < 2,5 s sur mobile** : raté sur toutes les pages intérieures (2,7 à 3,4 s), le formulaire (5,3 s) et contact (7,8 s). Le FCP a baissé, mais le titre principal s'affiche encore tard. Le 6,4 → 7,8 s de contact est du bruit : sur 13 passes alternées, le LCP de contact varie de 6,2 à 8,2 s AVANT et de 5,9 à 7,9 s APRÈS, avec la même moyenne (7,1 s / 7,2 s).
- **CLS < 0,1** : raté sur le formulaire de ramassage (0,40 ordinateur, 0,30 mobile). Aucune optimisation n'a visé ce saut.
- **INP < 200 ms** : non mesurable en laboratoire. Les clics scriptés restent sous 130 ms, mais ce n'est pas l'INP réel.
- **60 i/s avec CPU 6x (ordinateur) / 4x (mobile)** : raté sur l'accueil (27,6–32,8 i/s en 6x ; 50,8–51,1 i/s sur mobile 4x). Les pages intérieures sont à 55–60 i/s. Le recul de l'accueil en 6x à 1366 px était du bruit (29,0 → 29,8 i/s en passes alternées).
- **Changement de page** : plus lent qu'avant (clic → premier affichage) : +70 à +160 ms sans limite réseau ; en 4G avec gzip, +60 à +130 ms (sans gzip, +220 à +1 110 ms). Causes : `3504ac4` (polices) et `fa23faa` (modulepreload du formulaire et de contact). Les deux sont gardés : ce sont des compromis, avec des gains mesurés ailleurs (voir « Enquête sur les reculs »).

### Limites de cette mesure

- **iOS Safari non mesuré** : pas d'appareil. Le chiffre WebKit vient de Playwright sur Windows, ce n'est pas Safari.
- **Compression Brotli/gzip non mesurable en local** : le serveur PHP intégré ignore `.htaccess`. Les poids « gzip » sont des estimations du script.
- **Carte graphique** : le ralentissement simule un processeur lent, pas une carte graphique lente. La RTX 4060 de ce PC n'est pas bridée. En mode sans fenêtre, le rendu 3D passe par SwiftShader (rendu logiciel), ce qui domine les i/s de l'accueil.
- **Bruit** : AVANT n'a qu'une passe pour le défilement, la navigation et les clics. Les écarts de quelques i/s ou de quelques dizaines de ms ne sont pas significatifs.
