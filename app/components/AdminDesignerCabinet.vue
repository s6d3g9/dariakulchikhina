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
                <button v-if="!services.length" class="a-btn-save" @click="initFromTemplates">
                  Загрузить шаблон (Москва)
                </button>
                <button class="a-btn-sm" :disabled="serviceCardSaving" @click="openServiceCatalog('create')">＋ Из каталога</button>
                <button class="a-btn-sm" :disabled="serviceCardSaving" @click="createServiceCard">＋ Своя услуга</button>
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
                  <button type="button" class="a-btn-sm" @click="closeServiceCatalog">закрыть</button>
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
                  <input v-model="serviceCatalogSearch" class="glass-input" placeholder="Название, описание, категория" />
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
              <div v-if="groupedServiceCatalogEntries.length" class="svc-catalog__groups">
                <section
                  v-for="group in groupedServiceCatalogEntries"
                  :key="`svc-catalog-group-${group.categoryKey}`"
                  class="svc-catalog-group"
                >
                  <div class="svc-catalog-group__head">
                    <div>
                      <div class="svc-cat-eyebrow">категория каталога</div>
                      <strong class="svc-catalog-group__title">{{ group.categoryLabel }}</strong>
                    </div>
                    <span class="svc-catalog-group__count">{{ getServiceCountLabel(group.entries.length) }}</span>
                  </div>
                  <div class="svc-catalog__grid">
                    <button
                      v-for="entry in group.entries"
                      :key="`svc-catalog-${entry.key}`"
                      type="button"
                      class="svc-catalog-card"
                      :class="{ 'svc-catalog-card--brutalist': isBrutalistDesignerCabinetMode }"
                      @click="selectServiceCatalogEntry(entry.key)"
                    >
                      <div class="svc-catalog-card__topline">
                        <span>{{ entry.category }}</span>
                        <span>{{ entry.price }}</span>
                      </div>
                      <strong class="svc-catalog-card__title">{{ entry.title }}</strong>
                      <p class="svc-catalog-card__desc">{{ entry.description }}</p>
                      <div class="svc-catalog-card__range">
                        <span>рынок</span>
                        <strong>{{ entry.priceRange }}</strong>
                      </div>
                      <span class="svc-catalog-card__action">{{ serviceCatalogMode === 'create' ? '[+ ДОБАВИТЬ В ПРАЙС]' : '[ ВЫБРАТЬ УСЛУГУ ]' }}</span>
                    </button>
                  </div>
                </section>
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
                            <input
                              v-model.number="inlinePriceVal"
                              class="glass-input glass-input--inline svc-price-inline-input"
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
                        <button type="button" class="a-btn-sm" :disabled="serviceCardSaving" @click="duplicateServiceCard(svc)">дублировать</button>
                        <button type="button" class="a-btn-sm" :disabled="serviceCardSaving" @click="moveServiceCard(svc, -1)">выше</button>
                        <button type="button" class="a-btn-sm" :disabled="serviceCardSaving" @click="moveServiceCard(svc, 1)">ниже</button>
                        <button type="button" class="a-btn-sm a-btn-danger" :disabled="serviceCardSaving" @click="removeServiceCard(svc)">удалить</button>
                        <button type="button" class="a-btn-sm" @click="closeServiceCardEditor">свернуть</button>
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
                          <button type="button" class="a-btn-sm" :disabled="serviceCardSaving" @click="openServiceCatalog('replace', svc)">выбрать из каталога</button>
                        </div>
                        <p v-if="serviceEditorUsage.total" class="svc-template-switch__warning">{{ formatServiceUsageHint(serviceEditorUsage) }}</p>
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Название</label>
                        <input v-model="serviceCardDraft.title" class="glass-input" placeholder="Название услуги" @blur="queueServiceCardSave" />
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Категория</label>
                        <select v-model="serviceCardDraft.category" class="glass-input" @change="queueServiceCardSave">
                          <option v-for="opt in SERVICE_CATEGORY_OPTIONS" :key="`svc-inline-${opt.value}`" :value="opt.value">{{ opt.label }}</option>
                        </select>
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Цена</label>
                        <input v-model.number="serviceCardDraft.price" type="number" min="0" class="glass-input" @blur="queueServiceCardSave" />
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Единица</label>
                        <select v-model="serviceCardDraft.unit" class="glass-input" @change="queueServiceCardSave">
                          <option v-for="unit in PRICE_UNITS_LIST" :key="`svc-inline-unit-${unit.value}`" :value="unit.value">{{ unit.label }}</option>
                        </select>
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Срок, дней</label>
                        <input v-model.number="serviceCardDraft.leadTimeDays" type="number" min="0" class="glass-input" @blur="queueServiceCardSave" />
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
                <button v-if="!packages.length" class="a-btn-save" @click="initPackages">
                  Загрузить стандартные пакеты
                </button>
                <button class="a-btn-sm" :disabled="packageCardSaving" @click="createPackageCard">＋ Пакет</button>
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
                      <button type="button" class="a-btn-sm" :disabled="packageCardSaving" @click="duplicatePackageCard(pkg)">дублировать</button>
                      <button type="button" class="a-btn-sm" :disabled="packageCardSaving" @click="movePackageCard(pkg, -1)">выше</button>
                      <button type="button" class="a-btn-sm" :disabled="packageCardSaving" @click="movePackageCard(pkg, 1)">ниже</button>
                      <button type="button" class="a-btn-sm a-btn-danger" :disabled="packageCardSaving" @click="removePackageCard(pkg)">удалить</button>
                      <button type="button" class="a-btn-sm" @click="closePackageCardEditor">свернуть</button>
                    </div>
                  </div>
                  <p v-if="packageCardError" class="cab-inline-error">{{ packageCardError }}</p>
                  <p v-if="packageEditorUsage.total" class="svc-template-switch__warning">{{ formatPackageUsageHint(packageEditorUsage) }}</p>
                  <div class="svc-card-editor__grid">
                    <div class="u-field">
                      <label class="u-field__label">Название пакета</label>
                        <input v-model="packageCardDraft.title" class="glass-input" placeholder="Название пакета" @blur="queuePackageCardSave" />
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Цена за м²</label>
                        <input v-model.number="packageCardDraft.pricePerSqm" type="number" min="0" class="glass-input" @blur="queuePackageCardSave" />
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
                <button v-if="!subscriptions.length" class="a-btn-save" @click="initSubs">
                  Загрузить шаблоны подписок
                </button>
                <button class="a-btn-sm" :disabled="subscriptionCardSaving" @click="createSubscriptionCard">＋ Подписка</button>
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
                        <button type="button" class="a-btn-sm" :disabled="subscriptionCardSaving" @click="duplicateSubscriptionCard(sub)">дублировать</button>
                        <button type="button" class="a-btn-sm" :disabled="subscriptionCardSaving" @click="moveSubscriptionCard(sub, -1)">выше</button>
                        <button type="button" class="a-btn-sm" :disabled="subscriptionCardSaving" @click="moveSubscriptionCard(sub, 1)">ниже</button>
                        <button type="button" class="a-btn-sm a-btn-danger" :disabled="subscriptionCardSaving" @click="removeSubscriptionCard(sub)">удалить</button>
                        <button type="button" class="a-btn-sm" @click="closeSubscriptionCardEditor">свернуть</button>
                      </div>
                    </div>
                    <p v-if="subscriptionCardError" class="cab-inline-error">{{ subscriptionCardError }}</p>
                    <div class="svc-card-editor__grid">
                      <div class="u-field">
                        <label class="u-field__label">Название</label>
                        <input v-model="subscriptionCardDraft.title" class="glass-input" placeholder="Название подписки" @blur="queueSubscriptionCardSave" />
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Период</label>
                        <select v-model="subscriptionCardDraft.billingPeriod" class="glass-input" @change="queueSubscriptionCardSave">
                          <option v-for="bp in BILLING_PERIODS_LIST" :key="`sub-inline-${bp.value}`" :value="bp.value">{{ bp.label }}</option>
                        </select>
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Цена</label>
                        <input v-model.number="subscriptionCardDraft.price" type="number" min="0" class="glass-input" @blur="queueSubscriptionCardSave" />
                      </div>
                      <div class="u-field">
                        <label class="u-field__label">Скидка</label>
                        <input v-model.number="subscriptionCardDraft.discount" type="number" min="0" max="100" class="glass-input" @blur="queueSubscriptionCardSave" />
                      </div>
                      <div class="u-field u-field--full">
                        <label class="u-field__label">Описание</label>
                        <textarea v-model="subscriptionCardDraft.description" class="glass-input u-ta" rows="3" placeholder="Что входит в подписку" @blur="queueSubscriptionCardSave" />
                      </div>
                    </div>
                    <div class="sub-card-editor__limits">
                      <div class="sub-card-editor__limits-head">
                        <strong>Лимиты</strong>
                        <button type="button" class="a-btn-sm" @click="addSubscriptionCardDraftLimit(); queueSubscriptionCardSave()">＋ лимит</button>
                      </div>
                      <div v-if="Object.keys(subscriptionCardDraft.limits || {}).length" class="sub-limits-grid">
                        <div v-for="(val, lk) in subscriptionCardDraft.limits" :key="`sub-inline-limit-${lk}`" class="sub-limit-row">
                          <input :value="lk" class="glass-input svc-inp" @change="renameSubscriptionDraftLimit(String(lk), ($event.target as HTMLInputElement).value); queueSubscriptionCardSave()" />
                          <input :value="val" class="glass-input svc-inp svc-inp--num" type="number" min="0" @blur="queueSubscriptionCardSave" @input="updateSubscriptionDraftLimit(String(lk), Number(($event.target as HTMLInputElement).value))" />
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
                <input v-model="designerDocSearch" class="glass-input" placeholder="Название, заметка" />
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
                  <input v-model="newDesignerDocTitle" class="glass-input" placeholder="Название документа" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Категория</label>
                  <select v-model="newDesignerDocCategory" class="glass-input">
                    <option v-for="dc in DESIGNER_DOC_CATEGORIES" :key="dc.value" :value="dc.value">{{ dc.label }}</option>
                  </select>
                </div>
                <div class="u-field u-field--full">
                  <label class="u-field__label">Примечание</label>
                  <input v-model="newDesignerDocNotes" class="glass-input" placeholder="Необязательно" />
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
              <button class="a-btn-save" @click="showNewProjectModal = true">＋ Новый проект</button>
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
                  <input v-model="newProject.title" class="glass-input" placeholder="Квартира на Арбате" @input="newProject.slug = autoSlug(newProject.title)" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Slug (URL)</label>
                  <input v-model="newProject.slug" class="glass-input" placeholder="kvartira-na-arbate" />
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
                    <input v-model.number="newProject.pricePerSqm" class="glass-input" type="number" min="0" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Площадь (м²)</label>
                    <input v-model.number="newProject.area" class="glass-input" type="number" min="0" />
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
                <button
                  class="a-btn-save"
                  :disabled="creatingProject || !newProject.title.trim() || !newProject.slug.trim()"
                  @click="doCreateProject"
                >{{ creatingProject ? 'Создание…' : 'Создать проект' }}</button>
                <button class="a-btn-sm" @click="showNewProjectModal = false">Отмена</button>
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
                  <button type="button" class="a-btn-sm" @click="startEditDesignerProject(dp)">редактировать</button>
                  <NuxtLink v-if="dp.projectSlug" :to="`/admin/projects/${dp.projectSlug}`" class="a-btn-sm proj-card-admin-link">→ управление проектом</NuxtLink>
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
                      <input v-model="projectEdit.title" class="glass-input" @blur="queueProjectEditSave" />
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
                      <input v-model.number="projectEdit.pricePerSqm" type="number" min="0" class="glass-input" @blur="queueProjectEditSave" />
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Площадь (м²)</label>
                      <input v-model.number="projectEdit.area" type="number" min="0" class="glass-input" @blur="queueProjectEditSave" />
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Итого</label>
                      <input :value="((projectEdit.pricePerSqm || 0) * (projectEdit.area || 0)).toLocaleString('ru-RU') + ' ₽'" class="glass-input" readonly />
                    </div>
                  </div>
                  <div class="u-field" style="margin-top:8px">
                    <label class="u-field__label">Примечание</label>
                    <textarea v-model="projectEdit.notes" class="glass-input u-ta" rows="2" @blur="queueProjectEditSave" />
                  </div>
                </div>
                <div class="u-modal__foot">
                  <span class="cab-autosave-status" :class="autosaveStatusClass(projectEditState)">{{ autosaveStatusLabel(projectEditState) }}</span>
                  <button type="button" class="a-btn-sm" @click="cancelEditDesignerProject">свернуть</button>
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
                    <input v-model="form.name" class="glass-input" required @blur="queueProfileAutosave" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Компания</label>
                    <input v-model="form.companyName" class="glass-input" placeholder="ООО / ИП…" @blur="queueProfileAutosave" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Телефон</label>
                    <input v-model="form.phone" class="glass-input" type="tel" placeholder="+7 (___) ___-__-__" @blur="queueProfileAutosave" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Email</label>
                    <input v-model="form.email" class="glass-input" type="email" placeholder="mail@example.com" @blur="queueProfileAutosave" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Telegram</label>
                    <input v-model="form.telegram" class="glass-input" placeholder="@username" @blur="queueProfileAutosave" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Сайт / портфолио</label>
                    <input v-model="form.website" class="glass-input" placeholder="https://…" @blur="queueProfileAutosave" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Город</label>
                    <input v-model="form.city" class="glass-input" placeholder="Москва" @blur="queueProfileAutosave" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Опыт работы</label>
                    <input v-model="form.experience" class="glass-input" placeholder="10 лет" @blur="queueProfileAutosave" />
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
            <button type="button" class="a-btn-sm" @click="move('prev')">← экран</button>
            <button type="button" class="a-btn-sm" @click="move('next')">{{ pagerNextLabel }}</button>
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
  getDesignerServicePersistedKey,
  getDesignerSubscriptionPersistedKey,
  normalizeDesignerPackages,
  normalizeDesignerServices,
  normalizeDesignerSubscriptions,
} from '~~/shared/utils/designer-catalogs'
import type { Wipe2EntityData } from '~/shared/types/wipe2'
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
const DESIGNER_DOC_CATEGORIES: { value: string; label: string }[] = [
  { value: 'contract', label: 'Договор' },
  { value: 'tz', label: 'ТЗ' },
  { value: 'invoice', label: 'Счёт' },
  { value: 'act', label: 'Акт' },
  { value: 'reference', label: 'Референс' },
  { value: 'other', label: 'Другое' },
]

