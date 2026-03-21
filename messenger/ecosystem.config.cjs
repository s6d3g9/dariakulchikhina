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

const runtimeEnv = {
  ...readRuntimeEnv('/opt/daria-messenger-data/messenger-runtime.env'),
  ...process.env,
}

module.exports = {
  apps: [
    {
      name: 'daria-messenger-core',
      cwd: '/opt/daria-nuxt/messenger/core',
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
        MESSENGER_CORE_CORS_ORIGIN: 'https://dariakulchikhina.com',
        MESSENGER_CORE_DATA_DIR: '/opt/daria-messenger-data',
        KLIPY_APP_KEY: runtimeEnv.KLIPY_APP_KEY || '',
        KLIPY_API_BASE_URL: runtimeEnv.KLIPY_API_BASE_URL || 'https://api.klipy.com',
      },
    },
    {
      name: 'daria-messenger-web',
      cwd: '/opt/daria-nuxt/messenger/web',
      script: 'node',
      args: '.output/server/index.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        NUXT_PUBLIC_MESSENGER_CORE_BASE_URL: 'https://dariakulchikhina.com/messenger-api',
        NUXT_APP_BASE_URL: '/messenger/',
        PORT: '3300',
        HOST: '0.0.0.0',
      },
    },
  ],
}