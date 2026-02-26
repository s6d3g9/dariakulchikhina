export default defineNuxtRouteMiddleware(async () => {
  const { data } = await useFetch('/api/auth/me')
  if (!data.value?.contractorId) {
    return navigateTo('/contractor/login')
  }
})