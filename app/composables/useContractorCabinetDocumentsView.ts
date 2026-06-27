import { computed, ref, type Ref } from 'vue'

type ContractorDoc = {
  title?: string | null
  notes?: string | null
  category?: string | null
  createdAt?: string | null
}

type DocCategoryOption = {
  value: string
  label: string
}

type UseContractorCabinetDocumentsViewOptions = {
  contractorDocs: Ref<ContractorDoc[] | null | undefined>
  docCategories: DocCategoryOption[]
}

export function useContractorCabinetDocumentsView(options: UseContractorCabinetDocumentsViewOptions) {
  const docsSearch = ref('')
  const docsFilter = ref('')
  const docsSort = ref<'new' | 'old'>('new')

  const filteredContractorDocs = computed(() => {
    const rows = options.contractorDocs.value || []
    const query = docsSearch.value.trim().toLowerCase()

    return rows
      .filter((doc) => {
        const byCategory = !docsFilter.value || doc.category === docsFilter.value
        if (!byCategory) return false
        if (!query) return true
        const haystack = `${doc.title || ''} ${doc.notes || ''} ${doc.category || ''}`.toLowerCase()
        return haystack.includes(query)
      })
      .slice()
      .sort((left, right) => {
        const leftTime = new Date(left.createdAt || 0).getTime()
        const rightTime = new Date(right.createdAt || 0).getTime()
        return docsSort.value === 'new' ? rightTime - leftTime : leftTime - rightTime
      })
  })

  function formatDocDate(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('ru-RU')
  }

  function getDocCategoryLabel(category: string): string {
    return options.docCategories.find((item) => item.value === category)?.label ?? category
  }

  return {
    docsSearch,
    docsFilter,
    docsSort,
    filteredContractorDocs,
    formatDocDate,
    getDocCategoryLabel,
  }
}