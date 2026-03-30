const fs = require('node:fs')
const path = require('node:path')

function readRuntimeEnv(filePath) {
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

const baseEnv = {
  ...process.env,
}

const inferredDeployRoot = baseEnv.MESSENGER_DEPLOY_ROOT || process.cwd()
const inferredDataRoot = baseEnv.MESSENGER_CORE_DATA_DIR
  || path.resolve(inferredDeployRoot, '../daria-messenger-data')
const inferredRuntimeEnvPath = baseEnv.MESSENGER_RUNTIME_ENV_PATH || `${inferredDataRoot}/messenger-runtime.env`

const runtimeEnv = {
  ...readRuntimeEnv(inferredRuntimeEnvPath),
  ...baseEnv,
}

const messengerDeployRoot = runtimeEnv.MESSENGER_DEPLOY_ROOT || inferredDeployRoot
const messengerProjectRoot = runtimeEnv.MESSENGER_PROJECT_ROOT || messengerDeployRoot
const messengerDataRoot = runtimeEnv.MESSENGER_CORE_DATA_DIR || inferredDataRoot
const messengerRuntimeEnvPath = runtimeEnv.MESSENGER_RUNTIME_ENV_PATH || inferredRuntimeEnvPath
const messengerPublicOrigin = (runtimeEnv.MESSENGER_PUBLIC_ORIGIN || 'https://messenger.example.com').replace(/\/$/, '')
const messengerCoreBaseUrl = runtimeEnv.NUXT_PUBLIC_MESSENGER_CORE_BASE_URL || `${messengerPublicOrigin}/api`
const messengerAppBaseUrl = runtimeEnv.NUXT_APP_BASE_URL || '/'

module.exports = {
  apps: [
    {
      name: runtimeEnv.MESSENGER_PM2_CORE_NAME || 'daria-messenger-core',
      cwd: `${messengerDeployRoot}/core`,
      script: 'node',
      args: '--experimental-strip-types src/index.ts',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        MESSENGER_CORE_HOST: '0.0.0.0',
        MESSENGER_CORE_PORT: runtimeEnv.MESSENGER_CORE_PORT || '4300',
        MESSENGER_CORE_LOG_LEVEL: runtimeEnv.MESSENGER_CORE_LOG_LEVEL || 'info',
        MESSENGER_CORE_AUTH_SECRET: runtimeEnv.MESSENGER_CORE_AUTH_SECRET || 'change-me-before-production',
        MESSENGER_CORE_CORS_ORIGIN: runtimeEnv.MESSENGER_CORE_CORS_ORIGIN || messengerPublicOrigin,
        MESSENGER_CORE_DATA_DIR: messengerDataRoot,
        MESSENGER_PROJECT_ROOT: messengerProjectRoot,
        KLIPY_APP_KEY: runtimeEnv.KLIPY_APP_KEY || '',
        KLIPY_API_BASE_URL: runtimeEnv.KLIPY_API_BASE_URL || 'https://api.klipy.com',
      },
    },
    {
      name: runtimeEnv.MESSENGER_PM2_WEB_NAME || 'daria-messenger-web',
      cwd: `${messengerDeployRoot}/web`,
      script: 'node',
      args: '.output/server/index.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        NUXT_PUBLIC_MESSENGER_CORE_BASE_URL: messengerCoreBaseUrl,
        NUXT_PUBLIC_MESSENGER_PROJECT_ROOT: messengerProjectRoot,
        NUXT_APP_BASE_URL: messengerAppBaseUrl,
        PORT: runtimeEnv.PORT || '3300',
        HOST: runtimeEnv.HOST || '0.0.0.0',
      },
    },
  ],
}