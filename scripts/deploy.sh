#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  LIZA deploy — lizzz.dariakulchikhina.com
#  SSH key : ~/.ssh/liza_id_ed25519
#  App     : PM2 liza-nuxt, port 3002
#  Logs    : logs/deploy-YYYYMMDD-HHMMSS.log
#  Usage   : bash scripts/deploy.sh [branch]
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

# ── config ─────────────────────────────────────────────────────────
BRANCH="${1:-dev}"
REPO="https://github.com/s6d3g9/dariakulchikhina.git"
SERVER_HOST="152.53.176.165"
SERVER_USER="lichu"
SSH_KEY="${HOME}/.ssh/liza_id_ed25519"
APP_PORT=3002
DEPLOY_DIR="/home/lichu/daria-liza"
PM2_APP="liza-nuxt"
SUBDOMAIN="lizzz.dariakulchikhina.com"
NGINX_CONF_SRC="/tmp/lizzz_nginx.conf"
NGINX_CONF_DST="/etc/nginx/conf.d/lizzz.conf"

# ── log setup ──────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOGS_DIR="${PROJECT_DIR}/logs"
mkdir -p "${LOGS_DIR}"
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
HUMAN_TIME=$(date '+%Y-%m-%d %H:%M:%S %Z')
LOG_FILE="${LOGS_DIR}/deploy-${TIMESTAMP}.log"

# tee all output to log + terminal
exec > >(tee -a "${LOG_FILE}") 2>&1

# ── helpers ────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}  ✔  $*${RESET}"; }
warn() { echo -e "${YELLOW}  ⚠  $*${RESET}"; }
err()  { echo -e "${RED}  ✘  $*${RESET}"; }
info() { echo -e "${CYAN}  →  $*${RESET}"; }
sep()  { echo -e "${BOLD}══════════════════════════════════════════════════${RESET}"; }
line() { echo -e "──────────────────────────────────────────────────"; }

SSH_CMD="ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST}"

# ── header ─────────────────────────────────────────────────────────
sep
echo -e "${BOLD}  🦎  LIZA DEPLOY${RESET}"
echo -e "  Subdomain : ${SUBDOMAIN}"
echo -e "  Branch    : ${BRANCH}"
echo -e "  Started   : ${HUMAN_TIME}"
echo -e "  Log file  : ${LOG_FILE}"
sep

# ── verify ssh key ─────────────────────────────────────────────────
info "Verifying SSH key..."
if [ ! -f "${SSH_KEY}" ]; then
  err "SSH key not found: ${SSH_KEY}"
  err "Run: cp ~/.ssh/id_ed25519_lichu ~/.ssh/liza_id_ed25519 && chmod 600 ~/.ssh/liza_id_ed25519"
  exit 1
fi
chmod 600 "${SSH_KEY}"
ok "SSH key: ${SSH_KEY}"

# ── 1. get commit info ─────────────────────────────────────────────
line
info "Fetching latest commit info from GitHub (branch: ${BRANCH})..."
COMMIT_INFO=$(git ls-remote "https://github.com/s6d3g9/dariakulchikhina.git" "refs/heads/${BRANCH}" 2>/dev/null | awk '{print $1}' | head -c 8 || echo "unknown")
ok "Remote HEAD: ${COMMIT_INFO}"

# ── 2. clone + build on server ─────────────────────────────────────
line
info "Building on server..."
BUILD_LOG=$($SSH_CMD bash << REMOTE_BUILD
set -e
BUILD_DIR="/tmp/daria-liza-${TIMESTAMP}"
echo "DIR: \${BUILD_DIR}"

# clone
git clone --depth 1 --branch "${BRANCH}" "${REPO}" "\${BUILD_DIR}" 2>&1 | tail -2
cd "\${BUILD_DIR}"
COMMIT_HASH=\$(git rev-parse --short HEAD)
COMMIT_MSG=\$(git log -1 --format="%s")
echo "COMMIT_HASH:\${COMMIT_HASH}"
echo "COMMIT_MSG:\${COMMIT_MSG}"

# install
pnpm install --frozen-lockfile 2>&1 | tail -3

# build
NODE_ENV=production pnpm build 2>&1 | tail -5

echo "BUILD_OK"
echo "BUILD_DIR:\${BUILD_DIR}"
REMOTE_BUILD
)

