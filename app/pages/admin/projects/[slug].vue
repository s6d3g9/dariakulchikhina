<template>
  <div>
    <div v-if="projectPending" style="font-size:.88rem;color:#999">Загрузка...</div>
    <div v-else-if="!project" style="font-size:.88rem;color:#999">Проект не найден</div>
    <template v-else>
      <div style="font-size:.78rem;color:#aaa;margin-bottom:12px">
        <NuxtLink to="/admin" style="color:#888;text-decoration:none">проекты</NuxtLink>
        <span style="margin:0 6px">/</span>
        <span>{{ project.title }}</span>
      </div>

      <div class="proj-client-card glass-card" style="margin-bottom:14px">
        <div class="proj-client-title">клиент проекта</div>
        <div class="proj-client-row">
          <select v-model="selectedClientId" class="proj-client-select">
            <option value="">— выберите клиента —</option>
            <option v-for="c in clients" :key="c.id" :value="String(c.id)">
              {{ c.name }}<template v-if="c.phone"> · {{ c.phone }}</template><template v-else-if="c.email"> · {{ c.email }}</template>
            </option>
          </select>
          <button class="proj-client-btn" :disabled="!selectedClientId || linkingClient" @click="linkClientToProject">
            {{ linkingClient ? '...' : 'привязать' }}
          </button>
        </div>
        <div v-if="linkedClients.length" class="proj-client-linked">
          <span class="proj-client-linked-label">привязанные клиенты:</span>
          <span v-for="client in linkedClients" :key="client.id" class="proj-client-linked-chip">{{ client.name }}</span>
        </div>
        <p v-if="clientLinkError" class="proj-client-error">{{ clientLinkError }}</p>
        <p v-else-if="clientLinkSuccess" class="proj-client-success">{{ clientLinkSuccess }}</p>
      </div>

      <!-- Contractor link card -->
      <div class="proj-client-card glass-card" style="margin-bottom:14px">
        <div class="proj-client-title">подрядчики проекта</div>
        <div class="proj-client-row">
          <select v-model="selectedContractorId" class="proj-client-select">
            <option value="">— выберите подрядчика —</option>
            <option
              v-for="c in allContractors"
              :key="c.id"
              :value="String(c.id)"
              :disabled="linkedContractorIds.has(String(c.id))"
            >
              {{ c.name }}<template v-if="c.companyName"> · {{ c.companyName }}</template>
            </option>
          </select>
          <button
            class="proj-client-btn"
            :disabled="!selectedContractorId || linkingContractor"
            @click="linkContractorToProject"
          >
            {{ linkingContractor ? '...' : 'привязать' }}
          </button>
        </div>
        <div v-if="linkedContractorsList.length" class="proj-client-linked">
          <span class="proj-client-linked-label">привязанные подрядчики:</span>
          <span
            v-for="c in linkedContractorsList"
            :key="c.id"
            class="proj-client-linked-chip proj-client-linked-chip--removable"
            :title="'отвязать ' + c.name"
            @click="unlinkContractor(c.id)"
          >{{ c.name }} ×</span>
        </div>
        <p v-if="contractorLinkError" class="proj-client-error">{{ contractorLinkError }}</p>
        <p v-else-if="contractorLinkSuccess" class="proj-client-success">{{ contractorLinkSuccess }}</p>
      </div>

      <!-- Horizontal phase tracker -->
      <AdminProjectPhase
        :slug="route.params.slug as string"
        :status="projectStatus"
        @update:status="projectStatus = $event"
      />

      <!-- Two-column: left nav + right content -->
      <div class="proj-layout">

        <!-- Left sidebar: vertical nav -->
        <nav class="proj-sidenav std-sidenav">

          <!-- CLIENT PREVIEW MODE -->
          <template v-if="clientPreviewMode">
            <div class="proj-preview-banner">
              <span class="proj-preview-label">👁 клиент</span>
              <NuxtLink :to="`/admin/projects/${slug}`" class="proj-preview-exit">× выйти</NuxtLink>
            </div>
            <button
              v-for="pg in clientNavPages" :key="pg.slug"
              class="proj-sidenav-item std-nav-item"
              :class="{ 'proj-sidenav-item--active': clientActivePage === pg.slug, 'std-nav-item--active': clientActivePage === pg.slug }"
              @click="selectClientPage(pg.slug)"
            >
              <span v-if="pg.icon" class="proj-sidenav-icon">{{ pg.icon }}</span>
              {{ pg.title }}
            </button>
            <div v-if="!clientNavPages.length" class="proj-sidenav-empty">Нет страниц для клиента</div>
          </template>

          <!-- CONTRACTOR PREVIEW MODE -->
          <template v-else-if="contractorPreviewMode">
            <div class="proj-preview-banner">
              <span class="proj-preview-label">🛠 {{ contractorData?.name || 'подрядчик' }}</span>
              <NuxtLink :to="`/admin/projects/${slug}`" class="proj-preview-exit">× выйти</NuxtLink>
            </div>
            <button
              v-for="sec in CONTRACTOR_SECTIONS" :key="sec.key"
              class="proj-sidenav-item std-nav-item"
              :class="{ 'proj-sidenav-item--active': contractorSection === sec.key, 'std-nav-item--active': contractorSection === sec.key }"
              @click="selectContractorSection(sec.key)"
            >
              <span class="proj-sidenav-icon">{{ sec.icon }}</span>{{ sec.label }}
            </button>
          </template>

          <!-- ADMIN NAV -->
          <template v-else>
            <template v-for="group in navGroups" :key="group.label">
              <div class="proj-sidenav-group" v-if="group.pages.length">
                <div class="proj-sidenav-group-label std-nav-group-label">{{ group.label }}</div>
                <button
                  v-for="pg in group.pages"
                  :key="pg.slug"
                  class="proj-sidenav-item std-nav-item"
                  :class="{ 'proj-sidenav-item--active': activePage === pg.slug, 'std-nav-item--active': activePage === pg.slug }"
                  @click="selectAdminPage(pg.slug)"
                >{{ pg.title }}</button>
              </div>
            </template>
          </template>

        </nav>

        <!-- Right content -->
        <div class="proj-main">
          <Transition name="tab-fade" mode="out-in">
            <div :key="contentKey" class="proj-main-inner">
              <!-- contractor preview -->
              <template v-if="contractorPreviewMode">
                <div v-if="contractorPending" style="font-size:.82rem;color:#aaa;padding:20px 0">Загрузка...</div>
                <template v-else-if="contractorData">
                  <!-- Профиль -->
                  <div v-if="contractorSection === 'profile'" class="ctr-card">
                    <div class="ctr-name">{{ contractorData.name }}</div>
                    <div v-if="contractorData.companyName" class="ctr-sub">{{ contractorData.companyName }}</div>
                    <div class="ctr-rows">
                      <div v-if="contractorData.phone" class="ctr-row"><span class="ctr-lbl">тел</span><a :href="`tel:${contractorData.phone}`" class="ctr-val">{{ contractorData.phone }}</a></div>
                      <div v-if="contractorData.email" class="ctr-row"><span class="ctr-lbl">email</span><a :href="`mailto:${contractorData.email}`" class="ctr-val">{{ contractorData.email }}</a></div>
                      <div v-if="contractorData.messenger" class="ctr-row"><span class="ctr-lbl">{{ contractorData.messenger }}</span><span class="ctr-val">{{ contractorData.messengerNick }}</span></div>
                      <div v-if="contractorData.website" class="ctr-row"><span class="ctr-lbl">сайт</span><a :href="contractorData.website" target="_blank" class="ctr-val">{{ contractorData.website }}</a></div>
                    </div>
                    <div v-if="contractorData.workTypes?.length" class="ctr-chips">
                      <span v-for="wt in contractorData.workTypes" :key="wt" class="ctr-chip">{{ wt }}</span>
                    </div>
                    <div v-if="contractorData.notes" class="ctr-notes">{{ contractorData.notes }}</div>
                    <NuxtLink :to="`/admin/contractors#c-${contractorData.id}`" class="ctr-link-full">полная анкета ↗</NuxtLink>
                  </div>
                  <!-- Задачи -->
                  <AdminWorkStatus v-else-if="contractorSection === 'tasks'" :slug="slug" />
                  <!-- Документы -->
                  <AdminMaterials v-else-if="contractorSection === 'materials'" :slug="slug" />
                </template>
              </template>
              <!-- client preview -->
              <component
                v-else-if="clientPreviewMode"
                :is="clientActiveComponent"
                v-bind="clientActiveComponentProps"
              />
              <!-- admin view -->
              <component
                v-else
                :is="activeComponent"
                v-bind="activeComponentProps"
              />
            </div>
          </Transition>
        </div>
      </div>
    </template>

    <div v-if="showEdit" class="a-modal-backdrop" @click.self="showEdit = false">
      <div class="a-modal">
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:20px">редактировать проект</h3>
        <form @submit.prevent="saveProject">
          <div class="a-field">
            <label>Название</label>
            <input v-model="editForm.title" class="a-input" required>
          </div>
          <div class="a-field">
            <label style="margin-bottom:10px;display:block">Видимые страницы</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px">
              <label
                v-for="pg in allPageSlugs"
                :key="pg.slug"
                style="display:flex;align-items:center;gap:8px;font-size:.82rem;color:inherit;cursor:pointer"
              >
                <input
                  type="checkbox"
                  :checked="editForm.pages.includes(pg.slug)"
                  @change="togglePage(pg.slug)"
                  style="cursor:pointer"
                >
                {{ pg.title }}
              </label>
            </div>
          </div>
          <p v-if="editError" style="color:#c00;font-size:.8rem;margin-bottom:10px">{{ editError }}</p>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
            <button type="button" class="a-btn-sm" @click="showEdit = false">отмена</button>
            <button type="submit" class="a-btn-save" :disabled="saving">{{ saving ? '...' : 'сохранить' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getAdminPages, getAdminNavGroups, getClientPages } from '~~/shared/constants/pages'
import type { Component } from 'vue'
import {
  AdminRoadmap,
  AdminWorkStatus,
  AdminClientProfile,
  AdminContractorsProfile,
  AdminFirstContact,
  AdminSmartBrief,
  AdminSiteSurvey,
  AdminToRContract,
  AdminSpacePlanning,
  AdminMoodboard,
  AdminConceptApproval,
  AdminWorkingDrawings,
  AdminSpecifications,
  AdminMepIntegration,
  AdminDesignAlbumFinal,
  AdminProcurementList,
  AdminSuppliers,
  AdminProcurementStatus,
  AdminConstructionPlan,
  AdminWorkLog,
  AdminSitePhotos,
  AdminPunchList,
  AdminCommissioningAct,
  AdminClientSignOff,
  AdminPageContent,
  AdminMaterials,
  ClientRoadmap,
  ClientWorkStatus,
  ClientPageContent,
  ClientContractorsProfile,
  ClientInitiation,
  ClientContactDetails,
  ClientTimeline,
  ClientDesignAlbum,
  ClientContracts,
  ClientSelfProfile,
} from '#components'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const MODERN_PROJECT_PAGES = [
  'first_contact',
  'self_profile',
  'site_survey',
  'tor_contract',
  'space_planning',
  'moodboard',
  'concept_approval',
  'working_drawings',
  'specifications',
  'mep_integration',
  'design_album_final',
  'procurement_list',
  'suppliers',
  'procurement_status',
  'construction_plan',
  'work_log',
  'site_photos',
  'punch_list',
  'commissioning_act',
  'client_sign_off',
  'profile_contractors',
  'work_status',
  'project_roadmap',
]

const LEGACY_PROJECT_PAGES = new Set(['materials', 'tz', 'profile_customer'])

const { data: project, pending: projectPending, refresh } = await useFetch<any>(`/api/projects/${slug.value}`)
const { data: clientsData } = await useFetch<any[]>('/api/clients', { default: () => [] })
const { data: allContractorsData, refresh: refreshAllContractors } = await useFetch<any[]>('/api/contractors', { default: () => [] })
const { data: linkedContractorsData, refresh: refreshLinkedContractors } = await useFetch<any[]>(
  `/api/projects/${slug.value}/contractors`,
  { default: () => [] },
)
const activePage = ref('first_contact')
const showEdit = ref(false)
const saving = ref(false)
const editError = ref('')
const projectStatus = ref(project.value?.status || 'lead')
const selectedClientId = ref('')
const linkingClient = ref(false)
const clientLinkError = ref('')
const clientLinkSuccess = ref('')
// ── Contractor link state ─────────────────────────────────────────
const selectedContractorId = ref('')
const linkingContractor = ref(false)
const contractorLinkError = ref('')
const contractorLinkSuccess = ref('')

const allContractors = computed(() => allContractorsData.value || [])
const linkedContractorsList = computed(() => linkedContractorsData.value || [])
const linkedContractorIds = computed(() => new Set(linkedContractorsList.value.map((c: any) => String(c.id))))

async function linkContractorToProject() {
  if (!selectedContractorId.value) return
  linkingContractor.value = true
  contractorLinkError.value = ''
  contractorLinkSuccess.value = ''
  try {
    await $fetch(`/api/projects/${slug.value}/contractors`, {
      method: 'POST',
      body: { contractorId: Number(selectedContractorId.value) },
    })
    await refreshLinkedContractors()
    selectedContractorId.value = ''
    contractorLinkSuccess.value = 'Подрядчик привязан к проекту'
    setTimeout(() => { contractorLinkSuccess.value = '' }, 3000)
  } catch (e: any) {
    contractorLinkError.value = e?.data?.message || 'Не удалось привязать подрядчика'
  } finally {
    linkingContractor.value = false
  }
}

async function unlinkContractor(contractorId: number) {
  contractorLinkError.value = ''
  contractorLinkSuccess.value = ''
  try {
    await $fetch(`/api/projects/${slug.value}/contractors`, {
      method: 'DELETE',
      body: { contractorId },
    })
    await refreshLinkedContractors()
    contractorLinkSuccess.value = 'Подрядчик отвязан'
    setTimeout(() => { contractorLinkSuccess.value = '' }, 2500)
  } catch (e: any) {
    contractorLinkError.value = e?.data?.message || 'Не удалось отвязать подрядчика'
  }
}

const clients = computed(() => clientsData.value || [])

const linkedClientIds = computed(() => {
  const profile = (project.value?.profile || {}) as Record<string, any>
  const ids = new Set<string>()
  if (Array.isArray(profile.client_ids)) {
    for (const id of profile.client_ids) {
      const normalized = String(id || '')
      if (normalized) ids.add(normalized)
    }
  }
  if (profile.client_id) {
    ids.add(String(profile.client_id))
  }
  return Array.from(ids)
})

const linkedClients = computed(() => {
  const linkedSet = new Set(linkedClientIds.value)
  return clients.value.filter((c: any) => linkedSet.has(String(c.id)))
})

const editForm = reactive({
  title: project.value?.title || '',
  pages: [...(project.value?.pages || [])],
})

const pageComponentMap: Record<string, Component> = {
  project_roadmap: AdminRoadmap,
  work_status: AdminWorkStatus,
  profile_customer: AdminClientProfile,
  profile_contractors: AdminContractorsProfile,
  first_contact: AdminFirstContact,
  self_profile: AdminSmartBrief,
  brief: AdminSmartBrief,
  site_survey: AdminSiteSurvey,
  tor_contract: AdminToRContract,
  space_planning: AdminSpacePlanning,
  moodboard: AdminMoodboard,
  concept_approval: AdminConceptApproval,
  working_drawings: AdminWorkingDrawings,
  specifications: AdminSpecifications,
  mep_integration: AdminMepIntegration,
  design_album_final: AdminDesignAlbumFinal,
  procurement_list: AdminProcurementList,
  suppliers: AdminSuppliers,
  procurement_status: AdminProcurementStatus,
  construction_plan: AdminConstructionPlan,
  work_log: AdminWorkLog,
  site_photos: AdminSitePhotos,
  punch_list: AdminPunchList,
  commissioning_act: AdminCommissioningAct,
  client_sign_off: AdminClientSignOff,
}
// ── Contractor preview mode ─────────────────────────────────────────
const contractorPreviewMode = computed(() => route.query.view === 'contractor')
const contractorPreviewId   = computed(() => route.query.cid ? Number(route.query.cid) : null)
const contractorSection     = ref('profile')

const CONTRACTOR_SECTIONS = [
  { key: 'profile',   label: 'профиль',  icon: '🗣' },
  { key: 'tasks',     label: 'задачи',   icon: '📌' },
  { key: 'materials', label: 'материалы', icon: '📄' },
]

const { data: contractorData, pending: contractorPending } = useFetch<any>(
  () => contractorPreviewId.value ? `/api/contractors/${contractorPreviewId.value}` : null,
  { watch: [contractorPreviewId] },
)

watch(contractorPreviewMode, (on) => { if (on) contractorSection.value = 'profile' })
// ── Client preview mode ────────────────────────────────────────
const clientPreviewMode = computed(() => route.query.view === 'client')
const clientActivePage  = ref('')

// ── Content key: drives fade transition + scroll-reset on page switch ───────
const contentKey = computed(() => {
  if (contractorPreviewMode.value) return `ctr-${contractorSection.value}`
  if (clientPreviewMode.value)     return `cli-${clientActivePage.value}`
  return `adm-${activePage.value}`
})
function scrollToContent() {
  nextTick(() => {
    const el = document.querySelector('.proj-main')
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 16
      window.scrollTo({ top, behavior: 'smooth' })
    }
  })
}

