# Phase 1 / Week 2 / Thursday: NATS JetStream production

Цель: 3-node cluster, streams configured, consumers protected, monitoring.

## Шаг 1: Multi-node cluster

Production NATS — 3 nodes (quorum). Для docker-compose dev — simulate:

`platform/docker-compose/nats/nats-cluster.yml` (добавить при надобности):

```yaml
services:
  nats-1:
    image: nats:2.10-alpine
    command: ["-c", "/etc/nats.conf", "--name=nats-1"]
    volumes:
      - ./nats-1.conf:/etc/nats.conf:ro
      - nats-1-data:/data
    ports:
      - "4222:4222"
      - "6222:6222"

  nats-2:
    image: nats:2.10-alpine
    command: ["-c", "/etc/nats.conf", "--name=nats-2"]
    volumes:
      - ./nats-2.conf:/etc/nats.conf:ro
      - nats-2-data:/data
    ports:
      - "4223:4222"
      - "6223:6222"

  nats-3:
    image: nats:2.10-alpine
    command: ["-c", "/etc/nats.conf", "--name=nats-3"]
    volumes:
      - ./nats-3.conf:/etc/nats.conf:ro
      - nats-3-data:/data
    ports:
      - "4224:4222"
      - "6224:6222"

volumes:
  nats-1-data:
  nats-2-data:
  nats-3-data:
```

Each node config (e.g. `nats-1.conf`):

```
server_name: nats-1
listen: 0.0.0.0:4222
http: 0.0.0.0:8222

cluster {
  name: daria-nats-cluster
  listen: 0.0.0.0:6222
  routes: [
    nats-route://nats-2:6222
    nats-route://nats-3:6222
  ]
}

jetstream {
  store_dir: /data
  max_memory_store: 1G
  max_file_store: 50G
}

accounts {
  DARIA: {
    jetstream: enabled
    users: [
      { user: "daria-services", password: "$2a$11$..." }  # bcrypt-hashed, stored в Infisical в prod
    ]
  }
  SYS: {
    users: [
      { user: "admin", password: "$2a$11$..." }
    ]
  }
}

system_account: SYS
```

## Шаг 2: Stream configuration — code-as-config

`packages/events/scripts/ensure-streams.ts`:

```typescript
import { connect, JetStreamManager, StreamConfig } from 'nats'

async function ensureStreams() {
  const nc = await connect({
    servers: process.env.NATS_URL?.split(',') ?? ['nats://localhost:4222'],
    user: process.env.NATS_USER ?? 'daria-services',
    pass: process.env.NATS_PASSWORD,
    reconnect: true,
  })
  const jsm = await nc.jetstreamManager()

  // Stream 1: durable-domain (30 days)
  await upsertStream(jsm, {
    name: 'durable-domain',
    subjects: ['app.daria.>'],
    storage: 'file' as any,
    retention: 'limits' as any,
    max_age: 30 * 24 * 3600 * 1e9,  // 30 days nanoseconds
    max_bytes: 50 * 1024 * 1024 * 1024,  // 50 GB
    max_msgs: -1,
    discard: 'old' as any,
    num_replicas: 3,  // all 3 nodes hold copies
    duplicate_window: 60 * 1e9,  // 60s dedup window
  })

  // Stream 2: financial-audit (5 years WORM)
  await upsertStream(jsm, {
    name: 'financial-audit',
    subjects: [
      'app.daria.wallet.>',
      'app.daria.payments.>',
      'app.daria.authorship.royalty.>',
      'app.daria.subscription.>',
    ],
    storage: 'file' as any,
    retention: 'limits' as any,
    max_age: 5 * 365 * 24 * 3600 * 1e9,  // 5 years
    max_bytes: 500 * 1024 * 1024 * 1024,  // 500 GB
    max_msgs: -1,
    discard: 'new' as any,  // reject если full (nothing lost)
    num_replicas: 3,
    duplicate_window: 300 * 1e9,  // 5 min dedup
    // Note: WORM enforcement — at application level (no deletes allowed)
  })

  // Stream 3: medical-audit (10 years, separate для privacy)
  await upsertStream(jsm, {
    name: 'medical-audit',
    subjects: ['app.daria.health.>'],
    storage: 'file' as any,
    retention: 'limits' as any,
    max_age: 10 * 365 * 24 * 3600 * 1e9,
    num_replicas: 3,
    discard: 'new' as any,
  })

  // Stream 4: DLQ
  await upsertStream(jsm, {
    name: 'domain-dlq',
    subjects: ['dlq.app.daria.>'],
    storage: 'file' as any,
    retention: 'limits' as any,
    max_age: 7 * 24 * 3600 * 1e9,  // 7 days
    num_replicas: 3,
  })

  console.log('All streams ensured')
  await nc.drain()
}

async function upsertStream(jsm: JetStreamManager, config: Partial<StreamConfig>) {
  try {
    await jsm.streams.info(config.name!)
    await jsm.streams.update(config.name!, config as any)
    console.log(`↺ ${config.name} (updated)`)
  } catch {
    await jsm.streams.add(config as any)
    console.log(`✓ ${config.name} (created)`)
  }
}

ensureStreams().catch(console.error)
```

