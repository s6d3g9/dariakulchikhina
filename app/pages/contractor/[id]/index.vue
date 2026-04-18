<template>
  <div class="cab-root glass-page">

    <div v-if="pending" class="ent-page-skeleton">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 6" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    </div>

    <div v-else-if="contractor" class="cab-body">

      <!-- Sidebar -->
      <aside
        ref="sidebarRef"
        class="cab-sidebar cab-sidebar--persistent-nav glass-surface std-sidenav"
        :class="{ 'cab-sidebar--mobile-hidden': isMobileShell && mobileShellView === 'content' }"
        aria-label="Разделы кабинета подрядчика"
        :aria-hidden="isMobileShell && mobileShellView === 'content' ? 'true' : 'false'"
        tabindex="-1"
      >
        <div v-if="isMobileShell" class="cab-mobile-shell cab-mobile-shell--sidebar">
          <div class="cab-mobile-shell__copy">
            <p class="cab-mobile-shell__eyebrow">Навигация</p>
            <strong class="cab-mobile-shell__label">Разделы кабинета</strong>
          </div>
          <button type="button" class="cab-mobile-shell__btn" @click="openContractorContent">к экрану</button>
        </div>
        <nav class="cab-nav std-nav">
          <button
            v-for="item in nav" :key="item.key"
            class="cab-nav-item cab-nav-item--persistent-nav std-nav-item"
            :class="{ active: section === item.key, 'std-nav-item--active': section === item.key }"
            @click="section = item.key"
          >
            <span class="cab-nav-icon">{{ item.icon }}</span>
            <span class="cab-nav-label">{{ item.label }}</span>
            <span v-if="item.key === 'tasks' && activeCount" class="cab-badge">{{ activeCount }}</span>
            <span v-if="item.key === 'staff' && staff?.length" class="cab-badge">{{ staff.length }}</span>
            <span v-if="item.key === 'documents' && contractorDocs?.length" class="cab-badge">{{ contractorDocs.length }}</span>
          </button>
        </nav>
      </aside>

      <!-- Main -->
      <main
        ref="mainRef"
        class="cab-main"
        :class="{ 'cab-main--mobile-hidden': isMobileShell && mobileShellView === 'sidebar' }"
        aria-label="Рабочая область подрядчика"
        :aria-hidden="isMobileShell && mobileShellView === 'sidebar' ? 'true' : 'false'"
        tabindex="-1"
      >
        <div class="cab-inner">
          <div v-if="isMobileShell" ref="mobileContentShellRef" class="cab-mobile-shell cab-mobile-shell--content">
            <button type="button" class="cab-mobile-shell__btn" @click="openContractorSidebar">разделы</button>
            <div class="cab-mobile-shell__copy cab-mobile-shell__copy--content">
              <p class="cab-mobile-shell__eyebrow">Активный экран</p>
              <strong class="cab-mobile-shell__label">{{ activeSectionLabel }}</strong>
            </div>
          </div>

          <!-- ── Обзор (Dashboard) ──────────────────────────────── -->
          <template v-if="section === 'dashboard'">
            <ContractorDashboardSection
              :contractor="contractor"
              :profile-pct="profilePct"
              :profile-next-section="profileNextSection"
              :quick-actions="quickActions"
              :dash-stats="dashStats"
              :linked-projects="linkedProjects"
              :dash-deadlines="dashDeadlines"
              :dash-no-due="dashNoDue"
              @navigate="(s: string) => section = s"
            />
          </template>

          <!-- ── Задачи ──────────────────────────────────────────── -->
          <template v-if="section === 'tasks'">
            <ContractorTasksSection
              :contractor-id="contractorId"
              :contractor-type="contractor?.contractorType || ''"
              :staff="staff || []"
              :projects="allProjects"
            />
          </template>

          <!-- ── Коммуникации ─────────────────────────────────── -->
          <template v-else-if="section === 'communications'">
            <ContractorCommunicationsSection
              v-model="selectedCommunicationProjectSlug"
              :projects="allProjects"
            />
          </template>

          <!-- ── Контактные данные ──────────────────────────────── -->
          <template v-else-if="section === 'contacts'">
            <ContractorContactsSection
              :form="form"
              :saving="saving"
              :save-msg="saveMsg"
              @submit="saveProfile"
            />
          </template>

          <!-- ── Паспортные данные ──────────────────────────────── -->
          <template v-else-if="section === 'passport'">
            <ContractorPassportSection
              :form="form"
              :saving="saving"
              :save-msg="saveMsg"
              @submit="saveProfile"
            />
          </template>

          <!-- ── Реквизиты ──────────────────────────────────────── -->
          <template v-else-if="section === 'requisites'">
            <ContractorRequisitesSection
              :form="form"
              :saving="saving"
              :save-msg="saveMsg"
              @submit="saveProfile"
            />
          </template>

          <!-- ── Документы ──────────────────────────────────────── -->
          <template v-else-if="section === 'documents'">
            <div class="u-grid-2" style="margin-bottom:12px">
              <div class="u-field">
                <label>Поиск</label>
                <GlassInput v-model="docsSearch"  placeholder="Название, заметка" />
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
                  <GlassInput v-model="newDocTitle"  placeholder="Название документа" />
                </div>
                <div class="u-field">
                  <label>Категория</label>
                  <select v-model="newDocCategory" class="glass-input cab-select">
                    <option v-for="dc in DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option>
                  </select>
                </div>
                <div class="u-field u-field--full">
                  <label>Примечание</label>
                  <GlassInput v-model="newDocNotes"  placeholder="Необязательно" />
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
            <div v-else-if="contractorDocs?.length" class="cab-empty">
              <div class="cab-empty-icon">🔎</div>
              <p>По фильтру ничего не найдено.</p>
            </div>
            <div v-else class="cab-empty">
              <div class="cab-empty-icon">📂</div>
              <p>Документов пока нет.<br>Загрузите паспорт, лицензии, сертификаты и другие документы.</p>
            </div>
          </template>

          <!-- ── Специализации ──────────────────────────────────── -->
          <template v-else-if="section === 'specialization'">
            <ContractorSpecializationSection
              :form="form"
              :saving="saving"
              :save-msg="saveMsg"
              @submit="saveProfile"
            />
          </template>

          <!-- ── Финансы ────────────────────────────────────────── -->
          <template v-else-if="section === 'finances'">
            <ContractorFinancesSection
              :form="form"
              :saving="saving"
              :save-msg="saveMsg"
              @submit="saveProfile"
            />
          </template>

          <!-- ── Портфолио ──────────────────────────────────────── -->
          <template v-else-if="section === 'portfolio'">
            <ContractorPortfolioSection
              :form="form"
              :saving="saving"
              :save-msg="saveMsg"
              :stats="portfolioStats"
              :contractor="contractor"
              :by-project="byProject"
              @save="saveProfile"
            />
          </template>

          <!-- ── Настройки ──────────────────────────────────────── -->
          <template v-else-if="section === 'settings'">
            <ContractorSettingsSection
              :contractor-id="contractorId"
              :contractor="contractor"
              :notif-settings="notifSettings"
              @save-notifications="saveNotifSettings"
            />
          </template>

          <!-- ── Бригада ────────────────────────────────────── -->
          <template v-else-if="section === 'staff'">
            <ContractorStaffSection :staff="staff" />
          </template>

        </div>
      </main>

      <button
        v-if="showMobileQuickSwitch"
        type="button"
        class="cab-mobile-shell-fab"
        aria-label="Открыть разделы кабинета"
        @click="openContractorSidebar"
      >
        разделы
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { CONTRACTOR_ROLE_TYPE_OPTIONS, CONTRACTOR_WORK_TYPE_OPTIONS, WORK_TYPE_STAGES } from '~~/shared/types/catalogs'
import ContractorDashboardSection from './ContractorDashboardSection.vue'
import ContractorStaffSection from './ContractorStaffSection.vue'
import ContractorCommunicationsSection from './ContractorCommunicationsSection.vue'
import ContractorContactsSection from './ContractorContactsSection.vue'
import ContractorPassportSection from './ContractorPassportSection.vue'
import ContractorRequisitesSection from './ContractorRequisitesSection.vue'
import ContractorSpecializationSection from './ContractorSpecializationSection.vue'
import ContractorFinancesSection from './ContractorFinancesSection.vue'
import ContractorPortfolioSection from './ContractorPortfolioSection.vue'
import ContractorSettingsSection from './ContractorSettingsSection.vue'
import ContractorTasksSection from './ContractorTasksSection.vue'

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Наличные' },
  { value: 'sbp', label: 'СБП' },
  { value: 'card_transfer', label: 'На карту' },
  { value: 'bank_transfer', label: 'Безналичный (р/с)' },
  { value: 'crypto', label: 'Криптовалюта' },
]