function selectAdminPage(slug: string) {
  activePage.value = slug
  scrollToContent()
}

function selectClientPage(slug: string) {
  clientActivePage.value = slug
  scrollToContent()
}

function selectContractorSection(key: string) {
  contractorSection.value = key
  scrollToContent()
}

const clientPageComponentMap: Record<string, Component> = {
  phase_init:            ClientInitiation,
  self_profile:          ClientSelfProfile,
  brief:                 ClientSelfProfile,
  client_contacts:       ClientContactDetails,
  design_timeline:       ClientTimeline,
  design_album:          ClientDesignAlbum,
  contracts:             ClientContracts,
  project_roadmap:       ClientRoadmap,
  work_status:           ClientWorkStatus,
  profile_contractors:   ClientContractorsProfile,
}

const allClientPages = getClientPages()

const clientNavPages = computed(() => {
  const pages = project.value?.pages || []
  return allClientPages.filter(p => {
    if (p.slug === 'self_profile' && pages.includes('brief')) return true
    return pages.includes(p.slug)
  })
})

watch(clientNavPages, (pages) => {
  if (!clientActivePage.value && pages.length) {
    clientActivePage.value = pages[0].slug
  } else if (clientActivePage.value && !pages.some(p => p.slug === clientActivePage.value) && pages.length) {
    clientActivePage.value = pages[0].slug
  }
}, { immediate: true })

