import type { MessengerProject } from '../../entities/projects/model/useMessengerProjects'

export function useProjectsApi() {
  const auth = useMessengerAuth()

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

  return {
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
  }
}
