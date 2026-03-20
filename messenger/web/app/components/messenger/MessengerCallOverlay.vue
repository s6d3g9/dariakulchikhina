<script setup lang="ts">
const calls = useMessengerCalls()

const activeModeLabel = computed(() => calls.activeCall.value?.mode === 'video' ? 'Видеозвонок' : 'Аудиозвонок')
const incomingModeLabel = computed(() => calls.incomingCall.value?.mode === 'video' ? 'Видеозвонок' : 'Аудиозвонок')
const verificationEmojiLine = computed(() => calls.security.value.verificationEmojis.join(' '))
const permissionStateLabel = computed(() => {
  const microphone = calls.mediaPermissionState.value.microphone
  const camera = calls.mediaPermissionState.value.camera

  if (calls.activeCall.value?.mode === 'video' || calls.incomingCall.value?.mode === 'video') {
    return `Микрофон: ${microphone} · Камера: ${camera}`
  }

  return `Микрофон: ${microphone}`
})

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
        <p>{{ permissionStateLabel }}</p>
        <div class="call-security">
          <p class="call-security__status">{{ calls.security.value.status }}</p>
          <p v-if="verificationEmojiLine" class="call-security__emojis">{{ verificationEmojiLine }}</p>
          <p v-if="calls.security.value.fallbackReason" class="call-security__fallback">{{ calls.security.value.fallbackReason }}</p>
        </div>
      </div>
      <div class="call-banner__actions">
        <button type="button" class="action-btn" @click="calls.rejectIncomingCall()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15.8 8.2a9.3 9.3 0 0 0-7.6 0l-1.7-1.7a1 1 0 0 0-1.1-.23 7.2 7.2 0 0 0-2.03 1.37 1 1 0 0 0-.05 1.41l3.02 3.2a1 1 0 0 0 1.2.2l1.96-1.07a6.3 6.3 0 0 1 5.08 0l1.96 1.07a1 1 0 0 0 1.2-.2l3.02-3.2a1 1 0 0 0-.05-1.4 7.2 7.2 0 0 0-2.03-1.38 1 1 0 0 0-1.1.23L15.8 8.2Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
          </svg>
          Отклонить
        </button>
        <button type="button" class="action-btn action-btn--accept" @click="calls.acceptIncomingCall()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.8 5.25h2.05c.31 0 .6.19.71.48l1.04 2.76a.78.78 0 0 1-.18.82l-1.55 1.56a12.1 12.1 0 0 0 5.17 5.16l1.56-1.54a.78.78 0 0 1 .82-.19l2.76 1.04c.29.11.48.4.48.71v2.05a1.85 1.85 0 0 1-1.99 1.85c-7.63-.48-13.68-6.53-14.16-14.16A1.85 1.85 0 0 1 6.8 5.25Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
          </svg>
          Принять
        </button>
      </div>
    </section>

    <section v-if="calls.activeCall.value" class="call-stage" :class="{ 'call-stage--video': calls.activeCall.value.mode === 'video' }" aria-label="Активный звонок">
      <div class="call-stage__meta">
        <p class="call-banner__eyebrow">{{ activeModeLabel }}</p>
        <h3>{{ calls.activeCall.value.peerDisplayName }}</h3>
        <p>{{ calls.callStatusText.value || 'Соединяем…' }}</p>
        <p v-if="calls.requestingPermissions.value">Запрашиваем доступ к микрофону{{ calls.activeCall.value.mode === 'video' ? ' и камере' : '' }}…</p>
        <div class="call-security">
          <p class="call-security__status">{{ calls.security.value.status }}</p>
          <p v-if="verificationEmojiLine" class="call-security__emojis">{{ verificationEmojiLine }}</p>
          <p v-if="calls.security.value.fallbackReason" class="call-security__fallback">{{ calls.security.value.fallbackReason }}</p>
        </div>
      </div>

      <div v-if="calls.activeCall.value.mode === 'video'" class="call-stage__videos">
        <video ref="remoteVideoEl" class="call-video call-video--remote" autoplay playsinline />
        <video ref="localVideoEl" class="call-video call-video--local" autoplay muted playsinline />
      </div>
      <div v-else class="call-stage__audio-note">
        <p>Аудиопоток идёт через WebRTC. Если E2EE активно, поверх transport encryption дополнительно шифруются encoded audio frames.</p>
      </div>

      <div class="call-stage__actions">
        <button type="button" class="action-btn action-btn--danger" @click="calls.hangupCall()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15.8 8.2a9.3 9.3 0 0 0-7.6 0l-1.7-1.7a1 1 0 0 0-1.1-.23 7.2 7.2 0 0 0-2.03 1.37 1 1 0 0 0-.05 1.41l3.02 3.2a1 1 0 0 0 1.2.2l1.96-1.07a6.3 6.3 0 0 1 5.08 0l1.96 1.07a1 1 0 0 0 1.2-.2l3.02-3.2a1 1 0 0 0-.05-1.4 7.2 7.2 0 0 0-2.03-1.38 1 1 0 0 0-1.1.23L15.8 8.2Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
          </svg>
          Завершить
        </button>
      </div>
    </section>

    <p v-if="calls.callError.value" class="call-error">{{ calls.callError.value }}</p>
    <audio ref="remoteAudioEl" autoplay />
    <div v-if="calls.callError.value && !calls.activeCall.value" class="call-stage__actions">
      <button type="button" class="action-btn action-btn--ghost" @click="calls.refreshMediaPermissions()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8.5A7 7 0 0 0 6.4 6.6M6 15.5A7 7 0 0 0 17.6 17.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
          <path d="M18 4.75v3.9h-3.9M6 19.25v-3.9h3.9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
        </svg>
        Обновить статусы доступа
      </button>
      <button type="button" class="action-btn action-btn--accept" @click="calls.ensureMediaAccess(calls.incomingCall.value?.mode || 'audio')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4.75 18.25 7.5v4.12c0 3.7-2.46 7.05-6.25 8.13-3.79-1.08-6.25-4.43-6.25-8.13V7.5L12 4.75Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
          <path d="m9.5 12 1.6 1.6 3.4-3.45" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75"/>
        </svg>
        Запросить доступ
      </button>
    </div>
  </div>
</template>