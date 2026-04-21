<script setup lang="ts">
import type { MessengerAgentConnectionMode, MessengerAgentGraphNodeInput } from '../../entities/agents/model/useMessengerAgents'
import type { MessengerConversationItem } from '../../entities/conversations/model/useMessengerConversations'
import { getSessionKindMeta } from '../../entities/sessions/model/useMessengerCliSessions'

const conversations = useMessengerConversations()
const agentsModel = useMessengerAgents()
const calls = useMessengerCalls()
const navigation = useMessengerConversationState()
const holdActions = useMessengerHoldActions()
const { agentsEnabled } = useMessengerFeatures()
const searchDraft = ref('')
const actionError = ref('')
const searchOpen = ref(false)

type AgentSystemRun = {
  prompt: string
  sentAt: string
  targetCount: number
  summary?: string
  agentSnapshots?: Array<{
    agentId: string
    agentName: string
    response: string
  }>
}

// ── Папки чатов ─────────────────────────────────────────────────────────────
type SessionRole = 'orchestrator' | 'worker' | 'standalone'

type SessionMember = {
  agentId: string
  role: SessionRole
  subscriptionId: string
  model: string
  effort: string
  workroom: string
}

type ChatFolder = {
  key: string
  label: string
  chatIds: string[]
  kind?: 'manual' | 'agent' | 'agent-system' | 'session-group'
  agentIds?: string[]
  templateKey?: string
  runs?: AgentSystemRun[]
  lastRun?: AgentSystemRun
  members?: SessionMember[]
  createdAt?: string
}

type ChatMode = 'people' | 'agents' | 'systems' | 'sessions'

type AgentSystemCard = {
  key: string
  label: string
  agentNames: string[]
  agentCount: number
  chatCount: number
  preview: string
  lastUpdatedAt: string
}

type AgentSystemTemplate = {
  key: string
  title: string
  description: string
  systemName: string
  agentIds: string[]
  connections: Array<{
    sourceAgentId: string
    targetAgentId: string
    mode: MessengerAgentConnectionMode
  }>
  promptTemplates: Array<{
    key: string
    label: string
    prompt: string
  }>
}

const AGENT_SYSTEM_TEMPLATES: AgentSystemTemplate[] = [
  {
    key: 'messenger-dev',
    title: 'Разработка Messenger',
    description: 'Техлид, frontend messenger, realtime и QA для chat UI, звонков и runtime-изменений.',
    systemName: 'Разработка Messenger',
    agentIds: ['orchestrator', 'messenger-ui', 'realtime-calls', 'qa-release'],
    connections: [
      { sourceAgentId: 'orchestrator', targetAgentId: 'messenger-ui', mode: 'route' },
      { sourceAgentId: 'orchestrator', targetAgentId: 'realtime-calls', mode: 'route' },
      { sourceAgentId: 'messenger-ui', targetAgentId: 'realtime-calls', mode: 'validate' },
      { sourceAgentId: 'messenger-ui', targetAgentId: 'qa-release', mode: 'review' },
      { sourceAgentId: 'realtime-calls', targetAgentId: 'qa-release', mode: 'summarize' },
    ],
    promptTemplates: [
      {
        key: 'messenger-bug',
        label: 'Баг',
        prompt: 'Разберите баг в messenger: дайте гипотезу причины, затронутые модули, минимальный фикс, риски регрессии и короткий план проверки.',
      },
      {
        key: 'messenger-feature',
        label: 'Новая фича',
        prompt: 'Спроектируйте новую функцию для messenger: разложите её по web/core, UX-сценариям, состояниям, рискам и шагам реализации.',
      },
      {
        key: 'messenger-architecture',
        label: 'Архитектура',
        prompt: 'Сделайте архитектурный review задачи по messenger: предложите лучший путь реализации, trade-offs, связи между модулями и точки расширения.',
      },
      {
        key: 'messenger-release',
        label: 'Релиз',
        prompt: 'Подготовьте релизный прогон по изменению в messenger: перечислите риски, smoke-checklist, deploy notes и rollback plan.',
      },
    ],
  },
  {
    key: 'platform-dev',
    title: 'Разработка Платформы',
    description: 'Техлид, frontend платформы, API, данные и QA для фич в основном приложении.',
    systemName: 'Разработка Платформы',
    agentIds: ['orchestrator', 'platform-ui', 'api-platform', 'db-platform', 'qa-release'],
    connections: [
      { sourceAgentId: 'orchestrator', targetAgentId: 'platform-ui', mode: 'route' },
      { sourceAgentId: 'orchestrator', targetAgentId: 'api-platform', mode: 'route' },
      { sourceAgentId: 'platform-ui', targetAgentId: 'api-platform', mode: 'enrich' },
      { sourceAgentId: 'api-platform', targetAgentId: 'db-platform', mode: 'validate' },
      { sourceAgentId: 'platform-ui', targetAgentId: 'qa-release', mode: 'review' },
      { sourceAgentId: 'api-platform', targetAgentId: 'qa-release', mode: 'review' },
      { sourceAgentId: 'db-platform', targetAgentId: 'qa-release', mode: 'summarize' },
    ],
    promptTemplates: [
      {
        key: 'platform-bug',
        label: 'Баг',
        prompt: 'Разберите баг в основной платформе: причина, затронутые роли, модули UI/API/DB, безопасный фикс и план ручной проверки.',
      },
      {
        key: 'platform-feature',
        label: 'Новая фича',
        prompt: 'Спроектируйте новую функцию для платформы: роли, страницы, API, данные, миграции, риски и порядок реализации.',
      },
      {
        key: 'platform-architecture',
        label: 'Архитектура',
        prompt: 'Сделайте архитектурный review задачи по платформе: оцените текущую структуру, лучший вариант внедрения, риски связности и точки масштабирования.',
      },
      {
        key: 'platform-release',
        label: 'Релиз',
        prompt: 'Подготовьте релизный прогон по изменению в платформе: тест-план по ролям, миграционные риски, deploy notes и rollback plan.',
      },
    ],
  },
  {
    key: 'release-control',
    title: 'Контроль Выпуска',
    description: 'Техлид и QA-контур для рисков релиза, ручной проверки и deploy readiness.',
    systemName: 'Контроль Выпуска',
    agentIds: ['orchestrator', 'qa-release'],
    connections: [
      { sourceAgentId: 'orchestrator', targetAgentId: 'qa-release', mode: 'summarize' },
    ],
    promptTemplates: [
      {
        key: 'release-check',
        label: 'Проверка релиза',
        prompt: 'Соберите release readiness checklist: build, config, PM2, health-checks, smoke-проверки и rollback.',
      },
      {
        key: 'release-risk',
        label: 'Риски',
        prompt: 'Оцените риски выпуска по текущему изменению: что может сломаться, как это заранее проверить и какой нужен contingency plan.',
      },
      {
        key: 'release-postdeploy',
        label: 'Post-deploy',
        prompt: 'Соберите post-deploy checklist: что проверить в первые минуты после релиза, какие health signals критичны и что откатывать первым.',
      },
    ],
  },
]

const FOLDERS_LS_KEY = 'messenger-chat-folders'
const AGENT_SYSTEMS_FOLDER_KEY = 'agent-systems'
const SESSIONS_FOLDER_KEY = 'sessions-root'

const SESSION_ROLE_LABELS: Record<SessionRole, string> = {
  orchestrator: 'Оркестратор',
  worker: 'Воркер',
  standalone: 'Автономный',
}

const SESSION_ROLE_ICONS: Record<SessionRole, string> = {
  orchestrator: 'mdi-star-circle-outline',
  worker: 'mdi-robot-outline',
  standalone: 'mdi-console-line',
}

const SESSION_ROLE_COLORS: Record<SessionRole, string> = {
  orchestrator: 'warning',
  worker: 'info',
  standalone: 'secondary',
}

function normalizeAgentSystemRun(input: unknown): AgentSystemRun | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const run = input as {
    prompt?: string
    sentAt?: string
    targetCount?: number
    summary?: string
    agentSnapshots?: Array<{
      agentId?: string
      agentName?: string
      response?: string
    }>
  }

  const prompt = typeof run.prompt === 'string' ? run.prompt : ''
  const sentAt = typeof run.sentAt === 'string' ? run.sentAt : ''
  const targetCount = typeof run.targetCount === 'number' ? run.targetCount : 0

  if (!prompt && !sentAt) {
    return null
  }

  return {
    prompt,
    sentAt,
    targetCount,
    summary: typeof run.summary === 'string' ? run.summary : '',
    agentSnapshots: Array.isArray(run.agentSnapshots)
      ? run.agentSnapshots
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null
          }

          const snapshot = item as {
            agentId?: string
            agentName?: string
            response?: string
          }

          const agentId = typeof snapshot.agentId === 'string' ? snapshot.agentId : ''
          const agentName = typeof snapshot.agentName === 'string' ? snapshot.agentName : ''
          const response = typeof snapshot.response === 'string' ? snapshot.response : ''

          if (!agentId || !agentName) {
            return null
          }

          return { agentId, agentName, response }
        })
        .filter((item): item is { agentId: string; agentName: string; response: string } => Boolean(item))
      : [],
  }
}

