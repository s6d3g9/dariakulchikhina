import { readMessengerConfig } from './config.ts'

export interface MessengerAgentLlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface MessengerAgentLlmOptions {
  model?: string
  apiKey?: string
}

export async function callMessengerAgentModel(
  messages: MessengerAgentLlmMessage[],
  options: MessengerAgentLlmOptions = {},
) {
  const config = readMessengerConfig()
  if (!options.apiKey?.trim()) {
    throw new Error('MESSENGER_AGENT_API_KEY_REQUIRED')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${options.apiKey.trim()}`,
  }

  const response = await fetch(`${config.MESSENGER_AGENT_API_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(config.MESSENGER_AGENT_TIMEOUT_MS),
    body: JSON.stringify({
      model: options.model?.trim() || config.MESSENGER_AGENT_MODEL,
      messages,
      temperature: config.MESSENGER_AGENT_TEMPERATURE,
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