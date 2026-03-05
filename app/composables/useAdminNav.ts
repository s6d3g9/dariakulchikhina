/**
 * useAdminNav — глобальный рекурсивный drill-down навигатор
 *
 * Модель:
 *   Узел A (root)    → Главное меню — 7 разделов
 *   Узел B (reg)     → Реестр конкретного раздела (список сущностей)
 *   Узел C (cab-*)   → Кабинет сущности (смешанные листья-профиль + узлы-связи)
 *   Узел D (reg-ctx) → Реестр связанных сущностей (в контексте C)
 *   Узел E (cab-*)   → Кабинет проекта (из контекста D)
 *   Узел F (reg-ctx) → Конкретные предметы в проекте (листья — документы и т.д.)
 *
 * Стек хранится в useState → сохраняется при переходах между маршрутами
 */

import type { NavItem, NavNode } from '~/components/AdminNestedNav.vue'

// ─── Frame types ──────────────────────────────────────────────────────────────

export type FrameType =
  | 'root'
  | 'reg'            // Реестр раздела (designers, projects, clients…)
  | 'cab-designer'   // Кабинет дизайнера
  | 'cab-project'    // Кабинет проекта
  | 'reg-ctx'        // Реестр в контексте (filtered by entity)

export interface NavContext {
  section?: string        // текущий раздел: 'designers' | 'projects' | etc.
  designerId?: number
  designerName?: string
  projectSlug?: string
  projectTitle?: string
  clientId?: number
  contractorId?: number
  sellerId?: number
}

export interface StackFrame {
  key: string
  type: FrameType
  node: NavNode
  ctx: NavContext        // накопленный контекст к моменту создания фрейма
}

// ─── Content spec — что показывать в main области ──────────────────────────

export interface ContentSpec {
  view: 'empty' | 'section' | 'designer' | 'project' | 'client' | 'contractor' | 'seller' | 'gallery' | 'documents'
  section?: string
  designerId?: number
  designerSection?: string   // выбранный лист в кабинете дизайнера
  projectSlug?: string
  clientId?: number
  contractorId?: number
  sellerId?: number
  galleryCategory?: string
  documentCategory?: string
  leafDocId?: number
}

// ─── Static item lists ────────────────────────────────────────────────────────

const ROOT_ITEMS: NavItem[] = [
  { key: 'projects',    icon: '◈', label: 'проекты',    isNode: true },
  { key: 'clients',     icon: '◐', label: 'клиенты',    isNode: true },
  { key: 'contractors', icon: '◒', label: 'подрядчики', isNode: true },
  { key: 'designers',   icon: '◓', label: 'дизайнеры',  isNode: true },
  { key: 'sellers',     icon: '◑', label: 'продавцы',   isNode: true },
  { key: 'documents',   icon: '○', label: 'документы',  isNode: true },
  { key: 'gallery',     icon: '◉', label: 'галерея',    isNode: true },
]

const GALLERY_ITEMS: NavItem[] = [
  { key: 'interiors',  icon: '⬡', label: 'интерьеры' },
  { key: 'furniture',  icon: '⬢', label: 'мебель' },
  { key: 'moodboards', icon: '⬣', label: 'мудборды' },
  { key: 'materials',  icon: '◧', label: 'материалы' },
  { key: 'art',        icon: '◨', label: 'арт и декор' },
]

const DOC_CATEGORY_ITEMS: NavItem[] = [
  { key: 'all',             label: 'все документы' },
  { key: 'contract',        label: '01 договоры на дизайн-проект' },
  { key: 'contract_supply', label: '02 договоры поставки' },
  { key: 'contract_work',   label: '03 договоры подряда' },
  { key: 'act',             label: '04 акты выполненных работ' },
  { key: 'act_defect',      label: '05 акты о дефектах' },
  { key: 'invoice',         label: '06 счета на оплату' },
  { key: 'estimate',        label: '07 сметы и калькуляции' },
  { key: 'specification',   label: '08 спецификации' },
  { key: 'tz',              label: '09 техническое задание' },
  { key: 'approval',        label: '10 согласования' },
  { key: 'template',        label: '14 шаблоны документов' },
  { key: 'other',           label: '15 прочее' },
]

