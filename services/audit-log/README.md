# services/audit-log

Layer 6 — Governance. Append-only compliance-grade audit stream.

См. инвариант I17 + [docs/architecture-v6/18-observability-ops.md §8](../../docs/architecture-v6/18-observability-ops.md).

## Что делает

- Consumes ALL domain events from JetStream.
- Filters / enriches / stores в WORM storage.
- Provides compliance-grade read API (for regulators, forensics).
- Generates transparency reports.

## Storage

- **ClickHouse** для queryable history.
- **S3 cold tier с object-lock** (WORM) — 5-year retention финансовые / governance, 10-year медицинские.
- **Cross-region replication** для compliance.

## Что логируется

- Financial transactions (wallet, royalty, refund).
- Identity changes (login, password, MFA).
- Policy decisions (allow / distill / deny).
- Moderation rulings.
- Permissions grants / revokes.
- Admin operations.
- Data access на sensitive data.

## API

```
GET    /audit/events?filter=...             # query (restricted scope)
GET    /audit/user-trail/:userId            # user's full trail (GDPR request)
GET    /audit/export?from=&to=&format=pdf   # regulator export
GET    /audit/integrity-check/:event-id     # hash-chain verification
```

Access restricted — only `governance:compliance` / `security` roles.

## Invariants

- **Append-only** — удаления физически невозможны (S3 object-lock).
- **Immutable** — hash-chain per-event для forgery detection.
- **Cross-region** — для regulatory resilience.

## Integrations

- **Consumes**: `app.daria.*.*` events (all streams).
- **Не публикует** никаких events (pure sink).

## Фаза

Фаза 2 (MVP ClickHouse writer), Фаза 6 (full WORM + cross-region).
