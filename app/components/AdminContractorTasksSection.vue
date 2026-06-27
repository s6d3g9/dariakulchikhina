<template>
  <div class="cab-section" data-section="tasks">
    <CabSectionHeader
      title="Задачи"
      eyebrow="contractor"
      :brutalist="isBrutalist"
      note="Статусы меняются сразу, а даты и заметки внутри карточки сохраняются автоматически."
    >
      <template #actions>
        <button class="cab-add-task-btn" @click="openNewTaskModal">＋ Добавить задачу</button>
      </template>
    </CabSectionHeader>

    <div class="cab-add-task-row" :class="{ 'cab-add-task-row--brutalist': isBrutalist }">
      <div class="cab-add-task-row__hint">[ TASK FLOW ]</div>
    </div>

    <div v-if="showNewTaskModalModel" class="u-modal glass-surface" :class="{ 'u-modal--brutalist-task': isBrutalist }">
      <div class="u-modal__head">
        <span class="u-modal__title">Новая задача</span>
        <button class="u-modal__close" @click="showNewTaskModalModel = false">✕</button>
      </div>
      <div class="u-modal__body">
        <div v-if="contractor?.contractorType === 'company' && staff?.length" class="u-field">
          <label class="u-field__label">Мастер</label>
          <select v-model="newTask.masterContractorId" class="glass-input">
            <option :value="null">— сам подрядчик —</option>
            <option v-for="member in staff" :key="member.id" :value="member.id">{{ member.name }}</option>
          </select>
        </div>
        <div class="u-field">
          <label class="u-field__label">Проект *</label>
          <select v-model="newTask.projectSlug" class="glass-input">
            <option value="" disabled>— выберите проект —</option>
            <option v-for="project in allProjects" :key="project.slug" :value="project.slug">{{ project.title }}</option>
          </select>
        </div>
        <div class="u-field">
          <label class="u-field__label">Название задачи *</label>
          <GlassInput v-model="newTask.title" placeholder="Что нужно сделать…" />
        </div>
        <div class="u-field">
          <label class="u-field__label">Вид работ</label>
          <select v-model="newTask.workType" class="glass-input">
            <option value="">— не указан —</option>
            <option v-for="workType in contractorWorkTypeOptions" :key="workType.value" :value="workType.value">{{ workType.label }}</option>
          </select>
        </div>
        <div class="u-modal__row2">
          <div class="u-field">
            <label class="u-field__label">Дата начала</label>
            <GlassInput v-model="newTask.dateStart" placeholder="дд.мм.гггг" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Дата окончания</label>
            <GlassInput v-model="newTask.dateEnd" placeholder="дд.мм.гггг" />
          </div>
        </div>
        <div class="u-field">
          <label class="u-field__label">Бюджет</label>
          <GlassInput v-model="newTask.budget" placeholder="например: 50 000 ₽" />
        </div>
        <div class="u-field">
          <label class="u-field__label">Примечание</label>
          <textarea v-model="newTask.notes" class="glass-input u-ta" rows="3" placeholder="Уточнения, материалы, особые требования…" />
        </div>
      </div>
      <div class="u-modal__foot">
        <button
          class="cab-task-save"
          :disabled="creatingTask || !newTask.projectSlug || !newTask.title.trim()"
          @click="createTask"
        >{{ creatingTask ? 'Создание…' : 'Создать задачу' }}</button>
        <button class="cab-task-cancel" @click="showNewTaskModalModel = false">Отмена</button>
      </div>
    </div>

    <div v-if="workItems?.length" class="cab-filters" :class="{ 'cab-filters--brutalist': isBrutalist }">
      <button
        v-for="filter in filters"
        :key="filter.value"
        class="cab-filter-btn"
        :class="{ active: statusFilterModel === filter.value }"
        @click="statusFilterModel = filter.value"
      >
        {{ filter.label }}
        <span v-if="filter.count" class="cab-filter-count">{{ filter.count }}</span>
      </button>
    </div>

    <div v-if="!workItems?.length" class="u-empty glass-surface">
      <span>◎</span>
      <p>Задач пока нет.<br>Они появятся когда дизайнер добавит вас к проекту.</p>
    </div>
    <div v-else-if="!byProject.length" class="u-empty glass-surface">
      <span>◉</span>
      <p>Нет задач с выбранным фильтром.</p>
    </div>
    <template v-else>
      <div v-for="project in byProject" :key="project.slug" class="cab-project-group" :class="{ 'cab-project-group--brutalist': isBrutalist }">
        <div class="cab-proj-header">
          <span class="cab-proj-title">{{ project.title }}</span>
          <span class="cab-proj-stats">{{ project.doneCount }} / {{ project.totalCount }}</span>
        </div>
        <div class="cab-proj-progress">
          <div class="cab-proj-progress-bar" :style="{ width: project.totalCount ? (project.doneCount / project.totalCount * 100) + '%' : '0%' }" />
        </div>

        <div v-for="wtGroup in project.wtGroups" :key="wtGroup.workType" class="cab-wt-group">
          <button class="cab-wt-head" @click="toggleWtGroup(project.slug, wtGroup.workType)">
            <span class="cab-wt-icon">{{ isWtGroupOpen(project.slug, wtGroup.workType) ? '▾' : '▸' }}</span>
            <span class="cab-wt-name">{{ wtGroup.label }}</span>
            <span class="cab-wt-count">{{ wtGroup.items.length }} зад.</span>
            <span v-if="wtGroup.stages.length" class="cab-wt-prog">
              {{ stagesPct(project.slug, wtGroup.workType, wtGroup.stages.length) }}% этапов
            </span>
          </button>

          <div v-if="isWtGroupOpen(project.slug, wtGroup.workType)" class="cab-wt-body">
            <div class="cab-tasks">
              <div
                v-for="item in wtGroup.items"
                :key="item.id"
                class="cab-task glass-surface"
                :class="{ expanded: expandedIdModel === item.id, 'cab-task--brutalist': isBrutalist }"
              >
                <div class="cab-task-top" @click="toggleExpand(item.id)">
                  <span class="cab-task-expand-icon">{{ expandedIdModel === item.id ? '▾' : '▸' }}</span>
                  <span class="cab-task-name">{{ item.title }}</span>
                  <span v-if="item.assignedToName" class="cab-task-assigned-badge">→ {{ item.assignedToName }}</span>
                  <select
                    :value="item.status"
                    class="u-status-sel"
                    :class="`cab-status--${item.status}`"
                    @click.stop
                    @change="updateStatus(item, ($event.target as HTMLSelectElement).value)"
                  >
                    <option v-for="status in statuses" :key="status.value" :value="status.value">{{ status.label }}</option>
                  </select>
                </div>

                <template v-if="expandedIdModel !== item.id">
                  <div v-if="item.dateStart || item.dateEnd || item.budget" class="cab-task-meta">
                    <span v-if="item.dateStart">с {{ item.dateStart }}</span>
                    <span v-if="item.dateEnd" :class="{ 'cab-task-overdue': isDue(item.dateEnd) && item.status !== 'done' }">по {{ item.dateEnd }}</span>
                    <span v-if="item.budget" class="cab-task-budget">{{ item.budget }}</span>
                  </div>
                  <div class="cab-task-counters">
                    <span v-if="item.photoCount" class="cab-task-counter">📷 {{ item.photoCount }}</span>
                    <span v-if="item.commentCount" class="cab-task-counter">💬 {{ item.commentCount }}</span>
                  </div>
                  <div v-if="item.notes" class="cab-task-notes cab-task-notes--preview">{{ item.notes }}</div>
                </template>

                <template v-else>
                  <div class="cab-task-edit">
                    <div class="cab-task-edit-row">
                      <div class="cab-task-edit-field">
                        <label>Дата начала</label>
                        <GlassInput v-model="editMap[item.id].dateStart" class="cab-task-edit-inp" type="text" placeholder="дд.мм.гггг" @blur="queueTaskDetailsSave(item)" @change="queueTaskDetailsSave(item)" />
                      </div>
                      <div class="cab-task-edit-field">
                        <label>Дата окончания</label>
                        <GlassInput v-model="editMap[item.id].dateEnd" class="cab-task-edit-inp" type="text" placeholder="дд.мм.гггг" @blur="queueTaskDetailsSave(item)" @change="queueTaskDetailsSave(item)" />
                      </div>
                      <div v-if="item.budget" class="cab-task-edit-field">
                        <label>Бюджет</label>
                        <span class="cab-task-budget cab-task-budget--lg">{{ item.budget }}</span>
                      </div>
                    </div>

                    <div class="cab-task-edit-field">
                      <label>Заметка для дизайнера</label>
                      <textarea v-model="editMap[item.id].notes" class="glass-input u-ta" rows="3" placeholder="Статус работ, вопросы, уточнения…" @blur="queueTaskDetailsSave(item)" />
                    </div>

                    <div class="cab-task-edit-actions">
                      <CabAutosaveStatus :state="taskSaveStates[item.id] || (savingItem === item.id ? 'saving' : '')" idle-label="[ TASK AUTOSAVE ]" />
                      <button type="button" class="cab-task-cancel" @click.stop="expandedIdModel = null">Отмена</button>
                    </div>
                  </div>
                </template>
              </div>
            </div>

            <div v-if="wtGroup.stages.length" class="cab-stages-inline glass-surface" :class="{ 'cab-stages-inline--brutalist': isBrutalist }">
              <div class="cab-stages-inline-head">
                <span class="cab-stages-inline-title">Технологические этапы</span>
                <span class="cab-stages-inline-pct">{{ stagesPct(project.slug, wtGroup.workType, wtGroup.stages.length) }}%</span>
              </div>
              <div class="cab-stages-inline-bar-wrap">
                <div class="cab-stages-inline-bar" :style="{ width: stagesPct(project.slug, wtGroup.workType, wtGroup.stages.length) + '%' }" />
              </div>
              <div
                v-for="(stage, index) in wtGroup.stages"
                :key="stage.key"
                class="cab-stage-check-row"
                :class="{ done: isStageDone(project.slug, wtGroup.workType, stage.key) }"
                @click="toggleStage(project.slug, wtGroup.workType, stage.key)"
              >
                <span class="cab-stage-check-icon">{{ isStageDone(project.slug, wtGroup.workType, stage.key) ? '✓' : '○' }}</span>
                <span class="cab-stage-num">{{ index + 1 }}</span>
                <span class="cab-stage-label">{{ stage.label }}</span>
                <span v-if="stage.hint" class="cab-stage-hint">{{ stage.hint }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ContractorSummary = {
  contractorType?: string | null
}

type StaffMember = {
  id: number
  name?: string | null
}

type ProjectOption = {
  slug: string
  title: string
}

type WorkTypeOption = {
  value: string
  label: string
}

type FilterOption = {
  value: string
  label: string
  count?: number
}

type TaskStatusOption = {
  value: string
  label: string
}

type WorkStage = {
  key: string
  label: string
  hint?: string | null
}

type WorkItem = {
  id: number
  title?: string | null
  status?: string | null
  assignedToName?: string | null
  dateStart?: string | null
  dateEnd?: string | null
  budget?: string | null
  notes?: string | null
  photoCount?: number | null
  commentCount?: number | null
}

type WorkTypeGroup = {
  workType: string
  label: string
  items: WorkItem[]
  stages: WorkStage[]
}

type ProjectTaskGroup = {
  slug: string
  title: string
  doneCount: number
  totalCount: number
  wtGroups: WorkTypeGroup[]
}

type NewTaskState = {
  masterContractorId: number | null
  projectSlug: string
  title: string
  workType: string
  dateStart: string
  dateEnd: string
  budget: string
  notes: string
}

type EditMap = Record<number, { notes: string; dateStart: string; dateEnd: string }>
type TaskSaveStates = Record<number, string>

const props = defineProps<{
  contractor: ContractorSummary | null
  staff: StaffMember[] | null
  workItems: WorkItem[] | null
  isBrutalist: boolean
  showNewTaskModal: boolean
  newTask: NewTaskState
  creatingTask: boolean
  allProjects: ProjectOption[]
  contractorWorkTypeOptions: WorkTypeOption[]
  filters: FilterOption[]
  statusFilter: string
  byProject: ProjectTaskGroup[]
  expandedId: number | null
  statuses: TaskStatusOption[]
  editMap: EditMap
  taskSaveStates: TaskSaveStates
  savingItem: number | null
  isDue: (dateStr: string | null | undefined) => boolean
  stagesPct: (projectSlug: string, workType: string, total: number) => number
  isWtGroupOpen: (projectSlug: string, workType: string) => boolean
  toggleWtGroup: (projectSlug: string, workType: string) => void
  toggleExpand: (id: number) => void
  updateStatus: (item: WorkItem, status: string) => void | Promise<void>
  queueTaskDetailsSave: (item: WorkItem) => void
  isStageDone: (projectSlug: string, workType: string, stageKey: string) => boolean
  toggleStage: (projectSlug: string, workType: string, stageKey: string) => void
  openNewTaskModal: () => void
  createTask: () => void | Promise<void>
}>()

const emit = defineEmits<{
  'update:showNewTaskModal': [value: boolean]
  'update:statusFilter': [value: string]
  'update:expandedId': [value: number | null]
}>()

const showNewTaskModalModel = computed({
  get: () => props.showNewTaskModal,
  set: (value: boolean) => emit('update:showNewTaskModal', value),
})

const statusFilterModel = computed({
  get: () => props.statusFilter,
  set: (value: string) => emit('update:statusFilter', value),
})

const expandedIdModel = computed({
  get: () => props.expandedId,
  set: (value: number | null) => emit('update:expandedId', value),
})
</script>

<style scoped>
.cab-add-task-row--brutalist {
  padding-bottom: 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  margin-bottom: 14px;
}

.u-modal--brutalist-task {
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.cab-filters--brutalist {
  padding: 10px 0 2px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  margin-bottom: 14px;
}

.cab-project-group--brutalist {
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
  padding: 14px;
}

.cab-task--brutalist,
.cab-stages-inline--brutalist {
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}
</style>