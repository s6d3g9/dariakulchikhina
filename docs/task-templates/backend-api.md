---
kind: backend-api
---

# Template: backend-api

New or updated HTTP endpoint in `server/api/**`. Handler must remain thin — all business logic stays in `server/modules/<domain>/`.

## Scope

- Create or update handler file(s) in `server/api/<resource>.<method>.ts`
- Handler responsibility: read validated input → call service → return response shape
- No Drizzle imports in handler — all DB access goes through service → repository
- Validate request body with `readValidated(event, Schema)` from `server/utils/validation.ts`
- Throw `DomainError` subclasses from service; error-handler plugin converts to HTTP codes
- Update `shared/types/**` if the API contract changes (new request/response types)

## Acceptance

- `curl` or supertest against all new endpoints returns correct status codes and JSON shape
- Handler file imports zero `drizzle-orm` or `~/server/db/schema` symbols (ESLint enforced)
- `pnpm lint:errors` exits 0
- `pnpm exec vue-tsc --noEmit` exits 0
- Errors use the wire-format from [§19.5](../architecture-v5/19-error-handling.md): `{ error: { code, message, ...context } }`
- OCC: PATCH/PUT endpoints accept `version` from client and return 409 on mismatch

## Out-of-scope

- DB schema changes (use `db-migration` kind first)
- Business logic extraction into services (use `backend-module` kind)
- Frontend changes

## References

- [03 Backend Layer](../architecture-v5/03-backend-layer.md) — DDD-lite module layout
- [18 Repository Layer](../architecture-v5/18-repository-layer.md) — service/repository split
- [19 Error Handling](../architecture-v5/19-error-handling.md) — domain errors + HTTP mapping
- [05 Architectural Patterns §5.4](../architecture-v5/05-architectural-patterns.md) — OCC semantics
- [ADR-003 DDD-lite](../architecture-v5/adr/003-ddd-lite.md)
