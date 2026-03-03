<template>
  <div class="apo-root">
    <!-- Welcome card -->
    <div class="apo-welcome glass-surface">
      <div class="apo-welcome-left">
        <div class="apo-avatar">{{ project?.title?.charAt(0)?.toUpperCase() || '◈' }}</div>
        <div>
          <div class="apo-welcome-name">{{ project?.title }}</div>
          <div class="apo-welcome-status">
            <span class="apo-status-dot" :class="`apo-status--${project?.status}`"></span>
            {{ phaseLabel(project?.status) }}
          </div>
        </div>
      </div>
      <div class="apo-progress-ring" :style="{ '--pct': progressPct }">
        <span class="apo-progress-val">{{ progressPct }}%</span>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="apo-quick-nav">
      <button class="apo-quick-btn glass-surface" @click="emit('navigate', 'first_contact')">
        <span class="apo-quick-icon">◍</span>
        <span class="apo-quick-label">Первичный контакт</span>
      </button>
      <button class="apo-quick-btn glass-surface" @click="emit('navigate', 'space_planning')">
        <span class="apo-quick-icon">◖</span>
        <span class="apo-quick-label">Планировки</span>
      </button>
      <button class="apo-quick-btn glass-surface" @click="emit('navigate', 'construction_plan')">
        <span class="apo-quick-icon">◰</span>
        <span class="apo-quick-label">План работ</span>
      </button>
    </div>

    <!-- Linked entities -->
    <div class="apo-section">
      <div class="apo-section-title">Команда проекта</div>

      <div class="apo-entity-group">
        <div class="apo-entity-label">Клиенты</div>
        <div v-if="!clients.length" class="apo-empty">Не привязаны</div>
        <div v-for="c in clients" :key="c.id" class="apo-entity-card glass-surface">
          <span class="apo-entity-avatar">{{ c.name?.charAt(0)?.toUpperCase() || '?' }}</span>
          <div class="apo-entity-info">
            <div class="apo-entity-name">{{ c.name }}</div>
            <div v-if="c.email" class="apo-entity-meta">{{ c.email }}</div>
          </div>
        </div>
      </div>

      <div class="apo-entity-group">
        <div class="apo-entity-label">Подрядчики</div>
        <div v-if="!contractors.length" class="apo-empty">Не привязаны</div>
        <div v-for="c in contractors" :key="c.id" class="apo-entity-card glass-surface">
          <span class="apo-entity-avatar">{{ c.name?.charAt(0)?.toUpperCase() || '?' }}</span>
          <div class="apo-entity-info">
            <div class="apo-entity-name">{{ c.name }}</div>
            <div v-if="c.companyName" class="apo-entity-meta">{{ c.companyName }}</div>
          </div>
        </div>
      </div>

      <div class="apo-entity-group">
        <div class="apo-entity-label">Дизайнеры</div>
        <div v-if="!designers.length" class="apo-empty">Не привязаны</div>
        <div v-for="d in designers" :key="d.id" class="apo-entity-card glass-surface">
          <span class="apo-entity-avatar">{{ d.name?.charAt(0)?.toUpperCase() || '?' }}</span>
          <div class="apo-entity-info">
            <div class="apo-entity-name">{{ d.name }}</div>
            <div v-if="d.email" class="apo-entity-meta">{{ d.email }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase progress -->
    <div class="apo-section">
      <div class="apo-section-title">Прогресс по фазам</div>
      <div class="apo-phases">
        <div v-for="phase in phases" :key="phase.key" class="apo-phase-row">
          <div class="apo-phase-bar-wrap">
            <div class="apo-phase-label">{{ phase.label }}</div>
            <div class="apo-phase-bar">
              <div class="apo-phase-fill" :style="{ width: phase.pct + '%' }"></div>
            </div>
          </div>
          <span class="apo-phase-pct">{{ phase.pct }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PHASE_LABELS, getAdminNavGroups } from '~~/shared/constants/pages'
import { normalizeRoadmapStatus } from '~~/shared/utils/roadmap'
import { useRoadmapBus } from '~/composables/useRoadmapBus'

const props = defineProps<{
  slug: string
  project: any
  clients: any[]
  contractors: any[]
  designers: any[]
  rmMap: Record<string, string>
}>()

const emit = defineEmits<{ (e: 'navigate', slug: string): void }>()

function phaseLabel(s: string | undefined): string {
  if (!s) return ''
  return PHASE_LABELS[s] || s
}

const phases = computed(() => {
  const groups = getAdminNavGroups()
  return groups.map(g => {
    const total = g.pages.length
    const done = g.pages.filter(p => props.rmMap[p.slug] === 'done').length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    return { key: g.label, label: g.label, pct, done, total }
  })
})

const progressPct = computed(() => {
  const total = phases.value.reduce((s, p) => s + p.total, 0)
  const done = phases.value.reduce((s, p) => s + p.done, 0)
  return total > 0 ? Math.round((done / total) * 100) : 0
})
</script>

<style scoped>
.apo-root { display: flex; flex-direction: column; gap: 20px; }

.apo-welcome {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-radius: 14px; gap: 16px;
}
.apo-welcome-left { display: flex; align-items: center; gap: 14px; }
.apo-avatar {
  width: 48px; height: 48px; border-radius: 50%;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; font-weight: 700; color: var(--glass-text);
  flex-shrink: 0;
}
.apo-welcome-name { font-size: 1.05rem; font-weight: 600; color: var(--glass-text); }
.apo-welcome-status { font-size: .78rem; color: color-mix(in srgb, var(--glass-text) 55%, transparent); margin-top: 2px; display: flex; align-items: center; gap: 6px; }
.apo-status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ds-accent); flex-shrink: 0; }
.apo-status--lead .apo-status-dot, .apo-status--lead { }
.apo-status--concept { }
.apo-status--working_project { }
.apo-status--procurement { }
.apo-status--construction { }
.apo-status--commissioning { }

