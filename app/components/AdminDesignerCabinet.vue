<template>
  <div class="cab-embed" v-if="designerId">
    <div v-if="pending && !designer" class="ent-page-skeleton">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 6" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    </div>

    <div v-else-if="designer" class="cab-body">
      <aside v-if="!props.hideNav" class="cab-sidebar glass-surface std-sidenav">
        <nav class="cab-nav std-nav">
          <button
            v-for="item in nav"
            :key="item.key"
            class="cab-nav-item std-nav-item"
            :class="{ active: section === item.key, 'std-nav-item--active': section === item.key }"
            @click="section = item.key"
          >
            <span class="cab-nav-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
            <span v-if="item.key === 'projects' && designerProjects.length" class="u-counter">{{ designerProjects.length }}</span>
            <span v-if="item.key === 'services' && services.length" class="u-counter">{{ services.length }}</span>
            <span v-if="item.key === 'subscriptions' && subscriptions.length" class="u-counter">{{ subscriptions.length }}</span>
            <span v-if="item.key === 'documents' && designerDocs?.length" class="u-counter">{{ designerDocs.length }}</span>
          </button>
        </nav>
      </aside>

      <main class="cab-main">
        <div class="cab-inner">

          <!-- ═══════════════ DASHBOARD ═══════════════ -->
          <template v-if="section === 'dashboard'">
            <div class="dash-welcome glass-surface">
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

            <div class="dash-quick-nav">
              <button class="dash-quick-btn glass-surface" @click="section = 'services'">
                <span class="dash-quick-icon">◎</span>
                <span class="dash-quick-label">Услуги и цены</span>
                <span v-if="services.length" class="dash-quick-badge">{{ services.length }}</span>
              </button>
              <button class="dash-quick-btn glass-surface" @click="section = 'packages'">
                <span class="dash-quick-icon">◑</span>
                <span class="dash-quick-label">Пакеты</span>
                <span v-if="packages.length" class="dash-quick-badge">{{ packages.length }}</span>
              </button>
              <button class="dash-quick-btn glass-surface" @click="section = 'subscriptions'">
                <span class="dash-quick-icon">⟳</span>
                <span class="dash-quick-label">Подписки</span>
                <span v-if="subscriptions.length" class="dash-quick-badge">{{ subscriptions.length }}</span>
              </button>
              <button class="dash-quick-btn glass-surface" @click="section = 'projects'">
                <span class="dash-quick-icon">◒</span>
                <span class="dash-quick-label">Проекты</span>
                <span v-if="designerProjects.length" class="dash-quick-badge">{{ designerProjects.length }}</span>
              </button>
              <button class="dash-quick-btn glass-surface" @click="section = 'profile'">
                <span class="dash-quick-icon">◓</span>
                <span class="dash-quick-label">Профиль</span>
              </button>
            </div>

            <div class="dash-stats">
              <div class="dash-stat glass-surface">
                <div class="dash-stat-val">{{ dashStats.total }}</div>
                <div class="dash-stat-label">Всего проектов</div>
              </div>
              <div class="dash-stat glass-surface dash-stat--blue">
                <div class="dash-stat-val">{{ dashStats.active }}</div>
                <div class="dash-stat-label">В работе</div>
              </div>
              <div class="dash-stat glass-surface dash-stat--green">
                <div class="dash-stat-val">{{ dashStats.completed }}</div>
                <div class="dash-stat-label">Завершено</div>
              </div>
              <div class="dash-stat glass-surface">
                <div class="dash-stat-val">{{ dashStats.totalRevenue.toLocaleString('ru-RU') }} ₽</div>
                <div class="dash-stat-label">Общий оборот</div>
              </div>
            </div>

            <div v-if="!services.length" class="cab-cta glass-surface">
              <div class="cab-cta-icon">💡</div>
              <div>
                <strong>Начните с настройки прайс-листа</strong><br>
                Добавьте свои услуги, пакеты и подписки, чтобы генерировать проекты с автоматическим роадмепом.
              </div>
              <button class="cab-cta-btn" @click="initFromTemplates">Загрузить шаблон цен (Москва)</button>
            </div>

            <div v-if="designerProjects.length" class="dash-projects glass-surface">
              <div class="u-section-title">Последние проекты</div>
              <div class="dash-projects-grid">
                <NuxtLink v-for="dp in designerProjects.slice(0, 6)" :key="dp.id"
                  :to="dp.projectSlug ? `/admin/projects/${dp.projectSlug}` : undefined"
                  class="dash-project-card" :class="{ 'dash-project-card--link': dp.projectSlug }">
                  <span class="dash-project-name">{{ dp.projectTitle }}</span>
                  <span class="dash-project-status u-status" :class="`u-status--${dp.status}`">
                    {{ DESIGNER_PROJECT_STATUS_LABELS[dp.status as keyof typeof DESIGNER_PROJECT_STATUS_LABELS] || dp.status }}
                  </span>
                  <span v-if="dp.totalPrice" class="dash-project-price">{{ dp.totalPrice.toLocaleString('ru-RU') }} ₽</span>
                  <span v-if="dp.area" class="dash-project-area">{{ dp.area }} м²</span>
                </NuxtLink>
              </div>
            </div>
          </template>

          <!-- ═══════════════ SERVICES & PRICING ═══════════════ -->
          <template v-else-if="section === 'services'">
            <div class="u-section-title">
              <h2>Услуги и прайс-лист</h2>
              <div>
                <button v-if="!services.length" class="a-btn-save" @click="initFromTemplates">
                  Загрузить шаблон (Москва)
                </button>
                <button v-if="!editingServices" class="a-btn-sm" @click="startEditServices">
                  {{ services.length ? 'Редактировать' : 'Создать вручную' }}
                </button>
                <button v-if="editingServices" class="a-btn-save" @click="saveEditedServices">
                  {{ savingSvc ? 'Сохранение…' : 'Сохранить' }}
                </button>
                <button v-if="editingServices" class="a-btn-sm" @click="addCustomService">＋ Услуга</button>
                <button v-if="editingServices" class="a-btn-sm" @click="cancelEditServices">Отмена</button>
              </div>
            </div>
            <p v-if="svcEditError" class="cab-inline-error">{{ svcEditError }}</p>
            <p v-if="svcEditSuccess" class="cab-inline-success">{{ svcEditSuccess }}</p>

            <div v-if="!services.length && !editingServices" class="u-empty glass-surface">
              <span>◎</span>
              <p>Услуги не настроены.<br>Загрузите шаблон московских расценок или добавьте вручную.</p>
            </div>

            <template v-if="editingServices">
              <div v-for="[cat, catServices] in editServicesByCat" :key="cat" class="svc-category glass-surface">
                <h3 class="svc-cat-title">{{ DESIGNER_SERVICE_CATEGORY_LABELS[cat] || cat }}</h3>
                <div v-for="(svc, idx) in catServices" :key="svc.serviceKey" class="svc-edit-row">
                  <label class="svc-enable">
                    <input type="checkbox" v-model="svc.enabled" />
                    <span>{{ svc.enabled ? 'вкл' : 'выкл' }}</span>
                  </label>
                  <div class="svc-edit-name">
                    <input v-model="svc.title" class="glass-input svc-inp" placeholder="Название" />
                  </div>
                  <div class="svc-edit-desc">
                    <input v-model="svc.description" class="glass-input svc-inp" placeholder="Описание" />
                  </div>
                  <div class="svc-edit-cat">
                    <select v-model="svc.category" class="glass-input svc-inp">
                      <option v-for="opt in SERVICE_CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                  <div class="svc-edit-price">
                    <input v-model.number="svc.price" class="glass-input svc-inp svc-inp--num" type="number" min="0" />
                  </div>
                  <div class="svc-edit-unit">
                    <select v-model="svc.unit" class="glass-input svc-inp">
                      <option v-for="u in PRICE_UNITS_LIST" :key="u.value" :value="u.value">{{ u.label }}</option>
                    </select>
                  </div>
                  <div class="edit-actions">
                    <button type="button" class="svc-mini" title="Дублировать" @click="duplicateEditService(svc.serviceKey)">⎘</button>
                    <button type="button" class="svc-mini" title="Вверх" @click="moveEditService(svc.serviceKey, -1)">↑</button>
                    <button type="button" class="svc-mini" title="Вниз" @click="moveEditService(svc.serviceKey, 1)">↓</button>
                  </div>
                  <button class="svc-del" @click="removeEditService(svc.serviceKey)">✕</button>
                </div>
              </div>
            </template>

            <template v-else-if="services.length">
              <div v-for="[cat, catServices] in servicesByCat" :key="cat" class="svc-category glass-surface">
                <h3 class="svc-cat-title">{{ DESIGNER_SERVICE_CATEGORY_LABELS[cat] || cat }}</h3>
                <div class="svc-list">
                  <div v-for="svc in catServices" :key="svc.serviceKey" class="svc-row" :class="{ disabled: !svc.enabled }">
                    <div class="svc-name">{{ svc.title }}</div>
                    <div class="svc-desc">{{ svc.description }}</div>
                    <div class="svc-price svc-price-inline" @click="startInlinePrice(svc)">
                      <template v-if="inlinePriceKey === svc.serviceKey">
                        <input
                          v-model.number="inlinePriceVal"
                          class="glass-input glass-input--inline"
                          type="number"
                          min="0"
                          @blur="commitInlinePrice(svc)"
                          @keyup.enter="commitInlinePrice(svc)"
                          @keyup.escape="cancelInlinePrice"
                          @click.stop
                        />
                      </template>
                      <template v-else>
                        {{ formatPrice(svc.price, svc.unit) }}
                        <span class="svc-price-edit-icon">✎</span>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </template>

          <!-- ═══════════════ PACKAGES ═══════════════ -->
          <template v-else-if="section === 'packages'">
            <div class="u-section-title">
              <h2>Пакеты услуг</h2>
              <div>
                <button v-if="!packages.length" class="a-btn-save" @click="initPackages">
                  Загрузить стандартные пакеты
                </button>
                <button v-if="!editingPackages" class="a-btn-sm" @click="startEditPackages">
                  {{ packages.length ? 'Редактировать' : 'Создать вручную' }}
                </button>
                <button v-if="editingPackages" class="a-btn-save" @click="saveEditedPackages">
                  {{ savingPkg ? 'Сохранение…' : 'Сохранить' }}
                </button>
                <button v-if="editingPackages" class="a-btn-sm" @click="addCustomPackage">＋ Пакет</button>
                <button v-if="editingPackages" class="a-btn-sm" @click="cancelEditPackages">Отмена</button>
              </div>
            </div>
            <p v-if="pkgEditError" class="cab-inline-error">{{ pkgEditError }}</p>
            <p v-if="pkgEditSuccess" class="cab-inline-success">{{ pkgEditSuccess }}</p>

            <div v-if="!packages.length && !editingPackages" class="u-empty glass-surface">
              <span>◑</span>
              <p>Пакеты не настроены.<br>Загрузите стандартные или создайте собственные.</p>
            </div>

            <template v-if="editingPackages">
              <div v-for="pkg in editPackagesList" :key="pkg.key" class="pkg-edit glass-surface">
                <div class="pkg-edit-head">
                  <label class="svc-enable"><input type="checkbox" v-model="pkg.enabled" /><span>{{ pkg.enabled ? 'вкл' : 'выкл' }}</span></label>
                  <input v-model="pkg.title" class="glass-input pkg-title-inp" placeholder="Название пакета" />
                  <div class="pkg-price-edit">
                    <input v-model.number="pkg.pricePerSqm" class="glass-input svc-inp svc-inp--num" type="number" min="0" />
                    <span class="pkg-unit">₽/м²</span>
                  </div>
                  <div class="edit-actions">
                    <button type="button" class="svc-mini" title="Дублировать" @click="duplicateEditPackage(pkg.key)">⎘</button>
                    <button type="button" class="svc-mini" title="Вверх" @click="moveEditPackage(pkg.key, -1)">↑</button>
                    <button type="button" class="svc-mini" title="Вниз" @click="moveEditPackage(pkg.key, 1)">↓</button>
                  </div>
                  <button type="button" class="svc-del" @click="removeEditPackage(pkg.key)">✕</button>
                </div>
                <textarea v-model="pkg.description" class="glass-input pkg-desc-inp" rows="2" placeholder="Описание пакета" />
                <div class="pkg-services-edit">
                  <strong>Включённые услуги:</strong>
                  <div class="pkg-svc-tags">
                    <button
                      v-for="svc in allServiceKeys"
                      :key="`pkg-${pkg.key}-${svc.key}`"
                      type="button"
                      class="pkg-tag-picker"
                      :class="{ 'pkg-tag-picker--active': pkg.serviceKeys.includes(svc.key) }"
                      @click="togglePkgService(pkg, svc.key)"
                    >{{ svc.title }}</button>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="packages.length">
              <div class="pkg-grid">
                <div v-for="pkg in packages" :key="pkg.key" class="pkg-card glass-surface" :class="{ disabled: !pkg.enabled }">
                  <div class="pkg-card-head">
                    <h3 class="pkg-card-title">{{ pkg.title }}</h3>
                    <div class="pkg-card-price">{{ (pkg.pricePerSqm ?? 0).toLocaleString('ru-RU') }} <span>₽/м²</span></div>
                  </div>
                  <p class="pkg-card-desc">{{ pkg.description }}</p>
                  <div class="pkg-card-services">
                    <span v-for="sk in pkg.serviceKeys" :key="sk" class="pkg-svc-chip">
                      {{ getServiceTitle(sk) }}
                    </span>
                  </div>
                  <div class="pkg-card-example">
                    <span class="pkg-example-label">Пример: 80 м²</span>
                    <span class="pkg-example-price">{{ ((pkg.pricePerSqm || 0) * 80).toLocaleString('ru-RU') }} ₽</span>
                  </div>
                </div>
              </div>
            </template>
          </template>

          <!-- ═══════════════ SUBSCRIPTIONS ═══════════════ -->
          <template v-else-if="section === 'subscriptions'">
            <div class="u-section-title">
              <h2>Подписки и абонементы</h2>
              <div>
                <button v-if="!subscriptions.length" class="a-btn-save" @click="initSubs">
                  Загрузить шаблоны подписок
                </button>
                <button v-if="!editingSubscriptions" class="a-btn-sm" @click="startEditSubscriptions">
                  {{ subscriptions.length ? 'Редактировать' : 'Создать вручную' }}
                </button>
                <button v-if="editingSubscriptions" class="a-btn-save" @click="saveEditedSubscriptions">
                  {{ savingSub ? 'Сохранение…' : 'Сохранить' }}
                </button>
                <button v-if="editingSubscriptions" class="a-btn-sm" @click="addCustomSubscription">＋ Подписка</button>
                <button v-if="editingSubscriptions" class="a-btn-sm" @click="cancelEditSubscriptions">Отмена</button>
              </div>
            </div>
            <p v-if="subEditError" class="cab-inline-error">{{ subEditError }}</p>
            <p v-if="subEditSuccess" class="cab-inline-success">{{ subEditSuccess }}</p>

            <div v-if="!subscriptions.length && !editingSubscriptions" class="u-empty glass-surface">
              <span>⟳</span>
              <p>Подписки не настроены.<br>Загрузите шаблоны или создайте собственный абонемент.</p>
            </div>

            <!-- Edit mode -->
            <template v-if="editingSubscriptions">
              <div v-for="sub in editSubscriptionsList" :key="sub.key" class="sub-edit glass-surface">
                <div class="sub-edit-head">
                  <label class="svc-enable"><input type="checkbox" v-model="sub.enabled" /><span>{{ sub.enabled ? 'вкл' : 'выкл' }}</span></label>
                  <input v-model="sub.title" class="glass-input pkg-title-inp" placeholder="Название подписки" />
                  <div class="edit-actions">
                    <button type="button" class="svc-mini" title="Дублировать" @click="duplicateEditSubscription(sub.key)">⎘</button>
                    <button type="button" class="svc-mini" title="Вверх" @click="moveEditSubscription(sub.key, -1)">↑</button>
                    <button type="button" class="svc-mini" title="Вниз" @click="moveEditSubscription(sub.key, 1)">↓</button>
                  </div>
                  <button type="button" class="svc-del" @click="removeEditSubscription(sub.key)">✕</button>
                </div>
                <textarea v-model="sub.description" class="glass-input pkg-desc-inp" rows="2" placeholder="Описание подписки" />
                <div class="sub-edit-pricing">
                  <div class="u-field">
                    <label class="u-field__label">Период</label>
                    <select v-model="sub.billingPeriod" class="glass-input svc-inp">
                      <option v-for="bp in BILLING_PERIODS_LIST" :key="bp.value" :value="bp.value">{{ bp.label }}</option>
                    </select>
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Цена (₽)</label>
                    <input v-model.number="sub.price" class="glass-input svc-inp svc-inp--num" type="number" min="0" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Скидка (%)</label>
                    <input v-model.number="sub.discount" class="glass-input svc-inp svc-inp--num" type="number" min="0" max="100" />
                  </div>
                  <div v-if="sub.discount > 0" class="sub-effective-price">
                    <span class="sub-eff-label">Итого со скидкой:</span>
                    <span class="sub-eff-val">{{ Math.round(sub.price * (1 - sub.discount / 100)).toLocaleString('ru-RU') }} ₽</span>
                  </div>
                </div>
                <div class="sub-edit-limits">
                  <strong>Лимиты:</strong>
                  <div class="sub-limits-grid">
                    <div v-for="(val, lk) in sub.limits" :key="lk" class="sub-limit-row">
                      <input :value="lk" class="glass-input svc-inp" readonly />
                      <input :value="val" class="glass-input svc-inp svc-inp--num" type="number" min="0"
                        @input="sub.limits[lk] = Number(($event.target as HTMLInputElement).value)" />
                      <button type="button" class="svc-del" @click="delete sub.limits[lk]">✕</button>
                    </div>
                  </div>
                  <button type="button" class="a-btn-sm" @click="addSubLimit(sub)">＋ Лимит</button>
                </div>
                <div class="pkg-services-edit">
                  <strong>Включённые услуги:</strong>
                  <div class="pkg-svc-tags">
                    <button
                      v-for="svc in allServiceKeys"
                      :key="`sub-${sub.key}-${svc.key}`"
                      type="button"
                      class="pkg-tag-picker"
                      :class="{ 'pkg-tag-picker--active': sub.serviceKeys.includes(svc.key) }"
                      @click="toggleSubService(sub, svc.key)"
                    >{{ svc.title }}</button>
                  </div>
                </div>
              </div>
            </template>

            <!-- View mode -->
            <template v-else-if="subscriptions.length">
              <div class="sub-grid">
                <div v-for="sub in subscriptions" :key="sub.key" class="sub-card glass-surface" :class="{ disabled: !sub.enabled }">
                  <div class="sub-card-head">
                    <h3 class="sub-card-title">{{ sub.title }}</h3>
                    <span class="sub-period-badge">{{ getBillingLabel(sub.billingPeriod) }}</span>
                  </div>
                  <div class="sub-card-price-row">
                    <span class="sub-card-price">{{ (Number(sub.price) || 0).toLocaleString('ru-RU') }} <small>₽</small></span>
                    <span v-if="sub.discount > 0" class="sub-card-discount">−{{ sub.discount }}%</span>
                  </div>
                  <div v-if="sub.discount > 0" class="sub-card-effective">
                    Итого: {{ Math.round((Number(sub.price) || 0) * (1 - (sub.discount || 0) / 100)).toLocaleString('ru-RU') }} ₽
                  </div>
                  <p class="sub-card-desc">{{ sub.description }}</p>
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
                </div>
              </div>
            </template>
          </template>

          <!-- ═══════════════ DOCUMENTS ═══════════════ -->
          <template v-else-if="section === 'documents'">
            <div class="u-section-title">
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

            <div class="u-form-section">
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

            <div v-if="filteredDesignerDocs.length" class="cab-docs-list">
              <div v-for="doc in filteredDesignerDocs" :key="doc.id" class="cab-doc-card glass-surface">
                <div class="cab-doc-icon">📎</div>
                <div class="cab-doc-info">
                  <div class="cab-doc-title">{{ doc.title }}</div>
                  <div class="cab-doc-meta">
                    <span class="cab-doc-cat">{{ DESIGNER_DOC_CATEGORIES.find(c => c.value === doc.category)?.label || doc.category }}</span>
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
            <div v-else-if="designerDocs?.length" class="u-empty glass-surface">
              <span>🔎</span>
              <p>По фильтру ничего не найдено.</p>
            </div>
            <div v-else class="u-empty glass-surface">
              <span>📂</span>
              <p>Документов пока нет.<br>Загрузите договоры, ТЗ, референсы и акты.</p>
            </div>
          </template>

          <!-- ═══════════════ PROJECTS ═══════════════ -->
          <template v-else-if="section === 'projects'">
            <div class="u-section-title">
              <h2>Мои проекты</h2>
              <button class="a-btn-save" @click="showNewProjectModal = true">＋ Новый проект</button>
            </div>
            <p v-if="projectEditError" class="cab-inline-error">{{ projectEditError }}</p>
            <p v-if="projectEditSuccess" class="cab-inline-success">{{ projectEditSuccess }}</p>

            <!-- New project modal -->
            <div v-if="showNewProjectModal" class="u-modal glass-surface">
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
                      {{ pkg.title }} ({{ (pkg.pricePerSqm ?? 0).toLocaleString('ru-RU') }} ₽/м²)
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
                <div v-if="newProject.pricePerSqm && newProject.area" class="proj-total glass-surface">
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
            <div v-if="!designerProjects.length && !showNewProjectModal" class="u-empty glass-surface">
              <span>◒</span>
              <p>Проектов пока нет.<br>Создайте первый проект, чтобы начать работу.</p>
            </div>

            <div v-for="dp in designerProjects" :key="dp.id" class="proj-card glass-surface">
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

              <div v-if="editingDesignerProjectId === dp.id" class="u-modal glass-surface" style="margin-top:10px">
                <div class="u-modal__body">
                  <div class="u-modal__row2">
                    <div class="u-field">
                      <label class="u-field__label">Название проекта</label>
                      <input v-model="projectEdit.title" class="glass-input" />
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Статус</label>
                      <select v-model="projectEdit.status" class="glass-input">
                        <option value="draft">Черновик</option>
                        <option value="active">В работе</option>
                        <option value="paused">Пауза</option>
                        <option value="completed">Завершён</option>
                        <option value="archived">Архив</option>
                      </select>
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Пакет</label>
                      <select v-model="projectEdit.packageKey" class="glass-input">
                        <option value="">— без пакета —</option>
                        <option v-for="pkg in packages" :key="pkg.key" :value="pkg.key">{{ pkg.title }}</option>
                      </select>
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Цена за м²</label>
                      <input v-model.number="projectEdit.pricePerSqm" type="number" min="0" class="glass-input" />
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Площадь (м²)</label>
                      <input v-model.number="projectEdit.area" type="number" min="0" class="glass-input" />
                    </div>
                    <div class="u-field">
                      <label class="u-field__label">Итого</label>
                      <input :value="((projectEdit.pricePerSqm || 0) * (projectEdit.area || 0)).toLocaleString('ru-RU') + ' ₽'" class="glass-input" readonly />
                    </div>
                  </div>
                  <div class="u-field" style="margin-top:8px">
                    <label class="u-field__label">Примечание</label>
                    <textarea v-model="projectEdit.notes" class="glass-input u-ta" rows="2" />
                  </div>
                </div>
                <div class="u-modal__foot">
                  <button type="button" class="a-btn-sm" @click="cancelEditDesignerProject">Отмена</button>
                  <button type="button" class="a-btn-save" :disabled="savingProject" @click="saveDesignerProjectEdits">
                    {{ savingProject ? 'Сохранение…' : 'Сохранить проект' }}
                  </button>
                </div>
              </div>

              <div v-if="dp.notes" class="proj-notes">{{ dp.notes }}</div>
            </div>

          </template>

          <!-- ═══════════════ PROFILE ═══════════════ -->
          <template v-else-if="section === 'profile'">
            <form @submit.prevent="saveProfile" class="cab-form">
              <div class="u-form-section">
                <h3>Основные данные</h3>
                <div class="u-modal__row2">
                  <div class="u-field">
                    <label class="u-field__label">Имя / Студия *</label>
                    <input v-model="form.name" class="glass-input" required />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Компания</label>
                    <input v-model="form.companyName" class="glass-input" placeholder="ООО / ИП…" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Телефон</label>
                    <input v-model="form.phone" class="glass-input" type="tel" placeholder="+7 (___) ___-__-__" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Email</label>
                    <input v-model="form.email" class="glass-input" type="email" placeholder="mail@example.com" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Telegram</label>
                    <input v-model="form.telegram" class="glass-input" placeholder="@username" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Сайт / портфолио</label>
                    <input v-model="form.website" class="glass-input" placeholder="https://…" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Город</label>
                    <input v-model="form.city" class="glass-input" placeholder="Москва" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Опыт работы</label>
                    <input v-model="form.experience" class="glass-input" placeholder="10 лет" />
                  </div>
                </div>
              </div>

              <div class="u-form-section">
                <h3>О себе</h3>
                <div class="u-field u-field--full">
                  <textarea v-model="form.about" class="glass-input u-ta" rows="4" placeholder="Расскажите о своём подходе к дизайну, стилях, специализации…" />
                </div>
              </div>

              <div class="u-form-section">
                <h3>Специализации</h3>
                <div class="u-tags">
                  <button
                    v-for="sp in SPECIALIZATION_OPTIONS"
                    :key="`spec-${sp}`"
                    type="button"
                    class="pkg-tag-picker"
                    :class="{ 'pkg-tag-picker--active': form.specializations.includes(sp) }"
                    @click="toggleSpec(sp)"
                  >{{ sp }}</button>
                </div>
              </div>

              <div class="u-form-foot">
                <button type="submit" class="a-btn-save" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
                <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
          </template>

        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  PRICE_UNITS,
} from '~~/shared/types/designer'

