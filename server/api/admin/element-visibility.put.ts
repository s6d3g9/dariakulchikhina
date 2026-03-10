import { ElementVisibilityConfigSchema, normalizeElementVisibilityConfig } from '~/shared/types/element-visibility'
import { setAdminSetting } from '~/server/utils/admin-settings'

const ELEMENT_VISIBILITY_SETTING_KEY = 'element-visibility'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readValidatedNodeBody(event, ElementVisibilityConfigSchema)
  const normalizedValue = normalizeElementVisibilityConfig(body)
  const savedValue = await setAdminSetting(ELEMENT_VISIBILITY_SETTING_KEY, normalizedValue)

  return normalizeElementVisibilityConfig(savedValue)
})