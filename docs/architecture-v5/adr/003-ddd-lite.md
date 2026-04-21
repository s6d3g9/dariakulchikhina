# ADR-003: DDD-lite: тонкие handlers + service/repository

## Контекст

После Wave 5 типичный `server/api/**` handler напрямую импортировал Drizzle и содержал 200-500 строк: валидацию, SQL-запросы, бизнес-правила, cookie side-effects. Это привело к:

- **Невозможности unit-тестирования**: чтобы протестировать бизнес-правило, нужен живой Postgres.
- **Рассеянности знания**: логика одного домена размазана по 10-20 handler-файлах.
- **ESLint baseline в 220 ошибок**: fat API handlers как главный источник архитектурных нарушений.
- **Цикличным зависимостям**: handlers знали о схеме БД; изменение схемы ломало handlers напрямую.

## Решение

**DDD-lite** — облегчённая версия Domain-Driven Design:

```
server/api/<resource>.<method>.ts    ← тонкий handler (read input → call service → return)
server/modules/<domain>/
  <domain>.service.ts                ← бизнес-логика, принимает repository
  <domain>.repository.ts             ← все Drizzle queries, возвращает domain types
  <domain>.types.ts                  ← domain types
```

Правила (ESLint-enforced):
- `*.service.ts` — **нельзя** импортировать `drizzle-orm` или `~/server/db/schema*`
- `server/api/**` — **нельзя** импортировать `drizzle-orm` напрямую
- `*.repository.ts` — не принимает `H3Event`, не бросает HTTP-ошибки

Services бросают `DomainError`-подклассы; `error-handler.ts` plugin маппит их в HTTP-коды.

Полная спецификация: [18 Repository Layer](../18-repository-layer.md) и [19 Error Handling](../19-error-handling.md).

## Статус

Принято. ESLint `no-restricted-imports` enforces граница. Lint ratchet зафиксирован на 0 ошибок (достигнуто в Wave 7, 2026-04-18).

## Последствия

- **Testability**: service принимает repository как аргумент — в тестах подменяется in-memory fake без Postgres.
- **Больше файлов**: каждый domain = минимум 3 файла (handler, service, repository). Оправдано для любого domain > 50 строк логики.
- **ESLint как строж**: нарушение границы — merge blocker (exit code 1 в CI).
- **Постепенная миграция**: handler может поэтапно выносить логику; старый код не ломается до финального переноса.
- **Baseline 220 ошибок** (fat handlers) — backlog Wave 8+. ESLint ratchet не позволяет их увеличивать.
