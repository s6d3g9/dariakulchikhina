<template>
  <div class="avr-root">
    <div class="avr-timeline">
      <template v-for="(phase, pi) in PHASE_GROUPS" :key="phase.key">
        <!-- Phase separator node -->
        <div
          class="avr-phase-node"
          :class="{ 'avr-phase-node--done': phaseDone(phase.key), 'avr-phase-node--first': pi === 0 }"
          :title="phase.name"
        >
          <span class="avr-phase-n">{{ phase.num }}</span>
        </div>
        <!-- Items -->
        <div
          v-for="pg in phase.pages"
          :key="pg.slug"
          class="avr-item"
          :class="{
            'avr-item--active': activePage === pg.slug,
            [`avr-item--${statusOf(pg.slug)}`]: true,
          }"
          :title="pg.title"
          @click="emit('navigate', pg.slug)"
        >
          <button
            class="avr-dot"
            :class="`avr-dot--${statusOf(pg.slug)}`"
            :disabled="saving[pg.slug]"
            @click.stop="toggleDone(pg)"
          >
            <svg v-if="statusOf(pg.slug) === 'done'" viewBox="0 0 10 10" fill="none" width="8" height="8">
              <path d="M2 5l2.5 2.5 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span v-else-if="statusOf(pg.slug) === 'in_progress'" class="avr-pip" />
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PROJECT_PAGES } from '~~/shared/constants/pages'
import { normalizeRoadmapStatus } from '~~/shared/utils/roadmap'

const props = defineProps<{ slug: string; activePage: string }>()
const emit = defineEmits<{ (e: 'navigate', slug: string): void }>()

// ── Phase config ──────────────────────────────────────────────────
const PHASE_GROUPS = [
  { key: 'lead',            num: '0', name: 'Инициация',      pages: PROJECT_PAGES.filter(p => p.phase === 'lead') },
  { key: 'concept',         num: '1', name: 'Эскиз',          pages: PROJECT_PAGES.filter(p => p.phase === 'concept') },
  { key: 'working_project', num: '2', name: 'Рабочий проект', pages: PROJECT_PAGES.filter(p => p.phase === 'working_project') },
  { key: 'procurement',     num: '3', name: 'Комплектация',   pages: PROJECT_PAGES.filter(p => p.phase === 'procurement') },
  { key: 'construction',    num: '4', name: 'Строительство',  pages: PROJECT_PAGES.filter(p => p.phase === 'construction') },
  { key: 'commissioning',   num: '5', name: 'Сдача',          pages: PROJECT_PAGES.filter(p => p.phase === 'commissioning') },
]

// ── Local status map — source of truth for rendering ─────────────
// key = page slug, value = 'pending' | 'in_progress' | 'done'
const localMap = reactive<Record<string, string>>({})
const saving    = reactive<Record<string, boolean>>({})
const loaded    = ref(false)

function statusOf(slug: string): string {
  return localMap[slug] || 'pending'
}

function phaseDone(phaseKey: string): boolean {
  const grp = PHASE_GROUPS.find(g => g.key === phaseKey)
  return grp ? grp.pages.every(p => statusOf(p.slug) === 'done') : false
}

// ── cycle: pending → in_progress → done → pending ────────────────
const CYCLE: Record<string, string> = { pending: 'in_progress', in_progress: 'done', done: 'pending' }

async function toggleDone(pg: { slug: string; title: string }) {
  if (saving[pg.slug]) return
  const next = CYCLE[statusOf(pg.slug)] || 'in_progress'

  // Instant visual update
  localMap[pg.slug] = next
  saving[pg.slug]   = true

  try {
    await $fetch(`/api/projects/${props.slug}/roadmap-stage`, {
      method: 'PATCH',
      body: { stageKey: pg.slug, title: pg.title, status: next },
    })
    // notify bus → AdminProjectPhase and /admin cards refresh
    useRoadmapBus().notifySaved()
  } catch {
    // revert on error
    localMap[pg.slug] = CYCLE[next] || 'pending'
  } finally {
    saving[pg.slug] = false
  }
}

// ── Load initial statuses from DB ─────────────────────────────────
async function loadStatuses() {
  try {
    const rows = await $fetch<any[]>(`/api/projects/${props.slug}/roadmap`)
    for (const row of rows) {
      if (row.stageKey) {
        localMap[row.stageKey] = normalizeRoadmapStatus(row.status)
      }
    }
  } finally {
    loaded.value = true
  }
}

onMounted(loadStatuses)

// Reload when AdminRoadmap or other component saves
const { lastSaved } = useRoadmapBus()
watch(lastSaved, loadStatuses)
</script>

<style scoped>
/* ── Container ── */
.avr-root {
  width: 40px;
  flex-shrink: 0;
  overflow-y: auto;
  max-height: calc(100vh - 180px);
  scrollbar-width: none;
  position: sticky;
  top: 80px;
  align-self: flex-start;
  padding-bottom: 24px;
}
.avr-root::-webkit-scrollbar { display: none; }

/* ── Timeline track ── */
.avr-timeline {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}
/* Continuous vertical background line */
.avr-timeline::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 14px;   /* start at center of first phase node */
  bottom: 17px;/* end at center of last item dot */
  width: 2px;
  transform: translateX(-50%);
  background: color-mix(in srgb, var(--glass-text) 13%, transparent);
  border-radius: 1px;
  z-index: 0;
}

/* ── Phase separator node ── */
.avr-phase-node {
  position: relative;
  z-index: 1;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--glass-bg, #1a1a2e);
  border: 1.5px solid color-mix(in srgb, var(--glass-text) 22%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  /* match sidenav group-label total height (~28px with margins) */
  margin: 8px 0 3px;
  flex-shrink: 0;
  transition: border-color .2s;
}
.avr-phase-node--first { margin-top: 10px; } /* match sidenav container top: 10px padding */
.avr-phase-node--done {
  border-color: rgba(16,185,129,.55);
  background: color-mix(in srgb, rgba(16,185,129,.15) 100%, var(--glass-bg));
}
.avr-phase-n {
  font-size: .5rem;
  font-weight: 700;
  color: var(--glass-text);
  opacity: .6;
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

/* ── Item row (matches sidenav-item height ~35px) ── */
.avr-item {
  position: relative;
  z-index: 1;
  width: 40px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

/* ── Dot button ── */
.avr-dot {
  position: relative;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1.5px solid color-mix(in srgb, var(--glass-text) 22%, transparent);
  background: var(--glass-bg, #1a1a2e);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background .13s, border-color .13s, transform .12s;
}
.avr-dot:hover        { transform: scale(1.35); }
.avr-dot:disabled     { opacity: .4; cursor: default; transform: none !important; }

.avr-dot--done        { background: rgba(16,185,129,.22); border-color: rgba(16,185,129,.65); }
.avr-dot--in_progress { background: rgba(245,158,11,.18); border-color: rgba(245,158,11,.7); }

/* Active item dot: slightly larger ring */
.avr-item--active .avr-dot {
  transform: scale(1.3);
  border-color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--glass-text) 10%, transparent);
}
.avr-item--active .avr-dot:hover { transform: scale(1.45); }

.avr-pip {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #f59e0b;
  display: block;
  flex-shrink: 0;
}
</style>
