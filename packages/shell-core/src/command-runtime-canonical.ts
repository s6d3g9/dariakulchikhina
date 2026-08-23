import { createHash } from 'node:crypto'

import type {
  CommandEnvelope,
  ConfirmationBinding,
  RiskClass,
} from '../../contracts-domain/shell-v6.ts'
import type { CommandFingerprint } from './command-runtime-types.ts'

function canonicalize(value: unknown, ancestors: WeakSet<object>): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('canonical JSON rejects non-finite numbers')
    return Object.is(value, -0) ? 0 : value
  }
  if (typeof value !== 'object') {
    throw new TypeError(`canonical JSON rejects ${typeof value}`)
  }
  if (ancestors.has(value)) throw new TypeError('canonical JSON rejects cycles')
  ancestors.add(value)
  try {
    if (Array.isArray(value)) return value.map(item => canonicalize(item, ancestors))
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('canonical JSON accepts only plain objects and arrays')
    }
    const record = value as Record<string, unknown>
    const normalized: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort()) {
      normalized[key] = canonicalize(record[key], ancestors)
    }
    return normalized
  } finally {
    ancestors.delete(value)
  }
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value, new WeakSet<object>()))
}

export function hashCanonicalParts(...parts: unknown[]): string {
  const hash = createHash('sha256')
  for (const part of parts) {
    hash.update(canonicalJson(part), 'utf8')
    hash.update('\0', 'utf8')
  }
  return hash.digest('hex')
}

export function idempotencyScopeKey(command: CommandEnvelope): string {
  return canonicalJson([
    command.actorId,
    command.commandType,
    command.targetId,
    command.idempotencyKey,
  ])
}

export function createCommandFingerprint<P>(
  command: CommandEnvelope<P>,
  semanticContext: unknown,
  riskFacts: unknown,
  displayedSummary: unknown,
): CommandFingerprint {
  const payloadHash = hashCanonicalParts(command.parameters)
  const semanticContextHash = hashCanonicalParts(semanticContext)
  const riskFactsHash = hashCanonicalParts(riskFacts)
  const displayedSummaryHash = hashCanonicalParts(displayedSummary)
  const binding: ConfirmationBinding = {
    commandId: command.commandId,
    idempotencyKey: command.idempotencyKey,
    actorId: command.actorId,
    commandType: command.commandType,
    targetId: command.targetId,
    riskClass: command.riskClass,
    projectionEpochId: command.projectionEpochId,
    contractVersion: command.contractVersion,
    payloadHash,
    expectedRevision: command.expectedRevision,
    semanticContextHash,
    riskFactsHash,
    displayedSummaryHash,
  }
  return { ...binding, fingerprintHash: hashCanonicalParts(binding) }
}

export function isHighRisk(riskClass: RiskClass): boolean {
  return ['financial', 'legal', 'physical', 'irreversible'].includes(riskClass)
}

export function sameConfirmationBinding(
  candidate: ConfirmationBinding,
  expected: ConfirmationBinding,
): boolean {
  return candidate.commandId === expected.commandId
    && candidate.idempotencyKey === expected.idempotencyKey
    && candidate.actorId === expected.actorId
    && candidate.commandType === expected.commandType
    && candidate.targetId === expected.targetId
    && candidate.riskClass === expected.riskClass
    && candidate.projectionEpochId === expected.projectionEpochId
    && candidate.contractVersion === expected.contractVersion
    && candidate.payloadHash === expected.payloadHash
    && candidate.expectedRevision === expected.expectedRevision
    && candidate.semanticContextHash === expected.semanticContextHash
    && candidate.riskFactsHash === expected.riskFactsHash
    && candidate.displayedSummaryHash === expected.displayedSummaryHash
}

export function parseCanonicalTimestampMs(timestamp: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(timestamp)) {
    return undefined
  }
  const parsed = Date.parse(timestamp)
  return Number.isFinite(parsed) ? parsed : undefined
}
