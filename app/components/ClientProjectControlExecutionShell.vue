<template>
  <div class="cpc-execution-shell">
    <section class="cpc-section cpc-section--phases">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Фазы проекта</div>
          <div class="cpc-section__meta">Фазовый каркас и контрольные гейты</div>
        </div>
      </div>

      <div class="cpc-phase-overview">
        <article v-for="stat in phaseStats" :key="stat.label" class="cpc-phase-stat">
          <span class="cpc-phase-stat__label">{{ stat.label }}</span>
          <strong class="cpc-phase-stat__value">{{ stat.value }}</strong>
        </article>
      </div>

      <div class="cpc-phase-list cpc-phase-list--cards">
        <article v-for="phase in phases" :key="phase.id" class="cpc-phase-card" :data-client-phase-id="phase.id">
          <div class="cpc-phase-card__head">
            <div>
              <p class="cpc-phase-card__kicker">{{ phase.phaseKey }}</p>
              <h3 class="cpc-phase-card__title">{{ phase.title }}</h3>
            </div>
            <div class="cpc-phase-row__right">
              <span class="cpc-chip" :class="`cpc-chip--${phase.status}`">{{ phaseStatusLabels[phase.status] }}</span>
              <span class="cpc-chip">{{ phase.percent || 0 }}%</span>
            </div>
          </div>

          <div class="cpc-phase-card__grid">
            <div class="cpc-phase-field">
              <span class="cpc-phase-field__label">Результат</span>
              <strong class="cpc-phase-field__value">{{ phase.deliverable || 'Результат пока не зафиксирован' }}</strong>
            </div>
            <div class="cpc-phase-field">
              <span class="cpc-phase-field__label">Ответственный</span>
              <strong class="cpc-phase-field__value">{{ phase.owner || 'Команда проекта' }}</strong>
            </div>
            <div class="cpc-phase-field">
              <span class="cpc-phase-field__label">Период</span>
              <strong class="cpc-phase-field__value">{{ formatDateRange(phase.startDate, phase.endDate) }}</strong>
            </div>
            <div class="cpc-phase-field">
              <span class="cpc-phase-field__label">Комментарий</span>
              <strong class="cpc-phase-field__value">{{ phase.notes || 'Без дополнительной заметки' }}</strong>
            </div>
          </div>

          <div v-if="phase.gates.length" class="cpc-phase-gates">
            <div class="cpc-phase-gates__head">
              <span class="cpc-phase-field__label">Контрольные гейты</span>
              <span class="cpc-chip">{{ getPhaseGateProgress(phase) }}</span>
            </div>
            <div class="cpc-phase-gate-list">
              <div
                v-for="gate in phase.gates"
                :key="gate.id"
                class="cpc-phase-gate"
                :class="{ 'cpc-phase-gate--done': gate.done }"
              >
                <span class="cpc-phase-gate__state">{{ gate.done ? 'готово' : 'в работе' }}</span>
                <span class="cpc-phase-gate__label">{{ gate.label }}</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-if="sprints.length" class="cpc-section cpc-section--sprints">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Активные циклы исполнения</div>
          <div class="cpc-section__meta">Спринтовый слой и текущий канбан выбранного спринта</div>
        </div>
      </div>

      <div class="cpc-phase-overview cpc-phase-overview--sprints">
        <article v-for="stat in sprintStats" :key="stat.label" class="cpc-phase-stat">
          <span class="cpc-phase-stat__label">{{ stat.label }}</span>
          <strong class="cpc-phase-stat__value">{{ stat.value }}</strong>
        </article>
      </div>

      <div class="cpc-sprint-shell">
        <div class="cpc-sprint-list cpc-sprint-list--cards">
          <article
            v-for="sprint in sprints"
            :key="sprint.id"
            class="cpc-sprint-card"
            :class="{ 'cpc-sprint-card--active': isSelectedSprint(sprint) }"
            :data-sprint-id="sprint.id"
          >
            <div class="cpc-sprint-card__head">
              <div>
                <div class="cpc-phase-row__title">{{ sprint.name }}</div>
                <div class="cpc-phase-row__meta">{{ sprint.linkedPhaseKey ? getPhaseTitleByKey(sprint.linkedPhaseKey) : 'Без фазы' }}</div>
              </div>
              <div class="cpc-phase-row__right">
                <span class="cpc-chip" :class="`cpc-chip--${sprint.status}`">{{ sprintStatusLabels[sprint.status] }}</span>
                <span class="cpc-chip">{{ getSprintCompletionLabel(sprint) }}</span>
              </div>
            </div>

            <div class="cpc-sprint-card__body">
              <div class="cpc-phase-field">
                <span class="cpc-phase-field__label">Цель</span>
                <strong class="cpc-phase-field__value">{{ sprint.goal || 'Цель пока не зафиксирована' }}</strong>
              </div>
              <div class="cpc-phase-field">
                <span class="cpc-phase-field__label">Фокус</span>
                <strong class="cpc-phase-field__value">{{ sprint.focus || 'Фокус не заполнен' }}</strong>
              </div>
              <div class="cpc-phase-field">
                <span class="cpc-phase-field__label">Период</span>
                <strong class="cpc-phase-field__value">{{ formatDateRange(sprint.startDate, sprint.endDate) }}</strong>
              </div>
            </div>

            <div class="cpc-sprint-card__foot">
              <span class="cpc-phase-row__meta">{{ sprint.tasks.length }} задач в спринте</span>
              <GlassButton variant="secondary" density="compact" type="button" @click="focusSprint(sprint.id)">задачи</GlassButton>
            </div>
          </article>
        </div>

        <section
          v-if="selectedSprint"
          class="cpc-sprint-detail-card"
          :data-client-sprint-detail-id="selectedSprint.id"
        >
          <div class="cpc-sprint-detail__head">
            <div>
              <p class="cpc-phase-card__kicker">{{ selectedSprintPhaseTitle }}</p>
              <h3 class="cpc-section__title">{{ selectedSprint.name }}</h3>
            </div>
            <div class="cpc-phase-row__right">
              <span class="cpc-chip" :class="`cpc-chip--${selectedSprint.status}`">{{ sprintStatusLabels[selectedSprint.status] }}</span>
              <span class="cpc-chip">{{ selectedSprint.tasks.length }} задач</span>
            </div>
          </div>

          <div class="cpc-phase-overview cpc-phase-overview--detail">
            <article v-for="stat in selectedSprintStats" :key="stat.label" class="cpc-phase-stat">
              <span class="cpc-phase-stat__label">{{ stat.label }}</span>
              <strong class="cpc-phase-stat__value">{{ stat.value }}</strong>
            </article>
          </div>

          <div class="cpc-sprint-detail__grid">
            <div class="cpc-phase-field">
              <span class="cpc-phase-field__label">Цель</span>
              <strong class="cpc-phase-field__value">{{ selectedSprint.goal || 'Цель пока не описана' }}</strong>
            </div>
            <div class="cpc-phase-field">
              <span class="cpc-phase-field__label">Фокус</span>
              <strong class="cpc-phase-field__value">{{ selectedSprint.focus || 'Фокус команды не заполнен' }}</strong>
            </div>
            <div class="cpc-phase-field cpc-phase-field--full">
              <span class="cpc-phase-field__label">Ретроспектива</span>
              <strong class="cpc-phase-field__value">{{ selectedSprint.retrospective || 'Ретроспектива ещё не добавлена' }}</strong>
            </div>
          </div>

          <div class="cpc-sprint-board">
            <section v-for="column in selectedSprintColumns" :key="column.status" class="cpc-sprint-column">
              <div class="cpc-sprint-column__head">
                <span>{{ column.label }}</span>
                <strong>{{ column.tasks.length }}</strong>
              </div>

              <div v-if="column.tasks.length" class="cpc-task-list cpc-task-list--board">
                <article
                  v-for="task in column.tasks"
                  :key="task.id"
                  class="cpc-task-card"
                  :class="{ 'cpc-task-card--active': isSelectedTask(task) }"
                  :data-client-task-id="task.id"
                  tabindex="0"
                  @click="selectTask(task.id, selectedSprint.id)"
                  @keydown.enter.prevent="selectTask(task.id, selectedSprint.id)"
                  @keydown.space.prevent="selectTask(task.id, selectedSprint.id)"
                >
                  <div class="cpc-task-card__top">
                    <div class="cpc-phase-row__title">{{ task.title }}</div>
                    <span class="cpc-chip">{{ task.points || 0 }} pt</span>
                  </div>
                  <div class="cpc-task-card__meta">
                    <span>{{ task.assignee || 'без исполнителя' }}</span>
                    <span>{{ formatTaskDueDate(task.dueDate) }}</span>
                  </div>
                  <div v-if="task.notes" class="cpc-task-card__note">{{ task.notes }}</div>
                </article>
              </div>
              <div v-else class="cpc-empty cpc-empty--inline">нет задач</div>
            </section>
          </div>

          <section v-if="selectedTask" class="cpc-sprint-detail-card cpc-task-detail-card">
            <div class="cpc-sprint-detail__head">
              <div>
                <p class="cpc-phase-card__kicker">{{ taskStatusLabels[selectedTask.status] }}</p>
                <h3 class="cpc-section__title">{{ selectedTask.title }}</h3>
              </div>
              <div class="cpc-phase-row__right">
                <span class="cpc-chip">{{ selectedSprint.name }}</span>
                <span class="cpc-chip">{{ selectedTask.points || 0 }} pt</span>
                <GlassButton variant="secondary" density="compact" type="button" @click="openTaskScopeDetails(selectedTask.id, selectedSprint.id)">контур задачи</GlassButton>
                <GlassButton variant="secondary" density="compact" type="button" @click="clearTaskFocus">снять фокус</GlassButton>
              </div>
            </div>

            <div class="cpc-phase-overview cpc-phase-overview--detail">
              <article v-for="stat in selectedTaskStats" :key="stat.label" class="cpc-phase-stat">
                <span class="cpc-phase-stat__label">{{ stat.label }}</span>
                <strong class="cpc-phase-stat__value">{{ stat.value }}</strong>
              </article>
            </div>

            <div class="cpc-sprint-detail__grid">
              <div class="cpc-phase-field">
                <span class="cpc-phase-field__label">Контур</span>
                <strong class="cpc-phase-field__value">{{ selectedSprint.name }} · {{ selectedSprintPhaseTitle }}</strong>
              </div>
              <div class="cpc-phase-field cpc-phase-field--full">
                <span class="cpc-phase-field__label">Заметки</span>
                <strong class="cpc-phase-field__value">{{ selectedTask.notes || 'Комментарий к задаче пока не добавлен' }}</strong>
              </div>
            </div>
          </section>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type {
  ClientProjectControlExecutionStat,
  ClientProjectControlSprintColumn,
} from '~~/app/composables/useClientProjectControlExecution'
import type {
  HybridControlPhase,
  HybridControlSprint,
  HybridControlTask,
} from '~~/shared/types/project/project'