const props = defineProps<{ designerId: number; hideNav?: boolean; modelSection?: string }>()
const emit = defineEmits<{ 'update:section': [string] }>()

const designerIdRef = computed(() => props.designerId)

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

// ── 2-layer sidebar: accept section from parent page ──
watch(() => props.modelSection, v => { if (v && v !== section.value) section.value = v })
watch(section, v => emit('update:section', v))

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
const DESIGNER_DOC_CATEGORIES = [
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

function formatDocDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('ru-RU')
}

function toggleSpec(sp: string) {
  const idx = form.specializations.indexOf(sp)
  if (idx >= 0) form.specializations.splice(idx, 1)
  else form.specializations.push(sp)
}

// ── Services editing ──

const editingServices = ref(false)
const savingSvc = ref(false)
const editServicesList = ref<DesignerServicePrice[]>([])
const svcEditError = ref('')
const svcEditSuccess = ref('')

// ── Inline price editing ──
const inlinePriceKey = ref<string | null>(null)
const inlinePriceVal = ref(0)

function startInlinePrice(svc: DesignerServicePrice) {
  if (inlinePriceKey.value === svc.serviceKey) return
  inlinePriceKey.value = svc.serviceKey
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
  if (inlinePriceKey.value !== svc.serviceKey) return
  const newPrice = Math.max(0, Number(inlinePriceVal.value) || 0)
  inlinePriceKey.value = null
  if (newPrice === svc.price) return
  const updated = services.value.map(s =>
    s.serviceKey === svc.serviceKey ? { ...s, price: newPrice } : { ...s }
  )
  await saveServices(updated)
}

