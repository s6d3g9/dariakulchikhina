import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { getMessengerAgentSettings, resolveMessengerAgentActiveRepository } from './agent-settings-store.ts'
import { findMessengerAgentById, listMessengerAgents } from './agent-store.ts'
import { resolveMessengerDataPath } from './storage-paths.ts'

export type MessengerProjectTargetKind = 'platform' | 'messenger' | 'external'
export type MessengerProjectContextKind = 'cabinet' | 'module' | 'page' | 'feature' | 'api' | 'shared'
export type MessengerProjectRole = 'admin' | 'client' | 'manager' | 'designer' | 'contractor' | 'shared' | 'external'
export type MessengerProjectCapability = 'frontend' | 'backend' | 'logic' | 'styles' | 'data' | 'qa' | 'docs' | 'integration'
export type MessengerProjectCoverageStatus = 'planned' | 'in-progress' | 'review' | 'blocked' | 'done'
export type MessengerProjectAgentRole = 'lead' | 'support' | 'review' | 'observer'
export type MessengerProjectSubjectKind = 'client' | 'manager' | 'designer' | 'contractor' | 'admin' | 'vendor' | 'partner' | 'external'
export type MessengerProjectSubjectStatus = 'active' | 'review' | 'blocked' | 'done'
export type MessengerProjectCabinetLinkKind = 'mirrors' | 'depends-on' | 'handoff' | 'approval' | 'shared-data'
export type MessengerProjectAgreementType = 'scope' | 'delivery' | 'approval' | 'payment' | 'change-request' | 'support'
export type MessengerProjectAgreementStatus = 'draft' | 'active' | 'review' | 'blocked' | 'closed'

export interface MessengerProjectCapabilityRecord {
  capability: MessengerProjectCapability
  status: MessengerProjectCoverageStatus
  notes: string
}

export interface MessengerProjectSyncContractRecord {
  frontendPaths: string[]
  backendPaths: string[]
  sharedPaths: string[]
  styleRefs: string[]
  logicRefs: string[]
  docsPaths: string[]
}

export interface MessengerProjectContextRecord {
  id: string
  kind: MessengerProjectContextKind
  label: string
  ownerRole: MessengerProjectRole
  status: MessengerProjectCoverageStatus
  route: string
  summary: string
  tags: string[]
  capabilities: MessengerProjectCapabilityRecord[]
  syncContract: MessengerProjectSyncContractRecord
  assignedAgentIds: string[]
}

export interface MessengerProjectAgentBindingRecord {
  id: string
  agentId: string
  contextId: string
  role: MessengerProjectAgentRole
  responsibilities: MessengerProjectCapability[]
  notes: string
  active: boolean
}

export interface MessengerProjectSubjectRecord {
  id: string
  label: string
  kind: MessengerProjectSubjectKind
  status: MessengerProjectSubjectStatus
  contextIds: string[]
  managerAgentIds: string[]
  tags: string[]
  notes: string
}

export interface MessengerProjectCabinetLinkRecord {
  id: string
  sourceContextId: string
  targetContextId: string
  kind: MessengerProjectCabinetLinkKind
  status: MessengerProjectCoverageStatus
  sharedCapabilities: MessengerProjectCapability[]
  agreementIds: string[]
  notes: string
}

export interface MessengerProjectAgreementRecord {
  id: string
  label: string
  type: MessengerProjectAgreementType
  status: MessengerProjectAgreementStatus
  subjectIds: string[]
  contextIds: string[]
  managerAgentIds: string[]
  summary: string
  terms: string[]
  dueAt: string
}

export interface MessengerProjectRecord {
  id: string
  slug: string
  label: string
  description: string
  targetKind: MessengerProjectTargetKind
  repositoryId: string
  rootPath: string
  defaultBranch: string
  contexts: MessengerProjectContextRecord[]
  agentBindings: MessengerProjectAgentBindingRecord[]
  subjects: MessengerProjectSubjectRecord[]
  cabinetLinks: MessengerProjectCabinetLinkRecord[]
  agreements: MessengerProjectAgreementRecord[]
  createdAt: string
  updatedAt: string
}

export interface MessengerProjectCoverageOverview {
  capability: MessengerProjectCapability
  counts: Record<MessengerProjectCoverageStatus, number>
  total: number
}

export interface MessengerProjectSyncBrief {
  project: MessengerProjectRecord
  coverage: MessengerProjectCoverageOverview[]
  contexts: Array<MessengerProjectContextRecord & {
    bindings: MessengerProjectAgentBindingRecord[]
    recommendedAgentIds: string[]
    missingCapabilities: MessengerProjectCapability[]
  }>
  agents: Array<{
    agentId: string
    displayName: string
    contextIds: string[]
    roleSet: MessengerProjectAgentRole[]
    responsibilities: MessengerProjectCapability[]
    repositoryAligned: boolean
    knowledgeSourceCount: number
    workspacePath: string
  }>
  gaps: Array<{
    type: 'agent-missing' | 'coverage-missing' | 'repository-mismatch'
    contextId?: string
    agentId?: string
    message: string
  }>
}

export interface MessengerProjectManagerBrief {
  project: MessengerProjectRecord
  subjects: Array<MessengerProjectSubjectRecord & {
    managerAgents: string[]
    contextLabels: string[]
  }>
  agreements: Array<MessengerProjectAgreementRecord & {
    managerAgents: string[]
    subjectLabels: string[]
    contextLabels: string[]
  }>
  cabinetLinks: Array<MessengerProjectCabinetLinkRecord & {
    sourceLabel: string
    targetLabel: string
    agreementLabels: string[]
  }>
  managerAgents: Array<{
    agentId: string
    displayName: string
    subjectIds: string[]
    agreementIds: string[]
    contextIds: string[]
  }>
  gaps: Array<{
    type: 'subject-manager-missing' | 'agreement-manager-missing' | 'cabinet-link-unbound' | 'agreement-subject-missing'
    subjectId?: string
    agreementId?: string
    cabinetLinkId?: string
    message: string
  }>
}

export interface MessengerProjectTemplateRecord {
  id: string
  label: string
  description: string
  targetKind: MessengerProjectTargetKind
  project: Pick<MessengerProjectRecord, 'slug' | 'label' | 'description' | 'targetKind' | 'repositoryId' | 'rootPath' | 'defaultBranch' | 'contexts' | 'agentBindings' | 'subjects' | 'cabinetLinks' | 'agreements'>
}

