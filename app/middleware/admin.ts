export default defineNuxtRouteMiddleware(async () => {
  const { data } = await useFetch('/api/auth/me')
  if (!data.value?.admin) {
    return navigateTo('/admin/login')
  }
})