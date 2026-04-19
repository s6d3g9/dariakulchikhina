import { log } from '~/server/utils/logger'

export type AgentAuditAction = 'create' | 'update' | 'delete'

export interface AgentAuditEntry {
  action: AgentAuditAction
  agentId: string
  actorUserId?: number
  patch?: Record<string, unknown>
}

export function auditAgentMutation(entry: AgentAuditEntry): void {
  log.info({ ...entry, domain: 'agent-registry' }, `agent-registry:${entry.action}`)
}