export interface MessengerProjectUpsertInput extends Omit<Partial<MessengerProjectRecord>, 'contexts' | 'agentBindings' | 'subjects' | 'cabinetLinks' | 'agreements'> {
  slug: string
  label: string
  contexts?: Array<Partial<MessengerProjectContextRecord>>
  agentBindings?: Array<Partial<MessengerProjectAgentBindingRecord>>
  subjects?: Array<Partial<MessengerProjectSubjectRecord>>
  cabinetLinks?: Array<Partial<MessengerProjectCabinetLinkRecord>>
  agreements?: Array<Partial<MessengerProjectAgreementRecord>>
}

interface MessengerProjectNormalizationInput extends Omit<Partial<MessengerProjectRecord>, 'contexts' | 'agentBindings' | 'subjects' | 'cabinetLinks' | 'agreements'> {
  contexts?: Array<Partial<MessengerProjectContextRecord>>
  agentBindings?: Array<Partial<MessengerProjectAgentBindingRecord>>
  subjects?: Array<Partial<MessengerProjectSubjectRecord>>
  cabinetLinks?: Array<Partial<MessengerProjectCabinetLinkRecord>>
  agreements?: Array<Partial<MessengerProjectAgreementRecord>>
}

interface MessengerProjectFile {
  projects: MessengerProjectRecord[]
}

const STORAGE_PATH = resolveMessengerDataPath('project-engine.json')

