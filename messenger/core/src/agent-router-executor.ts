import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

import {
  findRemainingRequiredRouterGates,
  markGatePassedForAction,
  type MessengerAgentRouterGateResult,
  type MessengerAgentRouterPlanRecord,
  type MessengerAgentRouterRunRecord,
  type MessengerAgentRouterVerificationResult,
} from './agent-router-run-store.ts'
import type { MessengerAgentRouterRunAction } from './agent-router-policy.ts'

const execFileAsync = promisify(execFile)

interface PackageJsonWithScripts {
  scripts?: Record<string, string>
}

const COMMAND_TIMEOUT_MS: Record<MessengerAgentRouterRunAction, number> = {
  'inspect-current-state': 20_000,
  'run-typecheck': 120_000,
  'run-build': 180_000,
  'run-messenger-core-typecheck': 120_000,
  'run-lint': 120_000,
  'run-format': 120_000,
  'prepare-report': 1_000,
}

function safeEnv() {
  return {
    PATH: process.env.PATH || '',
    HOME: process.env.HOME || '',
    TMPDIR: process.env.TMPDIR || '/tmp',
    PNPM_HOME: process.env.PNPM_HOME || '',
    COREPACK_HOME: process.env.COREPACK_HOME || '',
    NODE_ENV: process.env.NODE_ENV || 'development',
    CI: '1',
  }
}

function sanitizeOutput(value: string | undefined) {
  if (!value) return ''
  return value
    .replace(/(sk-[a-z0-9_-]{12,})/giu, '[REDACTED_TOKEN]')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gu, '$1[REDACTED]')
    .slice(0, 12_000)
}

async function readRootScripts(projectRoot: string) {
  try {
    const raw = await readFile(resolve(projectRoot, 'package.json'), 'utf8')
    const parsed = JSON.parse(raw) as PackageJsonWithScripts
    return parsed.scripts || {}
  } catch {
    return {}
  }
}

async function runFixedCommand(input: {
  action: MessengerAgentRouterRunAction
  command: string
  args: string[]
  cwd: string
}) {
  const startedAt = new Date().toISOString()

  try {
    const { stdout, stderr } = await execFileAsync(input.command, input.args, {
      cwd: input.cwd,
      env: safeEnv(),
      shell: false,
      timeout: COMMAND_TIMEOUT_MS[input.action],
      maxBuffer: 1024 * 1024,
    })

    return {
      action: input.action,
      status: 'passed' as const,
      summary: `${input.action} passed.`,
      exitCode: 0,
      stdout: sanitizeOutput(String(stdout || '')),
      stderr: sanitizeOutput(String(stderr || '')),
      startedAt,
      completedAt: new Date().toISOString(),
    }
  } catch (error) {
    const commandError = error as Error & {
      code?: number
      stdout?: string
      stderr?: string
      signal?: string
    }

    return {
      action: input.action,
      status: 'failed' as const,
      summary: commandError.signal === 'SIGTERM'
        ? `${input.action} timed out.`
        : `${input.action} failed.`,
      exitCode: typeof commandError.code === 'number' ? commandError.code : 1,
      stdout: sanitizeOutput(String(commandError.stdout || '')),
      stderr: sanitizeOutput(String(commandError.stderr || commandError.message || '')),
      startedAt,
      completedAt: new Date().toISOString(),
    }
  }
}

function skippedResult(action: MessengerAgentRouterRunAction, summary: string): MessengerAgentRouterVerificationResult {
  const timestamp = new Date().toISOString()
  return {
    action,
    status: 'skipped',
    summary,
    startedAt: timestamp,
    completedAt: timestamp,
  }
}

function reportResult(action: MessengerAgentRouterRunAction, summary: string): MessengerAgentRouterVerificationResult {
  const timestamp = new Date().toISOString()
  return {
    action,
    status: 'passed',
    summary,
    stdout: '',
    stderr: '',
    startedAt: timestamp,
    completedAt: timestamp,
  }
}

