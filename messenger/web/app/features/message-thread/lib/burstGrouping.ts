// Pure logic for folding adjacent agent messages into a single visual
// "burst" bubble. Lives in its own module so it can be unit-tested with
// node:test without pulling in the whole MessengerChatSection component.

// The minimal shape `shouldFoldIntoBurst` reads. Real callers pass full
// `MessengerThreadMessage` objects; tests can pass plain literals matching
// just these fields. Keep this intentionally narrow — every field added
// here is a new fold-blocking signal we have to test.
export interface BurstFoldCandidate {
  own?: boolean
  agentId?: string
  runId?: string
  rootRunId?: string
  deletedAt?: string
  createdAt: string
  kind?: 'text' | 'file'
  editedAt?: string
  attachment?: unknown
  commentOn?: { id?: string } | null
  replyTo?: { id?: string } | null
  forwardedFrom?: { messageId?: string } | null
  reactions?: unknown[] | null
  comments?: unknown[] | null
}

// Default fold-window for legacy messages without rootRunId. Within one task
// runs typically fire within seconds; a half-hour gap is almost certainly a
// new task started without a user prompt in between.
export const BURST_MAX_GAP_MS = 30 * 60 * 1000

export function shouldFoldIntoBurst(prev: BurstFoldCandidate, next: BurstFoldCandidate): boolean {
  if (prev.own || next.own) return false
  if (!prev.agentId || !next.agentId) return false
  if (prev.agentId !== next.agentId) return false
  if (prev.deletedAt || next.deletedAt) return false
  if (next.commentOn?.id) return false
  if (next.replyTo?.id) return false
  if (next.forwardedFrom?.messageId) return false
  if (next.attachment) return false
  if (next.kind && next.kind !== 'text') return false
  // Folding `next` would visually drop these — refuse so the user keeps
  // seeing them. The head retains its own reactions/comments because we
  // only spread `...head` into the group; tail entries were at risk.
  if (next.reactions && next.reactions.length > 0) return false
  if (next.comments && next.comments.length > 0) return false
  if (next.editedAt) return false
  // rootRunId is the authoritative signal: when both messages carry it,
  // fold iff they belong to the same run subtree. Different roots = different
  // logical tasks even if they fire back-to-back.
  if (prev.rootRunId && next.rootRunId) {
    return prev.rootRunId === next.rootRunId
  }
  // Legacy fallback: pre-rootRunId messages get the time-gap heuristic so
  // an agent finishing one task and autonomously starting another without
  // a user prompt in between doesn't get visually merged.
  const prevTime = Date.parse(prev.createdAt)
  const nextTime = Date.parse(next.createdAt)
  if (!Number.isNaN(prevTime) && !Number.isNaN(nextTime)) {
    if (nextTime - prevTime > BURST_MAX_GAP_MS) return false
  }
  return true
}
