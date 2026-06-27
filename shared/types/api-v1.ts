import type {
  ProjectCommunicationActor,
  ProjectCommunicationBootstrap,
  ProjectCommunicationRoomParticipant,
} from './communications'
import type { HybridControl, HybridControlCoordinationBrief } from './project/project'
import type { ProjectScopeDetailBundle, ProjectScopeSource, ProjectScopeType } from './project/project-governance'

export interface ApiV1Error {
  code: string
  message: string
  field?: string
}

export interface ApiV1Meta {
  requestId: string
  revision: string
  generatedAt: string
}

export interface ApiV1Envelope<T> {
  data: T
  meta: ApiV1Meta
  errors: ApiV1Error[]
}

export type ApiV1OutboxDeliveryStatus = 'pending' | 'processing' | 'done' | 'failed' | 'skipped'

export type ApiV1OutboxEmitMode = 'best_effort'

export type ApiV1OutboxEmitStatus = 'emitted' | 'skipped' | 'failed'

export type ApiV1OutboxDeliveryTarget =
  | 'activity_feed'
  | 'messenger'
  | 'notification'
  | 'audit'
  | 'integration'

export type ApiV1OutboxAudience = 'internal' | 'client' | 'contractor' | 'worker' | 'system'

export interface ApiV1OutboxActor {
  type: 'admin' | 'client' | 'contractor' | 'worker' | 'service' | 'system'
  id: string | number | null
  role: string
  displayName: string
}

export interface ApiV1OutboxEmitResult {
  mode: ApiV1OutboxEmitMode
  status: ApiV1OutboxEmitStatus
  eventId: string | null
  idempotencyKey: string | null
  reason?: string
}

export interface ApiV1ProjectRef {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  updatedAt: string
}

export interface ApiV1ClientProjectShellProject extends ApiV1ProjectRef {
  pages: string[]
  statusLabel: string
}

export interface ApiV1ClientProjectShellPhase {
  id: string
  phaseKey: string
  title: string
  status: string
  percent: number
}

export interface ApiV1ClientProjectShellControlSummary {
  healthStatus: string
  healthLabel: string
  activePhaseTitle: string
  activeSprintTitle: string
  blockerCount: number
  overdueSprints: number
  totalTasks: number
  doneTasks: number
  phasePercent: number
  taskPercent: number
  nextReviewDate: string
}

export interface ApiV1ClientProjectShellOverview {
  phases: ApiV1ClientProjectShellPhase[]
  controlSummary: ApiV1ClientProjectShellControlSummary
}

export interface ApiV1ClientProjectShell {
  project: ApiV1ClientProjectShellProject
  overview: ApiV1ClientProjectShellOverview
  team: ApiV1ClientProjectTeam
}

export type ApiV1ClientProjectControlState = Pick<
  HybridControl,
  'cadenceDays'
  | 'nextReviewDate'
  | 'lastSyncAt'
  | 'phases'
  | 'sprints'
  | 'checkpoints'
  | 'callInsights'
  | 'blockers'
>

export interface ApiV1ClientProjectControl {
  project: ApiV1ProjectRef
  control: ApiV1ClientProjectControlState
  coordinationBrief: HybridControlCoordinationBrief
}

export type ApiV1ClientRoadmapStatus =
  | 'planned'
  | 'active'
  | 'review'
  | 'blocked'
  | 'done'
  | 'stable'
  | 'warning'
  | 'critical'

export interface ApiV1ClientRoadmapPhase {
  id: string
  phaseKey: string
  title: string
  status: ApiV1ClientRoadmapStatus
  statusLabel: string
  percent: number
  startDate: string
  endDate: string
  factEndDate: string
  deliverable: string
  gatesTotal: number
  gatesDone: number
  active: boolean
}

export interface ApiV1ClientRoadmapSprint {
  id: string
  linkedPhaseKey: string
  name: string
  status: ApiV1ClientRoadmapStatus
  statusLabel: string
  startDate: string
  endDate: string
  goal: string
  focus: string
  tasksTotal: number
  tasksDone: number
  progressPercent: number
  overdue: boolean
  active: boolean
}

