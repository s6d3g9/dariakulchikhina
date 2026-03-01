<template>
  <div class="acp-wrap">
    <div v-if="pendingLinked" class="acp-loading">Загрузка...</div>
    <template v-else>
      <!-- Linked contractors -->
      <div class="acp-section-title">подрядчики проекта</div>

      <div v-if="!linked.length" class="acp-empty">Подрядчики не привязаны. Добавьте из списка ниже.</div>
      <div v-for="c in linked" :key="c.id" class="acp-card">
        <div class="acp-card-top">
          <div class="acp-card-info">
            <div class="acp-name">{{ c.name }}</div>
            <div v-if="c.companyName" class="acp-sub">{{ c.companyName }}</div>
            <div class="acp-meta-row">
              <span v-if="c.phone">{{ c.phone }}</span>
              <span v-if="c.email">{{ c.email }}</span>
              <span v-if="c.messenger">{{ c.messenger }}: {{ c.messengerNick }}</span>
            </div>
            <div v-if="c.workTypes?.length" class="acp-chips">
              <span v-for="wt in c.workTypes" :key="wt" class="acp-chip">{{ workTypeLabel(wt) }}</span>
            </div>
            <div v-if="c.notes" class="acp-notes">{{ c.notes }}</div>
          </div>
          <div class="acp-card-actions">
            <a v-if="c.website" :href="c.website" target="_blank" class="acp-link">↗ сайт</a>
            <button class="acp-btn-unlink" @click="unlink(c.id)" :disabled="linking">× открепить</button>
          </div>
        </div>
      </div>

      <!-- Add contractor section -->
      <div class="acp-section-title" style="margin-top: 28px">добавить подрядчика к проекту</div>
      <div v-if="pendingAll" class="acp-loading">Загрузка...</div>
      <template v-else>
        <div v-if="!allContractors.length" class="acp-empty">
          Нет подрядчиков в системе.
          <NuxtLink :to="`/admin/contractors?projectSlug=${encodeURIComponent(props.slug)}`" class="acp-link">Добавить →</NuxtLink>
        </div>
        <template v-else>
          <div v-if="available.length === 0" class="acp-empty">Все подрядчики уже привязаны</div>
          <template v-else>
            <div class="acp-search-row">
              <input v-model="search" class="acp-search" placeholder="поиск по имени или компании..." />
            </div>
            <div v-for="c in filteredAvailable" :key="c.id" class="acp-card acp-card--avail">
              <div class="acp-card-top">
                <div class="acp-card-info">
                  <div class="acp-name">{{ c.name }}</div>
                  <div v-if="c.companyName" class="acp-sub">{{ c.companyName }}</div>
                  <div class="acp-meta-row">
                    <span v-if="c.phone">{{ c.phone }}</span>
                  </div>
                  <div v-if="c.workTypes?.length" class="acp-chips">
                    <span v-for="wt in c.workTypes" :key="wt" class="acp-chip acp-chip--muted">{{ workTypeLabel(wt) }}</span>
                  </div>
                </div>
                <button class="acp-btn-link" @click="link(c.id)" :disabled="linking">+ привязать</button>
              </div>
            </div>
            <div v-if="filteredAvailable.length === 0 && search" class="acp-empty">Ничего не найдено</div>
          </template>
        </template>
      </template>

      <div v-if="error" class="acp-error">{{ error }}</div>
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
.acp-wrap { padding: 4px 0; }
.acp-loading { font-size: .86rem; color: #999; padding: 12px 0; }
.acp-empty  { font-size: .84rem; color: #bbb; padding: 10px 0; }
.acp-error  { font-size: .8rem; color: #c00; margin-top: 12px; }

.acp-section-title {
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #aaa;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #e8e8e8;
}
.dark .acp-section-title { border-color: #2e2e2e; }

.acp-card {
  border: 1px solid #e4e4e4;
  padding: 14px 16px;
  margin-bottom: 8px;
  background: #fff;
}
.dark .acp-card { border-color: #2a2a2a; background: #1c1c1e; }
.acp-card--avail { border-style: dashed; background: transparent; }
.dark .acp-card--avail { border-color: #333; }

.acp-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.acp-card-info { flex: 1; min-width: 0; }
.acp-card-actions { flex-shrink: 0; display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }

.acp-name { font-size: .9rem; font-weight: 500; color: #1a1a1a; }
.dark .acp-name { color: #e8e8e8; }
.acp-sub  { font-size: .78rem; color: #999; margin-top: 1px; }
.acp-meta-row {
  display: flex; gap: 12px; flex-wrap: wrap;
  font-size: .76rem; color: #aaa; margin-top: 4px;
}
.acp-notes { font-size: .78rem; color: #888; margin-top: 6px; font-style: italic; }
.acp-link {
  font-size: .76rem; color: #6366f1; text-decoration: none;
}
.acp-link:hover { text-decoration: underline; }

.acp-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.acp-chip {
  font-size: .68rem; padding: 2px 7px;
  border: none;
  border-radius: 10px;
  color: #666;
  background: #fafafa;
}
.dark .acp-chip { color: #aaa; background: #222; }
.acp-chip--muted { opacity: 0.65; }

.acp-btn-link, .acp-btn-unlink {
  font-size: .76rem;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;
}
.acp-btn-link {
  border: none;
  background: transparent;
  color: #6366f1;
}
.acp-btn-link:hover:not(:disabled) { background: #6366f1; color: #fff; }
.acp-btn-unlink {
  border: none;
  background: transparent;
  color: #c00;
}
.acp-btn-unlink:hover:not(:disabled) { background: #fff0f0; }
.dark .acp-btn-unlink:hover:not(:disabled) { background: #2a0000; }
.acp-btn-link:disabled, .acp-btn-unlink:disabled { opacity: 0.45; cursor: not-allowed; }

.acp-search-row { margin-bottom: 10px; }
.acp-search {
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
.acp-search:focus { opacity: .92; }
</style>
