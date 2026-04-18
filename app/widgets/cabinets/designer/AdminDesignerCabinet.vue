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
            <CabinetDashboardSection
              :designer="designer"
              :show-brutalist-hero="showBrutalistDashboardHero"
              :hero-subtitle="designerHeroSubtitle"
              :dashboard-facts="designerDashboardFacts"
              :profile-pct="profilePct"
              :is-brutalist="isBrutalistDesignerCabinetMode"
              :show-all="showAll"
              :stats="dashStats"
              :services-count="services.length"
              :packages-count="packages.length"
              :subscriptions-count="subscriptions.length"
              :projects-count="designerProjects.length"
              :unique-clients-count="uniqueClients.length"
              :unique-contractors-count="uniqueContractors.length"
              :sellers-count="linkedData?.sellers?.length || 0"
              :projects="designerProjects"
              @navigate="section = $event as typeof section"
              @init-from-templates="initFromTemplates"
            />
          </template>
          <!-- ═══════════════ SERVICES & PRICING ═══════════════ -->
          <template v-if="(section === 'services') || showAll">
            <CabinetServicesSection
              :designer-id="designerId"
              :services="services"
              :packages="packages"
              :is-brutalist="isBrutalistDesignerCabinetMode"
              @refresh="refresh"
            />
          </template>
          <!-- ═══════════════ PACKAGES ═══════════════ -->
          <template v-if="(section === 'packages') || showAll">
            <CabinetPackagesSection
              :designer-id="designerId"
              :packages="packages"
              :services="services"
              :is-brutalist="isBrutalistDesignerCabinetMode"
              @refresh="refresh"
            />
          </template>
          <!-- ═══════════════ SUBSCRIPTIONS ═══════════════ -->
          <template v-if="(section === 'subscriptions') || showAll">
            <CabinetSubscriptionsSection
              :designer-id="designerId"
              :subscriptions="subscriptions"
              :services="services"
              :is-brutalist="isBrutalistDesignerCabinetMode"
              @refresh="refresh"
            />
          </template>

          <template v-if="(section === 'documents') || showAll">
            <CabinetDocumentsSection
              :designer-id="designerId"
              :documents="designerDocs ?? []"
              :is-brutalist="isBrutalistDesignerCabinetMode"
              @refresh="refreshDesignerDocs"
            />
          </template>
          <!-- ═══════════════ PROJECTS ═══════════════ -->
          <template v-if="(section === 'projects') || showAll">
            <CabinetProjectsSection
              :designer-id="designerId"
              :packages="packages"
              :projects="designerProjects"
              :is-brutalist="isBrutalistDesignerCabinetMode"
              @refresh="refresh"
            />
          </template>

          <!-- ═══════════════ CLIENTS (Flat Registry pivot) ═══════════════ -->
          <template v-if="(section === 'clients') || showAll">
            <CabinetClientsSection :clients="uniqueClients" :is-brutalist="isBrutalistDesignerCabinetMode" />
          </template>

          <!-- ═══════════════ CONTRACTORS (Flat Registry pivot) ═══════════════ -->
          <template v-if="(section === 'contractors') || showAll">
            <CabinetContractorsSection :contractors="uniqueContractors" :is-brutalist="isBrutalistDesignerCabinetMode" />
          </template>

          <!-- ═══════════════ SELLERS (Flat Registry pivot) ═══════════════ -->
          <template v-if="(section === 'sellers') || showAll">
            <CabinetSellersSection :sellers="linkedData?.sellers || []" :is-brutalist="isBrutalistDesignerCabinetMode" />
          </template>

          <!-- ═══════════════ MANAGERS (Flat Registry) ═══════════════ -->
          <template v-if="(section === 'managers') || showAll">
            <CabinetManagersSection :managers="linkedData?.managers || []" :is-brutalist="isBrutalistDesignerCabinetMode" />
          </template>

          <!-- ═══════════════ GALLERY (Flat Registry) ═══════════════ -->
          <template v-if="(section === 'gallery') || showAll">
            <CabinetGallerySection :items="galleryList" :is-brutalist="isBrutalistDesignerCabinetMode" />
          </template>

          <!-- ═══════════════ MOODBOARDS (Flat Registry) ═══════════════ -->
          <template v-if="(section === 'moodboards') || showAll">
            <CabinetMoodboardsSection :items="moodboardList" :is-brutalist="isBrutalistDesignerCabinetMode" />
          </template>
          <!-- ═══════════════ PROFILE ═══════════════ -->
          <template v-if="(section === 'profile') || showAll">
            <CabinetProfileSection
              :designer-id="designerId"
              :designer="designer"
              :is-brutalist="isBrutalistDesignerCabinetMode"
              @refresh="refresh"
            />
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
import CabinetServicesSection from './sections/CabinetServicesSection.vue'
import CabinetPackagesSection from './sections/CabinetPackagesSection.vue'
import CabinetSubscriptionsSection from './sections/CabinetSubscriptionsSection.vue'
import CabinetProjectsSection from './sections/CabinetProjectsSection.vue'
import CabinetProfileSection from './sections/CabinetProfileSection.vue'
import {
  DESIGNER_SERVICE_CATEGORY_LABELS,
  PRICE_UNIT_LABELS,
  DESIGNER_PROJECT_STATUS_LABELS,
  DESIGNER_SERVICE_TEMPLATES,
  DESIGNER_PACKAGE_TEMPLATES,
  DESIGNER_SUBSCRIPTION_TEMPLATES,
  BILLING_PERIOD_LABELS,
  BILLING_PERIOD_MONTHS,
  type DesignerServicePrice,
  type DesignerPackage,
  type DesignerSubscription,
  type DesignerServiceCategory,
  type BillingPeriod,
  type PriceUnit,
} from '~~/shared/types/designer'
import {
  getDesignerPackagePersistedKey,
  getDesignerServicePersistedKey,
  getDesignerSubscriptionPersistedKey,
} from '~~/shared/utils/designer-catalogs'
import type { Wipe2EntityData } from '~/shared/types/wipe2'
import { registerWipe2Data } from '~/entities/design-system/model/useWipe2'

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
  profilePct,
  section,
  nav,
  form,
  saveServices,
  initServicesFromTemplates,
  savePackages,
  initPackagesFromTemplates,
  subscriptions,
  refresh,
} = useDesignerCabinet(designerIdRef)

