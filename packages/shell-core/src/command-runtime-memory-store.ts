import type { ApprovalSet, DomainEvent } from '../../contracts-domain/shell-v6.ts'
import { canonicalJson } from './command-runtime-canonical.ts'
import type {
  CommandOutboxRecord,
  CommandRuntimeStore,
  CommandRuntimeTransaction,
  IdempotencyRecord,
  StoredConfirmationToken,
  TransactionDecision,
} from './command-runtime-types.ts'

interface InMemoryState {
  idempotency: Map<string, IdempotencyRecord>
  confirmations: Map<string, StoredConfirmationToken>
  approvalSets: Map<string, ApprovalSet>
  outbox: Map<string, CommandOutboxRecord>
  events: Map<string, DomainEvent>
}

class InMemoryTransaction implements CommandRuntimeTransaction {
  private readonly state: InMemoryState

  constructor(state: InMemoryState) {
    this.state = state
  }

  async getIdempotency<R>(scopeKey: string): Promise<IdempotencyRecord<R> | undefined> {
    return this.state.idempotency.get(scopeKey) as IdempotencyRecord<R> | undefined
  }

  async putIdempotency<R>(scopeKey: string, record: IdempotencyRecord<R>): Promise<void> {
    this.state.idempotency.set(scopeKey, record as IdempotencyRecord)
  }

  async getConfirmation(tokenId: string): Promise<StoredConfirmationToken | undefined> {
    return this.state.confirmations.get(tokenId)
  }

  async putConfirmation(token: StoredConfirmationToken): Promise<void> {
    this.state.confirmations.set(token.tokenId, token)
  }

  async getApprovalSet(approvalSetId: string): Promise<ApprovalSet | undefined> {
    return this.state.approvalSets.get(approvalSetId)
  }

  async putApprovalSet(approvalSet: ApprovalSet): Promise<void> {
    this.state.approvalSets.set(approvalSet.approvalSetId, approvalSet)
  }

  async getOutboxByCommandId<R>(commandId: string): Promise<CommandOutboxRecord<R> | undefined> {
    return this.state.outbox.get(commandId) as CommandOutboxRecord<R> | undefined
  }

  async putOutbox<R>(record: CommandOutboxRecord<R>, events: DomainEvent[]): Promise<void> {
    const existing = this.state.outbox.get(record.commandId)
    if (existing && existing.fingerprintHash !== record.fingerprintHash) {
      throw new Error(`outbox command collision: ${record.commandId}`)
    }
    for (const event of events) {
      const prior = this.state.events.get(event.eventId)
      if (prior && canonicalJson(prior) !== canonicalJson(event)) {
        throw new Error(`outbox event collision: ${event.eventId}`)
      }
      this.state.events.set(event.eventId, event)
    }
    this.state.outbox.set(record.commandId, record as CommandOutboxRecord)
  }
}

function cloneMap<K, V>(source: Map<K, V>): Map<K, V> {
  return new Map([...source].map(([key, value]) => [key, structuredClone(value)]))
}

function cloneState(source: InMemoryState): InMemoryState {
  return {
    idempotency: cloneMap(source.idempotency),
    confirmations: cloneMap(source.confirmations),
    approvalSets: cloneMap(source.approvalSets),
    outbox: cloneMap(source.outbox),
    events: cloneMap(source.events),
  }
}

export class InMemoryCommandRuntimeStore implements CommandRuntimeStore {
  private state: InMemoryState = {
    idempotency: new Map(),
    confirmations: new Map(),
    approvalSets: new Map(),
    outbox: new Map(),
    events: new Map(),
  }

  private transactionTail: Promise<void> = Promise.resolve()

  async transaction<T>(
    work: (transaction: CommandRuntimeTransaction) => Promise<TransactionDecision<T>>,
  ): Promise<T> {
    const previous = this.transactionTail
    let release = (): void => undefined
    this.transactionTail = new Promise<void>(resolve => {
      release = resolve
    })
    await previous
    try {
      const working = cloneState(this.state)
      const decision = await work(new InMemoryTransaction(working))
      if (decision.commit) this.state = working
      return decision.value
    } finally {
      release()
    }
  }

  seedConfirmation(token: StoredConfirmationToken): void {
    this.state.confirmations.set(token.tokenId, structuredClone(token))
  }

  seedApprovalSet(approvalSet: ApprovalSet): void {
    this.state.approvalSets.set(approvalSet.approvalSetId, structuredClone(approvalSet))
  }

  seedIdempotency<R>(scopeKey: string, record: IdempotencyRecord<R>): void {
    this.state.idempotency.set(scopeKey, structuredClone(record) as IdempotencyRecord)
  }

  seedOutbox<R>(record: CommandOutboxRecord<R>): void {
    this.state.outbox.set(record.commandId, structuredClone(record) as CommandOutboxRecord)
  }

  snapshot(): Readonly<InMemoryState> {
    return cloneState(this.state)
  }
}
