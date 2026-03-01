<template>
  <div class="admin-bg glass-page">
    <header class="admin-header glass-surface">
      <span class="admin-brand">админ-панель</span>
      <div class="admin-header-links">
        <UIThemePicker />
        <button
          type="button"
          class="theme-dot"
          :aria-label="isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'"
          @click="toggleTheme"
        ></button>
        <NuxtLink to="/" class="admin-link">сайт</NuxtLink>
        <a href="#" class="admin-link" @click.prevent="logout">выйти</a>
      </div>
    </header>

    <div class="admin-container">
      <!-- ── Tab bar ── -->
      <div class="admin-tabs">

        <!-- проекты + chip текущего проекта -->
        <div ref="projectsTabRef" class="admin-chip-tab" :class="{ 'admin-chip-tab--active': isProjectsTab }">
          <NuxtLink to="/admin" class="admin-tab-label glass-chip admin-tab" :class="{ 'admin-tab--active': isProjectsTab }">проекты</NuxtLink>
          <button
            v-if="activeProjectSlug"
            type="button"
            class="admin-mini-chip"
            :title="currentProjectTitle"
            @click.stop="projectsOpen = !projectsOpen"
          >{{ currentProjectInitials }}</button>
          <div v-if="projectsOpen" class="admin-dropdown glass-surface" @click.stop>
            <button
              v-for="p in quickProjects" :key="p.slug"
              type="button" class="admin-drop-item"
              :class="{ 'admin-drop-item--active': p.slug === activeProjectSlug }"
              @click="pickProject(p.slug)"
            >
              <span class="admin-drop-ini">{{ projectInitials(p.title) }}</span>
              <span class="admin-drop-lbl">{{ p.title }}</span>
            </button>
            <div v-if="!quickProjects.length" class="admin-drop-empty">нет проектов</div>
          </div>
        </div>

        <!-- подрядчики + chip -->
        <div ref="contractorsTabRef" class="admin-chip-tab" :class="{ 'admin-chip-tab--active': isContractorsTab }">
          <NuxtLink :to="contractorsTabTo" class="admin-tab-label glass-chip admin-tab" :class="{ 'admin-tab--active': isContractorsTab }">подрядчики</NuxtLink>
          <button type="button" class="admin-mini-chip admin-mini-chip--dim" @click.stop="contractorsOpen = !contractorsOpen">…</button>
          <div v-if="contractorsOpen" class="admin-dropdown glass-surface" @click.stop>
            <button
              v-for="c in quickContractors" :key="c.id"
              type="button" class="admin-drop-item"
              @click="pickContractor(c.id)"
            >
              <span class="admin-drop-ini">{{ nameInitials(c.name) }}</span>
              <span class="admin-drop-lbl">{{ c.name }}</span>
            </button>
            <NuxtLink :to="contractorsTabTo" class="admin-drop-all" @click="contractorsOpen = false">все подрядчики →</NuxtLink>
          </div>
        </div>

        <!-- клиенты + chip -->
        <div ref="clientsTabRef" class="admin-chip-tab" :class="{ 'admin-chip-tab--active': isClientsTab }">
          <NuxtLink :to="clientsTabTo" class="admin-tab-label glass-chip admin-tab" :class="{ 'admin-tab--active': isClientsTab }">клиенты</NuxtLink>
          <button type="button" class="admin-mini-chip admin-mini-chip--dim" @click.stop="clientsOpen = !clientsOpen">…</button>
          <div v-if="clientsOpen" class="admin-dropdown glass-surface" @click.stop>
            <button
              v-for="cl in quickClients" :key="cl.id"
              type="button" class="admin-drop-item"
              @click="pickClient(cl)"
            >
              <span class="admin-drop-ini">{{ nameInitials(cl.name) }}</span>
              <span class="admin-drop-lbl">{{ cl.name }}</span>
            </button>
            <NuxtLink :to="clientsTabTo" class="admin-drop-all" @click="clientsOpen = false">все клиенты →</NuxtLink>
          </div>
        </div>

        <!-- галерея — одна кнопка с дропдауном категорий -->
        <div ref="galleryTabRef" class="admin-chip-tab" :class="{ 'admin-chip-tab--active': isGalleryTab }">
          <NuxtLink :to="galleryActiveTabTo" class="admin-tab-label glass-chip admin-tab" :class="{ 'admin-tab--active': isGalleryTab }">галерея</NuxtLink>
          <button type="button" class="admin-mini-chip" :class="galleryCurrentChip ? 'admin-mini-chip' : 'admin-mini-chip--dim'" @click.stop="galleryOpen = !galleryOpen">
            {{ galleryCurrentChip || '…' }}
          </button>
          <div v-if="galleryOpen" class="admin-dropdown glass-surface" @click.stop>
            <button
              v-for="g in GALLERY_TABS" :key="g.slug"
              type="button" class="admin-drop-item"
              :class="{ 'admin-drop-item--active': route.path === `/admin/gallery/${g.slug}` }"
              @click="pickGallery(g.slug)"
            >
              <span class="admin-drop-ini">{{ g.icon }}</span>
              <span class="admin-drop-lbl">{{ g.label }}</span>
            </button>
          </div>
        </div>


      </div><!-- /.admin-tabs -->

      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const route  = useRoute()
