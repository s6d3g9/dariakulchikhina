# 27. Cost Model

Reality-check инфра-стоимости v6 per-фаза, per-MAU. Цель: **увидеть unit-economics** до того, как мы ушли туда, где расходы больше доходов. Тот самый reality-check из `04-open-questions.md`, который обязан быть до Фазы 6.

Все цифры — **порядка величины** (не прайс-лист). Актуальны на 2026-04. Для EU/EMEA. Будут пересматриваться раз в полгода.

## 1. Два вида расходов

1. **Fixed** — не зависят от MAU (control-plane, minimum clusters, monitoring, SaaS-подписки).
2. **Variable** — масштабируются с нагрузкой (compute, storage, egress, ML-inference).

Задача — держать **variable ~linear в MAU**, а **fixed distributed across MAU** по мере роста.

## 2. Фазы и ожидаемые объёмы

| Фаза | MAU target | DAU | Transactions/day | Media GB/day | AI calls/day |
|---|---|---|---|---|---|
| 0 | — | — | — | — | — |
| 1–2 | 100 internal | 50 | 10 | 0.1 | 100 |
| 3 (travel) | 500 early-adopters | 100 | 200 | 1 | 2,000 |
| 4 (creator) | 2,000 | 400 | 1,000 | 10 | 10,000 |
| 5 (mobility) | 10,000 | 2,500 | 10,000 | 50 | 50,000 |
| 6 (scale-infra) | 30,000 | 8,000 | 50,000 | 200 | 200,000 |
| 7 (social) | 100,000 | 30,000 | 300,000 | 2,000 | 2,000,000 |
| 8 (banking) | 250,000 | 75,000 | 1,000,000 | 5,000 | 5,000,000 |
| 9 (crypto) | 500,000 | 150,000 | 5,000,000 | 8,000 | 15,000,000 |

## 3. Инфра-стоимость per фаза (месячная)

### Фаза 0–1: Local-first / Small VPS (~€100–200/мес)

- 1 Hetzner dedicated (~€80): всё в docker-compose.
- Домен + DNS (~€15).
- Нулевые SaaS.
- Snapshot backup (~€10).

### Фаза 2–3: Production-ready (~€500–1,500/мес)

- Hetzner 3× CPX (BE), 1× CPX (gateway) — ~€200
- Postgres managed (Hetzner CE или DIY) — ~€100
- Redis managed — ~€50
- NATS JetStream self-hosted — ~€100
- Temporal self-hosted — ~€50
- MinIO / S3 (ограниченно) — ~€50
- SigNoz self-hosted — ~€150 (ClickHouse = тяжёлый)
- CDN (Cloudflare Pro) — ~€20
- Email (Sendgrid/Mailgun MVP) — ~€20
- Zitadel self-hosted — 0 (на общей БД)
- Feature-flags (GrowthBook self-hosted) — 0
- SaaS (Sentry free tier) — 0

### Фаза 4: Creator / Care (~€2,000–4,000/мес)

- +БД на отдельный инстанс для authorship/ownership/subscription.
- +ClickHouse cluster (3 nodes) для analytics.
- +Media-pipeline: SaaS Mux/Bunny — ~€500/мес pay-as-you-go.
- +moderation-ml Python services — ~€200.
- +Увеличение worker pool'ов под Temporal/pattern-engine.

### Фаза 5: Mobility / Purchase (~€5,000–10,000/мес)

- +GDS integration fees (Amadeus/Travelpayouts) — ~€1,500 fixed + per-call.
- +Kadastr / dealer integrations — ~€500.
- +Geospatial / routing API — ~€200.
- +Inventory replica'ы для low-latency search.
- Первые попытки оптимизации costs.

### Фаза 6: Managed k8s + GitOps (~€8,000–15,000/мес)

**Этот шаг — дорогой**. Managed k8s переводит платформу из artisanal в industrial:

- Hetzner / Yandex MK8s: 3 control-plane + 5–10 workers — ~€1,500.
- **Managed Postgres**: 3 clusters (platform, domain, audit) — ~€2,000.
- **ClickHouse Cloud** (if SaaS route) — ~€1,500.
- Argo CD, Infisical, monitoring — ~€500.
- Cloudflare Pro+/Enterprise — ~€1,000.
- DR backups cross-region — ~€500.

### Фаза 7: Social (~€25,000–60,000/мес)

Бум с dating+video:

- **Video transcode+CDN**: SaaS (Mux/Bunny) линейно с WM — ~€10,000–30,000.
- **ScyllaDB Cloud** под social-graph — ~€2,000–5,000.
- **Recommendations ML pods** — ~€2,000.
- **Moderation** (ML+human) — ~€5,000+ (людские затраты тут основные).
- **ClickHouse**: scale up для watch-analytics — ~€3,000.

### Фаза 8: Banking (~€20,000–50,000/мес + compliance one-off)

- **Отдельный VPC + k8s cluster** (isolation) — ~€8,000.
- **BaaS-партнёр fees** — variable, typically share revenue.
- **KYC/AML (Sumsub)** — ~€500 fixed + ~€1/verification.
- **Penetration tests** — ~€30,000 per year.
- **SOC 2 audit** — ~€50,000 one-off.
- **Compliance-officer + security eng team** — hiring (salary, not infra).
- **Mobile apps** — distribution costs (Apple Developer €99, Google $25).

