---
applyTo: "server/api/**,server/utils/**,server/middleware/**"
---

# API — правила серверного кода

> Источники истины: `docs/rag/BACKEND_GUIDE.md`, `server/utils/body.ts`, `server/utils/query.ts`, `server/utils/auth.ts`

## Scope

- `server/api/**` — основной Nitro API основной платформы.
- `server/api/chat/**` — встроенный standalone chat внутри main app.
- `server/api/projects/[slug]/communications/**` — relay к `services/communications-service`.
- `server/utils/**` — query/body/auth/relay/security helpers.
- `server/middleware/**` — request pipeline: canonical host, security headers, rate-limit, body-size, csrf.

## Реальный паттерн endpoint

```ts
import { z } from 'zod'

import { useDb } from '~/server/db'
import { readValidatedNodeBody } from '~/server/utils/body'
import { safeGetQuery } from '~/server/utils/query'
import { requireAdmin } from '~/server/utils/auth'

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().optional(),
})

const BodySchema = z.object({
  title: z.string().trim().min(1).max(255),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = QuerySchema.parse(safeGetQuery(event))
  const body = await readValidatedNodeBody(event, BodySchema)
  const db = useDb()

  return { query, body, dbReady: Boolean(db) }
})
```

## Query параметры

- Использовать только `safeGetQuery(event)`.
- `safeGetQuery()` возвращает сырой map строк; coercion и defaults делать через `Schema.parse(...)`.
- Не выдумывать `safeGetQuery(event, schema)` — в этом репо helper так не работает.

## Body

- Использовать только `readValidatedNodeBody(event, Schema)` из `server/utils/body.ts`.
- Не использовать `readBody()` и не полагаться на `readValidatedBody()` как на канонический helper этого репо.

## Auth helpers

Реальные helper-ы в `server/utils/auth.ts`:

- `requireAdmin(event)`
- `requireAdminOrClient(event, projectSlug)`
- `requireAdminOrContractor(event, contractorId)`
- `requireClient(event, projectSlug?)`
- `requireContractor(event)`
- `requireChatSession(event)`
- `getAdminSession(event)`, `getClientSession(event)`, `getContractorSession(event)`, `getChatSession(event)` для optional auth/preview logic

Не использовать несуществующий `requireAuth()`.

## Домены API

Текущие top-level домены `server/api/`:

- `admin/`
- `ai/`
- `auth/`
- `chat/`
- `clients/`
- `contractors/`
- `designers/`
- `documents/`
- `gallery/`
- `geocode/`
- `managers/`
- `projects/`
- `sellers/`
- `suggest/`
- `suggestions.get.ts`
- `upload.post.ts`

## Communications и чатовые контуры

- `server/api/chat/**` — встроенный standalone chat для основной платформы.
- `server/utils/communications.ts` строит signed bootstrap для project room access.
- `server/utils/project-communications-relay.ts` делает authenticated JSON/SSE relay в `services/communications-service`.
- Если для общения уже есть relay helper, не обходить его ad-hoc `fetch()` прямо из UI.

## Ошибки

```ts
throw createError({ statusCode: 400, statusMessage: 'Неверные данные' })
throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
throw createError({ statusCode: 403, statusMessage: 'Нет доступа' })
throw createError({ statusCode: 404, statusMessage: 'Не найдено' })
```

- Для user-facing ошибок использовать `statusMessage`.
- Не возвращать сырые stack traces и секреты.

## Middleware pipeline

Текущий порядок `server/middleware/`:

1. `00-canonical-dev-host.ts`
2. `00-security-headers.ts`
3. `01-rate-limit.ts`
4. `02-body-size-limit.ts`
5. `03-csrf.ts`

Новые глобальные request checks держать здесь, а не размазывать по endpoint-файлам.

## Запрещено

- ❌ `getQuery(event)` напрямую — только `safeGetQuery(event)`
- ❌ `readBody(event)` без `readValidatedNodeBody()` + Zod
- ❌ несуществующие helper-ы вроде `requireAuth()` или `useRedis()`
- ❌ `console.log` в production коде
- ❌ raw SQL в runtime endpoint code — для основной БД использовать Drizzle через `useDb()`
- ❌ прямой клиентский доступ к relay/service secret логике
- ❌ возврат полных объектов с хэшами паролей, токенами или приватными ключами
