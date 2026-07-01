# Playbook: investigate-slow-query

Debug медленного query (SQL, search, ClickHouse, cross-service). Systematic approach.

## Signal

- Alert: `<service>.query.p95 > target`.
- User report: «slow loading».
- Trace with long span.

## Step 1 — Identify

```
SigNoz traces → найти slow trace
     │
     ▼
Identify span: какой сервис / операция / sql / external
     │
     ▼
Local reproduction (с prod-like data volume)
```

## Step 2 — Categorize

- **DB query slow** — run EXPLAIN / EXPLAIN ANALYZE.
- **N+1 pattern** — too many small queries in loop.
- **Missing index** — expected covered, isn't.
- **Table scan** — query planner выбирает seq scan.
- **Lock contention** — waiting on locks.
- **Network** — external API slow.
- **Serialization** — marshal/unmarshal big payload.
- **Computational** — pure CPU in code.

## Step 3 — Fix priorities

### (a) N+1 — usually biggest win

```ts
// ❌
for (item of items) {
  const details = await db.query(`SELECT * FROM details WHERE item_id = ?`, item.id)
}

// ✅
const ids = items.map(i => i.id)
const allDetails = await db.query(`SELECT * FROM details WHERE item_id = ANY(?)`, ids)
```

### (b) Add index

```sql
EXPLAIN ANALYZE SELECT * FROM bookings WHERE user_id = 'u_123' AND deleted_at IS NULL;
-- see if index hit

CREATE INDEX CONCURRENTLY idx_bookings_user_active ON bookings (user_id) WHERE deleted_at IS NULL;
```

### (c) Optimize query

- SELECT only needed columns.
- Move joins down (filter first, join second).
- Use materialized-view для complex aggregations.
- Batch statements.

### (d) Caching

- Redis cache для hot-queries (with invalidation).
- Don't cache если data-fresh required.

### (e) Async / defer

- If not user-blocking — move to background job.
- Return faster, compute async.

## Step 4 — Cross-service

Trace across services:

- **Synchronous chain** слишком long → reduce hops.
- **Consider event-replicated projection** (14-data-architecture §3b).
- **Parallelize**: 3 fetches = max(time), не sum(time).

## Step 5 — External API

Slow external (GDS, PSP):

- Cache responses aggressively.
- Retry с timeout.
- Circuit-breaker (15-integration-patterns §8).
- Pre-fetch / warm cache.

## Step 6 — Validate

- Deploy fix.
- Monitor p95 for 24h.
- Ensure no regression elsewhere.
- Update runbook если discovered-pattern is common.

## Common tools

- Postgres: `EXPLAIN ANALYZE`, `pg_stat_statements`.
- ClickHouse: `EXPLAIN`, sample profiling.
- Meilisearch: query analyser в UI.
- SigNoz: flame-graphs.

## Антипаттерны

- ❌ Add index without running EXPLAIN first.
- ❌ Cache без invalidation strategy.
- ❌ Fix one query, ignore related patterns.
- ❌ «Just throw hardware at it» без root cause.
- ❌ Skip measuring after fix.
