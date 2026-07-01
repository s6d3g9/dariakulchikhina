# Phase 0 / Week 1 / Wednesday: Docker-compose full stack

Цель: `pnpm dev:infra` поднимает все 10 инфра-сервисов локально.

## Prereq

- Docker Desktop installed + running.
- 16GB RAM available (8GB minimum, 16GB recommended for all services).
- Monday + Tuesday tasks done (monorepo + CI skeleton).

## Шаг 1: Расширить существующий docker-compose.yml

Уже создан (см. `platform/docker-compose/docker-compose.yml` — базовый). Проверить что он работает:

```bash
cd platform/docker-compose
docker compose up -d
docker compose ps
```

Должны быть running:
- postgres, redis, nats, temporal, temporal-ui, minio, meilisearch, zitadel, mailhog

## Шаг 2: Добавить observability profile (SigNoz)

SigNoz — отдельно heavyweight, включается через profile.

Append в `platform/docker-compose/docker-compose.yml`:

```yaml
# === Observability profile (tight resource use, opt-in) ===

  # OTel collector — receives traces/logs/metrics
  otel-collector:
    profiles: ["observability"]
    image: otel/opentelemetry-collector-contrib:0.103.0
    container_name: daria-otel-collector
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml:ro
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
    depends_on:
      - clickhouse

  # SigNoz UI
  signoz-query-service:
    profiles: ["observability"]
    image: signoz/query-service:0.48.0
    container_name: daria-signoz-query
    command: ["-config=/root/config/prometheus.yml"]
    environment:
      ClickHouseUrl: tcp://clickhouse:9000
      ALERTMANAGER_API_PREFIX: http://signoz-alertmanager:9093/api/
    depends_on:
      - clickhouse
    ports:
      - "8080:8080"

  signoz-frontend:
    profiles: ["observability"]
    image: signoz/frontend:0.48.0
    container_name: daria-signoz-frontend
    depends_on:
      - signoz-query-service
    ports:
      - "3301:3301"

  signoz-alertmanager:
    profiles: ["observability"]
    image: signoz/alertmanager:0.23.7
    container_name: daria-signoz-alertmanager
    ports:
      - "9093:9093"
```

## Шаг 3: OTel collector config

Create `platform/docker-compose/otel-collector-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 8192
  resource:
    attributes:
      - key: deployment.environment
        value: dev
        action: insert

exporters:
  clickhouse:
    endpoint: tcp://clickhouse:9000
    database: signoz_traces
    traces_table_name: signoz_index_v2
    timeout: 10s
  # Fallback — debug к stdout
  debug:
    verbosity: basic

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [clickhouse, debug]
    logs:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [clickhouse]
    metrics:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [clickhouse]
```

## Шаг 4: ClickHouse initialization

Create `platform/docker-compose/init-clickhouse.sql`:

```sql
-- SigNoz databases
CREATE DATABASE IF NOT EXISTS signoz_traces;
CREATE DATABASE IF NOT EXISTS signoz_metrics;
CREATE DATABASE IF NOT EXISTS signoz_logs;

-- Audit-log database (Phase 2+ will populate)
CREATE DATABASE IF NOT EXISTS audit_events;

-- Simple initial schemas (SigNoz auto-migrates on startup)
CREATE TABLE IF NOT EXISTS audit_events.events (
    timestamp DateTime64(3) CODEC(DoubleDelta, LZ4),
    event_id String CODEC(ZSTD(1)),
    event_type LowCardinality(String) CODEC(ZSTD(1)),
    user_id String CODEC(ZSTD(1)),
    entity_id String CODEC(ZSTD(1)),
    source LowCardinality(String) CODEC(ZSTD(1)),
    trace_id String CODEC(ZSTD(1)),
    data String CODEC(ZSTD(1))
) ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, event_type, user_id)
TTL timestamp + INTERVAL 5 YEAR
SETTINGS index_granularity = 8192;
```

Update ClickHouse service в docker-compose.yml:

```yaml
  clickhouse:
    profiles: ["observability"]
    image: clickhouse/clickhouse-server:24.8-alpine
    container_name: daria-clickhouse
    ports:
      - "${CLICKHOUSE_HTTP_PORT:-8123}:8123"
      - "${CLICKHOUSE_NATIVE_PORT:-9100}:9000"
    volumes:
      - clickhouse-data:/var/lib/clickhouse
      - ./init-clickhouse.sql:/docker-entrypoint-initdb.d/init-clickhouse.sql:ro
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
    environment:
      CLICKHOUSE_SKIP_USER_SETUP: 1
```

## Шаг 5: NATS JetStream configuration

Create `platform/docker-compose/nats-server.conf`:

```
# NATS JetStream server config — single node для dev

server_name: daria-nats-dev
listen: 0.0.0.0:4222
http: 0.0.0.0:8222

jetstream {
  store_dir: /data
  max_memory_store: 1G
  max_file_store: 10G
}

# Authorization (optional в dev)
# accounts {
#   DARIA: {
#     jetstream: enabled
#     users: [{ user: daria, password: daria-dev }]
#   }
# }

# Logging
log_file: /data/nats.log
logtime: true

# Monitoring
server_name: daria-nats-dev
```

Update NATS service в docker-compose.yml:

```yaml
  nats:
    image: nats:2.10-alpine
    container_name: daria-nats
    command: ["-c", "/etc/nats-server.conf"]
    ports:
      - "${NATS_PORT:-4222}:4222"
      - "${NATS_MONITOR_PORT:-8222}:8222"
    volumes:
      - nats-data:/data
      - ./nats-server.conf:/etc/nats-server.conf:ro
```

