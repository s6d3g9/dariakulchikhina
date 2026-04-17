# 17. Coding Standards: файлы, имена, LLM-friendly структура

Этот документ фиксирует правила, которые отсутствовали в v5.0-v5.3 и обнаружились при росте репозитория: размер файлов, конвенции имён, предсказуемость структуры и совместимость со смешанной авторизацией «человек + LLM-агент».

Все правила ниже имеют статус **enforceable**: либо проверяются ESLint (`eslint.config.mjs`), либо доставаемы из git/файловой системы для CI-проверок. Правила, ещё не подключённые в CI, помечены как `[planned]`.

Связанные документы:
- `CLAUDE.md` в корне репозитория — выжимка для агентов.
- `eslint.config.mjs` — исполняемая версия правил.
- [03. Backend layer](./03-backend-layer.md) и [04. Frontend layer](./04-frontend-layer.md) — контекст слоёв.

---

## 17.1. Размер и сложность

| Метрика | Порог (error) | Порог (warn) | Enforcement |
|---|---|---|---|
| Длина файла | 500 строк | 300 | ESLint `max-lines` |
| Длина функции | 120 строк | 60 | ESLint `max-lines-per-function` |
| Cyclomatic | 15 | 10 | ESLint `complexity` |
| Вложенность | 4 | 3 | ESLint `max-depth` |
| Параметров функции | 5 | 4 | ESLint `max-params` |
| Длина строки | — | 120 | Prettier (planned) |

**Временный режим:** во время волнового рефакторинга все бюджеты стоят как `warn`, а не `error`. После Wave 4 (слайсинг гигантов) ESLint нужно переключить на `error` для этих правил. Сейчас в репозитории есть файлы в 8 600 строк (`app/components/UIDesignPanel.vue`), которые блокировали бы любой коммит.

**Что делать при превышении:**

- Файл > 500 строк: разбить на `<name>/index.ts`, `<name>/<sub-area>.ts` по принципу cohesion. Если это Vue-компонент — вынести секции в дочерние компоненты через props/slots, или разбить логику в composable.
- Функция > 120 строк: извлечь блоки в private-хелперы. Имя хелпера должно выражать «что» делает блок, а не «как» его используют.
- Cyclomatic > 15: обычно означает либо длинный `switch`/цепочку `if-else` (вынести в dispatch-map), либо смешанные ответственности (разделить функцию).

---

## 17.2. Naming conventions

### 17.2.1. Файлы

| Тип | Convention | Пример |
|---|---|---|
| Vue компонент | `PascalCase.vue` | `AdminEntityHeader.vue` |
| Composable | `camelCase.ts`, начинается с `use` | `useAdminNav.ts` |
| TS модуль (frontend) | `kebab-case.ts` | `project-control.ts` |
| TS модуль (server/modules) | `kebab-case.service.ts` / `.repository.ts` | `projects.service.ts` |
| API handler | `<resource>.<method>.ts` | `login.post.ts` |
| Drizzle schema per-entity | `kebab-case.ts` под `server/db/schema/` | `users.ts`, `projects.ts` |
| Zod schema | `<name>.schema.ts` в `shared/schemas/` | `project.schema.ts` |
| Тип в `shared/types/**` | `<domain>.ts`, PascalCase экспорты | `Project`, `ProjectStatus` |
| Script | `kebab-case.mjs`/`.sh` | `deploy-safe.sh`, `migrate-designer-catalog-keys.mjs` |
| Конфиг | `<name>.config.<ts|cjs|mjs>` | `ecosystem.config.cjs` |

### 17.2.2. Symbols

