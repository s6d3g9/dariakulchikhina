import { computed, watch, type Ref } from 'vue'

type ClientSummary = {
  id: number
  name: string
  phone: string | null
  email: string | null
}

type ContractorSummary = {
  id: number
  name: string
  role: string | null
}

type SellerSummary = {
  id: number
  name?: string | null
  companyName?: string | null
  phone?: string | null
  email?: string | null
  city?: string | null
  projects?: unknown[]
}

type ManagerSummary = {
  id: number
  name?: string | null
  role?: string | null
  phone?: string | null
  email?: string | null
  telegram?: string | null
  projects?: unknown[]
}

type GalleryItem = {
  id: number
  title?: string | null
  name?: string | null
  image?: string | null
  category?: string | null
  description?: string | null
  tags?: string[] | null
  featured?: boolean | null
}

type LinkedData = {
  sellers: SellerSummary[]
  managers: ManagerSummary[]
  gallery: GalleryItem[]
  moodboards: GalleryItem[]
}

type DesignerProjectSummary = {
  clients?: ClientSummary[]
  contractors?: ContractorSummary[]
}

type UseDesignerCabinetRelationsViewOptions = {
  designerId: Ref<number>
  designer: Ref<{ city?: string | null } | null | undefined>
  designerProjects: Ref<DesignerProjectSummary[]>
  profilePct: Ref<number>
  dashStats: Ref<{ active: number }>
  services: Ref<Array<unknown>>
  isBrutalistDesignerCabinetMode: Ref<boolean>
  section: Ref<string>
}

export function useDesignerCabinetRelationsView(options: UseDesignerCabinetRelationsViewOptions) {
  const { data: linkedData } = useFetch<LinkedData>(
    () => `/api/designers/${options.designerId.value}/linked-entities`,
    { default: () => ({ sellers: [], managers: [], gallery: [], moodboards: [] }), watch: [options.designerId] },
  )

  const showBrutalistDashboardHero = computed(() => (
    options.isBrutalistDesignerCabinetMode.value && options.section.value === 'dashboard'
  ))

  const designerHeroSubtitle = computed(() => {
    const city = options.designer.value?.city ? ` · ${options.designer.value.city}` : ''
    return `дизайнер интерьеров${city}`
  })

  const uniqueClients = computed(() => {
    const map = new Map<number, ClientSummary>()
    for (const project of options.designerProjects.value) {
      for (const client of (project.clients || [])) {
        if (!map.has(client.id)) map.set(client.id, client)
      }
    }
    return [...map.values()]
  })

  const uniqueContractors = computed(() => {
    const map = new Map<number, ContractorSummary>()
    for (const project of options.designerProjects.value) {
      for (const contractor of (project.contractors || [])) {
        if (!map.has(contractor.id)) map.set(contractor.id, contractor)
      }
    }
    return [...map.values()]
  })

  const designerDashboardFacts = computed(() => [
    { label: 'профиль', value: `${options.profilePct.value}%` },
    { label: 'активные проекты', value: String(options.dashStats.value.active) },
    { label: 'клиенты', value: String(uniqueClients.value.length) },
    { label: 'услуги', value: String(options.services.value.length) },
  ])

  const galleryList = computed(() => linkedData.value?.gallery || [])
  const moodboardList = computed(() => linkedData.value?.moodboards || [])

  function pluralProjects(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) return 'проект'
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'проекта'
    return 'проектов'
  }

  const { drillToEntityCabinet, setCabinetCounts } = useAdminNav()

  function goToClient(id: number, name?: string) {
    drillToEntityCabinet('clients', id, name)
  }

  function goToContractor(id: number, name?: string) {
    drillToEntityCabinet('contractors', id, name)
  }

  function goToSeller(id: number, name?: string) {
    drillToEntityCabinet('sellers', id, name)
  }

  function goToManager(id: number, name?: string) {
    drillToEntityCabinet('managers', id, name)
  }

  watch([options.designerProjects, linkedData], () => {
    setCabinetCounts({
      des_projects: options.designerProjects.value.length,
      des_clients: uniqueClients.value.length,
      des_contractors: uniqueContractors.value.length,
      des_sellers: linkedData.value?.sellers?.length ?? 0,
      des_managers: linkedData.value?.managers?.length ?? 0,
      des_gallery: galleryList.value.length,
      des_moodboards: moodboardList.value.length,
    })
  }, { immediate: true })

  return {
    linkedData,
    showBrutalistDashboardHero,
    designerHeroSubtitle,
    designerDashboardFacts,
    uniqueClients,
    uniqueContractors,
    galleryList,
    moodboardList,
    pluralProjects,
    goToClient,
    goToContractor,
    goToSeller,
    goToManager,
  }
}