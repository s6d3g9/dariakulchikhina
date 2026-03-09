---
applyTo: "server/db/**"
---

# База данных — Drizzle ORM паттерны

> Источник истины: `docs/rag/DRIZZLE_PATTERNS.md`

## Стек
Drizzle ORM 0.41.x · PostgreSQL · drizzle-kit

## Схема — server/db/schema.ts

```ts
import { pgTable, serial, varchar, text, integer, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core'

export const statusEnum = pgEnum('status', ['active', 'inactive', 'archived'])

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  status: statusEnum('status').default('active').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

## Подключение — useDb()

```ts
import { useDb } from '~/server/db'
const db = useDb()
```

**Никогда** не импортировать `db` напрямую — только через `useDb()`.

## SELECT

```ts
// Все записи
const items = await db.select().from(table)

// С условием
const item = await db.select().from(table).where(eq(table.id, id)).limit(1)

// Только нужные поля
const names = await db.select({ id: table.id, name: table.name }).from(table)

// С пагинацией
const page = await db.select().from(table).limit(limit).offset(offset)

// С поиском
const results = await db.select().from(table)
  .where(ilike(table.name, `%${search}%`))
  .orderBy(desc(table.createdAt))
```

## INSERT

```ts
const [created] = await db.insert(table).values({
  name: body.name,
  slug: body.slug,
}).returning()
```

## UPDATE

```ts
const [updated] = await db.update(table)
  .set({ name: body.name, updatedAt: new Date() })
  .where(eq(table.id, id))
  .returning()

if (!updated) throw createError({ statusCode: 404, message: 'Не найдено' })
```

## DELETE

```ts
await db.delete(table).where(eq(table.id, id))
```

## Импорты операторов

```ts
import { eq, ne, gt, lt, gte, lte, and, or, not, ilike, inArray, isNull, desc, asc } from 'drizzle-orm'
```

## Миграции

```bash
pnpm drizzle-kit generate   # создать файл миграции
pnpm drizzle-kit migrate    # применить миграции
```

Файлы миграций — в папке `drizzle/` (в .gitignore не включать).

## ЗАПРЕЩЕНО

- ❌ Raw SQL строки — только Drizzle API
- ❌ Импорт `db` напрямую — только `useDb()`
- ❌ `any` тип для jsonb — используй `.$type<T>()`
- ❌ Изменять схему без создания миграции
- ❌ Удалять столбцы без проверки зависимостей
