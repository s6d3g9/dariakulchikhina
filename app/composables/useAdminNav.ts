/**
 * useAdminNav — глобальный composable навигации
 * Полностью реализует NavigationNode schema (shared/types/navigation.ts)
 *
 * Стек состоит из двух параллельных массивов:
 *   nodeStack — NavigationNode[] для отображения (AdminNestedNav)
 *   ctxStack  — NavCtx[] для бизнес-логики (contentSpec)
 */

import type { NavigationNode, PayloadItem } from '~~/shared/types/navigation'
import type { AppBlueprintDef, MenuBlockDef } from '~~/shared/types/app-catalog'
import {
  getAdminCategoryRoute,
  getAdminSectionRoute,
  getProjectRoute,
  getRegistryItemId,
  getRegistryItemLabel,
} from '~~/shared/constants/admin-navigation'
import {
  ADMIN_ROOT_MENU_GROUP,
  CLIENT_CABINET_BLOCKS,
  CONTRACTOR_CABINET_BLOCKS,
  DESIGNER_CABINET_BLOCKS,
  DOCUMENT_LIBRARY_BLOCKS,
  GALLERY_LIBRARY_BLOCKS,
  MANAGER_CABINET_BLOCKS,
  PROJECT_CABINET_BLOCKS,
  PROJECT_PHASE_BLOCKS,
  SELLER_CABINET_BLOCKS,
  toPayloadItems,
} from '~~/shared/constants/app-catalog'

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
  managerId?: number
  managerName?: string
  projectSlug?: string
  projectTitle?: string
}

export interface ContentSpec {
  section: string
  designerId: number | null
  designerSection: string | null
  clientId: number | null
  clientSection: string | null
  contractorId: number | null
  contractorSection: string | null
  sellerId: number | null
  sellerSection: string | null
  managerId: number | null
  managerSection: string | null
  projectSlug: string | null
  projectSection: string | null
  galleryCategory: string | null
  documentCategory: string | null
  activeLeafId: string | null
}

interface NavRuntimeCatalog {
  root: PayloadItem[]
  designerCabinet: PayloadItem[]
  clientCabinet: PayloadItem[]
  contractorCabinet: PayloadItem[]
  sellerCabinet: PayloadItem[]
  managerCabinet: PayloadItem[]
  projectCabinet: PayloadItem[]
  projectPhases: PayloadItem[]
  documents: PayloadItem[]
  gallery: PayloadItem[]
  moodboards: PayloadItem[]
}

function normalizeAdminSectionKey(sectionKey: string) {
  return sectionKey === 'tariffs' ? 'ui-modules' : sectionKey
}

function getAdminCategoryIdBySectionKey(sectionKey: string) {
  return `cat_${sectionKey}`
}

function isBlockVisibleForBlueprint(block: MenuBlockDef, blueprint: AppBlueprintDef | null) {
  if (!blueprint) {
    return true
  }

  if (blueprint.featuredBlockIds.includes(block.id)) {
    return true
  }

  return block.appScopes.some(scope => blueprint.scopes.includes(scope))
}

function getBlueprintPayload(groupId: string, blocks: MenuBlockDef[], blueprint: AppBlueprintDef | null) {
  if (!blueprint) {
    return toPayloadItems(blocks)
  }

  if (!blueprint.menuGroupIds.includes(groupId)) {
    return []
  }

  return toPayloadItems(blocks.filter(block => isBlockVisibleForBlueprint(block, blueprint)))
}

