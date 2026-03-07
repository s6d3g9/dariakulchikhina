<template>
  <div>
    <div v-if="projectPending" class="ent-page-skeleton" style="padding:20px">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 8" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    </div>
    <div v-else-if="!project" style="font-size:.88rem;color:#999">Проект не найден</div>
    <template v-else>
      <div class="proj-header-bar">
        <div class="proj-breadcrumb">
          <NuxtLink to="/admin" class="proj-bc-link proj-bc-back">← Доска</NuxtLink>
          <span class="proj-bc-sep">/</span>
          <span class="proj-bc-title">{{ project.title }}</span>
        </div>
        <div class="proj-phase-sel-wrap">
          <span class="proj-phase-dot" :class="`pj-phase--${phaseColor(projectStatus)}`"></span>
          <select
            v-model="projectStatus"
            class="u-status-sel proj-phase-sel"
            :disabled="savingStatus"
            @change="setProjectStatus(projectStatus)"
          >
            <option v-for="ph in PROJECT_PHASES" :key="ph.key" :value="ph.key">{{ ph.label }}</option>
          </select>
          <span v-if="savingStatus" class="proj-phase-saving">...</span>
        </div>
      </div>
      <p v-if="clientLinkError" class="proj-client-error" style="margin-bottom:6px">{{ clientLinkError }}</p>
      <p v-else-if="clientLinkSuccess" class="proj-client-success" style="margin-bottom:6px">{{ clientLinkSuccess }}</p>
      <p v-if="contractorLinkError" class="proj-client-error" style="margin-bottom:6px">{{ contractorLinkError }}</p>
      <p v-else-if="contractorLinkSuccess" class="proj-client-success" style="margin-bottom:6px">{{ contractorLinkSuccess }}</p>
      <p v-if="designerLinkError" class="proj-client-error" style="margin-bottom:6px">{{ designerLinkError }}</p>
      <p v-else-if="designerLinkSuccess" class="proj-client-success" style="margin-bottom:6px">{{ designerLinkSuccess }}</p>

      <!-- ═══ Mobile top horizontal nav bar ═══ -->
      <div v-if="!contractorPreviewMode" class="proj-mobile-nav">
        <!-- Client preview mode -->
        <template v-if="clientPreviewMode">
          <div class="proj-mobile-bar-header">
            <span class="proj-mobile-bar-label">👁 клиент</span>
            <NuxtLink :to="`/admin/projects/${slug}`" class="proj-preview-exit" style="font-size:.72rem">× выйти</NuxtLink>
          </div>
          <div class="proj-mobile-bar-scroll">
            <button
              v-for="pg in clientNavPages" :key="pg.slug"
              class="proj-mobile-bar-btn"
              :class="{ 'proj-mobile-bar-btn--active': clientActivePage === pg.slug }"
              @click="selectClientPage(pg.slug)"
            >
              <span v-if="pg.icon" class="proj-mobile-bar-icon">{{ pg.icon }}</span>
              {{ pg.title }}
            </button>
          </div>
        </template>
        <!-- Admin mode: phase groups as scrollable tabs -->
        <template v-else>
          <div class="proj-mobile-bar-scroll">
            <button
              class="proj-mobile-bar-btn"
              :class="{ 'proj-mobile-bar-btn--active': activePage === 'overview' }"
              @click="selectAdminPage('overview')"
            >◈ обзор</button>
            <button
              class="proj-mobile-bar-btn"
              :class="{ 'proj-mobile-bar-btn--active': activePage === 'tasks' }"
              @click="selectAdminPage('tasks')"
            >✅ задания</button>
            <template v-for="group in navGroups" :key="'mob-' + group.label">
              <button
                v-for="pg in group.pages" :key="pg.slug"
                class="proj-mobile-bar-btn"
                :class="{ 'proj-mobile-bar-btn--active': activePage === pg.slug }"
                @click="selectAdminPage(pg.slug)"
              >{{ pg.title }}</button>
            </template>
          </div>
        </template>
      </div>

      <div class="proj-content-area">

        <!-- Nav column + sidebar, sticky together -->
        <div v-if="!contractorPreviewMode" class="proj-nav-col">

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
              <select v-model="selectedClientId" class="u-status-sel">
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

          <!-- ADMIN NAV -->
          <template v-else-if="!contractorPreviewMode">
            <button
              class="proj-sidenav-item std-nav-item"
              :class="{ 'proj-sidenav-item--active': activePage === 'overview', 'std-nav-item--active': activePage === 'overview' }"
              @click="selectAdminPage('overview')"
              style="margin-bottom:8px"
            ><span class="proj-sidenav-icon">◈</span> обзор</button>
            <template v-for="(group, gi) in navGroups" :key="group.label">
              <div class="proj-sidenav-group" v-if="group.pages.length">
                <div class="proj-sidenav-group-label std-nav-group-label">{{ group.label }}</div>
                <button
                  v-for="pg in group.pages"
                  :key="pg.slug"
                  class="proj-sidenav-item std-nav-item"
                  :class="{
                    'proj-sidenav-item--active': activePage === pg.slug,
                    'std-nav-item--active': activePage === pg.slug,
                    'proj-sidenav-item--current-phase': STATUS_TO_FIRST_PAGE[projectStatus] === pg.slug,
                  }"
                  @click="selectAdminPage(pg.slug)"
                >
                  <span
                    v-if="STATUS_TO_FIRST_PAGE[projectStatus] === pg.slug"
                    class="proj-sidenav-phase-dot"
                    :class="`pj-phase--${phaseColor(projectStatus)}`"
                  ></span>
                  {{ pg.title }}
                </button>
              </div>
            </template>

            <!-- ── Задания ── -->
            <button
              class="proj-sidenav-item std-nav-item"
              :class="{ 'proj-sidenav-item--active': activePage === 'tasks', 'std-nav-item--active': activePage === 'tasks' }"
              @click="selectAdminPage('tasks')"
              style="margin-top:8px"
            ><span class="proj-sidenav-icon">✅</span> задания</button>

            <!-- ── Visit / Payment / Follow-up widget ── -->
            <div class="proj-visit-widget">
              <div class="proj-visit-widget-title" @click="visitWidgetOpen = !visitWidgetOpen">
                <span>📅 выезд · оплата · follow-up</span>
                <span class="proj-visit-widget-caret">{{ visitWidgetOpen ? '▲' : '▼' }}</span>
              </div>
              <div v-if="visitWidgetOpen" class="proj-visit-widget-body">
                <div class="proj-vw-group">
                  <div class="proj-vw-label">Выезд</div>
                  <input v-model="visitForm.visit_contractor_name" class="proj-vw-input" placeholder="Подрядчик / дизайнер" />
                  <div class="proj-vw-row">
                    <input v-model="visitForm.visit_date" type="date" class="proj-vw-input proj-vw-input--half" />
                    <input v-model="visitForm.visit_time" type="time" class="proj-vw-input proj-vw-input--half" />
                  </div>
                  <input v-model="visitForm.visit_services" class="proj-vw-input" placeholder="Описание услуг" />
                  <select v-model="visitForm.visit_status" class="proj-vw-input">
                    <option value="">— статус —</option>
                    <option value="scheduled">запланирован</option>
                    <option value="done">проведён</option>
                    <option value="noshow">не явился</option>
                    <option value="postponed">перенесён</option>
                    <option value="cancelled">отменён</option>
                  </select>
                  <input v-if="visitForm.visit_status === 'postponed'" v-model="visitForm.visit_postponed_date" type="date" class="proj-vw-input" placeholder="Новая дата" />
                </div>
                <div class="proj-vw-group">
                  <div class="proj-vw-label">Оплата</div>
                  <div class="proj-vw-row">
                    <input v-model="visitForm.contract_paid" class="proj-vw-input proj-vw-input--half" placeholder="Оплачено ₽" />
                    <input v-model="visitForm.contract_total" class="proj-vw-input proj-vw-input--half" placeholder="Итого ₽" />
                  </div>
                </div>
                <div class="proj-vw-group">
                  <div class="proj-vw-label">Follow-up</div>
                  <input v-model="visitForm.follow_up_date" type="date" class="proj-vw-input" />
                  <input v-model="visitForm.follow_up_note" class="proj-vw-input" placeholder="Заметка" />
                </div>
                <button class="proj-vw-save" :disabled="savingVisitForm" @click="saveVisitData">
                  {{ savingVisitForm ? '...' : 'сохранить' }}
                </button>
                <p v-if="visitSaveError" class="proj-vw-error">{{ visitSaveError }}</p>
                <p v-if="visitSaveOk" class="proj-vw-ok">✓ сохранено</p>
                <!-- Contact request from client -->
                <div v-if="project?.profile?.contact_request_slot" class="proj-contact-req" :class="project?.profile?.contact_request_status === 'pending' ? 'proj-contact-req--pending' : ''">
                  <div class="proj-contact-req-title">📞 Клиент просит перезвонить</div>
                  <div class="proj-contact-req-slot">{{ project.profile.contact_request_slot }}</div>
                  <div v-if="project?.profile?.contact_request_msg" class="proj-contact-req-msg">{{ project.profile.contact_request_msg }}</div>
                  <div class="proj-contact-req-meta">{{ fmtContactReqDate(project.profile.contact_request_at) }}</div>
                </div>
              </div>
            </div>

          </template>

        </nav>
        </div><!-- /.proj-nav-col -->

        <!-- Right content -->
        <div class="proj-main">
          <Transition name="tab-fade" mode="out-in">
            <div :key="contentKey" class="proj-main-inner">
              <!-- contractor preview -->
              <template v-if="contractorPreviewMode">
                <div v-if="contractorPending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
                <template v-else-if="contractorData">
                  <AdminContractorCabinet :contractor-id="contractorPreviewId" />
                </template>
              </template>
              <!-- client preview -->
              <component
                v-else-if="clientPreviewMode"
                :is="clientActiveComponent"
                v-bind="clientActiveComponentProps"
              />
              <!-- admin view -->
              <template v-else-if="activePage === 'overview'">
                <AdminProjectOverview
                  :slug="slug"
                  :project="project"
                  :clients="linkedClients"
                  :contractors="linkedContractorsList"
                  :designers="linkedDesignersList"
                  @navigate="selectAdminPage"
                />
              </template>
              <!-- Tasks tab -->
              <template v-else-if="activePage === 'tasks'">
                <AdminTaskList :project-id="project.id" />
              </template>
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
            <input v-model="editForm.title" class="glass-input" required>
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
          <p v-if="editError" style="color:var(--ds-error, #c00);font-size:.8rem;margin-bottom:10px">{{ editError }}</p>
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
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:20px">клиенты проекта</h3>

        <div v-if="linkedClients.length" style="margin-bottom:14px">
          <div style="font-size:.72rem;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">закреплённые</div>
          <div class="modal-clients-list">
            <div v-for="client in linkedClients" :key="`linked-${client.id}`" class="modal-client-item modal-client-item--linked">
              <div class="modal-client-info">
                <div class="modal-client-name">{{ client.name }}</div>
                <div class="modal-client-details">
                  <template v-if="client.phone">{{ client.phone }}</template>
                  <template v-else-if="client.email">{{ client.email }}</template>
                </div>
              </div>
              <button
                type="button"
                class="modal-action-btn modal-action-btn--remove"
                @click="unlinkClientFromModal(String(client.id))"
              >-</button>
            </div>
          </div>
        </div>

        <div style="font-size:.72rem;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">доступные для привязки</div>
        <div class="modal-clients-list">
          <div
            v-for="client in availableClientsForModal"
            :key="client.id"
            class="modal-client-item"
          >
            <div class="modal-client-info">
              <div class="modal-client-name">{{ client.name }}</div>
              <div class="modal-client-details">
                <template v-if="client.phone">{{ client.phone }}</template>
                <template v-else-if="client.email">{{ client.email }}</template>
              </div>
            </div>
            <button
              type="button"
              class="modal-action-btn modal-action-btn--add"
              @click="linkClientFromModal(String(client.id))"
            >+</button>
          </div>
        </div>
        <div v-if="!linkedClients.length && !availableClientsForModal.length" style="font-size:.82rem;color:#888">Нет клиентов в системе</div>
        <p v-if="clientLinkError" style="color:var(--ds-error, #c00);font-size:.8rem;margin:10px 0">{{ clientLinkError }}</p>
        <p v-if="clientLinkSuccess" style="color:var(--ds-success, #5caa7f);font-size:.8rem;margin:10px 0">{{ clientLinkSuccess }}</p>
        <div style="display:flex;justify-content:flex-end;margin-top:20px">
          <button type="button" class="a-btn-sm" @click="showClientModal = false">закрыть</button>
        </div>
      </div>
    </div>

    <!-- Contractor Selection Modal -->
    <div v-if="showContractorModal" class="a-modal-backdrop" @click.self="showContractorModal = false">
      <div class="a-modal">
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:20px">подрядчики проекта</h3>

        <div v-if="linkedContractorsList.length" style="margin-bottom:14px">
          <div style="font-size:.72rem;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">закреплённые</div>
          <div class="modal-contractors-list">
            <div
              v-for="contractor in linkedContractorsList"
              :key="`linked-${contractor.id}`"
              class="modal-contractor-item modal-contractor-item--linked"
            >
              <div class="modal-contractor-info">
                <div class="modal-contractor-name">{{ contractor.name }}</div>
                <div class="modal-contractor-details">
                  <template v-if="contractor.companyName">{{ contractor.companyName }}</template>
                  <template v-else-if="contractor.phone">{{ contractor.phone }}</template>
                </div>
              </div>
              <button
                type="button"
                class="modal-action-btn modal-action-btn--remove"
                @click="unlinkContractor(contractor.id)"
              >-</button>
            </div>
          </div>
        </div>

        <div style="font-size:.72rem;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">доступные для привязки</div>
        <div class="modal-contractors-list">
          <div
            v-for="contractor in availableContractorsForModal"
            :key="contractor.id"
            class="modal-contractor-item"
          >
            <div class="modal-contractor-info">
              <div class="modal-contractor-name">{{ contractor.name }}</div>
              <div class="modal-contractor-details">
                <template v-if="contractor.companyName">{{ contractor.companyName }}</template>
                <template v-else-if="contractor.phone">{{ contractor.phone }}</template>
              </div>
            </div>
            <button
              type="button"
              class="modal-action-btn modal-action-btn--add"
              @click="linkContractorFromModal(contractor.id)"
            >+</button>
          </div>
        </div>
        <div v-if="!linkedContractorsList.length && !availableContractorsForModal.length" style="font-size:.82rem;color:#888">Нет подрядчиков в системе</div>
        <p v-if="contractorLinkError" style="color:var(--ds-error, #c00);font-size:.8rem;margin:10px 0">{{ contractorLinkError }}</p>
        <p v-if="contractorLinkSuccess" style="color:var(--ds-success, #5caa7f);font-size:.8rem;margin:10px 0">{{ contractorLinkSuccess }}</p>
        <div style="display:flex;justify-content:flex-end;margin-top:20px">
          <button type="button" class="a-btn-sm" @click="showContractorModal = false">закрыть</button>
        </div>
      </div>
    </div>

    <!-- Designer Selection Modal -->
    <div v-if="showDesignerModal" class="a-modal-backdrop" @click.self="showDesignerModal = false">
      <div class="a-modal">
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:20px">дизайнеры проекта</h3>

        <div v-if="linkedDesignersList.length" style="margin-bottom:14px">
          <div style="font-size:.72rem;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">закреплённые</div>
          <div class="modal-designers-list">
            <div
              v-for="designer in linkedDesignersList"
              :key="`linked-${designer.id}`"
              class="modal-designer-item modal-designer-item--linked"
            >
              <div class="modal-designer-info">
                <div class="modal-designer-name">{{ designer.name }}</div>
                <div class="modal-designer-details">
                  <template v-if="designer.companyName">{{ designer.companyName }}</template>
                  <template v-else-if="designer.phone">{{ designer.phone }}</template>
                  <template v-else-if="designer.email">{{ designer.email }}</template>
                </div>
              </div>
              <button
                type="button"
                class="modal-action-btn modal-action-btn--remove"
                @click="unlinkDesigner(designer.id)"
              >-</button>
            </div>
          </div>
        </div>

        <div style="font-size:.72rem;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">доступные для привязки</div>
        <div class="modal-designers-list">
          <div
            v-for="designer in availableDesignersForModal"
            :key="designer.id"
            class="modal-designer-item"
          >
            <div class="modal-designer-info">
              <div class="modal-designer-name">{{ designer.name }}</div>
              <div class="modal-designer-details">
                <template v-if="designer.companyName">{{ designer.companyName }}</template>
                <template v-else-if="designer.phone">{{ designer.phone }}</template>
                <template v-else-if="designer.email">{{ designer.email }}</template>
              </div>
            </div>
            <button
              type="button"
              class="modal-action-btn modal-action-btn--add"
              @click="linkDesignerFromModal(designer.id)"
            >+</button>
          </div>
        </div>
        <div v-if="!linkedDesignersList.length && !availableDesignersForModal.length" style="font-size:.82rem;color:#888">Нет дизайнеров в системе</div>
        <p v-if="designerLinkError" style="color:var(--ds-error, #c00);font-size:.8rem;margin:10px 0">{{ designerLinkError }}</p>
        <p v-if="designerLinkSuccess" style="color:var(--ds-success, #5caa7f);font-size:.8rem;margin:10px 0">{{ designerLinkSuccess }}</p>
        <div style="display:flex;justify-content:flex-end;margin-top:20px">
          <button type="button" class="a-btn-sm" @click="showDesignerModal = false">закрыть</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getAdminPages, getAdminNavGroups, getClientPages } from '~~/shared/constants/pages'
