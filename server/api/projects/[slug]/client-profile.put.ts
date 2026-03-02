import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { CLIENT_PROFILE_EDITABLE_KEYS } from '~/shared/constants/profile-fields'

// Build a Zod schema dynamically from the editable keys constant
const profileSchema = z.object(
  Object.fromEntries(
    CLIENT_PROFILE_EDITABLE_KEYS.map(k => [k, z.string().max(1000).optional()])
  ) as Record<string, z.ZodOptional<z.ZodString>>
).strict() // Reject unknown keys

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  // Auth: admin or client for this project
  requireAdminOrClient(event, slug)

  const body = await readValidatedBody(event, (raw) => profileSchema.parse(raw))
  const db = useDb()

  const [current] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!current) throw createError({ statusCode: 404, message: 'Project not found' })

  // Sanitize: trim strings, convert empty to null
  const safeFields: Record<string, string | null> = {}
  for (const [k, v] of Object.entries(body)) {
    if (v == null || v === '') { safeFields[k] = null; continue }
    safeFields[k] = v.trim()
  }

  const merged: Record<string, string | null> = { ...(current.profile as Record<string, string> || {}), ...safeFields }

  await db.update(projects)
    .set({ profile: merged, updatedAt: new Date() })
    .where(eq(projects.slug, slug))

  return { ok: true }
})
