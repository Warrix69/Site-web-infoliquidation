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

## Sécurité des clés API
Les clés (Resend, Google, eBay, admin) ne vivent que dans `.env`, lu par PHP sur le serveur. Elles ne sont jamais envoyées au navigateur : le tableau de bord appelle `/api/...`, et c'est le serveur qui parle à Google et eBay.
- **`.env` hors du dossier public** : il doit être au-dessus de `public_html` (ou de `php/public`), jamais dedans. Le `.htaccess` refuse de toute façon les fichiers cachés (`.env`, `.git`…).
- **Permissions** : `.env` en 600 (lisible seulement par ton compte) ; `storage/` en 700.
- **Jamais dans git** : `.env` est ignoré ; seul `.env.example` (vide) est suivi.
- **`ADMIN_SESSION_SECRET`** : toujours le remplir (64 caractères au hasard), et mettre un mot de passe admin long.
- **Si une clé fuit** (courriel, capture d'écran, conversation) : la régénérer. Google : supprimer l'accès sur myaccount.google.com/permissions puis refaire `/api/google/auth-start`. eBay : nouveau jeton dans le portail développeur eBay. Admin : changer `ADMIN_PASSWORD` et `ADMIN_SESSION_SECRET` (toutes les sessions sont alors déconnectées).
