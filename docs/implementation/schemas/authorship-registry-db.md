# Authorship-registry DB schema

Postgres `authorship_db` для `services/authorship-registry`. Royalty computation + template lineage + payout ledger mirror.

## Tables

### `templates_authorship`

Lightweight mirror of pattern-engine templates, с authorship-specific metadata.

```typescript
export const templatesAuthorship = pgTable('templates_authorship', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  patternId: uuid('pattern_id').notNull(),  // FK к pattern-engine
  
  authorId: varchar('author_id', { length: 64 }).notNull(),
  
  licenseKind: varchar('license_kind', { length: 32 }).notNull(),
  licenseVersion: varchar('license_version', { length: 16 }).notNull().default('1.0'),
  
  splitPolicyJson: jsonb('split_policy_json').$type<SplitPolicy>().notNull(),
  splitPolicyHash: varchar('split_policy_hash', { length: 64 }).notNull(),  // sha256
  
  priceCents: bigint('price_cents', { mode: 'bigint' }),
  currency: varchar('currency', { length: 3 }),
  
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
  
  // Content hash для integrity (template graph snapshot)
  contentHash: varchar('content_hash', { length: 64 }).notNull(),
  
  // On-chain mint info (optional)
  onchainMintTx: varchar('onchain_mint_tx', { length: 256 }),
  onchainNetwork: varchar('onchain_network', { length: 32 }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  patternIdx: unique('templates_authorship_pattern_idx').on(t.patternId),
  authorIdx: index('templates_authorship_author_idx').on(t.authorId, t.publishedAt),
  licenseIdx: index('templates_authorship_license_idx').on(t.licenseKind),
}))

interface SplitPolicy {
  splits: Array<{ party: string, share: number }>  // party: 'author' | 'platform' | 'tag:<id>' | 'user:<id>' | 'forks-lineage'
  forksLineageRule: 'equal' | 'geometric' | 'linear' | 'none'
  minDistributionCents: number
  dustPolicy: 'accumulate' | 'platform-fee'
  currency: string
}
```

### `royalty_distributions`

Append-only ledger of royalty distributions.

```typescript
export const royaltyDistributions = pgTable('royalty_distributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Purchase / subscription reference
  purchaseId: varchar('purchase_id', { length: 128 }).notNull(),
  templateId: uuid('template_id').references(() => templatesAuthorship.id).notNull(),
  buyerId: varchar('buyer_id', { length: 64 }).notNull(),
  
  // Amounts
  amountPaidCents: bigint('amount_paid_cents', { mode: 'bigint' }).notNull(),
  currencyPaid: varchar('currency_paid', { length: 3 }).notNull(),
  amountDistributedCents: bigint('amount_distributed_cents', { mode: 'bigint' }).notNull(),
  currencyDistributed: varchar('currency_distributed', { length: 3 }).notNull(),
  
  // FX
  fxRate: real('fx_rate'),
  fxTimestamp: timestamp('fx_timestamp', { withTimezone: true }),
  
  // Policy snapshot (immutable at distribution-time)
  policyHash: varchar('policy_hash', { length: 64 }).notNull(),
  policyVersion: bigint('policy_version', { mode: 'number' }).notNull(),
  forksLineageRule: varchar('forks_lineage_rule', { length: 16 }).notNull(),
  
  // Recipients breakdown (denormalized JSON для audit)
  recipients: jsonb('recipients').$type<Recipient[]>().notNull(),
  
  // Status
  status: varchar('status', { length: 16 }).notNull().default('completed'),
  // 'completed' | 'reversed'
  
  reversedByDistributionId: uuid('reversed_by_distribution_id').references((): any => royaltyDistributions.id),
  
  traceId: varchar('trace_id', { length: 64 }),
  distributedAt: timestamp('distributed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  purchaseIdx: unique('royalty_purchase_idx').on(t.purchaseId),
  templateIdx: index('royalty_template_idx').on(t.templateId, t.distributedAt),
  buyerIdx: index('royalty_buyer_idx').on(t.buyerId, t.distributedAt),
  authorIdx: index('royalty_recipients_gin').using('gin', t.recipients),  // GIN on JSONB
}))

interface Recipient {
  recipient: string   // 'u_xxx' | 'platform' | 'tag:<id>'
  amountCents: number
  role: 'author' | 'direct' | 'ancestor' | 'dust' | 'platform'
  generation?: number
  weight?: number
}
```

### `lineage_paths`

Denormalized ancestor chain per-template (fast lookup).

