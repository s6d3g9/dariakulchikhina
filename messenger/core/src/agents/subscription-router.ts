/**
 * subscription-router.ts — routes an agent reply to the correct AI backend.
 *
 * Decision tree:
 *  1. Load the agent's model routing row (messenger_agent_model_routing).
 *  2. Load the linked subscription (messenger_subscriptions).
 *  3. Based on provider:
 *     - claude-code-cli  → callClaudeSessionReply (spawns `claude --print`)
 *     - github-copilot   → callClaudeSessionReply with copilot binary
 *     - openai / google / alibaba / custom → callMessengerAgentModel (HTTP)
 *  4. All providers fall back to the legacy env-var LLM path on failure.
 *
 * Backward-compatible: if no routing row exists, behaves exactly as before
 * (uses agent.claudeSessionSlug + model from agent settings).
 */

import {
  useIngestDb,
  messengerSubscriptions,
  messengerAgentModelRouting,
  eq,
  and,
  isNull,
} from './ingest-db.ts'
import { PROVIDER_SPECS, resolveModelArg, resolveBaseUrl } from '../config/providers.ts'
import { callClaudeSessionReply } from './claude-cli-reply.ts'
import { callMessengerAgentModel } from './agent-llm.ts'
import type { MessengerAgentLlmMessage } from './agent-llm.ts'
import type { CliReplyHistoryItem } from './claude-cli-reply.ts'

export interface SubscriptionRouteContext {
  agentId: string
  /** claude-session slug for CLI-based providers */
  claudeSessionSlug?: string
  systemPrompt?: string
  history: CliReplyHistoryItem[]
  message: string
  /** Caller-supplied model override (highest priority) */
  modelOverride?: string
}

export interface RoutingInfo {
  provider: string
  model: string
  subscriptionId: string | null
  effort: string
}

/** Resolved routing state for a single agent */
export interface ResolvedRouting {
  provider: string
  adapter: string
  model: string
  effort: string
  apiKey: string | null
  baseUrl: string
  subscriptionId: string | null
}

/**
 * Load and resolve the full routing config for an agent.
 * Returns null if no routing row exists (caller uses legacy path).
 */
export async function resolveAgentRouting(agentId: string): Promise<ResolvedRouting | null> {
  const db = useIngestDb()

  const [routingRow] = await db
    .select()
    .from(messengerAgentModelRouting)
    .where(
      and(
        eq(messengerAgentModelRouting.agentId, agentId),
        isNull(messengerAgentModelRouting.deletedAt),
      ),
    )
    .limit(1)

  if (!routingRow) return null

  let subscription = null
  if (routingRow.subscriptionId) {
    const [row] = await db
      .select()
      .from(messengerSubscriptions)
      .where(
        and(
          eq(messengerSubscriptions.id, routingRow.subscriptionId),
          isNull(messengerSubscriptions.deletedAt),
        ),
      )
      .limit(1)
    subscription = row
  }

  const provider = (subscription?.provider ?? 'claude-code-cli') as keyof typeof PROVIDER_SPECS
  const model = routingRow.model ?? subscription?.defaultModel ?? 'claude-sonnet-4-6'
  const effort = routingRow.effort ?? 'medium'
  const apiKey = subscription?.apiKey ?? null
  const subConfig = (subscription?.config ?? {}) as Record<string, unknown>
  const baseUrl = resolveBaseUrl(provider, subConfig.baseUrl as string | undefined)

  return {
    provider,
    adapter: PROVIDER_SPECS[provider]?.adapter ?? 'claude-cli',
    model,
    effort,
    apiKey,
    baseUrl,
    subscriptionId: routingRow.subscriptionId,
  }
}

/**
 * Route an agent reply using the subscription config.
 * Returns the assistant reply text, or throws on unrecoverable error.
 *
 * Falls back gracefully:
 *  - CLI adapter failure → throw (let agent-store fall through to env-LLM)
 *  - API adapter failure → throw (let agent-store fall through to env-LLM)
 */
