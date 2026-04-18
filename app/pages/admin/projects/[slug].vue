<template>
  <div>
    <div v-if="projectPending" class="ent-page-skeleton proj-page-skeleton" style="padding:20px">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 8" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    </div>
    <div v-else-if="!project" class="proj-project-state">
      <p class="proj-project-state__title">{{ projectLoadError ? 'Не удалось загрузить проект' : 'Проект не найден' }}</p>
      <p class="proj-project-state__text">{{ projectLoadError ? 'Проверьте соединение или попробуйте повторить загрузку.' : 'Проверьте адрес проекта или вернитесь к списку.' }}</p>
      <div class="proj-project-state__actions">
        <GlassButton variant="secondary" density="compact" type="button"  @click="refresh">Повторить</GlassButton>
        <NuxtLink to="/admin" class="a-btn-sm proj-project-state__link">К проектам</NuxtLink>
      </div>
    </div>
    <template v-else>
      <div v-if="!showBrutalistHero" style="font-size:.78rem;color:#aaa;margin-bottom:12px">
        <NuxtLink to="/admin" style="color:#888;text-decoration:none">проекты</NuxtLink>
        <span style="margin:0 6px">/</span>
        <span>{{ project.title }}</span>
      </div>
      <div v-if="projectFlashMessages.length && !showBrutalistHero" class="proj-notice-stack">
        <p
          v-for="message in projectFlashMessages"
          :key="message.key"
          :class="message.tone === 'error' ? 'proj-client-error' : 'proj-client-success'"
          style="margin-bottom:6px"
        >{{ message.text }}</p>
      </div>

      <!-- ═══ Mobile top horizontal nav bar ═══ -->
      <div v-if="showLegacyMobileNav" class="proj-mobile-nav">
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
              :class="{ 'proj-mobile-bar-btn--active': currentProjectPage === 'overview' }"
              @click="selectAdminPage('overview')"
            >◈ обзор</button>
            <template v-for="group in navGroups" :key="'mob-' + group.label">
              <button
                v-for="pg in group.pages" :key="pg.slug"
                class="proj-mobile-bar-btn"
                :class="{ 'proj-mobile-bar-btn--active': currentProjectPage === pg.slug }"
                :title="pg.title"
                @click="selectAdminPage(pg.slug)"
              ><span v-if="pg.icon" class="proj-mobile-bar-icon">{{ pg.icon }}</span>{{ pg.title.replace(/^\d+\.\d+\s*/, '') }}</button>
            </template>
          </div>
        </template>
      </div>

      <!-- proj-content-area (padding-left для sidebar) нужен ТОЛЬКО в preview-режимах,
           в admin-режиме отступ уже есть от admin-with-nav в layout -->
      <div :class="(clientPreviewMode || contractorPreviewMode) ? 'proj-content-area' : ''">

        <!-- Nav column + sidebar — показываем ТОЛЬКО в режиме превью клиента/подрядчика.
             В admin-режиме навигацией управляет глобальный AdminNestedNav в layout. -->
        <div v-if="clientPreviewMode || contractorPreviewMode" class="proj-nav-col">

        <!-- Left sidebar: vertical nav -->
        <nav class="proj-sidenav std-sidenav">

          <!-- ── CLIENT PREVIEW MODE ── -->
          <template v-if="clientPreviewMode">
            <!-- fixed header -->
            <div class="proj-nav-header">
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
                <span class="proj-client-linked-name">{{ linkedClients.map((c: any) => c.name).join(', ') }}</span>
              </div>
            </div>
            <!-- scrollable list -->
            <div class="proj-nav-body">
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
            </div>
          </template>

          <!-- ── ADMIN NAV ── -->
          <template v-else-if="!contractorPreviewMode">
            <!-- fixed header: search + overview -->
            <div class="proj-nav-header">
              <div class="proj-nav-search">
                <input
                  v-model="navSearch"
                  class="proj-nav-search-input"
                  type="search"
                  placeholder="поиск..."
                  autocomplete="off"
                />
              </div>
              <button
                v-if="overviewMatchesSearch"
                class="proj-sidenav-item std-nav-item proj-sidenav-item--overview"
                :class="{ 'proj-sidenav-item--active': currentProjectPage === 'overview', 'std-nav-item--active': currentProjectPage === 'overview' }"
                @click="selectAdminPage('overview')"
              ><span class="proj-sidenav-icon">◈</span> обзор</button>
            </div>
            <!-- scrollable groups -->
            <div class="proj-nav-body">
              <template v-for="group in filteredNavGroups" :key="group.label">
                <div class="proj-sidenav-group" v-if="group.pages.length">
                  <div class="proj-sidenav-group-label std-nav-group-label"
                    :class="{ 'proj-sidenav-group-label--active': group.isActiveGroup }"
                  >{{ group.label }}</div>
                  <button
                    v-for="pg in group.pages"
                    :key="pg.slug"
                    class="proj-sidenav-item std-nav-item"
                    :class="{ 'proj-sidenav-item--active': currentProjectPage === pg.slug, 'std-nav-item--active': currentProjectPage === pg.slug }"
                    @click="selectAdminPage(pg.slug)"
                  >{{ pg.title }}</button>
                </div>
              </template>
            </div>
          </template>

        </nav>
        </div><!-- /.proj-nav-col -->

        <!-- Right content -->
        <div
          ref="projectViewport"
          class="proj-main"
          :class="{ 'proj-main--brutalist': isBrutalistProjectMode, 'proj-main--paged': isProjectViewportPaged }"
          :tabindex="isProjectViewportPaged ? 0 : undefined"
          @wheel="handleProjectViewportWheel"
          @keydown="handleProjectViewportKeydown"
          @scroll="() => updateProjectViewportPageIndex()"
          @touchstart.passive="handleProjectViewportTouchStart"
          @touchend.passive="handleProjectViewportTouchEnd"
        >
          <div v-if="projectViewportMode === 'wipe' || shouldUseProjectWipeCards" class="proj-sheet-frame" aria-hidden="true">
            <div class="proj-sheet-frame__card"></div>
          </div>
          <div v-if="projectViewportMode === 'wipe'" class="proj-wipe-overlay" aria-hidden="true">
            <div class="proj-wipe-overlay__sheet"></div>
          </div>
          <div v-show="!shouldUseProjectWipeCards" class="proj-wipe-inner">
          <AdminEntityHero
            v-if="showBrutalistHero"
            :kicker="activeGroupLabel || 'архитектура проекта'"
            :title="activeHeroTitle"
            :facts="brutalistHeroFacts"
            :full-height="true"
            frame="divided"
            :meta-columns="3"
            :prompt="projectHeroPrompt"
          >
            <template #notices>
              <template v-if="projectFlashMessages.length">
                <p
                  v-for="message in projectFlashMessages"
                  :key="message.key"
                  class="admin-entity-hero__notice"
                  :class="message.tone === 'error' ? 'admin-entity-hero__notice--error' : 'admin-entity-hero__notice--success'"
                >{{ message.text }}</p>
              </template>
            </template>
          </AdminEntityHero>

          <Transition :name="projectContentTransitionName" :css="projectContentTransitionCss" :mode="projectContentTransitionMode" :duration="projectContentTransitionDuration">
            <div :key="contentKey" class="proj-main-inner" :class="{ 'proj-main-inner--after-hero': showBrutalistHero }">
              <!-- contractor preview -->
              <template v-if="contractorPreviewMode">
                <div v-if="contractorPending" class="ent-content-loading proj-contractor-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
                <template v-else-if="contractorData">
                  <AdminContractorCabinetWidget :contractor-id="contractorPreviewId" />
                </template>
                <div v-else class="proj-project-state proj-project-state--inline">
                  <p class="proj-project-state__title">{{ contractorPreviewStateTitle }}</p>
                  <p class="proj-project-state__text">{{ contractorPreviewStateText }}</p>
                  <div class="proj-project-state__actions">
                    <NuxtLink :to="`/admin/projects/${slug}`" class="a-btn-sm proj-project-state__link">К проекту</NuxtLink>
                  </div>
                </div>
              </template>
              <!-- client preview -->
              <component
                v-else-if="clientPreviewMode"
                :is="clientActiveComponent"
                v-bind="clientActiveComponentProps"
              />
              <!-- admin view -->
              <template v-else-if="currentProjectPage === 'overview'">
                <section class="proj-section-shell" :class="{ 'proj-section-shell--brutalist': isBrutalistProjectMode }">
                  <AdminProjectOverview
                    :slug="slug"
                    :project="project"
                    :clients="linkedClients"
                    :contractors="linkedContractorsList"
                    :designers="linkedDesignersList"
                    @navigate="selectAdminPage"
                  />
                </section>
              </template>
              <template v-else-if="currentProjectPage === 'project_control'">
                <section class="proj-section-shell" :class="{ 'proj-section-shell--brutalist': isBrutalistProjectMode }">
                  <AdminProjectControlWidget :slug="slug" />
                </section>
              </template>
              <!-- Клиенты проекта — inline без модала -->
              <template v-else-if="currentProjectPage === 'project_clients'">
                <ProjectEntityPanel
                  title="Клиенты проекта"
                  linked-label="Закреплённые"
                  available-label="Добавить из CRM"
                  available-empty-text="Нет доступных клиентов"
                  :linked-items="linkedClients"
                  :available-items="availableClientsForModal"
                  :format-meta="(c: any) => c.phone || c.email || ''"
                  :is-brutalist="isBrutalistProjectMode"
                  :error-text="clientLinkError"
                  :success-text="clientLinkSuccess"
                  @link="(id: any) => linkClientFromModal(String(id))"
                  @unlink="(id: any) => unlinkClientFromModal(String(id))"
                />
              </template>
              <template v-else-if="currentProjectPage === 'project_contractors'">
                <ProjectEntityPanel
                  title="Подрядчики проекта"
                  linked-label="Закреплённые"
                  available-label="Добавить из CRM"
                  available-empty-text="Нет доступных подрядчиков"
                  :linked-items="linkedContractorsList"
                  :available-items="availableContractorsForModal"
                  :format-meta="(c: any) => c.companyName || c.phone || c.email || 'без контакта'"
                  :is-brutalist="isBrutalistProjectMode"
                  :error-text="contractorLinkError"
                  :success-text="contractorLinkSuccess"
                  @link="(id: any) => linkContractorFromModal(id)"
                  @unlink="(id: any) => unlinkContractor(id)"
                />
              </template>
              <template v-else-if="currentProjectPage === 'project_designers'">
                <ProjectEntityPanel
                  title="Дизайнеры проекта"
                  linked-label="Закреплённые"
                  available-label="Добавить из CRM"
                  available-empty-text="Нет доступных дизайнеров"
                  :linked-items="linkedDesignersList"
                  :available-items="availableDesignersForModal"
                  :format-meta="(d: any) => d.companyName || d.phone || d.email || 'без контакта'"
                  :is-brutalist="isBrutalistProjectMode"
                  :error-text="designerLinkError"
                  :success-text="designerLinkSuccess"
                  @link="(id: any) => linkDesignerFromModal(id)"
                  @unlink="(id: any) => unlinkDesigner(id)"
                />
              </template>
              <template v-else-if="currentProjectPage === 'project_sellers'">
                <ProjectEntityPanel
                  title="Поставщики проекта"
                  linked-label="Закреплённые"
                  available-label="Добавить из CRM"
                  available-empty-text="Нет доступных поставщиков"
                  :linked-items="linkedSellersList"
                  :available-items="availableSellersForProject"
                  :format-meta="(s: any) => s.companyName || s.city || s.contactPerson || 'без контакта'"
                  :is-brutalist="isBrutalistProjectMode"
                  :error-text="sellerLinkError"
                  :success-text="sellerLinkSuccess"
                  @link="(id: any) => linkSeller(id)"
                  @unlink="(id: any) => unlinkSeller(id)"
                />
              </template>
              <template v-else-if="currentProjectPage === 'project_managers'">
                <ProjectEntityPanel
                  title="Менеджеры проекта"
                  linked-label="Назначенные"
                  available-label="Доступные в системе"
                  available-empty-text="Нет дополнительных менеджеров"
                  empty-text="Менеджеры пока не привязаны к проекту"
                  :linked-items="linkedManagersList"
                  :available-items="availableManagersForProject"
                  :format-meta="(m: any) => m.role || m.phone || m.email || 'менеджер'"
                  :is-brutalist="isBrutalistProjectMode"
                  :can-link="false"
                  :can-unlink="false"
                />
              </template>
              <template v-else-if="currentProjectPage === 'project_communications'">
                <section class="proj-section-shell" :class="{ 'proj-section-shell--brutalist': isBrutalistProjectMode }">
                  <ProjectCommunicationsPanel :project-slug="slug" />
                </section>
              </template>
              <section v-else class="proj-section-shell" :class="{ 'proj-section-shell--brutalist': isBrutalistProjectMode }">
                <component
                  :is="activeComponent"
                  v-bind="activeComponentProps"
                />
              </section>
            </div>
          </Transition>
          </div><!-- /proj-wipe-inner -->

          <!-- Wipe 2: shows cards instead of raw form content.
               proj-wipe-inner is hidden (v-show) when active so the overlay
               doesn't cover interactive elements.
               fixed-mode is used in preview modes (contractor/client) where
               proj-main has no position:relative (isProjectViewportPaged=false) -->
          <Wipe2Renderer
            v-if="shouldUseProjectWipeCards"
            :entity="wipe2EntityData"
            :fixed-mode="contractorPreviewMode || clientPreviewMode"
            :allow-boundary-navigation="true"
            @edit="designSystem.set('contentViewMode', 'scroll')"
            @navigate-boundary="handleProjectWipe2Boundary"
          />

          <div v-if="isProjectViewportPaged && !shouldUseProjectWipeCards" class="proj-pager-rail">
            <div class="proj-pager-rail__meta">
              <span class="proj-pager-rail__mode">{{ projectPagerModeLabel }}</span>
              <span>экран {{ viewportPageIndex }} / {{ viewportPageCount }}</span>
            </div>
            <div class="proj-pager-rail__actions">
              <GlassButton variant="secondary" density="compact" type="button"  @click="moveProjectViewport('prev')">← экран</GlassButton>
              <GlassButton variant="secondary" density="compact" type="button"  @click="moveProjectViewport('next')">{{ projectPagerNextLabel }}</GlassButton>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-if="showEdit" class="a-modal-backdrop" :class="{ 'a-modal-backdrop--brutalist': isBrutalistProjectMode }" @click.self="showEdit = false">
      <div class="a-modal" :class="{ 'a-modal--brutalist': isBrutalistProjectMode }">
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:20px">редактировать проект</h3>
        <form @submit.prevent="saveProject">
          <div class="a-field">
            <label>Название</label>
            <GlassInput v-model="editForm.title"  required />
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
            <GlassButton variant="secondary" density="compact" type="button"  @click="showEdit = false">отмена</GlassButton>
            <GlassButton variant="primary" type="submit"  :disabled="saving">{{ saving ? '...' : 'сохранить' }}</GlassButton>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import {
  PROJECT_PAGE_TO_NAV_TARGET,
  PROJECT_REGISTRY_NODE_PREFIX_TO_PAGE,
  PROJECT_REGISTRY_PAGE_META,
  PROJECT_SECTION_TO_PAGE,
} from '~~/shared/constants/admin-navigation'
import { getAdminPages, getAdminNavGroups, getClientPages } from '~~/shared/constants/pages'
import { applyViewportZoneLayout, buildViewportPageStops, resolveViewportPagerRailInset, resolveViewportSheetInsets } from '~/utils/contentViewportPager'
import { createWipe2Slot, buildWipe2Cards, useWipe2State } from '~/entities/design-system/model/useWipe2'
import type { Wipe2EntityData } from '~/shared/types/wipe2'
import { buildProjectWipe2Data } from '~/utils/buildProjectWipe2Data'
import type { Component } from 'vue'
import {
  AdminPageContent,
  AdminMaterials,
  AdminProjectOverview,
  AdminProjectSettings,
} from '#components'
import ClientProjectCabinetWidget from '~/widgets/cabinets/client/ClientProjectCabinetWidget.vue'
import AdminProjectPhasesWidget from '~/widgets/projects/phases/AdminProjectPhasesWidget.vue'
import AdminWorkStatusWidget from '~/widgets/projects/board/AdminWorkStatusWidget.vue'
import AdminContractorCabinetWidget from '~/widgets/cabinets/contractor/AdminContractorCabinetWidget.vue'
import AdminProjectControlWidget from '~/widgets/projects/control/AdminProjectControlWidget.vue'

