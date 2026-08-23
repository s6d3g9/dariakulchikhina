#!/usr/bin/env node

import { accessSync, constants, readFileSync, realpathSync } from 'node:fs'
import { homedir, hostname, platform, userInfo } from 'node:os'
import { dirname, resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const NL_TOOLING_POLICY = Object.freeze({
  policyId: 'shell-v6-nl-development-runtime-v1',
  platform: 'linux',
  hostname: 'v2202602335514431700',
  repositoryRoot: '/srv/v6',
  runAsUser: 'claudecode',
  dashboardAddress: '127.0.0.1',
  serenaVersion: '1.7.0',
  serenaBinary: '/home/claudecode/.local/bin/serena',
  serenaConfig: '/home/claudecode/.serena/serena_config.yml',
})

const scriptPath = fileURLToPath(import.meta.url)
const scriptRepositoryRoot = realpathSync(resolve(dirname(scriptPath), '..'))

export function inspectNlToolingRuntime() {
  return {
    platform: platform(),
    hostname: hostname(),
    repositoryRoot: scriptRepositoryRoot,
    runAsUser: userInfo().username,
  }
}

export function evaluateNlToolingRuntime(actual) {
  const violations = []

  for (const key of ['platform', 'hostname', 'repositoryRoot', 'runAsUser']) {
    if (actual[key] !== NL_TOOLING_POLICY[key]) {
      violations.push({
        key,
        expected: NL_TOOLING_POLICY[key],
        actual: actual[key],
      })
    }
  }

  return violations
}

function failClosed(message, details = []) {
  console.error(`[NL_TOOLING_DENIED] ${message}`)
  for (const detail of details) {
    console.error(`- ${detail.key}: expected ${detail.expected}, got ${detail.actual}`)
  }
  process.exitCode = 78
}

function assertNlToolingRuntime() {
  const actual = inspectNlToolingRuntime()
  const violations = evaluateNlToolingRuntime(actual)

  if (violations.length > 0) {
    failClosed('Development-intelligence tools may run only on the canonical NL runtime.', violations)
    return false
  }

  return true
}

function verifySerenaInstallation() {
  accessSync(NL_TOOLING_POLICY.serenaBinary, constants.X_OK)

  const version = spawnSync(NL_TOOLING_POLICY.serenaBinary, ['--version'], {
    cwd: NL_TOOLING_POLICY.repositoryRoot,
    encoding: 'utf8',
  })
  const combinedOutput = `${version.stdout ?? ''}${version.stderr ?? ''}`.trim()

  if (version.status !== 0 || !combinedOutput.includes(NL_TOOLING_POLICY.serenaVersion)) {
    throw new Error(
      `Expected Serena ${NL_TOOLING_POLICY.serenaVersion}, received ${combinedOutput || 'no version output'}`,
    )
  }

  const config = readFileSync(NL_TOOLING_POLICY.serenaConfig, 'utf8')
  const requiredConfig = [
    ['dashboard loopback bind', /^web_dashboard_listen_address:\s*127\.0\.0\.1\s*$/m],
    ['disabled browser auto-open', /^web_dashboard_open_on_launch:\s*false\s*$/m],
    ['central server metadata', /^project_serena_folder_location:\s*["']?\/home\/claudecode\/\.serena\/projects\/\$projectFolderName["']?\s*$/m],
    ['trusted canonical project', /^\s*-\s*\/srv\/v6\s*$/m],
  ]

  for (const [label, pattern] of requiredConfig) {
    if (!pattern.test(config)) {
      throw new Error(`Serena configuration violates NL policy: missing ${label}`)
    }
  }
}

function printVerification() {
  verifySerenaInstallation()
  console.log(JSON.stringify({
    ok: true,
    policy: NL_TOOLING_POLICY.policyId,
    runtime: inspectNlToolingRuntime(),
    serena: {
      version: NL_TOOLING_POLICY.serenaVersion,
      dashboardAddress: NL_TOOLING_POLICY.dashboardAddress,
      browserAutoOpen: false,
    },
  }, null, 2))
}

function runSerena(context) {
  const allowedContexts = new Set(['claude-code', 'codex'])
  if (!allowedContexts.has(context)) {
    failClosed('Unsupported Serena client context.', [{
      key: 'context',
      expected: [...allowedContexts].join(' | '),
      actual: context || '<missing>',
    }])
    return
  }

  verifySerenaInstallation()

  const child = spawn(NL_TOOLING_POLICY.serenaBinary, [
    'start-mcp-server',
    '--project', NL_TOOLING_POLICY.repositoryRoot,
    '--context', context,
    '--transport', 'stdio',
    '--enable-web-dashboard', 'true',
    '--open-web-dashboard', 'false',
    '--log-level', 'INFO',
  ], {
    cwd: NL_TOOLING_POLICY.repositoryRoot,
    env: {
      ...process.env,
      HOME: homedir(),
      BROWSER: 'false',
    },
    stdio: 'inherit',
  })

  child.on('error', (error) => {
    console.error(`[NL_TOOLING_FAILED] ${error.message}`)
    process.exitCode = 1
  })
  child.on('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0)
  })
}

async function main() {
  if (!assertNlToolingRuntime()) return

  const [action = 'verify', context] = process.argv.slice(2)
  try {
    if (action === 'verify') {
      printVerification()
      return
    }
    if (action === 'serena') {
      runSerena(context)
      return
    }
    failClosed('Unknown NL tooling action.', [{
      key: 'action',
      expected: 'verify | serena',
      actual: action,
    }])
  } catch (error) {
    failClosed(error instanceof Error ? error.message : String(error))
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === scriptPath) {
  await main()
}
