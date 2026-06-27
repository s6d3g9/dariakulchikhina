<template>
  <div class="cpc-communications">
    <section class="cpc-section">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">Агенты менеджмента</div>
          <div class="cpc-section__meta">Кто следит за ритмом и правильной коммуникацией</div>
        </div>
      </div>

      <div class="cpc-agent-list">
        <div v-for="agent in enabledAgents" :key="agent.id" class="cpc-agent-card">
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

      <div v-if="callInsights.length" class="cpc-call-insight-list">
        <div v-for="insight in callInsights" :key="insight.id" class="cpc-call-insight-card">
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
              @click="emit('open-call-insight-tasks', insight)"
            >
              к задачам
            </GlassButton>
          </div>
        </div>
      </div>
      <div v-else class="cpc-empty">Нет звонков</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { getHealthTone, getHybridStakeholderRoleLabel } from '~~/shared/utils/project/project-control'
import type { HybridControlCallInsight, HybridControlCoordinationBrief } from '~~/shared/types/project/project'

const props = defineProps<{
  coordinationBrief: HybridControlCoordinationBrief
  callInsights: HybridControlCallInsight[]
  getPhaseTitleByKey: (phaseKey?: string) => string
}>()

const emit = defineEmits<{
  'open-call-insight-tasks': [insight: HybridControlCallInsight]
}>()

const enabledAgents = computed(() => props.coordinationBrief.agents.filter(item => item.enabled))

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
</script>

<style scoped>
.cpc-communications {
  display: grid;
  gap: 18px;
}

.cpc-section,
.cpc-agent-card,
.cpc-recommendation-card,
.cpc-playbook-card,
.cpc-call-insight-card {
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
.cpc-playbook-card,
.cpc-agent-card,
.cpc-recommendation-card,
.cpc-call-insight-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.cpc-section__title,
.cpc-phase-row__title {
  margin: 0;
  color: var(--cpc-text);
}

.cpc-section__meta,
.cpc-phase-row__meta,
.cpc-empty {
  margin: 0;
  font-size: 0.72rem;
  color: var(--cpc-muted);
  text-transform: var(--cpc-label-transform);
  letter-spacing: var(--cpc-label-spacing);
}

.cpc-agent-list,
.cpc-recommendation-list,
.cpc-playbook-list,
.cpc-call-insight-list {
  display: grid;
  gap: 12px;
}

.cpc-agent-card,
.cpc-recommendation-card,
.cpc-playbook-card,
.cpc-call-insight-card {
  position: relative;
  align-items: flex-start;
  padding: 16px 18px;
  overflow: hidden;
}

.cpc-agent-card::before,
.cpc-recommendation-card::before,
.cpc-playbook-card::before,
.cpc-call-insight-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--ds-accent) 68%, transparent), transparent);
}

.cpc-subsection {
  display: grid;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--cpc-border);
}

.cpc-playbook-template,
.cpc-recommendation-text {
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--cpc-text);
}

.cpc-playbook-audience,
.cpc-call-insight-listing,
.cpc-phase-row__right {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cpc-playbook-audience,
.cpc-call-insight-listing {
  margin-top: 8px;
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

@media (max-width: 920px) {
  .cpc-section__head,
  .cpc-agent-card,
  .cpc-recommendation-card,
  .cpc-playbook-card,
  .cpc-call-insight-card {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>