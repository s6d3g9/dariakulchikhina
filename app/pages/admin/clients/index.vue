<template>
  <div class="cl-page" :class="{ 'cl-page--brutalist': isBrutalistClientsMode }">
    <div v-if="projectSlugFilter" class="cl-filter-info glass-surface glass-card" :class="{ 'cl-filter-info--brutalist': isBrutalistClientsMode }">
      <span>Фильтр по проекту: <b>{{ projectSlugFilter }}</b></span>
      <NuxtLink :to="`/admin/projects/${projectSlugFilter}`" class="cl-filter-link">← к проекту</NuxtLink>
      <NuxtLink to="/admin/clients" class="cl-filter-link">показать всех</NuxtLink>
    </div>

    <!-- Content: selected client or empty state -->
    <template v-if="selectedClient">
          <section v-if="showBrutalistClientHero" class="cl-hero">
            <nav class="cl-hero-breadcrumbs">
              <NuxtLink to="/admin">админ</NuxtLink>
              <span>/</span>
              <span>клиенты</span>
              <span>/</span>
              <span>{{ selectedClient.name }}</span>
            </nav>
            <div class="cl-hero-body">
              <p class="cl-hero-kicker">{{ selectedClientSlug ? 'клиентский кабинет' : 'карточка клиента' }}</p>
              <h1 class="cl-hero-title">{{ selectedClient.name }}</h1>
              <div class="cl-hero-meta">
                <div v-for="fact in clientHeroFacts" :key="fact.label" class="cl-hero-meta-item">
                  <span class="cl-hero-meta-label">{{ fact.label }}</span>
                  <span class="cl-hero-meta-value">{{ fact.value }}</span>
                </div>
              </div>
              <div class="cl-hero-actions">
                <button class="cl-hero-action" @click="openEdit(selectedClient)">редактировать</button>
                <button class="cl-hero-action" @click="openLink(selectedClient)">{{ selectedClient.linkedProjects?.length ? 'сменить проект' : 'привязать к проекту' }}</button>
                <button class="cl-hero-action" @click="clientPage = 'documents'">документы</button>
                <a v-if="selectedClient.linkedProjects?.length" :href="`/client/${selectedClient.linkedProjects[0].slug}`" class="cl-hero-action">кабинет ↗</a>
              </div>
            </div>
          </section>

          <!-- Minimal context strip -->
          <div v-if="!showBrutalistClientHero" class="ent-entity-hd">
            <span class="ent-entity-hd-name">{{ selectedClient.name }}</span>
            <div class="ent-entity-hd-actions">
              <button class="ent-entity-hd-action" @click="openEdit(selectedClient)">ред.</button>
              <button class="ent-entity-hd-action" @click="openLink(selectedClient)">{{ selectedClient.linkedProjects?.length ? 'проект' : 'привязать' }}</button>
              <button class="ent-entity-hd-action" @click="clientPage = 'documents'">документы</button>
              <a v-if="selectedClient.linkedProjects?.length" :href="`/client/${selectedClient.linkedProjects[0].slug}`" class="ent-entity-hd-action">↗</a>
            </div>
          </div>

          <section class="cl-main-shell" :class="{ 'cl-main-shell--brutalist': isBrutalistClientsMode }">
            <div v-if="currentClientPage === 'dashboard'" class="cl-section-grid">
              <div class="ent-detail-card glass-card cl-detail-card" :class="{ 'cl-detail-card--brutalist': isBrutalistClientsMode }">
                <div class="ent-detail-section">клиент</div>
                <div class="ent-detail-row">{{ selectedClient.name }}</div>
                <div v-if="selectedClient.phone" class="ent-detail-row">{{ selectedClient.phone }}</div>
                <div v-if="selectedClient.email" class="ent-detail-row">{{ selectedClient.email }}</div>
                <div v-if="selectedClient.address" class="ent-detail-row">{{ selectedClient.address }}</div>
                <p v-if="selectedClient.notes" class="ent-detail-notes">{{ selectedClient.notes }}</p>
              </div>
              <div class="ent-detail-card glass-card cl-detail-card" :class="{ 'cl-detail-card--brutalist': isBrutalistClientsMode }">
                <div class="ent-detail-section">проект</div>
                <template v-if="selectedClientSlug && clientProject">
                  <div class="ent-detail-row">{{ clientProject.title }}</div>
                  <div class="ent-detail-row" style="opacity:.62">{{ selectedClientSlug }}</div>
                  <div class="ent-detail-foot" style="margin-top:16px">
                    <NuxtLink :to="`/admin/projects/${selectedClientSlug}`" class="a-btn-sm">открыть проект</NuxtLink>
                  </div>
                </template>
                <template v-else>
                  <div class="ent-detail-row" style="opacity:.48">проект не привязан</div>
                  <div class="ent-detail-foot" style="margin-top:16px">
                    <button class="a-btn-sm" @click="openLink(selectedClient)">привязать к проекту</button>
                  </div>
                </template>
              </div>
            </div>

            <div v-else-if="currentClientPage === 'profile'" class="ent-detail-card glass-card cl-detail-card" :class="{ 'cl-detail-card--brutalist': isBrutalistClientsMode }">
              <div class="ent-detail-section">профиль клиента</div>
              <div class="ent-detail-row">имя: {{ selectedClient.name }}</div>
              <div v-if="selectedClient.phone" class="ent-detail-row">телефон: {{ selectedClient.phone }}</div>
              <div v-if="selectedClient.email" class="ent-detail-row">email: {{ selectedClient.email }}</div>
              <div v-if="selectedClient.messengerNick" class="ent-detail-row">мессенджер: {{ selectedClient.messenger ? selectedClient.messenger + ' ' : '' }}{{ selectedClient.messengerNick }}</div>
              <div v-if="selectedClient.address" class="ent-detail-row">адрес: {{ selectedClient.address }}</div>
              <p v-if="selectedClient.notes" class="ent-detail-notes">{{ selectedClient.notes }}</p>
            </div>

            <div v-else-if="currentClientPage === 'signoff'" class="ent-detail-card glass-card cl-detail-card" :class="{ 'cl-detail-card--brutalist': isBrutalistClientsMode }">
              <div class="ent-detail-section">подписание и согласование</div>
              <template v-if="selectedClientSlug && clientProject">
                <div class="ent-detail-row">проект: {{ clientProject.title }}</div>
                <div class="ent-detail-row" style="opacity:.62">клиент может согласовывать документы через кабинет проекта</div>
                <div class="ent-detail-foot" style="margin-top:16px">
                  <NuxtLink :to="`/admin/projects/${selectedClientSlug}`" class="a-btn-sm">открыть проект</NuxtLink>
                </div>
              </template>
              <div v-else class="ent-detail-row" style="opacity:.48">для этого раздела сначала нужен привязанный проект</div>
            </div>

            <div v-else-if="currentClientPage === 'projects'" class="ent-detail-card glass-card cl-detail-card" :class="{ 'cl-detail-card--brutalist': isBrutalistClientsMode }">
              <div class="ent-detail-section">проекты клиента</div>
              <div v-if="selectedClient.linkedProjects?.length" class="cl-linked-projects">
                <NuxtLink
                  v-for="projectItem in selectedClient.linkedProjects"
                  :key="projectItem.slug"
                  :to="`/admin/projects/${projectItem.slug}`"
                  class="cl-linked-project-card"
                >
                  <span>{{ projectItem.title || projectItem.slug }}</span>
                  <span>{{ projectItem.slug }}</span>
                </NuxtLink>
              </div>
              <div v-else class="ent-detail-row" style="opacity:.48">у клиента пока нет привязанных проектов</div>
            </div>

            <div v-else-if="currentClientPage === 'documents'" class="ent-detail-card glass-card cl-detail-card" :class="{ 'cl-detail-card--brutalist': isBrutalistClientsMode }">
              <div class="ent-detail-section">документы клиента</div>
              <div class="cl-row"><div class="cl-field"><label>Поиск</label><input v-model="docsSearch" class="glass-input" placeholder="Название" /></div><div class="cl-field"><label>Категория</label><select v-model="docsFilter" class="glass-input"><option value="">Все</option><option v-for="dc in DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option></select></div></div>
              <div class="cl-row"><div class="cl-field"><label>Название</label><input v-model="docsTitle" class="glass-input" placeholder="Название документа" /></div><div class="cl-field"><label>Категория</label><select v-model="docsCategory" class="glass-input"><option v-for="dc in DOC_CATEGORIES" :key="`inline-${dc.value}`" :value="dc.value">{{ dc.label }}</option></select></div></div>
              <div class="cl-field"><label>Примечание</label><input v-model="docsNotes" class="glass-input" placeholder="Необязательно" /></div>
              <div style="margin-bottom:14px"><label class="a-btn-save" style="display:inline-flex;align-items:center;cursor:pointer"><input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" multiple style="display:none" @change="uploadClientDoc" />{{ docsUploading ? 'загрузка…' : '＋ выбрать файл' }}</label></div>
              <div v-if="filteredClientDocs.length" class="cl-docs-list">
                <div v-for="doc in filteredClientDocs" :key="doc.id" class="cl-doc-item glass-surface">
                  <div><div class="cl-doc-title">{{ doc.title }}</div><div class="cl-doc-meta">{{ DOC_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category }}<span v-if="doc.notes"> · {{ doc.notes }}</span><span v-if="doc.createdAt"> · {{ formatDocDate(doc.createdAt) }}</span></div></div>
                  <div class="cl-doc-actions"><a v-if="doc.url" :href="doc.url" target="_blank" class="ent-detail-chip">скачать</a><button class="a-btn-sm a-btn-danger" @click="deleteClientDoc(doc.id)">✕</button></div>
                </div>
              </div>
              <div v-else class="ent-detail-row" style="opacity:.48">документов пока нет</div>
            </div>
          </section>
        </template>

        <!-- Nothing selected -->
        <div v-else class="ent-empty-detail cl-empty-detail" :class="{ 'cl-empty-detail--brutalist': isBrutalistClientsMode }">
          <span class="ent-empty-icon">👤</span>
          <span v-if="clients?.length">Выберите клиента из списка</span>
          <span v-else>Нет клиентов — добавьте первого</span>
          <button class="a-btn-sm" style="margin-top:6px" @click="openAdd">+ добавить</button>
        </div>

    <Teleport to="body">
    <div v-if="showModal" class="cl-backdrop" :class="{ 'cl-backdrop--brutalist': isBrutalistClientsMode }" @click.self="closeModal">
      <div class="cl-modal glass-surface glass-card" :class="{ 'cl-modal--brutalist': isBrutalistClientsMode }">
        <div class="cl-modal-head"><span>{{ editingId ? 'редактировать клиента' : 'новый клиент' }}</span><button class="cl-close" @click="closeModal">✕</button></div>
        <form class="cl-form" @submit.prevent="save">
          <div class="cl-field"><label>Имя / Название *</label><input v-model="form.name" class="glass-input" required placeholder="Иванова Анна Сергеевна" autofocus></div>
          <div class="cl-row"><div class="cl-field"><label>Телефон</label><input v-model="form.phone" class="glass-input" placeholder="+7 999 000 00 00"></div><div class="cl-field"><label>Email</label><input v-model="form.email" class="glass-input" type="email" placeholder="client@mail.ru"></div></div>
          <div class="cl-row"><div class="cl-field"><label>Мессенджер</label><select v-model="form.messenger" class="glass-input"><option value="">— не указан</option><option value="Telegram">Telegram</option><option value="WhatsApp">WhatsApp</option><option value="Viber">Viber</option></select></div><div class="cl-field"><label>Ник / номер</label><input v-model="form.messengerNick" class="glass-input" placeholder="@username"></div></div>
          <div class="cl-field"><label>Адрес</label><AppAddressInput v-model="form.address" input-class="glass-input" placeholder="г. Москва, ул. ..." /></div>
          <div class="cl-field"><label>Заметки</label><textarea v-model="form.notes" class="glass-input u-ta" rows="3" placeholder="Любые пометки"></textarea></div>
          <p v-if="saveError" class="cl-error">{{ saveError }}</p>
          <div class="cl-modal-foot"><button type="button" class="a-btn-sm" @click="closeModal">отмена</button><button type="submit" class="a-btn-save" :disabled="saving">{{ saving ? '...' : (editingId ? 'сохранить' : 'добавить') }}</button></div>
        </form>
      </div>
    </div>
    </Teleport>

    <!-- ══ Link-to-project modal ══ -->
    <Teleport to="body">
    <div v-if="showLink" class="cl-backdrop" :class="{ 'cl-backdrop--brutalist': isBrutalistClientsMode }" @click.self="showLink = false">
      <div class="cl-modal glass-surface glass-card" :class="{ 'cl-modal--brutalist': isBrutalistClientsMode }">
        <div class="cl-modal-head"><span>привязать «{{ linkClient?.name }}» к проекту</span><button class="cl-close" @click="showLink = false">✕</button></div>
        <div class="cl-form">
          <div class="cl-field"><label>Выберите проект</label><select v-model="linkProjectSlug" class="glass-input"><option value="">— выберите проект —</option><option v-for="p in allProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option></select></div>
          <div v-if="linkProjectSlug" class="cl-link-preview glass-surface"><p class="cl-link-preview-title">Будет заполнено в профиле проекта:</p><ul class="cl-link-list"><li><b>Имя клиента</b> → {{ linkClient?.name }}</li><li v-if="linkClient?.phone"><b>Телефон</b> → {{ linkClient?.phone }}</li><li v-if="linkClient?.email"><b>Email</b> → {{ linkClient?.email }}</li></ul></div>
          <p v-if="linkError" class="cl-error">{{ linkError }}</p>
          <div class="cl-modal-foot"><button type="button" class="a-btn-sm" @click="showLink = false">отмена</button><button class="a-btn-save" :disabled="!linkProjectSlug || linking" @click="doLink">{{ linking ? '...' : 'привязать' }}</button></div>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- ══ Documents modal ══ -->
    <Teleport to="body">
    <div v-if="showDocs" class="cl-backdrop" :class="{ 'cl-backdrop--brutalist': isBrutalistClientsMode }" @click.self="closeDocs">
      <div class="cl-modal glass-surface glass-card" :class="{ 'cl-modal--brutalist': isBrutalistClientsMode }" style="max-width:600px">
        <div class="cl-modal-head"><span>документы «{{ docsClient?.name }}»</span><button class="cl-close" @click="closeDocs">✕</button></div>
        <div class="cl-form">
          <div class="cl-row"><div class="cl-field"><label>Поиск</label><input v-model="docsSearch" class="glass-input" placeholder="Название" /></div><div class="cl-field"><label>Категория</label><select v-model="docsFilter" class="glass-input"><option value="">Все</option><option v-for="dc in DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option></select></div></div>
          <div class="cl-row"><div class="cl-field"><label>Название</label><input v-model="docsTitle" class="glass-input" placeholder="Название документа" /></div><div class="cl-field"><label>Категория</label><select v-model="docsCategory" class="glass-input"><option v-for="dc in DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option></select></div></div>
          <div class="cl-field"><label>Примечание</label><input v-model="docsNotes" class="glass-input" placeholder="Необязательно" /></div>
          <div style="margin-bottom:14px"><label class="a-btn-save" style="display:inline-flex;align-items:center;cursor:pointer"><input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" multiple style="display:none" @change="uploadClientDoc" />{{ docsUploading ? 'загрузка…' : '＋ выбрать файл' }}</label></div>
          <div v-if="filteredClientDocs.length" class="cl-docs-list">
            <div v-for="doc in filteredClientDocs" :key="doc.id" class="cl-doc-item glass-surface">
              <div><div class="cl-doc-title">{{ doc.title }}</div><div class="cl-doc-meta">{{ DOC_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category }}<span v-if="doc.notes"> · {{ doc.notes }}</span><span v-if="doc.createdAt"> · {{ formatDocDate(doc.createdAt) }}</span></div></div>
              <div class="cl-doc-actions"><a v-if="doc.url" :href="doc.url" target="_blank" class="ent-detail-chip">скачать</a><button class="a-btn-sm a-btn-danger" @click="deleteClientDoc(doc.id)">✕</button></div>
            </div>
          </div>
          <div v-else class="ent-empty-detail" style="padding:20px">{{ clientDocs?.length ? 'Ничего не найдено' : 'Документов пока нет' }}</div>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { getClientPages } from '~~/shared/constants/pages'
