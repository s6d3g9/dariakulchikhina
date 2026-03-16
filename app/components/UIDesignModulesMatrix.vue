<template>
  <section :class="['ui-modules-matrix-shell', { 'ui-modules-matrix-shell--compact': compact }]">
    <div v-if="showToolbar" class="ui-modules-matrix-toolbar">
      <div class="ui-modules-matrix-meta">
        <p class="ui-modules-matrix-kicker">матрица настроек</p>
        <h3 class="ui-modules-matrix-title">модули ui</h3>
        <p class="ui-modules-matrix-copy">{{ syncNotice }}</p>
      </div>
      <button type="button" class="a-btn-sm" @click="resetModules">сбросить</button>
    </div>

    <div class="ui-modules-grid">
      <section v-for="section in sections" :key="section.id" class="ui-modules-section">
        <div class="ui-modules-section-title">{{ section.title }}</div>
        <p class="ui-modules-section-copy">{{ section.copy }}</p>

        <div class="ui-modules-matrix">
          <button
            v-for="field in section.fields"
            :key="field.path"
            type="button"
            class="ui-modules-row"
            :class="{ 'ui-modules-row--off': !field.enabled, 'ui-modules-row--blocked': field.blocked }"
            :disabled="field.blocked"
            @click="toggleField(field)"
          >
            <span class="ui-modules-row-main">
              <span class="ui-modules-row-label">{{ field.label }}</span>
              <span class="ui-modules-row-help">{{ field.help }}</span>
            </span>
            <span class="ui-modules-row-state">{{ field.enabled ? '[ ON ]' : '[ OFF ]' }}</span>
          </button>
        </div>
      </section>
    </div>

    <p v-if="runtimeNotice" class="ui-modules-notice">{{ runtimeNotice }}</p>
    <p v-if="notice" class="ui-modules-notice">{{ notice }}</p>
  </section>
</template>

<script setup lang="ts">
type ToggleField = {
  path: string
  label: string
  help: string
  enabled: boolean
  blocked?: boolean
}

type ToggleSection = {
  id: string
  title: string
  copy: string
  fields: ToggleField[]
}

withDefaults(defineProps<{
  compact?: boolean
  showToolbar?: boolean
}>(), {
  compact: false,
  showToolbar: false,
})

const { modules, isLoadedFromServer, setModule, resetModules } = useDesignModules()
const { activeBlueprint } = useAppBlueprintCatalog()
const notice = ref('')

const syncNotice = computed(() => isLoadedFromServer.value
  ? 'синхронизируется между администраторами через сервер'
  : 'локальный fallback до восстановления серверной синхронизации')
const runtimeNotice = computed(() => activeBlueprint.value?.modules
  ? `runtime blueprint дополнительно переопределяет модули: ${activeBlueprint.value.title}`
  : '')

const recoveryPathsEnabled = computed(() => [
  modules.value.adminLayout.designPanel,
  modules.value.adminLayout.sidebarMenu,
  modules.value.adminLayout.nestedNav,
].filter(Boolean).length)

function isRecoveryField(path: string) {
  return path === 'adminLayout.designPanel'
    || path === 'adminLayout.sidebarMenu'
    || path === 'adminLayout.nestedNav'
}

function isFieldBlocked(path: string, enabled: boolean) {
  return enabled && isRecoveryField(path) && recoveryPathsEnabled.value <= 1
}

function toggleField(field: ToggleField) {
  const result = setModule(field.path, !field.enabled)
  if (!result.ok && result.reason === 'recovery-path-required') {
    notice.value = 'Нельзя выключить последний путь возврата: оставьте панель дизайна, кнопку меню или левую навигацию.'
    return
  }

  notice.value = ''
}

