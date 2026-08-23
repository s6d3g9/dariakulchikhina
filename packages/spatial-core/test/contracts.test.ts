import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import type {
  PlacementPlan,
  PlacementPlanHashInput,
  SpatialAssetProfileV1,
  SpatialConstraint,
  SpatialRevitApplyParameters,
  ToleranceProfile,
} from '../src/index.ts'
import {
  IDENTITY_MATRIX_4,
  assertPublicContract,
  canonicalJson,
  createPublicPlanHash,
  createRevitCapabilityDigest,
  createRevitOperationId,
  deriveEffectiveAudienceScope,
  hashCanonicalParts,
  reflectionMatrixFromNormal,
  validateAuthorizedSpatialSolveInput,
  validatePlacementPlan,
  validateSpatialAssetProfile,
  validateSpatialConstraint,
  validateSpatialRevitApplyParameters,
  vec3,
} from '../src/index.ts'

const hashA = 'a'.repeat(64)
const hashB = 'b'.repeat(64)
const hashC = 'c'.repeat(64)

const tolerance: ToleranceProfile = {
  version: '1.0.0',
  determinant: 1e-9,
  frame: 1e-7,
  geometryM: 1e-6,
  portM: 1e-3,
  angleRad: 1e-3,
}

const frame = {
  origin: vec3(0, 0, 0),
  right: vec3(1, 0, 0),
  front: vec3(0, 1, 0),
  up: vec3(0, 0, 1),
}

function profile(): SpatialAssetProfileV1 {
  return {
    schemaVersion: '1.0.0',
    artifactType: 'spatial-profile',
    profileRevisionId: 'profile-1',
    digitalAssetRevisionId: 'asset-1',
    worldSnapshotRevision: 'world-1',
    permissionRevision: 'permission-1',
    resolutionProfileVersion: '1.0.0',
    toleranceProfileVersion: '1.0.0',
    inputProof: {
      claimSetHash: hashA,
      resolutionRecords: [],
      effectivePolicyHash: hashB,
      affectedScope: {
        bbox: { min: vec3(0, 0, 0), max: vec3(1, 1, 1) },
        predicateKeys: ['spatial.front'],
        instanceIds: ['asset-1'],
      },
      stalenessBudgetClass: 'catalog-static',
    },
    effectiveAudienceScope: ['project:1'],
    unit: 'm',
    canonicalFrame: frame,
    sourceToCanonical: IDENTITY_MATRIX_4,
    symmetry: { kind: 'none' },
    mirrors: [{
      mirrorId: 'mirror-x',
      reflectionInCanonical: reflectionMatrixFromNormal(vec3(1, 0, 0)),
      surfacePairs: [],
      portPairs: [],
      chiralityMap: {},
      revitStrategy: 'mirror-element',
    }],
    placementKind: 'level-based',
    surfaces: [{
      surfaceId: 'surface-front',
      role: 'functional-front',
      frame,
      activeInStates: ['closed'],
    }],
    ports: [],
    volumes: [{
      volumeId: 'body',
      role: 'body',
      bounds: { min: vec3(0, 0, 0), max: vec3(1, 1, 1) },
      uncertaintyRadiusM: 0,
      activeInStates: ['closed'],
      enforcement: 'hard',
      compatibleOverlapRoles: [],
    }],
    stateMachine: {
      states: [{ stateId: 'closed', initial: true }],
      transitions: [],
    },
    qualityLevel: 'L3',
    status: 'ready',
  }
}