const props = defineProps<{
  phaseStats: ClientProjectControlExecutionStat[]
  phases: HybridControlPhase[]
  phaseStatusLabels: Record<HybridControlPhase['status'], string>
  sprintStats: ClientProjectControlExecutionStat[]
  sprints: HybridControlSprint[]
  sprintStatusLabels: Record<HybridControlSprint['status'], string>
  taskStatusLabels: Record<HybridControlTask['status'], string>
  selectedSprint: HybridControlSprint | null
  selectedSprintPhaseTitle: string
  selectedSprintStats: ClientProjectControlExecutionStat[]
  selectedSprintColumns: ClientProjectControlSprintColumn[]
  selectedTask: HybridControlTask | null
  selectedTaskStats: ClientProjectControlExecutionStat[]
  formatDateRange: (startDate?: string, endDate?: string) => string
  formatTaskDueDate: (value?: string) => string
  getPhaseGateProgress: (phase: HybridControlPhase) => string
  getSprintCompletionLabel: (sprint: HybridControlSprint) => string
  getPhaseTitleByKey: (phaseKey?: string) => string
  focusSprint: (sprintId?: string) => void
  isSelectedSprint: (sprint: HybridControlSprint) => boolean
  selectTask: (taskId?: string, sprintId?: string) => void
  isSelectedTask: (task: HybridControlTask) => boolean
  openTaskScopeDetails: (taskId: string, sprintId?: string) => void | Promise<void>
  clearTaskFocus: () => void
}>()

