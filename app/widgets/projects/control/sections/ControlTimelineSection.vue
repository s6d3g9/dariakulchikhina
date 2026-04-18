<template>
  <section class="hpc-section hpc-section--timeline">
    <div class="hpc-section__head">
      <div>
        <h3 class="hpc-section__title">Таймлайн проекта</h3>
      </div>
      <div class="hpc-section__tools">
        <div class="hpc-scale-switch" role="group" aria-label="Масштаб таймлайна">
          <button
            v-for="option in timelineScaleOptions"
            :key="option.value"
            type="button"
            class="hpc-scale-switch__btn"
            :class="{ 'hpc-scale-switch__btn--active': timelineScale === option.value }"
            @click="timelineScale = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <button
          v-if="hasCollapsibleTimelinePhases"
          type="button"
          class="hpc-scale-switch__btn"
          @click="toggleAllTimelinePhases"
        >
          {{ allTimelinePhasesCollapsed ? 'раскрыть все фазы' : 'свернуть все фазы' }}
        </button>
      </div>
    </div>

    <div class="hpc-timeline-shell">
      <div class="hpc-timeline-overview">
        <article v-for="stat in timelineStats" :key="stat.label" class="hpc-timeline-stat">
          <span class="hpc-timeline-stat__label">{{ stat.label }}</span>
          <strong class="hpc-timeline-stat__value">{{ stat.value }}</strong>
        </article>
      </div>

      <div
        v-if="timelineTooltip.visible"
        class="hpc-timeline-hover-tooltip"
        :style="timelineTooltipStyle"
      >
        {{ timelineTooltip.content }}
      </div>

      <div class="hpc-timeline-content" :class="{ 'hpc-timeline-content--details': !!selectedTimelineRowDetails }">
        <div class="hpc-timeline-board-card">
          <div class="hpc-board-wrap">
            <div class="hpc-board" :style="timelineBoardStyle">
              <div class="hpc-board__head">
                <div class="hpc-board__cell hpc-board__cell--entity">Слой</div>
                <div class="hpc-board__cell hpc-board__cell--period">Период</div>
                <div class="hpc-board__timeline-head-stack">
                  <div class="hpc-board__timeline-groups" :style="timelineGridStyle">
                    <div
                      v-for="group in timelineGroups"
                      :key="group.key"
                      class="hpc-board__timeline-group-label"
                      :style="{ gridColumn: `span ${group.span}` }"
                    >
                      <span>{{ group.label }}</span>
                    </div>
                  </div>
                  <div class="hpc-board__timeline-head" :style="timelineGridStyle">
                    <div
                      v-for="column in timelineColumns"
                      :key="column.key"
                      class="hpc-board__week-label"
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
                class="hpc-board__row"
                :class="{
                  'hpc-board__row--phase': row.type === 'phase',
                  'hpc-board__row--drag-over': timelineDrag.overRowId === row.id && timelineDrag.kind === 'reorder',
                }"
              >
                <div
                  class="hpc-board__cell hpc-board__cell--entity hpc-board__entity"
                  @dragover.prevent="onRowDragOver(row.id)"
                  @drop="onRowDrop(row)"
                >
                  <button
                    class="hpc-board__drag"
                    type="button"
                    :draggable="timelineEditingEnabled"
                    :disabled="!timelineEditingEnabled"
                    :aria-label="`Переместить ${row.title}`"
                    @dragstart="onReorderDragStart($event, row)"
                    @dragend="onDragEnd"
                  >
                    ::
                  </button>
                  <div class="hpc-board__entity-body">
                    <div class="hpc-board__entity-main">
                      <button
                        class="hpc-board__title-btn"
                        type="button"
                        :aria-label="`Открыть детали ${row.title}`"
                        @pointerenter="scheduleTimelineTooltip($event, row)"
                        @pointerleave="hideTimelineTooltip"
                        @focus="scheduleTimelineTooltip($event, row)"
                        @blur="hideTimelineTooltip"
                        @click="openTimelineRowDetails(row)"
                      >
                        <span class="hpc-board__title">{{ row.title }}</span>
                      </button>
                      <button
                        v-if="row.type === 'phase' && getTimelinePhaseSprintCount(row.phaseKey)"
                        type="button"
                        class="hpc-board__toggle"
                        :title="isTimelinePhaseCollapsed(row.phaseKey) ? `Показать вложенные спринты: ${getTimelinePhaseSprintCount(row.phaseKey)}` : `Свернуть вложенные спринты: ${getTimelinePhaseSprintCount(row.phaseKey)}`"
                        :aria-label="isTimelinePhaseCollapsed(row.phaseKey) ? `Показать вложенные спринты: ${getTimelinePhaseSprintCount(row.phaseKey)}` : `Свернуть вложенные спринты: ${getTimelinePhaseSprintCount(row.phaseKey)}`"
                        @click="toggleTimelinePhase(row.phaseKey)"
                      >
                        {{ isTimelinePhaseCollapsed(row.phaseKey) ? `+${getTimelinePhaseSprintCount(row.phaseKey)}` : `-${getTimelinePhaseSprintCount(row.phaseKey)}` }}
                      </button>
                    </div>
                  </div>
                </div>

                <div class="hpc-board__cell hpc-board__cell--period hpc-board__period">
                  <span>{{ formatDateRange(row.startDate, row.endDate) }}</span>
                  <strong>{{ row.progressLabel }}</strong>
                </div>

                <div class="hpc-board__timeline">
                  <div class="hpc-board__weeks" :style="timelineGridStyle">
                    <div
                      v-for="(column, columnIndex) in timelineColumns"
                      :key="`${row.id}-${column.key}`"
                      class="hpc-board__week"
                      :class="{ 'hpc-board__week--drop': timelineDrag.overColumnKey === `${row.id}-${column.key}` }"
                      @dragover.prevent="onTimelineWeekDragOver(row.id, column.key)"
                      @drop="onTimelineWeekDrop(row, columnIndex)"
                    />
                  </div>
                  <div
                    class="hpc-board__bar"
                    :class="[
                      `hpc-board__bar--${row.tone}`,
                      { 'hpc-board__bar--active': isTimelineRowSelected(row) },
                    ]"
                    :style="getTimelineBarStyle(row)"
                  >
                    <button
                      class="hpc-board__bar-handle hpc-board__bar-handle--start"
                      type="button"
                      :disabled="!timelineEditingEnabled"
                      :aria-label="`Сдвинуть начало ${row.title}`"
                      :draggable="timelineEditingEnabled"
                      @click.stop
                      @dragstart.stop="onResizeDragStart($event, row, 'start')"
                      @dragend="onDragEnd"
                    />
                    <button
                      class="hpc-board__bar-move"
                      type="button"
                      :disabled="!timelineEditingEnabled"
                      :aria-label="`Сдвинуть ${row.title}`"
                      :draggable="timelineEditingEnabled"
                      @click.stop
                      @dragstart.stop="onScheduleDragStart($event, row)"
                      @dragend="onDragEnd"
                    >
                      ::
                    </button>
                    <button
                      class="hpc-board__bar-body"
                      type="button"
                      :aria-label="`Открыть детали ${row.title}`"
                      @pointerenter="scheduleTimelineTooltip($event, row)"
                      @pointerleave="hideTimelineTooltip"
                      @focus="scheduleTimelineTooltip($event, row)"
                      @blur="hideTimelineTooltip"
                      @click.stop="openTimelineRowDetails(row)"
                    >
                      <span class="hpc-board__bar-label">{{ row.title }}</span>
                    </button>
                    <button
                      class="hpc-board__bar-handle hpc-board__bar-handle--end"
                      type="button"
                      :disabled="!timelineEditingEnabled"
                      :aria-label="`Сдвинуть окончание ${row.title}`"
                      :draggable="timelineEditingEnabled"
                      @click.stop
                      @dragstart.stop="onResizeDragStart($event, row, 'end')"
                      @dragend="onDragEnd"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <GlassSurface v-if="selectedTimelineRowDetails" class="hpc-timeline-details-modal glass-surface">
          <div class="hpc-timeline-details-modal__head">
            <div class="hpc-timeline-details-modal__title-wrap">
              <p class="hpc-timeline-details-modal__eyebrow">{{ selectedTimelineRowDetails.typeLabel }}</p>
              <h4 class="hpc-section__title hpc-timeline-details-modal__title">{{ selectedTimelineRowDetails.title }}</h4>
              <p class="hpc-recommendation-text">{{ selectedTimelineRowDetails.meta }}</p>
            </div>
            <GlassButton variant="secondary" density="compact" class="hpc-timeline-details-modal__close" @click="closeTimelineRowDetails">Закрыть</GlassButton>
          </div>

          <div v-if="selectedTimelineDetailCards.length" class="hpc-grid hpc-grid--top">
            <div v-for="card in selectedTimelineDetailCards" :key="card.label" class="hpc-timeline-detail-field">
              <span class="hpc-timeline-detail-field__label">{{ card.label }}</span>
              <strong class="hpc-timeline-detail-field__value">{{ card.value }}</strong>
            </div>
          </div>

          <p v-if="timelineScopeDetailPending" class="hpc-timeline-empty">Загружаю детали контура…</p>
          <p v-else-if="timelineScopeDetailError" class="hpc-timeline-empty hpc-timeline-empty--error">{{ timelineScopeDetailError }}</p>

          <div class="hpc-timeline-clusters">
            <section class="hpc-timeline-cluster">
              <div class="hpc-timeline-cluster__head">
                <p class="hpc-summary__label">Субъекты</p>
                <span class="hpc-chip">{{ timelineDetailSubjects.length }}</span>
              </div>
              <div v-if="timelineDetailSubjects.length" class="hpc-timeline-cluster__list">
                <article v-for="item in timelineDetailSubjects" :key="item.key" class="hpc-timeline-cluster__item">
                  <span class="hpc-timeline-cluster__label">{{ item.label }}</span>
                  <strong class="hpc-timeline-cluster__value">{{ item.value }}</strong>
                </article>
              </div>
              <p v-else class="hpc-timeline-empty">Связанные участники пока не назначены.</p>
            </section>

            <section v-if="timelineScopeDetail" class="hpc-timeline-cluster hpc-timeline-cluster--governance">
              <div class="hpc-timeline-cluster__head">
                <p class="hpc-summary__label">Управление участниками</p>
                <span class="hpc-chip">{{ timelineGovernanceParticipants.length }}</span>
              </div>

              <div v-if="timelineGovernanceParticipants.length" class="hpc-timeline-governance-list">
                <article v-for="participant in timelineGovernanceParticipants" :key="participant.assignmentId" class="hpc-timeline-governance-card">
                  <div class="hpc-timeline-governance-card__head">
                    <div>
                      <strong class="hpc-timeline-governance-card__title">{{ participant.displayName }}</strong>
                      <p class="hpc-recommendation-text">{{ participant.roleLabel }} · {{ participant.responsibilityLabel }}</p>
                    </div>
                    <span class="hpc-chip">{{ participant.originLabel }}</span>
                  </div>

                  <p v-if="participant.secondary" class="hpc-recommendation-text">{{ participant.secondary }}</p>

                  <div v-if="participant.editable" class="hpc-timeline-governance-card__controls">
                    <div class="u-field">
                      <label class="u-field__label">Ответственность</label>
                      <select class="u-status-sel" :value="participant.responsibility" :disabled="timelineGovernancePending" @change="handleTimelineGovernanceResponsibilityChange(participant.assignmentId, $event)">
                        <option v-for="option in projectGovernanceResponsibilityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                      </select>
                    </div>
                    <GlassButton variant="danger" density="compact" type="button" :disabled="timelineGovernancePending" @click="deleteTimelineGovernanceAssignment(participant.assignmentId)">
                      убрать
                    </GlassButton>
                  </div>
                </article>
              </div>
              <p v-else class="hpc-timeline-empty">Для этого контура ещё нет прямых назначений.</p>

              <div class="hpc-grid hpc-grid--top hpc-timeline-governance-form">
                <div class="u-field">
                  <label class="u-field__label">Имя участника</label>
                  <GlassInput v-model="timelineGovernanceParticipantDraft.displayName" placeholder="Например, юрист проекта" :disabled="timelineGovernancePending" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Роль</label>
                  <select v-model="timelineGovernanceParticipantDraft.roleKey" class="u-status-sel" :disabled="timelineGovernancePending">
                    <option v-for="option in projectParticipantRoleOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Ответственность</label>
                  <select v-model="timelineGovernanceParticipantDraft.responsibility" class="u-status-sel" :disabled="timelineGovernancePending">
                    <option v-for="option in projectGovernanceResponsibilityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </div>
                <div class="u-field u-field--actions">
                  <label class="u-field__label">Добавление</label>
                  <GlassButton variant="primary" density="compact" type="button" :disabled="!canCreateTimelineGovernanceParticipant" @click="createTimelineGovernanceParticipant">
                    добавить в контур
                  </GlassButton>
                </div>
              </div>

              <p v-if="timelineGovernanceError" class="hpc-timeline-empty hpc-timeline-empty--error">{{ timelineGovernanceError }}</p>
              <p v-else-if="timelineGovernanceNotice" class="hpc-recommendation-text">{{ timelineGovernanceNotice }}</p>
            </section>

            <section class="hpc-timeline-cluster">
              <div class="hpc-timeline-cluster__head">
                <p class="hpc-summary__label">Объекты</p>
                <span class="hpc-chip">{{ timelineDetailObjects.length }}</span>
              </div>
              <div v-if="timelineDetailObjects.length" class="hpc-timeline-cluster__list">
                <article v-for="item in timelineDetailObjects" :key="item.key" class="hpc-timeline-cluster__item">
                  <span class="hpc-timeline-cluster__label">{{ item.label }}</span>
                  <strong class="hpc-timeline-cluster__value">{{ item.value }}</strong>
                </article>
              </div>
              <p v-else class="hpc-timeline-empty">Связанные объекты еще не описаны.</p>
            </section>

            <section class="hpc-timeline-cluster">
              <div class="hpc-timeline-cluster__head">
                <p class="hpc-summary__label">Настройки</p>
                <span class="hpc-chip">{{ timelineDetailSettings.length }}</span>
              </div>
              <div v-if="timelineDetailSettings.length" class="hpc-timeline-cluster__list">
                <article v-for="item in timelineDetailSettings" :key="item.key" class="hpc-timeline-cluster__item">
                  <span class="hpc-timeline-cluster__label">{{ item.label }}</span>
                  <strong class="hpc-timeline-cluster__value">{{ item.value }}</strong>
                </article>
              </div>
              <p v-else class="hpc-timeline-empty">Для этого контура дополнительные настройки пока не заданы.</p>
            </section>

            <section v-if="timelineGovernanceEditableSettings.length" class="hpc-timeline-cluster hpc-timeline-cluster--governance">
              <div class="hpc-timeline-cluster__head">
                <p class="hpc-summary__label">Редактирование настроек</p>
                <span class="hpc-chip">{{ timelineGovernanceEditableSettings.length }}</span>
              </div>

              <div class="hpc-grid hpc-grid--top hpc-timeline-governance-settings">
                <div v-for="field in timelineGovernanceEditableSettings" :key="field.key" class="u-field">
                  <label class="u-field__label">{{ field.label }}</label>

                  <select
                    v-if="field.kind === 'select'"
                    class="u-status-sel"
                    :value="field.value == null ? '' : String(field.value)"
                    :disabled="timelineGovernancePending"
                    @change="handleTimelineGovernanceSelectSettingChange(field.key, $event)"
                  >
                    <option v-for="option in communicationChannelOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>

                  <label v-else-if="field.kind === 'boolean'" class="hpc-timeline-governance-toggle">
                    <input
                      :checked="Boolean(field.value)"
                      type="checkbox"
                      :disabled="timelineGovernancePending"
                      @change="handleTimelineGovernanceBooleanSettingChange(field.key, $event)"
                    />
                    <span>{{ Boolean(field.value) ? 'Включено' : 'Выключено' }}</span>
                  </label>

                  <input
                    v-else
                    class="glass-input"
                    :type="field.kind === 'number' ? 'number' : 'text'"
                    :value="field.value == null ? '' : String(field.value)"
                    :disabled="timelineGovernancePending"
                    @input="handleTimelineGovernanceTextSettingInput(field.key, field.kind, $event)"
                    @blur="commitTimelineGovernanceSettings()"
                  />

                  <span class="hpc-recommendation-text">{{ field.kind === 'list' ? 'Список через запятую' : 'Изменения отправляются сразу' }}</span>
                </div>
              </div>
            </section>

            <section class="hpc-timeline-cluster">
              <div class="hpc-timeline-cluster__head">
                <p class="hpc-summary__label">Связанные контуры</p>
                <span class="hpc-chip">{{ timelineDetailLinkedScopes.length }}</span>
              </div>
              <div v-if="timelineDetailLinkedScopes.length" class="hpc-timeline-cluster__list">
                <article v-for="item in timelineDetailLinkedScopes" :key="item.key" class="hpc-timeline-cluster__item">
                  <span class="hpc-timeline-cluster__label">{{ item.label }}</span>
                  <strong class="hpc-timeline-cluster__value">{{ item.value }}</strong>
                </article>
              </div>
              <p v-else class="hpc-timeline-empty">Связанные контуры пока не определены.</p>
            </section>

            <section class="hpc-timeline-cluster hpc-timeline-cluster--actions">
              <div class="hpc-timeline-cluster__head">
                <p class="hpc-summary__label">Действия</p>
                <span class="hpc-chip">{{ timelineDetailActions.length }}</span>
              </div>
              <ul v-if="timelineDetailActions.length" class="hpc-timeline-action-list">
                <li v-for="item in timelineDetailActions" :key="item.key" class="hpc-timeline-action-item">
                  <span class="hpc-timeline-action-item__title">{{ item.label }}</span>
                  <span class="hpc-timeline-action-item__meta">{{ item.value }}</span>
                </li>
              </ul>
              <p v-else class="hpc-timeline-empty">Следующие действия пока не сформированы.</p>
            </section>
          </div>

          <div class="hpc-timeline-meta">
            <p class="hpc-summary__label">Контур коммуникации</p>
            <div v-if="timelineDetailRules.length" class="hpc-timeline-rule-list">
              <article v-for="rule in timelineDetailRules" :key="rule.id" class="hpc-timeline-rule-card">
                <div class="hpc-timeline-rule-card__head">
                  <strong class="hpc-timeline-rule-card__title">{{ rule.title }}</strong>
                  <span class="hpc-chip">{{ rule.channel }}</span>
                </div>
                <p class="hpc-timeline-rule-card__copy">{{ rule.trigger }}</p>
                <p class="hpc-timeline-rule-card__meta">{{ rule.audience }}</p>
              </article>
            </div>
            <p v-else class="hpc-timeline-empty">Для этого контура нет отдельного правила коммуникации.</p>
          </div>

          <div v-if="timelineDetailTasks.length" class="hpc-timeline-meta">
            <p class="hpc-summary__label">Задачи спринта</p>
            <ul class="hpc-timeline-task-list">
              <li v-for="task in timelineDetailTasks" :key="task.id" class="hpc-timeline-task-item">
                <div>
                  <strong class="hpc-timeline-task-item__title">{{ task.title }}</strong>
                  <span class="hpc-timeline-task-item__meta">{{ task.meta }}</span>
                </div>
                <div class="hpc-timeline-task-item__actions">
                  <GlassButton variant="secondary" density="compact" type="button" @click="openTaskScopeDetails(task.scopeId, task.sprintId)">контур</GlassButton>
                  <GlassButton variant="secondary" density="compact" type="button" @click="openTimelineTask(task.id, task.sprintId)">к задаче</GlassButton>
                </div>
              </li>
            </ul>
          </div>

          <div class="hpc-timeline-actions">
            <GlassButton
              v-if="selectedTimelineRowDetails.type === 'sprint'"
              variant="primary"
              density="compact"
              type="button"
              @click="emit('open-timeline-sprint-in-kanban', selectedTimelineRowDetails.id)"
            >
              В Канбан
            </GlassButton>
            <GlassButton
              v-if="selectedTimelineRowDetails.type === 'phase'"
              variant="primary"
              density="compact"
              type="button"
              @click="openTimelinePhaseEditor"
            >
              Настройки фазы
            </GlassButton>
            <GlassButton
              v-if="selectedTimelineRowDetails.scopeType === 'task'"
              variant="secondary"
              density="compact"
              type="button"
              @click="openTimelineTask(selectedTimelineRowDetails.id, selectedTimelineTaskSprintId)"
            >
              К задаче
            </GlassButton>
          </div>
        </GlassSurface>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import {
  addTimelineDays,
  buildHybridTimelineBounds,
  buildHybridTimelineColumns,
  buildHybridTimelineGroups,
  buildHybridTimelineRows,
  endOfHybridTimelineScale,
  formatHybridTimelineDateRange,
  getHybridTimelineBarStyle,
  getHybridTimelineColumnWidth,
  getHybridTimelineScaleLabel,
  resolveHybridTimelineRowRange,
  toIsoLocalDate,
  type HybridTimelineScale,
  type HybridTimelineRow,
} from '~~/shared/utils/project-control-timeline'
import {
  PROJECT_PARTICIPANT_ROLE_KEYS,
  PROJECT_RESPONSIBILITY_KEYS,
  type ProjectParticipantRoleKey,
  type ProjectResponsibilityKey,
  type ProjectScopeType,
} from '~~/shared/types/project-governance'
import {
  getProjectParticipantRoleLabel,
  getProjectResponsibilityLabel,
} from '~~/shared/utils/project-governance'
import {
  getHybridCommunicationChannelLabel,
  getHybridStakeholderRoleLabel,
} from '~~/shared/utils/project-control'
import type {
  HybridControl,
  HybridControlCommunicationChannel,
  HybridControlStakeholderRole,
  HybridControlTask,
} from '~~/shared/types/project'
import type { ProjectScopeDetailBundle } from '~~/shared/types/project-governance'

