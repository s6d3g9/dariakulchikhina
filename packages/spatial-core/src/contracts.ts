export type SemVer = string
export type RevisionId = string
export type EntityId = string

export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

export type Matrix4 = readonly [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
]

export interface Quaternion {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly w: number
}

export interface LocalFrame {
  readonly origin: Vec3
  readonly right: Vec3
  readonly front: Vec3
  readonly up: Vec3
}

export interface ToleranceProfile {
  readonly version: SemVer
  readonly determinant: number
  readonly frame: number
  readonly geometryM: number
  readonly portM: number
  readonly angleRad: number
}

export interface Aabb {
  readonly min: Vec3
  readonly max: Vec3
}

export interface SpatialResolutionRecord {
  readonly predicate: string
  readonly subjectId: EntityId
  readonly winnerClaimId: string
  readonly loserClaimIds: readonly string[]
  readonly ruleId: string
}

export interface SpatialAffectedScope {
  readonly bbox: Aabb
  readonly predicateKeys: readonly string[]
  readonly instanceIds: readonly EntityId[]
}

export interface SpatialCompilationProof {
  readonly claimSetHash: string
  readonly resolutionRecords: readonly SpatialResolutionRecord[]
  readonly effectivePolicyHash: string
  readonly affectedScope: SpatialAffectedScope
  readonly stalenessBudgetClass: string
}

export interface RestrictedCompilationAudit {
  readonly planId: string
  readonly deniedSetDigest: string
  readonly restrictedGateRevision: RevisionId
}

export type SemanticSurfaceRole =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'functional-front'
  | 'user-facing'
  | 'approach'
  | 'operation'
  | 'service'
  | 'mount'
  | 'support'
  | 'display'

export interface SemanticSurface {
  readonly surfaceId: string
  readonly role: SemanticSurfaceRole
  readonly frame: LocalFrame
  readonly activeInStates: readonly string[]
}

export interface SpatialPort {
  readonly portId: string
  readonly portType: string
  readonly frame: LocalFrame
  readonly directionConvention: 'outward-normal'
  readonly roll: 'locked' | 'free'
  readonly compatiblePortTypes: readonly string[]
  readonly distanceRangeM: {
    readonly min: number
    readonly max: number
  }
  readonly positionToleranceM: number
  readonly angleToleranceRad: number
  readonly activeInStates: readonly string[]
}

export type FunctionalVolumeRole =
  | 'body'
  | 'approach'
  | 'operation'
  | 'service'
  | 'safety'
  | 'perception'

export interface FunctionalVolume {
  readonly volumeId: string
  readonly role: FunctionalVolumeRole
  readonly bounds: Aabb
  readonly uncertaintyRadiusM: number
  readonly activeInStates: readonly string[]
  readonly enforcement: 'hard' | 'soft'
  readonly compatibleOverlapRoles: readonly FunctionalVolumeRole[]
}

export interface SpatialState {
  readonly stateId: string
  readonly initial: boolean
}

export interface SpatialStateTransition {
  readonly transitionId: string
  readonly fromStateId: string
  readonly toStateId: string
  readonly sweptVolumeIds: readonly string[]
}

export interface SpatialStateMachine {
  readonly states: readonly SpatialState[]
  readonly transitions: readonly SpatialStateTransition[]
}

export interface MirrorPair {
  readonly leftId: string
  readonly rightId: string
}

export interface MirrorMapping {
  readonly mirrorId: string
  readonly reflectionInCanonical: Matrix4
  readonly surfacePairs: readonly MirrorPair[]
  readonly portPairs: readonly MirrorPair[]
  readonly chiralityMap: Readonly<Record<string, string>>
  readonly revitStrategy: 'none' | 'hand-flip' | 'facing-flip' | 'mirror-element'
}

export type SymmetryProfile =
  | { readonly kind: 'none' }
  | { readonly kind: 'cyclic'; readonly rotationalOrder: number }
  | { readonly kind: 'orientation-invariant' }

export type PlacementKind =
  | 'free'
  | 'level-based'
  | 'wall-hosted'
  | 'face-hosted'
  | 'ceiling-hosted'
  | 'work-plane-based'
  | 'curve-driven'
  | 'adaptive'

export interface SpatialAssetProfileV1 {
  readonly schemaVersion: '1.0.0'
  readonly artifactType: 'spatial-profile'
  readonly profileRevisionId: RevisionId
  readonly digitalAssetRevisionId: RevisionId
  readonly worldSnapshotRevision: RevisionId
  readonly permissionRevision: RevisionId
  readonly resolutionProfileVersion: SemVer
  readonly toleranceProfileVersion: SemVer
  readonly inputProof: SpatialCompilationProof
  readonly effectiveAudienceScope: readonly string[]
  readonly unit: 'm'
  readonly canonicalFrame: LocalFrame
  readonly sourceToCanonical: Matrix4
  readonly symmetry: SymmetryProfile
  readonly mirrors: readonly MirrorMapping[]
  readonly placementKind: PlacementKind
  readonly surfaces: readonly SemanticSurface[]
  readonly ports: readonly SpatialPort[]
  readonly volumes: readonly FunctionalVolume[]
  readonly stateMachine: SpatialStateMachine
  readonly qualityLevel: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
  readonly status: 'ready' | 'stale' | 'invalid'
}

