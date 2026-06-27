<template>
  <div class="cab-embed" v-if="designerId">
    <div v-if="pending && !designer" class="ent-page-skeleton">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 6" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    </div>

    <main
      v-else-if="designer"
      ref="viewportRef"
      class="cab-main"
      :class="{ 'cv-viewport--paged': isPaged }"
      :tabindex="isPaged ? 0 : undefined"
      @wheel="handleWheel"
      @keydown="handleKeydown"
      @scroll="syncPager"
    >
        <div v-show="!isWipe2Mode" class="cab-inner cv-wipe-inner" :class="{ 'cab-inner--ribbon': showAll }">

          <!-- ═══════════════ DASHBOARD ═══════════════ -->
          <template v-if="(section === 'dashboard') || showAll">
            <div class="cab-section" data-section="dashboard">
            <section v-if="showBrutalistDashboardHero" class="ds-cab-hero">
              <div class="ds-cab-hero-topline">дизайнерский кабинет</div>
              <div class="ds-cab-hero-grid">
                <div class="ds-cab-hero-main">
                  <div class="ds-cab-hero-avatar">{{ designer?.name?.charAt(0)?.toUpperCase() || '◑' }}</div>
                  <div class="ds-cab-hero-copy">
                    <h2 class="ds-cab-hero-title">{{ designer?.name }}</h2>
                    <p class="ds-cab-hero-subtitle">{{ designerHeroSubtitle }}</p>
                  </div>
                </div>
                <div class="ds-cab-hero-facts">
                  <div v-for="fact in designerDashboardFacts" :key="fact.label" class="ds-cab-hero-fact">
                    <span class="ds-cab-hero-fact-label">{{ fact.label }}</span>
                    <span class="ds-cab-hero-fact-value">{{ fact.value }}</span>
                  </div>
                </div>
              </div>
            </section>

            <div v-if="!showBrutalistDashboardHero" class="dash-welcome glass-surface">
              <div class="dash-welcome-left">
                <div class="dash-avatar">{{ designer?.name?.charAt(0)?.toUpperCase() || '◑' }}</div>
                <div>
                  <div class="dash-welcome-name">{{ designer?.name }}</div>
                  <div class="dash-welcome-role">
                    Дизайнер интерьеров
                    <span v-if="designer?.city"> · {{ designer.city }}</span>
                  </div>
                </div>
              </div>
              <div class="dash-profile-progress">
                <div class="dash-profile-pct-ring" :style="{ '--pct': profilePct }">
                  <span class="dash-profile-pct-val">{{ profilePct }}%</span>
                </div>
                <div class="dash-profile-progress-info">
                  <span class="dash-profile-progress-label">Профиль заполнен</span>
                  <button v-if="profilePct < 100" class="dash-profile-fill-btn" @click="section = 'profile'">Заполнить →</button>
                </div>
              </div>
            </div>

            <div class="dash-quick-nav" :class="{ 'dash-quick-nav--brutalist': isBrutalistDesignerCabinetMode }" v-show="!showAll">
              <button class="dash-quick-btn glass-surface" :class="{ 'dash-quick-btn--brutalist': isBrutalistDesignerCabinetMode }" @click="section = 'services'">
                <span class="dash-quick-icon">◎</span>
                <span class="dash-quick-label">Услуги и цены</span>
                <span v-if="services.length" class="dash-quick-badge">{{ services.length }}</span>
              </button>
              <button class="dash-quick-btn glass-surface" :class="{ 'dash-quick-btn--brutalist': isBrutalistDesignerCabinetMode }" @click="section = 'packages'">
                <span class="dash-quick-icon">◑</span>
                <span class="dash-quick-label">Пакеты</span>
                <span v-if="packages.length" class="dash-quick-badge">{{ packages.length }}</span>
              </button>
              <button class="dash-quick-btn glass-surface" :class="{ 'dash-quick-btn--brutalist': isBrutalistDesignerCabinetMode }" @click="section = 'subscriptions'">
                <span class="dash-quick-icon">⟳</span>
                <span class="dash-quick-label">Подписки</span>
                <span v-if="subscriptions.length" class="dash-quick-badge">{{ subscriptions.length }}</span>
              </button>
              <button class="dash-quick-btn glass-surface" :class="{ 'dash-quick-btn--brutalist': isBrutalistDesignerCabinetMode }" @click="section = 'projects'">
                <span class="dash-quick-icon">◒</span>
                <span class="dash-quick-label">Проекты</span>
                <span v-if="designerProjects.length" class="dash-quick-badge">{{ designerProjects.length }}</span>
              </button>
              <button class="dash-quick-btn glass-surface" :class="{ 'dash-quick-btn--brutalist': isBrutalistDesignerCabinetMode }" @click="section = 'profile'">
                <span class="dash-quick-icon">◓</span>
                <span class="dash-quick-label">Профиль</span>
              </button>
            </div>

            <div class="dash-stats" :class="{ 'dash-stats--brutalist': isBrutalistDesignerCabinetMode }">
              <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalistDesignerCabinetMode }">
                <div class="dash-stat-val">{{ dashStats.active }}</div>
                <div class="dash-stat-label">Активных проектов</div>
              </div>
              <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalistDesignerCabinetMode }">
                <div class="dash-stat-val">{{ uniqueClients.length }}</div>
                <div class="dash-stat-label">Клиентов</div>
              </div>
              <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalistDesignerCabinetMode }">
                <div class="dash-stat-val">{{ uniqueContractors.length }}</div>
                <div class="dash-stat-label">Подрядчиков</div>
              </div>
              <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalistDesignerCabinetMode }">
                <div class="dash-stat-val">{{ linkedData?.sellers?.length || 0 }}</div>
                <div class="dash-stat-label">Поставщиков</div>
              </div>
              <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalistDesignerCabinetMode }">
                <div class="dash-stat-val">{{ dashStats.totalRevenue.toLocaleString('ru-RU') }} ₽</div>
                <div class="dash-stat-label">Общая выручка</div>
              </div>
              <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalistDesignerCabinetMode }">
                <div class="dash-stat-val">{{ dashStats.total ? Math.round(dashStats.totalRevenue / dashStats.total).toLocaleString('ru-RU') : 0 }} ₽</div>
                <div class="dash-stat-label">Ср. стоимость проекта</div>
              </div>
              <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalistDesignerCabinetMode }">
                <div class="dash-stat-val">{{ services.length }}</div>
                <div class="dash-stat-label">Услуг настроено</div>
              </div>
              <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalistDesignerCabinetMode }">
                <div class="dash-stat-val">{{ packages.length }}</div>
                <div class="dash-stat-label">Пакетов</div>
              </div>
            </div>

            <div v-if="!services.length" class="cab-cta glass-surface" :class="{ 'cab-cta--brutalist': isBrutalistDesignerCabinetMode }">
              <div class="cab-cta-icon">💡</div>
              <div>
                <strong>Начните с настройки прайс-листа</strong><br>
                Добавьте свои услуги, пакеты и подписки, чтобы генерировать проекты с автоматическим роадмепом.
              </div>
              <button class="cab-cta-btn" @click="initFromTemplates">Загрузить шаблон цен (Москва)</button>
            </div>

            <div v-if="designerProjects.length" class="dash-projects glass-surface" :class="{ 'dash-projects--brutalist': isBrutalistDesignerCabinetMode }">
              <div class="u-section-title">Последние проекты</div>
              <div class="dash-projects-grid">
                <NuxtLink v-for="dp in designerProjects.slice(0, 6)" :key="dp.id"
                  :to="dp.projectSlug ? `/admin/projects/${dp.projectSlug}` : undefined"
                  class="dash-project-card" :class="{ 'dash-project-card--link': dp.projectSlug, 'dash-project-card--brutalist': isBrutalistDesignerCabinetMode }">
                  <span class="dash-project-name">{{ dp.projectTitle }}</span>
                  <span class="dash-project-status u-status" :class="`u-status--${dp.status}`">
                    {{ DESIGNER_PROJECT_STATUS_LABELS[dp.status as keyof typeof DESIGNER_PROJECT_STATUS_LABELS] || dp.status }}
                  </span>
                  <span v-if="dp.totalPrice" class="dash-project-price">{{ dp.totalPrice.toLocaleString('ru-RU') }} ₽</span>
                  <span v-if="dp.area" class="dash-project-area">{{ dp.area }} м²</span>
                </NuxtLink>
              </div>
            </div>
            </div>
          </template>

          <!-- ═══════════════ SERVICES & PRICING ═══════════════ -->
          <template v-if="(section === 'services') || showAll">
            <div class="cab-section" data-section="services">
            <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalistDesignerCabinetMode }">
              <h2>Услуги и прайс-лист</h2>
              <div class="cab-section-actions">
                <GlassButton variant="primary" v-if="!services.length"  @click="initFromTemplates">
                  Загрузить шаблон (Москва)
                </GlassButton>
                <GlassButton variant="secondary" density="compact"  :disabled="serviceCardSaving" @click="openServiceCatalog('create')">＋ Из каталога</GlassButton>
                <GlassButton variant="secondary" density="compact"  :disabled="serviceCardSaving" @click="createServiceCard">＋ Своя услуга</GlassButton>
                <span class="cab-section-note">Изменения сохраняются автоматически</span>
              </div>
            </div>
            <p v-if="svcEditError" class="cab-inline-error">{{ svcEditError }}</p>
            <p v-if="svcEditSuccess" class="cab-inline-success">{{ svcEditSuccess }}</p>

            <Transition name="svc-catalog-pop">
            <div v-if="serviceCatalogOpen" class="svc-catalog glass-surface" :class="{ 'svc-catalog--brutalist': isBrutalistDesignerCabinetMode }">
              <div class="svc-catalog__head">
                <div>
                  <div class="svc-card-editor__eyebrow">каталог услуг</div>
                  <strong class="svc-card-editor__title">{{ serviceCatalogMode === 'create' ? 'Добавить типовую услугу в прайс' : 'Заменить услугу из каталога' }}</strong>
                </div>
                <div class="svc-catalog__head-actions">
                  <span class="svc-catalog__count">{{ filteredServiceCatalogEntries.length }} из {{ DESIGNER_SERVICE_TEMPLATES.length }}</span>
                  <GlassButton variant="secondary" density="compact" type="button"  @click="closeServiceCatalog">закрыть</GlassButton>
                </div>
              </div>
              <p class="svc-catalog__note">{{ serviceCatalogMode === 'create' ? 'Сначала добавьте услугу из каталога, потом настройте свою цену и срок. Пакеты будут использовать уже отредактированные значения.' : 'Выберите другую типовую услугу. После замены можно сразу скорректировать цену, описание, срок и категорию под конкретного дизайнера.' }}</p>
              <div v-if="serviceCatalogMode === 'replace' && serviceCatalogTargetUsage.total" class="svc-catalog__warning glass-surface" :class="{ 'svc-catalog__warning--brutalist': isBrutalistDesignerCabinetMode }">
                <strong>Услуга уже используется в пакетах или подписках</strong>
                <span>{{ formatServiceUsageHint(serviceCatalogTargetUsage) }}</span>
              </div>
              <div class="svc-catalog-toolbar">
                <div class="u-field svc-catalog-toolbar__search">
                  <label class="u-field__label">Поиск по услугам</label>
                  <GlassInput v-model="serviceCatalogSearch"  placeholder="Название, описание, категория" />
                </div>
                <div class="svc-catalog-toolbar__filters">
                  <button
                    type="button"
                    class="pkg-tag-picker"
                    :class="{ 'pkg-tag-picker--active': serviceCatalogCategory === 'all' }"
                    @click="serviceCatalogCategory = 'all'"
                  >Все категории</button>
                  <button
                    v-for="option in SERVICE_CATEGORY_OPTIONS"
                    :key="`svc-catalog-filter-${option.value}`"
                    type="button"
                    class="pkg-tag-picker"
                    :class="{ 'pkg-tag-picker--active': serviceCatalogCategory === option.value }"
                    @click="serviceCatalogCategory = option.value"
                  >{{ option.label }}</button>
                </div>
              </div>
              <div v-if="filteredServiceCatalogEntries.length" class="svc-catalog__results">
                <button
                  v-for="entry in filteredServiceCatalogEntries"
                  :key="`svc-catalog-${entry.key}`"
                  type="button"
                  class="svc-catalog-row"
                  :class="{ 'svc-catalog-row--brutalist': isBrutalistDesignerCabinetMode }"
                  @click="selectServiceCatalogEntry(entry.key)"
                >
                  <div class="svc-catalog-row__main">
                    <div class="svc-catalog-row__head">
                      <strong class="svc-catalog-row__title">{{ entry.title }}</strong>
                      <span class="svc-catalog-row__price">{{ entry.price }}</span>
                    </div>
                    <p class="svc-catalog-row__desc">{{ entry.description }}</p>
                    <div class="svc-catalog-row__meta">
                      <span class="svc-catalog-row__tag">{{ entry.category }}</span>
                      <span class="svc-catalog-row__tag">рынок: {{ entry.priceRange }}</span>
                    </div>
                  </div>
                  <span class="svc-catalog-row__action">{{ serviceCatalogMode === 'create' ? '[+ В ПРАЙС]' : '[ ВЫБРАТЬ ]' }}</span>
                </button>
              </div>
              <div v-else class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalistDesignerCabinetMode }">
                <span>{{ serviceCatalogMode === 'create' ? '[ КАТАЛОГ УЖЕ ПОДКЛЮЧЁН ]' : '[ НЕТ УСЛУГ ПОД ФИЛЬТР ]' }}</span>
                <p>{{ serviceCatalogMode === 'create' ? 'Все типовые услуги уже добавлены в прайс. Можно редактировать цены, сроки или создавать свои позиции.' : 'Смените поиск или категорию. Занятые шаблоны уже закреплены за другими услугами этого дизайнера.' }}</p>
              </div>
            </div>
            </Transition>

            <div v-if="!services.length" class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalistDesignerCabinetMode }">
              <span>◎</span>
              <p>Услуги не настроены.<br>Загрузите шаблон московских расценок или добавьте вручную.</p>
            </div>

            <template v-if="services.length">
              <div v-for="[cat, catServices] in servicesByCat" :key="cat" class="svc-category glass-surface" :class="{ 'svc-category--brutalist': isBrutalistDesignerCabinetMode }">
                <div class="svc-cat-head">
                  <div class="svc-cat-copy">
                    <span class="svc-cat-eyebrow">категория</span>
                    <h3 class="svc-cat-title">{{ DESIGNER_SERVICE_CATEGORY_LABELS[cat] || cat }}</h3>
                  </div>
                  <div class="svc-cat-stats">
                    <span class="svc-cat-stat">{{ getServiceCountLabel(catServices.length) }}</span>
                    <span class="svc-cat-stat">{{ getCategoryActiveLabel(catServices) }}</span>
                    <span v-if="getCategoryStartingPrice(catServices)" class="svc-cat-stat svc-cat-stat--accent">
                      от {{ getCategoryStartingPrice(catServices) }}
                    </span>
                  </div>
                </div>
                <div class="svc-list svc-list--cards">
                  <div v-for="svc in catServices" :key="getServiceActionKey(svc)" class="svc-card-stack">
                  <article
                    class="svc-card"
                    :class="{ disabled: !svc.enabled, 'svc-card--brutalist': isBrutalistDesignerCabinetMode, 'svc-card--active': serviceCardEditorKey === getServiceActionKey(svc) }"
                    role="button"
                    tabindex="0"
                    @click="toggleServiceCardEditor(svc)"
                    @keyup.enter.prevent="toggleServiceCardEditor(svc)"
                    @keyup.space.prevent="toggleServiceCardEditor(svc)"
                  >
                    <div class="svc-card-topline">
                      <span class="svc-state-badge" :class="{ 'svc-state-badge--muted': !svc.enabled }">
                        {{ svc.enabled ? 'В продаже' : 'Скрыта' }}
                      </span>
                      <span class="svc-unit-chip">{{ getPriceUnitLabel(svc.unit) }}</span>
                    </div>
                    <div class="svc-card-body">
                      <h4 class="svc-name">{{ getServiceDisplayTitle(svc) }}</h4>
                      <p class="svc-desc">{{ getServiceDisplayDescription(svc) || 'Добавьте описание, чтобы карточка объясняла состав и ценность услуги.' }}</p>
                    </div>
                    <div class="svc-card-meta">
                      <span class="svc-meta-chip">{{ getServiceMarketLabel(svc) }}</span>
                      <span class="svc-meta-chip">{{ getServiceOriginLabel(svc) }}</span>
                      <span class="svc-meta-chip">{{ getServiceLeadTimeLabel(svc) }}</span>
                    </div>
                    <div class="svc-card-foot">
                      <div class="svc-price-block">
                        <span class="svc-price-caption">текущий тариф</span>
                        <div class="svc-price svc-price-inline" @click.stop="startInlinePrice(svc)">
                          <template v-if="inlinePriceKey === getServiceActionKey(svc)">
                            <GlassInput
                              v-model.number="inlinePriceVal"
                              class="glass-input --inline svc-price-inline-input"
                              type="number"
                              min="0"
                              @blur="commitInlinePrice(svc)"
                              @keyup.enter="commitInlinePrice(svc)"
                              @keyup.escape="cancelInlinePrice"
                              @click.stop
                            />
                          </template>
                          <template v-else>
                            {{ formatServicePrice(svc.price, svc.unit) }}
                            <span class="svc-price-edit-icon">✎</span>
                          </template>
                        </div>
                      </div>
                    </div>
                  </article>
                  <div v-if="serviceCardEditorKey === getServiceActionKey(svc) && serviceCardDraft" class="svc-card-editor glass-surface" :class="{ 'svc-card-editor--brutalist': isBrutalistDesignerCabinetMode }">
                    <div class="svc-card-editor__head">
                      <div>
                        <div class="svc-card-editor__eyebrow">редактор услуги</div>
                        <strong class="svc-card-editor__title">{{ getServiceDisplayTitle(serviceCardDraft) }}</strong>
                      </div>
                      <div class="svc-card-editor__actions">
                        <span class="cab-autosave-status" :class="autosaveStatusClass(serviceCardSaveState)">{{ autosaveStatusLabel(serviceCardSaveState) }}</span>
                        <GlassButton variant="secondary" density="compact" type="button"  :disabled="serviceCardSaving" @click="duplicateServiceCard(svc)">дублировать</GlassButton>
                        <GlassButton variant="secondary" density="compact" type="button"  :disabled="serviceCardSaving" @click="moveServiceCard(svc, -1)">выше</GlassButton>
                        <GlassButton variant="secondary" density="compact" type="button"  :disabled="serviceCardSaving" @click="moveServiceCard(svc, 1)">ниже</GlassButton>
                        <GlassButton variant="danger" density="compact" type="button"  :disabled="serviceCardSaving" @click="removeServiceCard(svc)">удалить</GlassButton>
                        <GlassButton variant="secondary" density="compact" type="button"  @click="closeServiceCardEditor">свернуть</GlassButton>
                      </div>
                    </div>
                    <p v-if="serviceCardError" class="cab-inline-error">{{ serviceCardError }}</p>
                    <div class="svc-card-editor__grid">
                      <div class="u-field u-field--full">
                        <label class="u-field__label">Типовая услуга</label>
                        <div class="svc-template-switch glass-surface" :class="{ 'svc-template-switch--brutalist': isBrutalistDesignerCabinetMode }">
                          <div class="svc-template-switch__copy">
                            <strong>{{ getServiceTemplateLabel(serviceCardDraft) }}</strong>
                            <span>{{ getServiceTemplateHint(serviceCardDraft) }}</span>
                          </div>
                          <GlassButton variant="secondary" density="compact" type="button"  :disabled="serviceCardSaving" @click="openServiceCatalog('replace', svc)">выбрать из каталога</GlassButton>
                        </div>
                        <p v-if="serviceEditorUsage.total" class="svc-template-switch__warning">{{ formatServiceUsageHint(serviceEditorUsage) }}</p>
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Название</label>
                        <GlassInput v-model="serviceCardDraft.title"  placeholder="Название услуги" @blur="queueServiceCardSave" />
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Категория</label>
                        <select v-model="serviceCardDraft.category" class="glass-input" @change="queueServiceCardSave">
                          <option v-for="opt in SERVICE_CATEGORY_OPTIONS" :key="`svc-inline-${opt.value}`" :value="opt.value">{{ opt.label }}</option>
                        </select>
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Цена</label>
                        <GlassInput v-model.number="serviceCardDraft.price" type="number" min="0"  @blur="queueServiceCardSave" />
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Единица</label>
                        <select v-model="serviceCardDraft.unit" class="glass-input" @change="queueServiceCardSave">
                          <option v-for="unit in PRICE_UNITS_LIST" :key="`svc-inline-unit-${unit.value}`" :value="unit.value">{{ unit.label }}</option>
                        </select>
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Срок, дней</label>
                        <GlassInput v-model.number="serviceCardDraft.leadTimeDays" type="number" min="0"  @blur="queueServiceCardSave" />
                      </div>
                      <div class="u-field u-field--full">
                        <label class="u-field__label">Описание</label>
                        <textarea v-model="serviceCardDraft.description" class="glass-input u-ta" rows="3" placeholder="Что входит в услугу" @blur="queueServiceCardSave" />
                      </div>
                    </div>
                    <label class="svc-enable svc-enable--editor">
                      <input v-model="serviceCardDraft.enabled" type="checkbox" @change="queueServiceCardSave" />
                      <span>{{ serviceCardDraft.enabled ? 'услуга активна в продаже' : 'услуга скрыта из выдачи' }}</span>
                    </label>
                  </div>
                  </div>
                </div>
              </div>
            </template>
            </div>
          </template>

          <!-- ═══════════════ PACKAGES ═══════════════ -->
          <template v-if="(section === 'packages') || showAll">
            <div class="cab-section" data-section="packages">
            <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalistDesignerCabinetMode }">
              <h2>Пакеты услуг</h2>
              <div class="cab-section-actions">
                <GlassButton variant="primary" v-if="!packages.length"  @click="initPackages">
                  Загрузить стандартные пакеты
                </GlassButton>
                <GlassButton variant="secondary" density="compact"  :disabled="packageCardSaving" @click="createPackageCard">＋ Пакет</GlassButton>
                <span class="cab-section-note">Изменения сохраняются автоматически</span>
              </div>
            </div>
            <p v-if="pkgEditError" class="cab-inline-error">{{ pkgEditError }}</p>
            <p v-if="pkgEditSuccess" class="cab-inline-success">{{ pkgEditSuccess }}</p>

            <div v-if="!packages.length" class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalistDesignerCabinetMode }">
              <span>◑</span>
              <p>Пакеты не настроены.<br>Загрузите стандартные или создайте собственные.</p>
            </div>

            <template v-if="packages.length">
              <div class="pkg-grid" :class="{ 'pkg-grid--brutalist': isBrutalistDesignerCabinetMode }">
                <div v-for="pkg in packages" :key="getPackageActionKey(pkg)" class="pkg-card-stack">
                <article
                  class="pkg-card glass-surface"
                  :class="{ disabled: !pkg.enabled, 'pkg-card--brutalist': isBrutalistDesignerCabinetMode, 'pkg-card--active': packageCardEditorKey === getPackageActionKey(pkg) }"
                  role="button"
                  tabindex="0"
                  @click="togglePackageCardEditor(pkg)"
                  @keyup.enter.prevent="togglePackageCardEditor(pkg)"
                  @keyup.space.prevent="togglePackageCardEditor(pkg)"
                >
                  <div class="pkg-card-topline">
                    <span class="pkg-state-badge" :class="{ 'pkg-state-badge--muted': !pkg.enabled }">
                      {{ pkg.enabled ? 'Готов к продаже' : 'Черновик' }}
                    </span>
                    <span class="pkg-service-count">{{ getServiceCountLabel((pkg.serviceKeys || []).length) }}</span>
                  </div>
                  <div class="pkg-card-head">
                    <div>
                      <h3 class="pkg-card-title">{{ getPackageDisplayTitle(pkg) }}</h3>
                      <p class="pkg-card-subtitle">{{ getPackageCoverageLabel(pkg) }}</p>
                    </div>
                    <div class="pkg-card-price">{{ formatRubles(pkg.pricePerSqm ?? 0) }} <span>₽/м²</span></div>
                  </div>
                  <p class="pkg-card-desc">{{ getPackageDisplayDescription(pkg) }}</p>
                  <div class="pkg-card-metrics">
                    <div class="pkg-metric glass-surface">
                      <span class="pkg-metric-label">80 м²</span>
                      <strong>{{ getPackageExamplePrice(pkg, 80) }}</strong>
                    </div>
                    <div class="pkg-metric glass-surface">
                      <span class="pkg-metric-label">120 м²</span>
                      <strong>{{ getPackageExamplePrice(pkg, 120) }}</strong>
                    </div>
                  </div>
                  <div class="pkg-card-services">
                    <span v-for="sk in getPackageVisibleServiceKeys(pkg)" :key="sk" class="pkg-svc-chip">
                      {{ getServiceTitle(sk) }}
                    </span>
                    <span v-if="getPackageHiddenServiceCount(pkg) > 0" class="pkg-svc-chip pkg-svc-chip--more">
                      +{{ getPackageHiddenServiceCount(pkg) }} ещё
                    </span>
                  </div>
                  <div class="pkg-card-notes">
                    <p class="pkg-card-note">{{ getPackageCategoryLabel(pkg) }}</p>
                    <p class="pkg-card-note">{{ getPackageLeadTimeLabel(pkg) }}</p>
                    <p class="pkg-card-note">{{ getPackageBudgetLabel(pkg) }}</p>
                  </div>
                </article>
                <div v-if="packageCardEditorKey === getPackageActionKey(pkg) && packageCardDraft" class="pkg-card-editor glass-surface" :class="{ 'pkg-card-editor--brutalist': isBrutalistDesignerCabinetMode }">
                  <div class="pkg-card-editor__head">
                    <div>
                      <div class="svc-card-editor__eyebrow">редактор пакета</div>
                      <strong class="svc-card-editor__title">{{ getPackageDisplayTitle(packageCardDraft) }}</strong>
                    </div>
                    <div class="svc-card-editor__actions">
                      <span class="cab-autosave-status" :class="autosaveStatusClass(packageCardSaveState)">{{ autosaveStatusLabel(packageCardSaveState) }}</span>
                      <GlassButton variant="secondary" density="compact" type="button"  :disabled="packageCardSaving" @click="duplicatePackageCard(pkg)">дублировать</GlassButton>
                      <GlassButton variant="secondary" density="compact" type="button"  :disabled="packageCardSaving" @click="movePackageCard(pkg, -1)">выше</GlassButton>
                      <GlassButton variant="secondary" density="compact" type="button"  :disabled="packageCardSaving" @click="movePackageCard(pkg, 1)">ниже</GlassButton>
                      <GlassButton variant="danger" density="compact" type="button"  :disabled="packageCardSaving" @click="removePackageCard(pkg)">удалить</GlassButton>
                      <GlassButton variant="secondary" density="compact" type="button"  @click="closePackageCardEditor">свернуть</GlassButton>
                    </div>
                  </div>
                  <p v-if="packageCardError" class="cab-inline-error">{{ packageCardError }}</p>
                  <p v-if="packageEditorUsage.total" class="svc-template-switch__warning">{{ formatPackageUsageHint(packageEditorUsage) }}</p>
                  <div class="svc-card-editor__grid">
                    <div class="u-field">
                      <label class="u-field__label">Название пакета</label>
                        <GlassInput v-model="packageCardDraft.title"  placeholder="Название пакета" @blur="queuePackageCardSave" />
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Цена за м²</label>
                        <GlassInput v-model.number="packageCardDraft.pricePerSqm" type="number" min="0"  @blur="queuePackageCardSave" />
                    </div>
                    <div class="u-field u-field--full">
                      <label class="u-field__label">Описание</label>
                        <textarea v-model="packageCardDraft.description" class="glass-input u-ta" rows="3" placeholder="Что входит в пакет" @blur="queuePackageCardSave" />
                    </div>
                  </div>
                  <label class="svc-enable svc-enable--editor">
                    <input v-model="packageCardDraft.enabled" type="checkbox" @change="queuePackageCardSave" />
                    <span>{{ packageCardDraft.enabled ? 'пакет доступен клиентам' : 'пакет скрыт из выдачи' }}</span>
                  </label>
                  <div class="pkg-card-editor__services">
                    <div class="pkg-card-editor__services-head">
                      <strong>Состав пакета</strong>
                      <span>{{ getServiceCountLabel((packageCardDraft.serviceKeys || []).length) }}</span>
                    </div>
                    <p class="pkg-card-editor__summary">{{ getDraftServiceBundleSummary(packageCardDraft.serviceKeys || []) }}</p>
                    <div class="pkg-service-picker-list">
                      <button
                        v-for="svcOption in allServiceOptions"
                        :key="`pkg-inline-${packageCardDraft.key}-${svcOption.key}`"
                        type="button"
                        class="pkg-service-picker"
                        :class="{ 'pkg-service-picker--active': (packageCardDraft.serviceKeys || []).includes(svcOption.key) }"
                        @click="togglePackageCardDraftService(svcOption.key); queuePackageCardSave()"
                      >
                        <div class="pkg-service-picker__main">
                          <strong>{{ svcOption.title }}</strong>
                          <span>{{ svcOption.category }}</span>
                        </div>
                        <div class="pkg-service-picker__meta">
                          <span>{{ svcOption.price }}</span>
                          <span>{{ svcOption.leadTime }}</span>
                        </div>
                      </button>
                    </div>
                    <div v-if="packageCardDraftServices.length" class="pkg-card-editor__service-list">
                      <div v-for="svcItem in packageCardDraftServices" :key="`pkg-inline-row-${svcItem.key}`" class="pkg-card-editor__service-row">
                        <div>
                          <strong>{{ svcItem.title }}</strong>
                          <span>{{ svcItem.category }} · {{ svcItem.term }}</span>
                        </div>
                        <span>{{ svcItem.price }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            </template>
            </div>
          </template>

          <!-- ═══════════════ SUBSCRIPTIONS ═══════════════ -->
          <template v-if="(section === 'subscriptions') || showAll">
            <div class="cab-section" data-section="subscriptions">
            <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalistDesignerCabinetMode }">
              <h2>Подписки и абонементы</h2>
              <div class="cab-section-actions">
                <GlassButton variant="primary" v-if="!subscriptions.length"  @click="initSubs">
                  Загрузить шаблоны подписок
                </GlassButton>
                <GlassButton variant="secondary" density="compact"  :disabled="subscriptionCardSaving" @click="createSubscriptionCard">＋ Подписка</GlassButton>
                <span class="cab-section-note">Изменения сохраняются автоматически</span>
              </div>
            </div>
            <p v-if="subEditError" class="cab-inline-error">{{ subEditError }}</p>
            <p v-if="subEditSuccess" class="cab-inline-success">{{ subEditSuccess }}</p>

            <div v-if="!subscriptions.length" class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalistDesignerCabinetMode }">
              <span>⟳</span>
              <p>Подписки не настроены.<br>Загрузите шаблоны или создайте собственный абонемент.</p>
            </div>

            <template v-if="subscriptions.length">
              <div class="sub-grid" :class="{ 'sub-grid--brutalist': isBrutalistDesignerCabinetMode }">
                <div v-for="sub in subscriptions" :key="getSubscriptionActionKey(sub)" class="sub-card-stack">
                  <article
                    class="sub-card glass-surface"
                    :class="{ disabled: !sub.enabled, 'sub-card--brutalist': isBrutalistDesignerCabinetMode, 'sub-card--active': subscriptionCardEditorKey === getSubscriptionActionKey(sub) }"
                    role="button"
                    tabindex="0"
                    @click="toggleSubscriptionCardEditor(sub)"
                    @keyup.enter.prevent="toggleSubscriptionCardEditor(sub)"
                    @keyup.space.prevent="toggleSubscriptionCardEditor(sub)"
                  >
                    <div class="sub-card-head">
                      <h3 class="sub-card-title">{{ getSubscriptionDisplayTitle(sub) }}</h3>
                      <span class="sub-period-badge">{{ getBillingLabel(sub.billingPeriod) }}</span>
                    </div>
                    <div class="sub-card-price-row">
                      <span class="sub-card-price">{{ (Number(sub.price) || 0).toLocaleString('ru-RU') }} <small>₽</small></span>
                      <span v-if="sub.discount > 0" class="sub-card-discount">−{{ sub.discount }}%</span>
                    </div>
                    <div v-if="sub.discount > 0" class="sub-card-effective">
                      Итого: {{ Math.round((Number(sub.price) || 0) * (1 - (sub.discount || 0) / 100)).toLocaleString('ru-RU') }} ₽
                    </div>
                    <p class="sub-card-desc">{{ getSubscriptionDisplayDescription(sub) }}</p>
                    <div v-if="Object.keys(sub.limits || {}).length" class="sub-card-limits">
                      <div v-for="(val, lk) in sub.limits" :key="lk" class="sub-limit-chip">
                        <span class="sub-limit-key">{{ formatLimitKey(String(lk)) }}</span>
                        <span class="sub-limit-val">{{ val }}</span>
                      </div>
                    </div>
                    <div v-if="sub.serviceKeys?.length" class="pkg-card-services">
                      <span v-for="sk in sub.serviceKeys" :key="sk" class="pkg-svc-chip">
                        {{ getServiceTitle(sk) }}
                      </span>
                    </div>
                    <div class="sub-card-monthly">
                      <span class="sub-m-label">В месяц:</span>
                      <span class="sub-m-val">{{ getMonthlyPrice(sub).toLocaleString('ru-RU') }} ₽</span>
                    </div>
                    <p class="pkg-card-note">{{ getSubscriptionLeadTimeLabel(sub) }}</p>
                  </article>
                  <div v-if="subscriptionCardEditorKey === getSubscriptionActionKey(sub) && subscriptionCardDraft" class="sub-card-editor glass-surface" :class="{ 'sub-card-editor--brutalist': isBrutalistDesignerCabinetMode }">
                    <div class="sub-card-editor__head">
                      <div>
                        <div class="sub-card-editor__eyebrow">редактор подписки</div>
                        <strong class="sub-card-editor__title">{{ getSubscriptionDisplayTitle(subscriptionCardDraft) }}</strong>
                      </div>
                      <div class="sub-card-editor__actions">
                        <span class="cab-autosave-status" :class="autosaveStatusClass(subscriptionCardSaveState)">{{ autosaveStatusLabel(subscriptionCardSaveState) }}</span>
                        <GlassButton variant="secondary" density="compact" type="button"  :disabled="subscriptionCardSaving" @click="duplicateSubscriptionCard(sub)">дублировать</GlassButton>
                        <GlassButton variant="secondary" density="compact" type="button"  :disabled="subscriptionCardSaving" @click="moveSubscriptionCard(sub, -1)">выше</GlassButton>
                        <GlassButton variant="secondary" density="compact" type="button"  :disabled="subscriptionCardSaving" @click="moveSubscriptionCard(sub, 1)">ниже</GlassButton>
                        <GlassButton variant="danger" density="compact" type="button"  :disabled="subscriptionCardSaving" @click="removeSubscriptionCard(sub)">удалить</GlassButton>
                        <GlassButton variant="secondary" density="compact" type="button"  @click="closeSubscriptionCardEditor">свернуть</GlassButton>
                      </div>
                    </div>
                    <p v-if="subscriptionCardError" class="cab-inline-error">{{ subscriptionCardError }}</p>
                    <div class="svc-card-editor__grid">
                      <div class="u-field">
                        <label class="u-field__label">Название</label>
                        <GlassInput v-model="subscriptionCardDraft.title"  placeholder="Название подписки" @blur="queueSubscriptionCardSave" />
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Период</label>
                        <select v-model="subscriptionCardDraft.billingPeriod" class="glass-input" @change="queueSubscriptionCardSave">
                          <option v-for="bp in BILLING_PERIODS_LIST" :key="`sub-inline-${bp.value}`" :value="bp.value">{{ bp.label }}</option>
                        </select>
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Цена</label>
                        <GlassInput v-model.number="subscriptionCardDraft.price" type="number" min="0"  @blur="queueSubscriptionCardSave" />
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Скидка</label>
                        <GlassInput v-model.number="subscriptionCardDraft.discount" type="number" min="0" max="100"  @blur="queueSubscriptionCardSave" />
                      </div>
                      <div class="u-field u-field--full">
                        <label class="u-field__label">Описание</label>
                        <textarea v-model="subscriptionCardDraft.description" class="glass-input u-ta" rows="3" placeholder="Что входит в подписку" @blur="queueSubscriptionCardSave" />
                      </div>
                    </div>
                    <div class="sub-card-editor__limits">
                      <div class="sub-card-editor__limits-head">
                        <strong>Лимиты</strong>
                        <GlassButton variant="secondary" density="compact" type="button"  @click="addSubscriptionCardDraftLimit(); queueSubscriptionCardSave()">＋ лимит</GlassButton>
                      </div>
                      <div v-if="Object.keys(subscriptionCardDraft.limits || {}).length" class="sub-limits-grid">
                        <div v-for="(val, lk) in subscriptionCardDraft.limits" :key="`sub-inline-limit-${lk}`" class="sub-limit-row">
                          <GlassInput :value="lk" class=" svc-inp" @change="renameSubscriptionDraftLimit(String(lk), ($event.target as HTMLInputElement).value); queueSubscriptionCardSave()" />
                          <GlassInput :value="val" class=" svc-inp svc-inp--num" type="number" min="0" @blur="queueSubscriptionCardSave" @input="updateSubscriptionDraftLimit(String(lk), Number(($event.target as HTMLInputElement).value))" />
                          <button type="button" class="svc-del" @click="removeSubscriptionDraftLimit(String(lk)); queueSubscriptionCardSave()">✕</button>
                        </div>
                      </div>
                    </div>
                    <label class="svc-enable svc-enable--editor">
                      <input v-model="subscriptionCardDraft.enabled" type="checkbox" @change="queueSubscriptionCardSave" />
                      <span>{{ subscriptionCardDraft.enabled ? 'подписка доступна для продажи' : 'подписка скрыта из выдачи' }}</span>
                    </label>
                    <div class="pkg-card-editor__services">
                      <div class="pkg-card-editor__services-head">
                        <strong>Услуги в подписке</strong>
                        <span>{{ getServiceCountLabel((subscriptionCardDraft.serviceKeys || []).length) }}</span>
                      </div>
                      <p class="pkg-card-editor__summary">{{ getDraftServiceBundleSummary(subscriptionCardDraft.serviceKeys || []) }}</p>
                      <div class="pkg-service-picker-list">
                        <button
                          v-for="svcOption in allServiceOptions"
                          :key="`sub-inline-service-${svcOption.key}`"
                          type="button"
                          class="pkg-service-picker"
                          :class="{ 'pkg-service-picker--active': (subscriptionCardDraft.serviceKeys || []).includes(svcOption.key) }"
                          @click="toggleSubscriptionCardDraftService(svcOption.key); queueSubscriptionCardSave()"
                        >
                          <div class="pkg-service-picker__main">
                            <strong>{{ svcOption.title }}</strong>
                            <span>{{ svcOption.category }}</span>
                          </div>
                          <div class="pkg-service-picker__meta">
                            <span>{{ svcOption.price }}</span>
                            <span>{{ svcOption.leadTime }}</span>
                          </div>
                        </button>
                      </div>
                      <div v-if="subscriptionCardDraftServices.length" class="pkg-card-editor__service-list">
                        <div v-for="svcItem in subscriptionCardDraftServices" :key="`sub-inline-row-${svcItem.key}`" class="pkg-card-editor__service-row">
                          <div>
                            <strong>{{ svcItem.title }}</strong>
                            <span>{{ svcItem.category }} · {{ svcItem.term }}</span>
                          </div>
                          <span>{{ svcItem.price }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            </div>
          </template>

          <template v-if="(section === 'documents') || showAll">
            <div class="cab-section" data-section="documents">
            <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalistDesignerCabinetMode }">
              <h2>Документы</h2>
            </div>

            <div class="u-modal__row2" style="margin-bottom:12px">
              <div class="u-field">
                <label class="u-field__label">Поиск</label>
                <GlassInput v-model="designerDocSearch"  placeholder="Название, заметка" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Фильтр категории</label>
                <select v-model="designerDocFilter" class="glass-input">
                  <option value="">Все категории</option>
                  <option v-for="dc in DESIGNER_DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option>
                </select>
              </div>
              <div class="u-field">
                <label class="u-field__label">Сортировка</label>
                <select v-model="designerDocSort" class="glass-input">
                  <option value="new">Сначала новые</option>
                  <option value="old">Сначала старые</option>
                </select>
              </div>
            </div>

            <div class="u-form-section" :class="{ 'u-form-section--brutalist': isBrutalistDesignerCabinetMode }">
              <h3>Загрузить документ</h3>
              <div class="u-modal__row2">
                <div class="u-field">
                  <label class="u-field__label">Название</label>
                  <GlassInput v-model="newDesignerDocTitle"  placeholder="Название документа" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Категория</label>
                  <select v-model="newDesignerDocCategory" class="glass-input">
                    <option v-for="dc in DESIGNER_DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option>
                  </select>
                </div>
                <div class="u-field u-field--full">
                  <label class="u-field__label">Примечание</label>
                  <GlassInput v-model="newDesignerDocNotes"  placeholder="Необязательно" />
                </div>
              </div>
              <div style="margin-top: 12px;">
                <label class="cab-upload-btn">
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" multiple style="display:none" @change="uploadDesignerDoc" />
                  {{ designerDocUploading ? 'Загрузка…' : '＋ Выбрать файл' }}
                </label>
              </div>
            </div>

            <div v-if="filteredDesignerDocs.length" class="cab-docs-list" :class="{ 'cab-docs-list--brutalist': isBrutalistDesignerCabinetMode }">
              <div v-for="doc in filteredDesignerDocs" :key="doc.id" class="cab-doc-card glass-surface" :class="{ 'cab-doc-card--brutalist': isBrutalistDesignerCabinetMode }">
                <div class="cab-doc-icon">📎</div>
                <div class="cab-doc-info">
                  <div class="cab-doc-title">{{ doc.title }}</div>
                  <div class="cab-doc-meta">
                    <span class="cab-doc-cat">{{ getDesignerDocCategoryLabel(doc.category) }}</span>
                    <span v-if="doc.notes" class="cab-doc-notes">{{ doc.notes }}</span>
                    <span v-if="doc.createdAt" class="cab-doc-notes">{{ formatDocDate(doc.createdAt) }}</span>
                  </div>
                </div>
                <div class="cab-doc-actions">
                  <a v-if="doc.url" :href="doc.url" target="_blank" class="cab-doc-link">Скачать</a>
                  <button class="cab-doc-del" @click="deleteDesignerDoc(doc.id)">✕</button>
                </div>
              </div>
            </div>
            <div v-else-if="designerDocs?.length" class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalistDesignerCabinetMode }">
              <span>🔎</span>
              <p>По фильтру ничего не найдено.</p>
            </div>
            <div v-else class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalistDesignerCabinetMode }">
              <span>📂</span>
              <p>Документов пока нет.<br>Загрузите договоры, ТЗ, референсы и акты.</p>
            </div>
            </div>
          </template>

          <!-- ═══════════════ PROJECTS ═══════════════ -->
          <template v-if="(section === 'projects') || showAll">
            <div class="cab-section" data-section="projects">
            <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalistDesignerCabinetMode }">
              <h2>Мои проекты</h2>
              <GlassButton variant="primary"  @click="showNewProjectModal = true">＋ Новый проект</GlassButton>
            </div>
            <p v-if="projectEditError" class="cab-inline-error">{{ projectEditError }}</p>
            <p v-if="projectEditSuccess" class="cab-inline-success">{{ projectEditSuccess }}</p>

            <!-- New project modal -->
            <div v-if="showNewProjectModal" class="u-modal glass-surface" :class="{ 'u-modal--brutalist-project': isBrutalistDesignerCabinetMode }">
              <div class="u-modal__head">
                <span class="u-modal__title">Создать проект</span>
                <button class="u-modal__close" @click="showNewProjectModal = false">✕</button>
              </div>
              <div class="u-modal__body">
                <div class="u-field">
                  <label class="u-field__label">Название проекта *</label>
                  <GlassInput v-model="newProject.title"  placeholder="Квартира на Арбате" @input="newProject.slug = autoSlug(newProject.title)" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Slug (URL)</label>
                  <GlassInput v-model="newProject.slug"  placeholder="kvartira-na-arbate" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Пакет услуг</label>
                  <select v-model="newProject.packageKey" class="glass-input">
                    <option value="">— без пакета —</option>
                    <option v-for="pkg in availablePackages" :key="pkg.key" :value="pkg.key">
                      {{ getPackageDisplayTitle(pkg) }} ({{ (pkg.pricePerSqm ?? 0).toLocaleString('ru-RU') }} ₽/м²)
                    </option>
                  </select>
                </div>
                <div class="u-modal__row2">
                  <div class="u-field">
                    <label class="u-field__label">Цена за м²</label>
                    <GlassInput v-model.number="newProject.pricePerSqm"  type="number" min="0" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Площадь (м²)</label>
                    <GlassInput v-model.number="newProject.area"  type="number" min="0" />
                  </div>
                </div>
                <div v-if="newProject.pricePerSqm && newProject.area" class="proj-total glass-surface" :class="{ 'proj-total--brutalist': isBrutalistDesignerCabinetMode }">
                  <span>Итого:</span>
                  <strong>{{ (newProject.pricePerSqm * newProject.area).toLocaleString('ru-RU') }} ₽</strong>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Примечание</label>
                  <textarea v-model="newProject.notes" class="glass-input u-ta" rows="2" placeholder="Комментарий к проекту…" />
                </div>
              </div>
              <div class="u-modal__foot">
                <GlassButton variant="primary"
                  
                  :disabled="creatingProject || !newProject.title.trim() || !newProject.slug.trim()"
                  @click="doCreateProject"
                >{{ creatingProject ? 'Создание…' : 'Создать проект' }}</GlassButton>
                <GlassButton variant="secondary" density="compact"  @click="showNewProjectModal = false">Отмена</GlassButton>
              </div>
            </div>

            <!-- Project list -->
            <div v-if="!designerProjects.length && !showNewProjectModal" class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalistDesignerCabinetMode }">
              <span>◒</span>
              <p>Проектов пока нет.<br>Создайте первый проект, чтобы начать работу.</p>
            </div>

            <div v-for="dp in designerProjects" :key="dp.id" class="proj-card glass-surface" :class="{ 'proj-card--brutalist': isBrutalistDesignerCabinetMode }">
              <div class="proj-card-head">
                <div class="proj-card-title-row">
                  <h3 class="proj-card-title">{{ dp.projectTitle }}</h3>
                  <span class="u-status" :class="`u-status--${dp.status}`">
                    {{ DESIGNER_PROJECT_STATUS_LABELS[dp.status as keyof typeof DESIGNER_PROJECT_STATUS_LABELS] || dp.status }}
                  </span>
                  <GlassButton variant="secondary" density="compact" type="button"  @click="startEditDesignerProject(dp)">редактировать</GlassButton>
                  <GlassButton as="NuxtLink" v-if="dp.projectSlug" :to="`/admin/projects/${dp.projectSlug}`" variant="secondary" density="compact" class="proj-card-admin-link">→ управление проектом</GlassButton>
                </div>
                <div class="proj-card-meta">
                  <span v-if="dp.packageKey" class="proj-card-pkg">{{ getPackageTitle(dp.packageKey) }}</span>
                  <span v-if="dp.area" class="proj-card-area">{{ dp.area }} м²</span>
                  <span v-if="dp.pricePerSqm" class="proj-card-ppm">{{ dp.pricePerSqm.toLocaleString('ru-RU') }} ₽/м²</span>
                  <span v-if="dp.totalPrice" class="proj-card-total">{{ dp.totalPrice.toLocaleString('ru-RU') }} ₽</span>
                </div>
              </div>

              <div v-if="editingDesignerProjectId === dp.id" class="u-modal glass-surface" :class="{ 'u-modal--brutalist-project': isBrutalistDesignerCabinetMode }" style="margin-top:10px">
                <div class="u-modal__body">
                  <div class="u-modal__row2">
                    <div class="u-field">
                      <label class="u-field__label">Название проекта</label>
                      <GlassInput v-model="projectEdit.title"  @blur="queueProjectEditSave" />
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Статус</label>
                      <select v-model="projectEdit.status" class="glass-input" @change="queueProjectEditSave">
                        <option value="draft">Черновик</option>
                        <option value="active">В работе</option>
                        <option value="paused">Пауза</option>
                        <option value="completed">Завершён</option>
                        <option value="archived">Архив</option>
                      </select>
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Пакет</label>
                      <select v-model="projectEdit.packageKey" class="glass-input" @change="queueProjectEditSave">
                        <option value="">— без пакета —</option>
                        <option v-for="pkg in packages" :key="pkg.key" :value="pkg.key">{{ getPackageDisplayTitle(pkg) }}</option>
                      </select>
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Цена за м²</label>
                      <GlassInput v-model.number="projectEdit.pricePerSqm" type="number" min="0"  @blur="queueProjectEditSave" />
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Площадь (м²)</label>
                      <GlassInput v-model.number="projectEdit.area" type="number" min="0"  @blur="queueProjectEditSave" />
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Итого</label>
                      <GlassInput :value="((projectEdit.pricePerSqm || 0) * (projectEdit.area || 0)).toLocaleString('ru-RU') + ' ₽'"  readonly />
                    </div>
                  </div>
                  <div class="u-field" style="margin-top:8px">
                    <label class="u-field__label">Примечание</label>
                    <textarea v-model="projectEdit.notes" class="glass-input u-ta" rows="2" @blur="queueProjectEditSave" />
                  </div>
                </div>
                <div class="u-modal__foot">
                  <span class="cab-autosave-status" :class="autosaveStatusClass(projectEditState)">{{ autosaveStatusLabel(projectEditState) }}</span>
                  <GlassButton variant="secondary" density="compact" type="button"  @click="cancelEditDesignerProject">свернуть</GlassButton>
                </div>
              </div>

              <div v-if="dp.notes" class="proj-notes">{{ dp.notes }}</div>
            </div>

            </div>
          </template>

          <!-- ═══════════════ CLIENTS (Flat Registry pivot) ═══════════════ -->
          <template v-if="(section === 'clients') || showAll">
            <div class="cab-section" data-section="clients">
            <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalistDesignerCabinetMode }"><h2>Клиенты</h2></div>
            <div v-if="uniqueClients.length" class="pivot-list">
              <div v-for="c in uniqueClients" :key="c.id" class="pivot-banner glass-surface" :class="{ 'pivot-banner--brutalist': isBrutalistDesignerCabinetMode }" @click="goToClient(c.id, c.name)">
                <div class="pivot-banner-left">
                  <span class="pivot-banner-name">{{ c.name }}</span>
                  <span v-if="c.phone || c.email" class="pivot-banner-contact">
                    {{ [c.phone, c.email].filter(Boolean).join(' / ') }}
                  </span>
                </div>
                <span class="pivot-banner-arrow">→</span>
              </div>
            </div>
            <div v-else class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalistDesignerCabinetMode }"><p>Клиентов пока нет. Добавьте клиента в проект.</p></div>
            </div>
          </template>

          <!-- ═══════════════ CONTRACTORS (Flat Registry pivot) ═══════════════ -->
          <template v-if="(section === 'contractors') || showAll">
            <div class="cab-section" data-section="contractors">
            <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalistDesignerCabinetMode }"><h2>Подрядчики</h2></div>
            <div v-if="uniqueContractors.length" class="pivot-list">
              <div v-for="c in uniqueContractors" :key="c.id" class="pivot-banner glass-surface" :class="{ 'pivot-banner--brutalist': isBrutalistDesignerCabinetMode }" @click="goToContractor(c.id, c.name)">
                <div class="pivot-banner-left">
                  <span class="pivot-banner-name">{{ c.name }}</span>
                  <span v-if="c.role" class="pivot-banner-contact">{{ c.role }}</span>
                </div>
                <span class="pivot-banner-arrow">→</span>
              </div>
            </div>
            <div v-else class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalistDesignerCabinetMode }"><p>Подрядчиков пока нет. Добавьте подрядчика в проект.</p></div>
            </div>
          </template>

          <!-- ═══════════════ SELLERS (Flat Registry pivot) ═══════════════ -->
          <template v-if="(section === 'sellers') || showAll">
            <div class="cab-section" data-section="sellers">
            <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalistDesignerCabinetMode }"><h2>Продавцы / Поставщики</h2></div>
            <div v-if="linkedData?.sellers?.length" class="pivot-list">
              <div v-for="s in linkedData.sellers" :key="s.id" class="pivot-banner glass-surface" :class="{ 'pivot-banner--brutalist': isBrutalistDesignerCabinetMode }" @click="goToSeller(s.id, s.name)">
                <div class="pivot-banner-left">
                  <span class="pivot-banner-name">{{ s.name }}</span>
                  <span v-if="s.companyName" class="pivot-banner-contact">{{ s.companyName }}</span>
                  <span v-if="s.phone || s.email" class="pivot-banner-contact">
                    {{ [s.phone, s.email].filter(Boolean).join(' / ') }}
                  </span>
                  <span v-if="s.city" class="pivot-banner-contact">{{ s.city }}</span>
                </div>
                <div class="pivot-banner-right">
                  <span class="pivot-banner-count">{{ s.projects.length }} {{ pluralProjects(s.projects.length) }}</span>
                  <span class="pivot-banner-arrow">→</span>
                </div>
              </div>
            </div>
            <div v-else class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalistDesignerCabinetMode }"><p>Поставщиков пока нет.</p></div>
            </div>
          </template>

          <!-- ═══════════════ MANAGERS (Flat Registry) ═══════════════ -->
          <template v-if="(section === 'managers') || showAll">
            <div class="cab-section" data-section="managers">
            <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalistDesignerCabinetMode }"><h2>Менеджеры</h2></div>
            <div v-if="linkedData?.managers?.length" class="pivot-list">
              <div v-for="m in linkedData.managers" :key="m.id" class="pivot-banner glass-surface" :class="{ 'pivot-banner--brutalist': isBrutalistDesignerCabinetMode }" @click="goToManager(m.id, m.name)">
                <div class="pivot-banner-left">
                  <span class="pivot-banner-name">{{ m.name }}</span>
                  <span v-if="m.role" class="pivot-banner-contact">{{ m.role }}</span>
                  <span v-if="m.phone || m.email" class="pivot-banner-contact">
                    {{ [m.phone, m.email].filter(Boolean).join(' / ') }}
                  </span>
                  <span v-if="m.telegram" class="pivot-banner-contact">{{ m.telegram }}</span>
                </div>
                <div class="pivot-banner-right">
                  <span class="pivot-banner-count">{{ m.projects.length }} {{ pluralProjects(m.projects.length) }}</span>
                  <span class="pivot-banner-arrow">→</span>
                </div>
              </div>
            </div>
            <div v-else class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalistDesignerCabinetMode }"><p>Менеджеров пока нет.</p></div>
            </div>
          </template>

          <!-- ═══════════════ GALLERY (Flat Registry) ═══════════════ -->
          <template v-if="(section === 'gallery') || showAll">
            <div class="cab-section" data-section="gallery">
            <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalistDesignerCabinetMode }"><h2>Галерея</h2></div>
            <div v-if="galleryList.length" class="gallery-grid">
              <div v-for="g in galleryList" :key="g.id" class="gallery-card glass-surface" :class="{ 'gallery-card--brutalist': isBrutalistDesignerCabinetMode }">
                <div v-if="g.image" class="gallery-card-img">
                  <img :src="`/uploads/${g.image}`" :alt="g.title" loading="lazy" />
                </div>
                <div class="gallery-card-body">
                  <span class="gallery-card-title">{{ g.title }}</span>
                  <span v-if="g.category" class="gallery-card-cat">{{ g.category }}</span>
                  <div v-if="g.tags?.length" class="gallery-card-tags">
                    <span v-for="t in g.tags" :key="t" class="gallery-tag">{{ t }}</span>
                  </div>
                  <span v-if="g.featured" class="gallery-card-feat">Избранное</span>
                </div>
              </div>
            </div>
            <div v-else class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalistDesignerCabinetMode }"><p>Элементов галереи пока нет.</p></div>
            </div>
          </template>

          <!-- ═══════════════ MOODBOARDS (Flat Registry) ═══════════════ -->
          <template v-if="(section === 'moodboards') || showAll">
            <div class="cab-section" data-section="moodboards">
            <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalistDesignerCabinetMode }"><h2>Мудборды</h2></div>
            <div v-if="moodboardList.length" class="gallery-grid">
              <div v-for="g in moodboardList" :key="g.id" class="gallery-card glass-surface" :class="{ 'gallery-card--brutalist': isBrutalistDesignerCabinetMode }">
                <div v-if="g.image" class="gallery-card-img">
                  <img :src="`/uploads/${g.image}`" :alt="g.title" loading="lazy" />
                </div>
                <div class="gallery-card-body">
                  <span class="gallery-card-title">{{ g.title }}</span>
                  <div v-if="g.tags?.length" class="gallery-card-tags">
                    <span v-for="t in g.tags" :key="t" class="gallery-tag">{{ t }}</span>
                  </div>
                  <span v-if="g.featured" class="gallery-card-feat">Избранное</span>
                </div>
              </div>
            </div>
            <div v-else class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalistDesignerCabinetMode }"><p>Мудбордов пока нет.</p></div>
            </div>
          </template>

          <!-- ═══════════════ PROFILE ═══════════════ -->
          <template v-if="(section === 'profile') || showAll">
            <div class="cab-section" data-section="profile">
            <form @submit.prevent class="cab-form" :class="{ 'cab-form--brutalist': isBrutalistDesignerCabinetMode }">
              <div class="u-form-section" :class="{ 'u-form-section--brutalist': isBrutalistDesignerCabinetMode }">
                <h3>Основные данные</h3>
                <div class="u-modal__row2">
                  <div class="u-field">
                    <label class="u-field__label">Имя / Студия *</label>
                    <GlassInput v-model="form.name"  required @blur="queueProfileAutosave" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Компания</label>
                    <GlassInput v-model="form.companyName"  placeholder="ООО / ИП…" @blur="queueProfileAutosave" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Телефон</label>
                    <GlassInput v-model="form.phone"  type="tel" placeholder="+7 (___) ___-__-__" @blur="queueProfileAutosave" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Email</label>
                    <GlassInput v-model="form.email"  type="email" placeholder="mail@example.com" @blur="queueProfileAutosave" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Telegram</label>
                    <GlassInput v-model="form.telegram"  placeholder="@username" @blur="queueProfileAutosave" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Сайт / портфолио</label>
                    <GlassInput v-model="form.website"  placeholder="https://…" @blur="queueProfileAutosave" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Город</label>
                    <GlassInput v-model="form.city"  placeholder="Москва" @blur="queueProfileAutosave" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Опыт работы</label>
                    <GlassInput v-model="form.experience"  placeholder="10 лет" @blur="queueProfileAutosave" />
                  </div>
                </div>
              </div>

              <div class="u-form-section" :class="{ 'u-form-section--brutalist': isBrutalistDesignerCabinetMode }">
                <h3>О себе</h3>
                <div class="u-field u-field--full">
                  <textarea v-model="form.about" class="glass-input u-ta" rows="4" placeholder="Расскажите о своём подходе к дизайну, стилях, специализации…" @blur="queueProfileAutosave" />
                </div>
              </div>

              <div class="u-form-section" :class="{ 'u-form-section--brutalist': isBrutalistDesignerCabinetMode }">
                <h3>Специализации</h3>
                <div class="u-tags">
                  <button
                    v-for="sp in SPECIALIZATION_OPTIONS"
                    :key="`spec-${sp}`"
                    type="button"
                    class="pkg-tag-picker"
                    :class="{ 'pkg-tag-picker--active': renderedProfileSpecializations.includes(sp) }"
                    @click="toggleSpec(sp)"
                  >{{ sp }}</button>
                </div>
              </div>

              <div class="u-form-foot">
                <span class="cab-autosave-status" :class="autosaveStatusClass(profileSaveState)">{{ autosaveStatusLabel(profileSaveState) }}</span>
                <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
            </div>
          </template>

        </div>
        <div v-if="isPaged" class="cv-pager-rail">
          <div class="cv-pager-rail__meta">
            <span class="cv-pager-rail__mode">{{ pagerModeLabel }}</span>
            <span>экран {{ pageIndex }} / {{ pageCount }}</span>
          </div>
          <div class="cv-pager-rail__actions">
            <GlassButton variant="secondary" density="compact" type="button"  @click="move('prev')">← экран</GlassButton>
            <GlassButton variant="secondary" density="compact" type="button"  @click="move('next')">{{ pagerNextLabel }}</GlassButton>
          </div>
        </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import {
  DESIGNER_SERVICE_CATEGORY_LABELS,
  PRICE_UNIT_LABELS,
  DESIGNER_PROJECT_STATUS_LABELS,
  DESIGNER_SERVICE_TEMPLATES,
  DESIGNER_PACKAGE_TEMPLATES,
  DESIGNER_SUBSCRIPTION_TEMPLATES,
  BILLING_PERIOD_LABELS,
  BILLING_PERIOD_MONTHS,
  BILLING_PERIODS,
  type DesignerServicePrice,
  type DesignerPackage,
  type DesignerSubscription,
  type DesignerServiceCategory,
  type BillingPeriod,
  type PriceUnit,
  PRICE_UNITS,
} from '~~/shared/types/designer'
import {
  getDesignerPackagePersistedKey,
  getDesignerSubscriptionPersistedKey,
} from '~~/shared/utils/designer/designer-catalogs'
import { registerWipe2Data } from '~/composables/useWipe2'

