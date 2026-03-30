import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

type MessengerChunkTranscriptionInput = {
  audioBase64: string
  mimeType: string
  language: string
  model?: string
}

type MessengerTranscriptionConfig = {
  MESSENGER_TRANSCRIPTION_ENABLED: boolean
  MESSENGER_TRANSCRIPTION_API_KEY?: string
  MESSENGER_TRANSCRIPTION_ALLOW_NO_KEY: boolean
  MESSENGER_TRANSCRIPTION_API_BASE_URL: string
  MESSENGER_TRANSCRIPTION_COMMAND?: string
  MESSENGER_TRANSCRIPTION_MODEL: string
  MESSENGER_TRANSCRIPTION_LANGUAGE: string
  MESSENGER_TRANSCRIPTION_TIMEOUT_MS: number
}

export type MessengerTranscriptionProvider = 'server-default' | 'api'

interface MessengerTranscriptionExecutionOptions {
  provider?: MessengerTranscriptionProvider
}

function buildOpenAiCompatibleUrl(baseUrl: string, endpoint: string) {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const normalizedEndpoint = endpoint.replace(/^\//, '')

  if (/\/v\d+$/iu.test(normalizedBase) || /\/openai\/v\d+$/iu.test(normalizedBase)) {
    return `${normalizedBase}/${normalizedEndpoint}`
  }

  return `${normalizedBase}/v1/${normalizedEndpoint}`
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

export function hasMessengerTranscriptionCommand(config: MessengerTranscriptionConfig) {
  return Boolean(config.MESSENGER_TRANSCRIPTION_COMMAND?.trim())
}

export function hasMessengerTranscriptionHttpBackend(config: MessengerTranscriptionConfig) {
  return Boolean(
    config.MESSENGER_TRANSCRIPTION_API_BASE_URL.trim()
    && config.MESSENGER_TRANSCRIPTION_MODEL.trim()
    && (config.MESSENGER_TRANSCRIPTION_API_KEY?.trim() || config.MESSENGER_TRANSCRIPTION_ALLOW_NO_KEY),
  )
}

function normalizeCommandTranscriptionOutput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  try {
    const payload = JSON.parse(trimmed) as { text?: string, transcription?: string, result?: string }
    return String(payload.text || payload.transcription || payload.result || '').trim() || trimmed
  } catch {
    return trimmed
  }
}

export function isMessengerTranscriptionConfigured(config: MessengerTranscriptionConfig) {
  return Boolean(
    config.MESSENGER_TRANSCRIPTION_ENABLED
    && config.MESSENGER_TRANSCRIPTION_MODEL.trim()
    && (hasMessengerTranscriptionCommand(config) || hasMessengerTranscriptionHttpBackend(config)),
  )
}

async function transcribeMessengerAudioChunkViaCommand(
  config: MessengerTranscriptionConfig,
  input: MessengerChunkTranscriptionInput,
) {
  const command = config.MESSENGER_TRANSCRIPTION_COMMAND?.trim()
  if (!command) {
    throw new Error('TRANSCRIPTION_COMMAND_MISSING')
  }

  const bytes = decodeBase64Audio(input.audioBase64)
  const tempDir = await mkdtemp(join(tmpdir(), 'messenger-call-stt-'))
  const tempFilePath = join(tempDir, `call-chunk.${inferFileExtension(input.mimeType)}`)

  try {
    await writeFile(tempFilePath, bytes)

    const { stdout } = await execFileAsync(
      command,
      [
        tempFilePath,
        input.mimeType || 'audio/webm',
        input.language || config.MESSENGER_TRANSCRIPTION_LANGUAGE,
        input.model?.trim() || config.MESSENGER_TRANSCRIPTION_MODEL,
      ],
      {
        timeout: config.MESSENGER_TRANSCRIPTION_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
        env: {
          ...process.env,
          MESSENGER_TRANSCRIPTION_INPUT_PATH: tempFilePath,
          MESSENGER_TRANSCRIPTION_MIME_TYPE: input.mimeType || 'audio/webm',
          MESSENGER_TRANSCRIPTION_LANGUAGE: input.language || config.MESSENGER_TRANSCRIPTION_LANGUAGE,
          MESSENGER_TRANSCRIPTION_MODEL: input.model?.trim() || config.MESSENGER_TRANSCRIPTION_MODEL,
        },
      },
    )

    return normalizeCommandTranscriptionOutput(String(stdout || ''))
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

async function transcribeMessengerAudioChunkViaHttp(
  config: MessengerTranscriptionConfig,
  input: MessengerChunkTranscriptionInput,
) {
  if (!hasMessengerTranscriptionHttpBackend(config)) {
    throw new Error('TRANSCRIPTION_HTTP_BACKEND_NOT_CONFIGURED')
  }

  const apiKey = config.MESSENGER_TRANSCRIPTION_API_KEY?.trim() || ''
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

    const headers: Record<string, string> = {}
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`
    }

    const response = await fetch(buildOpenAiCompatibleUrl(config.MESSENGER_TRANSCRIPTION_API_BASE_URL, 'audio/transcriptions'), {
      method: 'POST',
      headers,
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

export async function transcribeMessengerAudioChunk(
  config: MessengerTranscriptionConfig,
  input: MessengerChunkTranscriptionInput,
  options: MessengerTranscriptionExecutionOptions = {},
) {
  if (!isMessengerTranscriptionConfigured(config)) {
    throw new Error('TRANSCRIPTION_DISABLED')
  }

  const provider = options.provider === 'api' ? 'api' : 'server-default'
  const commandReady = hasMessengerTranscriptionCommand(config)
  const httpReady = hasMessengerTranscriptionHttpBackend(config)
  let lastError: unknown = null

  if (provider === 'api') {
    if (!httpReady) {
      throw new Error('TRANSCRIPTION_HTTP_BACKEND_NOT_CONFIGURED')
    }

    return await transcribeMessengerAudioChunkViaHttp(config, input)
  }

  if (commandReady) {
    try {
      return await transcribeMessengerAudioChunkViaCommand(config, input)
    } catch (error) {
      lastError = error
      if (!httpReady) {
        throw error
      }
    }
  }

  if (httpReady) {
    return await transcribeMessengerAudioChunkViaHttp(config, input)
  }

  throw lastError instanceof Error ? lastError : new Error('TRANSCRIPTION_DISABLED')
}