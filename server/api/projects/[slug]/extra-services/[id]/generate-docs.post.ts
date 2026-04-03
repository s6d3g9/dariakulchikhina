import { generateExtraServiceDocuments } from '~/server/utils/extra-service-documents'

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
  const { service, contractDoc, invoiceDoc } = await generateExtraServiceDocuments(slug, serviceId)

  return {
    service,
    contractDoc,
    invoiceDoc,
  }
})
