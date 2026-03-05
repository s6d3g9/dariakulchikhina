#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# fix.sh — пошаговый workflow: анализ → правки → git → сервер → одобрение
# Использование: bash scripts/fix.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-daria-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/daria-nuxt}"
APP_NAME="${APP_NAME:-daria-nuxt}"
SERVER_URL="${SERVER_URL:-http://152.53.176.165:3000/}"
UI_DOC="docs/UI_INTERFACE.md"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ── Цвета ──────────────────────────────────────────────────────────────────
R='\033[0;31m'   # red
G='\033[0;32m'   # green
Y='\033[1;33m'   # yellow
B='\033[0;34m'   # blue
C='\033[0;36m'   # cyan
W='\033[1m'      # bold/white
N='\033[0m'      # reset

hr()   { echo -e "${B}────────────────────────────────────────────────────${N}"; }
step() { echo ""; hr; echo -e "${W}  ШАГ $1 / 5 — $2${N}"; hr; echo ""; }
ok()   { echo -e "${G}  ✓  $1${N}"; }
info() { echo -e "${C}  →  $1${N}"; }
warn() { echo -e "${Y}  !  $1${N}"; }
err()  { echo -e "${R}  ✗  $1${N}"; exit 1; }
ask()  { echo -e "${Y}  ?  $1${N}"; read -r REPLY; }

# ─────────────────────────────────────────────────────────────────────────────
# ШАГ 1 — АНАЛИЗ: читаем docs/UI_INTERFACE.md
# ─────────────────────────────────────────────────────────────────────────────
step 1 "АНАЛИЗ — docs/UI_INTERFACE.md"

[[ -f "$UI_DOC" ]] || err "Файл $UI_DOC не найден!"

LINES=$(wc -l < "$UI_DOC")
info "Спецификация: ${UI_DOC}  (${LINES} строк)"
echo ""
echo -e "${W}Разделы:${N}"
grep '^## ' "$UI_DOC" | sed 's/^## /  • /'
echo ""

info "Текущая ветка: $(git branch --show-current)"
info "Последний коммит: $(git log --oneline -1)"
echo ""

ask "Название правки (коротко, без пробелов, напр. sidebar-font-size):"
FIX_SLUG="${REPLY// /-}"
FIX_SLUG="${FIX_SLUG,,}"
[[ -z "$FIX_SLUG" ]] && err "Название не может быть пустым"
BRANCH="fix/${FIX_SLUG}"

echo ""
ask "Опиши что нужно исправить (для коммит-сообщения):"
FIX_DESC="$REPLY"
[[ -z "$FIX_DESC" ]] && err "Описание не может быть пустым"

echo ""
info "Будет создана ветка: ${BRANCH}"
info "Коммит: fix: ${FIX_DESC}"
echo ""
ask "Всё верно? (y / n)"
[[ "$REPLY" != "y" ]] && { warn "Отменено."; exit 0; }

# ─────────────────────────────────────────────────────────────────────────────
# ШАГ 2 — СОЗДАНИЕ ПРАВОК
# ─────────────────────────────────────────────────────────────────────────────
step 2 "СОЗДАНИЕ ПРАВОК"

# убедимся что main обновлён
git fetch origin --quiet
git checkout main --quiet
git reset --hard origin/main --quiet
ok "main обновлён до origin/main"

# создаём или переключаемся на ветку
if git show-ref --quiet "refs/heads/$BRANCH"; then
  warn "Ветка ${BRANCH} уже существует — переключаюсь"
  git checkout "$BRANCH" --quiet
else
  git checkout -b "$BRANCH" --quiet
  ok "Создана ветка: ${BRANCH}"
fi

echo ""
echo -e "${W}Теперь внеси правки в файлы (VS Code открыт).${N}"
echo -e "${C}  → Ориентируйся на ${UI_DOC}${N}"
echo -e "${C}  → Когда закончишь — нажми Enter${N}"
read -r -p ""

# показываем изменения
echo ""
DIFF_FILES=$(git diff --name-only; git ls-files --others --exclude-standard)
if [[ -z "$DIFF_FILES" ]]; then
  warn "Нет изменённых файлов. Продолжить всё равно?"
  ask "(y / n)"
  [[ "$REPLY" != "y" ]] && { warn "Отменено."; exit 0; }
else
  info "Изменены файлы:"
  git status --short | sed 's/^/    /'
fi

echo ""
ask "Commit message (Enter = авто «fix: ${FIX_DESC}\"):"
if [[ -z "$REPLY" ]]; then
  COMMIT_MSG="fix: ${FIX_DESC}"
