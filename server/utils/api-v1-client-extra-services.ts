import { EXTRA_SERVICE_STATUS_MAP, EXTRA_SERVICE_STATUSES } from '~/shared/types/catalogs'
import type {
  ApiV1ClientExtraService,
  ApiV1ClientExtraServiceDocument,
  ApiV1ClientExtraServiceStatus,
  ApiV1ClientProjectExtraServices,
  ApiV1ProjectRef,
} from '~/shared/types/api-v1'

type ProjectExtraServicesRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  updatedAt: Date | string | null
}

type ExtraServiceRow = {
  id: number
  requestedBy: string
  serviceKey: string | null
  title: string
  description: string | null
  quantity: string
  unit: string
  unitPrice: number | null
  totalPrice: number | null
  status: string
  clientNotes: string | null
  contractDocId: number | null
  invoiceDocId: number | null
  createdAt: Date | string | null
  updatedAt: Date | string | null
}

type ExtraServiceDocumentRow = {
  id: number
  title: string
  content: string | null
  createdAt: Date | string | null
}

const KNOWN_STATUSES = new Set<string>(EXTRA_SERVICE_STATUSES)

function safeString(value: unknown, maxLength = 500) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function safeDate(value: Date | string | null) {
  if (value instanceof Date) return value.toISOString()
  return safeString(value, 80)
}

function createProjectRef(project: ProjectExtraServicesRow): ApiV1ProjectRef {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    projectType: project.projectType,
    updatedAt: safeDate(project.updatedAt),
  }
}

function normalizeExtraServiceStatus(status: string): ApiV1ClientExtraServiceStatus {
  const normalized = safeString(status, 80) || 'requested'
  return (KNOWN_STATUSES.has(normalized) ? normalized : 'requested') as ApiV1ClientExtraServiceStatus
}

function createDocumentRef(kind: 'contract' | 'invoice', doc?: ExtraServiceDocumentRow) {
  return {
    kind,
    available: Boolean(doc),
    title: doc ? safeString(doc.title, 500) : '',
  }
}

function createServiceDto(
  service: ExtraServiceRow,
  documentById: Record<number, ExtraServiceDocumentRow>,
): ApiV1ClientExtraService {
  const status = normalizeExtraServiceStatus(service.status)
  const statusMeta = EXTRA_SERVICE_STATUS_MAP[status]
  const contractDoc = service.contractDocId ? documentById[service.contractDocId] : undefined
  const invoiceDoc = service.invoiceDocId ? documentById[service.invoiceDocId] : undefined

  return {
    id: service.id,
    origin: service.requestedBy === 'admin' ? 'studio' : 'client',
    serviceKey: safeString(service.serviceKey, 200),
    title: safeString(service.title, 500) || 'Дополнительная услуга',
    description: safeString(service.description, 5000),
    quantity: safeString(service.quantity, 100) || '1',
    unit: safeString(service.unit, 100) || 'услуга',
    unitPrice: typeof service.unitPrice === 'number' ? service.unitPrice : null,
    totalPrice: typeof service.totalPrice === 'number' ? service.totalPrice : null,
    status,
    statusLabel: statusMeta?.label || status,
    statusColor: statusMeta?.color || '#607d8b',
    clientNotes: safeString(service.clientNotes, 5000),
    documents: {
      contract: createDocumentRef('contract', contractDoc),
      invoice: createDocumentRef('invoice', invoiceDoc),
    },
    actions: {
      canApprove: status === 'quoted',
      canCancel: ['requested', 'quoted', 'approved', 'contract_sent'].includes(status),
    },
    createdAt: safeDate(service.createdAt),
    updatedAt: safeDate(service.updatedAt),
  }
}

export function createApiV1ClientProjectExtraServicesDto(
  project: ProjectExtraServicesRow,
  services: ExtraServiceRow[],
  documents: ExtraServiceDocumentRow[],
): ApiV1ClientProjectExtraServices {
  const documentById = Object.fromEntries(documents.map(doc => [doc.id, doc]))
  const items = services.map(service => createServiceDto(service, documentById))

  return {
    project: createProjectRef(project),
    summary: {
      total: items.length,
      awaitingClient: items.filter(item => item.actions.canApprove || item.status === 'contract_sent').length,
      active: items.filter(item => ['approved', 'paid', 'in_progress'].includes(item.status)).length,
      completed: items.filter(item => item.status === 'done').length,
      cancelled: items.filter(item => ['cancelled', 'rejected'].includes(item.status)).length,
    },
    items,
  }
}

export function createApiV1ClientExtraServiceDocumentDto(
  kind: 'contract' | 'invoice',
  document: ExtraServiceDocumentRow,
): ApiV1ClientExtraServiceDocument {
  return {
    kind,
    title: safeString(document.title, 500) || (kind === 'contract' ? 'Доп. соглашение' : 'Счёт на оплату'),
    content: safeString(document.content, 200_000),
    generatedAt: safeDate(document.createdAt),
  }
}
