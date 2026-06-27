const fs = require('node:fs')
const path = require('node:path')

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((accumulator, line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        return accumulator
      }

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) {
        return accumulator
      }

      const key = trimmed.slice(0, separatorIndex).trim()
      const rawValue = trimmed.slice(separatorIndex + 1).trim()
      const value = rawValue.replace(/^['"]|['"]$/g, '')
      if (key) {
        accumulator[key] = value
      }
      return accumulator
    }, {})
}

const deployRoot = process.env.APP_CWD || '/opt/daria-nuxt-refactor'
const envFile = readEnvFile(path.join(deployRoot, '.env'))
const env = {
  ...envFile,
  ...process.env,
}

const required = ['DATABASE_URL', 'NUXT_SESSION_SECRET']
for (const key of required) {
  if (!env[key]) {
    console.error(`[FATAL] Missing required env var: ${key}. Set it in ${deployRoot}/.env`)
    process.exit(1)
  }
}

const runtimeEnv = {
  ...env,
  APP_NAME: env.APP_NAME || 'daria-nuxt-refactor',
  APP_CWD: env.APP_CWD || deployRoot,
  REDIS_URL: env.REDIS_URL || 'redis://localhost:6380/1',
  DESIGNER_INITIAL_EMAIL: env.DESIGNER_INITIAL_EMAIL || 'admin@dariakulchikhina.com',
  DESIGNER_INITIAL_PASSWORD: env.DESIGNER_INITIAL_PASSWORD || '',
  UPLOAD_DIR: env.UPLOAD_DIR || `${deployRoot}/public/uploads`,
  NODE_ENV: env.NODE_ENV || 'production',
  PORT: env.PORT || '3018',
  HOST: env.HOST || '0.0.0.0',
}

module.exports = {
  apps: [
    {
      name: runtimeEnv.APP_NAME,
      cwd: runtimeEnv.APP_CWD,
      script: '.output/server/index.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: runtimeEnv,
    },
  ],
}