<script setup lang="ts">
import type { MessengerAgentConnectionMode, MessengerAgentItem, MessengerAgentSettings } from '../../composables/useMessengerAgents'

type AgentWorkspaceSectionKey = 'overview' | 'settings' | 'links' | 'runs' | 'graph'

const props = defineProps<{
  agentId: string
  agentName: string
  agentLogin: string
  conversationId?: string | null
}>()

const navigation = useMessengerConversationState()
const agentsModel = useMessengerAgents()
const runtime = useMessengerAgentRuntime()
const runsModel = useMessengerAgentRuns()
const edgePayloadsModel = useMessengerAgentEdgePayloads()
const activeSection = useState<AgentWorkspaceSectionKey>('messenger-agent-chat-workspace-section', () => 'overview')
const feedbackMessage = ref('')
const feedbackTone = ref<'info' | 'error'>('info')
const settingsDraft = reactive({
  model: 'GPT-5.4',
  apiKey: '',
})
const settingsSaving = ref(false)

const sections: Array<{ key: AgentWorkspaceSectionKey; title: string; hint: string }> = [
  {
    key: 'overview',
    title: 'Обзор',
    hint: 'Состояние, фокус и модель агента',
  },
  {
    key: 'settings',
    title: 'Настройки',
    hint: 'Модель и внешний API key',
  },
  {
    key: 'links',
    title: 'Связи',
    hint: 'Исходящие и входящие связи агента',
  },
  {
    key: 'runs',
    title: 'Прогоны',
    hint: 'Живой статус и последние запуски',
  },
  {
    key: 'graph',
    title: 'Граф',
    hint: 'Отдельный node-модуль и payload лог',
  },
]

const normalizedLogin = computed(() => props.agentLogin.replace(/^@/, '').trim())
const resolvedAgent = computed<MessengerAgentItem | null>(() => agentsModel.agents.value.find(item => item.id === props.agentId || item.login === normalizedLogin.value) ?? null)
const runtimeState = computed(() => {
  const agent = resolvedAgent.value
  if (!agent) {
    return null
  }

  const candidate = runtime.activeRuns.value[agent.id] ?? null
  if (!candidate) {
    return null
  }

  if (props.conversationId && candidate.conversationId && candidate.conversationId !== props.conversationId) {
    return null
  }

  return candidate
})
const outgoingConnections = computed(() => {
  const agent = resolvedAgent.value
  if (!agent) {
    return []
  }

  return agent.settings.connections.map(connection => ({
    ...connection,
    agent: agentsModel.agents.value.find(item => item.id === connection.targetAgentId) ?? null,
  }))
})
const incomingConnections = computed(() => {
  const agent = resolvedAgent.value
  if (!agent) {
    return []
  }

  return agentsModel.agents.value.flatMap(item => item.settings.connections
    .filter(connection => connection.targetAgentId === agent.id)
    .map(connection => ({
      ...connection,
      agent: item,
    })))
})
const recentRuns = computed(() => {
  const agent = resolvedAgent.value
  if (!agent) {
    return []
  }

  return runsModel.runs.value
    .filter(run => run.agentId === agent.id)
    .filter(run => !props.conversationId || !run.conversationId || run.conversationId === props.conversationId)
    .slice(0, 5)
})
const recentPayloads = computed(() => {
  const agent = resolvedAgent.value
  if (!agent) {
    return []
  }

  return edgePayloadsModel.edgePayloads.value
    .filter(payload => payload.sourceAgentId === agent.id)
    .filter(payload => !props.conversationId || !payload.conversationId || payload.conversationId === props.conversationId)
    .slice(0, 4)
})
const workspaceTitle = computed(() => resolvedAgent.value?.displayName || props.agentName)
const workspaceDescription = computed(() => resolvedAgent.value?.description || 'Параметры и рабочее пространство агента подгружаются для текущего чата.')
const workspaceGreeting = computed(() => resolvedAgent.value?.greeting || 'Подготовьте контекст и настройте агент перед следующей отправкой.')
const workspaceModel = computed(() => resolvedAgent.value?.settings.model || settingsDraft.model)
const apiKeyConfigured = computed(() => Boolean(resolvedAgent.value?.settings.apiKeyConfigured))
const graphStats = computed(() => ({
  outgoing: outgoingConnections.value.length,
  incoming: incomingConnections.value.length,
  payloads: recentPayloads.value.length,
}))

