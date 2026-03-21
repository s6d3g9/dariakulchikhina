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
        GIPHY_API_KEY: process.env.GIPHY_API_KEY || '',
        GIPHY_API_BASE_URL: process.env.GIPHY_API_BASE_URL || 'https://api.giphy.com/v1',
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