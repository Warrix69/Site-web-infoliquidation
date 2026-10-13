# PROMPT — Refonte complète de infoliquidationrecycle.com en Next.js

> **Instructions d'utilisation (pour Anthony) :** Ouvre Claude Code dans un dossier vide, colle tout le contenu ci-dessous comme premier message. Laisse l'agent travailler jusqu'au bout.

---

## MISSION

Tu es un développeur front-end senior ET un directeur artistique de calibre Awwwards. Ta mission : reconstruire au complet le site **infoliquidationrecycle.com** (entreprise de recyclage informatique et électronique à Saint-Eustache, Québec) en un site **Next.js moderne, interactif et spectaculaire**, digne d'un prix de design. La landing page doit être la plus belle possible : c'est elle qui convertit les visiteurs en demandes de ramassage.

Règles absolues :

1. **Garder TOUT le contenu et TOUTES les pages** du site actuel (fournis plus bas). Tu peux améliorer la formulation, mais n'invente JAMAIS de faits, de chiffres, de services ou de coordonnées.
2. **Garder le logo officiel d'Info Liquidation Recycle** (instructions section ASSETS). Ne jamais le remplacer par un logo généré.
3. Le site actuel est en ligne : `https://infoliquidationrecycle.com/`. Si un texte fourni ici te semble incomplet, va chercher la version complète sur la page live correspondante (les versions anglaises sont sous `/en/`).
4. Travaille de façon autonome : scaffold le projet, code, teste avec `npm run build`, corrige, jusqu'à ce que tout soit fonctionnel.

---

## STACK TECHNIQUE

- **Next.js 15+ (App Router) + TypeScript**
- **Tailwind CSS** pour le style
- **Framer Motion** pour les animations
- **next-intl** pour le bilinguisme FR (défaut) / EN — sélecteur de langue dans le header, toutes les pages traduites
- **React Hook Form + Zod** pour les formulaires
- **Lucide React** pour les icônes
- `next/image` pour toutes les images, `next/font` pour les polices
- SEO : Metadata API, `sitemap.xml`, `robots.txt`, JSON-LD `LocalBusiness`, balises Open Graph

---

## ASSETS OBLIGATOIRES

Télécharge ces fichiers du site actuel dans `/public/` (via curl ou fetch) :

- **LOGO (critique, ne jamais substituer)** : `https://infoliquidationrecycle.com/wp-content/uploads/2020/09/logo.png` → `/public/logo.png`. Utilisé dans le header, le footer et comme base du favicon (`/wp-content/uploads/2020/09/cropped-logo-300x300.png` existe aussi pour le favicon).
- Icône décorative : `https://infoliquidationrecycle.com/wp-content/uploads/2020/11/icon_info_liquidation.png`
- Icônes des 3 étapes : `.../2020/11/formulaire-1.png`, `.../2020/11/date-1.png`, `.../2020/11/ramassage-1.png`
- Photo ordinateurs portables : `https://infoliquidationrecycle.com/wp-content/uploads/2020/11/ordinateurs-portables-recuperation-recycle-materiel-electronique-certificat-destruction-laval-montreal.jpg`
- Photo destruction disque dur : `https://infoliquidationrecycle.com/wp-content/uploads/2023/07/destruction-disque-dur.jpg`

Si un téléchargement échoue (sauf le logo : réessaie jusqu'à l'avoir), utilise une icône Lucide équivalente.

---

## DIRECTION ARTISTIQUE — « Éco-tech premium »

