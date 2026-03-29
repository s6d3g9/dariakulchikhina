<template>
  <div class="hpc-root">
    <div v-if="pending" class="ent-content-loading">
      <div v-for="i in 6" :key="i" class="ent-skeleton-line" />
    </div>

    <template v-else>
      <section class="hpc-summary">
        <div class="hpc-summary__head">
          <div>
            <p class="hpc-eyebrow">Контур контроля</p>
            <h2 class="hpc-title">Фазовый каркас и спринтовый ритм исполнения</h2>
          </div>
          <div class="hpc-summary__meta">
            <span class="hpc-pill" :class="`hpc-pill--${summary.health.status}`">{{ summary.health.label }}</span>
            <span v-if="savedAt" class="hpc-saved">обновлено {{ savedAt }}</span>
          </div>
        </div>

        <div class="hpc-metrics">
          <div class="hpc-metric">
            <span class="hpc-metric__label">Фазовый прогресс</span>
            <strong class="hpc-metric__value">{{ summary.phasePercent }}%</strong>
          </div>
          <div class="hpc-metric">
            <span class="hpc-metric__label">Спринтовое исполнение</span>
            <strong class="hpc-metric__value">{{ summary.doneTasks }} / {{ summary.totalTasks }}</strong>
          </div>
          <div class="hpc-metric">
            <span class="hpc-metric__label">Блокеры</span>
            <strong class="hpc-metric__value">{{ summary.blockerCount }}</strong>
          </div>
          <div class="hpc-metric">
            <span class="hpc-metric__label">Следующий обзор</span>
            <strong class="hpc-metric__value">{{ control.nextReviewDate || 'не задан' }}</strong>
          </div>
        </div>
      </section>

      <section class="hpc-section">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Контур</p>
            <h3 class="hpc-section__title">Управление ритмом проекта</h3>
          </div>
        </div>
        <div class="hpc-grid hpc-grid--top">
          <div class="u-field">
            <label class="u-field__label">Ответственный за контроль</label>
            <input v-model="control.manager" class="glass-input" placeholder="Имя или роль" @blur="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Интервал обзора, дней</label>
            <input v-model.number="control.cadenceDays" type="number" min="1" max="90" class="glass-input" @blur="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Следующий контрольный обзор</label>
            <AppDatePicker v-model="control.nextReviewDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Последняя синхронизация</label>
            <AppDatePicker v-model="control.lastSyncAt" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
        </div>
      </section>

      <section class="hpc-section">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Фазовый слой</p>
            <h3 class="hpc-section__title">Базовые этапы и контрольные ворота</h3>
          </div>
        </div>
        <div class="hpc-phase-list">
          <article v-for="phase in control.phases" :key="phase.id" class="hpc-phase-card">
            <div class="hpc-phase-card__head">
              <div>
                <p class="hpc-phase-card__kicker">{{ phase.phaseKey }}</p>
                <h4 class="hpc-phase-card__title">{{ phase.title }}</h4>
              </div>
              <div class="hpc-phase-card__head-right">
                <select v-model="phase.status" class="u-status-sel" @change="save">
                  <option v-for="option in phaseStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <span class="hpc-chip">{{ phase.percent || 0 }}%</span>
              </div>
            </div>

            <div class="hpc-grid">
              <div class="u-field">
                <label class="u-field__label">Ответственный</label>
                <input v-model="phase.owner" class="glass-input" placeholder="Ответственный" @blur="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Прогресс, %</label>
                <input v-model.number="phase.percent" type="number" min="0" max="100" class="glass-input" @blur="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Плановый старт</label>
                <AppDatePicker v-model="phase.startDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Плановый финиш</label>
                <AppDatePicker v-model="phase.endDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Ключевой результат</label>
                <textarea v-model="phase.deliverable" class="glass-input u-ta" rows="2" @blur="save" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Заметка менеджера</label>
                <textarea v-model="phase.notes" class="glass-input u-ta" rows="2" @blur="save" />
              </div>
            </div>

            <div class="hpc-gates">
              <label v-for="gate in phase.gates" :key="gate.id" class="hpc-gate-row">
                <input v-model="gate.done" type="checkbox" @change="save" />
                <span>{{ gate.label }}</span>
              </label>
            </div>
          </article>
        </div>
      </section>

      <section class="hpc-section">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Спринтовый слой</p>
            <h3 class="hpc-section__title">Спринты внутри активных фаз</h3>
          </div>
          <button class="a-btn-sm" type="button" @click="addSprint">+ спринт</button>
        </div>

        <div v-if="control.sprints.length" class="hpc-sprint-list">
          <article v-for="(sprint, sprintIndex) in control.sprints" :key="sprint.id" class="hpc-sprint-card">
            <div class="hpc-sprint-card__head">
              <div class="hpc-grid hpc-grid--top">
                <div class="u-field">
                  <label class="u-field__label">Название спринта</label>
                  <input v-model="sprint.name" class="glass-input" @blur="save" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Привязка к фазе</label>
                  <select v-model="sprint.linkedPhaseKey" class="u-status-sel" @change="save">
                    <option v-for="phase in control.phases" :key="phase.phaseKey" :value="phase.phaseKey">{{ phase.title }}</option>
                  </select>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Статус</label>
                  <select v-model="sprint.status" class="u-status-sel" @change="save">
                    <option v-for="option in sprintStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Удалить спринт</label>
                  <button class="a-btn-sm a-btn-danger" type="button" @click="removeSprint(sprintIndex)">удалить</button>
                </div>
              </div>
            </div>

            <div class="hpc-grid">
              <div class="u-field u-field--full">
                <label class="u-field__label">Цель спринта</label>
                <textarea v-model="sprint.goal" class="glass-input u-ta" rows="2" @blur="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Старт</label>
                <AppDatePicker v-model="sprint.startDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Финиш</label>
                <AppDatePicker v-model="sprint.endDate" model-type="iso" input-class="glass-input" @update:model-value="save" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Фокус команды</label>
                <textarea v-model="sprint.focus" class="glass-input u-ta" rows="2" @blur="save" />
              </div>
            </div>

            <div class="hpc-task-head">
              <span class="hpc-task-head__title">Бэклог поставки</span>
              <button class="a-btn-sm" type="button" @click="addTask(sprint)">+ задача</button>
            </div>

            <div v-if="sprint.tasks.length" class="hpc-task-list">
              <div v-for="(task, taskIndex) in sprint.tasks" :key="task.id" class="hpc-task-row">
                <button class="hpc-task-state" type="button" @click="cycleTask(task)">{{ taskStatusLabels[task.status] }}</button>
                <input v-model="task.title" class="glass-input hpc-task-row__title" placeholder="Что должно быть доставлено" @blur="save" />
                <input v-model.number="task.points" type="number" min="0" max="100" class="glass-input hpc-task-row__points" @blur="save" />
                <input v-model="task.assignee" class="glass-input hpc-task-row__assignee" placeholder="Исполнитель" @blur="save" />
                <AppDatePicker v-model="task.dueDate" model-type="iso" input-class="glass-input hpc-task-row__date" @update:model-value="save" />
                <button class="a-btn-sm a-btn-danger" type="button" @click="removeTask(sprint, taskIndex)">×</button>
              </div>
            </div>
            <div v-else class="hpc-empty">бэклог пока пуст</div>

            <div class="u-field">
              <label class="u-field__label">Ретроспектива</label>
              <textarea v-model="sprint.retrospective" class="glass-input u-ta" rows="2" @blur="save" />
            </div>
          </article>
        </div>
        <div v-else class="hpc-empty">спринты ещё не добавлены</div>
      </section>

      <section class="hpc-section">
        <div class="hpc-section__head">
          <div>
            <p class="hpc-section__label">Здоровье проекта</p>
            <h3 class="hpc-section__title">Контрольные точки и блокеры</h3>
          </div>
          <button class="a-btn-sm" type="button" @click="addCheckpoint">+ точка</button>
        </div>

        <div class="hpc-checkpoint-list">
          <div v-for="(checkpoint, checkpointIndex) in control.checkpoints" :key="checkpoint.id" class="hpc-checkpoint-row">
            <input v-model="checkpoint.title" class="glass-input" placeholder="Контрольная точка" @blur="save" />
            <input v-model="checkpoint.category" class="glass-input" placeholder="Категория" @blur="save" />
            <select v-model="checkpoint.status" class="u-status-sel" @change="save">
              <option v-for="option in checkpointStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <input v-model="checkpoint.note" class="glass-input hpc-checkpoint-row__note" placeholder="Что происходит" @blur="save" />
            <button class="a-btn-sm a-btn-danger" type="button" @click="removeCheckpoint(checkpointIndex)">×</button>
          </div>
        </div>

        <div class="hpc-task-head hpc-task-head--blockers">
          <span class="hpc-task-head__title">Текущие блокеры</span>
          <button class="a-btn-sm" type="button" @click="addBlocker">+ блокер</button>
        </div>
        <div class="hpc-blocker-list">
          <div v-for="(blocker, blockerIndex) in control.blockers" :key="`blocker-${blockerIndex}`" class="hpc-blocker-row">
            <input v-model="control.blockers[blockerIndex]" class="glass-input hpc-blocker-row__input" placeholder="Что тормозит проект" @blur="save" />
            <button class="a-btn-sm a-btn-danger" type="button" @click="removeBlocker(blockerIndex)">×</button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { buildHybridControlSummary, ensureHybridControl } from '~~/shared/utils/project-control'
