export default defineNuxtRouteMiddleware(async () => {
  try {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const data = await $fetch<{ role?: string }>('/api/auth/me', { headers })

    if (data?.role !== 'designer_lk' && data?.role !== 'designer') {
      return navigateTo('/designer/login')
    }
  } catch {
    return navigateTo('/designer/login')
  }
})
