# services/financing-service

Layer 3 — Domain Primitive. Loans / lease / mortgage / BNPL.

## Что делает

- Credit scoring (internal + 3rd-party bureaus).
- Loan origination (application → approval → funding).
- Mortgage processing (collateral, title check через ownership-registry).
- Leasing contracts.
- BNPL (Buy Now Pay Later).
- Installment schedule management (через Temporal).
- Collections (overdue workflow).

## Рантайм

- TypeScript, Postgres `financing_db`.
- Integration с BaaS-partners (Phase 8+).

## Use cases

- `car-purchase-*` с car-loan / leasing.
- `real-estate-purchase-*` с mortgage.
- `equipment-purchase-b2b` с leasing.
- Subscription BNPL (pay monthly instead of upfront).

## API

```
POST /applications                           # new application
GET  /applications/:id
POST /applications/:id/approve               # (admin)
POST /applications/:id/reject
POST /contracts                              # sign contract
GET  /users/:id/contracts
GET  /contracts/:id/schedule                 # installments
POST /contracts/:id/payments                 # early payment
```

## Integrations

- **Calls**: `wallet.transfer`, `ownership-registry.lien`, `credentials-vault` (income proof), `identity` (KYC), external credit bureaus.
- **Publishes**: `loan-approved/rejected`, `payment-received`, `contract-defaulted`.
- **Consumes**: `wallet.transfer-completed` для payment matching.

## Compliance

- Per-jurisdiction rules через `policy-engine`.
- Interest caps, disclosure requirements.
- AML on large loans.

## Phase

Фаза 4 (MVP BNPL), Фаза 5 (car loans), Фаза 8 (full banking suite).
