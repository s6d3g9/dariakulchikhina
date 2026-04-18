<template>
  <div
    ref="viewportRef"
    class="docs-screen"
    :class="{ 'cv-viewport--paged': isPaged }"
    :tabindex="isPaged ? 0 : undefined"
    @wheel="handleWheel"
    @keydown="handleKeydown"
    @scroll="syncPager"
  >
    <div class="cv-wipe-inner">
    <AdminEntityHero
      kicker="реестр документов / admin"
      title="Документы"
      :facts="heroFacts"
      :prompt="docsHeroPrompt"
      :full-height="true"
      frame="divided"
      max-width="1120px"
    >
      <template #actions>
        <button class="admin-entity-hero__action" type="button" @click="openGenerate">из шаблона</button>
        <button class="admin-entity-hero__action" type="button" @click="openUpload">загрузить документ</button>
      </template>

      <template #notices>
        <span class="admin-entity-hero__notice docs-hero-notice">{{ currentCategoryLabel }}</span>
        <span
          class="admin-entity-hero__notice docs-hero-notice"
          :class="legalStatus?.ready ? 'admin-entity-hero__notice--success' : 'docs-hero-notice--muted'"
        >
          {{ legalStatusLabel }}
        </span>
      </template>
    </AdminEntityHero>

    <Transition name="tab-fade" mode="out-in">
      <section v-if="viewMode === 'editor'" key="editor" class="docs-editor-stage">
        <div class="docs-stage-head">
          <CabSectionHeader
            title="Генератор документов"
            eyebrow="documents"
            note="Шаблон открывается в рабочей зоне и остаётся частью общего реестра документов."
          >
            <template #actions>
              <button class="docs-inline-action" type="button" @click="viewMode = 'list'">назад к реестру</button>
            </template>
          </CabSectionHeader>
        </div>

        <AdminDocumentEditor
          :templates="DOC_TEMPLATES"
          :projects="allProjects"
          :existingDoc="existingDocToEdit"
          @close="viewMode = 'list'"
          @saved="onEditorSaved"
        />
      </section>

      <section v-else key="registry" class="docs-registry">
        <div class="docs-registry-head">
          <div class="docs-registry-copy">
            <CabSectionHeader
              :title="currentCategoryLabel"
              eyebrow="реестр"
              :note="registryNote"
            />
          </div>

          <div class="docs-registry-controls">
            <label class="u-field docs-search-field">
              <span class="u-field__label">Поиск по реестру</span>
              <GlassInput v-model="search" class=" docs-search-input" placeholder="название, проект, заметка" />
            </label>

            <div class="docs-registry-stats">
              <div class="docs-stat">
                <span class="docs-stat__label">найдено</span>
                <span class="docs-stat__value">{{ filteredDocs.length }}</span>
              </div>
              <div class="docs-stat">
                <span class="docs-stat__label">проектов</span>
                <span class="docs-stat__value">{{ linkedProjectsCount }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="docs-grid">
          <div class="docs-column docs-column--list">
            <AdminEntityHeader :title="listHeaderTitle">
              <template #actions>
                <button v-if="search" class="docs-inline-action" type="button" @click="search = ''">сбросить поиск</button>
              </template>
            </AdminEntityHeader>

            <div v-if="!hasMounted || pending" class="docs-loading">[ LOADING... ]</div>

            <div v-else-if="!filteredDocs.length" class="docs-empty">
              <span class="docs-empty__title">[ NO DATA ATTACHED ]</span>
              <span class="docs-empty__text">
                {{ search ? 'По этому запросу ничего не найдено.' : 'В текущей выборке ещё нет документов.' }}
              </span>
              <button v-if="!search" class="docs-inline-action" type="button" @click="openUpload">добавить документ</button>
            </div>

            <transition-group v-else name="doc-list" tag="div" class="docs-list">
              <article
                v-for="doc in filteredDocs"
                :key="doc.id"
                class="doc-card"
                :class="{ 'doc-card--active': activeDoc?.id === doc.id }"
                @click="openDoc(doc)"
              >
                <div class="doc-card-head">
                  <span class="doc-code">{{ categoryCode(doc.category) }}</span>
                  <span class="doc-badge" :class="`doc-badge--${doc.category}`">{{ categoryName(doc.category) }}</span>
                  <span class="doc-kind">{{ fileKind(doc) }}</span>
                  <span class="doc-date">{{ formatDate(doc.createdAt) }}</span>
                </div>

                <h3 class="doc-title">{{ doc.title }}</h3>

                <p v-if="doc.projectTitle" class="doc-project">{{ doc.projectTitle }}</p>
                <p v-if="doc.notes" class="doc-notes">{{ doc.notes }}</p>

                <div class="doc-actions" @click.stop>
                  <a v-if="doc.url" :href="doc.url" class="doc-action" @click.stop>открыть</a>
                  <button v-if="doc.content" class="doc-action" type="button" @click="openInEditor(doc)">редактор</button>
                  <button class="doc-action doc-action--danger" type="button" @click="deleteDoc(doc.id)">удалить</button>
                </div>
              </article>
            </transition-group>
          </div>

          <div class="docs-column docs-column--panel">
            <AdminEntityHeader :title="panelTitle">
              <template #actions>
                <button v-if="panelMode === 'form'" class="docs-inline-action" type="button" @click="cancelUpload">отмена</button>
                <button v-else-if="activeDoc" class="docs-inline-action" type="button" @click="activeDoc = null">закрыть</button>
              </template>
            </AdminEntityHeader>

            <div v-if="panelMode === 'form'" class="docs-panel docs-panel--form">
              <div class="docs-panel-head">
                <div>
                  <p class="docs-panel-kicker">{{ editingDoc ? 'редактирование записи' : 'новая запись' }}</p>
                  <h3 class="docs-panel-title">{{ editingDoc ? editingDoc.title : 'Добавить документ в реестр' }}</h3>
                </div>
              </div>

              <div class="docs-field-grid">
                <label class="u-field">
                  <span class="u-field__label">Название *</span>
                  <GlassInput v-model="uploadForm.title" class=" docs-input" placeholder="Договор подряда №12" />
                </label>

                <label class="u-field">
                  <span class="u-field__label">Категория</span>
                  <select v-model="uploadForm.category" class="glass-input docs-input">
                    <option v-for="c in CATEGORIES.filter((cat: any) => cat.key !== 'all')" :key="c.key" :value="c.key">
                      {{ c.num }} {{ c.label }}
                    </option>
                  </select>
                </label>

                <label class="u-field">
                  <span class="u-field__label">Проект</span>
                  <select v-model="uploadForm.projectSlug" class="glass-input docs-input">
                    <option value="">без проекта</option>
                    <option v-for="p in allProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
                  </select>
                </label>

                <label v-if="!editingDoc" class="u-field">
                  <span class="u-field__label">Файл</span>
                  <GlassInput :key="uploadInputKey" type="file" class=" docs-input docs-file-input" @change="onFileSelect" />
                </label>

                <label class="u-field" :class="{ 'docs-field--full': editingDoc }">
                  <span class="u-field__label">URL файла</span>
                  <GlassInput v-model="uploadForm.url" class=" docs-input" placeholder="https://..." />
                </label>

                <label class="u-field docs-field--full">
                  <span class="u-field__label">Заметки</span>
                  <textarea
                    v-model="uploadForm.notes"
                    rows="4"
                    class="glass-input docs-input docs-textarea"
                    placeholder="контекст, версия, назначение документа"
                  ></textarea>
                </label>
              </div>

              <p v-if="uploadError" class="docs-error">{{ uploadError }}</p>

              <div class="docs-panel-foot">
                <button class="docs-inline-action" type="button" @click="cancelUpload">отмена</button>
                <button class="docs-primary-action" type="button" :disabled="uploading || !uploadForm.title" @click="submitUpload">
                  {{ uploading ? 'обработка...' : (editingDoc ? 'обновить запись' : 'добавить в реестр') }}
                </button>
              </div>
            </div>

            <div v-else-if="activeDoc" class="docs-panel docs-panel--detail">
              <div class="docs-panel-head docs-panel-head--detail">
                <div>
                  <p class="docs-panel-kicker">{{ categoryCode(activeDoc.category) }} / {{ categoryName(activeDoc.category) }}</p>
                  <h3 class="docs-panel-title">{{ activeDoc.title }}</h3>
                </div>

                <div class="docs-panel-actions">
                  <a v-if="activeDoc.url" :href="activeDoc.url" class="docs-inline-action">открыть файл</a>
                  <button v-if="activeDoc.content" class="docs-inline-action" type="button" @click="openInEditor(activeDoc)">в редактор</button>
                  <button class="docs-inline-action" type="button" @click="editDoc">реквизиты</button>
                  <button class="docs-inline-action docs-inline-action--danger" type="button" @click="deleteDoc(activeDoc.id)">удалить</button>
                </div>
              </div>

              <div class="docs-meta-grid">
                <div class="docs-meta-card">
                  <span class="docs-meta-label">дата</span>
                  <span class="docs-meta-value">{{ formatDate(activeDoc.createdAt) || '—' }}</span>
                </div>
                <div class="docs-meta-card">
                  <span class="docs-meta-label">тип файла</span>
                  <span class="docs-meta-value">{{ fileKind(activeDoc) }}</span>
                </div>
                <div class="docs-meta-card">
                  <span class="docs-meta-label">проект</span>
                  <NuxtLink
                    v-if="activeDoc.projectTitle && activeDoc.projectSlug"
                    :to="`/admin/projects/${activeDoc.projectSlug}`"
                    class="docs-meta-link"
                  >
                    {{ activeDoc.projectTitle }}
                  </NuxtLink>
                  <span v-else class="docs-meta-value">не привязан</span>
                </div>
                <div class="docs-meta-card">
                  <span class="docs-meta-label">файл</span>
                  <span class="docs-meta-value docs-meta-value--mono">{{ activeDoc.filename || '—' }}</span>
                </div>
              </div>

              <div v-if="activeDoc.notes" class="docs-note-block">
                <span class="docs-meta-label">заметки</span>
                <p class="docs-note-text">{{ activeDoc.notes }}</p>
              </div>

              <div v-if="activeDoc.content" class="docs-preview docs-preview--content">
                <pre class="docs-view-pre">{{ activeDoc.content }}</pre>
              </div>
              <div v-else-if="previewText" class="docs-preview">
                <pre class="docs-view-pre">{{ previewText }}</pre>
              </div>
              <div v-else-if="activeDoc.url && isImage(activeDoc.url)" class="docs-preview">
                <img :src="activeDoc.url" class="docs-view-img" alt="Предпросмотр документа" />
              </div>
              <div v-else-if="activeDoc.url && isPdf(activeDoc.url)" class="docs-preview docs-preview--pdf">
                <iframe :src="activeDoc.url" class="docs-view-pdf" title="Предпросмотр PDF"></iframe>
              </div>
              <div v-else class="docs-preview docs-preview--empty">[ FILE ATTACHED ]</div>
            </div>

            <div v-else class="docs-panel docs-panel--summary">
              <p class="docs-panel-kicker">рабочая панель</p>
              <h3 class="docs-panel-title">Контекст текущей выборки</h3>
              <p class="docs-summary-text">
                Выберите документ слева, чтобы открыть реквизиты и превью, либо добавьте новую запись напрямую в реестр.
              </p>

              <div class="docs-meta-grid docs-meta-grid--summary">
                <div class="docs-meta-card">
                  <span class="docs-meta-label">категория</span>
                  <span class="docs-meta-value">{{ currentCategoryLabel }}</span>
                </div>
                <div class="docs-meta-card">
                  <span class="docs-meta-label">всего записей</span>
                  <span class="docs-meta-value">{{ documentsCount }}</span>
                </div>
                <div class="docs-meta-card">
                  <span class="docs-meta-label">в выборке</span>
                  <span class="docs-meta-value">{{ filteredDocs.length }}</span>
                </div>
                <div class="docs-meta-card">
                  <span class="docs-meta-label">правовая база</span>
                  <span class="docs-meta-value">{{ legalStatusLabel }}</span>
                </div>
              </div>

              <div class="docs-panel-foot docs-panel-foot--summary">
                <button class="docs-inline-action" type="button" @click="openUpload">добавить документ</button>
                <button class="docs-inline-action" type="button" @click="openGenerate">открыть шаблон</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Transition>
    </div><!-- /cv-wipe-inner -->

    <div v-if="isPaged" class="cv-pager-rail">
      <div class="cv-pager-rail__meta">
        <span class="cv-pager-rail__mode">{{ pagerModeLabel }}</span>
        <span>экран {{ pageIndex }} / {{ pageCount }}</span>
      </div>
      <div class="cv-pager-rail__actions">
        <GlassButton variant="secondary" density="compact" type="button"  @click="move('prev')">← экран</GlassButton>
        <GlassButton variant="secondary" density="compact" type="button"  @click="move('next')">{{ contentViewMode === 'flow' ? 'экран / кат.' : pagerNextLabel }}</GlassButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DOC_TEMPLATES } from './model/doc-templates'

