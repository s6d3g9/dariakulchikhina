<template>
  <div>
    <div v-if="projectSlugFilter" class="cl-filter-info glass-surface glass-card">
      <span>Фильтр по проекту: <b>{{ projectSlugFilter }}</b></span>
      <NuxtLink :to="`/admin/projects/${projectSlugFilter}`" class="cl-filter-link">← к проекту</NuxtLink>
      <NuxtLink to="/admin/clients" class="cl-filter-link">показать всех</NuxtLink>
    </div>

    <!-- ═══ Cabinet view (selected client) ═══ -->
    <div v-if="selectedClient" class="ent-cabinet-wrap">
      <div class="ent-cabinet-topbar">
        <button class="ent-back-btn a-btn-sm" @click="selectedClientId = null">← к списку</button>
        <span class="ent-cabinet-title">{{ selectedClient.name }}</span>
        <div class="ent-cabinet-actions">
          <button class="a-btn-sm" @click="openEdit(selectedClient)">✎ редактировать</button>
          <button class="a-btn-sm" @click="openLink(selectedClient)">⊕ {{ selectedClient.linkedProjects?.length ? 'проект' : 'привязать' }}</button>
          <button class="a-btn-sm" @click="openDocs(selectedClient)">📄 документы</button>
          <a v-if="selectedClient.linkedProjects?.length" :href="`/client/${selectedClient.linkedProjects[0].slug}`" target="_blank" class="a-btn-sm">↗ открыть внешне</a>
          <button class="a-btn-sm a-btn-danger" @click="del(selectedClient.id)">× удалить</button>
        </div>
      </div>

      <!-- Client has a linked project → show full cabinet inline -->
      <template v-if="selectedClientSlug">
        <div class="cab-body">
          <aside class="cab-sidebar glass-surface std-sidenav">
            <nav class="cab-nav std-nav">
              <button
                class="cab-nav-item std-nav-item"
                :class="{ active: clientPage === 'dashboard', 'std-nav-item--active': clientPage === 'dashboard' }"
                @click="clientPage = 'dashboard'"
              ><span class="cab-nav-icon">◈</span> обзор</button>
              <button
                v-for="pg in clientNavPages"
                :key="pg.slug"
                class="cab-nav-item std-nav-item"
                :class="{ active: clientPage === pg.slug, 'std-nav-item--active': clientPage === pg.slug }"
                @click="clientPage = pg.slug"
              ><span class="cab-nav-icon">{{ pg.icon }}</span> {{ pg.title }}</button>
            </nav>
          </aside>
          <main class="cab-main">
            <div class="cab-inner">
              <ClientOverview
                v-if="clientPage === 'dashboard'"
                :slug="selectedClientSlug"
                :project="clientProject"
                :contractors="[]"
                :rm-map="{}"
                @navigate="clientPage = $event"
              />
              <component
                v-else
                :is="clientActiveComponent"
                v-bind="clientActiveProps"
                :key="clientPage"
              />
            </div>
          </main>
        </div>
      </template>

      <!-- No project linked → show contact card -->
      <template v-else>
        <div class="ent-detail-card glass-card" style="border-radius: var(--card-radius,14px); margin: 16px">
          <div class="ent-detail-section">контакты</div>
          <div v-if="selectedClient.phone" class="ent-detail-row">☎ {{ selectedClient.phone }}</div>
          <div v-if="selectedClient.email" class="ent-detail-row">✉ {{ selectedClient.email }}</div>
          <div v-if="selectedClient.messengerNick" class="ent-detail-row">💬 {{ selectedClient.messenger ? selectedClient.messenger + ' ' : '' }}{{ selectedClient.messengerNick }}</div>
          <div v-if="selectedClient.address" class="ent-detail-row">📍 {{ selectedClient.address }}</div>
          <div v-if="!selectedClient.phone && !selectedClient.email && !selectedClient.messengerNick && !selectedClient.address" class="ent-detail-row" style="opacity:.3">контакты не указаны</div>
          <p v-if="selectedClient.notes" class="ent-detail-notes">{{ selectedClient.notes }}</p>
          <div class="ent-detail-foot" style="margin-top:16px">
            <button class="a-btn-save" @click="openLink(selectedClient)">⊕ привязать к проекту</button>
          </div>
        </div>
      </template>
    </div>

    <!-- ═══ Board view ═══ -->
    <div v-else class="cl-root">
      <div class="cl-topbar">
        <div class="cl-topbar-left">
          <span class="cl-title">клиенты</span>
          <span class="cl-total">{{ clients?.length ?? 0 }}</span>
        </div>
        <div class="cl-topbar-right">
          <input v-model="searchQuery" class="glass-input cl-search" placeholder="поиск..." />
          <button class="a-btn-sm" @click="openAdd">+ добавить</button>
          <button class="a-btn-sm" @click="refresh()">↺</button>
        </div>
      </div>

      <div class="cl-board">
        <!-- Col 1: With project -->
        <div class="cl-col">
          <div class="cl-col-head" style="border-top-color: #3b82f6;">
            <span class="cl-col-title">С проектом</span>
            <span class="cl-col-count">{{ clientsWithProject.length }}</span>
          </div>
          <div class="cl-col-body">
            <div v-if="pending && !hasClientsCache" v-for="i in 3" :key="i" class="cl-skel" />
            <div v-else-if="clientsWithProject.length === 0" class="cl-col-empty">—</div>
            <div v-for="c in clientsWithProject" :key="c.id" class="cl-card glass-card" @click="selectClient(c)">
              <div class="cl-card-who">
                <div class="cl-avatar">{{ c.name?.charAt(0)?.toUpperCase() || '?' }}</div>
                <div class="cl-card-meta">
                  <div class="cl-card-name">{{ c.name }}</div>
                  <div v-if="c.phone || c.email" class="cl-card-sub">{{ c.phone || c.email }}</div>
                </div>
              </div>
              <div v-if="c.linkedProjects?.length" class="cl-card-proj">
                <span v-for="p in c.linkedProjects" :key="p.slug" class="cl-proj-chip">{{ p.title }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Col 2: Without project -->
        <div class="cl-col">
          <div class="cl-col-head" style="border-top-color: #94a3b8;">
            <span class="cl-col-title">Без проекта</span>
            <span class="cl-col-count">{{ clientsWithoutProject.length }}</span>
          </div>
          <div class="cl-col-body">
            <div v-if="pending && !hasClientsCache" v-for="i in 2" :key="i" class="cl-skel" />
            <div v-else-if="clientsWithoutProject.length === 0" class="cl-col-empty">—</div>
            <div v-for="c in clientsWithoutProject" :key="c.id" class="cl-card glass-card" @click="selectClient(c)">
              <div class="cl-card-who">
                <div class="cl-avatar cl-avatar--new">{{ c.name?.charAt(0)?.toUpperCase() || '?' }}</div>
                <div class="cl-card-meta">
                  <div class="cl-card-name">{{ c.name }}</div>
                  <div v-if="c.phone || c.email" class="cl-card-sub">{{ c.phone || c.email }}</div>
                </div>
              </div>
              <div class="cl-card-foot">
                <button class="cl-link-btn" @click.stop="openLink(c)">⊕ привязать к проекту</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ Add/Edit modal ══ -->
    <Teleport to="body">
    <div v-if="showModal" class="cl-backdrop" @click.self="closeModal">
      <div class="cl-modal glass-surface glass-card">
        <div class="cl-modal-head"><span>{{ editingId ? 'редактировать клиента' : 'новый клиент' }}</span><button class="cl-close" @click="closeModal">✕</button></div>
        <form class="cl-form" @submit.prevent="save">
          <div class="cl-field"><label>Имя / Название *</label><input v-model="form.name" class="glass-input" required placeholder="Иванова Анна Сергеевна" autofocus></div>
          <div class="cl-row"><div class="cl-field"><label>Телефон</label><AppPhoneInput v-model="form.phone" /></div><div class="cl-field"><label>Email</label><input v-model="form.email" class="glass-input" type="email" placeholder="client@mail.ru"></div></div>
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
    <div v-if="showLink" class="cl-backdrop" @click.self="showLink = false">
      <div class="cl-modal glass-surface glass-card">
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
    <div v-if="showDocs" class="cl-backdrop" @click.self="closeDocs">
      <div class="cl-modal glass-surface glass-card" style="max-width:600px">
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

const route = useRoute()
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
const searchQuery = ref('')
const selectedClientId = ref<number | null>(null)
const selectedClient = computed(() => clients.value?.find((c: any) => c.id === selectedClientId.value) || null)
const selectedClientSlug = computed(() => selectedClient.value?.linkedProjects?.[0]?.slug || null)

// Deselect when layout sends "все клиенты" signal
const entityDeselectSignal = useState<number>('entity-deselect-signal', () => 0)
watch(entityDeselectSignal, () => { selectedClientId.value = null })

const filteredClients = computed(() => {
  const all = clients.value || []
  if (!searchQuery.value.trim()) return all
  const q = searchQuery.value.toLowerCase()
  return all.filter((c: any) => c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
})
const clientsWithProject = computed(() => filteredClients.value.filter((c: any) => c.linkedProjects?.length > 0))
const clientsWithoutProject = computed(() => filteredClients.value.filter((c: any) => !c.linkedProjects?.length))
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
const clientNavPages = computed(() => {
  const pages = clientProject.value?.pages || []
  return allClientPages.filter(p => {
    if (!p.phase) return true
    if (p.slug === 'self_profile' && pages.includes('brief')) return true
    return pages.includes(p.slug)
  })
})
watch(selectedClientId, () => { clientPage.value = 'dashboard' })
const clientNormalizedPage = computed(() =>
  clientPage.value === 'brief' ? 'self_profile' : clientPage.value
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
const filteredClientDocs = computed(() => { const rows = clientDocs.value || []; const q = docsSearch.value.trim().toLowerCase(); return rows.filter((d: any) => { if (docsFilter.value && d.category !== docsFilter.value) return false; if (!q) return true; return `${d.title||''} ${d.notes||''} ${d.category||''}`.toLowerCase().includes(q) }).sort((a: any, b: any) => { const at = new Date(a.createdAt||0).getTime(); const bt = new Date(b.createdAt||0).getTime(); return docsSort.value === 'new' ? bt - at : at - bt }) })
function formatDocDate(v: string) { const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ru-RU') }
function openDocs(c: any) { docsClient.value = c; docsClientId.value = c.id; docsTitle.value = ''; docsCategory.value = 'other'; docsNotes.value = ''; docsSearch.value = ''; docsFilter.value = ''; docsSort.value = 'new'; showDocs.value = true; refreshClientDocs() }
function closeDocs() { showDocs.value = false }
async function uploadClientDoc(ev: Event) { const input = ev.target as HTMLInputElement; const files = input.files; if (!files?.length || !docsClientId.value) return; docsUploading.value = true; try { for (const f of Array.from(files)) { const fd = new FormData(); fd.append('file', f); fd.append('title', docsTitle.value || f.name); fd.append('category', docsCategory.value); fd.append('notes', docsNotes.value); await $fetch(`/api/clients/${docsClientId.value}/documents`, { method: 'POST', body: fd }) }; await refreshClientDocs(); docsTitle.value = ''; docsNotes.value = ''; input.value = '' } finally { docsUploading.value = false } }
async function deleteClientDoc(docId: number) { if (!docsClientId.value) return; if (!confirm('Удалить документ?')) return; await $fetch(`/api/clients/${docsClientId.value}/documents/${docId}`, { method: 'DELETE' }); await refreshClientDocs() }
</script>

<style scoped>
.cl-filter-info { margin-bottom: 14px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; font-size: .76rem; color: var(--glass-text); }
.cl-filter-link { text-decoration: none; color: var(--glass-text); opacity: .72; }
.cl-filter-link:hover { opacity: 1; }

/* ── Board root ── */
.cl-root { display: flex; flex-direction: column; gap: 16px; }
.cl-topbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; }
.cl-topbar-left { display: flex; align-items: center; gap: 10px; }
.cl-topbar-right { display: flex; align-items: center; gap: 8px; }
.cl-title { font-size: .8rem; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; opacity: .7; }
.cl-total { font-size: .7rem; font-weight: 700; background: color-mix(in srgb, var(--glass-text) 10%, transparent); border: 1px solid var(--glass-border); border-radius: 20px; padding: 1px 8px; }
.cl-search { width: 200px; height: 32px; font-size: .78rem; }

/* ── Board ── */
.cl-board { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 12px; align-items: flex-start; }
.cl-board::-webkit-scrollbar { height: 5px; }
.cl-board::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 10px; }

/* ── Column ── */
.cl-col { flex: 0 0 260px; min-width: 240px; display: flex; flex-direction: column; gap: 8px; }
.cl-col-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 10px 6px 12px; border-radius: 10px; border-top: 3px solid #94a3b8;
  background: color-mix(in srgb, var(--glass-bg) 70%, transparent);
  border-left: 1px solid var(--glass-border); border-right: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border);
}
.cl-col-title { font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; opacity: .75; }
.cl-col-count { font-size: .65rem; font-weight: 700; background: color-mix(in srgb, var(--glass-text) 10%, transparent); border-radius: 20px; padding: 0 6px; min-width: 18px; text-align: center; }
.cl-col-body { display: flex; flex-direction: column; gap: 8px; }
.cl-col-empty { font-size: .72rem; opacity: .3; text-align: center; padding: 16px 0; }

