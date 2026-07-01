# 14. Data Architecture

Где живут какие данные, как между собой связаны, какой путь проходит запись и чтение. Следствие инварианта I6 (no cross-service DB access) — **каждый сервис владеет своей БД**, кросс-сервисные чтения идут через API или event-replicated проекции.

## 1. Карта хранилищ

| Хранилище | Кто пишет | Кто читает | Retention |
|---|---|---|---|
| **PostgreSQL 16** (OLTP, per-service) | сервис-владелец | сервис-владелец | forever |
| **TigerBeetle** (ledger) | `wallet` (Фаза 6+) | `wallet`, `audit-log` | forever |
| **ScyllaDB** (wide-row) | `feed`, social-graph (Фаза 7) | `feed`, `recommendations` | 1 год hot, 5 cold |
| **ClickHouse** (OLAP) | `audit-log`, `events` consumers | `recommendations`, analytics, admin | 5 лет |
| **Redis 7** (cache/ephemeral) | все, кому нужно | все | minutes–hours |
| **S3-compat (MinIO / Wasabi / B2)** | `media-pipeline` | всё, через CDN | forever |
| **Meilisearch → OpenSearch** | `search` | все, через API | реиндексируется |
| **pgvector → Qdrant** | `recommendations`, `search` | `recommendations` | реиндексируется |
| **Temporal DB** (Postgres под капотом) | `timeline-engine` (Temporal) | `timeline-engine` | per-workflow retention |

## 2. Principle of ownership

**Каждая таблица принадлежит одному сервису.** Других сервисов там нет ни как writer'ов, ни как readers. Даже read-only доступ запрещён — только через HTTP/gRPC API владельца.

Почему жёстко: иначе через 2 года появятся кросс-сервисные JOIN-ы и монолит превращается обратно.

## 3. Как сервис B узнаёт о данных сервиса A

Три паттерна, в порядке предпочтения:

### (a) Синхронный запрос (HTTP)

```
B → A: GET /users/{id}
A → B: { id, name, ... }
```

Подходит, когда: данные свежие нужны на запрос, latency ok, нагрузка низкая.

### (b) Event-replicated read-model

`A` публикует события в JetStream. `B` поддерживает свою таблицу-проекцию, обновляемую consumer'ом.

```
A: INSERT INTO orders → event app.daria.orders.created.v1
B: consumer → UPDATE b.orders_projection
B (внутри): читает из b.orders_projection, не запрашивая A
```

Подходит, когда: B часто читает A, допустима eventual-consistency, нагрузка высокая.

### (c) ClickHouse analytical read-model

Все события → consumer → ClickHouse. Admin-дашборды, отчёты, ML-фичи читают ClickHouse, не трогая OLTP.

## 4. Какие БД какие сервисы используют (Layer 2 + 3)

**Postgres per-service:**

| Сервис | Таблицы (ключевые) |
|---|---|
| `identity` | Zitadel внутренние (users, orgs, projects, scopes) |
| `credentials-vault` | credentials, verifications, issuers |
| `payments` | payment_attempts, refunds, disputes_proxy |
| `wallet` | accounts, transfers (Фаза 0-5), балансы в TigerBeetle от Фазы 6 |
| `notifications` | delivery_log, user_prefs, templates |
| `pattern-engine` | patterns, templates, forks, versions, lineages |
| `timeline-engine` | workflow_refs, timelines, steps, evidence_refs |
| `booking` | bookings, slots, inventory_holds |
| `inventory` | catalogs, items, availability |
| `auction-engine` | auctions, bids, clearing_log |
| `escrow-service` | escrows, conditions, releases |
| `financing-service` | loans, lease_contracts, mortgage_contracts, installments |
| `ownership-registry` | assets, owners, transfers, titles, liens |
| `authorship-registry` | templates_authorship, split_policies, royalty_ledger, lineage_graph |
| `subscription-engine` | subscriptions, members, access_windows |
| `reviews-ratings` | reviews, ratings, moderation_status |
| `disputes` | disputes, claims, decisions |
| `feed` | posts (hot), drafts |
| `media-pipeline` | media_objects, transcode_jobs |
| `inspection-service` | inspections, inspector_profiles, reports |
| `policy-engine` | (минимум) evaluation_log mirror, law-profiles из file-source |
| `moderation-review` | cases, assignments, decisions |
| `audit-log` | write-only в ClickHouse, WAL в Postgres для recovery |
| `trust-safety` | device_fingerprints, risk_scores |

