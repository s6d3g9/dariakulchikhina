#!/usr/bin/env bash
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-daria-deploy}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-refactor/architecture-v5}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/daria-nuxt-refactor}"
APP_NAME="${APP_NAME:-daria-nuxt-refactor}"
APP_PM2_USER="${APP_PM2_USER:-admin2}"
APP_ECOSYSTEM_PATH="${APP_ECOSYSTEM_PATH:-ecosystem.refactor.config.cjs}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-https://admin.dariakulchikhina.com/login?role=admin}"
REMOTE_HEALTHCHECK_URL="${REMOTE_HEALTHCHECK_URL:-http://127.0.0.1:3018/login?role=admin}"
HEALTHCHECK_ATTEMPTS="${HEALTHCHECK_ATTEMPTS:-8}"
HEALTHCHECK_DELAY="${HEALTHCHECK_DELAY:-5}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

shell_escape() {
  printf '%q' "$1"
}

ensure_branch() {
  local branch
  branch="$(git branch --show-current)"
  if [[ "$branch" != "$DEPLOY_BRANCH" ]]; then
    echo "[error] refactor deploy разрешён только из ветки ${DEPLOY_BRANCH} (сейчас: ${branch})" >&2
    exit 1
  fi
}

ensure_clean_worktree() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "[error] есть незакоммиченные изменения. Сначала зафиксируйте их и отправьте ${DEPLOY_BRANCH}." >&2
    exit 1
  fi
}

ensure_remote_synced() {
  local local_sha
  local remote_sha

  git fetch origin "$DEPLOY_BRANCH" --quiet
  local_sha="$(git rev-parse HEAD)"
  remote_sha="$(git rev-parse "origin/${DEPLOY_BRANCH}" 2>/dev/null || true)"

  if [[ -z "$remote_sha" ]]; then
    echo "[error] ветка origin/${DEPLOY_BRANCH} не найдена" >&2
    exit 1
  fi

  if [[ "$local_sha" != "$remote_sha" ]]; then
    echo "[error] локальный HEAD не совпадает с origin/${DEPLOY_BRANCH}. Сначала git push origin ${DEPLOY_BRANCH}." >&2
    exit 1
  fi

  echo "[git] синхронизировано с origin/${DEPLOY_BRANCH} — $(git log --oneline -1)"
}

run_preflight() {
  echo "[preflight] local tools"
  command -v ssh >/dev/null
  command -v curl >/dev/null

  echo "[preflight] ssh connectivity"
  ssh "$DEPLOY_HOST" "echo '[preflight] remote host reachable'"

  echo "[preflight] remote tools + path"
  ssh "$DEPLOY_HOST" "set -e; command -v node >/dev/null; command -v pnpm >/dev/null; command -v pm2 >/dev/null; command -v git >/dev/null; mkdir -p '$DEPLOY_PATH'; test -w '$DEPLOY_PATH'; test -f '$DEPLOY_PATH/.env'"

  if [[ -n "$APP_PM2_USER" ]]; then
    echo "[preflight] pm2 user"
    ssh "$DEPLOY_HOST" "set -e; if [[ \$(id -un) != '$(shell_escape "$APP_PM2_USER")' ]]; then command -v sudo >/dev/null; id -u '$(shell_escape "$APP_PM2_USER")' >/dev/null; sudo -n -u '$(shell_escape "$APP_PM2_USER")' true; fi"
  fi

  echo "[preflight] ok"
}

restart_app_pm2() {
  local remote_worktree
  local remote_ecosystem
  local remote_app_name
  local remote_target_user
  local pm2_restart_cmd

  remote_worktree="$(shell_escape "$DEPLOY_PATH")"
  remote_ecosystem="$(shell_escape "$APP_ECOSYSTEM_PATH")"
  remote_app_name="$(shell_escape "$APP_NAME")"
  pm2_restart_cmd="cd ${remote_worktree} && pm2 startOrRestart ${remote_ecosystem} --only ${remote_app_name} --update-env && pm2 save --force >/dev/null"

  if [[ -n "$APP_PM2_USER" ]]; then
    remote_target_user="$(shell_escape "$APP_PM2_USER")"
    ssh "$DEPLOY_HOST" "set -e; current_user=\$(id -un); if [[ \"\$current_user\" = ${remote_target_user} ]]; then ${pm2_restart_cmd}; else pm2 delete ${remote_app_name} >/dev/null 2>&1 || true; sudo -u ${remote_target_user} -H bash -lc $(shell_escape "$pm2_restart_cmd"); fi"
  else
    ssh "$DEPLOY_HOST" "set -e; ${pm2_restart_cmd}"
  fi
}

show_app_pm2_status() {
  local remote_app_name
  local remote_target_user
  local pm2_status_cmd

  remote_app_name="$(shell_escape "$APP_NAME")"
  pm2_status_cmd="pm2 status ${remote_app_name} --no-color"

  if [[ -n "$APP_PM2_USER" ]]; then
    remote_target_user="$(shell_escape "$APP_PM2_USER")"
    ssh "$DEPLOY_HOST" "set -e; current_user=\$(id -un); if [[ \"\$current_user\" = ${remote_target_user} ]]; then ${pm2_status_cmd}; else sudo -u ${remote_target_user} -H bash -lc $(shell_escape "$pm2_status_cmd"); fi"
  else
    ssh "$DEPLOY_HOST" "$pm2_status_cmd"
  fi
}

is_healthy_status() {
  local status_code="$1"
  case "$status_code" in
    200|301|302) return 0 ;;
    *) return 1 ;;
  esac
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

ensure_branch
ensure_clean_worktree
ensure_remote_synced
run_preflight

echo "[deploy] git sync: origin/${DEPLOY_BRANCH} -> ${DEPLOY_HOST}:${DEPLOY_PATH}"
ssh "$DEPLOY_HOST" "set -e; cd '$DEPLOY_PATH'; git fetch origin '$DEPLOY_BRANCH'; if git show-ref --verify --quiet 'refs/heads/$DEPLOY_BRANCH'; then git checkout '$DEPLOY_BRANCH'; else git checkout -b '$DEPLOY_BRANCH' 'origin/$DEPLOY_BRANCH'; fi; git reset --hard 'origin/$DEPLOY_BRANCH'; git log --oneline -1"

echo "[deploy] remote install + build"
ssh "$DEPLOY_HOST" "set -e; cd '$DEPLOY_PATH'; CI=true pnpm install --frozen-lockfile; CI=true pnpm build; node scripts/repair-nitro-vue-runtime.mjs"

echo "[deploy] restart pm2"
restart_app_pm2

echo "[deploy] pm2 status"
show_app_pm2_status

echo "[deploy] healthcheck ${HEALTHCHECK_URL}"
status_code="$(run_healthcheck_with_retry || true)"
echo "[deploy] health status: ${status_code}"

if is_healthy_status "$status_code"; then
  echo "[deploy] done"
else
  echo "[deploy] warning: unexpected health status ${status_code}" >&2
  exit 1
fi