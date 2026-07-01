# Booking DB schema

Postgres `booking_db`. Slots, holds, bookings с OCC (инвариант I9).

## Tables

### `bookable_resources`

Generic resource catalog (flights, hotel-rooms, cars, tools — anything bookable). Но метаdata minimal — спецификация card-type'а.

```typescript
export const bookableResources = pgTable('bookable_resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  kind: varchar('kind', { length: 64 }).notNull(),
  // 'flight' | 'hotel-room' | 'car-rental' | 'appointment-slot' | ...
  
  externalId: varchar('external_id', { length: 256 }),  // provider system ID
  providerId: varchar('provider_id', { length: 64 }),
  
  // Title / display
  title: varchar('title', { length: 256 }).notNull(),
  summary: text('summary'),
  
  // Capacity (1 для single-slot, >1 для multi-slot resources)
  capacity: bigint('capacity', { mode: 'number' }).notNull().default(1),
  
  // Metadata (card-type-specific)
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  
  // System
  version: bigint('version', { mode: 'number' }).notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  kindIdx: index('resources_kind_idx').on(t.kind),
  externalIdx: index('resources_external_idx').on(t.providerId, t.externalId),
}))
```

### `slots`

Time-bound availability units.

```typescript
export const slotStatusEnum = pgEnum('slot_status', ['available', 'held', 'booked', 'cancelled', 'expired'])

export const slots = pgTable('slots', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  resourceId: uuid('resource_id').references(() => bookableResources.id).notNull(),
  
  // Time window
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  
  // Pricing
  priceCents: bigint('price_cents', { mode: 'bigint' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  
  // Capacity
  totalCapacity: bigint('total_capacity', { mode: 'number' }).notNull().default(1),
  availableCapacity: bigint('available_capacity', { mode: 'number' }).notNull().default(1),
  heldCapacity: bigint('held_capacity', { mode: 'number' }).notNull().default(0),
  bookedCapacity: bigint('booked_capacity', { mode: 'number' }).notNull().default(0),
  
  status: slotStatusEnum('status').notNull().default('available'),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  
  // OCC
  version: bigint('version', { mode: 'number' }).notNull().default(1),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  resourceTimeIdx: index('slots_resource_time_idx').on(t.resourceId, t.startsAt, t.endsAt),
  statusIdx: index('slots_status_idx').on(t.status),
  availableIdx: index('slots_available_idx').on(t.resourceId, t.startsAt)
    .where(sql`status = 'available' AND available_capacity > 0`),
}))
```

### `holds`

Temporary reservations (TTL-based).

```typescript
export const holdStatusEnum = pgEnum('hold_status', ['active', 'confirmed', 'released', 'expired'])

export const holds = pgTable('holds', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  slotId: uuid('slot_id').references(() => slots.id).notNull(),
  userId: varchar('user_id', { length: 64 }).notNull(),
  
  // How many units held
  quantity: bigint('quantity', { mode: 'number' }).notNull().default(1),
  
  // Wallet hold ID (если escrowed)
  walletHoldId: uuid('wallet_hold_id'),
  
  status: holdStatusEnum('status').notNull().default('active'),
  
  // TTL
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  
  // Idempotency
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull().unique(),
  
  // Confirmation
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  bookingId: uuid('booking_id'),
  
  // Release / expiry
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolutionReason: varchar('resolution_reason', { length: 64 }),
  
  traceId: varchar('trace_id', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  slotIdx: index('holds_slot_idx').on(t.slotId, t.status),
  userIdx: index('holds_user_idx').on(t.userId, t.status),
  expiresIdx: index('holds_expires_idx').on(t.expiresAt)
    .where(sql`status = 'active'`),
  bookingIdx: index('holds_booking_idx').on(t.bookingId),
}))
```

### `bookings`

Confirmed bookings (from held slots).

```typescript
export const bookingStatusEnum = pgEnum('booking_status', [
  'confirmed', 'fulfilled', 'cancelled', 'no-show', 'disputed'
])

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  slotId: uuid('slot_id').references(() => slots.id).notNull(),
  holdId: uuid('hold_id').references(() => holds.id).notNull(),
  userId: varchar('user_id', { length: 64 }).notNull(),
  
  quantity: bigint('quantity', { mode: 'number' }).notNull().default(1),
  
  // Pricing at time of booking (frozen)
  priceCents: bigint('price_cents', { mode: 'bigint' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  
  // Payment reference
  chargeId: uuid('charge_id'),  // FK к payments.charges
  
  // Details (card-type-specific — e.g. passenger info, check-in details)
  details: jsonb('details').$type<Record<string, unknown>>().default({}),
  
  // External confirmation (GDS PNR, etc.)
  externalBookingRef: varchar('external_booking_ref', { length: 256 }),
  
  status: bookingStatusEnum('status').notNull().default('confirmed'),
  
  // Cancellation
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledBy: varchar('cancelled_by', { length: 64 }),
  cancellationReason: text('cancellation_reason'),
  refundId: uuid('refund_id'),
  
  // System
  version: bigint('version', { mode: 'number' }).notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  userIdx: index('bookings_user_idx').on(t.userId, t.createdAt),
  slotIdx: index('bookings_slot_idx').on(t.slotId),
  statusIdx: index('bookings_status_idx').on(t.status),
  externalIdx: index('bookings_external_idx').on(t.externalBookingRef),
}))
```

