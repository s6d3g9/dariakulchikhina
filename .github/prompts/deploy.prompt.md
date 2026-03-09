---
mode: 'agent'
description: 'Задеплоить проект на сервер dariakulchikhina.com'
---

# Деплой на production

## Сервер
- IP: `152.53.176.165`
- Пользователь: `admin2`
- SSH алиас: `daria-deploy`
- Ключ: `~/.ssh/admin2_id_ed25519`
- Путь: `/opt/daria-nuxt`
- PM2 app: `daria-nuxt`

## Шаги деплоя

1. Убедиться что SSH настроен: `ssh daria-deploy "whoami"`
2. Закоммитить и запушить изменения: `git push origin main`
3. Запустить деплой: `bash scripts/deploy-safe.sh`

## Если SSH не работает

```bash
mkdir -p ~/.ssh
# Положить ключ в ~/.ssh/admin2_id_ed25519
chmod 600 ~/.ssh/admin2_id_ed25519
cat >> ~/.ssh/config << 'EOF'
Host daria-deploy
    HostName 152.53.176.165
    User admin2
    IdentityFile ~/.ssh/admin2_id_ed25519
    IdentitiesOnly yes
    StrictHostKeyChecking no
EOF
chmod 600 ~/.ssh/config
```

## Ручной деплой на сервере

```bash
ssh daria-deploy "cd /opt/daria-nuxt && git pull && CI=true pnpm install && pnpm build && pm2 restart daria-nuxt"
```

## Восстановление после чужих правок

```bash
ssh daria-deploy "cd /opt/daria-nuxt && git checkout -- . && git clean -fd"
ssh daria-deploy "sudo chown -R admin2:admin2 /opt/daria-nuxt/node_modules /opt/daria-nuxt/.output"
```
