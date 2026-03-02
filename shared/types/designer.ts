import { z } from 'zod'

// ── Категории дизайн-услуг ──────────────────────────────────────

export const DESIGNER_SERVICE_CATEGORIES = [
  'measurement',
  'concept',
  'design_project',
  'full_project',
  'supervision',
  'consultation',
  'additional',
] as const

export type DesignerServiceCategory = typeof DESIGNER_SERVICE_CATEGORIES[number]

export const DESIGNER_SERVICE_CATEGORY_LABELS: Record<DesignerServiceCategory, string> = {
  measurement: 'Замеры и обследование',
  concept: 'Эскизный проект',
  design_project: 'Дизайн-проект',
  full_project: 'Полный дизайн-проект',
  supervision: 'Авторский надзор',
  consultation: 'Консультация',
  additional: 'Дополнительные услуги',
}

// ── Единицы измерения цены ──────────────────────────────────────

export const PRICE_UNITS = ['per_sqm', 'per_hour', 'per_visit', 'per_render', 'fixed', 'percent'] as const
export type PriceUnit = typeof PRICE_UNITS[number]

export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  per_sqm: '₽/м²',
  per_hour: '₽/час',
  per_visit: '₽/выезд',
  per_render: '₽/ракурс',
  fixed: '₽ (фикс)',
  percent: '% от бюджета',
}

// ── Справочник типовых услуг дизайнера (Москва 2025–2026) ──────

export interface DesignerServiceTemplate {
  key: string
  category: DesignerServiceCategory
  title: string
  description: string
  defaultUnit: PriceUnit
  defaultPrice: number          // рекомендуемая цена (Москва, средний сегмент)
  priceRangeMin: number
  priceRangeMax: number
  /** Какие этапы роадмепа генерируются при включении этой услуги */
  roadmapStages: string[]
}

