import { createDefaultAppBlueprintCatalogConfig, normalizeAppBlueprintCatalogConfig } from '~/shared/types/app-catalog'
import { getAdminSetting } from '~/server/modules/admin-settings/admin-settings.service'

const APP_BLUEPRINTS_SETTING_KEY = 'app-blueprints'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const storedValue = await getAdminSetting<unknown>(APP_BLUEPRINTS_SETTING_KEY)
  if (!storedValue) {
    return createDefaultAppBlueprintCatalogConfig()
  }

  return normalizeAppBlueprintCatalogConfig(storedValue)
})