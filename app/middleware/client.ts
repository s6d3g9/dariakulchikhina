export default defineNuxtRouteMiddleware(async () => {
  const { data } = await useFetch('/api/auth/me')
  if (data.value?.role !== 'client') {
    return navigateTo('/client/login')
  }
})
