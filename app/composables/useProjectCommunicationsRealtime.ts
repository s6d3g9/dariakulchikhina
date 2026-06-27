import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type {
  CommunicationActorRole,
  CommunicationCallE2EEPayload,
  CommunicationCallSecurityState,
  CommunicationKeyBundle,
  CommunicationMessage,
  CommunicationSignal,
} from '~~/shared/types/communications'
import {
  activateCommunicationCallSecurityContext,
  applyCommunicationReceiverCallSecurity,
  applyCommunicationSenderCallSecurity,
  decodeCommunicationCallBase64,
  encodeCommunicationCallBase64,
  generateCommunicationCallE2EEKeyPair,
  supportsCommunicationCallEncryption,
  unwrapCommunicationRoomKeyFromPeer,
} from '~~/shared/utils/communications-e2ee'
import { useProjectCommunicationsCallRuntime } from '~~/app/composables/useProjectCommunicationsCallRuntime'

type CallMode = 'audio' | 'video'

type ActiveCallState = {
  callId: string
  peerActorKey: string
  mode: CallMode
  initiator: boolean
}

type IncomingCallState = {
  callId: string
  fromActorKey: string
  fromDisplayName: string
  mode: CallMode
  e2ee?: CommunicationCallE2EEPayload
}

type SignalPayloadRecord = Record<string, unknown>

type CommunicationPeer = {
  actorKey: string
  actorId: string
  role: CommunicationActorRole
  displayName: string
  nickname?: string
}

type CommunicationCallSecurityContext = {
  callId: string
  role: 'initiator' | 'responder'
  localPublicKey: JsonWebKey
  localPrivateKey: CryptoKey
  remotePublicKey?: JsonWebKey
  salt: Uint8Array
  verificationEmojis: string[]
  active: boolean
}

type CommunicationsApiFetch = <T>(path: string, options?: any) => Promise<T>
type ProjectCommunicationsApiScope = 'legacy' | 'client'

type UseProjectCommunicationsRealtimeOptions = {
  projectSlug: string
  apiScope?: ComputedRef<ProjectCommunicationsApiScope> | Ref<ProjectCommunicationsApiScope>
  actorKey: Ref<string>
  currentChatRoomId: Ref<string>
  currentChatPeer: ComputedRef<CommunicationPeer | null>
  localVideoEl: Ref<HTMLVideoElement | null>
  remoteVideoEl: Ref<HTMLVideoElement | null>
  apiFetch: CommunicationsApiFetch
  keyBundles: Ref<CommunicationKeyBundle[]>
  syncStatus: Ref<string>
  identityPrivateKey: Ref<CryptoKey | null>
  roomKey: Ref<CryptoKey | null>
  mergeKeyBundle: (bundle: CommunicationKeyBundle) => void
  persistRoomKey: (nextRoomKey: CryptoKey) => Promise<void>
  resetMessageSyncState: () => void
  rebuildDecryptedMessages: (messages: CommunicationMessage[]) => Promise<void>
  shareRoomKeyWithKnownPeers: (targetActorKey?: string) => Promise<void>
  refreshMessagesOnly: () => Promise<void>
  fetchOpenChats: () => Promise<void>
}

function createDefaultCallSecurityState(): CommunicationCallSecurityState {
  const available = supportsCommunicationCallEncryption()
  return {
    available,
    active: false,
    verificationEmojis: [],
    status: available
      ? 'Браузер готов к дополнительному E2EE звонков. Символы сверки появятся после согласования ключей.'
      : 'Для звонков доступно только штатное шифрование WebRTC.',
    fallbackReason: available ? '' : 'Нет поддержки encoded insertable streams.',
  }
}

