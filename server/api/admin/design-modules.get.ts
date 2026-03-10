import { createDefaultDesignModules, normalizeDesignModulesConfig } from '~/shared/types/design-modules'
import { getAdminSetting } from '~/server/utils/admin-settings'

const DESIGN_MODULES_SETTING_KEY = 'design-modules'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const storedValue = await getAdminSetting<unknown>(DESIGN_MODULES_SETTING_KEY)
  if (!storedValue) {
    return createDefaultDesignModules()
  }

  return normalizeDesignModulesConfig(storedValue)
})