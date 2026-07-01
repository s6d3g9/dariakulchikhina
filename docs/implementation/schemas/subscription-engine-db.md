# Subscription-engine DB schema

Postgres `subscription_db`. Tracks subscription state, renewals, family/gift flows.

## Tables

### `subscriptions`

```typescript
export const subscriptionStateEnum = pgEnum('subscription_state', [
  'trial', 'active', 'past_due', 'paused', 'cancelled', 'expired', 'refunded'
])

export const subscriptionKindEnum = pgEnum('subscription_kind',
  ['direct', 'bundle', 'community', 'service']
)

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  kind: subscriptionKindEnum('kind').notNull(),
  
  // Target (who / what is being subscribed to)
  targetKind: varchar('target_kind', { length: 32 }).notNull(),  // person | template | community | bundle
  targetId: varchar('target_id', { length: 128 }).notNull(),
  
  // Holder (primary subscriber)
  holderId: varchar('holder_id', { length: 64 }).notNull(),
  
  // Members (family/team subs)
  memberIds: jsonb('member_ids').$type<string[]>().notNull().default([]),
  maxMembers: bigint('max_members', { mode: 'number' }).notNull().default(1),
  
  // Plan
  planPeriod: varchar('plan_period', { length: 16 }).notNull(),  // monthly | quarterly | yearly | one-time
  planPriceCents: bigint('plan_price_cents', { mode: 'bigint' }).notNull(),
  planCurrency: varchar('plan_currency', { length: 3 }).notNull(),
  
  // Trial
  trialDays: bigint('trial_days', { mode: 'number' }),
  
  // Introductory offer
  introOfferJson: jsonb('intro_offer_json').$type<{ priceCents: number, durations: number, originalPriceCents: number }>(),
  
  // Access window
  activeFrom: timestamp('active_from', { withTimezone: true }).notNull(),
  activeUntil: timestamp('active_until', { withTimezone: true }).notNull(),
  
  state: subscriptionStateEnum('state').notNull().default('trial'),
  
  // Lifecycle tracking
  renewalAt: timestamp('renewal_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  pausedAt: timestamp('paused_at', { withTimezone: true }),
  resumedAt: timestamp('resumed_at', { withTimezone: true }),
  pauseCount: bigint('pause_count', { mode: 'number' }).notNull().default(0),
  
  // Gift flow
  giftedBy: varchar('gifted_by', { length: 64 }),
  giftMessage: text('gift_message'),
  giftAcceptedAt: timestamp('gift_accepted_at', { withTimezone: true }),
  
  // Resale flow
  resaleFromSubscriptionId: uuid('resale_from_subscription_id').references((): any => subscriptions.id),
  
  // Original purchase
  originalPurchaseId: varchar('original_purchase_id', { length: 128 }).notNull(),
  
  // Policy snapshot at purchase (for refund consistency)
  policySnapshot: jsonb('policy_snapshot').$type<{ splitPolicyHash: string; licenseKind: string }>(),
  
  // System
  version: bigint('version', { mode: 'number' }).notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  holderIdx: index('subscriptions_holder_idx').on(t.holderId, t.state),
  targetIdx: index('subscriptions_target_idx').on(t.targetKind, t.targetId),
  stateIdx: index('subscriptions_state_idx').on(t.state, t.activeUntil),
  renewalIdx: index('subscriptions_renewal_idx').on(t.renewalAt)
    .where(sql`state IN ('active', 'past_due')`),
}))
```

### `subscription_events`

Append-only log of state transitions.

```typescript
export const subscriptionEvents = pgTable('subscription_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'cascade' }).notNull(),
  
  eventType: varchar('event_type', { length: 32 }).notNull(),
  // 'created' | 'trial-started' | 'activated' | 'renewed' | 'payment-failed' 
  // | 'past-due-retry' | 'cancelled' | 'paused' | 'resumed' | 'expired' 
  // | 'member-added' | 'member-removed' | 'transferred' | 'refunded'
  
  fromState: subscriptionStateEnum('from_state'),
  toState: subscriptionStateEnum('to_state'),
  
  actor: varchar('actor', { length: 64 }),  // user | system | admin
  reason: text('reason'),
  
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  
  traceId: varchar('trace_id', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  subscriptionIdx: index('sub_events_subscription_idx').on(t.subscriptionId, t.createdAt),
  typeIdx: index('sub_events_type_idx').on(t.eventType, t.createdAt),
}))
```

