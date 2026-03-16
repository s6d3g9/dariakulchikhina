<template>
  <section class="ab-shell">
    <div class="ab-col">
      <div class="ab-kicker">готовые сборки приложений</div>
      <div class="ab-status">{{ syncNotice }}</div>
      <div class="ab-status">{{ runtimeNotice }}</div>
      <div v-if="previewNotice" class="ab-status">{{ previewNotice }}</div>
      <div class="ab-card-grid">
        <button
          v-for="blueprint in allBlueprints"
          :key="blueprint.id"
          type="button"
          class="ab-card"
          :class="{ 'ab-card--active': selectedBlueprintId === blueprint.id }"
          @click="selectBlueprint(blueprint.id)"
        >
          <span class="ab-card-title">{{ blueprint.title }}</span>
          <span class="ab-card-copy">{{ blueprint.description }}</span>
          <span class="ab-card-meta">{{ blueprint.menuGroupIds.length }} групп · {{ blueprint.featuredBlockIds.length }} ключевых блоков</span>
          <span v-if="isCustomBlueprint(blueprint.id)" class="ab-card-badge">пользовательская</span>
          <span v-if="activeBlueprintId === blueprint.id" class="ab-card-badge ab-card-badge--runtime">активна</span>
        </button>
      </div>
      <button type="button" class="a-btn-sm" @click="startCustomBlueprint">новая сборка</button>
    </div>

    <div class="ab-col">
      <div class="ab-kicker">состав приложения</div>

      <div class="u-field">
        <label class="u-field__label">идентификатор</label>
        <input v-model="draft.id" class="glass-input" placeholder="portal-client-pro" />
      </div>

      <div class="u-field">
        <label class="u-field__label">название</label>
        <input v-model="draft.title" class="glass-input" placeholder="Портал клиента Pro" />
      </div>

      <div class="u-field">
        <label class="u-field__label">описание</label>
        <textarea v-model="draft.description" class="glass-input u-ta ab-textarea" rows="4" placeholder="Что делает эта сборка и для какой роли нужна" />
      </div>

      <div class="ab-stats">
        <span class="ab-stat">групп: {{ selectedMenuGroups.length }}</span>
        <span class="ab-stat">блоков: {{ availableBlocks.length }}</span>
        <span class="ab-stat">scopes: {{ selectedScopes.length }}</span>
      </div>

      <div v-if="unknownGroupIds.length" class="ab-orphans">
        <div class="ab-section-title">внешние группы</div>
        <div class="ab-chip-pool">
          <button
            v-for="groupId in unknownGroupIds"
            :key="groupId"
            type="button"
            class="ab-chip ab-chip--orphan"
            @click="removeUnknownGroup(groupId)"
          >{{ groupId }}</button>
        </div>
      </div>

      <div class="ab-section-title">группы меню</div>
      <div class="ab-group-list">
        <button
          v-for="group in ADMIN_MENU_GROUPS"
          :key="group.id"
          type="button"
          class="ab-group-row"
          :class="{ 'ab-group-row--active': selectedGroupIds.includes(group.id) }"
          @click="toggleGroup(group.id)"
        >
          <span class="ab-group-main">
            <span class="ab-group-title">{{ group.title }}</span>
            <span class="ab-group-copy">{{ group.description }}</span>
          </span>
          <span class="ab-group-count">{{ group.items.length }}</span>
        </button>
      </div>

      <div class="ab-section-title">runtime-модули</div>
      <div class="ab-status">{{ moduleOverrideNotice }}</div>

      <div class="ab-override-section">
        <div class="ab-section-title">оболочка админки</div>
        <div class="ab-override-list">
          <button
            v-for="field in adminLayoutOverrideFields"
            :key="field.path"
            type="button"
            class="ab-override-row"
            :class="overrideRowClass(field.path)"
            @click="cycleModuleOverride(field.path)"
          >
            <span class="ab-override-main">
              <span class="ab-override-title">{{ field.label }}</span>
              <span class="ab-override-copy">{{ field.help }}</span>
            </span>
            <span class="ab-override-state">{{ overrideStateLabel(field.path) }}</span>
          </button>
        </div>
      </div>

      <div class="ab-override-section">
        <div class="ab-section-title">инструменты панели</div>
        <div class="ab-override-list">
          <button
            v-for="field in designPanelToolOverrideFields"
            :key="field.path"
            type="button"
            class="ab-override-row"
            :class="overrideRowClass(field.path)"
            @click="cycleModuleOverride(field.path)"
          >
            <span class="ab-override-main">
              <span class="ab-override-title">{{ field.label }}</span>
              <span class="ab-override-copy">{{ field.help }}</span>
            </span>
            <span class="ab-override-state">{{ overrideStateLabel(field.path) }}</span>
          </button>
        </div>
      </div>

      <div class="ab-override-section">
        <div class="ab-section-title">вкладки панели</div>
        <div class="ab-override-list">
          <button
            v-for="field in designPanelTabOverrideFields"
            :key="field.path"
            type="button"
            class="ab-override-row"
            :class="overrideRowClass(field.path)"
            @click="cycleModuleOverride(field.path)"
          >
            <span class="ab-override-main">
              <span class="ab-override-title">{{ field.label }}</span>
              <span class="ab-override-copy">{{ field.help }}</span>
            </span>
            <span class="ab-override-state">{{ overrideStateLabel(field.path) }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="ab-col">
      <div class="ab-kicker">ключевые блоки и экспорт</div>

      <div class="ab-section-title">scopes</div>
      <div class="ab-chip-pool">
        <span v-for="scope in selectedScopes" :key="scope" class="ab-chip ab-chip--static">{{ scope }}</span>
      </div>

      <div class="ab-section-title">управление scopes</div>
      <div class="ab-chip-pool">
        <button
          v-for="scope in scopeOptions"
          :key="scope"
          type="button"
          class="ab-chip"
          :class="{ 'ab-chip--active': explicitScopes.includes(scope) }"
          @click="toggleScope(scope)"
        >{{ scope }}</button>
      </div>

      <div v-if="unknownFeaturedBlockIds.length" class="ab-orphans">
        <div class="ab-section-title">внешние блоки</div>
        <div class="ab-chip-pool">
          <button
            v-for="blockId in unknownFeaturedBlockIds"
            :key="blockId"
            type="button"
            class="ab-chip ab-chip--orphan"
            @click="removeUnknownFeaturedBlock(blockId)"
          >{{ blockId }}</button>
        </div>
      </div>

      <div class="ab-section-title">ключевые блоки</div>
      <div class="ab-chip-pool">
        <button
          v-for="block in availableBlocks"
          :key="block.id"
          type="button"
          class="ab-chip"
          :class="{ 'ab-chip--active': featuredBlockIds.includes(block.id) }"
          @click="toggleFeaturedBlock(block.id)"
        >
          {{ block.title }}
        </button>
      </div>

      <div class="ab-section-title">json-пакет</div>
      <textarea class="glass-input u-ta ab-json" :value="builderExportJson" readonly rows="18" />

      <div class="ab-section-title">импорт json</div>
      <textarea v-model="importBuffer" class="glass-input u-ta ab-json" rows="10" placeholder="Вставьте blueprint JSON или объект вида { &quot;blueprint&quot;: { ... } }" />
      <div v-if="importError" class="ab-import-error">{{ importError }}</div>

      <div class="ab-actions">
        <button type="button" class="a-btn-sm" @click="saveBlueprint">{{ saveLabel || 'сохранить' }}</button>
        <button type="button" class="a-btn-sm" @click="activateSelectedBlueprint">{{ activateLabel }}</button>
        <button type="button" class="a-btn-sm" @click="previewDraftBlueprint">{{ previewLabel }}</button>
        <button type="button" class="a-btn-sm" @click="copyBlueprintPayload">{{ copyLabel }}</button>
        <button type="button" class="a-btn-sm" @click="applyImportBuffer">{{ importLabel }}</button>
        <button v-if="isPreviewingBlueprint" type="button" class="a-btn-sm" @click="resetRuntimeBlueprint">снять preview</button>
        <button v-if="selectedBlueprint" type="button" class="a-btn-sm" @click="selectBlueprint(selectedBlueprint.id)">сбросить из шаблона</button>
        <button v-if="selectedBlueprint && isCustomBlueprint(selectedBlueprint.id)" type="button" class="a-btn-sm a-btn-danger" @click="deleteBlueprint(selectedBlueprint.id)">удалить</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  ADMIN_MENU_GROUPS,
} from '~~/shared/constants/app-catalog'
import type {
  AppBlueprintDef,
  AppBlueprintModulesOverride,
  AppScope,
  MenuBlockDef,
  MenuBlockGroupDef,
} from '~~/shared/types/app-catalog'
import { AppBlueprintImportPayloadSchema, appScopeValues } from '~~/shared/types/app-catalog'
import { designPanelTabIds } from '~~/shared/types/design-modules'

