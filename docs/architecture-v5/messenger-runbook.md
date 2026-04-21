# Messenger Runbook

Операционное руководство по диагностике и обслуживанию standalone-мессенджера (`messenger/core` + `messenger/web`).

Источники: [07 Realtime Messenger](./07-realtime-messenger.md), [21 Agent Orchestration](./21-agent-orchestration.md), [Claude CLI Dispatcher Runbook](../claude-cli-dispatcher-runbook.md).

---

## 1. Топология процессов

```
Browser / Messenger Web (messenger/web — Nuxt 4, :3001)
        │  WS  wss://<host>:<core_port>?ticket=<token>
        │  REST http://<host>:<core_port>/
        ▼
messenger/core (Fastify + ws, PM2: messenger-core)
        │  Redis SUBSCRIBE chat, entity_updates, agent-stream:*
        │  Postgres (shared daria_admin_refactor)
        ▼
main Nuxt app (server/ — H3/Nitro, :3000)
        │  Redis PUBLISH chat, entity_updates
        │  SET ws_ticket:<token> EX 30  ← ticket-based WS auth
        ▼
PostgreSQL :5433 (docker: daria_postgres)
Redis      :6380 (systemd: redis-server)

Claude CLI sessions (tmux windows)
        │  stdout | claude-stream-bridge → POST /agents/:id/events
        ▼
messenger/core ingest-handler → messenger_agent_run_events (Postgres)
                               → WS broadcast agent-stream:{agentId}
```

**PM2 процессы:**

| PM2 Name | Директория | Порт |
|---|---|---|
| `daria-nuxt` | `~/daria` | 3000 |
| `messenger-core` | `~/daria/messenger/core` | 3002 (default) |
| `messenger-web` | `~/daria/messenger/web` | 3001 (default) |

Проверить: `ssh daria-dev 'pm2 list'`

---

## 2. Диагностика

### 2.1 Messenger упал (messenger/core не отвечает)

**Симптомы:** WS-соединения не устанавливаются; REST `/health` timeout; `pm2 list` показывает `errored` или `stopped`.

```bash
# Проверить статус
ssh daria-dev 'pm2 list'
ssh daria-dev 'pm2 logs messenger-core --lines 50'

# Перезапустить
ssh daria-dev 'pm2 restart messenger-core'

# Проверить после перезапуска
ssh daria-dev 'curl -s http://localhost:3002/health'
```

**Частые причины:**
- Redis недоступен → core падает при попытке SUBSCRIBE. Проверить: `ssh daria-dev 'redis-cli -p 6380 ping'`
- Postgres недоступен → core падает при первом DB-запросе. Проверить: `ssh daria-dev 'docker ps | grep daria_postgres'`
- OOM / leaked connections → `pm2 logs messenger-core` покажет `ENOMEM` или `ECONNRESET`
- Порт занят другим процессом: `ssh daria-dev 'ss -tlnp | grep 3002'`

### 2.2 Событие застряло (сообщение не доставляется)

**Симптомы:** пользователь отправил сообщение, оно сохранилось в Postgres, но другие участники его не видят в UI.

```bash
# Проверить Pub/Sub канал в Redis
ssh daria-dev 'redis-cli -p 6380 MONITOR'
# Отправить тестовое сообщение, посмотреть — появляется ли PUBLISH chat

# Проверить подписки мессенджера
ssh daria-dev 'redis-cli -p 6380 PUBSUB CHANNELS'
# Должны быть: chat, entity_updates (и agent-stream:* при активных сессиях)

# Проверить последние записи в БД
ssh daria-dev 'psql -U daria_admin -d daria_admin_refactor -c "SELECT id, created_at, sender_id FROM messenger_messages ORDER BY created_at DESC LIMIT 10;"'
```

**Частые причины:**
- messenger/core потерял Redis SUBSCRIBE → перезапуск восстанавливает подписку
- main Nuxt app не публикует событие (баг в publisher) → `pm2 logs daria-nuxt --lines 30`

### 2.3 WS Ticket истёк (WebSocket не открывается)

**Симптомы:** браузер показывает "соединение разорвано" сразу при открытии чата; в консоли `WebSocket closed with code 1008` или `401`.

```bash
# Проверить TTL тикетов в Redis
ssh daria-dev 'redis-cli -p 6380 KEYS "ws_ticket:*"'
# Активные тикеты появляются при открытии UI; их TTL = 30 сек

# Проверить время синхронизации сервера (тикет генерируется Nuxt, потребляется Core)
ssh daria-dev 'date'
```

**Частые причины:**
- Клиент слишком долго открывал WS после запроса тикета (> 30 сек) — редко, обычно баг в frontend retry-логике
- Redis недоступен в момент GET ws_ticket → messenger/core не может проверить → 401
- Тикет уже использован (one-shot): при переподключении клиент должен запросить новый тикет через `POST /api/chat/ws-ticket`

