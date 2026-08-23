export type ClaimType =
  | 'observed'
  | 'declared'
  | 'derived'
  | 'predicted'
  | 'recommended'
  | 'desired'
  | 'hypothetical'
  | 'disputed'
  | 'unknown'

export type Authority = 'unknown' | 'self' | 'peer' | 'domain' | 'official'
export type ConfidenceClass = 'unknown' | 'low' | 'medium' | 'high' | 'verified'
export type RiskClass =
  | 'safe'
  | 'reversible'
  | 'sensitive'
  | 'financial'
  | 'legal'
  | 'physical'
  | 'irreversible'

export interface TimeRange {
  from?: string
  to?: string
}

export interface Claim<T = unknown> {
  claimId: string
  subjectId: string
  predicate: string
  value?: T
  objectId?: string
  claimType: ClaimType
  sourceId: string
  sourceRevision: string
  authority: Authority
  confidenceClass: ConfidenceClass
  validTime?: TimeRange
  observedAt?: string
  recordedAt: string
  expiresAt?: string
  policyRef: string
  provenanceRef: string
  correlationGroup?: string
  status: 'active' | 'superseded' | 'retracted' | 'expired' | 'disputed'
}

export interface DerivedArtifact {
  artifactId: string
  inputClaimIds: string[]
  inputArtifactIds: string[]
  generationContextClaimIds: string[]
  traversalClaimIds: string[]
  audienceScope: string[]
  classification: string
}

export interface ResidualUtility {
  taskRelevance: number
  urgency: number
  authority: number
  confidence: number
  freshness: number
  preference: number
  cognitiveCost: number
}

export interface InstrumentManifest {
  instrumentId: string
  version: string
  supportedDepths: number[]
  supportedSizeClasses: Array<'nano' | 'compact' | 'regular' | 'wide' | 'focus'>
  dependencies: string[]
  conflicts: string[]
  exclusiveGroup?: string
  atomicGroup?: string
  fallbackInstrumentId?: string
  complexityCost: number
  semanticRole: 'identity' | 'current-state' | 'primary-instrument' | 'supporting-context' | 'actions' | 'relations' | 'evidence'
}

export interface ProjectionCandidate extends InstrumentManifest {
  eligible: boolean
  mandatory: boolean
  priorityClass: number
  utility: ResidualUtility
}

export interface InformationBudget {
  maxVisualCost: number
  maxElements: number
}

export interface AdmissionProfile {
  version: string
  weights: Record<keyof ResidualUtility, number>
}

export interface FeasibilityResult {
  feasible: boolean
  conflicts: string[]
  missingDependencies: string[]
  requiredCost: number
  availableCost: number
  escalationMode: 'normal' | 'safety-prioritized' | 'multi-surface' | 'focus' | 'emergency'
  userVisibleReason?: string
}

export interface ProjectionEpoch {
  epochId: string
  intentId: string
  worldSnapshotRevision: string
  dataEpochSequence: number
  permissionRevision: string
  policyVersion: string
  generatedAt: string
}

export interface ProjectionDecisionTrace {
  includedIds: string[]
  excluded: Array<{ instrumentId: string; reason: string }>
  mandatoryIds: string[]
  usedCost: number
  budget: number
  admissionProfileVersion: string
  stabilityStateHash: string
  logicalTime: string
}

export interface SurfacePlan {
  planId: string
  epoch: ProjectionEpoch
  selectedInstrumentIds: string[]
  actionContractIds: string[]
  warnings: string[]
  trace: ProjectionDecisionTrace
}

export interface ResolutionProfile {
  version: string
  authorityOrder: readonly Authority[]
  confidenceOrder: readonly ConfidenceClass[]
}

export type ClaimResolution<T = unknown> =
  | { state: 'unknown'; candidates: [] }
  | { state: 'ambiguous'; candidates: Claim<T>[] }
  | { state: 'resolved'; claim: Claim<T>; dominatedCandidates: Claim<T>[] }

export interface CommandEnvelope<P = unknown> {
  commandId: string
  commandType: string
  actorId: string
  targetId: string
  expectedRevision: string
  parameters: P
  idempotencyKey: string
  riskClass: RiskClass
  requestedAt: string
  projectionEpochId: string
  contractVersion: string
}

export interface ConfirmationToken {
  tokenId: string
  commandId: string
  idempotencyKey: string
  actorId: string
  commandType: string
  targetId: string
  riskClass: RiskClass
  projectionEpochId: string
  contractVersion: string
  payloadHash: string
  expectedRevision: string
  semanticContextHash: string
  riskFactsHash: string
  displayedSummaryHash: string
  issuedAt: string
  expiresAt: string
  signature: string
}

export type ConfirmationPolicy = 'none' | 'summary' | 'step-up' | 'two-party'

export interface ActionContract {
  actionId: string
  version: string
  requiredPermission: string
  riskClass: RiskClass
  expectedRevisionRequired: boolean
  idempotent: boolean
  confirmationPolicy: ConfirmationPolicy
  reversible: boolean
  compensationCommandType?: string
  auditClass: string
}

export interface ConfirmationBinding {
  commandId: string
  idempotencyKey: string
  actorId: string
  commandType: string
  targetId: string
  riskClass: RiskClass
  projectionEpochId: string
  contractVersion: string
  payloadHash: string
  expectedRevision: string
  semanticContextHash: string
  riskFactsHash: string
  displayedSummaryHash: string
}

export interface Approval {
  approvalId: string
  actorId: string
  commandId: string
  idempotencyKey: string
  commandType: string
  targetId: string
  riskClass: RiskClass
  projectionEpochId: string
  contractVersion: string
  payloadHash: string
  expectedRevision: string
  semanticContextHash: string
  riskFactsHash: string
  displayedSummaryHash: string
  approvedAt: string
  expiresAt: string
  signature: string
}

export interface ApprovalSet {
  approvalSetId: string
  initiatorActorId: string
  requiredApprovals: number
  approvals: Approval[]
  expiresAt: string
  state: 'open' | 'consumed'
}

export type OfflineRebaseOutcome =
  | 'still-valid'
  | 'rebased'
  | 'requires-confirmation'
  | 'conflicted'
  | 'rejected'
  | 'expired'

export interface QueuedCommand<P = unknown> {
  commandId: string
  actorId: string
  targetId: string
  baseEpochId: string
  baseRevision: string
  semanticPreconditions: Array<{ predicate: string; expected: unknown }>
  payload: P
  payloadHash: string
  riskClass: RiskClass
  queuedAt: string
  userVisibleDescription: string
  confirmationTokenId?: string
}

export interface DomainEvent<T = unknown> {
  eventId: string
  aggregateId: string
  aggregateSequence: number
  eventType: string
  payload: T
  schemaVersion: string
  occurredAt: string
  causationId: string
  correlationId?: string
}
