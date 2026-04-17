import { DesignModulesConfigSchema, normalizeDesignModulesConfig } from '~/shared/types/design-modules'
import { setAdminSetting } from '~/server/modules/admin-settings/admin-settings.service'

const DESIGN_MODULES_SETTING_KEY = 'design-modules'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readValidatedNodeBody(event, DesignModulesConfigSchema)
  const normalizedValue = normalizeDesignModulesConfig(body)
  const savedValue = await setAdminSetting(DESIGN_MODULES_SETTING_KEY, normalizedValue)

  return normalizeDesignModulesConfig(savedValue)
})