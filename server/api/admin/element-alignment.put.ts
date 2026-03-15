import { ElementAlignmentConfigSchema, normalizeElementAlignmentConfig } from '~/shared/types/element-alignment'
import { setAdminSetting } from '~/server/utils/admin-settings'

const ELEMENT_ALIGNMENT_SETTING_KEY = 'element-alignment'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body = await readValidatedNodeBody(event, ElementAlignmentConfigSchema)
  const normalizedValue = normalizeElementAlignmentConfig(body)
  const savedValue = await setAdminSetting(ELEMENT_ALIGNMENT_SETTING_KEY, normalizedValue)

  return normalizeElementAlignmentConfig(savedValue)
})