## Шаг 6: Pre-create streams + users in NATS

Create `platform/docker-compose/init-nats.sh`:

```bash
#!/bin/bash
# Initialize NATS JetStream streams after boot

set -e

# Wait for NATS to be ready
until nats --server=nats://localhost:4222 server check > /dev/null 2>&1; do
  echo "Waiting for NATS..."
  sleep 2
done

echo "Creating streams..."

# Durable domain stream (30 days)
nats --server=nats://localhost:4222 stream add durable-domain \
  --subjects="app.daria.>" \
  --storage=file \
  --retention=limits \
  --max-age=720h \
  --discard=old \
  --replicas=1 \
  --defaults

# Financial audit stream (5 years — simulated as 30 days в dev)
nats --server=nats://localhost:4222 stream add financial-audit \
  --subjects="app.daria.wallet.>,app.daria.payments.>,app.daria.authorship.royalty.>" \
  --storage=file \
  --retention=limits \
  --max-age=720h \
  --discard=old \
  --replicas=1 \
  --defaults

echo "NATS streams initialized."
```

Run once after first docker-compose up:
```bash
docker exec -it daria-nats sh
cd /data
# Manually run OR add to docker-compose as init-container
```

(Упрощение: в dev можно просто запускать скрипт с хоста, если nats-cli установлен.)

## Шаг 7: .env.example обновить

Append в `platform/docker-compose/.env.example`:

```
# ─── OTel / SigNoz ───────────────────────────────────────────
OTLP_GRPC_PORT=4317
OTLP_HTTP_PORT=4318
SIGNOZ_UI_PORT=3301
SIGNOZ_QUERY_PORT=8080
SIGNOZ_ALERTMANAGER_PORT=9093

# ─── NATS JetStream ──────────────────────────────────────────
NATS_PORT=4222
NATS_MONITOR_PORT=8222
```

## Шаг 8: Validation commands

```bash
# Start full stack (включая observability)
pnpm dev:infra
docker compose --profile observability up -d

# Check all services
docker compose ps

# Expected output (approximate):
# daria-postgres          up
# daria-redis             up
# daria-nats              up
# daria-temporal          up
# daria-temporal-ui       up
# daria-minio             up
# daria-meilisearch       up
# daria-zitadel           up
# daria-mailhog           up
# daria-clickhouse        up (with observability)
# daria-otel-collector    up
# daria-signoz-query      up
# daria-signoz-frontend   up
# daria-signoz-alertmanager  up

# Check endpoints
curl http://localhost:5432 || echo "Postgres responds (tcp)"
curl http://localhost:6379 || echo "Redis responds (tcp)"
curl http://localhost:8222/varz | jq '.server_name'   # NATS monitor
curl http://localhost:8080                              # Temporal UI
curl http://localhost:9001                              # MinIO console
curl http://localhost:7700                              # Meilisearch
curl http://localhost:8081                              # Zitadel
curl http://localhost:8025                              # Mailhog UI
curl http://localhost:3301                              # SigNoz UI (if observability)
```

## Шаг 9: Test trace through

Send dummy trace через curl:

```bash
# Send test span to OTel collector
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [
          {"key": "service.name", "value": {"stringValue": "test"}}
        ]
      },
      "scopeSpans": [{
        "spans": [{
          "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
          "spanId": "00f067aa0ba902b7",
          "name": "test-span",
          "startTimeUnixNano": "'$(date +%s%N)'",
          "endTimeUnixNano": "'$(date +%s%N)'"
        }]
      }]
    }]
  }'
```

Open SigNoz (http://localhost:3301), should see `test` service в traces.

## Шаг 10: docker-compose down + logs

Cleanup:
```bash
pnpm dev:infra:down
# или
docker compose --profile observability down

# With volumes (чистый старт следующий раз)
docker compose down -v
```

Logs:
```bash
pnpm dev:infra:logs
# или
docker compose logs -f <service>
```

## Checklist — Wednesday done

- [ ] `pnpm dev:infra` поднимает все 9 базовых сервисов
- [ ] `docker compose --profile observability up -d` поднимает +5 (OTel + SigNoz)
- [ ] Все endpoints отвечают (проверка curl)
- [ ] SigNoz UI доступен на localhost:3301
- [ ] Test trace виден в SigNoz
- [ ] NATS streams созданы (durable-domain + financial-audit)
- [ ] Postgres имеет 4 БД (identity_db, platform_db, domain_db, audit_db)
- [ ] Zitadel доступен и можно создать admin user
- [ ] `.env.example` обновлён

## Troubleshooting

### Postgres не стартует
Clear volumes: `docker compose down -v && docker compose up -d postgres`.

### SigNoz UI показывает "Could not fetch data"
Wait 30-60 sec после boot, ClickHouse нужно время. Check `docker logs daria-clickhouse`.

### OTel collector not receiving traces
Check `docker logs daria-otel-collector`. Verify ports 4317/4318 free.

### NATS JetStream not available
Add `-js` flag to command (already в config file if using `-c /etc/nats-server.conf`).

### Zitadel initial setup
First start slow (self-provisioning). Wait 2 min. Default login: `zitadel-admin@zitadel.localhost / Password1!`.

## Next

Thursday: Scaffolding plop → `03-packages-bootstrap.md`.