definePageMeta({ layout: 'contractor', middleware: ['contractor'] })
const route = useRoute()
const sidebarRef = ref<HTMLElement | null>(null)
const mainRef = ref<HTMLElement | null>(null)
const mobileContentShellRef = ref<HTMLElement | null>(null)
const isDesktopContractorShell = ref(false)
const mobileShellView = ref<'sidebar' | 'content'>('content')
const mobileContentScrollState = reactive({
  route: '',
  y: 0,
})
const showMobileQuickSwitch = ref(false)
let contractorShellScrollFrame = 0
let contractorShellQuickSwitchFrame = 0

const isMobileShell = computed(() => !isDesktopContractorShell.value)

function syncDesktopContractorShellState() {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  isDesktopContractorShell.value = window.innerWidth > 768
}

function cancelContractorShellScrollFrame() {
  if (!import.meta.client || typeof window === 'undefined' || !contractorShellScrollFrame) {
    return
  }

  window.cancelAnimationFrame(contractorShellScrollFrame)
  contractorShellScrollFrame = 0
}

function cancelContractorShellQuickSwitchFrame() {
  if (!import.meta.client || typeof window === 'undefined' || !contractorShellQuickSwitchFrame) {
    return
  }

  window.cancelAnimationFrame(contractorShellQuickSwitchFrame)
  contractorShellQuickSwitchFrame = 0
}

