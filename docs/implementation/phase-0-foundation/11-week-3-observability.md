# Phase 0 / Week 3: Observability integration

Week 3 — интеграция OpenTelemetry в existing v5.3 apps (main Nuxt + messenger) + SigNoz dashboards + CI refinement.

## Monday: SigNoz configuration deep

Уже в Wednesday W1 подняли docker-compose. Теперь настраиваем retention, dashboards, alerting.

### Retention

`platform/docker-compose/clickhouse-config/config.xml` (for SigNoz backend):

```xml
<?xml version="1.0"?>
<clickhouse>
  <profiles>
    <default>
      <max_memory_usage>10000000000</max_memory_usage>
    </default>
  </profiles>

  <!-- Override TTL для traces/logs/metrics -->
  <ttl>
    <default_ttl>30 DAYS</default_ttl>
  </ttl>
</clickhouse>
```

### Dashboards — import templates

SigNoz dashboards как JSON, 5 templates:

**1. Service Overview Dashboard** (`platform/observability/dashboards/service-overview.json`):

```json
{
  "title": "Service Overview: {{service_name}}",
  "variables": [
    { "name": "service_name", "type": "QUERY", "query": "SELECT DISTINCT serviceName FROM signoz_traces" }
  ],
  "layout": [
    {
      "type": "panel",
      "title": "Request Rate (RPS)",
      "chartType": "graph",
      "query": "rate(signoz_latency_count{serviceName='$service_name'}[1m])",
      "position": { "w": 6, "h": 4, "x": 0, "y": 0 }
    },
    {
      "type": "panel",
      "title": "Error Rate",
      "chartType": "graph",
      "query": "rate(signoz_latency_count{serviceName='$service_name',statusCode!~'2..'}[1m]) / rate(signoz_latency_count{serviceName='$service_name'}[1m])",
      "threshold": { "value": 0.01, "color": "red" },
      "position": { "w": 6, "h": 4, "x": 6, "y": 0 }
    },
    {
      "type": "panel",
      "title": "Latency (p50, p95, p99)",
      "chartType": "graph",
      "queries": [
        "histogram_quantile(0.50, sum(rate(signoz_latency_bucket{serviceName='$service_name'}[1m])) by (le))",
        "histogram_quantile(0.95, sum(rate(signoz_latency_bucket{serviceName='$service_name'}[1m])) by (le))",
        "histogram_quantile(0.99, sum(rate(signoz_latency_bucket{serviceName='$service_name'}[1m])) by (le))"
      ],
      "position": { "w": 12, "h": 4, "x": 0, "y": 4 }
    },
    {
      "type": "panel",
      "title": "CPU / Memory",
      "chartType": "graph",
      "queries": [
        "rate(process_cpu_seconds_total{service='$service_name'}[1m])",
        "process_resident_memory_bytes{service='$service_name'}"
      ],
      "position": { "w": 12, "h": 4, "x": 0, "y": 8 }
    }
  ]
}
```

Import через SigNoz UI → Dashboards → Import. Или через API:
```bash
curl -X POST http://localhost:8080/api/v1/dashboards \
  -H "Authorization: Bearer $SIGNOZ_TOKEN" \
  -d @platform/observability/dashboards/service-overview.json
```

Создать для каждого сервиса dashboard имея один template. В Phase 1+ генерятся автоматически при `deploy-new-service`.

**2-5. Остальные dashboards**:
- Financial Flow (wallet, payments, royalty)
- Timeline Overview (active / stuck / failed)
- Policy Decisions (heatmap region × action)
- User Journey (traces по user_id)

Templates в `platform/observability/dashboards/*.json`.

### Alerts config

`platform/observability/alerts/wallet-transfer-failure-rate.yaml`:

```yaml
name: wallet-transfer-failure-rate
severity: SEV-1
description: >500 успешных transfers / > 1 error per 1000
condition: |
  rate(wallet_transfer_errors[5m]) > 0.001
channels:
  - pagerduty
  - slack:#incidents
runbook: docs/runbooks/wallet-transfer-failure-rate.md
```

Аналогично для:
- `policy-evaluate-latency.yaml`
- `timeline-dead-step.yaml`
- `dlq-accumulation.yaml`
- `audit-log-write-failure.yaml`
- `identity-login-failure-rate.yaml`

Import через SigNoz API на startup.

## Tuesday: OTel integration — main Nuxt

### Install deps

В корне:

```bash
pnpm add @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/sdk-trace-base \
  @opentelemetry/sdk-trace-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-grpc \
  @opentelemetry/semantic-conventions
```

### Tracing setup

Create `server/utils/tracing.ts`:

```ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'

const OTLP_ENDPOINT = process.env.OTLP_ENDPOINT ?? 'http://localhost:4317'
const SERVICE_NAME = process.env.SERVICE_NAME ?? 'daria-nuxt'

export const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION ?? '0.0.1',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'development',
  }),
  traceExporter: new OTLPTraceExporter({
    url: OTLP_ENDPOINT,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },  // too noisy
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis-4': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-undici': { enabled: true },
    }),
  ],
})

sdk.start()

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing shut down'))
    .catch(err => console.error(err))
    .finally(() => process.exit(0))
})
```

Import в Nuxt entry (уходит до всего остального):

`server/plugins/00-tracing.ts`:

```ts
import '../utils/tracing'

export default defineNitroPlugin(() => {
  // tracing initialized via side-effect import
})
```

### Add custom spans

В существующем коде (e.g. `server/modules/projects/projects.service.ts`):

```ts
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('daria-nuxt')

export async function getProjectById(id: string) {
  return tracer.startActiveSpan('projects.getById', async (span) => {
    span.setAttributes({
      'entity.kind': 'project',
      'entity.id': id,
    })
    try {
      const project = await db.query.projects.findFirst({ where: eq(projects.id, id) })
      if (!project) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'NOT_FOUND' })
      }
      return project
    } catch (err) {
      span.recordException(err as Error)
      throw err
    } finally {
      span.end()
    }
  })
}
```

### Verify

```bash
# With tracing enabled
OTLP_ENDPOINT=http://localhost:4317 pnpm dev

# Make some requests
curl http://localhost:3000/api/projects

# Check SigNoz
open http://localhost:3301
# → Traces → service: daria-nuxt
```

## Wednesday: OTel integration — messenger

`messenger/core/src/tracing.ts` (аналогично server/utils/tracing.ts):

```ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'

export const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'daria-messenger-core',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTLP_ENDPOINT ?? 'http://localhost:4317',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
})

sdk.start()
```

Import в top-level messenger entry:

```ts
// messenger/core/src/index.ts
import './tracing'  // FIRST import
import { createServer } from './server'
// ...
```

### WS tracing

Для WebSocket messages добавить custom spans:

```ts
// messenger/core/src/ws-handler.ts
import { trace, context, propagation } from '@opentelemetry/api'

const tracer = trace.getTracer('messenger-core')

ws.on('message', async (raw) => {
  const message = JSON.parse(raw.toString())
  
  // Extract trace context if client передал
  const parentContext = message.traceparent
    ? propagation.extract(context.active(), { traceparent: message.traceparent })
    : context.active()
  
  const span = tracer.startSpan(
    `ws.message.${message.type}`,
    {
      attributes: {
        'user.id': ws.userId,
        'conversation.id': message.conversationId,
        'message.type': message.type,
      },
    },
    parentContext,
  )
  
  try {
    await context.with(trace.setSpan(parentContext, span), () => handleMessage(message))
  } finally {
    span.end()
  }
})
```

## Thursday: CI refinement

Расширить `.github/workflows/ci.yml` до полного из `docs/implementation/ci-workflows/ci-main.yml`. Добавить matrix builds для services.

Proof: copy content из ci-main.yml → `.github/workflows/ci.yml`.

Run test PR, verify все jobs green.

## Friday: Phase 0 exit review

Final checklist session, 2 часа команды:

- [ ] `pnpm dev:infra` поднимает ВСЕ infra services без errors
- [ ] SigNoz UI показывает traces от Nuxt + messenger
- [ ] `pnpm test` passes (всё зелёное)
- [ ] `pnpm turbo:typecheck` проходит
- [ ] `pnpm lint:errors` — 0
- [ ] CI проходит за < 10 мин на PR
- [ ] `pnpm create card-type <name>` создаёт валидный skeleton
- [ ] `pnpm create service` работает для ts/go/python/rust
- [ ] Fractal-harness принимает sample card-type
- [ ] Docs v6 verify passes
- [ ] SigNoz dashboards импортированы
- [ ] Alert-configs созданы (6 stage-1 alerts)
- [ ] Runbooks в docs/runbooks/ для всех alerts
- [ ] Team onboarded — все могут поднять local stack
- [ ] CODEOWNERS установлены
- [ ] Phase 1 team-sizing confirmed (5-8 чел)
- [ ] Phase 1 backlog готов

Если всё ✓ — **Phase 0 is complete**. Начинаем Phase 1.

## Phase 0 retrospective

После завершения — 1-hour retro:
- Что прошло хорошо?
- Что замедлило?
- Action items для Phase 1?
- Обновить playbook по итогам (дороги grab ножницы после).

Output: `docs/playbooks/phase-0-retrospective-YYYY-MM-DD.md`.

## Handoff к Phase 1

Phase 1 стартует с:
- Все monorepo + infra работает.
- Команда onboarded.
- CI / CD pipeline зелёный.
- Observability в рабочем состоянии.

Следующий документ: `docs/implementation/phase-1-platform-core/00-week-overview.md`.
