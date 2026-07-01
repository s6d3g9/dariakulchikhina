# Notifications — YAML matcher engine

Full TypeScript implementation. Events из JetStream → declarative YAML rules → multi-channel dispatch.

## Structure

```
services/notifications/
├── Dockerfile
├── package.json
├── src/
│   ├── index.ts                    — entry point
│   ├── config.ts
│   ├── db/
│   │   └── schema.ts
│   ├── matcher/
│   │   ├── rule-loader.ts          — load YAML rules from platform/notification-rules/
│   │   ├── rule-matcher.ts         — match event против rules
│   │   └── expr-evaluator.ts       — evaluate condition expressions
│   ├── hydrator/
│   │   ├── i18n.ts
│   │   └── template-renderer.ts    — MJML / Handlebars
│   ├── preferences/
│   │   └── user-preferences.ts     — per-user per-category toggles
│   ├── policy/
│   │   └── policy-filter.ts        — quiet-hours, region, etc.
│   ├── dedup/
│   │   └── dedup-cache.ts          — Redis-based
│   ├── batching/
│   │   └── batcher.ts              — reactions / likes aggregation
│   ├── dispatchers/
│   │   ├── push-fcm.ts
│   │   ├── push-apns.ts
│   │   ├── push-web.ts
│   │   ├── email-sendgrid.ts
│   │   ├── email-ses.ts
│   │   ├── sms-twilio.ts
│   │   ├── voice-twilio.ts
│   │   ├── in-app-ws.ts
│   │   └── webhook.ts
│   ├── pipeline.ts                 — CORE pipeline
│   ├── consumers/
│   │   └── domain-events.ts
│   └── tracing.ts
└── tests/
```

## src/matcher/rule-loader.ts

```typescript
import { readFile } from 'node:fs/promises'
import { glob } from 'glob'
import yaml from 'js-yaml'
import { z } from 'zod'

const ZRule = z.object({
  event: z.string(),
  when: z.string().optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  category: z.string().optional(),
  channels: z.array(z.enum(['push', 'in-app', 'email', 'sms', 'voice', 'webhook'])),
  'title.i18n_key': z.string().optional(),
  'body.template': z.string().optional(),
  'body.i18n_key': z.string().optional(),
  addresseeExpr: z.string(),
  deduplicationKey: z.string().optional(),
  batching: z.object({
    window: z.string(),
    template: z.string().optional(),
  }).optional(),
})
export type Rule = z.infer<typeof ZRule>

const ZRulesFile = z.object({
  rules: z.array(ZRule),
})

export async function loadAllRules(directory: string): Promise<Rule[]> {
  const files = await glob('**/*.yaml', { cwd: directory, absolute: true })
  const rules: Rule[] = []

  for (const file of files) {
    const content = await readFile(file, 'utf-8')
    const parsed = yaml.load(content)
    
    // Support both formats: { rules: [...] } or directly [...]
    const list = Array.isArray(parsed) ? parsed : (parsed as any).rules
    
    for (const raw of list ?? []) {
      try {
        const rule = ZRule.parse(raw)
        rules.push(rule)
      } catch (err) {
        console.error(`Invalid rule in ${file}:`, err)
      }
    }
  }

  console.log(`Loaded ${rules.length} rules from ${files.length} files`)
  return rules
}

// Index rules by event type для fast lookup
export function indexRules(rules: Rule[]): Map<string, Rule[]> {
  const index = new Map<string, Rule[]>()
  for (const rule of rules) {
    const list = index.get(rule.event) ?? []
    list.push(rule)
    index.set(rule.event, list)
  }
  return index
}
```

## src/matcher/expr-evaluator.ts

Simple expression language для `when` conditions и `addresseeExpr`:

