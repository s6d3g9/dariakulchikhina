# Messenger Instructions

> **M3 UI Implementation:** Полные правила построения интерфейса на Material Design 3 + Vuetify 3 описаны в [m3-ui.instructions.md](./m3-ui.instructions.md). Читать перед любой правкой UI.
>
> **Структура меню и навигации:** Строение нав-бара, всех секций, bottom sheet и context menu описано в [menu-navigation.instructions.md](./menu-navigation.instructions.md).

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
- Любые кнопки-меню разделов и переключатели наборов контента, например Фото / Файлы / Ссылки / Ключи и Смайлы / Стикеры / GIF, должны отображаться в одну горизонтальную линию с единым размером кнопок и горизонтальным скроллом при нехватке ширины.
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

## Bottom Dock Rule

В каждом экране мессенджера снизу (выше нижней навигации) ВСЕГДА должна присутствовать «зона дока»:

| Экран | Содержимое дока |
|---|---|
| **Chat** | Строка ввода сообщений (`MessengerChatComposerDock`) |
| **Chats** | Строка поиска по чатам |
| **Contacts** | Строка поиска пользователей |
| **Settings** | Строка поиска по настройкам |

**Правила:**
- Строка поиска в не-chat экранах занимает **ту же самую позицию**, что и строка ввода в Chat — фиксированная высота, одинаковый визуальный вес, над нижним нав-баром.
- Строка поиска визуально **идентична** строке ввода сообщения Composer: pill shape 28px, border, surface-container-high bg, 48px height. Меняется только placeholder.
- Использовать `VTextField` с классом `composer-search-field` (variant="solo-filled", flat, rounded="xl", bg-color="surface-container-high"). НЕ использовать density="compact".
- Поиск НИКОГДА не появляется вверху экрана. Только в зоне дока снизу.
- CSS-класс для поисковых доков: `search-dock--bottom-dock`.
- Dropdown результатов из bottom-dock открывается **вверх** (`bottom: 100%; top: auto`).
- Компонент `MessengerChatComposerDock` рендерится только в Chat-секции.

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