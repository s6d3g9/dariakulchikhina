type MessengerCallMode = 'audio' | 'video'
type MessengerCallSignalKind = 'invite' | 'ringing' | 'offer' | 'answer' | 'ice-candidate' | 'reject' | 'hangup' | 'busy'
type MessengerMediaPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown'
type MessengerPermissionTarget = 'microphone' | 'camera' | 'media'

interface MessengerCallE2EEPublicKey {
  kty: 'EC'
  crv: 'P-256'
  x: string
  y: string
  ext?: boolean
  key_ops?: string[]
}

interface MessengerCallE2EEPayload {
  supported: boolean
  publicKey?: MessengerCallE2EEPublicKey
  salt?: string
}

interface MessengerCallSecurityState {
  available: boolean
  active: boolean
  verificationEmojis: string[]
  status: string
  fallbackReason: string
}

interface MessengerCallControlsState {
  microphoneEnabled: boolean
  speakerEnabled: boolean
}

interface MessengerCallSignalEvent {
  type: 'call.signal'
  conversationId?: string
  signal?: {
    kind: MessengerCallSignalKind
    callId: string
    payload?: Record<string, unknown>
  }
  sender?: {
    userId: string
    displayName: string
    login: string
  }
}

interface MessengerIncomingCall {
  callId: string
  conversationId: string
  fromUserId: string
  fromDisplayName: string
  mode: MessengerCallMode
  e2ee?: MessengerCallE2EEPayload
}

interface MessengerActiveCall {
  callId: string
  conversationId: string
  peerUserId: string
  peerDisplayName: string
  mode: MessengerCallMode
  initiator: boolean
}

let peerConnection: RTCPeerConnection | null = null
let localStream: MediaStream | null = null
let remoteStream: MediaStream | null = null
let localVideoEl: HTMLVideoElement | null = null
let remoteVideoEl: HTMLVideoElement | null = null
let remoteAudioEl: HTMLAudioElement | null = null
let peerConnectionCallId = ''
const pendingIceCandidates = new Map<string, RTCIceCandidateInit[]>()
const transformedSenders = new WeakSet<object>()
const transformedReceivers = new WeakSet<object>()
const CALL_VERIFICATION_EMOJIS = ['🔒', '🎧', '🎤', '🛡️', '🎼', '🌿', '🔥', '⚡', '🌊', '🪐', '🍀', '🧩', '🛰️', '🎯', '🌙', '🫧', '🎹', '🦋', '☀️', '🧭', '💎', '🪶', '🎛️', '🧠', '🐚', '🕊️', '🧿', '🪙', '🌈', '❄️', '🍃', '🔑']

interface MessengerCallSecurityContext {
  callId: string
  role: 'initiator' | 'responder'
  localPublicKey: MessengerCallE2EEPublicKey
  localPrivateKey: JsonWebKey
  remotePublicKey?: MessengerCallE2EEPublicKey
  salt: Uint8Array
  encryptKey?: CryptoKey
  decryptKey?: CryptoKey
  encryptCounterSalt?: Uint8Array
  decryptCounterSalt?: Uint8Array
  verificationEmojis: string[]
  active: boolean
}

let callSecurityContext: MessengerCallSecurityContext | null = null

function supportsInsertableCallEncryption() {
  if (!import.meta.client || typeof RTCRtpSender === 'undefined' || typeof RTCRtpReceiver === 'undefined') {
    return false
  }

  return typeof (RTCRtpSender.prototype as { createEncodedStreams?: unknown }).createEncodedStreams === 'function'
    && typeof (RTCRtpReceiver.prototype as { createEncodedStreams?: unknown }).createEncodedStreams === 'function'
    && typeof crypto?.subtle !== 'undefined'
}

function encodeCallBase64(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''

  for (const value of bytes) {
    binary += String.fromCharCode(value)
  }

  return btoa(binary)
}

function decodeCallBase64(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function buildCtrCounter(counterSalt: Uint8Array, timestampValue: number) {
  const counter = new Uint8Array(16)
  counter.set(counterSalt.slice(0, 8), 0)

  let nextValue = BigInt(Math.max(0, Math.floor(timestampValue)))
  for (let index = 15; index >= 8; index -= 1) {
    counter[index] = Number(nextValue & BigInt(255))
    nextValue >>= BigInt(8)
  }

  return counter
}

async function generateCallE2EEKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  )

  return {
    publicKey: await crypto.subtle.exportKey('jwk', keyPair.publicKey) as MessengerCallE2EEPublicKey,
    privateKey: await crypto.subtle.exportKey('jwk', keyPair.privateKey),
  }
}

