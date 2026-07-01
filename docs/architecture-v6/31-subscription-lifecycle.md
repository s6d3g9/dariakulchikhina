# 31. Subscription Lifecycle

Подписки в v6 — универсальны: на людей, компании, курсы, templates, bundle'ы, communities. Один сервис `services/subscription-engine`, один lifecycle для всех. Эта спецификация фиксирует все состояния, переходы и интеграции.

## 1. Что такое subscription в v6

**Subscription** — временное владение access-правом + регулярный billing. Моделируется как особая форма ownership (`subscription-as-NFT`, см. `11-creator-economy.md` §7), с автоматической revenue-distribution через `authorship-registry` (инвариант I10).

Примеры:
- Подписка на автора (monthly tip)
- Подписка на курс (до его обновления)
- Подписка на template-pack «уход за Honda Civic»
- Community premium access
- Car-subscription (аренда машины на месяц)
- Streaming-фестиваль season-pass

## 2. Модель

```ts
type Subscription = {
  id: string
  kind: 'direct' | 'bundle' | 'community' | 'service'
  target: { kind: 'person' | 'template' | 'community' | 'bundle', id: string }
  holder: UserId
  members?: UserId[]                     // для семейных / командных

  plan: {
    period:   'monthly' | 'quarterly' | 'yearly' | 'one-time'
    priceCents: number
    currency: string
    trialDays?: number
    introductoryOffer?: { priceCents, durations, originalPriceCents }
  }

  // Access-window
  activeFrom: Timestamp
  activeUntil: Timestamp                 // рассчитывается от plan.period
  state: 'trial' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired' | 'refunded'

  // Lifecycle
  renewalAt?: Timestamp                   // следующий charge
  cancelledAt?: Timestamp
  cancellationReason?: string
  giftedBy?: UserId                       // если подарена
  resaleFromSubscriptionId?: string       // цепочка resale
  originalPurchaseId: string              // идентификатор первой покупки

  // Provenance
  createdAt, updatedAt, version
}
```

## 3. Состояния и переходы

```
             ┌──────────── gift ────────┐
             ▼                           │
    ┌─────────────┐   activate    ┌──────┴──────┐
    │  created    │ ────────────> │   trial     │
    └─────┬───────┘               └──────┬──────┘
          │ purchase                      │ trial-ends
          ▼                               ▼
     ┌────────┐    renewal-ok        ┌────────┐
     │ active │ <───────────────────>│ active │
     └───┬────┘                       └────────┘
         │
         ├── payment-fail ──> past_due ──┬──> recovered (→ active)
         │                                └──> cancelled (after N retries)
         │
         ├── user-pause ────> paused ────> user-resume ──> active
         │
         ├── user-cancel ──> cancelled ──> expiry ──> expired
         │
         ├── owner-revoke ──> cancelled (forced)
         │
         └── refund ────────> refunded
```

## 4. Детали каждого состояния

