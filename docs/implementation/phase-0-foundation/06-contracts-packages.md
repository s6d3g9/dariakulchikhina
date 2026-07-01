# Phase 0 / Week 2 / Monday: Contracts packages

Цель: `packages/contracts-platform/`, `contracts-domain/`, `contracts-governance/` с Zod + OpenAPI generation.

## Шаг 1: Install dependencies

```bash
pnpm add -D -w @asteasolutions/zod-to-openapi
pnpm add zod -F @daria/contracts-platform
pnpm add zod -F @daria/contracts-domain
pnpm add zod -F @daria/contracts-governance
pnpm add @asteasolutions/zod-to-openapi -F @daria/contracts-platform
pnpm add @asteasolutions/zod-to-openapi -F @daria/contracts-domain
pnpm add @asteasolutions/zod-to-openapi -F @daria/contracts-governance
```

## Шаг 2: contracts-platform structure

```
packages/contracts-platform/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                — re-exports
│   ├── common/
│   │   ├── errors.ts           — unified Error schema
│   │   ├── pagination.ts
│   │   └── ids.ts              — UUID, money formats
│   ├── identity/
│   │   ├── user.ts
│   │   ├── auth.ts
│   │   └── scopes.ts
│   ├── wallet/
│   │   ├── account.ts
│   │   ├── transfer.ts
│   │   └── hold.ts
│   ├── payments/
│   │   ├── charge.ts
│   │   ├── refund.ts
│   │   └── payment-method.ts
│   ├── notifications/
│   │   ├── notification.ts
│   │   └── channel.ts
│   └── generators/
│       └── openapi.ts          — generate OpenAPI per-domain
└── openapi/                     — output (gitignored)
```

## Шаг 3: Common schemas

`packages/contracts-platform/src/common/ids.ts`:

```ts
import { z } from 'zod'

export const ZUuid = z.string().uuid()
export const ZUuidV7 = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)

export const ZUserId = z.string().min(1).max(64)
export const ZEntityId = z.string().min(1).max(128)

// Money as cents stored as string (JSON-safe bigint)
export const ZCents = z.string().regex(/^-?[0-9]+$/).transform((s) => BigInt(s))
export const ZPositiveCents = z.string().regex(/^[1-9][0-9]*$/).transform((s) => BigInt(s))

export const ZCurrency = z.string().regex(/^[A-Z]{3}$/)  // ISO-4217

export const ZIsoDate = z.string().datetime()
export const ZTraceparent = z.string().regex(
  /^[0-9]{2}-[0-9a-f]{32}-[0-9a-f]{16}-[0-9]{2}$/
)
```

`packages/contracts-platform/src/common/errors.ts`:

```ts
import { z } from 'zod'

export const ZErrorCode = z.enum([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'CONFLICT',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'POLICY_DENY',
  // Wallet-specific
  'INSUFFICIENT_FUNDS',
  'CURRENCY_MISMATCH',
  'SELF_TRANSFER',
  'ACCOUNT_NOT_FOUND',
  'VERSION_CONFLICT',
  'IDEMPOTENCY_MISMATCH',
  // Booking-specific
  'SLOT_TAKEN',
  'HOLD_EXPIRED',
  // Identity-specific
  'KYC_LEVEL_INSUFFICIENT',
  'AGE_RESTRICTED',
])
export type ErrorCode = z.infer<typeof ZErrorCode>

export const ZErrorDetail = z.object({
  code: ZErrorCode,
  message: z.string().max(1024),
  traceId: z.string().optional(),
  details: z.record(z.unknown()).optional(),
})

export const ZApiError = z.object({
  error: ZErrorDetail,
})
export type ApiError = z.infer<typeof ZApiError>
```

`packages/contracts-platform/src/common/pagination.ts`:

```ts
import { z } from 'zod'

export const ZCursor = z.string().regex(/^[A-Za-z0-9+/=]+$/)  // base64-encoded

export const ZPaginationRequest = z.object({
  cursor: ZCursor.optional(),
  limit: z.number().int().min(1).max(100).default(20),
})
export type PaginationRequest = z.infer<typeof ZPaginationRequest>

export const zPaginationResponse = <T extends z.ZodSchema>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: ZCursor.optional(),
    totalEstimate: z.number().int().optional(),
  })
```

## Шаг 4: Wallet contracts

`packages/contracts-platform/src/wallet/account.ts`:

```ts
import { z } from 'zod'
import { ZUuid, ZUserId, ZCents, ZCurrency, ZIsoDate } from '../common/ids'

export const ZAccountType = z.enum([
  'user.primary',
  'user.escrow',
  'platform.revenue',
  'author.royalty',
  'treasury.fund',
  'liquidity.pool',
])

export const ZOwnerType = z.enum(['user', 'platform', 'tag', 'author'])

export const ZAccount = z.object({
  id: ZUuid,
  accountType: ZAccountType,
  ownerType: ZOwnerType,
  ownerId: ZUserId,
  currency: ZCurrency,
  balanceCents: z.string().regex(/^-?[0-9]+$/),  // string for JSON
  holdCents: z.string().regex(/^[0-9]+$/),
  availableCents: z.string().regex(/^-?[0-9]+$/).optional(),  // derived
  version: z.number().int().min(1),
  createdAt: ZIsoDate,
  updatedAt: ZIsoDate,
  deletedAt: ZIsoDate.optional(),
})
export type Account = z.infer<typeof ZAccount>

export const ZCreateAccountRequest = z.object({
  accountType: ZAccountType,
  ownerType: ZOwnerType,
  ownerId: ZUserId,
  currency: ZCurrency,
})
```

