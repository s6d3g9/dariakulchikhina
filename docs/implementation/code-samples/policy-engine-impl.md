# Policy-engine — implementation (TS + OPA Wasm)

Полный код для `services/policy-engine`. Layer 6 governance service. Runtime policy evaluation с OPA compiled to WASM для p99 < 5ms.

## Structure

```
services/policy-engine/
├── Dockerfile
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                   — Nitro entrypoint
│   ├── config.ts
│   ├── engine/
│   │   ├── opa-runtime.ts         — OPA WASM loader
│   │   ├── compiler.ts            — compile Rego → WASM
│   │   ├── evaluator.ts           — evaluate()
│   │   └── cache.ts               — decision caching (for read-only actions)
│   ├── loader/
│   │   ├── policy-loader.ts       — watch platform/policies/
│   │   ├── law-profile-loader.ts  — watch platform/law-profiles/
│   │   └── hot-reload.ts          — file watcher
│   ├── handlers/
│   │   ├── evaluate.ts            — POST /evaluate
│   │   ├── batch-evaluate.ts
│   │   └── law-profiles.ts
│   ├── audit/
│   │   └── publisher.ts           — publish policy-evaluated events
│   └── rego/
│       └── loader.ts              — compile .rego files
├── platform/
│   └── policies/                  — compiled policies (at start-up)
└── tests/
```

## Шаг 1: OPA setup

Install:

```bash
pnpm add @open-policy-agent/opa-wasm -F @daria/service-policy-engine
```

OPA Wasm runtime позволяет compile Rego policies → WASM bytecode → evaluate в Node ~3ms.

## Шаг 2: Rego policies — examples

`platform/policies/age-gates.rego`:

```rego
package daria.age_gates

import future.keywords.if
import future.keywords.in

# Default: allow
default decision := {"effect": "allow"}

# Age-check for dating
decision := {"effect": "deny", "reason": "UNDERAGE", "policyId": "age-gates.dating"} if {
  input.action.type == "card-type.access"
  input.action.resource == "dating"
  not has_verified_adult_age
}

# Alcohol-related (regional)
decision := {"effect": "deny", "reason": "UNDERAGE_ALCOHOL", "policyId": "age-gates.alcohol"} if {
  input.action.type == "content.view"
  "alcohol" in input.entity.tags
  input.user.age < region_legal_age_for_alcohol
}

# Minor parent-consent для purchases
decision := {
  "effect": "deny", 
  "reason": "MINOR_REQUIRES_PARENT_CONSENT",
  "policyId": "age-gates.minor-purchase"
} if {
  input.action.type == "subscription.purchase"
  input.user.age < input.region.legalAges.adult
  input.action.meta.amount_cents > input.region.minors.maxDailyLimit.amount * 100
  not input.user.parentConsent
}

# Helpers
has_verified_adult_age if {
  input.user.age >= 18
  input.user.verifiedAge.level >= 3
}

region_legal_age_for_alcohol := input.region.legalAges.alcohol
```

`platform/policies/kyc-gates.rego`:

```rego
package daria.kyc_gates

import future.keywords.if

default decision := {"effect": "allow"}

# Wallet transfer требует KYC L2
decision := {"effect": "deny", "reason": "KYC_L2_REQUIRED"} if {
  input.action.type == "wallet.transfer"
  input.user.kyc.level < 2
}

# Crypto exchange требует L3
decision := {"effect": "deny", "reason": "KYC_L3_REQUIRED"} if {
  input.action.type == "card-type.access"
  input.action.resource == "crypto-exchange"
  input.user.kyc.level < 3
}

# Banking features требуют L4
decision := {"effect": "deny", "reason": "KYC_L4_REQUIRED"} if {
  input.action.type == "card-type.access"
  input.action.resource == "bank-account"
  input.user.kyc.level < 4
}
```

`platform/policies/regional-bans.rego`:

