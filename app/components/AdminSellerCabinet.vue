<template>
  <div class="cab-embed" v-if="sellerId">
    <div v-if="pending && !seller" class="ent-page-skeleton">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 6" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    </div>

    <div v-else-if="seller" class="cab-body" :class="{ 'cab-body--content-only': !showSidebar }">
      <aside v-if="showSidebar" v-show="!isWipe2Mode" class="cab-sidebar glass-surface std-sidenav">
        <nav class="cab-nav std-nav">
          <button
            v-for="item in nav"
            :key="item.key"
            class="cab-nav-item std-nav-item"
            :class="{ active: section === item.key, 'std-nav-item--active': section === item.key }"
            @click="onNavClick(item.key)"
          >
            <span class="cab-nav-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
            <span v-if="item.key === 'projects' && linkedProjects.length" class="u-counter">{{ linkedProjects.length }}</span>
          </button>
        </nav>
      </aside>

      <main
        ref="viewportRef"
        class="cab-main"
        :class="{ 'cab-main--content-only': !showSidebar, 'cv-viewport--paged': isPaged }"
        :tabindex="isPaged ? 0 : undefined"
        @wheel="handleWheel"
        @keydown="handleKeydown"
        @scroll="syncPager"
      >
        <div v-show="!isWipe2Mode" class="cab-inner cv-wipe-inner" :class="{ 'cab-inner--ribbon': showAll }">

          <!-- ═══════════════ DASHBOARD ═══════════════ -->
          <template v-if="(section === 'dashboard') || showAll">
            <div class="cab-section" data-section="dashboard">
            <div class="dash-welcome glass-surface">
              <div class="dash-welcome-left">
                <div class="dash-avatar">{{ seller?.name?.charAt(0)?.toUpperCase() || '◑' }}</div>
                <div>
                  <div class="dash-welcome-name">{{ seller?.name }}</div>
                  <div class="dash-welcome-role">
                    Поставщик / Селлер
                    <span v-if="seller?.city"> · {{ seller.city }}</span>
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

            <div class="dash-quick-nav" v-show="!showAll">
              <button class="dash-quick-btn glass-surface" @click="section = 'profile'">
                <span class="dash-quick-icon">◓</span>
                <span class="dash-quick-label">Профиль</span>
              </button>
              <button class="dash-quick-btn glass-surface" @click="section = 'projects'">
                <span class="dash-quick-icon">◒</span>
                <span class="dash-quick-label">Проекты</span>
                <span v-if="linkedProjects.length" class="dash-quick-badge">{{ linkedProjects.length }}</span>
              </button>
              <button class="dash-quick-btn glass-surface" @click="section = 'requisites'">
                <span class="dash-quick-icon">◎</span>
                <span class="dash-quick-label">Реквизиты</span>
              </button>
              <button class="dash-quick-btn glass-surface" @click="section = 'terms'">
                <span class="dash-quick-icon">⟳</span>
                <span class="dash-quick-label">Условия</span>
              </button>
            </div>

            <div class="dash-stats">
              <div class="dash-stat glass-surface">
                <div class="dash-stat-val">{{ linkedProjects.length }}</div>
                <div class="dash-stat-label">Проектов</div>
              </div>
              <div class="dash-stat glass-surface dash-stat--blue">
                <div class="dash-stat-val">{{ seller?.categories?.length || 0 }}</div>
                <div class="dash-stat-label">Категорий</div>
              </div>
              <div class="dash-stat glass-surface dash-stat--green">
                <div class="dash-stat-val">{{ seller?.rating || '—' }}</div>
                <div class="dash-stat-label">Рейтинг</div>
              </div>
              <div class="dash-stat glass-surface">
                <div class="dash-stat-val">{{ seller?.city || '—' }}</div>
                <div class="dash-stat-label">Город</div>
              </div>
            </div>

            <div v-if="seller?.categories?.length" class="dash-cats glass-surface">
              <CabSectionHeader title="Категории товаров" eyebrow="seller" />
              <div class="u-tags">
                <span v-for="cat in seller.categories" :key="cat" class="u-tag">{{ CATEGORY_LABELS[cat] || cat }}</span>
              </div>
            </div>
            </div>
          </template>

          <!-- ═══════════════ PROFILE ═══════════════ -->
          <template v-if="(section === 'profile') || showAll">
            <div class="cab-section" data-section="profile">
            <CabSectionHeader
              title="Профиль поставщика"
              eyebrow="seller"
              note="Контакты, категории и заметки сохраняются автоматически после изменения поля."
            />
            <form @submit.prevent="saveProfile" class="cab-form" @focusout="queueProfileAutosave" @change="queueProfileAutosave">
              <div class="u-form-section">
                <h3>Основные данные</h3>
                <div class="u-modal__row2">
                  <div class="u-field">
                    <label class="u-field__label">Название *</label>
                    <GlassInput v-model="form.name"  required />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Компания</label>
                    <GlassInput v-model="form.companyName"  placeholder="ООО / ИП…" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Контактное лицо</label>
                    <GlassInput v-model="form.contactPerson"  placeholder="ФИО менеджера" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Телефон</label>
                    <GlassInput v-model="form.phone"  type="tel" placeholder="+7 (___) ___-__-__" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Email</label>
                    <GlassInput v-model="form.email"  type="email" placeholder="mail@example.com" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Telegram</label>
                    <GlassInput v-model="form.telegram"  placeholder="@username" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">WhatsApp</label>
                    <GlassInput v-model="form.whatsapp"  placeholder="+7…" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Сайт</label>
                    <GlassInput v-model="form.website"  placeholder="https://…" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Город</label>
                    <GlassInput v-model="form.city"  placeholder="Москва" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Мессенджер</label>
                    <select v-model="form.messenger" class="glass-input">
                      <option value="">—</option>
                      <option value="telegram">Telegram</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="viber">Viber</option>
                    </select>
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Ник мессенджера</label>
                    <GlassInput v-model="form.messengerNick"  />
                  </div>
                </div>
              </div>

              <div class="u-form-section">
                <h3>Категории товаров</h3>
                <div class="u-tags">
                  <button
                    v-for="cat in CATEGORY_OPTIONS"
                    :key="`cat-${cat}`"
                    type="button"
                    class="pkg-tag-picker"
                    :class="{ 'pkg-tag-picker--active': form.categories.includes(cat) }"
                    @click="toggleCategory(cat)"
                  >{{ CATEGORY_LABELS[cat] || cat }}</button>
                </div>
              </div>

              <div class="u-form-section">
                <h3>Примечания</h3>
                <div class="u-field u-field--full">
                  <textarea v-model="form.notes" class="glass-input u-ta" rows="3" placeholder="Заметки о поставщике…" />
                </div>
              </div>

              <div class="u-form-foot">
                <CabAutosaveStatus :state="profileSaveState" />
                <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
            </div>
          </template>

          <!-- ═══════════════ REQUISITES ═══════════════ -->
          <template v-if="(section === 'requisites') || showAll">
            <div class="cab-section" data-section="requisites">
            <CabSectionHeader
              title="Реквизиты"
              eyebrow="seller"
              note="Юридические и банковские данные синхронизируются без отдельной кнопки сохранения."
            />
            <form @submit.prevent="saveProfile" class="cab-form" @focusout="queueProfileAutosave" @change="queueProfileAutosave">
              <div class="u-form-section">
                <h3>Юридические реквизиты</h3>
                <div class="u-modal__row2">
                  <div class="u-field"><label class="u-field__label">ИНН</label><GlassInput v-model="form.inn"  /></div>
                  <div class="u-field"><label class="u-field__label">КПП</label><GlassInput v-model="form.kpp"  /></div>
                  <div class="u-field"><label class="u-field__label">ОГРН / ОГРНИП</label><GlassInput v-model="form.ogrn"  /></div>
                </div>
              </div>
              <div class="u-form-section">
                <h3>Банковские реквизиты</h3>
                <div class="u-modal__row2">
                  <div class="u-field"><label class="u-field__label">Банк</label><GlassInput v-model="form.bankName"  /></div>
                  <div class="u-field"><label class="u-field__label">БИК</label><GlassInput v-model="form.bik"  /></div>
                  <div class="u-field"><label class="u-field__label">Расчётный счёт</label><GlassInput v-model="form.settlementAccount"  /></div>
                  <div class="u-field"><label class="u-field__label">Корр. счёт</label><GlassInput v-model="form.correspondentAccount"  /></div>
                </div>
              </div>
              <div class="u-form-section">
                <h3>Адреса</h3>
                <div class="u-modal__row2">
                  <div class="u-field"><label class="u-field__label">Юридический адрес</label><AppAddressInput v-model="form.legalAddress" input-class="glass-input" /></div>
                  <div class="u-field"><label class="u-field__label">Фактический адрес</label><AppAddressInput v-model="form.factAddress" input-class="glass-input" /></div>
                </div>
              </div>
              <div class="u-form-foot">
                <CabAutosaveStatus :state="profileSaveState" />
                <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
            </div>
          </template>

          <!-- ═══════════════ TERMS ═══════════════ -->
          <template v-if="(section === 'terms') || showAll">
            <div class="cab-section" data-section="terms">
            <CabSectionHeader
              title="Условия работы"
              eyebrow="seller"
              note="Сроки, оплата и коммерческие условия обновляются в фоне по мере редактирования."
            />
            <form @submit.prevent="saveProfile" class="cab-form" @focusout="queueProfileAutosave" @change="queueProfileAutosave">
              <div class="u-form-section">
                <h3>Условия работы</h3>
                <div class="u-modal__row2">
                  <div class="u-field">
                    <label class="u-field__label">Условия доставки</label>
                    <textarea v-model="form.deliveryTerms" class="glass-input u-ta" rows="2" placeholder="Бесплатная доставка от 50 000 ₽, иначе 2 000 ₽…" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Условия оплаты</label>
                    <textarea v-model="form.paymentTerms" class="glass-input u-ta" rows="2" placeholder="Предоплата 50%, остаток при получении…" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Минимальный заказ</label>
                    <GlassInput v-model="form.minOrder"  placeholder="10 000 ₽" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Скидки</label>
                    <GlassInput v-model="form.discount"  placeholder="5% на объекте от 100 м²" />
                  </div>
                  <div class="u-field">
                    <label class="u-field__label">Рейтинг (1–5)</label>
                    <GlassInput v-model.number="form.rating"  type="number" min="1" max="5" />
                  </div>
                </div>
              </div>
              <div class="u-form-foot">
                <GlassButton variant="primary" type="submit"  :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</GlassButton>
                <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
              </div>
            </form>
            </div>
          </template>

          <!-- ═══════════════ PROJECTS ═══════════════ -->
          <template v-if="(section === 'projects') || showAll">
            <div class="cab-section" data-section="projects">
            <div v-if="!linkedProjects.length" class="u-empty glass-surface">
              <span>◎</span>
              <p>Нет привязанных проектов.<br>Привяжите поставщика к проекту через верхнее меню.</p>
            </div>
            <div v-else class="cab-projects-grid">
              <div v-for="p in linkedProjects" :key="p.slug || p.id" class="dash-project-card glass-surface">
                <span class="dash-project-name">{{ p.title || p.name }}</span>
                <span class="dash-project-slug">{{ p.slug }}</span>
              </div>
            </div>
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
  </div>
