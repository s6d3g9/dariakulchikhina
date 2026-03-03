<template>
  <div class="co-root">
    <!-- Welcome card -->
    <div class="co-welcome glass-surface">
      <div class="co-welcome-left">
        <div class="co-avatar">{{ project?.title?.charAt(0)?.toUpperCase() || '◈' }}</div>
        <div>
          <div class="co-welcome-name">{{ project?.title }}</div>
          <div class="co-welcome-status">
            <span class="co-status-dot"></span>
            {{ phaseLabel(project?.status) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Phase progress -->
    <div v-if="phases.length" class="co-section">
      <div class="co-section-title">Прогресс проекта</div>
      <div class="co-progress-bar-wrap">
        <div class="co-progress-bar">
          <div class="co-progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <span class="co-progress-pct">{{ progressPct }}%</span>
      </div>
      <div class="co-phases">
        <div v-for="phase in phases" :key="phase.key" class="co-phase-row">
          <span class="co-phase-dot" :class="{ 'co-phase-dot--done': phase.pct === 100, 'co-phase-dot--partial': phase.pct > 0 && phase.pct < 100 }"></span>
          <span class="co-phase-name">{{ phase.label }}</span>
          <span class="co-phase-pct">{{ phase.pct }}%</span>
        </div>
      </div>
    </div>

    <!-- Quick links -->
    <div class="co-section">
      <div class="co-section-title">Быстрый доступ</div>
      <div class="co-quick-links">
        <button class="co-link-btn glass-surface" @click="emit('navigate', 'work_progress')">
          <span class="co-link-icon">◈</span>
          <span>Ход работ</span>
        </button>
        <button class="co-link-btn glass-surface" @click="emit('navigate', 'contracts')">
          <span class="co-link-icon">◻</span>
          <span>Документы</span>
        </button>
        <button class="co-link-btn glass-surface" @click="emit('navigate', 'design_timeline')">
          <span class="co-link-icon">◷</span>
          <span>Таймлайн</span>
        </button>
        <button class="co-link-btn glass-surface" @click="emit('navigate', 'client_contacts')">
          <span class="co-link-icon">◌</span>
          <span>Контакты</span>
        </button>
      </div>
    </div>

    <!-- Contractors on project -->
    <div v-if="contractors.length" class="co-section">
      <div class="co-section-title">Команда проекта</div>
      <div class="co-team">
        <div v-for="c in contractors" :key="c.id" class="co-team-card glass-surface">
          <span class="co-team-avatar">{{ c.name?.charAt(0)?.toUpperCase() || '?' }}</span>
          <div>
            <div class="co-team-name">{{ c.name }}</div>
            <div v-if="c.companyName" class="co-team-meta">{{ c.companyName }}</div>
            <div v-if="c.phone" class="co-team-meta">{{ c.phone }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PHASE_LABELS, getAdminNavGroups } from '~~/shared/constants/pages'

const props = defineProps<{
  slug: string
  project: any
  contractors: any[]
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
.co-root { display: flex; flex-direction: column; gap: 20px; }

.co-welcome {
  display: flex; align-items: center; padding: 20px 24px;
  border-radius: 14px; gap: 16px;
}
.co-welcome-left { display: flex; align-items: center; gap: 14px; }
.co-avatar {
  width: 48px; height: 48px; border-radius: 50%;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; font-weight: 700; color: var(--glass-text);
  flex-shrink: 0;
}
.co-welcome-name { font-size: 1.05rem; font-weight: 600; color: var(--glass-text); }
.co-welcome-status {
  font-size: .78rem; color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  margin-top: 2px; display: flex; align-items: center; gap: 6px;
}
.co-status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ds-accent); flex-shrink: 0; }

.co-section { display: flex; flex-direction: column; gap: 12px; }
.co-section-title {
  font-size: .76rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: .5px; color: color-mix(in srgb, var(--glass-text) 50%, transparent);
}

.co-progress-bar-wrap { display: flex; align-items: center; gap: 10px; }
.co-progress-bar {
  flex: 1; height: 8px; border-radius: 4px;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  overflow: hidden;
}
.co-progress-fill { height: 100%; border-radius: 4px; background: var(--ds-success); transition: width .4s ease; }
.co-progress-pct { font-size: .78rem; font-weight: 700; color: var(--glass-text); min-width: 36px; }

.co-phases { display: flex; flex-direction: column; gap: 8px; }
.co-phase-row { display: flex; align-items: center; gap: 8px; font-size: .8rem; color: var(--glass-text); }
.co-phase-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid color-mix(in srgb, var(--glass-text) 15%, transparent);
  box-sizing: border-box;
}
.co-phase-dot--done { background: var(--ds-success); border-color: var(--ds-success); }
.co-phase-dot--partial { border-color: var(--ds-warning); }
.co-phase-name { flex: 1; }
.co-phase-pct { font-size: .72rem; font-weight: 600; color: color-mix(in srgb, var(--glass-text) 55%, transparent); }

.co-quick-links { display: flex; gap: 10px; flex-wrap: wrap; }
.co-link-btn {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px;
  border-radius: 10px; border: none; cursor: pointer; font-size: .82rem;
  color: var(--glass-text); transition: opacity .15s;
}
.co-link-btn:hover { opacity: .8; }
.co-link-icon { font-size: 1rem; }

.co-team { display: flex; flex-direction: column; gap: 8px; }
.co-team-card {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border-radius: 10px;
}
.co-team-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  display: flex; align-items: center; justify-content: center;
  font-size: .78rem; font-weight: 600; color: var(--glass-text);
}
.co-team-name { font-size: .84rem; font-weight: 500; color: var(--glass-text); }
.co-team-meta { font-size: .72rem; color: color-mix(in srgb, var(--glass-text) 50%, transparent); }

@media (max-width: 768px) {
  .co-quick-links { flex-direction: column; }
}
</style>
