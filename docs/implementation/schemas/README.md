# Database Schemas Reference

Полные Drizzle schemas для каждого сервиса. Используется как source-of-truth для Phase 2 implementation.

## Соглашения

- Table names: `snake_case`, plural (`bookings`, не `booking`).
- Column names: `snake_case`.
- Primary keys: `id` UUID v7 (time-ordered).
- Timestamps: `timestamptz` NOT NULL, `created_at` / `updated_at`.
- OCC: `version` integer NOT NULL DEFAULT 1 (инвариант I9).
- Soft-delete: `deleted_at timestamptz NULL` (I9).
- Money: integer cents (`amount_cents bigint`), currency `varchar(3)` ISO-4217.
- Foreign keys: explicit с `ON DELETE` rules.
- Indexes: на все foreign keys + frequent query patterns.

## Services с schemas

- [identity-db.md](identity-db.md) — identity (Zitadel внутренние + extensions)
- [wallet-db.md](wallet-db.md) — wallet + balances + transfers
- [payments-db.md](payments-db.md) — charges + refunds
- [pattern-engine-db.md](pattern-engine-db.md) — Pattern-Cards + templates + lineage
- [timeline-engine-db.md](timeline-engine-db.md) — timelines + steps + evidence
- [booking-db.md](booking-db.md) — bookings + holds + availability
- [authorship-registry-db.md](authorship-registry-db.md) — templates + split-policies + royalty-ledger
- [ownership-registry-db.md](ownership-registry-db.md) — assets + transfers
- [subscription-engine-db.md](subscription-engine-db.md) — subscriptions + lifecycle
- [messenger-db.md](messenger-db.md) — conversations + messages
- [policy-engine-db.md](policy-engine-db.md) — evaluation log mirror
- [audit-log-db.md](audit-log-db.md) — audit events (ClickHouse)

Каждая schema даёт:
1. Drizzle TS definitions.
2. Generated SQL migration.
3. Rationale (indexes, why этот shape).
4. Expected query patterns.