const {
  phaseStats,
  phases,
  phaseStatusLabels,
  sprintStats,
  sprints,
  sprintStatusLabels,
  taskStatusLabels,
  selectedSprint,
  selectedSprintPhaseTitle,
  selectedSprintStats,
  selectedSprintColumns,
  selectedTask,
  selectedTaskStats,
  formatDateRange,
  formatTaskDueDate,
  getPhaseGateProgress,
  getSprintCompletionLabel,
  getPhaseTitleByKey,
  focusSprint,
  isSelectedSprint,
  selectTask,
  isSelectedTask,
  openTaskScopeDetails,
  clearTaskFocus,
} = props
</script>

<style scoped>
.cpc-execution-shell {
  display: grid;
  gap: 18px;
}

.cpc-section,
.cpc-phase-stat,
.cpc-phase-card,
.cpc-sprint-card,
.cpc-sprint-detail-card,
.cpc-task-card,
.cpc-phase-field,
.cpc-phase-gate,
.cpc-sprint-column {
  border: var(--cpc-border-width) solid var(--cpc-border);
  border-radius: var(--cpc-radius);
  background: var(--cpc-surface);
  color: var(--cpc-text);
  box-shadow: var(--cpc-shadow);
  backdrop-filter: var(--cpc-backdrop);
  -webkit-backdrop-filter: var(--cpc-backdrop);
}