// ── Props — driven by global nav ──
const props = defineProps<{ category: string }>()
const designSystem = useDesignSystem()
const adminNav = useAdminNav()

// ══════════════════════════════════════════════════════════════════
// CATEGORIES — numbered, professional
// ══════════════════════════════════════════════════════════════════
const CATEGORIES: { key: string; num: string; label: string; icon: string }[] = [
  { key: 'all',             num: '',   label: 'все документы',                   icon: '📂' },
  { key: 'contract',        num: '01', label: 'договоры на дизайн-проект',       icon: '📝' },
  { key: 'contract_supply', num: '02', label: 'договоры поставки',               icon: '📦' },
  { key: 'contract_work',   num: '03', label: 'договоры подряда (строительство)',icon: '🏗' },
  { key: 'act',             num: '04', label: 'акты выполненных работ',          icon: '✅' },
  { key: 'act_defect',      num: '05', label: 'акты о дефектах / рекламации',   icon: '⚠️' },
  { key: 'invoice',         num: '06', label: 'счета на оплату',                icon: '🧾' },
  { key: 'estimate',        num: '07', label: 'сметы и калькуляции',            icon: '📊' },
  { key: 'specification',   num: '08', label: 'спецификации и ведомости',       icon: '📋' },
  { key: 'tz',              num: '09', label: 'техническое задание',            icon: '📐' },
  { key: 'approval',        num: '10', label: 'согласования и визы',            icon: '✍️' },
  { key: 'warranty',        num: '11', label: 'гарантийные документы',          icon: '🛡' },
  { key: 'photo_report',    num: '12', label: 'фотоотчёты объекта',            icon: '📸' },
  { key: 'correspondence',  num: '13', label: 'переписка и протоколы',         icon: '✉️' },
  { key: 'template',        num: '14', label: 'шаблоны документов',             icon: '📋' },
  { key: 'other',           num: '15', label: 'прочее',                         icon: '📎' },
]

