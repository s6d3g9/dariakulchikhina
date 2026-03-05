# Backend Guide — H3/Nitro + Zod (RAG)

> Источники: v1.h3.dev (guide, utils), zod.dev (docs)
> Версии: H3 v1.x (Nitro), Zod 3.24.x

---

## 1. H3 Event Handlers

### Базовый обработчик
```ts
// server/api/hello.get.ts
export default defineEventHandler(async (event) => {
  return { message: 'Hello World' }
})
```

### Типы ответов

| Return value | Content-Type |
|-------------|-------------|
| JSON object/array | `application/json` (auto-serialize) |
| `string` | `text/html` |
| `null` | `204 No Content` |
| `ReadableStream` / `Readable` | Pipe as-is |
| `Buffer` / `ArrayBuffer` | Binary |

### Object syntax (хуки)
```ts
export default defineEventHandler({
  onRequest: [logRequest],           // ДО обработки
  onBeforeResponse: [compressBody],  // ПОСЛЕ обработки, ДО отправки
  async handler(event) {
    return { data: 'result' }
  }
})
```

---

## 2. Утилиты запроса (Request Utils)

### Query параметры
```ts
// GET /api/items?page=2&limit=10
export default defineEventHandler(async (event) => {
  const query = getQuery(event)     // { page: '2', limit: '10' }
  return query
})
```

### Валидированные query (+ Zod)
```ts
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, z.object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(20),
    search: z.string().optional()
  }).parse)
  // query.page — number, query.limit — number
})
```

### Body запроса
```ts
// POST /api/items
export default defineEventHandler(async (event) => {
  const body = await readBody(event)   // any — без валидации!
  return body
})
```

### Валидированный body (+ Zod)
```ts
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(['admin', 'user', 'manager'])
  }).parse)
  // body.name — string, body.email — string, body.role — 'admin'|'user'|'manager'
})
```

### Route параметры
```ts
// server/api/items/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')        // string | undefined
  const params = getRouterParams(event)            // { id: '123' }
  const validated = await getValidatedRouterParams(event, z.object({
    id: z.coerce.number().int().positive()
  }).parse)
  // validated.id — number
})
```

### Заголовки
```ts
const auth = getHeader(event, 'authorization')
const all = getHeaders(event)
const url = getRequestURL(event)    // URL object
```

### Form Data / Multipart
```ts
const formData = await readFormData(event)
const files = await readMultipartFormData(event)
// files → [{ name, filename, type, data: Buffer }]
```

---

## 3. Обработка ошибок

### createError
```ts
export default defineEventHandler(async (event) => {
  const item = await findItem(id)
  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Item not found',
      data: { id }            // доп. данные для клиента
    })
  }
  return item
})
```

### Стандартные коды
```ts
throw createError({ statusCode: 400, message: 'Bad Request' })
throw createError({ statusCode: 401, message: 'Unauthorized' })
throw createError({ statusCode: 403, message: 'Forbidden' })
throw createError({ statusCode: 404, message: 'Not Found' })
throw createError({ statusCode: 409, message: 'Conflict' })
throw createError({ statusCode: 500, message: 'Internal Server Error' })
```

---

## 4. Middleware (Nitro)

### Server middleware — выполняется для КАЖДОГО запроса
```ts
// server/middleware/auth.ts
export default defineEventHandler((event) => {
  // НЕ возвращаем значение! Только side-effects
  const token = getHeader(event, 'authorization')
  if (!token) {
    throw createError({ statusCode: 401, message: 'No token' })
  }
  event.context.user = verifyToken(token)
})
```

### Контекст запроса
```ts
// Запись в middleware:
event.context.user = { id: 1, role: 'admin' }

// Чтение в handler:
const user = event.context.user
```

---

## 5. Zod — Валидация схем

### Примитивы
```ts
import { z } from 'zod'

z.string()
z.number()
z.boolean()
z.date()
z.bigint()
z.undefined()
z.null()
z.void()
z.any()
z.unknown()
z.never()
```

### String валидации
```ts
z.string().min(1, 'Required')         // не пустая
z.string().max(255)                     // максимум 255
z.string().email('Invalid email')       // email
z.string().url()                        // URL
z.string().uuid()                       // UUID v4
z.string().regex(/^[A-Z]+$/)           // regex
z.string().trim()                       // trim перед валидацией
z.string().toLowerCase()                // toLowerCase перед валидацией
z.string().startsWith('https://')
z.string().includes('@')
z.string().datetime()                   // ISO 8601
z.string().ip()                         // IP address
```

### Number валидации
```ts
z.number().int()                        // целое
z.number().positive()                   // > 0
z.number().nonnegative()                // >= 0
z.number().min(0).max(100)              // диапазон
z.number().finite()                     // не Infinity
z.number().safe()                       // Number.isSafeInteger range
```

