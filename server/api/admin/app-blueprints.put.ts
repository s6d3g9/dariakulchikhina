import { AppBlueprintCatalogConfigSchema, normalizeAppBlueprintCatalogConfig } from '~/shared/types/app-catalog'
import { setAdminSetting } from '~/server/utils/admin-settings'

const APP_BLUEPRINTS_SETTING_KEY = 'app-blueprints'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readValidatedNodeBody(event, AppBlueprintCatalogConfigSchema)
  const normalizedValue = normalizeAppBlueprintCatalogConfig(body)
  const savedValue = await setAdminSetting(APP_BLUEPRINTS_SETTING_KEY, normalizedValue)

  return normalizeAppBlueprintCatalogConfig(savedValue)
})