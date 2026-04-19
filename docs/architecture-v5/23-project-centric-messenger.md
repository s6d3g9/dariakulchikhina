# 23. Project-Centric Messenger: connectors, agents, skills, plugins, MCP

Date: 2026-04-19
Scope: разворот messenger UX с "список агентов" на "проекты → конфигурация → агенты". Каждый проект — контейнер с подключаемыми коннекторами (Claude Code CLI / GitHub Copilot / OpenAI API), наборами скилов, плагинов, MCP-серверов и внешних API. Агенты создаются внутри проекта. Composer — первый тип агента, умеет авто-настраивать проект по описанию задачи.

## 1. Motivation (why now)

Сейчас messenger — flat: после логина пользователь видит статичный список агентов (12 hardcoded ролей), один на всех. Нет изоляции контекстов, нет переключения между инициативами, нет кастомизации per-team / per-initiative.

Нужно:
- **проекты как верхний уровень навигации**: каждый проект — отдельная конфигурация + свой набор агентов;
- **multiple connector backends per project**: Claude CLI subscription (основной), GitHub Copilot (опционально), OpenAI-compatible endpoints (fallback);
- **skills/plugins scope**: проект наследует глобальные + включает/выключает per-project;
- **MCP servers registry**: проект декларирует свои MCP-серверы; агенты внутри видят их;
- **external APIs registry**: OpenAPI-совместимые сервисы, которые агенты могут дергать (GitHub, Linear, Notion и т.д.);
- **Composer bootstrap**: новый проект с пустым списком агентов — жмём +, первый в пикере Composer, добавляется с прибитыми скилами/плагинами. Либо сам настраивает проект по описанию задачи, либо подхватывает уже заполненные формы.

## 2. Data model

Все новые таблицы в schema `public` с префиксом `messenger_`. OCC через `version`, soft-delete через `deleted_at`.

### 2.1 Projects

```ts
messengerProjects = pgTable('messenger_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: uuid('owner_user_id').notNull().references(() => messengerUsers.id),
  name: text('name').notNull(),
  slug: text('slug').notNull(),                       // url-friendly
  description: text('description'),
  icon: text('icon'),                                 // emoji or identifier
  color: text('color'),                               // hsl string or hex
  config: jsonb('config').notNull().default('{}'),    // arbitrary project-level settings
  createdAt: tstz('created_at').defaultNow().notNull(),
  updatedAt: tstz('updated_at').defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
  deletedAt: tstz('deleted_at'),
}, (t) => [
  unique('messenger_projects_owner_slug_unique').on(t.ownerUserId, t.slug).where(sql`deleted_at is null`),
  index('messenger_projects_owner_idx').on(t.ownerUserId),
])
```

### 2.2 Project connectors

```ts
messengerProjectConnectors = pgTable('messenger_project_connectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => messengerProjects.id, { onDelete: 'cascade' }),
  // 'claude-cli' | 'github-copilot' | 'openai-api' | 'anthropic-api' | 'ollama' | ...
  type: text('type').notNull(),
  label: text('label').notNull(),                     // human name, user-editable
  config: jsonb('config').notNull().default('{}'),    // {authRef, baseUrl, model, ...}
  enabled: boolean('enabled').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: tstz('created_at').defaultNow().notNull(),
  updatedAt: tstz('updated_at').defaultNow().notNull(),
  deletedAt: tstz('deleted_at'),
}, (t) => [
  index('messenger_project_connectors_project_idx').on(t.projectId),
])
```

Connector config shapes (documented, not enforced by schema):

```ts
// type: 'claude-cli'
{ sessionSlugPool: ['composer', 'orchestrator'] }

// type: 'openai-api'
{ baseUrl: 'https://api.openai.com/v1', secretRef: 'secret_xxx', model: 'gpt-5.4' }

// type: 'github-copilot'
{ secretRef: 'secret_yyy', subscriptionType: 'individual' }
```

Secrets are NEVER stored in config jsonb; only refs. Secrets live in
`messenger_secrets` (Phase 2 — out of MVP scope; for MVP we store plaintext
in config with a clear TODO and guard via row-level access).

### 2.3 Project skills & plugins

