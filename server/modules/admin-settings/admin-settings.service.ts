import * as repo from './admin-settings.repository'

export async function getAdminSetting<T>(key: string) {
  await repo.ensureAdminSettingsTable()
  const value = await repo.findSettingByKey(key)
  return (value as T | undefined) ?? null
}

export async function setAdminSetting<T>(key: string, value: T) {
  await repo.ensureAdminSettingsTable()
  const existingId = await repo.findSettingIdByKey(key)
  if (existingId !== null) {
    const updated = await repo.updateSettingValue(existingId, value)
    return updated as T
  }
  const created = await repo.insertSetting(key, value)
  return created as T
}
