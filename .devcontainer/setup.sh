#!/usr/bin/env sh
# Запускается один раз при создании контейнера
set -eu

# Восстанавливаем SSH ключ из Codespaces Secret
if [ -n "${SSH_DEPLOY_KEY:-}" ]; then
  mkdir -p ~/.ssh
  echo "$SSH_DEPLOY_KEY" > ~/.ssh/admin2_id_ed25519
  chmod 600 ~/.ssh/admin2_id_ed25519

  # SSH config для алиаса daria-deploy
  cat > ~/.ssh/config << 'EOF'
Host daria-deploy
  HostName 152.53.176.165
  User admin2
  IdentityFile ~/.ssh/admin2_id_ed25519
  StrictHostKeyChecking no
EOF
  chmod 600 ~/.ssh/config

  echo "[setup] SSH ключ восстановлен → daria-deploy"
else
  echo "[setup] ВНИМАНИЕ: SSH_DEPLOY_KEY не задан в Codespaces Secrets"
  echo "[setup] Добавь секрет: github.com/settings/codespaces"
fi

# Устанавливаем зависимости
if [ -f "package.json" ]; then
  echo "[setup] pnpm install..."
  pnpm install --frozen-lockfile || true
fi

echo "[setup] готово"
