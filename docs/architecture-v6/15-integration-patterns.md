# 15. Integration Patterns

Как сервисы v6 общаются между собой. Четыре паттерна, каждый с чётким use-case. Смешивать запрещено.

## 1. Четыре транспорта

| Паттерн | Транспорт | Когда | Пример |
|---|---|---|---|
| **Sync Request/Response** | HTTP (OpenAPI) | Клиент ждёт свежий ответ; low-latency | UI → booking.getAvailability() |
| **Sync RPC (internal)** | gRPC | Between Go/Rust low-latency сервисов | matching-engine ↔ wallet |
| **Async Event (durable)** | NATS JetStream + CloudEvents | Reliable broadcast, downstream-сервисы | booking.slot-reserved → audit, analytics, notifications |
| **Async Event (ephemeral)** | Redis Pub/Sub | Presence, typing — терять можно | messenger.typing |
| **WebSocket** | Ticket-based (из v5.3) | Клиент ↔ сервер real-time (feed, messenger, timeline-updates) | shell → live updates |

## 2. Правила выбора

1. **Мутация в своей БД** → sync внутри сервиса.
2. **Side-effect в другом сервисе** → event публикуется в JetStream; downstream consumer делает.
3. **Чтение из другого сервиса** → HTTP.
4. **Read-heavy cross-service** → event-replicated projection (см. `14-data-architecture.md` §3b).
5. **Financial/audit/media/domain events** → durable stream.
6. **Presence/typing/live-cursor** → Redis Pub/Sub.

## 3. Saga pattern для cross-service transactions

Нет 2PC. Нет распределённых транзакций. Только **orchestrated sagas** через `timeline-engine`:

```
booking-flight-and-hotel (compound timeline)
├─ Step: flight.book            → on fail: retry, max 3
├─ Step: hotel.book             → on fail: COMPENSATE flight.cancel
├─ Step: wallet.charge          → on fail: COMPENSATE hotel.cancel + flight.cancel
└─ Step: email.sendConfirmation → on fail: just log, don't compensate
```

**Правила саг:**

- Каждый step — идемпотентный (I16).
- У каждого destructive step'а есть `compensate` handler.
- Compensating cascade выполняется **строго в обратном порядке**.
- Saga-state живёт в Temporal (durable).
- Если compensate падает — эскалация в `disputes` + человек.

## 4. Event schema discipline

Формат: `app.daria.<domain>.<event-name>.v<N>`. См. `packages/events/cloudevents-base.schema.json`.

**Ключевые доменные events (пример для booking):**

```
app.daria.booking.slot-requested.v1
app.daria.booking.slot-reserved.v1       # успех
app.daria.booking.slot-conflict.v1       # конкурент выкупил
app.daria.booking.slot-cancelled.v1
app.daria.booking.hold-expired.v1        # TTL истёк
```

**Правила:**

- Событие описывает **свершившийся факт**, не команду.
- Breaking change → новая версия (`v2`), `v1` deprecated ≥ 6 месяцев.
- Событие содержит всё, что нужно consumer'ам (избегать «обратного запроса» в producer).
- Subject — ID главной сущности для роутинга consumer-групп.

## 5. Consumer groups

JetStream поддерживает durable consumers. Каждый сервис-потребитель:

- Свой durable consumer name (`audit-log-consumer`, `analytics-consumer`, `moderation-consumer`).
- Ack после успешной обработки.
- Retry с exponential backoff.
- DLQ (dead-letter queue) после N неудач → эскалация в алерт.

## 6. Idempotency

Каждый request и каждый event имеет `id` (UUID v7). Handler пишет:

```
INSERT INTO processed_events (id, consumer) VALUES (?, ?) ON CONFLICT DO NOTHING
```

Если `affected_rows = 0` — событие уже обработано, skip. Это делает consumer'а идемпотентным по построению.

Для HTTP-мутаций — **Idempotency-Key header** (обязателен для всех `POST` с побочным эффектом). Сервер хранит `(key, user_id) → response` в Redis на 24 часа.

## 7. Timeouts и retries