function planInput(): PlacementPlanHashInput {
  return {
    planId: 'plan-1',
    status: 'ready',
    inputProof: profile().inputProof,
    solverVersion: '1.0.0',
    runtimeProfileVersion: '1.0.0',
    seed: 'seed-1',
    affectedScope: profile().inputProof.affectedScope,
    placements: [{
      instanceId: 'instance-1',
      transformWorld: IDENTITY_MATRIX_4,
      hostId: 'room-1',
      stateId: 'closed',
      profileRevisionId: 'profile-1',
    }],
    validationProof: {
      hardConstraintDigest: hashA,
      validatorVersion: '1.0.0',
      globalChecks: [{
        checkId: 'circulation',
        status: 'pass',
        minimumMargin: 0.9,
        unit: 'm',
      }],
      scenarioDigest: hashB,
      geometryDigest: hashC,
    },
    softScoreByTier: [{ tier: 'functional', value: 0 }],
    explanationRef: 'explanation-1',
  }
}

function plan(): PlacementPlan {
  const input = planInput()
  return { ...input, planHash: createPublicPlanHash(input) }
}

test('canonical hashing is stable across object key order and framed parts', () => {
  assert.equal(canonicalJson({ z: 1, a: 2 }), '{"a":2,"z":1}')
  assert.equal(hashCanonicalParts({ a: 1, b: 2 }), hashCanonicalParts({ b: 2, a: 1 }))
  assert.notEqual(hashCanonicalParts('a', 'bc'), hashCanonicalParts('ab', 'c'))
  assert.throws(() => canonicalJson({ invalid: undefined }), /rejects undefined/)
})

test('restricted audit fields cannot enter a public contract or plan hash', () => {
  assert.throws(
    () => assertPublicContract({ inputProof: { deniedSetDigest: hashA } }),
    /restricted audit field/,
  )
  assert.throws(
    () => createPublicPlanHash({
      ...planInput(),
      inputProof: {
        ...planInput().inputProof,
        deniedSetDigest: hashA,
      },
    } as unknown as PlacementPlanHashInput),
    /restricted audit field/,
  )
})

test('valid L3 profile passes semantic validation', () => {
  assert.deepEqual(validateSpatialAssetProfile(profile(), tolerance), [])
})

test('profile rejects a non-reflection mirror and stale state references', () => {
  const invalid = profile()
  const changed: SpatialAssetProfileV1 = {
    ...invalid,
    mirrors: [{ ...invalid.mirrors[0]!, reflectionInCanonical: IDENTITY_MATRIX_4 }],
    surfaces: [{ ...invalid.surfaces[0]!, activeInStates: ['missing'] }],
  }
  const codes = validateSpatialAssetProfile(changed, tolerance).map(item => item.code)
  assert.ok(codes.includes('profile.mirror-determinant'))
  assert.ok(codes.includes('profile.surface-state'))
})

test('audience narrowing is server-derived and expansion fails closed', () => {
  assert.deepEqual(
    deriveEffectiveAudienceScope(['team', 'project'], ['project']),
    { scope: ['project'], issues: [] },
  )
  const expanded = deriveEffectiveAudienceScope(['project'], ['project', 'secret'])
  assert.equal(expanded.scope, undefined)
  assert.equal(expanded.issues[0]?.code, 'audience.expansion-forbidden')
})

test('authorized solve input rejects audience expansion', () => {
  const issues = validateAuthorizedSpatialSolveInput({
    request: {
      requestId: 'request-1',
      sceneGraphRevision: 'scene-1',
      worldSnapshotRevision: 'world-1',
      resolutionProfileVersion: '1.0.0',
      toleranceProfileVersion: '1.0.0',
      solverVersion: '1.0.0',
      runtimeProfileVersion: '1.0.0',
      seed: 'seed-1',
      requestedAudienceNarrowing: ['project', 'secret'],
      intent: {
        intentType: 'furnish-room',
        requestedInstanceIds: ['chair-1'],
        requiredRelationKeys: ['chair-to-table'],
      },
      lockedInstanceIds: [],
      requestedVariants: 3,
    },
    authority: {
      actorId: 'actor-1',
      permissionRevision: 'permission-1',
      effectivePolicyHash: hashA,
      effectiveAudienceScope: ['project'],
    },
  })
  assert.equal(issues[0]?.code, 'audience.expansion-forbidden')
})

