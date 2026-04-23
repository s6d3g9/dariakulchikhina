<script setup lang="ts">
import type { MessengerConversationMessage } from '../../../entities/conversations/model/useMessengerConversations'
import MessengerMessageReasoningPlate from './MessengerMessageReasoningPlate.vue'

export interface MessengerThreadMessage extends MessengerConversationMessage {
  comments: MessengerThreadMessage[]
}

const props = withDefaults(defineProps<{
  entry: MessengerThreadMessage
  depth?: number
  activeMessageActionsId: string | null
  activeReactionOverlayId: string | null
  editingMessageId: string | null
  editingDraft: string
  messagePending: boolean
  allowForward?: boolean
  allowMutualDelete?: boolean
  reactionOptions?: string[]
}>(), {
  depth: 0,
  allowForward: true,
  allowMutualDelete: false,
  reactionOptions: () => ['👍', '❤️', '🔥', '😂', '👏', '😮'],
})

const emit = defineEmits<{
  'toggle-actions': [messageId: string, event?: MouseEvent]
  'toggle-reaction-overlay': [messageId: string]
  comment: [messageId: string]
  reply: [messageId: string]
  forward: [messageId: string]
  edit: [messageId: string, body: string]
  remove: [messageId: string]
  'edit-draft': [value: string]
  'edit-keydown': [event: KeyboardEvent]
  'save-edit': []
  'copy-link': [href: string, label: string]
  'open-photo': [messageId: string]
  react: [messageId: string, emoji: string]
}>()

const bubbleEl = ref<HTMLElement | null>(null)
const controlsEl = ref<HTMLElement | null>(null)
const controlsPlacement = ref<'above' | 'below'>('above')
let controlsPlacementFrame: number | null = null

const depthStyle = computed(() => ({
  '--message-comment-depth': String(Math.min(props.depth, 4)),
}))

const controlsOpen = computed(() => !props.entry.deletedAt
  && (props.activeMessageActionsId === props.entry.id || props.activeReactionOverlayId === props.entry.id))

function syncControlsPlacement() {
  if (!import.meta.client || !controlsOpen.value) {
    controlsPlacement.value = 'above'
    return
  }

  const bubble = bubbleEl.value
  const controls = controlsEl.value

  if (!bubble || !controls) {
    controlsPlacement.value = 'above'
    return
  }

  const header = document.querySelector('.chat-header')
  const headerBottom = header instanceof HTMLElement ? header.getBoundingClientRect().bottom : 0
  const bubbleRect = bubble.getBoundingClientRect()
  const controlsHeight = controls.getBoundingClientRect().height

  controlsPlacement.value = bubbleRect.top - controlsHeight - 4 < headerBottom + 8 ? 'below' : 'above'
}

function scheduleControlsPlacementSync() {
  if (!import.meta.client) {
    return
  }

  if (controlsPlacementFrame !== null) {
    cancelAnimationFrame(controlsPlacementFrame)
  }

  controlsPlacementFrame = requestAnimationFrame(() => {
    controlsPlacementFrame = null
    syncControlsPlacement()
  })
}

watch(controlsOpen, (value) => {
  if (!value) {
    controlsPlacement.value = 'above'

    if (controlsPlacementFrame !== null) {
      cancelAnimationFrame(controlsPlacementFrame)
      controlsPlacementFrame = null
    }

    return
  }

  nextTick(() => {
    scheduleControlsPlacementSync()
  })
})

function formatMessageTime(value?: string) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const sentTime = computed(() => formatMessageTime(props.entry.createdAt))
const readTime = computed(() => props.entry.own ? formatMessageTime(props.entry.readAt) : '')
const metaStatus = computed(() => {
  if (props.entry.deletedAt) {
    return 'Удалено'
  }

  if (props.entry.editedAt) {
    return 'Изменено'
  }

  return ''
})

function relationPreviewText(message: { body: string; kind: 'text' | 'file'; attachment?: { name: string, mimeType: string } } | null) {
  if (!message) {
    return ''
  }

  if (message.kind === 'file') {
    if (message.attachment?.mimeType.startsWith('audio/')) {
      return 'Аудиосообщение'
    }

    return message.attachment?.name || 'Файл'
  }

  return message.body
}

function isStickerAttachment() {
  const attachment = props.entry.attachment
  if (!attachment) {
    return false
  }

  return attachment.klipy?.kind === 'sticker' || attachment.mimeType === 'image/webp'
}

