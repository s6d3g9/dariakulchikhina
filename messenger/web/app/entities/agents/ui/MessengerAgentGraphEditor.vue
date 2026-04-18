<script setup lang="ts">
import type { MessengerAgentConnection, MessengerAgentConnectionMode, MessengerAgentGraphNodeInput, MessengerAgentItem } from '../model/useMessengerAgents'
import type { MessengerAgentRun } from '../model/useMessengerAgentRuns'

interface AgentNodePosition {
  x: number
  y: number
}

const props = defineProps<{
  agents: MessengerAgentItem[]
  saving?: boolean
}>()

const emit = defineEmits<{
  'save-graph': [graph: Record<string, MessengerAgentGraphNodeInput>]
  'open-settings': [agentId: string]
  'open-agent': [agentId: string]
}>()

const canvasRef = ref<HTMLElement | null>(null)
const runtime = useMessengerAgentRuntime()
const runsModel = useMessengerAgentRuns()
const edgePayloadsModel = useMessengerAgentEdgePayloads()
const graphMode = useState<'observe' | 'edit'>('messenger-agent-graph-mode', () => 'observe')
const selectedAgentId = ref<string | null>(null)
const linkingFromId = ref<string | null>(null)
const nodePositions = reactive<Record<string, AgentNodePosition>>({})
const draftConnections = reactive<Record<string, MessengerAgentConnection[]>>({})
const draggingAgentId = ref<string | null>(null)
const dragOffset = reactive({ x: 0, y: 0 })
const filters = reactive({
  activity: 'all' as 'all' | 'active' | 'failed' | 'idle',
  edgeMode: 'all' as 'all' | MessengerAgentConnectionMode,
  conversationId: '',
})

const selectedAgent = computed(() => props.agents.find(agent => agent.id === selectedAgentId.value) ?? null)
const selectedRuntime = computed(() => selectedAgent.value ? runtime.activeRuns.value[selectedAgent.value.id] ?? null : null)
const selectedArtifacts = computed(() => selectedRuntime.value?.artifacts || [])
const recentRuns = computed(() => runsModel.runs.value)
const selectedRun = computed(() => runsModel.selectedRun.value)
const normalizedConversationFilter = computed(() => filters.conversationId.trim().toLowerCase())
const isEditMode = computed(() => graphMode.value === 'edit')
const isObserveMode = computed(() => graphMode.value === 'observe')

function matchesConversationId(value?: string | null) {
  if (!normalizedConversationFilter.value) {
    return true
  }

  return String(value || '').toLowerCase().includes(normalizedConversationFilter.value)
}

function matchesMode(mode?: MessengerAgentConnectionMode | null) {
  return filters.edgeMode === 'all' || mode === filters.edgeMode
}

