import { useDb } from '~/server/db/index'
import { projects, projectContractors } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const { contractorId } = await readNodeBody(event) as { contractorId: number }
  if (!contractorId) throw createError({ statusCode: 400, message: 'contractorId required' })

  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404, message: 'Проект не найден' })

  // upsert (ignore if already linked)
  await db.insert(projectContractors)
    .values({ projectId: project.id, contractorId })
    .onConflictDoNothing()

  return { ok: true }
})
