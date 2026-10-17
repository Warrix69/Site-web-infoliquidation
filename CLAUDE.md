# Info Liquidation Recycle — règles projet

Next.js 15 (App Router) + TS + Tailwind v4 + next-intl + Framer Motion + Resend.

## Règles d'économie de tokens (IMPORTANT — appliquer en permanence)

**Lecture de fichiers**
- Toujours `Grep` d'abord pour localiser avant de `Read`.
- `Read` avec `offset` + `limit` ciblés (jamais le fichier entier sauf si <50 lignes).
- Ne jamais relire un fichier qu'on vient d'éditer (Edit a déjà confirmé le succès).
- Les gros fichiers (`public/admin/dashboard.html` 190Ko, `src/messages/*.json`) : toujours `Grep` + `Read` ciblé.

**Vérifications visuelles**
- Pas de screenshot sauf si (a) l'utilisateur demande explicitement de voir, (b) changement critique de layout, ou (c) debug visuel d'un bug reproduit par l'user.
- Pour les simples changements de texte/couleur/padding : zéro screenshot, zéro vérification browser.
- Pour les changements de code logique : TypeScript check seulement (`npx tsc --noEmit`), pas de dev server reload.

**Édition et outils**
- Grouper les Edit multiples dans un même message en parallèle.
- Pas de narration avant/pendant les tool calls (« je vais faire X, maintenant Y »).
- Pas de récap verbeux à la fin — 1-2 phrases max : ce qui a changé + fichier.
- Pas de `TaskCreate` sauf si l'user demande ou si >5 étapes.

**Déploiements et vérifications prod**
- Après `npx vercel --prod --yes` : juste confirmer le status Ready, pas de screenshot Vercel.
- `git push` + `vercel deploy` groupés en une seule commande chaînée.

**Si l'user donne un feedback vague** (« c'est laid », « rend-le mieux ») : demander 1 question précise AVANT d'itérer, pas essayer 3 versions.

## Direction artistique

- Palette stricte : vert (#16A34A, accent #22C55E), blanc (#FFFFFF), gris (#F4F4F5 / #71717A / #27272A), noir (#0A0A0A). Le vert sert d'accent (CTA, mots clés, chips), jamais de fond principal.
- Typographie géante en display, beaucoup d'espace blanc, grille éditoriale, alternance de sections noires et claires.
- Animations : révélation du texte au scroll (`Reveal`, `WordReveal`), compteurs animés (`Counter`), marquee, parallaxe léger, micro-interactions au hover. Toujours respecter `prefers-reduced-motion`.
- Logo : `public/logo.png`. Prévoir une variante blanche pour fonds foncés.

> **Note police** : la spec client demande Poppins. Le projet utilise actuellement `Inter` + `Space_Grotesk` (chargées via `next/font/google` dans `src/app/[locale]/layout.tsx`). À basculer vers Poppins lors d'un prochain passage visuel.

## Faits officiels (ne jamais inventer)

- Ramassage 100 % gratuit (ramassage, transport, matériel)
- Minimum 10 items / ramassage
- Réponse en 24 h, ramassage en 72 h max
- Certificat de destruction sans frais sur demande
- Destruction physique des disques durs (déchiquetage ou broyage), aussi sur site
- 100 % des composants valorisés et recyclés
- Clientèle : entreprises et particuliers
- Territoire : Grand Montréal, Rive-Nord, Rive-Sud

Coordonnées : voir `src/lib/site.ts` (source unique de vérité).  
Téléphone affiché : **(450) 473-4636** (confirmé par le client).

## Internationalisation

- FR par défaut (sans préfixe), EN sous `/en/` (next-intl, `localePrefix: "as-needed"`).
- Chemins traduits dans `src/i18n/routing.ts`.
- Contenu dans `src/messages/fr.json` et `src/messages/en.json`.
- Articles de blog migrés du WordPress d'origine. Les contenus EN partagent le corps FR pour le moment (seuls titres et extraits sont traduits) — à traduire proprement avant lancement EN.

## SEO

- `src/app/sitemap.ts` et `src/app/robots.ts` sont auto-générés à partir du routing + CITIES + BLOG_SLUGS.
- Redirections 301 dans `next.config.ts` : anciennes URL WordPress → nouvelles.
- Metadata par page via `pageMetadata()` dans `src/lib/seo.ts`.
- JSON-LD LocalBusiness dans `src/app/[locale]/layout.tsx` + BlogPosting par article.

## Formulaire de ramassage

- Composant principal : `src/components/forms/PickupForm.tsx`.
- Validation : `src/lib/schemas.ts` (Zod), min. 10 items total.
- Envoi : `src/app/api/pickup/route.ts` → Resend → `info@infoliquidationrecycle.com`.
- Sans `RESEND_API_KEY`, les soumissions sont journalisées côté serveur (dev).

## Loi 25 (Québec)

- Bannière de consentement : `src/components/layout/CookieBanner.tsx` (témoins strictement nécessaires seulement).
- Politique dédiée : `/politique-de-temoins/`.

## Données & dossiers clés

- `src/lib/site.ts` : coordonnées, SERVICES, CITIES, BLOG_SLUGS.
- `src/messages/{fr,en}.json` : textes.
- `public/images/` : images.
- `.env.local` : secrets (jamais commités).

## Ce qu'il reste à faire (connu)

- Basculer polices → Poppins (spec client).
- Vraies traductions EN des articles de blog.
- Confirmer le numéro de téléphone affiché.
- Lenis + GSAP ScrollTrigger (polish : actuellement Framer Motion seul).
- Curseur personnalisé + boutons magnétiques.
- Verifier domaine Resend en prod.
