# packages/events/ — CloudEvents schema registry

Единственный источник истины для формата событий в NATS JetStream. Все сервисы публикуют и консьюмят по этим схемам.

## Правила

1. **Все мутационные события** публикуются в JetStream (инвариант I4).
2. Формат — **CloudEvents 1.0** JSON (см. `cloudevents-base.schema.json`).
3. Имя события — `app.daria.<domain>.<event-name>.v<N>`. Пример: `app.daria.booking.slot-reserved.v1`.
4. Breaking change схемы → новая версия (`v2`), старая остаётся с deprecated-tag ≥ 6 месяцев.
5. `traceparent` обязателен — все события связаны с OpenTelemetry span'ами.

## Структура (плановая)

```
events/
  cloudevents-base.schema.json           # базовый формат (✓)
  domains/
    identity/
      user-registered.v1.schema.json
      user-logged-in.v1.schema.json
    booking/
      slot-reserved.v1.schema.json
      slot-cancelled.v1.schema.json
    ownership/
      asset-transferred.v1.schema.json
    authorship/
      template-forked.v1.schema.json
      royalty-distributed.v1.schema.json
    ...
  streams/                               # определения JetStream streams
    durable-domain.json
    ephemeral-presence.json
  policies/                              # retention policies per type
    financial.json                       # 5 лет
    domain.json                          # 30 дней
    presence.json                        # 0 (ephemeral)
```

## Streams

### `durable-domain` (JetStream, retention 30 дней)

Все доменные события. Потребители: analytics, audit, moderation, downstream services.

### `financial-audit` (JetStream, retention 5 лет, WORM)

Финансовые события (wallet, payments, royalty). WORM — никаких удалений. Обязательно для регуляторики.

### `ephemeral-presence` (Redis Pub/Sub, не JetStream)

Presence, typing, live-updates. Невосстановимо — но это ок (инвариант I4 про durable, для эфемерного отдельный транспорт).

## Генерация TS-типов

CI читает JSON Schema и генерит TS-типы в `packages/events/dist/`. Сервисы импортируют `@daria/events` — никакого ручного дублирования.

## Статус

- Базовый schema: ✓
- Первые доменные схемы: Фаза 1 (identity events) и Фаза 2 (booking, authorship).
