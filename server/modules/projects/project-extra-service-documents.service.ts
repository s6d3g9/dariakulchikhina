import { and, eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { documents, projectExtraServices, projects } from '~/server/db/schema'

function rubles(amount: number): string {
  const rublesAmount = Math.floor(amount)
  const units: [number, string, string, string][] = [
    [1e9, 'миллиард', 'миллиарда', 'миллиардов'],
    [1e6, 'миллион', 'миллиона', 'миллионов'],
    [1e3, 'тысяча', 'тысячи', 'тысяч'],
    [1, 'рубль', 'рубля', 'рублей'],
  ]

  if (rublesAmount === 0) {
    return 'ноль рублей 00 копеек'
  }

  const parts: string[] = []
  let rest = rublesAmount
  for (const [value, form1, form2, form5] of units) {
    const count = Math.floor(rest / value)
    if (!count) {
      continue
    }

    rest -= count * value
    const mod10 = count % 10
    const mod100 = count % 100
    const form = (mod100 >= 11 && mod100 <= 19)
      ? form5
      : mod10 === 1
        ? form1
        : mod10 >= 2 && mod10 <= 4
          ? form2
          : form5

    parts.push(`${count} ${form}`)
  }

  return `${parts.join(' ')} 00 копеек`
}

export async function generateExtraServiceDocuments(projectSlug: string, serviceId: number) {
  if (!Number.isFinite(serviceId)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный идентификатор услуги' })
  }

  const db = useDb()
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, projectSlug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })
  }

  const [service] = await db
    .select()
    .from(projectExtraServices)
    .where(and(
      eq(projectExtraServices.id, serviceId),
      eq(projectExtraServices.projectId, project.id),
    ))
    .limit(1)

  if (!service) {
    throw createError({ statusCode: 404, statusMessage: 'Доп. услуга не найдена' })
  }

  if (!['quoted', 'approved'].includes(service.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Счёт можно сформировать только для согласованной или оценённой доп. услуги',
    })
  }

  if (service.unitPrice == null && service.totalPrice == null) {
    throw createError({ statusCode: 400, statusMessage: 'Сначала укажите стоимость услуги' })
  }

  const profile = (project.profile || {}) as Record<string, string>
  const clientName = profile.fio || profile.name || 'Клиент'
  const objectAddress = profile.objectAddress || profile.address || 'адрес объекта уточняется'
  const projectTitle = project.title
  const today = new Date()
  const dateString = today.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
  const contractNumber = `ДУ-${projectSlug.toUpperCase()}-${serviceId}`
  const invoiceNumber = `СЧ-${projectSlug.toUpperCase()}-${serviceId}`

  const quantity = service.quantity || '1'
  const unit = service.unit || 'услуга'
  const unitPrice = service.unitPrice ?? 0
  const totalPrice = service.totalPrice ?? (service.unitPrice ? service.unitPrice * Number(quantity) : 0)
  const totalPriceLabel = totalPrice.toLocaleString('ru-RU')

  const contractContent = `ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ № ${contractNumber}
к Договору на оказание дизайнерских услуг

г. Москва                                                           ${dateString}

Настоящее Дополнительное соглашение заключено между:

Исполнителем: Студия дизайна интерьера (в дальнейшем — «Исполнитель»)
и
Заказчиком: ${clientName} (в дальнейшем — «Заказчик»)

по проекту: ${projectTitle}
Адрес объекта: ${objectAddress}

────────────────────────────────────────────────────────────────────

1. ПРЕДМЕТ СОГЛАШЕНИЯ

1.1. Стороны договорились о выполнении дополнительной услуги:
     «${service.title}»

1.2. Описание услуги:
     ${service.description || 'Услуга оказывается в соответствии с техническим заданием, согласованным Сторонами.'}

────────────────────────────────────────────────────────────────────

2. СТОИМОСТЬ И ПОРЯДОК ОПЛАТЫ

2.1. Объём: ${quantity} ${unit}
2.2. Стоимость единицы: ${unitPrice.toLocaleString('ru-RU')} руб.
2.3. Итоговая стоимость дополнительной услуги:

     ${totalPriceLabel} руб. (${rubles(totalPrice)})

2.4. Оплата производится на основании настоящего Соглашения и
     счёта № ${invoiceNumber} в течение 3 (трёх) рабочих дней.

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

  const invoiceContent = `СЧЁТ НА ОПЛАТУ № ${invoiceNumber}

Дата: ${dateString}

────────────────────────────────────────────────────────────────────

ИСПОЛНИТЕЛЬ:
Студия дизайна интерьера

ЗАКАЗЧИК:
${clientName}
Объект: ${objectAddress}
Проект: ${projectTitle}

────────────────────────────────────────────────────────────────────

№   Наименование                        Кол-во    Ед.    Цена, руб.    Сумма, руб.
──────────────────────────────────────────────────────────────────────────────────
1   ${service.title.padEnd(36, ' ')}  ${quantity.padStart(6, ' ')}    ${unit.padEnd(5, ' ')}    ${unitPrice.toLocaleString('ru-RU').padStart(10, ' ')}    ${totalPriceLabel.padStart(11, ' ')}

══════════════════════════════════════════════════════════════════════════════════
                                                  ИТОГО: ${totalPriceLabel} руб.
                                              НДС: не облагается (УСН)
                                            К ОПЛАТЕ: ${totalPriceLabel} руб.

────────────────────────────────────────────────────────────────────

Сумма прописью: ${rubles(totalPrice)}

Назначение платежа: Оплата по Доп. соглашению № ${contractNumber}
                    за услугу «${service.title}»

────────────────────────────────────────────────────────────────────

Счёт действителен в течение 10 банковских дней.
Оплачивая настоящий счёт, Заказчик подтверждает согласие с условиями
Дополнительного соглашения № ${contractNumber}.
`

  const [contractDoc] = await db
    .insert(documents)
    .values({
      projectId: project.id,
      category: 'contract',
      title: `Доп. соглашение ${contractNumber} — ${service.title}`,
      templateKey: 'extra_service_contract',
      content: contractContent,
    })
    .returning()

  const [invoiceDoc] = await db
    .insert(documents)
    .values({
      projectId: project.id,
      category: 'invoice',
      title: `Счёт ${invoiceNumber} — ${service.title}`,
      templateKey: 'extra_service_invoice',
      content: invoiceContent,
    })
    .returning()

  const [updatedService] = await db
    .update(projectExtraServices)
    .set({
      contractDocId: contractDoc.id,
      invoiceDocId: invoiceDoc.id,
      status: 'contract_sent',
      updatedAt: new Date(),
    })
    .where(eq(projectExtraServices.id, serviceId))
    .returning()

  return {
    service: updatedService,
    contractDoc,
    invoiceDoc,
  }
}