const { data: designerDocs, refresh: refreshDesignerDocs } = await useFetch<any[]>(
  () => `/api/designers/${props.designerId}/documents`,
  { default: () => [], watch: [designerIdRef] },
)

const { data: linkedData } = await useFetch<any>(
  () => `/api/designers/${props.designerId}/linked-entities`,
  { default: () => ({ sellers: [], managers: [], gallery: [], moodboards: [] }), watch: [designerIdRef] },
)
const designerDocUploading = ref(false)
const newDesignerDocTitle = ref('')
const newDesignerDocCategory = ref('other')
const newDesignerDocNotes = ref('')
const designerDocSearch = ref('')
const designerDocFilter = ref('')
const designerDocSort = ref<'new' | 'old'>('new')

const filteredDesignerDocs = computed(() => {
  const rows = designerDocs.value || []
  const q = designerDocSearch.value.trim().toLowerCase()
  return rows.filter((doc: any) => {
    const byCategory = !designerDocFilter.value || doc.category === designerDocFilter.value
    if (!byCategory) return false
    if (!q) return true
    const hay = `${doc.title || ''} ${doc.notes || ''} ${doc.category || ''}`.toLowerCase()
    return hay.includes(q)
  }).slice().sort((a: any, b: any) => {
    const at = new Date(a.createdAt || 0).getTime()
    const bt = new Date(b.createdAt || 0).getTime()
    return designerDocSort.value === 'new' ? bt - at : at - bt
  })
})

const showBrutalistDashboardHero = computed(() => isBrutalistDesignerCabinetMode.value && section.value === 'dashboard')
const designerHeroSubtitle = computed(() => {
  const city = designer.value?.city ? ` · ${designer.value.city}` : ''
  return `дизайнер интерьеров${city}`
})
const designerDashboardFacts = computed(() => [
  { label: 'профиль', value: `${profilePct.value}%` },
  { label: 'активные проекты', value: String(dashStats.value.active) },
  { label: 'клиенты', value: String(uniqueClients.value.length) },
  { label: 'услуги', value: String(services.value.length) },
])

function formatDocDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('ru-RU')
}

const profileSpecDirty = ref(false)
const renderedProfileSpecializations = computed(() => (
  profileSpecDirty.value
    ? form.specializations
    : (Array.isArray(designer.value?.specializations) ? designer.value.specializations : form.specializations)
))

watch(() => designer.value?.specializations, () => {
  profileSpecDirty.value = false
}, { immediate: true, deep: true })

function toggleSpec(sp: string) {
  profileSpecDirty.value = true
  const idx = form.specializations.indexOf(sp)
  if (idx >= 0) form.specializations.splice(idx, 1)
  else form.specializations.push(sp)
  queueProfileAutosave()
}

const profileSaveState = ref<InlineAutosaveState>('')
const profileSnapshot = ref('')
let profileSaveTimer: ReturnType<typeof setTimeout> | null = null

function clearProfileSaveTimer() {
  if (!profileSaveTimer) return
  clearTimeout(profileSaveTimer)
  profileSaveTimer = null
}

function serializeProfileForm() {
  return JSON.stringify({
    name: form.name,
    companyName: form.companyName,
    phone: form.phone,
    email: form.email,
    telegram: form.telegram,
    website: form.website,
    city: form.city,
    experience: form.experience,
    about: form.about,
    specializations: [...form.specializations],
  })
}

async function autoSaveProfile() {
  clearProfileSaveTimer()
  profileSaveState.value = 'saving'
  try {
    const nextSnapshot = serializeProfileForm()
    await saveProfile()
    profileSnapshot.value = nextSnapshot
    profileSaveState.value = 'saved'
    setAutosaveSettled(profileSaveState, 'saved')
  } catch (error) {
    profileSaveState.value = 'error'
  }
}

function queueProfileAutosave() {
  if (!designer.value) return
  const nextSnapshot = serializeProfileForm()
  if (nextSnapshot === profileSnapshot.value) return
  clearProfileSaveTimer()
  profileSaveTimer = setTimeout(() => {
    autoSaveProfile()
  }, 120)
}

watch(designerIdRef, async () => {
  clearProfileSaveTimer()
  await nextTick()
  profileSnapshot.value = serializeProfileForm()
  profileSaveState.value = ''
}, { immediate: true })

// ── Linked entities (pivot lists) ──

const uniqueClients = computed(() => {
  const map = new Map<number, { id: number; name: string; phone: string | null; email: string | null }>()
  for (const dp of designerProjects.value) {
    for (const c of (dp.clients || [])) {
      if (!map.has(c.id)) map.set(c.id, c)
    }
  }
  return [...map.values()]
})

const uniqueContractors = computed(() => {
  const map = new Map<number, { id: number; name: string; role: string | null }>()
  for (const dp of designerProjects.value) {
    for (const c of (dp.contractors || [])) {
      if (!map.has(c.id)) map.set(c.id, c)
    }
  }
  return [...map.values()]
})

const galleryList = computed(() => linkedData.value?.gallery || [])
const moodboardList = computed(() => linkedData.value?.moodboards || [])

function pluralProjects(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'проект'
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'проекта'
  return 'проектов'
}

// ── Pivot navigation to entity cabinets ──
const { drillToEntityCabinet, setCabinetCounts } = useAdminNav()

function goToClient(id: number, name?: string) {
  drillToEntityCabinet('clients', id, name)
}
function goToContractor(id: number, name?: string) {
  drillToEntityCabinet('contractors', id, name)
}
function goToSeller(id: number, name?: string) {
  drillToEntityCabinet('sellers', id, name)
}
function goToManager(id: number, name?: string) {
  drillToEntityCabinet('managers', id, name)
}

// ── Sidebar counters (N) ──
watch([designerProjects, linkedData], () => {
  setCabinetCounts({
    des_projects:    designerProjects.value.length,
    des_clients:     uniqueClients.value.length,
    des_contractors: uniqueContractors.value.length,
    des_sellers:     linkedData.value?.sellers?.length ?? 0,
    des_managers:    linkedData.value?.managers?.length ?? 0,
    des_gallery:     galleryList.value.length,
    des_moodboards:  moodboardList.value.length,
  })
}, { immediate: true })

// ── Services editing ──

const svcEditError = ref('')
const svcEditSuccess = ref('')

// ── Inline price editing ──
const inlinePriceKey = ref<string | null>(null)
const inlinePriceVal = ref(0)

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

function getServicePersistedKey(service: DesignerServicePrice, index = services.value.findIndex((item) => item === service)) {
  return getDesignerServicePersistedKey(service, Math.max(index, 0))
}

function getServiceActionKey(service: DesignerServicePrice, index = services.value.findIndex((item) => item === service)) {
  return getServicePersistedKey(service, index)
}

