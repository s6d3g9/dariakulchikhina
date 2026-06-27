/**
 * PM2 production config.
 * All secrets MUST be set in /opt/daria-nuxt/.env or the system environment.
 * Never hardcode credentials here — this file is committed to Git.
 */
const fs = require('node:fs')

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return acc
      const sep = trimmed.indexOf('=')
      if (sep === -1) return acc
      const key = trimmed.slice(0, sep).trim()
      const val = trimmed.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '')
      if (key) acc[key] = val
      return acc
    }, {})
}

const envFile = readEnvFile('/opt/daria-nuxt/.env')
const env = { ...envFile, ...process.env }

// Fail-fast: require critical secrets
const required = ['DATABASE_URL', 'NUXT_SESSION_SECRET']
for (const key of required) {
  if (!env[key]) {
    console.error(`[FATAL] Missing required env var: ${key}. Set it in /opt/daria-nuxt/.env`)
    process.exit(1)
  }
}

module.exports = {
  "apps": [
    {
      "name": "daria-nuxt",
      "script": ".output/server/index.mjs",
      "instances": 1,
      "exec_mode": "fork",
      "env": {
        "DATABASE_URL": env.DATABASE_URL,
        "REDIS_URL": env.REDIS_URL || "redis://localhost:6380",
        "NUXT_SESSION_SECRET": env.NUXT_SESSION_SECRET,
        "DESIGNER_INITIAL_EMAIL": env.DESIGNER_INITIAL_EMAIL || "admin@dariakulchikhina.com",
        "DESIGNER_INITIAL_PASSWORD": env.DESIGNER_INITIAL_PASSWORD || "",
        "UPLOAD_DIR": env.UPLOAD_DIR || "/opt/daria-nuxt/data/uploads",
        "NODE_ENV": "production",
        "PORT": "3000",
        "HOST": "0.0.0.0"
      }
    }
  ]
}