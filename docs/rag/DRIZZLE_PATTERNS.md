# Drizzle ORM + PostgreSQL — Паттерны (RAG)

> Источники: orm.drizzle.team (docs: schema, select, insert, rqb)
> Версия: Drizzle ORM 0.41.x + drizzle-kit, PostgreSQL (postgres 3.4.x)

---

## 1. Определение схемы

### Таблица
```ts
// server/db/schema.ts
import {
  pgTable, serial, text, varchar, integer, boolean,
  timestamp, jsonb, pgEnum, uuid, numeric, date
} from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['admin', 'user', 'manager'])

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: roleEnum('role').default('user').notNull(),
  bio: text('bio'),
  age: integer('age'),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

### Типы столбцов

| Drizzle | PostgreSQL | TypeScript |
|---------|-----------|-----------|
| `serial()` | `serial` | `number` |
| `integer()` | `integer` | `number` |
| `numeric()` | `numeric` | `string` |
| `boolean()` | `boolean` | `boolean` |
| `text()` | `text` | `string` |
| `varchar({length})` | `varchar(n)` | `string` |
| `timestamp()` | `timestamp` | `Date` |
| `date()` | `date` | `string` |
| `jsonb()` | `jsonb` | `unknown` (нужен `.$type<T>()`) |
| `uuid()` | `uuid` | `string` |
| `pgEnum()` | `enum type` | union of literals |

### Модификаторы столбцов
```ts
column.primaryKey()
column.notNull()
column.default(value)
column.defaultNow()           // для timestamp
column.unique()
column.$type<MyType>()        // cast типа для jsonb
column.references(() => otherTable.id)  // FK
```

### Связи (Relations)
```ts
import { relations } from 'drizzle-orm'

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId]
  }),
  posts: many(posts)
}))

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id]
  })
}))
```

### Вывод типов из схемы
```ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm'

type User = InferSelectModel<typeof users>
type NewUser = InferInsertModel<typeof users>
// или через $inferSelect / $inferInsert
type User = typeof users.$inferSelect
type NewUser = typeof users.$inferInsert
```

---

## 2. SELECT запросы

### Базовый select
```ts
import { db } from '~/server/db'
import { users } from '~/server/db/schema'

// Все колонки
const allUsers = await db.select().from(users)

// Определённые колонки
const names = await db.select({
  id: users.id,
  name: users.name,
  email: users.email
}).from(users)
```

### Фильтрация (where)
```ts
import { eq, ne, lt, lte, gt, gte, like, ilike, between, inArray, isNull, isNotNull, and, or, not, sql } from 'drizzle-orm'

// Простые
await db.select().from(users).where(eq(users.role, 'admin'))
await db.select().from(users).where(ne(users.status, 'deleted'))
await db.select().from(users).where(gt(users.age, 18))
await db.select().from(users).where(ilike(users.name, '%ivan%'))
await db.select().from(users).where(isNotNull(users.email))
await db.select().from(users).where(inArray(users.id, [1, 2, 3]))
await db.select().from(users).where(between(users.age, 18, 65))

// Комбинации
await db.select().from(users).where(
  and(
    eq(users.role, 'admin'),
    gt(users.age, 21),
    or(
      ilike(users.name, '%ivan%'),
      ilike(users.email, '%@company.com')
    )
  )
)
```

### Сортировка, лимит, оффсет
```ts
import { asc, desc } from 'drizzle-orm'

await db.select()
  .from(users)
  .orderBy(desc(users.createdAt), asc(users.name))
  .limit(20)
  .offset(40)  // страница 3 при limit=20
```

### JOIN
```ts
await db.select({
  userId: users.id,
  userName: users.name,
  postTitle: posts.title
})
.from(users)
.leftJoin(posts, eq(users.id, posts.authorId))
.where(eq(users.isActive, true))
```

### Агрегации
```ts
import { count, sum, avg, min, max } from 'drizzle-orm'

const result = await db.select({
  role: users.role,
  total: count(),
  avgAge: avg(users.age)
}).from(users).groupBy(users.role)
```

### Distinct
```ts
await db.selectDistinct({ role: users.role }).from(users)
await db.selectDistinctOn([users.role], { role: users.role, name: users.name }).from(users)
```

### Raw SQL
```ts
import { sql } from 'drizzle-orm'

await db.select({
  id: users.id,
  lowerName: sql<string>`lower(${users.name})`
}).from(users)

