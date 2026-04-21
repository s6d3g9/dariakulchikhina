# 24. AIDev Module — Project-Centric Dev Flow inside Messenger

Date: 2026-04-20
Scope: новая секция верхнего уровня **aidev** в основном shell мессенджера.
Живёт рядом с Чат / Чаты / Контакты / Агенты / Настройки. Внутри — проекты
разработки (создание, composer-чат per project, ресурсы: connectors / skills
/ plugins / MCP / external APIs / per-project agents).

## 1. Зачем отдельная секция

- **Агенты** остаётся как глобальный список AI-контактов (Composer,
  Техлид-оркестратор, Frontend Messenger, Realtime и звонки, Планировщик
  проекта, специалисты по платформе и материалам). Это знакомый UX из
  прошлой версии — менять его нельзя.
- **aidev** — новое пространство для проектной разработки. Вход = список
  проектов (grid). Клик по проекту → внутреннее представление с табами:
  Overview / Composer / Agents / Connectors / Skills / Plugins / MCP /
  External APIs / Bootstrap. Composer-чат внутри каждого проекта
  привязан к своему `composer-<slug>` claude-session.
- Граница: сообщения в **Агенты** — глобальный agent-run; сообщения в
  **aidev/Composer** — run в контексте конкретного messenger_project.

## 2. Menu entry

### 2.1 Section key
`app/widgets/shell/model/useMessengerSections.ts`:

```ts
export type MessengerSectionKey = 'chat' | 'chats' | 'contacts' | 'agents' | 'aidev' | 'settings'
```

Порядок в sections[] (с включённым `agentsEnabled`):

| idx | key       | icon                         |
|-----|-----------|------------------------------|
| 0   | chat      | mdi-message-outline          |
| 1   | chats     | mdi-message-text-outline     |
| 2   | contacts  | mdi-account-multiple-outline |
| 3   | agents    | mdi-robot-outline            |
| 4   | **aidev** | **mdi-rocket-launch-outline** |
| 5   | settings  | mdi-cog-outline              |

Порядок подобран так, чтобы "Настройки" оставались последним пунктом.

### 2.2 AppShell изменения
`app/widgets/shell/MessengerAppShell.vue`:
- `sectionIcon()` — add case `'aidev'`.
- Desktop sidebar — уже итерирует `sections`, ничего не нужно менять.
- Bottom nav — новая кнопка после "Агенты" (или до, в зависимости от итогового порядка).
- Content slot — `<MessengerAidevSection v-show="activeSection === 'aidev'" />`.

## 3. Widget `MessengerAidevSection.vue`

Live в `app/widgets/aidev/MessengerAidevSection.vue`. Два внутренних режима:

### 3.1 List mode (default)
- Grid проектов из `useMessengerProjects()`.
- "+ Новый проект" в шапке → модалка (`useProjectCreate`) → POST /projects.
- Клик на карточку → переключает widget в Project mode, state хранится в
  `useState('aidev-active-project', () => null)` (сохраняется между tab-ами).
- Empty state: "Проектов нет — создай первый" + CTA.

### 3.2 Project mode
Рендерит существующий `MessengerProjectWorkspace.vue` (widget wave8) с
переданным project slug. В нём уже есть:
- Overview (описание, счётчики ресурсов)
- Composer (integration ниже)
- Agents (AgentPicker → POST /projects/:id/agents type=composer/other)
- Connectors / Skills / Plugins / MCP / External APIs — CRUD табы
- Bootstrap (auto / manual пропозал от orchestrator-а)

Кнопка "← К списку" сбрасывает `aidev-active-project`.

### 3.3 Composer-tab интеграция
В табе Composer рендерим `MessengerAgentChatWorkspace` с
`agentId = composerAgent.id` (first messenger_agents row для этого
project_id where `config->>'kind' = 'composer'`). Тот же pipeline runs/events:
- POST /agents/:id/runs → messenger_agent_runs insert
- WS `agent-stream:{agentId}` → delta-стрим
- Bridge: `claudeSessionSlug` = `composer-<translit-slug>` → claude CLI
  резьюмит tmux-сессию
