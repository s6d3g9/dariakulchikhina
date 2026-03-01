<template>
  <div class="docs-root">

    <!-- Header bar -->
    <div class="docs-topbar glass-card">
      <div class="docs-topbar-left">
        <span class="docs-topbar-title">документы</span>
        <span class="docs-count">{{ filteredDocs.length }}</span>
      </div>
      <div class="docs-topbar-right">
        <input v-model="search" class="docs-search" placeholder="поиск..." />
        <button class="docs-btn docs-btn--primary" @click="openUpload">+ загрузить</button>
        <button class="docs-btn" @click="openGenerate">✦ создать из шаблона</button>
      </div>
    </div>

    <div class="docs-layout">

      <!-- Left: category nav -->
      <nav class="docs-nav glass-card">
        <button
          v-for="cat in CATEGORIES" :key="cat.key"
          class="docs-nav-item"
          :class="{ 'docs-nav-item--active': activeCategory === cat.key }"
          @click="activeCategory = cat.key"
        >
          <span class="docs-nav-icon">{{ cat.icon }}</span>
          <span class="docs-nav-label">{{ cat.label }}</span>
          <span v-if="countByCategory[cat.key]" class="docs-nav-count">{{ countByCategory[cat.key] }}</span>
        </button>
      </nav>

      <!-- Right: document list -->
      <div class="docs-main">
        <div v-if="pending" class="docs-empty">Загрузка...</div>
        <div v-else-if="!filteredDocs.length" class="docs-empty">
          {{ search ? 'Ничего не найдено' : 'Нет документов в этой категории' }}
        </div>
        <transition-group name="doc-list" tag="div" class="docs-list">
          <div v-for="doc in filteredDocs" :key="doc.id" class="doc-card glass-card">
            <div class="doc-card-head">
              <span class="doc-badge" :class="`doc-badge--${doc.category}`">
                {{ catLabel(doc.category) }}
              </span>
              <span v-if="doc.projectTitle" class="doc-project">
                <NuxtLink :to="`/admin/projects/${doc.projectSlug}`" class="doc-project-link">
                  {{ doc.projectTitle }}
                </NuxtLink>
              </span>
              <span class="doc-date">{{ formatDate(doc.createdAt) }}</span>
              <div class="doc-actions">
                <a v-if="doc.url" :href="doc.url" target="_blank" class="doc-btn-ico" title="открыть">↗</a>
                <button class="doc-btn-ico doc-btn-ico--del" title="удалить" @click="deleteDoc(doc.id)">×</button>
              </div>
            </div>
            <div class="doc-title">{{ doc.title }}</div>
            <div v-if="doc.notes" class="doc-notes">{{ doc.notes }}</div>
          </div>
        </transition-group>
      </div>
    </div>

    <!-- ── Upload modal ── -->
    <Teleport to="body">
      <div v-if="showUploadModal" class="docs-backdrop" @click.self="showUploadModal = false">
        <div class="docs-modal glass-surface">
          <div class="docs-modal-head">
            <span>Загрузить документ</span>
            <button class="docs-modal-close" @click="showUploadModal = false">✕</button>
          </div>
          <div class="docs-modal-body">
            <div class="docs-field">
              <label class="docs-label">Название *</label>
              <input v-model="uploadForm.title" class="docs-input" placeholder="Договор подряда №12..." />
            </div>
            <div class="docs-field">
              <label class="docs-label">Категория</label>
              <select v-model="uploadForm.category" class="docs-input docs-input--select">
                <option v-for="c in CATEGORIES.filter(c => c.key !== 'all')" :key="c.key" :value="c.key">
                  {{ c.icon }} {{ c.label }}
                </option>
              </select>
            </div>
            <div class="docs-field">
              <label class="docs-label">Проект (необязательно)</label>
              <select v-model="uploadForm.projectSlug" class="docs-input docs-input--select">
                <option value="">— без проекта —</option>
                <option v-for="p in allProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
              </select>
            </div>
            <div class="docs-field">
              <label class="docs-label">Файл</label>
              <input type="file" class="docs-input" @change="onFileSelect" />
            </div>
            <div class="docs-field">
              <label class="docs-label">Или вставьте URL</label>
              <input v-model="uploadForm.url" class="docs-input" placeholder="https://..." />
            </div>
            <div class="docs-field">
              <label class="docs-label">Заметки</label>
              <textarea v-model="uploadForm.notes" rows="2" class="docs-input docs-input--textarea" placeholder="дополнительная информация..." />
            </div>
            <p v-if="uploadError" class="docs-error">{{ uploadError }}</p>
          </div>
          <div class="docs-modal-foot">
            <button class="docs-btn" @click="showUploadModal = false">отмена</button>
            <button class="docs-btn docs-btn--primary" :disabled="uploading || !uploadForm.title" @click="submitUpload">
              {{ uploading ? 'загрузка...' : 'сохранить' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Generate modal ── -->
    <Teleport to="body">
      <div v-if="showGenerateModal" class="docs-backdrop" @click.self="showGenerateModal = false">
        <div class="docs-modal docs-modal--wide glass-surface">
          <div class="docs-modal-head">
            <span>Создать документ из шаблона</span>
            <button class="docs-modal-close" @click="showGenerateModal = false">✕</button>
          </div>
          <div class="docs-modal-body">

            <!-- Step 1: pick template -->
            <template v-if="genStep === 1">
              <p class="docs-gen-hint">Выберите шаблон документа:</p>
              <div class="docs-tpl-list">
                <button
                  v-for="tpl in DOC_TEMPLATES" :key="tpl.key"
                  class="docs-tpl-item"
                  :class="{ 'docs-tpl-item--active': genSelectedTpl?.key === tpl.key }"
                  @click="genSelectedTpl = tpl"
                >
                  <span class="docs-tpl-icon">{{ tpl.icon }}</span>
                  <div>
                    <div class="docs-tpl-name">{{ tpl.name }}</div>
                    <div class="docs-tpl-desc">{{ tpl.description }}</div>
                  </div>
                </button>
              </div>
              <div class="docs-modal-foot">
                <button class="docs-btn" @click="showGenerateModal = false">отмена</button>
                <button class="docs-btn docs-btn--primary" :disabled="!genSelectedTpl" @click="genStep = 2">
                  далее →
                </button>
              </div>
            </template>

            <!-- Step 2: fill fields -->
            <template v-if="genStep === 2 && genSelectedTpl">
              <p class="docs-gen-hint">Заполните поля для <strong>{{ genSelectedTpl.name }}</strong>:</p>
              <div class="docs-gen-project">
                <label class="docs-label">Проект</label>
                <select v-model="genProjectSlug" class="docs-input docs-input--select" @change="onGenProjectChange">
                  <option value="">— без проекта —</option>
                  <option v-for="p in allProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
                </select>
              </div>
              <div class="docs-gen-fields">
                <div v-for="field in genSelectedTpl.fields" :key="field.key" class="docs-field">
                  <label class="docs-label">{{ field.label }}</label>
                  <textarea
                    v-if="field.multiline"
                    v-model="genFields[field.key]"
                    rows="3"
                    class="docs-input docs-input--textarea"
                    :placeholder="field.placeholder || ''"
                  />
                  <input
                    v-else
                    v-model="genFields[field.key]"
                    class="docs-input"
                    :placeholder="field.placeholder || ''"
                  />
                </div>
              </div>
              <div class="docs-modal-foot">
                <button class="docs-btn" @click="genStep = 1">← назад</button>
                <button class="docs-btn docs-btn--primary" @click="genStep = 3">
                  предпросмотр →
                </button>
              </div>
            </template>

            <!-- Step 3: preview + save -->
            <template v-if="genStep === 3 && genSelectedTpl">
              <p class="docs-gen-hint">Предпросмотр — <strong>{{ genSelectedTpl.name }}</strong>:</p>
              <div class="docs-gen-preview">
                <pre class="docs-gen-pre">{{ generatedText }}</pre>
              </div>
              <div class="docs-modal-foot">
                <button class="docs-btn" @click="genStep = 2">← назад</button>
                <button class="docs-btn" @click="downloadGenerated">⬇ скачать txt</button>
                <button class="docs-btn docs-btn--primary" :disabled="genSaving" @click="saveGenerated">
                  {{ genSaving ? 'сохраняется...' : '✓ сохранить в документы' }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

// ── Categories ──────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all',      label: 'все',         icon: '📂' },
  { key: 'contract', label: 'договоры',    icon: '📝' },
  { key: 'act',      label: 'акты',        icon: '✅' },
  { key: 'invoice',  label: 'счета',       icon: '🧾' },
  { key: 'template', label: 'шаблоны',     icon: '📋' },
  { key: 'other',    label: 'прочее',      icon: '📎' },
]

function catLabel(key: string) {
  return CATEGORIES.find(c => c.key === key)?.label ?? key
}

// ── Document templates ──────────────────────────────────────────
const DOC_TEMPLATES = [
  {
    key: 'contract_design',
    name: 'Договор на дизайн-проект',
    icon: '📝',
    description: 'Стандартный договор на выполнение работ по дизайну интерьера',
    category: 'contract',
    fields: [
      { key: 'contract_number', label: 'Номер договора', placeholder: '№ 01/2026' },
      { key: 'contract_date',   label: 'Дата договора',  placeholder: '01.03.2026' },
      { key: 'client_name',     label: 'ФИО клиента',    placeholder: 'Иванов Иван Иванович' },
      { key: 'client_address',  label: 'Адрес клиента',  placeholder: 'г. Москва, ул. ...' },
      { key: 'object_address',  label: 'Адрес объекта',  placeholder: 'г. Москва, ул. ...' },
      { key: 'area',            label: 'Площадь (кв.м)', placeholder: '120' },
      { key: 'price',           label: 'Сумма договора', placeholder: '350 000 руб.' },
      { key: 'deadline',        label: 'Срок выполнения', placeholder: '90 дней' },
      { key: 'advance',         label: 'Аванс',           placeholder: '50%' },
    ],
    template: `ДОГОВОР НА ВЫПОЛНЕНИЕ ДИЗАЙН-ПРОЕКТА {{contract_number}}

г. Москва                                                        {{contract_date}}

Дария Кульчихина, именуемая далее «Исполнитель», с одной стороны,
и {{client_name}}, именуемый(ая) далее «Заказчик», с другой стороны,
заключили настоящий договор о нижеследующем:

1. ПРЕДМЕТ ДОГОВОРА
Исполнитель обязуется разработать дизайн-проект интерьера объекта,
расположенного по адресу: {{object_address}}, общей площадью {{area}} кв.м.

2. СТОИМОСТЬ И ПОРЯДОК ОПЛАТЫ
2.1 Стоимость работ составляет {{price}}.
2.2 Аванс: {{advance}} при подписании договора.
2.3 Оставшаяся сумма выплачивается при сдаче проекта.

3. СРОКИ
3.1 Срок выполнения работ: {{deadline}} с момента подписания договора
    и оплаты аванса.

4. КОНТАКТНЫЕ ДАННЫЕ ЗАКАЗЧИКА
Адрес: {{client_address}}

Исполнитель: Кульчихина Д.А.         Заказчик: {{client_name}}

_______________________              _______________________`,
  },
  {
    key: 'act_acceptance',
    name: 'Акт приёмки работ',
    icon: '✅',
    description: 'Акт выполненных работ по дизайн-проекту',
    category: 'act',
    fields: [
      { key: 'act_number',      label: 'Номер акта',      placeholder: '№ А-01/2026' },
      { key: 'act_date',        label: 'Дата акта',       placeholder: '01.03.2026' },
      { key: 'contract_number', label: 'Номер договора',  placeholder: '№ 01/2026' },
      { key: 'client_name',     label: 'ФИО клиента',     placeholder: 'Иванов Иван Иванович' },
      { key: 'work_description',label: 'Перечень работ',  placeholder: 'Разработка дизайн-проекта интерьера...', multiline: true },
      { key: 'price',           label: 'Сумма',           placeholder: '350 000 руб.' },
    ],
    template: `АКТ ВЫПОЛНЕННЫХ РАБОТ {{act_number}}

г. Москва                                                        {{act_date}}

К договору {{contract_number}}

Дария Кульчихина (Исполнитель) и {{client_name}} (Заказчик)
составили настоящий акт о том, что:

ИСПОЛНИТЕЛЬ ВЫПОЛНИЛ СЛЕДУЮЩИЕ РАБОТЫ:
{{work_description}}

СТОИМОСТЬ ВЫПОЛНЕННЫХ РАБОТ: {{price}}

Заказчик претензий к качеству и срокам выполнения работ не имеет.
Работы выполнены в полном объёме.

Исполнитель: Кульчихина Д.А.         Заказчик: {{client_name}}

_______________________              _______________________`,
  },
  {
    key: 'invoice',
    name: 'Счёт на оплату',
    icon: '🧾',
    description: 'Счёт для выставления клиенту',
    category: 'invoice',
    fields: [
      { key: 'invoice_number', label: 'Номер счёта',      placeholder: '№ С-01/2026' },
      { key: 'invoice_date',   label: 'Дата',             placeholder: '01.03.2026' },
      { key: 'client_name',    label: 'Получатель',       placeholder: 'Иванов Иван Иванович' },
      { key: 'description',    label: 'Назначение',       placeholder: 'Аванс по договору № ...', multiline: true },
      { key: 'amount',         label: 'Сумма',            placeholder: '175 000 руб.' },
      { key: 'due_date',       label: 'Оплатить до',      placeholder: '15.03.2026' },
    ],
    template: `СЧЁТ НА ОПЛАТУ {{invoice_number}}
от {{invoice_date}}

Исполнитель: Кульчихина Дария Александровна
Получатель: {{client_name}}

НАЗНАЧЕНИЕ ПЛАТЕЖА:
{{description}}

СУММА К ОПЛАТЕ: {{amount}}

Оплатить до: {{due_date}}

Реквизиты для оплаты уточняйте у исполнителя.`,
  },
]

// ── Data ────────────────────────────────────────────────────────
const { data: allDocs, pending, refresh } = await useFetch<any[]>('/api/documents', {
  default: () => [],
})
const { data: projectsData } = useFetch<any[]>('/api/projects', {
  server: false, default: () => [],
})

const allProjects = computed(() => (projectsData.value || []).map((p: any) => ({
  slug: p.slug, title: p.title,
  clientName: p.profile?.client_name || '',
  address: p.profile?.objectAddress || '',
})))

// ── State ────────────────────────────────────────────────────────
const activeCategory = ref('all')
const search = ref('')

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
  return list
})

