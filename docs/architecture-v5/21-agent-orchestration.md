# 21. Agent Orchestration & Claude CLI Sync

Date: 2026-04-19
Scope: Как устроен UX "чат с оркестратором → дерево дочерних agent-runs → вложения → live stream" в `messenger/web`, и как в этот контур подключается Claude Code CLI через `scripts/workrooms/claude-stream-bridge.ts`.

## 1. Целевой UX

Пользователь открывает контакт-агента **orchestrator** в messenger → обычный чат. Пишет задачу (с аттачами). Оркестратор декомпозирует → порождает N дочерних agent-runs. В правой панели (`MessengerAgentChatWorkspace` section `runs`/`graph`) отрисовывается **дерево**:

```
orchestrator (run #42, opus, running)
├── wave8-cleanup-utils     (sonnet, streaming, 12% ctx)
│   └── typecheck-probe     (haiku, completed)
├── wave8-dead-code-sweep   (sonnet, awaiting_input)
└── wave8-docs-update       (haiku, completed, $0.04)
```

- Клик по узлу → открывается его chat thread (теми же компонентами, что обычный conversation).
- Live updates: substate, token/cost counter, delta-стрим, tool-use события.
- Аттачи в composer: file_upload + text_pastebin → пересылаются дочерним runs как контекст.
- Cancel/retry: кнопки на узле.

Смысловая модель: **agent = контакт**, **run = тред**, **event = message в треде**.

## 2. Модель данных (`server/db/schema/messenger.ts`)

Текущее (commit 3f773fe):
- `messenger_agents` — id, ownerUserId, name, model, ingestToken, config.
- `messenger_agent_runs` — id, agentId, conversationId, status, prompt, result.
- `messenger_agent_run_events` — id, runId, substate, tokenIn/Out, message, payload.

### 2.1 Дерево runs

Добавить в `messenger_agent_runs`:
- `parent_run_id uuid` → FK на `messenger_agent_runs.id`, on delete set null.
- `root_run_id uuid` → FK, для быстрых subtree-queries без recursive CTE.
- `spawned_by_agent_id uuid` → FK на `messenger_agents.id`.
- `cost_usd numeric(10,4) default 0`.
- `token_in_total integer default 0 not null`.
- `token_out_total integer default 0 not null`.

Indexes: `(parent_run_id)`, `(root_run_id, created_at DESC)`.

### 2.2 Mapping claude-session ↔ agent (новая таблица)

`messenger_cli_sessions`:
- `id uuid pk default random`.
- `agent_id uuid not null → messenger_agents.id`.
- `run_id uuid → messenger_agent_runs.id` (может быть null до старта run).
- `tmux_session_id text not null` (обычно "cc").
- `tmux_window text not null` (например "cc-wave8-cleanup").
- `claude_session_uuid uuid not null`.
- `workroom_slug text`.
- `model text not null`.
- `status text not null default 'running'` (running|done|killed|error).
- `log_path text not null`.
- `created_at tstz default now not null`.
- `finished_at tstz`.

### 2.3 Attachments

Переиспользуем `messenger_media` (есть E2EE-путь). На `messenger_agent_runs` — поле `attachment_ids jsonb default []`. Bridge при старте скачивает файлы в workroom `/attachments/` и передаёт пути в prompt.

## 3. API-контракт (messenger/core, Fastify)

Уже есть `registerIngestRoutes`:
- `POST /agents/:agentId/events` — ingest event (run_start|substate|delta|tool_use|tokens|complete|error).

Дописать:

| Endpoint | Назначение |
|---|---|
| `POST /agents/:agentId/runs` | Создать run (parentRunId?, prompt, attachmentIds). Возвращает {runId, cliSessionId} + триггерит daemon на запуск claude-session. |
| `POST /agents/:agentId/runs/:runId/cancel` | tmux SIGTERM, status=cancelled. |
| `POST /agents/:agentId/runs/:runId/retry` | Клон run, новый runId. |
| `GET  /agents/:agentId/runs?rootRunId=...&cursor=...` | Cursor-пагинация узлов поддерева. |
| `GET  /agents/:agentId/runs/:runId/events?cursor=...` | Cursor-пагинация событий. |
| `POST /cli-sessions` | Bridge/claude-session регистрирует tmux+claude-uuid mapping. |

WS каналы: уже есть `agent-stream:{agentId}`; добавить `agent-tree:{rootRunId}` для live-обновления дерева без pull.

## 4. Claude CLI bridge

### 4.1 Статус

- [scripts/workrooms/claude-stream-bridge.ts](scripts/workrooms/claude-stream-bridge.ts) готов (парсит `claude --output-format stream-json` → POST ingest).
- [scripts/workrooms/install-bridge.sh](scripts/workrooms/install-bridge.sh) — только symlink.
- **Не запускается**. `~/bin/claude-session create` bridge не дёргает.

