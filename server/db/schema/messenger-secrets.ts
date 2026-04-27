/**
 * Encrypted secrets table.
 *
 * One row per (scope, scopeRefId, key). Values are encrypted with
 * AES-256-GCM using the master key from env `SECRETS_MASTER_KEY` —
 * never returned in plaintext through HTTP API after creation.
 *
 * Spec: docs/architecture-v5/25-tenders-platform.md §3.7.1.
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

const tstz = (name: string) => timestamp(name, { withTimezone: true })

export const messengerSecrets = pgTable(
  'messenger_secrets',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** 'global' | 'project' | 'connector'. */
    scope: text('scope').notNull(),
    /** null for 'global'; project_id or connector_id otherwise. */
    scopeRefId: uuid('scope_ref_id'),
    /** dotted path, e.g. 'tenders.zakupki.individualPersonToken'. */
    key: text('key').notNull(),

    /** AES-256-GCM ciphertext, base64. */
    valueEncrypted: text('value_encrypted').notNull(),
    /** 12-byte IV, base64. Generated per record. */
    iv: text('iv').notNull(),
    /** 16-byte GCM auth tag, base64. */
    authTag: text('auth_tag').notNull(),

    /** lastFour, expiresAt, createdBy, lastRotatedAt — non-secret hints. */
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),

    createdAt: tstz('created_at').defaultNow().notNull(),
    updatedAt: tstz('updated_at').defaultNow().notNull(),
    version: integer('version').notNull().default(1),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [
    /**
     * Live (non-deleted) rows must be unique per (scope, scopeRefId,
     * key). Soft-deleted rows do not block re-creation — the partial
     * predicate (`deleted_at is null`) is the lever for this.
     */
    uniqueIndex('messenger_secrets_scope_key_unique')
      .on(t.scope, t.scopeRefId, t.key)
      .where(sql`deleted_at is null`),
  ],
)
