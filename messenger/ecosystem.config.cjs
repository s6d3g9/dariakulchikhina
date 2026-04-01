const fs = require('node:fs')

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

const runtimeEnv = {
  ...readRuntimeEnv('/opt/daria-messenger-data/messenger-runtime.env'),
  ...process.env,
}

const messengerDeployRoot = runtimeEnv.MESSENGER_DEPLOY_ROOT || '/opt/daria-nuxt/messenger'
const messengerProjectRoot = runtimeEnv.MESSENGER_PROJECT_ROOT || '/opt/daria-nuxt'
const messengerDataRoot = runtimeEnv.MESSENGER_CORE_DATA_DIR || '/opt/daria-messenger-data'
const messengerRuntimeEnvPath = runtimeEnv.MESSENGER_RUNTIME_ENV_PATH || `${messengerDataRoot}/messenger-runtime.env`
const messengerPublicOrigin = (runtimeEnv.MESSENGER_PUBLIC_ORIGIN || 'https://dariakulchikhina.com').replace(/\/$/, '')
const messengerCoreBaseUrl = runtimeEnv.NUXT_PUBLIC_MESSENGER_CORE_BASE_URL || `${messengerPublicOrigin}/messenger-api`
const messengerAppBaseUrl = runtimeEnv.NUXT_APP_BASE_URL || '/messenger/'

const mergedRuntimeEnv = {
  ...readRuntimeEnv(messengerRuntimeEnvPath),
  ...runtimeEnv,
}
const messengerServerTranscriptionEnabled = resolveServerTranscriptionPublicFlag(mergedRuntimeEnv)
const liveKitApiUrl = mergedRuntimeEnv.LIVEKIT_API_URL || `${messengerPublicOrigin}/livekit/`
const liveKitApiKey = mergedRuntimeEnv.LIVEKIT_API_KEY || ''
const liveKitApiSecret = mergedRuntimeEnv.LIVEKIT_API_SECRET || ''

module.exports = {
  apps: [
    {
      name: 'daria-messenger-core',
      cwd: `${messengerDeployRoot}/core`,
      script: 'node',
      args: '--experimental-strip-types src/index.ts',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        MESSENGER_CORE_HOST: '0.0.0.0',
        MESSENGER_CORE_PORT: '4300',
        MESSENGER_CORE_LOG_LEVEL: 'info',
        MESSENGER_CORE_AUTH_SECRET: 'change-me-before-production',
        MESSENGER_CORE_CORS_ORIGIN: messengerPublicOrigin,
        MESSENGER_CORE_DATA_DIR: messengerDataRoot,
        MESSENGER_ENABLE_AGENTS: mergedRuntimeEnv.MESSENGER_ENABLE_AGENTS || 'true',
        MESSENGER_PROJECT_ROOT: messengerProjectRoot,
        MESSENGER_AGENT_API_BASE_URL: mergedRuntimeEnv.MESSENGER_AGENT_API_BASE_URL || 'https://api.openai.com',
        MESSENGER_AGENT_API_KEY: mergedRuntimeEnv.MESSENGER_AGENT_API_KEY || '',
        MESSENGER_AGENT_ALLOW_NO_KEY: mergedRuntimeEnv.MESSENGER_AGENT_ALLOW_NO_KEY || 'false',
        MESSENGER_AGENT_MODEL: mergedRuntimeEnv.MESSENGER_AGENT_MODEL || 'GPT-5.4',
        MESSENGER_AGENT_TIMEOUT_MS: mergedRuntimeEnv.MESSENGER_AGENT_TIMEOUT_MS || '45000',
        MESSENGER_AGENT_TEMPERATURE: mergedRuntimeEnv.MESSENGER_AGENT_TEMPERATURE || '0.35',
        MESSENGER_TRANSCRIPTION_ENABLED: mergedRuntimeEnv.MESSENGER_TRANSCRIPTION_ENABLED || 'false',
        MESSENGER_TRANSCRIPTION_API_KEY: mergedRuntimeEnv.MESSENGER_TRANSCRIPTION_API_KEY || '',
        MESSENGER_TRANSCRIPTION_ALLOW_NO_KEY: mergedRuntimeEnv.MESSENGER_TRANSCRIPTION_ALLOW_NO_KEY || 'false',
        MESSENGER_TRANSCRIPTION_API_BASE_URL: mergedRuntimeEnv.MESSENGER_TRANSCRIPTION_API_BASE_URL || 'https://api.groq.com/openai/v1',
        MESSENGER_TRANSCRIPTION_COMMAND: mergedRuntimeEnv.MESSENGER_TRANSCRIPTION_COMMAND || '',
        MESSENGER_TRANSCRIPTION_MODEL: mergedRuntimeEnv.MESSENGER_TRANSCRIPTION_MODEL || 'whisper-large-v3-turbo',
        MESSENGER_TRANSCRIPTION_LANGUAGE: mergedRuntimeEnv.MESSENGER_TRANSCRIPTION_LANGUAGE || 'ru',
        MESSENGER_TRANSCRIPTION_TIMEOUT_MS: mergedRuntimeEnv.MESSENGER_TRANSCRIPTION_TIMEOUT_MS || '20000',
        LIVEKIT_API_URL: liveKitApiUrl,
        LIVEKIT_API_KEY: liveKitApiKey,
        LIVEKIT_API_SECRET: liveKitApiSecret,
        GEMMA_URL: mergedRuntimeEnv.GEMMA_URL || '',
        OLLAMA_BASE_URL: mergedRuntimeEnv.OLLAMA_BASE_URL || '',
        KLIPY_APP_KEY: mergedRuntimeEnv.KLIPY_APP_KEY || '',
        KLIPY_API_BASE_URL: mergedRuntimeEnv.KLIPY_API_BASE_URL || 'https://api.klipy.com',
      },
    },
    {
      name: 'daria-messenger-web',
      cwd: `${messengerDeployRoot}/web`,
      script: 'node',
      args: '.output/server/index.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        NUXT_PUBLIC_MESSENGER_CORE_BASE_URL: messengerCoreBaseUrl,
        NUXT_PUBLIC_MESSENGER_ENABLE_AGENTS: mergedRuntimeEnv.NUXT_PUBLIC_MESSENGER_ENABLE_AGENTS || mergedRuntimeEnv.MESSENGER_ENABLE_AGENTS || 'true',
        NUXT_PUBLIC_MESSENGER_SERVER_TRANSCRIPTION_ENABLED: messengerServerTranscriptionEnabled,
        NUXT_PUBLIC_MESSENGER_PROJECT_ROOT: messengerProjectRoot,
        NUXT_APP_BASE_URL: messengerAppBaseUrl,
        PORT: '3300',
        HOST: '0.0.0.0',
      },
    },
  ],
}