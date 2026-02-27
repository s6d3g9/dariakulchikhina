export default defineNuxtRouteMiddleware(async () => {
  const headers = process.server ? useRequestHeaders(['cookie']) : undefined
  const { data } = await useFetch('/api/auth/me', { headers })

  if (data.value?.role !== 'designer') {
    return navigateTo('/admin/login')
  }
})