type TimelineDetailItem = {
  key: string
  label: string
  value: string
}

type TimelineRuleSummary = {
  id: string
  title: string
  channel: string
  trigger: string
  audience: string
}

type SelectedTimelineRowState = {
  id: string
  scopeType: ProjectScopeType
  scopeId: string
  type: ProjectScopeType
  typeLabel: string
  title: string
  meta: string
  startDate?: string
  endDate?: string
  progressLabel?: string
  statusLabel?: string
  phaseKey?: string
  linkedPhaseKey?: string
  sprintId?: string
  taskId?: string
}

type TimelineDetailTaskItem = {
  id: string
  scopeId: string
  title: string
  meta: string
  sprintId: string
}

type TimelineGovernanceParticipantDraft = {
  displayName: string
  roleKey: ProjectParticipantRoleKey
  responsibility: ProjectResponsibilityKey
}

type TimelineGovernanceSettingFieldKind = 'select' | 'number' | 'boolean' | 'list' | 'text'

type TimelineGovernanceMutationResponse = {
  participant: {
    persistedId: number
  }
}

type SaveOptions = {
  refreshAfter?: boolean
}

const props = defineProps<{
  control: HybridControl
  slug: string
  projectTitle: string
  projectStatus: string
  summary: {
    activePhase: { title?: string } | null
    activeSprint: { name?: string } | null
  }
}>()

