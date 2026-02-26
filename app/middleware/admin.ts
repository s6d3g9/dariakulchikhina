export default defineNuxtRouteMiddleware(async () => {
  const { data } = await useFetch('/api/auth/me')
  if (data.value?.role !== 'designer') {
    return navigateTo('/admin/login')
  }
})
