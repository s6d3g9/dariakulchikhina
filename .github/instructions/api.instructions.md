---
applyTo: "server/api/**,server/utils/**,server/middleware/**"
---

# API — правила написания серверного кода

> Источник истины: `docs/rag/BACKEND_GUIDE.md`

## Стек
H3 (Nitro) · Zod · Drizzle ORM · ioredis

## Паттерн endpoint

```ts
// server/api/resource/index.get.ts
export default defineEventHandler(async (event) => {
  const { limit, offset, search } = await safeGetQuery(event, z.object({
    limit: z.coerce.number().default(20),
    offset: z.coerce.number().default(0),
    search: z.string().optional()
  }))
  const db = useDb()
  return await db.select().from(table).limit(limit).offset(offset)
})
```

## Именование файлов

| Метод | Файл |
|---|---|
| GET список | `server/api/resource/index.get.ts` |
| GET один | `server/api/resource/[id].get.ts` |
| POST создать | `server/api/resource/index.post.ts` |
| PUT обновить | `server/api/resource/[id].put.ts` |
| DELETE удалить | `server/api/resource/[id].delete.ts` |

## Query параметры — ТОЛЬКО safeGetQuery

```ts
// ✅ правильно
import { safeGetQuery } from '~/server/utils/query'
const { page } = await safeGetQuery(event, schema)

// ❌ запрещено
const query = getQuery(event)
```

## Body — валидация через Zod

```ts
const body = await readValidatedBody(event, z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  status: z.enum(['active', 'inactive']).default('active')
}).parse)
```

## Auth — проверка сессии

```ts
import { requireAuth } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event) // бросает 401 если нет сессии
  // session.userId, session.role
})
```

## Ошибки

```ts
throw createError({ statusCode: 404, message: 'Не найдено' })
throw createError({ statusCode: 400, message: 'Неверные данные' })
throw createError({ statusCode: 403, message: 'Нет доступа' })
```

## Redis кэш

```ts
import { useRedis } from '~/server/utils/redis'
const redis = useRedis()
const cached = await redis.get(`key:${id}`)
if (cached) return JSON.parse(cached)
// ... запрос к БД ...
await redis.setex(`key:${id}`, 300, JSON.stringify(data)) // 5 минут
```

## ЗАПРЕЩЕНО

- ❌ `getQuery(event)` напрямую — только `safeGetQuery`
- ❌ `readBody(event)` без Zod валидации
- ❌ `console.log` в production коде
- ❌ SQL через строки — только Drizzle ORM
- ❌ Хранить секреты в коде — только через `process.env`
- ❌ Возвращать полные объекты с паролями/токенами — выбирай только нужные поля