function syncSettingsDraft() {
  settingsDraft.model = resolvedAgent.value?.settings.model || 'GPT-5.4'
  settingsDraft.apiKey = resolvedAgent.value?.settings.apiKey || ''
}

watch(() => resolvedAgent.value?.id, () => {
  syncSettingsDraft()
}, { immediate: true })

watch(() => props.agentId, async () => {
  if (!agentsModel.agents.value.length || !resolvedAgent.value) {
    await agentsModel.refresh()
  }

  if (!resolvedAgent.value) {
    return
  }

  await Promise.all([
    runsModel.refresh(resolvedAgent.value.id, 6),
    edgePayloadsModel.refresh(resolvedAgent.value.id, 8),
  ])
}, { immediate: true })

function connectionModeLabel(mode: MessengerAgentConnectionMode) {
  switch (mode) {
    case 'review':
      return 'Review'
    case 'enrich':
      return 'Enrich'
    case 'validate':
      return 'Validate'
    case 'summarize':
      return 'Summarize'
    case 'route':
      return 'Route'
  }
}

function runtimePhaseLabel(phase?: string) {
  switch (phase) {
    case 'started':
      return 'Получает вход'
    case 'context':
      return 'Собирает контекст'
    case 'files':
      return 'Разбирает файлы'
    case 'consulting':
      return 'Консультируется'
    case 'reasoning':
      return 'Готовит ответ'
    case 'completed':
      return 'Завершён'
    case 'failed':
      return 'Ошибка'
    default:
      return 'Ожидает запуск'
  }
}

