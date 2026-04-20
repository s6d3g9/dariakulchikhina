# 28. Code Excellence — эволюция до идеала

Date: 2026-04-20
Scope: после того как v5 матрицы закрыты, следующий шаг — унификация паттернов внутри модулей, удаление дубликатов, создание extension points, за которыми следующая фича ложится одним скелетом без риска регрессии.

## 1. Текущая картина (анализ кода)

| Модуль | Файлов | LOC | repo | svc | types | tests |
|---|---|---|---|---|---|---|
| projects | 27 | 5488 | 10 | 18 | **0** | **0** |
| auth | 9 | 1018 | 1 | 8 | **0** | 1 |
| designers | 4 | 953 | 2 | 2 | **0** | **0** |
| contractors | 6 | 885 | 3 | 3 | **0** | **0** |
| communications | 4 | 658 | 1 | 3 | **0** | **0** |
| chat | 3 | 607 | **0** | 3 | **0** | **0** |
| clients | 2 | 443 | 1 | 1 | **0** | 1 |
| ai | 6 | 399 | 2 | 3 | **0** | 1 |
| documents | 2 | 369 | 1 | 1 | **0** | **0** |
| admin | 4 | 290 | 2 | 2 | **0** | **0** |
| gallery | 2 | 233 | 1 | 1 | **0** | **0** |
| sellers | 2 | 210 | 1 | 1 | **0** | **0** |
| managers | 2 | 160 | 1 | 1 | **0** | **0** |
| agent-registry | 3 | 153 | 1 | 2 | **0** | **0** |
| uploads | 2 | 111 | **0** | 2 | **0** | **0** |
| admin-settings | 2 | 91 | 1 | 1 | **0** | **0** |

**Проблемы:**

1. **Нет единого skeleton.** `admin-settings` = 2 файла, `projects` = 27 файлов без единых подпапок. Крупные модули разрослись плоско, в мелких нет нижнего кирпича. При добавлении новой фичи непонятно, куда класть.
2. **`*.types.ts` отсутствуют у всех 17 модулей.** Zod-схемы и TS-интерфейсы пишутся прямо в service.ts → кочуют между файлами → дубликаты в api + модуле + shared.
3. **Тесты только у 3 модулей.** Остальные 14 в серой зоне — любое изменение = регрессия-рулетка.
4. **Нет унифицированного error-taxonomy.** `throw new Error("CLIENT_NOT_FOUND")` vs `throw createError({statusCode:404})` vs просто `reply.code(404)` — три разных стиля. Маппинг на HTTP происходит в handler, но handler не знает, что сервис бросит.
5. **Zod дублируется (18 mod / 13 api / 10 shared).** Одни и те же `UpdateClientSchema` объявлены в нескольких местах.
6. **Нет типизированного route-контракта.** Api handler сам парсит params + body + query, нет `defineEndpoint({input, output, handler})` helper'а.
7. **Нет barrel export'ов** у модулей. Import из глубины `~/server/modules/projects/project-extra-services.service` — длинный; нет общего entry point'а.
8. **FSD слои в `app/`** без public API: любой widget может импортировать из внутренностей feature/entity.
9. **Нет шаблона нового модуля.** Каждый новый домен проектируется с нуля.

## 2. Target — Unified Module Skeleton

Каждый `server/modules/<domain>/` идёт по ОДНОМУ шаблону:

```
server/modules/<domain>/
├── index.ts                 ← barrel: export public API only
├── <domain>.types.ts        ← zod schemas + TS types (single source)
├── <domain>.repository.ts   ← pure Drizzle queries (no logic)
├── <domain>.service.ts      ← orchestration + validation + business rules
├── <domain>.errors.ts       ← domain-specific AppError subclasses (optional)
└── __tests__/
    ├── <domain>.service.test.ts
    └── <domain>.repository.smoke.ts
```

Когда модуль растёт > 600 LOC — дробим сервис на tactical subfiles: `project-pages.service.ts`, `project-relations.service.ts` — но ВСЕ они реэкспортятся через `index.ts` и пользуются общим `projects.types.ts`.

## 3. Cross-cutting layers

### 3.1 Error taxonomy (`shared/errors/`)

```ts
// shared/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public code: string,             // stable, machine-readable
    public statusCode: number,       // HTTP mapping
    message: string,
    public cause?: unknown,
  ) { super(message) }
}

export class NotFoundError     extends AppError { constructor(resource: string, id?: string) { super(`${resource.toUpperCase()}_NOT_FOUND`, 404, `${resource} not found${id ? `: ${id}` : ''}`) } }
export class ForbiddenError    extends AppError { constructor(reason='FORBIDDEN') { super(reason, 403, reason) } }
export class ValidationError   extends AppError { constructor(issues: unknown) { super('VALIDATION_FAILED', 400, 'validation failed'); this.cause = issues } }
export class ConflictError     extends AppError { constructor(reason='CONFLICT') { super(reason, 409, reason) } }
export class UpstreamError     extends AppError { constructor(service: string, cause?: unknown) { super('UPSTREAM_FAILED', 502, `${service} failed`, cause) } }
```

Сервис-слой бросает эти классы. Handler мэппит в HTTP через единую утилиту.

### 3.2 Thin-handler helper (`server/utils/define-endpoint.ts`)