function createNavRuntimeCatalog(blueprint: AppBlueprintDef | null): NavRuntimeCatalog {
  const gallery = getBlueprintPayload('gallery-library', GALLERY_LIBRARY_BLOCKS, blueprint)

  return {
    root: getBlueprintPayload('admin-root', ADMIN_ROOT_MENU_GROUP.items, blueprint),
    designerCabinet: getBlueprintPayload('designer-cabinet', DESIGNER_CABINET_BLOCKS, blueprint),
    clientCabinet: getBlueprintPayload('client-cabinet', CLIENT_CABINET_BLOCKS, blueprint),
    contractorCabinet: getBlueprintPayload('contractor-cabinet', CONTRACTOR_CABINET_BLOCKS, blueprint),
    sellerCabinet: getBlueprintPayload('seller-cabinet', SELLER_CABINET_BLOCKS, blueprint),
    managerCabinet: getBlueprintPayload('manager-cabinet', MANAGER_CABINET_BLOCKS, blueprint),
    projectCabinet: getBlueprintPayload('project-cabinet', PROJECT_CABINET_BLOCKS, blueprint),
    projectPhases: getBlueprintPayload('project-phases', PROJECT_PHASE_BLOCKS, blueprint),
    documents: getBlueprintPayload('documents-library', DOCUMENT_LIBRARY_BLOCKS, blueprint),
    gallery,
    moodboards: gallery.filter(item => item.id === 'gal_moodboards'),
  }
}

function rootNode(payload: PayloadItem[]): NavigationNode {
  return {
    step: 'A',
    nodeId: 'root',
    nodeType: 'system_root',
    context: { title: 'меню', breadcrumbs: ['меню'] },
    filter: { placeholder: 'поиск...', value: '' },
    payload,
  }
}

