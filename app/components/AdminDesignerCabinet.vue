<template>
  <div class="designer-cab" v-if="designerId">
    <div v-if="pending" class="cab-loading">Загружаем…</div>

    <div v-else-if="designer" class="cab-body">
      <aside class="cab-sidebar glass-surface std-sidenav">
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
            <span v-if="item.key === 'projects' && designerProjects.length" class="cab-badge">{{ designerProjects.length }}</span>
            <span v-if="item.key === 'services' && services.length" class="cab-badge">{{ services.length }}</span>
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
                Добавьте свои услуги и пакеты, чтобы генерировать проекты с автоматическим роадмепом.
              </div>
              <button class="cab-cta-btn" @click="initFromTemplates">Загрузить шаблон цен (Москва)</button>
            </div>

            <div v-if="designerProjects.length" class="dash-projects glass-surface">
              <div class="dash-section-title">Последние проекты</div>
              <div class="dash-projects-grid">
                <div v-for="dp in designerProjects.slice(0, 6)" :key="dp.id" class="dash-project-card">
                  <span class="dash-project-name">{{ dp.projectTitle }}</span>
                  <span class="dash-project-status" :class="`st-${dp.status}`">
                    {{ DESIGNER_PROJECT_STATUS_LABELS[dp.status as keyof typeof DESIGNER_PROJECT_STATUS_LABELS] || dp.status }}
                  </span>
                  <span v-if="dp.totalPrice" class="dash-project-price">{{ dp.totalPrice.toLocaleString('ru-RU') }} ₽</span>
                  <span v-if="dp.area" class="dash-project-area">{{ dp.area }} м²</span>
                </div>
              </div>
            </div>
          </template>

          <!-- ═══════════════ SERVICES & PRICING ═══════════════ -->
          <template v-else-if="section === 'services'">
            <div class="cab-section-head">
              <h2>Услуги и прайс-лист</h2>
              <div class="cab-section-actions">
                <button v-if="!services.length" class="cab-btn cab-btn--primary" @click="initFromTemplates">
                  Загрузить шаблон (Москва)
                </button>
                <button v-if="!editingServices" class="cab-btn" @click="startEditServices">
                  {{ services.length ? 'Редактировать' : 'Создать вручную' }}
                </button>
                <button v-if="editingServices" class="cab-btn cab-btn--primary" @click="saveEditedServices">
                  {{ savingSvc ? 'Сохранение…' : 'Сохранить' }}
                </button>
                <button v-if="editingServices" class="cab-btn" @click="addCustomService">＋ Услуга</button>
                <button v-if="editingServices" class="cab-btn" @click="cancelEditServices">Отмена</button>
              </div>
            </div>
            <p v-if="svcEditError" class="cab-inline-error">{{ svcEditError }}</p>
            <p v-if="svcEditSuccess" class="cab-inline-success">{{ svcEditSuccess }}</p>

            <div v-if="!services.length && !editingServices" class="cab-empty">
              <div class="cab-empty-icon">◎</div>
              <p>Услуги не настроены.<br>Загрузите шаблон московских расценок или добавьте вручную.</p>
            </div>

            <template v-if="editingServices">
              <div v-for="[cat, catServices] in editServicesByCat" :key="cat" class="svc-category glass-surface">
                <h3 class="svc-cat-title">{{ DESIGNER_SERVICE_CATEGORY_LABELS[cat] || cat }}</h3>
                <div v-for="(svc, idx) in catServices" :key="svc.serviceKey" class="svc-edit-row">
                  <label class="svc-enable">
                    <input type="checkbox" v-model="svc.enabled" />
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
                    <div class="svc-price">{{ formatPrice(svc.price, svc.unit) }}</div>
                  </div>
                </div>
              </div>
            </template>
          </template>

          <!-- ═══════════════ PACKAGES ═══════════════ -->
          <template v-else-if="section === 'packages'">
            <div class="cab-section-head">
              <h2>Пакеты услуг</h2>
              <div class="cab-section-actions">
                <button v-if="!packages.length" class="cab-btn cab-btn--primary" @click="initPackages">
                  Загрузить стандартные пакеты
                </button>
                <button v-if="!editingPackages" class="cab-btn" @click="startEditPackages">
                  {{ packages.length ? 'Редактировать' : 'Создать вручную' }}
                </button>
                <button v-if="editingPackages" class="cab-btn cab-btn--primary" @click="saveEditedPackages">
                  {{ savingPkg ? 'Сохранение…' : 'Сохранить' }}
                </button>
                <button v-if="editingPackages" class="cab-btn" @click="addCustomPackage">＋ Пакет</button>
                <button v-if="editingPackages" class="cab-btn" @click="cancelEditPackages">Отмена</button>
              </div>
            </div>
            <p v-if="pkgEditError" class="cab-inline-error">{{ pkgEditError }}</p>
            <p v-if="pkgEditSuccess" class="cab-inline-success">{{ pkgEditSuccess }}</p>

            <div v-if="!packages.length && !editingPackages" class="cab-empty">
              <div class="cab-empty-icon">◑</div>
              <p>Пакеты не настроены.<br>Загрузите стандартные или создайте собственные.</p>
            </div>

            <template v-if="editingPackages">
              <div v-for="pkg in editPackagesList" :key="pkg.key" class="pkg-edit glass-surface">
                <div class="pkg-edit-head">
                  <label class="svc-enable"><input type="checkbox" v-model="pkg.enabled" /></label>
                  <input v-model="pkg.title" class="glass-input pkg-title-inp" placeholder="Название пакета" />
                  <div class="pkg-price-edit">
                    <input v-model.number="pkg.pricePerSqm" class="glass-input svc-inp svc-inp--num" type="number" min="0" />
                    <span class="pkg-unit">₽/м²</span>
                  </div>
                  <button type="button" class="svc-del" @click="removeEditPackage(pkg.key)">✕</button>
                </div>
                <textarea v-model="pkg.description" class="glass-input pkg-desc-inp" rows="2" placeholder="Описание пакета" />
                <div class="pkg-services-edit">
                  <strong>Включённые услуги:</strong>
                  <div class="pkg-svc-tags">
                    <button
                      v-for="svc in allServiceKeys"
                      :key="svc.key"
                      type="button"
                      class="cab-tag"
                      :class="{ active: pkg.serviceKeys.includes(svc.key) }"
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
                    <div class="pkg-card-price">{{ pkg.pricePerSqm.toLocaleString('ru-RU') }} <span>₽/м²</span></div>
                  </div>
                  <p class="pkg-card-desc">{{ pkg.description }}</p>
                  <div class="pkg-card-services">
                    <span v-for="sk in pkg.serviceKeys" :key="sk" class="pkg-svc-chip">
                      {{ getServiceTitle(sk) }}
                    </span>
                  </div>
                  <div class="pkg-card-example">
                    <span class="pkg-example-label">Пример: 80 м²</span>
                    <span class="pkg-example-price">{{ (pkg.pricePerSqm * 80).toLocaleString('ru-RU') }} ₽</span>
                  </div>
                </div>
              </div>
            </template>
          </template>

          <!-- ═══════════════ PROJECTS ═══════════════ -->
          <template v-else-if="section === 'projects'">
            <div class="cab-section-head">
              <h2>Мои проекты</h2>
              <button class="cab-btn cab-btn--primary" @click="showNewProjectModal = true">＋ Новый проект</button>
            </div>

            <!-- New project modal -->
            <div v-if="showNewProjectModal" class="cab-inline-modal glass-surface">
              <div class="cab-modal-head">
                <span class="cab-modal-title">Создать проект</span>
                <button class="cab-modal-close" @click="showNewProjectModal = false">✕</button>
              </div>
              <div class="cab-modal-body">
                <div class="cab-field">
                  <label>Название проекта *</label>
                  <input v-model="newProject.title" class="glass-input" placeholder="Квартира на Арбате" @input="newProject.slug = autoSlug(newProject.title)" />
                </div>
                <div class="cab-field">
                  <label>Slug (URL)</label>
                  <input v-model="newProject.slug" class="glass-input" placeholder="kvartira-na-arbate" />
                </div>
                <div class="cab-field">
                  <label>Пакет услуг</label>
                  <select v-model="newProject.packageKey" class="glass-input">
                    <option value="">— без пакета —</option>
                    <option v-for="pkg in availablePackages" :key="pkg.key" :value="pkg.key">
                      {{ pkg.title }} ({{ pkg.pricePerSqm.toLocaleString('ru-RU') }} ₽/м²)
                    </option>
                  </select>
                </div>
                <div class="cab-grid-2">
                  <div class="cab-field">
                    <label>Цена за м²</label>
                    <input v-model.number="newProject.pricePerSqm" class="glass-input" type="number" min="0" />
                  </div>
                  <div class="cab-field">
                    <label>Площадь (м²)</label>
                    <input v-model.number="newProject.area" class="glass-input" type="number" min="0" />
                  </div>
                </div>
                <div v-if="newProject.pricePerSqm && newProject.area" class="proj-total glass-surface">
                  <span>Итого:</span>
                  <strong>{{ (newProject.pricePerSqm * newProject.area).toLocaleString('ru-RU') }} ₽</strong>
                </div>
                <div class="cab-field">
                  <label>Примечание</label>
                  <textarea v-model="newProject.notes" class="glass-input" rows="2" placeholder="Комментарий к проекту…" />
                </div>
              </div>
              <div class="cab-modal-foot">
                <button
                  class="cab-btn cab-btn--primary"
                  :disabled="creatingProject || !newProject.title.trim() || !newProject.slug.trim()"
                  @click="doCreateProject"
                >{{ creatingProject ? 'Создание…' : 'Создать проект' }}</button>
                <button class="cab-btn" @click="showNewProjectModal = false">Отмена</button>
              </div>
            </div>

            <!-- Project list -->
            <div v-if="!designerProjects.length && !showNewProjectModal" class="cab-empty">
              <div class="cab-empty-icon">◒</div>
              <p>Проектов пока нет.<br>Создайте первый проект, чтобы начать работу.</p>
            </div>

            <div v-for="dp in designerProjects" :key="dp.id" class="proj-card glass-surface">
              <div class="proj-card-head">
                <div class="proj-card-title-row">
                  <h3 class="proj-card-title">{{ dp.projectTitle }}</h3>
                  <span class="proj-card-status" :class="`st-${dp.status}`">
                    {{ DESIGNER_PROJECT_STATUS_LABELS[dp.status as keyof typeof DESIGNER_PROJECT_STATUS_LABELS] || dp.status }}
                  </span>
                </div>
                <div class="proj-card-meta">
                  <span v-if="dp.packageKey" class="proj-card-pkg">{{ getPackageTitle(dp.packageKey) }}</span>
                  <span v-if="dp.area" class="proj-card-area">{{ dp.area }} м²</span>
                  <span v-if="dp.pricePerSqm" class="proj-card-ppm">{{ dp.pricePerSqm.toLocaleString('ru-RU') }} ₽/м²</span>
                  <span v-if="dp.totalPrice" class="proj-card-total">{{ dp.totalPrice.toLocaleString('ru-RU') }} ₽</span>
                </div>
              </div>

              <div v-if="dp.notes" class="proj-notes">{{ dp.notes }}</div>
            </div>

          </template>

          <!-- ═══════════════ PROFILE ═══════════════ -->
          <template v-else-if="section === 'profile'">
            <form @submit.prevent="saveProfile" class="cab-form">
              <div class="cab-form-section">
                <h3>Основные данные</h3>
                <div class="cab-grid-2">
                  <div class="cab-field">
                    <label>Имя / Студия *</label>
                    <input v-model="form.name" class="glass-input" required />
                  </div>
                  <div class="cab-field">
                    <label>Компания</label>
                    <input v-model="form.companyName" class="glass-input" placeholder="ООО / ИП…" />
                  </div>
                  <div class="cab-field">
                    <label>Телефон</label>
                    <input v-model="form.phone" class="glass-input" type="tel" placeholder="+7 (___) ___-__-__" />
                  </div>
                  <div class="cab-field">
                    <label>Email</label>
                    <input v-model="form.email" class="glass-input" type="email" placeholder="mail@example.com" />
                  </div>
                  <div class="cab-field">
                    <label>Telegram</label>
                    <input v-model="form.telegram" class="glass-input" placeholder="@username" />
                  </div>
                  <div class="cab-field">
                    <label>Сайт / портфолио</label>
                    <input v-model="form.website" class="glass-input" placeholder="https://…" />
                  </div>
                  <div class="cab-field">
                    <label>Город</label>
                    <input v-model="form.city" class="glass-input" placeholder="Москва" />
                  </div>
                  <div class="cab-field">
                    <label>Опыт работы</label>
                    <input v-model="form.experience" class="glass-input" placeholder="10 лет" />
                  </div>
                </div>
              </div>

              <div class="cab-form-section">
                <h3>О себе</h3>
                <div class="cab-field cab-field-full">
                  <textarea v-model="form.about" class="glass-input" rows="4" placeholder="Расскажите о своём подходе к дизайну, стилях, специализации…" />
                </div>
              </div>

              <div class="cab-form-section">
                <h3>Специализации</h3>
                <div class="cab-tags">
                  <button
                    v-for="sp in SPECIALIZATION_OPTIONS"
                    :key="sp"
                    type="button"
                    class="cab-tag"
                    :class="{ active: form.specializations.includes(sp) }"
                    @click="toggleSpec(sp)"
                  >{{ sp }}</button>
                </div>
              </div>

              <div class="cab-foot">
                <button type="submit" class="cab-save" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</button>
                <span v-if="saveMsg" class="cab-save-msg">{{ saveMsg }}</span>
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
  type DesignerServicePrice,
  type DesignerPackage,
  type DesignerServiceCategory,
  PRICE_UNITS,
} from '~~/shared/types/designer'

