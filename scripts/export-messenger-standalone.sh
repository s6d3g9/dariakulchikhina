#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${1:-$ROOT_DIR/builds/messenger-standalone}"

copy_tree() {
  local source_path="$1"
  local target_path="$2"

  mkdir -p "$target_path"
  rsync -a \
    --delete \
    --exclude node_modules \
    --exclude .nuxt \
    --exclude .output \
    --exclude data \
    "$source_path" "$target_path"
}

copy_file() {
  local relative_path="$1"
  mkdir -p "$TARGET_DIR/$(dirname "$relative_path")"
  cp "$ROOT_DIR/$relative_path" "$TARGET_DIR/$relative_path"
}

rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"

copy_tree "$ROOT_DIR/messenger/core/" "$TARGET_DIR/core/"
copy_tree "$ROOT_DIR/messenger/web/" "$TARGET_DIR/web/"

copy_file "messenger/ecosystem.standalone.config.cjs"
mv "$TARGET_DIR/messenger/ecosystem.standalone.config.cjs" "$TARGET_DIR/ecosystem.config.cjs"
rmdir "$TARGET_DIR/messenger"

copy_file "docs/messenger/README.md"
copy_file "docs/messenger/DEPLOY.md"
copy_file ".github/AGENTS.md"
copy_file ".github/instructions/messenger.instructions.md"
copy_file ".github/instructions/m3-ui.instructions.md"
copy_file ".github/instructions/menu-navigation.instructions.md"
copy_file ".github/instructions/api.instructions.md"
copy_file ".github/instructions/db.instructions.md"
copy_file ".github/instructions/ui.instructions.md"
copy_file "docs/ARCHITECTURE.md"
copy_file "docs/rag/BACKEND_GUIDE.md"
copy_file "docs/rag/DRIZZLE_PATTERNS.md"
copy_file "docs/rag/REDIS_PATTERNS.md"
copy_file "docs/rag/CLASS_DICTIONARY.md"

printf '%s\n' \
  '# Messenger Standalone Export' \
  '' \
  'Структура подготовлена для отдельного деплоя вне монорепозитория.' \
  '' \
  'Что внутри:' \
  '- core/ — Fastify backend' \
  '- web/ — Nuxt web client' \
  '- ecosystem.config.cjs — PM2-конфиг для отдельного сервера' \
  '- docs/ и .github/instructions/ — минимум документации для agent/project engine сценариев' \
  '' \
  'Быстрый старт:' \
  '1. cd core && pnpm install --frozen-lockfile' \
  '2. cd ../web && pnpm install --frozen-lockfile && pnpm build' \
  '3. cd .. && pm2 start ecosystem.config.cjs' \
  '' \
  'Подробности: docs/messenger/DEPLOY.md' > "$TARGET_DIR/README.md"

echo "[messenger] standalone export created at: $TARGET_DIR"