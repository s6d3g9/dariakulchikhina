<template>
  <div class="cpc-timeline-content" :class="{ 'cpc-timeline-content--details': !!selectedTimelineRowDetails }">
    <div class="cpc-board-card">
      <div class="cpc-board-wrap">
        <div class="cpc-board" :style="timelineBoardStyle">
          <div class="cpc-board__head">
            <div class="cpc-board__cell cpc-board__cell--entity">Слой</div>
            <div class="cpc-board__cell cpc-board__cell--period">Период</div>
            <div class="cpc-board__timeline-head-stack">
              <div class="cpc-board__timeline-groups" :style="timelineGridStyle">
                <div
                  v-for="group in timelineGroups"
                  :key="group.key"
                  class="cpc-board__timeline-group-label"
                  :style="{ gridColumn: `span ${group.span}` }"
                >
                  <span>{{ group.label }}</span>
                </div>
              </div>
              <div class="cpc-board__timeline-head" :style="timelineGridStyle">
                <div
                  v-for="column in timelineColumns"
                  :key="column.key"
                  class="cpc-board__week-label"
                >
                  <span>{{ column.label }}</span>
                  <strong>{{ column.rangeLabel }}</strong>
                </div>
              </div>
            </div>
          </div>

          <div
            v-for="row in visibleTimelineRows"
            :key="row.id"
            class="cpc-board__row"
            :class="{ 'cpc-board__row--phase': row.type === 'phase' }"
          >
            <div class="cpc-board__cell cpc-board__cell--entity cpc-board__entity">
              <div class="cpc-board__entity-body">
                <div class="cpc-board__entity-top">
                  <span class="cpc-board__type">{{ row.typeLabel }}</span>
                  <span class="cpc-chip" :class="`cpc-chip--${row.tone}`">{{ row.statusLabel }}</span>
                  <button
                    v-if="row.type === 'phase' && getTimelinePhaseSprintCount(row.phaseKey)"
                    type="button"
                    class="cpc-board__toggle"
                    @click="toggleTimelinePhase(row.phaseKey)"
                  >
                    {{ isTimelinePhaseCollapsed(row.phaseKey) ? `показать ${getTimelinePhaseSprintCount(row.phaseKey)}` : `свернуть ${getTimelinePhaseSprintCount(row.phaseKey)}` }}
                  </button>
                </div>
                <button class="cpc-board__title-btn" type="button" @click="openTimelineRowDetails(row)">
                  <span class="cpc-board__title">{{ row.title }}</span>
                </button>
                <div class="cpc-board__meta-line">{{ row.meta }}</div>
              </div>
            </div>

            <div class="cpc-board__cell cpc-board__cell--period cpc-board__period">
              <span>{{ formatDateRange(row.startDate, row.endDate) }}</span>
              <strong>{{ row.progressLabel }}</strong>
            </div>

            <div class="cpc-board__timeline">
              <div class="cpc-board__weeks" :style="timelineGridStyle">
                <div
                  v-for="column in timelineColumns"
                  :key="`${row.id}-${column.key}`"
                  class="cpc-board__week"
                />
              </div>
              <div
                class="cpc-board__bar"
                :class="[
                  `cpc-board__bar--${row.tone}`,
                  { 'cpc-board__bar--active': isTimelineRowSelected(row) },
                ]"
                :style="getTimelineBarStyle(row)"
              >
                <button
                  class="cpc-board__bar-body"
                  type="button"
                  :aria-label="`Открыть детали ${row.title}`"
                  @click.stop="openTimelineRowDetails(row)"
                >
                  <span class="cpc-board__bar-label">{{ row.title }}</span>
                  <span class="cpc-board__bar-meta">{{ row.progressLabel }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section v-if="selectedTimelineRowDetails" class="cpc-timeline-details-panel">
      <div class="cpc-timeline-details-panel__head">
        <div class="cpc-timeline-details-panel__title-wrap">
          <p class="cpc-timeline-details-panel__eyebrow">{{ selectedTimelineRowDetails.typeLabel }}</p>
          <h3 class="cpc-section__title cpc-timeline-details-panel__title">{{ selectedTimelineRowDetails.title }}</h3>
          <p class="cpc-section__meta">{{ selectedTimelineRowDetails.meta }}</p>
        </div>
        <GlassButton variant="secondary" density="compact" type="button" @click="closeTimelineRowDetails">закрыть</GlassButton>
      </div>

      <div v-if="selectedTimelineDetailCards.length" class="cpc-timeline-detail-grid">
        <article v-for="card in selectedTimelineDetailCards" :key="card.label" class="cpc-timeline-detail-card">
          <span class="cpc-timeline-detail-card__label">{{ card.label }}</span>
          <strong class="cpc-timeline-detail-card__value">{{ card.value }}</strong>
        </article>
      </div>

      <p v-if="timelineScopeDetailPending" class="cpc-timeline-empty">Загружаю детали контура…</p>
      <p v-else-if="timelineScopeDetailError" class="cpc-timeline-empty cpc-timeline-empty--error">{{ timelineScopeDetailError }}</p>

      <div class="cpc-timeline-clusters">
        <section class="cpc-timeline-cluster">
          <div class="cpc-timeline-cluster__head">
            <p class="cpc-phase-field__label">Субъекты</p>
            <span class="cpc-chip">{{ timelineDetailSubjects.length }}</span>
          </div>
          <div v-if="timelineDetailSubjects.length" class="cpc-timeline-cluster__list">
            <article v-for="item in timelineDetailSubjects" :key="item.key" class="cpc-timeline-cluster__item">
              <span class="cpc-timeline-cluster__label">{{ item.label }}</span>
              <strong class="cpc-timeline-cluster__value">{{ item.value }}</strong>
            </article>
          </div>
          <p v-else class="cpc-timeline-empty">Связанные участники пока не назначены.</p>
        </section>

        <section class="cpc-timeline-cluster">
          <div class="cpc-timeline-cluster__head">
            <p class="cpc-phase-field__label">Объекты</p>
            <span class="cpc-chip">{{ timelineDetailObjects.length }}</span>
          </div>
          <div v-if="timelineDetailObjects.length" class="cpc-timeline-cluster__list">
            <article v-for="item in timelineDetailObjects" :key="item.key" class="cpc-timeline-cluster__item">
              <span class="cpc-timeline-cluster__label">{{ item.label }}</span>
              <strong class="cpc-timeline-cluster__value">{{ item.value }}</strong>
            </article>
          </div>
          <p v-else class="cpc-timeline-empty">Связанные объекты еще не описаны.</p>
        </section>

        <section class="cpc-timeline-cluster">
          <div class="cpc-timeline-cluster__head">
            <p class="cpc-phase-field__label">Настройки</p>
            <span class="cpc-chip">{{ timelineDetailSettings.length }}</span>
          </div>
          <div v-if="timelineDetailSettings.length" class="cpc-timeline-cluster__list">
            <article v-for="item in timelineDetailSettings" :key="item.key" class="cpc-timeline-cluster__item">
              <span class="cpc-timeline-cluster__label">{{ item.label }}</span>
              <strong class="cpc-timeline-cluster__value">{{ item.value }}</strong>
            </article>
          </div>
          <p v-else class="cpc-timeline-empty">Для этого контура дополнительные настройки пока не заданы.</p>
        </section>

        <section v-if="clientEditableScopeSettings.length" class="cpc-timeline-cluster cpc-timeline-cluster--actions">
          <div class="cpc-timeline-cluster__head">
            <p class="cpc-phase-field__label">Настройки клиента</p>
            <span class="cpc-chip">{{ clientEditableScopeSettings.length }}</span>
          </div>
          <div class="cpc-timeline-cluster__list cpc-timeline-governance-settings">
            <article v-for="field in clientEditableScopeSettings" :key="field.key" class="cpc-timeline-cluster__item">
              <span class="cpc-timeline-cluster__label">{{ field.label }}</span>

              <select
                v-if="field.kind === 'select'"
                class="glass-input"
                :value="field.value == null ? '' : String(field.value)"
                :disabled="timelineScopeMutationPending"
                @change="handleClientScopeSelectSettingChange(field.key, $event)"
              >
                <option v-for="option in field.items || []" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>

              <label v-else-if="field.kind === 'boolean'" class="cpc-timeline-governance-toggle">
                <input
                  :checked="Boolean(field.value)"
                  type="checkbox"
                  :disabled="timelineScopeMutationPending"
                  @change="handleClientScopeBooleanSettingChange(field.key, $event)"
                />
                <span>{{ Boolean(field.value) ? 'Включено' : 'Выключено' }}</span>
              </label>

              <input
                v-else
                class="glass-input"
                :type="field.kind === 'number' ? 'number' : 'text'"
                :value="field.value == null ? '' : String(field.value)"
                :disabled="timelineScopeMutationPending"
                @input="handleClientScopeTextSettingInput(field.key, field.kind, $event)"
                @blur="commitClientScopeSettings()"
              />

              <strong class="cpc-timeline-cluster__value">{{ field.kind === 'list' ? 'Список через запятую' : 'Изменения отправляются сразу' }}</strong>
            </article>
          </div>
          <p v-if="timelineScopeMutationError" class="cpc-timeline-empty cpc-timeline-empty--error">{{ timelineScopeMutationError }}</p>
          <p v-else-if="timelineScopeMutationNotice" class="cpc-phase-row__meta">{{ timelineScopeMutationNotice }}</p>
        </section>

        <section class="cpc-timeline-cluster">
          <div class="cpc-timeline-cluster__head">
            <p class="cpc-phase-field__label">Связанные контуры</p>
            <span class="cpc-chip">{{ timelineDetailLinkedScopes.length }}</span>
          </div>
          <div v-if="timelineDetailLinkedScopes.length" class="cpc-timeline-cluster__list">
            <article v-for="item in timelineDetailLinkedScopes" :key="item.key" class="cpc-timeline-cluster__item">
              <span class="cpc-timeline-cluster__label">{{ item.label }}</span>
              <strong class="cpc-timeline-cluster__value">{{ item.value }}</strong>
            </article>
          </div>
          <p v-else class="cpc-timeline-empty">Связанные контуры пока не определены.</p>
        </section>

        <section class="cpc-timeline-cluster cpc-timeline-cluster--actions">
          <div class="cpc-timeline-cluster__head">
            <p class="cpc-phase-field__label">Действия</p>
            <span class="cpc-chip">{{ timelineDetailActions.length }}</span>
          </div>
          <ul v-if="timelineDetailActions.length" class="cpc-timeline-action-list">
            <li v-for="item in timelineDetailActions" :key="item.key" class="cpc-timeline-action-item">
              <span class="cpc-timeline-action-item__title">{{ item.label }}</span>
              <span class="cpc-timeline-action-item__meta">{{ item.value }}</span>
            </li>
          </ul>
          <p v-else class="cpc-timeline-empty">Следующие действия пока не сформированы.</p>
        </section>
      </div>

      <div class="cpc-timeline-meta">
        <p class="cpc-phase-field__label">Контур коммуникации</p>
        <div v-if="timelineDetailRules.length" class="cpc-timeline-rule-list">
          <article v-for="rule in timelineDetailRules" :key="rule.id" class="cpc-timeline-rule-card">
            <div class="cpc-timeline-rule-card__head">
              <strong class="cpc-timeline-rule-card__title">{{ rule.title }}</strong>
              <span class="cpc-chip">{{ rule.channel }}</span>
            </div>
            <p class="cpc-timeline-rule-card__copy">{{ rule.trigger }}</p>
            <p class="cpc-timeline-rule-card__meta">{{ rule.audience }}</p>
          </article>
        </div>
        <p v-else class="cpc-timeline-empty">Для этого контура нет отдельного правила коммуникации.</p>
      </div>

      <div v-if="timelineDetailTasks.length" class="cpc-timeline-meta">
        <p class="cpc-phase-field__label">Задачи спринта</p>
        <ul class="cpc-timeline-task-list">
          <li v-for="task in timelineDetailTasks" :key="task.id" class="cpc-timeline-task-item">
            <div>
              <strong class="cpc-timeline-task-item__title">{{ task.title }}</strong>
              <span class="cpc-timeline-task-item__meta">{{ task.meta }}</span>
            </div>
            <div class="cpc-timeline-task-item__actions">
              <GlassButton variant="secondary" density="compact" type="button" @click="openTaskScopeDetails(task.scopeId, task.sprintId)">контур</GlassButton>
              <GlassButton variant="secondary" density="compact" type="button" @click="openTimelineTask(task.id, task.sprintId)">к задаче</GlassButton>
            </div>
          </li>
        </ul>
      </div>

      <div class="cpc-timeline-actions">
        <GlassButton
          v-if="selectedTimelineRowDetails.type === 'phase'"
          variant="secondary"
          density="compact"
          type="button"
          @click="openTimelinePhase(selectedTimelineRowDetails.id)"
        >
          к фазе
        </GlassButton>
        <GlassButton
          v-if="selectedTimelineRowDetails.type === 'sprint'"
          variant="secondary"
          density="compact"
          type="button"
          @click="openTimelineSprint(selectedTimelineRowDetails.id)"
        >
          к спринту
        </GlassButton>
        <GlassButton
          v-if="selectedTimelineRowDetails.scopeType === 'task'"
          variant="secondary"
          density="compact"
          type="button"
          @click="openTimelineTask(selectedTimelineRowDetails.id, selectedTimelineTaskSprintId)"
        >
          к задаче
        </GlassButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type {
  ClientScopeSettingField,
  SelectedTimelineScopeState,
  TimelineDetailItem,
  TimelineDetailTaskItem,
  TimelineRuleSummary,
} from '~~/app/composables/useClientProjectControlTimeline'
import type {
  HybridTimelineColumn,
  HybridTimelineGroup,
  HybridTimelineRow,
} from '~~/shared/utils/project/project-control-timeline'

type TimelineDetailCard = {
  label: string
  value: string
}

const props = defineProps<{
  visibleTimelineRows: HybridTimelineRow[]
  timelineColumns: HybridTimelineColumn[]
  timelineGroups: HybridTimelineGroup[]
  timelineGridStyle: CSSProperties
  timelineBoardStyle: CSSProperties
  selectedTimelineRowDetails: SelectedTimelineScopeState | null
  selectedTimelineTaskSprintId: string
  selectedTimelineDetailCards: TimelineDetailCard[]
  timelineScopeDetailPending: boolean
  timelineScopeDetailError: string
  timelineDetailSubjects: TimelineDetailItem[]
  timelineDetailObjects: TimelineDetailItem[]
  timelineDetailActions: TimelineDetailItem[]
  timelineDetailSettings: TimelineDetailItem[]
  clientEditableScopeSettings: ClientScopeSettingField[]
  timelineScopeMutationPending: boolean
  timelineScopeMutationError: string
  timelineScopeMutationNotice: string
  timelineDetailLinkedScopes: TimelineDetailItem[]
  timelineDetailRules: TimelineRuleSummary[]
  timelineDetailTasks: TimelineDetailTaskItem[]
  formatDateRange: (startDate?: string, endDate?: string) => string
  getTimelineBarStyle: (row: HybridTimelineRow) => CSSProperties
  getTimelinePhaseSprintCount: (phaseKey?: string) => number
  isTimelinePhaseCollapsed: (phaseKey?: string) => boolean
  toggleTimelinePhase: (phaseKey?: string) => void
  isTimelineRowSelected: (row: HybridTimelineRow) => boolean
  openTimelineRowDetails: (row: HybridTimelineRow) => void
  openTaskScopeDetails: (taskId: string, sprintId?: string) => void
  closeTimelineRowDetails: () => void
  handleClientScopeSelectSettingChange: (key: string, event: Event) => void
  handleClientScopeBooleanSettingChange: (key: string, event: Event) => void
  handleClientScopeTextSettingInput: (key: string, kind: ClientScopeSettingField['kind'], event: Event) => void
  commitClientScopeSettings: () => void | Promise<void>
  openTimelinePhase: (phaseId?: string) => void | Promise<void>
  openTimelineSprint: (sprintId?: string) => void | Promise<void>
  openTimelineTask: (taskId?: string, sprintId?: string) => void | Promise<void>
}>()

const {
  visibleTimelineRows,
  timelineColumns,
  timelineGroups,
  timelineGridStyle,
  timelineBoardStyle,
  selectedTimelineRowDetails,
  selectedTimelineTaskSprintId,
  selectedTimelineDetailCards,
  timelineScopeDetailPending,
  timelineScopeDetailError,
  timelineDetailSubjects,
  timelineDetailObjects,
  timelineDetailActions,
  timelineDetailSettings,
  clientEditableScopeSettings,
  timelineScopeMutationPending,
  timelineScopeMutationError,
  timelineScopeMutationNotice,
  timelineDetailLinkedScopes,
  timelineDetailRules,
  timelineDetailTasks,
  formatDateRange,
  getTimelineBarStyle,
  getTimelinePhaseSprintCount,
  isTimelinePhaseCollapsed,
  toggleTimelinePhase,
  isTimelineRowSelected,
  openTimelineRowDetails,
  openTaskScopeDetails,
  closeTimelineRowDetails,
  handleClientScopeSelectSettingChange,
  handleClientScopeBooleanSettingChange,
  handleClientScopeTextSettingInput,
  commitClientScopeSettings,
  openTimelinePhase,
  openTimelineSprint,
  openTimelineTask,
} = props
</script>

<style scoped>
.cpc-timeline-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.cpc-timeline-content--details {
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.9fr);
}

