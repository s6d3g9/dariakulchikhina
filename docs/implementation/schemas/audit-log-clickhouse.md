# Audit-log ClickHouse schema

`services/audit-log` consumes события из JetStream и пишет в ClickHouse. **Append-only, WORM** (инвариант I17).

## Database structure

```sql
CREATE DATABASE IF NOT EXISTS audit_events;
```

## Main event table

```sql
CREATE TABLE audit_events.events (
    -- Core CloudEvent fields
    timestamp    DateTime64(3, 'UTC')   CODEC(DoubleDelta, LZ4),
    event_id     String                 CODEC(ZSTD(1)),
    event_type   LowCardinality(String) CODEC(ZSTD(1)),
    source       LowCardinality(String) CODEC(ZSTD(1)),
    subject      String                 CODEC(ZSTD(1)),
    
    -- Indexing fields
    user_id      String CODEC(ZSTD(1)),
    entity_kind  LowCardinality(String) CODEC(ZSTD(1)),
    entity_id    String CODEC(ZSTD(1)),
    region       LowCardinality(String) CODEC(ZSTD(1)),
    
    -- Tracing
    trace_id     String CODEC(ZSTD(1)),
    span_id      String CODEC(ZSTD(1)),
    parent_span_id String CODEC(ZSTD(1)),
    
    -- Event data
    data         String CODEC(ZSTD(3)),  -- JSON string (denormalized full event)
    
    -- Metadata
    ingested_at  DateTime64(3, 'UTC') DEFAULT now64(3) CODEC(DoubleDelta, LZ4),
    stream_name  LowCardinality(String) CODEC(ZSTD(1)),
    stream_sequence UInt64 CODEC(DoubleDelta, LZ4),
    
    -- Hash-chain integrity (each event includes hash of previous event)
    prev_hash    FixedString(64) CODEC(ZSTD(1)),  -- sha256(prev_event_id + prev_data)
    this_hash    FixedString(64) CODEC(ZSTD(1)),
    
    -- Materialized columns для fast filter
    INDEX idx_user_id user_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_event_type event_type TYPE bloom_filter GRANULARITY 1,
    INDEX idx_entity entity_kind, entity_id TYPE bloom_filter GRANULARITY 1,
    INDEX idx_trace trace_id TYPE bloom_filter GRANULARITY 1
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (event_type, timestamp, event_id)
TTL timestamp + INTERVAL 5 YEAR
SETTINGS 
    index_granularity = 8192,
    storage_policy = 'hot_cold';  -- hot 90d, then cold S3
```

## Per-domain projections (materialized views для fast queries)

### `wallet_events`

```sql
CREATE MATERIALIZED VIEW audit_events.wallet_events
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (user_id, timestamp)
TTL timestamp + INTERVAL 5 YEAR
AS SELECT
    timestamp,
    event_id,
    event_type,
    user_id,
    JSONExtractString(data, 'transferId') AS transfer_id,
    JSONExtractString(data, 'fromAccountId') AS from_account_id,
    JSONExtractString(data, 'toAccountId') AS to_account_id,
    toInt64OrZero(JSONExtractString(data, 'amountCents')) AS amount_cents,
    JSONExtractString(data, 'currency') AS currency,
    JSONExtractString(data, 'kind') AS kind,
    trace_id,
    data
FROM audit_events.events
WHERE event_type LIKE 'app.daria.wallet.%'
   OR event_type LIKE 'app.daria.payments.%';
```

### `royalty_events`

```sql
CREATE MATERIALIZED VIEW audit_events.royalty_events
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (template_id, timestamp)
TTL timestamp + INTERVAL 5 YEAR
AS SELECT
    timestamp,
    event_id,
    JSONExtractString(data, 'templateId') AS template_id,
    JSONExtractString(data, 'purchaseId') AS purchase_id,
    JSONExtractString(data, 'buyerId') AS buyer_id,
    toInt64OrZero(JSONExtractString(data, 'amountDistributedCents')) AS amount_cents,
    JSONExtractString(data, 'currencyDistributed') AS currency,
    JSONExtractString(data, 'forksLineageRule') AS lineage_rule,
    data,
    trace_id
FROM audit_events.events
WHERE event_type = 'app.daria.authorship.royalty-distributed.v1'
   OR event_type = 'app.daria.authorship.reversal-completed.v1';
```

