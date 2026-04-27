/**
 * Skeleton XML parser for the zakupki notification payload. Production
 * implementation (W1.B) uses a sax-streaming parser with whitelisted
 * tags, per §26 §1.6 ("**Не парсить XML целиком в DOM**").
 *
 * For W1.A this exposes a pure function with the production signature
 * so the mapper has something to call against fixtures, but body is
 * intentionally empty — fixtures are added in W1.B.
 */

export interface ZakupkiNotificationXml {
  reestrNumber: string
  documentType44: string
  publishDateTime: string
  /** Raw OKATO from the source — full 11 digits. */
  customerOkato: string
  customerInn: string
  customerKpp?: string
  customerName: string
  procedureType: string
  title: string
  description?: string
  okpd2Codes: string[]
  startPriceRub: number | null
  deadlineAt: string | null
  applicationStart?: string
  applicationEnd?: string
  documentsUrls: string[]
  /** sha256 of the canonicalised XML payload, computed by the caller. */
  rawPayloadHash: string
  /** Whole parsed document for jsonb storage. */
  rawPayload: unknown
}

/**
 * Parse a single zakupki notification XML string into a structured
 * intermediate. W1.A: throws — real implementation comes in W1.B.
 */
export function parseZakupkiNotificationXml(_xml: string): ZakupkiNotificationXml {
  throw new Error('[zakupki/xml-parser] not implemented — W1.B scope')
}
