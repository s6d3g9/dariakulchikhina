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
          @scroll="updateProjectViewportPageIndex"
          @touchstart.passive="handleProjectViewportTouchStart"
          @touchend.passive="handleProjectViewportTouchEnd"
        >
          <div v-if="contentViewMode === 'wipe' || contentViewMode === 'wipe2'" class="proj-sheet-frame" aria-hidden="true">
            <div class="proj-sheet-frame__card"></div>
          </div>
          <div v-if="contentViewMode === 'wipe'" class="proj-wipe-overlay" aria-hidden="true">
            <div class="proj-wipe-overlay__sheet"></div>
          </div>
          <div v-show="contentViewMode !== 'wipe2'" class="proj-wipe-inner">
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
          </div><!-- /proj-wipe-inner -->

          <!-- Wipe 2: shows cards instead of raw form content.
               proj-wipe-inner is hidden (v-show) when active so the overlay
               doesn't cover interactive elements.
               fixed-mode is used in preview modes (contractor/client) where
               proj-main has no position:relative (isProjectViewportPaged=false) -->
          <Wipe2Renderer
            v-if="contentViewMode === 'wipe2'"
            :entity="wipe2EntityData"
            :fixed-mode="contractorPreviewMode || clientPreviewMode"
            @edit="designSystem.set('contentViewMode', 'scroll')"
          />

          <div v-if="isProjectViewportPaged && contentViewMode !== 'wipe2'" class="proj-pager-rail">
            <div class="proj-pager-rail__meta">
              <span class="proj-pager-rail__mode">{{ projectPagerModeLabel }}</span>
              <span>экран {{ viewportPageIndex }} / {{ viewportPageCount }}</span>
            </div>
            <div class="proj-pager-rail__actions">
              <button type="button" class="a-btn-sm" @click="moveProjectViewport('prev')">← экран</button>
              <button type="button" class="a-btn-sm" @click="moveProjectViewport('next')">{{ projectPagerNextLabel }}</button>
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
import { applyViewportZoneLayout, buildViewportPageStops, resolveViewportPagerRailInset, resolveViewportSheetInsets } from '~/utils/contentViewportPager'
import { createWipe2Slot, buildWipe2Cards, useWipe2State } from '~/composables/useWipe2'
import type { Wipe2EntityData } from '~/shared/types/wipe2'
import { getBriefSections } from '~~/shared/constants/brief-sections'
import { presetLabel } from '~~/shared/constants/presets'
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
  AdminProjectSettings,
} from '#components'

