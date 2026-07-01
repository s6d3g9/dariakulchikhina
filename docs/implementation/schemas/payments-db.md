# Payments DB schema

Postgres `payments_db` для `services/payments`. PSP integration state, webhook tracking, reconciliation.

## Tables

### `charges`

```typescript
export const chargeStatusEnum = pgEnum('charge_status', [
  'pending', 'requires_action', 'confirmed', 'failed', 'cancelled', 'refunded', 'partially_refunded'
])

export const charges = pgTable('charges', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Idempotency
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull().unique(),
  
  // User
  userId: varchar('user_id', { length: 64 }).notNull(),
  
  // Amount
  amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  
  // What это charge за
  kind: varchar('kind', { length: 32 }).notNull(),
  // 'template-purchase' | 'subscription-renewal' | 'gift-subscription' | 'one-off' | ...
  
  referenceType: varchar('reference_type', { length: 32 }),
  referenceId: varchar('reference_id', { length: 128 }),
  
  // Payment method
  paymentMethodId: uuid('payment_method_id').references(() => paymentMethods.id),
  paymentMethodKind: varchar('payment_method_kind', { length: 32 }),
  // 'card' | 'sepa-dd' | 'sbp' | 'google-pay' | 'apple-pay' | 'crypto-usdt' | ...
  
  // PSP routing
  pspName: varchar('psp_name', { length: 32 }),
  // 'stripe' | 'yookassa' | 'cloudpayments' | 'crypto-direct'
  pspChargeId: varchar('psp_charge_id', { length: 256 }),
  
  // Status
  status: chargeStatusEnum('status').notNull().default('pending'),
  failureCode: varchar('failure_code', { length: 64 }),
  failureMessage: text('failure_message'),
  
  // 3DS / SCA
  requires3ds: boolean('requires_3ds').notNull().default(false),
  threeDsUrl: text('threeds_url'),
  
  // Amounts
  refundedCents: bigint('refunded_cents', { mode: 'bigint' }).notNull().default(0n),
  pspFeeCents: bigint('psp_fee_cents', { mode: 'bigint' }),
  
  // Risk
  riskScore: real('risk_score'),
  riskFlags: jsonb('risk_flags').$type<string[]>(),
  
  // Tracing
  traceId: varchar('trace_id', { length: 64 }),
  
  // Timing
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
}, (t) => ({
  userIdx: index('charges_user_idx').on(t.userId, t.createdAt),
  statusIdx: index('charges_status_idx').on(t.status, t.createdAt),
  pspIdx: index('charges_psp_idx').on(t.pspName, t.pspChargeId),
  referenceIdx: index('charges_reference_idx').on(t.referenceType, t.referenceId),
}))
```

### `refunds`

```typescript
export const refunds = pgTable('refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  chargeId: uuid('charge_id').references(() => charges.id).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull().unique(),
  
  amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  reason: varchar('reason', { length: 64 }).notNull(),
  // 'user-requested' | 'dispute-ruling' | 'fraud' | 'duplicate' | 'admin'
  
  pspRefundId: varchar('psp_refund_id', { length: 256 }),
  
  status: varchar('status', { length: 16 }).notNull().default('pending'),
  // 'pending' | 'succeeded' | 'failed'
  
  failureMessage: text('failure_message'),
  
  initiatedBy: varchar('initiated_by', { length: 64 }),
  traceId: varchar('trace_id', { length: 64 }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (t) => ({
  chargeIdx: index('refunds_charge_idx').on(t.chargeId),
  statusIdx: index('refunds_status_idx').on(t.status),
}))
```

### `payment_methods` (tokens only — no PAN)

