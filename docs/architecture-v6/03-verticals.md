# 03. Вертикали — порядок и риски

Принцип v6: **вертикаль — это набор card-types, а не сервис**. Этот документ — сводка рисков и последовательности запуска вертикалей как пакетов плагинов. Полный каталог card-types — в [06-card-types-matrix.md](06-card-types-matrix.md), слоистая модель — в [07-layered-architecture.md](07-layered-architecture.md).

## Матрица сложности

| # | Вертикаль | Регуляторика | Инфра-сложность | Модерация | Обязателен mobile | Фаза |
|---|---|---|---|---|---|---|
| 1 | **Travel-агрегатор** | Низкая | Низкая | Низкая | Опц. | 3 |
| 2 | **Creator economy** | Низкая | Средняя | Средняя (копирайт) | Опц. | 4 |
| 3 | **Pet / wellness** | Средняя (HIPAA-like для health) | Низкая | Низкая | Опц. | 4 |
| 4 | **Mobility / rental** | Средняя | Средняя | Средняя | Опц. | 5 |
| 5 | **Purchase (car / RE / collectibles)** | Высокая (title, KYC) | Средняя | Средняя | Опц. | 5 |
| 6 | **Dating** | Средняя (age, GDPR) | Средняя | Высокая | **Обяз.** | 7a |
| 7 | **Video** | Средняя (DMCA) | Высокая (CDN, транскод) | Высокая | **Обяз.** | 7b |
| 8 | **Banking** | Очень высокая | Высокая | — | **Обяз.** | 8 |
| 9 | **Crypto** | Экстремальная | Экстремальная | — | **Обяз.** | 9 |

## 1. Travel — первой, в Фазе 3

**Почему первой**: stateless-интеграции, без регуляторики, идеальная обкатка shell'а, timeline-engine и pattern-composition.

- Card-types: `flight-ticket`, `train-ticket`, `bus-ticket`, `hotel-room`, `apartment-stay`, `taxi-ride`, `car-rental-short`, `food-delivery`, `event-ticket`, `trip-compound` (композит).
- Переиспользует: identity, gateway, booking, inventory, payments, location, pattern-engine, timeline-engine, feed, messenger.
- Интеграции: Amadeus GDS / Travelpayouts / Booking Affiliate / Авиасейлс / 2ГИС.
- Риски:
  - Качество и latency внешних API — агрессивный кэш, fallback-пути.
  - Pricing race condition при брони — OCC + commit-pattern (см. `09-invariants.md` I9).
  - Комиссии партнёров — billing вводится через `financing-service` + split-policy.

## 2. Creator economy — Фаза 4

**Почему второй**: проверяет самый нетривиальный инвариант (I10 — recursive royalty).

- Card-types: `photo-asset`, `video-asset`, `music-track`, `code-module`, `pattern-template`, `course`, `game-mini-app`.
- Новое: `authorship-registry`, `subscription-engine`, `moderation-ml`, license-taxonomy (CC0/CC-BY/MIT/GPL/Commercial-1x/…).
- Критично: recursive revenue routing работает end-to-end, автор шаблона получает процент, даже если его форкнул другой автор, чей шаблон форкнул третий.
- Риски:
  - Копирайт — DMCA-like процесс обязателен сразу.
  - Оценка split-fairness — нужен человек-модератор на нестандартные случаи.
  - Off-chain vs on-chain authorship — MVP off-chain, опциональный mint на Polygon/Base позже.

## 3. Pet / care / wellness — Фаза 4 (параллельно)

**Почему вместе с creator**: проверяет ownership на живых сущностях (не цифре) и timeline-engine на долгих процессах (беременность — 40 недель, curing disease — месяцы).

- Card-types: `pet`, `livestock`, `plant-garden`, `pregnancy-tracker`, `chronic-care-plan`, `fitness-plan`, `medical-appointment`.
- Новое: `credentials-vault` для ветсертификатов, родословных, медицинских допусков.
- Риски:
  - **Приватность** медицинских данных — отдельный scope в identity, RLS в БД, аудит-лог на все доступы.
  - Междисциплинарная связь — чат с ветом при открытии карточки питомца, не в отдельном «ветмодуле» (валидация инверсии I3).