import type { HybridControl, HybridControlSprint, HybridControlTask } from '~~/shared/types/project'

const props = defineProps<{ slug: string }>()

const { data: project, pending, refresh } = await useFetch<any>(() => `/api/projects/${props.slug}`)
const { savedAt, touch: markSaved } = useTimestamp()

const control = reactive<HybridControl>(ensureHybridControl(undefined))

const phaseStatusOptions = [
  { value: 'planned', label: 'запланирована' },
  { value: 'active', label: 'в работе' },
  { value: 'blocked', label: 'заблокирована' },
  { value: 'done', label: 'завершена' },
] as const

const sprintStatusOptions = [
  { value: 'planned', label: 'запланирован' },
  { value: 'active', label: 'активен' },
  { value: 'review', label: 'на ревью' },
  { value: 'done', label: 'завершён' },
] as const

const checkpointStatusOptions = [
  { value: 'stable', label: 'стабильно' },
  { value: 'warning', label: 'внимание' },
  { value: 'critical', label: 'критично' },
] as const

const taskStatusLabels: Record<HybridControlTask['status'], string> = {
  todo: 'к запуску',
  doing: 'в работе',
  review: 'на ревью',
  done: 'готово',
}

watch(project, (value) => {
  if (!value) return
  Object.assign(control, ensureHybridControl(value.profile?.hybridControl, value))
}, { immediate: true })

