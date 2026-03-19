export default defineNuxtConfig({
  compatibilityDate: '2026-03-19',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@pinia/nuxt'],
  ssr: false,
  app: {
    head: {
      title: 'Daria Messenger',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      messengerCoreBaseUrl: process.env.NUXT_PUBLIC_MESSENGER_CORE_BASE_URL || 'http://localhost:4300',
    },
  },
})