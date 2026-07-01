# 39. Analytics & Product Metrics

Product-метрики — **четвёртый столп observability** (после traces / logs / technical-metrics). Описывает: какие бизнес-показатели собираем, как считаем, как экспериментируем (A/B), как анализируем retention и воронку.

См. также: `18-observability-ops.md` (technical), `14-data-architecture.md` (ClickHouse for analytics), `38-event-schema-governance.md` (events as source).

## 1. Principles

- **Events = source of truth**. Product-metrics производны от `audit-log` ClickHouse-projection.
- **Privacy-first**: identifiable events retained 90 days → pseudonymized 2 years.
- **Не раздувать**: <100 ключевых метрик total. Каждая имеет owner.
- **Actionable**: метрика существует, если кто-то её smотрит для decision'а.

## 2. Уровни метрик

| Уровень | Цель | Аудитория |
|---|---|---|
| **Platform-level** | Health, growth, economics | Exec, architecture |
| **Vertical-level** | Performance per card-type / vertical | Vertical squad leads |
| **Feature-level** | Impact of new feature | PM, engineer |
| **Experiment-level** | A/B test outcomes | PM, growth |

## 3. Platform metrics (north-star + supporting)

### North-star

**"Meaningful interactions per user per week"** — aggregate того, сколько ценности пользователь извлекает (transactions + purchases + contributions + consumption).

Нет single-number: north-star — vector.

### Supporting

- **DAU / WAU / MAU** (deduplicated по user-id).
- **DAU/MAU ratio** (stickiness).
- **Retention cohorts**: Day-1 / Day-7 / Day-30 / Day-90 retention по acquisition week.
- **New users per week** (by region, by acquisition channel).
- **Active user ratio** (active = совершал meaningful action last 7d).
- **Content creation rate**: templates published / week, posts / week, conversations started / week.
- **Monetization rate**: paying-users / total-users.
- **ARPU / ARPPU** (Average Revenue Per User / Paying User).

## 4. Vertical-level metrics

Per-card-type или per-vertical, общий шаблон:

- **Adoption**: card-type instances created / week.
- **Conversion funnel**: view → action → completion per-timeline.
- **Completion rate**: active timelines → completed (positive) vs cancelled (negative).
- **Revenue**: per-vertical (travel commissions, creator royalties, subscriptions).
- **NPS / satisfaction** (survey-based).

## 5. Feature-level (per-launch)

Before every feature launch — **metrics plan**:

```yaml
feature: ai-assist-trip-compose
launch-date: 2026-05-10
primary-metric: trip-compounds-created-via-ai / trip-compounds-created-total
secondary: 
  - user-satisfaction-on-ai-compose
  - ai-output-rejection-rate
  - ai-cost-per-user
guardrails:
  - overall-trip-creation-rate (не должен упасть)
  - user-reports (не должны вырасти)
target: +20% trip-compound creation rate in 30d
```

## 6. A/B testing

`services/feature-flags` (GrowthBook):

- **Assignment**: stable per-user через hash.
- **Exposure**: только когда user действительно попадает в код-path.
- **Sample ratio mismatch check**: automatic alert if variants unbalanced.
- **Stop criteria**: pre-registered (e.g. p < 0.01 on primary OR 30 days elapsed).
- **Guardrails**: ANY guardrail crosses threshold → auto-stop.

### Typical experiments

- UX changes (new CTA wording, new panel ordering).
- Ranking tweaks (template marketplace, feed).
- Pricing experiments (creator subscription tiers).
- Notification timing.

Запрещены без ADR:
- ML-training experiments на user-data без opt-in.
- Pricing experiments в regulated verticals (banking).
- Content-ordering experiments, меняющие safety (moderation strictness).

## 7. Funnel analysis

ClickHouse queries aggregate events в funnels:

```sql
WITH funnel AS (
  SELECT user_id,
    minIf(ts, event = 'trip-view')                  AS t1,
    minIf(ts, event = 'trip-start-create')          AS t2,
    minIf(ts, event = 'trip-add-child')             AS t3,
    minIf(ts, event = 'trip-materialize')           AS t4
  FROM events
  WHERE ts > now() - interval 7 day
  GROUP BY user_id
)
SELECT 
  countIf(t1 > 0) AS views,
  countIf(t2 > 0) AS start,
  countIf(t3 > 0) AS add_child,
  countIf(t4 > 0) AS materialize
FROM funnel
```