export async function routeAgentReply(ctx: SubscriptionRouteContext): Promise<string> {
  const routing = await resolveAgentRouting(ctx.agentId)
  if (!routing) {
    throw new Error('NO_ROUTING_CONFIG')
  }

  const effectiveModel = ctx.modelOverride ?? routing.model
  const modelArg = resolveModelArg(
    routing.provider as keyof typeof PROVIDER_SPECS,
    effectiveModel,
  )

  // ── CLI-based providers ────────────────────────────────────────────────
  if (routing.adapter === 'claude-cli' || routing.adapter === 'copilot-cli') {
    if (!ctx.claudeSessionSlug) {
      throw new Error('CLI_PROVIDER_NEEDS_SESSION_SLUG')
    }
    return await callClaudeSessionReply({
      slug: ctx.claudeSessionSlug,
      model: modelArg,
      systemPrompt: ctx.systemPrompt,
      history: ctx.history,
      message: ctx.message,
    })
  }

  // ── API-based providers (openai-compat, ollama) ────────────────────────
  const messages: MessengerAgentLlmMessage[] = [
    ...(ctx.systemPrompt ? [{ role: 'system' as const, content: ctx.systemPrompt }] : []),
    ...ctx.history.map(h => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user' as const, content: ctx.message },
  ]

  return await callMessengerAgentModel(messages, {
    model: modelArg,
    apiKey: routing.apiKey ?? undefined,
    // baseUrl is used via env config; the router sets MESSENGER_AGENT_API_BASE_URL
    // at the process level, so per-subscription overrides need a different approach.
    // For now we pass apiKey and model; baseUrl support can be added in agent-llm.ts.
  })
}

// ---------------------------------------------------------------------------
// CRUD helpers used by the orchestration-handler endpoints
// ---------------------------------------------------------------------------

export async function upsertAgentModelRouting(
  agentId: string,
  patch: {
    subscriptionId?: string | null
    model?: string | null
    effort?: string | null
  },
): Promise<void> {
  const db = useIngestDb()

  const [existing] = await db
    .select({ id: messengerAgentModelRouting.id })
    .from(messengerAgentModelRouting)
    .where(
      and(
        eq(messengerAgentModelRouting.agentId, agentId),
        isNull(messengerAgentModelRouting.deletedAt),
      ),
    )
    .limit(1)

  if (existing) {
    await db
      .update(messengerAgentModelRouting)
      .set({
        subscriptionId: patch.subscriptionId ?? undefined,
        model: patch.model ?? undefined,
        effort: patch.effort ?? undefined,
        updatedAt: new Date(),
        version: 2,
      })
      .where(eq(messengerAgentModelRouting.id, existing.id))
  } else {
    await db.insert(messengerAgentModelRouting).values({
      agentId,
      subscriptionId: patch.subscriptionId ?? undefined,
      model: patch.model ?? undefined,
      effort: patch.effort ?? 'medium',
    })
  }
}

export async function listUserSubscriptions(ownerUserId: string) {
  const db = useIngestDb()
  return db
    .select()
    .from(messengerSubscriptions)
    .where(
      and(
        eq(messengerSubscriptions.ownerUserId, ownerUserId),
        isNull(messengerSubscriptions.deletedAt),
      ),
    )
}

export async function upsertSubscription(
  ownerUserId: string,
  data: {
    id?: string
    provider: string
    label: string
    account: string
    apiKey?: string | null
    defaultModel: string
    isDefault?: boolean
    config?: Record<string, unknown>
  },
) {
  const db = useIngestDb()

  if (data.id) {
    const [existing] = await db
      .select({ id: messengerSubscriptions.id })
      .from(messengerSubscriptions)
      .where(
        and(
          eq(messengerSubscriptions.id, data.id),
          eq(messengerSubscriptions.ownerUserId, ownerUserId),
          isNull(messengerSubscriptions.deletedAt),
        ),
      )
      .limit(1)

    if (existing) {
      await db
        .update(messengerSubscriptions)
        .set({
          label: data.label,
          account: data.account,
          apiKey: data.apiKey ?? undefined,
          defaultModel: data.defaultModel,
          isDefault: data.isDefault ?? false,
          config: (data.config ?? {}) as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(messengerSubscriptions.id, existing.id))
      return existing.id
    }
  }

  const [inserted] = await db
    .insert(messengerSubscriptions)
    .values({
      id: data.id ?? undefined,
      ownerUserId,
      provider: data.provider,
      label: data.label,
      account: data.account,
      apiKey: data.apiKey ?? undefined,
      defaultModel: data.defaultModel,
      isDefault: data.isDefault ?? false,
      config: (data.config ?? {}) as Record<string, unknown>,
    })
    .returning({ id: messengerSubscriptions.id })

  return inserted?.id
}
