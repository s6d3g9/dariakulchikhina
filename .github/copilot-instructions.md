# GitHub Copilot Instructions — dariakulchikhina

## Продуктовые контуры

В репозитории живут четыре связанных, но разных контура. Не смешивай их без прямой интеграционной задачи.

1. **Основная Nuxt-платформа** — `app/`, `server/`, `shared/`.
   CRM/ERP для дизайн-студии: admin, client, contractor, project portal, документы, галерея, roadmap, project control.
2. **Встроенный standalone chat / project communications** — `app/pages/chat/**`, `server/api/chat/**`, `server/utils/communications.ts`, `server/utils/project-communications-relay.ts`.
   Это не `messenger/web`, а отдельный чатовый контур внутри основного приложения.
3. **Отдельный Messenger-продукт** — `messenger/web` + `messenger/core`.
   Самостоятельный consumer-style мессенджер с M3/Vuetify UI, realtime, calls, agents и project-engine.
4. **Communications Service** — `services/communications-service/`.
   Отдельный zero-knowledge relay/signaling сервис для комнат, ciphertext сообщений, key bundles и SSE/WebRTC signaling.

## Стек по контурам

### Основная платформа
- **Nuxt 4** + **Vue 3** SFC (`<script setup>`)
- **TypeScript** везде
- **Tailwind 4** + **Nuxt UI 3**
- **Drizzle ORM** + **PostgreSQL** (`server/db/`)
- **H3 / Nitro** (`server/api/**`)
- **Zod** для серверной валидации
- **ioredis** для rate-limit, кэша и сессионных сценариев
- **Ollama / Gemma** (`server/utils/gemma.ts`)

### State слой основной платформы
- `app/composables/**` + `useState()` — основной способ держать состояние.
- `@pinia/nuxt` подключен, но `app/stores/` сейчас отсутствует. Не вводить Pinia-store в main app без явной задачи.

### Messenger Web
- **Nuxt 4**, `ssr: false`, отдельный client-only shell
- **Vuetify 4** + **MDI** + mobile-first M3 UI
- `messenger/web/app/composables/**` + `useState()` для section/call/chat state
- runtime base URL: `/messenger/` в production, `/` в local preview

### Messenger Core
- **Node.js 22+**
- **Fastify 5** + **WebSocket** + **multipart** + static uploads
- **Zod** для route payload/schema parsing
- file-backed store модули в `messenger/core/src/*-store.ts`
- **LiveKit** для call/incoming-call integration
- опциональные AI/transcription backends через env/config

### Communications Service
- **Node.js 22+** HTTP service
- optional **PostgreSQL** persistence через `COMMUNICATIONS_DATABASE_URL`
- in-memory fallback, если БД не задана
- HMAC Bearer tokens, SSE fan-out, signaling relay

## Роли и маршруты основной платформы

| Контур | Canonical login | Legacy alias / redirect | Основные маршруты | Layout / guard |
|---|---|---|---|---|
| Admin / designer | `/login?role=admin` | `/admin/login` | `/admin/**`, `/admin/projects/[slug]` | `admin.vue`, `admin.ts`, `admin-project-canonical.ts` |
| Client | `/login?role=client` | `/client/login`, `/project/login` | `/client/[slug]`, `/project/[slug]` | default layout, `client.ts` |
| Contractor | `/login?role=contractor` | `/contractor/login` | `/contractor/[id]` | `contractor.vue`, `contractor.ts` |
| Standalone chat in main app | `/chat/login` | — | `/chat`, `/chat/register` | own auth shell via `server/api/chat/**` |

Важно:
- root auth-страницы `login.vue`, `register.vue`, `recover.vue` — канонические.
- role-specific pages вроде `/admin/login` и `/client/login` сейчас в основном редиректят в единый auth-flow.
- `admin.ts` допускает `admin` **и** `designer`.

## Структура репозитория

