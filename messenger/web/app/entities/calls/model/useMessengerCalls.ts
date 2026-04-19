import { normalizeMessengerProjectRoot } from '../../../utils/messenger-project-root'
import { buildMessengerUrl } from '../../../utils/messenger-url'
import { useCallPeerConnection } from './use-call-peer-connection'

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

type MessengerTranscriptSpeaker = 'you' | 'peer'

interface MessengerCallTranscriptEntry {
  id: string
  speaker: MessengerTranscriptSpeaker
  text: string
  final: boolean
  createdAt: number
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

let liveKitRoom: any = null
let localStream: MediaStream | null = null
let remoteStream: MediaStream | null = null
let localVideoEl: HTMLVideoElement | null = null
let remoteVideoEl: HTMLVideoElement | null = null
let remoteSpeakerVideoEl: HTMLVideoElement | null = null
let remoteAudioEl: HTMLAudioElement | null = null
const liveKitRemoteTracks = new Set<MessengerLiveKitTrack>()
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
const TRANSCRIPT_FILLER_WORDS = ['ээ', 'эм', 'мм', 'ну', 'типа', 'короче', 'как бы', 'вот', 'ага', 'угу']
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

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0?: {
      transcript?: string
    }
  }>
}

type SpeechRecognitionErrorEventLike = {
  error?: string
}

type MessengerAudioOutputElement = HTMLMediaElement & {
  sinkId?: string
  setSinkId?: (sinkId: string) => Promise<void>
}

type SpeechRecognitionCtorLike = new () => {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

let speechRecognition: InstanceType<SpeechRecognitionCtorLike> | null = null
let speechRecognitionRestartTimer: ReturnType<typeof setTimeout> | null = null
let speechRecognitionCurrentDraftId = ''
let transcriptionAnalyserContext: AudioContext | null = null
let transcriptionLocalAnalyser: AnalyserNode | null = null
let transcriptionRemoteAnalyser: AnalyserNode | null = null
let transcriptionLevelSampler: ReturnType<typeof setInterval> | null = null
let transcriptionLastEnergy = { local: 0, remote: 0 }
let transcriptionChunkRecorder: MediaRecorder | null = null
let transcriptionChunkRecorderRestartTimer: ReturnType<typeof setTimeout> | null = null
let transcriptionIsolatedContext: AudioContext | null = null
let transcriptionIsolatedTracks: MediaStreamTrack[] = []
let transcriptionChunkUploadQueue: Promise<void> = Promise.resolve()
let transcriptionChunkSequence = 0
let transcriptionChunkMimeType = ''
let transcriptionServerSessionKey = ''

function resolveSpeechRecognitionCtor(): SpeechRecognitionCtorLike | null {
  if (!import.meta.client) {
    return null
  }

  const maybeCtor = (window as typeof window & {
    SpeechRecognition?: SpeechRecognitionCtorLike
    webkitSpeechRecognition?: SpeechRecognitionCtorLike
  }).SpeechRecognition
    || (window as typeof window & {
      SpeechRecognition?: SpeechRecognitionCtorLike
      webkitSpeechRecognition?: SpeechRecognitionCtorLike
    }).webkitSpeechRecognition

  return typeof maybeCtor === 'function' ? maybeCtor : null
}

function isMobileChromeLikeBrowser() {
  if (!import.meta.client) {
    return false
  }

  const userAgent = navigator.userAgent || ''
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/iu.test(userAgent)
  const isChromeLike = /Chrome\/|CriOS\/|EdgA\/|SamsungBrowser\//iu.test(userAgent)

  return isMobile && isChromeLike
}

function shouldAutoOpenCallAnalysisPanel(mode: MessengerCallMode) {
  if (mode !== 'audio' || !import.meta.client) {
    return false
  }

  return window.matchMedia('(min-width: 980px)').matches
}

function mobileChromeTranscriptionFallbackMessage() {
  return 'Во время звонка мобильный Chrome не даёт одновременно использовать микрофон для WebRTC и Web Speech API. Нужен серверный транскриб или другой браузер.'
}

function matchesAnalysisWordLibrary(text: string, keywords: readonly string[]) {
  return keywords.some(keyword => text.includes(keyword))
}

function readAnalyserEnergy(analyser: AnalyserNode | null) {
  if (!analyser) {
    return 0
  }

  const buffer = new Uint8Array(analyser.fftSize)
  analyser.getByteTimeDomainData(buffer)
  let total = 0

  for (const item of buffer) {
    const normalized = (item - 128) / 128
    total += normalized * normalized
  }

  return Math.sqrt(total / buffer.length)
}

function stopTranscriptionEnergySampler() {
  if (transcriptionLevelSampler) {
    clearInterval(transcriptionLevelSampler)
    transcriptionLevelSampler = null
  }

  transcriptionLocalAnalyser = null
  transcriptionRemoteAnalyser = null

  if (transcriptionAnalyserContext) {
    void transcriptionAnalyserContext.close().catch(() => {})
    transcriptionAnalyserContext = null
  }

  transcriptionLastEnergy = { local: 0, remote: 0 }
}

function normalizeTranscriptText(raw: string) {
  const compact = raw
    .replace(/[\t\n\r]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/([а-яa-z])\1{3,}/gi, '$1$1')
    .trim()

  if (!compact) {
    return ''
  }

  const lower = compact.toLowerCase()
  if (TRANSCRIPT_FILLER_WORDS.includes(lower)) {
    return ''
  }

  return compact
}

function normalizeProjectSyncSlug(value?: string | null) {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '')
}

