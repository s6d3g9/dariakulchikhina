<script setup lang="ts">
interface MessengerAudioDraftViewModel {
  url: string
  duration: number
  trimStart: number
  trimEnd: number
  waveformLevels: number[]
}

interface StagedAttachmentChip {
  localId: string
  name: string
  mimeType: string
  size: number
  previewObjectUrl: string | null
}

const props = defineProps<{
  visible: boolean
  draft: string
  mediaMenuOpen: boolean
  activeConversation: boolean
  messagePending: boolean
  isRecording: boolean
  recordingSeconds: number
  recordingLevels: number[]
  recordingIntensity: number
  audioDraft: MessengerAudioDraftViewModel | null
  composerPrimaryMode: 'record' | 'send' | 'stop-recording'
  composerPrimaryDisabled: boolean
  hasSelectedKlipyItem: boolean
  showProjectActionsButton?: boolean
  projectActionsOpen?: boolean
  isAgentComposer?: boolean
  showAidevActionsBar?: boolean
  aidevActiveTab?: string | null
  attachmentIds?: string[]
  stagedAttachments?: StagedAttachmentChip[]
  showSearchToggle?: boolean
  searchMode?: boolean
}>()

const emit = defineEmits<{
  'update:draft': [value: string]
  'focus': []
  'blur': []
  'input': []
  'file-select': [event: Event]
  'remove-staged-attachment': [index: number]
  'toggle-media-menu': []
  'open-file-picker': []
  'toggle-project-actions': []
  'select-aidev-tab': [tab: string | null]
  'toggle-search-mode': []
  'primary-pointerdown': [event: PointerEvent]
  'primary-action': []
  'cancel-audio-draft': []
  'update:audio-trim-start': [value: number]
  'update:audio-trim-end': [value: number]
  'run-started': [value?: Record<string, unknown>]
}>()

function formatStagedSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function stagedIconFor(mime: string) {
  if (mime.startsWith('audio/')) return 'mdi-music-note'
  if (mime.startsWith('video/')) return 'mdi-video-outline'
  if (mime.startsWith('image/')) return 'mdi-image-outline'
  if (mime.includes('pdf')) return 'mdi-file-pdf-box'
  return 'mdi-file-document-outline'
}

const fileInputEl = ref<HTMLInputElement | null>(null)
const projectActionsRootEl = ref<HTMLDivElement | null>(null)
const composerBarEl = ref<HTMLDivElement | null>(null)
const composerInputEl = ref<HTMLTextAreaElement | HTMLDivElement | null>(null)

// iOS: contenteditable="plaintext-only" убирает keyboard accessory bar (стрелки ↑↓ и ✓).
// На Android contenteditable ломает IME (Gboard), поэтому там оставляем textarea.
const isAppleTouch = import.meta.client
  && (/iPad|iPhone|iPod/u.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

// Синхронизация textContent с props.draft для contenteditable (когда draft очищается извне)
watch(() => props.draft, (next) => {
  if (!isAppleTouch) return
  const el = composerInputEl.value
  if (!el || el instanceof HTMLTextAreaElement) return
  if ((el.textContent ?? '') !== next) {
    el.textContent = next
  }
})

function onCEInput() {
  const el = composerInputEl.value
  if (!el || el instanceof HTMLTextAreaElement) return
  emit('update:draft', el.textContent ?? '')
  emit('input')
}

function onCEPaste(event: ClipboardEvent) {
  event.preventDefault()
  const text = event.clipboardData?.getData('text/plain') ?? ''
  if (text) document.execCommand('insertText', false, text)
}

function onCEKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    emit('primary-action')
  }
}

defineExpose({
  fileInputEl,
  projectActionsRootEl,
  composerBarEl,
  composerInputEl,
})
</script>