.cpc-board-card,
.cpc-timeline-details-panel {
  border: var(--cpc-tl-border-width) solid var(--cpc-tl-soft);
  border-radius: var(--cpc-tl-panel-radius);
  background: var(--cpc-tl-surface);
  color: var(--cpc-tl-text);
  box-shadow: var(--cpc-tl-shadow);
  backdrop-filter: var(--cpc-tl-backdrop);
  -webkit-backdrop-filter: var(--cpc-tl-backdrop);
}

.cpc-board-card {
  padding: 14px;
}

.cpc-board-wrap {
  overflow: auto;
  border-radius: var(--cpc-tl-inner-radius);
  background: var(--cpc-tl-surface-muted);
}

.cpc-board {
  min-width: 1040px;
}

.cpc-board__head,
.cpc-board__row {
  display: grid;
  grid-template-columns: var(--cpc-entity-column-width, 240px) var(--cpc-period-column-width, 170px) minmax(520px, 2fr);
  gap: 0;
  align-items: stretch;
}

.cpc-board__head {
  position: sticky;
  top: 0;
  z-index: 8;
  border-bottom: var(--cpc-tl-border-width) solid var(--cpc-tl-soft);
  background: var(--cpc-tl-surface-strong);
  backdrop-filter: var(--cpc-tl-backdrop);
  -webkit-backdrop-filter: var(--cpc-tl-backdrop);
}

