# Playbook: rollback-bad-migration

Плохая DB migration ушла в prod. Как откатить безопасно.

## Scenario

- Migration применилась, но вызвала issue (broken queries, data corruption risk, performance).
- Нужно rollback без data loss.

## Step 0 — Assess

- [ ] What exactly went wrong? (corrupted data, broken queries, lock, slow?).
- [ ] How many rows affected?
- [ ] Is it reversible automatically?
- [ ] Impact on users right now?

If data-integrity risk — freeze writes (via feature-flag).

## Step 1 — Identify migration

```bash
# Drizzle
cat drizzle/NNNN_slug.sql                    # check migration
# Or via migrations table
psql -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5;"
```

## Step 2 — Decide: reverse vs forward-fix

### Reverse (preferred if possible)

If migration was additive (new column nullable, new table) → reverse migration:
```sql
-- reverse.sql
ALTER TABLE bookings DROP COLUMN new_field;
```

### Forward-fix (if destructive)

If migration dropped column / changed-type / moved-data:
- Cannot reverse без prior backup.
- Write **compensating migration** (fix applied on top).

## Step 3 — Restore from backup (worst case)

If data-corrupted:

```bash
# Point-in-time recovery
pg_restore --time "2026-05-10 14:30" <backup-file>

# Or promote replica (pre-migration state) to primary
```

См. `35-disaster-recovery.md §DR-1`.

## Step 4 — Replay events

Если БД restored к T-X, события между T-X и now в JetStream replay:

```bash
nats stream events replay --subject 'app.daria.booking.>' --from 2026-05-10T14:30Z
```

Consumers idempotent (I16) → reapply.

## Step 5 — Verify

- Row counts match expected.
- Sample data correct.
- Queries return expected results.
- No inconsistency across services (check projections).

## Step 6 — Unblock writes

- Remove freeze feature-flag.
- Monitor closely 24h.

## Step 7 — Post-mortem

- Why migration not caught in staging?
- Review migration-testing process.
- Add test case preventing similar.
- Update playbook / checklists.

## Prevention checklist (for future migrations)

- [ ] Test on staging с prod-like volume.
- [ ] Destructive changes review by 2+.
- [ ] Non-locking statements (`CREATE INDEX CONCURRENTLY`).
- [ ] Reversible if possible (or `forward-compat`).
- [ ] Feature-flag new-code behind, migrate data, flip flag.
- [ ] Pre-deploy backup verified.

## Antipatterns

- ❌ Run migration on Friday evening.
- ❌ Migration without tested reverse/forward fix.
- ❌ Destroy data mid-deployment before code updated.
- ❌ Migration + code change same PR (no back-out path).
- ❌ No backup verification before running.
- ❌ Rollback rush without cause analysis.