```typescript
export const lineagePaths = pgTable('lineage_paths', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  templateId: uuid('template_id').references(() => templatesAuthorship.id).notNull(),
  
  // Array [direct-parent, grandparent, ..., root]
  ancestorIds: jsonb('ancestor_ids').$type<string[]>().notNull(),
  depth: bigint('depth', { mode: 'number' }).notNull(),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  templateIdx: unique('lineage_template_idx').on(t.templateId),
  depthIdx: index('lineage_depth_idx').on(t.depth),
}))
```

### `disputes`

Authorship-claim disputes (stolen-content / fork-without-credit / similar-by-scheme).

```typescript
export const disputesTable = pgTable('disputes', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  claimantId: varchar('claimant_id', { length: 64 }).notNull(),
  respondentId: varchar('respondent_id', { length: 64 }).notNull(),
  
  templateInQuestionId: uuid('template_in_question_id').references(() => templatesAuthorship.id).notNull(),
  claimedOriginalId: uuid('claimed_original_id').references(() => templatesAuthorship.id),
  
  claimKind: varchar('claim_kind', { length: 32 }).notNull(),
  // 'stolen-content' | 'fork-without-credit' | 'similar-by-scheme-fraud'
  
  description: text('description').notNull(),
  evidence: jsonb('evidence').$type<Evidence[]>(),
  
  status: varchar('status', { length: 16 }).notNull().default('open'),
  // 'open' | 'investigating' | 'ruled-upheld' | 'ruled-rejected' | 'closed'
  
  ruling: text('ruling'),
  rulingBy: varchar('ruling_by', { length: 64 }),
  ruledAt: timestamp('ruled_at', { withTimezone: true }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  claimantIdx: index('disputes_claimant_idx').on(t.claimantId),
  templateIdx: index('disputes_template_idx').on(t.templateInQuestionId),
  statusIdx: index('disputes_status_idx').on(t.status),
}))

interface Evidence {
  kind: 'fingerprint-match' | 'timeline-proof' | 'manual-review' | 'user-statement'
  data: Record<string, unknown>
}
```

## Migration SQL

```sql
CREATE TABLE templates_authorship (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id uuid NOT NULL,
  author_id varchar(64) NOT NULL,
  license_kind varchar(32) NOT NULL,
  license_version varchar(16) NOT NULL DEFAULT '1.0',
  split_policy_json jsonb NOT NULL,
  split_policy_hash varchar(64) NOT NULL,
  price_cents bigint,
  currency varchar(3),
  published_at timestamptz NOT NULL,
  content_hash varchar(64) NOT NULL,
  onchain_mint_tx varchar(256),
  onchain_network varchar(32),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX templates_authorship_pattern_idx ON templates_authorship(pattern_id);
CREATE INDEX templates_authorship_author_idx ON templates_authorship(author_id, published_at);
CREATE INDEX templates_authorship_license_idx ON templates_authorship(license_kind);

CREATE TABLE royalty_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id varchar(128) NOT NULL,
  template_id uuid NOT NULL REFERENCES templates_authorship(id),
  buyer_id varchar(64) NOT NULL,
  amount_paid_cents bigint NOT NULL,
  currency_paid varchar(3) NOT NULL,
  amount_distributed_cents bigint NOT NULL,
  currency_distributed varchar(3) NOT NULL,
  fx_rate real,
  fx_timestamp timestamptz,
  policy_hash varchar(64) NOT NULL,
  policy_version bigint NOT NULL,
  forks_lineage_rule varchar(16) NOT NULL,
  recipients jsonb NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'completed',
  reversed_by_distribution_id uuid REFERENCES royalty_distributions(id),
  trace_id varchar(64),
  distributed_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX royalty_purchase_idx ON royalty_distributions(purchase_id);
CREATE INDEX royalty_template_idx ON royalty_distributions(template_id, distributed_at);
CREATE INDEX royalty_buyer_idx ON royalty_distributions(buyer_id, distributed_at);
CREATE INDEX royalty_recipients_gin ON royalty_distributions USING gin(recipients);

-- Integrity constraints
ALTER TABLE royalty_distributions ADD CONSTRAINT check_amount_positive CHECK (amount_paid_cents > 0);
ALTER TABLE royalty_distributions ADD CONSTRAINT check_distributed_matches 
  CHECK (amount_distributed_cents = (
    SELECT SUM((r->>'amountCents')::bigint) FROM jsonb_array_elements(recipients) r
  ));  -- NOTE: postgres doesn't support this directly, enforce in app

CREATE TABLE lineage_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates_authorship(id),
  ancestor_ids jsonb NOT NULL,
  depth bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX lineage_template_idx ON lineage_paths(template_id);
CREATE INDEX lineage_depth_idx ON lineage_paths(depth);

CREATE TABLE disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claimant_id varchar(64) NOT NULL,
  respondent_id varchar(64) NOT NULL,
  template_in_question_id uuid NOT NULL REFERENCES templates_authorship(id),
  claimed_original_id uuid REFERENCES templates_authorship(id),
  claim_kind varchar(32) NOT NULL,
  description text NOT NULL,
  evidence jsonb,
  status varchar(16) NOT NULL DEFAULT 'open',
  ruling text,
  ruling_by varchar(64),
  ruled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX disputes_claimant_idx ON disputes(claimant_id);
CREATE INDEX disputes_template_idx ON disputes(template_in_question_id);
CREATE INDEX disputes_status_idx ON disputes(status);
```