async function importCallPrivateKey(privateKey: JsonWebKey) {
  return await crypto.subtle.importKey('jwk', privateKey, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
}

async function importCallPublicKey(publicKey: MessengerCallE2EEPublicKey) {
  return await crypto.subtle.importKey('jwk', publicKey, { name: 'ECDH', namedCurve: 'P-256' }, true, [])
}

async function deriveCallSharedSecret(privateKey: JsonWebKey, publicKey: MessengerCallE2EEPublicKey) {
  const importedPrivateKey = await importCallPrivateKey(privateKey)
  const importedPublicKey = await importCallPublicKey(publicKey)
  const bits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: importedPublicKey },
    importedPrivateKey,
    256,
  )

  return new Uint8Array(bits)
}

async function deriveCallHkdfBits(secret: Uint8Array, salt: Uint8Array, label: string, length: number) {
  const hkdfKey = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({
    name: 'HKDF',
    hash: 'SHA-256',
    salt,
    info: new TextEncoder().encode(label),
  }, hkdfKey, length)

  return new Uint8Array(bits)
}

async function buildCallVerificationEmojis(secret: Uint8Array) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', secret))
  return Array.from({ length: 4 }, (_, index) => CALL_VERIFICATION_EMOJIS[digest[index] % CALL_VERIFICATION_EMOJIS.length])
}

async function activateCallSecurityContext(remotePublicKey: MessengerCallE2EEPublicKey) {
  if (!callSecurityContext) {
    return false
  }

  const sharedSecret = await deriveCallSharedSecret(callSecurityContext.localPrivateKey, remotePublicKey)
  const txLabel = callSecurityContext.role === 'initiator' ? 'caller->callee' : 'callee->caller'
  const rxLabel = callSecurityContext.role === 'initiator' ? 'callee->caller' : 'caller->callee'
  const encryptKeyBytes = await deriveCallHkdfBits(sharedSecret, callSecurityContext.salt, `${txLabel}:key`, 256)
  const decryptKeyBytes = await deriveCallHkdfBits(sharedSecret, callSecurityContext.salt, `${rxLabel}:key`, 256)
  const encryptCounterSalt = await deriveCallHkdfBits(sharedSecret, callSecurityContext.salt, `${txLabel}:ctr`, 128)
  const decryptCounterSalt = await deriveCallHkdfBits(sharedSecret, callSecurityContext.salt, `${rxLabel}:ctr`, 128)

  callSecurityContext.remotePublicKey = remotePublicKey
  callSecurityContext.encryptKey = await crypto.subtle.importKey('raw', encryptKeyBytes, 'AES-CTR', false, ['encrypt'])
  callSecurityContext.decryptKey = await crypto.subtle.importKey('raw', decryptKeyBytes, 'AES-CTR', false, ['decrypt'])
  callSecurityContext.encryptCounterSalt = encryptCounterSalt
  callSecurityContext.decryptCounterSalt = decryptCounterSalt
  callSecurityContext.verificationEmojis = await buildCallVerificationEmojis(sharedSecret)
  callSecurityContext.active = true
  return true
}

async function transformEncodedFrame(frame: { data: ArrayBuffer; timestamp?: number }, key: CryptoKey, counterSalt: Uint8Array, action: 'encrypt' | 'decrypt') {
  const timestampValue = Number(frame.timestamp || 0)
  const transformed = action === 'encrypt'
    ? await crypto.subtle.encrypt({ name: 'AES-CTR', counter: buildCtrCounter(counterSalt, timestampValue), length: 64 }, key, frame.data)
    : await crypto.subtle.decrypt({ name: 'AES-CTR', counter: buildCtrCounter(counterSalt, timestampValue), length: 64 }, key, frame.data)

  frame.data = transformed
  return frame
}

