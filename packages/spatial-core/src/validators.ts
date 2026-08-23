import {
  assertPublicContract,
  createPublicPlanHash,
  type PlacementPlanHashInput,
} from './canonical.ts'
import type {
  AuthorizedSpatialSolveInput,
  LocalFrame,
  Matrix4,
  PlacementPlan,
  SpatialAssetProfileV1,
  SpatialCompilationProof,
  SpatialConstraint,
  SpatialContractIssue,
  SpatialRevitApplyParameters,
  SpatialSolveRequest,
  ToleranceProfile,
} from './contracts.ts'
import { isValidRightHandedFrame } from './frames.ts'
import { validateAabbShape } from './geometry.ts'
import {
  validateProfileMirrors,
  validateProfilePorts,
} from './profile-validators.ts'

function issue(code: string, path: string, message: string): SpatialContractIssue {
  return { code, path, message }
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0
}

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value)
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const duplicate = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value)
    seen.add(value)
  }
  return [...duplicate].sort()
}

function validateMatrix4(
  matrix: Matrix4,
  path: string,
  issues: SpatialContractIssue[],
): void {
  if (matrix.length !== 16 || matrix.some(value => !Number.isFinite(value))) {
    issues.push(issue('matrix.invalid', path, 'matrix must contain 16 finite numbers'))
  }
}

function validateFrame(
  frame: LocalFrame,
  tolerance: ToleranceProfile,
  path: string,
  issues: SpatialContractIssue[],
): void {
  if (!isValidRightHandedFrame(frame, tolerance)) {
    issues.push(issue(
      'frame.not-right-orthonormal',
      path,
      'frame must be finite, right-handed and orthonormal within tolerance',
    ))
  }
}

export function validateToleranceProfile(
  value: ToleranceProfile,
): SpatialContractIssue[] {
  const issues: SpatialContractIssue[] = []
  if (!nonEmpty(value.version)) {
    issues.push(issue('tolerance.version.empty', '$.version', 'version is required'))
  }
  const fields: Array<[keyof ToleranceProfile, number]> = [
    ['determinant', value.determinant],
    ['frame', value.frame],
    ['geometryM', value.geometryM],
    ['portM', value.portM],
    ['angleRad', value.angleRad],
  ]
  for (const [key, field] of fields) {
    if (!finitePositive(field)) {
      issues.push(issue(
        'tolerance.invalid',
        `$.${key}`,
        'tolerance must be finite and positive',
      ))
    }
  }
  if (finitePositive(value.geometryM) && finitePositive(value.portM)
      && value.geometryM > value.portM) {
    issues.push(issue(
      'tolerance.length-order',
      '$.geometryM',
      'geometry tolerance cannot exceed port tolerance',
    ))
  }
  return issues
}

export function validateCompilationProof(
  value: SpatialCompilationProof,
  path = '$',
): SpatialContractIssue[] {
  const issues: SpatialContractIssue[] = []
  if (!isSha256(value.claimSetHash)) {
    issues.push(issue('proof.claim-hash', `${path}.claimSetHash`, 'expected lowercase SHA-256'))
  }
  if (!isSha256(value.effectivePolicyHash)) {
    issues.push(issue(
      'proof.policy-hash',
      `${path}.effectivePolicyHash`,
      'expected lowercase SHA-256',
    ))
  }
  if (!validateAabbShape(value.affectedScope.bbox)) {
    issues.push(issue('proof.scope-bbox', `${path}.affectedScope.bbox`, 'invalid AABB'))
  }
  const resolutionIds = value.resolutionRecords.map(record => (
    `${record.subjectId}\0${record.predicate}`
  ))
  for (const duplicate of duplicateValues(resolutionIds)) {
    issues.push(issue(
      'proof.resolution-duplicate',
      `${path}.resolutionRecords`,
      `duplicate subject/predicate resolution: ${duplicate.replace('\0', '/')}`,
    ))
  }
  return issues
}

function validateProfileHeader(
  value: SpatialAssetProfileV1,
  tolerance: ToleranceProfile,
  issues: SpatialContractIssue[],
): void {
  if (value.schemaVersion !== '1.0.0' || value.artifactType !== 'spatial-profile') {
    issues.push(issue('profile.version', '$', 'unsupported spatial profile contract'))
  }
  if (value.unit !== 'm') {
    issues.push(issue('profile.unit', '$.unit', 'spatial core accepts meters only'))
  }
  validateFrame(value.canonicalFrame, tolerance, '$.canonicalFrame', issues)
  validateMatrix4(value.sourceToCanonical, '$.sourceToCanonical', issues)
  if (value.symmetry.kind === 'cyclic'
      && (!Number.isInteger(value.symmetry.rotationalOrder)
        || value.symmetry.rotationalOrder < 2)) {
    issues.push(issue(
      'profile.symmetry-order',
      '$.symmetry.rotationalOrder',
      'cyclic symmetry requires an integer order of at least 2',
    ))
  }
}

