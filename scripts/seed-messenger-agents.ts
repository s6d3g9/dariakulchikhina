#!/usr/bin/env -S node --experimental-strip-types
/**
 * scripts/seed-messenger-agents.ts — seed built-in agents (composer,
 * orchestrator) into messenger_agents so they appear as contacts in the
 * messenger UI. Idempotent: skips rows that already exist by login/name.
 *
 * Requires DATABASE_URL in the environment (read from .env if not set).
 * Requires an owner user id; defaults to the currently registered `admin`
 * user if not passed via ADMIN_USER_ID / --owner.
 */
import postgres from 'postgres'
import { readFileSync } from 'node:fs'
import { randomUUID, randomBytes } from 'node:crypto'

function envFromDotEnv(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    for (const ln of readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/i.exec(ln)
      if (m) out[m[1]] = m[2]
    }
  } catch { /* no .env */ }
  return out
}

const env = { ...envFromDotEnv(), ...process.env }
const url = env.MESSENGER_CORE_DATABASE_URL || env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL / MESSENGER_CORE_DATABASE_URL not set')

const AGENTS = [
  {
    name: 'Composer',
    description:
      'Top of the hierarchy — strategic peer for the user. Discusses architecture, triage, pivots. Delegates execution to the orchestrator via claude-session.',
    model: 'sonnet',
    config: { kind: 'composer', pinned: true, order: 0 },
  },
  {
    name: 'Orchestrator',
    description:
      'Middle of the hierarchy — decomposes user requests into TASK.md files and routes them to workers by kind.',
    model: 'opus',
    config: { kind: 'orchestrator', pinned: true, order: 1 },
  },
]

const sql = postgres(url)

async function main() {
  const [{ id: ownerUserId } = { id: '' }] = await sql`
    SELECT id FROM messenger_users WHERE login = 'admin' AND deleted_at IS NULL LIMIT 1
  `
  if (!ownerUserId) {
    console.error('seed-agents: no `admin` user in messenger_users; register one first')
    process.exit(2)
  }
  console.log('seed-agents: owner =', ownerUserId)

  for (const a of AGENTS) {
    const [exists] = await sql`
      SELECT id FROM messenger_agents
      WHERE name = ${a.name} AND owner_user_id = ${ownerUserId} AND deleted_at IS NULL
      LIMIT 1
    `
    if (exists) {
      console.log('seed-agents: ✔ exists', a.name, '→', exists.id)
      // update description/model/config to current values
      await sql`
        UPDATE messenger_agents
        SET description = ${a.description},
            model = ${a.model},
            config = ${sql.json(a.config)},
            updated_at = NOW()
        WHERE id = ${exists.id}
      `
      continue
    }
    const id = randomUUID()
    const ingestToken = 'mag_' + randomBytes(24).toString('base64url')
    await sql`
      INSERT INTO messenger_agents (id, owner_user_id, name, description, model, ingest_token, config)
      VALUES (${id}, ${ownerUserId}, ${a.name}, ${a.description}, ${a.model}, ${ingestToken}, ${sql.json(a.config)})
    `
    console.log('seed-agents: + created', a.name, '→', id)
  }
  await sql.end()
}

main().catch(err => {
  console.error('seed-agents: failed:', err.message || err)
  process.exit(1)
})
