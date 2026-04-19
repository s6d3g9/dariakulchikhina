import { z } from 'zod'
import { CLIENT_PROFILE_EDITABLE_KEYS } from '~/shared/constants/profile-fields'
import * as repo from '~/server/modules/projects/projects.repository'

export const ClientProfileSchema = z
  .object(
    Object.fromEntries(
      CLIENT_PROFILE_EDITABLE_KEYS.map((k) => [k, z.string().max(1000).optional()]),
    ) as Record<string, z.ZodOptional<z.ZodString>>,
  )
  .strict()
export type ClientProfileInput = z.infer<typeof ClientProfileSchema>

/**
 * Partial update of the `projects.profile` JSONB column, restricted to
 * the whitelisted keys in CLIENT_PROFILE_EDITABLE_KEYS. Strings are
 * trimmed; empty strings become null so downstream consumers can check
 * `== null` uniformly. Returns null when the slug doesn't exist.
 */
export async function updateClientProfile(slug: string, body: ClientProfileInput) {
  const current = await repo.findProjectFull(slug)
  if (!current) return null

  const safeFields: Record<string, string | null> = {}
  for (const [k, v] of Object.entries(body)) {
    if (v == null || v === '') {
      safeFields[k] = null
      continue
    }
    safeFields[k] = v.trim()
  }

  const merged: Record<string, string | null> = {
    ...((current.profile as Record<string, string>) || {}),
    ...safeFields,
  }

  await repo.updateProjectProfileBySlug(slug, merged)

  return { ok: true as const }
}
