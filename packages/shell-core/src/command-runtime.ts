import type {
  ActionContract,
  Approval,
  ApprovalSet,
  CommandEnvelope,
} from '../../contracts-domain/shell-v6.ts'
import {
  createCommandFingerprint,
  idempotencyScopeKey,
  isHighRisk,
  parseCanonicalTimestampMs,
  sameConfirmationBinding,
} from './command-runtime-canonical.ts'
import type {
  CommandExecutionRequest,
  CommandExecutionResult,
  CommandFingerprint,
  CommandOutboxRecord,
  CommandRejectionReason,
  CommandRuntimeDependencies,
  CommandRuntimeTransaction,
  CompletedIdempotencyRecord,
  DomainOperation,
  IdempotencyPolicy,
  OfflineCommandContext,
  StoredConfirmationToken,
  TransactionDecision,
} from './command-runtime-types.ts'
import {
  approvalMatchesCommand,
  isApprovalSetOpen,
  validateCommandRuntimePolicy,
  validateDomainEvents,
} from './command-runtime-validation.ts'

type ConfirmationResult =
  | { ok: true; issuedAtMs: number }
  | { ok: false; reason: CommandRejectionReason }

interface ReservationInput<TTransaction extends CommandRuntimeTransaction> {
  transaction: TTransaction
  scopeKey: string
  fingerprint: CommandFingerprint
  commandId: string
  policy: IdempotencyPolicy
}

interface TimedReservationInput<TTransaction extends CommandRuntimeTransaction>
  extends ReservationInput<TTransaction> {
  nowMs: number
}

interface ApprovalConsumeInput<TTransaction extends CommandRuntimeTransaction> {
  transaction: TTransaction
  approvalSetId: string
  action: ActionContract
  fingerprint: CommandFingerprint
  offline?: OfflineCommandContext
  nowMs: number
}

interface TokenConsumeInput<TTransaction extends CommandRuntimeTransaction> {
  transaction: TTransaction
  tokenId: string
  fingerprint: CommandFingerprint
  offline?: OfflineCommandContext
  mustConfirmOffline: boolean
  nowMs: number
}

function reject<R>(reason: CommandRejectionReason): CommandExecutionResult<R> {
  return { status: 'rejected', reason }
}

function rollback<T>(value: T): TransactionDecision<T> {
  return { commit: false, value }
}

function commit<T>(value: T): TransactionDecision<T> {
  return { commit: true, value }
}

export class CommandRuntime<
  TTransaction extends CommandRuntimeTransaction = CommandRuntimeTransaction,
