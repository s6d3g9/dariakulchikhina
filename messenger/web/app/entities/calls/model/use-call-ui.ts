export type MessengerCallMode = 'audio' | 'video'

export interface MessengerIncomingCall {
  callId: string
  conversationId: string
  fromUserId: string
  fromDisplayName: string
  mode: MessengerCallMode
  e2ee?: {
    supported: boolean
    publicKey?: {
      kty: 'EC'
      crv: 'P-256'
      x: string
      y: string
      ext?: boolean
      key_ops?: string[]
    }
    salt?: string
  }
}

export interface MessengerActiveCall {
  callId: string
  conversationId: string
  peerUserId: string
  peerDisplayName: string
  mode: MessengerCallMode
  initiator: boolean
}

export interface MessengerCallControlsState {
  microphoneEnabled: boolean
  speakerEnabled: boolean
  videoEnabled: boolean
}

export type MessengerCallViewMode = 'full' | 'split' | 'mini'
export type MessengerCallNetworkQuality = 'stable' | 'weak' | 'reconnecting' | 'lost'
export type MessengerCallCameraFacing = 'user' | 'environment'

const CALL_VIEW_MODE_ORDER: MessengerCallViewMode[] = ['split', 'full', 'mini']

export function useCallUi() {
  const controls = useState<MessengerCallControlsState>('messenger-call-controls', () => ({
    microphoneEnabled: true,
    speakerEnabled: true,
    videoEnabled: false,
  }))
  const viewMode = useState<MessengerCallViewMode>('messenger-call-view-mode', () => 'full')
  const cameraFacing = useState<MessengerCallCameraFacing>('messenger-call-camera-facing', () => 'user')
  const activeCameraId = useState<string>('messenger-call-camera-id', () => '')
  const availableVideoInputIds = useState<string[]>('messenger-call-video-inputs', () => [])
  const networkQuality = useState<MessengerCallNetworkQuality>('messenger-call-network-quality', () => 'stable')
  const networkHint = useState<string>('messenger-call-network-hint', () => '')

  function setCallViewMode(nextMode: MessengerCallViewMode) {
    viewMode.value = nextMode
  }

  function cycleCallViewMode() {
    const currentIndex = CALL_VIEW_MODE_ORDER.indexOf(viewMode.value)
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % CALL_VIEW_MODE_ORDER.length
    viewMode.value = CALL_VIEW_MODE_ORDER[nextIndex] ?? 'split'
  }

  function setNetworkState(nextQuality: MessengerCallNetworkQuality, nextHint: string) {
    networkQuality.value = nextQuality
    networkHint.value = nextHint
  }

  function syncVideoTrackState(track?: MediaStreamTrack | null) {
    if (!track) {
      activeCameraId.value = ''
      return
    }

    const settings = track.getSettings?.()
    if (typeof settings?.deviceId === 'string' && settings.deviceId) {
      activeCameraId.value = settings.deviceId
    }

    if (settings?.facingMode === 'environment' || settings?.facingMode === 'user') {
      cameraFacing.value = settings.facingMode
    }
  }

  async function refreshVideoInputs() {
    if (!import.meta.client || !navigator.mediaDevices?.enumerateDevices) {
      availableVideoInputIds.value = []
      return []
    }

    try {
      const videoInputs = (await navigator.mediaDevices.enumerateDevices())
        .filter(device => device.kind === 'videoinput')
      availableVideoInputIds.value = videoInputs
        .map(device => device.deviceId)
        .filter((deviceId): deviceId is string => Boolean(deviceId))
      return videoInputs
    } catch {
      availableVideoInputIds.value = []
      return []
    }
  }

  return {
    controls,
    viewMode,
    cameraFacing,
    activeCameraId,
    availableVideoInputIds,
    networkQuality,
    networkHint,
    setCallViewMode,
    cycleCallViewMode,
    setNetworkState,
    syncVideoTrackState,
    refreshVideoInputs,
  }
}
