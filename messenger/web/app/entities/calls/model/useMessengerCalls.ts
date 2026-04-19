import { normalizeMessengerProjectRoot } from '../../../utils/messenger-project-root'
import { buildMessengerUrl } from '../../../utils/messenger-url'
import {
  buildCleanTranscript,
  buildSummaryFromTranscript,
  cleanTranscriptEntries,
  useCallTranscription,
} from './use-call-transcription'

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
  videoEnabled: boolean
}

type MessengerCallAnalysisToolId = 'psychology' | 'business' | 'intent' | 'objections' | 'speech-risks' | 'next-steps'

interface MessengerCallAnalysisTool {
  id: MessengerCallAnalysisToolId
  title: string
  description: string
}

interface MessengerCallReviewState {
  callId: string
  conversationId: string
  peerDisplayName: string
  cleanedTranscript: string
  summary: string
  sourceLines: number
  generatedAt: number
  autoPosted: boolean
  syncedProjectSlug?: string
  syncedInsightId?: string
  syncedAt?: number
}

type MessengerCallViewMode = 'full' | 'split' | 'mini'
type MessengerCallNetworkQuality = 'stable' | 'weak' | 'reconnecting' | 'lost'
type MessengerCallCameraFacing = 'user' | 'environment'

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

interface MessengerLiveKitTrack {
  kind?: string
  attach: (element: HTMLMediaElement) => HTMLMediaElement
  detach: (element?: HTMLMediaElement) => HTMLMediaElement[] | HTMLMediaElement
}

let peerConnection: RTCPeerConnection | null = null
let liveKitRoom: any = null
let localStream: MediaStream | null = null
let remoteStream: MediaStream | null = null
let localVideoEl: HTMLVideoElement | null = null
let remoteVideoEl: HTMLVideoElement | null = null
let remoteSpeakerVideoEl: HTMLVideoElement | null = null
let remoteAudioEl: HTMLAudioElement | null = null
let peerConnectionCallId = ''
const liveKitRemoteTracks = new Set<MessengerLiveKitTrack>()
const pendingIceCandidates = new Map<string, RTCIceCandidateInit[]>()
const transformedSenders = new WeakSet<object>()
const transformedReceivers = new WeakSet<object>()
const CALL_VIEW_MODE_ORDER: MessengerCallViewMode[] = ['split', 'full', 'mini']
const CALL_VERIFICATION_EMOJIS = ['🔒', '🎧', '🎤', '🛡️', '🎼', '🌿', '🔥', '⚡', '🌊', '🪐', '🍀', '🧩', '🛰️', '🎯', '🌙', '🫧', '🎹', '🦋', '☀️', '🧭', '💎', '🪶', '🎛️', '🧠', '🐚', '🕊️', '🧿', '🪙', '🌈', '❄️', '🍃', '🔑']
const CALL_ANALYSIS_TOOLS: MessengerCallAnalysisTool[] = [
  { id: 'psychology', title: 'Психология клиента', description: 'Эмоции, доверие, скрытые триггеры и тревожность.' },
  { id: 'business', title: 'Деловая практика', description: 'Решения, бюджет, сроки, договорённости и риски.' },
  { id: 'intent', title: 'Карта намерений', description: 'Что клиент хочет получить и какие критерии успеха.' },
  { id: 'objections', title: 'Возражения и сомнения', description: 'Явные и неявные причины сопротивления.' },
  { id: 'speech-risks', title: 'Риски коммуникации', description: 'Где формулировки были расплывчаты или конфликтны.' },
  { id: 'next-steps', title: 'Следующие шаги', description: 'План действий по итогам разговора.' },
]
const CALL_ANALYSIS_WORD_LIBRARY = {
  price: ['бюджет', 'стоим', 'цена', 'скидк', 'оплат', 'предоплат'],
  deadline: ['срок', 'дедлайн', 'когда', 'до ', 'этап', 'дата'],
  concern: ['сомнева', 'боюсь', 'сложно', 'не уверен', 'риск', 'дорого', 'неудоб'],
  decision: ['реши', 'подтверд', 'соглас', 'окончательно', 'берем', 'делаем'],
} as const

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

type MessengerAudioOutputElement = HTMLMediaElement & {
  sinkId?: string
  setSinkId?: (sinkId: string) => Promise<void>
}

function shouldAutoOpenCallAnalysisPanel(mode: MessengerCallMode) {
  if (mode !== 'audio' || !import.meta.client) {
    return false
  }

  return window.matchMedia('(min-width: 980px)').matches
}

function matchesAnalysisWordLibrary(text: string, keywords: readonly string[]) {
  return keywords.some(keyword => text.includes(keyword))
}

function normalizeProjectSyncSlug(value?: string | null) {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '')
}