function isAgentActivityMatch(agentId: string) {
  if (filters.activity === 'all') {
    return true
  }

  const runtimeState = runtime.activeRuns.value[agentId]
  const latestRun = runsModel.runs.value.find(run => run.agentId === agentId)

  if (filters.activity === 'active') {
    return Boolean(runtimeState && runtimeState.status === 'running')
  }

  if (filters.activity === 'failed') {
    return runtimeState?.status === 'failed' || latestRun?.status === 'failed'
  }

  if (filters.activity === 'idle') {
    return !runtimeState || runtimeState.status !== 'running'
  }

  return true
}
const passiveEdgeCards = computed(() => {
  if (!selectedAgentId.value) {
    return []
  }

  return edgePayloadsModel.edgePayloads.value
    .filter(item => item.sourceAgentId === selectedAgentId.value)
    .filter(item => matchesMode(item.mode) && matchesConversationId(item.conversationId))
    .map((item) => {
      const sourcePosition = nodePositions[item.sourceAgentId]
      const targetPosition = nodePositions[item.targetAgentId]
      if (!sourcePosition || !targetPosition) {
        return null
      }

      return {
        key: `${item.runId}:${item.sourceAgentId}:${item.targetAgentId}:${item.timestamp}`,
        left: (sourcePosition.x + targetPosition.x) / 2,
        top: (sourcePosition.y + targetPosition.y) / 2 + 22,
        mode: item.mode,
        payloadPreview: item.payloadPreview,
        timestamp: item.timestamp,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 8)
})
const graphDirty = computed(() => props.agents.some(agent => {
  const current = JSON.stringify([...agent.settings.connections].sort((left, right) => left.targetAgentId.localeCompare(right.targetAgentId, 'en')))
  const draft = JSON.stringify([...(draftConnections[agent.id] || [])].sort((left, right) => left.targetAgentId.localeCompare(right.targetAgentId, 'en')))
  const currentPosition = `${agent.settings.graphPosition.x}:${agent.settings.graphPosition.y}`
  const draftPosition = `${nodePositions[agent.id]?.x || 0}:${nodePositions[agent.id]?.y || 0}`
  return current !== draft || currentPosition !== draftPosition
}))

const runtimeEdges = computed(() => Object.values(runtime.activeRuns.value).flatMap((run) =>
  run.activeConnections
    .filter(connection => matchesMode(connection.mode) && matchesConversationId(run.conversationId))
    .map(connection => `${run.agentId}:${connection.targetAgentId}`),
))

const activeEdgeCards = computed(() => Object.values(runtime.activeRuns.value).flatMap((run) =>
  run.activeConnections
    .filter((connection) => matchesMode(connection.mode) && matchesConversationId(run.conversationId))
    .map((connection) => {
      const sourcePosition = nodePositions[run.agentId]
      const targetPosition = nodePositions[connection.targetAgentId]
      if (!sourcePosition || !targetPosition) {
        return null
      }

      return {
        key: `${run.runId}:${run.agentId}:${connection.targetAgentId}:${connection.mode}`,
        left: (sourcePosition.x + targetPosition.x) / 2,
        top: (sourcePosition.y + targetPosition.y) / 2,
        mode: connection.mode,
        payloadPreview: connection.payloadPreview || '',
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item)),
))

const timelineItems = computed(() => runtime.timeline.value
  .filter(item => matchesConversationId(item.conversationId))
  .filter(item => filters.activity === 'all'
    || (filters.activity === 'active' && item.status === 'running')
    || (filters.activity === 'failed' && item.status === 'failed')
    || (filters.activity === 'idle' && item.status !== 'running'))
  .filter(item => filters.edgeMode === 'all' || item.activeConnections.some(connection => connection.mode === filters.edgeMode))
  .slice(0, 8))

const filteredRecentRuns = computed(() => recentRuns.value
  .filter(run => matchesConversationId(run.conversationId))
  .filter(run => filters.activity === 'all'
    || (filters.activity === 'active' && run.status === 'running')
    || (filters.activity === 'failed' && run.status === 'failed')
    || (filters.activity === 'idle' && run.status !== 'running'))
  .filter(run => filters.edgeMode === 'all' || run.events.some(event => event.artifacts.some(artifact => artifact.label.toLowerCase().includes(filters.edgeMode.toLowerCase())))))

const filteredEdgePayloadLog = computed(() => edgePayloadsModel.edgePayloads.value
  .filter(item => matchesMode(item.mode) && matchesConversationId(item.conversationId))
  .slice(0, 8))

const graphStats = computed(() => ({
  nodes: props.agents.length,
  links: Object.values(draftConnections).reduce((sum, connections) => sum + connections.length, 0),
}))

const outgoingAgents = computed(() => {
  if (!selectedAgent.value) {
    return []
  }

  return props.agents.filter(agent => (draftConnections[selectedAgent.value!.id] || []).some(connection => connection.targetAgentId === agent.id))
})

const incomingAgents = computed(() => {
  if (!selectedAgent.value) {
    return []
  }

  return props.agents.filter(agent => (draftConnections[agent.id] || []).some(connection => connection.targetAgentId === selectedAgent.value!.id))
})

const edges = computed(() => props.agents.flatMap((agent) => {
  const sourcePosition = nodePositions[agent.id]
  if (!sourcePosition) {
    return []
  }

  return (draftConnections[agent.id] || [])
    .map((connection) => {
      const targetPosition = nodePositions[connection.targetAgentId]
      if (!targetPosition) {
        return null
      }

      const sourceX = sourcePosition.x + 100
      const sourceY = sourcePosition.y + 44
      const targetX = targetPosition.x + 100
      const targetY = targetPosition.y + 44
      const controlOffset = Math.max(72, Math.abs(targetX - sourceX) * 0.35)

      return {
        key: `${agent.id}:${connection.targetAgentId}`,
        sourceId: agent.id,
        targetId: connection.targetAgentId,
        mode: connection.mode,
        labelX: (sourceX + targetX) / 2,
        labelY: (sourceY + targetY) / 2,
        path: `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`,
      }
    })
    .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge))
}))

function createDefaultPosition(index: number): AgentNodePosition {
  return {
    x: 32 + (index % 3) * 232,
    y: 32 + Math.floor(index / 3) * 168,
  }
}

function clampPosition(position: AgentNodePosition) {
  const canvas = canvasRef.value
  if (!canvas) {
    return position
  }

  const width = canvas.clientWidth
  const height = canvas.clientHeight

  return {
    x: Math.max(16, Math.min(position.x, Math.max(16, width - 216))),
    y: Math.max(16, Math.min(position.y, Math.max(16, height - 104))),
  }
}

function syncGraphState() {
  props.agents.forEach((agent, index) => {
    draftConnections[agent.id] = agent.settings.connections.map(connection => ({ ...connection }))
    nodePositions[agent.id] = clampPosition(agent.settings.graphPosition || nodePositions[agent.id] || createDefaultPosition(index))
  })

  for (const existingAgentId of Object.keys(nodePositions)) {
    if (!props.agents.some(agent => agent.id === existingAgentId)) {
      delete nodePositions[existingAgentId]
      delete draftConnections[existingAgentId]
    }
  }

  if (!selectedAgentId.value || !props.agents.some(agent => agent.id === selectedAgentId.value)) {
    selectedAgentId.value = props.agents[0]?.id || null
  }
}

watch(() => props.agents, () => {
  syncGraphState()
}, { immediate: true, deep: true })

watch(() => selectedAgentId.value, async (agentId) => {
  if (!agentId) {
    runsModel.clearSelection()
    return
  }

  await Promise.all([
    runsModel.refresh(agentId, 8),
    edgePayloadsModel.refresh(agentId, 18),
  ])
}, { immediate: true })

function resolveAgentAvatar(agent: MessengerAgentItem) {
  return agent.displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'AI'
}

function runtimeLabel(agentId: string) {
  const run = runtime.activeRuns.value[agentId]
  if (!run) {
    return ''
  }

  switch (run.phase) {
    case 'started':
      return 'Вход'
    case 'context':
      return 'Контекст'
    case 'files':
      return 'Файлы'
    case 'consulting':
      return 'Связи'
    case 'reasoning':
      return 'Сборка'
    case 'completed':
      return 'Готово'
    case 'failed':
      return 'Ошибка'
  }
}

function runStatusLabel(run: MessengerAgentRun) {
  if (run.status === 'completed') {
    return 'Завершён'
  }

  if (run.status === 'failed') {
    return 'Ошибка'
  }

  return 'Выполняется'
}

function formatRunTime(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })
}

