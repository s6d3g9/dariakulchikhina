import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { CLIENT_PROFILE_EDITABLE_KEYS } from '~/shared/constants/profile-fields'

const ALLOWED_KEYS = new Set<string>(CLIENT_PROFILE_EDITABLE_KEYS)

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!

  const body = await readNodeBody(event) as Record<string, unknown>
  const db = useDb()

  const [current] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!current) throw createError({ statusCode: 404, message: 'Project not found' })

  const safeFields = Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([k]) => ALLOWED_KEYS.has(k))
  ) as Record<string, unknown>

  const merged = { ...(current.profile as Record<string, unknown> || {}), ...safeFields }

  await db.update(projects)
    .set({ profile: merged, updatedAt: new Date() })
    .where(eq(projects.slug, slug))

  return { ok: true }
})
