export const ROADMAP_STAGE_TYPES = [
  'brief',
  'concept',
  'planning',
  'engineering',
  'procurement',
  'implementation',
  'supervision',
  'handover',
] as const

// ── Project lifecycle phases (BPMN v3.0) ──────────────────────────
export const PROJECT_STATUSES = [
  'lead',
  'concept',
  'working_project',
  'procurement',
  'construction',
  'commissioning',
  'completed',
] as const

export type ProjectStatus = typeof PROJECT_STATUSES[number]

export const PROJECT_PHASES: {
  key: ProjectStatus
  label: string
  short: string
  description: string
  color: 'gray' | 'violet' | 'blue' | 'amber' | 'orange' | 'green' | 'teal'
}[] = [
  { key: 'lead',            label: 'Инициация',       short: '0', description: 'Бриф, замеры, договор',          color: 'gray'   },
  { key: 'concept',         label: 'Эскиз',           short: '1', description: 'Концепция, планировка, 3D вайтбокс', color: 'violet' },
  { key: 'working_project', label: 'Рабочий проект',  short: '2', description: 'Рендеры, инженерия, согласование', color: 'blue'   },
  { key: 'procurement',     label: 'Закупки',         short: '3', description: 'Смета, тендер, фиксация бюджета',  color: 'amber'  },
  { key: 'construction',    label: 'Стройка',         short: '4', description: 'Авторский надзор, актирование',    color: 'orange' },
  { key: 'commissioning',   label: 'Сдача',           short: '5', description: 'ПНР, дефектовка, цифровая сдача', color: 'green'  },
  { key: 'completed',       label: 'Завершён',        short: '✓', description: 'Проект закрыт',                   color: 'teal'   },
]

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = Object.fromEntries(
  PROJECT_PHASES.map(p => [p.key, p.label])
) as Record<ProjectStatus, string>

export const CLIENT_TYPES = [
  'physical_person',
  'legal_entity',
  'family',
  'investor',
  'developer',
] as const

export const MATERIAL_TYPES = [
  'rough_materials',
  'finishing_materials',
  'furniture',
  'built_in_furniture',
  'lighting',
  'sanitary',
  'floor_coverings',
  'wall_coverings',
  'doors_partitions',
  'electrical_fittings',
  'decor',
  'textile',
  'appliances',
] as const

export const CONTRACTOR_TYPES = [
  'ip',
  'ooo',
  'self_employed',
] as const

export const CONTRACTOR_ROLE_TYPES = [
  // ── Управление ──────────────────────────────────────────────────
  'general_contractor',
  'foreman',
  'site_manager',
  'estimator',
  // ── Конструктив / черновые работы ───────────────────────────────
  'demolition_worker',
  'mason',
  'concrete_worker',
  'reinforcer',
  'welder',
  // ── Инженерные системы (MEP) ────────────────────────────────────
  'electrician',
  'plumber',
  'hvac_engineer',
  'low_current_engineer',
  'gas_engineer',
  'smart_home_installer',
  'security_installer',
  'av_installer',
  // ── Чистовые отделочные работы ──────────────────────────────────
  'plasterer',
  'painter',
  'tiler',
  'floor_installer',
  'wallpaper_installer',
  'decorative_finish_specialist',
  // ── Столярные / плотницкие ───────────────────────────────────────
  'carpenter',
  'joiner',
  'drywall_installer',
  'window_installer',
  'glazier',
  'furniture_assembler',
  // ── Специальные работы ───────────────────────────────────────────
  'stone_worker',
  'facade_worker',
  'roofer',
  'landscape_worker',
  'pool_installer',
  'cleaner',
] as const

export const CONTRACTOR_WORK_TYPES = [
  // ── Демонтаж и подготовка ────────────────────────────────────────
  'demolition',
  'debris_removal',
  // ── Конструктив ──────────────────────────────────────────────────
  'masonry',
  'concrete_work',
  'screed',
  'waterproofing',
  'partition_installation',
  'insulation',
  // ── Инженерные системы ───────────────────────────────────────────
  'electrical_installation',
  'plumbing_installation',
  'hvac',
  'heating',
  'smart_home',
  'low_current',
  'gas_installation',
  'security_systems',
  'av_systems',
  // ── Чистовая отделка ─────────────────────────────────────────────
  'plastering',
  'puttying',
  'tile_installation',
  'painting',
  'wallpapering',
  'ceiling_installation',
  'floor_installation',
  'decorative_plaster',
  // ── Столярные / плотницкие ───────────────────────────────────────
  'carpentry',
  'joinery',
  'window_installation',
  'door_installation',
  'built_in_furniture',
  'drywall_installation',
  // ── Специальные работы ───────────────────────────────────────────
  'stone_cladding',
  'facade_works',
  'roofing',
  'landscaping',
  'pool_installation',
  'furniture_installation',
  'final_cleaning',
] as const

