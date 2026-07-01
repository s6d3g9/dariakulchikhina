# 18. Observability & Ops

Единый observability-стек на весь v6 — от shell-жеста до on-chain транзакции. Цель: любой инцидент воспроизводим за минуты, любой регуляторский запрос закрывается выгрузкой, любой продуктовый вопрос отвечается через один UI.

## 1. Три столпа + четвёртый

Стандарт OpenTelemetry, везде. Бэкенд — **SigNoz** (self-hosted, single-binary заменяет Grafana stack).

| Столп | Что собираем | Где смотрим |
|---|---|---|
| **Traces** | Каждый HTTP/gRPC/Event/Workflow с parent-child | SigNoz Traces |
| **Metrics** | RED (Rate / Errors / Duration) + USE (Utilization / Saturation / Errors) | SigNoz Metrics |
| **Logs** | Structured JSON, связаны с trace_id | SigNoz Logs |
| **Events (business)** | Доменные CloudEvents (`app.daria.*`) в ClickHouse | SigNoz + custom product-dashboards |

Business-events — **четвёртый столп**, критичный для продуктовой/финансовой/compliance-аналитики.

## 2. Trace-контракт

**Инвариант**: каждая операция имеет trace_id, span покрывает границу сервиса, span name нормализован.

```
span name: <service>.<operation>.<subresource>
# примеры:
booking.createSlot
wallet.transfer.debit
timeline.step.run
pattern.fork
policy.evaluate
```

Attributes (обязательны):
- `user.id`, `user.role`, `region.code`
- `entity.kind`, `entity.id`
- `action.type` (create / read / update / delete / evaluate)
- `card.type` (если операция в контексте card-type)
- `result` (ok / fail / denied / distilled)

Attributes (опциональны, по уместности):
- `payment.amount`, `payment.currency`
- `wallet.account`, `wallet.tx_id`
- `policy.decision`, `policy.id`
- `timeline.id`, `timeline.step`

## 3. Golden signals — на каждом уровне

### Per-service RED

- **Rate** — запросов в секунду
- **Errors** — доля 5xx / ошибочных consumer'ов
- **Duration** — p50 / p95 / p99 / p99.9

Dashboard «Service Overview» — идентичный для всех 35 сервисов (фрактальность доков!). Имя сервиса — единственное, что меняется.

### Per-user-journey

Metrics, собранные из trace'ов:
- Время от тапа до первого байта ответа
- Время от action'а до completion саги
- Кол-во retries в пути
- % пути, прошедшее через compensating actions

### Per-business

- Conversions по card-type (view → action → completion)
- Royalty payouts / час
- Active timelines с dead-step'ами
- Gate-denials (удельный вес distill / deny по регионам)

## 4. SLO — формально

| Пользовательский путь | SLI | SLO (monthly) |
|---|---|---|
| Логин через Zitadel | p95 latency | < 500ms · 99.9% |
| Открытие карточки | p95 latency | < 800ms · 99.5% |
| Бронь слота (booking) | success rate | > 99.0% |
| Wallet transfer | success rate | > 99.95% |
| Royalty distribution (per event) | latency p99 | < 30s |
| Timeline step (auto) | completion | > 99.9% |
| Push-notification delivery | success rate | > 99.0% |
| Policy evaluate | p99 latency | < 5ms |
| Audit-log write (durability) | loss rate | 0 (WORM) |

Error budget — 1 - SLO. Исчерпание → freeze feature-deploy до восстановления (через Argo CD).

## 5. Alert-правила

Alert severity согласуется с incident severity (`51-incident-response.md §1`). Три уровня релевантны для alerting; SEV-4/5 — обычно не alert'ят (tickets).

| Severity | Когда | Куда |
|---|---|---|
| **SEV-1** | Финансовое, безопасность, full outage | PagerDuty + on-call phone + exec-page |
| **SEV-2** | Частичная деградация, подкожное (SLO burn 2x) | PagerDuty + Slack |
| **SEV-3** | Аномалии, noise, фоновый (SLO burn 1x) | Slack only |

Правила — в `platform/observability/alerts/*.yaml`. Примеры:

```yaml
- name: wallet-transfer-failure-rate
  severity: SEV-1
  condition: rate(errors{service="wallet",op="transfer"}[5m]) > 0.001
  description: >500 успешных переводов в минуту / больше 1 ошибки — подозрение на кривую миграцию ledger'а.

- name: policy-evaluate-latency
  severity: SEV-2
  condition: histogram_quantile(0.99, policy_evaluate_duration) > 10ms

- name: timeline-dead-step
  severity: SEV-2
  condition: count(timeline_step_status="failed", age > 1h) > 10

- name: dlq-accumulation
  severity: SEV-2
  condition: jetstream_consumer_pending{stream="durable-domain"} > 1000 for 10m

- name: audit-log-write-failure
  severity: SEV-1
  condition: rate(errors{service="audit-log"}[1m]) > 0
  # audit — любой сбой — SEV-1, это регуляторка
```

## 6. Dashboards — шаблонные (фрактальность!)

Один шаблон, подставляется service name. Запрет на «уникальный» dashboard под конкретный сервис без явной причины.

**Standard Service Dashboard** (для всех 35 сервисов):

