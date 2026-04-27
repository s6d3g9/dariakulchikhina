/**
 * Secrets service — only place that knows how to flip plaintext ↔
 * ciphertext. Public methods:
 *
 *  - `listSecrets(scope, scopeRefId)` — masked views for UI
 *  - `writeSecret(input)` — create or upsert by (scope, scopeRefId, key)
 *  - `deleteSecret(id)` — soft delete
 *  - `getSecret(scope, scopeRefId, key)` — service-internal plaintext
 *    accessor. Never wired to an HTTP handler directly.
 *
 * Spec: docs/architecture-v5/25-tenders-platform.md §3.7.
 */

import * as repo from './secrets.repository'
import {
  decryptSecret,
  encryptSecret,
  maskValue,
} from './secrets.crypto'
import type { SecretRow } from './secrets.repository'
import type { SecretMetadata, SecretView, SecretWrite } from './secrets.types'

export async function listSecrets(
  scope: SecretWrite['scope'],
  scopeRefId: string | null,
): Promise<SecretView[]> {
  const rows = await repo.listByScope(scope, scopeRefId)
  return rows.map(toView)
}

export async function writeSecret(input: SecretWrite): Promise<SecretView> {
  const scopeRefId = input.scopeRefId ?? null
  const existing = await repo.findActiveByScopeAndKey(input.scope, scopeRefId, input.key)
  const enc = encryptSecret(input.value)
  const metadata: SecretMetadata = {
    ...(input.metadata ?? {}),
    lastFour: input.value.slice(-4),
    lastRotatedAt: new Date().toISOString(),
  }
  if (existing) {
    const row = await repo.updateSecretCiphertext(existing.id, {
      valueEncrypted: enc.ciphertext,
      iv: enc.iv,
      authTag: enc.authTag,
      metadata,
    })
    if (!row) throw new Error('Updated row missing — stale read?')
    return toView(row)
  }
  const row = await repo.insertSecret({
    scope: input.scope,
    scopeRefId,
    key: input.key,
    valueEncrypted: enc.ciphertext,
    iv: enc.iv,
    authTag: enc.authTag,
    metadata,
  })
  return toView(row)
}

export async function deleteSecret(id: string): Promise<void> {
  await repo.softDeleteSecret(id)
}

/**
 * Service-internal plaintext accessor. Returns null when the secret
 * does not exist or is soft-deleted — callers must treat null as
 * "secret not configured" and degrade gracefully (see §3.7.4).
 */
export async function getSecret(
  scope: SecretWrite['scope'],
  scopeRefId: string | null,
  key: string,
): Promise<string | null> {
  const row = await repo.findActiveByScopeAndKey(scope, scopeRefId, key)
  if (!row) return null
  return decryptSecret({
    ciphertext: row.valueEncrypted,
    iv: row.iv,
    authTag: row.authTag,
  })
}

/**
 * Convenience: lookup by a dotted key path with `scope='global'` and
 * `scopeRefId=null`. The ingest service uses this for source-level
 * tokens (e.g. `tenders.zakupki.individualPersonToken`).
 */
export async function getGlobalSecret(key: string): Promise<string | null> {
  return getSecret('global', null, key)
}

// === Helpers =================================================================

function toView(row: SecretRow): SecretView {
  // We only know the plaintext at creation/update time, so we can only
  // surface the mask for rows that have `lastFour` in metadata. Older
  // rows or imports without metadata get a generic mask.
  const lastFour =
    typeof row.metadata?.lastFour === 'string' ? (row.metadata.lastFour as string) : ''
  const mask = lastFour ? maskValue('••••••' + lastFour) : '••••••'
  return {
    id: row.id,
    scope: row.scope as SecretWrite['scope'],
    scopeRefId: row.scopeRefId,
    key: row.key,
    mask,
    metadata: (row.metadata ?? {}) as SecretMetadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  }
}