function rememberContractorContentScroll() {
  if (!import.meta.client || typeof window === 'undefined' || isDesktopContractorShell.value) {
    return
  }

  if (mobileShellView.value !== 'content') {
    return
  }

  mobileContentScrollState.route = route.fullPath
  mobileContentScrollState.y = window.scrollY
}

function syncContractorContentQuickSwitch() {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  if (isDesktopContractorShell.value || mobileShellView.value !== 'content') {
    showMobileQuickSwitch.value = false
    return
  }

  const shell = mobileContentShellRef.value
  if (!shell) {
    showMobileQuickSwitch.value = window.scrollY > 120
    return
  }

  showMobileQuickSwitch.value = shell.getBoundingClientRect().bottom < 0
}

function queueContractorContentQuickSwitchSync() {
  if (!import.meta.client || typeof window === 'undefined') {
    return
  }

  cancelContractorShellQuickSwitchFrame()
  contractorShellQuickSwitchFrame = window.requestAnimationFrame(() => {
    contractorShellQuickSwitchFrame = 0
    syncContractorContentQuickSwitch()
  })
}

async function syncContractorShellViewport(nextView: 'sidebar' | 'content', behavior: ScrollBehavior) {
  if (!import.meta.client || typeof window === 'undefined' || isDesktopContractorShell.value) {
    return
  }

  await nextTick()
  cancelContractorShellScrollFrame()

  contractorShellScrollFrame = window.requestAnimationFrame(() => {
    contractorShellScrollFrame = 0

    const target = nextView === 'sidebar' ? sidebarRef.value : mainRef.value
    const shouldRestoreContentScroll = nextView === 'content'
      && mobileContentScrollState.route === route.fullPath
      && mobileContentScrollState.y > 0

    if (shouldRestoreContentScroll) {
      window.scrollTo({ top: mobileContentScrollState.y, behavior })
    } else {
      target?.scrollIntoView({ behavior, block: 'start' })
    }

    target?.focus({ preventScroll: true })
  })
}

