import { useDb } from '~/server/db/index'
import { projects, designerProjects } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({ designerId: z.number().int().positive() })

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const { designerId } = await readValidatedNodeBody(event, Body)

  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404, message: 'Проект не найден' })

  await db.delete(designerProjects)
    .where(and(
      eq(designerProjects.projectId, project.id),
      eq(designerProjects.designerId, designerId),
    ))

  return { ok: true }
})
