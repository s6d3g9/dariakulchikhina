<template>
  <div>
    <div class="proj-content-area">

      <div class="proj-nav-col">
      <nav class="proj-sidenav std-sidenav">
        <div class="proj-nav-header">

          <AdminSidebarSwitcher title="поставщики" :count="allSellers?.length ?? 0" v-model="searchQuery" />

        </div>

        <div class="proj-nav-body">
        <div class="std-nav">
          <template v-if="pending">
            <div class="ent-nav-skeleton" v-for="i in 3" :key="i" />
          </template>
          <template v-else>
            <button v-for="s in filteredSellers" :key="s.id" class="ent-nav-item" :class="{ 'ent-nav-item--active': selectedSellerId === s.id }" @click="selectedSellerId = s.id">
              <span class="ent-nav-avatar">{{ s.name?.charAt(0)?.toUpperCase() || '?' }}</span>
              <span class="ent-nav-name">{{ s.name }}<span v-if="s.city" class="ent-nav-sub">{{ s.city }}</span></span>
            </button>
            <div v-if="!filteredSellers.length && searchQuery" class="ent-nav-empty">ничего не найдено</div>
            <div v-else-if="!allSellers?.length" class="ent-nav-empty">нет поставщиков</div>
          </template>
        </div>
        </div><!-- /.proj-nav-body -->
        <div class="ent-sidebar-foot"><button class="ent-sidebar-add a-btn-sm" @click="showCreate = true">+ добавить</button></div>
      </nav>
      </div><!-- /.proj-nav-col -->

    <div class="proj-main">
        <template v-if="selectedSellerId">
          <div class="ent-entity-hd">
            <span class="ent-entity-hd-name">{{ selectedSeller?.name }}</span>
            <button class="ent-entity-hd-action" @click="openEdit(selectedSeller)">ред.</button>
          </div>
          <AdminSellerCabinet :key="selectedSellerId" :seller-id="selectedSellerId" />
        </template>
        <div v-else-if="showCreate" class="ent-detail-card glass-card" style="margin-bottom:14px">
          <div class="ent-detail-head">
            <div class="ent-detail-name">Новый поставщик</div>
            <button class="a-btn-sm" @click="showCreate = false">✕</button>
          </div>
          <input v-model="newName" class="glass-input" style="margin-bottom:8px" placeholder="Название компании / ИП" @keydown.enter="doCreate" />
          <div class="ent-detail-foot">
            <button class="a-btn-save" :disabled="!newName.trim() || creating" @click="doCreate">{{ creating ? '…' : 'создать' }}</button>
            <button class="a-btn-sm" @click="showCreate = false">отмена</button>
          </div>
        </div>
        <div v-else class="ent-empty-detail">
          <span class="ent-empty-icon">🏪</span>
          <span v-if="allSellers?.length">Выберите поставщика из списка</span>
          <span v-else>Нет поставщиков — добавьте первого</span>
          <button v-if="!allSellers?.length" class="a-btn-sm" style="margin-top:6px" @click="showCreate = true">+ добавить первого</button>
        </div>
      </div>

      <!-- ═══ Status bar ═══ -->
      <AdminProjectStatusBar />

    <!-- ══ Edit Modal ══ -->
    </div><!-- /.proj-content-area -->
    <Teleport to="body">
      <div v-if="showEditModal" class="ct-backdrop" @click.self="closeEdit">
        <div class="ct-modal glass-surface">
          <div class="ct-modal-head">
            <span>редактировать поставщика</span>
            <button class="ct-modal-close" @click="closeEdit">✕</button>
          </div>
          <div class="ct-modal-body">
            <form @submit.prevent="saveEdit">
              <div class="ct-form-section">основное</div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Название *</label><input v-model="editForm.name" class="glass-input" required /></div>
                <div class="u-field"><label class="u-field__label">Компания</label><input v-model="editForm.companyName" class="glass-input" /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Контактное лицо</label><input v-model="editForm.contactPerson" class="glass-input" /></div>
                <div class="u-field"><label class="u-field__label">Город</label><input v-model="editForm.city" class="glass-input" /></div>
              </div>
              <div class="ct-form-section">контакты</div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Телефон</label><input v-model="editForm.phone" class="glass-input" /></div>
                <div class="u-field"><label class="u-field__label">Email</label><input v-model="editForm.email" class="glass-input" /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Telegram</label><input v-model="editForm.telegram" class="glass-input" /></div>
                <div class="u-field"><label class="u-field__label">Сайт</label><input v-model="editForm.website" class="glass-input" placeholder="https://…" /></div>
              </div>
              <div class="ct-form-section">примечания</div>
              <div class="u-field"><textarea v-model="editForm.notes" class="glass-input u-ta" rows="3" placeholder="заметки о поставщике"></textarea></div>
              <p v-if="editError" class="ct-form-error ct-form-error--bottom">{{ editError }}</p>
              <div class="ct-modal-foot"><button type="button" class="a-btn-sm" @click="closeEdit">отмена</button><button type="submit" class="a-btn-save" :disabled="editSaving">{{ editSaving ? '...' : 'сохранить' }}</button></div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