const PROJECT_CAPABILITIES: MessengerProjectCapability[] = ['frontend', 'backend', 'logic', 'styles', 'data', 'qa', 'docs', 'integration']
const COVERAGE_STATUSES: MessengerProjectCoverageStatus[] = ['planned', 'in-progress', 'review', 'blocked', 'done']
const PROJECT_TEMPLATES: MessengerProjectTemplateRecord[] = [
  {
    id: 'platform-role-cabinets',
    label: 'Платформа: кабинеты ролей',
    description: 'Быстрый bootstrap для client, manager, designer и contractor кабинетов с привязкой профильных агентов.',
    targetKind: 'platform',
    project: {
      slug: 'platform-role-cabinets',
      label: 'Кабинеты платформы',
      description: 'Синхронизация разработки клиентского, менеджерского, дизайнерского и подрядного кабинетов.',
      targetKind: 'platform',
      repositoryId: 'repo-main',
      rootPath: '/opt/daria-nuxt',
      defaultBranch: 'main',
      contexts: [
        {
          id: 'designer-cabinet',
          kind: 'cabinet',
          label: 'Кабинет дизайнера',
          ownerRole: 'designer',
          status: 'in-progress',
          route: '/admin',
          summary: 'Admin-кабинет дизайнера и связанные section flows.',
          tags: ['admin', 'designer', 'cabinet'],
          capabilities: [
            { capability: 'frontend', status: 'in-progress', notes: 'Экран и layout' },
            { capability: 'backend', status: 'planned', notes: 'API и серверная логика' },
            { capability: 'logic', status: 'planned', notes: 'Сценарии и workflow' },
            { capability: 'styles', status: 'in-progress', notes: 'UI primitives и cabinet shell' },
            { capability: 'qa', status: 'planned', notes: 'Регрессии роли' },
          ],
          syncContract: {
            frontendPaths: ['app/components/AdminDesignerCabinet.vue', 'app/layouts/admin.vue', 'app/composables/useAdminNav.ts'],
            backendPaths: ['server/api/designers', 'server/utils'],
            sharedPaths: ['shared/types', 'shared/constants'],
            styleRefs: ['.github/AGENTS.md', 'docs/UI_RULES.md'],
            logicRefs: ['docs/ARCHITECTURE.md'],
            docsPaths: ['docs/rag/BACKEND_GUIDE.md'],
          },
          assignedAgentIds: ['platform-ui', 'api-platform', 'qa-release'],
        },
        {
          id: 'manager-cabinet',
          kind: 'cabinet',
          label: 'Кабинет менеджера',
          ownerRole: 'manager',
          status: 'planned',
          route: '/admin',
          summary: 'Manager flows, linked entities, assignments и контроль задач.',
          tags: ['admin', 'manager', 'cabinet'],
          capabilities: [
            { capability: 'frontend', status: 'planned', notes: 'Screen architecture' },
            { capability: 'backend', status: 'planned', notes: 'Manager endpoints' },
            { capability: 'logic', status: 'planned', notes: 'Assignments and flows' },
            { capability: 'styles', status: 'planned', notes: 'Admin shell consistency' },
            { capability: 'qa', status: 'planned', notes: 'Role regressions' },
          ],
          syncContract: {
            frontendPaths: ['app/components/AdminManagerCabinet.vue', 'app/layouts/admin.vue'],
            backendPaths: ['server/api/managers', 'server/api/projects'],
            sharedPaths: ['shared/types', 'shared/constants'],
            styleRefs: ['.github/AGENTS.md'],
            logicRefs: ['docs/ARCHITECTURE.md'],
            docsPaths: ['docs/rag/BACKEND_GUIDE.md'],
          },
          assignedAgentIds: ['platform-ui', 'api-platform', 'orchestrator'],
        },
        {
          id: 'client-cabinet',
          kind: 'cabinet',
          label: 'Кабинет клиента',
          ownerRole: 'client',
          status: 'in-progress',
          route: '/project/[slug]',
          summary: 'Client project cabinet with timeline, docs, approvals and communications.',
          tags: ['client', 'cabinet', 'project'],
          capabilities: [
            { capability: 'frontend', status: 'in-progress', notes: 'Project cabinet UX' },
            { capability: 'backend', status: 'planned', notes: 'Client endpoints' },
            { capability: 'logic', status: 'in-progress', notes: 'Approval and content flow' },
            { capability: 'styles', status: 'in-progress', notes: 'Client shell consistency' },
            { capability: 'qa', status: 'planned', notes: 'Client scenario checks' },
          ],
          syncContract: {
            frontendPaths: ['app/pages/project', 'app/components/ClientPageContent.vue'],
            backendPaths: ['server/api/projects', 'server/api/clients'],
            sharedPaths: ['shared/types', 'shared/constants/pages.ts'],
            styleRefs: ['.github/AGENTS.md', 'docs/UI_INTERFACE.md'],
            logicRefs: ['docs/ARCHITECTURE.md'],
            docsPaths: ['docs/rag/BACKEND_GUIDE.md'],
          },
          assignedAgentIds: ['platform-ui', 'api-platform', 'qa-release'],
        },
        {
          id: 'contractor-cabinet',
          kind: 'cabinet',
          label: 'Кабинет подрядчика',
          ownerRole: 'contractor',
          status: 'planned',
          route: '/contractor/[id]',
          summary: 'Contractor tasks, progress, comments, photos and project sync.',
          tags: ['contractor', 'cabinet'],
          capabilities: [
            { capability: 'frontend', status: 'planned', notes: 'Contractor UI' },
            { capability: 'backend', status: 'planned', notes: 'Work item endpoints' },
            { capability: 'logic', status: 'planned', notes: 'Execution workflows' },
            { capability: 'styles', status: 'planned', notes: 'Cabinet visual parity' },
            { capability: 'qa', status: 'planned', notes: 'Field workflows' },
          ],
          syncContract: {
            frontendPaths: ['app/layouts/contractor.vue', 'app/components/AdminContractorCabinet.vue'],
            backendPaths: ['server/api/contractors', 'server/api/projects'],
            sharedPaths: ['shared/types'],
            styleRefs: ['.github/AGENTS.md'],
            logicRefs: ['docs/ARCHITECTURE.md'],
            docsPaths: ['docs/rag/BACKEND_GUIDE.md'],
          },
          assignedAgentIds: ['platform-ui', 'api-platform', 'qa-release'],
        },
      ],
      agentBindings: [
        { id: 'bind-designer-ui', agentId: 'platform-ui', contextId: 'designer-cabinet', role: 'lead', responsibilities: ['frontend', 'styles'], notes: 'Ведёт экран и shell', active: true },
        { id: 'bind-designer-api', agentId: 'api-platform', contextId: 'designer-cabinet', role: 'support', responsibilities: ['backend', 'logic'], notes: 'Контракты и server logic', active: true },
        { id: 'bind-designer-qa', agentId: 'qa-release', contextId: 'designer-cabinet', role: 'review', responsibilities: ['qa'], notes: 'Проверяет регрессии', active: true },
        { id: 'bind-manager-ui', agentId: 'platform-ui', contextId: 'manager-cabinet', role: 'lead', responsibilities: ['frontend', 'styles'], notes: '', active: true },
        { id: 'bind-manager-api', agentId: 'api-platform', contextId: 'manager-cabinet', role: 'support', responsibilities: ['backend', 'logic'], notes: '', active: true },
        { id: 'bind-manager-orchestrator', agentId: 'orchestrator', contextId: 'manager-cabinet', role: 'review', responsibilities: ['integration', 'docs'], notes: 'Сводит межмодульные зависимости', active: true },
        { id: 'bind-client-ui', agentId: 'platform-ui', contextId: 'client-cabinet', role: 'lead', responsibilities: ['frontend', 'styles'], notes: '', active: true },
        { id: 'bind-client-api', agentId: 'api-platform', contextId: 'client-cabinet', role: 'support', responsibilities: ['backend', 'logic'], notes: '', active: true },
        { id: 'bind-client-qa', agentId: 'qa-release', contextId: 'client-cabinet', role: 'review', responsibilities: ['qa'], notes: '', active: true },
        { id: 'bind-contractor-ui', agentId: 'platform-ui', contextId: 'contractor-cabinet', role: 'lead', responsibilities: ['frontend', 'styles'], notes: '', active: true },
        { id: 'bind-contractor-api', agentId: 'api-platform', contextId: 'contractor-cabinet', role: 'support', responsibilities: ['backend', 'logic'], notes: '', active: true },
        { id: 'bind-contractor-qa', agentId: 'qa-release', contextId: 'contractor-cabinet', role: 'review', responsibilities: ['qa'], notes: '', active: true },
      ],
      subjects: [
        { id: 'subject-client', label: 'Клиент проекта', kind: 'client', status: 'active', contextIds: ['client-cabinet'], managerAgentIds: ['cabinet-manager', 'agreements-manager'], tags: ['project', 'client'], notes: 'Принимает согласования и проектные решения.' },
        { id: 'subject-manager', label: 'Менеджер проекта', kind: 'manager', status: 'active', contextIds: ['manager-cabinet'], managerAgentIds: ['cabinet-manager'], tags: ['project', 'ops'], notes: 'Ведёт коммуникацию между кабинетами и исполнителями.' },
        { id: 'subject-designer', label: 'Дизайнер', kind: 'designer', status: 'active', contextIds: ['designer-cabinet'], managerAgentIds: ['cabinet-manager'], tags: ['design'], notes: 'Отвечает за проектное решение и артефакты дизайна.' },
        { id: 'subject-contractor', label: 'Подрядчик', kind: 'contractor', status: 'active', contextIds: ['contractor-cabinet'], managerAgentIds: ['agreements-manager'], tags: ['delivery'], notes: 'Исполняет задачи и отчитывается по прогрессу.' },
      ],
      cabinetLinks: [
        { id: 'link-manager-designer', sourceContextId: 'manager-cabinet', targetContextId: 'designer-cabinet', kind: 'depends-on', status: 'in-progress', sharedCapabilities: ['logic', 'backend'], agreementIds: ['agreement-scope-sync'], notes: 'Менеджер синхронизирует план и статусы с кабинетом дизайнера.' },
        { id: 'link-designer-client', sourceContextId: 'designer-cabinet', targetContextId: 'client-cabinet', kind: 'approval', status: 'in-progress', sharedCapabilities: ['frontend', 'logic'], agreementIds: ['agreement-client-approval'], notes: 'Согласование материалов и deliverables.' },
        { id: 'link-manager-contractor', sourceContextId: 'manager-cabinet', targetContextId: 'contractor-cabinet', kind: 'handoff', status: 'planned', sharedCapabilities: ['backend', 'logic'], agreementIds: ['agreement-delivery-control'], notes: 'Передача задач и контроль выполнения.' },
      ],
      agreements: [
        { id: 'agreement-scope-sync', label: 'Синхронизация scope между менеджером и дизайнером', type: 'scope', status: 'active', subjectIds: ['subject-manager', 'subject-designer'], contextIds: ['manager-cabinet', 'designer-cabinet'], managerAgentIds: ['cabinet-manager'], summary: 'Фиксирует этапы, изменения объёма и точки handoff.', terms: ['Любое изменение объёма проходит через manager cabinet', 'Дизайнерский кабинет обновляет артефакты синхронно со scope'], dueAt: '' },
        { id: 'agreement-client-approval', label: 'Согласование клиента по deliverables', type: 'approval', status: 'active', subjectIds: ['subject-client', 'subject-designer', 'subject-manager'], contextIds: ['client-cabinet', 'designer-cabinet', 'manager-cabinet'], managerAgentIds: ['agreements-manager'], summary: 'Определяет порядок клиентских согласований и фиксацию решений.', terms: ['Клиентские комментарии фиксируются в project context', 'Менеджер подтверждает итог после согласования'], dueAt: '' },
        { id: 'agreement-delivery-control', label: 'Контроль передачи задач подрядчику', type: 'delivery', status: 'draft', subjectIds: ['subject-manager', 'subject-contractor'], contextIds: ['manager-cabinet', 'contractor-cabinet'], managerAgentIds: ['agreements-manager'], summary: 'Регламентирует handoff задач, сроки и feedback loop.', terms: ['Все handoff события фиксируются через manager context', 'Подрядчик подтверждает приём задачи статусом'], dueAt: '' },
      ],
    },
  },
]