async function setContractorShellView(
  nextView: 'sidebar' | 'content',
  options: { behavior?: ScrollBehavior, forceScroll?: boolean } = {},
) {
  if (isDesktopContractorShell.value) {
    mobileShellView.value = 'content'
    return
  }

  if (mobileShellView.value === 'content' && nextView !== 'content') {
    rememberContractorContentScroll()
  }

  const changed = mobileShellView.value !== nextView
  mobileShellView.value = nextView

  if (!changed && !options.forceScroll) {
    return
  }

  await syncContractorShellViewport(nextView, options.behavior || 'smooth')
}

function openContractorSidebar() {
  void setContractorShellView('sidebar', { behavior: 'smooth', forceScroll: true })
}

function openContractorContent() {
  void setContractorShellView('content', { behavior: 'smooth', forceScroll: true })
}

const contractorId = Number(route.params.id)
if (isNaN(contractorId) || contractorId <= 0) {
  throw createError({ statusCode: 400, statusMessage: 'Неверный ID подрядчика' })
}

const { data: contractor, error: contractorError, pending, refresh } = await useFetch<any>(`/api/contractors/${contractorId}`)
if (contractorError.value) {
  const statusCode = contractorError.value.statusCode || contractorError.value.status || 500
  throw createError({
    statusCode,
    statusMessage: contractorError.value.statusMessage || contractorError.value.message || 'Не удалось загрузить кабинет подрядчика',
  })
}

const { data: workItems, refresh: refreshItems } = await useFetch<any[]>(
  `/api/contractors/${contractorId}/work-items`, { default: () => [] }
)
const { data: staff } = await useFetch<any[]>(
  `/api/contractors/${contractorId}/staff`, { default: () => [] }
)
const { data: linkedProjects } = await useFetch<any[]>(
  `/api/contractors/${contractorId}/projects`, { default: () => [] }
)

// ── Form ──────────────────────────────────────────────────────────
const form = reactive({
  name: '',
  companyName: '',
  phone: '',
  email: '',
  messenger: '',
  messengerNick: '',
  website: '',
  notes: '',
  roleTypes: [] as string[],
  workTypes: [] as string[],
  // Паспортные данные
  passportSeries: '',
  passportNumber: '',
  passportIssuedBy: '',
  passportIssueDate: '',
  passportDepartmentCode: '',
  birthDate: '',
  birthPlace: '',
  registrationAddress: '',
  snils: '',
  // Доп. контакты
  telegram: '',
  whatsapp: '',
  city: '',
  workRadius: '',
  // Реквизиты
  inn: '',
  kpp: '',
  ogrn: '',
  bankName: '',
  bik: '',
  settlementAccount: '',
  correspondentAccount: '',
  legalAddress: '',
  factAddress: '',
  // Финансовые
  taxSystem: '',
  paymentMethods: [] as string[],
  hourlyRate: '',
  hasInsurance: false,
  insuranceDetails: '',
  education: '',
  certifications: [] as string[],
  experienceYears: null as number | null,
})

