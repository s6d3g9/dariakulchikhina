import type {
  ActionContract,
  Approval,
  ApprovalSet,
  CommandEnvelope,
  ConfirmationBinding,
  ConfirmationToken,
  DomainEvent,
  OfflineRebaseOutcome,
  RiskClass,
} from '../../contracts-domain/shell-v6.ts'

export interface ServerClock {
  nowMs(): number
}

export interface IdempotencyPolicy {
  leaseDurationMs: number
  maxRetryAfterMs: number
  responseRetentionMs: number
  eventRetentionMs: number
  tombstoneRetentionMs: number
  maxQueueAgeMs: number
}

export interface TargetState {
  revision: string
  aggregateSequence: number
  projectionEpochId: string
}

export interface StoredConfirmationToken extends ConfirmationToken {
  state: 'issued' | 'consumed'
  consumedAtMs?: number
}

export interface CommandFingerprint extends ConfirmationBinding {
  fingerprintHash: string
}

export interface InProgressIdempotencyRecord {
  state: 'in-progress'
  commandId: string
  fingerprintHash: string
  leaseEpoch: number
  leaseExpiresAtMs: number
}

export interface CompletedIdempotencyRecord<R = unknown> {
  state: 'completed'
  commandId: string
  fingerprintHash: string
  leaseEpoch: number
  response: R
  resultEventIds: string[]
  completedAtMs: number
  responseExpiresAtMs: number
  tombstoneUntilMs: number
}

export interface ExpiredIdempotencyTombstone {
  state: 'expired-tombstone'
  commandId: string
  fingerprintHash: string
  leaseEpoch: number
  tombstoneUntilMs: number
}

export type IdempotencyRecord<R = unknown> =
  | InProgressIdempotencyRecord
  | CompletedIdempotencyRecord<R>
  | ExpiredIdempotencyTombstone

export interface CommandOutboxRecord<R = unknown> {
  commandId: string
  idempotencyScopeKey: string
  fingerprintHash: string
  response: R
  eventIds: string[]
  completedAtMs: number
  responseExpiresAtMs: number
  tombstoneUntilMs: number
}

export interface CommandRuntimeTransaction {
  getIdempotency<R>(scopeKey: string): Promise<IdempotencyRecord<R> | undefined>
  putIdempotency<R>(scopeKey: string, record: IdempotencyRecord<R>): Promise<void>
  getConfirmation(tokenId: string): Promise<StoredConfirmationToken | undefined>
  putConfirmation(token: StoredConfirmationToken): Promise<void>
  getApprovalSet(approvalSetId: string): Promise<ApprovalSet | undefined>
  putApprovalSet(approvalSet: ApprovalSet): Promise<void>
  getOutboxByCommandId<R>(commandId: string): Promise<CommandOutboxRecord<R> | undefined>
  putOutbox<R>(record: CommandOutboxRecord<R>, events: DomainEvent[]): Promise<void>
}

export type TransactionDecision<T> =
  | { commit: true; value: T }
  | { commit: false; value: T }

export interface CommandRuntimeStore<
  TTransaction extends CommandRuntimeTransaction = CommandRuntimeTransaction,
> {
  transaction<T>(
    work: (transaction: TTransaction) => Promise<TransactionDecision<T>>,
  ): Promise<T>
}

export interface CommandRuntimeDependencies<
  TTransaction extends CommandRuntimeTransaction = CommandRuntimeTransaction,
> {
  clock: ServerClock
  store: CommandRuntimeStore<TTransaction>
  policyFor(riskClass: RiskClass): IdempotencyPolicy
  authorizeCommand(
    transaction: TTransaction,
    command: CommandEnvelope,
    action: ActionContract,
  ): Promise<boolean>
  inspectTarget(transaction: TTransaction, targetId: string): Promise<TargetState>
  verifyConfirmationSignature(token: ConfirmationToken): Promise<boolean>
  verifyApprovalSignature(approval: Approval): Promise<boolean>
  authorizeApprover(
    transaction: TTransaction,
    actorId: string,
    requiredPermission: string,
  ): Promise<boolean>
}

export interface OfflineCommandContext {
  outcome: OfflineRebaseOutcome
  reconnectedAtServerMs: number
  acceptedAtServerMs: number
}

export interface CommandExecutionRequest<P> {
  command: CommandEnvelope<P>
  action: ActionContract
  semanticContext: unknown
  riskFacts: unknown
  displayedSummary: unknown
  confirmationTokenId?: string
  approvalSetId?: string
  offline?: OfflineCommandContext
}

export interface DomainExecution<R> {
  response: R
  events: DomainEvent[]
}

export type DomainOperation<
  P,
  R,
  TTransaction extends CommandRuntimeTransaction = CommandRuntimeTransaction,
> = (
  transaction: TTransaction,
  command: CommandEnvelope<P>,
  state: TargetState,
) => Promise<DomainExecution<R>>

export type CommandRejectionReason =
  | 'action-contract-mismatch'
  | 'authorization-denied'
  | 'idempotency-collision'
  | 'idempotency-expired'
  | 'recovery-conflict'
  | 'confirmation-required'
  | 'confirmation-not-found'
  | 'confirmation-invalid-signature'
  | 'confirmation-already-used'
  | 'confirmation-expired'
  | 'confirmation-binding-mismatch'
  | 'approval-required'
  | 'approval-invalid'
  | 'approval-already-used'
  | 'offline-live-confirmation-required'
  | 'offline-expired'
  | 'offline-conflicted'
  | 'offline-rejected'
  | 'resync-required'
  | 'revision-conflict'
  | 'lost-lease'
  | 'invalid-domain-events'

export type CommandExecutionResult<R> =
  | { status: 'executed'; response: R; eventIds: string[]; leaseEpoch: number }
  | { status: 'replayed'; response: R; eventIds: string[] }
  | { status: 'recovered'; response: R; eventIds: string[] }
  | { status: 'retry'; retryAfterMs: number }
  | { status: 'rejected'; reason: CommandRejectionReason }
