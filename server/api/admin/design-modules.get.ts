import { createDefaultDesignModules, normalizeDesignModulesConfig } from '~/shared/types/design-modules'
import { getAdminSetting } from '~/server/modules/admin-settings/admin-settings.service'

const DESIGN_MODULES_SETTING_KEY = 'design-modules'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const storedValue = await getAdminSetting<unknown>(DESIGN_MODULES_SETTING_KEY)
  if (!storedValue) {
    return createDefaultDesignModules()
  }

  return normalizeDesignModulesConfig(storedValue)
})