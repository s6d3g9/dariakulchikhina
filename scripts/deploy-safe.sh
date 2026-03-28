#!/usr/bin/env bash
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-daria-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/daria-nuxt}"
APP_NAME="${APP_NAME:-daria-nuxt}"
MESSENGER_ECOSYSTEM_PATH="${MESSENGER_ECOSYSTEM_PATH:-messenger/ecosystem.config.cjs}"
MESSENGER_PM2_CORE_NAME="${MESSENGER_PM2_CORE_NAME:-daria-messenger-core}"
MESSENGER_PM2_WEB_NAME="${MESSENGER_PM2_WEB_NAME:-daria-messenger-web}"
MESSENGER_PM2_USER="${MESSENGER_PM2_USER:-admin2}"
MESSENGER_PUBLIC_HEALTHCHECK_URL="${MESSENGER_PUBLIC_HEALTHCHECK_URL:-https://dariakulchikhina.com/messenger/login}"
MESSENGER_REMOTE_HEALTHCHECK_URL="${MESSENGER_REMOTE_HEALTHCHECK_URL:-http://127.0.0.1:3300/messenger/login}"
DEPLOY_MESSENGER="${DEPLOY_MESSENGER:-1}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://152.53.176.165:3000/admin}"
REMOTE_HEALTHCHECK_URL="${REMOTE_HEALTHCHECK_URL:-http://127.0.0.1:3000/admin}"
HEALTHCHECK_ATTEMPTS="${HEALTHCHECK_ATTEMPTS:-6}"
HEALTHCHECK_DELAY="${HEALTHCHECK_DELAY:-5}"
AUTO_GIT_SAVE="${AUTO_GIT_SAVE:-1}"
LOCAL_SNAPSHOT_BEFORE_DEPLOY="${LOCAL_SNAPSHOT_BEFORE_DEPLOY:-1}"
LOCAL_SNAPSHOT_KEEP="${LOCAL_SNAPSHOT_KEEP:-10}"
TRACK_DEPLOY_BRANCHES="${TRACK_DEPLOY_BRANCHES:-1}"
DEPLOY_LATEST_BRANCH="${DEPLOY_LATEST_BRANCH:-deploy/latest}"
DEPLOY_PREVIOUS_BRANCH="${DEPLOY_PREVIOUS_BRANCH:-deploy/previous}"
DRY_RUN="${DRY_RUN:-0}"
PREFLIGHT="${PREFLIGHT:-1}"
PREFLIGHT_ONLY="${PREFLIGHT_ONLY:-0}"
NO_PREFLIGHT="${NO_PREFLIGHT:-0}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
METRICS_FILE="${METRICS_FILE:-$ROOT_DIR/logs/deploy-metrics.log}"

ensure_main_branch() {
  local branch
  branch="$(git branch --show-current)"
  if [[ "$branch" != "main" ]]; then
    echo "[error] деплой разрешён только из ветки main (сейчас: ${branch})" >&2
    exit 1
  fi
}

autosave_git_before_deploy() {
  echo "[git] авто-сохранение перед деплоем"
  git add -A

  if git diff --cached --quiet; then
    echo "[git] изменений для коммита нет"
  else
    local commit_msg
    commit_msg="chore(deploy): autosave before deploy $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
    git commit -m "$commit_msg"
    echo "[git] создан коммит: $commit_msg"
  fi

  git push origin main
}

