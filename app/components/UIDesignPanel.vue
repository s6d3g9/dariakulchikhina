<template>
  <div v-if="panelEnabled" class="dp-wrap">
    <!-- ═══ Top Bar Trigger ═══ -->
    <div class="dp-topbar" :class="{ 'dp-topbar--open': open, 'dp-topbar--inspect': inspectMode }">
      <button type="button" class="dp-trigger" @click.stop="open = !open" title="Дизайн-система">
        <svg class="dp-trigger-icon" width="13" height="13" viewBox="0 0 15 15" fill="none">
          <path d="M2 3h11M2 7.5h11M2 12h11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          <circle cx="5" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="10" cy="7.5" r="1.5" fill="currentColor"/>
          <circle cx="6.5" cy="12" r="1.5" fill="currentColor"/>
        </svg>
        <span class="dp-trigger-label">дизайн</span>
      </button>
      <span class="dp-topbar-sep" />
      <button v-if="designPanelModules.inspect" type="button" class="dp-topbar-btn" :class="{ 'dp-topbar-btn--active': inspectMode }" @click="toggleInspect" title="CSS-инспектор">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 2l4.5 10 1.5-3.5L11.5 7z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 8l3.5 3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        <span>css</span>
      </button>
      <button type="button" class="dp-topbar-btn" :class="{ 'dp-topbar-btn--active': aspAlignMode }" @click="toggleAlignMode" title="Режим выравнивания по сетке">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="4" height="4" rx="0.7" stroke="currentColor" stroke-width="1.1"/><rect x="8.5" y="1.5" width="4" height="4" rx="0.7" stroke="currentColor" stroke-width="1.1"/><rect x="1.5" y="8.5" width="4" height="4" rx="0.7" stroke="currentColor" stroke-width="1.1"/><rect x="8.5" y="8.5" width="4" height="4" rx="0.7" stroke="currentColor" stroke-width="1.1"/></svg>
        <span>выровнять</span>
      </button>
      <button v-if="designPanelModules.elementVisibility" type="button" class="dp-topbar-btn" :class="{ 'dp-topbar-btn--active-alt': visibilityMode }" @click="toggleVisibilityMode" title="Скрыть элемент на странице или везде">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 7c1.6-2.3 3.4-3.5 5-3.5S10.4 4.7 12 7c-1.6 2.3-3.4 3.5-5 3.5S3.6 9.3 2 7Z" stroke="currentColor" stroke-width="1.1"/><path d="M1.8 12.2 12.2 1.8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        <span>скрыть</span>
      </button>
      <span class="dp-topbar-sep" />
      <button v-if="designPanelModules.componentInspector" type="button" class="dp-topbar-btn" :class="{ 'dp-topbar-btn--active': compMode }" @click="toggleComp" title="Компонентный инспектор — имя компонента и путь к файлу">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M4 5l-2.5 2L4 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 5l2.5 2L10 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 3l-2 8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        <span>компоненты</span>
      </button>
      <span class="dp-topbar-sep" />
      <button type="button" class="dp-topbar-btn" :disabled="!canUndo" @click="undo" title="Отменить">
        <svg width="11" height="11" viewBox="0 0 14 14"><path d="M3 7h8M3 7l3-3M3 7l3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button type="button" class="dp-topbar-btn" :disabled="!canRedo" @click="redo" title="Повторить">
        <svg width="11" height="11" viewBox="0 0 14 14"><path d="M11 7H3M11 7l-3-3M11 7l-3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <template v-if="activePresetId">
        <span class="dp-topbar-sep" />
        <span class="dp-topbar-preset">{{ activePresetId }}</span>
      </template>
    </div>

    <!-- ═══ Panel (horizontal dropdown) ═══ -->
    <Teleport to="body">
      <Transition name="dp-slide">
        <div v-if="open" class="dp-panel" ref="panelEl">

            <!-- ── Top row: tabs + actions ── -->
            <div class="dp-panel-toprow">
              <nav class="dp-tabs" role="tablist">
                <button
                  v-for="tab in visibleTabList" :key="tab.id"
                  type="button" role="tab"
                  class="dp-tab" :class="{ 'dp-tab--active': activeTab === tab.id }"
                  @click="activeTab = tab.id as PanelTabId"
                >{{ tab.label }}</button>
              </nav>
              <div class="dp-panel-actions">
                <div class="dp-search-wrap">
                  <svg class="dp-search-icon" width="12" height="12" viewBox="0 0 13 13" fill="none">
                    <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" stroke-width="1.2"/>
                    <path d="M8.5 8.5L12 12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                  </svg>
                  <GlassInput v-model="searchQuery" class="glass-input --sm" placeholder="поиск…" type="text" />
                  <button v-if="searchQuery" type="button" class="dp-search-clear" @click="searchQuery = ''">✕</button>
                </div>
                <button v-if="designPanelModules.exportImport" type="button" class="dp-icon-btn" @click="showExport = !showExport" title="Экспорт / Импорт">
                  <svg width="13" height="13" viewBox="0 0 14 14"><path d="M7 2v7M4 6l3 3 3-3M3 11h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button type="button" class="dp-icon-btn dp-icon-btn--danger" @click="resetAll" title="Сбросить">
                  <svg width="13" height="13" viewBox="0 0 14 14"><path d="M2.5 4.5h9M5.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5M4 4.5v7a1 1 0 001 1h4a1 1 0 001-1v-7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button type="button" class="dp-icon-btn" @click="open = false" title="Закрыть (Esc)">✕</button>
              </div>
            </div>

            <!-- ── Mode Bar: Liquid Glass ↔ Minale+Mann ── -->
            <div class="dp-mode-bar">
              <span class="dp-mode-label">режим</span>
              <button
                type="button"
                class="dp-mode-btn dp-mode-btn--glass"
                :class="{ 'dp-mode-btn--active': activeModeSlug === 'concept-glass' }"
                @click="switchMode('concept-glass')"
                title="Жидкое стекло: blur, глубина, мягкий хром, pill-формы"
              >
                <span class="dp-mode-icon">❖</span>
                <span class="dp-mode-name">Жидкое стекло</span>
              </button>
              <button
                type="button"
                class="dp-mode-btn dp-mode-btn--brutal"
                :class="{ 'dp-mode-btn--active': activeModeSlug === 'concept-minale' }"
                @click="switchMode('concept-minale')"
                title="Брутализм / Minale + Mann — чёрный фон, белый текст, uppercase, hairlines"
              >
                <span class="dp-mode-icon">◼</span>
                <span class="dp-mode-name">Брутализм / Minale</span>
              </button>
              <button
                type="button"
                class="dp-mode-btn dp-mode-btn--m3"
                :class="{ 'dp-mode-btn--active': activeModeSlug === 'concept-m3' }"
                @click="switchMode('concept-m3')"
                title="Material 3 — тональные поверхности, скруглённые формы, тени"
              >
                <span class="dp-mode-icon">⨁</span>
                <span class="dp-mode-name">Material 3</span>
              </button>
              <button
                type="button"
                class="dp-mode-btn dp-mode-btn--reset"
                @click="clearMode()"
                title="Вернуть режим по умолчанию — Брутализм / Minale"
              >
                <span class="dp-mode-icon">○</span>
                <span class="dp-mode-name">Сброс</span>
              </button>
            </div>

            <!-- ── Export/Import drawer ── -->
            <Transition name="dp-drawer">
              <div v-if="showExport" class="dp-export">
                <div class="dp-export-inner">
                  <div class="dp-export-tabs">
                    <button type="button" :class="['dp-export-tab', { active: exportTab === 'json' }]" @click="exportTab = 'json'">JSON</button>
                    <button type="button" :class="['dp-export-tab', { active: exportTab === 'css' }]" @click="exportTab = 'css'">CSS</button>
                  </div>
                  <textarea
                    class="glass-input u-ta"
                    :value="exportTab === 'json' ? exportJSON() : exportCSS()"
                    @input="importBuffer = ($event.target as HTMLTextAreaElement).value"
                    spellcheck="false"
                  />
                  <div class="dp-export-actions">
                    <button type="button" class="dp-sm-btn" @click="copyExport">{{ copyLabel }}</button>
                    <button v-if="exportTab === 'json'" type="button" class="dp-sm-btn" @click="doImport">импорт JSON</button>
                  </div>
                  <div v-if="importError && exportTab === 'json'" class="dp-import-error">{{ importError }}</div>
                </div>
              </div>
            </Transition>

            <!-- ── Tab content ── -->
            <div class="dp-tab-content">

              <!-- ═══ Модули UI ═══ -->
              <div v-show="isTabVisible('modules')" class="dp-page">
                <div class="dp-page-stack">
                  <UIDesignModulesMatrix compact show-toolbar />
                  <UIDesignVisibilityRules />
                </div>
              </div>

              <div v-show="isTabVisible('builder')" class="dp-page">
                <UIAppBlueprintBuilder />
              </div>

              <!-- ═══ Sub-components ═══ -->
              <UIDesignPanelPresets v-show="isTabVisible('presets') || isTabVisible('concept')" :active-tab="activeTab" />

              <UIDesignPanelPalette v-show="isTabVisible('palette') || isTabVisible('colors')" :active-tab="activeTab" />

              <UIDesignPanelButtons v-show="isTabVisible('buttons')" />

              <UIDesignPanelType v-show="isTabVisible('type') || isTabVisible('typeScale')" :active-tab="activeTab" />

              <UIDesignPanelSurface v-show="isTabVisible('surface') || isTabVisible('radii') || isTabVisible('darkMode')" :active-tab="activeTab" />

              <UIDesignPanelAnim v-show="isTabVisible('anim')" />

              <UIDesignPanelGrid v-show="isTabVisible('grid')" />

              <UIDesignPanelFeedback v-show="isTabVisible('inputs') || isTabVisible('tags') || isTabVisible('statuses') || isTabVisible('popups') || isTabVisible('scrollbar') || isTabVisible('tables') || isTabVisible('badges')" :active-tab="activeTab" />

              <UIDesignPanelNav v-show="isTabVisible('nav')" />

              <UIDesignPanelArch v-show="isTabVisible('arch')" />

            </div><!-- /.dp-tab-content -->


            <!-- ═══ Sticky footer: Apply Style ═══ -->
            <footer class="dp-footer">
              <Transition name="dp-fade">
                <div v-if="isPreviewActive" class="dp-footer-preview">
                  <div class="dp-preview-badge">
                    <span class="dp-preview-dot" />
                    <span>превью</span>
                  </div>
                  <div class="dp-footer-actions">
                    <button type="button" class="dp-footer-cancel" @click="cancelCurrentPreview">отмена</button>
                    <button type="button" class="dp-footer-apply" @click="applyCurrentStyle">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      Применить стиль
                    </button>
                  </div>
                </div>
              </Transition>
              <Transition name="dp-fade">
                <div v-if="appliedFlash" class="dp-applied-toast">✓ Стиль применён</div>
              </Transition>
            </footer>
          </div><!-- /.dp-panel -->
      </Transition>
    </Teleport>
    <!-- ═══ Inspect Mode Overlay ═══ -->
    <Teleport to="body">
      <div v-if="inspectMode" class="dp-inspect-overlay" @click.stop>
        <!-- Hover highlight box -->
        <div
          v-if="inspectHover.visible"
          class="dp-inspect-highlight"
          :style="inspectHighlightStyle"
        />
        <!-- Tooltip -->
        <Transition name="dp-fade">
          <div
            v-if="inspectHover.visible"
            class="dp-inspect-tooltip"
            :style="inspectTooltipStyle"
          >
            <span class="dp-inspect-tag">{{ inspectHover.tag }}</span>
            <span v-if="inspectHover.classes" class="dp-inspect-classes">.{{ inspectHover.classes }}</span>
            <div v-if="inspectHover.cssSelector" class="dp-inspect-hover-path">{{ inspectHover.cssSelector }}</div>
            <div class="dp-inspect-props">
              <span v-for="s in inspectHover.sections" :key="s" class="dp-inspect-prop-chip">{{ sectionLabels[s] || s }}</span>
            </div>
            <div v-if="inspectHover.sections.length" class="dp-inspect-hint">\u2190 \u043a\u043b\u0438\u043a \u2014 \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c</div>
          </div>
        </Transition>
        <!-- Click result panel -->
        <Transition name="dp-fade">
          <div v-if="inspectResult" class="dp-inspect-result" :style="inspectResultStyle">
            <div class="dp-inspect-result-header">
              <span class="dp-inspect-result-tag">{{ inspectResult.tag }}</span>
              <span v-if="inspectResult.classes" class="dp-inspect-result-tag" style="color:hsl(35,80%,70%);margin-left:4px;font-size:.6rem">.{{ inspectResult.classes }}</span>
              <button type="button" class="dp-inspect-result-close" @click="inspectResult = null">✕</button>
            </div>

            <!-- Quick-edit sliders -->
            <div v-if="quickEditControls.length" class="dp-qe-section">
              <div class="dp-qe-label">Редактировать</div>
              <div v-for="ctrl in quickEditControls" :key="ctrl.key" class="dp-qe-row">
                <span class="dp-qe-name">{{ ctrl.label }}</span>
                <input
                  type="range"
                  class="dp-qe-range"
                  :min="ctrl.min"
                  :max="ctrl.max"
                  :step="ctrl.step"
                  :value="(tokens as any)[ctrl.key]"
                  @input="ctrl.isFloat ? onFloat(ctrl.key as any, $event) : onRange(ctrl.key as any, $event)"
                />
                <span class="dp-qe-val">{{ ctrl.fmt((tokens as any)[ctrl.key]) }}</span>
              </div>
            </div>

            <!-- CSS Paths section -->
            <div class="dp-inspect-paths">
              <div class="dp-inspect-paths-label">CSS-пути</div>

              <!-- Unique selector -->
              <div class="dp-inspect-path-row">
                <span class="dp-inspect-path-kind">селектор</span>
                <code class="dp-inspect-path-code">{{ inspectResult.cssSelector }}</code>
                <button type="button" class="dp-inspect-path-copy" @click="copyPath(inspectResult.cssSelector)" :title="copiedPath === inspectResult.cssSelector ? 'Скопировано!' : 'Копировать'">
                  <svg v-if="copiedPath !== inspectResult.cssSelector" width="10" height="10" viewBox="0 0 14 14" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 10V2h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <svg v-else width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>

              <!-- Full path -->
              <div class="dp-inspect-path-row">
                <span class="dp-inspect-path-kind">полный</span>
                <code class="dp-inspect-path-code">{{ inspectResult.cssPath }}</code>
                <button type="button" class="dp-inspect-path-copy" @click="copyPath(inspectResult.cssPath)" :title="copiedPath === inspectResult.cssPath ? 'Скопировано!' : 'Копировать'">
                  <svg v-if="copiedPath !== inspectResult.cssPath" width="10" height="10" viewBox="0 0 14 14" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 10V2h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <svg v-else width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>

              <!-- Breadcrumb path -->
              <div class="dp-inspect-breadcrumb">
                <span
                  v-for="(seg, i) in inspectResult.fullPath" :key="i"
                  class="dp-inspect-breadcrumb-seg"
                  :class="{ 'dp-inspect-breadcrumb-seg--last': i === inspectResult.fullPath.length - 1 }"
                  @click="copyPath(inspectResult.fullPath.slice(0, i + 1).join(' > '))"
                  :title="'Копировать путь до ' + seg"
                >{{ seg }}<span v-if="i < inspectResult.fullPath.length - 1" class="dp-inspect-breadcrumb-arrow"> › </span></span>
              </div>
            </div>

            <div class="dp-inspect-result-info">
              <div class="dp-inspect-result-sections">
                <span class="dp-inspect-result-label">Открыть секцию:</span>
                <button
                  v-for="s in inspectResult.sections"
                  :key="s"
                  type="button"
                  class="dp-inspect-section-link"
                  @click="jumpToSection(s)"
                >↗ {{ sectionLabels[s] || s }}</button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Teleport>

    <!-- ═══ Visibility Mode Overlay ═══ -->
    <Teleport to="body">
      <div v-if="visibilityMode" class="dp-visibility-overlay" @click.stop>
        <div
          v-if="visibilityHover.visible"
          class="dp-visibility-highlight"
          :style="visibilityHighlightStyle"
        />
        <Transition name="dp-fade">
          <div
            v-if="visibilityHover.visible"
            class="dp-visibility-tooltip"
            :style="visibilityTooltipStyle"
          >
            <span class="dp-visibility-tag">{{ visibilityHover.tag }}</span>
            <span v-if="visibilityHover.classes" class="dp-visibility-classes">.{{ visibilityHover.classes }}</span>
            <div class="dp-visibility-hover-path">страница: {{ visibilityHover.pageSelector }}</div>
            <div class="dp-visibility-hover-path">везде: {{ visibilityHover.globalSelector }}</div>
            <div class="dp-visibility-hint">← клик — выбрать правило скрытия</div>
          </div>
        </Transition>
        <Transition name="dp-fade">
          <div v-if="visibilityResult" class="dp-visibility-result" :style="visibilityResultStyle">
            <div class="dp-visibility-result-header">
              <span class="dp-visibility-result-tag">{{ visibilityResult.tag }}</span>
              <span v-if="visibilityResult.classes" class="dp-visibility-result-tag dp-visibility-result-tag--classes">.{{ visibilityResult.classes }}</span>
              <button type="button" class="dp-inspect-result-close" @click="visibilityResult = null">✕</button>
            </div>

            <div class="dp-visibility-result-info">
              <div class="dp-visibility-result-label">действие</div>
              <div class="dp-visibility-actions">
                <button type="button" class="dp-visibility-action" :class="{ 'dp-visibility-action--active': Boolean(currentPageVisibilityRule) }" @click="toggleVisibilityRule('page')">
                  {{ currentPageVisibilityRule ? 'вернуть на этой странице' : 'скрыть на этой странице' }}
                </button>
                <button type="button" class="dp-visibility-action" :class="{ 'dp-visibility-action--active': Boolean(globalVisibilityRule) }" @click="toggleVisibilityRule('global')">
                  {{ globalVisibilityRule ? 'вернуть везде' : 'скрыть на всех страницах' }}
                </button>
                <button type="button" class="dp-visibility-action" :class="{ 'dp-visibility-action--active': Boolean(classVisibilityRule) }" :disabled="!visibilityResult.classSelector" @click="toggleVisibilityGroupRule('class')">
                  {{ classVisibilityRule ? `вернуть класс ${visibilityResult.className}` : `скрыть весь класс ${visibilityResult.className || '—'}` }}
                </button>
                <button type="button" class="dp-visibility-action" :class="{ 'dp-visibility-action--active': Boolean(componentVisibilityRule) }" :disabled="!visibilityResult.componentSelector" @click="toggleVisibilityGroupRule('component')">
                  {{ componentVisibilityRule ? `вернуть компонент ${visibilityResult.componentName}` : `скрыть весь компонент ${visibilityResult.componentName || '—'}` }}
                </button>
              </div>

              <div class="dp-inspect-paths dp-inspect-paths--visibility">
                <div class="dp-inspect-paths-label">селекторы скрытия</div>
                <div class="dp-inspect-path-row">
                  <span class="dp-inspect-path-kind">страница</span>
                  <code class="dp-inspect-path-code">{{ visibilityResult.pageSelector }}</code>
                  <button type="button" class="dp-inspect-path-copy" @click="copyPath(visibilityResult.pageSelector)" :title="copiedPath === visibilityResult.pageSelector ? 'Скопировано!' : 'Копировать'">
                    <svg v-if="copiedPath !== visibilityResult.pageSelector" width="10" height="10" viewBox="0 0 14 14" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 10V2h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <svg v-else width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                </div>
                <div class="dp-inspect-path-row">
                  <span class="dp-inspect-path-kind">везде</span>
                  <code class="dp-inspect-path-code">{{ visibilityResult.globalSelector }}</code>
                  <button type="button" class="dp-inspect-path-copy" @click="copyPath(visibilityResult.globalSelector)" :title="copiedPath === visibilityResult.globalSelector ? 'Скопировано!' : 'Копировать'">
                    <svg v-if="copiedPath !== visibilityResult.globalSelector" width="10" height="10" viewBox="0 0 14 14" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 10V2h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <svg v-else width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                </div>
                <div v-if="visibilityResult.classSelector" class="dp-inspect-path-row">
                  <span class="dp-inspect-path-kind">класс</span>
                  <code class="dp-inspect-path-code">{{ visibilityResult.classSelector }}</code>
                  <button type="button" class="dp-inspect-path-copy" @click="copyPath(visibilityResult.classSelector)" :title="copiedPath === visibilityResult.classSelector ? 'Скопировано!' : 'Копировать'">
                    <svg v-if="copiedPath !== visibilityResult.classSelector" width="10" height="10" viewBox="0 0 14 14" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 10V2h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <svg v-else width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                </div>
                <div v-if="visibilityResult.componentSelector" class="dp-inspect-path-row">
                  <span class="dp-inspect-path-kind">компонент</span>
                  <code class="dp-inspect-path-code">{{ visibilityResult.componentSelector }}</code>
                  <button type="button" class="dp-inspect-path-copy" @click="copyPath(visibilityResult.componentSelector)" :title="copiedPath === visibilityResult.componentSelector ? 'Скопировано!' : 'Копировать'">
                    <svg v-if="copiedPath !== visibilityResult.componentSelector" width="10" height="10" viewBox="0 0 14 14" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 10V2h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <svg v-else width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                </div>
              </div>

              <p v-if="visibilityNotice" class="dp-visibility-notice">{{ visibilityNotice }}</p>
            </div>
          </div>
        </Transition>
      </div>
    </Teleport>

    <!-- ═══ Component Inspector ═══ -->
    <Teleport to="body">
      <div v-if="designPanelModules.componentInspector && compMode" class="dp-comp-layer">
        <!-- Hover highlight box -->
        <div
          v-if="compHover.visible && !compResult"
          class="dp-comp-highlight"
          :style="compHighlightStyle"
        />
        <!-- Following hover tooltip (no pointer-events) -->
        <div
          v-if="compHover.visible && !compResult"
          class="dp-comp-tooltip"
          :style="compTooltipStyle"
        >
          <span class="dp-comp-tag">{{ compHover.name }}</span>
          <span class="dp-comp-path">{{ compHover.path }}</span>
          <span v-if="compHover.link" class="dp-comp-link">→ {{ compHover.link }}</span>
          <span class="dp-comp-hint">↵ click to lock</span>
        </div>
        <!-- Locked result card (pointer-events: auto) -->
        <Transition name="dp-fade">
          <div v-if="compResult" class="dp-comp-result" :style="compResultStyle">
            <div class="dp-comp-result-header">
              <span class="dp-comp-result-label">Vue компонент</span>
              <button type="button" class="dp-comp-close" @click="compResult = null">✕</button>
            </div>
            <div class="dp-comp-result-name">{{ compResult.name }}</div>
            <div class="dp-comp-result-path">{{ compResult.path }}</div>
            <div v-if="compResult.link" class="dp-comp-result-link">
              <span class="dp-comp-result-link-label">навигация:</span>
              <span class="dp-comp-result-link-value">{{ compResult.link }}</span>
            </div>
            <button type="button" class="dp-comp-copy-btn" @click="copyCompResult">
              <svg v-if="!compResult.copied" width="11" height="11" viewBox="0 0 14 14" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 10V2h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <svg v-else width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {{ compResult.copied ? '✓ скопировано!' : 'копировать' }}
            </button>
          </div>
        </Transition>
      </div>
    </Teleport>
  </div>

  <!-- ═══ Global alignment drag mode ═══ -->
  <Teleport to="body">
    <Transition name="dp-align-overlay">
      <div v-if="aspAlignMode" class="dp-align-overlay">
        <div
          v-if="alignHover.visible || alignDrag.active"
          class="dp-align-highlight"
          :style="alignHighlightStyle"
        >
          <button
            v-if="alignResult"
            type="button"
            class="dp-align-resize"
            title="Изменить размер"
            @pointerdown.stop.prevent="startAlignResize($event)"
          />
        </div>
        <Transition name="dp-fade">
          <div
            v-if="alignHover.visible && !alignDrag.active"
            class="dp-align-tooltip"
            :style="alignTooltipStyle"
          >
            <span class="dp-align-tag">{{ alignHover.tag }}</span>
            <span v-if="alignHover.classes" class="dp-align-classes">.{{ alignHover.classes }}</span>
            <div class="dp-align-hover-path">страница: {{ alignHover.pageSelector }}</div>
            <div class="dp-align-hover-path">везде: {{ alignHover.globalSelector }}</div>
            <div class="dp-align-hint">зажмите и перетащите — элемент привяжется к сетке 20px</div>
          </div>
        </Transition>
        <Transition name="dp-fade">
          <div v-if="alignResult" class="dp-align-result" :style="alignResultStyle">
            <div class="dp-align-result-header">
              <span class="dp-align-result-tag">{{ alignResult.tag }}</span>
              <span v-if="alignResult.classes" class="dp-align-result-tag dp-align-result-tag--classes">.{{ alignResult.classes }}</span>
              <button type="button" class="dp-inspect-result-close" @click="alignResult = null">✕</button>
            </div>
            <div class="dp-align-result-label">смещение</div>
            <div class="dp-align-offset">{{ alignOffsetLabel }}</div>
            <div class="dp-align-result-label" style="margin-top:8px">размер</div>
            <div class="dp-align-offset">{{ alignSizeLabel }}</div>
            <div class="dp-align-actions">
              <button type="button" class="dp-align-action" :class="{ 'dp-align-action--active': alignScope === 'page' }" @click="setAlignScope('page')">на странице</button>
              <button type="button" class="dp-align-action" :class="{ 'dp-align-action--active': alignScope === 'global' }" @click="setAlignScope('global')">везде</button>
              <button type="button" class="dp-align-action" @click="resetAlignment()">сбросить</button>
            </div>
            <div class="dp-inspect-paths dp-inspect-paths--visibility">
              <div class="dp-inspect-paths-label">селекторы выравнивания</div>
              <div class="dp-inspect-path-row">
                <span class="dp-inspect-path-kind">страница</span>
                <code class="dp-inspect-path-code">{{ alignResult.pageSelector }}</code>
                <button type="button" class="dp-inspect-path-copy" @click="copyPath(alignResult.pageSelector)" :title="copiedPath === alignResult.pageSelector ? 'Скопировано!' : 'Копировать'">
                  <svg v-if="copiedPath !== alignResult.pageSelector" width="10" height="10" viewBox="0 0 14 14" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 10V2h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <svg v-else width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
              <div class="dp-inspect-path-row">
                <span class="dp-inspect-path-kind">везде</span>
                <code class="dp-inspect-path-code">{{ alignResult.globalSelector }}</code>
                <button type="button" class="dp-inspect-path-copy" @click="copyPath(alignResult.globalSelector)" :title="copiedPath === alignResult.globalSelector ? 'Скопировано!' : 'Копировать'">
                  <svg v-if="copiedPath !== alignResult.globalSelector" width="10" height="10" viewBox="0 0 14 14" fill="none"><rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M2 10V2h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <svg v-else width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
            </div>
          </div>
        </Transition>
        <button type="button" class="dp-align-badge" @click="toggleAlignMode">⊞ режим выравнивания — Esc для выхода</button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import UIDesignModulesMatrix from '~/components/UIDesignModulesMatrix.vue'
