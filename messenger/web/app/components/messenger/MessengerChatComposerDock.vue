<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  draft: string
  mediaMenuOpen: boolean
  activeConversation: boolean
  messagePending: boolean
  isRecording: boolean
  recordingSeconds: number
  composerPrimaryMode: 'record' | 'send' | 'stop-recording'
  composerPrimaryDisabled: boolean
  hasSelectedKlipyItem: boolean
}>()

const emit = defineEmits<{
  'update:draft': [value: string]
  'focus': []
  'blur': []
  'input': []
  'file-select': [event: Event]
  'toggle-media-menu': []
  'open-file-picker': []
  'primary-pointerdown': [event: PointerEvent]
  'primary-action': []
}>()

const fileInputEl = ref<HTMLInputElement | null>(null)
const composerBarEl = ref<HTMLDivElement | null>(null)
const composerInputEl = ref<HTMLTextAreaElement | null>(null)

defineExpose({
  fileInputEl,
  composerBarEl,
  composerInputEl,
})
</script>

<template>
  <template v-if="props.visible">
    <input ref="fileInputEl" type="file" class="sr-only" @change="emit('file-select', $event)">
    <div ref="composerBarEl" class="composer-bar composer-bar--dock">
      <VCard class="composer-bar__card" color="surface" variant="tonal">
        <VCardText class="composer-bar__body">
          <div class="composer-segment composer-segment--attach">
            <VBtn
              type="button"
              class="composer-btn"
              variant="tonal"
              :aria-label="props.mediaMenuOpen ? 'Закрыть меню смайлов, стикеров и GIF KLIPY' : 'Открыть меню смайлов, стикеров и GIF KLIPY'"
              :disabled="!props.activeConversation || props.messagePending"
              @click="emit('toggle-media-menu')"
            >
              <MessengerIcon name="smile" :size="18" />
            </VBtn>
          </div>
          <div class="composer-field">
            <textarea
              ref="composerInputEl"
              :value="props.draft"
              rows="1"
              class="composer-input"
              placeholder="Сообщение"
              :disabled="!props.activeConversation"
              @input="emit('update:draft', ($event.target as HTMLTextAreaElement).value); emit('input')"
              @focus="emit('focus')"
              @blur="emit('blur')"
            />
          </div>
          <div class="composer-segment composer-segment--actions">
            <VBtn
              type="button"
              class="composer-btn"
              variant="tonal"
              aria-label="Прикрепить файл"
              :disabled="!props.activeConversation || props.messagePending"
              @click="emit('open-file-picker')"
            >
              <MessengerIcon name="paperclip" :size="18" />
            </VBtn>
            <VBtn
              type="button"
              class="composer-btn"
              :class="{
                'composer-btn--recording': props.isRecording,
                'composer-btn--accent': props.composerPrimaryMode === 'send',
                'composer-btn--audio-primary': props.composerPrimaryMode === 'record',
              }"
              :color="props.composerPrimaryMode === 'send' ? 'primary' : undefined"
              :variant="props.composerPrimaryMode === 'send' ? 'flat' : 'tonal'"
              :aria-label="props.composerPrimaryMode === 'send' ? (props.hasSelectedKlipyItem ? 'Отправить выбранный стикер или GIF' : 'Отправить сообщение') : props.composerPrimaryMode === 'stop-recording' ? 'Остановить запись аудиосообщения' : 'Записать аудиосообщение'"
              :disabled="props.composerPrimaryDisabled"
              @pointerdown="emit('primary-pointerdown', $event)"
              @click="emit('primary-action')"
            >
              <span v-if="props.isRecording">{{ `${props.recordingSeconds}s` }}</span>
              <MessengerIcon v-else-if="props.composerPrimaryMode === 'record'" name="microphone" :size="18" />
              <MessengerIcon v-else name="send" :size="20" />
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </div>
  </template>
</template>