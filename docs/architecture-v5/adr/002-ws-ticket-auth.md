# ADR-002: Ticket-Based WebSocket Auth

## Контекст

WebSocket-соединения не могут читать HTTP-only cookies напрямую при апгрейде соединения в браузере. Messenger — отдельный процесс (`messenger/core`) и не имеет доступа к сессионному хранилищу основного Nuxt-приложения. Дублировать логику авторизации (HMAC-cookie, session lookup) в messenger создаёт security debt и tight coupling.

Альтернативы, которые рассматривались:
- JWT в query string — lifetime management сложнее, секрет нужно шарить между процессами.
- Shared session DB (Postgres) — messenger становится зависимым от основного Postgres напрямую (нарушает ограничение §5.9).
- Cookie propagation через proxy — дополнительная инфраструктура.

## Решение

**One-time Redis ticket** с коротким TTL:

1. Фронт запрашивает `POST /api/chat/ws-ticket` (основное Nuxt-приложение).
2. Nuxt проверяет HMAC-cookie, генерирует случайный токен, сохраняет в Redis: `SET ws_ticket:<token> {userId, ...} EX 30`.
3. Фронт открывает WS: `wss://messenger.daria.com?ticket=<token>`.
4. `messenger/core` при connect читает Redis: `GET ws_ticket:<token>`. Если существует — удаляет ключ (`DEL`) и открывает соединение. Если нет — закрывает с кодом 401.

TTL: 30 секунд. Ключ одноразовый (DEL после успешной проверки).

## Статус

Принято. Зафиксировано как обязательный паттерн в [05 Architectural Patterns §5.1](../05-architectural-patterns.md) и [CLAUDE.md](../../../../CLAUDE.md) (правило №4).

## Последствия

- **Redis — обязательная зависимость** messenger/core для auth. Redis недоступен → новые WS-соединения не открываются.
- **30-секундное окно** — достаточно для браузера, но требует, чтобы ticket-запрос и WS-открытие происходили в одной пользовательской сессии без задержек.
- **Ticket одноразовый** — replay attacks невозможны. При переподключении (network drop) фронт должен запросить новый ticket.
- **Нет per-message auth** — аутентификация только при открытии соединения. Авторизацию на уровне комнат/событий мессенджер делает сам по `userId` из ticket.
- **Новые сервисы** не могут читать cookies напрямую — только через ticket или REST API основного app.