export interface ApiV1ClientRoadmapCheckpoint {
  id: string
  title: string
  category: string
  status: ApiV1ClientRoadmapStatus
  statusLabel: string
}

export interface ApiV1ClientRoadmapReport {
  id: string
  title: string
  summary: string
  tone: ApiV1ClientRoadmapStatus
  toneLabel: string
  occurredAt: string
  relatedPhaseKey: string
  decisions: string[]
  nextSteps: string[]
  blockers: string[]
  approvals: string[]
}

export interface ApiV1ClientProjectRoadmapSummary {
  healthStatus: string
  healthLabel: string
  activePhaseTitle: string
  activeSprintTitle: string
  nextMilestoneTitle: string
  nextReviewDate: string
  phasePercent: number
  taskPercent: number
  totalTasks: number
  doneTasks: number
  completedPhases: number
  totalPhases: number
  blockerCount: number
  overdueSprints: number
}

export interface ApiV1ClientProjectRoadmap {
  project: ApiV1ProjectRef
  summary: ApiV1ClientProjectRoadmapSummary
  phases: ApiV1ClientRoadmapPhase[]
  sprints: ApiV1ClientRoadmapSprint[]
  checkpoints: ApiV1ClientRoadmapCheckpoint[]
  reports: ApiV1ClientRoadmapReport[]
}

export interface ApiV1ProjectCallInsightClientVisibility {
  project: ApiV1ProjectRef
  insight: {
    id: string
    title: string
    summary: string
    tone: string
    clientVisible: boolean
    updatedAt: string
  }
  outbox: ApiV1OutboxEmitResult
}

export type ApiV1ClientProjectScopeDetail = ProjectScopeDetailBundle

export type ApiV1ClientScopeSettingValue = string | number | boolean | null

export interface ApiV1ClientProjectScopeSettingsUpdate {
  ok: true
  revision: string
  scope: {
    scopeType: ProjectScopeType
    scopeSource: ProjectScopeSource
    scopeId: string
  }
  settings: Record<string, ApiV1ClientScopeSettingValue>
}

export interface ApiV1ClientProjectCommunicationsBootstrap extends Omit<
  ProjectCommunicationBootstrap,
  'actor' | 'roomParticipants' | 'coordination' | 'callInsights'
> {
  actor: ProjectCommunicationActor
  roomParticipants: ProjectCommunicationRoomParticipant[]
  coordination: HybridControlCoordinationBrief
  callInsights: ApiV1ClientProjectControlState['callInsights']
}

export type ApiV1ClientProfileFile = {
  url: string
  filename: string
  label: string
  category: string
  mimeType?: string
  sizeBytes?: number
  uploadedAt?: string
}

export type ApiV1ClientProfileValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | ApiV1ClientProfileFile[]

export interface ApiV1ClientProjectProfile {
  project: ApiV1ProjectRef
  profile: Record<string, ApiV1ClientProfileValue>
}

export type ApiV1ClientPageJson =
  | string
  | number
  | boolean
  | null
  | ApiV1ClientPageJson[]
  | { [key: string]: ApiV1ClientPageJson }

export interface ApiV1ClientProjectPageInfo {
  slug: string
  title: string
  contentUpdatedAt: string
  answersUpdatedAt: string
}

export interface ApiV1ClientProjectPageAnswers {
  pageSlug: string
  selections: Record<string, boolean | number>
  textAnswers: Record<string, string>
  numberAnswers: Record<string, number>
}

export interface ApiV1ClientProjectPage {
  project: ApiV1ProjectRef
  page: ApiV1ClientProjectPageInfo
  content: Record<string, ApiV1ClientPageJson>
  answers: ApiV1ClientProjectPageAnswers
}

export type ApiV1ClientWorkItemStatus =
  | 'pending'
  | 'planned'
  | 'in_progress'
  | 'done'
  | 'paused'
  | 'cancelled'
  | 'skipped'

export interface ApiV1ClientProjectWorkItem {
  id: number
  title: string
  workType: string
  workTypeLabel: string
  status: ApiV1ClientWorkItemStatus
  statusLabel: string
  dateStart: string
  dateEnd: string
  responsibleName: string
  photoCount: number
  overdue: boolean
  sortOrder: number
}