import ClientInitiation      from '~/components/ClientInitiation.vue'
import ClientSelfProfile     from '~/components/ClientSelfProfile.vue'
import ClientContactDetails  from '~/components/ClientContactDetails.vue'
import ClientPassport        from '~/components/ClientPassport.vue'
import ClientBrief           from '~/components/ClientBrief.vue'
import ClientTZ              from '~/components/ClientTZ.vue'
import ClientContracts       from '~/components/ClientContracts.vue'
import ClientWorkProgress    from '~/components/ClientWorkProgress.vue'
import ClientTimeline        from '~/components/ClientTimeline.vue'
import ClientDesignAlbum     from '~/components/ClientDesignAlbum.vue'
import ClientPageContent     from '~/components/ClientPageContent.vue'
import ClientOverview        from '~/components/ClientOverview.vue'

definePageMeta({ layout: 'admin', middleware: 'admin', pageTransition: false })

const adminNav = useAdminNav()
onMounted(() => adminNav.ensureSection('clients'))
onActivated(() => adminNav.ensureSection('clients'))

// Sync selected client from global nav contentSpec
watch(() => adminNav.contentSpec.value.clientId, (id) => {
  if (id) selectedClientId.value = id
}, { immediate: true })

watch(() => adminNav.contentSpec.value.clientSection, (section) => {
  if (section) clientPage.value = section
}, { immediate: true })