import UIAppBlueprintBuilder from '~/components/UIAppBlueprintBuilder.vue'
import UIDesignVisibilityRules from '~/components/UIDesignVisibilityRules.vue'
import {
  useDesignSystem, FONT_OPTIONS, BTN_SIZE_MAP, EASING_OPTIONS,
  MATERIAL3_DESIGN_PRESETS, LIQUID_GLASS_DESIGN_PRESETS, DESIGN_CONCEPTS,
  TYPE_SCALE_OPTIONS,
  type DesignTokens, type DesignPreset,
} from '~/composables/useDesignSystem'
import { UI_THEMES as UI_THEME_CATALOG, type UITheme } from '~/composables/useUITheme'
import { useElementAlignment } from '~/composables/useElementAlignment'
import type { DesignPanelTabId } from '~/composables/useDesignModules'

type PanelTabId = DesignPanelTabId | 'modules'

const {
  tokens, set, reset: dsReset, applyPreset,
  undo, redo, canUndo, canRedo,
  exportJSON, importJSON, exportCSS,
  previewPreset, confirmPreview, cancelPreview, isPreviewActive,
  currentDesignMode, isHydrated,
} = useDesignSystem()
const THEME_CATALOG_BY_ID = new Map(UI_THEME_CATALOG.map(theme => [theme.id, theme] as const))
const ALL_DESIGN_PRESETS = [...LIQUID_GLASS_DESIGN_PRESETS, ...MATERIAL3_DESIGN_PRESETS]
const { designPanel: designPanelModules, isPanelTabEnabled } = useDesignModules()
const { currentPath, findRule: findVisibilityRule, addRule: addVisibilityRule, removeMatchingRule } = useElementVisibility()
const { currentPath: alignmentPath, findRule: findAlignmentRule, setRulePosition, removeMatchingRule: removeAlignmentRule } = useElementAlignment()
const { themeId, applyTheme, applyThemeWithTokens, getStoredThemeId, UI_THEMES } = useUITheme()

