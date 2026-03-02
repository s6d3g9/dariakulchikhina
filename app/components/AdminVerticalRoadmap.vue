<template>
  <div class="avr-root">
    <div
      v-for="phase in PHASE_GROUPS"
      :key="phase.key"
      class="avr-phase"
    >
      <!-- ── Phase — major tick ── -->
      <div
        class="avr-phase-hd"
        :class="{ 'avr-phase-hd--done': phaseDone(phase.key) }"
        :title="phase.name"
      >
        <span class="avr-num">{{ phase.num }}</span>
        <span class="avr-tick avr-tick--major" />
      </div>

      <!-- ── Sub-items — minor ticks ── -->
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
          class="avr-tick avr-tick--minor"
          :class="`avr-tick--${statusOf(pg.slug)}`"
          :disabled="saving[pg.slug]"
          @click.stop="toggleDone(pg)"
        />
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
  Measuring-instrument graduation scale:
  ─ Vertical spine runs along the right edge
  ─ Major ticks (phases)  : long + thick, extend left
  ─ Minor ticks (sub-items): short + thin, extend left
  ─ Status encoded in opacity / fill
*/

/* ── Root — absolute overlay, zero layout shift ── */
.avr-root {
  position: absolute;
  left: -48px;
  top: 0;
  width: 42px;
  padding-top: 10px;
  padding-bottom: 24px;
  /* Spine: 1 px line on the RIGHT edge */
  background:
    linear-gradient(
      color-mix(in srgb, var(--glass-text) 14%, transparent),
      color-mix(in srgb, var(--glass-text) 14%, transparent)
    )
    right 0 top 14px / 1px calc(100% - 36px) no-repeat;
}

/* ── Phase group ── */
.avr-phase {
  display: flex;
  flex-direction: column;
  align-items: flex-end;  /* align to right spine */
  margin-bottom: 18px;
}
.avr-phase:last-child { margin-bottom: 0; }

/* ── Phase header row ── */
.avr-phase-hd {
  width: 100%;
  height: 20px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: flex-end;  /* flush right to spine */
  position: relative;
  z-index: 2;
  gap: 5px;
}

/* Phase number — small label to left of tick */
.avr-num {
  font-size: .48rem;
  font-weight: 600;
  letter-spacing: .04em;
  color: var(--glass-text);
  opacity: .3;
  line-height: 1;
  user-select: none;
  pointer-events: none;
  transition: opacity .15s;
}
.avr-phase-hd--done .avr-num { opacity: .65; }

/* ── Ticks ── */
.avr-tick {
  display: block;
  border-radius: 1px;
  flex-shrink: 0;
  transition: background .12s, width .12s, opacity .12s;
}

/* Major tick — long, 2 px tall */
.avr-tick--major {
  width: 18px;
  height: 2px;
  background: color-mix(in srgb, var(--glass-text) 30%, transparent);
}
.avr-phase-hd--done .avr-tick--major {
  background: color-mix(in srgb, var(--glass-text) 62%, transparent);
  width: 22px;
}

/* Minor tick — short, 1 px tall, clickable button */
.avr-tick--minor {
  width: 9px;
  height: 1px;
  background: color-mix(in srgb, var(--glass-text) 18%, transparent);
  border: none;
  cursor: pointer;
  padding: 0;
  /* expand hit area via pseudo padding trick */
  outline: none;
  position: relative;
}
/* large invisible hit area */
.avr-tick--minor::before {
  content: '';
  position: absolute;
  inset: -10px -4px;
}
.avr-tick--minor:hover {
  background: color-mix(in srgb, var(--glass-text) 50%, transparent);
  width: 13px;
}
.avr-tick--minor:disabled { opacity: .2; cursor: default; }
.avr-tick--minor:disabled:hover { width: 9px; }

/* done — full opacity, longer tick */
.avr-tick--done {
  background: color-mix(in srgb, var(--glass-text) 55%, transparent);
  width: 14px;
}
.avr-tick--done:hover { width: 16px; }

/* in_progress — medium tick with brighter colour */
.avr-tick--in_progress {
  background: color-mix(in srgb, var(--glass-text) 36%, transparent);
  width: 11px;
}
.avr-tick--in_progress:hover { width: 14px; }

/* ── Item row ── */
.avr-item {
  height: 35px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  cursor: pointer;
  position: relative;
  z-index: 2;
}

/* active page — tick extends and brightens */
.avr-item--active .avr-tick--minor,
.avr-item--active .avr-tick--pending {
  width: 16px;
  background: color-mix(in srgb, var(--glass-text) 65%, transparent);
  height: 1.5px;
}
.avr-item--active .avr-tick--done {
  width: 18px;
  background: color-mix(in srgb, var(--glass-text) 72%, transparent);
}
</style>
