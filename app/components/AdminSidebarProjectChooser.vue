<template>
  <div v-if="subjectContext" class="cab-project-switch" :class="{ 'cab-project-switch--collapsed': collapsed }">
    <button
      type="button"
      class="cab-project-switch__trigger"
      :class="{
        'cab-project-switch__trigger--open': projectsOpen,
        'cab-project-switch__trigger--empty': !normalizedProjects.length,
      }"
      :aria-label="triggerAriaLabel"
      :title="triggerAriaLabel"
      @click="toggleProjects"
    >
      <span class="cab-project-switch__glyph" aria-hidden="true">{{ triggerGlyph }}</span>
      <span v-if="!collapsed" class="cab-project-switch__copy">
        <span class="cab-project-switch__title">{{ triggerTitle }}</span>
        <span class="cab-project-switch__meta">{{ triggerMeta }}</span>
      </span>
      <span
        v-if="!collapsed && normalizedProjects.length"
        class="cab-project-switch__badge"
      >{{ normalizedProjects.length }}</span>
    </button>

    <div v-if="projectsOpen && normalizedProjects.length && !collapsed" class="cab-project-switch__list">
      <button
        v-for="project in normalizedProjects"
        :key="project.slug"
        type="button"
        class="cab-project-switch__project"
        :class="{ 'cab-project-switch__project--active': project.slug === activeProjectSlug }"
        @click="openProject(project.slug)"
      >
        <span class="cab-project-switch__project-title">{{ project.title }}</span>
        <span class="cab-project-switch__project-meta">{{ project.slug }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
type SidebarSubjectKind = 'designer' | 'client' | 'contractor' | 'seller' | 'manager'

type SidebarProjectLink = {
  slug: string
  title: string
}

const props = withDefaults(defineProps<{
  collapsed?: boolean
}>(), {
  collapsed: false,
})

const adminNav = useAdminNav()
const router = useRouter()
const route = useRoute()
const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined

const projectsOpen = ref(false)

const subjectContext = computed<{
  kind: SidebarSubjectKind
  id: number
  label: string
} | null>(() => {
  const spec = adminNav.contentSpec.value

  if (spec.designerId) {
    return { kind: 'designer', id: spec.designerId, label: 'дизайнера' }
  }

  if (spec.clientId) {
    return { kind: 'client', id: spec.clientId, label: 'клиента' }
  }

  if (spec.contractorId) {
    return { kind: 'contractor', id: spec.contractorId, label: 'подрядчика' }
  }

  if (spec.sellerId) {
    return { kind: 'seller', id: spec.sellerId, label: 'поставщика' }
  }

  if (spec.managerId) {
    return { kind: 'manager', id: spec.managerId, label: 'менеджера' }
  }

  return null
})

const projectsAsyncKey = computed(() => {
  if (!subjectContext.value) {
    return 'admin-sidebar-projects:none'
  }

  return `admin-sidebar-projects:${subjectContext.value.kind}:${subjectContext.value.id}`
})

const activeProjectSlug = computed(() => {
  const rawSlug = route.params.slug
  return typeof rawSlug === 'string' ? rawSlug : ''
})

const { data: rawProjects, pending } = useAsyncData(
  projectsAsyncKey,
  async () => {
    if (!subjectContext.value) {
      return [] as unknown[]
    }

    const { kind, id } = subjectContext.value

    if (kind === 'designer') {
      const designer = await $fetch<any>(`/api/designers/${id}`, { headers: requestHeaders })
      return designer?.designerProjects || []
    }

    if (kind === 'client') {
      const clients = await $fetch<any[]>('/api/clients', { headers: requestHeaders })
      return clients.find(client => Number(client.id) === id)?.linkedProjects || []
    }

    if (kind === 'contractor') {
      return await $fetch<any[]>(`/api/contractors/${id}/projects`, { headers: requestHeaders })
    }

    if (kind === 'seller') {
      return await $fetch<any[]>(`/api/sellers/${id}/projects`, { headers: requestHeaders })
    }

    return await $fetch<any[]>(`/api/managers/${id}/projects`, { headers: requestHeaders })
  },
  {
    watch: [projectsAsyncKey],
    default: () => [] as unknown[],
  },
)

const normalizedProjects = computed<SidebarProjectLink[]>(() => {
  const seen = new Set<string>()

  return (Array.isArray(rawProjects.value) ? rawProjects.value : [])
    .map((project: any) => {
      const slug = String(project?.slug || project?.projectSlug || '').trim()
      const title = String(project?.title || project?.projectTitle || slug).trim()

      if (!slug || seen.has(slug)) {
        return null
      }

      seen.add(slug)
      return {
        slug,
        title,
      }
    })
    .filter(Boolean)
    .sort((left, right) => left!.title.localeCompare(right!.title, 'ru')) as SidebarProjectLink[]
})

const triggerGlyph = computed(() => normalizedProjects.value.length ? '◒' : '+')
const triggerTitle = computed(() => normalizedProjects.value.length ? 'Проекты' : '+')
const triggerMeta = computed(() => {
  if (pending.value) {
    return 'загрузка...'
  }

  if (normalizedProjects.value.length) {
    return formatCountLabel(normalizedProjects.value.length, 'закреплённый проект', 'закреплённых проекта', 'закреплённых проектов')
  }

  return 'добавить проект'
})

const triggerAriaLabel = computed(() => {
  if (!subjectContext.value) {
    return 'Выбор проекта'
  }

  if (normalizedProjects.value.length) {
    return `Открыть закреплённые проекты ${subjectContext.value.label}`
  }

  return `Добавить проект для ${subjectContext.value.label}`
})

function formatCountLabel(count: number, singular: string, paucal: string, plural: string) {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} ${singular}`
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} ${paucal}`
  }

  return `${count} ${plural}`
}