const props = defineProps<{ designerId: number }>()

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
  newProject,
  creatingProject,
  createProject,
  addClientToProject,
  addContractorToProject,
  allClients,
  allContractors,
  formatPrice,
  autoSlug,
  refresh,
} = useDesignerCabinet(designerIdRef)

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

async function doCreateProject() {
  await createProject()
  showNewProjectModal.value = false
}


</script>

<style scoped>
/* ── Layout ── */
.designer-cab {
  width: 100%;
  min-height: 100vh;
}
.cab-loading { padding: 48px; text-align: center; color: var(--c-text-muted, #999); }
.cab-body { display: flex; gap: 0; min-height: 100vh; }
.cab-sidebar {
  width: 220px;
  min-width: 220px;
  padding: 18px 0;
  border-right: 1px solid var(--c-border, rgba(255,255,255,.08));
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}
.cab-nav { display: flex; flex-direction: column; gap: 2px; padding: 0 8px; }
.cab-nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 8px; border: none;
  background: transparent; color: var(--c-text, #ccc);
  cursor: pointer; transition: all .15s; font-size: .92rem; text-align: left;
}
.cab-nav-item:hover { background: rgba(255,255,255,.05); }
.cab-nav-item.active { background: rgba(255,255,255,.1); color: #fff; font-weight: 600; }
.cab-nav-icon { font-size: 1.1em; width: 22px; text-align: center; }
.cab-badge {
  margin-left: auto; background: rgba(100,108,255,.25); color: #a0a8ff;
  font-size: .75rem; padding: 1px 8px; border-radius: 10px;
}
.cab-main { flex: 1; padding: 28px 32px; overflow-y: auto; }
.cab-inner { max-width: 960px; }

/* ── Dashboard ── */
.dash-welcome {
  display: flex; justify-content: space-between; align-items: center;
  padding: 24px 28px; border-radius: 14px; margin-bottom: 20px;
}
.dash-welcome-left { display: flex; align-items: center; gap: 16px; }
.dash-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, #646cff, #b060ff);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; font-weight: 700; color: #fff;
}
.dash-welcome-name { font-size: 1.25rem; font-weight: 600; }
.dash-welcome-role { font-size: .88rem; color: var(--c-text-muted, #888); margin-top: 2px; }
.dash-profile-progress { display: flex; align-items: center; gap: 12px; }
.dash-profile-pct-ring {
  width: 52px; height: 52px; border-radius: 50%;
  background: conic-gradient(#646cff calc(var(--pct) * 1%), rgba(255,255,255,.08) 0);
  display: flex; align-items: center; justify-content: center;
}
.dash-profile-pct-val { font-size: .8rem; font-weight: 600; }
.dash-profile-progress-info { display: flex; flex-direction: column; gap: 2px; }
.dash-profile-progress-label { font-size: .8rem; color: var(--c-text-muted, #888); }
.dash-profile-fill-btn {
  background: none; border: none; color: #646cff; cursor: pointer;
  font-size: .8rem; padding: 0; text-align: left;
}

.dash-quick-nav { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.dash-quick-btn {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 18px 12px; border-radius: 12px; cursor: pointer;
  border: 1px solid transparent; background: rgba(255,255,255,.03);
  color: var(--c-text, #ccc); transition: all .15s;
}
.dash-quick-btn:hover { border-color: rgba(100,108,255,.3); background: rgba(100,108,255,.06); }
.dash-quick-icon { font-size: 1.4rem; }
.dash-quick-label { font-size: .82rem; }
.dash-quick-badge {
  font-size: .7rem; background: rgba(100,108,255,.2); color: #a0a8ff;
  padding: 1px 8px; border-radius: 10px;
}

.dash-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.dash-stat {
  padding: 18px 16px; border-radius: 12px; text-align: center;
}
.dash-stat-val { font-size: 1.5rem; font-weight: 700; }
.dash-stat-label { font-size: .78rem; color: var(--c-text-muted, #888); margin-top: 4px; }
.dash-stat--blue .dash-stat-val { color: #60a5fa; }
.dash-stat--green .dash-stat-val { color: #34d399; }

.cab-cta {
  display: flex; align-items: center; gap: 16px; padding: 20px 24px;
  border-radius: 12px; margin-bottom: 20px; border: 1px dashed rgba(100,108,255,.3);
}
.cab-cta-icon { font-size: 2rem; }
.cab-cta-btn {
  margin-left: auto; white-space: nowrap;
  background: #646cff; color: #fff; border: none; padding: 10px 20px;
  border-radius: 8px; cursor: pointer; font-size: .88rem;
}
.cab-cta-btn:hover { background: #5558dd; }

.dash-projects { padding: 20px 24px; border-radius: 12px; margin-bottom: 20px; }
.dash-section-title { font-size: .95rem; font-weight: 600; margin-bottom: 14px; }
.dash-projects-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.dash-project-card {
  display: flex; flex-direction: column; gap: 4px;
  padding: 14px; border-radius: 10px; background: rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.06);
}
.dash-project-name { font-weight: 600; font-size: .9rem; }
.dash-project-status { font-size: .75rem; padding: 2px 8px; border-radius: 6px; width: fit-content; }
.st-draft { background: rgba(255,255,255,.08); color: #aaa; }
.st-active { background: rgba(96,165,250,.15); color: #60a5fa; }
.st-paused { background: rgba(251,191,36,.15); color: #fbbf24; }
.st-completed { background: rgba(52,211,153,.15); color: #34d399; }
.st-archived { background: rgba(255,255,255,.05); color: #666; }
.dash-project-price { font-size: .82rem; color: #34d399; }
.dash-project-area { font-size: .78rem; color: var(--c-text-muted, #888); }

/* ── Section heads ── */
.cab-section-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px;
}
.cab-section-head h2 { font-size: 1.3rem; font-weight: 600; }
.cab-section-actions { display: flex; gap: 8px; }
.cab-inline-error {
  margin: -10px 0 12px;
  color: #f87171;
  font-size: .82rem;
}
.cab-inline-success {
  margin: -10px 0 12px;
  color: #34d399;
  font-size: .82rem;
}

/* ── Buttons ── */
.cab-btn {
  padding: 8px 18px; border-radius: 8px; border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.05); color: var(--c-text, #ccc);
  cursor: pointer; font-size: .88rem; transition: all .15s;
}
.cab-btn:hover { background: rgba(255,255,255,.1); }
.cab-btn--primary { background: #646cff; color: #fff; border-color: #646cff; }
.cab-btn--primary:hover { background: #5558dd; }
.cab-btn:disabled { opacity: .5; cursor: not-allowed; }

/* ── Services ── */
.svc-category { padding: 20px 24px; border-radius: 12px; margin-bottom: 14px; }
.svc-cat-title { font-size: 1rem; font-weight: 600; margin-bottom: 14px; color: #a0a8ff; }
.svc-list { display: flex; flex-direction: column; gap: 8px; }
.svc-row {
  display: grid; grid-template-columns: 1fr 2fr auto; gap: 12px;
  padding: 10px 14px; border-radius: 8px; background: rgba(255,255,255,.02);
  align-items: center;
}
.svc-row.disabled { opacity: .4; }
.svc-name { font-weight: 500; font-size: .92rem; }
.svc-desc { font-size: .82rem; color: var(--c-text-muted, #888); }
.svc-price { font-weight: 600; color: #34d399; text-align: right; white-space: nowrap; }

.svc-edit-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.04);
}
.svc-enable input { accent-color: #646cff; }
.svc-edit-name { flex: 2; }
.svc-edit-desc { flex: 2; }
.svc-edit-cat { flex: 1.3; }
.svc-edit-price { flex: 1; }
.svc-edit-unit { flex: 1; }
.svc-inp {
  width: 100%; padding: 6px 10px; font-size: .85rem;
  border-radius: 6px; border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.04); color: var(--c-text, #ccc);
}
.svc-inp--num { max-width: 120px; }
.svc-del {
  background: none; border: none; color: #f87171; cursor: pointer;
  font-size: 1.1rem; padding: 4px 8px;
}
.svc-add-btn { margin-top: 12px; }

/* ── Packages ── */
.pkg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.pkg-card {
  padding: 22px 20px; border-radius: 14px;
  border: 1px solid rgba(255,255,255,.06); transition: all .15s;
}
.pkg-card:hover { border-color: rgba(100,108,255,.25); }
.pkg-card.disabled { opacity: .4; }
.pkg-card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.pkg-card-title { font-size: 1.05rem; font-weight: 600; }
.pkg-card-price { font-size: 1.2rem; font-weight: 700; color: #646cff; white-space: nowrap; }
.pkg-card-price span { font-size: .75rem; font-weight: 400; color: var(--c-text-muted, #888); }
.pkg-card-desc { font-size: .85rem; color: var(--c-text-muted, #888); margin-bottom: 14px; line-height: 1.4; }
.pkg-card-services { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 14px; }
.pkg-svc-chip {
  font-size: .72rem; padding: 2px 8px; border-radius: 6px;
  background: rgba(255,255,255,.06); color: var(--c-text-muted, #aaa);
}
.pkg-card-example {
  display: flex; justify-content: space-between; padding: 10px 12px;
  border-radius: 8px; background: rgba(100,108,255,.06);
  font-size: .82rem;
}
.pkg-example-label { color: var(--c-text-muted, #888); }
.pkg-example-price { font-weight: 600; color: #646cff; }

.pkg-edit { padding: 20px 24px; border-radius: 12px; margin-bottom: 14px; }
.pkg-edit-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.pkg-title-inp { flex: 1; font-size: 1rem; font-weight: 600; }
.pkg-price-edit { display: flex; align-items: center; gap: 6px; }
.pkg-unit { font-size: .82rem; color: var(--c-text-muted, #888); }
.pkg-desc-inp { width: 100%; margin-bottom: 12px; }
.pkg-services-edit { margin-top: 8px; }
.pkg-services-edit strong { font-size: .85rem; margin-bottom: 8px; display: block; }
.pkg-svc-tags { display: flex; flex-wrap: wrap; gap: 6px; }

/* ── Tags ── */
.cab-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.cab-tag {
  padding: 6px 14px; border-radius: 8px; font-size: .82rem;
  border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03);
  color: var(--c-text, #ccc); cursor: pointer; transition: all .15s;
}
.cab-tag:hover { border-color: rgba(100,108,255,.3); }
.cab-tag.active { background: rgba(100,108,255,.15); border-color: #646cff; color: #a0a8ff; }

/* ── Projects ── */
.proj-card { padding: 22px 24px; border-radius: 14px; margin-bottom: 16px; }
.proj-card-head { margin-bottom: 16px; }
.proj-card-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.proj-card-title { font-size: 1.1rem; font-weight: 600; }
.proj-card-status { font-size: .78rem; padding: 2px 10px; border-radius: 6px; }
.proj-card-meta { display: flex; gap: 16px; font-size: .82rem; color: var(--c-text-muted, #888); }
.proj-card-pkg { color: #a0a8ff; }
.proj-card-total { color: #34d399; font-weight: 600; }

.proj-section { margin-bottom: 14px; }
.proj-section-head {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 8px; font-size: .88rem; font-weight: 500;
}
.proj-section-title { color: var(--c-text-muted, #888); }
.proj-add-btn {
  background: rgba(100,108,255,.12); border: none; color: #a0a8ff;
  width: 26px; height: 26px; border-radius: 50%; cursor: pointer;
  font-size: .9rem; display: flex; align-items: center; justify-content: center;
}
.proj-people { display: flex; flex-wrap: wrap; gap: 8px; }
.proj-person {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 14px; border-radius: 8px; background: rgba(255,255,255,.04);
  font-size: .85rem;
}
.proj-person-name { font-weight: 500; }
.proj-person-info { color: var(--c-text-muted, #888); }
.proj-person-role { color: #a0a8ff; font-size: .78rem; }
.proj-empty-mini { font-size: .82rem; color: var(--c-text-muted, #666); font-style: italic; }
.proj-notes { font-size: .85rem; color: var(--c-text-muted, #888); margin-top: 8px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.06); }
.proj-total {
  display: flex; justify-content: space-between; padding: 14px 16px;
  border-radius: 10px; margin: 10px 0; font-size: 1.05rem;
}
.proj-total strong { color: #34d399; font-size: 1.15rem; }

/* ── Modals ── */
.cab-inline-modal {
  padding: 24px; border-radius: 14px; margin-bottom: 20px;
  border: 1px solid rgba(100,108,255,.2);
}
.cab-modal-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 18px;
}
.cab-modal-title { font-size: 1.05rem; font-weight: 600; }
.cab-modal-close {
  background: none; border: none; color: var(--c-text-muted, #888);
  cursor: pointer; font-size: 1.2rem; padding: 4px 8px;
}
.cab-modal-body { display: flex; flex-direction: column; gap: 14px; }
.cab-modal-foot { display: flex; gap: 10px; margin-top: 18px; }

/* ── Form ── */
.cab-form { display: flex; flex-direction: column; gap: 24px; }
.cab-form-section h3 { font-size: 1rem; font-weight: 600; margin-bottom: 14px; color: #a0a8ff; }
.cab-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.cab-field { display: flex; flex-direction: column; gap: 4px; }
.cab-field label { font-size: .8rem; color: var(--c-text-muted, #888); }
.cab-field-full { grid-column: 1 / -1; }
.cab-foot { display: flex; align-items: center; gap: 14px; }
.cab-save {
  background: #646cff; color: #fff; border: none; padding: 10px 28px;
  border-radius: 8px; cursor: pointer; font-size: .92rem;
}
.cab-save:hover { background: #5558dd; }
.cab-save:disabled { opacity: .5; cursor: not-allowed; }
.cab-save-msg { color: #34d399; font-size: .85rem; }

/* ── Empty states ── */
.cab-empty { text-align: center; padding: 48px 24px; color: var(--c-text-muted, #888); }
.cab-empty-icon { font-size: 2.5rem; margin-bottom: 12px; }

/* ── Responsive ── */
@media (max-width: 768px) {
  .cab-body { flex-direction: column; }
  .cab-sidebar {
    width: 100%; min-width: 100%; position: relative; height: auto;
    border-right: none; border-bottom: 1px solid var(--c-border, rgba(255,255,255,.08));
  }
  .cab-nav { flex-direction: row; overflow-x: auto; }
  .cab-main { padding: 20px 16px; }
  .dash-quick-nav { grid-template-columns: repeat(2, 1fr); }
  .dash-stats { grid-template-columns: repeat(2, 1fr); }
  .cab-grid-2 { grid-template-columns: 1fr; }
  .dash-projects-grid { grid-template-columns: 1fr; }
  .pkg-grid { grid-template-columns: 1fr; }
  .dash-welcome { flex-direction: column; gap: 16px; }
}
</style>
