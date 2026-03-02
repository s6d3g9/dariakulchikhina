<template>
  <div class="docs-root">

    <!-- Header bar -->
    <div class="docs-topbar glass-card">
      <div class="docs-topbar-left">
        <span class="docs-topbar-title">документы</span>
        <span class="docs-count">{{ allDocs.length }}</span>
      </div>
      <div class="docs-topbar-right">
        <input v-model="search" class="docs-search glass-input" placeholder="поиск..." />
        <button class="a-btn-sm" @click="openUpload">+ загрузить</button>
        <button class="a-btn-sm" @click="openGenerate">✦ из шаблона</button>
      </div>
    </div>

    <div class="docs-layout">

      <!-- ══ Left: category sidebar ══ -->
      <nav class="docs-nav std-sidenav">
        <div class="std-nav">
          <button
            v-for="cat in CATEGORIES" :key="cat.key"
            class="docs-nav-item std-nav-item"
            :class="{ 'std-nav-item--active': activeCategory === cat.key && !activeDoc }"
            @click="selectCategory(cat.key)"
          >
            <span class="docs-nav-num">{{ cat.num }}</span>
            <span class="docs-nav-label">{{ cat.label }}</span>
            <span v-if="countByCategory[cat.key]" class="docs-nav-count">{{ countByCategory[cat.key] }}</span>
          </button>
        </div>
      </nav>

      <!-- ══ Right: content area (list OR document view) ══ -->
      <div class="docs-main">

        <!-- ── Document view (inline render) ── -->
        <template v-if="activeDoc">
          <div class="docs-view">
            <div class="docs-view-head">
              <button class="docs-back" @click="activeDoc = null">← назад к списку</button>
              <div class="docs-view-actions">
                <a v-if="activeDoc.url" :href="activeDoc.url" target="_blank" class="a-btn-sm">↗ открыть файл</a>
                <button class="a-btn-sm" @click="editDoc">✎ редактировать</button>
                <button class="a-btn-sm a-btn-danger" @click="deleteDoc(activeDoc.id)">удалить</button>
              </div>
            </div>
            <div class="docs-view-card glass-card">
              <div class="docs-view-badge" :class="`docs-view-badge--${activeDoc.category}`">
                {{ catLabel(activeDoc.category) }}
              </div>
              <h2 class="docs-view-title">{{ activeDoc.title }}</h2>
              <div v-if="activeDoc.projectTitle" class="docs-view-project">
                проект: <NuxtLink :to="`/admin/projects/${activeDoc.projectSlug}`" class="docs-view-project-link">{{ activeDoc.projectTitle }}</NuxtLink>
              </div>
              <div class="docs-view-meta">
                <span class="docs-view-date">{{ formatDate(activeDoc.createdAt) }}</span>
                <span v-if="activeDoc.filename" class="docs-view-file">{{ activeDoc.filename }}</span>
              </div>
              <div v-if="activeDoc.notes" class="docs-view-notes">{{ activeDoc.notes }}</div>

              <!-- Inline preview for text files -->
              <div v-if="previewText" class="docs-view-preview">
                <pre class="docs-view-pre">{{ previewText }}</pre>
              </div>
              <div v-else-if="activeDoc.url && isImage(activeDoc.url)" class="docs-view-preview">
                <img :src="activeDoc.url" class="docs-view-img" />
              </div>
              <div v-else-if="activeDoc.url && isPdf(activeDoc.url)" class="docs-view-preview">
                <iframe :src="activeDoc.url" class="docs-view-pdf" />
              </div>
            </div>
          </div>
        </template>

        <!-- ── Document list ── -->
        <template v-else>
          <div v-if="pending" class="docs-empty">Загрузка...</div>
          <div v-else-if="!filteredDocs.length" class="docs-empty">
            {{ search ? 'Ничего не найдено' : 'Нет документов в этой категории' }}
          </div>
          <transition-group v-else name="doc-list" tag="div" class="docs-list">
            <div
              v-for="doc in filteredDocs" :key="doc.id"
              class="doc-card glass-card"
              @click="openDoc(doc)"
            >
              <div class="doc-card-head">
                <span class="doc-badge" :class="`doc-badge--${doc.category}`">
                  {{ catLabel(doc.category) }}
                </span>
                <span v-if="doc.projectTitle" class="doc-project">
                  {{ doc.projectTitle }}
                </span>
                <span class="doc-date">{{ formatDate(doc.createdAt) }}</span>
                <div class="doc-actions" @click.stop>
                  <a v-if="doc.url" :href="doc.url" target="_blank" class="doc-btn-ico" title="открыть">↗</a>
                  <button class="doc-btn-ico doc-btn-ico--del" title="удалить" @click="deleteDoc(doc.id)">×</button>
                </div>
              </div>
              <div class="doc-title">{{ doc.title }}</div>
              <div v-if="doc.notes" class="doc-notes">{{ doc.notes }}</div>
            </div>
          </transition-group>
        </template>

      </div>
    </div>

    <!-- ═══ Upload modal ═══ -->
    <Teleport to="body">
      <div v-if="showUploadModal" class="docs-backdrop" @click.self="showUploadModal = false">
        <div class="docs-modal glass-surface">
          <div class="docs-modal-head">
            <span>{{ editingDoc ? 'Редактировать документ' : 'Загрузить документ' }}</span>
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
                  {{ c.num }} {{ c.label }}
                </option>
              </select>
            </div>
            <div class="docs-field">
              <label class="docs-label">Проект</label>
              <select v-model="uploadForm.projectSlug" class="docs-input docs-input--select">
                <option value="">— без проекта —</option>
                <option v-for="p in allProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option>
              </select>
            </div>
            <div v-if="!editingDoc" class="docs-field">
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
            <button class="a-btn-sm" @click="showUploadModal = false">отмена</button>
            <button class="a-btn-save" :disabled="uploading || !uploadForm.title" @click="submitUpload">
              {{ uploading ? 'загрузка...' : (editingDoc ? 'сохранить' : 'загрузить') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══ Generate modal — Document Editor ═══ -->
    <Teleport to="body">
      <div v-if="showGenerateModal" class="docs-backdrop" @click.self="showGenerateModal = false">
        <div class="docs-modal docs-modal--wide glass-surface">
          <div class="docs-modal-head">
            <span>Создать документ из шаблона</span>
            <button class="docs-modal-close" @click="showGenerateModal = false">✕</button>
          </div>
          <div class="docs-modal-body">
            <AdminDocumentEditor
              :templates="DOC_TEMPLATES"
              :projects="allProjects"
              @close="showGenerateModal = false"
              @saved="onEditorSaved"
            />
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

// ══════════════════════════════════════════════════════════════════
// CATEGORIES — numbered, professional
// ══════════════════════════════════════════════════════════════════
const CATEGORIES = [
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
// DOCUMENT TEMPLATES
// ══════════════════════════════════════════════════════════════════
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
    key: 'contract_supply',
    name: 'Договор поставки материалов',
    icon: '📦',
    description: 'Договор на поставку мебели / материалов',
    category: 'contract_supply',
    fields: [
      { key: 'contract_number', label: 'Номер договора', placeholder: '№ П-01/2026' },
      { key: 'contract_date',   label: 'Дата',           placeholder: '01.03.2026' },
      { key: 'supplier_name',   label: 'Поставщик',      placeholder: 'ООО "Мебель Плюс"' },
      { key: 'items',           label: 'Перечень товаров', placeholder: 'Диван угловой — 1 шт, ...',  multiline: true },
      { key: 'amount',          label: 'Сумма',           placeholder: '250 000 руб.' },
      { key: 'delivery_date',   label: 'Срок поставки',   placeholder: '30 календарных дней' },
      { key: 'delivery_address',label: 'Адрес доставки',  placeholder: 'г. Москва, ул. ...' },
    ],
    template: `ДОГОВОР ПОСТАВКИ {{contract_number}}

г. Москва                                                        {{contract_date}}

{{supplier_name}}, именуемый(ая) далее «Поставщик», с одной стороны,
и Кульчихина Д.А. (от лица Заказчика), именуемая далее «Покупатель»,
с другой стороны, заключили настоящий договор:

1. ПРЕДМЕТ ДОГОВОРА
Поставщик обязуется передать, а Покупатель — принять и оплатить
следующие товары:
{{items}}

2. ЦЕНА И ПОРЯДОК ОПЛАТЫ
Общая стоимость: {{amount}}.

3. СРОКИ И УСЛОВИЯ ПОСТАВКИ
Срок: {{delivery_date}}.
Адрес доставки: {{delivery_address}}.

Поставщик: {{supplier_name}}            Покупатель: Кульчихина Д.А.

_______________________                _______________________`,
  },
  {
    key: 'contract_work',
    name: 'Договор подряда (строительный)',
    icon: '🏗',
    description: 'Договор на строительные / отделочные работы',
    category: 'contract_work',
    fields: [
      { key: 'contract_number', label: 'Номер договора', placeholder: '№ СМР-01/2026' },
      { key: 'contract_date',   label: 'Дата',           placeholder: '01.03.2026' },
      { key: 'contractor_name', label: 'Подрядчик',      placeholder: 'ООО "Ремонт Сервис"' },
      { key: 'object_address',  label: 'Адрес объекта',  placeholder: 'г. Москва, ул. ...' },
      { key: 'work_scope',      label: 'Перечень работ',  placeholder: 'Демонтаж, штукатурка, ...',  multiline: true },
      { key: 'amount',          label: 'Сумма',           placeholder: '800 000 руб.' },
      { key: 'deadline',        label: 'Сроки',           placeholder: '60 рабочих дней' },
    ],
    template: `ДОГОВОР ПОДРЯДА {{contract_number}}

г. Москва                                                        {{contract_date}}

{{contractor_name}}, именуемый(ая) далее «Подрядчик»,
и Кульчихина Д.А. (от лица Заказчика), именуемая далее «Заказчик»,
заключили договор:

1. ПРЕДМЕТ ДОГОВОРА
Подрядчик обязуется выполнить строительно-отделочные работы
по адресу: {{object_address}}:
{{work_scope}}

2. СТОИМОСТЬ
Общая стоимость работ: {{amount}}.

3. СРОКИ
Срок выполнения: {{deadline}}.

Подрядчик: {{contractor_name}}            Заказчик: Кульчихина Д.А.

_______________________                  _______________________`,
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
    key: 'act_defect',
    name: 'Акт о дефектах',
    icon: '⚠️',
    description: 'Рекламационный акт при обнаружении дефектов',
    category: 'act_defect',
    fields: [
      { key: 'act_number',    label: 'Номер акта', placeholder: '№ Д-01/2026' },
      { key: 'act_date',      label: 'Дата',       placeholder: '01.03.2026' },
      { key: 'contractor',    label: 'Подрядчик / поставщик', placeholder: 'ООО ...' },
      { key: 'object_address',label: 'Адрес объекта', placeholder: 'г. Москва ...' },
      { key: 'defects',       label: 'Описание дефектов', placeholder: '1. Неровная штукатурка\n2. ...', multiline: true },
      { key: 'deadline_fix',  label: 'Срок устранения', placeholder: '10 рабочих дней' },
    ],
    template: `АКТ О ВЫЯВЛЕННЫХ ДЕФЕКТАХ {{act_number}}

г. Москва                                                        {{act_date}}

Объект: {{object_address}}
Подрядчик / Поставщик: {{contractor}}

В ходе приёмки / эксплуатации объекта выявлены следующие дефекты:

{{defects}}

Подрядчик обязуется устранить дефекты в срок: {{deadline_fix}}.

Заказчик: Кульчихина Д.А.             Подрядчик: {{contractor}}

_______________________              _______________________`,
  },
  {
    key: 'invoice',
    name: 'Счёт на оплату',
    icon: '🧾',
    description: 'Счёт для выставления клиенту',
    category: 'invoice',
    fields: [
      { key: 'invoice_number', label: 'Номер счёта',  placeholder: '№ С-01/2026' },
      { key: 'invoice_date',   label: 'Дата',         placeholder: '01.03.2026' },
      { key: 'client_name',    label: 'Получатель',   placeholder: 'Иванов Иван Иванович' },
      { key: 'description',    label: 'Назначение',   placeholder: 'Аванс по договору № ...', multiline: true },
      { key: 'amount',         label: 'Сумма',        placeholder: '175 000 руб.' },
      { key: 'due_date',       label: 'Оплатить до',  placeholder: '15.03.2026' },
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
  {
    key: 'estimate',
    name: 'Смета на работы',
    icon: '📊',
    description: 'Калькуляция стоимости работ или материалов',
    category: 'estimate',
    fields: [
      { key: 'estimate_no',  label: 'Номер сметы',  placeholder: '№ СМ-01/2026' },
      { key: 'date',         label: 'Дата',          placeholder: '01.03.2026' },
      { key: 'object',       label: 'Объект',        placeholder: 'Квартира 120 кв.м, ул. ...' },
      { key: 'items',        label: 'Позиции',       placeholder: '1. Демонтаж — 50 000 руб.\n2. Штукатурка — 120 000 руб.\n...', multiline: true },
      { key: 'total',        label: 'Итого',         placeholder: '850 000 руб.' },
    ],
    template: `СМЕТА {{estimate_no}}
от {{date}}

Объект: {{object}}

ПЕРЕЧЕНЬ РАБОТ / МАТЕРИАЛОВ:
{{items}}

══════════════════════════════════
ИТОГО: {{total}}

Составил: Кульчихина Д.А.`,
  },
  {
    key: 'tz_doc',
    name: 'Техническое задание',
    icon: '📐',
    description: 'ТЗ на дизайн-проект или строительные работы',
    category: 'tz',
    fields: [
      { key: 'tz_no',          label: 'Номер ТЗ',       placeholder: '№ ТЗ-01/2026' },
      { key: 'date',           label: 'Дата',            placeholder: '01.03.2026' },
      { key: 'client_name',    label: 'Заказчик',        placeholder: 'Иванов И.И.' },
      { key: 'object_address', label: 'Адрес объекта',   placeholder: 'г. Москва ...' },
      { key: 'area',           label: 'Площадь',         placeholder: '120 кв.м' },
      { key: 'requirements',   label: 'Требования',      placeholder: '1. Зонирование гостиной\n2. ...', multiline: true },
      { key: 'style',          label: 'Стиль',           placeholder: 'современный минимализм' },
      { key: 'budget',         label: 'Бюджет',          placeholder: 'до 1 500 000 руб.' },
    ],
    template: `ТЕХНИЧЕСКОЕ ЗАДАНИЕ {{tz_no}}
от {{date}}

Заказчик: {{client_name}}
Объект: {{object_address}}, {{area}}
Стилевое направление: {{style}}
Бюджет: {{budget}}

ТРЕБОВАНИЯ К ПРОЕКТУ:
{{requirements}}

Составил: Кульчихина Д.А.
Согласовал: {{client_name}}`,
  },
]

// ══════════════════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════════════════
const { data: allDocs, pending, refresh } = await useFetch<any[]>('/api/documents', { default: () => [] })
const { data: projectsData } = useFetch<any[]>('/api/projects', { server: false, default: () => [] })

const allProjects = computed(() => (projectsData.value || []).map((p: any) => ({
  slug: p.slug, title: p.title,
  clientName: p.profile?.client_name || '',
  address: p.profile?.objectAddress || '',
})))

// ══════════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════════
const activeCategory = ref('all')
const search = ref('')
const activeDoc = ref<any>(null)
const editingDoc = ref<any>(null)
const previewText = ref('')

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

function isImage(url: string) { return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) }
function isPdf(url: string) { return /\.pdf$/i.test(url) }
function isTextFile(url: string) { return /\.(txt|md|csv)$/i.test(url) }

function selectCategory(key: string) {
  activeCategory.value = key
  activeDoc.value = null
  previewText.value = ''
}

async function openDoc(doc: any) {
  activeDoc.value = doc
  previewText.value = ''
  // Try to load text preview
  if (doc.url && isTextFile(doc.url)) {
    try {
      const text = await $fetch<string>(doc.url, { responseType: 'text' } as any)
      previewText.value = typeof text === 'string' ? text : ''
    } catch { /* no preview */ }
  }
}

function editDoc() {
  if (!activeDoc.value) return
  editingDoc.value = activeDoc.value
  uploadForm.title = activeDoc.value.title
  uploadForm.category = activeDoc.value.category
  uploadForm.projectSlug = activeDoc.value.projectSlug || ''
  uploadForm.url = activeDoc.value.url || ''
  uploadForm.notes = activeDoc.value.notes || ''
  uploadFile.value = null
  uploadError.value = ''
  showUploadModal.value = true
}

// ══════════════════════════════════════════════════════════════════
// UPLOAD / EDIT
// ══════════════════════════════════════════════════════════════════
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
  editingDoc.value = null
  uploadForm.title = ''
  uploadForm.category = activeCategory.value === 'all' ? 'contract' : activeCategory.value
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

    if (editingDoc.value) {
      // Update existing
      await $fetch(`/api/documents/${editingDoc.value.id}`, {
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
    }

    showUploadModal.value = false
    editingDoc.value = null
    activeDoc.value = null
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
  activeDoc.value = null
  await refresh()
}

// ══════════════════════════════════════════════════════════════════
// GENERATE FROM TEMPLATE (delegated to AdminDocumentEditor)
// ══════════════════════════════════════════════════════════════════
const showGenerateModal = ref(false)

function openGenerate() {
  showGenerateModal.value = true
}

async function onEditorSaved() {
  showGenerateModal.value = false
  await refresh()
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   DOCUMENTS — admin panel
   ══════════════════════════════════════════════════════════════ */

/* ── Topbar ── */
.docs-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 18px; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;
}
.docs-topbar-left { display: flex; align-items: center; gap: 10px; }
.docs-topbar-title {
  font-size: var(--ds-text-sm, .78rem); text-transform: uppercase;
  letter-spacing: .08em; color: var(--glass-text); opacity: .45; font-weight: var(--ds-heading-weight, 600);
}
.docs-count {
  font-size: var(--ds-text-xs, .65rem); padding: 1px 7px; border-radius: var(--chip-radius, 999px);
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  color: var(--glass-text); opacity: .6;
}
.docs-topbar-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.docs-search { width: 200px; padding: 7px 12px; font-size: var(--ds-text-sm, .8rem); }

/* ── Layout ── */
.docs-layout { display: flex; gap: var(--ds-grid-gap, 16px); align-items: flex-start; }

/* ── Nav sidebar ── */
.docs-nav {
  width: 220px; flex-shrink: 0; padding: 8px;
  position: sticky; top: 80px;
  max-height: calc(100vh - 120px); overflow-y: auto;
  scrollbar-width: thin; scrollbar-color: rgba(128,128,128,.15) transparent;
}
.docs-nav-item {
  gap: 6px !important;
  font-size: var(--ds-text-xs, .74rem) !important;
  padding: 7px 10px !important;
}
.docs-nav-num {
  font-size: .6rem; opacity: .35; font-variant-numeric: tabular-nums;
  min-width: 16px; flex-shrink: 0;
}
.docs-nav-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.docs-nav-count {
  font-size: .58rem; padding: 0 5px; border-radius: var(--chip-radius, 999px);
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
  flex-shrink: 0; line-height: 1.6;
}

/* ── Main content ── */
.docs-main { flex: 1; min-width: 0; }
.docs-empty {
  font-size: var(--ds-text-sm, .84rem); color: var(--glass-text); opacity: .35; padding: 20px 0;
}
.docs-list { display: flex; flex-direction: column; gap: 8px; }

/* ── Doc card ── */
.doc-card {
  padding: 12px 16px; cursor: pointer;
  transition: box-shadow var(--ds-transition, .18s ease), transform var(--ds-transition, .18s ease);
}
.doc-card:hover {
  box-shadow: var(--ds-shadow-lg, 0 8px 32px rgba(0,0,0,.1));
  transform: translateY(-1px);
}
.doc-card-head {
  display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap; margin-bottom: 6px;
}
.doc-badge {
  font-size: .58rem; text-transform: uppercase; letter-spacing: .5px;
  padding: 2px 8px; border-radius: var(--chip-radius, 999px);
  background: color-mix(in srgb, var(--glass-text) 7%, transparent);
  color: var(--glass-text); flex-shrink: 0;
}
.doc-badge--contract,
.doc-badge--contract_supply,
.doc-badge--contract_work { background: rgba(99,102,241,.12); color: #6366f1; }
.doc-badge--act,
.doc-badge--act_defect { background: rgba(34,197,94,.10); color: #16a34a; }
.doc-badge--invoice { background: rgba(245,158,11,.12); color: #d97706; }
.doc-badge--estimate { background: rgba(168,85,247,.10); color: #9333ea; }
.doc-badge--specification,
.doc-badge--tz { background: rgba(59,130,246,.10); color: #3b82f6; }
.doc-badge--approval { background: rgba(34,197,94,.08); color: #059669; }
.doc-badge--warranty { background: rgba(14,165,233,.10); color: #0ea5e9; }
.doc-badge--photo_report { background: rgba(236,72,153,.10); color: #db2777; }
.doc-badge--correspondence { background: rgba(107,114,128,.10); color: #6b7280; }
.doc-badge--template { background: rgba(168,85,247,.10); color: #9333ea; }

html.dark .doc-badge--contract,
html.dark .doc-badge--contract_supply,
html.dark .doc-badge--contract_work { background: rgba(99,102,241,.2); color: #a5b4fc; }
html.dark .doc-badge--act,
html.dark .doc-badge--act_defect { background: rgba(34,197,94,.15); color: #86efac; }
html.dark .doc-badge--invoice { background: rgba(245,158,11,.15); color: #fcd34d; }
html.dark .doc-badge--estimate { background: rgba(168,85,247,.15); color: #c4b5fd; }

.doc-project { flex: 1; min-width: 0; font-size: .74rem; color: var(--glass-text); opacity: .5; }
.doc-date { font-size: .68rem; color: var(--glass-text); opacity: .3; white-space: nowrap; margin-left: auto; }

.doc-actions { display: flex; gap: 4px; flex-shrink: 0; }
.doc-btn-ico {
  width: 24px; height: 24px; border: none; background: none;
  cursor: pointer; font-size: .8rem; color: var(--glass-text); opacity: .3;
  border-radius: 4px; display: flex; align-items: center; justify-content: center;
  text-decoration: none; transition: opacity .15s;
}
.doc-btn-ico:hover { opacity: .7; }
.doc-btn-ico--del:hover { color: var(--ds-error, #dc2626); opacity: .8; }

.doc-title { font-size: var(--ds-text-sm, .88rem); font-weight: 500; color: var(--glass-text); }
.doc-notes { margin-top: 4px; font-size: var(--ds-text-xs, .74rem); color: var(--glass-text); opacity: .4; }

/* ── Transitions ── */
.doc-list-enter-active, .doc-list-leave-active { transition: all .2s ease; }
.doc-list-enter-from { opacity: 0; transform: translateY(-4px); }
.doc-list-leave-to  { opacity: 0; transform: translateY(4px); }

/* ══ Document inline view ══ */
.docs-view-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; flex-wrap: wrap; gap: 8px;
}
.docs-back {
  background: none; border: none; cursor: pointer;
  font-size: var(--ds-text-sm, .8rem); color: var(--glass-text); opacity: .5;
  font-family: inherit; padding: 4px 0;
  transition: opacity .15s;
}
.docs-back:hover { opacity: 1; }
.docs-view-actions { display: flex; gap: 6px; }
.docs-view-card { padding: 24px; }
.docs-view-badge {
  display: inline-block;
  font-size: .6rem; text-transform: uppercase; letter-spacing: .5px;
  padding: 2px 10px; border-radius: var(--chip-radius, 999px);
  background: color-mix(in srgb, var(--glass-text) 7%, transparent);
  color: var(--glass-text); margin-bottom: 12px;
}
.docs-view-badge--contract,
.docs-view-badge--contract_supply,
.docs-view-badge--contract_work { background: rgba(99,102,241,.12); color: #6366f1; }
.docs-view-badge--act { background: rgba(34,197,94,.10); color: #16a34a; }
.docs-view-badge--invoice { background: rgba(245,158,11,.12); color: #d97706; }

.docs-view-title {
  font-size: var(--ds-text-xl, 1.2rem); font-weight: var(--ds-heading-weight, 600);
  color: var(--glass-text); margin-bottom: 8px; line-height: 1.3;
}
.docs-view-project {
  font-size: var(--ds-text-sm, .8rem); color: var(--glass-text); opacity: .5; margin-bottom: 6px;
}
.docs-view-project-link { color: var(--ds-accent, #6366f1); text-decoration: none; }
.docs-view-project-link:hover { text-decoration: underline; }
.docs-view-meta {
  display: flex; gap: 12px; margin-bottom: 12px;
  font-size: var(--ds-text-xs, .72rem); color: var(--glass-text); opacity: .35;
}
.docs-view-file {
  font-family: 'JetBrains Mono', monospace; font-size: .68rem;
}
.docs-view-notes {
  font-size: var(--ds-text-sm, .82rem); color: var(--glass-text); opacity: .6;
  line-height: 1.6; margin-bottom: 16px;
  padding: 12px; border-radius: var(--input-radius, 6px);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}
.docs-view-preview {
  margin-top: 16px; padding: 16px; border-radius: var(--input-radius, 8px);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
  max-height: 500px; overflow-y: auto;
}
.docs-view-pre {
  margin: 0; font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: var(--ds-text-xs, .74rem); color: var(--glass-text);
  white-space: pre-wrap; line-height: 1.6;
}
.docs-view-img { max-width: 100%; border-radius: var(--input-radius, 6px); }
.docs-view-pdf { width: 100%; height: 500px; border: none; border-radius: var(--input-radius, 6px); }

/* ══ Modal ══ */
.docs-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; padding: 16px;
}
.docs-modal {
  width: 480px; max-width: 100%; max-height: 88vh;
  border-radius: var(--modal-radius, 16px);
  display: flex; flex-direction: column;
  overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,.18);
}
.docs-modal--wide { width: 600px; }
.docs-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  font-size: var(--ds-text-sm, .84rem); font-weight: 500; color: var(--glass-text);
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
.docs-label {
  font-size: .62rem; text-transform: uppercase; letter-spacing: .06em;
  color: var(--glass-text); opacity: .45; font-weight: var(--ds-heading-weight, 600);
}
.docs-input {
  border: none;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  color: var(--glass-text); padding: 8px 10px;
  border-radius: var(--input-radius, 8px);
  font-size: var(--ds-text-sm, .82rem); font-family: inherit; outline: none;
  transition: background var(--ds-transition, .15s ease);
}
.docs-input:focus { background: color-mix(in srgb, var(--glass-text) 9%, transparent); }
.docs-input--select { appearance: none; cursor: pointer; }
.docs-input--textarea { resize: vertical; min-height: 60px; }
.docs-error { font-size: var(--ds-text-xs, .78rem); color: var(--ds-error, #dc2626); }

/* ── Generate modal ── */
.docs-gen-hint { font-size: var(--ds-text-sm, .82rem); color: var(--glass-text); opacity: .7; margin-bottom: 4px; }
.docs-gen-hint strong { opacity: 1; }
.docs-tpl-list { display: flex; flex-direction: column; gap: 6px; }
.docs-tpl-item {
  display: flex; align-items: flex-start; gap: 12px;
  width: 100%; border: none; text-align: left;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  color: var(--glass-text); border-radius: var(--card-radius, 10px); padding: 12px;
  cursor: pointer; font-family: inherit;
  transition: background var(--ds-transition, .15s ease);
  border: 1px solid transparent;
}
.docs-tpl-item:hover { background: color-mix(in srgb, var(--glass-text) 7%, transparent); }
.docs-tpl-item--active {
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  border-color: color-mix(in srgb, var(--glass-text) 20%, transparent);
}
.docs-tpl-icon { font-size: 1.4rem; flex-shrink: 0; line-height: 1.2; }
.docs-tpl-name { font-size: var(--ds-text-sm, .84rem); font-weight: 500; margin-bottom: 2px; }
.docs-tpl-desc { font-size: var(--ds-text-xs, .74rem); color: var(--glass-text); opacity: .5; }
.docs-gen-project { margin-bottom: 4px; }
.docs-gen-fields { display: flex; flex-direction: column; gap: 8px; }
.docs-gen-preview {
  border-radius: var(--card-radius, 10px);
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  padding: 14px; max-height: 300px; overflow-y: auto;
}
.docs-gen-pre {
  margin: 0; font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: var(--ds-text-xs, .74rem); color: var(--glass-text);
  white-space: pre-wrap; line-height: 1.6;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .docs-layout { flex-direction: column; }
  .docs-nav { width: 100%; position: static; flex-direction: row; overflow-x: auto; max-height: none; }
  .docs-nav .std-nav { flex-direction: row; }
  .docs-nav-item { white-space: nowrap; }
  .docs-nav-num { display: none; }
}
</style>