watch([() => UI_THEMES.value, isHydrated], ([themes, hydrated]) => {
  if (!hydrated || !themes || !themes.length) {
    return
  }

  if (!themes.find((t: any) => t.id === themeId.value)) {
    const nextTheme = themes.find((t: any) => t.id === getStoredThemeId()) || themes[0]
    applyTheme(nextTheme.id)
  }
}, { immediate: true })
const { isDark } = useThemeToggle()
const route = useRoute()
const panelEnabled = computed(() => designPanelModules.value.enabled || route.query.designPanelTab === 'modules')

const aspAlignMode = useState('asp-align-mode', () => false)

const open = ref(false)
const showExport = ref(false)
const importError = ref('')
const exportTab = ref<'json' | 'css'>('json')
const importBuffer = ref('')
const copyLabel = ref('копировать')
const appliedFlash = ref(false)
const normalizedSearchTerms = computed(() =>
  trimmedSearchQuery.value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
)
const hasSearchQuery = computed(() => normalizedSearchTerms.value.length > 0)
const tabList = [
  { id: 'modules',   label: 'модули ui' },
  { id: 'builder',   label: 'сборщик app' },
  { id: 'presets',   label: 'образы' },
  { id: 'concept',   label: 'концепция' },
  { id: 'palette',   label: 'палитра' },
  { id: 'colors',    label: 'цвета ▸' },
  { id: 'buttons',   label: 'кнопки' },
  { id: 'type',      label: 'типографика' },
  { id: 'surface',   label: 'поверхности' },
  { id: 'radii',     label: 'скругления' },
  { id: 'anim',      label: 'анимация' },
  { id: 'grid',      label: 'сетка' },
  { id: 'typeScale', label: 'шкала' },
  { id: 'darkMode',  label: 'тёмная тема' },
  { id: 'inputs',    label: 'инпуты' },
  { id: 'tags',      label: 'теги' },
  { id: 'nav',       label: 'навигация' },
  { id: 'statuses',  label: 'статусы' },
  { id: 'popups',    label: 'попапы' },
  { id: 'scrollbar', label: 'скролл' },
  { id: 'tables',    label: 'таблицы' },
  { id: 'badges',    label: 'значки' },
  { id: 'arch',      label: 'архитектура' },
]
const visibleTabList = computed(() => tabList.filter(tab => tab.id === 'modules' || isPanelTabEnabled(tab.id as PanelTabId)))
// Tab keying — sections object kept only for inspect-mode quick-jump compatibility
const sections = reactive({ presets: true, concept: false, palette: true, colors: false, buttons: false, type: false, typeScale: false, surface: false, radii: false, anim: false, grid: false, darkMode: false, inputs: false, tags: false, nav: false, statuses: false, popups: false, scrollbar: false, tables: false, badges: false, arch: false })
function toggle(key: keyof typeof sections) { activeTab.value = key as unknown as PanelTabId }

/* ── Tab navigation ─────────────────────────────── */
const activeTab = ref<PanelTabId>('presets')

import {
  btnStyles, btnSizes, textTransforms, btnHoverAnims, cardHoverAnims,
  archDensities, archHeadingCases, archDividers, archPageEnters, archLinkAnims,
  contentViewModes, wipeTransitions, archSectionStyles, archNavStyles,
  archCardChromes, archHeroScales, archContentReveals, archTextReveals,
  archNavTransitions, archTransitionPresets,
  contentLayoutPresets, contentCardPresets, contentScenePresets,
  contentLayoutRecipes, contentCardRecipes, contentSceneRecipes,
  navLayoutPresets, navLayoutRecipes, BORDER_STYLE_OPTIONS,
} from '~~/shared/constants/design-panel-options'

/* ── Helpers ─────────────────────────────────────── */
type PickerOption = { id: string | number; label: string }

function matchesPanelSearch(...fields: Array<string | undefined | null>) {
  if (!hasSearchQuery.value) {
    return true
  }

  const haystack = fields
    .filter((field): field is string => Boolean(field && field.trim()))
    .join(' ')
    .toLowerCase()

  return normalizedSearchTerms.value.every(term => haystack.includes(term))
}

const activePresetId = ref('')
const isMaterial3Mode = computed(() => currentDesignMode.value === 'material3')
const isLiquidGlassMode = computed(() => currentDesignMode.value === 'liquid-glass')
const activePresetFamily = computed<'glass' | 'm3' | 'brutal'>(() => {
  if (isMaterial3Mode.value) {
    return 'm3'
  }

  if (isLiquidGlassMode.value) {
    return 'glass'
  }

  return 'brutal'
})
const visibleDesignPresets = computed(() => {
  if (isMaterial3Mode.value) {
    return MATERIAL3_DESIGN_PRESETS
  }

  if (isLiquidGlassMode.value) {
    return LIQUID_GLASS_DESIGN_PRESETS
  }

  return []
})
const filteredDesignPresets = computed(() =>
  visibleDesignPresets.value.filter(preset => matchesPanelSearch(
    preset.id,
    preset.name,
    preset.description,
    getPresetFamilyTag(preset),
    resolvePresetTheme(preset)?.label || '',
  ))
)
const filteredDesignConcepts = computed(() =>
  DESIGN_CONCEPTS.filter(concept => matchesPanelSearch(
    concept.id,
    concept.name,
    concept.description,
    getConceptFamilyLabel(concept.id),
  ))
)
const filteredUIThemes = computed(() =>
  UI_THEMES.value.filter(theme => matchesPanelSearch(
    theme.id,
    theme.label,
    theme.btnPreview,
  ))
)
const supportsPresetGallery = computed(() => visibleDesignPresets.value.length > 0)
const currentModeLabel = computed(() => {
  if (currentDesignMode.value === 'material3') {
    return 'Material 3'
  }

  if (currentDesignMode.value === 'liquid-glass') {
    return 'Жидкое стекло'
  }

  return 'Брутализм / Minale'
})
const presetCollectionLabel = computed(() => {
  if (isMaterial3Mode.value) {
    if (hasSearchQuery.value) {
      return `Material 3 · ${filteredDesignPresets.value.length} из ${visibleDesignPresets.value.length} образов`
    }

    return `Material 3 · ${visibleDesignPresets.value.length} образов`
  }

  if (isLiquidGlassMode.value) {
    if (hasSearchQuery.value) {
      return `Жидкое стекло · ${filteredDesignPresets.value.length} из ${visibleDesignPresets.value.length} образов`
    }

    return `Жидкое стекло · ${visibleDesignPresets.value.length} образов`
  }

  return currentModeLabel.value
})
const currentPresetMeta = computed(() =>
  ALL_DESIGN_PRESETS.find((preset) => preset.id === activePresetId.value) || null
)
const currentThemeMeta = computed(() => THEME_CATALOG_BY_ID.get(themeId.value) || null)
const activePresetRecommendedTheme = computed(() => {
  const recommendedThemeId = currentPresetMeta.value?.recommendedThemeId
  return recommendedThemeId ? THEME_CATALOG_BY_ID.get(recommendedThemeId) || null : null
})
const m3PreviewNavItems = ['обзор', 'проект', 'материалы', 'диалог']
const m3PreviewChips = ['тональная поверхность', 'pill-nav', 'filled field']
const m3PreviewStatuses = [
  { label: 'в работе', kind: 'active' },
  { label: 'на проверке', kind: 'review' },
  { label: 'готово', kind: 'done' },
] as const
const previewThemeSnapshot = ref<string>('')

function resolvePresetTheme(preset: DesignPreset): UITheme | null {
  return preset.recommendedThemeId ? THEME_CATALOG_BY_ID.get(preset.recommendedThemeId) || null : null
}

function isPresetThemeActive(preset: DesignPreset) {
  return resolvePresetTheme(preset)?.id === themeId.value
}

function isRecommendedTheme(candidateThemeId: string) {
  return activePresetRecommendedTheme.value?.id === candidateThemeId
}

function themeSwatchStyle(theme: UITheme | null) {
  if (!theme) {
    return {}
  }

  return {
    background: isDark.value ? theme.swatchDark : theme.swatch,
  }
}

function getPresetVisualKind(preset: DesignPreset) {
  if (preset.id.startsWith('material-')) {
    return 'material'
  }

  if (preset.id.startsWith('craft-')) {
    return 'craft'
  }

  if (preset.id.startsWith('future-')) {
    return 'future'
  }

  return 'glass'
}

function getPresetFamilyTag(preset: DesignPreset) {
  const kind = getPresetVisualKind(preset)

  if (kind === 'material') {
    return 'material 3'
  }

  if (kind === 'craft') {
    return 'craft'
  }

  if (kind === 'future') {
    return 'future'
  }

  return 'liquid glass'
}

function presetVisualStyle(preset: DesignPreset) {
  const accentHue = preset.tokens.accentHue ?? tokens.value.accentHue
  const accentSaturation = preset.tokens.accentSaturation ?? tokens.value.accentSaturation
  const accentLightness = preset.tokens.accentLightness ?? tokens.value.accentLightness
  const glassBlur = Math.max(18, Math.min(60, preset.tokens.glassBlur ?? 28))
  const glassOpacity = Math.max(0.1, Math.min(0.34, preset.tokens.glassOpacity ?? 0.18))
  const glassBorderOpacity = Math.max(0.12, Math.min(0.4, (preset.tokens.glassBorderOpacity ?? 0.12) + 0.08))
  const linkedTheme = resolvePresetTheme(preset)
  const swatch = linkedTheme
    ? (isDark.value ? linkedTheme.swatchDark : linkedTheme.swatch)
    : `hsla(${accentHue}, ${accentSaturation}%, ${Math.min(92, accentLightness + 18)}%, 0.78)`

  return {
    '--dp-preset-accent': `hsl(${accentHue} ${accentSaturation}% ${accentLightness}%)`,
    '--dp-preset-accent-soft': `hsla(${accentHue}, ${accentSaturation}%, ${Math.min(92, accentLightness + 20)}%, 0.78)`,
    '--dp-preset-ink': `hsla(${accentHue}, ${Math.min(100, accentSaturation + 12)}%, ${Math.max(10, accentLightness - 34)}%, 0.55)`,
    '--dp-preset-swatch': swatch,
    '--dp-preset-frost': `rgba(255,255,255,${Math.min(0.42, glassOpacity + 0.14)})`,
    '--dp-preset-border': `rgba(255,255,255,${glassBorderOpacity})`,
    '--dp-preset-blur': `${glassBlur}px`,
    '--dp-preset-shadow': `0 18px 44px hsla(${accentHue}, ${Math.min(100, accentSaturation + 6)}%, ${Math.max(8, accentLightness - 34)}%, 0.18)`,
  }
}

function getConceptFamilyLabel(conceptId: string) {
  if (conceptId === 'concept-m3') {
    return 'material3'
  }

  if (['concept-glass', 'concept-craft', 'concept-future'].includes(conceptId)) {
    return 'liquid-glass'
  }

  return 'brutalist'
}

function activateLiquidGlassPresetMode() {
  switchMode('concept-glass')
}

function activateMaterial3PresetMode() {
  switchMode('concept-m3')
}

/* ── Mode switcher: active design concept family ─── */
const activeModeSlug = computed(() => {
  if (currentDesignMode.value === 'liquid-glass') {
    return 'concept-glass'
  }

  if (currentDesignMode.value === 'material3') {
    return 'concept-m3'
  }

  return 'concept-minale'
})

function switchMode(conceptId: string) {
  const concept = DESIGN_CONCEPTS.find(c => c.id === conceptId) || ALL_DESIGN_PRESETS.find(p => p.id === conceptId)
  if (concept) {
    activePresetId.value = concept.id
    previewPreset(concept)
    confirmPreview()
    previewThemeSnapshot.value = ''
  }
}

function clearMode() {
  cancelPreview()
  restorePreviewTheme()
  activePresetId.value = ''
  switchMode('concept-minale')
}

