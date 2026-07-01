# Phase 0 / Week 2 / Tuesday: Events package

Цель: `@daria/events` с CloudEvents base schema + codegen TypeScript types + JetStream publisher/consumer helpers.

## Шаг 1: Structure

```
packages/events/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  — exports
│   ├── base.ts                   — CloudEvent envelope
│   ├── publisher.ts              — NATS JetStream publisher
│   ├── consumer.ts               — consumer helper
│   └── streams.ts                — stream definitions
├── cloudevents-base.schema.json  (уже есть)
├── domains/                       — per-domain schemas (уже есть примеры)
│   ├── booking/
│   ├── wallet/
│   ├── authorship/
│   ├── identity/
│   ├── subscription/
│   ├── messenger/
│   └── governance/
├── generated/                     — auto-generated TS types (gitignored)
│   └── types.ts
└── scripts/
    ├── build-types.ts            — generate types from .schema.json
    └── validate-schemas.ts       — validate JSON schemas valid
```

## Шаг 2: package.json

```json
{
  "name": "@daria/events",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "build:types": "tsx scripts/build-types.ts",
    "validate:schemas": "tsx scripts/validate-schemas.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "nats": "^2.28.0",
    "ajv": "^8.16.0",
    "ajv-formats": "^3.0.1",
    "uuid": "^10.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "json-schema-to-typescript": "^15.0.0"
  }
}
```

## Шаг 3: CloudEvent base (TS)

`packages/events/src/base.ts`:

```ts
import { z } from 'zod'
import { v7 as uuidv7 } from 'uuid'

export const ZCloudEvent = z.object({
  specversion: z.literal('1.0'),
  type: z.string().regex(
    /^app\.daria\.[a-z0-9-]+\.[a-z0-9-]+\.v[0-9]+$/,
    'type must match app.daria.<domain>.<event-name>.v<N>',
  ),
  source: z.string().regex(/^\/services\/[a-z0-9-]+$/),
  id: z.string().uuid(),
  time: z.string().datetime(),
  datacontenttype: z.literal('application/json'),
  subject: z.string().optional(),
  traceparent: z.string().regex(
    /^[0-9]{2}-[0-9a-f]{32}-[0-9a-f]{16}-[0-9]{2}$/,
    'W3C traceparent format required',
  ).optional(),
  data: z.record(z.unknown()),
})
export type CloudEvent<T = unknown> = z.infer<typeof ZCloudEvent> & { data: T }

export function createCloudEvent<T>(params: {
  type: string
  source: string
  data: T
  subject?: string
  traceparent?: string
}): CloudEvent<T> {
  return {
    specversion: '1.0',
    type: params.type,
    source: params.source,
    id: uuidv7(),
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    subject: params.subject,
    traceparent: params.traceparent,
    data: params.data,
  } as CloudEvent<T>
}
```

## Шаг 4: JetStream Publisher

`packages/events/src/publisher.ts`:

```ts
import { connect, JetStreamClient, NatsConnection, StringCodec, headers as natsHeaders } from 'nats'
import { createCloudEvent, CloudEvent, ZCloudEvent } from './base'
import { trace, propagation } from '@opentelemetry/api'

export class EventPublisher {
  private nc!: NatsConnection
  private js!: JetStreamClient
  private sc = StringCodec()

  constructor(
    private config: {
      natsUrl: string
      source: string  // e.g. '/services/wallet'
      serviceName: string
    },
  ) {}

  async connect(): Promise<void> {
    this.nc = await connect({
      servers: this.config.natsUrl,
      name: this.config.serviceName,
      reconnect: true,
      maxReconnectAttempts: -1,
    })
    this.js = this.nc.jetstream()
  }

  async publish<T>(params: {
    type: string
    data: T
    subject?: string
  }): Promise<void> {
    // Capture current trace context
    const carrier: Record<string, string> = {}
    propagation.inject(
      trace.setSpan(
        // @ts-expect-error — type import
        undefined,
        trace.getActiveSpan()!,
      ),
      carrier,
    )

    const event = createCloudEvent({
      type: params.type,
      source: this.config.source,
      data: params.data,
      subject: params.subject,
      traceparent: carrier.traceparent,
    })

    // Validate before publish
    const validation = ZCloudEvent.safeParse(event)
    if (!validation.success) {
      throw new Error(`Invalid CloudEvent: ${validation.error.message}`)
    }

    const headers = natsHeaders()
    headers.set('Ce-Type', event.type)
    headers.set('Ce-Id', event.id)
    if (event.traceparent) headers.set('Ce-Traceparent', event.traceparent)

    const payload = this.sc.encode(JSON.stringify(event))
    await this.js.publish(event.type, payload, { headers })
  }

  async close(): Promise<void> {
    await this.nc?.drain()
    await this.nc?.close()
  }
}
```