```rego
package daria.regional_bans

import future.keywords.if
import future.keywords.in

default decision := {"effect": "allow"}

# Crypto-exchange запрещён в некоторых юрисдикциях
decision := {"effect": "deny", "reason": "REGION_PROHIBITS"} if {
  input.action.resource == "crypto-exchange-retail"
  input.region.code in banned_crypto_regions
}

decision := {"effect": "deny", "reason": "REGION_PROHIBITS_GAMBLING"} if {
  "gambling" in input.entity.tags
  input.region.code in banned_gambling_regions
}

# Alcohol — quiet hours
decision := {
  "effect": "distill",
  "mask": ["alcohol-items"],
  "reason": "LOCAL_HOUR_BAN"
} if {
  "alcohol" in input.entity.tags
  input.time.hour >= input.region.alcoholBan.from
  input.time.hour < input.region.alcoholBan.to
}

banned_crypto_regions := {"CN", "DZ"}
banned_gambling_regions := {"SA", "IR", "AE"}
```

## Шаг 3: Law-profiles examples

`platform/law-profiles/RU.yaml`:

```yaml
region: RU
legalAges:
  alcohol: 18
  gambling: 21
  marriage: 18
  adult: 18
  driving-category:
    A: 18
    B: 18
    Motorcycle-A1: 16

prohibited:
  - "crypto-exchange-retail"
  - "psychedelic-substances"

financialLimits:
  cross-border-remittance:
    annual: 1000000  # RUB
    currency: "RUB"

dataRetention:
  user-data: "5y"
  financial-log: "5y"
  medical-data: "10y"

disclosures:
  advertising: "ru-ad-disclaimer"
  crypto: "ru-crypto-warning"

minors:
  requireParentConsent: true
  parentVerificationMethod: "email-link"
  maxDailySpendingLimit:
    currency: "RUB"
    amount: 500
  strictModeration: true

notifications:
  quietHours:
    default:
      from: "22:00"
      to: "08:00"

alcoholBan:
  from: 22  # 10pm
  to: 8     # 8am
```

`platform/law-profiles/EU-DE.yaml`:

```yaml
region: DE
inherits: EU  # base rules
legalAges:
  alcohol: 16  # soft drinks/beer от 16 в DE
  strongAlcohol: 18
  gambling: 18
  adult: 18
  digital-consent: 16  # GDPR-K

moderation:
  nsfw: strict
  hate-speech: legal-threshold  # NetzDG compliance
  
dataRetention:
  user-data: "6y"
  financial-log: "10y"

disclosures:
  advertising: "eu-gdpr-disclaimer"
  ai-generated: "required"
```

## Шаг 4: Policy compiler

`src/engine/compiler.ts`:

```typescript
import { execSync } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'

// Compile Rego files to WASM using OPA CLI
export async function compileRegoToWasm(regoDir: string, outputDir: string): Promise<Map<string, Buffer>> {
  const wasmModules = new Map<string, Buffer>()

  // List .rego files
  const files = (await fs.readdir(regoDir)).filter(f => f.endsWith('.rego'))
  
  for (const file of files) {
    const regoPath = path.join(regoDir, file)
    const wasmPath = path.join(outputDir, file.replace('.rego', '.wasm'))
    
    // Extract package name
    const regoContent = await fs.readFile(regoPath, 'utf-8')
    const packageMatch = regoContent.match(/package\s+([\w.]+)/)
    if (!packageMatch) continue
    const packageName = packageMatch[1]
    
    // Compile via OPA CLI (must be available in PATH или in image)
    execSync(`opa build -t wasm -e ${packageName}/decision -o ${outputDir}/bundle.tar.gz ${regoPath}`, {
      stdio: 'inherit',
    })
    
    // Extract policy.wasm from bundle
    execSync(`tar -xzf ${outputDir}/bundle.tar.gz -C ${outputDir}`, { stdio: 'inherit' })
    const wasmBuffer = await fs.readFile(`${outputDir}/policy.wasm`)
    
    wasmModules.set(packageName, wasmBuffer)
    
    // Rename for clarity
    await fs.rename(`${outputDir}/policy.wasm`, wasmPath)
  }
  
  return wasmModules
}
```

## Шаг 5: OPA Wasm runtime

`src/engine/opa-runtime.ts`:

```typescript
import { loadPolicy } from '@open-policy-agent/opa-wasm'
import type { LoadedPolicy } from '@open-policy-agent/opa-wasm'

export class OpaRuntime {
  private policies = new Map<string, LoadedPolicy>()

  async loadPolicy(name: string, wasmBuffer: Buffer): Promise<void> {
    const policy = await loadPolicy(wasmBuffer)
    this.policies.set(name, policy)
  }

  async evaluate(policyName: string, input: unknown): Promise<unknown> {
    const policy = this.policies.get(policyName)
    if (!policy) {
      throw new Error(`Policy not loaded: ${policyName}`)
    }
    
    const result = policy.evaluate(input)
    return result
  }

  async evaluateAll(input: unknown): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>()
    for (const [name, policy] of this.policies) {
      const result = policy.evaluate(input)
      results.set(name, result)
    }
    return results
  }

  clear() {
    this.policies.clear()
  }
}

export const opaRuntime = new OpaRuntime()
```

