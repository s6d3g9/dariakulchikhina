# Ownership-registry DB schema

Postgres `ownership_db`. Universal ownership graph — physical + digital assets. Generalizes authorship-registry.

## Tables

### `assets`

```typescript
export const assetKindEnum = pgEnum('asset_kind', [
  'car', 'motorbike', 'boat', 'aircraft', 'rv',
  'real-estate-apartment', 'real-estate-house', 'real-estate-commercial', 'real-estate-land',
  'collectible', 'equipment', 'instrument', 'jewelry',
  'livestock', 'pet',
  'digital-template', 'digital-asset', 'subscription-right',
])

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  kind: assetKindEnum('kind').notNull(),
  
  // External registry references (VIN, кадастровый номер, ISBN, etc)
  externalRegistryKind: varchar('external_registry_kind', { length: 32 }),
  // 'vin' | 'cadastre-ru' | 'cadastre-us' | 'hull-id' | 'isbn' | 'on-chain' | ...
  externalRegistryId: varchar('external_registry_id', { length: 256 }),
  
  // Display
  title: varchar('title', { length: 256 }).notNull(),
  summary: text('summary'),
  
  // Type reference (linking instance → type)
  typeRef: jsonb('type_ref').$type<{
    kind: string          // 'car-model' | 'real-estate-project' | ...
    id: string
    displayName?: string
  }>(),
  
  // Attributes — kind-specific
  attributes: jsonb('attributes').$type<Record<string, unknown>>().default({}),
  // Examples:
  //   car: { vin, make, model, year, color, mileage, license_plate }
  //   real-estate: { address, area_sqm, floor, rooms, cadastral_number }
  //   collectible: { category, provenance, condition }
  
  // Financial (optional — current valuation)
  valuation: jsonb('valuation').$type<{
    amountCents: string
    currency: string
    asOf: string
    source: string
  }>(),
  
  // System
  version: bigint('version', { mode: 'number' }).notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => ({
  kindIdx: index('assets_kind_idx').on(t.kind),
  externalIdx: index('assets_external_idx').on(t.externalRegistryKind, t.externalRegistryId),
  typeRefIdx: index('assets_type_ref_idx')
    .on(sql`(type_ref->>'kind')`, sql`(type_ref->>'id')`),
}))
```

### `ownerships`

Who currently owns the asset. May be fractional (boat-club, timeshare, real-estate partnership).

```typescript
export const ownershipStatusEnum = pgEnum('ownership_status', ['active', 'transferred', 'dissolved'])

export const ownerships = pgTable('ownerships', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  assetId: uuid('asset_id').references(() => assets.id).notNull(),
  ownerId: varchar('owner_id', { length: 64 }).notNull(),
  ownerType: varchar('owner_type', { length: 16 }).notNull(),
  // 'user' | 'company' | 'trust' | 'platform'
  
  // Share (для fractional ownership)
  sharePercentage: numeric('share_percentage', { precision: 10, scale: 7 }).notNull().default('100.0000000'),
  // 100.0 для sole ownership
  // 33.3333333 для 3-way split
  
  role: varchar('role', { length: 32 }).notNull().default('owner'),
  // 'owner' | 'co-owner' | 'beneficiary' | 'custodian' | 'trustee'
  
  status: ownershipStatusEnum('status').notNull().default('active'),
  
  // Acquisition
  acquiredAt: timestamp('acquired_at', { withTimezone: true }).notNull(),
  acquiredVia: varchar('acquired_via', { length: 32 }).notNull(),
  // 'purchase' | 'inherit' | 'gift' | 'mint' | 'fork' | 'transfer' | 'court-order'
  acquiredReferenceType: varchar('acquired_reference_type', { length: 32 }),
  acquiredReferenceId: varchar('acquired_reference_id', { length: 128 }),
  acquisitionPriceCents: bigint('acquisition_price_cents', { mode: 'bigint' }),
  acquisitionCurrency: varchar('acquisition_currency', { length: 3 }),
  
  // Transfer-out (if status != 'active')
  transferredAt: timestamp('transferred_at', { withTimezone: true }),
  transferredToOwnershipId: uuid('transferred_to_ownership_id').references((): any => ownerships.id),
  
  // System
  version: bigint('version', { mode: 'number' }).notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  assetIdx: index('ownerships_asset_idx').on(t.assetId, t.status),
  ownerIdx: index('ownerships_owner_idx').on(t.ownerId, t.status),
  activeUnique: uniqueIndex('ownerships_active_unique')
    .on(t.assetId, t.ownerId, t.role)
    .where(sql`status = 'active'`),
  // Sum constraint not enforceable в DB (check в code)
}))
```

