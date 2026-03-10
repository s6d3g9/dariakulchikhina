<template>
  <div class="project-page">
    <!-- Toast notification -->
    <Transition name="toast">
      <div v-if="toastVisible" class="toast-notification">{{ toastMsg }}</div>
    </Transition>

    <div v-if="pending" class="page-loading">Загрузка…</div>
    <div v-else-if="!project" class="page-error">Проект не найден</div>
    <template v-else>

      <!-- Header -->
      <div class="proj-header">
        <NuxtLink to="/designer" class="back-link">← Мои проекты</NuxtLink>
        <div class="proj-title-row">
          <div v-if="!editingTitle" class="proj-title-display" @click="startEditTitle">
            <h1 class="proj-title">{{ project.projectTitle || '—' }}</h1>
            <span class="edit-hint">✏️</span>
          </div>
          <div v-else class="proj-title-edit">
            <input v-model="titleDraft" @keydown.enter="saveTitle" @keydown.escape="editingTitle=false" class="title-input" autofocus />
            <button @click="saveTitle" class="btn-xs">✓</button>
            <button @click="editingTitle=false" class="btn-xs ghost">✕</button>
          </div>
          <select v-model="statusDraft" @change="saveStatus" class="status-select" :class="`st-${statusDraft}`">
            <option value="draft">Черновик</option>
            <option value="active">Активный</option>
            <option value="paused">Пауза</option>
            <option value="completed">Завершён</option>
            <option value="archived">Архив</option>
          </select>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-nav">
        <button v-for="t in tabs" :key="t.key" @click="activeTab=t.key"
          class="tab-btn" :class="{ active: activeTab===t.key }">
          {{ t.label }}
        </button>
      </div>

      <!-- Tab: Обзор -->
      <div v-if="activeTab==='overview'" class="tab-panel glass-surface">
        <form @submit.prevent="saveOverview" class="overview-form">
          <div class="field-row">
            <div class="field">
              <label>Площадь, м²</label>
              <input v-model.number="ov.area" type="number" min="0" class="input" />
            </div>
            <div class="field">
              <label>Пакет</label>
              <input v-model="ov.packageKey" type="text" class="input" />
            </div>
            <div class="field">
              <label>Цена за м², ₽</label>
              <input v-model.number="ov.pricePerSqm" type="number" min="0" class="input" />
            </div>
            <div class="field">
              <label>Итого, ₽</label>
              <input v-model.number="ov.totalPrice" type="number" min="0"
                :placeholder="ovComputedTotal > 0 ? String(ovComputedTotal) : ''" class="input" />
            </div>
          </div>
          <div class="field">
            <label>Примечания</label>
            <textarea v-model="ov.notes" rows="3" class="input"></textarea>
          </div>
          <div class="form-actions">
            <span v-if="ovSaved" class="saved-msg">✓ Сохранено</span>
            <button type="submit" :disabled="ovSaving" class="btn-primary">
              {{ ovSaving ? 'Сохранение…' : 'Сохранить' }}
            </button>
          </div>
        </form>
        <div class="danger-zone">
          <button @click="confirmDelete" class="btn-danger">Удалить проект</button>
        </div>
      </div>

      <!-- Tab: Клиент -->
      <div v-if="activeTab==='client'" class="tab-panel glass-surface">
        <div v-if="!project.clients.length" class="empty-state">
          <p>Клиент не привязан</p>
        </div>

        <div v-for="c in project.clients" :key="c.linkId" class="client-block">
          <div class="client-block-header">
            <span class="client-name">{{ c.name }}</span>
            <button @click="removeClient(c.linkId)" class="btn-icon-danger" title="Открепить">✕</button>
          </div>
          <div class="field-grid">
            <div class="field"><label>Телефон</label><input v-model="c.phone" @blur="updateClient(c)" class="input" /></div>
            <div class="field"><label>Email</label><input v-model="c.email" @blur="updateClient(c)" class="input" /></div>
            <div class="field"><label>Мессенджер</label>
              <select v-model="c.messenger" @change="updateClient(c)" class="input">
                <option value="">—</option>
                <option>Telegram</option><option>WhatsApp</option><option>Viber</option>
              </select>
            </div>
            <div class="field"><label>Ник</label><input v-model="c.messengerNick" @blur="updateClient(c)" class="input" /></div>
            <div class="field field-wide"><label>Адрес объекта</label><input v-model="c.address" @blur="updateClient(c)" class="input" /></div>
            <div class="field field-full"><label>Примечания</label><textarea v-model="c.notes" @blur="updateClient(c)" rows="2" class="input"></textarea></div>
          </div>
        </div>

        <!-- Добавить клиента -->
        <div class="add-section">
          <h3 class="add-title">Добавить клиента</h3>
          <div class="search-add-row">
            <input v-model="addClientSearch" @input="onAddClientSearch" placeholder="Поиск клиента…" class="input" />
            <button @click="addClientMode='new'" class="btn-secondary">Новый клиент</button>
          </div>
          <div v-if="addClientResults.length" class="results-list">
            <div v-for="c in addClientResults" :key="c.id" @click="addExistingClient(c.id)" class="result-item">
              <span>{{ c.name }}</span><span class="result-sub">{{ c.phone }}</span>
            </div>
          </div>
          <div v-if="addClientMode==='new'" class="inline-form">
            <div class="field-row">
              <div class="field"><label>Имя *</label><input v-model="newClientForm.name" class="input" /></div>
              <div class="field"><label>Телефон *</label><input v-model="newClientForm.phone" class="input" /></div>
            </div>
            <div class="inline-form-actions">
              <button @click="addNewClient" class="btn-primary">Добавить</button>
              <button @click="addClientMode='search'" class="btn-text">Отмена</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Команда -->
      <div v-if="activeTab==='team'" class="tab-panel glass-surface">
        <div v-if="!project.contractors.length" class="empty-state"><p>Подрядчиков нет</p></div>
        <div v-for="c in project.contractors" :key="c.linkId" class="team-member">
          <div class="tm-info">
            <span class="tm-name">{{ c.name }}</span>
            <span class="tm-company" v-if="c.companyName">{{ c.companyName }}</span>
            <span class="tm-role" v-if="c.role">{{ c.role }}</span>
          </div>
          <div class="tm-contacts">
            <a v-if="c.phone" :href="`tel:${c.phone}`">{{ c.phone }}</a>
            <a v-if="c.telegram" :href="`https://t.me/${c.telegram.replace('@','')}`" target="_blank">{{ c.telegram }}</a>
            <span class="tm-types" v-if="c.workTypes?.length">{{ c.workTypes.join(', ') }}</span>
          </div>
          <button @click="removeContractor(c.linkId)" class="btn-icon-danger" title="Убрать">✕</button>
        </div>

        <!-- Добавить / создать -->
        <div class="add-section">
          <div class="add-section-tabs">
            <button @click="teamMode='search'" class="add-tab-btn" :class="{ active: teamMode==='search' }">Найти исполнителя</button>
            <button @click="teamMode='new'" class="add-tab-btn" :class="{ active: teamMode==='new' }">Создать нового</button>
          </div>

          <!-- ПОИСК -->
          <div v-if="teamMode==='search'">
            <div class="search-add-row">
              <input v-model="addContSearch" @input="onAddContSearch" placeholder="Поиск по ФИО, телефону, Telegram, ID…" class="input" />
            </div>
            <div v-if="addContResults.length" class="results-list">
              <div v-for="c in addContResults" :key="c.id" class="result-item">
                <div class="result-main">
                  <span>{{ c.name }}</span>
                  <span class="result-sub">{{ [c.companyName, c.phone, c.telegram].filter(Boolean).join(' · ') }}</span>
                  <span class="result-id">#{{ c.id }}</span>
                </div>
                <div class="result-actions">
                  <input v-model="addContRoles[c.id]" placeholder="роль в проекте" class="input role-input" />
                  <button @click="addContractor(c.id)" class="btn-primary btn-sm">+ Добавить</button>
                </div>
              </div>
            </div>
            <div v-else-if="addContSearch.length > 0 && !addContResults.length" class="results-empty">Не найдено. Попробуйте создать нового.</div>
          </div>

          <!-- ФОРМА СОЗДАНИЯ -->
          <div v-if="teamMode==='new'" class="inline-form">
            <div class="field-row">
              <div class="field field-wide"><label>ФИО *</label><input v-model="newContForm.name" class="input" placeholder="Иванов Алексей" /></div>
              <div class="field"><label>Тип</label>
                <select v-model="newContForm.contractorType" class="input">
                  <option value="master">Мастер</option>
                  <option value="company">Компания</option>
                  <option value="supplier">Поставщик</option>
                </select>
              </div>
            </div>
            <div class="field-row">
              <div class="field"><label>Телефон</label><input v-model="newContForm.phone" type="tel" class="input" placeholder="+7 900 000 00 00" /></div>
              <div class="field"><label>Telegram</label><input v-model="newContForm.telegram" class="input" placeholder="@username" /></div>
              <div class="field"><label>Компания</label><input v-model="newContForm.companyName" class="input" /></div>
            </div>
            <div class="field-row">
              <div class="field field-wide"><label>Вид работ (через запятую)</label><input v-model="newContForm.workTypesText" class="input" placeholder="Электрика, Сантехника…" /></div>
              <div class="field"><label>Роль в проекте</label><input v-model="newContForm.role" class="input" placeholder="Прораб" /></div>
            </div>
            <div class="inline-form-actions">
              <button @click="createAndAddContractor" :disabled="!newContForm.name" class="btn-primary">Создать и добавить</button>
              <button @click="teamMode='search'" class="btn-text">Отмена</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Задачи -->
      <div v-if="activeTab==='tasks'" class="tab-panel glass-surface">
        <div class="tasks-list">
          <div v-if="!project.tasks.length" class="empty-state"><p>Задач нет</p></div>
          <div v-for="task in project.tasks" :key="task.id" class="task-item" :class="`ts-${task.status}`">
            <div class="task-header">
              <span class="task-title">{{ task.title }}</span>
              <div class="task-controls">
                <select v-model="task.status" @change="updateTask(task)" class="status-micro">
                  <option value="new">Новая</option>
                  <option value="in_progress">В работе</option>
                  <option value="review">Проверка</option>
                  <option value="done">Готово</option>
                  <option value="cancelled">Отмена</option>
                </select>
                <button @click="deleteTask(task.id)" class="btn-icon-danger">✕</button>
              </div>
            </div>
            <div class="task-meta" v-if="task.dateStart || task.dateEnd || task.budget">
              <span v-if="task.dateStart">{{ fmtDate(task.dateStart) }}</span>
              <span v-if="task.dateEnd">– {{ fmtDate(task.dateEnd) }}</span>
              <span v-if="task.budget" class="task-budget">{{ task.budget }} ₽</span>
            </div>
          </div>
        </div>

        <!-- Новая задача -->
        <div class="add-section">
          <h3 class="add-title">Новая задача</h3>
          <div class="field-row">
            <div class="field field-wide"><label>Название *</label><input v-model="newTask.title" class="input" /></div>
            <div class="field"><label>Тип работ</label><input v-model="newTask.workType" class="input" /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Дата начала</label><input v-model="newTask.dateStart" type="date" class="input" /></div>
            <div class="field"><label>Дата конца</label><input v-model="newTask.dateEnd" type="date" class="input" /></div>
            <div class="field"><label>Бюджет, ₽</label><input v-model="newTask.budget" class="input" /></div>
          </div>
          <div class="field"><label>Описание</label><textarea v-model="newTask.description" rows="2" class="input"></textarea></div>
          <!-- Contractor for task -->
          <div class="field" v-if="project.contractors.length">
            <label>Исполнитель</label>
            <select v-model.number="newTask.assignedContractorId" class="input">
              <option :value="null">—</option>
              <option v-for="c in project.contractors" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="inline-form-actions">
            <button @click="createTask" :disabled="!newTask.title" class="btn-primary">Добавить задачу</button>
          </div>
        </div>
      </div>

      <!-- Tab: Документы -->
      <div v-if="activeTab==='docs'" class="tab-panel glass-surface">

        <!-- Панель действий: шаблоны -->
        <div class="docs-actions-bar">
          <button @click="showTemplatesModal=true" class="btn-secondary">📄 Сформировать документ</button>
        </div>

        <div v-if="!project.documents.length" class="empty-state"><p>Документов нет</p></div>
        <div v-for="doc in project.documents" :key="doc.id" class="doc-item">
          <div class="doc-info">
            <span class="doc-title">{{ doc.title }}</span>
            <span class="doc-cat">{{ fmtDocCat(doc.category) }}</span>
            <span class="doc-date">{{ fmtDate(doc.createdAt) }}</span>
          </div>
          <div class="doc-actions">
            <a v-if="doc.url" :href="doc.url" target="_blank" download class="btn-xs">⬇ Скачать</a>
            <button v-if="doc.url" @click="openShareModal(doc)" class="btn-xs btn-share" title="Поделиться">⇪ Share</button>
            <button @click="deleteDoc(doc.id)" class="btn-icon-danger">✕</button>
          </div>
        </div>

        <!-- Загрузка файла -->
        <div class="add-section">
          <h3 class="add-title">Загрузить документ</h3>
          <div class="field-row">
            <div class="field"><label>Название</label><input v-model="newDoc.title" class="input" placeholder="Договор, ТЗ…" /></div>
            <div class="field">
              <label>Категория</label>
              <select v-model="newDoc.category" class="input">
                <option value="contract_design">01 · Договор на дизайн-проект</option>
                <option value="contract_supply">02 · Договор поставки</option>
                <option value="contract_subcontract">03 · Договор подряда (строительство)</option>
                <option value="act_completion">04 · Акт выполненных работ</option>
                <option value="act_defects">05 · Акт о дефектах / рекламация</option>
                <option value="invoice">06 · Счёт на оплату</option>
                <option value="estimate">07 · Смета и калькуляция</option>
                <option value="specification">08 · Спецификация и ведомость</option>
                <option value="tz">09 · Техническое задание</option>
                <option value="approval">10 · Согласование и визы</option>
                <option value="warranty">11 · Гарантийный документ</option>
                <option value="photo_report">12 · Фотоотчёт объекта</option>
                <option value="correspondence">13 · Переписка и протоколы</option>
                <option value="doc_template">14 · Шаблон документа</option>
                <option value="other">15 · Прочее</option>
              </select>
            </div>
          </div>
          <div class="file-upload-area">
            <input ref="fileInput" type="file" @change="onFileChange" class="file-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx" />
            <div class="file-label" @click="fileInput?.click()">
              <span v-if="!newDoc.file">📎 Выбрать файл</span>
              <span v-else>{{ newDoc.file.name }}</span>
            </div>
          </div>
          <div class="inline-form-actions">
            <button @click="uploadDoc" :disabled="!newDoc.file || docUploading" class="btn-primary">
              {{ docUploading ? 'Загрузка…' : 'Загрузить' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Модал: Шаблоны документов -->
      <div v-if="showTemplatesModal" class="modal-overlay" @click.self="showTemplatesModal=false">
        <div class="modal-box">
          <div class="modal-header">
            <h2>Сформировать документ</h2>
            <button @click="showTemplatesModal=false" class="btn-icon-close">✕</button>
          </div>
          <div class="templates-grid">
            <button v-for="tpl in docTemplates" :key="tpl.key" @click="generateDoc(tpl)" class="tpl-btn">
              <span class="tpl-icon">{{ tpl.icon }}</span>
              <span class="tpl-name">{{ tpl.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Модал: Share документа -->
      <div v-if="shareDoc" class="modal-overlay" @click.self="shareDoc=null">
        <div class="modal-box">
          <div class="modal-header">
            <h2>Поделиться: {{ shareDoc.title }}</h2>
            <button @click="shareDoc=null" class="btn-icon-close">✕</button>
          </div>
          <div class="share-options">
            <p class="share-label">Отправить клиенту:</p>
            <div v-if="project.clients.length" class="share-clients">
              <div v-for="c in project.clients" :key="c.id" class="share-client-row">
                <span class="share-client-name">{{ c.name }}</span>
                <div class="share-btns">
                  <a v-if="c.phone" :href="`https://wa.me/${c.phone.replace(/\D/g,'')}?text=${encodeURIComponent('Документ: ' + shareDoc.title + ' ' + (shareDoc.url || ''))}`" target="_blank" class="btn-xs share-wa">WhatsApp</a>
                  <a v-if="c.telegram" :href="`https://t.me/${c.telegram.replace('@','')}`" target="_blank" class="btn-xs share-tg">Telegram</a>
                  <a v-if="c.email" :href="`mailto:${c.email}?subject=${encodeURIComponent('Документ: ' + shareDoc.title)}&body=${encodeURIComponent(shareDoc.url || '')}`" class="btn-xs share-mail">Email</a>
                </div>
              </div>
            </div>
            <p v-else class="share-no-clients">Клиент не привязан к проекту</p>
            <div class="share-link-row">
              <input class="input" :value="shareDoc.url || ''" readonly @click="copyShareLink" placeholder="Ссылка на файл" />
              <button @click="copyShareLink" class="btn-secondary">Копировать</button>
            </div>
            <div class="share-social">
              <a v-if="shareDoc.url" :href="shareDoc.url" target="_blank" download class="btn-xs">⬇ Скачать PDF</a>
            </div>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'designer', middleware: 'designer' })

const route = useRoute()
const router = useRouter()
const dpId = Number(route.params.id)

const { data: projectData, pending, refresh } = await useFetch<any>(`/api/designer/projects/${dpId}`)
const project = computed(() => projectData.value)

// Tabs
const tabs = [
  { key: 'overview', label: 'Обзор' },
  { key: 'client', label: 'Клиент' },
  { key: 'team', label: 'Команда' },
  { key: 'tasks', label: 'Задачи' },
  { key: 'docs', label: 'Документы' },
]
const activeTab = ref('overview')

// --- HEADER ---
const editingTitle = ref(false)
const titleDraft = ref('')
const statusDraft = ref('')

watch(project, (p) => {
  if (p) {
    statusDraft.value = p.status
    titleDraft.value = p.projectTitle || ''
  }
}, { immediate: true })

function startEditTitle() {
  titleDraft.value = project.value?.projectTitle || ''
  editingTitle.value = true
}

async function saveTitle() {
  if (!titleDraft.value.trim()) return
  editingTitle.value = false
  await $fetch('/api/designer/update-project', {
    method: 'PUT',
    body: { designerProjectId: dpId, title: titleDraft.value.trim() },
  })
  await refresh()
}

async function saveStatus() {
  await $fetch('/api/designer/update-project', {
    method: 'PUT',
    body: { designerProjectId: dpId, status: statusDraft.value },
  })
}

// --- OVERVIEW TAB ---
const ov = reactive({ area: null as number | null, packageKey: '', pricePerSqm: null as number | null, totalPrice: null as number | null, notes: '' })
const ovSaving = ref(false)
const ovSaved = ref(false)

const ovComputedTotal = computed(() =>
  (ov.pricePerSqm && ov.area) ? ov.pricePerSqm * ov.area : 0
)

watch(project, (p) => {
  if (p) {
    ov.area = p.area
    ov.packageKey = p.packageKey || ''
    ov.pricePerSqm = p.pricePerSqm
    ov.totalPrice = p.totalPrice
    ov.notes = p.notes || ''
  }
}, { immediate: true })

async function saveOverview() {
  ovSaving.value = true
  try {
    await $fetch('/api/designer/update-project', {
      method: 'PUT',
      body: {
        designerProjectId: dpId,
        area: ov.area,
        packageKey: ov.packageKey || null,
        pricePerSqm: ov.pricePerSqm,
        totalPrice: ov.totalPrice || (ovComputedTotal.value > 0 ? ovComputedTotal.value : null),
        notes: ov.notes || null,
      },
    })
    ovSaved.value = true
    setTimeout(() => { ovSaved.value = false }, 2000)
    await refresh()
  } finally {
    ovSaving.value = false
  }
}

async function confirmDelete() {
  if (!confirm(`Удалить проект «${project.value?.projectTitle}»? Это действие необратимо.`)) return
  await $fetch(`/api/designer/projects/${dpId}`, { method: 'DELETE' })
  router.push('/designer')
}

// --- CLIENT TAB ---
const addClientSearch = ref('')
const addClientResults = ref<any[]>([])
const addClientMode = ref<'search' | 'new'>('search')
const newClientForm = reactive({ name: '', phone: '' })

let clientTimer: ReturnType<typeof setTimeout> | null = null
function onAddClientSearch() {
  if (clientTimer) clearTimeout(clientTimer)
  if (addClientSearch.value.trim().length < 2) { addClientResults.value = []; return }
  clientTimer = setTimeout(async () => {
    addClientResults.value = await $fetch<any[]>(`/api/designer/search-clients?q=${encodeURIComponent(addClientSearch.value)}`)
  }, 300)
}

async function addExistingClient(clientId: number) {
  await $fetch('/api/designer/team', {
    method: 'POST',
    body: { action: 'add-client', designerProjectId: dpId, clientId },
  })
  addClientSearch.value = ''
  addClientResults.value = []
  await refresh()
}

async function addNewClient() {
  if (!newClientForm.name || !newClientForm.phone) return
  const client = await $fetch<any>('/api/designer/clients', {
    method: 'POST',
    body: { ...newClientForm },
  })
  await addExistingClient(client.id)
  newClientForm.name = ''
  newClientForm.phone = ''
  addClientMode.value = 'search'
}

async function updateClient(c: any) {
  await $fetch(`/api/designer/clients/${c.id}`, {
    method: 'PUT',
    body: { name: c.name, phone: c.phone, email: c.email, messenger: c.messenger, messengerNick: c.messengerNick, address: c.address, notes: c.notes },
  })
}

async function removeClient(linkId: number) {
  if (!confirm('Открепить клиента от проекта?')) return
  await $fetch('/api/designer/team', {
    method: 'POST',
    body: { action: 'remove-client', linkId },
  })
  await refresh()
}

// --- TOAST ---
const toastMsg = ref('')
const toastVisible = ref(false)
function showToast(msg: string) {
  toastMsg.value = msg
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, 3000)
}

// --- TEAM TAB ---
const teamMode = ref<'search' | 'new'>('search')
const addContSearch = ref('')
const addContResults = ref<any[]>([])
const addContRoles: Record<number, string> = reactive({})
const newContForm = reactive({
  name: '', contractorType: 'master', phone: '', telegram: '',
  companyName: '', workTypesText: '', role: '',
})

let contTimer: ReturnType<typeof setTimeout> | null = null
function onAddContSearch() {
  if (contTimer) clearTimeout(contTimer)
  if (addContSearch.value.trim().length < 1) { addContResults.value = []; return }
  contTimer = setTimeout(async () => {
    addContResults.value = await $fetch<any[]>(`/api/designer/search-contractors?q=${encodeURIComponent(addContSearch.value)}`)
  }, 300)
}

async function addContractor(contractorId: number, explicitRole?: string) {
  await $fetch('/api/designer/team', {
    method: 'POST',
    body: { action: 'add-contractor', designerProjectId: dpId, contractorId, role: explicitRole ?? addContRoles[contractorId] ?? null },
  })
  addContSearch.value = ''
  addContResults.value = []
  await refresh()
}

async function createAndAddContractor() {
  if (!newContForm.name.trim()) return
  const workTypes = newContForm.workTypesText.split(',').map((s: string) => s.trim()).filter(Boolean)
  const newC = await $fetch<any>('/api/designer/contractors', {
    method: 'POST',
    body: {
      name: newContForm.name,
      contractorType: newContForm.contractorType,
      phone: newContForm.phone,
      telegram: newContForm.telegram,
      companyName: newContForm.companyName,
      workTypes,
    },
  })
  await addContractor(newC.id, newContForm.role || null)
  Object.assign(newContForm, { name:'', contractorType:'master', phone:'', telegram:'', companyName:'', workTypesText:'', role:'' })
  teamMode.value = 'search'
  showToast('Исполнитель создан и добавлен в команду')
}

async function removeContractor(linkId: number) {
  if (!confirm('Убрать мастера из команды?')) return
  await $fetch('/api/designer/team', {
    method: 'POST',
    body: { action: 'remove-contractor', linkId },
  })
  await refresh()
}

// --- TASKS TAB ---
const newTask = reactive({
  title: '', workType: '', dateStart: '', dateEnd: '', budget: '',
  description: '', assignedContractorId: null as number | null,
})

async function createTask() {
  if (!newTask.title) return
  await $fetch(`/api/designer/projects/${dpId}/tasks`, {
    method: 'POST',
    body: { ...newTask },
  })
  Object.assign(newTask, { title:'', workType:'', dateStart:'', dateEnd:'', budget:'', description:'', assignedContractorId:null })
  showToast('Задача создана')
  await refresh()
}

async function updateTask(task: any) {
  await $fetch(`/api/designer/projects/${dpId}/tasks/${task.id}`, {
    method: 'PUT',
    body: { status: task.status },
  })
}

async function deleteTask(taskId: number) {
  if (!confirm('Удалить задачу?')) return
  await $fetch(`/api/designer/projects/${dpId}/tasks/${taskId}`, { method: 'DELETE' })
  await refresh()
}

// --- DOCS TAB ---
const showTemplatesModal = ref(false)
const shareDoc = ref<any>(null)

const docTemplates = [
  { key: 'contract_design', icon: '📝', name: 'Договор на дизайн-проект' },
  { key: 'contract_subcontract', icon: '🔨', name: 'Договор подряда' },
  { key: 'act_completion', icon: '✅', name: 'Акт выполненных работ' },
  { key: 'act_defects', icon: '⚠️', name: 'Акт о дефектах' },
  { key: 'invoice', icon: '💳', name: 'Счёт на оплату' },
  { key: 'estimate', icon: '💰', name: 'Смета и калькуляция' },
  { key: 'specification', icon: '📊', name: 'Спецификация' },
  { key: 'tz', icon: '📋', name: 'Техническое задание' },
]

function generateDoc(tpl: { key: string; name: string }) {
  const html = buildDocHtml(tpl.key, tpl.name)
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }
  showTemplatesModal.value = false
}