const route = useRoute()
const designSystem = useDesignSystem()
const isBrutalistClientsMode = computed(() => designSystem.currentDesignMode.value === 'brutalist')
const projectSlugFilter = computed(() => typeof route.query.projectSlug === 'string' ? route.query.projectSlug : '')
const clientsCacheByProject = useState<Record<string, any[]>>('cache-admin-clients-by-project', () => ({}))
const clientsCacheKey = computed(() => projectSlugFilter.value || '__all__')
const hasClientsCache = computed(() => (clientsCacheByProject.value[clientsCacheKey.value] || []).length > 0)

const { data: clients, pending, refresh } = await useFetch<any[]>(
  () => projectSlugFilter.value ? `/api/clients?projectSlug=${encodeURIComponent(projectSlugFilter.value)}` : '/api/clients',
  { server: false, default: () => clientsCacheByProject.value[clientsCacheKey.value] || [] },
)
watch(clients, (v) => { if (Array.isArray(v)) clientsCacheByProject.value = { ...clientsCacheByProject.value, [clientsCacheKey.value]: v } }, { deep: true })

const { data: allProjects } = await useFetch<any[]>('/api/projects')
const DOC_CATEGORIES = [{ value: 'passport', label: 'Паспорт' },{ value: 'contract', label: 'Договор' },{ value: 'invoice', label: 'Счёт' },{ value: 'act', label: 'Акт' },{ value: 'other', label: 'Другое' }]

