/**
 * Tenders domain DB schema.
 *
 * Two tables:
 *  - `tenders` — one row per (sourceId, externalGuid). Mutable, OCC + soft-delete.
 *  - `tender_events` — append-only audit log (matched / status_changed / analyzed / ...).
 *
 * Spec: docs/architecture-v5/25-tenders-platform.md §4.1.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

const tstz = (name: string) => timestamp(name, { withTimezone: true })

export const tenders = pgTable(
  'tenders',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Source attribution & natural key
    sourceId: text('source_id').notNull(),
    externalGuid: text('external_guid').notNull(),

    // Procedure metadata
    law: text('law').notNull(), // '44-fz' | '223-fz' | 'imushestvo' | 'other'
    procedureType: text('procedure_type').notNull(),
    publishedAt: tstz('published_at').notNull(),

    // Customer
    customerInn: text('customer_inn').notNull(),
    customerKpp: text('customer_kpp'),
    customerName: text('customer_name').notNull(),
    /** ISO 3166-2:RU after mapper normalization. */
    customerRegion: text('customer_region').notNull(),

    // Content
    title: text('title').notNull(),
    description: text('description'),
    okpd2: text('okpd2').array().notNull().default(sql`'{}'::text[]`),
    startPrice: numeric('start_price', { precision: 18, scale: 2 }),
    currency: text('currency').notNull().default('RUB'),
    deadlineAt: tstz('deadline_at'),
    applicationStart: tstz('application_start'),
    applicationEnd: tstz('application_end'),
    documentsUrls: text('documents_urls')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    rawPayloadHash: text('raw_payload_hash').notNull(),
    rawPayload: jsonb('raw_payload').notNull(),

    // Analytics layer (W3+, nullable until scoring runs)
    relevanceScore: numeric('relevance_score', { precision: 5, scale: 2 }),
    marginScore: numeric('margin_score', { precision: 5, scale: 2 }),
    status: text('status').notNull().default('new'),

    // v5 invariants
    createdAt: tstz('created_at').defaultNow().notNull(),
    updatedAt: tstz('updated_at').defaultNow().notNull(),
    version: integer('version').notNull().default(1),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [
    // Natural key — idempotent ingest via ON CONFLICT (source_id, external_guid).
    uniqueIndex('tenders_source_guid_unique')
      .on(t.sourceId, t.externalGuid)
      .where(sql`deleted_at is null`),
    index('tenders_published_idx').on(t.publishedAt),
    index('tenders_region_idx').on(t.customerRegion),
    index('tenders_status_idx').on(t.status),
    // GIN index on okpd2 array — search by category prefix uses
    // `okpd2 && ARRAY[...]` (overlap), accelerated by GIN.
    index('tenders_okpd_gin').using('gin', t.okpd2),
  ],
)

export const tenderEvents = pgTable(
  'tender_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenderId: uuid('tender_id')
      .notNull()
      .references(() => tenders.id, { onDelete: 'cascade' }),
    /**
     * Event kind, e.g. 'matched' | 'status_changed' | 'analyzed' |
     * 'ingest_updated'. Free-form string so the events table never
     * blocks adding a new event source.
     */
    type: text('type').notNull(),
    /** UUID of the actor (user/agent); null for system events. */
    actorId: uuid('actor_id'),
    payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
    createdAt: tstz('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('tender_events_tender_idx').on(t.tenderId, t.createdAt),
  ],
)
