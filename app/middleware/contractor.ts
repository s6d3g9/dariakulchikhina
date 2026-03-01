export default defineNuxtRouteMiddleware(async () => {
  try {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const data = await $fetch<{ role?: string }>('/api/auth/me', { headers })

    if (data?.role !== 'contractor' && data?.role !== 'designer' && data?.role !== 'admin') {
      return navigateTo('/admin')
    }
  } catch {
    return navigateTo('/admin')
  }
})