import { PROJECT_PHASES } from '~~/shared/types/catalogs'
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
  ClientPassport,
  AdminProjectOverview,
} from '#components'

definePageMeta({ layout: 'admin', middleware: ['admin'], pageTransition: false })

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
  'work_status',
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
const { data: allDesignersData } = await useFetch<any[]>('/api/designers', { default: () => [] })
const { data: linkedDesignersData, refresh: refreshLinkedDesigners } = await useFetch<any[]>(
  `/api/projects/${slug.value}/designers`,
  { default: () => [] },
)
const activePage = ref('overview')
const showEdit = ref(false)
const saving = ref(false)
const editError = ref('')
const projectStatus = ref(project.value?.status || 'lead')
const savingStatus = ref(false)

// ── Visit / Payment / Follow-up widget ──────────────────────────
const visitWidgetOpen = ref(false)
const savingVisitForm = ref(false)
const visitSaveError = ref('')
const visitSaveOk = ref(false)
const visitForm = reactive({
  visit_contractor_name: '',
  visit_date: '',
  visit_time: '',
  visit_services: '',
  visit_status: '',
  visit_postponed_date: '',
  contract_total: '',
  contract_paid: '',
  follow_up_date: '',
  follow_up_note: '',
})

watch(project, (p) => {
  if (!p?.profile) return
  const pr = p.profile as Record<string, any>
  visitForm.visit_contractor_name = pr.visit_contractor_name || ''
  visitForm.visit_date            = pr.visit_date            || ''
  visitForm.visit_time            = pr.visit_time            || ''
  visitForm.visit_services        = pr.visit_services        || ''
  visitForm.visit_status          = pr.visit_status          || ''
  visitForm.visit_postponed_date  = pr.visit_postponed_date  || ''
  visitForm.contract_total        = pr.contract_total        || ''
  visitForm.contract_paid         = pr.contract_paid         || ''
  visitForm.follow_up_date        = pr.follow_up_date        || ''
  visitForm.follow_up_note        = pr.follow_up_note        || ''
}, { immediate: true })

