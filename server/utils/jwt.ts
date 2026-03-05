/**
 * JWT utilities using jose (HS256).
 *
 * Two APIs:
 *  - Async (jose):  signJwt / verifyJwt     — use in new code that can await
 *  - Sync (crypto): signJwtSync / verifyJwtSync — drop-in for existing handlers
 *    (HS256 = HMAC-SHA256, verifiable synchronously with Node.js crypto)
 *
 * Tokens produced by BOTH APIs are interchangeable — same HS256 JWT format.
 * jose can verify tokens produced by signJwtSync and vice-versa.
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'

const JWT_ALG = 'HS256' as const
export const JWT_MAX_AGE_SEC = 30 * 24 * 60 * 60 // 30 days

// Fallback secret — random per-process, sessions won't persist across restarts
const _fallback = randomBytes(32).toString('hex')

function _getSecretStr(): string {
  const s = process.env.NUXT_SESSION_SECRET || process.env.SESSION_SECRET
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[JWT] NUXT_SESSION_SECRET is not set! Sessions will not survive restarts.')
    }
    return _fallback
  }
  return s
}

function _secretBytes(): Uint8Array {
  return new TextEncoder().encode(_getSecretStr())
}

// ── Async API (jose) ──────────────────────────────────────────────────────────

/**
 * Sign a JWT token asynchronously.
 * @param payload   — claims to embed (iat / exp added automatically)
 * @param expiresIn — TTL in seconds (default 30 days)
 */
export async function signJwt(
  payload: Record<string, unknown>,
  expiresIn: number = JWT_MAX_AGE_SEC,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(_secretBytes())
}

/**
 * Verify a JWT token asynchronously via jose.
 * Returns null on any error (expired, invalid signature, malformed).
 */
export async function verifyJwt<T extends Record<string, unknown> = Record<string, unknown>>(
  token: string,
): Promise<(JWTPayload & T) | null> {
  try {
    const { payload } = await jwtVerify<T>(token, _secretBytes(), { algorithms: [JWT_ALG] })
    return payload
  } catch {
    return null
  }
}

// ── Sync API (Node.js crypto — backward compatible) ───────────────────────────
// HS256 = HMAC-SHA256 → can be verified synchronously.
// Output is a valid JWT — interchangeable with the async API above.

/**
 * Sign a JWT synchronously (no await required).
 * Produces a standard HS256 JWT readable by verifyJwt() and any JWT library.
 */
export function signJwtSync(
  payload: Record<string, unknown>,
  expiresIn: number = JWT_MAX_AGE_SEC,
): string {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: JWT_ALG, typ: 'JWT' })).toString('base64url')
  const body   = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + expiresIn })).toString('base64url')
  const sigInput = `${header}.${body}`
  const sig = createHmac('sha256', _getSecretStr()).update(sigInput).digest('base64url')
  return `${sigInput}.${sig}`
}

/**
 * Verify a JWT synchronously (no await required).
 * Constant-time signature comparison — safe against timing attacks.
 * Returns null on any error.
 */
export function verifyJwtSync<T extends Record<string, unknown> = Record<string, unknown>>(
  token: string,
): T | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const expected = createHmac('sha256', _getSecretStr())
      .update(`${header}.${body}`)
      .digest('base64url')
    const a = Buffer.from(sig,      'base64url')
    const b = Buffer.from(expected, 'base64url')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (typeof data.exp === 'number' && Math.floor(Date.now() / 1000) > data.exp) return null
    return data as T
  } catch {
    return null
  }
}

/**
 * Decode JWT payload WITHOUT verifying signature.
 * Use only for logging/debugging — never for auth decisions.
 */
export function decodeJwtUnsafe<T = Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}
