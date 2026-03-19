<script setup lang="ts">
const calls = useMessengerCalls()

const activeModeLabel = computed(() => calls.activeCall.value?.mode === 'video' ? 'Видеозвонок' : 'Аудиозвонок')
const incomingModeLabel = computed(() => calls.incomingCall.value?.mode === 'video' ? 'Видеозвонок' : 'Аудиозвонок')

const localVideoEl = useTemplateRef<HTMLVideoElement>('localVideoEl')
const remoteVideoEl = useTemplateRef<HTMLVideoElement>('remoteVideoEl')
const remoteAudioEl = useTemplateRef<HTMLAudioElement>('remoteAudioEl')

watch([localVideoEl, remoteVideoEl, remoteAudioEl], () => {
  calls.attachElements({
    localVideo: localVideoEl.value,
    remoteVideo: remoteVideoEl.value,
    remoteAudio: remoteAudioEl.value,
  })
}, { immediate: true })

onBeforeUnmount(() => {
  calls.clearElements()
})
</script>

<template>
  <div class="call-layer">
    <section v-if="calls.incomingCall.value" class="call-banner" aria-label="Входящий звонок">
      <div class="call-banner__copy">
        <p class="call-banner__eyebrow">{{ incomingModeLabel }}</p>
        <h3>{{ calls.incomingCall.value.fromDisplayName }}</h3>
        <p>{{ calls.callStatusText.value || 'Входящий звонок' }}</p>
      </div>
      <div class="call-banner__actions">
        <button type="button" class="action-btn" @click="calls.rejectIncomingCall()">Отклонить</button>
        <button type="button" class="action-btn action-btn--accept" @click="calls.acceptIncomingCall()">Принять</button>
      </div>
    </section>

    <section v-if="calls.activeCall.value" class="call-stage" :class="{ 'call-stage--video': calls.activeCall.value.mode === 'video' }" aria-label="Активный звонок">
      <div class="call-stage__meta">
        <p class="call-banner__eyebrow">{{ activeModeLabel }}</p>
        <h3>{{ calls.activeCall.value.peerDisplayName }}</h3>
        <p>{{ calls.callStatusText.value || 'Соединяем…' }}</p>
      </div>

      <div v-if="calls.activeCall.value.mode === 'video'" class="call-stage__videos">
        <video ref="remoteVideoEl" class="call-video call-video--remote" autoplay playsinline />
        <video ref="localVideoEl" class="call-video call-video--local" autoplay muted playsinline />
      </div>
      <div v-else class="call-stage__audio-note">
        <p>Голосовой канал активен. Можно продолжать чат параллельно со звонком.</p>
      </div>

      <audio ref="remoteAudioEl" autoplay />

      <div class="call-stage__actions">
        <button type="button" class="action-btn action-btn--danger" @click="calls.hangupCall()">Завершить</button>
      </div>
    </section>

    <p v-if="calls.callError.value" class="call-error">{{ calls.callError.value }}</p>
  </div>
</template>