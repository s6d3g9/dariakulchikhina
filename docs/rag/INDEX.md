# RAG Index — навигатор по документации проекта

> Этот файл читай ПЕРВЫМ. Он говорит какой файл открывать для каждой задачи.
> Проект: Nuxt 4 + Vue 3 + Tailwind 4 + Nuxt UI 3 + composables/useState + Drizzle + ioredis + H3 + Zod

---

## Быстрый маршрутизатор по задаче

| Задача | Читай |
|--------|-------|
| Общая карта репозитория, контуры main app / chat / messenger / services | [../ARCHITECTURE.md](../ARCHITECTURE.md) |
| Рефакторинг хардкода (цвет, шрифт, radius) | [TOKEN_MAP.md](TOKEN_MAP.md) → [REFACTOR_PATTERNS.md](REFACTOR_PATTERNS.md) |
| Что менять первым (приоритет файлов) | [COMPONENT_AUDIT.md](COMPONENT_AUDIT.md) |
| Написать `html.dark` правильно | [DARK_MODE.md](DARK_MODE.md) |
| Какие CSS-классы есть в проекте | [CLASS_DICTIONARY.md](CLASS_DICTIONARY.md) |
| Tailwind `@theme`, `@apply`, `@reference` | [TAILWIND_TOKENS.md](TAILWIND_TOKENS.md) |
| Nuxt UI CSS-переменные (`--ui-*`) | [TAILWIND_TOKENS.md](TAILWIND_TOKENS.md#7-nuxt-ui--css-variables) |
| Vue SFC CSS, `:deep()`, `v-bind` в CSS | [VUE_NUXT_GUIDE.md](VUE_NUXT_GUIDE.md) |
| Composables, `useXxx` паттерны | [VUE_NUXT_GUIDE.md](VUE_NUXT_GUIDE.md) |
| Pinia reference (если задача явно требует store) | [PINIA_STORES.md](PINIA_STORES.md) |
| API endpoint (H3 + Zod валидация) | [BACKEND_GUIDE.md](BACKEND_GUIDE.md) |
| Drizzle ORM (schema, select, insert) | [DRIZZLE_PATTERNS.md](DRIZZLE_PATTERNS.md) |
| Redis / кэш / сессии | [REDIS_PATTERNS.md](REDIS_PATTERNS.md) |
| Messenger product (`messenger/web`, `messenger/core`) | [../messenger/README.md](../messenger/README.md) |
| Messenger project-engine API | [../messenger/PROJECT_ENGINE_API.md](../messenger/PROJECT_ENGINE_API.md) |
| Standalone communications relay service | [../../services/communications-service/README.md](../../services/communications-service/README.md) |
| UI компоненты — полная спецификация | [../UI_INTERFACE.md](../UI_INTERFACE.md) ⚡ большой |
| UI правила — компактный чит-шит | [../UI_RULES.md](../UI_RULES.md) ✅ рекомендуется |
| UIDesignPanel — как работает редактор | [../DESIGN_EDITOR.md](../DESIGN_EDITOR.md) |

---

## RAG-файлы (docs/rag/) — краткое описание

### Рефакторинг CSS
| Файл | Строк | Содержание |
|------|-------|-----------|
| **TOKEN_MAP.md** | 160 | Таблицы замен: hex/rgba/px → `var(--ds-*)`. 7 разделов: фоны, текст, бордеры, акценты, radius, font-size, тени, отступы, шрифты |
| **REFACTOR_PATTERNS.md** | 384 | 13 паттернов БЫЛО→СТАЛО: карточка, кнопка, инпут, текст, чип, статус, dropdown, таблица, оверлей, анимация, тёмная тема, v-bind CSS |
| **COMPONENT_AUDIT.md** | 154 | Аудит 89 Vue-файлов: 🔴 критично (60+ HC), 🟡 требует работы, 🟢 почти готово, ✅ чисто |
| **DARK_MODE.md** | 194 | 8 правил тёмной темы, шаблон dark-ready компонента, антипаттерны |
| **CLASS_DICTIONARY.md** | 159 | Все готовые CSS-классы: `glass-card`, `glass-input`, `glass-chip`, `ws-status--*`, `a-btn-*` и др. |

### Технологии — Frontend
| Файл | Строк | Содержание |
|------|-------|-----------|
| **VUE_NUXT_GUIDE.md** | 272 | Vue 3: SFC CSS features, composables best practices, performance (v-memo/shallowRef), class/style bindings, Nuxt auto-imports, layouts, middleware, useFetch, runtime config |
| **TAILWIND_TOKENS.md** | 307 | Tailwind v4: `@theme` namespaces, `@reference` для Vue SFC, `--alpha()`, `--spacing()`, cascade layers; Nuxt UI: semantic colors, все `--ui-*` переменные, color mode |
| **PINIA_STORES.md** | 279 | Option vs Setup stores, storeToRefs, composing stores, `$patch`, `$subscribe`, правила SSR, типизация |

### Технологии — Backend
| Файл | Строк | Содержание |
|------|-------|-----------|
| **BACKEND_GUIDE.md** | 417 | H3: defineEventHandler, getQuery/getValidatedQuery, readBody/readValidatedBody, getRouterParam, createError, middleware, event.context; Zod: все типы, string/number/object/array/enum/union, coerce, transform, refine, parse/safeParse, z.infer |
| **DRIZZLE_PATTERNS.md** | 405 | pgTable schema, column types, relations, $inferSelect/$inferInsert, select/where/join/аggregation/distinct, relational queries (findMany/findFirst/with), insert+returning, upsert, update, delete, транзакции, drizzle-kit |
| **REDIS_PATTERNS.md** | 336 | ioredis connect, string/hash/list/set ops, JSON паттерн, pipeline, auto-pipelining, transactions, pub/sub, scanStream, streams, session store, cache-aside, rate limiter, key conventions |

---

## Документация (docs/) — для людей

| Файл | Строк | Назначение |
|------|-------|-----------|
| **UI_INTERFACE.md** | 868 | Полная спецификация UI: все экраны, компоненты, состояния, правила UX. Source of truth для дизайна |
| **UI_RULES.md** | 200 | Компактный чит-шит для AI: топ-20 правил, что нельзя делать, design system tokens, dark mode |
| **DESIGN_EDITOR.md** | 635 | UIDesignPanel (3922 строки): все 100+ настроек, как менять тему runtime, структура useDesignSystem |

---

## Архитектура проекта

```
app/
  components/     ← Vue компоненты основной платформы
  pages/          ← Nuxt pages (admin, client, contractor, project, chat, auth)
    admin/        ← Панель администратора
    client/       ← Кабинет клиента
    contractor/   ← Кабинет подрядчика
    project/      ← Проектный портал
    chat/         ← Встроенный standalone chat
  composables/    ← Основной state/control layer main app
  assets/css/
    main.css      ← глобальный primitive-layer, design tokens, transitions
server/
  api/            ← H3 endpoints + chat/communications relay
  db/
    schema.ts     ← Drizzle ORM schema
    migrations/   ← SQL миграции
  middleware/     ← canonical host, security headers, rate-limit, body-size, csrf
  plugins/        ← cache-policy, csp-nonce, error-sanitizer, ollama-warmup
shared/
  types/          ← contracts: project, navigation, communications, design-mode, etc.
  constants/      ← admin-navigation, pages, design-modes, presets
  utils/          ← project-control/status/communications helpers
messenger/
  web/            ← отдельный Nuxt/Vuetify messenger client
  core/           ← отдельный Fastify realtime backend
services/
  communications-service/ ← zero-knowledge relay/signaling service
docs/messenger/
  *.md            ← messenger/product + project-engine docs
```

## Важное уточнение по state-слою

- В основной платформе state сейчас живет в `app/composables/**` и `useState()`, а не в `app/stores/`.
- `messenger/web` — отдельный client-only продукт со своим state в `messenger/web/app/composables/**`.

## Критические переменные проекта

```
var(--glass-bg)       ← фон карточек (адаптируется к теме)
var(--glass-text)     ← основной текст (адаптируется к теме)
var(--glass-page-bg)  ← фон страницы
var(--ds-accent)      ← акцентный цвет (синий)
var(--ds-success)     ← зелёный
var(--ds-error)       ← красный
var(--ds-warning)     ← жёлтый/оранжевый
var(--card-radius)    ← радиус карточек
var(--ds-shadow)      ← тень по умолчанию
var(--ds-text-xs)     ← 0.694rem
var(--ds-text-sm)     ← 0.833rem
var(--ds-text-base)   ← 1rem
```

## Текущий приоритет работ

**Фаза: Рефакторинг хардкода** — 1 548 вхождений (955 hex + 593 rgba)

Топ файлов для исправления:
1. `app/components/AdminDocumentEditor.vue` — 153 вхождения
2. `app/components/AdminGallery.vue` — 90
3. `app/components/AdminConstructionPlan.vue` — 78
4. `app/components/AdminProjectStatusBar.vue` — 67
5. `app/components/MaterialPropertyPanel.vue` — 61
6. `app/components/ClientExtraServices.vue` — 60
7. `app/components/AdminExtraServices.vue` — 55
8. `app/components/ClientInitiation.vue` — 48
9. `app/components/MaterialPropertyEditor.vue` — 46
10. `app/components/AdminWorkStatus.vue` — 46
