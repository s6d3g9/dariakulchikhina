import { useDb } from '~/server/db/index'
import { projects, projectContractors } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({ contractorId: z.number().int().positive() })

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const { contractorId } = await readValidatedNodeBody(event, Body)

  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404, message: 'Проект не найден' })

  // upsert (ignore if already linked)
  await db.insert(projectContractors)
    .values({ projectId: project.id, contractorId })
    .onConflictDoNothing()

  return { ok: true }
})