</template>

<script setup lang="ts">
import type { Wipe2EntityData } from '~/shared/types/wipe2'
import { registerWipe2Data } from '~/composables/useWipe2'

const props = defineProps<{ sellerId: number; modelValue?: string; showSidebar?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [section: string] }>()
const showSidebar = computed(() => props.showSidebar !== false)
const designSystem = useDesignSystem()

const CATEGORY_OPTIONS = [
  'finish', 'plumbing', 'electrical', 'lighting',
  'furniture', 'textile', 'decor', 'doors_windows',
  'climate', 'kitchen', 'bathroom', 'flooring', 'paint', 'other',
]
const CATEGORY_LABELS: Record<string, string> = {
  finish: 'Отделочные материалы',
  plumbing: 'Сантехника',
  electrical: 'Электрика',
  lighting: 'Освещение',
  furniture: 'Мебель',
  textile: 'Текстиль',
  decor: 'Декор',
  doors_windows: 'Двери и окна',
  climate: 'Климат (кондиционеры)',
  kitchen: 'Кухни',
  bathroom: 'Ванные комнаты',
  flooring: 'Напольные покрытия',
  paint: 'Краски и покрытия',
  other: 'Прочее',
}

const nav = [
  { key: 'dashboard',  icon: '◑', label: 'Обзор' },
  { key: 'profile',    icon: '◓', label: 'Профиль' },
  { key: 'requisites', icon: '◎', label: 'Реквизиты' },
  { key: 'terms',      icon: '⟳', label: 'Условия' },
  { key: 'projects',   icon: '◒', label: 'Проекты' },
]

