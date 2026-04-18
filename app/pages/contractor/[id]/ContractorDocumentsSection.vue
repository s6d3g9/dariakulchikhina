<template>
  <div>
    <div class="u-grid-2" style="margin-bottom:12px">
      <div class="u-field">
        <label>Поиск</label>
        <GlassInput v-model="docsSearch" placeholder="Название, заметка" />
      </div>
      <div class="u-field">
        <label>Категория</label>
        <select v-model="docsFilter" class="glass-input cab-select">
          <option value="">Все категории</option>
          <option v-for="dc in DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option>
        </select>
      </div>
      <div class="u-field">
        <label>Сортировка</label>
        <select v-model="docsSort" class="glass-input cab-select">
          <option value="new">Сначала новые</option>
          <option value="old">Сначала старые</option>
        </select>
      </div>
    </div>

    <div class="u-form-section">
      <h3>Загрузить документ</h3>
      <div class="u-grid-2">
        <div class="u-field">
          <label>Название</label>
          <GlassInput v-model="newDocTitle" placeholder="Название документа" />
        </div>
        <div class="u-field">
          <label>Категория</label>
          <select v-model="newDocCategory" class="glass-input cab-select">
            <option v-for="dc in DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option>
          </select>
        </div>
        <div class="u-field u-field--full">
          <label>Примечание</label>
          <GlassInput v-model="newDocNotes" placeholder="Необязательно" />
        </div>
      </div>
      <div style="margin-top: 12px;">
        <label class="cab-upload-btn">
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" multiple style="display:none" @change="uploadDoc" />
          {{ docUploading ? 'Загрузка…' : '＋ Выбрать файл' }}
        </label>
      </div>
    </div>

    <div v-if="filteredContractorDocs.length" class="cab-docs-list">
      <div v-for="doc in filteredContractorDocs" :key="doc.id" class="cab-doc-card glass-surface">
        <div class="cab-doc-icon">
          {{ doc.category === 'passport' ? '🪪' : doc.category === 'license' ? '📜' : doc.category === 'certificate' ? '📄' : doc.category === 'contract' ? '📋' : doc.category === 'insurance' ? '🛡' : doc.category === 'diploma' ? '🎓' : '📎' }}
        </div>
        <div class="cab-doc-info">
          <div class="cab-doc-title">{{ doc.title }}</div>
          <div class="cab-doc-meta">
            <span class="cab-doc-cat">{{ DOC_CATEGORIES.find((c: any) => c.value === doc.category)?.label || doc.category }}</span>
            <span v-if="doc.notes" class="cab-doc-notes">{{ doc.notes }}</span>
            <span v-if="doc.expiresAt" class="cab-doc-expires">до {{ doc.expiresAt }}</span>
            <span v-if="doc.createdAt" class="cab-doc-notes">{{ formatDocDate(doc.createdAt) }}</span>
          </div>
        </div>
        <div class="cab-doc-actions">
          <a v-if="doc.url" :href="doc.url" target="_blank" class="cab-doc-link">Скачать</a>
          <button class="cab-doc-del" @click="deleteDoc(doc.id)">✕</button>
        </div>
      </div>
    </div>
    <div v-else-if="props.contractorDocs.length" class="cab-empty">
      <div class="cab-empty-icon">🔎</div>
      <p>По фильтру ничего не найдено.</p>
    </div>
    <div v-else class="cab-empty">
      <div class="cab-empty-icon">📂</div>
      <p>Документов пока нет.<br>Загрузите паспорт, лицензии, сертификаты и другие документы.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  contractorId: number | string
  contractorDocs: any[]
  refreshDocs: () => void
}>()

const docUploading = ref(false)
const newDocTitle = ref('')
const newDocCategory = ref('other')
const newDocNotes = ref('')
const docsSearch = ref('')
const docsFilter = ref('')
const docsSort = ref<'new' | 'old'>('new')

const DOC_CATEGORIES = [
  { value: 'passport',    label: 'Паспорт' },
  { value: 'inn_doc',     label: 'ИНН' },
  { value: 'snils',       label: 'СНИЛС' },
  { value: 'license',     label: 'Лицензия' },
  { value: 'certificate', label: 'Сертификат' },
  { value: 'contract',    label: 'Договор' },
  { value: 'insurance',   label: 'Страховка' },
  { value: 'diploma',     label: 'Диплом / удостоверение' },
  { value: 'sro',         label: 'СРО допуск' },
  { value: 'other',       label: 'Другой' },
]

const filteredContractorDocs = computed(() => {
  const rows = props.contractorDocs || []
  const q = docsSearch.value.trim().toLowerCase()
  return rows.filter((doc: any) => {
    const byCategory = !docsFilter.value || doc.category === docsFilter.value
    if (!byCategory) return false
    if (!q) return true
    const hay = `${doc.title || ''} ${doc.notes || ''} ${doc.category || ''}`.toLowerCase()
    return hay.includes(q)
  }).slice().sort((a: any, b: any) => {
    const at = new Date(a.createdAt || 0).getTime()
    const bt = new Date(b.createdAt || 0).getTime()
    return docsSort.value === 'new' ? bt - at : at - bt
  })
})

function formatDocDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('ru-RU')
}

async function uploadDoc(ev: Event) {
  const files = (ev.target as HTMLInputElement).files
  if (!files?.length) return
  docUploading.value = true
  try {
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', newDocTitle.value || file.name)
      fd.append('category', newDocCategory.value)
      if (newDocNotes.value) fd.append('notes', newDocNotes.value)
      await $fetch(`/api/contractors/${props.contractorId}/documents`, { method: 'POST', body: fd })
    }
    newDocTitle.value = ''
    newDocNotes.value = ''
    newDocCategory.value = 'other'
    props.refreshDocs()
  } finally {
    docUploading.value = false
    ;(ev.target as HTMLInputElement).value = ''
  }
}

async function deleteDoc(docId: number) {
  if (!confirm('Удалить документ?')) return
  await $fetch(`/api/contractors/${props.contractorId}/documents/${docId}`, { method: 'DELETE' })
  props.refreshDocs()
}
</script>