Dashboards — в SigNoz custom panels или отдельный BI-tool (Metabase?).

## 8. Retention

Cohort analysis:

```
Week 0: 1000 new users
Week 1: 400 still active (40%)
Week 2: 250 (25%)
Week 4: 180 (18%)
Week 12: 120 (12%)
```

Visualized as **cohort matrix** — каждая строка = неделя acquisition, столбцы = Retention at Week N.

Key: **Plateau** после Week-8 — если retention продолжает падать после 2 мес, product-market-fit проблема.

## 9. Segmentation

- By **acquisition source** (organic / paid / referral / partner).
- By **vertical-of-first-engagement**.
- By **region**.
- By **device-platform**.
- By **KYC-level** (proxy for engagement depth).
- By **creator** vs **consumer** mode primary.

## 10. Per-vertical kpi's (examples)

### Travel (Фаза 3)

- Trip-compounds created / week.
- Avg children count per compound.
- Booking-completion rate (timeline-complete vs timeline-cancel).
- Repeat-trip rate (same user creates 2+).

### Creator Economy (Фаза 4)

- Templates published / week.
- Fork-rate (fork / view).
- Creator revenue distribution (Gini coefficient — fairness).
- Cross-creator (percent of users who both create AND consume).

### Mobility (Фаза 5)

- Bookings / user / month.
- Avg-trip-value.
- Repeat-rental rate.

### Social (Фаза 7)

- Messages / DAU.
- Match-rate (dating).
- Video-completion-rate.
- Follow-graph density.

## 11. Alerts on anomalies

- **DAU drop** > 15% day-over-day → SEV-2.
- **Signup drop** > 30% week-over-week → SEV-2.
- **Revenue drop** > 20% → SEV-1.
- **Retention cohort ≥ 20% worse** than rolling average → investigation.
- **Gaming detected** (unusual spike в one region / one action) → moderation + trust-safety.

## 12. Dashboards (фрактально)

Шаблон dashboard идентичен platform'овому (`18-observability-ops.md §6`):

- Row 1: North-star visualization.
- Row 2: DAU / WAU / MAU.
- Row 3: Retention cohort matrix.
- Row 4: Funnel for the vertical.
- Row 5: Revenue / engagement metrics.
- Row 6: Notable experiments in flight.

Per-vertical dashboard — тот же шаблон с подстановкой данных.

## 13. Privacy-by-design в analytics

- PII не попадает в analytics tables (только pseudonymized user_id).
- User opt-out (GDPR / CCPA) → событие помечается `dropped: true`, не используется в aggregations.
- Regional laws: Analytics events могут не храниться для specific regions (compliance).

## 14. Reports и digests

- **Weekly product update** — auto-generated PDF / Slack message с top-metrics.
- **Monthly business review** — quarterly для exec.
- **Incident reports** — attach metric-impact to each SEV-1/SEV-2.

Автоматизируется через scheduled ClickHouse queries + markdown templates.

## 15. Integration с card-types

Card-types автоматически эмитят lifecycle events (`shell.action`, panel-resolved, action-clicked). **Дополнительные** events добавляются card-type'ом:

```ts
export default defineCardType({
  kind: 'trip-compound',
  analytics: [
    { event: 'trip.child-added', schema: {...} },
    { event: 'trip.draft-saved', schema: {...} },
  ],
  // ...
})
```

Events попадают в ClickHouse через общий pipeline. Никакого уникального analytics SDK per-card-type.

## 16. Tooling

- **ClickHouse** — source.
- **Metabase / Superset** — BI / dashboards (optional).
- **GrowthBook** — experiments.
- **SigNoz** — часть business-panel для top-metrics.
- Не пользуемся third-party analytics (Amplitude, Mixpanel) — privacy + cost.

## 17. Антипаттерны

- ❌ Vanity metrics без action'а (pageviews без understanding what next).
- ❌ PII в analytics events.
- ❌ Experiments без pre-registered stop criteria.
- ❌ Metrics собираются, но никто не смотрит.
- ❌ Third-party analytics с user-data export'ом.
- ❌ Retention cohorts не sliced per-vertical.
- ❌ Dashboard, который «никто не обновляет» более 30 дней — мёртвый.
- ❌ Ad-hoc queries без saving (знание уходит).
- ❌ Experiment running без guardrail'а.
