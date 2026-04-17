import { eq, sql } from 'drizzle-orm'
import { adminSettings } from '~/server/db/schema'
import { useDb } from '~/server/db/index'

let ensureAdminSettingsTablePromise: Promise<void> | null = null

/**
 * Lazy table bootstrap. The admin_settings table is small and may not
 * exist in older deployments yet — this idempotent `CREATE TABLE IF NOT
 * EXISTS` runs once per process and caches the promise.
 */
export async function ensureAdminSettingsTable() {
  if (!ensureAdminSettingsTablePromise) {
    const db = useDb()
    ensureAdminSettingsTablePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "admin_settings" (
          "id" serial PRIMARY KEY NOT NULL,
          "key" text NOT NULL,
          "value" jsonb DEFAULT '{}'::jsonb NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL,
          CONSTRAINT "admin_settings_key_unique" UNIQUE("key")
        )
      `)
    })().catch((error) => {
      ensureAdminSettingsTablePromise = null
      throw error
    })
  }
  await ensureAdminSettingsTablePromise
}

export async function findSettingByKey(key: string) {
  const db = useDb()
  const [record] = await db
    .select({ value: adminSettings.value })
    .from(adminSettings)
    .where(eq(adminSettings.key, key))
    .limit(1)
  return record?.value ?? null
}

export async function findSettingIdByKey(key: string): Promise<number | null> {
  const db = useDb()
  const [record] = await db
    .select({ id: adminSettings.id })
    .from(adminSettings)
    .where(eq(adminSettings.key, key))
    .limit(1)
  return record?.id ?? null
}

export async function updateSettingValue(id: number, value: unknown) {
  const db = useDb()
  const [updated] = await db
    .update(adminSettings)
    .set({ value: value as never, updatedAt: new Date() })
    .where(eq(adminSettings.id, id))
    .returning({ value: adminSettings.value })
  return updated?.value ?? null
}

export async function insertSetting(key: string, value: unknown) {
  const db = useDb()
  const [created] = await db
    .insert(adminSettings)
    .values({ key, value: value as never })
    .returning({ value: adminSettings.value })
  return created?.value ?? null
}
