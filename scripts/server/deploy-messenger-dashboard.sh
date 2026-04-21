#!/usr/bin/env bash
# deploy-messenger-dashboard.sh — one-shot deploy for the messenger-core,
# messenger-web, claude-web-dashboard, and claude-stream-bridge changes
# shipped by branch `claude/cli-server-connection-voJyJ`.
#
# Run on `daria-dev` from ~/daria.  Usage:
#
#   MESSENGER_DASHBOARD_TOKEN=<secret> \
#   DASHBOARD_VIEWER_LOGIN=stas \
#   CLAUDE_SESSION_DEFAULT_OWNER=<uuid> \
#       bash scripts/server/deploy-messenger-dashboard.sh [--branch NAME]
#
# The script:
#   1. git fetch + checkout the branch (default:
#      claude/cli-server-connection-voJyJ) and pull.
#   2. pnpm build for messenger-core and messenger-web.
#   3. pm2 restart for daria-messenger-core + daria-messenger-web.
#   4. Install the new claude-stream-bridge to ~/bin and reload the
#      dashboard systemd unit.
#   5. Append missing env lines to ~/.claude-dashboard-auth (idempotent).
#   6. Echo the two sanity-check curls at the end.
#
# It does NOT run pnpm deploy:safe:* (that's only for the main Nuxt app
# and is driven from Windows). It does NOT touch postgres or the main
# Nuxt process. Safe to run multiple times — every mutation is idempotent.

set -euo pipefail

# ---------------------------------------------------------------------------
# args + preflight
# ---------------------------------------------------------------------------

BRANCH="claude/cli-server-connection-voJyJ"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch) BRANCH="$2"; shift 2 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

DARIA_ROOT="${DARIA_ROOT:-$HOME/daria}"
DASHBOARD_ENV_FILE="${DASHBOARD_ENV_FILE:-$HOME/.claude-dashboard-auth}"
DASHBOARD_BIN="${DASHBOARD_BIN:-$HOME/bin/claude-web-dashboard}"
BRIDGE_BIN="${BRIDGE_BIN:-$HOME/bin/claude-stream-bridge}"

die()  { echo "[deploy] FATAL: $*" >&2; exit 1; }
step() { echo; echo "==> $*"; }

[[ -d "$DARIA_ROOT" ]] || die "DARIA_ROOT not found: $DARIA_ROOT"
cd "$DARIA_ROOT"
[[ -f package.json ]] || die "$DARIA_ROOT does not look like the daria repo"

for bin in git pnpm pm2 node curl jq; do
  command -v "$bin" >/dev/null 2>&1 || die "required tool missing: $bin"
done

# Required env — we check but don't default, because getting any of these
# wrong silently breaks the sync we're setting up.
: "${MESSENGER_DASHBOARD_TOKEN:?set MESSENGER_DASHBOARD_TOKEN (long random secret; same value in messenger-core env and dashboard env)}"
: "${DASHBOARD_VIEWER_LOGIN:?set DASHBOARD_VIEWER_LOGIN (e.g. stas — the messenger login the dashboard represents)}"
: "${CLAUDE_SESSION_DEFAULT_OWNER:?set CLAUDE_SESSION_DEFAULT_OWNER (messenger user uuid; new claude-session rows get tagged with it)}"

# ---------------------------------------------------------------------------
# 1. git
# ---------------------------------------------------------------------------

step "git: fetching + checking out $BRANCH"
git fetch origin "$BRANCH"
if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
else
  git checkout -B "$BRANCH" "origin/$BRANCH"
fi
echo "[deploy] HEAD: $(git log -1 --oneline)"

# ---------------------------------------------------------------------------
# 2. build
# ---------------------------------------------------------------------------

step "build: messenger-core"
pnpm -F @daria/messenger-core build

step "build: messenger-web"
pnpm -F @daria/messenger-web build

# ---------------------------------------------------------------------------
# 3. install bridge + dashboard binaries
# ---------------------------------------------------------------------------

step "bridge: installing to $BRIDGE_BIN"
mkdir -p "$(dirname "$BRIDGE_BIN")"
if [[ -x "$DARIA_ROOT/scripts/workrooms/install-bridge.sh" ]]; then
  bash "$DARIA_ROOT/scripts/workrooms/install-bridge.sh"
else
  cp "$DARIA_ROOT/scripts/workrooms/claude-stream-bridge.ts" "$BRIDGE_BIN"
  chmod +x "$BRIDGE_BIN"
fi
echo "[deploy] bridge at $BRIDGE_BIN ($(wc -l < "$BRIDGE_BIN") lines)"

step "dashboard: installing to $DASHBOARD_BIN"
cp "$DARIA_ROOT/scripts/workrooms/claude-web-dashboard.ts" "$DASHBOARD_BIN"
chmod +x "$DASHBOARD_BIN"
echo "[deploy] dashboard at $DASHBOARD_BIN ($(wc -l < "$DASHBOARD_BIN") lines)"

