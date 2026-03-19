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
}>(), {
  depth: 0,
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

function relationPreviewText(message: { body: string; kind: 'text' | 'file'; attachment?: { name: string } } | null) {
  if (!message) {
    return ''
  }

  if (message.kind === 'file') {
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
    <div v-if="!entry.deletedAt && activeMessageActionsId === entry.id" class="message-bubble__topline" data-message-action-menu="true" @pointerdown.stop>
      <div class="message-bubble__actions">
        <button
          type="button"
          class="message-action-btn"
          @click.stop="emit('comment', entry.id)"
        >
          Комм.
        </button>
        <button
          type="button"
          class="message-action-btn"
          @click.stop="emit('reply', entry.id)"
        >
          Ответ
        </button>
        <button
          type="button"
          class="message-action-btn"
          @click.stop="emit('forward', entry.id)"
        >
          Пересл.
        </button>
        <button
          v-if="entry.own && entry.kind === 'text'"
          type="button"
          class="message-action-btn"
          :disabled="editingMessageId === entry.id"
          @click.stop="emit('edit', entry.id, entry.body)"
        >
          Ред.
        </button>
        <button
          v-if="entry.own"
          type="button"
          class="message-action-btn"
          :disabled="editingMessageId === entry.id || messagePending"
          @click.stop="emit('remove', entry.id)"
        >
          Удал.
        </button>
      </div>
    </div>
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
      <p v-if="entry.editedAt && !entry.deletedAt" class="message-bubble__status">Изменено</p>
      <p v-if="entry.deletedAt" class="message-bubble__status">Удалено</p>
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