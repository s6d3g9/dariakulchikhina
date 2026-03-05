/**
 * useAuthStore — глобальный Pinia-стор для управления сессией.
 *
 * Роли:
 *   'designer' — администратор / дизайнер (admin-сессия на сервере)
 *   'client'   — заказчик / клиент
 *   'contractor' — подрядчик
 *
 * Использование:
 *   const auth = useAuthStore()
 *   await auth.fetchMe()         // загрузить текущую сессию с сервера
 *   await auth.login(password)   // логин администратора
 *   auth.isLoggedIn              // boolean
 */
import { defineStore } from 'pinia'

type Role = 'designer' | 'client' | 'contractor' | null

interface AuthState {
  role: Role
  userId: number | null
  name: string | null
  email: string | null
  contractorId: number | null
  projectSlug: string | null
  /** true после первого успешного fetchMe() — используем как guard для SSR */
  loaded: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    role: null,
    userId: null,
    name: null,
    email: null,
    contractorId: null,
    projectSlug: null,
    loaded: false,
  }),

  getters: {
    isLoggedIn: (s): boolean => s.role !== null,
    isDesigner: (s): boolean => s.role === 'designer',
    /** Обратная совместимость — TZ называет роль 'admin' */
    isAdmin: (s): boolean => s.role === 'designer',
    isClient: (s): boolean => s.role === 'client',
    isContractor: (s): boolean => s.role === 'contractor',
  },

  actions: {
    /** Загрузить текущую сессию с сервера (/api/auth/me). Никогда не бросает. */
    async fetchMe() {
      try {
        const data = await $fetch<{
          role: Role
          id?: number
          name?: string
          email?: string
          contractorId?: number
          projectSlug?: string
        }>('/api/auth/me')

        this.role        = data.role ?? null
        this.userId      = data.id       ?? null
        this.name        = data.name     ?? null
        this.email       = data.email    ?? null
        this.contractorId = data.contractorId ?? null
        this.projectSlug = data.projectSlug   ?? null
      } catch {
        this.$reset()
      } finally {
        this.loaded = true
      }
    },

    /** Логин администратора/дизайнера. Бросает ошибку при неверном пароле. */
    async login(password: string) {
      await $fetch('/api/auth/login', {
        method: 'POST',
        body: { password },
      })
      await this.fetchMe()
    },

    /** Логин клиента по slug проекта + паролю. */
    async loginClient(projectSlug: string, password?: string) {
      await $fetch('/api/auth/client-login', {
        method: 'POST',
        body: { projectSlug, password },
      })
      await this.fetchMe()
    },

    /** Логин подрядчика по id + slug проекта. */
    async loginContractor(contractorId: number, projectSlug: string) {
      await $fetch('/api/auth/contractor-login', {
        method: 'POST',
        body: { contractorId, projectSlug },
      })
      await this.fetchMe()
    },

    /** Выход из любой сессии. */
    async logout() {
      try {
        const endpoint = this.role === 'contractor'
          ? '/api/auth/contractor-logout'
          : this.role === 'client'
            ? '/api/auth/client-id-logout'
            : '/api/auth/logout'
        await $fetch(endpoint, { method: 'POST' })
      } catch { /* ignore — cookie уже протухнет */ }
      this.$reset()
      this.loaded = true
    },
  },
})
