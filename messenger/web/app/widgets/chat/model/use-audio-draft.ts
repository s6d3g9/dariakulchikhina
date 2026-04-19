import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref } from 'vue'

export interface MessengerAudioDraftState {
  file: File
  url: string
  duration: number
  trimStart: number
  trimEnd: number
  waveformLevels: number[]
  decodedBuffer: AudioBuffer | null
}

const AUDIO_WAVEFORM_BAR_COUNT = 64
const AUDIO_MIN_TRIM_GAP = 0.35

function createAudioLevelStrip(length = AUDIO_WAVEFORM_BAR_COUNT, base = 0.16) {
  return Array.from({ length }, () => base)
}

function clampAudioValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function useAudioDraft(options: {
  isMessagePending: Ref<boolean>
  hasActiveConversation: Ref<boolean>
  uploadAttachment: (file: File) => Promise<void>
  clearCallError: () => void
  actionError: Ref<string>
}) {
  const { isMessagePending, hasActiveConversation, uploadAttachment, clearCallError, actionError } = options

  const isRecording = ref(false)
  const recordingSeconds = ref(0)
  const recordingLevels = ref<number[]>(createAudioLevelStrip())
  const recordingIntensity = ref(0.12)
  const audioDraft = ref<MessengerAudioDraftState | null>(null)
  const canRecordAudio = ref(false)

  let mediaRecorder: MediaRecorder | null = null
  let mediaStream: MediaStream | null = null
  let recordingTimer: ReturnType<typeof setInterval> | null = null
  let recordingAnimationFrame: number | null = null
  let recordingAudioContext: AudioContext | null = null
  let recordingAnalyser: AnalyserNode | null = null
  let recordingAnalyserSource: MediaStreamAudioSourceNode | null = null
  let discardRecordingDraft = false

  function resetRecordingVisualizer() {
    recordingLevels.value = createAudioLevelStrip()
    recordingIntensity.value = 0.12
  }

  function revokeAudioDraftUrl() {
    if (audioDraft.value?.url.startsWith('blob:')) {
      URL.revokeObjectURL(audioDraft.value.url)
    }
  }

  function clearAudioDraft() {
    revokeAudioDraftUrl()
    audioDraft.value = null
  }

  function stopRecordingVisualizer() {
    if (recordingAnimationFrame !== null) {
      cancelAnimationFrame(recordingAnimationFrame)
      recordingAnimationFrame = null
    }

    recordingAnalyserSource?.disconnect()
    recordingAnalyser?.disconnect()
    recordingAnalyserSource = null
    recordingAnalyser = null

    if (recordingAudioContext) {
      void recordingAudioContext.close().catch(() => {})
      recordingAudioContext = null
    }

    resetRecordingVisualizer()
  }

  function startRecordingVisualizer(stream: MediaStream) {
    if (!import.meta.client || typeof AudioContext === 'undefined') {
      return
    }

    stopRecordingVisualizer()

    recordingAudioContext = new AudioContext()
    recordingAnalyser = recordingAudioContext.createAnalyser()
    recordingAnalyser.fftSize = 128
    recordingAnalyser.smoothingTimeConstant = 0.82
    recordingAnalyserSource = recordingAudioContext.createMediaStreamSource(stream)
    recordingAnalyserSource.connect(recordingAnalyser)

    const samples = new Uint8Array(recordingAnalyser.fftSize)

    const step = () => {
      if (!recordingAnalyser) {
        return
      }

      recordingAnalyser.getByteTimeDomainData(samples)
      let energy = 0
      for (const sample of samples) {
        const centered = (sample - 128) / 128
        energy += centered * centered
      }

      const rms = Math.sqrt(energy / samples.length)
      const nextLevel = clampAudioValue(rms * 3.4, 0.08, 1)
      recordingIntensity.value = nextLevel
      recordingLevels.value = [...recordingLevels.value.slice(1), nextLevel]
      recordingAnimationFrame = requestAnimationFrame(step)
    }

    recordingAnimationFrame = requestAnimationFrame(step)
  }

  async function decodeAudioFile(file: File) {
    if (!import.meta.client || typeof AudioContext === 'undefined') {
      return null
    }

    const context = new AudioContext()

    try {
      const buffer = await file.arrayBuffer()
      return await context.decodeAudioData(buffer.slice(0))
    } catch {
      return null
    } finally {
      void context.close().catch(() => {})
    }
  }

  async function readAudioDuration(url: string) {
    if (!import.meta.client) {
      return 0
    }

    return await new Promise<number>((resolve) => {
      const audio = new Audio()
      audio.preload = 'metadata'
      audio.src = url
      audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0)
      audio.onerror = () => resolve(0)
    })
  }

  function extractWaveformLevels(buffer: AudioBuffer, barCount = AUDIO_WAVEFORM_BAR_COUNT) {
    const channel = buffer.getChannelData(0)
    const chunkSize = Math.max(1, Math.floor(channel.length / barCount))
    const output: number[] = []
    let maxSample = 0

    for (let index = 0; index < barCount; index += 1) {
      const start = index * chunkSize
      const end = Math.min(channel.length, start + chunkSize)
      let peak = 0

      for (let cursor = start; cursor < end; cursor += 1) {
        peak = Math.max(peak, Math.abs(channel[cursor] || 0))
      }

      output.push(peak)
      maxSample = Math.max(maxSample, peak)
    }

    return output.map(value => clampAudioValue(maxSample ? value / maxSample : 0.18, 0.14, 1))
  }

  async function prepareAudioDraft(file: File) {
    clearAudioDraft()

    const url = URL.createObjectURL(file)
    const decodedBuffer = await decodeAudioFile(file)
    const duration = decodedBuffer?.duration || await readAudioDuration(url) || Math.max(recordingSeconds.value, 1)
    const waveformLevels = decodedBuffer ? extractWaveformLevels(decodedBuffer) : createAudioLevelStrip()

    audioDraft.value = {
      file,
      url,
      duration,
      trimStart: 0,
      trimEnd: duration,
      waveformLevels,
      decodedBuffer,
    }
  }

  function encodeTrimmedAudioToWav(buffer: AudioBuffer, startTime: number, endTime: number) {
    const startFrame = Math.floor(startTime * buffer.sampleRate)
    const endFrame = Math.floor(endTime * buffer.sampleRate)
    const frameCount = Math.max(1, endFrame - startFrame)
    const channelCount = Math.min(buffer.numberOfChannels, 2)
    const bytesPerSample = 2
    const blockAlign = channelCount * bytesPerSample
    const byteRate = buffer.sampleRate * blockAlign
    const output = new ArrayBuffer(44 + frameCount * blockAlign)
    const view = new DataView(output)

    const writeString = (offset: number, value: string) => {
      for (let index = 0; index < value.length; index += 1) {
        view.setUint8(offset + index, value.charCodeAt(index))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + frameCount * blockAlign, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, channelCount, true)
    view.setUint32(24, buffer.sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, frameCount * blockAlign, true)

    let offset = 44
    for (let frame = 0; frame < frameCount; frame += 1) {
      for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
        const sourceChannel = buffer.getChannelData(Math.min(channelIndex, buffer.numberOfChannels - 1))
        const sample = clampAudioValue(sourceChannel[startFrame + frame] || 0, -1, 1)
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
        offset += 2
      }
    }

    return new Blob([output], { type: 'audio/wav' })
  }

  async function buildAudioDraftUploadFile() {
    if (!audioDraft.value) {
      throw new Error('NO_AUDIO_DRAFT')
    }

    const { file, decodedBuffer, trimStart, trimEnd, duration } = audioDraft.value
    const normalizedStart = clampAudioValue(trimStart, 0, duration)
    const normalizedEnd = clampAudioValue(trimEnd, normalizedStart + AUDIO_MIN_TRIM_GAP, duration)

    if (!decodedBuffer || normalizedEnd - normalizedStart >= duration - 0.05) {
      return file
    }

    const blob = encodeTrimmedAudioToWav(decodedBuffer, normalizedStart, normalizedEnd)
    const baseName = file.name.replace(/\.[^.]+$/u, '')
    return new File([blob], `${baseName}-trimmed.wav`, { type: 'audio/wav' })
  }

  function updateAudioDraftTrimStart(nextValue: number) {
    if (!audioDraft.value) {
      return
    }

    audioDraft.value.trimStart = clampAudioValue(nextValue, 0, Math.max(audioDraft.value.trimEnd - AUDIO_MIN_TRIM_GAP, 0))
  }

  function updateAudioDraftTrimEnd(nextValue: number) {
    if (!audioDraft.value) {
      return
    }

    audioDraft.value.trimEnd = clampAudioValue(nextValue, Math.min(audioDraft.value.trimStart + AUDIO_MIN_TRIM_GAP, audioDraft.value.duration), audioDraft.value.duration)
  }

  function stopRecordingTimer() {
    if (recordingTimer) {
      clearInterval(recordingTimer)
      recordingTimer = null
    }
  }

  function stopStreamTracks() {
    if (!mediaStream) {
      return
    }

    for (const track of mediaStream.getTracks()) {
      track.stop()
    }

    mediaStream = null
  }

  function pickAudioMimeType() {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ]

    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return ''
    }

    return mimeTypes.find(mimeType => MediaRecorder.isTypeSupported(mimeType)) || ''
  }

  async function toggleAudioRecording() {
    actionError.value = ''
    clearCallError()

    if (!hasActiveConversation.value || isMessagePending.value) {
      return
    }

    if (isRecording.value && mediaRecorder) {
      mediaRecorder.stop()
      return
    }

    if (!canRecordAudio.value) {
      actionError.value = 'Запись аудио недоступна в этом браузере.'
      return
    }

    try {
      clearAudioDraft()
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks: BlobPart[] = []
      const mimeType = pickAudioMimeType()
      mediaRecorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream)
      discardRecordingDraft = false

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      })

      mediaRecorder.addEventListener('stop', async () => {
        stopRecordingTimer()
        stopRecordingVisualizer()
        isRecording.value = false
        const nextMimeType = mediaRecorder?.mimeType || mimeType || 'audio/webm'
        const extension = nextMimeType.includes('ogg') ? 'ogg' : nextMimeType.includes('mp4') ? 'm4a' : 'webm'

        try {
          if (!discardRecordingDraft) {
            const audioBlob = new Blob(chunks, { type: nextMimeType })
            const audioFile = new File([audioBlob], `voice-message-${Date.now()}.${extension}`, { type: nextMimeType })
            await prepareAudioDraft(audioFile)
          }
        } catch {
          actionError.value = 'Не удалось подготовить аудиосообщение.'
        } finally {
          stopStreamTracks()
          mediaRecorder = null
          discardRecordingDraft = false
          recordingSeconds.value = 0
        }
      }, { once: true })

      mediaRecorder.start()
      isRecording.value = true
      recordingSeconds.value = 0
      resetRecordingVisualizer()
      startRecordingVisualizer(mediaStream)
      stopRecordingTimer()
      recordingTimer = setInterval(() => {
        recordingSeconds.value += 1
      }, 1000)
    } catch {
      stopRecordingTimer()
      stopRecordingVisualizer()
      stopStreamTracks()
      mediaRecorder = null
      isRecording.value = false
      actionError.value = 'Не удалось получить доступ к микрофону.'
    }
  }

  async function sendAudioDraft() {
    if (!audioDraft.value) {
      return
    }

    actionError.value = ''

    try {
      const uploadFile = await buildAudioDraftUploadFile()
      await uploadAttachment(uploadFile)
      clearAudioDraft()
    } catch {
      actionError.value = 'Не удалось отправить аудиосообщение.'
    }
  }

  function abortOrClearAudio() {
    if (isRecording.value && mediaRecorder) {
      discardRecordingDraft = true
      mediaRecorder.stop()
      return
    }

    clearAudioDraft()
  }

  function resetAudio() {
    if (isRecording.value && mediaRecorder) {
      discardRecordingDraft = true
      mediaRecorder.stop()
    }

    clearAudioDraft()
    stopRecordingTimer()
    stopRecordingVisualizer()
    stopStreamTracks()
  }

  onMounted(() => {
    canRecordAudio.value = Boolean(
      import.meta.client
      && navigator.mediaDevices
      && typeof navigator.mediaDevices.getUserMedia === 'function'
      && typeof MediaRecorder !== 'undefined',
    )
  })

  onBeforeUnmount(() => {
    stopRecordingTimer()
    stopRecordingVisualizer()
    stopStreamTracks()
    clearAudioDraft()
    mediaRecorder = null
  })

  return {
    isRecording,
    recordingSeconds,
    recordingLevels,
    recordingIntensity,
    audioDraft,
    canRecordAudio,
    toggleAudioRecording,
    sendAudioDraft,
    abortOrClearAudio,
    resetAudio,
    updateAudioDraftTrimStart,
    updateAudioDraftTrimEnd,
    startRecordingVisualizer,
    decodeAudioFile,
    extractWaveformLevels,
    encodeTrimmedAudioToWav,
    clearAudioDraft,
  }
}