.apo-progress-ring {
  width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0;
  background: conic-gradient(var(--ds-success) calc(var(--pct) * 1%), color-mix(in srgb, var(--glass-text) 8%, transparent) 0);
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.apo-progress-ring::before {
  content: ''; position: absolute; inset: 5px; border-radius: 50%;
  background: var(--glass-bg, #fff);
}
.apo-progress-val {
  position: relative; z-index: 1; font-size: .72rem; font-weight: 700;
  color: var(--glass-text);
}

.apo-quick-nav { display: flex; gap: 10px; flex-wrap: wrap; }
.apo-quick-btn {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px;
  border-radius: 10px; border: none; cursor: pointer; font-size: .82rem;
  color: var(--glass-text); background: var(--glass-bg);
  transition: opacity .15s;
}
.apo-quick-btn:hover { opacity: .8; }
.apo-quick-icon { font-size: 1rem; }
.apo-quick-label { white-space: nowrap; }

.apo-section { display: flex; flex-direction: column; gap: 12px; }
.apo-section-title {
  font-size: .76rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: .5px; color: color-mix(in srgb, var(--glass-text) 50%, transparent);
}

.apo-entity-group { display: flex; flex-direction: column; gap: 6px; }
.apo-entity-label { font-size: .74rem; color: color-mix(in srgb, var(--glass-text) 45%, transparent); }
.apo-empty { font-size: .78rem; color: color-mix(in srgb, var(--glass-text) 35%, transparent); font-style: italic; }
.apo-entity-card {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border-radius: 10px;
}
.apo-entity-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  display: flex; align-items: center; justify-content: center;
  font-size: .78rem; font-weight: 600; color: var(--glass-text);
}
.apo-entity-name { font-size: .84rem; font-weight: 500; color: var(--glass-text); }
.apo-entity-meta { font-size: .72rem; color: color-mix(in srgb, var(--glass-text) 50%, transparent); }

.apo-phases { display: flex; flex-direction: column; gap: 10px; }
.apo-phase-row { display: flex; align-items: center; gap: 10px; }
.apo-phase-bar-wrap { flex: 1; min-width: 0; }
.apo-phase-label { font-size: .74rem; color: var(--glass-text); margin-bottom: 4px; }
.apo-phase-bar {
  height: 6px; border-radius: 3px;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  overflow: hidden;
}
.apo-phase-fill {
  height: 100%; border-radius: 3px;
  background: var(--ds-success);
  transition: width .4s ease;
}
.apo-phase-pct { font-size: .72rem; font-weight: 600; color: var(--glass-text); min-width: 32px; text-align: right; }

@media (max-width: 768px) {
  .apo-welcome { flex-direction: column; align-items: flex-start; }
  .apo-quick-nav { flex-direction: column; }
}
</style>
