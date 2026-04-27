/**
 * Resolves a `secretsRef` (e.g. `tenders.zakupki.individualPersonToken`)
 * to plaintext by calling the main app's `GET /api/secrets/value`
 * endpoint with the service token. Returns null when:
 *   - the endpoint returns 404 (secret not configured), or
 *   - the call fails after retries (graceful degradation).
 *
 * The main app is the ONLY component that touches `messenger_secrets`
 * directly — services never read the encrypted DB themselves.
 */

import type { Logger } from './observability/logger.ts'
import { retryWithBackoff } from './core/retry.ts'

export interface SecretsResolverOptions {
  mainAppUrl: string
  serviceToken: string
  logger: Logger
  fetchImpl?: typeof fetch
}

export class SecretsResolver {
  private readonly opts: SecretsResolverOptions
  constructor(opts: SecretsResolverOptions) {
    this.opts = opts
  }

  async resolve(ref: string): Promise<string | null> {
    const url = new URL(
      `/api/secrets/value?key=${encodeURIComponent(ref)}`,
      this.opts.mainAppUrl,
    ).toString()
    const fetchImpl = this.opts.fetchImpl ?? fetch
    try {
      return await retryWithBackoff(async () => {
        const res = await fetchImpl(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.opts.serviceToken}`,
          },
        })
        if (res.status === 404) {
          // Secret not configured — graceful degradation, not an error.
          const e = new Error('SECRET_NOT_FOUND') as Error & { noRetry?: boolean }
          e.noRetry = true
          throw e
        }
        if (res.status >= 400 && res.status < 500) {
          const e = new Error(
            `[secrets-resolver] ${res.status} ${res.statusText}`,
          ) as Error & { noRetry?: boolean }
          e.noRetry = true
          throw e
        }
        if (!res.ok) {
          throw new Error(`[secrets-resolver] ${res.status} ${res.statusText}`)
        }
        const data = (await res.json()) as { value: string }
        return data.value
      }, {
        maxAttempts: 3,
        shouldRetry: (err) => !(err as { noRetry?: boolean }).noRetry,
      })
    } catch (err) {
      const e = err as Error
      if (e.message === 'SECRET_NOT_FOUND') {
        this.opts.logger.warn('secrets-resolver.not-found', { ref })
        return null
      }
      this.opts.logger.error('secrets-resolver.failed', {
        ref,
        err: e.message,
      })
      return null
    }
  }
}
