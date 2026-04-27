<script setup lang="ts">
import type { MessengerConversationMessage } from '../../../entities/conversations/model/useMessengerConversations'
import { useMessengerMarkdown } from '../lib/useMessengerMarkdown'
import { extractNumberedOptions, shouldShowQuickLaunch } from '../lib/numberedOptions'
import MessengerMessageReasoningPlate from './MessengerMessageReasoningPlate.vue'
import MessengerQuickLaunchDialog from './MessengerQuickLaunchDialog.vue'

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
  // Id of the message whose inline quick-launch panel is currently expanded.
  // Lifted to the chat section so only one panel is open at a time across
  // the whole thread; this component reflects that state read-only.
  expandedQuickLaunchMessageId?: string | null
  // Conversation context forwarded to the panel — slug seeds the slug field,
  // project + agent ids feed the queue payload.
  quickLaunchConversationSlug?: string | null
  quickLaunchProjectId?: string | null
  quickLaunchAgentId?: string | null
}>(), {
  depth: 0,
  allowForward: true,
  allowMutualDelete: false,
  reactionOptions: () => ['👍', '❤️', '🔥', '😂', '👏', '😮'],
  expandedQuickLaunchMessageId: null,
  quickLaunchConversationSlug: null,
  quickLaunchProjectId: null,
  quickLaunchAgentId: null,
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
  'quick-launch': [payload: { messageId: string; body: string }]
  // Bubbled up from the inline quick-launch panel.
  'quick-launch-close': []
  'quick-launch-launched': [payload: { slug: string }]
  // Centered system bubble action — navigate to the monitor section and
  // highlight the spawned session row.
  'open-monitor': [payload: { slug: string }]
}>()

const { render: renderMarkdown } = useMessengerMarkdown()

const bubbleEl = ref<HTMLElement | null>(null)
const controlsEl = ref<HTMLElement | null>(null)
const controlsPlacement = ref<'above' | 'below'>('above')
let controlsPlacementFrame: number | null = null

const depthStyle = computed(() => ({
  '--message-comment-depth': String(Math.min(props.depth, 4)),
}))

// IDs of every message in the burst (head + folded continuations). Used to
// detect when the parent's active-actions/reactions id targets ANY of our
// folded entries — not just the head — so per-entry context menus work.
const burstEntryIds = computed(() => {
  const burst = props.entry.burst
  if (!burst || burst.length === 0) return [props.entry.id]
  const ids = [props.entry.id]
  for (const m of burst) ids.push(m.id)
  return ids
})

// The burst entry the user is currently acting on. When the user clicks a
// folded continuation, the parent stores that continuation's id in
// activeMessageActionsId — this resolves it back to the underlying message
// so action handlers (react/edit/delete/copy) target the right row, not the
// burst's head.
const activeBurstEntry = computed<MessengerThreadMessage>(() => {
  const activeId = props.activeMessageActionsId ?? props.activeReactionOverlayId
  if (!activeId || activeId === props.entry.id) return props.entry
  const burst = props.entry.burst
  if (!burst) return props.entry
  for (const m of burst) {
    if (m.id === activeId) return m
  }
  return props.entry
})

const controlsOpen = computed(() => {
  if (props.entry.deletedAt) return false
  const ids = burstEntryIds.value
  const actionsId = props.activeMessageActionsId
  const reactionId = props.activeReactionOverlayId
  return (actionsId !== null && ids.includes(actionsId))
    || (reactionId !== null && ids.includes(reactionId))
})

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
  rawBody: string
  parsedBody: string
  renderedBody: string
  replySuggestions: string[]
  numberedOptions: string[]
}

function extractReplySuggestions(body: string): string[] {
  const match = body.match(REPLY_SUGGESTIONS_RE)
  if (!match) return []
  return (match[1] ?? '').split('|').map(s => s.trim()).filter(Boolean).slice(0, 3)
}