Run на startup each service:

```bash
pnpm -F @daria/events ensure-streams
```

Или automate через Argo CD post-deploy hook.

## Шаг 3: Consumer provisioning

Каждый consumer — durable (survives restarts).

`services/authorship-registry/src/consumers/setup.ts`:

```typescript
import { connect, ConsumerConfig } from 'nats'

async function setupConsumers() {
  const nc = await connect({ servers: process.env.NATS_URL })
  const jsm = await nc.jetstreamManager()

  // Consumer 1: payments.payment-confirmed → trigger distribute
  await jsm.consumers.add('durable-domain', {
    durable_name: 'authorship-payments-consumer',
    filter_subject: 'app.daria.payments.payment-confirmed.v1',
    ack_policy: 'explicit' as any,
    deliver_policy: 'new' as any,
    max_ack_pending: 1000,
    max_deliver: 5,
    ack_wait: 30 * 1e9,  // 30s
    backoff: [1e9, 5e9, 15e9, 60e9, 300e9],  // 1s, 5s, 15s, 1m, 5m
  })

  // Consumer 2: subscription.activated → trigger distribute
  await jsm.consumers.add('durable-domain', {
    durable_name: 'authorship-subscription-consumer',
    filter_subject: 'app.daria.subscription.activated.v1',
    ack_policy: 'explicit' as any,
    max_ack_pending: 1000,
    max_deliver: 5,
  })

  // Consumer 3: disputes.ruling → trigger reversal
  await jsm.consumers.add('durable-domain', {
    durable_name: 'authorship-disputes-consumer',
    filter_subject: 'app.daria.disputes.ruling.v1',
    ack_policy: 'explicit' as any,
    max_ack_pending: 100,
    max_deliver: 10,
  })
}
```

## Шаг 4: Consumer runtime с idempotency + DLQ

```typescript
import { EventConsumer } from '@daria/events'
import { distributeRoyalty } from '../distribute'

const consumer = new EventConsumer({
  natsUrl: process.env.NATS_URL!,
  streamName: 'durable-domain',
  consumerName: 'authorship-payments-consumer',
  serviceName: 'authorship-registry',
})

await consumer.connect()

await consumer.subscribe(async (event, meta) => {
  // Idempotency — track processed events
  const idempKey = event.id
  const alreadyProcessed = await db.insert(processedEvents).values({
    eventId: idempKey,
    consumer: 'authorship-payments-consumer',
    processedAt: new Date(),
  }).onConflictDoNothing().returning()

  if (alreadyProcessed.length === 0) {
    console.log(`Skip ${idempKey} (already processed)`)
    return  // ACK
  }

  const data = event.data as any
  try {
    await distributeRoyalty({
      purchaseId: data.chargeId,
      templateId: data.referenceId,
      buyerId: data.userId,
      amountCents: BigInt(data.amountCents),
      currency: data.currency,
      traceId: event.traceparent,
    })
    // Auto-ack (consumer handler returns without throw)
  } catch (err) {
    console.error(`Failed to process ${idempKey}:`, err)
    
    if (meta.deliverCount >= 5) {
      // DLQ
      await publishToDlq(event, err)
      // Still ack to prevent infinite retry
    } else {
      throw err  // NAK, будет redelivered с exponential backoff
    }
  }
})

async function publishToDlq(event: any, error: any) {
  await nc.publish('dlq.' + event.type, JSON.stringify({
    originalEvent: event,
    error: {
      message: (error as Error).message,
      stack: (error as Error).stack,
    },
    dlqPublishedAt: new Date().toISOString(),
    failedConsumer: 'authorship-payments-consumer',
  }))
}
```

