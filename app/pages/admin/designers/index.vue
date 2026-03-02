<template>
  <div class="ds-root">
    <!-- ── Header bar ── -->
    <div class="ds-topbar glass-card">
      <div class="ds-topbar-left">
        <span class="ds-topbar-title">дизайнеры</span>
        <span class="ds-count">{{ allDesigners?.length ?? 0 }}</span>
      </div>
      <div class="ds-topbar-right">
        <input v-model="searchQuery" class="ds-search glass-input" placeholder="поиск..." />
        <button class="a-btn-sm" @click="showCreate = true">+ добавить</button>
      </div>
    </div>

    <!-- ── Create dialog ── -->
    <div v-if="showCreate" class="ds-create glass-card">
      <div class="ds-create-head">
        <span>Новый дизайнер</span>
        <button class="ds-create-close" @click="showCreate = false">✕</button>
      </div>
      <div class="ds-create-body">
        <input v-model="newName" class="glass-input ds-create-inp" placeholder="Имя / Студия" @keydown.enter="doCreate" />
      </div>
      <div class="ds-create-foot">
        <button class="a-btn-sm ds-btn-primary" :disabled="!newName.trim() || creating" @click="doCreate">
          {{ creating ? 'Создание…' : 'Создать' }}
        </button>
        <button class="a-btn-sm" @click="showCreate = false">Отмена</button>
      </div>
    </div>

    <!-- ── Loading ── -->
    <div v-if="pending" class="ds-empty">
      <span class="ds-empty-icon">⏳</span>Загрузка…
    </div>
    <div v-else-if="!allDesigners?.length && !showCreate" class="ds-empty">
      <span class="ds-empty-icon">🎨</span>
      <span>Дизайнеры не добавлены</span>
      <button class="a-btn-sm" style="margin-top:6px" @click="showCreate = true">+ добавить первого</button>
    </div>

    <!-- ── Designer cards ── -->
    <div v-else-if="!selectedDesignerId" class="ds-grid">
      <div
        v-for="d in filteredDesigners"
        :key="d.id"
        class="ds-card glass-card"
      >
        <div class="ds-card-row">
          <div class="ds-card-avatar">{{ d.name?.charAt(0)?.toUpperCase() || '?' }}</div>
          <div class="ds-card-info">
            <div class="ds-card-name">{{ d.name }}</div>
            <div class="ds-card-meta">
              <span v-if="d.city">{{ d.city }}</span>
              <span v-if="d.phone">{{ d.phone }}</span>
              <span v-if="d.email">{{ d.email }}</span>
            </div>
          </div>
          <div class="ds-card-actions">
            <button class="a-btn-sm ds-btn-cabinet" @click="selectedDesignerId = d.id">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 15L21 3M21 9v12H3V3h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              кабинет
            </button>
            <button class="a-btn-sm a-btn-danger" @click="deleteDesigner(d.id)">×</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Designer Cabinet (embedded) ── -->
    <div v-if="selectedDesignerId" class="ds-cabinet-wrap">
      <div class="ds-cabinet-back">
        <button class="a-btn-sm" @click="selectedDesignerId = null">← к списку дизайнеров</button>
      </div>
      <AdminDesignerCabinet :designer-id="selectedDesignerId" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

const { data: allDesigners, pending, refresh } = useFetch<any[]>('/api/designers', { default: () => [] })

const searchQuery = ref('')
const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
const selectedDesignerId = ref<number | null>(null)

const filteredDesigners = computed(() => {
  if (!searchQuery.value) return allDesigners.value
  const q = searchQuery.value.toLowerCase()
  return allDesigners.value.filter((d: any) =>
    d.name?.toLowerCase().includes(q) ||
    d.city?.toLowerCase().includes(q) ||
    d.email?.toLowerCase().includes(q)
  )
})

async function doCreate() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    await $fetch('/api/designers', { method: 'POST', body: { name: newName.value.trim() } })
    await refresh()
    newName.value = ''
    showCreate.value = false
  } finally {
    creating.value = false
  }
}

async function deleteDesigner(id: number) {
  if (!confirm('Удалить дизайнера?')) return
  await $fetch(`/api/designers/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<style scoped>
.ds-root { padding: 0; }
.ds-topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; margin-bottom: 16px; border-radius: 12px;
}
.ds-topbar-left { display: flex; align-items: center; gap: 10px; }
.ds-topbar-title { font-size: 1.1rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.ds-count {
  background: rgba(100,108,255,.12); color: #a0a8ff; font-size: .75rem;
  padding: 2px 10px; border-radius: 10px;
}
.ds-topbar-right { display: flex; align-items: center; gap: 10px; }
.ds-search { width: 200px; }

.ds-create { padding: 20px; border-radius: 12px; margin-bottom: 16px; }
.ds-create-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-weight: 600; }
.ds-create-close { background: none; border: none; color: var(--c-text-muted, #888); cursor: pointer; font-size: 1.2rem; }
.ds-create-body { margin-bottom: 14px; }
.ds-create-inp { width: 100%; }
.ds-create-foot { display: flex; gap: 10px; }
.ds-btn-primary { background: #646cff !important; color: #fff !important; }

.ds-empty { text-align: center; padding: 48px; color: var(--c-text-muted, #888); display: flex; flex-direction: column; align-items: center; gap: 8px; }
.ds-empty-icon { font-size: 2rem; }

.ds-grid { display: flex; flex-direction: column; gap: 10px; }
.ds-card { padding: 16px 20px; border-radius: 12px; }
.ds-card-row { display: flex; align-items: center; gap: 16px; }
.ds-card-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: linear-gradient(135deg, #646cff, #b060ff);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; font-weight: 700; color: #fff; flex-shrink: 0;
}
.ds-card-info { flex: 1; }
.ds-card-name { font-weight: 600; font-size: 1rem; }
.ds-card-meta { display: flex; gap: 14px; font-size: .82rem; color: var(--c-text-muted, #888); margin-top: 2px; }
.ds-card-actions { display: flex; gap: 8px; }
.ds-btn-cabinet {
  display: flex; align-items: center; gap: 4px;
  background: rgba(100,108,255,.1) !important; color: #a0a8ff !important;
}

.ds-cabinet-wrap { margin-top: 0; }
.ds-cabinet-back { margin-bottom: 14px; }

/* ── Mobile ── */
@media (max-width: 768px) {
  .ds-topbar {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
    padding: 12px;
  }
  .ds-topbar-right {
    flex-direction: column;
    gap: 8px;
  }
  .ds-search { width: 100%; }
  .ds-card { padding: 12px; }
  .ds-card-row {
    flex-wrap: wrap;
    gap: 10px;
  }
  .ds-card-meta { gap: 8px; flex-wrap: wrap; }
  .ds-card-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
