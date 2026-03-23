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
    <div class="chat-header__toolbar">
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

      <div class="chat-header__main-rail">
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
            <span v-if="callVisible" class="chat-header__call-badge label-small" :title="callSecurityTitle" aria-live="polite">
              {{ incomingCall ? 'Входящий звонок' : (callSecurityLabel || callBadge || (callMode === 'video' ? 'Видеозвонок' : 'Аудиозвонок')) }}
            </span>
          </div>
        </VBtn>

      <div class="chat-header__toolbar-actions" :class="{ 'chat-header__toolbar-actions--call': callVisible }">
        <template v-if="callVisible">
          <div v-if="incomingCall" class="chat-header__call-inline chat-header__call-inline--incoming">
            <VBtn class="chat-header__icon-btn" icon variant="tonal" color="error" aria-label="Отклонить звонок" @click="emit('reject-call')">
              <VIcon>mdi-phone-remove</VIcon>
            </VBtn>
            <VBtn class="chat-header__icon-btn" icon variant="flat" color="success" aria-label="Принять звонок" @click="emit('accept-call')">
              <VIcon>mdi-phone-check</VIcon>
            </VBtn>
          </div>

          <div v-else class="chat-header__call-inline">
            <div class="chat-header__call-settings">
              <VBtn
                class="chat-header__icon-btn"
                icon
                :variant="microphoneEnabled ? 'tonal' : 'text'"
                :color="microphoneEnabled ? 'primary' : undefined"
                aria-label="Микрофон"
                @click="emit('toggle-microphone')"
              >
                <VIcon>{{ microphoneEnabled ? 'mdi-microphone' : 'mdi-microphone-off' }}</VIcon>
              </VBtn>
              <VBtn
                class="chat-header__icon-btn"
                icon
                :variant="speakerEnabled ? 'tonal' : 'text'"
                :color="speakerEnabled ? 'primary' : undefined"
                aria-label="Динамик"
                @click="emit('toggle-speaker')"
              >
                <VIcon>{{ speakerEnabled ? 'mdi-volume-high' : 'mdi-volume-off' }}</VIcon>
              </VBtn>
              <template v-if="showCallViewModes">
                <VBtn
                  class="chat-header__icon-btn chat-header__icon-btn--viewmode"
                  icon
                  :variant="callViewMode === 'full' ? 'tonal' : 'text'"
                  :color="callViewMode === 'full' ? 'primary' : undefined"
                  aria-label="Полный экран звонка"
                  @click="emit('set-call-view-mode', 'full')"
                >
                  <VIcon>mdi-view-agenda</VIcon>
                </VBtn>
                <VBtn
                  class="chat-header__icon-btn chat-header__icon-btn--viewmode"
                  icon
                  :variant="callViewMode === 'split' ? 'tonal' : 'text'"
                  :color="callViewMode === 'split' ? 'primary' : undefined"
                  aria-label="Разделить звонок и чат"
                  @click="emit('set-call-view-mode', 'split')"
                >
                  <VIcon>mdi-view-split-vertical</VIcon>
                </VBtn>
                <VBtn
                  class="chat-header__icon-btn chat-header__icon-btn--viewmode"
                  icon
                  :variant="callViewMode === 'mini' ? 'tonal' : 'text'"
                  :color="callViewMode === 'mini' ? 'primary' : undefined"
                  aria-label="Мини-режим звонка"
                  @click="emit('set-call-view-mode', 'mini')"
                >
                  <VIcon>mdi-picture-in-picture-bottom-right</VIcon>
                </VBtn>
              </template>
            </div>

            <div class="chat-header__call-main">
              <VBtn
                class="chat-header__icon-btn"
                icon
                :variant="audioCall ? 'tonal' : 'text'"
                :color="audioCall ? 'primary' : undefined"
                aria-label="Аудиозвонок"
                :disabled="!canToggleAudioCall"
                @click="emit('toggle-audio-call')"
              >
                <VIcon>mdi-phone</VIcon>
              </VBtn>
              <VBtn
                class="chat-header__icon-btn"
                icon
                :variant="videoEnabled ? 'tonal' : 'text'"
                :color="videoEnabled ? 'primary' : undefined"
                aria-label="Видео"
                :disabled="!canToggleVideo"
                @click="emit('toggle-video')"
              >
                <VIcon>{{ videoEnabled ? 'mdi-video' : 'mdi-video-off' }}</VIcon>
              </VBtn>
              <VBtn class="chat-header__icon-btn chat-header__icon-btn--hangup" icon variant="flat" color="error" aria-label="Завершить звонок" @click="emit('hangup-call')">
                <VIcon>mdi-phone-hangup</VIcon>
              </VBtn>
            </div>
          </div>
        </template>

        <template v-else>
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
        </template>
      </div>
      </div>
    </div>
  </header>
</template>