const sections = computed<ToggleSection[]>(() => [
  {
    id: 'admin-layout',
    title: 'оболочка админки',
    copy: 'Элементы оболочки применяются сразу в текущем браузере и затем синхронизируются через сервер для остальных администраторов.',
    fields: [
      { path: 'adminLayout.designPanel', label: 'панель дизайна', help: 'Подключение панели дизайна в оболочке. Один из трёх путей возврата.', enabled: modules.value.adminLayout.designPanel, blocked: isFieldBlocked('adminLayout.designPanel', modules.value.adminLayout.designPanel) },
      { path: 'adminLayout.header', label: 'верхняя панель', help: 'Верхняя сервисная полоса оболочки админки.', enabled: modules.value.adminLayout.header },
      { path: 'adminLayout.search', label: 'поиск', help: 'Кнопка поиска, поисковая палитра и горячая клавиша Ctrl/Cmd+K.', enabled: modules.value.adminLayout.search },
      { path: 'adminLayout.notifications', label: 'уведомления', help: 'Колокольчик, выпадающий список и автообновление уведомлений.', enabled: modules.value.adminLayout.notifications },
      { path: 'adminLayout.themeSwitch', label: 'переключатель темы', help: 'Переключатель тёмной и светлой темы.', enabled: modules.value.adminLayout.themeSwitch },
      { path: 'adminLayout.siteLink', label: 'ссылка на сайт', help: 'Переход на публичную часть проекта.', enabled: modules.value.adminLayout.siteLink },
      { path: 'adminLayout.logoutLink', label: 'выход', help: 'Выход из текущей админ-сессии.', enabled: modules.value.adminLayout.logoutLink },
      { path: 'adminLayout.sidebarMenu', label: 'кнопка меню', help: 'Бруталист-кнопка меню в оболочке. Один из трёх путей возврата.', enabled: modules.value.adminLayout.sidebarMenu, blocked: isFieldBlocked('adminLayout.sidebarMenu', modules.value.adminLayout.sidebarMenu) },
      { path: 'adminLayout.nestedNav', label: 'левая навигация', help: 'Главное дерево навигации слева. Один из трёх путей возврата.', enabled: modules.value.adminLayout.nestedNav, blocked: isFieldBlocked('adminLayout.nestedNav', modules.value.adminLayout.nestedNav) },
    ],
  },
  {
    id: 'design-panel-tools',
    title: 'инструменты панели',
    copy: 'Инструменты панели дизайна переключаются сразу локально и сохраняются как общий серверный профиль интерфейса.',
    fields: [
      { path: 'designPanel.enabled', label: 'вся панель', help: 'Полное включение или скрытие панели дизайна.', enabled: modules.value.designPanel.enabled },
      { path: 'designPanel.inspect', label: 'инспектор css', help: 'Режим выбора DOM и перехода к секциям токенов.', enabled: modules.value.designPanel.inspect },
      { path: 'designPanel.elementVisibility', label: 'скрытие элементов', help: 'Курсор для отключения элементов на текущей странице или глобально.', enabled: modules.value.designPanel.elementVisibility },
      { path: 'designPanel.componentInspector', label: 'инспектор компонентов', help: 'Показывает компонент и путь к файлу.', enabled: modules.value.designPanel.componentInspector },
      { path: 'designPanel.exportImport', label: 'экспорт / импорт', help: 'Кнопка экспорта и импорта токенов.', enabled: modules.value.designPanel.exportImport },
    ],
  },
  {
    id: 'design-panel-tabs',
    title: 'вкладки панели',
    copy: 'Тонкое управление содержимым панели дизайна. Отключённые вкладки исчезают из навигации и поиска.',
    fields: [
      { path: 'designPanel.tabs.builder', label: 'сборщик app', help: 'Типизированные сборки приложений, группы меню и экспорт конфигураций.', enabled: modules.value.designPanel.tabs.builder },
      { path: 'designPanel.tabs.presets', label: 'образы', help: 'Готовые сценарии и быстрые конфигурации.', enabled: modules.value.designPanel.tabs.presets },
      { path: 'designPanel.tabs.concept', label: 'концепция', help: 'Переключение концептов и базового режима дизайна.', enabled: modules.value.designPanel.tabs.concept },
      { path: 'designPanel.tabs.palette', label: 'палитра', help: 'Базовая палитра акцентов и тонов поверхностей.', enabled: modules.value.designPanel.tabs.palette },
      { path: 'designPanel.tabs.colors', label: 'цвета', help: 'Расширенные переопределения цветовых токенов.', enabled: modules.value.designPanel.tabs.colors },
      { path: 'designPanel.tabs.buttons', label: 'кнопки', help: 'Стиль, размер и поведение кнопок при наведении.', enabled: modules.value.designPanel.tabs.buttons },
      { path: 'designPanel.tabs.type', label: 'типографика', help: 'Основной текстовый слой и ритм.', enabled: modules.value.designPanel.tabs.type },
      { path: 'designPanel.tabs.surface', label: 'поверхности', help: 'Параметры поверхностей и базовых панелей.', enabled: modules.value.designPanel.tabs.surface },
      { path: 'designPanel.tabs.radii', label: 'скругления', help: 'Радиусы карточек, полей и модальных поверхностей.', enabled: modules.value.designPanel.tabs.radii },
      { path: 'designPanel.tabs.anim', label: 'анимация', help: 'Базовые длительности и кривые движения.', enabled: modules.value.designPanel.tabs.anim },
      { path: 'designPanel.tabs.grid', label: 'сетка', help: 'Плотность layout и генератор контента.', enabled: modules.value.designPanel.tabs.grid },
      { path: 'designPanel.tabs.typeScale', label: 'шкала', help: 'Модульная типографическая шкала.', enabled: modules.value.designPanel.tabs.typeScale },
      { path: 'designPanel.tabs.darkMode', label: 'тёмная тема', help: 'Корректировки dark-mode слоя.', enabled: modules.value.designPanel.tabs.darkMode },
      { path: 'designPanel.tabs.inputs', label: 'инпуты', help: 'Поля, рамки и внутренние отступы.', enabled: modules.value.designPanel.tabs.inputs },
      { path: 'designPanel.tabs.tags', label: 'теги', help: 'Теги и компактные маркеры.', enabled: modules.value.designPanel.tabs.tags },
      { path: 'designPanel.tabs.nav', label: 'навигация', help: 'Параметры навигации и переходов.', enabled: modules.value.designPanel.tabs.nav },
      { path: 'designPanel.tabs.statuses', label: 'статусы', help: 'Статусные плашки и семантическая видимость.', enabled: modules.value.designPanel.tabs.statuses },
      { path: 'designPanel.tabs.popups', label: 'попапы', help: 'Параметры overlay и выпадающих списков.', enabled: modules.value.designPanel.tabs.popups },
      { path: 'designPanel.tabs.scrollbar', label: 'скролл', help: 'Scrollbar width и opacity.', enabled: modules.value.designPanel.tabs.scrollbar },
      { path: 'designPanel.tabs.tables', label: 'таблицы', help: 'Заголовки, границы и состояния строк.', enabled: modules.value.designPanel.tabs.tables },
      { path: 'designPanel.tabs.badges', label: 'значки', help: 'Плашки, счётчики и их форма.', enabled: modules.value.designPanel.tabs.badges },
      { path: 'designPanel.tabs.arch', label: 'архитектура', help: 'Переходы страниц, навигации и масштаб hero.', enabled: modules.value.designPanel.tabs.arch },
    ],
  },
])
</script>

