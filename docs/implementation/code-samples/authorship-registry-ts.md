# Authorship-registry — TypeScript implementation

Полный service на TS (Nitro/H3). Core: publish templates, recursive royalty distribution, lineage tracking.

## Structure

```
services/authorship-registry/
├── Dockerfile
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── src/
│   ├── index.ts                    — Nitro entrypoint
│   ├── config.ts
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   └── migrations/
│   ├── handlers/
│   │   ├── templates.ts            — POST /templates, GET /templates/:id, etc.
│   │   ├── distribute.ts           — POST /purchases/:id/distribute
│   │   ├── lineage.ts              — GET /templates/:id/lineage
│   │   └── disputes.ts
│   ├── services/
│   │   ├── distribute-royalty.ts   — CORE algorithm
│   │   ├── fork-template.ts
│   │   ├── weights.ts              — geometric/linear/equal
│   │   └── lineage.ts
│   ├── consumers/
│   │   ├── payment-confirmed.ts
│   │   ├── subscription-activated.ts
│   │   └── dispute-ruled.ts
│   ├── clients/
│   │   ├── wallet.ts
│   │   ├── pattern-engine.ts
│   │   └── policy-engine.ts
│   ├── events/
│   │   └── publisher.ts
│   └── tracing.ts
└── tests/
```

## package.json

```json
{
  "name": "@daria/service-authorship-registry",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:integration": "vitest run --mode integration",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "h3": "^1.12.0",
    "drizzle-orm": "^0.41.0",
    "pg": "^8.12.0",
    "zod": "^3.23.0",
    "uuid": "^10.0.0",
    "@daria/events": "workspace:*",
    "@daria/contracts-domain": "workspace:*",
    "@daria/sdk-platform": "workspace:*",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-node": "^0.52.0",
    "nats": "^2.28.0",
    "ioredis": "^5.4.1"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "vitest": "^2.0.0",
    "drizzle-kit": "^0.24.0",
    "@types/pg": "^8.11.0",
    "@types/uuid": "^10.0.0"
  }
}
```

## src/index.ts

```typescript
import { createApp, createRouter, toNodeListener, defineEventHandler, createError } from 'h3'
import { createServer } from 'node:http'
import { initTracing } from './tracing'
import { initConfig, type Config } from './config'
import { createDb } from './db/client'
import { WalletClient } from './clients/wallet'
import { PatternEngineClient } from './clients/pattern-engine'
import { EventPublisher } from '@daria/events'
import { createRoyaltyService } from './services/distribute-royalty'
import { setupConsumers } from './consumers'
import { templatesHandlers } from './handlers/templates'
import { distributeHandlers } from './handlers/distribute'
import { lineageHandlers } from './handlers/lineage'
import { disputesHandlers } from './handlers/disputes'

async function main() {
  // 1. Init tracing
  const tp = await initTracing('authorship-registry')

  // 2. Config
  const config: Config = initConfig()

  // 3. DB
  const db = createDb(config.databaseUrl)

  // 4. Clients
  const walletClient = new WalletClient(config.walletUrl, config.serviceToken)
  const patternClient = new PatternEngineClient(config.patternEngineUrl, config.serviceToken)

  // 5. Event publisher
  const publisher = new EventPublisher({
    natsUrl: config.natsUrl,
    source: '/services/authorship-registry',
    serviceName: 'authorship-registry',
  })
  await publisher.connect()

  // 6. Service
  const royaltyService = createRoyaltyService({ db, walletClient, publisher })

  // 7. Event consumers
  await setupConsumers({ db, royaltyService, natsUrl: config.natsUrl })

  // 8. HTTP
  const app = createApp()
  const router = createRouter()

  // Auth middleware via gateway-injected headers (X-User-Id, X-Kyc-Level)
  app.use((event) => {
    const userId = event.node.req.headers['x-user-id']
    if (userId) event.context.auth = {
      userId: Array.isArray(userId) ? userId[0] : userId,
      kycLevel: Number(event.node.req.headers['x-kyc-level'] ?? 0),
      scopes: String(event.node.req.headers['x-user-roles'] ?? '').split(','),
    }
  })

  // Wire handlers
  for (const [path, handler] of Object.entries(templatesHandlers({ db, royaltyService, publisher, patternClient }))) {
    router.use(path, defineEventHandler(handler))
  }
  for (const [path, handler] of Object.entries(distributeHandlers({ db, royaltyService }))) {
    router.use(path, defineEventHandler(handler))
  }
  for (const [path, handler] of Object.entries(lineageHandlers({ db }))) {
    router.use(path, defineEventHandler(handler))
  }
  for (const [path, handler] of Object.entries(disputesHandlers({ db, publisher }))) {
    router.use(path, defineEventHandler(handler))
  }

  // Health
  router.get('/health/live', defineEventHandler(() => ({ status: 'ok' })))
  router.get('/health/ready', defineEventHandler(async () => {
    await db.execute(sql`SELECT 1`)
    return { status: 'ready' }
  }))

  app.use(router)

  const server = createServer(toNodeListener(app))
  server.listen(config.port, () => {
    console.log(`authorship-registry listening on :${config.port}`)
  })

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    server.close()
    await publisher.close()
    await tp.shutdown()
    process.exit(0)
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

## src/config.ts

```typescript
import { z } from 'zod'

