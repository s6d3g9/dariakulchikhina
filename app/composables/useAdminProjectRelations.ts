type ProjectRelationCatalogKey = 'clients' | 'contractors' | 'designers' | 'sellers' | 'managers'

const relationCatalogByProjectPage: Partial<Record<string, ProjectRelationCatalogKey>> = {
  project_clients: 'clients',
  project_contractors: 'contractors',
  project_designers: 'designers',
  project_sellers: 'sellers',
  project_managers: 'managers',
}

function emptyProjectRelations() {
  return {
    linked: {
      clients: [],
      contractors: [],
      designers: [],
      sellers: [],
      managers: [],
    },
    summary: {
      clients: 0,
      contractors: 0,
      designers: 0,
      sellers: 0,
      managers: 0,
    },
  }
}

function clearLater(target: Ref<string>, timeout = 3000) {
  setTimeout(() => {
    target.value = ''
  }, timeout)
}

export function useAdminProjectRelations(options: {
  projectSlug: Ref<string>
  currentProjectPage: Ref<string>
  clientPreviewMode: Ref<boolean>
  refreshProject?: () => Promise<unknown>
}) {
  const adminCatalogs = useAdminCatalogs()
  const { data: projectRelationsData, refresh: refreshProjectRelations } = useFetch<any>(
    () => options.projectSlug.value ? `/api/projects/${options.projectSlug.value}/relations` : null,
    { default: emptyProjectRelations },
  )

  const selectedClientId = ref('')
  const linkingClient = ref(false)
  const clientLinkError = ref('')
  const clientLinkSuccess = ref('')

  const contractorLinkError = ref('')
  const contractorLinkSuccess = ref('')

  const linkingDesigner = ref(false)
  const designerLinkError = ref('')
  const designerLinkSuccess = ref('')

  const linkingSeller = ref(false)
  const sellerLinkError = ref('')
  const sellerLinkSuccess = ref('')

  const projectRelations = computed(() => projectRelationsData.value || emptyProjectRelations())

  const clients = adminCatalogs.getCatalog('clients')
  const allContractors = adminCatalogs.getCatalog('contractors')
  const allDesigners = adminCatalogs.getCatalog('designers')
  const allSellers = adminCatalogs.getCatalog('sellers')
  const allManagers = adminCatalogs.getCatalog('managers')

  const linkedClients = computed(() => projectRelations.value.linked.clients || [])
  const linkedClientIds = computed(() => linkedClients.value.map((client: any) => String(client.id)))

  const linkedContractorsList = computed(() => projectRelations.value.linked.contractors || [])
  const linkedContractorIds = computed(() => new Set(linkedContractorsList.value.map((contractor: any) => String(contractor.id))))

  const linkedDesignersList = computed(() => projectRelations.value.linked.designers || [])
  const linkedDesignerIds = computed(() => new Set(linkedDesignersList.value.map((designer: any) => String(designer.id))))

  const linkedSellersList = computed(() => projectRelations.value.linked.sellers || [])
  const linkedSellerIds = computed(() => new Set(linkedSellersList.value.map((seller: any) => String(seller.id))))

  const linkedManagersList = computed(() => projectRelations.value.linked.managers || [])
  const linkedManagerIds = computed(() => new Set(linkedManagersList.value.map((manager: any) => String(manager.id))))

  const availableClientsForModal = computed(() => {
    const linkedSet = new Set(linkedClientIds.value)
    return clients.value.filter((client: any) => !linkedSet.has(String(client.id)))
  })

  const availableContractorsForModal = computed(() => {
    return allContractors.value.filter((contractor: any) => !linkedContractorIds.value.has(String(contractor.id)))
  })

  const availableDesignersForModal = computed(() => {
    return allDesigners.value.filter((designer: any) => !linkedDesignerIds.value.has(String(designer.id)))
  })

  const availableSellersForProject = computed(() => {
    return allSellers.value.filter((seller: any) => !linkedSellerIds.value.has(String(seller.id)))
  })

  const availableManagersForProject = computed(() => {
    return allManagers.value.filter((manager: any) => !linkedManagerIds.value.has(String(manager.id)))
  })

  const projectFlashMessages = computed(() => [
    { key: 'client-error', tone: 'error', text: clientLinkError.value },
    { key: 'client-success', tone: 'success', text: clientLinkSuccess.value },
    { key: 'contractor-error', tone: 'error', text: contractorLinkError.value },
    { key: 'contractor-success', tone: 'success', text: contractorLinkSuccess.value },
    { key: 'designer-error', tone: 'error', text: designerLinkError.value },
    { key: 'designer-success', tone: 'success', text: designerLinkSuccess.value },
    { key: 'seller-error', tone: 'error', text: sellerLinkError.value },
    { key: 'seller-success', tone: 'success', text: sellerLinkSuccess.value },
  ].filter((message): message is { key: string; tone: 'error' | 'success'; text: string } => Boolean(message.text)))

  async function refreshProjectAndRelations(includeProject = false) {
    const tasks: Promise<unknown>[] = [refreshProjectRelations()]
    if (includeProject && options.refreshProject) {
      tasks.push(options.refreshProject())
    }
    await Promise.all(tasks)
  }

  async function linkClientToProject() {
    if (!selectedClientId.value || linkingClient.value) {
      return
    }

    linkingClient.value = true
    clientLinkError.value = ''
    clientLinkSuccess.value = ''

    try {
      await $fetch(`/api/clients/${selectedClientId.value}/link-project`, {
        method: 'POST',
        body: { projectSlug: options.projectSlug.value },
      })
      await refreshProjectAndRelations(true)
      clientLinkSuccess.value = 'Клиент привязан к проекту'
    } catch (error: any) {
      clientLinkError.value = error?.data?.statusMessage || 'Не удалось привязать клиента'
    } finally {
      linkingClient.value = false
    }
  }

  async function linkClientFromModal(clientId: string) {
    clientLinkError.value = ''
    clientLinkSuccess.value = ''

    try {
      await $fetch(`/api/clients/${clientId}/link-project`, {
        method: 'POST',
        body: { projectSlug: options.projectSlug.value },
      })
      await refreshProjectAndRelations(true)
      clientLinkSuccess.value = 'Клиент привязан к проекту'
      clearLater(clientLinkSuccess)
    } catch (error: any) {
      clientLinkError.value = error?.data?.statusMessage || 'Не удалось привязать клиента'
    }
  }

  async function unlinkClientFromModal(clientId: string) {
    clientLinkError.value = ''
    clientLinkSuccess.value = ''

    try {
      await $fetch(`/api/clients/${clientId}/unlink-project`, {
        method: 'POST',
        body: { projectSlug: options.projectSlug.value },
      })
      await refreshProjectAndRelations(true)
      clientLinkSuccess.value = 'Клиент отвязан от проекта'
      clearLater(clientLinkSuccess, 2500)
    } catch (error: any) {
      clientLinkError.value = error?.data?.statusMessage || 'Не удалось отвязать клиента'
    }
  }

  async function linkContractorFromModal(contractorId: number) {
    contractorLinkError.value = ''
    contractorLinkSuccess.value = ''

    try {
      await $fetch(`/api/projects/${options.projectSlug.value}/contractors`, {
        method: 'POST',
        body: { contractorId },
      })
      await refreshProjectRelations()
      contractorLinkSuccess.value = 'Подрядчик привязан к проекту'
      clearLater(contractorLinkSuccess)
    } catch (error: any) {
      contractorLinkError.value = error?.data?.message || 'Не удалось привязать подрядчика'
    }
  }

  async function unlinkContractor(contractorId: number) {
    contractorLinkError.value = ''
    contractorLinkSuccess.value = ''

    try {
      await $fetch(`/api/projects/${options.projectSlug.value}/contractors`, {
        method: 'DELETE',
        body: { contractorId },
      })
      await refreshProjectRelations()
      contractorLinkSuccess.value = 'Подрядчик отвязан'
      clearLater(contractorLinkSuccess, 2500)
    } catch (error: any) {
      contractorLinkError.value = error?.data?.message || 'Не удалось отвязать подрядчика'
    }
  }

  async function linkDesignerFromModal(designerId: number) {
    if (linkingDesigner.value) {
      return
    }

    linkingDesigner.value = true
    designerLinkError.value = ''
    designerLinkSuccess.value = ''

    try {
      await $fetch(`/api/projects/${options.projectSlug.value}/designers`, {
        method: 'POST',
        body: { designerId },
      })
      await refreshProjectRelations()
      designerLinkSuccess.value = 'Дизайнер привязан к проекту'
      clearLater(designerLinkSuccess)
    } catch (error: any) {
      designerLinkError.value = error?.data?.message || 'Не удалось привязать дизайнера'
    } finally {
      linkingDesigner.value = false
    }
  }

  async function unlinkDesigner(designerId: number) {
    if (linkingDesigner.value) {
      return
    }

    linkingDesigner.value = true
    designerLinkError.value = ''
    designerLinkSuccess.value = ''

    try {
      await $fetch(`/api/projects/${options.projectSlug.value}/designers`, {
        method: 'DELETE',
        body: { designerId },
      })
      await refreshProjectRelations()
      designerLinkSuccess.value = 'Дизайнер отвязан'
      clearLater(designerLinkSuccess, 2500)
    } catch (error: any) {
      designerLinkError.value = error?.data?.message || 'Не удалось отвязать дизайнера'
    } finally {
      linkingDesigner.value = false
    }
  }

  async function linkSeller(sellerId: number) {
    if (linkingSeller.value) {
      return
    }

    linkingSeller.value = true
    sellerLinkError.value = ''
    sellerLinkSuccess.value = ''

    try {
      await $fetch(`/api/projects/${options.projectSlug.value}/sellers`, {
        method: 'POST',
        body: { sellerId },
      })
      await refreshProjectRelations()
      sellerLinkSuccess.value = 'Поставщик привязан к проекту'
      clearLater(sellerLinkSuccess)
    } catch (error: any) {
      sellerLinkError.value = error?.data?.message || 'Не удалось привязать поставщика'
    } finally {
      linkingSeller.value = false
    }
  }

  async function unlinkSeller(sellerId: number) {
    if (linkingSeller.value) {
      return
    }

    linkingSeller.value = true
    sellerLinkError.value = ''
    sellerLinkSuccess.value = ''

    try {
      await $fetch(`/api/projects/${options.projectSlug.value}/sellers`, {
        method: 'DELETE',
        body: { sellerId },
      })
      await refreshProjectRelations()
      sellerLinkSuccess.value = 'Поставщик отвязан от проекта'
      clearLater(sellerLinkSuccess, 2500)
    } catch (error: any) {
      sellerLinkError.value = error?.data?.message || 'Не удалось отвязать поставщика'
    } finally {
      linkingSeller.value = false
    }
  }

  watch(linkedClientIds, (ids) => {
    selectedClientId.value = ids[0] || ''
  }, { immediate: true })

  watch(
    [options.currentProjectPage, options.clientPreviewMode],
    ([page, isClientPreview]) => {
      if (isClientPreview) {
        void adminCatalogs.ensureCatalog('clients')
      }

      const catalogKey = relationCatalogByProjectPage[page]
      if (catalogKey) {
        void adminCatalogs.ensureCatalog(catalogKey)
      }
    },
    { immediate: true },
  )

  return {
    clients,
    selectedClientId,
    linkingClient,
    clientLinkError,
    clientLinkSuccess,
    contractorLinkError,
    contractorLinkSuccess,
    designerLinkError,
    designerLinkSuccess,
    sellerLinkError,
    sellerLinkSuccess,
    linkedClients,
    linkedContractorsList,
    linkedDesignersList,
    linkedSellersList,
    linkedManagersList,
    availableClientsForModal,
    availableContractorsForModal,
    availableDesignersForModal,
    availableSellersForProject,
    availableManagersForProject,
    projectFlashMessages,
    refreshProjectRelations,
    linkClientToProject,
    linkClientFromModal,
    unlinkClientFromModal,
    linkContractorFromModal,
    unlinkContractor,
    linkDesignerFromModal,
    unlinkDesigner,
    linkSeller,
    unlinkSeller,
  }
}