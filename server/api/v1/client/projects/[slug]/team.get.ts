import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { contractors, projectContractors, projects } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { createApiV1ClientProjectTeamDto } from '~/server/utils/api-v1-client-team'
import { requireAdminOrClient } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  requireAdminOrClient(event, slug)

  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      projectType: projects.projectType,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const contractorRows = await db
    .select({
      id: contractors.id,
      name: contractors.name,
      companyName: contractors.companyName,
      workTypes: contractors.workTypes,
      roleTypes: contractors.roleTypes,
      contractorType: contractors.contractorType,
    })
    .from(projectContractors)
    .innerJoin(contractors, eq(projectContractors.contractorId, contractors.id))
    .where(eq(projectContractors.projectId, project.id))
    .orderBy(contractors.name)

  const data = createApiV1ClientProjectTeamDto(project, contractorRows)
  const revisionHash = createHash('sha1')
    .update(JSON.stringify(data.members.map(member => ({
      id: member.id,
      displayName: member.displayName,
      roleLabels: member.roleLabels,
      workTypeLabels: member.workTypeLabels,
    }))))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `team:${revisionHash}`,
  })
})