| Что | Convention |
|---|---|
| TS переменная, функция | `camelCase` |
| TS класс, тип, interface, enum | `PascalCase` |
| TS константа (compile-time) | `SCREAMING_SNAKE_CASE` |
| CSS custom property | `--kebab-case` |
| Vue composable возвращаемые поля | `camelCase` |
| Pinia store | `useXxxStore`, id = kebab-case |
| Redis key | `<domain>:<resource>[:<id>]` — см. 17.2.3 |
| DB table | `snake_case`, plural: `users`, `project_stages` |
| DB column | `snake_case`: `created_at`, `user_id` |
| DB FK constraint | `<table>_<column>_fkey` |
| DB index | `<table>_<column>_idx` |

### 17.2.3. Redis keys

Единый формат: `<domain>:<resource>[:<id>][:<qualifier>]`.

| Ключ | Назначение |
|---|---|
| `ws_ticket:<token>` | Одноразовый токен WS handshake (TTL 30s) |
| `session:<sessionId>` | Серверная сессия (TTL = cookie TTL) |
| `entity_updates` (channel) | Pub/Sub канал для рассинхрона состояний |
| `chat` (channel) | Pub/Sub канал новых сообщений мессенджера |
| `cache:design-system:<tenantId>` | SSR кэш тем |
| `ratelimit:<endpoint>:<userId>` | Rate-limit окна |

**Правила:**

- Только одно двоеточие в «префиксе домена», остальные разделители — часть ID.
- Никогда не использовать `<owner>-<something>` в ключах — двоеточие обязательно как разделитель.
- TTL выставляется при `SET` сразу. Ключи без TTL — только для каналов Pub/Sub и редких глобальных флагов.
- Префиксы каналов Pub/Sub не содержат двоеточий (чтобы Redis Cluster распределял их равномерно): `chat`, `entity_updates`.

---

## 17.3. Module structure (DDD-lite)

Каждый модуль под `server/modules/<domain>/` имеет предсказуемую раскладку:

```
server/modules/<domain>/
├── index.ts                      # публичный API: re-export нужных сервисов/типов
├── <domain>.service.ts           # бизнес-логика
├── <domain>.repository.ts        # Drizzle-доступ (единственное место, где импортируется drizzle-orm и db/schema)
├── <domain>-<sub-area>.service.ts  # опционально: суб-сервисы (`auth-session.service.ts`, `projects-status.service.ts`)
├── <domain>-communications-publisher.ts # опционально: Redis Pub/Sub publisher
├── <domain>.schema.ts            # опционально: Zod-схемы, специфичные для модуля (контракты между api/ и modules/ — в shared)
└── __tests__/                    # [planned] unit-tests
```

**Правила:**

- `index.ts` экспортирует только то, что нужно другим модулям или `server/api/**`. Никаких wildcard re-export'ов в production-коде.
- `repository.ts` — единственное место, где разрешён `import from 'drizzle-orm'` в backend. ESLint уже запрещает это в `server/api/**`; планируется расширить запрет и на `server/modules/**/*.service.ts`.
- Модуль не импортирует другие модули напрямую (нет `import from '../projects/projects.service'`). Для межмодульного взаимодействия — события через Redis или явный DTO через `shared/types/**`.

---

## 17.4. FSD slice structure (frontend)

Каждый slice под `app/entities/<name>/`, `app/features/<name>/`, `app/widgets/<name>/` имеет стандартную раскладку:

```
app/<layer>/<name>/
├── ui/                 # Vue компоненты
│   └── <Name>.vue
├── model/              # composables, сторы, локальное состояние
│   └── use<Name>.ts
├── api/                # опционально: HTTP/WS клиенты, специфичные для слайса
├── lib/                # опционально: pure-helpers без состояния
└── index.ts            # публичный API слайса
```

**Правила:**

- Внешний потребитель импортирует ТОЛЬКО через `index.ts` слайса — никаких «глубоких импортов» вида `@/entities/project/ui/ProjectCard.vue`. Это упрощает рефакторинг внутренностей слайса.
- FSD direction: `pages → widgets → features → entities → shared/core`. Обратные импорты запрещены (ESLint: `no-restricted-imports`). См. `eslint.config.mjs`.
- Vue-компоненты не содержат data-fetching напрямую. Запрос делается через composable из `model/`.