echo "${BUILD_LOG}"

if echo "${BUILD_LOG}" | grep -q "BUILD_OK"; then
  ok "Build succeeded on server"
else
  err "Build FAILED"
  exit 1
fi

BUILD_DIR_REMOTE=$(echo "${BUILD_LOG}" | grep "^BUILD_DIR:" | cut -d: -f2)
COMMIT_HASH=$(echo "${BUILD_LOG}" | grep "^COMMIT_HASH:" | cut -d: -f2)
COMMIT_MSG=$(echo "${BUILD_LOG}" | grep "^COMMIT_MSG:" | cut -d: -f2-)

# ── 3. swap .output ────────────────────────────────────────────────
line
info "Swapping .output on server..."
$SSH_CMD bash << REMOTE_SWAP
set -e
BUILD_DIR="${BUILD_DIR_REMOTE}"

mkdir -p "${DEPLOY_DIR}"

# atomic swap: backup old, move new
if [ -d "${DEPLOY_DIR}/.output" ]; then
  rm -rf "${DEPLOY_DIR}/.output.old"
  mv "${DEPLOY_DIR}/.output" "${DEPLOY_DIR}/.output.old"
fi
cp -r "\${BUILD_DIR}/.output" "${DEPLOY_DIR}/.output"
rm -rf "\${BUILD_DIR}"
echo "SWAP_OK"
REMOTE_SWAP
ok "Output deployed to ${DEPLOY_DIR}/.output"

# ── 4. restart PM2 ─────────────────────────────────────────────────
line
info "Restarting PM2 process: ${PM2_APP}..."
PM2_STATUS=$($SSH_CMD bash << REMOTE_PM2
set -e
if pm2 describe "${PM2_APP}" &>/dev/null; then
  pm2 restart "${PM2_APP}" --update-env 2>&1 | tail -2
else
  pm2 start "${DEPLOY_DIR}/ecosystem.config.cjs" 2>&1 | tail -2
fi
pm2 save --force 2>&1 | tail -1
UPTIME=\$(pm2 describe "${PM2_APP}" 2>/dev/null | grep 'uptime' | awk '{print \$4}')
STATUS=\$(pm2 describe "${PM2_APP}" 2>/dev/null | grep 'status' | head -1 | awk '{print \$4}')
echo "PM2_STATUS:\${STATUS}"
echo "PM2_UPTIME:\${UPTIME}"
REMOTE_PM2
)
echo "${PM2_STATUS}"

PM2_STATE=$(echo "${PM2_STATUS}" | grep "^PM2_STATUS:" | cut -d: -f2)
if [ "${PM2_STATE}" = "online" ]; then
  ok "PM2 ${PM2_APP} is ${PM2_STATE}"
else
  warn "PM2 status: '${PM2_STATE}' — check pm2 logs ${PM2_APP}"
fi

# ── 5. healthcheck ─────────────────────────────────────────────────
line
info "Healthcheck: http://localhost:${APP_PORT}/ ..."
sleep 3
HEALTH=$($SSH_CMD "curl -s -o /dev/null -w '%{http_code}' http://localhost:${APP_PORT}/ 2>/dev/null || echo 000")
if [ "${HEALTH}" = "200" ] || [ "${HEALTH}" = "302" ]; then
  ok "Healthcheck PASSED — HTTP ${HEALTH}"
  HEALTH_STATUS="✔ HTTP ${HEALTH}"
else
  err "Healthcheck FAILED — HTTP ${HEALTH}"
  HEALTH_STATUS="✘ HTTP ${HEALTH}"
fi

# ── 6. nginx config ────────────────────────────────────────────────
line
info "Nginx config for ${SUBDOMAIN}..."

