export default defineNuxtRouteMiddleware(async () => {
  const headers = process.server ? useRequestHeaders(['cookie']) : undefined
  const { data } = await useFetch('/api/auth/me', { headers })
  if (data.value?.role !== 'client' && data.value?.role !== 'designer') {
    return navigateTo('/client/brief-login')
  }
  // Must have clientId session (not just project session)
  if (data.value?.role === 'client' && !data.value?.clientId) {
    return navigateTo('/client/brief-login')
  }
})
