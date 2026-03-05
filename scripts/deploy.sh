#!/usr/bin/env bash
set -euo pipefail

# ============================================
#  Деплой-скрипт для Лизы
#  lizzz.dariakulchikhina.com
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$ROOT_DIR/config/deploy.conf"

# ---------- загрузка конфига ----------
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "❌ Конфиг не найден: $CONFIG_FILE"
  exit 1
fi
source "$CONFIG_FILE"

# ---------- переменные отчёта ----------
DEPLOY_ID="$(date +%Y%m%d-%H%M%S)-$(openssl rand -hex 3)"
DEPLOY_START=$(date +%s)
DEPLOY_DATE="$(date '+%Y-%m-%d %H:%M:%S %Z')"
ERRORS=()
STEPS_DONE=()

LOG_DIR="${LOG_DIR:-$ROOT_DIR/logs}"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/deploy-${DEPLOY_ID}.log"

# ---------- утилиты ----------
log()   { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
ok()    { STEPS_DONE+=("✅ $*"); log "OK: $*"; }
fail()  { ERRORS+=("❌ $*"); log "FAIL: $*"; }
abort() { fail "$*"; print_report; exit 1; }

step_time() {
  local start=$1
  local end=$(date +%s)
  echo "$(( end - start )) сек."
}

# ---------- ОТЧЁТ ----------
print_report() {
  local DEPLOY_END=$(date +%s)
  local DURATION=$(( DEPLOY_END - DEPLOY_START ))
  local MINS=$(( DURATION / 60 ))
  local SECS=$(( DURATION % 60 ))

  cat <<-REPORT | tee -a "$LOG_FILE"

╔══════════════════════════════════════════════╗
║          📋 ОТЧЁТ О ДЕПЛОЕ                  ║
╠══════════════════════════════════════════════╣
║ ID деплоя:    ${DEPLOY_ID}
║ Дата:         ${DEPLOY_DATE}
║ Длительность: ${MINS} мин ${SECS} сек
║ Сервер:       ${DEPLOY_USER}@${DEPLOY_HOST}
║ Домен:        ${DEPLOY_DOMAIN}
║ Контейнер:    ${CONTAINER_NAME}
║ Образ:        ${DOCKER_IMAGE}
║ Git ветка:    ${GIT_DEPLOY_BRANCH}
║ Git коммит:   ${GIT_COMMIT:-n/a}
║ Git автор:    ${GIT_AUTHOR:-n/a}
║ Git сообщение:${GIT_MSG:-n/a}
║ Файлов в пр:  ${FILES_COUNT:-n/a}
╠══════════════════════════════════════════════╣
║ ВЫПОЛНЕННЫЕ ШАГИ:
$(printf '║  %s\n' "${STEPS_DONE[@]:-нет}")
╠══════════════════════════════════════════════╣
║ ОШИБКИ:
$(if [ ${#ERRORS[@]} -eq 0 ]; then echo "║  нет ошибок 🎉"; else printf '║  %s\n' "${ERRORS[@]}"; fi)
╠══════════════════════════════════════════════╣
║ ЛОГИ: ${LOG_FILE}
╚══════════════════════════════════════════════╝
REPORT
}

# ============================================
#  ШАГ 1: Подготовка Git — отдельная ветка
# ============================================
log "🚀 Начало деплоя ${DEPLOY_ID}"

S1_START=$(date +%s)
log "📦 Шаг 1: Git — переключение на ветку ${GIT_DEPLOY_BRANCH}"

cd "$ROOT_DIR"

# Запомним текущую ветку чтобы вернуться потом
ORIGINAL_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"

# Убеждаемся что ветка существует, если нет — создаём
if git show-ref --quiet "refs/heads/${GIT_DEPLOY_BRANCH}"; then
  git checkout "$GIT_DEPLOY_BRANCH" >> "$LOG_FILE" 2>&1
  git merge "$ORIGINAL_BRANCH" --no-edit >> "$LOG_FILE" 2>&1 || true
else
  git checkout -b "$GIT_DEPLOY_BRANCH" >> "$LOG_FILE" 2>&1
fi

# Коммитим всё что есть
git add -A >> "$LOG_FILE" 2>&1
git commit -m "deploy ${DEPLOY_ID} from ${ORIGINAL_BRANCH}" >> "$LOG_FILE" 2>&1 || true
git push "$GIT_REMOTE" "$GIT_DEPLOY_BRANCH" >> "$LOG_FILE" 2>&1 || fail "Git push не удался"

GIT_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo 'n/a')"
GIT_AUTHOR="$(git log -1 --format='%an' 2>/dev/null || echo 'n/a')"
GIT_MSG="$(git log -1 --format='%s' 2>/dev/null || echo 'n/a')"
FILES_COUNT="$(git ls-files | wc -l)"

ok "Git: ветка ${GIT_DEPLOY_BRANCH}, коммит ${GIT_COMMIT} ($(step_time $S1_START))"

# ============================================
#  ШАГ 2: Сборка Docker-образа локально
# ============================================
S2_START=$(date +%s)
log "🐳 Шаг 2: Сборка Docker-образа ${DOCKER_IMAGE}"

# Если Dockerfile нет — создаём минимальный
if [[ ! -f "$ROOT_DIR/Dockerfile" ]]; then
  log "⚠️  Dockerfile не найден — создаю базовый"
  cat > "$ROOT_DIR/Dockerfile" <<'DOCKERFILE'
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
DOCKERFILE
  ok "Создан базовый Dockerfile"
fi

docker build -t "${DOCKER_IMAGE}:${DEPLOY_ID}" -t "${DOCKER_IMAGE}:latest" "$ROOT_DIR" >> "$LOG_FILE" 2>&1 \
  || abort "Сборка Docker-образа не удалась"

IMAGE_SIZE="$(docker image inspect "${DOCKER_IMAGE}:latest" --format='{{.Size}}' 2>/dev/null || echo '0')"
IMAGE_SIZE_MB=$(( IMAGE_SIZE / 1024 / 1024 ))

ok "Docker: образ ${DOCKER_IMAGE}:${DEPLOY_ID} (${IMAGE_SIZE_MB} MB) ($(step_time $S2_START))"

# ============================================
#  ШАГ 3: Экспорт и отправка образа на сервер
# ============================================
S3_START=$(date +%s)
log "📤 Шаг 3: Отправка образа на сервер ${DEPLOY_HOST}"

ARCHIVE="/tmp/${DOCKER_IMAGE}-${DEPLOY_ID}.tar.gz"

docker save "${DOCKER_IMAGE}:latest" | gzip > "$ARCHIVE" 2>> "$LOG_FILE" \
  || abort "Экспорт Docker-образа не удался"

ARCHIVE_SIZE="$(du -h "$ARCHIVE" | cut -f1)"

scp -i "$SSH_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=15 \
    "$ARCHIVE" \
    "${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/" >> "$LOG_FILE" 2>&1 \
  || abort "Передача образа на сервер не удалась"

rm -f "$ARCHIVE"

ok "Передача: ${ARCHIVE_SIZE} отправлено ($(step_time $S3_START))"

# ============================================
#  ШАГ 4: Деплой контейнера на сервере
# ============================================
S4_START=$(date +%s)
log "🖥️  Шаг 4: Запуск контейнера ${CONTAINER_NAME} на ${DEPLOY_HOST}"

ssh -i "$SSH_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=15 \
    "${DEPLOY_USER}@${DEPLOY_HOST}" bash -s <<REMOTE_SCRIPT
set -e

echo ">>> Загрузка образа..."
docker load < /tmp/${DOCKER_IMAGE}-${DEPLOY_ID}.tar.gz
rm -f /tmp/${DOCKER_IMAGE}-${DEPLOY_ID}.tar.gz

echo ">>> Остановка старого контейнера (если есть)..."
docker stop ${CONTAINER_NAME} 2>/dev/null || true
docker rm ${CONTAINER_NAME} 2>/dev/null || true

echo ">>> Запуск нового контейнера..."
docker run -d \
  --name ${CONTAINER_NAME} \
  --restart unless-stopped \
  -p ${DOCKER_PORT_HOST}:${DOCKER_PORT_CONTAINER} \
  -e VIRTUAL_HOST=${DEPLOY_DOMAIN} \
  -e LETSENCRYPT_HOST=${DEPLOY_DOMAIN} \
  -l "traefik.enable=true" \
  -l "traefik.http.routers.${CONTAINER_NAME}.rule=Host(\\\`${DEPLOY_DOMAIN}\\\`)" \
  ${DOCKER_IMAGE}:latest

echo ">>> Проверка..."
sleep 3
docker ps --filter name=${CONTAINER_NAME} --format "{{.Status}}"
REMOTE_SCRIPT

if [ $? -eq 0 ]; then
  ok "Контейнер ${CONTAINER_NAME} запущен ($(step_time $S4_START))"
else
  fail "Запуск контейнера не удался ($(step_time $S4_START))"
fi

# ============================================
#  ШАГ 5: Проверка доступности
# ============================================
S5_START=$(date +%s)
log "🌐 Шаг 5: Проверка ${DEPLOY_DOMAIN}"

HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' \
  --max-time 10 \
  "http://${DEPLOY_DOMAIN}" 2>/dev/null || echo '000')"

if [[ "$HTTP_CODE" =~ ^(200|301|302)$ ]]; then
  ok "Сайт доступен: HTTP ${HTTP_CODE} ($(step_time $S5_START))"
else
  fail "Сайт недоступен: HTTP ${HTTP_CODE} — проверь DNS и прокси ($(step_time $S5_START))"
fi

# ============================================
#  ШАГ 6: Возврат на оригинальную ветку
# ============================================
cd "$ROOT_DIR"
git checkout "$ORIGINAL_BRANCH" >> "$LOG_FILE" 2>&1 || true
ok "Git: вернулись на ветку ${ORIGINAL_BRANCH}"

# ============================================
#  ФИНАЛ: Отчёт
# ============================================
print_report

if [ ${#ERRORS[@]} -eq 0 ]; then
  log "🎉 Деплой завершён успешно!"
  exit 0
else
  log "⚠️  Деплой завершён с ошибками!"
  exit 1
fi
