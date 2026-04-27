/**
 * torgi source adapter.
 *
 * Iterates relevant `catCode` filters (земельные участки, имущество
 * должников — see §26 §2.7). No auth. Cursor: `datetime` on
 * `firstVersionPublicationDate`; descending sort means we pull
 * newest-first and stop when we cross the previous cursor.
 */

import type {
  Source,
  SourceCursor,
  SourceState,
  UnifiedTender,
} from '../../core/source.ts'
import type { Logger } from '../../observability/logger.ts'
import { TorgiApiClient, type TorgiLotCard } from './api-client.ts'
import { mapTorgiLotCard } from './mapper.ts'

export interface TorgiSourceOptions {
  baseUrl: string
  logger: Logger
  schedule: string
  /** Categories to walk (см. §26 §2.4). Default: 5 (земля), 110, 408 (имущество). */
  catCodes?: readonly number[]
  /** Page size; capped at 100 by the source (see §26 §2.6). */
  pageSize?: number
  fetchImpl?: typeof fetch
}

const DEFAULT_CAT_CODES: readonly number[] = [5, 110, 408]

export class TorgiSource implements Source<TorgiLotCard> {
  readonly id = 'torgi' as const
  readonly schedule: string

  private readonly client: TorgiApiClient
  private readonly opts: TorgiSourceOptions
  private cursorIso: string | null = null
  private maxSeenIso: string | null = null

  constructor(opts: TorgiSourceOptions) {
    this.opts = opts
    this.schedule = opts.schedule
    this.client = new TorgiApiClient({
      baseUrl: opts.baseUrl,
      logger: opts.logger.child({ component: 'torgi.api' }),
      fetchImpl: opts.fetchImpl,
    })
  }

  async *fetchBatch(
    cursor: SourceCursor | null,
    signal: AbortSignal,
  ): AsyncIterable<TorgiLotCard> {
    this.cursorIso = cursor?.value || null
    this.maxSeenIso = this.cursorIso
    for (const catCode of this.opts.catCodes ?? DEFAULT_CAT_CODES) {
      if (signal.aborted) return
      for await (const lot of this.client.searchLotCards(
        {
          catCode,
          size: this.opts.pageSize ?? 50,
          fromIso: this.cursorIso ?? undefined,
          sort: 'firstVersionPublicationDate,desc',
        },
        signal,
      )) {
        const ts = lot.firstVersionPublicationDate
        if (ts && (this.maxSeenIso == null || ts > this.maxSeenIso)) {
          this.maxSeenIso = ts
        }
        yield lot
      }
    }
  }

  parseItem(raw: TorgiLotCard): UnifiedTender | null {
    return mapTorgiLotCard(raw)
  }

  serializeCursor(_state: SourceState): SourceCursor {
    return {
      sourceId: this.id,
      value: this.maxSeenIso ?? this.cursorIso ?? '',
      updatedAt: new Date().toISOString(),
    }
  }
}

export { mapTorgiLotCard } from './mapper.ts'
