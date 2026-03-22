<script setup lang="ts">
import type { MessengerAttachmentKlipyPayload, MessengerConversationMessage } from '../../composables/useMessengerConversations'
import type { MessengerKlipyItem } from '../../composables/useMessengerKlipy'
import type { MessengerConversationSecuritySummary } from '../../composables/useMessengerCrypto'

interface MessengerThreadMessage extends MessengerConversationMessage {
  comments: MessengerThreadMessage[]
}

const conversations = useMessengerConversations()
const auth = useMessengerAuth()
const contacts = useMessengerContacts()
const messengerCrypto = useMessengerCrypto()
const klipy = useMessengerKlipy()
const viewport = useMessengerViewport()
const navigation = useMessengerConversationState()
const draft = ref('')
const actionError = ref('')
const composerMediaMenuRef = ref<{
  categoryRailEl: HTMLDivElement | null
  feedEl: HTMLDivElement | null
} | null>(null)
const composerDockRef = ref<{
  fileInputEl: HTMLInputElement | null
  composerBarEl: HTMLDivElement | null
  composerInputEl: HTMLTextAreaElement | null
} | null>(null)
const messageListEl = ref<HTMLElement | null>(null)
const fileInput = computed(() => composerDockRef.value?.fileInputEl ?? null)
const composerInputEl = computed(() => composerDockRef.value?.composerInputEl ?? null)
const composerBarEl = computed(() => composerDockRef.value?.composerBarEl ?? null)
const detailsOpen = ref(false)
const copiedLabel = ref('')
const secretIntroSeen = useState<Record<string, boolean>>('messenger-secret-intro-seen', () => ({}))
const isRecording = ref(false)
const recordingSeconds = ref(0)
const canRecordAudio = ref(false)
const calls = useMessengerCalls()
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

let mediaRecorder: MediaRecorder | null = null
let mediaStream: MediaStream | null = null
let recordingTimer: ReturnType<typeof setInterval> | null = null
let composerAlignTimer: ReturnType<typeof setTimeout> | null = null
let composerResizeObserver: ResizeObserver | null = null
let klipySearchTimer: ReturnType<typeof setTimeout> | null = null
let forwardSearchTimer: ReturnType<typeof setTimeout> | null = null
let lockedPageScrollY = 0

const KLIPY_RAIL_PAGE_SIZE = 12

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

function buildLoopedFeed<T>(items: T[]) {
  if (items.length <= 1) {
    return items
  }

  return [...items, ...items, ...items]
}

function primeLoopedRailPosition(element: HTMLElement | null) {
  if (!element || element.dataset.loopReady === 'true') {
    return
  }

  const segmentWidth = element.scrollWidth / 3
  if (!segmentWidth) {
    return
  }

  element.scrollLeft = segmentWidth
  element.dataset.loopReady = 'true'
}

function primeLoopedFeedPosition(element: HTMLElement | null) {
  if (!element || element.dataset.loopReady === 'true') {
    return
  }

  const segmentHeight = element.scrollHeight / 3
  if (!segmentHeight) {
    return
  }

  element.scrollTop = segmentHeight
  element.dataset.loopReady = 'true'
}

async function handleLoopedRailScroll(event: Event, options: { looped: boolean; canLoadMore?: boolean; onLoadMore?: () => Promise<void> | void }) {
  const element = event.currentTarget as HTMLElement | null
  if (!element) {
    return
  }

  if (options.looped) {
    const segmentWidth = element.scrollWidth / 3
    if (segmentWidth > 0) {
      if (element.scrollLeft < segmentWidth * 0.35) {
        element.scrollLeft += segmentWidth
      } else if (element.scrollLeft > segmentWidth * 1.65) {
        element.scrollLeft -= segmentWidth
      }
    }
  }

  const remaining = element.scrollWidth - element.clientWidth - element.scrollLeft
  if (options.canLoadMore && remaining < 320 && options.onLoadMore) {
    await options.onLoadMore()
  }
}

