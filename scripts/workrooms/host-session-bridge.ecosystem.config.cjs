// PM2 config for the host-session bridge — tails the newest Claude Code CLI
// transcript on this machine and streams events into the messenger as the
// dedicated "Host Session Monitor" agent.
//
// To provision:
//   1. Insert a messenger_agent + conversation + pending run (see
//      scripts/workrooms/host-session-bridge.sql, or create by hand).
//   2. Put the resulting ids + ingest token in ~/.host-session-bridge.env
//      with the same key names the script reads (HOST_AGENT_ID,
//      HOST_INGEST_TOKEN, HOST_RUN_ID, HOST_CONV_ID).
//   3. pm2 start scripts/workrooms/host-session-bridge.ecosystem.cjs
//
// The supervisor loop rotates to newer .jsonl files on each POLL_SECS tick,
// so there is no per-session re-install.

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

const envFile = process.env.HOST_SESSION_ENV_FILE || path.join(os.homedir(), '.host-session-bridge.env')
const fromFile = readEnvFile(envFile)
const env = { ...fromFile, ...process.env }

module.exports = {
  apps: [
    {
      name: 'daria-host-session',
      script: path.resolve(__dirname, 'host-session-bridge.sh'),
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      min_uptime: '10s',
      max_restarts: 20,
      env: {
        HOST_AGENT_ID: env.HOST_AGENT_ID || '',
        HOST_INGEST_TOKEN: env.HOST_INGEST_TOKEN || '',
        HOST_RUN_ID: env.HOST_RUN_ID || '',
        HOST_CONV_ID: env.HOST_CONV_ID || '',
        TRANSCRIPT_DIR: env.TRANSCRIPT_DIR || path.join(os.homedir(), '.claude', 'projects', '-home-claudecode'),
        MESSENGER_URL: env.MESSENGER_URL || 'http://localhost:4300',
        POLL_SECS: env.POLL_SECS || '60',
      },
    },
  ],
}
