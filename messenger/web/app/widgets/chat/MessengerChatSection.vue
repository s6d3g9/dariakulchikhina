<script setup lang="ts">
import type { MessengerAttachmentKlipyPayload, MessengerConversationMessage, MessengerStagedAttachment } from '../../entities/conversations/model/useMessengerConversations'
import type { MessengerKlipyItem } from '../../entities/messages/model/useMessengerKlipy'
import type { MessengerConversationSecuritySummary } from '../../entities/messages/model/useMessengerCrypto'
import type { ProjectActionExecutePayload, ProjectActionId } from '../../features/project-engine/model/useMessengerProjectActions'
import type { AgentToolUseEntry } from '../../entities/agents/model/useMessengerAgentStream'
import { useKlipyFeedPaging } from './model/use-klipy-feed-paging'
import { getSessionKindMeta, type MessengerCliSession } from '../../entities/sessions/model/useMessengerCliSessions'
import { deriveLiveness } from '../../features/monitor-topology/model/liveness'
import { shouldFoldIntoBurst } from '../../features/message-thread/lib/burstGrouping'

interface MessengerThreadMessage extends MessengerConversationMessage {
  comments: MessengerThreadMessage[]
  burst?: MessengerThreadMessage[]
}

const conversations = useMessengerConversations()
const auth = useMessengerAuth()
const agentsModel = useMessengerAgents()
const cliSessionsModel = useMessengerCliSessions()
const contacts = useMessengerContacts()
const messengerCrypto = useMessengerCrypto()
const klipy = useMessengerKlipy()
const klipyApi = useKlipyApi()
const viewport = useMessengerViewport()
const navigation = useMessengerConversationState()
const { resetKlipyFeedPaging, buildLoopedFeed, handleLoopedRailScroll, handleLoopedFeedScroll, primeLoopedRailPosition, primeLoopedFeedPosition } = useKlipyFeedPaging()
const draft = ref('')
const searchMode = ref(false)

interface StagedAttachmentEntry extends MessengerStagedAttachment {
  // Local id keyed off File reference plus index — used as :key in v-for and
  // by removeStagedAttachment to splice the array. The server-side message
  // payload doesn't carry this field; it's stripped before send.
  localId: string
  // Object URL for image preview, revoked on remove or after send. Null for
  // non-image MIME types — the chip falls back to a generic file icon.
  previewObjectUrl: string | null
}
const stagedAttachments = ref<StagedAttachmentEntry[]>([])
const stagingPending = ref(false)

const AIDEV_MENU_ITEMS = [
  { key: 'composer', title: 'Composer', icon: 'mdi-chat-processing-outline' },
  { key: 'agents', title: 'Агенты', icon: 'mdi-robot-outline' },
  { key: 'connectors', title: 'Коннекторы', icon: 'mdi-connection' },
  { key: 'skills', title: 'Навыки', icon: 'mdi-lightning-bolt-outline' },
  { key: 'plugins', title: 'Плагины', icon: 'mdi-puzzle-outline' },
  { key: 'mcp', title: 'MCP', icon: 'mdi-api' },
  { key: 'external-apis', title: 'API', icon: 'mdi-cloud-outline' },
  { key: 'settings', title: 'Настройки', icon: 'mdi-cog-outline' },
] as const

const WORKSPACE_MENU_ITEMS = [
  { key: 'overview', title: 'Обзор', icon: 'mdi-view-dashboard-outline' },
  { key: 'settings', title: 'Настройки', icon: 'mdi-tune-variant' },
  { key: 'knowledge', title: 'Знания', icon: 'mdi-database-search-outline' },
  { key: 'links', title: 'Связи', icon: 'mdi-connection' },
  { key: 'runs', title: 'Прогоны', icon: 'mdi-history' },
  { key: 'graph', title: 'Граф', icon: 'mdi-graph-outline' },
  { key: 'explorer', title: 'Проводник', icon: 'mdi-file-tree-outline' },
] as const

const workspaceActiveSectionState = useState<string>('messenger-agent-chat-workspace-section', () => 'overview')

interface AiMenuHit {
  kind: 'aidev' | 'workspace'
  key: string
  title: string
  icon: string
  group: string
}

const aiMenuSearchResults = computed<AiMenuHit[]>(() => {
  const query = draft.value.trim().toLowerCase()
  const aidev: AiMenuHit[] = AIDEV_MENU_ITEMS.map(i => ({ kind: 'aidev', group: 'AIDev', ...i }))
  const workspace: AiMenuHit[] = WORKSPACE_MENU_ITEMS.map(i => ({ kind: 'workspace', group: 'Рабочая область', ...i }))
  const all = [...aidev, ...workspace]
  if (!query) return all
  return all.filter(item => item.title.toLowerCase().includes(query) || item.key.toLowerCase().includes(query))
})

function toggleSearchMode() {
  searchMode.value = !searchMode.value
  draft.value = ''
}

function pickAiMenuHit(hit: AiMenuHit) {
  if (hit.kind === 'aidev') {
    onSelectAidevTab(hit.key)
  } else {
    workspaceActiveSectionState.value = hit.key
    if (activeConversationAgent.value) {
      agentWorkspaceCollapsed.value = false
    }
  }
  searchMode.value = false
  draft.value = ''
}
const actionError = ref('')
const composerMediaMenuRef = ref<{
  categoryRailEl: HTMLDivElement | null
  feedEl: HTMLDivElement | null
} | null>(null)
const composerDockRef = ref<{
  fileInputEl: HTMLInputElement | null
  projectActionsRootEl: HTMLDivElement | null
  composerBarEl: HTMLDivElement | null
  composerInputEl: HTMLTextAreaElement | HTMLDivElement | null
} | null>(null)
const messageListEl = ref<HTMLElement | null>(null)
const mediaPickerInputEl = ref<HTMLInputElement | null>(null)
const composerInputEl = computed(() => composerDockRef.value?.composerInputEl ?? null)
const composerBarEl = computed(() => composerDockRef.value?.composerBarEl ?? null)
const detailsOpen = ref(false)
const copiedLabel = ref('')
const secretIntroSeen = useState<Record<string, boolean>>('messenger-secret-intro-seen', () => ({}))
const calls = useMessengerCalls()
const {
  isRecording,
  recordingSeconds,
  recordingLevels,
  recordingIntensity,
  audioDraft,
  canRecordAudio,
  toggleAudioRecording,
  sendAudioDraft,
  abortOrClearAudio,
  resetAudio,
  updateAudioDraftTrimStart,
  updateAudioDraftTrimEnd,
  clearAudioDraft,
} = useAudioDraft({
  isMessagePending: conversations.messagePending,
  hasActiveConversation: computed(() => Boolean(conversations.activeConversation.value)),
  uploadAttachment: file => conversations.uploadAttachment(file),
  clearCallError: () => calls.clearError(),
  actionError,
})
const projectActions = useMessengerProjectActions()
const editingMessageId = ref<string | null>(null)
const editingDraft = ref('')
const activeMessageActionsId = ref<string | null>(null)
const activeReactionOverlayId = ref<string | null>(null)
const composerHeight = ref(76)
const composerRelationMode = ref<'reply' | 'comment' | null>(null)
const composerRelationMessageId = ref<string | null>(null)
const forwardingMessageId = ref<string | null>(null)
const forwardSearchDraft = ref('')
const selectedForwardPeerIds = ref<string[]>([])
const galleryPhotoId = ref<string | null>(null)
const pendingScrollMessageId = ref<string | null>(null)
const dragDropDepth = ref(0)
const dragDropPending = ref(false)
const composerMediaMenuOpen = ref(false)
const composerMediaMenuTab = ref<'emoji' | 'stickers' | 'gif' | 'photo' | 'file'>('emoji')
const klipyQuery = ref('')
const mediaUploadPending = ref(false)
const agentWorkspaceCollapsed = ref(false)
const headerOverflowMenuOpen = ref(false)
const selectedCatalogCategory = ref('')
const selectedKlipyItem = ref<MessengerKlipyItem | null>(null)
const klipyAudienceMode = reactive<{ stickers: 'mine' | 'shared'; gif: 'mine' | 'shared' }>({
  stickers: 'mine',
  gif: 'mine',
})

const composerEmojiOptions = ['😀', '😉', '😍', '🔥', '👍', '👏', '🙏', '❤️', '🎉', '🤝', '✨', '😎']
const messageReactionOptions = ['👍', '❤️', '🔥', '😂', '👏', '😮']
const securitySummary = ref<MessengerConversationSecuritySummary | null>(null)
const securitySummaryPending = ref(false)
const securitySummaryUpdatedAt = ref<string | null>(null)

let composerAlignTimer: ReturnType<typeof setTimeout> | null = null
let composerResizeObserver: ResizeObserver | null = null
let klipySearchTimer: ReturnType<typeof setTimeout> | null = null
let forwardSearchTimer: ReturnType<typeof setTimeout> | null = null
let lockedPageScrollY = 0

const KLIPY_RAIL_PAGE_SIZE = 24

async function cancelAudioComposerState() {
  composerMediaMenuOpen.value = false
  abortOrClearAudio()
}

function scheduleKlipyCatalogLoad() {
  if (klipySearchTimer) {
    clearTimeout(klipySearchTimer)
    klipySearchTimer = null
  }

  if (!composerMediaMenuVisible.value) {
    return
  }

  const kind = activeKlipyKind.value
  if (!kind) {
    return
  }

  void klipy.loadCategories(kind)

  klipySearchTimer = setTimeout(() => {
    void klipy.search(klipyQuery.value, kind, {
      category: klipyQuery.value.trim() ? undefined : selectedCatalogCategory.value || undefined,
    })
    klipySearchTimer = null
  }, 180)
}

function resetKlipyAudienceMode() {
  klipyAudienceMode.stickers = 'mine'
  klipyAudienceMode.gif = 'mine'
}

async function ensureKlipyFeedScrollable() {
  if (!composerMediaMenuVisible.value || activeKlipyAudience.value !== 'mine' || !canLoadMoreKlipyItems.value) {
    return
  }

  const feed = composerMediaMenuRef.value?.feedEl
  if (!feed) {
    return
  }

  let attempts = 0
  while (attempts < 4 && canLoadMoreKlipyItems.value && !klipy.pending.value && feed.scrollHeight <= feed.clientHeight + 24) {
    attempts += 1
    await klipy.loadMore(KLIPY_RAIL_PAGE_SIZE)
    await nextTick()
  }
}

function isMobileChatViewport() {
  if (!import.meta.client) {
    return false
  }

  return window.matchMedia('(max-width: 767px)').matches || navigator.maxTouchPoints > 0
}

function isDesktopCallAnalysisViewport() {
  if (!import.meta.client) {
    return true
  }

  return window.matchMedia('(min-width: 980px)').matches
}

function lockPageScroll() {
  if (!import.meta.client || !isMobileChatViewport()) {
    return
  }

  const root = document.documentElement
  const body = document.body
  if (body.dataset.messengerScrollLocked === 'true') {
    return
  }

  lockedPageScrollY = window.scrollY
  body.dataset.messengerScrollLocked = 'true'
  root.style.overflow = 'hidden'
  body.style.overflow = 'hidden'
}

function unlockPageScroll() {
  if (!import.meta.client) {
    return
  }

  const root = document.documentElement
  const body = document.body
  if (body.dataset.messengerScrollLocked !== 'true') {
    return
  }

  body.dataset.messengerScrollLocked = 'false'
  root.style.height = ''
  root.style.overflow = ''
  body.style.height = ''
  body.style.width = ''
  body.style.overflow = ''
  window.scrollTo({ top: lockedPageScrollY, behavior: 'auto' })
}

interface SharedAssetItem {
  id: string
  title: string
  meta: string
  href: string
  previewUrl?: string
}

function isStickerSharedAsset(message: MessengerConversationMessage) {
  const attachment = message.attachment
  if (!attachment || !attachment.mimeType.startsWith('image/')) {
    return false
  }

  return attachment.klipy?.kind === 'sticker' || attachment.mimeType === 'image/webp'
}

function resolveAttachmentTitle(attachment: { name: string, mimeType: string }) {
  if (attachment.mimeType.startsWith('audio/')) {
    return 'Аудиосообщение'
  }

  return attachment.name
}

function extractLinks(text: string) {
  return Array.from(text.matchAll(/https?:\/\/[^\s]+/g), match => match[0])
}

const activePeerName = computed(() => conversations.activeConversation.value?.peerDisplayName || 'Выберите чат')
const activePeerAvatar = computed(() => {
  const name = activePeerName.value.trim()
  if (!name || name === 'Выберите чат') {
    return 'Ч'
  }

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')
})

const activeConversationPolicy = computed(() => conversations.activeConversation.value?.policy ?? null)
const activeConversationSecret = computed(() => Boolean(conversations.activeConversation.value?.secret))
const activeConversationAgent = computed(() => conversations.activeConversation.value?.peerType === 'agent')
const activeAgentProjectId = computed(() => {
  if (!activeConversationAgent.value) return null
  const agentId = conversations.activeConversation.value?.peerUserId
  if (!agentId) return null
  // agentsModel only holds global (non-project) agents — project agents are filtered out
  // server-side. Use sessions data as the authoritative projectId source.
  const fromSession = cliSessionsModel.sessions.value.find(s => s.agentId === agentId)?.agentProjectId
  if (fromSession) return fromSession
  return agentsModel.agents.value.find(a => a.id === agentId)?.projectId ?? null
})

// AIDev overlay panel (expands over the chat rather than navigating away).
// `aidevActiveTabState` is also read by ProjectConfigTabs so the two stay synced.
const aidevActiveTabState = useState<string>('aidev-active-tab', () => 'composer')
const aidevPanelTab = ref<string | null>(null)
const projectsModel = useMessengerProjects()

const agentProject = computed(() => {
  const id = activeAgentProjectId.value
  if (!id) return null
  return projectsModel.projects.value.find(p => p.id === id) ?? null
})

function onSelectAidevTab(tab: string | null) {
  aidevPanelTab.value = tab
  if (tab) aidevActiveTabState.value = tab
}

onMounted(() => { void projectsModel.refresh() })

const sessNavCollapsed = ref(true)

// Live-ticking "now" for elapsed-time counters rendered in session capsules.
// 1s cadence is fine — the counters read in H:MM:SS so sub-second updates
// would be visual noise.
const nowTick = ref(Date.now())
let nowTickTimer: ReturnType<typeof setInterval> | null = null

function formatElapsed(fromIso: string | null | undefined): string {
  if (!fromIso) return '—'
  const t = new Date(fromIso).getTime()
  if (!Number.isFinite(t)) return '—'
  const sec = Math.max(0, Math.floor((nowTick.value - t) / 1000))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function formatClock(iso: string | null | undefined): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '' }
}

function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (n >= 1_000) return Math.round(n / 1000) + 'k'
  return String(n)
}

// Tokens summary for the header capsule — shows composer spend (all composer
// sessions scoped to the current project) and total spend (every session we
// render in projectScopedHierarchy). Composer is called out separately because
// it's the hub that fans work out; the rest is aggregate "what the tree cost".
const sessionTokenSummary = computed(() => {
  const flat = projectScopedHierarchy.value.flat()
  let composerIn = 0, composerOut = 0
  let totalIn = 0, totalOut = 0
  let totalCost = 0
  for (const s of flat) {
    totalIn += s.tokenInTotal
    totalOut += s.tokenOutTotal
    totalCost += s.costUsd
    if (s.kind === 'composer') {
      composerIn += s.tokenInTotal
      composerOut += s.tokenOutTotal
    }
  }
  return {
    composerIn, composerOut, composerTotal: composerIn + composerOut,
    totalIn, totalOut, total: totalIn + totalOut,
    totalCost,
    hasComposer: flat.some(s => s.kind === 'composer'),
    sessionCount: flat.length,
  }
})

// --- SVG edges connecting parent → child across tier rows ----------------
// Visually shows "who spawned whom" by drawing a curve from each child's
// session capsule up to its parent's capsule. Without this, a 3-tier stack
// of rows just looks like three flat lists with no relationship between
// them. Parent resolution tries explicit parentAgentId first, then falls
// back to a sensible default (tier 1 → first composer, tier 2 → first
// orchestrator, else first composer).
const sessNavBodyRef = ref<HTMLElement | null>(null)
const tabElsBySlug = new Map<string, HTMLElement>()
function registerSessTab(slug: string, el: unknown) {
  if (el instanceof HTMLElement) tabElsBySlug.set(slug, el)
  else tabElsBySlug.delete(slug)
}

interface SessNavEdge { id: string; d: string; color: string }
const sessNavEdges = ref<SessNavEdge[]>([])
const sessNavBodySize = ref({ w: 0, h: 0 })

function recomputeSessNavEdges() {
  const body = sessNavBodyRef.value
  if (!body) { sessNavEdges.value = []; return }
  const bodyRect = body.getBoundingClientRect()
  sessNavBodySize.value = { w: bodyRect.width, h: bodyRect.height }

  const hierarchy = projectScopedHierarchy.value
  const composers = hierarchy[0] ?? []
  const orchestrators = hierarchy[1] ?? []
  const workers = hierarchy[2] ?? []
  const byAgentId = new Map<string, MessengerCliSession>()
  for (const s of [...composers, ...orchestrators, ...workers]) {
    if (s.agentId) byAgentId.set(s.agentId, s)
  }

  function anchor(slug: string) {
    const el = tabElsBySlug.get(slug)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      topX: r.left - bodyRect.left + r.width / 2,
      topY: r.top - bodyRect.top,
      botX: r.left - bodyRect.left + r.width / 2,
      botY: r.bottom - bodyRect.top,
    }
  }

  const edges: SessNavEdge[] = []
  function addEdge(parent: MessengerCliSession, child: MessengerCliSession, color: string) {
    const pa = anchor(parent.slug)
    const ca = anchor(child.slug)
    if (!pa || !ca) return
    const x1 = pa.botX, y1 = pa.botY
    const x2 = ca.topX, y2 = ca.topY
    const mid = (y1 + y2) / 2
    const d = `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`
    edges.push({ id: `${parent.slug}->${child.slug}`, d, color })
  }

  for (const orch of orchestrators) {
    const parent = (orch.parentAgentId && byAgentId.get(orch.parentAgentId)) || composers[0]
    if (parent) addEdge(parent, orch, 'rgba(167,139,250,.75)')
  }
  for (const w of workers) {
    const parent = (w.parentAgentId && byAgentId.get(w.parentAgentId)) || orchestrators[0] || composers[0]
    if (parent) addEdge(parent, w, 'rgba(96,165,250,.6)')
  }

  sessNavEdges.value = edges
}

