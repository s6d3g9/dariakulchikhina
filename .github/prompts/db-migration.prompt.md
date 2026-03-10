---
agent: 'agent'
description: 'Добавить поле в Drizzle схему и создать миграцию'
---

# Миграция БД (Drizzle)

## Паттерн добавления поля

В `server/db/schema.ts`:
```ts
// Добавить поле в нужную таблицу
export const projects = pgTable('projects', {
  // ...existing fields...
  newField: text('new_field'),                    // nullable string
  newRequired: text('new_required').notNull(),    // required string
  newDate: timestamp('new_date'),                 // nullable date
  newJson: jsonb('new_json').$type<MyType>(),     // typed JSON
})
```

## Создать миграцию скриптом

```js
// scripts/migrate-add-{field}.mjs
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as dotenv from 'dotenv'
dotenv.config()

const sql = postgres(process.env.DATABASE_URL)
const db = drizzle(sql)

await sql`ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {field} {type}`
console.log('Done')
await sql.end()
```

## Правила

- Всегда `IF NOT EXISTS` для безопасности
- Не удалять существующие поля в миграции
- Запуск: `node scripts/migrate-add-{field}.mjs`

## Запрос

Добавить поле `${input:field:field_name}` типа `${input:type:text}` в таблицу `${input:table:projects}`