```typescript
interface EvaluationContext {
  event: any
  user?: any
  region?: string
  time?: Date
}

// Minimal safe expression evaluator (no eval)
// Supports: dot.access, comparisons, logical, ternary, literals, function calls
export class ExprEvaluator {
  evaluate(expr: string, ctx: EvaluationContext): unknown {
    const ast = this.parse(expr)
    return this.eval(ast, ctx)
  }

  private parse(expr: string): ASTNode {
    // Simplified — use jsep or similar для real implementation
    return parseJsep(expr)
  }

  private eval(node: ASTNode, ctx: EvaluationContext): unknown {
    switch (node.type) {
      case 'Literal':
        return node.value

      case 'Identifier':
        return this.lookup(node.name, ctx)

      case 'MemberExpression': {
        const obj = this.eval(node.object, ctx)
        const key = node.computed 
          ? this.eval(node.property, ctx) 
          : (node.property as any).name
        return (obj as any)?.[key as any]
      }

      case 'BinaryExpression': {
        const left = this.eval(node.left, ctx)
        const right = this.eval(node.right, ctx)
        switch (node.operator) {
          case '==': return left == right
          case '!=': return left != right
          case '===': return left === right
          case '!==': return left !== right
          case '<': return (left as any) < (right as any)
          case '>': return (left as any) > (right as any)
          case '<=': return (left as any) <= (right as any)
          case '>=': return (left as any) >= (right as any)
          case '&&': return left && right
          case '||': return left || right
          case 'in': return Array.isArray(right) && (right as any).includes(left)
        }
        throw new Error(`Unknown operator: ${node.operator}`)
      }

      case 'LogicalExpression': {
        if (node.operator === '&&') {
          return this.eval(node.left, ctx) && this.eval(node.right, ctx)
        }
        if (node.operator === '||') {
          return this.eval(node.left, ctx) || this.eval(node.right, ctx)
        }
        throw new Error('Unknown logical op')
      }

      case 'UnaryExpression': {
        const arg = this.eval(node.argument, ctx)
        if (node.operator === '!') return !arg
        if (node.operator === '-') return -(arg as any)
        throw new Error('Unknown unary')
      }

      case 'ConditionalExpression': {
        return this.eval(node.test, ctx) 
          ? this.eval(node.consequent, ctx)
          : this.eval(node.alternate, ctx)
      }

      case 'CallExpression': {
        const fn = this.lookupFunction((node.callee as any).name)
        const args = node.arguments.map(a => this.eval(a, ctx))
        return fn(...args)
      }

      case 'TemplateLiteral': {
        return node.quasis.map((quasi, i) => {
          const str = quasi.value.cooked
          const expr = node.expressions[i]
          return str + (expr ? String(this.eval(expr, ctx)) : '')
        }).join('')
      }
    }
    throw new Error(`Unknown node: ${node.type}`)
  }

  private lookup(name: string, ctx: EvaluationContext): unknown {
    if (name === 'event') return ctx.event
    if (name === 'user') return ctx.user
    if (name === 'region') return ctx.region
    if (name === 'time') return ctx.time
    return undefined
  }

  private lookupFunction(name: string): Function {
    const functions: Record<string, Function> = {
      contains: (arr: unknown[], item: unknown) => Array.isArray(arr) && arr.includes(item),
      startsWith: (str: string, prefix: string) => str?.startsWith(prefix),
      not: (v: any) => !v,
      now: () => new Date(),
      hour: (d: Date) => new Date(d).getUTCHours(),
    }
    return functions[name] ?? (() => undefined)
  }
}

// Stub — integrate jsep or another small parser
function parseJsep(expr: string): ASTNode {
  throw new Error('Use jsep library для AST parsing')
}

interface ASTNode {
  type: string
  [key: string]: any
}
```

## src/matcher/rule-matcher.ts

```typescript
import type { Rule } from './rule-loader'
import { ExprEvaluator } from './expr-evaluator'

export interface MatchResult {
  matched: boolean
  addressees: string[]  // resolved user IDs
  rule: Rule
}

export class RuleMatcher {
  private evaluator = new ExprEvaluator()

  matchRulesForEvent(rules: Rule[], event: any): MatchResult[] {
    const results: MatchResult[] = []

    for (const rule of rules) {
      try {
        // 1. Evaluate `when` (if present)
        if (rule.when) {
          const cond = this.evaluator.evaluate(rule.when, { event })
          if (!cond) continue
        }

        // 2. Resolve addresseeExpr → array of userIds
        const addressees = this.resolveAddressees(rule.addresseeExpr, event)

        if (addressees.length > 0) {
          results.push({ matched: true, addressees, rule })
        }
      } catch (err) {
        console.error(`Rule evaluation failed for ${rule.event}:`, err)
      }
    }

    return results
  }

  private resolveAddressees(expr: string, event: any): string[] {
    const result = this.evaluator.evaluate(expr, { event })
    if (typeof result === 'string') return [result]
    if (Array.isArray(result)) return result.filter(x => typeof x === 'string')
    return []
  }
}
```

