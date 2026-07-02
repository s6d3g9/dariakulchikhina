export default defineNuxtConfig({
  ssr: false,
  app: {
    baseURL: '/shell/',
  },
  runtimeConfig: {
    public: {
      apiBase: '/refactor/api',
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