export const DESIGNER_SERVICE_TEMPLATES: DesignerServiceTemplate[] = [
  // ─── Замеры и обследование ──────────────────────────────────
  {
    key: 'site_visit',
    category: 'measurement',
    title: 'Выезд на объект',
    description: 'Первичный выезд, осмотр, фотофиксация помещений',
    defaultUnit: 'per_visit',
    defaultPrice: 5000,
    priceRangeMin: 3000,
    priceRangeMax: 15000,
    roadmapStages: ['brief'],
  },
  {
    key: 'measurement',
    category: 'measurement',
    title: 'Обмерный план',
    description: 'Точные замеры всех помещений, план в масштабе',
    defaultUnit: 'per_sqm',
    defaultPrice: 150,
    priceRangeMin: 100,
    priceRangeMax: 400,
    roadmapStages: ['brief'],
  },
  {
    key: 'photo_fixation',
    category: 'measurement',
    title: 'Фотофиксация объекта',
    description: 'Фотосъёмка всех помещений, фасадов, инженерных узлов',
    defaultUnit: 'per_visit',
    defaultPrice: 3000,
    priceRangeMin: 2000,
    priceRangeMax: 8000,
    roadmapStages: ['brief'],
  },

  // ─── Эскизный проект ────────────────────────────────────────
  {
    key: 'moodboard',
    category: 'concept',
    title: 'Мудборд / коллаж стиля',
    description: 'Коллаж с подбором стиля, цветовой палитры, основных материалов',
    defaultUnit: 'per_sqm',
    defaultPrice: 300,
    priceRangeMin: 150,
    priceRangeMax: 600,
    roadmapStages: ['concept'],
  },
  {
    key: 'concept_collage',
    category: 'concept',
    title: 'Концепт-коллаж по помещениям',
    description: 'Детальные коллажи по каждому помещению с подбором мебели и отделки',
    defaultUnit: 'per_sqm',
    defaultPrice: 500,
    priceRangeMin: 300,
    priceRangeMax: 1000,
    roadmapStages: ['concept'],
  },
  {
    key: 'space_planning',
    category: 'concept',
    title: 'Планировочное решение',
    description: '2–3 варианта планировки с расстановкой мебели и зонированием',
    defaultUnit: 'per_sqm',
    defaultPrice: 400,
    priceRangeMin: 200,
    priceRangeMax: 800,
    roadmapStages: ['planning'],
  },
  {
    key: 'color_scheme',
    category: 'concept',
    title: 'Цветовое решение',
    description: 'Подбор цветовой палитры, карта колеровки стен и потолков',
    defaultUnit: 'per_sqm',
    defaultPrice: 200,
    priceRangeMin: 100,
    priceRangeMax: 400,
    roadmapStages: ['concept'],
  },

  // ─── Дизайн-проект ──────────────────────────────────────────
  {
    key: '3d_visualization',
    category: 'design_project',
    title: '3D-визуализация',
    description: 'Фотореалистичные рендеры основных помещений (2–3 ракурса/комната)',
    defaultUnit: 'per_render',
    defaultPrice: 8000,
    priceRangeMin: 5000,
    priceRangeMax: 20000,
    roadmapStages: ['concept'],
  },
  {
    key: 'wall_elevations',
    category: 'design_project',
    title: 'Развёртки стен',
    description: 'Развёртки всех стен с привязками к плитке, розеткам, декору',
    defaultUnit: 'per_sqm',
    defaultPrice: 350,
    priceRangeMin: 200,
    priceRangeMax: 700,
    roadmapStages: ['engineering'],
  },
  {
    key: 'material_selection',
    category: 'design_project',
    title: 'Подбор материалов',
    description: 'Ведомость отделочных материалов с артикулами и ссылками',
    defaultUnit: 'per_sqm',
    defaultPrice: 300,
    priceRangeMin: 150,
    priceRangeMax: 600,
    roadmapStages: ['procurement'],
  },
  {
    key: 'furniture_selection',
    category: 'design_project',
    title: 'Подбор мебели',
    description: 'Спецификация мебели с ценами, артикулами, размерами',
    defaultUnit: 'per_sqm',
    defaultPrice: 300,
    priceRangeMin: 150,
    priceRangeMax: 500,
    roadmapStages: ['procurement'],
  },
  {
    key: 'lighting_plan',
    category: 'design_project',
    title: 'Светодизайн',
    description: 'План освещения, световые сценарии, подбор светильников',
    defaultUnit: 'per_sqm',
    defaultPrice: 250,
    priceRangeMin: 150,
    priceRangeMax: 500,
    roadmapStages: ['engineering'],
  },

  // ─── Полный дизайн-проект ───────────────────────────────────
  {
    key: 'working_drawings',
    category: 'full_project',
    title: 'Рабочие чертежи',
    description: 'Полный комплект рабочей документации: план демонтажа/монтажа, электрика, сантехника, потолки, полы',
    defaultUnit: 'per_sqm',
    defaultPrice: 800,
    priceRangeMin: 500,
    priceRangeMax: 1500,
    roadmapStages: ['engineering'],
  },
  {
    key: 'electrical_plan',
    category: 'full_project',
    title: 'План электрики',
    description: 'Размещение розеток, выключателей, электровыводов, щит',
    defaultUnit: 'per_sqm',
    defaultPrice: 250,
    priceRangeMin: 150,
    priceRangeMax: 500,
    roadmapStages: ['engineering'],
  },
  {
    key: 'plumbing_plan',
    category: 'full_project',
    title: 'План сантехники',
    description: 'Расположение точек водоснабжения и канализации',
    defaultUnit: 'per_sqm',
    defaultPrice: 200,
    priceRangeMin: 100,
    priceRangeMax: 400,
    roadmapStages: ['engineering'],
  },
  {
    key: 'ceiling_plan',
    category: 'full_project',
    title: 'План потолков',
    description: 'Конструкция, уровни, встроенный свет, профили',
    defaultUnit: 'per_sqm',
    defaultPrice: 200,
    priceRangeMin: 100,
    priceRangeMax: 400,
    roadmapStages: ['engineering'],
  },
  {
    key: 'floor_plan',
    category: 'full_project',
    title: 'План полов',
    description: 'Раскладка покрытий, тёплый пол, уровни стяжки',
    defaultUnit: 'per_sqm',
    defaultPrice: 200,
    priceRangeMin: 100,
    priceRangeMax: 400,
    roadmapStages: ['engineering'],
  },
  {
    key: 'specification',
    category: 'full_project',
    title: 'Сводная спецификация',
    description: 'Полная ведомость всех материалов, мебели и оборудования с ценами',
    defaultUnit: 'per_sqm',
    defaultPrice: 200,
    priceRangeMin: 100,
    priceRangeMax: 400,
    roadmapStages: ['procurement'],
  },

  // ─── Авторский надзор ───────────────────────────────────────
  {
    key: 'author_supervision',
    category: 'supervision',
    title: 'Авторский надзор',
    description: 'Регулярные выезды на объект, контроль подрядчиков, согласование замен',
    defaultUnit: 'per_visit',
    defaultPrice: 15000,
    priceRangeMin: 8000,
    priceRangeMax: 35000,
    roadmapStages: ['supervision'],
  },
  {
    key: 'supervision_monthly',
    category: 'supervision',
    title: 'Авторский надзор (абонемент)',
    description: 'Ежемесячный абонемент: 4–8 выездов, удалённые консультации',
    defaultUnit: 'fixed',
    defaultPrice: 50000,
    priceRangeMin: 25000,
    priceRangeMax: 120000,
    roadmapStages: ['supervision'],
  },
  {
    key: 'commissioning',
    category: 'supervision',
    title: 'Приёмка и дефектовка',
    description: 'Контроль качества выполненых работ, составление дефектной ведомости',
    defaultUnit: 'per_visit',
    defaultPrice: 10000,
    priceRangeMin: 5000,
    priceRangeMax: 25000,
    roadmapStages: ['handover'],
  },

  // ─── Консультации ───────────────────────────────────────────
  {
    key: 'online_consultation',
    category: 'consultation',
    title: 'Онлайн-консультация',
    description: 'Видеозвонок: разбор планировки, стиль, бюджет, рекомендации',
    defaultUnit: 'per_hour',
    defaultPrice: 5000,
    priceRangeMin: 3000,
    priceRangeMax: 15000,
    roadmapStages: [],
  },
  {
    key: 'onsite_consultation',
    category: 'consultation',
    title: 'Выездная консультация',
    description: 'Приезд на объект с рекомендациями по планировке и стилю',
    defaultUnit: 'per_visit',
    defaultPrice: 10000,
    priceRangeMin: 5000,
    priceRangeMax: 25000,
    roadmapStages: [],
  },

  // ─── Дополнительные услуги ──────────────────────────────────
  {
    key: 'procurement_service',
    category: 'additional',
    title: 'Комплектация (закупки)',
    description: 'Полное сопровождение закупок: заказ, логистика, приёмка на объекте',
    defaultUnit: 'percent',
    defaultPrice: 15,
    priceRangeMin: 10,
    priceRangeMax: 25,
    roadmapStages: ['procurement'],
  },
  {
    key: 'custom_furniture',
    category: 'additional',
    title: 'Проектирование встроенной мебели',
    description: 'Чертежи и 3D-модели нестандартной мебели на заказ',
    defaultUnit: 'fixed',
    defaultPrice: 25000,
    priceRangeMin: 10000,
    priceRangeMax: 80000,
    roadmapStages: ['engineering'],
  },
  {
    key: 'styling',
    category: 'additional',
    title: 'Декорирование / стайлинг',
    description: 'Финальная расстановка декора, текстиля, аксессуаров',
    defaultUnit: 'per_sqm',
    defaultPrice: 300,
    priceRangeMin: 150,
    priceRangeMax: 600,
    roadmapStages: ['handover'],
  },
  {
    key: 'photo_shoot',
    category: 'additional',
    title: 'Фотосессия интерьера',
    description: 'Профессиональная фотосъёмка готового интерьера для портфолио',
    defaultUnit: 'fixed',
    defaultPrice: 30000,
    priceRangeMin: 15000,
    priceRangeMax: 80000,
    roadmapStages: [],
  },
]

