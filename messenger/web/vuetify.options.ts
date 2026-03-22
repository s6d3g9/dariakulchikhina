import { defineVuetifyConfiguration } from 'vuetify-nuxt-module/custom-configuration'

export default defineVuetifyConfiguration({
  theme: {
    defaultTheme: 'messengerDark',
    themes: {
      messengerDark: {
        dark: true,
        colors: {
          background: '#09111f',
          surface: '#111b2d',
          'surface-bright': '#18253a',
          'surface-light': '#21324b',
          'surface-variant': '#243753',
          primary: '#99b6ff',
          secondary: '#b9c8ff',
          success: '#7bd9a3',
          error: '#ffb4ab',
          info: '#9dd5ff',
          warning: '#ffd08a',
          'on-background': '#f5f7fb',
          'on-surface': '#f5f7fb',
          'on-surface-variant': '#c8d2e5',
        },
      },
      messengerLight: {
        dark: false,
        colors: {
          background: '#f3f5f8',
          surface: '#ffffff',
          'surface-bright': '#ffffff',
          'surface-light': '#eef2f7',
          'surface-variant': '#dde4ee',
          primary: '#4f6f96',
          secondary: '#6d7f9b',
          success: '#3c7f5a',
          error: '#b44c4c',
          info: '#527aa3',
          warning: '#a66a23',
          'on-background': '#19212b',
          'on-surface': '#19212b',
          'on-surface-variant': '#536173',
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
    sets: ['mdi'],
  },
  defaults: {
    VCard: {
      rounded: 'xl',
      elevation: 12,
    },
    VTextField: {
      variant: 'solo-filled',
      density: 'comfortable',
      color: 'primary',
      hideDetails: 'auto',
    },
    VTextarea: {
      variant: 'solo-filled',
      density: 'comfortable',
      color: 'primary',
      hideDetails: 'auto',
    },
    VBtn: {
      color: 'primary',
      rounded: 'xl',
      size: 'large',
      variant: 'flat',
    },
    VAlert: {
      variant: 'tonal',
      density: 'comfortable',
    },
  },
})