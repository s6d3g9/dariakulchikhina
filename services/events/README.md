# services/events

Layer 2 — Platform. NATS JetStream kлaster config + stream definitions.

Не сервис в обычном смысле — это **конфигурация event-backbone**.

См. [docs/architecture-v6/38-event-schema-governance.md](../../docs/architecture-v6/38-event-schema-governance.md) для schema management.

## Streams

| Stream | Retention | Subjects |
|---|---|---|
| `durable-domain` | 30 дней | `app.daria.>` (все кроме financial/presence) |
| `financial-audit` | 5 лет WORM | `app.daria.wallet.>`, `authorship.royalty.>`, `payments.>` |
| `medical-audit` | 10 лет WORM | `app.daria.health.>` |
| `ephemeral-presence` | (Redis, не JetStream) | presence, typing |

## Cluster

- 3 nodes minimum.
- Raft replication.
- Cross-region replication для `financial-audit` + `medical-audit`.

## Deploy

- Фаза 0: docker-compose single-node (dev).
- Фаза 2: 3-node cluster.
- Фаза 6: managed / operator-based (Kubernetes).

## Schema registry

`packages/events/domains/<domain>/<event>.v<N>.schema.json` — single source. CI validates.

## Consumer groups

Per-service durable consumers с ACK + DLQ. Naming: `<service>-<event-filter>-v<N>`.

## Метрики

- `events.published.rate{stream, type}`
- `events.consumer.lag{consumer}`
- `events.dlq.size{consumer}`
- `events.replication.lag{stream}`

## Phase

Фаза 0 (config skeleton), Фаза 2 (3-node prod).