### Object
```ts
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  bio: z.string().optional(),         // string | undefined
  age: z.number().nullable(),          // number | null
  tags: z.array(z.string()),
  address: z.object({
    city: z.string(),
    zip: z.string()
  }).optional()
})

type User = z.infer<typeof UserSchema>
```

### Object методы
```ts
UserSchema.partial()                    // все поля optional
UserSchema.required()                   // все поля required
UserSchema.pick({ name: true, email: true })
UserSchema.omit({ id: true })
UserSchema.extend({ phone: z.string() })
UserSchema.merge(OtherSchema)
UserSchema.passthrough()                // пропускать неизвестные ключи
UserSchema.strip()                      // удалять неизвестные ключи (default)
UserSchema.strict()                     // ошибка на неизвестные ключи
```

### Array
```ts
z.array(z.string())                     // string[]
z.array(z.number()).min(1).max(10)      // 1-10 элементов
z.array(z.string()).nonempty()          // минимум 1
z.string().array()                      // то же что z.array(z.string())
```

### Enum / Union / Literal
```ts
z.enum(['draft', 'published', 'archived'])     // string enum
z.nativeEnum(MyTSEnum)                          // TypeScript enum
z.union([z.string(), z.number()])               // string | number
z.discriminatedUnion('type', [                  // быстрее union для объектов
  z.object({ type: z.literal('a'), a: z.string() }),
  z.object({ type: z.literal('b'), b: z.number() }),
])
z.literal('hello')                              // exact value
```

### Coercion (для query params!)
```ts
z.coerce.number()      // "123" → 123
z.coerce.boolean()     // "true" → true
z.coerce.date()        // "2024-01-01" → Date
z.coerce.string()      // 123 → "123"
```

### Transform & Refine
```ts
// Transform — преобразование
const schema = z.string().transform(val => val.toUpperCase())
schema.parse('hello') // → 'HELLO'

// Refine — кастомная валидация
const PasswordSchema = z.string()
  .min(8)
  .refine(val => /[A-Z]/.test(val), 'Нужна заглавная буква')
  .refine(val => /[0-9]/.test(val), 'Нужна цифра')

// SuperRefine — несколько ошибок
const schema = z.object({
  password: z.string(),
  confirm: z.string()
}).superRefine((data, ctx) => {
  if (data.password !== data.confirm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Пароли не совпадают',
      path: ['confirm']
    })
  }
})
```

### Parse vs SafeParse
```ts
// parse — throws ZodError
try {
  const data = schema.parse(input)
} catch (e) {
  if (e instanceof z.ZodError) {
    console.log(e.issues)  // [{ code, message, path }]
  }
}

// safeParse — возвращает result
const result = schema.safeParse(input)
if (result.success) {
  console.log(result.data)
} else {
  console.log(result.error.issues)
}
```

### z.infer — типы из схем
```ts
const ItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(['active', 'archived'])
})

type Item = z.infer<typeof ItemSchema>
// { id: number; name: string; status: 'active' | 'archived' }
```

---

## 6. Паттерн: API endpoint с полной валидацией

```ts
// server/api/projects.post.ts
import { z } from 'zod'
import { db } from '~/server/db'
import { projects } from '~/server/db/schema'

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  budget: z.number().positive(),
  status: z.enum(['draft', 'active']).default('draft')
})

export default defineEventHandler(async (event) => {
  // Авторизация (из middleware)
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  // Валидация body
  const body = await readValidatedBody(event, CreateProjectSchema.parse)

  // Запись в БД
  const [project] = await db.insert(projects).values({
    ...body,
    createdBy: user.id
  }).returning()

  return project
})
```

```ts
// server/api/projects.get.ts
import { z } from 'zod'
import { db } from '~/server/db'
import { projects } from '~/server/db/schema'
import { like, desc } from 'drizzle-orm'

const QuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
  search: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const { page, limit, search } = await getValidatedQuery(event, QuerySchema.parse)

  const where = search ? like(projects.name, `%${search}%`) : undefined

  const items = await db.select()
    .from(projects)
    .where(where)
    .orderBy(desc(projects.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)

  return { items, page, limit }
})
```

---

## Быстрая шпаргалка

| Задача | Код |
|--------|-----|
| GET query | `getQuery(event)` |
| GET query + Zod | `getValidatedQuery(event, schema.parse)` |
| POST body | `readBody(event)` |
| POST body + Zod | `readValidatedBody(event, schema.parse)` |
| Route params | `getRouterParam(event, 'id')` |
| Header | `getHeader(event, 'authorization')` |
| Ошибка 404 | `throw createError({ statusCode: 404, message: '...' })` |
| Контекст | `event.context.user` |
| Тип из схемы | `type T = z.infer<typeof Schema>` |
| Coerce string→number | `z.coerce.number()` |
| Optional field | `z.string().optional()` |
| Nullable field | `z.number().nullable()` |