definePageMeta({ layout: 'admin', middleware: ['admin', 'admin-project-canonical'] })

const router = useRouter()
const route = useRoute()
const adminNav = useAdminNav()
const slug = computed(() => {
  const routeSlug = Array.isArray(route.params.slug) ? route.params.slug[0] : route.params.slug
  if (typeof routeSlug === 'string' && routeSlug.trim()) {
    return routeSlug.trim()
  }

  const queryProjectSlug = Array.isArray(route.query.projectSlug)
    ? route.query.projectSlug[0]
    : route.query.projectSlug

  if (typeof queryProjectSlug === 'string' && queryProjectSlug.trim()) {
    return queryProjectSlug.trim()
  }

  const navProjectSlug = adminNav.contentSpec.value.projectSlug
  if (typeof navProjectSlug === 'string' && navProjectSlug.trim()) {
    return navProjectSlug.trim()
  }

  return ''
})
const designSystem = useDesignSystem()
const blueprintRuntime = useAppBlueprintRuntime()
createWipe2Slot()
const isBrutalistProjectMode = computed(() => designSystem.currentDesignMode.value === 'brutalist')
const showLegacyMobileNav = computed(() => !contractorPreviewMode.value && !isBrutalistProjectMode.value)
const showBrutalistHero = computed(() => false)
const projectContentTransitionEffect = computed(() => {
  const effect = designSystem.tokens.value.archPageEnter ?? 'fade'
  if (effect === 'slide') return 'slide-r'
  return effect
})
const projectContentTransitionDuration = computed(() => Math.min(10000, Math.max(0, designSystem.tokens.value.pageTransitDuration ?? 280)))
const contentViewMode = computed(() => {
  if (!designSystem.isHydrated.value) return 'scroll'
  return designSystem.tokens.value.contentViewMode ?? 'scroll'
})
const isProjectViewportPaged = computed(() => !clientPreviewMode.value && !contractorPreviewMode.value && contentViewMode.value !== 'scroll')

