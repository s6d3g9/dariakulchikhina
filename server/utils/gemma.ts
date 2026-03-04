/**
 * Gemma 3 27B — утилита вызова через Ollama API (OpenAI-совместимый формат)
 * Сервер: 152.53.176.165:11434
 * Модель: gemma3:27b
 */

const MODEL = 'gemma3:27b'
const DEFAULT_GEMMA_URL = 'http://localhost:11434'
const TIMEOUT_MS = 180_000 // 3 минуты — Gemma 27B на CPU может быть медленной

export interface GemmaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function callGemma(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.3,
): Promise<string> {
  const baseUrl = process.env.GEMMA_URL || DEFAULT_GEMMA_URL

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: 4096,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Gemma API error ${response.status}: ${errText.slice(0, 200)}`)
  }

  const data = await response.json() as any
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('Gemma вернула пустой ответ')
  return text.trim() as string
}

/** Системный промпт для работы с документами студии дизайна */
export const DOCUMENT_SYSTEM_PROMPT = `Ты — профессиональный юрист-ассистент и бизнес-редактор, специализирующийся на договорах и документах в сфере дизайна интерьеров.

Ты работаешь для «Студии дизайна Дарии Кульчихиной» (г. Москва).
Исполнитель по всем договорам — Кульчихина Дария Андреевна.

ПРАВИЛА:
1. Используй только российское законодательство (ГК РФ)
2. Язык — русский, официально-деловой стиль
3. Все денежные суммы дублируй: цифрами и прописью
4. Даты в формате ДД.ММ.ГГГГ
5. НЕ придумывай данные — используй только то, что есть в контексте
6. Незаполненные данные оставляй как «__________»
7. Возвращай ТОЛЬКО текст документа без пояснений и markdown-разметки
8. Сохраняй юридически корректную структуру документа
9. Нумеруй разделы (1. НАЗВАНИЕ РАЗДЕЛА, 1.1. Подпункт)`
