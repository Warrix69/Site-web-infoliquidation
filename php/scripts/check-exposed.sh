#!/usr/bin/env bash
# Vérifie qu'aucun fichier sensible n'est accessible sur le site en ligne.
# Usage : bash php/scripts/check-exposed.sh infoliquidationrecycle.com
# Attendu : 403, 404 ou une redirection (301/307/308) partout ; un 200 est affiché en rouge
# (sauf / qui doit répondre 200 et sert de témoin).
set -u

if [ $# -lt 1 ] || [ -z "$1" ]; then
  echo "Usage : $0 <domaine>   (ex. $0 infoliquidationrecycle.com)" >&2
  exit 2
fi

scheme="https"
case "$1" in http://*) scheme="http" ;; esac # http:// explicite : tests locaux seulement
domain="${1#http://}"
domain="${domain#https://}"
domain="${domain%%/*}"
base="$scheme://$domain"

paths=(
  /.env /.env.local /.env.production /.env.development /.env.backup /.env.bak /.env.old
  /.git/config /.git/HEAD /.gitignore /.DS_Store /.vscode/settings.json /.idea/workspace.xml
  /backup.zip /backup.tar.gz /db.sql /dump.sql /database.sql /database.sqlite /data.db
  /config.json /config.yml /docker-compose.yml /.npmrc /phpinfo.php /server-status
  /swagger.json /openapi.json /graphql
  /error_log /storage/google_access_token.json /storage/google_refresh_token.json /storage/logs/security.log
  /app/bootstrap.php /php/.env /admin/dashboard.html /admin/dashboard.html/x
  /README.md /index.php.bak
)

# Cartes de sources (.map) des scripts réellement chargés par la page d'accueil
home="$(curl -s --max-time 20 "$base/" || true)"
while IFS= read -r js; do
  [ -n "$js" ] && paths+=("${js%%\?*}.map")
done < <(printf '%s' "$home" | grep -oE '/assets/[A-Za-z0-9_./-]+\.js' | sort -u)
paths+=(/assets/app.css.map)

if [ -t 1 ]; then red=$'\033[31m'; green=$'\033[32m'; reset=$'\033[0m'; else red=''; green=''; reset=''; fi

exposed=0
printf '%-8s %s\n' "STATUT" "CHEMIN"
code="$(curl -s -o /dev/null --max-time 20 -w '%{http_code}' "$base/")"
printf '%-8s %s (témoin, attendu 200)\n' "$code" "/"
for p in "${paths[@]}"; do
  code="$(curl -s -o /dev/null --path-as-is --max-time 20 -w '%{http_code}' "$base$p")"
  if [ "$code" = "200" ]; then
    printf '%s%-8s %s  <-- EXPOSÉ%s\n' "$red" "$code" "$p" "$reset"
    exposed=$((exposed + 1))
  else
    printf '%-8s %s\n' "$code" "$p"
  fi
done

echo
if [ "$exposed" -gt 0 ]; then
  echo "${red}$exposed chemin(s) répondent 200 : à corriger avant le lancement.${reset}"
  exit 1
fi
echo "${green}Aucun chemin sensible exposé.${reset}"