### `policy_decisions`

```sql
CREATE MATERIALIZED VIEW audit_events.policy_decisions
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (decision, timestamp)
TTL timestamp + INTERVAL 2 YEAR
AS SELECT
    timestamp,
    event_id,
    JSONExtractString(data, 'userId') AS user_id,
    JSONExtractString(data, 'region') AS region,
    JSONExtractString(JSONExtractRaw(data, 'action'), 'type') AS action_type,
    JSONExtractString(JSONExtractRaw(data, 'action'), 'resource') AS action_resource,
    JSONExtractString(data, 'decision') AS decision,
    JSONExtractString(data, 'reason') AS reason,
    JSONExtractString(data, 'policyId') AS policy_id,
    toFloat32OrZero(JSONExtractString(data, 'latencyMs')) AS latency_ms,
    trace_id
FROM audit_events.events
WHERE event_type = 'app.daria.governance.policy-evaluated.v1';
```

### `identity_events`

```sql
CREATE MATERIALIZED VIEW audit_events.identity_events
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (user_id, timestamp)
TTL timestamp + INTERVAL 5 YEAR
AS SELECT
    timestamp,
    event_id,
    event_type,
    user_id,
    JSONExtractString(data, 'method') AS auth_method,
    JSONExtractString(data, 'ipAddressHash') AS ip_hash,
    JSONExtractString(data, 'countryFromIp') AS country,
    JSONExtractString(data, 'deviceFingerprint') AS device_fingerprint,
    data
FROM audit_events.events
WHERE event_type LIKE 'app.daria.identity.%';
```

## Pseudonymization (после 90d)

GDPR требует identifiable data purge. После 90 дней:

```sql
-- ALTER для partition > 90 days: anonymize user_id + delete IP
-- Run via monthly job

ALTER TABLE audit_events.events
  UPDATE user_id = cityHash64(user_id || 'daria-pseudonym-salt')::String
  WHERE timestamp < now() - INTERVAL 90 DAY
    AND user_id NOT LIKE 'pseudo:%';

-- Append 'pseudo:' prefix для marking
ALTER TABLE audit_events.events
  UPDATE user_id = concat('pseudo:', user_id)
  WHERE timestamp < now() - INTERVAL 90 DAY
    AND user_id NOT LIKE 'pseudo:%';
```

## Storage policies (hot/cold tiering)

```xml
<!-- platform/docker-compose/clickhouse-config/storage.xml -->
<clickhouse>
  <storage_configuration>
    <disks>
      <default>
        <path>/var/lib/clickhouse/</path>
      </default>
      <s3_cold>
        <type>s3</type>
        <endpoint>https://s3-cold-tier.daria.internal/audit/</endpoint>
        <access_key_id>from-secrets</access_key_id>
        <secret_access_key>from-secrets</secret_access_key>
      </s3_cold>
    </disks>
    
    <policies>
      <hot_cold>
        <volumes>
          <hot>
            <disk>default</disk>
          </hot>
          <cold>
            <disk>s3_cold</disk>
          </cold>
        </volumes>
        <move_factor>0.2</move_factor>
      </hot_cold>
    </policies>
  </storage_configuration>
  
  <!-- Move to cold after 90 days -->
  <merge_tree>
    <parts_to_delay_insert>300</parts_to_delay_insert>
  </merge_tree>
</clickhouse>
```

Move rules в schema:

```sql
ALTER TABLE audit_events.events
  MODIFY TTL 
    timestamp + INTERVAL 90 DAY TO DISK 's3_cold',
    timestamp + INTERVAL 5 YEAR DELETE;
```