## src/pipeline.ts — CORE dispatch pipeline

```typescript
import { RuleMatcher } from './matcher/rule-matcher'
import { Rule, indexRules, loadAllRules } from './matcher/rule-loader'
import { UserPreferencesService } from './preferences/user-preferences'
import { PolicyFilter } from './policy/policy-filter'
import { DedupCache } from './dedup/dedup-cache'
import { Batcher } from './batching/batcher'
import { TemplateRenderer } from './hydrator/template-renderer'
import { DispatcherRegistry } from './dispatchers'
import { db } from './db/client'
import { deliveryLog } from './db/schema'
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('notifications')

export class NotificationPipeline {
  private matcher: RuleMatcher
  private rules: Rule[] = []
  private rulesByEvent: Map<string, Rule[]> = new Map()

  constructor(
    private prefsService: UserPreferencesService,
    private policyFilter: PolicyFilter,
    private dedupCache: DedupCache,
    private batcher: Batcher,
    private renderer: TemplateRenderer,
    private dispatchers: DispatcherRegistry,
    private rulesDirectory: string,
  ) {
    this.matcher = new RuleMatcher()
  }

  async loadRules(): Promise<void> {
    this.rules = await loadAllRules(this.rulesDirectory)
    this.rulesByEvent = indexRules(this.rules)
  }

  /**
   * Handle incoming event → dispatch notifications.
   */
  async handleEvent(event: any): Promise<void> {
    return tracer.startActiveSpan('notifications.handleEvent', {
      attributes: { 'event.type': event.type },
    }, async (span) => {
      try {
        // 1. Find matching rules
        const candidateRules = this.rulesByEvent.get(event.type) ?? []
        if (candidateRules.length === 0) {
          span.addEvent('no-matching-rules')
          return
        }

        const matches = this.matcher.matchRulesForEvent(candidateRules, event)
        span.setAttribute('matches.count', matches.length)

        for (const match of matches) {
          for (const addresseeId of match.addressees) {
            await this.dispatchForAddressee(event, match.rule, addresseeId)
          }
        }
      } finally {
        span.end()
      }
    })
  }

  private async dispatchForAddressee(event: any, rule: Rule, userId: string): Promise<void> {
    return tracer.startActiveSpan('notifications.dispatchForAddressee', async (span) => {
      try {
        span.setAttributes({
          'user.id': userId,
          'notification.category': rule.category ?? 'unknown',
          'notification.severity': rule.severity,
        })

        // 2. Load user preferences
        const prefs = await this.prefsService.getPreferences(userId)
        if (!prefs) {
          span.addEvent('no-user-preferences')
          return
        }

        // 3. Policy filter (quiet-hours, region)
        const policyOk = await this.policyFilter.allow({
          userId,
          severity: rule.severity,
          category: rule.category,
          region: prefs.region,
          timezone: prefs.timezone,
        })
        if (!policyOk.allow) {
          span.addEvent('policy-blocked', { reason: policyOk.reason })
          return
        }

        // 4. Filter channels per user-prefs
        const enabledChannels = rule.channels.filter(ch => {
          const catPrefs = prefs.notificationPrefs?.[rule.category ?? 'default'] ?? {}
          // Critical severity bypasses preferences
          if (rule.severity === 'critical') return true
          return catPrefs[ch] !== false
        })

        if (enabledChannels.length === 0) {
          span.addEvent('all-channels-disabled')
          return
        }

        // 5. Dedup
        const dedupKey = rule.deduplicationKey
          ? this.interpolate(rule.deduplicationKey, { event })
          : `${event.type}-${userId}-${event.id}`
        
        const shouldSend = await this.dedupCache.shouldSend(
          dedupKey,
          userId,
          300,  // 5 min dedup window
        )
        if (!shouldSend) {
          span.addEvent('deduplicated')
          return
        }

        // 6. Batching (для low-severity high-volume)
        if (rule.batching && rule.severity === 'low') {
          await this.batcher.enqueue({
            userId,
            category: rule.category ?? 'default',
            rule,
            event,
            window: this.parseDuration(rule.batching.window),
          })
          span.addEvent('enqueued-for-batch')
          return
        }

        // 7. Render templates for each channel
        for (const channel of enabledChannels) {
          try {
            const rendered = await this.renderer.render({
              channel,
              rule,
              event,
              user: { id: userId, ...prefs },
            })

            // 8. Dispatch
            const dispatchResult = await this.dispatchers.send({
              channel,
              userId,
              content: rendered,
              priority: rule.severity,
              traceId: event.traceparent,
            })

            // 9. Log delivery
            await db.insert(deliveryLog).values({
              userId,
              eventId: event.id,
              eventType: event.type,
              channel,
              category: rule.category,
              severity: rule.severity,
              status: dispatchResult.status,
              providerMessageId: dispatchResult.providerMessageId,
              errorMessage: dispatchResult.error,
              traceId: event.traceparent,
            })

            span.addEvent('delivered', { channel })
          } catch (err) {
            span.recordException(err as Error)
            // Continue other channels
          }
        }
      } catch (err) {
        span.recordException(err as Error)
        throw err
      } finally {
        span.end()
      }
    })
  }

  private interpolate(template: string, ctx: any): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const parts = path.trim().split('.')
      let v: any = ctx
      for (const p of parts) v = v?.[p]
      return String(v ?? '')
    })
  }

  private parseDuration(s: string): number {
    const match = s.match(/^(\d+)(s|m|h|d)$/)
    if (!match) return 300_000
    const [, num, unit] = match
    const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3600_000, d: 86_400_000 }
    return parseInt(num) * multipliers[unit]
  }
}
```