export interface ApiV1ClientProjectWorkItemsSummary {
  total: number
  completed: number
  active: number
  planned: number
  paused: number
  cancelled: number
  overdue: number
  progressPercent: number | null
  nextItemTitle: string
  nextItemDate: string
}

export interface ApiV1ClientProjectWorkItems {
  project: ApiV1ProjectRef
  summary: ApiV1ClientProjectWorkItemsSummary
  items: ApiV1ClientProjectWorkItem[]
}

export type ApiV1ClientProjectTeamSubjectKind = 'contractor' | 'crew' | 'worker' | 'designer' | 'manager'

export interface ApiV1ClientProjectTeamMember {
  id: string
  subjectKind: ApiV1ClientProjectTeamSubjectKind
  displayName: string
  secondaryName: string
  avatarInitial: string
  roleLabels: string[]
  workTypeLabels: string[]
  communicationMode: 'portal'
}

export interface ApiV1ClientProjectTeamSummary {
  total: number
  contractors: number
  crews: number
  workers: number
}

export interface ApiV1ClientProjectTeam {
  project: ApiV1ProjectRef
  summary: ApiV1ClientProjectTeamSummary
  members: ApiV1ClientProjectTeamMember[]
}

export type ApiV1ClientProjectDocumentKind =
  | 'contract'
  | 'invoice'
  | 'tor'
  | 'brief'
  | 'survey'
  | 'report'
  | 'album'
  | 'act'
  | 'specification'
  | 'approval'
  | 'other'

export interface ApiV1ClientProjectDocument {
  id: string
  kind: ApiV1ClientProjectDocumentKind
  title: string
  filename: string
  url: string
  category: string
  status: string
  statusLabel: string
  source: 'profile' | 'documents'
  summary: string
  mimeType: string
  sizeBytes: number | null
  issuedAt: string
  updatedAt: string
  isDownloadable: boolean
}

export interface ApiV1ClientProjectDocumentFacts {
  contractNumber: string
  contractDate: string
  contractStatus: string
  contractStatusLabel: string
  contractStatusColor: string
  contractParties: string
  paymentStatus: string
  paymentStatusLabel: string
  paymentStatusColor: string
  invoiceAmount: string
  invoiceAdvancePct: string
  invoiceDate: string
  invoicePaymentDetails: string
  torScope: string
  torExclusions: string
  torTimeline: string
  torDeliverables: string
}

export interface ApiV1ClientProjectDocumentsSummary {
  total: number
  downloadable: number
  contracts: number
  invoices: number
  reports: number
  media: number
}

export interface ApiV1ClientProjectDocuments {
  project: ApiV1ProjectRef
  facts: ApiV1ClientProjectDocumentFacts
  summary: ApiV1ClientProjectDocumentsSummary
  items: ApiV1ClientProjectDocument[]
}

export type ApiV1ClientApprovalKind =
  | 'gate'
  | 'document'
  | 'extra_service'
  | 'call_decision'

export type ApiV1ClientApprovalDecision =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'cancelled'
  | 'recorded'

export type ApiV1ClientApprovalScopeType =
  | 'project'
  | 'phase'
  | 'gate'
  | 'document'
  | 'extra_service'
  | 'call_insight'

export interface ApiV1ClientApprovalScopeRef {
  type: ApiV1ClientApprovalScopeType
  id: string
  title: string
  href: string
}

export interface ApiV1ClientApprovalOption {
  value: 'approve' | 'reject' | 'request_changes' | 'open'
  label: string
}

export interface ApiV1ClientApprovalActor {
  role: 'client' | 'studio' | 'system'
  displayName: string
}

export interface ApiV1ClientPendingApproval {
  id: string
  kind: ApiV1ClientApprovalKind
  title: string
  summary: string
  scopeRef: ApiV1ClientApprovalScopeRef
  requestedAt: string
  dueDate: string
  blocking: boolean
  awaiting: 'client' | 'studio'
  status: 'pending' | 'awaiting_studio'
  statusLabel: string
  sourceUrl: string
  sourceLabel: string
  options: ApiV1ClientApprovalOption[]
  clientVisible: true
}

