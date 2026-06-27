import { createHash } from 'node:crypto'

import { updateProjectGovernanceScopeSettings } from '~/server/modules/projects/project-governance.service'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import {
  createApiV1ClientProjectScopeSettingsUpdateDto,
  createApiV1ClientScopeSettings,
} from '~/server/utils/api-v1-client-coordination'
import { requireAdminOrClient } from '~/server/utils/auth'
import { readValidatedNodeBody } from '~/server/utils/body'
import { ProjectScopeTypeSchema, UpdateProjectScopeSettingsSchema } from '~/shared/types/project/project-governance'
import { getProjectScopeEditableSettingKeys } from '~/shared/utils/project/project-governance'

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

  const body = await readValidatedNodeBody(event, UpdateProjectScopeSettingsSchema)
  const settings = createApiV1ClientScopeSettings(scopeType, body.settings)

  if (!Object.keys(settings).length) {
    const allowedKeys = getProjectScopeEditableSettingKeys(scopeType, 'client')
    throw createError({
      statusCode: 403,
      statusMessage: allowedKeys.length
        ? `Client can change only: ${allowedKeys.join(', ')}`
        : 'Client cannot change settings for this scope',
    })
  }

  const result = await updateProjectGovernanceScopeSettings(
    slug,
    scopeType,
    decodeURIComponent(scopeId),
    { settings },
    { merge: true },
  )

  const data = createApiV1ClientProjectScopeSettingsUpdateDto(result)
  const revisionHash = createHash('sha1')
    .update(JSON.stringify(data))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `client-coordination-settings:${revisionHash}`,
  })
})
