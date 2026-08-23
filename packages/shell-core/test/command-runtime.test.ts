import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  ActionContract,
  Approval,
  ApprovalSet,
  CommandEnvelope,
  ConfirmationToken,
  DomainEvent,
  RiskClass,
} from '../../contracts-domain/shell-v6.ts'
import {
  canonicalJson,
  CommandRuntime,
  createCommandFingerprint,
  hashCanonicalParts,
  idempotencyScopeKey,
  InMemoryCommandRuntimeStore,
  type CommandExecutionRequest,
  type DomainOperation,
  type IdempotencyPolicy,
  type StoredConfirmationToken,
  type TargetState,
} from '../src/index.ts'

const now = Date.parse('2026-08-14T12:00:00.000Z')

const policy: IdempotencyPolicy = {
  leaseDurationMs: 10_000,
  maxRetryAfterMs: 1_000,
  responseRetentionMs: 60_000,
  eventRetentionMs: 600_000,
  tombstoneRetentionMs: 600_000,
  maxQueueAgeMs: 30_000,
}

function command(
  overrides: Partial<CommandEnvelope<{ value: number }>> = {},
): CommandEnvelope<{ value: number }> {
  return {
    commandId: 'command-1',
    commandType: 'coach.timer.start',
    actorId: 'actor-1',
    targetId: 'timer-1',
    expectedRevision: 'revision-1',
    parameters: { value: 30 },
    idempotencyKey: 'attempt-1',
    riskClass: 'safe',
    requestedAt: '2026-08-14T11:59:59.000Z',
    projectionEpochId: 'epoch-1',
    contractVersion: '1.0.0',
    ...overrides,
  }
}

function action(
  riskClass: RiskClass = 'safe',
  confirmationPolicy: ActionContract['confirmationPolicy'] = 'none',
): ActionContract {
  return {
    actionId: 'coach.timer.start',
    version: '1.0.0',
    requiredPermission: 'coach.timer.start',
    riskClass,
    expectedRevisionRequired: true,
    idempotent: true,
    confirmationPolicy,
    reversible: riskClass !== 'irreversible',
    auditClass: 'coach',
  }
}

function request(
  value: CommandEnvelope<{ value: number }>,
  selectedAction: ActionContract = action(value.riskClass),
): CommandExecutionRequest<{ value: number }> {
  return {
    command: value,
    action: selectedAction,
    semanticContext: { mode: 'coach' },
    riskFacts: { value: value.parameters.value },
    displayedSummary: { title: `Start ${value.parameters.value}s timer` },
  }
}

function eventFor(
  value: CommandEnvelope,
  sequence = 1,
  eventId = 'event-1',
): DomainEvent {
  return {
    eventId,
    aggregateId: value.targetId,
    aggregateSequence: sequence,
    eventType: 'coach.timer.started',
    payload: value.parameters,
    schemaVersion: '1.0.0',
    occurredAt: '2026-08-14T12:00:00.000Z',
    causationId: value.commandId,
  }
}

function operation(
  calls: { count: number },
  response = { accepted: true },
): DomainOperation<{ value: number }, { accepted: boolean }> {
  return async (_transaction, value, state) => {
    calls.count += 1
    return {
      response,
      events: [eventFor(value, state.aggregateSequence + 1)],
    }
  }
}

function harness(options: {
  nowMs?: number
  target?: TargetState
  allowedApprovers?: string[]
  authorizeCommand?: boolean
  onInspectTarget?: () => void
} = {}) {
  const store = new InMemoryCommandRuntimeStore()
  const clock = { value: options.nowMs ?? now }
  const target = {
    value: options.target ?? {
      revision: 'revision-1',
      aggregateSequence: 0,
      projectionEpochId: 'epoch-1',
    },
  }
  const allowedApprovers = new Set(options.allowedApprovers ?? ['approver-1', 'approver-2'])
  const runtime = new CommandRuntime({
    clock: { nowMs: () => clock.value },
    store,
    policyFor: () => policy,
    authorizeCommand: async () => options.authorizeCommand ?? true,
    inspectTarget: async () => {
      options.onInspectTarget?.()
      return target.value
    },
    verifyConfirmationSignature: async token => token.signature === 'valid',
    verifyApprovalSignature: async approval => approval.signature === 'valid',
    authorizeApprover: async (_transaction, actorId) => allowedApprovers.has(actorId),
  })
  return { runtime, store, clock, target, allowedApprovers }
}

