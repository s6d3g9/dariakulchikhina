# services/authorship-registry

Layer 3 — Domain Primitive. Регистр цифрового авторства + split-policy + recursive royalty routing.

См. [docs/architecture-v6/11-creator-economy.md](../../docs/architecture-v6/11-creator-economy.md) для полной спецификации.

## Что делает

- Хранит `template`-сущности с author, license, split-policy, version, lineage parent.
- Поддерживает fork graph (DAG) — каждый fork знает parent, parent знает children.
- Вычисляет **recursive royalty distribution** при совершении monetized action (purchase, subscription, usage).
- Публикует распределения в `wallet` (через API), аудит в `audit-log` (через JetStream).
- Поддерживает все лицензии из таксономии (CC0 / CC-BY / MIT / GPL / Commercial-1x / Royalty-Fork / …).
- Optional: off-chain → on-chain mint через Polygon/Base адаптер (позже).

## Рантайм

- **Language**: TypeScript (Node).
- **State store**: Postgres `authorship_db`:
  - `templates` (id, kind, author, license, split_policy, version, parent_id)
  - `lineage_edges` (child_id, parent_id, relation='fork')
  - `royalty_ledger` (mirror of payouts, authoritative — wallet/TigerBeetle)
  - `disputes` (appeals, resolution state)
- **Event publisher**: NATS JetStream, stream `financial-audit` (WORM, 5 лет).

## API (skeleton)

```
POST   /templates                           # publish new template
GET    /templates/:id                        # metadata + split-policy
GET    /templates/:id/lineage                # fork graph ancestors/descendants
POST   /templates/:id/fork                   # create fork, return new id
POST   /templates/:id/purchase               # triggers distribution
POST   /templates/:id/subscribe              # creates subscription entitlement
GET    /authors/:id/royalty-stream           # SSE of incoming royalty events
POST   /templates/:id/mint-on-chain          # optional
```

## Distribution algorithm (core)

```
on purchase(template, amount):
  policy = template.split_policy
  direct  = policy.splits.filter(not forks-lineage)
  lineage = policy.splits.find(forks-lineage).share
  for each split in direct:
    wallet.transfer(to=split.party, amount*split.share)
  ancestors = walk(template → parents ...)
  weights = distribute_weights(ancestors, policy.forksLineageRule)
  for each (ancestor, weight) in weights:
    wallet.transfer(to=ancestor.author, amount*lineage*weight)
  emit app.daria.authorship.royalty-distributed.v1
```

## Интеграции

- **Publishes**:
  - `app.daria.authorship.template-published.v1`
  - `app.daria.authorship.template-forked.v1`
  - `app.daria.authorship.royalty-distributed.v1`
  - `app.daria.authorship.license-changed.v1`
  - `app.daria.authorship.dispute-opened.v1`
- **Consumes**:
  - `app.daria.payments.payment-confirmed.v1` → triggers distribution
  - `app.daria.subscription-engine.subscription-activated.v1` → ditto
  - `app.daria.disputes.ruling.v1` → compensating reversal
- **Calls**:
  - `wallet.transfer` (API)
  - `ownership-registry.assertAuthorship` (API)

## Contracts

Zod в `packages/contracts-domain/authorship.ts`:
- `Template`, `SplitPolicy`, `LineageEdge`, `LicenseKind`, `RoyaltyDistribution`

## Инварианты

- I4 (event-first)
- I6 (own DB)
- I10 (recursive royalty — enforced здесь)
- I17 (WORM audit)

## Фаза реализации

Фаза 2 (primitive), боевая нагрузка — Фаза 4 (creator economy).

## Статус

Skeleton only.