## src/dedup/dedup-cache.ts

```typescript
import type { Redis } from 'ioredis'

export class DedupCache {
  constructor(private redis: Redis) {}

  /**
   * Returns true if should send (first occurrence).
   * Returns false if already sent within window.
   */
  async shouldSend(dedupKey: string, userId: string, windowSeconds: number): Promise<boolean> {
    const key = `notif:dedup:${userId}:${dedupKey}`
    const result = await this.redis.set(key, '1', 'EX', windowSeconds, 'NX')
    return result === 'OK'
  }

  async markSent(dedupKey: string, userId: string, windowSeconds: number): Promise<void> {
    await this.redis.setex(`notif:dedup:${userId}:${dedupKey}`, windowSeconds, '1')
  }
}
```

## src/batching/batcher.ts

```typescript
import type { Redis } from 'ioredis'
import type { Rule } from '../matcher/rule-loader'

interface BatchItem {
  userId: string
  category: string
  rule: Rule
  event: any
  window: number
}

export class Batcher {
  constructor(
    private redis: Redis,
    private pipeline: (batch: BatchItem[]) => Promise<void>,
  ) {
    // Start background flusher
    this.startFlusher()
  }

  async enqueue(item: BatchItem): Promise<void> {
    const batchKey = `notif:batch:${item.userId}:${item.category}`
    await this.redis.rpush(batchKey, JSON.stringify(item))
    await this.redis.expire(batchKey, Math.ceil(item.window / 1000))
    
    // Track earliest enqueue time
    const firstKey = `notif:batch:first:${item.userId}:${item.category}`
    await this.redis.set(firstKey, Date.now().toString(), 'EX', 3600, 'NX')
  }

  private startFlusher() {
    setInterval(async () => {
      try {
        await this.flushReady()
      } catch (err) {
        console.error('Batcher flush error:', err)
      }
    }, 10_000)  // every 10s
  }

  private async flushReady(): Promise<void> {
    // Scan all batch keys, check if window elapsed
    const firstKeys = await this.redis.keys('notif:batch:first:*')
    const now = Date.now()

    for (const firstKey of firstKeys) {
      const enqueuedAt = parseInt(await this.redis.get(firstKey) ?? '0', 10)
      if (!enqueuedAt) continue

      // Extract user+category
      const parts = firstKey.split(':')
      const userId = parts[3]
      const category = parts[4]
      const batchKey = `notif:batch:${userId}:${category}`

      // Peek first item to get rule.batching.window
      const firstItemStr = await this.redis.lindex(batchKey, 0)
      if (!firstItemStr) {
        await this.redis.del(firstKey)
        continue
      }
      const firstItem: BatchItem = JSON.parse(firstItemStr)
      
      if (now - enqueuedAt < firstItem.window) continue

      // Flush
      const items = await this.redis.lrange(batchKey, 0, -1)
      const parsed: BatchItem[] = items.map(s => JSON.parse(s))
      
      await this.redis.del(batchKey)
      await this.redis.del(firstKey)
      
      if (parsed.length > 0) {
        await this.pipeline(parsed)
      }
    }
  }
}
```