## Core operation: createHold с OCC

```typescript
async function createHold(params: {
  slotId: string
  userId: string
  quantity: number
  ttlSeconds: number
  idempotencyKey: string
  traceId?: string
}): Promise<Hold> {
  return db.transaction(async (tx) => {
    // 1. Idempotency
    const existing = await tx.query.holds.findFirst({
      where: eq(holds.idempotencyKey, params.idempotencyKey),
    })
    if (existing) return existing

    // 2. Lock slot FOR UPDATE
    const [slot] = await tx.select()
      .from(slots)
      .where(eq(slots.id, params.slotId))
      .for('update')

    if (!slot) throw new Error('SLOT_NOT_FOUND')
    if (slot.status !== 'available') throw new Error('SLOT_NOT_AVAILABLE')
    if (slot.availableCapacity < BigInt(params.quantity)) throw new Error('INSUFFICIENT_CAPACITY')

    // 3. Check slot not expired
    if (slot.endsAt < new Date()) throw new Error('SLOT_EXPIRED')

    // 4. Update slot atomically (OCC через version)
    const newAvailable = slot.availableCapacity - BigInt(params.quantity)
    const newHeld = slot.heldCapacity + BigInt(params.quantity)
    
    const updateResult = await tx.update(slots)
      .set({
        availableCapacity: newAvailable,
        heldCapacity: newHeld,
        status: newAvailable === 0n ? 'held' : 'available',
        version: slot.version + 1,
        updatedAt: new Date(),
      })
      .where(and(
        eq(slots.id, params.slotId),
        eq(slots.version, slot.version),  // OCC check
      ))
      .returning()

    if (updateResult.length === 0) throw new Error('VERSION_CONFLICT')

    // 5. Create hold
    const expiresAt = new Date(Date.now() + params.ttlSeconds * 1000)
    const [hold] = await tx.insert(holds).values({
      slotId: params.slotId,
      userId: params.userId,
      quantity: params.quantity,
      expiresAt,
      status: 'active',
      idempotencyKey: params.idempotencyKey,
      traceId: params.traceId,
    }).returning()

    // 6. Publish event
    await publishEvent('app.daria.booking.hold-created.v1', {
      holdId: hold.id,
      slotId: params.slotId,
      userId: params.userId,
      quantity: params.quantity,
      expiresAt: expiresAt.toISOString(),
      traceId: params.traceId,
    })

    return hold
  })
}
```

## Core operation: confirmHold

```typescript
async function confirmHold(params: {
  holdId: string
  chargeId?: string
  externalBookingRef?: string
  details?: Record<string, unknown>
  traceId?: string
}): Promise<Booking> {
  return db.transaction(async (tx) => {
    // 1. Lock hold
    const [hold] = await tx.select().from(holds)
      .where(eq(holds.id, params.holdId))
      .for('update')

    if (!hold) throw new Error('HOLD_NOT_FOUND')
    if (hold.status !== 'active') throw new Error('HOLD_NOT_ACTIVE')
    if (hold.expiresAt < new Date()) {
      await tx.update(holds)
        .set({ status: 'expired', resolvedAt: new Date() })
        .where(eq(holds.id, hold.id))
      throw new Error('HOLD_EXPIRED')
    }

    // 2. Load slot
    const [slot] = await tx.select().from(slots)
      .where(eq(slots.id, hold.slotId))
      .for('update')

    // 3. Update slot (held → booked)
    await tx.update(slots)
      .set({
        heldCapacity: slot.heldCapacity - BigInt(hold.quantity),
        bookedCapacity: slot.bookedCapacity + BigInt(hold.quantity),
        status: slot.availableCapacity === 0n && slot.heldCapacity - BigInt(hold.quantity) === 0n ? 'booked' : slot.status,
        version: slot.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(slots.id, slot.id))

    // 4. Create booking
    const [booking] = await tx.insert(bookings).values({
      slotId: hold.slotId,
      holdId: hold.id,
      userId: hold.userId,
      quantity: hold.quantity,
      priceCents: slot.priceCents * BigInt(hold.quantity),
      currency: slot.currency,
      chargeId: params.chargeId,
      externalBookingRef: params.externalBookingRef,
      details: params.details,
      status: 'confirmed',
    }).returning()

    // 5. Update hold
    await tx.update(holds)
      .set({
        status: 'confirmed',
        confirmedAt: new Date(),
        bookingId: booking.id,
        resolvedAt: new Date(),
      })
      .where(eq(holds.id, hold.id))

    // 6. Publish event
    await publishEvent('app.daria.booking.slot-reserved.v1', {
      bookingId: booking.id,
      slotId: hold.slotId,
      resourceRef: { kind: slot.resourceKind, id: slot.resourceId },
      userId: hold.userId,
      amountCents: booking.priceCents.toString(),
      currency: booking.currency,
      startAt: slot.startsAt.toISOString(),
      endAt: slot.endsAt.toISOString(),
      reservedAt: new Date().toISOString(),
      version: 1,
      metadata: params.details,
    })

    return booking
  })
}
```

