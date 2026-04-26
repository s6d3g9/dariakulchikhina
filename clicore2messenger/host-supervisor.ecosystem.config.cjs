// PM2 config for the host-session bridge supervisor v2.
// Scans all Claude Code project directories and keeps one tail-child per
// active .jsonl, routing events to the correct project-agent via the
// host-session provisioning API.
//
// Setup:
//   1. Ensure HOST_BRIDGE_URL, HOST_BRIDGE_TOKEN are set (see below).
//   2. Set HOST_BRIDGE_OWNER_UUID and HOST_BRIDGE_PROJECT_UUID — the
//      supervisor is bound to ONE (owner, project) pair (W4 contract).
//      For multiple projects, run multiple PM2 instances with different
//      names and per-instance env files.
//   3. Build the bridge: cd clicore2messenger && pnpm build
//   4. pm2 start clicore2messenger/host-supervisor.ecosystem.config.cjs
//   5. pm2 logs daria-host-session-v2

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const t = line.trim()
      if (!t || t.startsWith('#')) return acc
      const i = t.indexOf('=')
      if (i === -1) return acc
      const k = t.slice(0, i).trim()
      const v = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')
      if (k) acc[k] = v
      return acc
    }, {})
}

const envFile =
  process.env.HOST_SUPERVISOR_ENV_FILE ||
  path.join(os.homedir(), '.host-supervisor-v2.env')
const fromFile = readEnvFile(envFile)
const env = { ...fromFile, ...process.env }

// W4: owner + project are passed as CLI flags, never as env-fallbacks on the
// server side. We accept them via env keys here purely as a deployment
// convenience (PM2 manifests are easier to parameterize via env files than
// via per-app argv splicing) and forward them as `--owner-user-id` /
// `--project-id` to the supervisor process.
const OWNER_USER_ID =
  env.HOST_BRIDGE_OWNER_UUID || env.HOST_BRIDGE_OWNER_USER_UUID || ''
const PROJECT_ID = env.HOST_BRIDGE_PROJECT_UUID || ''

if (!OWNER_USER_ID || !PROJECT_ID) {
  // Don't throw — PM2 will surface the supervisor's own fail-fast log line
  // when it tries to start. Surface the missing values here as a hint so
  // operators see them in `pm2 logs` immediately.
  console.error(
    '[host-supervisor.ecosystem] HOST_BRIDGE_OWNER_UUID and HOST_BRIDGE_PROJECT_UUID must both be set in the env file (' +
      envFile +
      ') — supervisor will fail to start.',
  )
}

module.exports = {
  apps: [
    {
      name: 'daria-host-session-v2',
      script: path.resolve(__dirname, 'src/host-supervisor.ts'),
      interpreter: 'node',
      interpreter_args: '--experimental-strip-types',
      args: [
        '--owner-user-id',
        OWNER_USER_ID,
        '--project-id',
        PROJECT_ID,
      ],
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      min_uptime: '10s',
      max_restarts: 20,
      env: {
        // Required — fail-fast if absent
        HOST_BRIDGE_URL: env.HOST_BRIDGE_URL || '',
        HOST_BRIDGE_TOKEN: env.HOST_BRIDGE_TOKEN || '',
        // Optional overrides
        HOST_NAME: env.HOST_NAME || '',
        TRANSCRIPT_ROOT:
          env.TRANSCRIPT_ROOT || path.join(os.homedir(), '.claude', 'projects'),
        STATE_DIR:
          env.STATE_DIR || path.join(os.homedir(), 'state', 'claude-bridge'),
        MESSENGER_URL: env.MESSENGER_URL || 'http://localhost:4300',
        POLL_SECS: env.POLL_SECS || '30',
        HOST_SESSION_IDLE_MIN: env.HOST_SESSION_IDLE_MIN || '30',
      },
    },
  ],
}
