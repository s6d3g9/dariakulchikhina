<template>
  <div class="acnp-wrap">
    <div v-if="pendingLinked" class="acnp-loading">Загрузка...</div>
    <template v-else>
      <!-- Linked contractors -->
      <div class="acnp-section-title">подрядчики проекта</div>

      <div v-if="!linked.length" class="acnp-empty">Подрядчики не привязаны. Добавьте из списка ниже.</div>
      <div v-for="c in linked" :key="c.id" class="acnp-card">
        <div class="acnp-card-top">
          <div class="acnp-card-info">
            <div class="acnp-name">{{ c.name }}</div>
            <div v-if="c.companyName" class="acnp-sub">{{ c.companyName }}</div>
            <div class="acnp-meta-row">
              <span v-if="c.phone">{{ c.phone }}</span>
              <span v-if="c.email">{{ c.email }}</span>
              <span v-if="c.messenger">{{ c.messenger }}: {{ c.messengerNick }}</span>
            </div>
            <div v-if="c.workTypes?.length" class="acnp-chips">
              <span v-for="wt in c.workTypes" :key="wt" class="acnp-chip">{{ workTypeLabel(wt) }}</span>
            </div>
            <div v-if="c.notes" class="acnp-notes">{{ c.notes }}</div>
          </div>
          <div class="acnp-card-actions">
            <a v-if="c.website" :href="c.website" target="_blank" class="acnp-link">↗ сайт</a>
            <button class="acnp-btn-unlink" @click="unlink(c.id)" :disabled="linking">× открепить</button>
          </div>
        </div>
      </div>

      <!-- Add contractor section -->
      <div class="acnp-section-title" style="margin-top: 28px">добавить подрядчика к проекту</div>
      <div v-if="pendingAll" class="acnp-loading">Загрузка...</div>
      <template v-else>
        <div v-if="!allContractors.length" class="acnp-empty">
          Нет подрядчиков в системе.
          <NuxtLink :to="`/admin/contractors?projectSlug=${encodeURIComponent(props.slug)}`" class="acnp-link">Добавить →</NuxtLink>
        </div>
        <template v-else>
          <div v-if="available.length === 0" class="acnp-empty">Все подрядчики уже привязаны</div>
          <template v-else>
            <div class="acnp-search-row">
              <input v-model="search" class="acnp-search" placeholder="поиск по имени или компании..." />
            </div>
            <div v-for="c in filteredAvailable" :key="c.id" class="acnp-card acnp-card--avail">
              <div class="acnp-card-top">
                <div class="acnp-card-info">
                  <div class="acnp-name">{{ c.name }}</div>
                  <div v-if="c.companyName" class="acnp-sub">{{ c.companyName }}</div>
                  <div class="acnp-meta-row">
                    <span v-if="c.phone">{{ c.phone }}</span>
                  </div>
                  <div v-if="c.workTypes?.length" class="acnp-chips">
                    <span v-for="wt in c.workTypes" :key="wt" class="acnp-chip acnp-chip--muted">{{ workTypeLabel(wt) }}</span>
                  </div>
                </div>
                <button class="acnp-btn-link" @click="link(c.id)" :disabled="linking">+ привязать</button>
              </div>
            </div>
            <div v-if="filteredAvailable.length === 0 && search" class="acnp-empty">Ничего не найдено</div>
          </template>
        </template>
      </template>

      <div v-if="error" class="acnp-error">{{ error }}</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { workTypeLabel } from '~~/shared/utils/work-status'

const props = defineProps<{ slug: string }>()

const { data: linked, pending: pendingLinked, refresh: refreshLinked } = await useFetch<any[]>(
  () => `/api/projects/${props.slug}/contractors`, { server: false, default: () => [] }
)
const { data: allContractors, pending: pendingAll } = await useFetch<any[]>(
  '/api/contractors', { server: false, default: () => [] }
)

const linking = ref(false)
const error = ref('')
const search = ref('')

const linkedIds = computed(() => new Set((linked.value || []).map((c: any) => c.id)))

const available = computed(() =>
  (allContractors.value || []).filter((c: any) => !linkedIds.value.has(c.id))
)

const filteredAvailable = computed(() => {
  if (!search.value.trim()) return available.value
  const q = search.value.toLowerCase()
  return available.value.filter((c: any) =>
    c.name?.toLowerCase().includes(q) || c.companyName?.toLowerCase().includes(q)
  )
})