// ── Пакеты услуг (прайс-листы) ─────────────────────────────────

export interface DesignerPackageTemplate {
  key: string
  title: string
  description: string
  /** Ключи услуг из DESIGNER_SERVICE_TEMPLATES */
  serviceKeys: string[]
  /** Рекомендованная цена за м² (усреднённая) */
  suggestedPricePerSqm: number
  priceRangeMin: number
  priceRangeMax: number
}

export const DESIGNER_PACKAGE_TEMPLATES: DesignerPackageTemplate[] = [
  {
    key: 'layout_only',
    title: 'Планировочное решение',
    description: 'Обмер + 2–3 варианта планировки. Минимальный пакет для тех, кто делает ремонт самостоятельно.',
    serviceKeys: ['measurement', 'space_planning'],
    suggestedPricePerSqm: 550,
    priceRangeMin: 350,
    priceRangeMax: 1200,
  },
  {
    key: 'concept',
    title: 'Эскизный проект (коллажи)',
    description: 'Обмер + планировка + мудборд + коллажи по помещениям + цветовые решения.',
    serviceKeys: ['site_visit', 'measurement', 'moodboard', 'concept_collage', 'space_planning', 'color_scheme'],
    suggestedPricePerSqm: 1800,
    priceRangeMin: 1000,
    priceRangeMax: 3500,
  },
  {
    key: 'design_project',
    title: 'Дизайн-проект с 3D',
    description: 'Эскизный проект + 3D-визуализация + развёртки стен + подбор материалов и мебели.',
    serviceKeys: [
      'site_visit', 'measurement', 'moodboard', 'concept_collage', 'space_planning', 'color_scheme',
      '3d_visualization', 'wall_elevations', 'material_selection', 'furniture_selection', 'lighting_plan',
    ],
    suggestedPricePerSqm: 3500,
    priceRangeMin: 2500,
    priceRangeMax: 6000,
  },
  {
    key: 'full_project',
    title: 'Полный дизайн-проект',
    description: 'Всё из «Дизайн-проект» + рабочие чертежи + полная спецификация.',
    serviceKeys: [
      'site_visit', 'measurement', 'moodboard', 'concept_collage', 'space_planning', 'color_scheme',
      '3d_visualization', 'wall_elevations', 'material_selection', 'furniture_selection', 'lighting_plan',
      'working_drawings', 'electrical_plan', 'plumbing_plan', 'ceiling_plan', 'floor_plan', 'specification',
    ],
    suggestedPricePerSqm: 5500,
    priceRangeMin: 3500,
    priceRangeMax: 10000,
  },
  {
    key: 'premium',
    title: 'Премиум (под ключ)',
    description: 'Полный проект + авторский надзор + комплектация + декорирование.',
    serviceKeys: [
      'site_visit', 'measurement', 'moodboard', 'concept_collage', 'space_planning', 'color_scheme',
      '3d_visualization', 'wall_elevations', 'material_selection', 'furniture_selection', 'lighting_plan',
      'working_drawings', 'electrical_plan', 'plumbing_plan', 'ceiling_plan', 'floor_plan', 'specification',
      'author_supervision', 'procurement_service', 'styling', 'commissioning',
    ],
    suggestedPricePerSqm: 8000,
    priceRangeMin: 6000,
    priceRangeMax: 15000,
  },
]

