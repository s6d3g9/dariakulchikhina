# Wallet DB schema

Postgres `wallet_db` для `services/wallet`. До Phase 6 — double-entry в Postgres. После — TigerBeetle primary, Postgres — audit mirror.

## Tables

### `accounts`

```typescript
import { pgTable, uuid, varchar, bigint, timestamp, index, unique } from 'drizzle-orm/pg-core'

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Type определяет семантику баланса
  accountType: varchar('account_type', { length: 32 }).notNull(),
  // values: 'user.primary' | 'user.escrow' | 'platform.revenue' 
  //       | 'author.royalty' | 'treasury.fund' | 'liquidity.pool'
  
  // Owner (user_id | platform | tag_id | ...)
  ownerType: varchar('owner_type', { length: 16 }).notNull(),  // 'user' | 'platform' | 'tag'
  ownerId: varchar('owner_id', { length: 64 }).notNull(),
  
  // Currency ISO-4217
  currency: varchar('currency', { length: 3 }).notNull(),
  
  // Balance в minor units (cents для USD/EUR, копейки для RUB)
  balanceCents: bigint('balance_cents', { mode: 'bigint' }).notNull().default(0n),
  
  // Holds — currently escrowed (sub-allocated)
  holdCents: bigint('hold_cents', { mode: 'bigint' }).notNull().default(0n),
  
  // Constraints
  // available_cents = balance_cents - hold_cents (checked в transfer logic)
  
  // System
  version: bigint('version', { mode: 'number' }).notNull().default(1),  // OCC
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  ownerIdx: index('accounts_owner_idx').on(t.ownerType, t.ownerId),
  typeIdx: index('accounts_type_idx').on(t.accountType),
  // One primary account per (user, currency)
  uniqPrimaryUser: unique('uniq_user_currency_primary')
    .on(t.ownerType, t.ownerId, t.currency, t.accountType),
}))
```

### `transfers`

```typescript
export const transfers = pgTable('transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Source + destination (double-entry)
  fromAccountId: uuid('from_account_id').references(() => accounts.id).notNull(),
  toAccountId: uuid('to_account_id').references(() => accounts.id).notNull(),
  
  // Amount + currency (оба счёта должны иметь same currency — conversion отдельным transfer)
  amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  
  // Idempotency — обязательно
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
  
  // Reason / reference
  kind: varchar('kind', { length: 32 }).notNull(),  
  // 'charge' | 'refund' | 'royalty' | 'platform-fee' | 'internal' | ...
  
  referenceType: varchar('reference_type', { length: 32 }),  // 'payment' | 'subscription' | 'contract' ...
  referenceId: varchar('reference_id', { length: 64 }),
  
  // Metadata
  description: varchar('description', { length: 256 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  // System
  status: varchar('status', { length: 16 }).notNull().default('pending'),
  // 'pending' | 'committed' | 'reversed'
  
  // Related reversal (если это compensating transfer)
  reversesTransferId: uuid('reverses_transfer_id').references((): any => transfers.id),
  
  // Audit
  traceId: varchar('trace_id', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  committedAt: timestamp('committed_at', { withTimezone: true }),
}, (t) => ({
  fromAccountIdx: index('transfers_from_account_idx').on(t.fromAccountId, t.createdAt),
  toAccountIdx: index('transfers_to_account_idx').on(t.toAccountId, t.createdAt),
  referenceIdx: index('transfers_reference_idx').on(t.referenceType, t.referenceId),
  idempotencyUnique: unique('uniq_idempotency_key').on(t.idempotencyKey),
}))
```

### `holds`

```typescript
export const holds = pgTable('holds', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  accountId: uuid('account_id').references(() => accounts.id).notNull(),
  
  amountCents: bigint('amount_cents', { mode: 'bigint' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  
  // What this hold is for
  purpose: varchar('purpose', { length: 32 }).notNull(),
  // 'escrow-purchase' | 'escrow-rental-deposit' | 'subscription-prepayment' ...
  
  referenceType: varchar('reference_type', { length: 32 }),
  referenceId: varchar('reference_id', { length: 64 }),
  
  // TTL
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  
  status: varchar('status', { length: 16 }).notNull().default('active'),
  // 'active' | 'released' | 'captured' | 'expired'
  
  // If captured → transfer that realized it
  capturedByTransferId: uuid('captured_by_transfer_id').references(() => transfers.id),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, (t) => ({
  accountIdx: index('holds_account_idx').on(t.accountId, t.status),
  expiresIdx: index('holds_expires_idx').on(t.expiresAt).where(sql`status = 'active'`),
}))
```

### `journal`

Append-only event log для reconciliation.

