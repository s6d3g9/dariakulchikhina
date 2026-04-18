<template>
  <div class="cab-section" data-section="documents">
    <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalist }">
      <h2>Документы</h2>
    </div>

    <div class="u-modal__row2" style="margin-bottom:12px">
      <div class="u-field">
        <label class="u-field__label">Поиск</label>
        <GlassInput v-model="search" placeholder="Название, заметка" />
      </div>
      <div class="u-field">
        <label class="u-field__label">Фильтр категории</label>
        <select v-model="filterCategory" class="glass-input">
          <option value="">Все категории</option>
          <option v-for="dc in DESIGNER_DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option>
        </select>
      </div>
      <div class="u-field">
        <label class="u-field__label">Сортировка</label>
        <select v-model="sort" class="glass-input">
          <option value="new">Сначала новые</option>
          <option value="old">Сначала старые</option>
        </select>
      </div>
    </div>

    <div class="u-form-section" :class="{ 'u-form-section--brutalist': isBrutalist }">
      <h3>Загрузить документ</h3>
      <div class="u-modal__row2">
        <div class="u-field">
          <label class="u-field__label">Название</label>
          <GlassInput v-model="draftTitle" placeholder="Название документа" />
        </div>
        <div class="u-field">
          <label class="u-field__label">Категория</label>
          <select v-model="draftCategory" class="glass-input">
            <option v-for="dc in DESIGNER_DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option>
          </select>
        </div>
        <div class="u-field u-field--full">
          <label class="u-field__label">Примечание</label>
          <GlassInput v-model="draftNotes" placeholder="Необязательно" />
        </div>
      </div>
      <div style="margin-top: 12px;">
        <label class="cab-upload-btn">
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" multiple style="display:none" @change="onUpload" />
          {{ uploading ? 'Загрузка…' : '＋ Выбрать файл' }}
        </label>
      </div>
    </div>

    <div v-if="filteredDocs.length" class="cab-docs-list" :class="{ 'cab-docs-list--brutalist': isBrutalist }">
      <div
        v-for="doc in filteredDocs"
        :key="doc.id"
        class="cab-doc-card glass-surface"
        :class="{ 'cab-doc-card--brutalist': isBrutalist }"
      >
        <div class="cab-doc-icon">📎</div>
        <div class="cab-doc-info">
          <div class="cab-doc-title">{{ doc.title }}</div>
          <div class="cab-doc-meta">
            <span class="cab-doc-cat">{{ getDesignerDocCategoryLabel(doc.category) }}</span>
            <span v-if="doc.notes" class="cab-doc-notes">{{ doc.notes }}</span>
            <span v-if="doc.createdAt" class="cab-doc-notes">{{ formatDocDate(doc.createdAt) }}</span>
          </div>
        </div>
        <div class="cab-doc-actions">
          <a v-if="doc.url" :href="doc.url" target="_blank" class="cab-doc-link">Скачать</a>
          <button class="cab-doc-del" @click="onDelete(doc.id)">✕</button>
        </div>
      </div>
    </div>
    <div v-else-if="documents?.length" class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalist }">
      <span>🔎</span>
      <p>По фильтру ничего не найдено.</p>
    </div>
    <div v-else class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalist }">
      <span>📂</span>
      <p>Документов пока нет.<br>Загрузите договоры, ТЗ, референсы и акты.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  DESIGNER_DOC_CATEGORIES,
  getDesignerDocCategoryLabel,
} from '../model/designer-doc-categories'

interface DesignerDoc {
  id: number
  title: string
  category: string
  notes?: string | null
  url?: string | null
  createdAt?: string | null
}

const props = defineProps<{
  designerId: number
  documents: DesignerDoc[] | null | undefined
  isBrutalist: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const search = ref('')
const filterCategory = ref('')
const sort = ref<'new' | 'old'>('new')
const draftTitle = ref('')
const draftCategory = ref('other')
const draftNotes = ref('')
const uploading = ref(false)

const filteredDocs = computed(() => {
  const rows = props.documents || []
  const q = search.value.trim().toLowerCase()
  return rows.filter((doc) => {
    const byCategory = !filterCategory.value || doc.category === filterCategory.value
    if (!byCategory) return false
    if (!q) return true
    const hay = `${doc.title || ''} ${doc.notes || ''} ${doc.category || ''}`.toLowerCase()
    return hay.includes(q)
  }).slice().sort((a, b) => {
    const at = new Date(a.createdAt || 0).getTime()
    const bt = new Date(b.createdAt || 0).getTime()
    return sort.value === 'new' ? bt - at : at - bt
  })
})

function formatDocDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('ru-RU')
}

async function onUpload(ev: Event) {
  const input = ev.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return

  uploading.value = true
  try {
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', draftTitle.value || file.name)
      fd.append('category', draftCategory.value)
      fd.append('notes', draftNotes.value)
      await $fetch(`/api/designers/${props.designerId}/documents`, { method: 'POST', body: fd })
    }
    emit('refresh')
    draftTitle.value = ''
    draftNotes.value = ''
    input.value = ''
  } finally {
    uploading.value = false
  }
}

async function onDelete(docId: number) {
  if (!confirm('Удалить документ?')) return
  await $fetch(`/api/designers/${props.designerId}/documents/${docId}`, { method: 'DELETE' })
  emit('refresh')
}
</script>
