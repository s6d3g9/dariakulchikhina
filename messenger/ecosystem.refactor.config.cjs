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

function resolveServerTranscriptionPublicFlag(env) {
  const explicitFlag = String(env.NUXT_PUBLIC_MESSENGER_SERVER_TRANSCRIPTION_ENABLED || '').trim().toLowerCase()
  if (explicitFlag) {
    return explicitFlag
  }

  const transcriptionEnabled = String(env.MESSENGER_TRANSCRIPTION_ENABLED || '').trim().toLowerCase() === 'true'
  const allowNoKey = String(env.MESSENGER_TRANSCRIPTION_ALLOW_NO_KEY || '').trim().toLowerCase() === 'true'
  const hasApiKey = Boolean(String(env.MESSENGER_TRANSCRIPTION_API_KEY || '').trim())
  const hasCommand = Boolean(String(env.MESSENGER_TRANSCRIPTION_COMMAND || '').trim())
  return transcriptionEnabled && (hasApiKey || allowNoKey || hasCommand) ? 'true' : 'false'
}

const baseEnv = {
  ...process.env,
}

const inferredDeployRoot = baseEnv.MESSENGER_DEPLOY_ROOT || '/opt/daria-nuxt-refactor/messenger'
const inferredDataRoot = baseEnv.MESSENGER_CORE_DATA_DIR
  || path.resolve(inferredDeployRoot, '../../daria-messenger-refactor-data')
const inferredRuntimeEnvPath = baseEnv.MESSENGER_RUNTIME_ENV_PATH || `${inferredDataRoot}/messenger-runtime.env`

const runtimeEnv = {
  ...readRuntimeEnv(inferredRuntimeEnvPath),
  ...baseEnv,
}

const messengerDeployRoot = runtimeEnv.MESSENGER_DEPLOY_ROOT || inferredDeployRoot
const messengerProjectRoot = runtimeEnv.MESSENGER_PROJECT_ROOT || '/opt/daria-nuxt-refactor'
const messengerDataRoot = runtimeEnv.MESSENGER_CORE_DATA_DIR || inferredDataRoot
const messengerPublicOrigin = (runtimeEnv.MESSENGER_PUBLIC_ORIGIN || 'http://152.53.176.165:3308').replace(/\/$/, '')
const messengerCoreBaseUrl = runtimeEnv.NUXT_PUBLIC_MESSENGER_CORE_BASE_URL || 'http://152.53.176.165:4318'
const messengerAppBaseUrl = runtimeEnv.NUXT_APP_BASE_URL || '/'
const messengerServerTranscriptionEnabled = resolveServerTranscriptionPublicFlag(runtimeEnv)

module.exports = {
  apps: [
    {
      name: runtimeEnv.MESSENGER_PM2_CORE_NAME || 'daria-messenger-core-refactor',
      cwd: `${messengerDeployRoot}/core`,
      script: 'node',
      args: '--experimental-strip-types src/index.ts',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        MESSENGER_CORE_HOST: '0.0.0.0',
        MESSENGER_CORE_PORT: runtimeEnv.MESSENGER_CORE_PORT || '4318',
        MESSENGER_CORE_LOG_LEVEL: runtimeEnv.MESSENGER_CORE_LOG_LEVEL || 'info',
        MESSENGER_CORE_AUTH_SECRET: runtimeEnv.MESSENGER_CORE_AUTH_SECRET || 'refactor-messenger-secret-change-me',
        MESSENGER_CORE_CORS_ORIGIN: runtimeEnv.MESSENGER_CORE_CORS_ORIGIN || messengerPublicOrigin,
        MESSENGER_CORE_DATA_DIR: messengerDataRoot,
        MESSENGER_ENABLE_AGENTS: runtimeEnv.MESSENGER_ENABLE_AGENTS || 'true',
        MESSENGER_PROJECT_ROOT: messengerProjectRoot,
        MESSENGER_AGENT_API_BASE_URL: runtimeEnv.MESSENGER_AGENT_API_BASE_URL || 'https://api.openai.com',
        MESSENGER_AGENT_API_KEY: runtimeEnv.MESSENGER_AGENT_API_KEY || '',
        MESSENGER_AGENT_ALLOW_NO_KEY: runtimeEnv.MESSENGER_AGENT_ALLOW_NO_KEY || 'false',
        MESSENGER_AGENT_MODEL: runtimeEnv.MESSENGER_AGENT_MODEL || 'GPT-5.4',
        MESSENGER_AGENT_TIMEOUT_MS: runtimeEnv.MESSENGER_AGENT_TIMEOUT_MS || '45000',
        MESSENGER_AGENT_TEMPERATURE: runtimeEnv.MESSENGER_AGENT_TEMPERATURE || '0.35',
        MESSENGER_TRANSCRIPTION_ENABLED: runtimeEnv.MESSENGER_TRANSCRIPTION_ENABLED || 'false',
        MESSENGER_TRANSCRIPTION_API_KEY: runtimeEnv.MESSENGER_TRANSCRIPTION_API_KEY || '',
        MESSENGER_TRANSCRIPTION_ALLOW_NO_KEY: runtimeEnv.MESSENGER_TRANSCRIPTION_ALLOW_NO_KEY || 'false',
        MESSENGER_TRANSCRIPTION_API_BASE_URL: runtimeEnv.MESSENGER_TRANSCRIPTION_API_BASE_URL || 'https://api.groq.com/openai/v1',
        MESSENGER_TRANSCRIPTION_COMMAND: runtimeEnv.MESSENGER_TRANSCRIPTION_COMMAND || '',
        MESSENGER_TRANSCRIPTION_MODEL: runtimeEnv.MESSENGER_TRANSCRIPTION_MODEL || 'whisper-large-v3-turbo',
        MESSENGER_TRANSCRIPTION_LANGUAGE: runtimeEnv.MESSENGER_TRANSCRIPTION_LANGUAGE || 'ru',
        MESSENGER_TRANSCRIPTION_TIMEOUT_MS: runtimeEnv.MESSENGER_TRANSCRIPTION_TIMEOUT_MS || '20000',
        GEMMA_URL: runtimeEnv.GEMMA_URL || '',
        OLLAMA_BASE_URL: runtimeEnv.OLLAMA_BASE_URL || '',
        KLIPY_APP_KEY: runtimeEnv.KLIPY_APP_KEY || '',
        KLIPY_API_BASE_URL: runtimeEnv.KLIPY_API_BASE_URL || 'https://api.klipy.com',
      },
    },
    {
      name: runtimeEnv.MESSENGER_PM2_WEB_NAME || 'daria-messenger-web-refactor',
      cwd: `${messengerDeployRoot}/web`,
      script: 'node',
      args: '.output/server/index.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        NUXT_PUBLIC_MESSENGER_CORE_BASE_URL: messengerCoreBaseUrl,
        NUXT_PUBLIC_MESSENGER_ENABLE_AGENTS: runtimeEnv.NUXT_PUBLIC_MESSENGER_ENABLE_AGENTS || runtimeEnv.MESSENGER_ENABLE_AGENTS || 'true',
        NUXT_PUBLIC_MESSENGER_SERVER_TRANSCRIPTION_ENABLED: messengerServerTranscriptionEnabled,
        NUXT_PUBLIC_MESSENGER_PROJECT_ROOT: runtimeEnv.NUXT_PUBLIC_MESSENGER_PROJECT_ROOT || messengerProjectRoot,
        NUXT_APP_BASE_URL: messengerAppBaseUrl,
        PORT: runtimeEnv.PORT || '3308',
        HOST: runtimeEnv.HOST || '0.0.0.0',
      },
    },
  ],
}