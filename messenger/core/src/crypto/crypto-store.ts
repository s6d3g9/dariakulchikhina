import { eq, and, isNull } from 'drizzle-orm'

import { useMessengerDb } from '../db/client.ts'
import { messengerDeviceKeys } from '../db/schema.ts'

export interface MessengerDevicePublicKeyRecord {
  kty: 'EC'
  crv: 'P-256'
  x: string
  y: string
  ext?: boolean
  key_ops?: string[]
}

const DEFAULT_DEVICE_ID = 'default'

export async function findMessengerDevicePublicKeyByUserId(userId: string): Promise<MessengerDevicePublicKeyRecord | null> {
  const db = useMessengerDb()
  const row = await db
    .select()
    .from(messengerDeviceKeys)
    .where(
      and(
        eq(messengerDeviceKeys.userId, userId),
        eq(messengerDeviceKeys.deviceId, DEFAULT_DEVICE_ID),
        isNull(messengerDeviceKeys.deletedAt),
      ),
    )
    .limit(1)
    .then(rows => rows[0] ?? null)

  return row ? (row.publicKey as MessengerDevicePublicKeyRecord) : null
}

export async function saveMessengerDevicePublicKey(userId: string, publicKey: MessengerDevicePublicKeyRecord): Promise<MessengerDevicePublicKeyRecord> {
  const db = useMessengerDb()
  const existing = await db
    .select()
    .from(messengerDeviceKeys)
    .where(
      and(
        eq(messengerDeviceKeys.userId, userId),
        eq(messengerDeviceKeys.deviceId, DEFAULT_DEVICE_ID),
      ),
    )
    .limit(1)
    .then(rows => rows[0] ?? null)

  const now = new Date()

  if (existing) {
    await db
      .update(messengerDeviceKeys)
      .set({
        publicKey,
        version: existing.version + 1,
        deletedAt: null,
      })
      .where(eq(messengerDeviceKeys.id, existing.id))
  } else {
    await db.insert(messengerDeviceKeys).values({
      userId,
      deviceId: DEFAULT_DEVICE_ID,
      publicKey,
      createdAt: now,
    })
  }

  return publicKey
}
