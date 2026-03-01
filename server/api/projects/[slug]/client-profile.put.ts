import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { CLIENT_PROFILE_EDITABLE_KEYS } from '~/shared/constants/profile-fields'

const ALLOWED_KEYS = new Set<string>(CLIENT_PROFILE_EDITABLE_KEYS)

/** Sanitize a profile value — only allow strings (trimmed, max 1000 chars) or null */
function sanitizeValue(v: unknown): string | null {
  if (v == null || v === '') return null
  if (typeof v !== 'string') return null
  return v.trim().slice(0, 1000)
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  // Auth: admin or client for this project
  requireAdminOrClient(event, slug)

  const body = await readNodeBody(event) as Record<string, unknown>
  const db = useDb()

  const [current] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!current) throw createError({ statusCode: 404, message: 'Project not found' })

  // Filter to allowed keys + sanitize values (only strings/null)
  const safeFields = Object.fromEntries(
    Object.entries(body as Record<string, unknown>)
      .filter(([k]) => ALLOWED_KEYS.has(k))
      .map(([k, v]) => [k, sanitizeValue(v)])
  ) as Record<string, unknown>

  const merged = { ...(current.profile as Record<string, unknown> || {}), ...safeFields }

  await db.update(projects)
    .set({ profile: merged, updatedAt: new Date() })
    .where(eq(projects.slug, slug))

  return { ok: true }
})
