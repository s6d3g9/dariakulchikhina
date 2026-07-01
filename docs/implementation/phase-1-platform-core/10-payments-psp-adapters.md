# Phase 1 / Week 3 / Tuesday: Payments PSP adapters

Цель: PSP-aggregator service с двумя adapters (Stripe + ЮKassa) + unified interface + webhook handling.

## Шаг 1: Scaffold

```bash
pnpm create service payments --layer 2 --runtime ts
```

Schema (уже defined в `docs/implementation/schemas/payments-db.md`) — apply:

```bash
cd services/payments
pnpm db:generate
DATABASE_URL=postgres://daria:daria@localhost:5432/platform_db pnpm db:migrate
```

## Шаг 2: Unified PSP adapter interface

`services/payments/src/adapters/types.ts`:

```typescript
export interface PspAdapter {
  readonly name: 'stripe' | 'yookassa' | 'cloudpayments' | 'crypto-direct'

  createCharge(params: ChargeParams): Promise<ChargeResult>
  confirmCharge(pspChargeId: string, threeDsResult?: string): Promise<ChargeResult>
  refundCharge(params: RefundParams): Promise<RefundResult>
  
  verifyWebhookSignature(rawBody: string, signature: string): boolean
  parseWebhookEvent(rawBody: string): PspWebhookEvent
  
  listChargesForDate(date: string): Promise<ExternalCharge[]>
  
  tokenizePaymentMethod(params: TokenizeParams): Promise<TokenizeResult>
  deletePaymentMethod(pspToken: string): Promise<void>
}

export interface ChargeParams {
  amountCents: number
  currency: string
  customerToken?: string
  paymentMethodToken?: string
  description?: string
  metadata: Record<string, string>
  idempotencyKey: string
}

export interface ChargeResult {
  id: string
  status: 'succeeded' | 'requires_action' | 'failed' | 'pending'
  threeDsUrl?: string
  failureCode?: string
  failureMessage?: string
  pspFeeCents?: number
}

export interface RefundParams {
  pspChargeId: string
  amountCents: number
  reason: string
  idempotencyKey: string
}

export interface RefundResult {
  id: string
  status: 'succeeded' | 'failed' | 'pending'
  failureMessage?: string
}

export interface TokenizeParams {
  kind: 'card' | 'sepa-dd' | 'sbp' | 'apple-pay' | 'google-pay'
  cardNonce?: string  // from client-side tokenization SDK
  customerInfo?: { email: string; name?: string }
}

export interface TokenizeResult {
  pspToken: string
  pspCustomerId?: string
  displayLast4?: string
  displayBrand?: string
  displayExpMonth?: number
  displayExpYear?: number
  billingCountry?: string
  fingerprint?: string
}

export interface PspWebhookEvent {
  id: string
  type: string
  object: any
}

export interface ExternalCharge {
  id: string
  amountCents: number
  currency: string
  status: string
  createdAt: Date
  refunded: boolean
  refundedAmountCents: number
  metadata: Record<string, string>
}
```

## Шаг 3: Stripe adapter

`services/payments/src/adapters/stripe.ts`:

