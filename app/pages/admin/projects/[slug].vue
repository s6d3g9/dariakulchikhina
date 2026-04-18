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
import { getBriefSections } from '~~/shared/constants/brief-sections'
import { presetLabel } from '~~/shared/constants/presets'
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

function _w2FormatMoney(value: unknown) {
  const amount = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  if (!Number.isFinite(amount) || amount <= 0) return '—'
  return `${amount.toLocaleString('ru-RU')} ₽`
}

function _w2StatusTone(status: unknown): 'default' | 'accent' | 'success' | 'muted' {
  const normalized = String(status ?? '').toLowerCase()
  if (!normalized) return 'muted'
  if (['approved', 'done', 'paid', 'received', 'signed', 'issued', 'active'].includes(normalized)) return 'success'
  if (['in_work', 'sent', 'ordered', 'shipped', 'revision', 'paused'].includes(normalized)) return 'accent'
  return 'default'
}

function _w2BoolDescription(value: unknown, positive: string, negative: string) {
  return value ? positive : negative
}

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
            { label: 'Версия комплекта', value: pf.sp_version ?? '', description: 'Текущая версия планировочного пакета.', eyebrow: 'версия', tone: pf.sp_version ? 'accent' as const : 'muted' as const },
            { label: 'Статус', value: status, type: 'status' as const, description: 'Этап согласования планировочных решений.', eyebrow: 'процесс', tone: _w2StatusTone(status) },
            { label: 'Отправлено клиенту', value: pf.sp_sent_date ?? '', type: 'date' as const, description: pf.sp_sent_date ? 'Дата последней отправки комплекта.' : 'Пакет еще не отправлялся.', eyebrow: 'коммуникация', tone: pf.sp_sent_date ? 'success' as const : 'muted' as const },
            { label: 'Согласовано', value: pf.sp_approved_date ?? '', type: 'date' as const, description: pf.sp_approved_date ? 'Клиент подтвердил текущую версию.' : 'Ожидается согласование.', eyebrow: 'решение клиента', tone: pf.sp_approved_date ? 'success' as const : 'muted' as const },
            { label: 'Комментарий архитектора', value: pf.sp_architect_notes ?? '', type: 'multiline' as const, description: 'Внутренние пояснения по логике планировки.', eyebrow: 'архитектор', tone: pf.sp_architect_notes ? 'default' as const : 'muted' as const },
            { label: 'Замечания клиента', value: pf.sp_client_notes ?? '', type: 'multiline' as const, description: 'Фидбек по сценарию жизни и составу помещений.', eyebrow: 'обратная связь', tone: pf.sp_client_notes ? 'accent' as const : 'muted' as const },
          ],
        },
        {
          title: 'Согласование',
          fields: [
            { label: 'Размеры проверены', value: !!pf.sp_dimensions_checked, type: 'boolean' as const, description: _w2BoolDescription(pf.sp_dimensions_checked, 'Ключевые размеры проверены на объекте.', 'Проверка размеров еще не завершена.'), eyebrow: 'контроль', tone: pf.sp_dimensions_checked ? 'success' as const : 'muted' as const },
            { label: 'Зонирование согласовано', value: !!pf.sp_zones_approved, type: 'boolean' as const, description: _w2BoolDescription(pf.sp_zones_approved, 'Клиент утвердил функциональные зоны.', 'Зонирование пока в обсуждении.'), eyebrow: 'сценарий', tone: pf.sp_zones_approved ? 'success' as const : 'accent' as const },
            { label: 'Геометрия заморожена', value: !!pf.sp_geometry_locked, type: 'boolean' as const, description: _w2BoolDescription(pf.sp_geometry_locked, 'Планировку можно брать в дальнейшую разработку.', 'Геометрия еще может меняться.'), eyebrow: 'фиксация', tone: pf.sp_geometry_locked ? 'success' as const : 'muted' as const },
          ],
        },
        ...(files.length ? [{
          title: 'Файлы планировок',
          fields: files.map((f: any) => ({
            label: f.label || f.filename || 'файл',
            value: f.approval ? (_W2_SP_LABELS[f.approval] ?? f.approval) : 'на рассмотрении',
            type: 'status' as const,
            description: f.filename || 'Файл приложен к текущей версии планировки.',
            caption: f.updatedAt || f.createdAt || '',
            eyebrow: 'файл комплекта',
            badge: f.ext || 'plan',
            tone: _w2StatusTone(f.approval),
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
            { label: 'Название', value: p.title, description: 'Рабочее имя проекта в админке и кабинетах.', eyebrow: 'identity', badge: p.slug, tone: 'accent' as const, span: 2 as const },
            { label: 'Тип объекта', value: presetLabel(p.projectType ?? ''), description: 'Определяет шаблоны страниц и brief-секции.', eyebrow: 'preset', tone: 'default' as const },
            { label: 'Статус', value: statusLabels[p.status] ?? p.status, type: 'status' as const, description: 'Текущий жизненный цикл проекта.', eyebrow: 'pipeline', tone: _w2StatusTone(p.status) },
            { label: 'Slug', value: p.slug, description: 'Используется в ссылках и маршрутах кабинета.', eyebrow: 'route', tone: 'muted' as const },
            { label: 'Разделов', value: String((p.pages ?? []).length), type: 'number' as const, description: 'Сколько страниц подключено в проекте.', eyebrow: 'structure', tone: 'success' as const },
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
              description: linkedClients.value.length ? `Привязано клиентов: ${linkedClients.value.length}.` : 'Для клиентского кабинета нужен хотя бы один клиент.',
              eyebrow: 'client side',
              badge: linkedClients.value.length ? String(linkedClients.value.length) : '0',
              tone: linkedClients.value.length ? 'success' as const : 'muted' as const,
              span: 2 as const,
            },
            {
              label: 'Подрядчики',
              value: linkedContractorsList.value.length
                ? linkedContractorsList.value.map((c: any) => c.name).join(', ')
                : 'не привязаны',
              description: linkedContractorsList.value.length ? `В работе ${linkedContractorsList.value.length} подрядчиков.` : 'Подрядчики пока не назначены.',
              eyebrow: 'delivery',
              badge: linkedContractorsList.value.length ? String(linkedContractorsList.value.length) : '0',
              tone: linkedContractorsList.value.length ? 'accent' as const : 'muted' as const,
              span: 2 as const,
            },
            {
              label: 'Дизайнеры',
              value: linkedDesignersList.value.length
                ? linkedDesignersList.value.map((d: any) => d.name).join(', ')
                : 'не привязаны',
              description: linkedDesignersList.value.length ? `Ответственных дизайнеров: ${linkedDesignersList.value.length}.` : 'Команда дизайна еще не указана.',
              eyebrow: 'creative team',
              badge: linkedDesignersList.value.length ? String(linkedDesignersList.value.length) : '0',
              tone: linkedDesignersList.value.length ? 'success' as const : 'muted' as const,
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
            { label: 'Позиций', value: String(items.length), type: 'number' as const, description: 'Всего строк в закупочном листе.', eyebrow: 'масштаб', tone: items.length ? 'success' as const : 'muted' as const },
            { label: 'Ожидание', value: String(pending), type: 'number' as const, description: 'Позиции без размещенного заказа.', eyebrow: 'backlog', tone: pending ? 'accent' as const : 'muted' as const },
            { label: 'Заказано', value: String(ordered), type: 'number' as const, description: 'Уже отправлено поставщикам.', eyebrow: 'execution', tone: ordered ? 'success' as const : 'muted' as const },
            { label: 'Получено', value: String(received), type: 'number' as const, description: 'Фактически закрытые поставки.', eyebrow: 'receipt', tone: received ? 'success' as const : 'muted' as const },
            { label: 'Сумма', value: _w2FormatMoney(total), description: 'Оценка бюджета по всем позициям списка.', eyebrow: 'budget', tone: total > 0 ? 'accent' as const : 'muted' as const, span: 2 as const },
          ],
        },
        ...(items.slice(0, 12).map((item: any) => ({
          title: item.name || 'позиция',
          fields: [
            { label: 'Статус', value: item.status ?? '', type: 'status' as const, description: item.vendor ? `Поставщик: ${item.vendor}.` : 'Поставщик еще не указан.', eyebrow: 'logistics', badge: item.vendor || 'vendor', tone: _w2StatusTone(item.status) },
            { label: 'Кол-во', value: item.quantity ? `${item.quantity} ${item.unit ?? ''}`.trim() : '—', description: 'Планируемый объем закупки.', eyebrow: 'quantity', tone: item.quantity ? 'default' as const : 'muted' as const },
            { label: 'Цена', value: _w2FormatMoney(item.unitPrice), description: item.quantity && item.unitPrice ? `Сумма строки: ${_w2FormatMoney((parseFloat(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0))}.` : 'Цена еще не заполнена.', eyebrow: 'unit price', tone: item.unitPrice ? 'accent' as const : 'muted' as const },
            { label: 'Заметки', value: item.notes ?? '', type: 'multiline' as const, description: 'Комментарий по артикулу, замене или срокам.', eyebrow: 'details', tone: item.notes ? 'default' as const : 'muted' as const },
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
            { label: 'Услуг', value: String(svcs.length), type: 'number' as const, description: 'Всего дополнительных позиций сверх основного договора.', eyebrow: 'объем', tone: svcs.length ? 'success' as const : 'muted' as const },
            { label: 'Оплачено', value: String(paid), type: 'number' as const, description: 'Позиции с подтвержденной оплатой.', eyebrow: 'cashflow', tone: paid ? 'success' as const : 'muted' as const },
            { label: 'Согласовано', value: String(approved), type: 'number' as const, description: 'Услуги, которые клиент уже одобрил.', eyebrow: 'approval', tone: approved ? 'accent' as const : 'muted' as const },
            { label: 'Сумма', value: _w2FormatMoney(totalCost), description: 'Сумма всех дополнительных услуг.', eyebrow: 'budget', tone: totalCost > 0 ? 'accent' as const : 'muted' as const },
          ],
        },
        ...(svcs.slice(0, 10).map((svc: any) => ({
          title: svc.title || svc.serviceKey || 'услуга',
          fields: [
            { label: 'Статус', value: svc.status ?? '', type: 'status' as const, description: svc.serviceKey ? `Ключ услуги: ${svc.serviceKey}.` : 'Дополнительная услуга проекта.', eyebrow: 'workflow', badge: svc.serviceKey || 'extra', tone: _w2StatusTone(svc.status) },
            { label: 'Кол-во', value: svc.quantity ? `${svc.quantity} ${svc.unit ?? ''}`.trim() : '—', description: 'Объем согласованной услуги.', eyebrow: 'scope', tone: svc.quantity ? 'default' as const : 'muted' as const },
            { label: 'Цена', value: _w2FormatMoney(svc.unitPrice), description: svc.quantity && svc.unitPrice ? `Итог по позиции: ${_w2FormatMoney((parseFloat(svc.quantity) || 1) * (parseFloat(svc.unitPrice) || 0))}.` : 'Стоимость еще не зафиксирована.', eyebrow: 'стоимость', tone: svc.unitPrice ? 'accent' as const : 'muted' as const },
            { label: 'Описание', value: svc.description ?? '', type: 'multiline' as const, description: 'Что именно входит в дополнительную услугу.', eyebrow: 'value', tone: svc.description ? 'default' as const : 'muted' as const },
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
