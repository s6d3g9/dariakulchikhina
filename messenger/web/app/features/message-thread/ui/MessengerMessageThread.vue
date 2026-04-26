<script setup lang="ts">
import type { MessengerConversationMessage } from '../../../entities/conversations/model/useMessengerConversations'
import { useMessengerMarkdown } from '../lib/useMessengerMarkdown'
import MessengerMessageReasoningPlate from './MessengerMessageReasoningPlate.vue'

export interface MessengerThreadMessage extends MessengerConversationMessage {
  comments: MessengerThreadMessage[]
  // Adjacent agent messages from the same task (sequential continuations
  // or sibling sub-agent runs) are folded into the head message's `burst`.
  // The head's own body/runId is rendered first, then each burst entry's
  // body in stacked order. All runs share one reasoning section.
  burst?: MessengerThreadMessage[]
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
  'reply-suggestion-click': [text: string]
  'open-run': [runId: string]
  'copy-text': [value: string, toast: string]
  'quote-code': [code: string]
}>()

const { render: renderMarkdown } = useMessengerMarkdown()

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

const REPLY_SUGGESTIONS_RE = /<reply-suggestions>([^<]*)<\/reply-suggestions>\s*$/

const copiedFlash = ref(false)
let copiedFlashTimer: ReturnType<typeof setTimeout> | null = null

interface BurstEntryView {
  id: string
  agentId?: string
  runId?: string
  createdAt: string
  parsedBody: string
  renderedBody: string
  replySuggestions: string[]
}

function extractReplySuggestions(body: string): string[] {
  const match = body.match(REPLY_SUGGESTIONS_RE)
  if (!match) return []
  return (match[1] ?? '').split('|').map(s => s.trim()).filter(Boolean).slice(0, 3)
}

const burstEntries = computed<BurstEntryView[]>(() => {
  const all = [props.entry, ...(props.entry.burst ?? [])]
  return all.map((m) => {
    const raw = m.body ?? ''
    const parsed = raw.replace(REPLY_SUGGESTIONS_RE, '').trimEnd()
    return {
      id: m.id,
      agentId: m.agentId,
      runId: m.runId,
      createdAt: m.createdAt,
      parsedBody: parsed,
      renderedBody: renderMarkdown(parsed),
      replySuggestions: m.own ? [] : extractReplySuggestions(raw),
    }
  })
})

// One reasoning plate per unique runId across the burst (head + folded
// continuations). Order is preserved so the first run shows up first.
// Skipped on own messages to avoid surfacing run UI on user-authored bubbles.
const reasoningPlates = computed(() => {
  if (props.entry.own) return []
  const seen = new Set<string>()
  const plates: { id: string, agentId: string, runId: string }[] = []
  for (const e of burstEntries.value) {
    if (e.agentId && e.runId && !seen.has(e.runId)) {
      seen.add(e.runId)
      plates.push({ id: `${e.agentId}-${e.runId}`, agentId: e.agentId, runId: e.runId })
    }
  }
  return plates
})

async function copyMessageBody() {
  const text = burstEntries.value
    .map(e => e.parsedBody)
    .filter(Boolean)
    .join('\n\n')
  if (!text) return
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    }
    copiedFlash.value = true
    if (copiedFlashTimer) clearTimeout(copiedFlashTimer)
    copiedFlashTimer = setTimeout(() => {
      copiedFlash.value = false
      copiedFlashTimer = null
    }, 1500)
  } catch {
    // Clipboard write blocked — silently noop, the user can retry.
  }
}

