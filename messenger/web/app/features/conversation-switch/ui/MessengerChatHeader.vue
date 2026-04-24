<script setup lang="ts">
const props = withDefaults(defineProps<{
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
  showCallAnalysis?: boolean
  callAnalysisActive?: boolean
  transcriptionActive?: boolean
  canToggleTranscription?: boolean
  canToggleVideo?: boolean
  videoCallDisabled?: boolean
  microphoneEnabled?: boolean
  speakerEnabled?: boolean
  videoEnabled?: boolean
  callViewMode?: 'full' | 'split' | 'mini'
  showCallViewModes?: boolean
  showCallActions?: boolean
  canSwitchCamera?: boolean
  floating?: boolean
  showBackButton?: boolean
  showAgentExtras?: boolean
  agentModelOptions?: ReadonlyArray<{ label: string; value: string; icon: string; color: string }>
  agentModelCurrentValue?: string
  agentModelIcon?: string
  agentModelColor?: string
  agentModelLabel?: string
  agentModelPending?: boolean
  monitorPanelOpen?: boolean
  monitorSessionCount?: number
}>(), {
  floating: false,
  showBackButton: true,
  showAgentExtras: false,
  agentModelOptions: () => [],
  agentModelCurrentValue: '',
  agentModelIcon: 'mdi-brain',
  agentModelColor: 'primary',
  agentModelLabel: '',
  agentModelPending: false,
  monitorPanelOpen: false,
  monitorSessionCount: 0,
})

const emit = defineEmits<{
  'toggle-details': []
  'toggle-audio-call': []
  'toggle-call-analysis': []
  'toggle-transcription': []
  'start-video-call': []
  'reject-call': []
  'accept-call': []
  'toggle-microphone': []
  'toggle-speaker': []
  'toggle-video': []
  'switch-camera': []
  'set-call-view-mode': [mode: 'full' | 'split' | 'mini']
  'hangup-call': []
  'back': []
  'update:overflow-menu-open': [open: boolean]
  'select-agent-model': [value: string]
  'toggle-monitor-panel': []
}>()

const overflowMenuOpen = ref(false)
type HeaderSheetKind = 'model' | 'monitor' | 'overflow' | null
const headerSheetKind = ref<HeaderSheetKind>(null)
const isHeaderSheetOpen = computed(() => headerSheetKind.value !== null)

const isOverflowOpen = computed(() =>
  overflowMenuOpen.value || headerSheetKind.value === 'overflow',
)

watch(isOverflowOpen, (open) => {
  emit('update:overflow-menu-open', open)
})

function toggleHeaderSheet(kind: Exclude<HeaderSheetKind, null>) {
  headerSheetKind.value = headerSheetKind.value === kind ? null : kind
}

function closeHeaderSheet() {
  headerSheetKind.value = null
}

watch(() => props.callVisible, (visible) => {
  if (visible) closeHeaderSheet()
})

const hasVideoCallControls = computed(() => Boolean(
  props.callVisible
  && !props.incomingCall
  && (props.callMode === 'video' || props.videoEnabled)
))

const nextCallViewMode = computed<'full' | 'split' | 'mini'>(() => {
  if (props.callViewMode === 'split') {
    return 'full'
  }

  if (props.callViewMode === 'full') {
    return 'mini'
  }

  return 'split'
})

const nextCallViewModeIcon = computed(() => {
  if (props.callViewMode === 'split') {
    return 'mdi-arrow-expand-all'
  }

  if (props.callViewMode === 'full') {
    return 'mdi-picture-in-picture-bottom-right'
  }

  return 'mdi-view-split-vertical'
})

const nextCallViewModeLabel = computed(() => {
  if (props.callViewMode === 'split') {
    return 'Развернуть видео'
  }

  if (props.callViewMode === 'full') {
    return 'Свернуть видео в мини-режим'
  }

  return 'Вернуть видео рядом с чатом'
})

const speakerToggleLabel = computed(() => props.speakerEnabled ? 'Громкая' : 'Обычный')
const speakerToggleAriaLabel = computed(() => props.speakerEnabled
  ? 'Переключить звонок на обычный режим'
  : 'Переключить звонок на громкую связь')
const transcriptionToggleAriaLabel = computed(() => props.transcriptionActive
  ? 'Остановить транскрибацию звонка'
  : 'Включить транскрибацию звонка')
