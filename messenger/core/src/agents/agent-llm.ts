import { readMessengerConfig } from '../config.ts'

export interface MessengerAgentLlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface MessengerAgentLlmOptions {
  model?: string
  apiKey?: string
}

interface OllamaChatPayload {
  message?: {
    content?: string
  }
}

function buildOpenAiCompatibleUrl(baseUrl: string, endpoint: string) {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const normalizedEndpoint = endpoint.replace(/^\//, '')

  if (/\/v\d+$/iu.test(normalizedBase) || /\/openai\/v\d+$/iu.test(normalizedBase)) {
    return `${normalizedBase}/${normalizedEndpoint}`
  }

  return `${normalizedBase}/v1/${normalizedEndpoint}`
}

function buildOllamaNativeUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, '')}/api/chat`
}

function shouldTryNativeOllamaFallback(baseUrl: string, apiKey: string) {
  return !apiKey && /(^https?:\/\/[^\s]+:11434(?:\/|$))|ollama|localhost:11434|127\.0\.0\.1:11434/iu.test(baseUrl)
}

async function callOpenAiCompatibleBackend(
  baseUrl: string,
  messages: MessengerAgentLlmMessage[],
  options: MessengerAgentLlmOptions,
  apiKey: string,
  timeoutMs: number,
  temperature: number,
  defaultModel: string,
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  const response = await fetch(buildOpenAiCompatibleUrl(baseUrl, 'chat/completions'), {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: options.model?.trim() || defaultModel,
      messages,
      temperature,
      max_tokens: 700,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`MESSENGER_AGENT_LLM_ERROR_${response.status}:${errText.slice(0, 240)}`)
  }

  const payload = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }

  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('MESSENGER_AGENT_EMPTY_RESPONSE')
  }

  return content
}

async function callNativeOllamaBackend(
  baseUrl: string,
  messages: MessengerAgentLlmMessage[],
  options: MessengerAgentLlmOptions,
  timeoutMs: number,
  temperature: number,
  defaultModel: string,
) {
  const response = await fetch(buildOllamaNativeUrl(baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: options.model?.trim() || defaultModel,
      messages,
      stream: false,
      think: false,
      options: {
        temperature,
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`MESSENGER_AGENT_OLLAMA_ERROR_${response.status}:${errText.slice(0, 240)}`)
  }

  const payload = await response.json() as OllamaChatPayload
  const content = payload.message?.content?.trim()
  if (!content) {
    throw new Error('MESSENGER_AGENT_OLLAMA_EMPTY_RESPONSE')
  }

  return content
}

export function isMessengerAgentLlmConfigured(options: MessengerAgentLlmOptions = {}) {
  const config = readMessengerConfig()
  const apiKey = options.apiKey?.trim() || config.MESSENGER_AGENT_API_KEY?.trim() || ''
  const model = options.model?.trim() || config.MESSENGER_AGENT_MODEL.trim()

  return Boolean(model && (apiKey || config.MESSENGER_AGENT_ALLOW_NO_KEY))
}

export async function callMessengerAgentModel(
  messages: MessengerAgentLlmMessage[],
  options: MessengerAgentLlmOptions = {},
) {
  const config = readMessengerConfig()
  const apiKey = options.apiKey?.trim() || config.MESSENGER_AGENT_API_KEY?.trim() || ''
  const baseUrl = config.MESSENGER_AGENT_API_BASE_URL

  if (!isMessengerAgentLlmConfigured(options)) {
    throw new Error('MESSENGER_AGENT_LLM_NOT_CONFIGURED')
  }

  try {
    return await callOpenAiCompatibleBackend(
      baseUrl,
      messages,
      options,
      apiKey,
      config.MESSENGER_AGENT_TIMEOUT_MS,
      config.MESSENGER_AGENT_TEMPERATURE,
      config.MESSENGER_AGENT_MODEL,
    )
  } catch (error) {
    if (!shouldTryNativeOllamaFallback(baseUrl, apiKey)) {
      throw error
    }
  }

  return await callNativeOllamaBackend(
    baseUrl,
    messages,
    options,
    config.MESSENGER_AGENT_TIMEOUT_MS,
    config.MESSENGER_AGENT_TEMPERATURE,
    config.MESSENGER_AGENT_MODEL,
  )
}