type DesignerCabinetFocusTarget = {
  kind: 'service' | 'package' | 'subscription'
  key: string
  requestId: number
} | null

const props = defineProps<{ designerId: number; modelValue?: string; focusTarget?: DesignerCabinetFocusTarget }>()
const emit = defineEmits<{ 'update:modelValue': [section: string] }>()

const designerIdRef = computed(() => props.designerId)

const designSystem = useDesignSystem()
const isBrutalistDesignerCabinetMode = computed(() => designSystem.currentDesignMode.value === 'brutalist')

const {
  designer,
  pending,
  services,
  packages,
  designerProjects,
  dashStats,
  servicesByCat,
  profilePct,
  section,
  nav,
  form,
  saving,
  saveMsg,
  saveProfile,
  savePricingCatalog,
  saveServices,
  initServicesFromTemplates,
  savePackages,
  initPackagesFromTemplates,
  subscriptions,
  saveSubscriptions,
  initSubscriptionsFromTemplates,
  newProject,
  creatingProject,
  createProject,
  updateDesignerProject,
  addClientToProject,
  addContractorToProject,
  allClients,
  allContractors,
  formatPrice,
  autoSlug,
  refresh,
} = useDesignerCabinet(designerIdRef)
const sectionOrder = computed(() => (nav.value || []).map((item: any) => item.key))
const {
  viewportRef,
  contentViewMode,
  isPaged,
  pagerModeLabel,
  pagerNextLabel,
  pageIndex,
  pageCount,
  syncPager,
  move,
  handleWheel,
  handleKeydown,
} = useContentViewport({
  mode: computed(() => designSystem.tokens.value.contentViewMode),
  currentSection: section,
  sectionOrder,
  onNavigate: async (nextSection) => {
    section.value = nextSection
  },
  transitionMs: computed(() => designSystem.tokens.value.pageTransitDuration ?? 280),
})

