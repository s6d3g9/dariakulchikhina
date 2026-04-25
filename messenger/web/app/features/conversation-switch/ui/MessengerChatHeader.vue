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
  agentEffortValue?: 'low' | 'medium' | 'high' | 'xhigh' | 'max'
  agentEffortPending?: boolean
  agentSubscriptionLabel?: string
  agentUsage5h?: { requests: number; limit: number }
  agentUsageWeek?: { requests: number; limit: number }
  agentUsageMonth?: { inputTokens: number; outputTokens: number; cacheReadTokens: number; tokensLimit: number }
  agentClaudeUsage?: {
    fetchedAt: number
    subscriptionType: string
    rateLimitTier: string
    five_hour: { utilization: number; resets_at: number } | null
    seven_day: { utilization: number; resets_at: number } | null
    seven_day_opus: { utilization: number; resets_at: number } | null
    seven_day_sonnet: { utilization: number; resets_at: number } | null
  } | null
  monitorPanelOpen?: boolean
  monitorSessionCount?: number
  monitorSessionGroups?: ReadonlyArray<{
    projectId: string | null
    projectLabel: string
    isCurrent: boolean
    sessions: ReadonlyArray<{
      slug: string
      label: string
      kind: string
      icon: string
      color: string
      isActive: boolean
      isIdle: boolean
      tier: number
      model?: string
      lastTool?: string | null
      tokenIn?: number
      tokenOut?: number
      costUsd?: number
    }>
  }>
  galleryPhotos?: ReadonlyArray<{ id: string; title: string; meta: string; href: string; previewUrl?: string }>
  galleryStickers?: ReadonlyArray<{ id: string; title: string; meta: string; href: string; previewUrl?: string }>
  galleryDocuments?: ReadonlyArray<{ id: string; title: string; meta: string; href: string; previewUrl?: string }>
  galleryLinks?: ReadonlyArray<{ id: string; title: string; meta: string; href: string; previewUrl?: string }>
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
  agentEffortValue: 'medium',
  agentEffortPending: false,
  agentSubscriptionLabel: '',
  agentUsage5h: () => ({ requests: 0, limit: 0 }),
  agentUsageWeek: () => ({ requests: 0, limit: 0 }),
  agentUsageMonth: () => ({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, tokensLimit: 0 }),
  agentClaudeUsage: () => null,
  monitorPanelOpen: false,
  monitorSessionCount: 0,
  monitorSessionGroups: () => [],
  galleryPhotos: () => [],
  galleryStickers: () => [],
  galleryDocuments: () => [],
  galleryLinks: () => [],
})

const showOtherProjects = ref(false)
const showIdleSessions = ref(false)
const visibleMonitorGroups = computed(() => {
  const base = showOtherProjects.value
    ? props.monitorSessionGroups
    : props.monitorSessionGroups.filter(g => g.isCurrent)
  return base.map(g => ({
    ...g,
    activeSessions: g.sessions.filter(s => s.isActive),
    idleSessions: g.sessions.filter(s => !s.isActive),
  }))
})
const hasCurrentProjectGroup = computed(() => props.monitorSessionGroups.some(g => g.isCurrent))
const otherProjectsCount = computed(() =>
  props.monitorSessionGroups
    .filter(g => !g.isCurrent)
    .reduce((acc, g) => acc + g.sessions.length, 0),
)
const totalIdleInVisible = computed(() =>
  visibleMonitorGroups.value.reduce((acc, g) => acc + g.idleSessions.length, 0),
)
const totalActiveInVisible = computed(() =>
  visibleMonitorGroups.value.reduce((acc, g) => acc + g.activeSessions.length, 0),
)

type EffortValue = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