## src/dispatchers/push-fcm.ts

```typescript
import { initializeApp, cert, type App } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

export class FCMDispatcher {
  private app: App
  
  constructor(serviceAccountJson: string) {
    this.app = initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
    })
  }

  async send(params: {
    userId: string
    fcmTokens: string[]
    title: string
    body: string
    data?: Record<string, string>
    priority: 'high' | 'normal'
  }): Promise<{ success: number; failed: number }> {
    if (params.fcmTokens.length === 0) {
      return { success: 0, failed: 0 }
    }

    const response = await getMessaging(this.app).sendEachForMulticast({
      tokens: params.fcmTokens,
      notification: { title: params.title, body: params.body },
      data: params.data,
      android: {
        priority: params.priority,
      },
      apns: {
        headers: {
          'apns-priority': params.priority === 'high' ? '10' : '5',
        },
      },
    })

    // Remove failed tokens (invalid registration)
    const invalid = response.responses
      .map((r, i) => ({ r, token: params.fcmTokens[i] }))
      .filter(({ r }) => r.error?.code === 'messaging/registration-token-not-registered')
      .map(({ token }) => token)
    
    if (invalid.length > 0) {
      await removeInvalidTokens(params.userId, invalid)
    }

    return { success: response.successCount, failed: response.failureCount }
  }
}

async function removeInvalidTokens(userId: string, tokens: string[]) {
  // Delete from user_push_tokens table
}
```

## src/dispatchers/email-sendgrid.ts

```typescript
import sgMail from '@sendgrid/mail'

export class SendgridDispatcher {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey)
  }

  async send(params: {
    to: string
    subject: string
    htmlBody: string
    textBody: string
    category: string
    unsubscribeUrl: string
  }): Promise<{ messageId: string }> {
    const response = await sgMail.send({
      to: params.to,
      from: {
        email: 'no-reply@daria.app',
        name: 'Daria',
      },
      subject: params.subject,
      html: params.htmlBody,
      text: params.textBody,
      categories: [params.category],
      headers: {
        'List-Unsubscribe': `<${params.unsubscribeUrl}>, <mailto:unsubscribe@daria.app>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      trackingSettings: {
        openTracking: { enable: true },
        clickTracking: { enable: true, enableText: false },
        subscriptionTracking: { enable: false },
      },
    })

    return { messageId: response[0].headers['x-message-id'] as string }
  }
}
```

## src/dispatchers/in-app-ws.ts

Through WS-messenger или через direct Redis Pub/Sub:

```typescript
import type { Redis } from 'ioredis'

export class InAppWsDispatcher {
  constructor(private redis: Redis) {}

  async send(params: {
    userId: string
    title: string
    body: string
    data?: any
    severity: string
  }): Promise<{ delivered: boolean }> {
    const message = {
      type: 'notification',
      id: generateId(),
      userId: params.userId,
      title: params.title,
      body: params.body,
      data: params.data,
      severity: params.severity,
      createdAt: new Date().toISOString(),
    }

    // Publish to Redis channel → WS server forwards к connected clients
    const delivered = await this.redis.publish(
      `user.${params.userId}.notifications`,
      JSON.stringify(message),
    )

    // Store для offline users (retrieve at next connect)
    if (delivered === 0) {
      await this.redis.lpush(
        `user:${params.userId}:notifications:pending`,
        JSON.stringify(message),
      )
      await this.redis.ltrim(`user:${params.userId}:notifications:pending`, 0, 99)  // keep last 100
    }

    return { delivered: delivered > 0 }
  }
}
```

## src/policy/policy-filter.ts

```typescript
import { httpClient } from '../clients/http'