// ─── Composable ───────────────────────────────────────────────────────────────
export function useAdminNav() {
  const router = useRouter()
  const { activeBlueprint } = useAppBlueprintCatalog()
  const navCatalog = computed(() => createNavRuntimeCatalog(activeBlueprint.value))

  const nodeStack    = useState<NavigationNode[]>('nav-v2-nodes', () => [rootNode(navCatalog.value.root)])
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
      designerId:        ctx.designerId ?? null,
      designerSection:   leaf.startsWith('des_') ? leaf.replace('des_', '') : null,
      clientId:          ctx.clientId ?? null,
      clientSection:     leaf.startsWith('cli_') ? leaf.replace('cli_', '') : null,
      contractorId:      ctx.contractorId ?? null,
      contractorSection: leaf.startsWith('con_') ? leaf.replace('con_', '') : null,
      sellerId:          ctx.sellerId ?? null,
      sellerSection:     leaf.startsWith('sel_') ? leaf.replace('sel_', '') : null,
      managerId:         ctx.managerId ?? null,
      managerSection:    leaf.startsWith('man_') ? leaf.replace('man_', '') : null,
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
      const result = await buildNextNode(currentNode.value, currentCtx.value, item, router, navCatalog.value)
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
    nodeStack.value = [rootNode(navCatalog.value.root)]
    ctxStack.value  = [{ section: '' }]
    activeLeafId.value = undefined
  }

  async function ensureSection(sectionKey: string) {
    const normalizedSectionKey = normalizeAdminSectionKey(sectionKey)
    const catId = getAdminCategoryIdBySectionKey(normalizedSectionKey)
    if (normalizeAdminSectionKey(currentCtx.value.section) === normalizedSectionKey) return
    nodeStack.value = [rootNode(navCatalog.value.root)]
    ctxStack.value  = [{ section: '' }]
    activeLeafId.value = undefined
    const item = navCatalog.value.root.find(payloadItem => payloadItem.id === catId)
    if (item) await drill(item)
  }

  function buildProjectBaseState(projectSlug: string, projectTitle: string) {
    const root = rootNode(navCatalog.value.root)
    const regNode: NavigationNode = {
      step: 'B', nodeId: 'reg_projects', nodeType: 'registry',
      context: { title: 'Проекты', breadcrumbs: ['меню', 'Проекты'] },
      filter: { placeholder: 'Поиск по проектам...', value: '' },
      payload: [{ id: projectSlug, name: projectTitle, type: 'node' as const }],
    }
    const cabNode: NavigationNode = {
      step: 'C', nodeId: `cab_project_${projectSlug}`, nodeType: 'project_root',
      context: { title: projectTitle, breadcrumbs: ['меню', 'Проекты', projectTitle] },
      filter: { placeholder: 'Поиск по разделам проекта...', value: '' },
      payload: navCatalog.value.projectCabinet,
    }

    return {
      nodes: [root, regNode, cabNode],
      ctxs: [
        { section: '' },
        { section: 'projects' },
        { section: 'projects', projectSlug, projectTitle },
      ] as NavCtx[],
      cabNode,
    }
  }

  async function setProjectView(
    projectSlug: string,
    projectTitle: string,
    options: { branchId?: string | null; leafId?: string | null } = {},
  ) {
    const { nodes, ctxs, cabNode } = buildProjectBaseState(projectSlug, projectTitle)

    if (options.branchId) {
      const branchItem = navCatalog.value.projectCabinet.find(item => item.id === options.branchId)
      if (branchItem) {
        const result = await buildNextNode(cabNode, ctxs[2], branchItem, router, navCatalog.value)
        if (result) {
          nodes.push(result.node)
          ctxs.push(result.ctx)
        }
      }
    }

    nodeStack.value = nodes
    ctxStack.value = ctxs
    activeLeafId.value = options.leafId || undefined
  }

  /**
   * Напрямую устанавливает навигацию на конкретный проект (без router.push).
   * Используется при keepalive-активации [slug].vue чтобы не терять текущий маршрут.
   */
  function ensureProject(projectSlug: string, projectTitle: string, options: { force?: boolean } = {}) {
    const spec = contentSpec.value
    if (!options.force && spec.section === 'projects' && spec.projectSlug === projectSlug) {
      const updateNodeTitle = (node: NavigationNode) => {
        if (node.nodeType === 'project_root') {
          return {
            ...node,
            context: {
              ...node.context,
              title: projectTitle,
              breadcrumbs: node.context.breadcrumbs.map((crumb, index, arr) => index === arr.length - 1 ? projectTitle : crumb),
            },
          }
        }

        return node
      }

      nodeStack.value = nodeStack.value.map(updateNodeTitle)
      ctxStack.value = ctxStack.value.map((ctx) =>
        ctx.projectSlug === projectSlug
          ? { ...ctx, projectTitle }
          : ctx,
      )
      return
    }

    const { nodes, ctxs } = buildProjectBaseState(projectSlug, projectTitle)
    nodeStack.value = nodes
    ctxStack.value = ctxs
    activeLeafId.value = undefined
  }

  // ── Счётчики для кабинетных разделов (des_*, cli_*, etc.) ──────────────────
  const cabinetCounts = useState<Record<string, number>>('nav-v2-counts', () => ({}))

  function setCabinetCounts(counts: Record<string, number>) {
    for (const [key, val] of Object.entries(counts)) {
      cabinetCounts.value[key] = val
    }
  }

  // ── Прямой переход в кабинет сущности (клиент, подрядчик и т.д.) ──────────
  function drillToEntityCabinet(
    entityType: 'clients' | 'contractors' | 'sellers' | 'managers',
    id: number,
    name?: string,
  ) {
    const entityName = name ?? String(id)
    const sectionTitles: Record<string, string> = {
      clients:     'Клиенты',
      contractors: 'Подрядчики',
      sellers:     'Поставщики',
      managers:    'Менеджеры',
    }
    const cabinetItems: Record<string, PayloadItem[]> = {
      clients:     navCatalog.value.clientCabinet,
      contractors: navCatalog.value.contractorCabinet,
      sellers:     navCatalog.value.sellerCabinet,
      managers:    navCatalog.value.managerCabinet,
    }
    const sectionTitle = sectionTitles[entityType] ?? entityType

    const regNode: NavigationNode = {
      step: 'B',
      nodeId: `reg_${entityType}`,
      nodeType: 'registry',
      context: { title: sectionTitle, breadcrumbs: ['меню', sectionTitle] },
      filter: { placeholder: `Поиск по ${sectionTitle.toLowerCase()}...`, value: '' },
      payload: [],
    }
    const ctxForSection: NavCtx = { section: entityType }

    const ctxForCabinet: NavCtx = {
      ...ctxForSection,
      ...(entityType === 'clients'     ? { clientId:     id, clientName:     entityName } : {}),
      ...(entityType === 'contractors' ? { contractorId: id, contractorName: entityName } : {}),
      ...(entityType === 'sellers'     ? { sellerId:     id, sellerName:     entityName } : {}),
      ...(entityType === 'managers'    ? { managerId:    id, managerName:    entityName } : {}),
    }
    const cabNode: NavigationNode = {
      step: 'C',
      nodeId: `cab_${entityType.slice(0, -1)}_${id}`,
      nodeType: 'cabinet',
      context: { title: entityName, breadcrumbs: ['меню', sectionTitle, entityName] },
      filter: { placeholder: 'Поиск по разделам...', value: '' },
      payload: cabinetItems[entityType] ?? [],
    }

    slideDir.value = 'fwd'
  nodeStack.value  = [rootNode(navCatalog.value.root), regNode, cabNode]
    ctxStack.value   = [{ section: '' }, ctxForSection, ctxForCabinet]
    activeLeafId.value = undefined

    const route = getAdminSectionRoute(entityType)
    if (route) router.push(route)
  }

  watch(() => activeBlueprint.value?.id, async () => {
    const spec = contentSpec.value
    const currentProjectTitle = currentCtx.value.projectTitle ?? spec.projectSlug ?? ''

    if (spec.projectSlug && navCatalog.value.projectCabinet.length) {
      ensureProject(spec.projectSlug, currentProjectTitle || spec.projectSlug, { force: true })
      return
    }

    if (spec.section) {
      await ensureSection(spec.section)
      return
    }

    goRoot()
  })

  return {
    currentNode,
    canGoBack,
    slideDir:      computed(() => slideDir.value),
    activeLeafId:  computed(() => activeLeafId.value),
    loading:       readonly(loading),
    contentSpec,
    cabinetCounts: readonly(cabinetCounts),
    drill,
    back,
    select,
    goRoot,
    ensureSection,
    ensureProject,
    setProjectView,
    drillToEntityCabinet,
    setCabinetCounts,
    nodeStack: readonly(nodeStack),
  }
}

