<script setup lang="ts">
const props = defineProps<{
  peerAvatar: string
  peerName: string
  disabled?: boolean
  conversationSecret?: boolean
  callVisible?: boolean
  incomingCall?: boolean
  audioCall?: boolean
  callMode?: 'audio' | 'video' | null
  callBadge?: string
  callSecurityEmojis?: string
  callSecurityLabel?: string
  callSecurityTitle?: string
  canToggleAudioCall?: boolean
  canToggleVideo?: boolean
  videoCallDisabled?: boolean
  microphoneEnabled?: boolean
  speakerEnabled?: boolean
  videoEnabled?: boolean
  callViewMode?: 'full' | 'split' | 'mini'
  showCallViewModes?: boolean
  showCallActions?: boolean
}>()

const emit = defineEmits<{
  'toggle-details': []
  'toggle-audio-call': []
  'start-video-call': []
  'reject-call': []
  'accept-call': []
  'toggle-microphone': []
  'toggle-speaker': []
  'toggle-video': []
  'set-call-view-mode': [mode: 'full' | 'split' | 'mini']
  'hangup-call': []
  'back': []
}>()
</script>

<template>
  <header class="chat-header" :class="{ 'chat-header--call-visible': callVisible }">
    <div v-if="!callVisible" class="chat-header__toolbar">
      <!-- Back button -->
      <VBtn
        type="button"
        icon
        variant="text"
        aria-label="Назад"
        class="chat-header__back"
        @click="emit('back')"
      >
        <VIcon>mdi-arrow-left</VIcon>
      </VBtn>

      <!-- Peer info -->
      <VBtn
        type="button"
        class="chat-header__peer"
        variant="text"
        :disabled="disabled"
        @click="emit('toggle-details')"
      >
        <VAvatar color="primary" variant="tonal" size="36">{{ peerAvatar }}</VAvatar>
        <div class="chat-header__peer-meta ml-2">
          <span class="chat-header__peer-name title-medium">
            <span class="chat-header__peer-name-text">{{ peerName }}</span>
            <MessengerIcon v-if="conversationSecret" class="chat-secret-marker" name="shield" :size="14" aria-hidden="true" />
          </span>
          <span v-if="callVisible" class="chat-header__call-badge label-small" aria-live="polite">{{ callBadge }}</span>
        </div>
      </VBtn>

      <VSpacer />

      <!-- Call actions -->
      <template v-if="showCallActions">
        <VBtn
          type="button"
          icon
          variant="text"
          aria-label="Аудиозвонок"
          :disabled="!canToggleAudioCall"
          @click="emit('toggle-audio-call')"
        >
          <VIcon :color="audioCall ? 'primary' : undefined">mdi-phone</VIcon>
        </VBtn>
        <VBtn
          type="button"
          icon
          variant="text"
          aria-label="Видеозвонок"
          :disabled="videoCallDisabled"
          @click="emit('start-video-call')"
        >
          <VIcon>mdi-video</VIcon>
        </VBtn>
      </template>

      <!-- Overflow menu -->
      <VMenu location="bottom end">
        <template #activator="{ props: menuProps }">
          <VBtn type="button" icon variant="text" aria-label="Дополнительно" v-bind="menuProps">
            <VIcon>mdi-dots-vertical</VIcon>
          </VBtn>
        </template>
        <VList bg-color="surface-container-highest" density="comfortable" nav>
          <VListItem prepend-icon="mdi-magnify" title="Поиск в переписке" @click="emit('toggle-details')" />
          <VListItem prepend-icon="mdi-image-multiple-outline" title="Медиа и файлы" @click="emit('toggle-details')" />
          <VDivider class="my-1" />
          <VListItem prepend-icon="mdi-account-cancel-outline" title="Заблокировать" />
          <VListItem prepend-icon="mdi-delete-outline" title="Удалить диалог" class="text-error" />
        </VList>
      </VMenu>
    </div>

    <div v-else class="chat-header__call-shell">
      <div class="chat-header__call-summary">
        <VBtn
          type="button"
          icon
          variant="text"
          aria-label="Назад"
          class="chat-header__back"
          @click="emit('back')"
        >
          <VIcon>mdi-arrow-left</VIcon>
        </VBtn>

        <div class="chat-header__call-meta">
          <span class="chat-header__call-eyebrow label-small">{{ incomingCall ? 'Входящий звонок' : (callMode === 'video' ? 'Видеозвонок' : 'Аудиозвонок') }}</span>
          <span class="chat-header__call-peer title-medium">{{ peerName }}</span>
          <span class="chat-header__call-security label-small" :title="callSecurityTitle">{{ callSecurityLabel || callBadge }}</span>
        </div>
      </div>

      <div class="chat-header__call-strip">
        <div v-if="incomingCall" class="chat-header__call-actions chat-header__call-actions--incoming">
          <VBtn class="chat-header__call-btn" variant="tonal" color="error" @click="emit('reject-call')">Отклонить</VBtn>
          <VBtn class="chat-header__call-btn" variant="flat" color="success" @click="emit('accept-call')">Принять</VBtn>
        </div>
        <div v-else class="chat-header__call-actions">
          <VBtn class="chat-header__call-btn" variant="tonal" :color="microphoneEnabled ? 'primary' : undefined" @click="emit('toggle-microphone')">
            <VIcon start>{{ microphoneEnabled ? 'mdi-microphone' : 'mdi-microphone-off' }}</VIcon>
            {{ microphoneEnabled ? 'Микрофон' : 'Микрофон выкл' }}
          </VBtn>
          <VBtn class="chat-header__call-btn" variant="tonal" :color="speakerEnabled ? 'primary' : undefined" @click="emit('toggle-speaker')">
            <VIcon start>{{ speakerEnabled ? 'mdi-volume-high' : 'mdi-volume-off' }}</VIcon>
            {{ speakerEnabled ? 'Звук' : 'Звук выкл' }}
          </VBtn>
          <VBtn class="chat-header__call-btn" variant="tonal" :color="videoEnabled ? 'primary' : undefined" :disabled="!canToggleVideo" @click="emit('toggle-video')">
            <VIcon start>{{ videoEnabled ? 'mdi-video' : 'mdi-video-off' }}</VIcon>
            {{ videoEnabled ? 'Видео' : 'Включить видео' }}
          </VBtn>
          <VBtn class="chat-header__call-btn chat-header__call-btn--hangup" variant="flat" color="error" @click="emit('hangup-call')">
            <VIcon start>mdi-phone-hangup</VIcon>
            Завершить
          </VBtn>
        </div>

        <div v-if="showCallViewModes" class="chat-header__call-viewmodes">
          <VBtn class="chat-header__view-btn" :variant="callViewMode === 'full' ? 'flat' : 'tonal'" :color="callViewMode === 'full' ? 'primary' : undefined" @click="emit('set-call-view-mode', 'full')">Экран</VBtn>
          <VBtn class="chat-header__view-btn" :variant="callViewMode === 'split' ? 'flat' : 'tonal'" :color="callViewMode === 'split' ? 'primary' : undefined" @click="emit('set-call-view-mode', 'split')">Чат</VBtn>
          <VBtn class="chat-header__view-btn" :variant="callViewMode === 'mini' ? 'flat' : 'tonal'" :color="callViewMode === 'mini' ? 'primary' : undefined" @click="emit('set-call-view-mode', 'mini')">Мини</VBtn>
        </div>
      </div>
    </div>
  </header>
</template>