function findServiceByActionKey(actionKey: string) {
  return services.value.find((item, index) => getServicePersistedKey(item, index) === actionKey) || null
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

function startInlinePrice(svc: DesignerServicePrice) {
  const actionKey = getServiceActionKey(svc)
  if (inlinePriceKey.value === actionKey) return
  inlinePriceKey.value = actionKey
  inlinePriceVal.value = svc.price
  nextTick(() => {
    const inp = document.querySelector('.svc-price-inline-input') as HTMLInputElement
    inp?.focus()
    inp?.select()
  })
}
function cancelInlinePrice() {
  inlinePriceKey.value = null
}
async function commitInlinePrice(svc: DesignerServicePrice) {
  if (inlinePriceKey.value !== getServiceActionKey(svc)) return
  const newPrice = Math.max(0, Number(inlinePriceVal.value) || 0)
  inlinePriceKey.value = null
  if (newPrice === svc.price) return
  const updated = services.value.map(s =>
    s.serviceKey === svc.serviceKey ? { ...s, price: newPrice } : { ...s }
  )
  await saveServices(updated)
}

function normalizeServicesForSave(list: DesignerServicePrice[]): { ok: true; list: DesignerServicePrice[] } | { ok: false; error: string } {
  const cleaned = normalizeDesignerServices(list)
    .filter(item => item.title || item.description || item.price > 0)

  if (!cleaned.length) {
    return { ok: false, error: 'Добавьте хотя бы одну услугу с названием' }
  }

  const seen = new Set<string>()
  for (const item of cleaned) {
    if (!item.title) return { ok: false, error: 'У всех услуг должно быть заполнено название' }
    if (seen.has(item.serviceKey)) return { ok: false, error: 'Найдены дубли услуг, удалите повторения' }
    seen.add(item.serviceKey)
  }

  return { ok: true, list: cleaned }
}
async function initFromTemplates() {
  const list = initServicesFromTemplates()
  await saveServices(list)
  const pkgs = initPackagesFromTemplates()
  await savePackages(pkgs)
}

// ── Packages editing ──

const pkgEditError = ref('')
const pkgEditSuccess = ref('')

const allServiceOptions = computed(() => {
  return services.value
    .map((service, index) => ({
      key: getServicePersistedKey(service, index),
      title: getServiceDisplayTitle(service, index),
      category: getServiceCategoryLabel(service),
      price: formatServicePrice(service.price, service.unit),
      leadTime: getServiceLeadTimeLabel(service),
    }))
    .sort((left, right) => {
      const categoryDiff = left.category.localeCompare(right.category, 'ru')
      if (categoryDiff !== 0) return categoryDiff
      return left.title.localeCompare(right.title, 'ru')
    })
})

const serviceCatalogOpen = ref(false)
const serviceCatalogSearch = ref('')
const serviceCatalogCategory = ref<'all' | DesignerServiceCategory>('all')
const serviceCatalogMode = ref<'create' | 'replace'>('create')
const serviceCatalogTargetKey = ref<string | null>(null)

const filteredServiceCatalogEntries = computed(() => {
  const usedKeys = new Set(services.value.map((service, index) => getServicePersistedKey(service, index)))
  if (serviceCatalogMode.value === 'replace' && serviceCatalogTargetKey.value) {
    usedKeys.delete(serviceCatalogTargetKey.value)
  }

  const search = serviceCatalogSearch.value.trim().toLowerCase()

  return DESIGNER_SERVICE_TEMPLATES
    .filter((template) => !usedKeys.has(template.key))
    .map((template) => ({
      key: template.key,
      categoryKey: template.category,
      title: template.title,
      description: template.description,
      category: DESIGNER_SERVICE_CATEGORY_LABELS[template.category],
      price: formatServicePrice(template.defaultPrice, template.defaultUnit),
      priceRange: formatServiceTemplateRange(template),
    }))
    .filter((entry) => {
      if (serviceCatalogCategory.value !== 'all' && entry.categoryKey !== serviceCatalogCategory.value) return false
      if (!search) return true
      const haystack = `${entry.title} ${entry.description} ${entry.category}`.toLowerCase()
      return haystack.includes(search)
    })
    .sort((left, right) => {
      const categoryDiff = left.category.localeCompare(right.category, 'ru')
      if (categoryDiff !== 0) return categoryDiff
      return left.title.localeCompare(right.title, 'ru')
    })
})

const groupedServiceCatalogEntries = computed(() => {
  return SERVICE_CATEGORY_OPTIONS
    .map((option) => ({
      categoryKey: option.value,
      categoryLabel: option.label,
      entries: filteredServiceCatalogEntries.value.filter((entry) => entry.categoryKey === option.value),
    }))
    .filter((group) => group.entries.length > 0)
})

const EMPTY_SERVICE_USAGE = {
  packageTitles: [] as string[],
  subscriptionTitles: [] as string[],
  total: 0,
}

const EMPTY_PACKAGE_USAGE = {
  projectTitles: [] as string[],
  total: 0,
}

const serviceCatalogTargetUsage = computed(() => {
  if (serviceCatalogMode.value !== 'replace' || !serviceCatalogTargetKey.value) return EMPTY_SERVICE_USAGE
  return getServiceUsageInfo(serviceCatalogTargetKey.value)
})

const serviceEditorUsage = computed(() => {
  if (!serviceCardEditorKey.value) return EMPTY_SERVICE_USAGE
  return getServiceUsageInfo(serviceCardEditorKey.value)
})

const packageEditorUsage = computed(() => {
  if (!packageCardEditorKey.value) return EMPTY_PACKAGE_USAGE
  return getPackageUsageInfo(packageCardEditorKey.value)
})

function normalizePackagesForSave(list: DesignerPackage[]): { ok: true; list: DesignerPackage[] } | { ok: false; error: string } {
  const cleaned = normalizeDesignerPackages(list)
    .filter(pkg => pkg.title || pkg.pricePerSqm > 0 || pkg.serviceKeys.length > 0)

  if (!cleaned.length) {
    return { ok: false, error: 'Добавьте хотя бы один пакет' }
  }

  const seen = new Set<string>()
  for (const pkg of cleaned) {
    if (!pkg.title) return { ok: false, error: 'У всех пакетов должно быть заполнено название' }
    if (seen.has(pkg.key)) return { ok: false, error: 'Найдены дубли пакетов, удалите повторения' }
    seen.add(pkg.key)
  }

  return { ok: true, list: cleaned }
}
async function initPackages() {
  const pkgs = initPackagesFromTemplates()
  await savePackages(pkgs)
}

// ── Card editors (view mode) ──

const serviceCardEditorKey = ref<string | null>(null)
const serviceCardDraft = ref<DesignerServicePrice | null>(null)
const serviceCardSaving = ref(false)
const serviceCardError = ref('')
const serviceCardSaveState = ref<InlineAutosaveState>('')
const serviceCardSnapshot = ref('')
let serviceCardTimer: ReturnType<typeof setTimeout> | null = null

const packageCardEditorKey = ref<string | null>(null)
const packageCardDraft = ref<DesignerPackage | null>(null)
const packageCardSaving = ref(false)
const packageCardError = ref('')
const packageCardSaveState = ref<InlineAutosaveState>('')
const packageCardSnapshot = ref('')
let packageCardTimer: ReturnType<typeof setTimeout> | null = null

const subscriptionCardEditorKey = ref<string | null>(null)
const subscriptionCardDraft = ref<DesignerSubscription | null>(null)
const subscriptionCardSaving = ref(false)
const subscriptionCardError = ref('')
const subscriptionCardSaveState = ref<InlineAutosaveState>('')
const subscriptionCardSnapshot = ref('')
let subscriptionCardTimer: ReturnType<typeof setTimeout> | null = null

function clearServiceCardTimer() {
  if (!serviceCardTimer) return
  clearTimeout(serviceCardTimer)
  serviceCardTimer = null
}

function clearPackageCardTimer() {
  if (!packageCardTimer) return
  clearTimeout(packageCardTimer)
  packageCardTimer = null
}

function clearSubscriptionCardTimer() {
  if (!subscriptionCardTimer) return
  clearTimeout(subscriptionCardTimer)
  subscriptionCardTimer = null
}

function setAutosaveSettled(state: { value: InlineAutosaveState }, expected: InlineAutosaveState) {
  setTimeout(() => {
    if (state.value === expected) state.value = ''
  }, 2200)
}

function buildCustomServiceDraft(): DesignerServicePrice {
  const id = makeEditorId()
  return {
    serviceKey: `custom_${id}`,
    title: 'Новая услуга',
    description: '',
    category: 'additional',
    unit: 'fixed',
    price: 0,
    leadTimeDays: 0,
    enabled: true,
  }
}

function buildCatalogServiceDraft(templateKey: string): DesignerServicePrice | null {
  const template = DESIGNER_SERVICE_TEMPLATES.find((item) => item.key === templateKey)
  if (!template) return null
  return {
    serviceKey: template.key,
    title: template.title,
    description: template.description,
    category: template.category,
    unit: template.defaultUnit,
    price: template.defaultPrice,
    leadTimeDays: 0,
    enabled: true,
  }
}

function buildCustomPackageDraft(): DesignerPackage {
  const id = makeEditorId()
  return {
    key: `custom_package_${id}`,
    title: 'Новый пакет',
    description: '',
    serviceKeys: [],
    pricePerSqm: 0,
    enabled: true,
  }
}

function buildCustomSubscriptionDraft(): DesignerSubscription {
  const id = makeEditorId()
  return {
    key: `custom_sub_${id}`,
    title: 'Новая подписка',
    description: '',
    billingPeriod: 'monthly',
    price: 0,
    discount: 0,
    serviceKeys: [],
    limits: {},
    enabled: true,
  }
}

function closeServiceCardEditor() {
  clearServiceCardTimer()
  serviceCardEditorKey.value = null
  serviceCardDraft.value = null
  serviceCardError.value = ''
  serviceCardSaveState.value = ''
  serviceCardSnapshot.value = ''
  if (serviceCatalogMode.value === 'replace') closeServiceCatalog()
}

function openServiceCardEditor(service: DesignerServicePrice) {
  packageCardEditorKey.value = null
  packageCardDraft.value = null
  packageCardError.value = ''
  subscriptionCardEditorKey.value = null
  subscriptionCardDraft.value = null
  subscriptionCardError.value = ''
  serviceCardEditorKey.value = getServiceActionKey(service)
  serviceCardDraft.value = {
    ...cloneDraft(service),
    serviceKey: getServicePersistedKey(service),
  }
  serviceCardError.value = ''
  serviceCardSaveState.value = ''
  serviceCardSnapshot.value = JSON.stringify(serviceCardDraft.value)
}

function toggleServiceCardEditor(service: DesignerServicePrice) {
  if (serviceCardEditorKey.value === getServiceActionKey(service)) {
    closeServiceCardEditor()
    return
  }
  openServiceCardEditor(service)
}

function openServiceCatalog(mode: 'create' | 'replace', service?: DesignerServicePrice) {
  if (mode === 'replace' && !service && !serviceCardDraft.value) return
  serviceCatalogMode.value = mode
  serviceCatalogSearch.value = ''
  serviceCatalogCategory.value = 'all'
  serviceCatalogTargetKey.value = mode === 'replace'
    ? (service ? getServiceActionKey(service) : serviceCardEditorKey.value)
    : null
  serviceCatalogOpen.value = true
}

function closeServiceCatalog() {
  serviceCatalogOpen.value = false
  serviceCatalogSearch.value = ''
  serviceCatalogCategory.value = 'all'
  serviceCatalogTargetKey.value = null
  if (serviceCardError.value === 'Выберите другую услугу: этот шаблон уже занят в прайсе') {
    serviceCardError.value = ''
  }
  serviceCatalogMode.value = 'create'
}

function applyCatalogTemplateToDraft(templateKey: string) {
  if (!serviceCardDraft.value) return
  const template = DESIGNER_SERVICE_TEMPLATES.find((item) => item.key === templateKey)
  if (!template) return

  const occupied = services.value.find((item, index) => {
    const persistedKey = getServicePersistedKey(item, index)
    return persistedKey === templateKey && persistedKey !== serviceCatalogTargetKey.value
  })
  if (occupied) {
    serviceCardError.value = 'Выберите другую услугу: этот шаблон уже занят в прайсе'
    serviceCardSaveState.value = 'error'
    return
  }

  serviceCardDraft.value = {
    ...serviceCardDraft.value,
    serviceKey: template.key,
    title: template.title,
    description: template.description,
    category: template.category,
    unit: template.defaultUnit,
    price: template.defaultPrice,
  }
  serviceCardError.value = ''
  queueServiceCardSave()
  closeServiceCatalog()
}

function confirmServiceTemplateReplacement() {
  const usage = serviceCatalogTargetUsage.value
  if (!usage.total) return true

  const scopes = []
  if (usage.packageTitles.length) scopes.push(`Пакеты: ${formatUsageNames(usage.packageTitles)}`)
  if (usage.subscriptionTitles.length) scopes.push(`Подписки: ${formatUsageNames(usage.subscriptionTitles)}`)

  return confirm([
    'Эта услуга уже используется в пакетах или подписках.',
    ...scopes,
    '',
    'Заменить типовую услугу и автоматически обновить все связанные ссылки?',
  ].join('\n'))
}

function selectServiceCatalogEntry(templateKey: string) {
  if (serviceCatalogMode.value === 'replace') {
    if (!confirmServiceTemplateReplacement()) return
    applyCatalogTemplateToDraft(templateKey)
    return
  }
  void addServiceFromCatalog(templateKey)
  closeServiceCatalog()
}

async function saveServiceCardEditor() {
  if (!serviceCardDraft.value) return
  clearServiceCardTimer()
  serviceCardError.value = ''
  const activeKey = serviceCardEditorKey.value
  const activeIndex = services.value.findIndex((item) => getServiceActionKey(item) === activeKey)
  const draft = cloneDraft(serviceCardDraft.value)
  const updatedList = services.value.map((item) => (
    getServiceActionKey(item) === activeKey
      ? draft
      : cloneDraft(item)
  ))
  const normalized = normalizeServicesForSave(updatedList)
  if (!normalized.ok) {
    serviceCardError.value = normalized.error
    serviceCardSaveState.value = 'error'
    return
  }
  serviceCardSaving.value = true
  serviceCardSaveState.value = 'saving'
  try {
    const nextEditorItem = activeIndex >= 0 ? normalized.list[activeIndex] : draft
    const nextSelectionKey = activeIndex >= 0
      ? getServicePersistedKey(nextEditorItem, activeIndex)
      : draft.serviceKey

    if (activeKey && nextSelectionKey && activeKey !== nextSelectionKey) {
      const nextPackages = packages.value.map((pkg) => ({
        ...cloneDraft(pkg),
        serviceKeys: (pkg.serviceKeys || []).map((key) => key === activeKey ? nextSelectionKey : key),
      }))
      const nextSubscriptions = subscriptions.value.map((subscription) => ({
        ...cloneDraft(subscription),
        serviceKeys: (subscription.serviceKeys || []).map((key) => key === activeKey ? nextSelectionKey : key),
      }))
      await savePricingCatalog({
        services: normalized.list,
        packages: nextPackages,
        subscriptions: nextSubscriptions,
      })
    } else {
      await saveServices(normalized.list)
    }

    serviceCardEditorKey.value = nextSelectionKey
    serviceCatalogTargetKey.value = nextSelectionKey
    serviceCardSnapshot.value = JSON.stringify(nextEditorItem)
    serviceCardSaveState.value = 'saved'
    setAutosaveSettled(serviceCardSaveState, 'saved')
  } catch (error: any) {
    serviceCardError.value = getRequestErrorMessage(error, 'Не удалось сохранить услугу')
    serviceCardSaveState.value = 'error'
  } finally {
    serviceCardSaving.value = false
  }
}

function queueServiceCardSave() {
  if (!serviceCardDraft.value || !serviceCardEditorKey.value) return
  const nextSnapshot = JSON.stringify(serviceCardDraft.value)
  if (nextSnapshot === serviceCardSnapshot.value) return
  clearServiceCardTimer()
  serviceCardTimer = setTimeout(() => {
    saveServiceCardEditor()
  }, 120)
}

async function createServiceCard() {
  svcEditError.value = ''
  const draft = buildCustomServiceDraft()
  serviceCardSaving.value = true
  try {
    await saveServices([...services.value.map((item) => cloneDraft(item)), draft])
    showTransientMessage(svcEditSuccess, 'Услуга добавлена')
    await nextTick()
    openServiceCardEditor(findServiceByActionKey(draft.serviceKey) || draft)
  } catch (error: any) {
    svcEditError.value = getRequestErrorMessage(error, 'Не удалось добавить услугу')
  } finally {
    serviceCardSaving.value = false
  }
}

async function addServiceFromCatalog(templateKey: string) {
  svcEditError.value = ''
  const existing = findServiceByActionKey(templateKey)
  if (existing) {
    openServiceCardEditor(existing)
    return
  }

  const draft = buildCatalogServiceDraft(templateKey)
  if (!draft) return

  serviceCardSaving.value = true
  try {
    await saveServices([...services.value.map((item) => cloneDraft(item)), draft])
    showTransientMessage(svcEditSuccess, 'Услуга добавлена из каталога')
    await nextTick()
    openServiceCardEditor(findServiceByActionKey(templateKey) || draft)
  } catch (error: any) {
    svcEditError.value = getRequestErrorMessage(error, 'Не удалось добавить услугу из каталога')
  } finally {
    serviceCardSaving.value = false
  }
}

async function duplicateServiceCard(service: DesignerServicePrice) {
  svcEditError.value = ''
  const source = serviceCardDraft.value && serviceCardEditorKey.value === getServiceActionKey(service)
    ? cloneDraft(serviceCardDraft.value)
    : cloneDraft(service)
  const list = services.value.map((item) => cloneDraft(item))
  const index = services.value.findIndex((item) => getServiceActionKey(item) === getServiceActionKey(service))
  if (index < 0) return
  source.serviceKey = `${service.serviceKey || 'service'}_copy_${makeEditorId()}`
  source.title = source.title ? `${source.title} (копия)` : 'Новая услуга'
  serviceCardSaving.value = true
  try {
    list.splice(index + 1, 0, source)
    await saveServices(list)
    showTransientMessage(svcEditSuccess, 'Услуга продублирована')
    await nextTick()
    openServiceCardEditor(findServiceByActionKey(source.serviceKey) || source)
  } catch (error: any) {
    svcEditError.value = getRequestErrorMessage(error, 'Не удалось продублировать услугу')
  } finally {
    serviceCardSaving.value = false
  }
}

async function moveServiceCard(service: DesignerServicePrice, direction: -1 | 1) {
  svcEditError.value = ''
  const index = services.value.findIndex((item) => getServiceActionKey(item) === getServiceActionKey(service))
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= services.value.length) return
  const list = services.value.map((item) => cloneDraft(item))
  const [moved] = list.splice(index, 1)
  list.splice(targetIndex, 0, moved)
  serviceCardSaving.value = true
  try {
    await saveServices(list)
    showTransientMessage(svcEditSuccess, 'Порядок услуг обновлён')
    await nextTick()
    openServiceCardEditor(findServiceByActionKey(getServiceActionKey(service)) || moved)
  } catch (error: any) {
    svcEditError.value = getRequestErrorMessage(error, 'Не удалось изменить порядок услуг')
  } finally {
    serviceCardSaving.value = false
  }
}

