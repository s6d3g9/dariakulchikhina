/**
 * Exponential backoff with jitter. Used by the publisher (REST POST to
 * main app) and by source clients (zakupki SOAP, torgi REST). Caps at
 * 60 s and tops out after `maxAttempts` retries.
 */

export interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  /** Predicate — return true to retry, false to fail immediately. */
  shouldRetry?: (err: unknown, attempt: number) => boolean
  /** Optional sink called between attempts (for logger.warn). */
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void
}

const DEFAULTS: RetryOptions = {
  maxAttempts: 4,
  baseDelayMs: 500,
  maxDelayMs: 60_000,
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULTS, ...options }
  let attempt = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1
    try {
      return await fn()
    } catch (err) {
      const giveUp = attempt >= opts.maxAttempts
      const allow = opts.shouldRetry ? opts.shouldRetry(err, attempt) : true
      if (giveUp || !allow) throw err
      const expo = Math.min(
        opts.maxDelayMs,
        opts.baseDelayMs * 2 ** (attempt - 1),
      )
      const jitter = Math.floor(Math.random() * (expo / 2))
      const delay = expo + jitter
      opts.onRetry?.(err, attempt, delay)
      await sleep(delay)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
