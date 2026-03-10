<template>
  <div>
    <div v-if="projectPending" class="ent-page-skeleton" style="padding:20px">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 8" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    </div>
    <div v-else-if="!project" style="font-size:.88rem;color:#999">Проект не найден</div>
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
                <span class="proj-client-linked-name">{{ linkedClients.map(c => c.name).join(', ') }}</span>
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
        <div class="proj-main" :class="{ 'proj-main--brutalist': isBrutalistProjectMode }">
          <section
            v-if="showBrutalistHero"
            class="proj-hero"
          >
            <div class="proj-hero-body">
              <p class="proj-hero-kicker">{{ activeGroupLabel || 'архитектура проекта' }}</p>
              <h1 class="proj-hero-title">{{ activeHeroTitle }}</h1>
              <div class="proj-hero-meta" aria-label="Контекст проекта">
                <div
                  v-for="fact in brutalistHeroFacts"
                  :key="fact.label"
                  class="proj-hero-meta-item"
                >
                  <span class="proj-hero-meta-label">{{ fact.label }}</span>
                  <span class="proj-hero-meta-value">{{ fact.value }}</span>
                </div>
              </div>
              <div v-if="projectFlashMessages.length" class="proj-hero-notices">
                <p
                  v-for="message in projectFlashMessages"
                  :key="message.key"
                  class="proj-hero-notice"
                  :class="message.tone === 'error' ? 'proj-hero-notice--error' : 'proj-hero-notice--success'"
                >{{ message.text }}</p>
              </div>
              <div class="proj-hero-prompt">↓ прокрутка / swipe ↓</div>
            </div>
          </section>

          <Transition :name="projectContentTransitionName" :css="projectContentTransitionCss" mode="out-in" :duration="projectContentTransitionDuration">
            <div :key="contentKey" class="proj-main-inner" :class="{ 'proj-main-inner--after-hero': showBrutalistHero }">
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
              <!-- Клиенты проекта — inline без модала -->
              <template v-else-if="currentProjectPage === 'project_clients'">
                <div class="proj-entity-panel" :class="{ 'proj-entity-panel--brutalist': isBrutalistProjectMode }">
                  <div class="proj-entity-panel-title">Клиенты проекта</div>

                  <div v-if="linkedClients.length" class="proj-entity-section">
                    <div class="proj-entity-section-label">Закреплённые</div>
                    <div class="proj-entity-list">
                      <div
                        v-for="client in linkedClients"
                        :key="client.id"
                        class="proj-entity-row proj-entity-row--linked"
                      >
                        <div class="proj-entity-info">
                          <div class="proj-entity-name">{{ client.name }}</div>
                          <div class="proj-entity-meta">
                            <template v-if="client.phone">{{ client.phone }}</template>
                            <template v-else-if="client.email">{{ client.email }}</template>
                          </div>
                        </div>
                        <button
                          type="button"
                          class="proj-entity-btn proj-entity-btn--remove"
                          @click="unlinkClientFromModal(String(client.id))"
                        >−</button>
                      </div>
                    </div>
                  </div>

                  <div class="proj-entity-section">
                    <div class="proj-entity-section-label">Добавить из CRM</div>
                    <div v-if="!availableClientsForModal.length" class="proj-entity-empty">Нет доступных клиентов</div>
                    <div class="proj-entity-list">
                      <div
                        v-for="client in availableClientsForModal"
                        :key="client.id"
                        class="proj-entity-row"
                      >
                        <div class="proj-entity-info">
                          <div class="proj-entity-name">{{ client.name }}</div>
                          <div class="proj-entity-meta">
                            <template v-if="client.phone">{{ client.phone }}</template>
                            <template v-else-if="client.email">{{ client.email }}</template>
                          </div>
                        </div>
                        <button
                          type="button"
                          class="proj-entity-btn proj-entity-btn--add"
                          @click="linkClientFromModal(String(client.id))"
                        >+</button>
                      </div>
                    </div>
                  </div>

                  <p v-if="clientLinkError" style="color:var(--ds-error,#c00);font-size:.8rem;margin:8px 0">{{ clientLinkError }}</p>
                  <p v-if="clientLinkSuccess" style="color:var(--ds-success,#5caa7f);font-size:.8rem;margin:8px 0">{{ clientLinkSuccess }}</p>
                </div>
              </template>
              <template v-else-if="currentProjectPage === 'project_contractors'">
                <div class="proj-entity-panel" :class="{ 'proj-entity-panel--brutalist': isBrutalistProjectMode }">
                  <div class="proj-entity-panel-title">Подрядчики проекта</div>

                  <div v-if="linkedContractorsList.length" class="proj-entity-section">
                    <div class="proj-entity-section-label">Закреплённые</div>
                    <div class="proj-entity-list">
                      <div
                        v-for="contractor in linkedContractorsList"
                        :key="contractor.id"
                        class="proj-entity-row proj-entity-row--linked"
                      >
                        <div class="proj-entity-info">
                          <div class="proj-entity-name">{{ contractor.name }}</div>
                          <div class="proj-entity-meta">{{ contractor.companyName || contractor.phone || contractor.email || 'без контакта' }}</div>
                        </div>
                        <button
                          type="button"
                          class="proj-entity-btn proj-entity-btn--remove"
                          @click="unlinkContractor(contractor.id)"
                        >−</button>
                      </div>
                    </div>
                  </div>

                  <div class="proj-entity-section">
                    <div class="proj-entity-section-label">Добавить из CRM</div>
                    <div v-if="!availableContractorsForModal.length" class="proj-entity-empty">Нет доступных подрядчиков</div>
                    <div class="proj-entity-list">
                      <div
                        v-for="contractor in availableContractorsForModal"
                        :key="contractor.id"
                        class="proj-entity-row"
                      >
                        <div class="proj-entity-info">
                          <div class="proj-entity-name">{{ contractor.name }}</div>
                          <div class="proj-entity-meta">{{ contractor.companyName || contractor.phone || contractor.email || 'без контакта' }}</div>
                        </div>
                        <button
                          type="button"
                          class="proj-entity-btn proj-entity-btn--add"
                          @click="linkContractorFromModal(contractor.id)"
                        >+</button>
                      </div>
                    </div>
                  </div>

                  <p v-if="contractorLinkError" style="color:var(--ds-error,#c00);font-size:.8rem;margin:8px 0">{{ contractorLinkError }}</p>
                  <p v-if="contractorLinkSuccess" style="color:var(--ds-success,#5caa7f);font-size:.8rem;margin:8px 0">{{ contractorLinkSuccess }}</p>
                </div>
              </template>
              <template v-else-if="currentProjectPage === 'project_designers'">
                <div class="proj-entity-panel" :class="{ 'proj-entity-panel--brutalist': isBrutalistProjectMode }">
                  <div class="proj-entity-panel-title">Дизайнеры проекта</div>

                  <div v-if="linkedDesignersList.length" class="proj-entity-section">
                    <div class="proj-entity-section-label">Закреплённые</div>
                    <div class="proj-entity-list">
                      <div
                        v-for="designer in linkedDesignersList"
                        :key="designer.id"
                        class="proj-entity-row proj-entity-row--linked"
                      >
                        <div class="proj-entity-info">
                          <div class="proj-entity-name">{{ designer.name }}</div>
                          <div class="proj-entity-meta">{{ designer.companyName || designer.phone || designer.email || 'без контакта' }}</div>
                        </div>
                        <button
                          type="button"
                          class="proj-entity-btn proj-entity-btn--remove"
                          @click="unlinkDesigner(designer.id)"
                        >−</button>
                      </div>
                    </div>
                  </div>

                  <div class="proj-entity-section">
                    <div class="proj-entity-section-label">Добавить из CRM</div>
                    <div v-if="!availableDesignersForModal.length" class="proj-entity-empty">Нет доступных дизайнеров</div>
                    <div class="proj-entity-list">
                      <div
                        v-for="designer in availableDesignersForModal"
                        :key="designer.id"
                        class="proj-entity-row"
                      >
                        <div class="proj-entity-info">
                          <div class="proj-entity-name">{{ designer.name }}</div>
                          <div class="proj-entity-meta">{{ designer.companyName || designer.phone || designer.email || 'без контакта' }}</div>
                        </div>
                        <button
                          type="button"
                          class="proj-entity-btn proj-entity-btn--add"
                          @click="linkDesignerFromModal(designer.id)"
                        >+</button>
                      </div>
                    </div>
                  </div>

                  <p v-if="designerLinkError" style="color:var(--ds-error,#c00);font-size:.8rem;margin:8px 0">{{ designerLinkError }}</p>
                  <p v-if="designerLinkSuccess" style="color:var(--ds-success,#5caa7f);font-size:.8rem;margin:8px 0">{{ designerLinkSuccess }}</p>
                </div>
              </template>
              <template v-else-if="currentProjectPage === 'project_sellers'">
                <div class="proj-entity-panel" :class="{ 'proj-entity-panel--brutalist': isBrutalistProjectMode }">
                  <div class="proj-entity-panel-title">Поставщики проекта</div>

                  <div v-if="linkedSellersList.length" class="proj-entity-section">
                    <div class="proj-entity-section-label">Закреплённые</div>
                    <div class="proj-entity-list">
                      <div
                        v-for="seller in linkedSellersList"
                        :key="seller.id"
                        class="proj-entity-row proj-entity-row--linked"
                      >
                        <div class="proj-entity-info">
                          <div class="proj-entity-name">{{ seller.name }}</div>
                          <div class="proj-entity-meta">{{ seller.companyName || seller.city || seller.contactPerson || 'без контакта' }}</div>
                        </div>
                        <button
                          type="button"
                          class="proj-entity-btn proj-entity-btn--remove"
                          @click="unlinkSeller(seller.id)"
                        >−</button>
                      </div>
                    </div>
                  </div>

                  <div class="proj-entity-section">
                    <div class="proj-entity-section-label">Добавить из CRM</div>
                    <div v-if="!availableSellersForProject.length" class="proj-entity-empty">Нет доступных поставщиков</div>
                    <div class="proj-entity-list">
                      <div
                        v-for="seller in availableSellersForProject"
                        :key="seller.id"
                        class="proj-entity-row"
                      >
                        <div class="proj-entity-info">
                          <div class="proj-entity-name">{{ seller.name }}</div>
                          <div class="proj-entity-meta">{{ seller.companyName || seller.city || seller.contactPerson || 'без контакта' }}</div>
                        </div>
                        <button
                          type="button"
                          class="proj-entity-btn proj-entity-btn--add"
                          @click="linkSeller(seller.id)"
                        >+</button>
                      </div>
                    </div>
                  </div>

                  <p v-if="sellerLinkError" style="color:var(--ds-error,#c00);font-size:.8rem;margin:8px 0">{{ sellerLinkError }}</p>
                  <p v-if="sellerLinkSuccess" style="color:var(--ds-success,#5caa7f);font-size:.8rem;margin:8px 0">{{ sellerLinkSuccess }}</p>
                </div>
              </template>
              <template v-else-if="currentProjectPage === 'project_managers'">
                <div class="proj-entity-panel" :class="{ 'proj-entity-panel--brutalist': isBrutalistProjectMode }">
                  <div class="proj-entity-panel-title">Менеджеры проекта</div>

                  <div v-if="linkedManagersList.length" class="proj-entity-section">
                    <div class="proj-entity-section-label">Назначенные</div>
                    <div class="proj-entity-list">
                      <div
                        v-for="manager in linkedManagersList"
                        :key="manager.id"
                        class="proj-entity-row proj-entity-row--linked"
                      >
                        <div class="proj-entity-info">
                          <div class="proj-entity-name">{{ manager.name }}</div>
                          <div class="proj-entity-meta">{{ manager.role || manager.phone || manager.email || 'менеджер проекта' }}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else class="proj-entity-empty">Менеджеры пока не привязаны к проекту</div>

                  <div class="proj-entity-section">
                    <div class="proj-entity-section-label">Доступные в системе</div>
                    <div v-if="!availableManagersForProject.length" class="proj-entity-empty">Нет дополнительных менеджеров</div>
                    <div class="proj-entity-list">
                      <div
                        v-for="manager in availableManagersForProject"
                        :key="manager.id"
                        class="proj-entity-row"
                      >
                        <div class="proj-entity-info">
                          <div class="proj-entity-name">{{ manager.name }}</div>
                          <div class="proj-entity-meta">{{ manager.role || manager.phone || manager.email || 'менеджер' }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <section v-else class="proj-section-shell" :class="{ 'proj-section-shell--brutalist': isBrutalistProjectMode }">
                <component
                  :is="activeComponent"
                  v-bind="activeComponentProps"
                />
              </section>
            </div>
          </Transition>
        </div>
      </div>
    </template>

    <div v-if="showEdit" class="a-modal-backdrop" :class="{ 'a-modal-backdrop--brutalist': isBrutalistProjectMode }" @click.self="showEdit = false">
      <div class="a-modal" :class="{ 'a-modal--brutalist': isBrutalistProjectMode }">
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
import type { Component } from 'vue'
import {
  AdminWorkStatus,
  AdminClientProfile,
  AdminFirstContact,
  AdminSmartBrief,
  AdminSiteSurvey,
  AdminToRContract,
  AdminExtraServices,
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
  ClientExtraServices,
  ClientSelfProfile,
  ClientBrief,
  ClientTZ,
  ClientWorkProgress,
  ClientPassport,
  AdminProjectOverview,
} from '#components'

definePageMeta({ layout: 'admin', middleware: ['admin', 'admin-project-canonical'] })

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const designSystem = useDesignSystem()
const isBrutalistProjectMode = computed(() => designSystem.currentDesignMode.value === 'brutalist')
const showLegacyMobileNav = computed(() => !contractorPreviewMode.value && !isBrutalistProjectMode.value)
const showBrutalistHero = computed(() => isBrutalistProjectMode.value && !clientPreviewMode.value && !contractorPreviewMode.value)
const projectContentTransitionEffect = computed(() => {
  const effect = designSystem.tokens.value.archPageEnter ?? 'fade'
  if (effect === 'slide') return 'slide-r'
  return effect
})
const projectContentTransitionDuration = computed(() => Math.min(800, Math.max(80, designSystem.tokens.value.pageTransitDuration ?? 280)))
const projectContentTransitionCss = computed(() => projectContentTransitionEffect.value !== 'none')
const projectContentTransitionName = computed(() =>
  projectContentTransitionEffect.value === 'none' ? 'tab-fade' : `pt-${projectContentTransitionEffect.value}`
)

// ── Привязка к глобальному nav (NavigationNode schema) ─────────────────────
const adminNav = useAdminNav()

// При keepalive-активации — синхронизировать навигацию с текущим проектом
function syncNavToProject() {
  const title = project.value?.title || slug.value
  adminNav.ensureProject(slug.value, title)
}
onMounted(syncNavToProject)
onActivated(syncNavToProject)
watch(slug, () => {
  syncNavToProject()
}, { immediate: true })

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
const { data: allContractorsData } = await useFetch<any[]>('/api/contractors', { default: () => [] })
const { data: linkedContractorsData, refresh: refreshLinkedContractors } = await useFetch<any[]>(
  `/api/projects/${slug.value}/contractors`,
  { default: () => [] },
)
const { data: allDesignersData } = await useFetch<any[]>('/api/designers', { default: () => [] })
const { data: linkedDesignersData, refresh: refreshLinkedDesigners } = await useFetch<any[]>(
  `/api/projects/${slug.value}/designers`,
  { default: () => [] },
)
const { data: allSellersData } = await useFetch<any[]>('/api/sellers', { default: () => [] })
const { data: linkedSellersData, refresh: refreshLinkedSellers } = await useFetch<any[]>(
  `/api/projects/${slug.value}/sellers`,
  { default: () => [] },
)
const { data: allManagersData } = await useFetch<any[]>('/api/managers', { default: () => [] })
const { data: linkedManagersData } = await useFetch<any[]>(
  () => `/api/managers?projectSlug=${slug.value}`,
  { default: () => [] },
)
const activePage = ref('overview')
const showEdit = ref(false)
const saving = ref(false)
const editError = ref('')
const projectStatus = ref(project.value?.status || 'lead')

const selectedClientId = ref('')
const linkingClient = ref(false)
const clientLinkError = ref('')
const clientLinkSuccess = ref('')
const contractorLinkError = ref('')
const contractorLinkSuccess = ref('')
// ── Designer link state ──────────────────────────────────────────
const linkingDesigner = ref(false)
const designerLinkError = ref('')
const designerLinkSuccess = ref('')
// ── Seller link state ────────────────────────────────────────────
const linkingSeller = ref(false)
const sellerLinkError = ref('')
const sellerLinkSuccess = ref('')

const allContractors = computed(() => allContractorsData.value || [])
const linkedContractorsList = computed(() => linkedContractorsData.value || [])
const linkedContractorIds = computed(() => new Set(linkedContractorsList.value.map((c: any) => String(c.id))))
const allDesigners = computed(() => allDesignersData.value || [])
const linkedDesignersList = computed(() => linkedDesignersData.value || [])
const linkedDesignerIds = computed(() => new Set(linkedDesignersList.value.map((d: any) => String(d.id))))
const allSellers = computed(() => allSellersData.value || [])
const linkedSellersList = computed(() => linkedSellersData.value || [])
const linkedSellerIds = computed(() => new Set(linkedSellersList.value.map((s: any) => String(s.id))))
const allManagers = computed(() => allManagersData.value || [])
const linkedManagersList = computed(() => linkedManagersData.value || [])
const linkedManagerIds = computed(() => new Set(linkedManagersList.value.map((m: any) => String(m.id))))

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

const availableSellersForProject = computed(() => {
  return allSellers.value.filter((seller: any) => !linkedSellerIds.value.has(String(seller.id)))
})

const availableManagersForProject = computed(() => {
  return allManagers.value.filter((manager: any) => !linkedManagerIds.value.has(String(manager.id)))
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
  extra_services: AdminExtraServices,
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
  return `adm-${currentProjectPage.value}`
})

const defaultPhasePage = computed(() => {
  const pages = project.value?.pages || []
  const firstVisiblePhasePage = getAdminNavGroups()
    .flatMap(group => group.pages)
    .find((page) => {
      if (page.slug === 'self_profile' && pages.includes('brief')) {
        return true
      }
      return pages.includes(page.slug)
    })

  return firstVisiblePhasePage?.slug || 'overview'
})

async function selectAdminPage(pageSlug: string) {
  activePage.value = pageSlug
  const normalizedPage = pageSlug === 'self_profile' ? 'brief' : pageSlug
  const target = PROJECT_PAGE_TO_NAV_TARGET[normalizedPage] || {}
  const title = project.value?.title || slug.value
  if (target.branchId || target.leafId) {
    await adminNav.setProjectView(slug.value, title, target)
  } else {
    adminNav.ensureProject(slug.value, title)
  }
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
  extra_services:        ClientExtraServices,
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
  currentProjectPage.value === 'brief' ? 'self_profile' : currentProjectPage.value,
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
    return 'overview'
  }

  return null
})