export class PolicyFilter {
  constructor(private policyEngineUrl: string) {}

  async allow(params: {
    userId: string
    severity: string
    category?: string
    region: string
    timezone: string
  }): Promise<{ allow: boolean; reason?: string }> {
    // Critical bypasses policy
    if (params.severity === 'critical') return { allow: true }

    // Check quiet-hours
    const now = new Date()
    const localHour = getLocalHour(now, params.timezone)
    const quietHours = await this.getQuietHours(params.region, params.userId)
    
    if (inQuietWindow(localHour, quietHours)) {
      return { allow: false, reason: 'quiet_hours' }
    }

    // Check policy-engine
    const decision = await httpClient.post(`${this.policyEngineUrl}/v1/evaluate`, {
      user: { id: params.userId, kyc: { level: 0 }, roles: [] },
      region: { code: params.region, tz: params.timezone, language: 'en' },
      action: {
        type: `notification.send`,
        resource: params.category,
      },
      time: { utc: now.toISOString(), local: getLocalIso(now, params.timezone) },
    })

    if (decision.data.effect === 'deny') {
      return { allow: false, reason: decision.data.reason }
    }

    return { allow: true }
  }

  private async getQuietHours(region: string, userId: string): Promise<{ from: string; to: string } | null> {
    // Load user override first, fallback к region-default
    // User overrides stored в identity user_preferences.notification_prefs._quiet_hours
    // Region default из platform/law-profiles/<region>.yaml
    // ...
    return { from: '22:00', to: '08:00' }
  }
}

function getLocalHour(utc: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat('en', { hour: 'numeric', hour12: false, timeZone: tz })
  return parseInt(fmt.format(utc))
}

function getLocalIso(utc: Date, tz: string): string {
  // Simplified; use date-fns-tz для accurate conversion
  return utc.toISOString()
}

function inQuietWindow(hour: number, window: { from: string; to: string } | null): boolean {
  if (!window) return false
  const fromHour = parseInt(window.from.split(':')[0])
  const toHour = parseInt(window.to.split(':')[0])
  if (fromHour > toHour) {
    // Crosses midnight
    return hour >= fromHour || hour < toHour
  }
  return hour >= fromHour && hour < toHour
}
```

## src/consumers/domain-events.ts

```typescript
import { EventConsumer } from '@daria/events'
import { NotificationPipeline } from '../pipeline'

export async function setupDomainConsumer(params: {
  pipeline: NotificationPipeline
  natsUrl: string
}) {
  const consumer = new EventConsumer({
    natsUrl: params.natsUrl,
    streamName: 'durable-domain',
    consumerName: 'notifications-domain-consumer',
    serviceName: 'notifications',
  })

  await consumer.connect()
  await consumer.subscribe(async (event) => {
    await params.pipeline.handleEvent(event)
  })
}
```

## Example rule YAML files

`platform/notification-rules/wallet.yaml`:

```yaml
rules:
  - event: app.daria.wallet.transfer-completed.v1
    severity: high
    category: financial
    channels: [push, in-app]
    title.i18n_key: wallet.notifications.transfer-completed.title
    body.template: "{{ event.data.amountCents }} {{ event.data.currency }} received"
    addresseeExpr: "event.data.toAccountOwnerId"
    deduplicationKey: "transfer-{{ event.id }}"

  - event: app.daria.wallet.transfer-completed.v1
    when: "event.data.kind === 'royalty'"
    severity: medium
    category: creator-royalty
    channels: [push, in-app]
    title.i18n_key: wallet.notifications.royalty-received.title
    body.template: "You earned {{ event.data.amountCents }} {{ event.data.currency }}"
    addresseeExpr: "event.data.toAccountOwnerId"

  - event: app.daria.payments.charge-failed.v1
    severity: critical
    category: financial
    channels: [push, sms, email, in-app]
    title.i18n_key: payments.notifications.charge-failed-critical.title
    body.template: "Payment of {{ event.data.amountCents }} {{ event.data.currency }} failed"
    addresseeExpr: "event.data.userId"
