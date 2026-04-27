/**
 * Publisher — POST batches of UnifiedTender to the main app's
 * `POST /api/tenders/ingest` endpoint.
 *
 * Authn: `Authorization: Bearer <serviceToken>` (must match
 * `TENDERS_INGEST_SERVICE_TOKEN` on the main app). Idempotency:
 * `Idempotency-Key` header carries `${sourceId}:${tickStartedAt}` so
 * accidental double-runs collapse on the server.
 *
 * Retry policy: handled by `retryWithBackoff` — retries 5xx and network
 * errors, never retries 4xx (those are bugs in our payload, not
 * transient).
 */

import type { UnifiedTender } from '~/shared/types/tenders-ingest.ts'
import { retryWithBackoff } from './retry.ts'

export interface PublisherOptions {
  mainAppUrl: string
  serviceToken: string
  /** Optional fetch override for tests. */
  fetchImpl?: typeof fetch
}

export interface PublishResult {
  inserted: number
  updated: number
  skipped: number
}

export class Publisher {
  private readonly opts: PublisherOptions
  constructor(opts: PublisherOptions) {
    this.opts = opts
  }

  async publish(
    sourceId: string,
    items: readonly UnifiedTender[],
    idempotencyKey: string,
  ): Promise<PublishResult> {
    if (items.length === 0) {
      return { inserted: 0, updated: 0, skipped: 0 }
    }

    const url = new URL('/api/tenders/ingest', this.opts.mainAppUrl).toString()
    const body = JSON.stringify({ sourceId, items })
    const fetchImpl = this.opts.fetchImpl ?? fetch

    const result = await retryWithBackoff(async () => {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.opts.serviceToken}`,
          'Idempotency-Key': idempotencyKey,
        },
        body,
      })
      if (res.status >= 400 && res.status < 500) {
        // 4xx is a contract bug, do not retry
        const text = await safeText(res)
        const err = new Error(
          `[publisher] ${res.status} ${res.statusText}: ${text}`,
        ) as Error & { noRetry?: boolean }
        err.noRetry = true
        throw err
      }
      if (!res.ok) {
        throw new Error(`[publisher] ${res.status} ${res.statusText}`)
      }
      return (await res.json()) as PublishResult
    }, {
      maxAttempts: 4,
      shouldRetry: (err) => {
        const e = err as Error & { noRetry?: boolean }
        return !e.noRetry
      },
    })

    return result
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return '<no body>'
  }
}
