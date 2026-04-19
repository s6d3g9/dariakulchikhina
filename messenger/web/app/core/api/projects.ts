import type { MessengerProject } from '../../entities/projects/model/useMessengerProjects'
import type { MessengerMcpServer, McpPingResult } from '../../entities/mcp/model/useMessengerMcp'
import type { MessengerExternalApi } from '../../entities/external-apis/model/useMessengerExternalApis'

export function useProjectsApi() {
  const auth = useMessengerAuth()

  // ── Projects ───────────────────────────────────────────────────────────────

  function listProjects(cursor?: string, limit = 20) {
    return auth.request<{ projects: MessengerProject[]; nextCursor: string | null }>('/projects', {
      method: 'GET',
      query: { cursor, limit },
    })
  }

  function getProject(projectId: string) {
    return auth.request<{ project: MessengerProject }>(`/projects/${projectId}`, { method: 'GET' })
  }

  function createProject(payload: { name: string; description?: string }) {
    return auth.request<{ project: MessengerProject }>('/projects', {
      method: 'POST',
      body: payload,
    })
  }

  function updateProject(projectId: string, payload: { name?: string; description?: string }) {
    return auth.request<{ project: MessengerProject }>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: payload,
    })
  }

  function deleteProject(projectId: string) {
    return auth.request<{ ok: true }>(`/projects/${projectId}`, { method: 'DELETE' })
  }

  // ── MCP Servers ────────────────────────────────────────────────────────────

  function listMcpServers(projectId: string) {
    return auth.request<{ servers: MessengerMcpServer[] }>(`/projects/${projectId}/mcp`, { method: 'GET' })
  }

  function createMcpServer(projectId: string, body: { name: string; transport: string; endpoint: string; config?: Record<string, unknown>; enabled?: boolean }) {
    return auth.request<{ server: MessengerMcpServer }>(`/projects/${projectId}/mcp`, { method: 'POST', body })
  }

  function updateMcpServer(projectId: string, entryId: string, body: Partial<{ name: string; transport: string; endpoint: string; config: Record<string, unknown>; enabled: boolean }>) {
    return auth.request<{ server: MessengerMcpServer }>(`/projects/${projectId}/mcp/${entryId}`, { method: 'PATCH', body })
  }

  function deleteMcpServer(projectId: string, entryId: string) {
    return auth.request<{ ok: true }>(`/projects/${projectId}/mcp/${entryId}`, { method: 'DELETE' })
  }

  function pingMcpServer(projectId: string, entryId: string) {
    return auth.request<McpPingResult>(`/projects/${projectId}/mcp/${entryId}/ping`, { method: 'POST' })
  }

  // ── External APIs ──────────────────────────────────────────────────────────

  function listExternalApis(projectId: string) {
    return auth.request<{ apis: MessengerExternalApi[] }>(`/projects/${projectId}/external-apis`, { method: 'GET' })
  }

  function createExternalApi(projectId: string, body: { name: string; baseUrl: string; openapiRef?: string; authType?: string; config?: Record<string, unknown>; enabled?: boolean }) {
    return auth.request<{ api: MessengerExternalApi }>(`/projects/${projectId}/external-apis`, { method: 'POST', body })
  }

  function updateExternalApi(projectId: string, entryId: string, body: Partial<{ name: string; baseUrl: string; openapiRef: string; authType: string; config: Record<string, unknown>; enabled: boolean }>) {
    return auth.request<{ api: MessengerExternalApi }>(`/projects/${projectId}/external-apis/${entryId}`, { method: 'PATCH', body })
  }

  function deleteExternalApi(projectId: string, entryId: string) {
    return auth.request<{ ok: true }>(`/projects/${projectId}/external-apis/${entryId}`, { method: 'DELETE' })
  }

  return {
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    listMcpServers,
    createMcpServer,
    updateMcpServer,
    deleteMcpServer,
    pingMcpServer,
    listExternalApis,
    createExternalApi,
    updateExternalApi,
    deleteExternalApi,
  }
}