.cpc-board__row {
  border-bottom: 1px solid var(--cpc-tl-soft);
  transition: background-color 0.18s ease;
}

.cpc-board__row:hover {
  background: color-mix(in srgb, var(--cpc-tl-surface-strong) 88%, transparent);
}

.cpc-board__row--phase {
  background: color-mix(in srgb, var(--cpc-tl-surface-muted) 80%, transparent);
}

.cpc-board__cell,
.cpc-board__timeline-head-stack,
.cpc-board__timeline {
  min-height: 66px;
}

.cpc-board__cell {
  padding: 12px 0;
}

.cpc-board__cell--entity,
.cpc-board__cell--period {
  position: sticky;
  z-index: 3;
  background: var(--cpc-tl-base);
}

.cpc-board__cell--entity {
  left: 0;
}

.cpc-board__cell--period {
  left: var(--cpc-entity-column-width, 240px);
  padding: 12px 14px;
  border-left: var(--cpc-tl-border-width) solid var(--cpc-tl-soft);
  border-right: var(--cpc-tl-border-width) solid var(--cpc-tl-soft);
}

.cpc-board__head .cpc-board__cell,
.cpc-board__head .cpc-board__timeline-head-stack,
.cpc-board__head .cpc-board__timeline-groups,
.cpc-board__head .cpc-board__timeline-head,
.cpc-board__head .cpc-board__timeline-group-label,
.cpc-board__head .cpc-board__week-label {
  background: var(--cpc-tl-surface-strong);
}

