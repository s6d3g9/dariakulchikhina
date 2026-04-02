---
applyTo: "services/communications-service/**"
---

# Communications Service — relay/signaling service rules

## Scope

`services/communications-service/**` — отдельный Node.js сервис, а не часть Nuxt/Nitro и не часть `messenger/core`.

## Назначение

Сервис работает как zero-knowledge relay:

- комнаты и участники
- ciphertext сообщения
- публичные key bundles
- SSE event fan-out
- signaling для звонков

Сервис **не** передает медиа-поток и не расшифровывает payload.

## Текущий стек

- Node.js 22+
- `node:http`
- optional PostgreSQL persistence через `COMMUNICATIONS_DATABASE_URL`
- in-memory fallback, если БД не задана

## Архитектура

- `src/index.ts` — HTTP entrypoint
- `src/auth.ts` — token signing/verification
- `src/config.ts` — env/config
- `src/store.ts` / `src/pg-store.ts` — storage driver layer
- `src/types.ts` — service contracts

## Правила

- Сохранять HMAC token contract совместимым с main app relay helpers.
- Новые endpoints проектировать вокруг существующих сущностей: rooms, participants, key bundles, messages, signals.
- Любые message payloads считать encrypted-by-client; plaintext parsing не добавлять.
- CORS/headers/OPTIONS handling — часть сервиса, не выносить их в клиентские обходы.
- Если меняется API сервиса, синхронно обновлять `services/communications-service/README.md` и main app relay helpers.

## Запрещено

- ❌ добавлять доступ к plaintext сообщениям или server-side decryption
- ❌ смешивать этот сервис с `messenger/core` или `server/api/**` как будто это один runtime
- ❌ ломать fallback на in-memory storage без явной инфраструктурной миграции