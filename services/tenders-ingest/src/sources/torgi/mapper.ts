/**
 * torgi lot card → UnifiedTender mapper. Pure transform.
 *
 * The torgi REST schema is dynamic — fields are read defensively from
 * a `Record<string, unknown>` and validated. Returns null on missing
 * required fields or unknown region.
 */

import { okatoToIso } from '~/shared/constants/regions.ts'
import type { UnifiedTender } from '~/shared/types/tenders-ingest.ts'
import type { TorgiLotCard } from './api-client.ts'
import { createHash } from 'node:crypto'

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number.parseFloat(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string')
}

export function mapTorgiLotCard(lot: TorgiLotCard): UnifiedTender | null {
  const externalGuid = asString(lot.id) ?? asString(lot.noticeNumber)
  if (!externalGuid) return null

  const publishedAt = asString(lot.firstVersionPublicationDate)
  if (!publishedAt) return null

  // Customer block — torgi nests it under various keys. Read defensively.
  const customer = (lot.customer ?? lot.organizer ?? {}) as Record<string, unknown>
  const inn = asString(customer.inn) ?? ''
  const kpp = asString(customer.kpp)
  const name = asString(customer.name) ?? asString(customer.fullName) ?? ''
  const okato = asString(customer.okato) ?? asString(lot.okato) ?? ''
  const region = okatoToIso(okato)
  if (!region || !inn || !name) return null

  const title =
    asString(lot.lotName) ??
    asString(lot.title) ??
    asString(lot.noticeName) ??
    'Без названия'
  const description = asString(lot.description) ?? asString(lot.lotDescription)
  const okpd2 = asStringArray(lot.okpd2) ?? []
  const startPrice = asNumber(lot.priceMin ?? lot.startPrice ?? lot.price)
  const deadlineAt = asString(lot.applicationsEndDate) ?? null
  const applicationStart = asString(lot.applicationsStartDate)
  const applicationEnd = asString(lot.applicationsEndDate)
  const documentsUrls = asStringArray(lot.documentsUrls)

  const canonical = JSON.stringify(lot, Object.keys(lot).sort())
  const rawPayloadHash = createHash('sha256').update(canonical).digest('hex')

  // catCode → law mapping (torgi is mostly банкротное имущество & земля).
  const law: UnifiedTender['law'] = 'imushestvo'

  return {
    sourceId: 'torgi',
    externalGuid,
    procedureType: asString(lot.procedureType) ?? asString(lot.bidKind) ?? 'unknown',
    law,
    publishedAt,
    customer: { inn, kpp, name, region },
    title,
    description,
    okpd2,
    startPrice,
    currency: 'RUB',
    deadlineAt,
    applicationStart,
    applicationEnd,
    documentsUrls,
    rawPayloadHash,
    rawPayload: lot,
  }
}
