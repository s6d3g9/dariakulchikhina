# 15. Refactor Deploy и домен admin.dariakulchikhina.com

Этот документ фиксирует отдельный deploy-контур для refactor fork и реальное серверное состояние, которое нужно довести до конца, чтобы fork жил отдельно от основного сайта.

## Цель

Развести два контура без наложения:

- production: основной сайт и текущий runtime;
- refactor: ветка `refactor/architecture-v5`, путь `/opt/daria-nuxt-refactor`, PM2 app `daria-nuxt-refactor`, порт `3018`, внешний адрес `https://admin.dariakulchikhina.com/`.

## Что уже выделено в отдельный refactor-контур

- git-ветка: `refactor/architecture-v5`
- server path: `/opt/daria-nuxt-refactor`
- PM2 app: `daria-nuxt-refactor`
- app port: `3018`
- DB: `daria_admin_refactor`
- Redis DB: `redis://localhost:6380/1`

## Актуальный статус после server cutover

На текущий момент внешний fork-контур уже работает отдельно от production:

- `http://admin.dariakulchikhina.com/login?role=admin` -> `200 OK`
- `https://admin.dariakulchikhina.com/login?role=admin` -> `200 OK`
- Hiddify HTTP map отправляет `admin.dariakulchikhina.com` в отдельный backend `admin_daria_http`
- HAProxy `https-in` отправляет SNI `admin.dariakulchikhina.com` в отдельный backend `admin_daria_direct`
- системный nginx поднимает отдельный SSL vhost `127.0.0.1:4444 ssl` -> `proxy_pass http://127.0.0.1:3018`
- cert установлен в `/etc/letsencrypt/live/admin.dariakulchikhina.com`

Важно: cert issue был успешно выполнен, но для этого использовался временный static backend bridge через `/var/www/daria` и короткий `python -m http.server` на отдельном внутреннем порту. Это означает, что public route уже рабочий, но автоматический renewal-safe поток для admin-domain еще нужно довести до постоянной схемы.

## Repo-level deploy контур

В репозитории для fork используются два отдельных файла:

- `ecosystem.refactor.config.cjs`
- `scripts/deploy-refactor-safe.sh`

### Что делает ecosystem.refactor.config.cjs

- читает runtime env из `/opt/daria-nuxt-refactor/.env`;
- больше не хардкодит refactor credentials в git;
- запускает app только через refactor `cwd` и refactor `PORT`;
- оставляет все дополнительные runtime vars в `.env`, а не в зашитом PM2-конфиге.

### Что делает scripts/deploy-refactor-safe.sh

- требует ветку `refactor/architecture-v5`;
- отказывается деплоить dirty worktree;
- проверяет, что локальный HEAD уже запушен в `origin/refactor/architecture-v5`;
- синхронизирует именно refactor-ветку в `/opt/daria-nuxt-refactor`;
- выполняет `CI=true pnpm install --frozen-lockfile` и `CI=true pnpm build`;
- чинит Nitro runtime через `node scripts/repair-nitro-vue-runtime.mjs`;
- перезапускает только `daria-nuxt-refactor` через `ecosystem.refactor.config.cjs`.

## Минимальный refactor .env на сервере

`/opt/daria-nuxt-refactor/.env` должен содержать как минимум:

```env
DATABASE_URL=postgresql://.../daria_admin_refactor
REDIS_URL=redis://localhost:6380/1
NUXT_SESSION_SECRET=...
PORT=3018
HOST=0.0.0.0
UPLOAD_DIR=/opt/daria-nuxt-refactor/public/uploads
```

Дополнительно туда же должны уходить все runtime vars, которые нужны Nuxt app в refactor-контуре:

- `COMMUNICATIONS_SERVICE_SECRET`
- `NUXT_PUBLIC_COMMUNICATIONS_SERVICE_URL`
- `GEMMA_URL`
- `YANDEX_MAPS_API_KEY`
- любые другие runtime env, которые не должны жить в git.

## Реальное серверное состояние на 2026-04-07

Проверка сервера показала следующее:

- внешние `:80` и `:443` слушает HAProxy;
- активный nginx vhost проекта находится в `/etc/nginx/conf.d/daria.conf`;
- основной домен `dariakulchikhina.com` обслуживается через nginx `127.0.0.1:4443 ssl`;
- HAProxy по SNI знает только:
  - `dariakulchikhina.com`
  - `www.dariakulchikhina.com`