export const DESIGNER_SERVICE_TYPES = [
  'consultation',
  'measurement',
  'technical_task',
  'layout_solution',
  'concept_design',
  'style_collage',
  'visualization_3d',
  'working_drawings',
  'author_supervision',
  'budgeting',
  'procurement_support',
  'decoration',
] as const

export const PAYMENT_TYPES = [
  'cash',
  'sbp',
  'card_transfer',
  'bank_transfer',
  'installments',
  'postpay',
  'prepay',
  'mixed',
] as const

export const CONTRACT_TYPES = [
  'fixed_price',
  'time_and_material',
  'milestone_based',
  'subscription',
  'mixed',
] as const

export const PROJECT_PRIORITY_TYPES = [
  'low',
  'medium',
  'high',
  'critical',
] as const

export const ROADMAP_COMPLEXITY_TYPES = [
  'basic',
  'standard',
  'advanced',
  'premium',
] as const

export const OBJECT_TYPES = [
  'apartment',
  'house',
  'office',
  'retail',
  'horeca',
  'public_space',
] as const

type Option<T extends string> = { value: T; label: string }

function asOptions<T extends readonly string[]>(
  values: T,
  labels: Record<T[number], string>,
): Array<Option<T[number]>> {
  return values.map(value => ({ value, label: labels[value] }))
}

export const ROADMAP_STAGE_TYPE_OPTIONS = asOptions(ROADMAP_STAGE_TYPES, {
  brief: 'Бриф и замер',
  concept: 'Концепция',
  planning: 'Планировочные решения',
  engineering: 'Инженерные разделы',
  procurement: 'Комплектация',
  implementation: 'Реализация',
  supervision: 'Авторский надзор',
  handover: 'Сдача объекта',
})

export const CLIENT_TYPE_OPTIONS = asOptions(CLIENT_TYPES, {
  physical_person: 'Физлицо',
  legal_entity: 'Юрлицо',
  family: 'Семья',
  investor: 'Инвестор',
  developer: 'Девелопер',
})

export const MATERIAL_TYPE_OPTIONS = asOptions(MATERIAL_TYPES, {
  rough_materials: 'Черновые материалы',
  finishing_materials: 'Чистовые отделочные материалы',
  furniture: 'Мебель',
  built_in_furniture: 'Встроенная мебель',
  lighting: 'Освещение',
  sanitary: 'Сантехника',
  floor_coverings: 'Напольные покрытия',
  wall_coverings: 'Настенные покрытия',
  doors_partitions: 'Двери и перегородки',
  electrical_fittings: 'Электрофурнитура',
  decor: 'Декор',
  textile: 'Текстиль',
  appliances: 'Техника',
})

export const CONTRACTOR_TYPE_OPTIONS = asOptions(CONTRACTOR_TYPES, {
  ip: 'ИП',
  ooo: 'ООО',
  self_employed: 'Самозанятый',
})

export const CONTRACTOR_ROLE_TYPE_OPTIONS = asOptions(CONTRACTOR_ROLE_TYPES, {
  // Управление
  general_contractor: 'Генеральный подрядчик',
  foreman: 'Прораб',
  site_manager: 'Мастер участка',
  estimator: 'Сметчик',
  // Конструктив
  demolition_worker: 'Демонтажник',
  mason: 'Каменщик',
  concrete_worker: 'Бетонщик',
  reinforcer: 'Арматурщик',
  welder: 'Сварщик',
  // MEP
  electrician: 'Электрик',
  plumber: 'Сантехник',
  hvac_engineer: 'Инженер ОВиК',
  low_current_engineer: 'Слаботочник',
  gas_engineer: 'Газовщик',
  smart_home_installer: 'Монтажник умного дома',
  security_installer: 'Монтажник СО и ОПС',
  av_installer: 'AV-инженер',
  // Чистовые
  plasterer: 'Штукатур',
  painter: 'Маляр',
  tiler: 'Плиточник',
  floor_installer: 'Укладчик напольных покрытий',
  wallpaper_installer: 'Обойщик',
  decorative_finish_specialist: 'Декоративные покрытия',
  // Столярные
  carpenter: 'Плотник',
  joiner: 'Столяр',
  drywall_installer: 'Гипсокартонщик',
  window_installer: 'Монтажник окон',
  glazier: 'Стекольщик',
  furniture_assembler: 'Сборщик мебели',
  // Специальные
  stone_worker: 'Мраморщик / камнерез',
  facade_worker: 'Фасадчик',
  roofer: 'Кровельщик',
  landscape_worker: 'Ландшафтный рабочий',
  pool_installer: 'Монтажник бассейнов',
  cleaner: 'Клинер',
})

