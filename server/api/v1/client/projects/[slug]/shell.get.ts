import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { contractors, projectContractors, projects } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { createApiV1ClientProjectShellDto } from '~/server/utils/api-v1-client-shell'
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
      pages: projects.pages,
      profile: projects.profile,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const teamRows = await db
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

  const data = createApiV1ClientProjectShellDto({
    ...project,
    profile: (project.profile || {}) as Record<string, unknown>,
  }, teamRows)
  const revisionHash = createHash('sha1')
    .update(JSON.stringify({
      project: data.project,
      overview: data.overview,
      team: data.team.summary,
      members: data.team.members.map(member => member.id),
    }))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `client-shell:${revisionHash}`,
  })
})
