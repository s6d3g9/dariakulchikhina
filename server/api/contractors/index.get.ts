import { useDb } from '~/server/db/index'
import { contractors, projectContractors, projects } from '~/server/db/schema'
import { eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const rawUrl = event.node.req.url || ''
  const queryString = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : ''
  const projectSlugFilter = new URLSearchParams(queryString).get('projectSlug') || ''

  const rowsRaw = projectSlugFilter
    ? await db
      .select({
        contractor: contractors,
        projectIds: sql<number[]>`array_remove(array_agg(${projectContractors.projectId}), null)`,
        projectTitles: sql<string[]>`array_remove(array_agg(${projects.title}), null)`,
        projectSlugs: sql<string[]>`array_remove(array_agg(${projects.slug}), null)`,
      })
      .from(contractors)
      .innerJoin(projectContractors, eq(projectContractors.contractorId, contractors.id))
      .innerJoin(projects, eq(projects.id, projectContractors.projectId))
      .where(eq(projects.slug, projectSlugFilter))
      .groupBy(contractors.id)
      .orderBy(contractors.name)
    : await db
      .select({
        contractor: contractors,
        projectIds: sql<number[]>`array_remove(array_agg(${projectContractors.projectId}), null)`,
        projectTitles: sql<string[]>`array_remove(array_agg(${projects.title}), null)`,
        projectSlugs: sql<string[]>`array_remove(array_agg(${projects.slug}), null)`,
      })
      .from(contractors)
      .leftJoin(projectContractors, eq(projectContractors.contractorId, contractors.id))
      .leftJoin(projects, eq(projects.id, projectContractors.projectId))
      .groupBy(contractors.id)
      .orderBy(contractors.name)

  const rows = Array.isArray(rowsRaw)
    ? rowsRaw
    : (rowsRaw ? Array.from(rowsRaw as any) : [])

  return rows.map((r: any) => {
    // Strip sensitive fields — slug used for contractor auth
    const { slug: _slug, ...safeContractor } = r.contractor || {}
    return {
      ...safeContractor,
      linkedProjectIds: Array.isArray(r.projectIds) ? r.projectIds : [],
      linkedProjectTitles: Array.isArray(r.projectTitles) ? r.projectTitles : [],
      linkedProjectSlugs: Array.isArray(r.projectSlugs) ? r.projectSlugs : [],
    }
  })
})
