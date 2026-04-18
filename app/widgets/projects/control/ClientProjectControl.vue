<template>
  <div class="cpc-root">
    <div class="cpc-hero cpc-shell">
      <div>
        <p class="cpc-eyebrow">Контроль проекта</p>
        <h2 class="cpc-title">Как проект ведётся и где находится сейчас</h2>
      </div>
      <div class="cpc-hero__actions">
        <span class="cpc-pill" :class="`cpc-pill--${summary.health.status}`">{{ summary.health.label }}</span>
        <GlassButton variant="secondary" density="compact" type="button" @click="openProjectScopeDetails">
          контур проекта
        </GlassButton>
      </div>
    </div>

    <div class="cpc-grid cpc-grid--summary">
      <section class="cpc-card">
        <p class="cpc-card__label">Текущая фаза</p>
        <h3 class="cpc-card__title">{{ summary.activePhase?.title || 'Фаза не определена' }}</h3>
        <p class="cpc-card__meta">Прогресс каркаса: {{ summary.phasePercent }}%</p>
      </section>
      <section class="cpc-card">
        <p class="cpc-card__label">Текущий спринт</p>
        <h3 class="cpc-card__title">{{ summary.activeSprint?.name || 'Спринт ещё не запущен' }}</h3>
        <p class="cpc-card__meta">Исполнение: {{ summary.doneTasks }} / {{ summary.totalTasks }} задач</p>
      </section>
      <section class="cpc-card">
        <p class="cpc-card__label">Следующий обзор</p>
        <h3 class="cpc-card__title">{{ control.nextReviewDate || 'Не назначен' }}</h3>
        <p class="cpc-card__meta">Следующая управленческая синхронизация</p>
      </section>
      <section class="cpc-card">
        <p class="cpc-card__label">Блокеры</p>
        <h3 class="cpc-card__title">{{ summary.blockerCount }}</h3>
        <p class="cpc-card__meta">Критических блокеров на текущий момент</p>
      </section>
    </div>

    <section class="cpc-section">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Агенты менеджмента</div>
          <div class="cpc-section__meta">Кто следит за ритмом и правильной коммуникацией</div>
        </div>
      </div>

      <div class="cpc-agent-list">
        <div v-for="agent in coordinationBrief.agents.filter((item: any) => item.enabled)" :key="agent.id" class="cpc-agent-card">
          <div>
            <div class="cpc-phase-row__title">{{ agent.title }}</div>
            <div class="cpc-phase-row__meta">{{ agent.mission || agent.linkedChannelLabel }}</div>
          </div>
          <div class="cpc-phase-row__right">
            <span class="cpc-chip">{{ agent.roleLabel }}</span>
            <span class="cpc-chip">{{ agent.recommendedActionCount }} действий</span>
          </div>
        </div>
      </div>

      <div class="cpc-subsection">
        <div class="cpc-section__meta">Протоколы handoff, approval и эскалации</div>
        <div class="cpc-playbook-list">
          <div v-for="rule in coordinationBrief.playbook" :key="rule.id" class="cpc-playbook-card">
            <div>
              <div class="cpc-phase-row__title">{{ rule.title }}</div>
              <div class="cpc-phase-row__meta">{{ rule.trigger }}</div>
              <div v-if="rule.template" class="cpc-playbook-template">{{ rule.template }}</div>
              <div class="cpc-playbook-audience">
                <span v-for="label in rule.audienceLabels" :key="`${rule.id}-${label}`" class="cpc-chip">{{ label }}</span>
              </div>
            </div>
            <div class="cpc-phase-row__right">
              <span class="cpc-chip">{{ rule.linkedChannelLabel }}</span>
              <span class="cpc-chip">{{ rule.ownerAgentTitle }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="cpc-recommendation-list">
        <div v-for="recommendation in coordinationBrief.recommendations" :key="recommendation.id" class="cpc-recommendation-card">
          <div>
            <div class="cpc-phase-row__title">{{ recommendation.title }}</div>
            <div class="cpc-phase-row__meta">{{ recommendation.reason }}</div>
            <div class="cpc-recommendation-text">{{ recommendation.suggestedMessage }}</div>
          </div>
          <div class="cpc-phase-row__right">
            <span class="cpc-chip">{{ recommendation.ownerAgentTitle }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="cpc-section">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Инсайты после звонков</div>
          <div class="cpc-section__meta">Что из созвонов уже превратилось в решения, шаги и блокеры проекта</div>
        </div>
      </div>

      <div v-if="control.callInsights.length" class="cpc-call-insight-list">
        <div v-for="insight in control.callInsights" :key="insight.id" class="cpc-call-insight-card">
          <div>
            <div class="cpc-phase-row__title">{{ insight.title }}</div>
            <div class="cpc-phase-row__meta">{{ formatCallInsightDate(insight.happenedAt || insight.createdAt) }}<span v-if="getCallInsightActorLabel(insight)"> · {{ getCallInsightActorLabel(insight) }}</span></div>
            <div class="cpc-recommendation-text">{{ insight.summary }}</div>
            <div v-if="insight.decisions.length" class="cpc-playbook-audience">
              <span v-for="item in insight.decisions" :key="`${insight.id}-decision-${item}`" class="cpc-chip">{{ item }}</span>
            </div>
            <div v-if="insight.nextSteps.length" class="cpc-call-insight-listing">
              <div v-for="item in insight.nextSteps" :key="`${insight.id}-next-${item}`" class="cpc-phase-row__meta">{{ item }}</div>
            </div>
            <div v-if="insight.blockers.length" class="cpc-call-insight-listing">
              <div v-for="item in insight.blockers" :key="`${insight.id}-blocker-${item}`" class="cpc-phase-row__meta">Блокер: {{ item }}</div>
            </div>
          </div>
          <div class="cpc-phase-row__right">
            <span class="cpc-chip" :class="`cpc-chip--${insight.tone}`">{{ getHealthTone(insight.tone) }}</span>
            <span v-if="insight.relatedPhaseKey" class="cpc-chip">{{ getPhaseTitleByKey(insight.relatedPhaseKey) }}</span>
            <span v-if="insight.appliedTaskIds?.length" class="cpc-chip">задач: {{ insight.appliedTaskIds.length }}</span>
            <GlassButton
              v-if="insight.appliedTaskIds?.length"
              variant="secondary"
              density="compact"
              type="button"
              @click="openCallInsightTasks(insight)"
            >
              к задачам
            </GlassButton>
          </div>
        </div>
      </div>
      <div v-else class="cpc-empty">Нет звонков</div>
    </section>

    <ClientControlTimelineSection
      ref="timelineSectionRef"
      :slug="slug"
      :control="control"
      :coordination-brief="coordinationBrief"
      :project="project"
    />

    <section class="cpc-section">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Контрольные точки</div>
          <div class="cpc-section__meta">Состояние проекта</div>
        </div>
      </div>
      <div class="cpc-checkpoint-list">
        <div v-for="checkpoint in control.checkpoints" :key="checkpoint.id" class="cpc-checkpoint">
          <div>
            <div class="cpc-phase-row__title">{{ checkpoint.title }}</div>
            <div class="cpc-phase-row__meta">{{ checkpoint.note || 'Без комментария' }}</div>
          </div>
          <span class="cpc-chip" :class="`cpc-chip--${checkpoint.status}`">{{ checkpointStatusLabels[checkpoint.status] }}</span>
        </div>
      </div>
    </section>

    <section v-if="control.blockers.length" class="cpc-section">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Текущие блокеры</div>
          <div class="cpc-section__meta">Что мешает движению</div>
        </div>
      </div>
      <div class="cpc-blocker-list">
        <div v-for="(blocker, index) in control.blockers" :key="`client-blocker-${index}`" class="cpc-blocker">
          {{ blocker }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { buildHybridControlSummary, buildHybridCoordinationBrief, ensureHybridControl, getHealthTone, getHybridStakeholderRoleLabel } from '~~/shared/utils/project-control'
import type { HybridControlCallInsight, HybridControlCheckpoint } from '~~/shared/types/project'

const props = defineProps<{ slug: string }>()

const { data: project } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const control = computed(() => ensureHybridControl(project.value?.profile?.hybridControl, project.value || {}))
const summary = computed(() => buildHybridControlSummary(control.value))
const coordinationBrief = computed(() => buildHybridCoordinationBrief(control.value, { projectSlug: props.slug }))

const checkpointStatusLabels: Record<HybridControlCheckpoint['status'], string> = {
  stable: 'стабильно',
  warning: 'внимание',
  critical: 'критично',
}

const timelineSectionRef = ref<{
  openProjectScopeDetails: () => void
  focusSprint: (id: string) => void
  selectTask: (taskId: string, sprintId?: string) => void
} | null>(null)

function formatCallInsightDate(value?: string) {
  if (!value) return 'без даты'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function getCallInsightActorLabel(insight: HybridControlCallInsight) {
  const roleLabel = insight.actorRole ? getHybridStakeholderRoleLabel(insight.actorRole) : ''
  const actorName = insight.actorName || ''

  if (roleLabel && actorName) return `${roleLabel}: ${actorName}`
  return actorName || roleLabel
}

function getPhaseTitleByKey(phaseKey?: string) {
  if (!phaseKey) return 'Без привязки'
  return control.value.phases.find((phase: any) => phase.phaseKey === phaseKey)?.title || phaseKey
}

function openCallInsightTasks(insight: HybridControlCallInsight) {
  const taskIds = insight.appliedTaskIds || []
  const relatedSprint = control.value.sprints.find((sprint: any) =>
    sprint.id === insight.appliedSprintId
    || sprint.tasks.some((task: any) => taskIds.includes(task.id)),
  )

  if (taskIds.length === 1) {
    timelineSectionRef.value?.selectTask(taskIds[0], relatedSprint?.id)
    return
  }

  if (relatedSprint) {
    timelineSectionRef.value?.focusSprint(relatedSprint.id)
  }
}

async function openProjectScopeDetails() {
  timelineSectionRef.value?.openProjectScopeDetails()
}
</script>

