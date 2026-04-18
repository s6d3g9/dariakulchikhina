<template>
  <div class="cab-section" data-section="services">
    <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalist }">
      <h2>Услуги и прайс-лист</h2>
      <div class="cab-section-actions">
        <GlassButton variant="primary" v-if="!services.length" @click="initFromTemplates">
          Загрузить шаблон (Москва)
        </GlassButton>
        <GlassButton variant="secondary" density="compact" :disabled="serviceCardSaving" @click="openServiceCatalog('create')">＋ Из каталога</GlassButton>
        <GlassButton variant="secondary" density="compact" :disabled="serviceCardSaving" @click="createServiceCard">＋ Своя услуга</GlassButton>
        <span class="cab-section-note">Изменения сохраняются автоматически</span>
      </div>
    </div>
    <p v-if="svcEditError" class="cab-inline-error">{{ svcEditError }}</p>
    <p v-if="svcEditSuccess" class="cab-inline-success">{{ svcEditSuccess }}</p>

    <Transition name="svc-catalog-pop">
      <div v-if="serviceCatalogOpen" class="svc-catalog glass-surface" :class="{ 'svc-catalog--brutalist': isBrutalist }">
        <div class="svc-catalog__head">
          <div>
            <div class="svc-card-editor__eyebrow">каталог услуг</div>
            <strong class="svc-card-editor__title">{{ serviceCatalogMode === 'create' ? 'Добавить типовую услугу в прайс' : 'Заменить услугу из каталога' }}</strong>
          </div>
          <div class="svc-catalog__head-actions">
            <span class="svc-catalog__count">{{ filteredServiceCatalogEntries.length }} из {{ DESIGNER_SERVICE_TEMPLATES.length }}</span>
            <GlassButton variant="secondary" density="compact" type="button" @click="closeServiceCatalog">закрыть</GlassButton>
          </div>
        </div>
        <p class="svc-catalog__note">{{ serviceCatalogMode === 'create' ? 'Сначала добавьте услугу из каталога, потом настройте свою цену и срок. Пакеты будут использовать уже отредактированные значения.' : 'Выберите другую типовую услугу. После замены можно сразу скорректировать цену, описание, срок и категорию под конкретного дизайнера.' }}</p>
        <div v-if="serviceCatalogMode === 'replace' && serviceCatalogTargetUsage.total" class="svc-catalog__warning glass-surface" :class="{ 'svc-catalog__warning--brutalist': isBrutalist }">
          <strong>Услуга уже используется в пакетах или подписках</strong>
          <span>{{ formatServiceUsageHint(serviceCatalogTargetUsage) }}</span>
        </div>
        <div class="svc-catalog-toolbar">
          <div class="u-field svc-catalog-toolbar__search">
            <label class="u-field__label">Поиск по услугам</label>
            <GlassInput v-model="serviceCatalogSearch" placeholder="Название, описание, категория" />
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
            :class="{ 'svc-catalog-row--brutalist': isBrutalist }"
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
        <div v-else class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalist }">
          <span>{{ serviceCatalogMode === 'create' ? '[ КАТАЛОГ УЖЕ ПОДКЛЮЧЁН ]' : '[ НЕТ УСЛУГ ПОД ФИЛЬТР ]' }}</span>
          <p>{{ serviceCatalogMode === 'create' ? 'Все типовые услуги уже добавлены в прайс. Можно редактировать цены, сроки или создавать свои позиции.' : 'Смените поиск или категорию. Занятые шаблоны уже закреплены за другими услугами этого дизайнера.' }}</p>
        </div>
      </div>
    </Transition>

    <div v-if="!services.length" class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalist }">
      <span>◎</span>
      <p>Услуги не настроены.<br>Загрузите шаблон московских расценок или добавьте вручную.</p>
    </div>

    <template v-if="services.length">
      <div v-for="[cat, catServices] in servicesByCat" :key="cat" class="svc-category glass-surface" :class="{ 'svc-category--brutalist': isBrutalist }">
        <div class="svc-cat-head">
          <div class="svc-cat-copy">
            <span class="svc-cat-eyebrow">категория</span>
            <h3 class="svc-cat-title">{{ DESIGNER_SERVICE_CATEGORY_LABELS[cat as DesignerServiceCategory] || cat }}</h3>
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
              :class="{ disabled: !svc.enabled, 'svc-card--brutalist': isBrutalist, 'svc-card--active': serviceCardEditorKey === getServiceActionKey(svc) }"
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
            <div v-if="serviceCardEditorKey === getServiceActionKey(svc) && serviceCardDraft" class="svc-card-editor glass-surface" :class="{ 'svc-card-editor--brutalist': isBrutalist }">
              <div class="svc-card-editor__head">
                <div>
                  <div class="svc-card-editor__eyebrow">редактор услуги</div>
                  <strong class="svc-card-editor__title">{{ getServiceDisplayTitle(serviceCardDraft) }}</strong>
                </div>
                <div class="svc-card-editor__actions">
                  <span class="cab-autosave-status" :class="autosaveStatusClass(serviceCardSaveState)">{{ autosaveStatusLabel(serviceCardSaveState) }}</span>
                  <GlassButton variant="secondary" density="compact" type="button" :disabled="serviceCardSaving" @click="duplicateServiceCard(svc)">дублировать</GlassButton>
                  <GlassButton variant="secondary" density="compact" type="button" :disabled="serviceCardSaving" @click="moveServiceCard(svc, -1)">выше</GlassButton>
                  <GlassButton variant="secondary" density="compact" type="button" :disabled="serviceCardSaving" @click="moveServiceCard(svc, 1)">ниже</GlassButton>
                  <GlassButton variant="danger" density="compact" type="button" :disabled="serviceCardSaving" @click="removeServiceCard(svc)">удалить</GlassButton>
                  <GlassButton variant="secondary" density="compact" type="button" @click="closeServiceCardEditor">свернуть</GlassButton>
                </div>
              </div>
              <p v-if="serviceCardError" class="cab-inline-error">{{ serviceCardError }}</p>
              <div class="svc-card-editor__grid">
                <div class="u-field u-field--full">
                  <label class="u-field__label">Типовая услуга</label>
                  <div class="svc-template-switch glass-surface" :class="{ 'svc-template-switch--brutalist': isBrutalist }">
                    <div class="svc-template-switch__copy">
                      <strong>{{ getServiceTemplateLabel(serviceCardDraft) }}</strong>
                      <span>{{ getServiceTemplateHint(serviceCardDraft) }}</span>
                    </div>
                    <GlassButton variant="secondary" density="compact" type="button" :disabled="serviceCardSaving" @click="openServiceCatalog('replace', svc)">выбрать из каталога</GlassButton>
                  </div>
                  <p v-if="serviceEditorUsage.total" class="svc-template-switch__warning">{{ formatServiceUsageHint(serviceEditorUsage) }}</p>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Название</label>
                  <GlassInput v-model="serviceCardDraft.title" placeholder="Название услуги" @blur="queueServiceCardSave" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Категория</label>
                  <select v-model="serviceCardDraft.category" class="glass-input" @change="queueServiceCardSave">
                    <option v-for="opt in SERVICE_CATEGORY_OPTIONS" :key="`svc-inline-${opt.value}`" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Цена</label>
                  <GlassInput v-model.number="serviceCardDraft.price" type="number" min="0" @blur="queueServiceCardSave" />
                </div>
                <div class="u-field">
                  <label class="u-field__label">Единица</label>
                  <select v-model="serviceCardDraft.unit" class="glass-input" @change="queueServiceCardSave">
                    <option v-for="unit in PRICE_UNITS_LIST" :key="`svc-inline-unit-${unit.value}`" :value="unit.value">{{ unit.label }}</option>
                  </select>
                </div>
                <div class="u-field">
                  <label class="u-field__label">Срок, дней</label>
                  <GlassInput v-model.number="serviceCardDraft.leadTimeDays" type="number" min="0" @blur="queueServiceCardSave" />
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