const clientNormalizedPage = computed(() =>
  clientActivePage.value === 'brief' ? 'self_profile' : clientActivePage.value,
)

const clientActiveComponent = computed<Component>(() =>
  clientPageComponentMap[clientNormalizedPage.value] || ClientPageContent,
)

const clientActiveComponentProps = computed(() => {
  const base = { slug: slug.value }
  if (clientActiveComponent.value === ClientPageContent) return { ...base, page: clientNormalizedPage.value }
  return base
})

// ── Admin page state ───────────────────────────────────────────
const normalizedActivePage = computed(() =>
  activePage.value === 'brief' ? 'self_profile' : activePage.value,
)

const activeComponent = computed<Component>(() => pageComponentMap[normalizedActivePage.value] || AdminPageContent)

const activeComponentProps = computed(() => {
  const base = { slug: slug.value }
  if (activeComponent.value === AdminPageContent) {
    return { ...base, page: normalizedActivePage.value }
  }
  return base
})

function togglePage(pageSlug: string) {
  const idx = editForm.pages.indexOf(pageSlug)
  if (idx === -1) editForm.pages.push(pageSlug)
  else editForm.pages.splice(idx, 1)
}

watch(project, (p) => {
  if (p) {
    editForm.title = p.title
    editForm.pages = [...(p.pages || [])]
    projectStatus.value = p.status || 'lead'
    selectedClientId.value = String(p?.profile?.client_id || linkedClientIds.value[0] || '')
  }
})

