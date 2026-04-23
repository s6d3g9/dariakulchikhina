# Claude CLI ↔ Messenger Protocol

> Формальная спецификация взаимодействия системы оркестрации Claude Code CLI
> с мессенджером Daria. Это живой документ — обновлять при изменении любого компонента.

## 1. Архитектурная карта

```
╔══════════════════════════════════════════════════════════════════╗
║  УПРАВЛЕНИЕ (пользователь)                                       ║
║  Messenger UI  ←──WS──→  messenger/core  ←──REST──→  /cli-sessions ║
║  (браузер)               (Fastify :4300)              (filesystem) ║
╠══════════════════════════════════════════════════════════════════╣
║  ИСПОЛНЕНИЕ                                                      ║
║  tmux cc:cc-<slug>                                               ║
║    └─ claude --print --resume <uuid> --model <m>                 ║
║         └─ claude-stream-bridge → POST /agents/:id/stream        ║
╠══════════════════════════════════════════════════════════════════╣
║  СОСТОЯНИЕ                                                       ║
║  ~/state/claude-sessions/.registry.tsv   (filesystem, append)   ║
║  ~/.claude/<uuid>/  (Claude conversation history, per-session)   ║
║  messenger_agents table (Postgres — статические агенты)          ║
╚══════════════════════════════════════════════════════════════════╝
```

## 2. Реестр сессий (Registry TSV)

Файл: `~/state/claude-sessions/.registry.tsv`

| Колонка | Тип | Описание |
|---------|-----|----------|
| `slug` | string | Уникальный идентификатор, `[a-z0-9-]{2,40}` |
| `uuid` | UUID | Claude conversation UUID, используется в `--resume` |
| `window` | string | Имя tmux-окна (`cc-<slug>`) |
| `workroom` | string | Git worktree (`~/workrooms/<wr>`), пусто если нет |
| `model` | string | Модель Claude (`claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5-20251001`) |
| `created` | ISO8601 | Время создания |
| `kind` | string | Тип сессии (см. раздел 4) |
| `project_id` | UUID\|empty | Project UUID (наследуется при создании через `--project-id` или `$CLAUDE_SESSION_PROJECT_ID`) |

**Архивный реестр**: `~/state/claude-sessions/archive/.registry.tsv` — добавляется колонка `archived_at`.

### Правила целостности

- Одна строка = одна сессия. Slug уникален.
- Строки только добавляются (`>>`). Удаление = архивирование.
- Zombie-detection: бэкенд проверяет через `tmux list-windows -t cc` и помечает статус `done` для мёртвых окон.

## 3. Жизненный цикл сессии

```
create                    send (n раз)              kill / done
  │                         │                          │
  ▼                         ▼                          ▼
[registry append]     [prompt file write]        [tmux kill-window]
[tmux new-window]     [claude --resume runs]     [registry stays: zombie-detected]
[claude --print       [stream-bridge POSTs]      [archive/.registry: archived_at]
  first prompt]       [messenger WS event]
[stream-bridge
  registers run]
```

### Состояния

| Статус в API | Условие |
|-------------|---------|
| `running` | Строка в `.registry.tsv` И tmux-окно живо |
| `done` | В `archive/.registry.tsv` ИЛИ tmux-окно мертво |

## 4. Типы сессий (Kind Map)

| Kind | Model | Effort | Max parallel | Tier |
|------|-------|--------|-------------|------|
| `composer` | `claude-opus-4-7` | high | 1/project | 0 (всегда видим) |
| `orchestrator` | `claude-sonnet-4-6` | medium | 2/project | 1 (видим только running) |
| `frontend-ui` | `claude-sonnet-4-6` | medium | 2 | 2 |
| `backend-api` | `claude-sonnet-4-6` | medium | 2 | 2 |
| `backend-module` | `claude-sonnet-4-6` | medium | 2 | 2 |
| `db-migration` | `claude-sonnet-4-6` | medium | **1** | 2 |
| `messenger-realtime` | `claude-sonnet-4-6` | medium | 1 | 2 |
| `tests` | `claude-haiku-4-5-20251001` | low | 3 | 2 |
| `docs` | `claude-haiku-4-5-20251001` | low | 3 | 2 |
| `frontend-research` | `claude-haiku-4-5-20251001` | low | 3 | 2 |
| `incident` | `claude-opus-4-7` | high | 1 | 2 |
| `default` | `claude-sonnet-4-6` | medium | 2 | 2 |

