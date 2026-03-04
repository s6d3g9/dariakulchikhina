#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  LIZA deploy — lizzz.dariakulchikhina.com
#  строго через поддомен | Docker LIZA | port 3002
#  Usage: bash scripts/deploy-liza.sh [git-branch]
# ═══════════════════════════════════════════════════════════════════
set -eo pipefail

BRANCH="${1:-dev}"
REPO="https://github.com/s6d3g9/dariakulchikhina.git"
APP_PORT=3002
DEPLOY_DIR="/home/lichu/daria-liza"
DOCKER_IMAGE="liza-app"
DOCKER_CONTAINER="LIZA"
SUBDOMAIN="lizzz.dariakulchikhina.com"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S %Z')
BUILD_DIR="/tmp/daria-liza-$(date +%s)"
LOG_FILE="/home/lichu/daria-liza/deploy.log"
REPORT=""

# ── colour helpers ─────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}✔ $*${RESET}"; }
warn() { echo -e "${YELLOW}⚠ $*${RESET}"; }
err()  { echo -e "${RED}✘ $*${RESET}"; }
info() { echo -e "${CYAN}→ $*${RESET}"; }
sep()  { echo -e "${BOLD}────────────────────────────────────────────${RESET}"; }

append_report() { REPORT+="$1\n"; }

# ── header ─────────────────────────────────────────────────────────
sep
echo -e "${BOLD}  🦎 LIZA DEPLOY  ${SUBDOMAIN}${RESET}"
echo -e "  Branch : ${BRANCH}"
echo -e "  Time   : ${TIMESTAMP}"
sep
append_report "═══════════════════════════════════════════════"
append_report "  LIZA DEPLOY REPORT"
append_report "  Subdomain : ${SUBDOMAIN}"
append_report "  Branch    : ${BRANCH}"
append_report "  Started   : ${TIMESTAMP}"
append_report "═══════════════════════════════════════════════"

# ── 1. clone ───────────────────────────────────────────────────────
info "Cloning ${REPO} (branch: ${BRANCH}) → ${BUILD_DIR}"
git clone --depth 1 --branch "${BRANCH}" "${REPO}" "${BUILD_DIR}"
COMMIT_HASH=$(git -C "${BUILD_DIR}" rev-parse --short HEAD)
COMMIT_MSG=$(git -C "${BUILD_DIR}" log -1 --format="%s")
ok "Cloned — commit ${COMMIT_HASH}: ${COMMIT_MSG}"
append_report ""
append_report "── SOURCE ──"
append_report "  Repo   : ${REPO}"
append_report "  Branch : ${BRANCH}"
append_report "  Commit : ${COMMIT_HASH} — ${COMMIT_MSG}"

# ── 2. install deps ────────────────────────────────────────────────
info "Installing dependencies (pnpm)"
cd "${BUILD_DIR}"
pnpm install --frozen-lockfile 2>&1 | tail -3
ok "Dependencies installed"

# ── 3. build ───────────────────────────────────────────────────────
info "Building Nuxt (NODE_ENV=production)"
NODE_ENV=production pnpm build 2>&1 | tail -5
ok "Build complete → ${BUILD_DIR}/.output"
append_report ""
append_report "── BUILD ──"
append_report "  .output : ${BUILD_DIR}/.output"
append_report "  Node    : $(node --version)"
append_report "  pnpm    : $(pnpm --version)"

# ── 4. detect runtime: Docker or PM2 ──────────────────────────────
USE_DOCKER=false
if docker info &>/dev/null 2>&1; then
  USE_DOCKER=true
  info "Docker is available → will run container named ${DOCKER_CONTAINER}"
else
  warn "Docker socket not accessible for current user → falling back to PM2"
  warn "To enable Docker: add user to docker group (requires root):"
  warn "  sudo usermod -aG docker \$USER && newgrp docker"
fi

# ── 5a. Docker path ────────────────────────────────────────────────
if [ "$USE_DOCKER" = true ]; then
  info "Building Docker image: ${DOCKER_IMAGE}"
  cp "${BUILD_DIR}/Dockerfile" "${BUILD_DIR}/.output/../Dockerfile" 2>/dev/null || \
    cp /workspaces/daria_project/Dockerfile "${BUILD_DIR}/" 2>/dev/null || true

  # Build image from .output
  cd "${BUILD_DIR}"
  docker build -t "${DOCKER_IMAGE}:${COMMIT_HASH}" -t "${DOCKER_IMAGE}:latest" .
  ok "Docker image built: ${DOCKER_IMAGE}:${COMMIT_HASH}"

  info "Stopping old container ${DOCKER_CONTAINER} (if running)"
  docker stop "${DOCKER_CONTAINER}" 2>/dev/null && ok "Stopped ${DOCKER_CONTAINER}" || true
  docker rm   "${DOCKER_CONTAINER}" 2>/dev/null && ok "Removed ${DOCKER_CONTAINER}" || true

  info "Starting Docker container ${DOCKER_CONTAINER} on port ${APP_PORT}"
  docker run -d \
    --name "${DOCKER_CONTAINER}" \
    --restart unless-stopped \
    -p "${APP_PORT}:3000" \
    -e DATABASE_URL="postgresql://daria:daria_secret_2026@host.docker.internal:5433/daria_admin" \
    -e REDIS_URL="redis://host.docker.internal:6380" \
    -e NUXT_SESSION_SECRET="daria2026supersecretkeyatleast32chars!!" \
    -e DESIGNER_INITIAL_EMAIL="admin@dariakulchikhina.com" \
    -e DESIGNER_INITIAL_PASSWORD="admin123" \
    -e UPLOAD_DIR="/opt/daria-nuxt/public/uploads" \
    -e NODE_ENV="production" \
    -e PORT="3000" \
    -e HOST="0.0.0.0" \
    --add-host=host.docker.internal:host-gateway \
    "${DOCKER_IMAGE}:latest"

  ok "Container ${DOCKER_CONTAINER} started"
  append_report ""
  append_report "── DOCKER ──"
  append_report "  Container : ${DOCKER_CONTAINER}"
  append_report "  Image     : ${DOCKER_IMAGE}:${COMMIT_HASH}"
  append_report "  Port      : host:${APP_PORT} → container:3000"
  append_report "  Runtime   : Docker"

