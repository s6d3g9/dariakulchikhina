/**
 * REST client for torgi.gov.ru `/new/api/public/`.
 *
 * Spring-style pagination (`page` + `size`); response shape:
 * `{ content: [...], totalElements, totalPages, number, size }`. The
 * adapter wraps this into an async iterator so the pipeline doesn't
 * have to know about pagination.
 *
 * No auth. Rate limit: ~30 req/min, concurrency 2 (see §26 §2.6).
 */

import type { Logger } from '../../observability/logger.ts'
import { retryWithBackoff } from '../../core/retry.ts'

export interface TorgiClientOptions {
  baseUrl: string
  logger: Logger
  fetchImpl?: typeof fetch
}

export interface TorgiSearchParams {
  catCode?: number
  text?: string
  lotStatus?: string
  byFirstVersion?: boolean
  sort?: string
  size?: number
  /**
   * `firstVersionPublicationDate >= cursor` — implemented client-side
   * since the public API doesn't expose a date-from filter directly.
   */
  fromIso?: string
}

export interface TorgiLotCard {
  id: string
  noticeNumber?: string
  firstVersionPublicationDate: string
  lotStatus: string
  catCode?: number
  /** All other fields preserved verbatim into rawPayload. */
  [key: string]: unknown
}

interface SpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export class TorgiApiClient {
  private readonly opts: TorgiClientOptions
  constructor(opts: TorgiClientOptions) {
    this.opts = opts
  }

  /** Stream lot cards across pages until exhausted or cursor reached. */
  async *searchLotCards(
    params: TorgiSearchParams,
    signal: AbortSignal,
  ): AsyncIterable<TorgiLotCard> {
    const size = params.size ?? 50
    const fetchImpl = this.opts.fetchImpl ?? fetch

    let page = 0
    while (!signal.aborted) {
      const url = new URL('/new/api/public/lotcards/search', this.opts.baseUrl)
      url.searchParams.set('page', String(page))
      url.searchParams.set('size', String(size))
      url.searchParams.set('sort', params.sort ?? 'firstVersionPublicationDate,desc')
      if (params.catCode != null) {
        url.searchParams.set('catCode', String(params.catCode))
      }
      if (params.text) url.searchParams.set('text', params.text)
      if (params.lotStatus) url.searchParams.set('lotStatus', params.lotStatus)
      if (params.byFirstVersion != null) {
        url.searchParams.set('byFirstVersion', String(params.byFirstVersion))
      }

      const data = await retryWithBackoff(async () => {
        const res = await fetchImpl(url.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal,
        })
        if (res.status >= 400 && res.status < 500) {
          const e = new Error(
            `[torgi] ${res.status} ${res.statusText}`,
          ) as Error & { noRetry?: boolean }
          e.noRetry = true
          throw e
        }
        if (!res.ok) {
          throw new Error(`[torgi] ${res.status} ${res.statusText}`)
        }
        return (await res.json()) as SpringPage<TorgiLotCard>
      }, {
        maxAttempts: 4,
        shouldRetry: (err) => !(err as { noRetry?: boolean }).noRetry,
      })

      let stopAfterThisPage = false
      for (const lot of data.content) {
        if (params.fromIso && lot.firstVersionPublicationDate < params.fromIso) {
          // sorted desc by date — once we cross the cursor, no need to
          // keep walking pages further back.
          stopAfterThisPage = true
          continue
        }
        yield lot
      }

      if (stopAfterThisPage) return
      if (page + 1 >= data.totalPages) return
      page += 1
    }
  }
}
