import { createDefaultElementVisibilityConfig, normalizeElementVisibilityConfig } from '~/shared/types/element-visibility'
import { getAdminSetting } from '~/server/utils/admin-settings'

const ELEMENT_VISIBILITY_SETTING_KEY = 'element-visibility'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const storedValue = await getAdminSetting<unknown>(ELEMENT_VISIBILITY_SETTING_KEY)
  if (!storedValue) {
    return createDefaultElementVisibilityConfig()
  }

  return normalizeElementVisibilityConfig(storedValue)
})