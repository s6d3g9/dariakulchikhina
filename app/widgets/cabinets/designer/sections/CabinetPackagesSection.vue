<template>
  <div class="cab-section" data-section="packages">
    <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalist }">
      <h2>Пакеты услуг</h2>
      <div class="cab-section-actions">
        <GlassButton variant="primary" v-if="!packages.length" @click="initPackages">
          Загрузить стандартные пакеты
        </GlassButton>
        <GlassButton variant="secondary" density="compact" :disabled="packageCardSaving" @click="createPackageCard">＋ Пакет</GlassButton>
        <span class="cab-section-note">Изменения сохраняются автоматически</span>
      </div>
    </div>
    <p v-if="pkgEditError" class="cab-inline-error">{{ pkgEditError }}</p>
    <p v-if="pkgEditSuccess" class="cab-inline-success">{{ pkgEditSuccess }}</p>

    <div v-if="!packages.length" class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalist }">
      <span>◑</span>
      <p>Пакеты не настроены.<br>Загрузите стандартные или создайте собственные.</p>
    </div>

    <template v-if="packages.length">
      <div class="pkg-grid" :class="{ 'pkg-grid--brutalist': isBrutalist }">
        <div v-for="pkg in packages" :key="getPackageActionKey(pkg)" class="pkg-card-stack">
          <article
            class="pkg-card glass-surface"
            :class="{ disabled: !pkg.enabled, 'pkg-card--brutalist': isBrutalist, 'pkg-card--active': packageCardEditorKey === getPackageActionKey(pkg) }"
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
          <div v-if="packageCardEditorKey === getPackageActionKey(pkg) && packageCardDraft" class="pkg-card-editor glass-surface" :class="{ 'pkg-card-editor--brutalist': isBrutalist }">
            <div class="pkg-card-editor__head">
              <div>
                <div class="svc-card-editor__eyebrow">редактор пакета</div>
                <strong class="svc-card-editor__title">{{ getPackageDisplayTitle(packageCardDraft) }}</strong>
              </div>
              <div class="svc-card-editor__actions">
                <span class="cab-autosave-status" :class="autosaveStatusClass(packageCardSaveState)">{{ autosaveStatusLabel(packageCardSaveState) }}</span>
                <GlassButton variant="secondary" density="compact" type="button" :disabled="packageCardSaving" @click="duplicatePackageCard(pkg)">дублировать</GlassButton>
                <GlassButton variant="secondary" density="compact" type="button" :disabled="packageCardSaving" @click="movePackageCard(pkg, -1)">выше</GlassButton>
                <GlassButton variant="secondary" density="compact" type="button" :disabled="packageCardSaving" @click="movePackageCard(pkg, 1)">ниже</GlassButton>
                <GlassButton variant="danger" density="compact" type="button" :disabled="packageCardSaving" @click="removePackageCard(pkg)">удалить</GlassButton>
                <GlassButton variant="secondary" density="compact" type="button" @click="closePackageCardEditor">свернуть</GlassButton>
              </div>
            </div>
            <p v-if="packageCardError" class="cab-inline-error">{{ packageCardError }}</p>
            <p v-if="packageEditorUsage.total" class="svc-template-switch__warning">{{ formatPackageUsageHint(packageEditorUsage) }}</p>
            <div class="svc-card-editor__grid">
              <div class="u-field">
                <label class="u-field__label">Название пакета</label>
                <GlassInput v-model="packageCardDraft.title" placeholder="Название пакета" @blur="queuePackageCardSave" />
              </div>
              <div class="u-field">
                <label class="u-field__label">Цена за м²</label>
                <GlassInput v-model.number="packageCardDraft.pricePerSqm" type="number" min="0" @blur="queuePackageCardSave" />
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

<script setup lang="ts">
import { nextTick } from 'vue'
import {
  DESIGNER_SERVICE_CATEGORY_LABELS,
  PRICE_UNIT_LABELS,
  DESIGNER_SERVICE_TEMPLATES,
  DESIGNER_PACKAGE_TEMPLATES,
  type DesignerServicePrice,
  type DesignerPackage,
  type PriceUnit,
} from '~~/shared/types/designer'
import {
  getDesignerServicePersistedKey,
  getDesignerPackagePersistedKey,
  normalizeDesignerPackages,
} from '~~/shared/utils/designer-catalogs'