async function removeServiceCard(service: DesignerServicePrice) {
  svcEditError.value = ''
  serviceCardSaving.value = true
  try {
    const removedKey = getServiceActionKey(service)
    const nextServices = services.value
      .filter((item) => getServiceActionKey(item) !== removedKey)
      .map((item) => cloneDraft(item))
    const nextPackages = packages.value.map((pkg) => ({
      ...cloneDraft(pkg),
      serviceKeys: (pkg.serviceKeys || []).filter((key) => key !== removedKey),
    }))
    const nextSubscriptions = subscriptions.value.map((subscription) => ({
      ...cloneDraft(subscription),
      serviceKeys: (subscription.serviceKeys || []).filter((key) => key !== removedKey),
    }))
    const cleanedReferences =
      nextPackages.some((pkg, index) => (pkg.serviceKeys || []).length !== (packages.value[index]?.serviceKeys || []).length)
      || nextSubscriptions.some((subscription, index) => (subscription.serviceKeys || []).length !== (subscriptions.value[index]?.serviceKeys || []).length)

    await savePricingCatalog({
      services: nextServices,
      packages: nextPackages,
      subscriptions: nextSubscriptions,
    })
    closeServiceCardEditor()
    showTransientMessage(svcEditSuccess, cleanedReferences ? 'Услуга удалена и убрана из пакетов и подписок' : 'Услуга удалена')
  } catch (error: any) {
    svcEditError.value = getRequestErrorMessage(error, 'Не удалось удалить услугу')
  } finally {
    serviceCardSaving.value = false
  }
}

function closePackageCardEditor() {
  clearPackageCardTimer()
  packageCardEditorKey.value = null
  packageCardDraft.value = null
  packageCardError.value = ''
  packageCardSaveState.value = ''
  packageCardSnapshot.value = ''
}

function openPackageCardEditor(pkg: DesignerPackage) {
  closeServiceCardEditor()
  closeSubscriptionCardEditor()
  packageCardEditorKey.value = getPackageActionKey(pkg)
  packageCardDraft.value = {
    ...cloneDraft(pkg),
    key: getPackagePersistedKey(pkg),
    serviceKeys: Array.isArray(pkg.serviceKeys) ? [...pkg.serviceKeys] : [],
  }
  packageCardError.value = ''
  packageCardSaveState.value = ''
  packageCardSnapshot.value = JSON.stringify(packageCardDraft.value)
}

function togglePackageCardEditor(pkg: DesignerPackage) {
  if (packageCardEditorKey.value === getPackageActionKey(pkg)) {
    closePackageCardEditor()
    return
  }
  openPackageCardEditor(pkg)
}

function togglePackageCardDraftService(key: string) {
  if (!packageCardDraft.value) return
  const idx = packageCardDraft.value.serviceKeys.indexOf(key)
  if (idx >= 0) packageCardDraft.value.serviceKeys.splice(idx, 1)
  else packageCardDraft.value.serviceKeys.push(key)
}

const packageCardDraftServices = computed(() => {
  const keys = packageCardDraft.value?.serviceKeys || []
  return keys.map((key) => {
    const service = getServiceBySelectionKey(key)
    return {
      key,
      title: getServiceTitle(key),
      price: service ? formatServicePrice(service.price, service.unit) : 'не задано',
      term: service ? getServiceLeadTimeLabel(service) : 'срок не задан',
      category: service ? (DESIGNER_SERVICE_CATEGORY_LABELS[service.category] || service.category) : 'услуга',
    }
  })
})

const subscriptionCardDraftServices = computed(() => {
  const keys = subscriptionCardDraft.value?.serviceKeys || []
  return keys.map((key) => {
    const service = getServiceBySelectionKey(key)
    return {
      key,
      title: getServiceTitle(key),
      price: service ? formatServicePrice(service.price, service.unit) : 'не задано',
      term: service ? getServiceLeadTimeLabel(service) : 'срок не задан',
      category: service ? (DESIGNER_SERVICE_CATEGORY_LABELS[service.category] || service.category) : 'услуга',
    }
  })
})

async function savePackageCardEditor() {
  if (!packageCardDraft.value) return
  clearPackageCardTimer()
  packageCardError.value = ''
  const activeKey = packageCardEditorKey.value
  const draft = cloneDraft(packageCardDraft.value)
  const updatedList = packages.value.map((item) => (
    getPackageActionKey(item) === activeKey
      ? draft
      : cloneDraft(item)
  ))
  const normalized = normalizePackagesForSave(updatedList)
  if (!normalized.ok) {
    packageCardError.value = normalized.error
    packageCardSaveState.value = 'error'
    return
  }
  packageCardSaving.value = true
  packageCardSaveState.value = 'saving'
  try {
    await savePackages(normalized.list)
    packageCardSnapshot.value = JSON.stringify(packageCardDraft.value)
    packageCardSaveState.value = 'saved'
    setAutosaveSettled(packageCardSaveState, 'saved')
  } catch (error: any) {
    packageCardError.value = getRequestErrorMessage(error, 'Не удалось сохранить пакет')
    packageCardSaveState.value = 'error'
  } finally {
    packageCardSaving.value = false
  }
}

function queuePackageCardSave() {
  if (!packageCardDraft.value || !packageCardEditorKey.value) return
  const nextSnapshot = JSON.stringify(packageCardDraft.value)
  if (nextSnapshot === packageCardSnapshot.value) return
  clearPackageCardTimer()
  packageCardTimer = setTimeout(() => {
    savePackageCardEditor()
  }, 120)
}