## Шаг 5: JetStream Consumer

`packages/events/src/consumer.ts`:

```ts
import { connect, JetStreamClient, ConsumerOpts, AckPolicy } from 'nats'
import { ZCloudEvent, CloudEvent } from './base'
import { trace, propagation, context as otelContext } from '@opentelemetry/api'

export interface ConsumerConfig {
  natsUrl: string
  streamName: string
  consumerName: string   // durable name
  serviceName: string
  filterSubject?: string  // e.g. 'app.daria.wallet.>' 
}

export type EventHandler<T = unknown> = (
  event: CloudEvent<T>,
  meta: { deliverCount: number; ackOrder: number },
) => Promise<void>

export class EventConsumer {
  private nc!: any  // NatsConnection
  private js!: JetStreamClient

  constructor(private config: ConsumerConfig) {}

  async connect(): Promise<void> {
    this.nc = await connect({
      servers: this.config.natsUrl,
      name: this.config.serviceName,
    })
    this.js = this.nc.jetstream()
  }

  /**
   * Subscribe и start processing. Returns controller to stop.
   */
  async subscribe<T>(
    handler: EventHandler<T>,
  ): Promise<{ stop: () => Promise<void> }> {
    const manager = await this.js.consumers.get(this.config.streamName, this.config.consumerName)
    const messages = await manager.consume()

    const abortController = new AbortController()

    ;(async () => {
      for await (const msg of messages) {
        if (abortController.signal.aborted) break

        try {
          const payload = JSON.parse(msg.string())
          const parse = ZCloudEvent.safeParse(payload)
          if (!parse.success) {
            console.error('Invalid event, skipping:', parse.error)
            msg.ack()
            continue
          }
          const event = parse.data as CloudEvent<T>

          // Extract trace context
          const parentContext = event.traceparent
            ? propagation.extract(
                otelContext.active(),
                { traceparent: event.traceparent },
              )
            : otelContext.active()

          const tracer = trace.getTracer(this.config.serviceName)
          const span = tracer.startSpan(
            `event.${event.type}`,
            {},
            parentContext,
          )

          try {
            await otelContext.with(trace.setSpan(parentContext, span), async () => {
              await handler(event, {
                deliverCount: msg.info.deliveryCount,
                ackOrder: msg.info.streamSequence,
              })
            })
            msg.ack()
          } catch (err) {
            span.recordException(err as Error)
            // Redelivery: NATS handles via pending state
            // After N retries → DLQ (configured в stream)
            if (msg.info.deliveryCount >= 5) {
              msg.term()  // dead-letter
            } else {
              msg.nak(Math.min(1000 * Math.pow(2, msg.info.deliveryCount), 60000))  // exponential backoff
            }
            throw err
          } finally {
            span.end()
          }
        } catch (err) {
          console.error('Event handler failed:', err)
        }
      }
    })()

    return {
      stop: async () => {
        abortController.abort()
        await this.nc?.drain()
      },
    }
  }

  async close(): Promise<void> {
    await this.nc?.close()
  }
}
```

## Шаг 6: Stream definitions

`packages/events/src/streams.ts`:

```ts
import { JetStreamManager } from 'nats'

export const STREAM_CONFIGS = {
  'durable-domain': {
    subjects: ['app.daria.>'],
    storage: 'file' as const,
    retention: 'limits' as const,
    max_age: 30 * 24 * 3600 * 1e9,   // 30 days в nanoseconds
    replicas: 1,  // 3 в prod
    discard: 'old' as const,
    description: 'All domain events. 30-day retention.',
  },
  'financial-audit': {
    subjects: [
      'app.daria.wallet.>',
      'app.daria.payments.>',
      'app.daria.authorship.royalty.>',
      'app.daria.subscription.>',
    ],
    storage: 'file' as const,
    retention: 'limits' as const,
    max_age: 5 * 365 * 24 * 3600 * 1e9,  // 5 years (WORM)
    replicas: 3,  // 3 в prod
    discard: 'new' as const,  // don't lose events when full
    description: 'Financial + audit events. 5-year WORM retention.',
  },
} as const

export async function ensureStreams(jsm: JetStreamManager) {
  for (const [name, config] of Object.entries(STREAM_CONFIGS)) {
    try {
      await jsm.streams.info(name)
      // exists, update if needed
      await jsm.streams.update(name, config as any)
    } catch {
      await jsm.streams.add({ name, ...(config as any) })
    }
  }
}
```

## Шаг 7: TypeScript codegen from JSON schemas

`packages/events/scripts/build-types.ts`:

