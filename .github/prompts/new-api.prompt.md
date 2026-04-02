---
agent: 'agent'
description: 'Создать новый API endpoint (H3 + Drizzle + Zod)'
---

# Новый API endpoint

## Паттерн

```ts
// server/api/{resource}/index.get.ts
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const query = z.object({
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
  }).parse(safeGetQuery(event))
  const db = useDb()
  return await db.select().from(table).limit(query.limit).offset(query.offset)
})
```

## Правила

- Всегда использовать `safeGetQuery` (не `getQuery`) из `server/utils/query.ts`
- Валидация тела: `readValidatedNodeBody(event, Schema)` из `server/utils/body.ts`
- Ошибки: `createError({ statusCode: 404, statusMessage: '...' })`
- Аутентификация: использовать реальные helper-ы из `server/utils/auth.ts`, например `requireAdmin`, `requireAdminOrClient`, `requireAdminOrContractor`, `requireChatSession`
- Не добавлять `console.log`

## Запрос

Создай endpoint: ${input:method:GET} ${input:path:/api/}

Описание: ${input:description:что делает endpoint}
