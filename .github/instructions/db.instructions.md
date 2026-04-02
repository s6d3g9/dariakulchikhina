---
applyTo: "server/db/**"
---

# База данных — Drizzle ORM паттерны

> Источник истины: `docs/rag/DRIZZLE_PATTERNS.md`

## Реальные пути

- Схема: `server/db/schema.ts`
- Подключение: `server/db/index.ts`
- Миграции: `server/db/migrations/`
- Конфиг drizzle-kit: `drizzle.config.ts`

## Стек

Drizzle ORM 0.41.x · PostgreSQL · drizzle-kit · `postgres` driver

## Подключение

```ts
import { useDb } from '~/server/db'

const db = useDb()
```

- Использовать только `useDb()`.
- Не импортировать внутренний `_db` и не создавать новые ad-hoc clients в runtime endpoint code.

## Паттерны запросов

```ts
import { and, desc, eq, ilike } from 'drizzle-orm'

const rows = await db
  .select({ id: table.id, title: table.title })
  .from(table)
  .where(and(
    eq(table.projectId, projectId),
    search ? ilike(table.title, `%${search}%`) : undefined,
  ))
  .orderBy(desc(table.createdAt))
  .limit(limit)
  .offset(offset)

const [created] = await db.insert(table).values(payload).returning()

const [updated] = await db
  .update(table)
  .set({ ...payload, updatedAt: new Date() })
  .where(eq(table.id, id))
  .returning()
```

## JSONB и типы

- Для `jsonb` всегда задавать `.$type<T>()`.
- Предпочитать `zod`/shared types для shape-контрактов, если поле разделяется между клиентом и сервером.
- Не использовать `any` для JSON payload колонок.

## Миграции и команды

Использовать команды из root `package.json`:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio
```

- `db:generate` пишет файлы в `server/db/migrations/`.
- Если меняешь `server/db/schema.ts`, почти всегда нужен новый migration file.
- Разовые data migration держать в `scripts/migrate-*.mjs`, а не в runtime-коде или schema-файле.

## Runtime boundaries

- Runtime API-код — через Drizzle.
- One-off maintenance scripts могут использовать `postgres` напрямую, если это отдельный `scripts/*.mjs` сценарий.
- Не смешивать schema evolution и production business logic в одном файле.

## Запрещено

- ❌ raw SQL строки в основном runtime API, если задачу можно выразить через Drizzle
- ❌ импорт `db` напрямую вместо `useDb()`
- ❌ изменение схемы без новой миграции или осознанного `db:push`
- ❌ хранение неописанного `jsonb` с `any`
- ❌ удаление колонок/таблиц без проверки зависимостей и data migration плана