const section = ref('dashboard')
const sectionOrder = computed(() => nav.map((item) => item.key))
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

const saving = ref(false)
const saveMsg = ref('')
type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'
const profileSaveState = ref<InlineAutosaveState>('')
let profileSaveTimer: ReturnType<typeof setTimeout> | null = null

const { data: seller, pending, refresh } = useFetch<any>(() => `/api/sellers/${props.sellerId}`, {
  server: false,
  watch: [() => props.sellerId],
})

// Linked projects
const { data: linkedProjectsRaw } = useFetch<any[]>(
  () => `/api/sellers/${props.sellerId}/projects`,
  { server: false, default: () => [], watch: [() => props.sellerId] },
)
const linkedProjects = computed(() => linkedProjectsRaw.value || [])

const form = reactive({
  name: '',
  companyName: '',
  contactPerson: '',
  phone: '',
  email: '',
  telegram: '',
  whatsapp: '',
  website: '',
  city: '',
  messenger: '',
  messengerNick: '',
  inn: '',
  kpp: '',
  ogrn: '',
  bankName: '',
  bik: '',
  settlementAccount: '',
  correspondentAccount: '',
  legalAddress: '',
  factAddress: '',
  categories: [] as string[],
  notes: '',
  deliveryTerms: '',
  paymentTerms: '',
  minOrder: '',
  discount: '',
  rating: null as number | null,
})

