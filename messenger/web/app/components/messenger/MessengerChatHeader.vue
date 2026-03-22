<script setup lang="ts">
const props = defineProps<{
  peerAvatar: string
  peerName: string
  disabled?: boolean
  conversationSecret?: boolean
  callVisible?: boolean
  incomingCall?: boolean
  audioCall?: boolean
  callBadge?: string
  callSecurityEmojis?: string
  callSecurityLabel?: string
  callSecurityTitle?: string
  canToggleAudioCall?: boolean
  videoCallDisabled?: boolean
  microphoneEnabled?: boolean
  speakerEnabled?: boolean
}>()

const emit = defineEmits<{
  'toggle-details': []
  'toggle-audio-call': []
  'start-video-call': []
  'reject-call': []
  'accept-call': []
  'toggle-microphone': []
  'toggle-speaker': []
  'hangup-call': []
}>()
</script>

<template>
  <VCard class="section-head section-head--chat-header section-head--chat-header-vuetify" color="surface" variant="flat">
    <VCardText class="section-head__body section-head__body--chat-header">
      <VBtn
        type="button"
        class="chat-user-trigger chat-user-trigger--profile chat-user-trigger--profile-vuetify"
        :class="{ 'chat-user-trigger--audio-live': callVisible }"
        variant="text"
        :disabled="disabled"
        @click="emit('toggle-details')"
      >
        <VAvatar class="chat-avatar" size="48">{{ peerAvatar }}</VAvatar>
        <span class="chat-user-meta">
          <span
            class="chat-user-name"
            :class="{ 'chat-user-name--audio-live': callVisible }"
          >
            <span class="chat-user-name__text">{{ peerName }}</span>
            <VChip v-if="conversationSecret" class="chat-secret-badge chat-secret-badge--header" size="x-small" variant="tonal">
              Secret
            </VChip>
            <VChip v-if="callVisible" class="chat-user-name__call" size="x-small" aria-live="polite">
              {{ callBadge }}
            </VChip>
            <VChip
              v-if="callVisible"
              class="chat-user-name__security"
              :class="{ 'chat-user-name__security--verified': !!callSecurityEmojis }"
              :title="callSecurityTitle"
              size="x-small"
              variant="tonal"
              aria-live="polite"
            >
              <span class="chat-user-name__security-icon" aria-hidden="true">
                <MessengerIcon :name="callSecurityEmojis ? 'key' : 'shield'" :size="12" />
              </span>
              <span class="chat-user-name__security-text">{{ callSecurityLabel }}</span>
            </VChip>
          </span>
        </span>
      </VBtn>

      <div class="section-actions section-actions--cluster section-actions--cluster-vuetify">
        <VBtn
          type="button"
          class="icon-btn"
          :class="{ 'icon-btn--call-live': audioCall }"
          icon="mdi-phone"
          variant="tonal"
          aria-label="Аудиозвонок"
          :disabled="!canToggleAudioCall"
          @click="emit('toggle-audio-call')"
        />
        <VBtn
          type="button"
          class="icon-btn"
          icon="mdi-video"
          variant="tonal"
          aria-label="Видеозвонок"
          :disabled="videoCallDisabled"
          @click="emit('start-video-call')"
        />
      </div>
    </VCardText>

    <Transition name="chrome-reveal">
      <div v-if="callVisible" class="chat-call-panel">
        <div v-if="incomingCall" class="chat-call-panel__actions chat-call-panel__actions--incoming">
          <VBtn type="button" class="action-btn" variant="tonal" @click="emit('reject-call')">
            Отклонить
          </VBtn>
          <VBtn type="button" class="action-btn action-btn--accept" color="success" variant="flat" @click="emit('accept-call')">
            Принять
          </VBtn>
        </div>
        <div v-else class="chat-call-panel__actions chat-call-panel__actions--active">
          <VBtn
            type="button"
            class="action-btn chat-call-panel__control"
            :class="{ 'chat-call-panel__control--active': microphoneEnabled }"
            variant="tonal"
            @click="emit('toggle-microphone')"
          >
            {{ microphoneEnabled ? 'Микрофон вкл' : 'Микрофон выкл' }}
          </VBtn>
          <VBtn
            type="button"
            class="action-btn chat-call-panel__control"
            :class="{ 'chat-call-panel__control--active': speakerEnabled }"
            variant="tonal"
            @click="emit('toggle-speaker')"
          >
            {{ speakerEnabled ? 'Звук вкл' : 'Звук выкл' }}
          </VBtn>
          <VBtn type="button" class="action-btn action-btn--danger" color="error" variant="flat" @click="emit('hangup-call')">
            Завершить
          </VBtn>
        </div>
      </div>
    </Transition>
  </VCard>
</template>