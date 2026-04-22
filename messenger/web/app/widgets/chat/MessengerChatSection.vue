<script setup lang="ts">
import type { MessengerAttachmentKlipyPayload, MessengerConversationMessage } from '../../entities/conversations/model/useMessengerConversations'
import type { MessengerKlipyItem } from '../../entities/messages/model/useMessengerKlipy'
import type { MessengerConversationSecuritySummary } from '../../entities/messages/model/useMessengerCrypto'
import type { ProjectActionExecutePayload, ProjectActionId } from '../../features/project-engine/model/useMessengerProjectActions'
import { useKlipyFeedPaging } from './model/use-klipy-feed-paging'
import { getSessionKindMeta } from '../../entities/sessions/model/useMessengerCliSessions'

interface MessengerThreadMessage extends MessengerConversationMessage {
  comments: MessengerThreadMessage[]
}

const conversations = useMessengerConversations()
const auth = useMessengerAuth()
const cliSessionsModel = useMessengerCliSessions()
const contacts = useMessengerContacts()
const messengerCrypto = useMessengerCrypto()
const klipy = useMessengerKlipy()
const klipyApi = useKlipyApi()
const viewport = useMessengerViewport()
const navigation = useMessengerConversationState()
const { resetKlipyFeedPaging, buildLoopedFeed, handleLoopedRailScroll, handleLoopedFeedScroll, primeLoopedRailPosition, primeLoopedFeedPosition } = useKlipyFeedPaging()
const draft = ref('')
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

const chatSessNavVisible = computed(() =>
  activeConversationAgent.value && cliSessionsModel.runningSessions.value.length > 0,
)
// Global session hierarchy — all sessions across all projects.
// Project scoping was removed because sessions without agentProjectId
// were never visible, hiding most workers and orchestrators.
const projectScopedHierarchy = computed(() => cliSessionsModel.hierarchy.value)

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

// Open the chat for a session-bound agent when its chip is clicked.
async function onSessionChipClick(sess: { agentId: string | null }) {
  if (!sess.agentId) return
  try { await conversations.openAgentConversation(sess.agentId) }
  catch (err) { console.warn('[chat] could not open agent conversation', err) }
}

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
const chatReasoningExpanded = ref(false)
const { groups: chatGroups, distinctFiles: chatDistinctFiles, formatDuration: chatFormatDuration } = useReasoningGroups(chatAgentStream.toolUses as any)
const chatRunDuration = computed(() => {
  const start = chatAgentStream.runStartedAt.value
  if (!start) return ''
  return chatFormatDuration(Date.now() - start)
})
const chatSubstateLabel = computed(() => {
  if (chatDoneTrace.value) return 'Завершено'
  const s = chatAgentStream.substate.value as string
  return ({
    idle: 'Готов',
    thinking: 'Думает…',
    tool_call: 'Запускает инструменты…',
    awaiting_input: 'Ждёт ввод',
    streaming: 'Отвечает…',
    error: 'Ошибка',
  } as Record<string, string>)[s] || 'Работает…'
})
// True when a run has completed and there's a trace to browse (but no active run)
const chatDoneTrace = computed(() =>
  !awaitingAgentReply.value &&
  chatAgentStream.substate.value === 'idle' &&
  (chatAgentStream.toolUses.value.length > 0 || chatAgentStream.tokenCount.value.total > 0),
)
function toggleChatReasoning() { chatReasoningExpanded.value = !chatReasoningExpanded.value }
const chatGroupsExpanded = ref<Record<string, boolean>>({})
function chatGroupExpanded(key: string) { return chatGroupsExpanded.value[key] ?? true }
function toggleChatGroup(key: string) { chatGroupsExpanded.value = { ...chatGroupsExpanded.value, [key]: !chatGroupExpanded(key) } }

