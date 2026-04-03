# Messenger

Отдельный продукт мессенджера внутри репозитория.

## Source Of Truth

Главные правила и технологический стек описаны в [../../.github/instructions/messenger.instructions.md](../../.github/instructions/messenger.instructions.md).

Для navigation/shell и M3 UI см. также:

- [../../.github/instructions/menu-navigation.instructions.md](../../.github/instructions/menu-navigation.instructions.md)
- [../../.github/instructions/m3-ui.instructions.md](../../.github/instructions/m3-ui.instructions.md)
- [../../.github/instructions/messenger-core.instructions.md](../../.github/instructions/messenger-core.instructions.md)

Не путать этот контур с встроенным `app/pages/chat/**` в основной платформе.

## Structure

- `messenger/web` — standalone Nuxt 4 web client (`ssr: false`, Vuetify 4, MDI)
- `messenger/core` — standalone Fastify realtime backend (WebSocket, uploads, LiveKit, Zod)

`services/communications-service` не является частью `messenger/core`: это отдельный relay/signaling сервис для project communications и интеграционных сценариев main app.

## Alpha Status

Текущий alpha baseline уже включает:

- standalone auth;
- user discovery;
- contact invites;
- direct conversations;
- текстовые сообщения;
- вложения;
- аудиосообщения;
- realtime sync через WebSocket;
- alpha call signaling для аудио и видео звонков с incoming-call overlay;
- mobile-first shell с разделами Chat / Chats / Contacts / Settings;
- optional `agents` section через feature flag.

Следующий production step — поднять отдельный deploy contour для web и core.

Для выноса в отдельную директорию есть экспорт: `pnpm messenger:export:standalone`.

## Product Boundary

- Messenger развивается как самостоятельный продукт, но остаётся в одном монорепозитории с main app.
- Main app `app/**` / `server/**` shell-паттерны и glass/brutalist primitives не переносятся сюда по умолчанию.
- Обмен с основным приложением должен идти через auth/deep-link/API contracts, а не через смешивание runtime-кода.

## First Target

Поддерживать отдельный messenger shell и realtime backend, которые развиваются как самостоятельный продукт внутри репозитория, не смешиваясь с embedded chat из main app.