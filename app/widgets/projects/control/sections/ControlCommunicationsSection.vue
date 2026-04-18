<template>
  <div class="hpc-communications-sections">
    <section class="hpc-section">
      <div class="hpc-section__head">
        <div>
          <p class="hpc-section__label">Manager Agents</p>
          <h3 class="hpc-section__title">Агенты менеджмента и сценарии коммуникации</h3>
        </div>
      </div>

      <div class="hpc-agent-list">
        <article v-for="agent in control.managerAgents" :key="agent.id" class="hpc-agent-card">
          <div class="hpc-phase-card__head">
            <div>
              <p class="hpc-phase-card__kicker">{{ getManagerAgentRoleLabel(agent.role) }}</p>
              <h4 class="hpc-phase-card__title">{{ agent.title }}</h4>
            </div>
            <div class="hpc-phase-card__head-right">
              <span class="hpc-chip">действий: {{ getAgentRecommendationCount(agent.id) }}</span>
              <label class="hpc-agent-toggle">
                <input v-model="agent.enabled" type="checkbox" @change="emit('save')">
                <span>{{ agent.enabled ? 'активен' : 'выключен' }}</span>
              </label>
            </div>
          </div>

          <div class="hpc-grid">
            <div class="u-field">
              <label class="u-field__label">Основной канал</label>
              <select v-model="agent.linkedChannel" class="u-status-sel" @change="emit('save')">
                <option v-for="option in communicationChannelOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </div>
            <div class="u-field">
              <label class="u-field__label">Ритм, дней</label>
              <GlassInput v-model.number="agent.cadenceDays" type="number" min="1" max="90" @blur="emit('save')" />
            </div>
            <div class="u-field u-field--full">
              <label class="u-field__label">Миссия</label>
              <textarea v-model="agent.mission" class="glass-input u-ta" rows="2" @blur="emit('save')" />
            </div>
            <div class="u-field u-field--full">
              <label class="u-field__label">Заметка менеджера</label>
              <textarea v-model="agent.notes" class="glass-input u-ta" rows="2" @blur="emit('save')" />
            </div>
          </div>

          <div class="hpc-agent-targets">
            <span v-for="role in agent.targetRoles" :key="`${agent.id}-${role}`" class="hpc-chip">{{ getStakeholderRoleLabel(role) }}</span>
          </div>
        </article>
      </div>

      <div class="hpc-subsection">
        <div class="hpc-subsection__head">
          <div>
            <p class="hpc-section__label">Communication Playbook</p>
            <h4 class="hpc-phase-card__title">Протоколы handoff, approval и эскалации</h4>
          </div>
          <GlassButton variant="secondary" density="compact" type="button" @click="addCommunicationRule">добавить правило</GlassButton>
        </div>

        <div class="hpc-playbook-list">
          <article v-for="(rule, index) in control.communicationPlaybook" :key="rule.id" class="hpc-playbook-card">
            <div class="hpc-phase-card__head">
              <div>
                <p class="hpc-phase-card__kicker">{{ getCommunicationChannelLabel(rule.linkedChannel) }}</p>
                <h4 class="hpc-phase-card__title">{{ rule.title }}</h4>
              </div>
              <div class="hpc-phase-card__head-right">
                <GlassButton variant="danger" density="compact" type="button" @click="removeCommunicationRule(index)">удалить</GlassButton>
              </div>
            </div>

            <div class="hpc-grid">
              <div class="u-field">
                <label class="u-field__label">Название протокола</label>
                <GlassInput v-model="rule.title" @blur="emit('save')" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Владелец сценария</label>
                <select v-model="rule.ownerAgentId" class="u-status-sel" @change="emit('save')">
                  <option v-for="option in managerAgentOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </div>
              <div class="u-field">
                <label class="u-field__label">Основной канал</label>
                <select v-model="rule.linkedChannel" class="u-status-sel" @change="emit('save')">
                  <option v-for="option in communicationChannelOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </div>
              <div class="u-field">
                <label class="u-field__label">Ритм, дней</label>
                <GlassInput v-model.number="rule.cadenceDays" type="number" min="1" max="90" @blur="emit('save')" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Когда запускать сценарий</label>
                <textarea v-model="rule.trigger" class="glass-input u-ta" rows="2" @blur="emit('save')" />
              </div>
              <div class="u-field u-field--full">
                <label class="u-field__label">Шаблон сообщения</label>
                <textarea v-model="rule.template" class="glass-input u-ta" rows="2" @blur="emit('save')" />
              </div>
            </div>

            <div class="hpc-playbook-audience">
              <button
                v-for="option in stakeholderRoleOptions"
                :key="`${rule.id}-${option.value}`"
                type="button"
                class="hpc-chip hpc-chip--toggle"
                :class="{ 'hpc-chip--active': hasRuleAudience(rule, option.value) }"
                @click="toggleRuleAudience(rule, option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </article>
        </div>
      </div>

      <div class="hpc-recommendation-list">
        <article v-for="recommendation in coordinationBrief.recommendations" :key="recommendation.id" class="hpc-recommendation-card">
          <div class="hpc-phase-card__head">
            <div>
              <p class="hpc-phase-card__kicker">{{ recommendation.channelLabel }}</p>
              <h4 class="hpc-phase-card__title">{{ recommendation.title }}</h4>
            </div>
            <div class="hpc-phase-card__head-right">
              <span class="hpc-pill" :class="`hpc-pill--${recommendation.tone}`">{{ recommendation.ownerAgentTitle }}</span>
            </div>
          </div>
          <p class="hpc-recommendation-text">{{ recommendation.reason }}</p>
          <p class="hpc-recommendation-text hpc-recommendation-text--message">{{ recommendation.suggestedMessage }}</p>
          <div class="hpc-agent-targets">
            <span v-for="label in recommendation.audienceLabels" :key="`${recommendation.id}-${label}`" class="hpc-chip">{{ label }}</span>
          </div>
          <div v-if="getRecommendationRecipients(recommendation).length" class="hpc-agent-targets">
            <GlassButton
              v-for="member in getRecommendationRecipients(recommendation)"
              :key="`${recommendation.id}-${member.id}`"
              variant="secondary"
              density="compact"
              type="button"
              @click="openMessageModal(member, recommendation.suggestedMessage)"
            >
              {{ member.name }}
            </GlassButton>
          </div>
        </article>
      </div>

      <div class="hpc-subsection">
        <div class="hpc-subsection__head">
          <div>
            <p class="hpc-section__label">Команда</p>
            <h4 class="hpc-phase-card__title">Участники контура</h4>
          </div>
        </div>

        <div v-if="control.team.length" class="hpc-agent-list">
          <article v-for="member in control.team" :key="member.id" class="hpc-agent-card">
            <div class="hpc-phase-card__head">
              <div>
                <p class="hpc-phase-card__kicker">{{ getTeamMemberRoleLabel(member.role) }}</p>
                <h4 class="hpc-phase-card__title">{{ member.name }}</h4>
              </div>
              <div class="hpc-phase-card__head-right">
                <span class="hpc-chip">{{ getTeamMemberChannelLabel(member.notifyBy) }}</span>
                <GlassButton variant="secondary" density="compact" type="button" @click="openMessageModal(member)">сообщение</GlassButton>
              </div>
            </div>
            <p v-if="member.contact" class="hpc-recommendation-text">{{ member.contact }}</p>
          </article>
        </div>
        <div v-else class="hpc-empty">Нет участников</div>
      </div>
    </section>

    <section class="hpc-section">
      <div class="hpc-section__head">
        <div>
          <p class="hpc-section__label">Call Intelligence</p>
          <h3 class="hpc-section__title">Звонки, которые меняют проект</h3>
        </div>
      </div>

      <div class="hpc-grid">
        <div class="u-field">
          <label class="u-field__label">Название звонка</label>
          <GlassInput v-model="callInsightDraft.title" placeholder="Название звонка" />
        </div>
        <div class="u-field">
          <label class="u-field__label">Связанная фаза</label>
          <select v-model="callInsightDraft.relatedPhaseKey" class="u-status-sel">
            <option value="">авто / без привязки</option>
            <option v-for="phase in control.phases" :key="phase.id" :value="phase.phaseKey">{{ phase.title }}</option>
          </select>
        </div>
        <div class="u-field u-field--full">
          <label class="u-field__label">Краткий конспект</label>
          <textarea v-model="callInsightDraft.summary" class="glass-input u-ta" rows="3" placeholder="Конспект" />
        </div>
        <div class="u-field u-field--full">
          <label class="u-field__label">Транскрипт или выдержка звонка</label>
          <textarea v-model="callInsightDraft.transcript" class="glass-input u-ta" rows="5" placeholder="Транскрипт" />
        </div>
      </div>

      <div class="hpc-section__tools">
        <GlassButton variant="primary" type="button" :disabled="callInsightSaving || !callInsightDraft.summary.trim()" @click="submitCallInsight">
          {{ callInsightSaving ? 'сохраняем...' : 'добавить звонок в проект' }}
        </GlassButton>
        <p v-if="callInsightStatus" class="hpc-recommendation-text">{{ callInsightStatus }}</p>
      </div>

      <div v-if="control.callInsights.length" class="hpc-call-insight-list">
        <article v-for="insight in control.callInsights" :key="insight.id" class="hpc-call-insight-card">
          <div class="hpc-phase-card__head">
            <div>
              <p class="hpc-phase-card__kicker">{{ formatCallInsightDate(insight.happenedAt || insight.createdAt) }}</p>
              <h4 class="hpc-phase-card__title">{{ insight.title }}</h4>
            </div>
            <div class="hpc-phase-card__head-right">
              <span class="hpc-pill" :class="`hpc-pill--${insight.tone}`">{{ getHealthTone(insight.tone) }}</span>
              <span v-if="getCallInsightActorLabel(insight)" class="hpc-chip">{{ getCallInsightActorLabel(insight) }}</span>
              <span v-if="insight.relatedPhaseKey" class="hpc-chip">{{ getPhaseTitleByKey(insight.relatedPhaseKey) }}</span>
              <span v-if="insight.appliedTaskIds?.length" class="hpc-chip">в задачах: {{ insight.appliedTaskIds.length }}</span>
              <GlassButton
                v-if="insight.appliedTaskIds?.length"
                variant="secondary"
                density="compact"
                type="button"
                @click="openCallInsightTasks(insight)"
              >
                к задачам
              </GlassButton>
              <GlassButton
                v-if="insight.nextSteps.length"
                variant="secondary"
                density="compact"
                type="button"
                :disabled="callInsightApplyPendingId === insight.id"
                @click="applyCallInsightToSprint(insight.id)"
              >
                {{ callInsightApplyPendingId === insight.id ? 'применяем...' : (insight.appliedTaskIds?.length ? 'досинхронизировать задачи' : 'в активный спринт') }}
              </GlassButton>
            </div>
          </div>
          <p class="hpc-recommendation-text hpc-recommendation-text--message">{{ insight.summary }}</p>
          <div v-if="insight.decisions.length" class="hpc-call-insight-block">
            <p class="hpc-phase-card__kicker">Решения</p>
            <div class="hpc-agent-targets">
              <span v-for="item in insight.decisions" :key="`${insight.id}-decision-${item}`" class="hpc-chip">{{ item }}</span>
            </div>
          </div>
          <div v-if="insight.nextSteps.length" class="hpc-call-insight-block">
            <p class="hpc-phase-card__kicker">Следующие шаги</p>
            <div class="hpc-call-insight-listing">
              <p v-for="item in insight.nextSteps" :key="`${insight.id}-next-${item}`" class="hpc-recommendation-text">{{ item }}</p>
            </div>
          </div>
          <div v-if="insight.blockers.length" class="hpc-call-insight-block">
            <p class="hpc-phase-card__kicker">Поднятые блокеры</p>
            <div class="hpc-call-insight-listing">
              <p v-for="item in insight.blockers" :key="`${insight.id}-blocker-${item}`" class="hpc-recommendation-text">{{ item }}</p>
            </div>
          </div>
        </article>
      </div>
      <p v-else class="hpc-empty">Нет импортированных звонков</p>
    </section>

    <section class="hpc-section">
      <div class="hpc-section__head">
        <div>
          <p class="hpc-section__label">Communication Log</p>
          <h3 class="hpc-section__title">Журнал отправленных поручений и уведомлений</h3>
        </div>
      </div>
      <div v-if="control.communicationLog && control.communicationLog.length > 0" class="hpc-grid">
        <article v-for="log in control.communicationLog" :key="log.id" class="hpc-agent-card">
          <div class="hpc-agent-card__head">
            <div class="hpc-agent-info">
              <span class="hpc-agent-role">{{ getMemberName(log.memberId) }}</span>
              <span class="hpc-agent-name">{{ log.channel }}</span>
            </div>
            <div class="hpc-status-label" :class="{'hpc-status-label--ok': log.status === 'delivered', 'hpc-status-label--error': log.status === 'failed'}">
              {{ log.status }}
            </div>
          </div>
          <p class="hpc-recommendation-text hpc-recommendation-text--message" style="margin-top: 12px; white-space: pre-wrap;">{{ log.message }}</p>
          <div class="hpc-phase-card__kicker" style="margin-top: 12px; opacity: 0.6;">{{ new Date(log.dispatchedAt).toLocaleString('ru-RU') }}</div>
        </article>
      </div>
      <p v-else class="hpc-empty">Журнал пуст</p>
    </section>

    <Teleport to="body">
      <div v-if="msgModalOpen" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(8px);">
        <div class="glass-surface" style="width: 400px; padding: 24px; border-radius: 16px; display: flex; flex-direction: column; gap: 16px; color: var(--ds-surface-fg);">
          <h3 style="font-size: 1.25rem; font-weight: 500; margin: 0;">Отправить сообщение</h3>
          <p style="font-size: 0.9rem; opacity: 0.8; margin: 0;">
            Получатель: {{ msgModalTarget?.name || 'Без имени' }} (Канал: {{ msgModalTarget?.notifyBy }})
          </p>
          <textarea v-model="msgModalText" class="glass-input" style="min-height: 120px; padding: 12px; resize: vertical;" placeholder="Сообщение..."></textarea>
          <p v-if="msgModalError" class="hpc-recommendation-text hpc-recommendation-text--error">{{ msgModalError }}</p>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <GlassButton variant="danger" density="compact" type="button" @click="closeMessageModal">Отмена</GlassButton>
            <GlassButton variant="primary" type="button" :disabled="msgModalSending || !msgModalText.trim()" @click="executeMessageDispatch">{{ msgModalSending ? 'Отправка...' : 'Отправить' }}</GlassButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import {
  getHealthTone,
  getHybridCommunicationChannelLabel,
  getHybridControlManagerAgentRoleLabel,
  getHybridStakeholderRoleLabel,
  ensureHybridControl,
  buildHybridCoordinationBrief,
} from '~~/shared/utils/project-control'
import type {
  HybridControl,
  HybridControlCallInsight,
  HybridControlCommunicationChannel,
  HybridControlCommunicationRule,
  HybridControlManagerAgentRole,
  HybridControlStakeholderRole,
  HybridControlTeamMember,
} from '~~/shared/types/project'