```typescript
import Stripe from 'stripe'
import type { PspAdapter, ChargeParams, ChargeResult, RefundParams, RefundResult, PspWebhookEvent } from './types'

export class StripeAdapter implements PspAdapter {
  readonly name = 'stripe' as const
  private stripe: Stripe

  constructor(
    private config: {
      secretKey: string
      webhookSecret: string
    },
  ) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2024-06-20',
      typescript: true,
    })
  }

  async createCharge(params: ChargeParams): Promise<ChargeResult> {
    try {
      const intent = await this.stripe.paymentIntents.create(
        {
          amount: params.amountCents,
          currency: params.currency.toLowerCase(),
          customer: params.customerToken,
          payment_method: params.paymentMethodToken,
          confirm: true,
          description: params.description,
          metadata: params.metadata,
          automatic_payment_methods: { enabled: true, allow_redirects: 'always' },
        },
        { idempotencyKey: params.idempotencyKey },
      )

      return this.mapIntent(intent)
    } catch (err: any) {
      if (err.type === 'StripeCardError') {
        return {
          id: err.payment_intent?.id ?? '',
          status: 'failed',
          failureCode: err.code,
          failureMessage: err.message,
        }
      }
      throw err
    }
  }

  async confirmCharge(pspChargeId: string, threeDsResult?: string): Promise<ChargeResult> {
    const intent = await this.stripe.paymentIntents.retrieve(pspChargeId)
    
    if (intent.status === 'requires_confirmation') {
      const confirmed = await this.stripe.paymentIntents.confirm(pspChargeId)
      return this.mapIntent(confirmed)
    }
    
    return this.mapIntent(intent)
  }

  async refundCharge(params: RefundParams): Promise<RefundResult> {
    try {
      const refund = await this.stripe.refunds.create(
        {
          payment_intent: params.pspChargeId,
          amount: params.amountCents,
          reason: this.mapRefundReason(params.reason),
        },
        { idempotencyKey: params.idempotencyKey },
      )

      return {
        id: refund.id,
        status: refund.status === 'succeeded' ? 'succeeded' 
              : refund.status === 'pending' ? 'pending'
              : 'failed',
      }
    } catch (err: any) {
      return {
        id: '',
        status: 'failed',
        failureMessage: err.message,
      }
    }
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    try {
      this.stripe.webhooks.constructEvent(rawBody, signature, this.config.webhookSecret)
      return true
    } catch {
      return false
    }
  }

  parseWebhookEvent(rawBody: string): PspWebhookEvent {
    const event = JSON.parse(rawBody) as Stripe.Event
    return {
      id: event.id,
      type: event.type,
      object: event.data.object,
    }
  }

  async listChargesForDate(date: string): Promise<ExternalCharge[]> {
    const start = Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000)
    const end = Math.floor(new Date(date + 'T23:59:59Z').getTime() / 1000)

    const result: ExternalCharge[] = []
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const page = await this.stripe.charges.list({
        created: { gte: start, lte: end },
        limit: 100,
        starting_after: startingAfter,
      })

      for (const c of page.data) {
        result.push({
          id: c.id,
          amountCents: c.amount,
          currency: c.currency.toUpperCase(),
          status: c.status,
          createdAt: new Date(c.created * 1000),
          refunded: c.refunded,
          refundedAmountCents: c.amount_refunded,
          metadata: c.metadata as Record<string, string>,
        })
      }

      hasMore = page.has_more
      startingAfter = page.data[page.data.length - 1]?.id
    }

    return result
  }

  async tokenizePaymentMethod(params: TokenizeParams): Promise<TokenizeResult> {
    // Stripe — client-side tokenization через Stripe Elements
    // Backend receives pre-tokenized payment-method ID и validates
    const pm = await this.stripe.paymentMethods.retrieve(params.cardNonce!)
    
    // Attach к customer
    let customerId: string | undefined
    if (params.customerInfo?.email) {
      const customer = await this.stripe.customers.create({
        email: params.customerInfo.email,
        name: params.customerInfo.name,
      })
      customerId = customer.id
      await this.stripe.paymentMethods.attach(pm.id, { customer: customer.id })
    }

    return {
      pspToken: pm.id,
      pspCustomerId: customerId,
      displayLast4: pm.card?.last4,
      displayBrand: pm.card?.brand,
      displayExpMonth: pm.card?.exp_month,
      displayExpYear: pm.card?.exp_year,
      billingCountry: pm.billing_details?.address?.country ?? undefined,
      fingerprint: pm.card?.fingerprint,
    }
  }

  async deletePaymentMethod(pspToken: string): Promise<void> {
    await this.stripe.paymentMethods.detach(pspToken)
  }

  private mapIntent(intent: Stripe.PaymentIntent): ChargeResult {
    const status: ChargeResult['status'] =
      intent.status === 'succeeded' ? 'succeeded'
      : intent.status === 'requires_action' ? 'requires_action'
      : intent.status === 'canceled' ? 'failed'
      : intent.status === 'requires_payment_method' ? 'failed'
      : 'pending'

    return {
      id: intent.id,
      status,
      threeDsUrl: intent.next_action?.type === 'redirect_to_url'
        ? (intent.next_action.redirect_to_url as any)?.url
        : undefined,
      failureCode: intent.last_payment_error?.code,
      failureMessage: intent.last_payment_error?.message,
      pspFeeCents: intent.application_fee_amount ?? undefined,
    }
  }

  private mapRefundReason(reason: string): Stripe.RefundCreateParams.Reason | undefined {
    if (reason === 'fraud' || reason === 'fraudulent') return 'fraudulent'
    if (reason === 'duplicate') return 'duplicate'
    return 'requested_by_customer'
  }
}
```