### `access_windows`

Denormalized `has-access` check for fast lookup (used by permissions).

```typescript
export const accessWindows = pgTable('access_windows', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar('user_id', { length: 64 }).notNull(),  // holder or member
  
  targetKind: varchar('target_kind', { length: 32 }).notNull(),
  targetId: varchar('target_id', { length: 128 }).notNull(),
  
  validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
  validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userTargetIdx: index('access_user_target_idx').on(t.userId, t.targetKind, t.targetId, t.validUntil),
  validIdx: index('access_valid_idx').on(t.validUntil),
}))
```

### `subscription_transfers`

Resale history.

```typescript
export const subscriptionTransfers = pgTable('subscription_transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id).notNull(),
  
  fromHolderId: varchar('from_holder_id', { length: 64 }).notNull(),
  toHolderId: varchar('to_holder_id', { length: 64 }).notNull(),
  
  priceCents: bigint('price_cents', { mode: 'bigint' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  
  platformFeeCents: bigint('platform_fee_cents', { mode: 'bigint' }).notNull().default(0n),
  royaltyToAuthorCents: bigint('royalty_to_author_cents', { mode: 'bigint' }).notNull().default(0n),
  
  paymentTransferId: uuid('payment_transfer_id'),  // FK к wallet.transfers
  
  transferredAt: timestamp('transferred_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  subscriptionIdx: index('sub_transfers_sub_idx').on(t.subscriptionId, t.transferredAt),
  toIdx: index('sub_transfers_to_idx').on(t.toHolderId),
}))
```

## State machine — concrete transitions

```typescript
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'created': ['trial', 'active'],
  'trial': ['active', 'cancelled', 'refunded'],
  'active': ['past_due', 'paused', 'cancelled'],
  'past_due': ['active', 'cancelled'],
  'paused': ['active', 'cancelled'],
  'cancelled': ['expired'],
  'expired': [],
  'refunded': [],
}

export function isTransitionAllowed(from: string, to: string): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}
```

## Lifecycle operations

### Create subscription

```typescript
async function createSubscription(params: {
  holderId: string
  targetKind: string
  targetId: string
  planPeriod: 'monthly' | 'quarterly' | 'yearly'
  planPriceCents: bigint
  planCurrency: string
  trialDays?: number
  giftedBy?: string
  giftMessage?: string
}): Promise<Subscription> {
  return db.transaction(async (tx) => {
    const now = new Date()
    const trialEnd = params.trialDays 
      ? new Date(now.getTime() + params.trialDays * 24 * 3600 * 1000)
      : now
    
    const activeUntil = calculateActiveUntil(trialEnd, params.planPeriod)
    
    const initialState = params.giftedBy ? 'created' : (params.trialDays ? 'trial' : 'active')
    
    const [sub] = await tx.insert(subscriptions).values({
      kind: 'direct',
      targetKind: params.targetKind,
      targetId: params.targetId,
      holderId: params.holderId,
      planPeriod: params.planPeriod,
      planPriceCents: params.planPriceCents,
      planCurrency: params.planCurrency,
      trialDays: params.trialDays ?? null,
      activeFrom: now,
      activeUntil,
      state: initialState,
      renewalAt: initialState === 'active' ? activeUntil : null,
      giftedBy: params.giftedBy,
      giftMessage: params.giftMessage,
      originalPurchaseId: generatePurchaseId(),
    }).returning()

    // Access window (если не gift awaiting accept)
    if (initialState !== 'created') {
      await tx.insert(accessWindows).values({
        subscriptionId: sub.id,
        userId: params.holderId,
        targetKind: params.targetKind,
        targetId: params.targetId,
        validFrom: now,
        validUntil: activeUntil,
      })
    }

    // Event log
    await tx.insert(subscriptionEvents).values({
      subscriptionId: sub.id,
      eventType: 'created',
      fromState: null,
      toState: initialState,
      actor: 'system',
    })

    await publishEvent('app.daria.subscription.created.v1', sub)
    return sub
  })
}
```

### Renew subscription (Temporal cron)

