<template>
  <div class="sl-root">
    <!-- Topbar -->
    <div class="sl-topbar">
      <div class="sl-topbar-left">
        <h1 class="sl-title">Поставщики</h1>
        <span class="sl-total-badge">{{ filtered.length }}</span>
      </div>
      <div class="sl-topbar-right">
        <div class="sl-search-wrap">
          <svg class="sl-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <input v-model="search" class="sl-search glass-input" placeholder="поиск..." />
        </div>
        <select v-model="catFilter" class="glass-input sl-cat-sel">
          <option value="">все категории</option>
          <option v-for="c in CATEGORIES" :key="c.key" :value="c.key">{{ c.label }}</option>
        </select>
        <select v-model="statusFilter" class="glass-input sl-cat-sel">
          <option value="">все статусы</option>
          <option value="active">активный</option>
          <option value="inactive">неактивный</option>
          <option value="potential">потенциальный</option>
        </select>
        <button class="sl-btn-add" @click="showCreate = true">+ добавить</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="sl-skeletons">
      <div v-for="i in 6" :key="i" class="sl-skel glass-card" />
    </div>

    <!-- Empty -->
    <div v-else-if="!filtered.length" class="sl-empty">
      <span>Поставщики не найдены</span>
    </div>

    <!-- Grid -->
    <div v-else class="sl-grid">
      <NuxtLink
        v-for="s in filtered"
        :key="s.id"
        :to="`/admin/sellers/${s.id}`"
        class="sl-card glass-card glass-surface"
        :class="`sl-card--${s.status}`"
      >
        <div class="sl-card-head">
          <div class="sl-card-logo">{{ s.name.charAt(0).toUpperCase() }}</div>
          <div class="sl-card-info">
            <div class="sl-card-name">{{ s.name }}</div>
            <div v-if="s.companyName" class="sl-card-company">{{ s.companyName }}</div>
          </div>
          <div class="sl-card-badges">
            <span class="sl-badge" :class="`sl-badge--${s.type}`">{{ s.type === 'marketplace' ? 'партнёр' : 'ссылка' }}</span>
            <span class="sl-badge sl-badge--status" :class="`sl-badge-status--${s.status}`">
              {{ { active: 'активный', inactive: 'неактивный', potential: 'потенциальный' }[s.status] ?? s.status }}
            </span>
          </div>
        </div>

        <div v-if="s.city || s.website" class="sl-card-contacts">
          <span v-if="s.city" class="sl-contact">📍 {{ s.city }}</span>
          <a v-if="s.website" :href="s.website" target="_blank" class="sl-contact sl-contact--link" @click.stop>🌐 сайт</a>
        </div>

        <div v-if="s.categories?.length" class="sl-card-cats">
          <span v-for="cat in s.categories.slice(0, 5)" :key="cat" class="sl-cat-tag">
            {{ CATEGORIES.find(c => c.key === cat)?.label ?? cat }}
          </span>
          <span v-if="s.categories.length > 5" class="sl-cat-more">+{{ s.categories.length - 5 }}</span>
        </div>

        <div v-if="s.projectCount" class="sl-card-footer">
          <span class="sl-proj-count">{{ s.projectCount }} {{ projectsWord(s.projectCount) }}</span>
        </div>
      </NuxtLink>
    </div>

    <!-- Create modal -->
    <Teleport to="body">
      <div v-if="showCreate" class="sl-backdrop" @click.self="showCreate = false">
        <div class="sl-modal glass-surface">
          <div class="sl-modal-head">
            <span>Новый поставщик</span>
            <button class="a-btn-sm" @click="showCreate = false">✕</button>
          </div>
          <div class="sl-modal-body">
            <label class="sl-lbl">Название *</label>
            <input v-model="newForm.name" class="glass-input" placeholder="Название магазина/компании" @keydown.enter="doCreate" />
            <label class="sl-lbl">Тип</label>
            <select v-model="newForm.type" class="glass-input">
              <option value="link">Ссылка (для клиентов)</option>
              <option value="marketplace">Партнёр (маркетплейс)</option>
            </select>
          </div>
          <div class="sl-modal-foot">
            <button class="a-btn-sm" @click="showCreate = false">отмена</button>
            <button class="a-btn-save" :disabled="!newForm.name.trim() || creating" @click="doCreate">
              {{ creating ? '…' : 'создать' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

const CATEGORIES = [
  { key: 'finish',    label: 'Отделочные материалы' },
  { key: 'plumbing',  label: 'Сантехника' },
  { key: 'electrical',label: 'Электрика' },
  { key: 'lighting',  label: 'Освещение' },
  { key: 'furniture', label: 'Мебель' },
  { key: 'textile',   label: 'Текстиль' },
  { key: 'decor',     label: 'Декор' },
  { key: 'windows',   label: 'Двери и окна' },
  { key: 'climate',   label: 'Климат (кондиционеры)' },
  { key: 'kitchen',   label: 'Кухни' },
  { key: 'bathroom',  label: 'Ванные комнаты' },
  { key: 'flooring',  label: 'Напольные покрытия' },
  { key: 'paint',     label: 'Краски и покрытия' },
  { key: 'other',     label: 'Прочее' },
]

const search       = ref('')
const catFilter    = ref('')
const statusFilter = ref('')
const showCreate   = ref(false)
const creating     = ref(false)
const newForm      = reactive({ name: '', type: 'link' })

const { data: sellersData, pending, refresh } = await useFetch<any[]>('/api/sellers', { server: false, default: () => [] })

const filtered = computed(() => {
  let list = sellersData.value ?? []
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter((s: any) => s.name?.toLowerCase().includes(q) || s.companyName?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q))
  }
  if (catFilter.value) list = list.filter((s: any) => (s.categories ?? []).includes(catFilter.value))
  if (statusFilter.value) list = list.filter((s: any) => s.status === statusFilter.value)
  return list
})