### `trial` (опционально)
- Доступ тот же, что у `active`.
- `activeUntil` = `trialStart + trialDays`.
- Напоминание за 3 дня до конца.
- По окончании либо → charge → `active`, либо → `cancelled` (если PSP fail / user отменил во время trial'а).

### `active`
- Полный доступ.
- Charge в `renewalAt` → success → `active` (новый цикл).
- Charge failure → `past_due`.

### `past_due` (retry-window)
- Access продолжается до `activeUntil` (grace-period).
- PSP retries: +1d, +3d, +7d. После этого → `cancelled`.
- Пользователь уведомляется каждой попытки retry.

### `paused`
- User опционально может pause (до N раз в год, depending on plan).
- Access приостановлен.
- Renewal не происходит.
- Pause-duration вычитается из `activeUntil` или extend'ит его (настраивается planum).

### `cancelled`
- No further billing.
- Access сохраняется до `activeUntil`.
- Can be reactivated до `activeUntil` → `active`.

### `expired`
- Access истёк.
- Поля сохраняются для history / audit.
- Можно создать новую subscription (новый id).

### `refunded`
- Polar-вариант cancel: refund triggered (через `disputes` или admin).
- Compensating royalty-reversal через `authorship-registry`.
- Access немедленно revoked (не до `activeUntil`).

## 5. Resale (secondary market)

Для subscription'ов type `Commercial-Subscription` с `license: resellable` — можно продать свою подписку другому:

1. Holder A листит subscription на marketplace.
2. Buyer B покупает → holder переходит на B.
3. Payment A ← B (через escrow).
4. Royalty автору template'а — через split-policy (как и при обычной покупке).
5. Audit: `subscription-transferred` event.

**Резистентность к shell-inflation**: platform takes commission, автор получает небольшой дополнительный royalty. Цена на secondary market регулируется политикой (anti-scalping для премиум).

## 6. Gift-flow

1. User A выбирает gift подписки user'у B.
2. Charge A за полный period.
3. Создаётся subscription с `holder: B, giftedBy: A`.
4. Notification B с acceptance-link.
5. B accepts → activate → subscription становится у B.
6. B rejects → refund A → `refunded`.

Gift — самостоятельная Pattern-Card с timeline (purchase → notify → accept → activate).

## 7. Groups / Family subscriptions

Subscription может иметь `members[]`:

- Holder — primary payer.
- Members получают access, но не могут change plan.
- Add/remove member — через permissions flow.
- Max members — `plan.maxMembers`.
- Event `member-added` / `member-removed` идёт в audit.

## 8. Revenue routing per-renewal

На каждый renewal:

1. `wallet.charge` → amount в plan.currency.
2. `authorship-registry.distribute(target, amount)` → recursive royalty (см. `11` и `32-authorship-algorithms`).
3. `audit-log` событие.
4. Subscription обновляет `activeUntil` + `renewalAt`.

## 9. Интеграции

- **Publishes**:
  - `app.daria.subscription.created.v1`
  - `app.daria.subscription.trial-started.v1`
  - `app.daria.subscription.activated.v1`
  - `app.daria.subscription.renewed.v1`
  - `app.daria.subscription.payment-failed.v1`
  - `app.daria.subscription.cancelled.v1`
  - `app.daria.subscription.paused.v1`
  - `app.daria.subscription.resumed.v1`
  - `app.daria.subscription.expired.v1`
  - `app.daria.subscription.transferred.v1`
  - `app.daria.subscription.refunded.v1`
  - `app.daria.subscription.member-added.v1`
- **Consumes**:
  - `app.daria.payments.payment-confirmed.v1` (trial/renewal success)
  - `app.daria.payments.payment-failed.v1` (retry trigger)
  - `app.daria.disputes.ruling.v1` (refund)
- **Calls**:
  - `wallet.charge` / `wallet.refund`
  - `authorship-registry.distribute`
  - `notifications.send` (ahead-of-renewal, trial-ending, past-due)

## 10. UX — subscription как Pattern-Card

В shell'е, subscription — своя Pattern-Card:

- HEADER — target (кому / чему подписка) + status badge.
- TIMELINE — state transitions, next-renewal, история.
- SUMMARY — plan, цена, текущий state, next charge.
- ACTIONS — pause / cancel / change-plan / gift-somebody / share.
- SECTIONS — access-history, royalty-breakdown (если user — автор), related-subscriptions.

Shell-panels (see `29-shell-state-model.md`): при фокусе на subscription right-panel = чат с автором / community.

## 11. Push / email timing

| Event | Когда | Channel |
|---|---|---|
| 3 days before trial end | once | push + email |
| 1 day before renewal | once | push |
| 7 days before renewal | (optional) | email |
| Payment failed | immediate | push + email |
| Past-due reminder | +1d, +3d | push |
| Cancelled confirmation | immediate | email |
| Expiry reminder (last day) | 1h before | push |
| Refund processed | immediate | email |

Согласуется с `policy-engine` (quiet-hours региона).

## 12. Compliance

- **GDPR erase**: при erase holder'а — subscription cancelled, holder поле анонимизируется в audit, но факт транзакций остаётся (financial retention).
- **Cooling-off period**: в EU — 14 дней return для subscription'ов, в РФ — 7 дней. Реализуется через `policy-engine` rule `subscription.cancel.refund-allowed-within`.
- **Auto-renewal disclosure**: пользователь при subscribe явно видит «renewal terms». Регулятор EU требует annual reminder.

## 13. Testing scenarios

- Happy path: trial → active → renew × 12 → cancel → expired.
- Payment failure: active → past-due → retry → recovered / cancelled.
- Gift: gift-send → accept → active; reject → refund.
- Family: add member → access; remove member → access revoked.
- Resale: lista → buy → holder transfer → royalty.
- Refund: active → refund → access revoked + compensating royalty.

Acid-test T17 (add to `21-acid-tests.md`).

## 14. Антипаттерны

- ❌ Держать состояние subscription'а только в PSP. Source of truth — `subscription-engine`, PSP — backing payment.
- ❌ Менять plan ретроспективно. Изменение plan'а — новая subscription с lineage-link.
- ❌ Revoke access без audit-log записи.
- ❌ Refund только в PSP, без royalty-reversal.
- ❌ Отсутствие grace-period (past-due → immediate cancel) — bad UX.
- ❌ Нет cancellation flow в UI — «dark pattern».
- ❌ Subscription без expiry (`lifetime`) без explicit plan с этим — риск legal.
