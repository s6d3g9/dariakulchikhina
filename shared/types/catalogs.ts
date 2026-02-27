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
  'foreman',
  'electrician',
  'plumber',
  'tiler',
  'plasterer',
  'painter',
  'drywall_installer',
  'furniture_assembler',
  'hvac_engineer',
  'low_current_engineer',
  'glazier',
  'stone_worker',
] as const

export const CONTRACTOR_WORK_TYPES = [
  'demolition',
  'partition_installation',
  'plastering',
  'puttying',
  'screed',
  'waterproofing',
  'electrical_installation',
  'plumbing_installation',
  'tile_installation',
  'painting',
  'wallpapering',
  'ceiling_installation',
  'door_installation',
  'floor_installation',
  'joinery',
  'tiling',
  'hvac',
  'smart_home',
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
  foreman: 'Прораб',
  electrician: 'Электрик',
  plumber: 'Сантехник',
  tiler: 'Плиточник',
  plasterer: 'Штукатур',
  painter: 'Маляр',
  drywall_installer: 'Гипсокартонщик',
  furniture_assembler: 'Сборщик мебели',
  hvac_engineer: 'Инженер ОВиК',
  low_current_engineer: 'Слаботочник',
  glazier: 'Стекольщик',
  stone_worker: 'Каменщик',
})

export const CONTRACTOR_WORK_TYPE_OPTIONS = asOptions(CONTRACTOR_WORK_TYPES, {
  demolition: 'Демонтаж',
  partition_installation: 'Монтаж перегородок',
  plastering: 'Штукатурные работы',
  puttying: 'Шпатлевка',
  screed: 'Стяжка',
  waterproofing: 'Гидроизоляция',
  electrical_installation: 'Электромонтажные работы',
  plumbing_installation: 'Сантехнические работы',
  tile_installation: 'Укладка плитки',
  painting: 'Малярные работы',
  wallpapering: 'Поклейка обоев',
  ceiling_installation: 'Монтаж потолков',
  door_installation: 'Монтаж дверей',
  floor_installation: 'Монтаж напольных покрытий',
  joinery: 'Столярные работы',
  tiling: 'Плиточные работы',
  hvac: 'ОВиК',
  smart_home: 'Умный дом',
  furniture_installation: 'Монтаж мебели',
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
