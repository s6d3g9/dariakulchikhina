/**
 * Secrets repository — Drizzle queries for `messenger_secrets`. No
 * crypto here; this layer treats `value_encrypted` / `iv` / `auth_tag`
 * as opaque strings.
 */

import { and, eq, isNull, sql } from 'drizzle-orm'
import { messengerSecrets } from '~/server/db/schema'
import { useDb } from '~/server/db'

export interface SecretRow {
  id: string
  scope: string
  scopeRefId: string | null
  key: string
  valueEncrypted: string
  iv: string
  authTag: string
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  version: number
  deletedAt: Date | null
}

export async function findActiveByScopeAndKey(
  scope: string,
  scopeRefId: string | null,
  key: string,
): Promise<SecretRow | null> {
  const db = useDb()
  const conds = [
    eq(messengerSecrets.scope, scope),
    eq(messengerSecrets.key, key),
    isNull(messengerSecrets.deletedAt),
  ]
  if (scopeRefId === null) {
    conds.push(isNull(messengerSecrets.scopeRefId))
  } else {
    conds.push(eq(messengerSecrets.scopeRefId, scopeRefId))
  }
  const [row] = await db.select().from(messengerSecrets).where(and(...conds)).limit(1)
  return (row as SecretRow | undefined) ?? null
}

export async function listByScope(
  scope: string,
  scopeRefId: string | null,
): Promise<SecretRow[]> {
  const db = useDb()
  const conds = [
    eq(messengerSecrets.scope, scope),
    isNull(messengerSecrets.deletedAt),
  ]
  if (scopeRefId === null) {
    conds.push(isNull(messengerSecrets.scopeRefId))
  } else {
    conds.push(eq(messengerSecrets.scopeRefId, scopeRefId))
  }
  return (await db
    .select()
    .from(messengerSecrets)
    .where(and(...conds))) as SecretRow[]
}

export async function insertSecret(input: {
  scope: string
  scopeRefId: string | null
  key: string
  valueEncrypted: string
  iv: string
  authTag: string
  metadata: Record<string, unknown>
}): Promise<SecretRow> {
  const db = useDb()
  const [row] = await db
    .insert(messengerSecrets)
    .values({
      scope: input.scope,
      scopeRefId: input.scopeRefId,
      key: input.key,
      valueEncrypted: input.valueEncrypted,
      iv: input.iv,
      authTag: input.authTag,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsonb accepts unknown
      metadata: input.metadata as any,
    })
    .returning()
  return row as SecretRow
}

export async function updateSecretCiphertext(
  id: string,
  fields: {
    valueEncrypted: string
    iv: string
    authTag: string
    metadata: Record<string, unknown>
  },
): Promise<SecretRow | null> {
  const db = useDb()
  const [row] = await db
    .update(messengerSecrets)
    .set({
      valueEncrypted: fields.valueEncrypted,
      iv: fields.iv,
      authTag: fields.authTag,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: fields.metadata as any,
      updatedAt: sql`now()`,
      version: sql`${messengerSecrets.version} + 1`,
    })
    .where(eq(messengerSecrets.id, id))
    .returning()
  return (row as SecretRow | undefined) ?? null
}

export async function softDeleteSecret(id: string): Promise<void> {
  const db = useDb()
  await db
    .update(messengerSecrets)
    .set({ deletedAt: sql`now()` })
    .where(eq(messengerSecrets.id, id))
}