const ZConfig = z.object({
  port: z.coerce.number().default(8080),
  databaseUrl: z.string(),
  natsUrl: z.string(),
  walletUrl: z.string(),
  patternEngineUrl: z.string(),
  policyEngineUrl: z.string().optional(),
  serviceToken: z.string(),
  otlpEndpoint: z.string().default('otel-collector:4317'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})
export type Config = z.infer<typeof ZConfig>

export function initConfig(): Config {
  return ZConfig.parse({
    port: process.env.PORT,
    databaseUrl: process.env.DATABASE_URL,
    natsUrl: process.env.NATS_URL,
    walletUrl: process.env.WALLET_URL,
    patternEngineUrl: process.env.PATTERN_ENGINE_URL,
    policyEngineUrl: process.env.POLICY_ENGINE_URL,
    serviceToken: process.env.SERVICE_TOKEN,
    otlpEndpoint: process.env.OTLP_ENDPOINT,
    logLevel: process.env.LOG_LEVEL,
  })
}
```

## src/services/distribute-royalty.ts (CORE)

```typescript
import { and, eq, inArray } from 'drizzle-orm'
import type { Database } from '../db/client'
import type { WalletClient } from '../clients/wallet'
import type { EventPublisher } from '@daria/events'
import { templatesAuthorship, royaltyDistributions, lineagePaths } from '../db/schema'
import { computeWeights } from './weights'
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('authorship-registry')

interface DistributeInput {
  purchaseId: string
  templateId: string
  buyerId: string
  amountCents: bigint
  currency: string
  fxRateAtPurchase?: number
  traceId?: string
}

interface Recipient {
  recipient: string
  amountCents: bigint
  role: 'author' | 'direct' | 'ancestor' | 'dust' | 'platform'
  generation?: number
  weight?: number
}

interface DistributeResult {
  distributionId: string
  amountDistributedCents: bigint
  currencyDistributed: string
  recipients: Recipient[]
}

export function createRoyaltyService(deps: {
  db: Database
  walletClient: WalletClient
  publisher: EventPublisher
}) {
  return {
    async distribute(input: DistributeInput): Promise<DistributeResult> {
      return tracer.startActiveSpan('royalty.distribute', async (span) => {
        try {
          return await distributeImpl(input, deps)
        } finally {
          span.end()
        }
      })
    },

    async reverse(purchaseId: string, reason: string, traceId?: string): Promise<DistributeResult> {
      return reverseImpl({ purchaseId, reason, traceId }, deps)
    },
  }
}

async function distributeImpl(input: DistributeInput, deps: {
  db: Database
  walletClient: WalletClient
  publisher: EventPublisher
}): Promise<DistributeResult> {
  return deps.db.transaction(async (tx) => {
    // 1. Idempotency
    const existing = await tx.query.royaltyDistributions.findFirst({
      where: eq(royaltyDistributions.purchaseId, input.purchaseId),
    })
    if (existing) {
      return reconstructResult(existing)
    }

    // 2. Load template
    const template = await tx.query.templatesAuthorship.findFirst({
      where: eq(templatesAuthorship.patternId, input.templateId),
    })
    if (!template) throw new Error('TEMPLATE_NOT_FOUND')
    if (template.deletedAt) throw new Error('TEMPLATE_DELETED')

    const policy = template.splitPolicyJson as any
    
    // 3. FX conversion
    let amount = input.amountCents
    let currency = input.currency
    let fxRate = 1.0
    if (template.currency && template.currency !== input.currency) {
      fxRate = input.fxRateAtPurchase ?? await fetchFxRate(input.currency, template.currency)
      amount = BigInt(Math.floor(Number(input.amountCents) * fxRate))
      currency = template.currency
    }

    // 4. Compute recipients
    const recipients: Recipient[] = []
    let totalAllocated = 0n

    // 4a. Direct splits (non-lineage)
    for (const split of policy.splits) {
      if (split.party === 'forks-lineage') continue
      
      const shareAmount = BigInt(Math.floor(Number(amount) * Number(split.share)))
      if (shareAmount < BigInt(policy.minDistributionCents)) continue
      
      recipients.push({
        recipient: resolveParty(split.party, template),
        amountCents: shareAmount,
        role: split.party === 'author' ? 'author' : 'direct',
      })
      totalAllocated += shareAmount
    }

    // 4b. Lineage
    const lineageSplit = policy.splits.find((s: any) => s.party === 'forks-lineage')
    if (lineageSplit && policy.forksLineageRule !== 'none') {
      const lineageAmount = BigInt(Math.floor(Number(amount) * Number(lineageSplit.share)))
      
      const lineagePath = await tx.query.lineagePaths.findFirst({
        where: eq(lineagePaths.templateId, template.id),
      })
      const ancestors = (lineagePath?.ancestorIds as string[]) ?? []

      if (ancestors.length > 0) {
        const weights = computeWeights(ancestors.length, policy.forksLineageRule as any)
        
        // Load ancestor author ids in batch
        const ancestorTemplates = await tx.query.templatesAuthorship.findMany({
          where: inArray(templatesAuthorship.id, ancestors),
        })
        const ancestorMap = new Map(ancestorTemplates.map(t => [t.id, t]))
        
        for (let i = 0; i < ancestors.length; i++) {
          const ancestorTemplate = ancestorMap.get(ancestors[i])
          const generation = i + 1
          const weight = weights[i]
          const ancestorAmount = BigInt(Math.floor(Number(lineageAmount) * weight))
          
          if (ancestorAmount < BigInt(policy.minDistributionCents)) continue

          if (!ancestorTemplate || ancestorTemplate.deletedAt) {
            recipients.push({
              recipient: 'platform.orphan-royalty',
              amountCents: ancestorAmount,
              role: 'dust',
            })
          } else {
            recipients.push({
              recipient: ancestorTemplate.authorId,
              amountCents: ancestorAmount,
              role: 'ancestor',
              generation,
              weight,
            })
          }
          totalAllocated += ancestorAmount
        }
      }
    }

    // 4c. Dust
    const dust = amount - totalAllocated
    if (dust > 0n) {
      recipients.push({
        recipient: policy.dustPolicy === 'platform-fee' ? 'platform' : 'platform.dust-accumulator',
        amountCents: dust,
        role: 'dust',
      })
      totalAllocated += dust
    }

    // 5. Integrity check
    if (totalAllocated !== amount) {
      throw new Error(`INTEGRITY_VIOLATION: ${totalAllocated} != ${amount}`)
    }

    // 6. Execute transfers via wallet
    for (const r of recipients) {
      if (r.amountCents === 0n) continue
      await deps.walletClient.transfer({
        fromAccountType: 'platform.escrow',
        fromAccountOwnerId: `purchase:${input.purchaseId}`,
        toAccountType: resolveTargetAccountType(r.recipient, r.role),
        toAccountOwnerId: r.recipient,
        amountCents: r.amountCents,
        currency,
        kind: 'royalty',
        referenceType: 'royalty-distribution',
        referenceId: input.purchaseId,
        idempotencyKey: `royalty-${input.purchaseId}-${r.recipient}-${r.role}`,
        traceId: input.traceId,
      })
    }

    // 7. Record distribution
    const [distribution] = await tx.insert(royaltyDistributions).values({
      purchaseId: input.purchaseId,
      templateId: template.id,
      buyerId: input.buyerId,
      amountPaidCents: input.amountCents,
      currencyPaid: input.currency,
      amountDistributedCents: amount,
      currencyDistributed: currency,
      fxRate,
      fxTimestamp: fxRate !== 1.0 ? new Date() : null,
      policyHash: template.splitPolicyHash,
      policyVersion: 1,
      forksLineageRule: policy.forksLineageRule,
      recipients: recipients.map(r => ({
        ...r,
        amountCents: Number(r.amountCents),  // for JSON
      })),
      traceId: input.traceId,
    }).returning()

    // 8. Publish event
    await deps.publisher.publish({
      type: 'app.daria.authorship.royalty-distributed.v1',
      subject: template.id,
      data: {
        purchaseId: input.purchaseId,
        templateId: template.id,
        buyerId: input.buyerId,
        amountPaidCents: input.amountCents.toString(),
        currencyPaid: input.currency,
        amountDistributedCents: amount.toString(),
        currencyDistributed: currency,
        fxRate,
        fxTimestamp: fxRate !== 1.0 ? new Date().toISOString() : null,
        policyHash: template.splitPolicyHash,
        policyVersion: 1,
        forksLineageRule: policy.forksLineageRule,
        distribution: recipients.map(r => ({
          recipient: r.recipient,
          amountCents: r.amountCents.toString(),
          role: r.role,
          generation: r.generation,
          weight: r.weight,
        })),
        distributedAt: new Date().toISOString(),
      },
    })

    return {
      distributionId: distribution.id,
      amountDistributedCents: amount,
      currencyDistributed: currency,
      recipients,
    }
  })
}

async function reverseImpl(params: {
  purchaseId: string
  reason: string
  traceId?: string
}, deps: {
  db: Database
  walletClient: WalletClient
  publisher: EventPublisher
}): Promise<DistributeResult> {
  return deps.db.transaction(async (tx) => {
    const original = await tx.query.royaltyDistributions.findFirst({
      where: eq(royaltyDistributions.purchaseId, params.purchaseId),
    })
    if (!original) throw new Error('DISTRIBUTION_NOT_FOUND')
    if (original.status === 'reversed') throw new Error('ALREADY_REVERSED')

    const originalRecipients = original.recipients as any[]
    const reverseRecipients: Recipient[] = []

    // Execute compensating transfers (reverse direction)
    for (const r of originalRecipients) {
      await deps.walletClient.transfer({
        fromAccountType: resolveTargetAccountType(r.recipient, r.role),
        fromAccountOwnerId: r.recipient,
        toAccountType: 'platform.escrow',
        toAccountOwnerId: `refund:${params.purchaseId}`,
        amountCents: BigInt(r.amountCents),
        currency: original.currencyDistributed,
        kind: 'reversal',
        referenceType: 'royalty-reversal',
        referenceId: params.purchaseId,
        idempotencyKey: `royalty-reverse-${params.purchaseId}-${r.recipient}-${r.role}`,
        traceId: params.traceId,
      })
      reverseRecipients.push({
        recipient: r.recipient,
        amountCents: -BigInt(r.amountCents),
        role: r.role,
      })
    }

    // Record reversal
    const [reversal] = await tx.insert(royaltyDistributions).values({
      purchaseId: `${params.purchaseId}-reversal`,
      templateId: original.templateId,
      buyerId: original.buyerId,
      amountPaidCents: -original.amountPaidCents,
      currencyPaid: original.currencyPaid,
      amountDistributedCents: -original.amountDistributedCents,
      currencyDistributed: original.currencyDistributed,
      fxRate: original.fxRate,
      policyHash: original.policyHash,
      policyVersion: original.policyVersion,
      forksLineageRule: original.forksLineageRule,
      recipients: reverseRecipients.map(r => ({
        ...r,
        amountCents: Number(r.amountCents),
      })),
      status: 'completed',
      reversesTransferId: original.id,
      traceId: params.traceId,
    }).returning()

    // Update original
    await tx.update(royaltyDistributions)
      .set({ status: 'reversed', reversedByDistributionId: reversal.id })
      .where(eq(royaltyDistributions.id, original.id))

    await deps.publisher.publish({
      type: 'app.daria.authorship.reversal-completed.v1',
      data: {
        originalPurchaseId: params.purchaseId,
        reversalId: reversal.id,
        reason: params.reason,
        reversedAt: new Date().toISOString(),
      },
    })

    return {
      distributionId: reversal.id,
      amountDistributedCents: -original.amountDistributedCents,
      currencyDistributed: original.currencyDistributed,
      recipients: reverseRecipients,
    }
  })
}

function resolveParty(party: string, template: any): string {
  if (party === 'author') return template.authorId
  if (party === 'platform') return 'platform'
  if (party.startsWith('tag:')) return party
  if (party.startsWith('user:')) return party.slice(5)
  throw new Error(`UNKNOWN_PARTY: ${party}`)
}

function resolveTargetAccountType(recipient: string, role: string): string {
  if (role === 'platform' || recipient === 'platform' || recipient.startsWith('platform.')) return 'platform.revenue'
  if (role === 'dust') return 'treasury.fund'
  if (role === 'author') return 'author.royalty'
  if (role === 'ancestor') return 'author.royalty'
  return 'user.primary'
}

function reconstructResult(existing: any): DistributeResult {
  return {
    distributionId: existing.id,
    amountDistributedCents: BigInt(existing.amountDistributedCents),
    currencyDistributed: existing.currencyDistributed,
    recipients: (existing.recipients as any[]).map(r => ({
      recipient: r.recipient,
      amountCents: BigInt(r.amountCents),
      role: r.role,
      generation: r.generation,
      weight: r.weight,
    })),
  }
}

async function fetchFxRate(from: string, to: string): Promise<number> {
  // Via wallet service FX helper or external API
  const response = await fetch(`${process.env.WALLET_URL}/v1/fx/${from}/${to}`)
  const { rate } = await response.json()
  return rate
}
```

## src/services/weights.ts

```typescript
export type LineageRule = 'equal' | 'geometric' | 'linear' | 'none'

export function computeWeights(n: number, rule: LineageRule): number[] {
  if (n === 0 || rule === 'none') return []
  
  switch (rule) {
    case 'geometric': {
      // 1/2 + 1/4 + 1/8 + ... → normalize к sum 1
      const raw = Array.from({ length: n }, (_, i) => Math.pow(0.5, i + 1))
      const sum = raw.reduce((a, b) => a + b, 0)
      return raw.map(w => w / sum)
    }
    case 'linear': {
      // n + (n-1) + ... + 1 = n*(n+1)/2
      const total = (n * (n + 1)) / 2
      return Array.from({ length: n }, (_, i) => (n - i) / total)
    }
    case 'equal': {
      return Array.from({ length: n }, () => 1 / n)
    }
    default:
      return []
  }
}
```

## src/consumers/payment-confirmed.ts

```typescript
import { EventConsumer } from '@daria/events'
import type { Database } from '../db/client'

export async function setupPaymentConfirmedConsumer(deps: {
  db: Database
  royaltyService: ReturnType<typeof import('../services/distribute-royalty').createRoyaltyService>
  natsUrl: string
}) {
  const consumer = new EventConsumer({
    natsUrl: deps.natsUrl,
    streamName: 'durable-domain',
    consumerName: 'authorship-payment-confirmed-consumer',
    serviceName: 'authorship-registry',
    filterSubject: 'app.daria.payments.payment-confirmed.v1',
  })

  await consumer.connect()
  await consumer.subscribe(async (event, meta) => {
    const data = event.data as any
    
    // Only process template-purchases (not random charges)
    if (data.kind !== 'template-purchase' && data.kind !== 'subscription-renewal') {
      return  // ack, skip
    }

    await deps.royaltyService.distribute({
      purchaseId: data.chargeId,
      templateId: data.referenceId,  // template-id stored здесь при purchase
      buyerId: data.userId,
      amountCents: BigInt(data.amountCents),
      currency: data.currency,
      traceId: event.traceparent,
    })
  })
}
```

## src/handlers/templates.ts

```typescript
import { readBody, createError, type EventHandler } from 'h3'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import crypto from 'node:crypto'
import type { Database } from '../db/client'
import { templatesAuthorship } from '../db/schema'

const ZPublishRequest = z.object({
  patternId: z.string().uuid(),
  authorId: z.string(),
  licenseKind: z.enum(['CC0', 'CC-BY', 'CC-BY-SA', 'CC-BY-NC', 'MIT', 'GPL', 'Commercial-1x', 'Commercial-Subscription', 'Royalty-Fork', 'Private']),
  splitPolicy: z.object({
    splits: z.array(z.object({
      party: z.string(),
      share: z.number().min(0).max(1),
    })),
    forksLineageRule: z.enum(['equal', 'geometric', 'linear', 'none']),
    minDistributionCents: z.number().int().min(0),
    dustPolicy: z.enum(['accumulate', 'platform-fee']),
    currency: z.string().regex(/^[A-Z]{3}$/),
  }),
  priceCents: z.string().regex(/^[0-9]+$/).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  contentHash: z.string(),
})

export function templatesHandlers(deps: {
  db: Database
  royaltyService: any
  publisher: any
  patternClient: any
}): Record<string, EventHandler> {
  return {
    // POST /templates
    'POST /templates': async (event) => {
      const body = await readBody(event)
      const parsed = ZPublishRequest.safeParse(body)
      if (!parsed.success) {
        throw createError({ statusCode: 400, data: parsed.error.flatten() })
      }
      const data = parsed.data

      // Validate split sum
      const splitSum = data.splitPolicy.splits.reduce((sum, s) => sum + s.share, 0)
      if (Math.abs(splitSum - 1.0) > 0.0001) {
        throw createError({ statusCode: 400, statusMessage: 'SPLIT_SUM_INVALID', data: { sum: splitSum } })
      }

      // Hash split-policy для integrity
      const policyHash = crypto.createHash('sha256')
        .update(JSON.stringify(data.splitPolicy))
        .digest('hex')

      const [template] = await deps.db.insert(templatesAuthorship).values({
        id: uuidv7(),
        patternId: data.patternId,
        authorId: data.authorId,
        licenseKind: data.licenseKind,
        splitPolicyJson: data.splitPolicy,
        splitPolicyHash: policyHash,
        priceCents: data.priceCents ? BigInt(data.priceCents) : null,
        currency: data.currency,
        publishedAt: new Date(),
        contentHash: data.contentHash,
      }).returning()

      // Publish event
      await deps.publisher.publish({
        type: 'app.daria.authorship.template-published.v1',
        subject: template.id,
        data: {
          templateId: template.id,
          patternId: template.patternId,
          authorId: template.authorId,
          licenseKind: template.licenseKind,
          publishedAt: template.publishedAt.toISOString(),
        },
      })

      return template
    },

    // GET /templates/:id
    'GET /templates/:id': async (event) => {
      const id = event.context.params?.id
      const template = await deps.db.query.templatesAuthorship.findFirst({
        where: eq(templatesAuthorship.id, id!),
      })
      if (!template) throw createError({ statusCode: 404 })
      return template
    },

    // POST /templates/:id/fork
    'POST /templates/:id/fork': async (event) => {
      const id = event.context.params?.id
      const body = await readBody(event)
      
      // Check license allows fork
      const source = await deps.db.query.templatesAuthorship.findFirst({
        where: eq(templatesAuthorship.id, id!),
      })
      if (!source) throw createError({ statusCode: 404 })

      const LICENSE_ALLOWS_FORK = ['CC0', 'CC-BY', 'CC-BY-SA', 'MIT', 'GPL', 'Royalty-Fork']
      if (!LICENSE_ALLOWS_FORK.includes(source.licenseKind)) {
        throw createError({ statusCode: 403, statusMessage: 'LICENSE_FORBIDS_FORK' })
      }

      // Delegate к pattern-engine для actual pattern cloning
      const newPattern = await deps.patternClient.fork(source.patternId, {
        forkerId: body.forkerId,
        title: body.forkTitle,
      })

      // Register new template
      const [newTemplate] = await deps.db.insert(templatesAuthorship).values({
        id: uuidv7(),
        patternId: newPattern.id,
        authorId: body.forkerId,
        licenseKind: source.licenseKind,
        splitPolicyJson: source.splitPolicyJson,
        splitPolicyHash: source.splitPolicyHash,
        priceCents: source.priceCents,
        currency: source.currency,
        publishedAt: new Date(),
        contentHash: newPattern.contentHash,
      }).returning()

      // Update lineage
      await updateLineage(deps.db, newTemplate.id, source.id)

      await deps.publisher.publish({
        type: 'app.daria.authorship.template-forked.v1',
        data: {
          sourceTemplateId: source.id,
          newTemplateId: newTemplate.id,
          forkerId: body.forkerId,
          forkedAt: new Date().toISOString(),
        },
      })

      return newTemplate
    },
  }
}

async function updateLineage(db: Database, newTemplateId: string, sourceTemplateId: string) {
  // Get source lineage
  const sourceLineage = await db.query.lineagePaths.findFirst({
    where: eq(lineagePaths.templateId, sourceTemplateId),
  })
  
  const newAncestors = [sourceTemplateId, ...(sourceLineage?.ancestorIds as string[] ?? [])]
  
  await db.insert(lineagePaths).values({
    templateId: newTemplateId,
    ancestorIds: newAncestors,
    depth: newAncestors.length,
  })
}
```

## Tests

```typescript
// tests/distribute-royalty.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createRoyaltyService } from '../src/services/distribute-royalty'
import { createMockDb, createMockWallet, createMockPublisher } from './mocks'

describe('distributeRoyalty', () => {
  let deps: any
  
  beforeEach(() => {
    deps = {
      db: createMockDb(),
      walletClient: createMockWallet(),
      publisher: createMockPublisher(),
    }
  })

  it('geometric distribution с 2 ancestors (Alice→Bob→Carol), buyer Dmitry, $20', async () => {
    // Seed: Carol template с ancestors [Bob, Alice]
    await deps.db.insertTemplate({
      id: 'tpl-carol',
      patternId: 'pat-carol',
      authorId: 'carol',
      licenseKind: 'Royalty-Fork',
      splitPolicyJson: {
        splits: [
          { party: 'author', share: 0.70 },
          { party: 'platform', share: 0.10 },
          { party: 'tag:music-fund', share: 0.05 },
          { party: 'forks-lineage', share: 0.15 },
        ],
        forksLineageRule: 'geometric',
        minDistributionCents: 1,
        dustPolicy: 'accumulate',
        currency: 'USD',
      },
      splitPolicyHash: 'h',
      currency: 'USD',
    })
    await deps.db.insertLineage('tpl-carol', ['tpl-bob', 'tpl-alice'])
    await deps.db.insertTemplate({ id: 'tpl-bob', authorId: 'bob', ... })
    await deps.db.insertTemplate({ id: 'tpl-alice', authorId: 'alice', ... })

    const service = createRoyaltyService(deps)
    const result = await service.distribute({
      purchaseId: 'p-test-1',
      templateId: 'pat-carol',
      buyerId: 'dmitry',
      amountCents: 2000n,  // $20
      currency: 'USD',
    })

    expect(result.amountDistributedCents).toBe(2000n)
    
    const carolAuthor = result.recipients.find(r => r.recipient === 'carol' && r.role === 'author')
    expect(carolAuthor?.amountCents).toBe(1400n)  // 70%
    
    const platform = result.recipients.find(r => r.recipient === 'platform' && r.role === 'direct')
    expect(platform?.amountCents).toBe(200n)  // 10%
    
    const tagFund = result.recipients.find(r => r.recipient === 'tag:music-fund')
    expect(tagFund?.amountCents).toBe(100n)  // 5%
    
    // Lineage: 15% total, geometric → Bob 2/3, Alice 1/3
    const bob = result.recipients.find(r => r.recipient === 'bob' && r.generation === 1)
    expect(bob?.amountCents).toBe(200n)  // 15% × 2/3 ≈ 10%
    
    const alice = result.recipients.find(r => r.recipient === 'alice' && r.generation === 2)
    expect(alice?.amountCents).toBe(100n)  // 15% × 1/3 ≈ 5%
    
    // Sum check
    const sum = result.recipients.reduce((s, r) => s + r.amountCents, 0n)
    expect(sum).toBe(2000n)
  })

  it('idempotent — second call returns same result', async () => {
    const service = createRoyaltyService(deps)
    const first = await service.distribute({ ... })
    const second = await service.distribute({ ... })
    expect(first.distributionId).toBe(second.distributionId)
  })

  it('deleted ancestor → platform.orphan-royalty', async () => {
    // Mark Alice deleted
    await deps.db.update('tpl-alice', { deletedAt: new Date() })
    
    const service = createRoyaltyService(deps)
    const result = await service.distribute({ ... })
    
    const alicePart = result.recipients.find(r => r.generation === 2)
    expect(alicePart?.recipient).toBe('platform.orphan-royalty')
    expect(alicePart?.role).toBe('dust')
  })

  it('currency conversion FX at purchase time', async () => {
    // Template priced в USD, buyer pays RUB
    const service = createRoyaltyService(deps)
    const result = await service.distribute({
      purchaseId: 'p-fx-1',
      templateId: 'pat-carol',
      buyerId: 'dmitry',
      amountCents: 200000n,  // 2000 RUB
      currency: 'RUB',
      fxRateAtPurchase: 0.01,  // 100 RUB = 1 USD
    })
    
    expect(result.currencyDistributed).toBe('USD')
    expect(result.amountDistributedCents).toBe(2000n)  // $20
  })

  it('reverse returns compensating transfers', async () => {
    const service = createRoyaltyService(deps)
    await service.distribute({ purchaseId: 'p-1', ... })
    
    const reversal = await service.reverse('p-1', 'refund', 'trace-abc')
    
    expect(reversal.amountDistributedCents).toBeLessThan(0n)
    for (const r of reversal.recipients) {
      expect(r.amountCents).toBeLessThan(0n)  // all negative
    }
  })
})
```

## Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /build
RUN npm install -g pnpm@9
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages packages
COPY services/authorship-registry services/authorship-registry
RUN pnpm install --frozen-lockfile --filter "@daria/service-authorship-registry..."
RUN pnpm -F @daria/service-authorship-registry build

FROM node:20-alpine
RUN apk add --no-cache tini
WORKDIR /app
RUN npm install -g pnpm@9
COPY --from=builder /build/services/authorship-registry/dist ./dist
COPY --from=builder /build/services/authorship-registry/package.json ./
COPY --from=builder /build/node_modules ./node_modules
RUN chown -R node:node /app
USER node
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
```

## Integration test

```bash
# Full e2e через docker-compose
docker compose up -d postgres nats authorship-registry

# Seed test data (via test API)
curl -X POST http://localhost:8080/v1/templates \
  -H "X-User-Id: alice" \
  -d '{"patternId":"p1","authorId":"alice","licenseKind":"Royalty-Fork","splitPolicy":{...},"contentHash":"h"}'

# Trigger distribution
curl -X POST http://localhost:8080/v1/purchases/test-purchase-1/distribute \
  -d '{"templateId":"p1","buyerId":"dmitry","amountCents":"2000","currency":"USD"}'

# Verify result
curl http://localhost:8080/v1/purchases/test-purchase-1/distribution
```

## Metrics emitted

- `authorship.royalty.distribute.duration_ms{template_kind}` histogram
- `authorship.royalty.distributed_cents{currency}` counter
- `authorship.royalty.reversal.count` counter
- `authorship.lineage.depth{template_id}` gauge
- `authorship.template.published.count` counter