function catLabel(key: string) {
  const cat = CATEGORIES.find(c => c.key === key)
  return cat ? (cat.num ? `${cat.num} ${cat.label}` : cat.label) : key
}

// ══════════════════════════════════════════════════════════════════
// DOCUMENT TEMPLATES — imported from ./model/doc-templates.ts
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════════════════
const { data: allDocs, pending, refresh } = useFetch<any[]>('/api/documents', {
  default: () => [],
  lazy: true,
  server: false,
})
const { data: projectsData } = useFetch<any[]>('/api/projects', { server: false, default: () => [] })
const { data: legalStatus } = useFetch<{ ready: boolean; totalChunks: number; sources: any[] }>('/api/ai/legal-status', { server: false })

const allProjects = computed(() => (projectsData.value || []).map((p: any) => ({
  slug: p.slug, title: p.title,
  clientName: p.profile?.client_name || '',
  address: p.profile?.objectAddress || '',
})))

// ══════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════
const viewMode = useState<'list' | 'editor'>('docs-viewMode', () => 'list')
const activeCategory = ref(props.category || 'all')
const search = ref('')
const activeDoc = ref<any>(null)
const editingDoc = ref<any>(null)
const previewText = ref('')
const existingDocToEdit = ref<{ id: number; content: string; templateKey?: string | null; projectSlug?: string | null } | null>(null)
const uploadInputKey = ref(0)
const hasMounted = ref(false)
const isCreatingUpload = ref(false)