- Row 1: RED (rate, errors, duration p50/95/99)
- Row 2: dependencies (downstream latencies, upstream call-counts)
- Row 3: saturation (CPU, RAM, connection pools, JetStream lag)
- Row 4: business (domain-specific event rates — per-service template slot)
- Row 5: SLO burn rate

**Cross-service dashboards** (отдельно):
- User Journey (по `user.id` собирает trace-путь)
- Compound Timeline (по `timeline.id` — все саги, их compensations)
- Financial Flow (wallet-transfers, royalty, escrow-releases)
- Governance (policy decisions: allow/distill/deny heatmap by region × action)

## 7. Logs — дисциплина

Structured JSON, ни одной строки plain-text:

```json
{
  "ts": "2026-05-10T12:00:00.123Z",
  "level": "info",
  "service": "booking",
  "op": "createSlot",
  "trace_id": "0x...",
  "span_id": "0x...",
  "user_id": "u_123",
  "entity_id": "b_456",
  "result": "ok",
  "latency_ms": 42,
  "msg": "slot reserved"
}
```

Запрещено:
- ❌ `console.log('something happened')`
- ❌ Логировать PII напрямую (только hashed / pseudonymized)
- ❌ Логировать секреты, токены, ключи (redaction в logger middleware)
- ❌ Логи без trace_id

## 8. Audit-log отдельно

`services/audit-log` — не обычные логи. Это **compliance-grade** append-only стрим с WORM-хранилищем:

- Писатель: consumer `app.daria.*` events из JetStream.
- Хранилище: ClickHouse + S3 cold tier с object-lock (Фаза 6+).
- Retention: 5 лет для финансовых / governance, 10 лет для медицинских.
- Read API: поиск по user / entity / time / event-type; экспорт в PDF для регулятора.
- Удаления: **технически невозможны** (инвариант I17).

## 9. Incident response

Процедура на SEV-1 (полная в `51-incident-response.md`):

1. **Detect** — алерт в PagerDuty, on-call поднимается.
2. **Triage** — SigNoz dashboard «Incident Overview» + runbook ссылка.
3. **Mitigate** — первый шаг не фикс, а остановка кровотечения (rollback, circuit-breaker, feature-flag OFF).
4. **Communicate** — статус-страница обновляется автоматически на базе SLO burn.
5. **Resolve** — исправление в коде / инфре.
6. **Post-mortem** — blameless, в `docs/incidents/YYYY-MM-DD-<slug>.md`, публичные действия.
7. **Action-items** — в tracker, дедлайн 2 недели.

Каждый SEV-1 / SEV-2 обязан иметь **runbook** в `docs/runbooks/<alert-name>.md` перед тем, как уйти в прод.

## 10. Chaos и game-days

С Фазы 6 (зрелая инфра):

- **Chaos Mesh** в staging — kill random pod, delay network, corrupt packet.
- **Game-day** раз в квартал — симуляция инцидента, тренировка on-call.
- **DR-тест** раз в полгода — реальная проверка backup-restore.

## 11. Observability для card-types (фрактальность!)

Каждый card-type **обязан** эмитить стандартные метрики через интерфейс `Observable`:

```ts
interface CardTypeObservability {
  // Эмитится shell'ом при рендере center-view
  onOpen(ctx: { kind, entityId, view, mode })
  // Эмитится при переходе timeline-шага
  onTimelineTransition(ctx)
  // Эмитится при выполнении action из CTA
  onAction(ctx: { action, result })
  // Эмитится при инверсии ⇄
  onInversion(ctx)
}
```

Реализация — в `packages/ui-react/hooks/useCardTelemetry.ts`. Card-type авторам ничего не нужно делать вручную. Все card-type автоматически дают единые события.

## 12. Privacy-by-design в observability

- PII не попадает в logs / traces без redaction.
- User-id — псевдонимизированный per-environment (prod id != staging id).
- Request bodies / response bodies — только размер, не содержание (если content-sensitive).
- Medical / banking traces — отдельный stream с ограниченным доступом (RBAC в SigNoz).

## 13. Runbook template

```markdown
# Runbook: <alert-name>

## Severity
<SEV-1 | SEV-2 | SEV-3>

## What this alert means
<один абзац>

## Dashboards to open
- [Service Overview: <service>](link)
- [Relevant business metric](link)

## Immediate actions (in order)
1. <stop the bleeding>
2. <verify impact scope>
3. <communicate>

## Investigation
<шаги диагностики с ожидаемым выводом>

## Known common causes
- <cause 1> → <mitigation>
- <cause 2> → <mitigation>

## Escalation
- <кто, когда>

## Post-mortem template link
```

## 14. Антипаттерны

- ❌ Собирать metrics per-service на своём стеке (Prometheus в одном сервисе, Datadog в другом).
- ❌ Логгировать PII / секреты — даже в dev.
- ❌ Уникальный dashboard на каждый сервис вместо шаблона.
- ❌ Алерт без runbook'а.
- ❌ Логи без trace_id.
- ❌ Спан `doStuff()` без нормализованного имени.
- ❌ Уровень логирования по умолчанию `debug` в prod.
- ❌ Custom OpenTelemetry propagator per-service.
