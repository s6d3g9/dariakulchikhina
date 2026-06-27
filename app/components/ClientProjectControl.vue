<template>
  <div class="cpc-root">
    <ClientProjectControlSummaryShell
      :summary="summary"
      :next-review-date="control.nextReviewDate"
      :open-project-scope-details="openProjectScopeDetails"
    />

    <ClientProjectControlCommunications
      :coordination-brief="coordinationBrief"
      :call-insights="control.callInsights"
      :get-phase-title-by-key="getPhaseTitleByKey"
      @open-call-insight-tasks="openCallInsightTasks"
    />

    <ClientProjectControlTimelineShell
      :timeline-scale-options="timelineScaleOptions"
      :timeline-scale="timelineScale"
      :timeline-stats="timelineStats"
      :has-collapsible-timeline-phases="hasCollapsibleTimelinePhases"
      :all-timeline-phases-collapsed="allTimelinePhasesCollapsed"
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
      :get-timeline-scale-label="getTimelineScaleLabel"
      :get-timeline-phase-sprint-count="getTimelinePhaseSprintCount"
      :is-timeline-phase-collapsed="isTimelinePhaseCollapsed"
      :toggle-timeline-phase="toggleTimelinePhase"
      :toggle-all-timeline-phases="toggleAllTimelinePhases"
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
      :select-timeline-scale="selectTimelineScale"
    />

    <ClientProjectControlExecutionShell
      :phase-stats="phaseStats"
      :phases="control.phases"
      :phase-status-labels="phaseStatusLabels"
      :sprint-stats="sprintStats"
      :sprints="control.sprints"
      :sprint-status-labels="sprintStatusLabels"
      :task-status-labels="taskStatusLabels"
      :selected-sprint="selectedSprint"
      :selected-sprint-phase-title="selectedSprintPhaseTitle"
      :selected-sprint-stats="selectedSprintStats"
      :selected-sprint-columns="selectedSprintColumns"
      :selected-task="selectedTask"
      :selected-task-stats="selectedTaskStats"
      :format-date-range="formatDateRange"
      :format-task-due-date="formatTaskDueDate"
      :get-phase-gate-progress="getPhaseGateProgress"
      :get-sprint-completion-label="getSprintCompletionLabel"
      :get-phase-title-by-key="getPhaseTitleByKey"
      :focus-sprint="focusSprint"
      :is-selected-sprint="isSelectedSprint"
      :select-task="selectTask"
      :is-selected-task="isSelectedTask"
      :open-task-scope-details="openTaskScopeDetails"
      :clear-task-focus="clearTaskFocus"
    />

    <ClientProjectControlStatusShell
      :checkpoints="control.checkpoints"
      :blockers="control.blockers"
      :checkpoint-status-labels="checkpointStatusLabels"
    />
  </div>
</template>

<script setup lang="ts">
import { useClientProjectControlExecution } from '~~/app/composables/useClientProjectControlExecution'
import { useClientProjectControlTimeline } from '~~/app/composables/useClientProjectControlTimeline'
import { buildHybridControlSummary, ensureHybridControl } from '~~/shared/utils/project/project-control'
import type { ApiV1ClientProjectControl, ApiV1Envelope } from '~~/shared/types/api-v1'
import type {
  HybridControl,
  HybridControlCheckpoint,
  HybridControlCoordinationBrief,
  HybridControlPhase,
  HybridControlSprint,
  HybridControlTask,
} from '~~/shared/types/project/project'

const props = defineProps<{ slug: string }>()

const requestHeaders = useRequestHeaders(['cookie'])
const { data: controlEnvelope } = await useFetch<ApiV1Envelope<ApiV1ClientProjectControl>>(
  () => `/api/v1/client/projects/${props.slug}/control`,
  { headers: requestHeaders },
)

