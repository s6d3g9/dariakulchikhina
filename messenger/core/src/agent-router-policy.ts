import {
  previewMessengerAgentRoutes,
  type MessengerAgentCostTier,
  type MessengerAgentEffort,
  type MessengerAgentProviderHint,
  type MessengerAgentRiskTier,
  type MessengerAgentRoutePreview,
  type MessengerAgentTaskClass,
} from './agent-llm.ts'

export const ROUTER_PROFILE_VERSION = '2026-06-28.1'
export const ROUTER_POLICY_VERSION = '2026-06-28.1'

export const MESSENGER_AGENT_ROUTER_PROFILE_IDS = [
  'dev-quick',
  'ai-launcher-ui',
  'crm-data',
  'studio-os-workflow',
  'designer-architect-cabinet',
  'client-portal',
  'construction-os',
  'messenger-integration',
  'db-schema',
  'security-privacy',
  'qa-release',
  'support-debug',
  'docs-rewrite',
] as const

export const MESSENGER_AGENT_ROUTER_ENVIRONMENTS = ['local', 'dev', 'staging', 'production'] as const

export const MESSENGER_AGENT_ROUTER_DATA_CLASSES = [
  'public',
  'internal',
  'client-content',
  'pii',
  'financial',
  'contracts',
  'legal',
  'credentials',
] as const

export const MESSENGER_AGENT_ROUTER_ACTIONS = [
  'inspect-files',
  'draft-plan',
  'prepare-patch',
  'run-checks',
  'send-message',
  'update-crm',
  'create-task',
  'db-migration',
  'deploy',
] as const

export const MESSENGER_AGENT_ROUTER_RUN_ACTIONS = [
  'inspect-current-state',
  'run-typecheck',
  'run-build',
  'run-messenger-core-typecheck',
  'run-lint',
  'run-format',
  'prepare-report',
] as const

export const MESSENGER_AGENT_ROUTER_GATE_IDS = [
  'admin-rbac',
  'audit-log',
  'rate-limit',
  'tenant-scope',
  'environment-scope',
  'data-classification',
  'secret-redaction',
  'no-command-exec',
  'no-direct-prod-write',
  'git-diff-review',
  'format',
  'lint',
  'typecheck',
  'build',
  'unit-tests',
  'messenger-core-typecheck',
  'messenger-web-build',
  'api-contract-review',
  'permission-review',
  'client-safe-read-model',
  'worker-task-state-machine',
  'messenger-action-guard',
  'outbox-event-contract',
  'migration-backup',
  'migration-drift-check',
  'visual-qa',
  'runtime-smoke',
  'external-model-review',
  'human-approval',
  'deploy-approval',
  'rollback-plan',
] as const

export type MessengerAgentRouterProfileId = typeof MESSENGER_AGENT_ROUTER_PROFILE_IDS[number]
export type MessengerAgentRouterEnvironment = typeof MESSENGER_AGENT_ROUTER_ENVIRONMENTS[number]
export type MessengerAgentRouterDataClass = typeof MESSENGER_AGENT_ROUTER_DATA_CLASSES[number]
export type MessengerAgentRouterAction = typeof MESSENGER_AGENT_ROUTER_ACTIONS[number]
export type MessengerAgentRouterRunAction = typeof MESSENGER_AGENT_ROUTER_RUN_ACTIONS[number]
export type MessengerAgentRouterGateId = typeof MESSENGER_AGENT_ROUTER_GATE_IDS[number]

export interface MessengerAgentRouterPlanInput {
  profile?: MessengerAgentRouterProfileId
  scope?: string
  tenantKey?: string
  projectId?: string
  changedFiles?: string[]
  riskTier?: MessengerAgentRiskTier
  costTier?: MessengerAgentCostTier
  providerHints?: MessengerAgentProviderHint[]
  environment?: MessengerAgentRouterEnvironment
  dataClasses?: MessengerAgentRouterDataClass[]
  requestedActions?: MessengerAgentRouterAction[]
}

export interface MessengerAgentRouterGate {
  id: MessengerAgentRouterGateId
  title: string
  category: 'access' | 'data' | 'code' | 'api' | 'db' | 'messenger' | 'release' | 'review' | 'runtime'
  description: string
  commands?: string[]
}

interface MessengerAgentRouterProfileDefinition {
  id: MessengerAgentRouterProfileId
  title: string
  description: string
  taskClass: MessengerAgentTaskClass
  riskTier: MessengerAgentRiskTier
  costTier: MessengerAgentCostTier
  effort: MessengerAgentEffort
  requiredGates: MessengerAgentRouterGateId[]
  optionalGates: MessengerAgentRouterGateId[]
  domainContracts: string[]
}