export const CONTRACTOR_WORK_TYPE_OPTIONS = asOptions(CONTRACTOR_WORK_TYPES, {
  // Демонтаж
  demolition: 'Демонтаж',
  debris_removal: 'Вывоз мусора',
  // Конструктив
  masonry: 'Кладочные работы',
  concrete_work: 'Бетонные работы',
  screed: 'Стяжка',
  waterproofing: 'Гидроизоляция',
  partition_installation: 'Монтаж перегородок',
  insulation: 'Утепление / звукоизоляция',
  // Инженерные системы
  electrical_installation: 'Электромонтажные работы',
  plumbing_installation: 'Сантехнические работы',
  hvac: 'Вентиляция и кондиционирование',
  heating: 'Отопление',
  smart_home: 'Умный дом',
  low_current: 'Слаботочные системы',
  gas_installation: 'Газоснабжение',
  security_systems: 'Охранные системы',
  av_systems: 'Аудио/видео системы',
  // Чистовые отделочные
  plastering: 'Штукатурные работы',
  puttying: 'Шпатлёвочные работы',
  tile_installation: 'Укладка плитки',
  painting: 'Малярные работы',
  wallpapering: 'Поклейка обоев',
  ceiling_installation: 'Монтаж потолков',
  floor_installation: 'Монтаж напольных покрытий',
  decorative_plaster: 'Декоративные покрытия',
  // Столярные / плотницкие
  carpentry: 'Плотницкие работы',
  joinery: 'Столярные изделия',
  window_installation: 'Монтаж окон',
  door_installation: 'Монтаж дверей',
  built_in_furniture: 'Встроенная мебель',
  drywall_installation: 'Гипсокартонные работы',
  // Специальные
  stone_cladding: 'Облицовка натуральным камнем',
  facade_works: 'Фасадные работы',
  roofing: 'Кровельные работы',
  landscaping: 'Благоустройство и озеленение',
  pool_installation: 'Бассейны и СПА',
  furniture_installation: 'Сборка и монтаж мебели',
  final_cleaning: 'Финишная уборка',
})

export const DESIGNER_SERVICE_TYPE_OPTIONS = asOptions(DESIGNER_SERVICE_TYPES, {
  consultation: 'Консультация',
  measurement: 'Обмеры',
  technical_task: 'Создание ТЗ',
  layout_solution: 'Планировочное решение',
  concept_design: 'Разработка дизайн-проекта',
  style_collage: 'Стилистические коллажи',
  visualization_3d: '3D-визуализация',
  working_drawings: 'Рабочие чертежи',
  author_supervision: 'Авторский надзор',
  budgeting: 'Смета и бюджет',
  procurement_support: 'Комплектация',
  decoration: 'Декорирование',
})

export const PAYMENT_TYPE_OPTIONS = asOptions(PAYMENT_TYPES, {
  cash: 'Наличные',
  sbp: 'СБП',
  card_transfer: 'Перевод на карту',
  bank_transfer: 'Банковский перевод',
  installments: 'Рассрочка',
  postpay: 'Постоплата',
  prepay: 'Предоплата',
  mixed: 'Смешанный',
})

export const CONTRACT_TYPE_OPTIONS = asOptions(CONTRACT_TYPES, {
  fixed_price: 'Фиксированная стоимость',
  time_and_material: 'Time & Material',
  milestone_based: 'По этапам',
  subscription: 'Абонентский',
  mixed: 'Смешанный',
})

export const OBJECT_TYPE_OPTIONS = asOptions(OBJECT_TYPES, {
  apartment: 'Квартира',
  house: 'Частный дом',
  office: 'Офис',
  retail: 'Ритейл',
  horeca: 'HoReCa',
  public_space: 'Общественное пространство',
})

export const PROJECT_PRIORITY_OPTIONS = asOptions(PROJECT_PRIORITY_TYPES, {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
})

export const ROADMAP_COMPLEXITY_OPTIONS = asOptions(ROADMAP_COMPLEXITY_TYPES, {
  basic: 'Базовый',
  standard: 'Стандартный',
  advanced: 'Повышенной сложности',
  premium: 'Премиум',
})