const documentsCount = computed(() => allDocs.value?.length || 0)
const linkedProjectsCount = computed(() => new Set(
  (allDocs.value || []).map((doc: any) => doc.projectSlug).filter(Boolean),
).size)

const currentCategoryLabel = computed(() => catLabel(activeCategory.value))
const legalStatusLabel = computed(() => {
  if (legalStatus.value?.ready) return `в базе ${legalStatus.value.totalChunks} норм`
  return 'база не загружена'
})
const listHeaderTitle = computed(() => activeCategory.value === 'all' ? 'Все документы' : currentCategoryLabel.value)
const panelMode = computed<'summary' | 'form' | 'detail'>(() => {
  if (editingDoc.value || isCreatingUpload.value) return 'form'
  if (activeDoc.value) return 'detail'
  return 'summary'
})
const panelTitle = computed(() => {
  if (panelMode.value === 'form') return editingDoc.value ? 'Редактирование документа' : 'Новый документ'
  if (panelMode.value === 'detail') return 'Карточка документа'
  return 'Панель документа'
})
const registryNote = computed(() => {
  const query = search.value.trim()
  if (query) return `Поиск активен: ${filteredDocs.value.length} результатов по запросу «${query}».`
  if (activeCategory.value === 'all') return 'Единый реестр договоров, актов, счетов и шаблонов по всем проектам.'
  return `Срез по категории ${currentCategoryLabel.value}. Записи отсортированы от новых к старым.`
})
const docsSectionOrder = computed(() => CATEGORIES.map((item) => item.key))
const docsHeroPrompt = computed(() => isPaged.value ? '↓ экран / PgDn ↓' : 'прокрутите вниз к реестру')
const heroFacts = computed(() => ([
  { label: 'всего записей', value: String(documentsCount.value) },
  { label: 'в выборке', value: String(filteredDocs.value.length) },
  { label: 'проектов', value: String(linkedProjectsCount.value) },
]))

