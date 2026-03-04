/**
 * POST /api/ai/document
 * Три действия: generate | improve | review
 * Использует Gemma 3 27B через Ollama (server/utils/gemma.ts)
 */

import { useDb } from '~/server/db/index'
import { projects, clients, contractors, projectContractors, pageContent } from '~/server/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { callGemma, DOCUMENT_SYSTEM_PROMPT } from '~/server/utils/gemma'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const body: any = await readNodeBody(event)
  const {
    action,           // 'generate' | 'improve' | 'review'
    templateKey,
    templateName,
    templateText,
    fields,           // Record<string, string>
    currentText,      // текущий текст в редакторе (для improve/review)
    projectSlug,
    clientId,
    contractorId,
  } = body || {}

  if (!action || !['generate', 'improve', 'review'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'Неверный action' })
  }
  if (!templateName) {
    throw createError({ statusCode: 400, statusMessage: 'Не указан тип документа' })
  }

  // ── Собираем контекст из базы ──────────────────────────────────
  const ctx = await buildContext(projectSlug, clientId, contractorId)

  // ── Строим промпт в зависимости от действия ───────────────────
  let userPrompt = ''

  if (action === 'generate') {
    userPrompt = buildGeneratePrompt({ templateName, templateText, fields, ctx })
  } else if (action === 'improve') {
    userPrompt = buildImprovePrompt({ templateName, currentText, ctx })
  } else if (action === 'review') {
    userPrompt = buildReviewPrompt({ templateName, currentText })
  }

  // ── Вызов Gemma 27B ────────────────────────────────────────────
  const result = await callGemma(DOCUMENT_SYSTEM_PROMPT, userPrompt)

  if (action === 'review') {
    // Парсим замечания из ответа в структуру
    const notes = parseReviewNotes(result)
    return { notes }
  }

  return { text: result }
})

// ── Собираем расширенный контекст из БД ───────────────────────────────────
async function buildContext(projectSlug: string, clientId: number, contractorId: number) {
  const db = useDb()
  const ctx: Record<string, any> = {}

  if (projectSlug) {
    const [proj] = await db.select().from(projects)
      .where(eq(projects.slug, projectSlug)).limit(1)

    if (proj) {
      const profile = (proj.profile || {}) as Record<string, any>
      ctx.project = {
        title: proj.title,
        objectAddress: profile.objectAddress || '',
        objectType: profile.objectType || '',
        objectArea: profile.objectArea || '',
        roomCount: profile.roomCount || '',
        budget: profile.budget || '',
        deadline: profile.deadline || '',
        style: profile.style || profile._profile?.style || '',
        client_name: profile.client_name || '',
        phone: profile.phone || '',
        email: profile.email || '',
        passport_series: profile.passport_series || '',
        passport_number: profile.passport_number || '',
        passport_issued_by: profile.passport_issued_by || '',
        passport_issue_date: profile.passport_issue_date || '',
        passport_registration_address: profile.passport_registration_address || '',
        passport_inn: profile.passport_inn || '',
      }

      // Собираем данные из страниц проекта (бриф, ТЗ, мудборд и т.д.)
      const pages = await db.select().from(pageContent)
        .where(eq(pageContent.projectId, proj.id))

      ctx.pages = {}
      const USEFUL_PAGES = ['first-contact', 'smart-brief', 'client-tz', 'moodboard', 'specifications', 'space-planning', 'procurement-list']
      for (const pg of pages) {
        if (USEFUL_PAGES.includes(pg.pageSlug || '')) {
          const content = (pg.content || {}) as Record<string, any>
          // Берём только строковые/числовые значения, не вложенные объекты
          const clean: Record<string, string> = {}
          for (const [k, v] of Object.entries(content)) {
            if (v && (typeof v === 'string' || typeof v === 'number')) {
              clean[k] = String(v)
            }
          }
          if (Object.keys(clean).length) ctx.pages[pg.pageSlug!] = clean
        }
      }
    }
  }

  if (clientId) {
    const [client] = await db.select().from(clients)
      .where(eq(clients.id, clientId)).limit(1)
    if (client) ctx.client = client
  }

  if (contractorId) {
    const [contractor] = await db.select().from(contractors)
      .where(eq(contractors.id, contractorId)).limit(1)
    if (contractor) ctx.contractor = contractor
  }

  return ctx
}