// ── Wipe 2: строим данные карточек из project.value (без зависимости от lifecycle) ───────
// Данные для разделов с отдельными API (extra_services, work_status)
// Заполняются через watch после объявления currentProjectPage
const _wipe2ExtraServicesData = ref<any[]>([])
const _wipe2WorkStatusData = ref<any[]>([])
// Глобальный стейт — резервный источник (заполняется компонентами через registerWipe2Data)
const _globalWipe2State = useWipe2State()

const wipe2EntityData = computed<Wipe2EntityData | null>(() =>
  buildProjectWipe2Data(
    project.value,
    currentProjectPage.value,
    _wipe2ExtraServicesData.value,
    _wipe2WorkStatusData.value,
    _globalWipe2State.value,
    linkedClients.value,
    linkedContractorsList.value,
    linkedDesignersList.value,
  )
)

const projectHeroPrompt = computed(() => {
  if (!isProjectViewportPaged.value) return '↓ прокрутка / swipe ↓'
  if (projectViewportMode.value === 'wipe')  return '↓ лист / PgDn ↓'
  if (projectViewportMode.value === 'wipe2') return '← карточки →'
  return '↓ экран / PgDn ↓'
})
const projectPagerModeLabel = computed(() => {
  if (projectViewportMode.value === 'flow')  return 'поток'
  if (projectViewportMode.value === 'wipe')  return 'листы'
  if (projectViewportMode.value === 'wipe2') return 'cards'
  return 'экраны'
})
const projectPagerNextLabel = computed(() => {
  if (projectViewportMode.value === 'flow') return 'экран / след.'
  if (projectViewportMode.value === 'wipe') {
    const atLast = viewportPageIndex.value >= viewportPageCount.value
    if (!atLast) return 'лист →'
    // Check if there's a next page in any direction
    const leafIdx = currentProjectLeafIndex.value
    const leaves = currentProjectLeafItems.value
    const hasNextLeaf = leafIdx >= 0 && leafIdx < leaves.length - 1
    if (hasNextLeaf) return 'след. →'
    // Global fallback: check available pages order
    const slugs = ['overview', ...availablePages.value.map(p => p.slug)]
    const idx = slugs.indexOf(normalizedActivePage.value)
    if (idx >= 0 && idx < slugs.length - 1) return 'след. →'
    return 'лист →'
  }
  return 'экран →'
})
const projectContentTransitionCss = computed(() =>
  !clientPreviewMode.value && !contractorPreviewMode.value && projectContentTransitionEffect.value !== 'none'
)
const projectContentTransitionMode = computed<'out-in' | undefined>(() =>
  clientPreviewMode.value || contractorPreviewMode.value ? undefined : 'out-in'
)
const projectContentTransitionName = computed(() =>
  projectContentTransitionEffect.value === 'none' ? 'tab-fade' : `pt-${projectContentTransitionEffect.value}`
)
const projectViewport = ref<HTMLElement | null>(null)
const viewportPageIndex = ref(1)
const viewportPageCount = ref(1)
const projectViewportStops = ref<number[]>([0])
const viewportPagingLockUntil = ref(0)
const viewportNavigationBusy = ref(false)
const projectViewportWipePhase = ref<'idle' | 'cover' | 'reveal'>('idle')
const projectViewportWipeDirection = ref<'next' | 'prev'>('next')
let projectViewportWipeTimers: number[] = []
let projectNavHydrated = false
let projectNavStabilizeUntil = 0

function isViewportEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.matches('input, textarea, select, [contenteditable="true"]')
}

// При keepalive-активации — синхронизировать навигацию с текущим проектом
function syncNavToProject() {
  const title = project.value?.title || slug.value
  adminNav.ensureProject(slug.value, title)
  projectNavHydrated = true
}
onMounted(() => {
  projectNavStabilizeUntil = Date.now() + 2200
  syncNavToProject()
  window.addEventListener('keydown', handleWindowProjectViewportKeydown)
})
onActivated(() => {
  syncNavToProject()
  void refresh()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowProjectViewportKeydown)
})

const MODERN_PROJECT_PAGES = [
  'first_contact',
  'self_profile',
  'site_survey',
  'tor_contract',
  'project_control',
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

const projectAsyncKey = computed(() => `admin-project-page:${slug.value || 'empty'}`)

const {
  data: project,
  pending: projectPending,
  error: projectLoadError,
  refresh: refreshProject,
} = await useAsyncData<any | null>(
  projectAsyncKey,
  async () => {
    const currentSlug = slug.value.trim()

    if (!currentSlug) {
      return null
    }

    return await ($fetch as any)(`/api/projects/${currentSlug}`, {
      headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    })
  },
  {
    default: () => null,
    watch: [slug],
  },
)

async function refresh() {
  return await refreshProject()
}

watch(slug, () => {
  syncNavToProject()
}, { immediate: true })

watch(
  () => adminNav.contentSpec.value.projectSlug,
  async (navProjectSlug) => {
    if (!navProjectSlug) {
      return
    }

    const routeSlug = Array.isArray(route.params.slug) ? route.params.slug[0] : route.params.slug
    if (routeSlug === navProjectSlug) {
      return
    }

    if (!route.path.startsWith('/admin/projects/')) {
      return
    }

    await router.replace({
      path: `/admin/projects/${navProjectSlug}`,
      query: route.query,
      hash: route.hash,
    })
  },
)

const PROJECT_CONTROL_ROUTE_QUERY_KEYS = ['controlTab', 'controlSprint', 'controlTask'] as const

function hasNonEmptyRouteQueryValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(item => hasNonEmptyRouteQueryValue(item))
  }

  return typeof value === 'string' && value.trim().length > 0
}

const hasProjectControlRouteState = computed(() =>
  PROJECT_CONTROL_ROUTE_QUERY_KEYS.some(key => hasNonEmptyRouteQueryValue(route.query[key])),
)

async function clearProjectControlRouteState() {
  if (!hasProjectControlRouteState.value) {
    return
  }

  const nextQuery = { ...route.query } as Record<string, string | string[] | undefined>
  PROJECT_CONTROL_ROUTE_QUERY_KEYS.forEach((key) => {
    delete nextQuery[key]
  })

  await router.replace({ query: nextQuery })
}

const activePage = ref(hasProjectControlRouteState.value ? 'project_control' : 'overview')
const showEdit = ref(false)
const saving = ref(false)
const editError = ref('')
const projectStatus = ref(project.value?.status || 'lead')

const editForm = reactive({
  title: project.value?.title || '',
  pages: [...(project.value?.pages || [])],
})

const pageComponentMap: Record<string, Component> = {
  project_control: AdminProjectControlWidget,
  settings: AdminProjectSettings,
  work_status: AdminWorkStatusWidget,
  profile_customer: AdminProjectPhasesWidget,
  first_contact: AdminProjectPhasesWidget,
  self_profile: AdminProjectPhasesWidget,
  brief: AdminProjectPhasesWidget,
  site_survey: AdminProjectPhasesWidget,
  tor_contract: AdminProjectPhasesWidget,
  extra_services: AdminProjectPhasesWidget,
  space_planning: AdminProjectPhasesWidget,
  moodboard: AdminProjectPhasesWidget,
  concept_approval: AdminProjectPhasesWidget,
  working_drawings: AdminProjectPhasesWidget,
  specifications: AdminProjectPhasesWidget,
  mep_integration: AdminProjectPhasesWidget,
  design_album_final: AdminProjectPhasesWidget,
  procurement_list: AdminProjectPhasesWidget,
  suppliers: AdminProjectPhasesWidget,
  procurement_status: AdminProjectPhasesWidget,
  construction_plan: AdminProjectPhasesWidget,
  work_log: AdminProjectPhasesWidget,
  site_photos: AdminProjectPhasesWidget,
  punch_list: AdminProjectPhasesWidget,
  commissioning_act: AdminProjectPhasesWidget,
  client_sign_off: AdminProjectPhasesWidget,
}
// ── Contractor preview mode ─────────────────────────────────────────
const contractorPreviewMode = computed(() => route.query.view === 'contractor')
const contractorPreviewId = computed<number | null>(() => {
  const rawId = Array.isArray(route.query.cid) ? route.query.cid[0] : route.query.cid
  const parsedId = Number(rawId)

  return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null
})
const hasContractorPreviewTarget = computed(() => contractorPreviewMode.value && contractorPreviewId.value !== null)
const contractorPreviewAsyncKey = computed(() =>
  `admin-project-contractor-preview:${slug.value || 'empty'}:${contractorPreviewId.value ?? 'none'}`,
)

const {
  data: contractorPreviewResponse,
  pending: contractorPending,
  error: contractorPreviewError,
} = useAsyncData<any | null>(
  contractorPreviewAsyncKey,
  async () => {
    if (!hasContractorPreviewTarget.value || contractorPreviewId.value === null) {
      return null
    }

    const contractor = await $fetch(`/api/admin/contractors/${contractorPreviewId.value}/preview`, {
      headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    })

    return contractor ?? null
  },
  {
    default: () => null,
    watch: [hasContractorPreviewTarget, contractorPreviewId],
  },
)
const contractorData = computed(() => contractorPreviewResponse.value ?? null)
const contractorPreviewStateTitle = computed(() => {
  if (!hasContractorPreviewTarget.value) {
    return 'Подрядчик не выбран'
  }

  if (contractorPreviewError.value) {
    return 'Не удалось загрузить подрядчика'
  }

  if (!contractorPending.value && !contractorData.value) {
    return 'Подрядчик не найден'
  }

  return 'Подрядчик недоступен'
})
const contractorPreviewStateText = computed(() => {
  if (!hasContractorPreviewTarget.value) {
    return 'Укажите корректный идентификатор подрядчика или вернитесь к проекту.'
  }

  if (contractorPreviewError.value) {
    return 'Проверьте соединение или попробуйте открыть карточку подрядчика позже.'
  }

  if (!contractorPending.value && !contractorData.value) {
    return 'Запрошенный подрядчик отсутствует в системе или был удалён.'
  }

  return 'Карточка подрядчика сейчас недоступна.'
})

// ── Client preview mode ────────────────────────────────────────
const clientPreviewMode = computed(() => route.query.view === 'client')
const clientActivePage  = ref('')