---

## 17.5. Shared contracts

`shared/` — единственное место для DTO, которые пересекают границу процесса или слоя.

```
shared/
├── types/              # TS-типы (compile-time)
│   └── <domain>/
├── schemas/            # Zod-схемы (runtime validation)
│   └── <domain>/
├── constants/          # enum-like константы
│   └── <domain>/
└── utils/              # pure функции без зависимостей от runtime
```

**Правила:**

- `shared/**` не импортирует из `app/`, `server/`, `messenger/`, `services/`, не импортирует runtime-драйверы (`drizzle-orm`, `postgres`, `ioredis`, `h3`, `nuxt`). Enforced by ESLint.
- Для каждого DTO, валидируемого Zod, соблюдается пара: `shared/schemas/<domain>/<name>.schema.ts` экспортирует `<Name>Schema`, `shared/types/<domain>/<name>.ts` экспортирует `type <Name> = z.infer<typeof <Name>Schema>`. Никаких расхождений между Zod и TS.
- Любое изменение публичного DTO (добавление обязательного поля, изменение типа существующего поля, удаление поля) — ломающее изменение. См. 17.6.

---

## 17.6. DTO versioning

**Правило:** `shared/types/**` меняется только additively в рамках одного деплоя.

| Изменение | Категория | Процедура |
|---|---|---|
| Добавление optional поля | Additive | Безопасно. Один коммит. |
| Добавление required поля | Breaking | Двухволновая миграция: (1) добавить как optional, выкатить все рантаймы; (2) начать записывать, потом сделать required. |
| Переименование поля | Breaking | Добавить новое поле → дублировать запись в старое и новое → мигрировать читателей → удалить старое через 1 релиз. |
| Удаление поля | Breaking | Пометить через `@deprecated` JSDoc, убрать читателей, только потом удалить схему. |
| Изменение типа поля | Breaking | Добавить новое поле с другим именем, мигрировать, удалить старое. |

**Enforcement:** `[planned]` — `shared/CHANGELOG.md` + CI-проверка что изменения `shared/types/**` сопровождаются записью в CHANGELOG и пометкой `additive` / `breaking`.

---

## 17.7. LLM-friendly authorship

Правила ниже повышают вероятность того, что LLM-агенты (включая Claude Code, Copilot) надёжно работают с кодом, не ломая ссылок между файлами.

### 17.7.1. Именованные экспорты

- **`.ts` файлы вне Nuxt-plumbing (`middleware/`, `plugins/`, `pages/`, `layouts/`, `*.config.ts`, `*.options.ts`, `server/api/**`, `scripts/**`) используют только named exports.** Это даёт стабильные идентификаторы `<path>::<symbol>` для reference-by-name в промптах и агентских операциях.
- `.vue` файлы — default export через `<script setup>` (это контракт Vue), но именование компонента должно совпадать с именем файла (`AdminEntityHeader.vue` → компонент называется `AdminEntityHeader`).
- Enforced: ESLint `no-restricted-syntax` блокирует `ExportDefaultDeclaration` в обычных `.ts`. Overrides для framework-contract путей перечислены в `eslint.config.mjs`.

### 17.7.2. Стабильная структура файла

Внутри каждого `.ts`/`.vue` блока секции идут в фиксированном порядке, разделённые одной пустой строкой:

```ts
// 1. File-level JSDoc (если описывает назначение)

// 2. Imports — сгруппированы: внешние → @/shared → @/ (внутренние) → относительные
import { z } from 'zod'
import type { Project } from '~/shared/types/project'
import { listProjects } from '~/server/modules/projects/projects.service'

// 3. Types и constants, уникальные для этого файла
const DEFAULT_LIMIT = 50
type ListQuery = { limit?: number }

// 4. Публичные экспорты (main entry point)
export async function getRecentProjects(q: ListQuery = {}) { /* ... */ }

// 5. Private helpers (вниз от main entry)
function buildWhere(q: ListQuery) { /* ... */ }
```

