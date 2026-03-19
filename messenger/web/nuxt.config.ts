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
        { name: 'theme-color', content: '#09111f' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Daria Messenger' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icons/messenger-app.svg' },
        { rel: 'apple-touch-icon', href: '/icons/messenger-app-512.svg' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      messengerCoreBaseUrl: process.env.NUXT_PUBLIC_MESSENGER_CORE_BASE_URL || 'http://localhost:4300',
    },
  },
})