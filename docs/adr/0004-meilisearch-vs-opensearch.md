# ADR-0004: Meilisearch vs OpenSearch для lexical search

- **Статус**: Accepted
- **Дата**: 2026-04-18
- **Решение**: Meilisearch MVP, OpenSearch при scale
- **Ответственный**: Search team

## Контекст

Нужен full-text search engine.

## Альтернативы

### Meilisearch

Плюсы:
- Дiзайн «Algolia в open-source».
- Настройка в 5 минут.
- Typo-tolerance из коробки.
- Быстрый (< 50ms для small-medium).
- Rust-based, low memory.

Минусы:
- Не scale-out (single-node, verti only).
- Ограничения на index size (~100GB практичных).
- Advanced queries less rich чем ES.

### OpenSearch (Elasticsearch fork)

Плюсы:
- Enterprise-grade, проверен на очень большой scale.
- Cluster-based, horizontally scalable.
- Rich query language.
- Lots of integrations.

Минусы:
- Heavy ops.
- Memory-hungry.
- Slower setup.
- JVM stack (разделяет focus от нашего TS/Go).

### Прочие

- **Typesense** — похож Meilisearch, smaller community.
- **Algolia** (SaaS) — vendor-lock, per-query pricing.
- **Postgres FTS** — для small kind достаточно, но для universal — слаб.

## Решение

- **Phase 0-6**: Meilisearch. 
  - Один или 2 instances (per-region).
  - Index-per-kind.
- **Phase 7+**: мигрируем на OpenSearch когда:
  - Data > 100GB per index, или
  - Multi-region-search требуется, или
  - Advanced queries не поддерживаются Meilisearch.

Migration strategy — dual-write + cutover.

## Последствия

### Положительные
- Fast time-to-ship.
- Low ops complexity initial.

### Отрицательные
- Еще одна миграция на horizon.
- Ограничения при agresive growth.

## Revisit

Фаза 5-6 с реальными нагрузочными цифрами.
