# 43. Payments & PSP Providers

Платёжный слой v6 — `services/payments` + `services/wallet`. Payments — внешние PSP-интеграции (Stripe / ЮKassa / CloudPayments / PayPal / крипта). Wallet — internal ledger (Postgres → TigerBeetle в Фазе 6+).

## 1. Разделение ответственности

| Сервис | Что делает | Что не делает |
|---|---|---|
| `payments` | Interact с PSP (charge / refund / webhook / reconcile) | Хранить balances |
| `wallet` | Internal ledger, accounts, transfers | Talk к PSP |
| `escrow-service` | Hold funds until condition | Own payments logic |
| `financing-service` | Loans, leases, BNPL | External financing partners |

## 2. PSP routing strategy

**Per-region** PSP selection:

| Region | Primary PSP | Secondary | Crypto fallback |
|---|---|---|---|
| RU | ЮKassa | CloudPayments | USDT (TRC-20) |
| EU | Stripe | Adyen | USDC (ERC-20) |
| US | Stripe | Braintree | USDC |
| Global / others | Stripe | PayPal | USDT |

Routing logic:
```
1. user.region → primary PSP
2. If primary declined → secondary
3. If all fail → user can opt-in to crypto (если regulated OK)
4. Fraud / high-risk → enhanced PSP (e.g. Stripe Radar)
```

Implemented в `services/payments/router.ts` с config в `platform/psp-config/<region>.yaml`.

## 3. Payment methods

Per-region available methods:

```yaml
# platform/psp-config/RU.yaml
methods:
  - card-mir
  - card-visa        # если санкции не блокируют
  - sbp              # СБП через ЮKassa
  - wallet-yandex
  - sberpay
  - apple-pay        # через PSP
  - google-pay

# platform/psp-config/EU.yaml
methods:
  - card
  - sepa-direct-debit
  - ideal            # NL
  - bancontact       # BE
  - giropay          # DE
  - apple-pay
  - google-pay
  - paypal
```

UI показывает available methods per-user-region.

## 4. Charge flow

```
User → UI «Pay»
  ▼
payments.createCharge({userId, amount, currency, method, orderRef, idempotencyKey})
  ▼
  ├── Select PSP (primary per-region)
  ├── PSP.charge() — usually returns PSP-redirect/3DS URL
  ▼
UI redirects to PSP / shows PSP modal
  ▼
PSP processes → callback webhook → our endpoint
  ▼
payments.webhook.receive() 
  ├── verify signature
  ├── idempotent process (dedup by idempotencyKey + pspTxId)
  ├── update charge.state
  └── publish event app.daria.payments.payment-confirmed.v1
  ▼
wallet receives event
  ├── wallet.charge(amount → user.escrow)
  └── triggers downstream (authorship-registry distribution, timeline advance)
```

## 5. 3DS / SCA

- PSD2 SCA — обязательно для EU transactions.
- 3DS — через PSP (Stripe / Adyen handles).
- Fallback UI — если 3DS fails, show retry with different method.

## 6. Refund flow

```
Trigger → payments.refund({chargeId, amount?, reason})
  ▼
PSP.refund()
  ▼
webhook → payments.webhook.receive()
  ▼
publish app.daria.payments.refund-completed.v1
  ▼
wallet + authorship-registry compensating transfers
  ▼
audit-log
```

**Partial refunds** supported. Idempotency через refundId.

## 7. Chargebacks / disputes

Dispute flow:

1. PSP notifies chargeback webhook.
2. `services/disputes` opens case.
3. Evidence collection (audit-log, user-communications, delivery-confirmation).
4. PSP dispute resolution (win/lose).
5. If lose → wallet compensating transfer + reputation hit to related parties.

Metrics:
- Chargeback rate (should < 1% per Stripe Radar).
- Win rate (evidence quality).

## 8. Reconciliation

**Daily job** (Temporal):

- Download PSP daily-statement.
- Compare с internal `payments` records.
- Mismatches → alerts → manual review.
- Adjustments via wallet compensating transfers.