export interface MessengerAgentRouterPlan {
  generatedAt: string
  mode: 'plan-only'
  profileVersion: string
  policyVersion: string
  profile: MessengerAgentRouterProfileDefinition
  input: Required<Pick<MessengerAgentRouterPlanInput, 'scope' | 'changedFiles' | 'environment' | 'dataClasses' | 'requestedActions'>> & {
    requestedProfile?: MessengerAgentRouterProfileId
    tenantKey: string
    projectId: string
    providerHints: MessengerAgentProviderHint[]
  }
  policy: {
    taskClass: MessengerAgentTaskClass
    riskTier: MessengerAgentRiskTier
    costTier: MessengerAgentCostTier
    effort: MessengerAgentEffort
    failClosed: boolean
    externalModelAllowed: boolean
    requiresHumanApproval: boolean
    requiresExternalReview: boolean
  }
  routing: MessengerAgentRoutePreview
  gates: {
    required: MessengerAgentRouterGate[]
    optional: MessengerAgentRouterGate[]
  }
  gateIds: {
    required: MessengerAgentRouterGateId[]
    optional: MessengerAgentRouterGateId[]
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

const RISK_RANK: Record<MessengerAgentRiskTier, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
}

const COST_RANK: Record<MessengerAgentCostTier, number> = {
  local: 0,
  cheap: 1,
  balanced: 2,
  premium: 3,
  max: 4,
}

const EFFORT_RANK: Record<MessengerAgentEffort, number> = {
  low: 0,
  medium: 1,
  high: 2,
  xhigh: 3,
  max: 4,
}

const GATE_CATALOG: Record<MessengerAgentRouterGateId, MessengerAgentRouterGate> = {
  'admin-rbac': {
    id: 'admin-rbac',
    title: 'Admin RBAC',
    category: 'access',
    description: 'Only an authenticated messenger admin may request development routing plans.',
  },
  'audit-log': {
    id: 'audit-log',
    title: 'Audit log',
    category: 'access',
    description: 'Record requester, profile, policy, gates, model route, and blocked capabilities.',
  },
  'rate-limit': {
    id: 'rate-limit',
    title: 'Rate limit',
    category: 'access',
    description: 'Throttle repeated planning requests and reserve premium routes for high-risk work.',
  },
  'tenant-scope': {
    id: 'tenant-scope',
    title: 'Tenant scope',
    category: 'access',
    description: 'Keep CRM, client portal, project, and messenger actions inside the selected workspace/tenant.',
  },
  'environment-scope': {
    id: 'environment-scope',
    title: 'Environment scope',
    category: 'release',
    description: 'Separate local, dev, staging, and production plans; production is approval-only.',
  },
  'data-classification': {
    id: 'data-classification',
    title: 'Data classification',
    category: 'data',
    description: 'Classify public/internal/client/PII/financial/contract/legal/credential data before model routing.',
  },
  'secret-redaction': {
    id: 'secret-redaction',
    title: 'Secret redaction',
    category: 'data',
    description: 'Redact secrets, tokens, keys, credentials, and private client details before any external model use.',
  },
  'no-command-exec': {
    id: 'no-command-exec',
    title: 'No command execution',
    category: 'runtime',
    description: 'The plan API returns JSON only; it must not execute shell commands, write files, migrate DBs, or deploy.',
  },
  'no-direct-prod-write': {
    id: 'no-direct-prod-write',
    title: 'No direct production write',
    category: 'release',
    description: 'Production changes require explicit human approval, preflight verification, rollback notes, and deploy approval.',
  },
  'git-diff-review': {
    id: 'git-diff-review',
    title: 'Git diff review',
    category: 'code',
    description: 'Inspect current dirty state and isolate unrelated changes before editing or release.',
    commands: ['git status --short', 'git diff --stat'],
  },
  format: {
    id: 'format',
    title: 'Formatter',
    category: 'code',
    description: 'Run the project formatter when configured; currently this repo has no root format script.',
  },
  lint: {
    id: 'lint',
    title: 'Linter',
    category: 'code',
    description: 'Run lint when configured; currently this repo has no root lint script.',
  },
  typecheck: {
    id: 'typecheck',
    title: 'Typecheck',
    category: 'code',
    description: 'Typecheck changed TypeScript surfaces.',
    commands: ['pnpm comm:typecheck'],
  },
  build: {
    id: 'build',
    title: 'Build',
    category: 'code',
    description: 'Build the affected app before release or broad UI/API work.',
    commands: ['pnpm build'],
  },
  'unit-tests': {
    id: 'unit-tests',
    title: 'Unit tests',
    category: 'code',
    description: 'Run focused tests where available; add tests around state machines, API contracts, and auth boundaries.',
  },
  'messenger-core-typecheck': {
    id: 'messenger-core-typecheck',
    title: 'Messenger core typecheck',
    category: 'messenger',
    description: 'Verify the messenger core API/router layer.',
    commands: ['./node_modules/.bin/tsc -p messenger/core/tsconfig.json --noEmit'],
  },
  'messenger-web-build': {
    id: 'messenger-web-build',
    title: 'Messenger web build',
    category: 'messenger',
    description: 'Build messenger web when UI, routing, or settings screens change.',
    commands: ['pnpm messenger:web:build'],
  },
  'api-contract-review': {
    id: 'api-contract-review',
    title: 'API contract review',
    category: 'api',
    description: 'Keep API v1 envelopes, errors, revisions, permissions, and messenger compatibility stable.',
  },
  'permission-review': {
    id: 'permission-review',
    title: 'Permission review',
    category: 'access',
    description: 'Check role-based access for admin, CRM, designer, architect, client, contractor, foreman, worker, service, and agent.',
  },
  'client-safe-read-model': {
    id: 'client-safe-read-model',
    title: 'Client-safe read model',
    category: 'data',
    description: 'Hide internal comments, worker-only states, hidden costs, and operational details from client portal reads.',
  },
  'worker-task-state-machine': {
    id: 'worker-task-state-machine',
    title: 'Worker task state machine',
    category: 'api',
    description: 'Worker may accept/start/block/mark ready; foreman/project manager reviews; worker cannot self-approve.',
  },
  'messenger-action-guard': {
    id: 'messenger-action-guard',
    title: 'Messenger action guard',
    category: 'messenger',
    description: 'Messenger drafts actions through service permissions; it is not the source of truth.',
  },
  'outbox-event-contract': {
    id: 'outbox-event-contract',
    title: 'Outbox event contract',
    category: 'messenger',
    description: 'CRM/design/construction events go through event_outbox before messenger/system notifications.',
  },
  'migration-backup': {
    id: 'migration-backup',
    title: 'Migration backup',
    category: 'db',
    description: 'Run pg_dump before any DB migration or schema repair.',
  },
  'migration-drift-check': {
    id: 'migration-drift-check',
    title: 'Migration drift check',
    category: 'db',
    description: 'Check live drizzle migration drift before generating or applying schema changes.',
  },
  'visual-qa': {
    id: 'visual-qa',
    title: 'Visual QA',
    category: 'runtime',
    description: 'Verify desktop/mobile UI against AI Launcher M3 style: radius 8, no purple leak, dense work screens.',
  },
  'runtime-smoke': {
    id: 'runtime-smoke',
    title: 'Runtime smoke',
    category: 'runtime',
    description: 'Start the affected surface and smoke-test key routes or screens.',
  },
  'external-model-review': {
    id: 'external-model-review',
    title: 'External model review',
    category: 'review',
    description: 'Use an independent model/CLI for high-risk architecture, DB/API, auth, CRM domain, and messenger decisions.',
  },
  'human-approval': {
    id: 'human-approval',
    title: 'Human approval',
    category: 'review',
    description: 'Require explicit human approval before client-facing sends, production writes, migrations, deploys, or sensitive CRM updates.',
  },
  'deploy-approval': {
    id: 'deploy-approval',
    title: 'Deploy approval',
    category: 'release',
    description: 'Do not deploy unless the user explicitly approves the release for this turn.',
  },
  'rollback-plan': {
    id: 'rollback-plan',
    title: 'Rollback plan',
    category: 'release',
    description: 'Document rollback steps for releases, migrations, or production-risk changes.',
  },
}

const BASE_REQUIRED_GATES: MessengerAgentRouterGateId[] = [
  'admin-rbac',
  'audit-log',
  'rate-limit',
  'tenant-scope',
  'environment-scope',
  'data-classification',
  'secret-redaction',
  'no-command-exec',
  'no-direct-prod-write',
  'git-diff-review',
]

const PROFILE_DEFINITIONS: Record<MessengerAgentRouterProfileId, MessengerAgentRouterProfileDefinition> = {
  'dev-quick': {
    id: 'dev-quick',
    title: 'Quick development check',
    description: 'Cheap route for small local checks, summaries, and low-risk orientation.',
    taskClass: 'quick-check',
    riskTier: 'low',
    costTier: 'cheap',
    effort: 'low',
    requiredGates: ['messenger-core-typecheck'],
    optionalGates: ['format', 'lint', 'unit-tests'],
    domainContracts: ['Keep the slice narrow and do not infer production permission from a local plan.'],
  },
  'ai-launcher-ui': {
    id: 'ai-launcher-ui',
    title: 'AI Launcher UI shell',
    description: 'Frontend shell, navigation, dense M3 workspace UI, and visual QA.',
    taskClass: 'agent-reply',
    riskTier: 'medium',
    costTier: 'balanced',
    effort: 'medium',
    requiredGates: ['format', 'lint', 'typecheck', 'build', 'visual-qa', 'runtime-smoke'],
    optionalGates: ['messenger-web-build', 'unit-tests'],
    domainContracts: ['Follow AI Launcher style: monochrome M3, radius 8, modal radius 28, letter spacing 0, no purple leak, no landing hero for work screens.'],
  },
  'crm-data': {
    id: 'crm-data',
    title: 'CRM data model',
    description: 'Leads, clients, contacts, companies, deals, activities, documents, billing, and tenant-safe CRM lifecycle.',
    taskClass: 'architecture-review',
    riskTier: 'high',
    costTier: 'premium',
    effort: 'high',
    requiredGates: ['api-contract-review', 'permission-review', 'client-safe-read-model', 'typecheck', 'build', 'external-model-review'],
    optionalGates: ['unit-tests', 'migration-backup', 'migration-drift-check'],
    domainContracts: ['CRM owns relationships and sales lifecycle; messenger may request actions only through API/service permissions.'],
  },
  'studio-os-workflow': {
    id: 'studio-os-workflow',
    title: 'Studio OS workflow',
    description: 'Design project workflow, briefs, approvals, specs, reports, documents, roadmap, and project events.',
    taskClass: 'architecture-review',
    riskTier: 'high',
    costTier: 'premium',
    effort: 'high',
    requiredGates: ['api-contract-review', 'permission-review', 'client-safe-read-model', 'outbox-event-contract', 'external-model-review'],
    optionalGates: ['visual-qa', 'unit-tests'],
    domainContracts: ['Approved design artifacts become construction/procurement tasks; approvals and documents must write project events.'],
  },
  'designer-architect-cabinet': {
    id: 'designer-architect-cabinet',
    title: 'Designer and architect cabinet',
    description: 'Creator workspace for design projects, briefs, layouts, concepts, drawings, specs, supervision, RFIs, and approvals.',
    taskClass: 'architecture-review',
    riskTier: 'high',
    costTier: 'premium',
    effort: 'high',
    requiredGates: ['api-contract-review', 'permission-review', 'client-safe-read-model', 'typecheck', 'visual-qa', 'external-model-review'],
    optionalGates: ['unit-tests', 'build'],
    domainContracts: ['Designer/architect cabinet is the authoring surface; client portal receives only approved/client-safe projections.'],
  },
  'client-portal': {
    id: 'client-portal',
    title: 'Client portal',
    description: 'Client-safe project status, roadmap, documents, reports, approvals, team, communications, and notifications.',
    taskClass: 'architecture-review',
    riskTier: 'high',
    costTier: 'premium',
    effort: 'high',
    requiredGates: ['client-safe-read-model', 'permission-review', 'api-contract-review', 'visual-qa', 'external-model-review'],
    optionalGates: ['typecheck', 'build', 'runtime-smoke'],
    domainContracts: ['Never expose internal worker-only statuses, hidden budgets/costs, private comments, or non-approved documents to clients.'],
  },
  'construction-os': {
    id: 'construction-os',
    title: 'Construction Project OS',
    description: 'Contractors, crews, workers, foremen, assignments, worker task statuses, comments, attachments, approvals, and events.',
    taskClass: 'architecture-review',
    riskTier: 'high',
    costTier: 'premium',
    effort: 'high',
    requiredGates: ['worker-task-state-machine', 'permission-review', 'api-contract-review', 'outbox-event-contract', 'external-model-review'],
    optionalGates: ['migration-backup', 'migration-drift-check', 'unit-tests'],
    domainContracts: [
      'Contractor is the legal/contract subject; crew is the construction team; worker is the physical executor.',
      'Foreman is a worker role inside a crew and can coordinate crew tasks.',
      'Worker can receive tasks and move own task assigned -> accepted -> in_progress -> blocked/ready_for_review; worker cannot self-approve.',
    ],
  },
  'messenger-integration': {
    id: 'messenger-integration',
    title: 'Messenger integration',
    description: 'Messenger as action/communication interface over CRM, Studio OS, Client Portal, and Construction OS.',
    taskClass: 'architecture-review',
    riskTier: 'high',
    costTier: 'premium',
    effort: 'high',
    requiredGates: ['messenger-action-guard', 'outbox-event-contract', 'permission-review', 'api-contract-review', 'external-model-review'],
    optionalGates: ['messenger-core-typecheck', 'messenger-web-build', 'runtime-smoke'],
    domainContracts: ['Messenger is not the source of truth; all changes go through service permissions and emit events.'],
  },
  'db-schema': {
    id: 'db-schema',
    title: 'Database schema and migrations',
    description: 'Schema, migrations, data repair, drizzle drift, backfill, and DB/API contracts.',
    taskClass: 'architecture-review',
    riskTier: 'critical',
    costTier: 'premium',
    effort: 'high',
    requiredGates: ['migration-backup', 'migration-drift-check', 'api-contract-review', 'permission-review', 'external-model-review', 'human-approval'],
    optionalGates: ['unit-tests', 'rollback-plan'],
    domainContracts: ['No migration without pg_dump backup and drift review; repo migration state must be reconciled with live drizzle history.'],
  },
  'security-privacy': {
    id: 'security-privacy',
    title: 'Security and privacy',
    description: 'Auth, permissions, tenant boundaries, PII, secrets, audit, retention, and sensitive client/legal data.',
    taskClass: 'architecture-review',
    riskTier: 'critical',
    costTier: 'premium',
    effort: 'high',
    requiredGates: ['permission-review', 'secret-redaction', 'data-classification', 'external-model-review', 'human-approval', 'audit-log'],
    optionalGates: ['unit-tests', 'runtime-smoke'],
    domainContracts: ['Fail closed when auth, tenant, data classification, or policy state is unknown.'],
  },
  'qa-release': {
    id: 'qa-release',
    title: 'QA and release plan',
    description: 'Verification, build gates, smoke testing, deploy readiness, rollback, and release coordination.',
    taskClass: 'quick-check',
    riskTier: 'medium',
    costTier: 'balanced',
    effort: 'medium',
    requiredGates: ['git-diff-review', 'typecheck', 'build', 'runtime-smoke', 'deploy-approval', 'rollback-plan'],
    optionalGates: ['visual-qa', 'messenger-core-typecheck', 'messenger-web-build', 'unit-tests'],
    domainContracts: ['Verification may be planned automatically, but deploy remains explicit-approval only.'],
  },
  'support-debug': {
    id: 'support-debug',
    title: 'Support and debug',
    description: 'Read-only diagnostics, logs, repro steps, triage, and incident notes.',
    taskClass: 'quick-check',
    riskTier: 'low',
    costTier: 'cheap',
    effort: 'low',
    requiredGates: ['no-command-exec', 'secret-redaction', 'data-classification'],
    optionalGates: ['runtime-smoke', 'external-model-review'],
    domainContracts: ['Diagnostics are read-only by default; redact client data and secrets before sharing with external tools.'],
  },
  'docs-rewrite': {
    id: 'docs-rewrite',
    title: 'Documentation rewrite',
    description: 'Architecture docs, implementation prompts, API contracts, role definitions, and operating rules.',
    taskClass: 'summary',
    riskTier: 'low',
    costTier: 'cheap',
    effort: 'medium',
    requiredGates: ['git-diff-review', 'data-classification'],
    optionalGates: ['external-model-review'],
    domainContracts: ['Docs must reflect CRM + Studio OS + Designer/Architect Cabinet + Client Portal + Construction OS + messenger integration as one system.'],
  },
}

function uniqueValues<T extends string>(values: T[]) {
  return Array.from(new Set(values))
}

function maxByRank<T extends string>(left: T, right: T, ranks: Record<T, number>) {
  return ranks[left] >= ranks[right] ? left : right
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some(needle => haystack.includes(needle))
}

function normalizePath(value: string) {
  return value.trim().replace(/\\/gu, '/').toLowerCase()
}

function buildSearchText(scope: string, changedFiles: string[]) {
  return `${scope}\n${changedFiles.map(normalizePath).join('\n')}`.toLowerCase()
}

function inferProfile(scope: string, changedFiles: string[]): MessengerAgentRouterProfileId {
  const text = buildSearchText(scope, changedFiles)

  if (includesAny(text, ['secret', '.env', 'auth', 'csrf', 'security', 'permission', 'token', 'password', 'private key'])) return 'security-privacy'
  if (includesAny(text, ['migration', 'drizzle', 'server/db', 'schema.ts', 'pg_dump', 'database'])) return 'db-schema'
  if (includesAny(text, ['messenger', 'outbox', 'webhook', 'action-execute', 'thread', 'conversation'])) return 'messenger-integration'
  if (includesAny(text, ['worker', 'foreman', 'crew', 'contractor', 'construction', 'work-status', 'task assignment'])) return 'construction-os'
  if (includesAny(text, ['client portal', 'client-safe', 'client/', 'roadmap', 'approval', 'report', 'photo report'])) return 'client-portal'
  if (includesAny(text, ['designer', 'architect', 'brief', 'layout', 'drawing', 'specification', 'moodboard', 'author supervision'])) return 'designer-architect-cabinet'
  if (includesAny(text, ['studio os', 'design project', 'project os', 'tz', 'rfi', 'document workflow'])) return 'studio-os-workflow'
  if (includesAny(text, ['ai launcher', 'm3', 'css', 'vue', 'component', 'navigation', 'shell', 'frontend', 'visual qa'])) return 'ai-launcher-ui'
  if (includesAny(text, ['crm', 'lead', 'deal', 'contact', 'company', 'invoice', 'payment', 'tariff'])) return 'crm-data'
  if (includesAny(text, ['docs/', 'readme', 'documentation', 'prompt'])) return 'docs-rewrite'
  if (includesAny(text, ['release', 'deploy', 'rollback', 'build', 'smoke'])) return 'qa-release'
  if (includesAny(text, ['debug', 'incident', 'log', 'support'])) return 'support-debug'

  return 'dev-quick'
}

function classifyChangedFiles(changedFiles: string[]) {
  const normalized = changedFiles.map(normalizePath)

  return {
    touchesDb: normalized.some(file => /(^|\/)(server\/db|drizzle|migrations?)\b|schema\.ts$/u.test(file)),
    touchesAuth: normalized.some(file => /auth|csrf|security|permission|token|session/u.test(file)),
    touchesSecrets: normalized.some(file => /(^|\/)\.env|secret|private[_-]?key|credential/u.test(file)),
    touchesMessenger: normalized.some(file => file.startsWith('messenger/') || file.includes('/communications/')),
    touchesFrontend: normalized.some(file => /^(app|messenger\/web)\//u.test(file) || /\.(vue|css|scss)$/u.test(file)),
    touchesInfra: normalized.some(file => /docker|ecosystem|deploy|render|pm2|package\.json|pnpm-lock/u.test(file)),
    touchesDocs: normalized.some(file => /(^|\/)docs\//u.test(file) || /readme|\.md$/u.test(file)),
  }
}

function gatesForChangedFiles(flags: ReturnType<typeof classifyChangedFiles>) {
  const gates: MessengerAgentRouterGateId[] = []

  if (flags.touchesDb) gates.push('migration-backup', 'migration-drift-check', 'api-contract-review', 'rollback-plan')
  if (flags.touchesAuth) gates.push('permission-review', 'external-model-review', 'human-approval')
  if (flags.touchesSecrets) gates.push('secret-redaction', 'human-approval')
  if (flags.touchesMessenger) gates.push('messenger-action-guard', 'outbox-event-contract', 'messenger-core-typecheck')
  if (flags.touchesFrontend) gates.push('visual-qa', 'typecheck', 'build')
  if (flags.touchesInfra) gates.push('rollback-plan', 'deploy-approval', 'human-approval')
  if (flags.touchesDocs) gates.push('git-diff-review')

  return gates
}

function gatesForDataClasses(dataClasses: MessengerAgentRouterDataClass[]) {
  const gates: MessengerAgentRouterGateId[] = ['data-classification']

  if (dataClasses.some(dataClass => dataClass !== 'public')) gates.push('secret-redaction')
  if (dataClasses.some(dataClass => ['pii', 'financial', 'contracts', 'legal', 'credentials'].includes(dataClass))) {
    gates.push('human-approval', 'external-model-review', 'permission-review')
  }

  return gates
}

function gatesForActions(actions: MessengerAgentRouterAction[]) {
  const gates: MessengerAgentRouterGateId[] = []

  if (actions.includes('send-message') || actions.includes('update-crm') || actions.includes('create-task')) {
    gates.push('messenger-action-guard', 'permission-review', 'human-approval')
  }
  if (actions.includes('db-migration')) gates.push('migration-backup', 'migration-drift-check', 'rollback-plan', 'human-approval')
  if (actions.includes('deploy')) gates.push('deploy-approval', 'rollback-plan', 'runtime-smoke', 'human-approval')
  if (actions.includes('run-checks')) gates.push('typecheck', 'build')

  return gates
}

function riskForInputs(
  profile: MessengerAgentRouterProfileDefinition,
  flags: ReturnType<typeof classifyChangedFiles>,
  environment: MessengerAgentRouterEnvironment,
  dataClasses: MessengerAgentRouterDataClass[],
  requestedRisk?: MessengerAgentRiskTier,
) {
  let risk = requestedRisk || profile.riskTier

  if (flags.touchesDb || flags.touchesAuth || flags.touchesSecrets || environment === 'production') {
    risk = maxByRank(risk, 'critical', RISK_RANK)
  } else if (flags.touchesMessenger || flags.touchesInfra || dataClasses.some(dataClass => dataClass !== 'public' && dataClass !== 'internal')) {
    risk = maxByRank(risk, 'high', RISK_RANK)
  } else if (flags.touchesFrontend) {
    risk = maxByRank(risk, 'medium', RISK_RANK)
  }

  return risk
}

function costForRisk(profile: MessengerAgentRouterProfileDefinition, riskTier: MessengerAgentRiskTier, requestedCost?: MessengerAgentCostTier) {
  let cost = requestedCost || profile.costTier

  if (riskTier === 'critical' || riskTier === 'high') {
    cost = maxByRank(cost, 'premium', COST_RANK)
  } else if (riskTier === 'medium') {
    cost = maxByRank(cost, 'balanced', COST_RANK)
  }

  return cost
}

function effortForRisk(profile: MessengerAgentRouterProfileDefinition, riskTier: MessengerAgentRiskTier) {
  if (riskTier === 'critical') return maxByRank(profile.effort, 'high', EFFORT_RANK)
  if (riskTier === 'high') return maxByRank(profile.effort, 'high', EFFORT_RANK)
  if (riskTier === 'medium') return maxByRank(profile.effort, 'medium', EFFORT_RANK)
  return profile.effort
}

function shouldRequireExternalReview(
  profile: MessengerAgentRouterProfileDefinition,
  riskTier: MessengerAgentRiskTier,
  flags: ReturnType<typeof classifyChangedFiles>,
  actions: MessengerAgentRouterAction[],
  dataClasses: MessengerAgentRouterDataClass[],
) {
  return (
    riskTier === 'high'
    || riskTier === 'critical'
    || profile.requiredGates.includes('external-model-review')
    || flags.touchesDb
    || flags.touchesAuth
    || flags.touchesMessenger
    || actions.some(action => ['send-message', 'update-crm', 'create-task', 'db-migration', 'deploy'].includes(action))
    || dataClasses.some(dataClass => ['pii', 'financial', 'contracts', 'legal'].includes(dataClass))
  )
}

function shouldRequireHumanApproval(
  riskTier: MessengerAgentRiskTier,
  environment: MessengerAgentRouterEnvironment,
  flags: ReturnType<typeof classifyChangedFiles>,
  actions: MessengerAgentRouterAction[],
  dataClasses: MessengerAgentRouterDataClass[],
) {
  return (
    riskTier === 'critical'
    || environment === 'production'
    || flags.touchesDb
    || flags.touchesAuth
    || flags.touchesSecrets
    || actions.some(action => ['send-message', 'update-crm', 'create-task', 'db-migration', 'deploy'].includes(action))
    || dataClasses.some(dataClass => ['credentials', 'financial', 'contracts', 'legal'].includes(dataClass))
  )
}

function buildAllowedActions(riskTier: MessengerAgentRiskTier, requiresHumanApproval: boolean) {
  const actions = ['inspect-files', 'draft-plan']

  if (riskTier === 'low' || riskTier === 'medium') {
    actions.push('prepare-patch', 'run-readonly-checks')
  }

  if (!requiresHumanApproval && riskTier === 'low') {
    actions.push('run-safe-local-checks')
  }

  return actions
}

function buildExecutableActions(
  riskTier: MessengerAgentRiskTier,
  requiresHumanApproval: boolean,
  requiredGateIds: MessengerAgentRouterGateId[],
) {
  const actions: MessengerAgentRouterRunAction[] = ['inspect-current-state', 'prepare-report']

  if (requiredGateIds.includes('messenger-core-typecheck')) {
    actions.push('run-messenger-core-typecheck')
  }

  if (requiredGateIds.includes('typecheck')) {
    actions.push('run-typecheck')
  }

  if (requiredGateIds.includes('build')) {
    actions.push('run-build')
  }

  if (requiredGateIds.includes('lint')) {
    actions.push('run-lint')
  }

  if (requiredGateIds.includes('format')) {
    actions.push('run-format')
  }

  if (!requiresHumanApproval && riskTier === 'low' && !actions.includes('run-messenger-core-typecheck')) {
    actions.push('run-messenger-core-typecheck')
  }

  return uniqueValues(actions)
}

function buildBlockedActions(
  environment: MessengerAgentRouterEnvironment,
  flags: ReturnType<typeof classifyChangedFiles>,
  actions: MessengerAgentRouterAction[],
  dataClasses: MessengerAgentRouterDataClass[],
) {
  const blocked = [
    'execute-command-from-plan-api',
    'write-file-from-plan-api',
    'deploy-from-plan-api',
    'db-migrate-from-plan-api',
    'send-message-from-plan-api',
  ]

  if (environment === 'production') blocked.push('production-write-without-explicit-human-approval')
  if (flags.touchesDb || actions.includes('db-migration')) blocked.push('migration-without-pg-dump-and-drift-check')
  if (flags.touchesSecrets || dataClasses.includes('credentials')) blocked.push('external-model-call-with-raw-secrets')
  if (actions.includes('send-message')) blocked.push('client-message-send-without-human-approval')
  if (actions.includes('update-crm')) blocked.push('crm-write-without-service-permission')
  if (actions.includes('create-task')) blocked.push('task-create-without-project-permission')
  if (actions.includes('deploy')) blocked.push('deploy-without-user-approval')

  return uniqueValues(blocked)
}

function buildWarnings(
  routePreview: MessengerAgentRoutePreview,
  flags: ReturnType<typeof classifyChangedFiles>,
  dataClasses: MessengerAgentRouterDataClass[],
) {
  const warnings: string[] = []

  if (!routePreview.configured) {
    warnings.push('No allowed model route is currently available for this policy; the caller must fail closed or lower the scope.')
  }
  if (flags.touchesDb) {
    warnings.push('DB work is high-risk here because live drizzle migration history is known to drift from repository migrations.')
  }
  if (flags.touchesSecrets || dataClasses.includes('credentials')) {
    warnings.push('Credentials/secrets detected: external model routes must receive only redacted context or be blocked.')
  }
  if (flags.touchesMessenger) {
    warnings.push('Messenger actions must stay drafts/service calls; messenger must not become the source of truth.')
  }

  return warnings
}

function buildNextSteps(requiredGates: MessengerAgentRouterGateId[], requiresHumanApproval: boolean, requiresExternalReview: boolean) {
  const steps = [
    'Confirm the profile, scope, affected files, environment, and data classes.',
    'Review current dirty state and isolate unrelated changes before implementation.',
  ]

  if (requiresExternalReview) steps.push('Run independent CLI/model review before architecture, DB/API, CRM-domain, or messenger-integration decisions.')
  if (requiredGates.includes('migration-backup')) steps.push('Take pg_dump backup and verify drizzle migration drift before any DB migration.')
  if (requiredGates.includes('visual-qa')) steps.push('Run desktop/mobile visual QA against AI Launcher style after UI changes.')
  if (requiresHumanApproval) steps.push('Ask for explicit human approval before production-impact actions, client-facing sends, migrations, CRM writes, or deploy.')

  return steps
}

function commandsForGates(gateIds: MessengerAgentRouterGateId[]) {
  return uniqueValues(gateIds.flatMap(gateId => GATE_CATALOG[gateId].commands || []))
}

function costUnitForTier(costTier: MessengerAgentCostTier) {
  return COST_RANK[costTier] + 1
}

function buildQuotaScope(tenantKey: string, projectId: string) {
  if (tenantKey && projectId) return `${tenantKey}:${projectId}`
  if (projectId) return `project:${projectId}`
  if (tenantKey) return `tenant:${tenantKey}`
  return 'global'
}

function buildBudgetEstimate(costTier: MessengerAgentCostTier, riskTier: MessengerAgentRiskTier, quotaScope: string) {
  const costUnits = costUnitForTier(costTier)
  const riskMultiplier = riskTier === 'critical' ? 3 : riskTier === 'high' ? 2 : 1

  return {
    estimatedCostUnits: costUnits * riskMultiplier,
    estimatedPremiumUnits: costTier === 'premium' || costTier === 'max' ? riskMultiplier : 0,
    quotaScope,
    dailyUserRunLimit: 30,
    dailyScopeRunLimit: 40,
    dailyTaskClassRunLimit: 20,
    dailyCostTierRunLimit: costTier === 'premium' || costTier === 'max' ? 12 : 30,
    dailyModelRouteLimit: 18,
    dailyPremiumUnitLimit: 12,
  }
}

export function getMessengerAgentRouterGate(gateId: MessengerAgentRouterGateId) {
  return GATE_CATALOG[gateId]
}

export function listMessengerAgentRouterGates() {
  return MESSENGER_AGENT_ROUTER_GATE_IDS.map(gateId => GATE_CATALOG[gateId])
}

export function listMessengerAgentRouterProfiles() {
  return MESSENGER_AGENT_ROUTER_PROFILE_IDS.map(profileId => PROFILE_DEFINITIONS[profileId])
}

export function buildMessengerAgentRouterPlan(input: MessengerAgentRouterPlanInput = {}): MessengerAgentRouterPlan {
  const scope = input.scope?.trim() || ''
  const tenantKey = input.tenantKey?.trim().slice(0, 120) || ''
  const projectId = input.projectId?.trim().slice(0, 160) || ''
  const changedFiles = uniqueValues((input.changedFiles || []).map(file => file.trim()).filter(Boolean)).slice(0, 80)
  const environment = input.environment || 'local'
  const dataClasses: MessengerAgentRouterDataClass[] = uniqueValues(input.dataClasses?.length ? input.dataClasses : ['internal'])
  const requestedActions: MessengerAgentRouterAction[] = uniqueValues(input.requestedActions || ['inspect-files', 'draft-plan'])
  const profileId = input.profile || inferProfile(scope, changedFiles)
  const profile = PROFILE_DEFINITIONS[profileId] || PROFILE_DEFINITIONS['dev-quick']
  const flags = classifyChangedFiles(changedFiles)
  const riskTier = riskForInputs(profile, flags, environment, dataClasses, input.riskTier)
  const costTier = costForRisk(profile, riskTier, input.costTier)
  const effort = effortForRisk(profile, riskTier)
  const externalModelAllowed = !flags.touchesSecrets && !dataClasses.includes('credentials')
  const providerHints: MessengerAgentProviderHint[] = externalModelAllowed ? [...(input.providerHints || [])] : ['local']
  const routing = previewMessengerAgentRoutes({
    taskClass: profile.taskClass,
    riskTier,
    costTier,
    effort,
    providerHints,
  })
  const requiresExternalReview = shouldRequireExternalReview(profile, riskTier, flags, requestedActions, dataClasses)
  const requiresHumanApproval = shouldRequireHumanApproval(riskTier, environment, flags, requestedActions, dataClasses)
  const requiredGateIds = uniqueValues([
    ...BASE_REQUIRED_GATES,
    ...profile.requiredGates,
    ...gatesForChangedFiles(flags),
    ...gatesForDataClasses(dataClasses),
    ...gatesForActions(requestedActions),
    ...(requiresExternalReview ? ['external-model-review' as const] : []),
    ...(requiresHumanApproval ? ['human-approval' as const] : []),
  ])
  const optionalGateIds = uniqueValues(profile.optionalGates.filter(gateId => !requiredGateIds.includes(gateId)))
  const quotaScope = buildQuotaScope(tenantKey, projectId)
  const executableActions = buildExecutableActions(riskTier, requiresHumanApproval, requiredGateIds)

  return {
    generatedAt: new Date().toISOString(),
    mode: 'plan-only',
    profileVersion: ROUTER_PROFILE_VERSION,
    policyVersion: ROUTER_POLICY_VERSION,
    profile,
    input: {
      requestedProfile: input.profile,
      scope,
      tenantKey,
      projectId,
      changedFiles,
      environment,
      dataClasses,
      requestedActions,
      providerHints,
    },
    policy: {
      taskClass: profile.taskClass,
      riskTier,
      costTier,
      effort,
      failClosed: true,
      externalModelAllowed,
      requiresHumanApproval,
      requiresExternalReview,
    },
    routing,
    gates: {
      required: requiredGateIds.map(gateId => GATE_CATALOG[gateId]),
      optional: optionalGateIds.map(gateId => GATE_CATALOG[gateId]),
    },
    gateIds: {
      required: requiredGateIds,
      optional: optionalGateIds,
    },
    budget: buildBudgetEstimate(costTier, riskTier, quotaScope),
    allowedActions: buildAllowedActions(riskTier, requiresHumanApproval),
    blockedActions: buildBlockedActions(environment, flags, requestedActions, dataClasses),
    executableActions,
    verificationCommands: commandsForGates(requiredGateIds),
    warnings: buildWarnings(routing, flags, dataClasses),
    nextSteps: buildNextSteps(requiredGateIds, requiresHumanApproval, requiresExternalReview),
  }
}