function confirmationFor(
  selectedRequest: CommandExecutionRequest<{ value: number }>,
  overrides: Partial<StoredConfirmationToken> = {},
): StoredConfirmationToken {
  const binding = createCommandFingerprint(
    selectedRequest.command,
    selectedRequest.semanticContext,
    selectedRequest.riskFacts,
    selectedRequest.displayedSummary,
  )
  const token: ConfirmationToken = {
    tokenId: 'confirmation-1',
    commandId: binding.commandId,
    idempotencyKey: binding.idempotencyKey,
    actorId: binding.actorId,
    commandType: binding.commandType,
    targetId: binding.targetId,
    riskClass: binding.riskClass,
    projectionEpochId: binding.projectionEpochId,
    contractVersion: binding.contractVersion,
    payloadHash: binding.payloadHash,
    expectedRevision: binding.expectedRevision,
    semanticContextHash: binding.semanticContextHash,
    riskFactsHash: binding.riskFactsHash,
    displayedSummaryHash: binding.displayedSummaryHash,
    issuedAt: '2026-08-14T11:59:50.000Z',
    expiresAt: '2026-08-14T12:01:00.000Z',
    signature: 'valid',
  }
  return { ...token, state: 'issued', ...overrides }
}

function approvalFor(
  selectedRequest: CommandExecutionRequest<{ value: number }>,
  actorId: string,
  overrides: Partial<Approval> = {},
): Approval {
  const binding = createCommandFingerprint(
    selectedRequest.command,
    selectedRequest.semanticContext,
    selectedRequest.riskFacts,
    selectedRequest.displayedSummary,
  )
  return {
    approvalId: `approval-${actorId}`,
    actorId,
    commandId: binding.commandId,
    idempotencyKey: binding.idempotencyKey,
    commandType: binding.commandType,
    targetId: binding.targetId,
    riskClass: binding.riskClass,
    projectionEpochId: binding.projectionEpochId,
    contractVersion: binding.contractVersion,
    payloadHash: binding.payloadHash,
    expectedRevision: binding.expectedRevision,
    semanticContextHash: binding.semanticContextHash,
    riskFactsHash: binding.riskFactsHash,
    displayedSummaryHash: binding.displayedSummaryHash,
    approvedAt: '2026-08-14T11:59:55.000Z',
    expiresAt: '2026-08-14T12:01:00.000Z',
    signature: 'valid',
    ...overrides,
  }
}

test('canonical hashing is key-order independent and rejects ambiguous values', () => {
  assert.equal(canonicalJson({ z: 1, a: { y: 2, x: 3 } }), '{"a":{"x":3,"y":2},"z":1}')
  assert.equal(hashCanonicalParts({ a: 1, b: 2 }), hashCanonicalParts({ b: 2, a: 1 }))
  assert.notEqual(hashCanonicalParts(['a', 'bc']), hashCanonicalParts(['ab', 'c']))
  assert.throws(() => canonicalJson({ invalid: undefined }), /rejects undefined/)
})

test('completed duplicate replays stored response without a second operation or event', async () => {
  const { runtime, store } = harness()
  const calls = { count: 0 }
  const selectedRequest = request(command())
  const first = await runtime.execute(selectedRequest, operation(calls))
  const duplicate = await runtime.execute(selectedRequest, operation(calls))

  assert.equal(first.status, 'executed')
  assert.deepEqual(duplicate, {
    status: 'replayed',
    response: { accepted: true },
    eventIds: ['event-1'],
  })
  assert.equal(calls.count, 1)
  assert.equal(store.snapshot().events.size, 1)
})

test('same idempotency scope with a changed payload is a collision', async () => {
  const { runtime } = harness()
  const calls = { count: 0 }
  await runtime.execute(request(command()), operation(calls))
  const collision = await runtime.execute(
    request(command({ parameters: { value: 45 } })),
    operation(calls),
  )
  assert.deepEqual(collision, { status: 'rejected', reason: 'idempotency-collision' })
  assert.equal(calls.count, 1)
})