<script setup lang="ts">
import { nextTick } from 'vue'
import {
  DESIGNER_SERVICE_CATEGORY_LABELS,
  PRICE_UNIT_LABELS,
  DESIGNER_SERVICE_TEMPLATES,
  DESIGNER_PACKAGE_TEMPLATES,
  DESIGNER_SUBSCRIPTION_TEMPLATES,
  type DesignerServicePrice,
  type DesignerPackage,
  type DesignerSubscription,
  type DesignerServiceCategory,
  type PriceUnit,
} from '~~/shared/types/designer'
import {
  getDesignerServicePersistedKey,
  normalizeDesignerServices,
} from '~~/shared/utils/designer-catalogs'

const props = defineProps<{
  designerId: number
  services: DesignerServicePrice[]
  packages: DesignerPackage[]
  isBrutalist: boolean
}>()

const emit = defineEmits<{ refresh: [] }>()

// ── Local helpers ──

type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'

function autosaveStatusClass(state: InlineAutosaveState) {
  return state ? `cab-autosave-status--${state}` : 'cab-autosave-status--idle'
}

function autosaveStatusLabel(state: InlineAutosaveState) {
  if (state === 'saving') return '[ СОХРАНЕНИЕ... ]'
  if (state === 'saved') return '[ СОХРАНЕНО ]'
  if (state === 'error') return '[ ОШИБКА СОХРАНЕНИЯ ]'
  return '[ AUTOSAVE ]'
}

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

