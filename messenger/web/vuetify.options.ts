import { defineVuetifyConfiguration } from 'vuetify-nuxt-module/custom-configuration'

import { messengerVuetifyThemes } from './theme/messengerColorSchemes'

export default defineVuetifyConfiguration({
  theme: {
    defaultTheme: 'messengerBaselineLight',
    themes: messengerVuetifyThemes,
  },
  icons: {
    defaultSet: 'mdi',
    sets: ['mdi'],
  },
  defaults: {
    VCard: {
      rounded: 'lg',
      elevation: 0,
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
      hideDetails: 'auto',
    },
    VBtn: {
      rounded: 'xl',
      variant: 'text',
    },
    VAlert: {
      variant: 'tonal',
      density: 'comfortable',
    },
  },
})