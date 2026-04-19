<script setup lang="ts">
import type {
  MessengerPlatformActionCatalog,
  MessengerPlatformProjectSummary,
  MessengerPlatformSubjectOption,
  ProjectActionDefinition,
  ProjectActionExecutePayload,
  ProjectActionId,
} from '../../model/useMessengerProjectActions'

const props = defineProps<{
  currentAction: ProjectActionDefinition
  activeSubjectContext: MessengerPlatformSubjectOption | null
  selectedProjectSlug: string
  catalogPending: boolean
  catalogUnavailableMessage: string
  catalog: MessengerPlatformActionCatalog | null
  pendingAction: ProjectActionId | null
  projects: MessengerPlatformProjectSummary[]
  initialSubjectId: string
}>()

const emit = defineEmits<{
  close: []
  submit: [actionId: ProjectActionId, payload: ProjectActionExecutePayload]
}>()

// --- Internal form state ---
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

// --- Internal constants ---
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

// --- Internal computeds ---
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
  if (props.currentAction.id === 'create_invoice') {
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

const usesTaskSelection = computed(() => taskActionIds.has(props.currentAction.id))
const usesStageSelection = computed(() => stageActionIds.has(props.currentAction.id))
const usesDocumentSelection = computed(() => documentActionIds.has(props.currentAction.id))
const usesFinanceSelection = computed(() => financeActionIds.has(props.currentAction.id))
const usesSubjectSelection = computed(() => subjectActionIds.has(props.currentAction.id))
const usesObjectSelection = computed(() => objectActionIds.has(props.currentAction.id))
const usesRangeSelection = computed(() => taskActionIds.has(props.currentAction.id) || stageActionIds.has(props.currentAction.id))
const usesTaskStatusSelection = computed(() => props.currentAction.id === 'update_work_status')
const isDirectMutationAction = computed(() => directMutationActionIds.has(props.currentAction.id))

const selectedTaskStatusItems = computed(() => {
  return selectedTask.value?.source === 'hybrid'
    ? hybridTaskStatusItems
    : workTaskStatusItems
})

const selectedTaskStatusLabel = computed(() => {
  return selectedTaskStatusItems.value.find(option => option.value === selectedTaskStatus.value)?.title || ''
})

const canSubmit = computed(() => {
  if (!props.selectedProjectSlug || props.catalogPending || Boolean(props.pendingAction)) {
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

  if (props.currentAction.id === 'create_invoice') {
    return serviceItems.value.some(service => service.id === selectedServiceId.value)
  }

  return true
})

const submitLabel = computed(() => {
  return isDirectMutationAction.value ? 'Выполнить и добавить в чат' : 'Добавить в чат'
})

// --- Internal functions ---
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

  if (props.currentAction.id === 'update_work_status') {
    taskMode.value = 'existing'
  }

  if (props.currentAction.id === 'create_invoice' && !selectedServiceId.value && serviceItems.value.length) {
    selectedServiceId.value = serviceItems.value[0]?.id || ''
  }
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

  if (props.currentAction.id === 'create_invoice' && !selectedServiceId.value) {
    formError.value = 'Выберите доп. услугу для счёта.'
    return
  }

  emit('submit', props.currentAction.id, buildExecutePayload())
}

// --- Watches ---

// Reset + prime when action changes
watch(() => props.currentAction, () => {
  resetFormState()
  if (props.currentAction.id === 'update_work_status') taskMode.value = 'existing'
  if (props.initialSubjectId && subjectItems.value.some(s => s.id === props.initialSubjectId)) {
    selectedSubjectId.value = props.initialSubjectId
  }

  primeDefaults()
}, { immediate: true })

// Sync initialSubjectId when it changes from parent
watch(() => props.initialSubjectId, (id) => {
  if (id && subjectItems.value.some(s => s.id === id)) selectedSubjectId.value = id
})

// Re-prime when catalog loads
watch(() => props.catalog, () => { primeDefaults() })

// Auto-select first service for invoice
watch(serviceItems, (items) => {
  if (selectedServiceId.value && !items.some(s => s.id === selectedServiceId.value)) selectedServiceId.value = ''
  if (props.currentAction.id === 'create_invoice' && !selectedServiceId.value && items.length)
    selectedServiceId.value = items[0]?.id || ''
}, { immediate: true })

// Fill phase/sprint/range from selected task
watch(selectedTask, (task) => {
  if (!task || taskMode.value !== 'existing') return
  if (!selectedPhaseKey.value && task.phaseKey) selectedPhaseKey.value = task.phaseKey
  if (!selectedSprintId.value && task.sprintId) selectedSprintId.value = task.sprintId
  if (!rangeStart.value && task.rangeStart) rangeStart.value = task.rangeStart
  if (!rangeEnd.value && task.rangeEnd) rangeEnd.value = task.rangeEnd
  if (usesTaskStatusSelection.value) selectedTaskStatus.value = resolveNextTaskStatus()
})

// Reset form on project switch
watch(() => props.selectedProjectSlug, () => { resetFormState() })
</script>

<template>
  <section class="pa-pane pa-pane--builder">
    <div class="pa-pane__head">
      <span class="pa-pane__title">{{ props.currentAction.label }}</span>
      <span class="pa-pane__value">{{ props.currentAction.description }}</span>
    </div>

    <div v-if="props.activeSubjectContext" class="pa-subject-context">
      <div class="pa-subject-context__head">
        <span class="pa-subject-context__title">{{ props.activeSubjectContext.label }}</span>
        <span class="pa-subject-context__badge">Субъектный контур</span>
      </div>
      <span class="pa-subject-context__meta">{{ props.activeSubjectContext.secondary || 'Действие будет собрано в контексте этого субъекта.' }}</span>
    </div>

    <div v-if="!props.selectedProjectSlug" class="pa-empty-state">
      Сначала выберите проект.
    </div>

    <div v-else-if="props.catalogPending" class="pa-empty-state">
      Подготавливаю каталог проекта…
    </div>

    <div v-else-if="props.catalogUnavailableMessage" class="pa-state pa-state--error">
      {{ props.catalogUnavailableMessage }}
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

  <div class="pa-expand__footer">
    <VBtn variant="text" @click="emit('close')">Закрыть</VBtn>
    <VBtn color="primary" variant="flat" :disabled="!canSubmit" @click="submitAction">{{ submitLabel }}</VBtn>
  </div>
</template>

<style scoped>
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

.pa-subject-context {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(var(--v-theme-primary), 0.28);
  background: rgba(var(--v-theme-primary), 0.08);
}

.pa-subject-context__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.pa-subject-context__title {
  font-size: 13px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.pa-subject-context__meta {
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

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
  padding: 0 14px;
  border-radius: 999px;
}

.pa-mode-chip--active {
  border-color: rgba(var(--v-theme-primary), 0.52);
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
}

.pa-range-row {
  display: grid;
  gap: 10px;
}

.pa-empty-state,
.pa-state {
  font-size: 13px;
  line-height: 1.5;
}

.pa-empty-state {
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-state--error {
  color: rgb(var(--v-theme-error));
}

.pa-expand__footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

@container project-actions (max-width: 479px) {
  .pa-mode-chip {
    min-height: 40px;
    padding-inline: 12px;
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

@container project-actions (min-width: 640px) {
  .pa-range-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }
}
</style>