// ── v-model:section sync with parent ──
watch(() => props.modelValue, (val) => {
  if (val !== undefined && val !== section.value) section.value = val
}, { immediate: true })
watch(section, (val) => {
  if (props.modelValue !== undefined) emit('update:modelValue', val)
})

// ── Local state ──

const SPECIALIZATION_OPTIONS = [
  'Квартиры', 'Дома и коттеджи', 'Апартаменты', 'Офисы',
  'Рестораны и кафе', 'Магазины', 'Общественные пространства',
  'Минимализм', 'Современный', 'Классика', 'Лофт', 'Скандинавский',
  'Ар-деко', 'Эко', 'Hi-Tech', 'Японский', 'Прованс',
]

const PRICE_UNITS_LIST = Object.entries(PRICE_UNIT_LABELS).map(([value, label]) => ({ value, label }))
const SERVICE_CATEGORY_OPTIONS = Object.entries(DESIGNER_SERVICE_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
})) as { value: DesignerServiceCategory; label: string }[]
const BILLING_PERIODS_LIST = Object.entries(BILLING_PERIOD_LABELS).map(([value, label]) => ({ value, label }))

const {
  DESIGNER_DOC_CATEGORIES,
  designerDocs,
  designerDocUploading,
  newDesignerDocTitle,
  newDesignerDocCategory,
  newDesignerDocNotes,
  designerDocSearch,
  designerDocFilter,
  designerDocSort,
  filteredDesignerDocs,
  formatDocDate,
  uploadDesignerDoc,
  deleteDesignerDoc,
  getDesignerDocCategoryLabel,
} = useDesignerCabinetDocuments(designerIdRef)