// ─── Node builder (вне composable — не привязан к instance) ──────────────────
async function buildNextNode(
  current: NavigationNode,
  ctx: NavCtx,
  item: PayloadItem,
  router: ReturnType<typeof useRouter>,
  catalog: NavRuntimeCatalog,
): Promise<{ node: NavigationNode; ctx: NavCtx } | null> {
  const newCtx: NavCtx = { ...ctx }
  const crumbs = [...current.context.breadcrumbs]
  const projectScopedRoute = (path: string) =>
    newCtx.projectSlug
      ? { path, query: { projectSlug: newCtx.projectSlug } }
      : path

  // ── ROOT → registry секций ────────────────────────────────────────────────
  if (current.nodeId === 'root') {
    newCtx.section = normalizeAdminSectionKey(item.id.replace('cat_', ''))
    const route = getAdminCategoryRoute(item.id)
    if (route) router.push(route)

    if (item.id === 'cat_docs') {
      return { ctx: newCtx, node: {
        step: 'B', nodeId: 'reg_docs_root', nodeType: 'registry',
        context: { title: 'Документы', breadcrumbs: [...crumbs, 'Документы'] },
        filter: { placeholder: 'Поиск по типу документа...', value: '' },
        payload: catalog.documents,
      }}
    }
    if (item.id === 'cat_gallery') {
      return { ctx: newCtx, node: {
        step: 'B', nodeId: 'reg_gallery', nodeType: 'registry',
        context: { title: 'Галереи', breadcrumbs: [...crumbs, 'Галереи'] },
        filter: { placeholder: 'Поиск по разделу...', value: '' },
        payload: catalog.gallery,
      }}
    }
    if (item.id === 'cat_moodboards') {
      return { ctx: newCtx, node: {
        step: 'B', nodeId: 'reg_moodboards', nodeType: 'registry',
        context: { title: 'Мудборды', breadcrumbs: [...crumbs, 'Мудборды'] },
        filter: { placeholder: 'Поиск по мудбордам...', value: '' },
        payload: catalog.moodboards,
      }}
    }
    const apiMap: Record<string, string> = {
      cat_projects:    '/api/projects',
      cat_designers:   '/api/designers',
      cat_clients:     '/api/clients',
      cat_contractors: '/api/contractors',
      cat_sellers:     '/api/sellers',
      cat_managers:    '/api/managers',
    }
    const titleMap: Record<string, string> = {
      cat_projects: 'Проекты', cat_designers: 'Дизайнеры', cat_clients: 'Клиенты',
      cat_contractors: 'Подрядчики', cat_sellers: 'Поставщики',
      cat_managers: 'Менеджеры',
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
        id: getRegistryItemId(newCtx.section, e),
        name: getRegistryItemLabel(e),
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
      router.push(getAdminSectionRoute('designers') || '/admin/designers')
      return { ctx: newCtx, node: {
        step: 'C', nodeId: `cab_designer_${item.id}`, nodeType: 'cabinet',
        context: { title: item.name, breadcrumbs: [...crumbs, item.name] },
        filter: { placeholder: 'Поиск по разделам...', value: '' },
        payload: catalog.designerCabinet,
      }}
    }
    if (section === 'clients') {
      newCtx.clientId   = Number(item.id)
      newCtx.clientName = item.name
      router.push(getAdminSectionRoute('clients') || '/admin/clients')
      return { ctx: newCtx, node: {
        step: 'C', nodeId: `cab_client_${item.id}`, nodeType: 'cabinet',
        context: { title: item.name, breadcrumbs: [...crumbs, item.name] },
        filter: { placeholder: 'Поиск по разделам...', value: '' },
        payload: catalog.clientCabinet,
      }}
    }
    if (section === 'contractors') {
      newCtx.contractorId   = Number(item.id)
      newCtx.contractorName = item.name
      router.push(getAdminSectionRoute('contractors') || '/admin/contractors')
      return { ctx: newCtx, node: {
        step: 'C', nodeId: `cab_contractor_${item.id}`, nodeType: 'cabinet',
        context: { title: item.name, breadcrumbs: [...crumbs, item.name] },
        filter: { placeholder: 'Поиск по разделам...', value: '' },
        payload: catalog.contractorCabinet,
      }}
    }
    if (section === 'sellers') {
      newCtx.sellerId   = Number(item.id)
      newCtx.sellerName = item.name
      router.push(getAdminSectionRoute('sellers') || '/admin/sellers')
      return { ctx: newCtx, node: {
        step: 'C', nodeId: `cab_seller_${item.id}`, nodeType: 'cabinet',
        context: { title: item.name, breadcrumbs: [...crumbs, item.name] },
        filter: { placeholder: 'Поиск по разделам...', value: '' },
        payload: catalog.sellerCabinet,
      }}
    }
    if (section === 'managers') {
      newCtx.managerId   = Number(item.id)
      newCtx.managerName = item.name
      router.push(getAdminSectionRoute('managers') || '/admin/managers')
      return { ctx: newCtx, node: {
        step: 'C', nodeId: `cab_manager_${item.id}`, nodeType: 'cabinet',
        context: { title: item.name, breadcrumbs: [...crumbs, item.name] },
        filter: { placeholder: 'Поиск по разделам...', value: '' },
        payload: catalog.managerCabinet,
      }}
    }
    if (section === 'projects') {
      newCtx.projectSlug  = item.id
      newCtx.projectTitle = item.name
      router.push(getProjectRoute(item.id))
      return { ctx: newCtx, node: {
        step: 'C', nodeId: `cab_project_${item.id}`, nodeType: 'project_root',
        context: { title: item.name, breadcrumbs: [...crumbs, item.name] },
        filter: { placeholder: 'Поиск по разделам проекта...', value: '' },
        payload: catalog.projectCabinet,
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
        payload: catalog.projectPhases,
      }}
    }
    if (sub === 'docs') {
      await router.push(projectScopedRoute('/admin/documents'))
      return null
    }
    if (sub === 'gallery') {
      await router.push(projectScopedRoute('/admin/gallery/interiors'))
      return null
    }
    if (sub === 'moodboards') {
      await router.push(projectScopedRoute('/admin/gallery/moodboards'))
      return null
    }
    if (sub === 'tariff') {
      await router.push(projectScopedRoute('/admin/pages'))
      return null
    }
    if (sub === 'managers') {
      const slug = newCtx.projectSlug
      const data = await $fetch<any[]>(`/api/managers${slug ? `?projectSlug=${slug}` : ''}`).catch(() => [])
      return { ctx: { ...newCtx, section: 'managers' }, node: {
        step: 'F', nodeId: `reg_managers_${current.nodeId}`, nodeType: 'registry',
        context: { title: `Менеджеры — ${current.context.title}`, breadcrumbs: [...crumbs, 'Менеджеры'] },
        filter: { placeholder: 'Поиск по менеджерам...', value: '' },
        payload: data.map((e: any) => ({
          id: String(e.id), name: e.name ?? String(e.id), type: 'node' as const,
        })),
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
    // Note: managers handled above with project-scoped query
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
            id: getRegistryItemId(sub, e),
            name: getRegistryItemLabel(e),
            type: 'node' as const,
          })),
        },
      }
    }
    return null
  }

  // ── CABINET → вложенные реестры (des_|cli_|con_|sel_|man_ prefix) ────────
  if (current.nodeType === 'cabinet') {
    const sub = item.id.replace(/^(des_|cli_|con_|sel_|man_)/, '')

    if (sub === 'documents') {
      return { ctx: newCtx, node: {
        step: 'D', nodeId: `reg_docs_${current.nodeId}`, nodeType: 'registry',
        context: { title: `Документы — ${current.context.title}`, breadcrumbs: [...crumbs, 'Документы'] },
        filter: { placeholder: 'Поиск по типу...', value: '' },
        payload: catalog.documents,
      }}
    }
    if (sub === 'gallery') {
      return { ctx: newCtx, node: {
        step: 'D', nodeId: `reg_gallery_${current.nodeId}`, nodeType: 'registry',
        context: { title: `Галереи — ${current.context.title}`, breadcrumbs: [...crumbs, 'Галереи'] },
        filter: { placeholder: 'Поиск по разделу...', value: '' },
        payload: catalog.gallery,
      }}
    }
    if (sub === 'moodboards') {
      return { ctx: newCtx, node: {
        step: 'D', nodeId: `reg_moodboards_${current.nodeId}`, nodeType: 'registry',
        context: { title: `Мудборды — ${current.context.title}`, breadcrumbs: [...crumbs, 'Мудборды'] },
        filter: { placeholder: 'Поиск по мудбордам...', value: '' },
        payload: catalog.moodboards,
      }}
    }
    if (sub === 'managers') {
      const data = await $fetch<any[]>('/api/managers').catch(() => [])
      return { ctx: newCtx, node: {
        step: 'D', nodeId: `reg_managers_${current.nodeId}`, nodeType: 'registry',
        context: { title: `Менеджеры — ${current.context.title}`, breadcrumbs: [...crumbs, 'Менеджеры'] },
        filter: { placeholder: 'Поиск по менеджерам...', value: '' },
        payload: data.map((e: any) => ({
          id: String(e.id), name: e.name ?? String(e.id), type: 'node' as const,
        })),
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
          id: getRegistryItemId(sub, e),
          name: getRegistryItemLabel(e),
          type: 'node' as const,
        })),
      },
    }
  }

  return null
}
