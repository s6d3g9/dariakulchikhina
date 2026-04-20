// Admin-settings contract types.
// The service uses generic <T> parameters, so no Zod schemas are defined here.
// Domain-specific setting shapes live in the API handlers that call get/setAdminSetting.

export interface AdminSettingKey {
  key: string
}
