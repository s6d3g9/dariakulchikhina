---
kind: backend-module
---

# Template: backend-module

Service and repository layer work inside `server/modules/<domain>/`. Use when the task touches business logic, persistence queries, or the service/repository boundary — without adding new API routes.

## Scope

- Create or update `<domain>.service.ts` — pure business logic, no Drizzle imports
- Create or update `<domain>.repository.ts` — all Drizzle queries, returns domain types
- Services throw `DomainError` subclasses only; never `createError` from h3
- Repository returns `null` / empty array / `boolean`; never throws HTTP errors
- Repository never accepts `H3Event`; service may accept it only for cookie side-effects
- Update `<domain>.types.ts` if domain types change
- ESLint `no-restricted-imports` enforces: `drizzle-orm` and `~/server/db/schema*` forbidden in `*.service.ts`

## Acceptance

- `pnpm lint:errors` exits 0 — no `drizzle-orm` imports in service files
- `pnpm exec vue-tsc --noEmit` exits 0
- Unit tests (if present) pass without a real DB connection
- Service functions return domain types, not raw Drizzle rows
- Repository follows the five signature patterns from [§18.3](../architecture-v5/18-repository-layer.md): `findX`, `listX`, `createX`, `updateX`, `deleteX`
- `runInTransaction` helper used for multi-step mutations; transaction owned by repository, not service

## Out-of-scope

- New API route registration (use `backend-api` kind)
- DB schema changes (use `db-migration` kind first)
- Frontend changes

## References

- [03 Backend Layer](../architecture-v5/03-backend-layer.md) — module layout rules
- [18 Repository Layer](../architecture-v5/18-repository-layer.md) — service/repository split, signature patterns
- [19 Error Handling](../architecture-v5/19-error-handling.md) — DomainError hierarchy
- [ADR-003 DDD-lite](../architecture-v5/adr/003-ddd-lite.md)
- [ADR-004 OCC Versioning](../architecture-v5/adr/004-occ-versioning.md)