function defaultSyncContract(): MessengerProjectSyncContractRecord {
  return {
    frontendPaths: [],
    backendPaths: [],
    sharedPaths: [],
    styleRefs: [],
    logicRefs: [],
    docsPaths: [],
  }
}

function createDefaultProject(input?: MessengerProjectNormalizationInput): MessengerProjectRecord {
  const now = new Date().toISOString()
  return {
    id: input?.id || randomUUID(),
    slug: input?.slug?.trim() || 'project-engine',
    label: input?.label?.trim() || 'Project Engine',
    description: input?.description?.trim() || '',
    targetKind: input?.targetKind || 'platform',
    repositoryId: input?.repositoryId?.trim() || '',
    rootPath: input?.rootPath?.trim() || '',
    defaultBranch: input?.defaultBranch?.trim() || 'main',
    contexts: [],
    agentBindings: [],
    subjects: [],
    cabinetLinks: [],
    agreements: [],
    createdAt: input?.createdAt || now,
    updatedAt: input?.updatedAt || now,
  }
}

function normalizeSlug(value: string, fallback: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return normalized || fallback
}

function normalizeCoverageStatus(value?: string): MessengerProjectCoverageStatus {
  switch (value) {
    case 'planned':
    case 'in-progress':
    case 'review':
    case 'blocked':
    case 'done':
      return value
    default:
      return 'planned'
  }
}

function normalizeProjectTargetKind(value?: string): MessengerProjectTargetKind {
  switch (value) {
    case 'platform':
    case 'messenger':
    case 'external':
      return value
    default:
      return 'platform'
  }
}

function normalizeProjectContextKind(value?: string): MessengerProjectContextKind {
  switch (value) {
    case 'cabinet':
    case 'module':
    case 'page':
    case 'feature':
    case 'api':
    case 'shared':
      return value
    default:
      return 'feature'
  }
}

function normalizeProjectRole(value?: string): MessengerProjectRole {
  switch (value) {
    case 'admin':
    case 'client':
    case 'manager':
    case 'designer':
    case 'contractor':
    case 'shared':
    case 'external':
      return value
    default:
      return 'shared'
  }
}

function normalizeProjectCapability(value?: string): MessengerProjectCapability | null {
  switch (value) {
    case 'frontend':
    case 'backend':
    case 'logic':
    case 'styles':
    case 'data':
    case 'qa':
    case 'docs':
    case 'integration':
      return value
    default:
      return null
  }
}

function normalizeAgentRole(value?: string): MessengerProjectAgentRole {
  switch (value) {
    case 'lead':
    case 'support':
    case 'review':
    case 'observer':
      return value
    default:
      return 'support'
  }
}

function normalizeSubjectKind(value?: string): MessengerProjectSubjectKind {
  switch (value) {
    case 'client':
    case 'manager':
    case 'designer':
    case 'contractor':
    case 'admin':
    case 'vendor':
    case 'partner':
    case 'external':
      return value
    default:
      return 'external'
  }
}

function normalizeSubjectStatus(value?: string): MessengerProjectSubjectStatus {
  switch (value) {
    case 'active':
    case 'review':
    case 'blocked':
    case 'done':
      return value
    default:
      return 'active'
  }
}

function normalizeCabinetLinkKind(value?: string): MessengerProjectCabinetLinkKind {
  switch (value) {
    case 'mirrors':
    case 'depends-on':
    case 'handoff':
    case 'approval':
    case 'shared-data':
      return value
    default:
      return 'shared-data'
  }
}

function normalizeAgreementType(value?: string): MessengerProjectAgreementType {
  switch (value) {
    case 'scope':
    case 'delivery':
    case 'approval':
    case 'payment':
    case 'change-request':
    case 'support':
      return value
    default:
      return 'scope'
  }
}

function normalizeAgreementStatus(value?: string): MessengerProjectAgreementStatus {
  switch (value) {
    case 'draft':
    case 'active':
    case 'review':
    case 'blocked':
    case 'closed':
      return value
    default:
      return 'draft'
  }
}

function normalizeStringList(values: unknown, limit: number) {
  const normalized = new Set<string>()

  for (const item of Array.isArray(values) ? values : []) {
    if (typeof item !== 'string') {
      continue
    }

    const value = item.trim()
    if (!value) {
      continue
    }

    normalized.add(value)
    if (normalized.size >= limit) {
      break
    }
  }

  return Array.from(normalized)
}

function normalizeCapabilities(values: unknown): MessengerProjectCapabilityRecord[] {
  const normalized = new Map<MessengerProjectCapability, MessengerProjectCapabilityRecord>()

  for (const item of Array.isArray(values) ? values : []) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const candidate = item as { capability?: string; status?: string; notes?: string }
    const capability = normalizeProjectCapability(candidate.capability)
    if (!capability) {
      continue
    }

    normalized.set(capability, {
      capability,
      status: normalizeCoverageStatus(candidate.status),
      notes: typeof candidate.notes === 'string' ? candidate.notes.trim() : '',
    })
  }

  return Array.from(normalized.values()).sort((left, right) => left.capability.localeCompare(right.capability, 'en'))
}

function normalizeSyncContract(value: unknown): MessengerProjectSyncContractRecord {
  const candidate = value && typeof value === 'object' ? value as Partial<MessengerProjectSyncContractRecord> : {}

  return {
    frontendPaths: normalizeStringList(candidate.frontendPaths, 32),
    backendPaths: normalizeStringList(candidate.backendPaths, 32),
    sharedPaths: normalizeStringList(candidate.sharedPaths, 32),
    styleRefs: normalizeStringList(candidate.styleRefs, 32),
    logicRefs: normalizeStringList(candidate.logicRefs, 32),
    docsPaths: normalizeStringList(candidate.docsPaths, 32),
  }
}

function normalizeContexts(values: unknown): MessengerProjectContextRecord[] {
  const normalized = new Map<string, MessengerProjectContextRecord>()

  for (const [index, item] of (Array.isArray(values) ? values : []).entries()) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const candidate = item as Partial<MessengerProjectContextRecord>
    const label = typeof candidate.label === 'string' ? candidate.label.trim() : ''
    if (!label) {
      continue
    }

    const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : `context-${index + 1}`
    normalized.set(id, {
      id,
      kind: normalizeProjectContextKind(typeof candidate.kind === 'string' ? candidate.kind : undefined),
      label,
      ownerRole: normalizeProjectRole(typeof candidate.ownerRole === 'string' ? candidate.ownerRole : undefined),
      status: normalizeCoverageStatus(typeof candidate.status === 'string' ? candidate.status : undefined),
      route: typeof candidate.route === 'string' ? candidate.route.trim() : '',
      summary: typeof candidate.summary === 'string' ? candidate.summary.trim() : '',
      tags: normalizeStringList(candidate.tags, 24),
      capabilities: normalizeCapabilities(candidate.capabilities),
      syncContract: normalizeSyncContract(candidate.syncContract),
      assignedAgentIds: normalizeStringList(candidate.assignedAgentIds, 16),
    })
  }

  return Array.from(normalized.values()).sort((left, right) => left.label.localeCompare(right.label, 'ru'))
}

