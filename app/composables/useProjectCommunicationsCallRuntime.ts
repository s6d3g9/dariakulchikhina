import { computed, ref, type Ref } from 'vue'
import type { CommunicationCallSecurityState } from '~~/shared/types/communications'

type CallMode = 'audio' | 'video'

type ActiveCallState = {
  callId: string
  peerActorKey: string
  mode: CallMode
  initiator: boolean
}

type CallConnectionTone = 'idle' | 'poor' | 'fair' | 'good'

type CallConnectionQualityState = {
  active: boolean
  tone: CallConnectionTone
  score: number
  bars: number
  title: string
}

type MediaPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown' | 'unsupported'

type CommunicationsApiFetch = <T>(path: string, options?: any) => Promise<T>

type UseProjectCommunicationsCallRuntimeOptions = {
  activeCall: Ref<ActiveCallState | null>
  currentChatRoomId: Ref<string>
  callSecurity: Ref<CommunicationCallSecurityState>
  remoteVideoEl: Ref<HTMLVideoElement | null>
  apiFetch: CommunicationsApiFetch
  getPeerConnection: () => RTCPeerConnection | null
  getLocalStream: () => MediaStream | null
}

function createCallConnectionQualityState(input: {
  active: boolean
  tone: CallConnectionTone
  score: number
  title: string
}): CallConnectionQualityState {
  const normalizedScore = Math.max(0, Math.min(1, input.score))
  return {
    active: input.active,
    tone: input.tone,
    score: normalizedScore,
    bars: Math.max(1, Math.min(4, Math.round(normalizedScore * 4))),
    title: input.title,
  }
}

function mapPermissionLabel(value: MediaPermissionState) {
  switch (value) {
    case 'granted':
      return 'Разрешён'
    case 'denied':
      return 'Заблокирован'
    case 'prompt':
      return 'По запросу'
    case 'unsupported':
      return 'Недоступно'
    default:
      return 'Неизвестно'
  }
}