```typescript
export const paymentMethodKindEnum = pgEnum('payment_method_kind', [
  'card', 'sepa-dd', 'sbp', 'apple-pay', 'google-pay', 'paypal', 'crypto-usdt', 'crypto-usdc', 'bank-account'
])

export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  userId: varchar('user_id', { length: 64 }).notNull(),
  
  kind: paymentMethodKindEnum('kind').notNull(),
  
  // PSP token (NOT PAN)
  pspName: varchar('psp_name', { length: 32 }).notNull(),
  pspToken: varchar('psp_token', { length: 256 }).notNull(),
  pspCustomerId: varchar('psp_customer_id', { length: 256 }),
  
  // Display info (last 4, brand — no full PAN)
  displayLast4: varchar('display_last_4', { length: 4 }),
  displayBrand: varchar('display_brand', { length: 32 }),
  displayExpMonth: bigint('display_exp_month', { mode: 'number' }),
  displayExpYear: bigint('display_exp_year', { mode: 'number' }),
  
  // Billing country (AML)
  billingCountry: varchar('billing_country', { length: 2 }),
  
  // Default
  isDefault: boolean('is_default').notNull().default(false),
  
  // Verification (3DS-confirmed at setup)
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  
  // Fingerprint (для detecting duplicates across PSPs)
  fingerprint: varchar('fingerprint', { length: 64 }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  userIdx: index('payment_methods_user_idx').on(t.userId).where(sql`deleted_at IS NULL`),
  tokenIdx: unique('payment_methods_token_unique').on(t.pspName, t.pspToken),
  fingerprintIdx: index('payment_methods_fingerprint_idx').on(t.fingerprint),
}))
```

### `webhooks_log`

Все PSP webhooks для idempotency + replay.

```typescript
export const webhooksLog = pgTable('webhooks_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  pspName: varchar('psp_name', { length: 32 }).notNull(),
  eventType: varchar('event_type', { length: 64 }).notNull(),
  eventId: varchar('event_id', { length: 256 }).notNull(),
  
  // Signature verification result
  signatureValid: boolean('signature_valid').notNull(),
  
  // Raw payload
  rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>().notNull(),
  
  // Processing state
  processingStatus: varchar('processing_status', { length: 16 }).notNull().default('pending'),
  // 'pending' | 'processed' | 'failed' | 'ignored'
  processingError: text('processing_error'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueEvent: unique('webhooks_unique_event').on(t.pspName, t.eventId),
  pspEventTypeIdx: index('webhooks_psp_type_idx').on(t.pspName, t.eventType, t.receivedAt),
  statusIdx: index('webhooks_status_idx').on(t.processingStatus),
}))
```

### `disputes_proxy`

Mirror of PSP chargeback disputes (не to be confused с `services/disputes` которая про content/authorship).

```typescript
export const disputesProxy = pgTable('disputes_proxy', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  chargeId: uuid('charge_id').references(() => charges.id).notNull(),
  pspDisputeId: varchar('psp_dispute_id', { length: 256 }).notNull(),
  
  kind: varchar('kind', { length: 32 }).notNull(),
  // 'fraudulent' | 'unrecognized' | 'duplicate' | 'product_not_received' | ...
  
  amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  
  status: varchar('status', { length: 32 }).notNull(),
  // 'warning_needs_response' | 'warning_under_review' | 'needs_response'
  // | 'under_review' | 'won' | 'lost' | 'charge_refunded'
  
  evidenceDueBy: timestamp('evidence_due_by', { withTimezone: true }),
  evidenceSubmitted: boolean('evidence_submitted').notNull().default(false),
  evidence: jsonb('evidence').$type<Record<string, unknown>>(),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
}, (t) => ({
  chargeIdx: index('disputes_proxy_charge_idx').on(t.chargeId),
  statusIdx: index('disputes_proxy_status_idx').on(t.status),
  pspIdx: unique('disputes_proxy_psp_unique').on(t.pspDisputeId),
}))
```

### `reconciliation_log`

Daily reconciliation (ours vs PSP).