async function saveVisitData() {
  savingVisitForm.value = true
  visitSaveError.value = ''
  visitSaveOk.value = false
  try {
    await $fetch(`/api/projects/${slug.value}/visit-data`, {
      method: 'PUT',
      body: { ...visitForm },
    })
    visitSaveOk.value = true
    setTimeout(() => { visitSaveOk.value = false }, 3000)
    await refresh()
  } catch (e: any) {
    visitSaveError.value = e?.data?.message || 'Ошибка сохранения'
  } finally {
    savingVisitForm.value = false
  }
}

function fmtContactReqDate(d: string | undefined) {
  if (!d) return ''
  try { return new Date(d).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  catch { return d }
}

const STATUS_TO_FIRST_PAGE: Record<string, string> = {
  lead:            'first_contact',
  concept:         'space_planning',
  working_project: 'working_drawings',
  procurement:     'procurement_list',
  construction:    'construction_plan',
  commissioning:   'punch_list',
  done:            'overview',
}

function phaseLabel(status: string) {
  return PROJECT_PHASES.find(p => p.key === status)?.label || status
}
function phaseColor(status: string) {
  return PROJECT_PHASES.find(p => p.key === status)?.color || 'gray'
}

async function setProjectStatus(newStatus: string) {
  if (newStatus === project.value?.status) return
  savingStatus.value = true
  try {
    await $fetch(`/api/projects/${slug.value}/status`, {
      method: 'PUT',
      body: { status: newStatus },
    })
    await refresh()
    const firstPage = STATUS_TO_FIRST_PAGE[newStatus]
    if (firstPage && firstPage !== 'overview') {
      selectAdminPage(firstPage)
    }
  } catch (e: any) {
    // revert selector on error
    projectStatus.value = project.value?.status || 'lead'
    console.error('Ошибка смены фазы:', e)
  } finally {
    savingStatus.value = false
  }
}

const selectedClientId = ref('')
const linkingClient = ref(false)
const clientLinkError = ref('')
const clientLinkSuccess = ref('')
const showClientModal = ref(false)
// ── Contractor link state ─────────────────────────────────────────
const selectedContractorId = ref('')
const linkingContractor = ref(false)
const contractorLinkError = ref('')
const contractorLinkSuccess = ref('')
const showContractorModal = ref(false)
// ── Designer link state ──────────────────────────────────────────
const linkingDesigner = ref(false)
const designerLinkError = ref('')
const designerLinkSuccess = ref('')
const showDesignerModal = ref(false)

const allContractors = computed(() => allContractorsData.value || [])
const linkedContractorsList = computed(() => linkedContractorsData.value || [])
const linkedContractorIds = computed(() => new Set(linkedContractorsList.value.map((c: any) => String(c.id))))
const allDesigners = computed(() => allDesignersData.value || [])
const linkedDesignersList = computed(() => linkedDesignersData.value || [])
const linkedDesignerIds = computed(() => new Set(linkedDesignersList.value.map((d: any) => String(d.id))))

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
    contractorLinkSuccess.value = 'Подрядчик привязан к проекту'
    setTimeout(() => { contractorLinkSuccess.value = '' }, 3000)
  } catch (e: any) {
    contractorLinkError.value = e?.data?.message || 'Не удалось привязать подрядчика'
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

const availableClientsForModal = computed(() => {
  const linkedSet = new Set(linkedClientIds.value)
  return clients.value.filter((c: any) => !linkedSet.has(String(c.id)))
})

const availableContractorsForModal = computed(() => {
  return allContractors.value.filter((c: any) => !linkedContractorIds.value.has(String(c.id)))
})

const availableDesignersForModal = computed(() => {
  return allDesigners.value.filter((d: any) => !linkedDesignerIds.value.has(String(d.id)))
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

const { data: contractorData, pending: contractorPending } = useFetch<any>(
  () => contractorPreviewId.value ? `/api/contractors/${contractorPreviewId.value}` : null,
  { watch: [contractorPreviewId] },
)

// ── Client preview mode ────────────────────────────────────────
const clientPreviewMode = computed(() => route.query.view === 'client')
const clientActivePage  = ref('')

// ── Content key: drives fade transition + scroll-reset on page switch ───────
const contentKey = computed(() => {
  if (contractorPreviewMode.value) return 'ctr-cabinet'
  if (clientPreviewMode.value)     return `cli-${clientActivePage.value}`
  return `adm-${activePage.value}`
})
function selectAdminPage(slug: string) {
  activePage.value = slug
  scrollMobileBarToActive()
}

function selectClientPage(slug: string) {
  clientActivePage.value = slug
  scrollMobileBarToActive()
}

/** Auto-scroll the mobile horizontal nav so the active button is visible */
function scrollMobileBarToActive() {
  nextTick(() => {
    const active = document.querySelector('.proj-mobile-bar-btn--active') as HTMLElement | null
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  })
}

const clientPageComponentMap: Record<string, Component> = {
  phase_init:            ClientInitiation,
  self_profile:          ClientSelfProfile,
  brief:                 ClientSelfProfile,
  client_contacts:       ClientContactDetails,
  client_passport:       ClientPassport,
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
    activePage.value = 'overview'
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
    clientLinkSuccess.value = 'Клиент привязан к проекту'
    setTimeout(() => { clientLinkSuccess.value = '' }, 3000)
  } catch (e: any) {
    clientLinkError.value = e?.data?.statusMessage || 'Не удалось привязать клиента'
  }
}

async function unlinkClientFromModal(clientId: string) {
  try {
    await $fetch(`/api/clients/${clientId}/unlink-project`, {
      method: 'POST',
      body: { projectSlug: slug.value },
    })
    await refresh()
    clientLinkSuccess.value = 'Клиент отвязан от проекта'
    setTimeout(() => { clientLinkSuccess.value = '' }, 2500)
  } catch (e: any) {
    clientLinkError.value = e?.data?.statusMessage || 'Не удалось отвязать клиента'
  }
}

async function linkDesignerFromModal(designerId: number) {
  if (linkingDesigner.value) return
  linkingDesigner.value = true
  designerLinkError.value = ''
  designerLinkSuccess.value = ''
  try {
    await $fetch(`/api/projects/${slug.value}/designers`, {
      method: 'POST',
      body: { designerId },
    })
    await refreshLinkedDesigners()
    designerLinkSuccess.value = 'Дизайнер привязан к проекту'
    setTimeout(() => { designerLinkSuccess.value = '' }, 3000)
  } catch (e: any) {
    designerLinkError.value = e?.data?.message || 'Не удалось привязать дизайнера'
  } finally {
    linkingDesigner.value = false
  }
}

async function unlinkDesigner(designerId: number) {
  if (linkingDesigner.value) return
  linkingDesigner.value = true
  designerLinkError.value = ''
  designerLinkSuccess.value = ''
  try {
    await $fetch(`/api/projects/${slug.value}/designers`, {
      method: 'DELETE',
      body: { designerId },
    })
    await refreshLinkedDesigners()
    designerLinkSuccess.value = 'Дизайнер отвязан'
    setTimeout(() => { designerLinkSuccess.value = '' }, 2500)
  } catch (e: any) {
    designerLinkError.value = e?.data?.message || 'Не удалось отвязать дизайнера'
  } finally {
    linkingDesigner.value = false
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
  border-radius: 10px;
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
.proj-client-error { margin: 8px 0 0; color: var(--ds-error, #c00); font-size: .78rem; }
.proj-client-success { margin: 8px 0 0; color: var(--ds-success, #5caa7f); font-size: .78rem; }

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

/* Nav column ── */
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
  width: var(--ds-sidebar-width, 200px); flex-shrink: 0;
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
.proj-sidenav-item--current-phase {
  font-weight: 600;
}
.proj-sidenav-phase-dot {
  display: inline-block;
  width: 6px; height: 6px; border-radius: 50%;
  margin-right: 6px; flex-shrink: 0;
  vertical-align: middle; position: relative; top: -1px;
}

/* ── Visit / Payment / Follow-up sidebar widget ── */
.proj-visit-widget {
  margin: 12px 10px 6px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  padding-top: 10px;
}
.proj-visit-widget-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: .65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: var(--glass-text);
  opacity: .45;
  cursor: pointer;
  user-select: none;
  padding: 2px 0;
  transition: opacity .12s;
}
.proj-visit-widget-title:hover { opacity: .7; }
.proj-visit-widget-caret { font-size: .55rem; }
.proj-visit-widget-body { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
.proj-vw-group { display: flex; flex-direction: column; gap: 4px; }
.proj-vw-label {
  font-size: .62rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
  color: var(--glass-text); opacity: .4; margin-bottom: 2px;
}
.proj-vw-input {
  width: 100%; padding: 5px 8px;
  font-size: .72rem; font-family: inherit;
  background: color-mix(in srgb, var(--glass-bg) 60%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  border-radius: 6px; color: var(--glass-text);
  outline: none; box-sizing: border-box;
  transition: border-color .12s;
}
.proj-vw-input:focus { border-color: color-mix(in srgb, var(--glass-text) 30%, transparent); }
.proj-vw-row { display: flex; gap: 5px; }
.proj-vw-input--half { flex: 1; min-width: 0; }
.proj-vw-save {
  margin-top: 4px; padding: 5px 12px;
  font-size: .72rem; font-family: inherit; font-weight: 600;
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--glass-text) 16%, transparent);
  border-radius: 7px; cursor: pointer; color: var(--glass-text);
  transition: background .12s; align-self: flex-start;
}
.proj-vw-save:hover:not(:disabled) { background: color-mix(in srgb, var(--glass-text) 18%, transparent); }
.proj-vw-save:disabled { opacity: .4; cursor: default; }
.proj-vw-error { font-size: .67rem; color: #ef4444; margin: 2px 0 0; }
.proj-vw-ok { font-size: .67rem; color: #22c55e; margin: 2px 0 0; }
.proj-contact-req {
  margin-top: 10px; padding: 10px 12px; border-radius: 8px;
  background: color-mix(in srgb, #3b82f6 8%, transparent);
  border: 1px solid color-mix(in srgb, #3b82f6 20%, transparent);
}
.proj-contact-req--pending { border-color: color-mix(in srgb, #f59e0b 30%, transparent); background: color-mix(in srgb, #f59e0b 8%, transparent); }
.proj-contact-req-title { font-size: .72rem; font-weight: 700; color: #2563eb; margin-bottom: 3px; }
.proj-contact-req--pending .proj-contact-req-title { color: #d97706; }
.proj-contact-req-slot { font-size: .8rem; font-weight: 600; }
.proj-contact-req-msg { font-size: .75rem; opacity: .65; margin-top: 3px; font-style: italic; }
.proj-contact-req-meta { font-size: .62rem; opacity: .4; margin-top: 4px; }

/* ── Project header bar ── */
.proj-header-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 12px; flex-wrap: wrap;
}
.proj-breadcrumb { font-size: .78rem; color: #aaa; display: flex; align-items: center; gap: 4px; }
.proj-bc-link { color: #888; text-decoration: none; }
.proj-bc-link:hover { color: var(--glass-text); }
.proj-bc-back {
  font-weight: 500;
  font-size: .78rem;
  color: var(--glass-text);
  opacity: .6;
  transition: opacity .14s;
}
.proj-bc-back:hover { opacity: 1; color: var(--glass-text); }
.proj-bc-sep { margin: 0 2px; }
.proj-bc-title { color: var(--glass-text); opacity: .7; }
.proj-phase-sel-wrap { display: flex; align-items: center; gap: 6px; }
.proj-phase-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.proj-phase-sel { font-size: .75rem !important; padding: 0 8px !important; height: 28px !important; }
.proj-phase-saving { font-size: .7rem; color: #aaa; }

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
.ctr-chip  { font-size: .7rem; padding: 3px 8px; border: 1px solid var(--border, #e0e0e0); border-radius: 10px; }
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
  border-radius: 10px;
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
.modal-clients-list, .modal-contractors-list, .modal-designers-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.modal-client-item, .modal-contractor-item, .modal-designer-item {
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

.modal-client-item--linked, .modal-contractor-item--linked, .modal-designer-item--linked {
  background: color-mix(in srgb, var(--glass-bg) 94%, var(--glass-text) 6%);
  border-color: color-mix(in srgb, var(--glass-border) 80%, var(--glass-text) 20%);
}

.modal-client-info, .modal-contractor-info, .modal-designer-info {
  flex: 1;
  min-width: 0;
}

.modal-client-name, .modal-contractor-name, .modal-designer-name {
  font-size: .88rem;
  font-weight: 500;
  color: var(--glass-text, #1a1a1a);
  margin-bottom: 2px;
}

.modal-client-details, .modal-contractor-details, .modal-designer-details {
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
  background: var(--ds-success, #28a745);
  color: #fff;
}

.modal-action-btn--add:hover {
  background: #218838;
  transform: scale(1.05);
}

.modal-action-btn--remove {
  background: var(--ds-error, #dc3545);
  color: #fff;
}

.modal-action-btn--remove:hover {
  background: #c82333;
  transform: scale(1.05);
}

/* ══════════════════════════════════════════════════════════════
   MOBILE HORIZONTAL NAV BAR
   ══════════════════════════════════════════════════════════════ */

/* Hidden on desktop */
.proj-mobile-nav {
  display: none;
  position: relative;
  z-index: 30;
  margin-bottom: 10px;
}

/* Scrollable horizontal strip */
.proj-mobile-bar-scroll {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 6px 0 4px;
}
.proj-mobile-bar-scroll::-webkit-scrollbar { display: none; }

/* Each button — compact pill */
.proj-mobile-bar-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  color: var(--glass-text);
  font-family: var(--ds-font-family);
  font-size: .68rem;
  font-weight: 400;
  white-space: nowrap;
  cursor: pointer;
  opacity: .55;
  transition: opacity .12s, background .12s, border-color .12s;
}
.proj-mobile-bar-btn:hover {
  opacity: .85;
}
.proj-mobile-bar-btn--active {
  opacity: 1;
  font-weight: 600;
  background: color-mix(in srgb, var(--glass-bg) 95%, transparent);
  border-color: color-mix(in srgb, var(--glass-text) 30%, transparent);
}

.proj-mobile-bar-icon {
  font-size: .7rem;
}

/* Client preview header row */
.proj-mobile-bar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 2px;
}
.proj-mobile-bar-label {
  font-size: .66rem;
  color: var(--glass-text);
  opacity: .5;
}

/* ══════════════════════════════════════════════════════════════
   MOBILE RESPONSIVE OVERRIDES
   ══════════════════════════════════════════════════════════════ */

/* ── Tablet ── */
@media (max-width: 1024px) {
  .proj-sidenav {
    width: 160px;
  }
  .proj-nav-col {
    margin-right: 12px;
  }
}

/* ── Mobile ── */
@media (max-width: 768px) {
  /* Show mobile nav */
  .proj-mobile-nav { display: block; }

  /* Hide desktop left sidebar */
  .proj-nav-col { display: none !important; }

  /* Stack content vertically */
  .proj-content-area {
    flex-direction: column;
    gap: 0;
  }

  .proj-main {
    width: 100%;
    min-width: 0;
  }

  /* Client/contractor cards — full width, tighter padding */
  .proj-client-card {
    margin-left: 0;
    margin-right: 0;
    padding: 12px;
  }
  .proj-client-title {
    font-size: .72rem;
  }
  .proj-client-select {
    font-size: .76rem;
    padding: 6px 8px;
  }
  .proj-client-btn {
    font-size: .72rem;
    padding: 6px 10px;
  }
  .proj-client-row {
    flex-direction: column;
    gap: 8px;
  }
  .proj-client-linked {
    flex-wrap: wrap;
  }
  .proj-client-linked-chip {
    font-size: .66rem;
    padding: 2px 6px;
  }

  /* Modals — full width */
  .a-modal {
    width: 100%;
    max-width: calc(100vw - 20px);
    max-height: 85vh;
    padding: 18px 14px;
    overflow-y: auto;
  }
  .a-modal h3 {
    font-size: .78rem;
  }

  /* Modal lists — card-like */
  .modal-client-item, .modal-contractor-item, .modal-designer-item {
    padding: 10px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .modal-client-name, .modal-contractor-name, .modal-designer-name {
    font-size: .82rem;
  }

  /* Breadcrumb */
  .proj-content-area + * {
    font-size: .72rem;
  }
}

/* ── Small phones ── */
@media (max-width: 400px) {
  .proj-mobile-nav-toggle {
    padding: 8px 10px;
    font-size: .76rem;
  }
  .proj-mobile-nav-item {
    padding: 9px 10px;
    font-size: .78rem;
  }
  .proj-client-card {
    padding: 10px;
  }
}

</style>