async function createPackageCard() {
  pkgEditError.value = ''
  const draft = buildCustomPackageDraft()
  packageCardSaving.value = true
  try {
    await savePackages([...packages.value.map((item) => cloneDraft(item)), draft])
    showTransientMessage(pkgEditSuccess, 'Пакет добавлен')
    await nextTick()
    openPackageCardEditor(findPackageByActionKey(draft.key) || draft)
  } catch (error: any) {
    pkgEditError.value = getRequestErrorMessage(error, 'Не удалось добавить пакет')
  } finally {
    packageCardSaving.value = false
  }
}

async function duplicatePackageCard(pkg: DesignerPackage) {
  pkgEditError.value = ''
  const source = packageCardDraft.value && packageCardEditorKey.value === getPackageActionKey(pkg)
    ? cloneDraft(packageCardDraft.value)
    : cloneDraft(pkg)
  const list = packages.value.map((item) => cloneDraft(item))
  const index = packages.value.findIndex((item) => getPackageActionKey(item) === getPackageActionKey(pkg))
  if (index < 0) return
  source.key = `${pkg.key || 'package'}_copy_${makeEditorId()}`
  source.title = source.title ? `${source.title} (копия)` : 'Новый пакет'
  packageCardSaving.value = true
  try {
    list.splice(index + 1, 0, source)
    await savePackages(list)
    showTransientMessage(pkgEditSuccess, 'Пакет продублирован')
    await nextTick()
    openPackageCardEditor(findPackageByActionKey(source.key) || source)
  } catch (error: any) {
    pkgEditError.value = getRequestErrorMessage(error, 'Не удалось продублировать пакет')
  } finally {
    packageCardSaving.value = false
  }
}

async function movePackageCard(pkg: DesignerPackage, direction: -1 | 1) {
  pkgEditError.value = ''
  const index = packages.value.findIndex((item) => getPackageActionKey(item) === getPackageActionKey(pkg))
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= packages.value.length) return
  const list = packages.value.map((item) => cloneDraft(item))
  const [moved] = list.splice(index, 1)
  list.splice(targetIndex, 0, moved)
  packageCardSaving.value = true
  try {
    await savePackages(list)
    showTransientMessage(pkgEditSuccess, 'Порядок пакетов обновлён')
    await nextTick()
    openPackageCardEditor(findPackageByActionKey(getPackageActionKey(pkg)) || moved)
  } catch (error: any) {
    pkgEditError.value = getRequestErrorMessage(error, 'Не удалось изменить порядок пакетов')
  } finally {
    packageCardSaving.value = false
  }
}

async function removePackageCard(pkg: DesignerPackage) {
  pkgEditError.value = ''
  packageCardSaving.value = true
  try {
    const removedKey = getPackageActionKey(pkg)
    const nextPackages = packages.value
      .filter((item) => getPackageActionKey(item) !== removedKey)
      .map((item) => cloneDraft(item))
    const affectedProjectIds = designerProjects.value
      .filter((project) => project.packageKey === removedKey)
      .map((project) => project.id)

    await savePricingCatalog({
      packages: nextPackages,
      clearProjectPackageKeysForIds: affectedProjectIds,
    })
    closePackageCardEditor()
    showTransientMessage(pkgEditSuccess, affectedProjectIds.length ? 'Пакет удалён и убран из связанных проектов' : 'Пакет удалён')
  } catch (error: any) {
    pkgEditError.value = getRequestErrorMessage(error, 'Не удалось удалить пакет')
  } finally {
    packageCardSaving.value = false
  }
}

function closeSubscriptionCardEditor() {
  clearSubscriptionCardTimer()
  subscriptionCardEditorKey.value = null
  subscriptionCardDraft.value = null
  subscriptionCardError.value = ''
  subscriptionCardSaveState.value = ''
  subscriptionCardSnapshot.value = ''
}

function openSubscriptionCardEditor(subscription: DesignerSubscription) {
  closeServiceCardEditor()
  closePackageCardEditor()
  subscriptionCardEditorKey.value = getSubscriptionActionKey(subscription)
  subscriptionCardDraft.value = {
    ...cloneDraft(subscription),
    key: getSubscriptionPersistedKey(subscription),
    serviceKeys: Array.isArray(subscription.serviceKeys) ? [...subscription.serviceKeys] : [],
    limits: { ...(subscription.limits || {}) },
  }
  subscriptionCardError.value = ''
  subscriptionCardSaveState.value = ''
  subscriptionCardSnapshot.value = JSON.stringify(subscriptionCardDraft.value)
}

function toggleSubscriptionCardEditor(subscription: DesignerSubscription) {
  if (subscriptionCardEditorKey.value === getSubscriptionActionKey(subscription)) {
    closeSubscriptionCardEditor()
    return
  }
  openSubscriptionCardEditor(subscription)
}

function toggleSubscriptionCardDraftService(key: string) {
  if (!subscriptionCardDraft.value) return
  const idx = subscriptionCardDraft.value.serviceKeys.indexOf(key)
  if (idx >= 0) subscriptionCardDraft.value.serviceKeys.splice(idx, 1)
  else subscriptionCardDraft.value.serviceKeys.push(key)
}

function updateSubscriptionDraftLimit(limitKey: string, value: number) {
  if (!subscriptionCardDraft.value) return
  if (!subscriptionCardDraft.value.limits) subscriptionCardDraft.value.limits = {}
  subscriptionCardDraft.value.limits[limitKey] = Math.max(0, Number(value) || 0)
}

function renameSubscriptionDraftLimit(limitKey: string, nextKeyRaw: string) {
  if (!subscriptionCardDraft.value?.limits) return
  const nextKey = String(nextKeyRaw || '').trim()
  if (!nextKey || nextKey === limitKey) return
  if (limitKey !== nextKey && nextKey in subscriptionCardDraft.value.limits) {
    subscriptionCardError.value = 'Лимит с таким ключом уже существует'
    subscriptionCardSaveState.value = 'error'
    return
  }
  const nextLimits: Record<string, number> = {}
  for (const [key, value] of Object.entries(subscriptionCardDraft.value.limits)) {
    nextLimits[key === limitKey ? nextKey : key] = Number(value) || 0
  }
  subscriptionCardDraft.value.limits = nextLimits
  if (subscriptionCardError.value === 'Лимит с таким ключом уже существует') subscriptionCardError.value = ''
}

function removeSubscriptionDraftLimit(limitKey: string) {
  if (!subscriptionCardDraft.value?.limits) return
  delete subscriptionCardDraft.value.limits[limitKey]
}

function addSubscriptionCardDraftLimit() {
  if (!subscriptionCardDraft.value) return
  if (!subscriptionCardDraft.value.limits) subscriptionCardDraft.value.limits = {}
  let index = 1
  let nextKey = `limit_${index}`
  while (nextKey in subscriptionCardDraft.value.limits) {
    index += 1
    nextKey = `limit_${index}`
  }
  subscriptionCardDraft.value.limits[nextKey] = 0
}

async function saveSubscriptionCardEditor() {
  if (!subscriptionCardDraft.value) return
  clearSubscriptionCardTimer()
  subscriptionCardError.value = ''
  const activeKey = subscriptionCardEditorKey.value
  const draft = cloneDraft(subscriptionCardDraft.value)
  const updatedList = subscriptions.value.map((item) => (
    getSubscriptionActionKey(item) === activeKey
      ? draft
      : cloneDraft(item)
  ))
  const normalized = normalizeSubscriptionsForSave(updatedList)
  if (!normalized.ok) {
    subscriptionCardError.value = normalized.error
    subscriptionCardSaveState.value = 'error'
    return
  }
  subscriptionCardSaving.value = true
  subscriptionCardSaveState.value = 'saving'
  try {
    await saveSubscriptions(normalized.list)
    subscriptionCardSnapshot.value = JSON.stringify(subscriptionCardDraft.value)
    subscriptionCardSaveState.value = 'saved'
    setAutosaveSettled(subscriptionCardSaveState, 'saved')
  } catch (error: any) {
    subscriptionCardError.value = getRequestErrorMessage(error, 'Не удалось сохранить подписку')
    subscriptionCardSaveState.value = 'error'
  } finally {
    subscriptionCardSaving.value = false
  }
}

function queueSubscriptionCardSave() {
  if (!subscriptionCardDraft.value || !subscriptionCardEditorKey.value) return
  const nextSnapshot = JSON.stringify(subscriptionCardDraft.value)
  if (nextSnapshot === subscriptionCardSnapshot.value) return
  clearSubscriptionCardTimer()
  subscriptionCardTimer = setTimeout(() => {
    saveSubscriptionCardEditor()
  }, 120)
}

async function createSubscriptionCard() {
  subEditError.value = ''
  const draft = buildCustomSubscriptionDraft()
  subscriptionCardSaving.value = true
  try {
    await saveSubscriptions([...subscriptions.value.map((item) => cloneDraft(item)), draft])
    showTransientMessage(subEditSuccess, 'Подписка добавлена')
    await nextTick()
    openSubscriptionCardEditor(findSubscriptionByActionKey(draft.key) || draft)
  } catch (error: any) {
    subEditError.value = getRequestErrorMessage(error, 'Не удалось добавить подписку')
  } finally {
    subscriptionCardSaving.value = false
  }
}

async function duplicateSubscriptionCard(subscription: DesignerSubscription) {
  subEditError.value = ''
  const source = subscriptionCardDraft.value && subscriptionCardEditorKey.value === getSubscriptionActionKey(subscription)
    ? cloneDraft(subscriptionCardDraft.value)
    : cloneDraft(subscription)
  const list = subscriptions.value.map((item) => cloneDraft(item))
  const index = subscriptions.value.findIndex((item) => getSubscriptionActionKey(item) === getSubscriptionActionKey(subscription))
  if (index < 0) return
  source.key = `${subscription.key || 'subscription'}_copy_${makeEditorId()}`
  source.title = source.title ? `${source.title} (копия)` : 'Новая подписка'
  subscriptionCardSaving.value = true
  try {
    list.splice(index + 1, 0, source)
    await saveSubscriptions(list)
    showTransientMessage(subEditSuccess, 'Подписка продублирована')
    await nextTick()
    openSubscriptionCardEditor(findSubscriptionByActionKey(source.key) || source)
  } catch (error: any) {
    subEditError.value = getRequestErrorMessage(error, 'Не удалось продублировать подписку')
  } finally {
    subscriptionCardSaving.value = false
  }
}

async function moveSubscriptionCard(subscription: DesignerSubscription, direction: -1 | 1) {
  subEditError.value = ''
  const index = subscriptions.value.findIndex((item) => getSubscriptionActionKey(item) === getSubscriptionActionKey(subscription))
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= subscriptions.value.length) return
  const list = subscriptions.value.map((item) => cloneDraft(item))
  const [moved] = list.splice(index, 1)
  list.splice(targetIndex, 0, moved)
  subscriptionCardSaving.value = true
  try {
    await saveSubscriptions(list)
    showTransientMessage(subEditSuccess, 'Порядок подписок обновлён')
    await nextTick()
    openSubscriptionCardEditor(findSubscriptionByActionKey(getSubscriptionActionKey(subscription)) || moved)
  } catch (error: any) {
    subEditError.value = getRequestErrorMessage(error, 'Не удалось изменить порядок подписок')
  } finally {
    subscriptionCardSaving.value = false
  }
}

async function removeSubscriptionCard(subscription: DesignerSubscription) {
  subEditError.value = ''
  subscriptionCardSaving.value = true
  try {
    await saveSubscriptions(subscriptions.value.filter((item) => getSubscriptionActionKey(item) !== getSubscriptionActionKey(subscription)).map((item) => cloneDraft(item)))
    closeSubscriptionCardEditor()
    showTransientMessage(subEditSuccess, 'Подписка удалена')
  } catch (error: any) {
    subEditError.value = getRequestErrorMessage(error, 'Не удалось удалить подписку')
  } finally {
    subscriptionCardSaving.value = false
  }
}


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