export function useProjectCommunicationsCallRuntime(options: UseProjectCommunicationsCallRuntimeOptions) {
  const callPermissionHelp = ref('')
  const callConnectionQuality = ref<CallConnectionQualityState>(createCallConnectionQualityState({
    active: false,
    tone: 'idle',
    score: 0.18,
    title: 'Нет активного звонка',
  }))
  const callControls = ref({
    microphoneEnabled: true,
    speakerEnabled: true,
  })
  const mediaPermissionState = ref<Record<'microphone' | 'camera', MediaPermissionState>>({
    microphone: 'unknown',
    camera: 'unknown',
  })

  let callQualityMonitor: ReturnType<typeof setInterval> | null = null

  const supportedCalls = computed(() => Boolean(
    import.meta.client
      && typeof navigator !== 'undefined'
      && navigator.mediaDevices
      && typeof navigator.mediaDevices.getUserMedia === 'function'
      && typeof RTCPeerConnection !== 'undefined',
  ))

  const microphonePermissionLabel = computed(() => mapPermissionLabel(mediaPermissionState.value.microphone))
  const cameraPermissionLabel = computed(() => mapPermissionLabel(mediaPermissionState.value.camera))

  const compactCallSecurityStatus = computed(() => {
    if (options.callSecurity.value.active) return 'Дополнительное E2EE активно'
    if (options.callSecurity.value.available) return 'Дополнительное E2EE доступно'
    return 'Используется штатное шифрование WebRTC'
  })

  const videoReadiness = computed(() => {
    if (!supportedCalls.value) {
      return 'Браузер не поддерживает WebRTC или доступ к медиа.'
    }

    if (mediaPermissionState.value.microphone === 'granted' && mediaPermissionState.value.camera === 'granted') {
      return 'Микрофон и камера разрешены. Аудио- и видеозвонки готовы.'
    }

    if (mediaPermissionState.value.microphone === 'denied' || mediaPermissionState.value.camera === 'denied') {
      return 'Часть разрешений заблокирована. Разрешите доступ к микрофону и камере в браузере.'
    }

    return 'Доступ к микрофону и камере можно проверить заранее, либо браузер запросит его при старте звонка.'
  })

  const callConnectionQualityStyle = computed(() => ({
    '--comm-quality-stop': `${Math.round(callConnectionQuality.value.score * 100)}%`,
    '--comm-quality-hue': `${Math.round(6 + callConnectionQuality.value.score * 126)}`,
    '--comm-quality-alpha': callConnectionQuality.value.active ? '0.92' : '0.38',
  }))

  function setCallConnectionQuality(nextState: {
    active: boolean
    score: number
    title: string
  }) {
    const normalizedScore = Math.max(0, Math.min(1, nextState.score))
    let tone: CallConnectionTone = 'good'
    if (!nextState.active) tone = 'idle'
    else if (normalizedScore < 0.34) tone = 'poor'
    else if (normalizedScore < 0.68) tone = 'fair'

    callConnectionQuality.value = createCallConnectionQualityState({
      active: nextState.active,
      tone,
      score: normalizedScore,
      title: nextState.title,
    })
  }

  function resetCallConnectionQuality() {
    setCallConnectionQuality({
      active: false,
      score: 0.18,
      title: options.activeCall.value ? 'Подключение к звонку' : 'Нет активного звонка',
    })
  }

  function stopCallQualityMonitor() {
    if (callQualityMonitor) {
      clearInterval(callQualityMonitor)
      callQualityMonitor = null
    }
  }

  async function updateCallConnectionQuality(connection = options.getPeerConnection()) {
    if (!connection || !options.activeCall.value) {
      resetCallConnectionQuality()
      return
    }

    if (connection.connectionState === 'failed' || connection.connectionState === 'disconnected' || connection.connectionState === 'closed') {
      setCallConnectionQuality({
        active: true,
        score: connection.connectionState === 'failed' ? 0.06 : 0.14,
        title: connection.connectionState === 'failed' ? 'Связь сорвалась' : 'Связь нестабильна',
      })
      return
    }

    if (connection.connectionState === 'new' || connection.connectionState === 'connecting') {
      setCallConnectionQuality({
        active: true,
        score: 0.46,
        title: 'Идёт согласование канала',
      })
      return
    }

    let currentRoundTripTime = 0
    let availableOutgoingBitrate = 0
    let packetsLost = 0
    let packetsReceived = 0
    let maxJitter = 0

    const stats = await connection.getStats()
    stats.forEach((entry: any) => {
      if (entry.type === 'candidate-pair' && (entry.selected || entry.nominated || entry.state === 'succeeded')) {
        currentRoundTripTime = Math.max(currentRoundTripTime, Number(entry.currentRoundTripTime || 0))
        availableOutgoingBitrate = Math.max(availableOutgoingBitrate, Number(entry.availableOutgoingBitrate || 0))
      }

      if (entry.type === 'inbound-rtp' && !entry.isRemote) {
        packetsLost += Number(entry.packetsLost || 0)
        packetsReceived += Number(entry.packetsReceived || 0)
        maxJitter = Math.max(maxJitter, Number(entry.jitter || 0))
      }
    })

    const totalPackets = packetsReceived + packetsLost
    const packetLossRatio = totalPackets > 0 ? packetsLost / totalPackets : 0
    let score = 0.97

    if (currentRoundTripTime > 0.55) score -= 0.42
    else if (currentRoundTripTime > 0.3) score -= 0.26
    else if (currentRoundTripTime > 0.16) score -= 0.12

    if (maxJitter > 0.12) score -= 0.24
    else if (maxJitter > 0.06) score -= 0.15
    else if (maxJitter > 0.03) score -= 0.08

    if (packetLossRatio > 0.12) score -= 0.34
    else if (packetLossRatio > 0.06) score -= 0.22
    else if (packetLossRatio > 0.02) score -= 0.12

    if (availableOutgoingBitrate > 0 && availableOutgoingBitrate < 64000) score -= 0.24
    else if (availableOutgoingBitrate > 0 && availableOutgoingBitrate < 160000) score -= 0.12

    const qualityScore = Math.max(0.04, Math.min(1, score))
    const rttMs = Math.round(currentRoundTripTime * 1000)
    const lossPercent = Math.round(packetLossRatio * 100)
    const jitterMs = Math.round(maxJitter * 1000)
    setCallConnectionQuality({
      active: true,
      score: qualityScore,
      title: `Связь: RTT ${rttMs || 0} мс, jitter ${jitterMs || 0} мс, потери ${lossPercent}%`,
    })
  }

  function startCallQualityMonitor(connection: RTCPeerConnection) {
    stopCallQualityMonitor()
    void updateCallConnectionQuality(connection)
    callQualityMonitor = setInterval(() => {
      void updateCallConnectionQuality(connection)
    }, 3200)
  }

  function syncMicrophoneState() {
    const localStream = options.getLocalStream()
    if (!localStream) return

    for (const track of localStream.getAudioTracks()) {
      track.enabled = callControls.value.microphoneEnabled
    }
  }

  function syncSpeakerState() {
    if (options.remoteVideoEl.value) {
      options.remoteVideoEl.value.muted = !callControls.value.speakerEnabled
      if (callControls.value.speakerEnabled) {
        void options.remoteVideoEl.value.play().catch(() => {})
      }
    }
  }

  async function setMicrophoneEnabled(enabled: boolean) {
    callControls.value = {
      ...callControls.value,
      microphoneEnabled: enabled,
    }
    syncMicrophoneState()

    if (!options.activeCall.value || !options.currentChatRoomId.value) return
    await options.apiFetch(`/rooms/${options.currentChatRoomId.value}/signals`, {
      method: 'POST',
      body: {
        kind: enabled ? 'unmute' : 'mute',
        callId: options.activeCall.value.callId,
        targetActorKey: options.activeCall.value.peerActorKey,
        payload: {},
      },
    }).catch(() => {})
  }

  async function toggleMicrophone() {
    await setMicrophoneEnabled(!callControls.value.microphoneEnabled)
  }

  function setSpeakerEnabled(enabled: boolean) {
    callControls.value = {
      ...callControls.value,
      speakerEnabled: enabled,
    }
    syncSpeakerState()
  }

  function toggleSpeaker() {
    setSpeakerEnabled(!callControls.value.speakerEnabled)
  }

  async function resolvePermissionState(kind: 'microphone' | 'camera'): Promise<MediaPermissionState> {
    if (!import.meta.client) return 'unknown'
    if (!navigator.permissions?.query) return 'unsupported'

    try {
      const status = await navigator.permissions.query({ name: kind as PermissionName })
      return status.state as MediaPermissionState
    } catch {
      return 'unknown'
    }
  }

  async function refreshMediaPermissions() {
    mediaPermissionState.value = {
      microphone: await resolvePermissionState('microphone'),
      camera: await resolvePermissionState('camera'),
    }
  }

  function describePermissionError(mode: CallMode) {
    const microphoneDenied = mediaPermissionState.value.microphone === 'denied'
    const cameraDenied = mediaPermissionState.value.camera === 'denied'

    if (mode === 'video' && (microphoneDenied || cameraDenied)) {
      return 'Браузер заблокировал микрофон или камеру. Разрешите доступ для этого сайта и повторите видеозвонок.'
    }

    if (mode === 'audio' && microphoneDenied) {
      return 'Браузер заблокировал микрофон. Разрешите доступ для этого сайта и повторите аудиозвонок.'
    }

    return mode === 'video'
      ? 'Нужен доступ к микрофону и камере, чтобы использовать видеозвонки.'
      : 'Нужен доступ к микрофону, чтобы использовать аудиозвонки.'
  }

  async function ensureMediaAccess(mode: CallMode) {
    callPermissionHelp.value = ''

    if (!supportedCalls.value) {
      callPermissionHelp.value = 'Звонки недоступны в этом браузере.'
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video',
      })

      for (const track of stream.getTracks()) {
        track.stop()
      }

      await refreshMediaPermissions()
      return true
    } catch {
      await refreshMediaPermissions()
      callPermissionHelp.value = describePermissionError(mode)
      return false
    }
  }

  async function checkAudioAccess() {
    await ensureMediaAccess('audio')
  }

  async function checkVideoAccess() {
    await ensureMediaAccess('video')
  }

  return {
    callPermissionHelp,
    callConnectionQuality,
    callConnectionQualityStyle,
    callControls,
    supportedCalls,
    microphonePermissionLabel,
    cameraPermissionLabel,
    compactCallSecurityStatus,
    videoReadiness,
    setCallConnectionQuality,
    resetCallConnectionQuality,
    stopCallQualityMonitor,
    updateCallConnectionQuality,
    startCallQualityMonitor,
    syncMicrophoneState,
    syncSpeakerState,
    toggleMicrophone,
    toggleSpeaker,
    refreshMediaPermissions,
    ensureMediaAccess,
    checkAudioAccess,
    checkVideoAccess,
  }
}