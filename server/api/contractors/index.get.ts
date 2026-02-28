import { useDb } from '~/server/db/index'
import { contractors, projectContractors, projects } from '~/server/db/schema'
import { eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()

  const rows = await db
    .select({
      contractor: contractors,
      projectIds: sql<number[]>`array_remove(array_agg(${projectContractors.projectId}), null)`,
      projectTitles: sql<string[]>`array_remove(array_agg(${projects.title}), null)`,
    })
    .from(contractors)
    .leftJoin(projectContractors, eq(projectContractors.contractorId, contractors.id))
    .leftJoin(projects, eq(projects.id, projectContractors.projectId))
    .groupBy(contractors.id)
    .orderBy(contractors.name)

  return rows.map(r => ({
    ...r.contractor,
    linkedProjectIds: r.projectIds,
    linkedProjectTitles: r.projectTitles,
  }))
})