const {
  activeBlueprint,
  activeBlueprintId,
  allBlueprints,
  clearPreviewBlueprint,
  customBlueprints,
  isPreviewingBlueprint,
  isLoadedFromServer,
  previewBlueprint,
  saveCustomBlueprint,
  removeCustomBlueprint,
  setActiveBlueprint,
  setPreviewBlueprint,
} = useAppBlueprintCatalog()

const selectedBlueprintId = ref('design-studio')
const selectedGroupIds = ref<string[]>([])
const featuredBlockIds = ref<string[]>([])
const explicitScopes = ref<AppScope[]>([])
const moduleOverrides = ref<AppBlueprintModulesOverride>({})
const copyLabel = ref('копировать json')
const saveLabel = ref('')
const activateLabel = ref('сделать активной')
const previewLabel = ref('предпросмотр')
const importLabel = ref('применить json')
const importError = ref('')
const importBuffer = ref('')
const draft = reactive({
  id: '',
  title: '',
  description: '',
})

const scopeOptions = appScopeValues

const adminLayoutOverrideFields = [
  { path: 'adminLayout.designPanel', label: 'панель дизайна', help: 'Подключение панели дизайна в оболочке.' },
  { path: 'adminLayout.header', label: 'верхняя панель', help: 'Верхняя сервисная полоса оболочки админки.' },
  { path: 'adminLayout.search', label: 'поиск', help: 'Поисковая палитра и горячая клавиша.' },
  { path: 'adminLayout.notifications', label: 'уведомления', help: 'Колокольчик и выпадающий список уведомлений.' },
  { path: 'adminLayout.themeSwitch', label: 'переключатель темы', help: 'Переключение тёмной и светлой темы.' },
  { path: 'adminLayout.siteLink', label: 'ссылка на сайт', help: 'Переход на публичную часть проекта.' },
  { path: 'adminLayout.logoutLink', label: 'выход', help: 'Выход из текущей админ-сессии.' },
  { path: 'adminLayout.sidebarMenu', label: 'кнопка меню', help: 'Brutalist-кнопка меню в оболочке.' },
  { path: 'adminLayout.nestedNav', label: 'левая навигация', help: 'Главное дерево навигации слева.' },
] as const