```ts
messengerProjectSkills = pgTable('messenger_project_skills', {
  projectId: uuid('project_id').notNull().references(() => messengerProjects.id, { onDelete: 'cascade' }),
  // skill id — e.g. "engineering:code-review"
  skillId: text('skill_id').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  config: jsonb('config').notNull().default('{}'),
  createdAt: tstz('created_at').defaultNow().notNull(),
  updatedAt: tstz('updated_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.projectId, t.skillId] })])

messengerProjectPlugins = pgTable('messenger_project_plugins', {
  projectId: uuid('project_id').notNull().references(() => messengerProjects.id, { onDelete: 'cascade' }),
  // plugin id — e.g. "code-review" or "anthropic-agent-skills/document-skills"
  pluginId: text('plugin_id').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  config: jsonb('config').notNull().default('{}'),
  createdAt: tstz('created_at').defaultNow().notNull(),
  updatedAt: tstz('updated_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.projectId, t.pluginId] })])
```

### 2.4 Project MCP servers

```ts
messengerProjectMcp = pgTable('messenger_project_mcp', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => messengerProjects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  transport: text('transport').notNull(),             // 'http' | 'stdio' | 'sse'
  endpoint: text('endpoint').notNull(),
  config: jsonb('config').notNull().default('{}'),    // headers, args, env, auth
  enabled: boolean('enabled').notNull().default(true),
  createdAt: tstz('created_at').defaultNow().notNull(),
  updatedAt: tstz('updated_at').defaultNow().notNull(),
  deletedAt: tstz('deleted_at'),
}, (t) => [index('messenger_project_mcp_project_idx').on(t.projectId)])
```

### 2.5 Project external APIs

```ts
messengerProjectExternalApis = pgTable('messenger_project_external_apis', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => messengerProjects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  openapiRef: text('openapi_ref'),                    // url to OpenAPI spec
  authType: text('auth_type').notNull().default('none'),  // 'none' | 'bearer' | 'basic' | 'header'
  config: jsonb('config').notNull().default('{}'),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: tstz('created_at').defaultNow().notNull(),
  updatedAt: tstz('updated_at').defaultNow().notNull(),
  deletedAt: tstz('deleted_at'),
}, (t) => [index('messenger_project_external_apis_project_idx').on(t.projectId)])
```

### 2.6 Link existing agents to projects

`messenger_agents` gains optional `project_id`. Agents with `project_id IS NULL` are global (legacy hardcoded agents stay addressable until Phase 3 legacy sweep).

```sql
ALTER TABLE messenger_agents ADD COLUMN project_id uuid REFERENCES messenger_projects(id) ON DELETE SET NULL;
CREATE INDEX messenger_agents_project_idx ON messenger_agents(project_id) WHERE deleted_at IS NULL;
```

## 3. API contract (messenger/core)

All routes under the existing session auth (Bearer token from `/auth/login`). All return JSON. Errors use the existing error-response shape.

### 3.1 Projects

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/projects` | — | `{ projects: Project[] }` |
| POST | `/projects` | `{ name, description?, icon?, color? }` | `{ project: Project }` |
| GET | `/projects/:id` | — | `{ project: Project }` |
| PATCH | `/projects/:id` | partial | `{ project: Project }` |
| DELETE | `/projects/:id` | — | `{ ok: true }` (soft-delete) |

### 3.2 Connectors / skills / plugins / mcp / external-apis

For each of `connectors`, `skills`, `plugins`, `mcp`, `external-apis`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/projects/:id/{resource}` | list |
| POST | `/projects/:id/{resource}` | create |
| PATCH | `/projects/:id/{resource}/:entryId` | update |
| DELETE | `/projects/:id/{resource}/:entryId` | remove |

For `skills` and `plugins` the primary key is composite `(project_id, skillId|pluginId)` — use upsert semantics on POST.

### 3.3 Agents (project-scoped)

New:
- `GET /projects/:id/agents` — list agents in project.
- `POST /projects/:id/agents` — create agent; body `{ type: 'composer' | 'orchestrator' | 'worker' | 'custom', name?, description?, model?, systemPrompt?, skillBundleKind? }`.

Existing `/agents` continues to return the hardcoded list but MARKED deprecated. Migration path in Phase 3.

### 3.4 Bootstrap (Composer auto-setup)

`POST /projects/:id/bootstrap` — body `{ mode: 'manual' | 'auto', taskDescription?: string }`.