watch(seller, (s) => {
  if (!s) return
  const keys = Object.keys(form) as (keyof typeof form)[]
  for (const k of keys) {
    if (s[k] !== undefined && s[k] !== null) (form as any)[k] = s[k]
  }
}, { immediate: true })

const profilePct = computed(() => {
  const fields = ['name', 'phone', 'email', 'city', 'inn', 'deliveryTerms', 'categories']
  let filled = 0
  for (const f of fields) {
    const v = (form as any)[f]
    if (Array.isArray(v) ? v.length : v) filled++
  }
  return Math.round(filled / fields.length * 100)
})

function toggleCategory(cat: string) {
  const idx = form.categories.indexOf(cat)
  if (idx === -1) form.categories.push(cat)
  else form.categories.splice(idx, 1)
  queueProfileAutosave()
}

async function saveProfile() {
  saving.value = true; saveMsg.value = ''
  try {
    await $fetch(`/api/sellers/${props.sellerId}`, {
      method: 'PUT',
      body: JSON.parse(JSON.stringify(form)),
    })
    refresh()
  } catch (e: any) {
    saveMsg.value = 'Ошибка: ' + (e?.data?.message || e.message || 'неизвестная')
    throw e
  } finally { saving.value = false }
}

function clearProfileSaveTimer() {
  if (!profileSaveTimer) return
  clearTimeout(profileSaveTimer)
  profileSaveTimer = null
}

function setAutosaveSettled(expected: InlineAutosaveState) {
  setTimeout(() => {
    if (profileSaveState.value === expected) profileSaveState.value = ''
  }, 1400)
}

async function autoSaveProfile() {
  clearProfileSaveTimer()
  profileSaveState.value = 'saving'
  try {
    await saveProfile()
    profileSaveState.value = 'saved'
    setAutosaveSettled('saved')
  } catch {
    profileSaveState.value = 'error'
  }
}

function queueProfileAutosave() {
  clearProfileSaveTimer()
  saveMsg.value = ''
  profileSaveTimer = setTimeout(() => {
    autoSaveProfile()
  }, 420)
}

onBeforeUnmount(() => {
  clearProfileSaveTimer()
})

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

function onNavClick(key: string) {
  section.value = key
  if (showAll.value) requestAnimationFrame(() => scrollToSection(key))
}
watch(section, (key) => {
  if (!showAll.value) return
  requestAnimationFrame(() => scrollToSection(key))
}, { flush: 'post' })

