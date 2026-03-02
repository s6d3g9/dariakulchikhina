/**
 * shared/constants/pages.ts
 * Единый источник навигационных элементов для клиентского и админского UI.
 */

// ── Определение страницы проекта ───────────────────────────────

export interface ProjectPageDef {
  slug: string
  title: string
  icon?: string
  /** Фаза проекта, к которой относится страница */
  phase?: string
  /** Только для клиентского sidebar (по умолчанию true) */
  clientVisible?: boolean
  /** Только для админского tab-списка (по умолчанию true) */
  adminVisible?: boolean
}

// ── Все страницы проекта (единый массив) ────────────────────────

export const PROJECT_PAGES: ProjectPageDef[] = [
  // Фаза 0 – Инициация
  { slug: 'first_contact',       title: '0.1 первичный контакт',  icon: '◍', phase: 'lead' },
  { slug: 'self_profile',        title: '0.2 брифинг',            icon: '◎', phase: 'lead', adminVisible: true },
  { slug: 'site_survey',         title: '0.3 обмеры / аудит',     icon: '◐', phase: 'lead' },
  { slug: 'tor_contract',        title: '0.4 ТЗ и договор',       icon: '◒', phase: 'lead' },

  // Фаза 1 – Концепция
  { slug: 'space_planning',      title: '1.1 планировки',         icon: '◖', phase: 'concept' },
  { slug: 'moodboard',           title: '1.2 мудборд',            icon: '◗', phase: 'concept' },
  { slug: 'concept_approval',    title: '1.3 согласование',       icon: '◑', phase: 'concept' },

  // Фаза 2 – Рабочий проект
  { slug: 'working_drawings',    title: '2.1 рабочие чертежи',    icon: '▧', phase: 'working_project', clientVisible: false },
  { slug: 'specifications',      title: '2.2 спецификации',       icon: '▨', phase: 'working_project', clientVisible: false },
  { slug: 'mep_integration',     title: '2.3 инженерия',          icon: '▤', phase: 'working_project', clientVisible: false },
  { slug: 'design_album_final',  title: '2.4 финальный альбом',   icon: '▣', phase: 'working_project', clientVisible: false },

  // Фаза 3 – Закупки
  { slug: 'procurement_list',    title: '3.1 список закупок',     icon: '◫', phase: 'procurement', clientVisible: false },
  { slug: 'suppliers',           title: '3.2 поставщики',         icon: '◪', phase: 'procurement', clientVisible: false },
  { slug: 'procurement_status',  title: '3.3 статус закупок',     icon: '◩', phase: 'procurement', clientVisible: false },

  // Фаза 4 – Стройка
  { slug: 'construction_plan',   title: '4.1 план работ',         icon: '◰', phase: 'construction', clientVisible: false },
  { slug: 'work_log',            title: '4.2 журнал работ',       icon: '◱', phase: 'construction', clientVisible: false },
  { slug: 'site_photos',         title: '4.3 фото объекта',       icon: '◲', phase: 'construction', clientVisible: false },

  // Фаза 5 – Сдача
  { slug: 'punch_list',          title: '5.1 дефектная ведомость', icon: '◳', phase: 'commissioning', clientVisible: false },
  { slug: 'commissioning_act',   title: '5.2 акт приёмки',        icon: '◴', phase: 'commissioning', clientVisible: false },
  { slug: 'client_sign_off',     title: '5.3 подпись клиента',    icon: '◵', phase: 'commissioning', clientVisible: false },

  // Устаревшие / клиентские (без фазы)
  { slug: 'client_contacts',     title: 'контактные данные',      icon: '◌', phase: undefined },
  { slug: 'design_timeline',     title: 'ход проекта',            icon: '◈', phase: undefined },
  { slug: 'design_album',        title: 'альбом',                 icon: '▣', phase: undefined },
  { slug: 'contracts',           title: 'документы',              icon: '◻', phase: undefined },
  { slug: 'materials',           title: 'материалы',              icon: '◫', phase: undefined },
  { slug: 'tz',                  title: 'ТЗ',                     icon: '◧', phase: undefined },
]

// ── Хелперы фильтрации ─────────────────────────────────────────

/** Страницы для клиентского sidebar (только clientVisible !== false) */
export function getClientPages(): ProjectPageDef[] {
  return PROJECT_PAGES.filter(p => p.clientVisible !== false)
}

/** Страницы для админского tab-списка (только adminVisible !== false) */
export function getAdminPages(): ProjectPageDef[] {
  return PROJECT_PAGES.filter(p => p.adminVisible !== false)
}

/** Найти страницу по slug */
export function findPage(slug: string): ProjectPageDef | undefined {
  return PROJECT_PAGES.find(p => p.slug === slug)
}

// ── Лейблы фаз ─────────────────────────────────────────────────

export const PHASE_LABELS: Record<string, string> = {
  lead:            'Фаза 0 · Инициация',
  concept:         'Фаза 1 · Эскиз',
  working_project: 'Фаза 2 · Рабочий проект',
  procurement:     'Фаза 3 · Комплектация',
  construction:    'Фаза 4 · Строительство',
  commissioning:   'Фаза 5 · Сдача',
}

/** Группы навигации для админского sidebar (по фазам) */
export function getAdminNavGroups(): { label: string; pages: ProjectPageDef[] }[] {
  const phases = ['lead', 'concept', 'working_project', 'procurement', 'construction', 'commissioning']
  const admin = getAdminPages()
  return phases
    .map(phase => ({
      label: PHASE_LABELS[phase] || phase,
      pages: admin.filter(p => p.phase === phase),
    }))
    .filter(g => g.pages.length > 0)
}

// ── Стандартные страницы при создании проекта ────────────────────

export const CORE_PAGES = [
  'first_contact',
  'self_profile',
  'site_survey',
  'tor_contract',
  'space_planning',
  'moodboard',
  'concept_approval',
  'working_drawings',
  'specifications',
  'mep_integration',
  'design_album_final',
  'procurement_list',
  'suppliers',
  'procurement_status',
  'construction_plan',
  'work_log',
  'site_photos',
  'punch_list',
  'commissioning_act',
  'client_sign_off',
] as const