| Слой | Timeout | Retries |
|---|---|---|
| UI → gateway (HTTP) | 30s | 0 (пользователь ретраит) |
| Gateway → service (HTTP) | 15s | 0 |
| Service → service (HTTP) | 5s | 2 с jitter |
| Service → external (HTTP) | 10s | 3 с exponential backoff |
| Event handler | per-consumer | до 5, затем DLQ |
| gRPC internal (exchange) | 100ms | 1 |
| WS reconnect (client) | — | exponential, max 60s |

## 8. Circuit breakers

Critical external integrations (GDS, PSP, KYC) защищены circuit-breaker'ом:

- threshold: 50% error rate за 30s → open
- half-open: 1 пробный запрос через 60s
- full-open: при 3 подряд успехах

Реализация — в `services/gateway` как плагин Traefik + в SDK сервисов.

## 9. Tracing

**Инвариант**: `traceparent` присутствует в каждом HTTP-запросе и каждом event'е.

- В HTTP — W3C Trace Context header.
- В CloudEvents — поле `traceparent` в envelope.
- В gRPC — OTEL propagator.
- В timeline-engine — span per-step, связь с parent workflow span.

Результат: в SigNoz видно полный путь «UI click → gateway → service A → event → service B → wallet → TigerBeetle».

## 10. Rate limiting

Два уровня:

1. **Gateway** (Traefik) — общий per-user, per-IP, per-endpoint.
2. **Service-level** — Redis-based counters для специфичных action'ов (messages/min, search requests, etc).

Rate-limit violations публикуются в `trust-safety` (могут быть сигналами atак).

## 11. Observability-hooks

Каждая интеграционная граница обязана:
- Emit `duration_ms` metric в SigNoz.
- Emit `errors_total{reason}` метрику.
- Emit trace span с нормализованным именем (`service.operation.subresource`).
- Log structured: `{ op, userId, entityId, traceId, latency_ms, result }`.

Без этого — не деплоить.

## 12. API-versioning

- URL-path для breaking changes: `/v1/...`, `/v2/...`.
- Minor changes — через additive-only (новые опциональные поля, новые endpoints).
- Deprecation: header `Sunset: <date>` ≥ 6 месяцев.
- Клиент `packages/sdk-*` закрепляет конкретную версию.

## 13. Concrete saga example (travel booking)

Booking a flight+hotel as atomic operation:

```typescript
// services/timeline-engine — orchestrator
const travelBookingSaga = defineWorkflow({
  id: 'travel-booking-{userId}-{tripId}',
  steps: [
    {
      id: 'hold-flight',
      kind: 'auto',
      handler: 'booking.createHold',
      params: { resourceKind: 'flight', resourceId: flightId, ttl: '10m' },
      compensate: 'booking.releaseHold',  // idempotent cancel
      retry: { max: 3, backoff: 'exponential' },
    },
    {
      id: 'hold-hotel',
      kind: 'auto',
      handler: 'booking.createHold',
      params: { resourceKind: 'hotel-room', resourceId: hotelId, ttl: '10m' },
      compensate: 'booking.releaseHold',
      retry: { max: 3, backoff: 'exponential' },
    },
    {
      id: 'policy-gate',
      kind: 'gate',
      handler: 'policy-engine.evaluate',
      params: { action: 'booking.finalize', context: { userId, amount } },
      require: 'allow',                    // deny → timeline.cancel → compensate chain
    },
    {
      id: 'charge',
      kind: 'auto',
      handler: 'payments.createCharge',
      params: { userId, amountCents: total, currency, idempotencyKey: '{tripId}' },
      compensate: 'payments.refund',
      retry: { max: 5, backoff: 'exponential', maxDelay: '1h' },  // PSP retry
    },
    {
      id: 'confirm-flight',
      kind: 'external',
      handler: 'booking.confirmHold',      // now PSP succeeded
      params: { holdId: '{hold-flight.result.id}' },
      compensate: 'gds.cancelBooking',
    },
    {
      id: 'confirm-hotel',
      kind: 'external',
      handler: 'booking.confirmHold',
      params: { holdId: '{hold-hotel.result.id}' },
      compensate: 'hotel-provider.cancelBooking',
    },
    {
      id: 'notify',
      kind: 'auto',
      handler: 'notifications.send',
      params: { template: 'booking-confirmed', userId },
      // non-critical: no compensate
    },
  ],
  completion: { on: 'notify.done' },
})
```

