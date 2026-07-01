# API Specs — OpenAPI за service

Полные OpenAPI 3.1 specs для каждого сервиса. Генерируются из Zod schemas (ADR-0010), но hand-written versions здесь — для Phase-2 implementation reference.

## Files

- [wallet.openapi.yaml](wallet.openapi.yaml) — wallet HTTP API
- [payments.openapi.yaml](payments.openapi.yaml) — payments API
- [pattern-engine.openapi.yaml](pattern-engine.openapi.yaml) — pattern CRUD + fork + publish
- [timeline-engine.openapi.yaml](timeline-engine.openapi.yaml)
- [authorship-registry.openapi.yaml](authorship-registry.openapi.yaml)
- [booking.openapi.yaml](booking.openapi.yaml)
- [subscription-engine.openapi.yaml](subscription-engine.openapi.yaml)
- [messenger.openapi.yaml](messenger.openapi.yaml)
- [policy-engine.openapi.yaml](policy-engine.openapi.yaml)
- [identity.openapi.yaml](identity.openapi.yaml) — references Zitadel native + our extensions

Все specs:
- Headers: `Authorization: Bearer <JWT>` (кроме public endpoints).
- Error responses: unified `{ error: { code, message, traceId, details? } }`.
- Pagination: cursor-based (`?cursor=...&limit=N`) для list endpoints.
- Idempotency: `Idempotency-Key` header для mutating endpoints.
- Tracing: `traceparent` header propagated.