<template>
  <template v-if="props.visible">
    <input ref="fileInputEl" type="file" hidden aria-hidden="true" tabindex="-1" @change="emit('file-select', $event)">
    <div ref="projectActionsRootEl" class="composer-dock-wrapper" :class="{ 'composer-dock-wrapper--project-actions-open': props.projectActionsOpen, 'composer-dock-wrapper--aidev-panel-open': Boolean(props.aidevActiveTab) }">
      <Transition name="composer-aidev-panel">
        <div v-if="props.aidevActiveTab && $slots['aidev-panel']" class="composer-aidev-panel" @click.stop>
          <slot name="aidev-panel" />
        </div>
      </Transition>

      <Transition name="composer-search-panel">
        <div v-if="props.searchMode && $slots['ai-search-panel']" class="composer-search-panel" @click.stop>
          <slot name="ai-search-panel" />
        </div>
      </Transition>

      <MessengerChatAidevActionsBar
        :visible="Boolean(props.showAidevActionsBar) && !props.isRecording && !props.audioDraft"
        :active-tab="props.aidevActiveTab ?? null"
        @select-tab="emit('select-aidev-tab', $event)"
      />

      <button
        v-if="props.showProjectActionsButton && !props.isRecording && !props.audioDraft"
        type="button"
        class="pa-trigger"
        :class="{ 'pa-trigger--active': props.projectActionsOpen }"
        :disabled="!props.activeConversation || props.messagePending"
        aria-label="Проектные действия"
        @click="emit('toggle-project-actions')"
      >
        <VIcon icon="mdi-lightning-bolt" :size="14" />
      </button>
      <div class="composer-bar-anchor">
        <Transition name="composer-project-actions">
          <div v-if="props.projectActionsOpen && $slots['project-actions-panel']" class="composer-project-actions-popover" @click.stop>
            <slot name="project-actions-panel" />
          </div>
        </Transition>

        <Transition name="composer-staged-strip">
          <div
            v-if="(props.stagedAttachments?.length ?? 0) > 0 && !props.isRecording && !props.audioDraft"
            class="composer-staged-strip"
            role="list"
            aria-label="Прикреплённые файлы"
          >
            <div
              v-for="(chip, idx) in props.stagedAttachments"
              :key="chip.localId"
              class="composer-staged-chip"
              role="listitem"
            >
              <img
                v-if="chip.previewObjectUrl"
                class="composer-staged-chip__thumb"
                :src="chip.previewObjectUrl"
                :alt="chip.name"
              >
              <span v-else class="composer-staged-chip__icon" aria-hidden="true">
                <VIcon :icon="stagedIconFor(chip.mimeType)" size="20" />
              </span>
              <span class="composer-staged-chip__meta">
                <span class="composer-staged-chip__name">{{ chip.name }}</span>
                <span class="composer-staged-chip__size">{{ formatStagedSize(chip.size) }}</span>
              </span>
              <button
                type="button"
                class="composer-staged-chip__remove"
                aria-label="Удалить вложение"
                @click="emit('remove-staged-attachment', idx)"
              >
                <VIcon icon="mdi-close" size="14" />
              </button>
            </div>
          </div>
        </Transition>

        <div ref="composerBarEl" class="composer-bar" :class="{ 'composer-bar--audio': props.isRecording || Boolean(props.audioDraft) }">
      <MessengerAudioComposerDraft
        v-if="props.isRecording || props.audioDraft"
        :mode="props.isRecording ? 'recording' : 'preview'"
        :recording-seconds="props.recordingSeconds"
        :recording-levels="props.recordingLevels"
        :recording-intensity="props.recordingIntensity"
        :audio-draft="props.audioDraft"
        :pending="props.messagePending"
        @cancel="emit('cancel-audio-draft')"
        @primary-action="emit('primary-action')"
        @update:trim-start="emit('update:audio-trim-start', $event)"
        @update:trim-end="emit('update:audio-trim-end', $event)"
      />

      <MessengerDockField v-else>
        <template #leading>
          <VBtn
            type="button"
            class="composer-btn composer-btn--inside composer-btn--leading"
            icon
            variant="text"
            :aria-label="props.mediaMenuOpen ? 'Закрыть меню' : 'Смайлы, стикеры, GIF'"
            :disabled="!props.activeConversation || props.messagePending"
            @click="emit('toggle-media-menu')"
          >
            <MessengerIcon name="smile" :size="22" />
          </VBtn>
        </template>

        <!-- iOS: contenteditable div — без keyboard accessory bar -->
        <div
          v-if="isAppleTouch"
          ref="composerInputEl"
          role="textbox"
          aria-multiline="true"
          :contenteditable="!props.activeConversation ? 'false' : 'plaintext-only'"
          class="composer-input composer-input--framed"
          :data-placeholder="props.searchMode ? 'Поиск по AI-меню' : 'Сообщение'"
          enterkeyhint="send"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="sentences"
          spellcheck="false"
          @input="onCEInput"
          @paste="onCEPaste"
          @keydown="onCEKeydown"
          @focus="emit('focus')"
          @blur="emit('blur')"
        />
        <!-- Остальные платформы: стандартный textarea -->
        <textarea
          v-else
          ref="composerInputEl"
          :value="props.draft"
          rows="1"
          class="composer-input composer-input--framed"
          :placeholder="props.searchMode ? 'Поиск по AI-меню' : 'Сообщение'"
          :disabled="!props.activeConversation"
          enterkeyhint="send"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="sentences"
          spellcheck="false"
          @input="emit('update:draft', ($event.target as HTMLTextAreaElement).value); emit('input')"
          @keydown="onCEKeydown"
          @focus="emit('focus')"
          @blur="emit('blur')"
        />

        <template #trailing>
          <VBtn
            v-if="props.showSearchToggle"
            type="button"
            class="composer-btn composer-btn--inside"
            :class="{ 'composer-btn--search-active': props.searchMode }"
            icon
            variant="text"
            :aria-label="props.searchMode ? 'Выключить поиск' : 'Поиск по AI-меню'"
            :title="props.searchMode ? 'Выключить поиск' : 'Поиск по AI-меню'"
            @click="emit('toggle-search-mode')"
          >
            <VIcon :icon="props.searchMode ? 'mdi-magnify-close' : 'mdi-magnify'" size="20" />
          </VBtn>

          <VBtn
            type="button"
            class="composer-btn composer-btn--inside"
            icon
            variant="text"
            aria-label="Прикрепить файл"
            :disabled="!props.activeConversation || props.messagePending"
            @click="emit('open-file-picker')"
          >
            <MessengerIcon name="paperclip" :size="22" />
          </VBtn>

          <!-- Agent-composer "Запустить" button removed: it posted to /agents/:id/runs
               which is a separate (incomplete) pipeline. ALL chats now use the
               unified primary-action path which sends through /conversations/:id/messages
               and the backend dispatches to the CLI session. Icon-only design. -->
          <VBtn
            type="button"
            class="composer-btn composer-btn--inside composer-btn--primary"
            :class="{ 'composer-btn--recording': props.isRecording }"
            icon
            :color="props.composerPrimaryMode === 'send' ? 'primary' : undefined"
            :variant="props.composerPrimaryMode === 'send' ? 'flat' : 'text'"
            :aria-label="props.composerPrimaryMode === 'send'
              ? (props.hasSelectedKlipyItem ? 'Отправить выбранный стикер или GIF' : 'Отправить сообщение')
              : props.composerPrimaryMode === 'stop-recording' ? 'Остановить запись'
              : 'Записать аудиосообщение'"
            :disabled="props.composerPrimaryDisabled"
            @pointerdown="emit('primary-pointerdown', $event)"
            @click="emit('primary-action')"
          >
            <span v-if="props.isRecording" class="label-medium">{{ `${props.recordingSeconds}s` }}</span>
            <MessengerIcon v-else-if="props.composerPrimaryMode === 'record'" name="microphone" :size="22" />
            <MessengerProgressCircular
              v-else-if="props.messagePending"
              class="composer-btn__progress"
              aria-label="Отправка сообщения"
              indeterminate
              size="sm"
            />
            <MessengerIcon v-else name="send" :size="22" />
          </VBtn>
        </template>
      </MessengerDockField>
    </div>
      </div>
    </div>
  </template>