Для Vue SFC:

```vue
<script setup lang="ts">
// Порядок внутри <script setup>:
// 1. Imports
// 2. defineProps / defineEmits / defineModel / defineSlots
// 3. Composables (useRoute, useFetch, …)
// 4. Reactive state (ref, reactive, computed)
// 5. Watches и lifecycle (watch, onMounted, …)
// 6. Methods (именованные функции)
// 7. defineExpose (если нужен)
</script>

<template>...</template>

<style scoped>...</style>
```

### 17.7.3. JSDoc на публичных границах

Обязательно:

- `export function`, `export const = () => {}` — однострочный `/** ... */` с назначением.
- Публичный DTO в `shared/types/**` — JSDoc на каждом поле, если имя не self-explanatory.
- `server/api/**` handler — JSDoc на default export, описывающий URL, method, что принимает, что возвращает.

Необязательно (скорее шум):

- Внутренние хелперы.
- Очевидные getter/setter.
- Типы, выводимые из контекста (`z.infer<typeof ...>` — Zod-схема сама документация).

### 17.7.4. Отсутствие «магии»

- Нет namespace re-exports вида `export * from './everything'` в production-коде — агенту невозможно отследить, откуда приходит символ.
- Нет `import(...)` кроме строго dynamic-loading сценариев (lazy routes, code splitting) — статические импорты читабельны и машиной, и человеком.
- Нет мутаций prop'ов в Vue (ESLint `vue/no-mutating-props`). Изменение состояния — через emit.

---

## 17.8. Git hygiene

- Commit message: `<type>(<scope>): <subject>`. Типы: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`. Scope — имя модуля/слайса. Subject в imperative, lower case, без точки.
- Один commit = один логический batch. Рефакторинговый batch — одна волна из 14-roadmap. Bug fix — один баг.
- Pre-commit hook (`.githooks/pre-commit`) обязан пройти: `docs:v5:verify` + `lint:ratchet`. Запрещено `--no-verify` (deny-list в `.claude/settings.json`).
- Post-commit авто-push работает только на ветках с upstream (`main`, `refactor/architecture-v5`). Scratch-ветки (`claude/*`, `wip/*`) остаются локальными.

---

## 17.9. Что делать, когда правила мешают

Правила выше — норма. Исключения возможны, но должны быть видимыми:

1. **Одноразовые скрипты** (`scripts/migrate-*`, одноразовые data-fixes) — размер/сложность не считается. В ESLint `scripts/**` уже релаксирован.
2. **Framework-контракт** (Nuxt middleware/plugins/config) — default export нужен фреймворку. ESLint освобождает эти пути.
3. **Legacy** — если файл уже нарушает правило (`max-lines` превышен), это не блокирует редактирование через lint-ratchet: `.lint-baseline.json` хранит per-file счёт ошибок. Регрессия блокируется, существующий долг — нет.
4. **Осознанное исключение** — `// eslint-disable-next-line <rule> -- <reason>` с обязательным комментарием-причиной. Бездумные `eslint-disable` без комментария нужно править в ревью.

---

## 17.10. Changelog правил

| Дата | Изменение |
|---|---|
| 2026-04-17 | Документ создан. Правила 17.1, 17.2.1, 17.2.2, 17.3, 17.4, 17.5, 17.7 подключены к ESLint. 17.6 и `no-default-export` помечены `[planned]`. |
| 2026-04-17 | 17.7.1 (no-default-export для обычных `.ts`) включён как ESLint error через `no-restricted-syntax`. Framework-contract пути (`*.config.{ts,cjs,mjs}`, `*.options.ts`, Nuxt middleware/plugins/pages/layouts, `server/api/**`, `server/middleware/**`, `server/plugins/**`, `scripts/**`, все `.vue`) остаются c разрешённым default export. |
