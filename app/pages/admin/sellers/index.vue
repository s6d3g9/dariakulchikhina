<template>
  <div>
    <template v-if="selectedSellerId">
        <div class="ent-entity-hd">
          <span class="ent-entity-hd-name">{{ selectedSeller?.name }}</span>
          <button class="ent-entity-hd-action" @click="openEdit(selectedSeller)">ред.</button>
        </div>
        <AdminSellerCabinet :key="selectedSellerId" :seller-id="selectedSellerId" :show-sidebar="false" v-model="activeSellerSection" />
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
        <button class="a-btn-sm" style="margin-top:6px" @click="showCreate = true">+ добавить</button>
      </div>

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

const adminNav = useAdminNav()
onMounted(() => adminNav.ensureSection('sellers'))
onActivated(() => adminNav.ensureSection('sellers'))

// Sync selected seller from global nav contentSpec
watch(() => adminNav.contentSpec.value.sellerId, (id) => {
  if (id) selectedSellerId.value = id
}, { immediate: true })
watch(() => adminNav.contentSpec.value.sellerSection, (sec) => {
  if (sec) activeSellerSection.value = sec
}, { immediate: true })

// ── Section state ──
const activeSellerSection = ref('dashboard')

const route = useRoute()
const router = useRouter()

const { data: allSellers, pending, refresh } = useFetch<any[]>('/api/sellers', { default: () => [] })

const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
const selectedSellerId = ref<number | null>(null)

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
