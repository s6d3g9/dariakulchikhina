<script setup lang="ts">
import type { MessengerAgentConnectionMode, MessengerAgentItem, MessengerAgentSettings } from '../../composables/useMessengerAgents'
import type { MessengerAgentRun, MessengerAgentRunArtifact, MessengerAgentRunEvent } from '../../composables/useMessengerAgentRuns'

type AgentWorkspaceSectionKey = 'overview' | 'settings' | 'links' | 'runs' | 'graph'

const props = defineProps<{
  agentId: string
  agentName: string
  agentLogin: string
  conversationId?: string | null
  collapsed?: boolean
}>()

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
}>()

const navigation = useMessengerConversationState()
const agentsModel = useMessengerAgents()
const runtime = useMessengerAgentRuntime()
const runsModel = useMessengerAgentRuns()
const edgePayloadsModel = useMessengerAgentEdgePayloads()
const activeSection = useState<AgentWorkspaceSectionKey>('messenger-agent-chat-workspace-section', () => 'overview')
const feedbackMessage = ref('')
const feedbackTone = ref<'info' | 'error'>('info')
const selectedRunId = ref<string | null>(null)
const settingsDraft = reactive({
  model: 'GPT-5.4',
  apiKey: '',
})
const settingsSaving = ref(false)
const searchDraft = ref('')
const searchOpen = ref(false)

const sections: Array<{ key: AgentWorkspaceSectionKey; title: string }> = [
  {
    key: 'overview',
    title: 'Обзор',
  },
  {
    key: 'settings',
    title: 'Настройки',
  },
  {
    key: 'links',
    title: 'Связи',
  },
  {
    key: 'runs',
    title: 'Прогоны',
  },
  {
    key: 'graph',
    title: 'Граф',
  },
]

const currentSection = computed(() => sections.find(section => section.key === activeSection.value) ?? sections[0])

const sectionIconMap: Record<AgentWorkspaceSectionKey, string> = {
  overview: 'mdi-view-dashboard-outline',
  settings: 'mdi-tune-variant',
  links: 'mdi-connection',
  runs: 'mdi-history',
  graph: 'mdi-graph-outline',
}

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
const selectedRun = computed(() => {
  if (!runsModel.selectedRun.value || runsModel.selectedRun.value.agentId !== resolvedAgent.value?.id) {
    return null
  }

  if (selectedRunId.value && runsModel.selectedRun.value.runId !== selectedRunId.value) {
    return null
  }

  return runsModel.selectedRun.value
})
const activeConnections = computed(() => runtimeState.value?.activeConnections || [])
const workspaceTitle = computed(() => resolvedAgent.value?.displayName || props.agentName)
const workspaceGreeting = computed(() => resolvedAgent.value?.greeting || 'Подготовьте контекст и настройте агент перед следующей отправкой.')
const workspaceModel = computed(() => resolvedAgent.value?.settings.model || settingsDraft.model)
const apiKeyConfigured = computed(() => Boolean(resolvedAgent.value?.settings.apiKeyConfigured))
const graphStats = computed(() => ({
  outgoing: outgoingConnections.value.length,
  incoming: incomingConnections.value.length,
  payloads: recentPayloads.value.length,
}))
const collapsed = computed({
  get: () => Boolean(props.collapsed),
  set: (value: boolean) => emit('update:collapsed', value),
})
const searchMatches = computed(() => {
  const query = searchDraft.value.trim().toLowerCase()
  if (!query) {
    return []
  }

  return sections.filter(section => section.title.toLowerCase().includes(query))
})

function syncSettingsDraft() {
  settingsDraft.model = resolvedAgent.value?.settings.model || 'GPT-5.4'
  settingsDraft.apiKey = resolvedAgent.value?.settings.apiKey || ''
}

watch(() => resolvedAgent.value?.id, () => {
  syncSettingsDraft()
  selectedRunId.value = null
  runsModel.clearSelection()
  activeSection.value = 'overview'
  searchDraft.value = ''
  searchOpen.value = false
}, { immediate: true })

