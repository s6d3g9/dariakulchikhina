# Architecture Decision Records (ADR)

This directory records significant architectural decisions made in the Daria Design Studio v5 codebase. Each ADR captures the context, the chosen solution, its current status, and the consequences.

## Что такое ADR

ADR — короткий документ, фиксирующий **одно** архитектурное решение: почему оно было принято, какие альтернативы рассматривались, и что из этого вышло. ADR не заменяют основные arch-docs (01-23), но дают быстрый ответ на вопрос «а почему именно так?».

## Как читать ADR

Каждый ADR содержит четыре секции:
- **## Контекст** — проблема или ситуация, которая потребовала решения
- **## Решение** — что именно было выбрано и как реализовано
- **## Статус** — `Принято` / `Устарело` / `Заменено` (ссылка на преемника)
- **## Последствия** — trade-offs, новые ограничения, что изменилось

## Как добавить новый ADR

1. Скопируй шаблон:
   ```
   NNN-<kebab-title>.md
   ```
   где `NNN` — следующий порядковый номер (трёхзначный, дополненный нулями).
2. Заполни все четыре секции.
3. Добавь строку в таблицу ниже.
4. Добавь ссылку в `docs/architecture-v5/INDEX.md` в секцию «Операционные шаблоны».
5. Запусти `pnpm docs:v5:verify`.

## Индекс

| ADR | Заголовок | Статус |
|-----|-----------|--------|
| [001](./001-cursor-pagination.md) | Cursor-Based Pagination для мессенджера | Принято |
| [002](./002-ws-ticket-auth.md) | Ticket-Based WebSocket Auth | Принято |
| [003](./003-ddd-lite.md) | DDD-lite: тонкие handlers + service/repository | Принято |
| [004](./004-occ-versioning.md) | Optimistic Concurrency Control через поле `version` | Принято |
| [005](./005-soft-delete.md) | Soft Delete через поле `deleted_at` | Принято |
