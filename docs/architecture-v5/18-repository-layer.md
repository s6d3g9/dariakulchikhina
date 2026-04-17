# 18. Repository Layer — разделение service и persistence

Этот документ фиксирует правила следующей волны рефакторинга backend (Wave 7): вынос всей работы с Drizzle из `*.service.ts` в отдельный `*.repository.ts` слой. Это **не перенос кода** (логика остаётся в том же domain), а **разделение ответственности внутри domain'а**.

Связанные документы:
- [03. Backend Layer](./03-backend-layer.md) — общие правила `server/modules/`.
- [17. Coding Standards §17.3](./17-coding-standards.md) — layout файлов внутри модуля.
- [19. Error Handling](./19-error-handling.md) — как errors пересекают границу service→repository.

---

## 18.1. Зачем это нужно

Сейчас (после Wave 5) типичный `server/modules/<domain>/<name>.service.ts` содержит:
1. Zod-схемы валидации
2. HTTP-ошибки (`createError`)
3. Drizzle queries и joins
4. Бизнес-правила (guards, invariants)
5. Cookie side-effects (`setAdminSession` и т.п.)

Это работает, но **непригодно для тестирования**: чтобы замокать один SELECT, приходится тянуть всю Drizzle + реальный Postgres либо сложный mock всего query builder.

Разделение на service + repository даёт:

1. **Testability без БД.** Service получает repository как аргумент — в тесте подсовывается in-memory fake.
2. **Single place для query optimization.** Все SELECT/INSERT для domain'а в одном файле — видно N+1, отсутствующие индексы, шумные joins.
3. **Enforceable boundary.** ESLint-правило `drizzle-orm` допустим только в `*.repository.ts`; `*.service.ts` становится чистой бизнес-логикой.
4. **Domain types vs DB rows.** Repository возвращает domain-объект (`Project`, `Client`), а не raw Drizzle row. Позволяет эволюционировать схему БД без трогания service-слоя.
5. **Граница аудита.** В будущем добавление метрик/трейсинга на каждый DB-call — одна правка в repository, а не раскиданная по 20 services.

---

## 18.2. Правила layout

Каждый модуль получает парный файл:

```
server/modules/<domain>/
  <domain>.service.ts          — бизнес-логика, принимает repository
  <domain>.repository.ts       — ВСЕ Drizzle queries, возвращает domain types
  <domain>.types.ts            — domain types (если не в shared/types)
  <domain>-<sub>.service.ts    — sub-resource services (если есть)
  <domain>-<sub>.repository.ts — sub-resource repository
```

**Правила:**

- **Только `*.repository.ts` импортирует `drizzle-orm` и `~/server/db/schema`.** ESLint правило `no-restricted-imports` обновляется: для `server/modules/**/*.service.ts` эти импорты становятся ошибкой.
- **Repository не бросает HTTP-ошибки.** Возвращает `null` / `undefined` / пустой массив / доменную ошибку (см. [19](./19-error-handling.md)). HTTP-маппинг — задача handler'а.
- **Repository не принимает `H3Event`.** Чистая функция данных. Service может принимать event (для cookie side-effects) — но передаёт в repository только примитивы.
- **Service не знает о Drizzle.** Типы, которые service использует — domain types, не Drizzle inferred.

---

## 18.3. Сигнатуры repository

Repository-функции следуют одному из пяти паттернов:

| Паттерн | Сигнатура | Поведение |
|---|---|---|
| find-one | `findX(id): Promise<T \| null>` | Returns null если не найден |
| find-many | `listX(opts): Promise<T[]>` | Empty array если пусто |
| insert | `createX(input): Promise<T>` | Throws `DuplicateError` на unique violation |
| update-partial | `updateX(id, patch): Promise<T \| null>` | Null если id не найден |
| delete | `deleteX(id): Promise<boolean>` | True/false вместо void, чтобы handler знал про 404 |

**Никогда:**
- `getX(id): Promise<T>` бросая 404 внутри — это полпути между service и repository, худший вариант.
- `updateX(id, patch): Promise<void>` — handler не узнает был ли id валидным.

---

## 18.4. Пример до/после

### До (Wave 5 state)

```ts
// server/modules/clients/clients.service.ts
export async function deleteClient(id: number) {
  const db = useDb()

  const linkedById = await db
    .select({ id: projects.id, profile: projects.profile })
    .from(projects)
    .where(sql`${projects.profile}->>'client_id' = ${String(id)}`)

  for (const proj of linkedById) {
    const profile = (proj.profile || {}) as Record<string, unknown>
    delete profile.client_id
    await db
      .update(projects)
      .set({ profile: profile as unknown as Record<string, string> })
      .where(eq(projects.id, proj.id))
  }
  // ... ещё 20 строк
  await db.delete(clients).where(eq(clients.id, id))
}
```