// ── Subscriptions editing ──

const subEditError = ref('')
const subEditSuccess = ref('')

function normalizeSubscriptionsForSave(list: DesignerSubscription[]): { ok: true; list: DesignerSubscription[] } | { ok: false; error: string } {
  const cleaned = normalizeDesignerSubscriptions(list)
    .filter(sub => sub.title || sub.price > 0)

  if (!cleaned.length) {
    return { ok: false, error: 'Добавьте хотя бы одну подписку' }
  }

  const seen = new Set<string>()
  for (const sub of cleaned) {
    if (!sub.title) return { ok: false, error: 'У всех подписок должно быть заполнено название' }
    if (seen.has(sub.key)) return { ok: false, error: 'Найдены дубли подписок, удалите повторения' }
    seen.add(sub.key)
  }

  return { ok: true, list: cleaned }
}

async function initSubs() {
  const subs = initSubscriptionsFromTemplates()
  await saveSubscriptions(subs)
}

function getBillingLabel(bp: string): string {
  return BILLING_PERIOD_LABELS[bp as BillingPeriod] || bp
}
function getMonthlyPrice(sub: DesignerSubscription): number {
  const months = BILLING_PERIOD_MONTHS[sub.billingPeriod as BillingPeriod] || 1
  const price = Number(sub.price) || 0
  const effectivePrice = sub.discount > 0 ? price * (1 - (sub.discount || 0) / 100) : price
  return Math.round(effectivePrice / months)
}
function formatLimitKey(key: string): string {
  const map: Record<string, string> = {
    visits: 'Выездов',
    online_hours: 'Часов онлайн',
    renders: 'Рендеров',
  }
  return map[key] || key
}

async function uploadDesignerDoc(ev: Event) {
  const input = ev.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return

  designerDocUploading.value = true
  try {
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', newDesignerDocTitle.value || file.name)
      fd.append('category', newDesignerDocCategory.value)
      fd.append('notes', newDesignerDocNotes.value)
      await $fetch(`/api/designers/${props.designerId}/documents`, { method: 'POST', body: fd })
    }
    await refreshDesignerDocs()
    newDesignerDocTitle.value = ''
    newDesignerDocNotes.value = ''
    input.value = ''
  } finally {
    designerDocUploading.value = false
  }
}

async function deleteDesignerDoc(docId: number) {
  if (!confirm('Удалить документ?')) return
  await $fetch(`/api/designers/${props.designerId}/documents/${docId}`, { method: 'DELETE' })
  await refreshDesignerDocs()
}

function getServiceTitle(key: string): string {
  const svc = getServiceBySelectionKey(key)
  if (svc) return svc.title
  const tmpl = DESIGNER_SERVICE_TEMPLATES.find(t => t.key === key)
  return tmpl?.title || key
}

function getServiceBySelectionKey(key: string): DesignerServicePrice | undefined {
  return services.value.find((service, index) => getServicePersistedKey(service, index) === key)
}

function getServiceDisplayTitle(service: DesignerServicePrice, index = 0): string {
  const title = String(service.title || '').trim()
  if (title) return title
  const template = getServiceTemplate(service.serviceKey)
  if (template?.title) return template.title
  return `Услуга ${index + 1}`
}

function getServiceDisplayDescription(service: DesignerServicePrice): string {
  const description = String(service.description || '').trim()
  if (description) return description
  const template = getServiceTemplate(service.serviceKey)
  return template?.description || ''
}

function getServiceTemplateLabel(service: DesignerServicePrice): string {
  const template = getServiceTemplate(service.serviceKey)
  return template?.title || 'Своя услуга'
}

function getServiceTemplateHint(service: DesignerServicePrice): string {
  const template = getServiceTemplate(service.serviceKey)
  if (!template) return 'Позиция создана вручную. Можно выбрать типовую услугу из каталога и затем скорректировать цену, описание и срок.'
  return `${DESIGNER_SERVICE_CATEGORY_LABELS[template.category]} · ${formatServicePrice(template.defaultPrice, template.defaultUnit)}`
}

function formatServiceTemplateRange(template: { priceRangeMin?: number | null; priceRangeMax?: number | null; defaultUnit: PriceUnit }): string {
  const min = Math.max(0, Number(template.priceRangeMin) || 0)
  const max = Math.max(0, Number(template.priceRangeMax) || 0)
  if (!min && !max) return 'диапазон не задан'
  if (!min || min === max) return formatServicePrice(max || min, template.defaultUnit)
  return `${formatServicePrice(min, template.defaultUnit)} - ${formatServicePrice(max, template.defaultUnit)}`
}

function formatUsageNames(list: string[]): string {
  if (list.length <= 2) return list.join(', ')
  return `${list.slice(0, 2).join(', ')} +${list.length - 2}`
}

function getServiceUsageInfo(serviceKey: string | null | undefined) {
  if (!serviceKey) return EMPTY_SERVICE_USAGE

  const packageTitles = Array.from(new Set(packages.value
    .filter((pkg) => (pkg.serviceKeys || []).includes(serviceKey))
    .map((pkg, index) => getPackageDisplayTitle(pkg, index))))

  const subscriptionTitles = Array.from(new Set(subscriptions.value
    .filter((subscription) => (subscription.serviceKeys || []).includes(serviceKey))
    .map((subscription, index) => getSubscriptionDisplayTitle(subscription, index))))

  return {
    packageTitles,
    subscriptionTitles,
    total: packageTitles.length + subscriptionTitles.length,
  }
}

function formatServiceUsageHint(usage: { packageTitles: string[]; subscriptionTitles: string[]; total: number }): string {
  if (!usage.total) return ''
  const parts = []
  if (usage.packageTitles.length) parts.push(`пакеты: ${formatUsageNames(usage.packageTitles)}`)
  if (usage.subscriptionTitles.length) parts.push(`подписки: ${formatUsageNames(usage.subscriptionTitles)}`)
  return `Связанные позиции обновятся автоматически: ${parts.join(' · ')}.`
}

function getPackageUsageInfo(packageKey: string | null | undefined) {
  if (!packageKey) return EMPTY_PACKAGE_USAGE

  const projectTitles = Array.from(new Set(designerProjects.value
    .filter((project) => project.packageKey === packageKey)
    .map((project) => String(project.projectTitle || project.projectSlug || `Проект ${project.id}`).trim())
    .filter(Boolean)))

  return {
    projectTitles,
    total: projectTitles.length,
  }
}

function formatPackageUsageHint(usage: { projectTitles: string[]; total: number }) {
  if (!usage.total) return ''
  return `Связанные проекты обновятся автоматически: ${formatUsageNames(usage.projectTitles)}.`
}

function formatLeadTimeDays(days?: number | null): string {
  const normalized = Math.max(0, Number(days) || 0)
  if (!normalized) return 'срок не задан'
  if (normalized % 10 === 1 && normalized % 100 !== 11) return `${normalized} день`
  if (normalized % 10 >= 2 && normalized % 10 <= 4 && (normalized % 100 < 10 || normalized % 100 >= 20)) return `${normalized} дня`
  return `${normalized} дней`
}

function getServiceLeadTimeLabel(service: DesignerServicePrice): string {
  return formatLeadTimeDays(service.leadTimeDays)
}

function getServiceCategoryValue(service: DesignerServicePrice): DesignerServiceCategory {
  if (service.category) return service.category
  const template = getServiceTemplate(service.serviceKey)
  return (template?.category || 'additional') as DesignerServiceCategory
}

function getServiceCategoryLabel(service: DesignerServicePrice): string {
  return DESIGNER_SERVICE_CATEGORY_LABELS[getServiceCategoryValue(service)] || 'услуга'
}

function getPackageTitle(key: string): string {
  const pkg = packages.value.find(p => p.key === key)
  if (pkg) return pkg.title
  const tmpl = DESIGNER_PACKAGE_TEMPLATES.find(t => t.key === key)
  return tmpl?.title || key
}

function getPackageDisplayTitle(pkg: DesignerPackage | null | undefined, index = 0): string {
  if (!pkg) return `Пакет ${index + 1}`
  const title = String(pkg.title || '').trim()
  if (title) return title
  const template = DESIGNER_PACKAGE_TEMPLATES.find((item) => item.key === pkg.key)
  if (template?.title) return template.title
  return `Пакет ${index + 1}`
}

function getPackageDisplayDescription(pkg: DesignerPackage | null | undefined): string {
  if (!pkg) return 'Опишите состав пакета, объём сопровождения и для какого сценария он подходит.'
  const description = String(pkg.description || '').trim()
  if (description) return description
  const template = DESIGNER_PACKAGE_TEMPLATES.find((item) => item.key === pkg.key)
  return template?.description || 'Опишите состав пакета, объём сопровождения и для какого сценария он подходит.'
}

function getSubscriptionDisplayTitle(sub: DesignerSubscription | null | undefined, index = 0): string {
  if (!sub) return `Подписка ${index + 1}`
  const title = String(sub.title || '').trim()
  if (title) return title
  const template = DESIGNER_SUBSCRIPTION_TEMPLATES.find((item) => item.key === sub.key)
  if (template?.title) return template.title
  return `Подписка ${index + 1}`
}

function getSubscriptionDisplayDescription(sub: DesignerSubscription | null | undefined): string {
  if (!sub) return 'Опишите формат сопровождения, частоту контакта и результат для клиента.'
  const description = String(sub.description || '').trim()
  if (description) return description
  const template = DESIGNER_SUBSCRIPTION_TEMPLATES.find((item) => item.key === sub.key)
  return template?.description || 'Опишите формат сопровождения, частоту контакта и результат для клиента.'
}

function formatRubles(value: number): string {
  return Math.max(0, Number(value) || 0).toLocaleString('ru-RU')
}

function formatServicePrice(price: number, unit?: string | null): string {
  const normalizedPrice = Math.max(0, Number(price) || 0)
  if (!unit) return `${formatRubles(normalizedPrice)} ₽`
  if (unit in PRICE_UNIT_LABELS) {
    return `${formatRubles(normalizedPrice)} ${PRICE_UNIT_LABELS[unit as PriceUnit]}`
  }
  return `${formatRubles(normalizedPrice)} ${String(unit).trim()}`
}

function getPriceUnitLabel(unit?: string | null): string {
  if (!unit) return 'без единицы'
  if (unit in PRICE_UNIT_LABELS) return PRICE_UNIT_LABELS[unit as PriceUnit]
  return String(unit).trim()
}

function getServiceCountLabel(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return `${count} услуга`
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return `${count} услуги`
  return `${count} услуг`
}

function getCategoryActiveLabel(list: DesignerServicePrice[]): string {
  const activeCount = list.filter(item => item.enabled).length
  return `${activeCount} активны`
}

function getCategoryStartingPrice(list: DesignerServicePrice[]): string {
  const enabledServices = list.filter(item => item.enabled)
  if (!enabledServices.length) return ''
  const cheapest = enabledServices.reduce((best, current) => current.price < best.price ? current : best)
  return formatServicePrice(cheapest.price, cheapest.unit)
}

function getServiceTemplate(key: string) {
  return DESIGNER_SERVICE_TEMPLATES.find(template => template.key === key)
}

function getServiceMarketLabel(service: DesignerServicePrice): string {
  const template = getServiceTemplate(service.serviceKey)
  if (!template) return 'Индивидуальная услуга'
  return `Рынок ${formatRubles(template.priceRangeMin)}–${formatRubles(template.priceRangeMax)} ${getPriceUnitLabel(template.defaultUnit)}`
}