async function openRun(runId: string) {
  await runsModel.openRun(runId)
}

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

function connectionModeClass(mode: MessengerAgentConnectionMode) {
  return `agent-graph-mode--${mode}`
}

function setGraphMode(mode: 'observe' | 'edit') {
  graphMode.value = mode
  if (mode === 'observe') {
    linkingFromId.value = null
  }
}

function nodeClass(agentId: string) {
  return {
    'agent-graph-node--dimmed': isObserveMode.value && !isAgentActivityMatch(agentId),
  }
}

function selectAgent(agentId: string) {
  if (linkingFromId.value && linkingFromId.value !== agentId) {
    toggleConnection(linkingFromId.value, agentId)
    return
  }

  selectedAgentId.value = agentId
}

function startLinking(agentId: string) {
  if (!isEditMode.value) {
    return
  }

  selectedAgentId.value = agentId
  linkingFromId.value = linkingFromId.value === agentId ? null : agentId
}

function toggleConnection(sourceId: string, targetId: string) {
  if (!isEditMode.value) {
    return
  }

  const current = draftConnections[sourceId] || []
  if (current.some(connection => connection.targetAgentId === targetId)) {
    draftConnections[sourceId] = current.filter(connection => connection.targetAgentId !== targetId)
  } else {
    draftConnections[sourceId] = [...current, { targetAgentId: targetId, mode: 'review' }]
  }

  linkingFromId.value = null
}

