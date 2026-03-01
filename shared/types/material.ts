/**
 * shared/types/material.ts
 *
 * Типизация свойств строительных/отделочных материалов.
 *
 * Структура разработана на основе лучших мировых практик материалотек:
 * — Materialized (ETH Zürich) — классификация тактильных/визуальных свойств
 * — Architonic — каталогизация по применению и сертификации
 * — 3M Material Library — физико-химические паспорта
 * — Google Material Gallery — UX карточек и сравнения
 * — matériO (Париж) — сенсорные описания материалов
 *
 * Все группы свойств опциональны — заполняется то, что релевантно
 * для конкретного типа материала.
 */

// ─── Физические свойства ──────────────────────────────────
export interface MaterialPhysical {
  /** Тип материала: "керамогранит", "ламинат", "мрамор", "дерево" */
  material?: string
  /** Размеры: "600×600×10 мм", "2440×1220×18 мм" */
  dimensions?: string
  /** Масса на единицу: "18.5 кг/м²", "12 кг/шт" */
  weight?: string
  /** Плотность: "2400 кг/м³" */
  density?: string
  /** Твёрдость: "6 по Моосу", "Shore A 85" */
  hardness?: string
  /** Прочность на изгиб/сжатие: "45 МПа", "R11" */
  strength?: string
  /** Пористость: "< 0.5%", "открытая" */
  porosity?: string
  /** Водопоглощение: "< 0.1%", "< 3%" */
  waterAbsorption?: string
  /** Морозостойкость: "200 циклов", "F150" */
  frostResistance?: string
  /** Класс огнестойкости: "КМ0 (НГ)", "Г1", "B-s1,d0" */
  fireClass?: string
  /** Теплопроводность: "1.3 Вт/(м·К)" */
  thermalConductivity?: string
  /** Звукоизоляция: "19 дБ", "ΔLw = 18 дБ" */
  soundInsulation?: string
  /** Термостойкость: "до +80°C", "-40...+60°C" */
  temperatureRange?: string
  /** Линейное расширение: "6×10⁻⁶ /°C" */
  thermalExpansion?: string
}

// ─── Тактильные свойства ──────────────────────────────────
export interface MaterialTactile {
  /** Текстура поверхности: "шелковистая", "рельефная", "бархатная", "зернистая" */
  texture?: string
  /** Ощущение температуры: "тёплый", "нейтральный", "холодный" */
  temperatureFeel?: string
  /** Сцепление/grip: "высокий R10", "антискользящий" */
  grip?: string
  /** Комфорт: "комфортный босиком", "требует ковровое покрытие" */
  comfort?: string
  /** Тип поверхности: "матовая", "полированная", "структурированная", "лаппатированная" */
  surface?: string
  /** Тактильный вес (субъективно): "лёгкий", "массивный", "воздушный" */
  perceivedWeight?: string
  /** Эластичность ощупь: "жёсткий", "упругий", "мягкий" */
  flexibility?: string
  /** Акустический отклик: "глухой", "звонкий", "приглушённый" */
  acousticFeel?: string
}

// ─── Химические свойства ──────────────────────────────────
export interface MaterialChemical {
  /** Химический состав: "полевой шпат, кварц, каолин" */
  composition?: string
  /** Стойкость к pH: "pH 3–12" */
  phResistance?: string
  /** Стойкость к загрязнениям: "класс 5 по ISO 10545-14" */
  stainResistance?: string
  /** Стойкость к бытовой химии: "устойчив", "ограниченно" */
  chemicalResistance?: string
  /** Эмиссия летучих веществ (VOC): "A+", "M1" */
  voc?: string
  /** Экологический класс: "E0", "E1", "FSC" */
  ecologyClass?: string
  /** Антибактериальные свойства */
  antibacterial?: boolean
  /** Гипоаллергенность */
  hypoallergenic?: boolean
  /** UV-стойкость: "высокая", "> 7 баллов ISO 105-B02" */
  uvResistance?: string
  /** Стойкость к коррозии/окислению */
  corrosionResistance?: string
}

// ─── Визуальные свойства ──────────────────────────────────
export interface MaterialVisual {
  /** Основные цвета (названия или hex) */
  colors?: string[]
  /** Тип рисунка: "мраморные прожилки", "древесный", "однородный" */
  pattern?: string
  /** Финиш: "сатинированная", "глянцевая", "матовая", "зеркальная" */
  finish?: string
  /** Прозрачность: "непрозрачный", "полупрозрачный", "прозрачный" */
  translucency?: string
  /** Прожилки/жилки: "хаотичные золотистые", "линейные серые" */
  veining?: string
  /** Блеск (gloss units): "5 GU", "90 GU" */
  gloss?: string
  /** Степень вариации между экземплярами: "V1 однородный" ... "V4 случайный" */
  variation?: string
  /** Эффект глубины: "плоский", "3D-рельеф", "глубокий" */
  depthEffect?: string
}