/* ── Type scale computed sizes ──────────────────── */
/* ── Section search filter ──────────────────────── */
const sectionSearchMap: Record<string, string[]> = {
  builder:  ['blueprint', 'app builder', 'catalog', 'app-catalog', 'сборка', 'приложение', 'menu groups', 'featured blocks', 'типизация', 'конструктор'],
  presets:  ['образ', 'рецепт', 'preset', 'material', 'material 3', 'm3', 'tonal', 'baseline', 'outline', 'compact', 'studio', 'flow', 'architect', 'soft', 'контур', 'пульт', 'компакт', 'студия', 'поток', 'архитектор', 'тональ'],
  palette:  ['палитра', 'цвет', 'акцент', 'color', 'theme', 'accent', 'hue', 'статусы', 'success', 'успех', 'ошибка', 'error', 'warning', 'предупреждение', 'фон', 'навигация', 'карточка', 'кнопка', 'поле', 'тег', 'ссылка', 'заголовок', 'мьютед', 'мутед', 'background', 'nav', 'input', 'tag', 'heading', 'muted', 'link', 'элементы'],
  colors:   ['цвета', 'элемент', 'фон', 'кнопк', 'текст', 'ссылк', 'заголовк', 'граница', 'background', 'surface', 'heading', 'link', 'border', 'button', 'colour', 'цвет элементов'],
  buttons:  ['кнопк', 'button', 'стиль', 'размер', 'закругл', 'регистр', 'btn'],
  type:     ['типограф', 'шрифт', 'font', 'размер', 'вес', 'межбукв', 'межстроч', 'letter', 'line-height'],
  typeScale: ['масштаб', 'scale', 'шкала', 'ratio', 'модуляр'],
  surface:  ['стекло', 'glass', 'поверхность', 'размытие', 'blur', 'тень', 'shadow', 'прозрачн'],
  radii:    ['скруглен', 'radius', 'отступ', 'spacing', 'карточ', 'chip', 'modal'],
  anim:     ['анимац', 'animation', 'easing', 'длительн', 'duration'],
  grid:     ['сетк', 'grid', 'макет', 'layout', 'контейнер', 'container', 'sidebar', 'обводк', 'border', 'генератор', 'раскладка', 'меню', 'layout generator', 'rail', 'showcase', 'compact', 'сцена', 'scene', 'генератор сцены', 'карточки', 'card preset', 'workbench', 'magazine', 'ops', 'gallery'],
  darkMode: ['тёмн', 'темн', 'dark', 'mode', 'elevation', 'saturation'],
  inputs:   ['инпут', 'поле', 'ввод', 'input', 'text field', 'textarea', 'border opacity', 'прозрачн'],
  tags:     ['тег', 'чип', 'badge', 'chip', 'tag', 'пилюля', 'метка', 'padding'],
  nav:      ['навиг', 'sidebar', 'menu', 'пункт', 'nav', 'меню', 'эффект сайдбара', 'sidebar transition', 'drill-down', 'push', 'stack', 'stagger', 'переход меню', 'каскад', 'смещение'],
  statuses: ['статус', 'пин', 'status', 'pin bar', 'badge', 'прогресс', 'дорожная карта', 'roadmap'],
  popups:   ['попап', 'popup', 'dropdown', 'оверлей', 'overlay', 'modal', 'blur', 'затемн'],
  scrollbar: ['скроллбар', 'scrollbar', 'полоса прокрутки', 'ширина', 'width', 'прозрач'],
  tables:   ['таблиц', 'table', 'таблетк', 'строка', 'заголовок', 'row', 'header', 'border', 'hover'],
  badges:   ['значок', 'значки', 'badge', 'counter', 'счётчик', 'уведомлени', 'notification'],
  arch:     ['архитектура', 'плотность', 'трекинг', 'заголовок', 'кейс', 'эффект', 'hover', 'анимация', 'ссылка', 'разделитель', 'секция', 'density', 'heading', 'tracking', 'card hover', 'divider', 'page enter', 'link anim', 'editorial', 'spatial', 'навигация', 'хром', 'карточка', 'масштаб', 'герой', 'ритм', 'nav style', 'card chrome', 'hero scale', 'vertical rhythm', 'ghost', 'cinematic', 'minimal', 'hidden', 'появление', 'контент', 'текст', 'content reveal', 'text reveal', 'fade-up', 'blur-in', 'clip', 'letter-fade', 'размытие', 'minale', 'mann'],
}

const searchableTabContentMap = computed<Partial<Record<PanelTabId, string[]>>>(() => ({
  presets: visibleDesignPresets.value.flatMap(preset => [
    preset.id,
    preset.name,
    preset.description,
    resolvePresetTheme(preset)?.label || '',
    getPresetFamilyTag(preset),
  ]),
  concept: DESIGN_CONCEPTS.flatMap(concept => [
    concept.id,
    concept.name,
    concept.description,
    getConceptFamilyLabel(concept.id),
  ]),
  palette: UI_THEMES.value.flatMap(theme => [
    theme.id,
    theme.label,
    theme.btnPreview,
  ]),
}))

function isTabVisible(key: string): boolean {
  return (key === 'modules' || isPanelTabEnabled(key)) && activeTab.value === key
}

watch(visibleTabList, (tabs) => {
  const firstVisibleTab = tabs[0]?.id
  if (!firstVisibleTab) {
    return
  }

  if (!tabs.some(tab => tab.id === activeTab.value)) {
    activeTab.value = firstVisibleTab as PanelTabId
  }
}, { immediate: true })

watch(() => route.query.designPanelTab, (tab) => {
  if (typeof tab !== 'string') {
    return
  }

  if (tab === 'modules') {
    open.value = true
    activeTab.value = 'modules'
    return
  }

  if (visibleTabList.value.some(item => item.id === tab)) {
    open.value = true
    activeTab.value = tab as PanelTabId
  }
}, { immediate: true })

watch(() => designPanelModules.value.inspect, (enabled) => {
  if (!enabled && inspectMode.value) {
    disableInspect()
  }
})

watch(() => designPanelModules.value.elementVisibility, (enabled) => {
  if (!enabled && visibilityMode.value) {
    disableVisibilityMode()
  }
})

watch(() => designPanelModules.value.componentInspector, (enabled) => {
  if (!enabled && compMode.value) {
    toggleComp()
  }
})

watch(panelEnabled, (enabled) => {
  if (enabled) {
    return
  }

  open.value = false
  showExport.value = false
  if (aspAlignMode.value) {
    disableAlignMode()
  }
  if (inspectMode.value) {
    disableInspect()
  }
  if (visibilityMode.value) {
    disableVisibilityMode()
  }
  if (compMode.value) {
    toggleComp()
  }
})

// Auto-switch to first matching tab when search query changes
watch(searchQuery, (q) => {
  if (!q.trim()) return
  const lower = q.toLowerCase()
  const matchingTab = visibleTabList.value.find(t => {
    const ws = sectionSearchMap[t.id] || []
    const contentTerms = searchableTabContentMap.value[t.id as PanelTabId] || []
    return [...ws, ...contentTerms].some((word) => {
      const normalizedWord = word.toLowerCase()
      return normalizedWord.includes(lower) || lower.includes(normalizedWord)
    })
  })
  if (matchingTab && activeTab.value !== matchingTab.id) {
    activeTab.value = matchingTab.id as PanelTabId
  }
})

function pct(v: number) { return `${(v * 100).toFixed(0)}%` }

