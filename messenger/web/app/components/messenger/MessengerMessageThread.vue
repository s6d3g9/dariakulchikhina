<script setup lang="ts">
import type { MessengerConversationMessage } from '../../composables/useMessengerConversations'

export interface MessengerThreadMessage extends MessengerConversationMessage {
  comments: MessengerThreadMessage[]
}

const props = withDefaults(defineProps<{
  entry: MessengerThreadMessage
  depth?: number
  activeMessageActionsId: string | null
  editingMessageId: string | null
  editingDraft: string
  messagePending: boolean
  allowForward?: boolean
  allowMutualDelete?: boolean
}>(), {
  depth: 0,
  allowForward: true,
  allowMutualDelete: false,
})

const emit = defineEmits<{
  'toggle-actions': [messageId: string, event: MouseEvent]
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
}>()

const depthStyle = computed(() => ({
  '--message-comment-depth': String(Math.min(props.depth, 4)),
}))

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

function handleEditInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('edit-draft', target.value)
}
</script>

<template>
  <article
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
    @click.stop="!entry.deletedAt ? emit('toggle-actions', entry.id, $event) : undefined"
  >
    <Transition name="message-actions-pop">
      <div v-if="!entry.deletedAt && activeMessageActionsId === entry.id" class="message-bubble__topline" data-message-action-menu="true" @pointerdown.stop>
        <div class="message-bubble__actions">
          <button
            type="button"
            class="message-action-btn"
            @click.stop="emit('comment', entry.id)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7.5 18.25 4.75 19l.75-2.55V8.25A2.5 2.5 0 0 1 8 5.75h8A2.5 2.5 0 0 1 18.5 8.25v5.5a2.5 2.5 0 0 1-2.5 2.5H9.45l-1.95 2Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
            </svg>
            Коммент.
          </button>
          <button
            type="button"
            class="message-action-btn"
            @click.stop="emit('reply', entry.id)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 8.25 5.5 12 10 15.75" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
              <path d="M6 12h6.75a5.75 5.75 0 0 1 5.75 5.75" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
            </svg>
            Ответить
          </button>
          <button
            v-if="allowForward"
            type="button"
            class="message-action-btn"
            @click.stop="emit('forward', entry.id)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13.25 5.75 18.5 11l-5.25 5.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
              <path d="M5.5 11H18" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
            </svg>
            Переслать
          </button>
          <button
            v-if="entry.own && entry.kind === 'text'"
            type="button"
            class="message-action-btn"
            :disabled="editingMessageId === entry.id"
            @click.stop="emit('edit', entry.id, entry.body)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m8 16 6.8-6.8 1.95 1.95L10 17.95H8V16Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
              <path d="M13.7 7.25 15 5.95a1.38 1.38 0 1 1 1.95 1.95l-1.3 1.3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
            </svg>
            Изменить
          </button>
          <button
            v-if="entry.own || allowMutualDelete"
            type="button"
            class="message-action-btn"
            :disabled="editingMessageId === entry.id || messagePending"
            @click.stop="emit('remove', entry.id)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 8.5h8M9.25 8.5V7a1.25 1.25 0 0 1 1.25-1.25h3a1.25 1.25 0 0 1 1.25 1.25v1.5M7.25 8.5l.55 8.1A1.5 1.5 0 0 0 9.3 18h5.4a1.5 1.5 0 0 0 1.5-1.4l.55-8.1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
            </svg>
            Удалить
          </button>
        </div>
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
      <audio
        v-if="entry.attachment.mimeType.startsWith('audio/')"
        class="voice-player"
        controls
        preload="metadata"
        :src="entry.attachment.absoluteUrl"
      />
      <button
        v-if="!entry.attachment.mimeType.startsWith('audio/') && !entry.attachment.mimeType.startsWith('image/')"
        type="button"
        class="attachment-card attachment-card--button"
        @click.stop="emit('copy-link', entry.attachment.absoluteUrl, entry.attachment.name)"
      >
        <span class="attachment-card__title">{{ entry.attachment.name }}</span>
        <span class="attachment-card__meta">{{ entry.attachment.mimeType }} · {{ Math.ceil(entry.attachment.size / 1024) }} KB</span>
      </button>
      <img
        v-if="entry.attachment.mimeType.startsWith('image/')"
        class="attachment-preview"
        :src="entry.attachment.absoluteUrl"
        :alt="entry.attachment.name"
        @click.stop="emit('open-photo', entry.id)"
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
      <div class="message-bubble__meta-row">
        <span class="message-bubble__time message-bubble__time--sent">{{ sentTime }}</span>
        <span v-if="metaStatus" class="message-bubble__status">{{ metaStatus }}</span>
        <span v-if="readTime" class="message-bubble__time message-bubble__time--read">{{ readTime }}</span>
      </div>
    </div>

    <div v-if="entry.comments.length" class="message-comments">
      <MessengerMessageThread
        v-for="comment in entry.comments"
        :key="comment.id"
        :entry="comment"
        :depth="depth + 1"
        :active-message-actions-id="activeMessageActionsId"
        :editing-message-id="editingMessageId"
        :editing-draft="editingDraft"
        :message-pending="messagePending"
        :allow-forward="allowForward"
        :allow-mutual-delete="allowMutualDelete"
        @toggle-actions="emit('toggle-actions', $event[0], $event[1])"
        @comment="emit('comment', $event)"
        @reply="emit('reply', $event)"
        @forward="emit('forward', $event)"
        @edit="emit('edit', $event[0], $event[1])"
        @remove="emit('remove', $event)"
        @edit-draft="emit('edit-draft', $event)"
        @edit-keydown="emit('edit-keydown', $event)"
        @save-edit="emit('save-edit')"
        @copy-link="emit('copy-link', $event[0], $event[1])"
        @open-photo="emit('open-photo', $event)"
      />
    </div>
  </article>
</template>