const summary = computed(() => buildHybridControlSummary(control))

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: {
      profile: {
        ...(project.value?.profile || {}),
        hybridControl: control,
      },
    },
  })
  markSaved()
  await refresh()
}

function addSprint() {
  control.sprints.push({
    id: `hybrid-sprint-${Date.now()}`,
    name: `Спринт ${control.sprints.length + 1}`,
    linkedPhaseKey: summary.value.activePhase?.phaseKey || 'construction',
    goal: '',
    focus: '',
    status: 'planned',
    startDate: '',
    endDate: '',
    retrospective: '',
    tasks: [],
  })
  save()
}

function removeSprint(index: number) {
  control.sprints.splice(index, 1)
  save()
}

function addTask(sprint: HybridControlSprint) {
  sprint.tasks.push({
    id: `hybrid-task-${Date.now()}`,
    title: 'Новая задача',
    status: 'todo',
    assignee: '',
    dueDate: '',
    points: 1,
    notes: '',
  })
  save()
}

function removeTask(sprint: HybridControlSprint, index: number) {
  sprint.tasks.splice(index, 1)
  save()
}

function cycleTask(task: HybridControlTask) {
  const next: Record<string, HybridControlTask['status']> = {
    todo: 'doing',
    doing: 'review',
    review: 'done',
    done: 'todo',
  }
  task.status = next[task.status]
  save()
}

function addCheckpoint() {
  control.checkpoints.push({
    id: `hybrid-checkpoint-${Date.now()}`,
    title: 'Новая контрольная точка',
    category: 'control',
    status: 'stable',
    note: '',
  })
  save()
}