const props = defineProps<{
  control: HybridControl
  slug: string
  project: Record<string, unknown> | null
}>()

const emit = defineEmits<{
  save: []
  'focus-task': [taskId: string, sprintId?: string]
  'open-sprint-in-kanban': [sprintId?: string]
}>()

const communicationChannelOptions = (
  ['project-room', 'direct-thread', 'handoff', 'approval', 'daily-digest'] as const satisfies readonly HybridControlCommunicationChannel[]
).map(value => ({
  value,
  label: getHybridCommunicationChannelLabel(value),
}))

const stakeholderRoleOptions = (
  ['admin', 'manager', 'designer', 'client', 'contractor', 'seller', 'service'] as const satisfies readonly HybridControlStakeholderRole[]
).map(value => ({
  value,
  label: getHybridStakeholderRoleLabel(value),
}))

const teamMemberRoleLabels: Record<HybridControlTeamMember['role'], string> = {
  architect: 'Архитектор',
  designer: 'Дизайнер',
  contractor: 'Подрядчик',
  client: 'Клиент',
  manager: 'Менеджер',
  other: 'Участник',
}

const teamMemberChannelLabels: Record<HybridControlTeamMember['notifyBy'], string> = {
  email: 'Email',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  manual: 'Вручную',
  'ai-agent': 'AI агент',
}