export interface ApiV1ClientApprovalHistoryItem {
  id: string
  kind: ApiV1ClientApprovalKind
  title: string
  summary: string
  scopeRef: ApiV1ClientApprovalScopeRef
  decision: ApiV1ClientApprovalDecision
  decisionLabel: string
  decidedBy: ApiV1ClientApprovalActor
  decidedAt: string
  comment: string
  revision: string
  sourceUrl: string
  sourceLabel: string
  clientVisible: true
}

export interface ApiV1ClientProjectApprovalsSummary {
  total: number
  pendingCount: number
  overdueCount: number
  awaitingClient: number
  awaitingStudio: number
  approvedCount: number
  changesRequestedCount: number
  rejectedCount: number
  lastDecisionAt: string
}

export interface ApiV1ClientProjectApprovals {
  project: ApiV1ProjectRef
  summary: ApiV1ClientProjectApprovalsSummary
  pending: ApiV1ClientPendingApproval[]
  history: ApiV1ClientApprovalHistoryItem[]
}

export type ApiV1ClientExtraServiceStatus =
  | 'requested'
  | 'quoted'
  | 'approved'
  | 'contract_sent'
  | 'paid'
  | 'in_progress'
  | 'done'
  | 'rejected'
  | 'cancelled'

export interface ApiV1ClientExtraServiceDocumentRef {
  kind: 'contract' | 'invoice'
  available: boolean
  title: string
}

export interface ApiV1ClientExtraServiceDocuments {
  contract: ApiV1ClientExtraServiceDocumentRef
  invoice: ApiV1ClientExtraServiceDocumentRef
}

export interface ApiV1ClientExtraServiceActions {
  canApprove: boolean
  canCancel: boolean
}

export interface ApiV1ClientExtraService {
  id: number
  origin: 'client' | 'studio'
  serviceKey: string
  title: string
  description: string
  quantity: string
  unit: string
  unitPrice: number | null
  totalPrice: number | null
  status: ApiV1ClientExtraServiceStatus
  statusLabel: string
  statusColor: string
  clientNotes: string
  documents: ApiV1ClientExtraServiceDocuments
  actions: ApiV1ClientExtraServiceActions
  createdAt: string
  updatedAt: string
}

export interface ApiV1ClientExtraServicesSummary {
  total: number
  awaitingClient: number
  active: number
  completed: number
  cancelled: number
}

export interface ApiV1ClientProjectExtraServices {
  project: ApiV1ProjectRef
  summary: ApiV1ClientExtraServicesSummary
  items: ApiV1ClientExtraService[]
}

export interface ApiV1ClientExtraServiceDocument {
  kind: 'contract' | 'invoice'
  title: string
  content: string
  generatedAt: string
}

export type ApiV1StudioShellZoneKey =
  | 'crm'
  | 'studio'
  | 'design'
  | 'construction'
  | 'messenger'

export type ApiV1StudioShellZoneState = 'ready' | 'draft' | 'next'

export interface ApiV1StudioShellMetric {
  key: string
  label: string
  value: number
  tone: 'neutral' | 'good' | 'warning' | 'critical'
}

export interface ApiV1StudioShellRecentItem {
  id: string
  title: string
  subtitle: string
  href: string
  updatedAt: string
}

export interface ApiV1StudioShellZone {
  key: ApiV1StudioShellZoneKey
  title: string
  summary: string
  state: ApiV1StudioShellZoneState
  stateLabel: string
  metrics: ApiV1StudioShellMetric[]
  recent: ApiV1StudioShellRecentItem[]
}

export interface ApiV1StudioShellProjectSummary {
  total: number
  active: number
  leads: number
  design: number
  construction: number
  completed: number
  taskTotal: number
  taskDone: number
  taskOverdue: number
}

export interface ApiV1StudioShell {
  actor: {
    role: 'admin'
    scope: 'studio'
  }
  projectSummary: ApiV1StudioShellProjectSummary
  zones: Record<ApiV1StudioShellZoneKey, ApiV1StudioShellZone>
  recentProjects: ApiV1StudioShellRecentItem[]
}

export interface ApiV1CrmProjectLink {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  addressableId: string
  updatedAt: string
}