function normalizeBindings(values: unknown, contexts: MessengerProjectContextRecord[]): MessengerProjectAgentBindingRecord[] {
  const normalized = new Map<string, MessengerProjectAgentBindingRecord>()
  const allowedContextIds = new Set(contexts.map(context => context.id))

  for (const [index, item] of (Array.isArray(values) ? values : []).entries()) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const candidate = item as Partial<MessengerProjectAgentBindingRecord>
    const agentId = typeof candidate.agentId === 'string' ? candidate.agentId.trim() : ''
    const contextId = typeof candidate.contextId === 'string' ? candidate.contextId.trim() : ''
    if (!agentId || !contextId || !allowedContextIds.has(contextId)) {
      continue
    }

    const responsibilities = Array.from(new Set((Array.isArray(candidate.responsibilities) ? candidate.responsibilities : [])
      .map(item => normalizeProjectCapability(typeof item === 'string' ? item : ''))
      .filter((item): item is MessengerProjectCapability => Boolean(item))))
      .sort((left, right) => left.localeCompare(right, 'en'))

    const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : `binding-${index + 1}`
    normalized.set(id, {
      id,
      agentId,
      contextId,
      role: normalizeAgentRole(typeof candidate.role === 'string' ? candidate.role : undefined),
      responsibilities,
      notes: typeof candidate.notes === 'string' ? candidate.notes.trim() : '',
      active: candidate.active !== false,
    })
  }

  return Array.from(normalized.values()).sort((left, right) => left.agentId.localeCompare(right.agentId, 'en'))
}

function normalizeSubjects(values: unknown, contexts: MessengerProjectContextRecord[]): MessengerProjectSubjectRecord[] {
  const normalized = new Map<string, MessengerProjectSubjectRecord>()
  const allowedContextIds = new Set(contexts.map(context => context.id))

  for (const [index, item] of (Array.isArray(values) ? values : []).entries()) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const candidate = item as Partial<MessengerProjectSubjectRecord>
    const label = typeof candidate.label === 'string' ? candidate.label.trim() : ''
    if (!label) {
      continue
    }

    const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : `subject-${index + 1}`
    normalized.set(id, {
      id,
      label,
      kind: normalizeSubjectKind(typeof candidate.kind === 'string' ? candidate.kind : undefined),
      status: normalizeSubjectStatus(typeof candidate.status === 'string' ? candidate.status : undefined),
      contextIds: normalizeStringList(candidate.contextIds, 24).filter(contextId => allowedContextIds.has(contextId)),
      managerAgentIds: normalizeStringList(candidate.managerAgentIds, 16),
      tags: normalizeStringList(candidate.tags, 24),
      notes: typeof candidate.notes === 'string' ? candidate.notes.trim() : '',
    })
  }

  return Array.from(normalized.values()).sort((left, right) => left.label.localeCompare(right.label, 'ru'))
}

function normalizeAgreements(
  values: unknown,
  contexts: MessengerProjectContextRecord[],
  subjects: MessengerProjectSubjectRecord[],
) {
  const normalized = new Map<string, MessengerProjectAgreementRecord>()
  const allowedContextIds = new Set(contexts.map(context => context.id))
  const allowedSubjectIds = new Set(subjects.map(subject => subject.id))

  for (const [index, item] of (Array.isArray(values) ? values : []).entries()) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const candidate = item as Partial<MessengerProjectAgreementRecord>
    const label = typeof candidate.label === 'string' ? candidate.label.trim() : ''
    if (!label) {
      continue
    }

    const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : `agreement-${index + 1}`
    normalized.set(id, {
      id,
      label,
      type: normalizeAgreementType(typeof candidate.type === 'string' ? candidate.type : undefined),
      status: normalizeAgreementStatus(typeof candidate.status === 'string' ? candidate.status : undefined),
      subjectIds: normalizeStringList(candidate.subjectIds, 24).filter(subjectId => allowedSubjectIds.has(subjectId)),
      contextIds: normalizeStringList(candidate.contextIds, 24).filter(contextId => allowedContextIds.has(contextId)),
      managerAgentIds: normalizeStringList(candidate.managerAgentIds, 16),
      summary: typeof candidate.summary === 'string' ? candidate.summary.trim() : '',
      terms: normalizeStringList(candidate.terms, 32),
      dueAt: typeof candidate.dueAt === 'string' ? candidate.dueAt.trim() : '',
    })
  }

  return Array.from(normalized.values()).sort((left, right) => left.label.localeCompare(right.label, 'ru'))
}

function normalizeCabinetLinks(
  values: unknown,
  contexts: MessengerProjectContextRecord[],
  agreements: MessengerProjectAgreementRecord[],
) {
  const normalized = new Map<string, MessengerProjectCabinetLinkRecord>()
  const allowedContextIds = new Set(contexts.map(context => context.id))
  const allowedAgreementIds = new Set(agreements.map(agreement => agreement.id))

  for (const [index, item] of (Array.isArray(values) ? values : []).entries()) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const candidate = item as Partial<MessengerProjectCabinetLinkRecord>
    const sourceContextId = typeof candidate.sourceContextId === 'string' ? candidate.sourceContextId.trim() : ''
    const targetContextId = typeof candidate.targetContextId === 'string' ? candidate.targetContextId.trim() : ''
    if (!sourceContextId || !targetContextId || !allowedContextIds.has(sourceContextId) || !allowedContextIds.has(targetContextId) || sourceContextId === targetContextId) {
      continue
    }

    const sharedCapabilities = Array.from(new Set((Array.isArray(candidate.sharedCapabilities) ? candidate.sharedCapabilities : [])
      .map(item => normalizeProjectCapability(typeof item === 'string' ? item : ''))
      .filter((item): item is MessengerProjectCapability => Boolean(item))))
      .sort((left, right) => left.localeCompare(right, 'en'))

    const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : `cabinet-link-${index + 1}`
    normalized.set(id, {
      id,
      sourceContextId,
      targetContextId,
      kind: normalizeCabinetLinkKind(typeof candidate.kind === 'string' ? candidate.kind : undefined),
      status: normalizeCoverageStatus(typeof candidate.status === 'string' ? candidate.status : undefined),
      sharedCapabilities,
      agreementIds: normalizeStringList(candidate.agreementIds, 24).filter(agreementId => allowedAgreementIds.has(agreementId)),
      notes: typeof candidate.notes === 'string' ? candidate.notes.trim() : '',
    })
  }

  return Array.from(normalized.values()).sort((left, right) => left.id.localeCompare(right.id, 'en'))
}