function getServiceOriginLabel(service: DesignerServicePrice): string {
  return getServiceTemplate(service.serviceKey) ? 'Типовая позиция' : 'Собственная настройка'
}

function getPackageExamplePrice(pkg: DesignerPackage, area: number): string {
  return `${formatRubles((pkg.pricePerSqm || 0) * area)} ₽`
}

function getPackageVisibleServiceKeys(pkg: DesignerPackage): string[] {
  return (pkg.serviceKeys || []).slice(0, 5)
}

function getPackageHiddenServiceCount(pkg: DesignerPackage): number {
  return Math.max(0, (pkg.serviceKeys || []).length - getPackageVisibleServiceKeys(pkg).length)
}

function getPackageCoverageLabel(pkg: DesignerPackage): string {
  const count = pkg.serviceKeys?.length || 0
  if (count >= 6) return 'Полный пакет для проекта под ключ'
  if (count >= 4) return 'Сбалансированный пакет для основных этапов'
  if (count >= 2) return 'Компактный пакет для конкретной задачи'
  return 'Точечная услуга для отдельного этапа'
}

function getPackageCategoryLabel(pkg: DesignerPackage): string {
  const labels = Array.from(new Set((pkg.serviceKeys || []).map((key) => {
    const service = services.value.find(item => item.serviceKey === key)
    if (service) return DESIGNER_SERVICE_CATEGORY_LABELS[service.category]
    const template = getServiceTemplate(key)
    return template ? DESIGNER_SERVICE_CATEGORY_LABELS[template.category] : ''
  }).filter(Boolean)))

  if (!labels.length) return 'Категории пока не определены'
  if (labels.length <= 2) return labels.join(' + ')
  return `${labels.slice(0, 2).join(' + ')} и ещё ${labels.length - 2}`
}

function getPackageBudgetLabel(pkg: DesignerPackage): string {
  const price = Number(pkg.pricePerSqm) || 0
  if (price >= 4000) return 'Премиальный сегмент и плотное сопровождение'
  if (price >= 2500) return 'Средний+ сегмент для подробной проработки'
  if (price >= 1200) return 'Рациональный пакет для жилых интерьеров'
  return 'Лёгкий входной пакет для первых этапов'
}

function getLeadTimeStats(keys: string[]) {
  const days = keys
    .map((key) => getServiceBySelectionKey(key)?.leadTimeDays || 0)
    .filter((value) => value > 0)

  if (!days.length) return null

  return {
    min: Math.min(...days),
    max: Math.max(...days),
  }
}

function getDraftServiceBundleSummary(keys: string[]) {
  const stats = getLeadTimeStats(keys)
  if (!stats) return 'Выбирайте уже настроенные услуги: пакет и подписка подтянут их текущую цену и срок.'
  if (stats.min === stats.max) return `Срок набора услуг: ${formatLeadTimeDays(stats.max)}.`
  return `Срок набора услуг: от ${formatLeadTimeDays(stats.min)} до ${formatLeadTimeDays(stats.max)}.`
}

function getPackageLeadTimeLabel(pkg: DesignerPackage): string {
  const stats = getLeadTimeStats(pkg.serviceKeys || [])
  if (!stats) return 'Срок пакета будет собран из сроков выбранных услуг.'
  if (stats.min === stats.max) return `Срок пакета: ${formatLeadTimeDays(stats.max)}`
  return `Срок пакета: ${formatLeadTimeDays(stats.min)}–${formatLeadTimeDays(stats.max)}`
}

function getSubscriptionLeadTimeLabel(sub: DesignerSubscription): string {
  const stats = getLeadTimeStats(sub.serviceKeys || [])
  if (!stats) return 'Срок закрытия задач зависит от выбранных услуг.'
  if (stats.min === stats.max) return `Ориентир по сроку услуги: ${formatLeadTimeDays(stats.max)}`
  return `Ориентир по сроку услуги: ${formatLeadTimeDays(stats.min)}–${formatLeadTimeDays(stats.max)}`
}

function getPackageGroupLabel(pkg: DesignerPackage): string {
  const count = (pkg.serviceKeys || []).length
  if (pkg.enabled === false) return 'Черновики пакетов'
  if (count >= 6) return 'Полные пакеты'
  if (count >= 4) return 'Сбалансированные пакеты'
  if (count >= 2) return 'Компактные пакеты'
  return 'Точечные пакеты'
}

function getPackageListDescription(pkg: DesignerPackage): string {
  const parts = [getPackageCoverageLabel(pkg), getPackageCategoryLabel(pkg)]
  const visibleServices = getPackageVisibleServiceKeys(pkg).map((key) => getServiceTitle(key)).filter(Boolean)
  if (visibleServices.length) parts.push(`Состав: ${visibleServices.join(', ')}`)
  return parts.filter(Boolean).join('. ')
}

function getSubscriptionGroupLabel(sub: DesignerSubscription): string {
  if (sub.enabled === false) return 'Черновики подписок'
  return `Подписки ${getBillingLabel(sub.billingPeriod).toLowerCase()}`
}

function getSubscriptionListDescription(sub: DesignerSubscription): string {
  const parts: string[] = []
  if (getSubscriptionDisplayDescription(sub)) parts.push(getSubscriptionDisplayDescription(sub))
  if (sub.serviceKeys?.length) {
    parts.push(`Сервисы: ${sub.serviceKeys.slice(0, 4).map((key) => getServiceTitle(key)).join(', ')}`)
  }
  const limitKeys = Object.keys(sub.limits || {})
  if (limitKeys.length) {
    parts.push(limitKeys.slice(0, 3).map((key) => `${formatLimitKey(key)}: ${sub.limits?.[key]}`).join(' · '))
  }
  return parts.join('. ')
}

// ── Available packages for project creation ──
const availablePackages = computed(() => {
  if (packages.value.length) return packages.value.filter(p => p.enabled)
  return DESIGNER_PACKAGE_TEMPLATES.map(t => ({
    key: t.key,
    title: t.title,
    pricePerSqm: t.suggestedPricePerSqm,
    enabled: true,
    description: t.description,
    serviceKeys: t.serviceKeys,
  }))
})

// ── Projects ──

const showNewProjectModal = ref(false)
const editingDesignerProjectId = ref<number | null>(null)
const savingProject = ref(false)
const projectEditError = ref('')
const projectEditSuccess = ref('')
const projectEditState = ref<InlineAutosaveState>('')
const projectEditSnapshot = ref('')
let projectEditTimer: ReturnType<typeof setTimeout> | null = null
const projectEdit = reactive({
  designerProjectId: 0,
  title: '',
  packageKey: '',
  pricePerSqm: 0,
  area: 0,
  status: 'draft' as 'draft' | 'active' | 'paused' | 'completed' | 'archived',
  notes: '',
})

function clearProjectEditTimer() {
  if (!projectEditTimer) return
  clearTimeout(projectEditTimer)
  projectEditTimer = null
}

function serializeProjectEdit() {
  return JSON.stringify({
    designerProjectId: projectEdit.designerProjectId,
    title: projectEdit.title,
    packageKey: projectEdit.packageKey,
    pricePerSqm: projectEdit.pricePerSqm,
    area: projectEdit.area,
    status: projectEdit.status,
    notes: projectEdit.notes,
  })
}

async function doCreateProject() {
  await createProject()
  showNewProjectModal.value = false
}

function startEditDesignerProject(dp: any) {
  projectEditError.value = ''
  projectEditSuccess.value = ''
  projectEditState.value = ''
  editingDesignerProjectId.value = dp.id
  projectEdit.designerProjectId = dp.id
  projectEdit.title = String(dp.projectTitle || '')
  projectEdit.packageKey = String(dp.packageKey || '')
  projectEdit.pricePerSqm = Number(dp.pricePerSqm || 0)
  projectEdit.area = Number(dp.area || 0)
  projectEdit.status = (dp.status || 'draft') as any
  projectEdit.notes = String(dp.notes || '')
  projectEditSnapshot.value = serializeProjectEdit()
}

function cancelEditDesignerProject() {
  clearProjectEditTimer()
  editingDesignerProjectId.value = null
  projectEditError.value = ''
  projectEditState.value = ''
}

async function saveDesignerProjectEdits() {
  clearProjectEditTimer()
  projectEditError.value = ''
  if (!projectEdit.title.trim()) {
    projectEditError.value = 'Укажите название проекта'
    projectEditState.value = 'error'
    return
  }

  savingProject.value = true
  projectEditState.value = 'saving'
  try {
    await updateDesignerProject({
      designerProjectId: projectEdit.designerProjectId,
      title: projectEdit.title.trim(),
      packageKey: projectEdit.packageKey || null,
      pricePerSqm: Number(projectEdit.pricePerSqm || 0),
      area: Number(projectEdit.area || 0),
      status: projectEdit.status,
      notes: projectEdit.notes || null,
    })
    projectEditSnapshot.value = serializeProjectEdit()
    projectEditState.value = 'saved'
    setAutosaveSettled(projectEditState, 'saved')
  } catch (e: any) {
    projectEditError.value = e?.data?.message || 'Не удалось сохранить проект'
    projectEditState.value = 'error'
  } finally {
    savingProject.value = false
  }
}

function queueProjectEditSave() {
  if (!editingDesignerProjectId.value) return
  const nextSnapshot = serializeProjectEdit()
  if (nextSnapshot === projectEditSnapshot.value) return
  clearProjectEditTimer()
  projectEditTimer = setTimeout(() => {
    saveDesignerProjectEdits()
  }, 120)
}

function getDesignerDocCategoryLabel(category: string): string {
  return DESIGNER_DOC_CATEGORIES.find(c => c.value === category)?.label ?? category
}

// ── Wipe2 card view ──
const isWipe2Mode = computed(() => designSystem.tokens.value.contentViewMode === 'wipe2')
const showAll = computed(() => !isWipe2Mode.value)

