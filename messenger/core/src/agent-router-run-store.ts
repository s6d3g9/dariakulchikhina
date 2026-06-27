import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import {
  ROUTER_POLICY_VERSION,
  ROUTER_PROFILE_VERSION,
  buildMessengerAgentRouterPlan,
  type MessengerAgentRouterGateId,
  type MessengerAgentRouterPlan,
  type MessengerAgentRouterPlanInput,
  type MessengerAgentRouterRunAction,
} from './agent-router-policy.ts'
import { resolveMessengerDataPath } from './storage-paths.ts'

export type MessengerAgentRouterRunStatus =
  | 'planned'
  | 'awaiting_approval'
  | 'ready'
  | 'running'
  | 'blocked'
  | 'failed'
  | 'succeeded'
  | 'cancelled'

export type MessengerAgentRouterGateStatus = 'passed' | 'pending' | 'blocked' | 'failed' | 'skipped'

export interface MessengerAgentRouterGateResult {
  gateId: MessengerAgentRouterGateId
  status: MessengerAgentRouterGateStatus
  reason: string
  actorUserId?: string
  updatedAt: string
}

export interface MessengerAgentRouterRunEvent {
  type: 'planned' | 'blocked' | 'approved' | 'cancelled' | 'started' | 'step' | 'succeeded' | 'failed'
  summary: string
  timestamp: string
  details?: Record<string, unknown>
}

export interface MessengerAgentRouterVerificationResult {
  action: MessengerAgentRouterRunAction
  status: 'passed' | 'failed' | 'skipped'
  summary: string
  exitCode?: number
  stdout?: string
  stderr?: string
  startedAt: string
  completedAt: string
}

export interface MessengerAgentRouterPlanRecord {
  planId: string
  correlationId: string
  idempotencyKey?: string
  actorUserId: string
  profile: string
  profileVersion: string
  policyVersion: string
  taskClass: string
  riskTier: string
  costTier: string
  effort: string
  selectedRoute?: {
    model: string
    provider: string
    costTier: string
  }
  modelCandidates: Array<{
    model: string
    provider: string
    costTier: string
  }>
  gates: {
    required: MessengerAgentRouterGateId[]
    passed: MessengerAgentRouterGateId[]
    failed: MessengerAgentRouterGateId[]
    blocked: MessengerAgentRouterGateId[]
    pending: MessengerAgentRouterGateId[]
  }
  allowedActions: string[]
  blockedActions: string[]
  requestHash: string
  planHash: string
  plan: MessengerAgentRouterPlan
  createdAt: string
  updatedAt: string
}

export interface MessengerAgentRouterRunRecord {
  runId: string
  planId: string
  correlationId: string
  idempotencyKey: string
  actorUserId: string
  status: MessengerAgentRouterRunStatus
  profileVersion: string
  policyVersion: string
  requestedActions: MessengerAgentRouterRunAction[]
  gateResults: MessengerAgentRouterGateResult[]
  events: MessengerAgentRouterRunEvent[]
  outputs: Array<Record<string, unknown>>
  verificationResults: MessengerAgentRouterVerificationResult[]
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
}

export interface MessengerAgentRouterAuditEvent {
  auditId: string
  type: 'plan.created' | 'run.created' | 'run.reused' | 'run.blocked' | 'run.started' | 'run.completed' | 'run.approved' | 'run.cancelled'
  actorUserId: string
  planId?: string
  runId?: string
  correlationId?: string
  idempotencyKey?: string
  profile?: string
  profileVersion?: string
  policyVersion?: string
  taskClass?: string
  riskTier?: string
  costTier?: string
  selectedRoute?: string
  requiredGates?: MessengerAgentRouterGateId[]
  passedGates?: MessengerAgentRouterGateId[]
  failedGates?: MessengerAgentRouterGateId[]
  blockedGates?: MessengerAgentRouterGateId[]
  requestHash?: string
  planHash?: string
  timestamp: string
  details?: Record<string, unknown>
}

interface MessengerAgentRouterStoreFile {
  plans: MessengerAgentRouterPlanRecord[]
  runs: MessengerAgentRouterRunRecord[]
  auditEvents: MessengerAgentRouterAuditEvent[]
}