## Core algorithm: distributeRoyalty

Реальная TS implementation алгоритма из `32-authorship-algorithms.md`.

```typescript
// services/authorship-registry/src/distribute.ts
import { db } from './db'
import { templatesAuthorship, royaltyDistributions, lineagePaths } from './db/schema'
import { walletClient } from './wallet-client'

export interface DistributePurchaseInput {
  purchaseId: string
  templateId: string
  buyerId: string
  amountCents: bigint
  currency: string
  fxRateAtPurchase?: number
  traceId?: string
}

export interface DistributeResult {
  distributionId: string
  totalDistributedCents: bigint
  recipients: Array<{
    recipient: string
    amountCents: bigint
    role: string
    generation?: number
    weight?: number
  }>
}

export async function distributeRoyalty(
  input: DistributePurchaseInput,
): Promise<DistributeResult> {
  return await db.transaction(async (tx) => {
    // 1. Idempotency check
    const existing = await tx.query.royaltyDistributions.findFirst({
      where: eq(royaltyDistributions.purchaseId, input.purchaseId),
    })
    if (existing) {
      return reconstructResult(existing)
    }

    // 2. Load template + policy
    const template = await tx.query.templatesAuthorship.findFirst({
      where: eq(templatesAuthorship.id, input.templateId),
    })
    if (!template) throw new Error('TEMPLATE_NOT_FOUND')
    if (template.deletedAt) throw new Error('TEMPLATE_DELETED')

    const policy = template.splitPolicyJson as SplitPolicy
    
    // 3. Currency conversion if needed
    let distributedAmount = input.amountCents
    let distributedCurrency = input.currency
    let fxRate = 1.0
    
    if (template.currency && template.currency !== input.currency) {
      fxRate = input.fxRateAtPurchase ?? await getFxRate(input.currency, template.currency)
      distributedAmount = BigInt(Math.floor(Number(input.amountCents) * fxRate))
      distributedCurrency = template.currency
    }

    const recipients: Array<any> = []
    let totalAllocated = 0n

    // 4. Direct splits (non-lineage)
    for (const split of policy.splits) {
      if (split.party === 'forks-lineage') continue
      
      const amount = BigInt(Math.floor(Number(distributedAmount) * split.share))
      if (amount < BigInt(policy.minDistributionCents)) continue
      
      const recipient = resolveParty(split.party, template)
      recipients.push({
        recipient,
        amountCents: amount,
        role: split.party === 'author' ? 'author' : 'direct',
      })
      totalAllocated += amount
    }

    // 5. Lineage distribution
    const lineageSplit = policy.splits.find(s => s.party === 'forks-lineage')
    if (lineageSplit) {
      const lineageAmount = BigInt(Math.floor(Number(distributedAmount) * lineageSplit.share))
      
      const lineagePath = await tx.query.lineagePaths.findFirst({
        where: eq(lineagePaths.templateId, input.templateId),
      })
      const ancestors = lineagePath?.ancestorIds ?? []
      
      if (ancestors.length > 0 && policy.forksLineageRule !== 'none') {
        const weights = computeWeights(ancestors.length, policy.forksLineageRule)
        
        for (let i = 0; i < ancestors.length; i++) {
          const ancestorId = ancestors[i]
          const amount = BigInt(Math.floor(Number(lineageAmount) * weights[i]))
          
          if (amount >= BigInt(policy.minDistributionCents)) {
            // Get ancestor author
            const ancestor = await tx.query.templatesAuthorship.findFirst({
              where: eq(templatesAuthorship.id, ancestorId),
            })
            if (!ancestor || ancestor.deletedAt) {
              // Orphan royalty → platform
              recipients.push({
                recipient: 'platform.orphan-royalty',
                amountCents: amount,
                role: 'dust',
              })
            } else {
              recipients.push({
                recipient: ancestor.authorId,
                amountCents: amount,
                role: 'ancestor',
                generation: i + 1,
                weight: weights[i],
              })
            }
            totalAllocated += amount
          }
        }
      }
    }

    // 6. Dust
    const dust = distributedAmount - totalAllocated
    if (dust > 0n) {
      recipients.push({
        recipient: policy.dustPolicy === 'platform-fee' ? 'platform' : 'platform.dust-accumulator',
        amountCents: dust,
        role: 'dust',
      })
      totalAllocated += dust
    }

    // 7. Integrity check
    if (totalAllocated !== distributedAmount) {
      throw new Error(`Integrity violation: ${totalAllocated} != ${distributedAmount}`)
    }

    // 8. Execute transfers (atomically in wallet)
    const transferPromises = recipients
      .filter(r => r.amountCents > 0n)
      .map(r => walletClient.transfer({
        fromAccountId: `purchase-escrow:${input.purchaseId}`,
        toAccount: resolveAccountForRecipient(r.recipient, distributedCurrency),
        amountCents: r.amountCents,
        currency: distributedCurrency,
        kind: 'royalty',
        referenceType: 'royalty-distribution',
        referenceId: input.purchaseId,
        idempotencyKey: `royalty-${input.purchaseId}-${r.recipient}`,
        traceId: input.traceId,
      }))
    await Promise.all(transferPromises)

    // 9. Record distribution
    const [distribution] = await tx.insert(royaltyDistributions).values({
      purchaseId: input.purchaseId,
      templateId: input.templateId,
      buyerId: input.buyerId,
      amountPaidCents: input.amountCents,
      currencyPaid: input.currency,
      amountDistributedCents: distributedAmount,
      currencyDistributed: distributedCurrency,
      fxRate,
      fxTimestamp: fxRate !== 1.0 ? new Date() : null,
      policyHash: template.splitPolicyHash,
      policyVersion: 1,
      forksLineageRule: policy.forksLineageRule,
      recipients: recipients.map(r => ({
        ...r,
        amountCents: Number(r.amountCents),  // JSON-safe
      })),
      traceId: input.traceId,
    }).returning()

    // 10. Publish event
    await publishEvent('app.daria.authorship.royalty-distributed.v1', {
      purchaseId: input.purchaseId,
      templateId: input.templateId,
      buyerId: input.buyerId,
      amountPaidCents: input.amountCents.toString(),
      currencyPaid: input.currency,
      amountDistributedCents: distributedAmount.toString(),
      currencyDistributed: distributedCurrency,
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
    })

    return {
      distributionId: distribution.id,
      totalDistributedCents: distributedAmount,
      recipients: recipients.map(r => ({
        recipient: r.recipient,
        amountCents: r.amountCents,
        role: r.role,
        generation: r.generation,
        weight: r.weight,
      })),
    }
  })
}

function computeWeights(n: number, rule: string): number[] {
  switch (rule) {
    case 'geometric': {
      const weights = Array.from({ length: n }, (_, i) => Math.pow(0.5, i + 1))
      const sum = weights.reduce((a, b) => a + b, 0)
      return weights.map(w => w / sum)  // normalize
    }
    case 'linear': {
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

function resolveParty(party: string, template: any): string {
  if (party === 'author') return template.authorId
  if (party === 'platform') return 'platform'
  if (party.startsWith('tag:')) return party
  if (party.startsWith('user:')) return party.slice(5)
  throw new Error(`Unknown party: ${party}`)
}

function resolveAccountForRecipient(recipient: string, currency: string): string {
  // Lookup или create wallet account для recipient в given currency
  // Implementation зависит от wallet API
  return `wallet.account:${recipient}:${currency}`
}
```

