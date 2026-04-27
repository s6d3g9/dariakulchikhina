/**
 * Skeleton SOAP client for `int44.zakupki.gov.ru/eis-integration/services`.
 *
 * The full SOAP envelope construction lives in W1.B (XSD-driven). For
 * W1.A this is a placeholder that demonstrates auth headers (token
 * goes both into the SOAP envelope and the HTTP `individualPerson_token`
 * header — see §26 §1.3) and rate limiting hooks.
 *
 * Out of scope for W1.A: actual SOAP marshalling. The skeleton's
 * `getDocsByOrgRegion` returns an empty async iterator so the pipeline
 * runs end-to-end without throwing.
 */

import type { Logger } from '../../observability/logger.ts'

export interface ZakupkiSoapOptions {
  baseUrl: string
  /** ЕСИА individualPerson_token; null ⇒ degraded:no-secret. */
  individualPersonToken: string | null
  logger: Logger
  fetchImpl?: typeof fetch
}

export interface GetDocsByOrgRegionRequest {
  okato2: string
  documentType44: string
  fromDate?: string
  toDate?: string
}

/**
 * Raw response item — placeholder for W1.A. The W1.B PR replaces this
 * with the parsed XML structure (archiveUrl + per-document metadata).
 */
export interface ZakupkiRawDoc {
  archiveUrl: string
  documentType44: string
  reestrNumber: string
  okato: string
}

export class ZakupkiSoapClient {
  private readonly opts: ZakupkiSoapOptions
  constructor(opts: ZakupkiSoapOptions) {
    this.opts = opts
  }

  hasToken(): boolean {
    return Boolean(this.opts.individualPersonToken)
  }

  /**
   * Stream docs for a (region, documentType44) pair. Skeleton: yields
   * nothing. W1.B implements actual SOAP request + ZIP unpacking.
   */
  // eslint-disable-next-line require-yield
  async *getDocsByOrgRegion(
    _req: GetDocsByOrgRegionRequest,
    signal: AbortSignal,
  ): AsyncIterable<ZakupkiRawDoc> {
    if (!this.opts.individualPersonToken) {
      this.opts.logger.warn('zakupki.soap.no-token', {})
      return
    }
    if (signal.aborted) return
    // W1.A: no-op skeleton. Real iteration in W1.B.
    return
  }
}
