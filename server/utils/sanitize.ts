import { z } from 'zod'

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** Strip prototype-pollution keys from an object recursively */
export function sanitizeRecord(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (DANGEROUS_KEYS.has(k)) continue
    clean[k] = v && typeof v === 'object' && !Array.isArray(v)
      ? sanitizeRecord(v as Record<string, unknown>)
      : v
  }
  return clean
}

/**
 * Zod schema for a safe JSON value (recursive, depth-limited).
 * Prevents deeply nested payloads and enforces string size limits.
 */
function safeJsonValue(depth: number): z.ZodType {
  if (depth <= 0) return z.union([z.string().max(10_000), z.number(), z.boolean(), z.null()])
  const lazy: z.ZodType = z.lazy(() =>
    z.union([
      z.string().max(10_000),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(lazy).max(200),
      z.record(z.string().max(200), lazy),
    ]),
  )
  return lazy
}

/** Flexible JSONB object: max 200 keys, string keys ≤200, values depth-limited to 4 levels. */
export const zSafeJsonObject = z.record(z.string().max(200), safeJsonValue(4)).refine(
  (obj) => Object.keys(obj).length <= 200,
  { message: 'Слишком много полей (макс. 200)' },
)

/** Flat string-only record for brief / profile fields. */
export const zStringRecord = z.record(z.string().max(200), z.string().max(5000)).refine(
  (obj) => Object.keys(obj).length <= 100,
  { message: 'Слишком много полей (макс. 100)' },
)
