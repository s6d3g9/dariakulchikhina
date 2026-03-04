// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },

  srcDir: './app',

  modules: ['@nuxt/ui', '@pinia/nuxt'],

  ui: {
    fonts: false,
  },

  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
      ],
    },
  },

  colorMode: {
    preference: 'light',
    fallback: 'light',
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Server-only (private)
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    sessionSecret: process.env.NUXT_SESSION_SECRET,
    // AI: Gemma 3 27B через Ollama (можно переопределить через GEMMA_URL в .env)
    gemmaUrl: process.env.GEMMA_URL || 'http://localhost:11434',
    // Public
    public: {
      appName: 'Daria Kulchikhina',
      yandexMapsApiKey: process.env.YANDEX_MAPS_API_KEY,
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
  },

  imports: {
    collectMeta: false,
  },

  hooks: {
    // Nuxt 4 auto-scans the entire shared/ folder (new vs Nuxt 3 default).
    // shared/types/*.ts use Record<string,…> type annotations; unimport
    // incorrectly registers the TS built-in "string" as a named auto-import,
    // producing "Duplicated imports" warnings. Fix: prune shared/types dirs.
    'imports:dirs'(dirs) {
      for (let i = dirs.length - 1; i >= 0; i--) {
        if ((dirs[i] ?? '').replace(/\\/g, '/').includes('shared/types')) {
          dirs.splice(i, 1)
        }
      }
    },
  },

  typescript: {
    strict: true,
    shim: false,
  },

  sourcemap: { server: false, client: false },

  vite: {
    build: {
      sourcemap: false,
    },
  },
})