```typescript
export const reconciliationLog = pgTable('reconciliation_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  pspName: varchar('psp_name', { length: 32 }).notNull(),
  date: date('date').notNull(),
  
  // Counts
  pspChargesCount: bigint('psp_charges_count', { mode: 'number' }).notNull(),
  ourChargesCount: bigint('our_charges_count', { mode: 'number' }).notNull(),
  matchedCount: bigint('matched_count', { mode: 'number' }).notNull(),
  missingCount: bigint('missing_count', { mode: 'number' }).notNull(),
  extraCount: bigint('extra_count', { mode: 'number' }).notNull(),
  
  // Amounts
  pspTotalCents: bigint('psp_total_cents', { mode: 'bigint' }).notNull(),
  ourTotalCents: bigint('our_total_cents', { mode: 'bigint' }).notNull(),
  diffCents: bigint('diff_cents', { mode: 'bigint' }).notNull(),
  
  // Details
  missingPspIds: jsonb('missing_psp_ids').$type<string[]>(),
  extraChargeIds: jsonb('extra_charge_ids').$type<string[]>(),
  
  // Resolution
  status: varchar('status', { length: 16 }).notNull().default('mismatch'),
  // 'matched' | 'mismatch' | 'resolved'
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: varchar('resolved_by', { length: 64 }),
  resolution: text('resolution'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pspDateIdx: unique('reconciliation_psp_date_unique').on(t.pspName, t.date),
  statusIdx: index('reconciliation_status_idx').on(t.status, t.date),
}))
```

## Core algorithm: createCharge (with PSP routing)

```typescript
import { PSPRouter } from './psp-router'

const pspRouter = new PSPRouter()

export async function createCharge(params: {
  userId: string
  amountCents: bigint
  currency: string
  kind: string
  referenceType?: string
  referenceId?: string
  paymentMethodId?: string
  idempotencyKey: string
  traceId?: string
}): Promise<Charge> {
  return await db.transaction(async (tx) => {
    // 1. Idempotency
    const existing = await tx.query.charges.findFirst({
      where: eq(charges.idempotencyKey, params.idempotencyKey),
    })
    if (existing) return existing

    // 2. Load user region (для PSP selection)
    const userPrefs = await getUserPreferences(params.userId)
    const region = userPrefs.region

    // 3. Load payment method (or default)
    let paymentMethod: PaymentMethod | undefined
    if (params.paymentMethodId) {
      paymentMethod = await tx.query.paymentMethods.findFirst({
        where: eq(paymentMethods.id, params.paymentMethodId),
      })
      if (!paymentMethod) throw new Error('PAYMENT_METHOD_NOT_FOUND')
    } else {
      paymentMethod = await tx.query.paymentMethods.findFirst({
        where: and(
          eq(paymentMethods.userId, params.userId),
          eq(paymentMethods.isDefault, true),
          isNull(paymentMethods.deletedAt),
        ),
      })
    }

    // 4. Select PSP
    const psp = pspRouter.selectPsp({
      region,
      paymentMethodKind: paymentMethod?.kind,
      amountCents: params.amountCents,
      currency: params.currency,
    })

    // 5. Insert pre-charge record
    const [charge] = await tx.insert(charges).values({
      userId: params.userId,
      amountCents: params.amountCents,
      currency: params.currency,
      kind: params.kind,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      paymentMethodId: paymentMethod?.id,
      paymentMethodKind: paymentMethod?.kind,
      pspName: psp.name,
      idempotencyKey: params.idempotencyKey,
      status: 'pending',
      traceId: params.traceId,
    }).returning()

    // 6. Call PSP
    try {
      const pspResult = await psp.createCharge({
        amountCents: Number(params.amountCents),
        currency: params.currency,
        customerToken: paymentMethod?.pspCustomerId,
        paymentMethodToken: paymentMethod?.pspToken,
        metadata: {
          chargeId: charge.id,
          userId: params.userId,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
        },
      })

      // 7. Update с PSP data
      await tx.update(charges)
        .set({
          pspChargeId: pspResult.id,
          status: pspResult.status === 'succeeded' ? 'confirmed'
                : pspResult.status === 'requires_action' ? 'requires_action'
                : 'pending',
          requires3ds: pspResult.status === 'requires_action',
          threeDsUrl: pspResult.threeDsUrl,
          confirmedAt: pspResult.status === 'succeeded' ? new Date() : null,
        })
        .where(eq(charges.id, charge.id))

      // 8. If confirmed — publish event
      if (pspResult.status === 'succeeded') {
        await publishEvent('app.daria.payments.payment-confirmed.v1', {
          chargeId: charge.id,
          userId: params.userId,
          amountCents: params.amountCents.toString(),
          currency: params.currency,
          kind: params.kind,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          confirmedAt: new Date().toISOString(),
        })
      }

      return { ...charge, status: pspResult.status as any, pspChargeId: pspResult.id }
    } catch (err) {
      await tx.update(charges)
        .set({
          status: 'failed',
          failureCode: (err as any).code,
          failureMessage: (err as Error).message,
          failedAt: new Date(),
        })
        .where(eq(charges.id, charge.id))

      await publishEvent('app.daria.payments.payment-failed.v1', {
        chargeId: charge.id,
        userId: params.userId,
        failureCode: (err as any).code,
        failureMessage: (err as Error).message,
      })

      throw err
    }
  })
}
```