## Cleanup expired holds (cron)

```typescript
// Temporal workflow: runs every 30 sec
async function releaseExpiredHolds() {
  const expired = await db.select()
    .from(holds)
    .where(and(
      eq(holds.status, 'active'),
      lt(holds.expiresAt, new Date()),
    ))
    .limit(100)

  for (const hold of expired) {
    await db.transaction(async (tx) => {
      // Release capacity
      const [slot] = await tx.select().from(slots)
        .where(eq(slots.id, hold.slotId))
        .for('update')

      if (slot) {
        await tx.update(slots)
          .set({
            availableCapacity: slot.availableCapacity + BigInt(hold.quantity),
            heldCapacity: slot.heldCapacity - BigInt(hold.quantity),
            status: 'available',
            version: slot.version + 1,
          })
          .where(eq(slots.id, slot.id))
      }

      await tx.update(holds)
        .set({
          status: 'expired',
          resolvedAt: new Date(),
          resolutionReason: 'ttl-expired',
        })
        .where(eq(holds.id, hold.id))
    })

    await publishEvent('app.daria.booking.hold-expired.v1', {
      holdId: hold.id,
      slotId: hold.slotId,
      userId: hold.userId,
      expiredAt: new Date().toISOString(),
    })
  }
}
```

## Migration SQL

```sql
CREATE TYPE slot_status AS ENUM ('available', 'held', 'booked', 'cancelled', 'expired');
CREATE TYPE hold_status AS ENUM ('active', 'confirmed', 'released', 'expired');
CREATE TYPE booking_status AS ENUM ('confirmed', 'fulfilled', 'cancelled', 'no-show', 'disputed');

CREATE TABLE bookable_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind varchar(64) NOT NULL,
  external_id varchar(256),
  provider_id varchar(64),
  title varchar(256) NOT NULL,
  summary text,
  capacity bigint NOT NULL DEFAULT 1,
  metadata jsonb DEFAULT '{}'::jsonb,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX resources_kind_idx ON bookable_resources(kind);
CREATE INDEX resources_external_idx ON bookable_resources(provider_id, external_id);

CREATE TABLE slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES bookable_resources(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  price_cents bigint NOT NULL,
  currency varchar(3) NOT NULL,
  total_capacity bigint NOT NULL DEFAULT 1,
  available_capacity bigint NOT NULL DEFAULT 1,
  held_capacity bigint NOT NULL DEFAULT 0,
  booked_capacity bigint NOT NULL DEFAULT 0,
  status slot_status NOT NULL DEFAULT 'available',
  metadata jsonb DEFAULT '{}'::jsonb,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (available_capacity + held_capacity + booked_capacity = total_capacity),
  CHECK (starts_at < ends_at)
);
CREATE INDEX slots_resource_time_idx ON slots(resource_id, starts_at, ends_at);
CREATE INDEX slots_status_idx ON slots(status);
CREATE INDEX slots_available_idx ON slots(resource_id, starts_at) 
  WHERE status = 'available' AND available_capacity > 0;

CREATE TABLE holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES slots(id),
  user_id varchar(64) NOT NULL,
  quantity bigint NOT NULL DEFAULT 1,
  wallet_hold_id uuid,
  status hold_status NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  idempotency_key varchar(128) NOT NULL UNIQUE,
  confirmed_at timestamptz,
  booking_id uuid,
  resolved_at timestamptz,
  resolution_reason varchar(64),
  trace_id varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX holds_slot_idx ON holds(slot_id, status);
CREATE INDEX holds_user_idx ON holds(user_id, status);
CREATE INDEX holds_expires_idx ON holds(expires_at) WHERE status = 'active';
CREATE INDEX holds_booking_idx ON holds(booking_id);

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES slots(id),
  hold_id uuid NOT NULL REFERENCES holds(id),
  user_id varchar(64) NOT NULL,
  quantity bigint NOT NULL DEFAULT 1,
  price_cents bigint NOT NULL,
  currency varchar(3) NOT NULL,
  charge_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  external_booking_ref varchar(256),
  status booking_status NOT NULL DEFAULT 'confirmed',
  cancelled_at timestamptz,
  cancelled_by varchar(64),
  cancellation_reason text,
  refund_id uuid,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX bookings_user_idx ON bookings(user_id, created_at);
CREATE INDEX bookings_slot_idx ON bookings(slot_id);
CREATE INDEX bookings_status_idx ON bookings(status);
CREATE INDEX bookings_external_idx ON bookings(external_booking_ref);
```
