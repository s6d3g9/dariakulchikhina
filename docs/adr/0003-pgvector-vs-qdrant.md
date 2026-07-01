# ADR-0003: pgvector vs Qdrant для semantic search

- **Статус**: Accepted
- **Дата**: 2026-04-18
- **Решение**: pgvector MVP, Qdrant при > 10M vectors
- **Ответственный**: Architecture Office, search team

## Контекст

v6 требует semantic search (query ↔ content embeddings). Нужен vector store.

## Альтернативы

### pgvector (Postgres extension)

Плюсы:
- Один сервис (Postgres уже есть).
- ACID, transactional с остальными данными.
- Low ops cost.
- SQL-friendly для filtering.

Минусы:
- Scale limit: beyond ~10M vectors производительность падает.
- Limited index options (IVFFlat, HNSW — доступен но slow compared to dedicated).

### Qdrant

Плюсы:
- Dedicated vector DB, optimized.
- HNSW index native, fast.
- Scales well to 100M+.
- Filtering support.

Минусы:
- Extra service, ops overhead.
- Eventually-consistent с основной data.
- Learning curve.

### Альтернативы рассмотрены, rejected

- **Pinecone** — SaaS, vendor-lock, data-transit.
- **Weaviate** — heavy, Java.
- **Chroma** — young, not prod-grade.
- **Milvus** — enterprise, complex ops.

## Решение

- **Phase 0-6**: pgvector. Достаточно до ~10M vectors.
- **Phase 7+** (Social vertical с video/reels): мигрируем на **Qdrant** когда:
  - vectors > 10M, или
  - query latency p95 > 100ms, или
  - scale-out требуется.

Miграция — отдельный проект (dual-write + cutover).

## Последствия

### Положительные
- Быстрый старт.
- Меньше ops нагрузки в early stages.

### Отрицательные
- Миграция — нетривиальная работа когда понадобится.
- До миграции — limitation на user-embeddings size.

## Revisit

В Фазе 6 (managed k8s) — запланировать миграцию на Qdrant или Pgvector-scale (Timescale?) по актуальным требованиям.
