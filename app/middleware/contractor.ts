interface ContractorAuthPayload {
  role?: string | null
  contractorId?: number | null
}

export default defineNuxtRouteMiddleware(async (to) => {
  try {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const data = await $fetch<ContractorAuthPayload>('/api/auth/me', { headers })

    if (data?.role !== 'contractor' && data?.role !== 'designer' && data?.role !== 'admin') {
      return navigateTo('/contractor/login')
    }

    if (data?.role === 'contractor' && data.contractorId) {
      const routeContractorId = Number(to.params.id)
      if (Number.isFinite(routeContractorId) && routeContractorId !== data.contractorId) {
        return navigateTo(`/contractor/${data.contractorId}`)
      }
    }
  } catch {
    return navigateTo('/contractor/login')
  }
})