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
        <div class="proj-client-title">
          клиент проекта
          <button type="button" class="admin-mini-chip admin-mini-chip--dim" style="margin-left:8px" @click="showClientModal = true">+</button>
        </div>
        <div v-if="showClientForm" class="proj-client-row">
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
        <div class="proj-client-title">
          подрядчики проекта
          <button type="button" class="admin-mini-chip admin-mini-chip--dim" style="margin-left:8px" @click="showContractorModal = true">+</button>
        </div>
        <div v-if="showContractorForm" class="proj-client-row">
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

      <div class="proj-content-area">

        <!-- Nav column + sidebar, sticky together -->
        <div class="proj-nav-col">

        <!-- Left sidebar: vertical nav -->
        <nav class="proj-sidenav std-sidenav">

          <!-- CLIENT PREVIEW MODE -->
          <template v-if="clientPreviewMode">
            <div class="proj-preview-banner">
              <span class="proj-preview-label">👁 клиент</span>
              <NuxtLink :to="`/admin/projects/${slug}`" class="proj-preview-exit">× выйти</NuxtLink>
            </div>
            <!-- Link client to project (if none linked yet) -->
            <div v-if="!linkedClients.length" class="proj-client-link-inline">
              <select v-model="selectedClientId" class="proj-client-select-sm">
                <option value="">— привязать клиента —</option>
                <option v-for="c in clients" :key="c.id" :value="String(c.id)">
                  {{ c.name }}
                </option>
              </select>
              <button class="proj-client-btn-sm" :disabled="!selectedClientId || linkingClient" @click="linkClientToProject">
                {{ linkingClient ? '...' : '✓' }}
              </button>
            </div>
            <div v-else class="proj-client-link-inline proj-client-link-inline--name">
              <span class="proj-client-linked-name">{{ linkedClients.map(c => c.name).join(', ') }}</span>
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

          <!-- ADMIN NAV with roadmap dots -->
          <template v-else>
            <template v-for="(group, gi) in navGroups" :key="group.label">
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

        <!-- Roadmap tracker — separate column to the left -->
        <div v-if="!clientPreviewMode && !contractorPreviewMode" ref="rmColRef" class="rm-col">
          <div class="rm-track" :style="{ top: rmTrackTop + 'px', bottom: rmTrackBottom + 'px' }" />
          <div class="rm-fill" :style="{ top: rmTrackTop + 'px', height: rmFillPx + 'px' }" />
          <template v-for="group in navGroups" :key="'rm-' + group.label">
            <div v-if="group.pages.length" class="rm-group">
              <div class="rm-phase-row" :data-rm-phase="group.label">
                <span class="rm-dot rm-dot--phase" :class="[rmPhaseClass(group)]">
                  <span v-if="rmPhaseDone(group)" class="rm-inner" />
                </span>
              </div>
              <div
                v-for="pg in group.pages"
                :key="pg.slug"
                class="rm-item-row"
              >
                <span
                  class="rm-dot rm-dot--item"
                  :class="`rm-dot--${rmStatusOf(pg.slug)}`"
                  :data-rm-slug="pg.slug"
                  @click="rmSliderClick(pg)"
                >
                  <span v-if="rmStatusOf(pg.slug) === 'done'" class="rm-inner rm-inner--sm" />
                </span>
              </div>
            </div>
          </template>
        </div>
        </div><!-- /.proj-nav-col -->

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

    <!-- Client Selection Modal -->
    <div v-if="showClientModal" class="a-modal-backdrop" @click.self="showClientModal = false">
      <div class="a-modal">
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:20px">добавить клиента в проект</h3>
        <div class="modal-clients-list">
          <div
            v-for="client in clients"
            :key="client.id"
            class="modal-client-item"
            :class="{ 'modal-client-item--linked': linkedClientIds.includes(String(client.id)) }"
          >
            <div class="modal-client-info">
              <div class="modal-client-name">{{ client.name }}</div>
              <div class="modal-client-details">
                <template v-if="client.phone">{{ client.phone }}</template>
                <template v-else-if="client.email">{{ client.email }}</template>
              </div>
            </div>
            <button
              v-if="!linkedClientIds.includes(String(client.id))"
              type="button"
              class="modal-action-btn modal-action-btn--add"
              @click="linkClientFromModal(String(client.id))"
            >+</button>
            <button
              v-else
              type="button"
              class="modal-action-btn modal-action-btn--remove"
              @click="unlinkClientFromModal(String(client.id))"
            >-</button>
          </div>
        </div>
        <p v-if="clientLinkError" style="color:#c00;font-size:.8rem;margin:10px 0">{{ clientLinkError }}</p>
        <p v-if="clientLinkSuccess" style="color:#5caa7f;font-size:.8rem;margin:10px 0">{{ clientLinkSuccess }}</p>
        <div style="display:flex;justify-content:flex-end;margin-top:20px">
          <button type="button" class="a-btn-sm" @click="showClientModal = false">закрыть</button>
        </div>
      </div>
    </div>

    <!-- Contractor Selection Modal -->
    <div v-if="showContractorModal" class="a-modal-backdrop" @click.self="showContractorModal = false">
      <div class="a-modal">
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:20px">добавить подрядчика в проект</h3>
        <div class="modal-contractors-list">
          <div
            v-for="contractor in allContractors"
            :key="contractor.id"
            class="modal-contractor-item"
            :class="{ 'modal-contractor-item--linked': linkedContractorIds.has(String(contractor.id)) }"
          >
            <div class="modal-contractor-info">
              <div class="modal-contractor-name">{{ contractor.name }}</div>
              <div class="modal-contractor-details">
                <template v-if="contractor.companyName">{{ contractor.companyName }}</template>
                <template v-else-if="contractor.phone">{{ contractor.phone }}</template>
              </div>
            </div>
            <button
              v-if="!linkedContractorIds.has(String(contractor.id))"
              type="button"
              class="modal-action-btn modal-action-btn--add"
              @click="linkContractorFromModal(contractor.id)"
            >+</button>
            <button
              v-else
              type="button"
              class="modal-action-btn modal-action-btn--remove"
              @click="unlinkContractor(contractor.id)"
            >-</button>
          </div>
        </div>
        <p v-if="contractorLinkError" style="color:#c00;font-size:.8rem;margin:10px 0">{{ contractorLinkError }}</p>
        <p v-if="contractorLinkSuccess" style="color:#5caa7f;font-size:.8rem;margin:10px 0">{{ contractorLinkSuccess }}</p>
        <div style="display:flex;justify-content:flex-end;margin-top:20px">
          <button type="button" class="a-btn-sm" @click="showContractorModal = false">закрыть</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getAdminPages, getAdminNavGroups, getClientPages } from '~~/shared/constants/pages'
