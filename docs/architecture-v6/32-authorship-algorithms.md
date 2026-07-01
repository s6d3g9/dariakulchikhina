# 32. Authorship Algorithms

Конкретные алгоритмы для `services/authorship-registry`: как вычисляется split, как распределяется royalty по lineage'у, edge-cases, idempotency. Делаем это строго — деньги автора.

См. `11-creator-economy.md` для концепций. Здесь — pseudocode + тесты.

## 1. Data model (уточнение)

```ts
type Template = {
  id: string
  authorId: UserId
  parentId: string | null                  // null для root
  version: number
  license: LicenseKind
  splitPolicy: SplitPolicy
  forksLineageRule: 'equal' | 'geometric' | 'linear' | 'none'
  publishedAt: Timestamp
}

type SplitPolicy = {
  splits: Array<{
    party: PartyRef                        // 'author' | 'platform' | 'tag:<id>' | 'user:<id>' | 'forks-lineage'
    share: number                           // 0..1
  }>
  minDistributionCents: number              // < threshold → dust
  dustPolicy: 'accumulate' | 'platform-fee'
  currency: CurrencyCode                    // фиксируется на момент publication
}
```

Invariant: `sum(splits[*].share) == 1.0` (±0.0001 tolerance).

## 2. Lineage ancestors

Получение предков:

```
function ancestors(templateId):
  chain = []
  current = getTemplate(templateId)
  while current.parentId != null:
    parent = getTemplate(current.parentId)
    chain.append(parent)
    current = parent
  return chain    // [direct-parent, grandparent, ..., root]
```

Для performance — денормализованная `lineage_path` колонка (array of ancestor IDs) + update при fork.

## 3. Lineage weight distribution

Дано: `ancestors = [A1, A2, ..., An]` и доля `lineageShare` (например 0.15 от общего).

### `geometric` (recommended default)

```
total_weight = (1 - (1/2)^n)       // geometric series, converges к 1
for i in 1..n:
  weight[i] = (1/2)^i / total_weight
  Ai.amount += totalAmount * lineageShare * weight[i]
```

Пример n=3: A1=4/7, A2=2/7, A3=1/7.
Ближайший родитель получает больше, дальние — меньше, сумма == lineageShare.

### `linear`

```
total_weight = n * (n+1) / 2
for i in 1..n:
  weight[i] = (n - i + 1) / total_weight
```

Пример n=3: A1=3/6, A2=2/6, A3=1/6. Более «ровная» дистрибуция.

### `equal`

```
for i in 1..n:
  weight[i] = 1/n
```

### `none`

Никаких отчислений lineage'у. `lineageShare` → в tag-fund / platform (через dust-policy).

## 4. Полный алгоритм distribution

```python
def distribute_royalty(purchase):
    """
    purchase: { templateId, buyerId, amountCents, currency, idempotencyKey, txTimestamp }
    Возвращает: список (recipient, amountCents)
    Ошибки: raises если idempotent re-execution detected
    """
    # 0. Idempotency
    if ledger.has(idempotencyKey):
        return ledger.get(idempotencyKey).distribution

    template = getTemplate(purchase.templateId)
    policy   = template.splitPolicy
    amount   = purchase.amountCents
    distribution = []

    # 1. Native currency check
    if purchase.currency != policy.currency:
        amount = convertCurrency(amount, purchase.currency, policy.currency, rate=getRate(purchase.txTimestamp))

    # 2. Direct splits (non-lineage)
    direct_total = 0
    for split in policy.splits:
        if split.party == 'forks-lineage':
            continue
        recipient = resolveParty(split.party, template)
        share_amount = floor(amount * split.share)   # целые центы
        distribution.append((recipient, share_amount))
        direct_total += share_amount

    # 3. Lineage distribution
    lineage_split = next((s for s in policy.splits if s.party == 'forks-lineage'), None)
    lineage_total = 0
    if lineage_split:
        lineage_amount = floor(amount * lineage_split.share)
        lineage_total = lineage_amount

        ancestors_list = ancestors(template.id)
        if len(ancestors_list) == 0:
            # автор уже первый, lineage_amount → dust
            lineage_total = 0
        else:
            weights = compute_weights(ancestors_list, template.forksLineageRule)
            for (ancestor, weight) in zip(ancestors_list, weights):
                a_amount = floor(lineage_amount * weight)
                if a_amount >= policy.minDistributionCents:
                    distribution.append((ancestor.authorId, a_amount))
                    lineage_total -= a_amount
                # иначе → dust (lineage_total остаётся положительным)

    # 4. Dust (остатки)
    dust = amount - sum(amt for (_, amt) in distribution)
    if dust > 0:
        if policy.dustPolicy == 'platform-fee':
            distribution.append(('platform', dust))
        elif policy.dustPolicy == 'accumulate':
            distribution.append(('platform.dust-accumulator', dust))

    # 5. Validate (sum == amount)
    assert sum(amt for (_, amt) in distribution) == amount, "integrity violation"

    # 6. Commit
    for (recipient, amt) in distribution:
        wallet.transfer(from='purchase-escrow', to=recipient, amount=amt, currency=policy.currency,
                        ref=purchase.idempotencyKey)

    # 7. Audit
    publishEvent('app.daria.authorship.royalty-distributed.v1', {
        purchaseId: purchase.idempotencyKey,
        templateId: template.id,
        distribution,
        forksLineageRule: template.forksLineageRule,
        totalCents: amount,
    })

    # 8. Memoize
    ledger.record(idempotencyKey, distribution)
    return distribution
```