function cleanTranscriptEntries(entries: MessengerCallTranscriptEntry[]) {
  const cleaned: MessengerCallTranscriptEntry[] = []

  for (const entry of entries) {
    const normalizedText = normalizeTranscriptText(entry.text)
    if (!normalizedText) {
      continue
    }

    const previous = cleaned[cleaned.length - 1]
    if (previous && previous.speaker === entry.speaker && previous.text === normalizedText) {
      continue
    }

    cleaned.push({
      ...entry,
      text: normalizedText,
    })
  }

  return cleaned
}

function buildSummaryFromTranscript(entries: MessengerCallTranscriptEntry[]) {
  if (!entries.length) {
    return 'Недостаточно данных для конспекта.'
  }

  const sourceText = entries.map(entry => `${entry.speaker === 'you' ? 'Вы' : 'Клиент'}: ${entry.text}`).join('\n')
  const lines = sourceText.split('\n').filter(Boolean)
  const keyLines = lines.slice(0, 2).concat(lines.slice(Math.max(2, lines.length - 4)))
  const actionPatterns = /нужно|надо|сделать|подготов|соглас|отправ|срок|дедлайн|бюджет|стоим|договор/iu
  const actionItems = lines.filter(line => actionPatterns.test(line)).slice(0, 5)

  const summaryParts = [
    'Краткий конспект:',
    ...keyLines.map(line => `- ${line}`),
  ]

  if (actionItems.length) {
    summaryParts.push('')
    summaryParts.push('Договорённости / задачи:')
    summaryParts.push(...actionItems.map(line => `- ${line}`))
  }

  return summaryParts.join('\n')
}

