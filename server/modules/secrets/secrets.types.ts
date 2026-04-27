/**
 * Secrets module types.
 *
 * Public shapes are split between "what the API returns" (always
 * masked) and "what service-internal callers see" (plaintext —
 * `getSecret()` only).
 */

import { z } from 'zod'

export const SecretScopeSchema = z.enum(['global', 'project', 'connector'])
export type SecretScope = z.infer<typeof SecretScopeSchema>

export const SecretMetadataSchema = z
  .object({
    expiresAt: z.string().datetime({ offset: true }).optional(),
    createdBy: z.string().optional(),
    lastRotatedAt: z.string().datetime({ offset: true }).optional(),
    /** Set on create — last 4 chars of the plaintext, displayable. */
    lastFour: z.string().max(4).optional(),
  })
  .passthrough()

export type SecretMetadata = z.infer<typeof SecretMetadataSchema>

/**
 * Create or update payload. The plaintext `value` lives only in this
 * shape — once persisted it is encrypted and never returned through
 * any HTTP API.
 */
export const SecretWriteSchema = z.object({
  scope: SecretScopeSchema,
  scopeRefId: z.string().uuid().nullable().optional(),
  key: z.string().min(1).max(256),
  value: z.string().min(1).max(8192),
  metadata: SecretMetadataSchema.optional(),
})

export type SecretWrite = z.infer<typeof SecretWriteSchema>

/**
 * Public masked view returned by GET endpoints. `mask` is e.g.
 * `••••••1234` — never the full value.
 */
export interface SecretView {
  id: string
  scope: SecretScope
  scopeRefId: string | null
  key: string
  mask: string
  metadata: SecretMetadata
  createdAt: string
  updatedAt: string
  version: number
}
