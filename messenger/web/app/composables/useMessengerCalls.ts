type MessengerCallMode = 'audio' | 'video'
type MessengerCallSignalKind = 'invite' | 'ringing' | 'offer' | 'answer' | 'ice-candidate' | 'reject' | 'hangup' | 'busy'
type MessengerMediaPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'unknown'

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
  }

  if (remoteVideoEl) {
    remoteVideoEl.srcObject = remoteStream
  }

  if (remoteAudioEl) {
    remoteAudioEl.srcObject = remoteStream
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
  const mediaPermissionState = useState<Record<'microphone' | 'camera', MessengerMediaPermissionState>>('messenger-call-media-permissions', () => ({
    microphone: 'unknown',
    camera: 'unknown',
  }))
  const supported = computed(() => Boolean(import.meta.client && navigator.mediaDevices?.getUserMedia && typeof RTCPeerConnection !== 'undefined'))
  const inConversationCall = computed(() => Boolean(activeCall.value && activeCall.value.conversationId === conversations.activeConversationId.value))
  const canStartAudioCall = computed(() => supported.value && mediaPermissionState.value.microphone !== 'denied')
  const canStartVideoCall = computed(() => supported.value && mediaPermissionState.value.microphone !== 'denied' && mediaPermissionState.value.camera !== 'denied')

  function attachElements(elements: { localVideo?: HTMLVideoElement | null; remoteVideo?: HTMLVideoElement | null; remoteAudio?: HTMLAudioElement | null }) {
    localVideoEl = elements.localVideo ?? localVideoEl
    remoteVideoEl = elements.remoteVideo ?? remoteVideoEl
    remoteAudioEl = elements.remoteAudio ?? remoteAudioEl
    assignMediaTargets()
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

    if (remoteStream) {
      for (const track of remoteStream.getTracks()) {
        track.stop()
      }
    }

    remoteStream = null
    assignMediaTargets()
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
      audio: true,
      video: mode === 'video',
    })
    assignMediaTargets()
    return localStream
  }

  async function refreshMediaPermissions() {
    mediaPermissionState.value = {
      microphone: await resolvePermissionState('microphone'),
      camera: await resolvePermissionState('camera'),
    }
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
      return false
    } finally {
      requestingPermissions.value = false
    }
  }

  function buildPeerConnection(callId: string, conversationId: string, mode: MessengerCallMode) {
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    peerConnection = connection
    remoteStream = new MediaStream()
    assignMediaTargets()

    if (localStream) {
      for (const track of localStream.getTracks()) {
        connection.addTrack(track, localStream)
      }
    }

    connection.ontrack = (event) => {
      for (const track of event.streams[0]?.getTracks() || []) {
        remoteStream?.addTrack(track)
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

    const callId = crypto.randomUUID()
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
        payload: { mode },
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
      await sendSignal(incomingCall.value.conversationId, {
        kind: 'ringing',
        callId: incomingCall.value.callId,
        payload: {
          accepted: true,
          mode: incomingCall.value.mode,
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
      }
      callStatusText.value = mode === 'video' ? 'Входящий видеозвонок' : 'Входящий аудиозвонок'
      busy.value = true
      return
    }

    if (event.signal.kind === 'ringing' && activeCall.value?.initiator) {
      await selectConversationForCall(event.conversationId)
      await initMedia(mode)
      const connection = buildPeerConnection(event.signal.callId, event.conversationId, mode)
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
      return
    }

    if (event.signal.kind === 'offer') {
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
      await connection.setRemoteDescription({
        type: 'offer',
        sdp: String(event.signal.payload?.sdp || ''),
      })
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
      return
    }

    if (event.signal.kind === 'answer' && peerConnection) {
      await peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: String(event.signal.payload?.sdp || ''),
      })
      callStatusText.value = 'Канал установлен'
      busy.value = false
      return
    }

    if (event.signal.kind === 'ice-candidate' && peerConnection && event.signal.payload?.candidate) {
      await peerConnection.addIceCandidate(event.signal.payload.candidate as RTCIceCandidateInit).catch(() => {})
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
    mediaPermissionState,
    supported,
    inConversationCall,
    canStartAudioCall,
    canStartVideoCall,
    attachElements,
    clearElements,
    clearError,
    refreshMediaPermissions,
    ensureMediaAccess,
    startOutgoingCall,
    acceptIncomingCall,
    rejectIncomingCall,
    hangupCall,
    handleSignal,
    reset,
  }
}