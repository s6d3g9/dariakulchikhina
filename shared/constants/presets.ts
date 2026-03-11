/**
 * shared/constants/presets.ts
 * Пресеты типов проектов.
 * Каждый пресет задаёт: тип объекта, эмодзи, описание, страницы и начальные данные профиля.
 */

import { CORE_PAGES } from './pages'

// Типы объектов недвижимости
export type ProjectPresetKey =
  | 'apartment'         // Квартира
  | 'house'             // Частный дом
  | 'cottage'           // Загородный дом / дача
  | 'townhouse'         // Таунхаус
  | 'office'            // Офис
  | 'commercial_space'  // Торговое помещение / шоурум
  | 'restaurant'        // Ресторан
  | 'cafe'              // Кафе / кофейня
  | 'hotel'             // Отель
  | 'guest_house'       // Гостевой дом / B&B
  | 'other'             // Другое / нестандартный проект

export interface ProjectPreset {
  key: ProjectPresetKey
  label: string
  icon: string
  description: string
  /** Тип: жилой или коммерческий */
  category: 'residential' | 'commercial'
  /** Набор страниц проекта. По умолчанию = CORE_PAGES */
  pages: string[]
  /** Начальные значения в project.profile */
  defaultProfile: Record<string, string>
}

/** Полный набор CORE_PAGES - базовый для всех жилых объектов */
const RESIDENTIAL_PAGES = [...CORE_PAGES]

/** Коммерческие объекты: убираем клиентские страницы, специфичные для жилья */
const COMMERCIAL_PAGES = CORE_PAGES.filter(
  p => !['client_passport', 'client_brief'].includes(p),
)

export const PROJECT_PRESETS: ProjectPreset[] = [
  // ── Жилые ──────────────────────────────────────────────────────
  {
    key: 'apartment',
    label: 'Квартира',
    icon: '🏠',
    description: 'Жилая квартира: студия, 1–3 комнаты, апартаменты',
    category: 'residential',
    pages: RESIDENTIAL_PAGES,
    defaultProfile: {
      object_type: 'apartment',
    },
  },
  {
    key: 'house',
    label: 'Частный дом',
    icon: '🏡',
    description: 'ИЖС, таунхаус, дуплекс в черте города',
    category: 'residential',
    pages: RESIDENTIAL_PAGES,
    defaultProfile: {
      object_type: 'house',
    },
  },
  {
    key: 'cottage',
    label: 'Загородный дом',
    icon: '🌲',
    description: 'Дача, коттедж, загородный дом',
    category: 'residential',
    pages: RESIDENTIAL_PAGES,
    defaultProfile: {
      object_type: 'cottage',
    },
  },
  {
    key: 'townhouse',
    label: 'Таунхаус',
    icon: '🏘',
    description: 'Секция таунхауса, дуплекс',
    category: 'residential',
    pages: RESIDENTIAL_PAGES,
    defaultProfile: {
      object_type: 'townhouse',
    },
  },

  // ── Коммерческие ────────────────────────────────────────────────
  {
    key: 'office',
    label: 'Офис',
    icon: '🏢',
    description: 'Офисное пространство, коворкинг, переговорные',
    category: 'commercial',
    pages: COMMERCIAL_PAGES,
    defaultProfile: {
      object_type: 'office',
    },
  },
  {
    key: 'commercial_space',
    label: 'Торговое помещение',
    icon: '🛍',
    description: 'Магазин, шоурум, торговый зал',
    category: 'commercial',
    pages: COMMERCIAL_PAGES,
    defaultProfile: {
      object_type: 'commercial_space',
    },
  },
  {
    key: 'restaurant',
    label: 'Ресторан',
    icon: '🍽',
    description: 'Ресторан, бар, фуд-холл',
    category: 'commercial',
    pages: COMMERCIAL_PAGES,
    defaultProfile: {
      object_type: 'restaurant',
    },
  },
  {
    key: 'cafe',
    label: 'Кафе / кофейня',
    icon: '☕',
    description: 'Кафе, кофейня, кондитерская, фастфуд',
    category: 'commercial',
    pages: COMMERCIAL_PAGES,
    defaultProfile: {
      object_type: 'cafe',
    },
  },
  {
    key: 'hotel',
    label: 'Отель',
    icon: '🏨',
    description: 'Гостиница, бутик-отель, мини-отель',
    category: 'commercial',
    pages: COMMERCIAL_PAGES,
    defaultProfile: {
      object_type: 'hotel',
    },
  },
  {
    key: 'guest_house',
    label: 'Гостевой дом',
    icon: '🛖',
    description: 'B&B, гостевой дом, глэмпинг, апарт-отель',
    category: 'commercial',
    pages: COMMERCIAL_PAGES,
    defaultProfile: {
      object_type: 'guest_house',
    },
  },
  {
    key: 'other',
    label: 'Другое',
    icon: '✏️',
    description: 'Нестандартный объект — настроить самостоятельно',
    category: 'commercial',
    pages: [...CORE_PAGES],
    defaultProfile: {
      object_type: 'other',
    },
  },
]

/** Найти пресет по ключу */
export function findPreset(key: string): ProjectPreset | undefined {
  return PROJECT_PRESETS.find(p => p.key === key)
}

/** Пресеты по категории */
export function getPresetsByCategory(category: 'residential' | 'commercial'): ProjectPreset[] {
  return PROJECT_PRESETS.filter(p => p.category === category)
}

/** Метка типа объекта по project_type */
export function presetLabel(key: string): string {
  return findPreset(key as ProjectPresetKey)?.label ?? key
}

/** Иконка типа объекта */
export function presetIcon(key: string): string {
  return findPreset(key as ProjectPresetKey)?.icon ?? '📁'
}