const designPanelToolOverrideFields = [
  { path: 'designPanel.enabled', label: 'вся панель', help: 'Полное включение или скрытие панели дизайна.' },
  { path: 'designPanel.inspect', label: 'инспектор css', help: 'Режим выбора DOM и перехода к токенам.' },
  { path: 'designPanel.elementVisibility', label: 'скрытие элементов', help: 'Курсор для скрытия элементов на странице.' },
  { path: 'designPanel.componentInspector', label: 'инспектор компонентов', help: 'Показывает компонент и путь к файлу.' },
  { path: 'designPanel.exportImport', label: 'экспорт / импорт', help: 'Экспорт и импорт токенов дизайна.' },
] as const

const designPanelTabLabelMap: Record<typeof designPanelTabIds[number], { label: string; help: string }> = {
  builder: { label: 'сборщик app', help: 'Типизированные сборки приложений.' },
  presets: { label: 'образы', help: 'Готовые сценарии и быстрые конфигурации.' },
  concept: { label: 'концепция', help: 'Переключение концептов и базового режима.' },
  palette: { label: 'палитра', help: 'Базовая палитра акцентов и поверхностей.' },
  colors: { label: 'цвета', help: 'Расширенные цветовые токены.' },
  buttons: { label: 'кнопки', help: 'Размер, стиль и поведение кнопок.' },
  type: { label: 'типографика', help: 'Основной текстовый слой и ритм.' },
  surface: { label: 'поверхности', help: 'Параметры поверхностей и базовых панелей.' },
  radii: { label: 'скругления', help: 'Радиусы карточек и полей.' },
  anim: { label: 'анимация', help: 'Длительности и кривые движения.' },
  grid: { label: 'сетка', help: 'Плотность layout и генератор контента.' },
  typeScale: { label: 'шкала', help: 'Модульная типографическая шкала.' },
  darkMode: { label: 'тёмная тема', help: 'Корректировки dark-mode слоя.' },
  inputs: { label: 'инпуты', help: 'Поля, рамки и внутренние отступы.' },
  tags: { label: 'теги', help: 'Теги и компактные маркеры.' },
  nav: { label: 'навигация', help: 'Параметры навигации и переходов.' },
  statuses: { label: 'статусы', help: 'Статусные плашки и семантика.' },
  popups: { label: 'попапы', help: 'Overlay и выпадающие списки.' },
  scrollbar: { label: 'скролл', help: 'Scrollbar width и opacity.' },
  tables: { label: 'таблицы', help: 'Заголовки, границы и состояния строк.' },
  badges: { label: 'значки', help: 'Плашки, счётчики и их форма.' },
  arch: { label: 'архитектура', help: 'Переходы страниц и масштаб hero.' },
}

