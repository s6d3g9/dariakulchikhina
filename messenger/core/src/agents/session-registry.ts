// Session Registry — single point of truth for creating and updating
// `messenger_cli_sessions` rows.
//
// Why this exists: until the W1 migration, owner_user_id / project_id were
// only stored on the agent and JOIN-ed at read time. After W1 they're
// denormalized into the cli_sessions row, so EVERY insert must populate them
// consistently. Spreading that responsibility across each entry-point is how
// the project ended up with 42 orphaned agents and zero cli_sessions rows
// for live registry sessions. This module forces every code path through
// one validated function.
//
// Contract:
//   - The session is *always* attached to an agent.
//   - That agent *always* has owner_user_id and project_id (W1 constraint).
//   - Therefore the cli_session row inherits both, atomically, in one INSERT.
//
// Anything that wants to bypass this (shell scripts, external bridges) must
// call the corresponding HTTP route which itself uses these helpers.

import { and, eq, isNull } from 'drizzle-orm'

import { messengerAgents, messengerCliSessions } from '../db/schema.ts'
import type { useIngestDb } from '../store/ingest-store.ts'

type Db = ReturnType<typeof useIngestDb>

export type AgentContext = {
  agentId: string
  ownerUserId: string
  projectId: string
}

/**
 * Resolves the (ownerUserId, projectId) for an agent. Throws if the agent
 * is missing or soft-deleted — callers must surface this as a 4xx, never
 * silently fall back.
 */
export async function resolveAgentContext(db: Db, agentId: string): Promise<AgentContext> {
  const [row] = await db
    .select({
      id: messengerAgents.id,
      ownerUserId: messengerAgents.ownerUserId,
      projectId: messengerAgents.projectId,
    })
    .from(messengerAgents)
    .where(and(eq(messengerAgents.id, agentId), isNull(messengerAgents.deletedAt)))
    .limit(1)
  if (!row) {
    throw new SessionRegistryError('AGENT_NOT_FOUND', `agent ${agentId} not found or deleted`)
  }
  return { agentId: row.id, ownerUserId: row.ownerUserId, projectId: row.projectId }
}

export type RegisterCliSessionInput = {
  agentId: string
  slug: string
  status?: 'pending' | 'starting' | 'running' | 'stopped'
  runId?: string | null
  model?: string | null
  workroom?: string | null
  tmuxWindow?: string | null
  prompt?: string | null
}

export type RegisterCliSessionResult = {
  id: string
  slug: string
  ownerUserId: string
  projectId: string
  agentId: string
  created: boolean
}

/**
 * Idempotent upsert by (slug) or (runId).
 *
 * - If a row exists for `runId` (or for `slug` when `runId` is absent),
 *   it's updated in place — model/window/status get refreshed.
 * - Otherwise a new row is inserted with owner_user_id/project_id resolved
 *   from the agent.
 *
 * Returns the canonical context so callers can immediately publish deltas
 * or wire up downstream state.
 */
export async function registerCliSession(
  db: Db,
  input: RegisterCliSessionInput,
): Promise<RegisterCliSessionResult> {
  const ctx = await resolveAgentContext(db, input.agentId)

  // Try to find an existing row by runId first (most reliable correlation
  // when an agent's run was started before the tmux session attached).
  if (input.runId) {
    const [existing] = await db
      .select({ id: messengerCliSessions.id, slug: messengerCliSessions.slug })
      .from(messengerCliSessions)
      .where(and(
        eq(messengerCliSessions.runId, input.runId),
        isNull(messengerCliSessions.deletedAt),
      ))
      .limit(1)
    if (existing) {
      await db
        .update(messengerCliSessions)
        .set({
          slug: input.slug,
          model: input.model ?? null,
          tmuxWindow: input.tmuxWindow ?? null,
          workroom: input.workroom ?? null,
          status: input.status ?? 'running',
          ...(input.prompt != null ? { prompt: input.prompt } : {}),
        })
        .where(eq(messengerCliSessions.id, existing.id))
      return { id: existing.id, slug: input.slug, ...ctx, created: false }
    }
  }

  // Fall back to slug-based dedupe so re-registering the same tmux window
  // doesn't create duplicates after a restart.
  const [bySlug] = await db
    .select({ id: messengerCliSessions.id })
    .from(messengerCliSessions)
    .where(and(
      eq(messengerCliSessions.slug, input.slug),
      isNull(messengerCliSessions.deletedAt),
    ))
    .limit(1)
  if (bySlug) {
    await db
      .update(messengerCliSessions)
      .set({
        agentId: ctx.agentId,
        ownerUserId: ctx.ownerUserId,
        projectId: ctx.projectId,
        runId: input.runId ?? null,
        model: input.model ?? null,
        tmuxWindow: input.tmuxWindow ?? null,
        workroom: input.workroom ?? null,
        status: input.status ?? 'running',
        ...(input.prompt != null ? { prompt: input.prompt } : {}),
      })
      .where(eq(messengerCliSessions.id, bySlug.id))
    return { id: bySlug.id, slug: input.slug, ...ctx, created: false }
  }

  const [inserted] = await db
    .insert(messengerCliSessions)
    .values({
      ownerUserId: ctx.ownerUserId,
      projectId: ctx.projectId,
      agentId: ctx.agentId,
      runId: input.runId ?? null,
      slug: input.slug,
      workroom: input.workroom ?? null,
      model: input.model ?? null,
      tmuxWindow: input.tmuxWindow ?? null,
      status: input.status ?? 'running',
      prompt: input.prompt ?? null,
    })
    .returning({ id: messengerCliSessions.id })
  return { id: inserted!.id, slug: input.slug, ...ctx, created: true }
}

/**
 * Mark a session stopped without deleting it. Used by lifecycle handlers
 * when a tmux window dies or the run completes/errors.
 */
export async function markCliSessionStopped(db: Db, slug: string): Promise<boolean> {
  const result = await db
    .update(messengerCliSessions)
    .set({ status: 'stopped', stoppedAt: new Date() })
    .where(and(
      eq(messengerCliSessions.slug, slug),
      isNull(messengerCliSessions.deletedAt),
    ))
  return Array.isArray(result) ? result.length > 0 : true
}

export class SessionRegistryError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'SessionRegistryError'
  }
}
