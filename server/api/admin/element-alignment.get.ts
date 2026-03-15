import { createDefaultElementAlignmentConfig, normalizeElementAlignmentConfig } from '~/shared/types/element-alignment'
import { getAdminSetting } from '~/server/utils/admin-settings'

const ELEMENT_ALIGNMENT_SETTING_KEY = 'element-alignment'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const storedValue = await getAdminSetting<unknown>(ELEMENT_ALIGNMENT_SETTING_KEY)
  if (!storedValue) {
    return createDefaultElementAlignmentConfig()
  }

  return normalizeElementAlignmentConfig(storedValue)
})