const allPageSlugs = getAdminPages()

const availablePages = computed(() => {
  const pages = project.value?.pages || []
  return allPageSlugs.filter((p) => {
    if (p.slug === 'self_profile' && pages.includes('brief')) return true
    return pages.includes(p.slug)
  })
})

const navGroups = computed(() => {
  const available = new Set(availablePages.value.map(p => p.slug))
  return getAdminNavGroups()
    .map(group => ({
      ...group,
      pages: group.pages.filter(p => available.has(p.slug)),
    }))
    .filter(group => group.pages.length > 0)
})

const pagesMigrationInProgress = ref(false)

watch(project, async (p) => {
  if (!p || pagesMigrationInProgress.value) return
  const pages = Array.isArray(p.pages) ? p.pages : []
  const hasLegacy = pages.some((page: string) => LEGACY_PROJECT_PAGES.has(page))
  const missingModern = MODERN_PROJECT_PAGES.filter((page) => !pages.includes(page))
  if (!hasLegacy && missingModern.length === 0) return

  const extras = pages.filter((page: string) => !MODERN_PROJECT_PAGES.includes(page) && !LEGACY_PROJECT_PAGES.has(page))
  const nextPages = [...MODERN_PROJECT_PAGES, ...extras]

  pagesMigrationInProgress.value = true
  try {
    await $fetch(`/api/projects/${slug.value}`, {
      method: 'PUT',
      body: { pages: nextPages },
    })
    await refresh()
  } catch (error) {
    console.error('Не удалось мигрировать страницы проекта на новый набор', error)
  } finally {
    pagesMigrationInProgress.value = false
  }
})