/* ── Card ── */
.cl-card { padding: 12px; border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; gap: 8px; transition: transform .12s, box-shadow .12s; border: 1px solid var(--glass-border); }
.cl-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.12); }
.cl-card-who { display: flex; align-items: center; gap: 8px; }
.cl-avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; background: color-mix(in srgb, #3b82f6 12%, transparent); border: 1px solid rgba(59,130,246,.25); display: flex; align-items: center; justify-content: center; font-size: .7rem; font-weight: 700; color: #3b82f6; }
.cl-avatar--new { background: color-mix(in srgb, var(--glass-text) 10%, transparent); border-color: var(--glass-border); color: var(--glass-text); opacity: .6; }
.cl-card-meta { min-width: 0; }
.cl-card-name { font-size: .8rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cl-card-sub { font-size: .68rem; opacity: .5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cl-card-proj { display: flex; flex-wrap: wrap; gap: 4px; }
.cl-proj-chip { font-size: .62rem; font-weight: 500; padding: 2px 8px; border-radius: 20px; background: color-mix(in srgb, #3b82f6 10%, transparent); border: 1px solid rgba(59,130,246,.2); color: #3b82f6; }
.cl-card-foot { padding-top: 2px; }
.cl-link-btn { background: none; border: 1px dashed var(--glass-border); cursor: pointer; font-family: inherit; font-size: .68rem; color: var(--glass-text); opacity: .45; border-radius: 7px; padding: 4px 8px; transition: opacity .12s; width: 100%; }
.cl-link-btn:hover { opacity: .8; }

/* ── Skeleton ── */
.cl-skel { height: 68px; border-radius: 12px; background: color-mix(in srgb, var(--glass-text) 5%, transparent); animation: cl-pulse 1.4s ease-in-out infinite; }
@keyframes cl-pulse { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }

.cl-nav-arrow { margin-left: auto; font-size: .7rem; opacity: .4; flex-shrink: 0; }

/* ── Modals ── */
.cl-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,.35); -webkit-backdrop-filter: blur(5px); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; padding: 16px; }
.cl-modal { width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; padding: 24px 26px 28px; }
.cl-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
.cl-modal-head span { font-size: .72rem; text-transform: uppercase; letter-spacing: 1.2px; color: var(--glass-text); opacity: .5; }
.cl-close { width: 28px; height: 28px; border-radius: 7px; border: none; background: rgba(0,0,0,.08); color: var(--glass-text); cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; }
.cl-close:hover { background: rgba(0,0,0,.16); }
.cl-form { display: flex; flex-direction: column; gap: 14px; }
.cl-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cl-field { display: flex; flex-direction: column; gap: 5px; }
.cl-field label { font-size: .7rem; text-transform: uppercase; letter-spacing: .5px; color: var(--glass-text); opacity: .45; }
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
@media (max-width: 600px) { .cl-row { grid-template-columns: 1fr; } }
</style>