### `ownership_transfers`

Transaction history — every ownership change is a transfer record.

```typescript
export const ownershipTransfers = pgTable('ownership_transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  assetId: uuid('asset_id').references(() => assets.id).notNull(),
  
  fromOwnershipId: uuid('from_ownership_id').references(() => ownerships.id),  // null для initial
  toOwnershipId: uuid('to_ownership_id').references(() => ownerships.id).notNull(),
  
  // What % transferred (could be partial)
  sharePercentage: numeric('share_percentage', { precision: 10, scale: 7 }).notNull(),
  
  transferKind: varchar('transfer_kind', { length: 32 }).notNull(),
  // 'initial-mint' | 'sale' | 'gift' | 'inherit' | 'court-order' | 'fork' | 'merger'
  
  // Financial details (if applicable)
  priceCents: bigint('price_cents', { mode: 'bigint' }),
  currency: varchar('currency', { length: 3 }),
  
  // Escrow
  escrowId: uuid('escrow_id'),
  
  // Reference to broader transaction context
  referenceType: varchar('reference_type', { length: 32 }),
  referenceId: varchar('reference_id', { length: 128 }),
  
  // Legal documents
  legalDocsRefs: jsonb('legal_docs_refs').$type<string[]>().default([]),
  // media-pipeline references — contracts, deeds, bills of sale
  
  // Idempotency
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull().unique(),
  
  // System
  traceId: varchar('trace_id', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  assetIdx: index('transfers_asset_idx').on(t.assetId, t.createdAt),
  fromIdx: index('transfers_from_idx').on(t.fromOwnershipId),
  toIdx: index('transfers_to_idx').on(t.toOwnershipId),
  referenceIdx: index('transfers_reference_idx').on(t.referenceType, t.referenceId),
}))
```

### `liens`

Encumbrances on asset (mortgage, loan collateral, court-hold).

```typescript
export const lienStatusEnum = pgEnum('lien_status', ['active', 'released', 'defaulted', 'disputed'])

export const liens = pgTable('liens', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  assetId: uuid('asset_id').references(() => assets.id).notNull(),
  
  kind: varchar('kind', { length: 32 }).notNull(),
  // 'mortgage' | 'loan-collateral' | 'court-order' | 'tax-lien' | 'repair-lien'
  
  lienholderId: varchar('lienholder_id', { length: 64 }).notNull(),
  lienholderType: varchar('lienholder_type', { length: 16 }).notNull(),
  // 'user' | 'bank' | 'government' | 'company'
  
  // Amount secured
  principalCents: bigint('principal_cents', { mode: 'bigint' }),
  outstandingCents: bigint('outstanding_cents', { mode: 'bigint' }),
  currency: varchar('currency', { length: 3 }),
  
  // Priority (1 = first lien)
  priority: bigint('priority', { mode: 'number' }).notNull().default(1),
  
  status: lienStatusEnum('status').notNull().default('active'),
  
  // Terms
  terms: jsonb('terms').$type<Record<string, unknown>>(),
  // { interestRate, termMonths, paymentFrequency, ... }
  
  // Lifecycle
  attachedAt: timestamp('attached_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  releaseReason: varchar('release_reason', { length: 64 }),
  
  // Reference к financing-service loan
  financingContractId: uuid('financing_contract_id'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  assetIdx: index('liens_asset_idx').on(t.assetId, t.status),
  lienholderIdx: index('liens_lienholder_idx').on(t.lienholderId),
  statusIdx: index('liens_status_idx').on(t.status),
}))
```

### `authorship_link`

Digital assets — link to authorship-registry (if applicable).

