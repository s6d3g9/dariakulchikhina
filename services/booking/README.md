# services/booking

Layer 3 — Domain Primitive. Универсальный резервирующий движок: слоты, календари, холды, overbooking-protection через OCC.

## Что делает

- Управляет **bookable inventory** (слоты, места, single-units).
- Создаёт **holds** (temporary reservation) с TTL.
- Подтверждает holds → bookings.
- Генерирует события для timeline-engine и audit.
- OCC (optimistic concurrency, инвариант I9).
- Cross-booking conflict check.

## Не делает

- Payment processing (→ `services/payments`).
- Long-running workflow (→ `services/timeline-engine`).
- Pricing / taxation (→ card-type-level logic).

## Рантайм

- TypeScript, Nitro.
- Postgres `booking_db`:
  - `bookings` — final state
  - `holds` — temporary с expires_at
  - `inventory_snapshots` — read-model для availability
  - `availability_calendars` — derived

## API (skeleton)

```
GET  /availability?resource=:id&from=&to=              # free slots
POST /holds                                             # request hold (idempotent)
POST /holds/:id/confirm                                 # → booking
POST /holds/:id/release                                 # explicit cancel
GET  /bookings/:id
POST /bookings/:id/cancel                               # with policy
POST /bookings/:id/modify                               # OCC
GET  /users/:id/bookings?status=active
```

## Hold lifecycle

```
request → hold (TTL 10m default) → confirm (payment ok) → booking
                                   ↘ expire (auto) → released
                                   ↘ cancel (manual) → released
```

## Integrations

- **Publishes**:
  - `app.daria.booking.hold-created.v1`
  - `app.daria.booking.hold-expired.v1`
  - `app.daria.booking.slot-reserved.v1`
  - `app.daria.booking.slot-cancelled.v1`
  - `app.daria.booking.slot-modified.v1`
- **Consumes**:
  - `app.daria.payments.payment-confirmed.v1` → confirm hold
  - `app.daria.payments.payment-failed.v1` → release hold
- **Calls**:
  - `inventory.reserve` / `inventory.release`
  - `policy-engine.evaluate` (can-user-book?)

## Инварианты

- I4, I6, I9 (OCC), I16 (idempotent)

## Используется card-type'ами

Почти всеми: `flight-ticket`, `hotel-room`, `taxi-ride`, `rental-*`, `medical-appointment`, `event-ticket`, `home-cleaning`, etc. См. `06-card-types-matrix.md` столбец Primitives.

## Фаза

Фаза 2 (domain primitives).

## Статус

Skeleton only.
