import { fileURLToPath, URL } from 'node:url'

const dariaPackagesPath = fileURLToPath(new URL('../../packages', import.meta.url))

export default defineNuxtConfig({
  ssr: false,
  alias: {
    '@daria': dariaPackagesPath,
  },
  app: {
    baseURL: '/shell/',
  },
  runtimeConfig: {
    public: {
      apiBase: '/refactor/api',
    },
  },
  vite: {
    esbuild: {
      tsconfigRaw: JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          moduleResolution: 'Bundler',
          target: 'ESNext',
          resolveJsonModule: true,
          useDefineForClassFields: true,
        },
      }),
    },
    resolve: {
      alias: {
        '@daria': dariaPackagesPath,
      },
    },
  },
  nitro: {
    devProxy: {
      '/refactor/api': {
        target: 'https://m.oxoxoxo.online/refactor/api',
        changeOrigin: true,
      },
    },
  },
})