`packages/contracts-platform/src/wallet/transfer.ts`:

```ts
import { z } from 'zod'
import { ZUuid, ZCurrency, ZIsoDate, ZTraceparent } from '../common/ids'

export const ZTransferKind = z.enum([
  'charge',
  'refund',
  'royalty',
  'platform-fee',
  'internal',
  'reversal',
])

export const ZTransferStatus = z.enum(['pending', 'committed', 'reversed'])

export const ZTransfer = z.object({
  id: ZUuid,
  fromAccountId: ZUuid,
  toAccountId: ZUuid,
  amountCents: z.string().regex(/^[0-9]+$/),
  currency: ZCurrency,
  idempotencyKey: z.string().min(1).max(128),
  kind: ZTransferKind,
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  description: z.string().max(256).optional(),
  metadata: z.record(z.unknown()).optional(),
  status: ZTransferStatus,
  reversesTransferId: ZUuid.optional(),
  traceId: z.string().optional(),
  createdAt: ZIsoDate,
  committedAt: ZIsoDate.optional(),
})
export type Transfer = z.infer<typeof ZTransfer>

export const ZCreateTransferRequest = z.object({
  fromAccountId: ZUuid,
  toAccountId: ZUuid,
  amountCents: z.string().regex(/^[1-9][0-9]*$/),  // positive
  currency: ZCurrency,
  kind: ZTransferKind,
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  description: z.string().max(256).optional(),
  metadata: z.record(z.unknown()).optional(),
})
```

## Шаг 5: OpenAPI generation

`packages/contracts-platform/src/generators/openapi.ts`:

```ts
import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import * as fs from 'fs'
import * as path from 'path'

extendZodWithOpenApi(z)

// Re-export все schemas с .openapi() tags для generation
import { ZAccount, ZCreateAccountRequest } from '../wallet/account'
import { ZTransfer, ZCreateTransferRequest } from '../wallet/transfer'
import { ZApiError } from '../common/errors'

// Register в OpenAPI registry
const registry = new OpenAPIRegistry()

registry.register('Account', ZAccount)
registry.register('CreateAccountRequest', ZCreateAccountRequest)
registry.register('Transfer', ZTransfer)
registry.register('CreateTransferRequest', ZCreateTransferRequest)
registry.register('ApiError', ZApiError)

// Paths — manually describe (или generate из Zod with extendZodWithOpenApi)
registry.registerPath({
  method: 'post',
  path: '/v1/transfers',
  summary: 'Create transfer',
  operationId: 'createTransfer',
  request: {
    headers: z.object({
      'Idempotency-Key': z.string().regex(/^[a-f0-9-]{36}$/),
    }),
    body: { content: { 'application/json': { schema: ZCreateTransferRequest } } },
  },
  responses: {
    201: {
      description: 'Transfer committed',
      content: { 'application/json': { schema: ZTransfer } },
    },
    409: {
      description: 'Conflict',
      content: { 'application/json': { schema: ZApiError } },
    },
  },
})

// ... repeat for other endpoints

const generator = new OpenApiGeneratorV31(registry.definitions)
const document = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'Daria Platform Contracts',
    version: '1.0.0',
    description: 'Auto-generated from Zod schemas',
  },
  servers: [{ url: 'http://gateway.internal/v1' }],
})

// Write
const outputPath = path.join(__dirname, '../../openapi/platform.yaml')
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, JSON.stringify(document, null, 2))

console.log(`OpenAPI generated: ${outputPath}`)
```

## Шаг 6: index.ts

`packages/contracts-platform/src/index.ts`:

```ts
// Common
export * from './common/ids'
export * from './common/errors'
export * from './common/pagination'

// Identity
export * from './identity/user'
export * from './identity/auth'
export * from './identity/scopes'

// Wallet
export * from './wallet/account'
export * from './wallet/transfer'
export * from './wallet/hold'

// Payments
export * from './payments/charge'
export * from './payments/refund'
export * from './payments/payment-method'

// Notifications
export * from './notifications/notification'
export * from './notifications/channel'
```

## Шаг 7: Scripts

`packages/contracts-platform/package.json`:

```json
{
  "name": "@daria/contracts-platform",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "openapi:generate": "tsx src/generators/openapi.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.23.0",
    "@asteasolutions/zod-to-openapi": "^7.0.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0"
  }
}
```

Root package.json script:

```json
{
  "scripts": {
    "openapi:generate": "turbo run openapi:generate"
  }
}
```

## Шаг 8: contracts-domain

Similar structure, но для primitives Layer 3:

