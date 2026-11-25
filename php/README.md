# Info Liquidation Recycle — version PHP

Même site que la version Next.js (mêmes pages FR/EN, textes, URL, animations, 3D, formulaires, admin), en PHP 8.1+ sans Composer. Conventions de code : `CONVENTIONS.md`. Incidents de sécurité : `SECURITY_RUNBOOK.md`.

## Préparer les fichiers (sur ce PC)
```
node php/build.mjs
```
Compile `public/assets/` (CSS Tailwind, JS des animations et de la 3D), copie les images, le modèle 3D et les textes FR/EN depuis le projet Next.js, copie les pages admin dans `app/views/admin/` (hors de la racine web) et copie les polices et éclairages 3D auto-hébergés (`third-party/`, téléchargés une seule fois depuis Google Fonts et le dépôt drei-assets). À relancer après toute modification de `src/`, de `public/admin/` ou des gabarits PHP.

## Tester en local
Configuration « php » de `.claude/launch.json` (serveur intégré de PHP sur http://localhost:8080).
Mettre `APP_ENV=development` dans le `.env` local : les formulaires sont alors journalisés au lieu d'être envoyés si `RESEND_API_KEY` est absente, et les requêtes depuis localhost sont acceptées. Sans cette ligne, le site se comporte comme en production.

Tests de sécurité (après `node php/build.mjs`) : `php php/tests/security_test.php` — serveurs locaux temporaires, aucune vraie clé, aucun courriel envoyé. Aussi lancés par GitHub à chaque envoi (`.github/workflows/security.yml`). Détails : `SECURITY_REPORT.md`.

## Mettre en ligne (cPanel / hébergement mutualisé)
1. Envoyer le dossier `php/` sur le serveur, **sauf** : `js/`, `css/`, `tools/`, `scripts/`, `third-party/`, `build.mjs`, `perf-audit/`, tous les `*.md` (`README.md`, `CONVENTIONS.md`, `SECURITY_*.md`, `SECRETS_AUDIT.md`), `tests/` (suite de tests), le `.env` local et le contenu local de `storage/` (`*.json`, `logs/`, `ratelimit/`). Sur le serveur, `storage/` ne doit contenir au départ que `.htaccess` et `.gitignore`.
2. Faire pointer la racine web du domaine sur `php/public/`. Variante : copier le **contenu** de `public/` dans `public_html/` et mettre `app/`, `storage/`, `.env` un niveau au-dessus, hors de `public_html/` (ne pas y copier le `.htaccess` de `php/` : dans le dossier personnel, il bloquerait aussi les autres sites du compte). **Ne jamais** déposer tout le dossier `php/` dans `public_html/` : seul `public/` doit être accessible (les `.htaccess` de `php/` et `php/app/` refusent tout, par sécurité, mais ils ne remplacent pas un bon emplacement).
3. Créer le `.env` du serveur à partir de `.env.example` (jamais le `.env` local) : `APP_ENV` vide (= production), `SITE_URL`, `RESEND_API_KEY`, `RESEND_FROM`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (voir plus bas), `ADMIN_SESSION_SECRET` (64 caractères : `php -r "echo bin2hex(random_bytes(32));"`), Google, eBay. Permissions : `.env` en 600.
4. `storage/` doit être accessible en écriture par PHP (700). Sinon : connexion admin refusée (503) et limites anti-spam inactives.
5. Extensions PHP requises : curl, openssl, mbstring, json. Apache avec `mod_rewrite` et `mod_headers` (le `.htaccess` est fourni).
6. cPanel → *MultiPHP INI Editor* (mode éditeur, pour le domaine) : `display_errors = Off`, `log_errors = On`, `expose_php = Off`. Le site écrit déjà ses erreurs dans `storage/logs/php_errors.log` en production.
7. Google Calendar : ajouter `<SITE_URL>/api/google/callback` comme URI de redirection autorisée, puis se connecter à l'admin et ouvrir `/api/google/auth-start`. L'application Google doit être en mode **Production** (Google Auth Platform → Audience) : en mode « Test », Google fait expirer la connexion après 7 jours.
   eBay : dans le portail développeur eBay (User Tokens → RuName), mettre « Your auth accepted URL » = `<SITE_URL>/api/ebay/callback`, puis se connecter à l'admin et ouvrir `/api/ebay/auth-start`. La connexion dure 18 mois (limite d'eBay) ; l'admin affiche un rappel « Renouveler eBay » 30 jours avant, et le renouvellement prend un clic.