.cpc-board__row--phase .cpc-board__cell--entity,
.cpc-board__row--phase .cpc-board__cell--period {
  background: color-mix(in srgb, var(--cpc-tl-surface-muted) 92%, var(--cpc-tl-base));
}

.cpc-board__entity,
.cpc-board__period {
  display: grid;
  gap: 8px;
}

.cpc-board__entity-top,
.cpc-timeline-details-panel__head,
.cpc-timeline-cluster__head,
.cpc-timeline-rule-card__head,
.cpc-timeline-task-item__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.cpc-board__toggle,
.cpc-chip {
  border-radius: var(--cpc-tl-chip-radius);
  border: var(--cpc-tl-border-width) solid var(--cpc-tl-soft);
  background: transparent;
  color: var(--cpc-tl-muted);
  text-transform: var(--cpc-tl-label-transform);
  letter-spacing: var(--cpc-tl-label-spacing);
}

.cpc-board__toggle {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 14px;
  font-size: 0.68rem;
  cursor: pointer;
}

.cpc-board__toggle:hover {
  color: var(--cpc-tl-text);
  border-color: var(--cpc-tl-strong-border);
  background: var(--cpc-tl-surface-strong);
}

.cpc-board__type,
.cpc-board__timeline-group-label,
.cpc-board__week-label span,
.cpc-phase-field__label,
.cpc-section__meta,
.cpc-phase-row__meta,
.cpc-chip,
.cpc-timeline-details-panel__eyebrow,
.cpc-timeline-detail-card__label,
.cpc-timeline-empty,
.cpc-timeline-cluster__label,
.cpc-timeline-rule-card__meta,
.cpc-timeline-action-item__meta,
.cpc-timeline-task-item__meta {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--cpc-tl-muted);
  text-transform: var(--cpc-tl-label-transform);
  letter-spacing: var(--cpc-tl-label-spacing);
}

