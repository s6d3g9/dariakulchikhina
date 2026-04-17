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
        <AdminSellerCabinet v-show="!isWipe2Mode" :key="selectedSellerId!" :seller-id="selectedSellerId!" :show-sidebar="false" v-model="activeSellerSection" />
        <Wipe2Renderer
          v-if="isWipe2Mode && wipe2State"
          :entity="wipe2State"
          layout="inline"
          @edit="designSystem.set('contentViewMode', 'scroll')"
        />
      </AdminEntityCabinetShell>
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
                <div class="u-field"><label class="u-field__label">Название *</label><GlassInput v-model="editForm.name"  required /></div>
                <div class="u-field"><label class="u-field__label">Компания</label><GlassInput v-model="editForm.companyName"  /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Контактное лицо</label><GlassInput v-model="editForm.contactPerson"  /></div>
                <div class="u-field"><label class="u-field__label">Город</label><GlassInput v-model="editForm.city"  /></div>
              </div>
              <div class="ct-form-section">контакты</div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Телефон</label><GlassInput v-model="editForm.phone"  /></div>
                <div class="u-field"><label class="u-field__label">Email</label><GlassInput v-model="editForm.email"  /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Telegram</label><GlassInput v-model="editForm.telegram"  /></div>
                <div class="u-field"><label class="u-field__label">Сайт</label><GlassInput v-model="editForm.website"  placeholder="https://…" /></div>
              </div>
              <div class="ct-form-section">примечания</div>
              <div class="u-field"><textarea v-model="editForm.notes" class="glass-input u-ta" rows="3" placeholder="заметки о поставщике"></textarea></div>
              <p v-if="editError" class="ct-form-error ct-form-error--bottom">{{ editError }}</p>
              <div class="ct-modal-foot"><GlassButton variant="secondary" density="compact" type="button"  @click="closeEdit">отмена</GlassButton><GlassButton variant="primary" type="submit"  :disabled="editSaving">{{ editSaving ? '...' : 'сохранить' }}</GlassButton></div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminEntityPageShell>
</template>

<script setup lang="ts">
import { useWipe2State } from '~/composables/useWipe2'
import Wipe2Renderer from '~/entities/design-system/ui/Wipe2Renderer.vue'
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
const isWipe2Mode = computed(() => contentViewMode.value === 'wipe2')
const wipe2State = useWipe2State()

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
