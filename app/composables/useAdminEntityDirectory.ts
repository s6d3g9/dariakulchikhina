type AdminDirectoryKey = 'designers' | 'sellers' | 'managers'

const ADMIN_DIRECTORY_ENDPOINTS: Record<AdminDirectoryKey, string> = {
  designers: '/api/designers',
  sellers: '/api/sellers',
  managers: '/api/managers',
}

export function useAdminEntityDirectory<TItem extends { id: number }>(key: AdminDirectoryKey) {
  const adminCatalogs = useAdminCatalogs()
  const items = adminCatalogs.getCatalog(key)
  const pending = adminCatalogs.isCatalogLoading(key)

  async function ensureLoaded(force = false) {
    return await adminCatalogs.ensureCatalog(key, force)
  }

  async function createItem(payload: Record<string, unknown>) {
    const created = await $fetch<TItem>(ADMIN_DIRECTORY_ENDPOINTS[key], {
      method: 'POST',
      body: payload,
    })
    await ensureLoaded(true)
    return created
  }

  async function updateItem(id: number, payload: Record<string, unknown>) {
    const updated = await $fetch<TItem>(`${ADMIN_DIRECTORY_ENDPOINTS[key]}/${id}`, {
      method: 'PUT',
      body: payload,
    })
    await ensureLoaded(true)
    return updated
  }

  async function deleteItem(id: number) {
    await $fetch(`${ADMIN_DIRECTORY_ENDPOINTS[key]}/${id}`, {
      method: 'DELETE',
    })
    await ensureLoaded(true)
  }

  function findById(id: number | null | undefined) {
    return items.value.find((item) => item.id === id) as TItem | undefined
  }

  return {
    items,
    pending,
    ensureLoaded,
    createItem,
    updateItem,
    deleteItem,
    findById,
  }
}