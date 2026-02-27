import { useDb } from '~/server/db/index'
import { projects, projectContractors } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const contractorId = Number(getRouterParam(event, 'contractorId'))
  if (!contractorId) throw createError({ statusCode: 400 })

  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404 })

  await db.delete(projectContractors).where(
    and(eq(projectContractors.projectId, project.id), eq(projectContractors.contractorId, contractorId))
  )
  return { ok: true }
})
