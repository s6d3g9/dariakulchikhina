---
agent: 'agent'
description: 'Изменить Drizzle schema и создать migration file'
---

# Миграция БД (Drizzle)

## Канонический workflow

1. Изменить `server/db/schema.ts`
2. Сгенерировать migration file через `pnpm db:generate`
3. При необходимости применить миграции через `pnpm db:migrate`
4. Если нужен разовый backfill/repair данных, создать отдельный `scripts/migrate-*.mjs`

## Паттерн добавления поля в schema

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

## Сгенерировать migration file

```bash
pnpm db:generate
# migration будет создана в server/db/migrations/
```

## Когда нужен отдельный скрипт

Использовать `scripts/migrate-*.mjs` только если кроме schema evolution нужен разовый data backfill, cleanup или repair. Такой скрипт не заменяет migration file, если была изменена `server/db/schema.ts`.

## Правила

- Schema changes вести через `server/db/schema.ts` + `pnpm db:generate`
- Не удалять существующие поля/таблицы без проверки зависимостей и плана data migration
- Для `jsonb` задавать `.$type<T>()`
- Runtime API-код должен работать через `useDb()`, а не через ad-hoc DB client

## Запрос

Добавить поле `${input:field:field_name}` типа `${input:type:text}` в таблицу `${input:table:projects}`