## Шаг 4: ЮKassa adapter

`services/payments/src/adapters/yookassa.ts`:

```typescript
import crypto from 'node:crypto'
import { httpClient } from '../clients/http'
import type { PspAdapter, ChargeParams, ChargeResult, RefundParams, RefundResult, PspWebhookEvent } from './types'

export class YookassaAdapter implements PspAdapter {
  readonly name = 'yookassa' as const
  private baseUrl = 'https://api.yookassa.ru/v3'

  constructor(
    private config: {
      shopId: string
      secretKey: string
      webhookSecret: string  // signatures из shop-config
    },
  ) {}

  async createCharge(params: ChargeParams): Promise<ChargeResult> {
    try {
      const response = await httpClient.post(`${this.baseUrl}/payments`, {
        amount: {
          value: (params.amountCents / 100).toFixed(2),
          currency: params.currency.toUpperCase(),
        },
        payment_method_id: params.paymentMethodToken,
        capture: true,
        description: params.description,
        metadata: params.metadata,
        confirmation: {
          type: 'redirect',
          return_url: process.env.PUBLIC_URL + '/payments/callback',
        },
      }, {
        auth: { username: this.config.shopId, password: this.config.secretKey },
        headers: { 'Idempotence-Key': params.idempotencyKey },
      })

      return this.mapPayment(response.data)
    } catch (err: any) {
      const code = err.response?.data?.code
      return {
        id: err.response?.data?.id ?? '',
        status: 'failed',
        failureCode: code,
        failureMessage: err.response?.data?.description ?? err.message,
      }
    }
  }

  async confirmCharge(pspChargeId: string): Promise<ChargeResult> {
    const response = await httpClient.get(`${this.baseUrl}/payments/${pspChargeId}`, {
      auth: { username: this.config.shopId, password: this.config.secretKey },
    })
    return this.mapPayment(response.data)
  }

  async refundCharge(params: RefundParams): Promise<RefundResult> {
    try {
      const response = await httpClient.post(`${this.baseUrl}/refunds`, {
        payment_id: params.pspChargeId,
        amount: {
          value: (params.amountCents / 100).toFixed(2),
          currency: 'RUB',
        },
        description: params.reason,
      }, {
        auth: { username: this.config.shopId, password: this.config.secretKey },
        headers: { 'Idempotence-Key': params.idempotencyKey },
      })

      return {
        id: response.data.id,
        status: response.data.status === 'succeeded' ? 'succeeded' 
              : response.data.status === 'pending' ? 'pending'
              : 'failed',
      }
    } catch (err: any) {
      return {
        id: '',
        status: 'failed',
        failureMessage: err.response?.data?.description ?? err.message,
      }
    }
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    // ЮKassa использует HTTP Basic auth для webhook callbacks
    // Alternatively они signing header
    const expected = crypto.createHmac('sha256', this.config.webhookSecret)
      .update(rawBody)
      .digest('hex')
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  }

  parseWebhookEvent(rawBody: string): PspWebhookEvent {
    const event = JSON.parse(rawBody)
    return {
      id: event.object.id + '-' + event.event,
      type: this.mapEventType(event.event),
      object: event.object,
    }
  }

  async listChargesForDate(date: string): Promise<ExternalCharge[]> {
    const result: ExternalCharge[] = []
    let cursor: string | undefined
    
    do {
      const response = await httpClient.get(`${this.baseUrl}/payments`, {
        params: {
          created_at: `gte:${date}T00:00:00Z`,
          created_at_lt: `${date}T23:59:59Z`,
          limit: 100,
          cursor,
        },
        auth: { username: this.config.shopId, password: this.config.secretKey },
      })

      for (const p of response.data.items) {
        result.push({
          id: p.id,
          amountCents: Math.round(parseFloat(p.amount.value) * 100),
          currency: p.amount.currency,
          status: p.status,
          createdAt: new Date(p.created_at),
          refunded: p.refunded_amount?.value > 0,
          refundedAmountCents: Math.round(parseFloat(p.refunded_amount?.value ?? '0') * 100),
          metadata: p.metadata ?? {},
        })
      }
      
      cursor = response.data.next_cursor
    } while (cursor)

    return result
  }

  async tokenizePaymentMethod(params: TokenizeParams): Promise<TokenizeResult> {
    // ЮKassa tokenization — через saved-payment-method flag после first payment
    // Или отдельный widget
    throw new Error('Use first-payment tokenization flow')
  }

  async deletePaymentMethod(pspToken: string): Promise<void> {
    // Not supported через API; users manage через their account
  }

  private mapPayment(p: any): ChargeResult {
    const status: ChargeResult['status'] =
      p.status === 'succeeded' ? 'succeeded'
      : p.status === 'pending' && p.confirmation?.confirmation_url ? 'requires_action'
      : p.status === 'pending' ? 'pending'
      : p.status === 'canceled' ? 'failed'
      : 'pending'

    return {
      id: p.id,
      status,
      threeDsUrl: p.confirmation?.confirmation_url,
      failureCode: p.cancellation_details?.reason,
      failureMessage: p.cancellation_details?.party,
    }
  }

  private mapEventType(event: string): string {
    const map: Record<string, string> = {
      'payment.succeeded': 'charge.succeeded',
      'payment.canceled': 'charge.failed',
      'refund.succeeded': 'charge.refunded',
    }
    return map[event] ?? event
  }
}
```

