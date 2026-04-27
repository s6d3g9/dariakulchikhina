/**
 * Tenders module types & Zod schemas.
 *
 * Single source of truth for the module — handlers in
 * `server/api/tenders/**` import schemas from here, never re-declare them.
 */

import { z } from 'zod'
import type {
  TenderRow,
  TenderIngestRequest,
  TenderIngestResponse,
  TenderSearchQuery,
  TenderSearchResult,
  TenderStatus,
} from '~/shared/types/tenders'
import { TENDER_STATUSES } from '~/shared/types/tenders'

// === Ingest ==================================================================

export const SourceIdSchema = z.enum([
  'zakupki',
  'torgi',
  'rts-tender',
  'sberbank-ast',
  'roseltorg',
  'tek-torg',
  'etp-gpb',
  'fabrikant',
  'rzd-etzp',
  'avtodor-tr',
  'gazprom-zakupki',
  'mos-zakupki',
])

export const TenderLawSchema = z.enum(['44-fz', '223-fz', 'imushestvo', 'other'])

/**
 * Single ingest item validation. Mirrors `UnifiedTender` from
 * `shared/types/tenders-ingest.ts` with HTTP-friendly coercion (numbers
 * accepted as strings, dates accepted as ISO strings).
 */
export const TenderIngestItemSchema = z.object({
  sourceId: SourceIdSchema,
  externalGuid: z.string().min(1).max(256),
  procedureType: z.string().min(1).max(128),
  law: TenderLawSchema,
  publishedAt: z.string().datetime({ offset: true }),
  customer: z.object({
    inn: z.string().min(10).max(12),
    kpp: z.string().min(9).max(9).optional(),
    name: z.string().min(1).max(512),
    region: z.string().min(2).max(8),
  }),
  title: z.string().min(1).max(2048),
  description: z.string().max(20_000).optional(),
  okpd2: z.array(z.string()).max(64),
  startPrice: z.number().nullable(),
  currency: z.literal('RUB'),
  deadlineAt: z.string().datetime({ offset: true }).nullable(),
  applicationStart: z.string().datetime({ offset: true }).optional(),
  applicationEnd: z.string().datetime({ offset: true }).optional(),
  documentsUrls: z.array(z.string().url()).max(256),
  rawPayloadHash: z.string().length(64),
  rawPayload: z.unknown(),
})

export const TenderIngestRequestSchema = z.object({
  sourceId: SourceIdSchema,
  idempotencyKey: z.string().min(8).max(128),
  items: z.array(TenderIngestItemSchema).min(1).max(500),
})

// === Search & status =========================================================

export const TenderStatusSchema = z.enum(TENDER_STATUSES as [TenderStatus, ...TenderStatus[]])

export const TenderSearchQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  okpd2: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  status: TenderStatusSchema.optional(),
  sourceId: SourceIdSchema.optional(),
})

export const TenderUpdateStatusSchema = z.object({
  status: TenderStatusSchema,
  /** OCC — caller must echo back the row's last seen `version`. */
  version: z.number().int().positive(),
})

// === Re-export shared shapes for convenience =================================

export type {
  TenderRow,
  TenderIngestRequest,
  TenderIngestResponse,
  TenderSearchQuery,
  TenderSearchResult,
  TenderStatus,
}