const {
  viewportRef,
  contentViewMode,
  isPaged,
  pagerModeLabel,
  pagerNextLabel,
  pageIndex,
  pageCount,
  syncPager,
  move,
  handleWheel,
  handleKeydown,
} = useContentViewport({
  mode: computed(() => designSystem.tokens.value.contentViewMode),
  enabled: computed(() => viewMode.value === 'list'),
  currentSection: activeCategory,
  sectionOrder: docsSectionOrder,
  onNavigate: async (nextCategory) => {
    activeCategory.value = nextCategory
    adminNav.select({ id: `doc_${nextCategory}`, name: nextCategory, type: 'leaf' })
  },
  transitionMs: computed(() => designSystem.tokens.value.pageTransitDuration ?? 280),
})

// Sync from parent prop (nav drives category)
watch(() => props.category, (cat) => {
  if (cat && cat !== activeCategory.value) {
    activeCategory.value = cat
    viewMode.value = 'list'
    activeDoc.value = null
    editingDoc.value = null
    isCreatingUpload.value = false
    previewText.value = ''
    resetUploadForm()
  }
})

// Обновляем список документов при возврате из редактора
watch(viewMode, (v, prev) => {
  if (v === 'list' && prev === 'editor') {
    existingDocToEdit.value = null
    refresh()
  }
})