## 4. Mobility + rental — Фаза 5a

Массовое добавление. Порционно: transport → short rental → long rental.

- Card-types: см. `06-card-types-matrix.md` §2.2–2.4.
- Ноль новых сервисов (инвариант I1 валидируется здесь).
- Риски:
  - **Лицензии и cert check** — boat-bareboat требует IYT/ICC, мотоцикл >125cc — категорию A, scuba — PADI. Всё через `credentials-vault`.
  - Deposit / damage claims — через `escrow-service` + `disputes`.
  - Geofence для bike/scooter — через `location` + policy-engine.

## 5. Purchase — Фаза 5b

- Card-types: `car-purchase-new/used`, `real-estate-purchase-*`, `boat-yacht-purchase`, `collectibles-purchase`, `auction-listing`, `equipment-purchase-b2b`.
- Новое: `auction-engine`, `inspection-service`, расширение `ownership-registry` на кадастр/VIN/судовой реестр.
- `financing-service` — полный набор: mortgage, car loan, leasing, BNPL.
- Риски:
  - **Title-граф** — правильная модель переходов собственности, включая долевую, ипотечную, арестованную.
  - Фрод при used-car — `inspection-service` с независимыми оценщиками + escrow.
  - Регуляторка недвижимости РФ — эскроу по 214-ФЗ для новостроек.

## 6. Dating — Фаза 7a

**Почему после purchase, не до**: первая вертикаль с критической модерацией и обязательным mobile. Лучше, когда shell уже обкатан.

- Card-type: `person-profile` получает `dating-mode` + `matching-mode` как view-modes (I3 + I18).
- Новое: ScyllaDB для лайков/матчей, `trust-safety` с device-fingerprint + photo-verification.
- Переиспользует: messenger, feed, media-pipeline, moderation.
- Риски:
  - Модерация — без ML+human за недели платформа становится токсичной.
  - Fraud accounts (боты, catfishing) — обязательная phone + photo verification.
  - Safety (harassment, grooming) — reporting, блокировки, age-gates через `policy-engine`.
  - GDPR right-to-be-forgotten — каскад в social-graph через compensating sagas.

## 7. Video — Фаза 7b

**Почему после dating**: dating обкатает moderation на фото, video переиспользует pipeline на более сложном контенте.

- Card-types: `video-asset` становится production, +live-streaming опционально.
- Новое: ClickHouse watch-analytics, `recommendations` ML-стек.
- Риски:
  - CAPEX transcode+CDN линейно к просмотрам — SaaS (Mux/Bunny) до доказанного роста.
  - DMCA — claim-and-strike, fingerprint-сравнение через Content-ID-подобный сервис.
  - Recommendations — без хорошего фида платформа не взлетает.
  - Live vs VOD — отдельные pipelines.

## 8. Banking — Фаза 8, отдельный трек

**Почему так поздно**: требует зрелой инфры + юридической подготовки параллельно инженерной.

- Card-types: `bank-account`, `credit-card`, `transfer`, `loan`, `mortgage`, `deposit`.
- Новое: TigerBeetle как ledger; `wallet` пересаживается на него.
- Обязательно:
  - BaaS партнёр (Точка/Qiwi/другой) — своя лицензия это годы и миллионы.
  - KYC/AML — Sumsub или Onfido.
  - PCI DSS через PSP, не напрямую.
  - СБП/НСПК через BaaS.
  - WORM audit-log 5+ лет.
  - Отдельная security-команда.
- Риски:
  - Неправильный ledger = потеря денег → TigerBeetle.
  - Insider access — отдельные админки, нет прямого SQL.
  - SLA 99.95% реалистично, не выше.

## 9. Crypto — Фаза 9, после banking

- Card-types: `crypto-wallet`, `crypto-trade`, `token-listing`, `staking-position`.
- Новое: Rust matching-engine, Fireblocks кастоди.
- Риски:
  - Компрометация ключей = банкротство → HSM обязательно.
  - Регуляторика per-юрисдикция через `policy-engine` (allow / distill / deny).
  - Ликвидность — без market-makers биржа мертворождённая.
  - Confirmation policies per-asset (BTC/ETH/TRON — разные).