test('revoked authorization cannot replay a previously stored response', async () => {
  const allowed = harness()
  const calls = { count: 0 }
  const selectedRequest = request(command())
  await allowed.runtime.execute(selectedRequest, operation(calls))
  const stored = allowed.store.snapshot().idempotency.get(
    idempotencyScopeKey(selectedRequest.command),
  )
  assert.ok(stored)

  const denied = harness({ authorizeCommand: false })
  denied.store.seedIdempotency(idempotencyScopeKey(selectedRequest.command), stored)
  const result = await denied.runtime.execute(selectedRequest, operation(calls))
  assert.deepEqual(result, { status: 'rejected', reason: 'authorization-denied' })
  assert.equal(calls.count, 1)
})

test('risk, epoch, and contract version are part of the idempotency fingerprint', () => {
  const base = request(command())
  const fingerprint = createCommandFingerprint(
    base.command,
    base.semanticContext,
    base.riskFacts,
    base.displayedSummary,
  )
  for (const changed of [
    command({ riskClass: 'sensitive' }),
    command({ projectionEpochId: 'epoch-2' }),
    command({ contractVersion: '2.0.0' }),
  ]) {
    const changedFingerprint = createCommandFingerprint(
      changed,
      base.semanticContext,
      base.riskFacts,
      base.displayedSummary,
    )
    assert.notEqual(changedFingerprint.fingerprintHash, fingerprint.fingerprintHash)
  }
})

test('live lease returns bounded retry and never runs the operation', async () => {
  const { runtime, store } = harness()
  const selected = command()
  const fingerprint = createCommandFingerprint(
    selected,
    { mode: 'coach' },
    { value: 30 },
    { title: 'Start 30s timer' },
  )
  store.seedIdempotency(idempotencyScopeKey(selected), {
    state: 'in-progress',
    commandId: selected.commandId,
    fingerprintHash: fingerprint.fingerprintHash,
    leaseEpoch: 7,
    leaseExpiresAtMs: now + 9_000,
  })
  const calls = { count: 0 }
  const result = await runtime.execute(request(selected), operation(calls))
  assert.deepEqual(result, { status: 'retry', retryAfterMs: 1_000 })
  assert.equal(calls.count, 0)
})

test('expired lease recovers from matching outbox instead of repeating the effect', async () => {
  const { runtime, store } = harness()
  const selectedRequest = request(command())
  const selected = selectedRequest.command
  const fingerprint = createCommandFingerprint(
    selected,
    selectedRequest.semanticContext,
    selectedRequest.riskFacts,
    selectedRequest.displayedSummary,
  )
  const scopeKey = idempotencyScopeKey(selected)
  store.seedIdempotency(scopeKey, {
    state: 'in-progress',
    commandId: selected.commandId,
    fingerprintHash: fingerprint.fingerprintHash,
    leaseEpoch: 2,
    leaseExpiresAtMs: now - 1,
  })
  store.seedOutbox({
    commandId: selected.commandId,
    idempotencyScopeKey: scopeKey,
    fingerprintHash: fingerprint.fingerprintHash,
    response: { accepted: true },
    eventIds: ['event-existing'],
    completedAtMs: now - 10,
    responseExpiresAtMs: now + 1_000,
    tombstoneUntilMs: now + 10_000,
  })
  const calls = { count: 0 }
  const result = await runtime.execute(selectedRequest, operation(calls))
  assert.deepEqual(result, {
    status: 'recovered',
    response: { accepted: true },
    eventIds: ['event-existing'],
  })
  assert.equal(calls.count, 0)
})

test('expired lease without outbox takes over with a monotonic fencing epoch', async () => {
  const { runtime, store } = harness()
  const selectedRequest = request(command())
  const fingerprint = createCommandFingerprint(
    selectedRequest.command,
    selectedRequest.semanticContext,
    selectedRequest.riskFacts,
    selectedRequest.displayedSummary,
  )
  store.seedIdempotency(idempotencyScopeKey(selectedRequest.command), {
    state: 'in-progress',
    commandId: selectedRequest.command.commandId,
    fingerprintHash: fingerprint.fingerprintHash,
    leaseEpoch: 4,
    leaseExpiresAtMs: now - 1,
  })
  const result = await runtime.execute(selectedRequest, operation({ count: 0 }))
  assert.equal(result.status, 'executed')
  if (result.status === 'executed') assert.equal(result.leaseEpoch, 5)
})