function handleBodyClick(event: MouseEvent) {
  const target = event.target instanceof HTMLElement ? event.target : null
  if (!target) return

  const fileChip = target.closest<HTMLElement>('.md-file-chip')
  if (fileChip) {
    event.stopPropagation()
    const path = fileChip.getAttribute('data-file-path') ?? ''
    if (path) emit('copy-text', path, `Путь скопирован: ${path}`)
    return
  }

  const codeBtn = target.closest<HTMLElement>('.md-code-block__btn')
  if (codeBtn) {
    event.stopPropagation()
    const action = codeBtn.getAttribute('data-action')
    const encoded = codeBtn.getAttribute('data-code') ?? ''
    let code = ''
    try {
      code = decodeURIComponent(encoded)
    } catch {
      code = encoded
    }
    if (action === 'copy-code') emit('copy-text', code, 'Код скопирован')
    else if (action === 'quote-code') emit('quote-code', code)
    return
  }

  // Markdown-rendered links (<a href>) navigate themselves; just stop the
  // click from bubbling up to handleBubbleClick (which would also pop the
  // action menu, since <a> isn't in isInteractiveTarget's selector list).
  if (target.closest('a[href]')) {
    event.stopPropagation()
  }
}

// Suggestions come from the LAST entry in the burst — the most recent agent
// turn is the one a user would actually be replying to.
const replySuggestions = computed<string[]>(() => {
  const last = burstEntries.value[burstEntries.value.length - 1]
  return last ? last.replySuggestions : []
})

const sentTime = computed(() => formatMessageTime(props.entry.createdAt))
const lastBurstTime = computed(() => {
  const list = burstEntries.value
  if (list.length <= 1) return ''
  return formatMessageTime(list[list.length - 1]?.createdAt)
})
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
  if (copiedFlashTimer) {
    clearTimeout(copiedFlashTimer)
    copiedFlashTimer = null
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
              v-if="entry.kind === 'text' && entry.body"
              class="message-action-btn"
              :class="{ 'message-action-btn--flashed': copiedFlash }"
              icon
              variant="text"
              aria-label="Копировать текст"
              :title="copiedFlash ? 'Скопировано' : 'Копировать текст'"
              @click.stop="copyMessageBody"
            >
              <MessengerIcon name="copy" :size="18" />
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
      <template v-for="(burstEntry, burstIdx) in burstEntries" :key="burstEntry.id">
        <div
          v-if="burstIdx > 0"
          class="message-bubble__burst-divider"
          :title="formatMessageTime(burstEntry.createdAt)"
        />
        <div
          class="message-bubble__text message-body"
          :class="{ 'message-bubble__text--continuation': burstIdx > 0 }"
          @click="handleBodyClick"
          v-html="burstEntry.renderedBody"
        />
      </template>
      <div v-if="replySuggestions.length" class="reply-suggestions" data-message-controls="true">
        <button
          v-for="(text, idx) in replySuggestions"
          :key="`${entry.id}-suggestion-${idx}`"
          type="button"
          class="reply-suggestion-chip"
          @click.stop="emit('reply-suggestion-click', text)"
        >
          {{ text }}
        </button>
      </div>
      <MessengerMessageReasoningPlate
        v-for="plate in reasoningPlates"
        :key="plate.id"
        :agent-id="plate.agentId"
        :run-id="plate.runId"
      />
      <div class="message-bubble__meta-row">
        <span class="message-bubble__time message-bubble__time--sent">{{ sentTime }}</span>
        <span v-if="lastBurstTime" class="message-bubble__time message-bubble__time--range">→ {{ lastBurstTime }}</span>
        <span v-if="metaStatus" class="message-bubble__status">{{ metaStatus }}</span>
        <span v-if="readTime" class="message-bubble__time message-bubble__time--read">{{ readTime }}</span>
        <button
          v-for="plate in reasoningPlates"
          :key="`${plate.id}-badge`"
          type="button"
          class="message-bubble__run-badge"
          :title="`Открыть прогон ${plate.runId}`"
          data-message-controls="true"
          @click.stop="emit('open-run', plate.runId)"
        >
          #{{ plate.runId.slice(0, 8) }}
        </button>
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
        @reply-suggestion-click="emit('reply-suggestion-click', $event)"
        @open-run="emit('open-run', $event)"
        @copy-text="(value, toast) => emit('copy-text', value, toast)"
        @quote-code="emit('quote-code', $event)"
      />
    </div>
  </article>
</template>