```typescript
async function renewSubscription(subscriptionId: string, traceId?: string): Promise<'renewed' | 'failed'> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
  })
  if (!sub || sub.state !== 'active') return 'failed'

  try {
    // Charge
    const charge = await paymentsClient.charge({
      userId: sub.holderId,
      amountCents: sub.planPriceCents,
      currency: sub.planCurrency,
      idempotencyKey: `renewal-${sub.id}-${sub.renewalAt!.toISOString()}`,
      kind: 'subscription-renewal',
      referenceId: sub.id,
      traceId,
    })

    if (charge.status !== 'confirmed') {
      await handleRenewalFailure(sub, 'charge-failed')
      return 'failed'
    }

    // Extend window
    const newActiveUntil = calculateActiveUntil(sub.activeUntil, sub.planPeriod)
    
    await db.transaction(async (tx) => {
      await tx.update(subscriptions)
        .set({
          activeUntil: newActiveUntil,
          renewalAt: newActiveUntil,
          version: sub.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, sub.id))

      await tx.insert(accessWindows).values({
        subscriptionId: sub.id,
        userId: sub.holderId,
        targetKind: sub.targetKind,
        targetId: sub.targetId,
        validFrom: sub.activeUntil,
        validUntil: newActiveUntil,
      })

      await tx.insert(subscriptionEvents).values({
        subscriptionId: sub.id,
        eventType: 'renewed',
        fromState: 'active',
        toState: 'active',
        actor: 'system',
        payload: { chargeId: charge.id, amountCents: sub.planPriceCents.toString() },
        traceId,
      })
    })

    // Trigger royalty distribution (async)
    await publishEvent('app.daria.subscription.renewed.v1', {
      subscriptionId: sub.id,
      holderId: sub.holderId,
      targetRef: { kind: sub.targetKind, id: sub.targetId },
      renewedAt: new Date().toISOString(),
      newActiveUntil: newActiveUntil.toISOString(),
      period: sub.planPeriod,
      amountCents: sub.planPriceCents.toString(),
      currency: sub.planCurrency,
      paymentId: charge.id,
      royaltyDistributed: false,  // will be true after authorship-registry consumes event
    })

    return 'renewed'
  } catch (err) {
    await handleRenewalFailure(sub, (err as Error).message)
    return 'failed'
  }
}

async function handleRenewalFailure(sub: any, reason: string) {
  await db.transaction(async (tx) => {
    await tx.update(subscriptions)
      .set({
        state: 'past_due',
        renewalAt: calculateRetryAt(sub),  // +1d, +3d, +7d
        version: sub.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id))

    await tx.insert(subscriptionEvents).values({
      subscriptionId: sub.id,
      eventType: 'payment-failed',
      fromState: 'active',
      toState: 'past_due',
      reason,
    })
  })

  await publishEvent('app.daria.subscription.payment-failed.v1', sub)
}
```

### Cancel subscription

```typescript
async function cancelSubscription(id: string, reason?: string): Promise<void> {
  await db.transaction(async (tx) => {
    const sub = await tx.query.subscriptions.findFirst({
      where: eq(subscriptions.id, id),
    })
    if (!sub) throw new Error('NOT_FOUND')
    if (!isTransitionAllowed(sub.state, 'cancelled')) {
      throw new Error('INVALID_TRANSITION')
    }

    await tx.update(subscriptions)
      .set({
        state: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason,
        renewalAt: null,  // don't renew
        version: sub.version + 1,
      })
      .where(eq(subscriptions.id, id))

    await tx.insert(subscriptionEvents).values({
      subscriptionId: id,
      eventType: 'cancelled',
      fromState: sub.state,
      toState: 'cancelled',
      reason,
    })
    // Access-window остаётся active до `activeUntil` (grace)
  })

  await publishEvent('app.daria.subscription.cancelled.v1', { id, reason })
}
```

### Expire (background job)

```typescript
// Temporal workflow: runs every hour
async function expireSubscriptionsCron() {
  const expiring = await db.select()
    .from(subscriptions)
    .where(and(
      inArray(subscriptions.state, ['cancelled', 'active']),
      lt(subscriptions.activeUntil, new Date()),
    ))
    .limit(100)

  for (const sub of expiring) {
    await db.transaction(async (tx) => {
      await tx.update(subscriptions)
        .set({ state: 'expired', version: sub.version + 1 })
        .where(eq(subscriptions.id, sub.id))

      // Revoke access windows
      await tx.delete(accessWindows)
        .where(eq(accessWindows.subscriptionId, sub.id))

      await tx.insert(subscriptionEvents).values({
        subscriptionId: sub.id,
        eventType: 'expired',
        fromState: sub.state,
        toState: 'expired',
        actor: 'system',
      })
    })

    await publishEvent('app.daria.subscription.expired.v1', { id: sub.id })
  }
}
```