test('concurrent identical requests execute exactly one operation', async () => {
  const { runtime, store } = harness()
  const selectedRequest = request(command())
  const calls = { count: 0 }
  const slowOperation: DomainOperation<{ value: number }, { accepted: boolean }> = async (
    _transaction,
    value,
    state,
  ) => {
    calls.count += 1
    await new Promise(resolve => setTimeout(resolve, 5))
    return {
      response: { accepted: true },
      events: [eventFor(value, state.aggregateSequence + 1)],
    }
  }
  const [left, right] = await Promise.all([
    runtime.execute(selectedRequest, slowOperation),
    runtime.execute(selectedRequest, slowOperation),
  ])
  assert.deepEqual(new Set([left.status, right.status]), new Set(['executed', 'replayed']))
  assert.equal(calls.count, 1)
  assert.equal(store.snapshot().events.size, 1)
})

test('confirmation is bound, server-clock checked, consumed once, and rolled back on mismatch', async () => {
  const { runtime, store } = harness()
  const selectedRequest = request(command(), action('safe', 'summary'))
  const wrong = confirmationFor(selectedRequest, { riskFactsHash: 'wrong' })
  store.seedConfirmation(wrong)
  const calls = { count: 0 }
  const mismatch = await runtime.execute(
    { ...selectedRequest, confirmationTokenId: wrong.tokenId },
    operation(calls),
  )
  assert.deepEqual(mismatch, { status: 'rejected', reason: 'confirmation-binding-mismatch' })
  assert.equal(store.snapshot().confirmations.get(wrong.tokenId)?.state, 'issued')

  const valid = confirmationFor(selectedRequest)
  store.seedConfirmation(valid)
  const executed = await runtime.execute(
    { ...selectedRequest, confirmationTokenId: valid.tokenId },
    operation(calls),
  )
  assert.equal(executed.status, 'executed')
  assert.equal(store.snapshot().confirmations.get(valid.tokenId)?.state, 'consumed')

  const another = request(command({ commandId: 'command-2', idempotencyKey: 'attempt-2' }), action('safe', 'summary'))
  const reused = await runtime.execute(
    { ...another, confirmationTokenId: valid.tokenId },
    operation(calls),
  )
  assert.deepEqual(reused, { status: 'rejected', reason: 'confirmation-already-used' })
})

test('confirmation expiry uses server clock, not a future client requestedAt', async () => {
  const { runtime, store } = harness()
  const selectedRequest = request(
    command({ requestedAt: '2099-01-01T00:00:00.000Z' }),
    action('safe', 'step-up'),
  )
  const expired = confirmationFor(selectedRequest, {
    expiresAt: '2026-08-14T11:59:59.000Z',
  })
  store.seedConfirmation(expired)
  const result = await runtime.execute(
    { ...selectedRequest, confirmationTokenId: expired.tokenId },
    operation({ count: 0 }),
  )
  assert.deepEqual(result, { status: 'rejected', reason: 'confirmation-expired' })
})

test('confirmation timestamp must be canonical UTC RFC3339', async () => {
  const { runtime, store } = harness()
  const selectedRequest = request(command(), action('safe', 'step-up'))
  const ambiguous = confirmationFor(selectedRequest, {
    issuedAt: '2026-08-14 11:59:50',
  })
  store.seedConfirmation(ambiguous)
  const result = await runtime.execute(
    { ...selectedRequest, confirmationTokenId: ambiguous.tokenId },
    operation({ count: 0 }),
  )
  assert.deepEqual(result, { status: 'rejected', reason: 'confirmation-expired' })
})