function applySenderCallSecurity(sender: RTCRtpSender) {
  if (!callSecurityContext?.active || !callSecurityContext.encryptKey || !callSecurityContext.encryptCounterSalt || transformedSenders.has(sender)) {
    return false
  }

  const maybeSender = sender as RTCRtpSender & { createEncodedStreams?: () => { readable: ReadableStream<unknown>; writable: WritableStream<unknown> } }
  if (typeof maybeSender.createEncodedStreams !== 'function') {
    return false
  }

  const { readable, writable } = maybeSender.createEncodedStreams()
  const transformer = new TransformStream({
    async transform(frame, controller) {
      controller.enqueue(await transformEncodedFrame(frame as { data: ArrayBuffer; timestamp?: number }, callSecurityContext!.encryptKey!, callSecurityContext!.encryptCounterSalt!, 'encrypt'))
    },
  })

  void readable.pipeThrough(transformer).pipeTo(writable).catch(() => {})
  transformedSenders.add(sender)
  return true
}

function applyReceiverCallSecurity(receiver: RTCRtpReceiver) {
  if (!callSecurityContext?.active || !callSecurityContext.decryptKey || !callSecurityContext.decryptCounterSalt || transformedReceivers.has(receiver)) {
    return false
  }

  const maybeReceiver = receiver as RTCRtpReceiver & { createEncodedStreams?: () => { readable: ReadableStream<unknown>; writable: WritableStream<unknown> } }
  if (typeof maybeReceiver.createEncodedStreams !== 'function') {
    return false
  }

  const { readable, writable } = maybeReceiver.createEncodedStreams()
  const transformer = new TransformStream({
    async transform(frame, controller) {
      controller.enqueue(await transformEncodedFrame(frame as { data: ArrayBuffer; timestamp?: number }, callSecurityContext!.decryptKey!, callSecurityContext!.decryptCounterSalt!, 'decrypt'))
    },
  })

  void readable.pipeThrough(transformer).pipeTo(writable).catch(() => {})
  transformedReceivers.add(receiver)
  return true
}

