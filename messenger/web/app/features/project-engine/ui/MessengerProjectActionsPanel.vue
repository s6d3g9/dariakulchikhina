<script setup lang="ts">
import type {
  MessengerPlatformActionCatalog,
  MessengerPlatformProjectSummary,
  MessengerPlatformScopeDetailBundle,
  MessengerPlatformScopeParticipant,
  MessengerPlatformScopeType,
  MessengerPlatformSubjectOption,
  MessengerPlatformSprintOption,
  ProjectActionCategoryGroup,
  ProjectActionDefinition,
  ProjectActionExecutePayload,
  ProjectActionId,
} from '../model/useMessengerProjectActions'
import ProjectPicker from './project-picker/ProjectPicker.vue'

type ProjectOverviewPane = 'timeline' | 'sprints' | 'subjects' | 'scope-detail'

type SubjectFabulaPreset = {
  title: string
  summary: string
  icon: string
  actionIds: ProjectActionId[]
}

type GovernanceRoleKey = 'client' | 'manager' | 'designer' | 'lawyer' | 'contractor' | 'seller' | 'engineer' | 'consultant' | 'service' | 'other'
type GovernanceResponsibilityKey = 'lead' | 'owner' | 'executor' | 'reviewer' | 'approver' | 'observer' | 'consultant'
type ScopeSettingFieldKind = 'select' | 'number' | 'boolean' | 'list' | 'text'

const props = defineProps<{
  open: boolean
  groups: ProjectActionCategoryGroup[]
  pendingAction: ProjectActionId | null
  projects: MessengerPlatformProjectSummary[]
  projectsPending: boolean
  projectsError: string
  projectsRequirePlatformSession: boolean
  selectedProjectSlug: string
  selectedActionId: ProjectActionId | null
  catalog: MessengerPlatformActionCatalog | null
  catalogPending: boolean
  catalogError: string
  scopeDetail: MessengerPlatformScopeDetailBundle | null
  scopeDetailPending: boolean
  scopeDetailError: string
  governanceMutationPending: boolean
  governanceMutationError: string
  governanceMutationNotice: string
}>()

const emit = defineEmits<{
  close: []
  execute: [actionId: ProjectActionId, payload?: ProjectActionExecutePayload]
  selectProject: [slug: string]
  selectAction: [actionId: ProjectActionId | null]
  openScopeDetail: [target: { scopeType: MessengerPlatformScopeType; scopeId: string }]
  createScopeParticipant: [payload: { displayName: string; roleKey: GovernanceRoleKey; responsibility: GovernanceResponsibilityKey }]
  updateScopeAssignment: [payload: { assignmentId: string; responsibility: GovernanceResponsibilityKey }]
  deleteScopeAssignment: [payload: { assignmentId: string }]
  updateScopeSettings: [payload: { settings: Record<string, unknown> }]
}>()

const projectPickerOpen = ref(false)
const searchPanelOpen = ref(false)
const overviewPane = ref<ProjectOverviewPane | ''>('')
const activeSubjectContextId = ref('')
const taskMode = ref<'existing' | 'new'>('new')
const selectedTaskId = ref('')
const taskTitle = ref('')
const selectedTaskStatus = ref('')
const selectedPhaseKey = ref('')
const selectedSprintId = ref('')
const selectedSubjectId = ref('')
const selectedObjectId = ref('')
const selectedDocumentId = ref('')
const selectedServiceId = ref('')
const rangeStart = ref('')
const rangeEnd = ref('')
const detailsText = ref('')
const formError = ref('')
const actionSearch = ref('')
const selectedCategory = ref<ProjectActionCategoryGroup['category'] | ''>('')
const scopeParticipantName = ref('')
const scopeParticipantRole = ref<GovernanceRoleKey>('manager')
const scopeParticipantResponsibility = ref<GovernanceResponsibilityKey>('owner')
const scopeSettingsDraft = ref<Record<string, unknown>>({})

const allActions = computed(() => props.groups.flatMap(group => group.actions))
const currentAction = computed(() => allActions.value.find(action => action.id === props.selectedActionId) || null)
const normalizedActionSearch = computed(() => actionSearch.value.trim().toLowerCase())
const selectedProjectLabel = computed(() => {
  return props.catalog?.project.title
    || props.projects.find(project => project.slug === props.selectedProjectSlug)?.title
    || props.selectedProjectSlug
    || 'Проект'
})
const searchChipLabel = computed(() => actionSearch.value.trim() || 'Поиск')
const activeProjectCatalog = computed(() => {
  if (!props.catalog || props.catalog.project.slug !== props.selectedProjectSlug) {
    return null
  }

  return props.catalog
})
const showProjectPane = computed(() => projectPickerOpen.value)
const showSearchPane = computed(() => searchPanelOpen.value)
const showTimelinePane = computed(() => overviewPane.value === 'timeline')
const showSprintsPane = computed(() => overviewPane.value === 'sprints')
const showSubjectsPane = computed(() => overviewPane.value === 'subjects')
const showScopeDetailPane = computed(() => overviewPane.value === 'scope-detail')
const canShowProjectOverview = computed(() => Boolean(props.selectedProjectSlug))
const catalogLockedBySession = computed(() => Boolean(props.selectedProjectSlug && props.projectsRequirePlatformSession && !props.catalogPending && !props.catalog))
const canUseCatalogFeatures = computed(() => Boolean(props.selectedProjectSlug && !catalogLockedBySession.value))
const miniTimelineCatalog = computed(() => {
  if (!activeProjectCatalog.value || props.catalogPending || !activeProjectCatalog.value.phases.length) {
    return null
  }

  return activeProjectCatalog.value
})
const sprintOverviewItems = computed(() => {
  if (!activeProjectCatalog.value || props.catalogPending) {
    return []
  }

  return activeProjectCatalog.value.sprints
})
const timelineChipCount = computed(() => activeProjectCatalog.value?.phases.length || 0)
const sprintChipCount = computed(() => activeProjectCatalog.value?.sprints.length || 0)
const subjectChipCount = computed(() => subjectItems.value.length)
const showExpansion = computed(() => {
  return showProjectPane.value
    || showSearchPane.value
    || showTimelinePane.value
    || showSprintsPane.value
    || showSubjectsPane.value
    || showScopeDetailPane.value
    || Boolean(currentAction.value)
    || Boolean(formError.value)
})

const taskItems = computed(() => {
  const catalogTasks = props.catalog?.tasks || []

  return catalogTasks.filter((task) => {
    if (selectedSprintId.value) {
      return task.sprintId === selectedSprintId.value || !task.sprintId
    }

    if (selectedPhaseKey.value) {
      return !task.phaseKey || task.phaseKey === selectedPhaseKey.value
    }

    return true
  })
})

const phaseItems = computed(() => props.catalog?.phases || [])
const sprintItems = computed(() => {
  const catalogSprints = props.catalog?.sprints || []
  if (!selectedPhaseKey.value) {
    return catalogSprints
  }

  return catalogSprints.filter(sprint => !sprint.linkedPhaseKey || sprint.linkedPhaseKey === selectedPhaseKey.value)
})
const subjectItems = computed(() => props.catalog?.subjects || [])
const objectItems = computed(() => props.catalog?.objects || [])
const documentItems = computed(() => props.catalog?.documents || [])
const serviceItems = computed(() => {
  const catalogServices = props.catalog?.extraServices || []
  if (currentAction.value?.id === 'create_invoice') {
    return catalogServices.filter(service => ['quoted', 'approved'].includes(service.status))
  }

  return catalogServices
})

const selectedTask = computed(() => taskItems.value.find(task => task.id === selectedTaskId.value) || null)
const selectedPhase = computed(() => phaseItems.value.find(phase => phase.phaseKey === selectedPhaseKey.value) || null)
const selectedSprint = computed(() => sprintItems.value.find(sprint => sprint.id === selectedSprintId.value) || null)
const selectedSubject = computed(() => subjectItems.value.find(subject => subject.id === selectedSubjectId.value) || null)
const selectedObject = computed(() => objectItems.value.find(object => object.id === selectedObjectId.value) || null)
const selectedDocument = computed(() => documentItems.value.find(document => document.id === selectedDocumentId.value) || null)
const selectedService = computed(() => serviceItems.value.find(service => service.id === selectedServiceId.value) || null)

