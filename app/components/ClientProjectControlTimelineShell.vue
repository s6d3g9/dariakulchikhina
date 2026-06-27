<template>
  <section class="cpc-section cpc-section--timeline">
    <div class="cpc-section__head">
      <div>
        <div class="cpc-section__title">План-график проекта</div>
        <div class="cpc-section__meta">Фазы и спринты на одной временной шкале</div>
      </div>
      <div class="cpc-section__tools">
        <div class="cpc-scale-switch" role="tablist" aria-label="Масштаб таймлайна">
          <GlassButton
            v-for="option in timelineScaleOptions"
            :key="option"
            variant="secondary"
            density="compact"
            type="button"
            class="cpc-scale-switch__btn"
            :class="{ 'cpc-scale-switch__btn--active': timelineScale === option }"
            @click="selectTimelineScale(option)"
          >
            {{ getTimelineScaleLabel(option) }}
          </GlassButton>
        </div>
        <GlassButton
          v-if="hasCollapsibleTimelinePhases"
          variant="secondary"
          density="compact"
          type="button"
          class="cpc-scale-switch__btn"
          @click="toggleAllTimelinePhases"
        >
          {{ allTimelinePhasesCollapsed ? 'раскрыть все фазы' : 'свернуть все фазы' }}
        </GlassButton>
      </div>
    </div>

    <div class="cpc-phase-overview cpc-phase-overview--timeline">
      <article v-for="stat in timelineStats" :key="stat.label" class="cpc-phase-stat">
        <span class="cpc-phase-stat__label">{{ stat.label }}</span>
        <strong class="cpc-phase-stat__value">{{ stat.value }}</strong>
      </article>
    </div>

    <ClientProjectControlTimelineBoard
      :visible-timeline-rows="visibleTimelineRows"
      :timeline-columns="timelineColumns"
      :timeline-groups="timelineGroups"
      :timeline-grid-style="timelineGridStyle"
      :timeline-board-style="timelineBoardStyle"
      :selected-timeline-row-details="selectedTimelineRowDetails"
      :selected-timeline-task-sprint-id="selectedTimelineTaskSprintId"
      :selected-timeline-detail-cards="selectedTimelineDetailCards"
      :timeline-scope-detail-pending="timelineScopeDetailPending"
      :timeline-scope-detail-error="timelineScopeDetailError"
      :timeline-detail-subjects="timelineDetailSubjects"
      :timeline-detail-objects="timelineDetailObjects"
      :timeline-detail-actions="timelineDetailActions"
      :timeline-detail-settings="timelineDetailSettings"
      :client-editable-scope-settings="clientEditableScopeSettings"
      :timeline-scope-mutation-pending="timelineScopeMutationPending"
      :timeline-scope-mutation-error="timelineScopeMutationError"
      :timeline-scope-mutation-notice="timelineScopeMutationNotice"
      :timeline-detail-linked-scopes="timelineDetailLinkedScopes"
      :timeline-detail-rules="timelineDetailRules"
      :timeline-detail-tasks="timelineDetailTasks"
      :format-date-range="formatDateRange"
      :get-timeline-bar-style="getTimelineBarStyle"
      :get-timeline-phase-sprint-count="getTimelinePhaseSprintCount"
      :is-timeline-phase-collapsed="isTimelinePhaseCollapsed"
      :toggle-timeline-phase="toggleTimelinePhase"
      :is-timeline-row-selected="isTimelineRowSelected"
      :open-timeline-row-details="openTimelineRowDetails"
      :open-task-scope-details="openTaskScopeDetails"
      :close-timeline-row-details="closeTimelineRowDetails"
      :handle-client-scope-select-setting-change="handleClientScopeSelectSettingChange"
      :handle-client-scope-boolean-setting-change="handleClientScopeBooleanSettingChange"
      :handle-client-scope-text-setting-input="handleClientScopeTextSettingInput"
      :commit-client-scope-settings="commitClientScopeSettings"
      :open-timeline-phase="openTimelinePhase"
      :open-timeline-sprint="openTimelineSprint"
      :open-timeline-task="openTimelineTask"
    />
  </section>
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
  HybridTimelineScale,
} from '~~/shared/utils/project/project-control-timeline'

type TimelineStat = {
  label: string
  value: string
}

type TimelineDetailCard = {
  label: string
  value: string
}

const props = defineProps<{
  timelineScaleOptions: HybridTimelineScale[]
  timelineScale: HybridTimelineScale
  timelineStats: TimelineStat[]
  hasCollapsibleTimelinePhases: boolean
  allTimelinePhasesCollapsed: boolean
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
  getTimelineScaleLabel: (scale: HybridTimelineScale) => string
  getTimelinePhaseSprintCount: (phaseKey?: string) => number
  isTimelinePhaseCollapsed: (phaseKey?: string) => boolean
  toggleTimelinePhase: (phaseKey?: string) => void
  toggleAllTimelinePhases: () => void
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
  selectTimelineScale: (scale: HybridTimelineScale) => void
}>()