test('confirmation expiry is checked after transaction and target waits', async () => {
  let clockRef: { value: number } | undefined
  const testHarness = harness({
    onInspectTarget: () => {
      if (clockRef) clockRef.value = now + 61_000
    },
  })
  clockRef = testHarness.clock
  const selectedRequest = request(command(), action('safe', 'step-up'))
  const token = confirmationFor(selectedRequest)
  testHarness.store.seedConfirmation(token)
  const result = await testHarness.runtime.execute(
    { ...selectedRequest, confirmationTokenId: token.tokenId },
    operation({ count: 0 }),
  )
  assert.deepEqual(result, { status: 'rejected', reason: 'confirmation-expired' })
  assert.equal(testHarness.store.snapshot().confirmations.get(token.tokenId)?.state, 'issued')
  assert.equal(testHarness.store.snapshot().idempotency.size, 0)
})

test('two-party approval requires distinct non-initiators and live approve permission', async () => {
  const selectedCommand = command({ riskClass: 'legal' })
  const selectedRequest = request(selectedCommand, action('legal', 'two-party'))
  const validSet: ApprovalSet = {
    approvalSetId: 'approval-set-1',
    initiatorActorId: selectedCommand.actorId,
    requiredApprovals: 2,
    approvals: [
      approvalFor(selectedRequest, 'approver-1'),
      approvalFor(selectedRequest, 'approver-2'),
    ],
    expiresAt: '2026-08-14T12:01:00.000Z',
    state: 'open',
  }

  const deniedHarness = harness({ allowedApprovers: ['approver-1'] })
  deniedHarness.store.seedApprovalSet(validSet)
  const denied = await deniedHarness.runtime.execute(
    { ...selectedRequest, approvalSetId: validSet.approvalSetId },
    operation({ count: 0 }),
  )
  assert.deepEqual(denied, { status: 'rejected', reason: 'approval-invalid' })
  assert.equal(deniedHarness.store.snapshot().approvalSets.get(validSet.approvalSetId)?.state, 'open')

  const duplicateHarness = harness()
  duplicateHarness.store.seedApprovalSet({
    ...validSet,
    approvals: [
      approvalFor(selectedRequest, 'approver-1'),
      approvalFor(selectedRequest, 'approver-1', { approvalId: 'duplicate' }),
    ],
  })
  const duplicate = await duplicateHarness.runtime.execute(
    { ...selectedRequest, approvalSetId: validSet.approvalSetId },
    operation({ count: 0 }),
  )
  assert.deepEqual(duplicate, { status: 'rejected', reason: 'approval-invalid' })

  const validHarness = harness()
  validHarness.store.seedApprovalSet(validSet)
  const success = await validHarness.runtime.execute(
    { ...selectedRequest, approvalSetId: validSet.approvalSetId },
    operation({ count: 0 }),
  )
  assert.equal(success.status, 'executed')
  assert.equal(validHarness.store.snapshot().approvalSets.get(validSet.approvalSetId)?.state, 'consumed')
})

test('high-risk offline command requires confirmation issued after reconnect', async () => {
  const { runtime, store } = harness()
  const selectedRequest = request(
    command({ riskClass: 'financial' }),
    action('financial', 'step-up'),
  )
  const old = confirmationFor(selectedRequest, {
    issuedAt: '2026-08-14T11:59:50.000Z',
  })
  store.seedConfirmation(old)
  const offline = {
    outcome: 'still-valid' as const,
    reconnectedAtServerMs: now - 5_000,
    acceptedAtServerMs: now - 10_000,
  }
  const rejected = await runtime.execute(
    { ...selectedRequest, confirmationTokenId: old.tokenId, offline },
    operation({ count: 0 }),
  )
  assert.deepEqual(rejected, {
    status: 'rejected',
    reason: 'offline-live-confirmation-required',
  })

  const live = confirmationFor(selectedRequest, {
    tokenId: 'confirmation-live',
    issuedAt: '2026-08-14T11:59:56.000Z',
  })
  store.seedConfirmation(live)
  const executed = await runtime.execute(
    { ...selectedRequest, confirmationTokenId: live.tokenId, offline },
    operation({ count: 0 }),
  )
  assert.equal(executed.status, 'executed')
})

test('offline queue age is measured from server acceptance', async () => {
  const { runtime } = harness()
  const selectedRequest = request(command({ requestedAt: '2099-01-01T00:00:00.000Z' }))
  const result = await runtime.execute(
    {
      ...selectedRequest,
      offline: {
        outcome: 'still-valid',
        reconnectedAtServerMs: now - 1,
        acceptedAtServerMs: now - policy.maxQueueAgeMs - 1,
      },
    },
    operation({ count: 0 }),
  )
  assert.deepEqual(result, { status: 'rejected', reason: 'offline-expired' })
})