const sprintStatusLabels: Record<MessengerPlatformSprintOption['status'], string> = {
  planned: 'Запланирован',
  active: 'Активен',
  review: 'На ревью',
  done: 'Завершён',
}

const catalogRecommendations = computed(() => props.catalog?.coordination.recommendations?.slice(0, 3) || [])

const workTaskStatusItems = [
  { title: 'Запланировано', value: 'planned' },
  { title: 'Ожидание', value: 'pending' },
  { title: 'В работе', value: 'in_progress' },
  { title: 'На паузе', value: 'paused' },
  { title: 'Выполнено', value: 'done' },
  { title: 'Отменено', value: 'cancelled' },
  { title: 'Пропущено', value: 'skipped' },
]

const hybridTaskStatusItems = [
  { title: 'К выполнению', value: 'todo' },
  { title: 'В работе', value: 'doing' },
  { title: 'На проверке', value: 'review' },
  { title: 'Выполнено', value: 'done' },
]

const taskActionIds = new Set<ProjectActionId>(['assign_task', 'create_task', 'update_work_status'])
const stageActionIds = new Set<ProjectActionId>(['accept_stage', 'change_phase', 'approve_selection', 'report_completion'])
const documentActionIds = new Set<ProjectActionId>(['send_corrections', 'approve_act', 'upload_photo_report', 'share_file'])
const financeActionIds = new Set<ProjectActionId>(['create_invoice', 'order_extra_service'])
const subjectActionIds = new Set<ProjectActionId>(['assign_task', 'create_task', 'request_report', 'ask_designer', 'request_clarification', 'request_response'])
const objectActionIds = new Set<ProjectActionId>(['assign_task', 'create_task', 'send_corrections', 'create_invoice', 'order_extra_service', 'request_variants'])
const directMutationActionIds = new Set<ProjectActionId>(['assign_task', 'accept_stage', 'change_phase', 'create_invoice', 'create_task', 'order_extra_service', 'update_work_status'])

const usesTaskSelection = computed(() => Boolean(currentAction.value && taskActionIds.has(currentAction.value.id)))
const usesStageSelection = computed(() => Boolean(currentAction.value && stageActionIds.has(currentAction.value.id)))
const usesDocumentSelection = computed(() => Boolean(currentAction.value && documentActionIds.has(currentAction.value.id)))
const usesFinanceSelection = computed(() => Boolean(currentAction.value && financeActionIds.has(currentAction.value.id)))
const usesSubjectSelection = computed(() => Boolean(currentAction.value && subjectActionIds.has(currentAction.value.id)))
const usesObjectSelection = computed(() => Boolean(currentAction.value && objectActionIds.has(currentAction.value.id)))
const usesRangeSelection = computed(() => Boolean(currentAction.value && (taskActionIds.has(currentAction.value.id) || stageActionIds.has(currentAction.value.id))))
const usesTaskStatusSelection = computed(() => currentAction.value?.id === 'update_work_status')
const isDirectMutationAction = computed(() => Boolean(currentAction.value && directMutationActionIds.has(currentAction.value.id)))

const selectedTaskStatusItems = computed(() => {
  return selectedTask.value?.source === 'hybrid'
    ? hybridTaskStatusItems
    : workTaskStatusItems
})

const selectedTaskStatusLabel = computed(() => {
  return selectedTaskStatusItems.value.find(option => option.value === selectedTaskStatus.value)?.title || ''
})

const governanceRoleItems = [
  { title: 'Клиент', value: 'client' },
  { title: 'Менеджер', value: 'manager' },
  { title: 'Дизайнер', value: 'designer' },
  { title: 'Юрист', value: 'lawyer' },
  { title: 'Подрядчик', value: 'contractor' },
  { title: 'Поставщик', value: 'seller' },
  { title: 'Инженер', value: 'engineer' },
  { title: 'Консультант', value: 'consultant' },
  { title: 'Сервис', value: 'service' },
  { title: 'Другая роль', value: 'other' },
] as const satisfies ReadonlyArray<{ title: string; value: GovernanceRoleKey }>

const governanceResponsibilityItems = [
  { title: 'Лидирует', value: 'lead' },
  { title: 'Владелец', value: 'owner' },
  { title: 'Исполняет', value: 'executor' },
  { title: 'Проверяет', value: 'reviewer' },
  { title: 'Согласует', value: 'approver' },
  { title: 'Наблюдает', value: 'observer' },
  { title: 'Консультирует', value: 'consultant' },
] as const satisfies ReadonlyArray<{ title: string; value: GovernanceResponsibilityKey }>

const governanceChannelItems = [
  { title: 'Проектный room', value: 'project-room' },
  { title: 'Прямой тред', value: 'direct-thread' },
  { title: 'Передача', value: 'handoff' },
  { title: 'Согласование', value: 'approval' },
  { title: 'Дайджест', value: 'daily-digest' },
]

const governanceSettingOrder = [
  'communicationChannel',
  'approvalMode',
  'visibility',
  'requiredResponsibilities',
  'reviewCadenceDays',
  'reminderCadenceDays',
  'slaHours',
  'escalateOnBlocked',
] as const

const governanceSettingLabels: Record<string, string> = {
  communicationChannel: 'Канал коммуникации',
  approvalMode: 'Режим согласования',
  visibility: 'Видимость',
  requiredResponsibilities: 'Обязательные роли',
  reviewCadenceDays: 'Ревью, дней',
  reminderCadenceDays: 'Напоминание, дней',
  slaHours: 'SLA, часов',
  escalateOnBlocked: 'Эскалация при блокере',
}

const governanceOriginLabels: Record<MessengerPlatformScopeParticipant['origin'], string> = {
  direct: 'контур',
  project: 'проект',
  derived: 'legacy',
}

const subjectFabulaPresets: Record<MessengerPlatformSubjectOption['kind'], SubjectFabulaPreset> = {
  client: {
    title: 'Клиентский контур',
    summary: 'Согласования, запросы на варианты, акты и доп. услуги.',
    icon: 'mdi-account-heart-outline',
    actionIds: ['approve_selection', 'request_variants', 'order_extra_service', 'approve_act', 'ask_designer', 'create_invoice', 'request_response', 'share_file'],
  },
  contractor: {
    title: 'Подрядный контур',
    summary: 'Задачи, правки, фотоотчёты и отчётность по выполнению.',
    icon: 'mdi-hammer-wrench',
    actionIds: ['assign_task', 'request_report', 'send_corrections', 'update_work_status', 'report_completion', 'upload_photo_report', 'request_clarification', 'create_task', 'share_file'],
  },
  designer: {
    title: 'Дизайнерский контур',
    summary: 'Проектные решения, варианты, правки и быстрая обратная связь.',
    icon: 'mdi-pencil-ruler',
    actionIds: ['ask_designer', 'request_variants', 'send_corrections', 'request_response', 'share_file', 'create_task'],
  },
  seller: {
    title: 'Контур поставки',
    summary: 'Позиции, документы, ответы по поставке и счётные сценарии.',
    icon: 'mdi-package-variant-closed',
    actionIds: ['create_invoice', 'request_response', 'share_file', 'create_task', 'send_corrections'],
  },
  manager: {
    title: 'Контур координации',
    summary: 'Переключение фаз, поручения и управленческие ответы по проекту.',
    icon: 'mdi-briefcase-account-outline',
    actionIds: ['assign_task', 'create_task', 'change_phase', 'accept_stage', 'create_invoice', 'request_response', 'share_file'],
  },
  custom: {
    title: 'Спецконтур',
    summary: 'Точечные поручения, файлы и адресные запросы по роли участника.',
    icon: 'mdi-account-cog-outline',
    actionIds: ['create_task', 'request_response', 'share_file', 'assign_task'],
  },
}

const fallbackSubjectActionCategoryOrder = ['communication', 'documents', 'tasks', 'finance', 'stages'] as const

const activeSubjectContext = computed(() => {
  return subjectItems.value.find(subject => subject.id === activeSubjectContextId.value) || null
})

const subjectActionMenus = computed(() => {
  return subjectItems.value.map((subject) => {
    const preset = subjectFabulaPresets[subject.kind] || subjectFabulaPresets.custom
    const preferredActions = preset.actionIds
      .map(actionId => allActions.value.find(action => action.id === actionId) || null)
      .filter(Boolean) as ProjectActionDefinition[]

    const fallbackActions = fallbackSubjectActionCategoryOrder
      .flatMap(category => allActions.value.filter(action => action.category === category))
      .filter(action => !preferredActions.some(preferred => preferred.id === action.id))

    return {
      subject,
      fabulaTitle: preset.title,
      fabulaSummary: preset.summary,
      fabulaIcon: preset.icon,
      actions: [...preferredActions, ...fallbackActions].slice(0, 4),
    }
  })
})