// ── Zod-схемы ───────────────────────────────────────────────────

export const DesignerServicePriceSchema = z.object({
  serviceKey: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().default(''),
  category: z.enum(DESIGNER_SERVICE_CATEGORIES),
  unit: z.enum(PRICE_UNITS),
  price: z.number().min(0),
  enabled: z.boolean().default(true),
})

export type DesignerServicePrice = z.infer<typeof DesignerServicePriceSchema>

export const DesignerPackageSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().default(''),
  serviceKeys: z.array(z.string()),
  pricePerSqm: z.number().min(0),
  enabled: z.boolean().default(true),
})

export type DesignerPackage = z.infer<typeof DesignerPackageSchema>

// ── Подписки (рекуррентные услуги) ──────────────────────────────

export const BILLING_PERIODS = ['monthly', 'quarterly', 'annual'] as const
export type BillingPeriod = typeof BILLING_PERIODS[number]

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly: 'Ежемесячно',
  quarterly: 'Ежеквартально',
  annual: 'Ежегодно',
}

export const BILLING_PERIOD_MONTHS: Record<BillingPeriod, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
}

export const DesignerSubscriptionSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().default(''),
  billingPeriod: z.enum(BILLING_PERIODS),
  price: z.number().min(0),
  /** Скидка в % (0–100) при оплате сразу за весь период */
  discount: z.number().min(0).max(100).default(0),
  /** Включённые услуги */
  serviceKeys: z.array(z.string()),
  /** Лимиты: сколько выездов / часов / рендеров в месяц */
  limits: z.record(z.string(), z.number()).optional().default({}),
  enabled: z.boolean().default(true),
})