export function validateSpatialAssetProfile(
  value: SpatialAssetProfileV1,
  tolerance: ToleranceProfile,
): SpatialContractIssue[] {
  const issues = [
    ...validateToleranceProfile(tolerance),
    ...validateCompilationProof(value.inputProof, '$.inputProof'),
  ]
  validateProfileHeader(value, tolerance, issues)

  const stateIds = value.stateMachine.states.map(state => state.stateId)
  for (const duplicate of duplicateValues(stateIds)) {
    issues.push(issue('profile.state-duplicate', '$.stateMachine.states', duplicate))
  }
  if (value.stateMachine.states.filter(state => state.initial).length !== 1) {
    issues.push(issue(
      'profile.initial-state',
      '$.stateMachine.states',
      'exactly one initial state is required',
    ))
  }
  const stateSet = new Set(stateIds)
  for (const [index, transition] of value.stateMachine.transitions.entries()) {
    if (!stateSet.has(transition.fromStateId) || !stateSet.has(transition.toStateId)) {
      issues.push(issue(
        'profile.transition-state',
        `$.stateMachine.transitions[${index}]`,
        'transition references an unknown state',
      ))
    }
  }

  const surfaceIds = value.surfaces.map(surface => surface.surfaceId)
  const portIds = value.ports.map(port => port.portId)
  const volumeIds = value.volumes.map(volume => volume.volumeId)
  const idGroups: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['$.surfaces', surfaceIds],
    ['$.ports', portIds],
    ['$.volumes', volumeIds],
    ['$.mirrors', value.mirrors.map(mirror => mirror.mirrorId)],
  ]
  for (const [path, ids] of idGroups) {
    for (const duplicate of duplicateValues(ids)) {
      issues.push(issue('profile.id-duplicate', path, duplicate))
    }
  }

  value.surfaces.forEach((surface, index) => {
    validateFrame(surface.frame, tolerance, `$.surfaces[${index}].frame`, issues)
    if (surface.activeInStates.some(state => !stateSet.has(state))) {
      issues.push(issue(
        'profile.surface-state',
        `$.surfaces[${index}].activeInStates`,
        'surface references an unknown state',
      ))
    }
  })

  validateProfilePorts(value, stateSet, tolerance, issues)

  value.volumes.forEach((volume, index) => {
    if (!validateAabbShape(volume.bounds) || !finiteNonNegative(volume.uncertaintyRadiusM)) {
      issues.push(issue(
        'profile.volume',
        `$.volumes[${index}]`,
        'volume requires valid bounds and non-negative uncertainty',
      ))
    }
    if (volume.activeInStates.some(state => !stateSet.has(state))) {
      issues.push(issue(
        'profile.volume-state',
        `$.volumes[${index}].activeInStates`,
        'volume references an unknown state',
      ))
    }
  })

  const surfaceSet = new Set(surfaceIds)
  const portSet = new Set(portIds)
  validateProfileMirrors(value, surfaceSet, portSet, tolerance, issues)

  const sweptVolumeSet = new Set(volumeIds)
  value.stateMachine.transitions.forEach((transition, index) => {
    if (transition.sweptVolumeIds.some(id => !sweptVolumeSet.has(id))) {
      issues.push(issue(
        'profile.transition-volume',
        `$.stateMachine.transitions[${index}].sweptVolumeIds`,
        'transition references an unknown swept volume',
      ))
    }
  })

  const level = Number(value.qualityLevel.slice(1))
  if (value.status === 'ready' && (
    level < 3 || !value.volumes.some(volume => volume.role === 'body')
  )) {
    issues.push(issue(
      'profile.ready-quality',
      '$.status',
      'ready profiles require L3+ semantics and a body volume',
    ))
  }

  try {
    assertPublicContract(value)
  } catch (error) {
    issues.push(issue(
      'profile.restricted-field',
      '$',
      error instanceof Error ? error.message : 'restricted audit field',
    ))
  }
  return issues
}

export function deriveEffectiveAudienceScope(
  serverScope: readonly string[],
  requestedNarrowing?: readonly string[],
): { scope?: readonly string[]; issues: readonly SpatialContractIssue[] } {
  const normalizedServer = [...new Set(serverScope)].sort()
  if (requestedNarrowing === undefined) {
    return { scope: normalizedServer, issues: [] }
  }
  const requested = [...new Set(requestedNarrowing)].sort()
  const allowed = new Set(normalizedServer)
  const expansion = requested.filter(value => !allowed.has(value))
  if (expansion.length > 0) {
    return {
      issues: [issue(
        'audience.expansion-forbidden',
        '$.requestedAudienceNarrowing',
        `request cannot add audience entries: ${expansion.join(', ')}`,
      )],
    }
  }
  return { scope: requested, issues: [] }
}

