# 20. Config + Logging — fail-fast конфигурация и structured логи

Wave 7 задача: централизовать env-чтение и поставить structured логирование с correlation-id через AsyncLocalStorage. Текущее состояние — `process.env.X` раскидан по 30+ местам, `console.log` без контекста, никакой связи request→service→DB в логах.

---

## 20.1. Central config с Zod-валидацией

### Проблема

`process.env.DESIGNER_INITIAL_PASSWORD` читается в `admin-auth.service.ts`, `auth-registration.ts`, и, возможно, в ещё нескольких местах. Каждое место делает свой `|| ''` fallback. Нигде не валидируется что переменная вообще задана при старте.

Последствия:
- Ошибка в имени env-переменной ловится через 3 часа когда пользователь нажал "войти".
- Нет источника правды для `.env.example` — документация расходится с кодом.
- Type-safety отсутствует — везде `string | undefined`.

### Решение

`server/config.ts` — единственный модуль, читающий `process.env`:

```ts
import { z } from 'zod'

const ConfigSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Auth
  DESIGNER_INITIAL_EMAIL: z.string().email().default('admin@dariakulchikhina.com'),
  DESIGNER_INITIAL_LOGIN: z.string().optional(),
  DESIGNER_INITIAL_PASSWORD: z.string().optional(),

  // WebSocket tickets
  WS_TICKET_TTL_SECONDS: z.coerce.number().int().positive().default(30),

  // Storage
  UPLOAD_DIR: z.string().default('public/uploads'),

  // MinIO (E2EE file storage)
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),

  // HMAC session secret
  SESSION_SECRET: z.string().min(32),

  // External AI
  GEMMA_API_URL: z.string().url().optional(),
  GEMMA_API_KEY: z.string().optional(),

  // LiveKit
  LIVEKIT_URL: z.string().url().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
})

export type Config = z.infer<typeof ConfigSchema>

function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    console.error('[config] Environment validation failed:\n' + issues)
    process.exit(1)
  }
  return parsed.data
}

export const config = loadConfig()
```

### Правила использования

- **Нигде в коде, кроме `server/config.ts`, не читается `process.env` напрямую.** ESLint правило:

  ```js
  {
    files: ['server/**/*.ts', 'app/**/*.ts', 'shared/**/*.ts'],
    excludedFiles: ['server/config.ts', 'scripts/**', '**/*.config.ts'],
    rules: {
      'no-restricted-properties': ['error', {
        object: 'process',
        property: 'env',
        message: 'Use ~/server/config instead',
      }],
    },
  }
  ```

- **Import-пример:**

  ```ts
  import { config } from '~/server/config'

  const user = await findByEmail(config.DESIGNER_INITIAL_EMAIL)
  ```

- **Client-side** (frontend) читает только `useRuntimeConfig()` из Nuxt — там своя валидация в `nuxt.config.ts`.

---

## 20.2. Structured logging

### Проблема

Сейчас:
```ts
console.log(`[DISPATCH] Sending message to ${member.name} via ${notifyBy}: ${message}`)
```

Минусы:
- Не структурировано — grep работает, но агрегаторы не парсят.
- Нет correlation-id — при распределённом запросе (Nuxt → modules → Redis → messenger) восстановить цепочку невозможно.
- Нет уровней (debug/info/warn/error).
- При высокой нагрузке console.log блокирует event loop (pino/consola async).

### Решение