const currentProjectPage = computed(() => resolvedProjectPageFromNav.value || activePage.value)

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
  return getAdminNavGroups()
    .map(group => ({
      ...group,
      pages: group.pages.filter(p => available.has(p.slug)),
    }))
    .filter(group => group.pages.length > 0)
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

const projectFlashMessages = computed(() => [
  { key: 'client-error', tone: 'error', text: clientLinkError.value },
  { key: 'client-success', tone: 'success', text: clientLinkSuccess.value },
  { key: 'contractor-error', tone: 'error', text: contractorLinkError.value },
  { key: 'contractor-success', tone: 'success', text: contractorLinkSuccess.value },
  { key: 'designer-error', tone: 'error', text: designerLinkError.value },
  { key: 'designer-success', tone: 'success', text: designerLinkSuccess.value },
].filter((message): message is { key: string; tone: 'error' | 'success'; text: string } => Boolean(message.text)))

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

async function linkSeller(sellerId: number) {
  if (linkingSeller.value) return
  linkingSeller.value = true
  sellerLinkError.value = ''
  sellerLinkSuccess.value = ''
  try {
    await $fetch(`/api/projects/${slug.value}/sellers`, {
      method: 'POST',
      body: { sellerId },
    })
    await refreshLinkedSellers()
    sellerLinkSuccess.value = 'Поставщик привязан к проекту'
    setTimeout(() => { sellerLinkSuccess.value = '' }, 3000)
  } catch (e: any) {
    sellerLinkError.value = e?.data?.message || 'Не удалось привязать поставщика'
  } finally {
    linkingSeller.value = false
  }
}

