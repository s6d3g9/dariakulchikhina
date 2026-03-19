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
        title: entry.attachment.name,
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

function openFilePicker() {
  fileInput.value?.click()
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
    input.value = ''
  } catch {
    actionError.value = 'Не удалось загрузить файл.'
  }
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
  detailsOpen.value = true
  activeMessageActionsId.value = null
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

  input.style.height = '0px'
  const nextHeight = Math.min(Math.max(input.scrollHeight, 48), 144)
  input.style.height = `${nextHeight}px`
  input.style.overflowY = input.scrollHeight > 144 ? 'auto' : 'hidden'
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

function relationPreviewText(message: { body: string; kind: 'text' | 'file'; attachment?: { name: string } } | null) {
  if (!message) {
    return ''
  }

  if (message.kind === 'file') {
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
      :class="{ 'section-block--chat-details-open': detailsOpen && conversations.activeConversation.value }"
      :style="chatLayoutStyle"
    >
      <header class="section-head section-head--chat-header">
        <button
          type="button"
          class="chat-user-trigger chat-user-trigger--profile"
          :disabled="!conversations.activeConversation.value"
          @click="toggleDetails"
        >
          <span class="chat-avatar">{{ activePeerAvatar }}</span>
          <span class="chat-user-meta">
            <span class="chat-user-name">{{ activePeerName }}</span>
          </span>
        </button>

        <div class="section-actions section-actions--cluster">
          <button
            type="button"
            class="icon-btn"
            aria-label="Аудиозвонок"
            :disabled="!conversations.activeConversation.value || conversations.messagePending.value || !calls.supported.value || !!calls.activeCall.value || calls.requestingPermissions.value"
            @click="startCall('audio')"
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

      <div v-if="!detailsOpen || !conversations.activeConversation.value" ref="composerBarEl" class="composer-bar composer-bar--dock">
        <input ref="fileInput" type="file" class="sr-only" @change="handleFileSelect">
        <div class="composer-segment composer-segment--attach">
          <button type="button" class="composer-btn" aria-label="Прикрепить файл" :disabled="!conversations.activeConversation.value || conversations.messagePending.value" @click="openFilePicker">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9.1 12.9 15.8 6.2a3.35 3.35 0 1 1 4.74 4.73l-8.1 8.1a5.2 5.2 0 1 1-7.35-7.36l7.05-7.05" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.85"/>
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
            :class="{ 'composer-btn--recording': isRecording }"
            :disabled="!conversations.activeConversation.value || conversations.messagePending.value || !canRecordAudio"
            @click="toggleAudioRecording"
          >
            <span v-if="isRecording">{{ `${recordingSeconds}s` }}</span>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 15.25a3.25 3.25 0 0 0 3.25-3.25V7.5a3.25 3.25 0 1 0-6.5 0V12A3.25 3.25 0 0 0 12 15.25Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
              <path d="M6.75 11.75a5.25 5.25 0 0 0 10.5 0M12 17v2.5M9 19.5h6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
            </svg>
          </button>
          <button type="button" class="composer-btn composer-btn--accent" aria-label="Отправить сообщение" :disabled="!conversations.activeConversation.value || conversations.messagePending.value" @pointerdown="preserveComposerFocus" @click="submit">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12.1 19.36 5.9c.8-.35 1.58.43 1.23 1.23L14.4 21.49c-.36.84-1.57.82-1.91-.03l-1.93-4.82-4.82-1.93c-.85-.34-.87-1.55-.03-1.91Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
              <path d="M10.37 16.63 20.08 6.92" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  </section>
</template>