watch(availablePages, (pages) => {
  const normalized = normalizedActivePage.value
  if (!pages.length) {
    activePage.value = 'first_contact'
    return
  }
  if (!pages.some(p => p.slug === normalized)) {
    activePage.value = pages[0].slug
  }
}, { immediate: true })

async function saveProject() {
  saving.value = true
  editError.value = ''
  try {
    await $fetch(`/api/projects/${slug.value}`, {
      method: 'PUT',
      body: {
        title: editForm.title,
        pages: editForm.pages,
      }
    })
    showEdit.value = false
    refresh()
  } catch (e: any) {
    editError.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}

async function linkClientToProject() {
  if (!selectedClientId.value) return
  linkingClient.value = true
  clientLinkError.value = ''
  clientLinkSuccess.value = ''
  try {
    await $fetch(`/api/clients/${selectedClientId.value}/link-project`, {
      method: 'POST',
      body: { projectSlug: slug.value },
    })
    await refresh()
    clientLinkSuccess.value = 'Клиент привязан к проекту'
  } catch (e: any) {
    clientLinkError.value = e?.data?.statusMessage || 'Не удалось привязать клиента'
  } finally {
    linkingClient.value = false
  }
}
</script>

<style scoped>
.proj-client-card {
  padding: 12px 14px;
}
.proj-client-title {
  font-size: .66rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--glass-text);
  opacity: .58;
  margin-bottom: 8px;
}
.proj-client-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.proj-client-select {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--glass-text);
  padding: 8px 10px;
  border-radius: 8px;
  font-size: .84rem;
  font-family: inherit;
}
.proj-client-btn {
  border: none;
  background: #1a1a1a;
  color: #fff;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: .8rem;
  cursor: pointer;
  font-family: inherit;
}