// Note: no { deep: true } here. The previous version traversed
// projectScopedHierarchy reactively at watch-init time, but
// projectScopedHierarchy is declared ~230 lines below — Vue would call the
// source getter immediately to seed deep tracking and hit a TDZ
// "Cannot access 'ia' before initialization" before setup finished.
// Reference-equality is enough: projectScopedHierarchy is a computed that
// produces a fresh array on every dependency change, so the watcher fires
// whenever the hierarchy actually changes.
watch(
  [() => projectScopedHierarchy.value, () => sessNavCollapsed.value],
  () => { void nextTick(() => recomputeSessNavEdges()) },
)
// The elapsed-time counter in each capsule changes every second, which can
// shift tab widths. Retick edges ~once a second to keep lines attached.
watch(() => nowTick.value, () => { recomputeSessNavEdges() })

let sessNavResizeObs: ResizeObserver | null = null
onMounted(() => {
  void nextTick(() => {
    recomputeSessNavEdges()
    if (typeof ResizeObserver !== 'undefined' && sessNavBodyRef.value) {
      sessNavResizeObs = new ResizeObserver(() => recomputeSessNavEdges())
      sessNavResizeObs.observe(sessNavBodyRef.value)
    }
  })
})
onUnmounted(() => {
  sessNavResizeObs?.disconnect()
  sessNavResizeObs = null
  tabElsBySlug.clear()
})

// Stop-button state — per-slug pending flags so spamming stop on one capsule
// doesn't disable every button.
const stoppingSlugs = ref<Set<string>>(new Set())
const stopErrorBySlug = ref<Record<string, string>>({})
async function onStopSession(slug: string) {
  if (!slug || stoppingSlugs.value.has(slug)) return
  stoppingSlugs.value.add(slug)
  delete stopErrorBySlug.value[slug]
  try {
    await cliSessionsModel.stopSession(slug)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'stop failed'
    stopErrorBySlug.value = { ...stopErrorBySlug.value, [slug]: msg }
    setTimeout(() => {
      const next = { ...stopErrorBySlug.value }
      delete next[slug]
      stopErrorBySlug.value = next
    }, 4000)
  } finally {
    const next = new Set(stoppingSlugs.value)
    next.delete(slug)
    stoppingSlugs.value = next
  }
}

const MODEL_OPTIONS = [
  { label: 'Opus 4.7',   value: 'claude-opus-4-7',           icon: 'mdi-brain',   color: 'primary' },
  { label: 'Sonnet 4.6', value: 'claude-sonnet-4-6',         icon: 'mdi-waveform', color: 'info' },
  { label: 'Haiku 4.5',  value: 'claude-haiku-4-5-20251001', icon: 'mdi-feather', color: 'success' },
] as const

const modelSetPending = ref(false)
const modelSetError = ref('')

// Resolve the agent id of the currently open agent conversation. Used both
// for the live session lookup and for persisting a model preference when no
// CLI session has been launched yet.
const currentAgentId = computed(() => {
  const conv = conversations.activeConversation.value
  if (!conv || conv.peerType !== 'agent') return ''
  return conv.peerUserId || ''
})

// Pick the model meta for the header button. Prefer the live session model
// when one is running; otherwise fall back to the persisted per-agent
// preference so the chosen model sticks across reopens of an agent chat
// that doesn't yet have a session. Default to Sonnet when nothing is set.
const currentModelMeta = computed(() => {
  const sessionModel = activeAgentSession.value?.model
  const prefModel = currentAgentId.value ? cliSessionsModel.getModelPref(currentAgentId.value) : ''
  const model = sessionModel || prefModel
  return MODEL_OPTIONS.find(o => o.value === model) ?? MODEL_OPTIONS[1]
})

const currentModelValue = computed(() => {
  const sessionModel = activeAgentSession.value?.model
  if (sessionModel) return sessionModel
  const agentId = currentAgentId.value
  return agentId ? cliSessionsModel.getModelPref(agentId) : ''
})

async function onModelSelect(model: string) {
  const sess = activeAgentSession.value
  const agentId = currentAgentId.value
  modelSetError.value = ''

  // No live CLI session yet — persist the choice so the next quickLaunch
  // (or the live setModel after it spawns) starts with the chosen model.
  if (!sess) {
    if (agentId) {
      cliSessionsModel.persistModelPref(agentId, model)
    }
    return
  }

  // Persist the per-agent preference too so a later session reuses the
  // operator's choice instead of resetting to Sonnet.
  if (agentId) {
    cliSessionsModel.persistModelPref(agentId, model)
  }

  modelSetPending.value = true
  try {
    await cliSessionsModel.setModel(sess.slug, model)
  }
  catch (err) {
    console.error('[chat] setModel failed', err)
    modelSetError.value = 'Не удалось сменить модель'
    setTimeout(() => { modelSetError.value = '' }, 3000)
  }
  finally {
    modelSetPending.value = false
  }
}

const effortSetPending = ref(false)

const currentSessionEffort = computed<'low' | 'medium' | 'high' | 'xhigh' | 'max'>(() => {
  const slug = activeAgentSession.value?.slug
  if (!slug) return 'medium'
  return cliSessionsModel.getEffort(slug)
})

async function onEffortSelect(effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max') {
  const sess = activeAgentSession.value
  modelSetError.value = ''
  if (!sess) {
    // setEffort gracefully handles the no-session case by persisting the
    // pref against the slug; without a slug yet we just skip — the next
    // session will inherit medium until the operator reopens this menu.
    return
  }
  effortSetPending.value = true
  try {
    await cliSessionsModel.setEffort(sess.slug, effort)
  }
  catch (err) {
    console.error('[chat] setEffort failed', err)
    modelSetError.value = 'Не удалось сменить effort'
    setTimeout(() => { modelSetError.value = '' }, 3000)
  }
  finally {
    effortSetPending.value = false
  }
}

const subsModel = useMessengerSubscriptions()
onMounted(() => { subsModel.hydrate().catch(() => {}) })

const currentSubscriptionLabel = computed(() => subsModel.defaultSubscription.value?.label ?? '')

// Per-session token counter for the active agent's CLI session. We can't
// fetch real Claude rate-limit data without intercepting /v1/messages traffic,
// so we just show what we already track per session: tokens in/out and cost.
const activeSessionUsage = computed(() => {
  const sess = activeAgentSession.value
  if (!sess) return null
  return {
    tokenIn: sess.tokenInTotal || 0,
    tokenOut: sess.tokenOutTotal || 0,
    costUsd: sess.costUsd || 0,
    model: sess.model || '',
  }
})

// Per-subscription cumulative (lifetime) spend across every CLI session we
// know about — running, done and archived. We deliberately include archived
// rows because the user wants "сколько всего потрачено на подписку", not
// "сколько тратится сейчас". The session count `×N` makes the historical
// nature visible.
//
// Sessions don't carry a subscriptionId — they only know their model id — so
// we derive the subscription by matching `model` against each subscription's
// declared model list. A few model ids appear in multiple subscriptions
// (e.g. `gpt-4.1` is in both openai and github-copilot). When that happens
// we prefer the default subscription, otherwise fall back to first match.
// Sessions whose model can't be mapped land in a synthetic "unknown" bucket,
// keeping the totals honest instead of silently dropping them.
const subscriptionUsages = computed(() => {
  const subs = subsModel.subscriptions.value
  if (subs.length === 0) return []
  const defaultSubId = subsModel.defaultSubscription.value?.id ?? null
  const modelToSubIds = new Map<string, string[]>()
  for (const sub of subs) {
    const meta = subsModel.providerOf(sub)
    for (const m of meta?.models ?? []) {
      const list = modelToSubIds.get(m.id) ?? []
      list.push(sub.id)
      modelToSubIds.set(m.id, list)
    }
  }
  const modelToSubId = new Map<string, string>()
  for (const [model, list] of modelToSubIds) {
    const preferred = (defaultSubId && list.includes(defaultSubId)) ? defaultSubId : list[0]!
    modelToSubId.set(model, preferred)
  }
  type Bucket = {
    id: string
    label: string
    icon: string
    color: string
    tokenIn: number
    tokenOut: number
    costUsd: number
    sessionCount: number
  }
  const buckets = new Map<string, Bucket>()
  for (const sub of subs) {
    const meta = subsModel.providerOf(sub)
    buckets.set(sub.id, {
      id: sub.id,
      label: sub.label,
      icon: meta?.icon ?? 'mdi-account-circle-outline',
      color: meta?.color ?? '#888',
      tokenIn: 0,
      tokenOut: 0,
      costUsd: 0,
      sessionCount: 0,
    })
  }
  for (const s of cliSessionsModel.sessions.value) {
    const subId = s.model ? modelToSubId.get(s.model) : undefined
    const key = subId ?? '__unknown__'
    let b = buckets.get(key)
    if (!b) {
      b = {
        id: key,
        label: 'Прочее',
        icon: 'mdi-help-circle-outline',
        color: '#888',
        tokenIn: 0,
        tokenOut: 0,
        costUsd: 0,
        sessionCount: 0,
      }
      buckets.set(key, b)
    }
    b.tokenIn += s.tokenInTotal || 0
    b.tokenOut += s.tokenOutTotal || 0
    b.costUsd += s.costUsd || 0
    b.sessionCount += 1
  }
  // Drop empty buckets so the panel doesn't flood with zero rows for
  // subscriptions the user has never used. Sort by total tokens desc.
  return [...buckets.values()]
    .filter(b => b.sessionCount > 0 && (b.tokenIn + b.tokenOut > 0 || b.costUsd > 0))
    .sort((a, z) => (z.tokenIn + z.tokenOut) - (a.tokenIn + a.tokenOut))
})

// Project-scoped hierarchy for the in-chat session nav.
// Rules (tightened per user request):
//   1. Only sessions that are BOTH currently running AND actively working
//      (`isActive` — running AND not-long-idle) appear. Dormant sessions
//      are hidden so the bar shows "what is happening right now", not "what
//      has ever run".
//   2. Always scoped to the current chat's project. Even the composer no
//      longer gets a global view — it shows only its own project's tree, so
//      cross-project clutter doesn't leak in.
//   3. The currently open agent is always included even if it's briefly idle,
//      so switching into a conversation never shows an empty bar.
const projectScopedHierarchy = computed(() => {
  const projectId = activeAgentProjectId.value
  const activeAgentId = conversations.activeConversation.value?.peerUserId
  const byTier: MessengerCliSession[][] = [[], [], []]
  for (const s of cliSessionsModel.activeSessions.value) {
    if (projectId && s.agentProjectId !== projectId && s.agentId !== activeAgentId) continue
    const meta = getSessionKindMeta(s.kind, s.slug)
    const tier = Math.min(meta.tier, 2)
    byTier[tier]!.push(s)
  }
  // Also include the currently-focused agent's session even if it slipped out
  // of isActive (e.g. Claude paused briefly between turns) — missing the tab
  // of the chat you're looking at is jarring.
  const focused = activeAgentId
    ? cliSessionsModel.sessions.value.find(s => s.agentId === activeAgentId && s.status === 'running' && !s.archivedAt)
    : null
  if (focused && !byTier.some(t => t.some(s => s.slug === focused.slug))) {
    const tier = Math.min(getSessionKindMeta(focused.kind, focused.slug).tier, 2)
    byTier[tier]!.push(focused)
  }
  return byTier
})

const chatSessNavVisible = computed(() =>
  activeConversationAgent.value
  && projectScopedHierarchy.value.some(tier => tier.length > 0),
)

const chatWorkerGroups = computed(() => {
  const workers = projectScopedHierarchy.value[2] ?? []
  const groups = new Map<string, typeof workers>()
  for (const s of workers) {
    const key = s.kind || 'worker'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(s)
  }
  return [...groups.entries()].map(([kind, sessions]) => ({ kind, sessions }))
})

// Returns the correct dot class: pulsing only when this agent is actively replying.
function sessNavDotClass(sess: { status: string; agentId: string | null }) {
  if (sess.status !== 'running') return 'sess-nav__dot--done'
  const isActiveAgent = sess.agentId === conversations.activeConversation.value?.peerUserId
  if (isActiveAgent && awaitingAgentReply.value) return 'sess-nav__dot--active'
  return 'sess-nav__dot--running'
}

// Open the chat for a session-bound agent when its chip is clicked.
// If the session has no agent yet (still spinning up), surface a visible
// toast instead of a silent no-op — the dropdown previously felt broken.
async function onSessionChipClick(sess: { agentId: string | null }) {
  if (!sess.agentId) {
    modelSetError.value = 'У этой сессии ещё нет чата — агент инициализируется'
    setTimeout(() => { modelSetError.value = '' }, 3000)
    return
  }
  try { await conversations.openAgentConversation(sess.agentId) }
  catch (err) {
    console.warn('[chat] could not open agent conversation', err)
    modelSetError.value = 'Не удалось открыть чат сессии'
    setTimeout(() => { modelSetError.value = '' }, 3000)
  }
}

type MonitorSessionItem = {
  slug: string
  label: string
  kind: string
  icon: string
  color: string
  isActive: boolean
  isIdle: boolean
  tier: number
  model?: string
  lastTool?: string | null
  tokenIn?: number
  tokenOut?: number
  costUsd?: number
}
type MonitorGroup = {
  projectId: string | null
  projectLabel: string
  sessions: MonitorSessionItem[]
  isCurrent: boolean
}

// Sessions are grouped by project so the user sees "what is running in this
// project" first, then other projects collapsed. Sessions without a
// project_id land in a final "Без проекта" group.
const monitorSessionGroups = computed<MonitorGroup[]>(() => {
  const currentProjectId = activeAgentProjectId.value
  const groups = new Map<string, MonitorGroup>()

  function groupKey(pid: string | null): string {
    return pid ?? '__none__'
  }

  for (const s of cliSessionsModel.runningSessions.value) {
    const meta = getSessionKindMeta(s.kind, s.slug)
    const item: MonitorSessionItem = {
      slug: s.slug,
      label: s.agentDisplayName || s.slug,
      kind: s.kind,
      icon: meta.icon,
      color: meta.color,
      isActive: s.isActive,
      isIdle: s.isIdle,
      tier: Math.min(meta.tier, 2),
      model: s.model,
      lastTool: s.lastTool,
      tokenIn: s.tokenInTotal,
      tokenOut: s.tokenOutTotal,
      costUsd: s.costUsd,
    }
    const pid = s.agentProjectId ?? null
    const key = groupKey(pid)
    let g = groups.get(key)
    if (!g) {
      const project = pid ? projectsModel.projects.value.find(p => p.id === pid) : null
      g = {
        projectId: pid,
        projectLabel: project?.name ?? (pid ? pid : 'Без проекта'),
        sessions: [],
        isCurrent: pid !== null && pid === currentProjectId,
      }
      groups.set(key, g)
    }
    g.sessions.push(item)
  }

  for (const g of groups.values()) {
    g.sessions.sort((a, b) =>
      (a.tier - b.tier)
      || (Number(a.isIdle) - Number(b.isIdle))
      || a.label.localeCompare(b.label),
    )
  }

  return [...groups.values()].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
    if ((a.projectId === null) !== (b.projectId === null)) return a.projectId === null ? 1 : -1
    return a.projectLabel.localeCompare(b.projectLabel)
  })
})

// "Active" in the badge means: actively responding now (isActive). Sessions
// that are merely running (tmux alive) but idle don't count — the user
// repeatedly pointed out that "9 active" was misleading when nothing was
// actually working.
const monitorActiveTotalCount = computed(() =>
  monitorSessionGroups.value.reduce(
    (acc, g) => acc + g.sessions.filter(s => s.isActive).length,
    0,
  ),
)
const monitorActiveCurrentProjectCount = computed(() => {
  const cur = monitorSessionGroups.value.find(g => g.isCurrent)
  return cur ? cur.sessions.filter(s => s.isActive).length : 0
})

// Severity counters drive the bell badge color. They span ALL sessions
// (not project-scoped) — a crashed worker in some other project is still
// the user's attention sink, and we don't want it hiding behind the
// "active in current project" filter.
const monitorAwaitingCount = computed(() => {
  let n = 0
  for (const s of cliSessionsModel.sessions.value) {
    if (deriveLiveness(s).state === 'awaiting-user') n++
  }
  return n
})
const monitorCrashedCount = computed(() => {
  let n = 0
  for (const s of cliSessionsModel.sessions.value) {
    if (deriveLiveness(s).state === 'crashed') n++
  }
  return n
})

// Bell hover preview: top-3 sessions in the worst-current-severity bucket.
// Crashed wins over awaiting (matches badge colour). Awaiting sorts by
// longest idle first; crashed by most-recent failure. Empty array hides
// the menu in the header.
type MonitorBellPreview = {
  slug: string
  name: string
  hint: string
  state: 'awaiting' | 'crashed'
}
function fmtIdleHint(ms: number): string {
  if (ms < 60_000) return `${Math.floor(ms / 1000)} с`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} мин`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} ч`
  return `${Math.floor(ms / 86_400_000)} д`
}
const monitorBellPreview = computed<ReadonlyArray<MonitorBellPreview>>(() => {
  const sessions = cliSessionsModel.sessions.value
  if (monitorCrashedCount.value > 0) {
    return sessions
      .filter(s => deriveLiveness(s).state === 'crashed')
      .sort((a, b) => {
        const ta = a.finishedAt ? Date.parse(a.finishedAt) : 0
        const tb = b.finishedAt ? Date.parse(b.finishedAt) : 0
        return tb - ta
      })
      .slice(0, 3)
      .map(s => ({
        slug: s.slug,
        name: s.agentDisplayName || s.slug,
        hint: s.runError ? s.runError.slice(0, 60) : 'упала',
        state: 'crashed' as const,
      }))
  }
  if (monitorAwaitingCount.value > 0) {
    return sessions
      .filter(s => deriveLiveness(s).state === 'awaiting-user')
      .sort((a, b) => (b.idleForMs ?? 0) - (a.idleForMs ?? 0))
      .slice(0, 3)
      .map(s => ({
        slug: s.slug,
        name: s.agentDisplayName || s.slug,
        hint: s.idleForMs ? `ждёт ${fmtIdleHint(s.idleForMs)}` : 'ждёт ввода',
        state: 'awaiting' as const,
      }))
  }
  return []
})

// --- Thinking indicator ---------------------------------------------------
// Show a pulsing bubble after the user sends to an agent chat until the reply
// arrives. Bubble shows agent name + model name (mini-caption).
const awaitingAgentReply = ref(false)
const agentReplyAwaitSince = ref<number>(0)

const activeAgentSession = computed(() => {
  const conv = conversations.activeConversation.value
  if (!conv || conv.peerType !== 'agent') return null
  return cliSessionsModel.sessions.value.find(s => s.agentId === conv.peerUserId) ?? null
})

const activeAgentModelLabel = computed(() => {
  const sess = activeAgentSession.value
  if (sess?.model) return sess.model
  const conv = conversations.activeConversation.value as unknown as {
    peerType?: string
    peer?: { model?: string; settings?: { model?: string } }
  } | null
  return conv?.peer?.settings?.model || conv?.peer?.model || 'sonnet'
})