Проблемы: бизнес-правило "очистить profile.client_id перед delete" смешано с SQL. Нельзя протестировать правило без БД.

### После (Wave 7 target)

```ts
// server/modules/clients/clients.repository.ts
import { eq, sql } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { clients, projects } from '~/server/db/schema'

export async function findProjectsReferencingClient(clientId: number) {
  const db = useDb()
  return db
    .select({ id: projects.id, profile: projects.profile })
    .from(projects)
    .where(sql`${projects.profile}->>'client_id' = ${String(clientId)}`)
}

export async function updateProjectProfile(
  projectId: number,
  profile: Record<string, unknown>,
) {
  const db = useDb()
  await db
    .update(projects)
    .set({ profile: profile as unknown as Record<string, string> })
    .where(eq(projects.id, projectId))
}

export async function deleteClientRow(clientId: number): Promise<boolean> {
  const db = useDb()
  const result = await db
    .delete(clients)
    .where(eq(clients.id, clientId))
    .returning({ id: clients.id })
  return result.length > 0
}
```

```ts
// server/modules/clients/clients.service.ts
import * as repo from './clients.repository'

/** Scrubs client_id references from every project profile, then deletes the client. */
export async function deleteClient(clientId: number): Promise<boolean> {
  const linkedProjects = await repo.findProjectsReferencingClient(clientId)

  for (const proj of linkedProjects) {
    const profile = (proj.profile || {}) as Record<string, unknown>
    delete profile.client_id
    await repo.updateProjectProfile(proj.id, profile)
  }

  return repo.deleteClientRow(clientId)
}
```

Теперь бизнес-правило (`delete profile.client_id`) тестируется как чистая функция. Repository функции тестируются против in-memory Postgres (или моков).

---

## 18.5. ESLint enforcement

В `eslint.config.mjs` добавляется override:

```js
{
  files: ['server/modules/**/*.service.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: [
          'drizzle-orm', 'drizzle-orm/*',
          '~/server/db', '~/server/db/index', '~/server/db/schema',
          '~/server/db/schema/**',
        ],
        message: 'services не должны обращаться к БД напрямую. Используй *.repository.ts.',
      }],
    }],
  },
},
```

Dual-impact: в момент включения все `*.service.ts` станут красными. Lint-ratchet зафиксирует baseline. Wave 7 = постепенно снижать baseline до нуля через per-domain split.

---

## 18.6. Порядок Wave 7 по доменам

Предлагаемая последовательность (от простого к сложному):

1. **documents** — 1 service, 7 функций. Идеальный первый.
2. **gallery** — 1 service + reorder.
3. **sellers**, **managers** — простые CRUD.
4. **clients** — CRUD + documents scoping + project linking.
5. **designers** — CRUD + designer-projects + aggregator.
6. **contractors** — 3 service файла, сложнее всего.
7. **admin-search**, **admin-notifications** — одиночные агрегаторы.
8. **auth** (admin/client/contractor) — + cookie side-effects через service, не repository.
9. **projects core + mutations** — не трогаем agg endpoints пока.
10. **projects partners/pages/work-status/extra-services/communications** — последними, многочисленные join'ы.

Каждый домен — один batch, один commit. Delta ≈ +1 repository file, service уменьшается на 30-50% в строках.

---

## 18.7. Что НЕ делаем в Wave 7

- **Не переписываем legacy `server/utils/**/*`** — это предмет отдельного cleanup wave.
- **Не трогаем messenger и services/communications-service** — там отдельная дорожная карта (Wave 8).
- **Не меняем public API signatures** — это pure refactor, handlers вызывают service так же.
- **Не внедряем ORM-агностичность.** Repository остаётся Drizzle-first. Абстракция за Drizzle — over-engineering для текущего размера проекта.

---

## 18.8. Definition of Done

Wave 7 считается завершённой когда:

1. Каждому `<domain>.service.ts` (и sub-service.ts) соответствует `<domain>.repository.ts`.
2. В `*.service.ts` нет импортов `drizzle-orm`, `~/server/db`, `~/server/db/schema*`.
3. ESLint-правило из 18.5 активно как `error`, baseline = 0.
4. Для каждого domain написано хотя бы по 1 unit-тесту service'а с мокнутым repository (как proof of testability).
5. Roadmap (`14-refactor-roadmap.md`) логирует batch на каждый перенесённый domain.