**Compensating chain** (при failure):

```
confirm-hotel fails after confirm-flight succeeded
  ↓
compensate order (обратный):
  1. cancel-flight (confirm-flight.compensate)
  2. refund-charge (charge.compensate)  
  3. release-hotel-hold (hold-hotel.compensate)
  4. release-flight-hold (hold-flight.compensate)
```

Каждая compensate — idempotent (I16). Если сама compensate fails → эскалация в `services/disputes`.

## 14. Idempotency patterns

### HTTP idempotency

```
POST /payments/charges HTTP/1.1
Idempotency-Key: 7c9e6679-7425-40de-944b-e07fc1f90ae7

# Server stores (key, userId, response) в Redis на 24h
# Re-POST с тем же ключом → returns cached response
```

### Event idempotency

```typescript
// В consumer
async function onSlotReserved(event) {
  const processed = await db.queryOne(
    'INSERT INTO processed_events (id, consumer, at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING RETURNING id',
    [event.id, 'my-consumer']
  )
  if (!processed) return   // already processed, skip
  
  // ... actual logic
}
```

### Temporal workflow idempotency

```typescript
// Workflow ID deterministic by business-key
const workflowId = `booking-${userId}-${tripId}`

await temporal.start(travelBookingSaga, {
  workflowId,
  workflowIdReusePolicy: 'REJECT_DUPLICATE',   // fail если already running
})
```

## 15. Circuit breaker implementation

```typescript
// services/gateway plugin или per-service
const circuitBreaker = new CircuitBreaker({
  threshold: { errorRate: 0.5, within: '30s' },  // 50% errors → trip
  halfOpen: { trialAfter: '60s' },               // probe after 60s
  closeAfter: { successCount: 3 },                // 3 successes → close
  fallback: async (req) => {
    // fallback: return cached response / error
    return { data: null, error: 'upstream-unavailable', cached: true }
  },
})

await circuitBreaker.execute(() => externalPSP.charge(req))
```

**State transitions**:
- **Closed**: normal, requests flow.
- **Open**: fail fast, no upstream calls.
- **Half-Open**: single probe → success closes, failure reopens.

## 16. Trace propagation — concrete

```typescript
// HTTP request incoming
app.use(async (req, res, next) => {
  const traceparent = req.headers['traceparent']
  const parentContext = traceparent 
    ? propagation.extract({ traceparent })
    : ROOT_CONTEXT
  
  const span = tracer.startSpan('service.operation', {}, parentContext)
  
  // Propagate в downstream calls
  req.traceContext = trace.setSpan(parentContext, span)
  res.on('finish', () => span.end())
  await next()
})

// Outgoing HTTP call
const headers = {}
propagation.inject(req.traceContext, headers)   // adds 'traceparent'
await fetch(downstreamUrl, { headers })

// Event publishing
const event = {
  ...cloudEvent,
  traceparent: propagation.extract(req.traceContext).traceparent,
}
await jetstream.publish(event)

// Event consumer
const parentContext = propagation.extract({ traceparent: event.traceparent })
const span = tracer.startSpan('consumer.handle', {}, parentContext)
```

Результат: full trace от UI tap → gateway → service A → event → service B → wallet → DB в SigNoz.

## 17. Антипаттерны

- ❌ Синхронный цепочечный вызов через 3+ сервиса в hot-path.
- ❌ Event как команда (`app.daria.user.pleaseRegister.v1`). Event — факт.
- ❌ Держать state саги в БД одного из participant'ов. Только в Temporal.
- ❌ Retrying non-idempotent handlers без idempotency key.
- ❌ Обходить gateway для service-to-service (исключение: internal mesh с mTLS).
- ❌ Использовать HTTP для presence/typing — это только Redis Pub/Sub.
- ❌ Consumer без DLQ и без метрики error-rate.
