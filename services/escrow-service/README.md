# services/escrow-service

Layer 3 — Domain Primitive. Hold funds / assets until conditions met.

## Что делает

- Create escrow contract (buyer deposits, condition specified).
- Hold в `wallet.escrow` account (или assets в ownership-registry-frozen).
- Evaluate conditions (manual / automatic).
- Release to seller OR refund to buyer.
- Dispute flow integration.

## Use cases

- Used-car purchase (escrow till inspection passes).
- Freelance gig (escrow till deliverable accepted).
- Rental damage-deposit (escrow till checkout).
- Auction winning bid (escrow till transfer).
- Real-estate transactions.

## Рантайм

- TypeScript, Postgres `escrow_db`:
  - `escrows` (id, parties, amount, conditions, state)
  - `conditions` — denormalized per-escrow
  - `resolutions` — release/refund history

## States

```
created → funded → holding → 
  ├── released (condition met)
  ├── refunded (condition failed / timeout)
  └── disputed → ruling → release | refund
```

## API

```
POST   /escrows                              # create contract
POST   /escrows/:id/fund                     # buyer deposits
POST   /escrows/:id/evaluate                 # check conditions
POST   /escrows/:id/release                  # seller receives
POST   /escrows/:id/refund                   # buyer receives back
POST   /escrows/:id/dispute                  # open dispute
GET    /escrows/:id
```

## Integrations

- **Publishes**: `escrow-created/funded/released/refunded/disputed`.
- **Consumes**: `disputes.ruling`, `timeline.step-completed` (для conditions).
- **Calls**: `wallet.transfer`, `ownership-registry` для asset-freeze.

## Фаза

Фаза 2.