// Лист-секции кабинета дизайнера (не сущности, а разделы профиля)
const DESIGNER_PROFILE_LEAVES: NavItem[] = [
  { key: 'dashboard',     label: 'Обзор',          icon: '◈' },
  { key: 'services',      label: 'Услуги и цены',   icon: '◎' },
  { key: 'packages',      label: 'Пакеты',          icon: '◑' },
  { key: 'subscriptions', label: 'Подписки',        icon: '⟳' },
  { key: 'profile',       label: 'Профиль',         icon: '◓' },
]

// Узлы кабинета дизайнера — связанные сущности
const DESIGNER_RELATION_NODES: NavItem[] = [
  { key: 'rel-projects',    label: 'Проекты',    icon: '◒', isNode: true },
  { key: 'rel-clients',     label: 'Клиенты',    icon: '◐', isNode: true },
  { key: 'rel-contractors', label: 'Подрядчики', icon: '◒', isNode: true },
  { key: 'rel-documents',   label: 'Документы',  icon: '○', isNode: true },
  { key: 'rel-gallery',     label: 'Галерея',    icon: '◉', isNode: true },
]

// Узлы кабинета проекта — категории внутри проекта
const PROJECT_CABINET_NODES: NavItem[] = [
  { key: 'proj-clients',     label: 'Клиенты',      icon: '◐', isNode: true },
  { key: 'proj-designers',   label: 'Дизайнеры',    icon: '◓', isNode: true },
  { key: 'proj-contractors', label: 'Подрядчики',   icon: '◒', isNode: true },
  { key: 'proj-documents',   label: 'Документы',    icon: '○', isNode: true },
  { key: 'proj-gallery',     label: 'Галерея',      icon: '◉', isNode: true },
  { key: 'proj-sellers',     label: 'Поставщики',   icon: '◑', isNode: true },
]

// Маршруты для секций
const SECTION_ROUTES: Record<string, string> = {
  projects:    '/admin',
  clients:     '/admin/clients',
  contractors: '/admin/contractors',
  designers:   '/admin/designers',
  sellers:     '/admin/sellers',
  documents:   '/admin/documents',
  gallery:     '/admin/gallery',
}

// ─── Node builders ────────────────────────────────────────────────────────────

function rootFrame(): StackFrame {
  return {
    key: 'root',
    type: 'root',
    ctx: {},
    node: { key: 'root', title: 'главное меню', items: ROOT_ITEMS },
  }
}

function buildEntityItems(section: string, data: any[]): NavItem[] {
  switch (section) {
    case 'projects':
      return data.map(p => ({ key: p.slug, label: p.title, sub: p.status, isNode: true }))
    case 'clients':
      return data.map(c => ({
        key: String(c.id), label: c.name,
        sub: c.linkedProjects?.map((p: any) => p.title).join(', '),
        isNode: false,
      }))
    case 'contractors':
      return data.map(c => ({
        key: String(c.id), label: c.name,
        sub: c.workTypes?.join(', ') || c.companyName,
        isNode: false,
      }))
    case 'designers':
      return data.map(d => ({ key: String(d.id), label: d.name, sub: d.city, isNode: true }))
    case 'sellers':
      return data.map(s => ({ key: String(s.id), label: s.name, sub: s.city, isNode: false }))
    default:
      return []
  }
}

// ─── Content derivation ───────────────────────────────────────────────────────

function deriveContent(frame: StackFrame, activeKey?: string): ContentSpec {
  const { type, ctx } = frame

  if (type === 'root') return { view: 'empty' }

  if (type === 'reg') {
    if (ctx.section === 'gallery')
      return { view: 'gallery', galleryCategory: activeKey || 'interiors' }
    if (ctx.section === 'documents')
      return { view: 'documents', documentCategory: activeKey || 'all' }
    if (!activeKey) return { view: 'section', section: ctx.section }
    switch (ctx.section) {
      case 'designers':   return { view: 'designer',   designerId:    Number(activeKey) }
      case 'projects':    return { view: 'project',    projectSlug:   activeKey }
      case 'clients':     return { view: 'client',     clientId:      Number(activeKey) }
      case 'contractors': return { view: 'contractor', contractorId:  Number(activeKey) }
      case 'sellers':     return { view: 'seller',     sellerId:      Number(activeKey) }
    }
  }

  if (type === 'cab-designer')
    return { view: 'designer', designerId: ctx.designerId, designerSection: activeKey }

  if (type === 'cab-project')
    return { view: 'project', projectSlug: ctx.projectSlug }

  if (type === 'reg-ctx') {
    // Deep context: what was arrived-at
    if (ctx.projectSlug)   return { view: 'project', projectSlug: ctx.projectSlug }
    if (ctx.designerId)    return { view: 'designer', designerId: ctx.designerId }
  }

  return { view: 'empty' }
}