function normalizeProject(input: MessengerProjectNormalizationInput, fallbackIndex = 0): MessengerProjectRecord {
  const base = createDefaultProject(input)
  const contexts = normalizeContexts(input.contexts)
  const agentBindings = normalizeBindings(input.agentBindings, contexts)
  const subjects = normalizeSubjects(input.subjects, contexts)
  const agreements = normalizeAgreements(input.agreements, contexts, subjects)
  const cabinetLinks = normalizeCabinetLinks(input.cabinetLinks, contexts, agreements)
  const assignedByContext = new Map<string, Set<string>>()

  for (const binding of agentBindings) {
    if (!assignedByContext.has(binding.contextId)) {
      assignedByContext.set(binding.contextId, new Set<string>())
    }

    assignedByContext.get(binding.contextId)!.add(binding.agentId)
  }

  return {
    ...base,
    slug: normalizeSlug(typeof input.slug === 'string' ? input.slug : '', `project-${fallbackIndex + 1}`),
    label: typeof input.label === 'string' && input.label.trim() ? input.label.trim() : base.label,
    description: typeof input.description === 'string' ? input.description.trim() : base.description,
    targetKind: normalizeProjectTargetKind(typeof input.targetKind === 'string' ? input.targetKind : undefined),
    repositoryId: typeof input.repositoryId === 'string' ? input.repositoryId.trim() : '',
    rootPath: typeof input.rootPath === 'string' ? input.rootPath.trim() : '',
    defaultBranch: typeof input.defaultBranch === 'string' && input.defaultBranch.trim() ? input.defaultBranch.trim() : 'main',
    contexts: contexts.map(context => ({
      ...context,
      assignedAgentIds: Array.from(new Set([
        ...context.assignedAgentIds,
        ...Array.from(assignedByContext.get(context.id) || []),
      ])).sort((left, right) => left.localeCompare(right, 'en')),
      syncContract: {
        ...defaultSyncContract(),
        ...context.syncContract,
      },
    })),
    agentBindings,
    subjects,
    cabinetLinks,
    agreements,
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : base.createdAt,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : base.updatedAt,
  }
}

async function ensureStorage() {
  await mkdir(dirname(STORAGE_PATH), { recursive: true })
}

