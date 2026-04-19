export type MessengerProjectTargetKind = 'platform' | 'messenger' | 'external'
export type MessengerProjectContextKind = 'cabinet' | 'module' | 'page' | 'feature' | 'api' | 'shared'
export type MessengerProjectRole = 'admin' | 'client' | 'manager' | 'designer' | 'contractor' | 'shared' | 'external'
export type MessengerProjectCapability = 'frontend' | 'backend' | 'logic' | 'styles' | 'data' | 'qa' | 'docs' | 'integration'
export type MessengerProjectCoverageStatus = 'planned' | 'in-progress' | 'review' | 'blocked' | 'done'
export type MessengerProjectAgentRole = 'lead' | 'support' | 'review' | 'observer'
export type MessengerProjectSubjectKind = 'client' | 'manager' | 'designer' | 'contractor' | 'admin' | 'vendor' | 'partner' | 'external'
export type MessengerProjectSubjectStatus = 'active' | 'review' | 'blocked' | 'done'
export type MessengerProjectCabinetLinkKind = 'mirrors' | 'depends-on' | 'handoff' | 'approval' | 'shared-data'
export type MessengerProjectAgreementType = 'scope' | 'delivery' | 'approval' | 'payment' | 'change-request' | 'support'
export type MessengerProjectAgreementStatus = 'draft' | 'active' | 'review' | 'blocked' | 'closed'

export interface MessengerProjectCapabilityRecord {
  capability: MessengerProjectCapability
  status: MessengerProjectCoverageStatus
  notes: string
}

export interface MessengerProjectSyncContractRecord {
  frontendPaths: string[]
  backendPaths: string[]
  sharedPaths: string[]
  styleRefs: string[]
  logicRefs: string[]
  docsPaths: string[]
}

export interface MessengerProjectContextRecord {
  id: string
  kind: MessengerProjectContextKind
  label: string
  ownerRole: MessengerProjectRole
  status: MessengerProjectCoverageStatus
  route: string
  summary: string
  tags: string[]
  capabilities: MessengerProjectCapabilityRecord[]
  syncContract: MessengerProjectSyncContractRecord
  assignedAgentIds: string[]
}

export interface MessengerProjectAgentBindingRecord {
  id: string
  agentId: string
  contextId: string
  role: MessengerProjectAgentRole
  responsibilities: MessengerProjectCapability[]
  notes: string
  active: boolean
}

export interface MessengerProjectSubjectRecord {
  id: string
  label: string
  kind: MessengerProjectSubjectKind
  status: MessengerProjectSubjectStatus
  contextIds: string[]
  managerAgentIds: string[]
  tags: string[]
  notes: string
}

export interface MessengerProjectCabinetLinkRecord {
  id: string
  sourceContextId: string
  targetContextId: string
  kind: MessengerProjectCabinetLinkKind
  status: MessengerProjectCoverageStatus
  sharedCapabilities: MessengerProjectCapability[]
  agreementIds: string[]
  notes: string
}

export interface MessengerProjectAgreementRecord {
  id: string
  label: string
  type: MessengerProjectAgreementType
  status: MessengerProjectAgreementStatus
  subjectIds: string[]
  contextIds: string[]
  managerAgentIds: string[]
  summary: string
  terms: string[]
  dueAt: string
}

export interface MessengerProjectRecord {
  id: string
  slug: string
  label: string
  description: string
  targetKind: MessengerProjectTargetKind
  repositoryId: string
  rootPath: string
  defaultBranch: string
  contexts: MessengerProjectContextRecord[]
  agentBindings: MessengerProjectAgentBindingRecord[]
  subjects: MessengerProjectSubjectRecord[]
  cabinetLinks: MessengerProjectCabinetLinkRecord[]
  agreements: MessengerProjectAgreementRecord[]
  createdAt: string
  updatedAt: string
}

export interface MessengerProjectCoverageOverview {
  capability: MessengerProjectCapability
  counts: Record<MessengerProjectCoverageStatus, number>
  total: number
}

export interface MessengerProjectSyncBrief {
  project: MessengerProjectRecord
  coverage: MessengerProjectCoverageOverview[]
  contexts: Array<MessengerProjectContextRecord & {
    bindings: MessengerProjectAgentBindingRecord[]
    recommendedAgentIds: string[]
    missingCapabilities: MessengerProjectCapability[]
  }>
  agents: Array<{
    agentId: string
    displayName: string
    contextIds: string[]
    roleSet: MessengerProjectAgentRole[]
    responsibilities: MessengerProjectCapability[]
    repositoryAligned: boolean
    knowledgeSourceCount: number
    workspacePath: string
  }>
  gaps: Array<{
    type: 'agent-missing' | 'coverage-missing' | 'repository-mismatch'
    contextId?: string
    agentId?: string
    message: string
  }>
}