// ── Search & selection ─────────────────────────────────
const selectedClientId = ref<number | null>(null)
const selectedClient = computed(() => clients.value?.find((c: any) => c.id === selectedClientId.value) || null)
const selectedClientSlug = computed(() => selectedClient.value?.linkedProjects?.[0]?.slug || null)
function selectClient(c: any) { selectedClientId.value = c.id; clientPage.value = 'dashboard' }

// Авто-выбор клиента по query ?clientId=
const router = useRouter()
const clientIdFromQuery = computed(() => {
  const v = route.query.clientId
  return typeof v === 'string' ? parseInt(v, 10) : null
})
function applyClientIdQuery() {
  const qid = clientIdFromQuery.value
  if (qid && clients.value?.length) {
    const found = clients.value.find((c: any) => c.id === qid)
    if (found) { selectedClientId.value = found.id; clientPage.value = 'dashboard' }
    router.replace({ query: { ...route.query, clientId: undefined } })
  }
}
watch(clients, () => applyClientIdQuery(), { immediate: true })
watch(clientIdFromQuery, () => applyClientIdQuery())

// ── Embedded client cabinet ────────────────────────────
const { data: clientProject } = useFetch<any>(
  () => selectedClientSlug.value ? `/api/projects/${selectedClientSlug.value}` : null,
  { watch: [selectedClientSlug], default: () => null }
)
const PAGE_COMPONENT_MAP: Record<string, Component> = {
  phase_init:      ClientInitiation,
  self_profile:    ClientSelfProfile,
  brief:           ClientSelfProfile,
  client_contacts: ClientContactDetails,
  client_passport: ClientPassport,
  client_brief:    ClientBrief,
  client_tz:       ClientTZ,
  contracts:       ClientContracts,
  work_progress:   ClientWorkProgress,
  design_timeline: ClientTimeline,
  design_album:    ClientDesignAlbum,
}
const allClientPages = getClientPages()
const clientPage = ref('dashboard')
const resolvedClientPageFromNav = computed(() => {
  const spec = adminNav.contentSpec.value
  const nodeId = adminNav.currentNode.value.nodeId

  if (spec.clientSection) return spec.clientSection
  if (spec.documentCategory || nodeId.startsWith('reg_docs_')) return 'documents'
  if (nodeId.startsWith('reg_projects_')) return 'projects'
  return null
})
const currentClientPage = computed(() => resolvedClientPageFromNav.value || clientPage.value)
const clientNavPages = computed(() => {
  const pages = clientProject.value?.pages || []
  return allClientPages.filter(p => {
    if (!p.phase) return true
    if (p.slug === 'self_profile' && pages.includes('brief')) return true
    return pages.includes(p.slug)
  })
})
const showBrutalistClientHero = computed(() => isBrutalistClientsMode.value && !!selectedClient.value)
const clientHeroFacts = computed(() => [
  { label: 'проект', value: clientProject.value?.title || 'не привязан' },
  { label: 'контакт', value: selectedClient.value?.phone || selectedClient.value?.email || 'не указан' },
  { label: 'разделы', value: selectedClientSlug.value ? String(clientNavPages.value.length + 1) : '0' },
])
watch(selectedClientId, () => { clientPage.value = 'dashboard' })
const clientNormalizedPage = computed(() =>
  currentClientPage.value === 'brief' ? 'self_profile' : currentClientPage.value
)
const clientActiveComponent = computed<Component>(() =>
  PAGE_COMPONENT_MAP[clientNormalizedPage.value] || ClientPageContent
)
const clientActiveProps = computed(() => {
  const base = { slug: selectedClientSlug.value || '' }
  if (clientActiveComponent.value === ClientPageContent) return { ...base, page: clientNormalizedPage.value }
  return base
})