.cpc-section__title,
.cpc-board__title,
.cpc-timeline-details-panel__title {
  margin: 0;
  color: var(--cpc-tl-text);
}

.cpc-board__title-btn {
  width: fit-content;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--cpc-tl-text);
  text-align: left;
  cursor: pointer;
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--cpc-tl-text) 22%, transparent);
}

.cpc-board__title-btn:hover {
  color: color-mix(in srgb, var(--cpc-tl-text) 88%, var(--ds-accent));
}

.cpc-board__meta-line,
.cpc-board__period span,
.cpc-board__week-label {
  color: var(--cpc-tl-muted);
}

.cpc-board__period strong,
.cpc-board__week-label strong {
  font-size: 0.78rem;
  color: var(--cpc-tl-text);
}

.cpc-board__timeline-head-stack,
.cpc-board__timeline-groups,
.cpc-board__timeline-head,
.cpc-board__weeks {
  display: grid;
}

.cpc-board__timeline-head-stack {
  min-width: 0;
}

.cpc-board__timeline-groups {
  border-bottom: 1px solid var(--cpc-tl-soft);
}

.cpc-board__timeline-group-label,
.cpc-board__week-label,
.cpc-board__week {
  display: grid;
  align-items: center;
  min-width: 0;
  border-left: 1px solid var(--cpc-tl-soft);
}