const props = defineProps<{
  designerId: number
  packages: DesignerPackage[]
  services: DesignerServicePrice[]
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

// ── Key helpers ──

function getServicePersistedKey(service: DesignerServicePrice, index = props.services.findIndex(item => item === service)) {
  return getDesignerServicePersistedKey(service, Math.max(index, 0))
}

function getPackagePersistedKey(pkg: DesignerPackage, index = props.packages.findIndex(item => item === pkg)) {
  return getDesignerPackagePersistedKey(pkg, Math.max(index, 0))
}

function getPackageActionKey(pkg: DesignerPackage, index = props.packages.findIndex(item => item === pkg)) {
  return getPackagePersistedKey(pkg, index)
}

function findPackageByActionKey(actionKey: string) {
  return props.packages.find((item, index) => getPackagePersistedKey(item, index) === actionKey) || null
}

function getValidServiceSelectionKeys() {
  return new Set(props.services.map((service, index) => getServicePersistedKey(service, index)))
}

// ── Display helpers ──

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

function getServiceCountLabel(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return `${count} услуга`
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return `${count} услуги`
  return `${count} услуг`
}

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

function getServiceBySelectionKey(key: string): DesignerServicePrice | undefined {
  return props.services.find((service, index) => getServicePersistedKey(service, index) === key)
}

function getServiceTitle(key: string): string {
  const svc = getServiceBySelectionKey(key)
  if (svc) return svc.title
  const tmpl = DESIGNER_SERVICE_TEMPLATES.find(t => t.key === key)
  return tmpl?.title || key
}

function getServiceCategoryValue(service: DesignerServicePrice) {
  if (service.category) return service.category
  const template = getServiceTemplate(service.serviceKey)
  return template?.category || 'additional'
}

function getServiceCategoryLabel(service: DesignerServicePrice): string {
  return DESIGNER_SERVICE_CATEGORY_LABELS[getServiceCategoryValue(service) as keyof typeof DESIGNER_SERVICE_CATEGORY_LABELS] || 'услуга'
}

function getServiceLeadTimeLabel(service: DesignerServicePrice): string {
  const normalized = Math.max(0, Number(service.leadTimeDays) || 0)
  if (!normalized) return 'срок не задан'
  if (normalized % 10 === 1 && normalized % 100 !== 11) return `${normalized} день`
  if (normalized % 10 >= 2 && normalized % 10 <= 4 && (normalized % 100 < 10 || normalized % 100 >= 20)) return `${normalized} дня`
  return `${normalized} дней`
}

function getPackageDisplayTitle(pkg: DesignerPackage | null | undefined, index = 0): string {
  if (!pkg) return `Пакет ${index + 1}`
  const title = String(pkg.title || '').trim()
  if (title) return title
  const template = DESIGNER_PACKAGE_TEMPLATES.find(item => item.key === pkg.key)
  if (template?.title) return template.title
  return `Пакет ${index + 1}`
}

function getPackageDisplayDescription(pkg: DesignerPackage | null | undefined): string {
  if (!pkg) return 'Опишите состав пакета, объём сопровождения и для какого сценария он подходит.'
  const description = String(pkg.description || '').trim()
  if (description) return description
  const template = DESIGNER_PACKAGE_TEMPLATES.find(item => item.key === pkg.key)
  return template?.description || 'Опишите состав пакета, объём сопровождения и для какого сценария он подходит.'
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
  const labels = Array.from(new Set((pkg.serviceKeys || []).map(key => {
    const service = props.services.find(item => item.serviceKey === key)
    if (service) return DESIGNER_SERVICE_CATEGORY_LABELS[service.category as keyof typeof DESIGNER_SERVICE_CATEGORY_LABELS]
    const template = getServiceTemplate(key)
    return template ? DESIGNER_SERVICE_CATEGORY_LABELS[template.category as keyof typeof DESIGNER_SERVICE_CATEGORY_LABELS] : ''
  }).filter(Boolean))) as string[]

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
    .map(key => getServiceBySelectionKey(key)?.leadTimeDays || 0)
    .filter(value => value > 0)
  if (!days.length) return null
  return { min: Math.min(...days), max: Math.max(...days) }
}

function formatLeadTimeDays(days?: number | null): string {
  const normalized = Math.max(0, Number(days) || 0)
  if (!normalized) return 'срок не задан'
  if (normalized % 10 === 1 && normalized % 100 !== 11) return `${normalized} день`
  if (normalized % 10 >= 2 && normalized % 10 <= 4 && (normalized % 100 < 10 || normalized % 100 >= 20)) return `${normalized} дня`
  return `${normalized} дней`
}

function getPackageLeadTimeLabel(pkg: DesignerPackage): string {
  const stats = getLeadTimeStats(pkg.serviceKeys || [])
  if (!stats) return 'Срок пакета будет собран из сроков выбранных услуг.'
  if (stats.min === stats.max) return `Срок пакета: ${formatLeadTimeDays(stats.max)}`
  return `Срок пакета: ${formatLeadTimeDays(stats.min)}–${formatLeadTimeDays(stats.max)}`
}

function getDraftServiceBundleSummary(keys: string[]) {
  const stats = getLeadTimeStats(keys)
  if (!stats) return 'Выбирайте уже настроенные услуги: пакет и подписка подтянут их текущую цену и срок.'
  if (stats.min === stats.max) return `Срок набора услуг: ${formatLeadTimeDays(stats.max)}.`
  return `Срок набора услуг: от ${formatLeadTimeDays(stats.min)} до ${formatLeadTimeDays(stats.max)}.`
}

// ── Usage info ──

const EMPTY_PACKAGE_USAGE = {
  projectTitles: [] as string[],
  total: 0,
}

function formatUsageNames(list: string[]): string {
  if (list.length <= 2) return list.join(', ')
  return `${list.slice(0, 2).join(', ')} +${list.length - 2}`
}

function formatPackageUsageHint(usage: { projectTitles: string[]; total: number }) {
  if (!usage.total) return ''
  return `Связанные проекты обновятся автоматически: ${formatUsageNames(usage.projectTitles)}.`
}

const packageEditorUsage = computed(() => {
  if (!packageCardEditorKey.value) return EMPTY_PACKAGE_USAGE
  return EMPTY_PACKAGE_USAGE // projects not passed — usage info not available in this child
})

// ── Service options for picker ──

const allServiceOptions = computed(() => {
  return props.services
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

// ── Card editor state ──

const packageCardEditorKey = ref<string | null>(null)
const packageCardDraft = ref<DesignerPackage | null>(null)
const packageCardSaving = ref(false)
const packageCardError = ref('')
const packageCardSaveState = ref<InlineAutosaveState>('')
const packageCardSnapshot = ref('')
let packageCardTimer: ReturnType<typeof setTimeout> | null = null

const pkgEditError = ref('')
const pkgEditSuccess = ref('')

function clearPackageCardTimer() {
  if (!packageCardTimer) return
  clearTimeout(packageCardTimer)
  packageCardTimer = null
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
  closePackageCardEditor()
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
  return keys.map(key => {
    const service = getServiceBySelectionKey(key)
    return {
      key,
      title: getServiceTitle(key),
      price: service ? formatServicePrice(service.price, service.unit) : 'не задано',
      term: service ? getServiceLeadTimeLabel(service) : 'срок не задан',
      category: service ? (DESIGNER_SERVICE_CATEGORY_LABELS[service.category as keyof typeof DESIGNER_SERVICE_CATEGORY_LABELS] || service.category) : 'услуга',
    }
  })
})

// ── Normalization ──

function normalizePackagesForSave(list: DesignerPackage[]): { ok: true; list: DesignerPackage[] } | { ok: false; error: string } {
  const cleaned = normalizeDesignerPackages(list, { validServiceKeys: getValidServiceSelectionKeys() })
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

// ── API calls ──

async function doSavePackages(list: DesignerPackage[]) {
  await $fetch(`/api/designers/${props.designerId}`, {
    method: 'PUT',
    body: { packages: list },
  })
  emit('refresh')
}

async function doSavePricingCatalog(payload: { packages?: DesignerPackage[]; clearProjectPackageKeysForIds?: number[] }) {
  await $fetch(`/api/designers/${props.designerId}`, {
    method: 'PUT',
    body: payload,
  })
  emit('refresh')
}

// ── Card save ──

async function savePackageCardEditor() {
  if (!packageCardDraft.value) return
  clearPackageCardTimer()
  packageCardError.value = ''
  const activeKey = packageCardEditorKey.value
  const draft = cloneDraft(packageCardDraft.value)
  const updatedList = props.packages.map(item => (
    getPackageActionKey(item) === activeKey ? draft : cloneDraft(item)
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
    await doSavePackages(normalized.list)
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
  packageCardTimer = setTimeout(() => { savePackageCardEditor() }, 120)
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

async function initPackages() {
  const pkgs = DESIGNER_PACKAGE_TEMPLATES.map(t => ({
    key: t.key,
    title: t.title,
    description: t.description,
    serviceKeys: [...t.serviceKeys],
    pricePerSqm: t.suggestedPricePerSqm,
    enabled: true,
  }))
  await doSavePackages(pkgs)
}

async function createPackageCard() {
  pkgEditError.value = ''
  const draft = buildCustomPackageDraft()
  packageCardSaving.value = true
  try {
    await doSavePackages([...props.packages.map(item => cloneDraft(item)), draft])
    showTransientMessage(pkgEditSuccess, 'Пакет добавлен')
    await nextTick()
    const found = findPackageByActionKey(draft.key)
    if (found) openPackageCardEditor(found)
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
  const list = props.packages.map(item => cloneDraft(item))
  const index = props.packages.findIndex(item => getPackageActionKey(item) === getPackageActionKey(pkg))
  if (index < 0) return
  source.key = `${pkg.key || 'package'}_copy_${makeEditorId()}`
  source.title = source.title ? `${source.title} (копия)` : 'Новый пакет'
  packageCardSaving.value = true
  try {
    list.splice(index + 1, 0, source)
    await doSavePackages(list)
    showTransientMessage(pkgEditSuccess, 'Пакет продублирован')
    await nextTick()
    const found = findPackageByActionKey(source.key)
    if (found) openPackageCardEditor(found)
  } catch (error: any) {
    pkgEditError.value = getRequestErrorMessage(error, 'Не удалось продублировать пакет')
  } finally {
    packageCardSaving.value = false
  }
}

async function movePackageCard(pkg: DesignerPackage, direction: -1 | 1) {
  pkgEditError.value = ''
  const index = props.packages.findIndex(item => getPackageActionKey(item) === getPackageActionKey(pkg))
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= props.packages.length) return
  const list = props.packages.map(item => cloneDraft(item))
  const [moved] = list.splice(index, 1)
  list.splice(targetIndex, 0, moved)
  packageCardSaving.value = true
  try {
    await doSavePackages(list)
    showTransientMessage(pkgEditSuccess, 'Порядок пакетов обновлён')
    await nextTick()
    const found = findPackageByActionKey(getPackageActionKey(pkg))
    if (found) openPackageCardEditor(found)
    else openPackageCardEditor(moved)
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
    const nextPackages = props.packages
      .filter(item => getPackageActionKey(item) !== removedKey)
      .map(item => cloneDraft(item))

    await doSavePricingCatalog({ packages: nextPackages })
    closePackageCardEditor()
    showTransientMessage(pkgEditSuccess, 'Пакет удалён')
  } catch (error: any) {
    pkgEditError.value = getRequestErrorMessage(error, 'Не удалось удалить пакет')
  } finally {
    packageCardSaving.value = false
  }
}
</script>
