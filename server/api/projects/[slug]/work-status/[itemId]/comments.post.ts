import { useDb } from '~/server/db/index'
import { workStatusItemComments, workStatusItems, projects } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({ text: z.string().min(1).max(2000) })

export default defineEventHandler(async (event) => {
  requireAdmin(event)
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

  const [comment] = await db.insert(workStatusItemComments).values({
    itemId,
    authorType: 'admin',
    authorName: 'Дизайнер',
    text,
  }).returning()

  return comment
})