const transcriptionToggleDisabled = computed(() => !props.transcriptionActive && !props.canToggleTranscription)
</script>

<template>
  <header class="chat-header" :class="{ 'chat-header--call-visible': callVisible, 'chat-header--floating': floating, 'chat-header--sheet-open': isHeaderSheetOpen }">
    <div class="chat-header__toolbar" :class="{ 'chat-header__toolbar--no-back': !showBackButton, 'chat-header__toolbar--sheet-open': isHeaderSheetOpen }">
      <div v-if="showBackButton" class="chat-header__nav-group">
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
      </div>

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
            <div class="chat-header__call-inline" :class="{ 'chat-header__call-inline--incoming': incomingCall, 'chat-header__call-inline--audio': audioCall && !incomingCall }">
              <div class="chat-header__call-secondary">
                <template v-if="!incomingCall">
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
                    v-if="audioCall && showCallAnalysis"
                    class="chat-header__icon-btn"
                    icon
                    :variant="transcriptionActive ? 'tonal' : 'text'"
                    :color="transcriptionActive ? 'primary' : undefined"
                    :aria-label="transcriptionToggleAriaLabel"
                    :disabled="transcriptionToggleDisabled"
                    @click="emit('toggle-transcription')"
                  >
                    <VIcon>{{ transcriptionActive ? 'mdi-text-box-check-outline' : 'mdi-text-box-outline' }}</VIcon>
                  </VBtn>
                  <VBtn
                    v-if="audioCall"
                    class="chat-header__icon-btn"
                    icon
                    :variant="speakerEnabled ? 'tonal' : 'text'"
                    :color="speakerEnabled ? 'primary' : undefined"
                    :aria-label="speakerToggleAriaLabel"
                    @click="emit('toggle-speaker')"
                  >
                    <VIcon>{{ speakerEnabled ? 'mdi-volume-high' : 'mdi-volume-medium' }}</VIcon>
                  </VBtn>
                  <VBtn
                    v-else
                    class="chat-header__icon-btn"
                    icon
                    :variant="speakerEnabled ? 'tonal' : 'text'"
                    :color="speakerEnabled ? 'primary' : undefined"
                    aria-label="Динамик"
                    @click="emit('toggle-speaker')"
                  >
                    <VIcon>{{ speakerEnabled ? 'mdi-volume-high' : 'mdi-volume-off' }}</VIcon>
                  </VBtn>
                  <VBtn
                    v-if="hasVideoCallControls"
                    class="chat-header__icon-btn"
                    icon
                    variant="text"
                    :disabled="!canSwitchCamera"
                    aria-label="Сменить камеру"
                    @click="emit('switch-camera')"
                  >
                    <VIcon>mdi-camera-flip</VIcon>
                  </VBtn>
                  <VBtn
                    v-if="hasVideoCallControls"
                    class="chat-header__icon-btn"
                    icon
                    :variant="callViewMode === 'full' ? 'tonal' : 'text'"
                    :color="callViewMode === 'full' ? 'primary' : undefined"
                    :aria-label="nextCallViewModeLabel"
                    @click="emit('set-call-view-mode', nextCallViewMode)"
                  >
                    <VIcon>{{ nextCallViewModeIcon }}</VIcon>
                  </VBtn>
                </template>
              </div>

              <div class="chat-header__call-primary" :class="{ 'chat-header__call-primary--incoming': incomingCall }">
                <template v-if="incomingCall">
                  <VBtn
                    class="chat-header__incoming-btn"
                    variant="flat"
                    color="error"
                    aria-label="Отклонить звонок"
                    @click="emit('reject-call')"
                  >
                    <VIcon>mdi-phone-remove</VIcon>
                    <span>Отклонить</span>
                  </VBtn>
                  <VBtn
                    class="chat-header__incoming-btn"
                    variant="flat"
                    color="success"
                    aria-label="Принять звонок"
                    @click="emit('accept-call')"
                  >
                    <VIcon>mdi-phone-check</VIcon>
                    <span>Принять</span>
                  </VBtn>
                </template>
                <template v-else>
                  <VBtn
                    class="chat-header__icon-btn chat-header__icon-btn--danger"
                    icon
                    variant="flat"
                    color="error"
                    aria-label="Завершить звонок"
                    @click="emit('hangup-call')"
                  >
                    <VIcon>mdi-phone-hangup</VIcon>
                  </VBtn>
                  <VBtn
                    class="chat-header__icon-btn"
                    icon
                    :variant="videoEnabled ? 'tonal' : 'text'"
                    :color="videoEnabled ? 'primary' : undefined"
                    :aria-label="hasVideoCallControls ? 'Выключить или включить свою камеру' : 'Включить видео'"
                    :disabled="!canToggleVideo"
                    @click="emit('toggle-video')"
                  >
                    <VIcon>{{ videoEnabled ? 'mdi-video' : 'mdi-video-off' }}</VIcon>
                  </VBtn>
                  <VMenu v-model="overflowMenuOpen" location="bottom end">
                    <template #activator="{ props: menuProps }">
                      <VBtn type="button" class="chat-header__icon-btn" icon variant="text" aria-label="Дополнительно" v-bind="menuProps">
                        <VIcon>mdi-dots-vertical</VIcon>
                      </VBtn>
                    </template>
                    <VList bg-color="surface-container-highest" density="comfortable" nav>
                      <VListItem
                        v-if="audioCall && showCallAnalysis"
                        :prepend-icon="transcriptionActive ? 'mdi-text-box-check-outline' : 'mdi-text-box-outline'"
                        :title="transcriptionActive ? 'Остановить транскрибацию' : 'Включить транскрибацию'"
                        :disabled="transcriptionToggleDisabled"
                        @click="emit('toggle-transcription')"
                      />
                      <VListItem
                        v-if="showCallAnalysis"
                        :prepend-icon="callAnalysisActive ? 'mdi-text-box-search' : 'mdi-text-box-search-outline'"
                        :title="callAnalysisActive ? 'Скрыть панель анализа' : 'Открыть панель анализа'"
                        @click="emit('toggle-call-analysis')"
                      />
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
          </template>

          <template v-else>
            <div class="chat-header__call-inline chat-header__call-inline--idle">
              <div class="chat-header__call-primary chat-header__call-primary--idle">
                <VBtn
                  v-if="showAgentExtras"
                  type="button"
                  class="chat-header__icon-btn chat-header__agent-btn"
                  :class="{ 'chat-header__agent-btn--active': headerSheetKind === 'model' }"
                  icon
                  variant="text"
                  :aria-label="agentModelLabel ? `Модель: ${agentModelLabel}` : 'Выбор модели'"
                  :title="agentModelLabel ? `Модель: ${agentModelLabel}` : 'Выбор модели'"
                  :aria-expanded="headerSheetKind === 'model'"
                  aria-controls="chat-header-sheet"
                  :disabled="agentModelPending"
                  @click="toggleHeaderSheet('model')"
                >
                  <VIcon :color="agentModelColor">{{ agentModelIcon }}</VIcon>
                </VBtn>
                <VBtn
                  v-if="showAgentExtras"
                  type="button"
                  class="chat-header__icon-btn chat-header__agent-btn"
                  :class="{ 'chat-header__agent-btn--active': headerSheetKind === 'monitor' || monitorPanelOpen }"
                  icon
                  :variant="headerSheetKind === 'monitor' ? 'tonal' : 'text'"
                  :color="headerSheetKind === 'monitor' ? 'primary' : undefined"
                  aria-label="Мониторинг сессий"
                  title="Мониторинг сессий"
                  :aria-expanded="headerSheetKind === 'monitor'"
                  aria-controls="chat-header-sheet"
                  @click="toggleHeaderSheet('monitor')"
                >
                  <VIcon>mdi-layers-outline</VIcon>
                  <span v-if="monitorSessionCount > 0" class="chat-header__agent-btn-badge" aria-hidden="true">{{ monitorSessionCount }}</span>
                </VBtn>
                <VBtn
                  v-if="showCallActions && showCallAnalysis"
                  type="button"
                  class="chat-header__icon-btn"
                  icon
                  variant="text"
                  aria-label="Анализ звонка"
                  @click="emit('toggle-call-analysis')"
                >
                  <VIcon :color="callAnalysisActive ? 'primary' : undefined">mdi-text-box-search-outline</VIcon>
                </VBtn>
                <VBtn
                  v-if="showCallActions"
                  type="button"
                  class="chat-header__icon-btn"
                  icon
                  variant="text"
                  aria-label="Аудиозвонок"
                  :disabled="!canToggleAudioCall"
                  @click="emit('toggle-audio-call')"
                >
                  <VIcon :color="audioCall ? 'primary' : undefined">mdi-phone</VIcon>
                </VBtn>
                <VBtn
                  v-if="showCallActions"
                  type="button"
                  class="chat-header__icon-btn"
                  icon
                  variant="text"
                  aria-label="Видеозвонок"
                  :disabled="videoCallDisabled"
                  @click="emit('start-video-call')"
                >
                  <VIcon>mdi-video</VIcon>
                </VBtn>
                <VBtn
                  type="button"
                  class="chat-header__icon-btn"
                  :class="{ 'chat-header__agent-btn--active': headerSheetKind === 'overflow' }"
                  icon
                  variant="text"
                  aria-label="Дополнительно"
                  :aria-expanded="headerSheetKind === 'overflow'"
                  aria-controls="chat-header-sheet"
                  @click="toggleHeaderSheet('overflow')"
                >
                  <VIcon>mdi-dots-vertical</VIcon>
                </VBtn>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <MessengerHeaderSheet
      id="chat-header-sheet"
      :model-value="headerSheetKind"
      @update:model-value="headerSheetKind = $event"
    >
      <template #default="{ kind, close }">
        <div v-if="kind === 'model'" class="chat-header-sheet__list">
          <button
            v-for="opt in agentModelOptions"
            :key="opt.value"
            type="button"
            class="chat-header-sheet__row"
            :class="{ 'chat-header-sheet__row--active': opt.value === agentModelCurrentValue }"
            :disabled="agentModelPending || opt.value === agentModelCurrentValue"
            @click="emit('select-agent-model', opt.value); close()"
          >
            <VIcon :color="opt.color" :size="20" class="chat-header-sheet__row-icon">{{ opt.icon }}</VIcon>
            <span class="chat-header-sheet__row-label">{{ opt.label }}</span>
            <VIcon
              v-if="opt.value === agentModelCurrentValue"
              :size="18"
              class="chat-header-sheet__row-check"
              color="primary"
            >mdi-check</VIcon>
          </button>
        </div>

        <div v-else-if="kind === 'monitor'" class="chat-header-sheet__monitor">
          <div class="chat-header-sheet__monitor-summary">
            <span class="chat-header-sheet__monitor-count">{{ monitorSessionCount }}</span>
            <span class="chat-header-sheet__monitor-caption">
              {{ monitorSessionCount === 1 ? 'активная сессия' : 'активных сессий' }}
            </span>
          </div>
          <button
            type="button"
            class="chat-header-sheet__monitor-action"
            @click="emit('toggle-monitor-panel'); close()"
          >
            <VIcon :size="20" class="chat-header-sheet__row-icon">
              {{ monitorPanelOpen ? 'mdi-eye-off-outline' : 'mdi-layers-outline' }}
            </VIcon>
            <span class="chat-header-sheet__row-label">
              {{ monitorPanelOpen ? 'Скрыть боковую панель' : 'Развернуть полную панель' }}
            </span>
          </button>
        </div>

        <div v-else-if="kind === 'overflow'" class="chat-header-sheet__list">
          <button type="button" class="chat-header-sheet__row" @click="emit('toggle-details'); close()">
            <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-magnify</VIcon>
            <span class="chat-header-sheet__row-label">Поиск в переписке</span>
          </button>
          <button type="button" class="chat-header-sheet__row" @click="emit('toggle-details'); close()">
            <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-image-multiple-outline</VIcon>
            <span class="chat-header-sheet__row-label">Медиа и файлы</span>
          </button>
          <div class="chat-header-sheet__divider" aria-hidden="true" />
          <button type="button" class="chat-header-sheet__row">
            <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-account-cancel-outline</VIcon>
            <span class="chat-header-sheet__row-label">Заблокировать</span>
          </button>
          <button type="button" class="chat-header-sheet__row chat-header-sheet__row--danger">
            <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-delete-outline</VIcon>
            <span class="chat-header-sheet__row-label">Удалить диалог</span>
          </button>
        </div>
      </template>
    </MessengerHeaderSheet>
  </header>
</template>