## Query patterns

### User activity trail (GDPR export)

```sql
SELECT 
    timestamp,
    event_type,
    source,
    data
FROM audit_events.events
WHERE user_id = {userId:String}
  AND timestamp >= {from:DateTime}
  AND timestamp <= {to:DateTime}
ORDER BY timestamp DESC
LIMIT 10000
FORMAT JSONEachRow
```

### Regulator audit request

```sql
-- All financial events for user over 5 years
SELECT *
FROM audit_events.wallet_events
WHERE user_id = {userId:String}
ORDER BY timestamp DESC
INTO OUTFILE '/tmp/regulator-export.json.gz'
FORMAT JSONEachRow
COMPRESSION 'gzip'
```

### Hot-path: recent user activity (last 24h)

```sql
SELECT event_type, count() AS count
FROM audit_events.events
WHERE user_id = {userId:String}
  AND timestamp >= now() - INTERVAL 1 DAY
GROUP BY event_type
ORDER BY count DESC
```

### Policy decisions heatmap (region × action)

```sql
SELECT 
    region,
    action_type,
    decision,
    count() AS total,
    avg(latency_ms) AS avg_latency_ms
FROM audit_events.policy_decisions
WHERE timestamp >= now() - INTERVAL 7 DAY
GROUP BY region, action_type, decision
ORDER BY total DESC
```

### Royalty earnings per-author per-month

```sql
SELECT 
    JSONExtractString(r.1, 'recipient') AS recipient,
    toYYYYMM(timestamp) AS month,
    sum(toInt64OrZero(JSONExtractString(r.1, 'amountCents'))) AS total_cents,
    JSONExtractString(r.1, 'role') AS role
FROM audit_events.royalty_events
ARRAY JOIN JSONExtractArrayRaw(data, 'distribution') AS r
WHERE JSONExtractString(r.1, 'role') IN ('author', 'ancestor')
  AND timestamp >= now() - INTERVAL 1 YEAR
GROUP BY recipient, month, role
ORDER BY recipient, month DESC
```

### Trust-safety anomaly detection

```sql
-- Sudden spike в login failures
SELECT 
    toStartOfMinute(timestamp) AS minute,
    ip_hash,
    count() AS attempts
FROM audit_events.identity_events
WHERE event_type = 'app.daria.identity.user-logged-in.v1'
  AND JSONExtractBool(data, 'success') = 0
  AND timestamp >= now() - INTERVAL 1 HOUR
GROUP BY minute, ip_hash
HAVING attempts > 20
ORDER BY minute DESC
```

## Consumer service (TypeScript)

`services/audit-log/src/consumer.ts`:

