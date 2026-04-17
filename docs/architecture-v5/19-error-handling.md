# 19. Error Handling — domain errors + HTTP mapping

Этот документ фиксирует правила обработки ошибок в `server/modules/**` и их маппинг в HTTP-ответы на границе handler'а. Это Wave 7 задача, связанная с [18-repository-layer](./18-repository-layer.md).

---

## 19.1. Проблема текущего состояния

Сейчас `*.service.ts` бросают H3-ошибки:

```ts
// server/modules/auth/admin-auth.service.ts
if (!user) {
  throw createError({ statusCode: 401, statusMessage: 'Пользователь не найден' })
}
```

Последствия:
- **Service не изолирован от H3.** Нельзя вызвать из CLI, worker, unit-теста без mock'а h3.
- **HTTP-ответ прописан в service.** Handler не может адаптировать (например, вернуть 200 с флагом вместо 404).
- **Сообщения ошибок размазаны по 50 файлам.** Невозможно гарантировать консистентный shape ответа.
- **Domain-знание утекает в HTTP-слой.** Handler получает Error и не знает — это NotFound или validation failure.

---

## 19.2. Модель: Domain Errors

Создаётся иерархия доменных ошибок в `server/utils/errors.ts`:

```ts
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: unknown) {
    super('NOT_FOUND', `${entity} not found`, { entity, id })
  }
}

export class ConflictError extends DomainError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('CONFLICT', reason, context)
  }
}

export class ValidationError extends DomainError {
  constructor(issues: Array<{ path: string[]; message: string }>) {
    super('VALIDATION_FAILED', 'Validation failed', { issues })
  }
}

export class ForbiddenError extends DomainError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super('FORBIDDEN', reason, context)
  }
}

export class UnauthorizedError extends DomainError {
  constructor(reason: string = 'Not authenticated') {
    super('UNAUTHORIZED', reason)
  }
}

export class RateLimitError extends DomainError {
  constructor(retryAfterSeconds: number) {
    super('RATE_LIMITED', 'Too many requests', { retryAfterSeconds })
  }
}
```

---

## 19.3. Правила использования

### В services

Services бросают **только `DomainError`-подклассы**. Никаких `createError` из h3, никаких plain `Error` с сообщениями.

```ts
// ✅ хорошо
if (!user) throw new NotFoundError('User', id)
if (existing) throw new ConflictError('Login already taken', { login: body.login })

// ❌ плохо
if (!user) throw createError({ statusCode: 401 })
if (!user) throw new Error('User not found')
```

### В repositories

Repository **не бросает** доменные ошибки. Возвращает `null` / пустой массив / boolean. Service решает, как интерпретировать.

Единственное исключение — `DuplicateError` при уникальных ключах (маппится с Postgres 23505):

```ts
// clients.repository.ts
try {
  const [row] = await db.insert(clients).values(input).returning()
  return row
} catch (e) {
  if (getDuplicateCode(e) === '23505') {
    throw new ConflictError('Duplicate key', { table: 'clients' })
  }
  throw e
}
```

### В handlers

Handler вызывает service в `try/catch` OR делегирует в error-mapping middleware (см. §19.4). Если делегирует — просто `return await service.x(...)`.

Ручной try/catch когда нужно адаптивное поведение:

```ts
// handler, который возвращает 200 даже на NotFound
try {
  return { data: await repo.getX(id) }
} catch (e) {
  if (e instanceof NotFoundError) return { data: null }
  throw e
}
```

---

## 19.4. Error-mapping middleware

`server/middleware/error-mapper.ts`:

```ts
import {
  DomainError,
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
  UnauthorizedError,
  RateLimitError,
} from '~/server/utils/errors'

const STATUS_MAP: Array<[new (...args: any[]) => DomainError, number]> = [
  [ValidationError, 400],
  [UnauthorizedError, 401],
  [ForbiddenError, 403],
  [NotFoundError, 404],
  [ConflictError, 409],
  [RateLimitError, 429],
]

export default defineEventHandler((event) => {
  // Hooks into h3 error handler via setResponseHeader + onError
  event.context.onDomainError = (e: DomainError) => {
    const match = STATUS_MAP.find(([cls]) => e instanceof cls)
    const statusCode = match?.[1] ?? 500
    throw createError({
      statusCode,
      statusMessage: e.message,
      data: {
        code: e.code,
        ...(e.context || {}),
      },
    })
  }
})
```