function removeConnection(sourceId: string, targetId: string) {
  if (!isEditMode.value) {
    return
  }

  draftConnections[sourceId] = (draftConnections[sourceId] || []).filter(connection => connection.targetAgentId !== targetId)
}

function updateConnectionMode(sourceId: string, targetId: string, mode: MessengerAgentConnectionMode) {
  if (!isEditMode.value) {
    return
  }

  draftConnections[sourceId] = (draftConnections[sourceId] || []).map(connection => connection.targetAgentId === targetId
    ? {
        ...connection,
        mode,
      }
    : connection)
}

function resetGraph() {
  props.agents.forEach((agent) => {
    draftConnections[agent.id] = agent.settings.connections.map(connection => ({ ...connection }))
    nodePositions[agent.id] = clampPosition(agent.settings.graphPosition)
  })
  linkingFromId.value = null
}

function autoArrange() {
  props.agents.forEach((agent, index) => {
    nodePositions[agent.id] = clampPosition(createDefaultPosition(index))
  })
}

function saveGraph() {
  const graph: Record<string, MessengerAgentGraphNodeInput> = Object.fromEntries(props.agents.map(agent => [agent.id, {
    connections: [...(draftConnections[agent.id] || [])],
    graphPosition: { x: nodePositions[agent.id]?.x ?? 0, y: nodePositions[agent.id]?.y ?? 0 },
  }]))
  emit('save-graph', graph)
}

function beginDrag(agentId: string, event: PointerEvent) {
  if (!isEditMode.value) {
    return
  }

  if (!(event.currentTarget instanceof HTMLElement)) {
    return
  }

  if ((event.target as HTMLElement)?.closest('button')) {
    return
  }

  const position = nodePositions[agentId]
  if (!position) {
    return
  }

  draggingAgentId.value = agentId
  dragOffset.x = event.clientX - position.x
  dragOffset.y = event.clientY - position.y
}

function handlePointerMove(event: PointerEvent) {
  if (!draggingAgentId.value) {
    return
  }

  const canvas = canvasRef.value
  if (!canvas) {
    return
  }

  const bounds = canvas.getBoundingClientRect()
  nodePositions[draggingAgentId.value] = clampPosition({
    x: event.clientX - bounds.left - dragOffset.x,
    y: event.clientY - bounds.top - dragOffset.y,
  })
}

function handlePointerUp() {
  if (!draggingAgentId.value) {
    return
  }

  draggingAgentId.value = null
}

onMounted(() => {
  if (!import.meta.client) {
    return
  }

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
})

onBeforeUnmount(() => {
  if (!import.meta.client) {
    return
  }

  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
})
</script>