// ── Content key: drives fade transition + scroll-reset on page switch ───────
const contentKey = computed(() => {
  if (contractorPreviewMode.value) return `ctr-${contractorPreviewId.value ?? 'none'}`
  if (clientPreviewMode.value)     return `cli-${clientActivePage.value}`
  return `adm-${currentProjectPage.value}`
})

const defaultPhasePage = computed(() => {
  const pages = project.value?.pages || []
  const firstVisiblePhasePage = getAdminNavGroups()
    .flatMap(group => group.pages)
    .find((page) => {
      if (!blueprintRuntime.isProjectPageAllowed(page.slug)) {
        return false
      }
      if (page.slug === 'self_profile' && pages.includes('brief')) {
        return true
      }
      return pages.includes(page.slug)
    })

  return firstVisiblePhasePage?.slug || 'overview'
})

watch([
  () => blueprintRuntime.activeBlueprintId.value,
  defaultPhasePage,
], async () => {
  if (blueprintRuntime.isProjectPageAllowed(activePage.value)) {
    return
  }

  await selectAdminPage(defaultPhasePage.value)
}, { immediate: true })

async function selectAdminPage(pageSlug: string) {
  if (!blueprintRuntime.isProjectPageAllowed(pageSlug)) {
    activePage.value = defaultPhasePage.value
    if (defaultPhasePage.value !== 'project_control') {
      await clearProjectControlRouteState()
    }
    scrollMobileBarToActive()
    return
  }

  activePage.value = pageSlug
  const normalizedPage = pageSlug === 'self_profile' ? 'brief' : pageSlug
  const target = PROJECT_PAGE_TO_NAV_TARGET[normalizedPage] || {}
  const title = project.value?.title || slug.value
  if (target.branchId || target.leafId) {
    await adminNav.setProjectView(slug.value, title, target)
  } else {
    adminNav.ensureProject(slug.value, title)
  }
  if (pageSlug !== 'project_control') {
    await clearProjectControlRouteState()
  }
  scrollMobileBarToActive()
}

function selectClientPage(slug: string) {
  clientActivePage.value = slug
  scrollMobileBarToActive()
}

/** Auto-scroll the mobile horizontal nav so the active button is visible */
function scrollMobileBarToActive() {
  if (import.meta.server || typeof document === 'undefined') {
    return
  }

  nextTick(() => {
    const active = document.querySelector('.proj-mobile-bar-btn--active') as HTMLElement | null
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  })
}

const clientPageComponentMap: Record<string, Component> = {
  phase_init:            ClientProjectCabinetWidget,
  self_profile:          ClientProjectCabinetWidget,
  brief:                 ClientProjectCabinetWidget,
  client_contacts:       ClientProjectCabinetWidget,
  client_passport:       ClientProjectCabinetWidget,
  client_brief:          ClientProjectCabinetWidget,
  client_tz:             ClientProjectCabinetWidget,
  contracts:             ClientProjectCabinetWidget,
  extra_services:        ClientProjectCabinetWidget,
  work_progress:         ClientProjectCabinetWidget,
  design_timeline:       ClientProjectCabinetWidget,
  design_album:          ClientProjectCabinetWidget,
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
  clientPageComponentMap[clientNormalizedPage.value] || ClientProjectCabinetWidget,
)

const clientActiveComponentProps = computed(() => {
  return { slug: slug.value, page: clientNormalizedPage.value }
})

// ── Admin page state ───────────────────────────────────────────
const normalizedActivePage = computed(() =>
  currentProjectPage.value === 'brief' ? 'self_profile' : currentProjectPage.value,
)

const activeComponent = computed<Component>(() => pageComponentMap[normalizedActivePage.value] || AdminPageContent)

const activeComponentProps = computed(() => {
  const base = { slug: slug.value }
  if (activeComponent.value === AdminPageContent) {
    return { ...base, page: normalizedActivePage.value }
  }
  if (activeComponent.value === AdminProjectPhasesWidget) {
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
  }
})

const allPageSlugs = getAdminPages()

const availablePages = computed(() => {
  const pages = project.value?.pages || []
  return allPageSlugs.filter((p) => {
    if (p.slug === 'project_control') return true
    if (p.slug === 'self_profile' && pages.includes('brief')) return true
    return pages.includes(p.slug)
  })
})

const resolvedProjectPageFromNav = computed(() => {
  const spec = adminNav.contentSpec.value
  const node = adminNav.currentNode.value

  if (spec.projectSlug && spec.projectSlug !== slug.value) {
    return null
  }

  if (spec.projectSection) {
    return PROJECT_SECTION_TO_PAGE[spec.projectSection] || null
  }

  for (const [prefix, page] of Object.entries(PROJECT_REGISTRY_NODE_PREFIX_TO_PAGE)) {
    if (node.nodeId.startsWith(prefix)) {
      return page
    }
  }

  if (node.nodeId.startsWith('reg_phases_')) {
    return defaultPhasePage.value
  }

  if (node.nodeType === 'project_root') {
    if (hasProjectControlRouteState.value) {
      return null
    }

    return 'overview'
  }

  return null
})

const shouldUseProjectWipeCards = computed(() =>
  contentViewMode.value === 'wipe2'
  && Boolean(wipe2EntityData.value)
  && (clientPreviewMode.value || contractorPreviewMode.value),
)

const projectViewportMode = computed(() => {
  if (contentViewMode.value === 'wipe2' && !shouldUseProjectWipeCards.value) {
    return 'wipe'
  }
  return contentViewMode.value
})

const currentProjectPage = computed(() => resolvedProjectPageFromNav.value || activePage.value)

watch(
  [hasProjectControlRouteState, clientPreviewMode, contractorPreviewMode],
  async ([hasControlRouteState, isClientPreview, isContractorPreview]) => {
    if (import.meta.server) {
      return
    }

    if (!hasControlRouteState || isClientPreview || isContractorPreview) {
      return
    }

    if (currentProjectPage.value === 'project_control' && adminNav.contentSpec.value.projectSection === 'project_control') {
      return
    }

    await selectAdminPage('project_control')
  },
  { immediate: true },
)

watch(currentProjectPage, async (pageSlug, previousPageSlug) => {
  if (import.meta.server) {
    return
  }

  if (!hasProjectControlRouteState.value) {
    return
  }

  if (pageSlug === 'project_control') {
    return
  }

  if (!previousPageSlug || previousPageSlug === pageSlug) {
    return
  }

  await clearProjectControlRouteState()
})

// ── Wipe 2: ленивые fetch для разделов с отдельным API ─────────────────────
const wipe2ExtraServicesAsyncKey = computed(() => `project-wipe2-extra-services:${slug.value || 'empty'}`)
const { data: _w2ExtraSvcs } = useAsyncData<any[]>(
  wipe2ExtraServicesAsyncKey,
  () => contentViewMode.value === 'wipe2' && currentProjectPage.value === 'extra_services'
    ? $fetch<any[]>(`/api/projects/${slug.value}/extra-services`)
    : Promise.resolve([]),
  {
    server: false,
    default: () => [],
    watch: [contentViewMode, currentProjectPage, slug],
  },
)
watch(_w2ExtraSvcs, (v) => { _wipe2ExtraServicesData.value = v || [] }, { immediate: true })

