<script setup lang="ts">
const props = defineProps<{
  src: string
  label?: string
}>()

const audioEl = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const waveformLevels = ref<number[]>(Array.from({ length: 40 }, () => 0.2))

watch(() => props.src, async () => {
  isPlaying.value = false
  currentTime.value = 0
  duration.value = 0
  waveformLevels.value = Array.from({ length: 40 }, () => 0.2)
  await nextTick()
  void buildWaveform()
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

function extractWaveformLevels(buffer: AudioBuffer, barCount = 40) {
  const channel = buffer.getChannelData(0)
  const chunkSize = Math.max(1, Math.floor(channel.length / barCount))
  const output: number[] = []
  let maxSample = 0

  for (let index = 0; index < barCount; index += 1) {
    const start = index * chunkSize
    const end = Math.min(channel.length, start + chunkSize)
    let peak = 0

    for (let cursor = start; cursor < end; cursor += 1) {
      peak = Math.max(peak, Math.abs(channel[cursor] || 0))
    }

    output.push(peak)
    maxSample = Math.max(maxSample, peak)
  }

  return output.map(value => clamp(maxSample ? value / maxSample : 0.2, 0.12, 1))
}

async function buildWaveform() {
  if (!import.meta.client || typeof AudioContext === 'undefined') {
    return
  }

  const context = new AudioContext()

  try {
    const response = await fetch(props.src)
    const buffer = await response.arrayBuffer()
    const decoded = await context.decodeAudioData(buffer.slice(0))
    waveformLevels.value = extractWaveformLevels(decoded)
    duration.value = decoded.duration || duration.value
  } catch {
    waveformLevels.value = Array.from({ length: 40 }, (_, index) => 0.16 + ((index % 6) * 0.08))
  } finally {
    void context.close().catch(() => {})
  }
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

    <div class="voice-player-card__body">
      <div class="voice-player-card__waveform-shell">
        <div class="voice-player-card__progress"></div>
        <div class="voice-player-card__waveform">
          <span
            v-for="(level, index) in waveformLevels"
            :key="`${props.src}-${index}`"
            class="voice-player-card__bar"
            :class="{ 'voice-player-card__bar--active': duration ? (index / waveformLevels.length) <= (currentTime / duration) : false }"
            :style="{ height: `${Math.max(10, Math.round(level * 100))}%` }"
          ></span>
        </div>
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

      <div class="voice-player-card__meta">
        <span class="voice-player-card__label">{{ props.label || 'Голосовое сообщение' }}</span>
        <span class="voice-player-card__time">{{ formatTime(currentTime) }}</span>
        <span class="voice-player-card__time">{{ formatTime(duration) }}</span>
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