```ts
import { compileFromFile } from 'json-schema-to-typescript'
import { glob } from 'glob'
import * as fs from 'fs/promises'
import * as path from 'path'

async function build() {
  const schemaFiles = await glob('domains/**/*.schema.json', { cwd: path.join(__dirname, '..') })
  
  const outputs: string[] = [
    '// AUTO-GENERATED — do not edit manually',
    '// Regenerate: pnpm -F @daria/events build:types',
    '',
  ]

  for (const file of schemaFiles) {
    const schemaPath = path.join(__dirname, '..', file)
    // Parse domain and event from path: domains/<domain>/<event>.v<N>.schema.json
    const match = file.match(/domains\/([^/]+)\/([^.]+)\.v([0-9]+)\.schema\.json/)
    if (!match) continue

    const [, domain, eventName, version] = match
    const typeName = `${pascalCase(domain)}${pascalCase(eventName)}V${version}`

    const ts = await compileFromFile(schemaPath, {
      bannerComment: '',
      style: { semi: false, singleQuote: true },
    })
    
    outputs.push(`// ${file}`)
    outputs.push(ts.replace(/export interface (\w+)/, `export interface ${typeName}`))
    outputs.push('')
  }

  const output = outputs.join('\n')
  const outputPath = path.join(__dirname, '../generated/types.ts')
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, output)
  
  console.log(`Generated: ${outputPath}`)
}

function pascalCase(s: string): string {
  return s.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase())
}

build().catch(err => {
  console.error(err)
  process.exit(1)
})
```

## Шаг 8: Validation script

`packages/events/scripts/validate-schemas.ts`:

```ts
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { glob } from 'glob'
import * as fs from 'fs/promises'
import * as path from 'path'

async function validate() {
  const ajv = new Ajv({ strict: true, allErrors: true })
  addFormats(ajv)

  const basePath = path.join(__dirname, '../cloudevents-base.schema.json')
  const baseSchema = JSON.parse(await fs.readFile(basePath, 'utf-8'))
  ajv.addSchema(baseSchema, baseSchema.$id)

  const schemaFiles = await glob('domains/**/*.schema.json', {
    cwd: path.join(__dirname, '..'),
  })

  let failed = 0
  for (const file of schemaFiles) {
    const schemaPath = path.join(__dirname, '..', file)
    const schema = JSON.parse(await fs.readFile(schemaPath, 'utf-8'))
    
    try {
      ajv.validateSchema(schema)
      console.log(`✓ ${file}`)
    } catch (err) {
      console.error(`✗ ${file}:`, err)
      failed++
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} schemas failed validation`)
    process.exit(1)
  }
  console.log(`\nAll ${schemaFiles.length} schemas valid`)
}

validate()
```

## Шаг 9: index.ts

```ts
// Main exports
export { ZCloudEvent, createCloudEvent, type CloudEvent } from './base'
export { EventPublisher } from './publisher'
export { EventConsumer, type ConsumerConfig, type EventHandler } from './consumer'
export { STREAM_CONFIGS, ensureStreams } from './streams'

// Re-export generated types if they exist
// export * from '../generated/types'
```

## Шаг 10: Test

```ts
// packages/events/tests/publisher.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EventPublisher } from '../src/publisher'

describe('EventPublisher (integration)', () => {
  let publisher: EventPublisher

  beforeAll(async () => {
    publisher = new EventPublisher({
      natsUrl: 'nats://localhost:4222',
      source: '/services/test',
      serviceName: 'test-service',
    })
    await publisher.connect()
  })

  afterAll(async () => {
    await publisher.close()
  })

  it('publishes valid event', async () => {
    await expect(
      publisher.publish({
        type: 'app.daria.test.hello.v1',
        data: { message: 'hello' },
      })
    ).resolves.not.toThrow()
  })

  it('rejects invalid event type', async () => {
    await expect(
      publisher.publish({
        type: 'test.hello',  // malformed
        data: {},
      })
    ).rejects.toThrow(/Invalid CloudEvent/)
  })
})
```

## Шаг 11: Commands

```bash
# Validate all schemas
pnpm -F @daria/events validate:schemas

# Generate types
pnpm -F @daria/events build:types

# Typecheck
pnpm -F @daria/events typecheck

# Run tests (requires NATS running)
pnpm dev:infra
pnpm -F @daria/events test
```

## Checklist — Tuesday done

- [ ] `@daria/events` package builds
- [ ] CloudEvent base schema enforced в runtime (Zod)
- [ ] Publisher работает (sends to NATS)
- [ ] Consumer получает events с idempotency
- [ ] JSON schemas validate pass
- [ ] TS types generated from schemas
- [ ] Stream configs defined

## Next

Wednesday: design-tokens package → `08-design-tokens-package.md`.