export interface MessengerProjectManagerBrief {
  project: MessengerProjectRecord
  subjects: Array<MessengerProjectSubjectRecord & {
    managerAgents: string[]
    contextLabels: string[]
  }>
  agreements: Array<MessengerProjectAgreementRecord & {
    managerAgents: string[]
    subjectLabels: string[]
    contextLabels: string[]
  }>
  cabinetLinks: Array<MessengerProjectCabinetLinkRecord & {
    sourceLabel: string
    targetLabel: string
    agreementLabels: string[]
  }>
  managerAgents: Array<{
    agentId: string
    displayName: string
    subjectIds: string[]
    agreementIds: string[]
    contextIds: string[]
  }>
  gaps: Array<{
    type: 'subject-manager-missing' | 'agreement-manager-missing' | 'cabinet-link-unbound' | 'agreement-subject-missing'
    subjectId?: string
    agreementId?: string
    cabinetLinkId?: string
    message: string
  }>
}

export interface MessengerProjectTemplateRecord {
  id: string
  label: string
  description: string
  targetKind: MessengerProjectTargetKind
  project: Pick<MessengerProjectRecord, 'slug' | 'label' | 'description' | 'targetKind' | 'repositoryId' | 'rootPath' | 'defaultBranch' | 'contexts' | 'agentBindings' | 'subjects' | 'cabinetLinks' | 'agreements'>
}

