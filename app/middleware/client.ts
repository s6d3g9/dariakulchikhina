export default defineNuxtRouteMiddleware(async () => {
  const { data } = await useFetch('/api/auth/me')
  if (!data.value?.clientSlug) {
    return navigateTo('/client/login')
  }
})