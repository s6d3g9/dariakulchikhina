import type {
  AdmissionProfile,
  FeasibilityResult,
  InformationBudget,
  ProjectionCandidate,
  ProjectionDecisionTrace,
  SurfacePlan,
} from '../../contracts-domain/shell-v6.ts'
import { validateAdmissionProfile, validateInstrumentRegistry } from './semantic-validators.ts'

export interface ProjectionRequest {
  planId: string
  epoch: SurfacePlan['epoch']
  candidates: ProjectionCandidate[]
  budget: InformationBudget
  admissionProfile: AdmissionProfile
  stabilityStateHash: string
  logicalTime: string
}

export type ProjectionResult =
  | { ok: true; plan: SurfacePlan; feasibility: FeasibilityResult }
  | { ok: false; feasibility: FeasibilityResult; trace: ProjectionDecisionTrace }

function registryOf(candidates: readonly ProjectionCandidate[]): Map<string, ProjectionCandidate> {
  return new Map(candidates.map(candidate => [candidate.instrumentId, candidate]))
}

export function dependencyClosure(
  seedIds: readonly string[],
  candidates: readonly ProjectionCandidate[],
): { ids: Set<string>; missing: Set<string> } {
  const registry = registryOf(candidates)
  const ids = new Set<string>()
  const missing = new Set<string>()
  const queue = [...new Set(seedIds)].sort()

  while (queue.length > 0) {
    const id = queue.shift()
    if (!id || ids.has(id)) continue
    const candidate = registry.get(id)
    if (!candidate) {
      missing.add(id)
      continue
    }
    ids.add(id)
    for (const dependencyId of [...candidate.dependencies].sort()) {
      if (!ids.has(dependencyId)) queue.push(dependencyId)
    }
  }
  return { ids, missing }
}

function conflicts(left: ProjectionCandidate, right: ProjectionCandidate): boolean {
  if (left.instrumentId === right.instrumentId) return false
  if (left.conflicts.includes(right.instrumentId) || right.conflicts.includes(left.instrumentId)) return true
  return Boolean(left.exclusiveGroup && left.exclusiveGroup === right.exclusiveGroup)
}

function internalConflicts(ids: ReadonlySet<string>, registry: Map<string, ProjectionCandidate>): string[] {
  const ordered = [...ids].sort()
  const found: string[] = []
  for (let leftIndex = 0; leftIndex < ordered.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ordered.length; rightIndex += 1) {
      const leftId = ordered[leftIndex]
      const rightId = ordered[rightIndex]
      const left = leftId ? registry.get(leftId) : undefined
      const right = rightId ? registry.get(rightId) : undefined
      if (left && right && conflicts(left, right)) found.push(`${left.instrumentId}<->${right.instrumentId}`)
    }
  }
  return found
}

export function unionCost(ids: ReadonlySet<string>, candidates: readonly ProjectionCandidate[]): number {
  const registry = registryOf(candidates)
  let total = 0
  for (const id of ids) total += registry.get(id)?.complexityCost ?? 0
  return total
}

export function evaluateMandatoryFeasibility(
  candidates: readonly ProjectionCandidate[],
  budget: InformationBudget,
): { result: FeasibilityResult; mandatoryClosure: Set<string> } {
  const registry = registryOf(candidates)
  const mandatoryIds = candidates.filter(candidate => candidate.mandatory).map(candidate => candidate.instrumentId)
  const closure = dependencyClosure(mandatoryIds, candidates)
  const ineligible = [...closure.ids].filter(id => !registry.get(id)?.eligible)
  const missingDependencies = [...new Set([...closure.missing, ...ineligible])].sort()
  const conflictPairs = internalConflicts(closure.ids, registry)
  const requiredCost = unionCost(closure.ids, candidates)
  const overBudget = requiredCost > budget.maxVisualCost || closure.ids.size > budget.maxElements
  const feasible = missingDependencies.length === 0 && conflictPairs.length === 0 && !overBudget
  let escalationMode: FeasibilityResult['escalationMode'] = 'normal'
  let userVisibleReason: string | undefined

  if (missingDependencies.length > 0) {
    escalationMode = 'emergency'
    userVisibleReason = 'Required safety information is unavailable on this client.'
  } else if (conflictPairs.length > 0) {
    escalationMode = 'multi-surface'
    userVisibleReason = 'Required information must be split into compatible surfaces.'
  } else if (overBudget) {
    escalationMode = 'focus'
    userVisibleReason = 'Required information needs a focused surface.'
  }

  return {
    mandatoryClosure: closure.ids,
    result: {
      feasible,
      conflicts: conflictPairs,
      missingDependencies,
      requiredCost,
      availableCost: budget.maxVisualCost,
      escalationMode,
      ...(userVisibleReason ? { userVisibleReason } : {}),
    },
  }
}

export function admissionScore(candidate: ProjectionCandidate, profile: AdmissionProfile): number {
  const utility = candidate.utility
  return (
    utility.taskRelevance * profile.weights.taskRelevance
    + utility.urgency * profile.weights.urgency
    + utility.authority * profile.weights.authority
    + utility.confidence * profile.weights.confidence
    + utility.freshness * profile.weights.freshness
    + utility.preference * profile.weights.preference
    - utility.cognitiveCost * Math.abs(profile.weights.cognitiveCost)
  )
}