## 5. Ledger — TigerBeetle (Фаза 6+)

До Фазы 6 — `wallet` работает на Postgres с double-entry constraints. С Фазы 6 — миграция на TigerBeetle:

- Формально верифицированный correct-by-construction.
- Двойная запись in-hardware, гарантия атомарности мульти-счётных переводов.
- Replay-audit из коробки.
- 1M TPS — достаточно для любых сценариев v6.

Схема счетов:
```
user_account     : per-user, per-currency
platform_revenue : per-jurisdiction
author_royalty   : per-author, per-template
escrow_account   : per-escrow-contract
liquidity_pool   : ликвидность для operations
```

## 6. ScyllaDB для social (Фаза 7)

- Лайки / матчи / follows — wide-row, write-heavy.
- Social graph: `user → follows → user`, `user → liked → post`, `user → matched → user`.
- Рекомендательный retrieval по графу.
- Rust-native runtime, Cassandra-совместимо.

## 7. ClickHouse для analytics и audit

- Все events из JetStream стекают в ClickHouse (через consumer).
- Партиции по времени, сжатие, быстрые агрегации.
- WORM-политика через `object_lock` в S3 cold tier (5 лет).
- Читается admin UI, recommendations training, compliance reports.

## 8. S3-compat для медиа

- Все фото, видео, документы, evidence.
- CDN поверх (Bunny / Cloudflare) для публичных.
- Private bucket с presigned URL для приватных (медкарты, паспорта).
- **Никогда не хранить медиа в Postgres**.

## 9. Meilisearch / OpenSearch для поиска

- Все `searchable` сущности реиндексируются consumer'ом событий.
- Meilisearch — MVP (быстрый, простой).
- OpenSearch — при росте (аналитика, complex queries).
- Index per-domain: `users`, `templates`, `properties`, `vehicles`, etc.

## 10. pgvector / Qdrant для векторов

- Эмбеддинги: тексты, фото, behavior-patterns.
- pgvector в общем Postgres recommendations — MVP (до 10M векторов).
- Qdrant — при росте (100M+), когда pg-версия перестаёт справляться.

## 11. Redis — только эфемерное

Разрешено:
- Presence, typing-indicators
- Session-tickets для WS (30s TTL)
- Hot-cache (с TTL)
- Rate-limiting counters
- Distributed locks (с TTL + fencing)

**Запрещено**:
- Хранить как primary source of truth что-либо долгоживущее.
- Использовать Redis для event-streaming (это работа JetStream).

## 12. Schema governance

- **Drizzle** для TS-сервисов (Postgres схемы).
- **sqlc / goose** для Go-сервисов (`wallet`, `gateway`, `location`, `media-pipeline`).
- **sqlx migrate** для Rust (`matching-engine` при Фазе 9).
- Каждая миграция — otдельный PR с автогенерацией SQL + ревью.
- Применение — через Argo CD pre-deploy hook.
- Rollback-стратегия документирована в каждой миграции.

## 13. Consistency-гарантии

| Операция | Гарантия |
|---|---|
| Мутация в одном сервисе | ACID per-service |
| Cross-service (saga) | Eventually consistent + compensating actions |
| Wallet transfers | Strong serializability (TigerBeetle) |
| Royalty distribution | Eventually consistent в audit, ACID per-transfer |
| Read через projection | Stale-reads до секунд |
| Search-index | Stale до 30s после события |

## 14. Правила миграции из v5.3

v5.3 хранит всё в одной Postgres БД main Nuxt app'а. v6 разделяет:

1. Фаза 1 — identity отделяется в свою БД (Zitadel).
2. Фаза 2 — каждый примитив получает свою БД, данные переносятся по **feature, не по таблице** (one domain at a time).
3. Фаза 5 — полный отказ от «studio Postgres»; существующие таблицы, не мигрированные, остаются в legacy-monolith `_archive/v5/`.
4. Фаза 6 — TigerBeetle заменяет Postgres-ledger в wallet.

## 15. Антипаттерны

- ❌ JOIN между таблицами двух сервисов — нарушение I6.
- ❌ «Общий Postgres» — даже если инстанс один, БД логически разделены, креды — разные.
- ❌ Синхронный cross-service request в hot-path без fallback.
- ❌ Кэшировать в Redis то, что в БД владельца может измениться — без invalidation-канала.
- ❌ Дублировать данные между двумя сервисами без явного event-replication канала.
- ❌ Медиа в Postgres как bytea.
- ❌ Хранить секреты, ключи, токены в любой БД без шифрования.