<style scoped>
.ui-modules-matrix-shell {
  display: grid;
  gap: 16px;
}

.ui-modules-matrix-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  padding: 14px;
}

.ui-modules-matrix-meta {
  display: grid;
  gap: 6px;
}

.ui-modules-matrix-kicker,
.ui-modules-matrix-copy,
.ui-modules-section-copy,
.ui-modules-row-help,
.ui-modules-row-state,
.ui-modules-notice {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: .06em;
}

.ui-modules-matrix-kicker,
.ui-modules-section-copy,
.ui-modules-row-help {
  font-size: .68rem;
  line-height: 1.5;
  color: color-mix(in srgb, var(--glass-text) 58%, transparent);
}

.ui-modules-matrix-title,
.ui-modules-section-title {
  margin: 0;
  font-size: .84rem;
  line-height: 1.2;
  text-transform: uppercase;
  letter-spacing: .12em;
}

.ui-modules-matrix-copy {
  font-size: .7rem;
  line-height: 1.5;
  color: color-mix(in srgb, var(--glass-text) 68%, transparent);
}

.ui-modules-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  align-items: start;
}

.ui-modules-matrix-shell--compact .ui-modules-grid {
  grid-template-columns: 1fr;
  gap: 12px;
}

.ui-modules-section {
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  padding: 16px;
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.ui-modules-matrix {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.ui-modules-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: transparent;
  color: var(--glass-text);
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
}

.ui-modules-row:disabled {
  cursor: not-allowed;
}

.ui-modules-row:hover {
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}

.ui-modules-row:disabled:hover {
  background: transparent;
}

.ui-modules-row--off {
  opacity: .62;
}

.ui-modules-row-main {
  display: grid;
  gap: 4px;
}

.ui-modules-row-label {
  font-size: .8rem;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.ui-modules-row-state {
  font-size: .72rem;
  letter-spacing: .16em;
  white-space: nowrap;
}

.ui-modules-notice {
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  padding: 12px 14px;
  font-size: .76rem;
  line-height: 1.5;
}

@media (max-width: 980px) {
  .ui-modules-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .ui-modules-matrix-toolbar {
    grid-template-columns: 1fr;
    display: grid;
  }

  .ui-modules-row {
    grid-template-columns: 1fr;
  }
}
</style>