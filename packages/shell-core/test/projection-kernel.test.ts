import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  AdmissionProfile,
  Claim,
  ProjectionCandidate,
  ProjectionEpoch,
  SurfacePlan,
} from '../../contracts-domain/shell-v6.ts'
import {
  deriveAudience,
  isNestedPlanCoherent,
  projectSurface,
  resolveClaims,
  shouldApplyLivePlan,
  validateDerivedArtifact,
  validateInstrumentRegistry,
} from '../src/index.ts'

const profile: AdmissionProfile = {
  version: '1.0.0',
  weights: {
    taskRelevance: 5,
    urgency: 4,
    authority: 3,
    confidence: 2,
    freshness: 1,
    preference: 1,
    cognitiveCost: 1,
  },
}

const epoch: ProjectionEpoch = {
  epochId: 'epoch-1',
  intentId: 'inspect',
  worldSnapshotRevision: 'world-10',
  dataEpochSequence: 10,
  permissionRevision: 'permissions-3',
  policyVersion: 'policy-2',
  generatedAt: '2026-08-12T00:00:00.000Z',
}

function candidate(
  instrumentId: string,
  overrides: Partial<ProjectionCandidate> = {},
): ProjectionCandidate {
  return {
    instrumentId,
    version: '1.0.0',
    supportedDepths: [0, 1, 2],
    supportedSizeClasses: ['compact', 'regular'],
    dependencies: [],
    conflicts: [],
    complexityCost: 1,
    semanticRole: 'supporting-context',
    eligible: true,
    mandatory: false,
    priorityClass: 3,
    utility: {
      taskRelevance: 0.5,
      urgency: 0.5,
      authority: 0.5,
      confidence: 0.5,
      freshness: 0.5,
      preference: 0.5,
      cognitiveCost: 0.1,
    },
    ...overrides,
  }
}

function request(candidates: ProjectionCandidate[]) {
  return {
    planId: 'plan-1',
    epoch,
    candidates,
    budget: { maxVisualCost: 10, maxElements: 10 },
    admissionProfile: profile,
    stabilityStateHash: 'stable-1',
    logicalTime: '2026-08-12T00:00:00.000Z',
  }
}

test('derived audience is deny-by-default and intersects all inputs', () => {
  assert.deepEqual(deriveAudience([]), [])
  assert.deepEqual(deriveAudience([['alice', 'bob'], ['bob', 'carol']]), ['bob'])
})

test('generation context must be declared as artifact input', () => {
  const issues = validateDerivedArtifact({
    artifactId: 'summary-1',
    inputClaimIds: ['claim-public'],
    inputArtifactIds: [],
    generationContextClaimIds: ['claim-public', 'claim-private'],
    traversalClaimIds: [],
    audienceScope: ['alice'],
    classification: 'private',
  })
  assert.equal(issues.some(issue => issue.code === 'artifact.undeclared-generation-input'), true)
})

test('instrument cycles are rejected unless contained in one atomic group', () => {
  const broken = [
    candidate('a', { dependencies: ['b'] }),
    candidate('b', { dependencies: ['a'] }),
  ]
  assert.equal(validateInstrumentRegistry(broken).some(issue => issue.code === 'instrument.dependency-cycle'), true)

  const atomic = broken.map(item => ({ ...item, atomicGroup: 'ab' }))
  assert.equal(validateInstrumentRegistry(atomic).some(issue => issue.code === 'instrument.dependency-cycle'), false)
})

test('mandatory internal conflict escalates instead of dropping safety', () => {
  const result = projectSurface(request([
    candidate('safety-alert', { mandatory: true, priorityClass: 0, conflicts: ['active-task'] }),
    candidate('active-task', { mandatory: true, priorityClass: 0 }),
  ]))
  assert.equal(result.ok, false)
  assert.equal(result.feasibility.escalationMode, 'multi-surface')
  assert.deepEqual(result.feasibility.conflicts, ['active-task<->safety-alert'])
})