// В where
.where(sql`${users.createdAt} > now() - interval '7 days'`)
```

---

## 3. Relational Queries (query API)

### findMany
```ts
const result = await db.query.users.findMany({
  columns: {
    id: true,
    name: true,
    email: true
  },
  with: {
    posts: {
      columns: { id: true, title: true },
      where: eq(posts.published, true),
      orderBy: [desc(posts.createdAt)],
      limit: 5
    },
    profile: true
  },
  where: eq(users.isActive, true),
  orderBy: [desc(users.createdAt)],
  limit: 20,
  offset: 0
})
```

### findFirst
```ts
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    posts: true,
    profile: true
  }
})
```

### Nested relations
```ts
const posts = await db.query.posts.findMany({
  with: {
    author: {
      columns: { id: true, name: true }
    },
    comments: {
      with: {
        author: { columns: { name: true } }
      },
      orderBy: [desc(comments.createdAt)]
    }
  }
})
```

---

## 4. INSERT

### Один элемент
```ts
await db.insert(users).values({
  name: 'Ivan',
  email: 'ivan@example.com',
  role: 'user'
})
```

### С returning
```ts
const [newUser] = await db.insert(users).values({
  name: 'Ivan',
  email: 'ivan@example.com'
}).returning()          // возвращает все колонки

// Или конкретные:
const [{ id }] = await db.insert(users).values({
  name: 'Ivan',
  email: 'ivan@example.com'
}).returning({ id: users.id })
```

### Bulk insert
```ts
await db.insert(users).values([
  { name: 'User 1', email: 'u1@mail.com' },
  { name: 'User 2', email: 'u2@mail.com' },
  { name: 'User 3', email: 'u3@mail.com' },
])
```

### Upsert (ON CONFLICT)
```ts
await db.insert(users)
  .values({ id: 1, name: 'Ivan', email: 'ivan@mail.com' })
  .onConflictDoNothing()

await db.insert(users)
  .values({ id: 1, name: 'Ivan', email: 'ivan@mail.com' })
  .onConflictDoUpdate({
    target: users.email,
    set: {
      name: sql`excluded.name`,
      updatedAt: new Date()
    }
  })
```

---

## 5. UPDATE

```ts
await db.update(users)
  .set({
    name: 'New Name',
    updatedAt: new Date()
  })
  .where(eq(users.id, userId))

// С returning
const [updated] = await db.update(users)
  .set({ isActive: false })
  .where(eq(users.id, userId))
  .returning()
```

---

## 6. DELETE

```ts
await db.delete(users).where(eq(users.id, userId))

// С returning
const [deleted] = await db.delete(users)
  .where(eq(users.id, userId))
  .returning()
```

---

## 7. Транзакции

```ts
const result = await db.transaction(async (tx) => {
  const [order] = await tx.insert(orders).values({
    userId: user.id,
    total: 100
  }).returning()

  await tx.insert(orderItems).values(
    items.map(item => ({
      orderId: order.id,
      productId: item.id,
      quantity: item.qty
    }))
  )

  await tx.update(users)
    .set({ balance: sql`${users.balance} - 100` })
    .where(eq(users.id, user.id))

  return order
})
```

---

## 8. Drizzle Kit (миграции)

### drizzle.config.ts
```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
})
```

### Команды
```bash
npx drizzle-kit generate    # генерирует SQL миграцию из изменений схемы
npx drizzle-kit migrate     # применяет миграции
npx drizzle-kit push        # push schema напрямую (dev)
npx drizzle-kit studio      # GUI для БД
```

---

## Быстрая шпаргалка

| Задача | Код |
|--------|-----|
| Все записи | `db.select().from(table)` |
| С фильтром | `.where(eq(table.col, value))` |
| AND/OR | `and(eq(...), or(gt(...), lt(...)))` |
| LIKE | `ilike(table.name, '%search%')` |
| Sort + Page | `.orderBy(desc(t.createdAt)).limit(20).offset(0)` |
| JOIN | `.leftJoin(other, eq(t.id, other.tId))` |
| COUNT | `db.select({ n: count() }).from(t)` |
| Insert + return | `db.insert(t).values({...}).returning()` |
| Update | `db.update(t).set({...}).where(eq(t.id, id))` |
| Delete | `db.delete(t).where(eq(t.id, id))` |
| Upsert | `.onConflictDoUpdate({ target: t.email, set: {...} })` |
| Relational | `db.query.t.findMany({ with: { rel: true } })` |
| Тип select | `typeof table.$inferSelect` |
| Тип insert | `typeof table.$inferInsert` |
| Raw SQL | `` sql`lower(${t.name})` `` |
