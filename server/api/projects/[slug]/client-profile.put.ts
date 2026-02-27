import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireClient } from '~/server/utils/auth'

const ALLOWED_KEYS = [
  'fio', 'phone', 'email', 'messenger', 'messengerNick', 'preferredContact',
  'birthday', 'familyStatus', 'children', 'pets', 'hobbies', 'lifestyle',
  'objectAddress', 'objectType', 'objectArea', 'roomCount', 'floor', 'ceilingHeight',
  'hasBalcony', 'parking',
  'budget', 'deadline', 'stylePreferences', 'colorPreferences',
  'brief_like_refs', 'dislikes', 'notes',
]

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  await requireClient(event, slug)

  const body = await readBody(event)
  const db = useDb()

  const [current] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!current) throw createError({ statusCode: 404, message: 'Project not found' })

  const safeFields = Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([k]) => ALLOWED_KEYS.includes(k))
  )

  const merged = { ...(current.profile as Record<string, unknown> || {}), ...safeFields }

  await db.update(projects)
    .set({ profile: merged, updatedAt: new Date() })
    .where(eq(projects.slug, slug))

  return { ok: true }
})