В реальности Nitro/h3 hooks подключаются через plugin:

```ts
// server/plugins/error-handler.ts
import type { NitroApp } from 'nitropack'
import { DomainError } from '~/server/utils/errors'
import { STATUS_MAP } from '~/server/utils/error-mapping'

export default defineNitroPlugin((nitroApp: NitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    if (error instanceof DomainError && event) {
      const match = STATUS_MAP.find(([cls]) => error instanceof cls)
      const statusCode = match?.[1] ?? 500
      event.node.res.statusCode = statusCode
      event.node.res.setHeader('content-type', 'application/json')
      event.node.res.end(JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
          ...(error.context ?? {}),
        },
      }))
    }
  })
})
```

---

## 19.5. Wire-format ответа

Все domain-errors возвращают JSON вида:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found",
    "entity": "Project",
    "id": "nonexistent-slug"
  }
}
```

Для `ValidationError` поле `issues` раскрывает детали:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed",
    "issues": [
      { "path": ["email"], "message": "Invalid email address" },
      { "path": ["password"], "message": "String must contain at least 8 character(s)" }
    ]
  }
}
```

Frontend получает **predictable shape** и может программно реагировать на `code`.

---

## 19.6. Zod → ValidationError

`readValidatedNodeBody` и другие валидаторы должны бросать `ValidationError` вместо сырого `ZodError`. Обёртка:

```ts
// server/utils/validation.ts
import type { H3Event } from 'h3'
import type { ZodSchema, ZodError } from 'zod'
import { ValidationError } from './errors'

export async function readValidated<T>(event: H3Event, schema: ZodSchema<T>): Promise<T> {
  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.map(String),
      message: i.message,
    }))
    throw new ValidationError(issues)
  }
  return result.data
}
```

Миграция: `readValidatedNodeBody` → `readValidated`. Handler'ы переписываются без изменения бизнес-логики.

---

## 19.7. Правила контекста

- **Всегда включай `id` или другой идентификатор в context**, чтобы логи могли корелировать ошибку с конкретным ресурсом.
- **Никогда не включай пароль, token, private key в context** — его логирует middleware.
- **Сообщения — человекочитаемые, на русском**, короткие (≤100 симв.). Детали — в `context`.

---

## 19.8. Логирование

Error-mapping middleware должен логировать:

- Все `5xx` ошибки (500-уровень) — WARNING или ERROR с полным стеком.
- `4xx` — опционально (`ValidationError` и `NotFoundError` — много шума; `ConflictError` и `ForbiddenError` — интересны).
- Request-id из [20. Config and Logging](./20-config-and-logging.md) — всегда в лог.

---

## 19.9. Definition of Done

1. `server/utils/errors.ts` создан, экспортирует 6 классов.
2. `server/plugins/error-handler.ts` перехватывает `DomainError`.
3. `readValidated` заменяет `readValidatedNodeBody` во всех handler'ах.
4. Во всех `server/modules/**/*.service.ts` — ноль `createError`. ESLint правило `no-restricted-imports` добавляется: `createError` из `h3`/`nitropack` запрещён в services.
5. Tests: доменные ошибки из services корректно маппятся в HTTP-код и wire-format.
6. Frontend обновляется на чтение `error.code` вместо парсинга `statusMessage`.

---

## 19.10. Миграция без big-bang

Старый и новый формат уживаются через middleware:

- Handler бросает `createError({ statusCode: 404 })` — старый формат: h3 вернёт 404 со `statusMessage`.
- Service бросает `NotFoundError` — middleware ловит, возвращает новый формат.
- Frontend учится читать оба временно (один deploy на обновление).
- После полного перехода старый формат удаляется, lint включает запрет на `createError` в services.