const { isDark, toggleTheme } = useThemeToggle()

// ── Gallery tabs config ─────────────────────────────────────────
const GALLERY_TABS = [
  { slug: 'interiors',  label: 'интерьеры',    icon: '🏠' },
  { slug: 'furniture',  label: 'мебель',        icon: '🪑' },
  { slug: 'materials',  label: 'материалы',     icon: '🪵' },
  { slug: 'art',        label: 'арт-объекты',   icon: '🎨' },
  { slug: 'moodboards', label: 'мудборды',      icon: '🖼' },
]

// ── Route helpers ───────────────────────────────────────────────
const activeProjectSlug = computed(() => {
  if (route.path.startsWith('/admin/projects/')) {
    const s = route.params.slug
    return typeof s === 'string' ? s : ''
  }
  const q = route.query.projectSlug
  return typeof q === 'string' ? q : ''
})

function withCtx(path: string) {
  return activeProjectSlug.value
    ? { path, query: { projectSlug: activeProjectSlug.value } }
    : path
}

const isProjectsTab    = computed(() => route.path === '/admin' || route.path.startsWith('/admin/projects'))
const isContractorsTab = computed(() => route.path.startsWith('/admin/contractors'))
const isClientsTab     = computed(() => route.path.startsWith('/admin/clients'))
const isGalleryTab     = computed(() => route.path.startsWith('/admin/gallery'))

const contractorsTabTo    = computed(() => withCtx('/admin/contractors'))
const clientsTabTo        = computed(() => withCtx('/admin/clients'))
const galleryActiveTabTo  = computed(() => {
  const match = GALLERY_TABS.find(g => route.path === `/admin/gallery/${g.slug}`)
  return withCtx(`/admin/gallery/${match?.slug ?? 'interiors'}`)
})

const galleryCurrentChip = computed(() => {
  const match = GALLERY_TABS.find(g => route.path === `/admin/gallery/${g.slug}`)
  return match?.icon ?? ''
})

// ── Projects data ───────────────────────────────────────────────
const { data: quickProjectsData } = await useFetch<any[]>('/api/projects', { server: false, default: () => [] })
const quickProjects = computed(() =>
  (quickProjectsData.value || []).map((p: any) => ({ slug: String(p.slug), title: String(p.title || p.slug) }))
)
const currentProjectTitle    = computed(() => quickProjects.value.find(p => p.slug === activeProjectSlug.value)?.title || activeProjectSlug.value)
const currentProjectInitials = computed(() => projectInitials(currentProjectTitle.value))

// ── Contractors data ────────────────────────────────────────────
const { data: contractorsData } = useFetch<any[]>('/api/contractors', { server: false, default: () => [] })
const quickContractors = computed(() => (contractorsData.value || []).slice(0, 12))

// ── Clients data ────────────────────────────────────────────────
const { data: clientsData } = useFetch<any[]>('/api/clients', { server: false, default: () => [] })
const quickClients = computed(() => (clientsData.value || []).slice(0, 12))

// ── Initials helpers ────────────────────────────────────────────
function projectInitials(title: string) {
  const s = String(title || '').trim()
  return s ? s.slice(0, 2).toUpperCase() : 'PR'
}
function nameInitials(name: string) {
  const parts = String(name || '').trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return String(name || '').slice(0, 2).toUpperCase() || '??'
}

// ── Dropdowns state ─────────────────────────────────────────────
const projectsOpen    = ref(false)
const contractorsOpen = ref(false)
const clientsOpen     = ref(false)
const galleryOpen     = ref(false)

const projectsTabRef    = ref<HTMLElement | null>(null)
const contractorsTabRef = ref<HTMLElement | null>(null)
const clientsTabRef     = ref<HTMLElement | null>(null)
const galleryTabRef     = ref<HTMLElement | null>(null)

function closeAll() {
  projectsOpen.value = contractorsOpen.value = clientsOpen.value = galleryOpen.value = false
}

function onDocClick(e: MouseEvent) {
  const refs = [projectsTabRef.value, contractorsTabRef.value, clientsTabRef.value, galleryTabRef.value]
  if (refs.every(r => !r || !r.contains(e.target as Node))) closeAll()
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  useUITheme().initTheme()
})
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
watch(() => route.fullPath, closeAll)