const emit = defineEmits<{
  save: [options?: SaveOptions]
  'open-timeline-sprint-in-kanban': [sprintId: string]
  'open-timeline-phase-editor': []
  'focus-task': [taskId: string, sprintId?: string]
  'open-task-scope-details': [taskId: string, sprintId?: string]
}>()

// ---- Options ----
const communicationChannelOptions = (
  ['project-room', 'direct-thread', 'handoff', 'approval', 'daily-digest'] as const satisfies readonly HybridControlCommunicationChannel[]
).map(value => ({
  value,
  label: getHybridCommunicationChannelLabel(value),
}))

const projectParticipantRoleOptions = PROJECT_PARTICIPANT_ROLE_KEYS.map(value => ({
  value,
  label: getProjectParticipantRoleLabel(value),
}))

const projectGovernanceResponsibilityOptions = PROJECT_RESPONSIBILITY_KEYS.map(value => ({
  value,
  label: getProjectResponsibilityLabel(value),
}))

const timelineGovernanceSettingOrder = [
  'communicationChannel',
  'approvalMode',
  'visibility',
  'requiredResponsibilities',
  'reviewCadenceDays',
  'reminderCadenceDays',
  'slaHours',
  'escalateOnBlocked',
] as const

const timelineGovernanceSettingLabels: Record<string, string> = {
  communicationChannel: 'Канал коммуникации',
  approvalMode: 'Режим согласования',
  visibility: 'Видимость',
  requiredResponsibilities: 'Обязательные роли',
  reviewCadenceDays: 'Ревью, дней',
  reminderCadenceDays: 'Напоминание, дней',
  slaHours: 'SLA, часов',
  escalateOnBlocked: 'Эскалация при блокере',
}

