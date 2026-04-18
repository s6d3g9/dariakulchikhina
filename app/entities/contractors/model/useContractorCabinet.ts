import { CONTRACTOR_ROLE_TYPE_OPTIONS, CONTRACTOR_WORK_TYPE_OPTIONS, WORK_TYPE_STAGES } from '~~/shared/types/catalogs'
import { workTypeLabel } from '~~/shared/utils/work-status'

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Наличные' },
  { value: 'sbp', label: 'СБП' },
  { value: 'card_transfer', label: 'На карту' },
  { value: 'bank_transfer', label: 'Безналичный (р/с)' },
  { value: 'crypto', label: 'Криптовалюта' },
]

export const DOC_CATEGORIES: { value: string; label: string }[] = [
  { value: 'passport', label: 'Паспорт' },
  { value: 'inn_doc', label: 'ИНН' },
  { value: 'snils', label: 'СНИЛС' },
  { value: 'license', label: 'Лицензия' },
  { value: 'certificate', label: 'Сертификат' },
  { value: 'contract', label: 'Договор' },
  { value: 'insurance', label: 'Страховка' },
  { value: 'diploma', label: 'Диплом / удостоверение' },
  { value: 'sro', label: 'СРО допуск' },
  { value: 'other', label: 'Другой' },
]

export const STATUSES = [
  { value: 'pending', label: 'Ожидание' },
  { value: 'planned', label: 'Запланировано' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'paused', label: 'На паузе' },
  { value: 'done', label: 'Выполнено' },
  { value: 'cancelled', label: 'Отменено' },
]

export const ROLE_GROUPS = [
  {
    label: 'Управление',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['general_contractor', 'foreman', 'site_manager', 'estimator'].includes(r.value)),
  },
  {
    label: 'Конструктив',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['demolition_worker', 'mason', 'concrete_worker', 'reinforcer', 'welder'].includes(r.value)),
  },
  {
    label: 'Инженерные системы',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['electrician', 'plumber', 'hvac_engineer', 'low_current_engineer', 'gas_engineer', 'smart_home_installer', 'security_installer', 'av_installer'].includes(r.value)),
  },
  {
    label: 'Чистовая отделка',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['plasterer', 'painter', 'tiler', 'floor_installer', 'wallpaper_installer', 'decorative_finish_specialist'].includes(r.value)),
  },
  {
    label: 'Столярные / плотницкие',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['carpenter', 'joiner', 'drywall_installer', 'window_installer', 'glazier', 'furniture_assembler'].includes(r.value)),
  },
  {
    label: 'Специальные',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['stone_worker', 'facade_worker', 'roofer', 'landscape_worker', 'pool_installer', 'cleaner'].includes(r.value)),
  },
]

export const WORK_GROUPS = [
  {
    label: 'Демонтаж и подготовка',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['demolition', 'debris_removal'].includes(w.value)),
  },
  {
    label: 'Конструктив',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['masonry', 'concrete_work', 'screed', 'waterproofing', 'partition_installation', 'insulation'].includes(w.value)),
  },
  {
    label: 'Инженерные системы',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['electrical_installation', 'plumbing_installation', 'hvac', 'heating', 'smart_home', 'low_current', 'gas_installation', 'security_systems', 'av_systems'].includes(w.value)),
  },
  {
    label: 'Чистовая отделка',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['plastering', 'puttying', 'tile_installation', 'painting', 'wallpapering', 'ceiling_installation', 'floor_installation', 'decorative_plaster'].includes(w.value)),
  },
  {
    label: 'Столярные / плотницкие',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['carpentry', 'joinery', 'window_installation', 'door_installation', 'built_in_furniture', 'drywall_installation'].includes(w.value)),
  },
  {
    label: 'Специальные',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['stone_cladding', 'facade_works', 'roofing', 'landscaping', 'pool_installation', 'furniture_installation', 'final_cleaning'].includes(w.value)),
  },
]

interface WtGroup {
  workType: string
  label: string
  items: any[]
  stages: any[]
}

