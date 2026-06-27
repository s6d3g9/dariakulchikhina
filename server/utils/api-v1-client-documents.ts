import { CONTRACT_STATUS_MAP, PAYMENT_STATUS_MAP } from '~/shared/utils/status-maps'
import type {
  ApiV1ClientProjectDocument,
  ApiV1ClientProjectDocumentFacts,
  ApiV1ClientProjectDocumentKind,
  ApiV1ClientProjectDocuments,
  ApiV1ProjectRef,
} from '~/shared/types/api-v1'

type ProjectDocumentsRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  profile: Record<string, unknown>
  updatedAt: Date | string | null
}

type DocumentRow = {
  id: number
  category: string
  title: string
  filename: string | null
  url: string | null
  createdAt: Date | string | null
}

type ProfileFile = {
  url: string
  filename: string
  label: string
  category: string
  mimeType: string
  sizeBytes: number | null
  uploadedAt: string
}

const DOCUMENT_KIND_ORDER: ApiV1ClientProjectDocumentKind[] = [
  'contract',
  'invoice',
  'tor',
  'brief',
  'report',
  'survey',
  'act',
  'specification',
  'approval',
  'album',
  'other',
]

function safeString(value: unknown, maxLength = 1000) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).slice(0, maxLength)
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function safeDate(value: unknown) {
  if (value instanceof Date) return value.toISOString()
  return safeString(value, 80)
}

function filenameFromUrl(url: string) {
  const cleanUrl = url.split('?')[0] || ''
  const filename = cleanUrl.split('/').filter(Boolean).pop() || ''
  return decodeURIComponent(filename)
}

function createProjectRef(project: ProjectDocumentsRow): ApiV1ProjectRef {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    projectType: project.projectType,
    updatedAt: safeDate(project.updatedAt),
  }
}

function normalizeDocumentKind(category: string): ApiV1ClientProjectDocumentKind | null {
  const value = category.toLowerCase().trim()
  if (!value || value === 'template' || value.includes('template')) return null
  if (value.includes('contract')) return 'contract'
  if (value.includes('invoice') || value.includes('payment')) return 'invoice'
  if (value.includes('tor') || value.includes('tz') || value.includes('тз')) return 'tor'
  if (value.includes('brief')) return 'brief'
  if (value.includes('survey') || value.includes('measure')) return 'survey'
  if (value.includes('report')) return 'report'
  if (value.includes('album') || value.includes('gallery') || value.includes('render')) return 'album'
  if (value.includes('act')) return 'act'
  if (value.includes('spec')) return 'specification'
  if (value.includes('approval') || value.includes('signoff')) return 'approval'
  return 'other'
}

function normalizeProfileFile(rawFile: unknown, fallbackCategory: ApiV1ClientProjectDocumentKind): ProfileFile | null {
  if (!rawFile || typeof rawFile !== 'object') return null

  const file = rawFile as Record<string, unknown>
  const url = safeString(file.url, 2000)
  const filename = safeString(file.filename || file.originalName || file.name, 500) || filenameFromUrl(url)
  const label = safeString(file.label || file.title || filename, 500)
  if (!url && !filename && !label) return null

  return {
    url,
    filename,
    label,
    category: safeString(file.category || fallbackCategory, 120) || fallbackCategory,
    mimeType: safeString(file.mimeType || file.type, 120),
    sizeBytes: typeof file.sizeBytes === 'number'
      ? file.sizeBytes
      : typeof file.size === 'number'
        ? file.size
        : null,
    uploadedAt: safeString(file.uploadedAt || file.createdAt, 80),
  }
}

function createProfileDocument(input: {
  id: string
  kind: ApiV1ClientProjectDocumentKind
  title: string
  url?: unknown
  filename?: unknown
  category?: unknown
  status?: string
  statusLabel?: string
  summary?: string
  mimeType?: unknown
  sizeBytes?: unknown
  issuedAt?: unknown
  updatedAt?: unknown
}): ApiV1ClientProjectDocument | null {
  const url = safeString(input.url, 2000)
  const filename = safeString(input.filename, 500) || filenameFromUrl(url)
  const title = safeString(input.title, 500) || filename || input.kind
  if (!url && !filename && !title) return null

  const sizeBytes = typeof input.sizeBytes === 'number' ? input.sizeBytes : null
  return {
    id: input.id,
    kind: input.kind,
    title,
    filename,
    url,
    category: safeString(input.category, 120) || input.kind,
    status: input.status || '',
    statusLabel: input.statusLabel || '',
    source: 'profile',
    summary: safeString(input.summary, 1000),
    mimeType: safeString(input.mimeType, 120),
    sizeBytes,
    issuedAt: safeDate(input.issuedAt),
    updatedAt: safeDate(input.updatedAt),
    isDownloadable: Boolean(url),
  }
}

