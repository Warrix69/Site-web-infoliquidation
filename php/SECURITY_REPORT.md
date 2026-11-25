# Rapport de sécurité — version PHP du site (check 27)

Date : 2026-11-25 · branche `securite-prelancement` (rien n'est commité) · portée : dossier `php/` et pages admin `public/admin/*.html`.
Documents liés : `SECURITY_MAP.md` (carte du site), `SECURITY_AUDIT_FINDINGS.md` (constats F-01 à F-22, vérifications d'hébergeur H-1 à H-12), `SECRETS_AUDIT.md` (clés), `SECURITY_RUNBOOK.md` (que faire en cas d'incident).

Tous les tests ont été faits **sur ton PC seulement** (serveurs locaux temporaires `127.0.0.1`), avec de **fausses clés générées à chaque fois**. Le vrai `php/.env` n'a jamais été utilisé par le serveur de test, aucun courriel n'a pu partir (clé Resend vide), aucun appel à Google ou eBay n'a été fait, et le vrai dossier `php/storage/` n'a pas été modifié (vérifié avant / après).

---

## 1. Résumé

| | Nombre |
|---|---|
| Vérifications au total (01 à 27 + bonus B1 à B7) | **34** |
| Réussis (rien à corriger) | **7** |
| Corrigés et re-testés | **14** |
| Encore ouverts (prochaine étape technique) | **1** |
| Action manuelle (seulement toi peux le faire) | **7** |
| Non applicables (N/A) | **5** |

**Tests automatiques : 288 réussis, 0 échoué** (`php php/tests/security_test.php`, environ 15 secondes).

En clair : le code du site est prêt du côté sécurité. Ce qui reste, ce sont surtout des **gestes à faire toi-même** au moment de la mise en ligne (changer les clés, configurer cPanel, activer la double authentification sur tes comptes, le DNS du courriel). La liste détaillée est à la section 5.

Pendant ce check, les tests ont trouvé **3 vrais problèmes**, corrigés puis re-testés :
1. **Déconnexion** : une session ouverte dans la **même seconde** que le clic sur « Se déconnecter » restait valide. Corrigé dans `php/app/lib/admin_auth.php` (lignes 113-118 et 132-133) : une session doit maintenant être émise *après* la déconnexion ; une reconnexion immédiate reste possible.
2. **Serveur de test local** (`php -S`, jamais utilisé en ligne) : il servait le fichier `/.htaccess`. Corrigé dans `php/public/index.php` (ligne 16) : les fichiers cachés ne sont plus servis, comme sur Apache.
3. **Crochet anti-secret de git** (`.githooks/pre-commit`, lignes 31-32) : il bloquait bien une clé privée, mais **affichait son contenu** dans le message d'erreur. Le contenu est maintenant masqué.

Pour que les tests n'utilisent jamais tes vraies clés, `php/app/bootstrap.php` (lignes 11-17) accepte maintenant un dossier `storage` et un `.env` de remplacement, **seulement** s'ils sont définis par un fichier PHP de démarrage (le contrôleur de test). Une requête web ne peut pas les changer ; en ligne, rien ne change.

---

## 2. Tableau des vérifications

Statuts : **Réussi** · **Corrigé & re-testé** · **Ouvert – prochaine étape** · **Action manuelle** · **N/A**.
« Preuve » = le groupe de tests `[NN]` de `php/tests/security_test.php` (le nombre entre parenthèses = tests réussis), ou la commande.

| # | Vérification | Statut | Preuve | Notes |
|---|---|---|---|---|
| 00 | Carte de l'application | Réussi | `php/SECURITY_MAP.md` | Base de tout le reste : chaque page, API et donnée est listée. |
| 01 | Authentification (connexion admin) | Corrigé & re-testé | `[01]` (22) | 8 routes API admin refusées (401) sans cookie et avec 10 sortes de faux cookies (forgé, modifié, expiré, futur, trop long, signé par une autre clé, ancien format…). Même réponse pour mauvais identifiant ou mauvais mot de passe. La déconnexion coupe **toutes** les sessions (bug « même seconde » corrigé aujourd'hui). OAuth Google : `state` vérifié, jeton jamais affiché. |
| 02 | Clés API cachées du navigateur | Réussi | `[02]` (1) | Aucun motif de clé (Resend, Google, eBay, AWS, Stripe, clé privée…) dans les 30 fichiers texte envoyés au navigateur (`php/public/`, pages admin). |
| 03 | Base de données | N/A | — | Le site n'a **aucune base de données** (pas de MySQL, pas de comptes clients). Les seules données sont dans Google Calendar et eBay, lues par le serveur. |
| 04 | HTTPS | Action manuelle | `[04]` (3) | Le code est prêt : redirection HTTP → HTTPS dans `.htaccess`, HSTS 2 ans, `upgrade-insecure-requests`. Il reste à activer le certificat (AutoSSL) et à vérifier en ligne (section 5, étapes C et D). |
| 05 | Mots de passe hachés | Corrigé & re-testé | `[05]` (7) | `ADMIN_PASSWORD_HASH` (password_verify) prioritaire ; le mot de passe en clair n'est utilisé que s'il n'y a pas de haché ; plus de 1024 octets refusé ; aucun mot de passe, haché, clé ni cookie dans les journaux. **À faire** : créer le haché sur le serveur (section 5, A3). |
| 06 | Validation côté serveur | Corrigé & re-testé | `[06]` (38) | 29 formulaires piégés (tableaux à la place de texte, nombres négatifs, 1 milliard, décimales, 60 000 caractères, JSON cassé ou imbriqué 600 fois, 9 items…) → 400 propre. Corps de plus de 64 Ko → 413, y compris en mode « chunked ». Champs en trop (`role: admin`) ignorés. Minimum de 10 items vérifié par le serveur. |
| 07 | XSS (injection de code dans les pages) | Corrigé & re-testé | `[07]` (25) | 8 adresses piégées (`<img onerror>`, `"><svg onload>`, `javascript:`) : rien n'est renvoyé tel quel. Le HTML des courriels est échappé (vérifié sur le vrai courriel généré, sans l'envoyer) et le sujet reste sur une ligne. Tableau de bord : aucun `onclick` construit avec des données. |
| 08 | Journalisation | Corrigé & re-testé | `[08]` (7) | Une ligne JSON par événement dans `storage/logs/security.log` (date, événement, résultat, IP, navigateur, référence de requête). Retours de ligne et caractères de contrôle retirés ; mots de passe, jetons et chaîne de requête jamais notés. |
| 09 | Routes admin | Corrigé & re-testé | `[09]` (10) | 9 adresses admin → renvoi vers la connexion sans session. Les pages admin ne sont plus dans le dossier public (`app/views/admin/`). Une déconnexion anonyme ne fait rien. |
| 10 | Injection / requêtes paramétrées | Corrigé & re-testé | `[10]` (41) | 23 chemins piégés (`../`, `%2e%2e%2f`, octet nul, `' OR '1'='1`…) → 404. Identifiant d'événement `..` refusé (F-12). Code : aucun `eval`, commande système, `unserialize`, ni `include` construit depuis la requête. Pas de SQL (pas de base). |
| 11 | Variables d'environnement | Corrigé & re-testé | `[11]` (11) | En production sans `RESEND_API_KEY` : erreur 502 au lieu d'un faux « merci » (F-01). Admin refusé si la clé de session fait moins de 32 caractères, manque, ou si `SITE_URL` manque. Aucune vraie valeur de `php/.env` dans les fichiers livrés (comparé en mémoire, jamais affiché). `.env` ignoré par git. |
| 12 | Limites de débit | Corrigé & re-testé | `[12]` (10) | 5ᵉ mauvais mot de passe en 15 min → 429 + `Retry-After` (le bon mot de passe est aussi refusé pendant le blocage). 6ᵉ formulaire valide en 15 min → 429. Une fausse IP (`X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`) ne contourne rien. |
| 13 | CORS | Réussi | `[13]` (1) | 20 requêtes depuis `https://evil.example` (avec et sans session) : aucun en-tête `Access-Control-*`. |
| 14 | En-têtes de sécurité | Corrigé & re-testé | `[14]` (8) | Sur une page, une page 404, deux API et deux pages admin : CSP, CSP « rapport seulement » (stricte), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP, HSTS, `X-Request-Id`, pas de `X-Powered-By`, `no-store` sur l'admin et les API. La CSP stricte est encore en mode « rapport » : voir point ouvert O-1. |
| 15 | Cookies de session | Corrigé & re-testé | `[15]` (6) | `HttpOnly`, `SameSite=Lax`, `Path=/`, sans `Domain`, 8 h. En HTTPS : nom `__Host-ilr_admin` + `Secure` (testé derrière un proxy de confiance et en unitaire). Un faux `X-Forwarded-Proto` venant d'un visiteur est ignoré. |
| 16 | CSRF (requêtes forcées depuis un autre site) | Corrigé & re-testé | `[16]` (16) | Origine étrangère → 403 sur connexion, déconnexion, création / modification / suppression calendrier, contact, ramassage. Déconnexion en GET → 405. API admin en `text/plain` ou formulaire → 415. `localhost` accepté seulement en mode développement. |
| 17 | Liens de réinitialisation / magiques | N/A | — | Aucun lien par courriel : pas de « mot de passe oublié », pas de lien magique, aucun courriel envoyé aux visiteurs (seulement à info@). |
| 18 | Fichiers envoyés | N/A | `[18]` (1) | Aucun envoi de fichier (pas de `$_FILES`, pas de champ fichier). Le test le vérifie à chaque exécution. |
| 19 | Prix et paiements | N/A | `[19]` (1) | Aucun paiement en ligne. eBay est lu seulement. Le test vérifie qu'aucun code de paiement n'apparaît. |
| 20 | Mode débogage / erreurs | Corrigé & re-testé | `[20]` (15) | En production l'application coupe elle-même l'affichage des erreurs (testé avec un serveur réglé sur « afficher »). 12 erreurs provoquées (404, JSON cassé, identifiant invalide, Google/eBay non configurés, erreur fatale, UTF-8 invalide…) : ni pile, ni chemin de fichier, ni « Warning ». Erreurs détaillées seulement dans `storage/logs/`. |
| 21 | Dépendances vulnérables | Ouvert – prochaine étape | `npm audit --omit=dev` (voir `SECRETS_AUDIT.md` §4) | PHP : aucune dépendance. Côté navigateur, la bibliothèque `zod` (validation des formulaires) a un avis « élevé » de faible impact. Dependabot est configuré (`.github/dependabot.yml`). Voir O-2. |
| 22 | Paquets inutilisés | Réussi | `[22]` (1) | Aucune dépendance PHP (pas de Composer). Code mort `json_body()` retiré (F-21). |
| 23 | Fichiers exposés | Corrigé & re-testé | `[23]` (50) + `check-exposed.sh` | Règle `.htaccess` testée sur 27 noms dangereux (`.env`, `error_log`, `backup.zip`, `dump.sql`, `.map`, `README.md`…) et 11 fichiers normaux. `php/.htaccess`, `php/app/.htaccess`, `php/storage/.htaccess` refusent tout. `bash php/scripts/check-exposed.sh` sur le serveur de test : 43 chemins, **aucun 200** (41 × 404, 2 × 307 vers la connexion). **À refaire en ligne** (section 5, D1). |
| 24 | Historique git | Réussi | `SECRETS_AUDIT.md` §1 + `[24]` (8) | Aucun secret dans l'historique. Le crochet `pre-commit` bloque 5 sortes de faux secrets, un `.env` et un jeton de `storage/`, sans afficher la valeur (correctif d'aujourd'hui pour les clés privées). |
| 25 | Clés révoquées / remplacées | Action manuelle | — | Ne peut pas être automatisé : les clés actuelles ont transité par des conversations IA. Liste et étapes : section 5, A. |
| 26 | Revue complète | Réussi | `SECURITY_AUDIT_FINDINGS.md` | 22 constats (aucun critique ni élevé). Tous corrigés ; les restes sont listés en section 4. |
| 27 | Tests et rapport | Réussi | ce rapport ; `[27]` (3) ; `.github/workflows/security.yml` | 288 tests ; relancés par GitHub à chaque envoi. |
| B1 | Fonctions d'IA | N/A | — | Le site n'utilise aucune IA (pas de clé OpenAI/Anthropic, pas de génération de texte). |
| B2 | SSRF (le serveur forcé à appeler une adresse) | Réussi | `[B2]` (2) | Le serveur n'appelle que des adresses fixes (Google, eBay, Resend) ; aucune adresse venant d'un visiteur. |
| B3 | Sauvegardes | Action manuelle | — | Pas de base de données. À sauvegarder : le `.env` du serveur (dans ton gestionnaire de mots de passe) et une sauvegarde cPanel complète avant le lancement. Le code est dans git. |
| B4 | Tes comptes (double authentification) | Action manuelle | — | Section 5, E. |
| B5 | Plafonds de dépenses | Action manuelle | — | Section 5, F. |
| B6 | Vie privée (Loi 25) | Action manuelle | `[B6]` (1) | Fait : polices et éclairages 3D hébergés sur le site (plus d'envoi de l'IP des visiteurs à Google Fonts ni à githack, testé), aucune donnée de formulaire dans les journaux en production. À faire : politique de confidentialité (Resend aux États-Unis, Google Calendar), registre des incidents (`SECURITY_RUNBOOK.md`). |
| B7 | Domaine de courriel (SPF, DKIM, DMARC) | Action manuelle | — | Section 5, G. |

---

## 3. Constats et correctifs (F-01 à F-22)

| Constat | Ce qui n'allait pas | Fichiers modifiés | Test qui le prouve |
|---|---|---|---|
| F-01 | Sans clé Resend, le formulaire disait « merci » mais la demande était perdue et les données du client allaient dans le journal. | `app/lib/mailer.php`, `app/bootstrap.php` (avertissement de configuration) | `[11]` « production sans RESEND_API_KEY → 502 » ; `[05]` journaux sans données |
| F-02 | Le fichier `error_log` de cPanel pouvait être téléchargé. | `public/.htaccess` (règle élargie : `error_log`, archives, bases, `.map`…), `app/bootstrap.php` (journal dans `storage/logs/`) | `[23]` règle `.htaccess` ; `[20]` journal dans storage |
| F-03 | Si tout `php/` était déposé dans `public_html`, le `.env` devenait lisible. | `php/.htaccess`, `php/app/.htaccess` (tout refuser), `public/.htaccess` (`Require all granted`), `public/index.php` (`PUBLIC_DIR`), `README.md` | `[23]` fichiers `.htaccess` |
| F-04 | La déconnexion n'invalidait pas la session ; pas de préfixe `__Host-`. | `app/lib/admin_auth.php` (jeton v2 avec date d'émission, révocation côté serveur, `__Host-`), `app/api/admin/logout.php` ; **aujourd'hui** : bug de la même seconde | `[01]` déconnexion / révocation ; `[15]` cookie |
| F-05 | Limite de connexion par IP exacte seulement. | `app/api/admin/login.php` (limite globale 50 échecs / h), `app/lib/http.php` (IPv6 regroupée par /64) | `[12]` verrouillage. Le regroupement IPv6 n'est pas testé en HTTP (tests en IPv4 local). |
| F-06 | Le dossier des compteurs pouvait être rempli ; limites désactivées si non inscriptible. | `app/lib/rate_limit.php` (plafond 20 000 fichiers, ménage 1/50, connexion refusée si `storage/` non inscriptible) | Revue du code ; non testé automatiquement (20 000 fichiers, droits Windows). Vérification en ligne : H-9. |
| F-07 | Protection CSRF reposant seulement sur `SameSite`. | `app/lib/http.php` (`require_same_origin`), `app/lib/admin_auth.php` (415), `app/api/admin/logout.php` (POST seulement), formulaires | `[16]` (16 tests) |
| F-08 | CSP faible, pas de COOP, en-têtes absents des fichiers statiques. | `public/index.php` (COOP, `frame-ancestors 'none'`, CSP stricte en mode rapport), `public/.htaccess` (`Header always set`) | `[14]` |
| F-09 | Pages admin dans le dossier public. | `build.mjs` (copie dans `app/views/admin/`), `public/index.php` (`serve_admin_file`) | `[09]`, `[23]` `/admin/dashboard.html` |
| F-10 | Messages d'erreur bruts de Google / eBay montrés à l'admin. | `app/api/ebay/summary.php`, `app/lib/google_calendar.php` (message court + référence ; détail dans le journal) | `[20]` erreurs Google / eBay forcées |
| F-11 | En-têtes `Host` / `X-Forwarded-Proto` crus sur parole. | `app/lib/admin_auth.php` (`google_redirect_uri` depuis `SITE_URL`), `app/lib/http.php` (`X-Forwarded-Proto` seulement d'un proxy de confiance) | `[15]` faux `X-Forwarded-Proto` ignoré. Reste dans `.htaccess` : voir O-3. |
| F-12 | Un identifiant d'événement `..` visait le calendrier lui-même. | `public/index.php`, `app/api/calendar/event.php` (aucun point permis) | `[10]` DELETE / PATCH `..`, `%2e%2e`, `.` → 404 |
| F-13 | Aucun journal de sécurité. | `app/lib/security_log.php` (nouveau) + appels dans les API | `[08]` |
| F-14 | Clé de session qui retombait sur le mot de passe ; mot de passe en clair seulement. | `app/lib/admin_auth.php` (32 caractères minimum, plus de repli, `ADMIN_PASSWORD_HASH`), `tools/hash-password.php` (nouveau) | `[11]` admin refusé (4 cas) ; `[05]` |
| F-15 | Limite de 64 Ko contournable (envoi « chunked »). | `app/lib/validation.php` (lecture plafonnée), `app/api/contact.php`, `app/api/pickup.php`, API calendrier | `[06]` « chunked 70 Ko → 413 » (contact, ramassage, admin) |
| F-16 | Tableau de bord : quelques valeurs insérées sans échappement, `onclick` construits avec des données. | `public/admin/dashboard.html` (`esc()`, `data-id` + écouteurs) | `[07]` aucun `on…="${…}"` (source et copie) |
| F-17 | Polices Google et éclairages 3D chargés chez des tiers (IP des visiteurs envoyée sans consentement). | `build.mjs` + `third-party/` (auto-hébergés), pages admin | `[B6]` aucune ressource tierce chargée |
| F-18 | `TRUST_PROXY=1` aurait permis de choisir son IP. | `app/lib/http.php` (liste d'IP exactes de proxy) | `[12]` fausses IP ignorées ; serveur « proxy » de test |
| F-19 | Sujet du courriel construit avec des retours de ligne possibles. | `app/lib/mailer.php` (`mail_header_text`) | `[07]` sujet sur une seule ligne |
| F-20 | Jeton Google affiché dans la page de configuration. | `app/api/google/callback.php` (enregistré dans `storage/google_refresh_token.json`, jamais affiché) | `[01]` jeton jamais inséré dans la page ; `state` falsifié refusé |
| F-21 | Variables inutiles, code mort, fichiers internes téléversés. | `app/lib/http.php` (`json_body` retiré), `README.md` (liste d'exclusion), `.env.example` | `[11]` `.env.example` sans valeur |
| F-22 | Minimum de 10 items non vérifié par le serveur. | `app/lib/validation.php` | `[06]` « ramassage 9 items → 400 » |

---

## 4. Points ouverts

| # | Point | Risque | Prochaine étape exacte |
|---|---|---|---|
| O-1 | La CSP stricte (liste des scripts et ressources permis) est en mode **« rapport seulement »** : elle signale sans bloquer. Les autres en-têtes sont actifs. | Faible | Après une semaine sans message (section 5, H), demander à Claude de remplacer `Content-Security-Policy-Report-Only` par `Content-Security-Policy` dans `php/public/index.php` (fonction `csp_report_only`), puis relancer les tests. |
| O-2 | `zod` (validation des formulaires dans le navigateur) a un avis « élevé » ; `next`/`postcss` aussi, mais ils ne sont **pas** livrés avec la version PHP. | Faible (le serveur PHP refait toute la validation) | `npm audit fix --force` (passe à zod 4), puis `node php/build.mjs`, tester les deux formulaires et relancer les tests. Ou accepter la demande Dependabot. |
| O-3 | `.htaccess` : la redirection vers HTTPS reprend le nom de domaine envoyé par le visiteur et saute la redirection si le visiteur envoie `X-Forwarded-Proto: https` (ne touche que ce visiteur). | Faible | Sans Cloudflare : remplacer `https://%{HTTP_HOST}%{REQUEST_URI}` par `https://infoliquidationrecycle.com%{REQUEST_URI}` et retirer la ligne `RewriteCond %{HTTP:X-Forwarded-Proto} !=https` (règle aussi le `www`). |
| O-4 | Pas de double authentification sur l'admin (mot de passe seul, mais long, haché et limité à 5 essais). | Faible à moyen | Plus tard : code TOTP (application d'authentification) sur `/admin/login`. |
| O-5 | Le tableau de bord a encore 44 gestionnaires `onclick` dans le HTML : la CSP admin doit permettre `'unsafe-inline'`. | Faible | Remplacer les `onclick` par des écouteurs JavaScript, puis retirer `'unsafe-inline'` de la CSP admin. |
| O-6 | Le verrou global (50 échecs / h toutes IP) permet à un attaquant de bloquer la connexion admin 15 min. | Faible (compromis voulu) | Rien à faire ; en cas d'alerte, voir `SECURITY_RUNBOOK.md` (vider `storage/ratelimit/`). |
| O-7 | Les tests tournent sur le serveur intégré de PHP, pas sur Apache : les règles `.htaccess` sont vérifiées par lecture, pas en vrai. | Moyen tant que ce n'est pas vérifié en ligne | Section 5, D1 (`check-exposed.sh` + `curl` sur le vrai site). |
| O-8 | Certaines erreurs PHP surviennent **avant** le code du site (ex. envoi mal formé) : seul le réglage de l'hébergeur peut les cacher. | Faible | Section 5, C3 (`display_errors = Off`). |
| O-9 | Plafond de fichiers des compteurs (F-06) et regroupement IPv6 (F-05) non testés automatiquement. | Faible | Vérifier une fois en ligne : 6 mauvais mots de passe → message « Trop de tentatives » (prouve que `storage/` est inscriptible), puis vider `storage/ratelimit/`. |

---

## 5. Actions manuelles (seulement toi peux les faire)

Ordre conseillé : A (nouvelles clés) → B (`.env` du serveur) → C (cPanel) → D (vérifications en ligne) → E, F, G, H, I.
Les nouvelles valeurs vont **directement** dans le `.env` du serveur. Ne les colle jamais dans une conversation (Claude ou autre), un courriel ou une capture d'écran.

### A. Changer toutes les clés (check 25)
- [ ] **A1 — Google (client secret + jeton)**
  1. https://console.cloud.google.com → choisir le projet → *APIs & Services* → *Credentials*.
  2. Cliquer sur le client OAuth « Web » du site → *Add secret* (ajouter un secret) → copier le nouveau secret dans `GOOGLE_CLIENT_SECRET` du `.env` du serveur → revenir et **supprimer l'ancien secret**.
  3. Dans le même écran, *Authorized redirect URIs* : garder seulement `https://infoliquidationrecycle.com/api/google/callback` (utiliser un autre client pour les tests locaux).
  4. *OAuth consent screen* : statut **In production** (sinon le jeton expire après 7 jours).
  5. https://myaccount.google.com/permissions → trouver l'application du site → **Supprimer l'accès** (révoque les anciens jetons, celui de la version PHP et celui de la version Next.js).
  6. Après la mise en ligne : se connecter à `/admin`, ouvrir `https://infoliquidationrecycle.com/api/google/auth-start`, accepter. Le nouveau jeton est enregistré sur le serveur (rien à copier). Laisser `GOOGLE_REFRESH_TOKEN` vide.
- [ ] **A2 — eBay (Cert ID + jeton utilisateur)**
  1. https://developer.ebay.com → *My Account* → *Application Keys* → jeu de clés **Production**.
  2. Renouveler le **Cert ID** (Client Secret) si l'option est offerte ; sinon créer un nouveau jeu de clés de production. Copier dans `EBAY_CERT_ID` (et `EBAY_APP_ID` s'il change).
  3. *User Tokens* → *Get a Token from eBay via Your Application* → se connecter au compte vendeur, accepter → copier le **refresh token** dans `EBAY_REFRESH_TOKEN`.
  4. Dans ton compte eBay (*Compte* → *Préférences / Autorisations d'applications tierces*), retirer les anciennes autorisations de l'application si elles apparaissent.
  5. Retirer `EBAY_DEV_ID` et `EBAY_RUNAME` du `.env` du serveur (inutilisés).
- [ ] **A3 — Mot de passe admin → `ADMIN_PASSWORD_HASH`, créé SUR LE SERVEUR**
  1. Choisir un nouveau mot de passe de 20+ caractères aléatoires (gestionnaire de mots de passe) et un `ADMIN_USERNAME` moins évident que l'actuel.
  2. Téléverser aussi le fichier `php/tools/hash-password.php` (il refuse de s'exécuter depuis le web).
  3. cPanel → *Terminal* → `cd ~/<dossier du site>` puis `php tools/hash-password.php` → taper le mot de passe deux fois.
  4. Copier la ligne affichée `ADMIN_PASSWORD_HASH='…'` (avec les apostrophes) dans le `.env` du serveur. **Ne pas** mettre `ADMIN_PASSWORD`.
- [ ] **A4 — Nouvelle `ADMIN_SESSION_SECRET`** : dans le Terminal cPanel, `php -r "echo bin2hex(random_bytes(32));"` → copier dans `ADMIN_SESSION_SECRET`. Ne jamais réutiliser celle du PC.
- [ ] **A5 — Resend (clé de production limitée)**
  1. https://resend.com → *Domains* → *Add Domain* → `infoliquidationrecycle.com` → ajouter les enregistrements DNS affichés (voir G) → *Verify* jusqu'à **Verified**.
  2. *API Keys* → *Create API Key* → permission **Sending access** (envoi seulement), domaine `infoliquidationrecycle.com` → copier dans `RESEND_API_KEY`.
  3. Supprimer toute ancienne clé de test dans *API Keys*.
- [ ] **A6 — Version Next.js / Vercel** : si elle n'est plus utilisée, retirer ses variables Google / eBay / admin dans Vercel (*Project* → *Settings* → *Environment Variables*).

### B. `.env` du serveur (à créer à partir de `.env.example`, jamais le `.env` du PC)
- [ ] `APP_ENV=` (vide = production)
- [ ] `SITE_URL=https://infoliquidationrecycle.com`
- [ ] `RESEND_API_KEY=` (A5) et `RESEND_FROM="Info Liquidation Recycle <noreply@infoliquidationrecycle.com>"`
- [ ] `ADMIN_USERNAME=`, `ADMIN_PASSWORD_HASH='…'` (A3), `ADMIN_SESSION_SECRET=` (A4) — pas de `ADMIN_PASSWORD`
- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (A1), `GOOGLE_CALENDAR_ID`, `GOOGLE_REFRESH_TOKEN` vide
- [ ] `EBAY_APP_ID`, `EBAY_CERT_ID`, `EBAY_REFRESH_TOKEN` (A2), `EBAY_MARKETPLACE_ID=EBAY_CA`
- [ ] `TRUST_PROXY=` vide (sauf si Cloudflare : demander avant)
- [ ] Garder une copie du `.env` du serveur dans ton gestionnaire de mots de passe (sauvegarde, B3).

### C. cPanel
- [ ] **C1 — Racine du site** : *Domains* → le domaine → *Document Root* = `…/php/public`. Si cPanel l'interdit (domaine principal = `public_html`) : copier le **contenu** de `php/public/` dans `public_html/`, et `app/`, `storage/`, `.env` un niveau au-dessus (README, étape 2). Ne jamais déposer tout `php/` dans `public_html/`.
- [ ] **C2 — Version PHP** : *MultiPHP Manager* → cocher le domaine → **PHP 8.3** (8.1 minimum). *Select PHP Version* → *Extensions* : `curl`, `openssl`, `mbstring`, `json` cochées.
- [ ] **C3 — Erreurs** : *MultiPHP INI Editor* → *Editor Mode* → le domaine → `display_errors = Off`, `log_errors = On`, `expose_php = Off`, `error_log = /home/<utilisateur>/logs/php_errors.log` (hors de `public_html`).
- [ ] **C4 — HTTPS** : *SSL/TLS Status* → *Run AutoSSL* → certificat valide pour `infoliquidationrecycle.com` **et** `www.` (et tout sous-domaine utilisé : HSTS couvre les sous-domaines).
- [ ] **C5 — Permissions** : *File Manager* → `.env` → *Permissions* **600** ; dossier `storage/` **700** (inscriptible par PHP).
- [ ] **C6 — Fichiers à ne pas téléverser** : `js/`, `css/`, `tools/` (sauf `hash-password.php`), `scripts/`, `third-party/`, `tests/`, `build.mjs`, `perf-audit/`, tous les `*.md`, le `.env` du PC, et le contenu local de `storage/`.

### D. Vérifications après la mise en ligne (depuis ton PC, Git Bash)
- [ ] **D1** — `bash php/scripts/check-exposed.sh https://infoliquidationrecycle.com` → doit finir par « Aucun chemin sensible exposé » (aucun 200 sauf `/`).
- [ ] **D2** — En-têtes sur une page **et** sur une image :
  `curl -sI https://infoliquidationrecycle.com/` puis `curl -sI https://infoliquidationrecycle.com/logo.png`
  Les deux doivent montrer `strict-transport-security`, `x-content-type-options: nosniff`, `x-frame-options: DENY`, `content-security-policy`, `referrer-policy`, et **pas** de `x-powered-by`.
- [ ] **D3** — `curl -sI http://infoliquidationrecycle.com/` → `301` vers `https://`. `curl -sI https://infoliquidationrecycle.com/admin` → `307` vers `/admin/login`.
- [ ] **D4** — https://securityheaders.com → entrer le domaine → note **A** visée.
- [ ] **D5** — https://www.ssllabs.com/ssltest/ → entrer le domaine → note **A** visée.
- [ ] **D6** — Connexion admin : outils du navigateur (F12) → *Application* → *Cookies* → `__Host-ilr_admin` avec *Secure* et *HttpOnly* cochés.
- [ ] **D7** — Envoyer un vrai formulaire de contact → le courriel arrive à info@ (sinon vérifier A5 / G ; une erreur s'affiche au visiteur au lieu de perdre la demande).

### E. Double authentification (B4)
- [ ] **GitHub** : *Settings* → *Password and authentication* → *Enable two-factor authentication*.
- [ ] **Hébergeur** (espace client) **et cPanel** : *Security* → *Two-Factor Authentication*.
- [ ] **Registraire du domaine** : double authentification + **verrouillage du domaine** (*Domain lock* / *Registrar lock*).
- [ ] **Google** (compte du calendrier) : https://myaccount.google.com/security → *Validation en deux étapes*.
- [ ] **eBay** : *Compte* → *Connexion et sécurité* → *Validation en deux étapes*.
- [ ] **Resend** : paramètres du compte → double authentification (si offerte).

### F. Plafonds et alertes de dépenses (B5)
- [ ] **Google Cloud** : *Billing* → *Budgets & alerts* → budget de 1 $ avec alerte courriel (si un compte de facturation est lié). *APIs & Services* → *Google Calendar API* → *Quotas* : laisser les quotas par défaut.
- [ ] **Resend** : rester sur le forfait gratuit (pas de dépassement facturé) ou régler une alerte d'utilisation ; vérifier *Usage* chaque mois.

### G. DNS du courriel (B7)
- [ ] Ajouter chez le gestionnaire DNS les enregistrements donnés par Resend : DKIM (`resend._domainkey`, TXT), SPF et MX sur le sous-domaine `send`.
- [ ] DMARC : TXT sur `_dmarc.infoliquidationrecycle.com` = `v=DMARC1; p=none; rua=mailto:info@infoliquidationrecycle.com` ; après 2 à 4 semaines sans problème, passer à `p=quarantine`.
- [ ] Un **seul** enregistrement SPF à la racine du domaine (s'il y en a deux, les fusionner).
- [ ] Contrôle : dans le courriel reçu en D7, *Afficher l'original* → `spf=pass`, `dkim=pass`, `dmarc=pass`.

### H. Passer la CSP en mode imposé (O-1), après une semaine
1. Ouvrir le site dans Chrome → **F12** → onglet **Console**.
2. Visiter : accueil, une page de ville, un article de blog, contact, formulaire de ramassage (sans l'envoyer), FAQ ; puis `/admin/login`, le tableau de bord, l'onglet calendrier et l'onglet eBay.
3. Chercher des messages contenant **« Content Security Policy »** ou **« [Report Only] »**.
4. Aucun message pendant une semaine → demander à Claude de passer la CSP en mode imposé. Un message → le copier (il ne contient pas de secret) et le donner à Claude.

### I. GitHub et ménage
- [ ] Dépôt GitHub → *Settings* → *Code security* (ou *Advanced Security*) → activer **Dependabot alerts**, **Secret scanning** et **Push protection** (selon ce que ton forfait permet).
- [ ] Sur chaque PC où tu fais des commits : `git config core.hooksPath .githooks` (active le crochet anti-secret).
- [ ] **Après** avoir changé les clés (A) : supprimer les anciennes transcriptions Claude qui contiennent des valeurs en clair, dans `C:\Users\Admin\.claude\projects\C--Users-Admin-Documents-Site-Infoliquidation-recycle\` : `90b25ca1-….jsonl` (16 nov.) et `9760256f-….jsonl` (25 nov.) (noms complets dans `SECRETS_AUDIT.md` §1).
- [ ] Une fois par mois : `bash php/scripts/check-exposed.sh https://infoliquidationrecycle.com` et lecture du journal (`SECURITY_RUNBOOK.md`).

---

## 6. Comment lancer les tests

Sur ce PC, depuis le dossier du projet :
```
node php/build.mjs
php php/tests/security_test.php
```
(`php` = `C:/Users/Admin/AppData/Local/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/php.exe` ; les extensions `curl`, `openssl` et `mbstring` sont chargées automatiquement.)

- Résultat : une ligne `PASS` ou `FAIL [numéro de vérification]` par test, un bilan par vérification, puis `TOTAL`. Code de sortie 1 s'il y a un échec.
- Ce que fait la suite : elle démarre 3 serveurs locaux temporaires (production, développement, production derrière un proxy de confiance), crée un `.env` et un dossier `storage` temporaires avec de fausses clés générées à chaque fois, lance tous les tests, puis arrête les serveurs et efface le dossier temporaire. Elle ne lit pas le vrai `.env` pour faire tourner le site (seul le test 11 compare ses valeurs en mémoire avec les fichiers livrés, sans jamais les afficher).
- Fichiers : `php/tests/security_test.php` (la suite), `php/tests/test-router.php` (démarrage du serveur de test), `php/tests/unit_helper.php` (vérifications unitaires). Le dossier `tests/` ne doit pas être téléversé (et `php/.htaccess` le bloque de toute façon).
- Options : `ILR_TEST_KEEP=1` garde le dossier temporaire (pour lire les journaux de test) ; `ILR_BASH=<chemin de bash>` si Git Bash n'est pas trouvé.
- **GitHub (CI)** : `.github/workflows/security.yml` relance tout à chaque envoi (`npm ci`, `node php/build.mjs`, PHP 8.3 avec `shivammathur/setup-php@v2`, puis la suite). Sur GitHub il n'y a pas de `php/.env` : la comparaison des vraies valeurs (test 11) est alors indiquée « ignorée », le reste tourne normalement.

Dernière exécution (2026-11-25, PHP 8.3.36, Windows) : **288 réussis, 0 échoué, 0 ignoré**.
