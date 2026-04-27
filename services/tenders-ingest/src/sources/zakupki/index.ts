/**
 * zakupki source adapter.
 *
 * MVP scope (W1.A skeleton):
 *  - Reads ЕСИА individualPerson_token from the secrets API on the main
 *    app (out-of-process via REST, not direct DB read). If absent, the
 *    adapter goes to status `degraded:no-secret` and yields no items —
 *    the pipeline runs cleanly, the service stays healthy.
 *  - Iterates `documentType44` × `okato2` per region whitelist.
 *  - Real SOAP marshalling and XML parsing land in W1.B.
 *
 * Cursor: `last-modified-filename` — value is the filename of the last
 * successfully processed ZIP archive. Subsequent runs skip everything
 * lexicographically <= cursor.
 */

import type {
  Source,
  SourceCursor,
  SourceState,
  UnifiedTender,
} from '../../core/source.ts'
import type { Logger } from '../../observability/logger.ts'
import { ZakupkiSoapClient } from './soap-client.ts'
import { mapZakupkiNotification } from './mapper.ts'
import { parseZakupkiNotificationXml } from './xml-parser.ts'

export interface ZakupkiSourceOptions {
  baseUrl: string
  individualPersonToken: string | null
  logger: Logger
  schedule: string
  /** ОКАТО 2-digit prefixes to iterate. */
  okato2List: readonly string[]
  /** documentType44 markers to fetch. Default: all *Notification* types. */
  documentTypes?: readonly string[]
  fetchImpl?: typeof fetch
}

const DEFAULT_DOCUMENT_TYPES: readonly string[] = [
  'epNotificationEF2020',
  'epNotificationEA2020',
  'epNotificationOK2020',
  'epNotificationZK2020',
  'epNotificationZP2020',
]

export class ZakupkiSource implements Source<unknown> {
  readonly id = 'zakupki' as const
  readonly schedule: string

  private readonly client: ZakupkiSoapClient
  private readonly opts: ZakupkiSourceOptions
  private cursorValue: string | null = null

  constructor(opts: ZakupkiSourceOptions) {
    this.opts = opts
    this.schedule = opts.schedule
    this.client = new ZakupkiSoapClient({
      baseUrl: opts.baseUrl,
      individualPersonToken: opts.individualPersonToken,
      logger: opts.logger.child({ component: 'zakupki.soap' }),
      fetchImpl: opts.fetchImpl,
    })
  }

  async *fetchBatch(
    cursor: SourceCursor | null,
    signal: AbortSignal,
  ): AsyncIterable<unknown> {
    this.cursorValue = cursor?.value ?? null
    if (!this.client.hasToken()) {
      // Graceful degradation — pipeline yields zero items, source goes
      // to `degraded:no-secret` in /health.
      return
    }
    for (const okato2 of this.opts.okato2List) {
      if (signal.aborted) return
      for (const documentType44 of this.opts.documentTypes ?? DEFAULT_DOCUMENT_TYPES) {
        if (signal.aborted) return
        // W1.A: skeleton iterator — no real items. Real fetch in W1.B.
        for await (const doc of this.client.getDocsByOrgRegion(
          { okato2, documentType44 },
          signal,
        )) {
          yield doc
        }
      }
    }
  }

  parseItem(raw: unknown): UnifiedTender | null {
    // W1.A: skeleton — passes through `null` if `raw` isn't a string
    // payload or if the parser can't handle it. W1.B replaces this
    // with the real XML→intermediate→UnifiedTender pipeline.
    if (typeof raw !== 'string') return null
    try {
      const intermediate = parseZakupkiNotificationXml(raw)
      return mapZakupkiNotification(intermediate)
    } catch {
      return null
    }
  }

  serializeCursor(_state: SourceState): SourceCursor | null {
    if (this.cursorValue === null) {
      // No items were processed — no cursor to advance.
      return null
    }
    return {
      sourceId: this.id,
      value: this.cursorValue,
      updatedAt: new Date().toISOString(),
    }
  }
}

export { mapZakupkiNotification } from './mapper.ts'
