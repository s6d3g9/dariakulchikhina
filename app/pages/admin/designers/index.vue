<template>
  <div>
    <template v-if="selectedDesignerId">
          <AdminDesignerCabinet
            :key="selectedDesignerId"
            :designer-id="selectedDesignerId"
            v-model="activeSection"
          />
        </template>

        <div v-else-if="showCreate" class="ent-detail-card glass-card" style="margin-bottom:14px">
          <div class="ent-detail-head">
            <div class="ent-detail-name">Новый дизайнер</div>
            <button class="a-btn-sm" @click="showCreate = false">✕</button>
          </div>
          <input v-model="newName" class="glass-input ds-inp" placeholder="Имя / Студия" @keydown.enter="doCreate" />
          <div class="ent-detail-foot">
            <button class="a-btn-save" :disabled="!newName.trim() || creating" @click="doCreate">{{ creating ? '…' : 'создать' }}</button>
            <button class="a-btn-sm" @click="showCreate = false">отмена</button>
          </div>
        </div>

        <div v-else class="ent-empty-detail">
          <span class="ent-empty-icon">🎨</span>
          <span v-if="allDesigners?.length">Выберите дизайнера из списка</span>
          <span v-else>Нет дизайнеров — добавьте первого</span>
          <button class="a-btn-sm" style="margin-top:6px" @click="showCreate = true">+ добавить</button>
        </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

const adminNav = useAdminNav()
onMounted(() => adminNav.ensureSection('designers'))

// Sync from global nav contentSpec
watch(() => adminNav.contentSpec.value.designerId, (id) => {
  if (id) selectedDesignerId.value = id
})
watch(() => adminNav.contentSpec.value.designerSection, (sec) => {
  if (sec) activeSection.value = sec
})

// ── Data ──
const { data: allDesigners, pending, refresh } = useFetch<any[]>('/api/designers', { default: () => [] })

// ── Entity state ──
const selectedDesignerId = ref<number | null>(null)
const activeSection = ref('dashboard')
const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
const route = useRoute()
const router = useRouter()

// ── Pending list state ──
const isPending = computed(() => pending.value && !allDesigners.value?.length)

// ── Create ──
async function doCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    const created = await $fetch<any>('/api/designers', {
      method: 'POST', body: { name: newName.value.trim() }
    })
    await refresh()
    newName.value = ''; showCreate.value = false
    if (created?.id) {
      selectedDesignerId.value = created.id
      activeSection.value = 'dashboard'
    }
  } finally { creating.value = false }
}
</script>

<style scoped>
.ds-inp { width: 100%; margin-bottom: 12px; }
</style>