import { normalizeRoadmapStatus } from '~~/shared/utils/roadmap'
import type { Component } from 'vue'
import {
  AdminWorkStatus,
  AdminClientProfile,
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
  ClientPageContent,
  ClientInitiation,
  ClientContactDetails,
  ClientTimeline,
  ClientDesignAlbum,
  ClientContracts,
  ClientSelfProfile,
  ClientBrief,
  ClientTZ,
  ClientWorkProgress,
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

// ── Roadmap dot tracker (inline in sidebar) ─────────────────────
const rmMap = reactive<Record<string, string>>({})
const rmSaving = ref(false)
const rmColRef = ref<HTMLElement>()

function rmStatusOf(s: string): string { return rmMap[s] || 'pending' }

function rmPhaseDone(group: { pages: { slug: string }[] }): boolean {
  return group.pages.length > 0 && group.pages.every(p => rmStatusOf(p.slug) === 'done')
}

function rmPhasePartial(group: { pages: { slug: string }[] }): boolean {
  return group.pages.some(p => rmStatusOf(p.slug) === 'done' || rmStatusOf(p.slug) === 'in_progress') && !rmPhaseDone(group)
}

function rmPhaseClass(group: { pages: { slug: string }[] }): string {
  if (rmPhaseDone(group)) return 'rm-dot--phase-done'
  if (rmPhasePartial(group)) return 'rm-dot--phase-partial'
  return ''
}

// Flat ordered list of pages matching render order
const rmAllPages = computed(() => {
  const pages: { slug: string; title: string }[] = []
  for (const group of navGroups.value) {
    for (const pg of group.pages) pages.push(pg)
  }
  return pages
})

// Slider click: everything up to this item = done, everything after = pending
// If clicking the last done item, reset it (slide back one)
async function rmSliderClick(pg: { slug: string; title: string }) {
  if (rmSaving.value) return
  const pages = rmAllPages.value
  const clickedIdx = pages.findIndex(p => p.slug === pg.slug)
  if (clickedIdx < 0) return

  // If this is the last done item, slide back
  const currentLastDone = pages.reduce((acc, p, i) => rmStatusOf(p.slug) === 'done' ? i : acc, -1)
  const targetIdx = (clickedIdx === currentLastDone) ? clickedIdx - 1 : clickedIdx

  // Compute changed items
  const changes: { slug: string; title: string; status: string }[] = []
  for (let i = 0; i < pages.length; i++) {
    const desired = i <= targetIdx ? 'done' : 'pending'
    if (rmStatusOf(pages[i].slug) !== desired) {
      changes.push({ slug: pages[i].slug, title: pages[i].title, status: desired })
    }
  }
  if (!changes.length) return

  // Instant visual update
  for (const c of changes) rmMap[c.slug] = c.status
  updateFillLine()

  // Save all changes
  rmSaving.value = true
  try {
    await Promise.all(changes.map(c =>
      $fetch(`/api/projects/${slug.value}/roadmap-stage`, {
        method: 'PATCH',
        body: { stageKey: c.slug, title: c.title, status: c.status },
      })
    ))
    useRoadmapBus().notifySaved()
  } catch {
    // Reload on error to get real state
    await loadRmStatuses()
  } finally {
    rmSaving.value = false
  }
}

// Fill line + track line positions (measured from DOM)
const rmFillPx = ref(0)
const rmTrackTop = ref(0)
const rmTrackBottom = ref(0)

function updateFillLine() {
  nextTick(() => {
    if (!rmColRef.value) return
    const col = rmColRef.value
    const colRect = col.getBoundingClientRect()

    // All dots: phase + items
    const phaseDots = Array.from(col.querySelectorAll<HTMLElement>('.rm-dot--phase'))
    const itemDots = Array.from(col.querySelectorAll<HTMLElement>('[data-rm-slug]'))
    const allDots = [...phaseDots, ...itemDots].sort((a, b) => {
      return a.getBoundingClientRect().top - b.getBoundingClientRect().top
    })
    if (!allDots.length) {
      rmFillPx.value = 0
      rmTrackTop.value = 0
      rmTrackBottom.value = 0
      return
    }

    // Track: from first dot center to last dot center
    const firstRect = allDots[0].getBoundingClientRect()
    const lastRect = allDots[allDots.length - 1].getBoundingClientRect()
    const firstCenter = firstRect.top + firstRect.height / 2 - colRect.top
    const lastCenter = lastRect.top + lastRect.height / 2 - colRect.top
    rmTrackTop.value = firstCenter
    rmTrackBottom.value = colRect.height - lastCenter

    // Fill: from first dot center to last done dot center
    let lastDoneEl: HTMLElement | null = null
    for (const dot of itemDots) {
      const s = dot.dataset.rmSlug || ''
      if (rmStatusOf(s) === 'done') lastDoneEl = dot
    }
    if (!lastDoneEl) { rmFillPx.value = 0; return }

    const doneRect = lastDoneEl.getBoundingClientRect()
    const doneCenter = doneRect.top + doneRect.height / 2 - colRect.top
    rmFillPx.value = doneCenter - firstCenter
  })
}

async function loadRmStatuses() {
  try {
    const rows = await $fetch<any[]>(`/api/projects/${slug.value}/roadmap`)
    for (const row of rows) {
      if (row.stageKey) rmMap[row.stageKey] = normalizeRoadmapStatus(row.status)
    }
  } catch { /* ignore */ }
  updateFillLine()
}

onMounted(loadRmStatuses)
const { lastSaved: rmLastSaved } = useRoadmapBus()
watch(rmLastSaved, loadRmStatuses)
const selectedClientId = ref('')
const linkingClient = ref(false)
const clientLinkError = ref('')
const clientLinkSuccess = ref('')
const showClientForm = ref(false)
const showClientModal = ref(false)
// ── Contractor link state ─────────────────────────────────────────
const selectedContractorId = ref('')
const linkingContractor = ref(false)
const contractorLinkError = ref('')
const contractorLinkSuccess = ref('')
const showContractorForm = ref(false)
const showContractorModal = ref(false)

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

// Modal functions for contractors
async function linkContractorFromModal(contractorId: number) {
  contractorLinkError.value = ''
  contractorLinkSuccess.value = ''
  try {
    await $fetch(`/api/projects/${slug.value}/contractors`, {
      method: 'POST',
      body: { contractorId },
    })
    await refreshLinkedContractors()
    contractorLinkSuccess.value = 'Подрядчик добавлен'
    setTimeout(() => { contractorLinkSuccess.value = '' }, 3000)
  } catch (e: any) {
    contractorLinkError.value = e?.data?.message || 'Не удалось добавить подрядчика'
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
  work_status: AdminWorkStatus,
  profile_customer: AdminClientProfile,
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
function selectAdminPage(slug: string) {
  activePage.value = slug
}

function selectClientPage(slug: string) {
  clientActivePage.value = slug
}

function selectContractorSection(key: string) {
  contractorSection.value = key
}

const clientPageComponentMap: Record<string, Component> = {
  phase_init:            ClientInitiation,
  self_profile:          ClientSelfProfile,
  brief:                 ClientSelfProfile,
  client_contacts:       ClientContactDetails,
  client_brief:          ClientBrief,
  client_tz:             ClientTZ,
  contracts:             ClientContracts,
  work_progress:         ClientWorkProgress,
  design_timeline:       ClientTimeline,
  design_album:          ClientDesignAlbum,
}

const allClientPages = getClientPages()

const clientNavPages = computed(() => {
  const pages = project.value?.pages || []
  return allClientPages.filter(p => {
    // Client-only pages (no phase) are always visible
    if (!p.phase) return true
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

// Modal functions for clients
async function linkClientFromModal(clientId: string) {
  try {
    await $fetch(`/api/clients/${clientId}/link-project`, {
      method: 'POST',
      body: { projectSlug: slug.value },
    })
    await refresh()
    clientLinkSuccess.value = 'Клиент добавлен в проект'
    setTimeout(() => { clientLinkSuccess.value = '' }, 3000)
  } catch (e: any) {
    clientLinkError.value = e?.data?.statusMessage || 'Не удалось добавить клиента'
  }
}

async function unlinkClientFromModal(clientId: string) {
  try {
    await $fetch(`/api/clients/${clientId}/unlink-project`, {
      method: 'POST',
      body: { projectSlug: slug.value },
    })
    await refresh()
    clientLinkSuccess.value = 'Клиент удален из проекта'
    setTimeout(() => { clientLinkSuccess.value = '' }, 2500)
  } catch (e: any) {
    clientLinkError.value = e?.data?.statusMessage || 'Не удалось удалить клиента'
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
  display: flex;
  align-items: center;
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

/* ── Client link inline (inside client preview sidebar) ── */
.proj-client-link-inline {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 10px; margin-bottom: 6px;
}
.proj-client-link-inline--name {
  padding: 4px 10px 8px;
  border-bottom: 1px solid var(--glass-border);
}
.proj-client-linked-name {
  font-size: .76rem; color: var(--glass-text); opacity: .7; font-weight: 500;
}
.proj-client-select-sm {
  flex: 1; min-width: 0; font-size: .72rem; font-family: inherit;
  padding: 4px 6px; border-radius: 6px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg); color: var(--glass-text);
}
.proj-client-btn-sm {
  border: none; background: var(--glass-text); color: var(--glass-page-bg);
  width: 24px; height: 24px; border-radius: 6px; font-size: .72rem;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: opacity .15s;
}
.proj-client-btn-sm:disabled { opacity: .4; cursor: default; }
.proj-client-btn-sm:hover:not(:disabled) { opacity: .8; }

/* ── Layout ── */
.proj-content-area { display: flex; align-items: flex-start; gap: 0; }

/* Nav column — contains nav + roadmap col side by side ── */
.proj-nav-col {
  position: sticky;
  top: 80px;
  align-self: flex-start;
  flex-shrink: 0;
  overflow: visible;
  margin-right: 20px;
}

/* ── Left sidebar nav ── */
.proj-sidenav {
  width: 190px; flex-shrink: 0;
  padding: 10px;
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

/* ── Roadmap column ─────────────────────────────────────── */
.rm-col {
  width: 24px;
  flex-shrink: 0;
  position: absolute;
  left: -30px;
  top: 0;
  bottom: 0;
  padding-top: 10px;
  padding-bottom: 10px;
}

/* Rows match nav item heights */
.rm-group { margin-bottom: 18px; }
.rm-group:last-child { margin-bottom: 0; }

.rm-phase-row {
  height: 22px; /* matches group-label line-height + margins */
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rm-item-row {
  height: 35px; /* matches sidenav-item height (9px + line + 9px) approx */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Base dot */
.rm-dot {
  border-radius: 50%;
  background: var(--glass-bg, #12121a);
  border: 2px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  z-index: 3;
  box-sizing: border-box;
  transition: border-color .25s, background .25s, box-shadow .25s, transform .15s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

/* ── Phase dot — large ── */
.rm-dot--phase {
  width: 14px;
  height: 14px;
}
.rm-dot--phase-partial {
  border-color: color-mix(in srgb, var(--glass-text) 35%, transparent);
  background: color-mix(in srgb, var(--glass-text) 6%, var(--glass-bg, #12121a));
}
.rm-dot--phase-done {
  border-color: color-mix(in srgb, var(--glass-text) 52%, transparent);
  background: color-mix(in srgb, var(--glass-text) 14%, var(--glass-bg, #12121a));
}

/* ── Sub-item dot ── */
.rm-dot--item {
  width: 11px;
  height: 11px;
  cursor: pointer;
}
.rm-dot--item:hover {
  border-color: color-mix(in srgb, var(--glass-text) 40%, transparent);
  transform: scale(1.3);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--glass-text) 6%, transparent);
}

/* ── Status variants ── */
.rm-dot--done {
  border-color: color-mix(in srgb, var(--glass-text) 48%, transparent);
  background: var(--glass-bg, #12121a);
}
.rm-dot--in_progress {
  border-color: color-mix(in srgb, var(--glass-text) 28%, transparent);
  background: var(--glass-bg, #12121a);
}
.rm-dot--pending {
  border-color: color-mix(in srgb, var(--glass-text) 10%, transparent);
}

/* ── Inner filled circle (instead of checkmarks) ── */
.rm-inner {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--glass-text);
  opacity: .5;
  display: block;
}
.rm-inner--sm {
  width: 5px;
  height: 5px;
  opacity: .45;
}

/* ── Track line ── */
.rm-track {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  pointer-events: none;
  z-index: 1;
  border-radius: 2px;
  transition: top .3s, bottom .3s;
}

/* ── Fill line ── */
.rm-fill {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--glass-text) 36%, transparent),
    color-mix(in srgb, var(--glass-text) 26%, transparent)
  );
  pointer-events: none;
  z-index: 2;
  border-radius: 2px;
  transition: height .35s cubic-bezier(.4, 0, .2, 1);
}

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

/* Small circle chip — matches admin layout style */
.admin-mini-chip {
  width: 24px; height: 24px;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--glass-text);
  font-size: .6rem;
  font-weight: var(--ds-heading-weight, 700);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  transition: opacity var(--ds-transition, 150ms ease), background var(--ds-transition, 150ms ease);
}
.admin-mini-chip--dim {
  background: transparent;
  opacity: .38;
}
.admin-mini-chip:hover { opacity: 1; background: var(--glass-bg); }

/* Modal Lists */
.modal-clients-list, .modal-contractors-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.modal-client-item, .modal-contractor-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid var(--glass-border, #e0e0e0);
  border-radius: 8px;
  margin-bottom: 8px;
  background: var(--glass-bg, #fff);
  transition: background .15s, border-color .15s;
}

.modal-client-item--linked, .modal-contractor-item--linked {
  background: color-mix(in srgb, var(--glass-bg) 94%, var(--glass-text) 6%);
  border-color: color-mix(in srgb, var(--glass-border) 80%, var(--glass-text) 20%);
}

.modal-client-info, .modal-contractor-info {
  flex: 1;
  min-width: 0;
}

.modal-client-name, .modal-contractor-name {
  font-size: .88rem;
  font-weight: 500;
  color: var(--glass-text, #1a1a1a);
  margin-bottom: 2px;
}

.modal-client-details, .modal-contractor-details {
  font-size: .76rem;
  color: color-mix(in srgb, var(--glass-text) 70%, transparent);
}

.modal-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  font-size: .9rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background .15s, color .15s, transform .1s;
}

.modal-action-btn--add {
  background: #28a745;
  color: #fff;
}

.modal-action-btn--add:hover {
  background: #218838;
  transform: scale(1.05);
}

.modal-action-btn--remove {
  background: #dc3545;
  color: #fff;
}

.modal-action-btn--remove:hover {
  background: #c82333;
  transform: scale(1.05);
}

</style>