const {
  renderedProfileSpecializations,
  profileSaveState,
  toggleSpec,
  queueProfileAutosave,
} = useDesignerCabinetProfileState({
  designer,
  designerId: designerIdRef,
  form,
  saveProfile,
  utils: {
    setAutosaveSettled,
  },
})

const {
  linkedData,
  showBrutalistDashboardHero,
  designerHeroSubtitle,
  designerDashboardFacts,
  uniqueClients,
  uniqueContractors,
  galleryList,
  moodboardList,
  pluralProjects,
  goToClient,
  goToContractor,
  goToSeller,
  goToManager,
} = useDesignerCabinetRelationsView({
  designerId: designerIdRef,
  designer,
  designerProjects,
  profilePct,
  dashStats,
  services,
  isBrutalistDesignerCabinetMode,
  section,
})

const {
  wipe2CabinetData,
} = useDesignerCabinetWipe2View({
  designer,
  form,
  section,
  services,
  packages,
  subscriptions,
  designerProjects,
  designerDocs,
  uniqueClients,
  uniqueContractors,
  linkedData,
  galleryList,
  moodboardList,
  dashStats,
  getServiceCategoryValue,
  getServiceDisplayTitle,
  formatServicePrice,
  getServiceDisplayDescription,
  getPriceUnitLabel,
  getServiceCategoryLabel,
  getServiceActionKey,
  getPackageGroupLabel,
  getPackageDisplayTitle,
  formatRubles,
  getPackageListDescription,
  getServiceCountLabel,
  getPackageExamplePrice,
  getPackageBudgetLabel,
  getPackageActionKey,
  getSubscriptionGroupLabel,
  getSubscriptionDisplayTitle,
  getSubscriptionListDescription,
  getBillingLabel,
  getMonthlyPrice,
  getSubscriptionActionKey,
  getPackageTitle,
  formatDocDate,
})