.cpc-board__timeline-group-label {
  min-height: 28px;
  padding: 8px 10px;
}

.cpc-board__week-label {
  min-height: 44px;
  padding: 12px 10px;
}

.cpc-board__timeline {
  position: relative;
}

.cpc-board__weeks {
  height: 100%;
}

.cpc-board__bar {
  position: absolute;
  top: 50%;
  bottom: auto;
  height: 42px;
  min-height: 42px;
  min-width: 56px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border-radius: var(--cpc-tl-chip-radius);
  border: var(--cpc-tl-border-width) solid currentColor;
  background: color-mix(in srgb, currentColor 13%, var(--cpc-tl-surface));
  transform: translateY(-50%);
  overflow: hidden;
  box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 18%, transparent);
}

.cpc-board__bar--active {
  box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 18%, transparent), 0 0 0 1px currentColor, 0 12px 26px color-mix(in srgb, currentColor 18%, transparent);
}

.cpc-board__bar-body {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 1px;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.cpc-board__bar-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.72rem;
  font-weight: 600;
}

.cpc-board__bar-meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, currentColor 72%, transparent);
}

.cpc-board__bar--stable,
.cpc-chip--stable {
  color: var(--cpc-tl-stable);
}

.cpc-board__bar--warning,
.cpc-chip--warning {
  color: var(--cpc-tl-warning);
}