const canCreateScopeParticipant = computed(() => {
  return Boolean(props.scopeDetail && scopeParticipantName.value.trim() && !props.governanceMutationPending)
})

const editableScopeSettings = computed(() => {
  const detail = props.scopeDetail
  if (!detail) {
    return [] as Array<{
      key: string
      label: string
      kind: ScopeSettingFieldKind
      value: string | number | boolean | null
      items?: ReadonlyArray<{ title: string; value: string }>
    }>
  }

  const labelMap = new Map(detail.settingItems.map(item => [item.key, item.label]))
  const knownKeys = governanceSettingOrder.filter(key => key in scopeSettingsDraft.value)
  const dynamicKeys = Object.keys(scopeSettingsDraft.value).filter(key => !knownKeys.includes(key as typeof governanceSettingOrder[number]))
  const keys = [...knownKeys, ...dynamicKeys]

  return keys.map((key) => {
    const rawValue = scopeSettingsDraft.value[key]

    if (key === 'communicationChannel') {
      return {
        key,
        label: labelMap.get(key) || governanceSettingLabels[key] || key,
        kind: 'select' as const,
        value: typeof rawValue === 'string' ? rawValue : '',
        items: governanceChannelItems,
      }
    }

    if (key === 'reviewCadenceDays' || key === 'reminderCadenceDays' || key === 'slaHours') {
      return {
        key,
        label: labelMap.get(key) || governanceSettingLabels[key] || key,
        kind: 'number' as const,
        value: typeof rawValue === 'number' ? rawValue : rawValue == null ? null : Number(rawValue),
      }
    }

    if (key === 'escalateOnBlocked') {
      return {
        key,
        label: labelMap.get(key) || governanceSettingLabels[key] || key,
        kind: 'boolean' as const,
        value: Boolean(rawValue),
      }
    }

    if (key === 'requiredResponsibilities') {
      return {
        key,
        label: labelMap.get(key) || governanceSettingLabels[key] || key,
        kind: 'list' as const,
        value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : '',
      }
    }

    return {
      key,
      label: labelMap.get(key) || governanceSettingLabels[key] || key,
      kind: 'text' as const,
      value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : rawValue == null ? '' : String(rawValue),
    }
  })
})

const submitLabel = computed(() => {
  return isDirectMutationAction.value ? 'Выполнить и добавить в чат' : 'Добавить в чат'
})

const filteredCategoryGroups = computed(() => {
  const query = normalizedActionSearch.value

  return props.groups
    .map((group) => {
      const categoryMatches = matchesText(group.label, query)
      const visibleActions = (!query || categoryMatches)
        ? group.actions
        : group.actions.filter(action => matchesActionSearch(action, query))

      if (query && !categoryMatches && !visibleActions.length) {
        return null
      }

      return {
        ...group,
        visibleActions,
        preview: visibleActions.slice(0, 2).map(action => action.label).join(' · '),
      }
    })
    .filter(Boolean) as Array<ProjectActionCategoryGroup & {
      visibleActions: ProjectActionDefinition[]
      preview: string
    }>
})

const selectedCategoryGroup = computed(() => {
  return props.groups.find(group => group.category === selectedCategory.value) || null
})

const selectedCategoryActions = computed(() => {
  const group = selectedCategoryGroup.value
  const query = normalizedActionSearch.value

  if (!group) {
    return []
  }

  if (!query || matchesText(group.label, query)) {
    return group.actions
  }

  return group.actions.filter(action => matchesActionSearch(action, query))
})

const canSubmit = computed(() => {
  if (!currentAction.value || !props.selectedProjectSlug || props.catalogPending || Boolean(props.pendingAction)) {
    return false
  }

  if (usesTaskSelection.value) {
    if (taskMode.value === 'new') {
      return taskTitle.value.trim().length > 0
    }

    return usesTaskStatusSelection.value
      ? Boolean(selectedTaskId.value && selectedTaskStatus.value)
      : Boolean(selectedTaskId.value)
  }

  if (usesStageSelection.value) {
    return Boolean(selectedPhaseKey.value || selectedSprintId.value)
  }

  if (currentAction.value?.id === 'create_invoice') {
    return serviceItems.value.some(service => service.id === selectedServiceId.value)
  }

  return true
})

function resetFormState() {
  taskMode.value = 'new'
  selectedTaskId.value = ''
  taskTitle.value = ''
  selectedTaskStatus.value = ''
  selectedPhaseKey.value = ''
  selectedSprintId.value = ''
  selectedSubjectId.value = ''
  selectedObjectId.value = ''
  selectedDocumentId.value = ''
  selectedServiceId.value = ''
  rangeStart.value = ''
  rangeEnd.value = ''
  detailsText.value = ''
  formError.value = ''
}

function cloneScopeSettings(settings: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(settings || {})) as Record<string, unknown>
}

function normalizeScopeSettingValue(kind: ScopeSettingFieldKind, value: unknown) {
  if (kind === 'boolean') {
    return Boolean(value)
  }

  if (kind === 'number') {
    const normalized = typeof value === 'number' ? value : Number(String(value || '').trim())
    return Number.isFinite(normalized) ? normalized : null
  }

  if (kind === 'list') {
    return String(value || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }

  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value)
}

function updateScopeSettingDraft(key: string, kind: ScopeSettingFieldKind, value: unknown) {
  scopeSettingsDraft.value = {
    ...scopeSettingsDraft.value,
    [key]: normalizeScopeSettingValue(kind, value),
  }
}

function commitScopeSettings() {
  emit('updateScopeSettings', { settings: cloneScopeSettings(scopeSettingsDraft.value) })
}

function submitScopeParticipant() {
  if (!canCreateScopeParticipant.value) {
    return
  }

  emit('createScopeParticipant', {
    displayName: scopeParticipantName.value.trim(),
    roleKey: scopeParticipantRole.value,
    responsibility: scopeParticipantResponsibility.value,
  })
}

function matchesText(value: string | undefined, query: string) {
  if (!query) {
    return true
  }

  return value?.toLowerCase().includes(query) || false
}

function matchesActionSearch(action: ProjectActionDefinition, query: string) {
  if (!query) {
    return true
  }

  return [action.label, action.description].some(text => matchesText(text, query))
}

function formatActionCount(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} сценарий`
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} сценария`
  }

  return `${count} сценариев`
}

function formatCountLabel(count: number, singular: string, paucal: string, plural: string) {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} ${singular}`
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} ${paucal}`
  }

  return `${count} ${plural}`
}

function formatRangeLabel(startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return `${startDate} - ${endDate}`
  }

  return startDate || endDate || 'Период не задан'
}

function resetCategorySelection() {
  selectedCategory.value = ''
  formError.value = ''
  emit('selectAction', null)
}

function closeUtilityPanes() {
  projectPickerOpen.value = false
  searchPanelOpen.value = false
  overviewPane.value = ''
}

function primeDefaults() {
  if (!props.catalog) {
    return
  }

  if (!selectedPhaseKey.value && props.catalog.project.activePhaseKey) {
    selectedPhaseKey.value = props.catalog.project.activePhaseKey
  }

  if (!selectedSprintId.value && props.catalog.project.activeSprintId) {
    selectedSprintId.value = props.catalog.project.activeSprintId
  }

  if (currentAction.value?.id === 'update_work_status') {
    taskMode.value = 'existing'
  }

  if (currentAction.value?.id === 'create_invoice' && !selectedServiceId.value && serviceItems.value.length) {
    selectedServiceId.value = serviceItems.value[0]?.id || ''
  }
}

function handleActionClick(action: ProjectActionDefinition) {
  activeSubjectContextId.value = ''
  closeUtilityPanes()

  const parentGroup = props.groups.find(group => group.actions.some(candidate => candidate.id === action.id))
  if (parentGroup) {
    selectedCategory.value = parentGroup.category
  }

  emit('selectAction', props.selectedActionId === action.id ? null : action.id)
}