function formatDate(val: string) {
  if (!val) return ''
  return new Date(val).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Upload ───────────────────────────────────────────────────────
const showUploadModal = ref(false)
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
  uploadForm.title = ''
  uploadForm.category = 'contract'
  uploadForm.projectSlug = ''
  uploadForm.url = ''
  uploadForm.notes = ''
  uploadFile.value = null
  uploadError.value = ''
  showUploadModal.value = true
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

    if (uploadFile.value) {
      const fd = new FormData()
      fd.append('file', uploadFile.value)
      const { url, filename: fn } = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
      fileUrl = url
      filename = fn
    }

    await $fetch('/api/documents', {
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

    showUploadModal.value = false
    await refresh()
  } catch (e: any) {
    uploadError.value = e?.data?.statusMessage || 'Ошибка загрузки'
  } finally {
    uploading.value = false
  }
}

async function deleteDoc(id: number) {
  if (!confirm('Удалить документ?')) return
  await $fetch(`/api/documents/${id}`, { method: 'DELETE' }).catch(() => {})
  await refresh()
}

// ── Generate ─────────────────────────────────────────────────────
const showGenerateModal = ref(false)
const genStep = ref(1)
const genSelectedTpl = ref<(typeof DOC_TEMPLATES)[number] | null>(null)
const genProjectSlug = ref('')
const genFields = ref<Record<string, string>>({})
const genSaving = ref(false)

function openGenerate() {
  genStep.value = 1
  genSelectedTpl.value = null
  genProjectSlug.value = ''
  genFields.value = {}
  showGenerateModal.value = true
}

function onGenProjectChange() {
  const proj = allProjects.value.find(p => p.slug === genProjectSlug.value)
  if (!proj) return
  genFields.value = {
    ...genFields.value,
    client_name: proj.clientName || genFields.value.client_name || '',
    object_address: proj.address || genFields.value.object_address || '',
  }
}

watch(genSelectedTpl, (tpl) => {
  if (tpl) {
    const fields: Record<string, string> = {}
    for (const f of tpl.fields) fields[f.key] = genFields.value[f.key] || ''
    genFields.value = fields
  }
})

const generatedText = computed(() => {
  if (!genSelectedTpl.value) return ''
  let text = genSelectedTpl.value.template
  for (const [k, v] of Object.entries(genFields.value)) {
    text = text.split(`{{${k}}}`).join(v || `[${k}]`)
  }
  return text
})

function downloadGenerated() {
  if (!generatedText.value) return
  const blob = new Blob([generatedText.value], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${genSelectedTpl.value?.name || 'document'}.txt`
  a.click()
  URL.revokeObjectURL(a.href)
}

async function saveGenerated() {
  if (!genSelectedTpl.value || !generatedText.value) return
  genSaving.value = true
  try {
    // Save text as file via upload
    const blob = new Blob([generatedText.value], { type: 'text/plain;charset=utf-8' })
    const file = new File([blob], `${genSelectedTpl.value.name}.txt`, { type: 'text/plain' })
    const fd = new FormData()
    fd.append('file', file)
    const { url, filename } = await $fetch<any>('/api/upload', { method: 'POST', body: fd })

    await $fetch('/api/documents', {
      method: 'POST',
      body: {
        title: genSelectedTpl.value.name + (genProjectSlug.value ? ' · ' + allProjects.value.find(p => p.slug === genProjectSlug.value)?.title : ''),
        category: genSelectedTpl.value.category,
        projectSlug: genProjectSlug.value || undefined,
        url,
        filename,
        notes: 'Создан из шаблона · ' + new Date().toLocaleDateString('ru-RU'),
      },
    })

    showGenerateModal.value = false
    await refresh()
  } catch (e: any) {
    console.error(e)
  } finally {
    genSaving.value = false
  }
}
</script>

<style scoped>
.docs-root { }

/* ── Topbar ── */
.docs-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}
.docs-topbar-left { display: flex; align-items: center; gap: 10px; }
.docs-topbar-title {
  font-size: .78rem; text-transform: uppercase; letter-spacing: .9px;
  color: var(--glass-text); opacity: .5;
}
.docs-count {
  font-size: .7rem; padding: 1px 7px; border-radius: 999px;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  color: var(--glass-text); opacity: .6;
}
.docs-topbar-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.docs-search {
  border: none;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  color: var(--glass-text); padding: 7px 12px;
  border-radius: 8px; font-size: .8rem; font-family: inherit;
  width: 200px; outline: none;
}
.docs-search:focus { background: color-mix(in srgb, var(--glass-text) 9%, transparent); }

/* ── Buttons ── */
.docs-btn {
  height: 32px; padding: 0 14px;
  border: none; border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 7%, transparent);
  color: var(--glass-text); font-size: .78rem; font-family: inherit;
  cursor: pointer; transition: background .15s, opacity .15s;
  display: inline-flex; align-items: center; white-space: nowrap;
}
.docs-btn:hover { background: color-mix(in srgb, var(--glass-text) 13%, transparent); }
.docs-btn:disabled { opacity: .4; cursor: default; }
.docs-btn--primary {
  background: var(--glass-text); color: var(--glass-page-bg); font-weight: 500;
}
.docs-btn--primary:hover { opacity: .88; }

/* ── Layout ── */
.docs-layout { display: flex; gap: 16px; align-items: flex-start; }

/* ── Nav ── */
.docs-nav {
  width: 168px; flex-shrink: 0;
  padding: 8px; display: flex; flex-direction: column; gap: 2px;
  position: sticky; top: 80px;
}
.docs-nav-item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; border: none; background: transparent;
  color: var(--glass-text); font-size: .8rem; font-family: inherit;
  padding: 8px 10px; border-radius: 8px; cursor: pointer; text-align: left;
  opacity: .6; transition: opacity .15s, background .15s;
}
.docs-nav-item:hover { opacity: .9; background: color-mix(in srgb, var(--glass-text) 5%, transparent); }
.docs-nav-item--active {
  opacity: 1; font-weight: 600;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
}
.docs-nav-icon { font-size: .9rem; flex-shrink: 0; }
.docs-nav-label { flex: 1; }
.docs-nav-count {
  font-size: .65rem; padding: 1px 6px; border-radius: 999px;
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
  flex-shrink: 0;
}

/* ── Main ── */
.docs-main { flex: 1; min-width: 0; }
.docs-empty { font-size: .84rem; color: var(--glass-text); opacity: .35; padding: 20px 0; }
.docs-list { display: flex; flex-direction: column; gap: 8px; }

/* ── Doc card ── */
.doc-card { padding: 12px 16px; }
.doc-card-head {
  display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap; margin-bottom: 6px;
}
.doc-badge {
  font-size: .62rem; text-transform: uppercase; letter-spacing: .5px;
  padding: 2px 8px; border-radius: 999px;
  background: color-mix(in srgb, var(--glass-text) 7%, transparent);
  color: var(--glass-text); flex-shrink: 0;
}
.doc-badge--contract { background: rgba(99,102,241,.12); color: #6366f1; }
.doc-badge--act      { background: rgba(34,197,94,.10);  color: #16a34a; }
.doc-badge--invoice  { background: rgba(245,158,11,.12); color: #d97706; }
.doc-badge--template { background: rgba(168,85,247,.10); color: #9333ea; }

.doc-project { flex: 1; min-width: 0; }
.doc-project-link {
  font-size: .74rem; color: var(--glass-text); opacity: .5;
  text-decoration: none;
}
.doc-project-link:hover { opacity: .9; text-decoration: underline; }
.doc-date { font-size: .7rem; color: var(--glass-text); opacity: .35; white-space: nowrap; margin-left: auto; }

.doc-actions { display: flex; gap: 4px; flex-shrink: 0; }
.doc-btn-ico {
  width: 24px; height: 24px; border: none; background: none;
  cursor: pointer; font-size: .8rem; color: var(--glass-text); opacity: .3;
  border-radius: 4px; display: flex; align-items: center; justify-content: center;
  text-decoration: none; transition: opacity .15s;
}
.doc-btn-ico:hover { opacity: .7; }
.doc-btn-ico--del:hover { color: #dc2626; opacity: .8; }

.doc-title { font-size: .88rem; font-weight: 500; color: var(--glass-text); }
.doc-notes { margin-top: 4px; font-size: .76rem; color: var(--glass-text); opacity: .45; }

/* ── Transitions ── */
.doc-list-enter-active, .doc-list-leave-active { transition: all .2s ease; }
.doc-list-enter-from { opacity: 0; transform: translateY(-4px); }
.doc-list-leave-to  { opacity: 0; transform: translateY(4px); }

/* ── Modal ── */
.docs-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 16px;
}
.docs-modal {
  width: 480px; max-width: 100%; max-height: 88vh;
  border-radius: 16px; display: flex; flex-direction: column;
  overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,.18);
}
.docs-modal--wide { width: 600px; }
.docs-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  font-size: .84rem; font-weight: 500; color: var(--glass-text);
  flex-shrink: 0;
}
.docs-modal-close {
  background: none; border: none; cursor: pointer;
  font-size: 1rem; color: var(--glass-text); opacity: .45; padding: 2px 6px;
}
.docs-modal-close:hover { opacity: 1; }
.docs-modal-body { overflow-y: auto; flex: 1; padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
.docs-modal-foot {
  padding: 12px 20px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  flex-shrink: 0;
}
.docs-field { display: flex; flex-direction: column; gap: 4px; }
.docs-label { font-size: .66rem; text-transform: uppercase; letter-spacing: .4px; color: var(--glass-text); opacity: .45; }
.docs-input {
  border: none;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  color: var(--glass-text); padding: 8px 10px; border-radius: 8px;
  font-size: .82rem; font-family: inherit; outline: none;
  transition: background .15s;
}
.docs-input:focus { background: color-mix(in srgb, var(--glass-text) 9%, transparent); }
.docs-input--select { appearance: none; cursor: pointer; }
.docs-input--textarea { resize: vertical; min-height: 60px; }
.docs-error { font-size: .78rem; color: #dc2626; }

/* ── Generate modal ── */
.docs-gen-hint { font-size: .82rem; color: var(--glass-text); opacity: .7; margin-bottom: 4px; }
.docs-gen-hint strong { opacity: 1; }
.docs-tpl-list { display: flex; flex-direction: column; gap: 6px; }
.docs-tpl-item {
  display: flex; align-items: flex-start; gap: 12px;
  width: 100%; border: none; text-align: left;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  color: var(--glass-text); border-radius: 10px; padding: 12px;
  cursor: pointer; font-family: inherit; transition: background .15s;
  border: 1px solid transparent;
}
.docs-tpl-item:hover { background: color-mix(in srgb, var(--glass-text) 7%, transparent); }
.docs-tpl-item--active {
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  border-color: color-mix(in srgb, var(--glass-text) 20%, transparent);
}
.docs-tpl-icon { font-size: 1.4rem; flex-shrink: 0; line-height: 1.2; }
.docs-tpl-name { font-size: .84rem; font-weight: 500; margin-bottom: 2px; }
.docs-tpl-desc { font-size: .74rem; color: var(--glass-text); opacity: .5; }

.docs-gen-project { margin-bottom: 4px; }
.docs-gen-fields { display: flex; flex-direction: column; gap: 8px; }

.docs-gen-preview {
  border-radius: 10px;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  padding: 14px; max-height: 300px; overflow-y: auto;
}
.docs-gen-pre {
  margin: 0; font-family: 'Courier New', monospace; font-size: .74rem;
  color: var(--glass-text); white-space: pre-wrap; line-height: 1.6;
}
</style>
