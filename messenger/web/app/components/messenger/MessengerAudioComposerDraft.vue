<script setup lang="ts">
interface MessengerAudioDraftViewModel {
  url: string
  duration: number
  trimStart: number
  trimEnd: number
  waveformLevels: number[]
}

const props = withDefaults(defineProps<{
  mode: 'recording' | 'preview'
  recordingSeconds?: number
  recordingLevels?: number[]
  recordingIntensity?: number
  audioDraft?: MessengerAudioDraftViewModel | null
  pending?: boolean
}>(), {
  recordingSeconds: 0,
  recordingLevels: () => [],
  recordingIntensity: 0.12,
  audioDraft: null,
  pending: false,
})

const emit = defineEmits<{
  cancel: []
  'primary-action': []
  'update:trim-start': [value: number]
  'update:trim-end': [value: number]
}>()

const audioEl = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const activeTrimHandle = ref<'start' | 'end' | null>(null)

const duration = computed(() => Math.max(props.audioDraft?.duration || 0, props.recordingSeconds || 0, 0.01))
const trimStart = computed(() => props.audioDraft?.trimStart || 0)
const trimEnd = computed(() => props.audioDraft?.trimEnd || duration.value)
const trimmedDuration = computed(() => Math.max(trimEnd.value - trimStart.value, 0))
const waveformLevels = computed(() => {
  const levels = props.mode === 'recording' ? props.recordingLevels : props.audioDraft?.waveformLevels
  return levels?.length ? levels : Array.from({ length: 56 }, () => 0.18)
})

const styleVars = computed<Record<string, string>>(() => ({
  '--audio-trim-start': `${(trimStart.value / duration.value) * 100}%`,
  '--audio-trim-end': `${(trimEnd.value / duration.value) * 100}%`,
  '--audio-progress': `${(currentTime.value / duration.value) * 100}%`,
  '--audio-recording-intensity': String(Math.max(0.12, props.recordingIntensity || 0.12)),
}))

watch(() => props.audioDraft?.url, () => {
  pauseAudio()
  currentTime.value = trimStart.value
}, { immediate: true })

watch([trimStart, trimEnd], () => {
  if (currentTime.value < trimStart.value || currentTime.value > trimEnd.value) {
    currentTime.value = trimStart.value
  }

  if (audioEl.value && (audioEl.value.currentTime < trimStart.value || audioEl.value.currentTime > trimEnd.value)) {
    audioEl.value.currentTime = trimStart.value
  }
})

onBeforeUnmount(() => {
  pauseAudio()
})

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function formatTime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function pauseAudio() {
  if (audioEl.value) {
    audioEl.value.pause()
  }

  isPlaying.value = false
}

function handleLoadedMetadata() {
  if (!audioEl.value || props.mode !== 'preview') {
    return
  }

  audioEl.value.currentTime = trimStart.value
  currentTime.value = trimStart.value
}

function handleTimeUpdate() {
  if (!audioEl.value || props.mode !== 'preview') {
    return
  }

  const nextTime = audioEl.value.currentTime
  if (nextTime >= trimEnd.value) {
    audioEl.value.pause()
    audioEl.value.currentTime = trimStart.value
    currentTime.value = trimStart.value
    isPlaying.value = false
    return
  }

  currentTime.value = nextTime
}

function togglePlayback() {
  if (!audioEl.value || props.mode !== 'preview') {
    return
  }

  if (isPlaying.value) {
    pauseAudio()
    return
  }

  if (audioEl.value.currentTime < trimStart.value || audioEl.value.currentTime >= trimEnd.value) {
    audioEl.value.currentTime = trimStart.value
  }

  currentTime.value = audioEl.value.currentTime
  void audioEl.value.play().then(() => {
    isPlaying.value = true
  }).catch(() => {
    isPlaying.value = false
  })
}

function handleSeek(event: Event) {
  if (!audioEl.value || props.mode !== 'preview') {
    return
  }

  const target = event.target as HTMLInputElement
  const nextValue = clamp(Number(target.value), trimStart.value, trimEnd.value)
  audioEl.value.currentTime = nextValue
  currentTime.value = nextValue
}

function handleTrimStart(event: Event) {
  const target = event.target as HTMLInputElement
  const nextValue = clamp(Number(target.value), 0, Math.max(trimEnd.value - 0.35, 0))
  emit('update:trim-start', nextValue)
}

function handleTrimEnd(event: Event) {
  const target = event.target as HTMLInputElement
  const nextValue = clamp(Number(target.value), Math.min(trimStart.value + 0.35, duration.value), duration.value)
  emit('update:trim-end', nextValue)
}

function setActiveTrimHandle(handle: 'start' | 'end' | null) {
  activeTrimHandle.value = handle
}
</script>