const project = computed(() => controlEnvelope.value?.data.project || null)
const control = computed<HybridControl>(() => {
  const clientControl = controlEnvelope.value?.data.control
  if (!clientControl) return ensureHybridControl(null, project.value || {})

  return {
    manager: '',
    team: [],
    tasks: [],
    communicationLog: [],
    managerAgents: [],
    communicationPlaybook: [],
    ...clientControl,
  }
})
const summary = computed(() => buildHybridControlSummary(control.value))
const coordinationBrief = computed<HybridControlCoordinationBrief>(() => controlEnvelope.value?.data.coordinationBrief || {
  summary: {
    healthStatus: summary.value.health.status,
    healthLabel: summary.value.health.label,
    activePhaseTitle: summary.value.activePhase?.title || 'Фаза не определена',
    activeSprintTitle: summary.value.activeSprint?.name || 'Активного спринта нет',
    blockerCount: summary.value.blockerCount,
    overdueSprints: summary.value.overdueSprints,
    nextReviewDate: summary.value.nextReviewDate,
  },
  agents: [],
  playbook: [],
  recommendations: [],
})

const phaseStatusLabels: Record<HybridControlPhase['status'], string> = {
  planned: 'запланирована',
  active: 'в работе',
  blocked: 'заблокирована',
  done: 'завершена',
}

const sprintStatusLabels: Record<HybridControlSprint['status'], string> = {
  planned: 'запланирован',
  active: 'активен',
  review: 'на ревью',
  done: 'завершён',
}

const taskStatusLabels: Record<HybridControlTask['status'], string> = {
  todo: 'к запуску',
  doing: 'в работе',
  review: 'на ревью',
  done: 'готово',
}

const checkpointStatusLabels: Record<HybridControlCheckpoint['status'], string> = {
  stable: 'стабильно',
  warning: 'внимание',
  critical: 'критично',
}

const {
  phaseStats,
  sprintStats,
  selectedTask,
  selectedSprint,
  selectedSprintPhaseTitle,
  selectedSprintStats,
  selectedSprintColumns,
  selectedTaskStats,
  formatDateRange,
  formatTaskDueDate,
  getPhaseById,
  getSprintById,
  getPhaseGateProgress,
  getSprintCompletionLabel,
  getTaskContext,
  scrollClientPhaseIntoView,
  focusSprint,
  isSelectedSprint,
  selectTask,
  isSelectedTask,
  clearTaskFocus,
  openCallInsightTasks,
  getPhaseTitleByKey,
} = useClientProjectControlExecution({
  control,
  summary,
  taskStatusLabels,
})

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
  getTimelineBarStyle,
  getTimelineScaleLabel,
  getTimelinePhaseSprintCount,
  isTimelinePhaseCollapsed,
  toggleTimelinePhase,
  toggleAllTimelinePhases,
  isTimelineRowSelected,
  openTimelineRowDetails,
  openProjectScopeDetails,
  openTaskScopeDetails,
  closeTimelineRowDetails,
  handleClientScopeSelectSettingChange,
  handleClientScopeBooleanSettingChange,
  handleClientScopeTextSettingInput,
  commitClientScopeSettings,
  openTimelinePhase,
  openTimelineSprint,
  openTimelineTask,
} = useClientProjectControlTimeline({
  slug: computed(() => props.slug),
  project,
  control,
  summary,
  coordinationBrief,
  selectedSprint,
  selectedSprintPhaseTitle,
  taskStatusLabels,
  checkpointStatusLabels,
  getPhaseById,
  getSprintById,
  getTaskContext,
  getPhaseTitleByKey,
  navigateToPhase: async (phaseId?: string) => {
    await scrollClientPhaseIntoView(phaseId)
  },
  navigateToSprint: async (sprintId?: string) => {
    focusSprint(sprintId)
  },
  navigateToTask: async (taskId?: string, sprintId?: string) => {
    if (!taskId) return
    selectTask(taskId, sprintId)
  },
})

const selectTimelineScale = (value: 'months' | 'weeks' | 'days' | 'hours') => {
  timelineScale.value = value
}
</script>

<style scoped>
.cpc-root {
  --cpc-text: var(--glass-text);
  --cpc-muted: color-mix(in srgb, var(--glass-text) 58%, transparent);
  --cpc-border: color-mix(in srgb, var(--glass-text) 14%, transparent);
  --cpc-strong-border: color-mix(in srgb, var(--glass-text) 24%, transparent);
  --cpc-surface: color-mix(in srgb, var(--glass-bg) 84%, white 4%);
  --cpc-surface-strong: color-mix(in srgb, var(--glass-bg) 94%, white 6%);
  --cpc-surface-muted: color-mix(in srgb, var(--glass-text) 4%, transparent);
  --cpc-radius: 28px;
  --cpc-inner-radius: 22px;
  --cpc-chip-radius: 999px;
  --cpc-border-width: 1px;
  --cpc-shadow: 0 16px 34px rgba(15, 23, 42, 0.1);
  --cpc-backdrop: blur(18px) saturate(145%);
  --cpc-label-transform: uppercase;
  --cpc-label-spacing: 0.12em;
  display: grid;
  gap: 18px;
}

