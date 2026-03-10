/**
 * useAdminNav — глобальный composable навигации
 * Полностью реализует NavigationNode schema (shared/types/navigation.ts)
 *
 * Стек состоит из двух параллельных массивов:
 *   nodeStack — NavigationNode[] для отображения (AdminNestedNav)
 *   ctxStack  — NavCtx[] для бизнес-логики (contentSpec)
 */

import type { NavigationNode, PayloadItem } from '~/shared/types/navigation'

interface NavCtx {
  section: string
  designerId?: number
  designerName?: string
  clientId?: number
  clientName?: string
  contractorId?: number
  contractorName?: string
  sellerId?: number
  sellerName?: string
  projectSlug?: string
  projectTitle?: string
}

export interface ContentSpec {
  section: string
  designerId: number | null
  designerSection: string | null
  clientId: number | null
  contractorId: number | null
  sellerId: number | null
  projectSlug: string | null
  projectSection: string | null
  galleryCategory: string | null
  documentCategory: string | null
  activeLeafId: string | null
}

function rootNode(): NavigationNode {
  return {
    step: 'A',
    nodeId: 'root',
    nodeType: 'system_root',
    context: { title: 'меню', breadcrumbs: ['меню'] },
    filter: { placeholder: 'поиск...', value: '' },
    payload: [
      { id: 'cat_projects',    name: 'Проекты',     type: 'node' },
      { id: 'cat_clients',     name: 'Клиенты',     type: 'node' },
      { id: 'cat_designers',   name: 'Дизайнеры',   type: 'node' },
      { id: 'cat_contractors', name: 'Подрядчики',  type: 'node' },
      { id: 'cat_sellers',     name: 'Поставщики',  type: 'node' },
      { id: 'cat_managers',    name: 'Менеджеры',   type: 'node' },
      { id: 'cat_docs',        name: 'Документы',   type: 'node' },
      { id: 'cat_gallery',     name: 'Галереи',     type: 'node' },
      { id: 'cat_moodboards',  name: 'Мудборды',    type: 'node' },
      { id: 'cat_tariffs',     name: 'Тарифы',      type: 'node' },
    ],
  }
}

const SECTION_ROUTES: Record<string, string> = {
  cat_projects:    '/admin',
  cat_clients:     '/admin/clients',
  cat_designers:   '/admin/designers',
  cat_contractors: '/admin/contractors',
  cat_sellers:     '/admin/sellers',
  cat_docs:        '/admin/documents',
  cat_gallery:     '/admin/gallery',
}

const DESIGNER_CABINET_ITEMS: PayloadItem[] = [
  { id: 'des_dashboard',     name: 'Обзор',         type: 'leaf' },
  { id: 'des_services',      name: 'Услуги и цены', type: 'leaf' },
  { id: 'des_packages',      name: 'Пакеты',        type: 'leaf' },
  { id: 'des_subscriptions', name: 'Подписки',      type: 'leaf' },
  { id: 'des_projects',      name: 'Проекты',       type: 'leaf' },
  { id: 'des_clients',       name: 'Клиенты',       type: 'leaf' },
  { id: 'des_contractors',   name: 'Подрядчики',    type: 'leaf' },
  { id: 'des_sellers',       name: 'Продавцы',      type: 'leaf' },
  { id: 'des_managers',      name: 'Менеджеры',     type: 'leaf' },
  { id: 'des_documents',     name: 'Документы',     type: 'leaf' },
  { id: 'des_gallery',       name: 'Галерея',       type: 'leaf' },
  { id: 'des_moodboards',    name: 'Мудборды',      type: 'leaf' },
  { id: 'des_profile',       name: 'Профиль',       type: 'leaf' },
]

const CLIENT_CABINET_ITEMS: PayloadItem[] = [
  { id: 'cli_dashboard',  name: 'Обзор',      type: 'leaf' },
  { id: 'cli_profile',    name: 'Профиль',    type: 'leaf' },
  { id: 'cli_signoff',    name: 'Подписание', type: 'leaf' },
  { id: 'cli_projects',   name: 'Проекты',    type: 'node' },
  { id: 'cli_documents',  name: 'Документы',  type: 'node' },
]

const CONTRACTOR_CABINET_ITEMS: PayloadItem[] = [
  { id: 'con_dashboard',  name: 'Обзор',      type: 'leaf' },
  { id: 'con_profile',    name: 'Профиль',    type: 'leaf' },
  { id: 'con_projects',   name: 'Проекты',    type: 'node' },
  { id: 'con_documents',  name: 'Документы',  type: 'node' },
]