save_local_snapshot_before_deploy() {
  local snapshots_dir
  local ts
  local sha
  local base

  snapshots_dir="$ROOT_DIR/builds/pre-deploy"
  mkdir -p "$snapshots_dir"

  ts="$(date -u +'%Y%m%d-%H%M%S')"
  sha="$(git rev-parse --short HEAD)"
  base="${snapshots_dir}/predeploy-${ts}-${sha}"

  git bundle create "${base}.bundle" HEAD >/dev/null 2>&1 || {
    echo "[error] не удалось создать локальный git snapshot" >&2
    exit 1
  }

  {
    echo "timestamp_utc=$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    echo "branch=$(git branch --show-current)"
    echo "head=$(git rev-parse HEAD)"
    git log --oneline -1
  } > "${base}.meta"

  echo "[local] snapshot сохранён: ${base}.bundle"

  ls -t "$snapshots_dir"/*.bundle 2>/dev/null | tail -n +$((LOCAL_SNAPSHOT_KEEP + 1)) | xargs -r rm -f
  ls -t "$snapshots_dir"/*.meta 2>/dev/null | tail -n +$((LOCAL_SNAPSHOT_KEEP + 1)) | xargs -r rm -f
}

rotate_deploy_tracking_branches() {
  local prev_source=""

  echo "[git] обновление веток деплоя: ${DEPLOY_PREVIOUS_BRANCH} <- ${DEPLOY_LATEST_BRANCH} <- HEAD"

  git fetch origin --quiet 2>/dev/null || true

  if git show-ref --verify --quiet "refs/remotes/origin/${DEPLOY_LATEST_BRANCH}"; then
    prev_source="origin/${DEPLOY_LATEST_BRANCH}"
  elif git show-ref --verify --quiet "refs/heads/${DEPLOY_LATEST_BRANCH}"; then
    prev_source="${DEPLOY_LATEST_BRANCH}"
  fi

  if [[ -n "$prev_source" ]]; then
    git branch -f "$DEPLOY_PREVIOUS_BRANCH" "$prev_source" >/dev/null
    git push --force-with-lease origin "$DEPLOY_PREVIOUS_BRANCH:$DEPLOY_PREVIOUS_BRANCH"
    echo "[git] ${DEPLOY_PREVIOUS_BRANCH} обновлена из ${prev_source}"
  else
    echo "[git] предыдущей версии не найдено (первый запуск)"
  fi

  git branch -f "$DEPLOY_LATEST_BRANCH" HEAD >/dev/null
  git push --force-with-lease origin "$DEPLOY_LATEST_BRANCH:$DEPLOY_LATEST_BRANCH"
  echo "[git] ${DEPLOY_LATEST_BRANCH} указывает на $(git rev-parse --short HEAD)"
}

# ── Перед деплоем: сохранить в git и локально ──────────────────────────────
ensure_main_branch
if [[ "$AUTO_GIT_SAVE" == "1" ]]; then
  autosave_git_before_deploy
fi

if [[ "$LOCAL_SNAPSHOT_BEFORE_DEPLOY" == "1" ]]; then
  save_local_snapshot_before_deploy
fi

if [[ "$TRACK_DEPLOY_BRANCHES" == "1" ]]; then
  rotate_deploy_tracking_branches
fi

git fetch origin --quiet 2>/dev/null
LOCAL_SHA=$(git rev-parse HEAD)
REMOTE_SHA=$(git rev-parse origin/main 2>/dev/null || echo "")
if [[ -n "$REMOTE_SHA" && "$LOCAL_SHA" != "$REMOTE_SHA" ]]; then
  echo "[error] HEAD не совпадает с origin/main после автосохранения" >&2
  exit 1
fi
echo "[git] синхронизировано с origin/main — $(git log --oneline -1)"
# ────────────────────────────────────────────────────────────────────────────
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

is_healthy_status() {
  local status_code="$1"
  case "$status_code" in
    200|301|302) return 0 ;;
    *) return 1 ;;
  esac
}

shell_escape() {
  printf '%q' "$1"
}

restart_messenger_pm2() {
  local remote_worktree
  local remote_ecosystem
  local remote_core_name
  local remote_web_name
  local remote_target_user
  local pm2_restart_cmd

  remote_worktree="$(shell_escape "$DEPLOY_PATH")"
  remote_ecosystem="$(shell_escape "$MESSENGER_ECOSYSTEM_PATH")"
  remote_core_name="$(shell_escape "$MESSENGER_PM2_CORE_NAME")"
  remote_web_name="$(shell_escape "$MESSENGER_PM2_WEB_NAME")"
  remote_target_user="$(shell_escape "$MESSENGER_PM2_USER")"
  pm2_restart_cmd="cd ${remote_worktree} && pm2 startOrRestart ${remote_ecosystem} --only ${remote_core_name} --update-env && pm2 startOrRestart ${remote_ecosystem} --only ${remote_web_name} --update-env && pm2 save --force >/dev/null"

  if [[ -n "$MESSENGER_PM2_USER" ]]; then
    ssh "$DEPLOY_HOST" "set -e; current_user=\$(id -un); if [[ \"\$current_user\" = ${remote_target_user} ]]; then ${pm2_restart_cmd}; else pm2 delete ${remote_core_name} ${remote_web_name} >/dev/null 2>&1 || true; sudo -u ${remote_target_user} -H bash -lc $(shell_escape "$pm2_restart_cmd"); fi"
  else
    ssh "$DEPLOY_HOST" "set -e; ${pm2_restart_cmd}"
  fi
}

run_remote_healthcheck() {
  ssh "$DEPLOY_HOST" "curl -o /dev/null -s -w '%{http_code}' --max-time 20 '$REMOTE_HEALTHCHECK_URL'" 2>/dev/null || true
}

run_healthcheck_with_retry() {
  local status_code=""
  local attempt

  for ((attempt = 1; attempt <= HEALTHCHECK_ATTEMPTS; attempt++)); do
    status_code="$(curl -o /dev/null -s -w '%{http_code}' --max-time 20 "$HEALTHCHECK_URL" || true)"
    echo "[deploy] health attempt ${attempt}/${HEALTHCHECK_ATTEMPTS}: ${status_code}" >&2

    if is_healthy_status "$status_code"; then
      echo "$status_code"
      return 0
    fi

    if (( attempt < HEALTHCHECK_ATTEMPTS )); then
      sleep "$HEALTHCHECK_DELAY"
    fi
  done

  local remote_status_code
  remote_status_code="$(run_remote_healthcheck)"
  echo "[deploy] remote localhost health status: ${remote_status_code}" >&2

  if is_healthy_status "$remote_status_code"; then
    echo "$remote_status_code"
    return 0
  fi

  echo "$status_code"
  return 1
}

run_preflight() {
  echo "[preflight] local tools"
  command -v ssh >/dev/null
  command -v curl >/dev/null

  echo "[preflight] ssh connectivity"
  ssh "$DEPLOY_HOST" "echo '[preflight] remote host reachable'"

  echo "[preflight] remote tools + path"
  ssh "$DEPLOY_HOST" "set -e; command -v node >/dev/null; command -v pnpm >/dev/null; command -v pm2 >/dev/null; command -v git >/dev/null; mkdir -p '$DEPLOY_PATH'; test -w '$DEPLOY_PATH'"

  if [[ "$DEPLOY_MESSENGER" == "1" && -n "$MESSENGER_PM2_USER" ]]; then
    echo "[preflight] messenger pm2 user"
    ssh "$DEPLOY_HOST" "set -e; if [[ \$(id -un) != '$(shell_escape "$MESSENGER_PM2_USER")' ]]; then command -v sudo >/dev/null; id -u '$(shell_escape "$MESSENGER_PM2_USER")' >/dev/null; sudo -n -u '$(shell_escape "$MESSENGER_PM2_USER")' true; fi"
  fi

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
if ssh "$DEPLOY_HOST" "set -e; cd '$DEPLOY_PATH'; pnpm install --frozen-lockfile;$(if [[ "$DEPLOY_MESSENGER" == "1" ]]; then printf ' pnpm -C messenger/core install --frozen-lockfile; pnpm -C messenger/web install --frozen-lockfile;'; fi) pnpm build$(if [[ "$DEPLOY_MESSENGER" == "1" ]]; then printf '; rm -rf messenger/web/.nuxt messenger/web/.output; pnpm messenger:core:build; pnpm messenger:web:build'; fi)"; then
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
if [[ "$DEPLOY_MESSENGER" == "1" ]]; then
  restart_messenger_pm2
fi
log_stage_time "restart" "$RESTART_START_TS"

echo "[deploy] pm2 status"
ssh "$DEPLOY_HOST" "pm2 status '$APP_NAME' --no-color"

echo "[deploy] healthcheck ${HEALTHCHECK_URL}"
HEALTH_START_TS=$(date +%s)
status_code="$(run_healthcheck_with_retry || true)"
echo "[deploy] health status: ${status_code}"

if [[ "$DEPLOY_MESSENGER" == "1" ]]; then
  messenger_status_code="$(curl -o /dev/null -s -w '%{http_code}' --max-time 20 "$MESSENGER_PUBLIC_HEALTHCHECK_URL" || true)"
  echo "[deploy] messenger health status: ${messenger_status_code}"

  if ! is_healthy_status "$messenger_status_code"; then
    messenger_status_code="$(ssh "$DEPLOY_HOST" "curl -o /dev/null -s -w '%{http_code}' --max-time 20 '$MESSENGER_REMOTE_HEALTHCHECK_URL'" 2>/dev/null || true)"
    echo "[deploy] messenger remote localhost health status: ${messenger_status_code}"
  fi
else
  messenger_status_code="200"
fi

log_stage_time "health" "$HEALTH_START_TS"

if is_healthy_status "$status_code" && is_healthy_status "$messenger_status_code"; then
    echo "[deploy] done"
    log_stage_time "total" "$SCRIPT_START_TS"
    write_metrics "ok"

    # ── Сохранение сборки локально ──────────────────────────────────────────
    BUILDS_DIR="$ROOT_DIR/builds"
    mkdir -p "$BUILDS_DIR"
    BUILD_ARCHIVE="$BUILDS_DIR/build-$(date -u +"%Y%m%d-%H%M%S")-$(git rev-parse --short HEAD).tar.gz"
    echo "[backup] сохраняю сборку с сервера → $BUILD_ARCHIVE"
    if ssh "$DEPLOY_HOST" "cd '$DEPLOY_PATH' && tar -czf - .output" > "$BUILD_ARCHIVE" 2>/dev/null; then
      echo "[backup] сохранено: $(du -sh "$BUILD_ARCHIVE" | cut -f1)"
      # Оставляем только последние 5 сборок
      ls -t "$BUILDS_DIR"/build-*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f
    else
      echo "[backup] предупреждение: не удалось сохранить сборку локально" >&2
      rm -f "$BUILD_ARCHIVE"
    fi
    # ────────────────────────────────────────────────────────────────────────
else
  echo "[deploy] warning: unexpected health status ${status_code}" >&2
  log_stage_time "total" "$SCRIPT_START_TS"
  write_metrics "failed"
  exit 1
fi