.cpc-board__bar--critical,
.cpc-chip--critical {
  color: var(--cpc-tl-critical);
}

.cpc-chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  background: var(--cpc-tl-surface-muted);
}

.cpc-timeline-details-panel {
  position: sticky;
  top: 16px;
  display: grid;
  gap: 18px;
  padding: 20px 22px;
}

.cpc-timeline-details-panel__title-wrap,
.cpc-timeline-cluster__list,
.cpc-timeline-rule-list,
.cpc-timeline-meta,
.cpc-timeline-actions,
.cpc-timeline-detail-grid,
.cpc-timeline-clusters {
  display: grid;
  gap: 10px;
}

.cpc-timeline-details-panel__title-wrap {
  gap: 8px;
}

.cpc-timeline-detail-grid,
.cpc-timeline-clusters {
  gap: 12px;
}

.cpc-timeline-detail-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.cpc-timeline-clusters {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.cpc-timeline-detail-card,
.cpc-timeline-cluster,
.cpc-timeline-action-item,
.cpc-timeline-rule-card,
.cpc-timeline-task-item {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid var(--cpc-tl-soft);
  border-radius: calc(var(--cpc-tl-inner-radius) - 6px);
  background: color-mix(in srgb, var(--cpc-tl-surface-strong) 76%, transparent);
}

.cpc-timeline-detail-card__value,
.cpc-timeline-cluster__value,
.cpc-timeline-rule-card__title,
.cpc-timeline-action-item__title,
.cpc-timeline-task-item__title {
  font-size: 0.86rem;
  line-height: 1.4;
}

.cpc-timeline-cluster {
  align-content: start;
}

.cpc-timeline-action-list,
.cpc-timeline-task-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cpc-timeline-rule-card__copy {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
}

.cpc-timeline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cpc-timeline-governance-settings {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.cpc-timeline-governance-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.cpc-timeline-empty {
  display: grid;
  min-height: 48px;
}

.cpc-timeline-empty--error {
  color: var(--ds-error);
}

@media (max-width: 1200px) {
  .cpc-timeline-content--details,
  .cpc-timeline-detail-grid,
  .cpc-timeline-clusters {
    grid-template-columns: 1fr;
  }

  .cpc-timeline-details-panel {
    position: static;
  }
}

@media (max-width: 900px) {
  .cpc-timeline-details-panel__head,
  .cpc-timeline-cluster__head,
  .cpc-timeline-rule-card__head,
  .cpc-timeline-task-item__actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .cpc-board__cell,
  .cpc-board__timeline-head-stack,
  .cpc-board__timeline {
    min-height: 62px;
  }

  .cpc-board__bar {
    height: 38px;
    min-height: 38px;
  }

  .cpc-board {
    min-width: 980px;
  }
}

@media (max-width: 640px) {
  .cpc-board-card,
  .cpc-timeline-details-panel {
    padding: 14px;
  }
}
</style>