const wipe2CabinetData = computed<Wipe2EntityData | null>(() => {
  const s = seller.value
  if (!s) return null
  const projs = linkedProjects.value || []
  const allSections = [
      { title: 'Обзор', fields: [
        { label: 'Телефон', value: form.phone },
        { label: 'Email', value: form.email },
        { label: 'Город', value: form.city },
        { label: 'Рейтинг', value: form.rating != null ? String(form.rating) : '—' },
        { label: 'Проектов', value: String(projs.length), span: 2 as const },
        { label: 'Категории', value: form.categories.join(', '), span: 2 as const },
      ]},
      { title: 'Профиль', fields: [
        { label: 'Телефон', value: form.phone, description: 'основной контакт поставщика', badge: 'контакт', caption: 'связь', eyebrow: 'профиль', tone: 'default' as const },
        { label: 'Email', value: form.email, description: 'почта для коммерческих запросов', badge: 'mail', caption: 'канал', eyebrow: 'профиль', tone: 'default' as const },
        { label: 'Город', value: form.city, description: 'основная география работы', badge: 'geo', caption: 'регион', eyebrow: 'профиль', tone: 'default' as const },
        { label: 'Контактное лицо', value: form.contactPerson, description: 'человек, который ведёт клиента', badge: 'owner', caption: 'менеджер', eyebrow: 'профиль', tone: 'accent' as const },
        { label: 'Telegram', value: form.telegram, description: 'оперативная связь', badge: 'tg', caption: 'чат', eyebrow: 'профиль', tone: 'default' as const },
        { label: 'Сайт', value: form.website, description: 'витрина поставщика', badge: 'web', caption: 'url', eyebrow: 'профиль', tone: 'default' as const },
        { label: 'Категории', value: form.categories.join(', '), span: 2 as const },
        { label: 'Заметки', value: form.notes, type: 'multiline' as const, span: 2 as const },
      ]},
      { title: 'Условия работы', fields: [
        { label: 'Условия доставки', value: form.deliveryTerms, span: 2 as const, description: 'логистика и сроки поставки', badge: 'delivery', caption: 'исполнение', eyebrow: 'условия', tone: 'accent' as const },
        { label: 'Условия оплаты', value: form.paymentTerms, span: 2 as const, description: 'аванс, постоплата и график', badge: 'finance', caption: 'расчёты', eyebrow: 'условия', tone: 'success' as const },
        { label: 'Мин. заказ', value: form.minOrder, description: 'минимальный порог по заявке', badge: 'min', caption: 'порог', eyebrow: 'условия', tone: 'default' as const },
        { label: 'Скидка', value: form.discount, description: 'базовая коммерческая уступка', badge: 'discount', caption: 'коммерция', eyebrow: 'условия', tone: 'success' as const },
      ]},
      { title: 'Реквизиты', fields: [
        { label: 'ИНН', value: form.inn },
        { label: 'КПП', value: form.kpp },
        { label: 'ОГРН', value: form.ogrn },
        { label: 'Банк', value: form.bankName, span: 2 as const },
        { label: 'БИК', value: form.bik },
        { label: 'Р/с', value: form.settlementAccount, span: 2 as const },
        { label: 'Юр. адрес', value: form.legalAddress, span: 2 as const },
      ]},
      { title: 'Проекты', fields: projs.length
        ? projs.slice(0, 8).map((p: any) => ({
            label: p.title ?? p.name ?? 'Проект',
            value: p.status ?? '',
            type: 'status' as const,
            span: 2 as const,
            description: p.address ?? '',
            badge: p.slug ? 'live' : 'draft',
            caption: p.area ? `${p.area} м²` : 'без площади',
            eyebrow: 'проект',
            tone: 'accent' as const,
          }))
        : [{ label: '', value: 'нет связанных проектов', span: 2 as const }],
      },
    ]
    const W2_SECTION: Record<string, string> = {
      profile: 'Профиль', terms: 'Условия работы', requisites: 'Реквизиты', projects: 'Проекты',
    }
    const sectionTitle = W2_SECTION[section.value]
    return {
      entityTitle: s.name,
      entitySubtitle: form.city || undefined,
      entityStatus: 'поставщик',
      entityStatusColor: 'amber' as const,
      sections: sectionTitle ? allSections.filter(s => s.title === sectionTitle) : allSections,
    }
})
registerWipe2Data(wipe2CabinetData)
</script>