.cpc-section {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.cpc-section__head,
.cpc-phase-row__right,
.cpc-phase-card__head,
.cpc-sprint-card__head,
.cpc-sprint-card__foot,
.cpc-sprint-detail__head,
.cpc-task-card__top,
.cpc-task-card__meta,
.cpc-phase-gates__head,
.cpc-sprint-column__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cpc-phase-row__right {
  flex-wrap: wrap;
}

.cpc-section__title,
.cpc-phase-row__title,
.cpc-phase-card__title,
.cpc-phase-field__value,
.cpc-phase-stat__value {
  margin: 0;
  color: var(--cpc-text);
}

.cpc-section__meta,
.cpc-phase-card__kicker,
.cpc-phase-field__label,
.cpc-phase-stat__label,
.cpc-phase-row__meta,
.cpc-empty {
  margin: 0;
  font-size: 0.72rem;
  color: var(--cpc-muted);
  text-transform: var(--cpc-label-transform);
  letter-spacing: var(--cpc-label-spacing);
}

.cpc-phase-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.cpc-phase-stat {
  display: grid;
  gap: 10px;
  min-height: 92px;
  padding: 16px 18px;
}

.cpc-phase-stat__value {
  font-size: clamp(1rem, 2vw, 1.2rem);
  line-height: 1.35;
}

.cpc-phase-list--cards,
.cpc-sprint-list--cards,
.cpc-task-list {
  display: grid;
  gap: 12px;
}

.cpc-phase-card,
.cpc-sprint-card,
.cpc-sprint-detail-card {
  display: grid;
  gap: 16px;
  padding: 18px;
}

.cpc-phase-card__grid,
.cpc-sprint-card__body,
.cpc-sprint-detail__grid,
.cpc-sprint-shell,
.cpc-sprint-board {
  display: grid;
  gap: 12px;
}

.cpc-phase-card__grid,
.cpc-sprint-card__body,
.cpc-sprint-detail__grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cpc-phase-field {
  display: grid;
  gap: 8px;
  min-height: 84px;
  padding: 14px 16px;
  border-radius: var(--cpc-inner-radius);
  background: var(--cpc-surface-muted);
}

.cpc-phase-field--full {
  grid-column: 1 / -1;
}

.cpc-phase-field__value {
  font-size: 0.88rem;
  line-height: 1.45;
}

.cpc-phase-gates {
  display: grid;
  display: grid;
  gap: 12px;
  padding-top: 4px;
}

.cpc-phase-gate-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.cpc-phase-gate {
  display: grid;
  gap: 8px;
  min-height: 68px;
  padding: 14px 16px;
  border-radius: var(--cpc-inner-radius);
  background: var(--cpc-surface-muted);
}

.cpc-phase-gate--done {
  border-color: color-mix(in srgb, var(--ds-success) 50%, var(--cpc-border));
  background: color-mix(in srgb, var(--ds-success) 8%, var(--cpc-surface-muted));
}

.cpc-phase-gate__state {
  font-size: 0.68rem;
  color: var(--cpc-muted);
}

.cpc-phase-gate__label {
  font-size: 0.84rem;
  line-height: 1.4;
}

.cpc-sprint-card--active {
  border-color: color-mix(in srgb, var(--ds-accent) 40%, var(--cpc-border));
  background: color-mix(in srgb, var(--ds-accent) 6%, var(--cpc-surface));
}

.cpc-sprint-card__foot {
  padding-top: 4px;
  border-top: 1px solid var(--cpc-border);
}

.cpc-sprint-detail__head {
  align-items: flex-start;
}

.cpc-phase-overview--detail {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.cpc-sprint-board {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: start;
}

.cpc-sprint-column {
  display: grid;
  gap: 10px;
  min-height: 200px;
  padding: 12px;
  border-style: dashed;
  border-radius: var(--cpc-inner-radius);
  background: color-mix(in srgb, var(--cpc-surface-strong) 82%, transparent);
}

.cpc-task-list--board {
  align-content: start;
}

.cpc-task-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: var(--cpc-inner-radius);
  cursor: pointer;
}

.cpc-task-card:focus-visible {
  outline: max(2px, var(--cpc-border-width)) solid color-mix(in srgb, var(--ds-accent) 72%, var(--cpc-border));
  outline-offset: 2px;
}

.cpc-task-card__note {
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--cpc-text);
}