function createDocumentRowDocument(row: DocumentRow): ApiV1ClientProjectDocument | null {
  const kind = normalizeDocumentKind(row.category)
  if (!kind) return null

  const url = safeString(row.url, 2000)
  const filename = safeString(row.filename, 500) || filenameFromUrl(url)
  const title = safeString(row.title, 500) || filename || 'Документ'

  return {
    id: `documents:${row.id}`,
    kind,
    title,
    filename,
    url,
    category: safeString(row.category, 120) || kind,
    status: url || filename ? 'available' : 'pending',
    statusLabel: url || filename ? 'доступен' : 'готовится',
    source: 'documents',
    summary: '',
    mimeType: '',
    sizeBytes: null,
    issuedAt: safeDate(row.createdAt),
    updatedAt: safeDate(row.createdAt),
    isDownloadable: Boolean(url),
  }
}

function createFacts(profile: Record<string, unknown>): ApiV1ClientProjectDocumentFacts {
  const contractStatus = safeString(profile.contract_status, 80)
  const paymentStatus = safeString(profile.payment_status || profile.invoice_payment_status, 80)
  const contractStatusMeta = contractStatus ? CONTRACT_STATUS_MAP[contractStatus] : null
  const paymentStatusMeta = paymentStatus ? PAYMENT_STATUS_MAP[paymentStatus] : null

  return {
    contractNumber: safeString(profile.contract_number, 240),
    contractDate: safeString(profile.contract_date, 80),
    contractStatus,
    contractStatusLabel: contractStatusMeta?.label || (contractStatus ? contractStatus : 'не заполнен'),
    contractStatusColor: contractStatusMeta?.token || 'gray',
    contractParties: safeString(profile.contract_parties, 1000),
    paymentStatus,
    paymentStatusLabel: paymentStatusMeta?.label || (paymentStatus ? paymentStatus : 'не выставлен'),
    paymentStatusColor: paymentStatusMeta?.token || 'gray',
    invoiceAmount: safeString(profile.invoice_amount, 240),
    invoiceAdvancePct: safeString(profile.invoice_advance_pct, 120),
    invoiceDate: safeString(profile.invoice_date, 80),
    invoicePaymentDetails: safeString(profile.invoice_payment_details, 2000),
    torScope: safeString(profile.tor_scope, 10_000),
    torExclusions: safeString(profile.tor_exclusions, 10_000),
    torTimeline: safeString(profile.tor_timeline, 1000),
    torDeliverables: safeString(profile.tor_deliverables, 10_000),
  }
}

