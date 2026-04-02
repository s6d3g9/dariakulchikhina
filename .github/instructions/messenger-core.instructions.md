---
applyTo: "messenger/core/**"
---

# Messenger Core — Fastify realtime backend

## Scope

Этот файл покрывает `messenger/core/**`.

`messenger/core` — отдельный runtime, не Nitro plugin и не часть `server/api/**` основной платформы.

## Текущий стек

- Node.js 22+
- Fastify 5
- `@fastify/websocket`
- `@fastify/multipart`
- static uploads
- Zod
- LiveKit integration

## Архитектурный контракт

- Entry points: `src/index.ts`, `src/server.ts`, `src/config.ts`.
- Основная логика доменов разнесена по `src/*-store.ts` и `src/*-service.ts`.
- Persistence сейчас file-backed/store-module oriented. Не предполагать автоматически PostgreSQL, Redis или Drizzle внутри core.

## Текущие bounded contexts

- auth
- contacts
- conversations/messages/reactions/forwarding
- realtime clients + presence
- calls + routing
- media uploads
- agents + graph/settings/knowledge/workspace
- project-engine
- AI settings / transcription

## Правила

- Route payloads и query contracts валидировать через Zod рядом с endpoint logic.
- Feature flags уважать на уровне runtime (`MESSENGER_ENABLE_AGENTS`, transcription flags и т.д.).
- CORS origins уже поддерживают comma-separated env список; не сужать это обратно до одного origin без причины.
- Не импортировать main-app `app/**`, `server/**` или `shared/**` по инерции; messenger core должен оставаться самостоятельным контуром.
- Если меняешь auth/call/project-engine contracts, обновляй и `docs/messenger/**`.

## Запрещено

- ❌ переносить сюда Nitro/H3 patterns как будто это `server/api/**`
- ❌ добавлять DB/queue/Redis слой без явной product/infrastructure задачи
- ❌ плодить parallel route registries вместо расширения `src/server.ts` и связанных store/service модулей