```ts
export function defineEndpoint<I, O>(opts: {
  input?: ZodSchema<I>
  output?: ZodSchema<O>
  auth?: 'required' | 'optional' | 'none'
  handler: (ctx: EndpointContext<I>) => Promise<O>
}): EventHandler {
  return defineEventHandler(async (event) => {
    try {
      const session = opts.auth === 'required' ? await requireAuth(event) : await tryAuth(event)
      const rawBody = opts.input ? await readBody(event) : undefined
      const input = opts.input ? opts.input.parse(rawBody) : undefined as I
      const result = await opts.handler({ event, session, input })
      return opts.output ? opts.output.parse(result) : result
    } catch (err) {
      if (err instanceof AppError) throw createError({ statusCode: err.statusCode, statusMessage: err.code, data: { code: err.code, cause: err.cause } })
      if (err instanceof ZodError) throw createError({ statusCode: 400, statusMessage: 'VALIDATION_FAILED', data: { issues: err.issues } })
      throw err
    }
  })
}
```

Handler становится 5-10 строчек max:
```ts
export default defineEndpoint({
  input: UpdateClientSchema,
  auth: 'required',
  handler: ({ session, input }) => clientsService.update(session.user.id, params.id, input),
})
```

### 3.3 Schema → Type coupling

Drizzle 0.41 уже даёт `$inferSelect` / `$inferInsert`. Правило: все DTO в `<domain>.types.ts` выводятся через `z.infer<typeof Schema>` (для Zod) или `typeof table.$inferSelect` (для DB rows). Нигде не писать `interface ClientRow { ... }` параллельно таблице.

### 3.4 Feature flags (`shared/feature-flags.ts`)

Один файл с enum + типизированная функция `isFeatureEnabled(flag)`. GrowthBook-backed но с локальным fallback.

## 4. Frontend (app/) — FSD с public API

Каждый entity/feature/widget получает `index.ts` как **единственный** export point. ESLint rule: импорт глубже `<layer>/<slice>/index.ts` запрещён (кроме внутри того же slice).

```
app/features/project-create/
├── index.ts              ← export { ProjectCreateDialog, useProjectCreate }
├── ui/ProjectCreateDialog.vue
├── model/useProjectCreate.ts
└── model/schemas.ts      ← internal, не экспортится
```

## 5. Ideal new-feature add-flow

После эволюции добавление фичи "Заметки клиента" превращается в 5 шагов:

1. `pnpm gen:module client-notes` → создаётся скелет из шаблона.
2. Заполняешь `.types.ts` (zod + DTO).
3. Пишешь `.repository.ts` (Drizzle queries).
4. Пишешь `.service.ts` (логика, валидация, AppError).
5. Один handler файл в `server/api/client-notes/*.ts` через `defineEndpoint`.

Тесты идут шаблоном. Линт валит если `.types.ts` пустой. CI автотест проверяет что service не импортит drizzle напрямую.

## 6. Implementation waves

| # | Wave | kind | blocker? |
|---|---|---|---|
| 1 | shared/errors/ taxonomy | backend-module | no |
| 2 | server/utils/define-endpoint.ts | backend-api | #1 |
| 3 | Module generator `scripts/gen-module.mjs` + `docs/task-templates/new-module.md` | docs | no |
| 4 | Adopt skeleton in 5 smallest modules (sellers, managers, gallery, admin-settings, agent-registry) | backend-module | #1-#2 |
| 5 | Adopt skeleton in medium modules (documents, uploads, clients, admin, communications) | backend-module | #4 |
| 6 | Adopt skeleton in large modules (contractors, designers, chat, ai, auth) | backend-module | #5 |
| 7 | Adopt skeleton in mega module (projects, 27→~12 files via grouping) | backend-module | #6 |
| 8 | Refactor 2-3 representative API handlers to `defineEndpoint` — validate UX | backend-api | #2 |
| 9 | Mass-migrate API handlers to `defineEndpoint` | backend-api | #8 |
| 10 | FSD public-API pass: add `index.ts` barrels + ESLint rule | frontend-ui | no |
| 11 | Test scaffolding for modules without tests — one `.service.test.ts` per module | tests | #1-#7 |
| 12 | Final audit: all modules match skeleton, all handlers ≤15 LOC | docs | #11 |

Всего 12 волн. Waves 1-3 разблокируют остальные. Waves 4-7 — bulk конвейер, пригодны для pipeline-воркеров.

## 7. Red lines during evolution

- Нельзя менять API-контракты (thin-wrap осталась thin).
- Нельзя менять DB-схему.
- Нельзя ломать существующие тесты.
- Messenger/services — продолжают быть frozen.
- Каждая волна — свой PR-ветка, свой merge в main, свой verify.

## 8. Success metrics

- Каждый из 17 модулей имеет `index.ts` + `.types.ts` + `.service.ts` + как минимум 1 `.test.ts`.
- 100% API handlers используют `defineEndpoint`.
- ESLint rule blocks deep imports (ни одного violation в baseline).
- Новый модуль через generator за < 2 минут.
- `pnpm lint:errors` продолжает быть 0.
- Code coverage модулей >= 60%.

## 9. Что остаётся за скобками

- Performance optimization (отдельная инициатива).
- Observability (трассировка запросов) — после того как defineEndpoint появится.
- i18n для error codes — уже есть стабильные коды, локализация — позже.
- Deploy automation — независимая тема.
