type AdminCatalogKey = 'projects' | 'clients' | 'contractors' | 'designers' | 'sellers' | 'managers'

const ADMIN_CATALOG_ENDPOINTS: Record<AdminCatalogKey, string> = {
  projects: '/api/projects',
  clients: '/api/clients',
  contractors: '/api/contractors',
  designers: '/api/designers',
  sellers: '/api/sellers',
  managers: '/api/managers',
}

export function useAdminCatalogs() {
  const items = useState<Record<AdminCatalogKey, any[]>>('admin-catalogs-items', () => ({
    projects: [],
    clients: [],
    contractors: [],
    designers: [],
    sellers: [],
    managers: [],
  }))
  const loaded = useState<Record<AdminCatalogKey, boolean>>('admin-catalogs-loaded', () => ({
    projects: false,
    clients: false,
    contractors: false,
    designers: false,
    sellers: false,
    managers: false,
  }))
  const loading = useState<Record<AdminCatalogKey, boolean>>('admin-catalogs-loading', () => ({
    projects: false,
    clients: false,
    contractors: false,
    designers: false,
    sellers: false,
    managers: false,
  }))

  async function ensureCatalog(key: AdminCatalogKey, force = false) {
    if (loading.value[key]) {
      return items.value[key]
    }
    if (!force && loaded.value[key]) {
      return items.value[key]
    }

    loading.value = { ...loading.value, [key]: true }
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const rows = await $fetch<any[]>(ADMIN_CATALOG_ENDPOINTS[key], { headers })
      items.value = { ...items.value, [key]: Array.isArray(rows) ? rows : [] }
      loaded.value = { ...loaded.value, [key]: true }
      return items.value[key]
    } finally {
      loading.value = { ...loading.value, [key]: false }
    }
  }

  function getCatalog(key: AdminCatalogKey) {
    return computed(() => items.value[key])
  }

  function isCatalogLoaded(key: AdminCatalogKey) {
    return computed(() => loaded.value[key])
  }

  function isCatalogLoading(key: AdminCatalogKey) {
    return computed(() => loading.value[key])
  }

  return {
    ensureCatalog,
    getCatalog,
    isCatalogLoaded,
    isCatalogLoading,
  }
}