const EFFORT_CHIPS: Array<{ value: EffortValue; label: string; hint: string; icon: string }> = [
  { value: 'low',    label: 'Low',    hint: 'быстрее, дешевле',         icon: 'mdi-speedometer-slow'   },
  { value: 'medium', label: 'Medium', hint: 'баланс',                   icon: 'mdi-speedometer-medium' },
  { value: 'high',   label: 'High',   hint: 'глубже, дольше',           icon: 'mdi-speedometer'        },
  { value: 'xhigh',  label: 'X-High', hint: 'максимум reasoning',       icon: 'mdi-flash'              },
  { value: 'max',    label: 'Max',    hint: 'без ограничений',          icon: 'mdi-flash-triangle'     },
]

function effortLabel(v: EffortValue): string {
  return EFFORT_CHIPS.find(c => c.value === v)?.label ?? 'Medium'
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

function pct(n: number, limit: number): number {
  if (!limit || limit <= 0) return 0
  return Math.min(100, Math.round((n / limit) * 100))
}

function pctClass(p: number): string {
  if (p >= 90) return 'chat-header-sheet__usage-bar--danger'
  if (p >= 70) return 'chat-header-sheet__usage-bar--warn'
  return ''
}

function utilizationPct(util: number | null | undefined): number {
  if (!util || util <= 0) return 0
  return Math.min(100, Math.round(util * 100))
}

function formatResetIn(ts: number | null | undefined): string {
  if (!ts) return ''
  const ms = ts * 1000 - Date.now()
  if (ms <= 0) return 'скоро'
  const minutes = Math.floor(ms / 60_000)
  const days = Math.floor(minutes / (60 * 24))
  if (days >= 1) {
    const hours = Math.floor((minutes - days * 24 * 60) / 60)
    return hours > 0 ? `через ${days} д ${hours} ч` : `через ${days} д`
  }
  const hours = Math.floor(minutes / 60)
  if (hours >= 1) {
    const mins = minutes - hours * 60
    return mins > 0 ? `через ${hours} ч ${mins} мин` : `через ${hours} ч`
  }
  return `через ${Math.max(1, minutes)} мин`
}

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
  'select-agent-effort': [value: 'low' | 'medium' | 'high' | 'xhigh' | 'max']
  'toggle-monitor-panel': []
  'open-monitor-session': [slug: string]
  'open-shared-gallery': [section?: 'photos' | 'stickers' | 'documents' | 'links' | 'keys']
  'open-chat-search': []
}>()

const overflowMenuOpen = ref(false)
type HeaderSheetKind = 'model' | 'monitor' | 'overflow' | 'contact' | 'gallery' | null
const headerSheetKind = ref<HeaderSheetKind>(null)
const isHeaderSheetOpen = computed(() => headerSheetKind.value !== null)

type GallerySection = 'photos' | 'stickers' | 'documents' | 'links'
const gallerySection = ref<GallerySection>('photos')

function openInlineGallery(section: GallerySection) {
  gallerySection.value = section
  headerSheetKind.value = 'gallery'
}

const GALLERY_SECTIONS: Array<{ value: GallerySection; label: string; icon: string }> = [
  { value: 'photos',    label: 'Фото',     icon: 'mdi-image-multiple-outline' },
  { value: 'stickers',  label: 'Стикеры',  icon: 'mdi-sticker-emoji' },
  { value: 'documents', label: 'Файлы',    icon: 'mdi-file-document-outline' },
  { value: 'links',     label: 'Ссылки',   icon: 'mdi-link-variant' },
]

const galleryItems = computed(() => {
  switch (gallerySection.value) {
    case 'photos': return props.galleryPhotos
    case 'stickers': return props.galleryStickers
    case 'documents': return props.galleryDocuments
    case 'links': return props.galleryLinks
  }
})