import { type InlineAutosaveState } from '~/shared/ui/autosave/autosave-state'

export function useContractorCabinet(contractorId: Ref<number | null>) {
  const cid = computed(() => contractorId.value)
  const hasContractorId = computed(() => Number.isInteger(cid.value) && Number(cid.value) > 0)
  const contractorAsyncKey = computed(() => `contractor-cabinet:${cid.value || 'none'}`)
  const contractorWorkItemsAsyncKey = computed(() => `contractor-cabinet-work-items:${cid.value || 'none'}`)
  const contractorStaffAsyncKey = computed(() => `contractor-cabinet-staff:${cid.value || 'none'}`)
  const contractorProjectsAsyncKey = computed(() => `contractor-cabinet-projects:${cid.value || 'none'}`)
  const contractorDocsAsyncKey = computed(() => `contractor-cabinet-docs:${cid.value || 'none'}`)
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

  // ── Data fetching ──
  const { data: contractor, pending, refresh } = useAsyncData<any | null>(
    contractorAsyncKey,
    () => hasContractorId.value ? $fetch<any>(`/api/contractors/${cid.value}` as string, { headers: requestHeaders }) : Promise.resolve(null),
    { watch: [cid], default: () => null },
  )
  const { data: workItems, refresh: refreshItems } = useAsyncData<any[]>(
    contractorWorkItemsAsyncKey,
    () => hasContractorId.value ? $fetch<any[]>(`/api/contractors/${cid.value}/work-items` as string, { headers: requestHeaders }) : Promise.resolve<any[]>([]),
    { default: () => [] as any[], watch: [cid] },
  )
  const { data: staff } = useAsyncData<any[]>(
    contractorStaffAsyncKey,
    () => hasContractorId.value ? $fetch<any[]>(`/api/contractors/${cid.value}/staff` as string, { headers: requestHeaders }) : Promise.resolve<any[]>([]),
    { default: () => [] as any[], watch: [cid] },
  )
  const { data: linkedProjects } = useAsyncData<any[]>(
    contractorProjectsAsyncKey,
    () => hasContractorId.value ? $fetch<any[]>(`/api/contractors/${cid.value}/projects` as string, { headers: requestHeaders }) : Promise.resolve<any[]>([]),
    { default: () => [] as any[], watch: [cid] },
  )
  const { data: contractorDocs, refresh: refreshDocs } = useAsyncData<any[]>(
    contractorDocsAsyncKey,
    () => hasContractorId.value ? $fetch<any[]>(`/api/contractors/${cid.value}/documents` as string, { headers: requestHeaders }) : Promise.resolve<any[]>([]),
    { default: () => [] as any[], watch: [cid] },
  )

  // ── Form ──
  const form = reactive({
    name: '', companyName: '', phone: '', email: '',
    messenger: '', messengerNick: '', website: '', notes: '',
    roleTypes: [] as string[], workTypes: [] as string[],
    passportSeries: '', passportNumber: '', passportIssuedBy: '',
    passportIssueDate: '', passportDepartmentCode: '',
    birthDate: '', birthPlace: '', registrationAddress: '', snils: '',
    telegram: '', whatsapp: '', city: '', workRadius: '',
    inn: '', kpp: '', ogrn: '', bankName: '', bik: '',
    settlementAccount: '', correspondentAccount: '',
    legalAddress: '', factAddress: '',
    taxSystem: '', paymentMethods: [] as string[], hourlyRate: '',
    hasInsurance: false, insuranceDetails: '',
    education: '', certifications: [] as string[],
    experienceYears: null as number | null,
  })

  watch(contractor, (c) => {
    if (!c) return
    form.name = c.name || ''
    form.companyName = c.companyName || ''
    form.phone = c.phone || ''
    form.email = c.email || ''
    form.messenger = c.messenger || ''
    form.messengerNick = c.messengerNick || ''
    form.website = c.website || ''
    form.notes = c.notes || ''
    form.roleTypes = Array.isArray(c.roleTypes) ? [...c.roleTypes] : []
    form.workTypes = Array.isArray(c.workTypes) ? [...c.workTypes] : []
    form.passportSeries = c.passportSeries || ''
    form.passportNumber = c.passportNumber || ''
    form.passportIssuedBy = c.passportIssuedBy || ''
    form.passportIssueDate = c.passportIssueDate || ''
    form.passportDepartmentCode = c.passportDepartmentCode || ''
    form.birthDate = c.birthDate || ''
    form.birthPlace = c.birthPlace || ''
    form.registrationAddress = c.registrationAddress || ''
    form.snils = c.snils || ''
    form.telegram = c.telegram || ''
    form.whatsapp = c.whatsapp || ''
    form.city = c.city || ''
    form.workRadius = c.workRadius || ''
    form.inn = c.inn || ''
    form.kpp = c.kpp || ''
    form.ogrn = c.ogrn || ''
    form.bankName = c.bankName || ''
    form.bik = c.bik || ''
    form.settlementAccount = c.settlementAccount || ''
    form.correspondentAccount = c.correspondentAccount || ''
    form.legalAddress = c.legalAddress || ''
    form.factAddress = c.factAddress || ''
    form.taxSystem = c.taxSystem || ''
    form.paymentMethods = Array.isArray(c.paymentMethods) ? [...c.paymentMethods] : []
    form.hourlyRate = c.hourlyRate || ''
    form.hasInsurance = c.hasInsurance || false
    form.insuranceDetails = c.insuranceDetails || ''
    form.education = c.education || ''
    form.certifications = Array.isArray(c.certifications) ? [...c.certifications] : []
    form.experienceYears = c.experienceYears ?? null
  }, { immediate: true })

  // ── Section nav ──
  const section = ref('dashboard')

  // Reset section when switching contractors
  watch(cid, () => { section.value = 'dashboard' })

  const nav = computed(() => {
    const items: { key: string; icon: string; label: string }[] = [
      { key: 'dashboard', icon: '◈', label: 'Обзор' },
      { key: 'tasks', icon: '◎', label: 'Задачи' },
      { key: 'contacts', icon: '☎', label: 'Контактные данные' },
      { key: 'passport', icon: '◑', label: 'Паспортные данные' },
      { key: 'requisites', icon: '◒', label: 'Реквизиты' },
      { key: 'documents', icon: '◓', label: 'Документы' },
      { key: 'specialization', icon: '◐', label: 'Специализации' },
      { key: 'finances', icon: '◕', label: 'Финансы' },
      { key: 'portfolio', icon: '◖', label: 'Портфолио' },
      { key: 'settings', icon: '⚙', label: 'Настройки' },
    ]
    if (contractor.value?.contractorType === 'company') {
      items.splice(2, 0, { key: 'staff', icon: '◔', label: 'Бригада' })
    }
    return items
  })

  // ── Save profile (admin endpoint) ──
  const saving = ref(false)
  const saveMsg = ref('')

  async function saveProfile() {
    if (!cid.value) return
    saving.value = true
    saveMsg.value = ''
    try {
      await $fetch(`/api/contractors/${cid.value}`, {
        method: 'PUT',
        body: { ...form },
      })
      await refresh()
    } catch (error: any) {
      saveMsg.value = 'Ошибка: ' + (error?.data?.message || error.message || 'неизвестная')
      throw error
    } finally {
      saving.value = false
    }
  }

  // ── Tasks ──
  const statusFilter = ref('all')
  const expandedId = ref<number | null>(null)
  const savingItem = ref<number | null>(null)
  const editMap = reactive<Record<number, { notes: string; dateStart: string; dateEnd: string }>>({})
  const taskSaveStates = reactive<Record<number, InlineAutosaveState>>({})
  const taskSaveTimers = new Map<number, ReturnType<typeof setTimeout>>()

  // ── Wt group open state ──
  const wtGroupOpenSet = reactive(new Set<string>())
  function wtGroupKey(slug: string, wt: string) { return `${slug}::${wt}` }
  function isWtGroupOpen(slug: string, wt: string) { return wtGroupOpenSet.has(wtGroupKey(slug, wt)) }
  function toggleWtGroup(slug: string, wt: string) {
    const k = wtGroupKey(slug, wt)
    if (wtGroupOpenSet.has(k)) wtGroupOpenSet.delete(k)
    else wtGroupOpenSet.add(k)
  }

  // ── Stage checklist (localStorage) ──
  function lsKey(projectSlug: string, wt: string) {
    return `cab_stages_${cid.value}_${projectSlug}_${wt}`
  }
  function loadStageDone(projectSlug: string, wt: string): Set<string> {
    if (import.meta.server) return new Set()
    try { const r = localStorage.getItem(lsKey(projectSlug, wt)); return new Set(r ? JSON.parse(r) : []) }
    catch { return new Set() }
  }
  const stagesCache = reactive<Record<string, Set<string>>>({})
  function getStageDone(projectSlug: string, wt: string): Set<string> {
    const k = lsKey(projectSlug, wt)
    if (!stagesCache[k]) stagesCache[k] = loadStageDone(projectSlug, wt)
    return stagesCache[k]
  }
  function toggleStage(projectSlug: string, wt: string, stageKey: string) {
    const s = getStageDone(projectSlug, wt)
    if (s.has(stageKey)) s.delete(stageKey)
    else s.add(stageKey)
    if (!import.meta.server) localStorage.setItem(lsKey(projectSlug, wt), JSON.stringify([...s]))
  }
  function isStageDone(projectSlug: string, wt: string, key: string) {
    return getStageDone(projectSlug, wt).has(key)
  }
  function stagesPct(projectSlug: string, wt: string, total: number) {
    if (!total) return 0
    return Math.round(getStageDone(projectSlug, wt).size / total * 100)
  }

  watch(workItems, (items) => {
    for (const item of items || []) {
      if (!editMap[item.id]) {
        editMap[item.id] = { notes: item.notes || '', dateStart: item.dateStart || '', dateEnd: item.dateEnd || '' }
      }
      const k = wtGroupKey(item.projectSlug, item.workType || '__general__')
      wtGroupOpenSet.add(k)
    }
  }, { immediate: true })

  function toggleExpand(id: number) {
    expandedId.value = expandedId.value === id ? null : id
  }

  const activeCount = computed(() =>
    (workItems.value || []).filter((i: any) => ['planned', 'in_progress'].includes(i.status)).length)

  const FILTERS = computed(() => {
    const all = workItems.value || []
    return [
      { value: 'all', label: 'Все', count: all.length },
      { value: 'active', label: 'Активные', count: all.filter((i: any) => ['planned', 'in_progress'].includes(i.status)).length },
      { value: 'done', label: 'Выполнено', count: all.filter((i: any) => i.status === 'done').length },
      { value: 'cancelled', label: 'Отменено', count: all.filter((i: any) => i.status === 'cancelled').length },
    ]
  })

  const byProject = computed(() => {
    const all = workItems.value || []
    const map = new Map<string, { slug: string; title: string; wtGroups: WtGroup[]; doneCount: number; totalCount: number }>()
    for (const item of all) {
      if (!map.has(item.projectSlug)) {
        map.set(item.projectSlug, { slug: item.projectSlug, title: item.projectTitle, wtGroups: [], doneCount: 0, totalCount: 0 })
      }
      const proj = map.get(item.projectSlug)!
      proj.totalCount++
      if (item.status === 'done') proj.doneCount++
      const f = statusFilter.value
      const show = (
        f === 'all' ||
        (f === 'active' && ['planned', 'in_progress'].includes(item.status)) ||
        (f === 'done' && item.status === 'done') ||
        (f === 'cancelled' && item.status === 'cancelled')
      )
      if (!show) continue
      const wt = item.workType || '__general__'
      let grp = proj.wtGroups.find(g => g.workType === wt)
      if (!grp) {
        const label = wt === '__general__'
          ? 'Общие задачи'
          : (CONTRACTOR_WORK_TYPE_OPTIONS.find(o => o.value === wt)?.label || wt)
        const stages = wt !== '__general__' ? (WORK_TYPE_STAGES[wt] || []) : []
        grp = { workType: wt, label, items: [], stages }
        proj.wtGroups.push(grp)
      }
      grp.items.push(item)
    }
    return [...map.values()].filter(p => p.wtGroups.length > 0)
  })

  function isDue(dateStr: string | null | undefined): boolean {
    if (!dateStr) return false
    const [d, m, y] = dateStr.split('.')
    if (!d || !m || !y) return false
    const due = new Date(Number(y), Number(m) - 1, Number(d))
    return due < new Date()
  }

  async function updateStatus(item: any, status: string) {
    if (!cid.value) return
    item.status = status
    await $fetch(`/api/contractors/${cid.value}/work-items/${item.id}`, {
      method: 'PUT',
      body: { status },
    })
    refreshItems()
  }

  async function saveTaskDetails(item: any) {
    if (!cid.value) return
    const itemId = Number(item.id)
    savingItem.value = itemId
    taskSaveStates[itemId] = 'saving'
    const notes = editMap[itemId]?.notes ?? item.notes ?? ''
    const dateStart = editMap[itemId]?.dateStart ?? item.dateStart ?? ''
    const dateEnd = editMap[itemId]?.dateEnd ?? item.dateEnd ?? ''
    try {
      const updated = await $fetch<any>(`/api/contractors/${cid.value}/work-items/${itemId}`, {
        method: 'PUT',
        body: { notes, dateStart: dateStart || null, dateEnd: dateEnd || null },
      })
      item.notes = updated.notes
      item.dateStart = updated.dateStart
      item.dateEnd = updated.dateEnd
      taskSaveStates[itemId] = 'saved'
      setTimeout(() => {
        if (taskSaveStates[itemId] === 'saved') taskSaveStates[itemId] = ''
      }, 1400)
    } catch (error) {
      taskSaveStates[itemId] = 'error'
      throw error
    } finally {
      savingItem.value = null
    }
  }

  function clearTaskDetailsTimer(itemId: number) {
    const timer = taskSaveTimers.get(itemId)
    if (!timer) return
    clearTimeout(timer)
    taskSaveTimers.delete(itemId)
  }

  function queueTaskDetailsSave(item: any) {
    const itemId = Number(item.id)
    clearTaskDetailsTimer(itemId)
    taskSaveTimers.set(itemId, setTimeout(() => {
      taskSaveTimers.delete(itemId)
      saveTaskDetails(item)
    }, 420))
  }

  // ── Dashboard ──
  const dashStats = computed(() => {
    const all = workItems.value || []
    return {
      total: all.length,
      inProgress: all.filter((i: any) => i.status === 'in_progress').length,
      done: all.filter((i: any) => i.status === 'done').length,
      overdue: all.filter((i: any) => {
        if (i.status === 'done' || i.status === 'cancelled') return false
        return isDue(i.dateEnd)
      }).length,
    }
  })

  const dashDeadlines = computed(() =>
    (workItems.value || [])
      .filter((i: any) => i.dateEnd && i.status !== 'done' && i.status !== 'cancelled')
      .sort((a: any, b: any) => {
        const parse = (s: string) => { const [d, m, y] = s.split('.'); return new Date(Number(y), Number(m) - 1, Number(d)).getTime() }
        return parse(a.dateEnd) - parse(b.dateEnd)
      })
      .slice(0, 8)
  )

  const dashNoDue = computed(() =>
    (workItems.value || []).filter((i: any) => !i.dateEnd && i.status !== 'done' && i.status !== 'cancelled'))

  // ── Profile completeness ──
  const profileFields: { key: string; section: string }[] = [
    { key: 'name', section: 'contacts' },
    { key: 'phone', section: 'contacts' },
    { key: 'email', section: 'contacts' },
    { key: 'city', section: 'contacts' },
    { key: 'passportSeries', section: 'passport' },
    { key: 'passportNumber', section: 'passport' },
    { key: 'inn', section: 'requisites' },
    { key: 'bankName', section: 'requisites' },
    { key: 'settlementAccount', section: 'requisites' },
    { key: 'workTypes', section: 'specialization' },
    { key: 'roleTypes', section: 'specialization' },
    { key: 'hourlyRate', section: 'finances' },
  ]
  const profilePct = computed(() => {
    const c = contractor.value
    if (!c) return 0
    let filled = 0
    for (const f of profileFields) {
      const v = c[f.key]
      if (Array.isArray(v) ? v.length > 0 : !!v) filled++
    }
    return Math.round(filled / profileFields.length * 100)
  })
  const profileNextSection = computed(() => {
    const c = contractor.value
    if (!c) return 'contacts'
    for (const f of profileFields) {
      const v = c[f.key]
      if (!(Array.isArray(v) ? v.length > 0 : !!v)) return f.section
    }
    return 'contacts'
  })

  const quickActions = computed(() => [
    { key: 'tasks', icon: '◎', label: 'Задачи', badge: activeCount.value || '' },
    { key: 'contacts', icon: '☎', label: 'Контакты', badge: '' },
    { key: 'documents', icon: '◓', label: 'Документы', badge: '' },
    { key: 'finances', icon: '◕', label: 'Финансы', badge: '' },
  ])

  // ── Portfolio ──
  const portfolioStats = computed(() => {
    const all = workItems.value || []
    const doneItems = all.filter((i: any) => i.status === 'done')
    const projects = new Set(doneItems.map((i: any) => i.projectSlug))
    const photoCount = doneItems.reduce((sum: number, i: any) => sum + (i.photoCount || 0), 0)
    return { doneCount: doneItems.length, projectCount: projects.size, photoCount }
  })

  // ── Photos ──
  const photosByItem = reactive<Record<number, any[]>>({})
  const uploadingFor = ref<number | null>(null)
  const lightboxUrl = ref<string | null>(null)

  async function loadPhotos(itemId: number) {
    if (!cid.value) return
    const photos = await $fetch<any[]>(`/api/contractors/${cid.value}/work-items/${itemId}/photos`)
    photosByItem[itemId] = photos
  }

  async function uploadPhotos(item: any, event: Event) {
    if (!cid.value) return
    const files = (event.target as HTMLInputElement).files
    if (!files?.length) return
    const itemId = Number(item.id)
    uploadingFor.value = itemId
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        const photo = await $fetch<any>(`/api/contractors/${cid.value}/work-items/${itemId}/photos`, {
          method: 'POST', body: fd,
        })
        if (!photosByItem[itemId]) photosByItem[itemId] = []
        const photos = photosByItem[itemId]
        if (photos) photos.push(photo)
      }
      item.photoCount = (item.photoCount || 0) + files.length
    } finally {
      uploadingFor.value = null
      ;(event.target as HTMLInputElement).value = ''
    }
  }

  async function deletePhoto(itemId: number, photoId: number) {
    if (!cid.value) return
    await $fetch(`/api/contractors/${cid.value}/work-items/${itemId}/photos/${photoId}`, { method: 'DELETE' })
    photosByItem[itemId] = (photosByItem[itemId] || []).filter((p: any) => p.id !== photoId)
    const item = (workItems.value || []).find((i: any) => i.id === itemId)
    if (item) item.photoCount = Math.max(0, (item.photoCount || 1) - 1)
  }

  // ── Comments ──
  const commentsByItem = reactive<Record<number, any[]>>({})
  const commentText = reactive<Record<number, string>>({})
  const sendingComment = ref<number | null>(null)

  async function loadComments(itemId: number) {
    if (!cid.value) return
    const comments = await $fetch<any[]>(`/api/contractors/${cid.value}/work-items/${itemId}/comments`)
    commentsByItem[itemId] = comments
  }

  async function sendComment(item: any) {
    if (!cid.value) return
    const itemId = Number(item.id)
    const text = (commentText[itemId] || '').trim()
    if (!text) return
    sendingComment.value = itemId
    try {
      const c = await $fetch<any>(`/api/contractors/${cid.value}/work-items/${itemId}/comments`, {
        method: 'POST', body: { text },
      })
      if (!commentsByItem[itemId]) commentsByItem[itemId] = []
      const comments = commentsByItem[itemId]
      if (comments) comments.push(c)
      item.commentCount = (item.commentCount || 0) + 1
      commentText[itemId] = ''
    } finally {
      sendingComment.value = null
    }
  }

  function fmtTime(isoStr: string): string {
    try {
      const d = new Date(isoStr)
      return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
        + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    } catch { return '' }
  }

  watch(expandedId, (id) => {
    if (id !== null) {
      loadPhotos(id)
      loadComments(id)
    }
  })

  // ── Documents ──
  const docUploading = ref(false)
  const newDocTitle = ref('')
  const newDocCategory = ref('other')
  const newDocNotes = ref('')

  async function uploadDoc(ev: Event) {
    if (!cid.value) return
    const files = (ev.target as HTMLInputElement).files
    if (!files?.length) return
    docUploading.value = true
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('title', newDocTitle.value || file.name)
        fd.append('category', newDocCategory.value)
        if (newDocNotes.value) fd.append('notes', newDocNotes.value)
        await $fetch(`/api/contractors/${cid.value}/documents`, { method: 'POST', body: fd })
      }
      newDocTitle.value = ''
      newDocNotes.value = ''
      newDocCategory.value = 'other'
      refreshDocs()
    } finally {
      docUploading.value = false
      ;(ev.target as HTMLInputElement).value = ''
    }
  }

  async function deleteDoc(docId: number) {
    if (!cid.value) return
    if (!confirm('Удалить документ?')) return
    await $fetch(`/api/contractors/${cid.value}/documents/${docId}`, { method: 'DELETE' })
    refreshDocs()
  }

  // ── Certs ──
  const newCert = ref('')
  function addCert() {
    const v = newCert.value.trim()
    if (v && !form.certifications.includes(v)) form.certifications.push(v)
    newCert.value = ''
  }
  function removeCert(idx: number) { form.certifications.splice(idx, 1) }

  // ── Helpers ──
  function toggleArr(arr: string[], val: string) {
    const idx = arr.indexOf(val)
    if (idx === -1) arr.push(val)
    else arr.splice(idx, 1)
  }

  // ── New task modal ──
  const showNewTaskModal = ref(false)
  const creatingTask = ref(false)
  const newTask = reactive({
    masterContractorId: null as number | null,
    projectSlug: '',
    title: '',
    workType: '',
    dateStart: '',
    dateEnd: '',
    budget: '',
    notes: '',
  })

  const allProjects = computed(() => {
    const result: { slug: string; title: string }[] = [...(linkedProjects.value || [])]
    const seen = new Set(result.map(p => p.slug))
    for (const item of workItems.value || []) {
      if (!seen.has(item.projectSlug)) {
        seen.add(item.projectSlug)
        result.push({ slug: item.projectSlug, title: item.projectTitle })
      }
    }
    return result
  })

  function openNewTaskModal() {
    const firstStaff = staff.value?.[0]
    const firstProject = allProjects.value?.[0]
    newTask.masterContractorId = staff.value?.length === 1 ? (firstStaff?.id ?? null) : null
    newTask.projectSlug = allProjects.value.length === 1 ? (firstProject?.slug || '') : ''
    newTask.title = ''
    newTask.workType = ''
    newTask.dateStart = ''
    newTask.dateEnd = ''
    newTask.budget = ''
    newTask.notes = ''
    showNewTaskModal.value = true
  }

  async function createTask() {
    if (!cid.value || !newTask.projectSlug || !newTask.title.trim()) return
    creatingTask.value = true
    try {
      await $fetch(`/api/contractors/${cid.value}/work-items`, {
        method: 'POST',
        body: {
          projectSlug: newTask.projectSlug,
          contractorId: newTask.masterContractorId || cid.value,
          title: newTask.title.trim(),
          workType: newTask.workType || null,
          dateStart: newTask.dateStart || null,
          dateEnd: newTask.dateEnd || null,
          budget: newTask.budget || null,
          notes: newTask.notes || null,
        },
      })
      showNewTaskModal.value = false
      refreshItems()
    } finally {
      creatingTask.value = false
    }
  }

  // ── Notification settings (localStorage) ──
  const NOTIF_LS_KEY = computed(() => `cab_notif_${cid.value}`)
  function loadNotifSettings() {
    if (import.meta.server) return { newTasks: true, deadlines: true, comments: true, statusChanges: false }
    try {
      const raw = localStorage.getItem(NOTIF_LS_KEY.value)
      return raw ? JSON.parse(raw) : { newTasks: true, deadlines: true, comments: true, statusChanges: false }
    } catch { return { newTasks: true, deadlines: true, comments: true, statusChanges: false } }
  }
  const notifSettings = reactive(loadNotifSettings())
  const notificationSaveState = ref<InlineAutosaveState>('')
  let notificationSaveTimer: ReturnType<typeof setTimeout> | null = null
  function saveNotifSettings() {
    if (!import.meta.server) localStorage.setItem(NOTIF_LS_KEY.value, JSON.stringify({ ...notifSettings }))
  }

  function clearNotificationSaveTimer() {
    if (!notificationSaveTimer) return
    clearTimeout(notificationSaveTimer)
    notificationSaveTimer = null
  }

  function queueNotifSettingsSave() {
    clearNotificationSaveTimer()
    notificationSaveState.value = 'saving'
    notificationSaveTimer = setTimeout(() => {
      try {
        saveNotifSettings()
        notificationSaveState.value = 'saved'
        setTimeout(() => {
          if (notificationSaveState.value === 'saved') notificationSaveState.value = ''
        }, 1400)
      } catch {
        notificationSaveState.value = 'error'
      }
    }, 280)
  }

  onBeforeUnmount(() => {
    clearNotificationSaveTimer()
    for (const timer of taskSaveTimers.values()) clearTimeout(timer)
    taskSaveTimers.clear()
  })

  return {
    // Data
    contractor, pending, staff, workItems, linkedProjects, contractorDocs,
    // Form
    form, section, nav, saving, saveMsg, saveProfile,
    // Tasks
    statusFilter, expandedId, savingItem, editMap, FILTERS, byProject,
    activeCount, toggleExpand, updateStatus, saveTaskDetails, queueTaskDetailsSave, taskSaveStates,
    // Wt groups
    isWtGroupOpen, toggleWtGroup,
    // Stages
    isStageDone, toggleStage, stagesPct,
    // Dashboard
    dashStats, dashDeadlines, dashNoDue, profilePct, profileNextSection, quickActions, isDue,
    // Portfolio
    portfolioStats,
    // Photos
    photosByItem, uploadingFor, lightboxUrl, uploadPhotos, deletePhoto,
    // Comments
    commentsByItem, commentText, sendingComment, sendComment, fmtTime,
    // Documents
    docUploading, newDocTitle, newDocCategory, newDocNotes, uploadDoc, deleteDoc,
    // Certs
    newCert, addCert, removeCert,
    // Helpers
    toggleArr,
    // New task
    showNewTaskModal, creatingTask, newTask, allProjects, openNewTaskModal, createTask,
    // Notifications
    notifSettings, saveNotifSettings, queueNotifSettingsSave, notificationSaveState,
    // Re-export constants
    workTypeLabel,
    CONTRACTOR_WORK_TYPE_OPTIONS,
  }
}
