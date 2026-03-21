const appBaseUrl = process.env.NUXT_APP_BASE_URL || (process.env.NODE_ENV === 'production' ? '/messenger/' : '/')

export default defineNuxtConfig({
  compatibilityDate: '2026-03-19',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@pinia/nuxt'],
  ssr: false,
  app: {
    baseURL: appBaseUrl,
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
        { rel: 'manifest', href: `${appBaseUrl}manifest.webmanifest` },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: `${appBaseUrl}icons/messenger-app-192.png` },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: `${appBaseUrl}icons/messenger-app-512.png` },
        { rel: 'mask-icon', href: `${appBaseUrl}icons/messenger-app.svg`, color: '#09111f' },
        { rel: 'apple-touch-icon', href: `${appBaseUrl}icons/messenger-app-512.png` },
      ],
    },
  },
  runtimeConfig: {
    public: {
      messengerCoreBaseUrl: process.env.NUXT_PUBLIC_MESSENGER_CORE_BASE_URL || 'http://localhost:4300',
    },
  },
})