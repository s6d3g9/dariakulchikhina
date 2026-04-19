/**
 * useMessengerProjectActions — модуль бизнес-логики проектных действий в мессенджере.
 *
 * Определяет роль собеседника, предоставляет доступные действия по категориям,
 * выполняет actions через relay-API мессенджера → основную платформу.
 */

import { normalizeMessengerProjectRoot } from '../../../utils/messenger-project-root'
import type { MessengerProjectRecord } from './useMessengerProjectEngine'
import { usePlatformProjectActionsApi } from '../../../core/api/platform-project-actions'

export type ProjectActionRole = 'designer' | 'client' | 'contractor' | 'general'

export type ProjectActionCategory = 'tasks' | 'stages' | 'documents' | 'finance' | 'communication'

export type ProjectActionId =
  // Designer / Admin
  | 'assign_task'
  | 'accept_stage'
  | 'request_report'
  | 'send_corrections'
  | 'change_phase'
  | 'create_invoice'
  // Client
  | 'approve_selection'
  | 'request_variants'
  | 'order_extra_service'
  | 'approve_act'
  | 'ask_designer'
  // Contractor
  | 'report_completion'
  | 'upload_photo_report'
  | 'request_clarification'
  | 'update_work_status'
  // General
  | 'share_file'
  | 'create_task'
  | 'request_response'

export interface ProjectActionDefinition {
  id: ProjectActionId
  label: string
  icon: string
  category: ProjectActionCategory
  description: string
  requiresInput?: 'text' | 'file' | 'select'
  confirmRequired?: boolean
}