/** Convert #rrggbb hex to "r, g, b" string for rgba() in templates */
function clrRgb(hex: string): string {
  if (!hex || hex.length < 7) return '128, 128, 128'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function pickFont(id: string) {
  const f = FONT_OPTIONS.find(o => o.id === id)
  if (f) set('fontFamily', f.value)
}
function pickTheme(id: string) { applyThemeWithTokens(id) }

function ensurePreviewThemeSnapshot() {
  if (isPreviewActive.value || previewThemeSnapshot.value) {
    return
  }

  previewThemeSnapshot.value = themeId.value || getStoredThemeId() || ''
}

function restorePreviewTheme() {
  if (!previewThemeSnapshot.value) {
    return
  }

  applyTheme(previewThemeSnapshot.value)
  previewThemeSnapshot.value = ''
}

function pickPreset(p: DesignPreset) {
  ensurePreviewThemeSnapshot()
  activePresetId.value = p.id
  previewPreset(p)

  if (p.recommendedThemeId) {
    applyTheme(p.recommendedThemeId)
  }
}

function applyCurrentStyle() {
  confirmPreview()
  previewThemeSnapshot.value = ''
  appliedFlash.value = true
  setTimeout(() => { appliedFlash.value = false }, 1600)
}

function cancelCurrentPreview() {
  cancelPreview()
  restorePreviewTheme()
  activePresetId.value = ''
}

function onRange<K extends keyof DesignTokens>(key: K, e: Event) {
  set(key, Number((e.target as HTMLInputElement).value) as DesignTokens[K])
}
function onFloat<K extends keyof DesignTokens>(key: K, e: Event) {
  set(key, parseFloat((e.target as HTMLInputElement).value) as DesignTokens[K])
}

function resetAll() { cancelPreview(); restorePreviewTheme(); dsReset(); activePresetId.value = '' }

function copyExport() {
  const text = exportTab.value === 'json' ? exportJSON() : exportCSS()
  navigator.clipboard.writeText(text)
  copyLabel.value = '✓ скопировано'
  setTimeout(() => { copyLabel.value = 'копировать' }, 2000)
}
function doImport() {
  importError.value = ''
  try {
    if (importJSON(importBuffer.value)) {
      showExport.value = false
    } else {
      importError.value = 'Неверный формат JSON — токены не применены'
    }
  } catch (e: unknown) {
    importError.value = e instanceof Error ? e.message : 'Ошибка разбора JSON'
  }
}

function playAnim() {
  animPlaying.value = false
  requestAnimationFrame(() => { animPlaying.value = true })
  setTimeout(() => { animPlaying.value = false }, tokens.value.animDuration + 400)
}

/* ── Preview computed styles ──────────────────────── */
const previewBtnStyle = computed(() => {
  const t = tokens.value
  const sz = BTN_SIZE_MAP[t.btnSize]
  const bg = t.btnStyle === 'filled' || t.btnStyle === 'soft' ? 'color-mix(in srgb, var(--glass-text) 7%, transparent)' : 'transparent'
  const border = t.btnStyle === 'ghost' || t.btnStyle === 'soft' ? 'transparent' : 'color-mix(in srgb, var(--glass-text) 14%, transparent)'
  return {
    borderRadius: `${t.btnRadius}px`, padding: `${sz.py}px ${sz.px}px`,
    fontSize: `${sz.fontSize}rem`, textTransform: t.btnTransform,
    letterSpacing: `${t.letterSpacing}em`, background: bg,
    border: `1px solid ${border}`, fontWeight: String(t.btnWeight), fontFamily: t.fontFamily,
  }
})

const previewSmBtnStyle = computed(() => {
  const t = tokens.value
  const sz = BTN_SIZE_MAP[t.btnSize === 'xs' ? 'xs' : 'sm']
  return {
    borderRadius: `${t.btnRadius}px`, padding: `${sz.py}px ${sz.px}px`,
    fontSize: `${sz.fontSize}rem`, textTransform: t.btnTransform,
    letterSpacing: `${t.letterSpacing}em`, background: 'transparent',
    border: `1px solid color-mix(in srgb, var(--glass-text) 12%, transparent)`, fontFamily: t.fontFamily,
  }
})

const previewGhostBtnStyle = computed(() => {
  const t = tokens.value
  return {
    borderRadius: `${t.btnRadius}px`, padding: `${BTN_SIZE_MAP.sm.py}px ${BTN_SIZE_MAP.sm.px}px`,
    fontSize: `${BTN_SIZE_MAP.sm.fontSize}rem`, textTransform: t.btnTransform,
    letterSpacing: `${t.letterSpacing}em`, background: 'transparent',
    border: '1px solid transparent', fontFamily: t.fontFamily, opacity: '0.6',
  }
})

const previewBtnTypeStyle = computed(() => {
  const t = tokens.value
  const sz = BTN_SIZE_MAP[t.btnSize]
  const finalPy = t.btnPaddingV > 0 ? t.btnPaddingV : sz.py
  const finalPx = t.btnPaddingH > 0 ? t.btnPaddingH : sz.px
  const bg = t.btnStyle === 'filled' || t.btnStyle === 'soft' ? 'color-mix(in srgb, var(--glass-text) 7%, transparent)' : 'transparent'
  const border = t.btnStyle === 'ghost' || t.btnStyle === 'soft' ? 'transparent' : 'color-mix(in srgb, var(--glass-text) 14%, transparent)'
  return {
    borderRadius: `${t.btnRadius}px`, padding: `${finalPy}px ${finalPx}px`,
    fontSize: `${sz.fontSize}rem`, textTransform: t.btnTransform,
    letterSpacing: `${t.letterSpacing}em`,
    background: bg, border: `1px solid ${border}`,
    fontWeight: String(t.btnWeight), fontFamily: t.fontFamily,
    display: 'inline-block', cursor: 'default',
  }
})

const previewInputStyle = computed(() => {
  const t = tokens.value
  return {
    borderRadius: `${t.inputRadius}px`,
    padding: `${t.inputPaddingV}px ${t.inputPaddingH}px`,
    fontSize: t.inputFontSize > 0 ? `${t.inputFontSize}rem` : 'var(--ds-text-sm, .833rem)',
    fontFamily: t.fontFamily,
    background: 'color-mix(in srgb, var(--glass-text) 6%, transparent)',
    border: `1px solid color-mix(in srgb, var(--glass-text) 15%, transparent)`,
    color: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  }
})

const typeSampleStyle = computed(() => {
  const t = tokens.value
  return {
    fontFamily: t.fontFamily, fontSize: `${t.fontSize}rem`,
    fontWeight: String(t.fontWeight), letterSpacing: `${t.letterSpacing}em`,
    lineHeight: String(t.lineHeight),
    wordSpacing: t.wordSpacing > 0 ? `${t.wordSpacing}em` : 'normal',
    textAlign: t.textAlign,
    maxWidth: t.paragraphMaxWidth > 0 ? `${t.paragraphMaxWidth}ch` : 'none',
  }
})

const surfaceStyle = computed(() => {
  const t = tokens.value
  return {
    backdropFilter: `blur(${t.glassBlur}px) saturate(${t.glassSaturation}%)`,
    WebkitBackdropFilter: `blur(${t.glassBlur}px) saturate(${t.glassSaturation}%)`,
    background: 'var(--glass-bg)',
    border: `${t.borderWidth}px ${t.borderStyle} var(--glass-border)`,
    boxShadow: `0 ${t.shadowOffsetY}px ${t.shadowBlurRadius}px ${t.shadowSpread}px rgba(0,0,0,${t.shadowOpacity})`,
    borderRadius: `${t.cardRadius}px`,
  }
})

/* ══════════════════════════════════════════════════════
   INSPECT MODE — click any element to reveal controls
   ══════════════════════════════════════════════════════ */
const inspectMode = ref(false)
const inspectHover = reactive({
  visible: false,
  rect: { x: 0, y: 0, w: 0, h: 0 },
  tag: '',
  classes: '',
  sections: [] as string[],
  cssSelector: '',
})

interface InspectResult {
  tag: string
  classes: string
  sections: string[]
  tokenInfo: { name: string; value: string }[]
  rect: { x: number; y: number; w: number; h: number }
  cssPath: string
  cssSelector: string
  fullPath: string[]
}
const inspectResult = ref<InspectResult | null>(null)
const copiedPath = ref<string | null>(null)

interface AlignResult {
  tag: string
  classes: string
  rect: { x: number; y: number; w: number; h: number }
  pageSelector: string
  globalSelector: string
}

const ALIGN_GRID = 20
const alignScope = ref<'page' | 'global'>('page')
const alignHover = reactive({
  visible: false,
  rect: { x: 0, y: 0, w: 0, h: 0 },
  tag: '',
  classes: '',
  pageSelector: '',
  globalSelector: '',
})
const alignResult = ref<AlignResult | null>(null)
const alignDrag = reactive({
  active: false,
  moved: false,
  target: null as HTMLElement | null,
  tag: '',
  classes: '',
  pageSelector: '',
  globalSelector: '',
  startX: 0,
  startY: 0,
  baseX: 0,
  baseY: 0,
  rect: { x: 0, y: 0, w: 0, h: 0 },
})
const alignResize = reactive({
  active: false,
  target: null as HTMLElement | null,
  tag: '',
  classes: '',
  pageSelector: '',
  globalSelector: '',
  startX: 0,
  startY: 0,
  baseX: 0,
  baseY: 0,
  baseW: 0,
  baseH: 0,
  rect: { x: 0, y: 0, w: 0, h: 0 },
})

const sectionLabels: Record<string, string> = {
  modules: 'Модули UI',
  builder: 'Сборщик App',
  presets: 'Рецепты', palette: 'Палитра', buttons: 'Кнопки',
  type: 'Типографика', typeScale: 'Шкала', surface: 'Поверхности',
  radii: 'Скругления', anim: 'Анимация', grid: 'Сетка', darkMode: 'Тёмная тема',
  inputs: 'Инпуты', tags: 'Теги/чипы', nav: 'Навигация', statuses: 'Статусы', popups: 'Попапы',
  scrollbar: 'Скроллбар', tables: 'Таблицы', badges: 'Значки', arch: 'Архитектура',
}

/* ─── Quick-edit token controls ─────────────────────────────────────────────
   Used in the inspect result panel to render inline sliders per section.
─────────────────────────────────────────────────────────────────────────── */
type QEControl = { key: keyof DesignTokens; label: string; min: number; max: number; step: number; isFloat?: boolean; fmt: (v: number) => string }
const TOKEN_CONTROLS: Record<string, QEControl[]> = {
  buttons: [
    { key: 'btnRadius', label: 'скругление', min: 0, max: 32, step: 1, fmt: v => v + 'px' },
    { key: 'btnWeight', label: 'жирность', min: 400, max: 700, step: 100, fmt: v => String(v) },
    { key: 'btnPaddingH', label: 'отст. гор.', min: 0, max: 60, step: 1, fmt: v => v === 0 ? 'авто' : v + 'px' },
    { key: 'btnPaddingV', label: 'отст. верт.', min: 0, max: 32, step: 1, fmt: v => v === 0 ? 'авто' : v + 'px' },
  ],
  type: [
    { key: 'fontSize', label: 'размер', min: 0.7, max: 1.4, step: 0.02, isFloat: true, fmt: v => Math.round(v * 100) + '%' },
    { key: 'lineHeight', label: 'межстрочный', min: 1.1, max: 2.0, step: 0.05, isFloat: true, fmt: v => v.toFixed(2) },
    { key: 'letterSpacing', label: 'межбукв', min: -0.02, max: 0.15, step: 0.005, isFloat: true, fmt: v => v.toFixed(3) + 'em' },
    { key: 'wordSpacing', label: 'межслов', min: 0, max: 0.3, step: 0.01, isFloat: true, fmt: v => v === 0 ? 'авто' : v.toFixed(2) + 'em' },
    { key: 'textIndent', label: 'отступ 1стр', min: 0, max: 4, step: 0.25, isFloat: true, fmt: v => v === 0 ? 'нет' : v.toFixed(1) + 'em' },
    { key: 'headingLetterSpacing', label: 'загол.межбукв', min: -0.06, max: 0.15, step: 0.005, isFloat: true, fmt: v => v.toFixed(3) + 'em' },
    { key: 'headingLineHeight', label: 'загол.строка', min: 0.9, max: 2.0, step: 0.05, isFloat: true, fmt: v => v.toFixed(2) },
    { key: 'paragraphMaxWidth', label: 'ширина абз', min: 0, max: 100, step: 2, fmt: v => v === 0 ? '∞' : v + 'ch' },
  ],
  typeScale: [
    { key: 'typeScale', label: 'шкала', min: 1.067, max: 1.618, step: 0.001, isFloat: true, fmt: v => v.toFixed(3) },
  ],
  surface: [
    { key: 'glassBlur', label: 'размытие', min: 0, max: 64, step: 1, fmt: v => v + 'px' },
    { key: 'glassSaturation', label: 'насыщенность', min: 0, max: 300, step: 5, fmt: v => v + '%' },
    { key: 'glassOpacity', label: 'прозрачность', min: 0, max: 1, step: 0.02, isFloat: true, fmt: v => Math.round(v * 100) + '%' },
    { key: 'shadowOpacity', label: 'тень', min: 0, max: 0.4, step: 0.01, isFloat: true, fmt: v => Math.round(v * 100) + '%' },
  ],
  radii: [
    { key: 'cardRadius', label: 'карточка', min: 0, max: 32, step: 1, fmt: v => v + 'px' },
    { key: 'inputRadius', label: 'инпут', min: 0, max: 20, step: 1, fmt: v => v + 'px' },
  ],
  anim: [
    { key: 'animDuration', label: 'длительность', min: 0, max: 600, step: 10, fmt: v => v + 'ms' },
  ],
  grid: [
    { key: 'gridGap', label: 'gap', min: 4, max: 32, step: 1, fmt: v => v + 'px' },
    { key: 'borderWidth', label: 'обводка', min: 0, max: 3, step: 0.5, isFloat: true, fmt: v => v + 'px' },
  ],
  inputs: [
    { key: 'inputBgOpacity', label: 'фон', min: 0, max: 0.25, step: 0.005, isFloat: true, fmt: v => Math.round(v * 100) + '%' },
    { key: 'inputBorderOpacity', label: 'рамка', min: 0, max: 0.4, step: 0.01, isFloat: true, fmt: v => Math.round(v * 100) + '%' },
    { key: 'inputRadius', label: 'радиус', min: 0, max: 20, step: 1, fmt: v => v + 'px' },
    { key: 'inputPaddingH', label: 'отст. гор.', min: 4, max: 32, step: 1, fmt: v => v + 'px' },
    { key: 'inputPaddingV', label: 'отст. верт.', min: 2, max: 24, step: 1, fmt: v => v + 'px' },
    { key: 'inputFontSize', label: 'шрифт', min: 0, max: 1.2, step: 0.025, isFloat: true, fmt: v => v === 0 ? 'авто' : v.toFixed(2) + 'rem' },
  ],
  tags: [
    { key: 'chipRadius', label: 'скругление', min: 0, max: 999, step: 1, fmt: v => v > 99 ? '∞' : v + 'px' },
    { key: 'chipBgOpacity', label: 'фон', min: 0, max: 0.3, step: 0.005, isFloat: true, fmt: v => Math.round(v * 100) + '%' },
    { key: 'chipPaddingH', label: 'паддинг Г', min: 3, max: 24, step: 1, fmt: v => v + 'px' },
  ],
  statuses: [
    { key: 'statusPillRadius', label: 'форма', min: 0, max: 999, step: 1, fmt: v => v > 99 ? '∞' : v + 'px' },
    { key: 'statusBgOpacity', label: 'фон', min: 0, max: 0.5, step: 0.005, isFloat: true, fmt: v => Math.round(v * 100) + '%' },
  ],
  nav: [
    { key: 'navItemRadius', label: 'скругление', min: 0, max: 24, step: 1, fmt: v => v + 'px' },
    { key: 'navItemPaddingH', label: 'отст. гор.', min: 4, max: 28, step: 1, fmt: v => v + 'px' },
    { key: 'navItemPaddingV', label: 'отст. верт.', min: 2, max: 18, step: 1, fmt: v => v + 'px' },
  ],
  popups: [
    { key: 'dropdownBlur', label: 'размытие', min: 0, max: 40, step: 1, fmt: v => v + 'px' },
    { key: 'modalOverlayOpacity', label: 'затемнение', min: 0, max: 0.9, step: 0.02, isFloat: true, fmt: v => Math.round(v * 100) + '%' },
  ],
  badges: [
    { key: 'badgeRadius', label: 'форма', min: 0, max: 999, step: 1, fmt: v => v > 99 ? '∞' : v + 'px' },
    { key: 'badgeBgOpacity', label: 'фон', min: 0, max: 0.5, step: 0.01, isFloat: true, fmt: v => Math.round(v * 100) + '%' },
  ],
  scrollbar: [
    { key: 'scrollbarWidth', label: 'ширина', min: 2, max: 14, step: 1, fmt: v => v + 'px' },
    { key: 'scrollbarOpacity', label: 'видимость', min: 0, max: 0.8, step: 0.01, isFloat: true, fmt: v => Math.round(v * 100) + '%' },
  ],
}

const quickEditControls = computed((): QEControl[] => {
  if (!inspectResult.value) return []
  const seen = new Set<string>()
  return inspectResult.value.sections
    .flatMap(s => (TOKEN_CONTROLS[s] || [])
      .filter(c => {
        if (seen.has(c.key)) return false
        seen.add(c.key)
        return true
      })
    ).slice(0, 8)
})

const inspectHighlightStyle = computed(() => ({
  left: `${inspectHover.rect.x}px`, top: `${inspectHover.rect.y}px`,
  width: `${inspectHover.rect.w}px`, height: `${inspectHover.rect.h}px`,
}))
const inspectTooltipStyle = computed(() => {
  const r = inspectHover.rect
  const top = r.y > 60 ? r.y - 8 : r.y + r.h + 8
  return { left: `${Math.max(8, r.x)}px`, top: `${top}px`, transform: r.y > 60 ? 'translateY(-100%)' : 'none' }
})
const inspectResultStyle = computed(() => {
  if (!inspectResult.value) return {}
  const r = inspectResult.value.rect
  const panelW = quickEditControls.value.length > 0 ? 300 : 260
  const leftEdge = r.x + r.w + 12
  const useLeft = leftEdge + panelW < window.innerWidth
  return {
    top: `${Math.max(8, Math.min(r.y, window.innerHeight - 400))}px`,
    left: useLeft ? `${leftEdge}px` : `${Math.max(8, r.x - panelW - 12)}px`,
    width: `${panelW}px`,
  }
})

const visibilityMode = ref(false)
const visibilityNotice = ref('')
const visibilityHover = reactive({
  visible: false,
  rect: { x: 0, y: 0, w: 0, h: 0 },
  tag: '',
  classes: '',
  pageSelector: '',
  globalSelector: '',
})

interface VisibilityResult {
  tag: string
  classes: string
  rect: { x: number; y: number; w: number; h: number }
  pageSelector: string
  globalSelector: string
  className: string
  classSelector: string
  componentName: string
  componentSelector: string
}

const visibilityResult = ref<VisibilityResult | null>(null)

const currentPageVisibilityRule = computed(() => {
  if (!visibilityResult.value) {
    return null
  }

  return findVisibilityRule(visibilityResult.value.pageSelector, 'page', currentPath.value)
})

const globalVisibilityRule = computed(() => {
  if (!visibilityResult.value) {
    return null
  }

  return findVisibilityRule(visibilityResult.value.globalSelector, 'global')
})

const classVisibilityRule = computed(() => {
  if (!visibilityResult.value?.classSelector) {
    return null
  }

  return findVisibilityRule(visibilityResult.value.classSelector, 'global')
})

const componentVisibilityRule = computed(() => {
  if (!visibilityResult.value?.componentSelector) {
    return null
  }

  return findVisibilityRule(visibilityResult.value.componentSelector, 'global')
})

const visibilityHighlightStyle = computed(() => ({
  left: `${visibilityHover.rect.x}px`,
  top: `${visibilityHover.rect.y}px`,
  width: `${visibilityHover.rect.w}px`,
  height: `${visibilityHover.rect.h}px`,
}))

const visibilityTooltipStyle = computed(() => {
  const r = visibilityHover.rect
  const top = r.y > 80 ? r.y - 8 : r.y + r.h + 8
  return {
    left: `${Math.max(8, r.x)}px`,
    top: `${top}px`,
    transform: r.y > 80 ? 'translateY(-100%)' : 'none',
  }
})

const visibilityResultStyle = computed(() => {
  if (!visibilityResult.value) {
    return {}
  }

  const r = visibilityResult.value.rect
  const panelW = 320
  const leftEdge = r.x + r.w + 12
  const useLeft = leftEdge + panelW < window.innerWidth

  return {
    top: `${Math.max(8, Math.min(r.y, window.innerHeight - 420))}px`,
    left: useLeft ? `${leftEdge}px` : `${Math.max(8, r.x - panelW - 12)}px`,
    width: `${panelW}px`,
  }
})

/* ── CSS path utilities ── */
function getElementSelector(el: Element): string {
  const tag = el.tagName.toLowerCase()
  if (tag === 'html' || tag === 'body') return tag
  const id = el.id
  if (id) return `${tag}#${CSS.escape(id)}`
  const cls = Array.from(el.classList).filter(c => !c.startsWith('dp-') && !c.startsWith('v-') && c.length < 40).slice(0, 2)
  const suffix = cls.length ? '.' + cls.join('.') : ''
  return tag + suffix
}

function getCssPath(el: Element): string[] {
  const path: string[] = []
  let node: Element | null = el
  while (node && node !== document.documentElement) {
    path.unshift(getElementSelector(node))
    node = node.parentElement
  }
  return path
}

function getCssSelector(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`
  const path = getCssPath(el)
  // Try shortest unique selector from end
  for (let i = path.length - 1; i >= Math.max(0, path.length - 4); i--) {
    const sel = path.slice(i).join(' > ')
    try {
      const matches = document.querySelectorAll(sel)
      if (matches.length === 1) return sel
    } catch { /* skip invalid selectors */ }
  }
  return path.join(' > ')
}

function getGlobalSelector(el: HTMLElement): string {
  if (el.id) {
    return `#${CSS.escape(el.id)}`
  }

  const tag = el.tagName.toLowerCase()
  const classes = Array.from(el.classList)
    .filter(className => className && !className.startsWith('dp-') && !className.startsWith('v-') && !/\d{3,}/.test(className))
    .slice(0, 3)

  if (classes.length) {
    return `${tag}.${classes.map(className => CSS.escape(className)).join('.')}`
  }

  if (el.dataset.compName) {
    return `[data-comp-name="${CSS.escape(el.dataset.compName)}"]`
  }

  return getCssSelector(el)
}