const route = useRoute()
const router = useRouter()

const { data: allSellers, pending, refresh } = useFetch<any[]>('/api/sellers', { default: () => [] })

const searchQuery = ref('')
const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
const selectedSellerId = ref<number | null>(null)

// Deselect when layout sends signal
const entityDeselectSignal = useState<number>('entity-deselect-signal', () => 0)
watch(entityDeselectSignal, () => { selectedSellerId.value = null })

const selectedSeller = computed(() => allSellers.value?.find((s: any) => s.id === selectedSellerId.value) || null)

// Auto-select from query
const sellerIdFromQuery = computed(() => {
  const v = route.query.sellerId
  return typeof v === 'string' ? parseInt(v, 10) : null
})
function applySellerIdQuery() {
  const qid = sellerIdFromQuery.value
  if (qid && allSellers.value?.length) {
    const found = allSellers.value.find((s: any) => s.id === qid)
    if (found) selectedSellerId.value = found.id
    router.replace({ query: { ...route.query, sellerId: undefined } })
  }
}
watch(() => allSellers.value, () => applySellerIdQuery(), { immediate: true })
watch(sellerIdFromQuery, () => applySellerIdQuery())

const filteredSellers = computed(() => {
  if (!searchQuery.value) return allSellers.value || []
  const q = searchQuery.value.toLowerCase()
  return (allSellers.value || []).filter((s: any) =>
    s.name?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.companyName?.toLowerCase().includes(q)
  )
})

async function doCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    await $fetch('/api/sellers', { method: 'POST', body: { name: newName.value.trim() } })
    await refresh(); newName.value = ''; showCreate.value = false
  } finally { creating.value = false }
}

async function del(id: number) {
  if (!confirm('Удалить поставщика?')) return
  await $fetch(`/api/sellers/${id}`, { method: 'DELETE' })
  if (selectedSellerId.value === id) selectedSellerId.value = null
  await refresh()
}

// ── Edit modal ──
const showEditModal = ref(false)
const editSaving = ref(false)
const editError = ref('')
const editingId = ref<number | null>(null)
const editForm = reactive({
  name: '', companyName: '', contactPerson: '', city: '',
  phone: '', email: '', telegram: '', website: '', notes: '',
})

function openEdit(s: any) {
  editingId.value = s.id
  editForm.name = s.name || ''
  editForm.companyName = s.companyName || ''
  editForm.contactPerson = s.contactPerson || ''
  editForm.city = s.city || ''
  editForm.phone = s.phone || ''
  editForm.email = s.email || ''
  editForm.telegram = s.telegram || ''
  editForm.website = s.website || ''
  editForm.notes = s.notes || ''
  showEditModal.value = true
}

function closeEdit() {
  showEditModal.value = false; editingId.value = null; editError.value = ''
}

async function saveEdit() {
  if (!editingId.value) return
  editSaving.value = true; editError.value = ''
  try {
    await $fetch(`/api/sellers/${editingId.value}`, { method: 'PUT', body: { ...editForm } })
    closeEdit(); refresh()
  } catch (e: any) {
    editError.value = e?.data?.message || 'Ошибка сохранения'
  } finally { editSaving.value = false }
}
</script>