const wipe2WorkStatusAsyncKey = computed(() => `project-wipe2-work-status:${slug.value || 'empty'}`)
const { data: _w2WorkStatus } = useAsyncData<any[]>(
  wipe2WorkStatusAsyncKey,
  () => contentViewMode.value === 'wipe2' && currentProjectPage.value === 'work_status'
    ? $fetch<any[]>(`/api/projects/${slug.value}/work-status`)
    : Promise.resolve([]),
  {
    server: false,
    default: () => [],
    watch: [contentViewMode, currentProjectPage, slug],
  },
)
watch(_w2WorkStatus, (v) => { _wipe2WorkStatusData.value = v || [] }, { immediate: true })

const currentProjectLeafItems = computed(() =>
  adminNav.currentNode.value.payload.filter((item) => item.type === 'leaf' && item.id.startsWith('prj_')),
)

const currentProjectLeafIndex = computed(() => {
  const fallbackLeafId = PROJECT_PAGE_TO_NAV_TARGET[normalizedActivePage.value]?.leafId || null
  const currentLeafId = adminNav.activeLeafId.value || fallbackLeafId
  if (!currentLeafId) return -1
  return currentProjectLeafItems.value.findIndex((item) => item.id === currentLeafId)
})

watch(
  [() => adminNav.currentNode.value.nodeId, () => adminNav.activeLeafId.value, currentProjectPage],
  ([nodeId, activeLeaf, page]) => {
    if (Date.now() > projectNavStabilizeUntil) return
    if (clientPreviewMode.value || contractorPreviewMode.value) return
    if (page !== 'overview') return

    const expectedNodeId = `cab_project_${slug.value}`
    if (nodeId === expectedNodeId && !activeLeaf) return

    adminNav.ensureProject(slug.value, project.value?.title || slug.value, { force: true })
  },
)

let projectViewportObserver: MutationObserver | null = null
let projectViewportSyncFrame = 0
let projectViewportLayoutInProgress = false

function syncProjectViewportPager() {
  const el = projectViewport.value
  if (!el || !isProjectViewportPaged.value) {
    projectViewportStops.value = [0]
    viewportPageIndex.value = 1
    viewportPageCount.value = 1
    return
  }

  projectViewportLayoutInProgress = true
  syncProjectViewportAttrs()

  if (projectViewportMode.value === 'wipe2') {
    projectViewportStops.value = [0]
    viewportPageIndex.value = 1
    viewportPageCount.value = 1
    projectViewportLayoutInProgress = false
    return
  }

  applyViewportZoneLayout(el)
  projectViewportStops.value = buildViewportPageStops(el)
  viewportPageCount.value = projectViewportStops.value.length

  // Defer flag clear so MutationObserver microtask sees it as true and skips re-trigger
  queueMicrotask(() => {
    projectViewportLayoutInProgress = false
  })

  updateProjectViewportPageIndex(el)
}

function updateProjectViewportPageIndex(el = projectViewport.value) {
  if (!el || !isProjectViewportPaged.value) {
    viewportPageIndex.value = 1
    viewportPageCount.value = Math.max(1, projectViewportStops.value.length)
    return
  }

  if (projectViewportMode.value === 'wipe') {
    const currentOffset = getCurrentProjectWipeOffset()
    const currentIndex = projectViewportStops.value.findLastIndex((stop) => stop <= currentOffset + 2)
    viewportPageIndex.value = Math.max(1, (currentIndex >= 0 ? currentIndex : 0) + 1)
    return
  }

  const currentTop = el.scrollTop + 2
  const currentIndex = projectViewportStops.value.findLastIndex((stop) => stop <= currentTop)
  viewportPageIndex.value = Math.max(1, (currentIndex >= 0 ? currentIndex : 0) + 1)
}

function scheduleProjectViewportPagerSync() {
  if (projectViewportSyncFrame || !isProjectViewportPaged.value) return
  projectViewportSyncFrame = window.requestAnimationFrame(() => {
    projectViewportSyncFrame = 0
    syncProjectViewportPager()
  })
}

function reconnectProjectViewportObserver() {
  projectViewportObserver?.disconnect()
  projectViewportObserver = null

  const el = projectViewport.value
  if (!el || typeof MutationObserver === 'undefined') return

  projectViewportObserver = new MutationObserver((mutations) => {
    if (viewportNavigationBusy.value || projectViewportLayoutInProgress) return
    // Ignore mutations caused by the layout engine itself (zone offsets / spacers)
    const onlyZone = mutations.every((m) =>
      [...m.addedNodes, ...m.removedNodes].every(
        (n) => n instanceof Element
          && (n.hasAttribute('data-cv-zone-offset') || n.hasAttribute('data-cv-zone-spacer')),
      ) && m.attributeName === null,
    )
    if (onlyZone) return
    scheduleProjectViewportPagerSync()
  })

  projectViewportObserver.observe(el, {
    childList: true,
    subtree: true,
  })
}

function clearProjectViewportWipeTimers() {
  projectViewportWipeTimers.forEach((timer) => window.clearTimeout(timer))
  projectViewportWipeTimers = []
}

function getProjectWipeInner() {
  return projectViewport.value?.querySelector<HTMLElement>('.proj-wipe-inner') ?? null
}

function getCurrentProjectWipeOffset(): number {
  const inner = getProjectWipeInner()
  if (!inner) return 0
  const m = inner.style.transform.match(/translateY\((-?[\d.]+)px\)/)
  return m ? -parseFloat(m[1]) : 0
}

function setProjectWipeOffset(offset: number) {
  const inner = getProjectWipeInner()
  if (inner) inner.style.transform = `translateY(${-offset}px)`
}

function syncProjectViewportAttrs() {
  const el = projectViewport.value
  if (!el) return

  const resolvedContentViewMode = projectViewportMode.value

  const panelHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dp-panel-h')) || 28
  const viewportHeight = Math.max(240, window.innerHeight - panelHeight)
  const isWipe = resolvedContentViewMode === 'wipe' || resolvedContentViewMode === 'wipe2'

  // In wipe mode, use design tokens for insets; otherwise compute from viewport
  let sheetTop: number
  let sheetBottom: number
  if (isWipe) {
    const t = designSystem.tokens.value
    sheetTop = t.wipeTopInset ?? 48
    sheetBottom = Math.max(t.wipeBottomInset ?? 106, resolveViewportPagerRailInset(el) + 14)
  } else {
    const sheetInsets = resolveViewportSheetInsets(viewportHeight, resolveViewportPagerRailInset(el))
    sheetTop = sheetInsets.top
    sheetBottom = sheetInsets.bottom
  }

  el.dataset.cvMode = resolvedContentViewMode
  el.dataset.cvDir = projectViewportWipeDirection.value
  if (projectViewportWipePhase.value === 'idle') {
    delete el.dataset.cvPhase
  } else {
    el.dataset.cvPhase = projectViewportWipePhase.value
  }
  el.style.setProperty('--cv-transition-ms', `${projectContentTransitionDuration.value}ms`)
  el.style.setProperty('--cv-viewport-height', `${viewportHeight}px`)
  el.style.setProperty('--cv-sheet-top', `${sheetTop}px`)
  el.style.setProperty('--cv-sheet-bottom', `${sheetBottom}px`)

  if (isWipe) {
    const t = designSystem.tokens.value
    el.style.setProperty('--wipe-page-fill', String(t.wipePageFill ?? 0.85))
    el.dataset.cvWipeTransition = t.wipeTransition ?? 'slide'
  }
}

