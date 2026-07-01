# 38. Event Schema Governance

Events — **API между сервисами**. Их эволюция должна быть такой же дисциплинированной, как REST-API versioning. Этот документ фиксирует: как изменять схемы, как поддерживать compatibility, когда брейкать, когда депрекейтить.

## 1. Нейминг и версии

Формат из `packages/events/cloudevents-base.schema.json`:

```
app.daria.<domain>.<event-name>.v<MAJOR>

examples:
  app.daria.booking.slot-reserved.v1
  app.daria.wallet.transfer-completed.v1
  app.daria.authorship.royalty-distributed.v2
```

**MAJOR** = breaking change. Minor/patch changes — additive-only, тот же v-номер.

## 2. Три типа изменений

### (a) Additive-only (same version)

Без bump версии:
- Новое **optional** поле с default-value.
- Новый enum-value в open-enum поле.
- Деprecated-to-remove поле остаётся в schema (лишь `deprecated: true` marker).

Consumer'ы игнорируют незнакомые поля (forward-compat).

### (b) Non-breaking rename (additive-only)

- Добавить новое имя поля.
- Дублировать данные в оба.
- Deprecate старое (≥ 6 мес).
- Удалить в следующей MAJOR версии.

### (c) Breaking (new MAJOR)

- Remove required поле.
- Change type required поля.
- Rename event (new topic name).
- Change semantics existing поля (например, currency was minor-unit, теперь cents).

Triggers new version; **обе версии** публикуются параллельно во время миграции.

## 3. Deprecation lifecycle

```
v1 live, v2 proposed (RFC)
  ▼ 30 дней
v1 live, v2 live (dual-publish); consumers migrate one by one
  ▼ 6 месяцев
v1 deprecated (marker + warnings); v2 primary
  ▼ 6 месяцев  
v1 removed from registry; producers перестают публиковать
  ▼
v1 events остаются в audit-log forever (immutable)
```

Full deprecation cycle: **minimum 12 months** (6 dual + 6 deprecated).

## 4. Schema registry

`packages/events/domains/<domain>/<event-name>.v<N>.schema.json` — single source:

```json
{
  "$id": "https://daria.app/events/booking/slot-reserved.v1.schema.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "BookingSlotReserved v1",
  "description": "Emitted when a booking slot is successfully reserved.",
  "version": "1.0.0",
  "deprecated": false,
  "deprecationDate": null,
  "replacedBy": null,
  "type": "object",
  "required": ["slotId", "userId", "reservedAt"],
  "properties": { /* ... */ }
}
```

Meta-fields:
- `version` — semver.
- `deprecated` + `deprecationDate` — для lifecycle.
- `replacedBy` — ссылка на v2 schema.

## 5. CI checks

Каждый PR, меняющий events:

1. **JSON Schema valid** (AJV).
2. **Breaking change detect** (через `oasdiff`-подобный tool).
3. Если breaking — fail, unless PR-label `breaking-change` + ADR reference.
4. **Forward-compat test**: existing consumers должны handle events с additional fields.
5. **Replay test**: consumer может replay последние 1000 production-events schema.

## 6. Consumer discipline

### Producer contract

- Поле published → consumers могут rely на него.
- Rename/remove — через deprecation cycle.
- Semantic change — **всегда** new major.

### Consumer contract

- Ignore unknown fields (forward-compat).
- Handle missing optional fields gracefully.
- Subscribe **на конкретную версию** события, не на topic'ы «v1 and v2».
- При появлении v2 — отдельно пишется handler, migrate postepenно.

## 7. Event-sourced projections

Read-models в consumer-сервисах обновляются из events. При breaking change:

1. Keep old handler alive (consumes v1).
2. Add new handler (consumes v2).
3. Cutover: after v1 producers stopped, disable old handler.
4. Если нужно **rebuild** projection (новая field, старые data) → replay from history.

**NATS JetStream retention** — по умолчанию 30 дней для `durable-domain`. Для breaking-change rebuild рекомендуется 90 days retention. Для `financial-audit` — 5 лет, rebuild всегда возможен.

## 8. Schema-first workflow

Перед implementation любого events-producing code:

1. PR только schema (`packages/events/domains/<...>/...schema.json`).
2. Review от owning team + consumers team.
3. Merge schema.
4. Generate TS types: `pnpm codegen:events`.
5. Producer и consumer код — в следующем PR.

## 9. Per-stream schema rules

### `durable-domain` stream

- 30-day retention.
- All domain events.
- Schema mandatory.
- Versioning согласно правилам above.

### `financial-audit` stream

- 5-year retention (WORM).
- Stricter: breaking change — **почти never**, только с compliance approval.
- Если breaking change — **обе** версии live ≥ 2 years.

### `ephemeral-presence` (Redis Pub/Sub, not JetStream)

- No retention.
- Looser schema discipline (no version).
- Optional schema для IDE autocomplete.

## 10. Event metadata

Обязательные поля (уже в `cloudevents-base.schema.json`):

```json
{
  "specversion": "1.0",
  "type": "app.daria.booking.slot-reserved.v1",
  "source": "/services/booking",
  "id": "uuid-v7",
  "time": "2026-05-10T12:00:00Z",
  "datacontenttype": "application/json",
  "traceparent": "00-<trace-id>-<span-id>-01",
  "subject": "slot-<id>",
  "data": { /* ... */ }
}
```

Breaking change в envelope — **не происходит** без ADR.

## 11. Schema discovery

- **Browseable registry**: `/schemas` endpoint в какой-то internal tool (e.g. Apicurio / Buf / own).
- List events with versions, producers, consumers, deprecated status.
- Search: by domain / subject / recent changes.
- For developer onboarding — «what events are available?».

## 12. Protobuf как альтернатива (opt-in, Фаза 6+)

Для high-volume streams (media-pipeline, matching-engine):

- Protobuf более compact + typed.
- Code-gen per-language.
- Переход — **optional** per-event, не global.
- CloudEvents envelope может use protobuf encoding.

Decision выбирать protobuf — ADR per-event-series.

## 13. Backward compat tests

`packages/testing/event-compat-harness`:

- Hold snapshot schemas (v1, v2, ...).
- For each consumer, replay historical events → expect no errors.
- При каждом change new schema → run compat-suite.

## 14. Metrics

- `events.schema.pending-deprecation{event}` — how many months left.
- `events.consumer.version-lag{consumer}` — на каких версиях сидит consumer.
- `events.produced.rate{type,version}`.
- `events.unrecognized-fields{consumer}` — unknown-field rate (warning для potential new fields).

## 15. Антипаттерны

- ❌ Rename event без deprecation cycle — ломает consumers.
- ❌ Change data-type required field без MAJOR.
- ❌ Consumer subscribes на `*.v*` regex — забирает все версии, неуправляемо.
- ❌ Schema хранится в коде producer'а (не в `packages/events/`).
- ❌ Deprecation без ETA — никогда не удаляется.
- ❌ Breaking change in `financial-audit` без compliance review.
- ❌ Producer меняет semantics существующего поля без new version — silent data corruption.
- ❌ Dual-publish меньше 30 дней.
- ❌ Consumers игнорируют deprecation warnings → breakaje при removal.