## 5. Edge cases

### E1. Zero-share splits

`share == 0` → не создавать transfer (нулевой перевод запрещён). Игнорируется.

### E2. Dust < minDistribution

Получатель не получает copper. Dust policy определяет судьбу.

### E3. Lineage beyond N ancestors

Обычно ограничение: **max 10 ancestors** для geometric (далее вес < 0.001 — безsмысленно). Настраиваемое.

### E4. Removed ancestor

Если ancestor.author GDPR-erased → его доля идёт в `platform.orphan-royalty` accumulator. Legal: deleted user физически не может получать money, сохраняются только записи audit.

### E5. Cycle detection

При fork — проверка, что новый template не становится в cycle (защита от data corruption). lineage_path нормализуется как tree, cycles — impossible by construction (parent всегда точно один).

### E6. Concurrency

Два parallel purchases одного template'а → у обоих свой idempotencyKey, distribute_royalty — idempotent, работает корректно. Wallet transfers — ACID.

### E7. Refund

```
refund(purchase):
  distribution = ledger.get(purchase.idempotencyKey)
  for (recipient, amount) in distribution:
    wallet.reverse-transfer(recipient → 'purchase-escrow', amount)
  wallet.refund(buyer, totalAmount)
  publishEvent('royalty-reversed', purchase)
```

Compensating chain: transfers reversed в обратном порядке.

### E8. Subscription renewal

Каждая renewal — **новая** distribute_royalty с новым idempotencyKey. Lineage fixed на момент subscription purchase, **не** меняется при изменении template лицензии (лицензия fixed at purchase).

### E9. Template updated после purchase

- Old subscribers — на старой версии policy (fixed at purchase).
- New subscribers — на новой.
- Audit сохраняет snapshot использованной policy per-purchase.

## 6. Currency handling

- Template hardcode-ит currency в `splitPolicy.currency` (например USD).
- Purchase в другой currency (e.g. RUB) → конвертация по FX rate на момент purchase (рассчитывается через `services/wallet.convert()`).
- Audit хранит оба amount'а (paid в RUB, distributed в USD) + FX rate + timestamp.
- Ошибки конвертации (insufficient liquidity) → retry с backoff, при невозможности — `disputes` case.

## 7. Fork с модификацией split-policy

При fork — **можно ли менять split-policy**?

- По license'у автора исходника:
  - `Royalty-Fork` — **обязывает** держать совместимую policy (lineage-share в своём split не менее, чем у предка).
  - `MIT / CC-BY` — полная свобода в split'ах fork'а (но вменяется attribution).
  - `GPL` — fork обязан использовать тот же license, но split-policy своя.
  - `Commercial-1x` — вообще нельзя fork без purchase (и после purchase — только для personal use, не для re-publish).

Violation detected через `disputes` + `moderation-review` с manual проверкой.

## 8. Tests и invariants

`packages/testing/authorship-harness`:

- T_A1: сумма distribution == amount (ни один cent не теряется).
- T_A2: idempotent re-run — возвращает тот же distribution.
- T_A3: geometric N=1 → 100% direct parent.
- T_A4: geometric N=5 → сумма весов ≈ 1.0.
- T_A5: lineage без ancestors → lineage_total → dust.
- T_A6: min-distribution skip → dust accumulator.
- T_A7: refund reverse sum == original sum.
- T_A8: currency conversion fixed at purchase time.
- T_A9: deleted ancestor → orphan accumulator.
- T_A10: cycle prevention impossible by tree structure.

## 9. Audit fields

Каждое distribution-событие audit-log'а содержит:

```json
{
  "purchaseId": "p_abc",
  "templateId": "tpl_xyz",
  "buyerId": "u_123",
  "amountPaidCents": 2000,
  "currencyPaid": "RUB",
  "amountDistributedCents": 2500000,
  "currencyDistributed": "USD",
  "fxRate": 1250.0,
  "fxTimestamp": "2026-05-10T12:00:00Z",
  "policyHash": "sha256:...",
  "policyVersion": 3,
  "distribution": [
    { "recipient": "u_alice",     "amountCents": 1750000, "role": "author" },
    { "recipient": "platform",    "amountCents": 250000,  "role": "direct" },
    { "recipient": "tag:music-fund", "amountCents": 125000, "role": "direct" },
    { "recipient": "u_bob",       "amountCents": 187500,  "role": "ancestor", "generation": 1, "weight": 0.5 },
    { "recipient": "u_carol",     "amountCents": 93750,   "role": "ancestor", "generation": 2, "weight": 0.25 },
    { "recipient": "platform.dust-accumulator", "amountCents": 93750, "role": "dust" }
  ]
}
```

## 10. Антипаттерны

- ❌ Floating-point math для денег. Только integer cents.
- ❌ Изменение split-policy ретроактивно для active subscriptions.
- ❌ Recomputing lineage при каждой purchase вместо денормализованного path.
- ❌ Skip idempotency check — duplicated royalty payment.
- ❌ Single transfer batch без проверки integrity (sum).
- ❌ Ignoring dust — рано или поздно обнаруживается regulator'ом.
- ❌ FX rate taken at distribution, not at purchase.
