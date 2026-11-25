# Runbook sécurité — version PHP

## Où sont les journaux
| Fichier (sur le serveur) | Contenu |
|---|---|
| `storage/logs/security.log` (+ `.1`, rotation à 5 Mo) | Une ligne JSON par événement : `ts` (UTC), `event`, `outcome`, `ip`, `ua`, `rid` (= en-tête `X-Request-Id`, aussi renvoyé dans les erreurs JSON `requestId`), `method`, `path`, `details`. Jamais de mot de passe, jeton, cookie ni donnée de formulaire. |
| `storage/logs/php_errors.log` | Erreurs PHP (production) et erreurs détaillées Resend / eBay. |
| cPanel → *Metrics → Errors* / *Raw Access* | Journaux Apache (403, 404, IP). |

Événements : `admin_login` (success / failure / not_configured / storage_unwritable), `admin_login_lockout` (scope ip-burst, ip-daily, ip-requests, global), `admin_logout`, `admin_api_denied` (401/415), `csrf_origin_rejected` (403), `calendar_create|update|delete`, `google_oauth_connect`, `upstream_error` (Google/eBay), `form_submission` (accepted, rejected_validation, rejected_origin, too_large, invalid_json, rate_limited, mail_failed), `form_blocked`, `form_honeypot`, `mail_not_configured`, `mail_send_failed`, `ratelimit_overflow`, `ratelimit_storage_error`, `config_missing`, `server_error` (5xx).

## Chercher (cPanel → Terminal, depuis le dossier de l'application)
```
tail -n 50 storage/logs/security.log                       # derniers événements
grep '"event":"admin_login"' storage/logs/security.log | grep '"outcome":"success"'   # connexions réussies
grep -c '"outcome":"failure"' storage/logs/security.log    # nombre d'échecs de connexion
grep '"rid":"ab12cd34ef567890"' storage/logs/*.log         # une requête précise (référence donnée à l'utilisateur)
grep -o '"ip":"[^"]*"' storage/logs/security.log | sort | uniq -c | sort -rn | head   # IP les plus actives
```

## Alertes à mettre en place (cPanel n'en a pas)
1. **Disponibilité** : UptimeRobot (gratuit) sur `https://<domaine>/` et `https://<domaine>/contact`, alerte courriel.
2. **Tâche cron quotidienne** (cPanel → *Cron Jobs*, l'adresse courriel du cron reçoit la sortie si elle n'est pas vide) :
   ```
   0 7 * * * cd $HOME/<dossier-app> && grep -hE '"event":"(admin_login","outcome":"success|admin_login_lockout|config_missing|mail_not_configured|mail_send_failed|ratelimit_overflow|ratelimit_storage_error|server_error)"' storage/logs/security.log | grep "\"ts\":\"$(date -u -d yesterday +\%Y-\%m-\%d)"
   ```
   (Dans une ligne cron, les `%` doivent rester précédés de `\`.)
   Reçoit : connexions admin réussies (à reconnaître), blocages, configuration manquante, courriels non envoyés, erreurs 5xx.
3. Tous les mois : `bash php/scripts/check-exposed.sh <domaine>` depuis le PC (aucun 200).

## Quand une alerte se déclenche : 3 premiers gestes
1. **Évaluer** : `grep` du `rid` ou de l'IP dans `security.log` ; connexion admin réussie inconnue ou action calendrier non faite par vous = compromission probable ; vague d'échecs = attaque par force brute (déjà freinée).
2. **Contenir** : session volée → cliquer « Se déconnecter » (révoque toutes les sessions) puis changer `ADMIN_SESSION_SECRET` ; mot de passe compromis → nouveau haché (`php php/tools/hash-password.php`) dans `ADMIN_PASSWORD_HASH` ; clé Google / eBay / Resend exposée → la révoquer chez le fournisseur et en créer une nouvelle (voir `README.md`, « Si une clé fuit »). Courriels non envoyés → vérifier `RESEND_API_KEY` / `RESEND_FROM` et le domaine dans Resend, puis rappeler les clients du jour (demandes perdues).
3. **Noter et vérifier** : garder une copie des journaux (`storage/logs/`), noter date, IP, actions ; vider `storage/ratelimit/` si de vrais utilisateurs sont bloqués ; relancer `check-exposed.sh`. Fuite de données personnelles (Loi 25) : tenir le registre des incidents et aviser la Commission d'accès à l'information et les personnes concernées si le risque de préjudice est sérieux.