## Шаг 5: Router + factory

`services/payments/src/adapters/index.ts`:

```typescript
import { StripeAdapter } from './stripe'
import { YookassaAdapter } from './yookassa'
import type { PspAdapter } from './types'

const adapters: Record<string, PspAdapter> = {
  stripe: new StripeAdapter({
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  }),
  yookassa: new YookassaAdapter({
    shopId: process.env.YOOKASSA_SHOP_ID!,
    secretKey: process.env.YOOKASSA_SECRET_KEY!,
    webhookSecret: process.env.YOOKASSA_WEBHOOK_SECRET!,
  }),
}

export function getPspAdapter(name: string): PspAdapter {
  const adapter = adapters[name]
  if (!adapter) throw new Error(`Unknown PSP: ${name}`)
  return adapter
}

export const PSPRouter = {
  selectPsp(input: {
    region: string
    paymentMethodKind?: string
    amountCents: bigint
    currency: string
  }): PspAdapter {
    // Routing logic from schemas/payments-db.md
    const region = input.region
    
    if (region === 'RU') {
      if (input.paymentMethodKind === 'sbp' || input.currency === 'RUB') {
        return getPspAdapter('yookassa')
      }
    }
    
    if (['US', 'CA', 'GB', 'AU'].includes(region) || 
        (region === 'EU' && input.currency === 'EUR')) {
      return getPspAdapter('stripe')
    }
    
    // Fallback
    return getPspAdapter('stripe')
  },
}
```