## Query patterns

```typescript
// Creator revenue over time
db.select({
  month: sql`date_trunc('month', ${royaltyDistributions.distributedAt})`,
  totalCents: sql`SUM((r->>'amountCents')::bigint)`,
})
.from(royaltyDistributions)
.innerJoin(sql`jsonb_array_elements(recipients) r`)
.where(sql`r->>'recipient' = ${authorId}`)
.groupBy(sql`1`)
.orderBy(sql`1 desc`)

// Forks graph для template (all descendants via lineage)
db.select()
  .from(lineagePaths)
  .where(sql`ancestor_ids @> ${JSON.stringify([templateId])}`)

// Top royalty earners (creator fairness tracking)
db.select({
  authorId: sql`r->>'recipient'`,
  totalCents: sql`SUM((r->>'amountCents')::bigint)`,
})
.from(royaltyDistributions)
.innerJoin(sql`jsonb_array_elements(recipients) r`)
.where(sql`r->>'role' IN ('author', 'ancestor')`)
.groupBy(sql`1`)
.orderBy(sql`2 desc`)
.limit(20)
```

## Integration с wallet

`services/authorship-registry/src/wallet-client.ts`:

```typescript
export class WalletClient {
  constructor(private baseUrl: string, private jwt: string) {}

  async transfer(params: {
    fromAccountId: string
    toAccount: string  // special syntax: wallet.account:<owner>:<currency>
    amountCents: bigint
    currency: string
    kind: 'royalty'
    referenceType: string
    referenceId: string
    idempotencyKey: string
    traceId?: string
  }): Promise<{ transferId: string }> {
    // Resolve toAccount to actual account ID
    const toAccountId = await this.ensureAccount(params.toAccount)

    const response = await fetch(`${this.baseUrl}/v1/transfers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.jwt}`,
        'Idempotency-Key': params.idempotencyKey,
        'Content-Type': 'application/json',
        ...(params.traceId && { 'traceparent': params.traceId }),
      },
      body: JSON.stringify({
        fromAccountId: params.fromAccountId,
        toAccountId,
        amountCents: params.amountCents.toString(),
        currency: params.currency,
        kind: params.kind,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
      }),
    })
    if (!response.ok) throw new Error(`wallet.transfer failed: ${response.status}`)
    return response.json()
  }

  private async ensureAccount(spec: string): Promise<string> {
    // Parse "wallet.account:<owner>:<currency>"
    const [, ownerSpec, currency] = spec.split(':')
    // Find-or-create via wallet API
    // ...
    return 'resolved-uuid'
  }
}
```