async function handleLoopedFeedScroll(event: Event, options: { looped: boolean; canLoadMore?: boolean; onLoadMore?: () => Promise<void> | void }) {
  const element = event.currentTarget as HTMLElement | null
  if (!element) {
    return
  }

  if (options.looped) {
    const segmentHeight = element.scrollHeight / 3
    if (segmentHeight > 0) {
      if (element.scrollTop < segmentHeight * 0.35) {
        element.scrollTop += segmentHeight
      } else if (element.scrollTop > segmentHeight * 1.65) {
        element.scrollTop -= segmentHeight
      }
    }
  }

  const remaining = element.scrollHeight - element.clientHeight - element.scrollTop
  if (options.canLoadMore && remaining < 320 && options.onLoadMore) {
    await options.onLoadMore()
  }
}

function isMobileChatViewport() {
  if (!import.meta.client) {
    return false
  }

  return window.matchMedia('(max-width: 767px)').matches || navigator.maxTouchPoints > 0
}

function lockPageScroll() {
  if (!import.meta.client || !isMobileChatViewport()) {
    return
  }

  const body = document.body
  if (body.dataset.messengerScrollLocked === 'true') {
    return
  }

  lockedPageScrollY = window.scrollY
  body.dataset.messengerScrollLocked = 'true'
  body.style.position = 'fixed'
  body.style.top = `-${lockedPageScrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'
  body.style.overflow = 'hidden'
}

function unlockPageScroll() {
  if (!import.meta.client) {
    return
  }

  const body = document.body
  if (body.dataset.messengerScrollLocked !== 'true') {
    return
  }

  body.dataset.messengerScrollLocked = 'false'
  body.style.position = ''
  body.style.top = ''
  body.style.left = ''
  body.style.right = ''
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

const chatLayoutStyle = computed(() => ({
  '--messenger-composer-height': `${composerHeight.value}px`,
}))

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
const primaryKlipyItems = computed(() => {
  if (klipyQuery.value.trim() || selectedCatalogCategory.value) {
    return klipy.items.value
  }

  if (currentKlipyRecentItems.value.length) {
    return currentKlipyRecentItems.value
  }

  return klipy.items.value
})
const canLoadMoreKlipyItems = computed(() => {
  if (activeKlipyAudience.value !== 'mine' || !klipy.hasMore.value) {
    return false
  }

  if (klipyQuery.value.trim() || selectedCatalogCategory.value) {
    return true
  }

  return !currentKlipyRecentItems.value.length
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
  canRecordAudio.value = Boolean(import.meta.client && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined')
  await conversations.refresh()
  if (conversations.activeConversationId.value) {
    await conversations.loadMessages()
    await scrollMessagesToBottom('auto')
  }
})

onBeforeUnmount(() => {
  unlockPageScroll()
  stopRecordingTimer()
  stopStreamTracks()
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
  mediaRecorder = null
})

watch(() => conversations.activeConversationId.value, async () => {
  detailsOpen.value = false
  resetKlipyAudienceMode()
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
  if (!opened) {
    return
  }

  await refreshSecuritySummary()
})

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

watch(composerMediaMenuOpen, (open) => {
  navigation.mediaSheetOpen.value = open
})

watch([detailsOpen, photoFeedOpen, () => conversations.activeConversationId.value], () => {
  composerMediaMenuOpen.value = false
})

watch([composerMediaMenuVisible, composerMediaMenuTab, klipyQuery, selectedCatalogCategory], () => {
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
  window.scrollTo({ top: 0, behavior: 'auto' })

  if (opened) {
    await scrollMessagesToBottom('auto')
  }
})

async function submit() {
  actionError.value = ''
  if (!draft.value.trim()) {
    return
  }

  composerMediaMenuOpen.value = false

  const commentTargetId = composerRelationMode.value === 'comment' ? composerRelationMessageId.value : null

  try {
    await conversations.sendMessage(draft.value, {
      replyToMessageId: composerRelationMode.value === 'reply' ? composerRelationMessageId.value || undefined : undefined,
      commentOnMessageId: composerRelationMode.value === 'comment' ? composerRelationMessageId.value || undefined : undefined,
    })
    pendingScrollMessageId.value = commentTargetId
    draft.value = ''
    activeMessageActionsId.value = null
    activeReactionOverlayId.value = null
    composerRelationMode.value = null
    composerRelationMessageId.value = null
    resetComposerInputHeight()
    await nextTick()
    composerInputEl.value?.focus({ preventScroll: true })
    viewport.scheduleViewportSync()
  } catch {
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

function openMediaSheetOnPhoto() {
  if (!conversations.activeConversation.value || conversations.messagePending.value) {
    return
  }

  composerMediaMenuTab.value = 'photo'
  composerMediaMenuOpen.value = true
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
  if (!fileInput.value) {
    return
  }

  fileInput.value.accept = accept
  fileInput.value.value = ''
  fileInput.value.click()
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
      ? await auth.request<Blob>('/integrations/klipy/media', {
          method: 'GET',
          query: {
            url: mediaUrl,
          },
          responseType: 'blob',
        })
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

function stopRecordingTimer() {
  if (recordingTimer) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }
}

function stopStreamTracks() {
  if (!mediaStream) {
    return
  }

  for (const track of mediaStream.getTracks()) {
    track.stop()
  }

  mediaStream = null
}

function pickAudioMimeType() {
  const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]

  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return ''
  }

  return mimeTypes.find(mimeType => MediaRecorder.isTypeSupported(mimeType)) || ''
}

async function toggleAudioRecording() {
  actionError.value = ''
  calls.clearError()

  if (!conversations.activeConversation.value || conversations.messagePending.value) {
    return
  }

  if (isRecording.value && mediaRecorder) {
    mediaRecorder.stop()
    return
  }

  if (!canRecordAudio.value) {
    actionError.value = 'Запись аудио недоступна в этом браузере.'
    return
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const chunks: BlobPart[] = []
    const mimeType = pickAudioMimeType()
    mediaRecorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream)

    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    })

    mediaRecorder.addEventListener('stop', async () => {
      stopRecordingTimer()
      isRecording.value = false
      const nextMimeType = mediaRecorder?.mimeType || mimeType || 'audio/webm'
      const extension = nextMimeType.includes('ogg') ? 'ogg' : nextMimeType.includes('mp4') ? 'm4a' : 'webm'

      try {
        const audioBlob = new Blob(chunks, { type: nextMimeType })
        const audioFile = new File([audioBlob], `voice-message-${Date.now()}.${extension}`, { type: nextMimeType })
        await conversations.uploadAttachment(audioFile)
      } catch {
        actionError.value = 'Не удалось отправить аудиосообщение.'
      } finally {
        stopStreamTracks()
        mediaRecorder = null
        recordingSeconds.value = 0
      }
    }, { once: true })

    mediaRecorder.start()
    isRecording.value = true
    recordingSeconds.value = 0
    stopRecordingTimer()
    recordingTimer = setInterval(() => {
      recordingSeconds.value += 1
    }, 1000)
  } catch {
    stopRecordingTimer()
    stopStreamTracks()
    mediaRecorder = null
    isRecording.value = false
    actionError.value = 'Не удалось получить доступ к микрофону.'
  }
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
  if (!activeConversation || !auth.user.value) {
    securitySummary.value = null
    return
  }

  securitySummaryPending.value = true

  try {
    securitySummary.value = await messengerCrypto.getConversationSecuritySummary(
      auth.request,
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
  if (event.target instanceof Element && event.target.closest('[data-message-action-root="true"]')) {
    return
  }

  activeMessageActionsId.value = null
  activeReactionOverlayId.value = null
}

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
})
</script>

<template>
  <section class="chat-screen" aria-label="Chat section">
    <section
      class="section-block section-block--chat"
      :class="{
        'section-block--chat-empty': !conversations.activeConversation.value,
        'section-block--chat-details-open': detailsOpen && conversations.activeConversation.value,
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
        :call-badge="headerCallBadge"
        :call-security-emojis="headerCallSecurityEmojis"
        :call-security-label="headerCallSecurityLabel"
        :call-security-title="headerCallSecurityTitle"
        :can-toggle-audio-call="canToggleAudioCall"
        :video-call-disabled="!conversations.activeConversation.value || conversations.messagePending.value || !calls.supported.value || !!calls.activeCall.value || calls.requestingPermissions.value"
        :microphone-enabled="calls.controls.value.microphoneEnabled"
        :speaker-enabled="calls.controls.value.speakerEnabled"
        :show-call-actions="Boolean(conversations.activeConversation.value)"
        @toggle-details="toggleDetails"
        @toggle-audio-call="toggleAudioCall"
        @start-video-call="startCall('video')"
        @reject-call="calls.rejectIncomingCall()"
        @accept-call="calls.acceptIncomingCall()"
        @toggle-microphone="calls.toggleMicrophone()"
        @toggle-speaker="calls.toggleSpeaker()"
        @hangup-call="calls.hangupCall()"
        @back="navigation.openSection('chats')"
      />


      <p v-if="actionError" class="auth-error">{{ actionError }}</p>
  <p v-else-if="calls.requestingPermissions.value" class="copy-toast">Запрашиваем доступ к микрофону{{ conversations.activeConversation.value ? '' : '' }}…</p>
      <p v-else-if="copiedLabel" class="copy-toast">{{ copiedLabel }}</p>

      <MessengerChatComposerContexts
        :show-secret-intro="showSecretIntro"
        :show-relation-panel="Boolean(composerRelationMode && composerRelationMessage && !detailsOpen)"
        :relation-title="relationTitle(composerRelationMode)"
        :relation-author="composerRelationMessage ? (composerRelationMessage.own ? 'Вы' : composerRelationMessage.senderDisplayName) : ''"
        :relation-preview="relationPreviewText(composerRelationMessage)"
        :show-forward-panel="Boolean(forwardingMessage && !detailsOpen)"
        :forward-author="forwardingMessage ? (forwardingMessage.own ? 'Вы' : forwardingMessage.senderDisplayName) : ''"
        :forward-preview="relationPreviewText(forwardingMessage)"
        :forward-search-draft="forwardSearchDraft"
        :selected-forward-targets="selectedForwardTargets"
        :available-forward-targets="availableForwardTargets"
        :contacts-pending="contacts.pending.value"
        :message-pending="conversations.messagePending.value"
        :forward-submit-label="forwardSubmitLabel"
        :show-klipy-pill="Boolean(selectedKlipyItem && (!detailsOpen || !conversations.activeConversation.value))"
        :selected-klipy-item="selectedKlipyItem"
        :media-upload-pending="mediaUploadPending"
        @clear-relation="clearComposerRelation"
        @close-forward-picker="closeForwardPicker"
        @update:forward-search-draft="forwardSearchDraft = $event"
        @forward-message="forwardMessage"
        @toggle-forward-target="toggleForwardTarget"
        @clear-selected-klipy-item="clearSelectedKlipyItem"
      />

      <div class="chat-reading-shell">
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

          <article v-if="!conversations.activeConversation.value" class="list-card list-card--panel">
            <div class="list-card__main">
              <p class="list-card__title">Чат не выбран</p>
              <p class="list-card__text">Откройте контакт и создайте direct-чат, затем здесь появится переписка.</p>
            </div>
          </article>

          <article v-else-if="!threadedMessages.length" class="list-card list-card--panel">
            <div class="list-card__main">
              <p class="list-card__title">Пока пусто</p>
              <p class="list-card__text">{{ activeConversationSecret ? 'Отправьте первое защищённое сообщение в этом secret-чате.' : 'Отправьте первое текстовое сообщение в этом direct-чате.' }}</p>
            </div>
          </article>
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
            :security="{ summary: securitySummaryText, items: securityItems, pending: securitySummaryPending, updatedAt: securitySummaryUpdatedAt }"
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
        @pick-from-device="openFilePicker()"
      />

      <MessengerChatComposerDock
        ref="composerDockRef"
        :visible="Boolean(conversations.activeConversation.value) && !detailsOpen"
        :draft="draft"
        :media-menu-open="composerMediaMenuOpen"
        :active-conversation="Boolean(conversations.activeConversation.value)"
        :message-pending="conversations.messagePending.value"
        :is-recording="isRecording"
        :recording-seconds="recordingSeconds"
        :composer-primary-mode="composerPrimaryMode"
        :composer-primary-disabled="composerPrimaryDisabled"
        :has-selected-klipy-item="Boolean(selectedKlipyItem)"
        @update:draft="draft = $event"
        @focus="expandComposer"
        @blur="collapseComposer"
        @input="syncComposerInputHeight"
        @file-select="handleFileSelect"
        @toggle-media-menu="toggleComposerMediaMenu"
        @open-photo-picker="openMediaSheetOnPhoto"
        @primary-pointerdown="handleComposerPrimaryPointerDown"
        @primary-action="handleComposerPrimaryAction"
      />
    </section>
  </section>
</template>
