# Messenger Instructions

## Scope

Этот файл описывает правила для нового отдельного продукта messenger внутри репозитория.
Он не должен зависеть от текущего Nuxt-приложения, кроме возможной будущей интеграции по auth и deep links.

## Product Goal

Создать отдельный consumer-style мессенджер с четырьмя основными экранами:

1. Chat
2. Chats
3. Contacts
4. Settings

Внутри Chat обязательны:

- текстовые сообщения;
- аудиосообщения;
- вложения;
- аудиозвонок;
- видеозвонок.

## Approved Stack

### Web Client

- Nuxt 4
- Vue 3
- TypeScript
- Pinia
- mobile-first responsive UI
- PWA-ready architecture

### Messaging Core

- Node.js 22+
- TypeScript
- Fastify
- WebSocket
- PostgreSQL
- Redis
- Drizzle ORM

### Calls

- LiveKit as target call engine
- signaling orchestration lives in messenger core

### Media

- S3-compatible storage
- ffmpeg for previews and audio processing

## Repository Layout

Новый мессенджер развивается отдельно от основного проекта в папке `messenger/`.

- `messenger/web` — отдельный web client
- `messenger/core` — отдельный messaging backend
- `docs/messenger` — архитектура, roadmap, protocol docs

Не добавлять бизнес-логику нового мессенджера в текущие `app/`, `server/` и `shared/`, если для этого нет прямой интеграционной задачи.

## UX Rules

- Интерфейс mobile-first.
- На мобильном обязательна нижняя навигация из четырех пунктов: Chat, Chats, Contacts, Settings.
- Минимальная высота интерактивных элементов — 44px.
- Поле ввода в Chat должно работать как у современных мессенджеров: attach, text, send, audio record.
- В Chats обязателен preview последнего сообщения.
- В Contacts обязателен поиск пользователей и сценарий invite/accept.
- В Settings обязателен профиль, privacy, notifications, devices.

## Delivery Phases

### MVP-1

- auth shell
- user discovery
- contact invites
- direct chats
- message composer
- chats list with previews
- mobile layout

### MVP-2

- attachments
- voice messages
- upload pipeline
- unread counters
- delivery/read states

### MVP-3

- audio calls
- video calls
- incoming call UX
- call history

## Engineering Rules

- Предпочитать небольшие модули вместо монолитных Vue-компонентов.
- WebSocket является основным realtime transport.
- SSE не использовать как основной транспорт нового продукта.
- Сразу закладывать отдельные bounded contexts: auth, contacts, conversations, messages, calls, media.
- Вся новая публичная документация по мессенджеру хранится в `docs/messenger/`.

## Initial Milestone

Первый шаг реализации:

1. зафиксировать architecture doc;
2. создать отдельный shell `messenger/web`;
3. создать отдельный shell `messenger/core`;
4. поднять health endpoints и базовый navigation shell;
5. затем переходить к auth, contacts и direct chats.