test('shared dependency uses marginal union cost and is not double-counted', () => {
  const result = projectSurface({
    ...request([
      candidate('shared', { complexityCost: 8, priorityClass: 1 }),
      candidate('left', { dependencies: ['shared'], complexityCost: 1, priorityClass: 1 }),
      candidate('right', { dependencies: ['shared'], complexityCost: 1, priorityClass: 1 }),
    ]),
    budget: { maxVisualCost: 10, maxElements: 3 },
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(new Set(result.plan.selectedInstrumentIds), new Set(['shared', 'left', 'right']))
  assert.equal(result.plan.trace.usedCost, 10)
})

test('selection is deterministic for shuffled candidates', () => {
  const candidates = [
    candidate('zeta'),
    candidate('alpha'),
    candidate('identity', { mandatory: true, priorityClass: 0, semanticRole: 'identity' }),
  ]
  const first = projectSurface(request(candidates))
  const second = projectSurface(request([...candidates].reverse()))
  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  if (!first.ok || !second.ok) return
  assert.deepEqual(first.plan.selectedInstrumentIds, second.plan.selectedInstrumentIds)
  assert.deepEqual(first.plan.trace, second.plan.trace)
})

test('ineligible hidden candidates cannot affect the visible plan', () => {
  const visible = [candidate('identity', { mandatory: true, priorityClass: 0, semanticRole: 'identity' })]
  const baseline = projectSurface(request(visible))
  const withHidden = projectSurface(request([
    ...visible,
    candidate('hidden-secret', {
      eligible: false,
      complexityCost: 999,
      priorityClass: 0,
      conflicts: ['identity'],
      dependencies: ['another-hidden-secret'],
    }),
  ]))
  assert.equal(baseline.ok, true)
  assert.equal(withHidden.ok, true)
  if (!baseline.ok || !withHidden.ok) return
  assert.deepEqual(baseline.plan.selectedInstrumentIds, withHidden.plan.selectedInstrumentIds)
  assert.equal(withHidden.plan.trace.excluded.some(item => item.instrumentId === 'hidden-secret'), false)
})

test('non-monotone admission profile is rejected', () => {
  const result = projectSurface({
    ...request([candidate('identity', { mandatory: true })]),
    admissionProfile: {
      ...profile,
      weights: { ...profile.weights, preference: -1 },
    },
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.trace.excluded.some(item => item.reason === 'admission.invalid-weight'), true)
})

test('claim resolution is order-independent and exposes equal-rank conflicts', () => {
  const base: Claim<number> = {
    claimId: 'claim-a',
    subjectId: 'project-1',
    predicate: 'project.budget',
    value: 100,
    claimType: 'observed',
    sourceId: 'ledger',
    sourceRevision: '1',
    authority: 'official',
    confidenceClass: 'verified',
    recordedAt: '2026-08-11T00:00:00.000Z',
    policyRef: 'project-members',
    provenanceRef: 'event-1',
    status: 'active',
  }
  const claims = [base, { ...base, claimId: 'claim-b', value: 200 }]
  const resolutionProfile = {
    version: '1.0.0',
    authorityOrder: ['unknown', 'self', 'peer', 'domain', 'official'] as const,
    confidenceOrder: ['unknown', 'low', 'medium', 'high', 'verified'] as const,
  }
  const first = resolveClaims(claims, resolutionProfile, '2026-08-12T00:00:00.000Z')
  const second = resolveClaims([...claims].reverse(), resolutionProfile, '2026-08-12T00:00:00.000Z')
  assert.equal(first.state, 'ambiguous')
  assert.deepEqual(first, second)
})

test('nested and live plans enforce snapshot coherence and monotonic sequence', () => {
  const parent = plan('world-10', 10)
  const staleReadOnly = { ...plan('world-11', 11), warnings: ['stale-relative-to-parent'] }
  const staleInteractive = { ...staleReadOnly, actionContractIds: ['payment.capture'] }
  assert.equal(isNestedPlanCoherent(parent, staleReadOnly), true)
  assert.equal(isNestedPlanCoherent(parent, staleInteractive), false)
  assert.equal(shouldApplyLivePlan(parent, plan('world-11', 11)), true)
  assert.equal(shouldApplyLivePlan(parent, plan('world-9', 9)), false)
})

function plan(worldSnapshotRevision: string, dataEpochSequence: number): SurfacePlan {
  return {
    planId: 'plan-live',
    epoch: { ...epoch, worldSnapshotRevision, dataEpochSequence },
    selectedInstrumentIds: [],
    actionContractIds: [],
    warnings: [],
    trace: {
      includedIds: [],
      excluded: [],
      mandatoryIds: [],
      usedCost: 0,
      budget: 0,
      admissionProfileVersion: '1.0.0',
      stabilityStateHash: 'state',
      logicalTime: '2026-08-12T00:00:00.000Z',
    },
  }
}
