import type { Ref } from 'vue'

type CallNetworkQuality = 'stable' | 'weak' | 'reconnecting' | 'lost'
type CallSignalKind = 'invite' | 'ringing' | 'offer' | 'answer' | 'ice-candidate' | 'reject' | 'hangup' | 'busy'

interface CallPeerConnectionDeps {
  callStatusText: Ref<string>
  renegotiating: Ref<boolean>
  callError: Ref<string>
  getLocalStream: () => MediaStream | null
  getRemoteStream: () => MediaStream | null
  setRemoteStream: (stream: MediaStream | null) => void
  applySenderCallSecurity: (sender: RTCRtpSender) => void
  applyReceiverCallSecurity: (receiver: RTCRtpReceiver) => void
  assignMediaTargets: () => void
  setupDataChannel: (channel: RTCDataChannel) => void
  sendSignal: (conversationId: string, signal: { kind: CallSignalKind; callId: string; payload?: Record<string, unknown> }) => Promise<void>
  setNetworkState: (quality: CallNetworkQuality, hint: string) => void
  startTranscriptionEnergySampler: () => void
}

let peerConnection: RTCPeerConnection | null = null
let peerDataChannel: RTCDataChannel | null = null
let peerConnectionCallId = ''
const pendingIceCandidates = new Map<string, RTCIceCandidateInit[]>()

export function useCallPeerConnection(deps: CallPeerConnectionDeps) {
  function getPeerConnection() {
    return peerConnection
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

  function resetPeerConnection() {
    peerDataChannel?.close()
    peerDataChannel = null
    peerConnection?.close()
    peerConnection = null
    peerConnectionCallId = ''
    pendingIceCandidates.clear()

    const remoteStream = deps.getRemoteStream()
    if (remoteStream) {
      for (const track of remoteStream.getTracks()) {
        track.stop()
      }
    }

    deps.setRemoteStream(null)
    deps.assignMediaTargets()
    deps.startTranscriptionEnergySampler()
  }

  function buildPeerConnection(callId: string, conversationId: string, mode: 'audio' | 'video') {
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
    deps.setRemoteStream(new MediaStream())
    deps.assignMediaTargets()

    try {
      peerDataChannel = connection.createDataChannel('transcription-sync', { negotiated: true, id: 0 })
      deps.setupDataChannel(peerDataChannel)
    } catch (e) {
      console.warn('[DataChannel] Failed to create negotiated channel:', e)
    }

    const localStream = deps.getLocalStream()
    if (localStream) {
      for (const track of localStream.getTracks()) {
        const sender = connection.addTrack(track, localStream)
        deps.applySenderCallSecurity(sender)
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
      deps.applyReceiverCallSecurity(event.receiver)

      const remoteTracks = event.streams[0]?.getTracks()?.length
        ? event.streams[0].getTracks()
        : [event.track]

      const remoteStream = deps.getRemoteStream()
      for (const track of remoteTracks) {
        const alreadyAdded = remoteStream?.getTracks().some(existingTrack => existingTrack.id === track.id)
        if (!alreadyAdded) {
          remoteStream?.addTrack(track)
        }
      }

      event.track.onunmute = () => {
        deps.assignMediaTargets()
      }

      deps.assignMediaTargets()
    }

    connection.onicecandidate = (event) => {
      if (!event.candidate) {
        return
      }

      void deps.sendSignal(conversationId, {
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
        if (connection.connectionState === 'connected') {
          deps.callStatusText.value = mode === 'video'
            ? 'Видеозвонок подключён'
            : 'Аудиозвонок подключён'
          deps.setNetworkState('stable', 'Соединение стабильно.')
        } else if (connection.connectionState === 'connecting') {
          deps.callStatusText.value = 'Устанавливаем соединение…'
          deps.setNetworkState('reconnecting', 'Подключаем звонок…')
        } else if (connection.connectionState === 'disconnected') {
          deps.callStatusText.value = 'Соединение прервалось, пытаемся восстановить…'
          deps.setNetworkState('reconnecting', 'Сеть просела, пробуем восстановить канал.')
        } else if (connection.connectionState === 'failed') {
          deps.callStatusText.value = 'Соединение потеряно'
          deps.setNetworkState('lost', 'Соединение потеряно. Попробуйте перезвонить.')
        } else {
          deps.callStatusText.value = `Соединение: ${connection.connectionState}`
        }
      }

      if (connection.connectionState === 'failed') {
        deps.callError.value = 'Не удалось установить аудиосоединение. Попробуйте перезвонить.'
      }
    }

    connection.oniceconnectionstatechange = () => {
      if (!connection.iceConnectionState) {
        return
      }

      if (connection.iceConnectionState === 'connected' || connection.iceConnectionState === 'completed') {
        deps.setNetworkState('stable', 'Маршрут WebRTC стабилен.')
        return
      }

      if (connection.iceConnectionState === 'checking') {
        deps.setNetworkState('reconnecting', 'Подбираем маршрут для медиаканала…')
        return
      }

      if (connection.iceConnectionState === 'failed' || connection.iceConnectionState === 'disconnected') {
        deps.setNetworkState(
          connection.iceConnectionState === 'failed' ? 'lost' : 'weak',
          connection.iceConnectionState === 'failed'
            ? 'Маршрут WebRTC потерян.'
            : 'Связь нестабильна, возможны задержки и артефакты.',
        )
        deps.callError.value = 'Аудиоканал нестабилен. Проверьте соединение и попробуйте перезвонить.'
      }
    }

    connection.onsignalingstatechange = () => {
      if (connection.signalingState === 'have-local-offer' || connection.signalingState === 'have-remote-offer') {
        deps.renegotiating.value = true
        return
      }

      if (connection.signalingState === 'stable') {
        deps.renegotiating.value = false
      }
    }

    return connection
  }

  function getPeerDataChannel() {
    return peerDataChannel
  }

  return {
    getPeerConnection,
    getPeerDataChannel,
    buildPeerConnection,
    resetPeerConnection,
    queueIceCandidate,
    flushPendingIceCandidates,
  }
}
