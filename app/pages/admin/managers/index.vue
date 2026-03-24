<template>
  <AdminEntityPageShell :has-selection="Boolean(selectedManagerId)" :show-create="showCreate">
    <template #before>
      <div v-if="pending && !allManagers?.length" class="u-inline-loading" aria-hidden="true">
        <span class="u-inline-loading__label">[ ЗАГРУЖАЕМ МЕНЕДЖЕРОВ ]</span>
        <span class="u-inline-loading__line"></span>
      </div>
    </template>
    <template #selected>
      <div class="ent-wipe-host">
      <AdminEntityCabinetShell
        :show-hero="showBrutalistManagerHero"
        :title="selectedManager?.name || ''"
        :kicker="managerSectionLabel"
        :facts="managerHeroFacts"
        :meta-columns="3"
        :brutalist="isBrutalistManagersMode"
      >
        <template #heroActions>
          <button class="admin-entity-hero__action" @click="openEdit(selectedManager)">редактировать</button>
          <button class="admin-entity-hero__action" @click="showCreate = true">новый менеджер</button>
        </template>
        <template #headerActions>
          <button class="ent-entity-hd-action" @click="openEdit(selectedManager)">ред.</button>
        </template>
        <AdminManagerCabinet v-show="!isWipe2Mode" :key="selectedManagerId" :manager-id="selectedManagerId" :show-sidebar="false" v-model="activeManagerSection" />
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
        title="Новый менеджер"
        v-model="newName"
        placeholder="Имя менеджера"
        :submit-label="creating ? '…' : 'создать'"
        :disabled="!newName.trim() || creating"
        :brutalist="isBrutalistManagersMode"
        @submit="doCreate"
        @close="showCreate = false"
      />
    </template>
    <template #empty>
    <AdminEntityEmptyState
      icon="👔"
      :has-items="Boolean(allManagers?.length)"
      message-with-items="Выберите менеджера из списка"
      message-empty="Нет менеджеров — добавьте первого"
      action-label="+ добавить"
      :brutalist="isBrutalistManagersMode"
      @action="showCreate = true"
    />
    </template>

    <Teleport to="body">
      <div v-if="showEditModal" class="ct-backdrop" @click.self="closeEdit">
        <div class="ct-modal glass-surface">
          <div class="ct-modal-head">
            <span>редактировать менеджера</span>
            <button class="ct-modal-close" @click="closeEdit">✕</button>
          </div>
          <div class="ct-modal-body">
            <form @submit.prevent="saveEdit">
              <div class="ct-form-section">основное</div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Имя *</label><input v-model="editForm.name" class="glass-input" required /></div>
                <div class="u-field"><label class="u-field__label">Роль</label><input v-model="editForm.role" class="glass-input" placeholder="менеджер, ассистент…" /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Город</label><input v-model="editForm.city" class="glass-input" /></div>
              </div>
              <div class="ct-form-section">контакты</div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Телефон</label><input v-model="editForm.phone" class="glass-input" /></div>
                <div class="u-field"><label class="u-field__label">Email</label><input v-model="editForm.email" class="glass-input" /></div>
              </div>
              <div class="u-grid-2">
                <div class="u-field"><label class="u-field__label">Telegram</label><input v-model="editForm.telegram" class="glass-input" /></div>
              </div>
              <div class="ct-form-section">примечания</div>
              <div class="u-field"><textarea v-model="editForm.notes" class="glass-input u-ta" rows="3" placeholder="заметки о менеджере"></textarea></div>
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
import { useWipe2State } from '~/composables/useWipe2'
import Wipe2Renderer from '~/components/Wipe2Renderer.vue'
definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

const adminNav = useAdminNav()
onMounted(() => adminNav.ensureSection('managers'))
onActivated(() => adminNav.ensureSection('managers'))

watch(() => adminNav.contentSpec.value.managerId, (id) => {
  if (id) selectedManagerId.value = id
}, { immediate: true })
watch(() => adminNav.contentSpec.value.managerSection, (sec) => {
  if (sec) activeManagerSection.value = sec
}, { immediate: true })

const activeManagerSection = ref('dashboard')

const route = useRoute()
const router = useRouter()
const designSystem = useDesignSystem()
const isBrutalistManagersMode = computed(() => designSystem.currentDesignMode.value === 'brutalist')
const contentViewMode = computed(() => designSystem.tokens.value.contentViewMode ?? 'scroll')
const isWipe2Mode = computed(() => contentViewMode.value === 'wipe2')
const wipe2State = useWipe2State()

const managersDirectory = useAdminEntityDirectory<any>('managers')
await managersDirectory.ensureLoaded()
const allManagers = managersDirectory.items
const pending = managersDirectory.pending
const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
const selectedManagerId = ref<number | null>(null)

const selectedManager = computed(() => allManagers.value?.find((m: any) => m.id === selectedManagerId.value) || null)
const showBrutalistManagerHero = computed(() => isBrutalistManagersMode.value && !!selectedManager.value)
const managerSectionLabel = computed(() => {
  if (activeManagerSection.value === 'dashboard') return 'кабинет менеджера'
  return String(activeManagerSection.value || 'кабинет менеджера').replace(/_/g, ' ')
})
const managerHeroFacts = computed(() => [
  { label: 'раздел', value: managerSectionLabel.value },
  { label: 'роль', value: selectedManager.value?.role || 'не указана' },
  { label: 'контакт', value: selectedManager.value?.phone || selectedManager.value?.email || 'не указан' },
])

const managerIdFromQuery = computed(() => {
  const v = route.query.managerId
  return typeof v === 'string' ? parseInt(v, 10) : null
})
function applyManagerIdQuery() {
  const qid = managerIdFromQuery.value
  if (qid && allManagers.value?.length) {
    const found = allManagers.value.find((m: any) => m.id === qid)
    if (found) selectedManagerId.value = found.id
    const nextQuery = { ...route.query }
    delete nextQuery.managerId
    router.replace({ query: nextQuery })
  }
}
watch(() => allManagers.value, () => applyManagerIdQuery(), { immediate: true })
watch(managerIdFromQuery, () => applyManagerIdQuery())

async function doCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    await managersDirectory.createItem({ name: newName.value.trim() })
    newName.value = ''; showCreate.value = false
  } finally { creating.value = false }
}

async function del(id: number) {
  if (!confirm('Удалить менеджера?')) return
  await managersDirectory.deleteItem(id)
  if (selectedManagerId.value === id) selectedManagerId.value = null
}

const showEditModal = ref(false)
const editSaving = ref(false)
const editError = ref('')
const editingId = ref<number | null>(null)
const editForm = reactive({
  name: '', role: '', city: '',
  phone: '', email: '', telegram: '', notes: '',
})

function openEdit(m: any) {
  editingId.value = m.id
  editForm.name = m.name || ''
  editForm.role = m.role || ''
  editForm.city = m.city || ''
  editForm.phone = m.phone || ''
  editForm.email = m.email || ''
  editForm.telegram = m.telegram || ''
  editForm.notes = m.notes || ''
  showEditModal.value = true
}

function closeEdit() {
  showEditModal.value = false; editingId.value = null; editError.value = ''
}

async function saveEdit() {
  if (!editingId.value) return
  editSaving.value = true; editError.value = ''
  try {
    await managersDirectory.updateItem(editingId.value, { ...editForm })
    closeEdit()
  } catch (e: any) {
    editError.value = e?.data?.message || 'Ошибка сохранения'
  } finally { editSaving.value = false }
}
</script>

<style scoped>
.ent-wipe-host { position: relative; }
</style>
