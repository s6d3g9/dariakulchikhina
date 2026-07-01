# services/wallet

Layer 2 — Platform Service. Единый кошелёк: банковские счета + внутренние балансы + крипта + royalty-потоки.

## Что делает

- Ведёт balances per-user, per-currency.
- Производит transfers с гарантией ACID (double-entry).
- Хранит history / statement для пользователя.
- Принимает внешние charges от `services/payments` (PSP-агрегатор).
- Исполняет internal transfers: platform-fees, royalty distribution, escrow-releases.
- Экспортирует events для `audit-log` (все финансовые движения).

## Рантайм

- **Language**: Go.
- **State store** (Фазы 1–5):
  - Postgres `wallet_db` с double-entry constraints.
  - Таблицы: `accounts`, `transfers`, `holds`, `journal`.
- **State store** (Фаза 6+):
  - **TigerBeetle** заменяет Postgres-ledger.
  - Formal verification + in-hardware двойная запись.
  - 1M TPS — достаточно для любой нагрузки v6.
  - Миграция — отдельный проект с reconciliation periода.

## Модель счетов

| Тип | Per | Пример |
|---|---|---|
| `user.primary` | user × currency | balance основной валюты пользователя |
| `user.escrow` | user × escrow_contract | средства в удержании |
| `platform.revenue` | jurisdiction × currency | комиссия платформы |
| `author.royalty` | author_id × currency | приход автора |
| `treasury.fund` | purpose × currency | tag-fund'ы, dust, special |
| `liquidity.pool` | purpose × currency | ликвидность для operations |

## API (skeleton)

```
POST   /transfers                           # internal double-entry (idempotent)
POST   /charges                             # external (PSP-callback)
POST   /holds                               # reserve funds (escrow prep)
POST   /holds/:id/release                   # release hold
POST   /holds/:id/cancel                    # cancel and unreserve
GET    /users/:id/balance                   # per-currency balances
GET    /users/:id/statement?from=&to=       # journal
GET    /users/:id/royalty-stream            # SSE (incoming royalty)
POST   /refunds                             # compensating transfer
```

## Интеграции

- **Publishes**:
  - `app.daria.wallet.transfer-completed.v1`
  - `app.daria.wallet.charge-received.v1`
  - `app.daria.wallet.hold-created.v1`
  - `app.daria.wallet.hold-released.v1`
  - `app.daria.wallet.refund-completed.v1`
  - `app.daria.wallet.balance-negative.v1` (алерт, должно быть 0)
- **Consumes**:
  - `app.daria.payments.payment-confirmed.v1` → создаёт charge
  - `app.daria.authorship.royalty-distributed.v1` → триггерит transfers
- **Calls**:
  - `identity.verifyUser` при sensitive transfer
  - `policy-engine.evaluate` при cross-border / high-amount

## Consistency гарантии

- **Strong serializability** per-user-per-currency.
- **ACID transfer** atomic (debit + credit в одной транзакции).
- **Idempotency**: Transfer-Key header обязателен.
- **Reconciliation**: ежедневный job сверяет журнал с сумма-балансов.

## Инварианты

- I4, I5, I6, I7, I10 (recursive royalty), I17 (всё в audit WORM).
- **Никакого negative balance** без явного overdraft-контракта.
- **Никакие transfers вне модели счетов** — только authorized паттерны.

## Фаза реализации

Фаза 1 (Platform core). Миграция на TigerBeetle — Фаза 6.

## Статус

Skeleton only. Первая реальная нагрузка — Фаза 3 (travel payments).