function openSubjectAction(subjectId: string, action: ProjectActionDefinition) {
  activeSubjectContextId.value = subjectId
  selectedSubjectId.value = subjectId
  formError.value = ''
  closeUtilityPanes()

  const parentGroup = props.groups.find(group => group.actions.some(candidate => candidate.id === action.id))
  if (parentGroup) {
    selectedCategory.value = parentGroup.category
  }

  if (props.selectedActionId === action.id) {
    return
  }

  emit('selectAction', action.id)
}

function clearCategorySelection() {
  resetCategorySelection()
}

function selectCategory(category: ProjectActionCategoryGroup['category']) {
  closeUtilityPanes()

  if (selectedCategory.value === category) {
    clearCategorySelection()
    return
  }

  selectedCategory.value = category
  formError.value = ''

  const nextGroup = props.groups.find(group => group.category === category)
  if (props.selectedActionId && nextGroup && !nextGroup.actions.some(action => action.id === props.selectedActionId)) {
    emit('selectAction', null)
  }
}

function toggleProjectPane() {
  const shouldOpen = !projectPickerOpen.value
  closeUtilityPanes()
  resetCategorySelection()

  if (shouldOpen) {
    projectPickerOpen.value = true
  }
}

function selectProjectFromPicker(slug: string) {
  emit('selectProject', slug)
  projectPickerOpen.value = false
}

function toggleSearchPane() {
  const shouldOpen = !searchPanelOpen.value
  closeUtilityPanes()
  resetCategorySelection()

  if (shouldOpen) {
    searchPanelOpen.value = true
  }
}

function toggleOverviewPane(pane: ProjectOverviewPane) {
  const shouldOpen = overviewPane.value !== pane
  closeUtilityPanes()
  resetCategorySelection()

  if (shouldOpen) {
    overviewPane.value = pane
  }
}

function updateParticipantResponsibility(assignmentId: string, responsibility: GovernanceResponsibilityKey) {
  emit('updateScopeAssignment', {
    assignmentId,
    responsibility,
  })
}

function removeParticipantAssignment(assignmentId: string) {
  emit('deleteScopeAssignment', { assignmentId })
}

function openScopeDetail(scopeType: MessengerPlatformScopeType, scopeId: string) {
  closeUtilityPanes()
  resetCategorySelection()
  overviewPane.value = 'scope-detail'
  emit('openScopeDetail', { scopeType, scopeId })
}

function buildExecutePayload(): ProjectActionExecutePayload {
  const effectiveTaskTitle = taskMode.value === 'existing'
    ? selectedTask.value?.title || ''
    : taskTitle.value.trim()

  const effectiveRangeStart = rangeStart.value || selectedTask.value?.rangeStart || selectedSprint.value?.startDate || selectedPhase.value?.startDate || ''
  const effectiveRangeEnd = rangeEnd.value || selectedTask.value?.rangeEnd || selectedSprint.value?.endDate || selectedPhase.value?.endDate || ''

  return {
    text: detailsText.value.trim() || undefined,
    note: detailsText.value.trim() || undefined,
    projectSlug: props.selectedProjectSlug,
    projectTitle: props.catalog?.project.title || props.projects.find(project => project.slug === props.selectedProjectSlug)?.title || props.selectedProjectSlug,
    taskMode: taskMode.value,
    taskId: selectedTask.value?.id,
    taskTitle: effectiveTaskTitle || undefined,
    taskStatus: selectedTaskStatus.value || undefined,
    taskStatusLabel: selectedTaskStatusLabel.value || undefined,
    phaseKey: selectedPhase.value?.phaseKey || undefined,
    phaseTitle: selectedPhase.value?.title || undefined,
    sprintId: selectedSprint.value?.id || undefined,
    sprintName: selectedSprint.value?.name || undefined,
    subjectId: selectedSubject.value?.id || undefined,
    subjectLabel: selectedSubject.value?.label || undefined,
    objectId: selectedObject.value?.id || undefined,
    objectLabel: selectedObject.value?.label || undefined,
    rangeStart: effectiveRangeStart || undefined,
    rangeEnd: effectiveRangeEnd || undefined,
    documentId: selectedDocument.value?.id || undefined,
    documentTitle: selectedDocument.value?.title || undefined,
    serviceId: selectedService.value?.id || undefined,
    serviceTitle: selectedService.value?.title || undefined,
    useFilePicker: usesDocumentSelection.value && !selectedDocument.value,
  }
}

function submitAction() {
  formError.value = ''

  if (!currentAction.value) {
    formError.value = 'Выберите действие.'
    return
  }

  if (!props.selectedProjectSlug.trim()) {
    formError.value = 'Сначала выберите проект.'
    return
  }

  if (usesTaskSelection.value) {
    if (taskMode.value === 'new' && !taskTitle.value.trim()) {
      formError.value = 'Укажите название новой задачи.'
      return
    }

    if (taskMode.value === 'existing' && !selectedTaskId.value) {
      formError.value = 'Выберите задачу из списка.'
      return
    }
  }

  if (usesTaskStatusSelection.value && !selectedTaskStatus.value) {
    formError.value = 'Выберите новый статус задачи.'
    return
  }

  if (usesStageSelection.value && !selectedPhaseKey.value && !selectedSprintId.value) {
    formError.value = 'Выберите этап или спринт.'
    return
  }

  if (currentAction.value.id === 'create_invoice' && !selectedServiceId.value) {
    formError.value = 'Выберите доп. услугу для счёта.'
    return
  }

  emit('execute', currentAction.value.id, buildExecutePayload())
}

function resolveNextTaskStatus() {
  if (!selectedTask.value) {
    return ''
  }

  if (selectedTask.value.source === 'hybrid') {
    switch (selectedTask.value.status) {
      case 'todo':
        return 'doing'
      case 'doing':
        return 'review'
      case 'review':
        return 'done'
      default:
        return 'done'
    }
  }

  switch (selectedTask.value.status) {
    case 'planned':
    case 'pending':
      return 'in_progress'
    case 'paused':
      return 'in_progress'
    case 'in_progress':
      return 'done'
    default:
      return 'done'
  }
}

watch(() => props.selectedProjectSlug, (value, previousValue) => {
  resetFormState()
  activeSubjectContextId.value = ''
  primeDefaults()

  if (value !== previousValue) {
    closeUtilityPanes()
  }
})

const platformSessionNotice = computed(() => {
  if (!props.projectsRequirePlatformSession) {
    return ''
  }

  return 'Список проектов взят из messenger. Для таймлайна, каталога и отправки проектных действий нужна активная сессия основной платформы на основном домене.'
})

const catalogUnavailableMessage = computed(() => {
  if (!props.selectedProjectSlug) {
    return ''
  }

  return props.catalogError || ''
})

watch(currentAction, (action) => {
  resetFormState()
  if (!action) {
    return
  }

  closeUtilityPanes()

  const parentGroup = props.groups.find(group => group.actions.some(candidate => candidate.id === action.id))
  if (parentGroup) {
    selectedCategory.value = parentGroup.category
  }

  if (action.id === 'update_work_status') {
    taskMode.value = 'existing'
  }

  if (activeSubjectContextId.value && subjectItems.value.some(subject => subject.id === activeSubjectContextId.value)) {
    selectedSubjectId.value = activeSubjectContextId.value
  }

  primeDefaults()
}, { immediate: true })

watch(() => props.catalog, () => {
  if (activeSubjectContextId.value && !subjectItems.value.some(subject => subject.id === activeSubjectContextId.value)) {
    activeSubjectContextId.value = ''
  }

  primeDefaults()
}, { immediate: true })

watch(() => props.scopeDetail, (detail) => {
  if (detail) {
    overviewPane.value = 'scope-detail'
    scopeSettingsDraft.value = cloneScopeSettings(detail.settings)
  }
})

watch(() => props.open, (open) => {
  if (open) {
    return
  }

  closeUtilityPanes()
  actionSearch.value = ''
  if (!props.selectedActionId) {
    selectedCategory.value = ''
  }
})

watch(serviceItems, (items) => {
  if (selectedServiceId.value && !items.some(service => service.id === selectedServiceId.value)) {
    selectedServiceId.value = ''
  }

  if (currentAction.value?.id === 'create_invoice' && !selectedServiceId.value && items.length) {
    selectedServiceId.value = items[0]?.id || ''
  }
}, { immediate: true })

watch(() => props.governanceMutationNotice, (value) => {
  if (value.includes('Участник добавлен')) {
    scopeParticipantName.value = ''
  }
})

