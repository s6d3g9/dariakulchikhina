# services/subscription-engine

Layer 3 — Domain Primitive. Универсальные подписки на людей / templates / communities / bundles.

См. полную lifecycle: [docs/architecture-v6/31-subscription-lifecycle.md](../../docs/architecture-v6/31-subscription-lifecycle.md).

## Что делает

- Create / track / renew / cancel / gift / resale subscriptions.
- State-machine management (trial → active → past_due → cancelled → expired).
- Integrate с PSP (renewal charges) через `services/payments`.
- Royalty-route каждый renewal через `authorship-registry`.
- Expiry via Temporal scheduled workflows.

## Рантайм

- TypeScript, Postgres `subscription_db`:
  - `subscriptions` — main records
  - `subscription_members` — для family/team
  - `access_windows` — time-boxed grants
  - `subscription_transfers` — resale history

## API

```
POST   /subscriptions
GET    /subscriptions/:id
POST   /subscriptions/:id/cancel
POST   /subscriptions/:id/pause
POST   /subscriptions/:id/resume
POST   /subscriptions/:id/change-plan
POST   /subscriptions/:id/gift                # gift to someone
POST   /subscriptions/:id/transfer             # resale
POST   /subscriptions/:id/members              # add family member
GET    /users/:id/subscriptions
GET    /users/:id/access/:resourceId          # has-access check (for permissions)
```

## Integrations

- **Publishes**: 11 event-типов (см. `31-subscription-lifecycle.md` §9).
- **Consumes**: `payments.payment-confirmed/failed`, `disputes.ruling`.
- **Calls**: `wallet.charge/refund`, `authorship-registry.distribute`, `notifications.send`.

## Фаза

Фаза 2. Полноценно — Фаза 4 (creator economy).
