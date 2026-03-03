<template>
  <div>
    <div v-if="projectSlugFilter" class="cl-filter-info glass-surface glass-card">
      <span>Фильтр по проекту: <b>{{ projectSlugFilter }}</b></span>
      <NuxtLink :to="`/admin/projects/${projectSlugFilter}`" class="cl-filter-link">← к проекту</NuxtLink>
      <NuxtLink to="/admin/clients" class="cl-filter-link">показать всех</NuxtLink>
    </div>
    <div v-if="selectedClient" class="ent-cabinet-wrap">
      <div class="ent-cabinet-topbar">
        <button class="ent-back-btn a-btn-sm" @click="selectedClientId = null">← к списку</button>
        <span class="ent-cabinet-title">{{ selectedClient.name }}</span>
        <div class="ent-cabinet-actions">
          <button class="a-btn-sm" @click="openEdit(selectedClient)">✎ редактировать</button>
          <button class="a-btn-sm a-btn-danger" @click="del(selectedClient.id)">× удалить</button>
        </div>
      </div>
      <div class="ent-detail-card glass-card" style="border-radius: var(--card-radius,14px)">
        <div class="ent-detail-section">контакты</div>
        <div v-if="selectedClient.phone" class="ent-detail-row"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.17 11.91 19.79 19.79 0 0 1 1.1 3.27 2 2 0 0 1 3.07 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" stroke="currentColor" stroke-width="1.5"/></svg> {{ selectedClient.phone }}</div>
        <div v-if="selectedClient.email" class="ent-detail-row"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="1.5"/><polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="1.5"/></svg> {{ selectedClient.email }}</div>
        <div v-if="selectedClient.messengerNick" class="ent-detail-row"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.5"/></svg> {{ selectedClient.messenger ? selectedClient.messenger + ' ' : '' }}{{ selectedClient.messengerNick }}</div>
        <div v-if="selectedClient.address" class="ent-detail-row"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/></svg> {{ selectedClient.address }}</div>
        <div v-if="!selectedClient.phone && !selectedClient.email && !selectedClient.messengerNick && !selectedClient.address" class="ent-detail-row" style="opacity:.3">контакты не указаны</div>
        <p v-if="selectedClient.notes" class="ent-detail-notes">{{ selectedClient.notes }}</p>
        <div v-if="selectedClient.linkedProjects?.length" class="ent-detail-section">проекты</div>
        <div v-if="selectedClient.linkedProjects?.length" class="ent-detail-chips">
          <NuxtLink v-for="p in selectedClient.linkedProjects" :key="p.slug" :to="`/admin/projects/${p.slug}`" class="ent-detail-chip">{{ p.title }}</NuxtLink>
        </div>
        <div class="ent-detail-foot">
          <button class="a-btn-sm" @click="openLink(selectedClient)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> {{ selectedClient.linkedProjects?.length ? 'сменить проект' : 'привязать' }}</button>
          <button class="a-btn-sm" @click="openDocs(selectedClient)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.8"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.8"/></svg> документы</button>
          <NuxtLink
            v-if="selectedClient.linkedProjects?.length"
            :to="`/client/${selectedClient.linkedProjects[0].slug}`"
            class="a-btn-sm a-btn-primary"
            target="_blank"
          ><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> кабинет клиента ↗</NuxtLink>
        </div>
      </div>
    </div>

    <div v-else class="ent-layout">
      <nav class="ent-sidebar std-sidenav">
        <div class="ent-sidebar-head">
          <span class="ent-sidebar-title">клиенты</span>
          <span class="ent-sidebar-count">{{ clients?.length ?? 0 }}</span>
        </div>
        <input v-model="searchQuery" class="ent-search glass-input" placeholder="поиск..." />
        <div class="std-nav">
          <template v-if="pending && !hasClientsCache">
            <div class="ent-nav-skeleton" v-for="i in 4" :key="i" />
          </template>
          <template v-else>
            <button v-for="c in filteredClients" :key="c.id" class="ent-nav-item" :class="{ 'ent-nav-item--active': selectedClientId === c.id }" @click="selectClient(c)">
              <span class="ent-nav-avatar">{{ c.name?.charAt(0)?.toUpperCase() || '?' }}</span>
              <span class="ent-nav-name">{{ c.name }}<span v-if="c.linkedProjects?.length" class="ent-nav-sub">{{ c.linkedProjects.map((p: any) => p.title).join(', ') }}</span></span>
              <span v-if="c.linkedProjects?.length" class="cl-nav-arrow" title="открыть кабинет">→</span>
            </button>
            <div v-if="filteredClients.length === 0 && searchQuery" class="cl-nav-empty">ничего не найдено</div>
            <div v-else-if="!clients?.length" class="cl-nav-empty">нет клиентов</div>
          </template>
        </div>
        <div class="ent-sidebar-foot"><button class="ent-sidebar-add a-btn-sm" @click="openAdd">+ добавить</button></div>
      </nav>
      <div class="ent-main">
        <div class="ent-empty-detail">
          <span class="ent-empty-icon">👤</span>
          <span v-if="clients?.length">Выберите клиента из списка</span>
          <span v-else>Нет клиентов — добавьте первого</span>
          <button v-if="!clients?.length" class="a-btn-sm" style="margin-top:6px" @click="openAdd">+ добавить</button>
        </div>
      </div>
    </div>

    <!-- ══ Add/Edit modal ══ -->
    <Teleport to="body">
    <div v-if="showModal" class="cl-backdrop" @click.self="closeModal">
      <div class="cl-modal glass-surface glass-card">
        <div class="cl-modal-head"><span>{{ editingId ? 'редактировать клиента' : 'новый клиент' }}</span><button class="cl-close" @click="closeModal">✕</button></div>
        <form class="cl-form" @submit.prevent="save">
          <div class="cl-field"><label>Имя / Название *</label><input v-model="form.name" class="cl-input glass-input" required placeholder="Иванова Анна Сергеевна" autofocus></div>
          <div class="cl-row"><div class="cl-field"><label>Телефон</label><input v-model="form.phone" class="cl-input glass-input" placeholder="+7 999 000 00 00"></div><div class="cl-field"><label>Email</label><input v-model="form.email" class="cl-input glass-input" type="email" placeholder="client@mail.ru"></div></div>
          <div class="cl-row"><div class="cl-field"><label>Мессенджер</label><select v-model="form.messenger" class="cl-input glass-input cl-select"><option value="">— не указан</option><option value="Telegram">Telegram</option><option value="WhatsApp">WhatsApp</option><option value="Viber">Viber</option></select></div><div class="cl-field"><label>Ник / номер</label><input v-model="form.messengerNick" class="cl-input glass-input" placeholder="@username"></div></div>
          <div class="cl-field"><label>Адрес</label><AppAddressInput v-model="form.address" input-class="cl-input glass-input" placeholder="г. Москва, ул. ..." /></div>
          <div class="cl-field"><label>Заметки</label><textarea v-model="form.notes" class="cl-input cl-ta glass-input" rows="3" placeholder="Любые пометки"></textarea></div>
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
          <div class="cl-field"><label>Выберите проект</label><select v-model="linkProjectSlug" class="cl-input glass-input cl-select"><option value="">— выберите проект —</option><option v-for="p in allProjects" :key="p.slug" :value="p.slug">{{ p.title }}</option></select></div>
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
          <div class="cl-row"><div class="cl-field"><label>Поиск</label><input v-model="docsSearch" class="cl-input glass-input" placeholder="Название" /></div><div class="cl-field"><label>Категория</label><select v-model="docsFilter" class="cl-input glass-input cl-select"><option value="">Все</option><option v-for="dc in DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option></select></div></div>
          <div class="cl-row"><div class="cl-field"><label>Название</label><input v-model="docsTitle" class="cl-input glass-input" placeholder="Название документа" /></div><div class="cl-field"><label>Категория</label><select v-model="docsCategory" class="cl-input glass-input cl-select"><option v-for="dc in DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option></select></div></div>
          <div class="cl-field"><label>Примечание</label><input v-model="docsNotes" class="cl-input glass-input" placeholder="Необязательно" /></div>
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
const filteredClients = computed(() => {
  const all = clients.value || []
  if (!searchQuery.value.trim()) return all
  const q = searchQuery.value.toLowerCase()
  return all.filter((c: any) => c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
})
const router = useRouter()
function selectClient(c: any) {
  // If client has a linked project → go straight to their cabinet (same as contractors/designers)
  if (c.linkedProjects?.length) {
    router.push(`/client/${c.linkedProjects[0].slug}`)
  } else {
    selectedClientId.value = c.id
  }
}

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
.cl-nav-empty { padding: 16px 10px; text-align: center; font-size: .74rem; color: var(--glass-text); opacity: .3; }
.cl-nav-arrow { margin-left: auto; font-size: .7rem; opacity: .4; flex-shrink: 0; }
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
.cl-input { padding: 8px 12px; border-radius: 8px; font-size: .88rem; font-family: inherit; width: 100%; box-sizing: border-box; }
.cl-ta { resize: vertical; min-height: 72px; }
.cl-select { cursor: pointer; }
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
.a-btn-primary { background: var(--glass-accent, rgba(99,120,255,0.18)); color: var(--glass-text); border: 1px solid var(--glass-border); text-decoration: none; }
.a-btn-primary:hover { background: var(--glass-accent-hover, rgba(99,120,255,0.28)); }
@media (max-width: 600px) { .cl-row { grid-template-columns: 1fr; } }
</style>