export function useProjectCommunicationsRealtime(options: UseProjectCommunicationsRealtimeOptions) {
  const incomingCall = ref<IncomingCallState | null>(null)
  const activeCall = ref<ActiveCallState | null>(null)
  const callStatusText = ref('')
  const callBusy = computed(() => Boolean(incomingCall.value || activeCall.value))
  const callSecurity = ref<CommunicationCallSecurityState>(createDefaultCallSecurityState())
  const remoteMutedByPeer = ref(false)
  const eventStreamConnected = ref(false)
  const activeCallMode = computed<CallMode | null>(() => activeCall.value?.mode || incomingCall.value?.mode || null)

  let eventSource: EventSource | null = null
  let peerConnection: RTCPeerConnection | null = null
  let peerConnectionCallId = ''
  let localStream: MediaStream | null = null
  let remoteStream: MediaStream | null = null
  let callSecurityContext: CommunicationCallSecurityContext | null = null

  const pendingIceCandidates = new Map<string, RTCIceCandidateInit[]>()
  const transformedCallSenders = new WeakSet<object>()
  const transformedCallReceivers = new WeakSet<object>()

  const {
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
  } = useProjectCommunicationsCallRuntime({
    activeCall,
    currentChatRoomId: options.currentChatRoomId,
    callSecurity,
    remoteVideoEl: options.remoteVideoEl,
    apiFetch: options.apiFetch,
    getPeerConnection: () => peerConnection,
    getLocalStream: () => localStream,
  })

  function setCallSecurityPending(status: string) {
    callSecurity.value = {
      available: supportsCommunicationCallEncryption(),
      active: false,
      verificationEmojis: [],
      status,
      fallbackReason: '',
    }
  }

  function setCallSecurityFallback(reason: string) {
    callSecurity.value = {
      available: supportsCommunicationCallEncryption(),
      active: false,
      verificationEmojis: [],
      status: 'Звонок защищён только транспортным шифрованием WebRTC.',
      fallbackReason: reason,
    }
  }

  function setCallSecurityActive() {
    callSecurity.value = {
      available: true,
      active: true,
      verificationEmojis: callSecurityContext?.verificationEmojis || [],
      status: 'Дополнительное E2EE для звонка активно. Сверьте символы с собеседником.',
      fallbackReason: '',
    }
  }

  function clearCallSecurityContext() {
    callSecurityContext = null
  }

  function queueIceCandidate(callId: string, candidate: RTCIceCandidateInit) {
    const queue = pendingIceCandidates.get(callId) || []
    queue.push(candidate)
    pendingIceCandidates.set(callId, queue)
  }

  async function flushPendingIceCandidates(callId: string, connection: RTCPeerConnection) {
    const queue = pendingIceCandidates.get(callId)
    if (!queue?.length) return

    pendingIceCandidates.delete(callId)
    for (const candidate of queue) {
      await connection.addIceCandidate(candidate).catch(() => {})
    }
  }

  function resetRealtimeState() {
    eventSource?.close()
    eventSource = null
    options.resetMessageSyncState()
    eventStreamConnected.value = false
  }

  function getEventStreamUrl(roomId: string) {
    const encodedRoomId = encodeURIComponent(roomId)
    if (options.apiScope?.value === 'client') {
      return `/api/v1/client/projects/${options.projectSlug}/communications/rooms/${encodedRoomId}/events`
    }
    return `/api/projects/${options.projectSlug}/communications/rooms/${encodedRoomId}/events`
  }

  function setupEventStream() {
    if (!import.meta.client || !options.currentChatRoomId.value) return

    eventSource?.close()
    eventSource = new EventSource(getEventStreamUrl(options.currentChatRoomId.value))
    eventSource.addEventListener('open', () => {
      eventStreamConnected.value = true
    })
    eventSource.addEventListener('error', () => {
      eventStreamConnected.value = false
    })
    eventSource.addEventListener('ready', async (event) => {
      const payload = JSON.parse((event as MessageEvent).data)
      options.keyBundles.value = payload.keyBundles || []
      await options.rebuildDecryptedMessages(payload.messages || [])
    })
    eventSource.addEventListener('key-bundle.published', async (event) => {
      const payload = JSON.parse((event as MessageEvent).data)
      if (payload.keyBundle) {
        options.mergeKeyBundle(payload.keyBundle)
        if (options.roomKey.value && `${payload.keyBundle.actorRole}:${payload.keyBundle.actorId}` !== options.actorKey.value) {
          await options.shareRoomKeyWithKnownPeers(`${payload.keyBundle.actorRole}:${payload.keyBundle.actorId}`)
        }
      }
    })
    eventSource.addEventListener('message.created', async () => {
      await options.refreshMessagesOnly()
      await options.fetchOpenChats()
    })
    eventSource.addEventListener('signal', async (event) => {
      const payload = JSON.parse((event as MessageEvent).data)
      await handleSignal(payload.signal)
    })
  }

  async function initMedia(mode: CallMode) {
    if (localStream) return localStream
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
        sampleSize: 16,
      },
      video: mode === 'video',
    })
    for (const track of localStream.getAudioTracks()) {
      track.contentHint = 'speech'
    }
    if (options.localVideoEl.value) options.localVideoEl.value.srcObject = localStream
    syncMicrophoneState()
    return localStream
  }

  function resetPeerConnection() {
    stopCallQualityMonitor()
    peerConnection?.close()
    peerConnection = null
    peerConnectionCallId = ''
    pendingIceCandidates.clear()
    remoteStream?.getTracks().forEach((track) => track.stop())
    remoteStream = null
    if (options.remoteVideoEl.value) options.remoteVideoEl.value.srcObject = null
    remoteMutedByPeer.value = false
  }

  function buildPeerConnection(callId: string, peerActorKey: string, mode: CallMode) {
    if (peerConnection && peerConnectionCallId === callId) return peerConnection

    resetPeerConnection()
    setCallConnectionQuality({
      active: true,
      score: 0.46,
      title: 'Идёт согласование канала',
    })
    const connection = new RTCPeerConnection({
      bundlePolicy: 'max-bundle',
      iceCandidatePoolSize: 4,
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })
    peerConnection = connection
    peerConnectionCallId = callId
    startCallQualityMonitor(connection)
    remoteStream = new MediaStream()
    if (options.remoteVideoEl.value) options.remoteVideoEl.value.srcObject = remoteStream
    syncSpeakerState()
    if (localStream) {
      for (const track of localStream.getTracks()) {
        const sender = connection.addTrack(track, localStream)
        applyCommunicationSenderCallSecurity(sender, callSecurityContext, transformedCallSenders)
      }
    }
    connection.ontrack = (event) => {
      applyCommunicationReceiverCallSecurity(event.receiver, callSecurityContext, transformedCallReceivers)
      for (const track of event.streams[0]?.getTracks() || []) remoteStream?.addTrack(track)
    }
    connection.onicecandidate = async (event) => {
      if (!event.candidate || !options.currentChatRoomId.value) return
      await options.apiFetch(`/rooms/${options.currentChatRoomId.value}/signals`, {
        method: 'POST',
        body: {
          kind: 'ice-candidate',
          callId,
          targetActorKey: peerActorKey,
          payload: { candidate: event.candidate.toJSON(), mode },
        },
      })
    }
    connection.onconnectionstatechange = () => {
      if (connection.connectionState) callStatusText.value = `Соединение: ${connection.connectionState}`
      void updateCallConnectionQuality(connection)
    }
    return connection
  }

  async function startOutgoingCall(mode: CallMode) {
    if (!options.currentChatPeer.value || !options.currentChatRoomId.value) return
    if (!supportedCalls.value) {
      callPermissionHelp.value = 'Звонки недоступны в этом браузере.'
      return
    }
    if (!(await ensureMediaAccess(mode))) return
    const callId = crypto.randomUUID()
    let e2ee: CommunicationCallE2EEPayload = { supported: false }

    if (supportsCommunicationCallEncryption()) {
      const callKeys = await generateCommunicationCallE2EEKeyPair()
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
      setCallSecurityPending('Ожидаем подтверждение и публичный ключ собеседника для E2EE звонка.')
      e2ee = {
        supported: true,
        publicKey: callKeys.publicKey,
        salt: encodeCommunicationCallBase64(salt),
      }
    } else {
      clearCallSecurityContext()
      setCallSecurityFallback('У этого браузера нет поддержки encoded insertable streams.')
    }

    activeCall.value = {
      callId,
      peerActorKey: options.currentChatPeer.value.actorKey,
      mode,
      initiator: true,
    }
    setCallConnectionQuality({
      active: true,
      score: 0.42,
      title: `Исходящий звонок: ожидание ответа ${options.currentChatPeer.value.displayName}`,
    })
    callStatusText.value = `Ожидание ответа ${options.currentChatPeer.value.displayName}`
    await options.apiFetch(`/rooms/${options.currentChatRoomId.value}/signals`, {
      method: 'POST',
      body: { kind: 'invite', callId, targetActorKey: options.currentChatPeer.value.actorKey, payload: { mode, e2ee } },
    })
  }

  async function acceptIncomingCall() {
    if (!incomingCall.value || !options.currentChatRoomId.value) return
    try {
      if (!(await ensureMediaAccess(incomingCall.value.mode))) {
        await rejectIncomingCall()
        return
      }
      await initMedia(incomingCall.value.mode)
      activeCall.value = {
        callId: incomingCall.value.callId,
        peerActorKey: incomingCall.value.fromActorKey,
        mode: incomingCall.value.mode,
        initiator: false,
      }
      setCallConnectionQuality({
        active: true,
        score: 0.42,
        title: `Входящий звонок: подготовка канала ${incomingCall.value.fromDisplayName}`,
      })
      let e2ee: CommunicationCallE2EEPayload = { supported: false }

      if (supportsCommunicationCallEncryption() && incomingCall.value.e2ee?.supported && incomingCall.value.e2ee.publicKey && incomingCall.value.e2ee.salt) {
        const callKeys = await generateCommunicationCallE2EEKeyPair()
        callSecurityContext = {
          callId: incomingCall.value.callId,
          role: 'responder',
          localPublicKey: callKeys.publicKey,
          localPrivateKey: callKeys.privateKey,
          remotePublicKey: incomingCall.value.e2ee.publicKey,
          salt: decodeCommunicationCallBase64(incomingCall.value.e2ee.salt),
          verificationEmojis: [],
          active: false,
        }
        await activateCommunicationCallSecurityContext(callSecurityContext, incomingCall.value.e2ee.publicKey)
        setCallSecurityActive()
        e2ee = {
          supported: true,
          publicKey: callKeys.publicKey,
        }
      } else {
        clearCallSecurityContext()
        setCallSecurityFallback(incomingCall.value.e2ee?.supported
          ? 'Не удалось активировать E2EE для этого вызова.'
          : 'Собеседник не прислал параметры дополнительного E2EE.')
      }

      await options.apiFetch(`/rooms/${options.currentChatRoomId.value}/signals`, {
        method: 'POST',
        body: {
          kind: 'ringing',
          callId: incomingCall.value.callId,
          targetActorKey: incomingCall.value.fromActorKey,
          payload: { accepted: true, mode: incomingCall.value.mode, e2ee },
        },
      })
      callStatusText.value = 'Подготовка соединения…'
      incomingCall.value = null
    } catch {
      await rejectIncomingCall()
    }
  }

  async function rejectIncomingCall() {
    if (!incomingCall.value || !options.currentChatRoomId.value) {
      incomingCall.value = null
      return
    }
    await options.apiFetch(`/rooms/${options.currentChatRoomId.value}/signals`, {
      method: 'POST',
      body: { kind: 'reject', callId: incomingCall.value.callId, targetActorKey: incomingCall.value.fromActorKey, payload: {} },
    })
    incomingCall.value = null
    callStatusText.value = 'Входящий звонок отклонён'
  }

  async function hangupCall() {
    if (!activeCall.value || !options.currentChatRoomId.value) return
    await options.apiFetch(`/rooms/${options.currentChatRoomId.value}/signals`, {
      method: 'POST',
      body: { kind: 'hangup', callId: activeCall.value.callId, targetActorKey: activeCall.value.peerActorKey, payload: {} },
    }).catch(() => {})
    teardownCall('Звонок завершён')
  }

  function teardownCall(status = '') {
    activeCall.value = null
    incomingCall.value = null
    callStatusText.value = status
    resetPeerConnection()
    localStream?.getTracks().forEach((track) => track.stop())
    localStream = null
    clearCallSecurityContext()
    callSecurity.value = createDefaultCallSecurityState()
    callControls.value = {
      microphoneEnabled: true,
      speakerEnabled: true,
    }
    resetCallConnectionQuality()
    callPermissionHelp.value = ''
    if (options.localVideoEl.value) options.localVideoEl.value.srcObject = null
  }

  async function handleSignal(signal: CommunicationSignal) {
    if (!signal || (signal.targetActorKey && signal.targetActorKey !== options.actorKey.value)) return
    const payload = signal.payload && typeof signal.payload === 'object' ? signal.payload as SignalPayloadRecord : {}

    if (signal.kind === 'room-key' && options.identityPrivateKey.value) {
      try {
        const nextRoomKey = await unwrapCommunicationRoomKeyFromPeer({
          wrappedCiphertextBase64: String(payload.wrappedCiphertext || ''),
          ivBase64: String(payload.iv || ''),
          recipientPrivateKey: options.identityPrivateKey.value,
          senderPublicKeyJwk: payload.senderPublicKeyJwk as JsonWebKey,
        })
        await options.persistRoomKey(nextRoomKey)
        options.syncStatus.value = 'Ключ комнаты получен'
        await options.refreshMessagesOnly()
      } catch {
        options.syncStatus.value = 'Не удалось расшифровать ключ комнаты'
      }
      return
    }

    if (signal.kind === 'invite') {
      if (activeCall.value || incomingCall.value) {
        await options.apiFetch(`/rooms/${options.currentChatRoomId.value}/signals`, {
          method: 'POST',
          body: { kind: 'busy', callId: signal.callId, targetActorKey: `${signal.senderRole}:${signal.senderActorId}`, payload: {} },
        }).catch(() => {})
        return
      }
      const senderKey = `${signal.senderRole}:${signal.senderActorId}`
      const inviteE2ee = payload.e2ee as CommunicationCallE2EEPayload | undefined
      incomingCall.value = {
        callId: signal.callId,
        fromActorKey: senderKey,
        fromDisplayName: signal.senderDisplayName || senderKey,
        mode: payload.mode === 'video' ? 'video' : 'audio',
        e2ee: inviteE2ee,
      }
      if (inviteE2ee?.supported && supportsCommunicationCallEncryption()) {
        setCallSecurityPending('Входящий звонок поддерживает E2EE. После принятия появятся символы для сверки.')
      } else if (inviteE2ee?.supported) {
        setCallSecurityFallback('Собеседник поддерживает E2EE, но этот браузер не умеет encoded transforms.')
      } else {
        setCallSecurityFallback('Для этого вызова используется только штатное шифрование WebRTC.')
      }
      callStatusText.value = 'Входящий вызов'
      return
    }

    if (signal.kind === 'ringing' && activeCall.value?.initiator) {
      const ringingE2ee = payload.e2ee as CommunicationCallE2EEPayload | undefined
      if (callSecurityContext && ringingE2ee?.supported && ringingE2ee.publicKey) {
        await activateCommunicationCallSecurityContext(callSecurityContext, ringingE2ee.publicKey)
        setCallSecurityActive()
      } else {
        clearCallSecurityContext()
        setCallSecurityFallback(ringingE2ee?.supported ? 'Собеседник не передал корректный ключ для E2EE.' : 'Собеседник не использует дополнительное E2EE для звонка.')
      }
      const mode = payload.mode === 'video' ? 'video' : 'audio'
      await initMedia(mode)
      const connection = buildPeerConnection(signal.callId, activeCall.value.peerActorKey, mode)
      const offer = await connection.createOffer()
      await connection.setLocalDescription(offer)
      await options.apiFetch(`/rooms/${options.currentChatRoomId.value}/signals`, {
        method: 'POST',
        body: { kind: 'offer', callId: signal.callId, targetActorKey: activeCall.value.peerActorKey, payload: { sdp: offer.sdp, type: offer.type, mode } },
      })
      callStatusText.value = 'Отправлен offer'
      return
    }

    if (signal.kind === 'offer') {
      const senderKey = `${signal.senderRole}:${signal.senderActorId}`
      const mode = payload.mode === 'video' ? 'video' : 'audio'
      if (!activeCall.value) activeCall.value = { callId: signal.callId, peerActorKey: senderKey, mode, initiator: false }
      if (!localStream) await initMedia(mode)
      const connection = buildPeerConnection(signal.callId, senderKey, mode)
      await connection.setRemoteDescription({ type: 'offer', sdp: String(payload.sdp || '') })
      await flushPendingIceCandidates(signal.callId, connection)
      const answer = await connection.createAnswer()
      await connection.setLocalDescription(answer)
      await options.apiFetch(`/rooms/${options.currentChatRoomId.value}/signals`, {
        method: 'POST',
        body: { kind: 'answer', callId: signal.callId, targetActorKey: senderKey, payload: { sdp: answer.sdp, type: answer.type, mode } },
      })
      callStatusText.value = 'Отправлен answer'
      return
    }

    if (signal.kind === 'answer' && peerConnection) {
      await peerConnection.setRemoteDescription({ type: 'answer', sdp: String(payload.sdp || '') })
      await flushPendingIceCandidates(signal.callId, peerConnection)
      callStatusText.value = 'Канал установлен'
      return
    }

    if (signal.kind === 'ice-candidate' && payload.candidate) {
      const candidate = payload.candidate as RTCIceCandidateInit
      const remoteDescriptionReady = Boolean(peerConnection?.remoteDescription)
      if (!peerConnection || !remoteDescriptionReady) {
        queueIceCandidate(signal.callId, candidate)
        return
      }
      await peerConnection.addIceCandidate(candidate).catch(() => {
        queueIceCandidate(signal.callId, candidate)
      })
      return
    }

    if (signal.kind === 'reject') {
      teardownCall('Вызов отклонён')
      return
    }

    if (signal.kind === 'busy') {
      teardownCall('Собеседник уже на другом звонке')
      return
    }

    if (signal.kind === 'mute') {
      remoteMutedByPeer.value = true
      callStatusText.value = 'Собеседник отключил микрофон'
      return
    }

    if (signal.kind === 'unmute') {
      remoteMutedByPeer.value = false
      callStatusText.value = 'Собеседник снова включил микрофон'
      return
    }

    if (signal.kind === 'hangup') teardownCall('Собеседник завершил звонок')
  }

  function disposeRealtime() {
    eventSource?.close()
    teardownCall()
  }

  return {
    incomingCall,
    activeCall,
    callStatusText,
    callBusy,
    callSecurity,
    remoteMutedByPeer,
    eventStreamConnected,
    activeCallMode,
    callPermissionHelp,
    callConnectionQuality,
    callConnectionQualityStyle,
    callControls,
    supportedCalls,
    microphonePermissionLabel,
    cameraPermissionLabel,
    compactCallSecurityStatus,
    videoReadiness,
    toggleMicrophone,
    toggleSpeaker,
    refreshMediaPermissions,
    checkAudioAccess,
    checkVideoAccess,
    resetRealtimeState,
    setupEventStream,
    startOutgoingCall,
    acceptIncomingCall,
    rejectIncomingCall,
    hangupCall,
    teardownCall,
    disposeRealtime,
  }
}
