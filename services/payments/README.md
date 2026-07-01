# services/payments

Layer 2 — Platform Service. PSP-агрегатор. Interact с Stripe / ЮKassa / CloudPayments / PayPal / crypto.

См. полную спеку: [docs/architecture-v6/43-payments-providers.md](../../docs/architecture-v6/43-payments-providers.md).

## Что делает

- PSP routing per-region (primary → secondary → crypto fallback).
- Charge / refund / dispute lifecycle.
- Webhook handling + idempotent processing.
- 3DS / SCA orchestration.
- Daily reconciliation.
- Token-based payment-method storage (PCI SAQ-A scope).

## Не делает

- Balance tracking (→ `services/wallet`).
- Fund holding (→ `services/escrow-service`).
- Financing / credit (→ `services/financing-service`).

## Рантайм

- TypeScript, Nitro.
- Postgres `payments_db`:
  - `charges`, `refunds`, `disputes_proxy`, `payment_methods` (tokens only)
  - `webhooks_log` для audit/replay.

## API

```
POST   /charges                           # create charge (idempotent)
GET    /charges/:id
POST   /charges/:id/confirm               # 3DS complete
POST   /refunds
POST   /webhook/:psp                      # callbacks
GET    /reconciliation/:date              # daily summary
POST   /payment-methods                   # tokenize
GET    /users/:id/payment-methods
```

## PSP config

`platform/psp-config/<region>.yaml` per-region routing.

## Integrations

- **Publishes**: `charge-created/confirmed/failed`, `refund-completed`, `dispute-opened/resolved`.
- **Consumes**: `wallet.refund-requested`.
- **Calls**: External PSPs.

## Инварианты

- I4, I5, I6, I9 (OCC на charges), I16 (idempotent webhooks), I17 (в audit-log).
- Никогда storing PAN (только tokens).
- Все webhook требуют signature verification.

## Фаза

Фаза 1 (Platform core).

## Статус

Skeleton only.
