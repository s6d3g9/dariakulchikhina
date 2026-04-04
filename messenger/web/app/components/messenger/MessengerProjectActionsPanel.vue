<script setup lang="ts">
import type {
  MessengerPlatformActionCatalog,
  MessengerPlatformProjectSummary,
  ProjectActionCategoryGroup,
  ProjectActionDefinition,
  ProjectActionExecutePayload,
  ProjectActionId,
} from '../../composables/useMessengerProjectActions'

const props = defineProps<{
  open: boolean
  groups: ProjectActionCategoryGroup[]
  pendingAction: ProjectActionId | null
  projects: MessengerPlatformProjectSummary[]
  projectsPending: boolean
  projectsError: string
  selectedProjectSlug: string
  selectedActionId: ProjectActionId | null
  catalog: MessengerPlatformActionCatalog | null
  catalogPending: boolean
  catalogError: string
}>()

const emit = defineEmits<{
  close: []
  execute: [actionId: ProjectActionId, payload?: ProjectActionExecutePayload]
  selectProject: [slug: string]
  selectAction: [actionId: ProjectActionId | null]
}>()

const manualProjectSlug = ref('')
const projectPickerOpen = ref(false)
const searchPanelOpen = ref(false)
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
const showProjectPane = computed(() => projectPickerOpen.value)
const showSearchPane = computed(() => searchPanelOpen.value)
const showExpansion = computed(() => {
  return showProjectPane.value || showSearchPane.value || Boolean(currentAction.value) || Boolean(formError.value)
})

const projectModel = computed({
  get: () => props.selectedProjectSlug,
  set: (value: string | null) => emit('selectProject', value || ''),
})

const projectItems = computed(() => props.projects.map(project => ({
  title: project.title,
  value: project.slug,
  subtitle: [project.status, project.activePhaseTitle].filter(Boolean).join(' · '),
})))

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
  const parentGroup = props.groups.find(group => group.actions.some(candidate => candidate.id === action.id))
  if (parentGroup) {
    selectedCategory.value = parentGroup.category
  }

  searchPanelOpen.value = false

  emit('selectAction', props.selectedActionId === action.id ? null : action.id)
}

function clearCategorySelection() {
  selectedCategory.value = ''
  formError.value = ''
  emit('selectAction', null)
}

function selectCategory(category: ProjectActionCategoryGroup['category']) {
  if (selectedCategory.value === category) {
    clearCategorySelection()
    return
  }

  selectedCategory.value = category
  formError.value = ''
  searchPanelOpen.value = false

  const nextGroup = props.groups.find(group => group.category === category)
  if (props.selectedActionId && nextGroup && !nextGroup.actions.some(action => action.id === props.selectedActionId)) {
    emit('selectAction', null)
  }
}

function toggleProjectPane() {
  projectPickerOpen.value = !projectPickerOpen.value

  if (projectPickerOpen.value) {
    searchPanelOpen.value = false
  }
}

function toggleSearchPane() {
  searchPanelOpen.value = !searchPanelOpen.value

  if (searchPanelOpen.value) {
    projectPickerOpen.value = false
  }
}

function applyManualProjectSlug() {
  emit('selectProject', manualProjectSlug.value.trim())
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

watch(() => props.selectedProjectSlug, (value) => {
  manualProjectSlug.value = value
  resetFormState()
  primeDefaults()
})

watch(currentAction, (action) => {
  resetFormState()
  if (!action) {
    return
  }

  searchPanelOpen.value = false

  const parentGroup = props.groups.find(group => group.actions.some(candidate => candidate.id === action.id))
  if (parentGroup) {
    selectedCategory.value = parentGroup.category
  }

  if (action.id === 'update_work_status') {
    taskMode.value = 'existing'
  }

  primeDefaults()
}, { immediate: true })

watch(() => props.catalog, () => {
  primeDefaults()
}, { immediate: true })

watch(() => props.open, (open) => {
  if (open) {
    return
  }

  projectPickerOpen.value = false
  searchPanelOpen.value = false
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
        <section v-if="showProjectPane" class="pa-pane pa-pane--project">
          <div class="pa-pane__head">
            <span class="pa-pane__title">Проект</span>
            <span class="pa-pane__value">{{ selectedProjectLabel }}</span>
          </div>

          <VAutocomplete
            v-model="projectModel"
            :items="projectItems"
            item-title="title"
            item-value="value"
            variant="outlined"
            density="comfortable"
            label="Проект платформы"
            placeholder="Начните вводить название проекта"
            clearable
            hide-details
            :loading="props.projectsPending"
          />

          <div class="pa-project-manual">
            <VTextField
              v-model="manualProjectSlug"
              variant="outlined"
              density="comfortable"
              label="Slug проекта"
              placeholder="project-slug"
              hide-details
            />
            <VBtn color="primary" variant="tonal" @click="applyManualProjectSlug">Открыть</VBtn>
          </div>

          <p v-if="props.projectsError" class="pa-state pa-state--error">{{ props.projectsError }}</p>
          <p v-else-if="props.catalogError" class="pa-state pa-state--error">{{ props.catalogError }}</p>
          <p v-else-if="props.catalogPending" class="pa-state pa-state--muted">Загружаю каталог проекта…</p>
        </section>

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

        <section v-if="currentAction" class="pa-pane pa-pane--builder">
          <div class="pa-pane__head">
            <span class="pa-pane__title">{{ currentAction.label }}</span>
            <span class="pa-pane__value">{{ currentAction.description }}</span>
          </div>

          <div v-if="!props.selectedProjectSlug" class="pa-empty-state">
            Сначала выберите проект.
          </div>

          <div v-else-if="props.catalogPending" class="pa-empty-state">
            Подготавливаю каталог проекта…
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

          <template v-else-if="!selectedCategoryGroup && filteredCategoryGroups.length">
            <button
              v-for="group in filteredCategoryGroups"
              :key="group.category"
              type="button"
              class="pa-rail-chip"
              :class="{ 'pa-rail-chip--active': selectedCategory === group.category }"
              :disabled="Boolean(props.pendingAction)"
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
  display: flex;
  flex-direction: column;
  align-items: stretch;
  container-type: inline-size;
  container-name: project-actions;
}

.pa-expand {
  display: grid;
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
  min-width: 0;
}

.pa-base__scroll {
  display: flex;
  align-items: center;
  gap: 8px;
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

.pa-project-manual,
.pa-range-row {
  display: grid;
  gap: 10px;
}

.pa-search-field {
  margin: 0;
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
  .pa-project-manual,
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

  .pa-project-manual,
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