- Response → delta events → DB → WS → UI

## 4. Data contracts

Новых endpoint-ов **нет** — всё уже написано (wave8). Widget использует:

| Endpoint | Цель |
|---|---|
| GET /projects | список |
| POST /projects | создать (slug derive на сервере) |
| DELETE /projects/:id | soft-delete |
| GET /projects/:id/agents | project-scoped агенты |
| POST /projects/:id/agents `{type:'composer'}` | создать composer |
| POST /projects/:id/bootstrap `{mode,taskDescription}` | auto-создать ресурсы |
| POST /projects/:id/bootstrap/apply `{proposal}` | применить предложение |
| GET/POST/DELETE /projects/:id/{connectors,skills,plugins,mcp,external-apis} | CRUD |
| POST /agents/:agentId/runs | сообщение composer-у проекта |
| WS /ws/agents/:agentId/stream | delta-стрим ответов |

## 5. Sync с Dashboard

Dashboard на :9090 хранит проекты в `~/state/claude-sessions/.projects.json`
и спавнит `composer-<translit-slug>` claude-session через
`claude-session create`. Каждый POST /api/projects на dashboard запускает
`scripts/seed-messenger-agents.ts` как child_process — он upsert-ит
messenger_projects + composer messenger_agent row с project_id.

**Обратное направление** (проект создан в aidev-табе → нужен ли row в
.projects.json и claude-session): **v1 — нет**. Dashboard — инструмент
диспетчера воркеров, а не зеркало мессенджера. Когда пользователь создаёт
проект в aidev и хочет чтобы orchestrator-сессия спавнила воркеры под ним —
надо вручную создать запись через POST /api/projects на dashboard. В v2
можно добавить автоматический реверс-sync (out of scope).

## 6. Red lines

- "Агенты" таб **не трогаем** — оставляем все 13 глобальных контактов.
- `MessengerAppShell` меняем только точечно (key добавить, icon, button,
  v-show). Не переделывать nav-архитектуру.
- Composer chat в aidev — через existing `MessengerAgentChatWorkspace`
  component, не писать новый.
- Не дублировать data store `messenger_projects` — читаем только через
  REST API `/projects`.
- `/projects`, `/projects/:slug`, `/projects/:projectId` routes остаются
  для deep-link; они просто маунтят `MessengerProjectsShell` и
  `MessengerProjectWorkspace` через Nuxt router (без AppShell).
- После login `navigateTo('/')` ведёт на AppShell с chat-tab-ом по-умолчанию
  (НЕ на aidev).

## 7. Implementation batches

| # | Batch | Файлы | Готовность |
|---|---|---|---|
| 1 | Menu entry + empty widget | `useMessengerSections.ts`, `MessengerAppShell.vue`, `widgets/aidev/MessengerAidevSection.vue` (stub) | today |
| 2 | Projects list mode | `MessengerAidevSection.vue` (grid + create modal via reuse) | today |
| 3 | Project detail mode | `MessengerAidevSection.vue` (embed `MessengerProjectWorkspace`) | next |
| 4 | Composer tab → `MessengerAgentChatWorkspace` binding | `ProjectConfigTabs.vue` / new `AidevComposerTab.vue` | next |
| 5 | E2E smoke: create → composer auto-spawn → chat → delegation | manual QA | next |

## 8. Known gaps (v1)

- **Нет dashboard reverse-sync** — создание проекта в aidev не создаёт
  claude-session composer-а автоматически. Временный workaround: POST
  /api/projects на :9090 вручную через dashboard UI.
- **Нет per-project workers graph** — aidev показывает только проект +
  composer + ресурсы. Воркеры (orchestrator spawn-и) видны только в
  dashboard :9090 deps-графе.
- **Нет cross-project linking** — если composer проекта A хочет
  делегировать задачу composer-у проекта B, нужно делать через глобальный
  orchestrator (как сейчас).
