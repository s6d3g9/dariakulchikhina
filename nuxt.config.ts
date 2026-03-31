// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },

  modules: ['@nuxt/ui', '@pinia/nuxt'],

  ui: {
    fonts: false,
  },

  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Roboto:wght@400;500;700&display=swap' }
      ]
    },
  },

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
    communicationsServiceSecret: process.env.COMMUNICATIONS_SERVICE_SECRET,
    // AI: Gemma 3 27B через Ollama (можно переопределить через GEMMA_URL в .env)
    gemmaUrl: process.env.GEMMA_URL || 'http://localhost:11434',
    // Public
    public: {
      appName: 'Daria Kulchikhina',
      yandexMapsApiKey: process.env.YANDEX_MAPS_API_KEY,
      communicationsServiceUrl: process.env.NUXT_PUBLIC_COMMUNICATIONS_SERVICE_URL || 'http://localhost:4100',
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
    // Nitro maintains its own server-side unimport context and still scans
    // shared/types unless it is pruned separately.
    'nitro:config'(nitroConfig) {
      const pruneSharedTypes = (dirs?: (string | undefined)[] | (string | { glob?: string; types?: boolean } | undefined)[]) => {
        if (!dirs) {
          return
        }

        for (let i = dirs.length - 1; i >= 0; i--) {
          if (((dirs[i] as string | undefined) ?? '').replace(/\\/g, '/').includes('shared/types')) {
            dirs.splice(i, 1)
          }
        }
      }

      if (nitroConfig.imports && (nitroConfig.imports as unknown) !== false) {
        pruneSharedTypes((nitroConfig.imports as { dirs?: (string | undefined)[] }).dirs)
      }

      pruneSharedTypes(nitroConfig.scanDirs as (string | undefined)[] | undefined)
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