// ── Форматируем контекст для промпта ─────────────────────────────────────
function formatContext(ctx: Record<string, any>): string {
  const lines: string[] = []

  if (ctx.project) {
    const p = ctx.project
    lines.push('ДАННЫЕ ПРОЕКТА:')
    if (p.objectType || p.objectAddress) lines.push(`  Объект: ${p.objectType} ${p.objectArea ? p.objectArea + ' кв.м' : ''}, ${p.objectAddress}`.trim())
    if (p.budget) lines.push(`  Бюджет: ${p.budget}`)
    if (p.deadline) lines.push(`  Срок: ${p.deadline}`)
    if (p.style) lines.push(`  Стиль: ${p.style}`)
    if (p.client_name) lines.push(`  ФИО клиента: ${p.client_name}`)
    if (p.phone) lines.push(`  Тел. клиента: ${p.phone}`)
    if (p.email) lines.push(`  Email клиента: ${p.email}`)
    if (p.passport_series || p.passport_number) lines.push(`  Паспорт: ${p.passport_series} ${p.passport_number}`.trim())
    if (p.passport_issued_by) lines.push(`  Выдан: ${p.passport_issued_by}`)
    if (p.passport_issue_date) lines.push(`  Дата выдачи: ${p.passport_issue_date}`)
    if (p.passport_registration_address) lines.push(`  Адрес регистрации: ${p.passport_registration_address}`)
    if (p.passport_inn) lines.push(`  ИНН: ${p.passport_inn}`)
  }

  if (ctx.client) {
    const c = ctx.client
    lines.push('\nДАННЫЕ КЛИЕНТА:')
    if (c.name) lines.push(`  ФИО: ${c.name}`)
    if (c.phone) lines.push(`  Тел: ${c.phone}`)
    if (c.email) lines.push(`  Email: ${c.email}`)
    if (c.address) lines.push(`  Адрес: ${c.address}`)
    if (c.notes) lines.push(`  Заметки: ${c.notes}`)
  }

  if (ctx.contractor) {
    const c = ctx.contractor
    lines.push('\nДАННЫЕ ПОДРЯДЧИКА:')
    if (c.companyName || c.name) lines.push(`  Компания: ${c.companyName || c.name}`)
    if (c.inn) lines.push(`  ИНН: ${c.inn}`)
    if (c.phone) lines.push(`  Тел: ${c.phone}`)
    if (c.email) lines.push(`  Email: ${c.email}`)
    if (c.legalAddress || c.factAddress) lines.push(`  Адрес: ${c.legalAddress || c.factAddress}`)
    if (c.bankName) lines.push(`  Банк: ${c.bankName}`)
    if (c.bik) lines.push(`  БИК: ${c.bik}`)
    if (c.settlementAccount) lines.push(`  Расч. счёт: ${c.settlementAccount}`)
  }

  if (ctx.pages && Object.keys(ctx.pages).length) {
    const PAGE_LABELS: Record<string, string> = {
      'first-contact': 'Первый контакт',
      'smart-brief':   'Бриф клиента',
      'client-tz':     'Техническое задание',
      'moodboard':     'Мудборд / концепция',
      'specifications':'Спецификации',
      'space-planning': 'Планировка',
      'procurement-list': 'Список закупок',
    }
    for (const [slug, data] of Object.entries(ctx.pages)) {
      lines.push(`\n${PAGE_LABELS[slug] || slug.toUpperCase()}:`)
      for (const [k, v] of Object.entries(data as Record<string, string>)) {
        lines.push(`  ${k}: ${v}`)
      }
    }
  }

  return lines.join('\n')
}

// ── Промпт: сгенерировать документ ────────────────────────────────────────
function buildGeneratePrompt(opts: {
  templateName: string
  templateText: string
  fields: Record<string, string>
  ctx: Record<string, any>
}): string {
  const ctxText = formatContext(opts.ctx)
  const filledFields = Object.entries(opts.fields || {})
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n')

  return `Сгенерируй профессиональный документ: «${opts.templateName}».

${ctxText ? ctxText + '\n' : ''}${filledFields ? '\nЗАПОЛНЕННЫЕ ПОЛЯ:\n' + filledFields + '\n' : ''}
Используй следующий шаблон как основу (адаптируй под имеющиеся данные):
---
${opts.templateText || '(шаблон не предоставлен)'}
---

Создай полный, юридически корректный документ. Заполни все поля из имеющихся данных. Все суммы пиши цифрами и прописью.`
}

// ── Промпт: улучшить существующий документ ────────────────────────────────
function buildImprovePrompt(opts: {
  templateName: string
  currentText: string
  ctx: Record<string, any>
}): string {
  const ctxText = formatContext(opts.ctx)

  return `Улучши следующий документ «${opts.templateName}».

${ctxText ? 'ДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ:\n' + ctxText + '\n' : ''}
ТЕКУЩИЙ ДОКУМЕНТ:
---
${opts.currentText}
---

Задачи:
1. Заполни пропуски (__________) если данные есть в контексте
2. Исправь юридические неточности
3. Добавь недостающие обязательные пункты (ответственность, форс-мажор, реквизиты)
4. Улучши деловой стиль формулировок
5. Проверь корректность сумм и дат
6. Сохрани структуру и нумерацию разделов

Верни только готовый улучшенный документ.`
}

// ── Промпт: проверить и вернуть замечания ─────────────────────────────────
function buildReviewPrompt(opts: {
  templateName: string
  currentText: string
}): string {
  return `Проверь следующий документ «${opts.templateName}» и составь список замечаний.

ДОКУМЕНТ:
---
${opts.currentText}
---

Проверь и перечисли замечания в формате:
⚠️ [описание проблемы]
💡 [предложение по улучшению]

Проверяй:
- Незаполненные поля (__________)
- Отсутствующие обязательные разделы
- Юридические риски и неточности
- Несоответствия в данных (суммы, даты, ФИО)
- Отсутствие подписей, реквизитов, печатей
- Некорректные формулировки по ГК РФ

Если документ в порядке, напиши: ✅ Документ составлен корректно.`
}

// ── Парсинг замечаний из ответа Gemma ─────────────────────────────────────
function parseReviewNotes(text: string): Array<{ type: 'error' | 'info', text: string }> {
  const notes: Array<{ type: 'error' | 'info', text: string }> = []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  for (const line of lines) {
    if (line.startsWith('⚠️')) {
      notes.push({ type: 'error', text: line.replace(/^⚠️\s*/, '') })
    } else if (line.startsWith('💡')) {
      notes.push({ type: 'info', text: line.replace(/^💡\s*/, '') })
    } else if (line.startsWith('✅')) {
      notes.push({ type: 'info', text: line.replace(/^✅\s*/, '') })
    } else if (line.length > 5) {
      notes.push({ type: 'info', text: line })
    }
  }

  return notes.length ? notes : [{ type: 'info', text: text.slice(0, 500) }]
}
