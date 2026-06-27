import { computed, ref, type Ref } from 'vue'

type DesignerDocument = {
  id: number
  title?: string | null
  notes?: string | null
  category?: string | null
  createdAt?: string | null
  url?: string | null
}

export function useDesignerCabinetDocuments(designerId: Ref<number>) {
  const DESIGNER_DOC_CATEGORIES: { value: string; label: string }[] = [
    { value: 'contract', label: 'Договор' },
    { value: 'tz', label: 'ТЗ' },
    { value: 'invoice', label: 'Счёт' },
    { value: 'act', label: 'Акт' },
    { value: 'reference', label: 'Референс' },
    { value: 'other', label: 'Другое' },
  ]

  const { data: designerDocs, refresh: refreshDesignerDocs } = useFetch<DesignerDocument[]>(
    () => `/api/designers/${designerId.value}/documents`,
    { default: () => [], watch: [designerId] },
  )

  const designerDocUploading = ref(false)
  const newDesignerDocTitle = ref('')
  const newDesignerDocCategory = ref('other')
  const newDesignerDocNotes = ref('')
  const designerDocSearch = ref('')
  const designerDocFilter = ref('')
  const designerDocSort = ref<'new' | 'old'>('new')

  const filteredDesignerDocs = computed(() => {
    const rows = designerDocs.value || []
    const query = designerDocSearch.value.trim().toLowerCase()

    return rows.filter((doc) => {
      const byCategory = !designerDocFilter.value || doc.category === designerDocFilter.value
      if (!byCategory) return false
      if (!query) return true
      const haystack = `${doc.title || ''} ${doc.notes || ''} ${doc.category || ''}`.toLowerCase()
      return haystack.includes(query)
    }).slice().sort((left, right) => {
      const leftTime = new Date(left.createdAt || 0).getTime()
      const rightTime = new Date(right.createdAt || 0).getTime()
      return designerDocSort.value === 'new' ? rightTime - leftTime : leftTime - rightTime
    })
  })

  function formatDocDate(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('ru-RU')
  }

  async function uploadDesignerDoc(event: Event) {
    const input = event.target as HTMLInputElement
    const files = input.files
    if (!files?.length) return

    designerDocUploading.value = true
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', newDesignerDocTitle.value || file.name)
        formData.append('category', newDesignerDocCategory.value)
        formData.append('notes', newDesignerDocNotes.value)
        await $fetch(`/api/designers/${designerId.value}/documents`, { method: 'POST', body: formData })
      }
      await refreshDesignerDocs()
      newDesignerDocTitle.value = ''
      newDesignerDocNotes.value = ''
      input.value = ''
    } finally {
      designerDocUploading.value = false
    }
  }

  async function deleteDesignerDoc(docId: number) {
    if (!confirm('Удалить документ?')) return
    await $fetch(`/api/designers/${designerId.value}/documents/${docId}`, { method: 'DELETE' })
    await refreshDesignerDocs()
  }

  function getDesignerDocCategoryLabel(category: string) {
    return DESIGNER_DOC_CATEGORIES.find((item) => item.value === category)?.label ?? category
  }

  return {
    DESIGNER_DOC_CATEGORIES,
    designerDocs,
    designerDocUploading,
    newDesignerDocTitle,
    newDesignerDocCategory,
    newDesignerDocNotes,
    designerDocSearch,
    designerDocFilter,
    designerDocSort,
    filteredDesignerDocs,
    formatDocDate,
    uploadDesignerDoc,
    deleteDesignerDoc,
    getDesignerDocCategoryLabel,
  }
}