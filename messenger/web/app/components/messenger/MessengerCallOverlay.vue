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
const activeVideoCall = computed(() => Boolean(
  calls.activeCall.value
  && (calls.activeCall.value.mode === 'video' || calls.controls.value.videoEnabled),
))
const showVideoStage = computed(() => activeVideoCall.value)
const showCallLayer = computed(() => Boolean(
  calls.incomingCall.value
  || calls.activeCall.value
  || calls.callError.value
  || calls.callReview.value,
))
const showDetachedStageActions = computed(() => Boolean(!headerActiveCall.value && !showCallAnalysisPanel.value))
const miniWindowPosition = ref({ x: 12, y: 12 })
const miniWindowSize = ref({ width: 176, height: 220 })
const miniDragPointerId = ref<number | null>(null)
const miniDragOffset = ref({ x: 0, y: 0 })
const miniDragVelocity = ref({ x: 0, y: 0 })
const miniLastPointerSample = ref<{ x: number, y: number, time: number } | null>(null)
const miniHasDragged = ref(false)
const weakNetworkVisible = computed(() => calls.networkQuality.value === 'weak' || calls.networkQuality.value === 'reconnecting' || calls.networkQuality.value === 'lost')
const miniOverlayTitle = computed(() => calls.activeCall.value?.peerDisplayName || 'Звонок')
const showCallAnalysisPanel = computed(() => Boolean(
  calls.analysisPanelOpen.value
  && (
    (calls.activeCall.value && calls.activeCall.value.mode === 'audio' && calls.viewMode.value !== 'mini')
    || (!calls.activeCall.value && calls.callReview.value)
  ),
))
const showMobileCallAnalysisPanel = computed(() => Boolean(showCallAnalysisPanel.value && navigation.activeSection.value === 'chat'))
const currentInterpretation = computed(() => calls.analysisInterpretations.value[calls.selectedAnalysisToolId.value] || '')
const miniOverlaySubtitle = computed(() => {
  if (weakNetworkVisible.value && calls.networkHint.value) {
    return calls.networkHint.value
  }

  return calls.callStatusText.value || (calls.controls.value.videoEnabled ? 'Видео активно' : 'Аудиозвонок')
})
const miniStageStyle = computed(() => {
  if (calls.viewMode.value !== 'mini') {
    return undefined
  }

  return {
    left: `${miniWindowPosition.value.x}px`,
    top: `${miniWindowPosition.value.y}px`,
    width: `${miniWindowSize.value.width}px`,
    height: `${miniWindowSize.value.height}px`,
  }
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

function getMiniViewportBounds() {
  if (!import.meta.client) {
    return { minX: 12, minY: 12, maxX: 12, maxY: 12 }
  }

  const safeTop = 12 + Math.max(0, window.visualViewport?.offsetTop || 0)
  const safeLeft = 12
  const maxX = Math.max(safeLeft, window.innerWidth - miniWindowSize.value.width - 12)
  const maxY = Math.max(safeTop, window.innerHeight - miniWindowSize.value.height - 12)
  return {
    minX: safeLeft,
    minY: safeTop,
    maxX,
    maxY,
  }
}

function clampMiniWindowPosition(x: number, y: number) {
  const bounds = getMiniViewportBounds()
  return {
    x: Math.min(Math.max(x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(y, bounds.minY), bounds.maxY),
  }
}

function syncMiniWindowMetrics() {
  if (!import.meta.client) {
    return
  }

  miniWindowSize.value = {
    width: Math.min(Math.max(Math.round(window.innerWidth * 0.42), 152), 192),
    height: Math.min(Math.max(Math.round(window.innerHeight * 0.32), 196), 240),
  }

  miniWindowPosition.value = clampMiniWindowPosition(miniWindowPosition.value.x, miniWindowPosition.value.y)
}

function snapMiniWindowToCorner(projectedX = miniWindowPosition.value.x, projectedY = miniWindowPosition.value.y) {
  if (!import.meta.client) {
    return
  }

  const bounds = getMiniViewportBounds()
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.minX, y: bounds.maxY },
    { x: bounds.maxX, y: bounds.maxY },
  ]

  const nearest = corners.reduce((best, corner) => {
    const bestDistance = Math.hypot(projectedX - best.x, projectedY - best.y)
    const candidateDistance = Math.hypot(projectedX - corner.x, projectedY - corner.y)
    return candidateDistance < bestDistance ? corner : best
  })

  miniWindowPosition.value = { x: nearest.x, y: nearest.y }
}

function handleMiniPointerMove(event: PointerEvent) {
  if (miniDragPointerId.value !== event.pointerId || calls.viewMode.value !== 'mini') {
    return
  }

  const nextPosition = clampMiniWindowPosition(event.clientX - miniDragOffset.value.x, event.clientY - miniDragOffset.value.y)
  miniWindowPosition.value = nextPosition
  miniHasDragged.value = true

  const now = performance.now()
  if (miniLastPointerSample.value) {
    const elapsed = Math.max(now - miniLastPointerSample.value.time, 1)
    miniDragVelocity.value = {
      x: ((event.clientX - miniLastPointerSample.value.x) / elapsed) * 16,
      y: ((event.clientY - miniLastPointerSample.value.y) / elapsed) * 16,
    }
  }

  miniLastPointerSample.value = {
    x: event.clientX,
    y: event.clientY,
    time: now,
  }
}

function stopMiniDragging(event?: PointerEvent) {
  if (event && miniDragPointerId.value !== event.pointerId) {
    return
  }

  if (miniDragPointerId.value === null) {
    return
  }

  miniDragPointerId.value = null
  const projected = clampMiniWindowPosition(
    miniWindowPosition.value.x + (miniDragVelocity.value.x * 7),
    miniWindowPosition.value.y + (miniDragVelocity.value.y * 7),
  )
  miniWindowPosition.value = projected
  snapMiniWindowToCorner(projected.x, projected.y)
  miniLastPointerSample.value = null
  miniDragVelocity.value = { x: 0, y: 0 }
}

function startMiniDragging(event: PointerEvent) {
  if (calls.viewMode.value !== 'mini') {
    return
  }

  miniDragPointerId.value = event.pointerId
  miniHasDragged.value = false
  miniDragOffset.value = {
    x: event.clientX - miniWindowPosition.value.x,
    y: event.clientY - miniWindowPosition.value.y,
  }
  miniLastPointerSample.value = {
    x: event.clientX,
    y: event.clientY,
    time: performance.now(),
  }
  miniDragVelocity.value = { x: 0, y: 0 }
}

function handleMiniTap() {
  if (calls.viewMode.value !== 'mini' || miniHasDragged.value) {
    return
  }

  calls.setCallViewMode('split')
}

function formatTranscriptTime(value: number) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

watch(() => calls.viewMode.value, (nextMode) => {
  if (nextMode === 'mini') {
    syncMiniWindowMetrics()
    miniWindowPosition.value = clampMiniWindowPosition(12, 12)
  }
})

onMounted(() => {
  syncMiniWindowMetrics()
  if (import.meta.client) {
    window.addEventListener('pointermove', handleMiniPointerMove)
    window.addEventListener('pointerup', stopMiniDragging)
    window.addEventListener('resize', syncMiniWindowMetrics)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('pointermove', handleMiniPointerMove)
    window.removeEventListener('pointerup', stopMiniDragging)
    window.removeEventListener('resize', syncMiniWindowMetrics)
  }
  calls.clearElements()
})
</script>

<template>
  <div v-if="showCallLayer" class="call-layer" :class="[`call-layer--${calls.viewMode.value}`]">
    <div v-if="showIncomingFallbackControls" class="call-floating-controls" aria-label="Входящий звонок">
      <VBtn class="call-floating-controls__btn" variant="tonal" color="error" @click="calls.rejectIncomingCall()">Отклонить</VBtn>
      <VBtn class="call-floating-controls__btn" variant="flat" color="success" @click="calls.acceptIncomingCall()">Принять</VBtn>
    </div>

    <div v-else-if="showActiveAudioFallbackControls" class="call-floating-controls call-floating-controls--active" aria-label="Управление звонком">
      <VBtn class="call-floating-controls__btn" variant="tonal" :color="calls.controls.value.microphoneEnabled ? 'primary' : undefined" @click="calls.toggleMicrophone()">{{ calls.controls.value.microphoneEnabled ? 'Микрофон' : 'Микрофон выкл' }}</VBtn>
      <VBtn class="call-floating-controls__btn" variant="tonal" :color="calls.controls.value.speakerEnabled ? 'primary' : undefined" @click="calls.toggleSpeaker()">{{ calls.controls.value.speakerEnabled ? 'Звук' : 'Звук выкл' }}</VBtn>
      <VBtn class="call-floating-controls__btn" variant="tonal" :color="calls.controls.value.videoEnabled ? 'primary' : undefined" @click="calls.toggleVideo()">{{ calls.controls.value.videoEnabled ? 'Видео' : 'Включить видео' }}</VBtn>
      <VBtn class="call-floating-controls__btn" variant="flat" color="error" @click="calls.hangupCall()">Завершить</VBtn>
    </div>

    <section
      v-if="showVideoStage"
      class="call-stage call-stage--video"
      :class="[`call-stage--${calls.viewMode.value}`, { 'call-stage--chat-bound': headerActiveCall, 'call-stage--weak-network': weakNetworkVisible }]"
      :style="miniStageStyle"
      aria-label="Активный звонок"
      @pointerdown="startMiniDragging"
      @click="handleMiniTap"
    >
      <div class="call-stage__surface">
        <div v-if="!headerActiveCall" class="call-stage__meta">
          <p class="call-banner__eyebrow">{{ activeModeLabel }}</p>
          <h3>{{ calls.activeCall.value?.peerDisplayName }}</h3>
          <p>{{ calls.callStatusText.value || 'Соединяем…' }}</p>
          <p v-if="calls.requestingPermissions.value">Запрашиваем доступ к микрофону{{ calls.controls.value.videoEnabled ? ' и камере' : '' }}…</p>
          <div class="call-security">
            <p class="call-security__status">{{ calls.security.value.status }}</p>
            <p v-if="verificationEmojiLine" class="call-security__emojis">{{ verificationEmojiLine }}</p>
            <p v-if="calls.security.value.fallbackReason" class="call-security__fallback">{{ calls.security.value.fallbackReason }}</p>
          </div>
        </div>

        <div class="call-stage__videos">
          <video ref="remoteVideoEl" class="call-video call-video--remote" autoplay playsinline />
          <video ref="localVideoEl" class="call-video call-video--local" :class="{ 'call-video--hidden': !calls.controls.value.videoEnabled }" autoplay muted playsinline />
          <div class="call-stage__status-chip">{{ calls.callStatusText.value || 'Видео активно' }}</div>
          <div v-if="weakNetworkVisible" class="call-stage__network-chip" :class="`call-stage__network-chip--${calls.networkQuality.value}`">
            {{ calls.networkHint.value || 'Связь нестабильна' }}
          </div>
          <div v-if="calls.viewMode.value === 'mini'" class="call-stage__mini-grip" aria-hidden="true"></div>
          <div v-if="calls.viewMode.value === 'mini'" class="call-stage__mini-overlay">
            <div class="call-stage__mini-meta">
              <span class="call-stage__mini-title">{{ miniOverlayTitle }}</span>
              <span class="call-stage__mini-subtitle">{{ miniOverlaySubtitle }}</span>
            </div>
            <div class="call-stage__mini-actions">
              <VBtn class="call-stage__mini-btn" icon="mdi-arrow-expand-all" size="x-small" variant="tonal" @click.stop="calls.cycleCallViewMode()" />
              <VBtn class="call-stage__mini-btn" icon="mdi-phone-hangup" size="x-small" color="error" variant="flat" @click.stop="calls.hangupCall()" />
            </div>
          </div>
        </div>

        <div v-if="showDetachedStageActions" class="call-stage__actions">
          <VBtn class="call-stage__action-btn" variant="tonal" :color="calls.controls.value.microphoneEnabled ? 'primary' : undefined" @click="calls.toggleMicrophone()">Микрофон</VBtn>
          <VBtn class="call-stage__action-btn" variant="tonal" :color="calls.controls.value.speakerEnabled ? 'primary' : undefined" @click="calls.toggleSpeaker()">Звук</VBtn>
          <VBtn class="call-stage__action-btn" variant="tonal" :color="calls.controls.value.videoEnabled ? 'primary' : undefined" @click="calls.toggleVideo()">{{ calls.controls.value.videoEnabled ? 'Видео' : 'Включить видео' }}</VBtn>
          <VBtn v-if="activeVideoCall" class="call-stage__action-btn" variant="tonal" :disabled="!calls.canSwitchCamera.value" @click="calls.switchCamera()">Камера</VBtn>
          <VBtn v-if="activeVideoCall" class="call-stage__action-btn" variant="tonal" @click="calls.cycleCallViewMode()">Размер</VBtn>
          <VBtn class="call-stage__action-btn" variant="flat" color="error" @click="calls.hangupCall()">Завершить</VBtn>
        </div>
      </div>
    </section>

    <p v-if="calls.callError.value" class="call-error">{{ calls.callError.value }}</p>

    <aside
      v-if="showCallAnalysisPanel"
      class="call-transcript-popup"
      :class="{ 'call-transcript-popup--mobile': showMobileCallAnalysisPanel }"
      aria-label="Транскрибация звонка"
    >
      <div class="call-transcript-popup__head">
        <div>
          <p class="call-transcript-popup__eyebrow">ИИ-анализ звонка</p>
          <h4>{{ calls.activeCall.value ? 'Диалог в реальном времени' : 'Итоги завершённого звонка' }}</h4>
          <p class="call-transcript-popup__status">{{ calls.transcriptionError.value || calls.transcriptionHint.value }}</p>
        </div>
        <div class="call-transcript-popup__actions">
          <VBtn
            class="call-transcript-popup__btn"
            size="small"
            variant="tonal"
            :disabled="!calls.transcriptionSupported.value"
            @click="calls.transcriptionActive.value ? calls.stopTranscription() : calls.startTranscription()"
          >
            {{ calls.transcriptionActive.value ? 'Пауза' : 'Старт' }}
          </VBtn>
          <VBtn
            class="call-transcript-popup__btn"
            size="small"
            variant="text"
            :disabled="!calls.transcriptionEntries.value.length && !calls.transcriptionDraft.value"
            @click="calls.clearTranscription()"
          >
            Очистить
          </VBtn>
          <VBtn
            v-if="calls.callReview.value"
            class="call-transcript-popup__btn"
            size="small"
            variant="text"
            @click="calls.clearCallReview()"
          >
            Скрыть
          </VBtn>
          <VBtn
            class="call-transcript-popup__btn"
            size="small"
            variant="text"
            @click="calls.closeAnalysisPanel()"
          >
            Закрыть
          </VBtn>
        </div>
      </div>

      <div class="call-transcript-popup__body">
        <section class="call-transcript-panel">
          <header class="call-transcript-panel__header">
            <h5>1. Чистая транскрипция</h5>
            <span v-if="calls.callReview.value" class="call-transcript-panel__meta">{{ calls.callReview.value.sourceLines }} реплик</span>
          </header>

          <div class="call-transcript-panel__content call-transcript-panel__content--scroll">
            <p v-if="calls.callReview.value?.cleanedTranscript" class="call-transcript-panel__text">{{ calls.callReview.value.cleanedTranscript }}</p>
            <template v-else>
              <p v-if="!calls.transcriptionEntries.value.length && !calls.transcriptionDraft.value" class="call-transcript-popup__empty">
                Ждём распознавание речи...
              </p>
              <article
                v-for="entry in calls.transcriptionEntries.value"
                :key="entry.id"
                class="call-transcript-line"
                :class="`call-transcript-line--${entry.speaker}`"
              >
                <header class="call-transcript-line__meta">
                  <span>{{ entry.speaker === 'peer' ? 'Собеседник' : 'Вы' }}</span>
                  <time>{{ formatTranscriptTime(entry.createdAt) }}</time>
                </header>
                <p>{{ entry.text }}</p>
              </article>
              <article v-if="calls.transcriptionDraft.value" class="call-transcript-line call-transcript-line--draft">
                <header class="call-transcript-line__meta">
                  <span>Распознаём...</span>
                </header>
                <p>{{ calls.transcriptionDraft.value }}</p>
              </article>
            </template>
          </div>
        </section>

        <section class="call-transcript-panel">
          <header class="call-transcript-panel__header">
            <h5>2. Конспект и интерпретации</h5>
          </header>

          <div class="call-transcript-panel__content call-transcript-panel__content--scroll">
            <p v-if="calls.callReview.value?.summary" class="call-transcript-panel__summary">{{ calls.callReview.value.summary }}</p>
            <p v-else class="call-transcript-popup__empty">Конспект появится после завершения звонка.</p>

            <div class="call-transcript-popup__tool-rail" role="tablist" aria-label="Интерпретации разговора">
              <VBtn
                v-for="tool in calls.analysisTools.value"
                :key="tool.id"
                class="call-transcript-popup__tool-btn"
                size="small"
                :variant="calls.selectedAnalysisToolId.value === tool.id ? 'flat' : 'tonal'"
                :color="calls.selectedAnalysisToolId.value === tool.id ? 'primary' : undefined"
                @click="calls.runAnalysisTool(tool.id)"
              >
                {{ tool.title }}
              </VBtn>
            </div>

            <p v-if="calls.analysisError.value" class="call-transcript-popup__empty">{{ calls.analysisError.value }}</p>
            <p v-else-if="calls.analysisRunning.value" class="call-transcript-popup__empty">Строим интерпретацию...</p>
            <p v-else-if="currentInterpretation" class="call-transcript-panel__analysis">{{ currentInterpretation }}</p>
          </div>
        </section>
      </div>
    </aside>

    <audio ref="remoteAudioEl" autoplay />
    <div v-if="calls.callError.value && !calls.activeCall.value" class="call-stage__actions">
      <VBtn class="call-stage__action-btn" variant="tonal" @click="calls.refreshMediaPermissions()">Обновить статусы доступа</VBtn>
      <VBtn class="call-stage__action-btn" variant="flat" color="primary" @click="calls.ensureMediaAccess(calls.incomingCall.value?.mode || 'audio')">Запросить доступ</VBtn>
    </div>
  </div>
</template>