async function openProject(slug: string) {
  projectsOpen.value = false
  await router.push(`/admin/projects/${encodeURIComponent(slug)}`)
}

function toggleProjects() {
  if (pending.value || !subjectContext.value) {
    return
  }

  if (!normalizedProjects.value.length) {
    projectsOpen.value = false
    void router.push('/admin/projects')
    return
  }

  projectsOpen.value = !projectsOpen.value
}

watch(subjectContext, () => {
  projectsOpen.value = false
})

watch(() => route.fullPath, () => {
  projectsOpen.value = false
})
</script>

<style scoped>
.cab-project-switch {
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
}

.cab-project-switch__trigger,
.cab-project-switch__project {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  color: var(--glass-text);
  cursor: pointer;
  text-align: left;
}

.cab-project-switch__trigger:hover,
.cab-project-switch__project:hover,
.cab-project-switch__trigger--open,
.cab-project-switch__project--active {
  border-color: color-mix(in srgb, var(--glass-text) 20%, transparent);
  background: color-mix(in srgb, var(--glass-text) 7%, transparent);
}

.cab-project-switch__trigger--empty {
  justify-content: flex-start;
}

.cab-project-switch__glyph,
.cab-project-switch__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.cab-project-switch__glyph {
  width: 26px;
  min-width: 26px;
  height: 26px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 16%, transparent);
  font-size: .72rem;
  font-weight: 700;
}

.cab-project-switch__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
  flex: 1 1 auto;
}

.cab-project-switch__title {
  font-size: .78rem;
  font-weight: 700;
  color: var(--glass-text);
}

.cab-project-switch__meta,
.cab-project-switch__project-meta {
  font-size: .68rem;
  line-height: 1.4;
  color: color-mix(in srgb, var(--glass-text) 68%, transparent);
}

.cab-project-switch__badge {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
  font-size: .66rem;
  font-weight: 700;
}

.cab-project-switch__list {
  display: grid;
  gap: 6px;
}

.cab-project-switch__project {
  display: grid;
  gap: 2px;
  padding-left: 48px;
}

.cab-project-switch__project-title {
  font-size: .76rem;
  font-weight: 600;
  color: var(--glass-text);
}

.cab-project-switch--collapsed {
  margin-bottom: 8px;
}

.cab-project-switch--collapsed .cab-project-switch__trigger {
  justify-content: center;
  padding-inline: 0;
}

.cab-project-switch--collapsed .cab-project-switch__glyph {
  width: 30px;
  min-width: 30px;
  height: 30px;
}

@media (max-width: 900px) {
  .cab-project-switch {
    margin-bottom: 8px;
  }
}
</style>