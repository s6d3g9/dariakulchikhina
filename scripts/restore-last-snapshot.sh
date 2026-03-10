#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SNAPSHOT_DIR="${SNAPSHOT_DIR:-$ROOT_DIR/builds/pre-deploy}"
BUNDLE_PATH="${1:-}"
RESTORE_BRANCH="${RESTORE_BRANCH:-}"

if [[ -z "$BUNDLE_PATH" ]]; then
  BUNDLE_PATH="$(ls -1t "$SNAPSHOT_DIR"/*.bundle 2>/dev/null | head -n 1 || true)"
fi

if [[ -z "$BUNDLE_PATH" || ! -f "$BUNDLE_PATH" ]]; then
  echo "[error] snapshot .bundle не найден" >&2
  echo "[hint] каталог: $SNAPSHOT_DIR" >&2
  exit 1
fi

if [[ -z "$RESTORE_BRANCH" ]]; then
  stamp="$(date -u +'%Y%m%d-%H%M%S')"
  RESTORE_BRANCH="restore/snapshot-${stamp}"
fi

if ! git bundle verify "$BUNDLE_PATH" >/dev/null 2>&1; then
  echo "[error] bundle повреждён или несовместим: $BUNDLE_PATH" >&2
  exit 1
fi

echo "[restore] bundle: $BUNDLE_PATH"
echo "[restore] branch: $RESTORE_BRANCH"

# В bundle создаётся ссылка HEAD, поэтому можно импортировать её в новую ветку.
git fetch "$BUNDLE_PATH" "HEAD:refs/heads/$RESTORE_BRANCH"
git checkout "$RESTORE_BRANCH"

META_PATH="${BUNDLE_PATH%.bundle}.meta"
if [[ -f "$META_PATH" ]]; then
  echo "[restore] metadata: $META_PATH"
  cat "$META_PATH"
fi

echo "[restore] готово"
echo "[restore] текущий коммит: $(git log --oneline -1)"
