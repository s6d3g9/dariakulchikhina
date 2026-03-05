#!/usr/bin/env bash
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-daria-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/daria-nuxt}"
APP_NAME="${APP_NAME:-daria-nuxt}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://152.53.176.165:3000/admin}"
DRY_RUN="${DRY_RUN:-0}"
PREFLIGHT="${PREFLIGHT:-1}"
PREFLIGHT_ONLY="${PREFLIGHT_ONLY:-0}"
NO_PREFLIGHT="${NO_PREFLIGHT:-0}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
METRICS_FILE="${METRICS_FILE:-$ROOT_DIR/logs/deploy-metrics.log}"

SCRIPT_START_TS=$(date +%s)
TIMESTAMP_UTC=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
METRIC_PREFLIGHT="-"
METRIC_SYNC="-"
METRIC_BUILD="-"
METRIC_RESTART="-"
METRIC_HEALTH="-"
METRIC_TOTAL="-"
MODE="full"

mkdir -p "$(dirname "$METRICS_FILE")"

write_metrics() {
  local status="$1"
  cat >> "$METRICS_FILE" <<EOF
${TIMESTAMP_UTC} mode=${MODE} status=${status} host=${DEPLOY_HOST} path=${DEPLOY_PATH} preflight=${METRIC_PREFLIGHT}s sync=${METRIC_SYNC}s build=${METRIC_BUILD}s restart=${METRIC_RESTART}s health=${METRIC_HEALTH}s total=${METRIC_TOTAL}s
EOF
}

log_stage_time() {
  local stage="$1"
  local started_at="$2"
  local now
  local duration
  now=$(date +%s)
  duration=$((now - started_at))
  echo "[time] ${stage}: ${duration}s"

  case "$stage" in
    preflight) METRIC_PREFLIGHT="$duration" ;;
    sync) METRIC_SYNC="$duration" ;;
    build) METRIC_BUILD="$duration" ;;
    restart) METRIC_RESTART="$duration" ;;
    health) METRIC_HEALTH="$duration" ;;
    total) METRIC_TOTAL="$duration" ;;
  esac
}

run_preflight() {
  echo "[preflight] local tools"
  command -v ssh >/dev/null
  command -v curl >/dev/null

  echo "[preflight] ssh connectivity"
  ssh "$DEPLOY_HOST" "echo '[preflight] remote host reachable'"

  echo "[preflight] remote tools + path"
  ssh "$DEPLOY_HOST" "set -e; command -v node >/dev/null; command -v pnpm >/dev/null; command -v pm2 >/dev/null; command -v git >/dev/null; mkdir -p '$DEPLOY_PATH'; test -w '$DEPLOY_PATH'"

  echo "[preflight] git remote reachable"
  ssh "$DEPLOY_HOST" "cd '$DEPLOY_PATH' && git fetch origin --dry-run 2>&1 | head -2"

  echo "[preflight] ok"
}

if [[ "$PREFLIGHT" == "1" || "$PREFLIGHT_ONLY" == "1" ]]; then
  if [[ "$NO_PREFLIGHT" == "1" && "$PREFLIGHT_ONLY" != "1" ]]; then
    PREFLIGHT="0"
  fi
fi

if [[ "$PREFLIGHT" == "1" || "$PREFLIGHT_ONLY" == "1" ]]; then
  PREFLIGHT_START_TS=$(date +%s)
  run_preflight
  log_stage_time "preflight" "$PREFLIGHT_START_TS"
fi

if [[ "$PREFLIGHT_ONLY" == "1" ]]; then
  MODE="preflight-only"
  echo "[deploy] preflight-only mode: checks passed"
  log_stage_time "total" "$SCRIPT_START_TS"
  write_metrics "ok"
  exit 0
fi

if [[ "$DRY_RUN" == "1" ]]; then
  MODE="dry-run"
fi

echo "[deploy] git sync: origin/main -> ${DEPLOY_HOST}:${DEPLOY_PATH}"
SYNC_START_TS=$(date +%s)
ssh "$DEPLOY_HOST" "set -e; cd '$DEPLOY_PATH'; git fetch origin; git reset --hard origin/main; git log --oneline -1"
log_stage_time "sync" "$SYNC_START_TS"

echo "[deploy] remote install + build"
BUILD_START_TS=$(date +%s)
if ssh "$DEPLOY_HOST" "set -e; cd '$DEPLOY_PATH'; pnpm install --frozen-lockfile; pnpm build"; then
  echo "[deploy] remote build success"
else
  echo "[deploy] remote build failed" >&2
  log_stage_time "build" "$BUILD_START_TS"
  write_metrics "failed"
  exit 1
fi
log_stage_time "build" "$BUILD_START_TS"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "[deploy] dry-run mode: skip pm2 restart and healthcheck"
  log_stage_time "total" "$SCRIPT_START_TS"
  write_metrics "ok"
  exit 0
fi

RESTART_START_TS=$(date +%s)
ssh "$DEPLOY_HOST" "set -e; cd '$DEPLOY_PATH'; pm2 restart '$APP_NAME' --update-env --silent"
log_stage_time "restart" "$RESTART_START_TS"

echo "[deploy] pm2 status"
ssh "$DEPLOY_HOST" "pm2 status '$APP_NAME' --no-color"

echo "[deploy] healthcheck ${HEALTHCHECK_URL}"
HEALTH_START_TS=$(date +%s)
status_code="$(curl -o /dev/null -s -w '%{http_code}' --max-time 20 "$HEALTHCHECK_URL" || true)"
echo "[deploy] health status: ${status_code}"
log_stage_time "health" "$HEALTH_START_TS"

case "$status_code" in
  200|301|302)
    echo "[deploy] done"
    log_stage_time "total" "$SCRIPT_START_TS"
    write_metrics "ok"
    ;;
  *)
    echo "[deploy] warning: unexpected health status ${status_code}" >&2
    log_stage_time "total" "$SCRIPT_START_TS"
    write_metrics "failed"
    exit 1
    ;;
esac
