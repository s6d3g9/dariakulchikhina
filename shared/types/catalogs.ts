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

// ── Этапность выполнения работ по видам ─────────────────────────────────────
// Для каждого CONTRACTOR_WORK_TYPE — упорядоченный список технологических этапов
// по ГОСТ, СП и лучшей мировой практике строительства и отделки

type WorkStage = {
  key: string
  label: string
  hint?: string
}

export const WORK_TYPE_STAGES: Record<string, WorkStage[]> = {

  // ── ДЕМОНТАЖ ───────────────────────────────────────────────────────────────
  demolition: [
    { key: 'survey',       label: 'Обследование и разметка зон сноса' },
    { key: 'protection',   label: 'Защита смежных помещений и проёмов' },
    { key: 'utilities_off',label: 'Отключение инженерных систем' },
    { key: 'finishes',     label: 'Демонтаж отделочных покрытий' },
    { key: 'partitions',   label: 'Снос перегородок и ненесущих конструкций' },
    { key: 'systems',      label: 'Демонтаж старой сантехники, электрики' },
    { key: 'cleanup',      label: 'Первичная уборка и сортировка мусора' },
    { key: 'acceptance',   label: 'Акт освидетельствования оснований' },
  ],

  debris_removal: [
    { key: 'sorting',      label: 'Сортировка и упаковка отходов' },
    { key: 'loading',      label: 'Погрузка в контейнер / транспорт' },
    { key: 'export',       label: 'Вывоз на полигон' },
    { key: 'disposal',     label: 'Утилизация (документы)' },
    { key: 'site_clean',   label: 'Уборка места работ' },
  ],

  // ── КОНСТРУКТИВ ────────────────────────────────────────────────────────────
  masonry: [
    { key: 'layout',       label: 'Разбивка осей и разметка' },
    { key: 'base_prep',    label: 'Подготовка и гидроизоляция основания' },
    { key: 'delivery',     label: 'Доставка и приёмка материалов' },
    { key: 'first_row',    label: 'Кладка первого ряда по уровню' },
    { key: 'masonry',      label: 'Кладка по рядам с армированием' },
    { key: 'lintels',      label: 'Монтаж перемычек над проёмами' },
    { key: 'joints',       label: 'Расшивка и заделка швов' },
    { key: 'qc',           label: 'Контроль вертикальности и качества' },
  ],

  concrete_work: [
    { key: 'formwork',     label: 'Опалубочные работы' },
    { key: 'rebar',        label: 'Армирование каркаса' },
    { key: 'pour',         label: 'Заливка и уплотнение бетона (вибрирование)' },
    { key: 'curing',       label: 'Уход за бетоном (набор прочности)' },
    { key: 'stripping',    label: 'Распалубка' },
    { key: 'qc',           label: 'Контроль прочности и геометрии' },
  ],

  screed: [
    { key: 'base_clean',   label: 'Очистка и обеспыливание основания' },
    { key: 'primer',       label: 'Грунтование или гидроизоляция' },
    { key: 'insulation',   label: 'Тепло- / звукоизоляционный слой' },
    { key: 'beacons',      label: 'Выставление маяков' },
    { key: 'pour',         label: 'Заливка смеси' },
    { key: 'leveling',     label: 'Разравнивание и затирка' },
    { key: 'curing',       label: 'Набор прочности (28 сут. для ЦПС)' },
    { key: 'acceptance',   label: 'Приёмка: правило, влажность, ровность' },
  ],

  waterproofing: [
    { key: 'base_prep',    label: 'Подготовка поверхности (шлифовка, срезка выступов)' },
    { key: 'primer',       label: 'Грунтование' },
    { key: 'tape',         label: 'Герметизирующая лента по углам и швам' },
    { key: 'layer1',       label: 'Первый слой гидроизоляции' },
    { key: 'layer2',       label: 'Второй слой гидроизоляции' },
    { key: 'flood_test',   label: 'Проливная проверка (72 ч)' },
    { key: 'protection',   label: 'Защитная стяжка / плита' },
  ],

  partition_installation: [
    { key: 'layout',       label: 'Разметка по проекту' },
    { key: 'track',        label: 'Монтаж направляющего профиля (UW/UDC)' },
    { key: 'frame',        label: 'Сборка стоечного каркаса (CW/CD)' },
    { key: 'utilities',    label: 'Прокладка инженерных трасс внутри' },
    { key: 'side1',        label: 'Обшивка с первой стороны' },
    { key: 'insulation',   label: 'Заполнение звуко-/теплоизоляцией' },
    { key: 'side2',        label: 'Обшивка со второй стороны' },
    { key: 'jointing',     label: 'Армирование и шпаклёвка швов' },
  ],

  insulation: [
    { key: 'survey',       label: 'Обследование и выбор системы' },
    { key: 'base_prep',    label: 'Подготовка поверхности' },
    { key: 'vapour',       label: 'Монтаж паробарьера / ветрозащиты' },
    { key: 'insulation',   label: 'Укладка / набивка утеплителя' },
    { key: 'counter',      label: 'Монтаж контробрешётки и вентзазора' },
    { key: 'qc',           label: 'Контроль толщины и примыканий' },
  ],

  // ── ИНЖЕНЕРНЫЕ СИСТЕМЫ ─────────────────────────────────────────────────────
  electrical_installation: [
    { key: 'scheme',       label: 'Согласование однолинейной схемы' },
    { key: 'markup',       label: 'Разметка трасс и мест установки' },
    { key: 'chase',        label: 'Штробление / монтаж кабельных каналов' },
    { key: 'cable_lay',    label: 'Прокладка кабелей' },
    { key: 'boxes',        label: 'Монтаж распредкоробок и подрозетников' },
    { key: 'panel_rough',  label: 'Черновая сборка щитка' },
    { key: 'test',         label: 'Прозвонка и мегаомметр' },
    { key: 'outlets',      label: 'Установка розеток, выключателей, светильников' },
    { key: 'panel_final',  label: 'Чистовая сборка щитка' },
    { key: 'acceptance',   label: 'Замеры и акт ввода (ПУЭ)' },
  ],

  plumbing_installation: [
    { key: 'markup',       label: 'Разметка трасс и точек подключения' },
    { key: 'chase',        label: 'Штробление и монтаж гильз / стаканов' },
    { key: 'pipes',        label: 'Разводка труб ХВС, ГВС, канализации' },
    { key: 'pressure',     label: 'Гидравлические испытания (опрессовка)' },
    { key: 'collectors',   label: 'Монтаж коллекторов и счётчиков' },
    { key: 'rough_fix',    label: 'Черновая установка оборудования (выпуски)' },
    { key: 'final_fix',    label: 'Чистовый монтаж сантехприборов' },
    { key: 'commissioning',label: 'Пусконаладка и сдача' },
  ],

  hvac: [
    { key: 'design',       label: 'Согласование схемы воздухораспределения' },
    { key: 'ducts',        label: 'Монтаж воздуховодов и фасонных частей' },
    { key: 'ahu',          label: 'Установка вентустановки / рекуператора' },
    { key: 'outdoor',      label: 'Монтаж наружных блоков и диффузоров' },
    { key: 'drainage',     label: 'Прокладка дренажных линий' },
    { key: 'commissioning',label: 'Пусконаладочные работы' },
    { key: 'balancing',    label: 'Балансировка расходов воздуха' },
  ],

  heating: [
    { key: 'markup',       label: 'Разметка и монтаж коллекторного узла' },
    { key: 'pipes',        label: 'Прокладка труб (тёплый пол / радиаторы)' },
    { key: 'pressure',     label: 'Опрессовка контуров' },
    { key: 'boiler',       label: 'Монтаж котла и обвязки' },
    { key: 'screed',       label: 'Заливка стяжки (для тёплого пола)' },
    { key: 'commissioning',label: 'Балансировка и наладка' },
    { key: 'acceptance',   label: 'Сдача и пакет документов' },
  ],

  smart_home: [
    { key: 'design',       label: 'Проектирование: схемы, сценарии, оборудование' },
    { key: 'cable',        label: 'Прокладка кабельной инфраструктуры' },
    { key: 'cabinet',      label: 'Монтаж шкафа автоматики' },
    { key: 'devices',      label: 'Установка датчиков, реле, исполнительных устройств' },
    { key: 'programming',  label: 'Программирование контроллеров' },
    { key: 'interfaces',   label: 'Настройка пультов и мобильного приложения' },
    { key: 'scenarios',    label: 'Тестирование сценариев' },
    { key: 'training',     label: 'Обучение заказчика' },
  ],

  low_current: [
    { key: 'markup',       label: 'Разметка трасс и кабельных каналов' },
    { key: 'cable',        label: 'Прокладка кабелей (ТВ, интернет, СКС, телефон)' },
    { key: 'cross',        label: 'Монтаж кроссового шкафа / коммутатора' },
    { key: 'outlets',      label: 'Установка розеток и оконечных устройств' },
    { key: 'test',         label: 'Прозвонка и тестирование трактов' },
    { key: 'acceptance',   label: 'Сдача с протоколом' },
  ],

  gas_installation: [
    { key: 'design',       label: 'Проект и согласование в газовой службе' },
    { key: 'pipes',        label: 'Монтаж газопровода' },
    { key: 'equipment',    label: 'Установка счётчика и запорной арматуры' },
    { key: 'pressure',     label: 'Опрессовка системы' },
    { key: 'connection',   label: 'Подключение оборудования (котёл, плита)' },
    { key: 'inspection',   label: 'Сдача инспектору Горгаза' },
  ],

  security_systems: [
    { key: 'design',       label: 'Проектирование зон охраны' },
    { key: 'cable',        label: 'Прокладка кабельной инфраструктуры' },
    { key: 'sensors',      label: 'Установка датчиков и видеокамер' },
    { key: 'panel',        label: 'Монтаж контрольной панели / NVR' },
    { key: 'config',       label: 'Настройка и тестирование' },
    { key: 'monitoring',   label: 'Постановка на мониторинг / договор' },
  ],

  av_systems: [
    { key: 'design',       label: 'Проектирование и подбор оборудования' },
    { key: 'cable',        label: 'Прокладка HDMI, аудио, управляющих кабелей' },
    { key: 'install',      label: 'Установка экранов, проекторов, акустических систем' },
    { key: 'rack',         label: 'Монтаж AV-ресивера и медиасервера' },
    { key: 'config',       label: 'Настройка систем управления (AMX/Crestron)' },
    { key: 'acceptance',   label: 'Тестирование и сдача' },
  ],

  // ── ЧИСТОВАЯ ОТДЕЛКА ────────────────────────────────────────────────────────
  plastering: [
    { key: 'base_prep',    label: 'Очистка, грунтование, сетка (армирование откосов)' },
    { key: 'beacons',      label: 'Установка маяков по уровню' },
    { key: 'spray',        label: 'Набрызг (обрызг) первого слоя' },
    { key: 'ground',       label: 'Нанесение грунтового слоя' },
    { key: 'cover',        label: 'Накрывочный слой и заглаживание' },
    { key: 'beacons_rm',   label: 'Снятие маяков и заделка бороздок' },
    { key: 'qc',           label: 'Контроль ровности (правило 2 м)' },
  ],

  puttying: [
    { key: 'primer',       label: 'Грунтование оштукатуренной поверхности' },
    { key: 'start',        label: 'Стартовый слой шпатлёвки' },
    { key: 'sand1',        label: 'Шлифовка сеткой P80–100' },
    { key: 'finish',       label: 'Финишный слой шпатлёвки' },
    { key: 'sand2',        label: 'Шлифовка P120–180' },
    { key: 'primer2',      label: 'Грунтовка под чистовое покрытие' },
    { key: 'qc',           label: 'Контроль (лампа под косым светом)' },
  ],

  tile_installation: [
    { key: 'layout',       label: 'Разметка и вынос осей, поиск лицевого ряда' },
    { key: 'base',         label: 'Подготовка и грунтование основания' },
    { key: 'adhesive',     label: 'Нанесение клея (гребёнка по системе)' },
    { key: 'field',        label: 'Укладка поля плитки / мозаики' },
    { key: 'borders',      label: 'Укладка бордюров, декора, торцевых планок' },
    { key: 'cure',         label: 'Набор прочности клея (24–48 ч)' },
    { key: 'grouting',     label: 'Затирка швов (эпоксид / цемент)' },
    { key: 'polish',       label: 'Чистовая уборка и полировка' },
  ],

  painting: [
    { key: 'masking',      label: 'Малярная лента: защита плинтусов, окон, смежных поверхностей' },
    { key: 'primer',       label: 'Грунтование поверхности' },
    { key: 'layer1',       label: '1-й слой краски (раскатка валиком, углы кистью)' },
    { key: 'sand',         label: 'Лёгкая шлифовка (P220)' },
    { key: 'layer2',       label: '2-й слой краски' },
    { key: 'touch_up',     label: 'Подкраска дефектов' },
    { key: 'qc',           label: 'Контроль равномерности покрытия' },
  ],

  wallpapering: [
    { key: 'base_prep',    label: 'Подготовка поверхности (грунт под обои)' },
    { key: 'cut',          label: 'Разметка вертикали, раскрой полотен' },
    { key: 'glue',         label: 'Нанесение клея на полотно или стену' },
    { key: 'hang',         label: 'Поклейка полос, стыковка по рисунку' },
    { key: 'roll',         label: 'Прокатка роликом, выгонка пузырей' },
    { key: 'dry',          label: 'Просушка (без сквозняков)' },
    { key: 'qc',           label: 'Устранение отклеиваний и задиров' },
  ],

  ceiling_installation: [
    { key: 'markup',       label: 'Разметка уровня и периметра' },
    { key: 'profile',      label: 'Монтаж UD/CD-профилей и подвесов' },
    { key: 'frame',        label: 'Сборка несущего каркаса' },
    { key: 'utilities',    label: 'Прокладка электропроводки, вентиляционных гильз' },
    { key: 'sheathing',    label: 'Монтаж листов ГКЛ / натяжного полотна' },
    { key: 'jointing',     label: 'Армирование и шпаклёвка швов ГКЛ' },
    { key: 'lights',       label: 'Установка светильников и люков' },
    { key: 'qc',           label: 'Контроль ровности плоскости' },
  ],

  floor_installation: [
    { key: 'base_prep',    label: 'Подготовка стяжки (шлифовка, грунтование)' },
    { key: 'underlay',     label: 'Укладка подложки / нивелирующего слоя' },
    { key: 'direction',    label: 'Разметка направления и схемы укладки' },
    { key: 'laying',       label: 'Укладка покрытия (ламинат, инженерная, паркет)' },
    { key: 'glue_clamp',   label: 'Приклейка / схватывание (для паркета)' },
    { key: 'skirting',     label: 'Монтаж плинтусов и порожков' },
    { key: 'finish',       label: 'Финишная уборка и осмотр' },
  ],

  decorative_plaster: [
    { key: 'base_prep',    label: 'Грунтование и выравнивание основания' },
    { key: 'sample',       label: 'Тест-образец (согласование с заказчиком)' },
    { key: 'base_layer',   label: 'Нанесение базового слоя' },
    { key: 'deco_layer',   label: 'Нанесение декоративного слоя (1–2 прохода)' },
    { key: 'texture',      label: 'Текстурирование (гребень, спонж, штампы)' },
    { key: 'finish',       label: 'Воскование / лакирование / импрегнация' },
    { key: 'qc',           label: 'Финальный осмотр и устранение дефектов' },
  ],

  // ── СТОЛЯРНЫЕ / ПЛОТНИЦКИЕ ─────────────────────────────────────────────────
  carpentry: [
    { key: 'measure',      label: 'Обмерные работы и разработка чертежей' },
    { key: 'material',     label: 'Подбор и заготовка пиломатериала' },
    { key: 'production',   label: 'Изготовление элементов (стропила, балки, доски)' },
    { key: 'assembly',     label: 'Монтаж на объекте' },
    { key: 'sanding',      label: 'Шлифовка и устранение дефектов' },
    { key: 'coating',      label: 'Нанесение защитного покрытия (масло, антисептик)' },
    { key: 'acceptance',   label: 'Сдача' },
  ],

  joinery: [
    { key: 'design',       label: 'Разработка рабочих чертежей изделия' },
    { key: 'material',     label: 'Подбор породы, сушка, входной контроль' },
    { key: 'production',   label: 'Изготовление на производстве' },
    { key: 'delivery',     label: 'Доставка и складирование на объекте' },
    { key: 'install',      label: 'Монтаж и подгонка' },
    { key: 'finish',       label: 'Чистовая отделка (лак, масло, морилка)' },
    { key: 'acceptance',   label: 'Сдача' },
  ],

  window_installation: [
    { key: 'old_removal',  label: 'Демонтаж старых окон / витражей' },
    { key: 'frame_prep',   label: 'Подготовка проёма (зачистка, грунт)' },
    { key: 'frame_fix',    label: 'Монтаж рамы / коробки (анкеры)' },
    { key: 'foam_tape',    label: 'Запенивание и монтаж ПСУЛ-ленты' },
    { key: 'sill_drip',    label: 'Монтаж подоконника и отлива' },
    { key: 'glazing',      label: 'Установка стеклопакетов / алюминиевых систем' },
    { key: 'hardware',     label: 'Регулировка фурнитуры (притвор, прижим)' },
    { key: 'reveals',      label: 'Чистовая заделка откосов' },
  ],

  door_installation: [
    { key: 'frame_prep',   label: 'Подготовка проёма (зачистка, выравнивание)' },
    { key: 'box_install',  label: 'Монтаж дверной коробки (отвес, уровень)' },
    { key: 'hang',         label: 'Навеска полотна, регулировка петель' },
    { key: 'extras',       label: 'Монтаж добора и наличников' },
    { key: 'hardware',     label: 'Установка замка, ручки, ответной планки' },
    { key: 'adjust',       label: 'Финальная регулировка (зазоры, притвор)' },
  ],

  built_in_furniture: [
    { key: 'measure',      label: 'Точные обмеры с учётом косяков и неровностей' },
    { key: 'design',       label: 'Разработка и согласование проекта' },
    { key: 'production',   label: 'Изготовление корпусов и фасадов' },
    { key: 'delivery',     label: 'Доставка и входной контроль комплектации' },
    { key: 'carcass',      label: 'Монтаж корпусов' },
    { key: 'facades',      label: 'Установка фасадов' },
    { key: 'hardware',     label: 'Монтаж фурнитуры (петли, направляющие, доводчики)' },
    { key: 'adjust',       label: 'Регулировка и финальная проверка' },
  ],

  drywall_installation: [
    { key: 'markup',       label: 'Разметка конструкции по проекту' },
    { key: 'frame',        label: 'Монтаж металлического каркаса' },
    { key: 'utilities',    label: 'Прокладка инженерных коммуникаций внутри' },
    { key: 'insulation',   label: 'Закладка звуко-/теплоизоляции' },
    { key: 'sheathing',    label: 'Обшивка листами ГКЛ' },
    { key: 'jointing',     label: 'Армирование и шпаклёвка швов (серпянка)' },
    { key: 'sanding',      label: 'Шлифовка поверхности' },
    { key: 'primer',       label: 'Грунтование под чистовую отделку' },
  ],

  // ── СПЕЦИАЛЬНЫЕ РАБОТЫ ─────────────────────────────────────────────────────
  stone_cladding: [
    { key: 'base_prep',    label: 'Подготовка и грунтование основания' },
    { key: 'layout',       label: 'Раскладка плит и подбор текстурного рисунка' },
    { key: 'cutting',      label: 'Порезка и подгонка плит (влажная резка)' },
    { key: 'adhesive',     label: 'Укладка на специальный клей / эпоксид' },
    { key: 'grouting',     label: 'Заделка швов эпоксидной затиркой' },
    { key: 'grind',        label: 'Шлифовка и полировка поверхности' },
    { key: 'seal',         label: 'Нанесение защитной пропитки / кристаллизация' },
  ],

  facade_works: [
    { key: 'survey',       label: 'Обследование несущих конструкций фасада' },
    { key: 'design',       label: 'Разработка системы крепления (подсистемы)' },
    { key: 'frame',        label: 'Монтаж несущего каркаса / кронштейнов' },
    { key: 'insulation',   label: 'Монтаж фасадного утеплителя' },
    { key: 'cladding',     label: 'Монтаж облицовки (кассеты / панели / керамогранит)' },
    { key: 'sealing',      label: 'Герметизация стыков и примыканий' },
    { key: 'trims',        label: 'Монтаж подоконных отливов и откосных элементов' },
    { key: 'acceptance',   label: 'Сдача и скрытые работы (акты)' },
  ],

  roofing: [
    { key: 'old_removal',  label: 'Демонтаж старого кровельного покрытия' },
    { key: 'structure',    label: 'Ремонт/усиление стропильной системы' },
    { key: 'vapour',       label: 'Монтаж паро- и гидроизоляционной мембраны' },
    { key: 'insulation',   label: 'Укладка кровельного утеплителя' },
    { key: 'batten',       label: 'Монтаж обрешётки и контробрешётки' },
    { key: 'cover',        label: 'Укладка кровельного покрытия' },
    { key: 'gutter',       label: 'Монтаж водосточной системы' },
    { key: 'flashings',    label: 'Герметизация примыканий и ендов' },
  ],

  landscaping: [
    { key: 'planning',     label: 'Планировочное решение и разбивка участка' },
    { key: 'earthwork',    label: 'Вертикальная планировка (срезка / подсыпка)' },
    { key: 'utilities',    label: 'Прокладка дренажа, полива, уличного освещения' },
    { key: 'hardscape',    label: 'Устройство дорожек, площадок (плитка, брусчатка)' },
    { key: 'soil',         label: 'Подготовка почвы, завоз плодородного грунта' },
    { key: 'planting',     label: 'Посадка деревьев, кустарников, газона' },
    { key: 'autowater',    label: 'Монтаж системы автополива' },
    { key: 'finishing',    label: 'Финишные элементы (ограждения, МАФ, декор)' },
  ],

  pool_installation: [
    { key: 'excavation',   label: 'Земляные работы: котлован' },
    { key: 'shell',        label: 'Устройство железобетонной чаши' },
    { key: 'waterproof',   label: 'Гидроизоляция чаши' },
    { key: 'equipment',    label: 'Монтаж технической комнаты (фильтры, насосы, закладные)' },
    { key: 'cladding',     label: 'Облицовка чаши (мозаика / ПВХ-плёнка)' },
    { key: 'deck',         label: 'Монтаж борта и обходной дорожки' },
    { key: 'commissioning',label: 'Пусконаладка оборудования' },
    { key: 'filling',      label: 'Наполнение и балансировка химии' },
    { key: 'acceptance',   label: 'Пробный пуск и сдача' },
  ],

  furniture_installation: [
    { key: 'delivery',     label: 'Приём и проверка комплектации по накладной' },
    { key: 'room_prep',    label: 'Подготовка помещения' },
    { key: 'assembly',     label: 'Сборка по инструкции производителя' },
    { key: 'wall_fix',     label: 'Крепление к стенам / потолку (антиопрокидыватели)' },
    { key: 'hardware',     label: 'Регулировка петель, направляющих, доводчиков' },
    { key: 'acceptance',   label: 'Сдача и подпись акта' },
  ],

  final_cleaning: [
    { key: 'dry',          label: 'Сухая уборка (пыль со стен, потолков, труднодоступных мест)' },
    { key: 'wet_walls',    label: 'Влажная уборка стен и потолков' },
    { key: 'windows',      label: 'Мытьё окон и зеркал (с двух сторон)' },
    { key: 'sanitary',     label: 'Чистка плитки, сантехники, хром-элементов' },
    { key: 'floors',       label: 'Уборка полов: мойка / шлифовка / полировка' },
    { key: 'final_check',  label: 'Финальная проверка и подпись акта сдачи' },
  ],
}

