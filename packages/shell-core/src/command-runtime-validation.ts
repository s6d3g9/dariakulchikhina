import type {
  Approval,
  ApprovalSet,
  CommandEnvelope,
  ConfirmationBinding,
  DomainEvent,
} from '../../contracts-domain/shell-v6.ts'
import { parseCanonicalTimestampMs } from './command-runtime-canonical.ts'
import type { CommandFingerprint, IdempotencyPolicy } from './command-runtime-types.ts'

export function validateCommandRuntimePolicy(policy: IdempotencyPolicy): void {
  if (Object.values(policy).some(value => !Number.isFinite(value) || value <= 0)) {
    throw new Error('command runtime policy durations must be positive finite numbers')
  }
  if (policy.tombstoneRetentionMs < policy.eventRetentionMs) {
    throw new Error('tombstone retention must be at least event retention')
  }
}

export function validateDomainEvents(
  events: DomainEvent[],
  command: CommandEnvelope,
  currentSequence: number,
): boolean {
  if (events.length === 0) return false
  const ids = new Set<string>()
  return events.every((event, index) => {
    const expectedSequence = currentSequence + index + 1
    if (ids.has(event.eventId)) return false
    ids.add(event.eventId)
    return event.aggregateId === command.targetId
      && event.causationId === command.commandId
      && event.aggregateSequence === expectedSequence
  })
}

function approvalBinding(approval: Approval): ConfirmationBinding {
  return {
    commandId: approval.commandId,
    idempotencyKey: approval.idempotencyKey,
    actorId: approval.actorId,
    commandType: approval.commandType,
    targetId: approval.targetId,
    riskClass: approval.riskClass,
    projectionEpochId: approval.projectionEpochId,
    contractVersion: approval.contractVersion,
    payloadHash: approval.payloadHash,
    expectedRevision: approval.expectedRevision,
    semanticContextHash: approval.semanticContextHash,
    riskFactsHash: approval.riskFactsHash,
    displayedSummaryHash: approval.displayedSummaryHash,
  }
}

export function approvalMatchesCommand(
  approval: Approval,
  expected: ConfirmationBinding,
): boolean {
  const binding = approvalBinding(approval)
  return binding.commandId === expected.commandId
    && binding.idempotencyKey === expected.idempotencyKey
    && binding.commandType === expected.commandType
    && binding.targetId === expected.targetId
    && binding.riskClass === expected.riskClass
    && binding.projectionEpochId === expected.projectionEpochId
    && binding.contractVersion === expected.contractVersion
    && binding.payloadHash === expected.payloadHash
    && binding.expectedRevision === expected.expectedRevision
    && binding.semanticContextHash === expected.semanticContextHash
    && binding.riskFactsHash === expected.riskFactsHash
    && binding.displayedSummaryHash === expected.displayedSummaryHash
}

export function isApprovalSetOpen(
  approvalSet: ApprovalSet,
  fingerprint: CommandFingerprint,
  nowMs: number,
): boolean {
  const expiresAtMs = parseCanonicalTimestampMs(approvalSet.expiresAt)
  return approvalSet.initiatorActorId === fingerprint.actorId
    && approvalSet.requiredApprovals >= 2
    && expiresAtMs !== undefined
    && nowMs < expiresAtMs
}