watch(contractor, (c) => {
  if (!c) return
  form.name          = c.name          || ''
  form.companyName   = c.companyName   || ''
  form.phone         = c.phone         || ''
  form.email         = c.email         || ''
  form.messenger     = c.messenger     || ''
  form.messengerNick = c.messengerNick || ''
  form.website       = c.website       || ''
  form.notes         = c.notes         || ''
  form.roleTypes     = Array.isArray(c.roleTypes) ? [...c.roleTypes] : []
  form.workTypes     = Array.isArray(c.workTypes) ? [...c.workTypes] : []
  // Паспортные
  form.passportSeries        = c.passportSeries        || ''
  form.passportNumber        = c.passportNumber        || ''
  form.passportIssuedBy      = c.passportIssuedBy      || ''
  form.passportIssueDate     = c.passportIssueDate     || ''
  form.passportDepartmentCode = c.passportDepartmentCode || ''
  form.birthDate             = c.birthDate             || ''
  form.birthPlace            = c.birthPlace            || ''
  form.registrationAddress   = c.registrationAddress   || ''
  form.snils                 = c.snils                 || ''
  // Доп. контакты
  form.telegram    = c.telegram    || ''
  form.whatsapp    = c.whatsapp    || ''
  form.city        = c.city        || ''
  form.workRadius  = c.workRadius  || ''
  // Реквизиты
  form.inn                 = c.inn                 || ''
  form.kpp                 = c.kpp                 || ''
  form.ogrn                = c.ogrn                || ''
  form.bankName            = c.bankName            || ''
  form.bik                 = c.bik                 || ''
  form.settlementAccount   = c.settlementAccount   || ''
  form.correspondentAccount = c.correspondentAccount || ''
  form.legalAddress        = c.legalAddress        || ''
  form.factAddress         = c.factAddress         || ''
  // Финансовые
  form.taxSystem       = c.taxSystem       || ''
  form.paymentMethods  = Array.isArray(c.paymentMethods) ? [...c.paymentMethods] : []
  form.hourlyRate      = c.hourlyRate      || ''
  form.hasInsurance    = c.hasInsurance    || false
  form.insuranceDetails = c.insuranceDetails || ''
  form.education       = c.education       || ''
  form.certifications  = Array.isArray(c.certifications) ? [...c.certifications] : []
  form.experienceYears = c.experienceYears ?? null
}, { immediate: true })

// ── Документы подрядчика ─────────────────────────────────────────
const { data: contractorDocs, refresh: refreshDocs } = await useFetch<any[]>(
  `/api/contractors/${contractorId}/documents`, { default: () => [] }
)
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
  const rows = contractorDocs.value || []
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
      await $fetch(`/api/contractors/${contractorId}/documents`, { method: 'POST', body: fd })
    }
    newDocTitle.value = ''
    newDocNotes.value = ''
    newDocCategory.value = 'other'
    refreshDocs()
  } finally {
    docUploading.value = false
    ;(ev.target as HTMLInputElement).value = ''
  }
}

async function deleteDoc(docId: number) {
  if (!confirm('Удалить документ?')) return
  await $fetch(`/api/contractors/${contractorId}/documents/${docId}`, { method: 'DELETE' })
  refreshDocs()
}

// Новый сертификат (для секции «Финансы»)
const newCert = ref('')
function addCert() {
  const v = newCert.value.trim()
  if (v && !form.certifications.includes(v)) form.certifications.push(v)
  newCert.value = ''
}
function removeCert(idx: number) { form.certifications.splice(idx, 1) }

// ── Auth guard ───────────────────────────────────────────────────
const { data: meData } = await useFetch<any>('/api/auth/me')
if (meData.value?.contractorId && meData.value.contractorId !== contractorId) {
  await navigateTo(`/contractor/${meData.value.contractorId}`)
}