// When the agent stream goes idle: refresh sessions, reload messages so the
// committed reply appears in the thread, and always clear the thinking bubble
// (in case the run had no finalText / no conversationId and messages.updated
// never fired — without this the bubble hangs forever).
watch(chatAgentStream.substate, (next, prev) => {
  if (next === 'idle' && prev !== 'idle') {
    cliSessionsModel.refresh()
    void conversations.loadMessages()
    awaitingAgentReply.value = false
    chatReasoningExpanded.value = false
  }
  // Expand automatically when a new run starts
  if (next !== 'idle' && prev === 'idle') {
    chatReasoningExpanded.value = true
  }
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

// Clear when a new agent message arrives after our lastSentAt.
watch(() => conversations.messages.value, (list) => {
  if (!awaitingAgentReply.value) return
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i] as unknown as { own?: boolean; createdAt?: string }
    const ts = m?.createdAt ? new Date(m.createdAt).getTime() : 0
    if (m?.own === false && ts >= agentReplyAwaitSince.value - 500) {
      awaitingAgentReply.value = false
      return
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
const hasComposerPayload = computed(() => hasComposerText.value || hasSelectedKlipyItem.value)
const composerPrimaryMode = computed<'record' | 'send' | 'stop-recording'>(() => {
  if (isRecording.value) {
    return 'stop-recording'
  }

  return hasComposerPayload.value ? 'send' : 'record'
})
const composerPrimaryDisabled = computed(() => {
  if (!conversations.activeConversation.value || conversations.messagePending.value) {
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
  if (!draft.value.trim()) {
    return
  }

  composerMediaMenuOpen.value = false

  // Сохраняем данные ДО очистки UI
  const text = draft.value
  const replyToMessageId = composerRelationMode.value === 'reply' ? composerRelationMessageId.value || undefined : undefined
  const commentOnMessageId = composerRelationMode.value === 'comment' ? composerRelationMessageId.value || undefined : undefined
  const commentTargetId = composerRelationMode.value === 'comment' ? composerRelationMessageId.value : null

  // Очищаем UI синхронно ДО async-вызова — клавиатура не успевает закрыться
  draft.value = ''
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

async function handleFileSelect(event: Event) {
  actionError.value = ''
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  try {
    await conversations.uploadAttachment(file)
    input.accept = ''
    input.value = ''
  } catch {
    actionError.value = 'Не удалось загрузить файл.'
    input.accept = ''
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
    for (const file of Array.from(fileList)) {
      await conversations.uploadAttachment(file)
    }
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

function toggleDetails() {
  if (!conversations.activeConversation.value) {
    return
  }

  galleryPhotoId.value = null
  detailsOpen.value = !detailsOpen.value
}

function closeDetails() {
  galleryPhotoId.value = null
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

// Poll sessions every 20 s while an agent chat is active so the hierarchy
// bar stays up-to-date without requiring a page reload.
let cliSessionsPollTimer: ReturnType<typeof setInterval> | null = null
watch(activeConversationAgent, (isAgent) => {
  if (isAgent) {
    if (!cliSessionsPollTimer) {
      cliSessionsPollTimer = setInterval(() => { void cliSessionsModel.refresh() }, 20_000)
    }
  } else {
    if (cliSessionsPollTimer) {
      clearInterval(cliSessionsPollTimer)
      cliSessionsPollTimer = null
    }
  }
}, { immediate: true })

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
        @toggle-details="toggleDetails"
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
        @pointerdown="handleChatAreaPointerDown"
      />

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

      <!-- Session hierarchy bar — below chat header, agent conversations only -->
      <div v-if="chatSessNavVisible" class="sess-nav">
        <div v-if="projectScopedHierarchy[0]?.length" class="sess-nav__row sess-nav__row--composers">
          <span class="sess-nav__label">Composers</span>
          <div
            v-for="session in projectScopedHierarchy[0]"
            :key="session.slug"
            class="sess-nav__tab"
            :title="session.slug"
            :role="session.agentId ? 'button' : undefined"
            :tabindex="session.agentId ? 0 : undefined"
            :style="session.agentId ? 'cursor: pointer;' : undefined"
            @click="onSessionChipClick(session)"
          >
            <span class="sess-nav__dot" :class="`sess-nav__dot--${session.status}`" />
            <span class="sess-nav__name">{{ session.agentDisplayName || session.slug }}</span>
            <span v-if="session.workroom" class="sess-nav__wr">{{ session.workroom }}</span>
          </div>
        </div>
        <div v-if="projectScopedHierarchy[1]?.length" class="sess-nav__row sess-nav__row--orchestrators">
          <span class="sess-nav__label">Orchestrators</span>
          <div
            v-for="session in projectScopedHierarchy[1]"
            :key="session.slug"
            class="sess-nav__tab"
            :title="session.slug"
            :role="session.agentId ? 'button' : undefined"
            :tabindex="session.agentId ? 0 : undefined"
            :style="session.agentId ? 'cursor: pointer;' : undefined"
            @click="onSessionChipClick(session)"
          >
            <span class="sess-nav__dot" :class="`sess-nav__dot--${session.status}`" />
            <span class="sess-nav__name">{{ session.agentDisplayName || session.slug }}</span>
            <span v-if="session.workroom" class="sess-nav__wr">{{ session.workroom }}</span>
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
              class="sess-nav__tab"
              :title="session.slug"
              :role="session.agentId ? 'button' : undefined"
              :tabindex="session.agentId ? 0 : undefined"
              :style="session.agentId ? 'cursor: pointer;' : undefined"
              @click="onSessionChipClick(session)"
            >
              <span class="sess-nav__dot" :class="`sess-nav__dot--${session.status}`" />
              <span class="sess-nav__name">{{ session.agentDisplayName || session.slug }}</span>
              <span v-if="session.workroom" class="sess-nav__wr">{{ session.workroom }}</span>
            </div>
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

        <div ref="messageListEl" class="message-list message-list--chat-scroll">
          <MessengerMessageThread
            v-for="entry in threadedMessages"
            :key="entry.id"
            :entry="entry"
            :active-message-actions-id="activeMessageActionsId"
            :active-reaction-overlay-id="activeReactionOverlayId"
            :editing-message-id="editingMessageId"
            :editing-draft="editingDraft"
            :message-pending="conversations.messagePending.value"
            :allow-forward="canForwardFromActiveConversation"
            :allow-mutual-delete="allowMutualDelete"
            :reaction-options="messageReactionOptions"
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
          />

          <!-- Thinking indicator — active run OR collapsed trace of last completed run -->
          <div
            v-if="awaitingAgentReply || chatDoneTrace"
            class="chat-thinking-bubble-row"
            :class="{ 'chat-thinking-bubble-row--done': chatDoneTrace }"
            aria-live="polite"
            aria-label="Агент думает"
          >
            <div class="chat-thinking-bubble">
              <button
                type="button"
                class="chat-thinking-bubble__header chat-thinking-bubble__header--btn"
                :aria-expanded="chatReasoningExpanded"
                @click="toggleChatReasoning"
              >
                <VIcon size="14" class="chat-thinking-bubble__icon">mdi-robot-outline</VIcon>
                <span class="chat-thinking-bubble__name">{{ activePeerName }}</span>
                <span class="chat-thinking-bubble__model">· {{ activeAgentModelLabel }}</span>
                <span class="chat-thinking-bubble__state">· {{ chatSubstateLabel }}</span>
                <VIcon size="14" class="chat-thinking-bubble__chevron">
                  {{ chatReasoningExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                </VIcon>
              </button>

              <div v-if="!chatReasoningExpanded" class="chat-thinking-bubble__dots" aria-hidden="true">
                <span></span><span></span><span></span>
              </div>

              <div v-else class="chat-thinking-bubble__expand">
                <div v-if="chatRunDuration || chatAgentStream.tokenCount.value.total" class="chat-thinking-meta">
                  <span v-if="chatRunDuration" class="chat-thinking-meta-chip" title="Длительность">⏱ {{ chatRunDuration }}</span>
                  <span v-if="chatAgentStream.tokenCount.value.total" class="chat-thinking-meta-chip" title="Токены in/out">🧠 {{ chatAgentStream.tokenCount.value.input }}↓ / {{ chatAgentStream.tokenCount.value.output }}↑</span>
                  <span v-if="chatAgentStream.tokenCount.value.contextPct" class="chat-thinking-meta-chip" title="Контекст">📊 {{ chatAgentStream.tokenCount.value.contextPct }}%</span>
                  <span v-if="chatDistinctFiles.length" class="chat-thinking-meta-chip" title="Файлов задействовано">📁 {{ chatDistinctFiles.length }}</span>
                </div>
                <div v-for="group in chatGroups" :key="group.key" class="chat-thinking-group">
                  <button
                    type="button"
                    class="chat-thinking-group-title chat-thinking-group-title--btn"
                    :aria-expanded="chatGroupExpanded(group.key)"
                    @click="toggleChatGroup(group.key)"
                  >
                    <span class="chat-thinking-bubble__icon">{{ group.icon }}</span>
                    <span class="chat-thinking-bubble__name">{{ group.label }}</span>
                    <span class="chat-thinking-group-count">{{ group.entries.length }}</span>
                    <VIcon size="12" class="chat-thinking-bubble__chevron">
                      {{ chatGroupExpanded(group.key) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                    </VIcon>
                  </button>
                  <template v-if="chatGroupExpanded(group.key)">
                    <div
                      v-for="(t, idx) in group.entries"
                      :key="idx"
                      class="chat-thinking-plate"
                      :class="{
                        'chat-thinking-plate--active': chatAgentStream.toolUses.value.length > 0 && t.at === chatAgentStream.toolUses.value[chatAgentStream.toolUses.value.length - 1].at,
                        'chat-thinking-plate--done':   chatAgentStream.toolUses.value.length > 0 && t.at !== chatAgentStream.toolUses.value[chatAgentStream.toolUses.value.length - 1].at,
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
                <div v-if="chatAgentStream.substate.value === 'awaiting_input'" class="chat-thinking-plate chat-thinking-plate--awaiting">
                  <span class="chat-thinking-plate__dot" aria-hidden="true"></span>
                  <span>⏳ Ждёт ввод</span>
                </div>
                <div v-if="chatAgentStream.streamingDraft.value" class="chat-thinking-bubble__stream">{{ chatAgentStream.streamingDraft.value }}<span class="chat-thinking-bubble__caret">▍</span></div>
                <div v-if="!chatAgentStream.toolUses.value.length && !chatAgentStream.streamingDraft.value" class="chat-thinking-bubble__waiting">
                  <span class="chat-thinking-bubble__dots chat-thinking-bubble__dots--inline" aria-hidden="true"><span></span><span></span><span></span></span>
                  <span>Ожидание событий стрима…</span>
                </div>
              </div>
            </div>
          </div>

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
            :initial-section="galleryPhotoId ? 'photos' : undefined"
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

      <input ref="mediaPickerInputEl" type="file" hidden aria-hidden="true" tabindex="-1" @change="handleFileSelect">

      <MessengerAgentChatWorkspace
        v-if="activeConversationAgent && conversations.activeConversation.value && !detailsOpen"
        :agent-id="conversations.activeConversation.value.peerUserId"
        :agent-name="conversations.activeConversation.value.peerDisplayName"
        :agent-login="conversations.activeConversation.value.peerLogin"
        :conversation-id="conversations.activeConversation.value.id"
        :collapsed="agentWorkspaceCollapsed"
        @update:collapsed="agentWorkspaceCollapsed = $event"
      />

      <MessengerChatComposerDock
        ref="composerDockRef"
        :visible="Boolean(conversations.activeConversation.value) && !detailsOpen && !composerMediaMenuVisible"
        :draft="draft"
        :media-menu-open="composerMediaMenuOpen"
        :active-conversation="Boolean(conversations.activeConversation.value)"
        :show-agent-menu-toggle="Boolean(activeConversationAgent)"
        :agent-menu-expanded="Boolean(activeConversationAgent) && !agentWorkspaceCollapsed"
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
        :attachment-ids="[]"
        @update:draft="draft = $event"
        @focus="expandComposer"
        @blur="collapseComposer"
        @input="syncComposerInputHeight"
        @file-select="handleFileSelect"
        @toggle-media-menu="toggleComposerMediaMenu"
        @open-file-picker="openFilePicker()"
        @toggle-agent-workspace="agentWorkspaceCollapsed = !agentWorkspaceCollapsed"
        @toggle-project-actions="projectActions.togglePanel()"
        @primary-pointerdown="handleComposerPrimaryPointerDown"
        @primary-action="handleComposerPrimaryAction"
        @cancel-audio-draft="cancelAudioComposerState"
        @update:audio-trim-start="updateAudioDraftTrimStart"
        @update:audio-trim-end="updateAudioDraftTrimEnd"
        @run-started="handleRunStarted"
      >
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