// ─── Main composable ──────────────────────────────────────────────────────────

export const useAdminNav = () => {
  const stack    = useState<StackFrame[]>('adm-nav-stack',  () => [rootFrame()])
  const slideDir = useState<'fwd' | 'back'>('adm-nav-dir', () => 'fwd')
  const activeKey= useState<string | undefined>('adm-nav-active', () => undefined)
  const loading  = ref(false)

  const currentFrame  = computed(() => stack.value.at(-1)!)
  const currentNode   = computed(() => currentFrame.value.node)
  const canGoBack     = computed(() => stack.value.length > 1)
  const backLabel     = computed(() => stack.value.at(-2)?.node.title ?? '')
  const contentSpec   = computed<ContentSpec>(() => deriveContent(currentFrame.value, activeKey.value))

  // ── drill ─────────────────────────────────────────────────────────────────────
  async function drill(item: NavItem) {
    slideDir.value = 'fwd'
    loading.value = true
    try {
      const frame = await buildNextFrame(currentFrame.value, item)
      if (frame) {
        stack.value = [...stack.value, frame]
        activeKey.value = undefined
      }
    } finally {
      loading.value = false
    }
  }

  // ── back ──────────────────────────────────────────────────────────────────────
  function back() {
    if (stack.value.length <= 1) return
    slideDir.value = 'back'
    stack.value = stack.value.slice(0, -1)
    activeKey.value = undefined
  }

  // ── select ────────────────────────────────────────────────────────────────────
  function select(item: NavItem) {
    activeKey.value = item.key
  }

  // ── Sync nav to route (called by each page on mount) ──────────────────────────
  // If top of stack is already inside this section → no change (preserve depth)
  // If at root or different section → push section registry
  async function ensureSection(section: string) {
    const top = currentFrame.value
    if (top.ctx.section === section) return  // already there
    if (top.type !== 'root') {
      // Reset to root first, then push
      stack.value = [rootFrame()]
      activeKey.value = undefined
    }
    // Push section registry
    const item = ROOT_ITEMS.find(s => s.key === section)
    if (item) await drill(item)
  }

  function goRoot() {
    slideDir.value = 'back'
    stack.value = [rootFrame()]
    activeKey.value = undefined
  }

  return {
    currentNode,
    currentFrame,
    canGoBack,
    backLabel,
    slideDir: computed(() => slideDir.value),
    activeKey: computed(() => activeKey.value),
    loading: readonly(loading),
    contentSpec,
    drill,
    back,
    select,
    ensureSection,
    goRoot,
    stack: readonly(stack),
  }
}

// ─── Async frame builder ──────────────────────────────────────────────────────

