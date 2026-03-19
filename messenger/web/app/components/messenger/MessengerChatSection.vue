<script setup lang="ts">
const conversations = useMessengerConversations()
const holdActions = useMessengerHoldActions()
const draft = ref('')
const actionError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const messageListEl = ref<HTMLElement | null>(null)
const composerInputEl = ref<HTMLTextAreaElement | null>(null)
const detailsOpen = ref(false)
const copiedLabel = ref('')
const isRecording = ref(false)
const recordingSeconds = ref(0)
const canRecordAudio = ref(false)
const calls = useMessengerCalls()
const composerExpanded = ref(false)
const editingMessageId = ref<string | null>(null)
const editingDraft = ref('')

let mediaRecorder: MediaRecorder | null = null
let mediaStream: MediaStream | null = null
let recordingTimer: ReturnType<typeof setInterval> | null = null
let composerAlignTimer: ReturnType<typeof setTimeout> | null = null

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

onMounted(async () => {
  canRecordAudio.value = Boolean(import.meta.client && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined')
  await conversations.refresh()
  if (conversations.activeConversationId.value) {
    await conversations.loadMessages()
    await scrollMessagesToBottom('auto')
  }
})

onBeforeUnmount(() => {
  stopRecordingTimer()
  stopStreamTracks()
  if (composerAlignTimer) {
    clearTimeout(composerAlignTimer)
    composerAlignTimer = null
  }
  mediaRecorder = null
})

watch(() => conversations.activeConversationId.value, async () => {
  detailsOpen.value = false
  composerExpanded.value = false
  await scrollMessagesToBottom('auto')
})

watch(() => detailsOpen.value, (opened) => {
  if (opened) {
    composerExpanded.value = false
  }
})

watch(() => conversations.activeConversationId.value, () => {
  editingMessageId.value = null
  editingDraft.value = ''
})

watch(() => conversations.messages.value.length, async (currentLength, previousLength) => {
  if (!currentLength || detailsOpen.value || currentLength === previousLength) {
    return
  }

  await scrollMessagesToBottom(previousLength > 0 ? 'smooth' : 'auto')
})

async function submit() {
  actionError.value = ''
  if (!draft.value.trim()) {
    return
  }

  try {
    await conversations.sendMessage(draft.value)
    draft.value = ''
    composerExpanded.value = false
  } catch {
    actionError.value = 'Не удалось отправить сообщение.'
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

  detailsOpen.value = !detailsOpen.value
}

function closeDetails() {
  detailsOpen.value = false
}

function toggleComposerExpanded() {
  if (!conversations.activeConversation.value) {
    return
  }

  composerExpanded.value = !composerExpanded.value
}

function scheduleComposerAlignment() {
  if (!import.meta.client) {
    return
  }

  const alignComposer = async () => {
    await scrollMessagesToBottom('auto')
    composerInputEl.value?.scrollIntoView({ block: 'nearest' })
  }

  void alignComposer()

  if (composerAlignTimer) {
    clearTimeout(composerAlignTimer)
  }

  composerAlignTimer = setTimeout(() => {
    void alignComposer()
    composerAlignTimer = null
  }, 260)
}

function expandComposer() {
  composerExpanded.value = true
  scheduleComposerAlignment()
}

function collapseComposer() {
  if (!draft.value.trim()) {
    composerExpanded.value = false
  }
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
  holdActions.dismiss()
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
    holdActions.dismiss()
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
</script>

<template>
  <section class="chat-screen" aria-label="Chat section">
    <section
      class="section-block section-block--chat"
      :class="{ 'section-block--chat-details-open': detailsOpen && conversations.activeConversation.value }"
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

        <div class="section-actions">
          <button
            type="button"
            class="icon-btn"
            aria-label="Аудиозвонок"
            :disabled="!conversations.activeConversation.value || conversations.messagePending.value || !calls.supported.value || !!calls.activeCall.value || calls.requestingPermissions.value"
            @click="startCall('audio')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.8 4.5h2.8l1.4 3.8-1.8 1.7a14.7 14.7 0 0 0 4.8 4.8l1.7-1.8 3.8 1.4v2.8a1.7 1.7 0 0 1-1.8 1.7C10.6 18.9 5.1 13.4 5.1 6.3A1.7 1.7 0 0 1 6.8 4.5Z" fill="currentColor"/>
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
              <path d="M4.5 7.5A2.5 2.5 0 0 1 7 5h7a2.5 2.5 0 0 1 2.5 2.5v1.4l3-1.9a.9.9 0 0 1 1.4.8v8.4a.9.9 0 0 1-1.4.8l-3-1.9v1.4A2.5 2.5 0 0 1 14 19H7a2.5 2.5 0 0 1-2.5-2.5v-9Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </header>


      <p v-if="actionError" class="auth-error">{{ actionError }}</p>
  <p v-else-if="calls.requestingPermissions.value" class="copy-toast">Запрашиваем доступ к микрофону{{ conversations.activeConversation.value ? '' : '' }}…</p>
      <p v-else-if="copiedLabel" class="copy-toast">{{ copiedLabel }}</p>

      <div class="chat-reading-shell">
        <div ref="messageListEl" class="message-list message-list--chat-scroll">
          <article
            v-for="entry in conversations.messages.value"
            :key="entry.id"
            class="message-bubble"
            :class="{ 'message-bubble--own': entry.own, 'message-bubble--deleted': Boolean(entry.deletedAt), 'message-bubble--hold-open': holdActions.activeItemId.value === entry.id }"
            data-hold-actions-root="true"
            @pointerdown="entry.own && !entry.deletedAt ? holdActions.startHold(entry.id, $event) : undefined"
            @pointerup="holdActions.cancelHold()"
            @pointerleave="holdActions.cancelHold()"
            @pointercancel="holdActions.cancelHold()"
          >
            <div class="message-bubble__topline">
              <p class="message-bubble__author">{{ entry.own ? 'Вы' : entry.senderDisplayName }}</p>
              <div v-if="entry.own && !entry.deletedAt && holdActions.activeItemId.value === entry.id" class="message-bubble__actions" data-hold-actions-menu="true" @pointerdown.stop>
                <button
                  v-if="entry.kind === 'text'"
                  type="button"
                  class="message-action-btn"
                  :disabled="conversations.editingMessageId.value === entry.id"
                  @click="startEditingMessage(entry.id, entry.body)"
                >
                  Ред.
                </button>
                <button
                  type="button"
                  class="message-action-btn"
                  :disabled="conversations.editingMessageId.value === entry.id"
                  @click="removeMessage(entry.id)"
                >
                  Удал.
                </button>
              </div>
            </div>
            <template v-if="entry.kind === 'file' && entry.attachment">
              <audio
                v-if="entry.attachment.mimeType.startsWith('audio/')"
                class="voice-player"
                controls
                preload="metadata"
                :src="entry.attachment.absoluteUrl"
              />
              <button
                type="button"
                class="attachment-card attachment-card--button"
                @click="copyLink(entry.attachment.absoluteUrl, entry.attachment.name)"
              >
                <span class="attachment-card__title">{{ entry.attachment.name }}</span>
                <span class="attachment-card__meta">{{ entry.attachment.mimeType }} · {{ Math.ceil(entry.attachment.size / 1024) }} KB</span>
              </button>
              <img
                v-if="entry.attachment.mimeType.startsWith('image/')"
                class="attachment-preview"
                :src="entry.attachment.absoluteUrl"
                :alt="entry.attachment.name"
                @click="copyLink(entry.attachment.absoluteUrl, entry.attachment.name)"
              >
            </template>
            <div v-else-if="editingMessageId === entry.id" class="message-bubble__editor">
              <textarea
                v-model="editingDraft"
                rows="3"
                class="composer-input message-bubble__textarea"
                @keydown="handleEditKeydown"
                @blur="saveEditedMessage"
              />
            </div>
            <div v-else class="message-bubble__content">
              <p class="message-bubble__text">{{ entry.body }}</p>
              <p v-if="entry.editedAt && !entry.deletedAt" class="message-bubble__status">Изменено</p>
              <p v-if="entry.deletedAt" class="message-bubble__status">Удалено</p>
            </div>
          </article>

          <article v-if="!conversations.activeConversation.value" class="list-card list-card--panel">
            <div class="list-card__main">
              <p class="list-card__title">Чат не выбран</p>
              <p class="list-card__text">Откройте контакт и создайте direct-чат, затем здесь появится переписка.</p>
            </div>
          </article>

          <article v-else-if="!conversations.messages.value.length" class="list-card list-card--panel">
            <div class="list-card__main">
              <p class="list-card__title">Пока пусто</p>
              <p class="list-card__text">Отправьте первое текстовое сообщение в этом direct-чате.</p>
            </div>
          </article>
        </div>

        <section v-if="detailsOpen && conversations.activeConversation.value" class="content-drawer content-drawer--dock" aria-label="Shared content menu">
          <div class="content-drawer__head">
            <div class="content-drawer__copy">
              <p class="content-drawer__title">Контент от {{ conversations.activeConversation.value.peerDisplayName }}</p>
              <p class="content-drawer__hint">Полноэкранный режим внутри окна чата. Нажатие на карточку копирует ссылку.</p>
            </div>
            <button type="button" class="icon-btn" aria-label="Закрыть контент" @click="closeDetails">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6.7 6.7a1 1 0 0 1 1.4 0L12 10.6l3.9-3.9a1 1 0 1 1 1.4 1.4L13.4 12l3.9 3.9a1 1 0 0 1-1.4 1.4L12 13.4l-3.9 3.9a1 1 0 0 1-1.4-1.4l3.9-3.9-3.9-3.9a1 1 0 0 1 0-1.4Z" fill="currentColor"/>
              </svg>
            </button>
          </div>

          <div class="content-groups">
            <section class="content-group">
              <div class="content-group__header">
                <p class="content-group__title">Фото</p>
                <span class="content-group__count">{{ sharedContent.photos.length }}</span>
              </div>
              <div v-if="sharedContent.photos.length" class="content-grid content-grid--photos">
                <button
                  v-for="photo in sharedContent.photos"
                  :key="photo.id"
                  type="button"
                  class="content-card content-card--photo"
                  @click="copyLink(photo.href, photo.title)"
                >
                  <img :src="photo.previewUrl" :alt="photo.title" class="content-card__image">
                  <span class="content-card__caption">{{ photo.title }}</span>
                </button>
              </div>
              <p v-else class="content-empty">Пока нет фотографий.</p>
            </section>

            <section class="content-group">
              <div class="content-group__header">
                <p class="content-group__title">Документы</p>
                <span class="content-group__count">{{ sharedContent.documents.length }}</span>
              </div>
              <div v-if="sharedContent.documents.length" class="content-grid">
                <button
                  v-for="doc in sharedContent.documents"
                  :key="doc.id"
                  type="button"
                  class="content-card"
                  @click="copyLink(doc.href, doc.title)"
                >
                  <span class="content-card__title">{{ doc.title }}</span>
                  <span class="content-card__meta">{{ doc.meta }}</span>
                </button>
              </div>
              <p v-else class="content-empty">Пока нет документов.</p>
            </section>

            <section class="content-group">
              <div class="content-group__header">
                <p class="content-group__title">Ссылки</p>
                <span class="content-group__count">{{ sharedContent.links.length }}</span>
              </div>
              <div v-if="sharedContent.links.length" class="content-grid">
                <button
                  v-for="link in sharedContent.links"
                  :key="link.id"
                  type="button"
                  class="content-card"
                  @click="copyLink(link.href, link.title)"
                >
                  <span class="content-card__title">{{ link.title }}</span>
                  <span class="content-card__meta">{{ link.meta }}</span>
                </button>
              </div>
              <p v-else class="content-empty">Пока нет ссылок.</p>
            </section>
          </div>
        </section>
      </div>

      <div v-if="!detailsOpen || !conversations.activeConversation.value" class="composer-bar composer-bar--dock" :class="{ 'composer-bar--expanded': composerExpanded }">
        <input ref="fileInput" type="file" class="sr-only" @change="handleFileSelect">
        <button type="button" class="composer-btn" :disabled="!conversations.activeConversation.value || conversations.messagePending.value" @click="openFilePicker">+</button>
        <textarea
          ref="composerInputEl"
          v-model="draft"
          :rows="composerExpanded ? 4 : 1"
          class="composer-input"
          placeholder="Сообщение"
          :disabled="!conversations.activeConversation.value"
          @focus="expandComposer"
          @blur="collapseComposer"
        />
        <button
          type="button"
          class="composer-btn composer-btn--toggle"
          :disabled="!conversations.activeConversation.value || conversations.messagePending.value"
          @click="toggleComposerExpanded"
        >
          {{ composerExpanded ? 'Сверн.' : 'Разверн.' }}
        </button>
        <button
          type="button"
          class="composer-btn"
          :class="{ 'composer-btn--recording': isRecording }"
          :disabled="!conversations.activeConversation.value || conversations.messagePending.value || !canRecordAudio"
          @click="toggleAudioRecording"
        >
          <span v-if="isRecording">{{ `${recordingSeconds}s` }}</span>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V7a3.5 3.5 0 1 0-7 0v5a3.5 3.5 0 0 0 3.5 3.5Zm-6-3.9a1 1 0 1 1 2 0 4 4 0 1 0 8 0 1 1 0 1 1 2 0 6 6 0 0 1-5 5.91V21a1 1 0 1 1-2 0v-2.49A6 6 0 0 1 6 11.6Z" fill="currentColor"/>
          </svg>
        </button>
        <button type="button" class="composer-btn composer-btn--accent" :disabled="!conversations.activeConversation.value || conversations.messagePending.value" @click="submit">↑</button>
      </div>
    </section>
  </section>
</template>