function loadFolders(): ChatFolder[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(FOLDERS_LS_KEY)
    const parsed = raw ? (JSON.parse(raw) as ChatFolder[]) : []
    return Array.isArray(parsed)
      ? parsed.map((folder) => {
          const isLegacyAgentFolder = folder.kind === 'agent-system'
            && folder.key.startsWith('agent-system-')
            && folder.label.startsWith('AI: ')
            && !folder.templateKey

          return {
            key: folder.key,
            label: isLegacyAgentFolder ? folder.label.replace(/^AI:\s*/u, '').trim() || folder.label : folder.label,
            chatIds: Array.isArray(folder.chatIds) ? folder.chatIds : [],
            kind: isLegacyAgentFolder
              ? 'agent'
              : (folder.kind === 'agent' || folder.kind === 'agent-system' || folder.kind === 'session-group' ? folder.kind : 'manual'),
            agentIds: Array.isArray(folder.agentIds) ? folder.agentIds : [],
            templateKey: typeof folder.templateKey === 'string' ? folder.templateKey : undefined,
            runs: [
              ...(Array.isArray(folder.runs)
                ? folder.runs
                  .map(run => normalizeAgentSystemRun(run))
                  .filter((run): run is AgentSystemRun => Boolean(run))
                : []),
              ...(folder.lastRun ? [normalizeAgentSystemRun(folder.lastRun)].filter((run): run is AgentSystemRun => Boolean(run)) : []),
            ]
              .sort((left, right) => new Date(right.sentAt || 0).getTime() - new Date(left.sentAt || 0).getTime())
              .filter((run, index, runs) => runs.findIndex(item => item.sentAt === run.sentAt && item.prompt === run.prompt) === index)
              .slice(0, 12),
            lastRun: normalizeAgentSystemRun(folder.lastRun) ?? undefined,
            members: Array.isArray(folder.members) ? folder.members : undefined,
            createdAt: typeof folder.createdAt === 'string' ? folder.createdAt : undefined,
          }
        })
      : []
  } catch {
    return []
  }
}

const userFolders = ref<ChatFolder[]>(loadFolders())
const activeChatMode = ref<ChatMode>('people')
const activeFolderKey = ref<string>('all')
const folderDraftName = ref('')
const showCreateFolder = ref(false)
const folderContextKey = ref<string | null>(null)
const agentMap = computed(() => new Map(agentsModel.agents.value.map(agent => [agent.id, agent] as const)))
const manualFolders = computed(() => userFolders.value.filter(folder => (folder.kind || 'manual') === 'manual'))
const agentFolders = computed(() => userFolders.value.filter(folder => folder.kind === 'agent'))
const systemFolders = computed(() => userFolders.value.filter(folder => folder.kind === 'agent-system'))
const sessionGroups = computed(() => userFolders.value.filter(folder => folder.kind === 'session-group'))
const activeFolder = computed(() => userFolders.value.find(folder => folder.key === activeFolderKey.value) ?? null)
const visibleFolders = computed(() => {
  if (activeChatMode.value === 'people') {
    return manualFolders.value
  }

  if (activeChatMode.value === 'agents') {
    return agentFolders.value
  }

  if (activeChatMode.value === 'sessions') {
    return sessionGroups.value
  }

  return systemFolders.value
})
const activeAgentSystem = computed(() => activeChatMode.value === 'systems' && activeFolder.value?.kind === 'agent-system' ? activeFolder.value : null)
const showAgentSystemsDirectory = computed(() => activeChatMode.value === 'systems' && activeFolderKey.value === AGENT_SYSTEMS_FOLDER_KEY)
const activeSessionGroup = computed(() => activeChatMode.value === 'sessions' && activeFolder.value?.kind === 'session-group' ? activeFolder.value : null)
const showSessionsDirectory = computed(() => activeChatMode.value === 'sessions' && activeFolderKey.value === SESSIONS_FOLDER_KEY)
const availableSystemTemplates = computed(() => AGENT_SYSTEM_TEMPLATES
  .map(template => ({
    ...template,
    agentIds: template.agentIds.filter(agentId => agentMap.value.has(agentId)),
    connections: template.connections.filter(connection => agentMap.value.has(connection.sourceAgentId) && agentMap.value.has(connection.targetAgentId)),
  }))
  .filter(template => template.agentIds.length >= 2))
const activeAgentSystemTemplate = computed(() => activeAgentSystem.value?.templateKey
  ? availableSystemTemplates.value.find(template => template.key === activeAgentSystem.value?.templateKey) ?? null
  : null)
const activeBroadcastPromptTemplates = computed(() => activeAgentSystemTemplate.value?.promptTemplates || [])

function saveFolders() {
  if (!import.meta.client) return
  localStorage.setItem(FOLDERS_LS_KEY, JSON.stringify(userFolders.value))
}

function createFolder() {
  const name = folderDraftName.value.trim()
  if (!name) return
  const key = `folder-${Date.now()}`
  userFolders.value.push({ key, label: name, chatIds: [] })
  saveFolders()
  folderDraftName.value = ''
  showCreateFolder.value = false
}

function confirmDeleteFolder() {
  if (!folderContextKey.value) return
  userFolders.value = userFolders.value.filter(f => f.key !== folderContextKey.value)
  if (activeFolderKey.value === folderContextKey.value) {
    activeFolderKey.value = activeChatMode.value === 'systems' ? AGENT_SYSTEMS_FOLDER_KEY : 'all'
  }
  saveFolders()
  folderContextKey.value = null
}

const peopleConversations = computed(() => conversations.conversations.value.filter(chat => chat.peerType !== 'agent'))
const agentConversations = computed(() => conversations.conversations.value.filter(chat => chat.peerType === 'agent'))

function ensureActiveFolderForMode(mode = activeChatMode.value) {
  if (!agentsEnabled.value) {
    if (activeChatMode.value !== 'people') {
      activeChatMode.value = 'people'
    }

    if (activeFolderKey.value !== 'all' && !manualFolders.value.some(folder => folder.key === activeFolderKey.value)) {
      activeFolderKey.value = 'all'
    }

    return
  }

  if (mode === 'systems') {
    const systemFolderSelected = systemFolders.value.some(folder => folder.key === activeFolderKey.value)
    if (!systemFolderSelected && activeFolderKey.value !== AGENT_SYSTEMS_FOLDER_KEY) {
      activeFolderKey.value = AGENT_SYSTEMS_FOLDER_KEY
    }
    return
  }

  if (mode === 'sessions') {
    const sessionFolderSelected = sessionGroups.value.some(folder => folder.key === activeFolderKey.value)
    if (!sessionFolderSelected && activeFolderKey.value !== SESSIONS_FOLDER_KEY) {
      activeFolderKey.value = SESSIONS_FOLDER_KEY
    }
    return
  }

  if (activeFolderKey.value === 'all') {
    return
  }

  const folders = mode === 'people' ? manualFolders.value : agentFolders.value
  if (!folders.some(folder => folder.key === activeFolderKey.value)) {
    activeFolderKey.value = 'all'
  }
}

function setChatMode(mode: ChatMode) {
  if (!agentsEnabled.value && mode !== 'people') {
    activeChatMode.value = 'people'
    activeFolderKey.value = 'all'
    return
  }

  activeChatMode.value = mode
  ensureActiveFolderForMode(mode)
}

const filteredConversations = computed(() => {
  if (showAgentSystemsDirectory.value || showSessionsDirectory.value) {
    return []
  }

  const source = activeChatMode.value === 'people'
    ? peopleConversations.value
    : agentConversations.value

  if (activeFolderKey.value === 'all') {
    return source
  }

  const folder = visibleFolders.value.find(item => item.key === activeFolderKey.value)
  if (!folder) {
    return source
  }

  return source.filter(chat => folder.chatIds.includes(chat.id))
})

const systemDirectoryCards = computed<AgentSystemCard[]>(() => systemFolders.value
  .map((folder) => {
    const folderChats = conversations.conversations.value.filter(chat => folder.chatIds.includes(chat.id))
    const latestRun = folder.runs?.[0] || folder.lastRun
    const agentNames = (folder.agentIds || [])
      .map(agentId => agentMap.value.get(agentId)?.displayName)
      .filter((value): value is string => Boolean(value))
    const latestConversation = folderChats
      .slice()
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0]

    return {
      key: folder.key,
      label: folder.label,
      agentNames,
      agentCount: agentNames.length,
      chatCount: folderChats.length,
      preview: latestRun?.prompt
        ? (latestRun.summary
            ? `Итог: ${latestRun.summary}`
            : `Запуск: ${latestRun.prompt}`)
        : agentNames.length
          ? agentNames.slice(0, 3).join(' · ')
          : 'Состав системы пока не определён.',
      lastUpdatedAt: latestRun?.sentAt || latestConversation?.updatedAt || '',
    }
  })
  .sort((left, right) => new Date(right.lastUpdatedAt || 0).getTime() - new Date(left.lastUpdatedAt || 0).getTime()))

