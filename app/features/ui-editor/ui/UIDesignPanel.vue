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
                class="dp-mode-btn"
                :class="{ 'dp-mode-btn--active': activeModeSlug === 'concept-glass' }"
                @click="switchMode('concept-glass')"
                title="Жидкое стекло: blur, глубина, мягкий хром, pill-формы"
              >
                <span class="dp-mode-icon">❖</span>
                <span class="dp-mode-name">Жидкое стекло</span>
                <span class="dp-mode-hint">apple · blur · depth</span>
              </button>
              <button
                type="button"
                class="dp-mode-btn"
                :class="{ 'dp-mode-btn--active': activeModeSlug === 'concept-minale' }"
                @click="switchMode('concept-minale')"
                title="Брутализм / Minale + Mann — чёрный фон, белый текст, uppercase, hairlines"
              >
                <span class="dp-mode-icon">◼</span>
                <span class="dp-mode-name">Брутализм / Minale</span>
                <span class="dp-mode-hint">black · tracked · primary</span>
              </button>
              <button
                type="button"
                class="dp-mode-btn"
                :class="{ 'dp-mode-btn--active': activeModeSlug === 'concept-m3' }"
                @click="switchMode('concept-m3')"
                title="Material 3 — тональные поверхности, скруглённые формы, тени"
              >
                <span class="dp-mode-icon">⨁</span>
                <span class="dp-mode-name">Material 3</span>
                <span class="dp-mode-hint">google · tonal · pill</span>
              </button>
              <button
                type="button"
                class="dp-mode-btn dp-mode-btn--reset"
                :class="{ 'dp-mode-btn--active': activeModeSlug === 'concept-minale' }"
                @click="clearMode()"
                title="Вернуть режим по умолчанию — Брутализм / Minale"
              >
                <span class="dp-mode-icon">○</span>
                <span class="dp-mode-name">По умолчанию</span>
                <span class="dp-mode-hint">brutalist · default</span>
              </button>
            </div>

            <!-- ── Export/Import drawer ── -->
            <UIDesignExportDrawer
              :show="showExport"
              :tab="exportTab"
              :copy-label="copyLabel"
              :import-error="importError"
              :export-json="exportJSON"
              :export-css="exportCSS"
              @update:tab="(v: 'json' | 'css') => exportTab = v"
              @update:import-buffer="(v: string) => importBuffer = v"
              @copy="copyExport"
              @import="doImport"
            />

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

              <!-- ═══ Рецепты дизайна ═══ -->
              <div v-show="isTabVisible('presets')" class="dp-page">
                <div class="dp-presets-grid">
                  <button
                    v-for="p in DESIGN_PRESETS" :key="p.id" type="button"
                    class="dp-preset-card" :class="{ 'dp-preset-card--active': activePresetId === p.id }"
                    @click="pickPreset(p)"
                  >
                    <span class="dp-preset-icon">{{ p.icon }}</span>
                    <span class="dp-preset-name">{{ p.name }}</span>
                    <span class="dp-preset-desc">{{ p.description }}</span>
                  </button>
                </div>
              </div>

              <!-- ═══ Концепция дизайна ═══ -->
              <div v-show="isTabVisible('concept')" class="dp-page">
                <p class="dp-concept-intro">Целостная концепция — меняет всё: цвета, типографику, анимацию, плотность, архитектуру UI.</p>
                <div class="dp-concepts-grid">
                  <button
                    v-for="c in DESIGN_CONCEPTS" :key="c.id" type="button"
                    class="dp-concept-card" :class="{ 'dp-concept-card--active': activePresetId === c.id }"
                    @click="pickPreset(c)"
                  >
                    <span class="dp-concept-icon">{{ c.icon }}</span>
                    <div class="dp-concept-body">
                      <span class="dp-concept-name">{{ c.name }}</span>
                      <span class="dp-concept-desc">{{ c.description }}</span>
                    </div>
                  </button>
                </div>
              </div>

              <!-- ═══ Палитра ═══ -->
              <div v-show="isTabVisible('palette')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Цветовые темы</div>
                  <div class="dp-swatch-grid">
                    <button v-for="t in UI_THEMES" :key="t.id" type="button"
                      class="dp-swatch-btn" :class="{ 'dp-swatch-btn--active': themeId === t.id }"
                      @click="pickTheme(t.id)">
                      <span class="dp-swatch" :style="{ background: isDark ? t.swatchDark : t.swatch }" />
                      <span class="dp-swatch-name">{{ t.label }}</span>
                    </button>
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Акцентный цвет</div>
                  <div class="dp-accent-preview-big" :style="{ background: accentColor }" />
                  <div class="dp-field" style="margin-top:10px">
                    <label class="dp-label">H <span class="dp-val">{{ tokens.accentHue }}°</span></label>
                    <input type="range" min="0" max="360" step="1" :value="tokens.accentHue" class="dp-range dp-range--hue" @input="onRange('accentHue', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">S <span class="dp-val">{{ tokens.accentSaturation }}%</span></label>
                    <input type="range" min="0" max="100" step="1" :value="tokens.accentSaturation" class="dp-range" @input="onRange('accentSaturation', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">L <span class="dp-val">{{ tokens.accentLightness }}%</span></label>
                    <input type="range" min="20" max="80" step="1" :value="tokens.accentLightness" class="dp-range" @input="onRange('accentLightness', $event)">
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Статусы</div>
                  <div class="dp-status-row">
                    <span class="dp-status-dot" :style="{background:`hsl(${tokens.successHue},${tokens.successSaturation}%,45%)`}"/>
                    <span class="dp-status-name">успех / выполнено</span>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">H <span class="dp-val">{{ tokens.successHue }}°</span></label>
                    <input type="range" min="0" max="360" step="1" :value="tokens.successHue" class="dp-range dp-range--hue" @input="onRange('successHue', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">S <span class="dp-val">{{ tokens.successSaturation }}%</span></label>
                    <input type="range" min="0" max="100" step="1" :value="tokens.successSaturation" class="dp-range" @input="onRange('successSaturation', $event)">
                  </div>
                  <div class="dp-status-row" style="margin-top:10px">
                    <span class="dp-status-dot" :style="{background:`hsl(${tokens.warningHue},${tokens.warningSaturation}%,50%)`}"/>
                    <span class="dp-status-name">в работе / ожидание</span>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">H <span class="dp-val">{{ tokens.warningHue }}°</span></label>
                    <input type="range" min="0" max="360" step="1" :value="tokens.warningHue" class="dp-range dp-range--hue" @input="onRange('warningHue', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">S <span class="dp-val">{{ tokens.warningSaturation }}%</span></label>
                    <input type="range" min="0" max="100" step="1" :value="tokens.warningSaturation" class="dp-range" @input="onRange('warningSaturation', $event)">
                  </div>
                  <div class="dp-status-row" style="margin-top:10px">
                    <span class="dp-status-dot" :style="{background:`hsl(${tokens.errorHue},${tokens.errorSaturation}%,50%)`}"/>
                    <span class="dp-status-name">ошибка / отмена</span>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">H <span class="dp-val">{{ tokens.errorHue }}°</span></label>
                    <input type="range" min="0" max="360" step="1" :value="tokens.errorHue" class="dp-range dp-range--hue" @input="onRange('errorHue', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">S <span class="dp-val">{{ tokens.errorSaturation }}%</span></label>
                    <input type="range" min="0" max="100" step="1" :value="tokens.errorSaturation" class="dp-range" @input="onRange('errorSaturation', $event)">
                  </div>
                </div>
              </div>

              <!-- ═══ Палитра — цвета всех элементов ═══ -->
              <div v-show="isTabVisible('palette')" class="dp-page dp-palette-colors">
                <div class="dp-palette-colors-title">Цвета элементов</div>

                <!-- Строка 1: Фоны -->
                <div class="dp-clr-group">
                  <div class="dp-clr-group-label">Фоны</div>
                  <div class="dp-clr-chips">
                    <div class="dp-clr-chip">
                      <div class="dp-clr-chip-swatch" :style="{ background: tokens.colorPageBg || 'var(--glass-page-bg, #f3f4f6)' }" />
                      <label class="dp-clr-chip-label">страница</label>
                      <input type="color" class="dp-clr-chip-input" :value="colorInputValue(tokens.colorPageBg, '#f3f4f6')" @input="set('colorPageBg', ($event.target as HTMLInputElement).value)">
                      <button v-if="tokens.colorPageBg" type="button" class="dp-clr-chip-reset" @click="set('colorPageBg', '')">✕</button>
                    </div>
                    <div class="dp-clr-chip">
                      <div class="dp-clr-chip-swatch" :style="{ background: tokens.colorSurface || 'var(--glass-bg, rgba(255,255,255,.5))' }" />
                      <label class="dp-clr-chip-label">карточки</label>
                      <input type="color" class="dp-clr-chip-input" :value="colorInputValue(tokens.colorSurface, '#ffffff')" @input="set('colorSurface', ($event.target as HTMLInputElement).value)">
                      <button v-if="tokens.colorSurface" type="button" class="dp-clr-chip-reset" @click="set('colorSurface', '')">✕</button>
                    </div>
                    <div class="dp-clr-chip">
                      <div class="dp-clr-chip-swatch" :style="{ background: tokens.colorNavBg || 'var(--ds-nav-bg, var(--glass-bg, rgba(255,255,255,.4)))' }" />
                      <label class="dp-clr-chip-label">навигация</label>
                      <input type="color" class="dp-clr-chip-input" :value="colorInputValue(tokens.colorNavBg, '#ffffff')" @input="set('colorNavBg', ($event.target as HTMLInputElement).value)">
                      <button v-if="tokens.colorNavBg" type="button" class="dp-clr-chip-reset" @click="set('colorNavBg', '')">✕</button>
                    </div>
                    <div class="dp-clr-chip">
                      <div class="dp-clr-chip-swatch" :style="{ background: tokens.colorCardBg || 'var(--ds-card-bg, var(--glass-bg, rgba(255,255,255,.5)))' }" />
                      <label class="dp-clr-chip-label">модальные</label>
                      <input type="color" class="dp-clr-chip-input" :value="colorInputValue(tokens.colorCardBg, '#ffffff')" @input="set('colorCardBg', ($event.target as HTMLInputElement).value)">
                      <button v-if="tokens.colorCardBg" type="button" class="dp-clr-chip-reset" @click="set('colorCardBg', '')">✕</button>
                    </div>
                    <div class="dp-clr-chip">
                      <div class="dp-clr-chip-swatch" :style="{ background: tokens.colorBorder || 'var(--glass-border, rgba(180,180,220,.2))' }" />
                      <label class="dp-clr-chip-label">границы</label>
                      <input type="color" class="dp-clr-chip-input" :value="colorInputValue(tokens.colorBorder, '#b4b4dc')" @input="set('colorBorder', ($event.target as HTMLInputElement).value)">
                      <button v-if="tokens.colorBorder" type="button" class="dp-clr-chip-reset" @click="set('colorBorder', '')">✕</button>
                    </div>
                  </div>
                </div>

                <!-- Строка 2: Текст -->
                <div class="dp-clr-group">
                  <div class="dp-clr-group-label">Текст</div>
                  <div class="dp-clr-chips">
                    <div class="dp-clr-chip">
                      <div class="dp-clr-chip-swatch" :style="{ background: tokens.colorText || 'var(--glass-text, #1f1f1f)' }" />
                      <label class="dp-clr-chip-label">основной</label>
                      <input type="color" class="dp-clr-chip-input" :value="colorInputValue(tokens.colorText, '#1f1f1f')" @input="set('colorText', ($event.target as HTMLInputElement).value)">
                      <button v-if="tokens.colorText" type="button" class="dp-clr-chip-reset" @click="set('colorText', '')">✕</button>
                    </div>
                    <div class="dp-clr-chip">
                      <div class="dp-clr-chip-swatch" :style="{ background: tokens.colorHeading || 'var(--ds-heading-color, var(--glass-text, #1f1f1f))' }" />
                      <label class="dp-clr-chip-label">заголовки</label>
                      <input type="color" class="dp-clr-chip-input" :value="colorInputValue(tokens.colorHeading, '#1f1f1f')" @input="set('colorHeading', ($event.target as HTMLInputElement).value)">
                      <button v-if="tokens.colorHeading" type="button" class="dp-clr-chip-reset" @click="set('colorHeading', '')">✕</button>
                    </div>
                    <div class="dp-clr-chip">
                      <div class="dp-clr-chip-swatch" :style="{ background: tokens.colorMuted || 'var(--ds-muted, #888)' }" />
                      <label class="dp-clr-chip-label">второстепенный</label>
                      <input type="color" class="dp-clr-chip-input" :value="colorInputValue(tokens.colorMuted, '#888888')" @input="set('colorMuted', ($event.target as HTMLInputElement).value)">
                      <button v-if="tokens.colorMuted" type="button" class="dp-clr-chip-reset" @click="set('colorMuted', '')">✕</button>
                    </div>
                    <div class="dp-clr-chip">
                      <div class="dp-clr-chip-swatch" :style="{ background: tokens.colorLink || 'var(--ds-link-color, #3b6bdb)' }" />
                      <label class="dp-clr-chip-label">ссылки</label>
                      <input type="color" class="dp-clr-chip-input" :value="colorInputValue(tokens.colorLink, '#3b6bdb')" @input="set('colorLink', ($event.target as HTMLInputElement).value)">
                      <button v-if="tokens.colorLink" type="button" class="dp-clr-chip-reset" @click="set('colorLink', '')">✕</button>
                    </div>
                  </div>
                </div>

                <!-- Строка 3: Интерактивные элементы -->
                <div class="dp-clr-group">
                  <div class="dp-clr-group-label">Интерактивные элементы</div>
                  <div class="dp-clr-chips">
                    <div class="dp-clr-chip">
                      <div class="dp-clr-chip-swatch" :style="{ background: tokens.colorBtnBg || 'var(--btn-bg-base, rgba(0,0,0,.07))' }" />
                      <label class="dp-clr-chip-label">кнопка (фон)</label>
                      <input type="color" class="dp-clr-chip-input" :value="colorInputValue(tokens.colorBtnBg, '#000000')" @input="set('colorBtnBg', ($event.target as HTMLInputElement).value)">
                      <button v-if="tokens.colorBtnBg" type="button" class="dp-clr-chip-reset" @click="set('colorBtnBg', '')">✕</button>
                    </div>
                    <div class="dp-clr-chip">
                      <div class="dp-clr-chip-swatch" :style="{ background: tokens.colorBtnText || 'var(--btn-color, var(--glass-text, #1f1f1f))' }" />
                      <label class="dp-clr-chip-label">кнопка (текст)</label>
                      <input type="color" class="dp-clr-chip-input" :value="colorInputValue(tokens.colorBtnText, '#1f1f1f')" @input="set('colorBtnText', ($event.target as HTMLInputElement).value)">
                      <button v-if="tokens.colorBtnText" type="button" class="dp-clr-chip-reset" @click="set('colorBtnText', '')">✕</button>
                    </div>
                    <div class="dp-clr-chip">
                      <div class="dp-clr-chip-swatch" :style="{ background: tokens.colorInputBg || 'var(--input-bg, rgba(0,0,0,.04))' }" />
                      <label class="dp-clr-chip-label">поле ввода</label>
                      <input type="color" class="dp-clr-chip-input" :value="colorInputValue(tokens.colorInputBg, '#f5f5f5')" @input="set('colorInputBg', ($event.target as HTMLInputElement).value)">
                      <button v-if="tokens.colorInputBg" type="button" class="dp-clr-chip-reset" @click="set('colorInputBg', '')">✕</button>
                    </div>
                    <div class="dp-clr-chip">
                      <div class="dp-clr-chip-swatch" :style="{ background: tokens.colorTagBg || 'var(--ds-tag-bg, var(--chip-bg, rgba(0,0,0,.06)))' }" />
                      <label class="dp-clr-chip-label">тег (фон)</label>
                      <input type="color" class="dp-clr-chip-input" :value="colorInputValue(tokens.colorTagBg, '#e5e7eb')" @input="set('colorTagBg', ($event.target as HTMLInputElement).value)">
                      <button v-if="tokens.colorTagBg" type="button" class="dp-clr-chip-reset" @click="set('colorTagBg', '')">✕</button>
                    </div>
                    <div class="dp-clr-chip">
                      <div class="dp-clr-chip-swatch" :style="{ background: tokens.colorTagText || 'var(--ds-tag-color, var(--glass-text, #1f1f1f))' }" />
                      <label class="dp-clr-chip-label">тег (текст)</label>
                      <input type="color" class="dp-clr-chip-input" :value="colorInputValue(tokens.colorTagText, '#374151')" @input="set('colorTagText', ($event.target as HTMLInputElement).value)">
                      <button v-if="tokens.colorTagText" type="button" class="dp-clr-chip-reset" @click="set('colorTagText', '')">✕</button>
                    </div>
                  </div>
                </div>

                <!-- Кнопка сброса всех цветов -->
                <button type="button" class="dp-sm-btn dp-sm-btn--warn" style="margin-top:8px"
                  @click="[set('colorPageBg',''), set('colorSurface',''), set('colorBorder',''), set('colorText',''), set('colorHeading',''), set('colorLink',''), set('colorBtnBg',''), set('colorBtnText',''), set('colorNavBg',''), set('colorMuted',''), set('colorInputBg',''), set('colorTagBg',''), set('colorTagText',''), set('colorCardBg','')]">
                  ↺ сбросить все цвета элементов
                </button>
              </div>

              <!-- ═══ Цвета элементов ═══ -->
              <div v-show="isTabVisible('colors')" class="dp-page dp-page--cols">
                <!-- Колонка 1: Фоны -->
                <div class="dp-col">
                  <div class="dp-col-label">Фоны</div>
                  <div class="dp-field">
                    <label class="dp-label">страница <button v-if="tokens.colorPageBg" type="button" class="dp-clr-reset" @click="set('colorPageBg', '')" title="Сбросить">✕</button></label>
                    <div class="dp-clr-row">
                      <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorPageBg, '#f3f4f6')" @input="set('colorPageBg', ($event.target as HTMLInputElement).value)">
                      <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorPageBg }">{{ tokens.colorPageBg || 'авто' }}</span>
                    </div>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">поверхности / панели <button v-if="tokens.colorSurface" type="button" class="dp-clr-reset" @click="set('colorSurface', '')" title="Сбросить">✕</button></label>
                    <div class="dp-clr-row">
                      <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorSurface, '#ffffff')" @input="set('colorSurface', ($event.target as HTMLInputElement).value)">
                      <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorSurface }">{{ tokens.colorSurface || 'авто' }}</span>
                    </div>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">границы / рамки <button v-if="tokens.colorBorder" type="button" class="dp-clr-reset" @click="set('colorBorder', '')" title="Сбросить">✕</button></label>
                    <div class="dp-clr-row">
                      <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorBorder, '#ffffff')" @input="set('colorBorder', ($event.target as HTMLInputElement).value)">
                      <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorBorder }">{{ tokens.colorBorder || 'авто' }}</span>
                    </div>
                  </div>
                  <div class="dp-type-ctx-hint" style="margin-top:4px">Прозрачность поверхностей и&nbsp;границ — вкладка <em>поверхности</em></div>
                </div>

                <!-- Колонка 2: Текст -->
                <div class="dp-col">
                  <div class="dp-col-label">Текст и ссылки</div>
                  <div class="dp-field">
                    <label class="dp-label">основной текст <button v-if="tokens.colorText" type="button" class="dp-clr-reset" @click="set('colorText', '')" title="Сбросить">✕</button></label>
                    <div class="dp-clr-row">
                      <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorText, '#1f1f1f')" @input="set('colorText', ($event.target as HTMLInputElement).value)">
                      <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorText }">{{ tokens.colorText || 'авто' }}</span>
                    </div>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">заголовки h1–h6 <button v-if="tokens.colorHeading" type="button" class="dp-clr-reset" @click="set('colorHeading', '')" title="Сбросить">✕</button></label>
                    <div class="dp-clr-row">
                      <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorHeading, '#1f1f1f')" @input="set('colorHeading', ($event.target as HTMLInputElement).value)">
                      <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorHeading }">{{ tokens.colorHeading || 'авто' }}</span>
                    </div>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">ссылки <button v-if="tokens.colorLink" type="button" class="dp-clr-reset" @click="set('colorLink', '')" title="Сбросить">✕</button></label>
                    <div class="dp-clr-row">
                      <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorLink, '#3b6bdb')" @input="set('colorLink', ($event.target as HTMLInputElement).value)">
                      <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorLink }">{{ tokens.colorLink || 'авто' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Колонка 3: Кнопки + превью -->
                <div class="dp-col">
                  <div class="dp-col-label">Кнопки</div>
                  <div class="dp-field">
                    <label class="dp-label">фон кнопки <button v-if="tokens.colorBtnBg" type="button" class="dp-clr-reset" @click="set('colorBtnBg', '')" title="Сбросить">✕</button></label>
                    <div class="dp-clr-row">
                      <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorBtnBg, '#000000')" @input="set('colorBtnBg', ($event.target as HTMLInputElement).value)">
                      <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorBtnBg }">{{ tokens.colorBtnBg || 'авто' }}</span>
                    </div>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">текст кнопки <button v-if="tokens.colorBtnText" type="button" class="dp-clr-reset" @click="set('colorBtnText', '')" title="Сбросить">✕</button></label>
                    <div class="dp-clr-row">
                      <input type="color" class="dp-color-input" :value="colorInputValue(tokens.colorBtnText, '#2c2c2a')" @input="set('colorBtnText', ($event.target as HTMLInputElement).value)">
                      <span class="dp-clr-hex" :class="{ 'dp-clr-hex--auto': !tokens.colorBtnText }">{{ tokens.colorBtnText || 'авто' }}</span>
                    </div>
                  </div>

                  <button type="button" class="dp-sm-btn dp-sm-btn--warn" style="margin-top:10px; width:100%"
                    :disabled="!tokens.colorPageBg && !tokens.colorSurface && !tokens.colorBorder && !tokens.colorText && !tokens.colorHeading && !tokens.colorLink && !tokens.colorBtnBg && !tokens.colorBtnText && !tokens.colorNavBg && !tokens.colorMuted && !tokens.colorInputBg && !tokens.colorTagBg && !tokens.colorTagText && !tokens.colorCardBg"
                    @click="[set('colorPageBg',''), set('colorSurface',''), set('colorBorder',''), set('colorText',''), set('colorHeading',''), set('colorLink',''), set('colorBtnBg',''), set('colorBtnText',''), set('colorNavBg',''), set('colorMuted',''), set('colorInputBg',''), set('colorTagBg',''), set('colorTagText',''), set('colorCardBg','')]">
                    ↺ сбросить все цвета
                  </button>

                  <div class="dp-col-label" style="margin-top:14px">Превью</div>
                  <div :style="{
                    background: tokens.colorPageBg || 'var(--glass-page-bg)',
                    border: '1px solid color-mix(in srgb, var(--glass-text) 12%, transparent)',
                    borderRadius: 'var(--card-radius, 14px)',
                    padding: '10px',
                    marginTop: '0',
                  }">
                    <div :style="{
                      background: tokens.colorSurface ? `rgba(${clrRgb(tokens.colorSurface)}, ${tokens.glassOpacity})` : 'var(--glass-bg)',
                      border: tokens.colorBorder ? `1px solid rgba(${clrRgb(tokens.colorBorder)}, ${tokens.glassBorderOpacity})` : '1px solid var(--glass-border)',
                      borderRadius: 'var(--card-radius-inner, 8px)',
                      padding: '8px 10px',
                      marginBottom: '6px',
                    }">
                      <div :style="{ fontSize: '.72rem', fontWeight: 700, marginBottom: '3px', color: tokens.colorHeading || 'var(--glass-text)' }">Заголовок</div>
                      <div :style="{ fontSize: '.65rem', color: tokens.colorText || 'var(--glass-text)', opacity: .85 }">Основной текст страницы</div>
                      <span :style="{ fontSize: '.65rem', color: tokens.colorLink || 'var(--ds-accent, var(--glass-text))' }">Ссылка →</span>
                    </div>
                    <button type="button" :style="{
                      background: tokens.colorBtnBg || 'var(--btn-bg-base, rgba(0,0,0,0.07))',
                      color: tokens.colorBtnText || 'var(--btn-color, var(--glass-text))',
                      border: '1px solid transparent',
                      borderRadius: 'var(--btn-radius, 4px)',
                      padding: '4px 10px',
                      fontSize: '.65rem',
                      fontFamily: 'inherit',
                      cursor: 'default',
                    }">Кнопка</button>
                  </div>
                </div>
              </div>

              <!-- ═══ Кнопки ═══ -->
              <div v-show="isTabVisible('buttons')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Стиль и вид</div>
                  <div class="dp-field">
                    <label class="dp-label">стиль</label>
                    <div class="dp-chip-picker">
                      <div class="dp-chip-pool">
                        <button
                          v-for="s in btnStyles"
                          :key="`btn-style-${s.id}`"
                          type="button"
                          class="dp-chip"
                          :class="{ 'dp-chip--active': String(tokens.btnStyle) === String(s.id) }"
                          @click="set('btnStyle', s.id)"
                        >{{ s.label }}</button>
                      </div>
                    </div>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">размер</label>
                    <div class="dp-chip-picker">
                      <div class="dp-chip-pool">
                        <button
                          v-for="s in btnSizes"
                          :key="`btn-size-${s.id}`"
                          type="button"
                          class="dp-chip"
                          :class="{ 'dp-chip--active': String(tokens.btnSize) === String(s.id) }"
                          @click="set('btnSize', s.id)"
                        >{{ s.label }}</button>
                      </div>
                    </div>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">регистр</label>
                    <div class="dp-chip-picker">
                      <div class="dp-chip-pool">
                        <button
                          v-for="s in textTransforms"
                          :key="`btn-transform-${s.id}`"
                          type="button"
                          class="dp-chip"
                          :class="{ 'dp-chip--active': String(tokens.btnTransform) === String(s.id) }"
                          @click="set('btnTransform', s.id)"
                        >{{ s.label }}</button>
                      </div>
                    </div>
                  </div>
                  <div class="dp-field" style="margin-top:8px">
                    <label class="dp-label">кинетика при наведении</label>
                    <div class="dp-chip-picker">
                      <div class="dp-chip-pool">
                        <button
                          v-for="s in btnHoverAnims"
                          :key="`btn-hover-${s.id}`"
                          type="button"
                          class="dp-chip"
                          :class="{ 'dp-chip--active': String(tokens.btnHoverAnim) === String(s.id) }"
                          @click="set('btnHoverAnim', s.id)"
                        >{{ s.label }}</button>
                      </div>
                    </div>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">карточки при наведении</label>
                    <div class="dp-chip-picker">
                      <div class="dp-chip-pool">
                        <button
                          v-for="s in cardHoverAnims"
                          :key="`card-hover-${s.id}`"
                          type="button"
                          class="dp-chip"
                          :class="{ 'dp-chip--active': String(tokens.cardHoverAnim) === String(s.id) }"
                          @click="set('cardHoverAnim', s.id)"
                        >{{ s.label }}</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Размеры</div>
                  <div class="dp-field">
                    <label class="dp-label">закругление <span class="dp-val">{{ tokens.btnRadius }}px</span></label>
                    <input type="range" min="0" max="32" step="1" :value="tokens.btnRadius" class="dp-range" @input="onRange('btnRadius', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">насыщенность <span class="dp-val">{{ tokens.btnWeight }}</span></label>
                    <input type="range" min="300" max="800" step="100" :value="tokens.btnWeight" class="dp-range" @input="onRange('btnWeight', $event)">
                  </div>
                  <div class="dp-col-label" style="margin-top:8px">Отступы</div>
                  <div class="dp-type-ctx-hint">0 = авто по размеру кнопки</div>
                  <div class="dp-field">
                    <label class="dp-label">отступ гор. <span class="dp-val">{{ tokens.btnPaddingH === 0 ? 'авто' : tokens.btnPaddingH + 'px' }}</span></label>
                    <input type="range" min="0" max="60" step="1" :value="tokens.btnPaddingH" class="dp-range" @input="onRange('btnPaddingH', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">отступ верт. <span class="dp-val">{{ tokens.btnPaddingV === 0 ? 'авто' : tokens.btnPaddingV + 'px' }}</span></label>
                    <input type="range" min="0" max="32" step="1" :value="tokens.btnPaddingV" class="dp-range" @input="onRange('btnPaddingV', $event)">
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Превью</div>
                  <div class="dp-live-preview" style="margin-top:0">
                    <div class="dp-btn-preview">
                      <button type="button" class="dp-demo-btn" :style="previewBtnStyle">Сохранить</button>
                      <button type="button" class="dp-demo-btn" :style="previewSmBtnStyle">Отмена</button>
                      <button type="button" class="dp-demo-btn" :style="previewGhostBtnStyle">Ещё</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ═══ Типографика ═══ -->
              <div v-show="isTabVisible('type')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Шрифт</div>
                  <div class="dp-font-grid">
                    <button v-for="f in FONT_OPTIONS" :key="f.id" type="button"
                      class="dp-font-btn" :class="{ 'dp-font-btn--active': currentFontId === f.id }"
                      :style="{ fontFamily: f.value }" @click="pickFont(f.id)">{{ f.label }}</button>
                  </div>
                </div>
                <div class="dp-col">
                  <!-- Переключатель контекста -->
                  <div class="dp-typo-ctx-tabs">
                    <button type="button" class="dp-typo-ctx-btn" :class="{'dp-typo-ctx-btn--active': typeCtx==='text'}" @click="typeCtx='text'">Текст</button>
                    <button type="button" class="dp-typo-ctx-btn" :class="{'dp-typo-ctx-btn--active': typeCtx==='headings'}" @click="typeCtx='headings'">Загол.</button>
                    <button type="button" class="dp-typo-ctx-btn" :class="{'dp-typo-ctx-btn--active': typeCtx==='buttons'}" @click="typeCtx='buttons'">Кнопки</button>
                    <button type="button" class="dp-typo-ctx-btn" :class="{'dp-typo-ctx-btn--active': typeCtx==='inputs'}" @click="typeCtx='inputs'">Поля</button>
                  </div>

                  <!-- Контекст: Текст -->
                  <template v-if="typeCtx === 'text'">
                    <div class="dp-field">
                      <label class="dp-label">размер <span class="dp-val">{{ (tokens.fontSize * 100).toFixed(0) }}%</span></label>
                      <input type="range" min="0.7" max="1.4" step="0.02" :value="tokens.fontSize" class="dp-range" @input="onFloat('fontSize', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">основной вес <span class="dp-val">{{ tokens.fontWeight }}</span></label>
                      <input type="range" min="300" max="700" step="100" :value="tokens.fontWeight" class="dp-range" @input="onRange('fontWeight', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">межбуквенный <span class="dp-val">{{ tokens.letterSpacing.toFixed(2) }}em</span></label>
                      <input type="range" min="-0.02" max="0.15" step="0.005" :value="tokens.letterSpacing" class="dp-range" @input="onFloat('letterSpacing', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">межстрочный <span class="dp-val">{{ tokens.lineHeight.toFixed(2) }}</span></label>
                      <input type="range" min="1.1" max="2.0" step="0.05" :value="tokens.lineHeight" class="dp-range" @input="onFloat('lineHeight', $event)">
                    </div>
                    <div class="dp-col-label" style="margin-top:8px">Абзацы</div>
                    <div class="dp-field">
                      <label class="dp-label">отступ между абз. <span class="dp-val">{{ tokens.paragraphSpacing.toFixed(2) }}rem</span></label>
                      <input type="range" min="0" max="2.5" step="0.05" :value="tokens.paragraphSpacing" class="dp-range" @input="onFloat('paragraphSpacing', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">межсловный <span class="dp-val">{{ tokens.wordSpacing === 0 ? 'авто' : tokens.wordSpacing.toFixed(2) + 'em' }}</span></label>
                      <input type="range" min="0" max="0.3" step="0.01" :value="tokens.wordSpacing" class="dp-range" @input="onFloat('wordSpacing', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">отступ 1-й строки <span class="dp-val">{{ tokens.textIndent === 0 ? 'нет' : tokens.textIndent.toFixed(1) + 'em' }}</span></label>
                      <input type="range" min="0" max="4" step="0.25" :value="tokens.textIndent" class="dp-range" @input="onFloat('textIndent', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">ширина абзаца <span class="dp-val">{{ tokens.paragraphMaxWidth === 0 ? '∞' : tokens.paragraphMaxWidth + 'ch' }}</span></label>
                      <input type="range" min="0" max="100" step="2" :value="tokens.paragraphMaxWidth" class="dp-range" @input="onRange('paragraphMaxWidth', $event)">
                    </div>
                  </template>

                  <!-- Контекст: Заголовки -->
                  <template v-else-if="typeCtx === 'headings'">
                    <div class="dp-field">
                      <label class="dp-label">вес заголовков <span class="dp-val">{{ tokens.headingWeight }}</span></label>
                      <input type="range" min="300" max="900" step="100" :value="tokens.headingWeight" class="dp-range" @input="onRange('headingWeight', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">межбуквенный <span class="dp-val">{{ tokens.headingLetterSpacing.toFixed(3) }}em</span></label>
                      <input type="range" min="-0.06" max="0.15" step="0.005" :value="tokens.headingLetterSpacing" class="dp-range" @input="onFloat('headingLetterSpacing', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">межстрочный <span class="dp-val">{{ tokens.headingLineHeight.toFixed(2) }}</span></label>
                      <input type="range" min="0.9" max="2.0" step="0.05" :value="tokens.headingLineHeight" class="dp-range" @input="onFloat('headingLineHeight', $event)">
                    </div>
                  </template>

                  <!-- Контекст: Кнопки -->
                  <template v-else-if="typeCtx === 'buttons'">
                    <div class="dp-type-ctx-hint">Типографика кнопок (стиль и отступы → таб «Кнопки»)</div>
                    <div class="dp-field">
                      <label class="dp-label">межбуквенный кнопок <span class="dp-val">{{ tokens.letterSpacing.toFixed(2) }}em</span></label>
                      <input type="range" min="-0.02" max="0.15" step="0.005" :value="tokens.letterSpacing" class="dp-range" @input="onFloat('letterSpacing', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">насыщенность <span class="dp-val">{{ tokens.btnWeight }}</span></label>
                      <input type="range" min="300" max="800" step="100" :value="tokens.btnWeight" class="dp-range" @input="onRange('btnWeight', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">регистр</label>
                      <div class="dp-chip-picker">
                        <div class="dp-chip-pool">
                          <button
                            v-for="s in textTransforms"
                            :key="`type-btn-transform-${s.id}`"
                            type="button"
                            class="dp-chip"
                            :class="{ 'dp-chip--active': String(tokens.btnTransform) === String(s.id) }"
                            @click="set('btnTransform', s.id)"
                          >{{ s.label }}</button>
                        </div>
                      </div>
                    </div>
                  </template>

                  <!-- Контекст: Поля ввода -->
                  <template v-else-if="typeCtx === 'inputs'">
                    <div class="dp-type-ctx-hint">Шрифт и отступы полей ввода</div>
                    <div class="dp-field">
                      <label class="dp-label">размер шрифта <span class="dp-val">{{ tokens.inputFontSize === 0 ? 'авто' : tokens.inputFontSize.toFixed(3) + 'rem' }}</span></label>
                      <input type="range" min="0" max="1.2" step="0.025" :value="tokens.inputFontSize" class="dp-range" @input="onFloat('inputFontSize', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">отступ гор. <span class="dp-val">{{ tokens.inputPaddingH }}px</span></label>
                      <input type="range" min="4" max="32" step="1" :value="tokens.inputPaddingH" class="dp-range" @input="onRange('inputPaddingH', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">отступ верт. <span class="dp-val">{{ tokens.inputPaddingV }}px</span></label>
                      <input type="range" min="2" max="24" step="1" :value="tokens.inputPaddingV" class="dp-range" @input="onRange('inputPaddingV', $event)">
                    </div>
                  </template>
                </div>

                <div class="dp-col">
                  <div class="dp-col-label">Превью</div>

                  <!-- Превью: Текст -->
                  <template v-if="typeCtx === 'text'">
                    <div class="dp-col-label" style="margin-top:0">Выравнивание</div>
                    <div class="dp-align-group">
                      <button type="button" class="dp-align-btn" :class="{ 'dp-align-btn--active': tokens.textAlign === 'left' }" title="По левому" @click="set('textAlign', 'left')">&#x2190;</button>
                      <button type="button" class="dp-align-btn" :class="{ 'dp-align-btn--active': tokens.textAlign === 'center' }" title="По центру" @click="set('textAlign', 'center')">&#x2630;</button>
                      <button type="button" class="dp-align-btn" :class="{ 'dp-align-btn--active': tokens.textAlign === 'right' }" title="По правому" @click="set('textAlign', 'right')">&#x2192;</button>
                      <button type="button" class="dp-align-btn" :class="{ 'dp-align-btn--active': tokens.textAlign === 'justify' }" title="По ширине" @click="set('textAlign', 'justify')">&#x2261;</button>
                    </div>
                    <div class="dp-live-preview" style="margin-top:8px">
                      <div class="dp-type-sample" :style="typeSampleStyle">
                        <div class="dp-type-h" :style="{ fontWeight: String(tokens.headingWeight), letterSpacing: tokens.headingLetterSpacing + 'em', lineHeight: String(tokens.headingLineHeight) }">Заголовок</div>
                        <div class="dp-type-p" :style="{ textIndent: tokens.textIndent > 0 ? tokens.textIndent + 'em' : undefined, wordSpacing: tokens.wordSpacing > 0 ? tokens.wordSpacing + 'em' : undefined, textAlign: tokens.textAlign }">Дизайн-система позволяет управлять каждым визуальным элементом.</div>
                      </div>
                    </div>
                  </template>

                  <!-- Превью: Заголовки -->
                  <template v-else-if="typeCtx === 'headings'">
                    <div class="dp-headings-preview" :style="{ fontFamily: tokens.fontFamily }">
                      <div v-for="(label, i) in ['Заголовок H1','Заголовок H2','Заголовок H3','Заголовок H4']" :key="i"
                        class="dp-heading-prev-item"
                        :style="{ fontWeight: String(tokens.headingWeight), letterSpacing: tokens.headingLetterSpacing + 'em', lineHeight: String(tokens.headingLineHeight), fontSize: [2.074, 1.728, 1.44, 1.2][i] * tokens.fontSize + 'rem' }">{{ label }}</div>
                    </div>
                  </template>

                  <!-- Превью: Кнопки -->
                  <template v-else-if="typeCtx === 'buttons'">
                    <div class="dp-btn-preview" style="flex-direction:column; gap:10px">
                      <span :style="previewBtnTypeStyle">Сохранить</span>
                      <span :style="previewSmBtnStyle">Отмена</span>
                      <span :style="previewGhostBtnStyle">Доп. действия</span>
                    </div>
                    <div class="dp-type-ctx-hint" style="margin-top:10px">Гор./верт. отступ и стиль — в табе Кнопки</div>
                  </template>

                  <!-- Превью: Поля -->
                  <template v-else-if="typeCtx === 'inputs'">
                    <div class="dp-inputs-preview">
                      <input type="text" readonly :style="previewInputStyle" placeholder="Имя клиента">
                      <input type="text" readonly :style="previewInputStyle" placeholder="Адрес объекта">
                      <textarea readonly :style="{...previewInputStyle, height: '56px', resize: 'none'}" placeholder="Описание проекта"></textarea>
                    </div>
                  </template>

                  <!-- Шкала шрифта (всегда) -->
                  <div class="dp-col-label" style="margin-top:12px">Шкала</div>
                  <div class="dp-scale-visual">
                    <div v-for="s in typeScaleSizes" :key="s.name" class="dp-scale-row" :style="{ fontSize: s.size + 'rem', fontFamily: tokens.fontFamily }">
                      <span class="dp-scale-name">{{ s.name }}</span>
                      <span class="dp-scale-sample">Аа</span>
                      <span class="dp-scale-px">{{ (s.size * 16).toFixed(0) }}px</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ═══ Поверхности ═══ -->
              <div v-show="isTabVisible('surface')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Стекло</div>
                  <div class="dp-field">
                    <label class="dp-label">размытие <span class="dp-val">{{ tokens.glassBlur }}px</span></label>
                    <input type="range" min="0" max="64" step="1" :value="tokens.glassBlur" class="dp-range" @input="onRange('glassBlur', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">насыщенность <span class="dp-val">{{ tokens.glassSaturation }}%</span></label>
                    <input type="range" min="0" max="300" step="5" :value="tokens.glassSaturation" class="dp-range" @input="onRange('glassSaturation', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">прозрачность <span class="dp-val">{{ pct(tokens.glassOpacity) }}</span></label>
                    <input type="range" min="0" max="1" step="0.02" :value="tokens.glassOpacity" class="dp-range" @input="onFloat('glassOpacity', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">обводка <span class="dp-val">{{ pct(tokens.glassBorderOpacity) }}</span></label>
                    <input type="range" min="0" max="0.5" step="0.01" :value="tokens.glassBorderOpacity" class="dp-range" @input="onFloat('glassBorderOpacity', $event)">
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Тени</div>
                  <div class="dp-field">
                    <label class="dp-label">тень Y <span class="dp-val">{{ tokens.shadowOffsetY }}px</span></label>
                    <input type="range" min="0" max="24" step="1" :value="tokens.shadowOffsetY" class="dp-range" @input="onRange('shadowOffsetY', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">размытие <span class="dp-val">{{ tokens.shadowBlurRadius }}px</span></label>
                    <input type="range" min="0" max="64" step="1" :value="tokens.shadowBlurRadius" class="dp-range" @input="onRange('shadowBlurRadius', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">spread <span class="dp-val">{{ tokens.shadowSpread }}px</span></label>
                    <input type="range" min="-8" max="8" step="1" :value="tokens.shadowSpread" class="dp-range" @input="onRange('shadowSpread', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">прозрачность <span class="dp-val">{{ pct(tokens.shadowOpacity) }}</span></label>
                    <input type="range" min="0" max="0.4" step="0.01" :value="tokens.shadowOpacity" class="dp-range" @input="onFloat('shadowOpacity', $event)">
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Превью</div>
                  <div class="dp-surface-demo" style="margin-top:0">
                    <div class="dp-surface-card" :style="surfaceStyle">
                      <div class="dp-surface-title">Карточка</div>
                      <div class="dp-surface-text">Пример поверхности с текущими настройками стекла и теней.</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ═══ Скругления ═══ -->
              <div v-show="isTabVisible('radii')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Радиусы</div>
                  <div class="dp-field">
                    <label class="dp-label">карточки <span class="dp-val">{{ tokens.cardRadius }}px</span></label>
                    <input type="range" min="0" max="32" step="1" :value="tokens.cardRadius" class="dp-range" @input="onRange('cardRadius', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">поля ввода <span class="dp-val">{{ tokens.inputRadius }}px</span></label>
                    <input type="range" min="0" max="20" step="1" :value="tokens.inputRadius" class="dp-range" @input="onRange('inputRadius', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">чипы <span class="dp-val">{{ tokens.chipRadius === 999 ? '∞' : tokens.chipRadius + 'px' }}</span></label>
                    <input type="range" min="0" max="999" step="1" :value="tokens.chipRadius" class="dp-range" @input="onRange('chipRadius', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">модальные <span class="dp-val">{{ tokens.modalRadius }}px</span></label>
                    <input type="range" min="0" max="28" step="1" :value="tokens.modalRadius" class="dp-range" @input="onRange('modalRadius', $event)">
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Отступы</div>
                  <div class="dp-field">
                    <label class="dp-label">базовый юнит <span class="dp-val">{{ tokens.spacingBase }}px</span></label>
                    <input type="range" min="2" max="12" step="1" :value="tokens.spacingBase" class="dp-range" @input="onRange('spacingBase', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">масштаб <span class="dp-val">{{ pct(tokens.spacingScale) }}</span></label>
                    <input type="range" min="0.6" max="1.8" step="0.05" :value="tokens.spacingScale" class="dp-range" @input="onFloat('spacingScale', $event)">
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Превью</div>
                  <div class="dp-radii-row">
                    <div class="dp-radii-box" :style="{ borderRadius: tokens.cardRadius + 'px' }">card</div>
                    <div class="dp-radii-box" :style="{ borderRadius: tokens.inputRadius + 'px' }">input</div>
                    <div class="dp-radii-box" :style="{ borderRadius: tokens.chipRadius + 'px' }">chip</div>
                    <div class="dp-radii-box" :style="{ borderRadius: tokens.modalRadius + 'px' }">modal</div>
                  </div>
                </div>
              </div>

              <!-- ═══ Анимация ═══ -->
              <div v-show="isTabVisible('anim')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Параметры</div>
                  <div class="dp-field">
                    <label class="dp-label">длительность <span class="dp-val">{{ tokens.animDuration }}ms</span></label>
                    <input type="range" min="0" max="600" step="10" :value="tokens.animDuration" class="dp-range" @input="onRange('animDuration', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">easing</label>
                    <div class="dp-chip-picker">
                      <div class="dp-chip-pool">
                        <button
                          v-for="e in EASING_OPTIONS"
                          :key="`anim-easing-${e.id}`"
                          type="button"
                          class="dp-chip"
                          :class="{ 'dp-chip--active': String(tokens.animEasing) === String(e.id) }"
                          @click="set('animEasing', e.id)"
                        >{{ e.label }}</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Превью</div>
                  <div class="dp-live-preview" style="margin-top:0">
                    <div class="dp-anim-demo">
                      <div class="dp-anim-ball"
                        :style="{ transitionDuration: tokens.animDuration + 'ms', transitionTimingFunction: tokens.animEasing }"
                        :class="{ 'dp-anim-ball--moved': animPlaying }" />
                      <button type="button" class="dp-sm-btn" @click="playAnim">▶ запуск</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ═══ Сетка и макет ═══ -->
              <div v-show="isTabVisible('grid')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Макет</div>
                  <div class="dp-field">
                    <label class="dp-label">контейнер <span class="dp-val">{{ tokens.containerWidth }}px</span></label>
                    <input type="range" min="900" max="1400" step="10" :value="tokens.containerWidth" class="dp-range" @input="onRange('containerWidth', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">сайдбар <span class="dp-val">{{ tokens.sidebarWidth }}px</span></label>
                    <input type="range" min="200" max="360" step="10" :value="tokens.sidebarWidth" class="dp-range" @input="onRange('sidebarWidth', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">gap <span class="dp-val">{{ tokens.gridGap }}px</span></label>
                    <input type="range" min="4" max="32" step="1" :value="tokens.gridGap" class="dp-range" @input="onRange('gridGap', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">колонки контента <span class="dp-val">{{ tokens.gridColumns }}</span></label>
                    <input type="range" min="2" max="12" step="1" :value="tokens.gridColumns" class="dp-range" @input="onRange('gridColumns', $event)">
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Генератор контента</div>
                  <div class="dp-field">
                    <label class="dp-label">раскладка контента <span class="dp-val">{{ activeContentLayoutLabel }}</span></label>
                    <div class="dp-chip-picker">
                      <div class="dp-chip-pool">
                        <button
                          v-for="preset in contentLayoutPresets"
                          :key="`content-layout-${preset.id}`"
                          type="button"
                          class="dp-chip"
                          :class="{ 'dp-chip--active': activeContentLayoutId === preset.id }"
                          @click="applyContentLayoutPreset(preset.id)"
                        >{{ preset.label }}</button>
                      </div>
                    </div>
                    <div class="dp-field-hint">Меняет ширину контейнера, число колонок, ритм секций и характер карточек в основной области.</div>
                  </div>
                  <div class="dp-field">
                    <div class="dp-menu-generator-actions">
                      <button type="button" class="dp-sm-btn" @click="generateContentLayout">сгенерировать</button>
                      <button type="button" class="dp-sm-btn" @click="applyContentLayoutPreset('balanced')">сбросить</button>
                    </div>
                  </div>
                  <div class="dp-content-preview">
                    <div class="dp-content-preview-shell" :style="contentPreviewStyle">
                      <div class="dp-content-preview-hero">
                        <div class="dp-content-preview-kicker">{{ activeContentLayoutLabel }}</div>
                        <div class="dp-content-preview-title">{{ activeContentLayoutDescription }}</div>
                      </div>
                      <div class="dp-content-preview-grid" :class="`dp-content-preview-grid--${tokens.archSectionStyle || 'flat'}`">
                        <article
                          v-for="card in contentPreviewCards"
                          :key="card.title"
                          class="dp-content-preview-card"
                          :class="{ 'dp-content-preview-card--accent': card.accent }"
                          :style="{ gridColumn: `span ${card.span}` }"
                        >
                          <div class="dp-content-preview-card-eyebrow">{{ card.eyebrow }}</div>
                          <div class="dp-content-preview-card-title">{{ card.title }}</div>
                          <div class="dp-content-preview-card-text">{{ card.text }}</div>
                        </article>
                      </div>
                    </div>
                  </div>
                  <div class="dp-col-label" style="margin-top:14px">Пресеты карточек</div>
                  <div class="dp-card-presets-grid">
                    <button
                      v-for="preset in contentCardPresets"
                      :key="`content-card-${preset.id}`"
                      type="button"
                      class="dp-card-preset"
                      :class="{ 'dp-card-preset--active': activeContentCardPresetId === preset.id }"
                      @click="applyContentCardPreset(preset.id)"
                    >
                      <span class="dp-card-preset-preview" :class="`dp-card-preset-preview--${preset.id}`">
                        <span class="dp-card-preset-preview-line dp-card-preset-preview-line--lg" />
                        <span class="dp-card-preset-preview-line" />
                        <span class="dp-card-preset-preview-line dp-card-preset-preview-line--sm" />
                      </span>
                      <span class="dp-card-preset-name">{{ preset.label }}</span>
                      <span class="dp-card-preset-desc">{{ preset.description }}</span>
                    </button>
                  </div>
                  <div class="dp-col-label" style="margin-top:14px">Сценические пресеты</div>
                  <div class="dp-field">
                    <div class="dp-menu-generator-actions">
                      <button type="button" class="dp-sm-btn" @click="generateFullDesignScene">сгенерировать всё</button>
                      <button type="button" class="dp-sm-btn" @click="generateContentScene">сгенерировать сцену</button>
                      <button type="button" class="dp-sm-btn" @click="applyContentScenePreset('workbench')">база</button>
                      <button type="button" class="dp-sm-btn" @click="applyContentScenePreset('registry')">реестр</button>
                      <button type="button" class="dp-sm-btn" @click="applyContentScenePreset('atelier')">студия</button>
                    </div>
                  </div>
                  <div class="dp-scene-presets-grid">
                    <button
                      v-for="scene in contentScenePresets"
                      :key="`content-scene-${scene.id}`"
                      type="button"
                      class="dp-scene-preset"
                      :class="{ 'dp-scene-preset--active': activeContentScenePresetId === scene.id }"
                      @click="applyContentScenePreset(scene.id)"
                    >
                      <span class="dp-scene-preset-preview" :class="`dp-scene-preset-preview--${scene.id}`">
                        <span class="dp-scene-block dp-scene-block--hero" />
                        <span class="dp-scene-row">
                          <span class="dp-scene-block dp-scene-block--wide" />
                          <span class="dp-scene-block dp-scene-block--side" />
                        </span>
                        <span class="dp-scene-row dp-scene-row--triple">
                          <span class="dp-scene-block" />
                          <span class="dp-scene-block" />
                          <span class="dp-scene-block" />
                        </span>
                      </span>
                      <span class="dp-card-preset-name">{{ scene.label }}</span>
                      <span class="dp-card-preset-desc">{{ scene.description }}</span>
                    </button>
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Генератор меню</div>
                  <div class="dp-field">
                    <label class="dp-label">раскладка объектов <span class="dp-val">{{ activeNavLayoutLabel }}</span></label>
                    <div class="dp-chip-picker">
                      <div class="dp-chip-pool">
                        <button
                          v-for="preset in navLayoutPresets"
                          :key="`nav-layout-${preset.id}`"
                          type="button"
                          class="dp-chip"
                          :class="{ 'dp-chip--active': tokens.navLayoutPreset === preset.id }"
                          @click="applyNavLayoutPreset(preset.id)"
                        >{{ preset.label }}</button>
                      </div>
                    </div>
                    <div class="dp-field-hint">Пресет меняет плотность меню, интервалы и поведение навигационных объектов в сайдбаре.</div>
                  </div>
                  <div class="dp-field">
                    <div class="dp-menu-generator-actions">
                      <button type="button" class="dp-sm-btn" @click="generateNavLayout">сгенерировать</button>
                      <button type="button" class="dp-sm-btn" @click="applyNavLayoutPreset('balanced')">сбросить</button>
                    </div>
                  </div>
                  <div class="dp-grid-menu-preview">
                    <div
                      class="dp-grid-menu-preview-shell"
                      :class="`dp-grid-menu-preview-shell--${tokens.navLayoutPreset}`"
                      :style="menuPreviewStyle"
                    >
                      <div class="dp-grid-menu-preview-search" />
                      <div class="dp-grid-menu-preview-list">
                        <div
                          v-for="(item, index) in menuPreviewItems"
                          :key="item"
                          class="dp-grid-menu-preview-item"
                          :class="{ 'dp-grid-menu-preview-item--active': index === 1, 'dp-grid-menu-preview-item--branch': index === 3 }"
                        >
                          <span>{{ item }}</span>
                          <span v-if="index === 3" class="dp-grid-menu-preview-arrow">›</span>
                        </div>
                      </div>
                      <div class="dp-grid-menu-preview-meta">{{ activeNavLayoutDescription }}</div>
                    </div>
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Обводки</div>
                  <div class="dp-field">
                    <label class="dp-label">толщина <span class="dp-val">{{ tokens.borderWidth }}px</span></label>
                    <input type="range" min="0" max="3" step="0.5" :value="tokens.borderWidth" class="dp-range" @input="onFloat('borderWidth', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">стиль</label>
                    <div class="dp-chip-picker">
                      <div class="dp-chip-pool">
                        <button
                          v-for="s in BORDER_STYLE_OPTIONS"
                          :key="`border-style-${s.id}`"
                          type="button"
                          class="dp-chip"
                          :class="{ 'dp-chip--active': String(tokens.borderStyle) === String(s.id) }"
                          @click="set('borderStyle', s.id as 'none' | 'solid' | 'dashed')"
                        >{{ s.label }}</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ═══ Модулярная шкала ═══ -->
              <div v-show="isTabVisible('typeScale')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Ratio: <strong>{{ currentScaleLabel }}</strong></div>
                  <div class="dp-chip-picker" style="margin-top:8px">
                    <div class="dp-chip-pool">
                      <button
                        v-for="s in TYPE_SCALE_OPTIONS"
                        :key="`type-scale-${s.ratio}`"
                        type="button"
                        class="dp-chip"
                        :class="{ 'dp-chip--active': Math.abs(tokens.typeScale - s.ratio) < 0.005 }"
                        @click="set('typeScale', s.ratio)"
                      >{{ s.label }}</button>
                    </div>
                  </div>
                </div>
                <div class="dp-col dp-col--wide">
                  <div class="dp-col-label">Визуализация шкалы</div>
                  <div class="dp-scale-visual">
                    <div v-for="s in typeScaleSizes" :key="s.name" class="dp-scale-row" :style="{ fontSize: s.size + 'rem', fontFamily: tokens.fontFamily }">
                      <span class="dp-scale-name">{{ s.name }}</span>
                      <span class="dp-scale-sample">Аа — The quick brown fox</span>
                      <span class="dp-scale-px">{{ (s.size * 16).toFixed(0) }}px</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ═══ Тёмная тема ═══ -->
              <div v-show="isTabVisible('darkMode')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Параметры</div>
                  <div class="dp-field">
                    <label class="dp-label">подъём поверхностей <span class="dp-val">{{ tokens.darkElevation }}</span></label>
                    <input type="range" min="0" max="20" step="1" :value="tokens.darkElevation" class="dp-range" @input="onRange('darkElevation', $event)">
                    <div class="dp-field-hint">Осветляет фоны карточек в тёмном режиме</div>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">насыщенность <span class="dp-val">{{ tokens.darkSaturation }}%</span></label>
                    <input type="range" min="0" max="100" step="5" :value="tokens.darkSaturation" class="dp-range" @input="onRange('darkSaturation', $event)">
                    <div class="dp-field-hint">Убавляет цветовую насыщенность в тёмном режиме</div>
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Превью тёмной темы</div>
                  <div class="dp-live-preview dp-dark-preview" style="margin-top:0">
                    <div class="dp-dark-cards">
                      <div class="dp-dark-card"
                        :style="{
                          background: `hsl(220, ${tokens.darkSaturation}%, ${8 + tokens.darkElevation * 0.5}%)`,
                          borderRadius: tokens.cardRadius + 'px',
                          border: `${tokens.borderWidth}px ${tokens.borderStyle} hsl(220, ${tokens.darkSaturation * 0.3}%, ${15 + tokens.darkElevation}%)`,
                        }">
                        <div class="dp-dark-card-title" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.2}%, 88%)` }">Карточка</div>
                        <div class="dp-dark-card-text" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.15}%, 62%)` }">Пример текста в тёмной теме с текущими настройками.</div>
                      </div>
                      <div class="dp-dark-card"
                        :style="{
                          background: `hsl(220, ${tokens.darkSaturation}%, ${10 + tokens.darkElevation * 0.8}%)`,
                          borderRadius: tokens.cardRadius + 'px',
                          border: `${tokens.borderWidth}px ${tokens.borderStyle} hsl(220, ${tokens.darkSaturation * 0.3}%, ${15 + tokens.darkElevation}%)`,
                        }">
                        <div class="dp-dark-card-title" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.2}%, 88%)` }">Элевация +1</div>
                        <div class="dp-dark-card-text" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.15}%, 62%)` }">Вложенная поверхность с большей яркостью.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ═══ Поля ввода ═══ -->
              <div v-show="isTabVisible('inputs')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Фон поля</div>
                  <div class="dp-field">
                    <label class="dp-label">прозрачность фона <span class="dp-val">{{ pct(tokens.inputBgOpacity) }}</span></label>
                    <input type="range" min="0" max="0.25" step="0.005" :value="tokens.inputBgOpacity" class="dp-range" @input="onFloat('inputBgOpacity', $event)">
                    <div class="dp-field-hint">0% — полностью прозрачный фон; 25% — плотный</div>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">непрозрачность рамки <span class="dp-val">{{ pct(tokens.inputBorderOpacity) }}</span></label>
                    <input type="range" min="0" max="0.4" step="0.01" :value="tokens.inputBorderOpacity" class="dp-range" @input="onFloat('inputBorderOpacity', $event)">
                    <div class="dp-field-hint">0% — рамки нет; добавляет тонкую обводку вокруг поля</div>
                  </div>
                  <div class="dp-col-label" style="margin-top:10px">Скругление</div>
                  <div class="dp-field">
                    <label class="dp-label">радиус <span class="dp-val">{{ tokens.inputRadius }}px</span></label>
                    <input type="range" min="0" max="20" step="1" :value="tokens.inputRadius" class="dp-range" @input="onRange('inputRadius', $event)">
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Превью</div>
                  <div class="dp-live-preview" style="margin-top:0; flex-direction:column; gap:8px">
                    <GlassInput
                      
                      placeholder="Текстовое поле"
                      :style="{
                        borderRadius: tokens.inputRadius + 'px',
                        background: `color-mix(in srgb, var(--glass-text) ${Math.round(tokens.inputBgOpacity*100)}%, transparent)`,
                        border: tokens.inputBorderOpacity > 0.005
                          ? `1px solid color-mix(in srgb, var(--glass-text) ${Math.round(tokens.inputBorderOpacity*100)}%, transparent)`
                          : 'none',
                        padding: '7px 10px', outline: 'none', width: '100%',
                        fontSize: 'var(--ds-text-sm, .8rem)', fontFamily: 'inherit',
                        color: 'var(--glass-text)',
                      }"
                    />
                    <select
                      class="glass-input"
                      :style="{
                        borderRadius: tokens.inputRadius + 'px',
                        background: `color-mix(in srgb, var(--glass-text) ${Math.round(tokens.inputBgOpacity*100)}%, transparent)`,
                        border: tokens.inputBorderOpacity > 0.005
                          ? `1px solid color-mix(in srgb, var(--glass-text) ${Math.round(tokens.inputBorderOpacity*100)}%, transparent)`
                          : 'none',
                        padding: '7px 10px', width: '100%',
                        fontSize: 'var(--ds-text-sm, .8rem)', fontFamily: 'inherit',
                        color: 'var(--glass-text)', appearance: 'none',
                      }"
                    >
                      <option>Выпадающий список</option>
                    </select>
                    <textarea
                      placeholder="Многострочное поле&#10;второй ряд"
                      rows="2"
                      :style="{
                        borderRadius: tokens.inputRadius + 'px',
                        background: `color-mix(in srgb, var(--glass-text) ${Math.round(tokens.inputBgOpacity*100)}%, transparent)`,
                        border: tokens.inputBorderOpacity > 0.005
                          ? `1px solid color-mix(in srgb, var(--glass-text) ${Math.round(tokens.inputBorderOpacity*100)}%, transparent)`
                          : 'none',
                        padding: '7px 10px', width: '100%', resize: 'none',
                        fontSize: 'var(--ds-text-sm, .8rem)', fontFamily: 'inherit',
                        color: 'var(--glass-text)',
                      }"
                    />
                  </div>
                </div>
              </div>

              <!-- ═══ Теги и чипы ═══ -->
              <div v-show="isTabVisible('tags')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Внешний вид</div>
                  <div class="dp-field">
                    <label class="dp-label">скругление <span class="dp-val">{{ tokens.chipRadius === 999 ? '∞ (пилюля)' : tokens.chipRadius + 'px' }}</span></label>
                    <input type="range" min="0" max="999" step="1" :value="tokens.chipRadius" class="dp-range" @input="onRange('chipRadius', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">фоновый слой <span class="dp-val">{{ pct(tokens.chipBgOpacity) }}</span></label>
                    <input type="range" min="0" max="0.3" step="0.005" :value="tokens.chipBgOpacity" class="dp-range" @input="onFloat('chipBgOpacity', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">непрозрачность рамки <span class="dp-val">{{ pct(tokens.chipBorderOpacity) }}</span></label>
                    <input type="range" min="0" max="0.4" step="0.01" :value="tokens.chipBorderOpacity" class="dp-range" @input="onFloat('chipBorderOpacity', $event)">
                  </div>
                  <div class="dp-col-label" style="margin-top:10px">Отступы внутри тега</div>
                  <div class="dp-field">
                    <label class="dp-label">горизонт. <span class="dp-val">{{ tokens.chipPaddingH }}px</span></label>
                    <input type="range" min="3" max="24" step="1" :value="tokens.chipPaddingH" class="dp-range" @input="onRange('chipPaddingH', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">вертикальн. <span class="dp-val">{{ tokens.chipPaddingV }}px</span></label>
                    <input type="range" min="1" max="12" step="1" :value="tokens.chipPaddingV" class="dp-range" @input="onRange('chipPaddingV', $event)">
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Превью</div>
                  <div class="dp-live-preview" style="margin-top:0; flex-wrap:wrap; gap:6px; align-content:flex-start">
                    <span v-for="label in ['Тег', 'Метка', 'Категория', '#хэштег', 'Статус', 'Фильтр']" :key="label"
                      :style="{
                        display: 'inline-flex', alignItems: 'center',
                        borderRadius: (tokens.chipRadius > 99 ? 999 : tokens.chipRadius) + 'px',
                        background: `color-mix(in srgb, var(--glass-text) ${Math.round(tokens.chipBgOpacity*100)}%, transparent)`,
                        border: tokens.chipBorderOpacity > 0.005
                          ? `1px solid color-mix(in srgb, var(--glass-text) ${Math.round(tokens.chipBorderOpacity*100)}%, transparent)`
                          : '1px solid transparent',
                        padding: `${tokens.chipPaddingV}px ${tokens.chipPaddingH}px`,
                        fontSize: 'var(--ds-text-xs, .7rem)',
                        color: 'var(--glass-text)',
                        fontFamily: 'inherit',
                      }"
                    >{{ label }}</span>
                  </div>
                </div>
              </div>

              <!-- ═══ Навигация ═══ -->
              <div v-show="isTabVisible('nav')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Пункты меню</div>
                  <div class="dp-field">
                    <label class="dp-label">скругление пункта <span class="dp-val">{{ tokens.navItemRadius }}px</span></label>
                    <input type="range" min="0" max="24" step="1" :value="tokens.navItemRadius" class="dp-range" @input="onRange('navItemRadius', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">отступ гор. <span class="dp-val">{{ tokens.navItemPaddingH }}px</span></label>
                    <input type="range" min="4" max="28" step="1" :value="tokens.navItemPaddingH" class="dp-range" @input="onRange('navItemPaddingH', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">отступ верт. <span class="dp-val">{{ tokens.navItemPaddingV }}px</span></label>
                    <input type="range" min="2" max="18" step="1" :value="tokens.navItemPaddingV" class="dp-range" @input="onRange('navItemPaddingV', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">ширина сайдбара <span class="dp-val">{{ tokens.sidebarWidth }}px</span></label>
                    <input type="range" min="180" max="380" step="5" :value="tokens.sidebarWidth" class="dp-range" @input="onRange('sidebarWidth', $event)">
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Эффекты сайдбара</div>
                  <div class="dp-field">
                    <label class="dp-label">переход между меню</label>
                    <div class="dp-arch-chips dp-arch-chips--wrap">
                      <button
                        v-for="opt in archNavTransitions" :key="`nav-fx-${opt.id}`"
                        type="button"
                        class="dp-arch-chip"
                        :class="{ 'dp-arch-chip--active': (tokens.archNavTransition || 'slide') === opt.id }"
                        @click="set('archNavTransition', opt.id)"
                      >{{ opt.label }}</button>
                    </div>
                    <div class="dp-field-hint">Отдельное управление drill-down анимацией сайдбара без влияния на переходы страниц.</div>
                  </div>
                  <div class="dp-field" v-if="(tokens.archNavTransition || 'slide') !== 'none'">
                    <label class="dp-label">скорость эффекта <span class="dp-label-val">{{ tokens.navTransitDuration ?? 220 }} мс</span></label>
                    <input
                      type="range" min="80" max="700" step="10"
                      :value="tokens.navTransitDuration ?? 220"
                      @input="set('navTransitDuration', Number(($event.target as HTMLInputElement).value))"
                      class="dp-range"
                    />
                  </div>
                  <div class="dp-field" v-if="(tokens.archNavTransition || 'slide') !== 'none' && (tokens.archNavTransition || 'slide') !== 'fade'">
                    <label class="dp-label">дистанция смещения <span class="dp-label-val">{{ tokens.navTransitDistance ?? 18 }} px</span></label>
                    <input
                      type="range" min="0" max="56" step="2"
                      :value="tokens.navTransitDistance ?? 18"
                      @input="set('navTransitDistance', Number(($event.target as HTMLInputElement).value))"
                      class="dp-range"
                    />
                  </div>
                  <div class="dp-field" v-if="(tokens.archNavTransition || 'slide') !== 'none'">
                    <label class="dp-label">каскад пунктов <span class="dp-label-val">{{ tokens.navItemStagger ?? 12 }} мс</span></label>
                    <input
                      type="range" min="0" max="60" step="2"
                      :value="tokens.navItemStagger ?? 12"
                      @input="set('navItemStagger', Number(($event.target as HTMLInputElement).value))"
                      class="dp-range"
                    />
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Превью</div>
                  <div class="dp-live-preview" style="margin-top:0; flex-direction:column; gap:2px; padding:8px; border-radius:var(--card-radius,14px); background:color-mix(in srgb,var(--glass-bg) 80%,transparent)">
                    <div v-for="(item, i) in ['Обзор', 'Клиенты', 'Проекты', 'Документы']" :key="item"
                      :style="{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: tokens.navItemPaddingV + 'px ' + tokens.navItemPaddingH + 'px',
                        borderRadius: tokens.navItemRadius + 'px',
                        background: i === 0 ? 'color-mix(in srgb, var(--ds-accent-light, var(--glass-text)) 25%, var(--glass-bg) 75%)' : 'transparent',
                        fontWeight: i === 0 ? '600' : '400',
                        opacity: i === 0 ? '1' : '0.65',
                        fontSize: 'var(--ds-text-sm, .8rem)',
                        fontFamily: 'inherit',
                        color: 'var(--glass-text)',
                        cursor: 'pointer',
                      }"
                    >{{ item }}</div>
                  </div>
                  <div class="dp-arch-nav-preview" :class="`dp-arch-nav-preview--${tokens.archNavTransition || 'slide'}`" style="margin-top:12px">
                    <div
                      v-for="(item, index) in menuPreviewItems.slice(0, 4)"
                      :key="`nav-preview-${item}`"
                      class="dp-arch-nav-preview-item"
                      :style="{ animationDelay: `${index * (tokens.navItemStagger ?? 12)}ms` }"
                    >
                      <span>{{ item }}</span>
                      <span v-if="index === 2">›</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ═══ Статусы и пин-бары ═══ -->
              <div v-show="isTabVisible('statuses')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Пин-бары и статус-метки</div>
                  <div class="dp-field">
                    <label class="dp-label">насыщенность фона <span class="dp-val">{{ pct(tokens.statusBgOpacity) }}</span></label>
                    <input type="range" min="0" max="0.5" step="0.005" :value="tokens.statusBgOpacity" class="dp-range" @input="onFloat('statusBgOpacity', $event)">
                    <div class="dp-field-hint">Управляет яркостью фона всех статусных меток (выполнено, в работе, ожидание, отмена)</div>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">форма <span class="dp-val">{{ tokens.statusPillRadius === 999 ? '∞ (пилюля)' : tokens.statusPillRadius + 'px' }}</span></label>
                    <input type="range" min="0" max="999" step="1" :value="tokens.statusPillRadius" class="dp-range" @input="onRange('statusPillRadius', $event)">
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Превью статусов</div>
                  <div class="dp-live-preview" style="margin-top:0; flex-wrap:wrap; gap:6px; align-content:flex-start">
                    <span v-for="s in [
                      { label: 'ожидание',  color: 'var(--glass-text)', bg: 'var(--rm-bg-pending)' },
                      { label: 'в работе',  color: 'var(--ds-warning)',  bg: 'var(--rm-bg-progress)' },
                      { label: 'выполнено', color: 'var(--ds-success)',  bg: 'var(--rm-bg-done)' },
                      { label: 'пропущено', color: 'var(--glass-text)',  bg: 'var(--rm-bg-skipped)' },
                      { label: 'запланировано', color: 'var(--ds-accent)', bg: 'var(--ws-bg-planned)' },
                      { label: 'на паузе', color: 'var(--ds-accent)', bg: 'var(--ws-bg-paused)' },
                      { label: 'отмена',   color: 'var(--ds-error)',  bg: 'var(--ws-bg-cancelled)' },
                    ]" :key="s.label"
                      :style="{
                        display: 'inline-flex', alignItems: 'center',
                        borderRadius: (tokens.statusPillRadius > 99 ? 999 : tokens.statusPillRadius) + 'px',
                        background: s.bg,
                        padding: `${tokens.chipPaddingV}px ${tokens.chipPaddingH}px`,
                        fontSize: 'var(--ds-text-xs, .68rem)',
                        fontWeight: '500',
                        color: s.color,
                        fontFamily: 'inherit',
                      }"
                    >{{ s.label }}</span>
                  </div>
                </div>
              </div>

              <!-- ═══ Попапы и оверлеи ═══ -->
              <div v-show="isTabVisible('popups')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Выпадающие панели</div>
                  <div class="dp-field">
                    <label class="dp-label">размытие дропдауна <span class="dp-val">{{ tokens.dropdownBlur }}px</span></label>
                    <input type="range" min="0" max="40" step="1" :value="tokens.dropdownBlur" class="dp-range" @input="onRange('dropdownBlur', $event)">
                    <div class="dp-field-hint">Применяется к автодополнению адреса, выпадающим спискам</div>
                  </div>
                  <div class="dp-col-label" style="margin-top:10px">Модальные окна</div>
                  <div class="dp-field">
                    <label class="dp-label">затемнение оверлея <span class="dp-val">{{ pct(tokens.modalOverlayOpacity) }}</span></label>
                    <input type="range" min="0" max="0.9" step="0.02" :value="tokens.modalOverlayOpacity" class="dp-range" @input="onFloat('modalOverlayOpacity', $event)">
                    <div class="dp-field-hint">Прозрачность тёмной подложки под модальным окном</div>
                  </div>
                  <div class="dp-col-label" style="margin-top:10px">Скругление</div>
                  <div class="dp-field">
                    <label class="dp-label">радиус модального <span class="dp-val">{{ tokens.modalRadius }}px</span></label>
                    <input type="range" min="0" max="28" step="1" :value="tokens.modalRadius" class="dp-range" @input="onRange('modalRadius', $event)">
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Превью дропдауна</div>
                  <div class="dp-live-preview" style="margin-top:0; padding:0; overflow:hidden; border-radius:var(--card-radius,14px);">
                    <div :style="{
                      background: 'var(--glass-bg)',
                      backdropFilter: `blur(${tokens.dropdownBlur}px) saturate(var(--glass-saturation,145%))`,
                      WebkitBackdropFilter: `blur(${tokens.dropdownBlur}px) saturate(var(--glass-saturation,145%))`,
                      border: '1px solid color-mix(in srgb, var(--glass-text) 10%, transparent)',
                      borderRadius: 'var(--card-radius,14px)',
                      padding: '4px',
                      boxShadow: 'var(--ds-shadow-lg)',
                    }">
                      <div v-for="opt in ['Первый вариант', 'Второй вариант', 'Третий вариант']" :key="opt"
                        :style="{
                          padding: '7px 12px',
                          borderRadius: 'calc(var(--card-radius,14px) - 4px)',
                          fontSize: 'var(--ds-text-sm, .8rem)',
                          fontFamily: 'inherit',
                          color: 'var(--glass-text)',
                          cursor: 'pointer',
                        }"
                      >{{ opt }}</div>
                    </div>
                  </div>
                  <div class="dp-col-label" style="margin-top:12px">Превью оверлея</div>
                  <div :style="{
                    height: '44px', borderRadius: 'var(--card-radius,14px)',
                    background: `rgba(0,0,0,${tokens.modalOverlayOpacity})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'var(--ds-text-xs,.7rem)', color: 'rgba(255,255,255,.6)',
                    fontFamily: 'inherit',
                  }">затемнение {{ pct(tokens.modalOverlayOpacity) }}</div>
                </div>
              </div>



              <!-- ═══ Скроллбар ═══ -->
              <div v-show="isTabVisible('scrollbar')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Полоса прокрутки</div>
                  <div class="dp-field">
                    <label class="dp-label">ширина <span class="dp-val">{{ tokens.scrollbarWidth }}px</span></label>
                    <input type="range" min="2" max="14" step="1" :value="tokens.scrollbarWidth" class="dp-range" @input="onRange('scrollbarWidth', $event)">
                    <div class="dp-field-hint">Ширина в пикселях для всех скроллбаров</div>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">непрозрачность <span class="dp-val">{{ pct(tokens.scrollbarOpacity) }}</span></label>
                    <input type="range" min="0" max="0.8" step="0.01" :value="tokens.scrollbarOpacity" class="dp-range" @input="onFloat('scrollbarOpacity', $event)">
                    <div class="dp-field-hint">0 — невидимый, скроллбар появляется при наведении</div>
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Превью</div>
                  <div :style="{ height: '120px', overflowY: 'scroll', padding: '8px 12px', background: 'color-mix(in srgb, var(--glass-text) 3%, transparent)', borderRadius: 'var(--card-radius,14px)', scrollbarWidth: 'thin', scrollbarColor: `color-mix(in srgb, var(--glass-text) ${Math.round(tokens.scrollbarOpacity*100)}%, transparent) transparent` }">
                    <div v-for="i in 12" :key="i" :style="{ padding: '4px 0', fontSize: 'var(--ds-text-xs,.7rem)', color: 'var(--glass-text)', borderBottom: '1px solid color-mix(in srgb, var(--glass-text) 7%, transparent)' }">Строка {{ i }}</div>
                  </div>
                </div>
              </div>

              <!-- ═══ Таблицы ═══ -->
              <div v-show="isTabVisible('tables')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Шапка и строки</div>
                  <div class="dp-field">
                    <label class="dp-label">фон заголовка <span class="dp-val">{{ pct(tokens.tableHeaderOpacity) }}</span></label>
                    <input type="range" min="0" max="0.25" step="0.005" :value="tokens.tableHeaderOpacity" class="dp-range" @input="onFloat('tableHeaderOpacity', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">фон при наведении <span class="dp-val">{{ pct(tokens.tableRowHoverOpacity) }}</span></label>
                    <input type="range" min="0" max="0.15" step="0.005" :value="tokens.tableRowHoverOpacity" class="dp-range" @input="onFloat('tableRowHoverOpacity', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">обводка ячеек <span class="dp-val">{{ pct(tokens.tableBorderOpacity) }}</span></label>
                    <input type="range" min="0" max="0.4" step="0.01" :value="tokens.tableBorderOpacity" class="dp-range" @input="onFloat('tableBorderOpacity', $event)">
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Превью</div>
                  <div class="dp-live-preview" style="margin-top:0; padding:0; overflow:hidden; border-radius:var(--card-radius,14px);">
                    <table style="width:100%; border-collapse:collapse; font-size:.68rem; font-family:inherit;">
                      <thead>
                        <tr>
                          <th v-for="h in ['Название','Статус','Дата']" :key="h" :style="{ padding:'6px 10px', textAlign:'left', fontWeight:600, color:'var(--glass-text)', background:`color-mix(in srgb, var(--glass-text) ${Math.round(tokens.tableHeaderOpacity*100)}%, transparent)`, borderBottom:`1px solid color-mix(in srgb, var(--glass-text) ${Math.round(tokens.tableBorderOpacity*100)}%, transparent)` }">{{ h }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, i) in [['Проект A','В работе','01.03'],['Проект B','Готово','15.02'],['Проект C','Ожидание','...']]" :key="i"
                          :style="{ background: i % 2 === 0 ? `color-mix(in srgb, var(--glass-text) ${Math.round(tokens.tableRowHoverOpacity*100)}%, transparent)` : 'transparent' }">
                          <td v-for="cell in row" :key="cell" :style="{ padding:'6px 10px', color:'var(--glass-text)', borderBottom:`1px solid color-mix(in srgb, var(--glass-text) ${Math.round(tokens.tableBorderOpacity*100)}%, transparent)` }">{{ cell }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- ═══ Значки / счётчики ═══ -->
              <div v-show="isTabVisible('badges')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Счётчики и метки</div>
                  <div class="dp-field">
                    <label class="dp-label">скругление <span class="dp-val">{{ tokens.badgeRadius === 999 ? '∞ (пилюля)' : tokens.badgeRadius + 'px' }}</span></label>
                    <input type="range" min="0" max="999" step="1" :value="tokens.badgeRadius" class="dp-range" @input="onRange('badgeRadius', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">насыщенность фона <span class="dp-val">{{ pct(tokens.badgeBgOpacity) }}</span></label>
                    <input type="range" min="0" max="0.5" step="0.01" :value="tokens.badgeBgOpacity" class="dp-range" @input="onFloat('badgeBgOpacity', $event)">
                    <div class="dp-field-hint">Фон использует акцентный цвет из палитры</div>
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Превью</div>
                  <div class="dp-live-preview" style="margin-top:0; flex-wrap:wrap; gap:8px; align-content:flex-start; align-items:center;">
                    <span v-for="n in [1, 5, 12, 99]" :key="n" :style="{
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      minWidth: '22px', height: '22px', padding: '0 6px',
                      borderRadius: (tokens.badgeRadius > 99 ? 999 : tokens.badgeRadius) + 'px',
                      background: `color-mix(in srgb, ${accentColor} ${Math.round(tokens.badgeBgOpacity*100)}%, transparent)`,
                      color: 'var(--glass-text)', fontSize:'.62rem', fontWeight:700,
                      fontFamily:'inherit',
                    }">{{ n }}</span>
                    <span :style="{
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      minWidth: '22px', height: '22px', padding: '0 6px',
                      borderRadius: (tokens.badgeRadius > 99 ? 999 : tokens.badgeRadius) + 'px',
                      background: accentColor,
                      color: '#fff', fontSize:'.62rem', fontWeight:700,
                      fontFamily:'inherit',
                    }">NEW</span>
                  </div>
                </div>
              </div>

              <!-- ═══════════════════════ АРХИТЕКТУРА ДИЗАЙНА ═══════════════════════ -->
              <div v-show="isTabVisible('arch')" class="dp-page dp-page-stack">
                <div class="dp-arch-layout">
                  <div class="dp-arch-col">
                    <div class="dp-col-label">Пространство</div>

                    <div class="dp-arch-setting">
                      <label class="dp-label">плотность <span class="dp-val">{{ tokens.archDensity }}</span></label>
                      <div class="dp-arch-chips dp-arch-chips--matrix">
                        <button
                          v-for="opt in archDensities" :key="opt.id"
                          type="button"
                          class="dp-arch-chip"
                          :class="{ 'dp-arch-chip--active': tokens.archDensity === opt.id }"
                          @click="set('archDensity', opt.id)"
                        >{{ opt.label }}</button>
                      </div>
                      <div class="dp-field-hint">отступы секций и расстояние между блоками</div>
                    </div>

                    <div class="dp-arch-setting">
                      <label class="dp-label">регистр заголовков</label>
                      <div class="dp-arch-chips dp-arch-chips--matrix">
                        <button
                          v-for="opt in archHeadingCases" :key="opt.id"
                          type="button"
                          class="dp-arch-chip"
                          :class="{ 'dp-arch-chip--active': tokens.archHeadingCase === opt.id }"
                          @click="set('archHeadingCase', opt.id)"
                        >{{ opt.label }}</button>
                      </div>
                    </div>

                    <div class="dp-arch-setting">
                      <label class="dp-label">разделители секций</label>
                      <div class="dp-arch-chips dp-arch-chips--matrix">
                        <button
                          v-for="opt in archDividers" :key="opt.id"
                          type="button"
                          class="dp-arch-chip"
                          :class="{ 'dp-arch-chip--active': tokens.archDivider === opt.id }"
                          @click="set('archDivider', opt.id)"
                        >{{ opt.label }}</button>
                      </div>
                    </div>

                    <div class="dp-arch-setting">
                      <label class="dp-label">стиль секций страницы</label>
                      <div class="dp-arch-chips dp-arch-chips--matrix">
                        <button
                          v-for="opt in archSectionStyles" :key="opt.id"
                          type="button"
                          class="dp-arch-chip"
                          :class="{ 'dp-arch-chip--active': tokens.archSectionStyle === opt.id }"
                          @click="set('archSectionStyle', opt.id)"
                        >{{ opt.label }}</button>
                      </div>
                    </div>
                  </div>

                  <div class="dp-arch-col">
                    <div class="dp-col-label">Каркас</div>

                    <div class="dp-arch-setting">
                      <label class="dp-label">стиль навигации <span class="dp-val">{{ tokens.archNavStyle || 'full' }}</span></label>
                      <div class="dp-arch-chips dp-arch-chips--matrix">
                        <button
                          v-for="opt in archNavStyles" :key="opt.id"
                          type="button"
                          class="dp-arch-chip"
                          :class="{ 'dp-arch-chip--active': (tokens.archNavStyle || 'full') === opt.id }"
                          @click="set('archNavStyle', opt.id)"
                        >{{ opt.label }}</button>
                      </div>
                    </div>

                    <div class="dp-arch-setting">
                      <label class="dp-label">хром карточек <span class="dp-val">{{ tokens.archCardChrome || 'visible' }}</span></label>
                      <div class="dp-arch-chips dp-arch-chips--matrix">
                        <button
                          v-for="opt in archCardChromes" :key="opt.id"
                          type="button"
                          class="dp-arch-chip"
                          :class="{ 'dp-arch-chip--active': (tokens.archCardChrome || 'visible') === opt.id }"
                          @click="set('archCardChrome', opt.id)"
                        >{{ opt.label }}</button>
                      </div>
                      <div class="dp-field-hint">видимый, тонкий или призрачный контур карточек</div>
                    </div>

                    <div class="dp-arch-setting">
                      <label class="dp-label">масштаб героя <span class="dp-val">{{ tokens.archHeroScale || 'normal' }}</span></label>
                      <div class="dp-arch-chips dp-arch-chips--matrix">
                        <button
                          v-for="opt in archHeroScales" :key="opt.id"
                          type="button"
                          class="dp-arch-chip"
                          :class="{ 'dp-arch-chip--active': (tokens.archHeroScale || 'normal') === opt.id }"
                          @click="set('archHeroScale', opt.id)"
                        >{{ opt.label }}</button>
                      </div>
                    </div>
                  </div>

                  <div class="dp-arch-col">
                    <div class="dp-col-label">Эффекты</div>

                    <div class="dp-arch-setting">
                      <label class="dp-label">появление контента <span class="dp-val">{{ tokens.archContentReveal || 'none' }}</span></label>
                      <div class="dp-arch-chips dp-arch-chips--matrix">
                        <button
                          v-for="opt in archContentReveals" :key="opt.id"
                          type="button"
                          class="dp-arch-chip"
                          :class="{ 'dp-arch-chip--active': (tokens.archContentReveal || 'none') === opt.id }"
                          @click="set('archContentReveal', opt.id)"
                        >{{ opt.label }}</button>
                      </div>
                      <div class="dp-field-hint">способ появления блоков и секций</div>
                    </div>

                    <div class="dp-arch-setting">
                      <label class="dp-label">появление текста <span class="dp-val">{{ tokens.archTextReveal || 'none' }}</span></label>
                      <div class="dp-arch-chips dp-arch-chips--matrix">
                        <button
                          v-for="opt in archTextReveals" :key="opt.id"
                          type="button"
                          class="dp-arch-chip"
                          :class="{ 'dp-arch-chip--active': (tokens.archTextReveal || 'none') === opt.id }"
                          @click="set('archTextReveal', opt.id)"
                        >{{ opt.label }}</button>
                      </div>
                      <div class="dp-field-hint">анимация заголовков и текстовых связок</div>
                    </div>

                    <div class="dp-arch-setting">
                      <label class="dp-label">эффект наведения на карточку</label>
                      <div class="dp-arch-chips dp-arch-chips--matrix">
                        <button
                          v-for="opt in cardHoverAnims" :key="opt.id"
                          type="button"
                          class="dp-arch-chip"
                          :class="{ 'dp-arch-chip--active': tokens.cardHoverAnim === opt.id }"
                          @click="set('cardHoverAnim', opt.id)"
                        >{{ opt.label }}</button>
                      </div>
                    </div>

                    <div class="dp-arch-setting">
                      <label class="dp-label">анимация ссылок</label>
                      <div class="dp-arch-chips dp-arch-chips--matrix">
                        <button
                          v-for="opt in archLinkAnims" :key="opt.id"
                          type="button"
                          class="dp-arch-chip"
                          :class="{ 'dp-arch-chip--active': tokens.archLinkAnim === opt.id }"
                          @click="set('archLinkAnim', opt.id)"
                        >{{ opt.label }}</button>
                      </div>
                    </div>
                  </div>

                  <div class="dp-arch-col">
                    <div class="dp-col-label">Переходы</div>

                    <div class="dp-arch-setting">
                      <label class="dp-label">пресеты переходов</label>
                      <div class="dp-arch-chips dp-arch-chips--matrix">
                        <button
                          v-for="preset in archTransitionPresets"
                          :key="`arch-transition-${preset.id}`"
                          type="button"
                          class="dp-arch-chip"
                          :class="{ 'dp-arch-chip--active': tokens.archPageEnter === preset.tokens.archPageEnter && (tokens.pageTransitDuration ?? 280) === preset.tokens.pageTransitDuration }"
                          @click="applyArchitectureTransitionPreset(preset.id)"
                        >{{ preset.label }}</button>
                      </div>
                      <div class="dp-field-hint">готовые пары эффекта входа и длительности</div>
                    </div>

                    <div class="dp-arch-setting">
                      <label class="dp-label">переход между страницами</label>
                      <div class="dp-arch-chips dp-arch-chips--matrix">
                        <button
                          v-for="opt in archPageEnters" :key="opt.id"
                          type="button"
                          class="dp-arch-chip"
                          :class="{ 'dp-arch-chip--active': tokens.archPageEnter === opt.id }"
                          @click="set('archPageEnter', opt.id)"
                        >{{ opt.label }}</button>
                      </div>
                    </div>

                    <div class="dp-arch-setting">
                      <label class="dp-label">режим просмотра страницы <span class="dp-label-val">{{ tokens.contentViewMode || 'scroll' }}</span></label>
                      <div class="dp-arch-chips dp-arch-chips--matrix">
                        <button
                          v-for="opt in contentViewModes" :key="opt.id"
                          type="button"
                          class="dp-arch-chip"
                          :class="{ 'dp-arch-chip--active': (tokens.contentViewMode || 'scroll') === opt.id }"
                          @click="set('contentViewMode', opt.id)"
                        >{{ opt.label }}</button>
                      </div>
                      <div class="dp-field-hint">режим движения страницы и способ листания контента</div>
                    </div>

                    <div v-if="(tokens.contentViewMode || 'scroll') === 'wipe'" class="dp-arch-setting">
                      <label class="dp-label">переход между карточками <span class="dp-val">{{ tokens.wipeTransition ?? 'slide' }}</span></label>
                      <div class="dp-arch-chips dp-arch-chips--matrix">
                        <button
                          v-for="opt in wipeTransitions" :key="opt.id"
                          type="button"
                          class="dp-arch-chip"
                          :class="{ 'dp-arch-chip--active': (tokens.wipeTransition || 'slide') === opt.id }"
                          @click="set('wipeTransition', opt.id)"
                        >{{ opt.label }}</button>
                      </div>
                      <div class="dp-field-hint">вариант анимации перелистывания карточек внутри wipe</div>
                    </div>
                  </div>
                </div>

                <div class="dp-arch-detail-grid">
                  <div class="dp-arch-detail-card">
                    <div class="dp-col-label">Точная настройка</div>

                    <div class="dp-field dp-field--mt">
                      <label class="dp-label">межбуквенный трекинг заголовков <span class="dp-val">{{ ((tokens.archHeadingTracking ?? -1) * 0.01).toFixed(2) }}em</span></label>
                      <input type="range" min="-5" max="30" step="1" :value="tokens.archHeadingTracking ?? -1" class="dp-range" @input="onRange('archHeadingTracking', $event)">
                      <div class="dp-field-hint">отрицательный — сжатие, высокий — editorial / архитектурный стиль</div>
                    </div>

                    <div class="dp-field">
                      <label class="dp-label">вертикальный ритм <span class="dp-val">×{{ (tokens.archVerticalRhythm ?? 1).toFixed(1) }}</span></label>
                      <input type="range" min="0.3" max="3.0" step="0.1" :value="tokens.archVerticalRhythm ?? 1" class="dp-range" @input="onRange('archVerticalRhythm', $event)">
                      <div class="dp-field-hint">0.3 — сжато, 3.0 — кинематографичный ритм секций</div>
                    </div>

                    <div class="dp-field">
                      <label class="dp-label">длительность перехода <span class="dp-label-val">{{ formatTransitionDuration(tokens.pageTransitDuration ?? 280) }}</span></label>
                      <input
                        type="range" min="0" max="10000" step="50"
                        :value="tokens.pageTransitDuration ?? 280"
                        @input="set('pageTransitDuration', Number(($event.target as HTMLInputElement).value))"
                        class="dp-range"
                      />
                      <div class="dp-range-hints"><span>0 сек</span><span>10 сек</span></div>
                    </div>
                  </div>

                  <div v-if="(tokens.contentViewMode || 'scroll') === 'wipe'" class="dp-arch-detail-card">
                    <div class="dp-col-label">Геометрия wipe</div>

                    <div class="dp-field dp-field--mt">
                      <label class="dp-label">отступ сверху <span class="dp-label-val">{{ tokens.wipeTopInset ?? 48 }}px</span></label>
                      <input
                        type="range" min="12" max="120" step="2"
                        :value="tokens.wipeTopInset ?? 48"
                        @input="set('wipeTopInset', Number(($event.target as HTMLInputElement).value))"
                        class="dp-range"
                      />
                      <div class="dp-range-hints"><span>12</span><span>120</span></div>
                    </div>

                    <div class="dp-field">
                      <label class="dp-label">отступ снизу <span class="dp-label-val">{{ tokens.wipeBottomInset ?? 106 }}px</span></label>
                      <input
                        type="range" min="40" max="200" step="2"
                        :value="tokens.wipeBottomInset ?? 106"
                        @input="set('wipeBottomInset', Number(($event.target as HTMLInputElement).value))"
                        class="dp-range"
                      />
                      <div class="dp-range-hints"><span>40</span><span>200</span></div>
                    </div>

                    <div class="dp-field">
                      <label class="dp-label">боковые поля <span class="dp-label-val">{{ tokens.wipeSideMargin ?? 20 }}px</span></label>
                      <input
                        type="range" min="0" max="80" step="2"
                        :value="tokens.wipeSideMargin ?? 20"
                        @input="set('wipeSideMargin', Number(($event.target as HTMLInputElement).value))"
                        class="dp-range"
                      />
                      <div class="dp-range-hints"><span>0</span><span>80</span></div>
                    </div>

                    <div class="dp-field">
                      <label class="dp-label">отступ контента <span class="dp-label-val">{{ tokens.wipeContentPadding ?? 20 }}px</span></label>
                      <input
                        type="range" min="0" max="48" step="2"
                        :value="tokens.wipeContentPadding ?? 20"
                        @input="set('wipeContentPadding', Number(($event.target as HTMLInputElement).value))"
                        class="dp-range"
                      />
                      <div class="dp-range-hints"><span>0</span><span>48</span></div>
                    </div>
                  </div>

                  <div v-if="(tokens.contentViewMode || 'scroll') === 'wipe'" class="dp-arch-detail-card">
                    <div class="dp-col-label">Карточка wipe</div>

                    <div class="dp-field dp-field--mt">
                      <label class="dp-label">радиус карточки <span class="dp-label-val">{{ tokens.wipeCardRadius ?? 14 }}px</span></label>
                      <input
                        type="range" min="0" max="32" step="1"
                        :value="tokens.wipeCardRadius ?? 14"
                        @input="set('wipeCardRadius', Number(($event.target as HTMLInputElement).value))"
                        class="dp-range"
                      />
                      <div class="dp-range-hints"><span>0</span><span>32</span></div>
                    </div>

                    <div class="dp-field">
                      <label class="dp-label">рамка карточки <span class="dp-label-val">{{ tokens.wipeCardBorder ?? 1 }}px</span></label>
                      <input
                        type="range" min="0" max="4" step="0.5"
                        :value="tokens.wipeCardBorder ?? 1"
                        @input="set('wipeCardBorder', Number(($event.target as HTMLInputElement).value))"
                        class="dp-range"
                      />
                      <div class="dp-range-hints"><span>0</span><span>4</span></div>
                    </div>

                    <div class="dp-field">
                      <label class="dp-label">тень карточки <span class="dp-label-val">{{ Math.round((tokens.wipeCardShadow ?? 0.4) * 100) }}%</span></label>
                      <input
                        type="range" min="0" max="1" step="0.05"
                        :value="tokens.wipeCardShadow ?? 0.4"
                        @input="set('wipeCardShadow', Number(($event.target as HTMLInputElement).value))"
                        class="dp-range"
                      />
                      <div class="dp-range-hints"><span>0%</span><span>100%</span></div>
                    </div>

                    <div class="dp-field">
                      <label class="dp-label">заполнение карточки <span class="dp-label-val">{{ Math.round((tokens.wipePageFill ?? 0.85) * 100) }}%</span></label>
                      <input
                        type="range" min="0.3" max="1" step="0.05"
                        :value="tokens.wipePageFill ?? 0.85"
                        @input="set('wipePageFill', Number(($event.target as HTMLInputElement).value))"
                        class="dp-range"
                      />
                      <div class="dp-range-hints"><span>30%</span><span>100%</span></div>
                      <div class="dp-field-hint">меньше — меньше контента на карточке, больше карточек</div>
                    </div>
                  </div>

                  <div class="dp-arch-detail-card">
                    <div class="dp-col-label">Превью трекинга</div>
                    <div class="dp-field dp-field--mt">
                      <div class="dp-arch-preview-heading" :style="{ letterSpacing: ((tokens.archHeadingTracking ?? -1) * 0.01).toFixed(3) + 'em', textTransform: tokens.archHeadingCase === 'none' ? undefined : tokens.archHeadingCase }">
                        Архитектура пространства
                      </div>
                      <div class="dp-arch-preview-heading dp-arch-preview-heading--sm" :style="{ letterSpacing: ((tokens.archHeadingTracking ?? -1) * 0.01).toFixed(3) + 'em', textTransform: tokens.archHeadingCase === 'none' ? undefined : tokens.archHeadingCase }">
                        Design&nbsp;Architecture
                      </div>
                    </div>
                  </div>
                </div>
              </div>

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
import UIDesignModulesMatrix from '~/entities/design-system/ui/UIDesignModulesMatrix.vue'
import UIAppBlueprintBuilder from '~/entities/app-blueprint/ui/UIAppBlueprintBuilder.vue'
import UIDesignVisibilityRules from '~/entities/design-system/ui/UIDesignVisibilityRules.vue'
import {
  useDesignSystem, FONT_OPTIONS, BTN_SIZE_MAP, EASING_OPTIONS, DESIGN_PRESETS,
  DESIGN_CONCEPTS,
  TYPE_SCALE_OPTIONS,
  type DesignTokens, type DesignPreset,
} from '~/entities/design-system/model/useDesignSystem'
import { useElementAlignment } from '~/entities/design-system/model/useElementAlignment'
import type { DesignPanelTabId } from '~/entities/design-system/model/useDesignModules'

type PanelTabId = DesignPanelTabId | 'modules'

const {
  tokens, set, reset: dsReset, applyPreset,
  undo, redo, canUndo, canRedo,
  exportJSON, importJSON, exportCSS,
  previewPreset, confirmPreview, cancelPreview, isPreviewActive,
  activeConceptSlug, isHydrated,
} = useDesignSystem()
const { designPanel: designPanelModules, isPanelTabEnabled } = useDesignModules()
const { currentPath, findRule: findVisibilityRule, addRule: addVisibilityRule, removeMatchingRule } = useElementVisibility()
const { currentPath: alignmentPath, findRule: findAlignmentRule, setRulePosition, removeMatchingRule: removeAlignmentRule } = useElementAlignment()
const { themeId, applyThemeWithTokens, getStoredThemeId, UI_THEMES } = useUITheme()

watch([() => UI_THEMES.value, isHydrated], ([themes, hydrated]) => {
  if (!hydrated || !themes || !themes.length) {
    return
  }

  if (!themes.find((t: any) => t.id === themeId.value)) {
    const nextTheme = themes.find((t: any) => t.id === getStoredThemeId()) || themes[0]
    applyThemeWithTokens(nextTheme.id)
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
const animPlaying = ref(false)
const searchQuery = ref('')
const appliedFlash = ref(false)
const typeCtx = ref<'text' | 'headings' | 'buttons' | 'inputs'>('text')
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

/* ── Option lists ────────────────────────────────── */
const btnStyles = [
  { id: 'filled'  as const, label: 'залитый' },
  { id: 'outline' as const, label: 'контур' },
  { id: 'ghost'   as const, label: 'призрак' },
  { id: 'soft'    as const, label: 'мягкий' },
]
const btnSizes = [
  { id: 'xs' as const, label: 'XS' },
  { id: 'sm' as const, label: 'S' },
  { id: 'md' as const, label: 'M' },
  { id: 'lg' as const, label: 'L' },
]
const textTransforms = [
  { id: 'none'       as const, label: 'обычный' },
  { id: 'uppercase'  as const, label: 'ВЕРХНИЙ' },
  { id: 'capitalize' as const, label: 'С Заглавной' },
]
const btnHoverAnims = [
  { id: 'none'  as const, label: 'нет' },
  { id: 'ripple'  as const, label: 'm3 ripple' },
  { id: 'lift'  as const, label: 'парение' },
  { id: 'scale' as const, label: 'масштаб' },
  { id: 'glow'  as const, label: 'свечение' },
  { id: 'fill'  as const, label: 'заливка' },
  { id: 'sheen' as const, label: 'блик' },
  { id: 'pulse' as const, label: 'импульс' },
  { id: 'shutter' as const, label: 'шторки' },
  { id: 'magnet' as const, label: 'магнит' },
  { id: 'scan' as const, label: 'скан' },
]
const cardHoverAnims = [
  { id: 'none'   as const, label: 'нет' },
  { id: 'lift'   as const, label: 'парение' },
  { id: 'scale'  as const, label: 'масштаб' },
  { id: 'dim'    as const, label: 'затемнение' },
  { id: 'border' as const, label: 'рамка' },
  { id: 'reveal' as const, label: 'открытие' },
]
const archDensities = [
  { id: 'dense'  as const, label: 'плотно' },
  { id: 'normal' as const, label: 'норма' },
  { id: 'airy'   as const, label: 'просторно' },
  { id: 'grand'  as const, label: 'гранд' },
]
const archHeadingCases = [
  { id: 'none'       as const, label: 'обычный' },
  { id: 'uppercase'  as const, label: 'КАПС' },
  { id: 'lowercase'  as const, label: 'строчные' },
  { id: 'capitalize' as const, label: 'С Заглавной' },
]
const archDividers = [
  { id: 'none'     as const, label: 'нет' },
  { id: 'line'     as const, label: 'линия' },
  { id: 'gradient' as const, label: 'градиент' },
]
const archPageEnters = [
  { id: 'none'     as const, label: 'нет' },
  { id: 'fade'     as const, label: 'плавно' },
  { id: 'scale-fade' as const, label: 'scale fade' },
  { id: 'zoom'     as const, label: 'масштаб' },
  { id: 'blur'     as const, label: 'размытие' },
  { id: 'flip'     as const, label: 'переворот' },
  { id: 'slide-r'  as const, label: '→ слайд' },
  { id: 'slide-l'  as const, label: '← слайд' },
  { id: 'slide-t'  as const, label: '↑ слайд' },
  { id: 'slide-b'  as const, label: '↓ слайд' },
  { id: 'drift-r'  as const, label: '→ дрейф' },
  { id: 'drift-l'  as const, label: '← дрейф' },
  { id: 'clip-x'   as const, label: 'клип x' },
  { id: 'clip-y'   as const, label: 'клип y' },
  { id: 'skew'     as const, label: 'скос' },
  { id: 'curtain'  as const, label: 'занавес ↓' },
  { id: 'curtain-b' as const, label: 'занавес ↑' },
]
const archLinkAnims = [
  { id: 'none'      as const, label: 'нет' },
  { id: 'underline' as const, label: 'подчёркивание' },
  { id: 'arrow'     as const, label: 'стрелка' },
]
const contentViewModes = [
  { id: 'scroll' as const, label: 'скролл', description: 'Непрерывная прокрутка как сейчас.' },
  { id: 'paged' as const, label: 'экраны', description: 'Листание контента по высоте видимой зоны.' },
  { id: 'flow' as const, label: 'поток', description: 'Экранное листание и переход к следующему пункту активного меню.' },
  { id: 'wipe' as const, label: 'wipe', description: 'Фиксированное окно и последовательное открытие частей контента через вайп-переход.' },
  { id: 'wipe2' as const, label: 'wipe 2', description: 'Алгоритм 2×8: данные компонента превращаются в карточки по 16 полей.' },
]
const wipeTransitions = [
  { id: 'slide' as const, label: 'шторка' },
  { id: 'fade' as const, label: 'затухание' },
  { id: 'curtain' as const, label: 'занавес' },
  { id: 'blur' as const, label: 'размытие' },
]
const archSectionStyles = [
  { id: 'flat'    as const, label: 'плоский' },
  { id: 'card'    as const, label: 'карточки' },
  { id: 'striped' as const, label: 'полосы' },
]
const archNavStyles = [
  { id: 'full'    as const, label: 'полный' },
  { id: 'minimal' as const, label: 'минимальный' },
  { id: 'hidden'  as const, label: 'скрытый' },
]
const archCardChromes = [
  { id: 'visible' as const, label: 'видимый' },
  { id: 'subtle'  as const, label: 'тонкий' },
  { id: 'ghost'   as const, label: 'призрак' },
]
const archHeroScales = [
  { id: 'compact'    as const, label: 'компактный' },
  { id: 'normal'     as const, label: 'нормальный' },
  { id: 'large'      as const, label: 'крупный' },
  { id: 'cinematic'  as const, label: 'кинематограф' },
]
const archContentReveals = [
  { id: 'none'     as const, label: 'нет' },
  { id: 'fade-up'  as const, label: 'плавный подъём' },
  { id: 'fade'     as const, label: 'плавно' },
  { id: 'slide-up' as const, label: 'подъём' },
  { id: 'blur'     as const, label: 'размытие' },
]
const archTextReveals = [
  { id: 'none'        as const, label: 'нет' },
  { id: 'clip'        as const, label: 'обрезка' },
  { id: 'blur-in'     as const, label: 'из размытия' },
  { id: 'letter-fade' as const, label: 'побуквенно' },
]
const archNavTransitions = [
  { id: 'none'  as const, label: 'нет' },
  { id: 'fade'  as const, label: 'плавно' },
  { id: 'slide' as const, label: 'слайд' },
  { id: 'push'  as const, label: 'вытеснение' },
  { id: 'stack' as const, label: 'слои' },
  { id: 'blur'  as const, label: 'размытие' },
]
const archTransitionPresets = [
  {
    id: 'instant' as const,
    label: 'мгновенно',
    description: 'Без анимации для рабочих режимов и быстрых переключений.',
    tokens: {
      archPageEnter: 'none' as const,
      pageTransitDuration: 0,
      archNavTransition: 'none' as const,
      navTransitDuration: 0,
      archContentReveal: 'none' as const,
      archTextReveal: 'none' as const,
    },
  },
  {
    id: 'calm' as const,
    label: 'спокойно',
    description: 'Нейтральный fade для повседневной админки.',
    tokens: {
      archPageEnter: 'fade' as const,
      pageTransitDuration: 280,
      archNavTransition: 'slide' as const,
      navTransitDuration: 220,
      archContentReveal: 'fade-up' as const,
      archTextReveal: 'none' as const,
    },
  },
  {
    id: 'editorial' as const,
    label: 'редакция',
    description: 'Медленнее, со сдвигом и более длинным ритмом.',
    tokens: {
      archPageEnter: 'slide-l' as const,
      pageTransitDuration: 760,
      archNavTransition: 'push' as const,
      navTransitDuration: 320,
      archContentReveal: 'fade' as const,
      archTextReveal: 'clip' as const,
    },
  },
  {
    id: 'spatial' as const,
    label: 'пространство',
    description: 'Масштаб и дрейф для более объёмной смены сцен.',
    tokens: {
      archPageEnter: 'drift-r' as const,
      pageTransitDuration: 1100,
      archNavTransition: 'stack' as const,
      navTransitDuration: 380,
      archContentReveal: 'blur' as const,
      archTextReveal: 'blur-in' as const,
    },
  },
  {
    id: 'cinematic' as const,
    label: 'кино',
    description: 'Большой занавес и длинный драматический тайминг.',
    tokens: {
      archPageEnter: 'curtain' as const,
      pageTransitDuration: 1800,
      archNavTransition: 'stack' as const,
      navTransitDuration: 420,
      archContentReveal: 'fade-up' as const,
      archTextReveal: 'letter-fade' as const,
    },
  },
]
const contentLayoutPresets = [
  { id: 'balanced' as const, label: 'баланс', description: 'Универсальная двухколоночная раскладка с ровным ритмом.' },
  { id: 'registry' as const, label: 'реестр', description: 'Плотная матрица для таблиц, статусов и списков.' },
  { id: 'matrix' as const, label: 'матрица', description: 'Равномерная сетка для модульных карточек и обзорных экранов.' },
  { id: 'editorial' as const, label: 'редакция', description: 'Шире контейнер, меньше карточного хрома, больше воздуха.' },
  { id: 'studio' as const, label: 'студия', description: 'Широкая рабочая сцена для проектных разворотов и мудбордов.' },
  { id: 'dashboard' as const, label: 'дашборд', description: 'Более плотная сетка с компактными аналитическими карточками.' },
  { id: 'showcase' as const, label: 'витрина', description: 'Крупные hero-карточки и широкий межсекционный ритм.' },
  { id: 'storyboard' as const, label: 'сториборд', description: 'Крупные блоки и длинный ритм для презентационных страниц.' },
]
const contentCardPresets = [
  { id: 'flat' as const, label: 'плоские', description: 'Строгие карточки без лишнего объёма.' },
  { id: 'soft' as const, label: 'мягкие', description: 'Скруглённые блоки с мягкой тенью.' },
  { id: 'glass' as const, label: 'стекло', description: 'Полупрозрачные карточки с живой кромкой.' },
  { id: 'brutal' as const, label: 'брутализм', description: 'Контрастные панели с жёсткой рамкой.' },
]
const contentScenePresets = [
  { id: 'workbench' as const, label: 'workbench', description: 'Рабочая сцена: ровная сетка и строгие панели.' },
  { id: 'registry' as const, label: 'registry', description: 'Операционный реестр для документов, задач и контроллинга.' },
  { id: 'magazine' as const, label: 'magazine', description: 'Редакционный разворот с мягкими крупными блоками.' },
  { id: 'atelier' as const, label: 'atelier', description: 'Студийная сцена для концептов, коллажей и презентаций.' },
  { id: 'ops' as const, label: 'ops', description: 'Плотная операционная панель для аналитики и статусов.' },
  { id: 'gallery' as const, label: 'gallery', description: 'Витринная сцена с воздухом и стеклянными карточками.' },
  { id: 'cinematic' as const, label: 'cinematic', description: 'Медленная презентационная сцена с драматичными переходами.' },
]
const contentLayoutRecipes: Record<(typeof contentLayoutPresets)[number]['id'], Partial<DesignTokens>> = {
  balanced: {
    containerWidth: 1180,
    gridColumns: 12,
    gridGap: 16,
    archDensity: 'normal',
    archVerticalRhythm: 1,
    archSectionStyle: 'flat',
    archCardChrome: 'visible',
  },
  registry: {
    containerWidth: 1160,
    gridColumns: 12,
    gridGap: 10,
    archDensity: 'dense',
    archVerticalRhythm: 0.75,
    archSectionStyle: 'card',
    archCardChrome: 'visible',
  },
  matrix: {
    containerWidth: 1260,
    gridColumns: 12,
    gridGap: 18,
    archDensity: 'normal',
    archVerticalRhythm: 1.1,
    archSectionStyle: 'card',
    archCardChrome: 'subtle',
  },
  editorial: {
    containerWidth: 1320,
    gridColumns: 10,
    gridGap: 24,
    archDensity: 'airy',
    archVerticalRhythm: 1.5,
    archSectionStyle: 'flat',
    archCardChrome: 'ghost',
  },
  studio: {
    containerWidth: 1360,
    gridColumns: 9,
    gridGap: 26,
    archDensity: 'airy',
    archVerticalRhythm: 1.7,
    archSectionStyle: 'flat',
    archCardChrome: 'subtle',
  },
  dashboard: {
    containerWidth: 1240,
    gridColumns: 12,
    gridGap: 12,
    archDensity: 'dense',
    archVerticalRhythm: 0.8,
    archSectionStyle: 'card',
    archCardChrome: 'visible',
  },
  showcase: {
    containerWidth: 1380,
    gridColumns: 8,
    gridGap: 28,
    archDensity: 'grand',
    archVerticalRhythm: 1.8,
    archSectionStyle: 'striped',
    archCardChrome: 'subtle',
  },
  storyboard: {
    containerWidth: 1400,
    gridColumns: 6,
    gridGap: 30,
    archDensity: 'grand',
    archVerticalRhythm: 2,
    archSectionStyle: 'striped',
    archCardChrome: 'ghost',
  },
}
const contentCardRecipes: Record<(typeof contentCardPresets)[number]['id'], Partial<DesignTokens>> = {
  flat: {
    cardRadius: 0,
    borderWidth: 1,
    glassOpacity: 0.96,
    glassBorderOpacity: 0.08,
    shadowOffsetY: 0,
    shadowBlurRadius: 0,
    shadowOpacity: 0,
    archCardChrome: 'visible',
    cardHoverAnim: 'border',
  },
  soft: {
    cardRadius: 18,
    borderWidth: 0,
    glassOpacity: 0.84,
    glassBorderOpacity: 0.03,
    shadowOffsetY: 10,
    shadowBlurRadius: 24,
    shadowOpacity: 0.1,
    archCardChrome: 'subtle',
    cardHoverAnim: 'lift',
  },
  glass: {
    cardRadius: 24,
    borderWidth: 1,
    glassBlur: 32,
    glassSaturation: 200,
    glassOpacity: 0.25,
    glassBorderOpacity: 0.35,
    shadowOffsetY: 12,
    shadowBlurRadius: 32,
    shadowOpacity: 0.15,
    archCardChrome: 'visible',
    cardHoverAnim: 'reveal',
  },
  brutal: {
    cardRadius: 0,
    borderWidth: 2,
    glassBlur: 0,
    glassOpacity: 0.98,
    glassBorderOpacity: 0.22,
    shadowOffsetY: 0,
    shadowBlurRadius: 0,
    shadowOpacity: 0,
    archCardChrome: 'visible',
    cardHoverAnim: 'border',
  },
}
const contentSceneRecipes: Record<(typeof contentScenePresets)[number]['id'], {
  layout: (typeof contentLayoutPresets)[number]['id']
  card: (typeof contentCardPresets)[number]['id']
  nav: DesignTokens['navLayoutPreset']
  pageEnter: DesignTokens['archPageEnter']
  pageDuration: number
  navTransition: DesignTokens['archNavTransition']
  navDuration: number
  extras?: Partial<DesignTokens>
}> = {
  workbench: {
    layout: 'balanced',
    card: 'flat',
    nav: 'balanced',
    pageEnter: 'fade',
    pageDuration: 260,
    navTransition: 'slide',
    navDuration: 220,
    extras: {
      archContentReveal: 'fade-up',
      btnHoverAnim: 'fill',
    },
  },
  registry: {
    layout: 'registry',
    card: 'flat',
    nav: 'compact',
    pageEnter: 'none',
    pageDuration: 0,
    navTransition: 'fade',
    navDuration: 160,
    extras: {
      archContentReveal: 'none',
      archTextReveal: 'none',
      btnHoverAnim: 'shutter',
    },
  },
  magazine: {
    layout: 'editorial',
    card: 'soft',
    nav: 'showcase',
    pageEnter: 'slide-l',
    pageDuration: 760,
    navTransition: 'push',
    navDuration: 320,
    extras: {
      archContentReveal: 'fade',
      archTextReveal: 'clip',
      btnHoverAnim: 'magnet',
    },
  },
  atelier: {
    layout: 'studio',
    card: 'glass',
    nav: 'rail',
    pageEnter: 'drift-r',
    pageDuration: 980,
    navTransition: 'blur',
    navDuration: 360,
    extras: {
      archContentReveal: 'blur',
      archTextReveal: 'blur-in',
      btnHoverAnim: 'sheen',
    },
  },
  ops: {
    layout: 'dashboard',
    card: 'brutal',
    nav: 'compact',
    pageEnter: 'none',
    pageDuration: 0,
    navTransition: 'none',
    navDuration: 0,
    extras: {
      archContentReveal: 'none',
      archTextReveal: 'none',
    },
  },
  gallery: {
    layout: 'showcase',
    card: 'glass',
    nav: 'rail',
    pageEnter: 'zoom',
    pageDuration: 860,
    navTransition: 'blur',
    navDuration: 340,
    extras: {
      archContentReveal: 'blur',
      archTextReveal: 'blur-in',
      btnHoverAnim: 'pulse',
    },
  },
  cinematic: {
    layout: 'storyboard',
    card: 'soft',
    nav: 'showcase',
    pageEnter: 'curtain',
    pageDuration: 1800,
    navTransition: 'stack',
    navDuration: 420,
    extras: {
      archContentReveal: 'fade-up',
      archTextReveal: 'letter-fade',
      btnHoverAnim: 'scan',
    },
  },
}
const navLayoutPresets = [
  { id: 'compact' as const, label: 'компактно', description: 'Плотная и быстрая вертикаль для длинных деревьев.' },
  { id: 'balanced' as const, label: 'баланс', description: 'Нейтральная раскладка для повседневной работы.' },
  { id: 'showcase' as const, label: 'витрина', description: 'Больше воздуха, крупнее блоки и выраженный ритм.' },
  { id: 'rail' as const, label: 'рейл', description: 'Собранная колонка с акцентом на компактную навигацию.' },
]
const navLayoutRecipes: Record<DesignTokens['navLayoutPreset'], Partial<DesignTokens>> = {
  compact: {
    navLayoutPreset: 'compact',
    sidebarWidth: 232,
    navItemPaddingH: 10,
    navItemPaddingV: 7,
    navPanelGap: 6,
    navListGap: 1,
    navItemRadius: 6,
    navTransitDistance: 12,
    navItemStagger: 6,
  },
  balanced: {
    navLayoutPreset: 'balanced',
    sidebarWidth: 260,
    navItemPaddingH: 16,
    navItemPaddingV: 12,
    navPanelGap: 8,
    navListGap: 2,
    navItemRadius: 0,
    navTransitDistance: 18,
    navItemStagger: 12,
  },
  showcase: {
    navLayoutPreset: 'showcase',
    sidebarWidth: 304,
    navItemPaddingH: 18,
    navItemPaddingV: 15,
    navPanelGap: 14,
    navListGap: 7,
    navItemRadius: 14,
    navTransitDistance: 24,
    navItemStagger: 18,
  },
  rail: {
    navLayoutPreset: 'rail',
    sidebarWidth: 216,
    navItemPaddingH: 12,
    navItemPaddingV: 10,
    navPanelGap: 10,
    navListGap: 6,
    navItemRadius: 999,
    navTransitDistance: 14,
    navItemStagger: 10,
  },
}
const BORDER_STYLE_OPTIONS = [
  { id: 'solid' as const, label: 'solid' },
  { id: 'dashed' as const, label: 'dashed' },
  { id: 'none' as const, label: 'none' },
]

/* ── Helpers ─────────────────────────────────────── */
type PickerOption = { id: string | number; label: string }

function selectedDesignOptions<T extends PickerOption>(options: readonly T[], selected: string | number | undefined) {
  return options.filter(option => String(option.id) === String(selected ?? ''))
}

function availableDesignOptions<T extends PickerOption>(options: readonly T[], selected: string | number | undefined) {
  return options.filter(option => String(option.id) !== String(selected ?? ''))
}

function colorInputValue(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback
  }

  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

const selectedScaleOptions = computed(() =>
  TYPE_SCALE_OPTIONS.filter(option => Math.abs(tokens.value.typeScale - option.ratio) < 0.005)
)

const availableScaleOptions = computed(() =>
  TYPE_SCALE_OPTIONS.filter(option => Math.abs(tokens.value.typeScale - option.ratio) >= 0.005)
)

const currentFontId = computed(() =>
  FONT_OPTIONS.find(f => f.value === tokens.value.fontFamily)?.id || 'system'
)

const accentColor = computed(() =>
  `hsl(${tokens.value.accentHue}, ${tokens.value.accentSaturation}%, ${tokens.value.accentLightness}%)`
)

const activePresetId = ref('')

/* ── Mode switcher: active design concept family ─── */
const activeModeSlug = computed(() => {
  return activeConceptSlug.value ? `concept-${activeConceptSlug.value}` : ''
})

function switchMode(conceptId: string) {
  const concept = DESIGN_CONCEPTS.find(c => c.id === conceptId) || DESIGN_PRESETS.find(p => p.id === conceptId)
  if (concept) {
    activePresetId.value = concept.id
    previewPreset(concept)
    confirmPreview()
  }
}

function clearMode() {
  cancelPreview()
  activePresetId.value = ''
  switchMode('concept-minale')
}

/* ── Type scale computed sizes ──────────────────── */
const typeScaleSizes = computed(() => {
  const r = tokens.value.typeScale
  const fs = tokens.value.fontSize
  return [
    { name: '3xl', size: fs * r * r * r * r },
    { name: '2xl', size: fs * r * r * r },
    { name: 'xl',  size: fs * r * r },
    { name: 'lg',  size: fs * r },
    { name: 'base', size: fs },
    { name: 'sm',  size: fs / r },
    { name: 'xs',  size: fs / r / r },
  ]
})

const currentScaleLabel = computed(() =>
  TYPE_SCALE_OPTIONS.find(s => Math.abs(s.ratio - tokens.value.typeScale) < 0.005)?.label || `${tokens.value.typeScale.toFixed(3)}`
)

const activeContentLayoutId = ref<(typeof contentLayoutPresets)[number]['id']>('balanced')
const activeContentCardPresetId = ref<(typeof contentCardPresets)[number]['id']>('flat')
const activeContentScenePresetId = ref<(typeof contentScenePresets)[number]['id']>('workbench')

const activeContentLayout = computed(() =>
  contentLayoutPresets.find(preset => preset.id === activeContentLayoutId.value) || contentLayoutPresets[0]
)

const activeContentLayoutLabel = computed(() => activeContentLayout.value.label)

const activeContentLayoutDescription = computed(() => activeContentLayout.value.description)

const contentPreviewCards = computed(() => {
  const columns = Math.max(2, Math.min(12, tokens.value.gridColumns || 12))
  const wideSpan = Math.max(2, Math.min(columns, columns >= 10 ? 6 : Math.ceil(columns * 0.6)))
  const midSpan = Math.max(2, Math.min(columns, columns >= 8 ? 4 : Math.ceil(columns / 2)))
  const smallSpan = Math.max(1, Math.min(columns, Math.ceil(columns / 3)))

  if (activeContentLayoutId.value === 'dashboard') {
    return [
      { title: 'KPI блок', eyebrow: 'метрика', text: 'Короткая сводка и статус.', span: smallSpan, accent: true },
      { title: 'Дорожная карта', eyebrow: 'процесс', text: 'Компактная аналитическая секция.', span: midSpan, accent: false },
      { title: 'Финансы', eyebrow: 'контроль', text: 'Табличный блок с плотным ритмом.', span: smallSpan, accent: false },
      { title: 'Материалы', eyebrow: 'реестр', text: 'Карточка среднего масштаба.', span: midSpan, accent: false },
      { title: 'Подрядчики', eyebrow: 'команда', text: 'Регистровая колонка с быстрым доступом.', span: midSpan, accent: false },
    ]
  }

  if (activeContentLayoutId.value === 'showcase') {
    return [
      { title: 'Hero секция', eyebrow: 'витрина', text: 'Крупный вводный блок с выразительной типографикой.', span: columns, accent: true },
      { title: 'Галерея проекта', eyebrow: 'контент', text: 'Широкая карточка для визуального нарратива.', span: wideSpan, accent: false },
      { title: 'Матрица задач', eyebrow: 'матрица', text: 'Высокая секция для ритма и навигации.', span: columns - wideSpan || midSpan, accent: false },
      { title: 'Технический блок', eyebrow: 'данные', text: 'Подчинённая карточка с сухими деталями.', span: midSpan, accent: false },
    ]
  }

  if (activeContentLayoutId.value === 'editorial') {
    return [
      { title: 'Вводный разворот', eyebrow: 'редакция', text: 'Воздух, широкий контейнер и длинные строки.', span: wideSpan, accent: true },
      { title: 'Служебные данные', eyebrow: 'поля', text: 'Вторичная колонка для сопровождающей информации.', span: columns - wideSpan || midSpan, accent: false },
      { title: 'Основной материал', eyebrow: 'контент', text: 'Крупный текстовый блок с большим межсекционным ритмом.', span: columns, accent: false },
    ]
  }

  return [
    { title: 'Обзор проекта', eyebrow: 'баланс', text: 'Ровная шапка и стабильный рабочий ритм.', span: wideSpan, accent: true },
    { title: 'Сводка', eyebrow: 'метаданные', text: 'Спутниковая карточка рядом с основным блоком.', span: columns - wideSpan || midSpan, accent: false },
    { title: 'Рабочая секция', eyebrow: 'контент', text: 'Базовая карточка для форм и регистров.', span: midSpan, accent: false },
    { title: 'Документы', eyebrow: 'реестр', text: 'Секция под таблицы и документы.', span: midSpan, accent: false },
  ]
})

const contentPreviewStyle = computed(() => ({
  '--dp-content-preview-width': `${Math.max(320, Math.min(560, tokens.value.containerWidth * 0.34))}px`,
  '--dp-content-preview-gap': `${tokens.value.gridGap}px`,
  '--dp-content-preview-columns': String(Math.max(2, Math.min(12, tokens.value.gridColumns || 12))),
  '--dp-content-preview-rhythm': String(tokens.value.archVerticalRhythm ?? 1),
}))

const menuPreviewItems = ['обзор', 'планировка', 'материалы', 'подрядчики', 'документы']

const activeNavLayout = computed(() =>
  navLayoutPresets.find(preset => preset.id === tokens.value.navLayoutPreset) || navLayoutPresets[1]
)

const activeNavLayoutLabel = computed(() => activeNavLayout.value.label)

const activeNavLayoutDescription = computed(() => activeNavLayout.value.description)

const menuPreviewStyle = computed(() => ({
  '--dp-menu-preview-width': `${Math.max(188, tokens.value.sidebarWidth - 24)}px`,
  '--dp-menu-preview-gap': `${tokens.value.navListGap + 2}px`,
  '--dp-menu-preview-radius': `${tokens.value.navItemRadius}px`,
  '--dp-menu-preview-pad-x': `${tokens.value.navItemPaddingH}px`,
  '--dp-menu-preview-pad-y': `${tokens.value.navItemPaddingV}px`,
}))

function applyNavLayoutPreset(presetId: DesignTokens['navLayoutPreset']) {
  const recipe = navLayoutRecipes[presetId]
  if (!recipe) return
  for (const [key, value] of Object.entries(recipe) as Array<[keyof DesignTokens, DesignTokens[keyof DesignTokens]]>) {
    set(key, value)
  }
}

function generateNavLayout() {
  const preset = navLayoutPresets[Math.floor(Math.random() * navLayoutPresets.length)]
  applyNavLayoutPreset(preset.id)
  set('sidebarWidth', Math.min(340, Math.max(208, tokens.value.sidebarWidth + (Math.floor(Math.random() * 5) - 2) * 8)))
  set('navItemPaddingH', Math.min(22, Math.max(8, tokens.value.navItemPaddingH + (Math.floor(Math.random() * 5) - 2))))
  set('navItemPaddingV', Math.min(18, Math.max(6, tokens.value.navItemPaddingV + (Math.floor(Math.random() * 5) - 2))))
  set('navListGap', Math.min(10, Math.max(1, tokens.value.navListGap + (Math.floor(Math.random() * 5) - 2))))
  set('navPanelGap', Math.min(18, Math.max(4, tokens.value.navPanelGap + (Math.floor(Math.random() * 5) - 2))))
}

function applyContentLayoutPreset(presetId: (typeof contentLayoutPresets)[number]['id']) {
  activeContentLayoutId.value = presetId
  const recipe = contentLayoutRecipes[presetId]
  if (!recipe) return
  for (const [key, value] of Object.entries(recipe) as Array<[keyof DesignTokens, DesignTokens[keyof DesignTokens]]>) {
    set(key, value)
  }
}

function generateContentLayout() {
  const preset = contentLayoutPresets[Math.floor(Math.random() * contentLayoutPresets.length)]
  applyContentLayoutPreset(preset.id)
  set('containerWidth', Math.min(1400, Math.max(980, tokens.value.containerWidth + (Math.floor(Math.random() * 7) - 3) * 20)))
  set('gridColumns', Math.min(12, Math.max(2, tokens.value.gridColumns + (Math.floor(Math.random() * 5) - 2))))
  set('gridGap', Math.min(32, Math.max(8, tokens.value.gridGap + (Math.floor(Math.random() * 5) - 2) * 2)))
  set('archVerticalRhythm', Math.min(2.4, Math.max(0.7, Number(((tokens.value.archVerticalRhythm ?? 1) + (Math.random() * 0.6 - 0.3)).toFixed(1)))))
}

function applyContentCardPreset(presetId: (typeof contentCardPresets)[number]['id']) {
  activeContentCardPresetId.value = presetId
  const recipe = contentCardRecipes[presetId]
  if (!recipe) return
  for (const [key, value] of Object.entries(recipe) as Array<[keyof DesignTokens, DesignTokens[keyof DesignTokens]]>) {
    set(key, value)
  }
}

function applyContentScenePreset(sceneId: (typeof contentScenePresets)[number]['id']) {
  activeContentScenePresetId.value = sceneId
  const recipe = contentSceneRecipes[sceneId]
  if (!recipe) return
  applyContentLayoutPreset(recipe.layout)
  applyContentCardPreset(recipe.card)
  applyNavLayoutPreset(recipe.nav)
  set('archPageEnter', recipe.pageEnter)
  set('pageTransitDuration', recipe.pageDuration)
  set('archNavTransition', recipe.navTransition)
  set('navTransitDuration', recipe.navDuration)
  if (recipe.extras) {
    for (const [key, value] of Object.entries(recipe.extras) as Array<[keyof DesignTokens, DesignTokens[keyof DesignTokens]]>) {
      set(key, value)
    }
  }
}

function generateContentScene() {
  const scene = contentScenePresets[Math.floor(Math.random() * contentScenePresets.length)]
  applyContentScenePreset(scene.id)
  set('containerWidth', Math.min(1400, Math.max(980, tokens.value.containerWidth + (Math.floor(Math.random() * 5) - 2) * 20)))
  set('gridGap', Math.min(32, Math.max(8, tokens.value.gridGap + (Math.floor(Math.random() * 5) - 2) * 2)))
  set('pageTransitDuration', Math.min(10000, Math.max(0, (tokens.value.pageTransitDuration ?? 280) + (Math.floor(Math.random() * 5) - 2) * 80)))
}

function generateFullDesignScene() {
  const scene = contentScenePresets[Math.floor(Math.random() * contentScenePresets.length)]
  applyContentScenePreset(scene.id)
  set('navTransitDuration', Math.min(700, Math.max(100, (tokens.value.navTransitDuration ?? 220) + (Math.floor(Math.random() * 5) - 2) * 20)))
  set('navTransitDistance', Math.min(40, Math.max(0, (tokens.value.navTransitDistance ?? 18) + (Math.floor(Math.random() * 5) - 2) * 2)))
  set('navItemStagger', Math.min(40, Math.max(0, (tokens.value.navItemStagger ?? 12) + (Math.floor(Math.random() * 5) - 2) * 2)))
  set('animDuration', Math.min(500, Math.max(80, (tokens.value.animDuration ?? 180) + (Math.floor(Math.random() * 5) - 2) * 20)))
}

function applyArchitectureTransitionPreset(presetId: (typeof archTransitionPresets)[number]['id']) {
  const preset = archTransitionPresets.find((item) => item.id === presetId)
  if (!preset) return
  for (const [key, value] of Object.entries(preset.tokens) as Array<[keyof typeof preset.tokens, (typeof preset.tokens)[keyof typeof preset.tokens]]>) {
    set(key as keyof DesignTokens, value as DesignTokens[keyof DesignTokens])
  }
}

function formatTransitionDuration(value: number) {
  if (value <= 0) return '0 сек'
  if (value < 1000) return `${value} мс`
  const seconds = value / 1000
  return `${seconds % 1 === 0 ? seconds.toFixed(0) : seconds.toFixed(1)} сек`
}

/* ── Section search filter ──────────────────────── */
const sectionSearchMap: Record<string, string[]> = {
  builder:  ['blueprint', 'app builder', 'catalog', 'app-catalog', 'сборка', 'приложение', 'menu groups', 'featured blocks', 'типизация', 'конструктор'],
  presets:  ['образ', 'рецепт', 'preset', 'minimal', 'soft', 'brutalist', 'corporate', 'editorial', 'neomorph', 'glass', 'luxury', 'playful', 'swiss', 'monochrome', 'scandinavian', 'dashboard', 'material', 'apple', 'retro', 'terminal', 'minale', 'bauhaus', 'artdeco', 'cyberpunk', 'zen', 'y2k', 'newspaper', 'pastel', 'tokyo', 'terracotta', 'arctic', 'glow', 'ink', 'bubblegum', 'blueprint', 'snohetta', 'olsonkundig', 'mvrdv', 'som', 'mad', 'архитектура'],
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
    return ws.some(w => w.includes(lower) || lower.includes(w))
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

function pickPreset(p: DesignPreset) {
  activePresetId.value = p.id
  previewPreset(p)
}

function applyCurrentStyle() {
  confirmPreview()
  appliedFlash.value = true
  setTimeout(() => { appliedFlash.value = false }, 1600)
}

function cancelCurrentPreview() {
  cancelPreview()
  activePresetId.value = ''
}

function onRange<K extends keyof DesignTokens>(key: K, e: Event) {
  set(key, Number((e.target as HTMLInputElement).value) as DesignTokens[K])
}
function onFloat<K extends keyof DesignTokens>(key: K, e: Event) {
  set(key, parseFloat((e.target as HTMLInputElement).value) as DesignTokens[K])
}

function resetAll() { cancelPreview(); dsReset(); activePresetId.value = '' }

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

<style scoped src="./UIDesignPanel.scoped.css"></style>
