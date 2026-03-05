<template>
  <div class="cc-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>

    <template v-else>
      <!-- Filter bar -->
      <div class="ccf-bar glass-surface">
        <button
          v-for="f in FILTERS" :key="f.key"
          class="ccf-chip"
          :class="{ 'ccf-chip--active': activeFilter === f.key }"
          @click="activeFilter = f.key"
        >{{ f.label }}</button>
      </div>

      <div v-if="!filtered.length" class="cc-empty">
        {{ contractors?.length ? 'Нет исполнителей по выбранному фильтру' : 'Исполнители не назначены' }}
      </div>
      <div v-else class="cc-list">
        <div v-for="c in filtered" :key="c.id" class="cc-card glass-surface">
          <div class="cc-head">
            <div class="cc-head-row">
              <div class="cc-name">{{ c.name }}</div>
              <span v-if="c.verified" class="cc-verified" title="Верифицирован">✓ Верифицирован</span>
            </div>
            <div v-if="c.companyName" class="cc-sub">{{ c.companyName }}</div>
          </div>

          <!-- Rating stars -->
          <div v-if="c.rating && Number(c.rating) > 0" class="cc-rating">
            <span v-for="s in 5" :key="s" class="cc-rstar" :class="s <= Math.round(Number(c.rating)) ? 'cc-rstar--on' : ''">★</span>
            <span class="cc-rating-val">{{ Number(c.rating).toFixed(1) }}</span>
          </div>

          <!-- Meta row -->
          <div class="cc-meta" v-if="c.experienceYears || c.city || c.nextAvailableDate">
            <span v-if="c.experienceYears" class="cc-meta-item">{{ c.experienceYears }} лет опыта</span>
            <span v-if="c.city" class="cc-meta-item">📍 {{ c.city }}</span>
            <span v-if="c.nextAvailableDate" class="cc-meta-item cc-avail">
              📅 свободен с {{ fmtDate(c.nextAvailableDate) }}
            </span>
          </div>

          <div class="cc-chips" v-if="c.workTypes?.length">
            <span v-for="wt in c.workTypes" :key="wt" class="cc-chip">{{ workTypeLabel(wt) }}</span>
          </div>

          <div class="cc-contacts">
            <a v-if="c.phone" :href="`tel:${c.phone}`" class="cc-contact-item cc-contact--phone">
              <span class="cc-contact-icon">📞</span> {{ c.phone }}
            </a>
            <div v-if="c.messenger && c.messengerNick" class="cc-contact-item">
              <span class="cc-contact-icon">💬</span> {{ c.messenger }}: {{ c.messengerNick }}
            </div>
            <a v-if="c.website" :href="c.website" target="_blank" rel="noopener" class="cc-contact-item cc-contact--link">
              <span class="cc-contact-icon">🔗</span> {{ c.website }}
            </a>
          </div>

          <div v-if="c.notes" class="cc-notes">{{ c.notes }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { workTypeLabel } from '~~/shared/utils/work-status'

const props = defineProps<{ slug: string }>()

const reqHeaders = useRequestHeaders(['cookie'])
const { data: contractors, pending } = await useFetch<any[]>(
  () => `/api/projects/${props.slug}/contractors`,
  { headers: reqHeaders }
)

type FilterKey = 'all' | 'verified' | 'top_rated' | 'experienced' | 'soon'
const activeFilter = ref<FilterKey>('all')

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all',         label: 'Все' },
  { key: 'verified',    label: '✓ Верифицированные' },
  { key: 'top_rated',   label: '★ Рейтинг 4+' },
  { key: 'experienced', label: '🏅 Опыт 3+ лет' },
  { key: 'soon',        label: '📅 Ближайшее время' },
]

const filtered = computed(() => {
  const list = contractors.value || []
  switch (activeFilter.value) {
    case 'verified':    return list.filter(c => c.verified)
    case 'top_rated':   return list.filter(c => Number(c.rating) >= 4)
    case 'experienced': return list.filter(c => Number(c.experienceYears) >= 3)
    case 'soon':        return [...list].sort((a, b) => {
      if (!a.nextAvailableDate) return 1
      if (!b.nextAvailableDate) return -1
      return a.nextAvailableDate.localeCompare(b.nextAvailableDate)
    })
    default: return list
  }
})

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) }
  catch { return d }
}
</script>

<style scoped>
.cc-wrap { padding: 4px 0; }
.cc-empty  { font-size: .86rem; color: var(--glass-text); opacity: .5; padding: 12px 0; }

/* Filter bar */
.ccf-bar {
  display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 12px;
  margin-bottom: 14px; border-radius: 10px;
}
.ccf-chip {
  font-size: .7rem; padding: 4px 10px; border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-bg) 40%, transparent);
  cursor: pointer; color: var(--glass-text); opacity: .55;
  transition: opacity .12s, background .12s, border-color .12s;
  font-family: inherit;
}
.ccf-chip:hover { opacity: .85; }
.ccf-chip--active {
  opacity: 1; font-weight: 600;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  border-color: color-mix(in srgb, var(--glass-text) 22%, transparent);
}

.cc-list { display: grid; gap: 12px; }
.cc-card {
  border: 1px solid color-mix(in srgb, var(--glass-text) 9%, transparent);
  padding: 16px 18px; border-radius: 12px;
}
.cc-head { margin-bottom: 6px; }
.cc-head-row { display: flex; align-items: center; gap: 6px; }
.cc-name { font-size: .92rem; font-weight: 500; }
.cc-sub  { font-size: .78rem; opacity: .55; margin-top: 2px; }
.cc-verified {
  font-size: .65rem; color: #16a34a; font-weight: 700;
  background: color-mix(in srgb, #16a34a 10%, transparent);
  border: 1px solid color-mix(in srgb, #16a34a 20%, transparent);
  border-radius: 10px; padding: 1px 7px; white-space: nowrap;
}

/* Rating */
.cc-rating {
  display: flex; align-items: center; gap: 2px; margin-bottom: 6px;
}
.cc-rstar { font-size: .9rem; color: var(--glass-text); opacity: .2; }
.cc-rstar--on { opacity: 1; color: #f59e0b; }
.cc-rating-val { font-size: .72rem; opacity: .55; margin-left: 4px; }

/* Meta row */
.cc-meta {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;
}
.cc-meta-item { font-size: .7rem; opacity: .55; }
.cc-avail { color: #2563eb; opacity: .75; }

.cc-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.cc-chip {
  font-size: .7rem; padding: 2px 9px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 12px; opacity: .65;
}
.cc-contacts { display: flex; flex-direction: column; gap: 6px; }
.cc-contact-item {
  display: flex; align-items: center; gap: 7px;
  font-size: .82rem; text-decoration: none; color: var(--glass-text);
}
.cc-contact--phone:hover, .cc-contact--link:hover { text-decoration: underline; }
.cc-contact-icon { font-size: .78rem; }
.cc-notes {
  margin-top: 10px; font-size: .78rem; opacity: .55; font-style: italic;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  white-space: pre-line;
}
</style>
