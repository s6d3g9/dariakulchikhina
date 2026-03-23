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
  'open-photo-picker': []
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
    <input ref="fileInputEl" type="file" hidden aria-hidden="true" tabindex="-1" @change="emit('file-select', $event)">
    <div ref="composerBarEl" class="composer-bar">
      <MessengerDockField>
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

        <textarea
          ref="composerInputEl"
          :value="props.draft"
          rows="1"
          class="composer-input composer-input--framed"
          placeholder=""
          :disabled="!props.activeConversation"
          @input="emit('update:draft', ($event.target as HTMLTextAreaElement).value); emit('input')"
          @focus="emit('focus')"
          @blur="emit('blur')"
        />

        <template #trailing>
          <VBtn
            type="button"
            class="composer-btn composer-btn--inside"
            icon
            variant="text"
            aria-label="Прикрепить файл"
            :disabled="!props.activeConversation || props.messagePending"
            @click="emit('open-photo-picker')"
          >
            <MessengerIcon name="paperclip" :size="22" />
          </VBtn>

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
            <MessengerIcon v-else name="send" :size="22" />
          </VBtn>
        </template>
      </MessengerDockField>
    </div>
  </template>
</template>