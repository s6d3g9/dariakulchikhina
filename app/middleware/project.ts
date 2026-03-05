export default defineNuxtRouteMiddleware(async (to) => {
  try {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const data = await $fetch<{ role?: string; projectSlug?: string }>('/api/auth/me', { headers })

    // Admins can access all project pages (preview mode)
    if (data?.role === 'designer' || data?.role === 'admin') return

    // Valid client session
    if (data?.role === 'client') {
      // If the route has a [slug], verify it matches the session
      const routeSlug = to.params.slug as string | undefined
      if (routeSlug && data.projectSlug && data.projectSlug !== routeSlug) {
        return navigateTo('/project/login')
      }
      return
    }

    return navigateTo('/project/login')
  } catch {
    return navigateTo('/project/login')
  }
})