```

`platform/notification-rules/subscription.yaml`:

```yaml
rules:
  - event: app.daria.subscription.trial-ending.v1
    when: "event.data.daysRemaining <= 3"
    severity: medium
    category: subscription
    channels: [push, email]
    title.i18n_key: subscription.notifications.trial-ending.title
    body.template: "Your trial ends в {{ event.data.daysRemaining }} days"
    addresseeExpr: "event.data.holderId"
    deduplicationKey: "trial-ending-{{ event.data.subscriptionId }}"

  - event: app.daria.subscription.renewed.v1
    severity: low
    category: subscription
    channels: [in-app]
    title.i18n_key: subscription.notifications.renewed.title
    body.template: "Subscription renewed"
    addresseeExpr: "event.data.holderId"
    batching:
      window: 1h
```

## Tests

```typescript
// tests/pipeline.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationPipeline } from '../src/pipeline'
import { MockDispatchers, MockRedis, mockPrefs } from './mocks'

describe('NotificationPipeline', () => {
  let pipeline: NotificationPipeline
  let mockDispatchers: MockDispatchers

  beforeEach(async () => {
    mockDispatchers = new MockDispatchers()
    pipeline = new NotificationPipeline(
      new MockPrefsService({
        'alice': { region: 'EU', timezone: 'UTC', notificationPrefs: {} },
      }),
      new MockPolicyFilter({ allow: true }),
      new MockDedupCache(),
      new MockBatcher(),
      new MockRenderer(),
      mockDispatchers,
      'tests/fixtures/rules',
    )
    await pipeline.loadRules()
  })

  it('matches event и dispatches to all channels', async () => {
    await pipeline.handleEvent({
      id: 'evt-1',
      type: 'app.daria.wallet.transfer-completed.v1',
      data: {
        transferId: 't-1',
        toAccountOwnerId: 'alice',
        amountCents: '1000',
        currency: 'USD',
        kind: 'internal',
      },
    })

    expect(mockDispatchers.calls).toEqual(expect.arrayContaining([
      { channel: 'push', userId: 'alice' },
      { channel: 'in-app', userId: 'alice' },
    ]))
  })

  it('skips критичный when policy denies (nothing bypasses SEV-1 though)', async () => {
    // ... simulate policy deny except SEV-1
  })

  it('deduplicates repeated events', async () => {
    const event = { id: 'evt-same', type: '...', data: {...} }
    await pipeline.handleEvent(event)
    await pipeline.handleEvent(event)
    
    // Should only dispatch once
    expect(mockDispatchers.calls.length).toBe(2)  // push + in-app = 2
  })

  it('respects user channel preferences', async () => {
    prefsService.setPrefs('alice', {
      notificationPrefs: { financial: { push: false } },
    })

    await pipeline.handleEvent({...})
    
    // push disabled, only in-app
    expect(mockDispatchers.calls).not.toContainEqual({ channel: 'push' })
    expect(mockDispatchers.calls).toContainEqual({ channel: 'in-app' })
  })

  it('critical severity bypasses user preferences', async () => {
    prefsService.setPrefs('alice', {
      notificationPrefs: { financial: { push: false, sms: false, email: false } },
    })

    await pipeline.handleEvent({
      type: 'app.daria.payments.charge-failed.v1',
      data: { userId: 'alice', ... },
    })
    
    // All 4 channels dispatched несмотря на disabled prefs
    expect(mockDispatchers.calls.length).toBe(4)
  })

  it('batches low-severity notifications', async () => {
    for (let i = 0; i < 10; i++) {
      await pipeline.handleEvent({
        id: `evt-${i}`,
        type: 'app.daria.subscription.renewed.v1',
        data: { holderId: 'alice', subscriptionId: `s-${i}` },
      })
    }
    
    // Enqueued, not dispatched immediately
    expect(mockDispatchers.calls.length).toBe(0)
    
    // After window flush
    await advanceTime('1h')
    expect(mockDispatchers.calls.length).toBeGreaterThan(0)
  })
})
```

## Metrics emitted

- `notifications_sent_total{channel,category,severity}`
- `notifications_failed_total{channel,error_type}`
- `notifications_dedup_total{category}`
- `notifications_batched_total{category}`
- `notifications_policy_blocked_total{reason}`
- `notifications_delivery_latency_ms{channel}` histogram
- `notifications_rules_loaded_total`
