<script setup lang="ts">
import type {
  MessengerAgentConnectionMode,
  MessengerAgentItem,
  MessengerAgentKnowledgeSource,
  MessengerAgentRepository,
  MessengerAgentSettings,
} from '../../entities/agents/model/useMessengerAgents'
import type { MessengerAgentKnowledgePreset, MessengerAgentKnowledgeStatus } from '../../entities/agents/model/useMessengerAgentKnowledge'
import type { MessengerAgentRun, MessengerAgentRunArtifact, MessengerAgentRunEvent } from '../../entities/agents/model/useMessengerAgentRuns'
import type { MessengerAgentWorkspaceFilePreview, MessengerAgentWorkspaceListing } from './model/useMessengerAgentWorkspace'
import { useMessengerAgentStream } from '../../entities/agents/model/useMessengerAgentStream'
import type { AgentSubstate } from '../../entities/agents/model/useMessengerAgentStream'

type AgentWorkspaceSectionKey = 'overview' | 'settings' | 'knowledge' | 'links' | 'runs' | 'graph' | 'explorer'

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
const workspaceExplorer = useMessengerAgentWorkspace()
const knowledgeModel = useMessengerAgentKnowledge()

const agentIdRef = computed(() => props.agentId)
const agentStream = useMessengerAgentStream(agentIdRef)
const streamCancelActive = computed(() => (['thinking', 'tool_call', 'streaming'] as AgentSubstate[]).includes(agentStream.substate.value))
const streamTokenLabel = computed(() => {
  const t = agentStream.tokenCount.value
  if (!t.total) return null
  return `${Math.round(t.total / 1000)}k / 200k (${t.contextPct}%)`
})
const streamCostLabel = computed(() => {
  if (!agentStream.costUsd.value) return null
  return `$${agentStream.costUsd.value.toFixed(2)}`
})

function substateLabel(state: AgentSubstate) {
  switch (state) {
    case 'thinking': return 'Думает'
    case 'tool_call': return 'Инструмент'
    case 'awaiting_input': return 'Ждёт ввод'
    case 'streaming': return 'Стримит'
    case 'error': return 'Ошибка'
    default: return 'Idle'
  }
}

const activeSection = useState<AgentWorkspaceSectionKey>('messenger-agent-chat-workspace-section', () => 'overview')
const feedbackMessage = ref('')
const feedbackTone = ref<'info' | 'error'>('info')
const selectedRunId = ref<string | null>(null)
const settingsDraft = reactive({
  model: 'GPT-5.4',
  apiKey: '',
  ssh: {
    host: '',
    login: '',
    port: 22,
    privateKey: '',
    workspacePath: '',
    repositories: [] as MessengerAgentRepository[],
    activeRepositoryId: '',
  },
  knowledge: {
    sources: [] as MessengerAgentKnowledgeSource[],
  },
})
const settingsSaving = ref(false)
const searchDraft = ref('')
const searchOpen = ref(false)
const explorerPending = ref(false)
const explorerFilePending = ref(false)
const explorerError = ref('')
const explorerListing = ref<MessengerAgentWorkspaceListing | null>(null)
const explorerFile = ref<MessengerAgentWorkspaceFilePreview | null>(null)
const knowledgePending = ref(false)
const knowledgeIndexing = ref(false)
const knowledgeStatus = ref<MessengerAgentKnowledgeStatus | null>(null)
const knowledgePreset = ref<MessengerAgentKnowledgePreset | null>(null)
const knowledgePresetPending = ref(false)
const knowledgeError = ref('')

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
    key: 'knowledge',
    title: 'Знания',
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
  {
    key: 'explorer',
    title: 'Проводник',
  },
]

const currentSection = computed(() => sections.find(section => section.key === activeSection.value) ?? sections[0])

