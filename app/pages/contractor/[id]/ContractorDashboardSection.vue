<template>
  <div class="dash-root">
    <!-- Приветствие и профиль -->
    <div class="dash-welcome glass-surface">
      <div class="dash-welcome-left">
        <div class="dash-avatar">{{ contractor?.name?.charAt(0)?.toUpperCase() || '◑' }}</div>
        <div>
          <div class="dash-welcome-name">{{ contractor?.name }}</div>
          <div class="dash-welcome-role">
            {{ contractor?.contractorType === 'company' ? 'Подрядчик (компания)' : 'Мастер' }}
            <span v-if="contractor?.city"> · {{ contractor.city }}</span>
          </div>
        </div>
      </div>
      <div class="dash-profile-progress">
        <div class="dash-profile-pct-ring" :style="{ '--pct': profilePct }">
          <span class="dash-profile-pct-val">{{ profilePct }}%</span>
        </div>
        <div class="dash-profile-progress-info">
          <span class="dash-profile-progress-label">Профиль заполнен</span>
          <button v-if="profilePct < 100" class="dash-profile-fill-btn" @click="$emit('navigate', profileNextSection)">Заполнить →</button>
        </div>
      </div>
    </div>

    <!-- Быстрые действия -->
    <div class="dash-quick-nav">
      <button
        v-for="item in quickActions"
        :key="item.key"
        class="dash-quick-btn glass-surface"
        @click="$emit('navigate', item.key)"
      >
        <span class="dash-quick-icon">{{ item.icon }}</span>
        <span class="dash-quick-label">{{ item.label }}</span>
        <span v-if="item.badge" class="dash-quick-badge">{{ item.badge }}</span>
      </button>
    </div>

    <div class="dash-stats">
      <div class="dash-stat glass-surface">
        <div class="dash-stat-val">{{ dashStats.total }}</div>
        <div class="dash-stat-label">Всего задач</div>
      </div>
      <div class="dash-stat glass-surface dash-stat--blue">
        <div class="dash-stat-val">{{ dashStats.inProgress }}</div>
        <div class="dash-stat-label">В работе</div>
      </div>
      <div class="dash-stat glass-surface dash-stat--green">
        <div class="dash-stat-val">{{ dashStats.done }}</div>
        <div class="dash-stat-label">Выполнено</div>
      </div>
      <div class="dash-stat glass-surface" :class="dashStats.overdue ? 'dash-stat--red' : ''">
        <div class="dash-stat-val">{{ dashStats.overdue }}</div>
        <div class="dash-stat-label">Просрочено</div>
      </div>
    </div>

    <!-- Прогресс выполнения -->
    <div class="dash-progress glass-surface">
      <div class="dash-progress-head">
        <span>Общий прогресс</span>
        <span class="dash-progress-pct">{{ dashStats.total ? Math.round(dashStats.done / dashStats.total * 100) : 0 }}%</span>
      </div>
      <div class="dash-progress-bar-wrap">
        <div class="dash-progress-bar" :style="{ width: dashStats.total ? (dashStats.done / dashStats.total * 100) + '%' : '0%' }" />
      </div>
    </div>

    <!-- Привязанные проекты -->
    <div v-if="linkedProjects?.length" class="dash-projects glass-surface">
      <div class="dash-section-title">Мои проекты ({{ linkedProjects.length }})</div>
      <div class="dash-projects-grid">
        <div v-for="p in linkedProjects" :key="p.slug" class="dash-project-card">
          <span class="dash-project-name">{{ p.title }}</span>
          <span class="dash-project-slug">{{ p.slug }}</span>
        </div>
      </div>
    </div>

    <!-- Ближайшие дедлайны -->
    <div v-if="dashDeadlines.length" class="dash-deadlines glass-surface">
      <div class="dash-section-title">Ближайшие дедлайны</div>
      <div
        v-for="item in dashDeadlines"
        :key="item.id"
        class="dash-deadline-row"
        :class="{ overdue: isDue(item.dateEnd) }"
      >
        <span class="dash-deadline-dot" :class="isDue(item.dateEnd) ? 'red' : 'amber'" />
        <span class="dash-deadline-title">{{ item.title }}</span>
        <span class="dash-deadline-proj">{{ item.projectTitle }}</span>
        <span class="dash-deadline-date">до {{ item.dateEnd }}</span>
      </div>
    </div>

    <!-- Задачи без дедлайна -->
    <div v-if="dashNoDue.length" class="dash-nodue glass-surface">
      <div class="dash-section-title">Без срока ({{ dashNoDue.length }})</div>
      <div v-for="item in dashNoDue" :key="item.id" class="dash-nodue-row">
        <span class="dash-nodue-dot" />
        <span class="dash-nodue-title">{{ item.title }}</span>
        <span class="dash-nodue-proj">{{ item.projectTitle }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ContractorInfo {
  name?: string | null
  city?: string | null
  contractorType?: string | null
}

interface QuickAction {
  key: string
  label: string
  icon: string
  badge?: string | number | null
}

interface DashStatsShape {
  total: number
  inProgress: number
  done: number
  overdue: number
}

interface LinkedProject {
  slug: string
  title: string
}

interface DashTaskItem {
  id: string | number
  title: string
  projectTitle?: string
  dateEnd?: string | null
}

defineProps<{
  contractor: ContractorInfo | null | undefined
  profilePct: number
  profileNextSection: string
  quickActions: QuickAction[]
  dashStats: DashStatsShape
  linkedProjects: LinkedProject[] | null | undefined
  dashDeadlines: DashTaskItem[]
  dashNoDue: DashTaskItem[]
}>()

defineEmits<{
  navigate: [section: string]
}>()

// Pure date-comparison helper — small enough to inline instead of
// threading through a prop. Mirrors the parent's `isDue` copy used by
// the tasks table.
function isDue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const [d, m, y] = dateStr.split('.')
  if (!d || !m || !y) return false
  const due = new Date(Number(y), Number(m) - 1, Number(d))
  return due < new Date()
}
</script>