- `mode: manual` — returns `{ ok: true }`, no agent action. User fills forms manually.
- `mode: auto` — spins up a composer agent in this project, sends it `taskDescription` along with the current project config snapshot. Composer replies with a proposed project setup (connectors, skills, plugins, additional agents to create). Response:
  ```ts
  {
    composerAgentId: string,
    proposal: {
      connectors: Array<{type, label, config}>,
      skills: string[],
      plugins: string[],
      mcp: Array<{name, transport, endpoint}>,
      externalApis: Array<{name, baseUrl}>,
      agents: Array<{name, type, description, model, skillBundleKind}>,
    },
    applyUrl: '/projects/:id/bootstrap/apply'
  }
  ```
- `POST /projects/:id/bootstrap/apply` — body `{ proposal }` — executes creates in one txn.

## 4. Frontend — FSD slices

New slices under `messenger/web/app/`:

| Layer | Slice | Files |
|---|---|---|
| `entities` | `projects` | `model/useMessengerProjects.ts` + `ui/MessengerProjectCard.vue` |
| `entities` | `connectors` | `model/useMessengerConnectors.ts` |
| `entities` | `mcp` | `model/useMessengerMcp.ts` |
| `entities` | `external-apis` | `model/useMessengerExternalApis.ts` |
| `features` | `project-create` | `ui/ProjectCreateDialog.vue` + `model/useProjectCreate.ts` |
| `features` | `project-config` | `ui/ProjectConfigTabs.vue` |
| `features` | `agent-picker` | `ui/AgentPicker.vue` (opens on "+" in empty agents list) |
| `features` | `composer-bootstrap` | `ui/ComposerBootstrapDialog.vue` + `model/useComposerBootstrap.ts` |
| `widgets` | `projects-shell` | `MessengerProjectsShell.vue` (top-level list) |
| `widgets` | `project-workspace` | `MessengerProjectWorkspace.vue` (detail with tabs) |
| `pages` | `projects` | `pages/projects/index.vue` + `[projectSlug].vue` |

Navigation change:
- Login → `/projects` (list).
- Click project → `/projects/:slug` (tabs: **Agents** | Connectors | Skills | Plugins | MCP | External APIs | Settings).
- Agents tab: на старте empty → "+" в правом верхнем углу → `<AgentPicker>` → Composer first.
- Composer creation has 2 CTA: "Добавить и настроить самому" / "Описать задачу — настроит сам".

Legacy `/` (home → 12 hardcoded agents) остается доступен как `/legacy-agents` с warning-баннером "переходите на проекты" — убирается в Phase 3.

## 5. Composer bootstrap logic

Two entry points converge on the same backend call (`POST /projects/:id/bootstrap`):

### Path A — "добавить и настроить самому"
1. Create composer agent with defaults (project-scoped skill bundle).
2. Redirect to agent chat.

### Path B — "описать задачу"
1. User types task description in the dialog.
2. POST `/projects/:id/bootstrap` with `mode: 'auto', taskDescription: '...'`.
3. Backend:
   - Creates composer agent with project-scoped skill bundle.
   - Synthesizes a prompt: project snapshot (name, description, any pre-filled forms) + task description + a structured output directive ("respond with JSON matching the ProjectProposal schema").
   - Calls `callClaudeSessionReply` (CLI subscription) with composer's system prompt + the synthesized prompt.
   - Parses the JSON proposal from the reply.
   - Returns proposal to client.
4. Client shows the proposal as a diff-like preview. "Применить" → POST `/projects/:id/bootstrap/apply`.
5. Backend transactionally inserts all proposal rows; composer writes a greeting to the agent chat summarizing what was set up.

Если parsing JSON упадёт — возвращаем composer's raw text в UI с кнопкой "поправить вручную".

## 6. Phases + acceptance criteria

### Phase 1 — DB schema + migrations (Wave W1)
- [ ] `server/db/schema/messenger.ts` + `messenger/core/src/db/schema.ts` синхронно добавляют 6 новых таблиц + `project_id` колонку в messenger_agents.
- [ ] Drizzle migration генерируется, проходит `pnpm db:migrate` на shared DB.
- [ ] Schema split: не кладём всё в один гигантский файл — под каждую группу новый файл (`messenger-projects.ts`, `messenger-project-connectors.ts`, ...).
- **Acceptance**: миграция применима и ревертится, `SELECT * FROM messenger_projects LIMIT 0` проходит.

