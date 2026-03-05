import { useDb } from '~/server/db/index'
import { projectExtraServices, projects, documents } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * POST /api/projects/[slug]/extra-services/[id]/generate-docs
 * Только для дизайнера (admin).
 * Автоматически генерирует:
 *   1. Доп. соглашение к договору (contract)
 *   2. Счёт на оплату (invoice)
 * Записывает оба документа в таблицу documents, обновляет ссылки в услуге.
 * Статус услуги становится 'contract_sent'.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const slug = getRouterParam(event, 'slug')!
  const serviceId = Number(getRouterParam(event, 'id'))

  if (!Number.isFinite(serviceId)) {
    throw createError({ statusCode: 400, message: 'Invalid service id' })
  }

  const db = useDb()

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  if (!project) throw createError({ statusCode: 404, message: 'Project not found' })

  const [service] = await db
    .select()
    .from(projectExtraServices)
    .where(and(
      eq(projectExtraServices.id, serviceId),
      eq(projectExtraServices.projectId, project.id),
    ))
    .limit(1)
  if (!service) throw createError({ statusCode: 404, message: 'Service not found' })

  if (!['quoted', 'approved'].includes(service.status)) {
    throw createError({
      statusCode: 400,
      message: `Cannot generate docs for service in status '${service.status}'. Must be quoted or approved.`,
    })
  }

  if (service.unitPrice == null && service.totalPrice == null) {
    throw createError({ statusCode: 400, message: 'Price must be set before generating docs' })
  }

  // ── Извлекаем данные профиля проекта ───────────────────────────
  const profile = (project.profile || {}) as Record<string, string>
  const clientName   = profile.fio              || profile.name    || 'Клиент'
  const objectAddr   = profile.objectAddress    || profile.address || 'адрес объекта уточняется'
  const projectTitle = project.title
  const today        = new Date()
  const dateStr      = today.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
  const docNumber    = `ДУ-${slug.toUpperCase()}-${serviceId}`
  const invoiceNum   = `СЧ-${slug.toUpperCase()}-${serviceId}`

  const qty          = service.quantity || '1'
  const unit         = service.unit || 'услуга'
  const unitPrice    = service.unitPrice ?? 0
  const totalPrice   = service.totalPrice ?? (service.unitPrice ? service.unitPrice * Number(qty) : 0)
  const totalStr     = totalPrice.toLocaleString('ru-RU')

  // ── Текст дополнительного соглашения ───────────────────────────
  const contractContent = `ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ № ${docNumber}
к Договору на оказание дизайнерских услуг

г. Москва                                                           ${dateStr}

Настоящее Дополнительное соглашение заключено между:

Исполнителем: Студия дизайна интерьера (в дальнейшем — «Исполнитель»)
и
Заказчиком: ${clientName} (в дальнейшем — «Заказчик»)

по проекту: ${projectTitle}
Адрес объекта: ${objectAddr}

────────────────────────────────────────────────────────────────────

1. ПРЕДМЕТ СОГЛАШЕНИЯ

1.1. Стороны договорились о выполнении дополнительной услуги:
     «${service.title}»

1.2. Описание услуги:
     ${service.description || 'Услуга оказывается в соответствии с техническим заданием, согласованным Сторонами.'}

────────────────────────────────────────────────────────────────────

2. СТОИМОСТЬ И ПОРЯДОК ОПЛАТЫ

2.1. Объём: ${qty} ${unit}
2.2. Стоимость единицы: ${unitPrice.toLocaleString('ru-RU')} руб.
2.3. Итоговая стоимость дополнительной услуги:

     ${totalStr} руб. (${_rubles(totalPrice)})

2.4. Оплата производится на основании настоящего Соглашения и
     счёта № ${invoiceNum} в течение 3 (трёх) рабочих дней.

────────────────────────────────────────────────────────────────────

3. СРОКИ

3.1. Исполнитель приступает к оказанию услуги в течение 3 (трёх)
     рабочих дней с момента подтверждения оплаты.

────────────────────────────────────────────────────────────────────

4. ПРОЧИЕ УСЛОВИЯ

4.1. В части, не урегулированной настоящим Дополнительным соглашением,
     Стороны руководствуются условиями основного Договора.

────────────────────────────────────────────────────────────────────

ПОДПИСИ СТОРОН:

Исполнитель:                         Заказчик:
___________________                  ___________________
«___» ____________ 20__ г.           «___» ____________ 20__ г.
`

  // ── Текст счёта ────────────────────────────────────────────────
  const invoiceContent = `СЧЁТ НА ОПЛАТУ № ${invoiceNum}

Дата: ${dateStr}

────────────────────────────────────────────────────────────────────

ИСПОЛНИТЕЛЬ:
Студия дизайна интерьера

ЗАКАЗЧИК:
${clientName}
Объект: ${objectAddr}
Проект: ${projectTitle}

────────────────────────────────────────────────────────────────────

№   Наименование                        Кол-во    Ед.    Цена, руб.    Сумма, руб.
──────────────────────────────────────────────────────────────────────────────────
1   ${service.title.padEnd(36,' ')}  ${qty.padStart(6,' ')}    ${unit.padEnd(5,' ')}    ${unitPrice.toLocaleString('ru-RU').padStart(10,' ')}    ${totalStr.padStart(11,' ')}

══════════════════════════════════════════════════════════════════════════════════
                                                  ИТОГО: ${totalStr} руб.
                                              НДС: не облагается (УСН)
                                            К ОПЛАТЕ: ${totalStr} руб.

────────────────────────────────────────────────────────────────────

Сумма прописью: ${_rubles(totalPrice)}

Назначение платежа: Оплата по Доп. соглашению № ${docNumber}
                    за услугу «${service.title}»

────────────────────────────────────────────────────────────────────

Счёт действителен в течение 10 банковских дней.
Оплачивая настоящий счёт, Заказчик подтверждает согласие с условиями
Дополнительного соглашения № ${docNumber}.
`

  // ── Сохраняем документы в БД ───────────────────────────────────
  const [contractDoc] = await db
    .insert(documents)
    .values({
      projectId:   project.id,
      category:    'contract',
      title:       `Доп. соглашение ${docNumber} — ${service.title}`,
      templateKey: 'extra_service_contract',
      content:     contractContent,
    })
    .returning()

  const [invoiceDoc] = await db
    .insert(documents)
    .values({
      projectId:   project.id,
      category:    'invoice',
      title:       `Счёт ${invoiceNum} — ${service.title}`,
      templateKey: 'extra_service_invoice',
      content:     invoiceContent,
    })
    .returning()

  // ── Обновляем услугу ───────────────────────────────────────────
  const [updated] = await db
    .update(projectExtraServices)
    .set({
      contractDocId: contractDoc.id,
      invoiceDocId:  invoiceDoc.id,
      status:        'contract_sent',
      updatedAt:     new Date(),
    })
    .where(eq(projectExtraServices.id, serviceId))
    .returning()

  return {
    service:      updated,
    contractDoc,
    invoiceDoc,
  }
})

// ── Вспомогательная функция: число → "X рублей Y копеек" ───────────────
function _rubles(amount: number): string {
  const r = Math.floor(amount)
  const units: [number, string, string, string][] = [
    [1e9, 'миллиард', 'миллиарда', 'миллиардов'],
    [1e6, 'миллион',  'миллиона',  'миллионов'],
    [1e3, 'тысяча',   'тысячи',    'тысяч'],
    [1,   'рубль',    'рубля',     'рублей'],
  ]
  if (r === 0) return 'ноль рублей 00 копеек'

  const parts: string[] = []
  let rest = r
  for (const [val, f1, f2, f5] of units) {
    const n = Math.floor(rest / val)
    if (!n) continue
    rest -= n * val
    const mod10 = n % 10, mod100 = n % 100
    const form = (mod100 >= 11 && mod100 <= 19) ? f5
      : mod10 === 1 ? f1
      : mod10 >= 2 && mod10 <= 4 ? f2
      : f5
    parts.push(`${n} ${form}`)
  }
  return `${parts.join(' ')} 00 копеек`
}