function collectProfileDocuments(project: ProjectDocumentsRow, facts: ApiV1ClientProjectDocumentFacts) {
  const profile = project.profile || {}
  const updatedAt = project.updatedAt
  const documents: ApiV1ClientProjectDocument[] = []

  const contractDoc = createProfileDocument({
    id: 'profile:contract',
    kind: 'contract',
    title: 'Договор дизайн-проекта',
    url: profile.contract_file,
    filename: profile.contract_filename,
    status: facts.contractStatus,
    statusLabel: facts.contractStatusLabel,
    summary: facts.contractNumber ? `Договор ${facts.contractNumber}` : '',
    issuedAt: facts.contractDate,
    updatedAt,
  })
  if (contractDoc) documents.push(contractDoc)

  const invoiceDoc = createProfileDocument({
    id: 'profile:invoice',
    kind: 'invoice',
    title: 'Счёт на оплату',
    url: profile.invoice_file,
    filename: profile.invoice_filename,
    status: facts.paymentStatus,
    statusLabel: facts.paymentStatusLabel,
    summary: facts.invoiceAmount ? `Сумма: ${facts.invoiceAmount}` : '',
    issuedAt: facts.invoiceDate,
    updatedAt,
  })
  if (invoiceDoc) documents.push(invoiceDoc)

  const briefDoc = createProfileDocument({
    id: 'profile:brief',
    kind: 'brief',
    title: 'Анкета / бриф клиента',
    url: profile.brief_pdf_url,
    filename: 'Brief.pdf',
    status: safeString(profile.brief_completed) === 'true' || profile.brief_completed === true ? 'completed' : '',
    statusLabel: safeString(profile.brief_completed) === 'true' || profile.brief_completed === true ? 'заполнен' : '',
    updatedAt,
  })
  if (briefDoc) documents.push(briefDoc)

  const surveyReportDoc = createProfileDocument({
    id: 'profile:survey-report',
    kind: 'report',
    title: 'Отчёт обмеров',
    url: profile.survey_report_url,
    filename: 'SurveyReport.pdf',
    category: 'survey',
    status: safeString(profile.survey_status, 80),
    statusLabel: safeString(profile.survey_status, 80),
    issuedAt: profile.survey_date,
    updatedAt,
  })
  if (surveyReportDoc) documents.push(surveyReportDoc)

  const pointCloudDoc = createProfileDocument({
    id: 'profile:survey-pointcloud',
    kind: 'survey',
    title: 'Облако точек',
    url: profile.survey_pointcloud_url,
    filename: 'Pointcloud.e57',
    category: 'survey',
    status: safeString(profile.survey_status, 80),
    statusLabel: safeString(profile.survey_status, 80),
    issuedAt: profile.survey_date,
    updatedAt,
  })
  if (pointCloudDoc) documents.push(pointCloudDoc)

  const surveyPhotoDoc = createProfileDocument({
    id: 'profile:survey-photo',
    kind: 'survey',
    title: 'Фотофиксация объекта',
    url: profile.survey_photo_url,
    filename: 'Photo_As-Is.zip',
    category: 'survey',
    status: safeString(profile.survey_status, 80),
    statusLabel: safeString(profile.survey_status, 80),
    issuedAt: profile.survey_date,
    updatedAt,
  })
  if (surveyPhotoDoc) documents.push(surveyPhotoDoc)

  for (const [key, kind] of [['album_files', 'album'], ['survey_files', 'survey']] as const) {
    const files = Array.isArray(profile[key]) ? profile[key] : []
    files.forEach((rawFile, index) => {
      const file = normalizeProfileFile(rawFile, kind)
      if (!file) return
      const documentKind = kind === 'album' ? 'album' : normalizeDocumentKind(file.category) || kind
      const document = createProfileDocument({
        id: `profile:${key}:${index}`,
        kind: documentKind,
        title: file.label || file.filename || (kind === 'album' ? 'Материал альбома' : 'Материал обмеров'),
        url: file.url,
        filename: file.filename,
        category: file.category,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes ?? undefined,
        issuedAt: file.uploadedAt,
        updatedAt: file.uploadedAt || updatedAt,
      })
      if (document) documents.push(document)
    })
  }

  return documents
}

function dedupeDocuments(items: ApiV1ClientProjectDocument[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = [
      item.kind,
      item.url || item.filename || item.title,
    ].join(':').toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function sortDocuments(items: ApiV1ClientProjectDocument[]) {
  return [...items].sort((left, right) => {
    const leftKind = DOCUMENT_KIND_ORDER.indexOf(left.kind)
    const rightKind = DOCUMENT_KIND_ORDER.indexOf(right.kind)
    if (leftKind !== rightKind) return leftKind - rightKind
    return (right.updatedAt || right.issuedAt).localeCompare(left.updatedAt || left.issuedAt)
  })
}

export function createApiV1ClientProjectDocumentsDto(
  project: ProjectDocumentsRow,
  documentRows: DocumentRow[],
): ApiV1ClientProjectDocuments {
  const profile = project.profile || {}
  const facts = createFacts(profile)
  const items = sortDocuments(dedupeDocuments([
    ...collectProfileDocuments(project, facts),
    ...documentRows
      .map(createDocumentRowDocument)
      .filter((item): item is ApiV1ClientProjectDocument => Boolean(item)),
  ]))

  return {
    project: createProjectRef(project),
    facts,
    summary: {
      total: items.length,
      downloadable: items.filter(item => item.isDownloadable).length,
      contracts: items.filter(item => item.kind === 'contract').length,
      invoices: items.filter(item => item.kind === 'invoice').length,
      reports: items.filter(item => item.kind === 'report').length,
      media: items.filter(item => item.kind === 'album' || item.kind === 'survey').length,
    },
    items,
  }
}
