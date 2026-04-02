---
applyTo: "messenger/**,docs/messenger/**"
---

# Messenger — standalone product rules

> UI-правила для `messenger/web`: [m3-ui.instructions.md](./m3-ui.instructions.md)
>
> Навигация и shell: [menu-navigation.instructions.md](./menu-navigation.instructions.md)
>
> Backend-детали `messenger/core`: [messenger-core.instructions.md](./messenger-core.instructions.md)

## Product boundary

- `messenger/web` и `messenger/core` — отдельный продукт внутри репозитория.
- Это **не** встроенный `/chat` из основного Nuxt-приложения.
- Не переносить сюда `app/**`, `server/**`, `.glass-*`, `ent-*`, `cab-*` и main-app brutalist shell без прямой integration задачи.
- Интеграция с основной платформой допускается через токены, deep links, export/deploy scripts и отдельные API contracts, а не через смешивание runtime-кода.

## Текущий стек

### Messenger Web

- Nuxt 4, `ssr: false`
- TypeScript
- Vuetify 4 + MDI icons
- mobile-first shell
- state в основном живет в `messenger/web/app/composables/**` и `useState()`

### Messenger Core

- Node.js 22+
- Fastify 5 + WebSocket + multipart + static uploads
- Zod для payload/schema parsing
- file-backed store modules в `messenger/core/src/*-store.ts`
- LiveKit integration для call flows
- optional agent/transcription backends через env

## Текущее продуктовое ядро

Base sections messenger shell:

1. `chat`
2. `chats`
3. `contacts`
4. `settings`

Дополнительно:

- `agents` — условная секция, включается feature flag-ом
- audio/video calls
- incoming call overlay
- attachments и voice flows
- agent chats, graph editor, workspace и project-engine surface

## Repository layout

- `messenger/web` — standalone Nuxt/Vuetify client
- `messenger/core` — standalone Fastify realtime backend
- `docs/messenger` — product/backend docs
- `messenger/ecosystem.config.cjs` и `messenger/ecosystem.standalone.config.cjs` — runtime/deploy contours

## UX rules

- Интерфейс mobile-first, но shell должен корректно расширяться в desktop aside + main split.
- Минимальная высота интерактивных элементов — 44px.
- В chat composer обязательны attach/text/send-or-audio сценарии.
- В chats list обязателен preview последнего сообщения.
- В contacts обязателен глобальный поиск + invite/accept flow.
- В settings обязательны профиль, privacy/devices/notifications/AI settings.
- Если включена agents-функциональность, секция `agents` должна выглядеть как органичная часть одного shell, а не как отдельное приложение.

## Bottom dock contract

Нижняя dock-zone над навигацией остается обязательной частью shell:

| Секция | Dock |
|---|---|
| `chat` | `MessengerChatComposerDock` |
| `chats` | search dock |
| `contacts` | search dock |
| `settings` | search/filter dock, если экран использует поиск |

Правила:

- non-chat dock должен жить в той же нижней зоне, что и composer;
- keyboard/media-sheet/call states могут временно скрывать bottom nav, но не ломать dock hierarchy;
- bottom dock не переносится наверх экрана как отдельный header search.

## Engineering rules

- Предпочитать небольшие модули и composables вместо монолитов.
- Web client держать в границах `messenger/web`; backend/runtime state — в `messenger/core`.
- Не предполагать автоматически Postgres/Redis/Drizzle внутри `messenger/core`: текущий контур опирается на file-backed stores и Fastify runtime.
- Новую публичную документацию по messenger хранить в `docs/messenger/`.
- При работе с calls/agents/project-engine сначала проверять существующие composables/store modules, а не строить параллельный контур.