function bundleConflicts(
  bundleIds: ReadonlySet<string>,
  selectedIds: ReadonlySet<string>,
  registry: Map<string, ProjectionCandidate>,
): boolean {
  if (internalConflicts(bundleIds, registry).length > 0) return true
  for (const bundleId of bundleIds) {
    const bundleItem = registry.get(bundleId)
    if (!bundleItem) return true
    for (const selectedId of selectedIds) {
      const selectedItem = registry.get(selectedId)
      if (selectedItem && conflicts(bundleItem, selectedItem)) return true
    }
  }
  return false
}

function canonicalOrder(
  ids: ReadonlySet<string>,
  registry: Map<string, ProjectionCandidate>,
  profile: AdmissionProfile,
): string[] {
  return [...ids].sort((leftId, rightId) => {
    const left = registry.get(leftId)
    const right = registry.get(rightId)
    if (!left || !right) return leftId.localeCompare(rightId)
    return (
      left.priorityClass - right.priorityClass
      || admissionScore(right, profile) - admissionScore(left, profile)
      || left.instrumentId.localeCompare(right.instrumentId)
    )
  })
}

export function projectSurface(request: ProjectionRequest): ProjectionResult {
  // Hidden/ineligible candidates are filtered before runtime validation so
  // their shape cannot alter an authorized user's observable plan.
  const registryIssues = validateInstrumentRegistry(request.candidates.filter(candidate => candidate.eligible))
  const admissionIssues = validateAdmissionProfile(request.admissionProfile)
  const registry = registryOf(request.candidates)
  const { result: feasibility, mandatoryClosure } = evaluateMandatoryFeasibility(request.candidates, request.budget)
  const trace: ProjectionDecisionTrace = {
    includedIds: [],
    excluded: [],
    mandatoryIds: request.candidates.filter(candidate => candidate.mandatory).map(candidate => candidate.instrumentId).sort(),
    usedCost: 0,
    budget: request.budget.maxVisualCost,
    admissionProfileVersion: request.admissionProfile.version,
    stabilityStateHash: request.stabilityStateHash,
    logicalTime: request.logicalTime,
  }

  if (registryIssues.length > 0 || admissionIssues.length > 0) {
    return {
      ok: false,
      feasibility: {
        ...feasibility,
        feasible: false,
        escalationMode: 'emergency',
        userVisibleReason: 'Instrument registry is invalid.',
      },
      trace: {
        ...trace,
        excluded: [...registryIssues, ...admissionIssues]
          .map(issue => ({ instrumentId: issue.path, reason: issue.code })),
      },
    }
  }

  if (!feasibility.feasible) return { ok: false, feasibility, trace }

  const selected = new Set(mandatoryClosure)
  const orderedCandidates = request.candidates
    .filter(candidate => candidate.eligible && !selected.has(candidate.instrumentId))
    .sort((left, right) => (
      left.priorityClass - right.priorityClass
      || admissionScore(right, request.admissionProfile) - admissionScore(left, request.admissionProfile)
      || left.instrumentId.localeCompare(right.instrumentId)
    ))

  for (const candidate of orderedCandidates) {
    const bundle = dependencyClosure([candidate.instrumentId], request.candidates)
    if (bundle.missing.size > 0 || [...bundle.ids].some(id => !registry.get(id)?.eligible)) {
      trace.excluded.push({ instrumentId: candidate.instrumentId, reason: 'ineligible-dependency' })
      continue
    }
    if (bundleConflicts(bundle.ids, selected, registry)) {
      trace.excluded.push({ instrumentId: candidate.instrumentId, reason: 'conflict' })
      continue
    }
    const next = new Set([...selected, ...bundle.ids])
    const nextCost = unionCost(next, request.candidates)
    if (nextCost > request.budget.maxVisualCost || next.size > request.budget.maxElements) {
      trace.excluded.push({ instrumentId: candidate.instrumentId, reason: 'budget' })
      continue
    }
    for (const id of bundle.ids) selected.add(id)
  }

  const selectedInstrumentIds = canonicalOrder(selected, registry, request.admissionProfile)
  trace.includedIds = selectedInstrumentIds
  trace.usedCost = unionCost(selected, request.candidates)

  return {
    ok: true,
    feasibility,
    plan: {
      planId: request.planId,
      epoch: request.epoch,
      selectedInstrumentIds,
      actionContractIds: [],
      warnings: [],
      trace,
    },
  }
}

export function isNestedPlanCoherent(parent: SurfacePlan, child: SurfacePlan): boolean {
  if (parent.epoch.worldSnapshotRevision === child.epoch.worldSnapshotRevision) return true
  return child.warnings.includes('stale-relative-to-parent') && child.actionContractIds.length === 0
}

export function shouldApplyLivePlan(current: SurfacePlan, incoming: SurfacePlan): boolean {
  if (current.planId !== incoming.planId) return false
  return incoming.epoch.dataEpochSequence > current.epoch.dataEpochSequence
}
