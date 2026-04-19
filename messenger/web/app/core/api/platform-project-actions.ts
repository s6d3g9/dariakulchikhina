import { buildMessengerUrl } from '../../utils/messenger-url'
import type {
  MessengerPlatformProjectSummary,
  MessengerPlatformActionCatalog,
  MessengerPlatformScopeDetailBundle,
  MessengerPlatformScopeType,
  ProjectMutationActionId,
  ProjectActionExecutePayload,
} from '../../features/project-engine/model/useMessengerProjectActions'

export interface PlatformProjectActionMutationResponse {
  ok: boolean
  message: string
  mutation?: { kind: string; id: string; label: string }
}

export interface PlatformGovernanceParticipantResponse {
  participant: { persistedId: number }
}

function readCsrfCookie(): string {
  if (!import.meta.client) return ''
  const prefix = 'csrf_token='
  const entry = document.cookie.split(';').map(s => s.trim()).find(s => s.startsWith(prefix))
  if (!entry) return ''
  try { return decodeURIComponent(entry.slice(prefix.length)) } catch { return '' }
}

export function usePlatformProjectActionsApi(projectRoot: Readonly<Ref<string>>) {
  function request<T>(path: string, options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: unknown
  } = {}): Promise<T> {
    const method = options.method ?? 'GET'
    const headers: Record<string, string> = {}
    if (method !== 'GET') {
      const csrf = readCsrfCookie()
      if (csrf) headers['x-csrf-token'] = csrf
    }
    return $fetch<T>(buildMessengerUrl(projectRoot.value, path), {
      method,
      body: options.body as BodyInit,
      credentials: 'include',
      headers,
    })
  }

  function listPlatformProjects() {
    return request<Array<Partial<MessengerPlatformProjectSummary> & { slug: string; title: string }>>('/api/projects')
  }

  function getActionCatalog(slug: string) {
    return request<MessengerPlatformActionCatalog>(
      `/api/projects/${encodeURIComponent(slug)}/communications/action-catalog`,
    )
  }

  function executeProjectAction(slug: string, actionId: ProjectMutationActionId, payload: ProjectActionExecutePayload) {
    return request<PlatformProjectActionMutationResponse>(
      `/api/projects/${encodeURIComponent(slug)}/communications/action-execute`,
      {
        method: 'POST',
        body: { actionId, payload: { ...payload, projectSlug: slug } },
      },
    )
  }

  function getScopeDetail(slug: string, scopeType: MessengerPlatformScopeType, scopeId: string) {
    return request<MessengerPlatformScopeDetailBundle>(
      `/api/projects/${encodeURIComponent(slug)}/coordination/scopes/${encodeURIComponent(scopeType)}/${encodeURIComponent(scopeId)}`,
    )
  }

  function createParticipant(slug: string, payload: { displayName: string; roleKey: string; sourceKind: string }) {
    return request<PlatformGovernanceParticipantResponse>(
      `/api/projects/${encodeURIComponent(slug)}/coordination/participants`,
      { method: 'POST', body: payload },
    )
  }

  function createAssignment(slug: string, payload: {
    participantId: number
    scopeType: MessengerPlatformScopeType
    scopeSource: string
    scopeId: string
    responsibility: string
  }) {
    return request<void>(
      `/api/projects/${encodeURIComponent(slug)}/coordination/assignments`,
      { method: 'POST', body: payload },
    )
  }

  function updateAssignment(slug: string, assignmentId: number, patch: { responsibility?: string }) {
    return request<void>(
      `/api/projects/${encodeURIComponent(slug)}/coordination/assignments/${assignmentId}`,
      { method: 'PATCH', body: patch },
    )
  }

  function deleteAssignment(slug: string, assignmentId: number) {
    return request<void>(
      `/api/projects/${encodeURIComponent(slug)}/coordination/assignments/${assignmentId}`,
      { method: 'DELETE' },
    )
  }

  function updateScopeSettings(
    slug: string,
    scopeType: MessengerPlatformScopeType,
    scopeId: string,
    settings: Record<string, unknown>,
  ) {
    return request<void>(
      `/api/projects/${encodeURIComponent(slug)}/coordination/scopes/${encodeURIComponent(scopeType)}/${encodeURIComponent(scopeId)}/settings`,
      { method: 'PATCH', body: { settings } },
    )
  }

  return {
    listPlatformProjects,
    getActionCatalog,
    executeProjectAction,
    getScopeDetail,
    createParticipant,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    updateScopeSettings,
  }
}
