// PM2 config for the host-session bridge supervisor v2.
// Scans all Claude Code project directories and keeps one tail-child per
// active .jsonl, routing events to the correct project-agent via the
// host-session provisioning API.
//
// Setup:
//   1. Ensure HOST_BRIDGE_URL and HOST_BRIDGE_TOKEN are set (see below).
//   2. Build the bridge: cd clicore2messenger && pnpm build
//   3. pm2 start clicore2messenger/host-supervisor.ecosystem.config.cjs
//   4. pm2 logs daria-host-session-v2
//
// v2 runs alongside the legacy daria-host-session (v1); both can be active
// during the migration window. See scripts/workrooms/HOST_SESSION_BRIDGE.md.

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

module.exports = {
  apps: [
    {
      name: 'daria-host-session-v2',
      script: path.resolve(__dirname, 'src/host-supervisor.ts'),
      interpreter: 'node',
      interpreter_args: '--experimental-strip-types',
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
