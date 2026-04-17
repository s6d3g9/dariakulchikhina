import { eq, sql } from 'drizzle-orm'
import { adminSettings } from '~/server/db/schema'
import { useDb } from '~/server/db/index'

let ensureAdminSettingsTablePromise: Promise<void> | null = null

async function ensureAdminSettingsTable() {
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

export async function getAdminSetting<T>(key: string) {
  await ensureAdminSettingsTable()
  const db = useDb()
  const [record] = await db
    .select({ value: adminSettings.value })
    .from(adminSettings)
    .where(eq(adminSettings.key, key))
    .limit(1)

  return (record?.value as T | undefined) ?? null
}

export async function setAdminSetting<T>(key: string, value: T) {
  await ensureAdminSettingsTable()
  const db = useDb()
  const [existing] = await db
    .select({ id: adminSettings.id })
    .from(adminSettings)
    .where(eq(adminSettings.key, key))
    .limit(1)

  if (existing) {
    const [updated] = await db
      .update(adminSettings)
      .set({ value: value as any, updatedAt: new Date() })
      .where(eq(adminSettings.id, existing.id))
      .returning({ value: adminSettings.value })

    return updated?.value as T
  }

  const [created] = await db
    .insert(adminSettings)
    .values({ key, value: value as any })
    .returning({ value: adminSettings.value })

  return created?.value as T
}