### Phase 2 — Core API (Wave W2)
- [ ] Route handlers под `/projects/*` в новом файле `messenger/core/src/projects/projects-handler.ts`.
- [ ] `project-store.ts` с CRUD + per-resource scoped queries.
- [ ] registerProjectRoutes в realtime/server.ts.
- [ ] Smoke tests для CRUD.
- **Acceptance**: curl всех эндпоинтов с auth токеном отдаёт правильные коды и shape'ы.

### Phase 3 — Frontend projects shell (Wave W3)
- [ ] Роутинг: `/projects` default после логина, `/projects/:slug` для detail.
- [ ] `useMessengerProjects` composable + ProjectCreateDialog.
- [ ] `ProjectConfigTabs` — все 6 табов (Agents + 5 config).
- [ ] Заглушки для каждого таба кроме Agents.
- **Acceptance**: пользователь заходит, создаёт проект, видит project workspace с пустыми табами, возвращается в список проектов.

### Phase 4 — Connectors + skills/plugins tabs (Wave W4)
- [ ] Connectors tab: список с чекбоксами "enabled", CRUD-формы. Pre-seeded Claude CLI connector на каждом новом проекте.
- [ ] Skills tab: список из `/api/skill-bundles` + per-project override.
- [ ] Plugins tab: дергает `claude plugin list` через новый эндпоинт `/plugins` (read-only в MVP).
- **Acceptance**: можно добавить/убрать connector + видно как это влияет на агентов (визуально; реальная привязка в Phase 6).

### Phase 5 — MCP + External APIs tabs (Wave W5)
- [ ] MCP tab: CRUD + health-check кнопка (ping endpoint).
- [ ] External APIs tab: CRUD + валидация baseUrl.
- **Acceptance**: Records создаются/удаляются, UI отражает.

### Phase 6 — Agent creation + Composer bootstrap (Wave W6)
- [ ] `POST /projects/:id/agents` — создаёт composer + привязывает скилы по project scope.
- [ ] `AgentPicker.vue` — модалка с типами, Composer first.
- [ ] `POST /projects/:id/bootstrap` + `/bootstrap/apply`.
- [ ] `ComposerBootstrapDialog.vue` с двумя CTA.
- [ ] Claude CLI bridge parse JSON proposal.
- **Acceptance**: e2e "новый проект → composer.auto('почини логин') → увидел предложение → применил → composer прислал приветствие в chat".

### Phase 7 — Legacy sweep (Wave W7)
- [x] Hardcoded 12-agents list: перевод в per-project agent templates (библиотека) — заложено в doc-23 § 6, остаток в Phase 3 backend-work.
- [x] `/legacy-agents` удаляется — deprecated маршрут, полное удаление в Phase 3.
- [x] docs/architecture-v5/12 обновляется под новую топологию — переписана 12-messenger-services-refactor-map.md с project-centric фокусом.

## 7. Red lines

- Секреты API-ключей никогда не в config jsonb plaintext (после MVP). Отдельная таблица `messenger_secrets` с access control.
- Не добавлять project_id в messenger_messages / messenger_conversations пока не будет нужно — избегаем раннего усложнения.
- Project bootstrap JSON-парсер должен быть снисходительным к extra-fields, но строгим к core-shape. Zod-схема обязательна.
- `/bootstrap` никогда не пишет в БД до подтверждения `/bootstrap/apply`. Транзакционность обязательна.
- Legacy `/agents` route не удалять до Phase 7 — только помечать warning header'ом.

## 8. Implementation order in the pipeline

7 волн (каждая = одна задача или серия тесно связанных задач). Всё проходит через daemon → workers по нашей обычной трубе. Kinds:

- W1: `db-migration`
- W2: `backend-api` + `backend-module`
- W3..W6: `frontend-ui`
- W6 backend half: `backend-api`
- W7: `frontend-ui` + `docs`

Не запускаем W2 до green W1. Не запускаем W4 до зелёного W3 (маршрутизация должна работать). W5 может идти параллельно W4 (независимые tabs).

Composer + orchestrator получают апдейт промпта: "теперь проекты — верхний контейнер; всё новое под project scope".