// ─── Эксплуатационные свойства ────────────────────────────
export interface MaterialPerformance {
  /** Класс износостойкости: "PEI V", "AC5/33", "класс 34" */
  wearClass?: string
  /** Антискольжение: "R10", "R11", "C по DIN 51097" */
  slipResistance?: string
  /** Класс влагостойкости: "IP68", "влагостойкий" */
  moistureClass?: string
  /** Несущая нагрузка: "до 500 кг/м²" */
  loadCapacity?: string
  /** Ожидаемый срок службы */
  lifespan?: string
  /** Уровень обслуживания: "минимальный", "средний", "высокий" */
  maintenanceLevel?: string
  /** Устойчивость к выцветанию */
  colorFastness?: string
  /** Ударопрочность: "класс 1", "высокая" */
  impactResistance?: string
  /** Подходит для тёплого пола */
  underfloorHeating?: boolean
  /** Подходит для фасадов */
  facadeUse?: boolean
  /** Подходит для помещений с высокой влажностью */
  wetRoomUse?: boolean
}

// ─── Применение ───────────────────────────────────────────
export interface MaterialApplication {
  /** Зоны применения: ["ванная", "кухня", "гостиная", "терраса", "фасад"] */
  zones?: string[]
  /** Метод монтажа: "клеевой", "плавающий", "механический" */
  method?: string
  /** Требования к основанию: "ровная стяжка ≤ 2мм/2м" */
  substrate?: string
  /** Затирка/шов: "эпоксидная 2мм", "бесшовный" */
  grout?: string
  /** Рекомендуемый клей/адгезив */
  adhesive?: string
  /** Расход на м² (клея, затирки) */
  consumptionRate?: string
  /** Рекомендуемые сочетания с другими материалами */
  combinations?: string[]
  /** Ограничения по применению */
  restrictions?: string[]
}

// ─── Коммерческие данные ──────────────────────────────────
export interface MaterialCommercial {
  /** Производитель / бренд */
  manufacturer?: string
  /** Коллекция */
  collection?: string
  /** Артикул / SKU */
  article?: string
  /** Страна производства */
  countryOfOrigin?: string
  /** Цена за единицу: "3 450 ₽/м²" */
  pricePerUnit?: string
  /** Единица измерения: "м²", "шт", "п.м." */
  unit?: string
  /** Срок поставки: "2–4 недели", "в наличии" */
  leadTime?: string
  /** Минимальный заказ: "от 10 м²" */
  minOrder?: string
  /** Наличие: "в наличии", "под заказ", "снято с производства" */
  availability?: 'in-stock' | 'to-order' | 'discontinued' | string
  /** Гарантия: "25 лет" */
  warranty?: string
}

// ─── Сертификация ─────────────────────────────────────────
export interface MaterialCertification {
  /** Название: "ГОСТ 6787-2001" */
  name: string
  /** Номер/идентификатор */
  number?: string
  /** Действует до */
  validUntil?: string
  /** Документ (filename загруженного PDF) */
  document?: string
}

// ─── Произвольные (пользовательские) группы свойств ────────
export interface MaterialCustomGroup {
  /** Название группы: "Уход и чистка", "Особенности монтажа" */
  groupName: string
  /** Пары ключ-значение */
  items: Array<{ label: string; value: string }>
}

// ─── Корневой объект свойств материала ─────────────────────
export interface MaterialProperties {
  /** Физические свойства */
  physical?: MaterialPhysical
  /** Тактильные / сенсорные свойства */
  tactile?: MaterialTactile
  /** Химические свойства */
  chemical?: MaterialChemical
  /** Визуальные свойства */
  visual?: MaterialVisual
  /** Эксплуатационные характеристики */
  performance?: MaterialPerformance
  /** Применение и монтаж */
  application?: MaterialApplication
  /** Коммерческие данные */
  commercial?: MaterialCommercial
  /** Сертификаты и стандарты */
  certifications?: MaterialCertification[]
  /** Пользовательские группы свойств */
  custom?: MaterialCustomGroup[]
  /** Общие заметки */
  notes?: string
}

// ─── Группы свойств для UI (табов/секций) ─────────────────
export const MATERIAL_PROPERTY_GROUPS = [
  { key: 'physical', label: 'Физические', icon: 'cube' },
  { key: 'tactile', label: 'Тактильные', icon: 'hand' },
  { key: 'chemical', label: 'Химические', icon: 'flask' },
  { key: 'visual', label: 'Визуальные', icon: 'eye' },
  { key: 'performance', label: 'Эксплуатация', icon: 'gauge' },
  { key: 'application', label: 'Применение', icon: 'wrench' },
  { key: 'commercial', label: 'Коммерция', icon: 'tag' },
  { key: 'certifications', label: 'Сертификаты', icon: 'shield' },
] as const

