type MessengerChunkTranscriptionInput = {
  audioBase64: string
  mimeType: string
  language: string
  model?: string
}

type MessengerTranscriptionConfig = {
  MESSENGER_TRANSCRIPTION_ENABLED: boolean
  MESSENGER_TRANSCRIPTION_API_KEY?: string
  MESSENGER_TRANSCRIPTION_API_BASE_URL: string
  MESSENGER_TRANSCRIPTION_MODEL: string
  MESSENGER_TRANSCRIPTION_LANGUAGE: string
  MESSENGER_TRANSCRIPTION_TIMEOUT_MS: number
}

function inferFileExtension(mimeType: string) {
  if (/mp4|m4a/iu.test(mimeType)) {
    return 'm4a'
  }

  if (/mpeg|mp3/iu.test(mimeType)) {
    return 'mp3'
  }

  if (/ogg/iu.test(mimeType)) {
    return 'ogg'
  }

  if (/wav/iu.test(mimeType)) {
    return 'wav'
  }

  return 'webm'
}

function decodeBase64Audio(value: string) {
  return Uint8Array.from(Buffer.from(value, 'base64'))
}

export function isMessengerTranscriptionConfigured(config: MessengerTranscriptionConfig) {
  return Boolean(
    config.MESSENGER_TRANSCRIPTION_ENABLED
    && config.MESSENGER_TRANSCRIPTION_API_KEY?.trim()
    && config.MESSENGER_TRANSCRIPTION_MODEL.trim(),
  )
}

export async function transcribeMessengerAudioChunk(
  config: MessengerTranscriptionConfig,
  input: MessengerChunkTranscriptionInput,
) {
  if (!isMessengerTranscriptionConfigured(config)) {
    throw new Error('TRANSCRIPTION_DISABLED')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, config.MESSENGER_TRANSCRIPTION_TIMEOUT_MS)

  try {
    const bytes = decodeBase64Audio(input.audioBase64)
    const formData = new FormData()
    const file = new File([bytes], `call-chunk.${inferFileExtension(input.mimeType)}`, {
      type: input.mimeType || 'audio/webm',
    })

    formData.append('file', file)
    formData.append('model', input.model?.trim() || config.MESSENGER_TRANSCRIPTION_MODEL)
    formData.append('language', input.language || config.MESSENGER_TRANSCRIPTION_LANGUAGE)
    formData.append('temperature', '0')

    const response = await fetch(`${config.MESSENGER_TRANSCRIPTION_API_BASE_URL.replace(/\/$/, '')}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.MESSENGER_TRANSCRIPTION_API_KEY}`,
      },
      body: formData,
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`TRANSCRIPTION_HTTP_${response.status}`)
    }

    const payload = await response.json().catch(() => null) as { text?: string } | null
    return (payload?.text || '').trim()
  } finally {
    clearTimeout(timeout)
  }
}