const {
  timelineScaleOptions,
  timelineScale,
  timelineStats,
  hasCollapsibleTimelinePhases,
  allTimelinePhasesCollapsed,
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
  getTimelineScaleLabel,
  getTimelinePhaseSprintCount,
  isTimelinePhaseCollapsed,
  toggleTimelinePhase,
  toggleAllTimelinePhases,
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
  selectTimelineScale,
} = props
</script>

<style scoped>
.cpc-section,
.cpc-phase-stat {
  border: var(--cpc-border-width) solid var(--cpc-border);
  border-radius: var(--cpc-radius);
  background: var(--cpc-surface);
  color: var(--cpc-text);
  box-shadow: var(--cpc-shadow);
  backdrop-filter: var(--cpc-backdrop);
  -webkit-backdrop-filter: var(--cpc-backdrop);
}

.cpc-section__meta,
.cpc-phase-stat__label {
  margin: 0;
  font-size: 0.72rem;
  color: var(--cpc-muted);
  text-transform: var(--cpc-label-transform);
  letter-spacing: var(--cpc-label-spacing);
}

.cpc-section__title,
.cpc-phase-stat__value {
  margin: 0;
  color: var(--cpc-text);
}

.cpc-section {
  display: grid;
  gap: 14px;
  padding: 18px;
}

.cpc-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cpc-section__tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
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

.cpc-scale-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cpc-scale-switch__btn {
  min-height: 44px;
}

:global(html[data-concept="brutal"] .cpc-section),
:global(html[data-concept="brutal"] .cpc-phase-stat) {
  box-shadow: 4px 4px 0 #000000;
}

.cpc-section--timeline {
  --cpc-tl-text: var(--glass-text);
  --cpc-tl-muted: color-mix(in srgb, var(--glass-text) 58%, transparent);
  --cpc-tl-soft: color-mix(in srgb, var(--glass-text) 10%, transparent);
  --cpc-tl-strong-border: color-mix(in srgb, var(--glass-text) 22%, transparent);
  --cpc-tl-surface: color-mix(in srgb, var(--glass-bg) 78%, transparent);
  --cpc-tl-surface-strong: color-mix(in srgb, var(--glass-bg) 92%, white 8%);
  --cpc-tl-surface-muted: color-mix(in srgb, var(--glass-text) 4%, transparent);
  --cpc-tl-base: var(--glass-page-bg);
  --cpc-tl-panel-radius: 28px;
  --cpc-tl-inner-radius: 22px;
  --cpc-tl-chip-radius: 999px;
  --cpc-tl-border-width: 1px;
  --cpc-tl-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
  --cpc-tl-backdrop: blur(18px) saturate(145%);
  --cpc-tl-label-transform: uppercase;
  --cpc-tl-label-spacing: 0.12em;
  --cpc-tl-stable: color-mix(in srgb, var(--glass-text) 82%, transparent);
  --cpc-tl-warning: var(--ds-warning);
  --cpc-tl-critical: var(--ds-error);
  color: var(--cpc-tl-text);
}

:global(html[data-design-mode="liquid-glass"] .cpc-section--timeline) {
  --cpc-tl-surface: color-mix(in srgb, var(--glass-bg) 82%, transparent);
  --cpc-tl-surface-strong: color-mix(in srgb, var(--glass-bg) 94%, white 6%);
  --cpc-tl-surface-muted: color-mix(in srgb, var(--glass-text) 4%, transparent);
  --cpc-tl-base: color-mix(in srgb, var(--glass-page-bg) 92%, transparent);
  --cpc-tl-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.22), 0 18px 40px rgba(15, 23, 42, 0.14);
}

:global(html[data-design-mode="material3"] .cpc-section--timeline) {
  --cpc-tl-text: var(--sys-color-on-surface);
  --cpc-tl-muted: var(--sys-color-on-surface-variant);
  --cpc-tl-soft: var(--sys-color-outline-variant);
  --cpc-tl-strong-border: var(--sys-color-outline);
  --cpc-tl-surface: var(--sys-color-surface-container-low);
  --cpc-tl-surface-strong: var(--sys-color-surface-container);
  --cpc-tl-surface-muted: color-mix(in srgb, var(--sys-color-secondary-container) 40%, transparent);
  --cpc-tl-base: var(--sys-color-surface);
  --cpc-tl-panel-radius: var(--sys-radius-xl, 28px);
  --cpc-tl-inner-radius: var(--sys-radius-lg, 20px);
  --cpc-tl-chip-radius: 999px;
  --cpc-tl-shadow: var(--sys-elevation-level2);
  --cpc-tl-backdrop: none;
  --cpc-tl-label-transform: none;
  --cpc-tl-label-spacing: 0.01em;
  --cpc-tl-stable: var(--sys-color-secondary);
  --cpc-tl-warning: #b26a00;
  --cpc-tl-critical: var(--sys-color-error);
}