**Logger:** [pino](https://github.com/pinojs/pino) (быстрый, async, JSON-output) или встроенный `consola` если уже есть в проекте. Выбор за первым коммитом Wave 7.

**Core setup** — `server/utils/logger.ts`:

```ts
import pino from 'pino'
import { config } from '~/server/config'

export const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: ['req.headers.cookie', 'req.headers.authorization', 'password', 'passwordHash'],
  transport: config.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true },
  } : undefined,
})
```

### Correlation-ID через AsyncLocalStorage

Каждый HTTP request получает уникальный id; он доступен из любого вложенного await'а без пробрасывания в сигнатуры.

```ts
// server/utils/request-context.ts
import { AsyncLocalStorage } from 'node:async_hooks'

interface RequestContext {
  requestId: string
  userId?: number
  role?: 'admin' | 'client' | 'contractor'
  startedAt: number
}

const storage = new AsyncLocalStorage<RequestContext>()

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn)
}

export function getContext(): RequestContext | undefined {
  return storage.getStore()
}
```

Middleware инициализирует:

```ts
// server/middleware/00-request-context.ts
import { randomUUID } from 'node:crypto'
import { runWithContext } from '~/server/utils/request-context'

export default defineEventHandler((event) => {
  const requestId = getHeader(event, 'x-request-id') || randomUUID()
  event.node.res.setHeader('x-request-id', requestId)

  return new Promise((resolve, reject) => {
    runWithContext(
      { requestId, startedAt: Date.now() },
      () => Promise.resolve().then(resolve, reject),
    )
  })
})
```

Logger-wrapper автоматически подмешивает requestId:

```ts
// server/utils/log.ts
import { logger as pino } from './logger'
import { getContext } from './request-context'

function withCtx(method: 'info' | 'warn' | 'error' | 'debug') {
  return (data: Record<string, unknown> | string, message?: string) => {
    const ctx = getContext()
    const payload = typeof data === 'string' ? { message: data } : { ...data, message: message ?? data.message }
    if (ctx) payload.requestId = ctx.requestId
    if (ctx?.userId) payload.userId = ctx.userId
    pino[method](payload)
  }
}

export const log = {
  info: withCtx('info'),
  warn: withCtx('warn'),
  error: withCtx('error'),
  debug: withCtx('debug'),
}
```

### Правила использования

- `console.log` запрещён в `server/**` (кроме `scripts/` и одноразовых миграций). ESLint `no-console`.
- Любой лог в services и modules — через `log.info({ ...context }, 'message')`.
- Errors пишутся через `log.error({ err, context }, 'message')` — pino умеет сериализовать Error.
- Ни один request-specific лог не должен требовать явного проброса requestId — AsyncLocalStorage достаёт сам.

---

## 20.3. Cross-process correlation

Main Nuxt app публикует в Redis:

```ts
await redis.publish('entity_updates', JSON.stringify({
  requestId: getContext()?.requestId,
  kind: 'project.status.changed',
  projectId,
  nextStatus,
}))
```

Messenger/core subscriber читает requestId и пересоздаёт context в своём handler'е:

```ts
redisSubscriber.on('message', (_channel, raw) => {
  const event = JSON.parse(raw)
  runWithContext(
    { requestId: event.requestId ?? randomUUID(), startedAt: Date.now() },
    () => processEvent(event),
  )
})
```

Таким образом один запрос во фронте → всем цепочкам сервисов → всем Redis-событиям → всем WS-push'ам — один и тот же `requestId`. Отладка становится банальной grep-задачей.

---

## 20.4. Метрики (scope-freeze)

Полноценные Prometheus/OpenTelemetry метрики — отдельная Wave 8. В Wave 7 хватит:

- HTTP duration в request-context middleware: `log.info({ status, durationMs }, 'request complete')`.
- DB query count через Drizzle `logger` option (если Drizzle версии поддерживает).
- Cache hit/miss для Redis — добавить как метод на обёртке.

---

## 20.5. .env.example как single source

В `.env.example` должен быть ровно тот набор переменных, что в `ConfigSchema`. CI-проверка:

```bash
# scripts/verify-env-example.mjs
# Парсит ConfigSchema (import {config.ts}) и сравнивает ключи с .env.example
# Fail если расхождение.
```

Pre-commit hook: если `server/config.ts` изменился — требует обновления `.env.example`.

---

## 20.6. Definition of Done

1. `server/config.ts` создан. Все ключи из `process.env` (grep) перенесены.
2. `.env.example` синхронизирован.
3. ESLint `no-restricted-properties` блокирует `process.env` вне config.ts.
4. pino/consola поставлен, `server/utils/log.ts` + AsyncLocalStorage middleware подключены.
5. Все `console.log` в `server/**` заменены на `log.*`. ESLint `no-console` активен.
6. Redis publish включает `requestId` в payload; messenger/core его подхватывает.
7. `/health/ready` endpoint отвечает 200 только если DB + Redis + (MinIO) доступны — и health-ответ включает validated config summary (имена env, без значений).

---

## 20.8. Known exceptions

### `messenger/core/src/agents/claude-cli-reply.ts:29` — direct `process.env` read

**Status:** Deferred to future messenger-specific configuration wave.

**Reason:** `messenger/core` is a separate runtime outside the main-app v5 refactor scope. The process.env read at line 29 falls under messenger's own internal configuration strategy and is not part of the centralized config consolidation effort in the main Nuxt application.

**Tracked for:** A dedicated messenger + services configuration consolidation wave (no date pinned).

---

## 20.7. Порядок внедрения

1. **Config** (день 1): ConfigSchema + миграция `process.env` → `config.X`. Единственный commit, обратимый.
2. **Logger-core** (день 2): pino + `server/utils/logger.ts` + `log.*` обёртка. `console.log` НЕ заменяем ещё.
3. **Request-context** (день 2-3): AsyncLocalStorage middleware + интеграция в log.
4. **Миграция `console.log` → `log.*`** (день 3): поэтапно по доменам.
5. **Redis correlation** (день 4): publisher/subscriber bridges.
6. **ESLint enforcement** (день 5): включаем rules как error, правим tail.
7. **Health endpoints** (день 5): `/health/{live,ready,info}`.

Каждый шаг — отдельный commit, отдельный roadmap-entry.