**Диагностика frontend:** в DevTools → Network → `/api/chat/ws-ticket` должен вернуть `200` с `{ ticket: "..." }`. WS URL должен содержать этот token.

### 2.4 Agent-run не стримится (CLI сессия запущена, события не приходят)

**Симптомы:** claude-session создана (`tmux list-windows` показывает окно), но в messenger UI нет live-событий от агента; `messenger_agent_run_events` пустая для этого run.

```bash
# Проверить активные tmux-сессии
ssh daria-dev 'tmux list-windows -t claude 2>/dev/null || echo "no session"'

# Проверить лог конкретной сессии
ssh daria-dev 'tail -n 50 ~/state/claude-sessions/<slug>.log'

# Проверить bridge — он должен быть в pipeline
ssh daria-dev 'pgrep -a claude-stream-bridge'

# Проверить последние события в БД
ssh daria-dev 'psql -U daria_admin -d daria_admin_refactor -c "SELECT run_id, substate, created_at FROM messenger_agent_run_events ORDER BY created_at DESC LIMIT 10;"'

# Ручная проверка ingest endpoint
ssh daria-dev 'curl -s -X POST http://localhost:3002/agents/<agentId>/events -H "Content-Type: application/json" -d "{\"type\":\"substate\",\"payload\":\"idle\"}"'
```

**Частые причины:**
- `claude-stream-bridge` не запущен в tmux-команде (не установлен/не в PATH): `ssh daria-dev 'which claude-stream-bridge'`
- agentId или run_id неверно переданы в bridge — проверить команду в tmux: `ssh daria-dev 'tmux display-message -p -t claude:<window> "#{pane_current_command}"'`
- messenger/core ingest endpoint недоступен → проверить `pm2 logs messenger-core`

---

## 3. Плановое обслуживание

### Ротация пароля dashboard

```bash
ssh daria-dev '~/bin/claude-web-dashboard gen-auth > ~/.claude-dashboard-auth'
ssh daria-dev 'systemctl --user restart claude-web-dashboard.service'
```

### Очистка старых логов сессий

```bash
# Логи сессий — max 100MB каждый
ssh daria-dev 'ls -lh ~/state/claude-sessions/'
# Удалить логи завершённых сессий (старше 7 дней)
ssh daria-dev 'find ~/state/claude-sessions/ -name "*.log" -mtime +7 -delete'
```

### Проверка дрейфа messenger_cli_sessions

```bash
# Найти "зависшие" sessions со статусом running но без живого tmux-окна
ssh daria-dev '~/bin/claude-session doctor'
# Или вручную:
ssh daria-dev 'psql -U daria_admin -d daria_admin_refactor -c "SELECT id, tmux_window, status, created_at FROM messenger_cli_sessions WHERE status = '"'"'running'"'"' ORDER BY created_at DESC;"'
```

### Rolling restart messenger/core (zero-downtime)

PM2 встроенный rolling restart — если единственный инстанс, downtime будет ~2 сек:
```bash
ssh daria-dev 'pm2 reload messenger-core'
# reload мягче чем restart: отправляет SIGINT, ждёт завершения текущих WS-соединений
```

---

## 4. Аварийный рестарт

Если `pm2 reload` не помогает (процесс завис, не реагирует на SIGINT):

```bash
# Принудительный перезапуск
ssh daria-dev 'pm2 kill messenger-core && pm2 start messenger/ecosystem.standalone.config.cjs --only messenger-core'

# Если PM2 daemon сам завис:
ssh daria-dev 'pm2 kill'  # убивает pm2 daemon
ssh daria-dev 'pm2 start ~/daria/ecosystem.refactor.config.cjs'  # поднимает все процессы
ssh daria-dev 'pm2 start ~/daria/messenger/ecosystem.refactor.config.cjs'  # messenger processes
```

**После рестарта:**
1. `ssh daria-dev 'pm2 list'` — убедиться, что статус `online`
2. `ssh daria-dev 'curl -s http://localhost:3002/health'` — проверить HTTP
3. Открыть messenger UI в браузере — убедиться, что WS-соединение устанавливается
4. Открыть http://152.53.176.165:9090 — убедиться, что dashboard отображает активные сессии

**Рестарт после перезагрузки сервера:**

Systemd linger настроен (`loginctl enable-linger claudecode`), PM2 автостарт включён. Если PM2 не поднялся автоматически:
```bash
ssh daria-dev 'pm2 resurrect'  # восстанавливает PM2 dump
ssh daria-dev 'pm2 save'       # обновить dump (после ручного восстановления)
```

Все tmux-сессии после ребута теряются — пересоздать через `claude-session create`.