const sectionIconMap: Record<AgentWorkspaceSectionKey, string> = {
  overview: 'mdi-view-dashboard-outline',
  settings: 'mdi-tune-variant',
  knowledge: 'mdi-database-search-outline',
  links: 'mdi-connection',
  runs: 'mdi-history',
  graph: 'mdi-graph-outline',
  explorer: 'mdi-file-tree-outline',
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
const workspaceModelLabel = computed(() => resolvedAgent.value?.settings.model || settingsDraft.model)
const apiKeyConfigured = computed(() => Boolean(resolvedAgent.value?.settings.apiKeyConfigured))
const sshConfigured = computed(() => Boolean(resolvedAgent.value?.settings.sshConfigured))
const workspaceConfigured = computed(() => Boolean(resolvedAgent.value?.settings.ssh.workspacePath))
const repositoryOptions = computed(() => settingsDraft.ssh.repositories.map(repository => ({
  title: repository.label,
  value: repository.id,
})))
const knowledgeEnabledCount = computed(() => settingsDraft.knowledge.sources.filter(source => source.enabled).length)
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
const explorerBreadcrumbs = computed(() => {
  const listing = explorerListing.value
  if (!listing) {
    return []
  }

  const segments = listing.currentPath ? listing.currentPath.split('/').filter(Boolean) : []
  return segments.map((segment, index) => ({
    label: segment,
    path: segments.slice(0, index + 1).join('/'),
  }))
})
const explorerStatusLabel = computed(() => {
  const listing = explorerListing.value
  if (!listing) {
    return sshConfigured.value ? 'SSH' : 'Локально'
  }

  return listing.source === 'ssh'
    ? (listing.sshTarget || 'SSH')
    : 'Локальная папка'
})

function createDraftId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function syncWorkspacePathFromDraftRepositories() {
  const activeRepository = settingsDraft.ssh.repositories.find(repository => repository.id === settingsDraft.ssh.activeRepositoryId) ?? null
  if (activeRepository) {
    settingsDraft.ssh.workspacePath = activeRepository.path
    return
  }

  if (settingsDraft.ssh.repositories.length && !settingsDraft.ssh.activeRepositoryId) {
    settingsDraft.ssh.activeRepositoryId = settingsDraft.ssh.repositories[0]?.id || ''
    settingsDraft.ssh.workspacePath = settingsDraft.ssh.repositories[0]?.path || settingsDraft.ssh.workspacePath
  }
}

function syncActiveRepositoryPathFromWorkspace() {
  const activeRepository = settingsDraft.ssh.repositories.find(repository => repository.id === settingsDraft.ssh.activeRepositoryId) ?? null
  if (activeRepository) {
    activeRepository.path = settingsDraft.ssh.workspacePath
  }
}

function serializeRepositories(repositories: MessengerAgentRepository[]) {
  return JSON.stringify(repositories.map(repository => ({
    id: repository.id,
    label: repository.label.trim(),
    path: repository.path.trim(),
  })))
}

function serializeKnowledgeSources(sources: MessengerAgentKnowledgeSource[]) {
  return JSON.stringify(sources.map(source => ({
    id: source.id,
    label: source.label.trim(),
    repositoryId: source.repositoryId,
    path: source.path.trim(),
    type: source.type,
    enabled: source.enabled,
  })))
}

function syncSettingsDraft() {
  settingsDraft.model = resolvedAgent.value?.settings.model || 'GPT-5.4'
  settingsDraft.apiKey = resolvedAgent.value?.settings.apiKey || ''
  settingsDraft.ssh.host = resolvedAgent.value?.settings.ssh.host || ''
  settingsDraft.ssh.login = resolvedAgent.value?.settings.ssh.login || ''
  settingsDraft.ssh.port = resolvedAgent.value?.settings.ssh.port || 22
  settingsDraft.ssh.privateKey = resolvedAgent.value?.settings.ssh.privateKey || ''
  settingsDraft.ssh.workspacePath = resolvedAgent.value?.settings.ssh.workspacePath || ''
  settingsDraft.ssh.repositories = (resolvedAgent.value?.settings.ssh.repositories || []).map(repository => ({ ...repository }))
  settingsDraft.ssh.activeRepositoryId = resolvedAgent.value?.settings.ssh.activeRepositoryId || ''
  settingsDraft.knowledge.sources = (resolvedAgent.value?.settings.knowledge.sources || []).map(source => ({ ...source }))
  syncWorkspacePathFromDraftRepositories()
}

watch(() => resolvedAgent.value?.id, () => {
  syncSettingsDraft()
  selectedRunId.value = null
  runsModel.clearSelection()
  activeSection.value = 'overview'
  searchDraft.value = ''
  searchOpen.value = false
  explorerListing.value = null
  explorerFile.value = null
  explorerError.value = ''
  knowledgeStatus.value = null
  knowledgePreset.value = null
  knowledgeError.value = ''
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

watch([() => activeSection.value, () => resolvedAgent.value?.id], async ([section, agentId]) => {
  if (section === 'explorer' && agentId) {
    if (!explorerListing.value || explorerError.value) {
      await loadWorkspace()
    }
  }

  if (section === 'knowledge' && agentId) {
    await Promise.all([
      loadKnowledgeStatus(),
      loadKnowledgePreset(),
    ])
  }
})

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
      ssh: settingsDraft.ssh,
      knowledge: settingsDraft.knowledge,
      connections: resolvedAgent.value.settings.connections,
      graphPosition: resolvedAgent.value.settings.graphPosition,
    })

    settingsDraft.model = nextSettings.model
    settingsDraft.apiKey = nextSettings.apiKey
    settingsDraft.ssh.host = nextSettings.ssh.host
    settingsDraft.ssh.login = nextSettings.ssh.login
    settingsDraft.ssh.port = nextSettings.ssh.port
    settingsDraft.ssh.privateKey = nextSettings.ssh.privateKey
    settingsDraft.ssh.workspacePath = nextSettings.ssh.workspacePath
    settingsDraft.ssh.repositories = nextSettings.ssh.repositories.map(repository => ({ ...repository }))
    settingsDraft.ssh.activeRepositoryId = nextSettings.ssh.activeRepositoryId
    settingsDraft.knowledge.sources = nextSettings.knowledge.sources.map(source => ({ ...source }))
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

function sshDraftChanged() {
  if (!resolvedAgent.value) {
    return false
  }

  return resolvedAgent.value.settings.ssh.host !== settingsDraft.ssh.host
    || resolvedAgent.value.settings.ssh.login !== settingsDraft.ssh.login
    || resolvedAgent.value.settings.ssh.port !== settingsDraft.ssh.port
    || resolvedAgent.value.settings.ssh.privateKey !== settingsDraft.ssh.privateKey
    || resolvedAgent.value.settings.ssh.workspacePath !== settingsDraft.ssh.workspacePath
    || resolvedAgent.value.settings.ssh.activeRepositoryId !== settingsDraft.ssh.activeRepositoryId
    || serializeRepositories(resolvedAgent.value.settings.ssh.repositories) !== serializeRepositories(settingsDraft.ssh.repositories)
    || serializeKnowledgeSources(resolvedAgent.value.settings.knowledge.sources) !== serializeKnowledgeSources(settingsDraft.knowledge.sources)
}

async function handleSshBlur() {
  if (!resolvedAgent.value || !sshDraftChanged()) {
    return
  }

  syncActiveRepositoryPathFromWorkspace()

  await saveSettings({
    model: settingsDraft.model,
    apiKey: settingsDraft.apiKey,
  })

  if (activeSection.value === 'explorer') {
    await loadWorkspace()
  }

  if (activeSection.value === 'knowledge') {
    await loadKnowledgeStatus()
  }
}

function addRepositoryDraft() {
  settingsDraft.ssh.repositories.push({
    id: createDraftId('repo'),
    label: `Repo ${settingsDraft.ssh.repositories.length + 1}`,
    path: '',
  })

  if (!settingsDraft.ssh.activeRepositoryId) {
    settingsDraft.ssh.activeRepositoryId = settingsDraft.ssh.repositories[settingsDraft.ssh.repositories.length - 1]?.id || ''
  }
}

async function removeRepositoryDraft(repositoryId: string) {
  settingsDraft.ssh.repositories = settingsDraft.ssh.repositories.filter(repository => repository.id !== repositoryId)
  if (settingsDraft.ssh.activeRepositoryId === repositoryId) {
    settingsDraft.ssh.activeRepositoryId = settingsDraft.ssh.repositories[0]?.id || ''
  }

  settingsDraft.knowledge.sources = settingsDraft.knowledge.sources.map(source => source.repositoryId === repositoryId
    ? { ...source, repositoryId: '' }
    : source)
  syncWorkspacePathFromDraftRepositories()
  await handleSshBlur()
}

async function handleActiveRepositoryChange(value: string) {
  settingsDraft.ssh.activeRepositoryId = value
  syncWorkspacePathFromDraftRepositories()
  await handleSshBlur()
}

async function handleRepositoryBlur() {
  syncWorkspacePathFromDraftRepositories()
  await handleSshBlur()
}

function addKnowledgeSourceDraft() {
  settingsDraft.knowledge.sources.push({
    id: createDraftId('source'),
    label: `Source ${settingsDraft.knowledge.sources.length + 1}`,
    repositoryId: settingsDraft.ssh.activeRepositoryId,
    path: '',
    type: 'rag',
    enabled: true,
  })
}

async function removeKnowledgeSourceDraft(sourceId: string) {
  settingsDraft.knowledge.sources = settingsDraft.knowledge.sources.filter(source => source.id !== sourceId)
  await handleSshBlur()
}

async function handleKnowledgeSourceChange() {
  await handleSshBlur()
}

async function loadKnowledgeStatus() {
  if (!resolvedAgent.value) {
    return
  }

  knowledgePending.value = true
  knowledgeError.value = ''

  try {
    knowledgeStatus.value = await knowledgeModel.getKnowledge(resolvedAgent.value.id)
  } catch (error) {
    knowledgeStatus.value = null
    knowledgeError.value = error instanceof Error ? error.message : 'Не удалось загрузить статус знаний.'
  } finally {
    knowledgePending.value = false
  }
}

async function loadKnowledgePreset() {
  if (!resolvedAgent.value) {
    return
  }

  knowledgePresetPending.value = true

  try {
    knowledgePreset.value = await knowledgeModel.getPreset(resolvedAgent.value.id)
  } catch {
    knowledgePreset.value = null
  } finally {
    knowledgePresetPending.value = false
  }
}

async function applyKnowledgePreset() {
  if (!knowledgePreset.value) {
    return
  }

  settingsDraft.ssh.repositories = knowledgePreset.value.repositories.map(repository => ({ ...repository }))
  settingsDraft.ssh.activeRepositoryId = knowledgePreset.value.activeRepositoryId
  settingsDraft.knowledge.sources = knowledgePreset.value.sources.map(source => ({ ...source }))
  syncWorkspacePathFromDraftRepositories()
  await handleSshBlur()
  await loadKnowledgeStatus()

  feedbackTone.value = 'info'
  feedbackMessage.value = 'Knowledge template подставлен в настройки агента.'
}

async function reindexKnowledge() {
  if (!resolvedAgent.value) {
    return
  }

  knowledgeIndexing.value = true
  knowledgeError.value = ''

  try {
    knowledgeStatus.value = await knowledgeModel.reindexKnowledge(resolvedAgent.value.id)
    feedbackTone.value = 'info'
    feedbackMessage.value = 'Индекс знаний обновлён.'
  } catch (error) {
    knowledgeError.value = error instanceof Error ? error.message : 'Не удалось переиндексировать знания.'
    feedbackTone.value = 'error'
    feedbackMessage.value = 'Переиндексация знаний завершилась ошибкой.'
  } finally {
    knowledgeIndexing.value = false
  }
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
  if (collapsed.value) {
    collapsed.value = false
  }

  activeSection.value = section
  searchDraft.value = ''
  searchOpen.value = false
}

async function openRunDetail(runId: string) {
  selectedRunId.value = runId
  await runsModel.openRun(runId)
}

async function loadWorkspace(nextPath = explorerListing.value?.currentPath || '') {
  if (!resolvedAgent.value) {
    return
  }

  if (!workspaceConfigured.value) {
    explorerListing.value = null
    explorerFile.value = null
    explorerError.value = ''
    explorerPending.value = false
    return
  }

  explorerPending.value = true
  explorerError.value = ''

  try {
    const listing = await workspaceExplorer.listWorkspace(resolvedAgent.value.id, nextPath)
    explorerListing.value = listing

    if (explorerFile.value && !listing.entries.some(entry => entry.path === explorerFile.value?.path)) {
      explorerFile.value = null
    }
  } catch (error) {
    explorerListing.value = null
    explorerFile.value = null
    explorerError.value = error instanceof Error ? error.message : 'Проводник недоступен.'
  } finally {
    explorerPending.value = false
  }
}

async function openWorkspaceDirectory(path: string) {
  await loadWorkspace(path)
}

async function openWorkspaceParent() {
  if (!explorerListing.value?.currentPath) {
    return
  }

  const segments = explorerListing.value.currentPath.split('/').filter(Boolean)
  await loadWorkspace(segments.slice(0, -1).join('/'))
}

async function openWorkspaceFile(path: string) {
  if (!resolvedAgent.value) {
    return
  }

  if (!workspaceConfigured.value) {
    explorerFile.value = null
    explorerError.value = ''
    return
  }

  explorerFilePending.value = true
  explorerError.value = ''

  try {
    explorerFile.value = await workspaceExplorer.readWorkspaceFile(resolvedAgent.value.id, path)
  } catch (error) {
    explorerFile.value = null
    explorerError.value = error instanceof Error ? error.message : 'Не удалось открыть файл.'
  } finally {
    explorerFilePending.value = false
  }
}
</script>

<template>
  <section class="agent-chat-workspace" :class="{ 'agent-chat-workspace--collapsed': collapsed }" aria-label="Рабочее пространство агента">
    <Transition name="agent-chat-workspace-sheet">
      <div v-if="!collapsed" class="agent-chat-workspace__sheet">
        <header class="agent-chat-workspace__head">
          <div class="agent-chat-workspace__copy">
            <h2 class="agent-chat-workspace__title">{{ workspaceTitle }}</h2>
            <p class="agent-chat-workspace__section-marker">{{ currentSection?.title }}</p>
          </div>
          <div class="agent-chat-workspace__meta">
            <span
              class="agent-chat-workspace__status-pill agent-chat-workspace__substate-badge"
              :class="{
                'agent-chat-workspace__substate-badge--thinking': agentStream.substate.value === 'thinking',
                'agent-chat-workspace__substate-badge--tool': agentStream.substate.value === 'tool_call',
                'agent-chat-workspace__substate-badge--awaiting': agentStream.substate.value === 'awaiting_input',
                'agent-chat-workspace__substate-badge--streaming': agentStream.substate.value === 'streaming',
                'agent-chat-workspace__substate-badge--error': agentStream.substate.value === 'error',
              }"
            >
              <span class="agent-chat-workspace__substate-dot" aria-hidden="true" />
              {{ substateLabel(agentStream.substate.value) }}
            </span>
            <span v-if="streamTokenLabel" class="agent-chat-workspace__status-pill agent-chat-workspace__token-pill">
              <span class="agent-chat-workspace__token-bar">
                <span class="agent-chat-workspace__token-bar-fill" :style="{ width: `${agentStream.tokenCount.value.contextPct}%` }" />
              </span>
              {{ streamTokenLabel }}
            </span>
            <span v-if="streamCostLabel" class="agent-chat-workspace__status-pill">
              {{ streamCostLabel }}
            </span>
            <button
              v-if="streamCancelActive"
              type="button"
              class="agent-chat-workspace__ghost agent-chat-workspace__cancel-btn"
              @click="agentStream.cancel()"
            >
              Остановить
            </button>
            <span class="agent-chat-workspace__status-pill" :class="{ 'agent-chat-workspace__status-pill--live': runtimeState }">
              {{ runtimeState ? runtimePhaseLabel(runtimeState.phase) : 'Idle' }}
            </span>
            <span class="agent-chat-workspace__status-pill" :class="{ 'agent-chat-workspace__status-pill--warning': !apiKeyConfigured }">
              {{ apiKeyConfigured ? 'API key подключён' : 'API key не задан' }}
            </span>
            <span class="agent-chat-workspace__status-pill" :class="{ 'agent-chat-workspace__status-pill--warning': !sshConfigured }">
              {{ sshConfigured ? 'SSH подключён' : 'SSH не задан' }}
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
            <article v-if="agentStream.streamingDraft.value" class="agent-chat-workspace__card agent-chat-workspace__stream-bubble agent-chat-workspace__card--full-span">
              <p class="agent-chat-workspace__card-eyebrow">Ответ агента</p>
              <pre class="agent-chat-workspace__stream-text">{{ agentStream.streamingDraft.value }}</pre>
            </article>
            <article v-if="agentStream.errors.value.length" class="agent-chat-workspace__card agent-chat-workspace__error-banner agent-chat-workspace__card--full-span">
              <p class="agent-chat-workspace__card-eyebrow">Ошибки потока</p>
              <p v-for="(err, i) in agentStream.errors.value" :key="i" class="agent-chat-workspace__card-text">{{ err }}</p>
            </article>
            <article class="agent-chat-workspace__card">
              <p class="agent-chat-workspace__card-eyebrow">Сейчас в чате</p>
              <h3 class="agent-chat-workspace__card-title">Текущий фокус</h3>
              <p class="agent-chat-workspace__card-text">{{ runtimeState?.focus || workspaceGreeting }}</p>
            </article>
            <article class="agent-chat-workspace__card">
              <p class="agent-chat-workspace__card-eyebrow">Модель</p>
              <h3 class="agent-chat-workspace__card-title">{{ workspaceModelLabel }}</h3>
              <p class="agent-chat-workspace__card-text">Последнее обновление: {{ formatTimestamp(resolvedAgent?.settings.updatedAt) }}</p>
            </article>
            <article class="agent-chat-workspace__card">
              <p class="agent-chat-workspace__card-eyebrow">SSH и проводник</p>
              <h3 class="agent-chat-workspace__card-title">{{ sshConfigured ? explorerStatusLabel : 'Подключение не настроено' }}</h3>
              <p class="agent-chat-workspace__card-text">{{ workspaceConfigured ? `Рабочая папка: ${resolvedAgent?.settings.ssh.workspacePath}` : 'Добавьте login, IP, SSH key и рабочую папку, чтобы агент получил свой server context.' }}</p>
            </article>
            <article class="agent-chat-workspace__card">
              <p class="agent-chat-workspace__card-eyebrow">Знания</p>
              <h3 class="agent-chat-workspace__card-title">{{ knowledgeStatus?.indexedSources || 0 }} источников</h3>
              <p class="agent-chat-workspace__card-text">{{ knowledgeEnabledCount ? `Подключено источников: ${knowledgeEnabledCount}.` : 'Источники RAG и vector пока не подключены.' }}</p>
            </article>
          </div>

          <div v-else-if="activeSection === 'settings'" class="agent-chat-workspace__content">
            <article class="agent-chat-workspace__card agent-chat-workspace__card--form">
              <p class="agent-chat-workspace__card-eyebrow">Быстрые настройки</p>
              <h3 class="agent-chat-workspace__card-title">Параметры ответа</h3>
              <p class="agent-chat-workspace__card-text">Модель сохраняется сразу после выбора. API key и SSH-поля обновляются по blur.</p>
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
              <VTextField
                v-model="settingsDraft.ssh.host"
                label="IP или host сервера"
                variant="outlined"
                hide-details="auto"
                :loading="settingsSaving"
                @blur="handleSshBlur"
              />
              <VTextField
                v-model="settingsDraft.ssh.login"
                label="Логин SSH"
                variant="outlined"
                hide-details="auto"
                :loading="settingsSaving"
                @blur="handleSshBlur"
              />
              <VTextField
                :model-value="String(settingsDraft.ssh.port)"
                label="Порт SSH"
                type="number"
                variant="outlined"
                hide-details="auto"
                :loading="settingsSaving"
                @update:model-value="settingsDraft.ssh.port = Number($event) || 22"
                @blur="handleSshBlur"
              />
              <VTextField
                v-model="settingsDraft.ssh.workspacePath"
                label="Активный repo path"
                variant="outlined"
                hide-details="auto"
                :loading="settingsSaving"
                @blur="handleSshBlur"
              />
              <VSelect
                :model-value="settingsDraft.ssh.activeRepositoryId"
                :items="repositoryOptions"
                label="Активный repo"
                variant="outlined"
                hide-details="auto"
                :loading="settingsSaving"
                @update:model-value="handleActiveRepositoryChange(typeof $event === 'string' ? $event : '')"
              />
              <div class="agent-chat-workspace__stack">
                <div
                  v-for="repository in settingsDraft.ssh.repositories"
                  :key="repository.id"
                  class="agent-chat-workspace__list-item"
                >
                  <div class="agent-chat-workspace__stack">
                    <VTextField
                      v-model="repository.label"
                      label="Название repo"
                      variant="outlined"
                      hide-details="auto"
                      :loading="settingsSaving"
                      @blur="handleRepositoryBlur"
                    />
                    <VTextField
                      v-model="repository.path"
                      label="Путь repo"
                      variant="outlined"
                      hide-details="auto"
                      :loading="settingsSaving"
                      @blur="handleRepositoryBlur"
                    />
                  </div>
                  <button type="button" class="agent-chat-workspace__ghost" @click="removeRepositoryDraft(repository.id)">
                    Удалить repo
                  </button>
                </div>
                <button type="button" class="agent-chat-workspace__ghost" @click="addRepositoryDraft">
                  Добавить repo
                </button>
              </div>
              <VTextarea
                v-model="settingsDraft.ssh.privateKey"
                label="SSH private key"
                variant="outlined"
                rows="6"
                auto-grow
                hide-details="auto"
                :loading="settingsSaving"
                @blur="handleSshBlur"
              />
            </article>
          </div>

          <div v-else-if="activeSection === 'knowledge'" class="agent-chat-workspace__content">
            <article class="agent-chat-workspace__card">
              <p class="agent-chat-workspace__card-eyebrow">Индекс</p>
              <h3 class="agent-chat-workspace__card-title">{{ knowledgeStatus?.indexedChunks || 0 }} чанков</h3>
              <p class="agent-chat-workspace__card-text">{{ knowledgeStatus?.lastIndexedAt ? `Последняя индексация: ${formatTimestamp(knowledgeStatus.lastIndexedAt)}` : 'Индекс ещё не собирался.' }}</p>
              <p class="agent-chat-workspace__card-text">{{ knowledgePreset?.summary || 'Шаблон знаний можно подставить автоматически для выбранного агента.' }}</p>
              <div class="agent-chat-workspace__stats">
                <span>Источников: {{ knowledgeStatus?.indexedSources || 0 }}</span>
                <span>Включено: {{ knowledgeEnabledCount }}</span>
              </div>
              <button type="button" class="agent-chat-workspace__ghost" :disabled="knowledgePresetPending || !knowledgePreset?.sources.length" @click="applyKnowledgePreset">
                {{ knowledgePresetPending ? '[ LOADING... ]' : 'Подставить шаблон' }}
              </button>
              <button type="button" class="agent-chat-workspace__primary" :disabled="knowledgeIndexing || !settingsDraft.knowledge.sources.length" @click="reindexKnowledge">
                {{ knowledgeIndexing ? 'Индексация...' : 'Переиндексировать' }}
              </button>
              <p v-if="knowledgeError" class="agent-chat-workspace__card-text">{{ knowledgeError }}</p>
              <p v-else-if="knowledgePending" class="agent-chat-workspace__card-text">[ LOADING... ]</p>
            </article>
            <article class="agent-chat-workspace__card agent-chat-workspace__card--form">
              <p class="agent-chat-workspace__card-eyebrow">Источники</p>
              <h3 class="agent-chat-workspace__card-title">RAG и vector files</h3>
              <div class="agent-chat-workspace__stack">
                <div
                  v-for="source in settingsDraft.knowledge.sources"
                  :key="source.id"
                  class="agent-chat-workspace__list-item"
                >
                  <div class="agent-chat-workspace__stack">
                    <VTextField
                      v-model="source.label"
                      label="Название источника"
                      variant="outlined"
                      hide-details="auto"
                      :loading="settingsSaving"
                      @blur="handleKnowledgeSourceChange"
                    />
                    <VSelect
                      :model-value="source.repositoryId"
                      :items="[{ title: 'Без repo', value: '' }, ...repositoryOptions]"
                      label="Repo"
                      variant="outlined"
                      hide-details="auto"
                      :loading="settingsSaving"
                      @update:model-value="source.repositoryId = typeof $event === 'string' ? $event : ''; handleKnowledgeSourceChange()"
                    />
                    <VTextField
                      v-model="source.path"
                      label="Путь файла"
                      variant="outlined"
                      hide-details="auto"
                      :loading="settingsSaving"
                      @blur="handleKnowledgeSourceChange"
                    />
                    <VSelect
                      :model-value="source.type"
                      :items="[{ title: 'RAG text', value: 'rag' }, { title: 'Vector JSON', value: 'vector' }]"
                      label="Тип источника"
                      variant="outlined"
                      hide-details="auto"
                      :loading="settingsSaving"
                      @update:model-value="source.type = $event === 'vector' ? 'vector' : 'rag'; handleKnowledgeSourceChange()"
                    />
                    <VSwitch
                      v-model="source.enabled"
                      label="Источник включён"
                      hide-details="auto"
                      color="primary"
                      @update:model-value="handleKnowledgeSourceChange"
                    />
                    <p class="agent-chat-workspace__card-text">
                      {{ knowledgeStatus?.sources.find(item => item.id === source.id)?.indexedAt
                        ? `Индекс: ${knowledgeStatus?.sources.find(item => item.id === source.id)?.chunkCount || 0} чанков.`
                        : 'Источник ещё не индексировался.' }}
                    </p>
                    <p v-if="knowledgeStatus?.sources.find(item => item.id === source.id)?.error" class="agent-chat-workspace__card-text">
                      {{ knowledgeStatus?.sources.find(item => item.id === source.id)?.error }}
                    </p>
                  </div>
                  <button type="button" class="agent-chat-workspace__ghost" @click="removeKnowledgeSourceDraft(source.id)">
                    Удалить источник
                  </button>
                </div>
                <button type="button" class="agent-chat-workspace__ghost" @click="addKnowledgeSourceDraft">
                  Добавить источник
                </button>
              </div>
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
            <template v-if="activeSection === 'explorer'">
              <article class="agent-chat-workspace__card agent-chat-workspace__card--split-span">
                <p class="agent-chat-workspace__card-eyebrow">Проводник</p>
                <h3 class="agent-chat-workspace__card-title">{{ explorerStatusLabel }}</h3>
                <p class="agent-chat-workspace__card-text">{{ workspaceConfigured ? `Root: ${resolvedAgent?.settings.ssh.workspacePath}` : 'Настройте SSH или локальную рабочую папку агента.' }}</p>
              </article>
              <article v-if="!workspaceConfigured" class="agent-chat-workspace__card agent-chat-workspace__card--split-span">
                <p class="agent-chat-workspace__card-text">[ NO DATA ATTACHED ]</p>
                <p class="agent-chat-workspace__card-text">Добавьте host, login, private key и рабочую папку в настройках агента, после этого проводник загрузится без отдельного сохранения.</p>
              </article>
              <div v-if="explorerError" class="agent-chat-workspace__card agent-chat-workspace__card--split-span">
                <p class="agent-chat-workspace__card-text">{{ explorerError }}</p>
              </div>
              <article v-if="workspaceConfigured" class="agent-chat-workspace__card agent-chat-workspace__explorer-tree">
                <div class="agent-chat-workspace__explorer-head">
                  <button type="button" class="agent-chat-workspace__ghost" :disabled="!explorerListing?.currentPath" @click="openWorkspaceParent">
                    Назад
                  </button>
                  <button type="button" class="agent-chat-workspace__ghost" :disabled="explorerPending || !workspaceConfigured" @click="loadWorkspace()">
                    Обновить
                  </button>
                </div>
                <div class="agent-chat-workspace__breadcrumbs">
                  <button type="button" class="agent-chat-workspace__crumb" @click="openWorkspaceDirectory('')">root</button>
                  <button
                    v-for="crumb in explorerBreadcrumbs"
                    :key="crumb.path"
                    type="button"
                    class="agent-chat-workspace__crumb"
                    @click="openWorkspaceDirectory(crumb.path)"
                  >
                    {{ crumb.label }}
                  </button>
                </div>
                <div v-if="explorerPending" class="agent-chat-workspace__card-text">[ LOADING... ]</div>
                <div v-else-if="explorerListing?.entries.length" class="agent-chat-workspace__explorer-list">
                  <button
                    v-for="entry in explorerListing.entries"
                    :key="entry.path"
                    type="button"
                    class="agent-chat-workspace__explorer-entry"
                    :class="{ 'agent-chat-workspace__explorer-entry--active': explorerFile?.path === entry.path }"
                    @click="entry.kind === 'directory' ? openWorkspaceDirectory(entry.path) : openWorkspaceFile(entry.path)"
                  >
                    <span class="agent-chat-workspace__explorer-entry-name">{{ entry.kind === 'directory' ? '▸' : '•' }} {{ entry.name }}</span>
                    <span class="agent-chat-workspace__explorer-entry-meta">{{ entry.kind === 'directory' ? 'папка' : `${entry.size} B` }}</span>
                  </button>
                </div>
                <div v-else class="agent-chat-workspace__card-text">[ NO DATA ATTACHED ]</div>
              </article>
              <article v-if="workspaceConfigured" class="agent-chat-workspace__card agent-chat-workspace__explorer-preview">
                <p class="agent-chat-workspace__card-eyebrow">Предпросмотр</p>
                <h3 class="agent-chat-workspace__card-title">{{ explorerFile?.name || 'Файл не выбран' }}</h3>
                <p v-if="explorerFile?.truncated" class="agent-chat-workspace__card-text">Показан только верх файла.</p>
                <div v-if="explorerFilePending" class="agent-chat-workspace__card-text">[ LOADING... ]</div>
                <pre v-else-if="explorerFile" class="agent-chat-workspace__file-preview">{{ explorerFile.content }}</pre>
                <p v-else class="agent-chat-workspace__card-text">Выберите файл слева, чтобы открыть содержимое.</p>
              </article>
            </template>
            <template v-else>
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
            </template>
          </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>

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