watch(selectedTask, (task) => {
  if (!task || taskMode.value !== 'existing') {
    return
  }

  if (!selectedPhaseKey.value && task.phaseKey) {
    selectedPhaseKey.value = task.phaseKey
  }

  if (!selectedSprintId.value && task.sprintId) {
    selectedSprintId.value = task.sprintId
  }

  if (!rangeStart.value && task.rangeStart) {
    rangeStart.value = task.rangeStart
  }

  if (!rangeEnd.value && task.rangeEnd) {
    rangeEnd.value = task.rangeEnd
  }

  if (usesTaskStatusSelection.value) {
    selectedTaskStatus.value = resolveNextTaskStatus()
  }
})
</script>

<template>
  <div v-if="props.open" class="pa-shell" :class="{ 'pa-shell--expanded': showExpansion }" @click.stop>
    <Transition name="pa-expand">
      <div v-if="showExpansion" class="pa-expand">
        <ProjectPicker
          v-if="showProjectPane"
          :projects="props.projects"
          :selected-slug="props.selectedProjectSlug"
          :pending="props.projectsPending"
          :error="props.projectsError"
          :notice="platformSessionNotice"
          @select="selectProjectFromPicker"
        />

        <section v-if="showSearchPane" class="pa-pane pa-pane--search">
          <VTextField
            v-model="actionSearch"
            class="pa-search-field"
            variant="solo-filled"
            density="comfortable"
            flat
            clearable
            hide-details
            bg-color="surface-container-highest"
            prepend-inner-icon="mdi-magnify"
            label="Поиск"
            placeholder="Счёт, отчёт, этап, задача"
          />
        </section>

        <section v-if="showTimelinePane" class="pa-pane pa-pane--timeline">
          <div class="pa-pane__head">
            <span class="pa-pane__title">Таймлайн</span>
            <div class="pa-pane__head-actions">
              <span class="pa-pane__value">{{ selectedProjectLabel }}</span>
              <VBtn
                v-if="props.selectedProjectSlug"
                color="primary"
                variant="tonal"
                size="small"
                @click="openScopeDetail('project', props.selectedProjectSlug)"
              >
                Контур проекта
              </VBtn>
            </div>
          </div>

          <div v-if="!props.selectedProjectSlug" class="pa-empty-state">
            Сначала выберите проект.
          </div>

          <div v-else-if="props.catalogPending" class="pa-empty-state">
            Загружаю таймлайн проекта…
          </div>

          <div v-else-if="catalogUnavailableMessage" class="pa-state pa-state--error">
            {{ catalogUnavailableMessage }}
          </div>

          <MessengerProjectMiniTimeline v-else-if="miniTimelineCatalog" :catalog="miniTimelineCatalog" @select-phase="openScopeDetail('phase', $event)" />

          <div v-else class="pa-empty-state">
            В проекте пока нет фаз для таймлайна.
          </div>
        </section>

        <section v-if="showSubjectsPane" class="pa-pane pa-pane--subjects">
          <div class="pa-pane__head">
            <span class="pa-pane__title">Субъекты</span>
            <span class="pa-pane__value">{{ formatCountLabel(subjectActionMenus.length, 'субъект', 'субъекта', 'субъектов') }}</span>
          </div>

          <div v-if="!props.selectedProjectSlug" class="pa-empty-state">
            Сначала выберите проект.
          </div>

          <div v-else-if="props.catalogPending" class="pa-empty-state">
            Подготавливаю субъектный контур проекта…
          </div>

          <div v-else-if="catalogUnavailableMessage" class="pa-state pa-state--error">
            {{ catalogUnavailableMessage }}
          </div>

          <div v-else-if="subjectActionMenus.length" class="pa-subject-list">
            <article
              v-for="entry in subjectActionMenus"
              :key="entry.subject.id"
              class="pa-subject-card"
              :class="{ 'pa-subject-card--active': activeSubjectContextId === entry.subject.id }"
            >
              <div class="pa-subject-card__head">
                <div class="pa-subject-card__title-wrap">
                  <span class="pa-subject-card__title">{{ entry.subject.label }}</span>
                  <span class="pa-subject-card__meta">{{ entry.subject.secondary || entry.fabulaSummary }}</span>
                </div>
                <span class="pa-subject-card__badge">
                  <VIcon :icon="entry.fabulaIcon" size="14" />
                  <span>{{ entry.fabulaTitle }}</span>
                </span>
              </div>

              <p class="pa-subject-card__fabula">{{ entry.fabulaSummary }}</p>

              <div v-if="entry.actions.length" class="pa-subject-card__actions">
                <VBtn
                  v-for="action in entry.actions"
                  :key="`${entry.subject.id}:${action.id}`"
                  color="primary"
                  variant="tonal"
                  size="small"
                  :prepend-icon="action.icon"
                  @click="openSubjectAction(entry.subject.id, action)"
                >
                  {{ action.label }}
                </VBtn>
              </div>

              <p v-else class="pa-empty-state">Для этого субъекта пока нет релевантных сценариев в текущем чате.</p>
            </article>
          </div>

          <div v-else class="pa-empty-state">
            В проекте пока нет субъектов для адресных сценариев.
          </div>
        </section>

        <section v-if="showScopeDetailPane" class="pa-pane pa-pane--scope-detail">
          <div class="pa-pane__head">
            <span class="pa-pane__title">{{ props.scopeDetail?.scope.title || 'Детали контура' }}</span>
            <span class="pa-pane__value">{{ props.scopeDetail?.scope.subtitle || selectedProjectLabel }}</span>
          </div>

          <div v-if="props.scopeDetailPending" class="pa-empty-state">
            Загружаю детали контура…
          </div>

          <div v-else-if="props.scopeDetailError" class="pa-state pa-state--error">
            {{ props.scopeDetailError }}
          </div>

          <template v-else-if="props.scopeDetail">
            <div class="pa-scope-hero">
              <span class="pa-scope-hero__status">{{ props.scopeDetail.scope.statusLabel || props.scopeDetail.scope.status || 'Контур проекта' }}</span>
              <span class="pa-scope-hero__revision">{{ props.scopeDetail.revision }}</span>
            </div>

            <section class="pa-scope-cluster">
              <div class="pa-scope-cluster__head">
                <span class="pa-pane__title">Участники и роли</span>
                <span class="pa-pane__value">{{ formatCountLabel(props.scopeDetail.participants.length, 'участник', 'участника', 'участников') }}</span>
              </div>

              <div v-if="props.scopeDetail.participants.length" class="pa-scope-list">
                <article v-for="participant in props.scopeDetail.participants" :key="participant.assignmentId" class="pa-scope-item">
                  <div class="pa-scope-item__head">
                    <span class="pa-scope-item__title">{{ participant.displayName }}</span>
                    <span class="pa-scope-item__badge">{{ governanceOriginLabels[participant.origin] }}</span>
                  </div>
                  <span class="pa-scope-item__meta">{{ participant.roleLabel }} · {{ participant.responsibilityLabel }}</span>
                  <span v-if="participant.secondary" class="pa-scope-item__meta">{{ participant.secondary }}</span>
                  <div v-if="participant.origin === 'direct'" class="pa-scope-item__controls">
                    <VSelect
                      :model-value="participant.responsibility"
                      :items="governanceResponsibilityItems"
                      item-title="title"
                      item-value="value"
                      density="comfortable"
                      variant="outlined"
                      label="Роль в контуре"
                      hide-details
                      :disabled="props.governanceMutationPending"
                      @update:model-value="updateParticipantResponsibility(participant.assignmentId, $event as GovernanceResponsibilityKey)"
                    />
                    <VBtn
                      color="error"
                      variant="tonal"
                      :disabled="props.governanceMutationPending"
                      @click="removeParticipantAssignment(participant.assignmentId)"
                    >
                      Убрать
                    </VBtn>
                  </div>
                </article>
              </div>
              <p v-else class="pa-empty-state">Для этого контура пока нет прямых назначений.</p>

              <div class="pa-scope-manage-grid">
                <VTextField
                  v-model="scopeParticipantName"
                  variant="outlined"
                  density="comfortable"
                  label="Новый участник"
                  placeholder="Например: Юрист проекта"
                  hide-details
                  :disabled="props.governanceMutationPending"
                />
                <VSelect
                  v-model="scopeParticipantRole"
                  :items="governanceRoleItems"
                  item-title="title"
                  item-value="value"
                  variant="outlined"
                  density="comfortable"
                  label="Роль"
                  hide-details
                  :disabled="props.governanceMutationPending"
                />
                <VSelect
                  v-model="scopeParticipantResponsibility"
                  :items="governanceResponsibilityItems"
                  item-title="title"
                  item-value="value"
                  variant="outlined"
                  density="comfortable"
                  label="Ответственность"
                  hide-details
                  :disabled="props.governanceMutationPending"
                />
                <VBtn color="primary" variant="flat" :disabled="!canCreateScopeParticipant" @click="submitScopeParticipant">
                  Добавить в контур
                </VBtn>
              </div>

              <p v-if="props.governanceMutationError" class="pa-state pa-state--error">{{ props.governanceMutationError }}</p>
              <p v-else-if="props.governanceMutationNotice" class="pa-state pa-state--muted">{{ props.governanceMutationNotice }}</p>
            </section>

            <section v-if="editableScopeSettings.length" class="pa-scope-cluster">
              <div class="pa-scope-cluster__head">
                <span class="pa-pane__title">Настройки</span>
                <span class="pa-pane__value">{{ formatCountLabel(editableScopeSettings.length, 'настройка', 'настройки', 'настроек') }}</span>
              </div>
              <div class="pa-scope-setting-grid">
                <article v-for="field in editableScopeSettings" :key="field.key" class="pa-scope-item">
                  <span class="pa-scope-item__title">{{ field.label }}</span>

                  <VSelect
                    v-if="field.kind === 'select'"
                    :model-value="field.value as string"
                    :items="field.items || []"
                    item-title="title"
                    item-value="value"
                    density="comfortable"
                    variant="outlined"
                    hide-details
                    :disabled="props.governanceMutationPending"
                    @update:model-value="updateScopeSettingDraft(field.key, field.kind, $event); commitScopeSettings()"
                  />

                  <VSwitch
                    v-else-if="field.kind === 'boolean'"
                    :model-value="Boolean(field.value)"
                    inset
                    color="primary"
                    hide-details
                    :disabled="props.governanceMutationPending"
                    @update:model-value="updateScopeSettingDraft(field.key, field.kind, $event); commitScopeSettings()"
                  />

                  <VTextField
                    v-else
                    :model-value="field.value == null ? '' : String(field.value)"
                    :type="field.kind === 'number' ? 'number' : 'text'"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    :disabled="props.governanceMutationPending"
                    @update:model-value="updateScopeSettingDraft(field.key, field.kind, $event)"
                    @blur="commitScopeSettings()"
                  />

                  <span class="pa-scope-item__meta">{{ field.kind === 'list' ? 'Укажите роли через запятую' : 'Изменения отправляются сразу' }}</span>
                </article>
              </div>
            </section>

            <section v-if="props.scopeDetail.objectItems.length" class="pa-scope-cluster">
              <div class="pa-scope-cluster__head">
                <span class="pa-pane__title">Объекты</span>
                <span class="pa-pane__value">{{ props.scopeDetail.objectItems.length }}</span>
              </div>
              <div class="pa-scope-list">
                <article v-for="item in props.scopeDetail.objectItems" :key="item.key" class="pa-scope-item">
                  <span class="pa-scope-item__title">{{ item.label }}</span>
                  <span class="pa-scope-item__meta">{{ item.value }}</span>
                </article>
              </div>
            </section>

            <section v-if="props.scopeDetail.actionItems.length" class="pa-scope-cluster">
              <div class="pa-scope-cluster__head">
                <span class="pa-pane__title">Действия и статусы</span>
                <span class="pa-pane__value">{{ props.scopeDetail.actionItems.length }}</span>
              </div>
              <div class="pa-scope-list">
                <article v-for="item in props.scopeDetail.actionItems" :key="item.key" class="pa-scope-item">
                  <span class="pa-scope-item__title">{{ item.label }}</span>
                  <span class="pa-scope-item__meta">{{ item.value }}</span>
                </article>
              </div>
            </section>

            <section v-if="props.scopeDetail.tasks.length" class="pa-scope-cluster">
              <div class="pa-scope-cluster__head">
                <span class="pa-pane__title">Задачи</span>
                <span class="pa-pane__value">{{ props.scopeDetail.tasks.length }}</span>
              </div>
              <div class="pa-scope-list">
                <article v-for="task in props.scopeDetail.tasks" :key="task.id" class="pa-scope-item">
                  <span class="pa-scope-item__title">{{ task.title }}</span>
                  <span class="pa-scope-item__meta">{{ task.statusLabel }}{{ task.assigneeLabels.length ? ` · ${task.assigneeLabels.join(', ')}` : '' }}</span>
                  <span v-if="task.secondary" class="pa-scope-item__meta">{{ task.secondary }}</span>
                  <div class="pa-scope-item__actions">
                    <VBtn color="primary" variant="text" size="small" @click="openScopeDetail('task', task.id)">Открыть контур</VBtn>
                  </div>
                </article>
              </div>
            </section>

            <section v-if="props.scopeDetail.linkedScopes.length" class="pa-scope-cluster">
              <div class="pa-scope-cluster__head">
                <span class="pa-pane__title">Связанные контуры</span>
                <span class="pa-pane__value">{{ props.scopeDetail.linkedScopes.length }}</span>
              </div>
              <div class="pa-scope-list">
                <article v-for="linkedScope in props.scopeDetail.linkedScopes" :key="`${linkedScope.scopeType}:${linkedScope.scopeId}`" class="pa-scope-item">
                  <span class="pa-scope-item__title">{{ linkedScope.title }}</span>
                  <span class="pa-scope-item__meta">{{ linkedScope.statusLabel || linkedScope.status || linkedScope.scopeType }}</span>
                  <div class="pa-scope-item__actions">
                    <VBtn color="primary" variant="text" size="small" @click="openScopeDetail(linkedScope.scopeType, linkedScope.scopeId)">Открыть контур</VBtn>
                  </div>
                </article>
              </div>
            </section>

            <section v-if="props.scopeDetail.ruleItems.length" class="pa-scope-cluster">
              <div class="pa-scope-cluster__head">
                <span class="pa-pane__title">Контур коммуникации</span>
                <span class="pa-pane__value">{{ props.scopeDetail.ruleItems.length }}</span>
              </div>
              <div class="pa-scope-list">
                <article v-for="rule in props.scopeDetail.ruleItems" :key="rule.id" class="pa-scope-item">
                  <span class="pa-scope-item__title">{{ rule.title }}</span>
                  <span class="pa-scope-item__meta">{{ rule.channel }} · {{ rule.audience }}</span>
                  <span class="pa-scope-item__meta">{{ rule.trigger }}</span>
                </article>
              </div>
            </section>
          </template>

          <div v-else class="pa-empty-state">
            Выберите фазу или другой контур проекта.
          </div>
        </section>

        <section v-if="showSprintsPane" class="pa-pane pa-pane--sprints">
          <div class="pa-pane__head">
            <span class="pa-pane__title">Спринты</span>
            <span class="pa-pane__value">{{ selectedProjectLabel }}</span>
          </div>

          <div v-if="!props.selectedProjectSlug" class="pa-empty-state">
            Сначала выберите проект.
          </div>

          <div v-else-if="props.catalogPending" class="pa-empty-state">
            Загружаю спринты проекта…
          </div>

          <div v-else-if="catalogUnavailableMessage" class="pa-state pa-state--error">
            {{ catalogUnavailableMessage }}
          </div>

          <div v-else-if="sprintOverviewItems.length" class="pa-sprint-list">
            <article
              v-for="sprint in sprintOverviewItems"
              :key="sprint.id"
              class="pa-sprint-card"
              :class="`pa-sprint-card--${sprint.status}`"
            >
              <div class="pa-sprint-card__head">
                <span class="pa-sprint-card__title">{{ sprint.name }}</span>
                <span class="pa-sprint-card__status">{{ sprintStatusLabels[sprint.status] }}</span>
              </div>

              <span class="pa-sprint-card__meta">{{ sprint.linkedPhaseTitle || 'Без связанного этапа' }}</span>
              <span class="pa-sprint-card__meta">{{ formatRangeLabel(sprint.startDate, sprint.endDate) }}</span>

              <p v-if="sprint.goal" class="pa-sprint-card__goal">{{ sprint.goal }}</p>

              <div class="pa-sprint-card__foot">
                <span>{{ formatCountLabel(sprint.taskCount, 'задача', 'задачи', 'задач') }}</span>
                <div class="pa-scope-item__actions">
                  <span>{{ sprint.secondary }}</span>
                  <VBtn color="primary" variant="text" size="small" @click="openScopeDetail('sprint', sprint.id)">Контур</VBtn>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="pa-empty-state">
            В проекте пока нет спринтов.
          </div>
        </section>

        <section v-if="currentAction" class="pa-pane pa-pane--builder">
          <div class="pa-pane__head">
            <span class="pa-pane__title">{{ currentAction.label }}</span>
            <span class="pa-pane__value">{{ currentAction.description }}</span>
          </div>

          <div v-if="activeSubjectContext" class="pa-subject-context">
            <div class="pa-subject-context__head">
              <span class="pa-subject-context__title">{{ activeSubjectContext.label }}</span>
              <span class="pa-subject-context__badge">Субъектный контур</span>
            </div>
            <span class="pa-subject-context__meta">{{ activeSubjectContext.secondary || 'Действие будет собрано в контексте этого субъекта.' }}</span>
          </div>

          <div v-if="!props.selectedProjectSlug" class="pa-empty-state">
            Сначала выберите проект.
          </div>

          <div v-else-if="props.catalogPending" class="pa-empty-state">
            Подготавливаю каталог проекта…
          </div>

          <div v-else-if="catalogUnavailableMessage" class="pa-state pa-state--error">
            {{ catalogUnavailableMessage }}
          </div>

          <div v-else-if="props.catalog" class="pa-form-grid">
            <div v-if="usesTaskSelection" class="pa-field-block pa-field-block--full">
              <div class="pa-field-block__head">
                <span class="pa-field-block__title">Задача</span>
                <span class="pa-field-block__hint">Новая или из существующего списка.</span>
              </div>

              <div class="pa-mode-row">
                <button type="button" class="pa-mode-chip" :class="{ 'pa-mode-chip--active': taskMode === 'new' }" @click="taskMode = 'new'">Новая</button>
                <button type="button" class="pa-mode-chip" :class="{ 'pa-mode-chip--active': taskMode === 'existing' }" @click="taskMode = 'existing'">Из списка</button>
              </div>

              <VAutocomplete
                v-if="taskMode === 'existing'"
                v-model="selectedTaskId"
                :items="taskItems"
                item-title="title"
                item-value="id"
                variant="outlined"
                density="comfortable"
                label="Задача"
                clearable
                hide-details
              />

              <VTextField
                v-else
                v-model="taskTitle"
                variant="outlined"
                density="comfortable"
                label="Название задачи"
                placeholder="Например: Согласовать акт"
                hide-details
              />

              <VSelect
                v-if="usesTaskStatusSelection"
                v-model="selectedTaskStatus"
                :items="selectedTaskStatusItems"
                item-title="title"
                item-value="value"
                variant="outlined"
                density="comfortable"
                label="Статус"
                hide-details
              />
            </div>

            <VSelect
              v-if="usesStageSelection || usesTaskSelection"
              v-model="selectedPhaseKey"
              :items="phaseItems"
              item-title="title"
              item-value="phaseKey"
              variant="outlined"
              density="comfortable"
              label="Этап"
              clearable
              hide-details
            />

            <VSelect
              v-if="usesStageSelection || usesTaskSelection"
              v-model="selectedSprintId"
              :items="sprintItems"
              item-title="name"
              item-value="id"
              variant="outlined"
              density="comfortable"
              label="Спринт"
              clearable
              hide-details
            />

            <VSelect
              v-if="usesSubjectSelection"
              v-model="selectedSubjectId"
              :items="subjectItems"
              item-title="label"
              item-value="id"
              variant="outlined"
              density="comfortable"
              label="Субъект"
              clearable
              hide-details
            />

            <VSelect
              v-if="usesObjectSelection"
              v-model="selectedObjectId"
              :items="objectItems"
              item-title="label"
              item-value="id"
              variant="outlined"
              density="comfortable"
              label="Объект"
              clearable
              hide-details
            />

            <VSelect
              v-if="usesDocumentSelection"
              v-model="selectedDocumentId"
              :items="documentItems"
              item-title="title"
              item-value="id"
              variant="outlined"
              density="comfortable"
              label="Документ"
              clearable
              hide-details
            />

            <VSelect
              v-if="usesFinanceSelection"
              v-model="selectedServiceId"
              :items="serviceItems"
              item-title="title"
              item-value="id"
              variant="outlined"
              density="comfortable"
              label="Услуга"
              clearable
              hide-details
            />

            <div v-if="usesRangeSelection" class="pa-range-row pa-field-block--full">
              <VTextField
                v-model="rangeStart"
                type="date"
                variant="outlined"
                density="comfortable"
                label="Начало"
                hide-details
              />
              <VTextField
                v-model="rangeEnd"
                type="date"
                variant="outlined"
                density="comfortable"
                label="Конец"
                hide-details
              />
            </div>

            <VTextarea
              v-model="detailsText"
              class="pa-field-block--full"
              variant="outlined"
              density="comfortable"
              rows="3"
              auto-grow
              label="Комментарий"
              placeholder="Уточнение для отправки или выполнения"
              hide-details
            />
          </div>
        </section>

        <p v-if="formError" class="pa-state pa-state--error">{{ formError }}</p>

        <div v-if="currentAction" class="pa-expand__footer">
          <VBtn variant="text" @click="emit('close')">Закрыть</VBtn>
          <VBtn color="primary" variant="flat" :disabled="!canSubmit" @click="submitAction">{{ submitLabel }}</VBtn>
        </div>
      </div>
    </Transition>

    <div class="pa-base">
      <button type="button" class="pa-base-chip" :class="{ 'pa-base-chip--active': showProjectPane }" @click="toggleProjectPane">
        <VIcon icon="mdi-briefcase-outline" size="16" />
        <span class="pa-base-chip__label">{{ selectedProjectLabel }}</span>
      </button>

      <button
        type="button"
        class="pa-base-chip"
        :class="{ 'pa-base-chip--active': showSearchPane, 'pa-base-chip--compact': !actionSearch.trim() }"
        @click="toggleSearchPane"
      >
        <VIcon icon="mdi-magnify" size="16" />
        <span class="pa-base-chip__label">{{ searchChipLabel }}</span>
      </button>

      <div class="pa-base__rail">
        <div class="pa-base__scroll">
          <button
            v-if="selectedCategoryGroup"
            type="button"
            class="pa-rail-chip pa-rail-chip--ghost"
            @click="clearCategorySelection"
          >
            <VIcon icon="mdi-arrow-left" size="16" />
            <span>Категории</span>
          </button>

          <template v-if="selectedCategoryGroup && selectedCategoryActions.length">
            <button
              v-for="action in selectedCategoryActions"
              :key="action.id"
              type="button"
              class="pa-rail-chip"
              :class="{
                'pa-rail-chip--active': props.selectedActionId === action.id,
                'pa-rail-chip--pending': props.pendingAction === action.id,
              }"
              :disabled="Boolean(props.pendingAction)"
              @click="handleActionClick(action)"
            >
              <VIcon :icon="action.icon" size="16" />
              <span>{{ action.label }}</span>
            </button>
          </template>

          <template v-else-if="!selectedCategoryGroup">
            <button
              v-if="canShowProjectOverview"
              type="button"
              class="pa-rail-chip"
              :class="{ 'pa-rail-chip--active': showTimelinePane }"
              :disabled="!canUseCatalogFeatures"
              @click="toggleOverviewPane('timeline')"
            >
              <VIcon icon="mdi-chart-timeline-variant" size="16" />
              <span>Таймлайн</span>
              <span class="pa-rail-chip__count">{{ timelineChipCount }}</span>
            </button>

            <button
              v-if="canShowProjectOverview"
              type="button"
              class="pa-rail-chip"
              :class="{ 'pa-rail-chip--active': showSprintsPane }"
              :disabled="!canUseCatalogFeatures"
              @click="toggleOverviewPane('sprints')"
            >
              <VIcon icon="mdi-flag-outline" size="16" />
              <span>Спринты</span>
              <span class="pa-rail-chip__count">{{ sprintChipCount }}</span>
            </button>

            <button
              v-if="canShowProjectOverview && subjectChipCount"
              type="button"
              class="pa-rail-chip"
              :class="{ 'pa-rail-chip--active': showSubjectsPane }"
              :disabled="!canUseCatalogFeatures"
              @click="toggleOverviewPane('subjects')"
            >
              <VIcon icon="mdi-account-group-outline" size="16" />
              <span>Субъекты</span>
              <span class="pa-rail-chip__count">{{ subjectChipCount }}</span>
            </button>

            <button
              v-for="group in filteredCategoryGroups"
              :key="group.category"
              type="button"
              class="pa-rail-chip"
              :class="{ 'pa-rail-chip--active': selectedCategory === group.category }"
              :disabled="Boolean(props.pendingAction) || !canUseCatalogFeatures"
              @click="selectCategory(group.category)"
            >
              <VIcon :icon="group.icon" size="16" />
              <span>{{ group.label }}</span>
              <span class="pa-rail-chip__count">{{ group.visibleActions.length }}</span>
            </button>
          </template>

          <span v-else class="pa-base__empty">
            {{ selectedCategoryGroup ? 'Нет действий' : 'Ничего не найдено' }}
          </span>
        </div>
      </div>

      <button type="button" class="pa-base-icon" aria-label="Закрыть" @click="emit('close')">
        <VIcon icon="mdi-close" size="18" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.pa-shell {
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  container-type: inline-size;
  container-name: project-actions;
}

