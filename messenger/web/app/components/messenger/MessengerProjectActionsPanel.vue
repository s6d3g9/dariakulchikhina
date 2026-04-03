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

const allActions = computed(() => props.groups.flatMap(group => group.actions))
const currentAction = computed(() => allActions.value.find(action => action.id === props.selectedActionId) || null)

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
  emit('selectAction', props.selectedActionId === action.id ? null : action.id)
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

  if (action.id === 'update_work_status') {
    taskMode.value = 'existing'
  }

  primeDefaults()
}, { immediate: true })

watch(() => props.catalog, () => {
  primeDefaults()
}, { immediate: true })

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
  <Teleport to="body">
    <Transition name="pa-overlay">
      <div v-if="props.open" class="pa-overlay" @click.self="emit('close')" />
    </Transition>

    <Transition name="pa-panel">
      <div v-if="props.open" class="pa-panel">
        <div class="pa-panel__header">
          <div>
            <span class="pa-panel__title">Действия проекта</span>
            <p class="pa-panel__subtitle">Выбор задач, этапов, документов и проектного контекста прямо из платформы.</p>
          </div>
          <VBtn icon variant="text" size="small" aria-label="Закрыть" @click="emit('close')">
            <VIcon icon="mdi-close" size="18" />
          </VBtn>
        </div>

        <div class="pa-panel__body">
          <section class="pa-section pa-section--project">
            <div class="pa-section__head">
              <span class="pa-section__title">Проект</span>
              <span class="pa-section__meta">Источник данных для задач, этапов и документов</span>
            </div>

            <VAutocomplete
              v-model="projectModel"
              :items="projectItems"
              item-title="title"
              item-value="value"
              variant="outlined"
              density="comfortable"
              label="Выберите проект платформы"
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
                label="Или введите slug вручную"
                placeholder="project-slug"
                hide-details
              />
              <VBtn color="primary" variant="tonal" @click="applyManualProjectSlug">Открыть</VBtn>
            </div>

            <p v-if="props.projectsError" class="pa-state pa-state--error">{{ props.projectsError }}</p>
            <p v-else-if="props.catalogError" class="pa-state pa-state--error">{{ props.catalogError }}</p>
            <p v-else-if="props.catalogPending" class="pa-state pa-state--muted">Загружаю задачи, этапы, документы и связи проекта…</p>
          </section>

          <section v-if="props.catalog" class="pa-section pa-section--summary">
            <div class="pa-summary-grid">
              <article class="pa-summary-card">
                <span class="pa-summary-card__label">Активная фаза</span>
                <strong class="pa-summary-card__value">{{ props.catalog.project.activePhaseTitle || 'Не выбрана' }}</strong>
              </article>
              <article class="pa-summary-card">
                <span class="pa-summary-card__label">Активный спринт</span>
                <strong class="pa-summary-card__value">{{ props.catalog.project.activeSprintName || 'Нет активного' }}</strong>
              </article>
              <article class="pa-summary-card">
                <span class="pa-summary-card__label">Задачи</span>
                <strong class="pa-summary-card__value">{{ props.catalog.project.taskTotal }}</strong>
              </article>
              <article class="pa-summary-card">
                <span class="pa-summary-card__label">Документы</span>
                <strong class="pa-summary-card__value">{{ props.catalog.project.documentCount }}</strong>
              </article>
            </div>

            <div v-if="catalogRecommendations.length" class="pa-recommendations">
              <div class="pa-section__head pa-section__head--compact">
                <span class="pa-section__title">Подсказки координации</span>
              </div>
              <article v-for="recommendation in catalogRecommendations" :key="recommendation.id" class="pa-recommendation">
                <strong>{{ recommendation.title }}</strong>
                <p>{{ recommendation.reason }}</p>
              </article>
            </div>
          </section>

          <section class="pa-section pa-section--actions">
            <div class="pa-section__head">
              <span class="pa-section__title">Тип действия</span>
              <span class="pa-section__meta">Не команда, а структурированный сценарий с выбором сущностей</span>
            </div>

            <div v-for="group in props.groups" :key="group.category" class="pa-group">
              <div class="pa-group__header">
                <VIcon :icon="group.icon" size="14" class="pa-group__icon" />
                <span class="pa-group__label">{{ group.label }}</span>
              </div>
              <div class="pa-group__actions">
                <button
                  v-for="action in group.actions"
                  :key="action.id"
                  type="button"
                  class="pa-action"
                  :class="{
                    'pa-action--active': props.selectedActionId === action.id,
                    'pa-action--pending': props.pendingAction === action.id,
                  }"
                  :disabled="Boolean(props.pendingAction)"
                  @click="handleActionClick(action)"
                >
                  <VIcon :icon="action.icon" size="20" class="pa-action__icon" />
                  <span class="pa-action__label">{{ action.label }}</span>
                </button>
              </div>
            </div>
          </section>

          <section v-if="currentAction" class="pa-section pa-section--builder">
            <div class="pa-section__head">
              <span class="pa-section__title">Сценарий</span>
              <span class="pa-section__meta">{{ currentAction.description }}</span>
            </div>

            <div v-if="!props.selectedProjectSlug" class="pa-empty-state">
              Сначала выберите проект, чтобы открыть реальные задачи, этапы и документы платформы.
            </div>

            <div v-else-if="props.catalogPending" class="pa-empty-state">
              Подготавливаю каталог проекта…
            </div>

            <div v-else-if="props.catalog" class="pa-form-grid">
              <div v-if="usesTaskSelection" class="pa-field-block pa-field-block--full">
                <div class="pa-field-block__head">
                  <span class="pa-field-block__title">Задача</span>
                  <span class="pa-field-block__hint">Можно выбрать существующую или собрать новую.</span>
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
                  label="Выберите задачу"
                  clearable
                  hide-details
                />

                <VTextField
                  v-else
                  v-model="taskTitle"
                  variant="outlined"
                  density="comfortable"
                  label="Название новой задачи"
                  placeholder="Например: Согласовать акт по этапу"
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
                  label="Новый статус задачи"
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
                label="Объект / контекст"
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
                label="Документ из библиотеки"
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
                label="Услуга / финансовый объект"
                clearable
                hide-details
              />

              <div v-if="usesRangeSelection" class="pa-range-row pa-field-block--full">
                <VTextField
                  v-model="rangeStart"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                  label="Начало диапазона"
                  hide-details
                />
                <VTextField
                  v-model="rangeEnd"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                  label="Конец диапазона"
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
                label="Комментарий или уточнение"
                placeholder="Например: привязать к подписанию акта и отправить подрядчику"
                hide-details
              />
            </div>
          </section>

          <p v-if="formError" class="pa-state pa-state--error">{{ formError }}</p>
        </div>

        <div class="pa-panel__footer">
          <VBtn variant="text" @click="emit('close')">Закрыть</VBtn>
          <VBtn color="primary" variant="flat" :disabled="!canSubmit" @click="submitAction">{{ submitLabel }}</VBtn>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pa-overlay {
  position: fixed;
  inset: 0;
  z-index: 199;
  background: rgba(0, 0, 0, 0.34);
}