definePageMeta({ layout: 'admin', middleware: ['admin', 'admin-project-canonical'] })

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const designSystem = useDesignSystem()
const blueprintRuntime = useAppBlueprintRuntime()
createWipe2Slot()
const isBrutalistProjectMode = computed(() => designSystem.currentDesignMode.value === 'brutalist')
const showLegacyMobileNav = computed(() => !contractorPreviewMode.value && !isBrutalistProjectMode.value)
const showBrutalistHero = computed(() => isBrutalistProjectMode.value && !clientPreviewMode.value && !contractorPreviewMode.value)
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
const _W2_SP_LABELS: Record<string, string> = {
  '': 'не задан', in_work: 'в работе', sent_to_client: 'отправлен клиенту',
  revision: 'на доработке', approved: 'согласован',
}
const _W2_SP_COLORS: Record<string, string> = {
  '': 'muted', in_work: 'blue', sent_to_client: 'amber', revision: 'red', approved: 'green',
}
// Данные для разделов с отдельными API (extra_services, work_status)
// Заполняются через watch после объявления currentProjectPage
const _wipe2ExtraServicesData = ref<any[]>([])
const _wipe2WorkStatusData = ref<any[]>([])
// Глобальный стейт — резервный источник (заполняется компонентами через registerWipe2Data)
const _globalWipe2State = useWipe2State()
const wipe2EntityData = computed<Wipe2EntityData | null>(() => {
  const p = project.value
  if (!p) return null
  const pf: Record<string, any> = p.profile ?? {}
  if (currentProjectPage.value === 'space_planning') {
    const status = pf.sp_status ?? ''
    const files: any[] = pf.sp_files ?? []
    return {
      entityTitle: 'Планировочные решения',
      entitySubtitle: pf.sp_version ? `версия ${pf.sp_version}` : undefined,
      entityStatus: (_W2_SP_LABELS[status] ?? status) || undefined,
      entityStatusColor: _W2_SP_COLORS[status] ?? 'muted',
      sections: [
        {
          title: 'Общая информация',
          fields: [
            { label: 'Версия комплекта', value: pf.sp_version ?? '' },
            { label: 'Статус', value: status, type: 'status' as const },
            { label: 'Отправлено клиенту', value: pf.sp_sent_date ?? '', type: 'date' as const },
            { label: 'Согласовано', value: pf.sp_approved_date ?? '', type: 'date' as const },
            { label: 'Комментарий архитектора', value: pf.sp_architect_notes ?? '', type: 'multiline' as const },
            { label: 'Замечания клиента', value: pf.sp_client_notes ?? '', type: 'multiline' as const },
          ],
        },
        {
          title: 'Согласование',
          fields: [
            { label: 'Размеры проверены', value: !!pf.sp_dimensions_checked, type: 'boolean' as const },
            { label: 'Зонирование согласовано', value: !!pf.sp_zones_approved, type: 'boolean' as const },
            { label: 'Геометрия заморожена', value: !!pf.sp_geometry_locked, type: 'boolean' as const },
          ],
        },
        ...(files.length ? [{
          title: 'Файлы планировок',
          fields: files.map((f: any) => ({
            label: f.label || f.filename || 'файл',
            value: f.approval ? (_W2_SP_LABELS[f.approval] ?? f.approval) : 'на рассмотрении',
            type: 'status' as const,
          })),
        }] : []),
      ],
    }
  }

  // ── Брифинг (self_profile / brief) ──────────────────────────
  if (currentProjectPage.value === 'self_profile' || currentProjectPage.value === 'brief') {
    const projectType = p.projectType || 'apartment'
    const sections = getBriefSections(projectType)
    const filled = sections
      .filter(s => s.type === 'fields' && s.fields?.length)
      .map(s => ({
        title: s.title,
        fields: (s.fields ?? []).map(f => ({
          label: f.label,
          value: pf[f.key] ?? '',
          type: (f.type === 'textarea' ? 'multiline' : 'text') as 'multiline' | 'text',
        })),
      }))
    const completedCount = Object.keys(pf).filter(k => k.startsWith('brief_') && pf[k]).length
    return {
      entityTitle: 'Брифинг',
      entitySubtitle: `тип: ${projectType}`,
      entityStatus: pf.brief_completed ? 'заполнен' : completedCount > 0 ? 'в процессе' : 'не заполнен',
      entityStatusColor: pf.brief_completed ? 'green' : completedCount > 0 ? 'amber' : 'muted',
      sections: filled,
    }
  }

  // ── Первичный контакт ────────────────────────────────────────
  if (currentProjectPage.value === 'first_contact') {
    return {
      entityTitle: 'Первичный контакт',
      entityStatus: pf.lead_status || undefined,
      entityStatusColor: pf.lead_status === 'won' ? 'green' : pf.lead_status === 'lost' ? 'red' : pf.lead_status ? 'amber' : 'muted',
      sections: [
        {
          title: 'Контакт',
          fields: [
            { label: 'Имя / ФИО', value: pf.fio ?? '' },
            { label: 'Телефон', value: pf.phone ?? '' },
            { label: 'Email', value: pf.email ?? '' },
            { label: 'Источник', value: pf.lead_source ?? '' },
            { label: 'Дата обращения', value: pf.lead_date ?? '', type: 'date' as const },
          ],
        },
        {
          title: 'Встреча',
          fields: [
            { label: 'Дата встречи', value: pf.lead_meeting_date ?? '', type: 'date' as const },
            { label: 'Время', value: pf.lead_meeting_time ?? '' },
            { label: 'Место', value: pf.lead_meeting_place ?? '' },
            { label: 'Адрес', value: pf.meeting_map_address ?? '' },
            { label: 'Заметки', value: pf.lead_meeting_notes ?? '', type: 'multiline' as const },
            { label: 'Первые пожелания', value: pf.lead_first_wishes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Обмеры / аудит ──────────────────────────────────────────
  if (currentProjectPage.value === 'site_survey') {
    return {
      entityTitle: 'Обмеры и аудит',
      entityStatus: pf.survey_status || undefined,
      entityStatusColor: pf.survey_status === 'done' ? 'green' : pf.survey_status ? 'amber' : 'muted',
      sections: [
        {
          title: 'Общие данные',
          fields: [
            { label: 'Статус', value: pf.survey_status ?? '', type: 'status' as const },
            { label: 'Дата обмеров', value: pf.survey_date ?? '', type: 'date' as const },
            { label: 'Инженер', value: pf.survey_engineer ?? '' },
            { label: 'Адрес объекта', value: pf.survey_address ?? '' },
            { label: 'Площадь, м²', value: pf.survey_area ?? '' },
            { label: 'Высота потолков', value: pf.survey_ceiling ?? '' },
          ],
        },
        {
          title: 'Инженерия',
          fields: [
            { label: 'Заметки инженерии', value: pf.survey_mep_notes ?? '', type: 'multiline' as const },
            { label: 'Электрика', value: pf.mep_electrical ?? '', type: 'multiline' as const },
            { label: 'Сантехника', value: pf.mep_plumbing ?? '', type: 'multiline' as const },
            { label: 'Отопление', value: pf.mep_heating ?? '', type: 'multiline' as const },
            { label: 'Вентиляция', value: pf.mep_ventilation ?? '', type: 'multiline' as const },
          ],
        },
        {
          title: 'Замечания',
          fields: [
            { label: 'Выявленные проблемы', value: pf.survey_issues ?? '', type: 'multiline' as const },
            { label: 'Рекомендации', value: pf.survey_recommendations ?? '', type: 'multiline' as const },
            { label: 'Заметки', value: pf.survey_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── ТЗ и договор ────────────────────────────────────────────
  if (currentProjectPage.value === 'tor_contract') {
    return {
      entityTitle: 'ТЗ и договор',
      entityStatus: pf.contract_status || undefined,
      entityStatusColor: pf.contract_status === 'signed' ? 'green' : pf.contract_status === 'draft' ? 'muted' : pf.contract_status ? 'amber' : 'muted',
      sections: [
        {
          title: 'Договор',
          fields: [
            { label: 'Статус', value: pf.contract_status ?? '', type: 'status' as const },
            { label: 'Номер договора', value: pf.contract_number ?? '' },
            { label: 'Дата договора', value: pf.contract_date ?? '', type: 'date' as const },
            { label: 'Стороны', value: pf.contract_parties ?? '', type: 'multiline' as const },
            { label: 'Тариф', value: pf.service_tariff ?? '' },
            { label: 'Примечания', value: pf.contract_notes ?? '', type: 'multiline' as const },
          ],
        },
        {
          title: 'Счёт и оплата',
          fields: [
            { label: 'Статус оплаты', value: pf.payment_status ?? '', type: 'status' as const },
            { label: 'Сумма', value: pf.invoice_amount ?? '', type: 'currency' as const },
            { label: 'Аванс, %', value: pf.invoice_advance_pct ?? '' },
            { label: 'Дата счёта', value: pf.invoice_date ?? '', type: 'date' as const },
          ],
        },
        {
          title: 'Техническое задание',
          fields: [
            { label: 'Объём работ', value: pf.tor_scope ?? '', type: 'multiline' as const },
            { label: 'Исключения', value: pf.tor_exclusions ?? '', type: 'multiline' as const },
            { label: 'Сроки', value: pf.tor_timeline ?? '', type: 'multiline' as const },
            { label: 'Результаты (deliverables)', value: pf.tor_deliverables ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Мудборд ──────────────────────────────────────────────────
  if (currentProjectPage.value === 'moodboard') {
    const imgs: any[] = Array.isArray(pf.mb_images) ? pf.mb_images : []
    return {
      entityTitle: 'Мудборд',
      entityStatus: pf.mb_status || undefined,
      entityStatusColor: pf.mb_status === 'approved' ? 'green' : pf.mb_status === 'in_work' ? 'blue' : 'muted',
      sections: [
        {
          title: 'Концепция',
          fields: [
            { label: 'Статус', value: pf.mb_status ?? '', type: 'status' as const },
            { label: 'Стиль', value: Array.isArray(pf.mb_style_tags) ? pf.mb_style_tags.join(', ') : (pf.mb_style_tags ?? '') },
            { label: 'Ключевые слова', value: Array.isArray(pf.mb_keywords) ? pf.mb_keywords.join(', ') : (pf.mb_keywords ?? '') },
            { label: 'Ссылки', value: pf.mb_links ?? '', type: 'multiline' as const },
            { label: 'Заметки', value: pf.mb_notes ?? '', type: 'multiline' as const },
            { label: 'Антипримеры', value: pf.mb_dislikes ?? '', type: 'multiline' as const },
          ],
        },
        ...(imgs.length ? [{
          title: `Изображения (${imgs.length})`,
          fields: [{ label: 'Загружено', value: String(imgs.length) }],
        }] : []),
      ],
    }
  }

  // ── Согласование концепции ───────────────────────────────────
  if (currentProjectPage.value === 'concept_approval') {
    return {
      entityTitle: 'Согласование концепции',
      entitySubtitle: pf.ca_version ? `версия ${pf.ca_version}` : undefined,
      entityStatus: pf.ca_status || undefined,
      entityStatusColor: pf.ca_status === 'approved' ? 'green' : pf.ca_status === 'revision' ? 'red' : pf.ca_status ? 'blue' : 'muted',
      sections: [
        {
          title: 'Статус',
          fields: [
            { label: 'Версия', value: pf.ca_version ?? '' },
            { label: 'Статус', value: pf.ca_status ?? '', type: 'status' as const },
            { label: 'Отправлено', value: pf.ca_sent_date ?? '', type: 'date' as const },
            { label: 'Дата согласования', value: pf.ca_approval_date ?? '', type: 'date' as const },
            { label: 'Геометрия заморожена', value: !!pf.ca_geometry_locked, type: 'boolean' as const },
          ],
        },
        {
          title: 'Замечания',
          fields: [
            { label: 'Заметки', value: pf.ca_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Рабочие чертежи ─────────────────────────────────────────
  if (currentProjectPage.value === 'working_drawings') {
    return {
      entityTitle: 'Рабочие чертежи',
      entitySubtitle: pf.wd_version ? `версия ${pf.wd_version}` : undefined,
      entityStatus: pf.wd_status || undefined,
      entityStatusColor: pf.wd_status === 'approved' ? 'green' : pf.wd_status === 'revision' ? 'red' : pf.wd_status ? 'blue' : 'muted',
      sections: [
        {
          title: 'Общее',
          fields: [
            { label: 'Версия', value: pf.wd_version ?? '' },
            { label: 'Статус', value: pf.wd_status ?? '', type: 'status' as const },
            { label: 'Дата выпуска', value: pf.wd_issue_date ?? '', type: 'date' as const },
            { label: 'Дата согласования', value: pf.wd_approved_date ?? '', type: 'date' as const },
            { label: 'Масштаб', value: pf.wd_scale ?? '' },
            { label: 'Листов', value: pf.wd_sheets ?? '' },
          ],
        },
        {
          title: 'Контроль',
          fields: [
            { label: 'Размеры проверены', value: !!pf.wd_dimensions_ok, type: 'boolean' as const },
            { label: 'Нормы соблюдены', value: !!pf.wd_regulations_ok, type: 'boolean' as const },
            { label: 'Согласовано с инженерией', value: !!pf.wd_mep_coordinated, type: 'boolean' as const },
            { label: 'Заморожено', value: !!pf.wd_locked, type: 'boolean' as const },
            { label: 'Заметки', value: pf.wd_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Спецификации ─────────────────────────────────────────────
  if (currentProjectPage.value === 'specifications') {
    const items: any[] = Array.isArray(pf.spec_items) ? pf.spec_items : []
    return {
      entityTitle: 'Спецификации',
      entitySubtitle: pf.spec_version ? `версия ${pf.spec_version}` : undefined,
      entityStatus: pf.spec_status || undefined,
      entityStatusColor: pf.spec_status === 'approved' ? 'green' : pf.spec_status ? 'blue' : 'muted',
      sections: [
        {
          title: 'Общее',
          fields: [
            { label: 'Версия', value: pf.spec_version ?? '' },
            { label: 'Статус', value: pf.spec_status ?? '', type: 'status' as const },
            { label: 'Дата выпуска', value: pf.spec_issue_date ?? '', type: 'date' as const },
            { label: 'Позиций', value: items.length ? String(items.length) : (pf.spec_items_count ?? '') },
            { label: 'Заметки', value: pf.spec_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Инженерия (MEP) ──────────────────────────────────────────
  if (currentProjectPage.value === 'mep_integration') {
    return {
      entityTitle: 'Инженерные системы',
      entityStatus: pf.mep_status || undefined,
      entityStatusColor: pf.mep_status === 'approved' ? 'green' : pf.mep_status === 'revision' ? 'red' : pf.mep_status ? 'blue' : 'muted',
      sections: [
        {
          title: 'Статус',
          fields: [
            { label: 'Общий статус', value: pf.mep_status ?? '', type: 'status' as const },
            { label: 'Статус электрики', value: pf.mep_electrical_status ?? '', type: 'status' as const },
            { label: 'Электроподрядчик', value: pf.mep_electrical_contractor ?? '' },
            { label: 'Нагрузки рассчитаны', value: !!pf.mep_loads_calculated, type: 'boolean' as const },
            { label: 'Согласования получены', value: !!pf.mep_permits_ok, type: 'boolean' as const },
            { label: 'Коллизии проверены', value: !!pf.mep_clash_checked, type: 'boolean' as const },
          ],
        },
        {
          title: 'Заметки',
          fields: [
            { label: 'Электрика', value: pf.mep_electrical_notes ?? '', type: 'multiline' as const },
            { label: 'Общие заметки', value: pf.mep_general_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Финальный альбом ─────────────────────────────────────────
  if (currentProjectPage.value === 'design_album_final') {
    return {
      entityTitle: 'Финальный альбом',
      entitySubtitle: pf.daf_version ? `версия ${pf.daf_version}` : undefined,
      entityStatus: pf.daf_status || undefined,
      entityStatusColor: pf.daf_status === 'issued' ? 'green' : pf.daf_status ? 'blue' : 'muted',
      sections: [
        {
          title: 'Параметры',
          fields: [
            { label: 'Версия', value: pf.daf_version ?? '' },
            { label: 'Статус', value: pf.daf_status ?? '', type: 'status' as const },
            { label: 'Дата выпуска', value: pf.daf_issue_date ?? '', type: 'date' as const },
            { label: 'Страниц', value: pf.daf_page_count ?? '' },
            { label: 'Формат', value: pf.daf_format ?? '' },
          ],
        },
        {
          title: 'Состав альбома',
          fields: [
            { label: 'Чертежи включены', value: !!pf.daf_drawings_included, type: 'boolean' as const },
            { label: 'Спецификации включены', value: !!pf.daf_specs_included, type: 'boolean' as const },
            { label: 'Инженерия включена', value: !!pf.daf_mep_included, type: 'boolean' as const },
            { label: 'Подписан', value: !!pf.daf_signed, type: 'boolean' as const },
            { label: 'Заметки', value: pf.daf_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Поставщики ───────────────────────────────────────────────
  if (currentProjectPage.value === 'suppliers') {
    const items: any[] = Array.isArray(pf.sup_items) ? pf.sup_items : []
    return {
      entityTitle: 'Поставщики',
      entityStatus: pf.sup_status || undefined,
      entityStatusColor: pf.sup_status === 'done' ? 'green' : pf.sup_status ? 'amber' : 'muted',
      sections: [
        {
          title: 'Обзор',
          fields: [
            { label: 'Статус', value: pf.sup_status ?? '', type: 'status' as const },
            { label: 'Поставщиков', value: String(items.length) },
            { label: 'Заметки', value: pf.sup_notes ?? '', type: 'multiline' as const },
          ],
        },
        ...(items.slice(0, 8).map((s: any, i: number) => ({
          title: s.name || `Поставщик ${i + 1}`,
          fields: [
            { label: 'Контакт', value: s.contact ?? '' },
            { label: 'Категория', value: s.category ?? '' },
            { label: 'Статус', value: s.status ?? '', type: 'status' as const },
          ],
        }))),
      ],
    }
  }

  // ── Статус закупок ───────────────────────────────────────────
  if (currentProjectPage.value === 'procurement_status') {
    const orders: any[] = Array.isArray(pf.ps_orders) ? pf.ps_orders : []
    return {
      entityTitle: 'Статус закупок',
      entityStatus: pf.ps_status || undefined,
      entityStatusColor: pf.ps_status === 'done' ? 'green' : pf.ps_status ? 'amber' : 'muted',
      sections: [
        {
          title: 'Обзор',
          fields: [
            { label: 'Статус', value: pf.ps_status ?? '', type: 'status' as const },
            { label: 'Заказов', value: String(orders.length) },
            { label: 'Заметки', value: pf.ps_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── План строительства ───────────────────────────────────────
  if (currentProjectPage.value === 'construction_plan') {
    return {
      entityTitle: 'План строительства',
      entityStatus: pf.cp_status || undefined,
      entityStatusColor: pf.cp_status === 'done' ? 'green' : pf.cp_status === 'in_work' ? 'blue' : pf.cp_status ? 'amber' : 'muted',
      sections: [
        {
          title: 'Общее',
          fields: [
            { label: 'Статус', value: pf.cp_status ?? '', type: 'status' as const },
            { label: 'Дата начала', value: pf.cp_start_date ?? '', type: 'date' as const },
            { label: 'Дата окончания', value: pf.cp_end_date ?? '', type: 'date' as const },
            { label: 'Подрядчик', value: pf.cp_contractor ?? '' },
            { label: 'Прораб', value: pf.cp_supervisor ?? '' },
          ],
        },
        {
          title: 'Бюджет',
          fields: [
            { label: 'Бюджет', value: pf.cp_budget_total ?? '', type: 'currency' as const },
            { label: 'Израсходовано', value: pf.cp_budget_spent ?? '', type: 'currency' as const },
            { label: 'Заметки', value: pf.cp_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Журнал работ ─────────────────────────────────────────────
  if (currentProjectPage.value === 'work_log') {
    const entries: any[] = Array.isArray(pf.wl_entries) ? pf.wl_entries : []
    return {
      entityTitle: 'Журнал работ',
      entitySubtitle: entries.length ? `${entries.length} записей` : undefined,
      sections: [
        {
          title: 'Записи',
          fields: entries.slice(0, 16).map((e: any) => ({
            label: e.date ? new Date(e.date).toLocaleDateString('ru') : 'запись',
            value: e.text ?? e.type ?? '',
            type: 'multiline' as const,
          })),
        },
      ],
    }
  }

  // ── Фото объекта ─────────────────────────────────────────────
  if (currentProjectPage.value === 'site_photos') {
    const photos: any[] = Array.isArray(pf.sp2_photos) ? pf.sp2_photos : []
    const tagCounts: Record<string, number> = {}
    photos.forEach((ph: any) => (ph.tags ?? []).forEach((t: string) => { tagCounts[t] = (tagCounts[t] ?? 0) + 1 }))
    return {
      entityTitle: 'Фото объекта',
      entitySubtitle: photos.length ? `${photos.length} фото` : undefined,
      sections: [
        {
          title: 'Статистика',
          fields: [
            { label: 'Всего фото', value: String(photos.length) },
            ...Object.entries(tagCounts).slice(0, 8).map(([tag, cnt]) => ({
              label: tag, value: String(cnt),
            })),
          ],
        },
      ],
    }
  }

  // ── Дефектная ведомость ──────────────────────────────────────
  if (currentProjectPage.value === 'punch_list') {
    const items: any[] = Array.isArray(pf.pl_items) ? pf.pl_items : []
    const open = items.filter((i: any) => i.status === 'open' || !i.status).length
    const fixed = items.filter((i: any) => i.status === 'fixed' || i.status === 'verified').length
    return {
      entityTitle: 'Дефектная ведомость',
      entityStatus: open === 0 && items.length > 0 ? 'закрыто' : open > 0 ? 'открытые дефекты' : undefined,
      entityStatusColor: open === 0 && items.length > 0 ? 'green' : open > 0 ? 'red' : 'muted',
      sections: [
        {
          title: 'Статистика',
          fields: [
            { label: 'Всего позиций', value: String(items.length) },
            { label: 'Открытых', value: String(open) },
            { label: 'Исправлено', value: String(fixed) },
          ],
        },
        ...(items.slice(0, 10).map((it: any, i: number) => ({
          title: `${i + 1}. ${it.title || it.description || 'дефект'}`,
          fields: [
            { label: 'Статус', value: it.status ?? '', type: 'status' as const },
            { label: 'Приоритет', value: it.priority ?? '' },
          ],
        }))),
      ],
    }
  }

  // ── Акт приёмки ──────────────────────────────────────────────
  if (currentProjectPage.value === 'commissioning_act') {
    return {
      entityTitle: 'Акт приёмки',
      entityStatus: pf.cma_status || undefined,
      entityStatusColor: pf.cma_status === 'signed' ? 'green' : pf.cma_status ? 'amber' : 'muted',
      sections: [
        {
          title: 'Реквизиты',
          fields: [
            { label: 'Статус', value: pf.cma_status ?? '', type: 'status' as const },
            { label: 'Номер акта', value: pf.cma_act_number ?? '' },
            { label: 'Дата подписания', value: pf.cma_sign_date ?? '', type: 'date' as const },
            { label: 'Объект', value: pf.cma_location ?? '' },
            { label: 'Сумма договора', value: pf.cma_contract_sum ?? '', type: 'currency' as const },
          ],
        },
        {
          title: 'Содержание',
          fields: [
            { label: 'Описание работ', value: pf.cma_works_description ?? '', type: 'multiline' as const },
            { label: 'Заметки', value: pf.cma_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  // ── Подпись клиента ──────────────────────────────────────────
  if (currentProjectPage.value === 'client_sign_off') {
    return {
      entityTitle: 'Подпись клиента',
      entityStatus: pf.cso_status || undefined,
      entityStatusColor: pf.cso_status === 'signed' ? 'green' : pf.cso_status === 'sent' ? 'amber' : pf.cso_status ? 'blue' : 'muted',
      sections: [
        {
          title: 'Документ',
          fields: [
            { label: 'Статус', value: pf.cso_status ?? '', type: 'status' as const },
            { label: 'Версия', value: pf.cso_version ?? '' },
            { label: 'Имя клиента', value: pf.cso_client_name ?? '' },
            { label: 'Отправлено', value: pf.cso_sent_date ?? '', type: 'date' as const },
            { label: 'Подписано', value: pf.cso_sign_date ?? '', type: 'date' as const },
            { label: 'Комментарий клиента', value: pf.cso_client_comment ?? '', type: 'multiline' as const },
            { label: 'Заметки', value: pf.cso_notes ?? '', type: 'multiline' as const },
          ],
        },
      ],
    }
  }

  if (currentProjectPage.value === 'overview') {
    const statusLabels: Record<string, string> = {
      lead: 'лид', active: 'активен', paused: 'на паузе', done: 'завершён', archived: 'архив',
    }
    const statusColors: Record<string, string> = {
      lead: 'muted', active: 'green', paused: 'amber', done: 'blue', archived: 'muted',
    }
    return {
      entityTitle: p.title,
      entitySubtitle: presetLabel(p.projectType ?? ''),
      entityStatus: statusLabels[p.status] ?? p.status,
      entityStatusColor: statusColors[p.status] ?? 'muted',
      sections: [
        {
          title: 'Проект',
          fields: [
            { label: 'Название', value: p.title, span: 2 as const },
            { label: 'Тип объекта', value: presetLabel(p.projectType ?? '') },
            { label: 'Статус', value: statusLabels[p.status] ?? p.status, type: 'status' as const },
            { label: 'Slug', value: p.slug },
            { label: 'Разделов', value: String((p.pages ?? []).length) },
          ],
        },
        {
          title: 'Участники',
          fields: [
            {
              label: 'Клиенты',
              value: linkedClients.value.length
                ? linkedClients.value.map((c: any) => c.name).join(', ')
                : 'не привязан',
              span: 2 as const,
            },
            {
              label: 'Подрядчики',
              value: linkedContractorsList.value.length
                ? linkedContractorsList.value.map((c: any) => c.name).join(', ')
                : 'не привязаны',
              span: 2 as const,
            },
            {
              label: 'Дизайнеры',
              value: linkedDesignersList.value.length
                ? linkedDesignersList.value.map((d: any) => d.name).join(', ')
                : 'не привязаны',
              span: 2 as const,
            },
          ],
        },
      ],
    }
  }

  if (currentProjectPage.value === 'procurement_list') {
    const items: any[] = pf.proc_items ?? []
    const pending = items.filter((i: any) => i.status === 'pending').length
    const ordered = items.filter((i: any) => ['ordered', 'shipped', 'received'].includes(i.status)).length
    const received = items.filter((i: any) => i.status === 'received').length
    const total = items.reduce((s: number, i: any) => {
      const qty = parseFloat(i.quantity) || 1
      const price = parseFloat(i.unitPrice) || 0
      return s + qty * price
    }, 0)
    return {
      entityTitle: 'Список закупок',
      entitySubtitle: `${items.length} позиций`,
      entityStatus: received === items.length && items.length > 0 ? 'получено' : ordered > 0 ? 'в заказе' : 'ожидание',
      entityStatusColor: received === items.length && items.length > 0 ? 'green' : ordered > 0 ? 'amber' : 'muted',
      sections: [
        {
          title: 'Итоги',
          fields: [
            { label: 'Позиций', value: String(items.length), type: 'number' as const },
            { label: 'Ожидание', value: String(pending), type: 'number' as const },
            { label: 'Заказано', value: String(ordered), type: 'number' as const },
            { label: 'Получено', value: String(received), type: 'number' as const },
            { label: 'Сумма', value: total > 0 ? `${total.toLocaleString('ru')} ₽` : '—', span: 2 as const },
          ],
        },
        ...(items.slice(0, 12).map((item: any) => ({
          title: item.name || 'позиция',
          fields: [
            { label: 'Статус', value: item.status ?? '', type: 'status' as const },
            { label: 'Кол-во', value: item.quantity ? `${item.quantity} ${item.unit ?? ''}`.trim() : '—' },
            { label: 'Цена', value: item.unitPrice ? `${item.unitPrice} ₽` : '—' },
            { label: 'Заметки', value: item.notes ?? '', type: 'multiline' as const },
          ],
        }))),
      ],
    }
  }

  if (currentProjectPage.value === 'extra_services') {
    const svcs = _wipe2ExtraServicesData.value
    const paid = svcs.filter((s: any) => s.status === 'paid').length
    const approved = svcs.filter((s: any) => s.status === 'approved').length
    const totalCost = svcs.reduce((s: number, i: any) => {
      const qty = parseFloat(i.quantity) || 1
      const price = parseFloat(i.unitPrice) || 0
      return s + qty * price
    }, 0)
    return {
      entityTitle: 'Доп. услуги',
      entitySubtitle: `${svcs.length} услуг`,
      entityStatus: paid > 0 ? 'оплачено' : approved > 0 ? 'согласовано' : 'ожидание',
      entityStatusColor: paid > 0 ? 'green' : approved > 0 ? 'amber' : 'muted',
      sections: [
        {
          title: 'Итоги',
          fields: [
            { label: 'Услуг', value: String(svcs.length), type: 'number' as const },
            { label: 'Оплачено', value: String(paid), type: 'number' as const },
            { label: 'Согласовано', value: String(approved), type: 'number' as const },
            { label: 'Сумма', value: totalCost > 0 ? `${totalCost.toLocaleString('ru')} ₽` : '—' },
          ],
        },
        ...(svcs.slice(0, 10).map((svc: any) => ({
          title: svc.title || svc.serviceKey || 'услуга',
          fields: [
            { label: 'Статус', value: svc.status ?? '', type: 'status' as const },
            { label: 'Кол-во', value: svc.quantity ? `${svc.quantity} ${svc.unit ?? ''}`.trim() : '—' },
            { label: 'Цена', value: svc.unitPrice ? `${svc.unitPrice} ₽` : '—' },
            { label: 'Описание', value: svc.description ?? '', type: 'multiline' as const },
          ],
        }))),
      ],
    }
  }

  if (currentProjectPage.value === 'work_status') {
    const items = _wipe2WorkStatusData.value
    const inProgress = items.filter((i: any) => i.status === 'in_progress').length
    const done = items.filter((i: any) => i.status === 'done').length
    const planned = items.filter((i: any) => i.status === 'planned').length
    return {
      entityTitle: 'Ход работ',
      entitySubtitle: `${items.length} задач`,
      entityStatus: done === items.length && items.length > 0 ? 'выполнено' : inProgress > 0 ? 'в работе' : 'запланировано',
      entityStatusColor: done === items.length && items.length > 0 ? 'green' : inProgress > 0 ? 'blue' : 'muted',
      sections: [
        {
          title: 'Итоги',
          fields: [
            { label: 'Задач', value: String(items.length), type: 'number' as const },
            { label: 'В работе', value: String(inProgress), type: 'number' as const },
            { label: 'Выполнено', value: String(done), type: 'number' as const },
            { label: 'Запланировано', value: String(planned), type: 'number' as const },
          ],
        },
        ...(items.slice(0, 10).map((item: any) => ({
          title: item.title || 'задача',
          fields: [
            { label: 'Статус', value: item.status ?? '', type: 'status' as const },
            { label: 'Тип', value: item.workType ?? '' },
            { label: 'Подрядчик', value: item.contractorName ?? '—' },
            { label: 'Дедлайн', value: item.dateEnd ?? '', type: 'date' as const },
            { label: 'Бюджет', value: item.budget ? `${item.budget} ₽` : '—' },
          ],
        }))),
      ],
    }
  }

  // Fallback: компонент мог зарегистрировать данные через registerWipe2Data
  return _globalWipe2State.value
})

const projectHeroPrompt = computed(() => {
  if (!isProjectViewportPaged.value) return '↓ прокрутка / swipe ↓'
  if (contentViewMode.value === 'wipe')  return '↓ лист / PgDn ↓'
  if (contentViewMode.value === 'wipe2') return '← карточки →'
  return '↓ экран / PgDn ↓'
})
const projectPagerModeLabel = computed(() => {
  if (contentViewMode.value === 'flow')  return 'поток'
  if (contentViewMode.value === 'wipe')  return 'листы'
  if (contentViewMode.value === 'wipe2') return 'cards'
  return 'экраны'
})
const projectPagerNextLabel = computed(() => {
  if (contentViewMode.value === 'flow') return 'экран / след.'
  if (contentViewMode.value === 'wipe') {
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
const projectContentTransitionCss = computed(() => projectContentTransitionEffect.value !== 'none')
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

// ── Привязка к глобальному nav (NavigationNode schema) ─────────────────────
const adminNav = useAdminNav()
adminNav.ensureProject(slug.value, slug.value, { force: true })

// При keepalive-активации — синхронизировать навигацию с текущим проектом
function syncNavToProject() {
  const title = project.value?.title || slug.value
  adminNav.ensureProject(slug.value, title, { force: !projectNavHydrated })
  projectNavHydrated = true
}
onMounted(() => {
  projectNavStabilizeUntil = Date.now() + 2200
  syncNavToProject()
  window.addEventListener('keydown', handleWindowProjectViewportKeydown)
})
onActivated(syncNavToProject)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowProjectViewportKeydown)
})

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

const { data: project, pending: projectPending, refresh } = await useFetch<any>(
  () => `/api/projects/${slug.value}`,
  { headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined },
)
watch(slug, () => {
  syncNavToProject()
}, { immediate: true })

const activePage = ref('overview')
const showEdit = ref(false)
const saving = ref(false)
const editError = ref('')
const projectStatus = ref(project.value?.status || 'lead')

const editForm = reactive({
  title: project.value?.title || '',
  pages: [...(project.value?.pages || [])],
})

const pageComponentMap: Record<string, Component> = {
  settings: AdminProjectSettings,
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

const { data: contractorData, pending: contractorPending } = (useFetch as any)(
  () => contractorPreviewId.value ? `/api/contractors/${contractorPreviewId.value}` : null,
  { watch: [contractorPreviewId] },
) as { data: Ref<any>, pending: Ref<boolean> }

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

// ── Wipe 2: ленивые fetch для разделов с отдельным API ─────────────────────
const { data: _w2ExtraSvcs } = useAsyncData<any[]>(
  'project-wipe2-extra-services',
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

const { data: _w2WorkStatus } = useAsyncData<any[]>(
  'project-wipe2-work-status',
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

  if (contentViewMode.value === 'wipe') {
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

  const panelHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dp-panel-h')) || 28
  const viewportHeight = Math.max(240, window.innerHeight - panelHeight)
  const isWipe = contentViewMode.value === 'wipe' || contentViewMode.value === 'wipe2'

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

  el.dataset.cvMode = contentViewMode.value
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
  if (contentViewMode.value === 'wipe') {
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

  const useWipe = contentViewMode.value === 'wipe'
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
  const currentPos = contentViewMode.value === 'wipe' ? getCurrentProjectWipeOffset() : el.scrollTop
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

  if (contentViewMode.value === 'wipe') {
    if (targetTop === getCurrentProjectWipeOffset()) return false
    return moveProjectViewportWithWipe(targetTop, direction)
  }

  if (targetTop === el.scrollTop) return false

  lockProjectViewportPaging()
  el.scrollTo({ top: targetTop, behavior: 'smooth' })
  window.setTimeout(syncProjectViewportPager, Math.min(900, Math.max(260, projectContentTransitionDuration.value)))
  return true
}

function handleProjectViewportWheel(event: WheelEvent) {
  if (!isProjectViewportPaged.value || !projectViewport.value) return
  if (contentViewMode.value === 'wipe2') return  // wipe2 renderer handles navigation
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
  if (contentViewMode.value === 'wipe2') return  // wipe2 renderer handles navigation
  const deltaY = projTouchStartY - e.changedTouches[0].clientY
  const deltaX = Math.abs(projTouchStartX - e.changedTouches[0].clientX)
  if (Math.abs(deltaY) < 40 || deltaX > Math.abs(deltaY) * 0.8) return
  if (!canFlipProjectViewport()) return
  void moveProjectViewport(deltaY > 0 ? 'next' : 'prev')
}

function handleProjectViewportKeydown(event: KeyboardEvent) {
  if (!isProjectViewportPaged.value) return
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
.proj-main--paged {
  display: block; /* override flex from --brutalist so sticky rail works */
  position: relative;
  height: calc(100vh - var(--dp-panel-h, 28px));
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--glass-text) 18%, transparent) transparent;
  outline: none;
}
.proj-main--paged::before {
  content: '';
  position: sticky;
  top: 0;
  left: 0;
  display: block;
  width: 100%;
  height: calc(100vh - var(--dp-panel-h, 28px));
  margin-bottom: calc(-100vh + var(--dp-panel-h, 28px));
  z-index: 2;
  pointer-events: none;
  background:
    linear-gradient(
      to bottom,
      color-mix(in srgb, var(--glass-page-bg) 100%, transparent) 0,
      color-mix(in srgb, var(--glass-page-bg) 100%, transparent) var(--cv-sheet-top, 48px),
      transparent var(--cv-sheet-top, 48px),
      transparent calc(100% - var(--cv-sheet-bottom, 64px)),
      color-mix(in srgb, var(--glass-page-bg) 100%, transparent) calc(100% - var(--cv-sheet-bottom, 64px)),
      color-mix(in srgb, var(--glass-page-bg) 100%, transparent) 100%
    );
}
/* Wipe mode: hard clip content to card rectangle */
.proj-main--paged[data-cv-mode="wipe"]::before {
  /* Cover everything outside the card area with page background */
  background: var(--glass-page-bg);
  /* Cut out the card rectangle so content shows through */
  clip-path: polygon(
    /* outer rect */
    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
    /* inner rect (card hole) — wound counter-clockwise */
    var(--wipe-side-margin, 20px) var(--cv-sheet-top, 48px),
    var(--wipe-side-margin, 20px) calc(100% - var(--cv-sheet-bottom, 64px)),
    calc(100% - var(--wipe-side-margin, 20px)) calc(100% - var(--cv-sheet-bottom, 64px)),
    calc(100% - var(--wipe-side-margin, 20px)) var(--cv-sheet-top, 48px),
    var(--wipe-side-margin, 20px) var(--cv-sheet-top, 48px)
  );
}
.proj-main--paged::-webkit-scrollbar { width: 5px; }
.proj-main--paged::-webkit-scrollbar-track { background: transparent; }
.proj-main--paged::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--glass-text) 18%, transparent);
  border-radius: 999px;
}

.proj-main--paged[data-cv-mode="wipe"] {
  /* overflow:hidden — true book-page mode, no scroll at all.
     Content switches via transform on .proj-wipe-inner. */
  overflow: hidden;
  scroll-behavior: auto;
  scrollbar-width: none;
  overscroll-behavior: none;
  touch-action: none;
}
.proj-main--paged[data-cv-mode="wipe"]::-webkit-scrollbar { display: none; }

/* Content wrapper that shifts to reveal each page */
.proj-main--paged[data-cv-mode="wipe"] .proj-wipe-inner {
  padding-top: var(--cv-sheet-top, 48px);
  will-change: transform;
  min-height: calc(var(--cv-viewport-height, 100vh) - var(--cv-sheet-top, 48px));
}

/* Pager rail: absolute in wipe mode (sticky doesn't work with overflow:hidden) */
.proj-main--paged[data-cv-mode="wipe"] .proj-pager-rail {
  position: absolute;
  bottom: 14px;
  right: calc(var(--wipe-side-margin, 20px) + 4px);
  margin: 0;
  max-width: calc(100% - 2 * var(--wipe-side-margin, 20px) - 8px);
}

/* ── Card frame: visible card boundary for wipe sheets ── */
.proj-sheet-frame {
  position: sticky;
  top: 0;
  left: 0;
  display: block;
  width: 100%;
  height: calc(100vh - var(--dp-panel-h, 28px));
  margin-bottom: calc(-100vh + var(--dp-panel-h, 28px));
  z-index: 1;
  pointer-events: none;
}
.proj-sheet-frame__card {
  position: absolute;
  top: var(--cv-sheet-top, 48px);
  bottom: var(--cv-sheet-bottom, 64px);
  left: var(--wipe-side-margin, 20px);
  right: var(--wipe-side-margin, 20px);
  border: var(--wipe-card-border, 1px) solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: var(--wipe-card-radius, 14px);
  box-shadow:
    0 1px 3px var(--wipe-shadow-sm),
    0 6px 24px var(--wipe-shadow-lg);
}
html.dark .proj-sheet-frame__card {
  border-color: color-mix(in srgb, var(--glass-text) 8%, transparent);
}

/* ── Wipe overlay: real DOM element with sticky positioning ── */
.proj-wipe-overlay {
  position: sticky;
  top: 0;
  left: 0;
  display: block;
  width: 100%;
  height: calc(100vh - var(--dp-panel-h, 28px));
  margin-bottom: calc(-100vh + var(--dp-panel-h, 28px));
  z-index: 3;
  pointer-events: none;
  overflow: hidden;
}
.proj-wipe-overlay__sheet {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--glass-page-bg) 96%, transparent), color-mix(in srgb, var(--glass-page-bg) 88%, transparent)),
    linear-gradient(135deg, color-mix(in srgb, var(--glass-text) 8%, transparent), transparent 45%);
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
}

/* ── Slide transition (default) ── */
.proj-main--paged[data-cv-wipe-transition="slide"] .proj-wipe-overlay__sheet {
  transform: translate3d(0, var(--cv-wipe-from, 102%), 0);
  transition:
    transform calc(var(--cv-transition-ms, 320ms) * 0.48) cubic-bezier(.2, .7, .16, 1),
    opacity 120ms ease;
}
.proj-main--paged[data-cv-wipe-transition="slide"][data-cv-dir="next"] { --cv-wipe-from: 102%; --cv-wipe-to: -102%; }
.proj-main--paged[data-cv-wipe-transition="slide"][data-cv-dir="prev"] { --cv-wipe-from: -102%; --cv-wipe-to: 102%; }
.proj-main--paged[data-cv-wipe-transition="slide"][data-cv-phase="cover"] .proj-wipe-overlay__sheet {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}
.proj-main--paged[data-cv-wipe-transition="slide"][data-cv-phase="reveal"] .proj-wipe-overlay__sheet {
  opacity: 1;
  transform: translate3d(0, var(--cv-wipe-to, -102%), 0);
}

/* ── Fade transition ── */
.proj-main--paged[data-cv-wipe-transition="fade"] .proj-wipe-overlay__sheet {
  transform: none;
  transition: opacity calc(var(--cv-transition-ms, 320ms) * 0.48) ease;
}
.proj-main--paged[data-cv-wipe-transition="fade"][data-cv-phase="cover"] .proj-wipe-overlay__sheet {
  opacity: 1;
}
.proj-main--paged[data-cv-wipe-transition="fade"][data-cv-phase="reveal"] .proj-wipe-overlay__sheet {
  opacity: 1;
  transition: opacity calc(var(--cv-transition-ms, 320ms) * 0.52) ease;
}

/* ── Curtain transition (horizontal) ── */
.proj-main--paged[data-cv-wipe-transition="curtain"] .proj-wipe-overlay__sheet {
  transform: translate3d(var(--cv-wipe-from, 102%), 0, 0);
  transition:
    transform calc(var(--cv-transition-ms, 320ms) * 0.48) cubic-bezier(.25, .8, .25, 1),
    opacity 100ms ease;
}
.proj-main--paged[data-cv-wipe-transition="curtain"][data-cv-dir="next"] { --cv-wipe-from: 102%; --cv-wipe-to: -102%; }
.proj-main--paged[data-cv-wipe-transition="curtain"][data-cv-dir="prev"] { --cv-wipe-from: -102%; --cv-wipe-to: 102%; }
.proj-main--paged[data-cv-wipe-transition="curtain"][data-cv-phase="cover"] .proj-wipe-overlay__sheet {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}
.proj-main--paged[data-cv-wipe-transition="curtain"][data-cv-phase="reveal"] .proj-wipe-overlay__sheet {
  opacity: 1;
  transform: translate3d(var(--cv-wipe-to, -102%), 0, 0);
}

/* ── Blur transition ── */
.proj-main--paged[data-cv-wipe-transition="blur"] .proj-wipe-overlay__sheet {
  transform: none;
  backdrop-filter: blur(0px);
  background: color-mix(in srgb, var(--glass-page-bg) 70%, transparent);
  transition:
    opacity calc(var(--cv-transition-ms, 320ms) * 0.44) ease,
    backdrop-filter calc(var(--cv-transition-ms, 320ms) * 0.44) ease;
}
.proj-main--paged[data-cv-wipe-transition="blur"][data-cv-phase="cover"] .proj-wipe-overlay__sheet {
  opacity: 1;
  backdrop-filter: blur(18px);
}
.proj-main--paged[data-cv-wipe-transition="blur"][data-cv-phase="reveal"] .proj-wipe-overlay__sheet {
  opacity: 1;
  backdrop-filter: blur(18px);
  transition:
    opacity calc(var(--cv-transition-ms, 320ms) * 0.52) ease,
    backdrop-filter calc(var(--cv-transition-ms, 320ms) * 0.52) ease;
}
.proj-main-inner { /* wrapper for Transition — no extra layout effect */ }
.proj-main-inner--after-hero {
  min-height: 100vh;
  padding-bottom: max(3rem, env(safe-area-inset-bottom));
}

.proj-pager-rail {
  position: sticky;
  bottom: 14px;
  margin: 0 0 14px auto;
  width: fit-content;
  max-width: calc(100% - 24px);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: color-mix(in srgb, var(--glass-page-bg) 92%, transparent);
  backdrop-filter: blur(10px);
  z-index: 4;
}
.proj-pager-rail__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: .69rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: color-mix(in srgb, var(--glass-text) 72%, transparent);
}
.proj-pager-rail__mode {
  color: var(--glass-text);
}
.proj-pager-rail__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.proj-section-shell {
  width: 100%;
  min-width: 0;
}

/* Wipe card horizontal padding so content fits inside the card frame */
.proj-main--paged[data-cv-mode="wipe"] .proj-section-shell {
  padding-left: calc(var(--wipe-side-margin, 20px) + var(--wipe-content-padding, 20px));
  padding-right: calc(var(--wipe-side-margin, 20px) + var(--wipe-content-padding, 20px));
  padding-top: var(--wipe-content-padding, 20px);
}
.proj-main--paged[data-cv-mode="wipe"] .admin-entity-hero {
  padding-left: calc(var(--wipe-side-margin, 20px) + var(--wipe-content-padding, 20px));
  padding-right: calc(var(--wipe-side-margin, 20px) + var(--wipe-content-padding, 20px));
}

.proj-section-shell--brutalist {
  padding: clamp(18px, 2.4vw, 32px) 0 max(3rem, env(safe-area-inset-bottom));
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
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
  .proj-main--paged:not([data-cv-mode="wipe"]) {
    height: auto;
    max-height: none;
    overflow: visible;
  }
  .proj-pager-rail {
    position: static;
    margin: 12px 0 0;
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  .proj-pager-rail__actions {
    width: 100%;
    justify-content: space-between;
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

/* ── Wipe 2 mode ─────────────────────────────────────────────── */
.proj-main--paged[data-cv-mode="wipe2"] {
  /* overflow:hidden so absolute overlay clips correctly. */
  overflow: hidden;
  scrollbar-width: none;
  overscroll-behavior: none;
  /* touch-action: none is NOT set here — overlay handles its own touch */
}
.proj-main--paged[data-cv-mode="wipe2"]::-webkit-scrollbar { display: none; }

/* Keep the card-shape clip-path background for wipe2 */
.proj-main--paged[data-cv-mode="wipe2"]::before {
  clip-path: polygon(
    var(--wipe-side-margin, 20px) var(--cv-sheet-top, 48px),
    var(--wipe-side-margin, 20px) calc(100% - var(--cv-sheet-bottom, 64px)),
    calc(100% - var(--wipe-side-margin, 20px)) calc(100% - var(--cv-sheet-bottom, 64px)),
    calc(100% - var(--wipe-side-margin, 20px)) var(--cv-sheet-top, 48px),
    var(--wipe-side-margin, 20px) var(--cv-sheet-top, 48px)
  );
}

</style>
