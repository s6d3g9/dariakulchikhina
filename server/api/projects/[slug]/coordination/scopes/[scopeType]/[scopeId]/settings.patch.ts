import { requireAdminOrClient } from '~/server/utils/auth'
import { readValidatedNodeBody } from '~/server/utils/body'
import { applyMessengerCors } from '~/server/utils/messenger-cors'
import { updateProjectGovernanceScopeSettings } from '~/server/utils/project-governance'
import { ProjectScopeTypeSchema, UpdateProjectScopeSettingsSchema } from '~/shared/types/project-governance'
import { filterProjectScopeSettingsForEditor, getProjectScopeEditableSettingKeys } from '~/shared/utils/project-governance'

export default defineEventHandler(async (event) => {
  applyMessengerCors(event, { methods: ['PATCH', 'OPTIONS'] })

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  const auth = requireAdminOrClient(event, slug)

  const scopeType = ProjectScopeTypeSchema.parse(getRouterParam(event, 'scopeType'))
  const scopeId = getRouterParam(event, 'scopeId')
  if (!scopeId) {
    throw createError({ statusCode: 400, statusMessage: 'Scope id is required' })
  }

  const body = await readValidatedNodeBody(event, UpdateProjectScopeSettingsSchema)
  const sanitizedBody = auth.role === 'client'
    ? {
        settings: filterProjectScopeSettingsForEditor(scopeType, body.settings, 'client') as Record<string, string | number | boolean | null>,
      }
    : body

  if (auth.role === 'client' && !Object.keys(sanitizedBody.settings).length) {
    const allowedKeys = getProjectScopeEditableSettingKeys(scopeType, 'client')
    throw createError({
      statusCode: 403,
      statusMessage: allowedKeys.length
        ? `Клиент может менять только: ${allowedKeys.join(', ')}`
        : 'Клиент не может менять настройки этого контура',
    })
  }

  const result = await updateProjectGovernanceScopeSettings(
    slug,
    scopeType,
    decodeURIComponent(scopeId),
    sanitizedBody,
    { merge: auth.role === 'client' },
  )

  return {
    ok: true,
    ...result,
  }
})