const teamMemberStakeholderMap: Record<HybridControlTeamMember['role'], HybridControlStakeholderRole[]> = {
  architect: ['designer'],
  designer: ['designer'],
  contractor: ['contractor'],
  client: ['client'],
  manager: ['manager'],
  other: ['service'],
}

const managerAgentOptions = computed(() => props.control.managerAgents.map(agent => ({
  value: agent.id,
  label: agent.title,
})))

const coordinationBrief = computed(() => buildHybridCoordinationBrief(props.control, { projectSlug: props.slug }))

const callInsightDraft = reactive({
  title: '',
  relatedPhaseKey: '',
  summary: '',
  transcript: '',
})

const callInsightSaving = ref(false)
const callInsightStatus = ref('')
const callInsightApplyPendingId = ref('')

const msgModalOpen = ref(false)
const msgModalTarget = ref<HybridControlTeamMember | null>(null)
const msgModalText = ref('')
const msgModalSending = ref(false)
const msgModalError = ref('')

function getMemberName(id: string) {
  const m = props.control.team?.find((t: HybridControlTeamMember) => t.id === id)
  return m ? m.name : id
}

function getManagerAgentRoleLabel(role: HybridControlManagerAgentRole) {
  return getHybridControlManagerAgentRoleLabel(role)
}