- Альтернатива: **custodial wallet + DEX aggregator** вместо полноценной биржи.

## Общие правила

1. **Не запускать более одной крупной вертикали параллельно**. Mobility + purchase — ок (близкие примитивы). Dating + video — нет (обе тяжёлые модерации).
2. **Каждая новая вертикаль — это `packages/card-types/<name>/` + (опционально) 1 новый примитив**. Если требуется 2+ новых сервиса — пересмотреть, это значит вертикаль тащит вертикальную логику в платформу.
3. **Mobile-first обязателен** с Фазы 3; к Фазе 7 mobile должен быть как минимум feature-равным с web.

## Точки, где план может рассыпаться

- **Монетизация** не проверена — travel и creator могут не окупить инфру.
- **Команда** не масштабируется — polyglot (Go + Rust + Python) требует редких разработчиков.
- **Регуляторика РФ** — финансовые вертикали должны иметь опцию переноса юрисдикции через `policy-engine`.
- **Стоимость инфры** — ClickHouse+ScyllaDB+k8s не дёшевы; reality-check в цифрах перед Фазой 6.
- **Pattern-engine + timeline-engine сложность** — если композиция card-types не взлетит как UX, вся концепция «вертикали-как-плагины» под угрозой. Валидировать на Travel (Фаза 3) до массового добавления.

## GO / NO-GO decision framework per-vertical

Перед запуском каждой вертикали — checklist решений. Любое `NO` блокирует launch.

### Travel (Фаза 3)

- [ ] Shell + fractal-harness работают (Phase 2 complete).
- [ ] `pattern-engine` + `timeline-engine` функционируют end-to-end.
- [ ] Amadeus / Travelpayouts / local GDS integration тестирована.
- [ ] Payments PSP (Stripe / ЮKassa) работает.
- [ ] Legal team signed off on travel-specific ToS + disclaimers.
- [ ] First 10 seed templates прописаны.
- [ ] Acid-test T4, T7, T10, T12, T13, T14, T16 passing.

**Failure modes to watch**:
- External API latency > 2s → user drop-off.
- Pricing race condition → double-booking.
- Currency volatility (RU ↔ foreign) → FX-rate stale.

**Kill-criteria**: если через 8 недель после launch — <100 complete bookings → rethink.

### Creator Economy (Фаза 4)

- [ ] `authorship-registry` + recursive royalty verified (T3 passing).
- [ ] Subscription lifecycle полный (T17 passing).
- [ ] 10 anchor-creators onboarded (invite-only beta).
- [ ] Moderation-ml + moderation-review working.
- [ ] Copyright-claim flow (`disputes` integration) tested.
- [ ] License taxonomy legal-reviewed.

**Failure modes**:
- Top-10 creators captures > 80% revenue → fairness problem.
- Similar-by-scheme fraud (stealing content без fork) → need fingerprinting.
- Royalty computation errors → loss of creator trust.

**Kill-criteria**: если новый-creator retention < 20% month-1 → fundamental UX issue.

### Mobility + Rental (Фаза 5a)