const gallerySectionCounts = computed(() => ({
  photos: props.galleryPhotos.length,
  stickers: props.galleryStickers.length,
  documents: props.galleryDocuments.length,
  links: props.galleryLinks.length,
}))

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
          :class="{ 'chat-header__peer--active': headerSheetKind === 'contact' }"
          variant="text"
          :disabled="disabled"
          :aria-expanded="headerSheetKind === 'contact'"
          aria-controls="chat-header-sheet"
          @click="callVisible ? emit('toggle-details') : toggleHeaderSheet('contact')"
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
        <div v-if="kind === 'contact'" class="chat-header-sheet__contact">
          <div class="chat-header-sheet__contact-hero">
            <VAvatar color="primary" variant="tonal" size="64">{{ peerAvatar }}</VAvatar>
            <div class="chat-header-sheet__contact-meta">
              <span class="chat-header-sheet__contact-name title-medium">
                <span>{{ peerName }}</span>
                <MessengerIcon
                  v-if="conversationSecret"
                  class="chat-secret-marker"
                  name="shield"
                  :size="14"
                  aria-hidden="true"
                />
              </span>
              <span v-if="agentModelLabel" class="chat-header-sheet__contact-caption label-small">
                {{ agentModelLabel }}
              </span>
            </div>
          </div>
          <div class="chat-header-sheet__list">
            <button
              type="button"
              class="chat-header-sheet__row"
              @click="emit('open-chat-search'); close()"
            >
              <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-magnify</VIcon>
              <span class="chat-header-sheet__row-label">Поиск в переписке</span>
            </button>
            <button
              type="button"
              class="chat-header-sheet__row"
              @click="openInlineGallery('photos')"
            >
              <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-image-multiple-outline</VIcon>
              <span class="chat-header-sheet__row-label">Фото и стикеры</span>
              <span class="chat-header-sheet__row-hint label-small">{{ galleryPhotos.length + galleryStickers.length }}</span>
            </button>
            <button
              type="button"
              class="chat-header-sheet__row"
              @click="openInlineGallery('documents')"
            >
              <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-file-document-outline</VIcon>
              <span class="chat-header-sheet__row-label">Файлы</span>
              <span class="chat-header-sheet__row-hint label-small">{{ galleryDocuments.length }}</span>
            </button>
            <button
              type="button"
              class="chat-header-sheet__row"
              @click="openInlineGallery('links')"
            >
              <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-link-variant</VIcon>
              <span class="chat-header-sheet__row-label">Ссылки</span>
              <span class="chat-header-sheet__row-hint label-small">{{ galleryLinks.length }}</span>
            </button>
            <div class="chat-header-sheet__divider" aria-hidden="true" />
            <button type="button" class="chat-header-sheet__row" disabled>
              <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-bell-off-outline</VIcon>
              <span class="chat-header-sheet__row-label">Отключить уведомления</span>
              <span class="chat-header-sheet__row-hint label-small">скоро</span>
            </button>
            <button type="button" class="chat-header-sheet__row" disabled>
              <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-broom</VIcon>
              <span class="chat-header-sheet__row-label">Очистить историю</span>
              <span class="chat-header-sheet__row-hint label-small">скоро</span>
            </button>
            <button type="button" class="chat-header-sheet__row chat-header-sheet__row--danger" disabled>
              <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-account-cancel-outline</VIcon>
              <span class="chat-header-sheet__row-label">Заблокировать</span>
              <span class="chat-header-sheet__row-hint label-small">скоро</span>
            </button>
          </div>
        </div>

        <div v-else-if="kind === 'model'" class="chat-header-sheet__model">
          <div class="chat-header-sheet__section-title label-small">Модель</div>
          <div class="chat-header-sheet__list">
            <button
              v-for="opt in agentModelOptions"
              :key="opt.value"
              type="button"
              class="chat-header-sheet__row"
              :class="{ 'chat-header-sheet__row--active': opt.value === agentModelCurrentValue }"
              :disabled="agentModelPending || opt.value === agentModelCurrentValue"
              @click="emit('select-agent-model', opt.value)"
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

          <div class="chat-header-sheet__divider" aria-hidden="true" />
          <div class="chat-header-sheet__section-title label-small">
            Effort
            <span class="chat-header-sheet__section-hint">{{ effortLabel(agentEffortValue) }}</span>
          </div>
          <div class="chat-header-sheet__effort-chips">
            <button
              v-for="chip in EFFORT_CHIPS"
              :key="chip.value"
              type="button"
              class="chat-header-sheet__effort-chip"
              :class="{ 'chat-header-sheet__effort-chip--active': chip.value === agentEffortValue }"
              :disabled="agentEffortPending || chip.value === agentEffortValue"
              :title="chip.hint"
              @click="emit('select-agent-effort', chip.value)"
            >
              <VIcon :size="16" class="chat-header-sheet__effort-chip-icon">{{ chip.icon }}</VIcon>
              <span class="chat-header-sheet__effort-chip-label">{{ chip.label }}</span>
            </button>
          </div>

          <div class="chat-header-sheet__divider" aria-hidden="true" />
          <div class="chat-header-sheet__section-title label-small">
            Использование
            <span v-if="agentSubscriptionLabel" class="chat-header-sheet__section-hint">{{ agentSubscriptionLabel }}</span>
          </div>
          <div v-if="agentClaudeUsage" class="chat-header-sheet__usage">
            <div class="chat-header-sheet__usage-row">
              <span class="chat-header-sheet__usage-label">5 ч</span>
              <div class="chat-header-sheet__usage-track">
                <div
                  class="chat-header-sheet__usage-bar"
                  :class="pctClass(utilizationPct(agentClaudeUsage.five_hour?.utilization))"
                  :style="{ width: utilizationPct(agentClaudeUsage.five_hour?.utilization) + '%' }"
                />
              </div>
              <span class="chat-header-sheet__usage-value label-small">{{ utilizationPct(agentClaudeUsage.five_hour?.utilization) }}%</span>
            </div>
            <div v-if="agentClaudeUsage.five_hour" class="chat-header-sheet__usage-meta label-small">
              сбросится {{ formatResetIn(agentClaudeUsage.five_hour.resets_at) }}
            </div>

            <div class="chat-header-sheet__usage-row">
              <span class="chat-header-sheet__usage-label">7 дн</span>
              <div class="chat-header-sheet__usage-track">
                <div
                  class="chat-header-sheet__usage-bar"
                  :class="pctClass(utilizationPct(agentClaudeUsage.seven_day?.utilization))"
                  :style="{ width: utilizationPct(agentClaudeUsage.seven_day?.utilization) + '%' }"
                />
              </div>
              <span class="chat-header-sheet__usage-value label-small">{{ utilizationPct(agentClaudeUsage.seven_day?.utilization) }}%</span>
            </div>
            <div v-if="agentClaudeUsage.seven_day" class="chat-header-sheet__usage-meta label-small">
              сбросится {{ formatResetIn(agentClaudeUsage.seven_day.resets_at) }}
            </div>

            <div v-if="agentClaudeUsage.seven_day_opus" class="chat-header-sheet__usage-row">
              <span class="chat-header-sheet__usage-label">7 дн · Opus</span>
              <div class="chat-header-sheet__usage-track">
                <div
                  class="chat-header-sheet__usage-bar"
                  :class="pctClass(utilizationPct(agentClaudeUsage.seven_day_opus.utilization))"
                  :style="{ width: utilizationPct(agentClaudeUsage.seven_day_opus.utilization) + '%' }"
                />
              </div>
              <span class="chat-header-sheet__usage-value label-small">{{ utilizationPct(agentClaudeUsage.seven_day_opus.utilization) }}%</span>
            </div>

            <div v-if="agentClaudeUsage.seven_day_sonnet" class="chat-header-sheet__usage-row">
              <span class="chat-header-sheet__usage-label">7 дн · Sonnet</span>
              <div class="chat-header-sheet__usage-track">
                <div
                  class="chat-header-sheet__usage-bar"
                  :class="pctClass(utilizationPct(agentClaudeUsage.seven_day_sonnet.utilization))"
                  :style="{ width: utilizationPct(agentClaudeUsage.seven_day_sonnet.utilization) + '%' }"
                />
              </div>
              <span class="chat-header-sheet__usage-value label-small">{{ utilizationPct(agentClaudeUsage.seven_day_sonnet.utilization) }}%</span>
            </div>

            <div class="chat-header-sheet__usage-meta label-small">
              <VIcon :size="14">mdi-shield-check-outline</VIcon>
              {{ agentClaudeUsage.subscriptionType }} · {{ agentClaudeUsage.rateLimitTier }}
            </div>
          </div>
          <div v-else class="chat-header-sheet__usage">
            <div class="chat-header-sheet__usage-row">
              <span class="chat-header-sheet__usage-label">5 ч</span>
              <div class="chat-header-sheet__usage-track">
                <div
                  class="chat-header-sheet__usage-bar"
                  :class="pctClass(pct(agentUsage5h.requests, agentUsage5h.limit))"
                  :style="{ width: pct(agentUsage5h.requests, agentUsage5h.limit) + '%' }"
                />
              </div>
              <span class="chat-header-sheet__usage-value label-small">{{ agentUsage5h.requests }}<span v-if="agentUsage5h.limit" class="chat-header-sheet__usage-limit">/{{ agentUsage5h.limit }}</span></span>
            </div>
            <div class="chat-header-sheet__usage-row">
              <span class="chat-header-sheet__usage-label">Неделя</span>
              <div class="chat-header-sheet__usage-track">
                <div
                  class="chat-header-sheet__usage-bar"
                  :class="pctClass(pct(agentUsageWeek.requests, agentUsageWeek.limit))"
                  :style="{ width: pct(agentUsageWeek.requests, agentUsageWeek.limit) + '%' }"
                />
              </div>
              <span class="chat-header-sheet__usage-value label-small">{{ agentUsageWeek.requests }}<span v-if="agentUsageWeek.limit" class="chat-header-sheet__usage-limit">/{{ agentUsageWeek.limit }}</span></span>
            </div>
            <div class="chat-header-sheet__usage-row">
              <span class="chat-header-sheet__usage-label">Токены / мес</span>
              <div class="chat-header-sheet__usage-track">
                <div
                  class="chat-header-sheet__usage-bar"
                  :class="pctClass(pct(agentUsageMonth.inputTokens + agentUsageMonth.outputTokens, agentUsageMonth.tokensLimit))"
                  :style="{ width: pct(agentUsageMonth.inputTokens + agentUsageMonth.outputTokens, agentUsageMonth.tokensLimit) + '%' }"
                />
              </div>
              <span class="chat-header-sheet__usage-value label-small">{{ fmtTokens(agentUsageMonth.inputTokens + agentUsageMonth.outputTokens) }}<span v-if="agentUsageMonth.tokensLimit" class="chat-header-sheet__usage-limit">/{{ fmtTokens(agentUsageMonth.tokensLimit) }}</span></span>
            </div>
            <div v-if="agentUsageMonth.cacheReadTokens > 0" class="chat-header-sheet__usage-meta label-small">
              <VIcon :size="14">mdi-database-arrow-down-outline</VIcon>
              кэш-чтение: {{ fmtTokens(agentUsageMonth.cacheReadTokens) }}
            </div>
          </div>
        </div>

        <div v-else-if="kind === 'monitor'" class="chat-header-sheet__monitor">
          <div class="chat-header-sheet__monitor-summary">
            <span class="chat-header-sheet__monitor-count">{{ monitorSessionCount }}</span>
            <span class="chat-header-sheet__monitor-caption">
              {{ monitorSessionCount === 1 ? 'отвечает сейчас' : 'отвечают сейчас' }}
              <template v-if="hasCurrentProjectGroup"> в проекте</template>
            </span>
          </div>

          <div v-if="visibleMonitorGroups.length === 0" class="chat-header-sheet__monitor-empty label-small">
            <template v-if="hasCurrentProjectGroup">Нет запущенных сессий в этом проекте</template>
            <template v-else>Нет запущенных сессий</template>
          </div>

          <div v-else-if="totalActiveInVisible === 0 && !showIdleSessions" class="chat-header-sheet__monitor-empty label-small">
            Сейчас нет активно отвечающих сессий.
            <template v-if="totalIdleInVisible > 0"> Есть {{ totalIdleInVisible }} запущенных, но idle.</template>
          </div>

          <div
            v-for="group in visibleMonitorGroups"
            :key="group.projectId ?? '__none__'"
            class="chat-header-sheet__monitor-group"
            :class="{ 'chat-header-sheet__monitor-group--current': group.isCurrent }"
          >
            <div class="chat-header-sheet__monitor-group-header label-small">
              <VIcon
                :size="14"
                class="chat-header-sheet__monitor-group-icon"
              >{{ group.isCurrent ? 'mdi-folder-star-outline' : (group.projectId ? 'mdi-folder-outline' : 'mdi-folder-question-outline') }}</VIcon>
              <span class="chat-header-sheet__monitor-group-label">{{ group.projectLabel }}</span>
              <span class="chat-header-sheet__monitor-group-count">{{ group.activeSessions.length }}/{{ group.sessions.length }}</span>
            </div>

            <div v-if="group.activeSessions.length > 0" class="chat-header-sheet__monitor-section-title label-small">
              <span class="chat-header-sheet__monitor-section-dot chat-header-sheet__monitor-section-dot--live" aria-hidden="true" />
              Активные
            </div>
            <div v-if="group.activeSessions.length > 0" class="chat-header-sheet__monitor-list">
              <button
                v-for="sess in group.activeSessions"
                :key="sess.slug"
                type="button"
                class="chat-header-sheet__monitor-item"
                :class="{
                  'chat-header-sheet__monitor-item--tier-1': sess.tier === 1,
                  'chat-header-sheet__monitor-item--tier-2': sess.tier === 2,
                }"
                :title="sess.slug"
                @click="emit('open-monitor-session', sess.slug); close()"
              >
                <span class="chat-header-sheet__monitor-dot chat-header-sheet__monitor-dot--live" aria-hidden="true" />
                <VIcon :color="sess.color" :size="18" class="chat-header-sheet__monitor-icon">{{ sess.icon }}</VIcon>
                <div class="chat-header-sheet__monitor-body">
                  <div class="chat-header-sheet__monitor-row-top">
                    <span class="chat-header-sheet__monitor-label">{{ sess.label }}</span>
                    <span v-if="sess.model" class="chat-header-sheet__monitor-model label-small">{{ sess.model }}</span>
                  </div>
                  <div class="chat-header-sheet__monitor-row-bottom label-small">
                    <span v-if="sess.lastTool" class="chat-header-sheet__monitor-tool" :title="sess.lastTool">{{ sess.lastTool }}</span>
                    <span v-else class="chat-header-sheet__monitor-tool">active</span>
                    <span v-if="(sess.tokenIn ?? 0) + (sess.tokenOut ?? 0) > 0" class="chat-header-sheet__monitor-tokens">
                      Σ {{ fmtTokens((sess.tokenIn ?? 0) + (sess.tokenOut ?? 0)) }}
                    </span>
                    <span v-if="(sess.costUsd ?? 0) > 0" class="chat-header-sheet__monitor-cost">
                      ${{ (sess.costUsd ?? 0).toFixed(2) }}
                    </span>
                  </div>
                </div>
              </button>
            </div>

            <div v-if="showIdleSessions && group.idleSessions.length > 0" class="chat-header-sheet__monitor-section-title label-small">
              <span class="chat-header-sheet__monitor-section-dot chat-header-sheet__monitor-section-dot--idle" aria-hidden="true" />
              Idle
            </div>
            <div v-if="showIdleSessions && group.idleSessions.length > 0" class="chat-header-sheet__monitor-list">
              <button
                v-for="sess in group.idleSessions"
                :key="sess.slug"
                type="button"
                class="chat-header-sheet__monitor-item chat-header-sheet__monitor-item--idle"
                :class="{
                  'chat-header-sheet__monitor-item--tier-1': sess.tier === 1,
                  'chat-header-sheet__monitor-item--tier-2': sess.tier === 2,
                }"
                :title="sess.slug"
                @click="emit('open-monitor-session', sess.slug); close()"
              >
                <span class="chat-header-sheet__monitor-dot chat-header-sheet__monitor-dot--idle" aria-hidden="true" />
                <VIcon :color="sess.color" :size="18" class="chat-header-sheet__monitor-icon">{{ sess.icon }}</VIcon>
                <div class="chat-header-sheet__monitor-body">
                  <div class="chat-header-sheet__monitor-row-top">
                    <span class="chat-header-sheet__monitor-label">{{ sess.label }}</span>
                    <span v-if="sess.model" class="chat-header-sheet__monitor-model label-small">{{ sess.model }}</span>
                  </div>
                  <div class="chat-header-sheet__monitor-row-bottom label-small">
                    <span v-if="sess.lastTool" class="chat-header-sheet__monitor-tool" :title="sess.lastTool">{{ sess.lastTool }}</span>
                    <span v-else class="chat-header-sheet__monitor-tool chat-header-sheet__monitor-tool--idle">idle</span>
                    <span v-if="(sess.tokenIn ?? 0) + (sess.tokenOut ?? 0) > 0" class="chat-header-sheet__monitor-tokens">
                      Σ {{ fmtTokens((sess.tokenIn ?? 0) + (sess.tokenOut ?? 0)) }}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <button
            v-if="totalIdleInVisible > 0"
            type="button"
            class="chat-header-sheet__monitor-toggle label-small"
            @click="showIdleSessions = !showIdleSessions"
          >
            <VIcon :size="14">{{ showIdleSessions ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</VIcon>
            <span>
              {{ showIdleSessions ? 'Скрыть idle' : `Показать idle (${totalIdleInVisible})` }}
            </span>
          </button>

          <button
            v-if="hasCurrentProjectGroup && otherProjectsCount > 0"
            type="button"
            class="chat-header-sheet__monitor-toggle label-small"
            @click="showOtherProjects = !showOtherProjects"
          >
            <VIcon :size="14">{{ showOtherProjects ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</VIcon>
            <span>
              {{ showOtherProjects ? 'Только текущий проект' : `Показать другие проекты (${otherProjectsCount})` }}
            </span>
          </button>

          <div class="chat-header-sheet__divider" aria-hidden="true" />
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

        <div v-else-if="kind === 'gallery'" class="chat-header-sheet__gallery">
          <div class="chat-header-sheet__gallery-header">
            <button
              type="button"
              class="chat-header-sheet__gallery-back"
              :aria-label="'Назад к контакту'"
              @click="headerSheetKind = 'contact'"
            >
              <VIcon :size="20">mdi-arrow-left</VIcon>
            </button>
            <span class="chat-header-sheet__gallery-title title-small">Галерея</span>
            <button
              type="button"
              class="chat-header-sheet__gallery-expand"
              title="Открыть полную галерею в боковой панели"
              @click="emit('open-shared-gallery', gallerySection); close()"
            >
              <VIcon :size="18">mdi-arrow-expand</VIcon>
            </button>
          </div>

          <div class="chat-header-sheet__gallery-tabs" role="tablist">
            <button
              v-for="tab in GALLERY_SECTIONS"
              :key="tab.value"
              type="button"
              role="tab"
              :aria-selected="tab.value === gallerySection"
              class="chat-header-sheet__gallery-tab"
              :class="{ 'chat-header-sheet__gallery-tab--active': tab.value === gallerySection }"
              @click="gallerySection = tab.value"
            >
              <VIcon :size="16">{{ tab.icon }}</VIcon>
              <span>{{ tab.label }}</span>
              <span class="chat-header-sheet__gallery-tab-count">{{ gallerySectionCounts[tab.value] }}</span>
            </button>
          </div>

          <div v-if="galleryItems.length === 0" class="chat-header-sheet__gallery-empty label-small">
            Пока нет {{ gallerySection === 'photos' ? 'фото' : gallerySection === 'stickers' ? 'стикеров' : gallerySection === 'documents' ? 'файлов' : 'ссылок' }} в этой переписке
          </div>

          <div
            v-else-if="gallerySection === 'photos' || gallerySection === 'stickers'"
            class="chat-header-sheet__gallery-grid"
          >
            <a
              v-for="item in galleryItems"
              :key="item.id"
              :href="item.href"
              target="_blank"
              rel="noopener noreferrer"
              class="chat-header-sheet__gallery-thumb"
              :title="item.title"
            >
              <img
                v-if="item.previewUrl"
                :src="item.previewUrl"
                :alt="item.title"
                loading="lazy"
              >
              <VIcon v-else :size="22">mdi-image-off-outline</VIcon>
            </a>
          </div>

          <div v-else class="chat-header-sheet__gallery-list">
            <a
              v-for="item in galleryItems"
              :key="item.id"
              :href="item.href"
              target="_blank"
              rel="noopener noreferrer"
              class="chat-header-sheet__gallery-row"
              :title="item.title"
            >
              <VIcon
                :size="20"
                class="chat-header-sheet__gallery-row-icon"
              >{{ gallerySection === 'documents' ? 'mdi-file-document-outline' : 'mdi-link-variant' }}</VIcon>
              <span class="chat-header-sheet__gallery-row-body">
                <span class="chat-header-sheet__gallery-row-title">{{ item.title }}</span>
                <span class="chat-header-sheet__gallery-row-meta label-small">{{ item.meta }}</span>
              </span>
              <VIcon :size="16" class="chat-header-sheet__gallery-row-chevron">mdi-chevron-right</VIcon>
            </a>
          </div>
        </div>

        <div v-else-if="kind === 'overflow'" class="chat-header-sheet__list">
          <button
            type="button"
            class="chat-header-sheet__row"
            @click="emit('open-chat-search'); close()"
          >
            <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-magnify</VIcon>
            <span class="chat-header-sheet__row-label">Поиск в переписке</span>
          </button>
          <button
            type="button"
            class="chat-header-sheet__row"
            @click="openInlineGallery('photos')"
          >
            <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-image-multiple-outline</VIcon>
            <span class="chat-header-sheet__row-label">Фото и стикеры</span>
            <span class="chat-header-sheet__row-hint label-small">{{ galleryPhotos.length + galleryStickers.length }}</span>
          </button>
          <button
            type="button"
            class="chat-header-sheet__row"
            @click="openInlineGallery('documents')"
          >
            <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-file-document-outline</VIcon>
            <span class="chat-header-sheet__row-label">Файлы</span>
            <span class="chat-header-sheet__row-hint label-small">{{ galleryDocuments.length }}</span>
          </button>
          <button
            type="button"
            class="chat-header-sheet__row"
            @click="openInlineGallery('links')"
          >
            <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-link-variant</VIcon>
            <span class="chat-header-sheet__row-label">Ссылки</span>
            <span class="chat-header-sheet__row-hint label-small">{{ galleryLinks.length }}</span>
          </button>
          <div class="chat-header-sheet__divider" aria-hidden="true" />
          <button type="button" class="chat-header-sheet__row" disabled>
            <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-account-cancel-outline</VIcon>
            <span class="chat-header-sheet__row-label">Заблокировать</span>
            <span class="chat-header-sheet__row-hint label-small">скоро</span>
          </button>
          <button type="button" class="chat-header-sheet__row chat-header-sheet__row--danger" disabled>
            <VIcon :size="20" class="chat-header-sheet__row-icon">mdi-delete-outline</VIcon>
            <span class="chat-header-sheet__row-label">Удалить диалог</span>
            <span class="chat-header-sheet__row-hint label-small">скоро</span>
          </button>
        </div>
      </template>
    </MessengerHeaderSheet>
  </header>
</template>