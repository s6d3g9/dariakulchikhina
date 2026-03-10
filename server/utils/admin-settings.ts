import { eq } from 'drizzle-orm'
import { adminSettings } from '~/server/db/schema'
import { useDb } from '~/server/db/index'

export async function getAdminSetting<T>(key: string) {
  const db = useDb()
  const [record] = await db
    .select({ value: adminSettings.value })
    .from(adminSettings)
    .where(eq(adminSettings.key, key))
    .limit(1)

  return (record?.value as T | undefined) ?? null
}

export async function setAdminSetting<T>(key: string, value: T) {
  const db = useDb()
  const [existing] = await db
    .select({ id: adminSettings.id })
    .from(adminSettings)
    .where(eq(adminSettings.key, key))
    .limit(1)

  if (existing) {
    const [updated] = await db
      .update(adminSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(adminSettings.id, existing.id))
      .returning({ value: adminSettings.value })

    return updated?.value as T
  }

  const [created] = await db
    .insert(adminSettings)
    .values({ key, value })
    .returning({ value: adminSettings.value })

  return created?.value as T
}