```typescript
export const journal = pgTable('journal', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  eventType: varchar('event_type', { length: 32 }).notNull(),
  // 'transfer-committed' | 'hold-created' | 'hold-captured' | 'account-created' ...
  
  // Full event snapshot (immutable)
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  
  // For traceability
  traceId: varchar('trace_id', { length: 64 }),
  userId: varchar('user_id', { length: 64 }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  eventTypeIdx: index('journal_event_type_idx').on(t.eventType, t.createdAt),
  userIdx: index('journal_user_idx').on(t.userId, t.createdAt),
}))
```

## Migration SQL

Генерируется Drizzle:

```sql
-- wallet_db initial migration

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type varchar(32) NOT NULL,
  owner_type varchar(16) NOT NULL,
  owner_id varchar(64) NOT NULL,
  currency varchar(3) NOT NULL,
  balance_cents bigint NOT NULL DEFAULT 0,
  hold_cents bigint NOT NULL DEFAULT 0,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX accounts_owner_idx ON accounts(owner_type, owner_id);
CREATE INDEX accounts_type_idx ON accounts(account_type);
CREATE UNIQUE INDEX uniq_user_currency_primary ON accounts(owner_type, owner_id, currency, account_type);

-- constraint: hold_cents <= balance_cents
ALTER TABLE accounts ADD CONSTRAINT check_hold_le_balance CHECK (hold_cents <= balance_cents);

CREATE TABLE transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id uuid NOT NULL REFERENCES accounts(id),
  to_account_id uuid NOT NULL REFERENCES accounts(id),
  amount_cents bigint NOT NULL,
  currency varchar(3) NOT NULL,
  idempotency_key varchar(128) NOT NULL,
  kind varchar(32) NOT NULL,
  reference_type varchar(32),
  reference_id varchar(64),
  description varchar(256),
  metadata jsonb,
  status varchar(16) NOT NULL DEFAULT 'pending',
  reverses_transfer_id uuid REFERENCES transfers(id),
  trace_id varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  committed_at timestamptz
);
CREATE INDEX transfers_from_account_idx ON transfers(from_account_id, created_at);
CREATE INDEX transfers_to_account_idx ON transfers(to_account_id, created_at);
CREATE INDEX transfers_reference_idx ON transfers(reference_type, reference_id);
CREATE UNIQUE INDEX uniq_idempotency_key ON transfers(idempotency_key);

-- non-self transfer
ALTER TABLE transfers ADD CONSTRAINT check_from_ne_to CHECK (from_account_id != to_account_id);
-- positive amount
ALTER TABLE transfers ADD CONSTRAINT check_positive_amount CHECK (amount_cents > 0);

CREATE TABLE holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  amount_cents bigint NOT NULL,
  currency varchar(3) NOT NULL,
  purpose varchar(32) NOT NULL,
  reference_type varchar(32),
  reference_id varchar(64),
  expires_at timestamptz NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'active',
  captured_by_transfer_id uuid REFERENCES transfers(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX holds_account_idx ON holds(account_id, status);
CREATE INDEX holds_expires_idx ON holds(expires_at) WHERE status = 'active';

CREATE TABLE journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type varchar(32) NOT NULL,
  payload jsonb NOT NULL,
  trace_id varchar(64),
  user_id varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX journal_event_type_idx ON journal(event_type, created_at);
CREATE INDEX journal_user_idx ON journal(user_id, created_at);
```

## Core business logic: transfer operation

Atomic double-entry transfer. Pseudocode TS:

```typescript
async function executeTransfer(params: {
  fromAccountId: string
  toAccountId: string
  amountCents: bigint
  currency: string
  idempotencyKey: string
  kind: string
  referenceType?: string
  referenceId?: string
  traceId?: string
  metadata?: object
}): Promise<{ transferId: string; fromBalance: bigint; toBalance: bigint }> {
  return db.transaction(async (tx) => {
    // 1. Idempotency check
    const existing = await tx.query.transfers.findFirst({
      where: eq(transfers.idempotencyKey, params.idempotencyKey),
    })
    if (existing) {
      // Already processed, return cached result
      return getTransferSnapshot(tx, existing.id)
    }

    // 2. Lock accounts FOR UPDATE (serialization)
    const [fromAcc] = await tx.select().from(accounts)
      .where(eq(accounts.id, params.fromAccountId))
      .for('update')
    const [toAcc] = await tx.select().from(accounts)
      .where(eq(accounts.id, params.toAccountId))
      .for('update')

    // 3. Validate
    if (!fromAcc || !toAcc) throw new Error('ACCOUNT_NOT_FOUND')
    if (fromAcc.currency !== params.currency || toAcc.currency !== params.currency) {
      throw new Error('CURRENCY_MISMATCH — use wallet.convert() for cross-currency')
    }
    const available = fromAcc.balanceCents - fromAcc.holdCents
    if (available < params.amountCents) {
      throw new Error('INSUFFICIENT_FUNDS')
    }
    if (fromAcc.id === toAcc.id) {
      throw new Error('SELF_TRANSFER')
    }

    // 4. Create transfer record
    const [transfer] = await tx.insert(transfers).values({
      fromAccountId: params.fromAccountId,
      toAccountId: params.toAccountId,
      amountCents: params.amountCents,
      currency: params.currency,
      idempotencyKey: params.idempotencyKey,
      kind: params.kind,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      metadata: params.metadata,
      status: 'committed',
      traceId: params.traceId,
      committedAt: new Date(),
    }).returning()

    // 5. Update account balances (atomic в транзакции)
    await tx.update(accounts)
      .set({
        balanceCents: fromAcc.balanceCents - params.amountCents,
        version: fromAcc.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, params.fromAccountId))

    await tx.update(accounts)
      .set({
        balanceCents: toAcc.balanceCents + params.amountCents,
        version: toAcc.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, params.toAccountId))

    // 6. Journal entry
    await tx.insert(journal).values({
      eventType: 'transfer-committed',
      payload: { transferId: transfer.id, ...params },
      traceId: params.traceId,
    })

    // 7. Publish event
    await publishEvent('app.daria.wallet.transfer-completed.v1', {
      transferId: transfer.id,
      fromAccountId: params.fromAccountId,
      toAccountId: params.toAccountId,
      amountCents: params.amountCents,
      currency: params.currency,
      kind: params.kind,
      traceId: params.traceId,
    })

    return {
      transferId: transfer.id,
      fromBalance: fromAcc.balanceCents - params.amountCents,
      toBalance: toAcc.balanceCents + params.amountCents,
    }
  })
}
```

## Query patterns (expected)

```typescript
// Get user balance per-currency
db.query.accounts.findMany({
  where: and(
    eq(accounts.ownerType, 'user'),
    eq(accounts.ownerId, userId),
    isNull(accounts.deletedAt),
  ),
})

// Get recent transfers for user
db.select()
  .from(transfers)
  .where(or(
    eq(transfers.fromAccountId, accountId),
    eq(transfers.toAccountId, accountId),
  ))
  .orderBy(desc(transfers.createdAt))
  .limit(50)

// Expiring holds (для background cleanup job)
db.select()
  .from(holds)
  .where(and(
    eq(holds.status, 'active'),
    lt(holds.expiresAt, new Date()),
  ))

// Reconciliation: sum per-account journal vs balance
db.select({
  accountId: accounts.id,
  currentBalance: accounts.balanceCents,
  journalSum: sql`SUM(CASE WHEN t.to_account_id = a.id THEN t.amount_cents
                            WHEN t.from_account_id = a.id THEN -t.amount_cents ELSE 0 END)`,
})
// → должно быть равно
```

## Reconciliation job (daily)

```typescript
// Temporal workflow — runs daily 02:00 UTC
async function reconcileWalletBalances() {
  const accounts = await db.select().from(accounts)
  for (const acc of accounts) {
    const sum = await calculateSumFromJournal(acc.id)
    if (sum !== acc.balanceCents) {
      await publishEvent('app.daria.wallet.reconciliation-mismatch.v1', {
        accountId: acc.id,
        expectedBalance: sum,
        actualBalance: acc.balanceCents,
        diff: acc.balanceCents - sum,
      })
      // Triggers SEV-1 alert через runbook wallet-transfer-failure-rate
    }
  }
}
```

## Indexes rationale

- `accounts_owner_idx`: fast lookup balances user's accounts.
- `accounts_type_idx`: reconciliation queries by account type.
- `transfers_from/to_account_idx`: user statement queries.
- `transfers_reference_idx`: find transfers related к payment/subscription/etc.
- `uniq_idempotency_key`: enforce idempotency.
- `holds_expires_idx WHERE status='active'`: partial index for cleanup cron.

## Phase 6 migration к TigerBeetle

Postgres → TigerBeetle:

```
Phase 5 end → freeze writes
Phase 6 start:
  - Migrate accounts table → TigerBeetle accounts (1:1 ID mapping)
  - Replay journal (chronologically) → TigerBeetle transfers
  - Verify balances match post-migration
  - Cutover: new writes → TigerBeetle, Postgres tables → read-only mirror
  - После 3 мес validation — drop Postgres ledger
```

Compatibility: TigerBeetle имеет near-identical semantics (double-entry, ACID), но 100x faster.
