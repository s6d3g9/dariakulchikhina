export type AdminSectionKey =
  | 'projects'
  | 'clients'
  | 'designers'
  | 'contractors'
  | 'sellers'
  | 'managers'
  | 'docs'
  | 'gallery'
  | 'moodboards'
  | 'ui-modules'
  | 'tariffs'

export const ADMIN_SECTION_ROUTES: Record<AdminSectionKey, string> = {
  projects: '/admin',
  clients: '/admin/clients',
  designers: '/admin/designers',
  contractors: '/admin/contractors',
  sellers: '/admin/sellers',
  managers: '/admin/managers',
  docs: '/admin/documents',
  gallery: '/admin/gallery',
  moodboards: '/admin/gallery/moodboards',
  'ui-modules': '/admin/pages',
  tariffs: '/admin/pages',
}

export const ADMIN_CATEGORY_SECTION_MAP: Record<string, AdminSectionKey> = {
  cat_projects: 'projects',
  cat_clients: 'clients',
  cat_designers: 'designers',
  cat_contractors: 'contractors',
  cat_sellers: 'sellers',
  cat_managers: 'managers',
  cat_docs: 'docs',
  cat_gallery: 'gallery',
  cat_moodboards: 'moodboards',
  cat_tariffs: 'ui-modules',
}

const ADMIN_SECTION_ALIASES: Record<string, AdminSectionKey> = {
  tariffs: 'ui-modules',
}

export function getAdminSectionRoute(sectionKey: string) {
  const normalizedKey = ADMIN_SECTION_ALIASES[sectionKey] || sectionKey
  return ADMIN_SECTION_ROUTES[normalizedKey as AdminSectionKey] || null
}

export function getAdminCategoryRoute(categoryId: string) {
  const sectionKey = ADMIN_CATEGORY_SECTION_MAP[categoryId]
  return sectionKey ? ADMIN_SECTION_ROUTES[sectionKey] : null
}

export function getProjectRoute(projectSlug: string) {
  return `/admin/projects/${projectSlug}`
}

export function getRegistryItemId(sectionKey: string, entity: Record<string, any>) {
  if (sectionKey === 'projects') {
    return String(entity.slug || entity.id || '')
  }

  return String(entity.id ?? entity.slug ?? '')
}

export function getRegistryItemLabel(entity: Record<string, any>) {
  return String(entity.name ?? entity.title ?? entity.slug ?? entity.id ?? '')
}

export const PROJECT_SECTION_TO_PAGE: Record<string, string> = {
  overview: 'overview',
  settings: 'settings',
  communications: 'project_communications',
  clients: 'project_clients',
  firstcontact: 'first_contact',
  smartbrief: 'brief',
  sitesurvey: 'site_survey',
  torcontract: 'tor_contract',
  concept: 'concept_approval',
  spaceplanning: 'space_planning',
  moodboard: 'moodboard',
  plan: 'construction_plan',
  drawings: 'working_drawings',
  specifications: 'specifications',
  mep: 'mep_integration',
  materials: 'materials',
  procurement: 'procurement_list',
  suppliers: 'suppliers',
  procurementstatus: 'procurement_status',
  workstatus: 'work_status',
  worklog: 'work_log',
  sitephotos: 'site_photos',
  punchlist: 'punch_list',
  commissioning: 'commissioning_act',
  clientsignoff: 'client_sign_off',
  album: 'design_album_final',
  extraservices: 'extra_services',
}

export const PROJECT_PAGE_TO_NAV_TARGET: Record<string, { branchId?: string; leafId?: string }> = {
  overview: {},
  settings: { leafId: 'prj_settings' },
  project_communications: { leafId: 'prj_communications' },
  project_clients: { branchId: 'alpha_clients' },
  project_contractors: { branchId: 'alpha_contractors' },
  project_designers: { branchId: 'alpha_designers' },
  project_sellers: { branchId: 'alpha_sellers' },
  project_managers: { branchId: 'alpha_managers' },
  first_contact: { branchId: 'alpha_phases', leafId: 'prj_firstcontact' },
  brief: { branchId: 'alpha_phases', leafId: 'prj_smartbrief' },
  site_survey: { branchId: 'alpha_phases', leafId: 'prj_sitesurvey' },
  tor_contract: { branchId: 'alpha_phases', leafId: 'prj_torcontract' },
  extra_services: { branchId: 'alpha_phases', leafId: 'prj_extraservices' },
  space_planning: { branchId: 'alpha_phases', leafId: 'prj_spaceplanning' },
  moodboard: { branchId: 'alpha_phases', leafId: 'prj_moodboard' },
  concept_approval: { branchId: 'alpha_phases', leafId: 'prj_concept' },
  working_drawings: { branchId: 'alpha_phases', leafId: 'prj_drawings' },
  specifications: { branchId: 'alpha_phases', leafId: 'prj_specifications' },
  mep_integration: { branchId: 'alpha_phases', leafId: 'prj_mep' },
  design_album_final: { branchId: 'alpha_phases', leafId: 'prj_album' },
  procurement_list: { branchId: 'alpha_phases', leafId: 'prj_procurement' },
  suppliers: { branchId: 'alpha_phases', leafId: 'prj_suppliers' },
  procurement_status: { branchId: 'alpha_phases', leafId: 'prj_procurementstatus' },
  construction_plan: { branchId: 'alpha_phases', leafId: 'prj_plan' },
  work_status: { branchId: 'alpha_phases', leafId: 'prj_workstatus' },
  work_log: { branchId: 'alpha_phases', leafId: 'prj_worklog' },
  site_photos: { branchId: 'alpha_phases', leafId: 'prj_sitephotos' },
  punch_list: { branchId: 'alpha_phases', leafId: 'prj_punchlist' },
  commissioning_act: { branchId: 'alpha_phases', leafId: 'prj_commissioning' },
  client_sign_off: { branchId: 'alpha_phases', leafId: 'prj_clientsignoff' },
  materials: { branchId: 'alpha_phases', leafId: 'prj_materials' },
}

export const PROJECT_REGISTRY_NODE_PREFIX_TO_PAGE: Record<string, string> = {
  reg_clients_: 'project_clients',
  reg_contractors_: 'project_contractors',
  reg_designers_: 'project_designers',
  reg_sellers_: 'project_sellers',
  reg_managers_: 'project_managers',
}

export const PROJECT_REGISTRY_PAGE_META: Record<string, { title: string; group: string }> = {
  project_communications: { title: 'коммуникации проекта', group: 'связь проекта' },
  project_clients: { title: 'клиенты проекта', group: 'субъекты проекта' },
  project_contractors: { title: 'подрядчики проекта', group: 'субъекты проекта' },
  project_designers: { title: 'дизайнеры проекта', group: 'субъекты проекта' },
  project_sellers: { title: 'поставщики проекта', group: 'субъекты проекта' },
  project_managers: { title: 'менеджеры проекта', group: 'субъекты проекта' },
}