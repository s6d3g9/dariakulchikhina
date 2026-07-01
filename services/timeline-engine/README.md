# services/timeline-engine

Layer 3 — Domain Primitive. Универсальный движок жизненного цикла для всех Pattern-Card.

См. [docs/architecture-v6/10-timeline-engine.md](../../docs/architecture-v6/10-timeline-engine.md) для полной спецификации.

## Что делает

- Превращает декларативные `defineTimeline({ steps, completion })` в Temporal workflows.
- Хранит текущий статус timelines в Postgres (для быстрых queries от UI).
- Исполняет 5 типов шагов: `auto`, `human`, `external`, `gate`, `compound`.
- Публикует события каждого перехода в JetStream.
- Поддерживает compensating sagas (rollback через `compensate` handlers).
- Интегрирует `gate` шаги с `policy-engine` (allow / distill / deny).
- Связывает все steps с `audit-log` через evidence + events.

## Рантайм

- **Language**: TypeScript (Node).
- **Durable executor**: Temporal server (отдельно, см. `platform/docker-compose/`).
- **State store**: Postgres `timeline_db` (workflow_refs, timelines, steps, evidence_refs).
- **Event publisher**: NATS JetStream stream `durable-domain`.

## API (skeleton)

```
POST   /timelines                         # start a new timeline from defineTimeline
GET    /timelines/:id                      # full state
GET    /timelines/:id/stream               # SSE updates
POST   /timelines/:id/steps/:sid/submit    # for human steps
POST   /timelines/:id/cancel               # triggers compensating cascade
GET    /users/:id/timelines?status=active  # listing
GET    /timelines/:id/audit                # chain of events + evidence
```

## Интеграции

- **Publishes**:
  - `app.daria.timeline.started.v1`
  - `app.daria.timeline.step-entered.v1`
  - `app.daria.timeline.step-completed.v1`
  - `app.daria.timeline.step-failed.v1`
  - `app.daria.timeline.compensated.v1`
  - `app.daria.timeline.completed.v1`
- **Consumes**:
  - `app.daria.governance.policy-evaluated.v1` — для gate-шагов
  - `app.daria.payments.payment-confirmed.v1` — для auto-continue
  - Внешние webhook'и через `external` step-handlers

## Contracts

Zod схемы в `packages/contracts-domain/timeline.ts`:
- `TimelineStep`, `TimelineEvent`, `TimelineRef`, `Evidence`, `GateSpec`, `HumanActionSpec`

## Инварианты

- I4 (event-first)
- I6 (own Postgres DB)
- I16 (idempotent, retry-safe steps; compensation через sagas)
- I17 (evidence в WORM audit)
- I21 (timeline обязателен для card-type)

## Фаза реализации

Фаза 2 (domain primitives).

## Статус

Skeleton only. Реализация — после Фазы 1 (identity + gateway + events готовы).
