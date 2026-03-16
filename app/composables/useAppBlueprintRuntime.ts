import { computed } from 'vue'
import { ADMIN_ROOT_MENU_GROUP } from '~~/shared/constants/app-catalog'
import { ADMIN_SECTION_ROUTES } from '~~/shared/constants/admin-navigation'
import { PROJECT_PAGE_TO_NAV_TARGET } from '~~/shared/constants/admin-navigation'

const SECTION_TO_CATEGORY_ID: Record<string, string> = {
  projects: 'cat_projects',
  clients: 'cat_clients',
  designers: 'cat_designers',
  contractors: 'cat_contractors',
  sellers: 'cat_sellers',
  managers: 'cat_managers',
  docs: 'cat_docs',
  gallery: 'cat_gallery',
  moodboards: 'cat_moodboards',
}

function normalizeProjectPageSlug(pageSlug: string) {
  return pageSlug === 'self_profile' ? 'brief' : pageSlug
}

export function useAppBlueprintRuntime() {
  const { activeBlueprint, activeBlueprintId } = useAppBlueprintCatalog()

  const allowedRootCategoryIds = computed(() => {
    const blueprint = activeBlueprint.value
    if (!blueprint) {
      return new Set(ADMIN_ROOT_MENU_GROUP.items.map(item => item.id))
    }

    const allowed = ADMIN_ROOT_MENU_GROUP.items
      .filter((item) => {
        if (!blueprint.menuGroupIds.includes('admin-root')) {
          return false
        }

        if (blueprint.featuredBlockIds.includes(item.id)) {
          return true
        }

        return item.appScopes.some(scope => blueprint.scopes.includes(scope))
      })
      .map(item => item.id)

    return new Set(allowed)
  })

  const firstAvailableAdminRoute = computed(() => {
    const priority = [
      { categoryId: 'cat_projects', path: ADMIN_SECTION_ROUTES.projects },
      { categoryId: 'cat_clients', path: ADMIN_SECTION_ROUTES.clients },
      { categoryId: 'cat_designers', path: ADMIN_SECTION_ROUTES.designers },
      { categoryId: 'cat_contractors', path: ADMIN_SECTION_ROUTES.contractors },
      { categoryId: 'cat_sellers', path: ADMIN_SECTION_ROUTES.sellers },
      { categoryId: 'cat_managers', path: ADMIN_SECTION_ROUTES.managers },
      { categoryId: 'cat_docs', path: ADMIN_SECTION_ROUTES.docs },
      { categoryId: 'cat_gallery', path: ADMIN_SECTION_ROUTES.gallery },
      { categoryId: 'cat_moodboards', path: ADMIN_SECTION_ROUTES.moodboards },
    ]

    return priority.find(item => allowedRootCategoryIds.value.has(item.categoryId))?.path || ADMIN_SECTION_ROUTES.projects
  })

  function isSectionAllowed(sectionKey: string) {
    const categoryId = SECTION_TO_CATEGORY_ID[sectionKey]
    if (!categoryId) {
      return true
    }

    return allowedRootCategoryIds.value.has(categoryId)
  }

  function isProjectPageAllowed(pageSlug: string) {
    const blueprint = activeBlueprint.value
    if (!blueprint) {
      return true
    }

    const normalizedPage = normalizeProjectPageSlug(pageSlug)
    if (normalizedPage === 'overview' || normalizedPage === 'settings') {
      return true
    }

    const target = PROJECT_PAGE_TO_NAV_TARGET[normalizedPage]
    if (!target) {
      return true
    }

    if (target.branchId && !blueprint.featuredBlockIds.includes(target.branchId) && !blueprint.menuGroupIds.includes('project-cabinet')) {
      return false
    }

    if (target.leafId && !blueprint.featuredBlockIds.includes(target.leafId) && !blueprint.menuGroupIds.includes('project-phases')) {
      return false
    }

    return true
  }

  function getAdminRouteFallback(route: ReturnType<typeof useRoute>) {
    if (!route.path.startsWith('/admin')) {
      return null
    }

    if (route.path.startsWith('/admin/projects/')) {
      return null
    }

    if (route.path === ADMIN_SECTION_ROUTES.projects) {
      return isSectionAllowed('projects') ? null : firstAvailableAdminRoute.value
    }

    if (route.path.startsWith(ADMIN_SECTION_ROUTES.clients)) {
      return isSectionAllowed('clients') ? null : firstAvailableAdminRoute.value
    }

    if (route.path.startsWith(ADMIN_SECTION_ROUTES.designers)) {
      return isSectionAllowed('designers') ? null : firstAvailableAdminRoute.value
    }

    if (route.path.startsWith(ADMIN_SECTION_ROUTES.contractors)) {
      return isSectionAllowed('contractors') ? null : firstAvailableAdminRoute.value
    }

    if (route.path.startsWith(ADMIN_SECTION_ROUTES.sellers)) {
      return isSectionAllowed('sellers') ? null : firstAvailableAdminRoute.value
    }

    if (route.path.startsWith(ADMIN_SECTION_ROUTES.managers)) {
      return isSectionAllowed('managers') ? null : firstAvailableAdminRoute.value
    }

    if (route.path.startsWith(ADMIN_SECTION_ROUTES.docs)) {
      return isSectionAllowed('docs') ? null : firstAvailableAdminRoute.value
    }

    if (route.path.startsWith(ADMIN_SECTION_ROUTES.moodboards)) {
      return isSectionAllowed('moodboards') ? null : firstAvailableAdminRoute.value
    }

    if (route.path.startsWith(ADMIN_SECTION_ROUTES.gallery)) {
      return isSectionAllowed('gallery') ? null : firstAvailableAdminRoute.value
    }

    return null
  }

  return {
    activeBlueprint,
    activeBlueprintId,
    allowedRootCategoryIds,
    firstAvailableAdminRoute,
    isSectionAllowed,
    isProjectPageAllowed,
    getAdminRouteFallback,
  }
}