<template>
  <div class="ct-page" :class="{ 'ct-page--brutalist': isBrutalistContractorsMode }">
    <div v-if="projectSlugFilter" class="ct-filter-info glass-surface glass-card" :class="{ 'ct-filter-info--brutalist': isBrutalistContractorsMode }">
      <span>Фильтр по проекту: <b>{{ projectSlugFilter }}</b></span>
      <NuxtLink :to="`/admin/projects/${projectSlugFilter}`" class="ct-filter-link">← к проекту</NuxtLink>
      <NuxtLink to="/admin/contractors" class="ct-filter-link">показать всех</NuxtLink>
    </div>
    <!-- Content: selected contractor or empty state -->
    <template v-if="selectedId">
      <div class="ct-wipe-host">
      <AdminEntityCabinetShell
        v-show="!isWipe2Mode"
        :show-hero="showBrutalistContractorHero"
        :title="selected?.name || ''"
        :kicker="contractorSectionLabel"
        :facts="contractorHeroFacts"
        :meta-columns="4"
        :brutalist="isBrutalistContractorsMode"
      >
        <template #heroActions>
          <button class="admin-entity-hero__action" @click="openEdit(selected)">редактировать</button>
          <button class="admin-entity-hero__action" @click="openCreate">новый подрядчик</button>
        </template>
        <template #headerActions>
          <button class="ent-entity-hd-action" @click="openEdit(selected)">ред.</button>
        </template>
        <AdminContractorCabinet :key="selectedId" :contractor-id="selectedId" :show-sidebar="false" v-model="activeContractorSection" />
      </AdminEntityCabinetShell>
      <Wipe2Renderer
        v-if="isWipe2Mode && wipe2State"
        :entity="wipe2State"
        :fixed-mode="true"
        @edit="designSystem.set('contentViewMode', 'scroll')"
      />
      </div>
    </template>
    <AdminEntityEmptyState
      v-else
      icon="🏗"
      :has-items="Boolean(contractors?.length)"
      message-with-items="Выберите подрядчика из списка"
      message-empty="Нет подрядчиков — добавьте первого"
      action-label="+ добавить"
      :brutalist="isBrutalistContractorsMode"
      @action="openCreate"
    />

    <Teleport to="body">
      <div v-if="showModal" class="ct-backdrop" :class="{ 'ct-backdrop--brutalist': isBrutalistContractorsMode }" @click.self="closeModal">
        <div class="ct-modal glass-surface" :class="{ 'ct-modal--brutalist': isBrutalistContractorsMode }">
          <div class="ct-modal-head">
            <span>{{ editingId ? 'редактировать' : 'добавить' }} подрядчика</span>
            <button class="ct-modal-close" @click="closeModal">✕</button>
          </div>

          <!-- Табы (только в режиме редактирования) -->
          <div v-if="isEditMode" class="ct-modal-tabs">
            <button v-for="t in modalTabs" :key="t.key" class="ct-modal-tab" :class="{ active: modalTab === t.key }" @click="modalTab = t.key">{{ t.label }}</button>
          </div>

          <div class="ct-modal-body">
            <!-- ═══ TAB: Основное ═══ -->
            <form v-show="modalTab === 'main' || !isEditMode" @submit.prevent="save">
              <div class="ct-form-section">тип участника</div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Тип</label><select v-model="form.contractorType" class="glass-input"><option value="master">Мастер (частный специалист)</option><option value="company">Подрядчик (организация)</option></select></div>
                <div v-if="form.contractorType === 'master'" class="u-field"><label class="u-field__label">Компания-работодатель</label><select v-model="form.parentId" class="glass-input"><option :value="null">— самозанятый —</option><option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option></select></div>
              </div>
              <template v-if="isEditMode">
                <div class="ct-form-section">проекты</div>
                <div v-if="projectsLoading" class="ct-form-hint">Загрузка проектов...</div>
                <div v-else-if="projectsError" class="ct-form-error">{{ projectsError }}</div>
                <div v-else-if="!allProjects.length" class="ct-form-hint">Нет проектов</div>
                <div v-else class="ct-project-pool">
                  <div class="ct-projects-grid">
                    <button v-for="p in allProjects" :key="`project-${p.id}`" type="button" class="ct-project-tag" :class="{ 'ct-project-tag--active': selectedProjectIds.includes(p.id) }" @click.prevent="toggleProject(p.id)">{{ p.title }}</button>
                  </div>
                </div>
              </template>
              <div class="ct-form-section">основное</div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Название *</label><input v-model="form.name" class="glass-input" required /></div>
                <div class="u-field"><label class="u-field__label">Slug *</label><input v-model="form.slug" class="glass-input" required :disabled="!!editingId" /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Компания</label><input v-model="form.companyName" class="glass-input" /></div>
                <div class="u-field"><label class="u-field__label">Контактное лицо</label><input v-model="form.contactPerson" class="glass-input" /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Виды работ</label><input v-model="workTypesStr" class="glass-input" placeholder="через запятую" /></div>
                <div class="u-field"></div>
              </div>
              <div class="ct-form-section">контакты</div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Телефон</label><input v-model="form.phone" class="glass-input" /></div>
                <div class="u-field"><label class="u-field__label">Email</label><input v-model="form.email" class="glass-input" /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Мессенджер</label><select v-model="form.messenger" class="glass-input"><option value="">—</option><option value="telegram">telegram</option><option value="whatsapp">whatsapp</option><option value="viber">viber</option></select></div>
                <div class="u-field"><label class="u-field__label">Ник / номер мессенджера</label><input v-model="form.messengerNick" class="glass-input" /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Сайт / портфолио</label><input v-model="form.website" class="glass-input" placeholder="https://" /></div>
                <div class="u-field"></div>
              </div>
              <div class="ct-form-section">адреса</div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Юридический адрес</label><AppAddressInput v-model="form.legalAddress" input-class="glass-input" /></div>
                <div class="u-field"><label class="u-field__label">Фактический адрес</label><AppAddressInput v-model="form.factAddress" input-class="glass-input" /></div>
              </div>
              <div class="ct-form-section">реквизиты</div>
              <div class="u-grid-3">
                <div class="u-field"><label class="u-field__label">ИНН</label><input v-model="form.inn" class="glass-input" /></div>
                <div class="u-field"><label class="u-field__label">КПП</label><input v-model="form.kpp" class="glass-input" /></div>
                <div class="u-field"><label class="u-field__label">ОГРН / ОГРНИП</label><input v-model="form.ogrn" class="glass-input" /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Банк</label><input v-model="form.bankName" class="glass-input" /></div>
                <div class="u-field"><label class="u-field__label">БИК</label><input v-model="form.bik" class="glass-input" /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Расчётный счёт</label><input v-model="form.settlementAccount" class="glass-input" /></div>
                <div class="u-field"><label class="u-field__label">Корр. счёт</label><input v-model="form.correspondentAccount" class="glass-input" /></div>
              </div>
              <div class="ct-form-section">примечания</div>
              <div class="u-field"><textarea v-model="form.notes" class="glass-input u-ta" rows="3" placeholder="заметки о подрядчике"></textarea></div>
              <p v-if="formError" class="ct-form-error ct-form-error--bottom">{{ formError }}</p>
              <div class="ct-modal-foot"><button type="button" class="a-btn-sm" @click="closeModal">отмена</button><button type="submit" class="a-btn-save" :disabled="saving">{{ saving ? '...' : 'сохранить' }}</button></div>
            </form>

            <!-- ═══ TAB: Паспорт ═══ -->
            <div v-if="isEditMode && modalTab === 'passport'" class="ct-tab-content">
              <div class="ct-form-section">паспортные данные (только чтение)</div>
              <div class="u-grid-3">
                <div class="ct-ro-field"><span class="ct-ro-label">Серия</span><span class="ct-ro-value">{{ editContractor?.passportSeries || '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Номер</span><span class="ct-ro-value">{{ editContractor?.passportNumber || '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Код подразделения</span><span class="ct-ro-value">{{ editContractor?.passportDepartmentCode || '—' }}</span></div>
              </div>
              <div class="u-grid-2">
                <div class="ct-ro-field"><span class="ct-ro-label">Кем выдан</span><span class="ct-ro-value">{{ editContractor?.passportIssuedBy || '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Дата выдачи</span><span class="ct-ro-value">{{ editContractor?.passportIssueDate || '—' }}</span></div>
              </div>
              <div class="u-grid-2">
                <div class="ct-ro-field"><span class="ct-ro-label">Дата рождения</span><span class="ct-ro-value">{{ editContractor?.birthDate || '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Место рождения</span><span class="ct-ro-value">{{ editContractor?.birthPlace || '—' }}</span></div>
              </div>
              <div class="u-grid-2">
                <div class="ct-ro-field"><span class="ct-ro-label">Адрес регистрации</span><span class="ct-ro-value">{{ editContractor?.registrationAddress || '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">СНИЛС</span><span class="ct-ro-value">{{ editContractor?.snils || '—' }}</span></div>
              </div>
            </div>

            <!-- ═══ TAB: Документы ═══ -->
            <div v-if="isEditMode && modalTab === 'documents'" class="ct-tab-content">
              <div class="ct-form-section">загруженные документы</div>
              <div v-if="docsLoading" class="ct-form-hint">Загрузка...</div>
              <div v-else-if="!contractorDocs.length" class="ct-form-hint" style="text-align:center;padding:24px 0;opacity:0.5">Подрядчик пока не загрузил документы</div>
              <div v-else class="ct-docs-list">
                <div v-for="doc in contractorDocs" :key="doc.id" class="ct-doc-row">
                  <span class="ct-doc-icon">📄</span>
                  <div class="ct-doc-info"><span class="ct-doc-name">{{ doc.originalName }}</span><span class="ct-doc-meta">{{ doc.category || 'Без категории' }} · {{ formatDocDate(doc.createdAt) }}</span></div>
                  <a :href="doc.url" target="_blank" class="ct-doc-download">скачать</a>
                </div>
              </div>
            </div>

            <!-- ═══ TAB: Финансы ═══ -->
            <div v-if="isEditMode && modalTab === 'finances'" class="ct-tab-content">
              <div class="ct-form-section">финансовые данные (только чтение)</div>
              <div class="u-grid-3">
                <div class="ct-ro-field"><span class="ct-ro-label">Ставка (₽/час)</span><span class="ct-ro-value">{{ editContractor?.hourlyRate ? editContractor.hourlyRate + ' ₽' : '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Система налогообложения</span><span class="ct-ro-value">{{ editContractor?.taxSystem || '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Опыт (лет)</span><span class="ct-ro-value">{{ editContractor?.experienceYears ?? '—' }}</span></div>
              </div>
              <div class="u-grid-2">
                <div class="ct-ro-field"><span class="ct-ro-label">Способы оплаты</span><span class="ct-ro-value">{{ formatPaymentMethods(editContractor?.paymentMethods) }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Страхование</span><span class="ct-ro-value">{{ editContractor?.hasInsurance ? 'Да — ' + (editContractor?.insuranceDetails || '') : 'Нет' }}</span></div>
              </div>
              <div class="u-grid-2">
                <div class="ct-ro-field"><span class="ct-ro-label">Образование</span><span class="ct-ro-value">{{ editContractor?.education || '—' }}</span></div>
                <div class="ct-ro-field"><span class="ct-ro-label">Сертификаты</span><span class="ct-ro-value"><template v-if="editContractor?.certifications?.length"><span v-for="cert in editContractor.certifications" :key="cert" class="ct-cert-chip">{{ cert }}</span></template><template v-else>—</template></span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useWipe2State } from '~/composables/useWipe2'
import Wipe2Renderer from '~/components/Wipe2Renderer.vue'
definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

const adminNav = useAdminNav()
onMounted(() => adminNav.ensureSection('contractors'))
onActivated(() => adminNav.ensureSection('contractors'))

// Sync from global nav contentSpec
watch(() => adminNav.contentSpec.value.contractorId, (id) => {
  if (id) selectedId.value = id
}, { immediate: true })
watch(() => adminNav.contentSpec.value.contractorSection, (sec) => {
  if (sec) activeContractorSection.value = sec
}, { immediate: true })

// ── Section state ──
const activeContractorSection = ref('dashboard')

const route = useRoute()
const designSystem = useDesignSystem()
const isBrutalistContractorsMode = computed(() => designSystem.currentDesignMode.value === 'brutalist')
const contentViewMode = computed(() => designSystem.tokens.value.contentViewMode ?? 'scroll')
const isWipe2Mode = computed(() => contentViewMode.value === 'wipe2')
const wipe2State = useWipe2State()

const projectSlugFilter = computed(() => typeof route.query.projectSlug === 'string' ? route.query.projectSlug : '')
const contractorsCacheByProject = useState<Record<string, any[]>>('cache-admin-contractors-by-project', () => ({}))
const contractorsCacheKey = computed(() => projectSlugFilter.value || '__all__')
const hasContractorsCache = computed(() => (contractorsCacheByProject.value[contractorsCacheKey.value] || []).length > 0)

const { data: contractors, pending, refresh } = await useFetch<any[]>(
  () => projectSlugFilter.value ? `/api/contractors?projectSlug=${encodeURIComponent(projectSlugFilter.value)}` : '/api/contractors',
  { server: false, default: () => contractorsCacheByProject.value[contractorsCacheKey.value] || [] },
)
watch(contractors, (value) => { if (Array.isArray(value)) contractorsCacheByProject.value = { ...contractorsCacheByProject.value, [contractorsCacheKey.value]: value } }, { deep: true })

// ── Search & selection ─────────────────────────────────
const selectedId = ref<number | null>(null)
const selected = computed(() => contractors.value?.find((c: any) => c.id === selectedId.value) || null)
function selectContractor(c: any) { selectedId.value = c.id }
const showBrutalistContractorHero = computed(() => isBrutalistContractorsMode.value && !!selected.value)
const contractorSectionLabel = computed(() => {
  if (activeContractorSection.value === 'dashboard') return 'кабинет подрядчика'
  return String(activeContractorSection.value || 'кабинет подрядчика').replace(/_/g, ' ')
})
const contractorHeroFacts = computed(() => [
  { label: 'тип', value: selected.value?.contractorType === 'company' ? 'организация' : 'мастер' },
  { label: 'контакт', value: selected.value?.phone || selected.value?.email || 'не указан' },
  { label: 'компания', value: selected.value?.companyName || 'без компании' },
  { label: 'раздел', value: contractorSectionLabel.value },
])

// Auto-select contractor from ?contractorId= query
const router = useRouter()
const contractorIdFromQuery = computed(() => {
  const v = route.query.contractorId
  return typeof v === 'string' ? parseInt(v, 10) : null
})
function applyContractorIdQuery() {
  const qid = contractorIdFromQuery.value
  if (qid && contractors.value?.length) {
    const found = contractors.value.find((c: any) => c.id === qid)
    if (found) selectedId.value = found.id
    const nextQuery = { ...route.query }
    delete nextQuery.contractorId
    router.replace({ query: nextQuery })
  }
}
watch(contractors, () => applyContractorIdQuery(), { immediate: true })
watch(contractorIdFromQuery, () => applyContractorIdQuery())

const companies = computed(() => (contractors.value || []).filter((c: any) => c.contractorType === 'company'))
const mastersByParent = computed(() => {
  const map = new Map<number, any[]>()
  for (const c of contractors.value || []) {
    if (c.contractorType === 'master' && c.parentId) {
      if (!map.has(c.parentId)) map.set(c.parentId, [])
      map.get(c.parentId)!.push(c)
    }
  }
  return map
})
const standaloneMasters = computed(() => (contractors.value || []).filter((c: any) => c.contractorType === 'master' && !c.parentId))


// ── Modal state ────────────────────────────────────────
const showModal = ref(false); const saving = ref(false); const formError = ref('')
const editingId = ref<number | null>(null); const isEditMode = ref(false)
const selectedProjectIds = ref<number[]>([]); const originalProjectIds = ref<number[]>([])
const allProjects = ref<any[]>([]); const projectsLoading = ref(false); const projectsError = ref('')
const adminCatalogs = useAdminCatalogs()
const cachedProjects = adminCatalogs.getCatalog('projects')

const modalTab = ref<'main' | 'passport' | 'documents' | 'finances'>('main')
const modalTabs = [{ key: 'main' as const, label: 'Основное' }, { key: 'passport' as const, label: 'Паспорт' }, { key: 'documents' as const, label: 'Документы' }, { key: 'finances' as const, label: 'Финансы' }]
const editContractor = ref<any>(null); const contractorDocs = ref<any[]>([]); const docsLoading = ref(false)

const PAYMENT_METHOD_LABELS: Record<string, string> = { cash: 'Наличные', sbp: 'СБП', card_transfer: 'На карту', bank_transfer: 'Безналичный (р/с)', crypto: 'Криптовалюта' }
function formatPaymentMethods(methods: string[] | null | undefined) { if (!methods?.length) return '—'; return methods.map(m => PAYMENT_METHOD_LABELS[m] || m).join(', ') }
function formatDocDate(dateStr: string | null | undefined) { if (!dateStr) return ''; try { return new Date(dateStr).toLocaleDateString('ru-RU') } catch { return dateStr || '' } }

function toggleProject(id: number) {
  const idx = selectedProjectIds.value.indexOf(id)
  if (idx === -1) selectedProjectIds.value = [...selectedProjectIds.value, id]
  else selectedProjectIds.value = selectedProjectIds.value.filter(x => x !== id)
}

const emptyForm = () => ({
  name: '', slug: '', companyName: '', contactPerson: '',
  phone: '', email: '', messenger: '', messengerNick: '', website: '',
  legalAddress: '', factAddress: '',
  inn: '', kpp: '', ogrn: '', bankName: '', bik: '', settlementAccount: '', correspondentAccount: '',
  notes: '', workTypes: [] as string[],
  contractorType: 'master' as 'master' | 'company', parentId: null as number | null,
})
const form = reactive(emptyForm())

const workTypesStr = computed({
  get: () => form.workTypes.join(', '),
  set: (v: string) => { form.workTypes = v.split(',').map(s => s.trim()).filter(Boolean) },
})

function openCreate() {
  editingId.value = null; isEditMode.value = false; modalTab.value = 'main'
  editContractor.value = null; contractorDocs.value = []
  allProjects.value = cachedProjects.value
  Object.assign(form, emptyForm()); showModal.value = true
}
function openCreateMaster(companyId: number) {
  editingId.value = null; isEditMode.value = false
  Object.assign(form, emptyForm()); form.contractorType = 'master'; form.parentId = companyId
  showModal.value = true
}

async function openEdit(c: any) {
  editingId.value = c.id; isEditMode.value = true; modalTab.value = 'main'
  editContractor.value = c; contractorDocs.value = []
  const empty = emptyForm()
  for (const key of Object.keys(empty) as (keyof typeof empty)[]) { ;(form as any)[key] = c[key] ?? (empty as any)[key] }
  selectedProjectIds.value = []; originalProjectIds.value = []
  allProjects.value = []; projectsLoading.value = true; projectsError.value = ''
  showModal.value = true
  try {
    const [projs, linked, fullContractor] = await Promise.all([
      adminCatalogs.ensureCatalog('projects'),
      $fetch<any[]>(`/api/contractors/${c.id}/projects`),
      $fetch<any>(`/api/contractors/${c.id}`),
    ])
    allProjects.value = projs; editContractor.value = fullContractor
    const ids = linked.map((p: any) => Number(p.id))
    selectedProjectIds.value = ids; originalProjectIds.value = [...ids]
  } catch (e: any) { projectsError.value = e?.data?.message || 'Ошибка загрузки проектов' }
  finally { projectsLoading.value = false }
}

watch(modalTab, async (tab) => {
  if (tab === 'documents' && editingId.value && !contractorDocs.value.length) {
    docsLoading.value = true
    try { contractorDocs.value = await $fetch<any[]>(`/api/contractors/${editingId.value}/documents`) } catch { contractorDocs.value = [] }
    finally { docsLoading.value = false }
  }
})

function closeModal() {
  showModal.value = false; editingId.value = null; isEditMode.value = false
  modalTab.value = 'main'; editContractor.value = null; contractorDocs.value = []
  selectedProjectIds.value = []; originalProjectIds.value = []
}

async function save() {
  saving.value = true; formError.value = ''
  try {
    if (editingId.value) {
      await $fetch(`/api/contractors/${editingId.value}`, { method: 'PUT', body: JSON.parse(JSON.stringify(form)) })
      const toAdd = selectedProjectIds.value.filter(id => !originalProjectIds.value.includes(id))
      const toRemove = originalProjectIds.value.filter(id => !selectedProjectIds.value.includes(id))
      const projectMap: Record<number, string> = {}
      for (const p of allProjects.value) projectMap[p.id] = p.slug
      await Promise.all([
        ...toAdd.map(id => $fetch(`/api/projects/${projectMap[id]}/contractors`, { method: 'POST', body: { contractorId: editingId.value } })),
        ...toRemove.map(id => $fetch(`/api/projects/${projectMap[id]}/contractors/${editingId.value}`, { method: 'DELETE' })),
      ])
    } else {
      await $fetch('/api/contractors', { method: 'POST', body: { ...form } })
    }
    closeModal(); refresh()
  } catch (e: any) {
    const status = e.status || e.statusCode || e.data?.statusCode || ''
    const msg = e.data?.message || e.data?.statusMessage || e.message || 'неизвестная'
    formError.value = `Ошибка ${status}: ${msg}`
  } finally { saving.value = false }
}

async function del(id: number) {
  if (!confirm('Удалить подрядчика?')) return
  await $fetch(`/api/contractors/${id}`, { method: 'DELETE' })
  if (selectedId.value === id) selectedId.value = null
  refresh()
}


</script>

<style scoped>
.ct-page {
  width: 100%;
}
.ct-wipe-host { position: relative; }

.ct-page--brutalist {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ct-filter-info { margin-bottom: 14px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; font-size: .76rem; color: var(--glass-text); }
.ct-filter-info--brutalist { margin-bottom: 0; padding: 12px 14px; border-radius: 0; border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent); background: color-mix(in srgb, var(--glass-text) 2%, transparent); }
.ct-filter-link { text-decoration: none; color: var(--glass-text); opacity: .5; transition: opacity .15s; }
.ct-filter-link:hover { opacity: 1; }
.ct-nav-master { padding-left: 22px; }
.ct-av--company { background: color-mix(in srgb, var(--phase-amber, #a06e1e) 12%, transparent); color: var(--phase-amber, #a06e1e); }
html.dark .ct-av--company { background: color-mix(in srgb, #c8a03c 15%, transparent); color: #c8a03c; }
.ct-av--master { background: color-mix(in srgb, var(--phase-blue, #3b82f6) 12%, transparent); color: var(--phase-blue, #3b82f6); }
html.dark .ct-av--master { background: color-mix(in srgb, #82a5ff 15%, transparent); color: #82a5ff; }
.ct-badge { display: inline-block; font-size: .56rem; text-transform: uppercase; letter-spacing: .06em; font-weight: 600; padding: 2px 8px; border-radius: var(--chip-radius, 999px); margin-bottom: 4px; }
.ct-badge--company { background: color-mix(in srgb, var(--phase-amber, #a06e1e) 10%, transparent); color: var(--phase-amber, #a06e1e); }
html.dark .ct-badge--company { background: rgba(200,160,60,.15); color: #c8a03c; }
.ct-badge--master { background: color-mix(in srgb, var(--phase-blue, #3b82f6) 10%, transparent); color: var(--phase-blue, #3b82f6); }
html.dark .ct-badge--master { background: rgba(99,140,255,.15); color: #82a5ff; }
.ct-detail-sub { font-size: .78rem; color: var(--glass-text); opacity: .5; margin-top: 2px; }
.ct-nested-masters { display: flex; flex-direction: column; gap: 4px; }
.ct-nested-master { display: flex; align-items: center; gap: 6px; background: transparent; border: none; padding: 4px 8px; border-radius: 7px; font-family: inherit; font-size: .78rem; color: var(--glass-text); opacity: .6; cursor: pointer; transition: opacity .12s; }
.ct-nested-master:hover { opacity: 1; background: color-mix(in srgb, var(--glass-bg) 80%, transparent); }
.ct-btn-cabinet { display: inline-flex; align-items: center; gap: 5px; font-size: .74rem; font-family: inherit; color: var(--glass-page-bg); background: var(--glass-text); padding: 5px 10px; border-radius: 7px; border: none; cursor: pointer; opacity: .75; transition: opacity .15s; white-space: nowrap; }
.ct-btn-cabinet:hover { opacity: 1; }

/* ══ Modal ══ */
.ct-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
.ct-backdrop--brutalist { background: color-mix(in srgb, #000 58%, transparent); backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); }
.ct-modal { width: 620px; max-width: 100%; max-height: 90vh; border-radius: var(--modal-radius, 16px); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,.18); }
.ct-modal--brutalist { border-radius: 0; box-shadow: none; border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent); background: color-mix(in srgb, var(--glass-page-bg) 95%, #000 5%); }
.ct-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent); font-size: var(--ds-text-sm, .84rem); font-weight: 500; color: var(--glass-text); flex-shrink: 0; }
.ct-modal-close { background: none; border: none; cursor: pointer; font-size: 1rem; color: var(--glass-text); opacity: .45; padding: 2px 6px; }
.ct-modal-close:hover { opacity: 1; }
.ct-modal-body { overflow-y: auto; flex: 1; padding: 16px 20px; }
.ct-modal-foot { display: flex; gap: 10px; justify-content: flex-end; padding-top: 16px; margin-top: 12px; border-top: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent); }

.ct-form-section { font-size: .62rem; text-transform: uppercase; letter-spacing: .08em; color: var(--glass-text); opacity: .3; font-weight: 600; margin: 16px 0 8px; padding-bottom: 4px; }
.ct-form-section:first-child { margin-top: 0; }
.ct-form-hint { font-size: var(--ds-text-xs, .78rem); color: var(--glass-text); opacity: .4; margin-bottom: 8px; }
.ct-form-error { font-size: var(--ds-text-xs, .78rem); color: var(--ds-error, #dc2626); margin-bottom: 8px; }
.ct-form-error--bottom { margin-top: 8px; }

.ct-project-pool-title { font-size: .66rem; text-transform: uppercase; letter-spacing: .08em; opacity: .48; margin-bottom: 6px; }
.ct-projects-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
.ct-project-tag { display: inline-flex; align-items: center; border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--glass-text); border-radius: 999px; padding: 6px 12px; font-size: .78rem; font-weight: 600; cursor: pointer; transition: all .18s ease; }
.ct-project-tag:hover { opacity: .9; }
.ct-project-tag--active { background: color-mix(in srgb, var(--ds-accent, #6366f1) 14%, transparent); color: var(--ds-accent, #6366f1); border-color: color-mix(in srgb, var(--ds-accent, #6366f1) 40%, var(--glass-border)); }
.tag-shift-move, .tag-shift-enter-active, .tag-shift-leave-active { transition: all .22s ease; }
.tag-shift-enter-from, .tag-shift-leave-to { opacity: 0; transform: translateY(8px) scale(.97); }

.ct-modal-tabs { display: flex; gap: 0; border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent); padding: 0 20px; flex-shrink: 0; }
.ct-modal-tab { background: none; border: none; padding: 10px 14px 8px; font-size: .78rem; font-weight: 600; color: var(--glass-text); opacity: .4; cursor: pointer; border-bottom: 2px solid transparent; transition: all .12s; }
.ct-modal-tab:hover { opacity: .7; }
.ct-modal-tab.active { opacity: 1; border-bottom-color: var(--ds-accent, #6366f1); color: var(--ds-accent, #6366f1); }

.ct-tab-content { padding-top: 4px; }
.ct-ro-field { display: flex; flex-direction: column; gap: 3px; padding: 8px 0; }
.ct-ro-label { font-size: .6rem; text-transform: uppercase; letter-spacing: .05em; color: var(--glass-text); opacity: .4; font-weight: 600; }
.ct-ro-value { font-size: .85rem; color: var(--glass-text); font-weight: 500; }

.ct-docs-list { display: flex; flex-direction: column; gap: 6px; }
.ct-doc-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: color-mix(in srgb, var(--glass-text) 3%, transparent); }
.ct-doc-icon { font-size: 1.2rem; }
.ct-doc-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.ct-doc-name { font-size: .84rem; font-weight: 600; color: var(--glass-text); }
.ct-doc-meta { font-size: .72rem; opacity: .45; }
.ct-doc-download { font-size: .78rem; font-weight: 600; color: var(--ds-accent, #6366f1); text-decoration: none; }
.ct-doc-download:hover { text-decoration: underline; }
.ct-cert-chip { display: inline-block; padding: 2px 8px; border-radius: 6px; background: color-mix(in srgb, var(--ds-accent, #6366f1) 10%, transparent); color: var(--ds-accent, #6366f1); font-size: .75rem; font-weight: 500; margin-right: 4px; margin-bottom: 2px; }

@media (max-width: 640px) {
  .ct-nav-master { padding-left: 10px; }
}
</style>