async function executeAction(action: MessengerAgentRouterRunAction, projectRoot: string): Promise<MessengerAgentRouterVerificationResult> {
  if (action === 'prepare-report') {
    return reportResult(action, 'Router plan/run report prepared from audit store metadata.')
  }

  if (action === 'inspect-current-state') {
    const status = await runFixedCommand({
      action,
      command: 'git',
      args: ['status', '--short'],
      cwd: projectRoot,
    })
    const diff = await runFixedCommand({
      action,
      command: 'git',
      args: ['diff', '--stat'],
      cwd: projectRoot,
    })

    return {
      action,
      status: status.status === 'passed' && diff.status === 'passed' ? 'passed' : 'failed',
      summary: status.status === 'passed' && diff.status === 'passed'
        ? 'Git status and diff stat inspected.'
        : 'Git inspection failed.',
      exitCode: status.status === 'passed' && diff.status === 'passed' ? 0 : 1,
      stdout: [status.stdout, diff.stdout].filter(Boolean).join('\n'),
      stderr: [status.stderr, diff.stderr].filter(Boolean).join('\n'),
      startedAt: status.startedAt,
      completedAt: diff.completedAt,
    }
  }

  if (action === 'run-typecheck') {
    return runFixedCommand({
      action,
      command: 'pnpm',
      args: ['comm:typecheck'],
      cwd: projectRoot,
    })
  }

  if (action === 'run-build') {
    return runFixedCommand({
      action,
      command: 'pnpm',
      args: ['build'],
      cwd: projectRoot,
    })
  }

  if (action === 'run-messenger-core-typecheck') {
    return runFixedCommand({
      action,
      command: 'pnpm',
      args: ['-C', 'messenger/core', 'build'],
      cwd: projectRoot,
    })
  }

  if (action === 'run-lint' || action === 'run-format') {
    const scriptName = action === 'run-lint' ? 'lint' : 'format'
    const scripts = await readRootScripts(projectRoot)
    if (!scripts[scriptName]) {
      return skippedResult(action, `${scriptName} script is not configured in root package.json.`)
    }

    return runFixedCommand({
      action,
      command: 'pnpm',
      args: [scriptName],
      cwd: projectRoot,
    })
  }

  return skippedResult(action, 'Unknown action was skipped by fail-closed executor.')
}

export async function executeMessengerAgentRouterSafeRun(input: {
  run: MessengerAgentRouterRunRecord
  planRecord: MessengerAgentRouterPlanRecord
  projectRoot: string
}) {
  const gateResults: MessengerAgentRouterGateResult[] = input.run.gateResults.map(gate => ({ ...gate }))
  const verificationResults: MessengerAgentRouterVerificationResult[] = []

  for (const action of input.run.requestedActions) {
    const result = await executeAction(action, input.projectRoot)
    verificationResults.push(result)
    markGatePassedForAction(
      gateResults,
      action,
      result.status,
      result.summary,
    )

    if (result.status === 'failed') {
      break
    }
  }

  const remainingGates = findRemainingRequiredRouterGates(gateResults)
  const failedResults = verificationResults.filter(result => result.status === 'failed')
  const status: 'succeeded' | 'failed' | 'blocked' = failedResults.length
    ? 'failed'
    : remainingGates.length
      ? 'blocked'
      : 'succeeded'
  const outputs = [{
    kind: 'router-summary',
    planId: input.planRecord.planId,
    profile: input.planRecord.profile,
    policyVersion: input.planRecord.policyVersion,
    profileVersion: input.planRecord.profileVersion,
    requestedActions: input.run.requestedActions,
    remainingGates: remainingGates.map(gate => gate.gateId),
  }]

  return {
    status,
    gateResults,
    verificationResults,
    outputs,
    summary: status === 'succeeded'
      ? 'Safe allowlist execution succeeded.'
      : status === 'blocked'
        ? 'Safe checks ran, but required gates remain unresolved.'
        : 'Safe allowlist execution failed.',
  }
}
