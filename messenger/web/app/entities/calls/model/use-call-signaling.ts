import { type Ref } from 'vue'

export type MessengerCallMode = 'audio' | 'video'
export type MessengerCallSignalKind = 'invite' | 'ringing' | 'offer' | 'answer' | 'ice-candidate' | 'reject' | 'hangup' | 'busy'

export interface MessengerCallE2EEPublicKey {
  kty: 'EC'
  crv: 'P-256'
  x: string
  y: string
  ext?: boolean
  key_ops?: string[]
}

export interface MessengerCallE2EEPayload {
  supported: boolean
  publicKey?: MessengerCallE2EEPublicKey
  salt?: string
}

export interface MessengerCallSignalEvent {
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

export interface MessengerIncomingCall {
  callId: string
  conversationId: string
  fromUserId: string
  fromDisplayName: string
  mode: MessengerCallMode
  e2ee?: MessengerCallE2EEPayload
}

export interface MessengerActiveCall {
  callId: string
  conversationId: string
  peerUserId: string
  peerDisplayName: string
  mode: MessengerCallMode
  initiator: boolean
}

export interface MessengerCallSecurityContext {
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

function resolveCallMode(value: unknown): MessengerCallMode {
  return value === 'video' ? 'video' : 'audio'
}

interface CallSignalingDeps {
  sendSignal: (conversationId: string, signal: { kind: MessengerCallSignalKind; callId: string; payload?: Record<string, unknown> }) => Promise<void>
  activeCall: Ref<MessengerActiveCall | null>
  incomingCall: Ref<MessengerIncomingCall | null>
  busy: Ref<boolean>
  callStatusText: Ref<string>
  callError: Ref<string>
  getPeerConnection: () => RTCPeerConnection | null
  getCallSecurityContext: () => MessengerCallSecurityContext | null
  hasLocalStream: () => boolean
  activateCallSecurityContext: (remotePublicKey: MessengerCallE2EEPublicKey) => Promise<unknown>
  setCallSecurityActive: () => void
  setCallSecurityPending: () => void
  clearCallSecurityContext: () => void
  setCallSecurityFallback: (reason: string) => void
  selectConversationForCall: (conversationId: string) => Promise<void>
  initMedia: (mode: MessengerCallMode) => Promise<MediaStream>
  getActiveConversationSecret: () => boolean | null | undefined
  buildPeerConnection: (callId: string, conversationId: string, mode: MessengerCallMode) => RTCPeerConnection
  prepareConnectionForRemoteOffer: (connection: RTCPeerConnection) => Promise<boolean>
  flushPendingIceCandidates: (callId: string, connection: RTCPeerConnection) => Promise<void>
  queueIceCandidate: (callId: string, candidate: RTCIceCandidateInit) => void
  connectLiveKitRoom: (conversationId: string, mode: MessengerCallMode) => Promise<void>
  startTranscription: () => unknown
  stopTranscription: () => void
  teardownCall: (reason: string) => void
  finalizeCallReview: (call: MessengerActiveCall | null) => Promise<void>
  supportsInsertableCallEncryption: () => boolean
}

export function useCallSignaling(deps: CallSignalingDeps) {
  const {
    sendSignal,
    activeCall, incomingCall, busy, callStatusText, callError,
    getPeerConnection, getCallSecurityContext, hasLocalStream,
    activateCallSecurityContext, setCallSecurityActive, setCallSecurityPending,
    clearCallSecurityContext, setCallSecurityFallback,
    selectConversationForCall, initMedia, getActiveConversationSecret,
    buildPeerConnection, prepareConnectionForRemoteOffer, flushPendingIceCandidates, queueIceCandidate,
    connectLiveKitRoom, startTranscription, stopTranscription, teardownCall, finalizeCallReview,
    supportsInsertableCallEncryption,
  } = deps

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
        setCallSecurityPending()
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
        if (getCallSecurityContext() && ringingE2EE?.supported && ringingE2EE.publicKey) {
          await activateCallSecurityContext(ringingE2EE.publicKey)
          setCallSecurityActive()
        } else {
          clearCallSecurityContext()
          setCallSecurityFallback(ringingE2EE?.supported ? 'Собеседник не передал корректный ключ для E2EE.' : 'Собеседник не использует дополнительное E2EE для звонка.')
        }
        await selectConversationForCall(event.conversationId)
        if (!hasLocalStream()) {
          await initMedia(mode)
        }

        if (!getActiveConversationSecret()) {
          callStatusText.value = 'Подключение к медиа-серверу (LiveKit)…'
          await connectLiveKitRoom(event.conversationId, mode)
          return
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
        if (mode === 'audio') {
          void startTranscription()
        }
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
        } else {
          activeCall.value = {
            ...activeCall.value,
            mode,
          }
        }
        if (!hasLocalStream()) {
          await initMedia(mode)
        }
        const connection = buildPeerConnection(event.signal.callId, event.conversationId, mode)
        const canApplyOffer = await prepareConnectionForRemoteOffer(connection)
        if (!canApplyOffer) {
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
        if (mode === 'audio') {
          void startTranscription()
        } else {
          stopTranscription()
        }
      } catch {
        callError.value = 'Не удалось обработать входящий звонок.'
        teardownCall('')
      }
      return
    }

    const pc = getPeerConnection()

    if (event.signal.kind === 'answer' && pc) {
      try {
        if (activeCall.value) {
          activeCall.value = {
            ...activeCall.value,
            mode,
          }
        }
        await pc.setRemoteDescription({
          type: 'answer',
          sdp: String(event.signal.payload?.sdp || ''),
        })
        await flushPendingIceCandidates(event.signal.callId, pc)
        callStatusText.value = 'Канал установлен'
        busy.value = false
        if (mode === 'audio') {
          void startTranscription()
        } else {
          stopTranscription()
        }
      } catch {
        callError.value = 'Не удалось завершить установку соединения.'
        teardownCall('')
      }
      return
    }

    if (event.signal.kind === 'ice-candidate' && event.signal.payload?.candidate) {
      const candidate = event.signal.payload.candidate as RTCIceCandidateInit
      const remoteDescriptionReady = Boolean(pc?.remoteDescription)

      if (!pc || !remoteDescriptionReady) {
        queueIceCandidate(event.signal.callId, candidate)
        return
      }

      await pc.addIceCandidate(candidate).catch(() => {
        queueIceCandidate(event.signal!.callId, candidate)
      })
      return
    }

    if (event.signal.kind === 'reject') {
      await finalizeCallReview(activeCall.value ? { ...activeCall.value } : null)
      teardownCall('Вызов отклонён')
      return
    }

    if (event.signal.kind === 'busy') {
      await finalizeCallReview(activeCall.value ? { ...activeCall.value } : null)
      teardownCall('Собеседник уже на другом звонке')
      return
    }

    if (event.signal.kind === 'hangup') {
      await finalizeCallReview(activeCall.value ? { ...activeCall.value } : null)
      teardownCall('Собеседник завершил звонок')
    }
  }

  return { handleSignal }
}