function clearCallSecurityContext() {
  callSecurityContext = null
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

function resolveCallMode(value: unknown): MessengerCallMode {
  return value === 'video' ? 'video' : 'audio'
}

function assignMediaTargets() {
  if (localVideoEl) {
    localVideoEl.srcObject = localStream
    void localVideoEl.play().catch(() => {})
  }

  if (remoteVideoEl) {
    remoteVideoEl.srcObject = remoteStream
    remoteVideoEl.muted = false
    void remoteVideoEl.play().catch(() => {})
  }

  if (remoteAudioEl) {
    remoteAudioEl.srcObject = remoteStream
    remoteAudioEl.autoplay = true
    void remoteAudioEl.play().catch(() => {})
  }
}

function queueIceCandidate(callId: string, candidate: RTCIceCandidateInit) {
  const queue = pendingIceCandidates.get(callId) || []
  queue.push(candidate)
  pendingIceCandidates.set(callId, queue)
}

async function flushPendingIceCandidates(callId: string, connection: RTCPeerConnection) {
  const queue = pendingIceCandidates.get(callId)
  if (!queue?.length) {
    return
  }

  pendingIceCandidates.delete(callId)

  for (const candidate of queue) {
    await connection.addIceCandidate(candidate).catch(() => {})
  }
}

export function useMessengerCalls() {
  const auth = useMessengerAuth()
  const conversations = useMessengerConversations()
  const navigation = useMessengerConversationState()
  const incomingCall = useState<MessengerIncomingCall | null>('messenger-incoming-call', () => null)
  const activeCall = useState<MessengerActiveCall | null>('messenger-active-call', () => null)
  const callStatusText = useState<string>('messenger-call-status', () => '')
  const callError = useState<string>('messenger-call-error', () => '')
  const busy = useState<boolean>('messenger-call-busy', () => false)
  const requestingPermissions = useState<boolean>('messenger-call-requesting-permissions', () => false)
  const permissionHelp = useState<string>('messenger-call-permission-help', () => '')
  const controls = useState<MessengerCallControlsState>('messenger-call-controls', () => ({
    microphoneEnabled: true,
    speakerEnabled: true,
  }))
  const security = useState<MessengerCallSecurityState>('messenger-call-security', () => ({
    available: supportsInsertableCallEncryption(),
    active: false,
    verificationEmojis: [],
    status: supportsInsertableCallEncryption()
      ? 'Браузер поддерживает дополнительное E2EE для звонков.'
      : 'Браузер использует только штатное шифрование WebRTC.',
    fallbackReason: supportsInsertableCallEncryption() ? '' : 'Нет поддержки encoded insertable streams.',
  }))
  const mediaPermissionState = useState<Record<'microphone' | 'camera', MessengerMediaPermissionState>>('messenger-call-media-permissions', () => ({
    microphone: 'unknown',
    camera: 'unknown',
  }))
  const supported = computed(() => Boolean(import.meta.client && navigator.mediaDevices?.getUserMedia && typeof RTCPeerConnection !== 'undefined'))
  const inConversationCall = computed(() => Boolean(activeCall.value && activeCall.value.conversationId === conversations.activeConversationId.value))
  const canStartAudioCall = computed(() => supported.value && mediaPermissionState.value.microphone !== 'denied')
  const canStartVideoCall = computed(() => supported.value && mediaPermissionState.value.microphone !== 'denied' && mediaPermissionState.value.camera !== 'denied')
  const audioReadiness = computed(() => {
    if (!supported.value) {
      return 'Браузер не поддерживает WebRTC или доступ к медиа.'
    }

    if (mediaPermissionState.value.microphone === 'granted') {
      return 'Микрофон разрешён. Аудиозвонки готовы.'
    }

    if (mediaPermissionState.value.microphone === 'denied') {
      return 'Микрофон заблокирован. Нужен доступ в site permissions.'
    }

    return 'Нужно подтвердить доступ к микрофону для аудиозвонков.'
  })
  const videoReadiness = computed(() => {
    if (!supported.value) {
      return 'Браузер не поддерживает WebRTC или доступ к медиа.'
    }

    if (mediaPermissionState.value.microphone === 'granted' && mediaPermissionState.value.camera === 'granted') {
      return 'Микрофон и камера разрешены. Видеозвонки готовы.'
    }

    if (mediaPermissionState.value.microphone === 'denied' || mediaPermissionState.value.camera === 'denied') {
      return 'Камера или микрофон заблокированы. Откройте site permissions.'
    }

    return 'Нужно подтвердить доступ к микрофону и камере для видеозвонков.'
  })

  function syncMicrophoneState() {
    if (!localStream) {
      return
    }

    for (const track of localStream.getAudioTracks()) {
      track.enabled = controls.value.microphoneEnabled
    }
  }

  function syncSpeakerState() {
    if (remoteAudioEl) {
      remoteAudioEl.muted = !controls.value.speakerEnabled
      if (controls.value.speakerEnabled) {
        void remoteAudioEl.play().catch(() => {})
      }
    }

    if (remoteVideoEl) {
      remoteVideoEl.muted = !controls.value.speakerEnabled
      if (controls.value.speakerEnabled) {
        void remoteVideoEl.play().catch(() => {})
      }
    }
  }

  function setMicrophoneEnabled(enabled: boolean) {
    controls.value = {
      ...controls.value,
      microphoneEnabled: enabled,
    }
    syncMicrophoneState()
  }

  function toggleMicrophone() {
    setMicrophoneEnabled(!controls.value.microphoneEnabled)
  }

  function setSpeakerEnabled(enabled: boolean) {
    controls.value = {
      ...controls.value,
      speakerEnabled: enabled,
    }
    syncSpeakerState()
  }

  function toggleSpeaker() {
    setSpeakerEnabled(!controls.value.speakerEnabled)
  }

  function attachElements(elements: { localVideo?: HTMLVideoElement | null; remoteVideo?: HTMLVideoElement | null; remoteAudio?: HTMLAudioElement | null }) {
    localVideoEl = elements.localVideo ?? localVideoEl
    remoteVideoEl = elements.remoteVideo ?? remoteVideoEl
    remoteAudioEl = elements.remoteAudio ?? remoteAudioEl
    assignMediaTargets()
    syncSpeakerState()
  }

  function clearElements() {
    localVideoEl = null
    remoteVideoEl = null
    remoteAudioEl = null
  }

  function stopLocalStream() {
    if (!localStream) {
      return
    }

    for (const track of localStream.getTracks()) {
      track.stop()
    }

    localStream = null
    assignMediaTargets()
  }

  function resetPeerConnection() {
    peerConnection?.close()
    peerConnection = null
    peerConnectionCallId = ''
    pendingIceCandidates.clear()

    if (remoteStream) {
      for (const track of remoteStream.getTracks()) {
        track.stop()
      }
    }

    remoteStream = null
    assignMediaTargets()
  }

  function setCallSecurityFallback(reason: string) {
    security.value = {
      available: supportsInsertableCallEncryption(),
      active: false,
      verificationEmojis: [],
      status: 'Звонок защищён только транспортным шифрованием WebRTC.',
      fallbackReason: reason,
    }
  }

  function setCallSecurityActive() {
    security.value = {
      available: true,
      active: true,
      verificationEmojis: callSecurityContext?.verificationEmojis || [],
      status: 'Дополнительное E2EE для звонка активно. Сверьте символы с собеседником.',
      fallbackReason: '',
    }
  }

  async function sendSignal(conversationId: string, signal: { kind: MessengerCallSignalKind; callId: string; payload?: Record<string, unknown> }) {
    await auth.request(`/conversations/${conversationId}/call-signal`, {
      method: 'POST',
      body: signal,
    })
  }

  async function initMedia(mode: MessengerCallMode) {
    if (localStream) {
      return localStream
    }

    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
        sampleSize: 16,
        latency: 0.02,
      },
      video: mode === 'video',
    })

    for (const track of localStream.getAudioTracks()) {
      track.contentHint = 'speech'
    }

    assignMediaTargets()
    syncMicrophoneState()
    return localStream
  }

  async function refreshMediaPermissions() {
    mediaPermissionState.value = {
      microphone: await resolvePermissionState('microphone'),
      camera: await resolvePermissionState('camera'),
    }
  }

  function getSitePermissionsUrl(target: MessengerPermissionTarget) {
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

  function openSitePermissions(target: MessengerPermissionTarget) {
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

  function describePermissionError(mode: MessengerCallMode) {
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

  async function ensureMediaAccess(mode: MessengerCallMode) {
    callError.value = ''
    permissionHelp.value = ''

    if (!supported.value) {
      callError.value = 'Звонки недоступны в этом браузере.'
      return false
    }

    requestingPermissions.value = true

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

  async function ensureMicrophoneAccess() {
    return await ensureMediaAccess('audio')
  }

  async function ensureCameraAccess() {
    return await ensureMediaAccess('video')
  }

  function buildPeerConnection(callId: string, conversationId: string, mode: MessengerCallMode) {
    if (peerConnection && peerConnectionCallId === callId) {
      return peerConnection
    }

    resetPeerConnection()

    const connection = new RTCPeerConnection({
      bundlePolicy: 'max-bundle',
      iceCandidatePoolSize: 4,
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    peerConnection = connection
    peerConnectionCallId = callId
    remoteStream = new MediaStream()
    assignMediaTargets()

    if (localStream) {
      for (const track of localStream.getTracks()) {
        const sender = connection.addTrack(track, localStream)
        if (callSecurityContext?.active) {
          applySenderCallSecurity(sender)
        }
        if (track.kind === 'audio') {
          const parameters = sender.getParameters()
          parameters.encodings = [{
            ...(parameters.encodings?.[0] || {}),
            maxBitrate: 32000,
          }]
          void sender.setParameters(parameters).catch(() => {})
        }
      }
    }

    connection.ontrack = (event) => {
      if (callSecurityContext?.active) {
        applyReceiverCallSecurity(event.receiver)
      }

      const remoteTracks = event.streams[0]?.getTracks()?.length
        ? event.streams[0].getTracks()
        : [event.track]

      for (const track of remoteTracks) {
        const alreadyAdded = remoteStream?.getTracks().some(existingTrack => existingTrack.id === track.id)
        if (!alreadyAdded) {
          remoteStream?.addTrack(track)
        }
      }

      event.track.onunmute = () => {
        assignMediaTargets()
      }

      assignMediaTargets()
    }

    connection.onicecandidate = (event) => {
      if (!event.candidate) {
        return
      }

      void sendSignal(conversationId, {
        kind: 'ice-candidate',
        callId,
        payload: {
          candidate: event.candidate.toJSON(),
          mode,
        },
      })
    }

    connection.onconnectionstatechange = () => {
      if (connection.connectionState) {
        callStatusText.value = `Соединение: ${connection.connectionState}`
      }

      if (connection.connectionState === 'failed') {
        callError.value = 'Не удалось установить аудиосоединение. Попробуйте перезвонить.'
      }
    }

    connection.oniceconnectionstatechange = () => {
      if (!connection.iceConnectionState) {
        return
      }

      if (connection.iceConnectionState === 'failed' || connection.iceConnectionState === 'disconnected') {
        callError.value = 'Аудиоканал нестабилен. Проверьте соединение и попробуйте перезвонить.'
      }
    }

    return connection
  }

  function teardownCall(status = '') {
    activeCall.value = null
    incomingCall.value = null
    busy.value = false
    callStatusText.value = status
    resetPeerConnection()
    stopLocalStream()
    clearCallSecurityContext()
    controls.value = {
      microphoneEnabled: true,
      speakerEnabled: true,
    }
    security.value = {
      available: supportsInsertableCallEncryption(),
      active: false,
      verificationEmojis: [],
      status: supportsInsertableCallEncryption()
        ? 'Звонок завершён. E2EE будет подготовлено при следующем вызове.'
        : 'Для звонков доступно только штатное шифрование WebRTC.',
      fallbackReason: supportsInsertableCallEncryption() ? '' : 'Нет поддержки encoded insertable streams.',
    }
  }

  async function selectConversationForCall(conversationId: string) {
    await conversations.refresh(conversations.query.value)
    navigation.openConversation(conversationId)
    await conversations.loadMessages(conversationId)
  }

  async function startOutgoingCall(mode: MessengerCallMode) {
    callError.value = ''
    const conversation = conversations.activeConversation.value

    if (!conversation) {
      callError.value = 'Сначала откройте direct-чат.'
      return
    }

    if (!supported.value) {
      callError.value = 'Звонки недоступны в этом браузере.'
      return
    }

    if (activeCall.value || incomingCall.value || busy.value) {
      callError.value = 'Сначала завершите текущий звонок.'
      return
    }

    const granted = await ensureMediaAccess(mode)
    if (!granted) {
      return
    }

    await initMedia(mode)

    const callId = crypto.randomUUID()
    let e2eePayload: MessengerCallE2EEPayload = { supported: false }

    if (supportsInsertableCallEncryption()) {
      const callKeys = await generateCallE2EEKeyPair()
      const salt = crypto.getRandomValues(new Uint8Array(16))
      callSecurityContext = {
        callId,
        role: 'initiator',
        localPublicKey: callKeys.publicKey,
        localPrivateKey: callKeys.privateKey,
        salt,
        verificationEmojis: [],
        active: false,
      }
      security.value = {
        available: true,
        active: false,
        verificationEmojis: [],
        status: 'Ожидаем подтверждение и публичный ключ собеседника для E2EE звонка.',
        fallbackReason: '',
      }
      e2eePayload = {
        supported: true,
        publicKey: callKeys.publicKey,
        salt: encodeCallBase64(salt),
      }
    } else {
      clearCallSecurityContext()
      setCallSecurityFallback('У этого браузера нет поддержки encoded insertable streams.')
    }

    activeCall.value = {
      callId,
      conversationId: conversation.id,
      peerUserId: conversation.peerUserId,
      peerDisplayName: conversation.peerDisplayName,
      mode,
      initiator: true,
    }
    callStatusText.value = mode === 'video' ? 'Отправляем видеовызов…' : 'Отправляем аудиовызов…'

    try {
      await sendSignal(conversation.id, {
        kind: 'invite',
        callId,
        payload: { mode, e2ee: e2eePayload },
      })
    } catch {
      teardownCall('')
      callError.value = 'Не удалось отправить приглашение на звонок.'
    }
  }

  async function acceptIncomingCall() {
    callError.value = ''

    if (!incomingCall.value) {
      return
    }

    try {
      await selectConversationForCall(incomingCall.value.conversationId)
      const granted = await ensureMediaAccess(incomingCall.value.mode)
      if (!granted) {
        await rejectIncomingCall(describePermissionError(incomingCall.value.mode))
        return
      }
      await initMedia(incomingCall.value.mode)
      activeCall.value = {
        callId: incomingCall.value.callId,
        conversationId: incomingCall.value.conversationId,
        peerUserId: incomingCall.value.fromUserId,
        peerDisplayName: incomingCall.value.fromDisplayName,
        mode: incomingCall.value.mode,
        initiator: false,
      }

      let ringingE2EE: MessengerCallE2EEPayload = { supported: false }

      if (supportsInsertableCallEncryption() && incomingCall.value.e2ee?.supported && incomingCall.value.e2ee.publicKey && incomingCall.value.e2ee.salt) {
        const callKeys = await generateCallE2EEKeyPair()
        callSecurityContext = {
          callId: incomingCall.value.callId,
          role: 'responder',
          localPublicKey: callKeys.publicKey,
          localPrivateKey: callKeys.privateKey,
          remotePublicKey: incomingCall.value.e2ee.publicKey,
          salt: decodeCallBase64(incomingCall.value.e2ee.salt),
          verificationEmojis: [],
          active: false,
        }
        await activateCallSecurityContext(incomingCall.value.e2ee.publicKey)
        setCallSecurityActive()
        ringingE2EE = {
          supported: true,
          publicKey: callKeys.publicKey,
        }
      } else {
        clearCallSecurityContext()
        setCallSecurityFallback(incomingCall.value.e2ee?.supported
          ? 'Не удалось активировать E2EE для этого вызова.'
          : 'Собеседник не прислал параметры дополнительного E2EE.')
      }

      await sendSignal(incomingCall.value.conversationId, {
        kind: 'ringing',
        callId: incomingCall.value.callId,
        payload: {
          accepted: true,
          mode: incomingCall.value.mode,
          e2ee: ringingE2EE,
        },
      })
      callStatusText.value = 'Подготовка соединения…'
      incomingCall.value = null
    } catch {
      await rejectIncomingCall('Не удалось принять звонок.')
    }
  }

  async function rejectIncomingCall(status = 'Вызов отклонён') {
    callError.value = ''

    if (!incomingCall.value) {
      incomingCall.value = null
      return
    }

    try {
      await sendSignal(incomingCall.value.conversationId, {
        kind: 'reject',
        callId: incomingCall.value.callId,
        payload: {},
      })
    } catch {
      callError.value = 'Не удалось отклонить звонок.'
    } finally {
      incomingCall.value = null
      callStatusText.value = status
    }
  }

  async function hangupCall(status = 'Звонок завершён') {
    if (!activeCall.value) {
      teardownCall(status)
      return
    }

    try {
      await sendSignal(activeCall.value.conversationId, {
        kind: 'hangup',
        callId: activeCall.value.callId,
        payload: {},
      })
    } catch {
      // ignore transport failure during hangup in alpha stage
    } finally {
      teardownCall(status)
    }
  }

  async function handleSignal(event: MessengerCallSignalEvent) {
    if (event.type !== 'call.signal' || !event.signal || !event.sender || !event.conversationId) {
      return
    }

    const mode = resolveCallMode(event.signal.payload?.mode)

    if (event.signal.kind === 'invite') {
      if (activeCall.value || incomingCall.value || busy.value) {
        await sendSignal(event.conversationId, {
          kind: 'busy',
          callId: event.signal.callId,
          payload: {},
        }).catch(() => {})
        return
      }

      incomingCall.value = {
        callId: event.signal.callId,
        conversationId: event.conversationId,
        fromUserId: event.sender.userId,
        fromDisplayName: event.sender.displayName,
        mode,
        e2ee: event.signal.payload?.e2ee as MessengerCallE2EEPayload | undefined,
      }
      const inviteE2EE = event.signal.payload?.e2ee as MessengerCallE2EEPayload | undefined
      if (inviteE2EE?.supported && supportsInsertableCallEncryption()) {
        security.value = {
          available: true,
          active: false,
          verificationEmojis: [],
          status: 'Входящий звонок поддерживает E2EE. После принятия появятся символы для сверки.',
          fallbackReason: '',
        }
      } else if (inviteE2EE?.supported) {
        setCallSecurityFallback('Собеседник поддерживает E2EE, но этот браузер не умеет encoded transforms.')
      } else {
        setCallSecurityFallback('Для этого вызова используется только штатное шифрование WebRTC.')
      }
      callStatusText.value = mode === 'video' ? 'Входящий видеозвонок' : 'Входящий аудиозвонок'
      busy.value = true
      return
    }

    if (event.signal.kind === 'ringing' && activeCall.value?.initiator) {
      try {
        const ringingE2EE = event.signal.payload?.e2ee as MessengerCallE2EEPayload | undefined
        if (callSecurityContext && ringingE2EE?.supported && ringingE2EE.publicKey) {
          await activateCallSecurityContext(ringingE2EE.publicKey)
          setCallSecurityActive()
        } else {
          clearCallSecurityContext()
          setCallSecurityFallback(ringingE2EE?.supported ? 'Собеседник не передал корректный ключ для E2EE.' : 'Собеседник не использует дополнительное E2EE для звонка.')
        }
        await selectConversationForCall(event.conversationId)
        if (!localStream) {
          await initMedia(mode)
        }
        const connection = buildPeerConnection(event.signal.callId, event.conversationId, mode)
        if (connection.signalingState !== 'stable') {
          return
        }
        const offer = await connection.createOffer()
        await connection.setLocalDescription(offer)
        await sendSignal(event.conversationId, {
          kind: 'offer',
          callId: event.signal.callId,
          payload: {
            sdp: offer.sdp,
            type: offer.type,
            mode,
          },
        })
        callStatusText.value = 'Отправлен offer'
      } catch {
        callError.value = 'Не удалось подготовить исходящий звонок.'
        teardownCall('')
      }
      return
    }

    if (event.signal.kind === 'offer') {
      try {
        await selectConversationForCall(event.conversationId)
        if (!activeCall.value) {
          activeCall.value = {
            callId: event.signal.callId,
            conversationId: event.conversationId,
            peerUserId: event.sender.userId,
            peerDisplayName: event.sender.displayName,
            mode,
            initiator: false,
          }
        }
        if (!localStream) {
          await initMedia(mode)
        }
        const connection = buildPeerConnection(event.signal.callId, event.conversationId, mode)
        if (connection.signalingState === 'have-remote-offer') {
          return
        }
        await connection.setRemoteDescription({
          type: 'offer',
          sdp: String(event.signal.payload?.sdp || ''),
        })
        await flushPendingIceCandidates(event.signal.callId, connection)
        const answer = await connection.createAnswer()
        await connection.setLocalDescription(answer)
        await sendSignal(event.conversationId, {
          kind: 'answer',
          callId: event.signal.callId,
          payload: {
            sdp: answer.sdp,
            type: answer.type,
            mode,
          },
        })
        callStatusText.value = 'Отправлен answer'
        busy.value = false
      } catch {
        callError.value = 'Не удалось обработать входящий звонок.'
        teardownCall('')
      }
      return
    }

    if (event.signal.kind === 'answer' && peerConnection) {
      try {
        await peerConnection.setRemoteDescription({
          type: 'answer',
          sdp: String(event.signal.payload?.sdp || ''),
        })
        await flushPendingIceCandidates(event.signal.callId, peerConnection)
        callStatusText.value = 'Канал установлен'
        busy.value = false
      } catch {
        callError.value = 'Не удалось завершить установку соединения.'
        teardownCall('')
      }
      return
    }

    if (event.signal.kind === 'ice-candidate' && event.signal.payload?.candidate) {
      const candidate = event.signal.payload.candidate as RTCIceCandidateInit
      const remoteDescriptionReady = Boolean(peerConnection?.remoteDescription)

      if (!peerConnection || !remoteDescriptionReady) {
        queueIceCandidate(event.signal.callId, candidate)
        return
      }

      await peerConnection.addIceCandidate(candidate).catch(() => {
        queueIceCandidate(event.signal.callId, candidate)
      })
      return
    }

    if (event.signal.kind === 'reject') {
      teardownCall('Вызов отклонён')
      return
    }

    if (event.signal.kind === 'busy') {
      teardownCall('Собеседник уже на другом звонке')
      return
    }

    if (event.signal.kind === 'hangup') {
      teardownCall('Собеседник завершил звонок')
    }
  }

  function clearError() {
    callError.value = ''
  }

  function clearPermissionHelp() {
    permissionHelp.value = ''
  }

  function reset() {
    clearError()
    teardownCall('')
    clearElements()
  }

  if (import.meta.client) {
    void refreshMediaPermissions()
  }

  return {
    incomingCall,
    activeCall,
    callStatusText,
    callError,
    requestingPermissions,
    permissionHelp,
    mediaPermissionState,
    supported,
    controls,
    security,
    inConversationCall,
    canStartAudioCall,
    canStartVideoCall,
    audioReadiness,
    videoReadiness,
    attachElements,
    clearElements,
    clearError,
    clearPermissionHelp,
    refreshMediaPermissions,
    ensureMediaAccess,
    ensureMicrophoneAccess,
    ensureCameraAccess,
    openSitePermissions,
    setMicrophoneEnabled,
    toggleMicrophone,
    setSpeakerEnabled,
    toggleSpeaker,
    startOutgoingCall,
    acceptIncomingCall,
    rejectIncomingCall,
    hangupCall,
    handleSignal,
    reset,
  }
}