// ── Nav ──────────────────────────────────────────────────────────
const section = ref('dashboard')
const nav = computed(() => {
  const items: { key: string; icon: string; label: string }[] = [
    { key: 'dashboard',     icon: '◈', label: 'Обзор' },
    { key: 'tasks',         icon: '◎', label: 'Мои задачи' },
    { key: 'communications', icon: '◉', label: 'Коммуникации' },
    { key: 'contacts',      icon: '☎', label: 'Контактные данные' },
    { key: 'passport',      icon: '◑', label: 'Паспортные данные' },
    { key: 'requisites',    icon: '◒', label: 'Реквизиты' },
    { key: 'documents',     icon: '◓', label: 'Документы' },
    { key: 'specialization',icon: '◔', label: 'Специализации' },
    { key: 'finances',      icon: '◕', label: 'Финансы' },
    { key: 'portfolio',     icon: '◖', label: 'Портфолио' },
    { key: 'settings',      icon: '⚙', label: 'Настройки' },
  ]
  if (contractor.value?.contractorType === 'company') {
    items.splice(2, 0, { key: 'staff', icon: '◔', label: 'Бригада' })
  }
  return items
})
const activeSectionLabel = computed(() => nav.value.find(item => item.key === section.value)?.label || 'Обзор')

watch(section, async (nextSection, prevSection) => {
  if (nextSection === prevSection) {
    return
  }

  if (!import.meta.client || typeof window === 'undefined' || !isMobileShell.value) {
    return
  }

  mobileContentScrollState.route = ''
  mobileContentScrollState.y = 0
  await setContractorShellView('content', { behavior: 'auto', forceScroll: true })
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

watch([isDesktopContractorShell, () => route.fullPath], async ([desktop]) => {
  if (desktop) {
    mobileShellView.value = 'content'
    showMobileQuickSwitch.value = false
    return
  }

  await setContractorShellView('content')
}, { immediate: true })

watch([isDesktopContractorShell, mobileShellView, () => route.fullPath, section], async () => {
  await nextTick()
  queueContractorContentQuickSwitchSync()
}, { immediate: true })

onMounted(() => {
  syncDesktopContractorShellState()
  window.addEventListener('resize', syncDesktopContractorShellState)
  window.addEventListener('scroll', queueContractorContentQuickSwitchSync, { passive: true })
  queueContractorContentQuickSwitchSync()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncDesktopContractorShellState)
  window.removeEventListener('scroll', queueContractorContentQuickSwitchSync)
  cancelContractorShellScrollFrame()
  cancelContractorShellQuickSwitchFrame()
})

// ── Tasks (portfolio view) ────────────────────────────────────────
interface WtGroup { workType: string; label: string; items: any[]; stages: any[] }

const activeCount = computed(() =>
  (workItems.value || []).filter((i: any) => ['planned', 'in_progress'].includes(i.status)).length
)

const byProject = computed(() => {
  const all = workItems.value || []
  const map = new Map<string, { slug: string; title: string; wtGroups: WtGroup[]; doneCount: number; totalCount: number }>()
  for (const item of all) {
    if (!map.has(item.projectSlug)) {
      map.set(item.projectSlug, { slug: item.projectSlug, title: item.projectTitle, wtGroups: [], doneCount: 0, totalCount: 0 })
    }
    const proj = map.get(item.projectSlug)!
    proj.totalCount++
    if (item.status === 'done') proj.doneCount++
    const wt = item.workType || '__general__'
    let grp = proj.wtGroups.find(g => g.workType === wt)
    if (!grp) {
      const label = wt === '__general__'
        ? 'Общие задачи'
        : (CONTRACTOR_WORK_TYPE_OPTIONS.find(o => o.value === wt)?.label || wt)
      const stages = wt !== '__general__' ? (WORK_TYPE_STAGES[wt] || []) : []
      grp = { workType: wt, label, items: [], stages }
      proj.wtGroups.push(grp)
    }
    grp.items.push(item)
  }
  return [...map.values()]
})

// ── Все проекты (для коммуникаций и дочернего компонента задач) ──
const allProjects = computed(() => linkedProjects.value || [])

const selectedCommunicationProjectSlug = ref('')

watch(allProjects, (projects) => {
  if (!projects.length) {
    selectedCommunicationProjectSlug.value = ''
    return
  }

  if (!projects.some(project => project.slug === selectedCommunicationProjectSlug.value)) {
    selectedCommunicationProjectSlug.value = projects[0].slug
  }
}, { immediate: true })

// ── Dashboard ─────────────────────────────────────────────────────
function isDue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const [d, m, y] = dateStr.split('.')
  if (!d || !m || !y) return false
  const due = new Date(Number(y), Number(m) - 1, Number(d))
  return due < new Date()
}