const editServicesByCat = computed(() => {
  const map = new Map<DesignerServiceCategory, DesignerServicePrice[]>()
  for (const svc of editServicesList.value) {
    if (!map.has(svc.category)) map.set(svc.category, [])
    map.get(svc.category)!.push(svc)
  }
  return map
})

function startEditServices() {
  svcEditError.value = ''
  svcEditSuccess.value = ''
  editServicesList.value = JSON.parse(JSON.stringify(services.value))
  if (!editServicesList.value.length) addCustomService()
  editingServices.value = true
}
function cancelEditServices() {
  svcEditError.value = ''
  editingServices.value = false
}
async function saveEditedServices() {
  svcEditError.value = ''
  svcEditSuccess.value = ''
  const normalized = normalizeServicesForSave(editServicesList.value)
  if (!normalized.ok) {
    svcEditError.value = normalized.error
    return
  }
  savingSvc.value = true
  try {
    await saveServices(normalized.list)
    editingServices.value = false
    svcEditSuccess.value = 'Услуги сохранены'
    setTimeout(() => { svcEditSuccess.value = '' }, 2500)
  } finally {
    savingSvc.value = false
  }
}
function removeEditService(key: string) {
  editServicesList.value = editServicesList.value.filter(s => s.serviceKey !== key)
}
function addCustomService() {
  const id = `${Date.now()}_${Math.floor(Math.random() * 1000)}`
  editServicesList.value.push({
    serviceKey: `custom_${id}`,
    title: '',
    description: '',
    category: 'additional',
    unit: 'fixed',
    price: 0,
    enabled: true,
  })
}
function duplicateEditService(key: string) {
  const index = editServicesList.value.findIndex(s => s.serviceKey === key)
  if (index < 0) return
  const source = editServicesList.value[index]
  const id = `${Date.now()}_${Math.floor(Math.random() * 1000)}`
  const copy: DesignerServicePrice = {
    ...JSON.parse(JSON.stringify(source)),
    serviceKey: `${source.serviceKey}_copy_${id}`,
    title: source.title ? `${source.title} (копия)` : 'Новая услуга',
  }
  editServicesList.value.splice(index + 1, 0, copy)
}
function moveEditService(key: string, direction: -1 | 1) {
  const index = editServicesList.value.findIndex(s => s.serviceKey === key)
  if (index < 0) return
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= editServicesList.value.length) return
  const [item] = editServicesList.value.splice(index, 1)
  editServicesList.value.splice(targetIndex, 0, item)
}

