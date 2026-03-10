<template>
  <div class="ds-page" :class="{ 'ds-page--brutalist': isBrutalistDesignersMode }">
    <template v-if="selectedDesignerId">
          <section v-if="showBrutalistDesignerHero" class="ds-hero">
            <nav class="ds-hero-breadcrumbs">
              <NuxtLink to="/admin">админ</NuxtLink>
              <span>/</span>
              <span>дизайнеры</span>
              <span>/</span>
              <span>{{ selectedDesigner?.name }}</span>
            </nav>
            <div class="ds-hero-body">
              <p class="ds-hero-kicker">{{ designerSectionLabel }}</p>
              <h1 class="ds-hero-title">{{ selectedDesigner?.name }}</h1>
              <div class="ds-hero-meta">
                <div v-for="fact in designerHeroFacts" :key="fact.label" class="ds-hero-meta-item">
                  <span class="ds-hero-meta-label">{{ fact.label }}</span>
                  <span class="ds-hero-meta-value">{{ fact.value }}</span>
                </div>
              </div>
              <div class="ds-hero-actions">
                <button class="ds-hero-action" @click="showCreate = true">новый дизайнер</button>
              </div>
            </div>
          </section>

          <section class="ds-cab-shell" :class="{ 'ds-cab-shell--brutalist': isBrutalistDesignersMode }">
          <AdminDesignerCabinet
            :key="selectedDesignerId"
            :designer-id="selectedDesignerId"
            v-model="activeSection"
          />
          </section>
        </template>

        <div v-else-if="showCreate" class="ent-detail-card glass-card ds-create-card" :class="{ 'ds-create-card--brutalist': isBrutalistDesignersMode }" style="margin-bottom:14px">
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

        <div v-else class="ent-empty-detail ds-empty-detail" :class="{ 'ds-empty-detail--brutalist': isBrutalistDesignersMode }">
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
onActivated(() => adminNav.ensureSection('designers'))

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
const selectedDesigner = computed(() => allDesigners.value?.find((designer: any) => designer.id === selectedDesignerId.value) || null)
const activeSection = ref('dashboard')
const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
const route = useRoute()
const router = useRouter()
const designSystem = useDesignSystem()
const isBrutalistDesignersMode = computed(() => designSystem.currentDesignMode.value === 'brutalist')
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
.ds-page {
  width: 100%;
}

.ds-page--brutalist {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ds-hero {
  position: relative;
  min-height: min(72vh, 720px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.ds-hero-breadcrumbs {
  position: absolute;
  top: 18px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: .62rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.ds-hero-breadcrumbs a {
  color: inherit;
  text-decoration: none;
}

.ds-hero-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: min(100%, 980px);
}

.ds-hero-kicker {
  margin: 0;
  font-size: .68rem;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.ds-hero-title {
  margin: 0;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: .1em;
  line-height: .94;
  font-size: clamp(2.4rem, 8vw, 6.5rem);
}

.ds-hero-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}

.ds-hero-meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}

.ds-hero-meta-label {
  font-size: .6rem;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 44%, transparent);
}

.ds-hero-meta-value {
  font-size: .9rem;
  line-height: 1.15;
  text-transform: uppercase;
  letter-spacing: .07em;
}

.ds-hero-actions {
  display: flex;
  justify-content: center;
}

.ds-hero-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: transparent;
  color: var(--glass-text);
  text-transform: uppercase;
  letter-spacing: .12em;
  font-size: .68rem;
  cursor: pointer;
}

.ds-cab-shell--brutalist {
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  padding-top: 18px;
}

.ds-create-card--brutalist,
.ds-empty-detail--brutalist {
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.ds-empty-detail--brutalist {
  min-height: 56vh;
}

.ds-inp { width: 100%; margin-bottom: 12px; }

@media (max-width: 900px) {
  .ds-hero-meta {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .ds-hero {
    min-height: auto;
    padding: 26px 14px;
  }
  .ds-hero-breadcrumbs {
    position: static;
    align-self: flex-start;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .ds-hero-title {
    font-size: clamp(2rem, 11vw, 4rem);
  }
}
</style>
