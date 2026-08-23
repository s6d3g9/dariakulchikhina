import { createHash } from 'node:crypto'

import type {
  PlacementPlan,
  SpatialRevitApplyParameters,
} from './contracts.ts'

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue }

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function encodeCanonical(value: unknown, seen: Set<object>): string {
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('canonical JSON rejects non-finite numbers')
    }
    return Object.is(value, -0) ? '0' : JSON.stringify(value)
  }
  if (typeof value !== 'object') {
    throw new TypeError(`canonical JSON rejects ${typeof value}`)
  }
  if (seen.has(value)) {
    throw new TypeError('canonical JSON rejects cycles')
  }

  seen.add(value)
  try {
    if (Array.isArray(value)) {
      return `[${value.map(item => encodeCanonical(item, seen)).join(',')}]`
    }
    if (!isPlainObject(value)) {
      throw new TypeError('canonical JSON accepts only arrays and plain objects')
    }
    const entries = Object.keys(value)
      .sort()
      .map(key => {
        const item = value[key]
        if (item === undefined) {
          throw new TypeError('canonical JSON rejects undefined')
        }
        return `${JSON.stringify(key)}:${encodeCanonical(item, seen)}`
      })
    return `{${entries.join(',')}}`
  } finally {
    seen.delete(value)
  }
}

export function canonicalJson(value: unknown): string {
  return encodeCanonical(value, new Set())
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function hashCanonicalParts(...parts: readonly unknown[]): string {
  const framed = parts.map(part => canonicalJson(part)).join('\0')
  return sha256Hex(framed)
}

const restrictedPublicKeys = new Set([
  'deniedSetDigest',
  'restrictedCompilationAudit',
  'restrictedGateRevision',
])

export function assertPublicContract(value: unknown): void {
  const visit = (current: unknown, path: string, seen: Set<object>): void => {
    if (current === null || typeof current !== 'object') return
    if (seen.has(current)) {
      throw new TypeError(`public contract contains a cycle at ${path}`)
    }
    seen.add(current)
    try {
      if (Array.isArray(current)) {
        current.forEach((item, index) => visit(item, `${path}[${index}]`, seen))
        return
      }
      if (!isPlainObject(current)) {
        throw new TypeError(`public contract contains a non-plain object at ${path}`)
      }
      for (const [key, item] of Object.entries(current)) {
        const itemPath = `${path}.${key}`
        if (restrictedPublicKeys.has(key)) {
          throw new TypeError(`restricted audit field is forbidden at ${itemPath}`)
        }
        visit(item, itemPath, seen)
      }
    } finally {
      seen.delete(current)
    }
  }

  visit(value, '$', new Set())
}

export type PlacementPlanHashInput = Omit<PlacementPlan, 'planHash'>

export function createPublicPlanHash(plan: PlacementPlanHashInput): string {
  assertPublicContract(plan)
  return hashCanonicalParts('spatial-placement-plan', '1.0.0', plan)
}

export function createRevitOperationId(
  planHash: string,
  stepId: string,
  stepContractVersion: string,
): string {
  return hashCanonicalParts(
    'spatial-revit-operation',
    '1.0.0',
    planHash,
    stepId,
    stepContractVersion,
  )
}

export function createRevitCapabilityDigest(
  capabilities: Readonly<Record<string, CanonicalValue>>,
): string {
  return hashCanonicalParts('spatial-revit-capabilities', '1.0.0', capabilities)
}

export function createRevitApplyPayloadHash(
  parameters: SpatialRevitApplyParameters,
): string {
  assertPublicContract(parameters)
  return hashCanonicalParts('spatial-revit-apply', '1.0.0', parameters)
}
