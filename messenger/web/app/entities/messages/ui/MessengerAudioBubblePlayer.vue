<script setup lang="ts">
const props = defineProps<{
  src: string
  label?: string
}>()

const audioEl = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)

watch(() => props.src, async () => {
  isPlaying.value = false
  currentTime.value = 0
  duration.value = 0
  await nextTick()
}, { immediate: true })

onBeforeUnmount(() => {
  audioEl.value?.pause()
})

const progressPercent = computed(() => {
  if (!duration.value) {
    return 0
  }

  return (currentTime.value / duration.value) * 100
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

function handleLoadedMetadata() {
  if (!audioEl.value) {
    return
  }

  duration.value = Number.isFinite(audioEl.value.duration) ? audioEl.value.duration : 0
}

function handleTimeUpdate() {
  if (!audioEl.value) {
    return
  }

  currentTime.value = audioEl.value.currentTime
}

function togglePlayback() {
  if (!audioEl.value) {
    return
  }

  if (isPlaying.value) {
    audioEl.value.pause()
    isPlaying.value = false
    return
  }

  void audioEl.value.play().then(() => {
    isPlaying.value = true
  }).catch(() => {
    isPlaying.value = false
  })
}

function handleSeek(event: Event) {
  if (!audioEl.value) {
    return
  }

  const target = event.target as HTMLInputElement
  const nextValue = clamp(Number(target.value), 0, duration.value || 0)
  audioEl.value.currentTime = nextValue
  currentTime.value = nextValue
}
</script>

<template>
  <div class="voice-player-card" :style="{ '--voice-player-progress': `${progressPercent}%` }">
    <VBtn
      type="button"
      class="voice-player-card__play"
      :icon="isPlaying ? 'mdi-pause' : 'mdi-play'"
      variant="tonal"
      color="primary"
      :aria-label="isPlaying ? 'Пауза' : 'Воспроизвести голосовое сообщение'"
      @click.stop="togglePlayback"
    />

    <div class="voice-player-card__summary">
      <div class="voice-player-card__meta-row">
        <span class="voice-player-card__label">{{ props.label || 'Голосовое сообщение' }}</span>
        <span class="voice-player-card__time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
      </div>

      <div class="voice-player-card__rail" :class="{ 'voice-player-card__rail--active': isPlaying }">
        <div class="voice-player-card__progress"></div>
        <div class="voice-player-card__flow"></div>
        <div class="voice-player-card__sheen"></div>
        <input
          class="voice-player-card__seek"
          type="range"
          :min="0"
          :max="duration || 0"
          :step="0.01"
          :value="currentTime"
          aria-label="Перемотка голосового сообщения"
          @input="handleSeek"
        >
      </div>
    </div>

    <audio
      ref="audioEl"
      class="voice-player-card__audio"
      preload="metadata"
      :src="props.src"
      @loadedmetadata="handleLoadedMetadata"
      @timeupdate="handleTimeUpdate"
      @pause="isPlaying = false"
      @play="isPlaying = true"
      @ended="currentTime = 0"
    />
  </div>
</template>