function normalizeServicesForSave(list: DesignerServicePrice[]): { ok: true; list: DesignerServicePrice[] } | { ok: false; error: string } {
  const cleaned = list
    .map(item => ({
      ...item,
      title: String(item.title || '').trim(),
      description: String(item.description || '').trim(),
      price: Number.isFinite(Number(item.price)) ? Math.max(0, Number(item.price)) : 0,
    }))
    .filter(item => item.title || item.description || item.price > 0)

  if (!cleaned.length) {
    return { ok: false, error: 'Добавьте хотя бы одну услугу с названием' }
  }

  const seen = new Set<string>()
  for (const item of cleaned) {
    if (!item.title) return { ok: false, error: 'У всех услуг должно быть заполнено название' }
    if (!item.serviceKey) return { ok: false, error: 'Ошибка ключа услуги, добавьте услугу заново' }
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

const editingPackages = ref(false)
const savingPkg = ref(false)
const editPackagesList = ref<DesignerPackage[]>([])
const pkgEditError = ref('')
const pkgEditSuccess = ref('')

const allServiceKeys = computed(() => {
  if (editingServices.value) {
    return editServicesList.value.map(s => ({ key: s.serviceKey, title: s.title }))
  }
  return services.value.map(s => ({ key: s.serviceKey, title: s.title }))
})

function startEditPackages() {
  pkgEditError.value = ''
  pkgEditSuccess.value = ''
  editPackagesList.value = JSON.parse(JSON.stringify(packages.value))
  if (!editPackagesList.value.length) addCustomPackage()
  editingPackages.value = true
}
function cancelEditPackages() {
  pkgEditError.value = ''
  editingPackages.value = false
}
async function saveEditedPackages() {
  pkgEditError.value = ''
  pkgEditSuccess.value = ''
  const normalized = normalizePackagesForSave(editPackagesList.value)
  if (!normalized.ok) {
    pkgEditError.value = normalized.error
    return
  }
  savingPkg.value = true
  try {
    await savePackages(normalized.list)
    editingPackages.value = false
    pkgEditSuccess.value = 'Пакеты сохранены'
    setTimeout(() => { pkgEditSuccess.value = '' }, 2500)
  } finally {
    savingPkg.value = false
  }
}
function togglePkgService(pkg: DesignerPackage, key: string) {
  const idx = pkg.serviceKeys.indexOf(key)
  if (idx >= 0) pkg.serviceKeys.splice(idx, 1)
  else pkg.serviceKeys.push(key)
}
function addCustomPackage() {
  const id = `${Date.now()}_${Math.floor(Math.random() * 1000)}`
  editPackagesList.value.push({
    key: `custom_package_${id}`,
    title: '',
    description: '',
    serviceKeys: [],
    pricePerSqm: 0,
    enabled: true,
  })
}
function duplicateEditPackage(key: string) {
  const index = editPackagesList.value.findIndex(p => p.key === key)
  if (index < 0) return
  const source = editPackagesList.value[index]
  const id = `${Date.now()}_${Math.floor(Math.random() * 1000)}`
  const copy: DesignerPackage = {
    ...JSON.parse(JSON.stringify(source)),
    key: `${source.key}_copy_${id}`,
    title: source.title ? `${source.title} (копия)` : 'Новый пакет',
  }
  editPackagesList.value.splice(index + 1, 0, copy)
}
function moveEditPackage(key: string, direction: -1 | 1) {
  const index = editPackagesList.value.findIndex(p => p.key === key)
  if (index < 0) return
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= editPackagesList.value.length) return
  const [item] = editPackagesList.value.splice(index, 1)
  editPackagesList.value.splice(targetIndex, 0, item)
}
function removeEditPackage(key: string) {
  editPackagesList.value = editPackagesList.value.filter(p => p.key !== key)
}

function normalizePackagesForSave(list: DesignerPackage[]): { ok: true; list: DesignerPackage[] } | { ok: false; error: string } {
  const cleaned = list
    .map(pkg => ({
      ...pkg,
      key: String(pkg.key || '').trim(),
      title: String(pkg.title || '').trim(),
      description: String(pkg.description || '').trim(),
      pricePerSqm: Number.isFinite(Number(pkg.pricePerSqm)) ? Math.max(0, Number(pkg.pricePerSqm)) : 0,
      serviceKeys: Array.from(new Set((pkg.serviceKeys || []).filter(Boolean))),
    }))
    .filter(pkg => pkg.title || pkg.pricePerSqm > 0 || pkg.serviceKeys.length > 0)

  if (!cleaned.length) {
    return { ok: false, error: 'Добавьте хотя бы один пакет' }
  }

  const seen = new Set<string>()
  for (const pkg of cleaned) {
    if (!pkg.key) return { ok: false, error: 'Ошибка ключа пакета, добавьте пакет заново' }
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

// ── Subscriptions editing ──

const editingSubscriptions = ref(false)
const savingSub = ref(false)
const editSubscriptionsList = ref<DesignerSubscription[]>([])
const subEditError = ref('')
const subEditSuccess = ref('')

function startEditSubscriptions() {
  subEditError.value = ''
  subEditSuccess.value = ''
  editSubscriptionsList.value = JSON.parse(JSON.stringify(subscriptions.value))
  if (!editSubscriptionsList.value.length) addCustomSubscription()
  editingSubscriptions.value = true
}
function cancelEditSubscriptions() {
  subEditError.value = ''
  editingSubscriptions.value = false
}
async function saveEditedSubscriptions() {
  subEditError.value = ''
  subEditSuccess.value = ''
  const normalized = normalizeSubscriptionsForSave(editSubscriptionsList.value)
  if (!normalized.ok) {
    subEditError.value = normalized.error
    return
  }
  savingSub.value = true
  try {
    await saveSubscriptions(normalized.list)
    editingSubscriptions.value = false
    subEditSuccess.value = 'Подписки сохранены'
    setTimeout(() => { subEditSuccess.value = '' }, 2500)
  } finally {
    savingSub.value = false
  }
}
function addCustomSubscription() {
  const id = `${Date.now()}_${Math.floor(Math.random() * 1000)}`
  editSubscriptionsList.value.push({
    key: `custom_sub_${id}`,
    title: '',
    description: '',
    billingPeriod: 'monthly',
    price: 0,
    discount: 0,
    serviceKeys: [],
    limits: {},
    enabled: true,
  })
}
function duplicateEditSubscription(key: string) {
  const index = editSubscriptionsList.value.findIndex(s => s.key === key)
  if (index < 0) return
  const source = editSubscriptionsList.value[index]
  const id = `${Date.now()}_${Math.floor(Math.random() * 1000)}`
  const copy: DesignerSubscription = {
    ...JSON.parse(JSON.stringify(source)),
    key: `${source.key}_copy_${id}`,
    title: source.title ? `${source.title} (копия)` : 'Новая подписка',
  }
  editSubscriptionsList.value.splice(index + 1, 0, copy)
}
function moveEditSubscription(key: string, direction: -1 | 1) {
  const index = editSubscriptionsList.value.findIndex(s => s.key === key)
  if (index < 0) return
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= editSubscriptionsList.value.length) return
  const [item] = editSubscriptionsList.value.splice(index, 1)
  editSubscriptionsList.value.splice(targetIndex, 0, item)
}
function removeEditSubscription(key: string) {
  editSubscriptionsList.value = editSubscriptionsList.value.filter(s => s.key !== key)
}
function toggleSubService(sub: DesignerSubscription, key: string) {
  const idx = sub.serviceKeys.indexOf(key)
  if (idx >= 0) sub.serviceKeys.splice(idx, 1)
  else sub.serviceKeys.push(key)
}
function addSubLimit(sub: DesignerSubscription) {
  const name = prompt('Ключ лимита (например: visits, online_hours, renders)')
  if (!name) return
  if (!sub.limits) sub.limits = {}
  sub.limits[name] = 0
}

function normalizeSubscriptionsForSave(list: DesignerSubscription[]): { ok: true; list: DesignerSubscription[] } | { ok: false; error: string } {
  const cleaned = list
    .map(sub => ({
      ...sub,
      key: String(sub.key || '').trim(),
      title: String(sub.title || '').trim(),
      description: String(sub.description || '').trim(),
      price: Number.isFinite(Number(sub.price)) ? Math.max(0, Number(sub.price)) : 0,
      discount: Number.isFinite(Number(sub.discount)) ? Math.min(100, Math.max(0, Number(sub.discount))) : 0,
      serviceKeys: Array.from(new Set((sub.serviceKeys || []).filter(Boolean))),
      limits: sub.limits || {},
    }))
    .filter(sub => sub.title || sub.price > 0)

  if (!cleaned.length) {
    return { ok: false, error: 'Добавьте хотя бы одну подписку' }
  }

  const seen = new Set<string>()
  for (const sub of cleaned) {
    if (!sub.key) return { ok: false, error: 'Ошибка ключа подписки, добавьте подписку заново' }
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
  const svc = services.value.find(s => s.serviceKey === key)
  if (svc) return svc.title
  const tmpl = DESIGNER_SERVICE_TEMPLATES.find(t => t.key === key)
  return tmpl?.title || key
}

function getPackageTitle(key: string): string {
  const pkg = packages.value.find(p => p.key === key)
  if (pkg) return pkg.title
  const tmpl = DESIGNER_PACKAGE_TEMPLATES.find(t => t.key === key)
  return tmpl?.title || key
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
const projectEdit = reactive({
  designerProjectId: 0,
  title: '',
  packageKey: '',
  pricePerSqm: 0,
  area: 0,
  status: 'draft' as 'draft' | 'active' | 'paused' | 'completed' | 'archived',
  notes: '',
})

async function doCreateProject() {
  await createProject()
  showNewProjectModal.value = false
}

function startEditDesignerProject(dp: any) {
  projectEditError.value = ''
  projectEditSuccess.value = ''
  editingDesignerProjectId.value = dp.id
  projectEdit.designerProjectId = dp.id
  projectEdit.title = String(dp.projectTitle || '')
  projectEdit.packageKey = String(dp.packageKey || '')
  projectEdit.pricePerSqm = Number(dp.pricePerSqm || 0)
  projectEdit.area = Number(dp.area || 0)
  projectEdit.status = (dp.status || 'draft') as any
  projectEdit.notes = String(dp.notes || '')
}

function cancelEditDesignerProject() {
  editingDesignerProjectId.value = null
  projectEditError.value = ''
}

async function saveDesignerProjectEdits() {
  projectEditError.value = ''
  projectEditSuccess.value = ''
  if (!projectEdit.title.trim()) {
    projectEditError.value = 'Укажите название проекта'
    return
  }

  savingProject.value = true
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
    editingDesignerProjectId.value = null
    projectEditSuccess.value = 'Проект обновлён'
    setTimeout(() => { projectEditSuccess.value = '' }, 2500)
  } catch (e: any) {
    projectEditError.value = e?.data?.message || 'Не удалось сохранить проект'
  } finally {
    savingProject.value = false
  }
}

</script>

<style scoped>
/* ── Inline feedback ── */
.cab-inline-error  { margin: -10px 0 12px; color: var(--ds-error, #f87171); font-size: .82rem; }
.cab-inline-success { margin: -10px 0 12px; color: var(--ds-success, #34d399); font-size: .82rem; }

/* ── Form accent ── */
.cab-form { display: flex; flex-direction: column; gap: 24px; }
.u-form-section h3 { color: var(--ds-accent, #646cff); }

/* ── Designer-specific dashboard extras ── */
.dash-project-status { font-size: .75rem; padding: 2px 8px; border-radius: 6px; width: fit-content; }
.dash-project-price  { font-size: .82rem; color: var(--ds-success, #34d399); }
.dash-project-area   { font-size: .78rem; opacity: .55; }

/* ── Services ── */
.svc-category  { padding: 20px 24px; border-radius: 12px; margin-bottom: 14px; }
.svc-cat-title { font-size: 1rem; font-weight: 600; margin-bottom: 14px; color: var(--ds-accent, #646cff); }
.svc-list { display: flex; flex-direction: column; gap: 8px; }
.svc-row {
  display: grid; grid-template-columns: 1fr 2fr auto; gap: 12px;
  padding: 10px 14px; border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
  align-items: center;
}
.svc-row.disabled { opacity: .4; }
.svc-name  { font-weight: 500; font-size: .92rem; }
.svc-desc  { font-size: .82rem; opacity: .55; }
.svc-price { font-weight: 600; color: var(--ds-success, #34d399); text-align: right; white-space: nowrap; }

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
.svc-del { background: none; border: none; color: var(--ds-error, #f87171); cursor: pointer; font-size: 1.1rem; padding: 4px 8px; }
.edit-actions { display: flex; gap: 4px; margin-left: 2px; }
.svc-mini {
  border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--glass-text);
  border-radius: 6px; width: 24px; height: 24px; padding: 0; line-height: 1; cursor: pointer; font-size: .72rem;
}
.svc-mini:hover { opacity: .8; }
.svc-add-btn { margin-top: 12px; }

/* ── Packages ── */
.pkg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.pkg-card {
  padding: 22px 20px; border-radius: 14px;
  border: 1px solid var(--glass-border); transition: all .15s;
}
.pkg-card:hover  { border-color: color-mix(in srgb, var(--ds-accent) 30%, var(--glass-border)); }
.pkg-card.disabled { opacity: .4; }
.pkg-card-head  { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.pkg-card-title { font-size: 1.05rem; font-weight: 600; }
.pkg-card-price { font-size: 1.2rem; font-weight: 700; color: var(--ds-accent, #646cff); white-space: nowrap; }
.pkg-card-price span { font-size: .75rem; font-weight: 400; opacity: .55; }
.pkg-card-desc  { font-size: .85rem; opacity: .55; margin-bottom: 14px; line-height: 1.4; }
.pkg-card-services { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 14px; }
.pkg-svc-chip {
  font-size: .72rem; padding: 2px 8px; border-radius: 6px;
  background: color-mix(in srgb, var(--glass-text) 6%, transparent); opacity: .7;
}
.pkg-card-example {
  display: flex; justify-content: space-between; padding: 10px 12px;
  border-radius: 8px; background: color-mix(in srgb, var(--ds-accent) 6%, transparent); font-size: .82rem;
}
.pkg-example-label { opacity: .55; }
.pkg-example-price { font-weight: 600; color: var(--ds-accent, #646cff); }

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
.proj-card-head { margin-bottom: 16px; }
.proj-card-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.proj-card-title { font-size: 1.1rem; font-weight: 600; }
.proj-card-meta { display: flex; gap: 16px; font-size: .82rem; opacity: .55; }
.proj-card-pkg   { color: var(--ds-accent-light, #a0a8ff); }
.proj-card-total { color: var(--ds-success, #34d399); font-weight: 600; }
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
.proj-total strong { color: var(--ds-success, #34d399); font-size: 1.15rem; }

/* ── Subscriptions ── */
.sub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.sub-card { padding: 22px 20px; border-radius: 14px; border: 1px solid var(--glass-border); transition: all .15s; }
.sub-card:hover   { border-color: color-mix(in srgb, var(--ds-accent) 30%, var(--glass-border)); }
.sub-card.disabled { opacity: .4; }
.sub-card-head  { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.sub-card-title { font-size: 1.05rem; font-weight: 600; }
.sub-period-badge { font-size: .72rem; padding: 3px 10px; border-radius: 6px; background: color-mix(in srgb, var(--ds-accent) 12%, transparent); color: var(--ds-accent-light, #a0a8ff); white-space: nowrap; }
.sub-card-price-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; }
.sub-card-price { font-size: 1.3rem; font-weight: 700; color: var(--ds-accent, #646cff); }
.sub-card-price small { font-size: .7rem; font-weight: 400; opacity: .55; }
.sub-card-discount { font-size: .8rem; font-weight: 600; color: var(--ds-success, #34d399); background: rgba(52,211,153,.1); padding: 2px 8px; border-radius: 6px; }
.sub-card-effective { font-size: .82rem; color: var(--ds-success, #34d399); margin-bottom: 8px; }
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
.sub-eff-val { font-weight: 600; color: var(--ds-success, #34d399); }
.sub-edit-limits { margin-bottom: 14px; }
.sub-edit-limits strong { font-size: .85rem; margin-bottom: 8px; display: block; }
.sub-limits-grid { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.sub-limit-row { display: flex; align-items: center; gap: 8px; }
.sub-limit-row .svc-inp { max-width: 160px; }

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

/* ── Responsive (designer-specific) ── */
@media (max-width: 980px) {
  .pkg-grid { grid-template-columns: 1fr; }
  .sub-grid { grid-template-columns: 1fr; }
}
</style>