## Шаг 6: Evaluator (combines all policies)

`src/engine/evaluator.ts`:

```typescript
import { opaRuntime } from './opa-runtime'
import { z } from 'zod'
import { ZPolicyContext, ZPolicyDecision } from '@daria/contracts-governance'
import { publishEvent } from '../audit/publisher'

export type PolicyContext = z.infer<typeof ZPolicyContext>
export type PolicyDecision = z.infer<typeof ZPolicyDecision>

interface PolicyResult {
  effect: 'allow' | 'distill' | 'deny'
  reason?: string
  mask?: string[]
  replace?: Record<string, string>
  require?: Record<string, string>
  policyId?: string
}

export async function evaluate(input: PolicyContext): Promise<PolicyDecision> {
  const startTime = performance.now()

  // Run all policies
  const results = await opaRuntime.evaluateAll(input)

  // Combine: deny > distill > allow (§12 of 13-governance-policy.md)
  let finalEffect: 'allow' | 'distill' | 'deny' = 'allow'
  const reasons: string[] = []
  const masks: string[] = []
  const replaces: Record<string, string> = {}
  const requires: Record<string, string> = {}
  let policyIds: string[] = []

  for (const [policyName, raw] of results) {
    const parsed = raw as Array<{ result: PolicyResult }>
    if (!Array.isArray(parsed) || parsed.length === 0) continue

    const result = parsed[0].result

    if (result.effect === 'deny') {
      finalEffect = 'deny'
      reasons.push(result.reason ?? `${policyName}:deny`)
      if (result.policyId) policyIds.push(result.policyId)
    } else if (result.effect === 'distill' && finalEffect !== 'deny') {
      finalEffect = 'distill'
      reasons.push(result.reason ?? `${policyName}:distill`)
      if (result.mask) masks.push(...result.mask)
      if (result.replace) Object.assign(replaces, result.replace)
      if (result.require) Object.assign(requires, result.require)
      if (result.policyId) policyIds.push(result.policyId)
    }
  }

  const latencyMs = performance.now() - startTime

  const decision: PolicyDecision = {
    effect: finalEffect,
    reason: reasons.join('; ') || undefined,
    mask: masks.length > 0 ? [...new Set(masks)] : undefined,
    replace: Object.keys(replaces).length > 0 ? replaces : undefined,
    require: Object.keys(requires).length > 0 ? requires : undefined,
    policyId: policyIds[0],
    policyVersion: 1,
    latencyMs: Math.round(latencyMs),
  }

  // Audit
  await publishEvent('app.daria.governance.policy-evaluated.v1', {
    userId: input.user.id,
    action: input.action,
    region: input.region.code,
    decision: decision.effect,
    reason: decision.reason,
    distillMask: decision.mask,
    policyId: decision.policyId,
    policyVersion: decision.policyVersion,
    contextHash: hashContext(input),
    latencyMs: decision.latencyMs,
    evaluatedAt: new Date().toISOString(),
  })

  return decision
}

function hashContext(input: unknown): string {
  // Simple hash for audit traceability
  return require('crypto').createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 16)
}

// Batch evaluate — для feed filtering
export async function evaluateBatch(
  actions: PolicyContext[],
): Promise<PolicyDecision[]> {
  return Promise.all(actions.map(a => evaluate(a)))
}
```

## Шаг 7: Hot-reload loader

`src/loader/hot-reload.ts`:

```typescript
import chokidar from 'chokidar'
import * as fs from 'fs/promises'
import * as path from 'path'
import yaml from 'js-yaml'
import { compileRegoToWasm } from '../engine/compiler'
import { opaRuntime } from '../engine/opa-runtime'

const POLICIES_DIR = process.env.POLICIES_DIR ?? 'platform/policies'
const LAW_PROFILES_DIR = process.env.LAW_PROFILES_DIR ?? 'platform/law-profiles'
const WASM_OUTPUT_DIR = '/tmp/policy-wasm'

let lawProfiles = new Map<string, any>()

export async function loadAllPolicies() {
  await fs.mkdir(WASM_OUTPUT_DIR, { recursive: true })

  console.log('Compiling policies...')
  const policies = await compileRegoToWasm(POLICIES_DIR, WASM_OUTPUT_DIR)
  
  // Load into runtime
  opaRuntime.clear()
  for (const [name, wasm] of policies) {
    await opaRuntime.loadPolicy(name, wasm)
    console.log(`✓ Loaded policy: ${name}`)
  }
  
  // Load law-profiles
  await loadLawProfiles()
  
  console.log(`Loaded ${policies.size} policies, ${lawProfiles.size} law-profiles`)
}

export async function loadLawProfiles() {
  lawProfiles.clear()
  const files = (await fs.readdir(LAW_PROFILES_DIR)).filter(f => f.endsWith('.yaml'))
  
  for (const file of files) {
    const content = await fs.readFile(path.join(LAW_PROFILES_DIR, file), 'utf-8')
    const profile = yaml.load(content) as any
    const regionCode = path.basename(file, '.yaml')
    lawProfiles.set(regionCode, profile)
  }
}

export function getLawProfile(region: string): any {
  return lawProfiles.get(region) ?? lawProfiles.get('DEFAULT')
}

export function startWatcher() {
  if (process.env.NODE_ENV === 'production') {
    // In prod — reload только по Argo CD deploy, не watch files
    return
  }

  chokidar.watch([POLICIES_DIR, LAW_PROFILES_DIR], {
    persistent: true,
    ignoreInitial: true,
  }).on('all', async (event, filePath) => {
    console.log(`Policy files changed: ${event} ${filePath}. Reloading...`)
    try {
      await loadAllPolicies()
      console.log('Policies reloaded successfully')
    } catch (err) {
      console.error('Policy reload failed:', err)
    }
  })
}
```

## Шаг 8: HTTP handlers (Nitro)

`src/handlers/evaluate.ts`:

```typescript
import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { evaluate } from '../engine/evaluator'
import { getLawProfile } from '../loader/hot-reload'
import { ZPolicyContext } from '@daria/contracts-governance'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // Validate
  const parsed = ZPolicyContext.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'INVALID_CONTEXT',
      data: parsed.error.flatten(),
    })
  }

  // Enrich with law-profile
  const region = getLawProfile(parsed.data.region.code)
  const enrichedInput = {
    ...parsed.data,
    region: {
      ...parsed.data.region,
      lawProfile: region,
    },
  }

  const decision = await evaluate(enrichedInput)
  return decision
})
```

`src/handlers/batch-evaluate.ts`:

```typescript
import { defineEventHandler, readBody } from 'h3'
import { evaluateBatch } from '../engine/evaluator'

export default defineEventHandler(async (event) => {
  const { actions } = await readBody(event)
  const results = await evaluateBatch(actions)
  return { decisions: results }
})
```

## Шаг 9: Main server

`src/index.ts`:

```typescript
import { createApp, toNodeListener, defineEventHandler } from 'h3'
import { createServer } from 'http'
import { loadAllPolicies, startWatcher } from './loader/hot-reload'
import evaluateHandler from './handlers/evaluate'
import batchEvaluateHandler from './handlers/batch-evaluate'
import { initTracing } from './tracing'

async function main() {
  // Init tracing
  await initTracing()

  // Load policies
  await loadAllPolicies()
  startWatcher()

  // HTTP server
  const app = createApp()
  
  app.use('/evaluate', evaluateHandler)
  app.use('/evaluate/batch', batchEvaluateHandler)
  
  app.use('/health/live', defineEventHandler(() => ({ status: 'ok' })))
  app.use('/health/ready', defineEventHandler(() => ({ 
    status: 'ready',
    policies: Array.from(opaRuntime.policies.keys()).length,
  })))

  const port = parseInt(process.env.PORT ?? '8080')
  const server = createServer(toNodeListener(app))
  server.listen(port, () => {
    console.log(`Policy engine listening on :${port}`)
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

## Шаг 10: Performance considerations

**Cache read-only decisions:**

```typescript
// src/engine/cache.ts
import LRU from 'lru-cache'

const cache = new LRU<string, PolicyDecision>({
  max: 10000,
  ttl: 60 * 1000,  // 1 min
})

