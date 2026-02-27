// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2024-11-01',

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

  nitro: {
    experimental: { websocket: true },
    // Fix: Nuxt 4 compat shifts ~ to app/, but server files live at root
    alias: {
      '~/server': `${process.cwd()}/server`,
      '~/shared': `${process.cwd()}/shared`,
    },
  },

  typescript: {
    strict: true,
    shim: false,
  },
})
