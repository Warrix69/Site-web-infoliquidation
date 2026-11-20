# Info Liquidation Recycle — version PHP

Même site que la version Next.js (mêmes pages FR/EN, textes, URL, animations, 3D, formulaires, admin), en PHP 8.1+ sans Composer. Conventions de code : `CONVENTIONS.md`.

## Préparer les fichiers (sur ce PC)
```
node php/build.mjs
```
Compile `public/assets/` (CSS Tailwind, JS des animations et de la 3D) et copie les images, le modèle 3D, l'admin et les textes FR/EN depuis le projet Next.js. À relancer après toute modification de `src/` ou des gabarits PHP.

## Tester en local
Configuration « php » de `.claude/launch.json` (serveur intégré de PHP sur http://localhost:8080).

## Mettre en ligne (cPanel / hébergement mutualisé)
1. Envoyer le dossier `php/` sur le serveur, **sauf** `js/`, `css/`, `tools/`, `build.mjs`.
2. Faire pointer la racine web du domaine sur `php/public/` (ou copier le contenu de `public/` dans `public_html/` et `app/`, `storage/`, `.env` un niveau au-dessus).
3. Copier `.env.example` en `.env` et remplir les valeurs (Resend, admin, Google, eBay).
4. `storage/` doit être accessible en écriture par PHP.
5. Extensions PHP requises : curl, openssl, mbstring, json. Apache avec `mod_rewrite` (le `.htaccess` est fourni).
6. Google Calendar : ajouter `https://<domaine>/api/google/callback` comme URI de redirection autorisée.