export function getCachedDecision(cacheKey: string): PolicyDecision | undefined {
  return cache.get(cacheKey)
}

export function cacheDecision(cacheKey: string, decision: PolicyDecision) {
  cache.set(cacheKey, decision)
}

export function buildCacheKey(input: PolicyContext): string {
  // Read-only actions — cacheable
  if (!['view', 'list', 'search'].includes(input.action.type.split('.')[1])) return ''
  
  // Key only on inputs that matter for read
  return JSON.stringify({
    userId: input.user.id,
    kyc: input.user.kyc.level,
    region: input.region.code,
    action: input.action.type,
    resource: input.action.resource,
  })
}
```

Usage in evaluator:

```typescript
export async function evaluate(input: PolicyContext): Promise<PolicyDecision> {
  const cacheKey = buildCacheKey(input)
  if (cacheKey) {
    const cached = getCachedDecision(cacheKey)
    if (cached) return cached
  }
  
  const decision = await evaluateInternal(input)
  
  if (cacheKey) cacheDecision(cacheKey, decision)
  return decision
}
```

## Шаг 11: Tests

```typescript
// tests/evaluate.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { loadAllPolicies } from '../src/loader/hot-reload'
import { evaluate } from '../src/engine/evaluator'

beforeAll(async () => {
  process.env.POLICIES_DIR = 'test-fixtures/policies'
  process.env.LAW_PROFILES_DIR = 'test-fixtures/law-profiles'
  await loadAllPolicies()
})

describe('evaluate', () => {
  it('allows by default', async () => {
    const result = await evaluate({
      user: { id: 'u_1', age: 30, roles: [], kyc: { level: 2 } },
      region: { code: 'EU', tz: 'Europe/Berlin', language: 'en' },
      action: { type: 'card-type.access', resource: 'travel' },
      time: { utc: new Date().toISOString() },
    })
    expect(result.effect).toBe('allow')
  })

  it('denies dating для under-18', async () => {
    const result = await evaluate({
      user: { id: 'u_minor', age: 15, roles: [], kyc: { level: 0 } },
      region: { code: 'US', tz: 'America/NY', language: 'en' },
      action: { type: 'card-type.access', resource: 'dating' },
      time: { utc: new Date().toISOString() },
    })
    expect(result.effect).toBe('deny')
    expect(result.reason).toMatch(/UNDERAGE/)
  })

  it('distill алкоголь в dry hours', async () => {
    const result = await evaluate({
      user: { id: 'u_1', age: 30, roles: [], kyc: { level: 1 } },
      region: { code: 'RU', tz: 'Europe/Moscow', language: 'ru' },
      action: { type: 'content.view' },
      entity: { kind: 'product', id: 'beer-1', tags: ['alcohol'] },
      time: { utc: new Date('2026-05-10T23:00:00Z').toISOString(), hour: 23 },
    })
    expect(result.effect).toBe('distill')
    expect(result.mask).toContain('alcohol-items')
  })

  it('latency < 10ms p99', async () => {
    const samples: number[] = []
    for (let i = 0; i < 1000; i++) {
      const start = performance.now()
      await evaluate({ /* ... */ })
      samples.push(performance.now() - start)
    }
    samples.sort((a, b) => a - b)
    const p99 = samples[Math.floor(samples.length * 0.99)]
    expect(p99).toBeLessThan(10)
  })
})
```

## Dockerfile

```dockerfile
FROM golang:1.22-alpine AS opa-builder
RUN apk add --no-cache curl
RUN curl -L -o /usr/local/bin/opa https://openpolicyagent.org/downloads/v0.69.0/opa_linux_amd64_static \
  && chmod +x /usr/local/bin/opa

FROM node:20-alpine

# Copy OPA binary
COPY --from=opa-builder /usr/local/bin/opa /usr/local/bin/opa

WORKDIR /app
RUN npm install -g pnpm@9
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY . .

RUN chown -R node:node /app
USER node

EXPOSE 8080
CMD ["node", "src/index.js"]
```

## Deployment

- `platform/policies/` mounted volume или баked-in image.
- `platform/law-profiles/` same.
- Hot-reload: updates via Argo CD deploys — nr restart required.
- Prometheus metrics на `/metrics`: `policy_evaluate_duration_seconds`, `policy_decisions_total{effect}`.