export type DesignerSubscription = z.infer<typeof DesignerSubscriptionSchema>

export const DESIGNER_SUBSCRIPTION_TEMPLATES: {
  key: string
  title: string
  description: string
  billingPeriod: BillingPeriod
  price: number
  discount: number
  serviceKeys: string[]
  limits: Record<string, number>
}[] = [
  {
    key: 'support_monthly',
    title: 'Сопровождение (месяц)',
    description: 'Ежемесячное сопровождение проекта: 2 выезда + удалённые консультации без лимита',
    billingPeriod: 'monthly',
    price: 40000,
    discount: 0,
    serviceKeys: ['onsite_consultation', 'online_consultation', 'author_supervision'],
    limits: { visits: 2, online_hours: 8 },
  },
  {
    key: 'support_quarterly',
    title: 'Сопровождение (квартал)',
    description: 'Квартальный абонемент: 6 выездов + удалённые консультации + приёмка этапов',
    billingPeriod: 'quarterly',
    price: 105000,
    discount: 12,
    serviceKeys: ['onsite_consultation', 'online_consultation', 'author_supervision', 'commissioning'],
    limits: { visits: 6, online_hours: 24 },
  },
  {
    key: 'full_annual',
    title: 'Полное сопровождение (год)',
    description: 'Годовой контракт: неограниченные выезды + полный надзор + комплектация + стайлинг',
    billingPeriod: 'annual',
    price: 360000,
    discount: 25,
    serviceKeys: ['onsite_consultation', 'online_consultation', 'author_supervision', 'commissioning', 'procurement_service', 'styling'],
    limits: { visits: 48 },
  },
]

export const DesignerProfileSchema = z.object({
  name: z.string().min(1),
  companyName: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  telegram: z.string().optional().default(''),
  website: z.string().optional().default(''),
  city: z.string().optional().default(''),
  experience: z.string().optional().default(''),
  about: z.string().optional().default(''),
  specializations: z.array(z.string()).optional().default([]),
})

export type DesignerProfile = z.infer<typeof DesignerProfileSchema>

// ── Статусы проекта дизайнера ─────────────────────────────────

export const DESIGNER_PROJECT_STATUSES = [
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
] as const

export type DesignerProjectStatus = typeof DESIGNER_PROJECT_STATUSES[number]

export const DESIGNER_PROJECT_STATUS_LABELS: Record<DesignerProjectStatus, string> = {
  draft: 'Черновик',
  active: 'В работе',
  paused: 'На паузе',
  completed: 'Завершён',
  archived: 'Архив',
}
