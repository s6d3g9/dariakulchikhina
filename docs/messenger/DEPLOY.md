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

## PM2

Для production baseline используется [messenger/ecosystem.config.cjs](messenger/ecosystem.config.cjs).

Пример:

```bash
cd /opt/daria-nuxt
pnpm install --frozen-lockfile
pnpm messenger:core:build
pnpm messenger:web:build
pm2 start messenger/ecosystem.config.cjs
pm2 save
```

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