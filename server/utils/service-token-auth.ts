/**
 * Service-token bearer auth helper.
 *
 * Used by service-to-service endpoints (e.g. `/api/tenders/ingest`,
 * `/api/secrets/value`) where the caller proves identity via a shared
 * secret in `Authorization: Bearer <token>` (or the legacy
 * `x-service-token` header). The expected token is read from a
 * deployment-time env var.
 *
 * Constant-time comparison via `node:crypto.timingSafeEqual` — using
 * `===` would leak the token byte-by-byte through response timing,
 * letting an attacker recover it with a few thousand probe requests.
 *
 * Throws `createError({ statusCode: 401 })` on mismatch.
 * Throws `createError({ statusCode: 503 })` when the env var is unset
 * (treat misconfigured deployment as disabled, not as auth success).
 *
 * Per docs/architecture-v5/25-tenders-platform.md §4.2 + §3.7.4.
 */

import { timingSafeEqual } from 'node:crypto'
import { createError, getHeader } from 'h3'
import type { H3Event } from 'h3'

export interface RequireServiceTokenOptions {
  /** Name of the env var holding the expected token. */
  envVarName: string
  /** Status message to return when env is unset. */
  disabledStatusMessage: string
  /** Error code returned in `data` when env is unset. */
  disabledCode: string
}

/**
 * Validate the service token on an incoming request. Reads the expected
 * value from `process.env[envVarName]` and constant-time-compares it
 * against the `Authorization: Bearer <token>` header (falling back to
 * `x-service-token` for legacy clients).
 *
 * Returns `void` on success; throws an H3 error on failure.
 */
export function requireServiceToken(
  event: H3Event,
  opts: RequireServiceTokenOptions,
): void {
  // eslint-disable-next-line no-restricted-syntax -- service-token bootstrap, see file docstring
  const expected = process.env[opts.envVarName]
  if (!expected) {
    throw createError({
      statusCode: 503,
      statusMessage: opts.disabledStatusMessage,
      data: { code: opts.disabledCode },
    })
  }

  const provided =
    getHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '') ??
    getHeader(event, 'x-service-token')

  if (!provided || !constantTimeEqual(provided, expected)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'UNAUTHORIZED',
      data: { code: 'INVALID_SERVICE_TOKEN' },
    })
  }
}

/**
 * Constant-time string equality. Returns false when lengths differ
 * (length itself is not secret — early-exit is fine). Otherwise uses
 * `timingSafeEqual` so the comparison is independent of input contents.
 *
 * Exported for unit tests; production callers should use
 * `requireServiceToken` instead.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
