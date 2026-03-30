# Messenger Deploy

Этот документ описывает минимальный deploy baseline для отдельного alpha-мессенджера.

## Components

- `messenger/core` — Fastify backend на порту `4300`
- `messenger/web` — Nuxt standalone web client на порту `3300`

## Required Environment

### Core

См. [messenger/core/.env.example](messenger/core/.env.example)

Обязательно задать:

- `MESSENGER_CORE_AUTH_SECRET`
- `MESSENGER_CORE_CORS_ORIGIN`

Опционально для GIF/стикеров через KLIPY:

- `KLIPY_APP_KEY`
- `KLIPY_API_BASE_URL`

Для production ключ лучше хранить вне git в файле `/opt/daria-messenger-data/messenger-runtime.env`:

```bash
KLIPY_APP_KEY=...
KLIPY_API_BASE_URL=https://api.klipy.com
```

### Web

См. [messenger/web/.env.example](messenger/web/.env.example)

Обязательно задать:

- `NUXT_PUBLIC_MESSENGER_CORE_BASE_URL`

## Local Smoke

Из корня репозитория:

```bash
pnpm messenger:core:dev
pnpm messenger:web:dev
```

URL:

- web: `http://localhost:3300`
- core health: `http://localhost:4300/health`

## Production Build

Из корня репозитория:

```bash
pnpm messenger:core:build
pnpm messenger:web:build
```

## Standalone Export

Если нужно вынести messenger из монорепозитория в отдельную папку для нового сервера:

```bash
pnpm messenger:export:standalone
```

По умолчанию будет собрана директория `builds/messenger-standalone` со структурой:

- `core/`
- `web/`
- `ecosystem.config.cjs`
- `docs/messenger/`
- `.github/instructions/`

Можно указать свой путь:

```bash
bash scripts/export-messenger-standalone.sh /tmp/daria-messenger
```

Дальше эту папку можно перенести на отдельный сервер, не копируя остальной проект.

## PM2

Для production baseline используется [messenger/ecosystem.config.cjs](messenger/ecosystem.config.cjs).

Для полностью отдельного сервера используется [messenger/ecosystem.standalone.config.cjs](messenger/ecosystem.standalone.config.cjs).

Пример:

```bash
cd /opt/daria-nuxt
pnpm install --frozen-lockfile
pnpm messenger:core:build
pnpm messenger:web:build
pm2 start messenger/ecosystem.config.cjs
pm2 save
```

Пример для отдельного сервера:

```bash
cd /opt/daria-messenger
cd core && pnpm install --frozen-lockfile && pnpm build
cd ../web && pnpm install --frozen-lockfile && pnpm build
cd ..
MESSENGER_PUBLIC_ORIGIN=https://messenger.example.com \
MESSENGER_PROJECT_ROOT=/opt/daria-messenger \
pm2 start ecosystem.config.cjs
pm2 save
```

Ключевые переменные для standalone запуска:

- `MESSENGER_DEPLOY_ROOT` — корень standalone-папки, по умолчанию `/opt/daria-messenger`
- `MESSENGER_PROJECT_ROOT` — корень проекта для agent/project-engine сценариев
- `MESSENGER_CORE_DATA_DIR` — внешняя папка данных, по умолчанию `/opt/daria-messenger-data`
- `MESSENGER_RUNTIME_ENV_PATH` — файл env для секретов runtime
- `MESSENGER_PUBLIC_ORIGIN` — публичный домен нового сервера
- `NUXT_PUBLIC_MESSENGER_CORE_BASE_URL` — публичный URL API, по умолчанию `${MESSENGER_PUBLIC_ORIGIN}/api`
- `NUXT_APP_BASE_URL` — base path web-клиента, для отдельного домена обычно `/`

## Reverse Proxy

Минимальный вариант:

- `3300` — public web app
- `4300` — backend API, лучше оставить закрытым внешним прокси и пускать запросы только от web route

Рекомендуемо:

- внешний доступ пользователю только к web;
- core держать за reverse proxy или firewall;
- CORS ограничить URL standalone web клиента.

## Alpha Test Checklist

После деплоя проверить:

1. регистрация пользователя;
2. логин;
3. поиск второго пользователя;
4. invite в контакты;
5. принятие invite;
6. открытие direct chat;
7. отправка текстового сообщения;
8. отображение последнего сообщения в Chats;
9. отправка вложения;
10. запись аудиосообщения в браузере с доступом к микрофону;
11. входящий звонок во второй сессии;
12. принятие звонка в реальном браузере с разрешением на микрофон и камеру.