function projectsWord(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return 'проект'
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'проекта'
  return 'проектов'
}

const router = useRouter()
async function doCreate() {
  if (!newForm.name.trim()) return
  creating.value = true
  try {
    const created = await $fetch<any>('/api/sellers', { method: 'POST', body: { name: newForm.name.trim(), type: newForm.type } })
    showCreate.value = false
    newForm.name = ''
    newForm.type = 'link'
    router.push(`/admin/sellers/${created.id}`)
  } finally { creating.value = false }
}
</script>

<style scoped>
.sl-root { display: flex; flex-direction: column; gap: 16px; }

.sl-topbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 10px 0; }
.sl-topbar-left { display: flex; align-items: center; gap: 10px; }
.sl-title { font-size: .8rem; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; opacity: .7; margin: 0; }
.sl-total-badge { font-size: .7rem; font-weight: 700; background: color-mix(in srgb, var(--glass-text) 10%, transparent); border: 1px solid var(--glass-border); border-radius: 20px; padding: 1px 8px; }
.sl-topbar-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.sl-search-wrap { position: relative; display: flex; align-items: center; }
.sl-search-icon { position: absolute; left: 9px; opacity: .4; pointer-events: none; }
.sl-search { padding-left: 28px !important; width: 200px; height: 32px; font-size: .78rem; }
.sl-cat-sel { height: 32px; font-size: .75rem; padding: 0 10px; border-radius: 8px; }

.sl-btn-add { height: 32px; padding: 0 14px; border-radius: 8px; background: var(--glass-text); color: var(--glass-bg); border: none; font-size: .75rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
.sl-btn-add:hover { opacity: .85; }

.sl-skeletons { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.sl-skel { height: 130px; border-radius: 14px; background: color-mix(in srgb, var(--glass-text) 5%, transparent); animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: .7 } 50% { opacity: .4 } }

.sl-empty { text-align: center; padding: 60px 0; font-size: .8rem; opacity: .4; }

.sl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }

.sl-card { padding: 16px; border-radius: 14px; cursor: pointer; text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 10px; transition: transform .12s, box-shadow .12s; }
.sl-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.12); }

.sl-card-head { display: flex; align-items: flex-start; gap: 10px; }
.sl-card-logo { width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0; background: color-mix(in srgb, var(--glass-text) 12%, transparent); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; font-size: .88rem; font-weight: 700; }
.sl-card-info { flex: 1; min-width: 0; }
.sl-card-name { font-size: .84rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sl-card-company { font-size: .72rem; opacity: .5; }
.sl-card-badges { display: flex; gap: 5px; flex-direction: column; align-items: flex-end; }

.sl-badge { font-size: .6rem; font-weight: 700; padding: 2px 7px; border-radius: 20px; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
.sl-badge--marketplace { background: rgba(99,102,241,.15); border: 1px solid rgba(99,102,241,.35); color: #6366f1; }
.sl-badge--link        { background: color-mix(in srgb, var(--glass-text) 8%, transparent); border: 1px solid var(--glass-border); }
.sl-badge-status--active    { background: rgba(16,185,129,.12); border: 1px solid rgba(16,185,129,.3); color: #059669; }
.sl-badge-status--inactive  { background: color-mix(in srgb, var(--glass-text) 6%, transparent); border: 1px solid var(--glass-border); opacity: .7; }
.sl-badge-status--potential { background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.35); color: #d97706; }

.sl-card-contacts { display: flex; gap: 10px; flex-wrap: wrap; }
.sl-contact { font-size: .72rem; opacity: .6; }
.sl-contact--link { color: #6366f1; text-decoration: none; opacity: 1; }
.sl-contact--link:hover { text-decoration: underline; }

.sl-card-cats { display: flex; flex-wrap: wrap; gap: 4px; }
.sl-cat-tag { font-size: .62rem; padding: 2px 7px; border-radius: 20px; background: color-mix(in srgb, var(--glass-text) 7%, transparent); border: 1px solid var(--glass-border); }
.sl-cat-more { font-size: .62rem; opacity: .45; padding: 2px 6px; }

.sl-card-footer { border-top: 1px solid var(--glass-border); padding-top: 8px; }
.sl-proj-count { font-size: .68rem; opacity: .5; }

/* Modal */
.sl-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 200; }
.sl-modal { padding: 24px; width: 380px; max-width: 90vw; border-radius: 16px; display: flex; flex-direction: column; gap: 14px; }
.sl-modal-head { display: flex; align-items: center; justify-content: space-between; font-size: .84rem; font-weight: 600; }
.sl-modal-body { display: flex; flex-direction: column; gap: 8px; }
.sl-lbl { font-size: .68rem; text-transform: uppercase; letter-spacing: .08em; opacity: .5; }
.sl-modal-foot { display: flex; justify-content: flex-end; gap: 8px; }
.a-btn-save { height: 34px; padding: 0 18px; border-radius: 8px; background: var(--glass-text); color: var(--glass-bg); border: none; font-size: .78rem; font-weight: 600; cursor: pointer; }
.a-btn-save:disabled { opacity: .4; cursor: not-allowed; }
</style>
