<template>
  <div class="avr-root">
    <div v-for="phase in PHASE_GROUPS" :key="phase.key" class="avr-phase">
      <div class="avr-phase-hd">
        <span class="avr-phase-num">{{ phase.num }}</span>
        <span class="avr-phase-name">{{ phase.name }}</span>
        <span v-if="phaseDone(phase.key)" class="avr-phase-done-icon">✓</span>
      </div>
      <div
        v-for="pg in phase.pages"
        :key="pg.slug"
        class="avr-item"
        :class="{
          'avr-item--active': activePage === pg.slug,
          [`avr-item--${statusOf(pg.slug)}`]: true,
        }"
        @click="emit('navigate', pg.slug)"
      >
        <button
          class="avr-dot"
          :class="`avr-dot--${statusOf(pg.slug)}`"
          :title="dotTitle(pg.slug)"
          :disabled="saving === pg.slug"
          @click.stop="cycleStatus(pg)"
        >
          <svg v-if="statusOf(pg.slug) === 'done'" class="avr-dot-check" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span v-else-if="statusOf(pg.slug) === 'in_progress'" class="avr-dot-pip" />
        </button>
        <span class="avr-item-title">{{ pg.title }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PROJECT_PAGES } from '~~/shared/constants/pages'
import { normalizeRoadmapStatus } from '~~/shared/utils/roadmap'

const props = defineProps<{
  slug: string
  activePage: string
}>()

const emit = defineEmits<{
  (e: 'navigate', pageSlug: string): void
}>()

const PHASE_GROUPS = [
  { key: 'lead',            num: '0', name: 'Инициация',      pages: PROJECT_PAGES.filter(p => p.phase === 'lead') },
  { key: 'concept',         num: '1', name: 'Эскиз',          pages: PROJECT_PAGES.filter(p => p.phase === 'concept') },
  { key: 'working_project', num: '2', name: 'Рабочий проект', pages: PROJECT_PAGES.filter(p => p.phase === 'working_project') },
  { key: 'procurement',     num: '3', name: 'Комплектация',   pages: PROJECT_PAGES.filter(p => p.phase === 'procurement') },
  { key: 'construction',    num: '4', name: 'Строительство',  pages: PROJECT_PAGES.filter(p => p.phase === 'construction') },
  { key: 'commissioning',   num: '5', name: 'Сдача',          pages: PROJECT_PAGES.filter(p => p.phase === 'commissioning') },
]

const { lastSaved } = useRoadmapBus()

const { data: stages, refresh } = useFetch<any[]>(
  () => `/api/projects/${props.slug}/roadmap`,
  { server: false, default: () => [] },
)

watch(lastSaved, () => refresh())

const statusMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const s of (stages.value || [])) {
    if (s.stageKey) map[s.stageKey] = normalizeRoadmapStatus(s.status)
  }
  return map
})

function statusOf(pageSlug: string): string {
  return statusMap.value[pageSlug] || 'pending'
}

function phaseDone(phaseKey: string): boolean {
  const grp = PHASE_GROUPS.find(g => g.key === phaseKey)
  if (!grp) return false
  return grp.pages.every(p => statusOf(p.slug) === 'done')
}

function dotTitle(slug: string): string {
  const s = statusOf(slug)
  if (s === 'done') return 'Готово · нажать чтобы сбросить'
  if (s === 'in_progress') return 'В работе · нажать чтобы отметить готово'
  return 'Ожидание · нажать чтобы начать'
}

const saving = ref<string | null>(null)
const CYCLE: Record<string, string> = { pending: 'in_progress', in_progress: 'done', done: 'pending' }

async function cycleStatus(pg: { slug: string; title: string }) {
  const cur = statusOf(pg.slug)
  const next = CYCLE[cur] || 'in_progress'
  saving.value = pg.slug

  // Optimistic update
  const idx = (stages.value || []).findIndex((s: any) => s.stageKey === pg.slug)
  if (idx >= 0) {
    stages.value![idx] = { ...stages.value![idx], status: next }
  } else {
    stages.value = [...(stages.value || []), { stageKey: pg.slug, status: next }]
  }

  try {
    await $fetch(`/api/projects/${props.slug}/roadmap-stage`, {
      method: 'PATCH',
      body: { stageKey: pg.slug, title: pg.title, status: next },
    })
    useRoadmapBus().notifySaved()
  } finally {
    saving.value = null
    await refresh()
  }
}
</script>

<style scoped>
.avr-root {
  width: 172px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 8px 24px 0;
  overflow-y: auto;
  max-height: calc(100vh - 180px);
  scrollbar-width: none;
  position: sticky;
  top: 0;
  align-self: flex-start;
}
.avr-root::-webkit-scrollbar { display: none; }

.avr-phase { display: flex; flex-direction: column; }

.avr-phase-hd {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 4px 3px;
}

.avr-phase-num {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .56rem;
  font-weight: 700;
  color: var(--glass-text);
  opacity: .5;
  flex-shrink: 0;
}

.avr-phase-name {
  font-size: .6rem;
  text-transform: uppercase;
  letter-spacing: .4px;
  color: var(--glass-text);
  opacity: .36;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.avr-phase-done-icon {
  font-size: .56rem;
  color: #10b981;
  opacity: .8;
  flex-shrink: 0;
}

.avr-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 4px 6px;
  border-radius: 7px;
  cursor: pointer;
  transition: background .13s;
}

.avr-item:hover { background: color-mix(in srgb, var(--glass-text) 6%, transparent); }
.avr-item--active { background: color-mix(in srgb, var(--glass-text) 9%, transparent); }

.avr-item-title {
  font-size: .67rem;
  color: var(--glass-text);
  opacity: .45;
  line-height: 1.3;
  min-width: 0;
  flex: 1;
  transition: opacity .15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.avr-item--active .avr-item-title { opacity: .88; }
.avr-item--done .avr-item-title { opacity: .55; }
.avr-item--in_progress .avr-item-title { opacity: .92; }

.avr-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1.5px solid color-mix(in srgb, var(--glass-text) 20%, transparent);
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background .13s, border-color .13s, transform .1s;
}
.avr-dot:hover { transform: scale(1.25); }
.avr-dot:disabled { opacity: .35; cursor: default; transform: none; }

.avr-dot--done { background: rgba(16,185,129,.2); border-color: rgba(16,185,129,.55); }
.avr-dot--in_progress { background: rgba(245,158,11,.18); border-color: rgba(245,158,11,.6); }

.avr-dot-check { width: 9px; height: 9px; color: #10b981; }
.avr-dot-pip { width: 5px; height: 5px; border-radius: 50%; background: #f59e0b; display: block; }
</style>