```text
app/
  assets/css/              — main.css, page transitions, primitive-layer
  components/              — admin/client/contractor/ui components
  composables/             — основной state/control layer main app
  layouts/                 — admin.vue, contractor.vue, default.vue
  middleware/              — admin.ts, client.ts, contractor.ts, admin-project-canonical.ts
  pages/                   — admin/, client/, contractor/, project/, chat/, auth pages
  plugins/                 — client plugins main app
server/
  api/                     — admin/auth/projects/chat/communications endpoints
  db/                      — schema.ts, index.ts, migrations/
  middleware/              — canonical host, security headers, rate-limit, body-size, csrf
  plugins/                 — cache-policy, csp-nonce, error-sanitizer, ollama-warmup
  utils/                   — auth/body/query/communications/security/RAG helpers
shared/
  types/                   — zod + TS contracts: project, navigation, communications, design-mode, etc.
  constants/               — admin-navigation, pages, design-modes, presets, profile-fields
  utils/                   — project-control, communications E2EE, status maps, work-status
messenger/
  web/                     — standalone Nuxt/Vuetify messenger UI
  core/                    — standalone Fastify realtime backend
services/
  communications-service/  — separate relay/signaling service
docs/
  rag/                     — core main-app docs index
  messenger/               — messenger/product docs
  UI_RULES.md              — main-app UI guide
  ARCHITECTURE.md          — system overview
scripts/
  deploy-safe.sh           — root deploy
  export-messenger-standalone.sh
  restore-last-snapshot.sh
  migrate-*.mjs / seed-*.mjs
```

## Main App UI и дизайн-система

- Always-on UI манифест для основной платформы: `.github/AGENTS.md`.
- Практические правила для `app/**`: `.github/instructions/ui.instructions.md`.
- Главные shared contracts:
  - `app/composables/useDesignSystem.ts`
  - `app/composables/useUITheme.ts`
  - `shared/constants/design-modes.ts`
  - `shared/constants/admin-navigation.ts`
  - `shared/types/navigation.ts`
- `useAdminNav.ts` + `shared/constants/admin-navigation.ts` — канонический navigation source of truth.

## Messenger UI

- `messenger/web` не подчиняется default brutalist main-app shell.
- Для messenger сначала читать:
  1. `.github/instructions/messenger.instructions.md`
  2. `.github/instructions/messenger-core.instructions.md` при работе с `messenger/core`
  3. `.github/instructions/m3-ui.instructions.md`
  4. `.github/instructions/menu-navigation.instructions.md`
- Не переносить в `messenger/web` main-app классы `.glass-*`, `ent-*`, `cab-*`, если нет прямой integration задачи.

## Серверные правила

- Query в main app: только `safeGetQuery(event)` из `server/utils/query.ts`.
- Body в main app: только `readValidatedNodeBody(event, Schema)` из `server/utils/body.ts`.
- Auth helpers брать из `server/utils/auth.ts`: `requireAdmin`, `requireAdminOrClient`, `requireAdminOrContractor`, `requireChatSession`, `get*Session`.
- Project communications идут через relay helpers, а не прямыми ad-hoc fetch из клиента.
- `services/communications-service` и `messenger/core` не являются частью Nitro API; это отдельные runtimes.

## Кодовые правила

- Не добавлять `console.log` в production код.
- Серверные входные данные валидировать через Zod.
- Не использовать `getQuery()` и `readBody()` напрямую в main app server code.
- В main app UI не использовать Tailwind-классы напрямую, если задачу можно выразить через существующие глобальные примитивы и contracts.
- Для dark mode в main app использовать `html.dark`, а не `@media (prefers-color-scheme: dark)`.
- Интерфейсные строки в основной платформе и messenger держать на русском, если задача не про локализацию.
- Использовать локальные font stacks; не возвращать внешние Google Fonts.

## Deploy

- Root production deploy: `pnpm deploy:safe:prod` или `bash scripts/deploy-safe.sh`.
- Сервер: `152.53.176.165`, пользователь `admin2`, SSH alias `daria-deploy`, путь `/opt/daria-nuxt`, PM2 app `daria-nuxt`.
- Messenger standalone export: `pnpm messenger:export:standalone`, PM2 configs лежат в `messenger/`.

## ПРАВИЛО ДЕПЛОЯ

Перед любым root deploy Copilot обязан:
1. `git add -A`
2. `git commit -m "..."`
3. `git push origin main`
4. Только потом запускать `bash scripts/deploy-safe.sh`

`deploy-safe.sh` специально падает, если есть незакоммиченные или непушенные изменения.

## Документация

Перед правкой сначала сверяйся с:
- `docs/rag/INDEX.md` — main app documentation router
- `docs/UI_RULES.md` — UI rules для основной платформы
- `docs/rag/BACKEND_GUIDE.md` — server/API patterns
- `docs/rag/DRIZZLE_PATTERNS.md` — DB patterns
- `docs/messenger/README.md` — обзор messenger contour

## Always-on правила интерфейса

- Для main app UI сначала учитывать `.github/AGENTS.md`.
- Если задача касается `messenger/web`, приоритет у messenger-specific инструкций, а не у brutalist default main-app правил.
- Если пользователь ведет параллельный UI change-stream, менять shared contracts только через mode-aware/documented слой, а не локальными разрозненными overrides.
