type AiAction = 'generate' | 'improve' | 'review' | 'chat' | 'continue'

export interface AiStreamPromptOpts {
  templateName: string
  templateText?: string
  fields?: Record<string, string>
  currentText?: string
  customInstruction?: string
}

export function buildUserPrompt(action: AiAction, opts: AiStreamPromptOpts, ctx: Record<string, unknown>): string {
  if (action === 'generate') return buildStreamGeneratePrompt({ ...opts, ctx })
  if (action === 'improve') return buildStreamImprovePrompt({ ...opts, ctx })
  if (action === 'chat') return buildStreamChatPrompt({ ...opts, ctx })
  if (action === 'continue') return buildStreamContinuePrompt({ ...opts, ctx })
  return buildStreamReviewPrompt(opts)
}

export function parseStreamReviewNotes(text: string): Array<{ type: 'error' | 'info'; text: string }> {
  const notes: Array<{ type: 'error' | 'info'; text: string }> = []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  for (const line of lines) {
    if (line.startsWith('⚠️') || line.startsWith('❌')) {
      notes.push({ type: 'error', text: line.replace(/^(?:⚠️|❌)\s*/, '') })
    } else if (line.startsWith('💡') || line.startsWith('✅') || line.startsWith('ℹ️')) {
      notes.push({ type: 'info', text: line.replace(/^(?:💡|✅|ℹ️)\s*/, '') })
    } else if (line.length > 10 && !line.startsWith('---') && !line.startsWith('ДОКУМЕНТ')) {
      notes.push({ type: 'info', text: line })
    }
  }
  return notes.length ? notes : [{ type: 'info', text: text.slice(0, 500) }]
}

function formatStreamCtx(ctx: Record<string, unknown>): string {
  const lines: string[] = []
  if (ctx.project) {
    const p = ctx.project as Record<string, string>
    lines.push('ДАННЫЕ ПРОЕКТА:')
    if (p.objectType || p.objectAddress) lines.push(`  Объект: ${p.objectType} ${p.objectArea ? p.objectArea + ' кв.м' : ''} ${p.objectAddress}`.trim())
    if (p.budget)   lines.push(`  Бюджет: ${p.budget}`)
    if (p.deadline) lines.push(`  Срок: ${p.deadline}`)
    if (p.style)    lines.push(`  Стиль: ${p.style}`)
    if (p.client_name) lines.push(`  ФИО клиента: ${p.client_name}`)
    if (p.phone)    lines.push(`  Тел: ${p.phone}`)
    if (p.passport_series || p.passport_number) lines.push(`  Паспорт: ${p.passport_series} ${p.passport_number}`.trim())
    if (p.passport_issued_by) lines.push(`  Выдан: ${p.passport_issued_by} ${p.passport_issue_date}`.trim())
    if (p.passport_registration_address) lines.push(`  Прописка: ${p.passport_registration_address}`)
  }
  if (ctx.client) {
    const c = ctx.client as Record<string, string>
    lines.push('\nКЛИЕНТ:')
    if (c.name)    lines.push(`  ФИО: ${c.name}`)
    if (c.phone)   lines.push(`  Тел: ${c.phone}`)
    if (c.address) lines.push(`  Адрес: ${c.address}`)
  }
  if (ctx.contractor) {
    const c = ctx.contractor as Record<string, string>
    lines.push('\nПОДРЯДЧИК:')
    if (c.companyName || c.name) lines.push(`  Компания: ${c.companyName || c.name}`)
    if (c.inn) lines.push(`  ИНН: ${c.inn}`)
    if (c.legalAddress) lines.push(`  Адрес: ${c.legalAddress}`)
    if (c.bankName)       lines.push(`  Банк: ${c.bankName}`)
    if (c.settlementAccount) lines.push(`  Счёт: ${c.settlementAccount}`)
    if (c.bik) lines.push(`  БИК: ${c.bik}`)
  }
  if (ctx.pages) {
    const LABELS: Record<string, string> = { 'first-contact': 'Первый контакт', 'smart-brief': 'Бриф', 'client-tz': 'ТЗ', moodboard: 'Концепция', specifications: 'Спецификации' }
    for (const [slug, data] of Object.entries(ctx.pages as Record<string, Record<string, string>>)) {
      lines.push(`\n${LABELS[slug] || slug}:`)
      for (const [k, v] of Object.entries(data)) lines.push(`  ${k}: ${v}`)
    }
  }
  return lines.join('\n')
}

