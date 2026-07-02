#!/bin/bash
# Deploy shell-web static bundle to prod (/srv/shell-web behind nginx /shell/).
# No pm2 process is created or restarted. Nginx conf is edited ONCE manually (C7) with .bak.
# Usage: scripts/deploy-shell.sh [--dry-run]
set -euo pipefail
cd "$(dirname "$0")/.."

HOST=daria-admin3
DEST=/srv/shell-web
APP=apps/shell-web
DRY=${1:-}

echo "== build =="
(cd "$APP" && pnpm generate)
test -f "$APP/.output/public/index.html"

echo "== verify bundle routes =="
ls "$APP/.output/public/index.html" >/dev/null
ls "$APP/.output/public/200.html" >/dev/null || echo "warn: no SPA fallback 200.html"

if [ "$DRY" = "--dry-run" ]; then
  echo "dry-run: skipping rsync"; exit 0
fi

echo "== rsync =="
ssh -o BatchMode=yes "$HOST" "sudo mkdir -p $DEST && sudo chown \$(whoami) $DEST"
rsync -az --delete "$APP/.output/public/" "$HOST:$DEST/"

echo "== smoke =="
curl -sI https://m.oxoxoxo.online/shell/ | head -1
ssh -o BatchMode=yes "$HOST" "sudo -u admin3 pm2 list | grep -c online" | xargs echo "pm2 online processes:"
echo "done"