// При уходе со страницы сбрасываем, чтобы при возврате не открывался редактор
onBeforeRouteLeave(() => {
  viewMode.value = 'list'
  editingDoc.value = null
  isCreatingUpload.value = false
  activeDoc.value = null
})

onMounted(() => {
  hasMounted.value = true
})

const countByCategory = computed(() => {
  const r: Record<string, number> = {}
  for (const doc of allDocs.value || []) {
    r[doc.category] = (r[doc.category] || 0) + 1
    r['all'] = (r['all'] || 0) + 1
  }
  return r
})

const filteredDocs = computed(() => {
  let list = allDocs.value || []
  if (activeCategory.value !== 'all') list = list.filter(d => d.category === activeCategory.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(d =>
      d.title.toLowerCase().includes(q) ||
      (d.notes || '').toLowerCase().includes(q) ||
      (d.projectTitle || '').toLowerCase().includes(q),
    )
  }
  return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

function fileIcon(url?: string): string {
  if (!url) return '📄'
  if (/\.pdf$/i.test(url)) return '📕'
  if (/\.(doc|docx)$/i.test(url)) return '📘'
  if (/\.(xls|xlsx)$/i.test(url)) return '📊'
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) return '🖼'
  if (/\.(txt|md|csv)$/i.test(url)) return '📝'
  if (/\.(zip|rar|7z|tar)$/i.test(url)) return '📦'
  return '📄'
}

function formatDate(val: string) {
  if (!val) return ''
  return new Date(val).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isImage(url: string) { return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) }
function isPdf(url: string) { return /\.pdf$/i.test(url) }
function isTextFile(url: string) { return /\.(txt|md|csv)$/i.test(url) }
function categoryCode(key: string) { return CATEGORIES.find(c => c.key === key)?.num || '00' }
function categoryName(key: string) { return CATEGORIES.find(c => c.key === key)?.label || key }
function fileKind(doc: any) {
  if (doc?.content && !doc?.url) return 'AI'
  const source = String(doc?.filename || doc?.url || '').split('?')[0]
  const ext = source.includes('.') ? source.split('.').pop()?.toUpperCase() : ''
  return ext || 'FILE'
}

function resetUploadForm() {
  uploadForm.title = ''
  uploadForm.category = activeCategory.value === 'all' ? 'contract' : activeCategory.value
  uploadForm.projectSlug = ''
  uploadForm.url = ''
  uploadForm.notes = ''
  uploadFile.value = null
  uploadError.value = ''
  uploadInputKey.value += 1
}

function selectCategory(key: string) {
  viewMode.value = 'list'
  activeCategory.value = key
  activeDoc.value = null
  previewText.value = ''
}

async function openDoc(doc: any) {
  viewMode.value = 'list'
  editingDoc.value = null
  isCreatingUpload.value = false
  activeDoc.value = doc
  previewText.value = ''
  if (!doc.content && doc.url && isTextFile(doc.url)) {
    try {
      const text = await $fetch<string>(doc.url, { responseType: 'text' } as any)
      previewText.value = typeof text === 'string' ? text : ''
    } catch { /* no preview */ }
  }
}

function openInEditor(doc: any) {
  existingDocToEdit.value = {
    id: doc.id,
    content: doc.content || '',
    templateKey: doc.templateKey || null,
    projectSlug: doc.projectSlug || null,
  }
  editingDoc.value = null
  isCreatingUpload.value = false
  activeDoc.value = null
  previewText.value = ''
  viewMode.value = 'editor'
}

function editDoc() {
  if (!activeDoc.value) return
  isCreatingUpload.value = true
  editingDoc.value = activeDoc.value
  uploadForm.title = activeDoc.value.title
  uploadForm.category = activeDoc.value.category
  uploadForm.projectSlug = activeDoc.value.projectSlug || ''
  uploadForm.url = activeDoc.value.url || ''
  uploadForm.notes = activeDoc.value.notes || ''
  uploadFile.value = null
  uploadError.value = ''
  uploadInputKey.value += 1
  activeDoc.value = null
  previewText.value = ''
}

// ══════════════════════════════════════════════════════════════════
// UPLOAD / EDIT
// ══════════════════════════════════════════════════════════════════
const uploading = ref(false)
const uploadError = ref('')
const uploadFile = ref<File | null>(null)
const uploadForm = reactive({
  title: '',
  category: 'contract',
  projectSlug: '',
  url: '',
  notes: '',
})

function openUpload() {
  viewMode.value = 'list'
  isCreatingUpload.value = true
  editingDoc.value = null
  activeDoc.value = null
  previewText.value = ''
  resetUploadForm()
}

function cancelUpload() {
  isCreatingUpload.value = false
  editingDoc.value = null
  resetUploadForm()
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  uploadFile.value = input.files?.[0] || null
}

async function submitUpload() {
  if (!uploadForm.title.trim()) return
  uploading.value = true
  uploadError.value = ''
  try {
    let fileUrl = uploadForm.url
    let filename: string | undefined
    let savedDoc: any = null

    if (uploadFile.value) {
      const fd = new FormData()
      fd.append('file', uploadFile.value)
      const { url, filename: fn } = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
      fileUrl = url
      filename = fn
    }

    if (editingDoc.value) {
      savedDoc = await $fetch(`/api/documents/${editingDoc.value.id}`, {
        method: 'PUT',
        body: {
          title: uploadForm.title,
          category: uploadForm.category,
          projectSlug: uploadForm.projectSlug || undefined,
          url: fileUrl || undefined,
          filename: filename || editingDoc.value.filename,
          notes: uploadForm.notes || undefined,
        },
      })
    } else {
      savedDoc = await $fetch('/api/documents', {
        method: 'POST',
        body: {
          title: uploadForm.title,
          category: uploadForm.category,
          projectSlug: uploadForm.projectSlug || undefined,
          url: fileUrl || undefined,
          filename,
          notes: uploadForm.notes || undefined,
        },
      })
    }

    await refresh()
    isCreatingUpload.value = false
    editingDoc.value = null
    resetUploadForm()
    activeDoc.value = (allDocs.value || []).find((doc: any) => doc.id === savedDoc?.id) || null
  } catch (e: any) {
    uploadError.value = e?.data?.statusMessage || 'Ошибка загрузки'
  } finally {
    uploading.value = false
  }
}

async function deleteDoc(id: number) {
  if (!confirm('Удалить документ?')) return
  await $fetch(`/api/documents/${id}`, { method: 'DELETE' }).catch(() => {})
  if (activeDoc.value?.id === id) activeDoc.value = null
  if (editingDoc.value?.id === id) {
    isCreatingUpload.value = false
    editingDoc.value = null
    resetUploadForm()
  }
  await refresh()
}

// ══════════════════════════════════════════════════════════════════
// GENERATE FROM TEMPLATE (inline editor)
// ══════════════════════════════════════════════════════════════════
function openGenerate() {
  viewMode.value = 'editor'
  activeDoc.value = null
  editingDoc.value = null
  isCreatingUpload.value = false
  previewText.value = ''
}

function onEditorSaved() {
  refresh()
}
</script>

<style scoped src="./AdminDocumentsSection.scoped.css"></style>