function getCommunicationChannelLabel(channel: HybridControlCommunicationChannel) {
  return getHybridCommunicationChannelLabel(channel)
}

function getStakeholderRoleLabel(role: HybridControlStakeholderRole) {
  return getHybridStakeholderRoleLabel(role)
}

function getPhaseTitleByKey(phaseKey?: string) {
  if (!phaseKey) return 'Без привязки'
  return props.control.phases.find(phase => phase.phaseKey === phaseKey)?.title || phaseKey
}

function getAgentRecommendationCount(agentId: string) {
  return coordinationBrief.value.agents.find(agent => agent.id === agentId)?.recommendedActionCount || 0
}

function getTeamMemberRoleLabel(role: HybridControlTeamMember['role']) {
  return teamMemberRoleLabels[role] || role
}

function getTeamMemberChannelLabel(channel: HybridControlTeamMember['notifyBy']) {
  return teamMemberChannelLabels[channel] || channel
}

function getRecommendationRecipients(recommendation: { audience: HybridControlStakeholderRole[] }) {
  return props.control.team.filter(member => teamMemberStakeholderMap[member.role]?.some(role => recommendation.audience.includes(role)))
}

function getCallInsightActorLabel(insight: HybridControlCallInsight) {
  const roleLabel = insight.actorRole ? getStakeholderRoleLabel(insight.actorRole) : ''
  const actorName = insight.actorName || ''
  if (roleLabel && actorName) return `${roleLabel}: ${actorName}`
  return actorName || roleLabel
}

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