// ── CRUD ───────────────────────────────────────────────
const showModal = ref(false); const editingId = ref<number | null>(null); const saving = ref(false); const saveError = ref('')
const defaultForm = () => ({ name: '', phone: '', email: '', messenger: '', messengerNick: '', address: '', notes: '' })
const form = ref(defaultForm())
function openAdd() { editingId.value = null; form.value = defaultForm(); saveError.value = ''; showModal.value = true }
function openEdit(c: any) { editingId.value = c.id; form.value = { name: c.name ?? '', phone: c.phone ?? '', email: c.email ?? '', messenger: c.messenger ?? '', messengerNick: c.messengerNick ?? '', address: c.address ?? '', notes: c.notes ?? '' }; saveError.value = ''; showModal.value = true }
function closeModal() { showModal.value = false }
async function save() {
  saving.value = true; saveError.value = ''
  try { if (editingId.value) await $fetch(`/api/clients/${editingId.value}`, { method: 'PUT', body: form.value }); else await $fetch('/api/clients', { method: 'POST', body: form.value }); await refresh(); closeModal() }
  catch (e: any) { saveError.value = e?.data?.statusMessage || 'Ошибка' } finally { saving.value = false }
}
async function del(id: number) { if (!confirm('Удалить клиента?')) return; await $fetch(`/api/clients/${id}`, { method: 'DELETE' }); if (selectedClientId.value === id) selectedClientId.value = null; await refresh() }