:global(html[data-design-mode="brutalist"] .cpc-section--timeline) {
  --cpc-tl-panel-radius: 0px;
  --cpc-tl-inner-radius: 0px;
  --cpc-tl-chip-radius: 0px;
  --cpc-tl-border-width: 2px;
  --cpc-tl-shadow: none;
  --cpc-tl-backdrop: none;
  --cpc-tl-label-transform: uppercase;
  --cpc-tl-label-spacing: 0.14em;
}

:global(html[data-concept="minale"] .cpc-section--timeline) {
  --cpc-tl-text: rgba(255, 255, 255, 0.92);
  --cpc-tl-muted: rgba(255, 255, 255, 0.58);
  --cpc-tl-soft: rgba(255, 255, 255, 0.12);
  --cpc-tl-strong-border: rgba(255, 255, 255, 0.24);
  --cpc-tl-surface: rgba(255, 255, 255, 0.02);
  --cpc-tl-surface-strong: rgba(255, 255, 255, 0.04);
  --cpc-tl-surface-muted: rgba(255, 255, 255, 0.03);
  --cpc-tl-base: rgba(0, 0, 0, 0.42);
  --cpc-tl-panel-radius: 4px 4px 0 0;
  --cpc-tl-inner-radius: 4px 4px 0 0;
  --cpc-tl-chip-radius: 4px 4px 0 0;
  --cpc-tl-border-width: 1px;
  --cpc-tl-shadow: none;
  --cpc-tl-backdrop: none;
  --cpc-tl-label-spacing: 0.16em;
  --cpc-tl-stable: rgba(255, 255, 255, 0.92);
}

:global(html[data-concept="brutal"] .cpc-section--timeline) {
  --cpc-tl-text: #000000;
  --cpc-tl-muted: rgba(0, 0, 0, 0.64);
  --cpc-tl-soft: #000000;
  --cpc-tl-strong-border: #000000;
  --cpc-tl-surface: #ffffff;
  --cpc-tl-surface-strong: #f4efe3;
  --cpc-tl-surface-muted: #faf5ea;
  --cpc-tl-base: #ffffff;
  --cpc-tl-panel-radius: 4px 4px 0 0;
  --cpc-tl-inner-radius: 4px 4px 0 0;
  --cpc-tl-chip-radius: 4px 4px 0 0;
  --cpc-tl-border-width: 2px;
  --cpc-tl-shadow: 6px 6px 0 #000000;
  --cpc-tl-backdrop: none;
  --cpc-tl-label-spacing: 0.14em;
  --cpc-tl-stable: #000000;
  --cpc-tl-warning: #b35a00;
  --cpc-tl-critical: #c1121f;
}

.cpc-section--timeline .cpc-section__head {
  align-items: flex-end;
}

.cpc-section--timeline .cpc-phase-stat {
  border: var(--cpc-tl-border-width) solid var(--cpc-tl-soft);
  border-radius: var(--cpc-tl-panel-radius);
  background: var(--cpc-tl-surface);
  color: var(--cpc-tl-text);
  box-shadow: var(--cpc-tl-shadow);
  backdrop-filter: var(--cpc-tl-backdrop);
  -webkit-backdrop-filter: var(--cpc-tl-backdrop);
}

.cpc-section--timeline .cpc-section__meta,
.cpc-section--timeline .cpc-phase-stat__label,
.cpc-section--timeline .cpc-scale-switch__btn {
  color: var(--cpc-tl-muted);
  text-transform: var(--cpc-tl-label-transform);
  letter-spacing: var(--cpc-tl-label-spacing);
}

.cpc-section--timeline .cpc-section__title,
.cpc-section--timeline .cpc-phase-stat__value {
  color: var(--cpc-tl-text);
}

.cpc-section--timeline .cpc-scale-switch__btn {
  padding-inline: 14px;
  border-radius: var(--cpc-tl-chip-radius);
  border: var(--cpc-tl-border-width) solid var(--cpc-tl-soft);
  background: transparent;
}

.cpc-section--timeline .cpc-scale-switch__btn--active {
  color: var(--cpc-tl-text);
  border-color: var(--cpc-tl-strong-border);
  background: var(--cpc-tl-surface-strong);
}

@media (max-width: 960px) {
  .cpc-phase-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .cpc-section__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .cpc-section__tools {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .cpc-phase-overview {
    grid-template-columns: 1fr;
  }

  .cpc-section,
  .cpc-phase-stat {
    padding: 16px;
  }
}
</style>