export interface ApiV1CrmClient {
  id: number
  addressableId: string
  displayName: string
  name: string
  phone: string
  email: string
  messenger: string
  messengerNick: string
  address: string
  notes: string
  status: 'lead' | 'active' | 'unlinked'
  profileCompleteness: {
    filled: number
    total: number
    percent: number
  }
  linkedProjects: ApiV1CrmProjectLink[]
  projectsCount: number
  documentsCount: number
  openWorkItems: number
  createdAt: string
}

export interface ApiV1CrmClientsSummary {
  total: number
  linked: number
  unlinked: number
  withMessenger: number
  documents: number
  openWorkItems: number
}

export interface ApiV1CrmClients {
  summary: ApiV1CrmClientsSummary
  items: ApiV1CrmClient[]
  filters: {
    q: string
    projectSlug: string
    limit: number
    offset: number
    total: number
  }
}

export interface ApiV1CrmProjectClientRef {
  id: number
  addressableId: string
  displayName: string
  phone: string
  email: string
  messengerNick: string
}

export interface ApiV1CrmProject {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  addressableId: string
  clientRefs: ApiV1CrmProjectClientRef[]
  documentsCount: number
  workItems: {
    total: number
    done: number
    open: number
    overdue: number
  }
  createdAt: string
  updatedAt: string
}

export interface ApiV1CrmProjectsSummary {
  total: number
  withClients: number
  withoutClients: number
  documents: number
  openWorkItems: number
  overdueWorkItems: number
}

export interface ApiV1CrmProjects {
  summary: ApiV1CrmProjectsSummary
  items: ApiV1CrmProject[]
  filters: {
    q: string
    clientId: number | null
    limit: number
    offset: number
    total: number
  }
}

export type ApiV1TaskSubjectKind = 'contractor' | 'crew' | 'worker'

export type ApiV1TaskSubjectSourceType =
  | 'legacy_contractor'
  | 'derived_project_crew'

export interface ApiV1TaskSubjectSource {
  type: ApiV1TaskSubjectSourceType
  table: 'contractors' | 'project_contractors' | 'work_status_items'
  id: number
  legacyContractorId: number
  projectId: number | null
  migrationStable: false
}

export interface ApiV1TaskSubjectRef {
  id: string
  addressableId: string
  subjectKind: ApiV1TaskSubjectKind
  displayName: string
}

export interface ApiV1TaskProjectRef extends ApiV1ProjectRef {
  addressableId: string
}

export type ApiV1TaskWorkerStatus =
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'ready_for_review'
  | 'blocked'
  | 'needs_fix'
  | 'done'
  | 'cancelled'

export interface ApiV1TaskStatusPolicy {
  canWorkerSelfConfirm: false
  reviewRequired: boolean
  allowedTransitions: ApiV1TaskWorkerStatus[]
}

export interface ApiV1TaskSubjectTaskSummary {
  total: number
  assigned: number
  accepted: number
  inProgress: number
  readyForReview: number
  blocked: number
  needsFix: number
  done: number
  cancelled: number
  open: number
  overdue: number
}

export interface ApiV1TaskSubject {
  id: string
  addressableId: string
  subjectKind: ApiV1TaskSubjectKind
  displayName: string
  secondaryName: string
  legalType: 'company' | 'master' | 'derived'
  contractorType: string
  contact: {
    phone: string
    email: string
    messenger: string
    messengerNick: string
  }
  roleKeys: string[]
  roleLabels: string[]
  workTypeKeys: string[]
  workTypeLabels: string[]
  isForeman: boolean
  parentSubjectId: string
  source: ApiV1TaskSubjectSource
  projectRefs: ApiV1TaskProjectRef[]
  taskSummary: ApiV1TaskSubjectTaskSummary
}

export interface ApiV1TaskSubjectsSummary {
  total: number
  contractors: number
  crews: number
  workers: number
  foremen: number
  openWorkItems: number
  overdueWorkItems: number
}

export interface ApiV1TaskSubjects {
  summary: ApiV1TaskSubjectsSummary
  items: ApiV1TaskSubject[]
  filters: {
    q: string
    projectSlug: string
    subjectKind: ApiV1TaskSubjectKind | ''
    limit: number
    offset: number
    total: number
  }
}