const sectionOrder = computed(() => (nav.value || []).map((item: any) => item.key))

const {
  viewportRef,
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

// ── Service category options (used by wipe2 data) ──
const SERVICE_CATEGORY_OPTIONS = Object.entries(DESIGNER_SERVICE_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
})) as { value: DesignerServiceCategory; label: string }[]

const { data: designerDocs, refresh: refreshDesignerDocs } = await useFetch<any[]>(
  () => `/api/designers/${props.designerId}/documents`,
  { default: () => [], watch: [designerIdRef] },
)

const { data: linkedData } = await useFetch<any>(
  () => `/api/designers/${props.designerId}/linked-entities`,
  { default: () => ({ sellers: [], managers: [], gallery: [], moodboards: [] }), watch: [designerIdRef] },
)

// Document upload/filter state and handlers live inside
// CabinetDocumentsSection.vue; parent only keeps the data fetch so the
// sidebar counter stays in sync.

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

// ── Sidebar counters ──
const { setCabinetCounts } = useAdminNav()

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

async function initFromTemplates() {
  const list = initServicesFromTemplates()
  await saveServices(list)
  const pkgs = initPackagesFromTemplates()
  await savePackages(pkgs)
}

// ── Key lookups (used by wipe2 data) ──

function getServicePersistedKey(service: DesignerServicePrice, index = services.value.findIndex((item) => item === service)) {
  return getDesignerServicePersistedKey(service, Math.max(index, 0))
}

function getServiceActionKey(service: DesignerServicePrice, index = services.value.findIndex((item) => item === service)) {
  return getServicePersistedKey(service, index)
}

function getPackagePersistedKey(pkg: DesignerPackage, index = packages.value.findIndex((item) => item === pkg)) {
  return getDesignerPackagePersistedKey(pkg, Math.max(index, 0))
}

function getPackageActionKey(pkg: DesignerPackage, index = packages.value.findIndex((item) => item === pkg)) {
  return getPackagePersistedKey(pkg, index)
}

function getSubscriptionPersistedKey(subscription: DesignerSubscription, index = subscriptions.value.findIndex((item) => item === subscription)) {
  return getDesignerSubscriptionPersistedKey(subscription, Math.max(index, 0))
}

function getSubscriptionActionKey(subscription: DesignerSubscription, index = subscriptions.value.findIndex((item) => item === subscription)) {
  return getSubscriptionPersistedKey(subscription, index)
}

// ── Display helpers (used by wipe2 data) ──

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

function getServiceTemplate(key: string) {
  return DESIGNER_SERVICE_TEMPLATES.find(template => template.key === key)
}

function getServiceCategoryValue(service: DesignerServicePrice): DesignerServiceCategory {
  if (service.category) return service.category
  const template = getServiceTemplate(service.serviceKey)
  return (template?.category || 'additional') as DesignerServiceCategory
}

function getServiceCategoryLabel(service: DesignerServicePrice): string {
  return DESIGNER_SERVICE_CATEGORY_LABELS[getServiceCategoryValue(service)] || 'услуга'
}

function getServiceBySelectionKey(key: string): DesignerServicePrice | undefined {
  return services.value.find((service, index) => getServicePersistedKey(service, index) === key)
}

function getServiceTitle(key: string): string {
  const svc = getServiceBySelectionKey(key)
  if (svc) return svc.title
  const tmpl = DESIGNER_SERVICE_TEMPLATES.find(t => t.key === key)
  return tmpl?.title || key
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

function getServiceCountLabel(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return `${count} услуга`
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return `${count} услуги`
  return `${count} услуг`
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

function getPackageVisibleServiceKeys(pkg: DesignerPackage): string[] {
  return (pkg.serviceKeys || []).slice(0, 5)
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

function getPackageExamplePrice(pkg: DesignerPackage, area: number): string {
  return `${formatRubles((pkg.pricePerSqm || 0) * area)} ₽`
}

function getPackageListDescription(pkg: DesignerPackage): string {
  const parts = [getPackageCoverageLabel(pkg), getPackageCategoryLabel(pkg)]
  const visibleServices = getPackageVisibleServiceKeys(pkg).map((key) => getServiceTitle(key)).filter(Boolean)
  if (visibleServices.length) parts.push(`Состав: ${visibleServices.join(', ')}`)
  return parts.filter(Boolean).join('. ')
}

function getPackageGroupLabel(pkg: DesignerPackage): string {
  const count = (pkg.serviceKeys || []).length
  if (pkg.enabled === false) return 'Черновики пакетов'
  if (count >= 6) return 'Полные пакеты'
  if (count >= 4) return 'Сбалансированные пакеты'
  if (count >= 2) return 'Компактные пакеты'
  return 'Точечные пакеты'
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

<style scoped src="./AdminDesignerCabinet.scoped.css"></style>
