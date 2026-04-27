/**
 * zakupki notification → UnifiedTender mapper.
 *
 * Pure transform — no I/O. Returns null for malformed/out-of-scope
 * documents (e.g. unknown region, malformed price). The pipeline
 * promotes nulls to `dropped` rather than `error`.
 */

import { okatoToIso } from '~/shared/constants/regions.ts'
import type { UnifiedTender } from '~/shared/types/tenders-ingest.ts'
import type { ZakupkiNotificationXml } from './xml-parser.ts'

export function mapZakupkiNotification(
  doc: ZakupkiNotificationXml,
): UnifiedTender | null {
  const region = okatoToIso(doc.customerOkato)
  if (!region) return null
  // 44-FZ documentType44 starts with `epNotification...`; everything else is a 223-FZ
  // notification or a contract/protocol — out of scope for W1 search feed.
  const law: UnifiedTender['law'] = doc.documentType44.startsWith('epNotification')
    ? '44-fz'
    : doc.documentType44.startsWith('fz223')
      ? '223-fz'
      : 'other'

  return {
    sourceId: 'zakupki',
    externalGuid: doc.reestrNumber,
    procedureType: doc.procedureType,
    law,
    publishedAt: doc.publishDateTime,
    customer: {
      inn: doc.customerInn,
      kpp: doc.customerKpp,
      name: doc.customerName,
      region,
    },
    title: doc.title,
    description: doc.description,
    okpd2: doc.okpd2Codes,
    startPrice: doc.startPriceRub,
    currency: 'RUB',
    deadlineAt: doc.deadlineAt,
    applicationStart: doc.applicationStart,
    applicationEnd: doc.applicationEnd,
    documentsUrls: doc.documentsUrls,
    rawPayloadHash: doc.rawPayloadHash,
    rawPayload: doc.rawPayload,
  }
}