watch(() => props.conversationId, () => {
  activeSection.value = 'overview'
  searchDraft.value = ''
  searchOpen.value = false
})

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

function runStatusLabel(status: MessengerAgentRun['status']) {
  switch (status) {
    case 'completed':
      return 'Завершён'
    case 'failed':
      return 'Ошибка'
    default:
      return 'Выполняется'
  }
}

function artifactKindLabel(kind: MessengerAgentRunArtifact['kind']) {
  switch (kind) {
    case 'consultation':
      return 'Консультация'
    case 'file':
      return 'Файл'
    case 'summary':
      return 'Сводка'
  }
}

function describeRunEvent(event: MessengerAgentRunEvent) {
  if (event.summary) {
    return event.summary
  }

  if (event.focus) {
    return event.focus
  }

  if (event.fileNames.length) {
    return `Файлы: ${event.fileNames.join(', ')}`
  }

  return 'Без подробностей'
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

function sectionIcon(section: AgentWorkspaceSectionKey) {
  return sectionIconMap[section]
}

function openSearch() {
  searchOpen.value = true
}

function closeSearch() {
  setTimeout(() => {
    searchOpen.value = false
  }, 150)
}

function selectSection(section: AgentWorkspaceSectionKey) {
  activeSection.value = section
  searchDraft.value = ''
  searchOpen.value = false
}

async function openRunDetail(runId: string) {
  selectedRunId.value = runId
  await runsModel.openRun(runId)
}
</script>

<template>
  <section v-if="!collapsed" class="agent-chat-workspace" aria-label="Рабочее пространство агента">
    <header class="agent-chat-workspace__head">
      <div class="agent-chat-workspace__copy">
        <h2 class="agent-chat-workspace__title">{{ workspaceTitle }}</h2>
        <p class="agent-chat-workspace__section-marker">{{ currentSection.title }}</p>
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

    <div class="agent-chat-workspace__window">
      <Transition name="screen-fade" mode="out-in">
        <div :key="activeSection" class="agent-chat-workspace__pane">
          <div v-if="activeSection === 'overview'" class="agent-chat-workspace__content agent-chat-workspace__content--grid">
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

          <div v-else-if="activeSection === 'settings'" class="agent-chat-workspace__content">
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

          <div v-else-if="activeSection === 'links'" class="agent-chat-workspace__content agent-chat-workspace__content--split">
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

          <div v-else-if="activeSection === 'runs'" class="agent-chat-workspace__content">
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
                :class="{ 'agent-chat-workspace__list-item--active': selectedRun?.runId === run.runId }"
                @click="openRunDetail(run.runId)"
              >
                <strong>{{ runStatusLabel(run.status) }}</strong>
                <span>{{ formatTimestamp(run.updatedAt) }}</span>
              </button>
            </div>
            <p v-else class="agent-chat-workspace__card-text">История запусков для этого agent-чата пока пуста.</p>
            <article v-if="selectedRun" class="agent-chat-workspace__card agent-chat-workspace__card--form">
              <p class="agent-chat-workspace__card-eyebrow">Детали прогона</p>
              <h3 class="agent-chat-workspace__card-title">{{ runStatusLabel(selectedRun.status) }} · {{ formatTimestamp(selectedRun.updatedAt) }}</h3>
              <div v-if="selectedRun.events.length" class="agent-chat-workspace__stack">
                <div v-for="event in selectedRun.events" :key="`${selectedRun.runId}:${event.phase}:${event.timestamp}`" class="agent-chat-workspace__list-item">
                  <strong>{{ runtimePhaseLabel(event.phase) }}</strong>
                  <span>{{ describeRunEvent(event) }}</span>
                </div>
              </div>
              <div v-if="selectedRun.events.some(event => event.artifacts.length)" class="agent-chat-workspace__stack">
                <div
                  v-for="artifact in selectedRun.events.flatMap(event => event.artifacts).slice(0, 6)"
                  :key="`${selectedRun.runId}:${artifact.kind}:${artifact.label}`"
                  class="agent-chat-workspace__list-item"
                >
                  <strong>{{ artifactKindLabel(artifact.kind) }} · {{ artifact.label }}</strong>
                  <span>{{ artifact.content }}</span>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="agent-chat-workspace__content agent-chat-workspace__content--split">
            <article class="agent-chat-workspace__card">
              <p class="agent-chat-workspace__card-eyebrow">Сводка графа</p>
              <h3 class="agent-chat-workspace__card-title">Связи и маршрутизация</h3>
              <p class="agent-chat-workspace__card-text">Вкладка показывает текущие рёбра этого агента и последние payload-переходы без выхода из чата.</p>
              <div class="agent-chat-workspace__stats">
                <span>Исходящих: {{ graphStats.outgoing }}</span>
                <span>Входящих: {{ graphStats.incoming }}</span>
                <span>Payload log: {{ graphStats.payloads }}</span>
              </div>
              <button type="button" class="agent-chat-workspace__primary" @click="openAgentsSection">
                Открыть node-модуль
              </button>
            </article>
            <article class="agent-chat-workspace__card">
              <p class="agent-chat-workspace__card-eyebrow">Активные рёбра</p>
              <h3 class="agent-chat-workspace__card-title">{{ activeConnections.length || recentPayloads.length ? 'Есть маршрутные события' : 'Пока без маршрутов' }}</h3>
              <div v-if="activeConnections.length" class="agent-chat-workspace__stack">
                <div v-for="connection in activeConnections" :key="`${connection.targetAgentId}:${connection.mode}`" class="agent-chat-workspace__list-item">
                  <strong>{{ connectionModeLabel(connection.mode) }} → {{ agentsModel.agents.value.find(item => item.id === connection.targetAgentId)?.displayName || connection.targetAgentId }}</strong>
                  <span>{{ connection.payloadPreview || 'Payload будет показан здесь во время активного прогона.' }}</span>
                </div>
              </div>
              <p v-else class="agent-chat-workspace__card-text">Активных рёбер сейчас нет. Последние передачи ниже.</p>
            </article>
            <div v-if="recentPayloads.length" class="agent-chat-workspace__list agent-chat-workspace__list--split-span">
              <div v-for="payload in recentPayloads" :key="`${payload.runId}:${payload.targetAgentId}:${payload.timestamp}`" class="agent-chat-workspace__list-item">
                <strong>{{ connectionModeLabel(payload.mode) }} → {{ agentsModel.agents.value.find(item => item.id === payload.targetAgentId)?.displayName || payload.targetAgentId }}</strong>
                <span>{{ payload.payloadPreview }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <div class="agent-chat-workspace__dock">
      <div class="section-tabs-row agent-chat-workspace__tabs-row">
        <VTabs
          :model-value="activeSection"
          class="section-tabs"
          bg-color="surface-container"
          color="primary"
          density="compact"
          grow
          @update:model-value="selectSection($event as AgentWorkspaceSectionKey)"
        >
          <VTab
            v-for="section in sections"
            :key="section.key"
            :value="section.key"
            :aria-label="section.title"
            :title="section.title"
          >
            <VIcon>{{ sectionIcon(section.key) }}</VIcon>
          </VTab>
        </VTabs>
      </div>

      <div class="search-dock search-dock--bottom-dock agent-chat-workspace__search-dock">
        <div class="search-dock__field">
          <MessengerDockField>
            <input
              v-model="searchDraft"
              type="text"
              class="composer-input composer-input--dock"
              placeholder="Найти раздел"
              autocomplete="off"
              @focus="openSearch"
              @blur="closeSearch"
            />
          </MessengerDockField>

          <Transition name="chrome-reveal">
            <div v-if="searchOpen && searchMatches.length" class="search-dropdown" @mousedown.prevent>
              <VList bg-color="transparent" density="comfortable">
                <VListItem
                  v-for="section in searchMatches"
                  :key="section.key"
                  @click="selectSection(section.key)"
                >
                  <template #title>{{ section.title }}</template>
                </VListItem>
              </VList>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </section>
</template>