```
packages/contracts-domain/src/
├── index.ts
├── pattern/
│   ├── pattern-card.ts
│   ├── template.ts
│   ├── binding.ts
│   └── lineage.ts
├── timeline/
│   ├── timeline.ts
│   ├── step.ts
│   └── evidence.ts
├── booking/
│   ├── booking.ts
│   ├── slot.ts
│   └── hold.ts
├── authorship/
│   ├── template.ts
│   ├── split-policy.ts
│   └── royalty.ts
├── subscription/
│   └── subscription.ts
├── messenger/
│   ├── conversation.ts
│   └── message.ts
├── feed/
│   ├── post.ts
│   └── story.ts
└── generators/
    └── openapi.ts
```

Example `src/timeline/step.ts`:

```ts
import { z } from 'zod'
import { ZUuid, ZIsoDate } from '@daria/contracts-platform'

export const ZStepKind = z.enum(['auto', 'human', 'external', 'gate', 'compound'])
export const ZStepStatus = z.enum([
  'pending', 'active', 'waiting', 'done', 'failed', 'skipped', 'cancelled'
])
export const ZStepOwner = z.enum(['user', 'counterparty', 'system', 'regulator'])

export const ZTimelineStep = z.object({
  id: ZUuid,
  timelineId: ZUuid,
  stepId: z.string().min(1).max(64),
  kind: ZStepKind,
  status: ZStepStatus,
  title: z.string().min(1).max(256),
  owner: ZStepOwner,
  position: z.number().int().min(0),
  plannedAt: ZIsoDate.optional(),
  startedAt: ZIsoDate.optional(),
  completedAt: ZIsoDate.optional(),
  deadlineAt: ZIsoDate.optional(),
  handler: z.string().optional(),
  compensateHandler: z.string().optional(),
  handlerParams: z.record(z.unknown()).optional(),
  handlerResult: z.record(z.unknown()).optional(),
  gateRequirement: z.string().optional(),
  gateDecision: z.enum(['allow', 'distill', 'deny']).optional(),
  retryCount: z.number().int().min(0),
  lastError: z.string().optional(),
  createdAt: ZIsoDate,
  updatedAt: ZIsoDate,
})
export type TimelineStep = z.infer<typeof ZTimelineStep>

// Helper для defining timelines в card-types
export interface TimelineDefinition {
  kind: string
  steps: Array<{
    id: string
    kind: z.infer<typeof ZStepKind>
    title: string
    handler?: string
    compensate?: string
    gate?: { require: string }
    // ...
  }>
  completion: { on: string }
}

export function defineTimeline(def: TimelineDefinition): TimelineDefinition {
  return def
}
```

## Шаг 9: contracts-governance

```
packages/contracts-governance/src/
├── index.ts
├── policy/
│   ├── evaluation.ts
│   └── rules.ts
├── permissions/
│   ├── permission.ts
│   └── subject.ts
├── moderation/
│   ├── case.ts
│   └── ruling.ts
├── audit/
│   └── event.ts
└── generators/
    └── openapi.ts
```

Example `src/policy/evaluation.ts`:

```ts
import { z } from 'zod'

export const ZDecision = z.enum(['allow', 'distill', 'deny'])

export const ZPolicyContext = z.object({
  user: z.object({
    id: z.string(),
    age: z.number().int().optional(),
    roles: z.array(z.string()),
    kyc: z.object({ level: z.number().int().min(0).max(4) }),
    credentials: z.array(z.string()).optional(),
  }),
  region: z.object({
    code: z.string().regex(/^[A-Z]{2}$/),
    tz: z.string(),
    language: z.string(),
  }),
  action: z.object({
    type: z.string(),
    resource: z.string().optional(),
    meta: z.record(z.unknown()).optional(),
  }),
  time: z.object({
    utc: z.string().datetime(),
    local: z.string().datetime().optional(),
    hour: z.number().int().min(0).max(23).optional(),
  }),
  entity: z.object({
    kind: z.string(),
    id: z.string(),
  }).optional(),
})

export const ZPolicyDecision = z.object({
  effect: ZDecision,
  reason: z.string().optional(),
  mask: z.array(z.string()).optional(),
  replace: z.record(z.string()).optional(),
  require: z.record(z.string()).optional(),
  policyId: z.string().optional(),
  policyVersion: z.number().int().optional(),
  latencyMs: z.number().int().optional(),
})
```

## Шаг 10: Тестирование

```bash
# Typecheck
pnpm -F @daria/contracts-platform typecheck
pnpm -F @daria/contracts-domain typecheck
pnpm -F @daria/contracts-governance typecheck

# Generate OpenAPI
pnpm openapi:generate
ls packages/contracts-*/openapi/*.yaml
```

Expected: OpenAPI files generated для каждого contracts package.

## Шаг 11: Commit

```bash
git add packages/contracts-*
git commit -m "feat(contracts): bootstrap Zod schemas + OpenAPI generation"
git push
```

## Checklist

- [ ] 3 contracts packages с исходниками
- [ ] Zod schemas для platform / domain / governance
- [ ] OpenAPI generation работает (3 yaml files created)
- [ ] Typecheck passes
- [ ] Test package-to-package import (в example app)

## Next

Tuesday: events package → `07-events-package.md`.