<style scoped>
/* Re-use the cab-* classes from contractor/designer cabinets — they're global in the entity layout system */
.cab-embed { width: 100%; }

.dash-welcome { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-radius: var(--card-radius, 14px); margin-bottom: 16px; gap: 16px; flex-wrap: wrap; }
.dash-welcome-left { display: flex; align-items: center; gap: 16px; }
.dash-avatar { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 600; background: #e8e4e0; color: #555; }
.dash-welcome-name { font-size: 1.05rem; font-weight: 600; }
.dash-welcome-role { font-size: .78rem; color: #888; margin-top: 2px; }
.dash-profile-progress { display: flex; align-items: center; gap: 12px; }
.dash-profile-pct-ring { width: 48px; height: 48px; border-radius: 50%; background: conic-gradient(#5caa7f calc(var(--pct) * 1%), #e8e4e0 0); display: flex; align-items: center; justify-content: center; }
.dash-profile-pct-val { font-size: .72rem; font-weight: 600; background: var(--glass-bg, #fff); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.dash-profile-progress-info { display: flex; flex-direction: column; gap: 2px; }
.dash-profile-progress-label { font-size: .72rem; color: #888; }
.dash-profile-fill-btn { border: 1px solid var(--border, #e0e0e0); background: none; padding: 3px 10px; font-size: .72rem; cursor: pointer; border-radius: 6px; color: #666; }

.dash-quick-nav { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.dash-quick-btn { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border: none; cursor: pointer; font-size: .82rem; border-radius: var(--card-radius, 14px); }
.dash-quick-icon { font-size: 1.1rem; }
.dash-quick-badge { background: #e8e4e0; border-radius: 8px; padding: 1px 7px; font-size: .72rem; }

.dash-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 16px; }
.dash-stat { padding: 16px; border-radius: var(--card-radius, 14px); text-align: center; }
.dash-stat-val { font-size: 1.2rem; font-weight: 600; }
.dash-stat-label { font-size: .72rem; color: #888; margin-top: 4px; }
.dash-stat--blue .dash-stat-val { color: #1976d2; }
.dash-stat--green .dash-stat-val { color: #2e7d32; }

.dash-cats { padding: 16px 20px; border-radius: var(--card-radius, 14px); }
.u-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.u-tag { display: inline-flex; padding: 4px 12px; background: #e8e4e0; border-radius: 8px; font-size: .78rem; color: #555; }

.cab-projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.dash-project-card { padding: 14px 18px; border-radius: var(--card-radius, 14px); display: flex; flex-direction: column; gap: 4px; }
.dash-project-name { font-weight: 500; font-size: .88rem; }
.dash-project-slug { font-size: .72rem; color: #999; }

.u-form-section { margin-bottom: 24px; }
.u-form-section h3 { font-size: .88rem; font-weight: 500; margin: 0 0 12px; }
.u-form-foot { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
.u-save-msg { font-size: .78rem; color: #5caa7f; }
.pkg-tag-picker { display: inline-flex; padding: 4px 12px; border: 1px solid var(--border, #e0e0e0); background: none; border-radius: 8px; font-size: .78rem; cursor: pointer; color: #666; transition: all .15s; }
.pkg-tag-picker:hover { border-color: #aaa; }
.pkg-tag-picker--active { background: #e8e4e0; border-color: #c8c4c0; color: #333; font-weight: 500; }
.tag-picker-subtitle { font-size: .72rem; color: #999; margin-bottom: 6px; }

.u-empty { text-align: center; padding: 40px 20px; border-radius: var(--card-radius, 14px); }
.u-empty span { font-size: 2rem; display: block; margin-bottom: 8px; }
.u-empty p { font-size: .82rem; color: #888; margin: 0; }

@media (max-width: 768px) {
  .cab-body { flex-direction: column; }
  .cab-sidebar { width: 100%; }
  .cab-main { padding: 12px 0 0; }
  .dash-stats { grid-template-columns: 1fr 1fr; }
}
</style>