const designPanelTabOverrideFields = designPanelTabIds.map(tabId => ({
  path: `designPanel.tabs.${tabId}`,
  ...designPanelTabLabelMap[tabId],
}))

const selectedBlueprint = computed(() => allBlueprints.value.find(item => item.id === selectedBlueprintId.value) || null)
const syncNotice = computed(() => isLoadedFromServer.value
  ? 'пользовательские сборки синхронизируются через сервер'
  : 'пользовательские сборки пока работают через локальный fallback')
const runtimeNotice = computed(() => activeBlueprint.value
  ? `runtime использует сборку: ${activeBlueprint.value.title}`
  : 'runtime использует базовую сборку по умолчанию')
const previewNotice = computed(() => isPreviewingBlueprint.value
  ? `preview активен: ${previewBlueprint.value?.title || 'черновик'}`
  : '')
const moduleOverrideCount = computed(() => countModuleOverrides(moduleOverrides.value))
const moduleOverrideNotice = computed(() => moduleOverrideCount.value
  ? `runtime-переопределений: ${moduleOverrideCount.value} · click: наследует -> on -> off`
  : 'модули наследуются от общего профиля интерфейса')

const knownGroupIds = computed(() => new Set(ADMIN_MENU_GROUPS.map(group => group.id)))

const selectedMenuGroups = computed<MenuBlockGroupDef[]>(() => {
  return ADMIN_MENU_GROUPS.filter(group => selectedGroupIds.value.includes(group.id))
})

const unknownGroupIds = computed(() => selectedGroupIds.value.filter(groupId => !knownGroupIds.value.has(groupId)))

const availableBlocks = computed<MenuBlockDef[]>(() => {
  const byId = new Map<string, MenuBlockDef>()
  for (const group of selectedMenuGroups.value) {
    for (const block of group.items) {
      byId.set(block.id, block)
    }
  }
  return Array.from(byId.values())
})

const knownBlockIds = computed(() => new Set(availableBlocks.value.map(block => block.id)))
const unknownFeaturedBlockIds = computed(() => featuredBlockIds.value.filter(blockId => !knownBlockIds.value.has(blockId)))

const selectedScopes = computed<AppScope[]>(() => {
  const scopes = new Set<AppScope>()
  for (const scope of explicitScopes.value) {
    scopes.add(scope)
  }
  for (const block of availableBlocks.value) {
    for (const scope of block.appScopes) {
      scopes.add(scope)
    }
  }
  return Array.from(scopes.values())
})