test('hard constraints require assumption literals and restricted rules stay at executor', () => {
  const hard: SpatialConstraint = {
    constraintId: 'hard-1',
    ruleVersion: '1.0.0',
    class: 'hard',
    scope: 'pair',
    phase: 'continuous',
    participants: [{ instanceId: 'chair-1', role: 'chair' }],
    activeInStates: [],
    activeInScenarios: [],
    toleranceProfileVersion: '1.0.0',
    policyRef: 'policy-1',
    supportingClaimIds: ['claim-1'],
  }
  assert.equal(validateSpatialConstraint(hard)[0]?.code, 'constraint.assumption')
  assert.equal(validateSpatialConstraint({
    ...hard,
    class: 'restricted-veto',
    phase: 'continuous',
  })[0]?.code, 'constraint.restricted-phase')
})

test('ready plan requires an exact public hash and a global proof', () => {
  assert.deepEqual(validatePlacementPlan(plan()), [])
  const changed = { ...plan(), seed: 'changed-after-hash' }
  assert.equal(validatePlacementPlan(changed)[0]?.code, 'plan.hash')
})

test('Revit payload rejects envelope duplicates and cyclic hard dependencies', () => {
  const capabilities = { 'revit.version': '2026', 'placement.kinds': ['level-based'] }
  const parameters: SpatialRevitApplyParameters = {
    planId: 'plan-1',
    planHash: hashA,
    operationMode: 'partial',
    worldSnapshotRevision: 'world-1',
    affectedScopeHash: hashB,
    capabilityDigest: createRevitCapabilityDigest(capabilities),
    requiredCapabilities: ['revit.version'],
    steps: [
      {
        stepId: 'a',
        stepContractVersion: '1.0.0',
        instanceId: 'chair-1',
        placementKind: 'level-based',
        expectedTransformWorld: IDENTITY_MATRIX_4,
        hardDependencyStepIds: ['b'],
      },
      {
        stepId: 'b',
        stepContractVersion: '1.0.0',
        instanceId: 'table-1',
        placementKind: 'level-based',
        expectedTransformWorld: IDENTITY_MATRIX_4,
        hardDependencyStepIds: ['a'],
      },
    ],
  }
  const runtimePayload = {
    ...parameters,
    targetDocumentKey: 'duplicate',
    revitModelRevision: 'duplicate',
  } as unknown as SpatialRevitApplyParameters
  const codes = validateSpatialRevitApplyParameters(runtimePayload).map(item => item.code)
  assert.ok(codes.includes('revit.envelope-duplicate'))
  assert.ok(codes.includes('revit.dependency-cycle'))
})

test('Revit operation IDs are deterministic and step-version sensitive', () => {
  const first = createRevitOperationId(hashA, 'step-1', '1.0.0')
  assert.equal(first, createRevitOperationId(hashA, 'step-1', '1.0.0'))
  assert.notEqual(first, createRevitOperationId(hashA, 'step-1', '1.1.0'))
})

test('JSON Schema keeps restricted audit separate from every public payload', () => {
  const schema = JSON.parse(readFileSync(
    new URL('../schemas/spatial-kernel.schema.json', import.meta.url),
    'utf8',
  )) as { $defs: Record<string, unknown> }
  const compilation = JSON.stringify(schema.$defs.compilationProof)
  const request = JSON.stringify(schema.$defs.spatialSolveRequest)
  const apply = JSON.stringify(schema.$defs.spatialRevitApplyParameters)
  const restricted = JSON.stringify(schema.$defs.restrictedCompilationAudit)

  assert.equal(compilation.includes('deniedSetDigest'), false)
  assert.equal(request.includes('audienceScope'), false)
  assert.equal(request.includes('requestedAudienceNarrowing'), true)
  assert.equal(apply.includes('targetDocumentKey'), false)
  assert.equal(apply.includes('revitModelRevision'), false)
  assert.equal(restricted.includes('deniedSetDigest'), true)
})