function resetProjectViewport() {
  const el = projectViewport.value
  if (!el) return
  clearProjectViewportWipeTimers()
  projectViewportWipePhase.value = 'idle'
  syncProjectViewportAttrs()
  if (projectViewportMode.value === 'wipe') {
    setProjectWipeOffset(0)
  } else {
    el.scrollTo({ top: 0, behavior: 'auto' })
  }
  syncProjectViewportPager()
}

function lockProjectViewportPaging() {
  viewportPagingLockUntil.value = Date.now() + Math.min(900, Math.max(260, projectContentTransitionDuration.value))
}

function canFlipProjectViewport() {
  return Date.now() >= viewportPagingLockUntil.value && !viewportNavigationBusy.value
}

function moveProjectViewportWithWipe(targetOffset: number, direction: 'next' | 'prev') {
  const el = projectViewport.value
  if (!el) return false

  const total = projectContentTransitionDuration.value
  if (total <= 0) {
    setProjectWipeOffset(targetOffset)
    syncProjectViewportPager()
    return true
  }

  clearProjectViewportWipeTimers()
  projectViewportWipeDirection.value = direction
  projectViewportWipePhase.value = 'cover'
  syncProjectViewportAttrs()
  lockProjectViewportPaging()

  const half = Math.max(80, Math.round(total * 0.48))
  projectViewportWipeTimers.push(window.setTimeout(() => {
    setProjectWipeOffset(targetOffset)
    syncProjectViewportPager()
    projectViewportWipePhase.value = 'reveal'
    syncProjectViewportAttrs()
  }, half))

  projectViewportWipeTimers.push(window.setTimeout(() => {
    projectViewportWipePhase.value = 'idle'
    syncProjectViewportAttrs()
    syncProjectViewportPager()
  }, Math.max(half + 80, total)))

  return true
}

function resolveProjectPageFromLeafId(leafId: string) {
  if (!leafId.startsWith('prj_')) return null
  return PROJECT_SECTION_TO_PAGE[leafId.replace('prj_', '')] || null
}

async function advanceProjectLeaf(direction: 'next' | 'prev') {
  // Try current nav node leaves first
  let nextPage: string | null = null

  const leafIdx = currentProjectLeafIndex.value
  const leaves = currentProjectLeafItems.value
  if (leafIdx >= 0 && leaves.length) {
    const targetLeaf = leaves[leafIdx + (direction === 'next' ? 1 : -1)]
    if (targetLeaf) {
      nextPage = resolveProjectPageFromLeafId(targetLeaf.id)
    }
  }

  // Fallback: use global page order (overview → first_contact → ... → client_sign_off)
  if (!nextPage) {
    const current = normalizedActivePage.value
    const slugs = ['overview', ...availablePages.value.map(p => p.slug)]
    const idx = slugs.indexOf(current)
    if (idx >= 0) {
      const target = slugs[idx + (direction === 'next' ? 1 : -1)]
      if (target) nextPage = target
    }
  }

  if (!nextPage) return false

  const useWipe = projectViewportMode.value === 'wipe'
  const total = projectContentTransitionDuration.value
  const half = Math.max(80, Math.round(total * 0.48))

  viewportNavigationBusy.value = true
  lockProjectViewportPaging()

  if (useWipe && total > 0) {
    clearProjectViewportWipeTimers()
    projectViewportWipeDirection.value = direction
    projectViewportWipePhase.value = 'cover'
    syncProjectViewportAttrs()
    await new Promise(r => setTimeout(r, half))
  }

  try {
    await selectAdminPage(nextPage)
    await nextTick()
    resetProjectViewport()

    if (useWipe && total > 0) {
      projectViewportWipePhase.value = 'reveal'
      syncProjectViewportAttrs()
    }

    return true
  } finally {
    const delay = useWipe && total > 0
      ? Math.max(80, total - half)
      : Math.min(900, Math.max(260, total))
    window.setTimeout(() => {
      if (useWipe) {
        projectViewportWipePhase.value = 'idle'
        syncProjectViewportAttrs()
      }
      viewportNavigationBusy.value = false
      syncProjectViewportPager()
    }, delay)
  }
}

async function moveProjectViewport(direction: 'next' | 'prev') {
  const el = projectViewport.value
  if (!el) return false

  const stops = projectViewportStops.value.length ? projectViewportStops.value : [0]
  const currentPos = projectViewportMode.value === 'wipe' ? getCurrentProjectWipeOffset() : el.scrollTop
  const currentTop = currentPos + 2
  const currentIndex = Math.max(0, stops.findLastIndex((stop) => stop <= currentTop))
  const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
  const atStart = currentIndex <= 0
  const atEnd = targetIndex >= stops.length

  if (direction === 'next' && atEnd) {
    return isProjectViewportPaged.value ? advanceProjectLeaf('next') : false
  }

  if (direction === 'prev' && atStart) {
    return isProjectViewportPaged.value ? advanceProjectLeaf('prev') : false
  }

  const targetTop = stops[Math.max(0, Math.min(stops.length - 1, targetIndex))] ?? 0

  if (projectViewportMode.value === 'wipe') {
    if (targetTop === getCurrentProjectWipeOffset()) return false
    return moveProjectViewportWithWipe(targetTop, direction)
  }

  if (targetTop === el.scrollTop) return false

  lockProjectViewportPaging()
  el.scrollTo({ top: targetTop, behavior: 'smooth' })
  window.setTimeout(syncProjectViewportPager, Math.min(900, Math.max(260, projectContentTransitionDuration.value)))
  return true
}

async function handleProjectWipe2Boundary(direction: 'next' | 'prev') {
  if (!isProjectViewportPaged.value || !shouldUseProjectWipeCards.value) return
  if (viewportNavigationBusy.value) return
  await advanceProjectLeaf(direction)
}

function handleProjectViewportWheel(event: WheelEvent) {
  if (!isProjectViewportPaged.value || !projectViewport.value) return
  if (projectViewportMode.value === 'wipe2') return  // wipe2 renderer handles navigation
  if (Math.abs(event.deltaY) < 12) return
  event.preventDefault()
  if (!canFlipProjectViewport()) return
  void moveProjectViewport(event.deltaY > 0 ? 'next' : 'prev')
}

let projTouchStartY = 0
let projTouchStartX = 0

function handleProjectViewportTouchStart(e: TouchEvent) {
  projTouchStartY = e.touches[0].clientY
  projTouchStartX = e.touches[0].clientX
}

function handleProjectViewportTouchEnd(e: TouchEvent) {
  if (!isProjectViewportPaged.value) return
  if (projectViewportMode.value === 'wipe2') return  // wipe2 renderer handles navigation
  const deltaY = projTouchStartY - e.changedTouches[0].clientY
  const deltaX = Math.abs(projTouchStartX - e.changedTouches[0].clientX)
  if (Math.abs(deltaY) < 40 || deltaX > Math.abs(deltaY) * 0.8) return
  if (!canFlipProjectViewport()) return
  void moveProjectViewport(deltaY > 0 ? 'next' : 'prev')
}