export type ConstraintClass = 'hard' | 'soft' | 'conditional' | 'restricted-veto'
export type ConstraintScope = 'instance' | 'pair' | 'group' | 'route' | 'scene'
export type ConstraintPhase =
  | 'compile'
  | 'candidate'
  | 'continuous'
  | 'state-sweep'
  | 'global'
  | 'executor'

export interface SpatialConstraintParticipant {
  readonly instanceId: EntityId
  readonly role: string
  readonly portId?: string
  readonly volumeId?: string
}

export interface SpatialConstraint {
  readonly constraintId: string
  readonly ruleVersion: SemVer
  readonly class: ConstraintClass
  readonly scope: ConstraintScope
  readonly phase: ConstraintPhase
  readonly participants: readonly SpatialConstraintParticipant[]
  readonly activeInStates: readonly string[]
  readonly activeInScenarios: readonly string[]
  readonly assumptionLiteral?: string
  readonly toleranceProfileVersion: SemVer
  readonly policyRef: string
  readonly supportingClaimIds: readonly string[]
  readonly uncertaintyRef?: string
}

export interface SpatialIntent {
  readonly intentType: string
  readonly requestedInstanceIds: readonly EntityId[]
  readonly requiredRelationKeys: readonly string[]
}

export interface SpatialSolveRequest {
  readonly requestId: string
  readonly sceneGraphRevision: RevisionId
  readonly worldSnapshotRevision: RevisionId
  readonly resolutionProfileVersion: SemVer
  readonly toleranceProfileVersion: SemVer
  readonly solverVersion: SemVer
  readonly runtimeProfileVersion: SemVer
  readonly seed: string
  readonly requestedAudienceNarrowing?: readonly string[]
  readonly intent: SpatialIntent
  readonly lockedInstanceIds: readonly EntityId[]
  readonly requestedVariants: number
}

export interface SpatialSolveAuthorityContext {
  readonly actorId: EntityId
  readonly permissionRevision: RevisionId
  readonly effectivePolicyHash: string
  readonly effectiveAudienceScope: readonly string[]
}

export interface AuthorizedSpatialSolveInput {
  readonly request: SpatialSolveRequest
  readonly authority: SpatialSolveAuthorityContext
}

export interface CanonicalPlacement {
  readonly instanceId: EntityId
  readonly transformWorld: Matrix4
  readonly hostId: EntityId
  readonly mirrorId?: string
  readonly stateId: string
  readonly profileRevisionId: RevisionId
}

export interface GlobalValidationCheck {
  readonly checkId: string
  readonly status: 'pass'
  readonly minimumMargin: number
  readonly unit: 'm' | 'rad' | 'dimensionless'
}

export interface ValidationProof {
  readonly hardConstraintDigest: string
  readonly validatorVersion: SemVer
  readonly globalChecks: readonly GlobalValidationCheck[]
  readonly scenarioDigest: string
  readonly geometryDigest: string
}

export interface PlacementPlan {
  readonly planId: string
  readonly planHash: string
  readonly status: 'ready'
  readonly inputProof: SpatialCompilationProof
  readonly solverVersion: SemVer
  readonly runtimeProfileVersion: SemVer
  readonly seed: string
  readonly affectedScope: SpatialAffectedScope
  readonly placements: readonly CanonicalPlacement[]
  readonly validationProof: ValidationProof
  readonly softScoreByTier: readonly {
    readonly tier: string
    readonly value: number
  }[]
  readonly explanationRef: string
}

export interface UnsatCore {
  readonly constraintIds: readonly string[]
  readonly minimal: true
}

export interface RepairOption {
  readonly repairId: string
  readonly description: string
  readonly affectedConstraintIds: readonly string[]
}

export type SolveOutcome =
  | { readonly kind: 'Ready'; readonly plan: PlacementPlan }
  | {
      readonly kind: 'Unsatisfiable'
      readonly mus: readonly UnsatCore[]
      readonly suggestions: readonly RepairOption[]
    }
  | {
      readonly kind: 'Escalated'
      readonly opaqueTicket: string
      readonly coarseZoneRef: string
    }
  | {
      readonly kind: 'Indeterminate'
      readonly exhaustedBudget: string
      readonly resumableToken?: string
    }
  | {
      readonly kind: 'InvalidInput'
      readonly errors: readonly SpatialContractIssue[]
    }

export interface RevitPlacementStep {
  readonly stepId: string
  readonly stepContractVersion: SemVer
  readonly instanceId: EntityId
  readonly existingUniqueId?: string
  readonly placementKind: PlacementKind
  readonly expectedTransformWorld: Matrix4
  readonly expectedHostUniqueId?: string
  readonly hardDependencyStepIds: readonly string[]
}

export interface SpatialRevitApplyParameters {
  readonly planId: string
  readonly planHash: string
  readonly operationMode: 'atomic' | 'partial'
  readonly worldSnapshotRevision: RevisionId
  readonly affectedScopeHash: string
  readonly capabilityDigest: string
  readonly requiredCapabilities: readonly string[]
  readonly steps: readonly RevitPlacementStep[]
}

export interface SpatialContractIssue {
  readonly code: string
  readonly path: string
  readonly message: string
}
