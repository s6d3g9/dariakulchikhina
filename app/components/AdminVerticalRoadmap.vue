<template>
  <div class="avr-root">
    <div
      v-for="phase in PHASE_GROUPS"
      :key="phase.key"
      class="avr-phase"
    >
      <!-- ── Phase header — same height as .proj-sidenav-group-label ── -->
      <div
        class="avr-phase-hd"
        :class="{ 'avr-phase-hd--done': phaseDone(phase.key) }"
        :title="phase.name"
      >
        <span class="avr-badge">{{ phase.num }}</span>
      </div>

      <!-- ── Items — same height as .proj-sidenav-item ── -->
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
          <svg v-if="statusOf(pg.slug) === 'done'" viewBox="0 0 8 8" fill="none" width="9" height="9">
            <path d="M1.5 4l2 2 3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span v-else-if="statusOf(pg.slug) === 'in_progress'" class="avr-pip" />
        </button>
      </div>
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
/* ── Root — absolute, left of sidenav, zero layout impact ── */
.avr-root {
  position: absolute;
  left: -32px;
  top: 0;
  width: 26px;
  padding-top: 10px;
  padding-bottom: 24px;
  /* vertical progress line */
  background:
    linear-gradient(
      color-mix(in srgb, var(--glass-text) 8%, transparent),
      color-mix(in srgb, var(--glass-text) 8%, transparent)
    )
    center 21px / 1px calc(100% - 48px) no-repeat;
}

/* ── Phase group — same outer rhythm as .proj-sidenav-group ── */
.avr-phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* match .proj-sidenav-group: margin-bottom: 18px */
  margin-bottom: 18px;
}
.avr-phase:last-child { margin-bottom: 0; }

/* ── Phase header — mirrors .proj-sidenav-group-label height ──
   font-size: .62rem, line-height ~1.4 → ~14px + margin-bottom: 6px ── */
.avr-phase-hd {
  height: 20px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  width: 100%;
}

/* Phase number badge — same size as item dots */
.avr-badge {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--glass-bg, #12121a);
  border: 1px solid color-mix(in srgb, var(--glass-text) 22%, transparent);
  font-size: .5rem;
  font-weight: 700;
  color: var(--glass-text);
  opacity: .5;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  user-select: none;
  transition: opacity .15s, border-color .15s;
}
.avr-phase-hd--done .avr-badge {
  opacity: .85;
  border-color: color-mix(in srgb, var(--glass-text) 45%, transparent);
  background: color-mix(in srgb, var(--glass-text) 8%, var(--glass-bg, #12121a));
}

/* ── Item row — exact height of .proj-sidenav-item ──
   padding: 9px 10px → 18px + font 0.8rem*1.3 ≈ 16.6px = 34.6px → 35px ── */
.avr-item {
  height: 35px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  z-index: 1;
}

/* ── Dot — monochrome, same size as phase badge ── */
.avr-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  background: var(--glass-bg, #12121a);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: border-color .12s, background .12s, transform .1s;
}
.avr-dot:hover {
  border-color: color-mix(in srgb, var(--glass-text) 45%, transparent);
  transform: scale(1.18);
}
.avr-dot:disabled { opacity: .22; cursor: default; transform: none !important; }

/* done — subtly filled */
.avr-dot--done {
  background: color-mix(in srgb, var(--glass-text) 18%, var(--glass-bg, #12121a));
  border-color: color-mix(in srgb, var(--glass-text) 48%, transparent);
}
/* in_progress — stronger ring */
.avr-dot--in_progress {
  border-color: color-mix(in srgb, var(--glass-text) 38%, transparent);
}

/* Active current page */
.avr-item--active .avr-dot {
  border-color: color-mix(in srgb, var(--glass-text) 65%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--glass-text) 7%, transparent);
}
.avr-item--active .avr-dot:hover { transform: scale(1.22); }

/* In-progress pip */
.avr-pip {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--glass-text);
  opacity: .45;
  display: block;
  flex-shrink: 0;
}

/* Done checkmark */
.avr-dot--done svg { color: var(--glass-text); opacity: .6; }
</style>