function handleProjectViewportKeydown(event: KeyboardEvent) {
  if (!isProjectViewportPaged.value) return
  if (projectViewportMode.value === 'wipe2') return
  if (isViewportEditableTarget(event.target)) return

  const isNext = event.key === 'PageDown' || event.key === 'ArrowDown' || event.key === ' '
  const isPrev = event.key === 'PageUp' || event.key === 'ArrowUp'
  if (!isNext && !isPrev) return

  event.preventDefault()
  if (!canFlipProjectViewport()) return
  void moveProjectViewport(isNext ? 'next' : 'prev')
}

function handleWindowProjectViewportKeydown(event: KeyboardEvent) {
  if (!projectViewport.value || !isProjectViewportPaged.value) return
  handleProjectViewportKeydown(event)
}

const {
  clients,
  selectedClientId,
  linkingClient,
  clientLinkError,
  clientLinkSuccess,
  contractorLinkError,
  contractorLinkSuccess,
  designerLinkError,
  designerLinkSuccess,
  sellerLinkError,
  sellerLinkSuccess,
  linkedClients,
  linkedContractorsList,
  linkedDesignersList,
  linkedSellersList,
  linkedManagersList,
  availableClientsForModal,
  availableContractorsForModal,
  availableDesignersForModal,
  availableSellersForProject,
  availableManagersForProject,
  projectFlashMessages,
  linkClientToProject,
  linkClientFromModal,
  unlinkClientFromModal,
  linkContractorFromModal,
  unlinkContractor,
  linkDesignerFromModal,
  unlinkDesigner,
  linkSeller,
  unlinkSeller,
} = useAdminProjectRelations({
  projectSlug: slug,
  currentProjectPage,
  clientPreviewMode,
  refreshProject: refresh,
})

watch(
  resolvedProjectPageFromNav,
  (resolvedPage) => {
    if (!resolvedPage || resolvedPage === activePage.value) {
      return
    }
    activePage.value = resolvedPage
  },
  { immediate: true },
)

const navGroups = computed(() => {
  const available = new Set(availablePages.value.map(p => p.slug))
  const phaseGroups = getAdminNavGroups()
    .map(group => ({
      ...group,
      pages: group.pages.filter(p => available.has(p.slug)),
    }))
    .filter(group => group.pages.length > 0)

  const registryPages = availablePages.value.filter(page =>
    !page.phase && Boolean(PROJECT_REGISTRY_PAGE_META[page.slug]),
  )

  if (!registryPages.length) {
    return phaseGroups
  }

  const registryGroups = Array.from(new Set(registryPages.map(page => PROJECT_REGISTRY_PAGE_META[page.slug]?.group).filter(Boolean)))
    .map((label) => ({
      label,
      pages: registryPages.filter(page => PROJECT_REGISTRY_PAGE_META[page.slug]?.group === label),
    }))

  return [...registryGroups, ...phaseGroups]
})

const activePageTitle = computed(() => {
  if (currentProjectPage.value === 'overview') return 'обзор'
  if (PROJECT_REGISTRY_PAGE_META[currentProjectPage.value]) return PROJECT_REGISTRY_PAGE_META[currentProjectPage.value].title
  return availablePages.value.find(page => page.slug === normalizedActivePage.value)?.title || project.value?.title || slug.value
})

const activeHeroTitle = computed(() => {
  if (currentProjectPage.value === 'overview') return project.value?.title || slug.value
  return activePageTitle.value
})

const navSearch = ref('')

// Group label of the currently active page
const activeGroupLabel = computed(() =>
  PROJECT_REGISTRY_PAGE_META[currentProjectPage.value]?.group
    ?? navGroups.value.find(g => g.pages.some(p => p.slug === currentProjectPage.value))?.label
    ?? null
)

const brutalistHeroFacts = computed(() => [
  { label: 'раздел', value: activePageTitle.value },
  { label: 'группа', value: activeGroupLabel.value || 'обзор' },
  { label: 'страницы', value: String(availablePages.value.length) },
  { label: 'клиенты', value: String(linkedClients.value.length) },
  { label: 'подрядчики', value: String(linkedContractorsList.value.length) },
  { label: 'дизайнеры', value: String(linkedDesignersList.value.length) },
])

const filteredNavGroups = computed(() => {
  const q = navSearch.value.trim().toLowerCase()
  const activeGroup = activeGroupLabel.value

  const base = navGroups.value.map(group => {
    const isActiveGroup = group.label === activeGroup
    if (!q) return { ...group, isActiveGroup }

    // When searching: within the active group boost the active page to top
    let pages = group.pages.filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.icon && p.icon.toLowerCase().includes(q))
    )
    if (isActiveGroup) {
      // Active page floats to TOP of results even if it matched elsewhere
      const activeIdx = pages.findIndex(p => p.slug === currentProjectPage.value)
      if (activeIdx > 0) {
        const [ap] = pages.splice(activeIdx, 1)
        pages = [ap, ...pages]
      }
    }
    return { ...group, pages, isActiveGroup }
  }).filter(group => group.pages.length > 0)

  if (!q) return base

  // Sort: group of the current page comes first
  return [...base].sort((a, b) => {
    if (a.isActiveGroup) return -1
    if (b.isActiveGroup) return 1
    return 0
  })
})

const overviewMatchesSearch = computed(() => {
  const q = navSearch.value.trim().toLowerCase()
  return !q || 'обзор'.includes(q)
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
  if (activePage.value === 'overview' || PROJECT_REGISTRY_PAGE_META[activePage.value]) {
    return
  }
  const normalized = normalizedActivePage.value
  if (!pages.length) {
    activePage.value = 'overview'
    return
  }
  if (!pages.some(p => p.slug === normalized)) {
    activePage.value = pages[0].slug
  }
}, { immediate: true })

watch([currentProjectPage, contentViewMode], async () => {
  await nextTick()
  resetProjectViewport()
})

watch([projectViewport, contentViewMode, projectContentTransitionDuration, projectViewportWipePhase, projectViewportWipeDirection], () => {
  syncProjectViewportAttrs()
}, { immediate: true })

// Re-sync when wipe tokens change (sliders in design panel)
const wipeTokenDeps = computed(() => {
  const t = designSystem.tokens.value
  return `${t.wipeTopInset}-${t.wipeBottomInset}-${t.wipeSideMargin}-${t.wipeContentPadding}-${t.wipeCardRadius}-${t.wipeCardBorder}-${t.wipeCardShadow}-${t.wipePageFill}-${t.wipeTransition}`
})
watch(wipeTokenDeps, () => {
  syncProjectViewportAttrs()
  nextTick(syncProjectViewportPager)
})

watch(projectViewport, () => {
  reconnectProjectViewportObserver()
})

onMounted(() => {
  nextTick(syncProjectViewportPager)
  nextTick(reconnectProjectViewportObserver)
  window.addEventListener('resize', syncProjectViewportPager)
})

onBeforeUnmount(() => {
  clearProjectViewportWipeTimers()
  if (projectViewportSyncFrame) {
    window.cancelAnimationFrame(projectViewportSyncFrame)
    projectViewportSyncFrame = 0
  }
  projectViewportObserver?.disconnect()
  projectViewportObserver = null
  window.removeEventListener('resize', syncProjectViewportPager)
})

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
</script>

<style scoped src="./AdminProjectSlugPage.scoped.css"></style>
