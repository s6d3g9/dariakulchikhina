<script setup lang="ts">
import type { MessengerConversationMessage } from '../../composables/useMessengerConversations'

interface MessengerThreadMessage extends MessengerConversationMessage {
  comments: MessengerThreadMessage[]
}

const conversations = useMessengerConversations()
const viewport = useMessengerViewport()
const draft = ref('')
const actionError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const composerMediaMenuEl = ref<HTMLElement | null>(null)
const messageListEl = ref<HTMLElement | null>(null)
const composerInputEl = ref<HTMLTextAreaElement | null>(null)
const composerBarEl = ref<HTMLElement | null>(null)
const detailsOpen = ref(false)
const copiedLabel = ref('')
const isRecording = ref(false)
const recordingSeconds = ref(0)
const canRecordAudio = ref(false)
const calls = useMessengerCalls()
const editingMessageId = ref<string | null>(null)
const editingDraft = ref('')
const activeMessageActionsId = ref<string | null>(null)
const composerHeight = ref(76)
const composerRelationMode = ref<'reply' | 'comment' | null>(null)
const composerRelationMessageId = ref<string | null>(null)
const forwardingMessageId = ref<string | null>(null)
const galleryPhotoId = ref<string | null>(null)
const pendingScrollMessageId = ref<string | null>(null)
const dragDropDepth = ref(0)
const dragDropPending = ref(false)
const composerMediaMenuOpen = ref(false)
const composerMediaMenuTab = ref<'emoji' | 'stickers' | 'gif'>('emoji')

const composerEmojiOptions = ['😀', '😉', '😍', '🔥', '👍', '👏', '🙏', '❤️', '🎉', '🤝', '✨', '😎']

let mediaRecorder: MediaRecorder | null = null
let mediaStream: MediaStream | null = null
let recordingTimer: ReturnType<typeof setInterval> | null = null
let composerAlignTimer: ReturnType<typeof setTimeout> | null = null
let composerResizeObserver: ResizeObserver | null = null
let lockedPageScrollY = 0

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

function resolveAttachmentTitle(attachment: { name: string, mimeType: string }) {
  if (attachment.mimeType.startsWith('audio/')) {
    return 'Аудиосообщение'
  }

  return attachment.name
}

function extractLinks(text: string) {
  return Array.from(text.matchAll(/https?:\/\/[^\s]+/g), match => match[0])
}

const activePeerName = computed(() => conversations.activeConversation.value?.peerDisplayName || 'Откройте чат')
const activePeerAvatar = computed(() => {
  const name = activePeerName.value.trim()
  if (!name || name === 'Откройте чат') {
    return '??'
  }

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('')
})

