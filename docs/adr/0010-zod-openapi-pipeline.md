# ADR-0010: Contract-first via Zod → OpenAPI

- **Статус**: Accepted
- **Дата**: 2026-04-18
- **Решение**: TS-first через Zod с авто-генерацией OpenAPI
- **Ответственный**: Platform / DX team

## Контекст

API contracts между services + публичный API — нужен single source of truth. Две классические школы:
1. **Spec-first**: OpenAPI YAML → genericate code.
2. **Code-first**: TypeScript types → generate OpenAPI.

## Альтернативы

### Spec-first (OpenAPI as source)

Плюсы:
- Language-agnostic (Go/Rust/Python клиенты родные).
- Design-time discussions вокруг spec.
- Mature tooling (Swagger).

Минусы:
- OpenAPI YAML less-powerful чем TS types (discriminated unions, branded types).
- Round-trip TS generation менее эргономична.
- Не run-time validation без дополнительных libraries.

### Code-first (Zod → OpenAPI)

Плюсы:
- **Runtime validation** из коробки.
- **Type-inference** в TS сервисах.
- **Refactoring-friendly** (rename field → всё обновляется).
- Ergonomic DX.

Минусы:
- Non-TS clients получают generated OpenAPI (lossy для complex TS types).
- Need `zod-to-openapi` adapter.

### TypeSpec / tRPC / GraphQL

- TypeSpec — новый, менее mature.
- tRPC — только TS-to-TS, не для public API.
- GraphQL — слишком сложная для CRUD-heavy backend.

## Решение

**Zod-first с OpenAPI export**:

```ts
// packages/contracts-domain/booking.ts
export const ZBookingRequest = z.object({
  slotId: z.string().uuid(),
  userId: z.string(),
  // ...
}).openapi('BookingRequest')

export const ZBookingResponse = z.object({ /* ... */ }).openapi('BookingResponse')
```

CI generates `openapi.json` per-service.

Non-TS clients (Go `wallet`, Rust `matching-engine` later) generate OpenAPI → code.

## Последствия

### Положительные
- Single source в TS.
- Runtime validation.
- Excellent DX для TS-heavy backend.
- OpenAPI auto-published для integrations.

### Отрицательные
- Non-TS services work на generated OpenAPI, lossy edge cases.
- Zod schema complexity if too-deep unions.
- `zod-to-openapi` periodically needs updates.

## Revisit

Phase 9 (polyglot services expand): if Go/Rust services grow, consider adding proto-based for internal-only (sync between Go и Rust). TS remains dominant.