function buildStreamGeneratePrompt(opts: AiStreamPromptOpts & { ctx: Record<string, unknown> }): string {
  const ctxText = formatStreamCtx(opts.ctx)
  const filled = Object.entries(opts.fields || {}).filter(([, v]) => v?.trim()).map(([k, v]) => `  ${k}: ${v}`).join('\n')
  return `Сгенерируй документ: «${opts.templateName}».

${ctxText ? ctxText + '\n' : ''}${filled ? '\nЗАПОЛНЕННЫЕ ПОЛЯ:\n' + filled + '\n' : ''}
ШАБЛОН (возьми за основу):
---
${opts.templateText || ''}
---

Создай полный, готовый к печати документ.`
}

function buildStreamImprovePrompt(opts: AiStreamPromptOpts & { ctx: Record<string, unknown> }): string {
  const ctxText = formatStreamCtx(opts.ctx)
  return `Улучши документ «${opts.templateName}».

${ctxText ? 'КОНТЕКСТ:\n' + ctxText + '\n' : ''}
ТЕКУЩИЙ ДОКУМЕНТ:
---
${opts.currentText || ''}
---

Заполни пропуски, исправь формулировки, добавь недостающие пункты. Верни только готовый документ.`
}

function buildStreamContinuePrompt(opts: AiStreamPromptOpts & { ctx: Record<string, unknown> }): string {
  const text = opts.currentText || ''
  const head = text.slice(0, 600)
  const tail = text.slice(-1200)
  const hasGap = text.length > 1800
  const contextBlock = hasGap ? `${head}\n\n[...середина документа...]\n\n${tail}` : text
  return `ПРОДОЛЖИ документ «${opts.templateName}» с того места, где он прервался.

НЕ ПОВТОРЯЙ уже написанное — пиши ТОЛЬКО продолжение, начиная буквально со следующего слова после конца.
Доведи документ до полного завершения, включая все разделы, подписи и реквизиты.

ДОКУМЕНТ (начало + конец):
---
${contextBlock}
---

Продолжай:`
}

function buildStreamChatPrompt(opts: AiStreamPromptOpts & { ctx: Record<string, unknown> }): string {
  const doc = opts.currentText || ''
  if (!doc.length) return `ВОПРОС: ${opts.customInstruction || ''}`
  let docSnippet = doc
  let truncNote = ''
  if (doc.length > 8000) {
    const half = 3800
    docSnippet = doc.slice(0, half) + '\n\n[...фрагмент скрыт — здесь середина документа...]\n\n' + doc.slice(-half)
    truncNote = '\n(Документ длинный, середина скрыта. Работай только с видимыми фрагментами.)'
  }
  return `Ты помогаешь редактировать документ «${opts.templateName}».${truncNote}

ДОКУМЕНТ (читай внимательно — тебе нужно найти в нём точный текст для замены):
---
${docSnippet}
---

ИНСТРУКЦИЯ ПОЛЬЗОВАТЕЛЯ: ${opts.customInstruction || ''}

ПРАВИЛА ОТВЕТА (строго соблюдай):
1. Найди в документе выше ТОЧНЫЙ текст, который нужно изменить
2. Выдай ТОЛЬКО патч-блок(и) — ничего больше
3. В <<<REPLACE>>> — скопируй текст из документа ДОСЛОВНО (символ в символ, с пробелами и знаками препинания)
4. В <<<WITH>>> — замену
5. ЗАПРЕЩЕНО: переписывать весь документ, добавлять пояснения

ПРИМЕР (когда просят "замени Иванов на Петров"):
<<<REPLACE>>>
Иванов
<<<WITH>>>
Петров
<<<END>>>`
}

function buildStreamReviewPrompt(opts: AiStreamPromptOpts): string {
  return `Проверь следующий документ «${opts.templateName}» и составь список замечаний.\n\nДОКУМЕНТ:\n---\n${opts.currentText || '(пустой документ)'}\n---\n\nПроверь и перечисли замечания в формате:\n⚠️ [описание проблемы]\n💡 [предложение по улучшению]\n\nПроверяй:\n- Незаполненные поля (__________)\n- Отсутствующие обязательные разделы\n- Юридические риски и неточности\n- Несоответствия в данных (суммы, даты, ФИО)\n- Отсутствие подписей, реквизитов, печатей\n- Некорректные формулировки по ГК РФ\n\nЕсли документ в порядке, напиши: ✅ Документ составлен корректно.`
}
