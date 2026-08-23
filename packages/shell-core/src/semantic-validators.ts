import type {
  AdmissionProfile,
  Claim,
  ClaimResolution,
  DerivedArtifact,
  InstrumentManifest,
  ResolutionProfile,
} from '../../contracts-domain/shell-v6.ts'

export interface ValidationIssue {
  code: string
  path: string
  message: string
}

export function validateAdmissionProfile(profile: AdmissionProfile): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const [name, weight] of Object.entries(profile.weights)) {
    if (!Number.isFinite(weight) || weight < 0) {
      issues.push({
        code: 'admission.invalid-weight',
        path: `weights.${name}`,
        message: 'Admission weights must be finite and non-negative.',
      })
    }
  }
  return issues
}

export function deriveAudience(inputAudiences: readonly (readonly string[])[]): string[] {
  if (inputAudiences.length === 0) return []
  const [first = [], ...rest] = inputAudiences
  return [...new Set(first)].filter(subject => rest.every(audience => audience.includes(subject))).sort()
}

export function validateDerivedArtifact(artifact: DerivedArtifact): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const declaredInputs = new Set(artifact.inputClaimIds)
  const allDependencies = [
    ...artifact.inputClaimIds,
    ...artifact.inputArtifactIds,
    ...artifact.traversalClaimIds,
  ]

  if (allDependencies.length === 0) {
    issues.push({
      code: 'artifact.empty-inputs',
      path: 'inputClaimIds',
      message: 'A derived artifact without inputs is deny-by-default and cannot be served.',
    })
  }

  for (const claimId of artifact.generationContextClaimIds) {
    if (!declaredInputs.has(claimId)) {
      issues.push({
        code: 'artifact.undeclared-generation-input',
        path: 'generationContextClaimIds',
        message: `Generation context claim ${claimId} is missing from inputClaimIds.`,
      })
    }
  }

  return issues
}

function stronglyConnectedComponents(manifests: readonly InstrumentManifest[]): string[][] {
  const registry = new Map(manifests.map(item => [item.instrumentId, item]))
  const indexById = new Map<string, number>()
  const lowLinkById = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const components: string[][] = []
  let nextIndex = 0

  function visit(id: string): void {
    indexById.set(id, nextIndex)
    lowLinkById.set(id, nextIndex)
    nextIndex += 1
    stack.push(id)
    onStack.add(id)

    for (const dependencyId of registry.get(id)?.dependencies ?? []) {
      if (!registry.has(dependencyId)) continue
      if (!indexById.has(dependencyId)) {
        visit(dependencyId)
        lowLinkById.set(id, Math.min(lowLinkById.get(id) ?? 0, lowLinkById.get(dependencyId) ?? 0))
      } else if (onStack.has(dependencyId)) {
        lowLinkById.set(id, Math.min(lowLinkById.get(id) ?? 0, indexById.get(dependencyId) ?? 0))
      }
    }

    if (lowLinkById.get(id) !== indexById.get(id)) return
    const component: string[] = []
    while (stack.length > 0) {
      const member = stack.pop()
      if (!member) break
      onStack.delete(member)
      component.push(member)
      if (member === id) break
    }
    components.push(component.sort())
  }

  for (const id of [...registry.keys()].sort()) {
    if (!indexById.has(id)) visit(id)
  }
  return components
}

export function validateInstrumentRegistry(manifests: readonly InstrumentManifest[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const registry = new Map<string, InstrumentManifest>()

  for (const manifest of manifests) {
    if (registry.has(manifest.instrumentId)) {
      issues.push({ code: 'instrument.duplicate', path: manifest.instrumentId, message: 'Duplicate instrument id.' })
    }
    registry.set(manifest.instrumentId, manifest)
    if (!Number.isFinite(manifest.complexityCost) || manifest.complexityCost < 0) {
      issues.push({ code: 'instrument.invalid-cost', path: manifest.instrumentId, message: 'complexityCost must be finite and non-negative.' })
    }
  }

  for (const manifest of manifests) {
    for (const dependencyId of manifest.dependencies) {
      if (!registry.has(dependencyId)) {
        issues.push({
          code: 'instrument.missing-dependency',
          path: manifest.instrumentId,
          message: `Missing dependency ${dependencyId}.`,
        })
      }
    }
  }

  for (const component of stronglyConnectedComponents(manifests)) {
    const selfLoop = component.length === 1 && registry.get(component[0] ?? '')?.dependencies.includes(component[0] ?? '')
    if (component.length === 1 && !selfLoop) continue
    const atomicGroups = new Set(component.map(id => registry.get(id)?.atomicGroup).filter(Boolean))
    if (atomicGroups.size !== 1 || component.some(id => !registry.get(id)?.atomicGroup)) {
      issues.push({
        code: 'instrument.dependency-cycle',
        path: component.join(','),
        message: 'Dependency cycle must be contained in one declared atomicGroup.',
      })
    }
  }

  return issues.sort((left, right) => `${left.code}:${left.path}`.localeCompare(`${right.code}:${right.path}`))
}

function asMillis(value?: string): number {
  if (!value) return Number.NEGATIVE_INFINITY
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

function stableValue(value: unknown): string {
  if (value === undefined) return 'undefined'
  return JSON.stringify(value, Object.keys((value && typeof value === 'object' ? value : {}) as object).sort())
}

export function resolveClaims<T>(
  authorizedClaims: readonly Claim<T>[],
  profile: ResolutionProfile,
  logicalTime: string,
): ClaimResolution<T> {
  const now = asMillis(logicalTime)
  const authorityRank = new Map(profile.authorityOrder.map((value, index) => [value, index]))
  const confidenceRank = new Map(profile.confidenceOrder.map((value, index) => [value, index]))
  const active = authorizedClaims.filter(claim => {
    if (claim.status !== 'active') return false
    if (claim.expiresAt && asMillis(claim.expiresAt) <= now) return false
    if (claim.validTime?.from && asMillis(claim.validTime.from) > now) return false
    if (claim.validTime?.to && asMillis(claim.validTime.to) <= now) return false
    return true
  })

  if (active.length === 0) return { state: 'unknown', candidates: [] }

  const primaryKey = (claim: Claim<T>): [number, number, number] => [
    authorityRank.get(claim.authority) ?? -1,
    confidenceRank.get(claim.confidenceClass) ?? -1,
    Math.max(asMillis(claim.validTime?.from), asMillis(claim.observedAt), asMillis(claim.recordedAt)),
  ]
  const comparePrimary = (left: Claim<T>, right: Claim<T>): number => {
    const a = primaryKey(left)
    const b = primaryKey(right)
    return b[0] - a[0] || b[1] - a[1] || b[2] - a[2]
  }
  const ordered = [...active].sort((left, right) => comparePrimary(left, right) || left.claimId.localeCompare(right.claimId))
  const best = ordered[0]
  if (!best) return { state: 'unknown', candidates: [] }
  const bestKey = primaryKey(best)
  const topClass = ordered.filter(claim => primaryKey(claim).every((value, index) => value === bestKey[index]))
  if (new Set(topClass.map(claim => stableValue(claim.objectId ?? claim.value))).size > 1) {
    return { state: 'ambiguous', candidates: topClass }
  }
  return { state: 'resolved', claim: best, dominatedCandidates: ordered.slice(topClass.length) }
}
