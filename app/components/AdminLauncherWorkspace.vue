<template>
  <section class="alw" aria-label="Studio OS workspace">
    <div class="alw-head">
      <div class="alw-title">
        <span class="alw-mark" aria-hidden="true">OS</span>
        <div>
          <h1>Studio OS</h1>
          <p>CRM · Design OS · Construction OS · Messenger</p>
        </div>
      </div>
      <button type="button" class="alw-action" @click="emit('createProject')">
        Новый проект
      </button>
    </div>

    <div class="alw-grid">
      <button
        v-for="zone in zones"
        :key="zone.key"
        type="button"
        class="alw-zone"
        @click="openZone(zone)"
      >
        <span class="alw-zone__mark">{{ zone.mark }}</span>
        <span class="alw-zone__body">
          <strong>{{ zone.title }}</strong>
          <span>{{ zone.meta }}</span>
        </span>
      </button>
    </div>

    <div class="alw-main">
      <div class="alw-panel alw-panel--status">
        <div class="alw-panel__head">
          <h2>Контуры</h2>
          <span>{{ loading ? 'sync' : 'ready' }}</span>
        </div>
        <div class="alw-status-list">
          <div
            v-for="item in statusItems"
            :key="item.key"
            class="alw-status-row"
          >
            <span class="alw-status-row__name">{{ item.name }}</span>
            <span class="alw-status-row__state" :data-state="item.state">{{ item.label }}</span>
          </div>
        </div>
      </div>

      <div class="alw-panel alw-panel--projects">
        <div class="alw-panel__head">
          <h2>Проекты</h2>
          <span>{{ displayProjectCount }}</span>
        </div>
        <div v-if="projects.length" class="alw-project-list">
          <NuxtLink
            v-for="project in projects"
            :key="project.slug"
            class="alw-project-row"
            :to="`/admin/projects/${project.slug}`"
          >
            <span>{{ project.title }}</span>
            <small>{{ project.status || project.projectType || 'project' }}</small>
          </NuxtLink>
        </div>
        <div v-else class="alw-empty">
          {{ loading ? 'Загрузка проектов' : 'Проекты ещё не заведены' }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type {
  ApiV1StudioShell,
  ApiV1StudioShellZoneKey,
  ApiV1StudioShellZoneState,
} from '~~/shared/types/api-v1'

type LauncherProject = {
  slug: string
  title: string
  status?: string
  projectType?: string
}

type LauncherZone = {
  key: ApiV1StudioShellZoneKey
  mark: string
  title: string
  meta: string
  rootId: string
  to: string
}

const props = defineProps<{
  projectCount: number
  projects?: LauncherProject[]
  studioShell?: ApiV1StudioShell | null
  loading?: boolean
}>()

const emit = defineEmits<{
  createProject: []
}>()

const adminNav = useAdminNav()

function projectSlugFromHref(href: string) {
  const prefix = '/admin/projects/'
  if (!href.startsWith(prefix)) return ''
  return href.slice(prefix.length).split(/[?#]/)[0] || ''
}

const shellProjectRows = computed<LauncherProject[]>(() => (props.studioShell?.recentProjects || []).map(item => ({
  slug: projectSlugFromHref(item.href),
  title: item.title,
  status: item.subtitle,
  projectType: '',
})).filter(project => project.slug))

const projects = computed(() => {
  const localProjects = (props.projects || []).slice(0, 4)
  return localProjects.length ? localProjects : shellProjectRows.value.slice(0, 4)
})

const displayProjectCount = computed(() => props.studioShell?.projectSummary.total ?? props.projectCount)

const zoneFallbacks: LauncherZone[] = [
  { key: 'crm', mark: 'CRM', title: 'CRM', meta: 'клиенты · документы · владельцы', rootId: 'cat_crm', to: '/admin/clients' },
  { key: 'studio', mark: 'ST', title: 'Studio OS', meta: 'дизайнеры · клиенты · ассеты', rootId: 'cat_studio_os', to: '/admin/designers' },
  { key: 'design', mark: 'DS', title: 'Design OS', meta: 'бриф · чертежи · согласования', rootId: 'cat_design_os', to: '/admin?os=design' },
  { key: 'construction', mark: 'CN', title: 'Construction OS', meta: 'подрядчики · работы · акты', rootId: 'cat_construction_os', to: '/admin/contractors' },
  { key: 'messenger', mark: 'MS', title: 'Messenger', meta: 'комнаты · действия · агенты', rootId: 'cat_messenger', to: '/admin?os=messenger' },
]

function metricMeta(key: ApiV1StudioShellZoneKey, fallback: string) {
  const zone = props.studioShell?.zones[key]
  if (!zone) return fallback
  const metrics = zone.metrics.slice(0, 3).map(item => `${item.label} ${item.value}`)
  return metrics.length ? metrics.join(' · ') : zone.summary
}

const zones = computed(() => zoneFallbacks.map(zone => ({
  ...zone,
  meta: metricMeta(zone.key, zone.meta),
})))

const fallbackStatusItems = [
  { key: 'client-api', name: 'Client Portal API v1', label: 'v1 read model', state: 'ready' },
  { key: 'crm', name: 'CRM shell', label: 'shell', state: 'draft' },
  { key: 'designer', name: 'Designer / Architect', label: 'shell', state: 'draft' },
  { key: 'construction', name: 'Worker / Crew OS', label: 'schema next', state: 'next' },
  { key: 'messenger', name: 'Messenger actions', label: 'bridge next', state: 'next' },
]

const statusItems = computed(() => {
  const shell = props.studioShell
  if (!shell) return fallbackStatusItems

  return [
    { key: 'client-api', name: 'Client Portal API v1', label: 'v1 read model', state: 'ready' as ApiV1StudioShellZoneState },
    { key: 'crm', name: shell.zones.crm.title, label: shell.zones.crm.stateLabel, state: shell.zones.crm.state },
    { key: 'studio', name: shell.zones.studio.title, label: shell.zones.studio.stateLabel, state: shell.zones.studio.state },
    { key: 'design', name: shell.zones.design.title, label: shell.zones.design.stateLabel, state: shell.zones.design.state },
    { key: 'construction', name: shell.zones.construction.title, label: shell.zones.construction.stateLabel, state: shell.zones.construction.state },
    { key: 'messenger', name: shell.zones.messenger.title, label: shell.zones.messenger.stateLabel, state: shell.zones.messenger.state },
  ]
})

async function openZone(zone: LauncherZone) {
  adminNav.goRoot()
  await nextTick()

  const rootItem = adminNav.currentNode.value.payload.find(item => item.id === zone.rootId)
  if (rootItem) {
    await adminNav.drill(rootItem)
    return
  }

  await navigateTo(zone.to)
}
</script>

<style scoped>
.alw {
  display: grid;
  gap: 14px;
  color: var(--sys-color-on-surface, var(--glass-text));
}

.alw-head {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--sys-color-outline-variant, color-mix(in srgb, var(--glass-text) 14%, transparent));
  border-radius: var(--card-radius, 8px);
  background: var(--sys-color-surface-container-low, var(--glass-bg));
}

.alw-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.alw-mark,
.alw-zone__mark {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: var(--card-radius, 8px);
  border: 1px solid var(--sys-color-outline-variant, color-mix(in srgb, var(--glass-text) 16%, transparent));
  background: var(--sys-color-secondary-container, color-mix(in srgb, var(--glass-text) 8%, transparent));
  color: var(--sys-color-on-secondary-container, var(--glass-text));
  font-size: .68rem;
  font-weight: 600;
  letter-spacing: 0;
}

.alw h1,
.alw h2,
.alw p {
  margin: 0;
  letter-spacing: 0;
}

.alw h1 {
  font-size: clamp(1.25rem, 2vw, 1.72rem);
  line-height: 1.12;
  font-weight: 500;
}

.alw p {
  margin-top: 4px;
  font-size: .82rem;
  color: var(--sys-color-on-surface-variant, color-mix(in srgb, var(--glass-text) 66%, transparent));
}

.alw-action {
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid var(--sys-color-outline-variant, color-mix(in srgb, var(--glass-text) 14%, transparent));
  border-radius: var(--card-radius, 8px);
  background: var(--sys-color-primary, var(--glass-text));
  color: var(--sys-color-on-primary, var(--glass-page-bg));
  font: inherit;
  font-size: .84rem;
  cursor: pointer;
}

.alw-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.alw-zone,
.alw-panel {
  border: 1px solid var(--sys-color-outline-variant, color-mix(in srgb, var(--glass-text) 12%, transparent));
  border-radius: var(--card-radius, 8px);
  background: var(--sys-color-surface-container-low, var(--glass-bg));
  box-shadow: none;
}

.alw-zone {
  appearance: none;
  min-height: 92px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  color: inherit;
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.alw-zone:hover {
  border-color: var(--sys-color-outline, color-mix(in srgb, var(--glass-text) 30%, transparent));
  background: var(--sys-color-surface-container, color-mix(in srgb, var(--glass-text) 4%, var(--glass-bg)));
}

.alw-zone__body {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.alw-zone__body strong {
  font-size: .9rem;
  font-weight: 500;
  line-height: 1.15;
}

.alw-zone__body span,
.alw-project-row small,
.alw-panel__head span,
.alw-empty {
  color: var(--sys-color-on-surface-variant, color-mix(in srgb, var(--glass-text) 58%, transparent));
  font-size: .72rem;
  line-height: 1.25;
}

.alw-main {
  display: grid;
  grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr);
  gap: 12px;
}

.alw-panel {
  min-width: 0;
  padding: 14px;
}

.alw-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.alw-panel__head h2 {
  font-size: .92rem;
  font-weight: 500;
}

.alw-status-list,
.alw-project-list {
  display: grid;
  gap: 2px;
}

.alw-status-row,
.alw-project-row {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-top: 1px solid var(--sys-color-outline-variant, color-mix(in srgb, var(--glass-text) 8%, transparent));
}

.alw-project-row {
  color: inherit;
  text-decoration: none;
}

.alw-status-row__name,
.alw-project-row span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: .84rem;
}

.alw-status-row__state {
  flex: 0 0 auto;
  padding: 3px 8px;
  border-radius: var(--chip-radius, 8px);
  background: color-mix(in srgb, var(--sys-color-on-surface, var(--glass-text)) 7%, transparent);
  color: var(--sys-color-on-surface-variant, var(--glass-text));
  font-size: .7rem;
}

.alw-status-row__state[data-state='ready'] {
  background: color-mix(in srgb, var(--ds-success, #15803d) 12%, transparent);
  color: var(--ds-success, #15803d);
}

.alw-status-row__state[data-state='next'] {
  background: color-mix(in srgb, var(--sys-color-on-surface, var(--glass-text)) 10%, transparent);
}

.alw-empty {
  min-height: 80px;
  display: flex;
  align-items: center;
  border-top: 1px solid var(--sys-color-outline-variant, color-mix(in srgb, var(--glass-text) 8%, transparent));
}

@media (max-width: 1180px) {
  .alw-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .alw-head,
  .alw-main {
    grid-template-columns: 1fr;
  }

  .alw-head {
    align-items: stretch;
    flex-direction: column;
  }

  .alw-action {
    width: 100%;
  }

  .alw-grid {
    grid-template-columns: 1fr;
  }
}
</style>