const SELLER_CABINET_ITEMS: PayloadItem[] = [
  { id: 'sel_dashboard',  name: 'Обзор',      type: 'leaf' },
  { id: 'sel_profile',    name: 'Профиль',    type: 'leaf' },
  { id: 'sel_products',   name: 'Каталог',    type: 'leaf' },
  { id: 'sel_projects',   name: 'Проекты',    type: 'node' },
]

// Кабинет проекта — узлы верхнего уровня (alpha_*)
const PROJECT_CABINET_ITEMS: PayloadItem[] = [
  { id: 'alpha_phases',      name: 'Фазы (прогресс проекта)', type: 'node' },
  { id: 'alpha_clients',     name: 'Клиенты',                  type: 'node' },
  { id: 'alpha_contractors', name: 'Подрядчики',                type: 'node' },
  { id: 'alpha_sellers',     name: 'Поставщики',                type: 'node' },
  { id: 'alpha_designers',   name: 'Дизайнеры',                 type: 'node' },
  { id: 'alpha_managers',    name: 'Менеджеры',                 type: 'node' },
  { id: 'alpha_docs',        name: 'Документы',                 type: 'node' },
  { id: 'alpha_gallery',     name: 'Галереи',                   type: 'node' },
  { id: 'alpha_moodboards',  name: 'Мудборды',                  type: 'node' },
  { id: 'alpha_tariff',      name: 'Тариф',                     type: 'node' },
]

// Фазы проекта — листья (привязаны к компонентам страницы)
const PHASES_ITEMS: PayloadItem[] = [
  { id: 'prj_overview',      name: 'Обзор',                  type: 'leaf' },
  { id: 'prj_firstcontact',  name: 'Первый контакт',         type: 'leaf' },
  { id: 'prj_smartbrief',    name: 'Смарт-бриф / ТЗ',        type: 'leaf' },
  { id: 'prj_concept',       name: 'Концепция',               type: 'leaf' },
  { id: 'prj_spaceplanning', name: 'Планировочное решение',   type: 'leaf' },
  { id: 'prj_moodboard',     name: 'Мудборд',                 type: 'leaf' },
  { id: 'prj_plan',          name: 'Строительный план',       type: 'leaf' },
  { id: 'prj_drawings',      name: 'Рабочие чертежи',         type: 'leaf' },
  { id: 'prj_mep',           name: 'MEP-интеграция',          type: 'leaf' },
  { id: 'prj_materials',     name: 'Материалы',               type: 'leaf' },
  { id: 'prj_procurement',   name: 'Закупки',                 type: 'leaf' },
  { id: 'prj_workstatus',    name: 'Строительные работы',     type: 'leaf' },
  { id: 'prj_sitephotos',    name: 'Фото объекта',            type: 'leaf' },
  { id: 'prj_punchlist',     name: 'Замечания (punch-list)',  type: 'leaf' },
  { id: 'prj_commissioning', name: 'Акт ввода',               type: 'leaf' },
  { id: 'prj_album',         name: 'Финальный альбом',        type: 'leaf' },
  { id: 'prj_extraservices', name: 'Доп. услуги',             type: 'leaf' },
]

const DOCUMENT_ITEMS: PayloadItem[] = [
  { id: 'doc_all',             name: 'Все документы',                type: 'leaf' },
  { id: 'doc_contract',        name: '01 Договоры дизайн-проект',    type: 'leaf' },
  { id: 'doc_contract_supply', name: '02 Договоры поставки',         type: 'leaf' },
  { id: 'doc_contract_work',   name: '03 Договоры подряда',          type: 'leaf' },
  { id: 'doc_act',             name: '04 Акты выполненных работ',    type: 'leaf' },
  { id: 'doc_act_defect',      name: '05 Акты о дефектах',           type: 'leaf' },
  { id: 'doc_invoice',         name: '06 Счета на оплату',           type: 'leaf' },
  { id: 'doc_estimate',        name: '07 Сметы',                     type: 'leaf' },
  { id: 'doc_specification',   name: '08 Спецификации',              type: 'leaf' },
  { id: 'doc_tz',              name: '09 Техническое задание',       type: 'leaf' },
  { id: 'doc_approval',        name: '10 Согласования',              type: 'leaf' },
  { id: 'doc_template',        name: '14 Шаблоны',                   type: 'leaf' },
  { id: 'doc_other',           name: '15 Прочее',                    type: 'leaf' },
]