```typescript
export const authorshipLink = pgTable('authorship_link', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  assetId: uuid('asset_id').references(() => assets.id).notNull().unique(),
  
  // Reference к authorship-registry template
  templateId: uuid('template_id').notNull(),
  
  // Edition info (для multi-edition digital assets)
  editionNumber: bigint('edition_number', { mode: 'number' }),
  totalEditions: bigint('total_editions', { mode: 'number' }),
  
  // On-chain (optional)
  onchainNetwork: varchar('onchain_network', { length: 32 }),
  onchainContractAddress: varchar('onchain_contract_address', { length: 128 }),
  onchainTokenId: varchar('onchain_token_id', { length: 256 }),
  onchainTxHash: varchar('onchain_tx_hash', { length: 256 }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  templateIdx: index('authorship_link_template_idx').on(t.templateId),
  editionIdx: index('authorship_link_edition_idx').on(t.templateId, t.editionNumber),
  onchainIdx: index('authorship_link_onchain_idx').on(t.onchainNetwork, t.onchainContractAddress, t.onchainTokenId),
}))
```

## Core operation: transferOwnership

```typescript
async function transferOwnership(params: {
  assetId: string
  fromOwnershipId: string | null  // null для initial
  toOwnerId: string
  toOwnerType: string
  sharePercentage: number  // 0.0 to 100.0
  transferKind: string
  priceCents?: bigint
  currency?: string
  escrowId?: string
  idempotencyKey: string
  traceId?: string
}): Promise<TransferResult> {
  return db.transaction(async (tx) => {
    // 1. Idempotency
    const existing = await tx.query.ownershipTransfers.findFirst({
      where: eq(ownershipTransfers.idempotencyKey, params.idempotencyKey),
    })
    if (existing) return reconstructResult(existing)

    // 2. Validate asset exists, не liens-encumbered beyond allowed
    const asset = await tx.query.assets.findFirst({
      where: eq(assets.id, params.assetId),
    })
    if (!asset) throw new Error('ASSET_NOT_FOUND')

    const activeLiens = await tx.query.liens.findMany({
      where: and(eq(liens.assetId, params.assetId), eq(liens.status, 'active')),
    })
    
    // Some kinds of liens block transfer (mortgage без lienholder consent, etc.)
    for (const lien of activeLiens) {
      if (lien.kind === 'mortgage' && !params.lienholderConsent) {
        throw new Error('MORTGAGE_CONSENT_REQUIRED')
      }
      if (lien.kind === 'court-order') {
        throw new Error('COURT_ORDER_BLOCKS_TRANSFER')
      }
    }

    // 3. Handle outgoing ownership (if any)
    let fromOwnership: Ownership | null = null
    if (params.fromOwnershipId) {
      fromOwnership = await tx.query.ownerships.findFirst({
        where: eq(ownerships.id, params.fromOwnershipId),
      })
      if (!fromOwnership) throw new Error('FROM_OWNERSHIP_NOT_FOUND')
      if (fromOwnership.status !== 'active') throw new Error('FROM_OWNERSHIP_NOT_ACTIVE')

      // Split check
      if (Number(fromOwnership.sharePercentage) < params.sharePercentage) {
        throw new Error('INSUFFICIENT_SHARE')
      }
    }

    // 4. Create or update destination ownership
    const existingToOwnership = await tx.query.ownerships.findFirst({
      where: and(
        eq(ownerships.assetId, params.assetId),
        eq(ownerships.ownerId, params.toOwnerId),
        eq(ownerships.status, 'active'),
      ),
    })

    let toOwnership: Ownership
    if (existingToOwnership) {
      // Add to existing share
      const newShare = Number(existingToOwnership.sharePercentage) + params.sharePercentage
      
      const [updated] = await tx.update(ownerships)
        .set({
          sharePercentage: newShare.toFixed(7),
          version: existingToOwnership.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(ownerships.id, existingToOwnership.id))
        .returning()
      toOwnership = updated
    } else {
      // Create new ownership
      const [created] = await tx.insert(ownerships).values({
        assetId: params.assetId,
        ownerId: params.toOwnerId,
        ownerType: params.toOwnerType,
        sharePercentage: params.sharePercentage.toFixed(7),
        acquiredAt: new Date(),
        acquiredVia: params.transferKind,
        acquiredReferenceType: 'transfer',
        acquiredReferenceId: undefined,  // set below
        acquisitionPriceCents: params.priceCents,
        acquisitionCurrency: params.currency,
      }).returning()
      toOwnership = created
    }

    // 5. Update source ownership (reduce или dissolve)
    if (fromOwnership) {
      const newShare = Number(fromOwnership.sharePercentage) - params.sharePercentage
      
      if (newShare < 0.0001) {
        // Fully transferred — mark dissolved
        await tx.update(ownerships)
          .set({
            status: 'transferred',
            transferredAt: new Date(),
            transferredToOwnershipId: toOwnership.id,
            version: fromOwnership.version + 1,
          })
          .where(eq(ownerships.id, fromOwnership.id))
      } else {
        // Partial — reduce share
        await tx.update(ownerships)
          .set({
            sharePercentage: newShare.toFixed(7),
            version: fromOwnership.version + 1,
          })
          .where(eq(ownerships.id, fromOwnership.id))
      }
    }

    // 6. Record transfer
    const [transfer] = await tx.insert(ownershipTransfers).values({
      assetId: params.assetId,
      fromOwnershipId: params.fromOwnershipId,
      toOwnershipId: toOwnership.id,
      sharePercentage: params.sharePercentage.toFixed(7),
      transferKind: params.transferKind,
      priceCents: params.priceCents,
      currency: params.currency,
      escrowId: params.escrowId,
      idempotencyKey: params.idempotencyKey,
      traceId: params.traceId,
    }).returning()

    // 7. Verify total shares = 100%
    const totalShares = await tx.select({
      sum: sql`SUM(share_percentage)`,
    })
      .from(ownerships)
      .where(and(
        eq(ownerships.assetId, params.assetId),
        eq(ownerships.status, 'active'),
      ))
      .then(r => Number(r[0].sum))

    if (Math.abs(totalShares - 100) > 0.001) {
      throw new Error(`OWNERSHIP_SUM_INVALID: ${totalShares}`)
    }

    // 8. Publish event
    await publishEvent('app.daria.ownership.asset-transferred.v1', {
      assetId: params.assetId,
      transferId: transfer.id,
      fromOwnershipId: params.fromOwnershipId,
      toOwnershipId: toOwnership.id,
      toOwnerId: params.toOwnerId,
      sharePercentage: params.sharePercentage,
      transferKind: params.transferKind,
      priceCents: params.priceCents?.toString(),
      currency: params.currency,
      transferredAt: transfer.createdAt.toISOString(),
      traceId: params.traceId,
    })

    return { transferId: transfer.id, toOwnershipId: toOwnership.id }
  })
}
```

