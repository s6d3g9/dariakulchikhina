import type {
  MessengerProjectRecord,
  MessengerProjectTemplateRecord,
  MessengerProjectSyncBrief,
  MessengerProjectManagerBrief,
  MessengerProjectSubjectRecord,
  MessengerProjectCabinetLinkRecord,
  MessengerProjectAgreementRecord,
} from '../../features/project-engine/model/useMessengerProjectEngine'

export type BootstrapProjectPayload = {
  templateId: string
  slug?: string
  label?: string
  description?: string
  repositoryId?: string
  rootPath?: string
  defaultBranch?: string
}

export function useProjectEngineApi() {
  const auth = useMessengerAuth()

  function listProjects() {
    return auth.request<{ projects: MessengerProjectRecord[] }>('/project-engine/projects', { method: 'GET' })
  }

  function createProject(payload: Omit<MessengerProjectRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    return auth.request<{ project: MessengerProjectRecord }>('/project-engine/projects', { method: 'POST', body: payload })
  }

  function bootstrapProject(payload: BootstrapProjectPayload) {
    return auth.request<{ project: MessengerProjectRecord }>('/project-engine/projects/bootstrap', { method: 'POST', body: payload })
  }

  function getProject(projectId: string) {
    return auth.request<{ project: MessengerProjectRecord }>(`/project-engine/projects/${projectId}`, { method: 'GET' })
  }

  function updateProject(projectId: string, payload: MessengerProjectRecord) {
    return auth.request<{ project: MessengerProjectRecord }>(`/project-engine/projects/${projectId}`, { method: 'PUT', body: payload })
  }

  function deleteProject(projectId: string) {
    return auth.request<{ ok: true }>(`/project-engine/projects/${projectId}`, { method: 'DELETE' })
  }

  function listTemplates() {
    return auth.request<{ templates: MessengerProjectTemplateRecord[] }>('/project-engine/templates', { method: 'GET' })
  }

  function getSyncBrief(projectId: string) {
    return auth.request<{ brief: MessengerProjectSyncBrief }>(`/project-engine/projects/${projectId}/sync-brief`, { method: 'GET' })
  }

  function getManagerBrief(projectId: string) {
    return auth.request<{ brief: MessengerProjectManagerBrief }>(`/project-engine/projects/${projectId}/manager-brief`, { method: 'GET' })
  }

  function listSubjects(projectId: string) {
    return auth.request<{ subjects: MessengerProjectSubjectRecord[] }>(`/project-engine/projects/${projectId}/subjects`, { method: 'GET' })
  }

  function createSubject(projectId: string, payload: Omit<MessengerProjectSubjectRecord, 'id'> & { id?: string }) {
    return auth.request<{ project: MessengerProjectRecord }>(`/project-engine/projects/${projectId}/subjects`, { method: 'POST', body: payload })
  }

  function updateSubject(projectId: string, subjectId: string, payload: Omit<MessengerProjectSubjectRecord, 'id'>) {
    return auth.request<{ project: MessengerProjectRecord }>(`/project-engine/projects/${projectId}/subjects/${subjectId}`, { method: 'PUT', body: payload })
  }

  function deleteSubject(projectId: string, subjectId: string) {
    return auth.request<{ project: MessengerProjectRecord }>(`/project-engine/projects/${projectId}/subjects/${subjectId}`, { method: 'DELETE' })
  }

  function listAgreements(projectId: string) {
    return auth.request<{ agreements: MessengerProjectAgreementRecord[] }>(`/project-engine/projects/${projectId}/agreements`, { method: 'GET' })
  }

  function createAgreement(projectId: string, payload: Omit<MessengerProjectAgreementRecord, 'id'> & { id?: string }) {
    return auth.request<{ project: MessengerProjectRecord }>(`/project-engine/projects/${projectId}/agreements`, { method: 'POST', body: payload })
  }

  function updateAgreement(projectId: string, agreementId: string, payload: Omit<MessengerProjectAgreementRecord, 'id'>) {
    return auth.request<{ project: MessengerProjectRecord }>(`/project-engine/projects/${projectId}/agreements/${agreementId}`, { method: 'PUT', body: payload })
  }

  function deleteAgreement(projectId: string, agreementId: string) {
    return auth.request<{ project: MessengerProjectRecord }>(`/project-engine/projects/${projectId}/agreements/${agreementId}`, { method: 'DELETE' })
  }

  function listCabinetLinks(projectId: string) {
    return auth.request<{ cabinetLinks: MessengerProjectCabinetLinkRecord[] }>(`/project-engine/projects/${projectId}/cabinet-links`, { method: 'GET' })
  }

  function createCabinetLink(projectId: string, payload: Omit<MessengerProjectCabinetLinkRecord, 'id'> & { id?: string }) {
    return auth.request<{ project: MessengerProjectRecord }>(`/project-engine/projects/${projectId}/cabinet-links`, { method: 'POST', body: payload })
  }

  function updateCabinetLink(projectId: string, linkId: string, payload: Omit<MessengerProjectCabinetLinkRecord, 'id'>) {
    return auth.request<{ project: MessengerProjectRecord }>(`/project-engine/projects/${projectId}/cabinet-links/${linkId}`, { method: 'PUT', body: payload })
  }

  function deleteCabinetLink(projectId: string, linkId: string) {
    return auth.request<{ project: MessengerProjectRecord }>(`/project-engine/projects/${projectId}/cabinet-links/${linkId}`, { method: 'DELETE' })
  }

  return {
    listProjects,
    createProject,
    bootstrapProject,
    getProject,
    updateProject,
    deleteProject,
    listTemplates,
    getSyncBrief,
    getManagerBrief,
    listSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    listAgreements,
    createAgreement,
    updateAgreement,
    deleteAgreement,
    listCabinetLinks,
    createCabinetLink,
    updateCabinetLink,
    deleteCabinetLink,
  }
}
