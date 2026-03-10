import {
  DESIGNER_SERVICE_TEMPLATES,
  DESIGNER_PACKAGE_TEMPLATES,
  DESIGNER_SUBSCRIPTION_TEMPLATES,
  PRICE_UNIT_LABELS,
  type DesignerServicePrice,
  type DesignerPackage,
  type DesignerSubscription,
  type DesignerServiceCategory,
  type DesignerProjectStatus,
} from '~~/shared/types/designer'

// ── Types ──────────────────────────────────────────────────────

interface DesignerProject {
  id: number
  designerId: number
  projectId: number
  packageKey: string | null
  pricePerSqm: number | null
  area: number | null
  totalPrice: number | null
  status: string
  notes: string | null
  createdAt: string
  projectSlug: string
  projectTitle: string
  projectStatus: string
  clients: { id: number; name: string; phone: string | null; email: string | null }[]
  contractors: { id: number; name: string; role: string | null }[]
}

interface UpdateDesignerProjectPayload {
  designerProjectId: number
  title?: string
  packageKey?: string | null
  pricePerSqm?: number | null
  area?: number | null
  totalPrice?: number | null
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  notes?: string | null
}

export function useDesignerCabinet(designerId: Ref<number | null>) {
  const did = computed(() => designerId.value)

  // ── Data fetching ──
  const { data: designer, pending, refresh } = useFetch<any>(
    () => did.value ? `/api/designers/${did.value}` : null as any,
    { watch: [did] },
  )

  const { data: allDesigners, refresh: refreshList } = useFetch<any[]>(
    '/api/designers',
    { default: () => [] },
  )

  const { data: allProjects } = useFetch<any[]>(
    '/api/projects',
    { default: () => [] },
  )

  const { data: allClients } = useFetch<any[]>(
    '/api/clients',
    { default: () => [] },
  )

  const { data: allContractors } = useFetch<any[]>(
    '/api/contractors',
    { default: () => [] },
  )

  // ── Section navigation ──
  const section = ref('dashboard')

  // Reset section when switching designers
  watch(did, () => { section.value = 'dashboard' })

  const nav = computed(() => {
    const items = [
      { key: 'dashboard',     icon: '◈', label: 'Обзор' },
      { key: 'availability',  icon: '◐', label: 'Загрузка' },
      { key: 'portfolio',     icon: '◧', label: 'Портфолио' },
      { key: 'regalia',       icon: '★', label: 'Регалии' },
      { key: 'services',      icon: '◎', label: 'Услуги и цены' },
      { key: 'packages',      icon: '◑', label: 'Пакеты' },
      { key: 'subscriptions', icon: '⟳', label: 'Подписки' },
      { key: 'documents',     icon: '📎', label: 'Документы' },
      { key: 'projects',      icon: '◒', label: 'Проекты' },
      { key: 'profile',       icon: '◓', label: 'Профиль' },
      { key: 'account',       icon: '🔑', label: 'Доступ (логин)' },
    ]
    return items
  })

  // ── Profile form ──
  const form = reactive({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    telegram: '',
    website: '',
    city: '',
    experience: '',
    about: '',
    specializations: [] as string[],
  })

  // ── Availability form ──
  const availabilityForm = reactive({
    availabilityStatus:  'free' as 'free' | 'busy' | 'paused',
    availableFrom:       '' as string,
    canTakeOrder:        true,
    rating:              '' as string,
    completedProjectsCount: 0,
  })

  // ── Regalia items ──
  const regaliaItems = ref<Array<{ type: string; title: string; year: string; description: string }>>([])  

  // ── Portfolio items ──
  const portfolioItems = ref<Array<{ title: string; imageUrl: string; description: string; year: string }>>([])  

  const saving = ref(false)
  const saveMsg = ref('')

  watch(designer, (d) => {
    if (!d) return
    form.name = d.name || ''
    form.companyName = d.companyName || ''
    form.phone = d.phone || ''
    form.email = d.email || ''
    form.telegram = d.telegram || ''
    form.website = d.website || ''
    form.city = d.city || ''
    form.experience = d.experience || ''
    form.about = d.about || ''
    form.specializations = Array.isArray(d.specializations) ? [...d.specializations] : []
    // Availability
    availabilityForm.availabilityStatus   = (d.availabilityStatus   || 'free') as 'free' | 'busy' | 'paused'
    availabilityForm.availableFrom        = d.availableFrom         || ''
    availabilityForm.canTakeOrder         = d.canTakeOrder          ?? true
    availabilityForm.rating               = d.rating != null        ? String(d.rating) : ''
    availabilityForm.completedProjectsCount = d.completedProjectsCount ?? 0
    // Regalia
    regaliaItems.value   = Array.isArray(d.regalia)   ? [...d.regalia]   : []
    // Portfolio
    portfolioItems.value = Array.isArray(d.portfolio) ? [...d.portfolio] : []
  }, { immediate: true })

  async function saveProfile() {
    if (!did.value) return
    saving.value = true
    saveMsg.value = ''
    try {
      await $fetch(`/api/designers/${did.value}`, {
        method: 'PUT' as any,
        body: { ...form },
      })
      await refresh()
      saveMsg.value = 'Сохранено!'
      setTimeout(() => (saveMsg.value = ''), 3000)
    } finally {
      saving.value = false
    }
  }

  // ── Services (price list) ──
  const services = computed<DesignerServicePrice[]>(() => {
    if (!designer.value?.services) return []
    return designer.value.services as DesignerServicePrice[]
  })

  async function saveServices(newServices: DesignerServicePrice[]) {
    if (!did.value) return
    await $fetch(`/api/designers/${did.value}`, {
      method: 'PUT' as any,
      body: { services: newServices },
    })
    await refresh()
  }

  function initServicesFromTemplates(): DesignerServicePrice[] {
    return DESIGNER_SERVICE_TEMPLATES.map(t => ({
      serviceKey: t.key,
      title: t.title,
      description: t.description,
      category: t.category,
      unit: t.defaultUnit,
      price: t.defaultPrice,
      enabled: true,
    }))
  }

  // ── Packages ──
  const packages = computed<DesignerPackage[]>(() => {
    if (!designer.value?.packages) return []
    return designer.value.packages as DesignerPackage[]
  })

  async function savePackages(newPackages: DesignerPackage[]) {
    if (!did.value) return
    await $fetch(`/api/designers/${did.value}`, {
      method: 'PUT' as any,
      body: { packages: newPackages },
    })
    await refresh()
  }

  function initPackagesFromTemplates(): DesignerPackage[] {
    return DESIGNER_PACKAGE_TEMPLATES.map(t => ({
      key: t.key,
      title: t.title,
      description: t.description,
      serviceKeys: [...t.serviceKeys],
      pricePerSqm: t.suggestedPricePerSqm,
      enabled: true,
    }))
  }

  // ── Subscriptions ──
  const subscriptions = computed<DesignerSubscription[]>(() => {
    if (!designer.value?.subscriptions) return []
    return designer.value.subscriptions as DesignerSubscription[]
  })

  async function saveSubscriptions(newSubs: DesignerSubscription[]) {
    if (!did.value) return
    await $fetch(`/api/designers/${did.value}`, {
      method: 'PUT' as any,
      body: { subscriptions: newSubs },
    })
    await refresh()
  }

  function initSubscriptionsFromTemplates(): DesignerSubscription[] {
    return DESIGNER_SUBSCRIPTION_TEMPLATES.map(t => ({
      key: t.key,
      title: t.title,
      description: t.description,
      billingPeriod: t.billingPeriod,
      price: t.price,
      discount: t.discount,
      serviceKeys: [...t.serviceKeys],
      limits: { ...t.limits },
      enabled: true,
    }))
  }

  // ── Designer projects ──
  const designerProjects = computed<DesignerProject[]>(() => {
    if (!designer.value?.designerProjects) return []
    return designer.value.designerProjects
  })

  const creatingProject = ref(false)
  const newProject = reactive({
    title: '',
    slug: '',
    packageKey: '',
    pricePerSqm: 0,
    area: 0,
    notes: '',
  })

  function autoSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[а-яё]/g, (ch) => {
        const map: Record<string, string> = {
          а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
          з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
          п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
          ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
        }
        return map[ch] || ch
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60)
  }

  watch(() => newProject.title, (t) => {
    if (t && !newProject.slug) newProject.slug = autoSlug(t)
  })

  watch(() => newProject.packageKey, (pk) => {
    if (!pk) return
    const tmpl = DESIGNER_PACKAGE_TEMPLATES.find(p => p.key === pk)
    if (tmpl) newProject.pricePerSqm = tmpl.suggestedPricePerSqm
    // Also check custom packages
    const custom = packages.value.find(p => p.key === pk)
    if (custom) newProject.pricePerSqm = custom.pricePerSqm
  })

  async function createProject() {
    if (!did.value || !newProject.title.trim() || !newProject.slug.trim()) return
    creatingProject.value = true
    try {
      await $fetch(`/api/designers/${did.value}/create-project`, {
        method: 'POST',
        body: {
          designerId: did.value,
          title: newProject.title,
          slug: newProject.slug,
          packageKey: newProject.packageKey || undefined,
          pricePerSqm: newProject.pricePerSqm || undefined,
          area: newProject.area || undefined,
          totalPrice: (newProject.pricePerSqm && newProject.area)
            ? newProject.pricePerSqm * newProject.area
            : undefined,
          notes: newProject.notes || undefined,
        },
      })
      await refresh()
      newProject.title = ''
      newProject.slug = ''
      newProject.packageKey = ''
      newProject.pricePerSqm = 0
      newProject.area = 0
      newProject.notes = ''
    } finally {
      creatingProject.value = false
    }
  }

  async function updateDesignerProject(payload: UpdateDesignerProjectPayload) {
    if (!did.value) return
    await $fetch(`/api/designers/${did.value}/project`, {
      method: 'PUT',
      body: payload,
    })
    await refresh()
  }

  // ── Add client to project ──
  async function addClientToProject(designerProjectId: number, clientId: number) {
    if (!did.value) return
    await $fetch(`/api/designers/${did.value}/add-client`, {
      method: 'POST',
      body: { designerProjectId, clientId },
    })
    await refresh()
  }

  // ── Add contractor to project ──
  async function addContractorToProject(designerProjectId: number, contractorId: number, role?: string) {
    if (!did.value) return
    await $fetch(`/api/designers/${did.value}/add-contractor`, {
      method: 'POST',
      body: { designerProjectId, contractorId, role },
    })
    await refresh()
  }

  // ── Remove link ──
  async function removeLink(type: 'client' | 'contractor', linkId: number) {
    if (!did.value) return
    await $fetch(`/api/designers/${did.value}/remove-link`, {
      method: 'POST',
      body: { type, linkId },
    })
    await refresh()
  }

  // ── Dashboard stats ──
  const dashStats = computed(() => {
    const dps = designerProjects.value
    return {
      total: dps.length,
      active: dps.filter(p => p.status === 'active').length,
      draft: dps.filter(p => p.status === 'draft').length,
      completed: dps.filter(p => p.status === 'completed').length,
      totalRevenue: dps.reduce((s, p) => s + (p.totalPrice || 0), 0),
      totalArea: dps.reduce((s, p) => s + (p.area || 0), 0),
    }
  })

  const servicesByCat = computed(() => {
    const map = new Map<DesignerServiceCategory, DesignerServicePrice[]>()
    for (const svc of services.value) {
      if (!map.has(svc.category)) map.set(svc.category, [])
      map.get(svc.category)!.push(svc)
    }
    return map
  })

  // ── Profile completeness ──
  const profilePct = computed(() => {
    const d = designer.value
    if (!d) return 0
    const fields = ['name', 'phone', 'email', 'city', 'about']
    const filled = fields.filter(f => d[f]).length
    const hasSvc = (d.services as any[])?.length > 0 ? 1 : 0
    const hasPkg = (d.packages as any[])?.length > 0 ? 1 : 0
    const hasSub = (d.subscriptions as any[])?.length > 0 ? 1 : 0
    return Math.round((filled + hasSvc + hasPkg + hasSub) / (fields.length + 3) * 100)
  })

  // ── Availability / rating ──
  async function saveAvailability() {
    if (!did.value) return
    await $fetch(`/api/designers/${did.value}`, {
      method: 'PUT' as any,
      body: {
        availabilityStatus:     availabilityForm.availabilityStatus,
        availableFrom:          availabilityForm.availableFrom || null,
        canTakeOrder:           availabilityForm.canTakeOrder,
        rating:                 availabilityForm.rating !== '' ? Number(availabilityForm.rating) : null,
        completedProjectsCount: availabilityForm.completedProjectsCount,
      },
    })
    await refresh()
  }

  // ── Regalia ──
  async function saveRegalia() {
    if (!did.value) return
    await $fetch(`/api/designers/${did.value}`, {
      method: 'PUT' as any,
      body: { regalia: regaliaItems.value },
    })
    await refresh()
  }

  // ── Portfolio ──
  async function savePortfolio() {
    if (!did.value) return
    await $fetch(`/api/designers/${did.value}`, {
      method: 'PUT' as any,
      body: { portfolio: portfolioItems.value },
    })
    await refresh()
  }

  // ── Create designer ──
  async function createDesigner(name: string) {
    const result = await $fetch('/api/designers', {
      method: 'POST',
      body: { name },
    })
    await refreshList()
    return result
  }

  function formatPrice(price: number, unit: string): string {
    const formatted = price.toLocaleString('ru-RU')
    const unitLabel = PRICE_UNIT_LABELS[unit as keyof typeof PRICE_UNIT_LABELS] || unit
    return `${formatted} ${unitLabel}`
  }

  return {
    // Data
    designer,
    pending,
    allDesigners,
    allProjects,
    allClients,
    allContractors,
    services,
    packages,
    designerProjects,
    dashStats,
    servicesByCat,
    profilePct,

    // Navigation
    section,
    nav,

    // Profile form
    form,
    saving,
    saveMsg,
    saveProfile,

    // Availability / rating
    availabilityForm,
    saveAvailability,

    // Regalia
    regaliaItems,
    saveRegalia,

    // Portfolio
    portfolioItems,
    savePortfolio,

    // Services
    saveServices,
    initServicesFromTemplates,

    // Packages
    savePackages,
    initPackagesFromTemplates,

    // Subscriptions
    subscriptions,
    saveSubscriptions,
    initSubscriptionsFromTemplates,

    // Projects
    newProject,
    creatingProject,
    createProject,
    updateDesignerProject,
    addClientToProject,
    addContractorToProject,
    removeLink,

    // Designer CRUD
    createDesigner,
    refresh,
    refreshList,

    // Helpers
    formatPrice,
    autoSlug,
  }
}