- backend для основного домена сейчас: `127.0.0.1:4443`;
- в `daria.conf` уже есть отдельный `server_name admin.dariakulchikhina.com` на `listen 8082`, но он всё ещё смотрит на основной runtime и основные static aliases;
- отдельного cert для `admin.dariakulchikhina.com` в `/etc/letsencrypt/live` нет;
- `https://admin.dariakulchikhina.com/` сейчас невалиден для fork: TLS mismatch / fallback route;
- `curl -k -I https://admin.dariakulchikhina.com/` сейчас даёт `502`.

Итог: repo deploy для fork уже можно вести отдельно, но публичный домен ещё не переключен на refactor runtime.

## Целевой внешний маршрут для fork-домена

Нужная схема такая:

```text
admin.dariakulchikhina.com
  -> HAProxy SNI route
  -> nginx 127.0.0.1:4444 ssl
  -> proxy_pass http://127.0.0.1:3018
```

HTTP-контур на `8082` тоже должен быть refactor-only, чтобы challenge и fallback шли в тот же fork-контур.

## Что нужно сделать на сервере

### 1. Перевести HTTP vhost admin-домена на refactor runtime

В `daria.conf` блок `server_name admin.dariakulchikhina.com` на `listen 8082` должен использовать:

- `/_nuxt/` -> `/opt/daria-nuxt-refactor/.output/public/_nuxt/`
- `/uploads/` -> `/opt/daria-nuxt-refactor/public/uploads/`
- `/` -> `proxy_pass http://127.0.0.1:3018`
- `/.well-known/acme-challenge/` -> `root /var/www/daria`

### 2. Выпустить отдельный cert для admin-домена

На сервере уже есть `acme.sh`.

Нужный выпуск:

```bash
~/.acme.sh/acme.sh --issue -d admin.dariakulchikhina.com -w /var/www/daria
```

После выпуска сертификат нужно установить в отдельную директорию, которую прочитает nginx, например:

```bash
mkdir -p /etc/letsencrypt/live/admin.dariakulchikhina.com
~/.acme.sh/acme.sh --install-cert -d admin.dariakulchikhina.com \
  --fullchain-file /etc/letsencrypt/live/admin.dariakulchikhina.com/fullchain.pem \
  --key-file /etc/letsencrypt/live/admin.dariakulchikhina.com/privkey.pem
```

### 3. Добавить отдельный SSL vhost nginx для admin-домена

Нужен отдельный server block:

```nginx
server {
    listen 127.0.0.1:4444 ssl;
    http2 on;
    server_name admin.dariakulchikhina.com;
    ssl_certificate /etc/letsencrypt/live/admin.dariakulchikhina.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.dariakulchikhina.com/privkey.pem;

    location /.well-known/acme-challenge/ { root /var/www/daria; }

    location /_nuxt/ {
        alias /opt/daria-nuxt-refactor/.output/public/_nuxt/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /uploads/ {
        alias /opt/daria-nuxt-refactor/public/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    location / {
        proxy_pass http://127.0.0.1:3018;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 32m;
    }
}
```

### 4. Добавить SNI rule в HAProxy

В `/opt/hiddify-manager/haproxy/haproxy.cfg` нужен отдельный backend для admin-домена:

```haproxy
use_backend admin_daria_direct if { req.ssl_sni -i admin.dariakulchikhina.com }

backend admin_daria_direct
    mode tcp
    server nginx 127.0.0.1:4444 tfo
```

Важно: это отдельный backend, а не расширение текущего `daria_direct`, чтобы root domain и refactor domain можно было разводить независимо.

### 5. Перезагрузить сервисы и проверить

Порядок:

1. `nginx -t`
2. reload nginx
3. reload haproxy / hiddify-haproxy
4. проверить локально `http://127.0.0.1:3018/login?role=admin`
5. проверить извне `https://admin.dariakulchikhina.com/login?role=admin`

## Команды проверки

```bash
DEPLOY_HOST=my-vps bash scripts/deploy-refactor-safe.sh
curl -I http://127.0.0.1:3018/login?role=admin
curl -I https://admin.dariakulchikhina.com/login?role=admin
ssh my-vps 'pm2 status daria-nuxt-refactor --no-color'
```

## Что пока не входит в этот доменный cutover

- refactor messenger на отдельном публичном домене;
- смена боевого домена `dariakulchikhina.com`;
- миграция production runtime.

Этот документ только про безопасную изоляцию fork-домена для архитектурного рефакторинга.