## Migration SQL

```sql
CREATE TYPE asset_kind AS ENUM (...);  -- full list from schema
CREATE TYPE ownership_status AS ENUM ('active', 'transferred', 'dissolved');
CREATE TYPE lien_status AS ENUM ('active', 'released', 'defaulted', 'disputed');

CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind asset_kind NOT NULL,
  external_registry_kind varchar(32),
  external_registry_id varchar(256),
  title varchar(256) NOT NULL,
  summary text,
  type_ref jsonb,
  attributes jsonb DEFAULT '{}'::jsonb,
  valuation jsonb,
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX assets_kind_idx ON assets(kind);
CREATE INDEX assets_external_idx ON assets(external_registry_kind, external_registry_id);
CREATE INDEX assets_type_ref_idx ON assets ((type_ref->>'kind'), (type_ref->>'id'));

CREATE TABLE ownerships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id),
  owner_id varchar(64) NOT NULL,
  owner_type varchar(16) NOT NULL,
  share_percentage numeric(10,7) NOT NULL DEFAULT 100.0000000,
  role varchar(32) NOT NULL DEFAULT 'owner',
  status ownership_status NOT NULL DEFAULT 'active',
  acquired_at timestamptz NOT NULL,
  acquired_via varchar(32) NOT NULL,
  acquired_reference_type varchar(32),
  acquired_reference_id varchar(128),
  acquisition_price_cents bigint,
  acquisition_currency varchar(3),
  transferred_at timestamptz,
  transferred_to_ownership_id uuid REFERENCES ownerships(id),
  version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (share_percentage > 0 AND share_percentage <= 100),
  CHECK (status != 'transferred' OR transferred_at IS NOT NULL)
);
CREATE INDEX ownerships_asset_idx ON ownerships(asset_id, status);
CREATE INDEX ownerships_owner_idx ON ownerships(owner_id, status);
CREATE UNIQUE INDEX ownerships_active_unique ON ownerships(asset_id, owner_id, role) WHERE status = 'active';

CREATE TABLE ownership_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id),
  from_ownership_id uuid REFERENCES ownerships(id),
  to_ownership_id uuid NOT NULL REFERENCES ownerships(id),
  share_percentage numeric(10,7) NOT NULL,
  transfer_kind varchar(32) NOT NULL,
  price_cents bigint,
  currency varchar(3),
  escrow_id uuid,
  reference_type varchar(32),
  reference_id varchar(128),
  legal_docs_refs jsonb DEFAULT '[]'::jsonb,
  idempotency_key varchar(128) NOT NULL UNIQUE,
  trace_id varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transfers_asset_idx ON ownership_transfers(asset_id, created_at);
CREATE INDEX transfers_from_idx ON ownership_transfers(from_ownership_id);
CREATE INDEX transfers_to_idx ON ownership_transfers(to_ownership_id);
CREATE INDEX transfers_reference_idx ON ownership_transfers(reference_type, reference_id);

CREATE TABLE liens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id),
  kind varchar(32) NOT NULL,
  lienholder_id varchar(64) NOT NULL,
  lienholder_type varchar(16) NOT NULL,
  principal_cents bigint,
  outstanding_cents bigint,
  currency varchar(3),
  priority bigint NOT NULL DEFAULT 1,
  status lien_status NOT NULL DEFAULT 'active',
  terms jsonb,
  attached_at timestamptz NOT NULL,
  expires_at timestamptz,
  released_at timestamptz,
  release_reason varchar(64),
  financing_contract_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX liens_asset_idx ON liens(asset_id, status);
CREATE INDEX liens_lienholder_idx ON liens(lienholder_id);
CREATE INDEX liens_status_idx ON liens(status);

CREATE TABLE authorship_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL UNIQUE REFERENCES assets(id),
  template_id uuid NOT NULL,
  edition_number bigint,
  total_editions bigint,
  onchain_network varchar(32),
  onchain_contract_address varchar(128),
  onchain_token_id varchar(256),
  onchain_tx_hash varchar(256),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX authorship_link_template_idx ON authorship_link(template_id);
CREATE INDEX authorship_link_edition_idx ON authorship_link(template_id, edition_number);
CREATE INDEX authorship_link_onchain_idx ON authorship_link(onchain_network, onchain_contract_address, onchain_token_id);
```