function getPrimaryClass(el: HTMLElement): string {
  return Array.from(el.classList)
    .filter(className => className && !className.startsWith('dp-') && !className.startsWith('v-') && !className.startsWith('router-link') && !/^nuxt/.test(className) && !/\d{3,}/.test(className))
    .sort((left, right) => left.length - right.length)[0] || ''
}

function getComponentSelector(el: HTMLElement): { name: string; selector: string } | null {
  const stamped = el.closest('[data-comp-name]') as HTMLElement | null
  if (stamped?.dataset.compName) {
    return {
      name: stamped.dataset.compName,
      selector: `[data-comp-name="${CSS.escape(stamped.dataset.compName)}"]`,
    }
  }

  return null
}

function getVisibilityLabel(tag: string, classes: string) {
  return classes ? `${tag}.${classes}` : tag
}

function copyPath(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    copiedPath.value = text
    setTimeout(() => { copiedPath.value = null }, 1500)
  })
}

/* ── Detect which design sections affect an element ── */
function detectSections(el: HTMLElement): string[] {
  const cs = getComputedStyle(el)
  const tag = el.tagName.toLowerCase()
  const cls = el.className?.toString?.() || ''
  const found = new Set<string>()

  // Buttons
  if (tag === 'button' || tag === 'a' || el.getAttribute('role') === 'button' ||
      cls.includes('btn') || cls.includes('chip')) {
    found.add('buttons')
  }

  // Typography — element has visible text
  const hasText = el.childNodes.length > 0 && Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent?.trim())
  if (hasText || ['h1','h2','h3','h4','h5','h6','p','span','label','a','li','td','th'].includes(tag)) {
    found.add('type')
    found.add('typeScale')
  }

  // Glass / Surfaces
  if (cs.backdropFilter !== 'none' || cls.includes('glass') || cls.includes('surface') ||
      parseFloat(cs.getPropertyValue('--glass-blur') || '0') > 0) {
    found.add('surface')
  }

  // Shadows
  if (cs.boxShadow && cs.boxShadow !== 'none') {
    found.add('surface')
  }

  // Border radius
  if (parseFloat(cs.borderRadius) > 0) {
    found.add('radii')
  }

  // Animation / transition
  if ((cs.transition && cs.transition !== 'none' && !cs.transition.startsWith('all 0s')) ||
      (cs.animation && cs.animation !== 'none')) {
    found.add('anim')
  }

  // Grid / layout containers
  if (cs.display === 'grid' || cs.display === 'flex' ||
      cls.includes('container') || cls.includes('sidebar') || cls.includes('grid')) {
    found.add('grid')
  }

  // Borders
  if (parseFloat(cs.borderWidth) > 0 && cs.borderStyle !== 'none') {
    found.add('grid') // borders are in grid section
  }

  // Color / accent
  const colorStr = cs.color + cs.backgroundColor
  if (colorStr.includes('var(--ds-accent') || cls.includes('accent') || cls.includes('primary')) {
    found.add('palette')
  }

  // Input fields
  if (['input', 'textarea', 'select'].includes(tag) || cls.includes('input') || cls.includes('field') || cls.includes('form-control')) {
    found.add('inputs')
  }

  // Tags / chips
  if (cls.includes('chip') || cls.includes('tag') || cls.includes('badge') || cls.includes('pill') || cls.includes('label') || cls.includes('gfb-tag')) {
    found.add('tags')
  }

  // Status pills
  if (cls.includes('status') || cls.includes('rm-status') || cls.includes('ws-status') || cls.includes('stat-pill')) {
    found.add('statuses')
  }

  // Navigation
  if (cls.includes('nav') || cls.includes('sidebar') || cls.includes('menu-item') || cls.includes('std-nav') || tag === 'nav' || tag === 'aside') {
    found.add('nav')
  }

  // Scrollable containers
  if (cs.overflow === 'auto' || cs.overflow === 'scroll' || cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
    found.add('scrollbar')
  }

  // If nothing specific found, show typography + radii as starting point
  if (found.size === 0) {
    found.add('type')
    found.add('radii')
  }

  return Array.from(found)
}

