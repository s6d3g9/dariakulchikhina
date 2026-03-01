import { useDb } from '~/server/db/index'
import { projects, projectContractors } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { readNodeBody } from '~/server/utils/body'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const { contractorId } = await readNodeBody(event) as { contractorId: number }
  if (!contractorId) throw createError({ statusCode: 400, message: 'contractorId required' })

  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404, message: 'Проект не найден' })

  await db.delete(projectContractors)
    .where(and(
      eq(projectContractors.projectId, project.id),
      eq(projectContractors.contractorId, contractorId),
    ))

  return { ok: true }
})