.proj-client-linked {
  margin-top: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.proj-client-linked-label {
  font-size: .64rem;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: var(--glass-text);
  opacity: .52;
}

.proj-client-linked-chip {
  font-size: .7rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--glass-bg);
  color: var(--glass-text);
  border: 1px solid var(--glass-border);
}
.proj-client-linked-chip--removable {
  cursor: pointer;
  transition: background .15s, color .15s;
  user-select: none;
}
.proj-client-linked-chip--removable:hover {
  background: rgba(200,50,50,.10);
  color: #c0392b;
  border-color: rgba(200,50,50,.25);
}
.proj-client-btn:disabled { opacity: .6; cursor: default; }
.proj-client-error { margin: 8px 0 0; color: #c00; font-size: .78rem; }
.proj-client-success { margin: 8px 0 0; color: #5caa7f; font-size: .78rem; }

/* ── Layout ── */
.proj-layout { display: flex; align-items: flex-start; gap: 0; }

/* ── Left sidebar nav ── */
.proj-sidenav {
  width: 190px; flex-shrink: 0;
  position: sticky; top: 80px;
  padding: 10px;
  margin-right: 20px;
}

.proj-sidenav-group { margin-bottom: 18px; }
.proj-sidenav-group-label {
  font-size: .62rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: .07em;
  color: var(--glass-text); opacity: .48; margin-bottom: 6px; padding-left: 10px;
}

.proj-sidenav-item {
  display: block; width: 100%; text-align: left;
  padding: 9px 10px; border: none; background: transparent;
  font-size: .8rem; color: var(--glass-text); cursor: pointer;
  border-radius: 9px; font-family: inherit; line-height: 1.3;
  opacity: .64;
  transition: background .12s, color .12s, opacity .12s, border-color .12s;
}
.proj-sidenav-item:hover { background: color-mix(in srgb, var(--glass-bg) 82%, transparent); opacity: .92; }
.proj-sidenav-item--active {
  background: color-mix(in srgb, var(--glass-bg) 92%, transparent);
  border: none;
  color: var(--glass-text);
  opacity: 1;
  font-weight: 600;
}

/* ── Right content ── */
.proj-main { flex: 1; min-width: 0; }
.proj-main-inner { /* wrapper for Transition — no extra layout effect */ }

/* ── Section switch fade ── */
.tab-fade-enter-active { transition: opacity .35s ease-in-out; }
.tab-fade-leave-active { transition: opacity .25s ease-in-out; }
.tab-fade-enter-from  { opacity: 0; }
.tab-fade-leave-to    { opacity: 0; }

/* ── Contractor preview card ── */
.ctr-card { padding: 4px 0 32px; }
.ctr-name { font-size: 1rem; font-weight: 500; margin-bottom: 3px; }
.ctr-sub  { font-size: .76rem; color: #999; margin-bottom: 14px; }
.ctr-rows { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; }
.ctr-row  { display: flex; align-items: baseline; gap: 10px; }
.ctr-lbl  { font-size: .68rem; text-transform: uppercase; letter-spacing: .06em; color: #aaa; width: 52px; flex-shrink: 0; }
.ctr-val  { font-size: .82rem; color: inherit; text-decoration: none; }
.ctr-val:hover { text-decoration: underline; }
.ctr-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }
.ctr-chip  { font-size: .7rem; padding: 3px 8px; border: 1px solid var(--border, #e0e0e0); border-radius: 999px; }
.ctr-notes { font-size: .8rem; color: #888; margin-bottom: 14px; line-height: 1.5; }
.ctr-link-full { font-size: .72rem; color: #999; text-decoration: none; border-bottom: 1px dashed currentColor; }
.ctr-link-full:hover { color: inherit; }
.proj-preview-banner {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px 10px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--glass-border);
}
.proj-preview-label {
  font-size: .66rem; text-transform: uppercase; letter-spacing: .06em;
  color: var(--glass-text); opacity: .6; flex: 1;
}
.proj-preview-exit {
  font-size: .7rem; color: var(--glass-text); opacity: .45;
  text-decoration: none; padding: 2px 6px;
  border: 1px solid var(--glass-border); border-radius: 4px;
  white-space: nowrap;
}
.proj-preview-exit:hover { opacity: .9; }
.proj-sidenav-icon { margin-right: 4px; font-size: .8rem; }
.proj-sidenav-empty { font-size: .76rem; color: #bbb; padding: 10px; }

/* ── Modal ── */
.a-field { margin-bottom: 14px; }
.a-field label { display: block; font-size: .76rem; color: #888; margin-bottom: 5px; }
.a-input {
  display: block; width: 100%; border: none; border-bottom: 1px solid #ddd;
  padding: 8px 0; font-size: .88rem; outline: none; font-family: inherit;
  color: inherit; background: transparent;
}
.a-input:focus { border-bottom-color: #1a1a1a; }
.a-modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.3);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.a-modal {
  background: #fff; border: none;
  padding: 32px; width: 480px; max-width: 90vw; max-height: 90vh; overflow-y: auto;
}
.dark .a-modal { background: #1a1a1c; border-color: #2a2a2e; }
</style>