export type MaterialPropertyGroupKey = typeof MATERIAL_PROPERTY_GROUPS[number]['key']

// ─── Метки полей для UI (русские названия) ────────────────
export const MATERIAL_FIELD_LABELS: Record<string, Record<string, string>> = {
  physical: {
    material: 'Тип материала',
    dimensions: 'Размеры',
    weight: 'Масса',
    density: 'Плотность',
    hardness: 'Твёрдость',
    strength: 'Прочность',
    porosity: 'Пористость',
    waterAbsorption: 'Водопоглощение',
    frostResistance: 'Морозостойкость',
    fireClass: 'Класс огнестойкости',
    thermalConductivity: 'Теплопроводность',
    soundInsulation: 'Звукоизоляция',
    temperatureRange: 'Диапазон температур',
    thermalExpansion: 'Линейное расширение',
  },
  tactile: {
    texture: 'Текстура',
    temperatureFeel: 'Ощущение температуры',
    grip: 'Сцепление',
    comfort: 'Комфорт',
    surface: 'Поверхность',
    perceivedWeight: 'Визуальный вес',
    flexibility: 'Эластичность',
    acousticFeel: 'Акустика',
  },
  chemical: {
    composition: 'Состав',
    phResistance: 'Стойкость к pH',
    stainResistance: 'Стойкость к пятнам',
    chemicalResistance: 'Устойчивость к химии',
    voc: 'Эмиссия VOC',
    ecologyClass: 'Экологический класс',
    antibacterial: 'Антибактериальный',
    hypoallergenic: 'Гипоаллергенный',
    uvResistance: 'UV-стойкость',
    corrosionResistance: 'Коррозийная стойкость',
  },
  visual: {
    colors: 'Цвета',
    pattern: 'Рисунок',
    finish: 'Финиш',
    translucency: 'Прозрачность',
    veining: 'Прожилки',
    gloss: 'Блеск',
    variation: 'Вариация',
    depthEffect: 'Глубина',
  },
  performance: {
    wearClass: 'Класс износа',
    slipResistance: 'Антискольжение',
    moistureClass: 'Влагостойкость',
    loadCapacity: 'Несущая нагрузка',
    lifespan: 'Срок службы',
    maintenanceLevel: 'Обслуживание',
    colorFastness: 'Стойкость цвета',
    impactResistance: 'Ударопрочность',
    underfloorHeating: 'Тёплый пол',
    facadeUse: 'Для фасадов',
    wetRoomUse: 'Для влажных зон',
  },
  application: {
    zones: 'Зоны применения',
    method: 'Метод монтажа',
    substrate: 'Основание',
    grout: 'Затирка / шов',
    adhesive: 'Клей / адгезив',
    consumptionRate: 'Расход',
    combinations: 'Сочетания',
    restrictions: 'Ограничения',
  },
  commercial: {
    manufacturer: 'Производитель',
    collection: 'Коллекция',
    article: 'Артикул',
    countryOfOrigin: 'Страна',
    pricePerUnit: 'Цена',
    unit: 'Единица',
    leadTime: 'Срок поставки',
    minOrder: 'Мин. заказ',
    availability: 'Наличие',
    warranty: 'Гарантия',
  },
}

// ─── Предустановленные значения для автокомплита ──────────
export const MATERIAL_PRESETS = {
  zones: [
    'ванная', 'кухня', 'гостиная', 'спальня', 'детская',
    'прихожая', 'терраса', 'балкон', 'фасад', 'бассейн',
    'коммерческое помещение', 'офис', 'ресторан',
  ],
  surfaces: [
    'матовая', 'глянцевая', 'полированная', 'сатинированная',
    'лаппатированная', 'структурированная', 'рельефная',
    'текстильная', 'кожанная', 'каменная',
  ],
  finishes: [
    'matt', 'glossy', 'satin', 'honed', 'brushed',
    'lappato', 'natural', 'polished', 'antique', 'rustic',
  ],
  textures: [
    'гладкая', 'шелковистая', 'бархатная', 'рельефная',
    'зернистая', 'волнистая', 'грубая', 'нежная',
  ],
  fireClasses: [
    'КМ0 (НГ)', 'КМ1 (Г1, В1, Д1, Т1)', 'КМ2 (Г1, В2, Д2, Т2)',
    'A1', 'A2', 'B', 'C', 'D', 'E', 'F',
    'B-s1,d0', 'B-s2,d0', 'C-s1,d0',
  ],
  availability: [
    { value: 'in-stock', label: 'В наличии' },
    { value: 'to-order', label: 'Под заказ' },
    { value: 'discontinued', label: 'Снято с производства' },
  ],
} as const