// Per-component markdown render cache keyed by message id + body hash.
// Reactions, read receipts, and meta updates re-run `burstEntries` but
// don't change the body, so we serve the cached HTML instead of re-parsing.
// Entries are evicted when the source body actually changes (edit), the
// LRU cap is exceeded (oldest insertion drops), or the component unmounts.
//
// The cap is sized for a typical thread: a bubble plus its comment subtree
// rarely exceeds ~50 distinct messages. 200 covers heavy threads while
// keeping memory bounded on long-lived sessions.
const RENDER_CACHE_MAX = 200
const renderCache = new Map<string, { body: string, html: string }>()

function renderCached(id: string, body: string): string {
  const hit = renderCache.get(id)
  if (hit && hit.body === body) {
    // Re-insert to refresh insertion order — Map iteration is FIFO, so
    // this turns it into a poor-man's LRU.
    renderCache.delete(id)
    renderCache.set(id, hit)
    return hit.html
  }
  const html = renderMarkdown(body)
  renderCache.set(id, { body, html })
  if (renderCache.size > RENDER_CACHE_MAX) {
    const oldest = renderCache.keys().next().value
    if (oldest !== undefined) renderCache.delete(oldest)
  }
  return html
}

const burstEntries = computed<BurstEntryView[]>(() => {
  const all = [props.entry, ...(props.entry.burst ?? [])]
  return all.map((m) => {
    const raw = m.body ?? ''
    const parsed = raw.replace(REPLY_SUGGESTIONS_RE, '').trimEnd()
    // Numbered-list auto-detection mirrors <reply-suggestions>: only for
    // agent-authored messages, and the explicit token wins (when present
    // extractNumberedOptions returns null) so we don't double-render.
    const numbered = m.own ? [] : (extractNumberedOptions(raw)?.options ?? [])
    return {
      id: m.id,
      agentId: m.agentId,
      runId: m.runId,
      createdAt: m.createdAt,
      rawBody: raw,
      parsedBody: parsed,
      renderedBody: renderCached(m.id, parsed),
      replySuggestions: m.own ? [] : extractReplySuggestions(raw),
      numberedOptions: numbered,
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
  // Copy the active entry's body when a folded continuation is selected;
  // copy the whole burst when the head is the target (matches the visual
  // unit a user sees when clicking on the head bubble).
  const activeId = activeBurstEntry.value.id
  const text = activeId === props.entry.id
    ? burstEntries.value.map(e => e.parsedBody).filter(Boolean).join('\n\n')
    : (burstEntries.value.find(e => e.id === activeId)?.parsedBody ?? '')
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

// Auto-detected numbered options on the LAST entry — same trailing-entry
// rule as replySuggestions for the same reason. Suppressed when explicit
// <reply-suggestions> chips are present, so the bubble never shows two
// chip rows competing for the same intent.
const numberedOptions = computed<string[]>(() => {
  if (replySuggestions.value.length) return []
  const last = burstEntries.value[burstEntries.value.length - 1]
  return last ? last.numberedOptions : []
})

const quickLaunchAvailable = computed<boolean>(() => {
  if (props.entry.own) return false
  const last = burstEntries.value[burstEntries.value.length - 1]
  if (!last) return false
  return shouldShowQuickLaunch(last.rawBody)
})

async function copyOptionToClipboard(text: string) {
  if (!text) return
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      emit('copy-text', text, 'Скопировано')
      return
    }
  } catch {
    // Async clipboard refused — fall through to the legacy textarea path.
  }
  // Fallback for non-secure contexts (http dev) where the async clipboard
  // API is unavailable. document.execCommand('copy') is deprecated but the
  // only universally available substitute, so it stays for now.
  if (typeof document === 'undefined') return
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  ta.style.pointerEvents = 'none'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
    emit('copy-text', text, 'Скопировано')
  } catch {
    // Clipboard write blocked — silently noop.
  } finally {
    document.body.removeChild(ta)
  }
}

function handleNumberedOptionContext(event: MouseEvent, text: string) {
  event.preventDefault()
  void copyOptionToClipboard(text)
}

function emitQuickLaunch() {
  const last = burstEntries.value[burstEntries.value.length - 1]
  if (!last) return
  emit('quick-launch', { messageId: last.id, body: last.rawBody })
}

const isQuickLaunchExpanded = computed(() => {
  if (!props.expandedQuickLaunchMessageId) return false
  // Match against any burst entry id — the launch trigger emits the LAST
  // burst entry's id, but the panel's anchor is the head bubble. We accept
  // both so the panel survives a burst rebalance between turns.
  if (props.expandedQuickLaunchMessageId === props.entry.id) return true
  return burstEntryIds.value.includes(props.expandedQuickLaunchMessageId)
})

const quickLaunchExpandedMessageId = computed(() => {
  return isQuickLaunchExpanded.value
    ? (props.expandedQuickLaunchMessageId ?? props.entry.id)
    : props.entry.id
})

const quickLaunchExpandedBody = computed(() => {
  if (!isQuickLaunchExpanded.value) return ''
  const targetId = props.expandedQuickLaunchMessageId
  const hit = burstEntries.value.find(e => e.id === targetId)
  return hit?.rawBody ?? burstEntries.value[burstEntries.value.length - 1]?.rawBody ?? ''
})

// --- system.agent_launched bubble -----------------------------------------

// Live status of the spawned session — sourced from the cli-sessions store
// when present. Renders as a small chip suffix on the system card so the
// operator sees at a glance whether the run is still alive.
const cliSessionsStore = useMessengerCliSessions()

const systemSessionStatus = computed<{ label: string; color: string } | null>(() => {
  if (props.entry.kind !== 'system.agent_launched') return null
  const slug = props.entry.system?.slug
  if (!slug) return null
  const sess = cliSessionsStore.sessions.value.find(s => s.slug === slug)
  if (!sess) return { label: 'нет в мониторе', color: 'surface-variant' }
  if (sess.archivedAt) return { label: 'архив', color: 'surface-variant' }
  if (sess.status === 'running') return { label: 'running', color: 'success' }
  if (sess.status === 'done') return { label: 'done', color: 'info' }
  return { label: sess.status, color: 'surface-variant' }
})

function openMonitorForSystemBubble() {
  const slug = props.entry.system?.slug
  if (!slug) return
  emit('open-monitor', { slug })
}

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

// Unified list of attachments rendered in the bubble. New multi-attach
// messages populate `entry.attachments[]`; legacy single-attachment messages
// stay on `entry.attachment`. We never want to render the same attachment
// twice, so prefer the array when present.
const displayedAttachments = computed(() => {
  if (props.entry.attachments?.length) {
    return props.entry.attachments
  }
  return props.entry.attachment ? [props.entry.attachment] : []
})

function isStickerOf(attachment: NonNullable<typeof props.entry.attachment>) {
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

  // Resolve which folded burst entry the click landed on so per-entry
  // actions target the right id. Falls back to the head when the click
  // hits chrome (meta row, divider, etc) outside any entry div.
  const target = event.target instanceof HTMLElement ? event.target : null
  const entryEl = target?.closest<HTMLElement>('[data-burst-entry-id]') ?? null
  const targetId = entryEl?.getAttribute('data-burst-entry-id') ?? props.entry.id

  emit('toggle-actions', targetId, event)
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
  <aside
    v-if="entry.kind === 'system.agent_launched'"
    class="system-launch-card"
    :data-message-id="entry.id"
  >
    <VIcon :size="18" class="system-launch-card__icon">mdi-rocket-launch</VIcon>
    <span class="system-launch-card__label">Запущен агент</span>
    <code v-if="entry.system?.slug" class="system-launch-card__slug" :title="entry.system.slug">
      {{ entry.system.slug }}
    </code>
    <VChip
      v-if="entry.system?.model"
      size="x-small"
      label
      color="secondary"
      variant="tonal"
      class="system-launch-card__chip"
    >
      {{ entry.system.model }}
    </VChip>
    <VChip
      v-if="systemSessionStatus"
      size="x-small"
      label
      :color="systemSessionStatus.color"
      variant="tonal"
      class="system-launch-card__chip"
    >
      {{ systemSessionStatus.label }}
    </VChip>
    <VSpacer />
    <VBtn
      size="x-small"
      variant="tonal"
      color="primary"
      prepend-icon="mdi-eye-outline"
      :disabled="!entry.system?.slug"
      @click.stop="openMonitorForSystemBubble"
    >
      Открыть монитор
    </VBtn>
  </aside>
  <article
    v-else
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
              :key="`${activeBurstEntry.id}-quick-${emoji}`"
              class="message-reaction-btn message-reaction-btn--quick"
              :class="{ 'message-reaction-btn--active': activeBurstEntry.reactions?.some(reaction => reaction.emoji === emoji && reaction.own) }"
              variant="tonal"
              @click.stop="emit('react', activeBurstEntry.id, emoji)"
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
              @click.stop="emit('comment', activeBurstEntry.id)"
            >
              <MessengerIcon name="comment" :size="18" />
            </VBtn>
            <VBtn
              class="message-action-btn"
              icon
              variant="text"
              aria-label="Ответить"
              title="Ответить"
              @click.stop="emit('reply', activeBurstEntry.id)"
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
              @click.stop="emit('forward', activeBurstEntry.id)"
            >
              <MessengerIcon name="forward" :size="18" />
            </VBtn>
            <VBtn
              v-if="activeBurstEntry.kind === 'text' && activeBurstEntry.body"
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
              v-if="activeBurstEntry.own && activeBurstEntry.kind === 'text'"
              class="message-action-btn"
              icon
              variant="text"
              aria-label="Изменить"
              title="Изменить"
              :disabled="editingMessageId === activeBurstEntry.id"
              @click.stop="emit('edit', activeBurstEntry.id, activeBurstEntry.body)"
            >
              <MessengerIcon name="edit" :size="18" />
            </VBtn>
            <VBtn
              v-if="activeBurstEntry.own || allowMutualDelete"
              class="message-action-btn"
              icon
              variant="text"
              aria-label="Удалить"
              title="Удалить"
              :disabled="editingMessageId === activeBurstEntry.id || messagePending"
              @click.stop="emit('remove', activeBurstEntry.id)"
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
    <template v-if="displayedAttachments.length">
      <div
        v-for="(att, attIdx) in displayedAttachments"
        :key="`${entry.id}-att-${attIdx}`"
        class="attachment-slot"
      >
        <div v-if="att.mimeType.startsWith('audio/')" class="voice-player-shell">
          <MessengerAudioBubblePlayer
            :src="att.resolvedUrl"
            :label="att.name"
          />
        </div>
        <button
          v-else-if="!att.mimeType.startsWith('image/')"
          type="button"
          class="attachment-card attachment-card--button"
          @click.stop="emit('copy-link', att.resolvedUrl, att.name)"
        >
          <span class="attachment-card__title">{{ att.name }}</span>
          <span class="attachment-card__meta">{{ att.mimeType }} · {{ Math.ceil(att.size / 1024) }} KB</span>
        </button>
        <img
          v-else
          class="attachment-preview"
          :class="{
            'attachment-preview--sticker': isStickerOf(att),
            'attachment-preview--interactive': !isStickerOf(att),
          }"
          :src="att.resolvedUrl"
          :alt="att.name"
          @click.stop="handleAttachmentPreviewClick"
        >
      </div>
    </template>
    <div v-if="editingMessageId === entry.id" class="message-bubble__editor">
      <textarea
        :value="editingDraft"
        rows="3"
        class="composer-input message-bubble__textarea"
        @input="handleEditInput"
        @keydown="emit('edit-keydown', $event)"
        @blur="emit('save-edit')"
      />
    </div>
    <div v-else-if="entry.kind !== 'file'" class="message-bubble__content">
      <template v-for="(burstEntry, burstIdx) in burstEntries" :key="burstEntry.id">
        <div v-if="burstIdx > 0" class="message-bubble__burst-divider">
          <span class="message-bubble__burst-divider-time">{{ formatMessageTime(burstEntry.createdAt) }}</span>
        </div>
        <div
          class="message-bubble__text message-body"
          :class="{
            'message-bubble__text--continuation': burstIdx > 0,
            'message-bubble__text--active': activeBurstEntry.id === burstEntry.id && burstIdx > 0,
          }"
          :data-burst-entry-id="burstEntry.id"
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
        <button
          v-if="quickLaunchAvailable"
          type="button"
          class="quick-launch-btn"
          title="Запустить агентом"
          aria-label="Запустить агентом"
          @click.stop="emitQuickLaunch"
        >
          <VIcon size="14">mdi-rocket-launch</VIcon>
          <span>Запустить агентом</span>
        </button>
      </div>
      <div
        v-else-if="numberedOptions.length"
        class="reply-suggestions reply-suggestions--numbered"
        data-message-controls="true"
      >
        <span
          v-for="(text, idx) in numberedOptions"
          :key="`${entry.id}-numbered-${idx}`"
          class="reply-suggestion-chip reply-suggestion-chip--numbered"
        >
          <button
            type="button"
            class="reply-suggestion-chip__main"
            :title="text"
            @click.stop="emit('reply-suggestion-click', text)"
            @contextmenu="handleNumberedOptionContext($event, text)"
          >
            <span class="reply-suggestion-chip__index">{{ idx + 1 }}.</span>
            <span class="reply-suggestion-chip__text">{{ text }}</span>
          </button>
          <button
            type="button"
            class="reply-suggestion-chip__copy"
            title="Скопировать"
            aria-label="Скопировать"
            @click.stop="copyOptionToClipboard(text)"
          >
            <VIcon size="14">mdi-content-copy</VIcon>
          </button>
        </span>
        <button
          v-if="quickLaunchAvailable"
          type="button"
          class="quick-launch-btn"
          title="Запустить агентом"
          aria-label="Запустить агентом"
          @click.stop="emitQuickLaunch"
        >
          <VIcon size="14">mdi-rocket-launch</VIcon>
          <span>Запустить агентом</span>
        </button>
      </div>
      <div
        v-else-if="quickLaunchAvailable"
        class="reply-suggestions reply-suggestions--launch-only"
        data-message-controls="true"
      >
        <button
          type="button"
          class="quick-launch-btn"
          title="Запустить агентом"
          aria-label="Запустить агентом"
          @click.stop="emitQuickLaunch"
        >
          <VIcon size="14">mdi-rocket-launch</VIcon>
          <span>Запустить агентом</span>
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
      <!-- Stable identifiers footer. Lets the operator quote a specific
           bubble/run by short id ("msg:abc12345") in conversation; click
           copies the full uuid so it can be pasted into a DB query. -->
      <div class="message-bubble__id-footer" data-message-controls="true">
        <button
          type="button"
          class="message-bubble__id-chip"
          :title="`Сообщение ${entry.id} · клик — скопировать`"
          @click.stop="copyOptionToClipboard(entry.id)"
        >msg:{{ entry.id.slice(0, 8) }}</button>
        <button
          v-if="entry.runId"
          type="button"
          class="message-bubble__id-chip"
          :title="`Прогон ${entry.runId} · клик — скопировать`"
          @click.stop="copyOptionToClipboard(entry.runId!)"
        >run:{{ entry.runId.slice(0, 8) }}</button>
        <span
          v-if="entry.senderDisplayName"
          class="message-bubble__id-chip message-bubble__id-chip--name"
          :title="entry.senderDisplayName"
        >{{ entry.senderDisplayName }}</span>
      </div>
    </div>

    <MessengerQuickLaunchDialog
      v-if="isQuickLaunchExpanded"
      :open="true"
      :message-id="quickLaunchExpandedMessageId"
      :body="quickLaunchExpandedBody"
      :conversation-slug="quickLaunchConversationSlug"
      :default-project-id="quickLaunchProjectId"
      :default-agent-id="quickLaunchAgentId"
      @close="emit('quick-launch-close')"
      @launched="emit('quick-launch-launched', $event)"
    />

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
        :expanded-quick-launch-message-id="expandedQuickLaunchMessageId"
        :quick-launch-conversation-slug="quickLaunchConversationSlug"
        :quick-launch-project-id="quickLaunchProjectId"
        :quick-launch-agent-id="quickLaunchAgentId"
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
        @quick-launch="emit('quick-launch', $event)"
        @quick-launch-close="emit('quick-launch-close')"
        @quick-launch-launched="emit('quick-launch-launched', $event)"
        @open-monitor="emit('open-monitor', $event)"
      />
    </div>
  </article>
</template>