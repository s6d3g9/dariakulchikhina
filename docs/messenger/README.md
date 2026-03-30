# Messenger

Отдельный продукт мессенджера внутри репозитория.

## Source Of Truth

Главные правила и технологический стек описаны в [../../.github/instructions/messenger.instructions.md](../../.github/instructions/messenger.instructions.md).

## Structure

- `messenger/web` — standalone Nuxt web client
- `messenger/core` — standalone Fastify realtime backend

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
- mobile-first shell с разделами Chat / Chats / Contacts / Settings.

Следующий production step — поднять отдельный deploy contour для web и core.

Для выноса в отдельную директорию есть экспорт: `pnpm messenger:export:standalone`.

## First Target

Собрать отдельный messenger shell, который не зависит от основного приложения и может развиваться как самостоятельный продукт.