function handleAttachmentPreviewClick() {
  if (isStickerAttachment()) {
    return
  }

  emit('open-photo', props.entry.id)
}

function handleEditInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('edit-draft', target.value)
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement
    && Boolean(target.closest('button, textarea, audio, img, input, [data-message-controls="true"]'))
}

function handleBubbleClick(event: MouseEvent) {
  if (props.entry.deletedAt || isInteractiveTarget(event.target)) {
    return
  }

  emit('toggle-actions', props.entry.id, event)
}

onBeforeUnmount(() => {
  if (controlsPlacementFrame !== null) {
    cancelAnimationFrame(controlsPlacementFrame)
    controlsPlacementFrame = null
  }
})
</script>

<template>
  <article
    ref="bubbleEl"
    class="message-bubble"
    :class="{
      'message-bubble--own': entry.own,
      'message-bubble--deleted': Boolean(entry.deletedAt),
      'message-bubble--actions-open': activeMessageActionsId === entry.id,
      'message-bubble--comment': depth > 0,
    }"
    :style="depthStyle"
    data-message-action-root="true"
    :data-message-id="entry.id"
    @click.stop="handleBubbleClick"
  >
    <Transition name="message-actions-pop">
      <div
        v-if="controlsOpen"
        ref="controlsEl"
        class="message-bubble__controls"
        :class="{ 'message-bubble__controls--below': controlsPlacement === 'below' }"
        data-message-controls="true"
        @pointerdown.stop
      >
        <VCard class="message-bubble__controls-card" color="surface" variant="tonal">
          <VCardText class="message-bubble__controls-body">
        <div class="message-bubble__topline message-bubble__topline--reactions" data-message-reaction-menu="true">
          <div class="message-bubble__reaction-overlay">
            <VBtn
              v-for="emoji in reactionOptions"
              :key="`${entry.id}-quick-${emoji}`"
              class="message-reaction-btn message-reaction-btn--quick"
              :class="{ 'message-reaction-btn--active': entry.reactions?.some(reaction => reaction.emoji === emoji && reaction.own) }"
              variant="tonal"
              @click.stop="emit('react', entry.id, emoji)"
            >
              {{ emoji }}
            </VBtn>
          </div>
        </div>

        <div class="message-bubble__topline message-bubble__topline--actions" data-message-action-menu="true">
          <div class="message-bubble__actions">
            <VBtn
              class="message-action-btn"
              icon
              variant="text"
              aria-label="Комментировать"
              title="Комментировать"
              @click.stop="emit('comment', entry.id)"
            >
              <MessengerIcon name="comment" :size="18" />
            </VBtn>
            <VBtn
              class="message-action-btn"
              icon
              variant="text"
              aria-label="Ответить"
              title="Ответить"
              @click.stop="emit('reply', entry.id)"
            >
              <MessengerIcon name="reply" :size="18" />
            </VBtn>
            <VBtn
              v-if="allowForward"
              class="message-action-btn"
              icon
              variant="text"
              aria-label="Переслать"
              title="Переслать"
              @click.stop="emit('forward', entry.id)"
            >
              <MessengerIcon name="forward" :size="18" />
            </VBtn>
            <VBtn
              v-if="entry.own && entry.kind === 'text'"
              class="message-action-btn"
              icon
              variant="text"
              aria-label="Изменить"
              title="Изменить"
              :disabled="editingMessageId === entry.id"
              @click.stop="emit('edit', entry.id, entry.body)"
            >
              <MessengerIcon name="edit" :size="18" />
            </VBtn>
            <VBtn
              v-if="entry.own || allowMutualDelete"
              class="message-action-btn"
              icon
              variant="text"
              aria-label="Удалить"
              title="Удалить"
              :disabled="editingMessageId === entry.id || messagePending"
              @click.stop="emit('remove', entry.id)"
            >
              <MessengerIcon name="delete" :size="18" />
            </VBtn>
          </div>
        </div>
          </VCardText>
        </VCard>
      </div>
    </Transition>
    <div v-if="entry.forwardedFrom" class="message-relation-card message-relation-card--forwarded">
      <p class="message-relation-card__label">Переслано от {{ entry.forwardedFrom.senderDisplayName }}</p>
      <p class="message-relation-card__text">{{ relationPreviewText(entry.forwardedFrom) }}</p>
    </div>
    <div v-if="entry.replyTo" class="message-relation-card message-relation-card--reply">
      <p class="message-relation-card__label">Ответ на сообщение {{ entry.replyTo.own ? 'от вас' : `от ${entry.replyTo.senderDisplayName}` }}</p>
      <p class="message-relation-card__text">{{ relationPreviewText(entry.replyTo) }}</p>
    </div>
    <template v-if="entry.kind === 'file' && entry.attachment">
      <div v-if="entry.attachment.mimeType.startsWith('audio/')" class="voice-player-shell">
        <MessengerAudioBubblePlayer
          :src="entry.attachment.resolvedUrl"
          :label="entry.attachment.name"
        />
      </div>
      <button
        v-if="!entry.attachment.mimeType.startsWith('audio/') && !entry.attachment.mimeType.startsWith('image/')"
        type="button"
        class="attachment-card attachment-card--button"
        @click.stop="emit('copy-link', entry.attachment.resolvedUrl, entry.attachment.name)"
      >
        <span class="attachment-card__title">{{ entry.attachment.name }}</span>
        <span class="attachment-card__meta">{{ entry.attachment.mimeType }} · {{ Math.ceil(entry.attachment.size / 1024) }} KB</span>
      </button>
      <img
        v-if="entry.attachment.mimeType.startsWith('image/')"
        class="attachment-preview"
        :class="{
          'attachment-preview--sticker': isStickerAttachment(),
          'attachment-preview--interactive': !isStickerAttachment(),
        }"
        :src="entry.attachment.resolvedUrl"
        :alt="entry.attachment.name"
        @click.stop="handleAttachmentPreviewClick"
      >
    </template>
    <div v-else-if="editingMessageId === entry.id" class="message-bubble__editor">
      <textarea
        :value="editingDraft"
        rows="3"
        class="composer-input message-bubble__textarea"
        @input="handleEditInput"
        @keydown="emit('edit-keydown', $event)"
        @blur="emit('save-edit')"
      />
    </div>
    <div v-else class="message-bubble__content">
      <p class="message-bubble__text">{{ entry.body }}</p>
      <MessengerMessageReasoningPlate
        v-if="entry.agentId && entry.runId"
        :agent-id="entry.agentId"
        :run-id="entry.runId"
      />
      <div class="message-bubble__meta-row">
        <span class="message-bubble__time message-bubble__time--sent">{{ sentTime }}</span>
        <span v-if="metaStatus" class="message-bubble__status">{{ metaStatus }}</span>
        <span v-if="readTime" class="message-bubble__time message-bubble__time--read">{{ readTime }}</span>
      </div>
    </div>

    <div v-if="entry.reactions?.length" class="message-reactions">
      <button
        v-for="reaction in entry.reactions"
        :key="`${entry.id}-${reaction.emoji}`"
        type="button"
        class="message-reactions__item"
        :class="{ 'message-reactions__item--own': reaction.own }"
        @click.stop="emit('react', entry.id, reaction.emoji)"
      >
        <span class="message-reactions__emoji">{{ reaction.emoji }}</span>
        <span class="message-reactions__count">{{ reaction.count }}</span>
      </button>
    </div>

    <div v-if="entry.comments.length" class="message-comments">
      <MessengerMessageThread
        v-for="comment in entry.comments"
        :key="comment.id"
        :entry="comment"
        :depth="depth + 1"
        :active-message-actions-id="activeMessageActionsId"
        :active-reaction-overlay-id="activeReactionOverlayId"
        :editing-message-id="editingMessageId"
        :editing-draft="editingDraft"
        :message-pending="messagePending"
        :allow-forward="allowForward"
        :allow-mutual-delete="allowMutualDelete"
        :reaction-options="reactionOptions"
        @toggle-actions="(messageId, event) => emit('toggle-actions', messageId, event)"
        @toggle-reaction-overlay="emit('toggle-reaction-overlay', $event)"
        @comment="emit('comment', $event)"
        @reply="emit('reply', $event)"
        @forward="emit('forward', $event)"
        @edit="(messageId, body) => emit('edit', messageId, body)"
        @remove="emit('remove', $event)"
        @edit-draft="emit('edit-draft', $event)"
        @edit-keydown="emit('edit-keydown', $event)"
        @save-edit="emit('save-edit')"
        @copy-link="(href, label) => emit('copy-link', href, label)"
        @open-photo="emit('open-photo', $event)"
        @react="(messageId, emoji) => emit('react', messageId, emoji)"
      />
    </div>
  </article>
</template>