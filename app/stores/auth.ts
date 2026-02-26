import { defineStore } from 'pinia'

interface AuthState {
  admin: boolean
  adminName: string | null
  clientSlug: string | null
  contractorId: number | null
  loaded: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    admin: false,
    adminName: null,
    clientSlug: null,
    contractorId: null,
    loaded: false
  }),
  actions: {
    async fetchMe() {
      try {
        const data = await $fetch<any>('/api/auth/me')
        this.admin = !!data.admin
        this.adminName = data.adminName || null
        this.clientSlug = data.clientSlug || null
        this.contractorId = data.contractorId || null
      } catch {
        this.admin = false
        this.clientSlug = null
        this.contractorId = null
      }
      this.loaded = true
    },
    clear() {
      this.admin = false
      this.adminName = null
      this.clientSlug = null
      this.contractorId = null
      this.loaded = false
    }
  }
})