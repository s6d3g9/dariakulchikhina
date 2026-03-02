<template>
  <div class="avr-root">
    <div
      v-for="phase in PHASE_GROUPS"
      :key="phase.key"
      class="avr-phase"
    >
      <!-- ── Phase header — large survey-mark node ── -->
      <div
        class="avr-phase-hd"
        :class="{ 'avr-phase-hd--done': phaseDone(phase.key) }"
        :title="phase.name"
      >
        <!-- outer ring -->
        <span class="avr-badge">
          <!-- inner centre dot -->
          <span class="avr-badge-core" />
          <!-- label -->
          <span class="avr-badge-n">{{ phase.num }}</span>
        </span>
      </div>

      <!-- ── Items — small precise graduation dots ── -->
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
          <svg v-if="statusOf(pg.slug) === 'done'" viewBox="0 0 8 8" fill="none" width="7" height="7">
            <path d="M1.5 4l2 2 3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
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
/*
  Architectural scale / survey staff aesthetic:
  ─ Phase nodes  : large concentric-ring markers (major graduation)
  ─ Sub-item dots: small single-ring marks   (minor graduation)
  ─ Spine        : 1 px dead-centre line
*/

/* ── Root — absolute overlay, zero layout shift ── */
.avr-root {
  position: absolute;
  left: -36px;
  top: 0;
  width: 30px;
  padding-top: 10px;
  padding-bottom: 24px;
  /* 1 px spine — starts below first phase badge, ends above last dot */
  background:
    linear-gradient(
      color-mix(in srgb, var(--glass-text) 11%, transparent),
      color-mix(in srgb, var(--glass-text) 11%, transparent)
    )
    center 30px / 1px calc(100% - 58px) no-repeat;
}

/* ── Phase group ── */
.avr-phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 18px; /* = .proj-sidenav-group gap */
}
.avr-phase:last-child { margin-bottom: 0; }

/* ── Phase header row ── */
.avr-phase-hd {
  width: 100%;
  height: 20px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
}

/*
  Major graduation mark — outer ring 26 × 26 px
  Inspired by: theodolite crosshair node, level-staff graduation
*/
.avr-badge {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--glass-text) 28%, transparent);
  background: var(--glass-bg, #12121a);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color .18s;
  flex-shrink: 0;
}
/* inner centre filled dot (the second concentric ring) */
.avr-badge-core {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--glass-text) 22%, transparent);
  transition: background .18s;
}
/* phase number floats above, very faint — just a hint */
.avr-badge-n {
  position: absolute;
  font-size: .42rem;
  font-weight: 700;
  letter-spacing: .01em;
  color: var(--glass-text);
  opacity: .38;
  top: -9px;
  right: -3px;
  line-height: 1;
  user-select: none;
  pointer-events: none;
}

/* done state — stronger ring + filled core */
.avr-phase-hd--done .avr-badge {
  border-color: color-mix(in srgb, var(--glass-text) 55%, transparent);
}
.avr-phase-hd--done .avr-badge-core {
  background: color-mix(in srgb, var(--glass-text) 50%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--glass-text) 8%, transparent);
}

/* ── Item row — height = .proj-sidenav-item ── */
.avr-item {
  height: 35px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  z-index: 2;
}

/*
  Minor graduation mark — 11 × 11 px single ring
  Clearly smaller than phase badge = proper scale hierarchy
*/
.avr-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 20%, transparent);
  background: var(--glass-bg, #12121a);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: border-color .12s, background .12s, transform .12s;
}
.avr-dot:hover {
  border-color: color-mix(in srgb, var(--glass-text) 50%, transparent);
  transform: scale(1.3);
}
.avr-dot:disabled { opacity: .2; cursor: default; transform: none !important; }

/* done — filled */
.avr-dot--done {
  background: color-mix(in srgb, var(--glass-text) 30%, var(--glass-bg, #12121a));
  border-color: color-mix(in srgb, var(--glass-text) 52%, transparent);
}
/* in_progress — visible ring */
.avr-dot--in_progress {
  border-color: color-mix(in srgb, var(--glass-text) 42%, transparent);
  border-width: 1.5px;
}

/* active page — double ring via box-shadow */
.avr-item--active .avr-dot {
  border-color: color-mix(in srgb, var(--glass-text) 65%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--glass-text) 9%, transparent);
}
.avr-item--active .avr-dot:hover { transform: scale(1.28); }

/* in-progress inner pip */
.avr-pip {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--glass-text);
  opacity: .5;
  display: block;
  flex-shrink: 0;
}

/* done checkmark */
.avr-dot--done svg { color: var(--glass-text); opacity: .55; }
</style>