function buildAnalysisInterpretation(toolId: MessengerCallAnalysisToolId, review: MessengerCallReviewState) {
  const transcriptLower = review.cleanedTranscript.toLowerCase()
  const hasPriceTalk = matchesAnalysisWordLibrary(transcriptLower, CALL_ANALYSIS_WORD_LIBRARY.price)
  const hasDeadlineTalk = matchesAnalysisWordLibrary(transcriptLower, CALL_ANALYSIS_WORD_LIBRARY.deadline)
  const hasConcernTalk = matchesAnalysisWordLibrary(transcriptLower, CALL_ANALYSIS_WORD_LIBRARY.concern)
  const hasDecisionTalk = matchesAnalysisWordLibrary(transcriptLower, CALL_ANALYSIS_WORD_LIBRARY.decision)

  if (toolId === 'psychology') {
    return [
      'Фокус: эмоциональный фон и доверие.',
      hasConcernTalk ? '- У клиента есть зоны тревоги, стоит усилить эмпатию и переформулировать выгоды.' : '- Явных тревожных сигналов мало, можно держать уверенный темп общения.',
      hasDecisionTalk ? '- Клиент ближе к решению, важно закрепить уверенность через короткое резюме.' : '- Решение пока не финализировано, полезны уточняющие вопросы про критерии выбора.',
      '- Рекомендуемая тактика: 1 вопрос про приоритет, 1 отражение эмоции, 1 конкретный следующий шаг.',
    ].join('\n')
  }

  if (toolId === 'business') {
    return [
      'Фокус: деловые договорённости и управляемость сделки.',
      hasPriceTalk ? '- Обсуждались бюджет/стоимость: зафиксируйте диапазон и условия оплаты письменно.' : '- Бюджет прозвучал неявно: стоит отдельно подтвердить финансовые рамки.',
      hasDeadlineTalk ? '- Затрагивались сроки: переведите их в контрольные точки по этапам.' : '- Сроки недостаточно конкретны: предложите 2-3 даты выбора.',
      '- Минимум для фиксации: цель, бюджет, дедлайн, ответственный, формат апдейтов.',
    ].join('\n')
  }

  if (toolId === 'intent') {
    return [
      'Фокус: карта намерений клиента.',
      '- Что клиент хочет получить: выделите конечный результат одной фразой.',
      '- Почему это важно именно сейчас: привяжите к контексту клиента.',
      '- Критерии успеха: попросите 2-3 измеримых индикатора результата.',
    ].join('\n')
  }

  if (toolId === 'objections') {
    return [
      'Фокус: возражения и скрытые барьеры.',
      hasConcernTalk ? '- В речи есть сомнения: проработайте риски через сценарий «до/после».': '- Явных возражений мало, но полезно проверить скрытые барьеры вопросом «что может помешать?».',
      hasPriceTalk ? '- Ценовой блок лучше закрывать через ценность и этапность оплаты.' : '- Ценовой блок не раскрыт, это потенциальный источник будущих возражений.',
      '- Подготовьте 3 коротких ответа: по цене, срокам и объёму работ.',
    ].join('\n')
  }

  if (toolId === 'speech-risks') {
    return [
      'Фокус: качество формулировок и риски коммуникации.',
      '- Уберите двусмысленные формулировки и замените их на проверяемые критерии.',
      '- Фиксируйте итоговые договорённости после каждого смыслового блока.',
      '- Избегайте перегрузки терминами: один тезис = один пример = одно подтверждение.',
    ].join('\n')
  }

  return [
    'Фокус: следующие шаги после звонка.',
    '- Отправить клиенту короткое резюме с подтверждением целей и рамок.',
    '- Согласовать план работ по этапам и точкам контроля.',
    '- Назначить следующую коммуникацию с конкретной датой и ожидаемым результатом.',
  ].join('\n')
}

function isExperimentalCallE2EEEnabled() {
  if (!import.meta.client) {
    return false
  }

  try {
    return window.localStorage.getItem('daria-messenger-call-e2ee') === '1'
  } catch {
    return false
  }
}

function supportsInsertableCallEncryption() {
  if (!import.meta.client || typeof RTCRtpSender === 'undefined' || typeof RTCRtpReceiver === 'undefined') {
    return false
  }

  if (!isExperimentalCallE2EEEnabled()) {
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
  const hkdfKey = await crypto.subtle.importKey('raw', secret as unknown as ArrayBuffer, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: salt as unknown as ArrayBuffer,
    info: new TextEncoder().encode(label),
  }, hkdfKey, length)

  return new Uint8Array(bits)
}

async function buildCallVerificationEmojis(secret: Uint8Array) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', secret as unknown as ArrayBuffer))
  return Array.from({ length: 4 }, (_, index) => CALL_VERIFICATION_EMOJIS[digest[index]! % CALL_VERIFICATION_EMOJIS.length]!)
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