export interface CreateMessengerAgentRouterPlanRecordInput {
  actorUserId: string
  input: MessengerAgentRouterPlanInput
  idempotencyKey?: string
  correlationId?: string
}

export interface CreateMessengerAgentRouterRunInput {
  actorUserId: string
  input: MessengerAgentRouterPlanInput
  idempotencyKey: string
  requestedActions?: MessengerAgentRouterRunAction[]
  correlationId?: string
}

const STORAGE_PATH = resolveMessengerDataPath('agent-router-runs.json')
const MAX_PLANS = 300
const MAX_RUNS = 300
const MAX_AUDIT_EVENTS = 1500
const DAY_MS = 24 * 60 * 60 * 1000

const AUTO_PASSED_GATES = new Set<MessengerAgentRouterGateId>([
  'admin-rbac',
  'audit-log',
  'tenant-scope',
  'environment-scope',
  'data-classification',
  'secret-redaction',
  'no-command-exec',
  'no-direct-prod-write',
])

const MANUAL_APPROVAL_GATES = new Set<MessengerAgentRouterGateId>([
  'human-approval',
  'external-model-review',
  'migration-backup',
  'migration-drift-check',
  'deploy-approval',
  'permission-review',
])

const ACTION_GATE_MAP: Record<MessengerAgentRouterRunAction, MessengerAgentRouterGateId[]> = {
  'inspect-current-state': ['git-diff-review'],
  'run-typecheck': ['typecheck'],
  'run-build': ['build'],
  'run-messenger-core-typecheck': ['messenger-core-typecheck'],
  'run-lint': ['lint'],
  'run-format': ['format'],
  'prepare-report': [],
}

let storeQueue = Promise.resolve()

function stableJson(value: unknown): string {
  if (typeof value === 'undefined') return '"[undefined]"'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`

  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`
}

function hashValue(value: unknown) {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeIdempotencyKey(value: string | undefined) {
  return value?.trim().slice(0, 160) || ''
}

function sanitizeOutput(value: string | undefined) {
  if (!value) return ''
  return value
    .replace(/(sk-[a-z0-9_-]{12,})/giu, '[REDACTED_TOKEN]')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gu, '$1[REDACTED]')
    .slice(0, 12_000)
}

function ensureStoreShape(parsed: Partial<MessengerAgentRouterStoreFile>): MessengerAgentRouterStoreFile {
  return {
    plans: Array.isArray(parsed.plans) ? parsed.plans as MessengerAgentRouterPlanRecord[] : [],
    runs: Array.isArray(parsed.runs) ? parsed.runs as MessengerAgentRouterRunRecord[] : [],
    auditEvents: Array.isArray(parsed.auditEvents) ? parsed.auditEvents as MessengerAgentRouterAuditEvent[] : [],
  }
}

async function ensureStorage() {
  await mkdir(dirname(STORAGE_PATH), { recursive: true })
}

async function readStoreFile(): Promise<MessengerAgentRouterStoreFile> {
  await ensureStorage()

  try {
    const raw = await readFile(STORAGE_PATH, 'utf8')
    return ensureStoreShape(JSON.parse(raw) as Partial<MessengerAgentRouterStoreFile>)
  } catch {
    return ensureStoreShape({})
  }
}