async function unlinkSeller(sellerId: number) {
  if (linkingSeller.value) return
  linkingSeller.value = true
  sellerLinkError.value = ''
  sellerLinkSuccess.value = ''
  try {
    await $fetch(`/api/projects/${slug.value}/sellers`, {
      method: 'DELETE',
      body: { sellerId },
    })
    await refreshLinkedSellers()
    sellerLinkSuccess.value = 'Поставщик отвязан от проекта'
    setTimeout(() => { sellerLinkSuccess.value = '' }, 2500)
  } catch (e: any) {
    sellerLinkError.value = e?.data?.message || 'Не удалось отвязать поставщика'
  } finally {
    linkingSeller.value = false
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
  background: var(--glass-text, #1a1a1a);
  color: var(--glass-page-bg, #fff);
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
  background: color-mix(in srgb, var(--ds-error, #c83232) 10%, transparent);
  color: var(--ds-error, #c0392b);
  border-color: color-mix(in srgb, var(--ds-error, #c83232) 25%, transparent);
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
.proj-content-area {
  /* space for the fixed sidebar */
  padding-left: calc(var(--ds-sidebar-width, 200px) + 24px);
}

/* Nav column — fixed, full-height, flex column ── */
.proj-nav-col {
  position: fixed;
  left: max(24px, calc((100vw - var(--ds-container-width, 1140px)) / 2 + 24px));
  top: var(--admin-nav-top, 138px);
  bottom: 0;
  width: var(--ds-sidebar-width, 200px);
  display: flex;
  flex-direction: column;
  overflow: hidden; /* children handle their own scroll */
  z-index: 10;
}

/* ── Left sidebar nav — fills the column ── */
.proj-sidenav {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

/* ── Header: always visible, never scrolls ── */
.proj-nav-header {
  flex-shrink: 0;
  padding: 10px 10px 4px;
  background: var(--glass-page-bg);
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  z-index: 4;
}

/* ── Search input ── */
.proj-nav-search {
  margin-bottom: 4px;
}
.proj-nav-search-input {
  width: 100%;
  box-sizing: border-box;
  font-size: .74rem;
  padding: 5px 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  background: color-mix(in srgb, var(--glass-bg) 50%, transparent);
  color: var(--glass-text);
  outline: none;
  font-family: inherit;
  transition: border-color .15s;
}
.proj-nav-search-input:focus {
  border-color: color-mix(in srgb, var(--ds-accent, #7c6ef7) 55%, transparent);
}
.proj-nav-search-input::placeholder { opacity: .45; }
.proj-nav-search-input::-webkit-search-cancel-button { display: none; }

/* overview button lives in header — compact */
.proj-sidenav-item--overview {
  margin: 2px 0 0;
}

/* ── Scrollable nav body ── */
.proj-nav-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 10px 32px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--glass-text) 20%, transparent) transparent;
}
.proj-nav-body::-webkit-scrollbar { width: 3px; }
.proj-nav-body::-webkit-scrollbar-track { background: transparent; }
.proj-nav-body::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--glass-text) 22%, transparent);
  border-radius: 2px;
}
.proj-nav-search-input {
  width: 100%;
  box-sizing: border-box;
  font-size: .74rem;
  padding: 5px 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  background: color-mix(in srgb, var(--glass-bg) 50%, transparent);
  color: var(--glass-text);
  outline: none;
  font-family: inherit;
  transition: border-color .15s;
}
.proj-nav-search-input:focus {
  border-color: color-mix(in srgb, var(--ds-accent, #7c6ef7) 55%, transparent);
}
.proj-nav-search-input::placeholder { opacity: .45; }
/* hide native clear button in webkit */
.proj-nav-search-input::-webkit-search-cancel-button { display: none; }

.proj-sidenav-group { margin-bottom: 18px; }
.proj-sidenav-group-label {
  font-size: .62rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: .07em;
  color: var(--glass-text); opacity: .48; margin-bottom: 6px; padding-left: 10px;
  transition: opacity .12s;
}
/* Active group label is slightly more prominent when searching */
.proj-sidenav-group-label--active { opacity: .72; }

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
.proj-main { width: 100%; min-width: 0; }
.proj-main--brutalist {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - var(--dp-panel-h, 28px));
}
.proj-main-inner { /* wrapper for Transition — no extra layout effect */ }
.proj-main-inner--after-hero {
  min-height: 100vh;
  padding-bottom: max(3rem, env(safe-area-inset-bottom));
}

.proj-section-shell {
  width: 100%;
  min-width: 0;
}

.proj-section-shell--brutalist {
  padding: clamp(18px, 2.4vw, 32px) 0 max(3rem, env(safe-area-inset-bottom));
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.proj-hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 32px 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.proj-hero-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  width: 100%;
}

.proj-hero-kicker {
  margin: 0;
  font-size: .68rem;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.proj-hero-title {
  margin: 0;
  max-width: 980px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: .12em;
  line-height: .96;
  font-size: clamp(2.4rem, 8vw, 7rem);
  font-weight: 500;
  word-break: break-word;
}

.proj-hero-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: min(100%, 980px);
}

.proj-hero-meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}

.proj-hero-meta-label {
  font-size: .6rem;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 44%, transparent);
}

.proj-hero-meta-value {
  font-size: .96rem;
  line-height: 1.15;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.proj-hero-notices {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  width: min(100%, 980px);
}

.proj-hero-notice {
  margin: 0;
  padding: 9px 12px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  font-size: .68rem;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.proj-hero-notice--success {
  color: color-mix(in srgb, var(--ds-success, #5caa7f) 78%, var(--glass-text) 22%);
}

.proj-hero-notice--error {
  color: color-mix(in srgb, var(--ds-error, #c00) 82%, var(--glass-text) 18%);
}

.proj-hero-prompt {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  font-size: .68rem;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 42%, transparent);
}

/* ── Section switch fade ── */
.tab-fade-enter-active { transition: opacity .35s ease-in-out; }
.tab-fade-leave-active { transition: opacity .25s ease-in-out; }
.tab-fade-enter-from  { opacity: 0; }
.tab-fade-leave-to    { opacity: 0; }

/* ── Contractor preview card ── */
.ctr-card { padding: 4px 0 32px; }
.ctr-name { font-size: 1rem; font-weight: 500; margin-bottom: 3px; }
.ctr-sub  { font-size: .76rem; color: var(--ds-muted, #999); margin-bottom: 14px; }
.ctr-rows { display: flex; flex-direction: column; gap: 7px; margin-bottom: 16px; }
.ctr-row  { display: flex; align-items: baseline; gap: 10px; }
.ctr-lbl  { font-size: .68rem; text-transform: uppercase; letter-spacing: .06em; color: var(--ds-muted, #aaa); width: 52px; flex-shrink: 0; }
.ctr-val  { font-size: .82rem; color: inherit; text-decoration: none; }
.ctr-val:hover { text-decoration: underline; }
.ctr-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }
.ctr-chip  { font-size: .7rem; padding: 3px 8px; border: 1px solid var(--border, #e0e0e0); border-radius: 999px; }
.ctr-notes { font-size: .8rem; color: var(--ds-muted, #888); margin-bottom: 14px; line-height: 1.5; }
.ctr-link-full { font-size: .72rem; color: var(--ds-muted, #999); text-decoration: none; border-bottom: 1px dashed currentColor; }
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
.proj-sidenav-empty { font-size: .76rem; color: var(--ds-muted, #bbb); padding: 10px; }

/* ── Modal ── */
.a-field { margin-bottom: 14px; }
.a-field label { display: block; font-size: .76rem; color: var(--ds-muted, #888); margin-bottom: 5px; }
.a-modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.3);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}

.a-modal-backdrop--brutalist {
  background: color-mix(in srgb, #000 58%, transparent);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
}

.a-modal {
  background: #fff; border: none;
  padding: 32px; width: 480px; max-width: 90vw; max-height: 90vh; overflow-y: auto;
}

.a-modal--brutalist {
  width: min(760px, calc(100vw - 40px));
  padding: 28px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  border-radius: 0;
  background: color-mix(in srgb, var(--glass-page-bg) 94%, #000 6%);
  box-shadow: none;
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
  background: color-mix(in srgb, var(--ds-success, #28a745) 80%, #000);
  transform: scale(1.05);
}

.modal-action-btn--remove {
  background: var(--ds-error, #dc3545);
  color: #fff;
}

.modal-action-btn--remove:hover {
  background: color-mix(in srgb, var(--ds-error, #dc3545) 80%, #000);
  transform: scale(1.05);
}

.proj-entity-panel--brutalist {
  max-width: none;
  width: 100%;
  padding: 24px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  border-radius: 0;
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.proj-entity-panel--brutalist .proj-entity-panel-title,
.proj-entity-panel--brutalist .proj-entity-section-label,
.proj-entity-panel--brutalist .proj-entity-name,
.proj-entity-panel--brutalist .proj-entity-meta {
  text-transform: uppercase;
}

.proj-entity-panel--brutalist .proj-entity-list {
  gap: 0;
}

.proj-entity-panel--brutalist .proj-entity-row {
  border-radius: 0;
  border-left: 0;
  border-right: 0;
  padding-left: 0;
  padding-right: 0;
  background: transparent;
}

.proj-entity-panel--brutalist .proj-entity-btn {
  border-radius: 0;
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
  border-radius: 999px;
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
  .proj-nav-col {
    width: 160px;
  }
  .proj-content-area {
    padding-left: calc(160px + 20px);
  }
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .proj-hero {
    min-height: calc(100vh - max(24px, env(safe-area-inset-top)));
    padding: 28px 16px max(3.5rem, env(safe-area-inset-bottom));
  }

  .proj-hero-breadcrumbs {
    top: 14px;
    left: 0;
    font-size: .56rem;
    gap: 6px;
    flex-wrap: wrap;
  }

  .proj-hero-title {
    font-size: clamp(2rem, 11vw, 4rem);
    letter-spacing: .09em;
  }

  .proj-hero-meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .proj-hero-meta-item {
    padding: 10px 12px;
  }

  .proj-hero-meta-value {
    font-size: .76rem;
  }

  .proj-hero-prompt {
    bottom: max(14px, env(safe-area-inset-bottom));
    font-size: .6rem;
  }

  /* Show mobile nav */
  .proj-mobile-nav { display: block; }

  /* Hide desktop left sidebar */
  .proj-nav-col { display: none !important; }

  /* Reset reserved space for fixed sidebar */
  .proj-content-area { padding-left: 0; }

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
  .proj-hero-meta {
    grid-template-columns: 1fr;
  }

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

/* ── Inline entity panel (clients/contractors without modal) ── */
.proj-entity-panel {
  max-width: 560px;
}
.proj-entity-panel-title {
  font-size: .72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: #888;
  margin-bottom: 18px;
}
.proj-entity-section {
  margin-bottom: 20px;
}
.proj-entity-section-label {
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: #aaa;
  margin-bottom: 8px;
}
.proj-entity-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.proj-entity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.06);
}
.proj-entity-row--linked {
  background: rgba(92, 170, 127, .08);
  border-color: rgba(92, 170, 127, .18);
}
.proj-entity-info {
  flex: 1;
  min-width: 0;
}
.proj-entity-name {
  font-size: .84rem;
  font-weight: 500;
}
.proj-entity-meta {
  font-size: .74rem;
  color: #999;
  margin-top: 1px;
}
.proj-entity-empty {
  font-size: .8rem;
  color: #777;
  padding: 6px 0;
}
.proj-entity-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .15s;
}
.proj-entity-btn--add {
  background: rgba(92, 170, 127, .15);
  color: #5caa7f;
}
.proj-entity-btn--add:hover {
  background: rgba(92, 170, 127, .28);
}
.proj-entity-btn--remove {
  background: rgba(200, 60, 60, .12);
  color: #c03c3c;
}
.proj-entity-btn--remove:hover {
  background: rgba(200, 60, 60, .24);
}

</style>
