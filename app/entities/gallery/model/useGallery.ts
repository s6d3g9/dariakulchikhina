/**
 * app/entities/gallery/model/useGallery.ts
 * Composable для управления состоянием галереи.
 *
 * Централизует: загрузку, фильтрацию, поиск, CRUD, переупорядочивание,
 * пакетные операции, сортировку, и lightbox.
 *
 * Вдохновлено: Unsplash (masonry + lightbox), Pinterest (infinite scroll),
 * Behance (multi-image carousels), Dribbble (filter UX).
 */
import type { GalleryItem, GalleryViewMode, GallerySortField, GallerySortDir } from '~~/shared/types/gallery/gallery'

export function useGallery(category?: Ref<string> | string) {
	const items = ref<GalleryItem[]>([])
	const loading = ref(false)
	const error = ref('')

	const search = ref('')
	const activeTag = ref<string | null>(null)
	const showFeaturedOnly = ref(false)
	const viewMode = ref<GalleryViewMode>('masonry')

	const sortField = ref<GallerySortField>('sort-order')
	const sortDir = ref<GallerySortDir>('asc')

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
		selectedIds.value = new Set(selectedIds.value)
	}

	function selectAll() {
		filtered.value.forEach((item: GalleryItem) => selectedIds.value.add(item.id))
		selectedIds.value = new Set(selectedIds.value)
	}

	function deselectAll() {
		selectedIds.value.clear()
		selectedIds.value = new Set(selectedIds.value)
	}

	const selectedCount = computed(() => selectedIds.value.size)

	const allTags = computed(() => {
		const tags = new Set<string>()
		items.value.forEach((item: GalleryItem) => item.tags?.forEach((tag: string) => tags.add(tag)))
		return Array.from(tags).sort()
	})

	const filtered = computed(() => {
		let result = items.value as GalleryItem[]

		if (showFeaturedOnly.value) {
			result = result.filter((item: GalleryItem) => item.featured)
		}

		if (activeTag.value) {
			result = result.filter((item: GalleryItem) => item.tags?.includes(activeTag.value!))
		}

		if (search.value) {
			const query = search.value.toLowerCase()
			result = result.filter((item: GalleryItem) =>
				item.title.toLowerCase().includes(query)
				|| item.description?.toLowerCase().includes(query)
				|| item.tags?.some((tag: string) => tag.toLowerCase().includes(query)),
			)
		}

		const direction = sortDir.value === 'asc' ? 1 : -1
		return [...result].sort((left: GalleryItem, right: GalleryItem) => {
			switch (sortField.value) {
				case 'name':
					return direction * left.title.localeCompare(right.title, 'ru')
				case 'date':
					return direction * (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
				case 'sort-order':
				default:
					return direction * (left.sortOrder - right.sortOrder)
			}
		})
	})

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

	const categoryValue = computed(() => typeof category === 'string' ? category : category?.value)

	async function load() {
		loading.value = true
		error.value = ''
		try {
			const params = new URLSearchParams()
			if (categoryValue.value) params.set('category', categoryValue.value)
			const data = await $fetch<GalleryItem[]>(`/api/gallery?${params}`)
			items.value = data
		} catch (errorValue: any) {
			error.value = errorValue?.data?.message || 'Ошибка загрузки'
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
		const index = items.value.findIndex((item: GalleryItem) => item.id === id)
		const previous = index !== -1 ? { ...items.value[index] } : null
		if (index !== -1) items.value[index] = { ...items.value[index]!, ...payload } as GalleryItem

		try {
			const row = await $fetch<GalleryItem>(`/api/gallery/${id}`, { method: 'PUT', body: payload })
			if (index !== -1) items.value[index] = row
			return row
		} catch (errorValue) {
			if (index !== -1 && previous) items.value[index] = previous as GalleryItem
			throw errorValue
		}
	}

	async function remove(id: number) {
		const previous = [...items.value]
		items.value = items.value.filter((item: GalleryItem) => item.id !== id)
		try {
			await $fetch(`/api/gallery/${id}`, { method: 'DELETE' })
		} catch (errorValue) {
			items.value = previous
			throw errorValue
		}
	}

	async function reorder(orderedItems: Array<{ id: number; sortOrder: number }>) {
		await $fetch('/api/gallery/reorder', { method: 'PATCH', body: { items: orderedItems } })
	}

	async function toggleFeatured(id: number) {
		const item = items.value.find((galleryItem: GalleryItem) => galleryItem.id === id)
		if (!item) return
		return update(id, { featured: !item.featured } as Partial<GalleryItem>)
	}

	async function batchDelete() {
		const ids = Array.from(selectedIds.value)
		if (!ids.length) return
		const previous = [...items.value]
		items.value = items.value.filter((item: GalleryItem) => !selectedIds.value.has(item.id))
		try {
			await Promise.all(ids.map((id: number) => $fetch(`/api/gallery/${id}`, { method: 'DELETE' })))
			selectedIds.value = new Set()
		} catch (errorValue) {
			items.value = previous
			throw errorValue
		}
	}

	async function batchTag(tag: string) {
		const ids = Array.from(selectedIds.value)
		if (!ids.length) return
		await Promise.all(ids.map((id: number) => {
			const item = items.value.find((galleryItem: GalleryItem) => galleryItem.id === id)
			if (!item) return
			const tags = item.tags?.includes(tag) ? item.tags : [...(item.tags || []), tag]
			return update(id, { tags } as Partial<GalleryItem>)
		}))
	}

	async function batchToggleFeatured(featured: boolean) {
		const ids = Array.from(selectedIds.value)
		if (!ids.length) return
		await Promise.all(ids.map((id: number) => update(id, { featured } as Partial<GalleryItem>)))
	}

	return {
		items,
		loading,
		error,
		search,
		activeTag,
		showFeaturedOnly,
		viewMode,
		allTags,
		filtered,
		sortField,
		sortDir,
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
		lightboxIndex,
		lightboxOpen,
		lightboxItem,
		openLightbox,
		closeLightbox,
		lightboxNext,
		lightboxPrev,
		load,
		create,
		update,
		remove,
		reorder,
		toggleFeatured,
	}
}