// Live reasoning stream for chat agent
const chatAgentIdRef = computed(() => conversations.activeConversation.value?.peerUserId || '')
const chatAgentStream = useMessengerAgentStream(chatAgentIdRef as any)
const { formatDuration: chatFormatDuration } = useReasoningGroups(chatAgentStream.toolUses as any)

const CHAT_SUBSTATE_LABELS: Record<string, string> = {
  thinking: 'Думает…',
  tool_call: 'Запускает инструменты…',
  awaiting_input: 'Ждёт ввод',
  streaming: 'Отвечает…',
  error: 'Ошибка',
}

const FILE_TOOLS = new Set(['Read', 'Write', 'Edit', 'NotebookEdit'])
const CMD_TOOLS = new Set(['Bash'])
const SEARCH_TOOLS = new Set(['Grep', 'Glob'])
const WEB_TOOLS = new Set(['WebFetch', 'WebSearch'])
const SUBAGENT_TOOLS = new Set(['Task', 'AskUserQuestion'])

function groupRunToolUses(toolUses: AgentToolUseEntry[]) {
  const files: AgentToolUseEntry[] = [], commands: AgentToolUseEntry[] = [], searches: AgentToolUseEntry[] = []
  const web: AgentToolUseEntry[] = [], subagents: AgentToolUseEntry[] = [], other: AgentToolUseEntry[] = []
  for (const t of toolUses) {
    if (FILE_TOOLS.has(t.tool)) files.push(t)
    else if (CMD_TOOLS.has(t.tool)) commands.push(t)
    else if (SEARCH_TOOLS.has(t.tool)) searches.push(t)
    else if (WEB_TOOLS.has(t.tool)) web.push(t)
    else if (SUBAGENT_TOOLS.has(t.tool)) subagents.push(t)
    else other.push(t)
  }
  const result = []
  if (files.length)     result.push({ key: 'files',     label: 'Файлы',      icon: '📁', entries: files })
  if (commands.length)  result.push({ key: 'commands',  label: 'Команды',    icon: '⚙️', entries: commands })
  if (searches.length)  result.push({ key: 'searches',  label: 'Поиск',      icon: '🔍', entries: searches })
  if (web.length)       result.push({ key: 'web',       label: 'Веб',        icon: '🌐', entries: web })
  if (subagents.length) result.push({ key: 'subagents', label: 'Суб-агенты', icon: '🤖', entries: subagents })
  if (other.length)     result.push({ key: 'other',     label: 'Прочее',     icon: '➤',  entries: other })
  return result
}

const chatRunExpanded = ref<Record<string, boolean>>({})
const chatGroupsExpanded = ref<Record<string, boolean>>({})
function isChatRunExpanded(runId: string) { return chatRunExpanded.value[runId] ?? true }
function toggleChatRun(runId: string) { chatRunExpanded.value = { ...chatRunExpanded.value, [runId]: !isChatRunExpanded(runId) } }
function isChatGroupExpanded(runId: string, key: string) { return chatGroupsExpanded.value[`${runId}:${key}`] ?? true }
function toggleChatGroup(runId: string, key: string) {
  const k = `${runId}:${key}`
  chatGroupsExpanded.value = { ...chatGroupsExpanded.value, [k]: !isChatGroupExpanded(runId, key) }
}

const chatRunsData = computed(() =>
  chatAgentStream.allRuns.value.map(run => {
    const s = run.state
    const isDone = s.status !== 'active'
    const duration = s.startedAt ? chatFormatDuration(Date.now() - s.startedAt) : ''
    const groups = groupRunToolUses(s.toolUses)
    const distinctFileCount = new Set(
      s.toolUses
        .map(t => (t.input as Record<string, unknown> | undefined)?.file_path)
        .filter((fp): fp is string => typeof fp === 'string' && fp.length > 0),
    ).size
    return {
      runId: run.runId,
      state: s,
      isDone,
      substateLabel: isDone ? 'Завершено' : (CHAT_SUBSTATE_LABELS[s.substate] ?? 'Работает…'),
      duration,
      groups,
      distinctFileCount,
    }
  }),
)

// When the agent stream goes idle: refresh sessions, reload messages so the
// committed reply appears in the thread, and always clear the thinking bubble
// (in case the run had no finalText / no conversationId and messages.updated
// never fired — without this the bubble hangs forever).
watch(chatAgentStream.substate, (next, prev) => {
  if (next === 'idle' && prev !== 'idle') {
    cliSessionsModel.refresh()
    void conversations.loadMessages()
    awaitingAgentReply.value = false
  }
})

// Clear awaitingAgentReply as soon as any run is tracked (stream confirmed active)
watch(() => chatAgentStream.allRuns.value.length, (len) => {
  if (len > 0) awaitingAgentReply.value = false
})

// Restore thinking bubble if there's an active run for current agent on
// conversation open / page reload (awaitingAgentReply is local state and
// would otherwise reset to false on reload).
const chatAgentsApi = useAgentsApi()
async function probeChatActiveRun() {
  const aid = chatAgentIdRef.value
  if (!aid) return
  try {
    const resp = await chatAgentsApi.getAgentActiveRun(aid)
    if (resp.run) {
      awaitingAgentReply.value = true
      agentReplyAwaitSince.value = new Date(resp.run.createdAt).getTime()
    }
  } catch {}
}
watch(chatAgentIdRef, async (newId) => {
  if (newId) await probeChatActiveRun()
}, { immediate: true })

// Clear when a new agent message arrives after our lastSentAt; also clean up
// completed runs whose final message has appeared in the thread.
watch(() => conversations.messages.value, (list) => {
  if (awaitingAgentReply.value) {
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i] as unknown as { own?: boolean; createdAt?: string }
      const ts = m?.createdAt ? new Date(m.createdAt).getTime() : 0
      if (m?.own === false && ts >= agentReplyAwaitSince.value - 500) {
        awaitingAgentReply.value = false
        break
      }
    }
  }
  for (const run of chatAgentStream.allRuns.value) {
    if (run.state.status !== 'active') {
      const hasMsg = list.some((m: unknown) => (m as Record<string, unknown>)?.runId === run.runId)
      if (hasMsg) chatAgentStream.cleanupRun(run.runId)
    }
  }
}, { deep: true })

const activeConversationSupportsSecuritySummary = computed(() => conversations.activeConversation.value?.peerType === 'user')
const canForwardFromActiveConversation = computed(() => activeConversationPolicy.value?.allowForwardOut !== false)
const allowMutualDelete = computed(() => Boolean(activeConversationPolicy.value?.allowMutualDelete))
const secretIntroStorageKey = computed(() => {
  if (!import.meta.client || !auth.user.value || !conversations.activeConversation.value || !activeConversationSecret.value) {
    return ''
  }

  return `daria-messenger-secret-intro:${auth.user.value.id}:${conversations.activeConversation.value.id}`
})
const hasOwnMessagesInActiveConversation = computed(() => conversations.messages.value.some(item => item.own && !item.deletedAt))
const showSecretIntro = computed(() => {
  const conversation = conversations.activeConversation.value
  if (!conversation || !activeConversationSecret.value || detailsOpen.value || photoFeedOpen.value) {
    return false
  }

  return !hasOwnMessagesInActiveConversation.value && !secretIntroSeen.value[conversation.id]
})

