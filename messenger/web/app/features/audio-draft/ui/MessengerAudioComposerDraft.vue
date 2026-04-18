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
const railEl = ref<HTMLDivElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const activeTrimHandle = ref<'start' | 'end' | null>(null)
const activeTrimPointerId = ref<number | null>(null)

const duration = computed(() => Math.max(props.audioDraft?.duration || 0, props.recordingSeconds || 0, 0.01))
const trimStart = computed(() => props.audioDraft?.trimStart || 0)
const trimEnd = computed(() => props.audioDraft?.trimEnd || duration.value)
const trimmedDuration = computed(() => Math.max(trimEnd.value - trimStart.value, 0))
const progressPercent = computed(() => {
  if (props.mode === 'recording') {
    return Math.min(100, Math.max(18, (props.recordingIntensity || 0.12) * 160))
  }

  if (!trimmedDuration.value) {
    return 0
  }

  return Math.min(100, Math.max(0, ((currentTime.value - trimStart.value) / trimmedDuration.value) * 100))
})
const previewTimeLabel = computed(() => `${formatTime(currentTime.value)} / ${formatTime(trimmedDuration.value || duration.value)}`)
const surfaceAnimated = computed(() => props.mode === 'recording' || isPlaying.value)

const styleVars = computed<Record<string, string>>(() => ({
  '--audio-progress': `${progressPercent.value}%`,
  '--audio-trim-start': `${(trimStart.value / duration.value) * 100}%`,
  '--audio-trim-end': `${(trimEnd.value / duration.value) * 100}%`,
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
  stopTrimDrag()
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

function resolveTrimValueFromPointer(clientX: number) {
  const rect = railEl.value?.getBoundingClientRect()
  if (!rect || !rect.width) {
    return null
  }

  const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
  return ratio * duration.value
}

function handleTrimPointerMove(event: PointerEvent) {
  if (!activeTrimHandle.value || (activeTrimPointerId.value !== null && event.pointerId !== activeTrimPointerId.value)) {
    return
  }

  const nextValue = resolveTrimValueFromPointer(event.clientX)
  if (nextValue === null) {
    return
  }

  if (activeTrimHandle.value === 'start') {
    emit('update:trim-start', clamp(nextValue, 0, Math.max(trimEnd.value - 0.35, 0)))
    return
  }

  emit('update:trim-end', clamp(nextValue, Math.min(trimStart.value + 0.35, duration.value), duration.value))
}

function stopTrimDrag(pointerId?: number) {
  if (pointerId !== undefined && activeTrimPointerId.value !== null && pointerId !== activeTrimPointerId.value) {
    return
  }

  activeTrimPointerId.value = null
  activeTrimHandle.value = null
  window.removeEventListener('pointermove', handleTrimPointerMove)
  window.removeEventListener('pointerup', handleTrimPointerUp)
  window.removeEventListener('pointercancel', handleTrimPointerUp)
}

function handleTrimPointerUp(event: PointerEvent) {
  stopTrimDrag(event.pointerId)
}

function startTrimDrag(handle: 'start' | 'end', event: PointerEvent) {
  if (props.mode !== 'preview' || !props.audioDraft) {
    return
  }

  event.preventDefault()
  pauseAudio()
  setActiveTrimHandle(handle)
  activeTrimPointerId.value = event.pointerId
  window.addEventListener('pointermove', handleTrimPointerMove)
  window.addEventListener('pointerup', handleTrimPointerUp)
  window.addEventListener('pointercancel', handleTrimPointerUp)
  handleTrimPointerMove(event)
}
</script>

<template>
  <div class="audio-draft" :class="{ 'audio-draft--recording': props.mode === 'recording', 'audio-draft--preview': props.mode === 'preview', 'audio-draft--animated': surfaceAnimated }" :style="styleVars">
    <VBtn
      type="button"
      class="audio-draft__edge-btn"
      icon
      variant="text"
      aria-label="Отменить аудио"
      :disabled="props.pending"
      @click="emit('cancel')"
    >
      <MessengerIcon name="close" :size="18" />
    </VBtn>

    <div class="audio-draft__summary">
      <div class="audio-draft__meta-row">
        <button
          v-if="props.mode === 'preview'"
          type="button"
          class="audio-draft__state-btn"
          :aria-label="isPlaying ? 'Пауза' : 'Прослушать аудио'"
          :disabled="props.pending"
          @click="togglePlayback"
        >
          <VIcon size="16">{{ isPlaying ? 'mdi-pause' : 'mdi-play' }}</VIcon>
        </button>
        <span v-else class="audio-draft__state-chip" aria-hidden="true">
          <span class="audio-draft__record-dot"></span>
        </span>

        <span class="audio-draft__label">{{ props.mode === 'recording' ? 'Запись аудио' : 'Голосовое сообщение' }}</span>
        <span class="audio-draft__time">{{ props.mode === 'recording' ? formatTime(props.recordingSeconds) : previewTimeLabel }}</span>
      </div>

      <div ref="railEl" class="audio-draft__rail" :class="{ 'audio-draft__rail--active': surfaceAnimated }">
        <div class="audio-draft__progress"></div>
        <div class="audio-draft__flow"></div>
        <div class="audio-draft__sheen"></div>
        <div class="audio-draft__wave audio-draft__wave--a"></div>
        <div class="audio-draft__wave audio-draft__wave--b"></div>
        <div class="audio-draft__wave audio-draft__wave--c"></div>
        <template v-if="props.mode === 'preview' && props.audioDraft">
          <div class="audio-draft__trim-window"></div>
          <div class="audio-draft__trim-outline"></div>
        </template>
        <input
          v-if="props.mode === 'preview' && props.audioDraft"
          class="audio-draft__seek"
          type="range"
          :min="trimStart"
          :max="trimEnd"
          :step="0.01"
          :value="currentTime"
          aria-label="Перемотка аудио"
          @input="handleSeek"
        >
        <div
          v-if="props.mode === 'preview' && props.audioDraft"
          class="audio-draft__trim-grip audio-draft__trim-grip--start"
          :class="{ 'audio-draft__trim-grip--active': activeTrimHandle === 'start' }"
          role="slider"
          tabindex="0"
          aria-label="Начало обрезки"
          :aria-valuemin="0"
          :aria-valuemax="Math.max(trimEnd - 0.35, 0)"
          :aria-valuenow="trimStart"
          @pointerdown="startTrimDrag('start', $event)"
        ></div>
        <div
          v-if="props.mode === 'preview' && props.audioDraft"
          class="audio-draft__trim-grip audio-draft__trim-grip--end"
          :class="{ 'audio-draft__trim-grip--active': activeTrimHandle === 'end' }"
          role="slider"
          tabindex="0"
          aria-label="Конец обрезки"
          :aria-valuemin="Math.min(trimStart + 0.35, duration)"
          :aria-valuemax="duration"
          :aria-valuenow="trimEnd"
          @pointerdown="startTrimDrag('end', $event)"
        ></div>
        <div
          v-if="props.mode === 'preview' && props.audioDraft"
          class="audio-draft__trim-handle audio-draft__trim-handle--start"
          :class="{ 'audio-draft__trim-handle--active': activeTrimHandle === 'start' }"
          aria-hidden="true"
        ></div>
        <div
          v-if="props.mode === 'preview' && props.audioDraft"
          class="audio-draft__trim-handle audio-draft__trim-handle--end"
          :class="{ 'audio-draft__trim-handle--active': activeTrimHandle === 'end' }"
          aria-hidden="true"
        ></div>
      </div>

      <div v-if="props.mode === 'preview' && props.audioDraft" class="audio-draft__trim-meta">
        <span class="audio-draft__trim-value">От {{ formatTime(trimStart) }}</span>
        <span class="audio-draft__trim-value audio-draft__trim-value--center">{{ formatTime(trimmedDuration) }}</span>
        <span class="audio-draft__trim-value">До {{ formatTime(trimEnd) }}</span>
      </div>
    </div>

    <VBtn
      type="button"
      class="audio-draft__edge-btn audio-draft__edge-btn--primary"
      icon
      variant="flat"
      color="primary"
      :aria-label="props.mode === 'recording' ? 'Остановить запись' : 'Отправить аудиосообщение'"
      :disabled="props.pending"
      @click="emit('primary-action')"
    >
      <VIcon>{{ props.mode === 'recording' ? 'mdi-stop' : 'mdi-send' }}</VIcon>
    </VBtn>

    <audio
      v-if="props.mode === 'preview'"
      ref="audioEl"
      class="audio-draft__audio"
      preload="metadata"
      :src="props.audioDraft?.url"
      @loadedmetadata="handleLoadedMetadata"
      @timeupdate="handleTimeUpdate"
      @pause="isPlaying = false"
      @play="isPlaying = true"
    />
  </div>
</template>