function hasRuleAudience(rule: HybridControlCommunicationRule, role: HybridControlStakeholderRole) {
  return rule.audience.includes(role)
}

function toggleRuleAudience(rule: HybridControlCommunicationRule, role: HybridControlStakeholderRole) {
  const index = rule.audience.indexOf(role)
  if (index >= 0) {
    if (rule.audience.length === 1) return
    rule.audience.splice(index, 1)
  } else {
    rule.audience.push(role)
  }
  emit('save')
}

function addCommunicationRule() {
  props.control.communicationPlaybook.push({
    id: `hybrid-rule-${Date.now()}`,
    title: `Правило ${props.control.communicationPlaybook.length + 1}`,
    trigger: 'Опишите условие, при котором запускается сценарий.',
    linkedChannel: 'project-room',
    audience: ['manager', 'designer'],
    ownerAgentId: managerAgentOptions.value[0]?.value || '',
    cadenceDays: 7,
    template: 'Коротко обозначьте статус, ожидание и следующий шаг.',
  })
  emit('save')
}

function removeCommunicationRule(index: number) {
  props.control.communicationPlaybook.splice(index, 1)
  emit('save')
}

async function submitCallInsight() {
  if (!callInsightDraft.summary.trim() || callInsightSaving.value) return

  callInsightSaving.value = true
  callInsightStatus.value = ''

  try {
    const response = await $fetch<{
      hybridControl: HybridControl
      meta: {
        blockerCountAdded: number
        checkpointCreated: boolean
      }
    }>(`/api/projects/${props.slug}/communications/call-insights`, {
      method: 'POST',
      body: {
        title: callInsightDraft.title,
        relatedPhaseKey: callInsightDraft.relatedPhaseKey,
        summary: callInsightDraft.summary,
        transcript: callInsightDraft.transcript,
      },
    })

    Object.assign(props.control, ensureHybridControl(response.hybridControl, props.project || {}))
    callInsightDraft.title = ''
    callInsightDraft.relatedPhaseKey = ''
    callInsightDraft.summary = ''
    callInsightDraft.transcript = ''
    callInsightStatus.value = response.meta.checkpointCreated
      ? `Звонок добавлен: блокеров поднято ${response.meta.blockerCountAdded}, контрольная точка создана.`
      : `Звонок добавлен: блокеров поднято ${response.meta.blockerCountAdded}.`
  } catch {
    callInsightStatus.value = 'Не удалось сохранить инсайты звонка.'
  } finally {
    callInsightSaving.value = false
  }
}