const builderBlueprint = computed<AppBlueprintDef>(() => ({
  id: draft.id.trim() || 'custom-blueprint',
  title: draft.title.trim() || 'Пользовательская сборка',
  description: draft.description.trim() || 'Пользовательская сборка на базе типизированного каталога.',
  scopes: selectedScopes.value,
  menuGroupIds: [...selectedGroupIds.value],
  featuredBlockIds: [...featuredBlockIds.value],
  ...(normalizeModuleOverrides(moduleOverrides.value) ? { modules: normalizeModuleOverrides(moduleOverrides.value) } : {}),
}))

const builderExportJson = computed(() => JSON.stringify({
  blueprint: builderBlueprint.value,
  groups: selectedMenuGroups.value,
}, null, 2))

watch(selectedBlueprint, (blueprint) => {
  if (!blueprint) {
    return
  }

  draft.id = blueprint.id
  draft.title = blueprint.title
  draft.description = blueprint.description
  selectedGroupIds.value = [...blueprint.menuGroupIds]
  featuredBlockIds.value = [...blueprint.featuredBlockIds]
  explicitScopes.value = [...blueprint.scopes]
  moduleOverrides.value = cloneModuleOverrides(blueprint.modules)
  importBuffer.value = JSON.stringify({ blueprint }, null, 2)
  importError.value = ''
}, { immediate: true })

function selectBlueprint(blueprintId: string) {
  selectedBlueprintId.value = blueprintId
}

function isCustomBlueprint(blueprintId: string) {
  return customBlueprints.value.some(item => item.id === blueprintId)
}

function startCustomBlueprint() {
  selectedBlueprintId.value = ''
  draft.id = `custom-${Date.now()}`
  draft.title = 'Новая сборка'
  draft.description = 'Новый blueprint, собранный из типизированных menu groups и featured blocks.'
  selectedGroupIds.value = []
  featuredBlockIds.value = []
  explicitScopes.value = []
  moduleOverrides.value = {}
}

function cloneModuleOverrides(value?: AppBlueprintModulesOverride) {
  if (!value) {
    return {}
  }

  return {
    adminLayout: value.adminLayout ? { ...value.adminLayout } : undefined,
    designPanel: value.designPanel ? {
      ...value.designPanel,
      tabs: value.designPanel.tabs ? { ...value.designPanel.tabs } : undefined,
    } : undefined,
  } satisfies AppBlueprintModulesOverride
}

function normalizeModuleOverrides(value?: AppBlueprintModulesOverride) {
  if (!value) {
    return undefined
  }

  const adminLayout = value.adminLayout ? Object.fromEntries(
    Object.entries(value.adminLayout).filter(([, entry]) => typeof entry === 'boolean'),
  ) : undefined
  const designPanelTabs = value.designPanel?.tabs ? Object.fromEntries(
    Object.entries(value.designPanel.tabs).filter(([, entry]) => typeof entry === 'boolean'),
  ) : undefined
  const designPanel = value.designPanel ? {
    ...Object.fromEntries(
      Object.entries(value.designPanel).filter(([key, entry]) => key !== 'tabs' && typeof entry === 'boolean'),
    ),
    ...(designPanelTabs && Object.keys(designPanelTabs).length ? { tabs: designPanelTabs } : {}),
  } : undefined

  const normalized = {
    ...(adminLayout && Object.keys(adminLayout).length ? { adminLayout } : {}),
    ...(designPanel && Object.keys(designPanel).length ? { designPanel } : {}),
  } satisfies AppBlueprintModulesOverride

  return Object.keys(normalized).length ? normalized : undefined
}

function countModuleOverrides(value?: AppBlueprintModulesOverride) {
  const normalized = normalizeModuleOverrides(value)
  if (!normalized) {
    return 0
  }

  return [
    ...Object.values(normalized.adminLayout || {}),
    ...Object.entries(normalized.designPanel || {})
      .filter(([key]) => key !== 'tabs')
      .map(([, entry]) => entry),
    ...Object.values(normalized.designPanel?.tabs || {}),
  ].filter((entry) => typeof entry === 'boolean').length
}