function formatTimestamp(value?: string) {
  if (!value) {
    return 'Ещё не запускался'
  }

  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function saveSettings(payload: Pick<MessengerAgentSettings, 'model' | 'apiKey'>) {
  if (!resolvedAgent.value) {
    return
  }

  settingsSaving.value = true
  feedbackMessage.value = ''

  try {
    const nextSettings = await agentsModel.saveSettings(resolvedAgent.value.id, {
      model: payload.model,
      apiKey: payload.apiKey,
      connections: resolvedAgent.value.settings.connections,
      graphPosition: resolvedAgent.value.settings.graphPosition,
    })

    settingsDraft.model = nextSettings.model
    settingsDraft.apiKey = nextSettings.apiKey
    feedbackTone.value = 'info'
    feedbackMessage.value = 'Параметры агента обновлены для этого чата.'
  } catch {
    feedbackTone.value = 'error'
    feedbackMessage.value = 'Не удалось сохранить параметры агента.'
  } finally {
    settingsSaving.value = false
  }
}

async function handleModelChange(value: string) {
  settingsDraft.model = value

  if (!resolvedAgent.value || resolvedAgent.value.settings.model === value) {
    return
  }

  await saveSettings({
    model: value,
    apiKey: settingsDraft.apiKey,
  })
}

async function handleApiKeyBlur() {
  if (!resolvedAgent.value || resolvedAgent.value.settings.apiKey === settingsDraft.apiKey) {
    return
  }

  await saveSettings({
    model: settingsDraft.model,
    apiKey: settingsDraft.apiKey,
  })
}

function openAgentsSection() {
  navigation.openSection('agents')
}
</script>

<template>
  <section class="agent-chat-workspace" aria-label="Рабочее пространство агента">
    <header class="agent-chat-workspace__head">
      <div class="agent-chat-workspace__copy">
        <p class="agent-chat-workspace__eyebrow">Agent workspace</p>
        <h2 class="agent-chat-workspace__title">{{ workspaceTitle }}</h2>
        <p class="agent-chat-workspace__text">{{ workspaceDescription }}</p>
      </div>
      <div class="agent-chat-workspace__meta">
        <span class="agent-chat-workspace__status-pill" :class="{ 'agent-chat-workspace__status-pill--live': runtimeState }">
          {{ runtimeState ? runtimePhaseLabel(runtimeState.phase) : 'Idle' }}
        </span>
        <span class="agent-chat-workspace__status-pill" :class="{ 'agent-chat-workspace__status-pill--warning': !apiKeyConfigured }">
          {{ apiKeyConfigured ? 'API key подключён' : 'API key не задан' }}
        </span>
        <button type="button" class="agent-chat-workspace__ghost" @click="openAgentsSection">
          Открыть модуль агентов
        </button>
      </div>
    </header>

    <p v-if="feedbackMessage" class="agent-chat-workspace__feedback" :class="{ 'agent-chat-workspace__feedback--error': feedbackTone === 'error' }">
      {{ feedbackMessage }}
    </p>

    <div class="agent-chat-workspace__shell">
      <aside class="agent-chat-workspace__nav" aria-label="Подменю агента">
        <button
          v-for="section in sections"
          :key="section.key"
          type="button"
          class="agent-chat-workspace__nav-btn"
          :class="{ 'agent-chat-workspace__nav-btn--active': activeSection === section.key }"
          @click="activeSection = section.key"
        >
          <span class="agent-chat-workspace__nav-title">{{ section.title }}</span>
          <span class="agent-chat-workspace__nav-hint">{{ section.hint }}</span>
        </button>
      </aside>

      <div class="agent-chat-workspace__content">
        <div v-if="activeSection === 'overview'" class="agent-chat-workspace__grid">
          <article class="agent-chat-workspace__card">
            <p class="agent-chat-workspace__card-eyebrow">Сейчас в чате</p>
            <h3 class="agent-chat-workspace__card-title">Текущий фокус</h3>
            <p class="agent-chat-workspace__card-text">{{ runtimeState?.focus || workspaceGreeting }}</p>
          </article>
          <article class="agent-chat-workspace__card">
            <p class="agent-chat-workspace__card-eyebrow">Модель</p>
            <h3 class="agent-chat-workspace__card-title">{{ workspaceModel }}</h3>
            <p class="agent-chat-workspace__card-text">Последнее обновление: {{ formatTimestamp(resolvedAgent?.settings.updatedAt) }}</p>
          </article>
          <article class="agent-chat-workspace__card">
            <p class="agent-chat-workspace__card-eyebrow">Связи</p>
            <h3 class="agent-chat-workspace__card-title">{{ graphStats.outgoing }} исходящих / {{ graphStats.incoming }} входящих</h3>
            <p class="agent-chat-workspace__card-text">Node-модуль вынесен в отдельный раздел и открывается без выхода из messenger shell.</p>
          </article>
        </div>

        <div v-else-if="activeSection === 'settings'" class="agent-chat-workspace__stack">
          <article class="agent-chat-workspace__card agent-chat-workspace__card--form">
            <p class="agent-chat-workspace__card-eyebrow">Быстрые настройки</p>
            <h3 class="agent-chat-workspace__card-title">Параметры ответа</h3>
            <p class="agent-chat-workspace__card-text">Модель сохраняется сразу после выбора, API key обновляется по blur.</p>
            <VSelect
              :model-value="settingsDraft.model"
              :items="resolvedAgent?.modelOptions || ['GPT-5.4']"
              label="Модель агента"
              variant="outlined"
              hide-details="auto"
              :loading="settingsSaving"
              @update:model-value="handleModelChange(typeof $event === 'string' ? $event : 'GPT-5.4')"
            />
            <VTextField
              v-model="settingsDraft.apiKey"
              label="API key"
              type="password"
              variant="outlined"
              hide-details="auto"
              :loading="settingsSaving"
              @blur="handleApiKeyBlur"
            />
          </article>
        </div>

        <div v-else-if="activeSection === 'links'" class="agent-chat-workspace__grid agent-chat-workspace__grid--links">
          <article class="agent-chat-workspace__card">
            <p class="agent-chat-workspace__card-eyebrow">Исходящие связи</p>
            <h3 class="agent-chat-workspace__card-title">{{ outgoingConnections.length }}</h3>
            <div v-if="outgoingConnections.length" class="agent-chat-workspace__list">
              <div v-for="connection in outgoingConnections" :key="`${connection.targetAgentId}:${connection.mode}`" class="agent-chat-workspace__list-item">
                <strong>{{ connection.agent?.displayName || connection.targetAgentId }}</strong>
                <span>{{ connectionModeLabel(connection.mode) }}</span>
              </div>
            </div>
            <p v-else class="agent-chat-workspace__card-text">Для этого агента пока не настроены исходящие связи.</p>
          </article>
          <article class="agent-chat-workspace__card">
            <p class="agent-chat-workspace__card-eyebrow">Входящие связи</p>
            <h3 class="agent-chat-workspace__card-title">{{ incomingConnections.length }}</h3>
            <div v-if="incomingConnections.length" class="agent-chat-workspace__list">
              <div v-for="connection in incomingConnections" :key="`${connection.agent.id}:${connection.mode}`" class="agent-chat-workspace__list-item">
                <strong>{{ connection.agent.displayName }}</strong>
                <span>{{ connectionModeLabel(connection.mode) }}</span>
              </div>
            </div>
            <p v-else class="agent-chat-workspace__card-text">Ни один агент пока не маршрутизирует запросы в этот чат.</p>
          </article>
        </div>

        <div v-else-if="activeSection === 'runs'" class="agent-chat-workspace__stack">
          <article class="agent-chat-workspace__card">
            <p class="agent-chat-workspace__card-eyebrow">Живой статус</p>
            <h3 class="agent-chat-workspace__card-title">{{ runtimeState ? runtimePhaseLabel(runtimeState.phase) : 'Ожидает новое сообщение' }}</h3>
            <p class="agent-chat-workspace__card-text">{{ runtimeState?.summary || 'После следующего сообщения здесь появится live trace текущего прогона.' }}</p>
          </article>
          <div v-if="recentRuns.length" class="agent-chat-workspace__list">
            <button
              v-for="run in recentRuns"
              :key="run.runId"
              type="button"
              class="agent-chat-workspace__list-item agent-chat-workspace__list-item--button"
              @click="openAgentsSection"
            >
              <strong>{{ runtimePhaseLabel(run.events[run.events.length - 1]?.phase) }}</strong>
              <span>{{ formatTimestamp(run.updatedAt) }}</span>
            </button>
          </div>
          <p v-else class="agent-chat-workspace__card-text">История запусков для этого agent-чата пока пуста.</p>
        </div>

        <div v-else class="agent-chat-workspace__stack">
          <article class="agent-chat-workspace__card">
            <p class="agent-chat-workspace__card-eyebrow">Node-модуль</p>
            <h3 class="agent-chat-workspace__card-title">Граф вынесен в отдельное меню</h3>
            <p class="agent-chat-workspace__card-text">Отсюда видно краткое состояние, а полное визуальное редактирование и мониторинг остаются в отдельном разделе Агенты.</p>
            <div class="agent-chat-workspace__stats">
              <span>Исходящих: {{ graphStats.outgoing }}</span>
              <span>Входящих: {{ graphStats.incoming }}</span>
              <span>Payload log: {{ graphStats.payloads }}</span>
            </div>
            <button type="button" class="agent-chat-workspace__primary" @click="openAgentsSection">
              Открыть node-модуль
            </button>
          </article>
          <div v-if="recentPayloads.length" class="agent-chat-workspace__list">
            <div v-for="payload in recentPayloads" :key="`${payload.runId}:${payload.targetAgentId}:${payload.timestamp}`" class="agent-chat-workspace__list-item">
              <strong>{{ connectionModeLabel(payload.mode) }} → {{ agentsModel.agents.value.find(item => item.id === payload.targetAgentId)?.displayName || payload.targetAgentId }}</strong>
              <span>{{ payload.payloadPreview }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>