export function validateSpatialSolveRequest(
  value: SpatialSolveRequest,
): SpatialContractIssue[] {
  const issues: SpatialContractIssue[] = []
  if (!nonEmpty(value.requestId) || !nonEmpty(value.seed)) {
    issues.push(issue('solve.identity', '$', 'requestId and seed are required'))
  }
  if (!Number.isInteger(value.requestedVariants)
      || value.requestedVariants < 1
      || value.requestedVariants > 8) {
    issues.push(issue(
      'solve.variants',
      '$.requestedVariants',
      'requestedVariants must be an integer from 1 to 8',
    ))
  }
  for (const duplicate of duplicateValues(value.lockedInstanceIds)) {
    issues.push(issue('solve.lock-duplicate', '$.lockedInstanceIds', duplicate))
  }
  return issues
}

export function validateAuthorizedSpatialSolveInput(
  value: AuthorizedSpatialSolveInput,
): SpatialContractIssue[] {
  const issues = validateSpatialSolveRequest(value.request)
  issues.push(...deriveEffectiveAudienceScope(
    value.authority.effectiveAudienceScope,
    value.request.requestedAudienceNarrowing,
  ).issues)
  if (!isSha256(value.authority.effectivePolicyHash)) {
    issues.push(issue(
      'solve.policy-hash',
      '$.authority.effectivePolicyHash',
      'expected lowercase SHA-256',
    ))
  }
  return issues
}

export function validateSpatialConstraint(
  value: SpatialConstraint,
): SpatialContractIssue[] {
  const issues: SpatialContractIssue[] = []
  if (value.participants.length === 0) {
    issues.push(issue('constraint.participants', '$.participants', 'at least one participant'))
  }
  if (value.class === 'hard' && !nonEmpty(value.assumptionLiteral ?? '')) {
    issues.push(issue(
      'constraint.assumption',
      '$.assumptionLiteral',
      'hard constraints require an assumption literal for MUS extraction',
    ))
  }
  if (value.class === 'restricted-veto' && value.phase !== 'executor') {
    issues.push(issue(
      'constraint.restricted-phase',
      '$.phase',
      'restricted constraints may run only at the executor gate',
    ))
  }
  return issues
}

export function validatePlacementPlan(
  value: PlacementPlan,
): SpatialContractIssue[] {
  const issues = validateCompilationProof(value.inputProof, '$.inputProof')
  if (value.status !== 'ready') {
    issues.push(issue('plan.status', '$.status', 'exportable plans must be ready'))
  }
  if (value.validationProof.globalChecks.length === 0) {
    issues.push(issue(
      'plan.global-proof',
      '$.validationProof.globalChecks',
      'at least one full-scene global check is required',
    ))
  }
  value.validationProof.globalChecks.forEach((check, index) => {
    if (!Number.isFinite(check.minimumMargin) || check.minimumMargin < 0) {
      issues.push(issue(
        'plan.margin',
        `$.validationProof.globalChecks[${index}].minimumMargin`,
        'hard validation margin must be finite and non-negative',
      ))
    }
  })
  try {
    assertPublicContract(value)
  } catch (error) {
    issues.push(issue(
      'plan.restricted-field',
      '$',
      error instanceof Error ? error.message : 'restricted audit field',
    ))
  }
  const { planHash: _planHash, ...hashInput } = value
  const expectedHash = createPublicPlanHash(hashInput as PlacementPlanHashInput)
  if (value.planHash !== expectedHash) {
    issues.push(issue('plan.hash', '$.planHash', 'plan hash does not match public payload'))
  }
  return issues
}

export function validateSpatialRevitApplyParameters(
  value: SpatialRevitApplyParameters,
): SpatialContractIssue[] {
  const issues: SpatialContractIssue[] = []
  const runtimeValue = value as SpatialRevitApplyParameters & Record<string, unknown>
  if ('targetDocumentKey' in runtimeValue || 'revitModelRevision' in runtimeValue) {
    issues.push(issue(
      'revit.envelope-duplicate',
      '$',
      'targetId and expectedRevision belong only to the canonical CommandEnvelope',
    ))
  }
  if (!isSha256(value.planHash) || !isSha256(value.capabilityDigest)) {
    issues.push(issue(
      'revit.hash',
      '$',
      'planHash and capabilityDigest must be lowercase SHA-256',
    ))
  }
  const stepIds = value.steps.map(step => step.stepId)
  for (const duplicate of duplicateValues(stepIds)) {
    issues.push(issue('revit.step-duplicate', '$.steps', duplicate))
  }
  const stepSet = new Set(stepIds)
  value.steps.forEach((step, index) => {
    for (const dependency of step.hardDependencyStepIds) {
      if (!stepSet.has(dependency) || dependency === step.stepId) {
        issues.push(issue(
          'revit.step-dependency',
          `$.steps[${index}].hardDependencyStepIds`,
          'dependency must reference another existing step',
        ))
      }
    }
  })

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const byId = new Map(value.steps.map(step => [step.stepId, step]))
  const hasCycle = (id: string): boolean => {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    for (const dependency of byId.get(id)?.hardDependencyStepIds ?? []) {
      if (hasCycle(dependency)) return true
    }
    visiting.delete(id)
    visited.add(id)
    return false
  }
  if (stepIds.some(hasCycle)) {
    issues.push(issue('revit.dependency-cycle', '$.steps', 'hard dependencies must be acyclic'))
  }
  return issues
}