function getModuleOverrideValue(path: string): boolean | undefined {
  const segments = path.split('.')
  if (segments[0] === 'adminLayout') {
    return moduleOverrides.value.adminLayout?.[segments[1] as keyof NonNullable<AppBlueprintModulesOverride['adminLayout']>]
  }

  if (segments[0] === 'designPanel' && segments[1] === 'tabs') {
    return moduleOverrides.value.designPanel?.tabs?.[segments[2] as typeof designPanelTabIds[number]]
  }

  if (segments[0] === 'designPanel') {
    return moduleOverrides.value.designPanel?.[segments[1] as Exclude<keyof NonNullable<AppBlueprintModulesOverride['designPanel']>, 'tabs'>] as boolean | undefined
  }

  return undefined
}

function setModuleOverrideValue(path: string, nextValue: boolean | undefined) {
  const segments = path.split('.')

  if (segments[0] === 'adminLayout') {
    const nextAdminLayout = { ...(moduleOverrides.value.adminLayout || {}) }
    const key = segments[1] as keyof NonNullable<AppBlueprintModulesOverride['adminLayout']>
    if (typeof nextValue === 'boolean') {
      nextAdminLayout[key] = nextValue
    } else {
      delete nextAdminLayout[key]
    }
    moduleOverrides.value = {
      ...moduleOverrides.value,
      ...(Object.keys(nextAdminLayout).length ? { adminLayout: nextAdminLayout } : { adminLayout: undefined }),
    }
    return
  }

  if (segments[0] === 'designPanel' && segments[1] === 'tabs') {
    const nextTabs = { ...(moduleOverrides.value.designPanel?.tabs || {}) }
    const key = segments[2] as typeof designPanelTabIds[number]
    if (typeof nextValue === 'boolean') {
      nextTabs[key] = nextValue
    } else {
      delete nextTabs[key]
    }
    const nextDesignPanel = {
      ...(moduleOverrides.value.designPanel || {}),
      ...(Object.keys(nextTabs).length ? { tabs: nextTabs } : { tabs: undefined }),
    }
    moduleOverrides.value = {
      ...moduleOverrides.value,
      ...(normalizeModuleOverrides({ designPanel: nextDesignPanel })?.designPanel ? { designPanel: nextDesignPanel } : { designPanel: undefined }),
    }
    return
  }

  if (segments[0] === 'designPanel') {
    const nextDesignPanel = { ...(moduleOverrides.value.designPanel || {}) }
    const key = segments[1] as Exclude<keyof NonNullable<AppBlueprintModulesOverride['designPanel']>, 'tabs'>
    if (typeof nextValue === 'boolean') {
      nextDesignPanel[key] = nextValue as never
    } else {
      delete nextDesignPanel[key]
    }
    moduleOverrides.value = {
      ...moduleOverrides.value,
      ...(normalizeModuleOverrides({ designPanel: nextDesignPanel })?.designPanel ? { designPanel: nextDesignPanel } : { designPanel: undefined }),
    }
  }
}

function cycleModuleOverride(path: string) {
  const currentValue = getModuleOverrideValue(path)
  const nextValue = currentValue === undefined ? true : currentValue ? false : undefined
  setModuleOverrideValue(path, nextValue)
}

function overrideStateLabel(path: string) {
  const value = getModuleOverrideValue(path)
  if (value === true) return '[ ON ]'
  if (value === false) return '[ OFF ]'
  return '[ AUTO ]'
}

function overrideRowClass(path: string) {
  const value = getModuleOverrideValue(path)
  return {
    'ab-override-row--on': value === true,
    'ab-override-row--off': value === false,
    'ab-override-row--auto': value === undefined,
  }
}

function toggleGroup(groupId: string) {
  selectedGroupIds.value = selectedGroupIds.value.includes(groupId)
    ? selectedGroupIds.value.filter(id => id !== groupId)
    : [...selectedGroupIds.value, groupId]
}

function toggleFeaturedBlock(blockId: string) {
  featuredBlockIds.value = featuredBlockIds.value.includes(blockId)
    ? featuredBlockIds.value.filter(id => id !== blockId)
    : [...featuredBlockIds.value, blockId]
}