async function applyCallInsightToSprint(insightId: string) {
  if (!insightId || callInsightApplyPendingId.value) return

  callInsightApplyPendingId.value = insightId
  callInsightStatus.value = ''

  try {
    const response = await $fetch<{
      hybridControl: HybridControl
      meta: {
        createdTaskCount: number
        createdSprint: boolean
      }
    }>(`/api/projects/${props.slug}/communications/call-insights/${insightId}/apply`, {
      method: 'POST',
      body: {},
    })

    Object.assign(props.control, ensureHybridControl(response.hybridControl, props.project || {}))
    callInsightStatus.value = response.meta.createdTaskCount
      ? `Задач создано: ${response.meta.createdTaskCount}${response.meta.createdSprint ? '. Для них автоматически создан follow-up спринт.' : '.'}`
      : 'Новых задач не создано: все следующие шаги уже есть в спринте.'
  } catch {
    callInsightStatus.value = 'Не удалось превратить инсайт звонка в задачи спринта.'
  } finally {
    callInsightApplyPendingId.value = ''
  }
}

function openCallInsightTasks(insight: HybridControlCallInsight) {
  const taskIds = insight.appliedTaskIds || []
  const sprintId = insight.appliedSprintId
    || props.control.sprints.find(sprint => sprint.tasks.some(task => taskIds.includes(task.id)))?.id

  if (taskIds.length === 1 && taskIds[0]) {
    emit('focus-task', taskIds[0], sprintId)
    return
  }

  emit('open-sprint-in-kanban', sprintId)
}

function openMessageModal(member: HybridControlTeamMember, draftMessage: string = '') {
  msgModalTarget.value = member
  msgModalText.value = draftMessage
  msgModalError.value = ''
  msgModalOpen.value = true
}

function closeMessageModal() {
  msgModalOpen.value = false
  msgModalTarget.value = null
  msgModalText.value = ''
  msgModalError.value = ''
}

async function executeMessageDispatch() {
  if (!msgModalTarget.value || !msgModalText.value.trim()) return

  msgModalError.value = ''
  msgModalSending.value = true

  try {
    const res = await $fetch<{ success: boolean }>(`/api/projects/${props.slug}/communications/dispatch`, {
      method: 'POST',
      body: {
        memberId: msgModalTarget.value.id,
        message: msgModalText.value,
      },
    })

    if (res.success) {
      if (!props.control.communicationLog) {
        props.control.communicationLog = []
      }
      props.control.communicationLog.push({
        id: crypto.randomUUID(),
        memberId: msgModalTarget.value.id,
        channel: msgModalTarget.value.notifyBy || 'manual',
        message: msgModalText.value,
        status: 'delivered',
        dispatchedAt: new Date().toISOString(),
      })

      closeMessageModal()
    }
  } catch (e: unknown) {
    msgModalError.value = (e as { message?: string })?.message || 'Не удалось отправить сообщение'
  } finally {
    msgModalSending.value = false
  }
}
</script>