const activeAgentSystemCard = computed(() => activeAgentSystem.value
  ? systemDirectoryCards.value.find(card => card.key === activeAgentSystem.value?.key) ?? null
  : null)

const activeAgentSystemRuns = computed(() => activeAgentSystem.value?.runs || [])
const activeAgentSystemLastRun = computed(() => activeAgentSystemRuns.value[0] || activeAgentSystem.value?.lastRun || null)
const activeAgentSystemHistoryRuns = computed(() => activeAgentSystemRuns.value.slice(1, 6))

const activeAgentSystemChats = computed(() => {
  if (!activeAgentSystem.value) {
    return []
  }

  return activeAgentSystem.value.chatIds
    .map(chatId => conversations.conversations.value.find(item => item.id === chatId) ?? null)
    .filter((chat): chat is MessengerConversationItem => Boolean(chat && chat.peerType === 'agent'))
})

function upsertFolder(folder: ChatFolder) {
  const index = userFolders.value.findIndex(item => item.key === folder.key)
  if (index === -1) {
    userFolders.value = [...userFolders.value, folder]
  } else {
    const nextFolders = [...userFolders.value]
    nextFolders[index] = folder
    userFolders.value = nextFolders
  }

  saveFolders()
}

function attachChatToFolder(folderKey: string, conversationId: string) {
  const target = userFolders.value.find(folder => folder.key === folderKey)
  if (!target) {
    return
  }

  if (!target.chatIds.includes(conversationId)) {
    target.chatIds = [...target.chatIds, conversationId]
    saveFolders()
  }
}

function createAgentFolderIfNeeded(agentId: string, displayName: string) {
  const folderKey = `agent-chat-${agentId}`
  const existing = userFolders.value.find(folder => folder.key === folderKey || (folder.kind === 'agent' && folder.agentIds?.includes(agentId)))
  if (existing) {
    return existing.key
  }

  upsertFolder({
    key: folderKey,
    label: displayName,
    chatIds: [],
    kind: 'agent',
    agentIds: [agentId],
  })

  return folderKey
}

// ── Сессии ────────────────────────────────────────────────────────────────────
const subscriptionsModel = useMessengerSubscriptions()
const cliSessions = useMessengerCliSessions()

const showSessionComposer = ref(false)
const sessionComposerError = ref('')
const sessionComposerPending = ref(false)

const SESSION_EFFORT_OPTIONS = [
  { title: 'Low — быстро', value: 'low' },
  { title: 'Medium — баланс', value: 'medium' },
  { title: 'High — тщательно', value: 'high' },
  { title: 'XHigh — максимум', value: 'xhigh' },
]

const SESSION_ROLE_OPTIONS = [
  { title: 'Оркестратор', value: 'orchestrator' as SessionRole },
  { title: 'Воркер', value: 'worker' as SessionRole },
  { title: 'Автономный', value: 'standalone' as SessionRole },
]

type SessionMemberDraft = {
  agentId: string
  role: SessionRole
  subscriptionId: string
  model: string
  effort: string
  workroom: string
}

const sessionDraftLabel = ref('')
const sessionDraftMembers = ref<SessionMemberDraft[]>([])

function makeBlankMember(role: SessionRole = 'worker'): SessionMemberDraft {
  const defaultSub = subscriptionsModel.defaultSubscription.value
  const subId = defaultSub?.id || 'builtin-claude-code-cli'
  const models = subscriptionsModel.modelsByProvider(defaultSub?.provider || 'claude-code-cli')
  const balancedModel = models.find(m => m.tier === 'balanced') || models[0]
  return {
    agentId: '',
    role,
    subscriptionId: subId,
    model: balancedModel?.id || '',
    effort: 'medium',
    workroom: '',
  }
}

function openSessionComposer() {
  sessionDraftLabel.value = ''
  sessionDraftMembers.value = [
    makeBlankMember('orchestrator'),
    makeBlankMember('worker'),
  ]
  sessionComposerError.value = ''
  showSessionComposer.value = true
}

function addSessionMember() {
  sessionDraftMembers.value.push(makeBlankMember('worker'))
}

function removeSessionMember(index: number) {
  sessionDraftMembers.value.splice(index, 1)
}

function modelsForMember(member: SessionMemberDraft) {
  const sub = subscriptionsModel.subscriptions.value.find(s => s.id === member.subscriptionId)
  if (!sub) return []
  return subscriptionsModel.modelsOf(sub)
}

function onMemberSubscriptionChange(member: SessionMemberDraft) {
  const models = modelsForMember(member)
  const balanced = models.find(m => m.tier === 'balanced') || models[0]
  member.model = balanced?.id || ''
}

async function createSessionGroup() {
  sessionComposerError.value = ''
  const label = sessionDraftLabel.value.trim()
  if (!label) {
    sessionComposerError.value = 'Укажите название группы сессий.'
    return
  }
  const validMembers = sessionDraftMembers.value.filter(m => m.agentId)
  if (!validMembers.length) {
    sessionComposerError.value = 'Добавьте хотя бы одного участника с выбранным агентом.'
    return
  }

  sessionComposerPending.value = true
  const chatIds: string[] = []

  try {
    for (const member of validMembers) {
      await conversations.openAgentConversation(member.agentId)
      const convId = conversations.activeConversationId.value
      if (convId && !chatIds.includes(convId)) chatIds.push(convId)
    }

    const folderKey = `session-group-${Date.now()}`
    upsertFolder({
      key: folderKey,
      label,
      chatIds,
      kind: 'session-group',
      agentIds: validMembers.map(m => m.agentId),
      members: validMembers,
      createdAt: new Date().toISOString(),
    })

    activeChatMode.value = 'sessions'
    activeFolderKey.value = folderKey
    navigation.openSection('chats')
    showSessionComposer.value = false
  } catch {
    sessionComposerError.value = 'Не удалось открыть чаты с участниками сессии.'
  } finally {
    sessionComposerPending.value = false
  }
}

function openSessionGroup(folderKey: string) {
  activeChatMode.value = 'sessions'
  activeFolderKey.value = folderKey
}

function formatSessionGroupMeta(folder: ChatFolder) {
  const members = folder.members || []
  const orch = members.filter(m => m.role === 'orchestrator').length
  const workers = members.filter(m => m.role === 'worker').length
  const standalone = members.filter(m => m.role === 'standalone').length
  const parts: string[] = []
  if (orch) parts.push(`${orch} оркестратор`)
  if (workers) parts.push(`${workers} воркер${workers > 1 ? 'а' : ''}`)
  if (standalone) parts.push(`${standalone} авт.`)
  if (!parts.length) parts.push(`${(folder.agentIds || []).length} агентов`)
  return parts.join(' · ')
}

// ── Новый чат (FAB) ──────────────────────────────────────────────────────────
const showNewChatDialog = ref(false)
const newChatError = ref('')
const newChatMode = ref<'menu' | 'agent' | 'system'>('menu')
const agentSearchDraft = ref('')
const newSystemName = ref('')
const newSystemAgentIds = ref<string[]>([])
const showEditSystemDialog = ref(false)
const editSystemName = ref('')
const editSystemAgentIds = ref<string[]>([])
const editSystemError = ref('')
const editSystemPending = ref(false)
const showBroadcastDialog = ref(false)
const broadcastMessage = ref('')
const broadcastError = ref('')
const broadcastPending = ref(false)
const newSystemTemplateKey = ref<string | null>(null)

const normalizedAgentSearchQuery = computed(() => agentSearchDraft.value.trim().toLowerCase())
const filteredAgentGallery = computed(() => {
  if (!normalizedAgentSearchQuery.value) {
    return agentsModel.agents.value
  }

  return agentsModel.agents.value.filter(agent => [agent.displayName, agent.login, agent.description]
    .some(value => value.toLowerCase().includes(normalizedAgentSearchQuery.value)))
})

watch(showNewChatDialog, async (isOpen) => {
  if (isOpen) {
    await agentsModel.refresh()
    newChatMode.value = 'menu'
    newChatError.value = ''
    agentSearchDraft.value = ''
    newSystemName.value = ''
    newSystemAgentIds.value = []
    newSystemTemplateKey.value = null
  }
})