// ── Pickers ─────────────────────────────────────────────────────
function pickProject(slug: string) { closeAll(); navigateTo(`/admin/projects/${slug}`) }
function pickContractor(id: number) {
  closeAll()
  // Если уже в проекте — показываем подрядчика inline внутри страницы проекта
  if (activeProjectSlug.value) {
    navigateTo(`/admin/projects/${activeProjectSlug.value}?view=contractor&cid=${id}`)
    return
  }
  const dest = withCtx('/admin/contractors')
  if (typeof dest === 'string') {
    navigateTo(`${dest}#c-${id}`)
  } else {
    navigateTo({ ...dest, hash: `#c-${id}` })
  }
}
function pickClient(cl: any) {
  closeAll()
  // Если уже в проекте — показываем клиентский просмотр внутри этой же страницы
  if (activeProjectSlug.value) {
    navigateTo(`/admin/projects/${activeProjectSlug.value}?view=client`)
    return
  }
  // Если не в проекте, но у клиента есть проект — идём в него с preview
  if (cl.linkedProjects?.length) {
    navigateTo(`/admin/projects/${cl.linkedProjects[0].slug}?view=client`)
    return
  }
  navigateTo(clientsTabTo.value)
}
function pickGallery(slug: string) { closeAll(); navigateTo(withCtx(`/admin/gallery/${slug}`)) }

// ── Auth ─────────────────────────────────────────────────────────
async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  router.push('/admin/login')
}
</script>

<style scoped>
/* ── Page ── */
.admin-bg {
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ── Header ── */
.admin-header {
  padding: 13px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 0 0 16px 16px;
}
.admin-brand {
  font-size: .68rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--glass-text);
  opacity: .45;
}
.admin-header-links { display: flex; gap: 14px; align-items: center; }
.admin-link {
  font-size: .78rem;
  color: var(--glass-text);
  opacity: .5;
  text-decoration: none;
}
.admin-link:hover { opacity: 1; }

.theme-dot {
  width: 18px; height: 18px;
  border-radius: 999px;
  border: none;
  background: color-mix(in srgb, var(--glass-bg) 80%, transparent);
  box-shadow: inset 0 0 0 1px var(--glass-border);
  cursor: pointer;
  padding: 0;
}

/* ── Container / tabs ── */
.admin-container { max-width: 1140px; margin: 22px auto; padding: 0 16px; }
.admin-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
}

/* ── Generic tab pill ── */
.admin-tab {
  height: 32px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  text-decoration: none;
  color: var(--glass-text);
  font-size: .78rem;
  line-height: 1;
  letter-spacing: .2px;
  opacity: .62;
  border-radius: 999px;
  white-space: nowrap;
  transition: opacity .15s, background .15s;
}
.admin-tab:hover  { opacity: .9; }
.admin-tab--active { opacity: 1; font-weight: 600; }

/* ── Chip-tab wrapper (label + mini chip) ── */
.admin-chip-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 32px;
  gap: 4px;
}
.admin-tab-label { /* NuxtLink inheriting .admin-tab */ }

/* Small circle chip — matches tab height */
.admin-mini-chip {
  width: 24px; height: 24px;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--glass-text);
  font-size: .6rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  transition: opacity .15s, background .15s;
}
.admin-mini-chip--dim {
  background: transparent;
  opacity: .38;
}
.admin-mini-chip:hover { opacity: 1; background: var(--glass-bg); }

/* ── Dropdown ── */
.admin-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 240px;
  max-height: 320px;
  overflow: auto;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  padding: 6px;
  z-index: 80;
  box-shadow: 0 8px 32px rgba(0,0,0,.10);
}
.admin-drop-item {
  width: 100%; border: none; background: transparent;
  color: var(--glass-text); border-radius: 8px;
  display: flex; align-items: center; gap: 8px;
  padding: 8px; text-align: left; cursor: pointer;
  font-family: inherit; font-size: .76rem;
}
.admin-drop-item:hover { background: color-mix(in srgb, var(--glass-bg) 85%, transparent); }
.admin-drop-item--active { background: color-mix(in srgb, var(--glass-bg) 94%, transparent); font-weight: 600; }
.admin-drop-ini {
  width: 22px; height: 22px; border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  font-size: .58rem; font-weight: 700; flex-shrink: 0;
}
.admin-drop-lbl { font-size: .76rem; }
.admin-drop-empty { font-size: .74rem; opacity: .4; padding: 8px; }
.admin-drop-all {
  display: block; padding: 8px 10px;
  font-size: .72rem; color: var(--glass-text); opacity: .5;
  text-decoration: none; border-top: 1px solid var(--glass-border); margin-top: 4px;
}
.admin-drop-all:hover { opacity: 1; }


</style>