.pa-expand {
  display: grid;
  width: 100%;
  box-sizing: border-box;
  gap: 10px;
  max-height: min(62vh, 640px);
  padding: 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-bottom: none;
  border-radius: 24px 24px 0 0;
  background: rgb(var(--v-theme-surface-container));
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.2);
}

.pa-expand__footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.pa-pane {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 18px;
  background: rgb(var(--v-theme-surface-container-high));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.pa-pane__head,
.pa-field-block__head {
  display: grid;
  gap: 2px;
}

.pa-pane__head-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.pa-pane__title,
.pa-field-block__title {
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.pa-pane__value,
.pa-field-block__hint {
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-base {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  width: 100%;
  box-sizing: border-box;
  align-items: center;
  gap: 8px;
  min-height: 58px;
  padding: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 999px;
  background: rgb(var(--v-theme-surface-container-high));
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.18);
}

.pa-shell--expanded .pa-base {
  margin-top: -1px;
  border-radius: 0 0 24px 24px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.2);
}

.pa-base-chip,
.pa-base-icon,
.pa-rail-chip,
.pa-mode-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  background: rgb(var(--v-theme-surface-container-highest));
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
}

.pa-base-chip,
.pa-rail-chip,
.pa-mode-chip {
  padding: 0 14px;
  border-radius: 999px;
}