### 4.2 Требуется

**(a) `~/bin/claude-session` правка.** В `create <slug>` перед `tmux new-window`:

1. POST `/cli-sessions` с agentId/workroom/model/tmuxWindow/uuid/logPath → получает cliSessionId.
2. Команда tmux-окна: `claude --print --session-id $UUID --output-format stream-json ... | tee $LOG | claude-stream-bridge --agent-id $AGENT_ID --run-id $RUN_ID --cli-session-id $CLI_SESSION_ID`.

**(b) `--parent-run <id>` флаг** → идёт в POST /runs как parentRunId.

**(c) Cancel** ([useMessengerAgentStream.ts:151](messenger/web/app/entities/agents/model/useMessengerAgentStream.ts:151)):

`POST /agents/:agentId/runs/:runId/cancel` → core: `SELECT tmux_window FROM messenger_cli_sessions WHERE run_id=$1` → spawn `tmux send-keys -t $window C-c` → UPDATE run SET status=cancelled → broadcast substate=idle.

**(d) `claude-session doctor`** — health-check скрипт: для каждой строки `messenger_cli_sessions` где status=running — проверить что tmux window жив; иначе status=error.

## 5. UI (`messenger/web`)

### 5.1 Уже есть
- [MessengerAgentChatWorkspace.vue](messenger/web/app/widgets/agent-workspace/MessengerAgentChatWorkspace.vue) — секции overview/settings/knowledge/links/runs/graph/explorer.
- [MessengerAgentGraphEditor.vue](messenger/web/app/entities/agents/ui/MessengerAgentGraphEditor.vue) — static agent-to-agent review/enrich edges.
- [useMessengerAgentStream.ts](messenger/web/app/entities/agents/model/useMessengerAgentStream.ts) — WS client.

### 5.2 Дописать

| Файл | Задача |
|---|---|
| `messenger/web/app/features/agent-run-tree/ui/AgentRunTree.vue` | Tree-рендер runs по rootRunId. Reactive, подписан на `agent-tree:{rootRunId}`. Node = pill (status color, model, token%, cost, cancel-btn, click→open thread). |
| `messenger/web/app/features/agent-run-tree/model/useAgentRunTree.ts` | Fetch subtree + WS subscribe + normalize tree. |
| `MessengerAgentChatWorkspace.vue` section runs | Подставить `<AgentRunTree :root-run-id>` когда есть children. |
| `MessengerChatComposerDock.vue` | Action "spawn child agent" при agent-context. |
| Cancel button в node pill | POST /runs/:id/cancel. |

## 6. End-to-end flow

1. User → orchestrator composer: "wave8 cleanup", аттач `notes.md`.
2. Frontend → POST `/agents/orchestrator/runs` {prompt, attachmentIds:[x]}.
3. Core: insert agent_run (parent=null, rootRunId=self), placeholder в cli_sessions, return runId.
4. Core → daemon unix-socket → `claude-session create orch-run-42 --workroom orch --model opus --parent-run null`.
5. Bridge pipe в tmux стримит run_start/substate/delta/tokens → POST /events.
6. Opus пишет inline-reply → delta → WS → UI композер показывает стрим.
7. Opus вызывает tool → spawn child → daemon создаёт новый cli_session + run parentRunId=42, rootRunId=42.
8. UI получает agent-tree:root-42 → вставляет node "child-A" в AgentRunTree.

## 7. Порядок реализации (7 batches)

| # | Batch | Size | Model |
|---|---|---|---|
| 1 | migration: parent/root/spawnedBy, cost/tokens totals, messenger_cli_sessions | S | sonnet |
| 2 | agent-run-store + ingest-handler: parentRunId, totals, broadcast agent-tree | M | sonnet |
| 3 | API routes: POST /runs, /cancel, GET tree, POST /cli-sessions | M | sonnet |
| 4 | ~/bin/claude-session: bridge pipe, cli-session registration, --parent-run | M | sonnet |
| 5 | UI: AgentRunTree.vue + composable + integration | M | sonnet |
| 6 | Composer spawn-child + cancel button | S | haiku |
| 7 | E2E smoke: реальный orchestrator prompt → 2 child → UI tree | S | sonnet |

Ожидаемый срок: 1-2 дня pipeline-времени. После batch 4 система минимально работает end-to-end; 5-7 — UX polish.

## 8. Красные линии

- Не класть Claude-CLI-специфику в `messenger/core/src/agents/**` кроме cli-sessions (agnostic mapping). Bridge знает про CLI; core — нет.
- `messenger_cli_sessions` — infrastructure-level. Не путать с agent-level runs.
- WS-ingest не использовать для payload > 1MB. Большие tool-use input → писать в messenger_media, event содержит ref.
- Attachments — только существующий E2EE media pipeline.