## Events

**Publishes:**
- `app.daria.authorship.template-published.v1`
- `app.daria.authorship.template-forked.v1`
- `app.daria.authorship.royalty-distributed.v1`
- `app.daria.authorship.license-changed.v1`
- `app.daria.authorship.dispute-opened.v1`
- `app.daria.authorship.dispute-ruled.v1`
- `app.daria.authorship.reversal-completed.v1`

**Consumes:**
- `app.daria.payments.payment-confirmed.v1` → trigger distribute
- `app.daria.subscription-engine.subscription-activated.v1` → trigger distribute
- `app.daria.pattern.forked.v1` → register fork + update lineage
- `app.daria.pattern.published-as-template.v1` → register authorship
- `app.daria.disputes.ruling.v1` → potential reversal

## Testing

```typescript
describe('distributeRoyalty', () => {
  test('geometric distribution with 3 ancestors', async () => {
    const template = await seedTemplate({
      authorId: 'carol',
      splitPolicy: {
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
    })
    
    // Ancestors: [Alice, Bob, Carol] — wait, Carol is author
    // Actually: Alice → Bob → Carol, so ancestors of Carol's template = [Bob, Alice]
    await setLineage(template.id, ['bob-template', 'alice-template'])

    const result = await distributeRoyalty({
      purchaseId: 'p_test_1',
      templateId: template.id,
      buyerId: 'dmitry',
      amountCents: 2000n,  // $20
      currency: 'USD',
    })

    expect(result.totalDistributedCents).toBe(2000n)
    
    const recipients = result.recipients
    const author = recipients.find(r => r.recipient === 'carol')
    expect(author?.amountCents).toBe(1400n)  // 70%
    
    const platform = recipients.find(r => r.recipient === 'platform')
    expect(platform?.amountCents).toBe(200n)  // 10%
    
    const tagFund = recipients.find(r => r.recipient === 'tag:music-fund')
    expect(tagFund?.amountCents).toBe(100n)  // 5%
    
    const bobAncestor = recipients.find(r => r.recipient === 'bob' && r.generation === 1)
    expect(bobAncestor?.amountCents).toBe(200n)  // 15% × 2/3 ≈ 10%
    
    const aliceAncestor = recipients.find(r => r.recipient === 'alice' && r.generation === 2)
    expect(aliceAncestor?.amountCents).toBe(100n)  // 15% × 1/3 ≈ 5%
  })

  test('idempotent — re-distribute returns same result', async () => {
    const first = await distributeRoyalty({...})
    const second = await distributeRoyalty({...})
    expect(first.distributionId).toBe(second.distributionId)
  })

  test('orphan-ancestor → dust accumulator', async () => {
    // Delete ancestor author
    // Verify amount → platform.orphan-royalty
  })
})
```
