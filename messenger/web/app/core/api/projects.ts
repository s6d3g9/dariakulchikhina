import type { MessengerProject } from '../../entities/projects/model/useMessengerProjects'
import type { MessengerMcpServer, McpPingResult } from '../../entities/mcp/model/useMessengerMcp'
import type { MessengerExternalApi } from '../../entities/external-apis/model/useMessengerExternalApis'
import type { MessengerProjectAgent } from '../../entities/agents/model/useMessengerProjectAgents'
import type { BootstrapProposal } from '../../features/composer-bootstrap/model/useComposerBootstrap'
import type { SkillBundle, MessengerProjectSkill } from '../../entities/skills/model/useMessengerSkills'
import type { InstalledPlugin, MessengerProjectPlugin } from '../../entities/plugins/model/useMessengerPlugins'

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

  // ── Project Agents ─────────────────────────────────────────────────────────

  function listProjectAgents(projectId: string) {
    return auth.request<{ agents: MessengerProjectAgent[] }>(`/projects/${projectId}/agents`, { method: 'GET' })
  }

  function createProjectAgent(projectId: string, body: { type: 'composer' | 'orchestrator' | 'worker' | 'custom'; name?: string; description?: string; model?: string; skillBundleKind?: string }) {
    return auth.request<{ agent: MessengerProjectAgent }>(`/projects/${projectId}/agents`, { method: 'POST', body })
  }

  function deleteProjectAgent(projectId: string, agentId: string) {
    return auth.request<{ ok: true }>(`/projects/${projectId}/agents/${agentId}`, { method: 'DELETE' })
  }

  // ── Skills ─────────────────────────────────────────────────────────────────

  function listSkillBundles() {
    return auth.request<{ bundles: SkillBundle[] }>('/skill-bundles', { method: 'GET' })
  }

  function listProjectSkills(projectId: string) {
    return auth.request<{ skills: MessengerProjectSkill[] }>(`/projects/${projectId}/skills`, { method: 'GET' })
  }

  function upsertProjectSkill(projectId: string, skillId: string, body: { enabled?: boolean; config?: Record<string, unknown> }) {
    return auth.request<{ skill: MessengerProjectSkill }>(`/projects/${projectId}/skills`, {
      method: 'POST',
      body: { skillId, ...body },
    })
  }

  function deleteProjectSkill(projectId: string, skillId: string) {
    return auth.request<{ ok: true }>(`/projects/${projectId}/skills/${skillId}`, { method: 'DELETE' })
  }

  // ── Plugins ────────────────────────────────────────────────────────────────

  function listInstalledPlugins() {
    return auth.request<{ plugins: InstalledPlugin[] }>('/plugins', { method: 'GET' })
  }

  function listProjectPlugins(projectId: string) {
    return auth.request<{ plugins: MessengerProjectPlugin[] }>(`/projects/${projectId}/plugins`, { method: 'GET' })
  }

  function upsertProjectPlugin(projectId: string, pluginId: string, body: { enabled?: boolean; config?: Record<string, unknown> }) {
    return auth.request<{ plugin: MessengerProjectPlugin }>(`/projects/${projectId}/plugins`, {
      method: 'POST',
      body: { pluginId, ...body },
    })
  }

  function deleteProjectPlugin(projectId: string, pluginId: string) {
    return auth.request<{ ok: true }>(`/projects/${projectId}/plugins/${pluginId}`, { method: 'DELETE' })
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  function bootstrapProject(projectId: string, body: { mode: 'manual' | 'auto'; taskDescription?: string }) {
    return auth.request<{ ok: true } | { composerAgentId: string; proposal: BootstrapProposal; applyUrl: string }>(`/projects/${projectId}/bootstrap`, { method: 'POST', body })
  }

  function bootstrapApply(projectId: string, body: { proposal: BootstrapProposal }) {
    return auth.request<{ ok: true }>(`/projects/${projectId}/bootstrap/apply`, { method: 'POST', body })
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
    listProjectAgents,
    createProjectAgent,
    deleteProjectAgent,
    bootstrapProject,
    bootstrapApply,
    listSkillBundles,
    listProjectSkills,
    upsertProjectSkill,
    deleteProjectSkill,
    listInstalledPlugins,
    listProjectPlugins,
    upsertProjectPlugin,
    deleteProjectPlugin,
  }
}