function setAutosaveSettled(state: { value: InlineAutosaveState }, expected: InlineAutosaveState) {
  setTimeout(() => {
    if (state.value === expected) state.value = ''
  }, 2200)
}

// ── Constants ──

const PRICE_UNITS_LIST = Object.entries(PRICE_UNIT_LABELS).map(([value, label]) => ({ value, label }))
const SERVICE_CATEGORY_OPTIONS = Object.entries(DESIGNER_SERVICE_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
})) as { value: DesignerServiceCategory; label: string }[]

// ── Computed from props ──

const servicesByCat = computed(() => {
  const map = new Map<DesignerServiceCategory, DesignerServicePrice[]>()
  for (const svc of props.services) {
    const cat = (svc.category || 'additional') as DesignerServiceCategory
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(svc)
  }
  return map
})

// ── Key helpers ──

function getServicePersistedKey(service: DesignerServicePrice, index = props.services.findIndex(item => item === service)) {
  return getDesignerServicePersistedKey(service, Math.max(index, 0))
}

function getServiceActionKey(service: DesignerServicePrice, index = props.services.findIndex(item => item === service)) {
  return getServicePersistedKey(service, index)
}

function findServiceByActionKey(actionKey: string) {
  return props.services.find((item, index) => getServicePersistedKey(item, index) === actionKey) || null
}

function getValidServiceSelectionKeys() {
  return new Set(props.services.map((service, index) => getServicePersistedKey(service, index)))
}

// ── Display helpers ──