## Key queries

```typescript
// Get current owners of asset (все active ownerships)
db.query.ownerships.findMany({
  where: and(
    eq(ownerships.assetId, assetId),
    eq(ownerships.status, 'active'),
  ),
})

// Assets owned by user
db.query.ownerships.findMany({
  where: and(
    eq(ownerships.ownerId, userId),
    eq(ownerships.status, 'active'),
  ),
  with: { asset: true },
})

// Transfer history of asset
db.query.ownershipTransfers.findMany({
  where: eq(ownershipTransfers.assetId, assetId),
  orderBy: [asc(ownershipTransfers.createdAt)],
  with: { fromOwnership: true, toOwnership: true },
})

// Assets with active liens (e.g. with outstanding mortgage)
db.select()
  .from(assets)
  .innerJoin(liens, and(
    eq(liens.assetId, assets.id),
    eq(liens.status, 'active'),
    eq(liens.kind, 'mortgage'),
  ))
  .where(isNull(assets.deletedAt))
```

## Constraints & invariants

- `share_percentage > 0 AND <= 100` (DB check)
- Total active shares per-asset must sum to 100 (verified в transfer code, периодически reconciled)
- Transfers are append-only (no deletes).
- Mortgage-attached assets can't transfer без lienholder consent (enforced в code).
- Court-order liens block transfers.
