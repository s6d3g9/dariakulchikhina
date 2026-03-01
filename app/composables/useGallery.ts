/**
 * app/composables/useGallery.ts
 * Composable для управления состоянием галереи.
 *
 * Централизует: загрузку, фильтрацию, поиск, CRUD, переупорядочивание,
 * пакетные операции, сортировку, и lightbox.
 *
 * Вдохновлено: Unsplash (masonry + lightbox), Pinterest (infinite scroll),
 * Behance (multi-image carousels), Dribbble (filter UX).
 */
import type { GalleryItem, GalleryViewMode, GallerySortField, GallerySortDir } from '~~/shared/types/gallery'

export function useGallery(category?: Ref<string> | string) {
  const items = ref<GalleryItem[]>([])
  const loading = ref(false)
  const error = ref('')

  // ── Фильтрация / поиск ─────────────────────────────────
  const search = ref('')
  const activeTag = ref<string | null>(null)
  const showFeaturedOnly = ref(false)
  const viewMode = ref<GalleryViewMode>('masonry')

  // ── Сортировка ──────────────────────────────────────────
  const sortField = ref<GallerySortField>('sort-order')
  const sortDir = ref<GallerySortDir>('asc')

  // ── Batch selection ─────────────────────────────────────
  const selectedIds = ref<Set<number>>(new Set())
  const batchMode = ref(false)

  function toggleBatchMode() {
    batchMode.value = !batchMode.value
    if (!batchMode.value) selectedIds.value.clear()
  }

  function toggleSelect(id: number) {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
    // Trigger reactivity
    selectedIds.value = new Set(selectedIds.value)
  }

  function selectAll() {
    filtered.value.forEach((i: GalleryItem) => selectedIds.value.add(i.id))
    selectedIds.value = new Set(selectedIds.value)
  }

  function deselectAll() {
    selectedIds.value.clear()
    selectedIds.value = new Set(selectedIds.value)
  }

  const selectedCount = computed(() => selectedIds.value.size)

  /** Все уникальные теги текущей категории */
  const allTags = computed(() => {
    const set = new Set<string>()
    items.value.forEach((i: GalleryItem) => i.tags?.forEach((t: string) => set.add(t)))
    return Array.from(set).sort()
  })

  /** Отфильтрованные и отсортированные элементы */
  const filtered = computed(() => {
    let result = items.value as GalleryItem[]

    if (showFeaturedOnly.value) {
      result = result.filter((i: GalleryItem) => i.featured)
    }

    if (activeTag.value) {
      result = result.filter((i: GalleryItem) => i.tags?.includes(activeTag.value!))
    }

    if (search.value) {
      const q = search.value.toLowerCase()
      result = result.filter((i: GalleryItem) =>
        i.title.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.tags?.some((t: string) => t.toLowerCase().includes(q)),
      )
    }

    // Сортировка
    const dir = sortDir.value === 'asc' ? 1 : -1
    result = [...result].sort((a: GalleryItem, b: GalleryItem) => {
      switch (sortField.value) {
        case 'name':
          return dir * a.title.localeCompare(b.title, 'ru')
        case 'date':
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        case 'sort-order':
        default:
          return dir * (a.sortOrder - b.sortOrder)
      }
    })

    return result
  })

  // ── Lightbox ────────────────────────────────────────────
  const lightboxIndex = ref<number | null>(null)
  const lightboxOpen = computed(() => lightboxIndex.value !== null)
  const lightboxItem = computed(() =>
    lightboxIndex.value !== null ? filtered.value[lightboxIndex.value] ?? null : null,
  )

  function openLightbox(index: number) {
    lightboxIndex.value = index
  }

  function closeLightbox() {
    lightboxIndex.value = null
  }

  function lightboxNext() {
    if (lightboxIndex.value === null) return
    lightboxIndex.value = (lightboxIndex.value + 1) % filtered.value.length
  }

  function lightboxPrev() {
    if (lightboxIndex.value === null) return
    lightboxIndex.value = (lightboxIndex.value - 1 + filtered.value.length) % filtered.value.length
  }

  // ── CRUD ────────────────────────────────────────────────
  const categoryValue = computed(() =>
    typeof category === 'string' ? category : category?.value,
  )

  async function load() {
    loading.value = true
    error.value = ''
    try {
      const params = new URLSearchParams()
      if (categoryValue.value) params.set('category', categoryValue.value)
      const data = await $fetch<GalleryItem[]>(`/api/gallery?${params}`)
      items.value = data
    } catch (e: any) {
      error.value = e?.data?.message || 'Ошибка загрузки'
    } finally {
      loading.value = false
    }
  }

  async function create(payload: Partial<GalleryItem>) {
    const body = { ...payload, category: categoryValue.value || payload.category }
    const row = await $fetch<GalleryItem>('/api/gallery', { method: 'POST', body })
    items.value.push(row)
    return row
  }

  async function update(id: number, payload: Partial<GalleryItem>) {
    // Optimistic update
    const idx = items.value.findIndex((i: GalleryItem) => i.id === id)
    const prev = idx !== -1 ? { ...items.value[idx] } : null
    if (idx !== -1) items.value[idx] = { ...items.value[idx]!, ...payload } as GalleryItem

    try {
      const row = await $fetch<GalleryItem>(`/api/gallery/${id}`, { method: 'PUT', body: payload })
      if (idx !== -1) items.value[idx] = row
      return row
    } catch (e) {
      // Rollback
      if (idx !== -1 && prev) items.value[idx] = prev as GalleryItem
      throw e
    }
  }

  async function remove(id: number) {
    // Optimistic removal
    const prev = [...items.value]
    items.value = items.value.filter((i: GalleryItem) => i.id !== id)
    try {
      await $fetch(`/api/gallery/${id}`, { method: 'DELETE' })
    } catch (e) {
      items.value = prev
      throw e
    }
  }

  async function reorder(orderedItems: Array<{ id: number; sortOrder: number }>) {
    await $fetch('/api/gallery/reorder', { method: 'PATCH', body: { items: orderedItems } })
  }

  async function toggleFeatured(id: number) {
    const item = items.value.find((i: GalleryItem) => i.id === id)
    if (!item) return
    const row = await update(id, { featured: !item.featured } as any)
    return row
  }

  // ── Batch operations ────────────────────────────────────
  async function batchDelete() {
    const ids = Array.from(selectedIds.value)
    if (!ids.length) return
    // Optimistic
    const prev = [...items.value]
    items.value = items.value.filter((i: GalleryItem) => !selectedIds.value.has(i.id))
    try {
      await Promise.all(ids.map((id: number) => $fetch(`/api/gallery/${id}`, { method: 'DELETE' })))
      selectedIds.value = new Set()
    } catch (e) {
      items.value = prev
      throw e
    }
  }

  async function batchTag(tag: string) {
    const ids = Array.from(selectedIds.value)
    if (!ids.length) return
    await Promise.all(ids.map((id: number) => {
      const item = items.value.find((i: GalleryItem) => i.id === id)
      if (!item) return
      const tags = item.tags?.includes(tag) ? item.tags : [...(item.tags || []), tag]
      return update(id, { tags } as any)
    }))
  }

  async function batchToggleFeatured(featured: boolean) {
    const ids = Array.from(selectedIds.value)
    if (!ids.length) return
    await Promise.all(ids.map((id: number) => update(id, { featured } as any)))
  }

  return {
    // State
    items,
    loading,
    error,

    // Фильтрация
    search,
    activeTag,
    showFeaturedOnly,
    viewMode,
    allTags,
    filtered,

    // Сортировка
    sortField,
    sortDir,

    // Batch selection
    batchMode,
    selectedIds,
    selectedCount,
    toggleBatchMode,
    toggleSelect,
    selectAll,
    deselectAll,
    batchDelete,
    batchTag,
    batchToggleFeatured,

    // Lightbox
    lightboxIndex,
    lightboxOpen,
    lightboxItem,
    openLightbox,
    closeLightbox,
    lightboxNext,
    lightboxPrev,

    // CRUD
    load,
    create,
    update,
    remove,
    reorder,
    toggleFeatured,
  }
}
