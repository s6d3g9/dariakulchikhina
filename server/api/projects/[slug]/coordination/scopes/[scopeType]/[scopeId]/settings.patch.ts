import { requireAdminOrClient } from '~/server/modules/auth/session.service'
import { readValidatedNodeBody } from '~/server/utils/body'
import { applyMessengerCors } from '~/server/utils/messenger-cors'
import { updateScopeSettingsWithRoleCheck } from '~/server/modules/projects/project-governance.service'
import { ProjectScopeTypeSchema, UpdateProjectScopeSettingsSchema } from '~/shared/types/project-governance'

export default defineEventHandler(async (event) => {
  applyMessengerCors(event, { methods: ['PATCH', 'OPTIONS'] })
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  const auth = requireAdminOrClient(event, slug)
  const scopeType = ProjectScopeTypeSchema.parse(getRouterParam(event, 'scopeType'))
  const scopeId = getRouterParam(event, 'scopeId')
  if (!scopeId) throw createError({ statusCode: 400, statusMessage: 'Scope id is required' })
  const body = await readValidatedNodeBody(event, UpdateProjectScopeSettingsSchema)
  const result = await updateScopeSettingsWithRoleCheck(slug, scopeType, decodeURIComponent(scopeId), body, auth.role)
  return { ok: true, ...result }
})
