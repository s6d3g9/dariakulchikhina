export type MessengerAgentRouterProfileId =
  | 'dev-quick'
  | 'ai-launcher-ui'
  | 'crm-data'
  | 'studio-os-workflow'
  | 'designer-architect-cabinet'
  | 'client-portal'
  | 'construction-os'
  | 'messenger-integration'
  | 'db-schema'
  | 'security-privacy'
  | 'qa-release'
  | 'support-debug'
  | 'docs-rewrite'

export type MessengerAgentRouterRunAction =
  | 'inspect-current-state'
  | 'run-typecheck'
  | 'run-build'
  | 'run-messenger-core-typecheck'
  | 'run-lint'
  | 'run-format'
  | 'prepare-report'

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

export interface MessengerAgentRouterProfile {
  id: MessengerAgentRouterProfileId
  title: string
  description: string
  taskClass: string
  riskTier: string
  costTier: string
  effort: string
  requiredGates: string[]
  optionalGates: string[]
  domainContracts: string[]
}

export interface MessengerAgentRouterGate {
  id: string
  title: string
  category: string
  description: string
  commands?: string[]
}

export interface MessengerAgentRouterCandidate {
  rank: number
  model: string
  provider: string
  cliProvider?: string
  costTier: string
  maxRiskTier: string
  maxTokens: number
  reason: string
}

export interface MessengerAgentRouterPlan {
  generatedAt: string
  mode: 'plan-only'
  profileVersion: string
  policyVersion: string
  profile: MessengerAgentRouterProfile
  input: {
    requestedProfile?: MessengerAgentRouterProfileId
    scope: string
    tenantKey: string
    projectId: string
    changedFiles: string[]
    environment: string
    dataClasses: string[]
    requestedActions: string[]
    providerHints: string[]
  }
  policy: {
    taskClass: string
    riskTier: string
    costTier: string
    effort: string
    failClosed: boolean
    externalModelAllowed: boolean
    requiresHumanApproval: boolean
    requiresExternalReview: boolean
  }
  routing: {
    configured: boolean
    candidates: MessengerAgentRouterCandidate[]
  }
  gates: {
    required: MessengerAgentRouterGate[]
    optional: MessengerAgentRouterGate[]
  }
  gateIds: {
    required: string[]
    optional: string[]
  }
  budget: {
    estimatedCostUnits: number
    estimatedPremiumUnits: number
    quotaScope: string
    dailyUserRunLimit: number
    dailyScopeRunLimit: number
    dailyTaskClassRunLimit: number
    dailyCostTierRunLimit: number
    dailyModelRouteLimit: number
    dailyPremiumUnitLimit: number
  }
  allowedActions: string[]
  blockedActions: string[]
  executableActions: MessengerAgentRouterRunAction[]
  verificationCommands: string[]
  warnings: string[]
  nextSteps: string[]
}

export interface MessengerAgentRouterPlanAudit {
  planId: string
  correlationId: string
  idempotencyKey?: string
  requestHash: string
  planHash: string
  selectedRoute?: {
    model: string
    provider: string
    costTier: string
  }
  gates: {
    required: string[]
    passed: string[]
    failed: string[]
    blocked: string[]
    pending: string[]
  }
}

export interface MessengerAgentRouterGateResult {
  gateId: string
  status: MessengerAgentRouterGateStatus
  reason: string
  actorUserId?: string
  updatedAt: string
}

export interface MessengerAgentRouterRun {
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
  events: Array<{
    type: string
    summary: string
    timestamp: string
    details?: Record<string, unknown>
  }>
  outputs: Array<Record<string, unknown>>
  verificationResults: Array<{
    action: MessengerAgentRouterRunAction
    status: 'passed' | 'failed' | 'skipped'
    summary: string
    exitCode?: number
    stdout?: string
    stderr?: string
    startedAt: string
    completedAt: string
  }>
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
}

export interface MessengerAgentRouterPlanPayload {
  profile?: MessengerAgentRouterProfileId
  scope: string
  tenantKey?: string
  projectId?: string
  changedFiles: string[]
  environment: string
  dataClasses: string[]
  requestedActions: string[]
  idempotencyKey?: string
  correlationId?: string
}

export interface MessengerAgentRouterRunPayload extends MessengerAgentRouterPlanPayload {
  idempotencyKey: string
  runActions: MessengerAgentRouterRunAction[]
}

function createRouterIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function useMessengerAgentRouter() {
  const auth = useMessengerAuth()
  const { agentsEnabled, disableAgents } = useMessengerFeatures()
  const profiles = useState<MessengerAgentRouterProfile[]>('messenger-router-profiles', () => [])
  const gates = useState<MessengerAgentRouterGate[]>('messenger-router-gates', () => [])
  const runActions = useState<MessengerAgentRouterRunAction[]>('messenger-router-run-actions', () => [])
  const selectedPlan = useState<MessengerAgentRouterPlan | null>('messenger-router-selected-plan', () => null)
  const selectedAudit = useState<MessengerAgentRouterPlanAudit | null>('messenger-router-selected-audit', () => null)
  const runs = useState<MessengerAgentRouterRun[]>('messenger-router-runs', () => [])
  const selectedRun = useState<MessengerAgentRouterRun | null>('messenger-router-selected-run', () => null)
  const selectedRunPlan = useState<MessengerAgentRouterPlan | null>('messenger-router-selected-run-plan', () => null)
  const profileVersion = useState<string>('messenger-router-profile-version', () => '')
  const policyVersion = useState<string>('messenger-router-policy-version', () => '')
  const pending = useState<boolean>('messenger-router-pending', () => false)
  const actionPending = useState<boolean>('messenger-router-action-pending', () => false)
  const error = useState<string>('messenger-router-error', () => '')

  async function requestRouter<T>(path: string, options: Parameters<typeof auth.request<T>>[1] = {}) {
    try {
      return await auth.request<T>(path, options)
    } catch (requestError) {
      if (isMessengerAgentsApiDisabledError(requestError)) {
        disableAgents()
      }
      throw requestError
    }
  }

  async function refreshProfiles() {
    if (!agentsEnabled.value) return
    pending.value = true
    error.value = ''

    try {
      const response = await requestRouter<{
        profileVersion: string
        policyVersion: string
        profiles: MessengerAgentRouterProfile[]
        gates: MessengerAgentRouterGate[]
        runActions: MessengerAgentRouterRunAction[]
      }>('/agent-router/profiles')
      profileVersion.value = response.profileVersion
      policyVersion.value = response.policyVersion
      profiles.value = response.profiles
      gates.value = response.gates
      runActions.value = response.runActions
    } catch {
      error.value = 'Router недоступен или требует admin-доступ.'
    } finally {
      pending.value = false
    }
  }

  async function createPlan(payload: MessengerAgentRouterPlanPayload) {
    pending.value = true
    error.value = ''

    try {
      const response = await requestRouter<{
        plan: MessengerAgentRouterPlan
        audit: MessengerAgentRouterPlanAudit
      }>('/agent-router/plan', {
        method: 'POST',
        body: payload,
      })
      selectedPlan.value = response.plan
      selectedAudit.value = response.audit
      return response
    } catch {
      error.value = 'Не удалось построить router plan.'
      throw new Error('ROUTER_PLAN_FAILED')
    } finally {
      pending.value = false
    }
  }

  async function refreshRuns(limit = 30) {
    pending.value = true
    error.value = ''

    try {
      const response = await requestRouter<{ runs: MessengerAgentRouterRun[] }>('/agent-router/runs', {
        method: 'GET',
        query: { limit },
      })
      runs.value = response.runs
      if (selectedRun.value) {
        selectedRun.value = response.runs.find(run => run.runId === selectedRun.value?.runId) || selectedRun.value
      }
    } catch {
      error.value = 'Не удалось обновить историю router runs.'
    } finally {
      pending.value = false
    }
  }

  async function createRun(payload: MessengerAgentRouterRunPayload) {
    actionPending.value = true
    error.value = ''

    try {
      const response = await requestRouter<{
        reused: boolean
        run: MessengerAgentRouterRun
        plan: MessengerAgentRouterPlan
        error?: string
      }>('/agent-router/runs', {
        method: 'POST',
        body: payload,
      })
      selectedRun.value = response.run
      selectedRunPlan.value = response.plan
      await refreshRuns()
      return response
    } catch (requestError) {
      const maybeError = requestError as {
        data?: {
          error?: string
          run?: MessengerAgentRouterRun
          plan?: MessengerAgentRouterPlan
        }
        response?: {
          _data?: {
            error?: string
            run?: MessengerAgentRouterRun
            plan?: MessengerAgentRouterPlan
          }
        }
      }
      const payload = maybeError.data || maybeError.response?._data
      if (payload?.run) {
        selectedRun.value = payload.run
        selectedRunPlan.value = payload.plan || null
        await refreshRuns()
        if (payload.error === 'BLOCKED_BY_GATE') {
          error.value = 'Run заблокирован обязательными gates.'
          return {
            reused: false,
            run: payload.run,
            plan: payload.plan || null,
            error: payload.error,
          }
        }
      }

      error.value = 'Не удалось создать router run.'
      throw new Error('ROUTER_RUN_FAILED')
    } finally {
      actionPending.value = false
    }
  }

  async function openRun(runId: string) {
    pending.value = true
    error.value = ''

    try {
      const response = await requestRouter<{
        run: MessengerAgentRouterRun
        plan: MessengerAgentRouterPlan | null
      }>(`/agent-router/runs/${runId}`)
      selectedRun.value = response.run
      selectedRunPlan.value = response.plan
      return response
    } catch {
      error.value = 'Не удалось открыть router run.'
    } finally {
      pending.value = false
    }
  }

  async function approveRun(runId: string, gateIds: string[], note = '') {
    actionPending.value = true
    error.value = ''

    try {
      const response = await requestRouter<{ run: MessengerAgentRouterRun }>(`/agent-router/runs/${runId}/approve`, {
        method: 'POST',
        body: { gateIds, note },
      })
      selectedRun.value = response.run
      runs.value = runs.value.map(run => run.runId === response.run.runId ? response.run : run)
      return response.run
    } catch {
      error.value = 'Не удалось подтвердить gate.'
    } finally {
      actionPending.value = false
    }
  }

  async function cancelRun(runId: string, reason = '') {
    actionPending.value = true
    error.value = ''

    try {
      const response = await requestRouter<{ run: MessengerAgentRouterRun }>(`/agent-router/runs/${runId}/cancel`, {
        method: 'POST',
        body: { reason },
      })
      selectedRun.value = response.run
      runs.value = runs.value.map(run => run.runId === response.run.runId ? response.run : run)
      return response.run
    } catch {
      error.value = 'Не удалось отменить run.'
    } finally {
      actionPending.value = false
    }
  }

  return {
    profiles,
    gates,
    runActions,
    selectedPlan,
    selectedAudit,
    runs,
    selectedRun,
    selectedRunPlan,
    profileVersion,
    policyVersion,
    pending,
    actionPending,
    error,
    createRouterIdempotencyKey,
    refreshProfiles,
    createPlan,
    refreshRuns,
    createRun,
    openRun,
    approveRun,
    cancelRun,
  }
}