```typescript
import { EventConsumer } from '@daria/events'
import { createClient, ClickHouseClient } from '@clickhouse/client'
import crypto from 'node:crypto'

export class AuditLogConsumer {
  private ch: ClickHouseClient
  private lastHash = ''
  private batchBuffer: any[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private readonly BATCH_SIZE = 1000
  private readonly FLUSH_INTERVAL_MS = 1000

  constructor(private config: {
    clickhouseUrl: string
    natsUrl: string
  }) {
    this.ch = createClient({
      url: config.clickhouseUrl,
      database: 'audit_events',
    })
  }

  async start() {
    // Get last hash for chain continuity
    const rows = await this.ch.query({
      query: 'SELECT this_hash FROM audit_events.events ORDER BY timestamp DESC LIMIT 1',
    }).then(r => r.json())
    if (rows.data?.[0]) this.lastHash = rows.data[0].this_hash

    // Start consumers для each stream
    const domainConsumer = new EventConsumer({
      natsUrl: this.config.natsUrl,
      streamName: 'durable-domain',
      consumerName: 'audit-log-domain-consumer',
      serviceName: 'audit-log',
    })
    await domainConsumer.connect()
    await domainConsumer.subscribe(async (event, meta) => {
      await this.bufferEvent(event, meta, 'durable-domain')
    })

    const financialConsumer = new EventConsumer({
      natsUrl: this.config.natsUrl,
      streamName: 'financial-audit',
      consumerName: 'audit-log-financial-consumer',
      serviceName: 'audit-log',
    })
    await financialConsumer.connect()
    await financialConsumer.subscribe(async (event, meta) => {
      await this.bufferEvent(event, meta, 'financial-audit')
    })

    // Periodic flush
    this.flushInterval = setInterval(() => {
      if (this.batchBuffer.length > 0) this.flush()
    }, this.FLUSH_INTERVAL_MS)
  }

  private async bufferEvent(event: any, meta: any, streamName: string) {
    // Extract fields
    const thisHash = this.computeHash(event.id, event.data)
    
    this.batchBuffer.push({
      timestamp: event.time,
      event_id: event.id,
      event_type: event.type,
      source: event.source,
      subject: event.subject ?? '',
      user_id: event.data?.userId ?? event.data?.ownerId ?? '',
      entity_kind: event.data?.entityKind ?? '',
      entity_id: event.data?.entityId ?? event.data?.id ?? '',
      region: event.data?.region ?? '',
      trace_id: event.traceparent?.split('-')[1] ?? '',
      span_id: event.traceparent?.split('-')[2] ?? '',
      parent_span_id: '',
      data: JSON.stringify(event.data),
      stream_name: streamName,
      stream_sequence: meta.ackOrder,
      prev_hash: this.lastHash,
      this_hash: thisHash,
    })

    this.lastHash = thisHash

    if (this.batchBuffer.length >= this.BATCH_SIZE) {
      await this.flush()
    }
  }

  private async flush() {
    if (this.batchBuffer.length === 0) return

    const batch = this.batchBuffer
    this.batchBuffer = []

    try {
      await this.ch.insert({
        table: 'audit_events.events',
        values: batch,
        format: 'JSONEachRow',
      })
    } catch (err) {
      // Critical — audit write failure triggers SEV-1
      console.error('AUDIT LOG WRITE FAILURE', err)
      
      // Re-buffer (preserve ordering)
      this.batchBuffer.unshift(...batch)
      
      // Publish alert event
      // (не through JetStream т.к. может быть корнем проблемы — direct log)
      throw err
    }
  }

  private computeHash(eventId: string, data: any): string {
    return crypto.createHash('sha256')
      .update(this.lastHash)
      .update(eventId)
      .update(JSON.stringify(data))
      .digest('hex')
  }

  async shutdown() {
    if (this.flushInterval) clearInterval(this.flushInterval)
    await this.flush()
    await this.ch.close()
  }
}
```

## Integrity check (periodic)

```sql
-- Detect chain breaks (should return 0 rows в healthy state)
WITH hashes AS (
  SELECT 
    event_id,
    timestamp,
    this_hash,
    prev_hash,
    lagInFrame(this_hash) OVER (ORDER BY timestamp, event_id) AS expected_prev
  FROM audit_events.events
)
SELECT count() AS broken_links
FROM hashes
WHERE prev_hash != expected_prev
  AND expected_prev != '';
```

Run раз в день. Alert SEV-1 если broken_links > 0 (potential tampering).

## Object-lock (WORM enforcement)

- Cold tier S3 bucket configured с **S3 Object Lock** (compliance mode):

```bash
aws s3api put-object-lock-configuration \
  --bucket audit-cold-tier \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "COMPLIANCE",
        "Years": 5
      }
    }
  }'
```

No one (including bucket owner, root account) может delete или overwrite пока не expires retention period.

## Disaster recovery

Described в `runbooks/audit-log-write-failure.md` + `architecture-v6/35-disaster-recovery.md` (retention policies).

Backup:
- Daily snapshot к cross-region S3.
- Tested restore (ежемесячно — pick random partition, restore, verify).
- RPO: 1 hour. RTO: 4 hours для hot tier, 24h для cold tier recovery.