const dashStats = computed(() => {
  const all = workItems.value || []
  return {
    total: all.length,
    inProgress: all.filter((i: any) => i.status === 'in_progress').length,
    done: all.filter((i: any) => i.status === 'done').length,
    overdue: all.filter((i: any) => {
      if (i.status === 'done' || i.status === 'cancelled') return false
      return isDue(i.dateEnd)
    }).length,
  }
})

const dashDeadlines = computed(() =>
  (workItems.value || [])
    .filter((i: any) => i.dateEnd && i.status !== 'done' && i.status !== 'cancelled')
    .sort((a: any, b: any) => {
      const parse = (s: string) => { const [d,m,y] = s.split('.'); return new Date(Number(y), Number(m)-1, Number(d)).getTime() }
      return parse(a.dateEnd) - parse(b.dateEnd)
    })
    .slice(0, 8)
)

const dashNoDue = computed(() =>
  (workItems.value || []).filter((i: any) => !i.dateEnd && i.status !== 'done' && i.status !== 'cancelled')
)

// ── Профиль: полнота заполнения ──────────────────────────────────
const profileFields: { key: string; section: string }[] = [
  { key: 'name', section: 'contacts' },
  { key: 'phone', section: 'contacts' },
  { key: 'email', section: 'contacts' },
  { key: 'city', section: 'contacts' },
  { key: 'passportSeries', section: 'passport' },
  { key: 'passportNumber', section: 'passport' },
  { key: 'inn', section: 'requisites' },
  { key: 'bankName', section: 'requisites' },
  { key: 'settlementAccount', section: 'requisites' },
  { key: 'workTypes', section: 'specialization' },
  { key: 'roleTypes', section: 'specialization' },
  { key: 'hourlyRate', section: 'finances' },
]
const profilePct = computed(() => {
  const c = contractor.value
  if (!c) return 0
  let filled = 0
  for (const f of profileFields) {
    const v = c[f.key]
    if (Array.isArray(v) ? v.length > 0 : !!v) filled++
  }
  return Math.round(filled / profileFields.length * 100)
})
const profileNextSection = computed(() => {
  const c = contractor.value
  if (!c) return 'contacts'
  for (const f of profileFields) {
    const v = c[f.key]
    if (!(Array.isArray(v) ? v.length > 0 : !!v)) return f.section
  }
  return 'contacts'
})

// ── Quick actions ─────────────────────────────────────────────────
const quickActions = computed(() => {
  const items = [
    { key: 'tasks',    icon: '◎', label: 'Мои задачи', badge: activeCount.value || '' },
    { key: 'contacts', icon: '☎', label: 'Контакты',   badge: '' },
    { key: 'documents',icon: '◓', label: 'Документы',  badge: '' },
    { key: 'finances', icon: '◕', label: 'Финансы',    badge: '' },
  ]
  return items
})

// ── Portfolio stats ───────────────────────────────────────────────
const portfolioStats = computed(() => {
  const all = workItems.value || []
  const doneItems = all.filter((i: any) => i.status === 'done')
  const projects = new Set(doneItems.map((i: any) => i.projectSlug))
  const photoCount = doneItems.reduce((sum: number, i: any) => sum + (i.photoCount || 0), 0)
  return {
    doneCount: doneItems.length,
    projectCount: projects.size,
    photoCount,
  }
})