function buildTemplateGraph(templateKey: string, selectedAgentIds: string[]): Record<string, MessengerAgentGraphNodeInput> {
  const template = availableSystemTemplates.value.find(item => item.key === templateKey)
  if (!template) {
    return {}
  }

  const selected = new Set(selectedAgentIds)
  const orderedAgentIds = template.agentIds.filter(agentId => selected.has(agentId))

  return Object.fromEntries(orderedAgentIds.map((agentId, index) => {
    const graphPosition = {
      x: 32 + (index % 3) * 220,
      y: 32 + Math.floor(index / 3) * 180,
    }

    const connections = template.connections
      .filter(connection => connection.sourceAgentId === agentId && selected.has(connection.targetAgentId))
      .map(connection => ({
        targetAgentId: connection.targetAgentId,
        mode: connection.mode,
      }))

    return [agentId, {
      graphPosition,
      connections,
    }]
  }))
}

async function applySystemTemplateGraph(templateKey: string | null, selectedAgentIds: string[]) {
  if (!templateKey) {
    return
  }

  const graph = buildTemplateGraph(templateKey, selectedAgentIds)
  if (!Object.keys(graph).length) {
    return
  }

  await agentsModel.saveGraph(graph)
}

function formatSystemTextPreview(value: string, maxLength = 160) {
  const compact = value.trim().replace(/\s+/g, ' ')
  if (compact.length <= maxLength) {
    return compact
  }

  return `${compact.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

function buildAgentSystemRunSummary(chats: MessengerConversationItem[]) {
  const snapshots = chats.map((chat) => {
    const response = chat.lastMessage && !chat.lastMessage.own
      ? formatSystemTextPreview(chat.lastMessage.body || 'Сообщение без текста', 140)
      : 'Ответ ещё не получен.'

    return {
      agentId: chat.peerUserId,
      agentName: chat.peerDisplayName,
      response,
    }
  })

  const readySnapshots = snapshots.filter(item => item.response !== 'Ответ ещё не получен.')
  const summary = readySnapshots.length
    ? readySnapshots
      .slice(0, 2)
      .map(item => `${item.agentName}: ${item.response}`)
      .join(' | ')
    : 'Система отправила запрос, но ответы агентов ещё не зафиксированы.'

  return {
    summary: formatSystemTextPreview(summary, 220),
    agentSnapshots: snapshots,
  }
}

async function openAgentFromGallery(agentId: string) {
  newChatError.value = ''

  const agent = agentsModel.agents.value.find(item => item.id === agentId)
  if (!agent) {
    newChatError.value = 'Агент не найден в галерее.'
    return
  }

  try {
    await conversations.openAgentConversation(agentId)
    const conversationId = conversations.activeConversationId.value
    if (conversationId) {
      const currentFolder = userFolders.value.find(folder => folder.key === activeFolderKey.value)
      const folderKey = currentFolder?.kind === 'agent'
        ? currentFolder.key
        : createAgentFolderIfNeeded(agent.id, agent.displayName)
      attachChatToFolder(folderKey, conversationId)
      activeChatMode.value = 'agents'
      activeFolderKey.value = folderKey
    }
    navigation.openSection('chat')
    showNewChatDialog.value = false
  } catch {
    newChatError.value = 'Не удалось открыть чат с агентом.'
  }
}

async function openCliSession(agentId: string | null) {
  if (!agentId) return
  try {
    await conversations.openAgentConversation(agentId)
    navigation.openSection('chat')
  } catch {}
}

function toggleAgentSystemMember(agentId: string) {
  if (newSystemAgentIds.value.includes(agentId)) {
    newSystemAgentIds.value = newSystemAgentIds.value.filter(item => item !== agentId)
    return
  }

  newSystemAgentIds.value = [...newSystemAgentIds.value, agentId]
}

function toggleEditSystemMember(agentId: string) {
  if (editSystemAgentIds.value.includes(agentId)) {
    editSystemAgentIds.value = editSystemAgentIds.value.filter(item => item !== agentId)
    return
  }

  editSystemAgentIds.value = [...editSystemAgentIds.value, agentId]
}

function applyAgentSystemTemplate(templateKey: string) {
  const template = availableSystemTemplates.value.find(item => item.key === templateKey)
  if (!template) {
    return
  }

  newSystemTemplateKey.value = template.key
  newSystemName.value = template.systemName
  newSystemAgentIds.value = [...template.agentIds]
}

function applyBroadcastPromptTemplate(prompt: string) {
  broadcastMessage.value = prompt
}

function getAgentSystemDraftName(label: string) {
  return label.replace(/^Система:\s*/u, '').trim()
}

async function createAgentSystem() {
  newChatError.value = ''
  const selectedAgents = agentsModel.agents.value.filter(agent => newSystemAgentIds.value.includes(agent.id))
  const systemName = newSystemName.value.trim()

  if (!systemName) {
    newChatError.value = 'Укажите название системы агентов.'
    return
  }

  if (selectedAgents.length === 0) {
    newChatError.value = 'Выберите минимум одного агента для системы.'
    return
  }

  const createdConversationIds: string[] = []

  try {
    for (const agent of selectedAgents) {
      await conversations.openAgentConversation(agent.id)
      const conversationId = conversations.activeConversationId.value
      if (conversationId) {
        createdConversationIds.push(conversationId)
      }
    }

    await applySystemTemplateGraph(newSystemTemplateKey.value, selectedAgents.map(agent => agent.id))

    const folderKey = `agent-system-custom-${Date.now()}`
    upsertFolder({
      key: folderKey,
      label: `Система: ${systemName}`,
      chatIds: Array.from(new Set(createdConversationIds)),
      kind: 'agent-system',
      templateKey: newSystemTemplateKey.value || undefined,
      agentIds: selectedAgents.map(agent => agent.id),
    })
    activeChatMode.value = 'systems'
    activeFolderKey.value = folderKey
    navigation.openSection('chats')
    showNewChatDialog.value = false
  } catch {
    newChatError.value = 'Не удалось создать систему агентов.'
  }
}

function openAgentSystem(folderKey: string) {
  activeChatMode.value = 'systems'
  activeFolderKey.value = folderKey
}

async function openEditAgentSystem() {
  if (!activeAgentSystem.value) {
    return
  }

  await agentsModel.refresh()
  editSystemError.value = ''
  editSystemName.value = getAgentSystemDraftName(activeAgentSystem.value.label)
  editSystemAgentIds.value = [...(activeAgentSystem.value.agentIds || [])]
  showEditSystemDialog.value = true
}

async function saveAgentSystemEdits() {
  if (!activeAgentSystem.value) {
    return
  }

  editSystemError.value = ''
  const nextName = editSystemName.value.trim()
  const selectedAgents = agentsModel.agents.value.filter(agent => editSystemAgentIds.value.includes(agent.id))

  if (!nextName) {
    editSystemError.value = 'Укажите название системы агентов.'
    return
  }

  if (!selectedAgents.length) {
    editSystemError.value = 'Выберите минимум одного агента для системы.'
    return
  }

  editSystemPending.value = true

  try {
    const previousAgentIds = activeAgentSystem.value.agentIds || []
    const removedAgentIds = previousAgentIds.filter(agentId => !editSystemAgentIds.value.includes(agentId))
    const addedAgentIds = editSystemAgentIds.value.filter(agentId => !previousAgentIds.includes(agentId))

    let nextChatIds = activeAgentSystem.value.chatIds.filter((chatId) => {
      const chat = conversations.conversations.value.find(item => item.id === chatId)
      if (!chat || chat.peerType !== 'agent') {
        return true
      }

      return !removedAgentIds.includes(chat.peerUserId)
    })

    for (const agentId of addedAgentIds) {
      await conversations.openAgentConversation(agentId)
      const conversationId = conversations.activeConversationId.value
      if (conversationId) {
        nextChatIds.push(conversationId)
      }
    }

    await applySystemTemplateGraph(activeAgentSystem.value.templateKey || null, selectedAgents.map(agent => agent.id))

    upsertFolder({
      ...activeAgentSystem.value,
      label: `Система: ${nextName}`,
      agentIds: selectedAgents.map(agent => agent.id),
      chatIds: Array.from(new Set(nextChatIds)),
    })

    activeChatMode.value = 'systems'
    showEditSystemDialog.value = false
    navigation.openSection('chats')
  } catch {
    editSystemError.value = 'Не удалось обновить систему агентов.'
  } finally {
    editSystemPending.value = false
  }
}

function openBroadcastDialog() {
  if (!activeAgentSystem.value) {
    return
  }

  broadcastError.value = ''
  broadcastMessage.value = ''
  showBroadcastDialog.value = true
}

async function broadcastToAgentSystem() {
  if (!activeAgentSystem.value) {
    return
  }

  const message = broadcastMessage.value.trim()
  if (!message) {
    broadcastError.value = 'Введите сообщение для системы агентов.'
    return
  }

  if (!activeAgentSystemChats.value.length) {
    broadcastError.value = 'В системе нет агентных чатов для запуска.'
    return
  }

  broadcastPending.value = true
  broadcastError.value = ''
  const previousConversationId = conversations.activeConversationId.value

  try {
    for (const chat of activeAgentSystemChats.value) {
      await conversations.selectConversation(chat.id)
      await conversations.sendMessage(message)
    }

    if (previousConversationId) {
      await conversations.selectConversation(previousConversationId)
    }

    const refreshedChats = activeAgentSystem.value.chatIds
      .map(chatId => conversations.conversations.value.find(item => item.id === chatId) ?? null)
      .filter((chat): chat is MessengerConversationItem => Boolean(chat && chat.peerType === 'agent'))
    const runSummary = buildAgentSystemRunSummary(refreshedChats)
    const nextRun: AgentSystemRun = {
      prompt: message,
      sentAt: new Date().toISOString(),
      targetCount: activeAgentSystemChats.value.length,
      summary: runSummary.summary,
      agentSnapshots: runSummary.agentSnapshots,
    }

    upsertFolder({
      ...activeAgentSystem.value,
      runs: [nextRun, ...(activeAgentSystem.value.runs || []), ...(activeAgentSystem.value.lastRun ? [activeAgentSystem.value.lastRun] : [])]
        .sort((left, right) => new Date(right.sentAt || 0).getTime() - new Date(left.sentAt || 0).getTime())
        .filter((run, index, runs) => runs.findIndex(item => item.sentAt === run.sentAt && item.prompt === run.prompt) === index)
        .slice(0, 12),
      lastRun: nextRun,
    })

    await conversations.refresh(searchDraft.value)
    navigation.openSection('chats')
    showBroadcastDialog.value = false
  } catch {
    broadcastError.value = 'Не удалось отправить сообщение всем агентам системы.'
  } finally {
    broadcastPending.value = false
  }
}

function formatAgentSystemStats(card: AgentSystemCard) {
  const parts = [`${card.agentCount} агентов`, `${card.chatCount} чатов`]
  if (card.lastUpdatedAt) {
    parts.push(`обновлено ${formatConversationTimestamp(card.lastUpdatedAt)}`)
  }

  return parts.join(' · ')
}

function formatSystemRunPrompt(value: string) {
  return formatSystemTextPreview(value, 120)
}

let searchTimer: ReturnType<typeof setTimeout> | null = null

const chatSuggestions = computed(() => filteredConversations.value.slice(0, 8))
const emptyStateTitle = computed(() => {
  if (activeAgentSystem.value) {
    return 'Внутри системы пока нет чатов.'
  }

  if (activeSessionGroup.value) {
    return 'В группе сессий пока нет чатов.'
  }

  if (activeChatMode.value === 'agents') {
    return 'Чаты с AI-агентами пока пусты.'
  }

  if (activeChatMode.value === 'systems') {
    return 'Система пока не выбрана.'
  }

  if (activeChatMode.value === 'sessions') {
    return 'Группа сессий не выбрана.'
  }

  return 'Чаты с людьми пока пусты.'
})

onMounted(async () => {
  await conversations.refresh()
  subscriptionsModel.hydrate()
  searchDraft.value = conversations.query.value
  ensureActiveFolderForMode()
  await cliSessions.refresh()
})

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
})

watch(searchDraft, (value) => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  searchTimer = setTimeout(async () => {
    try {
      await conversations.refresh(value.trim())
      searchOpen.value = true
    } catch {
      actionError.value = 'Не удалось обновить список чатов.'
    }
  }, 180)
})

watch([activeChatMode, userFolders], () => {
  ensureActiveFolderForMode()
}, { deep: true })

async function runSearch() {
  actionError.value = ''

  try {
    await conversations.refresh(searchDraft.value)
  } catch {
    actionError.value = 'Не удалось обновить список чатов.'
  }
}

async function openChat(conversationId: string) {
  if (holdActions.consumeSuppressedClick()) {
    return
  }

  actionError.value = ''

  try {
    holdActions.dismiss()
    await conversations.selectConversation(conversationId)
  } catch {
    actionError.value = 'Не удалось открыть чат.'
  }
}

async function removeChat(conversationId: string) {
  actionError.value = ''

  try {
    holdActions.dismiss()
    await conversations.deleteConversation(conversationId)
  } catch {
    actionError.value = 'Не удалось удалить чат.'
  }
}

async function startChatCall(conversationId: string, mode: 'audio' | 'video') {
  actionError.value = ''

  const conversation = conversations.conversations.value.find(item => item.id === conversationId)
  if (conversation?.peerType === 'agent') {
    actionError.value = 'Для AI-агентов звонки недоступны.'
    return
  }

  try {
    holdActions.dismiss()
    await conversations.selectConversation(conversationId)
    navigation.openSection('chat')
    await calls.startOutgoingCall(mode)
  } catch {
    actionError.value = mode === 'video'
      ? 'Не удалось начать видеозвонок.'
      : 'Не удалось начать аудиозвонок.'
  }
}

async function selectSuggestion(conversationId: string) {
  searchOpen.value = false
  await openChat(conversationId)
}

function openSearch() {
  searchOpen.value = true
}

function closeSearch() {
  setTimeout(() => {
    searchOpen.value = false
  }, 120)
}

function startHold(conversationId: string, event?: Event) {
  holdActions.startHold(conversationId, event?.target)
}

function formatConversationTimestamp(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  })
}

function resolveChatAvatar(name: string) {
  const normalized = name.trim()

  if (!normalized) {
    return '??'
  }

  return normalized
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')
}

function formatChatPreview(chat: MessengerConversationItem) {
  if (!chat.lastMessage) {
    return 'Сообщений пока нет'
  }

  if (chat.policy.hideListPreview) {
    return 'Новые сообщения'
  }

  const body = chat.lastMessage.body.trim()
  if (!body) {
    return chat.lastMessage.own ? 'Вы: сообщение' : 'Сообщение'
  }

  return chat.lastMessage.own ? `Вы: ${body}` : body
}
</script>

<template>
  <section class="section-block section-block--chats" aria-label="Chats section">
    <VAlert v-if="actionError" type="error" class="ma-2">{{ actionError }}</VAlert>
    <div v-if="conversations.pending.value" class="section-progress section-progress--floating">
      <MessengerProgressLinear aria-label="Загрузка списка чатов" indeterminate four-color />
    </div>

    <div class="chats-submenu-bar" role="tablist" aria-label="Подменю чатов">
      <button
        type="button"
        class="chats-submenu-chip"
        :class="{ 'chats-submenu-chip--active': activeChatMode === 'people' }"
        role="tab"
        :aria-selected="activeChatMode === 'people'"
        @click="setChatMode('people')"
      >Люди</button>
      <button
        v-if="agentsEnabled"
        type="button"
        class="chats-submenu-chip"
        :class="{ 'chats-submenu-chip--active': activeChatMode === 'agents' }"
        role="tab"
        :aria-selected="activeChatMode === 'agents'"
        @click="setChatMode('agents')"
      >Агенты</button>
      <button
        v-if="agentsEnabled"
        type="button"
        class="chats-submenu-chip"
        :class="{ 'chats-submenu-chip--active': activeChatMode === 'systems' }"
        role="tab"
        :aria-selected="activeChatMode === 'systems'"
        @click="setChatMode('systems')"
      >Системы AI</button>
      <button
        v-if="agentsEnabled"
        type="button"
        class="chats-submenu-chip"
        :class="{ 'chats-submenu-chip--active': activeChatMode === 'sessions' }"
        role="tab"
        :aria-selected="activeChatMode === 'sessions'"
        @click="setChatMode('sessions')"
      >Сессии</button>
    </div>

    <!-- Список чатов + FAB -->
    <div class="chats-list-wrap">
      <div v-if="agentsEnabled && showAgentSystemsDirectory" class="agent-systems-directory">
        <button
          v-for="card in systemDirectoryCards"
          :key="card.key"
          type="button"
          class="agent-system-card"
          @click="openAgentSystem(card.key)"
        >
          <span class="agent-system-card__title">{{ card.label }}</span>
          <span class="agent-system-card__meta">{{ formatAgentSystemStats(card) }}</span>
          <span class="agent-system-card__preview">{{ card.preview }}</span>
        </button>

        <div v-if="!systemDirectoryCards.length" class="empty-state">
          <p class="empty-state__title">Системы агентов пока не созданы.</p>
        </div>
      </div>

      <!-- Sessions directory -->
      <div v-else-if="agentsEnabled && showSessionsDirectory" class="sessions-directory">
        <!-- Live sessions from dashboard registry -->
        <div class="sessions-directory__section">
          <div class="sessions-directory__header">
            <p class="sessions-directory__title">
              <span class="sessions-directory__live-dot" />
              Живые сессии
            </p>
            <VBtn
              size="x-small"
              variant="text"
              icon="mdi-refresh"
              :loading="cliSessions.pending.value"
              title="Обновить"
              @click="cliSessions.refresh()"
            />
          </div>

          <!-- Hierarchy: composer → orchestrators → workers -->
          <div v-if="cliSessions.runningSessions.value.length" class="cli-sessions-hierarchy">
            <template v-for="(tier, tierIdx) in cliSessions.hierarchy.value" :key="tierIdx">
              <div v-if="tier.length" class="cli-sessions-tier">
                <div
                  v-for="session in tier"
                  :key="session.slug"
                  class="cli-session-chip"
                  :class="`cli-session-chip--${getSessionKindMeta(session.kind).color.replace('-', '_')}`"
                  @click="openCliSession(session.agentId)"
                >
                  <span class="cli-session-chip__dot" />
                  <VIcon size="14" :color="getSessionKindMeta(session.kind).color">{{ getSessionKindMeta(session.kind).icon }}</VIcon>
                  <span class="cli-session-chip__name">{{ session.agentDisplayName || session.slug }}</span>
                  <span class="cli-session-chip__kind">{{ getSessionKindMeta(session.kind).label }}</span>
                  <VChip v-if="session.workroom" size="x-small" variant="text" class="cli-session-chip__wr">{{ session.workroom }}</VChip>
                </div>
              </div>
              <div v-if="tier.length && tierIdx < cliSessions.hierarchy.value.length - 1 && cliSessions.hierarchy.value.slice(tierIdx + 1).some(t => t.length)" class="cli-sessions-tier-arrow">
                <VIcon size="14" color="on-surface-variant">mdi-arrow-down</VIcon>
              </div>
            </template>
          </div>

          <div v-else-if="!cliSessions.pending.value" class="empty-state empty-state--compact">
            <p class="empty-state__title">Нет активных сессий.</p>
            <p class="empty-state__hint">Запустите сессию через <code>claude-session create &lt;slug&gt;</code></p>
          </div>
        </div>

        <!-- Manual session groups -->
        <div class="sessions-directory__section">
          <div class="sessions-directory__header">
            <p class="sessions-directory__title">Группы сессий</p>
            <VBtn size="small" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openSessionComposer()">
              Новая группа
            </VBtn>
          </div>

          <button
            v-for="group in sessionGroups"
            :key="group.key"
            type="button"
            class="session-group-card"
            @click="openSessionGroup(group.key)"
          >
            <div class="session-group-card__head">
              <VIcon size="18" color="primary">mdi-layers-outline</VIcon>
              <span class="session-group-card__title">{{ group.label }}</span>
            </div>
            <span class="session-group-card__meta">{{ formatSessionGroupMeta(group) }}</span>
            <div v-if="group.members?.length" class="session-group-card__members">
              <div
                v-for="member in group.members"
                :key="`${member.agentId}-${member.role}`"
                class="session-group-card__member"
              >
                <VIcon size="13" :color="SESSION_ROLE_COLORS[member.role]">{{ SESSION_ROLE_ICONS[member.role] }}</VIcon>
                <span class="session-group-card__member-name">
                  {{ agentMap.get(member.agentId)?.displayName || member.agentId }}
                </span>
                <span class="session-group-card__member-role">{{ SESSION_ROLE_LABELS[member.role] }}</span>
              </div>
            </div>
          </button>

          <div v-if="!sessionGroups.length" class="empty-state empty-state--compact">
            <p class="empty-state__title">Групп сессий пока нет.</p>
            <p class="empty-state__hint">Нажмите «Новая группа» — укажите оркестратор, воркеров и подписки.</p>
          </div>
        </div>
      </div>

      <VList v-else class="section-list" bg-color="transparent" lines="two">
        <!-- Session group banner -->
        <div v-if="agentsEnabled && activeSessionGroup" class="session-group-banner">
          <div class="session-group-banner__head">
            <div class="session-group-banner__copy">
              <p class="session-group-banner__title">{{ activeSessionGroup.label }}</p>
              <p class="session-group-banner__meta">{{ formatSessionGroupMeta(activeSessionGroup) }}</p>
            </div>
            <div class="session-group-banner__actions">
              <VBtn size="small" variant="tonal" @click="openSessionComposer()">+ Группа</VBtn>
            </div>
          </div>
          <div v-if="activeSessionGroup.members?.length" class="session-group-banner__members">
            <div
              v-for="member in activeSessionGroup.members"
              :key="`${member.agentId}-${member.role}`"
              class="session-member-row"
            >
              <VIcon size="16" :color="SESSION_ROLE_COLORS[member.role]">{{ SESSION_ROLE_ICONS[member.role] }}</VIcon>
              <div class="session-member-row__info">
                <span class="session-member-row__name">{{ agentMap.get(member.agentId)?.displayName || member.agentId }}</span>
                <span class="session-member-row__meta">{{ SESSION_ROLE_LABELS[member.role] }} · {{ member.model || 'модель не выбрана' }} · {{ member.effort }}</span>
              </div>
              <VChip v-if="member.workroom" size="x-small" variant="outlined">{{ member.workroom }}</VChip>
            </div>
          </div>
        </div>

        <div v-if="agentsEnabled && activeAgentSystemCard" class="agent-system-banner">
          <div class="agent-system-banner__head">
            <div class="agent-system-banner__copy">
              <p class="agent-system-banner__title">{{ activeAgentSystemCard.label }}</p>
            </div>
            <div class="agent-system-banner__actions">
              <VBtn size="small" variant="tonal" @click="openBroadcastDialog()">Запустить</VBtn>
              <VBtn size="small" variant="tonal" @click="openEditAgentSystem()">Настроить</VBtn>
            </div>
          </div>
          <p class="agent-system-banner__meta">{{ formatAgentSystemStats(activeAgentSystemCard) }}</p>
          <p class="agent-system-banner__preview">{{ activeAgentSystemCard.preview }}</p>
          <div v-if="activeAgentSystemLastRun" class="agent-system-banner__run">
            <p class="agent-system-banner__run-meta">Последний запуск · {{ activeAgentSystemLastRun.targetCount }} агентов · {{ formatConversationTimestamp(activeAgentSystemLastRun.sentAt) }}</p>
            <p class="agent-system-banner__run-prompt">{{ formatSystemRunPrompt(activeAgentSystemLastRun.prompt) }}</p>
            <div v-if="activeAgentSystemLastRun.summary" class="agent-system-banner__summary">
              <p class="agent-system-banner__summary-title">Итог системы</p>
              <p class="agent-system-banner__summary-text">{{ activeAgentSystemLastRun.summary }}</p>
              <div v-if="activeAgentSystemLastRun.agentSnapshots?.length" class="agent-system-banner__summary-list">
                <div
                  v-for="snapshot in activeAgentSystemLastRun.agentSnapshots"
                  :key="`${snapshot.agentId}-${snapshot.agentName}`"
                  class="agent-system-banner__summary-item"
                >
                  <span class="agent-system-banner__summary-agent">{{ snapshot.agentName }}</span>
                  <span class="agent-system-banner__summary-response">{{ snapshot.response }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="activeAgentSystemHistoryRuns.length" class="agent-system-banner__history">
            <p class="agent-system-banner__history-title">Лента запусков</p>
            <div class="agent-system-banner__history-list">
              <div
                v-for="run in activeAgentSystemHistoryRuns"
                :key="`${run.sentAt}-${run.prompt}`"
                class="agent-system-banner__history-item"
              >
                <p class="agent-system-banner__history-meta">{{ formatConversationTimestamp(run.sentAt) }} · {{ run.targetCount }} агентов</p>
                <p class="agent-system-banner__history-prompt">{{ formatSystemRunPrompt(run.prompt) }}</p>
                <p v-if="run.summary" class="agent-system-banner__history-summary">{{ run.summary }}</p>
              </div>
            </div>
          </div>
        </div>

        <VListItem
          v-for="chat in filteredConversations"
          :key="chat.id"
          class="chat-row"
          data-hold-actions-root="true"
          :class="{
            'list-item--hold-open': holdActions.activeItemId.value === chat.id,
          }"
          @click="openChat(chat.id)"
          @mousedown.left="startHold(chat.id, $event)"
          @mouseup="holdActions.cancelHold()"
          @mouseleave="holdActions.cancelHold()"
          @touchstart.passive="startHold(chat.id, $event)"
          @touchend="holdActions.cancelHold()"
          @touchcancel="holdActions.cancelHold()"
          @touchmove="holdActions.cancelHold()"
          @contextmenu.prevent="holdActions.open(chat.id)"
        >
          <template #prepend>
            <VAvatar color="primary" variant="tonal" size="48">
              {{ resolveChatAvatar(chat.peerDisplayName) }}
            </VAvatar>
          </template>
          <template #title>
            <div class="chat-row__titlebar">
              <div class="chat-row__titlemain">
                <span class="title-small chat-row__display-name">{{ chat.peerDisplayName }}</span>
                <MessengerIcon v-if="chat.secret" class="chat-secret-marker" name="shield" :size="14" aria-hidden="true" />
              </div>

              <div
                v-if="holdActions.activeItemId.value === chat.id"
                class="hold-actions hold-actions--inline"
                data-hold-actions-menu="true"
                @pointerdown.stop
              >
                <button
                  v-if="chat.peerType !== 'agent'"
                  type="button"
                  class="hold-actions__icon-btn"
                  aria-label="Аудиозвонок"
                  @click.stop="startChatCall(chat.id, 'audio')"
                >
                  <MessengerIcon class="hold-actions__icon" name="phone" :size="22" />
                </button>
                <button
                  v-if="chat.peerType !== 'agent'"
                  type="button"
                  class="hold-actions__icon-btn"
                  aria-label="Видеозвонок"
                  @click.stop="startChatCall(chat.id, 'video')"
                >
                  <MessengerIcon class="hold-actions__icon" name="video" :size="22" />
                </button>
                <button
                  type="button"
                  class="hold-actions__icon-btn hold-actions__icon-btn--danger"
                  aria-label="Удалить чат"
                  @click.stop="removeChat(chat.id)"
                >
                  <MessengerIcon class="hold-actions__icon hold-actions__icon--danger" name="delete" :size="22" />
                </button>
              </div>
            </div>
          </template>
          <template #subtitle>
            <span class="chat-row__preview on-surface-variant">{{ formatChatPreview(chat) }}</span>
          </template>
          <template #append>
            <span v-if="holdActions.activeItemId.value !== chat.id" class="chat-row__time on-surface-variant">{{ formatConversationTimestamp(chat.updatedAt) }}</span>
          </template>
        </VListItem>

        <div v-if="!filteredConversations.length" class="empty-state">
          <p class="empty-state__title">{{ emptyStateTitle }}</p>
        </div>
      </VList>

      <!-- FAB -->
      <button
        v-if="agentsEnabled && !showNewChatDialog && !showSessionComposer && activeChatMode !== 'sessions'"
        type="button"
        class="chats-fab"
        aria-label="Создать чат"
        @click="showNewChatDialog = true"
      >
        <VIcon color="on-primary-container">mdi-pencil-outline</VIcon>
      </button>
      <button
        v-if="agentsEnabled && !showSessionComposer && activeChatMode === 'sessions'"
        type="button"
        class="chats-fab"
        aria-label="Новая группа сессий"
        @click="openSessionComposer()"
      >
        <VIcon color="on-primary-container">mdi-plus</VIcon>
      </button>
    </div>

    <!-- Папки чатов -->
    <div class="chats-folders-bar" role="tablist" aria-label="Папки чатов">
      <button
        v-if="activeChatMode !== 'systems'"
        type="button"
        class="chats-folder-chip"
        :class="{ 'chats-folder-chip--active': activeFolderKey === 'all' }"
        role="tab"
        :aria-selected="activeFolderKey === 'all'"
        @click="activeFolderKey = 'all'"
      >{{ activeChatMode === 'agents' ? 'Все агенты' : 'Все' }}</button>
      <button
        v-else-if="activeChatMode === 'systems'"
        type="button"
        class="chats-folder-chip"
        :class="{ 'chats-folder-chip--active': activeFolderKey === AGENT_SYSTEMS_FOLDER_KEY }"
        role="tab"
        :aria-selected="activeFolderKey === AGENT_SYSTEMS_FOLDER_KEY"
        @click="activeFolderKey = AGENT_SYSTEMS_FOLDER_KEY"
      >Каталог систем</button>
      <button
        v-else-if="activeChatMode === 'sessions'"
        type="button"
        class="chats-folder-chip"
        :class="{ 'chats-folder-chip--active': activeFolderKey === SESSIONS_FOLDER_KEY }"
        role="tab"
        :aria-selected="activeFolderKey === SESSIONS_FOLDER_KEY"
        @click="activeFolderKey = SESSIONS_FOLDER_KEY"
      >Все группы</button>
      <button
        v-for="folder in visibleFolders"
        :key="folder.key"
        type="button"
        class="chats-folder-chip"
        :title="folder.kind === 'agent-system' ? 'Система агентов' : folder.label"
        :class="{ 'chats-folder-chip--active': activeFolderKey === folder.key }"
        role="tab"
        :aria-selected="activeFolderKey === folder.key"
        @click="activeFolderKey = folder.key"
        @contextmenu.prevent="folderContextKey = folder.key"
      >{{ folder.kind === 'agent-system' ? `${folder.label} · ${(folder.agentIds || []).length}` : folder.label }}</button>
      <button
        v-if="activeChatMode === 'people'"
        type="button"
        class="chats-folder-chip"
        aria-label="Создать папку"
        @click="showCreateFolder = true"
      >＋</button>
    </div>

    <!-- Search Dock -->
    <div class="search-dock">
      <div class="search-dock__field">
        <MessengerDockField>
          <input
            v-model="searchDraft"
            type="search"
            class="composer-input composer-input--dock"
            placeholder="Поиск по чатам"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            enterkeyhint="search"
            @focus="openSearch"
            @blur="closeSearch"
            @keydown.enter.prevent="runSearch"
          />
        </MessengerDockField>
        <Transition name="chrome-reveal">
          <div v-if="searchOpen && chatSuggestions.length" class="search-dropdown" @mousedown.prevent>
            <VList bg-color="transparent" density="comfortable">
              <VListItem
                v-for="chat in chatSuggestions"
                :key="chat.id"
                @click="selectSuggestion(chat.id)"
              >
                <template #prepend>
                  <VAvatar color="primary" variant="tonal" size="36">
                    {{ resolveChatAvatar(chat.peerDisplayName) }}
                  </VAvatar>
                </template>
                <template #title>{{ chat.peerDisplayName }}</template>
                <template #subtitle>{{ chat.lastMessage?.body || 'Сообщений пока нет' }}</template>
              </VListItem>
            </VList>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Диалог: удаление папки -->
    <VDialog :model-value="folderContextKey !== null" max-width="280" @update:model-value="folderContextKey = null">
      <VCard>
        <VCardTitle>Удалить папку?</VCardTitle>
        <VCardText>Папка будет удалена. Чаты останутся.</VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="folderContextKey = null">Отмена</VBtn>
          <VBtn color="error" variant="tonal" @click="confirmDeleteFolder()">Удалить</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Диалог: создание папки -->
    <VDialog v-model="showCreateFolder" max-width="320">
      <VCard>
        <VCardTitle>Новая папка</VCardTitle>
        <VCardText>
          <VTextField
            v-model="folderDraftName"
            label="Название папки"
            placeholder="Работа, Семья…"
            autofocus
            hide-details
            @keydown.enter="createFolder()"
          />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="showCreateFolder = false">Отмена</VBtn>
          <VBtn color="primary" variant="tonal" :disabled="!folderDraftName.trim()" @click="createFolder()">Создать</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Диалог: новый чат (FAB) -->
    <VDialog v-if="agentsEnabled" v-model="showNewChatDialog" max-width="520" content-class="new-chat-dialog__content">
      <VCard>
        <VCardTitle>Новый чат</VCardTitle>
        <VCardText>
          <div v-if="newChatMode === 'menu'" class="new-chat-mode-grid">
            <button type="button" class="new-chat-mode-card" @click="newChatMode = 'agent'">
              <span class="new-chat-mode-card__title">Чат с агентом</span>
            </button>
            <button type="button" class="new-chat-mode-card" @click="newChatMode = 'system'">
              <span class="new-chat-mode-card__title">Система агентов</span>
            </button>
          </div>

          <div v-else-if="newChatMode === 'agent'" class="new-chat-agent-gallery">
            <VTextField
              v-model="agentSearchDraft"
              label="Поиск агента"
              variant="outlined"
              hide-details
            />
            <div class="new-chat-agent-gallery__list">
              <button
                v-for="agent in filteredAgentGallery"
                :key="agent.id"
                type="button"
                class="new-chat-agent-gallery__item"
                @click="openAgentFromGallery(agent.id)"
              >
                <span class="new-chat-agent-gallery__item-title">{{ agent.displayName }}</span>
                <span class="new-chat-agent-gallery__item-subtitle">@{{ agent.login }} · {{ agent.settings.model }}</span>
              </button>
              <p v-if="!filteredAgentGallery.length" class="on-surface-variant body-medium">Агенты не найдены.</p>
            </div>
          </div>

          <div v-else class="new-chat-system-builder">
            <div v-if="availableSystemTemplates.length" class="new-chat-system-builder__templates">
              <p class="new-chat-system-builder__hint">Готовые системы можно взять как основу, а затем изменить состав вручную.</p>
              <div class="new-chat-system-builder__template-list">
                <button
                  v-for="template in availableSystemTemplates"
                  :key="template.key"
                  type="button"
                  class="new-chat-system-template"
                  @click="applyAgentSystemTemplate(template.key)"
                >
                  <span class="new-chat-system-template__title">{{ template.title }}</span>
                  <span class="new-chat-system-template__meta">{{ template.agentIds.length }} агентов</span>
                  <span class="new-chat-system-template__text">{{ template.description }}</span>
                </button>
              </div>
            </div>
            <VTextField
              v-model="newSystemName"
              label="Название системы агентов"
              placeholder="Например: Система для проекта Ивановы"
              variant="outlined"
              hide-details
            />
            <p class="new-chat-system-builder__hint">Node-граф сейчас отключён. Система создаётся как папка с выбранными агентами.</p>
            <div class="new-chat-system-builder__chips">
              <VChip
                v-for="agent in agentsModel.agents.value"
                :key="agent.id"
                :variant="newSystemAgentIds.includes(agent.id) ? 'flat' : 'outlined'"
                :color="newSystemAgentIds.includes(agent.id) ? 'primary' : undefined"
                @click="toggleAgentSystemMember(agent.id)"
              >
                {{ agent.displayName }}
              </VChip>
            </div>
            <VBtn
              color="primary"
              variant="tonal"
              :disabled="!newSystemName.trim() || !newSystemAgentIds.length"
              @click="createAgentSystem()"
            >
              Создать систему агентов
            </VBtn>
          </div>

          <VAlert v-if="newChatError" type="error" class="ma-4">{{ newChatError }}</VAlert>
        </VCardText>
        <VCardActions>
          <VBtn v-if="newChatMode !== 'menu'" variant="text" @click="newChatMode = 'menu'">Назад</VBtn>
          <VSpacer />
          <VBtn variant="text" @click="showNewChatDialog = false">Закрыть</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-if="agentsEnabled" v-model="showEditSystemDialog" max-width="520">
      <VCard>
        <VCardTitle>Настроить систему</VCardTitle>
        <VCardText>
          <div class="new-chat-system-builder">
            <VTextField
              v-model="editSystemName"
              label="Название системы агентов"
              placeholder="Например: Система для проекта Ивановы"
              variant="outlined"
              hide-details
            />
            <p class="new-chat-system-builder__hint">Вы можете менять состав системы без пересоздания папки. Чаты удалённых агентов будут убраны только из этой системы.</p>
            <div class="new-chat-system-builder__chips">
              <VChip
                v-for="agent in agentsModel.agents.value"
                :key="agent.id"
                :variant="editSystemAgentIds.includes(agent.id) ? 'flat' : 'outlined'"
                :color="editSystemAgentIds.includes(agent.id) ? 'primary' : undefined"
                @click="toggleEditSystemMember(agent.id)"
              >
                {{ agent.displayName }}
              </VChip>
            </div>
            <VAlert v-if="editSystemError" type="error">{{ editSystemError }}</VAlert>
          </div>
        </VCardText>
        <VCardActions>
          <VBtn variant="text" @click="showEditSystemDialog = false">Отмена</VBtn>
          <VSpacer />
          <VBtn
            color="primary"
            variant="tonal"
            :loading="editSystemPending"
            :disabled="editSystemPending || !editSystemName.trim() || !editSystemAgentIds.length"
            @click="saveAgentSystemEdits()"
          >
            Обновить систему
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-if="agentsEnabled" v-model="showBroadcastDialog" max-width="560">
      <VCard>
        <VCardTitle>Запустить систему</VCardTitle>
        <VCardText>
          <div class="new-chat-system-builder">
            <p class="new-chat-system-builder__hint">Сообщение будет отправлено во все agent-чаты текущей системы. Каждый агент получит одинаковый входной запрос.</p>
            <div v-if="activeBroadcastPromptTemplates.length" class="new-chat-system-builder__templates">
              <p class="new-chat-system-builder__hint">Быстрые шаблоны запуска для этой системы.</p>
              <div class="new-chat-system-builder__prompt-chips">
                <VChip
                  v-for="promptTemplate in activeBroadcastPromptTemplates"
                  :key="promptTemplate.key"
                  variant="outlined"
                  @click="applyBroadcastPromptTemplate(promptTemplate.prompt)"
                >
                  {{ promptTemplate.label }}
                </VChip>
              </div>
            </div>
            <VTextarea
              v-model="broadcastMessage"
              label="Общий запрос для системы"
              placeholder="Например: Соберите 3 разных взгляда на проект и предложите единый план действий"
              variant="outlined"
              rows="5"
              auto-grow
              hide-details
            />
            <p class="new-chat-system-builder__hint">Агентов в запуске: {{ activeAgentSystemChats.length }}</p>
            <VAlert v-if="broadcastError" type="error">{{ broadcastError }}</VAlert>
          </div>
        </VCardText>
        <VCardActions>
          <VBtn variant="text" @click="showBroadcastDialog = false">Отмена</VBtn>
          <VSpacer />
          <VBtn
            color="primary"
            variant="tonal"
            :loading="broadcastPending"
            :disabled="broadcastPending || !broadcastMessage.trim() || !activeAgentSystemChats.length"
            @click="broadcastToAgentSystem()"
          >
            Отправить всем агентам
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
    <!-- Диалог: Composer сессий -->
    <VDialog v-if="agentsEnabled" v-model="showSessionComposer" max-width="620" scrollable>
      <VCard>
        <VCardTitle class="pa-4 pb-2 d-flex align-center gap-2">
          <VIcon color="primary">mdi-layers-outline</VIcon>
          Новая группа сессий
        </VCardTitle>
        <VCardText class="pa-4 pt-2">
          <VTextField
            v-model="sessionDraftLabel"
            label="Название группы"
            placeholder="Например: Feature X — параллельная разработка"
            variant="outlined"
            class="mb-4"
          />

          <div class="session-members-list">
            <div
              v-for="(member, index) in sessionDraftMembers"
              :key="index"
              class="session-member-card"
            >
              <div class="session-member-card__head">
                <VIcon size="16" :color="SESSION_ROLE_COLORS[member.role]">{{ SESSION_ROLE_ICONS[member.role] }}</VIcon>
                <span class="session-member-card__label">Участник {{ index + 1 }}</span>
                <VSpacer />
                <VBtn size="x-small" icon variant="text" color="error" :disabled="sessionDraftMembers.length <= 1" @click="removeSessionMember(index)">
                  <VIcon size="16">mdi-close</VIcon>
                </VBtn>
              </div>

              <div class="session-member-card__fields">
                <!-- Role -->
                <VSelect
                  v-model="member.role"
                  :items="SESSION_ROLE_OPTIONS"
                  item-title="title"
                  item-value="value"
                  label="Роль"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="session-member-card__field"
                />

                <!-- Agent -->
                <VSelect
                  v-model="member.agentId"
                  :items="agentsModel.agents.value.map(a => ({ title: a.displayName, subtitle: `@${a.login}`, value: a.id }))"
                  item-title="title"
                  item-value="value"
                  label="Агент"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="session-member-card__field"
                >
                  <template #item="{ props, item }">
                    <VListItem v-bind="props" :subtitle="item.raw.subtitle" />
                  </template>
                </VSelect>

                <!-- Subscription -->
                <VSelect
                  v-model="member.subscriptionId"
                  :items="subscriptionsModel.subscriptions.value.map(s => ({ title: s.label, value: s.id }))"
                  item-title="title"
                  item-value="value"
                  label="Подписка"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="session-member-card__field"
                  @update:model-value="onMemberSubscriptionChange(member)"
                />

                <!-- Model -->
                <VSelect
                  v-model="member.model"
                  :items="modelsForMember(member).map(m => ({ title: m.label, value: m.id }))"
                  item-title="title"
                  item-value="value"
                  label="Модель"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="session-member-card__field"
                  :disabled="!modelsForMember(member).length"
                />

                <!-- Effort -->
                <VSelect
                  v-model="member.effort"
                  :items="SESSION_EFFORT_OPTIONS"
                  item-title="title"
                  item-value="value"
                  label="Effort"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="session-member-card__field"
                />

                <!-- Workroom -->
                <VTextField
                  v-model="member.workroom"
                  label="Workroom (необязательно)"
                  placeholder="w1-feature-x"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="session-member-card__field"
                />
              </div>
            </div>
          </div>

          <VBtn
            variant="tonal"
            color="secondary"
            prepend-icon="mdi-plus"
            class="mt-3"
            @click="addSessionMember()"
          >
            Добавить участника
          </VBtn>

          <VAlert v-if="sessionComposerError" type="error" class="mt-3">{{ sessionComposerError }}</VAlert>
        </VCardText>
        <VCardActions class="pa-4 pt-0">
          <VBtn variant="text" @click="showSessionComposer = false">Отмена</VBtn>
          <VSpacer />
          <VBtn
            color="primary"
            variant="flat"
            :loading="sessionComposerPending"
            :disabled="sessionComposerPending || !sessionDraftLabel.trim() || !sessionDraftMembers.some(m => m.agentId)"
            @click="createSessionGroup()"
          >
            Создать группу
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>