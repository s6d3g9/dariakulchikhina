<template>
  <div>
    <template v-if="selectedManagerId">
      <div class="ent-entity-hd">
        <span class="ent-entity-hd-name">{{ selectedManager?.name }}</span>
        <button class="ent-entity-hd-action" @click="openEdit(selectedManager)">ред.</button>
      </div>
      <AdminManagerCabinet :key="selectedManagerId" :manager-id="selectedManagerId" v-model="activeManagerSection" />
    </template>
    <div v-else-if="showCreate" class="ent-detail-card glass-card" style="margin-bottom:14px">
      <div class="ent-detail-head">
        <div class="ent-detail-name">Новый менеджер</div>
        <button class="a-btn-sm" @click="showCreate = false">✕</button>
      </div>
      <input v-model="newName" class="glass-input" style="margin-bottom:8px" placeholder="Имя менеджера" @keydown.enter="doCreate" />
      <div class="ent-detail-foot">
        <button class="a-btn-save" :disabled="!newName.trim() || creating" @click="doCreate">{{ creating ? '…' : 'создать' }}</button>
        <button class="a-btn-sm" @click="showCreate = false">отмена</button>
      </div>
    </div>
    <div v-else class="ent-empty-detail">
      <span class="ent-empty-icon">👔</span>
      <span v-if="allManagers?.length">Выберите менеджера из списка</span>
      <span v-else>Нет менеджеров — добавьте первого</span>
      <button class="a-btn-sm" style="margin-top:6px" @click="showCreate = true">+ добавить</button>
    </div>

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
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

const adminNav = useAdminNav()
onMounted(() => adminNav.ensureSection('managers'))
onActivated(() => adminNav.ensureSection('managers'))

watch(() => adminNav.contentSpec.value.managerId, (id) => {
  if (id) selectedManagerId.value = id
})
watch(() => adminNav.contentSpec.value.managerSection, (sec) => {
  if (sec) activeManagerSection.value = sec
})

const activeManagerSection = ref('dashboard')

const route = useRoute()
const router = useRouter()

const { data: allManagers, pending, refresh } = useFetch<any[]>('/api/managers', { default: () => [] })
const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
const selectedManagerId = ref<number | null>(null)

const selectedManager = computed(() => allManagers.value?.find((m: any) => m.id === selectedManagerId.value) || null)

const managerIdFromQuery = computed(() => {
  const v = route.query.managerId
  return typeof v === 'string' ? parseInt(v, 10) : null
})
function applyManagerIdQuery() {
  const qid = managerIdFromQuery.value
  if (qid && allManagers.value?.length) {
    const found = allManagers.value.find((m: any) => m.id === qid)
    if (found) selectedManagerId.value = found.id
    router.replace({ query: { ...route.query, managerId: undefined } })
  }
}
watch(() => allManagers.value, () => applyManagerIdQuery(), { immediate: true })
watch(managerIdFromQuery, () => applyManagerIdQuery())

async function doCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    await $fetch('/api/managers', { method: 'POST', body: { name: newName.value.trim() } })
    await refresh(); newName.value = ''; showCreate.value = false
  } finally { creating.value = false }
}

async function del(id: number) {
  if (!confirm('Удалить менеджера?')) return
  await $fetch(`/api/managers/${id}`, { method: 'DELETE' })
  if (selectedManagerId.value === id) selectedManagerId.value = null
  await refresh()
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
    await $fetch(`/api/managers/${editingId.value}`, { method: 'PUT', body: { ...editForm } })
    closeEdit(); refresh()
  } catch (e: any) {
    editError.value = e?.data?.message || 'Ошибка сохранения'
  } finally { editSaving.value = false }
}
</script>