## Шаг 6: Webhook handler

`services/payments/src/handlers/webhook.ts`:

```typescript
import { defineEventHandler, readRawBody, getHeader, getRouterParam, createError } from 'h3'
import { getPspAdapter } from '../adapters'
import { db } from '../db'
import { webhooksLog, charges } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { publisher } from '../events'

export default defineEventHandler(async (event) => {
  const pspName = getRouterParam(event, 'psp')
  const rawBody = await readRawBody(event, 'utf-8')
  const signature = getHeader(event, 'stripe-signature') 
    ?? getHeader(event, 'x-yookassa-signature')
    ?? ''

  if (!pspName || !rawBody) {
    throw createError({ statusCode: 400 })
  }

  const adapter = getPspAdapter(pspName)
  
  // 1. Verify signature
  const valid = adapter.verifyWebhookSignature(rawBody, signature)
  if (!valid) {
    throw createError({ statusCode: 400, statusMessage: 'INVALID_SIGNATURE' })
  }

  // 2. Parse
  const pspEvent = adapter.parseWebhookEvent(rawBody)

  // 3. Idempotency
  const existing = await db.query.webhooksLog.findFirst({
    where: and(
      eq(webhooksLog.pspName, pspName),
      eq(webhooksLog.eventId, pspEvent.id),
    ),
  })

  if (existing?.processingStatus === 'processed') {
    return { received: true, duplicate: true }
  }

  if (!existing) {
    await db.insert(webhooksLog).values({
      pspName,
      eventType: pspEvent.type,
      eventId: pspEvent.id,
      signatureValid: true,
      rawPayload: JSON.parse(rawBody),
      processingStatus: 'pending',
    })
  }

  // 4. Route by event type
  try {
    switch (pspEvent.type) {
      case 'charge.succeeded':
      case 'payment_intent.succeeded':
        await handleChargeSucceeded(pspName, pspEvent)
        break
      
      case 'charge.failed':
      case 'payment_intent.payment_failed':
        await handleChargeFailed(pspName, pspEvent)
        break

      case 'charge.refunded':
      case 'refund.succeeded':
        await handleChargeRefunded(pspName, pspEvent)
        break

      case 'charge.dispute.created':
      case 'charge.dispute.updated':
        await handleDispute(pspName, pspEvent)
        break

      default:
        // Unknown event — log but don't fail
        console.log(`Unhandled webhook: ${pspName}.${pspEvent.type}`)
    }

    await db.update(webhooksLog)
      .set({ processingStatus: 'processed', processedAt: new Date() })
      .where(eq(webhooksLog.eventId, pspEvent.id))
    
    return { received: true }
  } catch (err) {
    await db.update(webhooksLog)
      .set({ 
        processingStatus: 'failed', 
        processingError: (err as Error).message,
      })
      .where(eq(webhooksLog.eventId, pspEvent.id))
    throw err
  }
})

async function handleChargeSucceeded(pspName: string, event: any) {
  const pspChargeId = event.object.id
  
  const charge = await db.query.charges.findFirst({
    where: and(
      eq(charges.pspName, pspName),
      eq(charges.pspChargeId, pspChargeId),
    ),
  })
  
  if (!charge) {
    throw new Error(`CHARGE_NOT_FOUND: ${pspName}/${pspChargeId}`)
  }
  
  if (charge.status === 'confirmed') {
    return  // already processed
  }

  await db.update(charges)
    .set({ 
      status: 'confirmed', 
      confirmedAt: new Date(),
      pspFeeCents: extractFee(pspName, event),
    })
    .where(eq(charges.id, charge.id))

  await publisher.publish({
    type: 'app.daria.payments.payment-confirmed.v1',
    data: {
      chargeId: charge.id,
      userId: charge.userId,
      amountCents: charge.amountCents.toString(),
      currency: charge.currency,
      kind: charge.kind,
      referenceType: charge.referenceType,
      referenceId: charge.referenceId,
      confirmedAt: new Date().toISOString(),
      traceId: charge.traceId,
    },
  })
}

async function handleChargeFailed(pspName: string, event: any) {
  const pspChargeId = event.object.id
  const charge = await db.query.charges.findFirst({
    where: and(
      eq(charges.pspName, pspName),
      eq(charges.pspChargeId, pspChargeId),
    ),
  })
  
  if (!charge) return

  await db.update(charges)
    .set({
      status: 'failed',
      failureCode: event.object.last_payment_error?.code,
      failureMessage: event.object.last_payment_error?.message,
      failedAt: new Date(),
    })
    .where(eq(charges.id, charge.id))

  await publisher.publish({
    type: 'app.daria.payments.payment-failed.v1',
    data: {
      chargeId: charge.id,
      userId: charge.userId,
      failureCode: event.object.last_payment_error?.code,
      failureMessage: event.object.last_payment_error?.message,
      traceId: charge.traceId,
    },
  })
}

async function handleChargeRefunded(pspName: string, event: any) {
  // Similar pattern — update + publish refund-completed event
  // ...
}

async function handleDispute(pspName: string, event: any) {
  // Create/update disputesProxy record + publish dispute event
  // ...
}

function extractFee(pspName: string, event: any): number | undefined {
  if (pspName === 'stripe') {
    return event.object.application_fee_amount ?? undefined
  }
  // ЮKassa — fee separate в `income_amount`
  return undefined
}
```

