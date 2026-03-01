export default defineNuxtRouteMiddleware(async () => {
  try {
    const headers = process.server ? useRequestHeaders(['cookie']) : undefined
    const data = await $fetch<{ role?: string }>('/api/auth/me', { headers })
    if (data?.role !== 'designer') {
      return navigateTo('/admin/login')
    }
  } catch {
    return navigateTo('/admin/login')
  }
})