## PSP router

```typescript
// services/payments/src/psp-router.ts

interface PspConfig {
  name: 'stripe' | 'yookassa' | 'cloudpayments' | 'crypto-direct'
  priority: number  // higher = preferred
  supports: {
    regions: string[]
    paymentMethods: string[]
    currencies: string[]
  }
}

const PSP_CONFIGS: PspConfig[] = [
  { name: 'yookassa', priority: 100, supports: { regions: ['RU'], paymentMethods: ['card', 'sbp', 'apple-pay', 'google-pay'], currencies: ['RUB'] }},
  { name: 'cloudpayments', priority: 80, supports: { regions: ['RU'], paymentMethods: ['card'], currencies: ['RUB', 'USD', 'EUR'] }},
  { name: 'stripe', priority: 100, supports: { regions: ['EU', 'US', 'GB', 'CA', 'AU'], paymentMethods: ['card', 'sepa-dd', 'apple-pay', 'google-pay'], currencies: ['EUR', 'USD', 'GBP'] }},
  { name: 'crypto-direct', priority: 50, supports: { regions: ['*'], paymentMethods: ['crypto-usdt', 'crypto-usdc'], currencies: ['USDT', 'USDC'] }},
]

export class PSPRouter {
  selectPsp(input: { region: string; paymentMethodKind?: string; amountCents: bigint; currency: string }): PSPAdapter {
    const candidates = PSP_CONFIGS.filter(c => {
      return (c.supports.regions.includes(input.region) || c.supports.regions.includes('*'))
        && (!input.paymentMethodKind || c.supports.paymentMethods.includes(input.paymentMethodKind))
        && c.supports.currencies.includes(input.currency)
    })

    if (candidates.length === 0) {
      throw new Error(`NO_PSP_FOR_REGION: ${input.region}/${input.currency}/${input.paymentMethodKind}`)
    }

    const sorted = candidates.sort((a, b) => b.priority - a.priority)
    return getPspAdapter(sorted[0].name)
  }

  async chargeFallback(chargeId: string): Promise<Charge> {
    // If primary failed, try secondary
    const charge = await db.query.charges.findFirst({ where: eq(charges.id, chargeId) })
    if (!charge || charge.status !== 'failed') throw new Error('INVALID_STATE')

    const secondary = PSP_CONFIGS
      .filter(c => c.name !== charge.pspName)
      .filter(/* same constraints */)
      .sort((a, b) => b.priority - a.priority)[0]

    if (!secondary) throw new Error('NO_FALLBACK_PSP')

    // Create new charge с new idempotency key
    return createCharge({
      ...charge,
      idempotencyKey: `${charge.idempotencyKey}-retry-${secondary.name}`,
    })
  }
}
```

## Webhook handling (common pattern)

