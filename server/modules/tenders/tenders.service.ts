/**
 * Tenders service — read-side orchestration. Search, fetch, and (W3+)
 * status transitions go through here. Ingest is its own service file.
 */

import * as repo from './tenders.repository'
import { TenderNotFoundError } from './tenders.errors'
import type {
  TenderSearchQuery,
  TenderSearchResult,
  TenderRow,
} from '~/shared/types/tenders'

export async function searchTenders(
  query: TenderSearchQuery,
): Promise<TenderSearchResult> {
  const limit = query.limit ?? 50
  const result = await repo.listTenders({
    cursor: query.cursor,
    limit,
    okpd2: query.okpd2,
    regions: query.regions,
    status: query.status,
    sourceId: query.sourceId,
  })
  return {
    items: result.items.map(mapDbRow),
    nextCursor: result.nextCursor,
  }
}

export async function getTenderById(id: string): Promise<TenderRow> {
  const row = await repo.findTenderById(id)
  if (!row) throw new TenderNotFoundError(id)
  return mapDbRow(row)
}

// === Helpers =================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- drizzle row type is inferred
function mapDbRow(row: any): TenderRow {
  return {
    id: row.id,
    sourceId: row.sourceId,
    externalGuid: row.externalGuid,
    law: row.law,
    procedureType: row.procedureType,
    publishedAt: row.publishedAt instanceof Date ? row.publishedAt.toISOString() : row.publishedAt,
    customer: {
      inn: row.customerInn,
      kpp: row.customerKpp,
      name: row.customerName,
      region: row.customerRegion,
    },
    title: row.title,
    description: row.description,
    okpd2: row.okpd2 ?? [],
    startPrice: row.startPrice,
    currency: row.currency,
    deadlineAt: toIso(row.deadlineAt),
    applicationStart: toIso(row.applicationStart),
    applicationEnd: toIso(row.applicationEnd),
    documentsUrls: row.documentsUrls ?? [],
    status: row.status,
    relevanceScore: row.relevanceScore == null ? null : Number(row.relevanceScore),
    marginScore: row.marginScore == null ? null : Number(row.marginScore),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  }
}

function toIso(d: Date | string | null | undefined): string | null {
  if (d == null) return null
  if (d instanceof Date) return d.toISOString()
  return d
}