- [ ] Credentials-vault supports all required license kinds (driver's, IYT, PADI).
- [ ] Inspection-service работает для used-car scenarios.
- [ ] Escrow для deposits (damage coverage).
- [ ] Geofence для bike/scooter rentals.

**Failure modes**:
- Deposit disputes без clear evidence → escalation overload.
- License verification fraud → allow someone без real cert.
- Insurance liability unclear.

### Purchase (Фаза 5b)

- [ ] Ownership-registry для physical asset title-tracking.
- [ ] Financing-service полная (mortgage / lease / car loan).
- [ ] Auction-engine с anti-sniping.
- [ ] Legal compliance per-jurisdiction (РФ — 214-ФЗ для новостроек).

**Failure modes**:
- Title-transfer errors = legal liability.
- Inspection false-positives → fraud vectors.
- Financing compliance violations.

### Dating (Фаза 7a)

- [ ] Moderation-ml specifically trained для dating content.
- [ ] Trust-safety (anti-bot, catfishing) production-grade.
- [ ] Age verification strict (AV3 mandatory).
- [ ] Safety reporting + crisis-intervention partnerships.
- [ ] Mobile app compelling (dating без mobile — мертворожденный).
- [ ] ScyllaDB для social-graph работает.

**Failure modes**:
- Bot accounts > 5% → trust collapse.
- Grooming incidents → legal + PR catastrophe.
- Poor matching → churn.

**Kill-criteria**: если safety-incident rate > industry baseline → full pause.

### Video (Фаза 7b)

- [ ] Mux/Bunny integration + cost model proven.
- [ ] DMCA / copyright flow established.
- [ ] Recommendations ML stack ready.
- [ ] Content moderation scaled (больше пользовательского контента).

**Failure modes**:
- CDN costs > revenue per-viewer → unsustainable.
- Copyright strikes pile up → legal liability.
- Recommendations quality poor → user drop-off.

### Banking (Фаза 8)

- [ ] BaaS partner contract signed.
- [ ] KYC provider integrated (Sumsub + Onfido).
- [ ] Separate isolated k8s cluster deployed.
- [ ] TigerBeetle ledger tested under load.
- [ ] Security team на full-time.
- [ ] SOC 2 / ISO 27001 audit complete (or в процессе).
- [ ] Compliance officer hired.
- [ ] Insurance обеспечен.
- [ ] DR drill passed в banking cluster.
- [ ] Regulator relationship established.

**Failure modes**:
- Partner (BaaS) relationship breakdown.
- Regulatory позиция changes.
- Insider breach.
- Ledger corruption (impossible with TigerBeetle, но...).

**Kill-criteria**: если compliance fails at any stage — go-no-go reset.

### Crypto (Фаза 9)

- [ ] All Phase 8 requirements.
- [ ] Fireblocks custody contract.
- [ ] Matching-engine tested (< 1ms latency).
- [ ] Wallet-service signing через MPC (не plain-text keys).
- [ ] Per-chain confirmation policies.
- [ ] Market-maker partnerships.
- [ ] Regulator stance confirmed (РФ or move jurisdiction).

**Failure modes**:
- Key compromise → bankruptcy.
- Regulatory shutdown.
- Liquidity dry up.
- 51% / chain-reorg losses.

**Kill-criteria**: любой security incident в custody — full shutdown + external forensics.

## Vertical success metrics (consolidated)

Каждая vertical measured через единый dashboard:

| Metric | Travel | Creator | Mobility | Dating | Video | Banking | Crypto |
|---|---|---|---|---|---|---|---|
| Primary activation | booking-completed | first-publish | first-rental | first-match | first-watch-complete | first-transaction | first-trade |
| Week-1 retention target | 30% | 25% | 35% | 40% | 50% | 60% | 70% |
| LTV target (year 1) | $50 | $100 | $80 | $40 | $60 | $300 | $500+ |
| Critical safety KPI | pricing-accuracy | royalty-correctness | damage-dispute-rate | grooming-incidents | DMCA-compliance | fraud-rate | key-safety |
| Unit econ target | +3% margin | +15% take | +10% commission | +ads+subs | ads+subs | transaction-fees | trading-fees |
| Time-to-profitable | 12-18 mo | 18-24 mo | 12 mo | 12-18 mo | 24+ mo | 24-36 mo | 6-12 mo post-launch |

## Vertical lifecycle — launch → mature → sunset

Не все verticals будут успешны. Lifecycle:

```
Prep (4-8 weeks) ──► Soft launch (2-4 weeks beta) ──► Public launch
                                                        │
                                                        ▼
                            ┌─── Growing → Scale → Mature
                            │
                     Early metrics check
                            │
                            ├── Struggling → iterate 12 мес
                            │                     │
                            │                     ├── Recovered → Scale
                            │                     └── Still struggling → Sunset plan
                            │
                            └── Failing → Sunset within 3 мес
```

See `54-innovation-track.md` for full sunset procedure.