Kind определяется автоматически из slug (`claude-session create`) или передаётся явно через `--kind`.

## 5. API протокол (messenger/core)

### GET /cli-sessions

**Auth**: Bearer токен (HMAC-SHA256, secret = `MESSENGER_CORE_AUTH_SECRET`)

**Query**: `?includeArchived=true`

**Response**:
```typescript
{
  sessions: Array<{
    slug: string
    uuid: string
    window: string
    workroom: string
    model: string
    created: string
    kind: string
    status: 'running' | 'done'
    archivedAt: string | null
    agentId: string | null          // из messenger_agents по slug
    agentDisplayName: string | null
    agentProjectId: string | null   // из messenger_agents → project_id из registry (fallback)
  }>
}
```

**Правила фильтрации на фронтенде**:
- Tier 0 (composers): показывать всегда если `status=running` и `agentProjectId === activeProjectId`
- Tier 1-2: показывать только если `status=running` И (`agentProjectId === activeProjectId` ИЛИ `agentId === activePeerUserId`)
- Сессии без `agentProjectId` (`null`) не показывать в чатах с привязанным проектом

### POST /cli-sessions (ingest)

**Auth**: Bearer `<ingest_token>` — per-agent токен из `messenger_agents.config.ingestToken`

Регистрирует новый run для агента (вызывается из `claude-stream-bridge`).

### Stream: POST /agents/:id/stream

**Auth**: Bearer ingest token

Принимает Server-Sent Events от `claude-stream-bridge` и транслирует в:
1. Postgres `messenger_agent_run_events`
2. WebSocket `agent-stream:{agentId}` (для real-time в UI)

## 6. Изоляция по проектам

### Как project_id попадает в сессию

**Вариант A — при создании через CLI** (для оркестраторов/воркеров):
```bash
CLAUDE_SESSION_PROJECT_ID="<uuid>" claude-session create orchestrator-slug ...
# или
claude-session create orchestrator-slug --project-id "<uuid>" ...
```

**Вариант B — статические агенты** (композиторы):
В `messenger_agents.config.claudeSessionSlug` → `messenger_agents.project_id` — читается бэкендом.

**Вариант C — env inheritance**:
Если у родительской сессии экспортирован `CLAUDE_SESSION_PROJECT_ID`, дочерние claude-session create его наследуют автоматически.

### Шаблон делегирования (для системного промпта composer/orchestrator)

```bash
# Composer → Orchestrator
CLAUDE_SESSION_PROJECT_ID="{activeProjectId}" \
  claude-session create orchestrator-{task}-{ts} \
    --model claude-sonnet-4-6 \
    --effort medium \
    --prompt "TASK: ... | SCOPE: ... | CONTEXT: ..."

# Orchestrator → Worker
CLAUDE_SESSION_PROJECT_ID="{activeProjectId}" \
  claude-session create {kind}-{task}-{ts} \
    --model {model-for-kind} \
    --effort {effort-for-kind} \
    --prompt "TASK: ... | CONTEXT: only specific files"
```

## 7. Выбор модели (Model Selection)

### Текущее состояние

Модель задаётся при `claude-session create --model <name>` и не меняется в течение жизни сессии. Изменение модели = пересоздание сессии с новым UUID (история теряется).

### Протокол управления моделью из UI

**Хранение**: `messenger_agents.config.preferredModel` (string, nullable)

**Приоритет при создании сессии**:
1. Явный `--model` в CLI (наивысший)
2. `agent.config.preferredModel` (если агент зарегистрирован)
3. Kind default (из таблицы выше)

**PATCH /agents/:id** — обновить `config.preferredModel`:
```typescript
{ config: { preferredModel: 'claude-opus-4-7' | 'claude-sonnet-4-6' | 'claude-haiku-4-5-20251001' } }
```

**UI**: Dropdown в шапке разговора с агентом-composer. Выбор сохраняется в DB и применяется при следующем send (новый `--resume` всегда использует model из registry, не из config — поэтому смена модели требует пересоздания сессии через kill + create).

**Ограничение**: Пока сессия running — модель заморожена. Kill + recreate — единственный путь сменить модель.

### Команда пересоздания с новой моделью

```bash
claude-session kill <slug>
claude-session create <slug> --model <new-model> --project-id <pid> \
  --prompt "Продолжай работу. Предыдущий контекст: <summary>"
```