</template>

<style scoped>
.composer-dock-wrapper {
  position: relative;
  display: block;
  width: 100%;
  overflow: visible;
  isolation: isolate;
}

.composer-bar-anchor {
  position: relative;
  display: block;
  width: 100%;
  min-width: 0;
}

.composer-project-actions-popover {
  position: absolute;
  inset-inline: 0;
  bottom: calc(100% + 10px);
  width: 100%;
  max-width: 100%;
  z-index: 30;
}

.composer-aidev-panel {
  position: absolute;
  inset-inline: 0;
  bottom: calc(100% + 8px);
  width: 100%;
  height: clamp(280px, 58vh, 560px);
  z-index: 35;
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-surface-container-low));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 14px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.42), 0 2px 8px rgba(0, 0, 0, 0.28);
  overflow: hidden;
  backdrop-filter: blur(12px);
}

.composer-aidev-panel-enter-active,
.composer-aidev-panel-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
  transform-origin: center bottom;
}
.composer-aidev-panel-enter-from,
.composer-aidev-panel-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.985);
}

.composer-bar {
  width: 100%;
}

.composer-project-actions-enter-active,
.composer-project-actions-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
  transform-origin: left bottom;
}

.composer-project-actions-enter-from,
.composer-project-actions-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
}

@media (max-width: 430px) {
  .composer-project-actions-popover {
    bottom: calc(100% + 8px);
  }
}

