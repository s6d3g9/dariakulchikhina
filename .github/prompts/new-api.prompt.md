---
mode: 'agent'
description: 'Создать новый API endpoint (H3 + Drizzle + Zod)'
---

# Новый API endpoint

## Паттерн

```ts
// server/api/{resource}/index.get.ts
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const query = safeGetQuery(event, z.object({
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
  }))
  const db = useDb()
  return await db.select().from(table).limit(query.limit).offset(query.offset)
})
```

## Правила

- Всегда использовать `safeGetQuery` (не `getQuery`) из `server/utils/query.ts`
- Валидация тела: `readValidatedBody(event, schema.parse)`
- Ошибки: `createError({ statusCode: 404, message: '...' })`
- Аутентификация: `requireAuth(event)` из `server/utils/auth.ts`
- Не добавлять `console.log`

## Запрос

Создай endpoint: ${input:method:GET} ${input:path:/api/}

Описание: ${input:description:что делает endpoint}