# ── 5b. PM2 fallback path ──────────────────────────────────────────
else
  info "Copying .output to ${DEPLOY_DIR}"
  mkdir -p "${DEPLOY_DIR}"
  rm -rf "${DEPLOY_DIR}/.output"
  cp -r "${BUILD_DIR}/.output" "${DEPLOY_DIR}/"
  ok "Output copied"

  info "Restarting PM2 process liza-nuxt"
  if pm2 describe liza-nuxt &>/dev/null; then
    pm2 restart liza-nuxt --update-env
  else
    pm2 start "${DEPLOY_DIR}/ecosystem.config.cjs"
  fi
  pm2 save
  ok "PM2 liza-nuxt restarted"
  append_report ""
  append_report "── PM2 (Docker unavailable) ──"
  append_report "  App    : liza-nuxt"
  append_report "  Dir    : ${DEPLOY_DIR}"
  append_report "  Port   : ${APP_PORT}"
  append_report "  Runtime: PM2"
fi

# ── 6. healthcheck ─────────────────────────────────────────────────
info "Healthcheck: http://localhost:${APP_PORT}/"
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${APP_PORT}/" || echo "000")
if [ "${HTTP_CODE}" = "200" ] || [ "${HTTP_CODE}" = "302" ]; then
  ok "Healthcheck PASSED — HTTP ${HTTP_CODE}"
  HEALTH_STATUS="PASS (HTTP ${HTTP_CODE})"
else
  err "Healthcheck FAILED — HTTP ${HTTP_CODE}"
  HEALTH_STATUS="FAIL (HTTP ${HTTP_CODE})"
fi
append_report ""
append_report "── HEALTHCHECK ──"
append_report "  URL    : http://localhost:${APP_PORT}/"
append_report "  Status : ${HEALTH_STATUS}"

# ── 7. generate nginx config ───────────────────────────────────────
NGINX_CONF="/tmp/lizzz_nginx.conf"
cat > "${NGINX_CONF}" << NGINX
server {
    listen 8082;
    server_name ${SUBDOMAIN};

    # Static assets with long cache
    location /_nuxt/ {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # File uploads (served directly if dir exists)
    location /uploads/ {
        alias /opt/daria-nuxt/public/uploads/;
        expires 7d;
    }

    # All other requests → LIZA app
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINX

ok "Nginx config written to ${NGINX_CONF}"

# Try to install automatically (needs root or writable conf.d)
NGINX_DEST="/etc/nginx/conf.d/lizzz.conf"
if cp "${NGINX_CONF}" "${NGINX_DEST}" 2>/dev/null && nginx -t 2>/dev/null && nginx -s reload 2>/dev/null; then
  ok "Nginx config installed and reloaded"
  append_report ""
  append_report "── NGINX ──"
  append_report "  Config : ${NGINX_DEST} (auto-installed)"
  append_report "  Status : reloaded"
else
  warn "Cannot write nginx config automatically (need root)"
  warn "Run as root/oxo user:"
  warn "  cp ${NGINX_CONF} ${NGINX_DEST} && nginx -t && nginx -s reload"
  append_report ""
  append_report "── NGINX ──"
  append_report "  Config : ${NGINX_CONF} (PENDING manual install)"
  append_report "  Action : cp ${NGINX_CONF} ${NGINX_DEST} && nginx -t && nginx -s reload"
fi

# ── 8. cleanup build dir ───────────────────────────────────────────
info "Cleaning up build dir ${BUILD_DIR}"
rm -rf "${BUILD_DIR}"
ok "Build dir removed"

# ── 9. final report ────────────────────────────────────────────────
FINISH_TIME=$(date '+%Y-%m-%d %H:%M:%S %Z')
append_report ""
append_report "── SUMMARY ──"
append_report "  Finished : ${FINISH_TIME}"
append_report "  Subdomain: https://${SUBDOMAIN}"
append_report "  App port : localhost:${APP_PORT}"
if [ "${HTTP_CODE}" = "200" ] || [ "${HTTP_CODE}" = "302" ]; then
  append_report "  Result   : ✔ DEPLOY OK"
else
  append_report "  Result   : ✘ DEPLOY FAILED (check logs)"
fi
append_report "═══════════════════════════════════════════════"

mkdir -p "$(dirname "${LOG_FILE}")"
echo -e "${REPORT}" | tee -a "${LOG_FILE}"

sep
echo -e "${BOLD}DEPLOY LOG → ${LOG_FILE}${RESET}"
sep

# Show last 5 deploy entries count
echo -e "${CYAN}Total deploys logged: $(grep -c 'LIZA DEPLOY REPORT' "${LOG_FILE}" 2>/dev/null || echo 0)${RESET}"
sep