export interface ApiV1TaskWorkItem {
  id: string
  addressableId: string
  source: {
    type: 'legacy_work_status_item'
    table: 'work_status_items'
    id: number
  }
  title: string
  project: ApiV1TaskProjectRef
  workType: string
  workTypeLabel: string
  legacyStatus: string
  workerStatus: ApiV1TaskWorkerStatus
  workerStatusLabel: string
  statusPolicy: ApiV1TaskStatusPolicy
  assignee: ApiV1TaskSubjectRef | null
  legalSubject: ApiV1TaskSubjectRef | null
  dateStart: string
  dateEnd: string
  overdue: boolean
  sortOrder: number
  photoCount: number
  commentCount: number
}

export interface ApiV1TaskWorkItemsSummary {
  total: number
  assigned: number
  accepted: number
  inProgress: number
  readyForReview: number
  blocked: number
  needsFix: number
  done: number
  cancelled: number
  open: number
  overdue: number
}

export interface ApiV1TaskWorkItems {
  summary: ApiV1TaskWorkItemsSummary
  items: ApiV1TaskWorkItem[]
  filters: {
    q: string
    projectSlug: string
    assigneeId: string
    status: ApiV1TaskWorkerStatus | ''
    limit: number
    offset: number
    total: number
  }
}

export type ApiV1TaskStatusActionActorRole = 'admin' | 'contractor' | 'foreman' | 'worker'

export interface ApiV1TaskStatusActionRequest {
  status: ApiV1TaskWorkerStatus
  note?: string
}

export interface ApiV1TaskStatusAction {
  item: ApiV1TaskWorkItem
  transition: {
    from: ApiV1TaskWorkerStatus
    to: ApiV1TaskWorkerStatus
    actorRole: ApiV1TaskStatusActionActorRole
    canWorkerSelfConfirm: false
    reviewRequired: boolean
  }
  audit: {
    source: 'work_status_item_comments'
    id: number | null
  }
  outbox: ApiV1OutboxEmitResult
}

export type ApiV1ProjectActivityAudience = 'admin' | 'client'

export type ApiV1ProjectActivityKind =
  | 'document_created'
  | 'extra_service_requested'
  | 'extra_service_updated'
  | 'work_item_comment'
  | 'work_item_status'
  | 'call_insight'

export type ApiV1ProjectActivityTone = 'neutral' | 'success' | 'warning' | 'critical'

export type ApiV1ProjectActivityActorRole =
  | 'admin'
  | 'studio'
  | 'client'
  | 'contractor'
  | 'worker'
  | 'system'

export interface ApiV1ProjectActivityActor {
  role: ApiV1ProjectActivityActorRole
  displayName: string
}

export interface ApiV1ProjectActivitySource {
  table: 'documents' | 'project_extra_services' | 'work_status_item_comments' | 'project_profile'
  id: string
}

export interface ApiV1ProjectActivityRelated {
  taskId?: number
  taskTitle?: string
  taskStatus?: string
  documentId?: number
  serviceId?: number
  callInsightId?: string
}

export interface ApiV1ProjectActivityItem {
  id: string
  kind: ApiV1ProjectActivityKind
  tone: ApiV1ProjectActivityTone
  audience: ApiV1ProjectActivityAudience
  clientSafe: boolean
  occurredAt: string
  title: string
  summary: string
  body: string
  actor: ApiV1ProjectActivityActor
  source: ApiV1ProjectActivitySource
  related: ApiV1ProjectActivityRelated
}

export interface ApiV1ProjectActivitySummary {
  total: number
  documents: number
  extraServices: number
  workItems: number
  callInsights: number
  warnings: number
}

export interface ApiV1ProjectActivity {
  project: ApiV1ProjectRef
  audience: ApiV1ProjectActivityAudience
  summary: ApiV1ProjectActivitySummary
  items: ApiV1ProjectActivityItem[]
  filters: {
    limit: number
    offset: number
    total: number
  }
}

export type ApiV1StudioEntityType =
  | 'designer'
  | 'designer_project'
  | 'project'
  | 'client'
  | 'contractor'
  | 'document'
  | 'approval'

export interface ApiV1StudioEntityRef {
  id: string
  entityType: ApiV1StudioEntityType
  addressableId: string
  displayName: string
  href: string
}

export type ApiV1StudioDesignerProjectStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived'

