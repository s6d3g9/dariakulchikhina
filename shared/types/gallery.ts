/**
 * shared/types/gallery.ts
 * Общие типы модуля галереи, используемые на клиенте и сервере.
 */
import type { MaterialProperties } from './material'

/** Элемент галереи (строка БД) */
export interface GalleryItem {
  id: number
  category: string
  title: string
  image?: string | null
  /** Дополнительные изображения (массив URL/filename) */
  images: string[]
  tags: string[]
  description?: string | null
  /** Отмечен как избранный / featured */
  featured: boolean
  /** Ширина основного изображения (px) */
  width?: number | null
  /** Высота основного изображения (px) */
  height?: number | null
  /** Структурированные свойства материала (JSONB) */
  properties?: MaterialProperties | null
  sortOrder: number
  createdAt: string
}

/** Payload для создания элемента */
export interface GalleryItemCreate {
  category: string
  title: string
  image?: string | null
  images?: string[]
  tags?: string[]
  description?: string | null
  featured?: boolean
  width?: number | null
  height?: number | null
  sortOrder?: number
  properties?: MaterialProperties | null
}

/** Payload для обновления элемента */
export interface GalleryItemUpdate extends Partial<GalleryItemCreate> {}

/** Параметры запроса GET /api/gallery */
export interface GalleryQuery {
  category?: string
  tag?: string
  featured?: boolean
  search?: string
  limit?: number
  offset?: number
}

/** Результат пакетной переупорядочивания */
export interface GalleryReorderPayload {
  /** Массив { id, sortOrder } */
  items: Array<{ id: number; sortOrder: number }>
}

/** Режим отображения галереи */
export type GalleryViewMode = 'grid' | 'masonry' | 'list'

/** Поле сортировки */
export type GallerySortField = 'date' | 'name' | 'sort-order'

/** Направление сортировки */
export type GallerySortDir = 'asc' | 'desc'

/** Состояние фильтров галереи (FilterBar ↔ AdminGallery) */
export interface GalleryFilterState {
  search: string
  activeTag: string | null
  showFeatured: boolean
  viewMode: GalleryViewMode
}
