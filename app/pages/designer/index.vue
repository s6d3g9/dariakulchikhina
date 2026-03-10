<template>
  <div class="designer-dashboard">
    <div class="dashboard-header">
      <h1 class="dashboard-title">Мои проекты</h1>
      <span class="dashboard-count" v-if="!pending">{{ projects.length }} проект{{ projectsWord }}</span>
    </div>

    <div v-if="pending" class="dashboard-loading">
      <span class="spinner"></span>
      Загрузка…
    </div>

    <div v-else-if="error" class="dashboard-error glass-surface">
      Не удалось загрузить проекты
    </div>

    <div v-else-if="!projects.length" class="dashboard-empty glass-surface">
      <div class="empty-icon">◈</div>
      <p>Проектов пока нет</p>
    </div>

    <div v-else class="projects-grid">
      <div
        v-for="row in projects"
        :key="row.id"
        class="project-card glass-surface"
      >
        <div class="project-card-header">
          <div class="project-status-dot" :class="`status-${row.status}`"></div>
          <span class="project-status-label">{{ statusLabel(row.status) }}</span>
        </div>
        <h2 class="project-card-title">{{ row.projectTitle || '—' }}</h2>
        <div class="project-card-meta">
          <span v-if="row.area">{{ row.area }} м²</span>
          <span v-if="row.totalPrice">{{ formatPrice(row.totalPrice) }}</span>
          <span v-if="row.packageKey" class="project-package">Пакет: {{ row.packageKey }}</span>
        </div>
        <div class="project-card-footer">
          <span class="project-date">{{ formatDate(row.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'designer', middleware: 'designer' })

const { data, pending, error } = await useFetch<any[]>('/api/designer/projects')
const projects = computed(() => data.value ?? [])

const projectsWord = computed(() => {
  const n = projects.value.length
  if (n === 1) return ''
  if (n >= 2 && n <= 4) return 'а'
  return 'ов'
})

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Черновик',
    active: 'Активный',
    done: 'Завершён',
    paused: 'Пауза',
    cancelled: 'Отменён',
  }
  return map[status] ?? status
}

function formatPrice(val: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val)
}

function formatDate(val: string): string {
  if (!val) return ''
  return new Date(val).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<style scoped>
.designer-dashboard {
  padding: 0;
}

.dashboard-header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.dashboard-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--glass-text, #111);
}

.dashboard-count {
  font-size: 0.875rem;
  color: var(--glass-label, #888);
}

.dashboard-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--glass-label, #888);
  font-size: 0.9rem;
  padding: 2rem 0;
}

.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid var(--glass-border, #ddd);
  border-top-color: var(--glass-accent, #6366f1);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dashboard-error,
.dashboard-empty {
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  color: var(--glass-label, #888);
  font-size: 0.9rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  color: var(--glass-accent, #6366f1);
  opacity: 0.5;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.project-card {
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: box-shadow 0.15s;
}

.project-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}

.project-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.project-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-draft { background: #aaa; }
.status-active { background: #22c55e; }
.status-done { background: #6366f1; }
.status-paused { background: #eab308; }
.status-cancelled { background: #ef4444; }

.project-status-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--glass-label, #888);
}

.project-card-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--glass-text, #111);
  line-height: 1.4;
}

.project-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--glass-label, #888);
}

.project-package {
  background: color-mix(in srgb, var(--glass-accent, #6366f1) 12%, transparent);
  color: var(--glass-accent, #6366f1);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.project-card-footer {
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid var(--glass-border, #eee);
}

.project-date {
  font-size: 0.75rem;
  color: var(--glass-label, #aaa);
}
</style>