function removeCheckpoint(index: number) {
  control.checkpoints.splice(index, 1)
  save()
}

function addBlocker() {
  control.blockers.push('')
  save()
}

function removeBlocker(index: number) {
  control.blockers.splice(index, 1)
  save()
}
</script>

<style scoped>
.hpc-root {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 4px 0 40px;
}

.hpc-summary,
.hpc-section {
  position: relative;
  padding: 18px 0 0;
}

.hpc-summary::before,
.hpc-section::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--ds-accent) 42%, transparent), color-mix(in srgb, var(--glass-text) 8%, transparent) 62%, transparent);
}

.hpc-summary__head,
.hpc-section__head,
.hpc-phase-card__head,
.hpc-sprint-card__head,
.hpc-task-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.hpc-summary__meta,
.hpc-phase-card__head-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hpc-eyebrow,
.hpc-section__label,
.hpc-phase-card__kicker {
  margin: 0 0 6px;
  font-size: .68rem;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 44%, transparent);
}

.hpc-title,
.hpc-section__title,
.hpc-phase-card__title {
  margin: 0;
  letter-spacing: .04em;
}

.hpc-title {
  font-size: clamp(1.2rem, 2.2vw, 1.8rem);
}

.hpc-section__title {
  font-size: 1rem;
}

.hpc-phase-card__title {
  font-size: .96rem;
}

.hpc-saved,
.hpc-chip,
.hpc-task-head__title {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.hpc-pill,
.hpc-chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}

.hpc-pill--stable { color: var(--ds-success); }
.hpc-pill--warning { color: var(--ds-warning); }
.hpc-pill--critical { color: var(--ds-error); }

.hpc-metrics,
.hpc-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.hpc-grid--top {
  width: 100%;
}

.hpc-metric {
  min-height: 72px;
  padding: 10px 0 0;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
}

.hpc-metric__label {
  display: block;
  margin-bottom: 8px;
  font-size: .68rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 42%, transparent);
}

.hpc-metric__value {
  font-size: 1.1rem;
  letter-spacing: .06em;
}

.hpc-phase-list,
.hpc-sprint-list,
.hpc-checkpoint-list,
.hpc-blocker-list {
  display: grid;
  gap: 14px;
}

.hpc-phase-card,
.hpc-sprint-card {
  display: grid;
  gap: 14px;
  padding: 0 0 0 18px;
  border-left: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
}

.hpc-gates,
.hpc-task-list {
  display: grid;
  gap: 10px;
}

.hpc-gate-row,
.hpc-task-row,
.hpc-checkpoint-row,
.hpc-blocker-row {
  display: grid;
  align-items: center;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.hpc-gate-row {
  grid-template-columns: auto 1fr;
  min-height: 44px;
}

.hpc-task-row {
  grid-template-columns: 88px minmax(0, 2fr) 88px minmax(0, 1fr) 150px auto;
}

.hpc-checkpoint-row {
  grid-template-columns: minmax(0, 1.1fr) minmax(0, .8fr) 160px minmax(0, 1.4fr) auto;
}

.hpc-blocker-row {
  grid-template-columns: 1fr auto;
}

.hpc-task-row__title,
.hpc-checkpoint-row__note,
.hpc-blocker-row__input {
  min-width: 0;
}

.hpc-task-state {
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: transparent;
  color: var(--glass-text);
  text-transform: uppercase;
  letter-spacing: .06em;
  cursor: pointer;
}

.hpc-empty {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  color: color-mix(in srgb, var(--glass-text) 44%, transparent);
  text-transform: uppercase;
  letter-spacing: .12em;
}

:deep(.glass-input),
:deep(.u-status-sel) {
  border-width: 0 0 1px;
  border-radius: 0;
  background: transparent;
  padding-left: 0;
  padding-right: 0;
}

:deep(.u-ta) {
  min-height: 64px;
}

@media (max-width: 900px) {
  .hpc-metrics,
  .hpc-grid,
  .hpc-task-row,
  .hpc-checkpoint-row {
    grid-template-columns: 1fr;
  }

  .hpc-summary__head,
  .hpc-section__head,
  .hpc-phase-card__head,
  .hpc-task-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>