.cpc-task-card--active,
.cpc-task-detail-card {
  border-color: color-mix(in srgb, var(--ds-accent) 38%, var(--cpc-border));
  background: color-mix(in srgb, var(--ds-accent) 4%, var(--cpc-surface));
}

.cpc-chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border: var(--cpc-border-width) solid var(--cpc-border);
  border-radius: var(--cpc-chip-radius);
  background: var(--cpc-surface-strong);
  color: var(--cpc-text);
  font-size: 0.68rem;
  text-transform: var(--cpc-label-transform);
  letter-spacing: var(--cpc-label-spacing);
}

.cpc-chip--done,
.cpc-chip--stable {
  color: var(--ds-success);
}

.cpc-chip--warning,
.cpc-chip--review {
  color: var(--ds-warning);
}

.cpc-chip--critical,
.cpc-chip--blocked {
  color: var(--ds-error);
}

.cpc-chip--active,
.cpc-chip--doing {
  color: var(--ds-accent);
}

.cpc-empty {
  display: grid;
  place-items: center;
  min-height: 72px;
}

.cpc-empty--inline {
  min-height: 120px;
}

:global(html[data-concept="brutal"] .cpc-section),
:global(html[data-concept="brutal"] .cpc-phase-stat),
:global(html[data-concept="brutal"] .cpc-phase-card),
:global(html[data-concept="brutal"] .cpc-sprint-card),
:global(html[data-concept="brutal"] .cpc-sprint-detail-card),
:global(html[data-concept="brutal"] .cpc-task-card),
:global(html[data-concept="brutal"] .cpc-phase-field),
:global(html[data-concept="brutal"] .cpc-phase-gate),
:global(html[data-concept="brutal"] .cpc-sprint-column),
:global(html[data-concept="brutal"] .cpc-chip) {
  box-shadow: 4px 4px 0 #000000;
}

@media (max-width: 1100px) {
  .cpc-sprint-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .cpc-phase-overview,
  .cpc-phase-overview--detail,
  .cpc-phase-card__grid,
  .cpc-sprint-card__body,
  .cpc-sprint-detail__grid,
  .cpc-phase-gate-list {
    grid-template-columns: 1fr 1fr;
  }

  .cpc-section__head,
  .cpc-phase-card__head,
  .cpc-sprint-card__head,
  .cpc-sprint-card__foot,
  .cpc-sprint-detail__head,
  .cpc-task-card__top,
  .cpc-task-card__meta,
  .cpc-phase-gates__head,
  .cpc-sprint-column__head {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 680px) {
  .cpc-section {
    padding: 16px;
  }

  .cpc-phase-overview,
  .cpc-phase-overview--detail,
  .cpc-phase-card__grid,
  .cpc-sprint-card__body,
  .cpc-sprint-detail__grid,
  .cpc-phase-gate-list,
  .cpc-sprint-board {
    grid-template-columns: 1fr;
  }
}
</style>