```typescript
export async function receiveWebhook(params: {
  pspName: string
  rawBody: string
  signature: string
}): Promise<void> {
  const adapter = getPspAdapter(params.pspName)
  
  // 1. Verify signature
  const signatureValid = adapter.verifyWebhookSignature(params.rawBody, params.signature)
  
  // 2. Parse
  const event = adapter.parseWebhookEvent(params.rawBody)
  
  // 3. Idempotency — log webhook
  const existing = await db.query.webhooksLog.findFirst({
    where: and(
      eq(webhooksLog.pspName, params.pspName),
      eq(webhooksLog.eventId, event.id),
    ),
  })
  if (existing) {
    if (existing.processingStatus === 'processed') return  // already handled
  } else {
    await db.insert(webhooksLog).values({
      pspName: params.pspName,
      eventType: event.type,
      eventId: event.id,
      signatureValid,
      rawPayload: JSON.parse(params.rawBody),
      processingStatus: 'pending',
    })
  }

  if (!signatureValid) {
    await db.update(webhooksLog)
      .set({ processingStatus: 'failed', processingError: 'INVALID_SIGNATURE' })
      .where(eq(webhooksLog.eventId, event.id))
    throw new Error('INVALID_SIGNATURE')
  }

  // 4. Process per-type
  try {
    switch (event.type) {
      case 'charge.succeeded':
        await handleChargeSucceeded(event)
        break
      case 'charge.failed':
        await handleChargeFailed(event)
        break
      case 'charge.refunded':
        await handleChargeRefunded(event)
        break
      case 'charge.dispute.created':
        await handleDisputeCreated(event)
        break
      // ...
    }

    await db.update(webhooksLog)
      .set({ processingStatus: 'processed', processedAt: new Date() })
      .where(eq(webhooksLog.eventId, event.id))
  } catch (err) {
    await db.update(webhooksLog)
      .set({ processingStatus: 'failed', processingError: (err as Error).message })
      .where(eq(webhooksLog.eventId, event.id))
    throw err
  }
}
```

## Daily reconciliation job

```typescript
// Temporal workflow: daily 02:00 UTC
export async function reconcilePspDaily(pspName: string, date: string): Promise<void> {
  const adapter = getPspAdapter(pspName)
  
  // 1. Get PSP transactions for date
  const pspCharges = await adapter.listChargesForDate(date)
  
  // 2. Get our charges
  const ourCharges = await db.query.charges.findMany({
    where: and(
      eq(charges.pspName, pspName),
      sql`date(confirmed_at AT TIME ZONE 'UTC') = ${date}`,
    ),
  })
  
  // 3. Match by pspChargeId
  const ourByPspId = new Map(ourCharges.map(c => [c.pspChargeId, c]))
  const pspByPspId = new Map(pspCharges.map(c => [c.id, c]))
  
  const matched = []
  const missing = []  // PSP has, we don't
  const extra = []    // We have, PSP doesn't
  
  for (const pspCharge of pspCharges) {
    const ours = ourByPspId.get(pspCharge.id)
    if (ours) matched.push({ psp: pspCharge, ours })
    else missing.push(pspCharge)
  }
  for (const ours of ourCharges) {
    if (!pspByPspId.has(ours.pspChargeId!)) extra.push(ours)
  }
  
  const pspTotal = pspCharges.reduce((sum, c) => sum + BigInt(c.amountCents), 0n)
  const ourTotal = ourCharges.reduce((sum, c) => sum + c.amountCents, 0n)
  
  // 4. Log + alert if mismatch
  await db.insert(reconciliationLog).values({
    pspName, date,
    pspChargesCount: pspCharges.length,
    ourChargesCount: ourCharges.length,
    matchedCount: matched.length,
    missingCount: missing.length,
    extraCount: extra.length,
    pspTotalCents: pspTotal,
    ourTotalCents: ourTotal,
    diffCents: pspTotal - ourTotal,
    missingPspIds: missing.map(c => c.id),
    extraChargeIds: extra.map(c => c.id),
    status: pspTotal === ourTotal && missing.length === 0 && extra.length === 0 ? 'matched' : 'mismatch',
  })
  
  if (missing.length > 0 || extra.length > 0) {
    await publishEvent('app.daria.payments.reconciliation-mismatch.v1', {
      pspName, date,
      missingCount: missing.length,
      extraCount: extra.length,
      diffCents: (pspTotal - ourTotal).toString(),
    })
    // Triggers SEV-2 alert
  }
}
```

## Indexes rationale

- `charges_user_idx`: user's payment history.
- `charges_status_idx`: find pending / failed for monitoring.
- `charges_psp_idx`: webhook matching.
- `refunds_charge_idx`: list refunds per-charge.
- `webhooks_unique_event`: enforce idempotency.
- `payment_methods_fingerprint`: detect same card across PSPs (fraud signal).