<template>
  <section class="agent-graph-module">
    <header class="agent-graph-module__head">
      <div>
        <p class="agent-graph-module__eyebrow">Agent graph</p>
        <h2 class="agent-graph-module__title">Визуальное наблюдение и редактирование связей</h2>
      </div>
      <div class="agent-graph-module__meta">
        <div class="agent-graph-mode-switch" role="tablist" aria-label="Режим графа агентов">
          <button type="button" class="agent-graph-mode-switch__btn" :class="{ 'agent-graph-mode-switch__btn--active': graphMode === 'observe' }" @click="setGraphMode('observe')">
            Observe
          </button>
          <button type="button" class="agent-graph-mode-switch__btn" :class="{ 'agent-graph-mode-switch__btn--active': graphMode === 'edit' }" @click="setGraphMode('edit')">
            Edit
          </button>
        </div>
        <span>Ноды: {{ graphStats.nodes }}</span>
        <span>Связи: {{ graphStats.links }}</span>
        <template v-if="isEditMode">
          <VBtn size="small" color="secondary" variant="text" :disabled="saving" @click="autoArrange">Автораскладка</VBtn>
          <VBtn size="small" color="secondary" variant="text" :disabled="!graphDirty || saving" @click="resetGraph">Сбросить</VBtn>
          <VBtn size="small" color="primary" variant="tonal" :loading="saving" :disabled="!graphDirty" @click="saveGraph">Сохранить граф</VBtn>
        </template>
      </div>
    </header>

    <div v-if="isObserveMode" class="agent-graph-filters">
      <label class="agent-graph-filters__field">
        <span>Активность</span>
        <select v-model="filters.activity" class="agent-graph-filters__select">
          <option value="all">Все</option>
          <option value="active">Только активные</option>
          <option value="failed">Только ошибки</option>
          <option value="idle">Только idle</option>
        </select>
      </label>
      <label class="agent-graph-filters__field">
        <span>Режим связи</span>
        <select v-model="filters.edgeMode" class="agent-graph-filters__select">
          <option value="all">Все режимы</option>
          <option value="review">Review</option>
          <option value="enrich">Enrich</option>
          <option value="validate">Validate</option>
          <option value="summarize">Summarize</option>
          <option value="route">Route</option>
        </select>
      </label>
      <label class="agent-graph-filters__field agent-graph-filters__field--wide">
        <span>Conversation ID</span>
        <input v-model="filters.conversationId" type="text" class="agent-graph-filters__input" placeholder="Фильтр по conversationId" />
      </label>
    </div>

    <div class="agent-graph-module__body">
      <div ref="canvasRef" class="agent-graph-canvas">
        <svg class="agent-graph-canvas__edges" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="agent-graph-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgb(var(--v-theme-primary))" />
            </marker>
          </defs>
          <path
            v-for="edge in edges"
            :key="edge.key"
            :d="edge.path"
            class="agent-graph-canvas__edge"
            :class="{
              'agent-graph-canvas__edge--active': selectedAgentId === edge.sourceId || selectedAgentId === edge.targetId,
              'agent-graph-canvas__edge--linking': linkingFromId === edge.sourceId,
              'agent-graph-canvas__edge--runtime': runtimeEdges.includes(edge.key),
            }"
            :data-mode="edge.mode"
            marker-end="url(#agent-graph-arrow)"
          />
        </svg>

        <div
          v-for="edge in edges"
          :key="`${edge.key}:label`"
          class="agent-graph-edge-label"
          :style="{
            left: `${edge.labelX}px`,
            top: `${edge.labelY}px`,
          }"
          :class="connectionModeClass(edge.mode)"
        >
          {{ connectionModeLabel(edge.mode) }}
        </div>

        <div
          v-for="card in activeEdgeCards"
          :key="card.key"
          class="agent-graph-edge-card"
          :style="{
            left: `${card.left}px`,
            top: `${card.top}px`,
          }"
          :class="connectionModeClass(card.mode)"
        >
          <span class="agent-graph-edge-card__mode">{{ connectionModeLabel(card.mode) }}</span>
          <span class="agent-graph-edge-card__payload">{{ card.payloadPreview }}</span>
        </div>

        <div
          v-for="card in passiveEdgeCards"
          :key="`${card.key}:passive`"
          class="agent-graph-edge-card agent-graph-edge-card--passive"
          :class="connectionModeClass(card.mode)"
          :style="{
            left: `${card.left}px`,
            top: `${card.top}px`,
          }"
        >
          <span class="agent-graph-edge-card__mode">{{ connectionModeLabel(card.mode) }}</span>
          <span class="agent-graph-edge-card__payload">{{ card.payloadPreview }}</span>
        </div>

        <button
          v-for="agent in agents"
          :key="agent.id"
          type="button"
          class="agent-graph-node"
          :class="{
            'agent-graph-node--selected': selectedAgentId === agent.id,
            'agent-graph-node--linking': linkingFromId === agent.id,
            'agent-graph-node--running': Boolean(runtime.activeRuns.value[agent.id]),
            'agent-graph-node--failed': runtime.activeRuns.value[agent.id]?.status === 'failed',
            ...nodeClass(agent.id),
          }"
          :style="{
            left: `${nodePositions[agent.id]?.x || 0}px`,
            top: `${nodePositions[agent.id]?.y || 0}px`,
          }"
          @click="selectAgent(agent.id)"
          @pointerdown="beginDrag(agent.id, $event)"
        >
          <div class="agent-graph-node__avatar">{{ resolveAgentAvatar(agent) }}</div>
          <div class="agent-graph-node__copy">
            <span class="agent-graph-node__title">{{ agent.displayName }}</span>
            <span class="agent-graph-node__meta">{{ agent.settings.model }}</span>
            <span class="agent-graph-node__submeta">{{ (draftConnections[agent.id] || []).length }} исходящих связей</span>
            <span v-if="runtime.activeRuns.value[agent.id]" class="agent-graph-node__runtime">{{ runtimeLabel(agent.id) }} · {{ runtime.activeRuns.value[agent.id]!.summary }}</span>
          </div>
          <div class="agent-graph-node__actions">
            <button v-if="isEditMode" type="button" class="agent-graph-node__action" @click.stop="startLinking(agent.id)">
              {{ linkingFromId === agent.id ? 'Отмена связи' : 'Связать' }}
            </button>
          </div>
        </button>
      </div>

      <aside class="agent-graph-inspector">
        <template v-if="selectedAgent">
          <div class="agent-graph-inspector__head">
            <p class="agent-graph-inspector__eyebrow">Нода</p>
            <h3 class="agent-graph-inspector__title">{{ selectedAgent.displayName }}</h3>
            <p class="agent-graph-inspector__text">{{ selectedAgent.description }}</p>
          </div>

          <div class="agent-graph-inspector__section">
            <span class="agent-graph-inspector__label">Модель</span>
            <span class="agent-graph-inspector__value">{{ selectedAgent.settings.model }}</span>
          </div>

          <div class="agent-graph-inspector__section">
            <span class="agent-graph-inspector__label">API key</span>
            <span class="agent-graph-inspector__value">{{ selectedAgent.settings.apiKeyConfigured ? 'Задан' : 'Не задан' }}</span>
          </div>

          <div class="agent-graph-inspector__section">
            <span class="agent-graph-inspector__label">Текущая активность</span>
            <p v-if="selectedRuntime" class="agent-graph-inspector__text">
              {{ selectedRuntime.summary }}
            </p>
            <p v-if="selectedRuntime?.focus" class="agent-graph-inspector__text">
              Фокус: {{ selectedRuntime.focus }}
            </p>
            <div v-if="selectedRuntime?.fileNames.length" class="agent-graph-inspector__chips">
              <span v-for="fileName in selectedRuntime.fileNames" :key="fileName" class="agent-graph-chip agent-graph-chip--passive">
                {{ fileName }}
              </span>
            </div>
            <p v-if="!selectedRuntime" class="agent-graph-inspector__text">Агент сейчас не выполняет активную задачу.</p>
          </div>

          <div class="agent-graph-inspector__section">
            <span class="agent-graph-inspector__label">Артефакты прогона</span>
            <div v-if="selectedArtifacts.length" class="agent-runtime-artifacts">
              <div v-for="artifact in selectedArtifacts" :key="`${artifact.kind}:${artifact.label}:${artifact.content}`" class="agent-runtime-artifacts__item">
                <span class="agent-runtime-artifacts__label">{{ artifact.label }}</span>
                <span class="agent-runtime-artifacts__content">{{ artifact.content }}</span>
              </div>
            </div>
            <p v-else class="agent-graph-inspector__text">Промежуточные артефакты пока не собраны.</p>
          </div>

          <div class="agent-graph-inspector__section">
            <div class="agent-graph-inspector__section-head">
              <span class="agent-graph-inspector__label">Исходящие связи</span>
              <button v-if="isEditMode" type="button" class="agent-graph-inspector__ghost" @click="startLinking(selectedAgent.id)">
                {{ linkingFromId === selectedAgent.id ? 'Отмена' : 'Добавить связь' }}
              </button>
            </div>
            <div v-if="outgoingAgents.length" class="agent-graph-inspector__chips">
              <div
                v-for="agent in outgoingAgents"
                :key="`${selectedAgent.id}:${agent.id}`"
                class="agent-graph-connection-editor"
              >
                <button
                  v-if="isEditMode"
                  type="button"
                  class="agent-graph-chip"
                  @click="removeConnection(selectedAgent.id, agent.id)"
                >
                  {{ agent.displayName }}
                </button>
                <span v-else class="agent-graph-chip agent-graph-chip--passive">{{ agent.displayName }}</span>
                <select
                  v-if="isEditMode"
                  class="agent-graph-connection-editor__select"
                  :value="(draftConnections[selectedAgent.id] || []).find(connection => connection.targetAgentId === agent.id)?.mode || 'review'"
                  @change="updateConnectionMode(selectedAgent.id, agent.id, ($event.target as HTMLSelectElement).value as MessengerAgentConnectionMode)"
                >
                  <option value="review">Review</option>
                  <option value="enrich">Enrich</option>
                  <option value="validate">Validate</option>
                  <option value="summarize">Summarize</option>
                  <option value="route">Route</option>
                </select>
              </div>
            </div>
            <p v-else class="agent-graph-inspector__text">Связей пока нет.</p>
          </div>

          <div class="agent-graph-inspector__section">
            <span class="agent-graph-inspector__label">Входящие связи</span>
            <div v-if="incomingAgents.length" class="agent-graph-inspector__chips">
              <span v-for="agent in incomingAgents" :key="`${agent.id}:${selectedAgent.id}`" class="agent-graph-chip agent-graph-chip--passive">
                {{ agent.displayName }}
              </span>
            </div>
            <p v-else class="agent-graph-inspector__text">Ни одна нода пока не ссылается на этого агента.</p>
          </div>

          <div class="agent-graph-inspector__actions">
            <VBtn size="small" color="secondary" variant="text" @click="emit('open-settings', selectedAgent.id)">Меню агента</VBtn>
            <VBtn size="small" color="primary" variant="tonal" @click="emit('open-agent', selectedAgent.id)">Открыть чат</VBtn>
          </div>
        </template>

        <div class="agent-graph-inspector__section">
          <span class="agent-graph-inspector__label">Живой trace</span>
          <div class="agent-runtime-feed">
            <div v-for="item in timelineItems" :key="`${item.runId}:${item.phase}`" class="agent-runtime-feed__item">
              <span class="agent-runtime-feed__meta">{{ item.agentId }} · {{ runtimeLabel(item.agentId) || item.phase }}</span>
              <strong class="agent-runtime-feed__summary">{{ item.summary }}</strong>
              <span v-if="item.focus" class="agent-runtime-feed__focus">{{ item.focus }}</span>
              <span v-if="item.artifacts[0]?.content" class="agent-runtime-feed__focus">{{ item.artifacts[0].label }}: {{ item.artifacts[0].content }}</span>
            </div>
          </div>
        </div>

        <div class="agent-graph-inspector__section">
          <span class="agent-graph-inspector__label">История прогонов</span>
          <div class="agent-run-history">
            <button
              v-for="run in filteredRecentRuns"
              :key="run.runId"
              type="button"
              class="agent-run-history__item"
              :class="{ 'agent-run-history__item--active': selectedRun?.runId === run.runId }"
              @click="openRun(run.runId)"
            >
              <span class="agent-run-history__meta">{{ runStatusLabel(run) }} · {{ formatRunTime(run.updatedAt) }}</span>
              <strong class="agent-run-history__title">{{ run.events[run.events.length - 1]?.summary || 'Прогон без событий' }}</strong>
              <span class="agent-run-history__meta">runId: {{ run.runId }}</span>
            </button>
          </div>
          <div v-if="selectedRun" class="agent-run-detail">
            <div class="agent-run-detail__head">
              <span class="agent-graph-inspector__label">Детали прогона</span>
              <span class="agent-run-detail__meta">{{ runStatusLabel(selectedRun) }} · {{ formatRunTime(selectedRun.startedAt) }}</span>
            </div>
            <div class="agent-run-detail__timeline">
              <div v-for="event in selectedRun.events" :key="`${selectedRun.runId}:${event.phase}:${event.timestamp}`" class="agent-run-detail__event">
                <span class="agent-run-detail__meta">{{ event.phase }} · {{ formatRunTime(event.timestamp) }}</span>
                <strong class="agent-run-detail__title">{{ event.summary }}</strong>
                <span v-if="event.focus" class="agent-runtime-feed__focus">{{ event.focus }}</span>
                <span v-if="event.artifacts[0]?.content" class="agent-runtime-feed__focus">{{ event.artifacts[0].label }}: {{ event.artifacts[0].content }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="agent-graph-inspector__section">
          <span class="agent-graph-inspector__label">Лог рёбер</span>
          <div class="agent-runtime-feed">
            <div v-for="item in filteredEdgePayloadLog" :key="`${item.runId}:${item.targetAgentId}:${item.timestamp}`" class="agent-runtime-feed__item">
              <span class="agent-runtime-feed__meta">{{ item.sourceAgentId }} → {{ item.targetAgentId }} · {{ connectionModeLabel(item.mode) }}</span>
              <strong class="agent-runtime-feed__summary">{{ item.payloadPreview }}</strong>
              <span class="agent-runtime-feed__focus">{{ formatRunTime(item.timestamp) }}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>