else
  COMMIT_MSG="$REPLY"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ШАГ 3 — ДЕПЛОЙ В ГИТ (ветка)
# ─────────────────────────────────────────────────────────────────────────────
step 3 "ДЕПЛОЙ В ГИТ"

git add -A
if git diff --cached --quiet; then
  warn "Нечего коммитить — файлы не изменились"
else
  git commit -m "$COMMIT_MSG"
  ok "Коммит: ${COMMIT_MSG}"
fi

git push -u origin "$BRANCH"
ok "Запушена ветка → origin/${BRANCH}"

# ─────────────────────────────────────────────────────────────────────────────
# ШАГ 4 — ДЕПЛОЙ НА СЕРВЕР (ветка)
# ─────────────────────────────────────────────────────────────────────────────
step 4 "ДЕПЛОЙ НА СЕРВЕР"

info "Будет задеплоена ветка ${BRANCH} на ${DEPLOY_HOST}"
ask "Деплоить? (y / n)"
if [[ "$REPLY" != "y" ]]; then
  warn "Деплой пропущен."
else
  echo ""
  info "Синхронизация ветки на сервере..."
  ssh "$DEPLOY_HOST" "
    set -euo pipefail
    cd '$DEPLOY_PATH'
    git fetch origin
    git checkout '$BRANCH' 2>/dev/null || git checkout -b '$BRANCH' 'origin/$BRANCH'
    git reset --hard 'origin/$BRANCH'
    git log --oneline -1
  "
  ok "Код синхронизирован"

  info "pnpm install + pnpm build..."
  ssh "$DEPLOY_HOST" "set -e; cd '$DEPLOY_PATH'; pnpm install --frozen-lockfile; pnpm build" \
    && ok "Билд успешен" \
    || err "Билд упал — проверь ошибки выше"

  info "pm2 restart..."
  ssh "$DEPLOY_HOST" "set -e; cd '$DEPLOY_PATH'; pm2 restart '$APP_NAME' --update-env --silent"
  sleep 4

  STATUS=$(curl -o /dev/null -s -w '%{http_code}' --max-time 20 "$SERVER_URL" || echo "000")
  if [[ "$STATUS" == "200" || "$STATUS" == "301" || "$STATUS" == "302" ]]; then
    ok "Сервер работает (HTTP ${STATUS})"
  else
    warn "Сервер вернул HTTP ${STATUS}"
  fi

  echo ""
  echo -e "${W}  Проверь изменения: ${C}${SERVER_URL}${N}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ШАГ 5 — ОДОБРЕНИЕ → МЁРЖ В MAIN
# ─────────────────────────────────────────────────────────────────────────────
step 5 "ОДОБРЕНИЕ — МЁРЖ В MAIN"

echo -e "${W}Ссылка на сайт: ${C}${SERVER_URL}${N}"
echo ""
ask "Нравится результат? Мёрдж в main? (y / n)"

if [[ "$REPLY" == "y" ]]; then
  # мёрж в main
  git checkout main --quiet
  git merge "$BRANCH" --no-ff -m "merge: ${FIX_DESC}" --quiet
  git push origin main
  ok "Замёрджено в main и запушено в origin"

  # деплой main на сервер
  info "Деплой main на сервер..."
  bash scripts/deploy-safe.sh
  ok "Сервер обновлён → main"

  # удаление ветки
  ask "Удалить ветку ${BRANCH}? (y / n)"
  if [[ "$REPLY" == "y" ]]; then
    git branch -d "$BRANCH" 2>/dev/null || true
    git push origin --delete "$BRANCH" 2>/dev/null || true
    ok "Ветка ${BRANCH} удалена"
  fi

  echo ""
  hr
  ok "Правка «${FIX_DESC}» применена и задеплоена в main!"
  hr

else
  warn "Правка отклонена."
  echo ""
  ask "Откатить сервер обратно на main? (y / n)"
  if [[ "$REPLY" == "y" ]]; then
    bash scripts/deploy-safe.sh
    ok "Сервер откачен на main"
  fi

  echo ""
  ask "Удалить ветку ${BRANCH}? (y / n / d=оставить для доработки)"
  case "$REPLY" in
    y)
      git checkout main --quiet
      git branch -D "$BRANCH" 2>/dev/null || true
      git push origin --delete "$BRANCH" 2>/dev/null || true
      warn "Ветка удалена. Запусти скрипт заново."
      ;;
    d|n)
      info "Ветка ${BRANCH} оставлена."
      info "Продолжить доработку: git checkout ${BRANCH}"
      info "Запустить шаги 2–5 снова: bash scripts/fix.sh"
      ;;
  esac
fi

echo ""