async function link(contractorId: number) {
  linking.value = true
  error.value = ''
  try {
    await $fetch(`/api/projects/${props.slug}/contractors`, {
      method: 'POST', body: { contractorId }
    })
    await refreshLinked()
  } catch (e: any) {
    error.value = e.data?.message || 'Ошибка'
  } finally {
    linking.value = false
  }
}

async function unlink(contractorId: number) {
  if (!confirm('Открепить подрядчика от проекта?')) return
  linking.value = true
  error.value = ''
  try {
    await $fetch(`/api/projects/${props.slug}/contractors/${contractorId}`, { method: 'DELETE' })
    await refreshLinked()
  } catch (e: any) {
    error.value = e.data?.message || 'Ошибка'
  } finally {
    linking.value = false
  }
}
</script>

<style scoped>
.acnp-wrap { padding: 4px 0; }
.acnp-loading { font-size: .86rem; color: #999; padding: 12px 0; }
.acnp-empty  { font-size: .84rem; color: #bbb; padding: 10px 0; }
.acnp-error  { font-size: .8rem; color: var(--ds-error, #c00); margin-top: 12px; }

.acnp-section-title {
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #aaa;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e8e8e8;
}
.dark .acnp-section-title { border-color: #2e2e2e; }

.acnp-card {
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  padding: 14px 16px;
  margin-bottom: 8px;
  background: color-mix(in srgb, var(--glass-bg) 80%, transparent);
  border-radius: var(--card-radius, 10px);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.acnp-card--avail { border-style: dashed; background: transparent; }

.acnp-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.acnp-card-info { flex: 1; min-width: 0; }
.acnp-card-actions { flex-shrink: 0; display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }

.acnp-name { font-size: .9rem; font-weight: 500; color: var(--glass-text); }
.acnp-sub  { font-size: .78rem; color: color-mix(in srgb, var(--glass-text) 55%, transparent); margin-top: 1px; }
.acnp-meta-row {
  display: flex; gap: 12px; flex-wrap: wrap;
  font-size: .76rem; color: color-mix(in srgb, var(--glass-text) 45%, transparent); margin-top: 4px;
}
.acnp-notes { font-size: .78rem; color: color-mix(in srgb, var(--glass-text) 50%, transparent); margin-top: 6px; font-style: italic; }
.acnp-link {
  font-size: .76rem; color: var(--ds-accent, #6366f1); text-decoration: none;
}
.acnp-link:hover { text-decoration: underline; }

.acnp-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.acnp-chip {
  font-size: .68rem; padding: 2px 7px;
  border: none;
  border-radius: var(--chip-radius, 999px);
  color: color-mix(in srgb, var(--glass-text) 60%, transparent);
  background: color-mix(in srgb, var(--glass-text) 7%, transparent);
}
.acnp-chip--muted { opacity: 0.65; }

.acnp-btn-link, .acnp-btn-unlink {
  font-size: .76rem;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;
}
.acnp-btn-link {
  border: none;
  background: transparent;
  color: var(--ds-accent, #6366f1);
}
.acnp-btn-link:hover:not(:disabled) { background: var(--ds-accent, #6366f1); color: #fff; }
.acnp-btn-unlink {
  border: none;
  background: transparent;
  color: var(--ds-error, #c00);
}
.acnp-btn-unlink:hover:not(:disabled) { background: color-mix(in srgb, var(--ds-error, #c00) 8%, transparent); }
.dark .acnp-btn-unlink:hover:not(:disabled) { background: #2a0000; }
.acnp-btn-link:disabled, .acnp-btn-unlink:disabled { opacity: 0.45; cursor: not-allowed; }

.acnp-search-row { margin-bottom: 10px; }
.acnp-search {
  width: 100%; max-width: 400px;
  border: none;
  border-radius: 4px;
  padding: 7px 12px;
  font-size: .84rem;
  font-family: inherit;
  outline: none;
  background: transparent;
  color: inherit;
}
.acnp-search:focus { opacity: .92; }

/* ── Mobile ── */
@media (max-width: 768px) {
  .acnp-card { padding: 12px; }
  .acnp-card-top {
    flex-direction: column;
    gap: 8px;
  }
  .acnp-card-actions {
    flex-direction: row;
    width: 100%;
    justify-content: flex-end;
  }
  .acnp-search { max-width: none; }
  .acnp-meta-row { gap: 8px; }
}
</style>