## Шаг 5: DLQ monitoring

```typescript
// services/operations/src/dlq-monitor.ts — periodic job
async function monitorDlq() {
  const nc = await connect({ servers: process.env.NATS_URL })
  const jsm = await nc.jetstreamManager()
  
  const dlqInfo = await jsm.streams.info('domain-dlq')
  const count = dlqInfo.state.messages
  
  if (count > 100) {
    await publishEvent('app.daria.ops.dlq-accumulation.v1', {
      streamName: 'domain-dlq',
      pendingCount: count,
      timestamp: new Date().toISOString(),
    })
    // Triggers SEV-2 alert через runbook dlq-accumulation.md
  }
}
```

## Шаг 6: Metrics export

NATS exposes Prometheus metrics на port 8222. Scraped by OTel collector:

`platform/docker-compose/otel-collector-config.yaml` (дополнение):

```yaml
receivers:
  prometheus:
    config:
      scrape_configs:
        - job_name: nats
          scrape_interval: 15s
          static_configs:
            - targets: [nats-1:8222, nats-2:8222, nats-3:8222]
          metrics_path: /varz
```

Key metrics в SigNoz:
- `nats_jetstream_stream_messages{stream}`
- `nats_jetstream_stream_bytes{stream}`
- `nats_jetstream_consumer_pending{stream, consumer}`  ← triggers DLQ alert
- `nats_jetstream_consumer_delivered{stream, consumer}`
- `nats_jetstream_consumer_ack_floor{stream, consumer}`

## Шаг 7: Backup policy

`financial-audit` stream — critical WORM. Backup процедура:

```bash
# Daily snapshot
nats stream backup financial-audit /backups/nats/$(date +%Y-%m-%d)-financial-audit.tar.gz

# Cross-region copy
aws s3 cp /backups/nats/*.tar.gz s3://daria-audit-cold-tier/nats/ --storage-class GLACIER

# Retention policy
find /backups/nats/ -mtime +30 -delete
```

Automate через Temporal cron.

## Шаг 8: Disaster recovery

If всё упало:

```bash
# 1. Stop all consumers
kubectl scale deployment authorship-registry --replicas=0
# ... all consumer services

# 2. Restore from backup
nats stream restore --backup /backups/nats/latest-financial-audit.tar.gz

# 3. Verify stream
nats stream info financial-audit

# 4. Restart consumers (в reverse order — non-critical first)
kubectl scale deployment authorship-registry --replicas=2
# ...

# 5. Monitor DLQ — should drain
watch nats consumer info durable-domain authorship-payments-consumer
```

См. `docs/runbooks/dlq-accumulation.md` + `docs/architecture-v6/35-disaster-recovery.md` DR-7.

## Checklist

- [ ] 3-node NATS cluster active (or docker-compose multi-node)
- [ ] 4 streams created (durable-domain, financial-audit, medical-audit, domain-dlq)
- [ ] Replication = 3 для all (kроме dev single-node)
- [ ] Durable consumers configured per-service
- [ ] Idempotency через `processed_events` table
- [ ] DLQ monitoring работает
- [ ] Prometheus metrics exported
- [ ] Backup script scheduled
- [ ] DR procedure documented

## Next

Week 2 Friday: integration test — register → login → charge → wallet → event chain → `08-integration-test.md`.