<template>
  <div class="audio-draft" :class="[`audio-draft--${props.mode}`]" :style="styleVars">
    <div class="audio-draft__header">
      <VBtn
        type="button"
        class="audio-draft__header-btn"
        icon
        variant="text"
        aria-label="Отменить аудио"
        :disabled="props.pending"
        @click="emit('cancel')"
      >
        <MessengerIcon name="close" :size="18" />
      </VBtn>

      <div class="audio-draft__status">
        <p class="audio-draft__eyebrow">{{ props.mode === 'recording' ? 'Запись аудиосообщения' : 'Голосовое сообщение' }}</p>
        <p class="audio-draft__title">{{ props.mode === 'recording' ? 'Идёт запись, поле реагирует на голос' : 'Прослушайте, перемотайте и обрежьте перед отправкой' }}</p>
      </div>

      <VBtn
        type="button"
        class="audio-draft__header-btn audio-draft__header-btn--primary"
        icon
        :variant="props.mode === 'recording' ? 'tonal' : 'flat'"
        :color="props.mode === 'recording' ? undefined : 'primary'"
        :aria-label="props.mode === 'recording' ? 'Остановить запись' : 'Отправить аудиосообщение'"
        :disabled="props.pending"
        @click="emit('primary-action')"
      >
        <VIcon v-if="props.mode === 'recording'">mdi-stop</VIcon>
        <MessengerIcon v-else name="send" :size="18" />
      </VBtn>
    </div>

    <div class="audio-draft__surface">
      <div class="audio-draft__waveform-rail">
        <div class="audio-draft__shade audio-draft__shade--before"></div>
        <div class="audio-draft__shade audio-draft__shade--after"></div>
        <div class="audio-draft__trim-window"></div>
        <div class="audio-draft__progress"></div>
        <div class="audio-draft__trim-outline"></div>
        <div class="audio-draft__waveform">
          <span
            v-for="(level, index) in waveformLevels"
            :key="`${props.mode}-${index}`"
            class="audio-draft__bar"
            :style="{ height: `${Math.max(10, Math.round(level * 100))}%` }"
          ></span>
        </div>

        <template v-if="props.mode === 'preview' && props.audioDraft">
          <input
            class="audio-draft__range audio-draft__range--seek"
            type="range"
            :min="0"
            :max="props.audioDraft.duration"
            :step="0.01"
            :value="currentTime"
            aria-label="Перемотка аудио"
            @input="handleSeek"
          >
          <input
            class="audio-draft__range audio-draft__range--trim-start"
            type="range"
            :min="0"
            :max="props.audioDraft.duration"
            :step="0.01"
            :value="props.audioDraft.trimStart"
            aria-label="Начало обрезки"
            @pointerdown="setActiveTrimHandle('start')"
            @input="handleTrimStart"
            @pointerup="setActiveTrimHandle(null)"
            @blur="setActiveTrimHandle(null)"
          >
          <input
            class="audio-draft__range audio-draft__range--trim-end"
            type="range"
            :min="0"
            :max="props.audioDraft.duration"
            :step="0.01"
            :value="props.audioDraft.trimEnd"
            aria-label="Конец обрезки"
            @pointerdown="setActiveTrimHandle('end')"
            @input="handleTrimEnd"
            @pointerup="setActiveTrimHandle(null)"
            @blur="setActiveTrimHandle(null)"
          >
          <div
            class="audio-draft__handle audio-draft__handle--start"
            :class="{ 'audio-draft__handle--active': activeTrimHandle === 'start' }"
            aria-hidden="true"
          >
            <span class="audio-draft__handle-grip"></span>
          </div>
          <div
            class="audio-draft__handle audio-draft__handle--end"
            :class="{ 'audio-draft__handle--active': activeTrimHandle === 'end' }"
            aria-hidden="true"
          >
            <span class="audio-draft__handle-grip"></span>
          </div>
        </template>
      </div>

      <div class="audio-draft__controls">
        <template v-if="props.mode === 'preview' && props.audioDraft">
          <VBtn
            type="button"
            class="audio-draft__play-btn"
            :icon="isPlaying ? 'mdi-pause' : 'mdi-play'"
            variant="tonal"
            @click="togglePlayback"
          />
          <div class="audio-draft__metrics">
            <span class="audio-draft__metric">{{ formatTime(currentTime) }}</span>
            <span class="audio-draft__metric audio-draft__metric--trim">{{ formatTime(trimStart) }} – {{ formatTime(trimEnd) }}</span>
            <span class="audio-draft__metric">{{ formatTime(trimmedDuration) }}</span>
          </div>
          <audio
            ref="audioEl"
            class="audio-draft__audio"
            preload="metadata"
            :src="props.audioDraft.url"
            @loadedmetadata="handleLoadedMetadata"
            @timeupdate="handleTimeUpdate"
            @pause="isPlaying = false"
            @play="isPlaying = true"
          />
        </template>

        <template v-else>
          <div class="audio-draft__metrics audio-draft__metrics--recording">
            <span class="audio-draft__record-dot"></span>
            <span class="audio-draft__metric">{{ formatTime(props.recordingSeconds) }}</span>
            <span class="audio-draft__metric audio-draft__metric--trim">Градиент и waveform реагируют на громкость записи</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>