// ── Link ───────────────────────────────────────────────
const showLink = ref(false); const linkClient = ref<any>(null); const linkProjectSlug = ref(''); const linking = ref(false); const linkError = ref('')
function openLink(c: any) { linkClient.value = c; linkProjectSlug.value = ''; linkError.value = ''; showLink.value = true }
async function doLink() { if (!linkProjectSlug.value || !linkClient.value) return; linking.value = true; linkError.value = ''; try { await $fetch(`/api/clients/${linkClient.value.id}/link-project`, { method: 'POST', body: { projectSlug: linkProjectSlug.value } }); await refresh(); showLink.value = false } catch (e: any) { linkError.value = e?.data?.statusMessage || 'Ошибка' } finally { linking.value = false } }

// ── Docs ───────────────────────────────────────────────
const showDocs = ref(false); const docsClient = ref<any>(null); const docsClientId = ref<number | null>(null)
const docsTitle = ref(''); const docsCategory = ref('other'); const docsNotes = ref(''); const docsUploading = ref(false)
const docsSearch = ref(''); const docsFilter = ref(''); const docsSort = ref<'new'|'old'>('new')
const { data: clientDocs, refresh: refreshClientDocs } = await useFetch<any[]>(() => docsClientId.value ? `/api/clients/${docsClientId.value}/documents` : null, { default: () => [] })
watch(selectedClientId, (id) => { docsClientId.value = id; docsClient.value = selectedClient.value }, { immediate: true })
watch(() => adminNav.contentSpec.value.documentCategory, (category) => {
  if (!category) return
  docsFilter.value = category === 'all' ? '' : category
}, { immediate: true })
const filteredClientDocs = computed(() => { const rows = clientDocs.value || []; const q = docsSearch.value.trim().toLowerCase(); return rows.filter((d: any) => { if (docsFilter.value && d.category !== docsFilter.value) return false; if (!q) return true; return `${d.title||''} ${d.notes||''} ${d.category||''}`.toLowerCase().includes(q) }).sort((a: any, b: any) => { const at = new Date(a.createdAt||0).getTime(); const bt = new Date(b.createdAt||0).getTime(); return docsSort.value === 'new' ? bt - at : at - bt }) })
function formatDocDate(v: string) { const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ru-RU') }
function openDocs(c: any) { docsClient.value = c; docsClientId.value = c.id; docsTitle.value = ''; docsCategory.value = 'other'; docsNotes.value = ''; docsSearch.value = ''; docsFilter.value = ''; docsSort.value = 'new'; showDocs.value = true; refreshClientDocs() }
function closeDocs() { showDocs.value = false }
async function uploadClientDoc(ev: Event) { const input = ev.target as HTMLInputElement; const files = input.files; if (!files?.length || !docsClientId.value) return; docsUploading.value = true; try { for (const f of Array.from(files)) { const fd = new FormData(); fd.append('file', f); fd.append('title', docsTitle.value || f.name); fd.append('category', docsCategory.value); fd.append('notes', docsNotes.value); await $fetch(`/api/clients/${docsClientId.value}/documents`, { method: 'POST', body: fd }) }; await refreshClientDocs(); docsTitle.value = ''; docsNotes.value = ''; input.value = '' } finally { docsUploading.value = false } }
async function deleteClientDoc(docId: number) { if (!docsClientId.value) return; if (!confirm('Удалить документ?')) return; await $fetch(`/api/clients/${docsClientId.value}/documents/${docId}`, { method: 'DELETE' }); await refreshClientDocs() }
</script>

<style scoped>
.cl-page {
  width: 100%;
}

.cl-page--brutalist {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.cl-filter-info { margin-bottom: 14px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; font-size: .76rem; color: var(--glass-text); }
.cl-filter-info--brutalist {
  margin-bottom: 0;
  padding: 12px 14px;
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}
.cl-filter-link { text-decoration: none; color: var(--glass-text); opacity: .72; }
.cl-filter-link:hover { opacity: 1; }
.cl-nav-arrow { margin-left: auto; font-size: .7rem; opacity: .4; flex-shrink: 0; }

.cl-hero {
  position: relative;
  min-height: min(72vh, 720px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.cl-hero-breadcrumbs {
  position: absolute;
  top: 18px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: .62rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.cl-hero-breadcrumbs a {
  color: inherit;
  text-decoration: none;
}

.cl-hero-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: min(100%, 980px);
}

.cl-hero-kicker {
  margin: 0;
  font-size: .68rem;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.cl-hero-title {
  margin: 0;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: .1em;
  line-height: .94;
  font-size: clamp(2.4rem, 8vw, 6.5rem);
}

.cl-hero-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}

.cl-hero-meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}

.cl-hero-meta-label {
  font-size: .6rem;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 44%, transparent);
}

.cl-hero-meta-value {
  font-size: .9rem;
  line-height: 1.15;
  text-transform: uppercase;
  letter-spacing: .07em;
}

.cl-hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.cl-hero-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: transparent;
  color: var(--glass-text);
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: .12em;
  font-size: .68rem;
  cursor: pointer;
}

.cl-cab-body--brutalist {
  gap: 0;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.cl-cab-sidebar--brutalist {
  border-radius: 0;
  border: 0;
  border-right: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.cl-cab-main--brutalist {
  min-width: 0;
}

.cl-cab-inner--brutalist {
  padding-top: 22px;
  padding-bottom: 40px;
}

.cl-detail-card--brutalist {
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.cl-empty-detail--brutalist {
  min-height: 56vh;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 0;
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

/* ── Modals ── */
.cl-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,.35); -webkit-backdrop-filter: blur(5px); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; padding: 16px; }
.cl-backdrop--brutalist { background: color-mix(in srgb, #000 58%, transparent); -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
.cl-modal { width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; padding: 24px 26px 28px; }
.cl-modal--brutalist { border-radius: 0; box-shadow: none; border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent); background: color-mix(in srgb, var(--glass-page-bg) 95%, #000 5%); }
.cl-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
.cl-modal-head span { font-size: .72rem; text-transform: uppercase; letter-spacing: 1.2px; color: var(--glass-text); opacity: .5; }
.cl-close { width: 28px; height: 28px; border-radius: 7px; border: none; background: rgba(0,0,0,.08); color: var(--glass-text); cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; }
.cl-close:hover { background: rgba(0,0,0,.16); }
.cl-form { display: flex; flex-direction: column; gap: 14px; }
.cl-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cl-field { display: flex; flex-direction: column; gap: 5px; }
.cl-field label { font-size: .7rem; text-transform: uppercase; letter-spacing: .5px; color: var(--glass-text); opacity: .45; }
/* Input styles unified → glass-input */
.cl-error { font-size: .78rem; color: var(--ds-error, #dc2626); margin: 0; padding: 7px 12px; background: color-mix(in srgb, var(--ds-error, #dc2626) 8%, transparent); border-radius: 6px; }
.cl-link-preview { padding: 12px 14px; border-radius: 10px; font-size: .8rem; }
.cl-link-preview-title { font-size: .68rem; text-transform: uppercase; letter-spacing: .5px; opacity: .45; margin: 0 0 8px; }
.cl-link-list { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 4px; color: var(--glass-text); opacity: .7; }
.cl-link-list b { opacity: 1; font-weight: 500; }
.cl-modal-foot { display: flex; gap: 8px; justify-content: flex-end; padding-top: 4px; }
.cl-docs-list { display: flex; flex-direction: column; gap: 8px; }
.cl-doc-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; border: 1px solid var(--glass-border); border-radius: 8px; }
.cl-doc-title { font-size: .84rem; font-weight: 500; }
.cl-doc-meta { font-size: .72rem; opacity: .5; }
.cl-doc-actions { display: flex; align-items: center; gap: 8px; }

@media (max-width: 900px) {
  .cl-hero-meta {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .cl-row { grid-template-columns: 1fr; }
  .cl-hero {
    min-height: auto;
    padding: 26px 14px;
  }
  .cl-hero-breadcrumbs {
    position: static;
    align-self: flex-start;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .cl-hero-title {
    font-size: clamp(2rem, 11vw, 4rem);
  }
}
</style>
