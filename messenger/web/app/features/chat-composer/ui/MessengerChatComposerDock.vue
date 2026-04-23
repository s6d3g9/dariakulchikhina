<script setup lang="ts">
interface MessengerAudioDraftViewModel {
  url: string
  duration: number
  trimStart: number
  trimEnd: number
  waveformLevels: number[]
}

const props = defineProps<{
  visible: boolean
  draft: string
  mediaMenuOpen: boolean
  activeConversation: boolean
  showAgentMenuToggle?: boolean
  agentMenuExpanded?: boolean
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
  attachmentIds?: string[]
}>()

const emit = defineEmits<{
  'update:draft': [value: string]
  'focus': []
  'blur': []
  'input': []
  'file-select': [event: Event]
  'toggle-media-menu': []
  'open-file-picker': []
  'toggle-agent-workspace': []
  'toggle-project-actions': []
  'primary-pointerdown': [event: PointerEvent]
  'primary-action': []
  'cancel-audio-draft': []
  'update:audio-trim-start': [value: number]
  'update:audio-trim-end': [value: number]
  'run-started': [value?: Record<string, unknown>]
}>()

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
    <div ref="projectActionsRootEl" class="composer-dock-wrapper" :class="{ 'composer-dock-wrapper--project-actions-open': props.projectActionsOpen }">
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
          :data-placeholder="'Сообщение'"
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
          placeholder="Сообщение"
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
            v-if="props.showAgentMenuToggle"
            type="button"
            class="composer-btn composer-btn--inside"
            icon
            variant="text"
            :aria-label="props.agentMenuExpanded ? 'Свернуть меню агента' : 'Развернуть меню агента'"
            @click="emit('toggle-agent-workspace')"
          >
            <VIcon :icon="props.agentMenuExpanded ? 'mdi-unfold-less-horizontal' : 'mdi-unfold-more-horizontal'" size="20" />
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
</style>