// ── Linked entities (pivot lists) ──

// ── Services editing ──

type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'

function cloneDraft<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function makeEditorId() {
  return `${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

function getRequestErrorMessage(error: any, fallback: string) {
  return error?.data?.message || error?.message || fallback
}

function showTransientMessage(target: { value: string }, message: string) {
  target.value = message
  setTimeout(() => {
    if (target.value === message) target.value = ''
  }, 2500)
}

function autosaveStatusLabel(state: InlineAutosaveState) {
  if (state === 'saving') return '[ СОХРАНЕНИЕ... ]'
  if (state === 'saved') return '[ СОХРАНЕНО ]'
  if (state === 'error') return '[ ОШИБКА СОХРАНЕНИЯ ]'
  return '[ AUTOSAVE ]'
}

function autosaveStatusClass(state: InlineAutosaveState) {
  return state ? `cab-autosave-status--${state}` : 'cab-autosave-status--idle'
}

function getPackagePersistedKey(pkg: DesignerPackage, index = packages.value.findIndex((item) => item === pkg)) {
  return getDesignerPackagePersistedKey(pkg, Math.max(index, 0))
}

function getPackageActionKey(pkg: DesignerPackage, index = packages.value.findIndex((item) => item === pkg)) {
  return getPackagePersistedKey(pkg, index)
}

function findPackageByActionKey(actionKey: string) {
  return packages.value.find((item, index) => getPackagePersistedKey(item, index) === actionKey) || null
}

function getSubscriptionPersistedKey(subscription: DesignerSubscription, index = subscriptions.value.findIndex((item) => item === subscription)) {
  return getDesignerSubscriptionPersistedKey(subscription, Math.max(index, 0))
}

function getSubscriptionActionKey(subscription: DesignerSubscription, index = subscriptions.value.findIndex((item) => item === subscription)) {
  return getSubscriptionPersistedKey(subscription, index)
}

function findSubscriptionByActionKey(actionKey: string) {
  return subscriptions.value.find((item, index) => getSubscriptionPersistedKey(item, index) === actionKey) || null
}

const {
  allServiceOptions,
  getBillingLabel,
  getMonthlyPrice,
  formatLimitKey,
  getServiceTitle,
  getServiceDisplayTitle,
  getServiceDisplayDescription,
  getServiceTemplateLabel,
  getServiceTemplateHint,
  getServiceUsageInfo,
  formatServiceUsageHint,
  getPackageUsageInfo,
  formatPackageUsageHint,
  getServiceLeadTimeLabel,
  getServiceCategoryValue,
  getServiceCategoryLabel,
  getPackageTitle,
  getPackageDisplayTitle,
  getPackageDisplayDescription,
  getSubscriptionDisplayTitle,
  getSubscriptionDisplayDescription,
  formatRubles,
  formatServicePrice,
  getPriceUnitLabel,
  getServiceCountLabel,
  getCategoryActiveLabel,
  getCategoryStartingPrice,
  getServiceMarketLabel,
  getServiceOriginLabel,
  getPackageExamplePrice,
  getPackageVisibleServiceKeys,
  getPackageHiddenServiceCount,
  getPackageCoverageLabel,
  getPackageCategoryLabel,
  getPackageBudgetLabel,
  getDraftServiceBundleSummary,
  getDraftServiceItems,
  getPackageLeadTimeLabel,
  getSubscriptionLeadTimeLabel,
  getPackageGroupLabel,
  getPackageListDescription,
  getSubscriptionGroupLabel,
  getSubscriptionListDescription,
} = useDesignerCabinetPricingView({
  services,
  packages,
  subscriptions,
  designerProjects,
})

const {
  svcEditError,
  svcEditSuccess,
  inlinePriceKey,
  inlinePriceVal,
  serviceCatalogOpen,
  serviceCatalogSearch,
  serviceCatalogCategory,
  serviceCatalogMode,
  filteredServiceCatalogEntries,
  serviceCatalogTargetUsage,
  serviceEditorUsage,
  serviceCardEditorKey,
  serviceCardDraft,
  serviceCardSaving,
  serviceCardError,
  serviceCardSaveState,
  getServicePersistedKey,
  getServiceActionKey,
  findServiceByActionKey,
  getValidServiceSelectionKeys,
  startInlinePrice,
  cancelInlinePrice,
  commitInlinePrice,
  closeServiceCardEditor,
  openServiceCardEditor,
  toggleServiceCardEditor,
  openServiceCatalog,
  closeServiceCatalog,
  selectServiceCatalogEntry,
  queueServiceCardSave,
  createServiceCard,
  duplicateServiceCard,
  moveServiceCard,
  removeServiceCard,
} = useDesignerCabinetServices({
  services,
  packages,
  subscriptions,
  saveServices,
  savePricingCatalog,
  getServiceUsageInfo,
  formatServicePrice,
  closePeerEditors: () => {
    closePackageCardEditor()
    closeSubscriptionCardEditor()
  },
  utils: {
    cloneDraft,
    makeEditorId,
    getRequestErrorMessage,
    showTransientMessage,
    setAutosaveSettled,
  },
})

async function initFromTemplates() {
  const list = initServicesFromTemplates()
  await saveServices(list)
  const pkgs = initPackagesFromTemplates()
  await savePackages(pkgs)
}

// ── Packages editing ──

const {
  pkgEditError,
  pkgEditSuccess,
  packageCardEditorKey,
  packageCardDraft,
  packageCardSaving,
  packageCardError,
  packageCardSaveState,
  initPackages,
  closePackageCardEditor,
  openPackageCardEditor,
  togglePackageCardEditor,
  togglePackageCardDraftService,
  queuePackageCardSave,
  createPackageCard,
  duplicatePackageCard,
  movePackageCard,
  removePackageCard,
} = useDesignerCabinetPackages({
  packages,
  designerProjects,
  savePackages,
  savePricingCatalog,
  initPackagesFromTemplates,
  getValidServiceSelectionKeys,
  getPackageActionKey,
  findPackageByActionKey,
  closePeerEditors: () => {
    closeServiceCardEditor()
    closeSubscriptionCardEditor()
  },
  utils: {
    cloneDraft,
    makeEditorId,
    getRequestErrorMessage,
    showTransientMessage,
    setAutosaveSettled,
  },
})

const packageEditorUsage = computed(() => {
  return getPackageUsageInfo(packageCardEditorKey.value)
})

const {
  subEditError,
  subEditSuccess,
  subscriptionCardEditorKey,
  subscriptionCardDraft,
  subscriptionCardSaving,
  subscriptionCardError,
  subscriptionCardSaveState,
  initSubs,
  closeSubscriptionCardEditor,
  openSubscriptionCardEditor,
  toggleSubscriptionCardEditor,
  toggleSubscriptionCardDraftService,
  updateSubscriptionDraftLimit,
  renameSubscriptionDraftLimit,
  removeSubscriptionDraftLimit,
  addSubscriptionCardDraftLimit,
  queueSubscriptionCardSave,
  createSubscriptionCard,
  duplicateSubscriptionCard,
  moveSubscriptionCard,
  removeSubscriptionCard,
} = useDesignerCabinetSubscriptions({
  subscriptions,
  saveSubscriptions,
  initSubscriptionsFromTemplates,
  getValidServiceSelectionKeys,
  getSubscriptionActionKey,
  findSubscriptionByActionKey,
  closePeerEditors: () => {
    closeServiceCardEditor()
    closePackageCardEditor()
  },
  utils: {
    cloneDraft,
    makeEditorId,
    getRequestErrorMessage,
    showTransientMessage,
    setAutosaveSettled,
  },
})

// ── Card editors (view mode) ──

function setAutosaveSettled(state: { value: InlineAutosaveState }, expected: InlineAutosaveState) {
  setTimeout(() => {
    if (state.value === expected) state.value = ''
  }, 2200)
}

const {
  availablePackages,
  showNewProjectModal,
  editingDesignerProjectId,
  projectEdit,
  projectEditError,
  projectEditSuccess,
  projectEditState,
  doCreateProject,
  startEditDesignerProject,
  cancelEditDesignerProject,
  queueProjectEditSave,
} = useDesignerCabinetProjects({
  packages,
  newProject,
  createProject,
  updateDesignerProject,
  utils: {
    setAutosaveSettled,
    getRequestErrorMessage,
  },
})

const packageCardDraftServices = computed(() => {
  return getDraftServiceItems(packageCardDraft.value?.serviceKeys || [])
})

const subscriptionCardDraftServices = computed(() => {
  return getDraftServiceItems(subscriptionCardDraft.value?.serviceKeys || [])
})

watch(() => props.focusTarget?.requestId, async () => {
  const target = props.focusTarget
  if (!target?.key) return
  section.value = target.kind === 'service'
    ? 'services'
    : target.kind === 'package'
      ? 'packages'
      : 'subscriptions'
  await nextTick()
  if (target.kind === 'service') {
    const service = findServiceByActionKey(target.key)
    if (service) openServiceCardEditor(service)
    return
  }
  if (target.kind === 'package') {
    const pkg = findPackageByActionKey(target.key)
    if (pkg) openPackageCardEditor(pkg)
    return
  }
  const subscription = findSubscriptionByActionKey(target.key)
  if (subscription) openSubscriptionCardEditor(subscription)
})

// ── Wipe2 card view ──
const {
  isWipe2Mode,
  showAll,
} = useCabinetSectionRibbonNav({
  contentViewMode,
  section,
  viewportRef,
})

registerWipe2Data(wipe2CabinetData)

</script>

<style scoped>
/* ── Inline feedback ── */
.cab-inline-error  { margin: -10px 0 12px; color: var(--ds-error, var(--ds-error)); font-size: .82rem; }
.cab-inline-success { margin: -10px 0 12px; color: var(--ds-success, var(--ds-success)); font-size: .82rem; }
.cab-section-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.cab-section-note {
  font-size: .7rem;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 42%, transparent);
}

.cab-autosave-status {
  font-size: .68rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 45%, transparent);
}

.cab-autosave-status--saving {
  color: color-mix(in srgb, var(--glass-text) 76%, transparent);
}

.cab-autosave-status--saved {
  color: var(--ds-success, #2f7d32);
}

.cab-autosave-status--error {
  color: var(--ds-error, #b42318);
}

/* ── Form accent ── */
.cab-form { display: flex; flex-direction: column; gap: 24px; }
.cab-form--brutalist {
  gap: 0;
}
.u-form-section h3 { color: var(--ds-accent, #646cff); }

.ds-section-head--brutalist {
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
}

.u-empty--brutalist {
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.u-form-section--brutalist,
.u-modal--brutalist-project,
.proj-total--brutalist {
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

/* ── Designer-specific dashboard extras ── */
.dash-project-status { font-size: .75rem; padding: 2px 8px; border-radius: 6px; width: fit-content; }
.dash-project-price  { font-size: .82rem; color: var(--ds-success, var(--ds-success)); }
.dash-project-area   { font-size: .78rem; opacity: .55; }

.ds-cab-hero {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px 0 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  margin-bottom: 18px;
}

.ds-cab-hero-topline {
  font-size: .64rem;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.ds-cab-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, .9fr);
  gap: 16px;
}

.ds-cab-hero-main,
.ds-cab-hero-facts {
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.ds-cab-hero-main {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px;
}

.ds-cab-hero-avatar {
  width: 72px;
  height: 72px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  font-size: 1.6rem;
  text-transform: uppercase;
}

.ds-cab-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ds-cab-hero-title {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 3.8rem);
  line-height: .95;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.ds-cab-hero-subtitle {
  margin: 0;
  font-size: .82rem;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 52%, transparent);
}

.ds-cab-hero-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ds-cab-hero-fact {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-right: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.ds-cab-hero-fact:nth-child(2n) {
  border-right: 0;
}

.ds-cab-hero-fact:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.ds-cab-hero-fact-label {
  font-size: .58rem;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 44%, transparent);
}

.ds-cab-hero-fact-value {
  font-size: 1rem;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.dash-quick-nav--brutalist {
  gap: 0;
}

.dash-quick-btn--brutalist {
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.dash-stats--brutalist {
  gap: 0;
}

.dash-stat--brutalist {
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.cab-cta--brutalist,
.dash-projects--brutalist,
.dash-project-card--brutalist {
  border-radius: 0;
}

.dash-projects--brutalist {
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.dash-project-card--brutalist {
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}

/* ── Services ── */
.svc-category  { padding: 20px 24px; border-radius: 12px; margin-bottom: 14px; }
.svc-category--brutalist {
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}
.svc-cat-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.svc-cat-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.svc-cat-eyebrow {
  font-size: .64rem;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 48%, transparent);
}
.svc-cat-title { font-size: 1rem; font-weight: 700; margin: 0; color: var(--ds-accent, #646cff); }
.svc-cat-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
.svc-cat-stat {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
  font-size: .72rem;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.svc-cat-stat--accent {
  color: var(--ds-accent, #646cff);
  border-color: color-mix(in srgb, var(--ds-accent, #646cff) 24%, transparent);
}
.svc-list { display: flex; flex-direction: column; gap: 8px; }
.svc-list--cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}
.svc-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100%;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  cursor: pointer;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--ds-accent, #646cff) 5%, transparent), transparent 38%),
    color-mix(in srgb, var(--glass-text) 3%, transparent);
}
.svc-card.disabled { opacity: .48; }
.svc-card--brutalist {
  border-radius: 0;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--glass-text) 5%, transparent), transparent 34%),
    color-mix(in srgb, var(--glass-text) 2%, transparent);
}
.svc-card-topline,
.pkg-card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.svc-state-badge,
.pkg-state-badge,
.svc-unit-chip,
.pkg-service-count {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.svc-state-badge,
.pkg-state-badge {
  background: color-mix(in srgb, var(--ds-success, #34d399) 14%, transparent);
  color: var(--ds-success, #34d399);
}
.svc-state-badge--muted,
.pkg-state-badge--muted {
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  color: color-mix(in srgb, var(--glass-text) 60%, transparent);
}
.svc-unit-chip,
.pkg-service-count {
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  color: color-mix(in srgb, var(--glass-text) 78%, transparent);
}
.svc-card-stack,
.pkg-card-stack {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.svc-card--active,
.pkg-card--active {
  border-color: color-mix(in srgb, var(--ds-accent) 36%, var(--glass-border));
  box-shadow: 0 18px 36px color-mix(in srgb, var(--ds-accent) 14%, transparent);
}
.svc-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.svc-name  { margin: 0; font-weight: 700; font-size: 1rem; line-height: 1.15; }
.svc-desc  { margin: 0; font-size: .84rem; line-height: 1.55; opacity: .66; }
.svc-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.svc-meta-chip {
  padding: 6px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  font-size: .74rem;
  color: color-mix(in srgb, var(--glass-text) 74%, transparent);
}
.svc-card-foot {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}
.svc-price-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.svc-price-caption {
  font-size: .62rem;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 48%, transparent);
}
.svc-price { font-weight: 700; color: var(--ds-success, var(--ds-success)); text-align: right; white-space: nowrap; }
.svc-card-editor,
.pkg-card-editor {
  position: relative;
  z-index: 2;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--ds-accent) 18%, var(--glass-border));
  background: color-mix(in srgb, var(--glass-bg) 94%, white 6%);
}
.svc-card-editor--brutalist,
.pkg-card-editor--brutalist {
  border-radius: 0;
  box-shadow: none;
}
.svc-card-editor__head,
.pkg-card-editor__services-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.svc-card-editor__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.svc-card-editor__eyebrow {
  font-size: .66rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  opacity: .52;
}
.svc-card-editor__title {
  display: block;
  margin-top: 4px;
  font-size: .95rem;
}
.svc-card-editor__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.svc-enable--editor {
  margin-top: 12px;
}
.pkg-card-editor__services {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}
.pkg-card-editor__summary {
  margin: 0;
  font-size: .78rem;
  line-height: 1.5;
  color: color-mix(in srgb, var(--glass-text) 68%, transparent);
}
.pkg-service-picker-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.pkg-card-editor__service-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pkg-card-editor__service-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}
.pkg-card-editor__service-row div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pkg-card-editor__service-row span {
  font-size: .75rem;
  opacity: .62;
}

.svc-edit-row  { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--glass-border); }
.svc-edit-name  { flex: 2; }
.svc-edit-desc  { flex: 2; }
.svc-edit-cat   { flex: 1.3; }
.svc-edit-price { flex: 1; }
.svc-edit-unit  { flex: 1; }
.svc-inp {
  width: 100%; padding: 6px 10px; font-size: .85rem;
  border-radius: 6px; border: 1px solid var(--glass-border);
  background: var(--glass-bg); color: var(--glass-text);
}
.svc-inp--num { max-width: 120px; }
.svc-del { background: none; border: none; color: var(--ds-error, var(--ds-error)); cursor: pointer; font-size: 1.1rem; padding: 4px 8px; }
.edit-actions { display: flex; gap: 4px; margin-left: 2px; }
.svc-mini {
  border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--glass-text);
  border-radius: 6px; width: 24px; height: 24px; padding: 0; line-height: 1; cursor: pointer; font-size: .72rem;
}
.svc-mini:hover { opacity: .8; }
.svc-add-btn { margin-top: 12px; }

/* ── Packages ── */
.pkg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.pkg-grid--brutalist,
.sub-grid--brutalist {
  gap: 0;
}
.pkg-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100%;
  padding: 22px 20px; border-radius: 14px;
  border: 1px solid var(--glass-border); transition: all .15s;
  cursor: pointer;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--ds-accent, #646cff) 14%, transparent), transparent 34%),
    color-mix(in srgb, var(--glass-text) 2%, transparent);
}
.pkg-card--brutalist,
.pkg-edit--brutalist,
.sub-card--brutalist,
.sub-edit--brutalist {
  border-radius: 0;
  border-color: color-mix(in srgb, var(--glass-text) 12%, transparent);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--glass-text) 4%, transparent), transparent 34%),
    color-mix(in srgb, var(--glass-text) 2%, transparent);
}
.pkg-card:hover  { border-color: color-mix(in srgb, var(--ds-accent) 30%, var(--glass-border)); }
.pkg-card.disabled { opacity: .4; }
.svc-card:focus-visible,
.pkg-card:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--ds-accent) 44%, transparent);
  outline-offset: 2px;
}
.pkg-card-head  { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }
.pkg-card-title { margin: 0 0 6px; font-size: 1.08rem; font-weight: 700; line-height: 1.1; }
.pkg-card-subtitle {
  margin: 0;
  font-size: .78rem;
  line-height: 1.45;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 58%, transparent);
}
.pkg-card-price { font-size: 1.35rem; font-weight: 800; color: var(--ds-accent, #646cff); white-space: nowrap; text-align: right; }
.pkg-card-price span { font-size: .75rem; font-weight: 400; opacity: .55; }
.pkg-card-desc  { margin: 0; font-size: .86rem; opacity: .66; line-height: 1.55; }
.pkg-card-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.pkg-metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}
.pkg-metric-label {
  font-size: .66rem;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 48%, transparent);
}
.pkg-metric strong {
  font-size: 1rem;
  color: color-mix(in srgb, var(--glass-text) 90%, transparent);
}
.pkg-card-services { display: flex; flex-wrap: wrap; gap: 6px; }
.pkg-svc-chip {
  font-size: .72rem; padding: 5px 10px; border-radius: 999px;
  background: color-mix(in srgb, var(--glass-text) 6%, transparent); opacity: .82;
}
.pkg-svc-chip--more {
  color: var(--ds-accent, #646cff);
  background: color-mix(in srgb, var(--ds-accent, #646cff) 10%, transparent);
}
.pkg-card-notes {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pkg-card-note {
  margin: 0;
  font-size: .78rem;
  line-height: 1.5;
  color: color-mix(in srgb, var(--glass-text) 74%, transparent);
}

.pkg-edit { padding: 20px 24px; border-radius: 12px; margin-bottom: 14px; }
.pkg-edit-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.pkg-title-inp { flex: 1; font-size: 1rem; font-weight: 600; }
.pkg-price-edit { display: flex; align-items: center; gap: 6px; }
.pkg-unit { font-size: .82rem; opacity: .55; }
.pkg-desc-inp { width: 100%; margin-bottom: 12px; }
.pkg-services-edit { margin-top: 8px; }
.pkg-services-edit strong { font-size: .85rem; margin-bottom: 8px; display: block; }
.pkg-svc-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-picker-subtitle {
  font-size: .64rem; text-transform: uppercase; letter-spacing: .08em;
  color: color-mix(in srgb, var(--glass-text) 52%, transparent); margin-bottom: 6px;
}
.pkg-tag-picker {
  border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--glass-text);
  border-radius: 999px; padding: 6px 12px; font-size: .78rem; font-weight: 600;
  cursor: pointer; transition: all .18s ease; font-family: inherit;
}
.pkg-tag-picker:hover { opacity: .9; }
.pkg-tag-picker--active {
  background: color-mix(in srgb, var(--ds-accent, #646cff) 14%, transparent);
  color: var(--ds-accent, #646cff);
  border-color: color-mix(in srgb, var(--ds-accent, #646cff) 40%, var(--glass-border));
}
.tag-shift-move, .tag-shift-enter-active, .tag-shift-leave-active { transition: all .22s ease; }
.tag-shift-enter-from, .tag-shift-leave-to { opacity: 0; transform: translateY(8px) scale(.97); }

/* ── Designer project cards ── */
.proj-card { padding: 22px 24px; border-radius: 14px; margin-bottom: 16px; }
.proj-card--brutalist {
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}
.proj-card-head { margin-bottom: 16px; }
.proj-card-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.proj-card-title { font-size: 1.1rem; font-weight: 600; }
.proj-card-meta { display: flex; gap: 16px; font-size: .82rem; opacity: .55; }
.proj-card-pkg   { color: var(--ds-accent-light, #a0a8ff); }
.proj-card-total { color: var(--ds-success, var(--ds-success)); font-weight: 600; }
.proj-section { margin-bottom: 14px; }
.proj-section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: .88rem; font-weight: 500; }
.proj-section-title { opacity: .55; }
.proj-add-btn {
  background: color-mix(in srgb, var(--ds-accent) 12%, transparent);
  border: none; color: var(--ds-accent-light, #a0a8ff);
  width: 26px; height: 26px; border-radius: 50%; cursor: pointer;
  font-size: .9rem; display: flex; align-items: center; justify-content: center;
}
.proj-people { display: flex; flex-wrap: wrap; gap: 8px; }
.proj-person {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 14px; border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent); font-size: .85rem;
}
.proj-person-name { font-weight: 500; }
.proj-person-info { opacity: .55; }
.proj-person-role { color: var(--ds-accent-light, #a0a8ff); font-size: .78rem; }
.proj-empty-mini { font-size: .82rem; opacity: .45; font-style: italic; }
.proj-notes { font-size: .85rem; opacity: .55; margin-top: 8px; padding-top: 10px; border-top: 1px solid var(--glass-border); }
.proj-total { display: flex; justify-content: space-between; padding: 14px 16px; border-radius: 10px; margin: 10px 0; font-size: 1.05rem; }
.proj-total strong { color: var(--ds-success, var(--ds-success)); font-size: 1.15rem; }

/* ── Subscriptions ── */
.sub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.sub-card-stack { display: flex; flex-direction: column; gap: 12px; }
.sub-card { padding: 22px 20px; border-radius: 14px; border: 1px solid var(--glass-border); transition: all .15s; }
.sub-card:hover   { border-color: color-mix(in srgb, var(--ds-accent) 30%, var(--glass-border)); }
.sub-card.disabled { opacity: .4; }
.sub-card--active {
  border-color: color-mix(in srgb, var(--ds-accent) 44%, var(--glass-border));
  background: color-mix(in srgb, var(--ds-accent) 5%, transparent);
}
.sub-card-head  { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.sub-card-title { font-size: 1.05rem; font-weight: 600; }
.sub-period-badge { font-size: .72rem; padding: 3px 10px; border-radius: 6px; background: color-mix(in srgb, var(--ds-accent) 12%, transparent); color: var(--ds-accent-light, #a0a8ff); white-space: nowrap; }
.sub-card-price-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; }
.sub-card-price { font-size: 1.3rem; font-weight: 700; color: var(--ds-accent, #646cff); }
.sub-card-price small { font-size: .7rem; font-weight: 400; opacity: .55; }
.sub-card-discount { font-size: .8rem; font-weight: 600; color: var(--ds-success, var(--ds-success)); background: rgba(52,211,153,.1); padding: 2px 8px; border-radius: 6px; }
.sub-card-effective { font-size: .82rem; color: var(--ds-success, var(--ds-success)); margin-bottom: 8px; }
.sub-card-desc { font-size: .85rem; opacity: .55; margin-bottom: 14px; line-height: 1.4; }
.sub-card-limits { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.sub-limit-chip { display: flex; align-items: center; gap: 4px; font-size: .75rem; padding: 3px 10px; border-radius: 6px; background: color-mix(in srgb, var(--glass-text) 6%, transparent); }
.sub-limit-key { opacity: .6; }
.sub-limit-val { font-weight: 600; }
.sub-card-monthly { display: flex; justify-content: space-between; padding: 10px 12px; border-radius: 8px; background: color-mix(in srgb, var(--ds-accent) 6%, transparent); margin-top: 10px; font-size: .82rem; }
.sub-m-label { opacity: .55; }
.sub-m-val { font-weight: 600; color: var(--ds-accent, #646cff); }

/* Subscription edit */
.sub-edit { padding: 20px 24px; border-radius: 12px; margin-bottom: 14px; }
.sub-edit-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.sub-edit-pricing { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 14px; align-items: end; }
.sub-effective-price { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; background: rgba(52,211,153,.06); font-size: .85rem; }
.sub-eff-label { opacity: .55; }
.sub-eff-val { font-weight: 600; color: var(--ds-success, var(--ds-success)); }
.sub-edit-limits { margin-bottom: 14px; }
.sub-edit-limits strong { font-size: .85rem; margin-bottom: 8px; display: block; }
.sub-limits-grid { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.sub-limit-row { display: flex; align-items: center; gap: 8px; }
.sub-limit-row .svc-inp { max-width: 160px; }
.sub-card-editor {
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--ds-accent) 26%, var(--glass-border));
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sub-card-editor--brutalist {
  border-radius: 0;
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}
.sub-card-editor__head,
.sub-card-editor__limits-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.sub-card-editor__eyebrow {
  font-size: .68rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 52%, transparent);
}
.sub-card-editor__title {
  display: block;
  margin-top: 4px;
  font-size: 1rem;
}
.svc-catalog {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0 0 18px;
}

.svc-catalog--brutalist {
  border-width: 2px;
}

.svc-catalog__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.svc-catalog__head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.svc-catalog__count,
.svc-catalog__note {
  font-size: .78rem;
  color: color-mix(in srgb, var(--glass-text) 62%, transparent);
}

.svc-catalog-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.svc-catalog-toolbar__search {
  margin: 0;
}

.svc-catalog-toolbar__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.svc-catalog__results {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: min(62vh, 860px);
  overflow-y: auto;
  padding-right: 4px;
}

.svc-catalog-row,
.pkg-service-picker {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  min-height: 44px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 86%, transparent);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color .18s ease, transform .18s ease, background-color .18s ease;
}

.svc-catalog-row:hover,
.pkg-service-picker:hover {
  border-color: color-mix(in srgb, var(--ds-accent, #646cff) 34%, var(--glass-border));
  transform: translateY(-1px);
}

.svc-catalog-row--brutalist {
  border-width: 2px;
}

.pkg-service-picker--active {
  border-color: color-mix(in srgb, var(--ds-accent, #646cff) 48%, var(--glass-border));
  background: color-mix(in srgb, var(--ds-accent, #646cff) 12%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ds-accent, #646cff) 12%, transparent);
}

.svc-catalog-row__main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex: 1 1 auto;
}

.svc-catalog-row__head,
.pkg-service-picker__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.svc-catalog-row__head {
  align-items: flex-start;
}

.svc-catalog-row__price {
  flex: 0 0 auto;
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: color-mix(in srgb, var(--glass-text) 62%, transparent);
}

.svc-catalog-row__title,
.pkg-service-picker__main strong {
  font-size: .95rem;
  line-height: 1.3;
}

.pkg-service-picker__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.svc-catalog-row__desc,
.pkg-service-picker__main span {
  font-size: .82rem;
  line-height: 1.45;
  color: color-mix(in srgb, var(--glass-text) 74%, transparent);
}

.svc-catalog-row__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: .76rem;
  line-height: 1.35;
  color: color-mix(in srgb, var(--glass-text) 72%, transparent);
}

.svc-catalog-row__tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 80%, transparent);
  text-transform: uppercase;
  letter-spacing: .08em;
}

.svc-catalog-row__action {
  flex: 0 0 auto;
  align-self: center;
  font-size: .72rem;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.svc-catalog__warning {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, #d97706 40%, var(--glass-border));
  background: color-mix(in srgb, #d97706 8%, transparent);
}

.svc-catalog__warning--brutalist {
  border-width: 2px;
}

.svc-catalog__warning strong,
.svc-template-switch__warning {
  font-size: .8rem;
  line-height: 1.45;
}

.svc-catalog__warning span,
.svc-template-switch__warning {
  color: color-mix(in srgb, var(--glass-text) 82%, transparent);
}

.svc-template-switch {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 86%, transparent);
}

.svc-template-switch--brutalist {
  border-width: 2px;
}

.svc-template-switch__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.svc-template-switch__copy strong {
  font-size: .92rem;
  line-height: 1.3;
}

.svc-template-switch__copy span {
  font-size: .78rem;
  line-height: 1.5;
  color: color-mix(in srgb, var(--glass-text) 68%, transparent);
}

.svc-template-switch__warning {
  margin: 8px 0 0;
}

.svc-catalog-pop-enter-active,
.svc-catalog-pop-leave-active {
  transition: opacity .18s ease, transform .18s ease;
}

.svc-catalog-pop-enter-from,
.svc-catalog-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.sub-card-editor__actions {
  display: flex;
  gap: 8px;
}
.sub-card-editor__limits {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Inline price editing ── */
.svc-price-inline { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; position: relative; }
.svc-price-inline:hover { color: var(--ds-accent, #646cff); }
.svc-price-edit-icon { opacity: 0; font-size: .7rem; transition: opacity .15s; }
.svc-price-inline:hover .svc-price-edit-icon { opacity: .5; }

/* ── Project admin link ── */
.proj-card-admin-link {
  text-decoration: none;
  color: var(--ds-accent, #646cff);
  font-weight: 600;
}
.proj-card-admin-link:hover { opacity: .8; }
.dash-project-card--link {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: border-color .15s;
}
.dash-project-card--link:hover {
  border-color: color-mix(in srgb, var(--ds-accent) 40%, var(--glass-border));
}

.cab-docs-list--brutalist {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.cab-doc-card--brutalist {
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

/* ── Responsive (designer-specific) ── */
@media (max-width: 980px) {
  .pkg-grid { grid-template-columns: 1fr; }
  .sub-grid { grid-template-columns: 1fr; }
  .gallery-grid { grid-template-columns: 1fr; }
  .ds-cab-hero-grid { grid-template-columns: 1fr; }
  .svc-list--cards { grid-template-columns: 1fr; }
}

/* ── Pivot banner (Flat Registry rows) ── */
.pivot-list { display: flex; flex-direction: column; gap: 8px; }
.pivot-banner {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-radius: 10px; cursor: pointer;
  border: 1px solid var(--glass-border); transition: all .15s;
}
.pivot-banner:hover {
  background: var(--glass-text); color: var(--glass-bg);
}
.pivot-banner:hover .pivot-banner-contact,
.pivot-banner:hover .pivot-banner-count { opacity: .7; }
.pivot-banner-left { display: flex; flex-direction: column; gap: 2px; }
.pivot-banner-right { display: flex; align-items: center; gap: 12px; }
.pivot-banner-name { font-weight: 600; font-size: .92rem; }
.pivot-banner-contact { font-size: .78rem; opacity: .55; }
.pivot-banner-count { font-size: .78rem; opacity: .55; }
.pivot-banner-arrow { font-size: 1.1rem; opacity: .5; }
.pivot-banner:hover .pivot-banner-arrow { opacity: 1; }

.pivot-banner--brutalist,
.gallery-card--brutalist {
  border-radius: 0;
  border-color: color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

/* ── Gallery grid (2 cols) ── */
.gallery-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.gallery-card { border-radius: 10px; overflow: hidden; border: 1px solid var(--glass-border); }
.gallery-card-img { aspect-ratio: 16/10; overflow: hidden; background: color-mix(in srgb, var(--glass-text) 4%, transparent); }
.gallery-card-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.gallery-card-body { padding: 10px 14px; display: flex; flex-direction: column; gap: 4px; }
.gallery-card-title { font-weight: 600; font-size: .88rem; }
.gallery-card-cat { font-size: .72rem; opacity: .5; text-transform: uppercase; letter-spacing: .05em; }
.gallery-card-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.gallery-tag {
  font-size: .66rem; padding: 2px 7px; border-radius: 5px;
  background: color-mix(in srgb, var(--glass-text) 6%, transparent); opacity: .7;
}
.gallery-card-feat { font-size: .7rem; font-weight: 600; opacity: .7; }

@media (max-width: 640px) {
  .svc-cat-head,
  .pkg-card-head,
  .svc-card-editor__grid { grid-template-columns: 1fr; }
  .svc-catalog__grid,
  .pkg-service-picker-list { grid-template-columns: 1fr; }
  .svc-card-topline,
  .pkg-card-topline {
    flex-direction: column;
    align-items: flex-start;
  }

  .svc-card-editor__head,
  .pkg-card-editor__services-head {
    flex-direction: column;
    align-items: stretch;
  }

  .svc-cat-stats {
    justify-content: flex-start;
  }

  .pkg-card-metrics {
    grid-template-columns: 1fr;
  }

  .ds-cab-hero-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .ds-cab-hero-facts {
    grid-template-columns: 1fr;
  }

  .ds-cab-hero-fact {
    border-right: 0;
  }

  .ds-cab-hero-fact:not(:last-child) {
    border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  }
}
</style>