/* ── Get token values that affect this element ── */
function getTokenInfo(el: HTMLElement, secs: string[]): { name: string; value: string }[] {
  const cs = getComputedStyle(el)
  const info: { name: string; value: string }[] = []

  if (secs.includes('buttons')) {
    info.push({ name: 'border-radius', value: cs.borderRadius })
    info.push({ name: 'padding', value: cs.padding })
    info.push({ name: 'font-size', value: cs.fontSize })
    info.push({ name: 'font-weight', value: cs.fontWeight })
    info.push({ name: 'text-transform', value: cs.textTransform })
  }
  if (secs.includes('type') || secs.includes('typeScale')) {
    info.push({ name: 'font-family', value: cs.fontFamily?.split(',')[0]?.replace(/"/g, '') ?? 'inherit' })
    info.push({ name: 'font-size', value: cs.fontSize })
    info.push({ name: 'line-height', value: cs.lineHeight })
    info.push({ name: 'letter-spacing', value: cs.letterSpacing })
  }
  if (secs.includes('surface')) {
    info.push({ name: 'backdrop-filter', value: cs.backdropFilter || 'none' })
    info.push({ name: 'box-shadow', value: cs.boxShadow === 'none' ? 'none' : cs.boxShadow.substring(0, 40) + '…' })
    info.push({ name: 'background', value: cs.backgroundColor })
  }
  if (secs.includes('radii')) {
    info.push({ name: 'border-radius', value: cs.borderRadius })
  }
  if (secs.includes('anim')) {
    info.push({ name: 'transition', value: cs.transitionDuration + ' ' + cs.transitionTimingFunction })
  }
  if (secs.includes('grid')) {
    info.push({ name: 'display', value: cs.display })
    info.push({ name: 'gap', value: cs.gap || 'n/a' })
    info.push({ name: 'border', value: `${cs.borderWidth} ${cs.borderStyle}` })
  }

  // Dedupe by name
  const seen = new Set<string>()
  return info.filter(i => {
    if (seen.has(i.name)) return false
    seen.add(i.name)
    return true
  })
}

/* ── Inspect event handlers ── */
function isInsidePanel(el: HTMLElement): boolean {
  return !!el.closest('.dp-panel') || !!el.closest('.dp-inspect-result') ||
         !!el.closest('.dp-inspect-tooltip') || !!el.closest('.dp-visibility-result') ||
         !!el.closest('.dp-visibility-tooltip') || !!el.closest('.dp-align-result') ||
         !!el.closest('.dp-align-tooltip') || !!el.closest('.dp-align-badge') ||
         !!el.closest('.dp-overlay') || !!el.closest('.dp-topbar')
}

function snapAlign(value: number) {
  return Math.round(value / ALIGN_GRID) * ALIGN_GRID
}

function readAlignClasses(el: HTMLElement) {
  return (el.className?.toString?.() || '')
    .split(/\s+/)
    .filter(className => className && !className.startsWith('dp-'))
    .slice(0, 4)
    .join('.')
}

function getAlignTarget(el: HTMLElement | null): HTMLElement | null {
  let node = el
  while (node && node !== document.body) {
    if (isInsidePanel(node) || node.closest('.dp-comp-layer') || node.closest('.asp-canvas')) {
      return null
    }

    const rect = node.getBoundingClientRect()
    const styles = getComputedStyle(node)
    const cls = node.className?.toString?.() || ''
    const hasIdentity = Boolean(node.id || cls.split(/\s+/).filter(className => className && !className.startsWith('dp-')).length)
    const tag = node.tagName.toLowerCase()
    const isUtilityTag = ['path', 'svg', 'use', 'small', 'strong', 'em', 'b', 'i', 'br'].includes(tag)
    const isInline = styles.display === 'inline'
    const fillsViewport = rect.width >= window.innerWidth * 0.96 && rect.height >= window.innerHeight * 0.9
    const isStructuralTag = ['section', 'article', 'main', 'aside', 'nav', 'header', 'footer', 'div', 'button', 'a', 'li'].includes(tag)

    if (!fillsViewport && rect.width >= 24 && rect.height >= 24 && !isInline && !isUtilityTag && (hasIdentity || isStructuralTag)) {
      return node
    }

    node = node.parentElement
  }

  return null
}

function openAlignResult(el: HTMLElement, preferredScope?: 'page' | 'global') {
  const rect = el.getBoundingClientRect()
  const pageSelector = getCssSelector(el)
  const globalSelector = getGlobalSelector(el)
  const globalRule = findAlignmentRule(globalSelector, 'global')
  alignScope.value = preferredScope || (globalRule ? 'global' : 'page')
  alignResult.value = {
    tag: el.tagName.toLowerCase(),
    classes: readAlignClasses(el),
    rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
    pageSelector,
    globalSelector,
  }
}

const currentAlignmentRule = computed(() => {
  if (!alignResult.value) {
    return null
  }

  return alignScope.value === 'global'
    ? findAlignmentRule(alignResult.value.globalSelector, 'global')
    : findAlignmentRule(alignResult.value.pageSelector, 'page', alignmentPath.value)
})

const alignHighlightStyle = computed(() => {
  const rect = alignDrag.active && alignResult.value ? alignResult.value.rect : alignHover.rect
  return {
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.w}px`,
    height: `${rect.h}px`,
  }
})

const alignTooltipStyle = computed(() => {
  const rect = alignHover.rect
  const left = Math.min(rect.x, window.innerWidth - 280)
  const top = rect.y > 64 ? rect.y - 8 : rect.y + rect.h + 8
  return {
    left: `${Math.max(8, left)}px`,
    top: `${top}px`,
    transform: rect.y > 64 ? 'translateY(-100%)' : 'none',
  }
})

const alignResultStyle = computed(() => {
  if (!alignResult.value) {
    return {}
  }

  const rect = alignResult.value.rect
  const panelW = 280
  const leftEdge = rect.x + rect.w + 12
  const useLeft = leftEdge + panelW < window.innerWidth
  return {
    top: `${Math.max(8, Math.min(rect.y, window.innerHeight - 220))}px`,
    left: useLeft ? `${leftEdge}px` : `${Math.max(8, rect.x - panelW - 12)}px`,
    width: `${panelW}px`,
  }
})

const alignOffsetLabel = computed(() => {
  const x = currentAlignmentRule.value?.x || 0
  const y = currentAlignmentRule.value?.y || 0
  return `x ${x}px · y ${y}px`
})

const alignSizeLabel = computed(() => {
  const width = currentAlignmentRule.value?.width ?? Math.round(alignResult.value?.rect.w || 0)
  const height = currentAlignmentRule.value?.height ?? Math.round(alignResult.value?.rect.h || 0)
  return `${width}px × ${height}px`
})

function updateAlignHover(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  alignHover.rect = { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
  alignHover.tag = el.tagName.toLowerCase()
  alignHover.classes = readAlignClasses(el)
  alignHover.pageSelector = getCssSelector(el)
  alignHover.globalSelector = getGlobalSelector(el)
  alignHover.visible = true
}

function onInspectMove(e: MouseEvent) {
  const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
  if (!el || isInsidePanel(el)) {
    inspectHover.visible = false
    return
  }
  const rect = el.getBoundingClientRect()
  inspectHover.rect = { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
  inspectHover.tag = el.tagName.toLowerCase()
  const cls = el.className?.toString?.() || ''
  inspectHover.classes = cls.split(/\s+/).filter(c => c && !c.startsWith('dp-')).slice(0, 3).join('.')
  inspectHover.sections = detectSections(el)
  inspectHover.cssSelector = getCssSelector(el)
  inspectHover.visible = true
}

function onInspectClick(e: MouseEvent) {
  // Let clicks inside the panel / result / tooltip pass through to Vue handlers
  const target = e.target as HTMLElement
  if (target && isInsidePanel(target)) return
  e.preventDefault()
  e.stopPropagation()
  const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
  if (!el) return

  const rect = el.getBoundingClientRect()
  const secs = detectSections(el)
  const tokenInfo = getTokenInfo(el, secs)
  const cls = el.className?.toString?.() || ''

  const fullPath = getCssPath(el)
  inspectResult.value = {
    tag: el.tagName.toLowerCase(),
    classes: cls.split(/\s+/).filter(c => c && !c.startsWith('dp-')).slice(0, 4).join('.'),
    sections: secs,
    tokenInfo,
    rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
    cssPath: fullPath.join(' > '),
    cssSelector: getCssSelector(el),
    fullPath,
  }
}

function jumpToSection(sec: string) {
  if (!isPanelTabEnabled(sec)) {
    return
  }
  if (!open.value) open.value = true
  activeTab.value = sec as PanelTabId
  disableInspect()
}

function toggleInspect() {
  if (!designPanelModules.value.inspect) {
    return
  }
  if (inspectMode.value) {
    disableInspect()
  } else {
    enableInspect()
  }
}

function enableInspect() {
  if (!designPanelModules.value.inspect) {
    return
  }
  if (visibilityMode.value) {
    disableVisibilityMode()
  }
  if (compMode.value) {
    toggleComp()
  }
  inspectMode.value = true
  inspectResult.value = null
  document.addEventListener('mousemove', onInspectMove, true)
  document.addEventListener('click', onInspectClick, true)
  document.body.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27%3E%3Ccircle cx=%2712%27 cy=%2712%27 r=%2710%27 fill=%27none%27 stroke=%27%2356B0FF%27 stroke-width=%271.5%27 stroke-dasharray=%273 2%27 opacity=%270.7%27/%3E%3Cline x1=%2712%27 y1=%274%27 x2=%2712%27 y2=%2720%27 stroke=%27%2356B0FF%27 stroke-width=%271%27 opacity=%270.5%27/%3E%3Cline x1=%274%27 y1=%2712%27 x2=%2720%27 y2=%2712%27 stroke=%27%2356B0FF%27 stroke-width=%271%27 opacity=%270.5%27/%3E%3Ccircle cx=%2712%27 cy=%2712%27 r=%272%27 fill=%27%2356B0FF%27 opacity=%270.8%27/%3E%3C/svg%3E") 12 12, crosshair'
}

function disableInspect() {
  inspectMode.value = false
  inspectHover.visible = false
  inspectResult.value = null
  document.removeEventListener('mousemove', onInspectMove, true)
  document.removeEventListener('click', onInspectClick, true)
  document.body.style.cursor = ''
}

function setAlignScope(scope: 'page' | 'global') {
  alignScope.value = scope
}

function resetAlignment(scope: 'page' | 'global' = alignScope.value) {
  if (!alignResult.value) {
    return
  }

  if (scope === 'global') {
    removeAlignmentRule(alignResult.value.globalSelector, 'global')
  } else {
    removeAlignmentRule(alignResult.value.pageSelector, 'page', alignmentPath.value)
  }
}

function onAlignPointerMove(e: PointerEvent) {
  if (alignResize.active && alignResult.value) {
    e.preventDefault()
    e.stopPropagation()

    const nextWidth = Math.max(24, snapAlign(alignResize.baseW + (e.clientX - alignResize.startX)))
    const nextHeight = Math.max(24, snapAlign(alignResize.baseH + (e.clientY - alignResize.startY)))
    const selector = alignScope.value === 'global' ? alignResize.globalSelector : alignResize.pageSelector
    setRulePosition({
      selector,
      scope: alignScope.value,
      path: alignScope.value === 'page' ? alignmentPath.value : null,
      label: alignResize.classes || alignResize.tag,
      tag: alignResize.tag,
      classes: alignResize.classes,
      x: alignResize.baseX,
      y: alignResize.baseY,
      width: nextWidth,
      height: nextHeight,
    }, { persist: false })

    alignResult.value.rect = {
      x: alignResize.rect.x,
      y: alignResize.rect.y,
      w: nextWidth,
      h: nextHeight,
    }
    return
  }

  if (alignDrag.active && alignResult.value) {
    e.preventDefault()
    e.stopPropagation()

    const nextX = snapAlign(alignDrag.baseX + (e.clientX - alignDrag.startX))
    const nextY = snapAlign(alignDrag.baseY + (e.clientY - alignDrag.startY))
    alignDrag.moved = alignDrag.moved || nextX !== alignDrag.baseX || nextY !== alignDrag.baseY

    const selector = alignScope.value === 'global' ? alignDrag.globalSelector : alignDrag.pageSelector
    setRulePosition({
      selector,
      scope: alignScope.value,
      path: alignScope.value === 'page' ? alignmentPath.value : null,
      label: alignDrag.classes || alignDrag.tag,
      tag: alignDrag.tag,
      classes: alignDrag.classes,
      x: nextX,
      y: nextY,
      width: currentAlignmentRule.value?.width ?? alignDrag.rect.w,
      height: currentAlignmentRule.value?.height ?? alignDrag.rect.h,
    }, { persist: false })

    alignResult.value.rect = {
      x: alignDrag.rect.x + (nextX - alignDrag.baseX),
      y: alignDrag.rect.y + (nextY - alignDrag.baseY),
      w: alignDrag.rect.w,
      h: alignDrag.rect.h,
    }
    return
  }

  const el = getAlignTarget(document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)
  if (!el) {
    alignHover.visible = false
    return
  }

  updateAlignHover(el)
}

function onAlignPointerDown(e: PointerEvent) {
  const target = e.target as HTMLElement | null
  if (target && isInsidePanel(target)) {
    return
  }

  const el = getAlignTarget(document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)
  if (!el) {
    return
  }

  e.preventDefault()
  e.stopPropagation()

  const pageSelector = getCssSelector(el)
  const globalSelector = getGlobalSelector(el)
  openAlignResult(el)
  const rule = alignScope.value === 'global'
    ? findAlignmentRule(globalSelector, 'global')
    : findAlignmentRule(pageSelector, 'page', alignmentPath.value)
  const rect = el.getBoundingClientRect()

  alignDrag.active = true
  alignDrag.moved = false
  alignDrag.target = el
  alignDrag.tag = el.tagName.toLowerCase()
  alignDrag.classes = readAlignClasses(el)
  alignDrag.pageSelector = pageSelector
  alignDrag.globalSelector = globalSelector
  alignDrag.startX = e.clientX
  alignDrag.startY = e.clientY
  alignDrag.baseX = rule?.x || 0
  alignDrag.baseY = rule?.y || 0
  alignDrag.rect = { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
  document.body.style.cursor = 'grabbing'
}

function startAlignResize(e: PointerEvent) {
  if (!alignResult.value || !alignDrag.target) {
    return
  }

  e.preventDefault()
  e.stopPropagation()

  const target = alignDrag.target
  const rect = alignResult.value.rect
  const rule = alignScope.value === 'global'
    ? findAlignmentRule(alignResult.value.globalSelector, 'global')
    : findAlignmentRule(alignResult.value.pageSelector, 'page', alignmentPath.value)

  alignResize.active = true
  alignResize.target = target
  alignResize.tag = alignResult.value.tag
  alignResize.classes = alignResult.value.classes
  alignResize.pageSelector = alignResult.value.pageSelector
  alignResize.globalSelector = alignResult.value.globalSelector
  alignResize.startX = e.clientX
  alignResize.startY = e.clientY
  alignResize.baseX = rule?.x || 0
  alignResize.baseY = rule?.y || 0
  alignResize.baseW = rule?.width ?? Math.round(rect.w)
  alignResize.baseH = rule?.height ?? Math.round(rect.h)
  alignResize.rect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h }
  document.body.style.cursor = 'se-resize'
}

function onAlignPointerUp(e: PointerEvent) {
  if (!alignDrag.active && !alignResize.active) {
    return
  }

  e.preventDefault()
  e.stopPropagation()

  if (alignResize.active) {
    const selector = alignScope.value === 'global' ? alignResize.globalSelector : alignResize.pageSelector
    const rule = alignScope.value === 'global'
      ? findAlignmentRule(alignResize.globalSelector, 'global')
      : findAlignmentRule(alignResize.pageSelector, 'page', alignmentPath.value)

    setRulePosition({
      selector,
      scope: alignScope.value,
      path: alignScope.value === 'page' ? alignmentPath.value : null,
      label: alignResize.classes || alignResize.tag,
      tag: alignResize.tag,
      classes: alignResize.classes,
      x: rule?.x || 0,
      y: rule?.y || 0,
      width: rule?.width ?? alignResize.baseW,
      height: rule?.height ?? alignResize.baseH,
    })

    if (alignResize.target) {
      openAlignResult(alignResize.target, alignScope.value)
      alignDrag.target = alignResize.target
    }

    alignResize.active = false
    alignResize.target = null
    document.body.style.cursor = 'crosshair'
    return
  }

  const selector = alignScope.value === 'global' ? alignDrag.globalSelector : alignDrag.pageSelector
  const rule = alignScope.value === 'global'
    ? findAlignmentRule(alignDrag.globalSelector, 'global')
    : findAlignmentRule(alignDrag.pageSelector, 'page', alignmentPath.value)

  setRulePosition({
    selector,
    scope: alignScope.value,
    path: alignScope.value === 'page' ? alignmentPath.value : null,
    label: alignDrag.classes || alignDrag.tag,
    tag: alignDrag.tag,
    classes: alignDrag.classes,
    x: rule?.x || 0,
    y: rule?.y || 0,
    width: rule?.width ?? alignDrag.rect.w,
    height: rule?.height ?? alignDrag.rect.h,
  })

  if (alignDrag.target) {
    openAlignResult(alignDrag.target, alignScope.value)
  }

  alignDrag.active = false
  alignDrag.target = null
  document.body.style.cursor = 'crosshair'
}

function enableAlignMode() {
  if (inspectMode.value) {
    disableInspect()
  }
  if (visibilityMode.value) {
    disableVisibilityMode()
  }
  if (compMode.value) {
    toggleComp()
  }

  aspAlignMode.value = true
  alignHover.visible = false
  alignResult.value = null
  document.addEventListener('pointermove', onAlignPointerMove, true)
  document.addEventListener('pointerdown', onAlignPointerDown, true)
  document.addEventListener('pointerup', onAlignPointerUp, true)
  document.body.style.cursor = 'crosshair'
}

function disableAlignMode() {
  aspAlignMode.value = false
  alignHover.visible = false
  alignResult.value = null
  alignDrag.active = false
  alignDrag.target = null
  alignResize.active = false
  alignResize.target = null
  document.removeEventListener('pointermove', onAlignPointerMove, true)
  document.removeEventListener('pointerdown', onAlignPointerDown, true)
  document.removeEventListener('pointerup', onAlignPointerUp, true)
  document.body.style.cursor = ''
}

function toggleAlignMode() {
  if (aspAlignMode.value) {
    disableAlignMode()
  } else {
    enableAlignMode()
  }
}

function onVisibilityMove(e: MouseEvent) {
  const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
  if (!el || isInsidePanel(el)) {
    visibilityHover.visible = false
    return
  }

  const rect = el.getBoundingClientRect()
  visibilityHover.rect = { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
  visibilityHover.tag = el.tagName.toLowerCase()
  visibilityHover.classes = (el.className?.toString?.() || '')
    .split(/\s+/)
    .filter(className => className && !className.startsWith('dp-'))
    .slice(0, 3)
    .join('.')
  visibilityHover.pageSelector = getCssSelector(el)
  visibilityHover.globalSelector = getGlobalSelector(el)
  visibilityHover.visible = true
}

function onVisibilityClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target && isInsidePanel(target)) {
    return
  }

  e.preventDefault()
  e.stopPropagation()

  const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
  if (!el) {
    return
  }

  const rect = el.getBoundingClientRect()
  const classes = (el.className?.toString?.() || '')
    .split(/\s+/)
    .filter(className => className && !className.startsWith('dp-'))
    .slice(0, 4)
    .join('.')
  const primaryClass = getPrimaryClass(el)
  const componentMeta = getComponentSelector(el)

  visibilityResult.value = {
    tag: el.tagName.toLowerCase(),
    classes,
    rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
    pageSelector: getCssSelector(el),
    globalSelector: getGlobalSelector(el),
    className: primaryClass,
    classSelector: primaryClass ? `.${CSS.escape(primaryClass)}` : '',
    componentName: componentMeta?.name || '',
    componentSelector: componentMeta?.selector || '',
  }
  visibilityNotice.value = ''
}

function toggleVisibilityRule(scope: 'page' | 'global') {
  if (!visibilityResult.value) {
    return
  }

  const selector = scope === 'page'
    ? visibilityResult.value.pageSelector
    : visibilityResult.value.globalSelector
  const existingRule = scope === 'page' ? currentPageVisibilityRule.value : globalVisibilityRule.value

  if (existingRule) {
    removeMatchingRule(selector, scope, scope === 'page' ? currentPath.value : null)
    visibilityNotice.value = scope === 'page'
      ? 'Элемент снова включён на текущей странице.'
      : 'Элемент снова включён на всех страницах.'
    return
  }

  addVisibilityRule({
    selector,
    scope,
    path: scope === 'page' ? currentPath.value : null,
    label: getVisibilityLabel(visibilityResult.value.tag, visibilityResult.value.classes),
    tag: visibilityResult.value.tag,
    classes: visibilityResult.value.classes,
  })
  visibilityNotice.value = scope === 'page'
    ? 'Элемент скрыт только на текущем маршруте.'
    : 'Элемент скрыт глобально на всех страницах.'
}

function toggleVisibilityGroupRule(type: 'class' | 'component') {
  if (!visibilityResult.value) {
    return
  }

  const isClass = type === 'class'
  const selector = isClass ? visibilityResult.value.classSelector : visibilityResult.value.componentSelector
  const label = isClass ? visibilityResult.value.className : visibilityResult.value.componentName
  const existingRule = isClass ? classVisibilityRule.value : componentVisibilityRule.value

  if (!selector) {
    visibilityNotice.value = isClass
      ? 'У выбранного элемента нет подходящего класса для массового скрытия.'
      : 'Ближайший Vue-компонент не найден, массовое скрытие недоступно.'
    return
  }

  if (existingRule) {
    removeMatchingRule(selector, 'global')
    visibilityNotice.value = isClass
      ? `Все элементы класса ${label} снова показаны.`
      : `Компонент ${label} снова показан на всех страницах.`
    return
  }

  addVisibilityRule({
    selector,
    scope: 'global',
    label: isClass ? `класс ${label}` : `компонент ${label}`,
    tag: visibilityResult.value.tag,
    classes: visibilityResult.value.classes,
  })
  visibilityNotice.value = isClass
    ? `Все элементы класса ${label} скрыты глобально.`
    : `Компонент ${label} скрыт глобально на всех страницах.`
}

function toggleVisibilityMode() {
  if (!designPanelModules.value.elementVisibility) {
    return
  }

  if (visibilityMode.value) {
    disableVisibilityMode()
  } else {
    enableVisibilityMode()
  }
}

function enableVisibilityMode() {
  if (!designPanelModules.value.elementVisibility) {
    return
  }

  if (inspectMode.value) {
    disableInspect()
  }
  if (compMode.value) {
    toggleComp()
  }

  visibilityMode.value = true
  visibilityResult.value = null
  visibilityNotice.value = ''
  document.addEventListener('mousemove', onVisibilityMove, true)
  document.addEventListener('click', onVisibilityClick, true)
  document.body.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27%3E%3Ccircle cx=%2712%27 cy=%2712%27 r=%2710%27 fill=%27none%27 stroke=%27%23ff6b57%27 stroke-width=%271.5%27 stroke-dasharray=%273 2%27 opacity=%270.9%27/%3E%3Cpath d=%27M5 12h14%27 stroke=%27%23ff6b57%27 stroke-width=%271.2%27 stroke-linecap=%27round%27/%3E%3Cpath d=%27M12 5v14%27 stroke=%27%23ff6b57%27 stroke-width=%271.2%27 stroke-linecap=%27round%27 opacity=%270.45%27/%3E%3Cpath d=%27M7 7l10 10%27 stroke=%27%23ff6b57%27 stroke-width=%271.5%27 stroke-linecap=%27round%27/%3E%3C/svg%3E") 12 12, crosshair'
}

function disableVisibilityMode() {
  visibilityMode.value = false
  visibilityHover.visible = false
  visibilityResult.value = null
  visibilityNotice.value = ''
  document.removeEventListener('mousemove', onVisibilityMove, true)
  document.removeEventListener('click', onVisibilityClick, true)
  document.body.style.cursor = ''
}

/* ══════════════════════════════════════════════════════
   PUSH MODE — ResizeObserver sets --dp-panel-h on :root
   ══════════════════════════════════════════════════════ */
const panelEl = ref<HTMLElement | null>(null)
let panelRO: ResizeObserver | null = null

function onOutsideClick(e: MouseEvent) {
  const t = e.target as HTMLElement
  if (panelEl.value?.contains(t)) return
  if (t.closest?.('.dp-topbar') || t.closest?.('.dp-wrap')) return
  open.value = false
}

watch(open, (v) => {
  if (v) {
    nextTick(() => {
      if (panelEl.value) {
        panelRO = new ResizeObserver((entries) => {
          const h = entries[0]?.contentRect.height ?? 0
          // 28px топбар + высота раскрытой панели
          document.documentElement.style.setProperty('--dp-panel-h', (28 + h) + 'px')
        })
        panelRO.observe(panelEl.value)
      }
      document.addEventListener('mousedown', onOutsideClick, true)
    })
  } else {
    panelRO?.disconnect()
    panelRO = null
    // При закрытии — топбар остаётся, возвращаем 28px
    document.documentElement.style.setProperty('--dp-panel-h', '28px')
    document.removeEventListener('mousedown', onOutsideClick, true)
  }
})

/* ══════════════════════════════════════════════════════
   COMPONENT INSPECTOR — hover shows Vue component + path
   ══════════════════════════════════════════════════════ */
const compMode = ref(false)
const compHover = reactive({ visible: false, x: 0, y: 0, name: '', path: '', link: '', rect: { x: 0, y: 0, w: 0, h: 0 } })

interface CompResult { name: string; path: string; link: string; copied: boolean; x: number; y: number }
const compResult = ref<CompResult | null>(null)

const compHighlightStyle = computed(() => ({
  left: `${compHover.rect.x}px`, top: `${compHover.rect.y}px`,
  width: `${compHover.rect.w}px`, height: `${compHover.rect.h}px`,
}))

const compTooltipStyle = computed(() => {
  const ox = compHover.x + 18
  const overflow = ox + 240 > window.innerWidth
  return {
    left: overflow ? `${compHover.x - 248}px` : `${ox}px`,
    top: `${Math.max(36, compHover.y - 14)}px`,
  }
})

const compResultStyle = computed(() => {
  if (!compResult.value) return {}
  const cx = Math.min(compResult.value.x, window.innerWidth - 260)
  const cy = Math.min(compResult.value.y + 20, window.innerHeight - 130)
  return { left: `${Math.max(8, cx)}px`, top: `${cy}px` }
})

/* ── Detect navigation target (href / to / router-link) ── */
function getElementLink(el: HTMLElement): string {
  // 1. Direct <a href>
  const anchor = el.closest('a[href]') as HTMLAnchorElement | null
  if (anchor) {
    const href = anchor.getAttribute('href') || ''
    if (href && href !== '#') return href
  }
  // 2. NuxtLink / RouterLink — check 'to' prop via href on rendered <a>
  const nuxtLink = el.closest('a.router-link-active, a[href]') as HTMLAnchorElement | null
  if (nuxtLink && nuxtLink !== anchor) {
    const href = nuxtLink.getAttribute('href') || ''
    if (href && href !== '#') return href
  }
  // 3. Check for data-href or data-to attributes
  const dataEl = el.closest('[data-href], [data-to]') as HTMLElement | null
  if (dataEl) {
    return dataEl.dataset.href || dataEl.dataset.to || ''
  }
  // 4. Button with onclick navigating — check parent links
  let parent: HTMLElement | null = el
  while (parent && parent !== document.body) {
    if (parent.tagName === 'A') {
      const href = parent.getAttribute('href') || ''
      if (href && href !== '#') return href
    }
    // Vue router-link renders as <a>, check href
    if (parent.hasAttribute('href')) {
      const href = parent.getAttribute('href') || ''
      if (href && href !== '#' && href !== 'javascript:void(0)') return href
    }
    parent = parent.parentElement
  }
  return ''
}

function getVueComponent(el: HTMLElement): { name: string; path: string } {
  const SKIP = new Set([
    'Transition', 'TransitionGroup', 'KeepAlive', 'Suspense', 'Teleport',
    'RouterView', 'NuxtLink', 'RouterLink', 'App', 'Anonymous',
    'UIDesignPanel', 'NuxtPage', 'NuxtLayout',
  ])

  // ── 1. data-comp-name — stamped by comp-inspector plugin (works in production)
  const stamped = (el.closest('[data-comp-name]') as HTMLElement | null)
  if (stamped?.dataset.compName && !SKIP.has(stamped.dataset.compName)) {
    const name = stamped.dataset.compName
    const path = stamped.dataset.compFile || `app/components/${name}.vue`
    return { name, path }
  }

  // ── 2. __vueParentComponent — available in dev / SSR hydrated DOM
  let domEl: Element | null = el
  while (domEl && domEl !== document.body) {
    let node: any = (domEl as any).__vueParentComponent
    while (node) {
      const name: string = node.type?.__name || node.type?.name || ''
      if (name && !SKIP.has(name)) {
        const file: string = node.type?.__file || ''
        const path = file ? file.replace(/^.*?(app\/.*)$/, '$1') : `app/components/${name}.vue`
        return { name, path }
      }
      node = node.parent
    }
    domEl = domEl.parentElement
  }

  // ── 3. Fallback: DOM identity so the card always appears
  const tag = el.tagName.toLowerCase()
  const cls = Array.from(el.classList).filter(c => !c.startsWith('dp-') && !c.startsWith('nuxt')).slice(0, 3).join('.')
  return { name: cls ? `.${cls}` : `<${tag}>`, path: `(DOM: ${tag})` }
}

function onCompMove(e: MouseEvent) {
  if (compResult.value) return
  const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
  if (!el || el.closest('.dp-comp-layer') || el.closest('.dp-topbar')) { compHover.visible = false; return }
  const info = getVueComponent(el)
  const link = getElementLink(el)
  const rect = el.getBoundingClientRect()
  compHover.rect = { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
  compHover.x = e.clientX; compHover.y = e.clientY
  compHover.name = info.name; compHover.path = info.path
  compHover.link = link
  compHover.visible = true
}

function onCompClick(e: MouseEvent) {
  const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
  if (!el || el.closest('.dp-comp-layer') || el.closest('.dp-topbar')) return
  e.preventDefault(); e.stopPropagation()
  const info = getVueComponent(el)
  const link = getElementLink(el)
  compResult.value = { ...info, link, copied: false, x: e.clientX, y: e.clientY }
  compHover.visible = false
}

function copyCompResult() {
  if (!compResult.value) return
  const parts = [compResult.value.name, compResult.value.path]
  if (compResult.value.link) parts.push(`→ ${compResult.value.link}`)
  navigator.clipboard.writeText(parts.join('\n'))
  compResult.value.copied = true
  setTimeout(() => { if (compResult.value) compResult.value.copied = false }, 2000)
}

function toggleComp() {
  if (!designPanelModules.value.componentInspector) {
    return
  }
  if (compMode.value) {
    compMode.value = false; compHover.visible = false; compResult.value = null
    document.removeEventListener('mousemove', onCompMove, true)
    document.removeEventListener('click', onCompClick, true)
    document.body.style.cursor = ''
  } else {
    if (inspectMode.value) {
      disableInspect()
    }
    if (visibilityMode.value) {
      disableVisibilityMode()
    }
    compMode.value = true; compResult.value = null
    document.addEventListener('mousemove', onCompMove, true)
    document.addEventListener('click', onCompClick, true)
    document.body.style.cursor = 'crosshair'
  }
}

/* ── Keyboard ────────────────────────────────────── */
function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  const targetTag = target?.tagName?.toLowerCase?.() || ''
  const targetEditable = target?.isContentEditable || ['input', 'textarea', 'select'].includes(targetTag)
  if (aspAlignMode.value && alignResult.value && !targetEditable && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault()
    const step = e.altKey ? 1 : ALIGN_GRID
    const currentRule = alignScope.value === 'global'
      ? findAlignmentRule(alignResult.value.globalSelector, 'global')
      : findAlignmentRule(alignResult.value.pageSelector, 'page', alignmentPath.value)
    const nextX = (currentRule?.x || 0) + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0)
    const nextY = (currentRule?.y || 0) + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0)
    const selector = alignScope.value === 'global' ? alignResult.value.globalSelector : alignResult.value.pageSelector
    setRulePosition({
      selector,
      scope: alignScope.value,
      path: alignScope.value === 'page' ? alignmentPath.value : null,
      label: alignResult.value.classes || alignResult.value.tag,
      tag: alignResult.value.tag,
      classes: alignResult.value.classes,
      x: nextX,
      y: nextY,
      width: currentRule?.width ?? Math.round(alignResult.value.rect.w),
      height: currentRule?.height ?? Math.round(alignResult.value.rect.h),
    })
    alignResult.value.rect = {
      x: alignResult.value.rect.x + (nextX - (currentRule?.x || 0)),
      y: alignResult.value.rect.y + (nextY - (currentRule?.y || 0)),
      w: currentRule?.width ?? alignResult.value.rect.w,
      h: currentRule?.height ?? alignResult.value.rect.h,
    }
    return
  }
  if (e.key === 'Escape' && aspAlignMode.value) { disableAlignMode(); return }
  if (e.key === 'Escape' && compMode.value) { toggleComp(); return }
  if (e.key === 'Escape' && visibilityMode.value) { disableVisibilityMode(); return }
  if (e.key === 'Escape' && inspectMode.value) { disableInspect(); return }
  if (e.key === 'Escape' && open.value) { open.value = false; return }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && open.value) { e.preventDefault(); undo() }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y' && open.value) { e.preventDefault(); redo() }
}
onMounted(() => {
  document.addEventListener('keydown', onKey)
  // Топбар всегда занимает 28px → header должен учитывать это сразу
  document.documentElement.style.setProperty('--dp-panel-h', '28px')
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('mousedown', onOutsideClick, true)
  if (aspAlignMode.value) disableAlignMode()
  if (inspectMode.value) disableInspect()
  if (visibilityMode.value) disableVisibilityMode()
  if (compMode.value) toggleComp()
  panelRO?.disconnect()
  document.documentElement.style.setProperty('--dp-panel-h', '0px')
})
</script>
