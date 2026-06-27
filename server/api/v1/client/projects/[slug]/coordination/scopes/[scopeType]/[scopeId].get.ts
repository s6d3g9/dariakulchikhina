import { createHash } from 'node:crypto'

import { buildProjectScopeDetail, getProjectGovernanceProject } from '~/server/modules/projects/project-governance.service'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { createApiV1ClientProjectScopeDetailDto } from '~/server/utils/api-v1-client-coordination'
import { requireAdminOrClient } from '~/server/utils/auth'
import { ProjectScopeTypeSchema } from '~/shared/types/project/project-governance'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  requireAdminOrClient(event, slug)

  const scopeType = ProjectScopeTypeSchema.parse(getRouterParam(event, 'scopeType'))
  const scopeId = getRouterParam(event, 'scopeId')
  if (!scopeId) {
    throw createError({ statusCode: 400, statusMessage: 'Scope id is required' })
  }

  const project = await getProjectGovernanceProject(slug)
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const detail = await buildProjectScopeDetail(project, scopeType, decodeURIComponent(scopeId))
  if (!detail) {
    throw createError({ statusCode: 404, statusMessage: 'Project scope not found' })
  }

  const data = createApiV1ClientProjectScopeDetailDto(detail)
  const revisionHash = createHash('sha1')
    .update(JSON.stringify(data))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `client-coordination-scope:${revisionHash}`,
  })
})