> Примечание: `--resume <old-uuid>` можно использовать для восстановления истории, но модель в новом запуске будет той, что передана в `--model`.

## 8. Подписки и API-ключи

### Источники авторизации Claude

| Тип | Механизм | Конфиг |
|-----|----------|--------|
| Claude Code Pro/Max | OAuth (`~/.claude/.credentials.json`) | Один аккаунт на весь сервер |
| Anthropic API | `ANTHROPIC_API_KEY` env | Через PM2 env или per-session |
| AWS Bedrock | `AWS_*` + `awsCredentialExport` | В `~/.claude/settings.json` |
| GCP Vertex | `gcpAuthRefresh` | В `~/.claude/settings.json` |

### Текущая конфигурация (сервер daria-dev)

- **Авторизация**: Claude Code Pro/Max через credentials файл (`~/.claude/.credentials.json`)
- **Все сессии** разделяют один аккаунт и его rate limits
- **Параллельные сессии**: ограничены rate limits подписки, не кодом

### Rate limit стратегия

```
Tier 0 (composer, opus): 1 на проект — самый дорогой, но редко активен
Tier 1 (orchestrator, sonnet): ≤2 на проект
Tier 2 (workers, haiku/sonnet): ≤3 одновременно
──────────────────────────────────────────────────
Max активных: 1 + 2 + 3 = 6 параллельных вызовов
```

Перед спавном нового воркера: `claude-session list | grep running | wc -l`

### Будущее: мультиаккаунтность

Для изоляции проектов по подпискам (например, клиент платит своим API-ключом):
1. В `messenger_projects.config` → `anthropicApiKey` (encrypted)
2. `claude-session create` читает `ANTHROPIC_API_KEY` из project config
3. Переменная экспортируется в tmux-окно перед запуском claude

Реализация: отдельная задача, требует шифрования секретов в Postgres.

## 9. Stream Bridge Protocol

`~/bin/claude-stream-bridge` — бинарь (Node.js), запускается как `| claude-stream-bridge --agent-id <id> --run-id <uuid> ...`

### Входной формат (stdin)

Построчный JSON в формате `claude --output-format stream-json`:

```jsonc
{"type": "assistant", "message": {"content": [{"type": "text", "text": "..."}]}, "session_id": "...", "uuid": "..."}
{"type": "result", "usage": {"total_tokens": 1234}, "duration_ms": 5000}
{"type": "system", "subtype": "init", "session_id": "...", "model": "claude-sonnet-4-6"}
```

### Что делает bridge

1. Буферизирует текстовые блоки → отправляет `POST /agents/:id/stream` чанками
2. При `type=result` — закрывает run (PATCH статус → done)
3. При ошибке подключения — буферизирует локально, ретраит 3 раза

### Без bridge (режим мониторинга)

Если `--agent-id` не передан — сессия работает без регистрации в messenger. Лог пишется только в `~/state/claude-sessions/<slug>.log`. Это нормально для технических сессий (orchestrator, workers без UI).

## 10. Чек-лист перед спавном сессии

```
[ ] Проверить лимит: claude-session list | grep running | wc -l  (≤6)
[ ] Указать --project-id (или CLAUDE_SESSION_PROJECT_ID) если сессия видима в UI
[ ] Указать --kind для корректного отображения в sess-nav
[ ] Использовать kind-default model (не opus для воркеров)
[ ] db-migration: проверить что нет running db-migration сессий
[ ] Narrow context в --prompt (не "см. весь репозиторий")
[ ] Workers должны завершиться сами (exit после задачи)
[ ] Composers/Orchestrators — persistent (не завершаются сами)
```

## 11. Известные ограничения и TODO

| Проблема | Статус | План |
|----------|--------|------|
| Смена модели требует kill+recreate | Известно | UI "restart with model X" кнопка |
| Один OAuth аккаунт на все проекты | Известно | `project.config.anthropicApiKey` (encrypted) |
| Zombie-detection только по tmux | Реализовано | — |
| `project_id` не наследуется дочерними сессиями автоматически | Частично | `$CLAUDE_SESSION_PROJECT_ID` env |
| Нет UI для просмотра логов сессии | Известно | `/logs/:slug` эндпоинт + виджет в UI |
| Нет UI для создания/kill сессий | Известно | Панель управления в messenger |
