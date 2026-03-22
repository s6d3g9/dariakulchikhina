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
  'hangup-call': []
  'back': []
}>()
</script>

<template>
  <header class="chat-header">
    <div class="chat-header__toolbar">
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
            {{ peerName }}
            <VChip v-if="conversationSecret" size="x-small" color="warning" variant="tonal" class="ml-1">Secret</VChip>
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

    <!-- In-call panel -->
    <Transition name="chrome-reveal">
      <div v-if="callVisible" class="chat-header__call-strip">
        <div v-if="incomingCall" class="chat-header__call-actions">
          <VBtn variant="tonal" color="error" @click="emit('reject-call')">Отклонить</VBtn>
          <VBtn variant="flat" color="success" @click="emit('accept-call')">Принять</VBtn>
        </div>
        <div v-else class="chat-header__call-actions">
          <VBtn variant="tonal" :color="microphoneEnabled ? 'primary' : undefined" @click="emit('toggle-microphone')">
            <VIcon>{{ microphoneEnabled ? 'mdi-microphone' : 'mdi-microphone-off' }}</VIcon>
          </VBtn>
          <VBtn variant="tonal" :color="speakerEnabled ? 'primary' : undefined" @click="emit('toggle-speaker')">
            <VIcon>{{ speakerEnabled ? 'mdi-volume-high' : 'mdi-volume-off' }}</VIcon>
          </VBtn>
          <VBtn variant="flat" color="error" @click="emit('hangup-call')">Завершить</VBtn>
        </div>
      </div>
    </Transition>
  </header>
</template>