export function useMessengerProjectEngine() {
  const api = useProjectEngineApi()
  const projects = useState<MessengerProjectRecord[]>('messenger-project-engine-projects', () => [])
  const templates = useState<MessengerProjectTemplateRecord[]>('messenger-project-engine-templates', () => [])
  const activeProjectId = useState<string>('messenger-project-engine-active-project-id', () => '')
  const syncBrief = useState<MessengerProjectSyncBrief | null>('messenger-project-engine-sync-brief', () => null)
  const managerBrief = useState<MessengerProjectManagerBrief | null>('messenger-project-engine-manager-brief', () => null)
  const pending = useState<boolean>('messenger-project-engine-pending', () => false)
  const mutating = useState<boolean>('messenger-project-engine-mutating', () => false)
  const briefsPending = useState<boolean>('messenger-project-engine-briefs-pending', () => false)

  const activeProject = computed(() => projects.value.find(project => project.id === activeProjectId.value || project.slug === activeProjectId.value) ?? null)

  function syncProjectRecord(nextProject: MessengerProjectRecord) {
    const currentIndex = projects.value.findIndex(project => project.id === nextProject.id)
    if (currentIndex === -1) {
      projects.value = [...projects.value, nextProject]
      return
    }

    projects.value = projects.value.map(project => project.id === nextProject.id ? nextProject : project)
  }

  async function refresh() {
    pending.value = true

    try {
      const [projectsResponse, templatesResponse] = await Promise.all([
        api.listProjects(),
        api.listTemplates(),
      ])

      projects.value = projectsResponse.projects
      templates.value = templatesResponse.templates

      if (!activeProjectId.value && projects.value.length) {
        activeProjectId.value = projects.value[0]?.id || ''
      }

      if (activeProjectId.value && !projects.value.some(project => project.id === activeProjectId.value || project.slug === activeProjectId.value)) {
        activeProjectId.value = projects.value[0]?.id || ''
      }
    } finally {
      pending.value = false
    }
  }

  async function loadBriefs(projectId = activeProjectId.value) {
    if (!projectId) {
      syncBrief.value = null
      managerBrief.value = null
      return
    }

    briefsPending.value = true

    try {
      const [syncResponse, managerResponse] = await Promise.all([
        api.getSyncBrief(projectId),
        api.getManagerBrief(projectId),
      ])

      syncBrief.value = syncResponse.brief
      managerBrief.value = managerResponse.brief
    } finally {
      briefsPending.value = false
    }
  }

  async function bootstrapProject(payload: {
    templateId: string
    slug?: string
    label?: string
    description?: string
    repositoryId?: string
    rootPath?: string
    defaultBranch?: string
  }) {
    mutating.value = true

    try {
      const response = await api.bootstrapProject(payload)

      const nextProject = response.project
      syncProjectRecord(nextProject)
      activeProjectId.value = nextProject.id
      await loadBriefs(nextProject.id)
      return nextProject
    } finally {
      mutating.value = false
    }
  }

  async function updateProject(projectId: string, payload: MessengerProjectRecord) {
    mutating.value = true
    try {
      const response = await api.updateProject(projectId, payload)
      syncProjectRecord(response.project)
      activeProjectId.value = response.project.id
      await loadBriefs(response.project.id)
      return response.project
    } finally {
      mutating.value = false
    }
  }

  async function deleteProject(projectId: string) {
    mutating.value = true
    try {
      await api.deleteProject(projectId)
      projects.value = projects.value.filter(project => project.id !== projectId && project.slug !== projectId)
      if (activeProjectId.value === projectId || !projects.value.some(project => project.id === activeProjectId.value || project.slug === activeProjectId.value)) {
        activeProjectId.value = projects.value[0]?.id || ''
      }

      if (activeProjectId.value) {
        await loadBriefs(activeProjectId.value)
      } else {
        syncBrief.value = null
        managerBrief.value = null
      }
    } finally {
      mutating.value = false
    }
  }

  async function createSubject(projectId: string, payload: Omit<MessengerProjectSubjectRecord, 'id'> & { id?: string }) {
    mutating.value = true
    try {
      const response = await api.createSubject(projectId, payload)
      syncProjectRecord(response.project)
      await loadBriefs(projectId)
      return response.project
    } finally {
      mutating.value = false
    }
  }

  async function updateSubject(projectId: string, subjectId: string, payload: Omit<MessengerProjectSubjectRecord, 'id'>) {
    mutating.value = true
    try {
      const response = await api.updateSubject(projectId, subjectId, payload)
      syncProjectRecord(response.project)
      await loadBriefs(projectId)
      return response.project
    } finally {
      mutating.value = false
    }
  }

  async function deleteSubject(projectId: string, subjectId: string) {
    mutating.value = true
    try {
      const response = await api.deleteSubject(projectId, subjectId)
      syncProjectRecord(response.project)
      await loadBriefs(projectId)
      return response.project
    } finally {
      mutating.value = false
    }
  }

  async function createAgreement(projectId: string, payload: Omit<MessengerProjectAgreementRecord, 'id'> & { id?: string }) {
    mutating.value = true
    try {
      const response = await api.createAgreement(projectId, payload)
      syncProjectRecord(response.project)
      await loadBriefs(projectId)
      return response.project
    } finally {
      mutating.value = false
    }
  }

  async function updateAgreement(projectId: string, agreementId: string, payload: Omit<MessengerProjectAgreementRecord, 'id'>) {
    mutating.value = true
    try {
      const response = await api.updateAgreement(projectId, agreementId, payload)
      syncProjectRecord(response.project)
      await loadBriefs(projectId)
      return response.project
    } finally {
      mutating.value = false
    }
  }

  async function deleteAgreement(projectId: string, agreementId: string) {
    mutating.value = true
    try {
      const response = await api.deleteAgreement(projectId, agreementId)
      syncProjectRecord(response.project)
      await loadBriefs(projectId)
      return response.project
    } finally {
      mutating.value = false
    }
  }

  async function createCabinetLink(projectId: string, payload: Omit<MessengerProjectCabinetLinkRecord, 'id'> & { id?: string }) {
    mutating.value = true
    try {
      const response = await api.createCabinetLink(projectId, payload)
      syncProjectRecord(response.project)
      await loadBriefs(projectId)
      return response.project
    } finally {
      mutating.value = false
    }
  }

  async function updateCabinetLink(projectId: string, linkId: string, payload: Omit<MessengerProjectCabinetLinkRecord, 'id'>) {
    mutating.value = true
    try {
      const response = await api.updateCabinetLink(projectId, linkId, payload)
      syncProjectRecord(response.project)
      await loadBriefs(projectId)
      return response.project
    } finally {
      mutating.value = false
    }
  }

  async function deleteCabinetLink(projectId: string, linkId: string) {
    mutating.value = true
    try {
      const response = await api.deleteCabinetLink(projectId, linkId)
      syncProjectRecord(response.project)
      await loadBriefs(projectId)
      return response.project
    } finally {
      mutating.value = false
    }
  }

  return {
    projects,
    templates,
    activeProjectId,
    activeProject,
    syncBrief,
    managerBrief,
    pending,
    mutating,
    briefsPending,
    refresh,
    loadBriefs,
    bootstrapProject,
    updateProject,
    deleteProject,
    createSubject,
    updateSubject,
    deleteSubject,
    createAgreement,
    updateAgreement,
    deleteAgreement,
    createCabinetLink,
    updateCabinetLink,
    deleteCabinetLink,
  }
}