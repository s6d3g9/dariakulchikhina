---
kind: db-migration
---

# Template: db-migration

Drizzle schema change + migration file. Use for any new table, column, index, or FK modification.

## Scope

- Add/alter tables in `server/db/schema/` (and mirror in `messenger/core/src/db/schema.ts` if messenger tables)
- Generate migration: `pnpm db:generate` — review SQL output before committing
- Apply migration: `pnpm db:migrate` on shared DB
- OCC columns: every new mutable table must have `version integer not null default 1` and `deleted_at timestamptz`
- Index coverage: add index for every FK column and every column used in WHERE filters

## Acceptance

- `pnpm db:generate` produces a clean SQL file with no unexpected drops
- `pnpm db:migrate` exits 0 on the shared dev DB
- Migration is reversible (manual rollback SQL documented in the PR description if not auto-generated)
- `SELECT * FROM <new_table> LIMIT 0` passes (table exists with correct columns)
- `pnpm exec vue-tsc --noEmit` exits 0 (schema types propagate without TS errors)
- `pnpm lint:errors` exits 0 — no new architectural violations

## Out-of-scope

- Service or handler logic changes (use `backend-module` or `backend-api` kind)
- Frontend changes
- Seed data or test fixtures (separate task)
- Changes to `drizzle/` migrations already shipped to production

## References

- [05 Architectural Patterns §5.4](../architecture-v5/05-architectural-patterns.md) — OCC + soft-delete rules
- [18 Repository Layer](../architecture-v5/18-repository-layer.md) — how repository consumes schema types
- [23 Project-Centric Messenger §2](../architecture-v5/23-project-centric-messenger.md) — messenger schema conventions
- [ADR-004 OCC Versioning](../architecture-v5/adr/004-occ-versioning.md)
- [ADR-005 Soft Delete](../architecture-v5/adr/005-soft-delete.md)