**Monthly closing**:
- Per-currency balance.
- PSP fees calculated.
- Reported to finance.

## 9. Crypto payments (Phase 9+)

- **Stablecoins only on MVP** (USDT / USDC).
- Chains: TRC-20 (cheap), ERC-20 (standard), SOL (fast).
- Receive: generate per-user address, monitor deposits.
- Confirmations required: 3 (TRC-20), 12 (ETH), 32 (SOL).
- Conversion to fiat — через exchange partner.
- On-chain fees — user bears (transparency).

Audit:
- `app.daria.payments.crypto-received.v1` с tx-hash, block-number.
- Chain-state snapshot для reconciliation.

## 10. PSP fees model

Typical fees:
- **Card**: 2.9% + $0.30 (Stripe US), 3-5% (ЮKassa RU).
- **SEPA**: €0.15 + 1%.
- **SBP**: ~0.7% (регулируется ЦБ РФ).
- **Crypto**: gas + 0-1% exchange fee.

**Who pays**:
- Platform bears fees; charges user the gross amount.
- Creators / providers receive net after fee allocation per split-policy.
- Transparency: user-receipt shows «includes X fee».

## 11. Subscription billing

Managed через PSP recurring mechanisms:
- **Stripe Subscriptions** — US/EU.
- **ЮKassa recurring tokens** — RU.
- **Manual** (cron+charge-token) — fallback для less-feature PSPs.

`subscription-engine.renew` triggers `payments.chargeToken()` per-subscription.

## 12. Payment method storage

**Tokens only**, not PAN:
- PSP возвращает `payment_method_id` после first-charge.
- Мы храним token в `payments_db.user_payment_methods`.
- Next-charges — по token, no PCI scope.
- Token-deletion — user-deletable; auto-removed при expiry.

**PCI DSS**: через tokenization, мы SAQ-A (minimal scope). Кроме банковских features (Phase 8+), где возможен SAQ-D с full attestation.

## 13. Fraud prevention

- **PSP fraud signals** (Stripe Radar, CloudPayments Antifraud).
- **Velocity checks**: N charges / hour per user / IP.
- **3DS force** для high-risk.
- **Trust-safety** device fingerprint cross-check.
- **Manual review queue** для flagged.

High-risk → `policy-engine` может deny before charge starts.

## 14. API

```
POST /payments/charges                     # create charge
GET  /payments/charges/:id                 # status
POST /payments/charges/:id/confirm         # if requires client action
POST /payments/refunds                      # refund a charge
POST /payments/webhook/:psp                 # PSP callbacks

POST /payments/payment-methods              # tokenize
GET  /payments/payment-methods              # list user's
DELETE /payments/payment-methods/:id

GET  /payments/reconciliation/:date         # daily summary
GET  /payments/fees/:userId?period=...      # fees paid
```

## 15. Integration в timeline

Payment — это `external` step в timeline (см. `10-timeline-engine.md §3`):

```yaml
- id: payment
  kind: external
  title: Payment
  handler: payments.createCharge
  compensate: payments.refund
  timeout: 15m
  evidence: receipt-pdf
```

При failure compensation chain отменяет upstream steps.

## 16. Observability

- `payments.charge.success_rate{psp, region, method}`
- `payments.charge.latency_ms{psp}`
- `payments.webhook.delay_seconds{psp}` (должно быть секунды)
- `payments.fees.cents{psp, currency}` (cost tracking)
- `payments.chargeback.rate{psp}`
- `payments.reconciliation.mismatches{date}` (должно быть 0)

## 17. Антипаттерны

- ❌ Хранить PAN (только token).
- ❌ Skip webhook signature verification.
- ❌ Не idempotent webhook processing — double-charge.
- ❌ Manual reconciliation.
- ❌ Single PSP — no fallback.
- ❌ Crypto без clear confirmation policy → потенциальный reorg-loss.
- ❌ Charge без idempotency-key.
- ❌ Storing PSP secrets в code/config (только Infisical).
- ❌ Webhook endpoint без rate-limit (DDoS / replay).
- ❌ Discount/promo codes в payments вместо отдельного promotions service.