> {
  private readonly dependencies: CommandRuntimeDependencies<TTransaction>

  constructor(dependencies: CommandRuntimeDependencies<TTransaction>) {
    this.dependencies = dependencies
  }

  async execute<P, R>(
    request: CommandExecutionRequest<P>,
    operation: DomainOperation<P, R, TTransaction>,
  ): Promise<CommandExecutionResult<R>> {
    const { action, command } = request
    if (!this.isActionContractCompatible(action, command)) {
      return reject('action-contract-mismatch')
    }

    const policy = this.dependencies.policyFor(command.riskClass)
    validateCommandRuntimePolicy(policy)

    const fingerprint = createCommandFingerprint(
      command,
      request.semanticContext,
      request.riskFacts,
      request.displayedSummary,
    )
    const scopeKey = idempotencyScopeKey(command)

    return this.dependencies.store.transaction(async transaction => {
      if (!await this.dependencies.authorizeCommand(transaction, command, action)) {
        return rollback(reject<R>('authorization-denied'))
      }

      const offlineRejection = this.evaluateOffline(
        request.offline,
        command,
        policy,
        this.dependencies.clock.nowMs(),
      )
      if (offlineRejection) return rollback(reject<R>(offlineRejection))

      const reservation = await this.reserve<R>({
        transaction,
        scopeKey,
        fingerprint,
        commandId: command.commandId,
        policy,
      })
      if (reservation.kind === 'result') return reservation.decision

      const state = await this.dependencies.inspectTarget(transaction, command.targetId)
      if (state.projectionEpochId !== command.projectionEpochId) {
        return rollback(reject<R>('resync-required'))
      }
      if (state.revision !== command.expectedRevision) {
        return rollback(reject<R>('revision-conflict'))
      }

      const confirmation = await this.consumeRequiredConfirmation(
        transaction,
        request,
        fingerprint,
        this.dependencies.clock.nowMs(),
      )
      if (!confirmation.ok) return rollback(reject<R>(confirmation.reason))

      const execution = await operation(transaction, command, state)
      if (!validateDomainEvents(execution.events, command, state.aggregateSequence)) {
        return rollback(reject<R>('invalid-domain-events'))
      }

      const completedAtMs = this.dependencies.clock.nowMs()
      const responseExpiresAtMs = completedAtMs + policy.responseRetentionMs
      const tombstoneUntilMs = completedAtMs + Math.max(
        policy.tombstoneRetentionMs,
        policy.eventRetentionMs,
      )
      const eventIds = execution.events.map(event => event.eventId)
      const outbox: CommandOutboxRecord<R> = {
        commandId: command.commandId,
        idempotencyScopeKey: scopeKey,
        fingerprintHash: fingerprint.fingerprintHash,
        response: execution.response,
        eventIds,
        completedAtMs,
        responseExpiresAtMs,
        tombstoneUntilMs,
      }
      await transaction.putOutbox(outbox, execution.events)

      const fenced = await transaction.getIdempotency<R>(scopeKey)
      if (
        fenced?.state !== 'in-progress'
        || fenced.leaseEpoch !== reservation.leaseEpoch
        || fenced.fingerprintHash !== fingerprint.fingerprintHash
      ) return rollback(reject<R>('lost-lease'))

      await transaction.putIdempotency<R>(scopeKey, {
        state: 'completed',
        commandId: command.commandId,
        fingerprintHash: fingerprint.fingerprintHash,
        leaseEpoch: reservation.leaseEpoch,
        response: execution.response,
        resultEventIds: eventIds,
        completedAtMs,
        responseExpiresAtMs,
        tombstoneUntilMs,
      })
      return commit<CommandExecutionResult<R>>({
        status: 'executed',
        response: execution.response,
        eventIds,
        leaseEpoch: reservation.leaseEpoch,
      })
    })
  }

  private isActionContractCompatible<P>(
    action: ActionContract,
    command: CommandEnvelope<P>,
  ): boolean {
    return action.actionId === command.commandType
      && action.version === command.contractVersion
      && action.riskClass === command.riskClass
      && action.idempotent
      && (!action.expectedRevisionRequired || command.expectedRevision.length > 0)
  }

  private evaluateOffline<P>(
    offline: OfflineCommandContext | undefined,
    command: CommandEnvelope<P>,
    policy: IdempotencyPolicy,
    nowMs: number,
  ): CommandRejectionReason | undefined {
    if (!offline) return undefined
    if (
      offline.acceptedAtServerMs > nowMs
      || nowMs - offline.acceptedAtServerMs > policy.maxQueueAgeMs
      || offline.outcome === 'expired'
    ) return 'offline-expired'
    if (offline.outcome === 'conflicted') return 'offline-conflicted'
    if (offline.outcome === 'rejected') return 'offline-rejected'
    if (offline.reconnectedAtServerMs > nowMs) return 'offline-rejected'
    if (isHighRisk(command.riskClass) && command.requestedAt.length === 0) {
      return 'offline-live-confirmation-required'
    }
    return undefined
  }

  private async reserve<R>(input: ReservationInput<TTransaction>): Promise<
    | { kind: 'acquired'; leaseEpoch: number }
    | { kind: 'result'; decision: TransactionDecision<CommandExecutionResult<R>> }
  > {
    const { commandId, fingerprint, policy, scopeKey, transaction } = input
    const existing = await transaction.getIdempotency<R>(scopeKey)
    const timedInput: TimedReservationInput<TTransaction> = {
      ...input,
      nowMs: this.dependencies.clock.nowMs(),
    }
    if (!existing) {
      await transaction.putIdempotency(scopeKey, {
        state: 'in-progress',
        commandId,
        fingerprintHash: fingerprint.fingerprintHash,
        leaseEpoch: 1,
        leaseExpiresAtMs: timedInput.nowMs + policy.leaseDurationMs,
      })
      return { kind: 'acquired', leaseEpoch: 1 }
    }
    if (existing.fingerprintHash !== fingerprint.fingerprintHash || existing.commandId !== commandId) {
      return { kind: 'result', decision: rollback(reject<R>('idempotency-collision')) }
    }
    if (existing.state === 'expired-tombstone') {
      return { kind: 'result', decision: rollback(reject<R>('idempotency-expired')) }
    }
    if (existing.state === 'completed') return this.replayCompleted(existing, timedInput)
    if (timedInput.nowMs < existing.leaseExpiresAtMs) {
      return {
        kind: 'result',
        decision: rollback({
          status: 'retry',
          retryAfterMs: Math.max(
            1,
            Math.min(policy.maxRetryAfterMs, existing.leaseExpiresAtMs - timedInput.nowMs),
          ),
        }),
      }
    }
    return this.recoverOrTakeOver(existing.leaseEpoch, timedInput)
  }

  private async replayCompleted<R>(
    existing: CompletedIdempotencyRecord<R>,
    input: TimedReservationInput<TTransaction>,
  ) {
    if (input.nowMs >= existing.responseExpiresAtMs) {
      await input.transaction.putIdempotency(input.scopeKey, {
        state: 'expired-tombstone',
        commandId: input.commandId,
        fingerprintHash: input.fingerprint.fingerprintHash,
        leaseEpoch: existing.leaseEpoch,
        tombstoneUntilMs: existing.tombstoneUntilMs,
      })
      return { kind: 'result' as const, decision: commit(reject<R>('idempotency-expired')) }
    }
    return {
      kind: 'result' as const,
      decision: rollback<CommandExecutionResult<R>>({
        status: 'replayed',
        response: existing.response as R,
        eventIds: [...existing.resultEventIds],
      }),
    }
  }

  private async recoverOrTakeOver<R>(
    previousLeaseEpoch: number,
    input: TimedReservationInput<TTransaction>,
  ) {
    const recovered = await input.transaction.getOutboxByCommandId<R>(input.commandId)
    if (!recovered) return this.takeOver(previousLeaseEpoch, input)
    if (
      recovered.idempotencyScopeKey !== input.scopeKey
      || recovered.fingerprintHash !== input.fingerprint.fingerprintHash
    ) return { kind: 'result' as const, decision: rollback(reject<R>('recovery-conflict')) }

    if (input.nowMs >= recovered.responseExpiresAtMs) {
      await input.transaction.putIdempotency(input.scopeKey, {
        state: 'expired-tombstone',
        commandId: input.commandId,
        fingerprintHash: input.fingerprint.fingerprintHash,
        leaseEpoch: previousLeaseEpoch,
        tombstoneUntilMs: recovered.tombstoneUntilMs,
      })
      return { kind: 'result' as const, decision: commit(reject<R>('idempotency-expired')) }
    }
    await input.transaction.putIdempotency<R>(input.scopeKey, {
      state: 'completed',
      commandId: input.commandId,
      fingerprintHash: input.fingerprint.fingerprintHash,
      leaseEpoch: previousLeaseEpoch,
      response: recovered.response,
      resultEventIds: [...recovered.eventIds],
      completedAtMs: recovered.completedAtMs,
      responseExpiresAtMs: recovered.responseExpiresAtMs,
      tombstoneUntilMs: recovered.tombstoneUntilMs,
    })
    return {
      kind: 'result' as const,
      decision: commit<CommandExecutionResult<R>>({
        status: 'recovered',
        response: recovered.response,
        eventIds: [...recovered.eventIds],
      }),
    }
  }

  private async takeOver(
    previousLeaseEpoch: number,
    input: TimedReservationInput<TTransaction>,
  ) {
    const leaseEpoch = previousLeaseEpoch + 1
    await input.transaction.putIdempotency(input.scopeKey, {
      state: 'in-progress',
      commandId: input.commandId,
      fingerprintHash: input.fingerprint.fingerprintHash,
      leaseEpoch,
      leaseExpiresAtMs: input.nowMs + input.policy.leaseDurationMs,
    })
    return { kind: 'acquired' as const, leaseEpoch }
  }

  private async consumeRequiredConfirmation<P>(
    transaction: TTransaction,
    request: CommandExecutionRequest<P>,
    fingerprint: CommandFingerprint,
    nowMs: number,
  ): Promise<ConfirmationResult> {
    const mustConfirmOffline = request.offline !== undefined
      && (isHighRisk(request.command.riskClass) || request.offline.outcome === 'requires-confirmation')
    if (request.action.confirmationPolicy === 'two-party') {
      if (!request.approvalSetId) return { ok: false, reason: 'approval-required' }
      return this.consumeApprovalSet({
        transaction,
        approvalSetId: request.approvalSetId,
        action: request.action,
        fingerprint,
        offline: request.offline,
        nowMs,
      })
    }
    if (request.action.confirmationPolicy === 'none' && !mustConfirmOffline) {
      return { ok: true, issuedAtMs: nowMs }
    }
    if (!request.confirmationTokenId) {
      return {
        ok: false,
        reason: mustConfirmOffline
          ? 'offline-live-confirmation-required'
          : 'confirmation-required',
      }
    }
    return this.consumeToken({
      transaction,
      tokenId: request.confirmationTokenId,
      fingerprint,
      offline: request.offline,
      mustConfirmOffline,
      nowMs,
    })
  }

  private async consumeToken(
    input: TokenConsumeInput<TTransaction>,
  ): Promise<ConfirmationResult> {
    const token = await input.transaction.getConfirmation(input.tokenId)
    if (!token) return { ok: false, reason: 'confirmation-not-found' }
    const validity = await this.validateToken(token, input.fingerprint, input.nowMs)
    if (!validity.ok) return validity
    if (
      input.mustConfirmOffline
      && input.offline
      && validity.issuedAtMs < input.offline.reconnectedAtServerMs
    ) {
      return { ok: false, reason: 'offline-live-confirmation-required' }
    }
    await input.transaction.putConfirmation({
      ...token,
      state: 'consumed',
      consumedAtMs: input.nowMs,
    })
    return validity
  }

  private async validateToken(
    token: StoredConfirmationToken,
    fingerprint: CommandFingerprint,
    nowMs: number,
  ): Promise<ConfirmationResult> {
    if (token.state === 'consumed') return { ok: false, reason: 'confirmation-already-used' }
    if (!await this.dependencies.verifyConfirmationSignature(token)) {
      return { ok: false, reason: 'confirmation-invalid-signature' }
    }
    const expiresAtMs = parseCanonicalTimestampMs(token.expiresAt)
    const issuedAtMs = parseCanonicalTimestampMs(token.issuedAt)
    if (expiresAtMs === undefined || issuedAtMs === undefined) {
      return { ok: false, reason: 'confirmation-expired' }
    }
    if (nowMs >= expiresAtMs || issuedAtMs > nowMs) {
      return { ok: false, reason: 'confirmation-expired' }
    }
    if (!sameConfirmationBinding(token, fingerprint)) {
      return { ok: false, reason: 'confirmation-binding-mismatch' }
    }
    return { ok: true, issuedAtMs }
  }

  private async consumeApprovalSet(
    input: ApprovalConsumeInput<TTransaction>,
  ): Promise<ConfirmationResult> {
    const approvalSet = await input.transaction.getApprovalSet(input.approvalSetId)
    if (!approvalSet) return { ok: false, reason: 'approval-required' }
    if (approvalSet.state === 'consumed') return { ok: false, reason: 'approval-already-used' }
    if (!isApprovalSetOpen(approvalSet, input.fingerprint, input.nowMs)) {
      return { ok: false, reason: 'approval-invalid' }
    }

    const actors = new Set<string>()
    let latestIssuedAtMs = 0
    for (const approval of approvalSet.approvals) {
      const approvedAtMs = await this.validateApproval(approval, approvalSet, actors, input)
      if (approvedAtMs === undefined) return { ok: false, reason: 'approval-invalid' }
      actors.add(approval.actorId)
      latestIssuedAtMs = Math.max(latestIssuedAtMs, approvedAtMs)
    }
    if (actors.size < approvalSet.requiredApprovals) {
      return { ok: false, reason: 'approval-invalid' }
    }
    if (input.offline && isHighRisk(input.action.riskClass)) {
      if (latestIssuedAtMs < input.offline.reconnectedAtServerMs) {
        return { ok: false, reason: 'offline-live-confirmation-required' }
      }
      const anyStale = approvalSet.approvals.some(approval => {
        const approvedAtMs = parseCanonicalTimestampMs(approval.approvedAt)
        return approvedAtMs === undefined || approvedAtMs < input.offline!.reconnectedAtServerMs
      })
      if (anyStale) return { ok: false, reason: 'offline-live-confirmation-required' }
    }
    await input.transaction.putApprovalSet({ ...approvalSet, state: 'consumed' })
    return { ok: true, issuedAtMs: latestIssuedAtMs }
  }

  private async validateApproval(
    approval: Approval,
    approvalSet: ApprovalSet,
    actors: Set<string>,
    input: ApprovalConsumeInput<TTransaction>,
  ): Promise<number | undefined> {
    if (approval.actorId === approvalSet.initiatorActorId || actors.has(approval.actorId)) {
      return undefined
    }
    const approvedAtMs = parseCanonicalTimestampMs(approval.approvedAt)
    const expiresAtMs = parseCanonicalTimestampMs(approval.expiresAt)
    if (
      approvedAtMs === undefined
      || expiresAtMs === undefined
      || approvedAtMs > input.nowMs
      || input.nowMs >= expiresAtMs
      || !approvalMatchesCommand(approval, input.fingerprint)
    ) return undefined
    if (!await this.dependencies.verifyApprovalSignature(approval)) return undefined
    const allowed = await this.dependencies.authorizeApprover(
      input.transaction,
      approval.actorId,
      `${input.action.requiredPermission}.approve`,
    )
    return allowed ? approvedAtMs : undefined
  }
}