8. Vérifier depuis ce PC : `bash php/scripts/check-exposed.sh infoliquidationrecycle.com` (aucun fichier sensible ne doit répondre 200).

## Sécurité des clés API
Les clés (Resend, Google, eBay, admin) ne vivent que dans `.env`, lu par PHP sur le serveur. Elles ne sont jamais envoyées au navigateur : le tableau de bord appelle `/api/...`, et c'est le serveur qui parle à Google et eBay.
- **`.env` hors du dossier public** : il doit être au-dessus de `public_html` (ou de `php/public`), jamais dedans. Le `.htaccess` refuse de toute façon les fichiers cachés (`.env`, `.git`…), les journaux (`error_log`), archives, sauvegardes et bases de données.
- **Permissions** : `.env` en 600 (lisible seulement par ton compte) ; `storage/` en 700.
- **Jamais dans git** : `.env` est ignoré ; seul `.env.example` (vide) est suivi. Un crochet `pre-commit` (`.githooks/`) bloque les secrets connus : l'activer une fois avec `git config core.hooksPath .githooks`.
- **Mot de passe admin** : générer un haché avec `php php/tools/hash-password.php` (de préférence sur le serveur, cPanel → Terminal, pour que l'algorithme soit disponible) et le mettre dans `ADMIN_PASSWORD_HASH` ; retirer ensuite `ADMIN_PASSWORD`. Mot de passe de 20+ caractères aléatoires.
- **`ADMIN_SESSION_SECRET`** : obligatoire, 32 caractères minimum (64 recommandés). Sans lui, l'admin est refusé (503).
- **Sessions admin** : cookie `__Host-ilr_admin` en HTTPS (HttpOnly, Secure, SameSite=Lax), 8 h maximum. « Se déconnecter » invalide côté serveur **toutes** les sessions ouvertes (`storage/admin_sessions_valid_after`).
- **Anti-spam et anti-piratage** (`app/lib/rate_limit.php`, compteurs dans `storage/ratelimit/`, IPv6 regroupée par /64) :
  - Formulaires ramassage et contact : 5 envois **valides** en 15 min par adresse IP, puis bloqué 1 h avec un message clair et le numéro de téléphone. Les erreurs de saisie ne comptent pas, donc un client qui corrige son formulaire n'est jamais bloqué.
  - Un champ invisible piège les robots. Une demande qui le remplit n'est **jamais jetée** (pour ne pas perdre un vrai client) : le courriel arrive avec le sujet « [À vérifier : possible robot] ».
  - Connexion admin : 5 mauvais mots de passe en 15 min → bloqué 15 min ; 20 en 24 h → bloqué jusqu'à 24 h. Le bon mot de passe ne passe pas pendant le blocage. Toutes adresses confondues : 50 échecs en 1 h → connexion fermée 15 min pour tout le monde (compromis voulu contre les attaques distribuées).
  - Débloquer tout le monde : vider `storage/ratelimit/`.
- **Journal de sécurité** : `storage/logs/security.log` (connexions, blocages, déconnexions, actions calendrier, OAuth, formulaires, erreurs 5xx). Voir `SECURITY_RUNBOOK.md`.
- **Google** : le jeton obtenu par `/api/google/auth-start` est enregistré dans `storage/google_refresh_token.json` (prioritaire sur `GOOGLE_REFRESH_TOKEN`) et n'est jamais affiché. Pour revenir au `.env`, supprimer ce fichier.
- **Si une clé fuit** (courriel, capture d'écran, conversation) : la régénérer. Google : supprimer l'accès sur myaccount.google.com/permissions puis refaire `/api/google/auth-start`. eBay : nouveau jeton dans le portail développeur eBay. Admin : changer le mot de passe (`ADMIN_PASSWORD_HASH`) et `ADMIN_SESSION_SECRET` (toutes les sessions sont alors déconnectées).
