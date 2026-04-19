type MessengerInterpretationProvider = 'algorithm' | 'api'
type MessengerTranscriptionProvider = 'server-default' | 'api'

interface MessengerAiSettingsSnapshot {
  analysisEnabled: boolean
  interpretationProvider: MessengerInterpretationProvider
  transcriptionProvider: MessengerTranscriptionProvider
  interpretationModel: string
  summaryModel: string
  transcriptionModel: string
}

interface MessengerAiModelOptions {
  interpretation: string[]
  summary: string[]
  transcription: string[]
}

interface MessengerAiConfiguredState {
  analysis: boolean
  transcription: boolean
  interpretationApi: boolean
  transcriptionApi: boolean
}

interface MessengerAiSettingsResponse {
  settings: MessengerAiSettingsSnapshot
  modelOptions: MessengerAiModelOptions
  configured: MessengerAiConfiguredState
}

export async function getAiSettings() {
  const auth = useMessengerAuth()
  return await auth.request<MessengerAiSettingsResponse>('/settings/ai')
}

export async function putAiSettings(settings: MessengerAiSettingsSnapshot) {
  const auth = useMessengerAuth()
  return await auth.request<MessengerAiSettingsResponse>('/settings/ai', {
    method: 'PUT',
    body: settings,
  })
}