function toggleScope(scope: AppScope) {
  explicitScopes.value = explicitScopes.value.includes(scope)
    ? explicitScopes.value.filter(item => item !== scope)
    : [...explicitScopes.value, scope]
}

function removeUnknownGroup(groupId: string) {
  selectedGroupIds.value = selectedGroupIds.value.filter(id => id !== groupId)
}

function removeUnknownFeaturedBlock(blockId: string) {
  featuredBlockIds.value = featuredBlockIds.value.filter(id => id !== blockId)
}

function nextCustomBlueprintId(baseId: string) {
  const normalizedBase = baseId.trim() || 'custom-blueprint'
  const candidateIds = new Set(allBlueprints.value.map(item => item.id))
  if (!candidateIds.has(normalizedBase)) {
    return normalizedBase
  }

  let index = 1
  let nextId = `${normalizedBase}-copy`
  while (candidateIds.has(nextId)) {
    index += 1
    nextId = `${normalizedBase}-copy-${index}`
  }
  return nextId
}

function saveBlueprint() {
  const isEditingBuiltin = selectedBlueprint.value && !isCustomBlueprint(selectedBlueprint.value.id)
  const nextBlueprint = {
    ...builderBlueprint.value,
    id: isEditingBuiltin && builderBlueprint.value.id === selectedBlueprint.value?.id
      ? nextCustomBlueprintId(builderBlueprint.value.id)
      : builderBlueprint.value.id,
  }

  saveCustomBlueprint(nextBlueprint)
  selectedBlueprintId.value = nextBlueprint.id
  if (nextBlueprint.id !== builderBlueprint.value.id) {
    draft.id = nextBlueprint.id
  }
  saveLabel.value = nextBlueprint.id === builderBlueprint.value.id ? '✓ сохранено' : '✓ сохранено как копия'
  setTimeout(() => {
    saveLabel.value = ''
  }, 1800)
}

function deleteBlueprint(blueprintId: string) {
  removeCustomBlueprint(blueprintId)
  selectedBlueprintId.value = 'design-studio'
}

function activateSelectedBlueprint() {
  if (!selectedBlueprint.value) {
    activateLabel.value = 'сначала сохраните сборку'
    setTimeout(() => {
      activateLabel.value = 'сделать активной'
    }, 1800)
    return
  }

  setActiveBlueprint(selectedBlueprint.value.id)
  activateLabel.value = '✓ активна'
  setTimeout(() => {
    activateLabel.value = 'сделать активной'
  }, 1800)
}

function previewDraftBlueprint() {
  setPreviewBlueprint({ ...builderBlueprint.value })
  previewLabel.value = '✓ preview'
  setTimeout(() => {
    previewLabel.value = 'предпросмотр'
  }, 1800)
}

function resetRuntimeBlueprint() {
  clearPreviewBlueprint()
  previewLabel.value = 'preview снят'
  setTimeout(() => {
    previewLabel.value = 'предпросмотр'
  }, 1800)
}

function applyImportedBlueprint(blueprint: AppBlueprintDef) {
  selectedBlueprintId.value = ''
  draft.id = blueprint.id
  draft.title = blueprint.title
  draft.description = blueprint.description
  selectedGroupIds.value = [...blueprint.menuGroupIds]
  featuredBlockIds.value = [...blueprint.featuredBlockIds]
  explicitScopes.value = [...blueprint.scopes]
  moduleOverrides.value = cloneModuleOverrides(blueprint.modules)
  importBuffer.value = JSON.stringify({ blueprint }, null, 2)
  importError.value = ''
}

function applyImportBuffer() {
  try {
    const payload = JSON.parse(importBuffer.value)
    const parsed = AppBlueprintImportPayloadSchema.safeParse(payload)
    if (!parsed.success) {
      importError.value = 'JSON не прошёл валидацию blueprint.'
      return
    }

    const blueprint = 'blueprint' in parsed.data ? parsed.data.blueprint : parsed.data
    applyImportedBlueprint(blueprint)
    importLabel.value = '✓ применено'
    setTimeout(() => {
      importLabel.value = 'применить json'
    }, 1800)
  } catch {
    importError.value = 'Не удалось разобрать JSON.'
  }
}