### Фаза 9: Crypto (~€30,000–80,000/мес)

- **Fireblocks custody** — ~€10,000+/мес.
- **Matching-engine compute** (low-latency servers) — ~€5,000.
- **Market data fees** (CoinGecko, CoinMarketCap Pro, exchange APIs) — ~€2,000+.
- **Regulatory fees** — per-jurisdiction license fees.

## 4. Per-MAU стоимость (ориентир)

| Фаза | Monthly infra | Expected MAU | Per-MAU cost | Target unit economics |
|---|---|---|---|---|
| 3 | €1,000 | 500 | €2.00 | Только travel-commission; не покрывает |
| 4 | €3,000 | 2,000 | €1.50 | Creator-subscriptions + travel; likely -ROI |
| 5 | €8,000 | 10,000 | €0.80 | Mobility-commissions; может быть +ROI |
| 6 | €12,000 | 30,000 | €0.40 | Смешанная модель; должен быть +ROI |
| 7 | €40,000 | 100,000 | €0.40 | Ads + premium subscriptions; +ROI requirement |
| 8 | €35,000 | 250,000 | €0.14 | Banking fees + ads; +ROI |
| 9 | €55,000 | 500,000 | €0.11 | Exchange fees dominant; +ROI |

**Критическая точка**: переход с Фазы 3 (€2/MAU) → Фазы 7 (€0.40/MAU) требует 5x рост платящих пользователей и удешевления infra per-user. Без этого — воронка ubытков.

## 5. Revenue model — per-vertical

### Travel
- Commission per booking: 5–15% агенту, нам — 1–3% комплексно.
- Subscription на premium-templates + alerts — €5/мес.

### Creator
- Платформа takes 10–20% с покупок/подписок.
- Premium accounts (authorship boost) — €10/мес.

### Mobility / Rental
- Commission 10–20% с rental.
- Premium listings для providers — €50/мес.

### Dating / Video
- Subscriptions + ads — mixed.
- Creator tipping / super-chats — 20% take.

### Banking
- Transaction fees через BaaS-revenue-share.
- Premium-card subscription — €10/мес.

### Crypto
- Trading fees 0.1–0.5% per-trade.
- Listing fees — one-off per token.

## 6. Unit economics checks per phase

**Фаза 3** — minimal revenue, тестируем retention. Не profitable, цель — proof-of-concept.

**Фаза 4** — creator economy должна показать долгосрочную retention (>30% Day-30). Если нет — stop и rethink.

**Фаза 5** — mobility должна показать commission volume. Если mobility провалит — отложить Фазу 7.

**Фаза 6** — должен быть продемонстрирован +1 cohort с unit-economics ROI. Иначе — не идём в banking/crypto.

**Фаза 7** — если DAU/MAU < 15% — убирать тяжёлые features (live video).

**Фаза 8–9** — отдельные P&L, не смешивать с platform.

## 7. Optimization levers

### Когда infra-bill растёт быстрее MAU

1. **Cache aggressively** — Redis layer перед БД.
2. **Projection pre-aggregation** — ClickHouse готовит то, что нужно, не real-time.
3. **On-device computations** — сдвиг ML/rendering к клиенту.
4. **Self-hosting SaaS** — если MAU > threshold, self-host Mux → own pipeline.
5. **Architectural fat-trimming** — убираем неиспользуемые сервисы; если service has < N rps — merge в соседний.
6. **Tiered storage** — hot/warm/cold на разных бэкендах.

### Когда фиксированные слишком тяжёлые

1. **Sharing DB instances** между dev/staging с prod — нет, не делаем (риск).
2. **Reserved / long-term commits** — Hetzner дешевле при годовом plan.
3. **Geolocal hosting** — РФ для РФ-пользователей дешевле cross-border.

## 8. Cost observability

Аналогично business-metrics в `18-observability-ops.md`:

- Dashboard «Cost per MAU» — daily.
- Dashboard «Cost per card-type» (какая вертикаль реально жрёт).
- Alert при отклонении > 20% от плана (variance).
- Monthly review на arch sync: cost vs plan vs revenue.

## 9. Финансовый runway guardrails

- Keep 18-месяц operating runway минимум.
- Перед Фазой 6 — зафиксировать **12 месяц cost projection** при 2x и 0.5x MAU scenarios.
- Перед Фазой 8 (banking) — **полный CFO sign-off**: это уже не продукт, это компания.
- Crypto — startup в startup'е, с отдельным seed/raised capital.

## 10. Антипаттерны

- ❌ Масштабируем «на всякий случай». Доставляем infra по мере роста, не «заранее под миллион».
- ❌ Выбираем managed SaaS за лёгкость без cost-прогноза. Managed ClickHouse может быть 10x дороже self-hosted.
- ❌ «Инфра-долг» — если cost растёт на 2x быстрее MAU две четверти подряд, нужна ревизия.
- ❌ Один budget на всё — каждая вертикаль имеет свой P&L.
- ❌ Ignore regulatory one-offs — лицензии / аудиты часто стоят больше месячной инфры.
- ❌ Hiring впереди revenue — нанимаем под проверенный spark, не under demand'у.