const GALLERY_ITEMS: PayloadItem[] = [
  { id: 'gal_interiors',  name: 'Интерьеры',   type: 'leaf' },
  { id: 'gal_furniture',  name: 'Мебель',       type: 'leaf' },
  { id: 'gal_moodboards', name: 'Мудборды',     type: 'leaf' },
  { id: 'gal_materials',  name: 'Материалы',    type: 'leaf' },
  { id: 'gal_art',        name: 'Арт и декор',  type: 'leaf' },
]

// ─── Composable ───────────────────────────────────────────────────────────────
export function useAdminNav() {
  const router = useRouter()

  const nodeStack    = useState<NavigationNode[]>('nav-v2-nodes', () => [rootNode()])
  const ctxStack     = useState<NavCtx[]>('nav-v2-ctx',  () => [{ section: '' }])
  const activeLeafId = useState<string | undefined>('nav-v2-leaf', () => undefined)
  const slideDir     = useState<'fwd' | 'back'>('nav-v2-dir', () => 'fwd')
  const loading      = ref(false)

  const currentNode = computed<NavigationNode>(() => nodeStack.value[nodeStack.value.length - 1])
  const currentCtx  = computed<NavCtx>(() => ctxStack.value[ctxStack.value.length - 1])
  const canGoBack   = computed(() => nodeStack.value.length > 1)

  const contentSpec = computed<ContentSpec>(() => {
    const ctx  = currentCtx.value
    const leaf = activeLeafId.value ?? ''
    return {
      section:          ctx.section,
      designerId:       ctx.designerId ?? null,
      designerSection:  leaf.startsWith('des_') ? leaf.replace('des_', '') : null,
      clientId:         ctx.clientId ?? null,
      contractorId:     ctx.contractorId ?? null,
      sellerId:         ctx.sellerId ?? null,
      projectSlug:      ctx.projectSlug ?? null,
      projectSection:   leaf.startsWith('prj_') ? leaf.replace('prj_', '') : null,
      galleryCategory:  leaf.startsWith('gal_') ? leaf.replace('gal_', '') : null,
      documentCategory: leaf.startsWith('doc_') ? leaf.replace('doc_', '') : null,
      activeLeafId:     activeLeafId.value ?? null,
    }
  })

  async function drill(item: PayloadItem) {
    if (item.type !== 'node') return
    loading.value = true
    slideDir.value = 'fwd'
    try {
      const result = await buildNextNode(currentNode.value, currentCtx.value, item, router)
      if (!result) return
      nodeStack.value = [...nodeStack.value, result.node]
      ctxStack.value  = [...ctxStack.value,  result.ctx]
      activeLeafId.value = undefined
    } finally {
      loading.value = false
    }
  }

  function back() {
    if (nodeStack.value.length <= 1) return
    slideDir.value = 'back'
    nodeStack.value = nodeStack.value.slice(0, -1)
    ctxStack.value  = ctxStack.value.slice(0, -1)
    activeLeafId.value = undefined
  }

  function select(item: PayloadItem) {
    activeLeafId.value = item.id
  }

  function goRoot() {
    slideDir.value = 'back'
    nodeStack.value = [rootNode()]
    ctxStack.value  = [{ section: '' }]
    activeLeafId.value = undefined
  }

  async function ensureSection(sectionKey: string) {
    const catId = `cat_${sectionKey}`
    if (currentCtx.value.section === sectionKey) return
    nodeStack.value = [rootNode()]
    ctxStack.value  = [{ section: '' }]
    activeLeafId.value = undefined
    const item = rootNode().payload.find(p => p.id === catId)
    if (item) await drill(item)
  }

  return {
    currentNode,
    canGoBack,
    slideDir:     computed(() => slideDir.value),
    activeLeafId: computed(() => activeLeafId.value),
    loading:      readonly(loading),
    contentSpec,
    drill,
    back,
    select,
    goRoot,
    ensureSection,
    nodeStack: readonly(nodeStack),
  }
}