const timelineGovernanceOriginLabels: Record<ProjectScopeDetailBundle['participants'][number]['origin'], string> = {
  direct: 'контур',
  project: 'проект',
  derived: 'legacy',
}

const timelineScopeTypeLabels = {
  project: 'Проект',
  phase: 'Фаза',
  sprint: 'Спринт',
  task: 'Задача',
  document: 'Документ',
  service: 'Услуга',
} as const

const taskStatusLabels: Record<HybridControlTask['status'], string> = {
  todo: 'к запуску',
  doing: 'в работе',
  review: 'на ревью',
  done: 'готово',
}

const checkpointStatusLabels: Record<string, string> = {
  stable: 'стабильно',
  warning: 'внимание',
  critical: 'критично',
}

// ---- Timeline scale ----
type TimelineDragKind = 'idle' | 'reorder' | 'schedule' | 'resize-start' | 'resize-end'

const timelineScale = ref<HybridTimelineScale>('weeks')

const timelineScaleOptions = (
  ['months', 'weeks', 'days', 'hours'] as const satisfies readonly HybridTimelineScale[]
).map(value => ({ value, label: getHybridTimelineScaleLabel(value) }))

// ---- Drag state ----
const timelineDrag = reactive<{
  kind: TimelineDragKind
  rowId: string
  rowType: HybridTimelineRow['type'] | null
  overRowId: string
  overColumnKey: string
}>({
  kind: 'idle',
  rowId: '',
  rowType: null,
  overRowId: '',
  overColumnKey: '',
})

// ---- Collapsed phases ----
const timelineCollapsedPhases = reactive<Record<string, boolean>>({})

watch(() => props.control.phases.map(phase => phase.phaseKey), (phaseKeys) => {
  const activeKeys = new Set(phaseKeys)

  phaseKeys.forEach((phaseKey) => {
    if (!(phaseKey in timelineCollapsedPhases)) {
      timelineCollapsedPhases[phaseKey] = false
    }
  })

  Object.keys(timelineCollapsedPhases).forEach((phaseKey) => {
    if (!activeKeys.has(phaseKey)) {
      delete timelineCollapsedPhases[phaseKey]
    }
  })
}, { immediate: true })

// ---- Scope detail state ----
const selectedTimelineRowState = ref<SelectedTimelineRowState | null>(null)
const timelineScopeDetail = ref<ProjectScopeDetailBundle | null>(null)
const timelineScopeDetailPending = ref(false)
const timelineScopeDetailError = ref('')
const timelineScopeDetailRequestId = ref(0)
const timelineGovernancePending = ref(false)
const timelineGovernanceError = ref('')
const timelineGovernanceNotice = ref('')
const timelineGovernanceSettingsDraft = ref<Record<string, unknown>>({})
const timelineGovernanceParticipantDraft = reactive<TimelineGovernanceParticipantDraft>({
  displayName: '',
  roleKey: 'manager',
  responsibility: 'owner',
})

// ---- Tooltip ----
const timelineTooltip = ref({
  visible: false,
  content: '',
  left: 0,
  top: 0,
  maxWidth: 280,
})

let timelineTooltipTimer: number | null = null

// ---- Computed timeline data ----
const timelineRows = computed(() => buildHybridTimelineRows(props.control))

const timelineSprintCountByPhase = computed(() => props.control.sprints.reduce<Record<string, number>>((acc, sprint) => {
  if (!sprint.linkedPhaseKey) return acc
  acc[sprint.linkedPhaseKey] = (acc[sprint.linkedPhaseKey] || 0) + 1
  return acc
}, {}))

const collapsibleTimelinePhaseKeys = computed(() => Object.entries(timelineSprintCountByPhase.value)
  .filter(([, count]) => count > 0)
  .map(([phaseKey]) => phaseKey))

const hasCollapsibleTimelinePhases = computed(() => collapsibleTimelinePhaseKeys.value.length > 0)

const allTimelinePhasesCollapsed = computed(() => hasCollapsibleTimelinePhases.value
  && collapsibleTimelinePhaseKeys.value.every(phaseKey => timelineCollapsedPhases[phaseKey]))

const visibleTimelineRows = computed(() => timelineRows.value.filter((row) => {
  if (row.type === 'phase') return true
  if (!row.linkedPhaseKey) return true
  return !timelineCollapsedPhases[row.linkedPhaseKey]
}))

const timelineBounds = computed(() => buildHybridTimelineBounds(timelineRows.value, timelineScale.value))
const timelineColumns = computed(() => buildHybridTimelineColumns(timelineBounds.value, timelineScale.value))
const timelineGroups = computed(() => buildHybridTimelineGroups(timelineColumns.value, timelineScale.value))

const timelineGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(timelineColumns.value.length, 1)}, minmax(0, 1fr))`,
}))

const timelineEditingEnabled = computed(() => timelineScale.value !== 'hours')
const timelineBoardStyle = computed(() => ({
  '--hpc-entity-column-width': '220px',
  '--hpc-period-column-width': '148px',
  minWidth: `${368 + Math.max(timelineColumns.value.length, 1) * getHybridTimelineColumnWidth(timelineScale.value)}px`,
}))

const timelineWindowLabel = computed(() => `${toIsoLocalDate(timelineBounds.value.start)} - ${toIsoLocalDate(timelineBounds.value.end)}`)

const timelineStats = computed(() => ([
  { label: 'Период', value: timelineWindowLabel.value },
  { label: 'Строк', value: `${visibleTimelineRows.value.length}` },
  { label: 'Фаз', value: `${props.control.phases.length}` },
  { label: 'Спринтов', value: `${props.control.sprints.length}` },
]))

const selectedTimelineRowDetails = computed<SelectedTimelineRowState | null>(() => selectedTimelineRowState.value)

const selectedTimelinePhase = computed(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected || selected.scopeType !== 'phase') return null
  return getPhaseById(selected.id) || props.control.phases.find(phase => phase.phaseKey === selected.phaseKey) || null
})

const selectedTimelineSprint = computed(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected || selected.scopeType !== 'sprint') return null
  return getSprintById(selected.id)
})

const selectedTimelineTaskSprintId = computed(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected || selected.scopeType !== 'task') return ''
  return selected.sprintId || ''
})

const selectedTimelineDetailCards = computed(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected) return [] as Array<{ label: string; value: string }>

  const cards: Array<{ label: string; value: string }> = []

  if (selected.startDate || selected.endDate) {
    cards.push({
      label: 'Период',
      value: formatDateRange(selected.startDate, selected.endDate),
    })
  }

  if (selected.progressLabel) {
    cards.push({
      label: 'Прогресс',
      value: selected.progressLabel,
    })
  }

  const resolvedStatusLabel = timelineScopeDetail.value?.scope.statusLabel || selected.statusLabel
  if (resolvedStatusLabel) {
    cards.push({
      label: 'Статус',
      value: resolvedStatusLabel,
    })
  }

  return cards
})

function mapTimelineDetailItems(items: Array<{ key: string; label: string; value: string }>): TimelineDetailItem[] {
  return items.map(item => ({
    key: item.key,
    label: item.label,
    value: item.value,
  }))
}

const timelineDetailRules = computed<TimelineRuleSummary[]>(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected) return []

  if (timelineScopeDetail.value) {
    return timelineScopeDetail.value.ruleItems.map(rule => ({
      id: rule.id,
      title: rule.title,
      channel: rule.channel,
      trigger: rule.trigger,
      audience: rule.audience,
    }))
  }

  const selectedPhaseKey = selected.type === 'phase'
    ? selected.phaseKey
    : selected.linkedPhaseKey

  return props.control.communicationPlaybook.slice(0, 4).map(rule => ({
    id: rule.id,
    title: rule.title,
    channel: getHybridCommunicationChannelLabel(rule.linkedChannel),
    trigger: rule.trigger,
    audience: rule.audience.length
      ? rule.audience.map(getHybridStakeholderRoleLabel).join(' · ')
      : (selectedPhaseKey ? `Контур ${getPhaseTitleByKey(selectedPhaseKey)}` : 'Общий контур'),
  }))
})

const timelineDetailSubjects = computed<TimelineDetailItem[]>(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected) return []

  if (timelineScopeDetail.value) {
    return [
      ...timelineScopeDetail.value.participants.map(participant => ({
        key: participant.assignmentId,
        label: participant.roleLabel,
        value: [participant.displayName, participant.responsibilityLabel, participant.secondary].filter(Boolean).join(' · '),
      })),
      ...timelineScopeDetail.value.subjectItems.map(item => ({
        key: `subject-${item.key}`,
        label: item.label,
        value: item.value,
      })),
    ]
  }

  const audienceLabels = Array.from(new Set(
    props.control.communicationPlaybook.flatMap(rule => rule.audience.map(getHybridStakeholderRoleLabel)),
  ))

  if (selected.type === 'phase') {
    const phase = selectedTimelinePhase.value
    const linkedSprints = props.control.sprints.filter(sprint => sprint.linkedPhaseKey === phase?.phaseKey)
    const assignees = Array.from(new Set(
      linkedSprints.flatMap(sprint => sprint.tasks.map(task => (task.assignee || '').trim())).filter(Boolean),
    ))

    return [
      {
        key: `phase-owner-${phase?.id || selected.id}`,
        label: 'Куратор',
        value: phase?.owner || 'не назначен',
      },
      {
        key: `phase-assignees-${selected.id}`,
        label: 'Исполнители',
        value: assignees.length ? assignees.join(', ') : 'пока не назначены',
      },
      {
        key: `phase-audience-${selected.id}`,
        label: 'Аудитория',
        value: audienceLabels.length ? audienceLabels.join(' · ') : 'общий проектный контур',
      },
    ]
  }

  if (selected.scopeType !== 'sprint') {
    return []
  }

  const sprint = selectedTimelineSprint.value
  const assignees = Array.from(new Set(
    (sprint?.tasks || []).map(task => (task.assignee || '').trim()).filter(Boolean),
  ))

  return [
    {
      key: `sprint-phase-${selected.id}`,
      label: 'Фаза',
      value: getPhaseTitleByKey(sprint?.linkedPhaseKey),
    },
    {
      key: `sprint-assignees-${selected.id}`,
      label: 'Исполнители',
      value: assignees.length ? assignees.join(', ') : 'команда не назначена',
    },
    {
      key: `sprint-audience-${selected.id}`,
      label: 'Аудитория',
      value: audienceLabels.length ? audienceLabels.join(' · ') : 'без закрепленной аудитории',
    },
  ]
})

const timelineDetailObjects = computed<TimelineDetailItem[]>(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected) return []

  if (timelineScopeDetail.value) {
    return mapTimelineDetailItems(timelineScopeDetail.value.objectItems)
  }

  if (selected.type === 'phase') {
    const phase = selectedTimelinePhase.value
    const linkedSprints = props.control.sprints.filter(sprint => sprint.linkedPhaseKey === phase?.phaseKey)
    const linkedTasks = linkedSprints.flatMap(sprint => sprint.tasks)

    return [
      {
        key: `phase-deliverable-${selected.id}`,
        label: 'Результат',
        value: phase?.deliverable || 'результат не зафиксирован',
      },
      {
        key: `phase-sprints-${selected.id}`,
        label: 'Связанные спринты',
        value: linkedSprints.length ? linkedSprints.map(sprint => sprint.name).join(' · ') : 'спринты еще не привязаны',
      },
      {
        key: `phase-tasks-${selected.id}`,
        label: 'Задачи контура',
        value: linkedTasks.length ? `${linkedTasks.length} задач в связанных спринтах` : 'задачи еще не заведены',
      },
    ]
  }

  if (selected.scopeType !== 'sprint') {
    return []
  }

  const sprint = selectedTimelineSprint.value
  return [
    {
      key: `sprint-goal-${selected.id}`,
      label: 'Цель',
      value: sprint?.goal || 'цель не описана',
    },
    {
      key: `sprint-focus-${selected.id}`,
      label: 'Фокус',
      value: sprint?.focus || 'фокус команды не задан',
    },
    {
      key: `sprint-retro-${selected.id}`,
      label: 'Ретроспектива',
      value: sprint?.retrospective || 'пока без ретроспективы',
    },
  ]
})

const timelineDetailActions = computed<TimelineDetailItem[]>(() => {
  const selected = selectedTimelineRowDetails.value
  if (!selected) return []

  if (timelineScopeDetail.value) {
    return mapTimelineDetailItems(timelineScopeDetail.value.actionItems)
  }

  if (selected.type === 'phase') {
    const phase = selectedTimelinePhase.value
    const gateActions = (phase?.gates || []).map(gate => ({
      key: `gate-${gate.id}`,
      label: gate.label,
      value: gate.done ? 'готово' : 'ожидает закрытия',
    }))

    const checkpointActions = props.control.checkpoints.slice(0, 2).map(checkpoint => ({
      key: `checkpoint-${checkpoint.id}`,
      label: checkpoint.title,
      value: checkpoint.note || checkpointStatusLabels[checkpoint.status] || checkpoint.status,
    }))

    return [...gateActions, ...checkpointActions].slice(0, 6)
  }

  if (selected.scopeType !== 'sprint') {
    return []
  }

  const sprint = selectedTimelineSprint.value
  const taskActions = (sprint?.tasks || []).map(task => ({
    key: `task-${task.id}`,
    label: task.title,
    value: `${taskStatusLabels[task.status]}${task.assignee ? ` · ${task.assignee}` : ''}`,
  }))

  const projectBlockers = props.control.blockers.slice(0, 2).map((blocker, index) => ({
    key: `blocker-${selected.id}-${index}`,
    label: `Блокер ${index + 1}`,
    value: blocker,
  }))

  return [...taskActions, ...projectBlockers].slice(0, 6)
})

const timelineDetailSettings = computed<TimelineDetailItem[]>(() => {
  if (!timelineScopeDetail.value) return []
  return mapTimelineDetailItems(timelineScopeDetail.value.settingItems)
})

const timelineDetailLinkedScopes = computed<TimelineDetailItem[]>(() => {
  if (!timelineScopeDetail.value) return []

  return timelineScopeDetail.value.linkedScopes.map(linkedScope => ({
    key: `${linkedScope.scopeType}-${linkedScope.scopeId}`,
    label: timelineScopeTypeLabels[linkedScope.scopeType],
    value: [linkedScope.title, linkedScope.statusLabel || linkedScope.status].filter(Boolean).join(' · '),
  }))
})

const timelineDetailTasks = computed<TimelineDetailTaskItem[]>(() => {
  if (timelineScopeDetail.value) {
    return timelineScopeDetail.value.tasks.map(task => {
      const normalizedTaskId = normalizeTaskScopeId(task.id)
      const taskContext = getTaskContext(normalizedTaskId)

      return {
        id: normalizedTaskId,
        scopeId: task.id,
        title: task.title,
        meta: [
          task.assigneeLabels.length ? task.assigneeLabels.join(', ') : 'Исполнитель не назначен',
          task.statusLabel,
          task.secondary,
        ].filter(Boolean).join(' · '),
        sprintId: taskContext?.sprint.id || (selectedTimelineRowDetails.value?.type === 'sprint' ? selectedTimelineRowDetails.value.id : ''),
      }
    })
  }

  if (selectedTimelineRowDetails.value?.scopeType !== 'sprint') {
    return []
  }

  return (selectedTimelineSprint.value?.tasks || []).map(task => ({
    id: task.id,
    scopeId: task.id,
    title: task.title,
    meta: `${task.assignee || 'Исполнитель не назначен'} · ${taskStatusLabels[task.status]}`,
    sprintId: selectedTimelineRowDetails.value?.id || '',
  }))
})

const timelineGovernanceParticipants = computed(() => {
  return (timelineScopeDetail.value?.participants || []).map(participant => ({
    ...participant,
    editable: participant.origin === 'direct' && /^assignment:\d+$/.test(participant.assignmentId),
    originLabel: timelineGovernanceOriginLabels[participant.origin],
  }))
})

const canCreateTimelineGovernanceParticipant = computed(() => {
  return Boolean(
    timelineScopeDetail.value
    && timelineGovernanceParticipantDraft.displayName.trim()
    && !timelineGovernancePending.value,
  )
})

const timelineGovernanceEditableSettings = computed(() => {
  const detail = timelineScopeDetail.value
  if (!detail) {
    return [] as Array<{
      key: string
      label: string
      kind: TimelineGovernanceSettingFieldKind
      value: string | number | boolean | null
    }>
  }

  const labelMap = new Map(detail.settingItems.map(item => [item.key, item.label]))
  const knownKeys = timelineGovernanceSettingOrder.filter(key => key in timelineGovernanceSettingsDraft.value)
  const dynamicKeys = Object.keys(timelineGovernanceSettingsDraft.value).filter(key => !knownKeys.includes(key as typeof timelineGovernanceSettingOrder[number]))
  const keys = [...knownKeys, ...dynamicKeys]

  return keys.map((key) => {
    const rawValue = timelineGovernanceSettingsDraft.value[key]

    if (key === 'communicationChannel') {
      return {
        key,
        label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key,
        kind: 'select' as const,
        value: typeof rawValue === 'string' ? rawValue : '',
      }
    }

    if (key === 'reviewCadenceDays' || key === 'reminderCadenceDays' || key === 'slaHours') {
      return {
        key,
        label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key,
        kind: 'number' as const,
        value: typeof rawValue === 'number' ? rawValue : rawValue == null ? null : Number(rawValue),
      }
    }

    if (key === 'escalateOnBlocked') {
      return {
        key,
        label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key,
        kind: 'boolean' as const,
        value: Boolean(rawValue),
      }
    }

    if (key === 'requiredResponsibilities') {
      return {
        key,
        label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key,
        kind: 'list' as const,
        value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : '',
      }
    }

    return {
      key,
      label: labelMap.get(key) || timelineGovernanceSettingLabels[key] || key,
      kind: 'text' as const,
      value: Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : rawValue == null ? '' : String(rawValue),
    }
  })
})

const timelineTooltipStyle = computed(() => ({
  left: `${timelineTooltip.value.left}px`,
  top: `${timelineTooltip.value.top}px`,
  maxWidth: `${timelineTooltip.value.maxWidth}px`,
}))

// ---- Watch ----
watch(() => timelineScopeDetail.value?.revision, () => {
  timelineGovernanceSettingsDraft.value = cloneTimelineGovernanceSettings(timelineScopeDetail.value?.settings || {})
  timelineGovernanceError.value = ''
  timelineGovernanceNotice.value = ''
}, { immediate: true })

// ---- Helpers ----
function normalizeTaskScopeId(taskId: string) {
  return taskId.startsWith('hybrid:') ? taskId.slice('hybrid:'.length) : taskId
}

function getPhaseTitleByKey(phaseKey?: string) {
  if (!phaseKey) return 'Без привязки'
  return props.control.phases.find(phase => phase.phaseKey === phaseKey)?.title || phaseKey
}

function getPhaseById(id: string) {
  return props.control.phases.find(phase => phase.id === id) || null
}

function getSprintById(id: string) {
  return props.control.sprints.find(sprint => sprint.id === id) || null
}

function getTaskContext(taskId?: string) {
  if (!taskId) return null
  for (const sprint of props.control.sprints) {
    const task = sprint.tasks.find(item => item.id === taskId)
    if (task) return { sprint, task }
  }
  return null
}

function formatDateRange(startDate?: string, endDate?: string) {
  return formatHybridTimelineDateRange(startDate, endDate)
}

function getTimelineBarStyle(row: HybridTimelineRow) {
  return getHybridTimelineBarStyle(row, timelineBounds.value)
}

function isTimelineRowSelected(row: HybridTimelineRow) {
  return selectedTimelineRowDetails.value?.scopeId === row.id && selectedTimelineRowDetails.value?.scopeType === row.type
}

function getTimelinePhaseSprintCount(phaseKey?: string) {
  if (!phaseKey) return 0
  return timelineSprintCountByPhase.value[phaseKey] || 0
}

function isTimelinePhaseCollapsed(phaseKey?: string) {
  if (!phaseKey) return false
  return !!timelineCollapsedPhases[phaseKey]
}

function toggleTimelinePhase(phaseKey?: string) {
  if (!phaseKey || !getTimelinePhaseSprintCount(phaseKey)) return
  timelineCollapsedPhases[phaseKey] = !timelineCollapsedPhases[phaseKey]
}

function collapseAllTimelinePhases() {
  collapsibleTimelinePhaseKeys.value.forEach((phaseKey) => {
    timelineCollapsedPhases[phaseKey] = true
  })
}

function expandAllTimelinePhases() {
  collapsibleTimelinePhaseKeys.value.forEach((phaseKey) => {
    timelineCollapsedPhases[phaseKey] = false
  })
}

function toggleAllTimelinePhases() {
  if (allTimelinePhasesCollapsed.value) {
    expandAllTimelinePhases()
    return
  }
  collapseAllTimelinePhases()
}

// ---- Tooltip functions ----
function getTimelineRowTooltip(row: HybridTimelineRow) {
  return [
    row.title,
    row.typeLabel,
    `Статус: ${row.statusLabel}`,
    `Период: ${formatDateRange(row.startDate, row.endDate)}`,
    `Прогресс: ${row.progressLabel}`,
    row.meta,
  ].filter(Boolean).join('\n')
}

function clearTimelineTooltipTimer() {
  if (!timelineTooltipTimer) return
  window.clearTimeout(timelineTooltipTimer)
  timelineTooltipTimer = null
}

function scheduleTimelineTooltip(event: Event, row: HybridTimelineRow) {
  if (!import.meta.client || typeof window === 'undefined') return

  if ('pointerType' in event && (event as PointerEvent).pointerType === 'touch') {
    return
  }

  const target = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  if (!target) return

  clearTimelineTooltipTimer()
  timelineTooltip.value.visible = false

  timelineTooltipTimer = window.setTimeout(() => {
    const rect = target.getBoundingClientRect()
    const maxWidth = Math.min(320, Math.max(220, window.innerWidth - 24))
    const left = Math.min(
      Math.max(12, rect.left),
      Math.max(12, window.innerWidth - maxWidth - 12),
    )

    timelineTooltip.value = {
      visible: true,
      content: getTimelineRowTooltip(row),
      left,
      top: Math.max(20, rect.top - 12),
      maxWidth,
    }
  }, 1000)
}

function hideTimelineTooltip() {
  clearTimelineTooltipTimer()
  timelineTooltip.value.visible = false
}

onBeforeUnmount(() => {
  clearTimelineTooltipTimer()
})

// ---- Drag functions ----
function onReorderDragStart(event: DragEvent, row: HybridTimelineRow) {
  if (!timelineEditingEnabled.value) return
  timelineDrag.kind = 'reorder'
  timelineDrag.rowId = row.id
  timelineDrag.rowType = row.type
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'reorder', rowId: row.id, rowType: row.type }))
  }
}

function onScheduleDragStart(event: DragEvent, row: HybridTimelineRow) {
  if (!timelineEditingEnabled.value) return
  timelineDrag.kind = 'schedule'
  timelineDrag.rowId = row.id
  timelineDrag.rowType = row.type
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'schedule', rowId: row.id, rowType: row.type }))
  }
}

function onResizeDragStart(event: DragEvent, row: HybridTimelineRow, edge: 'start' | 'end') {
  if (!timelineEditingEnabled.value) return
  timelineDrag.kind = edge === 'start' ? 'resize-start' : 'resize-end'
  timelineDrag.rowId = row.id
  timelineDrag.rowType = row.type
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ kind: timelineDrag.kind, rowId: row.id, rowType: row.type }))
  }
}

function onRowDragOver(rowId: string) {
  if (!timelineEditingEnabled.value) return
  if (timelineDrag.kind !== 'reorder') return
  timelineDrag.overRowId = rowId
}

function onTimelineWeekDragOver(rowId: string, columnKey: string) {
  if (!timelineEditingEnabled.value) return
  if (!['schedule', 'resize-start', 'resize-end'].includes(timelineDrag.kind)) return
  timelineDrag.overColumnKey = `${rowId}-${columnKey}`
}

function reorderItems<T extends { id: string }>(items: T[], sourceId: string, targetId: string) {
  const sourceIndex = items.findIndex(item => item.id === sourceId)
  const targetIndex = items.findIndex(item => item.id === targetId)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return false
  const [moved] = items.splice(sourceIndex, 1)
  if (!moved) return false
  items.splice(targetIndex, 0, moved)
  return true
}

async function onRowDrop(target: HybridTimelineRow) {
  if (timelineDrag.kind !== 'reorder' || !timelineDrag.rowId || timelineDrag.rowId === target.id) {
    onDragEnd()
    return
  }

  let changed = false

  if (timelineDrag.rowType === 'phase' && target.type === 'phase') {
    changed = reorderItems(props.control.phases, timelineDrag.rowId, target.id)
  }

  if (timelineDrag.rowType === 'sprint') {
    const sourceSprint = getSprintById(timelineDrag.rowId)
    if (sourceSprint) {
      if (target.type === 'phase' && target.phaseKey) {
        sourceSprint.linkedPhaseKey = target.phaseKey
        changed = true
      }
      if (target.type === 'sprint') {
        sourceSprint.linkedPhaseKey = target.linkedPhaseKey || sourceSprint.linkedPhaseKey
      }
      changed = reorderItems(props.control.sprints, timelineDrag.rowId, target.id) || changed
    }
  }

  onDragEnd()
  if (changed) emit('save', { refreshAfter: false })
}

async function onTimelineWeekDrop(row: HybridTimelineRow, columnIndex: number) {
  if (!timelineEditingEnabled.value) {
    onDragEnd()
    return
  }
  if (!['schedule', 'resize-start', 'resize-end'].includes(timelineDrag.kind) || timelineDrag.rowId !== row.id || timelineDrag.rowType !== row.type) {
    onDragEnd()
    return
  }

  const column = timelineColumns.value[columnIndex]
  if (!column) {
    onDragEnd()
    return
  }

  const range = resolveHybridTimelineRowRange(row)
  const durationDays = Math.max(Math.round((range.end.getTime() - range.start.getTime()) / 86400000), 0)
  const nextStart = new Date(column.start)
  const nextEnd = addTimelineDays(nextStart, durationDays)

  if (timelineDrag.kind === 'resize-start') {
    const resizedEnd = new Date(range.end)
    const resizedStart = nextStart.getTime() > resizedEnd.getTime() ? resizedEnd : nextStart
    await persistTimelineRange(row, resizedStart, resizedEnd)
    onDragEnd()
    return
  }

  if (timelineDrag.kind === 'resize-end') {
    const resizedStart = new Date(range.start)
    const droppedWeekEnd = endOfHybridTimelineScale(nextStart, timelineScale.value)
    const resizedEnd = droppedWeekEnd.getTime() < resizedStart.getTime() ? resizedStart : droppedWeekEnd
    await persistTimelineRange(row, resizedStart, resizedEnd)
    onDragEnd()
    return
  }

  await persistTimelineRange(row, nextStart, nextEnd)
  onDragEnd()
}

async function persistTimelineRange(row: HybridTimelineRow, start: Date, end: Date) {
  if (row.type === 'phase') {
    const phase = getPhaseById(row.id)
    if (!phase) return
    phase.startDate = toIsoLocalDate(start)
    phase.endDate = toIsoLocalDate(end)
    emit('save', { refreshAfter: false })
    return
  }

  const sprint = getSprintById(row.id)
  if (!sprint) return
  sprint.startDate = toIsoLocalDate(start)
  sprint.endDate = toIsoLocalDate(end)
  emit('save', { refreshAfter: false })
}

function onDragEnd() {
  timelineDrag.kind = 'idle'
  timelineDrag.rowId = ''
  timelineDrag.rowType = null
  timelineDrag.overRowId = ''
  timelineDrag.overColumnKey = ''
}

// ---- Governance functions ----
function cloneTimelineGovernanceSettings(settings: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(settings || {})) as Record<string, unknown>
}

function normalizeTimelineGovernanceError(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') {
    return fallback
  }

  const record = error as {
    statusMessage?: string
    message?: string
    data?: { statusMessage?: string; message?: string }
  }

  return String(record.data?.statusMessage || record.statusMessage || record.data?.message || record.message || fallback).trim() || fallback
}

function extractTimelineGovernanceAssignmentId(assignmentId: string) {
  const match = assignmentId.match(/^assignment:(\d+)$/)
  return match ? Number(match[1]) : 0
}

function normalizeTimelineGovernanceSettingValue(kind: TimelineGovernanceSettingFieldKind, value: unknown) {
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

function updateTimelineGovernanceSettingDraft(key: string, kind: TimelineGovernanceSettingFieldKind, value: unknown) {
  timelineGovernanceSettingsDraft.value = {
    ...timelineGovernanceSettingsDraft.value,
    [key]: normalizeTimelineGovernanceSettingValue(kind, value),
  }
}

async function refreshTimelineGovernanceView(refreshControl = false) {
  const selectedRow = selectedTimelineRowDetails.value
  const jobs: Array<Promise<unknown>> = []

  if (selectedRow) {
    jobs.push(fetchTimelineScopeDetail(selectedRow))
  }

  if (refreshControl) {
    emit('save', { refreshAfter: true })
  }

  if (!jobs.length) {
    return
  }

  await Promise.allSettled(jobs)
}

async function runTimelineGovernanceMutation(
  execute: () => Promise<void>,
  successMessage: string,
  refreshControl = false,
  fallbackMessage = 'Не удалось обновить контур проекта.',
) {
  timelineGovernancePending.value = true
  timelineGovernanceError.value = ''
  timelineGovernanceNotice.value = ''

  try {
    await execute()
    await refreshTimelineGovernanceView(refreshControl)
    timelineGovernanceNotice.value = successMessage
    return true
  } catch (error) {
    timelineGovernanceError.value = normalizeTimelineGovernanceError(error, fallbackMessage)
    return false
  } finally {
    timelineGovernancePending.value = false
  }
}

async function createTimelineGovernanceParticipant() {
  const detail = timelineScopeDetail.value
  const displayName = timelineGovernanceParticipantDraft.displayName.trim()

  if (!detail || !displayName) {
    timelineGovernanceError.value = 'Сначала откройте контур и заполните имя участника.'
    return
  }

  await runTimelineGovernanceMutation(async () => {
    const participantResponse = await $fetch<TimelineGovernanceMutationResponse>(`/api/projects/${props.slug}/coordination/participants`, {
      method: 'POST',
      body: {
        displayName,
        roleKey: timelineGovernanceParticipantDraft.roleKey,
        sourceKind: 'custom',
      },
    })

    await $fetch(`/api/projects/${props.slug}/coordination/assignments`, {
      method: 'POST',
      body: {
        participantId: participantResponse.participant.persistedId,
        scopeType: detail.scope.scopeType,
        scopeSource: detail.scope.scopeSource,
        scopeId: detail.scope.scopeId,
        responsibility: timelineGovernanceParticipantDraft.responsibility,
      },
    })

    timelineGovernanceParticipantDraft.displayName = ''
  }, 'Участник добавлен в контур.', true, 'Не удалось добавить участника в контур.')
}

async function updateTimelineGovernanceAssignment(assignmentId: string, responsibility: ProjectResponsibilityKey) {
  const persistedAssignmentId = extractTimelineGovernanceAssignmentId(assignmentId)
  if (!persistedAssignmentId) {
    timelineGovernanceError.value = 'Не удалось определить назначение для обновления.'
    return
  }

  await runTimelineGovernanceMutation(async () => {
    await $fetch(`/api/projects/${props.slug}/coordination/assignments/${persistedAssignmentId}`, {
      method: 'PATCH',
      body: { responsibility },
    })
  }, 'Назначение обновлено.', true, 'Не удалось обновить назначение.')
}

async function deleteTimelineGovernanceAssignment(assignmentId: string) {
  const persistedAssignmentId = extractTimelineGovernanceAssignmentId(assignmentId)
  if (!persistedAssignmentId) {
    timelineGovernanceError.value = 'Не удалось определить назначение для удаления.'
    return
  }

  await runTimelineGovernanceMutation(async () => {
    await $fetch(`/api/projects/${props.slug}/coordination/assignments/${persistedAssignmentId}`, {
      method: 'DELETE',
    })
  }, 'Назначение удалено.', true, 'Не удалось удалить назначение.')
}

async function commitTimelineGovernanceSettings() {
  const detail = timelineScopeDetail.value
  if (!detail) {
    return
  }

  await runTimelineGovernanceMutation(async () => {
    await $fetch(`/api/projects/${props.slug}/coordination/scopes/${detail.scope.scopeType}/${encodeURIComponent(detail.scope.scopeId)}/settings`, {
      method: 'PATCH',
      body: {
        settings: cloneTimelineGovernanceSettings(timelineGovernanceSettingsDraft.value),
      },
    })
  }, 'Настройки контура обновлены.', false, 'Не удалось обновить настройки контура.')
}

function handleTimelineGovernanceResponsibilityChange(assignmentId: string, event: Event) {
  const value = (event.target as HTMLSelectElement | null)?.value as ProjectResponsibilityKey | undefined
  if (!value) {
    return
  }

  void updateTimelineGovernanceAssignment(assignmentId, value)
}

function handleTimelineGovernanceSelectSettingChange(key: string, event: Event) {
  const value = (event.target as HTMLSelectElement | null)?.value || ''
  updateTimelineGovernanceSettingDraft(key, 'select', value)
  void commitTimelineGovernanceSettings()
}

function handleTimelineGovernanceBooleanSettingChange(key: string, event: Event) {
  const checked = Boolean((event.target as HTMLInputElement | null)?.checked)
  updateTimelineGovernanceSettingDraft(key, 'boolean', checked)
  void commitTimelineGovernanceSettings()
}

function handleTimelineGovernanceTextSettingInput(key: string, kind: TimelineGovernanceSettingFieldKind, event: Event) {
  const value = (event.target as HTMLInputElement | HTMLTextAreaElement | null)?.value || ''
  updateTimelineGovernanceSettingDraft(key, kind, value)
}

// ---- Scope detail fetching ----
function resetTimelineScopeDetailState() {
  timelineScopeDetail.value = null
  timelineScopeDetailPending.value = false
  timelineScopeDetailError.value = ''
  timelineGovernanceSettingsDraft.value = {}
  timelineGovernanceError.value = ''
  timelineGovernanceNotice.value = ''
}

async function fetchTimelineScopeDetail(scope: SelectedTimelineRowState | null) {
  if (!scope?.scopeType || !scope.scopeId) {
    resetTimelineScopeDetailState()
    return
  }

  const preserveCurrentDetail = Boolean(
    timelineScopeDetail.value
    && timelineScopeDetail.value.scope.scopeType === scope.scopeType
    && timelineScopeDetail.value.scope.scopeId === scope.scopeId,
  )

  const requestId = timelineScopeDetailRequestId.value + 1
  timelineScopeDetailRequestId.value = requestId
  timelineScopeDetailPending.value = true
  timelineScopeDetailError.value = ''

  if (!preserveCurrentDetail) {
    timelineScopeDetail.value = null
    timelineGovernanceSettingsDraft.value = {}
    timelineGovernanceError.value = ''
    timelineGovernanceNotice.value = ''
  }

  try {
    const detail = await $fetch<ProjectScopeDetailBundle>(`/api/projects/${props.slug}/coordination/scopes/${scope.scopeType}/${encodeURIComponent(scope.scopeId)}`)

    if (timelineScopeDetailRequestId.value !== requestId) {
      return
    }

    timelineScopeDetail.value = detail
  } catch {
    if (timelineScopeDetailRequestId.value !== requestId) {
      return
    }

    if (!preserveCurrentDetail) {
      timelineScopeDetail.value = null
    }
    timelineScopeDetailError.value = 'Не удалось загрузить детали контура проекта.'
  } finally {
    if (timelineScopeDetailRequestId.value === requestId) {
      timelineScopeDetailPending.value = false
    }
  }
}

async function scrollTimelineDetailModalIntoView() {
  if (!import.meta.client || typeof document === 'undefined') return

  await nextTick()
  document.querySelector<HTMLElement>('.hpc-timeline-details-modal')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function buildSelectedTimelineScopeState(row: HybridTimelineRow): SelectedTimelineRowState {
  return {
    id: row.id,
    scopeType: row.type,
    scopeId: row.id,
    type: row.type,
    typeLabel: row.typeLabel,
    title: row.title,
    meta: row.meta,
    startDate: row.startDate,
    endDate: row.endDate,
    progressLabel: row.progressLabel,
    statusLabel: row.statusLabel,
    phaseKey: row.phaseKey,
    linkedPhaseKey: row.linkedPhaseKey,
  }
}

function buildProjectScopeState(): SelectedTimelineRowState {
  return {
    id: props.slug,
    scopeType: 'project',
    scopeId: props.slug,
    type: 'project',
    typeLabel: 'Проект',
    title: props.projectTitle || 'Проект',
    meta: [props.projectStatus, props.summary.activePhase?.title, props.summary.activeSprint?.name].filter(Boolean).join(' · '),
    statusLabel: props.projectStatus || 'Проект',
  }
}

function buildTaskScopeState(taskId: string, sprintId?: string): SelectedTimelineRowState | null {
  const normalizedTaskId = normalizeTaskScopeId(taskId)
  const taskContext = getTaskContext(normalizedTaskId)
  const resolvedSprintId = sprintId || taskContext?.sprint.id || ''
  const resolvedSprintName = taskContext?.sprint.name || 'Спринт'
  const resolvedPhaseTitle = taskContext?.sprint.linkedPhaseKey ? getPhaseTitleByKey(taskContext.sprint.linkedPhaseKey) : ''

  if (!taskContext && !normalizedTaskId) {
    return null
  }

  return {
    id: normalizedTaskId,
    taskId: normalizedTaskId,
    sprintId: resolvedSprintId,
    scopeType: 'task',
    scopeId: taskId,
    type: 'task',
    typeLabel: 'Задача',
    title: taskContext?.task.title || 'Задача',
    meta: [resolvedSprintName, resolvedPhaseTitle].filter(Boolean).join(' · '),
    progressLabel: taskContext?.task.points ? `${taskContext.task.points} pt` : '',
    statusLabel: taskContext?.task ? taskStatusLabels[taskContext.task.status] : 'Задача',
    linkedPhaseKey: taskContext?.sprint.linkedPhaseKey || '',
  }
}

async function openSelectedTimelineScope(scope: SelectedTimelineRowState) {
  hideTimelineTooltip()

  selectedTimelineRowState.value = scope
  void fetchTimelineScopeDetail(scope)

  if (import.meta.client && typeof window !== 'undefined' && window.innerWidth >= 1180) return
  await scrollTimelineDetailModalIntoView()
}

async function openTimelineRowDetails(row: HybridTimelineRow) {
  await openSelectedTimelineScope(buildSelectedTimelineScopeState(row))
}

function openTaskScopeDetails(taskId?: string, sprintId?: string) {
  if (!taskId) return
  const scope = buildTaskScopeState(taskId, sprintId)
  if (!scope) return
  void openSelectedTimelineScope(scope)
}

function openTimelineTask(taskId: string, sprintId?: string) {
  const normalizedTaskId = normalizeTaskScopeId(taskId)
  closeTimelineRowDetails()
  emit('focus-task', normalizedTaskId, sprintId)
}

function openTimelinePhaseEditor() {
  closeTimelineRowDetails()
  emit('open-timeline-phase-editor')
}

function closeTimelineRowDetails() {
  hideTimelineTooltip()
  timelineScopeDetailRequestId.value += 1
  resetTimelineScopeDetailState()
  selectedTimelineRowState.value = null
}

// Expose for parent to call openProjectScopeDetails
function openProjectScopeDetails() {
  void openSelectedTimelineScope(buildProjectScopeState())
}

defineExpose({ openProjectScopeDetails, openTaskScopeDetails, timelineWindowLabel, visibleTimelineRows })
</script>
