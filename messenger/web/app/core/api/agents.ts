import type { MessengerAgentItem, MessengerAgentSettings, MessengerAgentGraphNodeInput } from '../../entities/agents/model/useMessengerAgents'
import type { MessengerAgentKnowledgeStatus, MessengerAgentKnowledgePreset } from '../../entities/agents/model/useMessengerAgentKnowledge'
import type { MessengerAgentRun } from '../../entities/agents/model/useMessengerAgentRuns'
import type { MessengerAgentEdgePayload } from '../../entities/agents/model/useMessengerAgentEdgePayloads'
import type { MessengerAgentWorkspaceListing, MessengerAgentWorkspaceFilePreview } from '../../widgets/agent-workspace/model/useMessengerAgentWorkspace'

export function useAgentsApi() {
  const auth = useMessengerAuth()

  function listAgents() {
    return auth.request<{ agents: MessengerAgentItem[] }>('/agents', { method: 'GET' })
  }

  function getAgentSettings(agentId: string) {
    return auth.request<{ settings: MessengerAgentSettings }>(`/agents/${agentId}/settings`, { method: 'GET' })
  }

  function putAgentSettings(agentId: string, payload: Pick<MessengerAgentSettings, 'subscriptionId' | 'model' | 'effort' | 'apiKey' | 'ssh' | 'knowledge' | 'connections' | 'graphPosition'>) {
    return auth.request<{ settings: MessengerAgentSettings }>(`/agents/${agentId}/settings`, {
      method: 'PUT',
      body: payload,
    })
  }

  function putAgentGraph(graph: Record<string, MessengerAgentGraphNodeInput>) {
    return auth.request<{ settings: MessengerAgentSettings[] }>('/agents/graph', {
      method: 'PUT',
      body: { graph },
    })
  }

  function getAgentKnowledge(agentId: string) {
    return auth.request<{ knowledge: MessengerAgentKnowledgeStatus }>(`/agents/${agentId}/knowledge`, { method: 'GET' })
  }

  function getAgentKnowledgePreset(agentId: string) {
    return auth.request<{ preset: MessengerAgentKnowledgePreset }>(`/agents/${agentId}/knowledge/preset`, { method: 'GET' })
  }

  function postAgentKnowledgeReindex(agentId: string) {
    return auth.request<{ knowledge: MessengerAgentKnowledgeStatus }>(`/agents/${agentId}/knowledge/reindex`, { method: 'POST' })
  }

  function getAgentWorkspace(agentId: string, path = '') {
    return auth.request<{ workspace: MessengerAgentWorkspaceListing }>(`/agents/${agentId}/workspace`, {
      method: 'GET',
      query: { path },
    })
  }

  function getAgentWorkspaceFile(agentId: string, path: string) {
    return auth.request<{ file: MessengerAgentWorkspaceFilePreview }>(`/agents/${agentId}/workspace/file`, {
      method: 'GET',
      query: { path },
    })
  }

  function listAgentRuns(agentId?: string, limit = 10) {
    return auth.request<{ runs: MessengerAgentRun[] }>('/agents/runs', {
      method: 'GET',
      query: { agentId, limit },
    })
  }

  function getAgentRun(runId: string) {
    return auth.request<{ run: MessengerAgentRun }>(`/agents/runs/${runId}`, { method: 'GET' })
  }

  function listAgentEdgePayloads(agentId?: string, limit = 24) {
    return auth.request<{ edgePayloads: MessengerAgentEdgePayload[] }>('/agents/edge-payloads', {
      method: 'GET',
      query: { agentId, limit },
    })
  }

  function listCliSessions(includeArchived = false) {
    return auth.request<{ sessions: import('../../entities/sessions/model/useMessengerCliSessions').MessengerCliSession[] }>('/cli-sessions', {
      method: 'GET',
      query: { includeArchived: includeArchived ? '1' : undefined },
    })
  }

  function patchCliSession(slug: string, payload: { model: string }) {
    return auth.request<void>(`/cli-sessions/${slug}`, {
      method: 'PATCH',
      body: payload,
    })
  }

  function getAgentActiveRun(agentId: string) {
    return auth.request<{ run: { id: string; status: string; prompt: string | null; createdAt: string; conversationId: string | null } | null }>(
      `/agents/${agentId}/active-run`,
      { method: 'GET' },
    )
  }

  function getAgentRunEvents(agentId: string, runId: string, cursor?: string, limit = 200) {
    return auth.request<{ items: Array<{ id: string; occurredAt: string; payload: Record<string, unknown> | null }>; nextCursor: string | null }>(
      `/agents/${agentId}/runs/${runId}/events`,
      { method: 'GET', query: { cursor, limit } },
    )
  }

  return {
    listAgents,
    getAgentSettings,
    putAgentSettings,
    putAgentGraph,
    getAgentKnowledge,
    getAgentKnowledgePreset,
    postAgentKnowledgeReindex,
    getAgentWorkspace,
    getAgentWorkspaceFile,
    listAgentRuns,
    getAgentRun,
    listAgentEdgePayloads,
    listCliSessions,
    patchCliSession,
    getAgentActiveRun,
    getAgentRunEvents,
  }
}