async function copyBlueprintPayload() {
  try {
    await navigator.clipboard.writeText(builderExportJson.value)
    copyLabel.value = '✓ скопировано'
    setTimeout(() => {
      copyLabel.value = 'копировать json'
    }, 1800)
  } catch {
    copyLabel.value = 'ошибка копирования'
    setTimeout(() => {
      copyLabel.value = 'копировать json'
    }, 1800)
  }
}
</script>

<style scoped>
.ab-shell {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.ab-col {
  display: grid;
  align-content: start;
  gap: 12px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  padding: 14px;
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.ab-kicker,
.ab-status,
.ab-section-title,
.ab-card-meta,
.ab-group-copy,
.ab-group-count,
.ab-stat,
.ab-chip {
  text-transform: uppercase;
  letter-spacing: .06em;
}

.ab-kicker,
.ab-status,
.ab-section-title,
.ab-group-copy,
.ab-card-meta,
.ab-stat {
  font-size: .68rem;
  color: color-mix(in srgb, var(--glass-text) 62%, transparent);
}

.ab-card-grid,
.ab-group-list,
.ab-chip-pool,
.ab-override-list {
  display: grid;
  gap: 8px;
}

.ab-card,
.ab-group-row,
.ab-override-row {
  display: grid;
  gap: 6px;
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: transparent;
  color: var(--glass-text);
  text-align: left;
  padding: 12px;
  cursor: pointer;
}

.ab-card:hover,
.ab-group-row:hover,
.ab-override-row:hover,
.ab-chip:hover {
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}

.ab-card--active,
.ab-group-row--active,
.ab-chip--active {
  border-color: color-mix(in srgb, var(--ds-accent, #4a80f0) 58%, var(--glass-border));
  background: color-mix(in srgb, var(--ds-accent, #4a80f0) 12%, transparent);
  color: var(--ds-accent, #4a80f0);
}

.ab-card-title,
.ab-group-title {
  font-size: .8rem;
  line-height: 1.35;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.ab-card-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  width: fit-content;
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--ds-accent, #4a80f0) 46%, transparent);
  color: var(--ds-accent, #4a80f0);
  font-size: .64rem;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.ab-card-badge--runtime {
  border-color: color-mix(in srgb, #15803d 46%, transparent);
  color: #15803d;
}

.ab-card-copy {
  font-size: .76rem;
  line-height: 1.45;
  color: color-mix(in srgb, var(--glass-text) 78%, transparent);
}

.ab-stats,
.ab-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ab-stat,
.ab-chip {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  padding: 8px 10px;
  background: transparent;
  color: var(--glass-text);
  font-size: .68rem;
}

.ab-chip {
  cursor: pointer;
}

.ab-chip--static {
  cursor: default;
}

.ab-chip--orphan {
  border-color: color-mix(in srgb, #d97706 45%, transparent);
  color: #d97706;
}

.ab-import-error {
  font-size: .72rem;
  color: #b91c1c;
}

.ab-group-row {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
}

.ab-group-main {
  display: grid;
  gap: 4px;
}

.ab-override-section {
  display: grid;
  gap: 8px;
}

.ab-override-row {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
}

.ab-override-main {
  display: grid;
  gap: 4px;
}

.ab-override-title,
.ab-override-state {
  font-size: .74rem;
  line-height: 1.35;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.ab-override-copy {
  font-size: .68rem;
  line-height: 1.45;
  color: color-mix(in srgb, var(--glass-text) 72%, transparent);
  text-transform: uppercase;
  letter-spacing: .06em;
}

.ab-override-row--on {
  border-color: color-mix(in srgb, #15803d 58%, var(--glass-border));
  background: color-mix(in srgb, #15803d 12%, transparent);
  color: #15803d;
}

.ab-override-row--off {
  border-color: color-mix(in srgb, #b91c1c 58%, var(--glass-border));
  background: color-mix(in srgb, #b91c1c 10%, transparent);
  color: #b91c1c;
}

.ab-textarea,
.ab-json {
  min-height: 120px;
}

@media (max-width: 1100px) {
  .ab-shell {
    grid-template-columns: 1fr;
  }
}
</style>