// ── Ribbon nav: scroll to section on click ──
function scrollToSection(key: string) {
  const vp = viewportRef.value
  const root = vp ?? document.body
  const el = root.querySelector<HTMLElement>(`.cab-section[data-section="${key}"]`)
  if (!el) return
  // scroll-margin-top handles sticky header offset (set in CSS)
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
watch(section, (key) => {
  if (!showAll.value) return
  requestAnimationFrame(() => scrollToSection(key))
}, { flush: 'post' })

const wipe2CabinetData = computed<Wipe2EntityData | null>(() => {
  const d = designer.value
  if (!d) return null
  const svcs = services.value || []
  const pkgs = packages.value || []
  const projs = designerProjects.value || []
  const subs = subscriptions.value || []
  const docs = designerDocs.value || []
  const clients = uniqueClients.value || []
  const contractors = uniqueContractors.value || []
  const sellers = linkedData.value?.sellers || []
  const managers = linkedData.value?.managers || []
  const serviceCategorySections = SERVICE_CATEGORY_OPTIONS
    .map((option) => {
      const items = svcs
        .map((service, index) => ({ service, index }))
        .filter(({ service }) => getServiceCategoryValue(service) === option.value)

      if (!items.length) return null

      return {
        title: option.label,
        subtitle: `${items.length} в категории`,
        fields: items.map(({ service, index }) => ({
          label: getServiceDisplayTitle(service, index),
          value: formatServicePrice(service.price, service.unit),
          description: getServiceDisplayDescription(service),
          badge: service.enabled === false ? 'скрыта' : 'активна',
          caption: getPriceUnitLabel(service.unit),
          eyebrow: getServiceCategoryLabel(service),
          tone: service.enabled === false ? 'muted' as const : 'accent' as const,
          itemType: 'service' as const,
          itemKey: getServiceActionKey(service, index),
        })),
      }
    })
    .filter(Boolean) as Array<{ title: string; subtitle?: string; fields: any[] }>

  const packageSections = Array.from(new Set(pkgs.map((pkg) => getPackageGroupLabel(pkg))))
    .map((groupTitle) => {
      const items = pkgs
        .map((pkg, index) => ({ pkg, index }))
        .filter(({ pkg }) => getPackageGroupLabel(pkg) === groupTitle)

      if (!items.length) return null

      return {
        title: groupTitle,
        subtitle: `${items.length} в разделе`,
        fields: items.map(({ pkg, index }) => ({
          label: getPackageDisplayTitle(pkg, index),
          value: `${formatRubles(pkg.pricePerSqm ?? 0)} ₽/м²`,
          description: getPackageListDescription(pkg),
          badge: pkg.enabled === false ? 'черновик' : 'готов',
          caption: `${getServiceCountLabel((pkg.serviceKeys || []).length)} · 80 м²: ${getPackageExamplePrice(pkg, 80)}`,
          eyebrow: getPackageBudgetLabel(pkg),
          tone: pkg.enabled === false ? 'muted' as const : 'success' as const,
          itemType: 'package' as const,
          itemKey: getPackageActionKey(pkg, index),
          relatedItemKeys: pkg.serviceKeys || [],
        })),
      }
    })
    .filter(Boolean) as Array<{ title: string; subtitle?: string; fields: any[] }>

  const subscriptionSections = Array.from(new Set(subs.map((sub) => getSubscriptionGroupLabel(sub))))
    .map((groupTitle) => {
      const items = subs.filter((sub) => getSubscriptionGroupLabel(sub) === groupTitle)
      if (!items.length) return null

      return {
        title: groupTitle,
        subtitle: `${items.length} в разделе`,
        fields: items.map((sub, index) => ({
          label: getSubscriptionDisplayTitle(sub, index),
          value: sub.price != null ? `${formatRubles(sub.price)} ₽` : '—',
          description: getSubscriptionListDescription(sub),
          badge: sub.enabled === false ? 'скрыта' : 'активна',
          caption: `${getBillingLabel(sub.billingPeriod)} · ${getMonthlyPrice(sub).toLocaleString('ru-RU')} ₽/мес`,
          eyebrow: sub.discount ? `скидка ${sub.discount}%` : 'подписка',
          tone: sub.enabled === false ? 'muted' as const : sub.discount ? 'success' as const : 'accent' as const,
          itemType: 'subscription' as const,
          itemKey: getSubscriptionActionKey(sub, index),
          relatedItemKeys: sub.serviceKeys || [],
        })),
      }
    })
    .filter(Boolean) as Array<{ title: string; subtitle?: string; fields: any[] }>

  const allSections = [
      { title: 'Обзор', fields: [
        { label: 'Активных проектов', value: String(dashStats.value?.active ?? 0) },
        { label: 'Всего проектов', value: String(dashStats.value?.total ?? 0) },
        { label: 'Клиентов', value: String(clients.length) },
        { label: 'Подрядчиков', value: String(contractors.length) },
        { label: 'Общая выручка', value: String(dashStats.value?.totalRevenue ?? 0), type: 'currency' as const, span: 2 as const },
        { label: 'Услуг настроено', value: String(services.value?.length ?? 0) },
        { label: 'Пакетов', value: String(pkgs.length) },
      ]},
      { title: 'Профиль', fields: [
        { label: 'Телефон', value: form.phone },
        { label: 'Email', value: form.email },
        { label: 'Город', value: form.city },
        { label: 'Компания', value: form.companyName },
        { label: 'Telegram', value: form.telegram },
        { label: 'Сайт', value: form.website },
        { label: 'Опыт', value: form.experience, span: 2 as const },
        { label: 'Специализация', value: form.specializations.join(', '), span: 2 as const },
        { label: 'О себе', value: form.about, type: 'multiline' as const, span: 2 as const },
      ]},
      ...(serviceCategorySections.length
        ? serviceCategorySections
        : [{ title: 'Услуги и прайс', fields: [{ label: 'Услуги', value: 'не настроены', span: 2 as const }] }]),
      ...(packageSections.length
        ? packageSections
        : [{ title: 'Пакеты', fields: [{ label: 'Пакеты', value: 'не настроены', span: 2 as const }] }]),
      { title: 'Проекты', fields: projs.length
        ? (projs.slice(0, 5).flatMap((p: any) => ([
            {
              label: p.projectTitle ?? 'Проект',
              value: DESIGNER_PROJECT_STATUS_LABELS[p.status as keyof typeof DESIGNER_PROJECT_STATUS_LABELS] || p.status || 'черновик',
              type: 'status' as const,
              span: 2 as const,
              description: p.notes ?? '',
              badge: p.packageKey ? getPackageTitle(p.packageKey) : 'без пакета',
              caption: p.area ? `${p.area} м²` : 'площадь не задана',
              eyebrow: 'проект',
              tone: p.totalPrice ? 'accent' as const : 'muted' as const,
            },
            {
              label: 'Стоимость',
              value: p.totalPrice ? String(p.totalPrice) : '',
              type: 'currency' as const,
              description: p.address || '',
              badge: p.area ? `${p.area} м²` : undefined,
              caption: p.packageKey ? getPackageTitle(p.packageKey) : 'индивидуально',
              eyebrow: 'бюджет',
              tone: p.totalPrice ? 'success' as const : 'muted' as const,
            },
            {
              label: 'Площадь',
              value: p.area ? `${p.area} м²` : '',
              description: p.address || 'адрес не указан',
              badge: p.status ? 'статус' : undefined,
              caption: p.status || 'черновик',
              eyebrow: 'геометрия',
              tone: 'default' as const,
            },
          ] as any[]))).slice(0, 18)
        : [{ label: '', value: 'нет проектов', span: 2 as const }],
      },
      ...(subscriptionSections.length
        ? subscriptionSections
        : [{ title: 'Подписки', fields: [{ label: 'Подписки', value: 'не настроены', span: 2 as const }] }]),
      { title: 'Документы', fields: docs.length
        ? docs.slice(0, 8).map((doc: any) => ({
            label: doc.title ?? doc.name ?? 'Документ',
            value: doc.category ?? 'документ',
            description: doc.notes ?? '',
            badge: doc.fileName ? 'файл' : 'запись',
            caption: doc.createdAt ? formatDocDate(doc.createdAt) : 'без даты',
            eyebrow: 'документы',
            tone: 'default' as const,
          }))
        : [{ label: 'Документы', value: 'нет загруженных документов', span: 2 as const }],
      },
      { title: 'Клиенты', fields: clients.length
        ? clients.slice(0, 8).map((cl: any) => ({ label: cl.name ?? '', value: cl.phone ?? cl.email ?? '' }))
        : [{ label: 'Клиенты', value: 'нет клиентов', span: 2 as const }],
      },
      { title: 'Подрядчики', fields: contractors.length
        ? contractors.slice(0, 8).map((ct: any) => ({ label: ct.name ?? '', value: ct.role ?? '' }))
        : [{ label: 'Подрядчики', value: 'нет подрядчиков', span: 2 as const }],
      },
      { title: 'Поставщики', fields: sellers.length
        ? sellers.slice(0, 8).map((s: any) => ({ label: s.name ?? '', value: String(s.projects?.length ?? 0) + ' проектов' }))
        : [{ label: 'Поставщики', value: 'нет поставщиков', span: 2 as const }],
      },
      { title: 'Менеджеры', fields: managers.length
        ? managers.slice(0, 8).map((m: any) => ({ label: m.name ?? '', value: String(m.projects?.length ?? 0) + ' проектов' }))
        : [{ label: 'Менеджеры', value: 'нет менеджеров', span: 2 as const }],
      },
      { title: 'Галерея', fields: [
        { label: 'Объектов в галерее', value: String(galleryList.value.length), span: 2 as const },
        { label: 'Мудбордов', value: String(moodboardList.value.length), span: 2 as const },
      ]},
      { title: 'Мудборды', fields: moodboardList.value.length
        ? moodboardList.value.slice(0, 8).map((m: any) => ({ label: m.title ?? m.name ?? '', value: m.description ?? '' }))
        : [{ label: 'Мудборды', value: 'нет мудбордов', span: 2 as const }],
      },
    ]
    const W2_SECTION: Record<string, string> = {
      services: 'Услуги и прайс', packages: 'Пакеты', subscriptions: 'Подписки',
      documents: 'Документы', projects: 'Проекты', clients: 'Клиенты',
      contractors: 'Подрядчики', sellers: 'Поставщики', managers: 'Менеджеры',
      gallery: 'Галерея', moodboards: 'Мудборды', profile: 'Профиль',
    }
    const sectionTitle = W2_SECTION[section.value]
    const activeServiceSectionTitles = new Set((serviceCategorySections.length ? serviceCategorySections : [{ title: 'Услуги и прайс' }]).map((item) => item.title))
    const activePackageSectionTitles = new Set((packageSections.length ? packageSections : [{ title: 'Пакеты' }]).map((item) => item.title))
    const activeSubscriptionSectionTitles = new Set((subscriptionSections.length ? subscriptionSections : [{ title: 'Подписки' }]).map((item) => item.title))
    return {
      entityTitle: d.name,
      entitySubtitle: form.city || d.city || undefined,
      entityStatus: 'дизайнер',
      entityStatusColor: 'blue' as const,
      sections: section.value === 'services'
        ? allSections.filter(s => activeServiceSectionTitles.has(s.title))
        : section.value === 'packages'
          ? allSections.filter(s => activePackageSectionTitles.has(s.title))
          : section.value === 'subscriptions'
            ? allSections.filter(s => activeSubscriptionSectionTitles.has(s.title))
        : sectionTitle
          ? allSections.filter(s => s.title === sectionTitle)
          : allSections,
    }
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

.svc-catalog__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.svc-catalog__groups {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.svc-catalog-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.svc-catalog-group__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.svc-catalog-group__title {
  display: block;
  margin-top: 4px;
  font-size: .96rem;
  line-height: 1.3;
}

.svc-catalog-group__count {
  font-size: .74rem;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 58%, transparent);
}

.svc-catalog-card,
.pkg-service-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
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

.svc-catalog-card:hover,
.pkg-service-picker:hover {
  border-color: color-mix(in srgb, var(--ds-accent, #646cff) 34%, var(--glass-border));
  transform: translateY(-1px);
}

.svc-catalog-card--brutalist {
  border-width: 2px;
}

.pkg-service-picker--active {
  border-color: color-mix(in srgb, var(--ds-accent, #646cff) 48%, var(--glass-border));
  background: color-mix(in srgb, var(--ds-accent, #646cff) 12%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ds-accent, #646cff) 12%, transparent);
}

.svc-catalog-card__topline,
.pkg-service-picker__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: color-mix(in srgb, var(--glass-text) 62%, transparent);
}

.svc-catalog-card__title,
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

.svc-catalog-card__desc,
.pkg-service-picker__main span {
  font-size: .82rem;
  line-height: 1.45;
  color: color-mix(in srgb, var(--glass-text) 74%, transparent);
}

.svc-catalog-card__range {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--glass-border) 78%, transparent);
  font-size: .76rem;
  line-height: 1.35;
  color: color-mix(in srgb, var(--glass-text) 72%, transparent);
}

.svc-catalog-card__range span {
  text-transform: uppercase;
  letter-spacing: .12em;
}

.svc-catalog-card__range strong {
  font-size: .8rem;
  color: inherit;
}

.svc-catalog-card__action {
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