.pa-base-chip {
  max-width: 132px;
}

.pa-base-chip--compact {
  max-width: 44px;
  padding-inline: 0;
}

.pa-base-chip--compact .pa-base-chip__label {
  display: none;
}

.pa-base-chip__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
}

.pa-base-chip--active,
.pa-rail-chip--active,
.pa-mode-chip--active {
  border-color: rgba(var(--v-theme-primary), 0.52);
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
}

.pa-base-icon {
  width: 42px;
  padding: 0;
  border-radius: 999px;
}

.pa-base__rail {
  width: 100%;
  min-width: 0;
}

.pa-base__scroll {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.pa-base__scroll::-webkit-scrollbar {
  display: none;
}

.pa-rail-chip {
  flex: 0 0 auto;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
}

.pa-rail-chip--ghost {
  background: transparent;
}

.pa-rail-chip--pending {
  opacity: 0.68;
}

.pa-rail-chip__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  min-height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  font-size: 11px;
  line-height: 1;
}

.pa-base__empty {
  display: inline-flex;
  align-items: center;
  min-height: 42px;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 12px;
  white-space: nowrap;
}

.pa-range-row {
  display: grid;
  gap: 10px;
}

.pa-sprint-list {
  display: grid;
  gap: 10px;
}

.pa-subject-list {
  display: grid;
  gap: 10px;
}