export type ProjectActionResult = {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

export interface ProjectActionExecutePayload {
  text?: string
  note?: string
  projectSlug?: string
  projectTitle?: string
  taskMode?: 'existing' | 'new'
  taskId?: string
  taskTitle?: string
  taskStatus?: string
  taskStatusLabel?: string
  phaseKey?: string
  phaseTitle?: string
  sprintId?: string
  sprintName?: string
  subjectId?: string
  subjectLabel?: string
  objectId?: string
  objectLabel?: string
  rangeStart?: string
  rangeEnd?: string
  documentId?: string
  documentTitle?: string
  serviceId?: string
  serviceTitle?: string
  useFilePicker?: boolean
}

export interface MessengerPlatformProjectSummary {
  slug: string
  title: string
  status: string
  projectType: string
  activePhaseTitle: string
  activeSprintName: string
  taskTotal: number
}

export interface MessengerPlatformCoordinationRecommendation {
  id: string
  title: string
  reason: string
  channelLabel: string
  suggestedMessage: string
}

export interface MessengerPlatformPhaseOption {
  id: string
  phaseKey: string
  title: string
  status: string
  percent: number
  startDate: string
  endDate: string
  secondary: string
}

export interface MessengerPlatformSprintOption {
  id: string
  name: string
  linkedPhaseKey: string
  linkedPhaseTitle: string
  status: string
  startDate: string
  endDate: string
  goal: string
  taskCount: number
  secondary: string
}

export interface MessengerPlatformTaskOption {
  id: string
  source: 'work-status' | 'hybrid'
  sourceLabel: string
  title: string
  status: string
  assignee: string
  phaseKey: string
  phaseTitle: string
  sprintId: string
  sprintName: string
  rangeStart: string
  rangeEnd: string
  notes: string
  workType?: string
  secondary: string
}

export interface MessengerPlatformSubjectOption {
  id: string
  kind: 'client' | 'contractor' | 'designer' | 'seller' | 'manager' | 'custom'
  label: string
  secondary: string
}

export type MessengerPlatformScopeType = 'project' | 'phase' | 'sprint' | 'task' | 'document' | 'service'

export interface MessengerPlatformScopeDetailItem {
  key: string
  label: string
  value: string
}

export interface MessengerPlatformScopeParticipant {
  assignmentId: string
  participantId: string
  displayName: string
  roleKey: string
  roleLabel: string
  responsibility: string
  responsibilityLabel: string
  origin: 'direct' | 'project' | 'derived'
  activeTaskCount: number
  secondary: string
}

export interface MessengerPlatformScopeLink {
  scopeType: MessengerPlatformScopeType
  scopeSource: string
  scopeId: string
  title: string
  status?: string
  statusLabel?: string
}

export interface MessengerPlatformScopeTaskSummary {
  id: string
  title: string
  status: string
  statusLabel: string
  assigneeLabels: string[]
  secondary: string
}

export interface MessengerPlatformScopeRuleSummary {
  id: string
  title: string
  channel: string
  trigger: string
  audience: string
}

export interface MessengerPlatformScopeDetailBundle {
  revision: string
  scope: {
    scopeType: MessengerPlatformScopeType
    scopeSource: string
    scopeId: string
    title: string
    subtitle: string
    status: string
    statusLabel: string
  }
  core: Record<string, unknown>
  settings: Record<string, unknown>
  settingItems: MessengerPlatformScopeDetailItem[]
  participants: MessengerPlatformScopeParticipant[]
  subjectItems: MessengerPlatformScopeDetailItem[]
  objectItems: MessengerPlatformScopeDetailItem[]
  actionItems: MessengerPlatformScopeDetailItem[]
  ruleItems: MessengerPlatformScopeRuleSummary[]
  linkedScopes: MessengerPlatformScopeLink[]
  tasks: MessengerPlatformScopeTaskSummary[]
}

export interface MessengerPlatformObjectOption {
  id: string
  kind: 'phase' | 'sprint' | 'task' | 'document' | 'service'
  label: string
  secondary: string
}

export interface MessengerPlatformDocumentOption {
  id: string
  kind: 'document'
  scope: 'project' | 'library'
  title: string
  category: string
  url: string
  filename: string
  templateKey: string
  secondary: string
}

export interface MessengerPlatformExtraServiceOption {
  id: string
  title: string
  status: string
  requestedBy: string
  totalPrice: number
  description: string
}

export interface MessengerPlatformActionCatalog {
  project: {
    slug: string
    title: string
    status: string
    projectType: string
    revision: string
    pages: string[]
    activePhaseKey: string
    activePhaseTitle: string
    activeSprintId: string
    activeSprintName: string
    taskTotal: number
    documentCount: number
    subjectCount: number
  }
  coordination: {
    recommendations: MessengerPlatformCoordinationRecommendation[]
  }
  phases: MessengerPlatformPhaseOption[]
  sprints: MessengerPlatformSprintOption[]
  tasks: MessengerPlatformTaskOption[]
  subjects: MessengerPlatformSubjectOption[]
  objects: MessengerPlatformObjectOption[]
  documents: MessengerPlatformDocumentOption[]
  extraServices: MessengerPlatformExtraServiceOption[]
}

interface GovernanceScopeParticipantDraft {
  displayName: string
  roleKey: string
  responsibility: string
}

type ProjectMutationActionId = Extract<
  ProjectActionId,
  'assign_task' | 'accept_stage' | 'change_phase' | 'create_invoice' | 'create_task' | 'order_extra_service' | 'update_work_status'
>

const PROJECT_MUTATION_ACTIONS = new Set<ProjectMutationActionId>([
  'assign_task',
  'accept_stage',
  'change_phase',
  'create_invoice',
  'create_task',
  'order_extra_service',
  'update_work_status',
])

function extractPlatformErrorMeta(error: unknown) {
  if (!error || typeof error !== 'object') {
    return { statusCode: 0, statusMessage: '' }
  }

  const record = error as {
    statusCode?: number
    status?: number
    statusMessage?: string
    message?: string
    data?: { statusMessage?: string; message?: string }
  }

  return {
    statusCode: Number(record.statusCode || record.status || 0),
    statusMessage: String(
      record.data?.statusMessage
      || record.statusMessage
      || record.data?.message
      || record.message
      || ''
    ).trim(),
  }
}

function isProjectMutationAction(actionId: ProjectActionId): actionId is ProjectMutationActionId {
  return PROJECT_MUTATION_ACTIONS.has(actionId as ProjectMutationActionId)
}

function normalizePlatformApiError(error: unknown, fallback: string) {
  const { statusCode, statusMessage } = extractPlatformErrorMeta(error)

  if (statusCode === 401) {
    return 'Нужна активная сессия платформы на основном домене.'
  }

  if (statusCode === 403 && /csrf/i.test(statusMessage)) {
    return 'Сессия платформы устарела. Обновите вкладку основного домена и повторите действие.'
  }

  if (statusCode === 403 && !statusMessage) {
    return 'Нужна активная сессия платформы на основном домене.'
  }

  if (statusMessage && !/^\[?fetch/i.test(statusMessage)) {
    return statusMessage
  }

  if (String(error).includes('Failed to fetch')) {
    return 'Не удалось подключиться к основной платформе. Проверьте messengerProjectRoot и CORS.'
  }

  return fallback
}

function isPlatformSessionAccessError(error: unknown) {
  const { statusCode, statusMessage } = extractPlatformErrorMeta(error)

  if (statusCode === 401) {
    return true
  }

  return statusCode === 403 && (!statusMessage || /csrf/i.test(statusMessage))
}

function appendStructuredLine(lines: string[], label: string, value?: string) {
  const normalized = value?.trim()
  if (!normalized) {
    return
  }

  lines.push(`${label}: ${normalized}`)
}

const DESIGNER_ACTIONS: ProjectActionDefinition[] = [
  {
    id: 'assign_task',
    label: 'Назначить задачу',
    icon: 'mdi-clipboard-plus-outline',
    category: 'tasks',
    description: 'Создать рабочую задачу для подрядчика',
    requiresInput: 'text',
  },
  {
    id: 'accept_stage',
    label: 'Принять этап',
    icon: 'mdi-check-decagram-outline',
    category: 'stages',
    description: 'Закрыть текущий этап работ',
    confirmRequired: true,
  },
  {
    id: 'request_report',
    label: 'Запросить отчёт',
    icon: 'mdi-file-chart-outline',
    category: 'communication',
    description: 'Отправить запрос на фотоотчёт или акт',
  },
  {
    id: 'send_corrections',
    label: 'Отправить правки',
    icon: 'mdi-pencil-ruler',
    category: 'tasks',
    description: 'Приложить документ с правками',
    requiresInput: 'file',
  },
  {
    id: 'change_phase',
    label: 'Сменить фазу',
    icon: 'mdi-arrow-right-bold-circle-outline',
    category: 'stages',
    description: 'Перевести проект на следующую фазу',
    requiresInput: 'select',
    confirmRequired: true,
  },
  {
    id: 'create_invoice',
    label: 'Выставить счёт',
    icon: 'mdi-receipt-text-outline',
    category: 'finance',
    description: 'Сформировать счёт для клиента',
    requiresInput: 'text',
  },
]

const CLIENT_ACTIONS: ProjectActionDefinition[] = [
  {
    id: 'approve_selection',
    label: 'Согласовать выбор',
    icon: 'mdi-thumb-up-outline',
    category: 'stages',
    description: 'Подтвердить выбор материалов или решений',
    confirmRequired: true,
  },
  {
    id: 'request_variants',
    label: 'Запросить варианты',
    icon: 'mdi-palette-swatch-variant',
    category: 'communication',
    description: 'Попросить дизайнера показать альтернативы',
  },
  {
    id: 'order_extra_service',
    label: 'Заказать доп. услугу',
    icon: 'mdi-cart-plus',
    category: 'finance',
    description: 'Запросить дополнительную услугу',
    requiresInput: 'text',
  },
  {
    id: 'approve_act',
    label: 'Одобрить акт',
    icon: 'mdi-file-sign',
    category: 'documents',
    description: 'Подписать акт приёмки работ',
    confirmRequired: true,
  },
  {
    id: 'ask_designer',
    label: 'Вопрос дизайнеру',
    icon: 'mdi-chat-question-outline',
    category: 'communication',
    description: 'Задать вопрос по проекту',
    requiresInput: 'text',
  },
]

const CONTRACTOR_ACTIONS: ProjectActionDefinition[] = [
  {
    id: 'report_completion',
    label: 'Завершение этапа',
    icon: 'mdi-flag-checkered',
    category: 'stages',
    description: 'Отчитаться о завершении текущего этапа',
    confirmRequired: true,
  },
  {
    id: 'upload_photo_report',
    label: 'Фотоотчёт',
    icon: 'mdi-camera-burst',
    category: 'documents',
    description: 'Загрузить фотографии выполненных работ',
    requiresInput: 'file',
  },
  {
    id: 'request_clarification',
    label: 'Уточнить задачу',
    icon: 'mdi-help-circle-outline',
    category: 'communication',
    description: 'Запросить разъяснение по чертежам или ТЗ',
    requiresInput: 'text',
  },
  {
    id: 'update_work_status',
    label: 'Обновить статус',
    icon: 'mdi-progress-wrench',
    category: 'tasks',
    description: 'Изменить статус текущей работы',
    requiresInput: 'select',
  },
]

const GENERAL_ACTIONS: ProjectActionDefinition[] = [
  {
    id: 'share_file',
    label: 'Поделиться файлом',
    icon: 'mdi-paperclip',
    category: 'documents',
    description: 'Прикрепить и отправить файл',
    requiresInput: 'file',
  },
  {
    id: 'create_task',
    label: 'Создать задачу',
    icon: 'mdi-clipboard-list-outline',
    category: 'tasks',
    description: 'Создать новую задачу в проекте',
    requiresInput: 'text',
  },
  {
    id: 'request_response',
    label: 'Запросить ответ',
    icon: 'mdi-comment-question-outline',
    category: 'communication',
    description: 'Отправить запрос на обратную связь',
  },
]

const CATEGORY_META: Record<ProjectActionCategory, { label: string; icon: string; order: number }> = {
  tasks:         { label: 'Задачи',    icon: 'mdi-clipboard-list-outline', order: 0 },
  stages:        { label: 'Этапы',     icon: 'mdi-flag-outline',           order: 1 },
  documents:     { label: 'Документы', icon: 'mdi-file-document-outline',  order: 2 },
  finance:       { label: 'Финансы',   icon: 'mdi-currency-rub',           order: 3 },
  communication: { label: 'Связь',     icon: 'mdi-message-text-outline',   order: 4 },
}

function inferRoleFromLogin(login: string): ProjectActionRole {
  const l = login.toLowerCase()
  if (l.includes('contractor') || l.includes('builder') || l.includes('podryadchik') || l.includes('master')) return 'contractor'
  if (l.includes('admin') || l.includes('designer') || l.includes('manager')) return 'designer'
  if (l.includes('client') || l.includes('owner') || l.includes('customer') || l.includes('ivanov') || l.includes('zakazchik')) return 'client'
  return 'general'
}

function getActionsForRole(role: ProjectActionRole): ProjectActionDefinition[] {
  switch (role) {
    case 'designer': return DESIGNER_ACTIONS
    case 'client': return CLIENT_ACTIONS
    case 'contractor': return CONTRACTOR_ACTIONS
    default: return GENERAL_ACTIONS
  }
}

export interface ProjectActionCategoryGroup {
  category: ProjectActionCategory
  label: string
  icon: string
  actions: ProjectActionDefinition[]
}

export function useMessengerProjectActions() {
  const runtimeConfig = useRuntimeConfig()
  const projectEngine = useMessengerProjectEngine()
  const panelOpen = useState<boolean>('messenger-project-actions-panel', () => false)
  const pendingAction = useState<ProjectActionId | null>('messenger-project-actions-pending', () => null)
  const lastResult = useState<ProjectActionResult | null>('messenger-project-actions-last-result', () => null)
  const selectedActionId = useState<ProjectActionId | null>('messenger-project-actions-selected-action', () => null)

  const currentPeerLogin = useState<string>('messenger-project-actions-peer-login', () => '')
  const platformProjects = useState<MessengerPlatformProjectSummary[]>('messenger-project-actions-platform-projects', () => [])
  const platformProjectsPending = useState<boolean>('messenger-project-actions-platform-projects-pending', () => false)
  const platformProjectsError = useState<string>('messenger-project-actions-platform-projects-error', () => '')
  const platformProjectsRequirePlatformSession = useState<boolean>('messenger-project-actions-projects-require-platform-session', () => false)
  const selectedProjectSlug = useState<string>('messenger-project-actions-selected-project-slug', () => '')
  const platformCatalog = useState<MessengerPlatformActionCatalog | null>('messenger-project-actions-platform-catalog', () => null)
  const platformCatalogPending = useState<boolean>('messenger-project-actions-platform-catalog-pending', () => false)
  const platformCatalogError = useState<string>('messenger-project-actions-platform-catalog-error', () => '')
  const loadedCatalogProjectSlug = useState<string>('messenger-project-actions-loaded-catalog-slug', () => '')
  const pendingCatalogProjectSlug = useState<string>('messenger-project-actions-pending-catalog-slug', () => '')
  const platformCatalogRequestId = useState<number>('messenger-project-actions-platform-catalog-request-id', () => 0)
  const selectedScopeType = useState<MessengerPlatformScopeType | ''>('messenger-project-actions-selected-scope-type', () => '')
  const selectedScopeId = useState<string>('messenger-project-actions-selected-scope-id', () => '')
  const platformScopeDetail = useState<MessengerPlatformScopeDetailBundle | null>('messenger-project-actions-platform-scope-detail', () => null)
  const platformScopeDetailPending = useState<boolean>('messenger-project-actions-platform-scope-detail-pending', () => false)
  const platformScopeDetailError = useState<string>('messenger-project-actions-platform-scope-detail-error', () => '')
  const platformScopeDetailRequestId = useState<number>('messenger-project-actions-platform-scope-detail-request-id', () => 0)
  const governanceMutationPending = useState<boolean>('messenger-project-actions-governance-pending', () => false)
  const governanceMutationError = useState<string>('messenger-project-actions-governance-error', () => '')
  const governanceMutationNotice = useState<string>('messenger-project-actions-governance-notice', () => '')

  const peerRole = computed<ProjectActionRole>(() => {
    if (!currentPeerLogin.value) return 'general'
    return inferRoleFromLogin(currentPeerLogin.value)
  })

  const actions = computed<ProjectActionDefinition[]>(() => getActionsForRole(peerRole.value))

  const groupedActions = computed<ProjectActionCategoryGroup[]>(() => {
    const groups = new Map<ProjectActionCategory, ProjectActionDefinition[]>()

    for (const action of actions.value) {
      const existing = groups.get(action.category) || []
      existing.push(action)
      groups.set(action.category, existing)
    }

    return Array.from(groups.entries())
      .map(([category, categoryActions]) => ({
        category,
        label: CATEGORY_META[category].label,
        icon: CATEGORY_META[category].icon,
        actions: categoryActions,
      }))
      .sort((a, b) => CATEGORY_META[a.category].order - CATEGORY_META[b.category].order)
  })

  const selectedProject = computed(() => {
    const fromList = platformProjects.value.find(project => project.slug === selectedProjectSlug.value)
    if (fromList) {
      return fromList
    }

    if (platformCatalog.value?.project.slug === selectedProjectSlug.value) {
      return {
        slug: platformCatalog.value.project.slug,
        title: platformCatalog.value.project.title,
        status: platformCatalog.value.project.status,
        projectType: platformCatalog.value.project.projectType,
        activePhaseTitle: platformCatalog.value.project.activePhaseTitle,
        activeSprintName: platformCatalog.value.project.activeSprintName,
        taskTotal: platformCatalog.value.project.taskTotal,
      }
    }

    return null
  })

  const projectRoot = computed(() => normalizeMessengerProjectRoot(runtimeConfig.public.messengerProjectRoot || ''))
  const platformApi = usePlatformProjectActionsApi(projectRoot)

  function mapMessengerProjectToPlatformSummary(project: MessengerProjectRecord): MessengerPlatformProjectSummary {
    return {
      slug: project.slug,
      title: project.label,
      status: project.targetKind === 'platform' ? 'platform' : 'messenger',
      projectType: project.targetKind,
      activePhaseTitle: '',
      activeSprintName: '',
      taskTotal: project.contexts.length,
    }
  }

  function pickDefaultProjectSlug(projects: MessengerPlatformProjectSummary[]) {
    if (!projects.length) {
      return ''
    }

    const engineSlug = projectEngine.activeProject.value?.slug?.trim() || ''
    if (engineSlug && projects.some(project => project.slug === engineSlug)) {
      return engineSlug
    }

    if (projects.length === 1) {
      return projects[0]?.slug || ''
    }

    return ''
  }

  function reconcileSelectedProject(projects: MessengerPlatformProjectSummary[]) {
    if (!selectedProjectSlug.value) {
      const fallbackSlug = pickDefaultProjectSlug(projects)
      if (fallbackSlug) {
        setSelectedProjectSlug(fallbackSlug)
      }
      return
    }

    if (!projects.some(project => project.slug === selectedProjectSlug.value) && projects.length) {
      setSelectedProjectSlug(projects[0]?.slug || '')
    }
  }

  async function loadMessengerProjectFallback(force = false) {
    if (!force && projectEngine.projects.value.length) {
      return projectEngine.projects.value.map(mapMessengerProjectToPlatformSummary)
    }

    try {
      await projectEngine.refresh()
    } catch {
      // Fallback is best-effort and should never block the platform-backed flow.
    }

    return projectEngine.projects.value.map(mapMessengerProjectToPlatformSummary)
  }

  function mergeProjectSources(
    platformList: MessengerPlatformProjectSummary[],
    fallbackList: MessengerPlatformProjectSummary[],
  ) {
    const merged = new Map<string, MessengerPlatformProjectSummary>()

    for (const project of fallbackList) {
      merged.set(project.slug, project)
    }

    for (const project of platformList) {
      const fallback = merged.get(project.slug)
      merged.set(project.slug, {
        ...fallback,
        ...project,
      })
    }

    return Array.from(merged.values())
  }

  async function fetchPlatformProjects(force = false) {
    if (platformProjectsPending.value || (!force && platformProjects.value.length)) {
      return
    }

    platformProjectsPending.value = true
    platformProjectsError.value = ''

    const fallbackProjects = await loadMessengerProjectFallback(force)

    try {
      const response = await platformApi.listPlatformProjects()
      const platformProjectSummaries = response.map((project) => ({
        slug: project.slug,
        title: project.title,
        status: project.status || '',
        projectType: project.projectType || '',
        activePhaseTitle: project.activePhaseTitle || '',
        activeSprintName: project.activeSprintName || '',
        taskTotal: Number(project.taskTotal || 0),
      }))
      platformProjects.value = mergeProjectSources(platformProjectSummaries, fallbackProjects)
      platformProjectsRequirePlatformSession.value = false

      reconcileSelectedProject(platformProjects.value)
    } catch (error) {
      if (isPlatformSessionAccessError(error) && fallbackProjects.length) {
        platformProjects.value = fallbackProjects
        platformProjectsRequirePlatformSession.value = true
        clearPlatformCatalogState()
        clearPlatformScopeDetailState()
        cancelPlatformCatalogRequest()
        reconcileSelectedProject(platformProjects.value)
      } else {
        platformProjectsError.value = normalizePlatformApiError(error, 'Не удалось загрузить список проектов платформы.')
      }
    } finally {
      platformProjectsPending.value = false
    }
  }

  function clearPlatformCatalogState() {
    platformCatalog.value = null
    loadedCatalogProjectSlug.value = ''
    platformCatalogError.value = ''
  }

  function clearPlatformScopeDetailState(clearSelection = true) {
    platformScopeDetail.value = null
    platformScopeDetailPending.value = false
    platformScopeDetailError.value = ''
    governanceMutationError.value = ''
    governanceMutationNotice.value = ''

    if (clearSelection) {
      selectedScopeType.value = ''
      selectedScopeId.value = ''
    }
  }

  function cancelPlatformCatalogRequest() {
    platformCatalogRequestId.value += 1
    pendingCatalogProjectSlug.value = ''
    platformCatalogPending.value = false
  }

  async function fetchPlatformCatalog(projectSlug = selectedProjectSlug.value, force = false) {
    const slug = projectSlug.trim()
    if (!slug) {
      clearPlatformCatalogState()
      cancelPlatformCatalogRequest()
      return
    }

    if (!force && platformCatalog.value && loadedCatalogProjectSlug.value === slug) {
      return
    }

    if (platformCatalogPending.value && pendingCatalogProjectSlug.value === slug) {
      return
    }

    const requestId = platformCatalogRequestId.value + 1
    platformCatalogRequestId.value = requestId
    pendingCatalogProjectSlug.value = slug
    platformCatalogPending.value = true
    platformCatalogError.value = ''

    try {
      const catalog = await platformApi.getActionCatalog(slug)

      if (platformCatalogRequestId.value !== requestId) {
        return
      }

      platformCatalog.value = catalog
      loadedCatalogProjectSlug.value = slug
    } catch (error) {
      if (platformCatalogRequestId.value !== requestId) {
        return
      }

      platformCatalog.value = null
      loadedCatalogProjectSlug.value = ''
      platformCatalogError.value = normalizePlatformApiError(error, 'Не удалось загрузить каталог действий проекта.')
    } finally {
      if (platformCatalogRequestId.value === requestId) {
        platformCatalogPending.value = false
        pendingCatalogProjectSlug.value = ''
      }
    }
  }

  async function dispatchPlatformMutation(actionId: ProjectMutationActionId, payload: ProjectActionExecutePayload) {
    const projectSlug = payload.projectSlug?.trim() || selectedProjectSlug.value
    if (!projectSlug) {
      throw new Error('PROJECT_SLUG_REQUIRED')
    }

    return await platformApi.executeProjectAction(projectSlug, actionId, payload)
  }

  function setPeerLogin(login: string) {
    currentPeerLogin.value = login.trim()
  }

  function setSelectedProjectSlug(slug: string) {
    const nextSlug = slug.trim()
    if (nextSlug === selectedProjectSlug.value) {
      return
    }

    const engineProject = projectEngine.projects.value.find(project => project.slug === nextSlug)
    if (engineProject) {
      projectEngine.activeProjectId.value = engineProject.id
    }

    selectedProjectSlug.value = nextSlug
    clearPlatformCatalogState()
    clearPlatformScopeDetailState()
    cancelPlatformCatalogRequest()
  }

  function setSelectedAction(actionId: ProjectActionId | null) {
    selectedActionId.value = actionId
  }

  function togglePanel() {
    panelOpen.value = !panelOpen.value
  }

  function closePanel() {
    panelOpen.value = false
  }

  function openPanel() {
    panelOpen.value = true
  }

  async function fetchPlatformScopeDetail(scopeType = selectedScopeType.value, scopeId = selectedScopeId.value, force = false) {
    const slug = selectedProjectSlug.value.trim()
    const normalizedScopeType = scopeType.trim() as MessengerPlatformScopeType | ''
    const normalizedScopeId = scopeId.trim()

    if (!slug || !normalizedScopeType || !normalizedScopeId) {
      clearPlatformScopeDetailState(false)
      return
    }

    if (!force
      && platformScopeDetail.value
      && selectedScopeType.value === normalizedScopeType
      && selectedScopeId.value === normalizedScopeId
      && platformScopeDetail.value.scope.scopeType === normalizedScopeType
      && platformScopeDetail.value.scope.scopeId === normalizedScopeId) {
      return
    }

    selectedScopeType.value = normalizedScopeType
    selectedScopeId.value = normalizedScopeId

    const requestId = platformScopeDetailRequestId.value + 1
    platformScopeDetailRequestId.value = requestId
    platformScopeDetailPending.value = true
    platformScopeDetailError.value = ''

    try {
      const detail = await platformApi.getScopeDetail(slug, normalizedScopeType, normalizedScopeId)

      if (platformScopeDetailRequestId.value !== requestId) {
        return
      }

      platformScopeDetail.value = detail
    } catch (error) {
      if (platformScopeDetailRequestId.value !== requestId) {
        return
      }

      platformScopeDetail.value = null
      platformScopeDetailError.value = normalizePlatformApiError(error, 'Не удалось загрузить детали контура проекта.')
    } finally {
      if (platformScopeDetailRequestId.value === requestId) {
        platformScopeDetailPending.value = false
      }
    }
  }

  async function openScopeDetail(scopeType: MessengerPlatformScopeType, scopeId: string) {
    await fetchPlatformScopeDetail(scopeType, scopeId, true)
  }

  function clearPlatformScopeDetail() {
    clearPlatformScopeDetailState()
  }

  function extractPersistedGovernanceId(rawId: string, prefix: 'assignment' | 'participant') {
    const match = rawId.match(new RegExp(`^${prefix}:(\\d+)$`))
    return match ? Number(match[1]) : 0
  }

  function cloneGovernanceSettings(settings: Record<string, unknown>) {
    return JSON.parse(JSON.stringify(settings || {})) as Record<string, unknown>
  }

  async function refreshGovernanceViews() {
    const slug = selectedProjectSlug.value.trim()
    const jobs: Array<Promise<unknown>> = []

    if (slug) {
      jobs.push(fetchPlatformCatalog(slug, true))
    }

    if (selectedScopeType.value && selectedScopeId.value) {
      jobs.push(fetchPlatformScopeDetail(selectedScopeType.value, selectedScopeId.value, true))
    }

    if (!jobs.length) {
      return
    }

    await Promise.allSettled(jobs)
  }

  function resetGovernanceMutationState() {
    governanceMutationError.value = ''
    governanceMutationNotice.value = ''
  }

  async function createScopeParticipant(payload: GovernanceScopeParticipantDraft) {
    const slug = selectedProjectSlug.value.trim()
    const scopeDetail = platformScopeDetail.value
    const displayName = payload.displayName.trim()

    resetGovernanceMutationState()

    if (!slug || !scopeDetail || !displayName) {
      governanceMutationError.value = 'Сначала откройте контур проекта и заполните имя участника.'
      return false
    }

    governanceMutationPending.value = true

    try {
      const participantResponse = await platformApi.createParticipant(slug, {
        displayName,
        roleKey: payload.roleKey,
        sourceKind: 'custom',
      })

      await platformApi.createAssignment(slug, {
        participantId: participantResponse.participant.persistedId,
        scopeType: scopeDetail.scope.scopeType,
        scopeSource: scopeDetail.scope.scopeSource,
        scopeId: scopeDetail.scope.scopeId,
        responsibility: payload.responsibility,
      })

      await refreshGovernanceViews()
      governanceMutationNotice.value = 'Участник добавлен в контур.'
      return true
    } catch (error) {
      governanceMutationError.value = normalizePlatformApiError(error, 'Не удалось добавить участника в контур.')
      return false
    } finally {
      governanceMutationPending.value = false
    }
  }

  async function updateScopeAssignment(assignmentId: string, patch: { responsibility?: string }) {
    const slug = selectedProjectSlug.value.trim()
    const persistedAssignmentId = extractPersistedGovernanceId(assignmentId, 'assignment')

    resetGovernanceMutationState()

    if (!slug || !persistedAssignmentId) {
      governanceMutationError.value = 'Не удалось определить назначение для обновления.'
      return false
    }

    governanceMutationPending.value = true

    try {
      await platformApi.updateAssignment(slug, persistedAssignmentId, patch)

      await refreshGovernanceViews()
      governanceMutationNotice.value = 'Назначение обновлено.'
      return true
    } catch (error) {
      governanceMutationError.value = normalizePlatformApiError(error, 'Не удалось обновить назначение.')
      return false
    } finally {
      governanceMutationPending.value = false
    }
  }

  async function deleteScopeAssignment(assignmentId: string) {
    const slug = selectedProjectSlug.value.trim()
    const persistedAssignmentId = extractPersistedGovernanceId(assignmentId, 'assignment')

    resetGovernanceMutationState()

    if (!slug || !persistedAssignmentId) {
      governanceMutationError.value = 'Не удалось определить назначение для удаления.'
      return false
    }

    governanceMutationPending.value = true

    try {
      await platformApi.deleteAssignment(slug, persistedAssignmentId)

      await refreshGovernanceViews()
      governanceMutationNotice.value = 'Назначение удалено.'
      return true
    } catch (error) {
      governanceMutationError.value = normalizePlatformApiError(error, 'Не удалось удалить назначение.')
      return false
    } finally {
      governanceMutationPending.value = false
    }
  }

  async function updateScopeSettings(settings: Record<string, unknown>) {
    const slug = selectedProjectSlug.value.trim()
    const scopeDetail = platformScopeDetail.value

    resetGovernanceMutationState()

    if (!slug || !scopeDetail) {
      governanceMutationError.value = 'Сначала откройте контур проекта.'
      return false
    }

    governanceMutationPending.value = true

    try {
      await platformApi.updateScopeSettings(slug, scopeDetail.scope.scopeType, scopeDetail.scope.scopeId, cloneGovernanceSettings(settings))

      await refreshGovernanceViews()
      governanceMutationNotice.value = 'Настройки контура обновлены.'
      return true
    } catch (error) {
      governanceMutationError.value = normalizePlatformApiError(error, 'Не удалось обновить настройки контура.')
      return false
    } finally {
      governanceMutationPending.value = false
    }
  }

  watch(panelOpen, async (open) => {
    if (!open) {
      return
    }

    await fetchPlatformProjects(platformProjectsRequirePlatformSession.value)

    if (selectedProjectSlug.value && !platformProjectsRequirePlatformSession.value) {
      await fetchPlatformCatalog(selectedProjectSlug.value, true)
    }
  })

  watch(selectedProjectSlug, async (nextSlug, previousSlug) => {
    if (nextSlug === previousSlug) {
      return
    }

    resetGovernanceMutationState()

    if (!panelOpen.value) {
      return
    }

    if (platformProjectsRequirePlatformSession.value) {
      return
    }

    await fetchPlatformCatalog(nextSlug, true)
  })

  watch(peerRole, () => {
    if (selectedActionId.value && !actions.value.some(action => action.id === selectedActionId.value)) {
      selectedActionId.value = null
    }
  })

  async function executeAction(
    actionId: ProjectActionId,
    payload?: ProjectActionExecutePayload,
  ): Promise<ProjectActionResult> {
    const action = actions.value.find(a => a.id === actionId)
    if (!action) {
      return { success: false, message: 'Действие не найдено' }
    }

    pendingAction.value = actionId

    try {
      const result = await dispatchAction(action, payload)
      lastResult.value = result
      return result
    } finally {
      pendingAction.value = null
    }
  }

  function buildActionMessageBody(action: ProjectActionDefinition, payload: ProjectActionExecutePayload = {}): string {
    const lines = [`[${action.label}]`]

    appendStructuredLine(lines, 'Проект', payload.projectTitle || selectedProject.value?.title || payload.projectSlug || selectedProjectSlug.value)
    appendStructuredLine(lines, 'Задача', payload.taskTitle)
    appendStructuredLine(lines, 'Статус', payload.taskStatusLabel || payload.taskStatus)
    appendStructuredLine(lines, 'Этап', payload.phaseTitle)
    appendStructuredLine(lines, 'Спринт', payload.sprintName)
    appendStructuredLine(lines, 'Субъект', payload.subjectLabel)
    appendStructuredLine(lines, 'Объект', payload.objectLabel)
    appendStructuredLine(lines, 'Документ', payload.documentTitle)
    appendStructuredLine(lines, 'Услуга', payload.serviceTitle)
    appendStructuredLine(lines, 'Диапазон', [payload.rangeStart, payload.rangeEnd].filter(Boolean).join(' → '))
    appendStructuredLine(lines, 'Комментарий', payload.note || payload.text)

    if (lines.length === 1) {
      lines.push(action.description)
    }

    return lines.join('\n')
  }

  async function dispatchAction(
    action: ProjectActionDefinition,
    payload: ProjectActionExecutePayload = {},
  ): Promise<ProjectActionResult> {
    const effectivePayload: ProjectActionExecutePayload = {
      ...payload,
      projectSlug: payload.projectSlug || selectedProjectSlug.value,
      projectTitle: payload.projectTitle || selectedProject.value?.title || payload.projectSlug || selectedProjectSlug.value,
    }
    const messageBody = buildActionMessageBody(action, effectivePayload)
    const triggerFilePicker = Boolean(effectivePayload.useFilePicker && ['send_corrections', 'upload_photo_report', 'share_file'].includes(action.id))

    if (isProjectMutationAction(action.id)) {
      try {
        const response = await dispatchPlatformMutation(action.id, effectivePayload)

        if (effectivePayload.projectSlug) {
          const refreshJobs: Array<Promise<unknown>> = [
            fetchPlatformProjects(true),
            fetchPlatformCatalog(effectivePayload.projectSlug, true),
          ]

          if (selectedScopeType.value && selectedScopeId.value) {
            refreshJobs.push(fetchPlatformScopeDetail(selectedScopeType.value, selectedScopeId.value, true))
          }

          await Promise.allSettled(refreshJobs)
        }

        return {
          success: true,
          message: response.message,
          data: {
            messageBody,
            mutation: response.mutation,
          },
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error && error.message === 'PROJECT_SLUG_REQUIRED'
            ? 'Сначала выберите проект.'
            : normalizePlatformApiError(error, `Не удалось выполнить действие «${action.label.toLowerCase()}».`),
        }
      }
    }

    switch (action.id) {
      case 'request_report':
        return {
          success: true,
          message: 'Запрос на отчёт отправлен',
          data: { messageBody },
        }

      case 'send_corrections':
        return {
          success: true,
          message: effectivePayload.documentTitle ? 'Правки добавлены в чат' : 'Выберите файл с правками',
          data: { messageBody, triggerFilePicker },
        }

      case 'approve_selection':
        return {
          success: true,
          message: 'Выбор согласован',
          data: { messageBody },
        }

      case 'request_variants':
        return {
          success: true,
          message: 'Запрос на варианты отправлен',
          data: { messageBody },
        }

      case 'approve_act':
        return {
          success: true,
          message: 'Акт одобрен',
          data: { messageBody },
        }

      case 'ask_designer':
        return {
          success: true,
          message: 'Вопрос отправлен',
          data: { messageBody },
        }

      case 'report_completion':
        return {
          success: true,
          message: 'Отчёт о завершении отправлен',
          data: { messageBody },
        }

      case 'upload_photo_report':
        return {
          success: true,
          message: effectivePayload.documentTitle ? 'Фотоотчёт добавлен в чат' : 'Выберите файл для фотоотчёта',
          data: { messageBody, triggerFilePicker },
        }

      case 'request_clarification':
        return {
          success: true,
          message: 'Запрос на уточнение отправлен',
          data: { messageBody },
        }

      case 'share_file':
        return {
          success: true,
          message: effectivePayload.documentTitle ? 'Документ добавлен в чат' : 'Выберите файл для отправки',
          data: { messageBody, triggerFilePicker },
        }

      case 'request_response':
        return {
          success: true,
          message: 'Запрос отправлен',
          data: { messageBody },
        }

      default:
        return { success: false, message: 'Неизвестное действие' }
    }
  }

  return {
    panelOpen: readonly(panelOpen),
    pendingAction: readonly(pendingAction),
    lastResult: readonly(lastResult),
    peerRole,
    actions,
    groupedActions,
    selectedActionId: readonly(selectedActionId),
    platformProjects: readonly(platformProjects),
    platformProjectsPending: readonly(platformProjectsPending),
    platformProjectsError: readonly(platformProjectsError),
    platformProjectsRequirePlatformSession: readonly(platformProjectsRequirePlatformSession),
    selectedProjectSlug: readonly(selectedProjectSlug),
    selectedProject,
    platformCatalog: readonly(platformCatalog),
    platformCatalogPending: readonly(platformCatalogPending),
    platformCatalogError: readonly(platformCatalogError),
    selectedScopeType: readonly(selectedScopeType),
    selectedScopeId: readonly(selectedScopeId),
    platformScopeDetail: readonly(platformScopeDetail),
    platformScopeDetailPending: readonly(platformScopeDetailPending),
    platformScopeDetailError: readonly(platformScopeDetailError),
    governanceMutationPending: readonly(governanceMutationPending),
    governanceMutationError: readonly(governanceMutationError),
    governanceMutationNotice: readonly(governanceMutationNotice),
    setPeerLogin,
    setSelectedProjectSlug,
    setSelectedAction,
    fetchPlatformProjects,
    fetchPlatformCatalog,
    fetchPlatformScopeDetail,
    openScopeDetail,
    clearPlatformScopeDetail,
    createScopeParticipant,
    updateScopeAssignment,
    deleteScopeAssignment,
    updateScopeSettings,
    togglePanel,
    closePanel,
    openPanel,
    executeAction,
  }
}