- **Thème sombre par défaut** : fond vert-noir profond (`#0A0F0D`, surfaces `#111815`), texte blanc cassé (`#F2F5F3`).
- **Accents** : dégradé vert émeraude → lime (`#10B981` → `#84CC16`), utilisé pour les CTA, les chiffres clés, les glows et les soulignements.
- **Glassmorphism** : cartes translucides avec `backdrop-blur`, bordure 1px vert translucide, ombre douce verte.
- **Typographie** : Space Grotesk (titres, gros et confiants) + Inter (texte). Titres H1 très grands (clamp jusqu'à ~72px desktop).
- Effets de **glow** derrière les éléments clés, texture de grain subtile sur le fond, coins très arrondis (`rounded-2xl`/`rounded-3xl`), boutons pill avec dégradé + glow au hover.
- Le logo actuel doit rester lisible sur fond sombre : place-le sur une pastille/plaque claire arrondie si nécessaire.

## ANIMATIONS (niveau spectaculaire — mais performant)

- **Hero** : arrière-plan animé (blobs de dégradé vert flottants + fine grille « circuit imprimé » animée en CSS/canvas léger), titre qui se révèle mot par mot, badge flottant, flèche de scroll animée.
- **Compteurs animés** au scroll pour les statistiques.
- **Parallax subtil** entre les sections, reveal au scroll (fade + translate) sur tous les blocs via Framer Motion (`whileInView`).
- **Cartes services** : effet tilt 3D léger au hover + glow qui suit la souris.
- **Timeline du processus** (3 étapes) qui se dessine au scroll.
- **Marquee infini** des villes desservies.
- Accordéons FAQ animés (height auto avec Framer Motion).
- Micro-interactions sur tous les hovers/focus. Respecter `prefers-reduced-motion` (désactiver les animations lourdes).

---

## LANDING PAGE (page d'accueil) — sections dans l'ordre

1. **Topbar fine** : téléphone cliquable `(514) 594-4949` + « La référence pour votre recyclage informatique et électronique » + sélecteur FR/EN.
2. **Header sticky glassmorphism** : logo à gauche, nav : Accueil, À propos, Informations, **Services (dropdown animé avec les 7 services)**, F.A.Q., Blog, Contact. CTA vert « Ramassage gratuit » à droite.
3. **HERO plein écran** :
   - Badge : « ♻️ Recyclage sans frais — Grand Montréal »
   - H1 : « Recyclage informatique & électronique à Montréal »
   - Sous-titre : « Nous collectons, traitons et recyclons votre matériel informatique en fin de vie. Ramassage sans frais, destruction des données certifiée. Faites le BON choix ! »
   - 2 CTA : « Demander un ramassage gratuit » (→ /formulaire-de-ramassage) + « Découvrir nos services »
   - 3 mini-preuves sous les CTA : Ramassage sans frais · Certificat de destruction gratuit · Réponse en 24 h
4. **Bande de statistiques animées** (compteurs) : Depuis **2005** · Réponse en **24 h** · Ramassage en **72 h** max · **0 $** de frais · **100 %** des composants valorisables.
5. **Comment ça marche — 3 étapes** (timeline animée) :
   - **1 – Formulaire** : remplir le formulaire de demande de ramassage en indiquant le nombre de chaque item (ex : 45 ordinateurs, 30 écrans CRT, 6 imprimantes, 4 portables, 1 fax, 2 serveurs, 4 boîtes de câbles variés).
   - **2 – Confirmer une date** : demande traitée en 24 h, ramassage effectué dans un délai maximum de 72 h.
   - **3 – Ramassage** : aucuns frais pour le ramassage ou le matériel. Certificat de destruction disponible.
6. **Grille des services** (7 cartes interactives, liens vers les pages) : Recyclage ordinateur et portable / Demande de ramassage / Destruction des données / Matières recyclables / Procédure de récupération / Destruction des disques durs sur place / Recyclage téléphones cellulaires et tablettes.
7. **Section « Pourquoi recycler ? »** avec grosses stats animées : plus de **680 000** ordinateurs vendus par an au Québec · plus de **50 000 tonnes** de déchets électroniques annuellement · **120 millions** de piles consommées par an au Québec, seulement **6 %** récupérées.
8. **Section sécurité — Destruction des données** : logiciels avec algorithmes répondant aux normes de la **GRC, de la NASA et du département de la Défense américaine**. Certificat de destruction émis sans frais. CTA vers /destruction-des-donnees.
9. **Zones desservies** : Grand Montréal, Rive-Nord, Rive-Sud, Laval + marquee des villes (liste complète dans FOOTER plus bas). Mentionner : nouvelle adresse — 514 Chemin de la Rivière Sud, local 102, Saint-Eustache.
10. **FAQ (accordéon)** : les 5 questions officielles (voir page FAQ plus bas).
11. **CTA final plein écran** : « Prêt à libérer de l'espace ? Ramassage gratuit partout dans le Grand Montréal » + gros bouton vers le formulaire.
12. **Footer** (voir section FOOTER).

La page d'accueil doit aussi intégrer (en sections ou dans les pages liées) les textes officiels de l'accueil actuel : « Recyclage Matériel Informatique à Montréal : une solution adaptée à vos besoins », « Quels équipements peuvent être recyclés ? » (ordinateurs portables et fixes, écrans, imprimantes, lecteurs CD, téléphones, batteries et tout équipement informatique) et « Recyclage matériel informatique particulier & commercial — Faites le bon choix » (évaluation gratuite sur site, collecte directe, démarche écologique).

---

## ARBORESCENCE COMPLÈTE (garder toutes les pages/onglets du site actuel)

| Route FR | Contenu |
|---|---|
| `/` | Accueil (landing décrite ci-dessus) |
| `/a-propos` | À propos |
| `/informations` | Informations |
| `/recyclage-ordinateur` | Service : Recyclage ordinateur et portable |
| `/formulaire-de-ramassage` | Service : Demande de ramassage (formulaire) |
| `/destruction-des-donnees` | Service : Destruction des données |
| `/matieres-recyclables` | Service : Matières recyclables |
| `/procedure-de-recuperation` | Service : Procédure de récupération |
| `/destruction-des-disques-durs` | Service : Destruction des disques durs sur place |
| `/recyclage-telephones` | Service : Recyclage téléphones cellulaires et tablettes |
| `/faq` | Foire aux questions |
| `/blog` | Blog (page liste + gabarit d'article ; crée 2-3 articles placeholder à partir des sujets du blog actuel) |
| `/contact` | Contact |
| `/[ville]` | Pages SEO locales dynamiques (template unique) pour : montreal, laval, saint-eustache, longueuil, boisbriand, st-jerome, mascouche, lachine, terrebonne, brossard, sainte-therese, mirabel, dorval, cote-saint-luc, saint-laurent, kirkland, repentigny, lasalle, blainville |

Versions EN sous `/en/...` via next-intl (le site actuel a déjà des équivalents EN : `/en/`, `/en/by-the-way/`, `/en/pick-up-form/`, `/en/data-destruction/`, etc. — traduis fidèlement le contenu FR).

---

## CONTENU OFFICIEL PAR PAGE (à conserver)

### À propos (`/a-propos`)
- **Éric Després — Fondateur & Président-Directeur Général.** Il a fondé Info Liquidation Recycle en **2005**, depuis la compagnie ne cesse de progresser. Spécialiste en recyclage informatique, en charge de trouver les ressources nécessaires pour le traitement des produits usagés dans le respect des normes et directives actuelles.
- **Info Liquidation Recycle** : Nous collectons et traitons votre matériel informatique et électronique en fin de vie sous respect strict des nouvelles législations. Solution clé en main pour réduire vos immobilisations et assurances. Réseau complet de sous-traitants spécialisés en recyclage. Mission : éviter l'enfouissement de centaines de milliers de composants électroniques qui pollueraient les sols pendant des décennies, et redonner une nouvelle vie aux matières (texte complet sur la page live).

### Informations (`/informations`)
- **Pourquoi doit-on recycler ?** « Faites le bon choix : la dépollution, le recyclage et le traitement des matières informatiques sont notre responsabilité à tous. » Les déchets électroniques sont le seul flux de déchets en croissance au Canada. Au Québec : plus de 680 000 ordinateurs vendus/an, plus de 50 000 tonnes de déchets électroniques/an. Durée de vie moyenne des équipements : 3 ans et demi. Substances toxiques : plomb, cadmium, mercure.
- **Le recyclage des piles** : 120 millions de piles consommées au Québec/an, seulement 6 % récupérées → 4 000 tonnes de métaux lourds au dépotoir annuellement. Une seule pile au mercure contamine 1 m³ de terre et 1 000 m³ d'eau pendant 50 ans. D'une tonne de piles on extrait jusqu'à 600 kg de matériaux réutilisables.
- **Que deviennent vos produits ?** Collecte (pesée et comptage par nos équipes de démonteurs, distribution vers des industries spécialisées, sous-traitants sélectionnés avec rigueur) + Destruction des données (normes GRC/NASA/Défense américaine, certificat sur demande).

### Recyclage ordinateur et portable (`/recyclage-ordinateur`)
Sous-sections : Pourquoi recycler un ordinateur portable · Que désignent les DEEE (déchets d'équipements électriques et électroniques) · Avantages (protéger l'environnement et les ressources naturelles ; création d'emplois — près de 8 000 recrutements/an dans le secteur) · Comment faire recycler ses appareils (gratuit) · FAQ de 6 questions (texte complet sur la page live). Liens zones : Montréal, Rive-Nord, Rive-Sud.

### Destruction des données (`/destruction-des-donnees`)
La protection de l'information est primordiale. Destruction de l'intégralité des données avec des logiciels intégrant de puissants algorithmes répondant aux normes de la **GRC, de la NASA et du département de la Défense américaine**. Certificats de destruction émis sans frais sur demande. Si le matériel est inutilisable : destruction physique complète des supports. Encadré « À savoir ! » : le simple effacement ne suffit pas ; la GRC et la CPVP recommandent 3 à 7 formatages de 45 minutes chacun.

### Matières recyclables (`/matieres-recyclables`)
5 catégories (présente-les en cartes/onglets interactifs) : **Métaux, plastiques et circuits imprimés · Équipements informatiques et bureautiques · Équipements de télécommunication · Piles et sources d'alimentation · Câbles informatiques et électriques.** Listes non exhaustives — réponse à toute question en 24 h. + FAQ de 5 questions sur le recyclage (texte sur la page live).

### Procédure de récupération (`/procedure-de-recuperation`)
« 100 % des composants informatiques, obsolètes ou non, peuvent être valorisés et recyclés. » 3 blocs : **Écran CRT** (démantèlement des coques et cartes, séparation manuelle, fonte et réinjection dans l'industrie) · **Écrans LCD/LED/plasma** (tri par typologie ; extraction manuelle des tubes fluorescents au mercure vers une filière dédiée) · **Composantes informatiques** (démantelées, déchiquetées, broyées ; fragments valorisés en métaux ferreux, non-ferreux, câbles, plastiques).

### Destruction des disques durs sur place (`/destruction-des-disques-durs`)
Pourquoi une structure spécialisée · Où jeter ses vieux disques durs · 2 méthodes : **déchiquetage** (réduction en copeaux) et **broyage** (pression d'au moins **3 400 kg** qui poinçonne un trou irréparable) · Processus en 5 étapes : stockage sécurisé → pesage, destruction et traçabilité (certificat + bordereau de suivi) → transport vers centre de recyclage → recyclage → seconde destruction des résidus non recyclés · FAQ de 6 questions (texte complet sur la page live).

### Recyclage téléphones cellulaires et tablettes (`/recyclage-telephones`)
Composantes recyclables : plastique (~50 %), cuivre (~25 %), verre (~25 %), cobalt (~4 %), argent (~1 %), mercure (dangereux). Bonnes raisons de recycler son vieux cellulaire (ralentir l'épuisement des ressources, réduire la pollution, rendre la techno accessible). Zones : Montréal, Rive-Nord, Rive-Sud. + FAQ de 5 questions (texte sur la page live).

### F.A.Q. (`/faq`) — reprendre mot pour mot
1. **Pourquoi vous ne chargez aucuns frais, tandis que la plupart le font ?** Car nous avons des acheteurs pour tous les types de composantes, métaux, plastique et même le carton, ce qui nous permet d'offrir un service sans frais.
2. **Y a-t-il une quantité minimum d'équipements ?** Minimum de 20 items (sans compter les claviers et les souris).
3. **Avez-vous une distance maximum ?** Nous couvrons Montréal et la Rive-Nord. Pour plus de 50 items, nous nous déplaçons aussi sur la Rive-Sud.
4. **Est-ce possible de faire affaire avec vous sur une base régulière ?** Oui, ententes à long terme possibles selon les besoins.
5. **Les équipements peuvent-ils être trop vieux ou endommagés ?** Non, tout le matériel électronique et informatique se recycle, peu importe l'âge.

### Contact (`/contact`)
**Éric Després — Propriétaire** · T : 514.594.4949 · E : info@infoliquidationrecycle.com · Lundi au jeudi 8 h – 17 h, vendredi 8 h – 16 h, samedi-dimanche fermé · Adresse : 514 Chemin De La Rivière Sud, Local 102, Saint-Eustache, QC J7R 0E2 · Carte Google Maps intégrée (embed : Info Liquidation Recycle Inc., Saint-Eustache) + formulaire de contact simple (nom, courriel, téléphone, message).

---

## FORMULAIRE DE RAMASSAGE (`/formulaire-de-ramassage`) — page clé, soigne-la

- Note en haut : « * Champs obligatoires. Vos données resteront confidentielles et seront utilisées strictement pour le ramassage de votre équipement informatique et électronique. »
- **Identité** : Titre (M. / Mme), Prénom, Nom, Compagnie, Courriel, Téléphone, Adresse, Ville, Code postal.
- **Quantités approximatives** avec steppers +/− animés : Tours d'ordinateurs · Serveurs · Ordinateurs portables · Modems / Routeurs / Switch · Écrans CRT · Écrans LCD · Téléphones / Cellulaires · Imprimantes (laser, jet d'encre) · UPS · Photocopieur · Autres équipements (champ texte).
- Radio : « Je désire obtenir un certificat de destruction de données pour les disques durs » — Oui / Non.
- ⚠️ Minimum d'items : le site actuel affiche « minimum 10 items » sur le formulaire mais « minimum 20 items » dans la FAQ. Affiche **« Minimum de 20 items requis (sans compter claviers et souris) »** et mets un commentaire `// TODO: confirmer le minimum avec le client` dans le code.
- Sous le formulaire : « Votre demande sera traitée dans un délai de 24 heures et le ramassage sera effectué dans un délai maximum de 72 heures. Nous ne chargeons aucuns frais que ce soit pour le ramassage ou le transport. »
- Validation Zod + états de succès/erreur animés. Soumission via une API route Next.js qui envoie un courriel à `info@infoliquidationrecycle.com` (intègre Resend avec une clé en variable d'environnement `RESEND_API_KEY` et un `// TODO` clair pour la configurer ; en attendant, logger la soumission et afficher le succès).

---

## COORDONNÉES OFFICIELLES (exactes, partout sur le site)

- **Téléphone : (514) 594-4949** (cliquable `tel:5145944949`)
- **Courriel : info@infoliquidationrecycle.com**
- **Adresse : 514 Chemin De La Rivière Sud, Local 102, Saint-Eustache, QC J7R 0E2** (lien Google Maps : `https://g.page/InfoLiquidationRecycle?share`)
- **Heures : lundi au jeudi 8 h – 17 h · vendredi 8 h – 16 h · samedi et dimanche fermé**
- **Facebook : https://www.facebook.com/InfoLiquidationRecycle/**
- Slogan : « **La référence pour votre recyclage informatique et électronique** » · Signature footer : « **LES EXPERTS DU RECYCLAGE** »

## FOOTER

Logo + « LES EXPERTS DU RECYCLAGE » + adresse, courriel, téléphone, heures + icône Facebook + bandeau « Service de ramassage GRATUIT — Grand-Montréal » avec CTA + liste des villes (liens vers les pages villes) : Montréal, Rive-Nord, Rive-Sud, Laval, St-Eustache, Longueuil, Boisbriand, St-Jérôme, Mascouche, Lachine, Terrebonne, Brossard, Ste-Thérèse, Mirabel, Dorval, Côte-St-Luc, Ville-St-Laurent, Kirkland, Repentigny, Lasalle, Blainville + « © 2026 Info Liquidation Recycle | Sitemap ».

---

## SEO

- Title accueil : « Recyclage Informatique & Électronique Montréal - InfoLiquidation Recycle » ; meta description : « Recyclage informatique, électronique à Montréal et Laval. Collecte de matériel en fin de vie - InfoLiquidation Recycle ». Titles/descriptions uniques par page, riches en mots-clés locaux (recyclage informatique Montréal, Laval, Rive-Nord, Rive-Sud…).
- JSON-LD `LocalBusiness` (nom, adresse, téléphone, heures, géo Saint-Eustache) + `FAQPage` sur la page FAQ.
- `sitemap.xml` et `robots.txt` générés, attributs `alt` sur toutes les images, balises `hreflang` FR/EN.

## CRITÈRES DE FIN (vérifie tout avant de terminer)

1. `npm run build` passe sans erreur ni warning TypeScript.
2. Les 13 pages FR + pages villes + versions EN existent et sont navigables ; aucun lien mort.
3. Le **logo officiel** apparaît dans le header, le footer et le favicon.
4. Landing page : toutes les sections listées, animations fluides 60 fps, spectaculaire sur desktop ET mobile.
5. Responsive parfait (360px → 1920px), score Lighthouse visé 90+ (performance, accessibilité, SEO).
6. `prefers-reduced-motion` respecté ; contrastes AA.
7. Aucune information inventée : tout provient du contenu ci-dessus ou du site live.

## ORDRE DE TRAVAIL SUGGÉRÉ

1. Scaffold Next.js + Tailwind + next-intl + Framer Motion ; télécharge les assets (logo en premier).
2. Design system : couleurs, typos, boutons, cartes, conteneurs.
3. Header + footer + layout bilingue.
4. Landing page complète (le gros du travail — soigne chaque section).
5. Pages services et pages de contenu, formulaire de ramassage, contact, FAQ, blog.
6. Pages villes dynamiques + SEO (metadata, JSON-LD, sitemap).
7. Passe de polish : animations, responsive, accessibilité, build final.

Quand tu as terminé, lance le serveur de dev et donne-moi un résumé des pages créées et des TODO restants (clé Resend, minimum d'items à confirmer).

