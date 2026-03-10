export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin/projects/')) return

  const projectParam = Array.isArray(to.params.slug) ? to.params.slug[0] : String(to.params.slug || '')
  if (!/^\d+$/.test(projectParam)) return

  const headers = process.server ? useRequestHeaders(['cookie']) : undefined

  try {
    const project = await $fetch<{ slug: string }>(`/api/projects/by-id/${projectParam}`, { headers })
    return navigateTo({
      path: `/admin/projects/${project.slug}`,
      query: to.query,
      hash: to.hash,
    }, {
      redirectCode: 301,
      replace: true,
    })
  } catch {
    return navigateTo('/admin/login')
  }
})
