<template>
  <div>
  <AdminEntityPageShell v-show="contentViewMode !== 'wipe2'" class="ds-page" :class="{ 'ds-page--brutalist': isBrutalistDesignersMode }" :has-selection="Boolean(selectedDesignerId)" :show-create="showCreate">
    <template #selected>
      <AdminEntityCabinetShell
        :show-hero="showBrutalistDesignerHero"
        :title="selectedDesigner?.name || ''"
        :kicker="designerSectionLabel"
        :facts="designerHeroFacts"
        :meta-columns="3"
        :brutalist="isBrutalistDesignersMode"
      >
        <template #heroActions>
          <button class="admin-entity-hero__action" @click="showCreate = true">новый дизайнер</button>
        </template>
        <AdminDesignerCabinet
          :key="selectedDesignerId"
          :designer-id="selectedDesignerId"
          v-model="activeSection"
        />
      </AdminEntityCabinetShell>
    </template>

    <template #create>
      <AdminEntityCreateCard
        title="Новый дизайнер"
        v-model="newName"
        placeholder="Имя / Студия"
        :submit-label="creating ? '…' : 'создать'"
        :disabled="!newName.trim() || creating"
        :brutalist="isBrutalistDesignersMode"
        @submit="doCreate"
        @close="showCreate = false"
      />
    </template>

    <template #empty>
      <AdminEntityEmptyState
        icon="🎨"
        :has-items="Boolean(allDesigners?.length)"
        message-with-items="Выберите дизайнера из списка"
        message-empty="Нет дизайнеров — добавьте первого"
        action-label="+ добавить"
        :brutalist="isBrutalistDesignersMode"
        @action="showCreate = true"
      />
    </template>
  </AdminEntityPageShell>
  <Wipe2Renderer v-if="contentViewMode === 'wipe2'" :entity="wipe2DesignerEntityData" />
  </div>
</template>

<script setup lang="ts">
import type { Wipe2EntityData } from '~/shared/types/wipe2'
import Wipe2Renderer from '~/components/Wipe2Renderer.vue'
definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

const adminNav = useAdminNav()
onMounted(() => adminNav.ensureSection('designers'))
onActivated(() => adminNav.ensureSection('designers'))

// Sync from global nav contentSpec
watch(() => adminNav.contentSpec.value.designerId, (id) => {
  if (id) selectedDesignerId.value = id
}, { immediate: true })
watch(() => adminNav.contentSpec.value.designerSection, (sec) => {
  if (sec) activeSection.value = sec
}, { immediate: true })

// ── Data ──
const designersDirectory = useAdminEntityDirectory<any>('designers')
await designersDirectory.ensureLoaded()
const allDesigners = designersDirectory.items
const pending = designersDirectory.pending

// ── Entity state ──
const selectedDesignerId = ref<number | null>(null)
const selectedDesigner = computed(() => allDesigners.value?.find((designer: any) => designer.id === selectedDesignerId.value) || null)
const activeSection = ref('dashboard')
const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
const route = useRoute()
const router = useRouter()
const designSystem = useDesignSystem()
const isBrutalistDesignersMode = computed(() => designSystem.currentDesignMode.value === 'brutalist')
const contentViewMode = computed(() => designSystem.tokens.value.contentViewMode ?? 'scroll')

const wipe2DesignerEntityData = computed<Wipe2EntityData | null>(() => {
  const d = selectedDesigner.value
  if (!d) {
    const all = allDesigners.value ?? []
    return {
      entityTitle: 'База дизайнеров',
      entitySubtitle: `${all.length} дизайнеров`,
      sections: [{ title: 'Статистика', fields: [{ label: 'Всего', value: String(all.length), type: 'number' as const }] }],
    }
  }
  return {
    entityTitle: d.name,
    entitySubtitle: d.city || undefined,
    entityStatus: 'дизайнер',
    entityStatusColor: 'blue',
    sections: [{
      title: 'Контакты',
      fields: [
        { label: 'Телефон', value: d.phone ?? '' },
        { label: 'Email', value: d.email ?? '' },
        { label: 'Город', value: d.city ?? '' },
        { label: 'Специализация', value: Array.isArray(d.specializations) ? d.specializations.join(', ') : (d.specializations ?? ''), span: 2 as const },
        { label: 'Заметки', value: d.notes ?? '', type: 'multiline' as const, span: 2 as const },
      ],
    }],
  }
})
const showBrutalistDesignerHero = computed(() => isBrutalistDesignersMode.value && !!selectedDesigner.value)
const designerSectionLabel = computed(() => {
  if (activeSection.value === 'dashboard') return 'кабинет дизайнера'
  return String(activeSection.value || 'кабинет дизайнера').replace(/_/g, ' ')
})
const designerHeroFacts = computed(() => [
  { label: 'раздел', value: designerSectionLabel.value },
  { label: 'город', value: selectedDesigner.value?.city || 'не указан' },
  { label: 'контакт', value: selectedDesigner.value?.phone || selectedDesigner.value?.email || 'не указан' },
])

// ── Pending list state ──
const isPending = computed(() => pending.value && !allDesigners.value?.length)

// ── Create ──
async function doCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    const created = await designersDirectory.createItem({ name: newName.value.trim() })
    newName.value = ''; showCreate.value = false
    if (created?.id) {
      selectedDesignerId.value = created.id
      activeSection.value = 'dashboard'
    }
  } finally { creating.value = false }
}
</script>

<style scoped>
.ds-page {
  width: 100%;
}

.ds-page--brutalist {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

@media (max-width: 640px) {
}
</style>