# Write nginx config on server via printf (avoids nested heredoc issues)
$SSH_CMD "printf '%s\n' \
'server {' \
'    listen 8082;' \
'    server_name lizzz.dariakulchikhina.com;' \
'    charset utf-8;' \
'    client_max_body_size 32m;' \
'' \
'    location /_nuxt/ {' \
'        alias /home/lichu/daria-liza/.output/public/_nuxt/;' \
'        expires 1y;' \
'        add_header Cache-Control \"public, immutable\";' \
'    }' \
'' \
'    location /uploads/ {' \
'        alias /opt/daria-nuxt/public/uploads/;' \
'        expires 30d;' \
'        add_header Cache-Control \"public\";' \
'    }' \
'' \
'    location / {' \
'        proxy_pass http://127.0.0.1:3002;' \
'        proxy_http_version 1.1;' \
'        proxy_set_header Upgrade \$http_upgrade;' \
'        proxy_set_header Connection \"upgrade\";' \
'        proxy_set_header Host \$host;' \
'        proxy_set_header X-Real-IP \$remote_addr;' \
'        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;' \
'        proxy_set_header X-Forwarded-Proto \$scheme;' \
'        proxy_read_timeout 120s;' \
'        client_max_body_size 32m;' \
'    }' \
'}' \
> /tmp/lizzz_nginx.conf"

# Try to install (needs root — will succeed if oxo/root runs later)
NGINX_RESULT=$($SSH_CMD "cp /tmp/lizzz_nginx.conf /etc/nginx/conf.d/lizzz.conf 2>/dev/null \
  && nginx -t 2>/dev/null \
  && nginx -s reload 2>/dev/null \
  && echo NGINX_OK || echo NGINX_MANUAL")

if echo "${NGINX_RESULT}" | grep -q "NGINX_OK"; then
  ok "Nginx config installed and reloaded — ${SUBDOMAIN} is live"
  NGINX_STATUS="✔ applied"
  SITE_URL="http://${SUBDOMAIN}"
else
  warn "Nginx needs root — run manually:"
  warn "  ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} 'sudo cp /tmp/lizzz_nginx.conf /etc/nginx/conf.d/lizzz.conf && sudo nginx -s reload'"
  warn "  (or access via http://${SUBDOMAIN}:${APP_PORT}/)"
  NGINX_STATUS="⚠ pending (needs root)"
  SITE_URL="http://${SUBDOMAIN}:${APP_PORT}"
fi

# ── 7. final report ────────────────────────────────────────────────
FINISH_TIME=$(date '+%Y-%m-%d %H:%M:%S %Z')
sep
echo -e "${BOLD}  📋  DEPLOY REPORT${RESET}"
line
printf "  %-14s %s\n" "Subdomain:"  "${SUBDOMAIN}"
printf "  %-14s %s\n" "Branch:"     "${BRANCH}"
printf "  %-14s %s\n" "Commit:"     "${COMMIT_HASH} — ${COMMIT_MSG}"
printf "  %-14s %s\n" "Server:"     "${SERVER_USER}@${SERVER_HOST}"
printf "  %-14s %s\n" "Deploy dir:" "${DEPLOY_DIR}"
printf "  %-14s %s\n" "Port:"       "${APP_PORT}"
line
printf "  %-14s %s\n" "Build:"      "✔ success"
printf "  %-14s %s\n" "PM2:"        "${PM2_APP} — ${PM2_STATE:-online}"
printf "  %-14s %s\n" "Health:"     "${HEALTH_STATUS}"
printf "  %-14s %s\n" "Nginx:"      "${NGINX_STATUS}"
line
printf "  %-14s %s\n" "Site URL:"   "${SITE_URL}"
printf "  %-14s %s\n" "Started:"    "${HUMAN_TIME}"
printf "  %-14s %s\n" "Finished:"   "${FINISH_TIME}"
printf "  %-14s %s\n" "Log:"        "${LOG_FILE}"
sep

# show recent deploys
DEPLOY_COUNT=$(ls "${LOGS_DIR}"/deploy-*.log 2>/dev/null | wc -l)
echo -e "${CYAN}  Total deploys logged: ${DEPLOY_COUNT}${RESET}"
echo -e "${CYAN}  Logs dir: ${LOGS_DIR}/${RESET}"
sep
