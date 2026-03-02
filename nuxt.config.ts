// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },

  modules: ['@nuxt/ui', '@pinia/nuxt'],

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-only (private)
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    sessionSecret: process.env.NUXT_SESSION_SECRET,
    // Public
    public: {
      appName: 'Daria Kulchikhina',
    },
  },

  alias: {
    '~/shared': `${process.cwd()}/shared`,
  },

  nitro: {
    experimental: { websocket: true },
    // Server and shared folders are at repo root
    alias: {
      '~/server': `${process.cwd()}/server`,
      '~/shared': `${process.cwd()}/shared`,
    },
    // Global error handler — hide internal details in production
    errorHandler: '~/server/utils/error-handler.ts',
  },

  imports: {
    // Prevent Nuxt auto-import scanner from picking up generic type
    // tokens like "string" from large Record<string,string> signatures
    collectMeta: false,
  },

  typescript: {
    strict: true,
    shim: false,
  },
})