// ── Notification settings (localStorage) ─────────────────────────
const NOTIF_LS_KEY = `cab_notif_${contractorId}`
function loadNotifSettings() {
  if (import.meta.server) return { newTasks: true, deadlines: true, comments: true, statusChanges: false }
  try {
    const raw = localStorage.getItem(NOTIF_LS_KEY)
    return raw ? JSON.parse(raw) : { newTasks: true, deadlines: true, comments: true, statusChanges: false }
  } catch { return { newTasks: true, deadlines: true, comments: true, statusChanges: false } }
}
const notifSettings = reactive(loadNotifSettings())
function saveNotifSettings() {
  if (!import.meta.server) localStorage.setItem(NOTIF_LS_KEY, JSON.stringify({ ...notifSettings }))
}

// ── Profile ───────────────────────────────────────────────────────
const ROLE_GROUPS = [
  {
    label: 'Управление',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['general_contractor','foreman','site_manager','estimator'].includes(r.value)
    ),
  },
  {
    label: 'Конструктив',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['demolition_worker','mason','concrete_worker','reinforcer','welder'].includes(r.value)
    ),
  },
  {
    label: 'Инженерные системы',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['electrician','plumber','hvac_engineer','low_current_engineer','gas_engineer','smart_home_installer','security_installer','av_installer'].includes(r.value)
    ),
  },
  {
    label: 'Чистовая отделка',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['plasterer','painter','tiler','floor_installer','wallpaper_installer','decorative_finish_specialist'].includes(r.value)
    ),
  },
  {
    label: 'Столярные / плотницкие',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['carpenter','joiner','drywall_installer','window_installer','glazier','furniture_assembler'].includes(r.value)
    ),
  },
  {
    label: 'Специальные',
    items: CONTRACTOR_ROLE_TYPE_OPTIONS.filter(r =>
      ['stone_worker','facade_worker','roofer','landscape_worker','pool_installer','cleaner'].includes(r.value)
    ),
  },
]

const WORK_GROUPS = [
  {
    label: 'Демонтаж и подготовка',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['demolition','debris_removal'].includes(w.value)
    ),
  },
  {
    label: 'Конструктив',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['masonry','concrete_work','screed','waterproofing','partition_installation','insulation'].includes(w.value)
    ),
  },
  {
    label: 'Инженерные системы',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['electrical_installation','plumbing_installation','hvac','heating','smart_home','low_current','gas_installation','security_systems','av_systems'].includes(w.value)
    ),
  },
  {
    label: 'Чистовая отделка',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['plastering','puttying','tile_installation','painting','wallpapering','ceiling_installation','floor_installation','decorative_plaster'].includes(w.value)
    ),
  },
  {
    label: 'Столярные / плотницкие',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['carpentry','joinery','window_installation','door_installation','built_in_furniture','drywall_installation'].includes(w.value)
    ),
  },
  {
    label: 'Специальные',
    items: CONTRACTOR_WORK_TYPE_OPTIONS.filter(w =>
      ['stone_cladding','facade_works','roofing','landscaping','pool_installation','furniture_installation','final_cleaning'].includes(w.value)
    ),
  },
]

function toggleArr(arr: string[], val: string) {
  const idx = arr.indexOf(val)
  if (idx === -1) arr.push(val)
  else arr.splice(idx, 1)
}

const saving = ref(false)
const saveMsg = ref('')

async function saveProfile() {
  saving.value = true
  saveMsg.value = ''
  try {
    await $fetch(`/api/contractors/${contractorId}/self`, {
      method: 'PUT',
      body: { ...form },
    })
    await refresh()
    saveMsg.value = 'Сохранено!'
    setTimeout(() => (saveMsg.value = ''), 3000)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped src="./ContractorIndexPage.scoped.css"></style>
