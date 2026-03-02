import { useDb } from '~/server/db/index'
import { workStatusItemComments, workStatusItems, projects, users } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({ text: z.string().min(1).max(2000) })

export default defineEventHandler(async (event) => {
  const session = requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const itemId = Number(getRouterParam(event, 'itemId'))
  const { text } = await readValidatedNodeBody(event, Body)
  const db = useDb()

  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404 })

  const [item] = await db.select({ id: workStatusItems.id })
    .from(workStatusItems)
    .where(and(eq(workStatusItems.id, itemId), eq(workStatusItems.projectId, project.id)))
    .limit(1)
  if (!item) throw createError({ statusCode: 404 })

  // Resolve admin name from session
  let authorName = 'Дизайнер'
  const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, session.userId)).limit(1)
  if (user?.name) authorName = user.name

  const [comment] = await db.insert(workStatusItemComments).values({
    itemId,
    authorType: 'admin',
    authorName,
    text,
  }).returning()

  return comment
})