function buildCleanTranscript(entries: MessengerCallTranscriptEntry[]) {
  return entries
    .map(entry => `${entry.speaker === 'you' ? 'Вы' : 'Собеседник'}: ${entry.text}`)
    .join('\n')
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
  const transcriptionSupported = useState<boolean>('messenger-call-transcription-supported', () => Boolean(supportsServerTranscriptionBackend() || resolveSpeechRecognitionCtor()))
  const transcriptionActive = useState<boolean>('messenger-call-transcription-active', () => false)
  const transcriptionError = useState<string>('messenger-call-transcription-error', () => '')
  const transcriptionDraft = useState<string>('messenger-call-transcription-draft', () => '')
  const transcriptionEntries = useState<MessengerCallTranscriptEntry[]>('messenger-call-transcription-entries', () => [])
  const transcriptionHint = useState<string>('messenger-call-transcription-hint', () => (
    supportsServerTranscriptionBackend()
      ? 'По умолчанию используется серверная транскрибация звонка.'
      : resolveSpeechRecognitionCtor()
        ? 'Доступен браузерный fallback для транскрибации звонка.'
        : 'Браузер не поддерживает транскрибацию звонка.'
  ))
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

  const pc = useCallPeerConnection({
    callStatusText,
    renegotiating,
    callError,
    getLocalStream: () => localStream,
    getRemoteStream: () => remoteStream,
    setRemoteStream: (stream) => { remoteStream = stream },
    applySenderCallSecurity,
    applyReceiverCallSecurity,
    assignMediaTargets,
    setupDataChannel: setupPeerDataChannel,
    sendSignal,
    setNetworkState,
    startTranscriptionEnergySampler,
  })
  const { buildPeerConnection, resetPeerConnection, queueIceCandidate, flushPendingIceCandidates, getPeerDataChannel } = pc

  if (import.meta.client) {
    let transcriptionSyncTimer: ReturnType<typeof setTimeout> | null = null
    let transcriptionSyncPending = false

    const sendTranscriptionSync = () => {
      transcriptionSyncPending = false
      if (!transcriptionActive.value) return
      
      const payload = JSON.stringify({
        type: 'transcription-sync',
        draft: transcriptionDraft.value,
        entries: transcriptionEntries.value
      })

      const dataChannel = getPeerDataChannel()
      if (dataChannel?.readyState === 'open') {
        try {
          dataChannel.send(payload)
        } catch {}
      }
      
      if (liveKitRoom) {
        try {
          const dataBuffer = new TextEncoder().encode(payload)
          liveKitRoom.localParticipant.publishData(dataBuffer, { reliable: true })
        } catch {}
      }
    }

    watch([transcriptionDraft, transcriptionEntries], () => {
      if (!transcriptionSyncTimer) {
        // Send immediately on first change
        sendTranscriptionSync()
        // Lock sending for the next 250ms (throttle)
        transcriptionSyncTimer = setTimeout(() => {
          transcriptionSyncTimer = null
          // If changes accumulated during the cooldown, flush them immediately
          if (transcriptionSyncPending) {
            sendTranscriptionSync()
          }
        }, 250)
      } else {
        // Just mark that we have a pending sync if within cooldown
        transcriptionSyncPending = true
      }
    }, { deep: true })
  }

  function handleIncomingDataChannelMessage(data: string) {
    try {
      const payload = JSON.parse(data)
      if (payload.type === 'transcription-sync') {
        if (typeof payload.draft === 'string' && !transcriptionActive.value) {
          transcriptionDraft.value = payload.draft
        }
        if (Array.isArray(payload.entries)) {
          const transformed = payload.entries.map((e: any) => ({
            ...e,
            speaker: e.speaker === 'you' ? 'peer' : (e.speaker === 'peer' ? 'you' : (e.speaker === auth.user.value?.id ? 'you' : 'peer'))
          }))

          if (!transcriptionActive.value) {
            transcriptionEntries.value = transformed
          } else {
            const existingMap = new Map(transcriptionEntries.value.map(x => [x.id, x]))
            let changed = false
            
            for (const item of transformed) {
              if (item.speaker === 'you' && speechRecognition) continue
              
              const existing = existingMap.get(item.id)
              if (!existing) {
                existingMap.set(item.id, item)
                changed = true
              } else if (existing.text !== item.text || existing.final !== item.final) {
                existing.text = item.text
                existing.final = item.final
                changed = true
              }
            }
            
            if (changed) {
              const combined = Array.from(existingMap.values()).sort((a, b) => a.createdAt - b.createdAt)
              transcriptionEntries.value = combined.slice(Math.max(0, combined.length - 120))
            }
          }
        }
      }
    } catch {}
  }

  function setupPeerDataChannel(channel: RTCDataChannel) {
    channel.onmessage = (event) => {
      handleIncomingDataChannelMessage(event.data)
    }
    channel.onopen = () => {
      if (transcriptionActive.value) {
        try {
          channel.send(JSON.stringify({
            type: 'transcription-sync',
            draft: transcriptionDraft.value,
            entries: transcriptionEntries.value
          }))
        } catch {}
      }
    }
  }

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

  function supportsServerTranscriptionBackend() {
    return Boolean(
      runtimeConfig.public.messengerServerTranscriptionEnabled
      && import.meta.client
      && typeof MediaRecorder !== 'undefined'
      && auth.token.value,
    )
  }

  function canRunServerCallTranscription() {
    return Boolean(
      supportsServerTranscriptionBackend()
      && activeCall.value?.mode === 'audio'
      && localStream?.getAudioTracks().length,
    )
  }

  function shouldPreferServerCallTranscription() {
    if (canRunBrowserSpeechRecognition()) return false
    return Boolean(canRunServerCallTranscription())
  }

  function pickServerTranscriptionMimeType() {
    if (!import.meta.client || typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return ''
    }

    const preferredTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ]

    return preferredTypes.find(type => MediaRecorder.isTypeSupported(type)) || ''
  }

  function canRunBrowserSpeechRecognition() {
    if (!resolveSpeechRecognitionCtor()) {
      return false
    }

    if (activeCall.value?.mode === 'audio' && isMobileChromeLikeBrowser()) {
      return false
    }

    return true
  }

  function syncTranscriptionSupportState() {
    if (shouldPreferServerCallTranscription()) {
      transcriptionSupported.value = true
      transcriptionHint.value = transcriptionActive.value
        ? 'Серверная транскрибация активна. Распознается ваш микрофон.'
        : 'По умолчанию для звонка будет использоваться серверная транскрибация.'
      return
    }

    const browserSpeechAvailable = Boolean(resolveSpeechRecognitionCtor())

    if (!browserSpeechAvailable) {
      transcriptionSupported.value = false
      transcriptionHint.value = supportsServerTranscriptionBackend()
        ? 'Серверная транскрибация станет доступна после старта аудиозвонка.'
        : 'Транскрибация недоступна в этом браузере.'
      return
    }

    if (activeCall.value?.mode === 'audio' && isMobileChromeLikeBrowser()) {
      transcriptionSupported.value = supportsServerTranscriptionBackend()
      transcriptionHint.value = supportsServerTranscriptionBackend()
        ? 'Во время звонка мобильный Chrome будет использовать серверную транскрибацию.'
        : mobileChromeTranscriptionFallbackMessage()
      return
    }

    transcriptionSupported.value = true
    transcriptionHint.value = transcriptionActive.value
      ? 'Браузерная транскрибация активна. Реплики обновляются в реальном времени.'
      : supportsServerTranscriptionBackend()
        ? 'Серверный транскриб используется по умолчанию. Браузерный fallback тоже доступен.'
        : 'Доступен браузерный fallback для транскрибации звонка.'
  }

  function clearTranscription() {
    transcriptionEntries.value = []
    transcriptionDraft.value = ''
    transcriptionError.value = ''
  }

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

  function appendTranscriptionEntry(text: string, options?: { id?: string; final?: boolean; speaker?: MessengerTranscriptSpeaker }) {
    const normalized = text.trim()
    if (!normalized) {
      return
    }

    const genId = options?.id || (typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15))

    const nextEntry: MessengerCallTranscriptEntry = {
      id: genId,
      speaker: options?.speaker || 'you',
      text: normalized,
      final: options?.final ?? true,
      createdAt: Date.now(),
    }

    const existingIdx = transcriptionEntries.value.findIndex(x => x.id === genId)
    let nextEntries = [...transcriptionEntries.value]
    if (existingIdx !== -1) {
      nextEntries[existingIdx] = nextEntry
    } else {
      nextEntries.push(nextEntry)
    }
    
    transcriptionEntries.value = nextEntries.slice(Math.max(0, nextEntries.length - 120))
  }

  function resolveTranscriptSpeaker() {
    if (!controls.value.microphoneEnabled) {
      return 'peer'
    }

    return transcriptionLastEnergy.remote > (transcriptionLastEnergy.local * 1.12) ? 'peer' : 'you'
  }

  function startTranscriptionEnergySampler() {
    if (!import.meta.client || (!localStream && !remoteStream)) {
      return
    }

    const isMobile = /Android|iPhone|iPad|iPod|Mobile/iu.test(navigator.userAgent || '')
    if (isMobile) {
      return
    }

    stopTranscriptionEnergySampler()

    const Ctor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) {
      return
    }

    try {
      transcriptionAnalyserContext = new Ctor()

      if (localStream?.getAudioTracks().length) {
        transcriptionLocalAnalyser = transcriptionAnalyserContext.createAnalyser()
        transcriptionLocalAnalyser.fftSize = 1024
        const localSource = transcriptionAnalyserContext.createMediaStreamSource(new MediaStream(localStream.getAudioTracks()))
        localSource.connect(transcriptionLocalAnalyser)
      }

      if (remoteStream?.getAudioTracks().length) {
        transcriptionRemoteAnalyser = transcriptionAnalyserContext.createAnalyser()
        transcriptionRemoteAnalyser.fftSize = 1024
        const remoteSource = transcriptionAnalyserContext.createMediaStreamSource(new MediaStream(remoteStream.getAudioTracks()))
        remoteSource.connect(transcriptionRemoteAnalyser)
      }

      transcriptionLevelSampler = setInterval(() => {
        transcriptionLastEnergy = {
          local: readAnalyserEnergy(transcriptionLocalAnalyser),
          remote: readAnalyserEnergy(transcriptionRemoteAnalyser),
        }
      }, 220)
    } catch {
      stopTranscriptionEnergySampler()
    }
  }

  function stopTranscription() {
    transcriptionServerSessionKey = ''

    if (transcriptionChunkRecorderRestartTimer) {
      clearTimeout(transcriptionChunkRecorderRestartTimer)
      transcriptionChunkRecorderRestartTimer = null
    }

    if (transcriptionChunkRecorder) {
      const recorder = transcriptionChunkRecorder
      transcriptionChunkRecorder = null
      recorder.ondataavailable = null
      recorder.onerror = null
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch {
          // noop
        }
      }
    }

    if (transcriptionIsolatedContext) {
      try {
        transcriptionIsolatedContext.close()
      } catch {
        // noop
      }
      transcriptionIsolatedContext = null
    }

    try {
      transcriptionIsolatedTracks.forEach(t => t.stop())
    } catch {}
    transcriptionIsolatedTracks = []

    transcriptionChunkUploadQueue = Promise.resolve()
    transcriptionChunkSequence = 0
    transcriptionChunkMimeType = ''

    if (speechRecognitionRestartTimer) {
      clearTimeout(speechRecognitionRestartTimer)
      speechRecognitionRestartTimer = null
    }

    if (speechRecognition) {
      speechRecognition.onresult = null
      speechRecognition.onerror = null
      speechRecognition.onend = null
      try {
        speechRecognition.abort()
      } catch {
        // noop
      }
      speechRecognition = null
    }

    transcriptionActive.value = false
    transcriptionDraft.value = ''
    stopTranscriptionEnergySampler()
    syncTranscriptionSupportState()
  }

  async function uploadServerTranscriptionChunk(blob: Blob, sequence: number, sessionKey: string, conversationId: string, callId: string) {
    const buffer = new Uint8Array(await blob.arrayBuffer())
    const response = await auth.request<{ text?: string }>(`/conversations/${conversationId}/calls/${callId}/transcription`, {
      method: 'POST',
      body: {
        audioBase64: encodeCallBase64(buffer),
        mimeType: transcriptionChunkMimeType || blob.type || 'audio/webm',
        sequence,
        provider: settingsModel.runtimeTranscriptionProvider.value,
      },
    })

    if (sessionKey !== transcriptionServerSessionKey) {
      return
    }

    const normalizedText = String(response.text || '').trim()
    transcriptionDraft.value = ''
    if (normalizedText) {
      appendTranscriptionEntry(normalizedText, { speaker: 'you', final: true })
    }
  }

  function startServerCallTranscription() {
    if (liveKitRoom) {
      // LiveKit uses backend STT bot attached to the SFU, no client-side chunk pushing needed
      transcriptionActive.value = true
      return true
    }

    if (!canRunServerCallTranscription() || !activeCall.value || !localStream) {
      transcriptionError.value = 'Серверная транскрибация пока недоступна для этого звонка.'
      return false
    }

    stopTranscription()
    startTranscriptionEnergySampler()

    const sessionKey = `${activeCall.value.callId}:${Date.now()}`
    const conversationId = activeCall.value.conversationId
    const callId = activeCall.value.callId
    transcriptionServerSessionKey = sessionKey

    const mimeType = pickServerTranscriptionMimeType()
    const isMobileSafari = /iPhone|iPad|iPod/iu.test(navigator.userAgent || '')
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/iu.test(navigator.userAgent || '')

    let stream: MediaStream = localStream

    if (!isMobile) {
      transcriptionIsolatedTracks = localStream.getAudioTracks().map(t => t.clone())
      stream = new MediaStream(transcriptionIsolatedTracks)
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        try {
          transcriptionIsolatedContext = new AudioContextClass()
          const source = transcriptionIsolatedContext.createMediaStreamSource(stream)
          const dest = transcriptionIsolatedContext.createMediaStreamDestination()
          source.connect(dest)
          stream = dest.stream
        } catch {
          transcriptionIsolatedContext = null
        }
      }
    }

    transcriptionChunkSequence = 0
    transcriptionError.value = ''
    transcriptionDraft.value = ''

    function cycleRecording() {
      if (sessionKey !== transcriptionServerSessionKey) {
        return
      }

      if (!stream.getAudioTracks().length) {
        transcriptionError.value = 'Нет доступных аудиоканалов для транскрибации.'
        return
      }

      let recorder: MediaRecorder
      try {
        recorder = mimeType
          ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 24000 })
          : new MediaRecorder(stream)
      } catch {
        try {
          recorder = new MediaRecorder(stream)
        } catch {
          transcriptionServerSessionKey = ''
          transcriptionChunkRecorder = null
          transcriptionError.value = 'Серверная транскрибация не поддерживается вашим устройством.'
          return
        }
      }

      transcriptionChunkRecorder = recorder
      transcriptionChunkMimeType = recorder.mimeType || mimeType || 'audio/webm'

      recorder.ondataavailable = (event) => {
        if (!event.data || event.data.size <= 0) {
          return
        }

        const sequence = transcriptionChunkSequence
        transcriptionChunkSequence += 1
        transcriptionDraft.value = 'Сервер распознаёт вашу речь…'

        transcriptionChunkUploadQueue = transcriptionChunkUploadQueue
          .then(async () => {
            await uploadServerTranscriptionChunk(event.data, sequence, sessionKey, conversationId, callId)
          })
          .catch(() => {
            if (sessionKey !== transcriptionServerSessionKey) {
              return
            }

            transcriptionDraft.value = ''
            transcriptionError.value = 'Серверная транскрибация недоступна. Проверьте локальный STT backend.'
          })
      }

      recorder.onerror = () => {
        if (sessionKey !== transcriptionServerSessionKey) {
          return
        }

        transcriptionError.value = 'Не удалось подготовить аудиопоток для серверной транскрибации.'
      }

      try {
        recorder.start()
        transcriptionActive.value = true
        transcriptionHint.value = 'Серверная транскрибация активна. Распознается ваш микрофон.'
      } catch {
        transcriptionServerSessionKey = ''
        transcriptionChunkRecorder = null
        transcriptionDraft.value = ''
        transcriptionError.value = 'Не удалось запустить серверную транскрибацию.'
        return
      }

      transcriptionChunkRecorderRestartTimer = setTimeout(() => {
        if (sessionKey === transcriptionServerSessionKey && transcriptionChunkRecorder === recorder) {
          cycleRecording()
          
          setTimeout(() => {
            try {
              if (recorder.state !== 'inactive') {
                recorder.stop()
              }
            } catch {
              // noop
            }
          }, 350)
        }
      }, 7500)
    }

    cycleRecording()
    return true
  }

  function startTranscription() {
    syncTranscriptionSupportState()

    const isMobile = /Android|iPhone|iPad|iPod|Mobile/iu.test(navigator.userAgent || '')

    if (!activeCall.value || activeCall.value.mode !== 'audio') {
      stopTranscription()
      return false
    }

    if (shouldPreferServerCallTranscription()) {
      const serverStarted = startServerCallTranscription()
      if (serverStarted) {
        return true
      }

      if (isMobile) {
        transcriptionError.value = 'Сервер STT недоступен, а браузерная транскрибация отключена на мобильных для защиты звонка.'
        return false
      }

      if (!canRunBrowserSpeechRecognition()) {
        syncTranscriptionSupportState()
        return false
      }

      transcriptionError.value = ''
    }

    if (isMobile) {
      transcriptionError.value = 'На мобильных устройствах без серверного STT транскрибация отключена.'
      return false
    }

    if (!canRunBrowserSpeechRecognition()) {
      transcriptionError.value = isMobileChromeLikeBrowser()
        ? mobileChromeTranscriptionFallbackMessage()
        : 'Для транскрибации нужен Chrome/Edge/Safari с поддержкой Web Speech API.'
      return false
    }

    const Ctor = resolveSpeechRecognitionCtor()
    if (!Ctor) {
      transcriptionError.value = 'Web Speech API недоступен в этом браузере.'
      return false
    }

    stopTranscription()
    startTranscriptionEnergySampler()

    transcriptionError.value = ''
    syncTranscriptionSupportState()

    speechRecognition = new Ctor()
    speechRecognition.continuous = true
    speechRecognition.interimResults = true
    speechRecognition.lang = 'ru-RU'
    speechRecognition.onresult = (event) => {
      let interim = ''
      let finalAdded = false

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (!result) continue
        const transcriptText = String(result[0]?.transcript || '').trim()

        if (!transcriptText) {
          continue
        }

        if (result.isFinal) {
          const resolveId = speechRecognitionCurrentDraftId
          appendTranscriptionEntry(transcriptText, { id: resolveId, speaker: resolveTranscriptSpeaker(), final: true })
          finalAdded = true
        } else {
          interim += `${transcriptText} `
        }
      }

      const normalizedInterim = interim.trim()

      if (normalizedInterim) {
        if (!speechRecognitionCurrentDraftId) {
          speechRecognitionCurrentDraftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        }
        
        const existingIdx = transcriptionEntries.value.findIndex(x => x.id === speechRecognitionCurrentDraftId)
        if (existingIdx !== -1) {
          transcriptionEntries.value[existingIdx]!.text = normalizedInterim
          transcriptionEntries.value[existingIdx]!.createdAt = Date.now()
        } else {
          transcriptionEntries.value.push({
            id: speechRecognitionCurrentDraftId,
            speaker: resolveTranscriptSpeaker(),
            text: normalizedInterim,
            final: false,
            createdAt: Date.now()
          })
        }
      } else if (!finalAdded && speechRecognitionCurrentDraftId) {
        transcriptionEntries.value = transcriptionEntries.value.filter(x => x.id !== speechRecognitionCurrentDraftId)
        speechRecognitionCurrentDraftId = ''
      }
      
      if (finalAdded) {
        speechRecognitionCurrentDraftId = ''
      }
    }
    speechRecognition.onerror = (event) => {
      const errorCode = String(event.error || '')
      if (errorCode === 'not-allowed') {
        transcriptionError.value = 'Браузер запретил доступ к распознаванию речи. Разрешите микрофон в настройках сайта.'
      } else if (errorCode === 'audio-capture') {
        transcriptionError.value = isMobileChromeLikeBrowser()
          ? mobileChromeTranscriptionFallbackMessage()
          : 'Не удалось получить аудио для транскрибации.'
      } else {
        transcriptionError.value = 'Транскрибация временно недоступна. Пытаемся переподключиться.'
      }
    }
    speechRecognition.onend = () => {
      if (!activeCall.value || activeCall.value.mode !== 'audio') {
        transcriptionActive.value = false
        return
      }

      speechRecognitionRestartTimer = setTimeout(() => {
        speechRecognitionRestartTimer = null
        void startTranscription()
      }, 280)
    }

    try {
      speechRecognition.start()
      transcriptionActive.value = true
      syncTranscriptionSupportState()
      return true
    } catch {
      transcriptionActive.value = false
      transcriptionError.value = isMobileChromeLikeBrowser()
        ? mobileChromeTranscriptionFallbackMessage()
        : 'Не удалось запустить транскрибацию. Попробуйте ещё раз.'
      syncTranscriptionSupportState()
      return false
    }
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

    if (event.signal.kind === 'answer' && pc.getPeerConnection()) {
      try {
        if (activeCall.value) {
          activeCall.value = {
            ...activeCall.value,
            mode,
          }
        }
        await pc.getPeerConnection()!.setRemoteDescription({
          type: 'answer',
          sdp: String(event.signal.payload?.sdp || ''),
        })
        await flushPendingIceCandidates(event.signal.callId, pc.getPeerConnection()!)
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
      const currentPc = pc.getPeerConnection()
      const remoteDescriptionReady = Boolean(currentPc?.remoteDescription)

      if (!currentPc || !remoteDescriptionReady) {
        queueIceCandidate(event.signal.callId, candidate)
        return
      }

      await currentPc.addIceCandidate(candidate).catch(() => {
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
    const currentPc = pc.getPeerConnection()
    if (!activeCall.value || !currentPc || currentPc.signalingState !== 'stable' || renegotiating.value) {
      callStatusText.value = mode === 'video'
        ? 'Видео будет обновлено, как только сигнализация стабилизируется…'
        : 'Аудиорежим обновится после стабилизации соединения…'
      return false
    }

    renegotiating.value = true
    const offer = await currentPc.createOffer()
    await currentPc.setLocalDescription(offer)
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
    const enableVideoPc = pc.getPeerConnection()
    const videoSender = enableVideoPc?.getSenders().find(sender => sender.track?.kind === 'video') || null

    if (videoSender) {
      await videoSender.replaceTrack(nextTrack)
    } else if (enableVideoPc) {
      const sender = enableVideoPc.addTrack(nextTrack, localStream)
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

    const disableVideoPc = pc.getPeerConnection()
    const videoTracks = localStream.getVideoTracks()
    for (const sender of disableVideoPc?.getSenders() || []) {
      if (sender.track?.kind === 'video') {
        await sender.replaceTrack(null).catch(() => {})
        disableVideoPc?.removeTrack(sender)
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

    const switchCameraPc = pc.getPeerConnection()
    const videoSender = switchCameraPc?.getSenders().find(sender => sender.track?.kind === 'video') || null
    if (videoSender) {
      await videoSender.replaceTrack(nextTrack)
    } else if (switchCameraPc) {
      const sender = switchCameraPc.addTrack(nextTrack, localStream)
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

  watch([
    () => activeCall.value?.mode || null,
    () => transcriptionActive.value,
  ], () => {
    syncTranscriptionSupportState()
  }, { immediate: true })

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