## Access check query

Ultra-fast `hasAccess(user, resource)` для permissions middleware:

```typescript
async function hasActiveAccess(userId: string, targetKind: string, targetId: string): Promise<boolean> {
  const [row] = await db.select({ id: accessWindows.id })
    .from(accessWindows)
    .where(and(
      eq(accessWindows.userId, userId),
      eq(accessWindows.targetKind, targetKind),
      eq(accessWindows.targetId, targetId),
      gt(accessWindows.validUntil, new Date()),
    ))
    .limit(1)
  
  return !!row
}
```

Expected p95 < 10ms (indexed).

## Gift flow complete

```typescript
async function sendGift(params: {
  giverId: string
  receiverId: string
  targetKind: string
  targetId: string
  planPeriod: string
  planPriceCents: bigint
  planCurrency: string
  message?: string
}): Promise<{ subscriptionId: string; giftLink: string }> {
  // Charge giver
  const charge = await paymentsClient.charge({
    userId: params.giverId,
    amountCents: params.planPriceCents,
    currency: params.planCurrency,
    idempotencyKey: `gift-${params.giverId}-${Date.now()}`,
    kind: 'gift-subscription',
    referenceId: `${params.giverId}-to-${params.receiverId}`,
  })

  if (charge.status !== 'confirmed') throw new Error('CHARGE_FAILED')

  // Create subscription в 'created' state (awaiting accept)
  const sub = await createSubscription({
    holderId: params.receiverId,
    targetKind: params.targetKind,
    targetId: params.targetId,
    planPeriod: params.planPeriod as any,
    planPriceCents: params.planPriceCents,
    planCurrency: params.planCurrency,
    giftedBy: params.giverId,
    giftMessage: params.message,
  })

  // Notify receiver
  await notificationsClient.send({
    userId: params.receiverId,
    type: 'gift-received',
    data: {
      subscriptionId: sub.id,
      giverId: params.giverId,
      message: params.message,
      acceptUrl: `https://daria.app/gifts/${sub.id}/accept`,
    },
  })

  return {
    subscriptionId: sub.id,
    giftLink: `https://daria.app/gifts/${sub.id}/accept`,
  }
}

async function acceptGift(subscriptionId: string, receiverId: string): Promise<void> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
  })
  if (!sub) throw new Error('NOT_FOUND')
  if (sub.holderId !== receiverId) throw new Error('NOT_RECEIVER')
  if (sub.state !== 'created') throw new Error('INVALID_STATE')

  await db.transaction(async (tx) => {
    await tx.update(subscriptions)
      .set({
        state: 'active',
        giftAcceptedAt: new Date(),
        renewalAt: sub.activeUntil,
        version: sub.version + 1,
      })
      .where(eq(subscriptions.id, subscriptionId))

    await tx.insert(accessWindows).values({
      subscriptionId: sub.id,
      userId: sub.holderId,
      targetKind: sub.targetKind,
      targetId: sub.targetId,
      validFrom: new Date(),
      validUntil: sub.activeUntil,
    })

    await tx.insert(subscriptionEvents).values({
      subscriptionId: sub.id,
      eventType: 'activated',
      fromState: 'created',
      toState: 'active',
      actor: receiverId,
    })
  })

  await publishEvent('app.daria.subscription.activated.v1', { subscriptionId })
}
```

## Events

**Publishes:**
- `app.daria.subscription.created.v1`
- `app.daria.subscription.trial-started.v1`
- `app.daria.subscription.trial-ending.v1`  (sent 3 days before)
- `app.daria.subscription.activated.v1`
- `app.daria.subscription.renewed.v1`
- `app.daria.subscription.payment-failed.v1`
- `app.daria.subscription.past-due-retry.v1`
- `app.daria.subscription.cancelled.v1`
- `app.daria.subscription.paused.v1`
- `app.daria.subscription.resumed.v1`
- `app.daria.subscription.expired.v1`
- `app.daria.subscription.transferred.v1`
- `app.daria.subscription.refunded.v1`
- `app.daria.subscription.member-added.v1`
- `app.daria.subscription.member-removed.v1`

**Consumes:**
- `app.daria.payments.payment-confirmed.v1` → trigger trial-end → active
- `app.daria.payments.payment-failed.v1` → handleRenewalFailure
- `app.daria.disputes.ruling.v1` → refund if ruled
