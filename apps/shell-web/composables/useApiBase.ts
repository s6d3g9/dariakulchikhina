declare global {
  interface Window {
    __SHELL_API_BASE__?: string
  }
}

export const useApiBase = (): string =>
  window.__SHELL_API_BASE__ ?? useRuntimeConfig().public.apiBase