.pa-panel {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 200;
  max-height: min(88vh, 980px);
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-surface-container));
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.pa-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 16px 10px;
  flex-shrink: 0;
}

.pa-panel__title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.pa-panel__subtitle {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-panel__body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 14px 18px;
}

.pa-panel__footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgb(var(--v-theme-surface-container-high));
  flex-shrink: 0;
}

.pa-section {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px;
  border-radius: 18px;
  background: rgb(var(--v-theme-surface-container-high));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.pa-section__head {
  display: grid;
  gap: 2px;
}

.pa-section__head--compact {
  gap: 0;
}

.pa-section__title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-surface));
}

.pa-section__meta {
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-project-manual,
.pa-range-row {
  display: grid;
  gap: 10px;
}

.pa-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pa-summary-card {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 14px;
  background: rgb(var(--v-theme-surface-container-highest));
}

.pa-summary-card__label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-summary-card__value {
  font-size: 14px;
  line-height: 1.35;
  color: rgb(var(--v-theme-on-surface));
}

.pa-recommendations {
  display: grid;
  gap: 8px;
}

.pa-recommendation {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(var(--v-theme-primary), 0.08);
}

.pa-recommendation strong {
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface));
}

.pa-recommendation p {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-group {
  display: grid;
  gap: 8px;
}

.pa-group__header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pa-group__icon {
  opacity: 0.56;
}

.pa-group__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pa-group__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pa-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgb(var(--v-theme-surface-container-highest));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface));
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.pa-action:hover:not(:disabled) {
  border-color: rgba(var(--v-theme-primary), 0.32);
}

.pa-action:active:not(:disabled) {
  transform: scale(0.98);
}

.pa-action:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}

.pa-action--active {
  border-color: rgba(var(--v-theme-primary), 0.52);
  background: rgba(var(--v-theme-primary), 0.14);
}

.pa-action__icon {
  color: rgb(var(--v-theme-primary));
}

.pa-action--pending {
  opacity: 0.68;
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

.pa-field-block__head {
  display: grid;
  gap: 2px;
}

.pa-field-block__title {
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.pa-field-block__hint {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
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
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
}

.pa-mode-chip--active {
  border-color: rgba(var(--v-theme-primary), 0.52);
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
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

.pa-overlay-enter-active,
.pa-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.pa-overlay-enter-from,
.pa-overlay-leave-to {
  opacity: 0;
}

.pa-panel-enter-active,
.pa-panel-leave-active {
  transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}

.pa-panel-enter-from,
.pa-panel-leave-to {
  transform: translateY(100%);
}

@media (min-width: 860px) {
  .pa-panel {
    left: 50%;
    right: auto;
    width: min(920px, calc(100vw - 40px));
    transform: translateX(-50%);
    border-radius: 24px;
    bottom: 20px;
  }

  .pa-panel-enter-from,
  .pa-panel-leave-to {
    transform: translateX(-50%) translateY(40px);
  }

  .pa-project-manual,
  .pa-range-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }
}

@media (max-width: 699px) {
  .pa-form-grid,
  .pa-summary-grid {
    grid-template-columns: 1fr;
  }

  .pa-panel__footer {
    flex-direction: column-reverse;
  }

  .pa-panel__footer :deep(.v-btn) {
    width: 100%;
  }
}
</style>
