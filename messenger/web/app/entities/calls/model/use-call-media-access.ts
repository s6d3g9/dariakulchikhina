export type MessengerCallMode = 'audio' | 'video'
export type MessengerMediaPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown'
export type MessengerPermissionTarget = 'microphone' | 'camera' | 'media'

export interface CallMediaAccessOptions {
  /** Returns the currently-held local MediaStream (managed by caller). */
  getLocalStream: () => MediaStream | null
  /** Called once getUserMedia succeeds and audio hints are applied. Caller should store the stream and run stream side-effects (assignMediaTargets, syncMicrophoneState, etc.). */
  onStreamAcquired: (stream: MediaStream) => void
  /** Called after the stream is obtained or the early-return path, so the caller can sync activeCameraId / cameraFacing. */
  onSyncVideoTrackState: (track: MediaStreamTrack | null) => void
}

async function resolvePermissionState(kind: 'microphone' | 'camera'): Promise<MessengerMediaPermissionState> {
  if (!import.meta.client) {
    return 'unknown'
  }

  if (!navigator.permissions?.query) {
    return 'unknown'
  }

  try {
    const status = await navigator.permissions.query({ name: kind as PermissionName })
    return status.state
  } catch {
    return 'unknown'
  }
}

function getSitePermissionsUrl(target: MessengerPermissionTarget): string | null {
  if (!import.meta.client) {
    return null
  }

  const site = encodeURIComponent(window.location.origin)
  const ua = navigator.userAgent

  if (ua.includes('Edg/')) {
    return `edge://settings/content/siteDetails?site=${site}`
  }

  if (ua.includes('Chrome')) {
    return `chrome://settings/content/siteDetails?site=${site}`
  }

  if (ua.includes('Firefox')) {
    return 'about:preferences#privacy'
  }

  if (ua.includes('Safari')) {
    return target === 'camera'
      ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera'
      : 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
  }

  return null
}

export function useCallMediaAccess(opts: CallMediaAccessOptions) {
  // Shares state with useMessengerCalls via stable useState keys.
  const callError = useState<string>('messenger-call-error', () => '')
  const requestingPermissions = useState<boolean>('messenger-call-requesting-permissions', () => false)
  const permissionHelp = useState<string>('messenger-call-permission-help', () => '')
  const mediaPermissionState = useState<Record<'microphone' | 'camera', MessengerMediaPermissionState>>(
    'messenger-call-media-permissions',
    () => ({ microphone: 'unknown', camera: 'unknown' }),
  )
  const availableVideoInputIds = useState<string[]>('messenger-call-video-inputs', () => [])

  const supported = computed(() => Boolean(
    import.meta.client
    && typeof navigator.mediaDevices?.getUserMedia === 'function'
    && typeof RTCPeerConnection !== 'undefined',
  ))

  async function refreshMediaPermissions() {
    mediaPermissionState.value = {
      microphone: await resolvePermissionState('microphone'),
      camera: await resolvePermissionState('camera'),
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

  function openSitePermissions(target: MessengerPermissionTarget): boolean {
    if (!import.meta.client) {
      return false
    }

    const nextUrl = getSitePermissionsUrl(target)
    if (!nextUrl) {
      permissionHelp.value = 'Автопереход в site permissions не поддерживается этим браузером. Откройте настройки сайта вручную.'
      return false
    }

    permissionHelp.value = ''

    const popup = window.open(nextUrl, '_blank', 'noopener,noreferrer')
    if (popup) {
      return true
    }

    window.location.href = nextUrl
    return true
  }

  function describePermissionError(mode: MessengerCallMode): string {
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

  async function initMedia(mode: MessengerCallMode): Promise<MediaStream> {
    const existingStream = opts.getLocalStream()
    if (existingStream) {
      await refreshVideoInputs()
      opts.onSyncVideoTrackState(existingStream.getVideoTracks()[0] ?? null)
      return existingStream
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
        sampleSize: 16,
      } satisfies MediaTrackConstraints as MediaTrackConstraints & { latency?: number },
      video: mode === 'video',
    })

    for (const track of stream.getAudioTracks()) {
      track.contentHint = 'speech'
    }

    opts.onStreamAcquired(stream)
    await refreshVideoInputs()
    opts.onSyncVideoTrackState(stream.getVideoTracks()[0] ?? null)
    return stream
  }

  async function ensureMediaAccess(mode: MessengerCallMode): Promise<boolean> {
    callError.value = ''
    permissionHelp.value = ''

    if (!supported.value) {
      callError.value = 'Звонки недоступны в этом браузере.'
      return false
    }

    requestingPermissions.value = true

    try {
      await initMedia(mode)
      await refreshMediaPermissions()
      return true
    } catch {
      await refreshMediaPermissions()
      callError.value = describePermissionError(mode)

      const shouldOpenPermissions = mode === 'video'
        ? mediaPermissionState.value.microphone === 'denied' || mediaPermissionState.value.camera === 'denied'
        : mediaPermissionState.value.microphone === 'denied'

      if (shouldOpenPermissions) {
        const opened = openSitePermissions(mode === 'video' ? 'media' : 'microphone')
        if (!opened && !permissionHelp.value) {
          permissionHelp.value = 'Откройте настройки сайта в браузере и разрешите доступ к микрофону и камере.'
        }
      }

      return false
    } finally {
      requestingPermissions.value = false
    }
  }

  return {
    requestingPermissions,
    permissionHelp,
    mediaPermissionState,
    availableVideoInputIds,
    supported,
    refreshMediaPermissions,
    refreshVideoInputs,
    openSitePermissions,
    initMedia,
    ensureMediaAccess,
  }
}