## Шаг 7: Health + metrics

```typescript
// services/payments/src/handlers/health.ts
export default defineEventHandler(async () => {
  // Check PSP connectivity
  const checks = await Promise.allSettled([
    getPspAdapter('stripe').checkHealth?.() ?? Promise.resolve('skipped'),
    getPspAdapter('yookassa').checkHealth?.() ?? Promise.resolve('skipped'),
  ])

  const allOk = checks.every(c => c.status === 'fulfilled')
  if (!allOk) {
    throw createError({ statusCode: 503, data: { checks } })
  }

  return { status: 'ready', checks }
})
```

## Шаг 8: End-to-end test

```bash
# Start services
pnpm dev:infra
pnpm -F @daria/service-payments dev

# Test Stripe flow (использует Stripe test card)
PAYMENTS=http://localhost:8080

# 1. Tokenize test card (client-side в реальности — здесь мокаем)
# Stripe test card: 4242 4242 4242 4242, any CVC, any future date

# 2. Create charge
CHARGE=$(curl -s -X POST $PAYMENTS/v1/charges \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Authorization: Bearer $JWT" \
  -d '{
    "userId": "alice",
    "amountCents": "1000",
    "currency": "USD",
    "kind": "template-purchase",
    "paymentMethodId": "pm_test_...",
    "referenceId": "template-xyz"
  }')

echo $CHARGE | jq

# 3. Simulate webhook (in dev — Stripe CLI forwards)
# stripe listen --forward-to http://localhost:8080/v1/webhook/stripe

# 4. Verify event published
nats sub 'app.daria.payments.>'
```

## Checklist

- [ ] Stripe adapter works для charge + refund
- [ ] ЮKassa adapter works
- [ ] PSP router selects correct adapter по region/currency
- [ ] Webhook signature verification correct (both PSPs)
- [ ] Idempotency dedups duplicate webhooks
- [ ] payment-confirmed / payment-failed events fire
- [ ] Test charge flow end-to-end (Stripe test card)
- [ ] Fallback PSP works при primary failure
- [ ] Daily reconciliation can list charges per-PSP

## Next

Wednesday: Notifications YAML matcher → `11-notifications-yaml-matcher.md`.
