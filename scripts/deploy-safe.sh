#!/usr/bin/env bash
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-daria-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/daria-nuxt}"
APP_NAME="${APP_NAME:-daria-nuxt}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://152.53.176.165:3000/admin}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[deploy] sync source -> ${DEPLOY_HOST}:${DEPLOY_PATH}"
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.nuxt' \
  --exclude '.output' \
  --exclude '.output_bak' \
  --exclude '.data' \
  --exclude '.vscode' \
  "$ROOT_DIR/" "${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo "[deploy] try remote install + build"
if ssh "$DEPLOY_HOST" "set -e; cd '$DEPLOY_PATH'; pnpm install --frozen-lockfile; pnpm build; pm2 restart '$APP_NAME' --update-env --silent"; then
  echo "[deploy] remote build success"
else
  echo "[deploy] remote build failed -> fallback to local build artifacts"
  pnpm build
  rsync -az --delete \
    "$ROOT_DIR/.output" \
    "$ROOT_DIR/ecosystem.config.cjs" \
    "$ROOT_DIR/package.json" \
    "${DEPLOY_HOST}:${DEPLOY_PATH}/"
  ssh "$DEPLOY_HOST" "set -e; cd '$DEPLOY_PATH'; pm2 restart '$APP_NAME' --update-env --silent"
fi

echo "[deploy] pm2 status"
ssh "$DEPLOY_HOST" "pm2 status '$APP_NAME' --no-color"

echo "[deploy] healthcheck ${HEALTHCHECK_URL}"
status_code="$(curl -o /dev/null -s -w '%{http_code}' --max-time 20 "$HEALTHCHECK_URL" || true)"
echo "[deploy] health status: ${status_code}"

case "$status_code" in
  200|301|302)
    echo "[deploy] done"
    ;;
  *)
    echo "[deploy] warning: unexpected health status ${status_code}" >&2
    exit 1
    ;;
esac