async function writeStoreFile(payload: MessengerAgentRouterStoreFile) {
  await ensureStorage()
  const compacted: MessengerAgentRouterStoreFile = {
    plans: payload.plans
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, MAX_PLANS),
    runs: payload.runs
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, MAX_RUNS),
    auditEvents: payload.auditEvents
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, MAX_AUDIT_EVENTS),
  }
  const tempPath = `${STORAGE_PATH}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tempPath, JSON.stringify(compacted, null, 2) + '\n', 'utf8')
  await rename(tempPath, STORAGE_PATH)
}

async function withStore<T>(mutator: (payload: MessengerAgentRouterStoreFile) => Promise<T> | T): Promise<T> {
  let release!: () => void
  const previous = storeQueue
  storeQueue = new Promise<void>(resolve => {
    release = resolve
  })

  await previous
  try {
    const payload = await readStoreFile()
    const result = await mutator(payload)
    await writeStoreFile(payload)
    return result
  } finally {
    release()
  }
}

function summarizeGateResults(gateResults: MessengerAgentRouterGateResult[]) {
  const gates = {
    required: gateResults.map(gate => gate.gateId),
    passed: gateResults.filter(gate => gate.status === 'passed').map(gate => gate.gateId),
    failed: gateResults.filter(gate => gate.status === 'failed').map(gate => gate.gateId),
    blocked: gateResults.filter(gate => gate.status === 'blocked').map(gate => gate.gateId),
    pending: gateResults.filter(gate => gate.status === 'pending').map(gate => gate.gateId),
  }
  return gates
}

function isProductionWriteBlocked(plan: MessengerAgentRouterPlan, gateId: MessengerAgentRouterGateId) {
  return gateId === 'no-direct-prod-write' && plan.input.environment === 'production'
}

function buildInitialGateResults(plan: MessengerAgentRouterPlan, timestamp: string): MessengerAgentRouterGateResult[] {
  return plan.gateIds.required.map((gateId) => {
    if (isProductionWriteBlocked(plan, gateId)) {
      return {
        gateId,
        status: 'blocked',
        reason: 'Production scope requires explicit approval and cannot be executed directly.',
        updatedAt: timestamp,
      }
    }

    if (AUTO_PASSED_GATES.has(gateId)) {
      return {
        gateId,
        status: 'passed',
        reason: 'Passed at plan time by authenticated admin request and router policy.',
        updatedAt: timestamp,
      }
    }

    return {
      gateId,
      status: 'pending',
      reason: MANUAL_APPROVAL_GATES.has(gateId)
        ? 'Requires explicit approval before execution.'
        : 'Requires verification during or after the safe run.',
      updatedAt: timestamp,
    }
  })
}

function findUnapprovedBlockingGates(gateResults: MessengerAgentRouterGateResult[]) {
  return gateResults
    .filter(gate => (
      gate.status === 'blocked'
      || (gate.status === 'pending' && MANUAL_APPROVAL_GATES.has(gate.gateId))
    ))
    .map(gate => gate.gateId)
}

function applyQuotaGate(
  payload: MessengerAgentRouterStoreFile,
  actorUserId: string,
  plan: MessengerAgentRouterPlan,
  gateResults: MessengerAgentRouterGateResult[],
  timestamp: string,
) {
  const since = Date.now() - DAY_MS
  const recentRuns = payload.runs.filter((run) => {
    const createdAt = Date.parse(run.createdAt)
    return Number.isFinite(createdAt) && createdAt >= since && run.status !== 'cancelled'
  })
  const userRuns = recentRuns.filter(run => run.actorUserId === actorUserId)
  const scopeRuns = recentRuns.filter((run) => {
    const planRecord = payload.plans.find(planItem => planItem.planId === run.planId)
    return planRecord?.plan.budget.quotaScope === plan.budget.quotaScope
  })
  const taskClassRuns = recentRuns.filter((run) => {
    const planRecord = payload.plans.find(planItem => planItem.planId === run.planId)
    return planRecord?.taskClass === plan.policy.taskClass
  })
  const costTierRuns = recentRuns.filter((run) => {
    const planRecord = payload.plans.find(planItem => planItem.planId === run.planId)
    return planRecord?.costTier === plan.policy.costTier
  })
  const selectedModel = plan.routing.candidates[0]?.model || ''
  const modelRouteRuns = selectedModel
    ? recentRuns.filter((run) => {
        const planRecord = payload.plans.find(planItem => planItem.planId === run.planId)
        return planRecord?.selectedRoute?.model === selectedModel
      })
    : []
  const userPremiumUnits = userRuns.reduce((sum, run) => {
    const planRecord = payload.plans.find(planItem => planItem.planId === run.planId)
    return sum + (planRecord?.plan.budget.estimatedPremiumUnits || 0)
  }, 0)
  const exceeded = [
    userRuns.length >= plan.budget.dailyUserRunLimit ? 'daily-user-run-limit' : '',
    scopeRuns.length >= plan.budget.dailyScopeRunLimit ? 'daily-scope-run-limit' : '',
    taskClassRuns.length >= plan.budget.dailyTaskClassRunLimit ? 'daily-task-class-run-limit' : '',
    costTierRuns.length >= plan.budget.dailyCostTierRunLimit ? 'daily-cost-tier-run-limit' : '',
    selectedModel && modelRouteRuns.length >= plan.budget.dailyModelRouteLimit ? 'daily-model-route-limit' : '',
    userPremiumUnits + plan.budget.estimatedPremiumUnits > plan.budget.dailyPremiumUnitLimit ? 'daily-premium-unit-limit' : '',
  ].filter(Boolean)

  const rateGate = gateResults.find(gate => gate.gateId === 'rate-limit')
  if (!rateGate) return

  if (exceeded.length) {
    rateGate.status = 'blocked'
    rateGate.reason = `Quota exceeded: ${exceeded.join(', ')}.`
    rateGate.updatedAt = timestamp
  } else {
    rateGate.status = 'passed'
    rateGate.reason = 'Daily user, scope, and premium quotas are within limits.'
    rateGate.updatedAt = timestamp
  }
}

function buildPlanRecord(input: CreateMessengerAgentRouterPlanRecordInput, payload: MessengerAgentRouterStoreFile): MessengerAgentRouterPlanRecord {
  const timestamp = nowIso()
  const plan = buildMessengerAgentRouterPlan(input.input)
  const selectedRoute = plan.routing.candidates[0]
  const gateResults = buildInitialGateResults(plan, timestamp)
  applyQuotaGate(payload, input.actorUserId, plan, gateResults, timestamp)
  const gates = summarizeGateResults(gateResults)
  const requestHash = hashValue({
    input: input.input,
    profileVersion: ROUTER_PROFILE_VERSION,
    policyVersion: ROUTER_POLICY_VERSION,
  })
  const planHash = hashValue({
    profileVersion: plan.profileVersion,
    policyVersion: plan.policyVersion,
    profile: plan.profile.id,
    input: plan.input,
    policy: plan.policy,
    routing: plan.routing.candidates.map(candidate => ({
      model: candidate.model,
      provider: candidate.provider,
      costTier: candidate.costTier,
    })),
    gateIds: plan.gateIds,
    budget: plan.budget,
    executableActions: plan.executableActions,
    blockedActions: plan.blockedActions,
  })

  return {
    planId: randomUUID(),
    correlationId: input.correlationId || randomUUID(),
    idempotencyKey: normalizeIdempotencyKey(input.idempotencyKey) || undefined,
    actorUserId: input.actorUserId,
    profile: plan.profile.id,
    profileVersion: plan.profileVersion,
    policyVersion: plan.policyVersion,
    taskClass: plan.policy.taskClass,
    riskTier: plan.policy.riskTier,
    costTier: plan.policy.costTier,
    effort: plan.policy.effort,
    selectedRoute: selectedRoute
      ? {
          model: selectedRoute.model,
          provider: selectedRoute.provider,
          costTier: selectedRoute.costTier,
        }
      : undefined,
    modelCandidates: plan.routing.candidates.map(candidate => ({
      model: candidate.model,
      provider: candidate.provider,
      costTier: candidate.costTier,
    })),
    gates,
    allowedActions: plan.allowedActions,
    blockedActions: plan.blockedActions,
    requestHash,
    planHash,
    plan,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function buildAuditEvent(
  type: MessengerAgentRouterAuditEvent['type'],
  actorUserId: string,
  input: Partial<MessengerAgentRouterAuditEvent>,
): MessengerAgentRouterAuditEvent {
  return {
    auditId: randomUUID(),
    type,
    actorUserId,
    timestamp: nowIso(),
    ...input,
  }
}

function pushAuditEvent(payload: MessengerAgentRouterStoreFile, event: MessengerAgentRouterAuditEvent) {
  payload.auditEvents.unshift(event)
}

export async function createMessengerAgentRouterPlanRecord(input: CreateMessengerAgentRouterPlanRecordInput) {
  return withStore((payload) => {
    const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey)
    if (idempotencyKey) {
      const existing = payload.plans.find(plan => plan.actorUserId === input.actorUserId && plan.idempotencyKey === idempotencyKey)
      if (existing) {
        pushAuditEvent(payload, buildAuditEvent('plan.created', input.actorUserId, {
          planId: existing.planId,
          correlationId: existing.correlationId,
          idempotencyKey,
          profile: existing.profile,
          profileVersion: existing.profileVersion,
          policyVersion: existing.policyVersion,
          taskClass: existing.taskClass,
          riskTier: existing.riskTier,
          costTier: existing.costTier,
          selectedRoute: existing.selectedRoute?.model,
          requestHash: existing.requestHash,
          planHash: existing.planHash,
          details: { reused: true },
        }))
        return existing
      }
    }

    const record = buildPlanRecord(input, payload)
    payload.plans.unshift(record)
    pushAuditEvent(payload, buildAuditEvent('plan.created', input.actorUserId, {
      planId: record.planId,
      correlationId: record.correlationId,
      idempotencyKey: record.idempotencyKey,
      profile: record.profile,
      profileVersion: record.profileVersion,
      policyVersion: record.policyVersion,
      taskClass: record.taskClass,
      riskTier: record.riskTier,
      costTier: record.costTier,
      selectedRoute: record.selectedRoute?.model,
      requiredGates: record.gates.required,
      passedGates: record.gates.passed,
      failedGates: record.gates.failed,
      blockedGates: record.gates.blocked,
      requestHash: record.requestHash,
      planHash: record.planHash,
    }))
    return record
  })
}

export async function createMessengerAgentRouterRun(input: CreateMessengerAgentRouterRunInput) {
  return withStore((payload) => {
    const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey)
    const existing = payload.runs.find(run => run.actorUserId === input.actorUserId && run.idempotencyKey === idempotencyKey)
    if (existing) {
      pushAuditEvent(payload, buildAuditEvent('run.reused', input.actorUserId, {
        planId: existing.planId,
        runId: existing.runId,
        correlationId: existing.correlationId,
        idempotencyKey,
        profileVersion: existing.profileVersion,
        policyVersion: existing.policyVersion,
        details: { status: existing.status },
      }))
      return { run: existing, plan: payload.plans.find(plan => plan.planId === existing.planId) || null, reused: true }
    }

    const planRecord = buildPlanRecord({
      actorUserId: input.actorUserId,
      input: input.input,
      idempotencyKey,
      correlationId: input.correlationId,
    }, payload)
    const timestamp = nowIso()
    const requestedActions = (input.requestedActions?.length ? input.requestedActions : planRecord.plan.executableActions)
      .filter(action => planRecord.plan.executableActions.includes(action))
    const disallowedActions = (input.requestedActions || [])
      .filter(action => !planRecord.plan.executableActions.includes(action))
    const gateResults = buildInitialGateResults(planRecord.plan, timestamp)
    applyQuotaGate(payload, input.actorUserId, planRecord.plan, gateResults, timestamp)
    const blockingGates = findUnapprovedBlockingGates(gateResults)
    const status: MessengerAgentRouterRunStatus = disallowedActions.length || blockingGates.length ? 'blocked' : 'ready'
    const run: MessengerAgentRouterRunRecord = {
      runId: randomUUID(),
      planId: planRecord.planId,
      correlationId: planRecord.correlationId,
      idempotencyKey,
      actorUserId: input.actorUserId,
      status,
      profileVersion: planRecord.profileVersion,
      policyVersion: planRecord.policyVersion,
      requestedActions,
      gateResults,
      events: [{
        type: status === 'blocked' ? 'blocked' : 'planned',
        summary: status === 'blocked'
          ? 'Run is blocked by required gates or disallowed actions.'
          : 'Run is ready for safe allowlist execution.',
        timestamp,
        details: {
          blockingGates,
          disallowedActions,
        },
      }],
      outputs: [],
      verificationResults: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    planRecord.gates = summarizeGateResults(gateResults)
    payload.plans.unshift(planRecord)
    payload.runs.unshift(run)
    pushAuditEvent(payload, buildAuditEvent('run.created', input.actorUserId, {
      planId: planRecord.planId,
      runId: run.runId,
      correlationId: run.correlationId,
      idempotencyKey,
      profile: planRecord.profile,
      profileVersion: planRecord.profileVersion,
      policyVersion: planRecord.policyVersion,
      taskClass: planRecord.taskClass,
      riskTier: planRecord.riskTier,
      costTier: planRecord.costTier,
      selectedRoute: planRecord.selectedRoute?.model,
      requiredGates: planRecord.gates.required,
      passedGates: planRecord.gates.passed,
      failedGates: planRecord.gates.failed,
      blockedGates: planRecord.gates.blocked,
      requestHash: planRecord.requestHash,
      planHash: planRecord.planHash,
      details: { status, requestedActions, disallowedActions, blockingGates },
    }))
    if (status === 'blocked') {
      pushAuditEvent(payload, buildAuditEvent('run.blocked', input.actorUserId, {
        planId: planRecord.planId,
        runId: run.runId,
        correlationId: run.correlationId,
        idempotencyKey,
        blockedGates: blockingGates,
        details: { disallowedActions },
      }))
    }

    return { run, plan: planRecord, reused: false }
  })
}

export async function markMessengerAgentRouterRunStarted(runId: string) {
  return withStore((payload) => {
    const run = payload.runs.find(item => item.runId === runId)
    if (!run || run.status !== 'ready') return run || null

    const timestamp = nowIso()
    run.status = 'running'
    run.startedAt = timestamp
    run.updatedAt = timestamp
    run.events.push({
      type: 'started',
      summary: 'Safe allowlist execution started.',
      timestamp,
    })
    pushAuditEvent(payload, buildAuditEvent('run.started', run.actorUserId, {
      planId: run.planId,
      runId: run.runId,
      correlationId: run.correlationId,
      idempotencyKey: run.idempotencyKey,
    }))
    return run
  })
}

export async function completeMessengerAgentRouterRun(input: {
  runId: string
  status: Extract<MessengerAgentRouterRunStatus, 'succeeded' | 'failed' | 'blocked'>
  verificationResults: MessengerAgentRouterVerificationResult[]
  outputs?: Array<Record<string, unknown>>
  gateResults: MessengerAgentRouterGateResult[]
  summary: string
}) {
  return withStore((payload) => {
    const run = payload.runs.find(item => item.runId === input.runId)
    if (!run) return null

    const timestamp = nowIso()
    run.status = input.status
    run.verificationResults = input.verificationResults.map(result => ({
      ...result,
      stdout: sanitizeOutput(result.stdout),
      stderr: sanitizeOutput(result.stderr),
    }))
    run.outputs = input.outputs || []
    run.gateResults = input.gateResults
    run.completedAt = timestamp
    run.updatedAt = timestamp
    run.events.push({
      type: input.status === 'succeeded' ? 'succeeded' : input.status === 'blocked' ? 'blocked' : 'failed',
      summary: input.summary,
      timestamp,
    })

    const plan = payload.plans.find(item => item.planId === run.planId)
    if (plan) {
      plan.gates = summarizeGateResults(input.gateResults)
      plan.updatedAt = timestamp
    }

    pushAuditEvent(payload, buildAuditEvent('run.completed', run.actorUserId, {
      planId: run.planId,
      runId: run.runId,
      correlationId: run.correlationId,
      idempotencyKey: run.idempotencyKey,
      profile: plan?.profile,
      profileVersion: run.profileVersion,
      policyVersion: run.policyVersion,
      requiredGates: input.gateResults.map(gate => gate.gateId),
      passedGates: input.gateResults.filter(gate => gate.status === 'passed').map(gate => gate.gateId),
      failedGates: input.gateResults.filter(gate => gate.status === 'failed').map(gate => gate.gateId),
      blockedGates: input.gateResults.filter(gate => gate.status === 'blocked').map(gate => gate.gateId),
      details: { status: input.status },
    }))

    return run
  })
}

export async function approveMessengerAgentRouterRun(input: {
  runId: string
  actorUserId: string
  gateIds: MessengerAgentRouterGateId[]
  note?: string
}) {
  return withStore((payload) => {
    const run = payload.runs.find(item => item.runId === input.runId)
    if (!run || run.status === 'cancelled' || run.status === 'succeeded' || run.status === 'failed') {
      return run || null
    }

    const timestamp = nowIso()
    const allowedGateIds = new Set(run.gateResults.map(gate => gate.gateId))
    for (const gateId of input.gateIds) {
      if (!allowedGateIds.has(gateId)) continue
      const gate = run.gateResults.find(item => item.gateId === gateId)
      if (!gate) continue
      gate.status = 'passed'
      gate.reason = input.note || 'Approved by messenger admin.'
      gate.actorUserId = input.actorUserId
      gate.updatedAt = timestamp
    }

    const blockingGates = findUnapprovedBlockingGates(run.gateResults)
    run.status = blockingGates.length ? 'awaiting_approval' : 'ready'
    run.updatedAt = timestamp
    run.events.push({
      type: 'approved',
      summary: blockingGates.length
        ? 'Some gates were approved, but the run still awaits approval.'
        : 'Required approval gates passed; run is ready.',
      timestamp,
      details: {
        approvedGateIds: input.gateIds,
        blockingGates,
      },
    })

    const plan = payload.plans.find(item => item.planId === run.planId)
    if (plan) {
      plan.gates = summarizeGateResults(run.gateResults)
      plan.updatedAt = timestamp
    }

    pushAuditEvent(payload, buildAuditEvent('run.approved', input.actorUserId, {
      planId: run.planId,
      runId: run.runId,
      correlationId: run.correlationId,
      idempotencyKey: run.idempotencyKey,
      profileVersion: run.profileVersion,
      policyVersion: run.policyVersion,
      requiredGates: run.gateResults.map(gate => gate.gateId),
      passedGates: run.gateResults.filter(gate => gate.status === 'passed').map(gate => gate.gateId),
      blockedGates: blockingGates,
      details: { note: input.note || '', approvedGateIds: input.gateIds },
    }))

    return run
  })
}

export async function cancelMessengerAgentRouterRun(input: {
  runId: string
  actorUserId: string
  reason?: string
}) {
  return withStore((payload) => {
    const run = payload.runs.find(item => item.runId === input.runId)
    if (!run || run.status === 'succeeded' || run.status === 'failed') return run || null

    const timestamp = nowIso()
    run.status = 'cancelled'
    run.updatedAt = timestamp
    run.completedAt = timestamp
    run.events.push({
      type: 'cancelled',
      summary: input.reason || 'Run cancelled by messenger admin.',
      timestamp,
    })
    pushAuditEvent(payload, buildAuditEvent('run.cancelled', input.actorUserId, {
      planId: run.planId,
      runId: run.runId,
      correlationId: run.correlationId,
      idempotencyKey: run.idempotencyKey,
      profileVersion: run.profileVersion,
      policyVersion: run.policyVersion,
      details: { reason: input.reason || '' },
    }))
    return run
  })
}

export async function listMessengerAgentRouterRuns(input: {
  actorUserId?: string
  limit?: number
}) {
  const payload = await readStoreFile()
  const limit = Math.min(Math.max(input.limit || 20, 1), 80)
  return payload.runs
    .filter(run => !input.actorUserId || run.actorUserId === input.actorUserId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit)
}

export async function getMessengerAgentRouterRunById(runId: string) {
  const payload = await readStoreFile()
  return payload.runs.find(run => run.runId === runId) || null
}

export async function getMessengerAgentRouterPlanById(planId: string) {
  const payload = await readStoreFile()
  return payload.plans.find(plan => plan.planId === planId) || null
}

export async function listMessengerAgentRouterAuditEvents(input: {
  limit?: number
}) {
  const payload = await readStoreFile()
  const limit = Math.min(Math.max(input.limit || 40, 1), 120)
  return payload.auditEvents
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, limit)
}

export function markGatePassedForAction(
  gateResults: MessengerAgentRouterGateResult[],
  action: MessengerAgentRouterRunAction,
  status: 'passed' | 'failed' | 'skipped',
  reason: string,
) {
  const timestamp = nowIso()
  const gateIds = ACTION_GATE_MAP[action]
  for (const gateId of gateIds) {
    const gate = gateResults.find(item => item.gateId === gateId)
    if (!gate) continue
    gate.status = status
    gate.reason = reason
    gate.updatedAt = timestamp
  }
}

export function findRemainingRequiredRouterGates(gateResults: MessengerAgentRouterGateResult[]) {
  return gateResults.filter(gate => gate.status !== 'passed' && gate.status !== 'skipped')
}