const sharedContent = computed(() => {
  const photos: SharedAssetItem[] = []
  const documents: SharedAssetItem[] = []
  const links: SharedAssetItem[] = []

  for (const entry of conversations.messages.value) {
    if (entry.attachment) {
      const item: SharedAssetItem = {
        id: entry.id,
        title: resolveAttachmentTitle(entry.attachment),
        meta: `${entry.attachment.mimeType} · ${Math.ceil(entry.attachment.size / 1024)} KB`,
        href: entry.attachment.absoluteUrl,
        previewUrl: entry.attachment.mimeType.startsWith('image/') ? entry.attachment.absoluteUrl : undefined,
      }

      if (entry.attachment.mimeType.startsWith('image/')) {
        photos.push(item)
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
    documents,
    links,
  }
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

const availableForwardTargets = computed(() => conversations.conversations.value)
const photoFeedOpen = computed(() => Boolean(galleryPhotoId.value && conversations.activeConversation.value))
const headerAudioCall = computed(() => Boolean(
  calls.activeCall.value
  && calls.activeCall.value.mode === 'audio'
  && calls.activeCall.value.conversationId === conversations.activeConversationId.value,
))
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
const composerPrimaryMode = computed<'record' | 'send' | 'stop-recording'>(() => {
  if (isRecording.value) {
    return 'stop-recording'
  }

  return hasComposerText.value ? 'send' : 'record'
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
  await scrollMessagesToBottom('auto')
})

watch(() => detailsOpen.value, (opened) => {
  if (opened) {
    resetComposerInputHeight()
  }
})

watch(() => conversations.activeConversationId.value, () => {
  editingMessageId.value = null
  editingDraft.value = ''
  activeMessageActionsId.value = null
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

watch([detailsOpen, photoFeedOpen, () => conversations.activeConversationId.value], () => {
  composerMediaMenuOpen.value = false
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
}

function openComposerMediaTab(tab: 'emoji' | 'stickers' | 'gif') {
  composerMediaMenuTab.value = tab
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
  forwardingMessageId.value = messageId
  clearComposerRelation()
  activeMessageActionsId.value = null
}

function closeForwardPicker() {
  forwardingMessageId.value = null
}

async function forwardMessage(targetConversationId: string) {
  if (!forwardingMessageId.value) {
    return
  }

  actionError.value = ''

  try {
    await conversations.forwardMessage(forwardingMessageId.value, targetConversationId)
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

function openStickerPicker() {
  composerMediaMenuOpen.value = false
  openFilePicker('image/webp,image/png,image/jpeg')
}

function openGifPicker() {
  composerMediaMenuOpen.value = false
  openFilePicker('image/gif')
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
}

function closePhotoFeed() {
  galleryPhotoId.value = null
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
    await conversations.deleteMessage(messageId)
    if (editingMessageId.value === messageId) {
      cancelEditingMessage()
    }
  } catch {
    actionError.value = 'Не удалось удалить сообщение.'
  }
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

function toggleMessageActions(messageId: string, event: MouseEvent) {
  const target = event.target
  if (!(target instanceof HTMLElement)) {
    return
  }

  if (target.closest('button, textarea, audio, img, input, [data-message-action-menu="true"]')) {
    return
  }

  activeMessageActionsId.value = activeMessageActionsId.value === messageId ? null : messageId
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (event.target instanceof Element && event.target.closest('[data-message-action-root="true"]')) {
    return
  }

  activeMessageActionsId.value = null
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
      <header class="section-head section-head--chat-header">
        <button
          type="button"
          class="chat-user-trigger chat-user-trigger--profile"
          :class="{ 'chat-user-trigger--audio-live': headerAudioCall }"
          :disabled="!conversations.activeConversation.value"
          @click="toggleDetails"
        >
          <span class="chat-avatar">{{ activePeerAvatar }}</span>
          <span class="chat-user-meta">
            <span
              class="chat-user-name"
              :class="{ 'chat-user-name--audio-live': headerAudioCall }"
            >
              <span class="chat-user-name__text">{{ activePeerName }}</span>
              <span v-if="headerAudioCall" class="chat-user-name__call" aria-live="polite">
                {{ headerAudioCallStatus }}
              </span>
            </span>
          </span>
        </button>

        <div class="section-actions section-actions--cluster">
          <button
            type="button"
            class="icon-btn"
            :class="{ 'icon-btn--call-live': headerAudioCall }"
            aria-label="Аудиозвонок"
            :disabled="!canToggleAudioCall"
            @click="toggleAudioCall"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7.42 5.25h2.12c.32 0 .61.2.72.5l1.06 2.87a.78.78 0 0 1-.18.82l-1.62 1.63a12.8 12.8 0 0 0 5.4 5.4l1.63-1.62a.78.78 0 0 1 .82-.18l2.87 1.06c.3.11.5.4.5.72v2.12a1.9 1.9 0 0 1-2.05 1.9c-7.92-.5-14.2-6.78-14.7-14.7a1.9 1.9 0 0 1 1.9-2.05Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
            </svg>
          </button>
          <button
            type="button"
            class="icon-btn"
            aria-label="Видеозвонок"
            :disabled="!conversations.activeConversation.value || conversations.messagePending.value || !calls.supported.value || !!calls.activeCall.value || calls.requestingPermissions.value"
            @click="startCall('video')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.75 8A2.75 2.75 0 0 1 7.5 5.25h6A2.75 2.75 0 0 1 16.25 8v1.33l3.1-1.76c.58-.33 1.3.09 1.3.76v7.34c0 .67-.72 1.09-1.3.76l-3.1-1.76V16a2.75 2.75 0 0 1-2.75 2.75h-6A2.75 2.75 0 0 1 4.75 16V8Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
            </svg>
          </button>
        </div>
      </header>


      <p v-if="actionError" class="auth-error">{{ actionError }}</p>
  <p v-else-if="calls.requestingPermissions.value" class="copy-toast">Запрашиваем доступ к микрофону{{ conversations.activeConversation.value ? '' : '' }}…</p>
      <p v-else-if="copiedLabel" class="copy-toast">{{ copiedLabel }}</p>

      <div v-if="composerRelationMode && composerRelationMessage && !detailsOpen" class="composer-context composer-context--active">
        <div class="composer-context__copy">
          <p class="composer-context__eyebrow">{{ relationTitle(composerRelationMode) }}</p>
          <p class="composer-context__title">{{ composerRelationMessage.own ? 'Вы' : composerRelationMessage.senderDisplayName }}</p>
          <p class="composer-context__text">{{ relationPreviewText(composerRelationMessage) }}</p>
        </div>
        <button type="button" class="message-action-btn" @click="clearComposerRelation">Отмена</button>
      </div>

      <div v-if="forwardingMessage && !detailsOpen" class="composer-context composer-context--forward">
        <div class="composer-context__copy">
          <p class="composer-context__eyebrow">Переслать сообщение</p>
          <p class="composer-context__title">{{ forwardingMessage.own ? 'Вы' : forwardingMessage.senderDisplayName }}</p>
          <p class="composer-context__text">{{ relationPreviewText(forwardingMessage) }}</p>
        </div>
        <button type="button" class="message-action-btn" @click="closeForwardPicker">Закрыть</button>
        <div class="forward-targets">
          <button
            v-for="conversation in availableForwardTargets"
            :key="conversation.id"
            type="button"
            class="forward-target-btn"
            :disabled="conversations.messagePending.value"
            @click="forwardMessage(conversation.id)"
          >
            <span class="forward-target-btn__title">{{ conversation.peerDisplayName }}</span>
            <span class="forward-target-btn__meta">{{ conversation.id === conversations.activeConversationId.value ? 'Текущий чат' : `@${conversation.peerLogin}` }}</span>
          </button>
        </div>
      </div>

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
            :editing-message-id="editingMessageId"
            :editing-draft="editingDraft"
            :message-pending="conversations.messagePending.value"
            @toggle-actions="toggleMessageActions"
            @comment="activateComposerRelation('comment', $event)"
            @reply="activateComposerRelation('reply', $event)"
            @forward="openForwardPicker"
            @edit="startEditingMessage"
            @remove="removeMessage"
            @edit-draft="editingDraft = $event"
            @edit-keydown="handleEditKeydown"
            @save-edit="saveEditedMessage"
            @copy-link="copyLink($event[0], $event[1])"
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
              <p class="list-card__text">Отправьте первое текстовое сообщение в этом direct-чате.</p>
            </div>
          </article>
        </div>

        <MessengerSharedGallery
          v-if="photoFeedOpen && conversations.activeConversation.value"
          class="chat-photo-feed"
          :title="`Фотографии ${conversations.activeConversation.value.peerDisplayName}`"
          hint="Лента фотографий из переписки. Листайте фото прямо внутри чата."
          :photos="sharedContent.photos"
          :documents="[]"
          :links="[]"
          initial-section="photos"
          :initial-photo-id="galleryPhotoId"
          :photo-only="true"
          @close="closePhotoFeed"
        />

        <MessengerSharedGallery
          v-if="detailsOpen && conversations.activeConversation.value"
          :title="`Галерея ${conversations.activeConversation.value.peerDisplayName}`"
          hint="Свайпайте влево и вправо между разделами. Фото идут в порядке отправки в чате."
          :photos="sharedContent.photos"
          :documents="sharedContent.documents"
          :links="sharedContent.links"
          :initial-section="galleryPhotoId ? 'photos' : undefined"
          :initial-photo-id="galleryPhotoId"
          @close="closeDetails"
          @select="copyLink($event.href, $event.title)"
        />
      </div>

      <div
        v-if="composerMediaMenuVisible"
        ref="composerMediaMenuEl"
        class="composer-media-menu"
      >
        <div class="composer-media-menu__tabs">
          <button
            type="button"
            class="composer-media-menu__tab"
            :class="{ 'composer-media-menu__tab--active': composerMediaMenuTab === 'emoji' }"
            @click="openComposerMediaTab('emoji')"
          >
            Смайлы
          </button>
          <button
            type="button"
            class="composer-media-menu__tab"
            :class="{ 'composer-media-menu__tab--active': composerMediaMenuTab === 'stickers' }"
            @click="openComposerMediaTab('stickers')"
          >
            Стикеры
          </button>
          <button
            type="button"
            class="composer-media-menu__tab"
            :class="{ 'composer-media-menu__tab--active': composerMediaMenuTab === 'gif' }"
            @click="openComposerMediaTab('gif')"
          >
            GIF
          </button>
        </div>

        <div v-if="composerMediaMenuTab === 'emoji'" class="composer-media-menu__emoji-grid">
          <button
            v-for="emoji in composerEmojiOptions"
            :key="emoji"
            type="button"
            class="composer-media-menu__emoji"
            @click="insertEmojiToDraft(emoji)"
          >
            {{ emoji }}
          </button>
        </div>

        <div v-else-if="composerMediaMenuTab === 'stickers'" class="composer-media-menu__action-group">
          <p class="composer-media-menu__hint">Выберите изображение, чтобы отправить его как стикер.</p>
          <button type="button" class="composer-media-menu__action" @click="openStickerPicker">
            Выбрать стикер
          </button>
        </div>

        <div v-else class="composer-media-menu__action-group">
          <p class="composer-media-menu__hint">Откройте GIF-файл из галереи или файлового менеджера.</p>
          <button type="button" class="composer-media-menu__action" @click="openGifPicker">
            Выбрать GIF
          </button>
        </div>
      </div>

      <div v-if="!detailsOpen || !conversations.activeConversation.value" ref="composerBarEl" class="composer-bar composer-bar--dock">
        <input ref="fileInput" type="file" class="sr-only" @change="handleFileSelect">
        <div class="composer-segment composer-segment--attach">
          <button
            type="button"
            class="composer-btn"
            :aria-label="composerMediaMenuOpen ? 'Закрыть меню смайлов, стикеров и GIF' : 'Открыть меню смайлов, стикеров и GIF'"
            :disabled="!conversations.activeConversation.value || conversations.messagePending.value"
            @click="toggleComposerMediaMenu"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.25 13.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5ZM15.75 13.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5ZM6 17.5c1.02-.98 2.35-1.5 3.75-1.5s2.73.52 3.75 1.5M13.5 17.5c.7-.66 1.61-1.06 2.6-1.17" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.65"/>
            </svg>
          </button>
        </div>
        <div class="composer-field">
          <textarea
            ref="composerInputEl"
            v-model="draft"
            rows="1"
            class="composer-input"
            placeholder="Сообщение"
            :disabled="!conversations.activeConversation.value"
            @focus="expandComposer"
            @blur="collapseComposer"
            @input="syncComposerInputHeight"
          />
        </div>
        <div class="composer-segment composer-segment--actions">
          <button
            type="button"
            class="composer-btn"
            aria-label="Прикрепить файл"
            :disabled="!conversations.activeConversation.value || conversations.messagePending.value"
            @click="openFilePicker()"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9.1 12.9 15.8 6.2a3.35 3.35 0 1 1 4.74 4.73l-8.1 8.1a5.2 5.2 0 1 1-7.35-7.36l7.05-7.05" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85"/>
            </svg>
          </button>
          <button
            type="button"
            class="composer-btn"
            :class="{
              'composer-btn--recording': isRecording,
              'composer-btn--accent': composerPrimaryMode === 'send',
              'composer-btn--audio-primary': composerPrimaryMode === 'record',
            }"
            :aria-label="composerPrimaryMode === 'send' ? 'Отправить сообщение' : composerPrimaryMode === 'stop-recording' ? 'Остановить запись аудиосообщения' : 'Записать аудиосообщение'"
            :disabled="composerPrimaryDisabled"
            @pointerdown="handleComposerPrimaryPointerDown"
            @click="handleComposerPrimaryAction"
          >
            <span v-if="isRecording">{{ `${recordingSeconds}s` }}</span>
            <svg v-else-if="composerPrimaryMode === 'record'" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 15.25a3.25 3.25 0 0 0 3.25-3.25V7.5a3.25 3.25 0 1 0-6.5 0V12A3.25 3.25 0 0 0 12 15.25Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
              <path d="M6.75 11.75a5.25 5.25 0 0 0 10.5 0M12 17v2.5M9 19.5h6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.95 11.8 18.84 5.65c1.08-.48 2.16.6 1.69 1.69l-6.15 13.89c-.45 1.03-1.93 1.06-2.42.05l-1.9-3.98a1.75 1.75 0 0 0-.86-.86l-3.98-1.9c-1.01-.49-.98-1.97.05-2.42Z" fill="currentColor"/>
              <path d="M9.78 16.3 20.1 5.98" fill="none" stroke="rgba(255,255,255,0.72)" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  </section>
</template>