const sharedContent = computed(() => {
  const photos: SharedAssetItem[] = []
  const stickers: SharedAssetItem[] = []
  const documents: SharedAssetItem[] = []
  const links: SharedAssetItem[] = []

  for (const entry of conversations.messages.value) {
    if (entry.attachment) {
      const item: SharedAssetItem = {
        id: entry.id,
        title: resolveAttachmentTitle(entry.attachment),
        meta: `${entry.attachment.mimeType} · ${Math.ceil(entry.attachment.size / 1024)} KB`,
        href: entry.attachment.resolvedUrl,
        previewUrl: entry.attachment.mimeType.startsWith('image/') ? entry.attachment.resolvedUrl : undefined,
      }

      if (entry.attachment.mimeType.startsWith('image/')) {
        if (isStickerSharedAsset(entry)) {
          stickers.push(item)
        } else {
          photos.push(item)
        }
      } else {
        documents.push(item)
      }
    }

    for (const href of extractLinks(entry.body)) {
      links.push({
        id: `${entry.id}-${href}`,
        title: href.replace(/^https?:\/\//, ''),
        meta: 'Ссылка из переписки',
        href,
      })
    }
  }

  return {
    photos,
    stickers,
    documents,
    links,
  }
})

const securityItems = computed(() => {
  if (!securitySummary.value) {
    return []
  }

  return [
    {
      id: 'protocol',
      title: securitySummary.value.protocolLabel,
      meta: securitySummary.value.protocolMeta,
      state: 'Защищено',
      icon: 'shield' as const,
      tone: 'ok' as const,
    },
    {
      id: 'device-key',
      title: 'Ключ этого устройства',
      meta: securitySummary.value.deviceKeyMeta,
      state: securitySummary.value.deviceKeyReady ? 'Активен' : 'Ожидание',
      icon: 'device' as const,
      tone: securitySummary.value.deviceKeyReady ? 'ok' as const : 'neutral' as const,
    },
    {
      id: 'peer-device-key',
      title: 'Ключ устройства собеседника',
      meta: securitySummary.value.peerDeviceKeyMeta,
      state: securitySummary.value.peerDeviceKeyReady ? 'Найден' : 'Нет данных',
      icon: 'peer' as const,
      tone: securitySummary.value.peerDeviceKeyReady ? 'ok' as const : 'neutral' as const,
    },
    {
      id: 'conversation-key',
      title: 'Ключ этого чата',
      meta: securitySummary.value.conversationKeyMeta,
      state: securitySummary.value.conversationKeyReady ? 'Готов' : 'Ещё не создан',
      icon: 'key' as const,
      tone: securitySummary.value.conversationKeyReady ? 'ok' as const : 'neutral' as const,
    },
    ...(securitySummary.value.keyPackageCreatedAt
      ? [{
        id: 'key-package-time',
        title: 'Последний пакет ключа',
        meta: 'Время создания зашифрованного пакета ключа для этого чата.',
        state: new Date(securitySummary.value.keyPackageCreatedAt).toLocaleString('ru-RU'),
        icon: 'clock' as const,
        tone: 'neutral' as const,
      }]
      : []),
  ]
})

const securitySummaryText = computed(() => {
  if (securitySummaryPending.value) {
    return 'Проверяем состояние шифрования для этого чата.'
  }

  if (!securitySummary.value) {
    return 'Данные о шифровании появятся, когда чат будет готов к проверке.'
  }

  return 'Показаны только статусы и метаданные. Фактические ключи не выводятся и остаются только на устройствах пользователей.'
})
const sharedGallerySecurity = computed(() => {
  if (!activeConversationSupportsSecuritySummary.value) {
    return undefined
  }

  return {
    summary: securitySummaryText.value,
    items: securityItems.value,
    pending: securitySummaryPending.value,
    updatedAt: securitySummaryUpdatedAt.value,
  }
})

const chatLayoutStyle = computed(() => ({
  '--messenger-composer-height': `${composerHeight.value}px`,
  '--messenger-call-analysis-width': showDesktopCallAnalysisPanel.value ? 'min(32vw, 420px)' : '0px',
}))

const showDesktopCallAnalysisPanel = computed(() => Boolean(
  isDesktopCallAnalysisViewport()
  && calls.analysisPanelOpen.value
  && (
    (calls.activeCall.value && calls.activeCall.value.mode === 'audio' && calls.viewMode.value !== 'mini')
    || (!calls.activeCall.value && calls.callReview.value)
  )
))

const threadedMessages = computed<MessengerThreadMessage[]>(() => {
  const nodes = conversations.messages.value.map(message => ({
    ...message,
    comments: [] as MessengerThreadMessage[],
  }))
  const nodeById = new Map(nodes.map(node => [node.id, node]))
  const roots: MessengerThreadMessage[] = []

  for (const node of nodes) {
    const parentId = node.commentOn?.id
    const parent = parentId ? nodeById.get(parentId) : null

    if (parent && parent.id !== node.id) {
      parent.comments.push(node)
      continue
    }

    roots.push(node)
  }

  return roots
})

// Adjacent agent messages from the same agentId — with no own/user message
// in between and no comment-thread root in between — fold into a single
// "burst" bubble. Logic lives in `lib/burstGrouping.ts` so it's unit-testable
// without spinning up the whole component tree.

const filteredThreadedMessages = computed<MessengerThreadMessage[]>(() => {
  const groups: MessengerThreadMessage[] = []
  for (const msg of threadedMessages.value) {
    const head = groups.length > 0 ? groups[groups.length - 1] : null
    if (head && shouldFoldIntoBurst(head, msg)) {
      const burst = head.burst ? [...head.burst, msg] : [msg]
      groups[groups.length - 1] = { ...head, burst }
      continue
    }
    groups.push(msg)
  }
  return groups
})

// Stable v-for key. When older messages prepend via cursor pagination and
// fold into an existing burst, the head's `id` changes (the new oldest message
// becomes the head). Using rootRunId for agent bursts keeps Vue's :key stable
// across that re-coalescing, so the bubble's DOM is preserved and the user
// sees a smooth content patch instead of a tear-down + re-render flicker.
function entryGroupKey(entry: MessengerThreadMessage): string {
  if (entry.rootRunId && !entry.own) {
    return `root-${entry.rootRunId}`
  }
  return entry.id
}

// IDs of messages where runId changes between consecutive agent messages → divider before them
const runDividerSet = computed(() => {
  const dividers = new Set<string>()
  let prevRunId: string | undefined
  for (const msg of filteredThreadedMessages.value) {
    if (!msg.own && msg.runId) {
      if (prevRunId !== undefined && msg.runId !== prevRunId) dividers.add(msg.id)
      prevRunId = msg.runId
    }
  }
  return dividers
})

const composerRelationMessage = computed(() => {
  if (!composerRelationMessageId.value) {
    return null
  }

  return conversations.messages.value.find(item => item.id === composerRelationMessageId.value) ?? null
})

const forwardingMessage = computed(() => {
  if (!forwardingMessageId.value) {
    return null
  }

  return conversations.messages.value.find(item => item.id === forwardingMessageId.value) ?? null
})
const allForwardTargets = computed(() => {
  const targets = new Map<string, {
    peerUserId: string
    conversationId: string | null
    displayName: string
    login: string
    current: boolean
    selectable: boolean
  }>()

  for (const conversation of conversations.conversations.value.filter(item => !item.secret)) {
    targets.set(conversation.peerUserId, {
      peerUserId: conversation.peerUserId,
      conversationId: conversation.id,
      displayName: conversation.peerDisplayName,
      login: conversation.peerLogin,
      current: conversation.id === conversations.activeConversationId.value,
      selectable: true,
    })
  }

  for (const contact of contacts.overview.value.contacts) {
    const existing = targets.get(contact.id)
    targets.set(contact.id, {
      peerUserId: contact.id,
      conversationId: existing?.conversationId || null,
      displayName: contact.displayName,
      login: contact.login,
      current: existing?.current || false,
      selectable: true,
    })
  }

  for (const candidate of contacts.overview.value.discover) {
    if (targets.has(candidate.id)) {
      continue
    }

    targets.set(candidate.id, {
      peerUserId: candidate.id,
      conversationId: null,
      displayName: candidate.displayName,
      login: candidate.login,
      current: false,
      selectable: candidate.relationship === 'contact',
    })
  }

  return Array.from(targets.values())
    .sort((left, right) => Number(right.selectable) - Number(left.selectable) || left.displayName.localeCompare(right.displayName, 'ru'))
})

const availableForwardTargets = computed(() => {
  const normalizedSearch = forwardSearchDraft.value.trim().toLowerCase()
  return allForwardTargets.value
    .filter((target) => {
      if (!normalizedSearch) {
        return true
      }

      return target.displayName.toLowerCase().includes(normalizedSearch) || target.login.toLowerCase().includes(normalizedSearch)
    })
})
const selectedForwardTargets = computed(() => allForwardTargets.value.filter(target => selectedForwardPeerIds.value.includes(target.peerUserId)))
const forwardSubmitLabel = computed(() => {
  if (conversations.messagePending.value) {
    return 'Отправляем...'
  }

  return selectedForwardPeerIds.value.length ? `Отправить (${selectedForwardPeerIds.value.length})` : 'Выберите получателей'
})
const photoFeedOpen = computed(() => Boolean(galleryPhotoId.value && conversations.activeConversation.value))
const headerIncomingCall = computed(() => Boolean(
  calls.incomingCall.value
  && calls.incomingCall.value.conversationId === conversations.activeConversationId.value,
))
const headerActiveCall = computed(() => Boolean(
  calls.activeCall.value
  && calls.activeCall.value.conversationId === conversations.activeConversationId.value,
))
const headerCallVisible = computed(() => headerIncomingCall.value || headerActiveCall.value)
const headerCallMode = computed<'audio' | 'video' | null>(() => {
  if (headerIncomingCall.value) {
    return calls.incomingCall.value?.mode || null
  }

  if (headerActiveCall.value) {
    return calls.activeCall.value?.mode || null
  }

  return null
})
const headerAudioCall = computed(() => Boolean(
  headerActiveCall.value
  && headerCallMode.value === 'audio',
))
const headerCallBadge = computed(() => {
  if (!headerCallVisible.value) {
    return ''
  }

  if (headerIncomingCall.value) {
    return 'Входящий'
  }

  return headerCallMode.value === 'video' ? 'Видео' : 'Звонок'
})
const headerCallSecurityEmojis = computed(() => {
  if (!calls.security.value.active || !calls.security.value.verificationEmojis.length) {
    return ''
  }

  return calls.security.value.verificationEmojis.join(' ')
})
const headerCallSecurityLabel = computed(() => {
  if (!headerCallVisible.value) {
    return ''
  }

  if (headerCallSecurityEmojis.value) {
    return headerCallSecurityEmojis.value
  }

  return 'WebRTC'
})
const headerCallSecurityTitle = computed(() => {
  if (!headerCallVisible.value) {
    return ''
  }

  if (calls.security.value.active && headerCallSecurityEmojis.value) {
    return calls.security.value.status
  }

  return 'Звонок защищён штатным шифрованием WebRTC. Emoji-верификация появляется только для дополнительного E2EE.'
})
const headerAudioCallStatus = computed(() => {
  if (!headerAudioCall.value) {
    return ''
  }

  return calls.callStatusText.value || 'Аудиозвонок активен'
})
const canToggleAudioCall = computed(() => {
  if (activeConversationAgent.value) {
    return false
  }

  if (headerAudioCall.value) {
    return true
  }

  return Boolean(
    conversations.activeConversation.value
    && !conversations.messagePending.value
    && calls.supported.value
    && !calls.activeCall.value
    && !calls.requestingPermissions.value
  )
})
const canToggleVideo = computed(() => Boolean(
  !activeConversationAgent.value && (
    headerActiveCall.value
  || (
    conversations.activeConversation.value
    && !conversations.messagePending.value
    && calls.supported.value
    && !calls.requestingPermissions.value
  )),
))
const showCallViewModes = computed(() => Boolean(
  headerActiveCall.value
  && (headerCallMode.value === 'video' || calls.controls.value.videoEnabled),
))
const desktopDropEnabled = computed(() => Boolean(
  import.meta.client
  && !isMobileChatViewport()
  && conversations.activeConversation.value
  && !detailsOpen.value
  && !photoFeedOpen.value,
))
const desktopDropActive = computed(() => dragDropDepth.value > 0 && desktopDropEnabled.value)
const hasComposerText = computed(() => Boolean(draft.value.trim()))
const hasSelectedKlipyItem = computed(() => Boolean(selectedKlipyItem.value))
const hasStagedAttachments = computed(() => stagedAttachments.value.length > 0)
const hasComposerPayload = computed(() => hasComposerText.value || hasSelectedKlipyItem.value || hasStagedAttachments.value)
const composerPrimaryMode = computed<'record' | 'send' | 'stop-recording'>(() => {
  if (isRecording.value) {
    return 'stop-recording'
  }

  return hasComposerPayload.value ? 'send' : 'record'
})
const composerPrimaryDisabled = computed(() => {
  if (!conversations.activeConversation.value || conversations.messagePending.value || stagingPending.value) {
    return true
  }

  if (composerPrimaryMode.value === 'record') {
    return !canRecordAudio.value
  }

  return false
})
const composerMediaMenuVisible = computed(() => Boolean(
  composerMediaMenuOpen.value
  && conversations.activeConversation.value
  && !detailsOpen.value
  && !photoFeedOpen.value,
))
const chatOverlayOpen = computed(() => Boolean(
  conversations.activeConversation.value
  && (composerMediaMenuVisible.value || detailsOpen.value || photoFeedOpen.value),
))
const compactMobileHeaderMenuOpen = computed(() => Boolean(
  headerOverflowMenuOpen.value
  && conversations.activeConversation.value
  && isMobileChatViewport()
  && !detailsOpen.value
  && !composerMediaMenuVisible.value
  && !photoFeedOpen.value,
))
const activeKlipyKind = computed<'gif' | 'sticker' | null>(() => {
  if (composerMediaMenuTab.value === 'gif') {
    return 'gif'
  }

  if (composerMediaMenuTab.value === 'stickers') {
    return 'sticker'
  }

  return null
})
const activeKlipyAudience = computed<'mine' | 'shared'>(() => {
  if (composerMediaMenuTab.value === 'stickers') {
    return klipyAudienceMode.stickers
  }

  if (composerMediaMenuTab.value === 'gif') {
    return klipyAudienceMode.gif
  }

  return 'mine'
})
const sharedKlipyEnabled = computed(() => Boolean(
  conversations.activeConversation.value
  && !conversations.activeConversation.value.secret,
))
const currentKlipyCategories = computed(() => activeKlipyKind.value ? klipy.getCategories(activeKlipyKind.value) : [])
const showKlipyCategories = computed(() => !klipyQuery.value.trim() && currentKlipyCategories.value.length > 0)
const loopedKlipyCategories = computed(() => buildLoopedFeed(currentKlipyCategories.value))
const activeCatalogCategoryLabel = computed(() => {
  if (!selectedCatalogCategory.value) {
    return ''
  }

  return currentKlipyCategories.value.find(item => item.query === selectedCatalogCategory.value)?.category || selectedCatalogCategory.value
})
const klipySearchPlaceholder = computed(() => composerMediaMenuTab.value === 'stickers' ? 'Поиск стикеров KLIPY' : 'Поиск GIF KLIPY')
const klipyStatusText = computed(() => {
  if (!klipy.configured.value) {
    return 'KLIPY API не настроен.'
  }

  if (klipy.error.value) {
    return klipy.error.value
  }

  if (klipy.pending.value && !klipy.items.value.length && !currentKlipyRecentItems.value.length) {
    return 'Загружаем...'
  }

  if ((klipyQuery.value.trim() || selectedCatalogCategory.value) && !klipy.pending.value && !klipy.items.value.length) {
    return 'Ничего не найдено.'
  }

  return ''
})
function inferKlipyKindFromAttachment(attachment: NonNullable<MessengerConversationMessage['attachment']>) {
  if (attachment.klipy?.kind) {
    return attachment.klipy.kind
  }

  if (attachment.mimeType === 'image/webp' || attachment.mimeType === 'image/png') {
    return 'sticker' as const
  }

  if (attachment.mimeType === 'image/gif' || attachment.mimeType === 'video/mp4' || attachment.mimeType === 'video/webm') {
    return 'gif' as const
  }

  return null
}

function buildConversationKlipyItem(message: MessengerConversationMessage) {
  if (message.kind !== 'file' || !message.attachment || message.deletedAt) {
    return null
  }

  const inferredKind = inferKlipyKindFromAttachment(message.attachment)
  if (!inferredKind) {
    return null
  }

  const item: MessengerKlipyItem = message.attachment.klipy
    ? {
        ...message.attachment.klipy,
      }
    : {
        id: `conversation-${message.id}`,
        slug: message.attachment.name,
        kind: inferredKind,
        title: message.attachment.name.replace(/\.[^.]+$/u, '') || message.attachment.name,
        previewUrl: message.attachment.resolvedUrl,
        originalUrl: message.attachment.resolvedUrl,
        mimeType: message.attachment.mimeType,
      }

  return {
    item,
    own: message.own,
    createdAt: message.createdAt,
  }
}

const sharedKlipyItems = computed<Record<'gif' | 'sticker', MessengerKlipyItem[]>>(() => {
  const buckets = {
    gif: new Map<string, MessengerKlipyItem & { ownCount: number; peerCount: number; lastUsedAt: string }>(),
    sticker: new Map<string, MessengerKlipyItem & { ownCount: number; peerCount: number; lastUsedAt: string }>(),
  }

  for (const message of conversations.messages.value) {
    const resolved = buildConversationKlipyItem(message)
    if (!resolved) {
      continue
    }

    const bucket = buckets[resolved.item.kind]
    const existing = bucket.get(resolved.item.id)
    if (existing) {
      existing.lastUsedAt = resolved.createdAt > existing.lastUsedAt ? resolved.createdAt : existing.lastUsedAt
      if (resolved.own) {
        existing.ownCount += 1
      } else {
        existing.peerCount += 1
      }
      continue
    }

    bucket.set(resolved.item.id, {
      ...resolved.item,
      ownCount: resolved.own ? 1 : 0,
      peerCount: resolved.own ? 0 : 1,
      lastUsedAt: resolved.createdAt,
    })
  }

  return {
    gif: Array.from(buckets.gif.values())
      .sort((left, right) => {
        const leftShared = Number(left.ownCount > 0 && left.peerCount > 0)
        const rightShared = Number(right.ownCount > 0 && right.peerCount > 0)
        return rightShared - leftShared
          || right.peerCount - left.peerCount
          || (right.peerCount + right.ownCount) - (left.peerCount + left.ownCount)
          || right.lastUsedAt.localeCompare(left.lastUsedAt)
      })
      .slice(0, 12),
    sticker: Array.from(buckets.sticker.values())
      .sort((left, right) => {
        const leftShared = Number(left.ownCount > 0 && left.peerCount > 0)
        const rightShared = Number(right.ownCount > 0 && right.peerCount > 0)
        return rightShared - leftShared
          || right.peerCount - left.peerCount
          || (right.peerCount + right.ownCount) - (left.peerCount + left.ownCount)
          || right.lastUsedAt.localeCompare(left.lastUsedAt)
      })
      .slice(0, 12),
  }
})
const currentKlipyRecentItems = computed(() => {
  if (!activeKlipyKind.value) {
    return []
  }

  if (activeKlipyAudience.value === 'shared') {
    return sharedKlipyItems.value[activeKlipyKind.value]
  }

  return klipy.getRecentItems(activeKlipyKind.value)
})
const shouldUseRecentKlipyFallback = computed(() => {
  if (activeKlipyAudience.value !== 'mine') {
    return false
  }

  if (klipyQuery.value.trim() || selectedCatalogCategory.value) {
    return false
  }

  return !klipy.items.value.length && (klipy.pending.value || !klipy.hasMore.value)
})
const primaryKlipyItems = computed(() => {
  if (activeKlipyAudience.value === 'shared') {
    return currentKlipyRecentItems.value
  }

  if (shouldUseRecentKlipyFallback.value && currentKlipyRecentItems.value.length) {
    return currentKlipyRecentItems.value
  }

  return klipy.items.value
})
const canLoadMoreKlipyItems = computed(() => {
  return activeKlipyAudience.value === 'mine' && klipy.hasMore.value
})
const showKlipySearchState = computed(() => Boolean(klipyQuery.value.trim() || selectedCatalogCategory.value))

function formatKlipyCategoryTag(query: string) {
  const normalized = query
    .trim()
    .replace(/^#+/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()

  return normalized ? `#${normalized}` : '#klipy'
}

onMounted(async () => {
  lockPageScroll()
  await conversations.refresh()
  if (conversations.activeConversationId.value) {
    await conversations.loadMessages()
    await scrollMessagesToBottom('auto')
  }
  projectActions.setPeerLogin(conversations.activeConversation.value?.peerLogin || '')
})

onBeforeUnmount(() => {
  unlockPageScroll()
  if (klipySearchTimer) {
    clearTimeout(klipySearchTimer)
    klipySearchTimer = null
  }
  if (forwardSearchTimer) {
    clearTimeout(forwardSearchTimer)
    forwardSearchTimer = null
  }
  if (composerAlignTimer) {
    clearTimeout(composerAlignTimer)
    composerAlignTimer = null
  }
  composerResizeObserver?.disconnect()
  composerResizeObserver = null
})

watch(() => conversations.activeConversationId.value, async () => {
  resetAudio()
  detailsOpen.value = false
  resetKlipyAudienceMode()
  projectActions.closePanel()
  projectActions.setPeerLogin(conversations.activeConversation.value?.peerLogin || '')
  await scrollMessagesToBottom('auto')
})

watch(() => conversations.activeConversationId.value, () => {
  const conversation = conversations.activeConversation.value
  if (!import.meta.client || !conversation || !activeConversationSecret.value) {
    return
  }

  const storageKey = secretIntroStorageKey.value
  secretIntroSeen.value = {
    ...secretIntroSeen.value,
    [conversation.id]: storageKey ? localStorage.getItem(storageKey) === '1' : false,
  }
}, { immediate: true })

watch(hasOwnMessagesInActiveConversation, (hasOwnMessages) => {
  if (!hasOwnMessages || !activeConversationSecret.value || !conversations.activeConversation.value) {
    return
  }

  const storageKey = secretIntroStorageKey.value
  if (storageKey && import.meta.client) {
    localStorage.setItem(storageKey, '1')
  }

  secretIntroSeen.value = {
    ...secretIntroSeen.value,
    [conversations.activeConversation.value.id]: true,
  }
})

watch(() => detailsOpen.value, (opened) => {
  if (opened) {
    resetComposerInputHeight()
  }
})

watch([detailsOpen, () => conversations.activeConversation.value?.id], async ([opened]) => {
  if (!opened || !activeConversationSupportsSecuritySummary.value) {
    return
  }

  await refreshSecuritySummary()
})

watch(activeConversationSupportsSecuritySummary, (supported) => {
  if (supported) {
    return
  }

  securitySummary.value = null
  securitySummaryUpdatedAt.value = null
  securitySummaryPending.value = false
}, { immediate: true })

watch(() => conversations.activeConversationId.value, () => {
  editingMessageId.value = null
  editingDraft.value = ''
  activeMessageActionsId.value = null
  activeReactionOverlayId.value = null
})

watch(() => conversations.messages.value.length, async (currentLength, previousLength) => {
  if (!currentLength || detailsOpen.value || currentLength === previousLength) {
    return
  }

  if (pendingScrollMessageId.value) {
    const targetMessageId = pendingScrollMessageId.value
    pendingScrollMessageId.value = null
    const scrolled = await scrollMessageIntoView(targetMessageId, previousLength > 0 ? 'smooth' : 'auto')

    if (scrolled) {
      return
    }
  }

  await scrollMessagesToBottom(previousLength > 0 ? 'smooth' : 'auto')
})

watch(draft, () => {
  syncComposerInputHeight()
})

watch(chatOverlayOpen, (open) => {
  navigation.mediaSheetOpen.value = open
}, { immediate: true })

watch([detailsOpen, photoFeedOpen, () => conversations.activeConversationId.value], () => {
  composerMediaMenuOpen.value = false
})

watch([composerMediaMenuVisible, composerMediaMenuTab, klipyQuery, selectedCatalogCategory], () => {
  resetKlipyFeedPaging()
  scheduleKlipyCatalogLoad()
})

watch(loopedKlipyCategories, async () => {
  await nextTick()
  if (showKlipyCategories.value) {
    composerMediaMenuRef.value?.categoryRailEl?.removeAttribute('data-loop-ready')
    primeLoopedRailPosition(composerMediaMenuRef.value?.categoryRailEl ?? null)
  }
})

watch(primaryKlipyItems, async () => {
  await nextTick()
  composerMediaMenuRef.value?.feedEl?.removeAttribute('data-loop-ready')
  await ensureKlipyFeedScrollable()
})

watch(() => klipyQuery.value.trim(), (value) => {
  if (value && selectedCatalogCategory.value) {
    selectedCatalogCategory.value = ''
  }
})

watch(() => forwardingMessageId.value, async (messageId) => {
  if (!messageId) {
    forwardSearchDraft.value = ''
    selectedForwardPeerIds.value = []
    return
  }

  try {
    await contacts.refresh('')
  } catch {
    actionError.value = 'Не удалось загрузить список пользователей для пересылки.'
  }
})

watch(forwardSearchDraft, (value) => {
  if (!forwardingMessageId.value) {
    return
  }

  if (forwardSearchTimer) {
    clearTimeout(forwardSearchTimer)
    forwardSearchTimer = null
  }

  forwardSearchTimer = setTimeout(async () => {
    try {
      await contacts.refresh(value.trim())
    } catch {
      actionError.value = 'Не удалось обновить поиск пользователей.'
    } finally {
      forwardSearchTimer = null
    }
  }, 180)
})

watch(() => viewport.keyboardOpen.value, async (opened) => {
  if (!import.meta.client || !isMobileChatViewport()) {
    return
  }

  lockPageScroll()

  if (opened) {
    // Ждём завершения анимации клавиатуры (~350ms) прежде чем прокручивать к последнему
    // сообщению. Без задержки scroll срабатывает до финального размера контейнера.
    setTimeout(() => {
      void scrollMessagesToBottom('auto')
    }, 350)
  }
})

async function submit() {
  actionError.value = ''
  if (!draft.value.trim() && !stagedAttachments.value.length) {
    return
  }

  composerMediaMenuOpen.value = false

  // Сохраняем данные ДО очистки UI
  const text = draft.value
  const replyToMessageId = composerRelationMode.value === 'reply' ? composerRelationMessageId.value || undefined : undefined
  const commentOnMessageId = composerRelationMode.value === 'comment' ? composerRelationMessageId.value || undefined : undefined
  const commentTargetId = composerRelationMode.value === 'comment' ? composerRelationMessageId.value : null
  const stagedSnapshot = stagedAttachments.value.map(({ localId: _localId, previewObjectUrl: _preview, ...rest }) => rest)

  // Очищаем UI синхронно ДО async-вызова — клавиатура не успевает закрыться
  draft.value = ''
  clearStagedAttachments()
  activeMessageActionsId.value = null
  activeReactionOverlayId.value = null
  composerRelationMode.value = null
  composerRelationMessageId.value = null
  resetComposerInputHeight()
  composerInputEl.value?.focus({ preventScroll: true })

  try {
    await conversations.sendMessage(text, {
      replyToMessageId,
      commentOnMessageId,
      attachments: stagedSnapshot.length ? stagedSnapshot : undefined,
    })
    pendingScrollMessageId.value = commentTargetId
    viewport.scheduleViewportSync()
    // Show thinking indicator for agent chats until reply arrives.
    if (activeConversationAgent.value) {
      awaitingAgentReply.value = true
      agentReplyAwaitSince.value = Date.now()
    }
  } catch {
    draft.value = text
    actionError.value = 'Не удалось отправить сообщение.'
  }
}

function preserveComposerFocus(event: PointerEvent) {
  event.preventDefault()
  composerInputEl.value?.focus({ preventScroll: true })
}

function toggleComposerMediaMenu() {
  if (!conversations.activeConversation.value || conversations.messagePending.value) {
    return
  }

  composerMediaMenuOpen.value = !composerMediaMenuOpen.value

  if (composerMediaMenuOpen.value) {
    scheduleKlipyCatalogLoad()
  }
}

function openComposerMediaTab(tab: 'emoji' | 'stickers' | 'gif' | 'photo' | 'file') {
  const previousTab = composerMediaMenuTab.value

  if (tab !== 'emoji' && tab !== 'photo' && tab !== 'file' && previousTab === tab && sharedKlipyEnabled.value) {
    const scopeKey = tab === 'stickers' ? 'stickers' : 'gif'
    klipyAudienceMode[scopeKey] = klipyAudienceMode[scopeKey] === 'mine' ? 'shared' : 'mine'
    return
  }

  composerMediaMenuTab.value = tab

  if (tab === 'emoji' || tab === 'photo' || tab === 'file') {
    return
  }

  if (previousTab !== tab) {
    klipyQuery.value = ''
    selectedCatalogCategory.value = ''
    selectedKlipyItem.value = null
    klipy.reset()
    scheduleKlipyCatalogLoad()
  }
}

function selectCatalogCategory(query: string) {
  selectedCatalogCategory.value = selectedCatalogCategory.value === query ? '' : query
}

function selectKlipyItem(item: MessengerKlipyItem) {
  actionError.value = ''
  selectedKlipyItem.value = item
  composerMediaMenuOpen.value = false
}

function clearSelectedKlipyItem() {
  selectedKlipyItem.value = null
}

async function confirmSelectedKlipyItem() {
  if (!selectedKlipyItem.value) {
    return
  }

  await sendKlipyItem(selectedKlipyItem.value)
}

function klipyTileStyle(item: { width?: number; height?: number }) {
  return {
    '--klipy-aspect': activeKlipyKind.value === 'sticker' ? '1 / 1' : '4 / 5',
  }
}

function insertEmojiToDraft(emoji: string) {
  const input = composerInputEl.value

  if (!input) {
    draft.value = `${draft.value}${emoji}`
    composerMediaMenuOpen.value = false
    return
  }

  const selectionStart = input.selectionStart ?? draft.value.length
  const selectionEnd = input.selectionEnd ?? selectionStart
  draft.value = `${draft.value.slice(0, selectionStart)}${emoji}${draft.value.slice(selectionEnd)}`
  composerMediaMenuOpen.value = false

  void nextTick(() => {
    const nextCaret = selectionStart + emoji.length
    input.focus({ preventScroll: true })
    input.setSelectionRange(nextCaret, nextCaret)
    syncComposerInputHeight()
  })
}

function handleComposerPrimaryPointerDown(event: PointerEvent) {
  if (composerPrimaryMode.value !== 'send') {
    return
  }

  preserveComposerFocus(event)
}

async function handleComposerPrimaryAction() {
  composerMediaMenuOpen.value = false

  if (audioDraft.value) {
    await sendAudioDraft()
    return
  }

  if (composerPrimaryMode.value === 'send') {
    if (selectedKlipyItem.value) {
      await confirmSelectedKlipyItem()
      return
    }

    await submit()
    return
  }

  await toggleAudioRecording()
}

function clearComposerRelation() {
  composerRelationMode.value = null
  composerRelationMessageId.value = null
}

async function activateComposerRelation(mode: 'reply' | 'comment', messageId: string) {
  composerRelationMode.value = mode
  composerRelationMessageId.value = messageId
  forwardingMessageId.value = null
  activeMessageActionsId.value = null
  await nextTick()
  composerInputEl.value?.focus({ preventScroll: true })
  viewport.scheduleViewportSync()
}

function openForwardPicker(messageId: string) {
  if (!canForwardFromActiveConversation.value) {
    actionError.value = 'В secret-чате пересылка отключена.'
    return
  }

  forwardingMessageId.value = messageId
  forwardSearchDraft.value = ''
  selectedForwardPeerIds.value = []
  clearComposerRelation()
  activeMessageActionsId.value = null
}

function closeForwardPicker() {
  forwardingMessageId.value = null
  forwardSearchDraft.value = ''
  selectedForwardPeerIds.value = []
}

function toggleForwardTarget(peerUserId: string) {
  const target = availableForwardTargets.value.find(entry => entry.peerUserId === peerUserId)
  if (!target?.selectable) {
    return
  }

  selectedForwardPeerIds.value = selectedForwardPeerIds.value.includes(peerUserId)
    ? selectedForwardPeerIds.value.filter(id => id !== peerUserId)
    : [...selectedForwardPeerIds.value, peerUserId]
}

async function forwardMessage() {
  if (!forwardingMessageId.value) {
    return
  }

  if (!selectedForwardPeerIds.value.length) {
    actionError.value = 'Выберите хотя бы одного получателя.'
    return
  }

  actionError.value = ''

  try {
    for (const peerUserId of selectedForwardPeerIds.value) {
      const existingTarget = availableForwardTargets.value.find(target => target.peerUserId === peerUserId)
      const conversationId = existingTarget?.conversationId || await conversations.ensureDirectConversation(peerUserId)
      await conversations.forwardMessage(forwardingMessageId.value, conversationId, peerUserId)
    }

    closeForwardPicker()
  } catch {
    actionError.value = 'Не удалось переслать сообщение.'
  }
}

function openFilePicker(accept = '') {
  if (!mediaPickerInputEl.value) {
    return
  }

  mediaPickerInputEl.value.accept = accept
  mediaPickerInputEl.value.value = ''
  mediaPickerInputEl.value.click()
}

async function sendKlipyItem(item: MessengerKlipyItem) {
  if (!conversations.activeConversation.value || conversations.messagePending.value) {
    return
  }

  actionError.value = ''
  mediaUploadPending.value = true

  try {
    const mediaUrl = item.originalUrl || item.previewUrl
    const blob = /^https:\/\/static\.klipy\.com\//.test(mediaUrl)
      ? await klipyApi.getMedia(mediaUrl)
      : await fetch(mediaUrl, {
          headers: auth.token.value
            ? {
                Authorization: `Bearer ${auth.token.value}`,
              }
            : undefined,
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error('MEDIA_FETCH_FAILED')
          }

          return await response.blob()
        })
    const mimeType = item.mimeType || blob.type || 'application/octet-stream'
    const extension = mimeType.includes('webp')
      ? 'webp'
      : mimeType.includes('png')
        ? 'png'
        : mimeType.includes('mp4')
          ? 'mp4'
          : mimeType.includes('webm')
            ? 'webm'
            : mimeType.includes('gif')
              ? 'gif'
              : 'bin'
    const fileBaseName = (item.title || item.slug || item.id)
      .toLowerCase()
      .replace(/[^a-z0-9а-яё_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || `${item.kind}-${item.id}`
    const file = new File([blob], `${fileBaseName}.${extension}`, { type: mimeType })
    const klipyPayload: MessengerAttachmentKlipyPayload = {
      id: item.id,
      slug: item.slug,
      kind: item.kind,
      title: item.title,
      previewUrl: item.previewUrl,
      originalUrl: mediaUrl,
      mimeType,
      width: item.width,
      height: item.height,
    }

    await conversations.uploadAttachment(file, {
      klipy: klipyPayload,
    })
    composerMediaMenuOpen.value = false
    klipy.remember(item)
    klipy.reset()
    klipyQuery.value = ''
    selectedCatalogCategory.value = ''
    selectedKlipyItem.value = null
  } catch {
    actionError.value = 'Не удалось отправить медиа из KLIPY.'
  } finally {
    mediaUploadPending.value = false
  }
}

function handleRoleQuickAction(actionLabel: string) {
  if (actionLabel === 'Прикрепить фотоотчет' || actionLabel === 'Загрузить смету' || actionLabel === 'Поделиться файлом') {
    openFilePicker()
    return
  }

  draft.value = actionLabel
  nextTick(() => {
    composerInputEl.value?.focus()
    syncComposerInputHeight()
  })
}

function handleReplySuggestionClick(text: string) {
  draft.value = text
  nextTick(() => {
    composerInputEl.value?.focus()
    syncComposerInputHeight()
  })
}

// --- Quick-launch (start a fresh CLI session from a numbered-options prompt) ---
//
// Lifted state for the inline expandable launch panel. Only one panel can be
// open at a time across the entire thread; storing the message id here (and
// passing it down) keeps that invariant without per-bubble local state.

const expandedQuickLaunchMessageId = ref<string | null>(null)

const quickLaunchConversationSlug = computed<string | null>(() => {
  const conv = conversations.activeConversation.value
  return conv?.peerLogin ?? null
})

const quickLaunchAgentId = computed<string | null>(() => {
  const conv = conversations.activeConversation.value
  return conv?.peerType === 'agent' ? (conv.peerUserId ?? null) : null
})

function handleQuickLaunch(payload: { messageId: string; body: string }) {
  // Toggle off if the same bubble is already expanded — clicking the rocket
  // button twice should close the panel rather than re-open it.
  if (expandedQuickLaunchMessageId.value === payload.messageId) {
    expandedQuickLaunchMessageId.value = null
    return
  }
  expandedQuickLaunchMessageId.value = payload.messageId
}

function closeQuickLaunchPanel() {
  expandedQuickLaunchMessageId.value = null
}

function handleQuickLaunchLaunched(_payload: { slug: string }) {
  // Surface UI is now the persistent system bubble emitted by the backend —
  // no transient snackbar needed. We still kick a sessions refresh so the
  // monitor row appears immediately rather than waiting for the next SSE.
  cliSessionsModel.refresh().catch(() => {})
}

function handleOpenMonitorFromSystemBubble(_payload: { slug: string }) {
  navigation.openSection('monitor')
}

async function copyRunIdToClipboard(runId: string) {
  if (!runId) return
  await handleCopyText(runId, `Скопировано: run:${runId.slice(0, 8)}`)
}

async function handleCopyText(value: string, toast: string) {
  if (!value) return
  try {
    await copyText(value)
    copiedLabel.value = toast
    setTimeout(() => {
      if (copiedLabel.value === toast) {
        copiedLabel.value = ''
      }
    }, 1800)
  } catch {
    actionError.value = 'Не удалось скопировать в буфер.'
  }
}

function handleQuoteCode(code: string) {
  if (!code) return
  const trimmed = code.replace(/\s+$/, '')
  if (!trimmed) return
  // Pick a fence longer than the longest run of backticks inside the
  // quoted code so the delimiter is unambiguous when the composer text
  // is parsed back as markdown.
  const longestBacktickRun = (trimmed.match(/`+/g) ?? [])
    .reduce((max, run) => Math.max(max, run.length), 0)
  const fence = '`'.repeat(Math.max(3, longestBacktickRun + 1))
  const current = draft.value
  const sep = current && !current.endsWith('\n') ? '\n' : ''
  draft.value = `${current}${sep}${fence}\n${trimmed}\n${fence}\n`
  nextTick(() => {
    composerInputEl.value?.focus()
    syncComposerInputHeight()
  })
}

const workspaceOpenRunId = ref<string | null>(null)
function handleOpenRun(runId: string) {
  // Toggle off→on so re-clicking the same run still triggers the workspace watcher.
  workspaceOpenRunId.value = null
  nextTick(() => {
    workspaceOpenRunId.value = runId
    agentWorkspaceCollapsed.value = false
  })
}

async function handleProjectAction(actionId: ProjectActionId, payload?: ProjectActionExecutePayload) {
  actionError.value = ''
  const result = await projectActions.executeAction(actionId, payload)
  if (!result.success) {
    actionError.value = result.message
    return
  }

  projectActions.closePanel()

  copiedLabel.value = result.message
  setTimeout(() => {
    if (copiedLabel.value === result.message) {
      copiedLabel.value = ''
    }
  }, 2200)

  if (result.data?.triggerFilePicker) {
    openFilePicker()
  }

  if (result.data?.messageBody && typeof result.data.messageBody === 'string') {
    draft.value = result.data.messageBody
    nextTick(() => {
      composerInputEl.value?.focus()
      syncComposerInputHeight()
    })
  }
}

async function stageFiles(files: File[]) {
  if (!files.length) {
    return
  }

  stagingPending.value = true
  try {
    for (const file of files) {
      const staged = await conversations.stageAttachment(file)
      const previewObjectUrl = file.type.startsWith('image/') && import.meta.client
        ? URL.createObjectURL(file)
        : null
      stagedAttachments.value = [
        ...stagedAttachments.value,
        {
          ...staged,
          localId: `${Date.now()}-${stagedAttachments.value.length}-${file.name}`,
          previewObjectUrl,
        },
      ]
    }
  } finally {
    stagingPending.value = false
  }
}

function removeStagedAttachment(index: number) {
  const entry = stagedAttachments.value[index]
  if (entry?.previewObjectUrl && import.meta.client) {
    URL.revokeObjectURL(entry.previewObjectUrl)
  }
  stagedAttachments.value = stagedAttachments.value.filter((_, idx) => idx !== index)
}

function clearStagedAttachments() {
  if (import.meta.client) {
    for (const entry of stagedAttachments.value) {
      if (entry.previewObjectUrl) {
        URL.revokeObjectURL(entry.previewObjectUrl)
      }
    }
  }
  stagedAttachments.value = []
}

async function handleFileSelect(event: Event) {
  actionError.value = ''
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (!files.length) {
    return
  }

  try {
    await stageFiles(files)
  } catch {
    actionError.value = 'Не удалось загрузить файл.'
  } finally {
    input.accept = ''
    input.value = ''
  }
}

async function handlePasteFiles(files: File[]) {
  if (!files.length) return
  actionError.value = ''
  try {
    await stageFiles(files)
  } catch {
    actionError.value = 'Не удалось загрузить файл.'
  }
}

function eventHasFiles(event: DragEvent) {
  const types = event.dataTransfer?.types
  return Boolean(types && Array.from(types).includes('Files'))
}

async function uploadDroppedFiles(fileList: FileList | null) {
  if (!fileList?.length || !desktopDropEnabled.value) {
    return
  }

  actionError.value = ''
  dragDropPending.value = true

  try {
    await stageFiles(Array.from(fileList))
  } catch {
    actionError.value = 'Не удалось загрузить перетащенные файлы.'
  } finally {
    dragDropPending.value = false
  }
}

function handleDesktopDragEnter(event: DragEvent) {
  if (!desktopDropEnabled.value || !eventHasFiles(event)) {
    return
  }

  event.preventDefault()
  dragDropDepth.value += 1
}

function handleDesktopDragOver(event: DragEvent) {
  if (!desktopDropEnabled.value || !eventHasFiles(event)) {
    return
  }

  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

function handleDesktopDragLeave(event: DragEvent) {
  if (!eventHasFiles(event)) {
    return
  }

  event.preventDefault()
  const currentTarget = event.currentTarget as HTMLElement | null
  const nextTarget = event.relatedTarget
  if (currentTarget && nextTarget instanceof Node && currentTarget.contains(nextTarget)) {
    return
  }

  dragDropDepth.value = Math.max(0, dragDropDepth.value - 1)
}

async function handleDesktopDrop(event: DragEvent) {
  if (!desktopDropEnabled.value || !eventHasFiles(event)) {
    return
  }

  event.preventDefault()
  dragDropDepth.value = 0
  await uploadDroppedFiles(event.dataTransfer?.files || null)
}

type SharedGallerySection = 'photos' | 'stickers' | 'documents' | 'links' | 'keys'
const requestedGallerySection = ref<SharedGallerySection | null>(null)

const chatSearch = useChatSearch(conversations.messages)

watch(() => chatSearch.currentMessageId.value, async (id) => {
  if (!id) return
  const ok = await scrollMessageIntoView(id, 'smooth')
  if (!ok) return
  const el = messageListEl.value?.querySelector<HTMLElement>(`[data-message-id="${id}"]`)
  if (!el) return
  el.classList.remove('message-bubble--search-flash')
  void el.offsetWidth
  el.classList.add('message-bubble--search-flash')
  window.setTimeout(() => el.classList.remove('message-bubble--search-flash'), 1400)
})

watch(() => conversations.activeConversationId.value, () => {
  if (chatSearch.open.value) chatSearch.close()
})

function openChatSearch() {
  if (!conversations.activeConversation.value) return
  chatSearch.openSearch()
}

function toggleDetails() {
  if (!conversations.activeConversation.value) {
    return
  }

  galleryPhotoId.value = null
  requestedGallerySection.value = null
  detailsOpen.value = !detailsOpen.value
}

function openSharedGallery(section?: SharedGallerySection) {
  if (!conversations.activeConversation.value) {
    return
  }

  galleryPhotoId.value = null
  requestedGallerySection.value = section ?? null
  detailsOpen.value = true
}

function closeDetails() {
  galleryPhotoId.value = null
  requestedGallerySection.value = null
  detailsOpen.value = false
}

function openPhotoGallery(messageId: string) {
  galleryPhotoId.value = messageId
  detailsOpen.value = false
  activeMessageActionsId.value = null
  activeReactionOverlayId.value = null
}

function closePhotoFeed() {
  galleryPhotoId.value = null
}

async function refreshSecuritySummary() {
  const activeConversation = conversations.activeConversation.value
  if (!activeConversation || !auth.user.value || !activeConversationSupportsSecuritySummary.value) {
    securitySummary.value = null
    securitySummaryUpdatedAt.value = null
    securitySummaryPending.value = false
    return
  }

  securitySummaryPending.value = true

  try {
    securitySummary.value = await messengerCrypto.getConversationSecuritySummary(
      auth.user.value.id,
      activeConversation.id,
      activeConversation.peerUserId,
    )
    securitySummaryUpdatedAt.value = new Date().toISOString()
  } catch {
    securitySummary.value = {
      protocolLabel: 'E2EE недоступно',
      protocolMeta: 'Не удалось получить статус ключей для этого чата.',
      deviceKeyReady: false,
      deviceKeyMeta: 'Проверка ключа устройства не удалась.',
      peerDeviceKeyReady: false,
      peerDeviceKeyMeta: 'Не удалось проверить ключ собеседника.',
      conversationKeyReady: false,
      conversationKeyMeta: 'Не удалось проверить ключ этого чата.',
    }
    securitySummaryUpdatedAt.value = new Date().toISOString()
  } finally {
    securitySummaryPending.value = false
  }
}

function updateComposerHeight() {
  const nextHeight = composerBarEl.value?.offsetHeight ?? 76
  composerHeight.value = nextHeight
}

function syncComposerInputHeight() {
  if (!import.meta.client) {
    return
  }

  const input = composerInputEl.value
  if (!input) {
    return
  }

  const maxHeight = window.matchMedia('(max-width: 767px)').matches ? 104 : 144

  input.style.height = '0px'
  const nextHeight = Math.min(Math.max(input.scrollHeight, 48), maxHeight)
  input.style.height = `${nextHeight}px`
  input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden'
  updateComposerHeight()
}

function resetComposerInputHeight() {
  const input = composerInputEl.value
  if (!input) {
    return
  }

  input.style.height = '48px'
  input.style.overflowY = 'hidden'
  updateComposerHeight()
}

function scheduleComposerMetricsSync() {
  if (!import.meta.client) {
    return
  }

  const syncComposer = async () => {
    await nextTick()
    syncComposerInputHeight()
  }

  void syncComposer()

  if (composerAlignTimer) {
    clearTimeout(composerAlignTimer)
  }

  composerAlignTimer = setTimeout(() => {
    void syncComposer()
    composerAlignTimer = null
  }, 260)
}

function expandComposer() {
  viewport.scheduleViewportSync()
  scheduleComposerMetricsSync()
}

function collapseComposer() {
  setTimeout(() => {
    viewport.scheduleViewportSync()
    if (!draft.value.trim()) {
      resetComposerInputHeight()
      return
    }

    syncComposerInputHeight()
  }, 40)
}

async function scrollMessagesToBottom(behavior: ScrollBehavior) {
  await nextTick()
  const list = messageListEl.value
  if (!list) {
    return
  }

  list.scrollTo({
    top: list.scrollHeight,
    behavior,
  })
}

async function scrollMessageIntoView(messageId: string, behavior: ScrollBehavior) {
  await nextTick()
  const list = messageListEl.value
  const target = list?.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`)

  if (!list || !target) {
    return false
  }

  target.scrollIntoView({
    block: 'nearest',
    behavior,
  })

  return true
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = value
  textArea.setAttribute('readonly', 'true')
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  textArea.style.pointerEvents = 'none'
  document.body.appendChild(textArea)
  textArea.select()
  textArea.setSelectionRange(0, value.length)

  try {
    if (!document.execCommand('copy')) {
      throw new Error('COPY_FAILED')
    }
  } finally {
    document.body.removeChild(textArea)
  }
}

async function copyLink(href: string, label: string) {
  actionError.value = ''

  try {
    if (href.startsWith('blob:')) {
      const link = document.createElement('a')
      link.href = href
      link.download = label
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      copiedLabel.value = `Файл подготовлен: ${label}`
      setTimeout(() => {
        if (copiedLabel.value === `Файл подготовлен: ${label}`) {
          copiedLabel.value = ''
        }
      }, 2200)
      return
    }

    await copyText(href)
    copiedLabel.value = `Ссылка скопирована: ${label}`
    setTimeout(() => {
      if (copiedLabel.value === `Ссылка скопирована: ${label}`) {
        copiedLabel.value = ''
      }
    }, 2200)
  } catch {
    actionError.value = 'Не удалось скопировать ссылку.'
  }
}

async function startCall(mode: 'audio' | 'video') {
  actionError.value = ''
  calls.clearError()

  if (activeConversationAgent.value) {
    actionError.value = 'Для AI-агентов звонки недоступны.'
    return
  }

  await calls.refreshMediaPermissions()

  try {
    await calls.startOutgoingCall(mode)
  } catch {
    actionError.value = mode === 'video' ? 'Не удалось начать видеозвонок.' : 'Не удалось начать аудиозвонок.'
  }
}

async function toggleAudioCall() {
  actionError.value = ''

  if (headerAudioCall.value) {
    await calls.hangupCall()
    return
  }

  await startCall('audio')
}

function toggleCallAnalysis() {
  calls.toggleAnalysisPanel()
}

function toggleCallTranscription() {
  if (calls.transcriptionActive.value) {
    calls.stopTranscription()
    return
  }

  // Открываем панель и запускаем транскрипцию явно
  calls.toggleAnalysisPanel(true)
  calls.startTranscription()
}

function startEditingMessage(messageId: string, body: string) {
  activeMessageActionsId.value = null
  activeReactionOverlayId.value = null
  editingMessageId.value = messageId
  editingDraft.value = body
}

function cancelEditingMessage() {
  editingMessageId.value = null
  editingDraft.value = ''
}

async function saveEditedMessage() {
  if (!editingMessageId.value || !editingDraft.value.trim()) {
    cancelEditingMessage()
    return
  }

  actionError.value = ''

  try {
    await conversations.editMessage(editingMessageId.value, editingDraft.value)
    cancelEditingMessage()
  } catch {
    actionError.value = 'Не удалось изменить сообщение.'
  }
}

async function removeMessage(messageId: string) {
  actionError.value = ''

  try {
    activeMessageActionsId.value = null
    activeReactionOverlayId.value = null
    await conversations.deleteMessage(messageId)
    if (editingMessageId.value === messageId) {
      cancelEditingMessage()
    }
  } catch {
    actionError.value = 'Не удалось удалить сообщение.'
  }
}

async function reactToMessage(messageId: string, emoji: string) {
  actionError.value = ''

  try {
    await conversations.toggleReaction(messageId, emoji)
    activeMessageActionsId.value = null
    activeReactionOverlayId.value = null
  } catch {
    actionError.value = 'Не удалось обновить реакцию.'
  }
}

function toggleReactionOverlay(messageId: string) {
  const nextMessageId = activeMessageActionsId.value === messageId && activeReactionOverlayId.value === messageId
    ? null
    : messageId
  activeMessageActionsId.value = nextMessageId
  activeReactionOverlayId.value = nextMessageId
}

async function handleEditKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    cancelEditingMessage()
    return
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    await saveEditedMessage()
  }
}

function toggleMessageActions(messageId: string, event?: MouseEvent) {
  if (event) {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    if (target.closest('button, textarea, audio, img, input, [data-message-action-menu="true"], [data-message-reaction-menu="true"]')) {
      return
    }
  }

  const nextMessageId = activeMessageActionsId.value === messageId && activeReactionOverlayId.value === messageId
    ? null
    : messageId
  activeMessageActionsId.value = nextMessageId
  activeReactionOverlayId.value = nextMessageId
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (projectActions.panelOpen.value && event.target instanceof Node) {
    const projectActionsRoot = composerDockRef.value?.projectActionsRootEl
    const overlayTarget = event.target instanceof Element
      && Boolean(event.target.closest('.v-overlay__content, [role="listbox"]'))

    if (projectActionsRoot && !projectActionsRoot.contains(event.target) && !overlayTarget) {
      projectActions.closePanel()
    }
  }

  if (event.target instanceof Element && event.target.closest('[data-message-action-root="true"]')) {
    return
  }

  activeMessageActionsId.value = null
  activeReactionOverlayId.value = null
}

function handleChatAreaPointerDown() {
  if (composerMediaMenuVisible.value) {
    composerMediaMenuOpen.value = false
  }

  if (activeConversationAgent.value && conversations.activeConversation.value && !detailsOpen.value) {
    agentWorkspaceCollapsed.value = true
  }
}

async function handleRunStarted() {
  actionError.value = ''
  if (!draft.value.trim() || !conversations.activeConversation.value) {
    return
  }

  const text = draft.value
  const agentId = conversations.activeConversation.value.peerUserId

  composerMediaMenuOpen.value = false
  draft.value = ''
  activeMessageActionsId.value = null
  activeReactionOverlayId.value = null
  composerRelationMode.value = null
  composerRelationMessageId.value = null
  resetComposerInputHeight()
  composerInputEl.value?.focus({ preventScroll: true })

  try {
    const response = await $fetch<{ runId: string; rootRunId: string }>(`/agents/${agentId}/runs`, {
      method: 'POST',
      body: {
        prompt: text,
        attachmentIds: [],
      },
    })
    viewport.scheduleViewportSync()
  } catch {
    draft.value = text
    actionError.value = 'Не удалось запустить прогон.'
  }
}

watch(() => conversations.activeConversationId.value, () => {
  agentWorkspaceCollapsed.value = activeConversationAgent.value ? isMobileChatViewport() : false
}, { immediate: true })

watch(() => activeConversationAgent.value, (value) => {
  if (!value) {
    agentWorkspaceCollapsed.value = false
    return
  }

  if (conversations.activeConversation.value) {
    agentWorkspaceCollapsed.value = isMobileChatViewport()
  }

  void cliSessionsModel.refresh()
}, { immediate: true })

// Trigger a session refresh once auth becomes ready (token may not be
// available at setup time, so the immediate watcher above can silently 401).
// { immediate: true } covers the case where auth is already ready on mount.
watch(auth.ready, (ready) => {
  if (ready && activeConversationAgent.value) void cliSessionsModel.refresh()
}, { immediate: true })

// Open the SSE live-delta stream once auth is ready. The stream replaces the
// old 20s polling timer — deltas fire on every session create/event/stop so
// the hierarchy bar reflects reality within a few hundred ms. Poll kept as a
// 60s safety net in case SSE is blocked by a proxy.
let cliSessionsPollTimer: ReturnType<typeof setInterval> | null = null
watch(auth.ready, (ready) => {
  if (!ready) return
  cliSessionsModel.connectStream()
  if (!cliSessionsPollTimer) {
    cliSessionsPollTimer = setInterval(() => { void cliSessionsModel.refresh() }, 60_000)
  }
  // Start the 1s elapsed-timer tick once auth is ready (avoids ticking during
  // SSR / before we'd ever show session capsules).
  if (!nowTickTimer) {
    nowTickTimer = setInterval(() => { nowTick.value = Date.now() }, 1000)
  }
}, { immediate: true })

onUnmounted(() => {
  cliSessionsModel.disconnectStream()
  if (cliSessionsPollTimer) { clearInterval(cliSessionsPollTimer); cliSessionsPollTimer = null }
  if (nowTickTimer) { clearInterval(nowTickTimer); nowTickTimer = null }
})

// --- Session trace panel (click session in dropdown to expand) ---
const traceModel = useMessengerSessionTrace()
const expandedTraceSlug = ref<string | null>(null)

// Current expanded session + who spawned it (parent chain). Drives the trace
// header so "которая какую инициировала" is visible — operator sees the
// parent agent → this agent relationship at a glance, not just a flat event
// list.
const expandedTraceSession = computed<MessengerCliSession | null>(() => {
  const slug = expandedTraceSlug.value
  if (!slug) return null
  return cliSessionsModel.sessions.value.find(s => s.slug === slug) ?? null
})
const expandedTraceParent = computed<MessengerCliSession | null>(() => {
  const cur = expandedTraceSession.value
  if (!cur?.parentAgentId) return null
  return cliSessionsModel.sessions.value.find(s => s.agentId === cur.parentAgentId) ?? null
})
const expandedTraceChildren = computed<MessengerCliSession[]>(() => {
  const cur = expandedTraceSession.value
  if (!cur?.agentId) return []
  return cliSessionsModel.sessions.value.filter(s => s.parentAgentId === cur.agentId)
})
async function toggleSessionTrace(slug: string) {
  if (expandedTraceSlug.value === slug) {
    expandedTraceSlug.value = null
    traceModel.reset()
    return
  }
  expandedTraceSlug.value = slug
  await traceModel.load(slug)
}
watch(() => cliSessionsModel.lastDeltaAt.value, () => {
  // Refresh the open trace panel when a new event lands for its slug.
  const slug = expandedTraceSlug.value
  if (slug) void traceModel.load(slug)
})

function relationTitle(mode: 'reply' | 'comment' | null) {
  if (mode === 'reply') {
    return 'Ответ'
  }

  if (mode === 'comment') {
    return 'Комментарий'
  }

  return ''
}

function relationPreviewText(message: { body: string; kind: 'text' | 'file'; attachment?: { name: string, mimeType?: string } } | null) {
  if (!message) {
    return ''
  }

  if (message.kind === 'file') {
    if (message.attachment?.mimeType?.startsWith('audio/')) {
      return 'Аудиосообщение'
    }

    return message.attachment?.name || 'Файл'
  }

  return message.body
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)

  nextTick(() => {
    resetComposerInputHeight()

    if (composerBarEl.value && typeof ResizeObserver !== 'undefined') {
      composerResizeObserver = new ResizeObserver(() => {
        updateComposerHeight()
      })
      composerResizeObserver.observe(composerBarEl.value)
    }
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  if (cliSessionsPollTimer) {
    clearInterval(cliSessionsPollTimer)
    cliSessionsPollTimer = null
  }
})
</script>

<template>
  <section class="chat-screen" aria-label="Chat section">
    <section
      class="section-block section-block--chat"
      :class="{
        'section-block--chat-empty': !conversations.activeConversation.value,
        'section-block--chat-details-open': detailsOpen && conversations.activeConversation.value,
        'section-block--chat-call-header-visible': headerCallVisible,
        'section-block--chat-call-analysis-open': calls.analysisPanelOpen.value,
        'section-block--chat-photo-open': photoFeedOpen,
        'section-block--chat-drop-active': desktopDropActive,
        'section-block--chat-drop-pending': dragDropPending,
      }"
      :style="chatLayoutStyle"
      @dragenter="handleDesktopDragEnter"
      @dragover="handleDesktopDragOver"
      @dragleave="handleDesktopDragLeave"
      @drop="handleDesktopDrop"
    >
      <MessengerChatHeader
        :peer-avatar="activePeerAvatar"
        :peer-name="activePeerName"
        :disabled="!conversations.activeConversation.value"
        :conversation-secret="activeConversationSecret"
        :call-visible="headerCallVisible"
        :incoming-call="headerIncomingCall"
        :audio-call="headerAudioCall"
        :call-mode="headerCallMode"
        :call-badge="headerCallBadge"
        :call-security-emojis="headerCallSecurityEmojis"
        :call-security-label="headerCallSecurityLabel"
        :call-security-title="headerCallSecurityTitle"
        :can-toggle-audio-call="canToggleAudioCall"
        :show-call-analysis="Boolean(calls.activeCall.value?.mode === 'audio' || calls.callReview.value)"
        :call-analysis-active="calls.analysisPanelOpen.value"
        :transcription-active="calls.transcriptionActive.value"
        :can-toggle-transcription="calls.transcriptionSupported.value"
        :can-toggle-video="canToggleVideo"
        :video-call-disabled="activeConversationAgent || !conversations.activeConversation.value || conversations.messagePending.value || !calls.supported.value || !!calls.activeCall.value || calls.requestingPermissions.value"
        :microphone-enabled="calls.controls.value.microphoneEnabled"
        :speaker-enabled="calls.controls.value.speakerEnabled"
        :video-enabled="calls.controls.value.videoEnabled"
        :call-view-mode="calls.viewMode.value"
        :show-call-view-modes="showCallViewModes"
        :show-call-actions="Boolean(conversations.activeConversation.value) && !activeConversationAgent"
        :can-switch-camera="calls.canSwitchCamera.value"
        :show-agent-extras="activeConversationAgent"
        :agent-model-options="MODEL_OPTIONS"
        :agent-model-current-value="currentModelValue"
        :agent-model-icon="currentModelMeta?.icon"
        :agent-model-color="currentModelMeta?.color"
        :agent-model-label="currentModelMeta?.label"
        :agent-model-pending="modelSetPending"
        :agent-effort-value="currentSessionEffort"
        :agent-effort-pending="effortSetPending"
        :agent-subscription-label="currentSubscriptionLabel"
        :agent-session-usage="activeSessionUsage"
        :agent-subscription-usages="subscriptionUsages"
        :monitor-session-count="monitorActiveCurrentProjectCount || monitorActiveTotalCount"
        :monitor-awaiting-count="monitorAwaitingCount"
        :monitor-crashed-count="monitorCrashedCount"
        :monitor-bell-preview="monitorBellPreview"
        :gallery-photos="sharedContent.photos"
        :gallery-stickers="sharedContent.stickers"
        :gallery-documents="sharedContent.documents"
        :gallery-links="sharedContent.links"
        @toggle-details="toggleDetails"
        @open-shared-gallery="openSharedGallery"
        @open-chat-search="openChatSearch"
        @toggle-audio-call="toggleAudioCall"
        @toggle-call-analysis="toggleCallAnalysis"
        @toggle-transcription="toggleCallTranscription"
        @start-video-call="startCall('video')"
        @reject-call="calls.rejectIncomingCall()"
        @accept-call="calls.acceptIncomingCall()"
        @toggle-microphone="calls.toggleMicrophone()"
        @toggle-speaker="calls.toggleSpeaker()"
        @toggle-video="calls.toggleVideo()"
        @switch-camera="calls.switchCamera()"
        @set-call-view-mode="calls.setCallViewMode($event)"
        @hangup-call="calls.hangupCall()"
        @back="navigation.openSection('chats')"
        @update:overflow-menu-open="headerOverflowMenuOpen = $event"
        @select-agent-model="onModelSelect($event)"
        @select-agent-effort="onEffortSelect($event)"
        @pointerdown="handleChatAreaPointerDown"
      />

      <!-- Model selector moved to MessengerChatHeader round button -->
      <div v-if="modelSetError" class="agent-model-bar agent-model-bar--error-only">
        <span class="agent-model-bar__error">{{ modelSetError }}</span>
      </div>

      <!-- Context window + cache metrics bar — agent conversations only -->
      <div v-if="activeConversationAgent && chatAgentStream.tokenCount.value.total > 0" class="ctx-bar">
        <div class="ctx-bar__track">
          <div class="ctx-bar__fill" :style="{ width: chatAgentStream.tokenCount.value.contextPct + '%' }" />
        </div>
        <span class="ctx-bar__pct">{{ chatAgentStream.tokenCount.value.contextPct }}%</span>
        <span class="ctx-bar__tokens">{{ Math.round(chatAgentStream.tokenCount.value.total / 1000) }}k / 200k</span>
        <template v-if="chatAgentStream.tokenCount.value.cacheRead > 0">
          <span class="ctx-bar__sep">·</span>
          <span class="ctx-bar__cache ctx-bar__cache--read" title="Прочитано из кеша">⚡ {{ Math.round(chatAgentStream.tokenCount.value.cacheRead / 1000) }}k</span>
        </template>
        <template v-if="chatAgentStream.tokenCount.value.cacheWrite > 0">
          <span class="ctx-bar__sep">·</span>
          <span class="ctx-bar__cache ctx-bar__cache--write" title="Записано в кеш">✦ {{ Math.round(chatAgentStream.tokenCount.value.cacheWrite / 1000) }}k</span>
        </template>
        <template v-if="chatAgentStream.costUsd.value > 0">
          <span class="ctx-bar__sep">·</span>
          <span class="ctx-bar__cost">${{ chatAgentStream.costUsd.value.toFixed(3) }}</span>
        </template>
      </div>

      <!-- Session hierarchy bar — drops from the chat header monitor button -->
      <div v-if="chatSessNavVisible && !sessNavCollapsed" class="sess-nav sess-nav--header-drop">
        <div class="sess-nav__summary-row">
          <VIcon size="11" class="sess-nav__header-icon">mdi-layers-outline</VIcon>
          <span class="sess-nav__title">
            Sessions
            <span class="sess-nav__count">{{ sessionTokenSummary.sessionCount }}</span>
          </span>
          <span v-if="sessionTokenSummary.hasComposer" class="sess-nav__summary sess-nav__summary--composer" title="Токены композитора">
            <VIcon size="11">mdi-brain</VIcon>
            {{ formatTokens(sessionTokenSummary.composerTotal) }}
          </span>
          <span v-if="sessionTokenSummary.total > 0" class="sess-nav__summary sess-nav__summary--total" title="Суммарно по всем сессиям в проекте">
            Σ {{ formatTokens(sessionTokenSummary.total) }}
          </span>
          <span v-if="sessionTokenSummary.totalCost > 0" class="sess-nav__summary sess-nav__summary--cost" title="Стоимость">
            ${{ sessionTokenSummary.totalCost.toFixed(2) }}
          </span>
        </div>
        <template v-if="true">
         <div ref="sessNavBodyRef" class="sess-nav__body">
          <svg
            v-if="sessNavEdges.length"
            class="sess-nav__edges"
            :viewBox="`0 0 ${sessNavBodySize.w} ${sessNavBodySize.h}`"
            :style="`width: ${sessNavBodySize.w}px; height: ${sessNavBodySize.h}px;`"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              v-for="e in sessNavEdges"
              :key="e.id"
              :d="e.d"
              :stroke="e.color"
              stroke-width="1.5"
              stroke-linecap="round"
              fill="none"
            />
          </svg>
          <div v-if="projectScopedHierarchy[0]?.length" class="sess-nav__row sess-nav__row--composers">
            <span class="sess-nav__label">Composers</span>
            <div
              v-for="session in projectScopedHierarchy[0]"
              :key="session.slug"
              :ref="(el) => registerSessTab(session.slug, el)"
              class="sess-nav__tab"
              :class="{ 'sess-nav__tab--running': session.status === 'running', 'sess-nav__tab--active': sessNavDotClass(session) === 'sess-nav__dot--active' }"
              :title="session.slug"
              :role="session.agentId ? 'button' : undefined"
              :tabindex="session.agentId ? 0 : undefined"
              :style="session.agentId ? 'cursor: pointer;' : undefined"
              @click="onSessionChipClick(session)"
            >
              <span
                class="sess-nav__dot"
                :class="sessNavDotClass(session)"
              />
              <VIcon size="12" class="sess-nav__kind-icon">{{ getSessionKindMeta(session.kind).icon }}</VIcon>
              <span class="sess-nav__name">{{ session.agentDisplayName || session.slug }}</span>
              <span v-if="session.workroom" class="sess-nav__wr">{{ session.workroom }}</span>
              <span class="sess-nav__meta" :title="'Запущено ' + formatClock(session.created)">
                <VIcon size="10">mdi-clock-outline</VIcon>
                <span class="sess-nav__meta-clock">{{ formatClock(session.created) }}</span>
                <span class="sess-nav__meta-elapsed">· {{ formatElapsed(session.created) }}</span>
              </span>
              <span v-if="session.tokenInTotal + session.tokenOutTotal > 0" class="sess-nav__tokens" title="Токены сессии">↓{{ formatTokens(session.tokenInTotal) }} ↑{{ formatTokens(session.tokenOutTotal) }}</span>
              <button
                class="sess-nav__trace-btn"
                :class="{ 'sess-nav__trace-btn--active': expandedTraceSlug === session.slug }"
                type="button"
                :title="expandedTraceSlug === session.slug ? 'Скрыть трассу' : 'Показать трассу'"
                @click.stop="toggleSessionTrace(session.slug)"
              >
                <VIcon size="12">{{ expandedTraceSlug === session.slug ? 'mdi-chevron-up-box-outline' : 'mdi-chart-timeline-variant' }}</VIcon>
              </button>
              <button
                class="sess-nav__stop-btn"
                type="button"
                :disabled="stoppingSlugs.has(session.slug)"
                :title="stopErrorBySlug[session.slug] || 'Остановить сессию'"
                @click.stop="onStopSession(session.slug)"
              >
                <VIcon size="12">{{ stoppingSlugs.has(session.slug) ? 'mdi-loading' : 'mdi-stop-circle-outline' }}</VIcon>
              </button>
            </div>
          </div>
          <div v-if="projectScopedHierarchy[1]?.length" class="sess-nav__row sess-nav__row--orchestrators">
            <span class="sess-nav__label">Orchestrators</span>
            <div
              v-for="session in projectScopedHierarchy[1]"
              :key="session.slug"
              :ref="(el) => registerSessTab(session.slug, el)"
              class="sess-nav__tab"
              :class="{ 'sess-nav__tab--running': session.status === 'running', 'sess-nav__tab--active': sessNavDotClass(session) === 'sess-nav__dot--active' }"
              :title="session.slug"
              :role="session.agentId ? 'button' : undefined"
              :tabindex="session.agentId ? 0 : undefined"
              :style="session.agentId ? 'cursor: pointer;' : undefined"
              @click="onSessionChipClick(session)"
            >
              <span
                class="sess-nav__dot"
                :class="sessNavDotClass(session)"
              />
              <VIcon size="12" class="sess-nav__kind-icon">{{ getSessionKindMeta(session.kind).icon }}</VIcon>
              <span class="sess-nav__name">{{ session.agentDisplayName || session.slug }}</span>
              <span v-if="session.workroom" class="sess-nav__wr">{{ session.workroom }}</span>
              <span class="sess-nav__meta" :title="'Запущено ' + formatClock(session.created)">
                <VIcon size="10">mdi-clock-outline</VIcon>
                <span class="sess-nav__meta-clock">{{ formatClock(session.created) }}</span>
                <span class="sess-nav__meta-elapsed">· {{ formatElapsed(session.created) }}</span>
              </span>
              <span v-if="session.tokenInTotal + session.tokenOutTotal > 0" class="sess-nav__tokens" title="Токены сессии">↓{{ formatTokens(session.tokenInTotal) }} ↑{{ formatTokens(session.tokenOutTotal) }}</span>
              <button
                class="sess-nav__trace-btn"
                :class="{ 'sess-nav__trace-btn--active': expandedTraceSlug === session.slug }"
                type="button"
                :title="expandedTraceSlug === session.slug ? 'Скрыть трассу' : 'Показать трассу'"
                @click.stop="toggleSessionTrace(session.slug)"
              >
                <VIcon size="12">{{ expandedTraceSlug === session.slug ? 'mdi-chevron-up-box-outline' : 'mdi-chart-timeline-variant' }}</VIcon>
              </button>
              <button
                class="sess-nav__stop-btn"
                type="button"
                :disabled="stoppingSlugs.has(session.slug)"
                :title="stopErrorBySlug[session.slug] || 'Остановить сессию'"
                @click.stop="onStopSession(session.slug)"
              >
                <VIcon size="12">{{ stoppingSlugs.has(session.slug) ? 'mdi-loading' : 'mdi-stop-circle-outline' }}</VIcon>
              </button>
            </div>
          </div>
          <template v-if="chatWorkerGroups.length">
            <div class="sess-nav__row sess-nav__row--workers">
              <span class="sess-nav__label">Workers</span>
            </div>
            <div v-for="group in chatWorkerGroups" :key="group.kind" class="sess-nav__row sess-nav__row--wg">
              <span class="sess-nav__wg-label">{{ getSessionKindMeta(group.kind).label }}</span>
              <div
                v-for="session in group.sessions"
                :key="session.slug"
                :ref="(el) => registerSessTab(session.slug, el)"
                class="sess-nav__tab"
                :class="{ 'sess-nav__tab--running': session.status === 'running', 'sess-nav__tab--active': sessNavDotClass(session) === 'sess-nav__dot--active' }"
                :title="session.slug"
                :role="session.agentId ? 'button' : undefined"
                :tabindex="session.agentId ? 0 : undefined"
                :style="session.agentId ? 'cursor: pointer;' : undefined"
                @click="onSessionChipClick(session)"
              >
                <span
                  class="sess-nav__dot"
                  :class="sessNavDotClass(session)"
                />
                <VIcon size="12" class="sess-nav__kind-icon">{{ getSessionKindMeta(session.kind).icon }}</VIcon>
                <span class="sess-nav__name" :title="session.agentDisplayName || session.slug">{{ session.slug }}</span>
                <span v-if="session.workroom" class="sess-nav__wr">{{ session.workroom }}</span>
                <span class="sess-nav__meta" :title="'Запущено ' + formatClock(session.created)">
                  <VIcon size="10">mdi-clock-outline</VIcon>
                  <span class="sess-nav__meta-clock">{{ formatClock(session.created) }}</span>
                  <span class="sess-nav__meta-elapsed">· {{ formatElapsed(session.created) }}</span>
                </span>
                <span v-if="session.tokenInTotal + session.tokenOutTotal > 0" class="sess-nav__tokens" title="Токены сессии">↓{{ formatTokens(session.tokenInTotal) }} ↑{{ formatTokens(session.tokenOutTotal) }}</span>
                <button
                  class="sess-nav__trace-btn"
                  :class="{ 'sess-nav__trace-btn--active': expandedTraceSlug === session.slug }"
                  type="button"
                  :title="expandedTraceSlug === session.slug ? 'Скрыть трассу' : 'Показать трассу'"
                  @click.stop="toggleSessionTrace(session.slug)"
                >
                  <VIcon size="12">{{ expandedTraceSlug === session.slug ? 'mdi-chevron-up-box-outline' : 'mdi-chart-timeline-variant' }}</VIcon>
                </button>
                <button
                  class="sess-nav__stop-btn"
                  type="button"
                  :disabled="stoppingSlugs.has(session.slug)"
                  :title="stopErrorBySlug[session.slug] || 'Остановить сессию'"
                  @click.stop="onStopSession(session.slug)"
                >
                  <VIcon size="12">{{ stoppingSlugs.has(session.slug) ? 'mdi-loading' : 'mdi-stop-circle-outline' }}</VIcon>
                </button>
              </div>
            </div>
          </template>
         </div>
          <div v-if="expandedTraceSlug" class="sess-nav__trace">
            <div class="sess-nav__trace-header">
              <span>Трасса: <code>{{ expandedTraceSlug }}</code></span>
              <span v-if="traceModel.pending.value" class="sess-nav__trace-pending">загрузка…</span>
              <span v-else-if="traceModel.error.value" class="sess-nav__trace-error">{{ traceModel.error.value }}</span>
              <span v-else class="sess-nav__trace-count">{{ traceModel.events.value.length }} событий</span>
              <button class="sess-nav__trace-close" type="button" @click="toggleSessionTrace(expandedTraceSlug)">
                <VIcon size="14">mdi-close</VIcon>
              </button>
            </div>
            <div v-if="expandedTraceParent || expandedTraceChildren.length" class="sess-nav__trace-lineage">
              <span v-if="expandedTraceParent" class="sess-nav__trace-lineage-item" :title="'Инициатор: ' + expandedTraceParent.slug">
                <VIcon size="11">mdi-arrow-up-thin</VIcon>
                <span class="sess-nav__trace-lineage-label">от</span>
                <code>{{ expandedTraceParent.agentDisplayName || expandedTraceParent.slug }}</code>
              </span>
              <span v-if="expandedTraceSession" class="sess-nav__trace-lineage-self">
                <VIcon size="11">{{ getSessionKindMeta(expandedTraceSession.kind).icon }}</VIcon>
                <code>{{ expandedTraceSession.agentDisplayName || expandedTraceSession.slug }}</code>
              </span>
              <span v-if="expandedTraceChildren.length" class="sess-nav__trace-lineage-item" :title="'Дочерних сессий: ' + expandedTraceChildren.length">
                <VIcon size="11">mdi-arrow-down-thin</VIcon>
                <span class="sess-nav__trace-lineage-label">породила</span>
                <code v-for="c in expandedTraceChildren" :key="c.slug">{{ c.agentDisplayName || c.slug }}</code>
              </span>
            </div>
            <div v-if="traceModel.events.value.length" class="sess-nav__trace-list">
              <div
                v-for="ev in traceModel.events.value"
                :key="ev.eventId"
                class="sess-nav__trace-row"
                :class="[
                  'sess-nav__trace-row--' + ev.kind,
                  ev.kind === 'subagent_start' ? 'sess-nav__trace-row--subagent' : null,
                  ev.kind === 'subagent_end' && ev.subagentSuccess === false ? 'sess-nav__trace-row--subagent-fail' : null,
                  ev.kind === 'subagent_end' && ev.subagentSuccess === true ? 'sess-nav__trace-row--subagent-ok' : null,
                ]"
              >
                <span class="sess-nav__trace-ts">{{ new Date(ev.occurredAt).toLocaleTimeString('ru-RU', { hour12: false }) }}</span>
                <template v-if="ev.kind === 'subagent_start'">
                  <VIcon size="12" class="sess-nav__trace-subagent-icon">mdi-robot-outline</VIcon>
                  <span class="sess-nav__trace-kind">subagent</span>
                  <span v-if="ev.subagentType" class="sess-nav__trace-tool">{{ ev.subagentType }}</span>
                  <span v-if="ev.message" class="sess-nav__trace-desc">{{ ev.message }}</span>
                </template>
                <template v-else-if="ev.kind === 'subagent_end'">
                  <VIcon size="12" class="sess-nav__trace-subagent-icon">{{ ev.subagentSuccess === false ? 'mdi-close-circle-outline' : 'mdi-check-circle-outline' }}</VIcon>
                  <span class="sess-nav__trace-kind">{{ ev.subagentSuccess === false ? 'subagent fail' : 'subagent done' }}</span>
                  <span v-if="ev.subagentType" class="sess-nav__trace-tool">{{ ev.subagentType }}</span>
                  <span v-if="ev.message" class="sess-nav__trace-msg">{{ ev.message }}</span>
                </template>
                <template v-else>
                  <span class="sess-nav__trace-kind">{{ ev.substate || ev.kind }}</span>
                  <span v-if="ev.tool" class="sess-nav__trace-tool">{{ ev.tool }}</span>
                  <span v-if="ev.toolDescriptor" class="sess-nav__trace-desc">{{ ev.toolDescriptor }}</span>
                  <span v-else-if="ev.message" class="sess-nav__trace-msg">{{ ev.message }}</span>
                  <span v-if="ev.tokenIn || ev.tokenOut" class="sess-nav__trace-tokens">↓{{ ev.tokenIn }} ↑{{ ev.tokenOut }}</span>
                </template>
              </div>
            </div>
            <div v-else-if="!traceModel.pending.value" class="sess-nav__trace-empty">Нет событий</div>
          </div>
        </template>
      </div>

      <p v-if="actionError" class="auth-error">{{ actionError }}</p>
  <p v-else-if="calls.requestingPermissions.value" class="copy-toast">Запрашиваем доступ к микрофону{{ conversations.activeConversation.value ? '' : '' }}…</p>
      <p v-else-if="copiedLabel" class="copy-toast">{{ copiedLabel }}</p>

      <MessengerChatComposerContexts
        :show-secret-intro="showSecretIntro"
        :show-relation-panel="Boolean(composerRelationMode && composerRelationMessage && !detailsOpen)"
        :relation-title="relationTitle(composerRelationMode)"
        :relation-author="composerRelationMessage ? (composerRelationMessage.own ? 'Вы' : composerRelationMessage.senderDisplayName) : ''"
        :relation-preview="relationPreviewText(composerRelationMessage)"
        :show-klipy-pill="Boolean(selectedKlipyItem && (!detailsOpen || !conversations.activeConversation.value))"
        :selected-klipy-item="selectedKlipyItem"
        :media-upload-pending="mediaUploadPending"
        @clear-relation="clearComposerRelation"
        @clear-selected-klipy-item="clearSelectedKlipyItem"
      />

      <Transition name="chrome-reveal">
        <MessengerChatSectionForwardPicker
          v-if="Boolean(forwardingMessage && !detailsOpen)"
          :forward-author="forwardingMessage ? (forwardingMessage.own ? 'Вы' : forwardingMessage.senderDisplayName) : ''"
          :forward-preview="relationPreviewText(forwardingMessage)"
          :forward-search-draft="forwardSearchDraft"
          :selected-forward-targets="selectedForwardTargets"
          :available-forward-targets="availableForwardTargets"
          :contacts-pending="contacts.pending.value"
          :message-pending="conversations.messagePending.value"
          :forward-submit-label="forwardSubmitLabel"
          @close="closeForwardPicker"
          @forward="forwardMessage"
          @update:forward-search-draft="forwardSearchDraft = $event"
          @toggle-forward-target="toggleForwardTarget"
        />
      </Transition>

      <MessengerCallAnalysisPanel v-if="showDesktopCallAnalysisPanel" class="chat-call-analysis-panel" />

      <div class="chat-reading-shell" @pointerdown="handleChatAreaPointerDown">
        <div v-if="desktopDropActive || dragDropPending" class="chat-dropzone" aria-live="polite">
          <p class="chat-dropzone__title">Перетащите файлы сюда</p>
          <p class="chat-dropzone__hint">Файлы отправятся прямо в текущий чат</p>
        </div>

        <Transition name="chat-search-bar">
          <MessengerChatSearchBar
            v-if="chatSearch.open.value"
            v-model="chatSearch.query.value"
            :position-label="chatSearch.positionLabel.value"
            :has-matches="chatSearch.matchCount.value > 0"
            :has-query="chatSearch.query.value.trim().length > 0"
            class="chat-search-bar--docked"
            @prev="chatSearch.prev"
            @next="chatSearch.next"
            @close="chatSearch.close"
          />
        </Transition>

        <div ref="messageListEl" class="message-list message-list--chat-scroll">
          <template v-for="entry in filteredThreadedMessages" :key="entryGroupKey(entry)">
            <div v-if="runDividerSet.has(entry.id)" class="run-divider" :title="`Run ${entry.runId}`">
              <span class="run-divider__label">── Прогон {{ entry.runId?.slice(0, 8) }} ──</span>
            </div>
            <MessengerMessageThread
              :entry="entry"
              :active-message-actions-id="activeMessageActionsId"
              :active-reaction-overlay-id="activeReactionOverlayId"
              :editing-message-id="editingMessageId"
              :editing-draft="editingDraft"
              :message-pending="conversations.messagePending.value"
              :allow-forward="canForwardFromActiveConversation"
              :allow-mutual-delete="allowMutualDelete"
              :reaction-options="messageReactionOptions"
              :expanded-quick-launch-message-id="expandedQuickLaunchMessageId"
              :quick-launch-conversation-slug="quickLaunchConversationSlug"
              :quick-launch-project-id="activeAgentProjectId"
              :quick-launch-agent-id="quickLaunchAgentId"
              @toggle-actions="toggleMessageActions"
              @toggle-reaction-overlay="toggleReactionOverlay"
              @comment="activateComposerRelation('comment', $event)"
              @reply="activateComposerRelation('reply', $event)"
              @forward="openForwardPicker"
              @edit="startEditingMessage"
              @remove="removeMessage"
              @react="(messageId, emoji) => reactToMessage(messageId, emoji)"
              @edit-draft="editingDraft = $event"
              @edit-keydown="handleEditKeydown"
              @save-edit="saveEditedMessage"
              @copy-link="(href, label) => copyLink(href, label)"
              @open-photo="openPhotoGallery"
              @reply-suggestion-click="handleReplySuggestionClick"
              @open-run="handleOpenRun"
              @copy-text="handleCopyText"
              @quote-code="handleQuoteCode"
              @quick-launch="handleQuickLaunch"
              @quick-launch-close="closeQuickLaunchPanel"
              @quick-launch-launched="handleQuickLaunchLaunched"
              @open-monitor="handleOpenMonitorFromSystemBubble"
            />
          </template>

          <!-- Loading indicator before first run is tracked -->
          <div
            v-if="awaitingAgentReply && chatAgentStream.allRuns.value.length === 0"
            class="chat-thinking-bubble-row"
            aria-live="polite"
            aria-label="Агент думает"
          >
            <div class="chat-thinking-bubble">
              <div class="chat-thinking-bubble__header">
                <VIcon size="14" class="chat-thinking-bubble__icon">mdi-robot-outline</VIcon>
                <span class="chat-thinking-bubble__name">{{ activePeerName }}</span>
                <span class="chat-thinking-bubble__model">· {{ activeAgentModelLabel }}</span>
              </div>
              <div class="chat-thinking-bubble__dots" aria-hidden="true">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>

          <!-- One thinking bubble per run (active or recently completed) -->
          <template v-for="rd in chatRunsData" :key="rd.runId">
            <div
              class="chat-thinking-bubble-row"
              :class="{ 'chat-thinking-bubble-row--done': rd.isDone }"
              aria-live="polite"
              aria-label="Агент думает"
            >
              <div class="chat-thinking-bubble">
                <button
                  type="button"
                  class="chat-thinking-bubble__header chat-thinking-bubble__header--btn"
                  :aria-expanded="isChatRunExpanded(rd.runId)"
                  @click="toggleChatRun(rd.runId)"
                >
                  <VIcon size="14" class="chat-thinking-bubble__icon">mdi-robot-outline</VIcon>
                  <span class="chat-thinking-bubble__name">{{ activePeerName }}</span>
                  <span class="chat-thinking-bubble__model">· {{ activeAgentModelLabel }}</span>
                  <span class="chat-thinking-bubble__state">· {{ rd.substateLabel }}</span>
                  <!-- Run id chip surfaced during reasoning so the operator can
                       quote the in-flight run by short id ("run:abc12345") in
                       the same way they would after the bubble lands. -->
                  <span
                    class="chat-thinking-bubble__run-id"
                    :title="`Прогон ${rd.runId} · клик — скопировать`"
                    role="button"
                    tabindex="0"
                    @click.stop="copyRunIdToClipboard(rd.runId)"
                    @keydown.enter.stop.prevent="copyRunIdToClipboard(rd.runId)"
                  >run:{{ rd.runId.slice(0, 8) }}</span>
                  <VIcon size="14" class="chat-thinking-bubble__chevron">
                    {{ isChatRunExpanded(rd.runId) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                  </VIcon>
                </button>

                <div v-if="!isChatRunExpanded(rd.runId)" class="chat-thinking-bubble__dots" aria-hidden="true">
                  <span></span><span></span><span></span>
                </div>

                <div v-else class="chat-thinking-bubble__expand">
                  <div v-if="rd.duration || rd.state.tokenCount.total" class="chat-thinking-meta">
                    <span v-if="rd.duration" class="chat-thinking-meta-chip" title="Длительность">⏱ {{ rd.duration }}</span>
                    <span v-if="rd.state.tokenCount.total" class="chat-thinking-meta-chip" title="Токены in/out">🧠 {{ rd.state.tokenCount.input }}↓ / {{ rd.state.tokenCount.output }}↑</span>
                    <span v-if="rd.state.tokenCount.contextPct" class="chat-thinking-meta-chip" title="Контекст">📊 {{ rd.state.tokenCount.contextPct }}%</span>
                    <span v-if="rd.distinctFileCount" class="chat-thinking-meta-chip" title="Файлов задействовано">📁 {{ rd.distinctFileCount }}</span>
                  </div>
                  <div v-for="group in rd.groups" :key="group.key" class="chat-thinking-group">
                    <button
                      type="button"
                      class="chat-thinking-group-title chat-thinking-group-title--btn"
                      :aria-expanded="isChatGroupExpanded(rd.runId, group.key)"
                      @click="toggleChatGroup(rd.runId, group.key)"
                    >
                      <span class="chat-thinking-bubble__icon">{{ group.icon }}</span>
                      <span class="chat-thinking-bubble__name">{{ group.label }}</span>
                      <span class="chat-thinking-group-count">{{ group.entries.length }}</span>
                      <VIcon size="12" class="chat-thinking-bubble__chevron">
                        {{ isChatGroupExpanded(rd.runId, group.key) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                      </VIcon>
                    </button>
                    <template v-if="isChatGroupExpanded(rd.runId, group.key)">
                      <div
                        v-for="(t, idx) in group.entries"
                        :key="idx"
                        class="chat-thinking-plate"
                        :class="{
                          'chat-thinking-plate--active': rd.state.toolUses.length > 0 && t.at === rd.state.toolUses[rd.state.toolUses.length - 1].at,
                          'chat-thinking-plate--done':   rd.state.toolUses.length > 0 && t.at !== rd.state.toolUses[rd.state.toolUses.length - 1].at,
                        }"
                      >
                        <span class="chat-thinking-plate__dot" aria-hidden="true"></span>
                        <span class="chat-thinking-bubble__tool-name">{{ t.tool }}</span>
                        <span v-if="t.descriptor" class="chat-thinking-bubble__tool-desc"> {{ t.descriptor }}</span>
                        <span class="chat-thinking-plate__time">
                          {{ new Date(t.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) }}
                          <template v-if="t.endAt"> · {{ chatFormatDuration(t.endAt - t.at) }}</template>
                        </span>
                      </div>
                    </template>
                  </div>
                  <div v-if="rd.state.substate === 'awaiting_input'" class="chat-thinking-plate chat-thinking-plate--awaiting">
                    <span class="chat-thinking-plate__dot" aria-hidden="true"></span>
                    <span>⏳ Ждёт ввод</span>
                  </div>
                  <div v-if="rd.state.streamingDraft" class="chat-thinking-bubble__stream">{{ rd.state.streamingDraft }}<span class="chat-thinking-bubble__caret">▍</span></div>
                  <div v-if="!rd.state.toolUses.length && !rd.state.streamingDraft" class="chat-thinking-bubble__waiting">
                    <span class="chat-thinking-bubble__dots chat-thinking-bubble__dots--inline" aria-hidden="true"><span></span><span></span><span></span></span>
                    <span>Ожидание событий стрима…</span>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div v-if="!conversations.activeConversation.value" class="empty-state">
            <p class="empty-state__title">Чат не выбран</p>
            <p class="empty-state__text">Откройте контакт и создайте direct-чат, затем здесь появится переписка.</p>
          </div>

          <div v-else-if="!threadedMessages.length" class="empty-state">
            <p class="empty-state__title">Пока пусто</p>
            <p class="empty-state__text">{{ activeConversationSecret ? 'Отправьте первое защищённое сообщение в этом secret-чате.' : 'Отправьте первое текстовое сообщение в этом direct-чате.' }}</p>
          </div>
        </div>

        <Transition name="screen-fade">
          <MessengerSharedGallery
            v-if="photoFeedOpen && conversations.activeConversation.value"
            class="chat-photo-feed"
            :title="`Фотографии ${conversations.activeConversation.value.peerDisplayName}`"
            hint="Лента фотографий из переписки. Листайте фото прямо внутри чата."
            :photos="sharedContent.photos"
            :stickers="[]"
            :documents="[]"
            :links="[]"
            initial-section="photos"
            :initial-photo-id="galleryPhotoId"
            :photo-only="true"
            @close="closePhotoFeed"
          />
        </Transition>

        <Transition name="screen-fade">
          <MessengerSharedGallery
            v-if="detailsOpen && conversations.activeConversation.value"
            :title="`Галерея ${conversations.activeConversation.value.peerDisplayName}`"
            hint="Фото, стикеры, файлы, ссылки и ключи собраны по разделам. Фото идут отдельно от стикеров."
            :photos="sharedContent.photos"
            :stickers="sharedContent.stickers"
            :documents="sharedContent.documents"
            :links="sharedContent.links"
            :security="sharedGallerySecurity"
            :initial-section="galleryPhotoId ? 'photos' : (requestedGallerySection ?? undefined)"
            :initial-photo-id="galleryPhotoId"
            @close="closeDetails"
            @select="copyLink($event.href, $event.title)"
            @refresh-security="refreshSecuritySummary"
          />
        </Transition>
      </div>

      <MessengerChatMediaMenu
        ref="composerMediaMenuRef"
        :visible="composerMediaMenuVisible"
        :tab="composerMediaMenuTab"
        :emoji-options="composerEmojiOptions"
        :shared-stickers="klipyAudienceMode.stickers === 'shared'"
        :shared-gif="klipyAudienceMode.gif === 'shared'"
        :klipy-query="klipyQuery"
        :klipy-search-placeholder="klipySearchPlaceholder"
        :show-klipy-categories="showKlipyCategories"
        :looped-klipy-categories="loopedKlipyCategories"
        :selected-catalog-category="selectedCatalogCategory"
        :primary-klipy-items="primaryKlipyItems"
        :active-klipy-kind="activeKlipyKind"
        :can-load-more-klipy-items="canLoadMoreKlipyItems"
        :media-upload-pending="mediaUploadPending"
        :klipy-pending="klipy.pending.value"
        :klipy-status-text="klipyStatusText"
        :format-klipy-category-tag="formatKlipyCategoryTag"
        :klipy-tile-style="klipyTileStyle"
        :shared-photos="sharedContent.photos"
        :shared-documents="sharedContent.documents"
        @update:tab="openComposerMediaTab"
        @insert-emoji="insertEmojiToDraft"
        @update:klipy-query="klipyQuery = $event"
        @category-scroll="handleLoopedRailScroll($event, { looped: currentKlipyCategories.length > 1 })"
        @select-category="selectCatalogCategory"
        @feed-scroll="handleLoopedFeedScroll($event, { looped: false, canLoadMore: canLoadMoreKlipyItems, onLoadMore: () => klipy.loadMore(KLIPY_RAIL_PAGE_SIZE) })"
        @select-item="selectKlipyItem"
        @pick-from-device="openFilePicker($event === 'photo' ? 'image/*,video/*' : '')"
      />

      <input ref="mediaPickerInputEl" type="file" multiple hidden aria-hidden="true" tabindex="-1" @change="handleFileSelect">

      <MessengerAgentChatWorkspace
        v-if="activeConversationAgent && conversations.activeConversation.value && !detailsOpen"
        :agent-id="conversations.activeConversation.value.peerUserId"
        :agent-name="conversations.activeConversation.value.peerDisplayName"
        :agent-login="conversations.activeConversation.value.peerLogin"
        :conversation-id="conversations.activeConversation.value.id"
        :collapsed="agentWorkspaceCollapsed"
        :open-run-id="workspaceOpenRunId"
        @update:collapsed="agentWorkspaceCollapsed = $event"
      />


      <MessengerChatComposerDock
        ref="composerDockRef"
        :visible="Boolean(conversations.activeConversation.value) && !detailsOpen && !composerMediaMenuVisible"
        :draft="draft"
        :media-menu-open="composerMediaMenuOpen"
        :active-conversation="Boolean(conversations.activeConversation.value)"
        :message-pending="conversations.messagePending.value"
        :is-recording="isRecording"
        :recording-seconds="recordingSeconds"
        :recording-levels="recordingLevels"
        :recording-intensity="recordingIntensity"
        :audio-draft="audioDraft"
        :composer-primary-mode="composerPrimaryMode"
        :composer-primary-disabled="composerPrimaryDisabled"
        :has-selected-klipy-item="Boolean(selectedKlipyItem)"
        :show-project-actions-button="Boolean(conversations.activeConversation.value) && !activeConversationAgent"
        :project-actions-open="projectActions.panelOpen.value"
        :is-agent-composer="Boolean(activeConversationAgent)"
        :show-aidev-actions-bar="Boolean(activeConversationAgent && agentProject)"
        :aidev-active-tab="aidevPanelTab"
        :attachment-ids="[]"
        :staged-attachments="stagedAttachments"
        :show-search-toggle="Boolean(conversations.activeConversation.value)"
        :search-mode="searchMode"
        @update:draft="draft = $event"
        @focus="expandComposer"
        @blur="collapseComposer"
        @input="syncComposerInputHeight"
        @file-select="handleFileSelect"
        @paste-files="handlePasteFiles"
        @remove-staged-attachment="removeStagedAttachment"
        @toggle-media-menu="toggleComposerMediaMenu"
        @open-file-picker="openFilePicker()"
        @toggle-project-actions="projectActions.togglePanel()"
        @select-aidev-tab="onSelectAidevTab($event)"
        @toggle-search-mode="toggleSearchMode"
        @primary-pointerdown="handleComposerPrimaryPointerDown"
        @primary-action="handleComposerPrimaryAction"
        @cancel-audio-draft="cancelAudioComposerState"
        @update:audio-trim-start="updateAudioDraftTrimStart"
        @update:audio-trim-end="updateAudioDraftTrimEnd"
        @run-started="handleRunStarted"
      >
        <template #ai-search-panel>
          <div class="ai-search-panel">
            <header class="ai-search-panel__head">
              <VIcon size="16" class="mr-1" color="primary">mdi-magnify</VIcon>
              <span class="ai-search-panel__title">Поиск по AI-меню</span>
              <span class="ai-search-panel__count">{{ aiMenuSearchResults.length }}</span>
            </header>
            <div class="ai-search-panel__body">
              <div v-if="!aiMenuSearchResults.length" class="ai-search-panel__empty">
                <VIcon size="32" color="on-surface-variant">mdi-magnify-remove-outline</VIcon>
                <p>Ничего не нашлось</p>
              </div>
              <ul v-else class="ai-search-panel__list">
                <li
                  v-for="(hit, idx) in aiMenuSearchResults"
                  :key="`${hit.kind}-${hit.key}-${idx}`"
                >
                  <button type="button" class="ai-search-panel__item" @mousedown.prevent @click="pickAiMenuHit(hit)">
                    <VIcon :size="18" class="ai-search-panel__item-icon">{{ hit.icon }}</VIcon>
                    <span class="ai-search-panel__item-title">{{ hit.title }}</span>
                    <span class="ai-search-panel__item-group">{{ hit.group }}</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </template>

        <template #aidev-panel>
          <div class="chat-aidev-overlay">
            <header class="chat-aidev-overlay__head">
              <div class="chat-aidev-overlay__title">
                <VIcon size="16" class="mr-1" color="primary">mdi-folder-cog-outline</VIcon>
                <span class="chat-aidev-overlay__project">{{ agentProject?.name || 'AIDev' }}</span>
                <span class="chat-aidev-overlay__sep">·</span>
                <span class="chat-aidev-overlay__tab">{{ aidevPanelTab }}</span>
              </div>
              <button
                type="button"
                class="chat-aidev-overlay__close"
                aria-label="Закрыть"
                title="Закрыть"
                @click="aidevPanelTab = null"
              >
                <VIcon size="18">mdi-close</VIcon>
              </button>
            </header>
            <div class="chat-aidev-overlay__body">
              <ProjectConfigTabs
                v-if="agentProject"
                :project="agentProject"
                hide-tabs
              />
              <div v-else class="chat-aidev-overlay__empty">
                <VIcon size="36" color="on-surface-variant">mdi-folder-question-outline</VIcon>
                <p>У агента нет привязанного проекта</p>
              </div>
            </div>
          </div>
        </template>
        <template #project-actions-panel>
          <MessengerProjectActionsPanel
            :open="projectActions.panelOpen.value"
            :groups="projectActions.groupedActions.value"
            :pending-action="projectActions.pendingAction.value"
            :projects="projectActions.platformProjects.value"
            :projects-pending="projectActions.platformProjectsPending.value"
            :projects-error="projectActions.platformProjectsError.value"
            :projects-require-platform-session="projectActions.platformProjectsRequirePlatformSession.value"
            :selected-project-slug="projectActions.selectedProjectSlug.value"
            :selected-action-id="projectActions.selectedActionId.value"
            :catalog="projectActions.platformCatalog.value"
            :catalog-pending="projectActions.platformCatalogPending.value"
            :catalog-error="projectActions.platformCatalogError.value"
            :scope-detail="projectActions.platformScopeDetail.value"
            :scope-detail-pending="projectActions.platformScopeDetailPending.value"
            :scope-detail-error="projectActions.platformScopeDetailError.value"
            :governance-mutation-pending="projectActions.governanceMutationPending.value"
            :governance-mutation-error="projectActions.governanceMutationError.value"
            :governance-mutation-notice="projectActions.governanceMutationNotice.value"
            @close="projectActions.closePanel()"
            @execute="handleProjectAction"
            @select-project="projectActions.setSelectedProjectSlug($event)"
            @select-action="projectActions.setSelectedAction($event)"
            @open-scope-detail="projectActions.openScopeDetail($event.scopeType, $event.scopeId)"
            @create-scope-participant="projectActions.createScopeParticipant($event)"
            @update-scope-assignment="projectActions.updateScopeAssignment($event.assignmentId, { responsibility: $event.responsibility })"
            @delete-scope-assignment="projectActions.deleteScopeAssignment($event.assignmentId)"
            @update-scope-settings="projectActions.updateScopeSettings($event.settings)"
          />
        </template>
      </MessengerChatComposerDock>
    </section>

  </section>
</template>

<style>
/* AIDev overlay panel — expands over the chat above the composer. */
.chat-aidev-overlay {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.chat-aidev-overlay__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgb(var(--v-theme-surface-container));
  flex-shrink: 0;
}
.chat-aidev-overlay__title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.chat-aidev-overlay__project { font-weight: 600; }
.chat-aidev-overlay__sep { opacity: 0.5; margin: 0 2px; }
.chat-aidev-overlay__tab { opacity: 0.7; text-transform: capitalize; }
.chat-aidev-overlay__close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 0;
  background: transparent;
  color: rgb(var(--v-theme-on-surface-variant));
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 140ms ease, color 140ms ease;
}
.chat-aidev-overlay__close:hover {
  background: rgba(var(--v-theme-error), 0.12);
  color: rgb(var(--v-theme-error));
}
.chat-aidev-overlay__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.chat-aidev-overlay__body > .project-config-tabs {
  flex: 1;
  min-height: 0;
}
.chat-aidev-overlay__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 24px 16px;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 13px;
}

.ai-search-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.ai-search-panel__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  flex-shrink: 0;
}
.ai-search-panel__title {
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: 0.01em;
}
.ai-search-panel__count {
  margin-left: auto;
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.ai-search-panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px;
}
.ai-search-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 16px;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 13px;
  text-align: center;
}
.ai-search-panel__empty p { margin: 0; }
.ai-search-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ai-search-panel__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.ai-search-panel__item:hover {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.25);
}
.ai-search-panel__item-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  flex-shrink: 0;
}
.ai-search-panel__item:hover .ai-search-panel__item-icon {
  color: rgb(var(--v-theme-primary));
}
.ai-search-panel__item-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.ai-search-panel__item-group {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface-variant));
  padding: 2px 7px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  flex-shrink: 0;
}

.agent-model-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px;
  background: #0b0e12;
  border-bottom: 1px solid rgba(255,255,255,.06);
  flex-shrink: 0;
}
.agent-model-bar--error-only {
  padding: 2px 14px;
  background: transparent;
  border-bottom: 0;
}

.agent-model-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 12px;
  background: rgba(255,255,255,.04);
  color: rgba(255,255,255,.7);
  cursor: pointer;
  font-size: 11px;
  transition: background 120ms, border-color 120ms;
  user-select: none;
}
.agent-model-chip:hover:not(:disabled) {
  background: rgba(255,255,255,.08);
  border-color: rgba(255,255,255,.2);
}
.agent-model-chip:disabled { opacity: .5; cursor: default; }

.agent-model-chip__chevron { opacity: .5; }

.agent-model-list { min-width: 180px; }

.agent-model-bar__error {
  font-size: 11px;
  color: #ef4444;
}

/* ── Run divider ─────────────────────────────────────────────────── */
.run-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 16px;
  pointer-events: none;
}
.run-divider__label {
  font-size: 11px;
  color: rgba(255,255,255,.35);
  letter-spacing: .04em;
  white-space: nowrap;
}

</style>
