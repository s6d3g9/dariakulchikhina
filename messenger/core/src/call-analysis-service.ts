import { callMessengerAgentModel } from './agent-llm.ts'

export type MessengerCallAnalysisToolId = 'psychology' | 'business' | 'intent' | 'objections' | 'speech-risks' | 'next-steps'

interface BuildMessengerCallAnalysisOptions {
  apiKey?: string
  model: string
  toolId: MessengerCallAnalysisToolId
  cleanedTranscript: string
  summary: string
}

function buildSystemPrompt(toolId: MessengerCallAnalysisToolId) {
  switch (toolId) {
    case 'psychology':
      return 'Ты анализируешь звонок дизайнера с клиентом. Верни только практическую интерпретацию по психологии клиента: эмоции, уровень доверия, скрытые тревоги, триггеры решения, что усиливает уверенность. Ответ на русском, кратко, 4-7 пунктов.'
    case 'business':
      return 'Ты анализируешь звонок дизайнера с клиентом. Верни только деловую интерпретацию: бюджет, сроки, обязательства, риски сделки, что надо зафиксировать письменно. Ответ на русском, кратко, 4-7 пунктов.'
    case 'intent':
      return 'Ты анализируешь звонок дизайнера с клиентом. Верни только карту намерений клиента: желаемый результат, почему это важно сейчас, критерии успеха, что осталось невыясненным. Ответ на русском, кратко, 4-7 пунктов.'
    case 'objections':
      return 'Ты анализируешь звонок дизайнера с клиентом. Верни только возражения и сомнения: явные, скрытые, вероятные будущие блокеры и как на них отвечать. Ответ на русском, кратко, 4-7 пунктов.'
    case 'speech-risks':
      return 'Ты анализируешь звонок дизайнера с клиентом. Верни только риски коммуникации: расплывчатые формулировки, зоны недопонимания, где нужна более точная фиксация. Ответ на русском, кратко, 4-7 пунктов.'
    case 'next-steps':
      return 'Ты анализируешь звонок дизайнера с клиентом. Верни только следующие шаги после разговора: что отправить, что подтвердить, какие даты и решения запросить. Ответ на русском, кратко, 4-7 пунктов.'
    default:
      return 'Ты анализируешь звонок дизайнера с клиентом. Ответ на русском, кратко, 4-7 пунктов.'
  }
}

export async function buildMessengerCallAnalysis(options: BuildMessengerCallAnalysisOptions) {
  return await callMessengerAgentModel([
    {
      role: 'system',
      content: buildSystemPrompt(options.toolId),
    },
    {
      role: 'user',
      content: [
        'КОНСПЕКТ:',
        options.summary.trim() || 'Нет краткого конспекта.',
        '',
        'РАСШИФРОВКА:',
        options.cleanedTranscript.trim(),
      ].join('\n'),
    },
  ], {
    apiKey: options.apiKey,
    model: options.model,
  })
}