.pa-subject-card,
.pa-subject-context {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.pa-subject-card--active,
.pa-subject-context {
  border-color: rgba(var(--v-theme-primary), 0.28);
  background: rgba(var(--v-theme-primary), 0.08);
}

.pa-subject-card__head,
.pa-subject-context__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pa-subject-card__title-wrap {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.pa-subject-card__title,
.pa-subject-context__title {
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.pa-subject-card__meta,
.pa-subject-card__fabula,
.pa-subject-context__meta {
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-subject-card__fabula {
  margin: 0;
}

.pa-subject-card__badge,
.pa-subject-context__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.pa-subject-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pa-sprint-card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.pa-sprint-card__head,
.pa-sprint-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pa-sprint-card__title {
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.pa-sprint-card__status,
.pa-sprint-card__meta,
.pa-sprint-card__foot {
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-sprint-card__goal {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface));
}

.pa-sprint-card--active {
  border-color: rgba(var(--v-theme-primary), 0.26);
  background: rgba(var(--v-theme-primary), 0.08);
}

.pa-sprint-card--review {
  border-color: rgba(var(--v-theme-error), 0.24);
  background: rgba(var(--v-theme-error), 0.06);
}

.pa-sprint-card--done {
  border-color: rgba(var(--v-theme-secondary), 0.24);
  background: rgba(var(--v-theme-secondary), 0.08);
}

.pa-search-field {
  margin: 0;
}

.pa-project-list {
  display: grid;
  gap: 8px;
}

.pa-project-card {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.04);
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  text-align: left;
}

.pa-project-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pa-project-card__title {
  font-size: 13px;
  font-weight: 700;
}

.pa-project-card__meta {
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-project-card__badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pa-project-card--active {
  border-color: rgba(var(--v-theme-primary), 0.28);
  background: rgba(var(--v-theme-primary), 0.08);
}

.pa-scope-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pa-scope-hero__status,
.pa-scope-hero__revision,
.pa-scope-item__meta {
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-scope-hero__status {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.pa-scope-cluster {
  display: grid;
  gap: 10px;
}

.pa-scope-cluster__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pa-scope-list {
  display: grid;
  gap: 8px;
}

.pa-scope-item {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.pa-scope-item__head,
.pa-scope-item__controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pa-scope-item__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pa-scope-item__badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pa-scope-item__title {
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.pa-scope-manage-grid,
.pa-scope-setting-grid {
  display: grid;
  gap: 10px;
}

.pa-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pa-field-block {
  display: grid;
  gap: 10px;
}

.pa-field-block--full {
  grid-column: 1 / -1;
}

.pa-mode-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pa-empty-state,
.pa-state {
  font-size: 13px;
  line-height: 1.5;
}

.pa-state--muted,
.pa-empty-state {
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-state--error {
  color: rgb(var(--v-theme-error));
}

.pa-expand-enter-active,
.pa-expand-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
  transform-origin: center bottom;
}

.pa-expand-enter-from,
.pa-expand-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@container project-actions (max-width: 479px) {
  .pa-base {
    gap: 6px;
    padding: 6px;
    min-height: 54px;
  }

  .pa-base-chip:first-child {
    max-width: 112px;
  }

  .pa-base-chip,
  .pa-base-icon,
  .pa-rail-chip,
  .pa-mode-chip {
    min-height: 40px;
  }

  .pa-base-chip,
  .pa-rail-chip,
  .pa-mode-chip {
    padding-inline: 12px;
  }

  .pa-base-icon {
    width: 40px;
  }

  .pa-form-grid,
  .pa-range-row {
    grid-template-columns: 1fr;
  }

  .pa-expand__footer {
    flex-direction: column-reverse;
  }

  .pa-expand__footer :deep(.v-btn) {
    width: 100%;
  }
}

@container project-actions (min-width: 480px) {
  .pa-base-chip--compact {
    max-width: 132px;
    padding-inline: 14px;
  }

  .pa-base-chip--compact .pa-base-chip__label {
    display: inline;
  }
}

@container project-actions (min-width: 640px) {
  .pa-base {
    gap: 10px;
    padding: 10px;
  }

  .pa-base-chip {
    max-width: 176px;
  }

  .pa-range-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }
}

@container project-actions (min-width: 900px) {
  .pa-expand {
    max-height: min(72vh, 760px);
    padding: 14px;
    gap: 12px;
  }

  .pa-base-chip {
    max-width: 220px;
  }

  .pa-base__scroll {
    gap: 10px;
  }
}
</style>