.composer-btn--search-active :deep(.v-btn__content),
.composer-btn--search-active :deep(.v-icon) {
  color: rgb(var(--v-theme-primary));
}
.composer-btn--search-active {
  background: rgba(var(--v-theme-primary), 0.14);
  border-radius: 10px;
}

.composer-search-panel {
  position: absolute;
  inset-inline: 0;
  bottom: calc(100% + 8px);
  width: 100%;
  max-height: clamp(200px, 46vh, 440px);
  z-index: 36;
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-surface-container-low));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 14px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.42), 0 2px 8px rgba(0, 0, 0, 0.28);
  overflow: hidden;
  backdrop-filter: blur(12px);
}

.composer-search-panel-enter-active,
.composer-search-panel-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
  transform-origin: center bottom;
}
.composer-search-panel-enter-from,
.composer-search-panel-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
}

.composer-staged-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 8px 4px;
  margin-bottom: 4px;
  max-height: 124px;
  overflow-y: auto;
}

.composer-staged-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 4px 8px 4px 4px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.10);
  max-width: 240px;
}

.composer-staged-chip__thumb {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.composer-staged-chip__icon {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  flex-shrink: 0;
}

.composer-staged-chip__meta {
  display: inline-flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.15;
}

.composer-staged-chip__name {
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.composer-staged-chip__size {
  font-size: 10.5px;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.composer-staged-chip__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.10);
  color: rgb(var(--v-theme-on-surface));
  flex-shrink: 0;
  cursor: pointer;
  transition: background var(--messenger-motion-duration-short, 120ms) var(--messenger-motion-easing-standard, ease);
}

.composer-staged-chip__remove:hover,
.composer-staged-chip__remove:focus-visible {
  background: rgba(var(--v-theme-error), 0.20);
  color: rgb(var(--v-theme-error));
  outline: none;
}

.composer-staged-strip-enter-active,
.composer-staged-strip-leave-active {
  transition: opacity var(--messenger-motion-duration-short, 150ms) var(--messenger-motion-easing-standard, ease),
    transform var(--messenger-motion-duration-short, 150ms) var(--messenger-motion-easing-standard, ease);
  transform-origin: center bottom;
}

.composer-staged-strip-enter-from,
.composer-staged-strip-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>