test('future server acceptance timestamp is rejected', async () => {
  const { runtime } = harness()
  const selectedRequest = request(command())
  const result = await runtime.execute(
    {
      ...selectedRequest,
      offline: {
        outcome: 'still-valid',
        reconnectedAtServerMs: now - 1,
        acceptedAtServerMs: now + 1,
      },
    },
    operation({ count: 0 }),
  )
  assert.deepEqual(result, { status: 'rejected', reason: 'offline-expired' })
})

test('expired completed response becomes a durable tombstone and is never re-executed', async () => {
  const { runtime, store } = harness()
  const selectedRequest = request(command())
  const fingerprint = createCommandFingerprint(
    selectedRequest.command,
    selectedRequest.semanticContext,
    selectedRequest.riskFacts,
    selectedRequest.displayedSummary,
  )
  const scopeKey = idempotencyScopeKey(selectedRequest.command)
  store.seedIdempotency(scopeKey, {
    state: 'completed',
    commandId: selectedRequest.command.commandId,
    fingerprintHash: fingerprint.fingerprintHash,
    leaseEpoch: 1,
    response: { accepted: true },
    resultEventIds: ['event-old'],
    completedAtMs: now - 100,
    responseExpiresAtMs: now - 1,
    tombstoneUntilMs: now + policy.eventRetentionMs,
  })
  const calls = { count: 0 }
  const first = await runtime.execute(selectedRequest, operation(calls))
  const second = await runtime.execute(selectedRequest, operation(calls))
  assert.deepEqual(first, { status: 'rejected', reason: 'idempotency-expired' })
  assert.deepEqual(second, { status: 'rejected', reason: 'idempotency-expired' })
  assert.equal(calls.count, 0)
  assert.equal(store.snapshot().idempotency.get(scopeKey)?.state, 'expired-tombstone')
})

test('epoch mismatch wins over revision mismatch and rolls back reservation and confirmation', async () => {
  const selectedRequest = request(command(), action('safe', 'summary'))
  const { runtime, store, target } = harness({
    target: {
      revision: 'revision-other',
      aggregateSequence: 0,
      projectionEpochId: 'epoch-other',
    },
  })
  const token = confirmationFor(selectedRequest)
  store.seedConfirmation(token)
  const blocked = await runtime.execute(
    { ...selectedRequest, confirmationTokenId: token.tokenId },
    operation({ count: 0 }),
  )
  assert.deepEqual(blocked, { status: 'rejected', reason: 'resync-required' })
  assert.equal(store.snapshot().confirmations.get(token.tokenId)?.state, 'issued')
  assert.equal(store.snapshot().idempotency.size, 0)

  target.value = {
    revision: selectedRequest.command.expectedRevision,
    aggregateSequence: 0,
    projectionEpochId: selectedRequest.command.projectionEpochId,
  }
  const retried = await runtime.execute(
    { ...selectedRequest, confirmationTokenId: token.tokenId },
    operation({ count: 0 }),
  )
  assert.equal(retried.status, 'executed')
})

test('invalid event sequence aborts confirmation, idempotency, and outbox together', async () => {
  const { runtime, store } = harness()
  const selectedRequest = request(command(), action('safe', 'summary'))
  const token = confirmationFor(selectedRequest)
  store.seedConfirmation(token)
  const invalid: DomainOperation<{ value: number }, { accepted: boolean }> = async (
    _transaction,
    value,
  ) => ({
    response: { accepted: true },
    events: [eventFor(value, 99)],
  })
  const result = await runtime.execute(
    { ...selectedRequest, confirmationTokenId: token.tokenId },
    invalid,
  )
  assert.deepEqual(result, { status: 'rejected', reason: 'invalid-domain-events' })
  const snapshot = store.snapshot()
  assert.equal(snapshot.confirmations.get(token.tokenId)?.state, 'issued')
  assert.equal(snapshot.idempotency.size, 0)
  assert.equal(snapshot.outbox.size, 0)
  assert.equal(snapshot.events.size, 0)
})