# ---------------------------------------------------------------------------
# 4. env: dashboard auth file (idempotent append)
# ---------------------------------------------------------------------------

step "env: ensuring $DASHBOARD_ENV_FILE has the required keys"
touch "$DASHBOARD_ENV_FILE"
chmod 600 "$DASHBOARD_ENV_FILE"

ensure_env_line() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$DASHBOARD_ENV_FILE"; then
    # replace existing
    sed -i "s|^${key}=.*|${key}=${val}|" "$DASHBOARD_ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$val" >> "$DASHBOARD_ENV_FILE"
  fi
}

ensure_env_line MESSENGER_CORE_URL          "http://127.0.0.1:4300"
ensure_env_line MESSENGER_DASHBOARD_TOKEN   "$MESSENGER_DASHBOARD_TOKEN"
ensure_env_line DASHBOARD_VIEWER_LOGIN      "$DASHBOARD_VIEWER_LOGIN"

echo "[deploy] $DASHBOARD_ENV_FILE now has:"
grep -E '^(MESSENGER_CORE_URL|MESSENGER_DASHBOARD_TOKEN|DASHBOARD_VIEWER_LOGIN|DASHBOARD_USER|DASHBOARD_PASS)=' \
  "$DASHBOARD_ENV_FILE" | sed 's/=.*/=***/'

# ---------------------------------------------------------------------------
# 5. restarts
# ---------------------------------------------------------------------------

restart_pm2() {
  local name="$1"
  if pm2 describe "$name" >/dev/null 2>&1; then
    step "pm2 restart: $name"
    pm2 restart "$name" --update-env
  else
    echo "[deploy] pm2 process '$name' not found — skipping restart. Start it manually with pm2 start ecosystem.*.cjs."
  fi
}

# pm2 restart with --update-env reloads env from the process's own config,
# which is where MESSENGER_DASHBOARD_TOKEN must live on the core side.
# (This script doesn't write to the pm2 env file — see caveat below.)
restart_pm2 daria-messenger-core
restart_pm2 daria-messenger-web

step "systemctl: restarting claude-web-dashboard"
if systemctl list-unit-files 2>/dev/null | grep -q '^claude-web-dashboard'; then
  sudo systemctl restart claude-web-dashboard || \
    echo "[deploy] systemctl restart failed — check: journalctl -u claude-web-dashboard -n 50"
else
  echo "[deploy] systemd unit claude-web-dashboard not installed. Install scripts/workrooms/claude-web-dashboard.service first."
fi

# ---------------------------------------------------------------------------
# 6. sanity checks
# ---------------------------------------------------------------------------

step "sanity: /dashboard/users/by-login/$DASHBOARD_VIEWER_LOGIN"
set +e
LOGIN_RESP=$(curl -sS --max-time 5 \
  -H "Authorization: Bearer ${MESSENGER_DASHBOARD_TOKEN}" \
  "http://127.0.0.1:4300/dashboard/users/by-login/${DASHBOARD_VIEWER_LOGIN}")
CURL_EXIT=$?
set -e
if [[ $CURL_EXIT -ne 0 ]]; then
  echo "[deploy] WARN: curl to messenger-core failed ($CURL_EXIT) — is daria-messenger-core up?"
else
  echo "$LOGIN_RESP"
  if ! echo "$LOGIN_RESP" | jq -e '.id' >/dev/null 2>&1; then
    echo "[deploy] WARN: messenger-core did not return an id. Did you set MESSENGER_DASHBOARD_TOKEN in the messenger-core env (not just the dashboard env)? And does the login '$DASHBOARD_VIEWER_LOGIN' exist in messenger_users?"
  fi
fi

step "sanity: dashboard /api/me"
set +e
ME_RESP=$(curl -sS --max-time 5 http://127.0.0.1:9090/api/me)
CURL_EXIT=$?
set -e
if [[ $CURL_EXIT -ne 0 ]]; then
  echo "[deploy] WARN: curl to dashboard failed ($CURL_EXIT) — is claude-web-dashboard up?"
else
  echo "$ME_RESP"
fi

cat <<'EOF'

[deploy] done.

Next steps (manual):

  1. Make sure MESSENGER_DASHBOARD_TOKEN is ALSO set in the messenger-core
     pm2 env. This script only writes the dashboard side — the core side
     lives in your ecosystem config or messenger/core/.env. Example:

         pm2 set daria-messenger-core:env.MESSENGER_DASHBOARD_TOKEN '<secret>'
         pm2 restart daria-messenger-core --update-env

  2. Verify in the browser:
       - http://<server>:9090    header shows viewer: stas
       - http://<server>:3300    project → "Сессии CLI" tab lists your tmux sessions

  3. Optionally backfill the 8th column of
     ~/state/claude-sessions/.registry.tsv to stamp the existing composer
     row as owned by stas — otherwise it stays visible to every viewer
     until you pass --owner on its next restart.

If a sanity check above warned, fix that first — the UI will be empty
until messenger-core responds 200 to /dashboard/users/by-login/<login>.
EOF
