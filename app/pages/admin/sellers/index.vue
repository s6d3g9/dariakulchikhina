<template>
  <AdminEntityPageShell :has-selection="Boolean(selectedSellerId)" :show-create="showCreate">
    <template #selected>
      <div class="ent-wipe-host">
      <AdminEntityCabinetShell
        :show-hero="showBrutalistSellerHero"
        :title="selectedSeller?.name || ''"
        :kicker="sellerSectionLabel"
        :facts="sellerHeroFacts"
        :meta-columns="3"
        :brutalist="isBrutalistSellersMode"
      >
        <template #heroActions>
          <button class="admin-entity-hero__action" @click="openEdit(selectedSeller)">редактировать</button>
          <button class="admin-entity-hero__action" @click="showCreate = true">новый поставщик</button>
        </template>
        <template #headerActions>
          <button class="ent-entity-hd-action" @click="openEdit(selectedSeller)">ред.</button>
        </template>
        <AdminSellerCabinet :key="selectedSellerId" :seller-id="selectedSellerId" :show-sidebar="false" v-model="activeSellerSection" />
      </AdminEntityCabinetShell>
      <Wipe2Renderer v-if="contentViewMode === 'wipe2'" :entity="wipe2SellerEntityData" @edit="designSystem.set('contentViewMode', 'scroll')" />
      </div>
    </template>
    <template #create>
      <AdminEntityCreateCard
        title="Новый поставщик"
        v-model="newName"
        placeholder="Название компании / ИП"
        :submit-label="creating ? '…' : 'создать'"
        :disabled="!newName.trim() || creating"
        :brutalist="isBrutalistSellersMode"
        @submit="doCreate"
        @close="showCreate = false"
      />
    </template>
    <template #empty>
      <AdminEntityEmptyState
        icon="🏪"
        :has-items="Boolean(allSellers?.length)"
        message-with-items="Выберите поставщика из списка"
        message-empty="Нет поставщиков — добавьте первого"
        action-label="+ добавить"
        :brutalist="isBrutalistSellersMode"
        @action="showCreate = true"
      />
    </template>

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
  </AdminEntityPageShell>
</template>

<script setup lang="ts">
import type { Wipe2EntityData } from '~/shared/types/wipe2'
import Wipe2Renderer from '~/components/Wipe2Renderer.vue'

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
const designSystem = useDesignSystem()
const isBrutalistSellersMode = computed(() => designSystem.currentDesignMode.value === 'brutalist')
const contentViewMode = computed(() => designSystem.tokens.value.contentViewMode ?? 'scroll')

const wipe2SellerEntityData = computed<Wipe2EntityData | null>(() => {
  const s = selectedSeller.value
  if (!s) return null
  return {
    entityTitle: s.name,
    entitySubtitle: s.city || undefined,
    entityStatus: 'поставщик',
    entityStatusColor: 'amber',
    sections: [{
      title: 'Контакты',
      fields: [
        { label: 'Телефон', value: s.phone ?? '' },
        { label: 'Email', value: s.email ?? '' },
        { label: 'Город', value: s.city ?? '' },
        { label: 'Сайт', value: s.website ?? '' },
        { label: 'Заметки', value: s.notes ?? '', type: 'multiline' as const, span: 2 as const },
      ],
    }],
  }
})

const sellersDirectory = useAdminEntityDirectory<any>('sellers')
await sellersDirectory.ensureLoaded()
const allSellers = sellersDirectory.items
const pending = sellersDirectory.pending

const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
const selectedSellerId = ref<number | null>(null)

const selectedSeller = computed(() => allSellers.value?.find((s: any) => s.id === selectedSellerId.value) || null)
const showBrutalistSellerHero = computed(() => isBrutalistSellersMode.value && !!selectedSeller.value)
const sellerSectionLabel = computed(() => {
  if (activeSellerSection.value === 'dashboard') return 'кабинет поставщика'
  return String(activeSellerSection.value || 'кабинет поставщика').replace(/_/g, ' ')
})
const sellerHeroFacts = computed(() => [
  { label: 'раздел', value: sellerSectionLabel.value },
  { label: 'город', value: selectedSeller.value?.city || 'не указан' },
  { label: 'контакт', value: selectedSeller.value?.phone || selectedSeller.value?.email || 'не указан' },
])

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
    const nextQuery = { ...route.query }
    delete nextQuery.sellerId
    router.replace({ query: nextQuery })
  }
}
watch(() => allSellers.value, () => applySellerIdQuery(), { immediate: true })
watch(sellerIdFromQuery, () => applySellerIdQuery())


async function doCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    await sellersDirectory.createItem({ name: newName.value.trim() })
    newName.value = ''; showCreate.value = false
  } finally { creating.value = false }
}

async function del(id: number) {
  if (!confirm('Удалить поставщика?')) return
  await sellersDirectory.deleteItem(id)
  if (selectedSellerId.value === id) selectedSellerId.value = null
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
    await sellersDirectory.updateItem(editingId.value, { ...editForm })
    closeEdit()
  } catch (e: any) {
    editError.value = e?.data?.message || 'Ошибка сохранения'
  } finally { editSaving.value = false }
}
</script>

<style scoped>
.ent-wipe-host { position: relative; }
</style>
