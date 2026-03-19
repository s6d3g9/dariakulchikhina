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
        MESSENGER_CORE_CORS_ORIGIN: 'http://152.53.176.165:3300',
        MESSENGER_CORE_DATA_DIR: '/opt/daria-messenger-data',
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
        NUXT_PUBLIC_MESSENGER_CORE_BASE_URL: 'http://152.53.176.165:4300',
        PORT: '3300',
        HOST: '0.0.0.0',
      },
    },
  ],
}