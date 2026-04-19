import type { Ref } from 'vue'
import { useCallTranscriptionSync } from './use-call-transcription-sync'

export type MessengerTranscriptSpeaker = 'you' | 'peer'

export interface MessengerCallTranscriptEntry {
  id: string
  speaker: MessengerTranscriptSpeaker
  text: string
  final: boolean
  createdAt: number
}

interface CallTranscriptionActiveCall {
  callId: string
  conversationId: string
  mode: 'audio' | 'video'
}

interface CallTranscriptionControls {
  microphoneEnabled: boolean
}

export interface UseCallTranscriptionDeps {
  activeCall: Ref<CallTranscriptionActiveCall | null>
  controls: Ref<CallTranscriptionControls>
  authRequest: <T>(path: string, options?: Parameters<typeof $fetch<T>>[1]) => Promise<T>
  authToken: Ref<string | null>
  authUserId: Ref<string | null>
  isServerTranscriptionEnabled: () => boolean
  getTranscriptionProvider: () => string
  getLocalStream: () => MediaStream | null
  getRemoteStream: () => MediaStream | null
  getLiveKitRoom: () => any
}

const TRANSCRIPT_FILLER_WORDS = ['ээ', 'эм', 'мм', 'ну', 'типа', 'короче', 'как бы', 'вот', 'ага', 'угу']

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

function mobileChromeTranscriptionFallbackMessage() {
  return 'Во время звонка мобильный Chrome не даёт одновременно использовать микрофон для WebRTC и Web Speech API. Нужен серверный транскриб или другой браузер.'
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

function stopTranscriptionEnergySamplerInternal() {
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

export function cleanTranscriptEntries(entries: MessengerCallTranscriptEntry[]) {
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

export function buildSummaryFromTranscript(entries: MessengerCallTranscriptEntry[]) {
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

export function buildCleanTranscript(entries: MessengerCallTranscriptEntry[]) {
  return entries
    .map(entry => `${entry.speaker === 'you' ? 'Вы' : 'Собеседник'}: ${entry.text}`)
    .join('\n')
}

function encodeCallBase64(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''

  for (const value of bytes) {
    binary += String.fromCharCode(value)
  }

  return btoa(binary)
}

export function useCallTranscription(deps: UseCallTranscriptionDeps) {
  const { activeCall, controls, authRequest, authToken, authUserId } = deps

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

  const sync = useCallTranscriptionSync({
    transcriptionActive,
    transcriptionDraft,
    transcriptionEntries,
    authUserId,
    isOwnSpeechRecognitionRunning: () => speechRecognition !== null,
    getLiveKitRoom: deps.getLiveKitRoom,
  })

  function supportsServerTranscriptionBackend() {
    return Boolean(
      deps.isServerTranscriptionEnabled()
      && import.meta.client
      && typeof MediaRecorder !== 'undefined'
      && authToken.value,
    )
  }

  function canRunServerCallTranscription() {
    return Boolean(
      supportsServerTranscriptionBackend()
      && activeCall.value?.mode === 'audio'
      && deps.getLocalStream()?.getAudioTracks().length,
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
    const nextEntries = [...transcriptionEntries.value]
    if (existingIdx !== -1) {
      nextEntries[existingIdx] = nextEntry
    } else {
      nextEntries.push(nextEntry)
    }

    transcriptionEntries.value = nextEntries.slice(Math.max(0, nextEntries.length - 120))
  }

  function resolveTranscriptSpeaker(): MessengerTranscriptSpeaker {
    if (!controls.value.microphoneEnabled) {
      return 'peer'
    }

    return transcriptionLastEnergy.remote > (transcriptionLastEnergy.local * 1.12) ? 'peer' : 'you'
  }

  function startTranscriptionEnergySampler() {
    const localStream = deps.getLocalStream()
    const remoteStream = deps.getRemoteStream()

    if (!import.meta.client || (!localStream && !remoteStream)) {
      return
    }

    const isMobile = /Android|iPhone|iPad|iPod|Mobile/iu.test(navigator.userAgent || '')
    if (isMobile) {
      return
    }

    stopTranscriptionEnergySamplerInternal()

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
      stopTranscriptionEnergySamplerInternal()
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
    stopTranscriptionEnergySamplerInternal()
    syncTranscriptionSupportState()
  }

  async function uploadServerTranscriptionChunk(blob: Blob, sequence: number, sessionKey: string, conversationId: string, callId: string) {
    const buffer = new Uint8Array(await blob.arrayBuffer())
    const response = await authRequest<{ text?: string }>(`/conversations/${conversationId}/calls/${callId}/transcription`, {
      method: 'POST',
      body: {
        audioBase64: encodeCallBase64(buffer),
        mimeType: transcriptionChunkMimeType || blob.type || 'audio/webm',
        sequence,
        provider: deps.getTranscriptionProvider(),
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
    if (deps.getLiveKitRoom()) {
      // LiveKit uses backend STT bot attached to the SFU, no client-side chunk pushing needed
      transcriptionActive.value = true
      return true
    }

    const localStream = deps.getLocalStream()
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
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/iu.test(navigator.userAgent || '')

    let stream: MediaStream = localStream

    if (!isMobile) {
      transcriptionIsolatedTracks = localStream.getAudioTracks().map(t => t.clone())
      stream = new MediaStream(transcriptionIsolatedTracks)

      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
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

  function startTranscription(): boolean {
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
            createdAt: Date.now(),
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

  watch([
    () => activeCall.value?.mode || null,
    () => transcriptionActive.value,
  ], () => {
    syncTranscriptionSupportState()
  }, { immediate: true })

  return {
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
    setupPeerDataChannel: sync.setupPeerDataChannel,
    closePeerDataChannel: sync.closePeerDataChannel,
    handleIncomingDataChannelMessage: sync.handleIncomingDataChannelMessage,
  }
}
