<script setup lang="ts">
const calls = useMessengerCalls()
const conversations = useMessengerConversations()
const navigation = useMessengerConversationState()

const activeModeLabel = computed(() => calls.activeCall.value?.mode === 'video' ? 'Видеозвонок' : 'Аудиозвонок')
const verificationEmojiLine = computed(() => calls.security.value.verificationEmojis.join(' '))
const headerIncomingCall = computed(() => Boolean(
  navigation.activeSection.value === 'chat'
  && calls.incomingCall.value
  && calls.incomingCall.value.conversationId === conversations.activeConversationId.value,
))
const headerActiveCall = computed(() => Boolean(
  navigation.activeSection.value === 'chat'
  && calls.activeCall.value
  && calls.activeCall.value.conversationId === conversations.activeConversationId.value,
))
const showIncomingFallbackControls = computed(() => Boolean(
  calls.incomingCall.value
  && !headerIncomingCall.value,
))
const showActiveAudioFallbackControls = computed(() => Boolean(
  calls.activeCall.value
  && calls.activeCall.value.mode === 'audio'
  && !headerActiveCall.value,
))

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
    <div v-if="showIncomingFallbackControls" class="call-floating-controls" aria-label="Входящий звонок">
      <button type="button" class="action-btn" @click="calls.rejectIncomingCall()">
        Отклонить
      </button>
      <button type="button" class="action-btn action-btn--accept" @click="calls.acceptIncomingCall()">
        Принять
      </button>
    </div>

    <div v-else-if="showActiveAudioFallbackControls" class="call-floating-controls call-floating-controls--active" aria-label="Управление звонком">
      <button
        type="button"
        class="action-btn chat-call-panel__control"
        :class="{ 'chat-call-panel__control--active': calls.controls.value.microphoneEnabled }"
        @click="calls.toggleMicrophone()"
      >
        {{ calls.controls.value.microphoneEnabled ? 'Микрофон вкл' : 'Микрофон выкл' }}
      </button>
      <button
        type="button"
        class="action-btn chat-call-panel__control"
        :class="{ 'chat-call-panel__control--active': calls.controls.value.speakerEnabled }"
        @click="calls.toggleSpeaker()"
      >
        {{ calls.controls.value.speakerEnabled ? 'Звук вкл' : 'Звук выкл' }}
      </button>
      <button type="button" class="action-btn action-btn--danger" @click="calls.hangupCall()">
        Завершить
      </button>
    </div>

    <section v-if="calls.activeCall.value?.mode === 'video'" class="call-stage call-stage--video" aria-label="Активный звонок">
      <div v-if="!headerActiveCall" class="call-stage__meta">
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

      <div v-if="!headerActiveCall" class="call-stage__actions">
        <button type="button" class="action-btn action-btn--danger" @click="calls.hangupCall()">
          <MessengerIcon name="hangup" :size="18" />
          Завершить
        </button>
      </div>
    </section>

    <p v-if="calls.callError.value" class="call-error">{{ calls.callError.value }}</p>
    <audio ref="remoteAudioEl" autoplay />
    <div v-if="calls.callError.value && !calls.activeCall.value" class="call-stage__actions">
      <button type="button" class="action-btn action-btn--ghost" @click="calls.refreshMediaPermissions()">
        <MessengerIcon name="refresh" :size="18" />
        Обновить статусы доступа
      </button>
      <button type="button" class="action-btn action-btn--accept" @click="calls.ensureMediaAccess(calls.incomingCall.value?.mode || 'audio')">
        <MessengerIcon name="access" :size="18" />
        Запросить доступ
      </button>
    </div>
  </div>
</template>