function getServiceTemplate(key: string) {
  return DESIGNER_SERVICE_TEMPLATES.find(template => template.key === key)
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

function getServiceMarketLabel(service: DesignerServicePrice): string {
  const template = getServiceTemplate(service.serviceKey)
  if (!template) return 'Индивидуальная услуга'
  return `Рынок ${formatRubles(template.priceRangeMin)}–${formatRubles(template.priceRangeMax)} ${getPriceUnitLabel(template.defaultUnit)}`
}

function getServiceOriginLabel(service: DesignerServicePrice): string {
  return getServiceTemplate(service.serviceKey) ? 'Типовая позиция' : 'Собственная настройка'
}

// ── Package display helpers (for usage hints) ──

function getPackageDisplayTitle(pkg: DesignerPackage | null | undefined, index = 0): string {
  if (!pkg) return `Пакет ${index + 1}`
  const title = String(pkg.title || '').trim()
  if (title) return title
  const template = DESIGNER_PACKAGE_TEMPLATES.find(item => item.key === pkg.key)
  if (template?.title) return template.title
  return `Пакет ${index + 1}`
}

function getSubscriptionDisplayTitle(sub: DesignerSubscription | null | undefined, index = 0): string {
  if (!sub) return `Подписка ${index + 1}`
  const title = String(sub.title || '').trim()
  if (title) return title
  const template = DESIGNER_SUBSCRIPTION_TEMPLATES.find(item => item.key === (sub as DesignerSubscription).key)
  if (template?.title) return template.title
  return `Подписка ${index + 1}`
}

// ── Usage info ──

const EMPTY_SERVICE_USAGE = {
  packageTitles: [] as string[],
  subscriptionTitles: [] as string[],
  total: 0,
}

function formatUsageNames(list: string[]): string {
  if (list.length <= 2) return list.join(', ')
  return `${list.slice(0, 2).join(', ')} +${list.length - 2}`
}

function getServiceUsageInfo(serviceKey: string | null | undefined) {
  if (!serviceKey) return EMPTY_SERVICE_USAGE
  const packageTitles = Array.from(new Set(props.packages
    .filter(pkg => (pkg.serviceKeys || []).includes(serviceKey))
    .map((pkg, index) => getPackageDisplayTitle(pkg, index))))
  // subscriptions not passed in — use empty
  return {
    packageTitles,
    subscriptionTitles: [] as string[],
    total: packageTitles.length,
  }
}

function formatServiceUsageHint(usage: { packageTitles: string[]; subscriptionTitles: string[]; total: number }): string {
  if (!usage.total) return ''
  const parts = []
  if (usage.packageTitles.length) parts.push(`пакеты: ${formatUsageNames(usage.packageTitles)}`)
  if (usage.subscriptionTitles.length) parts.push(`подписки: ${formatUsageNames(usage.subscriptionTitles)}`)
  return `Связанные позиции обновятся автоматически: ${parts.join(' · ')}.`
}

// ── Catalog ──

const serviceCatalogOpen = ref(false)
const serviceCatalogSearch = ref('')
const serviceCatalogCategory = ref<'all' | DesignerServiceCategory>('all')
const serviceCatalogMode = ref<'create' | 'replace'>('create')
const serviceCatalogTargetKey = ref<string | null>(null)

const serviceCatalogTargetUsage = computed(() => {
  if (serviceCatalogMode.value !== 'replace' || !serviceCatalogTargetKey.value) return EMPTY_SERVICE_USAGE
  return getServiceUsageInfo(serviceCatalogTargetKey.value)
})

const serviceEditorUsage = computed(() => {
  if (!serviceCardEditorKey.value) return EMPTY_SERVICE_USAGE
  return getServiceUsageInfo(serviceCardEditorKey.value)
})

const filteredServiceCatalogEntries = computed(() => {
  const usedKeys = new Set(props.services.map((service, index) => getServicePersistedKey(service, index)))
  if (serviceCatalogMode.value === 'replace' && serviceCatalogTargetKey.value) {
    usedKeys.delete(serviceCatalogTargetKey.value)
  }

  const search = serviceCatalogSearch.value.trim().toLowerCase()

  return DESIGNER_SERVICE_TEMPLATES
    .filter(template => !usedKeys.has(template.key))
    .map(template => ({
      key: template.key,
      categoryKey: template.category,
      title: template.title,
      description: template.description,
      category: DESIGNER_SERVICE_CATEGORY_LABELS[template.category],
      price: formatServicePrice(template.defaultPrice, template.defaultUnit),
      priceRange: formatServiceTemplateRange(template),
    }))
    .filter(entry => {
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

// ── Card editor state ──

const serviceCardEditorKey = ref<string | null>(null)
const serviceCardDraft = ref<DesignerServicePrice | null>(null)
const serviceCardSaving = ref(false)
const serviceCardError = ref('')
const serviceCardSaveState = ref<InlineAutosaveState>('')
const serviceCardSnapshot = ref('')
let serviceCardTimer: ReturnType<typeof setTimeout> | null = null

const svcEditError = ref('')
const svcEditSuccess = ref('')

function clearServiceCardTimer() {
  if (!serviceCardTimer) return
  clearTimeout(serviceCardTimer)
  serviceCardTimer = null
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
  clearServiceCardTimer()
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

// ── Inline price ──

const inlinePriceKey = ref<string | null>(null)
const inlinePriceVal = ref(0)

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
  const updated = props.services.map(s =>
    s.serviceKey === svc.serviceKey ? { ...s, price: newPrice } : { ...s },
  )
  await doSaveServices(updated)
}

// ── Normalization ──

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

// ── API calls ──

async function doSaveServices(list: DesignerServicePrice[]) {
  await $fetch(`/api/designers/${props.designerId}`, {
    method: 'PUT',
    body: { services: list },
  })
  emit('refresh')
}

async function doSavePricingCatalog(payload: {
  services?: DesignerServicePrice[]
  packages?: DesignerPackage[]
  subscriptions?: DesignerSubscription[]
  clearProjectPackageKeysForIds?: number[]
}) {
  await $fetch(`/api/designers/${props.designerId}`, {
    method: 'PUT',
    body: payload,
  })
  emit('refresh')
}

// ── Catalog template operations ──

function applyCatalogTemplateToDraft(templateKey: string) {
  if (!serviceCardDraft.value) return
  const template = DESIGNER_SERVICE_TEMPLATES.find(item => item.key === templateKey)
  if (!template) return

  const occupied = props.services.find((item, index) => {
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

// ── Card save ──

async function saveServiceCardEditor() {
  if (!serviceCardDraft.value) return
  clearServiceCardTimer()
  serviceCardError.value = ''
  const activeKey = serviceCardEditorKey.value
  const activeIndex = props.services.findIndex(item => getServiceActionKey(item) === activeKey)
  const draft = cloneDraft(serviceCardDraft.value)
  const updatedList = props.services.map(item => (
    getServiceActionKey(item) === activeKey ? draft : cloneDraft(item)
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
      const nextPackages = props.packages.map(pkg => ({
        ...cloneDraft(pkg),
        serviceKeys: (pkg.serviceKeys || []).map(key => key === activeKey ? nextSelectionKey : key),
      }))
      await doSavePricingCatalog({
        services: normalized.list,
        packages: nextPackages,
      })
    } else {
      await doSaveServices(normalized.list)
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
  serviceCardTimer = setTimeout(() => { saveServiceCardEditor() }, 120)
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
  const template = DESIGNER_SERVICE_TEMPLATES.find(item => item.key === templateKey)
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

async function createServiceCard() {
  svcEditError.value = ''
  const draft = buildCustomServiceDraft()
  serviceCardSaving.value = true
  try {
    await doSaveServices([...props.services.map(item => cloneDraft(item)), draft])
    showTransientMessage(svcEditSuccess, 'Услуга добавлена')
    await nextTick()
    const found = findServiceByActionKey(draft.serviceKey)
    if (found) openServiceCardEditor(found)
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
    await doSaveServices([...props.services.map(item => cloneDraft(item)), draft])
    showTransientMessage(svcEditSuccess, 'Услуга добавлена из каталога')
    await nextTick()
    const found = findServiceByActionKey(templateKey)
    if (found) openServiceCardEditor(found)
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
  const list = props.services.map(item => cloneDraft(item))
  const index = props.services.findIndex(item => getServiceActionKey(item) === getServiceActionKey(service))
  if (index < 0) return
  source.serviceKey = `${service.serviceKey || 'service'}_copy_${makeEditorId()}`
  source.title = source.title ? `${source.title} (копия)` : 'Новая услуга'
  serviceCardSaving.value = true
  try {
    list.splice(index + 1, 0, source)
    await doSaveServices(list)
    showTransientMessage(svcEditSuccess, 'Услуга продублирована')
    await nextTick()
    const found = findServiceByActionKey(source.serviceKey)
    if (found) openServiceCardEditor(found)
  } catch (error: any) {
    svcEditError.value = getRequestErrorMessage(error, 'Не удалось продублировать услугу')
  } finally {
    serviceCardSaving.value = false
  }
}

async function moveServiceCard(service: DesignerServicePrice, direction: -1 | 1) {
  svcEditError.value = ''
  const index = props.services.findIndex(item => getServiceActionKey(item) === getServiceActionKey(service))
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= props.services.length) return
  const list = props.services.map(item => cloneDraft(item))
  const [moved] = list.splice(index, 1)
  list.splice(targetIndex, 0, moved)
  serviceCardSaving.value = true
  try {
    await doSaveServices(list)
    showTransientMessage(svcEditSuccess, 'Порядок услуг обновлён')
    await nextTick()
    const found = findServiceByActionKey(getServiceActionKey(service))
    if (found) openServiceCardEditor(found)
    else openServiceCardEditor(moved)
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
    const nextServices = props.services
      .filter(item => getServiceActionKey(item) !== removedKey)
      .map(item => cloneDraft(item))
    const nextPackages = props.packages.map(pkg => ({
      ...cloneDraft(pkg),
      serviceKeys: (pkg.serviceKeys || []).filter(key => key !== removedKey),
    }))
    const cleanedReferences = nextPackages.some((pkg, index) =>
      (pkg.serviceKeys || []).length !== (props.packages[index]?.serviceKeys || []).length,
    )

    await doSavePricingCatalog({
      services: nextServices,
      packages: nextPackages,
    })
    closeServiceCardEditor()
    showTransientMessage(svcEditSuccess, cleanedReferences ? 'Услуга удалена и убрана из пакетов' : 'Услуга удалена')
  } catch (error: any) {
    svcEditError.value = getRequestErrorMessage(error, 'Не удалось удалить услугу')
  } finally {
    serviceCardSaving.value = false
  }
}

async function initFromTemplates() {
  const list = DESIGNER_SERVICE_TEMPLATES.map(t => ({
    serviceKey: t.key,
    title: t.title,
    description: t.description,
    category: t.category,
    unit: t.defaultUnit,
    price: t.defaultPrice,
    leadTimeDays: 0,
    enabled: true,
  }))
  const pkgs = DESIGNER_PACKAGE_TEMPLATES.map(t => ({
    key: t.key,
    title: t.title,
    description: t.description,
    serviceKeys: [...t.serviceKeys],
    pricePerSqm: t.suggestedPricePerSqm,
    enabled: true,
  }))
  await doSavePricingCatalog({ services: list, packages: pkgs })
}

// Reset editor key when services prop changes (after refresh)
watch(() => props.services, () => {
  if (serviceCardEditorKey.value) {
    const found = props.services.find((item, index) => getServicePersistedKey(item, index) === serviceCardEditorKey.value)
    if (!found) closeServiceCardEditor()
  }
})
</script>