async function buildNextFrame(current: StackFrame, item: NavItem): Promise<StackFrame | null> {
  const router = useRouter()
  const ctx: NavContext = { ...current.ctx }

  // ─── ROOT → section registry ───────────────────────────────────────────────
  if (current.type === 'root') {
    ctx.section = item.key

    if (item.key === 'gallery') {
      router.push('/admin/gallery')
      return {
        key: 'reg-gallery',
        type: 'reg',
        ctx,
        node: { key: 'reg-gallery', title: 'галерея', items: GALLERY_ITEMS },
      }
    }

    if (item.key === 'documents') {
      router.push('/admin/documents')
      return {
        key: 'reg-documents',
        type: 'reg',
        ctx,
        node: { key: 'reg-documents', title: 'документы', items: DOC_CATEGORY_ITEMS },
      }
    }

    const urlMap: Record<string, string> = {
      projects: '/api/projects', clients: '/api/clients',
      contractors: '/api/contractors', designers: '/api/designers',
      sellers: '/api/sellers',
    }
    const apiUrl = urlMap[item.key]
    if (!apiUrl) return null

    const sectionPath = SECTION_ROUTES[item.key]
    if (sectionPath) router.push(sectionPath)
    const data = await $fetch<any[]>(apiUrl).catch(() => [])
    const items = buildEntityItems(item.key, data)

    return {
      key: `reg-${item.key}`,
      type: 'reg',
      ctx,
      node: { key: `reg-${item.key}`, title: item.label, count: items.length, items },
    }
  }

  // ─── REG → entity cabinet / drill ─────────────────────────────────────────
  if (current.type === 'reg') {
    const section = ctx.section

    if (section === 'gallery') {
      // Gallery items are leaves — select, not drill
      return null
    }

    if (section === 'documents') {
      // Doc categories are leaves — select
      return null
    }

    if (section === 'designers') {
      ctx.designerId   = Number(item.key)
      ctx.designerName = item.label
      router.push('/admin/designers')

      const items: NavItem[] = [
        ...DESIGNER_PROFILE_LEAVES,
        ...DESIGNER_RELATION_NODES,
      ]
      return {
        key: `cab-designer-${item.key}`,
        type: 'cab-designer',
        ctx,
        node: { key: `cab-designer-${item.key}`, title: item.label, items },
      }
    }

    if (section === 'projects') {
      ctx.projectSlug  = item.key
      ctx.projectTitle = item.label
      // Full project page has its own UI — navigate to it
      router.push(`/admin/projects/${item.key}`)
      return null
    }

    if (section === 'clients') {
      ctx.clientId = Number(item.key)
      router.push('/admin/clients')
      return null // content area shows client detail
    }

    if (section === 'contractors') {
      ctx.contractorId = Number(item.key)
      router.push('/admin/contractors')
      return null
    }

    if (section === 'sellers') {
      ctx.sellerId = Number(item.key)
      router.push('/admin/sellers')
      return null
    }

    return null
  }

  // ─── CAB-DESIGNER → related entity registry ───────────────────────────────
  if (current.type === 'cab-designer') {
    const designerId   = ctx.designerId!
    const designerName = ctx.designerName || `#${designerId}`
    const rel = item.key.replace('rel-', '') // 'projects' | 'clients' | 'contractors' | 'documents' | 'gallery'
    ctx.section = rel

    if (rel === 'projects') {
      const allProjects = await $fetch<any[]>('/api/projects').catch(() => [])
      // TODO: filter by designer when API supports ?designerId=
      const items: NavItem[] = allProjects.map(p => ({
        key: p.slug, label: p.title, sub: p.status, isNode: true,
      }))
      return {
        key: `reg-projects-of-${designerId}`,
        type: 'reg-ctx',
        ctx,
        node: { key: `reg-projects-of-${designerId}`, title: `Проекты (${designerName})`, count: items.length, items },
      }
    }

    if (rel === 'clients') {
      const clients = await $fetch<any[]>('/api/clients').catch(() => [])
      const items: NavItem[] = clients.map(c => ({
        key: String(c.id), label: c.name,
        sub: c.linkedProjects?.map((p: any) => p.title).join(', '),
        isNode: false,
      }))
      return {
        key: `reg-clients-of-${designerId}`,
        type: 'reg-ctx',
        ctx,
        node: { key: `reg-clients-of-${designerId}`, title: `Клиенты (${designerName})`, count: items.length, items },
      }
    }

    if (rel === 'contractors') {
      const contractors = await $fetch<any[]>('/api/contractors').catch(() => [])
      const items: NavItem[] = contractors.map(c => ({
        key: String(c.id), label: c.name,
        sub: c.workTypes?.join(', ') || c.companyName,
        isNode: false,
      }))
      return {
        key: `reg-contractors-of-${designerId}`,
        type: 'reg-ctx',
        ctx,
        node: { key: `reg-contractors-of-${designerId}`, title: `Подрядчики (${designerName})`, count: items.length, items },
      }
    }

    if (rel === 'documents') {
      const docs = await $fetch<any[]>('/api/documents').catch(() => [])
      const items: NavItem[] = docs.map(d => ({
        key: String(d.id), label: d.title, sub: d.projectTitle, isNode: false,
      }))
      return {
        key: `reg-docs-of-${designerId}`,
        type: 'reg-ctx',
        ctx,
        node: { key: `reg-docs-of-${designerId}`, title: `Документы (${designerName})`, count: items.length, items },
      }
    }

    if (rel === 'gallery') {
      return {
        key: `reg-gallery-of-${designerId}`,
        type: 'reg-ctx',
        ctx,
        node: { key: `reg-gallery-of-${designerId}`, title: `Галерея (${designerName})`, items: GALLERY_ITEMS },
      }
    }

    return null
  }

  // ─── REG-CTX: projects list (in designer context) → project cabinet ────────
  if (current.type === 'reg-ctx' && ctx.section === 'projects') {
    ctx.projectSlug  = item.key
    ctx.projectTitle = item.label

    return {
      key: `cab-project-${item.key}`,
      type: 'cab-project',
      ctx,
      node: {
        key: `cab-project-${item.key}`,
        title: item.label,
        items: PROJECT_CABINET_NODES,
      },
    }
  }

  // ─── CAB-PROJECT → category lists within project ──────────────────────────
  if (current.type === 'cab-project') {
    const projectSlug  = ctx.projectSlug!
    const projectTitle = ctx.projectTitle || projectSlug
    const cat = item.key.replace('proj-', '')
    ctx.section = cat

    if (cat === 'documents') {
      const docs = await $fetch<any[]>(`/api/documents?projectSlug=${projectSlug}`).catch(() => [])
      const items: NavItem[] = docs.map(d => ({
        key: String(d.id), label: d.title, sub: d.category, isNode: false,
      }))
      return {
        key: `reg-docs-in-${projectSlug}`,
        type: 'reg-ctx',
        ctx,
        node: { key: `reg-docs-in-${projectSlug}`, title: `Документы (${projectTitle})`, count: items.length, emptyText: 'документов нет', items },
      }
    }

    if (cat === 'clients') {
      const clients = await $fetch<any[]>(`/api/clients?projectSlug=${projectSlug}`).catch(() => [])
      const items: NavItem[] = clients.map(c => ({ key: String(c.id), label: c.name, isNode: false }))
      return {
        key: `reg-clients-in-${projectSlug}`,
        type: 'reg-ctx',
        ctx,
        node: { key: `reg-clients-in-${projectSlug}`, title: `Клиенты (${projectTitle})`, count: items.length, items },
      }
    }

    if (cat === 'contractors') {
      const contractors = await $fetch<any[]>(`/api/contractors?projectSlug=${projectSlug}`).catch(() => [])
      const items: NavItem[] = contractors.map(c => ({ key: String(c.id), label: c.name, sub: c.workTypes?.join(', '), isNode: false }))
      return {
        key: `reg-contractors-in-${projectSlug}`,
        type: 'reg-ctx',
        ctx,
        node: { key: `reg-contractors-in-${projectSlug}`, title: `Подрядчики (${projectTitle})`, count: items.length, items },
      }
    }

    if (cat === 'designers') {
      // /api/projects/[slug]/designers
      const data = await $fetch<any[]>(`/api/projects/${projectSlug}/designers`).catch(() => [])
      const items: NavItem[] = data.map((d: any) => ({ key: String(d.id ?? d.designerId), label: d.name ?? d.designerName, isNode: false }))
      return {
        key: `reg-designers-in-${projectSlug}`,
        type: 'reg-ctx',
        ctx,
        node: { key: `reg-designers-in-${projectSlug}`, title: `Дизайнеры (${projectTitle})`, count: items.length, items },
      }
    }

    if (cat === 'gallery') {
      return {
        key: `reg-gallery-in-${projectSlug}`,
        type: 'reg-ctx',
        ctx,
        node: { key: `reg-gallery-in-${projectSlug}`, title: `Галерея (${projectTitle})`, items: GALLERY_ITEMS },
      }
    }

    if (cat === 'sellers') {
      const sellers = await $fetch<any[]>('/api/sellers').catch(() => [])
      // TODO: filter by project when API supports it
      const items: NavItem[] = sellers.map(s => ({ key: String(s.id), label: s.name, sub: s.city, isNode: false }))
      return {
        key: `reg-sellers-in-${projectSlug}`,
        type: 'reg-ctx',
        ctx,
        node: { key: `reg-sellers-in-${projectSlug}`, title: `Поставщики (${projectTitle})`, count: items.length, items },
      }
    }

    return null
  }

  return null
}