function isAppleTouchAudioRouteViewport() {
  if (!import.meta.client) {
    return false
  }

  const userAgent = navigator.userAgent || ''
  const platform = navigator.platform || ''

  return /iPad|iPhone|iPod/u.test(userAgent)
    || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function canSetAudioOutputSink(element: HTMLMediaElement | null) {
  if (!element) {
    return false
  }

  return typeof (element as MessengerAudioOutputElement).setSinkId === 'function'
}

function syncMediaElementPlayback(element: HTMLMediaElement | null, muted: boolean) {
  if (!element) {
    return
  }

  element.muted = muted
  void element.play().catch(() => {})
}

function clearRemoteMediaElements() {
  if (remoteVideoEl) {
    remoteVideoEl.srcObject = null
  }

  if (remoteSpeakerVideoEl) {
    remoteSpeakerVideoEl.srcObject = null
  }

  if (remoteAudioEl) {
    remoteAudioEl.srcObject = null
  }
}

function clearLiveKitRemoteTracks() {
  for (const track of liveKitRemoteTracks) {
    try {
      track.detach()
    } catch {
      // noop
    }
  }

  liveKitRemoteTracks.clear()
  clearRemoteMediaElements()
}

function syncLiveKitMediaTargets() {
  if (!liveKitRoom) {
    return false
  }

  for (const track of liveKitRemoteTracks) {
    try {
      track.detach()
    } catch {
      // noop
    }
  }

  clearRemoteMediaElements()

  if (remoteVideoEl) {
    remoteVideoEl.muted = true
    remoteVideoEl.autoplay = true
  }

  if (remoteSpeakerVideoEl) {
    remoteSpeakerVideoEl.muted = true
    remoteSpeakerVideoEl.autoplay = true
  }

  if (remoteAudioEl) {
    remoteAudioEl.autoplay = true
  }

  for (const track of liveKitRemoteTracks) {
    try {
      if (track.kind === 'video') {
        if (remoteVideoEl) {
          track.attach(remoteVideoEl)
        }
        continue
      }

      if (track.kind === 'audio') {
        const targets = new Set<HTMLMediaElement>()

        if (remoteAudioEl) {
          targets.add(remoteAudioEl)
        }

        if (remoteVideoEl) {
          targets.add(remoteVideoEl)
        } else if (remoteSpeakerVideoEl) {
          targets.add(remoteSpeakerVideoEl)
        }

        for (const element of targets) {
          track.attach(element)
        }
      }
    } catch {
      // noop
    }
  }

  syncSpeakerState()
  return true
}

function assignMediaTargets() {
  if (localVideoEl) {
    localVideoEl.srcObject = localStream
    void localVideoEl.play().catch(() => {})
  }

  if (syncLiveKitMediaTargets()) {
    return
  }

  if (remoteVideoEl) {
    remoteVideoEl.srcObject = remoteStream
    remoteVideoEl.muted = true
    void remoteVideoEl.play().catch(() => {})
  }

  if (remoteSpeakerVideoEl) {
    remoteSpeakerVideoEl.srcObject = remoteStream
    remoteSpeakerVideoEl.muted = true
    void remoteSpeakerVideoEl.play().catch(() => {})
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
  const runtimeConfig = useRuntimeConfig()
  const messengerProjectRoot = computed(() => normalizeMessengerProjectRoot(runtimeConfig.public.messengerProjectRoot || ''))
  const auth = useMessengerAuth()
  const settingsModel = useMessengerSettings()
  const { clientId } = useMessengerRealtimeIdentity()
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
    videoEnabled: false,
  }))
  const viewMode = useState<MessengerCallViewMode>('messenger-call-view-mode', () => 'full')
  const cameraFacing = useState<MessengerCallCameraFacing>('messenger-call-camera-facing', () => 'user')
  const activeCameraId = useState<string>('messenger-call-camera-id', () => '')
  const availableVideoInputIds = useState<string[]>('messenger-call-video-inputs', () => [])
  const networkQuality = useState<MessengerCallNetworkQuality>('messenger-call-network-quality', () => 'stable')
  const networkHint = useState<string>('messenger-call-network-hint', () => '')
  const renegotiating = useState<boolean>('messenger-call-renegotiating', () => false)
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
  const transcription = useCallTranscription({
    activeCall: activeCall as Ref<{ callId: string; conversationId: string; mode: 'audio' | 'video' } | null>,
    controls: controls as Ref<{ microphoneEnabled: boolean }>,
    authRequest: auth.request,
    authToken: auth.token,
    authUserId: computed(() => auth.user.value?.id || null),
    isServerTranscriptionEnabled: () => Boolean(runtimeConfig.public.messengerServerTranscriptionEnabled),
    getTranscriptionProvider: () => settingsModel.runtimeTranscriptionProvider.value,
    getLocalStream: () => localStream,
    getRemoteStream: () => remoteStream,
    getLiveKitRoom: () => liveKitRoom,
  })
  const {
    transcriptionSupported,
    transcriptionActive,
    transcriptionError,
    transcriptionHint,
    transcriptionDraft,
    transcriptionEntries,
    startTranscription,
    stopTranscription,
    clearTranscription,
    startTranscriptionEnergySampler,
    syncTranscriptionSupportState,
    setupPeerDataChannel,
    closePeerDataChannel,
    handleIncomingDataChannelMessage,
  } = transcription
  const callReview = useState<MessengerCallReviewState | null>('messenger-call-review', () => null)
  const analysisPanelOpen = useState<boolean>('messenger-call-analysis-panel-open', () => false)
  const analysisTools = useState<MessengerCallAnalysisTool[]>('messenger-call-analysis-tools', () => CALL_ANALYSIS_TOOLS)
  const selectedAnalysisToolId = useState<MessengerCallAnalysisToolId>('messenger-call-analysis-tool-id', () => 'psychology')
  const analysisInterpretations = useState<Partial<Record<MessengerCallAnalysisToolId, string>>>('messenger-call-analysis-interpretations', () => ({}))
  const analysisRunning = useState<boolean>('messenger-call-analysis-running', () => false)
  const analysisError = useState<string>('messenger-call-analysis-error', () => '')
  const aiAnalysisInterpretations = useState<Partial<Record<MessengerCallAnalysisToolId, string>>>('messenger-call-ai-analysis-interpretations', () => ({}))
  const aiAnalysisRunning = useState<boolean>('messenger-call-ai-analysis-running', () => false)
  const aiAnalysisError = useState<string>('messenger-call-ai-analysis-error', () => '')
  const projectSyncProjectSlug = useState<string>('messenger-call-project-sync-project-slug', () => '')
  const projectSyncPending = useState<boolean>('messenger-call-project-sync-pending', () => false)
  const projectSyncError = useState<string>('messenger-call-project-sync-error', () => '')
  const projectSyncStatus = useState<string>('messenger-call-project-sync-status', () => '')
  const projectTaskSyncPending = useState<boolean>('messenger-call-project-task-sync-pending', () => false)
  const projectTaskSyncError = useState<string>('messenger-call-project-task-sync-error', () => '')
  const projectTaskSyncStatus = useState<string>('messenger-call-project-task-sync-status', () => '')

  const supported = computed(() => Boolean(import.meta.client && typeof navigator.mediaDevices?.getUserMedia === 'function' && typeof RTCPeerConnection !== 'undefined'))
  const inConversationCall = computed(() => Boolean(activeCall.value && activeCall.value.conversationId === conversations.activeConversationId.value))
  const canStartAudioCall = computed(() => supported.value && mediaPermissionState.value.microphone !== 'denied')
  const canStartVideoCall = computed(() => supported.value && mediaPermissionState.value.microphone !== 'denied' && mediaPermissionState.value.camera !== 'denied')
  const canSwitchCamera = computed(() => Boolean(
    activeCall.value
    && controls.value.videoEnabled
    && (availableVideoInputIds.value.length > 1 || cameraFacing.value === 'user' || cameraFacing.value === 'environment')
  ))

  watch(() => auth.token.value, (nextToken) => {
    if (nextToken && !settingsModel.aiSettingsReady.value && !settingsModel.aiSettingsPending.value) {
      void settingsModel.hydrateAiSettings(auth.request)
    }
  }, { immediate: true })
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

  function clearCallReview() {
    callReview.value = null
    analysisInterpretations.value = {}
    analysisError.value = ''
    aiAnalysisInterpretations.value = {}
    aiAnalysisError.value = ''
    projectSyncError.value = ''
    projectSyncStatus.value = ''
    projectSyncPending.value = false
    projectTaskSyncError.value = ''
    projectTaskSyncStatus.value = ''
    projectTaskSyncPending.value = false
    analysisPanelOpen.value = false
  }

  async function syncCallReviewToProject(options: { projectSlug?: string } = {}) {
    if (!callReview.value) {
      projectSyncError.value = 'Нет итогов звонка для синхронизации.'
      projectSyncStatus.value = ''
      return null
    }

    const projectSlug = normalizeProjectSyncSlug(options.projectSlug || projectSyncProjectSlug.value)
    if (!projectSlug) {
      projectSyncError.value = 'Укажите slug проекта перед отправкой.'
      projectSyncStatus.value = ''
      return null
    }

    if (projectSyncPending.value) {
      return null
    }

    const review = { ...callReview.value }
    const syncTitle = review.peerDisplayName ? `Звонок: ${review.peerDisplayName}`.slice(0, 200) : undefined

    projectSyncProjectSlug.value = projectSlug
    projectSyncPending.value = true
    projectSyncError.value = ''
    projectSyncStatus.value = ''

    try {
      const response = await $fetch<{
        insight?: {
          id?: string
        }
        meta?: {
          blockerCountAdded?: number
          checkpointCreated?: boolean
        }
      }>(buildMessengerUrl(messengerProjectRoot.value, `/api/projects/${encodeURIComponent(projectSlug)}/communications/call-insights`), {
        method: 'POST',
        credentials: 'include',
        body: {
          title: syncTitle,
          summary: review.summary.slice(0, 8000),
          transcript: review.cleanedTranscript.slice(0, 32000),
          callId: review.callId,
          conversationId: review.conversationId,
          happenedAt: new Date(review.generatedAt || Date.now()).toISOString(),
          actorName: review.peerDisplayName.slice(0, 120) || undefined,
        },
      })

      const blockerCountAdded = Number(response.meta?.blockerCountAdded || 0)
      const checkpointCreated = Boolean(response.meta?.checkpointCreated)
      const syncDetails = [
        blockerCountAdded ? `блокеров: ${blockerCountAdded}` : '',
        checkpointCreated ? 'создана контрольная точка' : '',
      ].filter(Boolean)

      if (callReview.value && callReview.value.callId === review.callId && callReview.value.generatedAt === review.generatedAt) {
        callReview.value = {
          ...callReview.value,
          autoPosted: true,
          syncedProjectSlug: projectSlug,
          syncedInsightId: typeof response.insight?.id === 'string' ? response.insight.id : '',
          syncedAt: Date.now(),
        }
      }

      projectSyncStatus.value = syncDetails.length
        ? `Звонок добавлен в проект ${projectSlug}: ${syncDetails.join(', ')}.`
        : `Звонок добавлен в проект ${projectSlug}.`
      return response
    } catch (error: any) {
      const rawMessage = error?.data?.statusMessage || error?.message || 'Не удалось добавить звонок в проект.'
      projectSyncError.value = rawMessage === 'Нет доступа к коммуникациям проекта'
        ? 'Нет доступа к проекту. Откройте основной сайт и войдите в проектный или admin-контур.'
        : rawMessage
      return null
    } finally {
      projectSyncPending.value = false
    }
  }

  async function applyCallReviewToProjectSprint(options: { projectSlug?: string } = {}) {
    if (!callReview.value) {
      projectTaskSyncError.value = 'Нет итогов звонка для синхронизации задач.'
      projectTaskSyncStatus.value = ''
      return null
    }

    const projectSlug = normalizeProjectSyncSlug(options.projectSlug || projectSyncProjectSlug.value)
    if (!projectSlug) {
      projectTaskSyncError.value = 'Укажите slug проекта перед синхронизацией задач.'
      projectTaskSyncStatus.value = ''
      return null
    }

    if (projectTaskSyncPending.value) {
      return null
    }

    projectTaskSyncPending.value = true
    projectTaskSyncError.value = ''
    projectTaskSyncStatus.value = ''

    try {
      let insightId = callReview.value.syncedProjectSlug === projectSlug ? callReview.value.syncedInsightId || '' : ''

      if (!insightId) {
        const syncResponse = await syncCallReviewToProject({ projectSlug })
        insightId = typeof syncResponse?.insight?.id === 'string'
          ? syncResponse.insight.id
          : (callReview.value?.syncedProjectSlug === projectSlug ? callReview.value?.syncedInsightId || '' : '')
      }

      if (!insightId) {
        projectTaskSyncError.value = projectSyncError.value || 'Не удалось подготовить инсайт звонка для задач.'
        return null
      }

      const response = await $fetch<{
        meta?: {
          createdTaskCount?: number
          createdSprint?: boolean
        }
      }>(buildMessengerUrl(messengerProjectRoot.value, `/api/projects/${encodeURIComponent(projectSlug)}/communications/call-insights/${encodeURIComponent(insightId)}/apply`), {
        method: 'POST',
        credentials: 'include',
        body: {},
      })

      const createdTaskCount = Number(response.meta?.createdTaskCount || 0)
      const createdSprint = Boolean(response.meta?.createdSprint)

      projectTaskSyncStatus.value = createdTaskCount
        ? `Следующие шаги синхронизированы: задач ${createdTaskCount}${createdSprint ? ', создан follow-up спринт' : ''}.`
        : 'Новых задач не появилось: шаги уже были синхронизированы раньше.'
      return response
    } catch (error: any) {
      const rawMessage = error?.data?.statusMessage || error?.message || 'Не удалось превратить звонок в задачи спринта.'
      projectTaskSyncError.value = rawMessage === 'Нет доступа'
        ? 'Для синхронизации задач нужен admin-доступ на основном сайте.'
        : rawMessage
      return null
    } finally {
      projectTaskSyncPending.value = false
    }
  }

  function openAnalysisPanel() {
    analysisPanelOpen.value = true
    // Транскрипция запускается только явно через toggleCallTranscription
  }

  function closeAnalysisPanel() {
    analysisPanelOpen.value = false
  }

  function toggleAnalysisPanel(force?: boolean) {
    const nextState = typeof force === 'boolean' ? force : !analysisPanelOpen.value
    analysisPanelOpen.value = nextState
    // Транскрипция не запускается автоматически при открытии панели
  }

  async function runAnalysisTool(toolId: MessengerCallAnalysisToolId = selectedAnalysisToolId.value) {
    if (!callReview.value) {
      analysisError.value = 'Нет данных звонка для анализа.'
      return ''
    }

    selectedAnalysisToolId.value = toolId
    analysisRunning.value = true
    analysisError.value = ''

    try {
      const interpretation = buildAnalysisInterpretation(toolId, callReview.value)

      analysisInterpretations.value = {
        ...analysisInterpretations.value,
        [toolId]: interpretation,
      }
      return interpretation
    } catch {
      analysisError.value = 'Не удалось построить интерпретацию.'
      return ''
    } finally {
      analysisRunning.value = false
    }
  }

  async function runAiAnalysisTool(toolId: MessengerCallAnalysisToolId = selectedAnalysisToolId.value) {
    if (!callReview.value) {
      aiAnalysisError.value = 'Нет данных звонка для API-разбора.'
      return ''
    }

    if (settingsModel.runtimeInterpretationProvider.value !== 'api') {
      aiAnalysisError.value = 'Для этого звонка выбран алгоритмический разбор без API.'
      return ''
    }

    selectedAnalysisToolId.value = toolId
    aiAnalysisRunning.value = true
    aiAnalysisError.value = ''

    try {
      const response = await auth.request<{ interpretation?: string }>(`/conversations/${callReview.value.conversationId}/calls/${callReview.value.callId}/analysis`, {
        method: 'POST',
        body: {
          toolId,
          cleanedTranscript: callReview.value.cleanedTranscript,
          summary: callReview.value.summary,
        },
      })

      const interpretation = String(response.interpretation || '').trim()
      aiAnalysisInterpretations.value = {
        ...aiAnalysisInterpretations.value,
        [toolId]: interpretation,
      }
      return interpretation
    } catch {
      aiAnalysisError.value = 'Не удалось построить API-разбор.'
      return ''
    } finally {
      aiAnalysisRunning.value = false
    }
  }

  async function finalizeCallReview(snapshot: MessengerActiveCall | null) {
    if (!snapshot) {
      return null
    }

    const cleanedEntries = cleanTranscriptEntries(transcriptionEntries.value)
    const cleanedTranscript = buildCleanTranscript(cleanedEntries)
    const summary = buildSummaryFromTranscript(cleanedEntries)

    projectSyncError.value = ''
    projectSyncStatus.value = ''
    projectSyncPending.value = false
    projectTaskSyncError.value = ''
    projectTaskSyncStatus.value = ''
    projectTaskSyncPending.value = false

    callReview.value = {
      callId: snapshot.callId,
      conversationId: snapshot.conversationId,
      peerDisplayName: snapshot.peerDisplayName,
      cleanedTranscript,
      summary,
      sourceLines: cleanedEntries.length,
      generatedAt: Date.now(),
      autoPosted: false,
    }
    analysisPanelOpen.value = true

    await runAnalysisTool(selectedAnalysisToolId.value)
    return callReview.value
  }

  function syncMicrophoneState() {
    if (!localStream) {
      return
    }

    for (const track of localStream.getAudioTracks()) {
      track.enabled = controls.value.microphoneEnabled
    }
  }

  async function applyAudioOutputPreference(element: HTMLMediaElement | null, speakerEnabled: boolean) {
    if (!element) {
      return
    }

    const mediaElement = element as MessengerAudioOutputElement
    if (typeof mediaElement.setSinkId !== 'function') {
      return
    }

    const preferredSinkIds = speakerEnabled ? ['default'] : ['communications', 'default']

    for (const sinkId of preferredSinkIds) {
      try {
        if (mediaElement.sinkId === sinkId) {
          return
        }

        await mediaElement.setSinkId(sinkId)
        return
      } catch {
        // Ignore unsupported sink targets and keep the current output route.
      }
    }
  }

  function syncSpeakerState() {
    const speakerFallbackElement = remoteVideoEl || remoteSpeakerVideoEl
    const canSelectOutputRoute = canSetAudioOutputSink(remoteAudioEl) || canSetAudioOutputSink(speakerFallbackElement)

    if (!canSelectOutputRoute && isAppleTouchAudioRouteViewport() && remoteAudioEl && speakerFallbackElement) {
      syncMediaElementPlayback(remoteAudioEl, controls.value.speakerEnabled)
      syncMediaElementPlayback(speakerFallbackElement, !controls.value.speakerEnabled)
      return
    }

    const activeOutputElement = remoteAudioEl || speakerFallbackElement

    if (activeOutputElement) {
      syncMediaElementPlayback(activeOutputElement, false)
      void applyAudioOutputPreference(activeOutputElement, controls.value.speakerEnabled)
    }

    if (remoteAudioEl && activeOutputElement !== remoteAudioEl) {
      syncMediaElementPlayback(remoteAudioEl, true)
    }

    if (speakerFallbackElement && activeOutputElement !== speakerFallbackElement) {
      syncMediaElementPlayback(speakerFallbackElement, true)
    }
  }

  function syncVideoState() {
    if (!localStream) {
      return
    }

    for (const track of localStream.getVideoTracks()) {
      track.enabled = controls.value.videoEnabled
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

  function attachElements(elements: {
    localVideo?: HTMLVideoElement | null
    remoteVideo?: HTMLVideoElement | null
    remoteSpeakerVideo?: HTMLVideoElement | null
    remoteAudio?: HTMLAudioElement | null
  }) {
    if ('localVideo' in elements) {
      localVideoEl = elements.localVideo ?? null
    }

    if ('remoteVideo' in elements) {
      remoteVideoEl = elements.remoteVideo ?? null
    }

    if ('remoteSpeakerVideo' in elements) {
      remoteSpeakerVideoEl = elements.remoteSpeakerVideo ?? null
    }

    if ('remoteAudio' in elements) {
      remoteAudioEl = elements.remoteAudio ?? null
    }

    assignMediaTargets()
    syncSpeakerState()
    syncVideoState()
  }

  function clearElements() {
    localVideoEl = null
    remoteVideoEl = null
    remoteSpeakerVideoEl = null
    remoteAudioEl = null
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

  function stopLocalStream() {
    if (!localStream) {
      return
    }

    for (const track of localStream.getTracks()) {
      track.stop()
    }

    localStream = null
    activeCameraId.value = ''
    assignMediaTargets()
  }

  function resetPeerConnection() {
    closePeerDataChannel()
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
    startTranscriptionEnergySampler()
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
      body: {
        ...signal,
        clientId: clientId.value,
      },
    })
  }

  async function initMedia(mode: MessengerCallMode) {
    if (localStream) {
      await refreshVideoInputs()
      syncVideoTrackState(localStream.getVideoTracks()[0] || null)
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
      } satisfies MediaTrackConstraints as MediaTrackConstraints & { latency?: number },
      video: mode === 'video',
    })

    for (const track of localStream.getAudioTracks()) {
      track.contentHint = 'speech'
    }

    assignMediaTargets()
    syncMicrophoneState()
    syncVideoState()
    await refreshVideoInputs()
    syncVideoTrackState(localStream.getVideoTracks()[0] || null)
    startTranscriptionEnergySampler()
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

    try {
      setupPeerDataChannel(connection.createDataChannel('transcription-sync', { negotiated: true, id: 0 }))
    } catch (e) {
      console.warn('[DataChannel] Failed to create negotiated channel:', e)
    }

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
        if (connection.connectionState === 'connected') {
          callStatusText.value = activeCall.value?.mode === 'video' || controls.value.videoEnabled
            ? 'Видеозвонок подключён'
            : 'Аудиозвонок подключён'
          setNetworkState('stable', 'Соединение стабильно.')
        } else if (connection.connectionState === 'connecting') {
          callStatusText.value = 'Устанавливаем соединение…'
          setNetworkState('reconnecting', 'Подключаем звонок…')
        } else if (connection.connectionState === 'disconnected') {
          callStatusText.value = 'Соединение прервалось, пытаемся восстановить…'
          setNetworkState('reconnecting', 'Сеть просела, пробуем восстановить канал.')
        } else if (connection.connectionState === 'failed') {
          callStatusText.value = 'Соединение потеряно'
          setNetworkState('lost', 'Соединение потеряно. Попробуйте перезвонить.')
        } else {
          callStatusText.value = `Соединение: ${connection.connectionState}`
        }
      }

      if (connection.connectionState === 'failed') {
        callError.value = 'Не удалось установить аудиосоединение. Попробуйте перезвонить.'
      }
    }

    connection.oniceconnectionstatechange = () => {
      if (!connection.iceConnectionState) {
        return
      }

      if (connection.iceConnectionState === 'connected' || connection.iceConnectionState === 'completed') {
        setNetworkState('stable', 'Маршрут WebRTC стабилен.')
        return
      }

      if (connection.iceConnectionState === 'checking') {
        setNetworkState('reconnecting', 'Подбираем маршрут для медиаканала…')
        return
      }

      if (connection.iceConnectionState === 'failed' || connection.iceConnectionState === 'disconnected') {
        setNetworkState(connection.iceConnectionState === 'failed' ? 'lost' : 'weak', connection.iceConnectionState === 'failed'
          ? 'Маршрут WebRTC потерян.'
          : 'Связь нестабильна, возможны задержки и артефакты.')
        callError.value = 'Аудиоканал нестабилен. Проверьте соединение и попробуйте перезвонить.'
      }
    }

    connection.onsignalingstatechange = () => {
      if (connection.signalingState === 'have-local-offer' || connection.signalingState === 'have-remote-offer') {
        renegotiating.value = true
        return
      }

      if (connection.signalingState === 'stable') {
        renegotiating.value = false
      }
    }

    return connection
  }

  function teardownCall(status = '') {
    stopTranscription()
    if (liveKitRoom) {
      try { void liveKitRoom.disconnect() } catch {}
      liveKitRoom = null
    }
    clearLiveKitRemoteTracks()
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
      videoEnabled: false,
    }
    viewMode.value = 'full'
    cameraFacing.value = 'user'
    activeCameraId.value = ''
    availableVideoInputIds.value = []
    setNetworkState('stable', '')
    renegotiating.value = false
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

  function safeGenCallId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return Math.random().toString(36).substring(2, 15)
  }

  async function startOutgoingCall(mode: MessengerCallMode) {
    callError.value = ''
    clearCallReview()
    // Панель транскрипции открывается только по явному действию пользователя
    analysisPanelOpen.value = false
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

    try {
      const granted = await ensureMediaAccess(mode)
      if (!granted) {
        return
      }

      const callId = safeGenCallId()
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
      controls.value = {
        microphoneEnabled: true,
        speakerEnabled: true,
        videoEnabled: mode === 'video',
      }
      viewMode.value = mode === 'video' ? 'split' : 'full'
      callStatusText.value = mode === 'video' ? 'Отправляем видеовызов…' : 'Отправляем аудиовызов…'

      await sendSignal(conversation.id, {
        kind: 'invite',
        callId,
        payload: { mode, e2ee: e2eePayload },
      })
    } catch (err) {
      teardownCall('')
      callError.value = 'Не удалось отправить приглашение или начать звонок. Проверьте права на функции или микрофон.'
    }
  }

  async function acceptIncomingCall() {
    callError.value = ''
    clearCallReview()
    // Панель транскрипции не открывается автоматически
    analysisPanelOpen.value = false

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
      activeCall.value = {
        callId: incomingCall.value.callId,
        conversationId: incomingCall.value.conversationId,
        peerUserId: incomingCall.value.fromUserId,
        peerDisplayName: incomingCall.value.fromDisplayName,
        mode: incomingCall.value.mode,
        initiator: false,
      }
      controls.value = {
        microphoneEnabled: true,
        speakerEnabled: true,
        videoEnabled: incomingCall.value.mode === 'video',
      }
      viewMode.value = incomingCall.value.mode === 'video' ? 'split' : 'full'

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

      const activeConvId = incomingCall.value.conversationId
      const activeCallMode = incomingCall.value.mode

      await sendSignal(incomingCall.value.conversationId, {
        kind: 'ringing',
        callId: incomingCall.value.callId,
        payload: {
          accepted: true,
          mode: incomingCall.value.mode,
          e2ee: ringingE2EE,
        },
      })
      incomingCall.value = null

      if (!conversations.activeConversation.value?.secret) {
        callStatusText.value = 'Подключение к медиа-серверу (LiveKit)…'
        await connectLiveKitRoom(activeConvId, activeCallMode)
      } else {
        callStatusText.value = 'Подготовка соединения…'
      }
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

    const activeSnapshot = { ...activeCall.value }

    try {
      await sendSignal(activeCall.value.conversationId, {
        kind: 'hangup',
        callId: activeCall.value.callId,
        payload: {},
      })
    } catch {
      // ignore transport failure during hangup in alpha stage
    } finally {
      await finalizeCallReview(activeSnapshot)
      teardownCall(status)
    }
  }

  async function prepareConnectionForRemoteOffer(connection: RTCPeerConnection) {
    if (connection.signalingState === 'have-local-offer') {
      await connection.setLocalDescription({ type: 'rollback' })
      renegotiating.value = false
      return true
    }

    return connection.signalingState !== 'have-remote-offer'
  }

  async function connectLiveKitRoom(conversationId: string, mode: MessengerCallMode) {
    try {
      const response = await $fetch<{ token: string, serverUrl: string }>(buildMessengerUrl(runtimeConfig.public.messengerCoreBaseUrl || '/', `/conversations/${encodeURIComponent(conversationId)}/calls/livekit-token`), {
        method: 'POST',
        headers: auth.token.value ? { Authorization: `Bearer ${auth.token.value}` } : undefined
      })

      const { Room, RoomEvent } = await import('livekit-client')
      clearLiveKitRemoteTracks()
      remoteStream = null
      liveKitRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      })

      liveKitRoom.on(RoomEvent.TrackSubscribed, (track: MessengerLiveKitTrack) => {
        liveKitRemoteTracks.add(track)
        assignMediaTargets()
      })

      liveKitRoom.on(RoomEvent.TrackUnsubscribed, (track: MessengerLiveKitTrack) => {
        try {
          track.detach()
        } catch {
          // noop
        }

        liveKitRemoteTracks.delete(track)
        assignMediaTargets()
      })

            liveKitRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant: any, kind: any, topic?: string) => {
        try {
          const str = new TextDecoder().decode(payload)
          handleIncomingDataChannelMessage(str)
        } catch (err) {
          console.error('Failed to handle incoming DataReceived:', err)
        }
      })

      liveKitRoom.on(RoomEvent.Disconnected, () => {
        if (activeCall.value) {
          teardownCall('Соединение прервано')
        }
      })

      await liveKitRoom.connect(response.serverUrl, response.token)

      if (localStream) {
        for (const track of localStream.getTracks()) {
          if (track.kind === 'video' && mode !== 'video') {
            continue
          }
          await liveKitRoom.localParticipant.publishTrack(track)
        }
      }

      callStatusText.value = mode === 'video' ? 'Видеосвязь установлена (LiveKit)' : 'Аудиосвязь установлена (LiveKit)'
      if (mode === 'audio') {
        void startTranscription()
      } else {
        stopTranscription()
      }
    } catch (err) {
      console.error(err)
      callError.value = 'Ошибка серверного соединения (LiveKit).'
      teardownCall('')
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

        if (!conversations.activeConversation.value?.secret) {
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
        if (!localStream) {
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

    if (event.signal.kind === 'answer' && peerConnection) {
      try {
        if (activeCall.value) {
          activeCall.value = {
            ...activeCall.value,
            mode,
          }
        }
        await peerConnection.setRemoteDescription({
          type: 'answer',
          sdp: String(event.signal.payload?.sdp || ''),
        })
        await flushPendingIceCandidates(event.signal.callId, peerConnection)
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
      const remoteDescriptionReady = Boolean(peerConnection?.remoteDescription)

      if (!peerConnection || !remoteDescriptionReady) {
        queueIceCandidate(event.signal.callId, candidate)
        return
      }

      await peerConnection.addIceCandidate(candidate).catch(() => {
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

  function clearError() {
    callError.value = ''
  }

  function clearPermissionHelp() {
    permissionHelp.value = ''
  }

  function reset() {
    clearError()
    clearTranscription()
    clearCallReview()
    analysisPanelOpen.value = false
    teardownCall('')
    clearElements()
  }

  async function renegotiateActiveCall(mode: MessengerCallMode) {
    if (!activeCall.value || !peerConnection || peerConnection.signalingState !== 'stable' || renegotiating.value) {
      callStatusText.value = mode === 'video'
        ? 'Видео будет обновлено, как только сигнализация стабилизируется…'
        : 'Аудиорежим обновится после стабилизации соединения…'
      return false
    }

    renegotiating.value = true
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    await sendSignal(activeCall.value.conversationId, {
      kind: 'offer',
      callId: activeCall.value.callId,
      payload: {
        sdp: offer.sdp,
        type: offer.type,
        mode,
      },
    })
    callStatusText.value = mode === 'video' ? 'Обновляем видеоканал…' : 'Обновляем аудиоканал…'
    return true
  }

  async function enableVideo() {
    if (!activeCall.value) {
      return false
    }

    if (!localStream) {
      await initMedia('video')
    }

    let nextTrack = localStream?.getVideoTracks()[0] || null

    if (!nextTrack) {
      const granted = await ensureMediaAccess('video')
      if (!granted) {
        return false
      }

      const cameraStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
      nextTrack = cameraStream.getVideoTracks()[0] || null
      if (nextTrack && localStream) {
        localStream.addTrack(nextTrack)
      }
    }

    if (!nextTrack || !localStream) {
      return false
    }

    nextTrack.contentHint = 'motion'
    const videoSender = peerConnection?.getSenders().find(sender => sender.track?.kind === 'video') || null

    if (videoSender) {
      await videoSender.replaceTrack(nextTrack)
    } else if (peerConnection) {
      const sender = peerConnection.addTrack(nextTrack, localStream)
      if (callSecurityContext?.active) {
        applySenderCallSecurity(sender)
      }
    } else if (liveKitRoom) {
      try {
        await liveKitRoom.localParticipant.publishTrack(nextTrack)
      } catch (err) {
        console.warn('Failed to publish video track to LiveKit', err)
      }
    }

    controls.value = {
      ...controls.value,
      videoEnabled: true,
    }
    activeCall.value = {
      ...activeCall.value,
      mode: 'video',
    }
    if (viewMode.value !== 'mini') {
      viewMode.value = 'split'
    }
    stopTranscription()
    await refreshVideoInputs()
    syncVideoTrackState(nextTrack)
    assignMediaTargets()
    syncVideoState()
    await renegotiateActiveCall('video')
    return true
  }

  async function disableVideo() {
    if (!activeCall.value || !localStream) {
      return false
    }

    const videoTracks = localStream.getVideoTracks()
    for (const sender of peerConnection?.getSenders() || []) {
      if (sender.track?.kind === 'video') {
        await sender.replaceTrack(null).catch(() => {})
        peerConnection?.removeTrack(sender)
      }
    }

    if (liveKitRoom) {
      try {
        for (const p of Array.from(liveKitRoom.localParticipant.videoTrackPublications.values())) {
          if (p && (p as any).track) {
            await liveKitRoom.localParticipant.unpublishTrack((p as any).track)
          }
        }
      } catch (err) {
        console.warn('Failed to unpublish LiveKit video', err)
      }
    }

    for (const track of videoTracks) {
      localStream.removeTrack(track)
      track.stop()
    }

    controls.value = {
      ...controls.value,
      videoEnabled: false,
    }
    activeCall.value = {
      ...activeCall.value,
      mode: 'audio',
    }
    activeCameraId.value = ''
    assignMediaTargets()
    await renegotiateActiveCall('audio')
    void startTranscription()
    return true
  }

  async function switchCamera() {
    if (!activeCall.value || !localStream || !controls.value.videoEnabled) {
      return false
    }

    callError.value = ''

    const currentTrack = localStream.getVideoTracks()[0] || null
    if (!currentTrack) {
      return await enableVideo()
    }

    const currentSettings = currentTrack.getSettings?.()
    const videoInputs = await refreshVideoInputs()
    const deviceIds = videoInputs
      .map(device => device.deviceId)
      .filter((deviceId): deviceId is string => Boolean(deviceId))
    const currentDeviceId = activeCameraId.value || (typeof currentSettings?.deviceId === 'string' ? currentSettings.deviceId : '')
    const nextFacing: MessengerCallCameraFacing = cameraFacing.value === 'environment' ? 'user' : 'environment'

    const attemptConstraints: MediaTrackConstraints[] = []

    if (deviceIds.length > 1) {
      const currentIndex = currentDeviceId ? deviceIds.indexOf(currentDeviceId) : -1
      const nextDeviceId = deviceIds[(currentIndex + 1 + deviceIds.length) % deviceIds.length]
      if (nextDeviceId) {
        attemptConstraints.push({ deviceId: { exact: nextDeviceId } })
      }
    }

    attemptConstraints.push({ facingMode: { exact: nextFacing } })
    attemptConstraints.push({ facingMode: { ideal: nextFacing } })

    let nextTrack: MediaStreamTrack | null = null

    for (const constraint of attemptConstraints) {
      try {
        const replacementStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: constraint,
        })
        nextTrack = replacementStream.getVideoTracks()[0] || null
        break
      } catch {
        nextTrack = null
      }
    }

    if (!nextTrack) {
      callError.value = 'Не удалось переключить камеру на этом устройстве.'
      return false
    }

    const previousTracks = localStream.getVideoTracks()
    for (const track of previousTracks) {
      localStream.removeTrack(track)
    }

    localStream.addTrack(nextTrack)
    nextTrack.contentHint = 'motion'

    const videoSender = peerConnection?.getSenders().find(sender => sender.track?.kind === 'video') || null
    if (videoSender) {
      await videoSender.replaceTrack(nextTrack)
    } else if (peerConnection) {
      const sender = peerConnection.addTrack(nextTrack, localStream)
      if (callSecurityContext?.active) {
        applySenderCallSecurity(sender)
      }
    }

    for (const track of previousTracks) {
      track.stop()
    }

    syncVideoTrackState(nextTrack)
    await refreshVideoInputs()
    assignMediaTargets()
    syncVideoState()
    await renegotiateActiveCall('video')
    return true
  }

  async function toggleVideo() {
    if (!activeCall.value) {
      return
    }

    callError.value = ''

    try {
      if (controls.value.videoEnabled || activeCall.value.mode === 'video') {
        await disableVideo()
        return
      }

      await enableVideo()
    } catch {
      callError.value = 'Не удалось обновить видеоканал звонка.'
    }
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
    viewMode,
    networkQuality,
    networkHint,
    renegotiating,
    security,
    transcriptionSupported,
    transcriptionActive,
    transcriptionError,
    transcriptionHint,
    transcriptionDraft,
    transcriptionEntries,
    callReview,
    analysisPanelOpen,
    analysisTools,
    selectedAnalysisToolId,
    analysisInterpretations,
    analysisRunning,
    analysisError,
    projectSyncProjectSlug,
    projectSyncPending,
    projectSyncError,
    projectSyncStatus,
    projectTaskSyncPending,
    projectTaskSyncError,
    projectTaskSyncStatus,
    aiAnalysisInterpretations,
    aiAnalysisRunning,
    aiAnalysisError,
    inConversationCall,
    canStartAudioCall,
    canStartVideoCall,
    canSwitchCamera,
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
    setCallViewMode,
    cycleCallViewMode,
    startTranscription,
    stopTranscription,
    clearTranscription,
    clearCallReview,
    syncCallReviewToProject,
    applyCallReviewToProjectSprint,
    openAnalysisPanel,
    closeAnalysisPanel,
    toggleAnalysisPanel,
    runAnalysisTool,
    runAiAnalysisTool,
    toggleVideo,
    switchCamera,
    startOutgoingCall,
    acceptIncomingCall,
    rejectIncomingCall,
    hangupCall,
    handleSignal,
    reset,
  }
}