function buildDocHtml(key: string, name: string): string {
  const p = project.value
  const now = new Date().toLocaleDateString('ru-RU')
  const clientName = p?.clients?.[0]?.name || '_______________'
  const address = p?.designerProject?.address || '_______________'
  const title = p?.designerProject?.title || '_______________'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;font-size:14px;line-height:1.7;color:#111}
h1{font-size:18px;text-align:center;margin-bottom:2rem}
.field{border-bottom:1px solid #999;display:inline-block;min-width:200px;margin-left:4px}
.section{margin-bottom:1.5rem}
.sign-row{display:flex;justify-content:space-between;margin-top:4rem}
.sign-col{width:45%}
</style></head><body>
<h1>${name}</h1>
<div class="section"><b>г. Москва, ${now}</b></div>
<div class="section">
  <b>Исполнитель / Дизайнер:</b> <span class="field">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><br/>
  <b>Заказчик:</b> <span class="field">${clientName}</span><br/>
  <b>Объект:</b> <span class="field">${address}</span><br/>
  <b>Проект:</b> <span class="field">${title}</span>
</div>
${docBody(key)}
<div class="sign-row">
  <div class="sign-col"><b>Исполнитель:</b><br/><br/>_____________ /&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/</div>
  <div class="sign-col"><b>Заказчик:</b><br/><br/>_____________ /&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/</div>
</div>
</body></html>`
}

function docBody(key: string): string {
  const tbl = (rows = 4) => `<table style="width:100%;border-collapse:collapse;margin-top:0.5rem">
<tr style="background:#f3f3f3"><th style="border:1px solid #ccc;padding:6px;text-align:left">Наименование</th><th style="border:1px solid #ccc;padding:6px;width:70px">Кол-во</th><th style="border:1px solid #ccc;padding:6px;width:100px">Ед.</th><th style="border:1px solid #ccc;padding:6px;width:110px">Цена, руб.</th><th style="border:1px solid #ccc;padding:6px;width:120px">Сумма, руб.</th></tr>
${Array(rows).fill(`<tr>${Array(5).fill('<td style="border:1px solid #ccc;padding:8px">&nbsp;</td>').join('')}</tr>`).join('\n')}
<tr><td style="border:1px solid #ccc;padding:6px" colspan="4"><b>Итого</b></td><td style="border:1px solid #ccc;padding:6px;text-align:right">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; руб.</td></tr>
</table>`
  const bodies: Record<string, string> = {
    contract_design: `<div class="section"><b>1. Предмет договора</b><br/>Исполнитель обязуется разработать дизайн-проект интерьера объекта, указанного выше, в соответствии с условиями настоящего договора.</div>
<div class="section"><b>2. Состав проекта</b><br/>□ Планировочные решения &nbsp; □ Мудборд &nbsp; □ Чертежи &nbsp; □ Спецификации &nbsp; □ Авторский надзор</div>
<div class="section"><b>3. Сроки выполнения</b><br/>Начало: _________________ &nbsp;&nbsp; Окончание: _________________</div>
<div class="section"><b>4. Стоимость работ</b><br/>Общая стоимость: _________________________ руб.</div>
<div class="section"><b>5. Порядок оплаты</b><br/>□ 50% аванс при подписании, 50% по завершению &nbsp;&nbsp; □ Поэтапно согласно приложению</div>
<div class="section"><b>6. Права и обязанности сторон</b><br/>Исполнитель передаёт Заказчику результаты работ в электронном виде. Заказчик обязуется своевременно предоставить исходные данные и обеспечить доступ на объект.</div>`,
    contract_subcontract: `<div class="section"><b>1. Предмет договора</b><br/>Подрядчик обязуется выполнить следующие виды работ: <span class="field">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div class="section"><b>2. Объём и сроки</b><br/>Объём работ определяется сметой (Приложение №1).<br/>Начало: _________________ &nbsp;&nbsp; Окончание: _________________</div>
<div class="section"><b>3. Стоимость</b><br/>Стоимость работ: _________________________ руб. (НДС не облагается)</div>
<div class="section"><b>4. Порядок оплаты</b><br/>Оплата производится по факту выполнения каждого этапа работ согласно АВР.</div>
<div class="section"><b>5. Ответственность</b><br/>Подрядчик несёт ответственность за качество работ в течение гарантийного срока ____ мес.</div>`,
    act_completion: `<div class="section"><b>Настоящий акт составлен о том, что Исполнитель сдал, а Заказчик принял следующие работы:</b></div>
<div class="section">
1. ___________________________________________________ на сумму _____________ руб.<br/><br/>
2. ___________________________________________________ на сумму _____________ руб.<br/><br/>
3. ___________________________________________________ на сумму _____________ руб.<br/><br/>
4. ___________________________________________________ на сумму _____________ руб.
</div>
<div class="section"><b>Итого принято работ на сумму:</b> _________________________ руб.</div>
<div class="section"><b>Качество работ:</b> □ Соответствует требованиям &nbsp;&nbsp; □ Имеются замечания (см. приложение)</div>
<div class="section"><b>Замечания:</b><br/><br/><br/></div>
<div class="section">Работы приняты: □ Без претензий &nbsp;&nbsp; □ С замечаниями, устраняемыми в срок до _________________</div>`,
    act_defects: `<div class="section"><b>Настоящий акт составлен по факту выявленных дефектов / рекламации на объекте:</b></div>
<div class="section"><b>Выявленные дефекты:</b><br/>
1. _____________________________________________________________________<br/><br/>
2. _____________________________________________________________________<br/><br/>
3. _____________________________________________________________________
</div>
<div class="section"><b>Причина возникновения:</b><br/><br/><br/></div>
<div class="section"><b>Ответственная сторона:</b> <span class="field">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div class="section"><b>Срок устранения:</b> _________________</div>
<div class="section"><b>Фотофиксация прилагается:</b> □ Да &nbsp;&nbsp; □ Нет</div>`,
    invoice: `<div class="section"><b>СЧЁТ НА ОПЛАТУ</b></div>
${tbl(5)}
<div class="section" style="margin-top:1rem"><b>Оплата до:</b> _________________</div>
<div class="section"><b>Банковские реквизиты исполнителя:</b><br/>
Банк: _________________ &nbsp;&nbsp; БИК: _________________<br/>
Р/с: _________________ &nbsp;&nbsp; К/с: _________________<br/>
ИНН/КПП: _________________
</div>`,
    estimate: `<div class="section"><b>Смета и калькуляция работ</b></div>
${tbl(8)}`,
    specification: `<div class="section"><b>Спецификация и ведомость материалов / изделий</b></div>
<table style="width:100%;border-collapse:collapse">
<tr style="background:#f3f3f3">
  <th style="border:1px solid #ccc;padding:6px;text-align:left">Наименование</th>
  <th style="border:1px solid #ccc;padding:6px">Артикул</th>
  <th style="border:1px solid #ccc;padding:6px">Помещение</th>
  <th style="border:1px solid #ccc;padding:6px">Кол-во</th>
  <th style="border:1px solid #ccc;padding:6px">Ед.</th>
  <th style="border:1px solid #ccc;padding:6px">Поставщик</th>
  <th style="border:1px solid #ccc;padding:6px">Цена</th>
</tr>
${Array(8).fill(`<tr>${Array(7).fill('<td style="border:1px solid #ccc;padding:7px">&nbsp;</td>').join('')}</tr>`).join('\n')}
</table>`,
    tz: `<div class="section"><b>Техническое задание</b></div>
<div class="section"><b>Общие данные:</b><br/>
Площадь объекта: _______ м² &nbsp;&nbsp; Этаж: _______ &nbsp;&nbsp; Новостройка: □ Да □ Нет
</div>
<div class="section"><b>Стиль интерьера:</b> <span class="field">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div class="section"><b>Бюджет на отделку:</b> <span class="field">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span> руб. &nbsp;&nbsp; <b>Сроки:</b> <span class="field">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
<div class="section"><b>Состав семьи / пользователи:</b><br/><br/></div>
<div class="section"><b>Пожелания по помещениям:</b><br/>
Гостиная: _______________________________<br/>
Кухня: _________________________________<br/>
Спальня: _______________________________<br/>
Ванная: ________________________________
</div>
<div class="section"><b>Особые требования:</b><br/><br/><br/></div>`,
  }
  return bodies[key] || ''
}

function openShareModal(doc: any) {
  shareDoc.value = doc
}

async function copyShareLink() {
  if (!shareDoc.value?.url) return
  await navigator.clipboard.writeText(shareDoc.value.url)
  showToast('Ссылка скопирована')
}

const fileInput = ref<HTMLInputElement | null>(null)
const newDoc = reactive({ title: '', category: 'contract_design', file: null as File | null })
const docUploading = ref(false)

function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  newDoc.file = f || null
  if (f && !newDoc.title) newDoc.title = f.name.replace(/\.[^.]+$/, '')
}

async function uploadDoc() {
  if (!newDoc.file) return
  docUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', newDoc.file)
    fd.append('title', newDoc.title || newDoc.file.name)
    fd.append('category', newDoc.category)
    await $fetch(`/api/designer/projects/${dpId}/documents`, { method: 'POST', body: fd })
    newDoc.title = ''
    newDoc.category = 'contract_design'
    newDoc.file = null
    if (fileInput.value) fileInput.value.value = ''
    await refresh()
  } finally {
    docUploading.value = false
  }
}

async function deleteDoc(docId: number) {
  if (!confirm('Удалить документ?')) return
  await $fetch(`/api/designer/projects/${dpId}/documents/${docId}`, { method: 'DELETE' })
  await refresh()
}

// Helpers
const DOC_CAT_LABELS: Record<string, string> = {
  contract_design: '01 · Договор на дизайн-проект',
  contract_supply: '02 · Договор поставки',
  contract_subcontract: '03 · Договор подряда',
  act_completion: '04 · Акт выполненных работ',
  act_defects: '05 · Акт о дефектах',
  invoice: '06 · Счёт на оплату',
  estimate: '07 · Смета и калькуляция',
  specification: '08 · Спецификация',
  tz: '09 · Техническое задание',
  approval: '10 · Согласование',
  warranty: '11 · Гарантийный документ',
  photo_report: '12 · Фотоотчёт',
  correspondence: '13 · Переписка / протокол',
  doc_template: '14 · Шаблон',
  other: '15 · Прочее',
  // legacy keys
  contract: 'Договор',
  act: 'Акт',
  plan: 'План',
}
function fmtDocCat(cat: string): string {
  return DOC_CAT_LABELS[cat] || cat
}

function fmtDate(val: string): string {
  if (!val) return ''
  return new Date(val).toLocaleDateString('ru-RU', { day:'numeric', month:'short', year:'numeric' })
}
</script>

<style scoped>
.project-page { padding: 0; }

.page-loading, .page-error {
  padding: 3rem;
  text-align: center;
  color: var(--glass-label, #888);
}

/* Header */
.back-link {
  font-size: 0.85rem;
  color: var(--glass-accent, #6366f1);
  text-decoration: none;
  display: inline-block;
  margin-bottom: 0.5rem;
}
.back-link:hover { text-decoration: underline; }

.proj-header { margin-bottom: 1.25rem; }

.proj-title-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.proj-title-display {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}
.proj-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
  color: var(--glass-text, #111);
}
.edit-hint { font-size: 0.75rem; opacity: 0.4; }

.proj-title-edit {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.title-input {
  font-size: 1.25rem;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  border: 2px solid var(--glass-accent, #6366f1);
  border-radius: 6px;
  background: var(--glass-input-bg, rgba(255,255,255,0.7));
  color: var(--glass-text, #111);
  outline: none;
  min-width: 280px;
}

.status-select {
  padding: 0.35rem 0.6rem;
  border-radius: 20px;
  border: 1px solid var(--glass-border, #ddd);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  background: var(--glass-input-bg, rgba(255,255,255,0.7));
}
.st-active { border-color: #22c55e; color: #16a34a; }
.st-draft { border-color: #aaa; color: #666; }
.st-paused { border-color: #eab308; color: #a16207; }
.st-completed { border-color: #6366f1; color: #4f46e5; }
.st-archived { border-color: #94a3b8; color: #64748b; }

/* Tabs */
.tabs-nav {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--glass-border, #eee);
  margin-bottom: 1rem;
  overflow-x: auto;
}

.tab-btn {
  padding: 0.65rem 1.1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--glass-label, #888);
  white-space: nowrap;
  transition: color 0.15s;
}
.tab-btn:hover { color: var(--glass-text, #333); }
.tab-btn.active {
  color: var(--glass-accent, #6366f1);
  border-bottom-color: var(--glass-accent, #6366f1);
  font-weight: 600;
}

/* Panels */
.tab-panel {
  border-radius: 12px;
  padding: 1.5rem;
}

/* Forms common */
.field { display: flex; flex-direction: column; gap: 0.3rem; flex: 1; min-width: 130px; }
.field label { font-size: 0.78rem; font-weight: 500; color: var(--glass-label, #666); }
.field-wide { flex: 2; }
.field-full { flex: 100%; width: 100%; }

.field-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.field-row { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.75rem; }

.input {
  padding: 0.5rem 0.7rem;
  border-radius: 8px;
  border: 1px solid var(--glass-border, #ddd);
  background: var(--glass-input-bg, rgba(255,255,255,0.6));
  color: var(--glass-text, #111);
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}
.input:focus { border-color: var(--glass-accent, #6366f1); }
textarea.input { resize: vertical; }

.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.saved-msg { font-size: 0.85rem; color: #16a34a; }

.danger-zone {
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--glass-border, #eee);
}

/* Buttons */
.btn-primary {
  padding: 0.5rem 1.1rem;
  background: var(--glass-accent, #6366f1);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.btn-primary:hover { opacity: 0.88; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sm { padding: 0.35rem 0.7rem; font-size: 0.8rem; }

.btn-secondary {
  padding: 0.5rem 1rem;
  border: 1px solid var(--glass-border, #ddd);
  background: transparent;
  color: var(--glass-text, #333);
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s;
}
.btn-secondary:hover { background: var(--glass-border, #f0f0f0); }

.btn-danger {
  padding: 0.5rem 1rem;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.1s;
}
.btn-danger:hover { background: #fee2e2; }

.btn-icon-danger {
  background: none; border: none;
  color: #dc2626; cursor: pointer;
  font-size: 0.9rem; padding: 0.2rem 0.35rem;
  border-radius: 4px; opacity: 0.5;
  transition: opacity 0.1s;
}
.btn-icon-danger:hover { opacity: 1; }

.btn-xs {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--glass-border, #ddd);
  background: var(--glass-accent, #6366f1);
  color: #fff;
  font-size: 0.8rem;
  cursor: pointer;
}
.btn-xs.ghost { background: none; color: var(--glass-label, #666); }

.btn-text {
  background: none; border: none; cursor: pointer;
  color: var(--glass-accent, #6366f1); font-size: 0.85rem; padding: 0;
}
.btn-text:hover { text-decoration: underline; }

/* Add section */
.add-section {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--glass-border, #eee);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.add-title { font-size: 0.875rem; font-weight: 600; margin: 0; color: var(--glass-label, #666); }

.search-add-row { display: flex; gap: 0.75rem; align-items: center; }
.search-add-row .input { flex: 1; }

.results-list {
  border: 1px solid var(--glass-border, #ddd);
  border-radius: 8px;
  overflow: hidden;
  max-height: 180px;
  overflow-y: auto;
}
.result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0.9rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.1s;
}
.result-item:hover { background: color-mix(in srgb, var(--glass-accent,#6366f1) 6%, transparent); }
.result-sub { font-size: 0.8rem; color: var(--glass-label,#888); }
.result-main { display: flex; flex-direction: column; gap: 0.1rem; }
.result-actions { display: flex; align-items: center; gap: 0.5rem; }
.role-input { width: 90px; min-width: unset; }

.inline-form { display: flex; flex-direction: column; gap: 0.75rem; }
.inline-form-actions { display: flex; gap: 0.75rem; align-items: center; }

/* Empty state */
.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--glass-label, #888);
  font-size: 0.9rem;
}

/* Overview */
.overview-form { display: flex; flex-direction: column; }

/* Client */
.client-block { margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--glass-border,#eee); }
.client-block-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
.client-name { font-weight: 600; font-size: 1rem; color: var(--glass-text,#111); }

/* Team */
.team-member {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--glass-border,#eee);
  flex-wrap: wrap;
}
.tm-info { display: flex; flex-direction: column; gap: 0.15rem; flex: 1; }
.tm-name { font-weight: 600; font-size: 0.9rem; }
.tm-company { font-size: 0.8rem; color: var(--glass-label,#888); }
.tm-role { font-size: 0.75rem; background: color-mix(in srgb, var(--glass-accent,#6366f1) 10%, transparent); color: var(--glass-accent,#6366f1); padding: 0.1rem 0.4rem; border-radius: 4px; display: inline-block; }
.tm-contacts { display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.82rem; color: var(--glass-label,#666); }
.tm-contacts a { color: var(--glass-accent,#6366f1); text-decoration: none; }
.tm-types { font-size: 0.78rem; color: var(--glass-label,#aaa); }

/* Tasks */
.tasks-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem; }
.task-item { padding: 0.75rem; border-radius: 8px; border: 1px solid var(--glass-border,#eee); }
.ts-done { opacity: 0.55; }
.ts-cancelled { opacity: 0.4; }
.task-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.25rem; }
.task-title { font-weight: 500; font-size: 0.9rem; }
.task-controls { display: flex; align-items: center; gap: 0.35rem; }
.status-micro {
  font-size: 0.75rem;
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  border: 1px solid var(--glass-border,#ddd);
  background: transparent;
  cursor: pointer;
  color: var(--glass-label,#666);
}
.task-meta { display: flex; gap: 0.75rem; font-size: 0.78rem; color: var(--glass-label,#888); }
.task-budget { color: #16a34a; font-weight: 500; }

/* Docs */
.doc-item { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.65rem 0; border-bottom: 1px solid var(--glass-border,#eee); }
.doc-info { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0; }
.doc-title { font-weight: 500; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.doc-cat { font-size: 0.75rem; background: var(--glass-border,#eee); padding: 0.1rem 0.4rem; border-radius: 4px; color: var(--glass-label,#666); }
.doc-date { font-size: 0.75rem; color: var(--glass-label,#aaa); white-space: nowrap; }
.doc-actions { display: flex; gap: 0.5rem; align-items: center; }

.file-upload-area {
  border: 2px dashed var(--glass-border,#ddd);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: border-color 0.15s;
}
.file-upload-area:hover { border-color: var(--glass-accent,#6366f1); }
.file-input { display: none; }
.file-label { font-size: 0.875rem; color: var(--glass-label,#888); cursor: pointer; }

/* Team add-section tabs */
.add-section-tabs { display: flex; gap: 0; margin-bottom: 1rem; border: 1px solid var(--glass-border,#ddd); border-radius: 8px; overflow: hidden; }
.add-tab-btn { flex: 1; padding: 0.5rem; background: transparent; border: none; cursor: pointer; font-size: 0.85rem; transition: background 0.15s; color: var(--glass-fg,#333); }
.add-tab-btn.active { background: var(--glass-accent,#6366f1); color: #fff; font-weight: 600; }
.result-id { font-size: 0.72rem; color: var(--glass-label,#aaa); margin-left: 0.25rem; }
.results-empty { font-size: 0.82rem; color: var(--glass-label,#aaa); padding: 0.5rem 0; }

/* Docs actions bar */
.docs-actions-bar { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; }
.doc-actions { display: flex; gap: 0.5rem; align-items: center; }
.btn-share { background: transparent; border: 1px solid var(--glass-border,#ddd); border-radius: 6px; cursor: pointer; color: var(--glass-accent,#6366f1); }

/* Templates modal grid */
.templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); gap: 0.75rem; padding: 1rem 0; }
.tpl-btn { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1rem 0.75rem; border: 1px solid var(--glass-border,#ddd); border-radius: 10px; background: var(--glass-bg,#fff); cursor: pointer; font-size: 0.85rem; transition: border-color 0.15s, background 0.15s; color: var(--glass-fg,#333); }
.tpl-btn:hover { border-color: var(--glass-accent,#6366f1); background: var(--glass-hover,#f5f3ff); }
.tpl-icon { font-size: 1.75rem; }
.tpl-name { text-align: center; font-weight: 500; }

/* Share modal */
.share-options { display: flex; flex-direction: column; gap: 1rem; padding-top: 0.5rem; }
.share-label { font-weight: 600; font-size: 0.9rem; margin: 0; }
.share-clients { display: flex; flex-direction: column; gap: 0.5rem; }
.share-client-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.4rem 0; border-bottom: 1px solid var(--glass-border,#eee); }
.share-client-name { font-size: 0.875rem; }
.share-btns { display: flex; gap: 0.4rem; }
.share-wa { background: #25d366; color: #fff; border-radius: 6px; padding: 0.2rem 0.6rem; font-size: 0.8rem; text-decoration: none; }
.share-tg { background: #0088cc; color: #fff; border-radius: 6px; padding: 0.2rem 0.6rem; font-size: 0.8rem; text-decoration: none; }
.share-mail { background: #6366f1; color: #fff; border-radius: 6px; padding: 0.2rem 0.6rem; font-size: 0.8rem; text-decoration: none; }
.share-no-clients { font-size: 0.85rem; color: var(--glass-label,#aaa); margin: 0; }
.share-link-row { display: flex; gap: 0.5rem; align-items: center; }
.share-social { display: flex; gap: 0.5rem; }

/* Toast */
.toast-notification {
  position: fixed; bottom: 2rem; right: 2rem;
  background: #16a34a; color: #fff;
  padding: 0.75rem 1.25rem; border-radius: 10px;
  font-size: 0.875rem; font-weight: 500;
  z-index: 9999; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  pointer-events: none;
}
.toast-enter-active, .toast-leave-active { transition: opacity 0.3s, transform 0.3s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(1rem); }
</style>