:global(html[data-design-mode="liquid-glass"] .cpc-root) {
  --cpc-text: var(--glass-text);
  --cpc-muted: color-mix(in srgb, var(--glass-text) 58%, transparent);
  --cpc-border: color-mix(in srgb, var(--glass-text) 14%, transparent);
  --cpc-strong-border: color-mix(in srgb, var(--glass-text) 24%, transparent);
  --cpc-surface: color-mix(in srgb, var(--glass-bg) 84%, white 4%);
  --cpc-surface-strong: color-mix(in srgb, var(--glass-bg) 94%, white 6%);
  --cpc-surface-muted: color-mix(in srgb, var(--glass-text) 4%, transparent);
  --cpc-radius: 22px;
  --cpc-inner-radius: 22px;
  --cpc-chip-radius: 999px;
  --cpc-border-width: 1px;
  --cpc-shadow: 0 16px 34px rgba(15, 23, 42, 0.1);
  --cpc-backdrop: blur(18px) saturate(145%);
  --cpc-label-transform: uppercase;
  --cpc-label-spacing: 0.12em;
}

:global(html[data-design-mode="material3"] .cpc-root) {
  --cpc-text: var(--sys-color-on-surface);
  --cpc-muted: var(--sys-color-on-surface-variant);
  --cpc-border: var(--sys-color-outline-variant);
  --cpc-strong-border: var(--sys-color-outline);
  --cpc-surface: var(--sys-color-surface-container-low);
  --cpc-surface-strong: var(--sys-color-surface-container);
  --cpc-surface-muted: color-mix(in srgb, var(--sys-color-secondary-container) 42%, transparent);
  --cpc-radius: var(--sys-radius-xl, 28px);
  --cpc-inner-radius: var(--sys-radius-lg, 20px);
  --cpc-shadow: var(--sys-elevation-level2, 0 12px 28px rgba(15, 23, 42, 0.12));
  --cpc-backdrop: none;
  --cpc-label-transform: none;
  --cpc-label-spacing: 0.01em;
}

:global(html[data-design-mode="brutalist"] .cpc-root) {
  --cpc-radius: 0px;
  --cpc-inner-radius: 0px;
  --cpc-chip-radius: 0px;
  --cpc-border-width: 2px;
  --cpc-shadow: none;
  --cpc-backdrop: none;
  --cpc-label-transform: uppercase;
  --cpc-label-spacing: 0.14em;
}

:global(html[data-concept="minale"] .cpc-root) {
  --cpc-text: rgba(255, 255, 255, 0.92);
  --cpc-muted: rgba(255, 255, 255, 0.56);
  --cpc-border: rgba(255, 255, 255, 0.12);
  --cpc-strong-border: rgba(255, 255, 255, 0.24);
  --cpc-surface: rgba(255, 255, 255, 0.02);
  --cpc-surface-strong: rgba(255, 255, 255, 0.04);
  --cpc-surface-muted: rgba(255, 255, 255, 0.03);
  --cpc-radius: 4px 4px 0 0;
  --cpc-inner-radius: 4px 4px 0 0;
  --cpc-chip-radius: 4px 4px 0 0;
  --cpc-border-width: 1px;
  --cpc-shadow: none;
  --cpc-backdrop: none;
  --cpc-label-spacing: 0.16em;
}

:global(html[data-concept="brutal"] .cpc-root) {
  --cpc-text: #000000;
  --cpc-muted: rgba(0, 0, 0, 0.66);
  --cpc-border: #000000;
  --cpc-strong-border: #000000;
  --cpc-surface: #ffffff;
  --cpc-surface-strong: #f5efdf;
  --cpc-surface-muted: #fbf4e7;
  --cpc-radius: 4px 4px 0 0;
  --cpc-inner-radius: 4px 4px 0 0;
  --cpc-chip-radius: 4px 4px 0 0;
  --cpc-border-width: 2px;
  --cpc-shadow: 6px 6px 0 #000000;
  --cpc-backdrop: none;
  --cpc-label-spacing: 0.14em;
}
</style>