export type ApiV1StudioApprovalStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'not_required'

export interface ApiV1StudioDesignerContact {
  phone: string
  email: string
  telegram: string
  website: string
  city: string
}

export interface ApiV1StudioDesigner {
  id: number
  addressableId: string
  entityRef: ApiV1StudioEntityRef
  displayName: string
  companyName: string
  contact: ApiV1StudioDesignerContact
  specializations: string[]
  profileCompleteness: {
    filled: number
    total: number
    percent: number
  }
  servicesSummary: {
    total: number
    enabled: number
    startingPrice: number | null
  }
  packagesSummary: {
    total: number
    enabled: number
    defaultPackageKey: string
  }
  subscriptionsSummary: {
    total: number
    enabled: number
  }
  projectIds: string[]
  clientIds: string[]
  activeProjectsCount: number
  createdAt: string
  updatedAt: string
}

export interface ApiV1StudioDesignerProjectClientRef extends ApiV1StudioEntityRef {
  numericId: number
  phone: string
  email: string
  clientVisible: true
}

export interface ApiV1StudioDesignerProjectContractorRef extends ApiV1StudioEntityRef {
  numericId: number
  role: string
  clientVisible: boolean
}

export interface ApiV1StudioDesignerProjectDocumentRef extends ApiV1StudioEntityRef {
  numericId: number
  category: string
  filename: string
  url: string
  clientVisible: boolean
  createdAt: string
}

export interface ApiV1StudioDesignerProjectApproval {
  id: string
  entityRef: ApiV1StudioEntityRef
  kind: 'document' | 'concept' | 'roadmap' | 'client'
  status: ApiV1StudioApprovalStatus
  assigneeId: string
  dueAt: string
  clientVisible: boolean
  actions: []
}

export interface ApiV1StudioDesignerProjectRoadmapItem {
  id: string
  title: string
  phaseKey: string
  status: 'not_started' | 'active' | 'blocked' | 'done'
  clientVisible: boolean
  source: 'package' | 'default'
}

export interface ApiV1StudioDesignerProjectConstruction {
  status: 'not_linked' | 'linked'
  projectAddressableId: string
  tasksTotal: number
  tasksDone: number
  tasksOpen: number
  tasksOverdue: number
  clientVisible: boolean
}

export interface ApiV1StudioDesignerProjectFinancialSnapshot {
  packageKey: string
  packageTitle: string
  pricePerSqm: number | null
  area: number | null
  totalPrice: number | null
  clientVisible: false
}

export interface ApiV1StudioDesignerProject {
  id: string
  numericId: number
  addressableId: string
  entityRef: ApiV1StudioEntityRef
  designer: ApiV1StudioEntityRef
  project: ApiV1TaskProjectRef
  title: string
  status: ApiV1StudioDesignerProjectStatus
  statusLabel: string
  clientVisible: boolean
  financial: ApiV1StudioDesignerProjectFinancialSnapshot
  clients: ApiV1StudioDesignerProjectClientRef[]
  contractors: ApiV1StudioDesignerProjectContractorRef[]
  documents: {
    total: number
    clientVisible: number
    approvals: number
    items: ApiV1StudioDesignerProjectDocumentRef[]
  }
  approvals: {
    total: number
    pending: number
    items: ApiV1StudioDesignerProjectApproval[]
  }
  roadmap: ApiV1StudioDesignerProjectRoadmapItem[]
  construction: ApiV1StudioDesignerProjectConstruction
  notes: string
  createdAt: string
  updatedAt: string
}

export interface ApiV1StudioDesignerCabinetSummary {
  designers: number
  designProjects: number
  activeDesignProjects: number
  pausedDesignProjects: number
  completedDesignProjects: number
  clients: number
  contractors: number
  documents: number
  approvals: number
  pendingApprovals: number
  constructionLinkedProjects: number
}

export interface ApiV1StudioDesignerCabinet {
  summary: ApiV1StudioDesignerCabinetSummary
  designers: ApiV1StudioDesigner[]
  projects: ApiV1StudioDesignerProject[]
  filters: {
    q: string
    designerId: number | null
    projectSlug: string
    limit: number
    offset: number
    total: number
  }
}