// ─── Node builder (вне composable — не привязан к instance) ──────────────────
async function buildNextNode(
  current: NavigationNode,
  ctx: NavCtx,
  item: PayloadItem,
  router: ReturnType<typeof useRouter>,
): Promise<{ node: NavigationNode; ctx: NavCtx } | null> {
  const newCtx: NavCtx = { ...ctx }
  const crumbs = [...current.context.breadcrumbs]

  // ── ROOT → registry секций ────────────────────────────────────────────────
  if (current.nodeId === 'root') {
    newCtx.section = item.id.replace('cat_', '')
    const route = SECTION_ROUTES[item.id]
    if (route) router.push(route)

    if (item.id === 'cat_docs') {
      return { ctx: newCtx, node: {
        step: 'B', nodeId: 'reg_documents', nodeType: 'registry',
        context: { title: 'Документы', breadcrumbs: [...crumbs, 'Документы'] },
        filter: { placeholder: 'Поиск по типу документа...', value: '' },
        payload: DOCUMENT_ITEMS,
      }}
    }
    if (item.id === 'cat_gallery') {
      return { ctx: newCtx, node: {
        step: 'B', nodeId: 'reg_gallery', nodeType: 'registry',
        context: { title: 'Галереи', breadcrumbs: [...crumbs, 'Галереи'] },
        filter: { placeholder: 'Поиск по разделу...', value: '' },
        payload: GALLERY_ITEMS,
      }}
    }
    if (item.id === 'cat_moodboards') {
      return { ctx: newCtx, node: {
        step: 'B', nodeId: 'reg_moodboards', nodeType: 'registry',
        context: { title: 'Мудборды', breadcrumbs: [...crumbs, 'Мудборды'] },
        filter: { placeholder: 'Поиск по мудбордам...', value: '' },
        payload: GALLERY_ITEMS.filter(g => g.id === 'gal_moodboards'),
      }}
    }
    // cat_managers, cat_tariffs — заглушки до появления API
    if (item.id === 'cat_managers' || item.id === 'cat_tariffs') {
      const title = item.id === 'cat_managers' ? 'Менеджеры' : 'Тарифы'
      return { ctx: newCtx, node: {
        step: 'B', nodeId: `reg_${newCtx.section}`, nodeType: 'registry',
        context: { title, breadcrumbs: [...crumbs, title] },
        filter: { placeholder: `Поиск по ${title.toLowerCase()}...`, value: '' },
        payload: [],
      }}
    }

    const apiMap: Record<string, string> = {
      cat_projects:    '/api/projects',
      cat_designers:   '/api/designers',
      cat_clients:     '/api/clients',
      cat_contractors: '/api/contractors',
      cat_sellers:     '/api/sellers',
    }
    const titleMap: Record<string, string> = {
      cat_projects: 'Проекты', cat_designers: 'Дизайнеры', cat_clients: 'Клиенты',
      cat_contractors: 'Подрядчики', cat_sellers: 'Поставщики',
    }
    const api = apiMap[item.id]
    if (!api) return null
    const data = await $fetch<any[]>(api).catch(() => [])
    const title = titleMap[item.id] ?? newCtx.section
    return { ctx: newCtx, node: {
      step: 'B', nodeId: `reg_${newCtx.section}`, nodeType: 'registry',
      context: { title, breadcrumbs: [...crumbs, title] },
      filter: { placeholder: `Поиск по ${title.toLowerCase()}...`, value: '' },
      payload: data.map((e: any) => ({
        id: String(e.id ?? e.slug),
        name: e.name ?? e.title ?? e.slug ?? String(e.id),
        type: 'node' as const,
      })),
    }}
  }

  // ── REGISTRY → cabinet ────────────────────────────────────────────────────
  if (current.nodeType === 'registry') {
    const section = newCtx.section

    if (section === 'designers') {
      newCtx.designerId   = Number(item.id)
      newCtx.designerName = item.name
      router.push('/admin/designers')
      return { ctx: newCtx, node: {
        step: 'C', nodeId: `cab_designer_${item.id}`, nodeType: 'cabinet',
        context: { title: item.name, breadcrumbs: [...crumbs, item.name] },
        filter: { placeholder: 'Поиск по разделам...', value: '' },
        payload: DESIGNER_CABINET_ITEMS,
      }}
    }
    if (section === 'clients') {
      newCtx.clientId   = Number(item.id)
      newCtx.clientName = item.name
      router.push('/admin/clients')
      return { ctx: newCtx, node: {
        step: 'C', nodeId: `cab_client_${item.id}`, nodeType: 'cabinet',
        context: { title: item.name, breadcrumbs: [...crumbs, item.name] },
        filter: { placeholder: 'Поиск по разделам...', value: '' },
        payload: CLIENT_CABINET_ITEMS,
      }}
    }
    if (section === 'contractors') {
      newCtx.contractorId   = Number(item.id)
      newCtx.contractorName = item.name
      router.push('/admin/contractors')
      return { ctx: newCtx, node: {
        step: 'C', nodeId: `cab_contractor_${item.id}`, nodeType: 'cabinet',
        context: { title: item.name, breadcrumbs: [...crumbs, item.name] },
        filter: { placeholder: 'Поиск по разделам...', value: '' },
        payload: CONTRACTOR_CABINET_ITEMS,
      }}
    }
    if (section === 'sellers') {
      newCtx.sellerId   = Number(item.id)
      newCtx.sellerName = item.name
      router.push('/admin/sellers')
      return { ctx: newCtx, node: {
        step: 'C', nodeId: `cab_seller_${item.id}`, nodeType: 'cabinet',
        context: { title: item.name, breadcrumbs: [...crumbs, item.name] },
        filter: { placeholder: 'Поиск по разделам...', value: '' },
        payload: SELLER_CABINET_ITEMS,
      }}
    }
    if (section === 'projects') {
      newCtx.projectSlug  = item.id
      newCtx.projectTitle = item.name
      router.push(`/admin/projects/${item.id}`)
      return { ctx: newCtx, node: {
        step: 'C', nodeId: `cab_project_${item.id}`, nodeType: 'project_root',
        context: { title: item.name, breadcrumbs: [...crumbs, item.name] },
        filter: { placeholder: 'Поиск по разделам проекта...', value: '' },
        payload: PROJECT_CABINET_ITEMS,
      }}
    }
    return null
  }

  // ── PROJECT_ROOT → фазы и вложенные реестры (alpha_* prefix) ──────────────
  if (current.nodeType === 'project_root') {
    const sub = item.id.replace(/^alpha_/, '')

    if (sub === 'phases') {
      return { ctx: newCtx, node: {
        step: 'F', nodeId: `reg_phases_${current.nodeId}`, nodeType: 'registry',
        context: { title: `Фазы — ${current.context.title}`, breadcrumbs: [...crumbs, 'Фазы'] },
        filter: { placeholder: 'Поиск по фазам проекта...', value: '' },
        payload: PHASES_ITEMS,
      }}
    }
    if (sub === 'docs') {
      return { ctx: newCtx, node: {
        step: 'F', nodeId: `reg_docs_${current.nodeId}`, nodeType: 'registry',
        context: { title: `Документы — ${current.context.title}`, breadcrumbs: [...crumbs, 'Документы'] },
        filter: { placeholder: 'Поиск по типу документа...', value: '' },
        payload: DOCUMENT_ITEMS,
      }}
    }
    if (sub === 'gallery') {
      return { ctx: newCtx, node: {
        step: 'F', nodeId: `reg_gallery_${current.nodeId}`, nodeType: 'registry',
        context: { title: `Галереи — ${current.context.title}`, breadcrumbs: [...crumbs, 'Галереи'] },
        filter: { placeholder: 'Поиск по разделу...', value: '' },
        payload: GALLERY_ITEMS,
      }}
    }
    if (sub === 'moodboards') {
      return { ctx: newCtx, node: {
        step: 'F', nodeId: `reg_moodboards_${current.nodeId}`, nodeType: 'registry',
        context: { title: `Мудборды — ${current.context.title}`, breadcrumbs: [...crumbs, 'Мудборды'] },
        filter: { placeholder: 'Поиск по мудбордам...', value: '' },
        payload: GALLERY_ITEMS.filter(g => g.id === 'gal_moodboards'),
      }}
    }
    if (sub === 'tariff' || sub === 'managers') {
      const title = sub === 'tariff' ? 'Тариф' : 'Менеджеры'
      return { ctx: newCtx, node: {
        step: 'F', nodeId: `reg_${sub}_${current.nodeId}`, nodeType: 'registry',
        context: { title: `${title} — ${current.context.title}`, breadcrumbs: [...crumbs, title] },
        filter: { placeholder: `Поиск по ${title.toLowerCase()}...`, value: '' },
        payload: [],
      }}
    }
    // Субъекты проекта (clients/contractors/sellers/designers) → реестр из API
    const prjSubApi: Record<string, string> = {
      clients: '/api/clients', contractors: '/api/contractors',
      sellers: '/api/sellers', designers: '/api/designers',
    }
    const prjSubTitle: Record<string, string> = {
      clients: 'Клиенты', contractors: 'Подрядчики',
      sellers: 'Поставщики', designers: 'Дизайнеры',
    }
    const prjApi = prjSubApi[sub]
    if (prjApi) {
      const data = await $fetch<any[]>(prjApi).catch(() => [])
      const title = prjSubTitle[sub] ?? sub
      return {
        ctx: { ...newCtx, section: sub },
        node: {
          step: 'F', nodeId: `reg_${sub}_${current.nodeId}`, nodeType: 'registry',
          context: { title: `${title} — ${current.context.title}`, breadcrumbs: [...crumbs, title] },
          filter: { placeholder: `Поиск по ${title.toLowerCase()}...`, value: '' },
          payload: data.map((e: any) => ({
            id: String(e.id ?? e.slug),
            name: e.name ?? e.title ?? e.slug ?? String(e.id),
            type: 'node' as const,
          })),
        },
      }
    }
    return null
  }

  // ── CABINET → вложенные реестры (des_|cli_|con_|sel_| prefix) ────────────
  if (current.nodeType === 'cabinet') {
    const sub = item.id.replace(/^(des_|cli_|con_|sel_)/, '')

    if (sub === 'documents') {
      return { ctx: newCtx, node: {
        step: 'D', nodeId: `reg_docs_${current.nodeId}`, nodeType: 'registry',
        context: { title: `Документы — ${current.context.title}`, breadcrumbs: [...crumbs, 'Документы'] },
        filter: { placeholder: 'Поиск по типу...', value: '' },
        payload: DOCUMENT_ITEMS,
      }}
    }
    if (sub === 'gallery') {
      return { ctx: newCtx, node: {
        step: 'D', nodeId: `reg_gallery_${current.nodeId}`, nodeType: 'registry',
        context: { title: `Галереи — ${current.context.title}`, breadcrumbs: [...crumbs, 'Галереи'] },
        filter: { placeholder: 'Поиск по разделу...', value: '' },
        payload: GALLERY_ITEMS,
      }}
    }
    if (sub === 'moodboards') {
      return { ctx: newCtx, node: {
        step: 'D', nodeId: `reg_moodboards_${current.nodeId}`, nodeType: 'registry',
        context: { title: `Мудборды — ${current.context.title}`, breadcrumbs: [...crumbs, 'Мудборды'] },
        filter: { placeholder: 'Поиск по мудбордам...', value: '' },
        payload: GALLERY_ITEMS.filter(g => g.id === 'gal_moodboards'),
      }}
    }
    if (sub === 'managers') {
      return { ctx: newCtx, node: {
        step: 'D', nodeId: `reg_managers_${current.nodeId}`, nodeType: 'registry',
        context: { title: `Менеджеры — ${current.context.title}`, breadcrumbs: [...crumbs, 'Менеджеры'] },
        filter: { placeholder: 'Поиск по менеджерам...', value: '' },
        payload: [],
      }}
    }

    const relApi: Record<string, string> = {
      projects: '/api/projects', clients: '/api/clients', designers: '/api/designers',
      contractors: '/api/contractors', sellers: '/api/sellers',
    }
    const relTitle: Record<string, string> = {
      projects: 'Проекты', clients: 'Клиенты', designers: 'Дизайнеры',
      contractors: 'Подрядчики', sellers: 'Поставщики',
    }
    const api = relApi[sub]
    if (!api) return null
    const data = await $fetch<any[]>(api).catch(() => [])
    const title = relTitle[sub] ?? sub
    return {
      ctx: { ...newCtx, section: sub },
      node: {
        step: 'D', nodeId: `reg_${sub}_${current.nodeId}`, nodeType: 'registry',
        context: { title: `${title} — ${current.context.title}`, breadcrumbs: [...crumbs, title] },
        filter: { placeholder: `Поиск по ${title.toLowerCase()}...`, value: '' },
        payload: data.map((e: any) => ({
          id: String(e.id ?? e.slug),
          name: e.name ?? e.title ?? e.slug ?? String(e.id),
          type: 'node' as const,
        })),
      },
    }
  }

  return null
}