async function readProjectsFile(): Promise<MessengerProjectFile> {
  await ensureStorage()

  try {
    const raw = await readFile(STORAGE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<MessengerProjectFile>

    return {
      projects: Array.isArray(parsed.projects)
        ? parsed.projects.map((project, index) => normalizeProject(project as Partial<MessengerProjectRecord>, index))
        : [],
    }
  } catch {
    return { projects: [] }
  }
}

async function writeProjectsFile(payload: MessengerProjectFile) {
  await ensureStorage()
  await writeFile(STORAGE_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8')
}

function pickRecommendedAgents(targetKind: MessengerProjectTargetKind, capability: MessengerProjectCapability) {
  switch (capability) {
    case 'frontend':
    case 'styles':
      return targetKind === 'messenger' ? ['messenger-ui'] : ['platform-ui']
    case 'backend':
    case 'logic':
    case 'integration':
      return targetKind === 'messenger' ? ['orchestrator', 'realtime-calls'] : ['api-platform', 'orchestrator']
    case 'data':
      return ['db-platform']
    case 'qa':
      return ['qa-release']
    case 'docs':
      return ['orchestrator']
  }
}

export async function listMessengerProjects() {
  const payload = await readProjectsFile()
  return payload.projects
}

export function listMessengerProjectTemplates() {
  return PROJECT_TEMPLATES
}

export async function getMessengerProject(projectId: string) {
  const payload = await readProjectsFile()
  return payload.projects.find(project => project.id === projectId || project.slug === projectId) ?? null
}

export async function upsertMessengerProject(input: MessengerProjectUpsertInput) {
  const payload = await readProjectsFile()
  const existingIndex = payload.projects.findIndex(project => project.id === input.id || project.slug === normalizeSlug(input.slug, 'project'))
  const current = existingIndex >= 0 ? payload.projects[existingIndex] : createDefaultProject({
    id: input.id || randomUUID(),
    slug: input.slug,
    label: input.label,
  })
  const nextProject = normalizeProject({
    ...current,
    ...input,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  })

  if (existingIndex >= 0) {
    payload.projects[existingIndex] = nextProject
  } else {
    payload.projects.push(nextProject)
  }

  await writeProjectsFile(payload)
  return nextProject
}

export async function deleteMessengerProject(projectId: string) {
  const payload = await readProjectsFile()
  const nextProjects = payload.projects.filter(project => project.id !== projectId && project.slug !== projectId)
  if (nextProjects.length === payload.projects.length) {
    return false
  }

  await writeProjectsFile({ projects: nextProjects })
  return true
}

export function buildMessengerProjectFromTemplate(
  templateId: string,
  overrides?: Partial<Pick<MessengerProjectRecord, 'slug' | 'label' | 'description' | 'repositoryId' | 'rootPath' | 'defaultBranch'>>,
) {
  const template = PROJECT_TEMPLATES.find(item => item.id === templateId)
  if (!template) {
    return null
  }

  return normalizeProject({
    ...template.project,
    id: randomUUID(),
    slug: overrides?.slug || template.project.slug,
    label: overrides?.label || template.project.label,
    description: overrides?.description || template.project.description,
    repositoryId: overrides?.repositoryId ?? template.project.repositoryId,
    rootPath: overrides?.rootPath ?? template.project.rootPath,
    defaultBranch: overrides?.defaultBranch ?? template.project.defaultBranch,
  })
}

export async function buildMessengerProjectSyncBrief(projectId: string, contextId?: string): Promise<MessengerProjectSyncBrief | null> {
  const project = await getMessengerProject(projectId)
  if (!project) {
    return null
  }

  const agents = await listMessengerAgents()
  const agentMap = new Map(agents.map(agent => [agent.id, agent]))
  const filteredContexts = contextId ? project.contexts.filter(context => context.id === contextId) : project.contexts
  const bindingsByContext = new Map<string, MessengerProjectAgentBindingRecord[]>()

  for (const binding of project.agentBindings.filter(binding => binding.active)) {
    if (!bindingsByContext.has(binding.contextId)) {
      bindingsByContext.set(binding.contextId, [])
    }

    bindingsByContext.get(binding.contextId)!.push(binding)
  }

  const contexts = filteredContexts.map((context) => {
    const bindings = bindingsByContext.get(context.id) || []
    const assignedAgentIds = new Set(bindings.map(binding => binding.agentId))
    const missingCapabilities = context.capabilities
      .filter(item => item.status !== 'done' && !bindings.some(binding => binding.responsibilities.includes(item.capability)))
      .map(item => item.capability)

    const recommendedAgentIds = Array.from(new Set(context.capabilities.flatMap(item => pickRecommendedAgents(project.targetKind, item.capability))))
      .filter(agentId => !assignedAgentIds.has(agentId))

    return {
      ...context,
      bindings,
      recommendedAgentIds,
      missingCapabilities,
    }
  })

  const coverage = PROJECT_CAPABILITIES.map((capability) => {
    const counts = COVERAGE_STATUSES.reduce<Record<MessengerProjectCoverageStatus, number>>((accumulator, status) => {
      accumulator[status] = 0
      return accumulator
    }, {} as Record<MessengerProjectCoverageStatus, number>)

    for (const context of filteredContexts) {
      const record = context.capabilities.find(item => item.capability === capability)
      if (record) {
        counts[record.status] += 1
      }
    }

    return {
      capability,
      counts,
      total: Object.values(counts).reduce((sum, count) => sum + count, 0),
    }
  })

  const activeBindings = project.agentBindings.filter(binding => binding.active && filteredContexts.some(context => context.id === binding.contextId))
  const agentIds = Array.from(new Set(activeBindings.map(binding => binding.agentId)))
  const agentDetails = await Promise.all(agentIds.map(async (agentId) => {
    const settings = await getMessengerAgentSettings(agentId)
    const activeRepository = resolveMessengerAgentActiveRepository(settings)
    const workspacePath = activeRepository?.path || settings.ssh.workspacePath
    const relatedBindings = activeBindings.filter(binding => binding.agentId === agentId)
    const responsibilities = Array.from(new Set(relatedBindings.flatMap(binding => binding.responsibilities))).sort((left, right) => left.localeCompare(right, 'en'))
    const roleSet = Array.from(new Set(relatedBindings.map(binding => binding.role))).sort((left, right) => left.localeCompare(right, 'en')) as MessengerProjectAgentRole[]
    const relatedContexts = filteredContexts.filter(context => relatedBindings.some(binding => binding.contextId === context.id))
    const pathPool = new Set<string>([
      ...relatedContexts.flatMap(context => context.syncContract.frontendPaths),
      ...relatedContexts.flatMap(context => context.syncContract.backendPaths),
      ...relatedContexts.flatMap(context => context.syncContract.sharedPaths),
      ...relatedContexts.flatMap(context => context.syncContract.docsPaths),
    ])

    return {
      agentId,
      displayName: agentMap.get(agentId)?.displayName || (await findMessengerAgentById(agentId))?.displayName || agentId,
      contextIds: relatedContexts.map(context => context.id),
      roleSet,
      responsibilities,
      repositoryAligned: Boolean(project.repositoryId && activeRepository?.id && activeRepository.id === project.repositoryId)
        || Boolean(project.rootPath && workspacePath && pathPool.size && Array.from(pathPool).some(path => workspacePath.includes(path.split('/')[0] || workspacePath) || path.includes(workspacePath))),
      knowledgeSourceCount: settings.knowledge.sources.filter(source => source.enabled).length,
      workspacePath,
    }
  }))

  const gaps: MessengerProjectSyncBrief['gaps'] = []

  for (const context of contexts) {
    if (!context.bindings.length) {
      gaps.push({
        type: 'agent-missing',
        contextId: context.id,
        message: `Контекст "${context.label}" пока не закреплён ни за одним агентом.`,
      })
    }

    for (const capability of context.missingCapabilities) {
      gaps.push({
        type: 'coverage-missing',
        contextId: context.id,
        message: `Для контекста "${context.label}" нет активного ответственного по capability ${capability}.`,
      })
    }
  }

  for (const agent of agentDetails.filter(item => !item.repositoryAligned && project.rootPath)) {
    gaps.push({
      type: 'repository-mismatch',
      agentId: agent.agentId,
      message: `Агент ${agent.displayName} работает не из целевого project root или не привязан к нужному repositoryId.`,
    })
  }

  return {
    project,
    coverage,
    contexts,
    agents: agentDetails,
    gaps,
  }
}

export async function buildMessengerProjectManagerBrief(projectId: string): Promise<MessengerProjectManagerBrief | null> {
  const project = await getMessengerProject(projectId)
  if (!project) {
    return null
  }

  const agents = await listMessengerAgents()
  const agentMap = new Map(agents.map(agent => [agent.id, agent]))
  const contextMap = new Map(project.contexts.map(context => [context.id, context]))
  const subjectMap = new Map(project.subjects.map(subject => [subject.id, subject]))
  const agreementMap = new Map(project.agreements.map(agreement => [agreement.id, agreement]))

  const subjects = project.subjects.map(subject => ({
    ...subject,
    managerAgents: subject.managerAgentIds.map(agentId => agentMap.get(agentId)?.displayName || agentId),
    contextLabels: subject.contextIds.map(contextId => contextMap.get(contextId)?.label || contextId),
  }))

  const agreements = project.agreements.map(agreement => ({
    ...agreement,
    managerAgents: agreement.managerAgentIds.map(agentId => agentMap.get(agentId)?.displayName || agentId),
    subjectLabels: agreement.subjectIds.map(subjectId => subjectMap.get(subjectId)?.label || subjectId),
    contextLabels: agreement.contextIds.map(contextId => contextMap.get(contextId)?.label || contextId),
  }))

  const cabinetLinks = project.cabinetLinks.map(link => ({
    ...link,
    sourceLabel: contextMap.get(link.sourceContextId)?.label || link.sourceContextId,
    targetLabel: contextMap.get(link.targetContextId)?.label || link.targetContextId,
    agreementLabels: link.agreementIds.map(agreementId => agreementMap.get(agreementId)?.label || agreementId),
  }))

  const managerAgentIds = Array.from(new Set([
    ...project.subjects.flatMap(subject => subject.managerAgentIds),
    ...project.agreements.flatMap(agreement => agreement.managerAgentIds),
  ]))
  const managerAgents = managerAgentIds.map((agentId) => ({
    agentId,
    displayName: agentMap.get(agentId)?.displayName || agentId,
    subjectIds: project.subjects.filter(subject => subject.managerAgentIds.includes(agentId)).map(subject => subject.id),
    agreementIds: project.agreements.filter(agreement => agreement.managerAgentIds.includes(agentId)).map(agreement => agreement.id),
    contextIds: Array.from(new Set([
      ...project.subjects.filter(subject => subject.managerAgentIds.includes(agentId)).flatMap(subject => subject.contextIds),
      ...project.agreements.filter(agreement => agreement.managerAgentIds.includes(agentId)).flatMap(agreement => agreement.contextIds),
    ])),
  }))

  const gaps: MessengerProjectManagerBrief['gaps'] = []

  for (const subject of project.subjects) {
    if (!subject.managerAgentIds.length) {
      gaps.push({
        type: 'subject-manager-missing',
        subjectId: subject.id,
        message: `Для субъекта "${subject.label}" не назначен manager-agent.`,
      })
    }
  }

  for (const agreement of project.agreements) {
    if (!agreement.managerAgentIds.length) {
      gaps.push({
        type: 'agreement-manager-missing',
        agreementId: agreement.id,
        message: `Для договорённости "${agreement.label}" не назначен manager-agent.`,
      })
    }

    if (!agreement.subjectIds.length) {
      gaps.push({
        type: 'agreement-subject-missing',
        agreementId: agreement.id,
        message: `Договорённость "${agreement.label}" не связана ни с одним субъектом.`,
      })
    }
  }

  for (const link of project.cabinetLinks) {
    if (!link.agreementIds.length && link.kind === 'approval') {
      gaps.push({
        type: 'cabinet-link-unbound',
        cabinetLinkId: link.id,
        message: `Связь между кабинетами ${contextMap.get(link.sourceContextId)?.label || link.sourceContextId} и ${contextMap.get(link.targetContextId)?.label || link.targetContextId} не закреплена договорённостью.`,
      })
    }
  }

  return {
    project,
    subjects,
    agreements,
    cabinetLinks,
    managerAgents,
    gaps,
  }
}

export async function upsertMessengerProjectSubject(projectId: string, input: Partial<MessengerProjectSubjectRecord> & Pick<MessengerProjectSubjectRecord, 'label'>) {
  const project = await getMessengerProject(projectId)
  if (!project) {
    return null
  }

  const currentItems = project.subjects.filter(subject => !input.id || subject.id !== input.id)
  const nextItem: MessengerProjectSubjectRecord = {
    id: input.id?.trim() || randomUUID(),
    label: input.label.trim(),
    kind: normalizeSubjectKind(input.kind),
    status: normalizeSubjectStatus(input.status),
    contextIds: normalizeStringList(input.contextIds, 24),
    managerAgentIds: normalizeStringList(input.managerAgentIds, 16),
    tags: normalizeStringList(input.tags, 24),
    notes: typeof input.notes === 'string' ? input.notes.trim() : '',
  }

  return await upsertMessengerProject({
    ...project,
    subjects: [...currentItems, nextItem],
    slug: project.slug,
    label: project.label,
  })
}

export async function deleteMessengerProjectSubject(projectId: string, subjectId: string) {
  const project = await getMessengerProject(projectId)
  if (!project) {
    return null
  }

  const subjects = project.subjects.filter(subject => subject.id !== subjectId)
  const agreements = project.agreements.map(agreement => ({
    ...agreement,
    subjectIds: agreement.subjectIds.filter(id => id !== subjectId),
  }))

  return await upsertMessengerProject({
    ...project,
    subjects,
    agreements,
    slug: project.slug,
    label: project.label,
  })
}

export async function upsertMessengerProjectAgreement(projectId: string, input: Partial<MessengerProjectAgreementRecord> & Pick<MessengerProjectAgreementRecord, 'label'>) {
  const project = await getMessengerProject(projectId)
  if (!project) {
    return null
  }

  const currentItems = project.agreements.filter(agreement => !input.id || agreement.id !== input.id)
  const nextItem: MessengerProjectAgreementRecord = {
    id: input.id?.trim() || randomUUID(),
    label: input.label.trim(),
    type: normalizeAgreementType(input.type),
    status: normalizeAgreementStatus(input.status),
    subjectIds: normalizeStringList(input.subjectIds, 24),
    contextIds: normalizeStringList(input.contextIds, 24),
    managerAgentIds: normalizeStringList(input.managerAgentIds, 16),
    summary: typeof input.summary === 'string' ? input.summary.trim() : '',
    terms: normalizeStringList(input.terms, 32),
    dueAt: typeof input.dueAt === 'string' ? input.dueAt.trim() : '',
  }

  return await upsertMessengerProject({
    ...project,
    agreements: [...currentItems, nextItem],
    slug: project.slug,
    label: project.label,
  })
}

export async function deleteMessengerProjectAgreement(projectId: string, agreementId: string) {
  const project = await getMessengerProject(projectId)
  if (!project) {
    return null
  }

  const agreements = project.agreements.filter(agreement => agreement.id !== agreementId)
  const cabinetLinks = project.cabinetLinks.map(link => ({
    ...link,
    agreementIds: link.agreementIds.filter(id => id !== agreementId),
  }))

  return await upsertMessengerProject({
    ...project,
    agreements,
    cabinetLinks,
    slug: project.slug,
    label: project.label,
  })
}

export async function upsertMessengerProjectCabinetLink(projectId: string, input: Partial<MessengerProjectCabinetLinkRecord> & Pick<MessengerProjectCabinetLinkRecord, 'sourceContextId' | 'targetContextId'>) {
  const project = await getMessengerProject(projectId)
  if (!project) {
    return null
  }

  const currentItems = project.cabinetLinks.filter(link => !input.id || link.id !== input.id)
  const nextItem: MessengerProjectCabinetLinkRecord = {
    id: input.id?.trim() || randomUUID(),
    sourceContextId: input.sourceContextId.trim(),
    targetContextId: input.targetContextId.trim(),
    kind: normalizeCabinetLinkKind(input.kind),
    status: normalizeCoverageStatus(input.status),
    sharedCapabilities: Array.from(new Set((Array.isArray(input.sharedCapabilities) ? input.sharedCapabilities : [])
      .map(item => normalizeProjectCapability(typeof item === 'string' ? item : ''))
      .filter((item): item is MessengerProjectCapability => Boolean(item)))),
    agreementIds: normalizeStringList(input.agreementIds, 24),
    notes: typeof input.notes === 'string' ? input.notes.trim() : '',
  }

  return await upsertMessengerProject({
    ...project,
    cabinetLinks: [...currentItems, nextItem],
    slug: project.slug,
    label: project.label,
  })
}

export async function deleteMessengerProjectCabinetLink(projectId: string, cabinetLinkId: string) {
  const project = await getMessengerProject(projectId)
  if (!project) {
    return null
  }

  return await upsertMessengerProject({
    ...project,
    cabinetLinks: project.cabinetLinks.filter(link => link.id !== cabinetLinkId),
    slug: project.slug,
    label: project.label,
  })
}