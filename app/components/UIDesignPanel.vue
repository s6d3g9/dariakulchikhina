<template>
  <div class="dp-wrap">
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
      <button type="button" class="dp-topbar-btn" :class="{ 'dp-topbar-btn--active': inspectMode }" @click="toggleInspect" title="CSS-инспектор">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 2l4.5 10 1.5-3.5L11.5 7z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 8l3.5 3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        <span>css</span>
      </button>
      <span class="dp-topbar-sep" />
      <button type="button" class="dp-topbar-btn" :class="{ 'dp-topbar-btn--active': compMode }" @click="toggleComp" title="Компонентный инспектор — имя компонента и путь к файлу">
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
                  v-for="tab in tabList" :key="tab.id"
                  type="button" role="tab"
                  class="dp-tab" :class="{ 'dp-tab--active': activeTab === tab.id }"
                  @click="activeTab = tab.id"
                >{{ tab.label }}</button>
              </nav>
              <div class="dp-panel-actions">
                <div class="dp-search-wrap">
                  <svg class="dp-search-icon" width="12" height="12" viewBox="0 0 13 13" fill="none">
                    <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" stroke-width="1.2"/>
                    <path d="M8.5 8.5L12 12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                  </svg>
                  <input v-model="searchQuery" class="dp-search-input" placeholder="поиск…" type="text">
                  <button v-if="searchQuery" type="button" class="dp-search-clear" @click="searchQuery = ''">✕</button>
                </div>
                <button type="button" class="dp-icon-btn" @click="showExport = !showExport" title="Экспорт / Импорт">
                  <svg width="13" height="13" viewBox="0 0 14 14"><path d="M7 2v7M4 6l3 3 3-3M3 11h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button type="button" class="dp-icon-btn dp-icon-btn--danger" @click="resetAll" title="Сбросить">
                  <svg width="13" height="13" viewBox="0 0 14 14"><path d="M2.5 4.5h9M5.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5M4 4.5v7a1 1 0 001 1h4a1 1 0 001-1v-7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button type="button" class="dp-icon-btn" @click="open = false" title="Закрыть (Esc)">✕</button>
              </div>
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
                    class="dp-export-area"
                    :value="exportTab === 'json' ? exportJSON() : exportCSS()"
                    @input="importBuffer = ($event.target as HTMLTextAreaElement).value"
                    spellcheck="false"
                  />
                  <div class="dp-export-actions">
                    <button type="button" class="dp-sm-btn" @click="copyExport">{{ copyLabel }}</button>
                    <button v-if="exportTab === 'json'" type="button" class="dp-sm-btn" @click="doImport">импорт JSON</button>
                  </div>
                </div>
              </div>
            </Transition>

            <!-- ── Tab content ── -->
            <div class="dp-tab-content">

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

              <!-- ═══ Кнопки ═══ -->
              <div v-show="isTabVisible('buttons')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Стиль и вид</div>
                  <div class="dp-field">
                    <label class="dp-label">стиль</label>
                    <div class="dp-chips">
                      <button v-for="s in btnStyles" :key="s.id" type="button" class="dp-chip" :class="{ 'dp-chip--active': tokens.btnStyle === s.id }" @click="set('btnStyle', s.id)">{{ s.label }}</button>
                    </div>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">размер</label>
                    <div class="dp-chips">
                      <button v-for="s in btnSizes" :key="s.id" type="button" class="dp-chip" :class="{ 'dp-chip--active': tokens.btnSize === s.id }" @click="set('btnSize', s.id)">{{ s.label }}</button>
                    </div>
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">регистр</label>
                    <div class="dp-chips">
                      <button v-for="s in textTransforms" :key="s.id" type="button" class="dp-chip" :class="{ 'dp-chip--active': tokens.btnTransform === s.id }" @click="set('btnTransform', s.id)">{{ s.label }}</button>
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
                    <input type="range" min="400" max="700" step="100" :value="tokens.btnWeight" class="dp-range" @input="onRange('btnWeight', $event)">
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
                  <div class="dp-col-label">Параметры</div>
                  <div class="dp-field">
                    <label class="dp-label">размер <span class="dp-val">{{ (tokens.fontSize * 100).toFixed(0) }}%</span></label>
                    <input type="range" min="0.7" max="1.4" step="0.02" :value="tokens.fontSize" class="dp-range" @input="onFloat('fontSize', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">основной вес <span class="dp-val">{{ tokens.fontWeight }}</span></label>
                    <input type="range" min="300" max="700" step="100" :value="tokens.fontWeight" class="dp-range" @input="onRange('fontWeight', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">вес заголовков <span class="dp-val">{{ tokens.headingWeight }}</span></label>
                    <input type="range" min="500" max="900" step="100" :value="tokens.headingWeight" class="dp-range" @input="onRange('headingWeight', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">межбуквенный <span class="dp-val">{{ tokens.letterSpacing.toFixed(2) }}em</span></label>
                    <input type="range" min="-0.02" max="0.15" step="0.005" :value="tokens.letterSpacing" class="dp-range" @input="onFloat('letterSpacing', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">межстрочный <span class="dp-val">{{ tokens.lineHeight.toFixed(2) }}</span></label>
                    <input type="range" min="1.1" max="2.0" step="0.05" :value="tokens.lineHeight" class="dp-range" @input="onFloat('lineHeight', $event)">
                  </div>
                  <div class="dp-col-label" style="margin-top:10px">Абзацы</div>
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
                  <div class="dp-col-label" style="margin-top:10px">Заголовки</div>
                  <div class="dp-field">
                    <label class="dp-label">межбуквенный <span class="dp-val">{{ tokens.headingLetterSpacing.toFixed(3) }}em</span></label>
                    <input type="range" min="-0.06" max="0.15" step="0.005" :value="tokens.headingLetterSpacing" class="dp-range" @input="onFloat('headingLetterSpacing', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">межстрочный <span class="dp-val">{{ tokens.headingLineHeight.toFixed(2) }}</span></label>
                    <input type="range" min="0.9" max="2.0" step="0.05" :value="tokens.headingLineHeight" class="dp-range" @input="onFloat('headingLineHeight', $event)">
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Превью</div>
                  <div class="dp-col-label" style="margin-top:0">Выравнивание</div>
                  <div class="dp-align-group">
                    <button type="button" class="dp-align-btn" :class="{ 'dp-align-btn--active': tokens.textAlign === 'left' }" title="По левому" @click="set('textAlign', 'left')">&#xE244;</button>
                    <button type="button" class="dp-align-btn" :class="{ 'dp-align-btn--active': tokens.textAlign === 'center' }" title="По центру" @click="set('textAlign', 'center')">&#xE243;</button>
                    <button type="button" class="dp-align-btn" :class="{ 'dp-align-btn--active': tokens.textAlign === 'right' }" title="По правому" @click="set('textAlign', 'right')">&#xE245;</button>
                    <button type="button" class="dp-align-btn" :class="{ 'dp-align-btn--active': tokens.textAlign === 'justify' }" title="По ширине" @click="set('textAlign', 'justify')">&#xE242;</button>
                  </div>
                  <div class="dp-field" style="margin-top:8px">
                    <label class="dp-label">ширина абзаца <span class="dp-val">{{ tokens.paragraphMaxWidth === 0 ? '∞' : tokens.paragraphMaxWidth + 'ch' }}</span></label>
                    <input type="range" min="0" max="100" step="2" :value="tokens.paragraphMaxWidth" class="dp-range" @input="onRange('paragraphMaxWidth', $event)">
                  </div>
                  <div class="dp-live-preview" style="margin-top:8px">
                    <div class="dp-type-sample" :style="typeSampleStyle">
                      <div class="dp-type-h" :style="{ fontWeight: String(tokens.headingWeight), letterSpacing: tokens.headingLetterSpacing + 'em', lineHeight: String(tokens.headingLineHeight) }">Заголовок страницы</div>
                      <div class="dp-type-p" :style="{ textIndent: tokens.textIndent > 0 ? tokens.textIndent + 'em' : undefined, wordSpacing: tokens.wordSpacing > 0 ? tokens.wordSpacing + 'em' : undefined, textAlign: tokens.textAlign }">Дизайн-система позволяет управлять каждым визуальным элементом.</div>
                    </div>
                  </div>
                  <div class="dp-col-label" style="margin-top:10px">Шкала</div>
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
                    <input type="range" min="0" max="40" step="1" :value="tokens.glassBlur" class="dp-range" @input="onRange('glassBlur', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">прозрачность <span class="dp-val">{{ pct(tokens.glassOpacity) }}</span></label>
                    <input type="range" min="0" max="1" step="0.02" :value="tokens.glassOpacity" class="dp-range" @input="onFloat('glassOpacity', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">обводка <span class="dp-val">{{ pct(tokens.glassBorderOpacity) }}</span></label>
                    <input type="range" min="0" max="0.5" step="0.01" :value="tokens.glassBorderOpacity" class="dp-range" @input="onFloat('glassBorderOpacity', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">насыщенность <span class="dp-val">{{ tokens.glassSaturation }}%</span></label>
                    <input type="range" min="100" max="200" step="5" :value="tokens.glassSaturation" class="dp-range" @input="onRange('glassSaturation', $event)">
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
                    <div class="dp-chips">
                      <button v-for="e in EASING_OPTIONS" :key="e.id" type="button" class="dp-chip" :class="{ 'dp-chip--active': tokens.animEasing === e.id }" @click="set('animEasing', e.id)">{{ e.label }}</button>
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
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Обводки</div>
                  <div class="dp-field">
                    <label class="dp-label">толщина <span class="dp-val">{{ tokens.borderWidth }}px</span></label>
                    <input type="range" min="0" max="3" step="0.5" :value="tokens.borderWidth" class="dp-range" @input="onFloat('borderWidth', $event)">
                  </div>
                  <div class="dp-field">
                    <label class="dp-label">стиль</label>
                    <div class="dp-chips">
                      <button type="button" class="dp-chip" :class="{ 'dp-chip--active': tokens.borderStyle === 'solid' }" @click="set('borderStyle', 'solid')">solid</button>
                      <button type="button" class="dp-chip" :class="{ 'dp-chip--active': tokens.borderStyle === 'none' }" @click="set('borderStyle', 'none')">none</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ═══ Модулярная шкала ═══ -->
              <div v-show="isTabVisible('typeScale')" class="dp-page dp-page--cols">
                <div class="dp-col">
                  <div class="dp-col-label">Ratio: <strong>{{ currentScaleLabel }}</strong></div>
                  <div class="dp-chips" style="flex-wrap:wrap;gap:5px;margin-top:8px">
                    <button v-for="s in TYPE_SCALE_OPTIONS" :key="s.ratio" type="button"
                      class="dp-chip" :class="{ 'dp-chip--active': Math.abs(tokens.typeScale - s.ratio) < 0.005 }"
                      @click="set('typeScale', s.ratio)">{{ s.label }}</button>
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
                    <input
                      class="dp-demo-input"
                      placeholder="Текстовое поле"
                      :style="{
                        borderRadius: tokens.inputRadius + 'px',
                        background: `color-mix(in srgb, #1f1f1f ${Math.round(tokens.inputBgOpacity*100)}%, transparent)`,
                        border: tokens.inputBorderOpacity > 0.005
                          ? `1px solid color-mix(in srgb, #1f1f1f ${Math.round(tokens.inputBorderOpacity*100)}%, transparent)`
                          : 'none',
                        padding: '7px 10px', outline: 'none', width: '100%',
                        fontSize: 'var(--ds-text-sm, .8rem)', fontFamily: 'inherit',
                        color: 'var(--glass-text)',
                      }"
                    />
                    <select
                      class="dp-demo-input"
                      :style="{
                        borderRadius: tokens.inputRadius + 'px',
                        background: `color-mix(in srgb, #1f1f1f ${Math.round(tokens.inputBgOpacity*100)}%, transparent)`,
                        border: tokens.inputBorderOpacity > 0.005
                          ? `1px solid color-mix(in srgb, #1f1f1f ${Math.round(tokens.inputBorderOpacity*100)}%, transparent)`
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
                        background: `color-mix(in srgb, #1f1f1f ${Math.round(tokens.inputBgOpacity*100)}%, transparent)`,
                        border: tokens.inputBorderOpacity > 0.005
                          ? `1px solid color-mix(in srgb, #1f1f1f ${Math.round(tokens.inputBorderOpacity*100)}%, transparent)`
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
                        background: `color-mix(in srgb, #1f1f1f ${Math.round(tokens.chipBgOpacity*100)}%, transparent)`,
                        border: tokens.chipBorderOpacity > 0.005
                          ? `1px solid color-mix(in srgb, #1f1f1f ${Math.round(tokens.chipBorderOpacity*100)}%, transparent)`
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
                    <div class="dp-field-hint">Применяется ко всем пунктам бокового меню</div>
                  </div>
                </div>
                <div class="dp-col">
                  <div class="dp-col-label">Превью</div>
                  <div class="dp-live-preview" style="margin-top:0; flex-direction:column; gap:2px; padding:8px; border-radius:var(--card-radius,14px); background:color-mix(in srgb,var(--glass-bg) 80%,transparent)">
                    <div v-for="(item, i) in ['Обзор', 'Клиенты', 'Проекты', 'Документы']" :key="item"
                      :style="{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '7px 10px',
                        borderRadius: tokens.navItemRadius + 'px',
                        background: i === 0 ? 'color-mix(in srgb, var(--glass-bg) 92%, transparent)' : 'transparent',
                        fontWeight: i === 0 ? '600' : '400',
                        opacity: i === 0 ? '1' : '0.65',
                        fontSize: 'var(--ds-text-sm, .8rem)',
                        fontFamily: 'inherit',
                        color: 'var(--glass-text)',
                        cursor: 'pointer',
                      }"
                    >{{ item }}</div>
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

    <!-- ═══ Component Inspector ═══ -->
    <Teleport to="body">
      <div v-if="compMode" class="dp-comp-layer">
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
</template>

<script setup lang="ts">
import {
  useDesignSystem, FONT_OPTIONS, BTN_SIZE_MAP, EASING_OPTIONS, DESIGN_PRESETS,
  TYPE_SCALE_OPTIONS,
  type DesignTokens, type DesignPreset,
} from '~/composables/useDesignSystem'

const {
  tokens, set, reset: dsReset, applyPreset,
  undo, redo, canUndo, canRedo,
  exportJSON, importJSON, exportCSS,
  previewPreset, confirmPreview, cancelPreview, isPreviewActive,
} = useDesignSystem()
const { themeId, applyThemeWithTokens, UI_THEMES } = useUITheme()
const { isDark } = useThemeToggle()

const open = ref(false)
const showExport = ref(false)
const exportTab = ref<'json' | 'css'>('json')
const importBuffer = ref('')
const copyLabel = ref('копировать')
const animPlaying = ref(false)
const searchQuery = ref('')
const appliedFlash = ref(false)

/* ── Tab navigation ─────────────────────────────── */
const activeTab = ref('presets')
const tabList = [
  { id: 'presets',   label: 'рецепты' },
  { id: 'palette',   label: 'палитра' },
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
]
// kept for inspect-mode compatibility
const sections = reactive({ presets: true, palette: true, buttons: false, type: false, typeScale: false, surface: false, radii: false, anim: false, grid: false, darkMode: false, inputs: false, tags: false, nav: false, statuses: false, popups: false, scrollbar: false, tables: false, badges: false })
function toggle(key: keyof typeof sections) { activeTab.value = key }

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

/* ── Helpers ─────────────────────────────────────── */
const currentFontId = computed(() =>
  FONT_OPTIONS.find(f => f.value === tokens.value.fontFamily)?.id || 'system'
)

const accentColor = computed(() =>
  `hsl(${tokens.value.accentHue}, ${tokens.value.accentSaturation}%, ${tokens.value.accentLightness}%)`
)

const activePresetId = ref('')

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

/* ── Section search filter ──────────────────────── */
const sectionSearchMap: Record<string, string[]> = {
  presets:  ['рецепт', 'preset', 'minimal', 'soft', 'brutalist', 'corporate', 'editorial', 'neomorph', 'glass', 'luxury', 'playful', 'swiss', 'monochrome', 'scandinavian', 'dashboard', 'material', 'apple', 'retro', 'terminal'],
  palette:  ['палитра', 'цвет', 'акцент', 'color', 'theme', 'accent', 'hue', 'статусы', 'success', 'успех', 'ошибка', 'error', 'warning', 'предупреждение'],
  buttons:  ['кнопк', 'button', 'стиль', 'размер', 'закругл', 'регистр', 'btn'],
  type:     ['типограф', 'шрифт', 'font', 'размер', 'вес', 'межбукв', 'межстроч', 'letter', 'line-height'],
  typeScale: ['масштаб', 'scale', 'шкала', 'ratio', 'модуляр'],
  surface:  ['стекло', 'glass', 'поверхность', 'размытие', 'blur', 'тень', 'shadow', 'прозрачн'],
  radii:    ['скруглен', 'radius', 'отступ', 'spacing', 'карточ', 'chip', 'modal'],
  anim:     ['анимац', 'animation', 'easing', 'длительн', 'duration'],
  grid:     ['сетк', 'grid', 'макет', 'layout', 'контейнер', 'container', 'sidebar', 'обводк', 'border'],
  darkMode: ['тёмн', 'темн', 'dark', 'mode', 'elevation', 'saturation'],
  inputs:   ['инпут', 'поле', 'ввод', 'input', 'text field', 'textarea', 'border opacity', 'прозрачн'],
  tags:     ['тег', 'чип', 'badge', 'chip', 'tag', 'пилюля', 'метка', 'padding'],
  nav:      ['навиг', 'sidebar', 'menu', 'пункт', 'nav', 'меню'],
  statuses: ['статус', 'пин', 'status', 'pin bar', 'badge', 'прогресс', 'дорожная карта', 'roadmap'],
  popups:   ['попап', 'popup', 'dropdown', 'оверлей', 'overlay', 'modal', 'blur', 'затемн'],
  scrollbar: ['скроллбар', 'scrollbar', 'полоса прокрутки', 'ширина', 'width', 'прозрач'],
  tables:   ['таблиц', 'table', 'таблетк', 'строка', 'заголовок', 'row', 'header', 'border', 'hover'],
  badges:   ['значок', 'значки', 'badge', 'counter', 'счётчик', 'уведомлени', 'notification'],
}

function isTabVisible(key: string): boolean {
  if (searchQuery.value.trim()) {
    // When searching, show the first matching tab automatically
    const q = searchQuery.value.toLowerCase()
    const words = sectionSearchMap[key] || []
    const matches = words.some(w => w.includes(q) || q.includes(w))
    if (matches && activeTab.value !== key) {
      // Auto-switch to best matching tab
      const matchingTabs = tabList.filter(t => {
        const ws = sectionSearchMap[t.id] || []
        return ws.some(w => w.includes(q) || q.includes(w))
      })
      if (matchingTabs.length > 0 && matchingTabs[0]?.id === key) {
        activeTab.value = key
      }
    }
    return activeTab.value === key
  }
  return activeTab.value === key
}

function pct(v: number) { return `${(v * 100).toFixed(0)}%` }

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
  if (importJSON(importBuffer.value)) {
    showExport.value = false
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
  const bg = t.btnStyle === 'filled' || t.btnStyle === 'soft' ? 'rgba(0,0,0,0.07)' : 'transparent'
  const border = t.btnStyle === 'ghost' || t.btnStyle === 'soft' ? 'transparent' : 'rgba(0,0,0,0.14)'
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
    border: `1px solid rgba(0,0,0,0.12)`, fontFamily: t.fontFamily,
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

const typeSampleStyle = computed(() => {
  const t = tokens.value
  return {
    fontFamily: t.fontFamily, fontSize: `${t.fontSize}rem`,
    fontWeight: String(t.fontWeight), letterSpacing: `${t.letterSpacing}em`,
    lineHeight: String(t.lineHeight),
    wordSpacing: t.wordSpacing > 0 ? `${t.wordSpacing}em` : 'normal',
    textAlign: t.textAlign as string,
    maxWidth: t.paragraphMaxWidth > 0 ? `${t.paragraphMaxWidth}ch` : 'none',
  }
})

const surfaceStyle = computed(() => {
  const t = tokens.value
  return {
    backdropFilter: `blur(${t.glassBlur}px) saturate(${t.glassSaturation}%)`,
    WebkitBackdropFilter: `blur(${t.glassBlur}px) saturate(${t.glassSaturation}%)`,
    background: `rgba(255,255,255,${t.glassOpacity})`,
    border: `${t.borderWidth}px ${t.borderStyle} rgba(0,0,0,${t.glassBorderOpacity})`,
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
})

interface InspectResult {
  tag: string
  classes: string
  sections: string[]
  tokenInfo: { name: string; value: string }[]
  rect: { x: number; y: number; w: number; h: number }
}
const inspectResult = ref<InspectResult | null>(null)

const sectionLabels: Record<string, string> = {
  presets: 'Рецепты', palette: 'Палитра', buttons: 'Кнопки',
  type: 'Типографика', typeScale: 'Шкала', surface: 'Поверхности',
  radii: 'Скругления', anim: 'Анимация', grid: 'Сетка', darkMode: 'Тёмная тема',
  inputs: 'Инпуты', tags: 'Теги/чипы', nav: 'Навигация', statuses: 'Статусы', popups: 'Попапы',
  scrollbar: 'Скроллбар', tables: 'Таблицы', badges: 'Значки',
}

/* ─── Quick-edit token controls ─────────────────────────────────────────────
   Used in the inspect result panel to render inline sliders per section.
─────────────────────────────────────────────────────────────────────────── */
type QEControl = { key: keyof DesignTokens; label: string; min: number; max: number; step: number; isFloat?: boolean; fmt: (v: number) => string }
const TOKEN_CONTROLS: Record<string, QEControl[]> = {
  buttons: [
    { key: 'btnRadius', label: 'скругление', min: 0, max: 32, step: 1, fmt: v => v + 'px' },
    { key: 'btnWeight', label: 'жирность', min: 400, max: 700, step: 100, fmt: v => String(v) },
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
    { key: 'glassBlur', label: 'размытие', min: 0, max: 40, step: 1, fmt: v => v + 'px' },
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
         !!el.closest('.dp-inspect-tooltip') || !!el.closest('.dp-overlay')
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
  inspectHover.visible = true
}

function onInspectClick(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
  if (!el || isInsidePanel(el)) return

  const rect = el.getBoundingClientRect()
  const secs = detectSections(el)
  const tokenInfo = getTokenInfo(el, secs)
  const cls = el.className?.toString?.() || ''

  inspectResult.value = {
    tag: el.tagName.toLowerCase(),
    classes: cls.split(/\s+/).filter(c => c && !c.startsWith('dp-')).slice(0, 4).join('.'),
    sections: secs,
    tokenInfo,
    rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
  }
}

function jumpToSection(sec: string) {
  if (!open.value) open.value = true
  activeTab.value = sec
  disableInspect()
}

function toggleInspect() {
  if (inspectMode.value) {
    disableInspect()
  } else {
    enableInspect()
  }
}

function enableInspect() {
  inspectMode.value = true
  inspectResult.value = null
  document.addEventListener('mousemove', onInspectMove, true)
  document.addEventListener('click', onInspectClick, true)
  document.body.style.cursor = 'crosshair'
}

function disableInspect() {
  inspectMode.value = false
  inspectHover.visible = false
  inspectResult.value = null
  document.removeEventListener('mousemove', onInspectMove, true)
  document.removeEventListener('click', onInspectClick, true)
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
          document.documentElement.style.setProperty('--dp-panel-h', h + 'px')
        })
        panelRO.observe(panelEl.value)
      }
      document.addEventListener('mousedown', onOutsideClick, true)
    })
  } else {
    panelRO?.disconnect()
    panelRO = null
    document.documentElement.style.setProperty('--dp-panel-h', '0px')
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
  if (compMode.value) {
    compMode.value = false; compHover.visible = false; compResult.value = null
    document.removeEventListener('mousemove', onCompMove, true)
    document.removeEventListener('click', onCompClick, true)
    document.body.style.cursor = ''
  } else {
    compMode.value = true; compResult.value = null
    document.addEventListener('mousemove', onCompMove, true)
    document.addEventListener('click', onCompClick, true)
    document.body.style.cursor = 'crosshair'
  }
}

/* ── Keyboard ────────────────────────────────────── */
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && compMode.value) { toggleComp(); return }
  if (e.key === 'Escape' && inspectMode.value) { disableInspect(); return }
  if (e.key === 'Escape' && open.value) { open.value = false; return }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && open.value) { e.preventDefault(); undo() }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y' && open.value) { e.preventDefault(); redo() }
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('mousedown', onOutsideClick, true)
  if (inspectMode.value) disableInspect()
  if (compMode.value) toggleComp()
  panelRO?.disconnect()
  document.documentElement.style.setProperty('--dp-panel-h', '0px')
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   UIDesignPanel v2 — world-class slide-out design control
   ═══════════════════════════════════════════════════════════ */

/* ── Top bar ── */
.dp-topbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 9998;
  display: flex; align-items: center; gap: 2px;
  height: 28px; padding: 0 10px;
  background: rgba(24, 24, 26, .92);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,.06);
  font-size: .6rem; color: rgba(255,255,255,.7);
  transition: background .15s;
}
.dp-topbar--open { background: rgba(24, 24, 26, .97); }
.dp-topbar--inspect { background: rgba(20, 50, 80, .95); }

.dp-topbar-sep {
  width: 1px; height: 14px; background: rgba(255,255,255,.1); margin: 0 4px; flex-shrink: 0;
}

.dp-trigger {
  display: inline-flex; align-items: center; gap: 5px;
  border: none; background: transparent; color: rgba(255,255,255,.85);
  border-radius: 4px; padding: 3px 8px;
  font-size: .6rem; letter-spacing: .03em; cursor: pointer;
  font-family: inherit; transition: all .12s;
}
.dp-trigger:hover { background: rgba(255,255,255,.08); color: #fff; }
.dp-trigger-icon { display: flex; opacity: .6; }
.dp-trigger-label { line-height: 1; }

.dp-topbar-btn {
  display: inline-flex; align-items: center; gap: 4px;
  border: none; background: transparent; color: rgba(255,255,255,.6);
  border-radius: 4px; padding: 3px 7px;
  font-size: .56rem; cursor: pointer; font-family: inherit;
  transition: all .12s; white-space: nowrap;
}
.dp-topbar-btn:hover:not(:disabled) { background: rgba(255,255,255,.08); color: rgba(255,255,255,.9); }
.dp-topbar-btn:disabled { opacity: .2; cursor: default; }
.dp-topbar-btn--active {
  background: hsl(200, 80%, 50%) !important; color: #fff !important;
  border-radius: 4px;
}

.dp-topbar-preset {
  font-size: .52rem; padding: 1px 7px; border-radius: 3px;
  background: rgba(255,255,255,.08); color: rgba(255,255,255,.45);
  letter-spacing: .04em; text-transform: uppercase; font-weight: 500;
}

/* ── Panel (horizontal dropdown) ── */
.dp-panel {
  position: fixed; top: 28px; left: 0; right: 0; z-index: 10001;
  max-height: min(580px, 68vh);
  background: var(--glass-page-bg, #f4f4f2);
  border-bottom: 1px solid rgba(0,0,0,.08);
  box-shadow: 0 12px 40px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.07);
  display: flex; flex-direction: column; overflow: hidden;
}
:global(html.dark) .dp-panel { background: #111113; border-bottom-color: rgba(255,255,255,.08); }

/* ── Panel top row: tabs + actions ── */
.dp-panel-toprow {
  display: flex; align-items: stretch; justify-content: space-between;
  border-bottom: 1px solid rgba(0,0,0,.06); flex-shrink: 0;
  min-height: 38px;
}
:global(html.dark) .dp-panel-toprow { border-bottom-color: rgba(255,255,255,.06); }

/* ── Tabs ── */
.dp-tabs {
  display: flex; align-items: stretch; overflow-x: auto; gap: 0;
  scrollbar-width: none;
}
.dp-tabs::-webkit-scrollbar { display: none; }

.dp-tab {
  display: inline-flex; align-items: center; padding: 0 14px;
  border: none; background: transparent; cursor: pointer;
  font-family: inherit; font-size: .62rem; color: var(--glass-text);
  opacity: .4; letter-spacing: .05em; text-transform: uppercase;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: opacity .12s, border-color .12s; white-space: nowrap;
}
.dp-tab:hover { opacity: .75; }
.dp-tab--active {
  opacity: 1; font-weight: 700;
  border-bottom-color: var(--ds-accent, hsl(220,60%,55%));
  color: var(--ds-accent, hsl(220,60%,55%));
}
:global(html.dark) .dp-tab { color: rgba(255,255,255,.6); }
:global(html.dark) .dp-tab--active { color: hsl(200, 80%, 65%); border-bottom-color: hsl(200, 80%, 65%); }

/* ── Panel actions (search + buttons) ── */
.dp-panel-actions {
  display: flex; align-items: center; gap: 6px; padding: 0 12px; flex-shrink: 0;
}

/* ── Search inside actions ── */
.dp-search-wrap {
  display: flex; align-items: center; gap: 6px;
  border: 1px solid rgba(0,0,0,.08); border-radius: 6px;
  padding: 4px 10px; background: rgba(0,0,0,.02);
}
:global(html.dark) .dp-search-wrap { border-color: rgba(255,255,255,.08); background: rgba(255,255,255,.03); }
.dp-search-icon { opacity: .3; flex-shrink: 0; color: var(--glass-text); }
.dp-search-input {
  border: none; background: transparent; outline: none;
  font-size: .66rem; color: var(--glass-text); font-family: inherit;
  width: 140px; letter-spacing: .02em;
}
.dp-search-input::placeholder { color: var(--glass-text); opacity: .3; }
.dp-search-clear {
  background: none; border: none; color: var(--glass-text);
  opacity: .3; cursor: pointer; font-size: .6rem; padding: 2px;
}
.dp-search-clear:hover { opacity: .7; }

.dp-icon-btn {
  width: 28px; height: 28px; border: 1px solid rgba(0,0,0,.06);
  background: transparent; color: var(--glass-text); border-radius: 6px;
  font-size: .66rem; cursor: pointer; display: flex; align-items: center;
  justify-content: center; opacity: .45; transition: opacity .12s, background .12s;
}
.dp-icon-btn:hover:not(:disabled) { opacity: 1; background: rgba(0,0,0,.03); }
.dp-icon-btn:disabled { opacity: .15; cursor: default; }
.dp-icon-btn--danger:hover:not(:disabled) { background: rgba(200,40,40,.06); color: #a03030; }
:global(html.dark) .dp-icon-btn { border-color: rgba(255,255,255,.08); }
:global(html.dark) .dp-icon-btn:hover:not(:disabled) { background: rgba(255,255,255,.05); }

/* ── Export drawer ── */
.dp-export {
  border-bottom: 1px solid rgba(0,0,0,.05); flex-shrink: 0;
  background: rgba(0,0,0,.015);
}
.dp-export-inner {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 10px 16px;
}
.dp-export-tabs { display: flex; gap: 4px; flex-direction: column; }
.dp-export-tab {
  padding: 3px 10px; border-radius: 4px; border: 1px solid rgba(0,0,0,.08);
  background: transparent; font-size: .62rem; cursor: pointer; opacity: .5;
  font-family: inherit; color: var(--glass-text); transition: all .12s; white-space: nowrap;
}
.dp-export-tab.active { opacity: 1; background: rgba(0,0,0,.05); font-weight: 600; }
.dp-export-area {
  flex: 1; height: 80px; border: 1px solid rgba(0,0,0,.08);
  border-radius: 6px; background: transparent; color: var(--glass-text);
  font-size: .62rem; font-family: 'JetBrains Mono', monospace; padding: 8px;
  resize: none; outline: none;
}
.dp-export-actions { display: flex; flex-direction: column; gap: 4px; }
:global(html.dark) .dp-export { background: rgba(255,255,255,.02); }
:global(html.dark) .dp-export-area { border-color: rgba(255,255,255,.08); }

.dp-sm-btn {
  padding: 4px 10px; border-radius: 4px; border: 1px solid rgba(0,0,0,.1);
  background: transparent; font-size: .62rem; cursor: pointer; opacity: .65;
  font-family: inherit; color: var(--glass-text); transition: all .12s;
}
.dp-sm-btn:hover { opacity: 1; }

/* ── Tab content area ── */
.dp-tab-content {
  flex: 1; overflow-y: auto; overflow-x: hidden; min-height: 0;
  scrollbar-width: thin; scrollbar-color: rgba(0,0,0,.08) transparent;
}

/* ── Page (one tab page) ── */
.dp-page {
  padding: 16px 20px 20px;
}
.dp-page--cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0 24px;
  align-items: start;
}

/* ── Column ── */
.dp-col { padding-right: 0; }
.dp-col--wide { grid-column: span 2; }
.dp-col-label {
  font-size: .55rem; letter-spacing: .1em; text-transform: uppercase;
  opacity: .35; font-weight: 700; margin-bottom: 10px; color: var(--glass-text);
  border-bottom: 1px solid rgba(0,0,0,.05); padding-bottom: 6px;
}
:global(html.dark) .dp-col-label { border-bottom-color: rgba(255,255,255,.05); }

/* ── Presets grid in presets tab ── */
.dp-presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 6px;
}
.dp-preset-card {
  display: flex; flex-direction: column; align-items: flex-start; gap: 3px;
  padding: 10px 12px; border-radius: 8px; border: 1px solid transparent;
  background: transparent; cursor: pointer; font-family: inherit;
  color: var(--glass-text); transition: all .12s; text-align: left; width: 100%;
}
.dp-preset-card:hover { background: rgba(0,0,0,.025); }
.dp-preset-card--active { border-color: rgba(0,0,0,.14); background: rgba(0,0,0,.03); }
.dp-preset-icon { font-size: .9rem; opacity: .6; margin-bottom: 2px; }
.dp-preset-name { font-size: .66rem; font-weight: 600; }
.dp-preset-desc { font-size: .54rem; opacity: .4; line-height: 1.3; }
:global(html.dark) .dp-preset-card:hover { background: rgba(255,255,255,.03); }
:global(html.dark) .dp-preset-card--active { border-color: rgba(255,255,255,.14); background: rgba(255,255,255,.04); }

/* ── Accent color big preview ── */
.dp-accent-preview-big {
  width: 100%; height: 40px; border-radius: 8px;
  border: 1px solid rgba(0,0,0,.08); margin-bottom: 2px;
}
:global(html.dark) .dp-accent-preview-big { border-color: rgba(255,255,255,.08); }

/* Status row (palette tab — success/warning/error) */
.dp-status-row {
  display: flex; align-items: center; gap: 7px;
  margin-bottom: 4px;
}
.dp-status-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(0,0,0,.06);
}
.dp-status-name {
  font-size: .6rem; color: var(--glass-text); opacity: .55; letter-spacing: .04em;
}

/* ── Swatch grid in palette tab ── */
.dp-swatch-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 5px;
}

/* (section/chevron styles removed — replaced by tabs) */

/* ── Field ── */
.dp-field { margin-bottom: 10px; }
.dp-field--mt { margin-top: 12px; }
.dp-label {
  display: flex; align-items: center; justify-content: space-between;
  font-size: .66rem; color: var(--glass-text); opacity: .65;
  margin-bottom: 5px; letter-spacing: .02em;
}
.dp-val {
  font-variant-numeric: tabular-nums; opacity: .5; font-size: .6rem; font-weight: 500;
  min-width: 36px; text-align: right;
}

.dp-separator { height: 1px; background: rgba(0,0,0,.04); margin: 12px 0; }
:global(html.dark) .dp-separator { background: rgba(255,255,255,.04); }

/* ── Range ── */
.dp-range {
  -webkit-appearance: none; appearance: none; width: 100%; height: 3px;
  border-radius: 2px; background: rgba(0,0,0,.08); outline: none; cursor: pointer;
}
.dp-range::-webkit-slider-thumb {
  -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%;
  background: var(--glass-text, #2c2c2a); border: 2px solid var(--glass-page-bg, #f4f4f2);
  box-shadow: 0 1px 4px rgba(0,0,0,.12); cursor: pointer; transition: transform .1s;
}
.dp-range::-webkit-slider-thumb:hover { transform: scale(1.2); }
.dp-range::-moz-range-thumb {
  width: 13px; height: 13px; border-radius: 50%;
  background: var(--glass-text, #2c2c2a); border: 2px solid var(--glass-page-bg, #f4f4f2);
  box-shadow: 0 1px 4px rgba(0,0,0,.12); cursor: pointer;
}
.dp-range--hue { background: linear-gradient(to right, hsl(0,70%,50%),hsl(60,70%,50%),hsl(120,70%,50%),hsl(180,70%,50%),hsl(240,70%,50%),hsl(300,70%,50%),hsl(360,70%,50%)); }
:global(html.dark) .dp-range { background: rgba(255,255,255,.1); }
:global(html.dark) .dp-range::-webkit-slider-thumb { background: #ddd; border-color: #111; }
:global(html.dark) .dp-range::-moz-range-thumb { background: #ddd; border-color: #111; }

/* ── Chips ── */
.dp-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.dp-chip {
  padding: 3px 10px; border-radius: 999px; border: 1px solid rgba(0,0,0,.08);
  background: transparent; color: var(--glass-text); font-size: .62rem;
  letter-spacing: .02em; cursor: pointer; font-family: inherit;
  opacity: .5; transition: all .12s;
}
.dp-chip:hover { opacity: .8; }
.dp-chip--active { opacity: 1; background: rgba(0,0,0,.06); border-color: rgba(0,0,0,.18); font-weight: 600; }
:global(html.dark) .dp-chip { border-color: rgba(255,255,255,.08); }
:global(html.dark) .dp-chip--active { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.2); }

/* (old presets grid removed — see .dp-presets-grid above) */
.dp-swatch-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 7px 3px; border-radius: 7px; border: 1px solid transparent;
  background: transparent; cursor: pointer; font-family: inherit; transition: all .12s;
}
.dp-swatch-btn:hover { background: rgba(0,0,0,.025); }
.dp-swatch-btn--active { border-color: rgba(0,0,0,.15); background: rgba(0,0,0,.03); }
.dp-swatch { width: 26px; height: 26px; border-radius: 50%; border: 1.5px solid rgba(0,0,0,.09); box-shadow: inset 0 1px 3px rgba(0,0,0,.05); }
.dp-swatch-name { font-size: .52rem; letter-spacing: .03em; opacity: .45; white-space: nowrap; color: var(--glass-text); }
.dp-swatch-btn--active .dp-swatch-name { opacity: 1; font-weight: 600; }
:global(html.dark) .dp-swatch-btn--active { border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.04); }
:global(html.dark) .dp-swatch { border-color: rgba(255,255,255,.12); }

/* ── Accent color row ── */
.dp-accent-row { display: flex; gap: 10px; align-items: flex-start; }
.dp-accent-preview { width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(0,0,0,.08); flex-shrink: 0; }
.dp-accent-controls { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.dp-micro-field { display: flex; align-items: center; gap: 5px; }
.dp-micro-label { font-size: .54rem; opacity: .4; width: 10px; font-weight: 600; }
.dp-micro-val { font-size: .54rem; opacity: .4; width: 30px; text-align: right; font-variant-numeric: tabular-nums; }

/* ── Font grid ── */
.dp-font-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; }
.dp-font-btn {
  padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(0,0,0,.06);
  background: transparent; cursor: pointer; font-size: .66rem;
  color: var(--glass-text); opacity: .5; text-align: left; transition: all .12s;
}
.dp-font-btn:hover { opacity: .8; background: rgba(0,0,0,.02); }
.dp-font-btn--active { opacity: 1; border-color: rgba(0,0,0,.16); background: rgba(0,0,0,.03); font-weight: 600; }
:global(html.dark) .dp-font-btn { border-color: rgba(255,255,255,.06); }
:global(html.dark) .dp-font-btn--active { border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.04); }

/* ── Live preview areas ── */
.dp-live-preview {
  margin-top: 8px; border-radius: 8px;
  background: rgba(0,0,0,.02); padding: 10px; position: relative;
}
.dp-live-label {
  position: absolute; top: 4px; right: 8px;
  font-size: .48rem; letter-spacing: .1em; text-transform: uppercase;
  opacity: .25; font-weight: 600;
}
:global(html.dark) .dp-live-preview { background: rgba(255,255,255,.02); }

/* Button preview */
.dp-btn-preview { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dp-demo-btn {
  color: var(--glass-text); cursor: default; font-family: inherit; transition: none;
}

/* Type preview */
.dp-type-sample { padding: 4px 0; }
.dp-type-h { font-size: 1.05em; margin-bottom: 6px; }
.dp-type-p { font-size: .82em; opacity: .65; }

/* Surface preview */
.dp-surface-demo {
  padding: 14px; border-radius: 8px;
  background: repeating-conic-gradient(rgba(0,0,0,.03) 0% 25%, transparent 0% 50%) 0 0 / 12px 12px;
}
.dp-surface-card { padding: 16px; }
.dp-surface-title { font-size: .72rem; font-weight: 600; margin-bottom: 4px; color: var(--glass-text); }
.dp-surface-text { font-size: .64rem; opacity: .5; color: var(--glass-text); }
:global(html.dark) .dp-surface-demo { background: repeating-conic-gradient(rgba(255,255,255,.03) 0% 25%, transparent 0% 50%) 0 0 / 12px 12px; }

/* Radii preview */
.dp-radii-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.dp-radii-box {
  aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(0,0,0,.1); background: rgba(0,0,0,.015); font-size: .52rem;
  opacity: .5; color: var(--glass-text); transition: border-radius .15s;
}
:global(html.dark) .dp-radii-box { border-color: rgba(255,255,255,.08); background: rgba(255,255,255,.02); }

/* Animation preview */
.dp-anim-demo { display: flex; align-items: center; gap: 10px; min-height: 30px; }
.dp-anim-ball {
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--glass-text); opacity: .3;
  transform: translateX(0); transition-property: transform, opacity;
}
.dp-anim-ball--moved { transform: translateX(120px); opacity: .8; }

/* ── Transitions (slide down from top) ── */
.dp-slide-enter-active { transition: opacity .18s ease, transform .22s cubic-bezier(0.16,1,0.3,1); }
.dp-slide-leave-active { transition: opacity .14s ease, transform .14s ease; }
.dp-slide-enter-from { opacity: 0; transform: translateY(-12px); }
.dp-slide-leave-to { opacity: 0; transform: translateY(-8px); }

.dp-collapse-enter-active { transition: max-height .2s ease, opacity .2s ease; overflow: hidden; }
.dp-collapse-leave-active { transition: max-height .15s ease, opacity .15s ease; overflow: hidden; }
.dp-collapse-enter-from { max-height: 0; opacity: 0; }
.dp-collapse-enter-to { max-height: 1200px; opacity: 1; }
.dp-collapse-leave-from { max-height: 1200px; opacity: 1; }
.dp-collapse-leave-to { max-height: 0; opacity: 0; }

.dp-drawer-enter-active { transition: max-height .18s ease, opacity .18s ease; overflow: hidden; }
.dp-drawer-leave-active { transition: max-height .12s ease, opacity .12s ease; overflow: hidden; }
.dp-drawer-enter-from { max-height: 0; opacity: 0; }
.dp-drawer-enter-to { max-height: 300px; opacity: 1; }
.dp-drawer-leave-from { max-height: 300px; opacity: 1; }
.dp-drawer-leave-to { max-height: 0; opacity: 0; }

/* ── Mobile ── */
@media (max-width: 640px) {
  .dp-page--cols { grid-template-columns: 1fr; }
  .dp-col--wide { grid-column: span 1; }
  .dp-tabs { overflow-x: auto; }
  .dp-search-input { width: 80px; }
  .dp-presets-grid { grid-template-columns: repeat(2, 1fr); }
}

/* (search bar moved to panel-actions — see .dp-search-wrap above) */

/* ── Type scale visual ── */
.dp-scale-visual { display: flex; flex-direction: column; gap: 3px; }
.dp-scale-row {
  display: flex; align-items: baseline; gap: 8px;
  line-height: 1.3; color: var(--glass-text);
}
.dp-scale-name { font-size: .5rem; opacity: .3; width: 28px; text-align: right; font-variant-numeric: tabular-nums; }
.dp-scale-sample { flex: 1; }
.dp-scale-px { font-size: .48rem; opacity: .3; font-variant-numeric: tabular-nums; }

/* ── Text align buttons ── */
.dp-align-group { display: flex; gap: 4px; margin: 4px 0 2px; }
.dp-align-btn {
  flex: 1; height: 28px; border-radius: 5px; border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06); color: rgba(255,255,255,.55);
  cursor: pointer; font-size: .7rem; display: flex; align-items: center; justify-content: center;
  transition: background .12s, color .12s;
}
.dp-align-btn:hover { background: rgba(255,255,255,.12); color: rgba(255,255,255,.85); }
.dp-align-btn--active { background: rgba(255,255,255,.18) !important; color: hsl(200,80%,70%) !important; border-color: rgba(255,255,255,.25); }

/* ── Dark mode preview ── */
.dp-dark-preview { background: #0a0a0c !important; border-radius: 10px; overflow: hidden; }
.dp-dark-cards { display: flex; flex-direction: column; gap: 6px; padding: 4px; }
.dp-dark-card { padding: 12px; }
.dp-dark-card-title { font-size: .72rem; font-weight: 600; margin-bottom: 3px; }
.dp-dark-card-text { font-size: .62rem; line-height: 1.5; }

/* ── Field hint ── */
.dp-field-hint {
  font-size: .54rem; opacity: .3; margin-top: 3px; letter-spacing: .01em;
  color: var(--glass-text);
}

/* ── Sticky footer ── */
.dp-footer {
  flex-shrink: 0; position: relative;
  border-top: 1px solid rgba(0,0,0,.05);
  min-height: 0;
}
:global(html.dark) .dp-footer { border-top-color: rgba(255,255,255,.05); }

.dp-footer-preview {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; gap: 8px;
  background: rgba(0,0,0,.02);
}
:global(html.dark) .dp-footer-preview { background: rgba(255,255,255,.02); }

.dp-preview-badge {
  display: flex; align-items: center; gap: 6px;
  font-size: .62rem; letter-spacing: .04em; opacity: .6;
  font-weight: 500; color: var(--glass-text);
}
.dp-preview-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: hsl(38, 90%, 55%);
  animation: dp-pulse 1.4s ease infinite;
}
@keyframes dp-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .5; transform: scale(.85); }
}

.dp-footer-actions { display: flex; gap: 6px; }

.dp-footer-cancel {
  padding: 6px 14px; border-radius: 6px; border: 1px solid rgba(0,0,0,.1);
  background: transparent; font-size: .64rem; cursor: pointer;
  font-family: inherit; color: var(--glass-text); opacity: .5;
  transition: all .12s;
}
.dp-footer-cancel:hover { opacity: .8; }
:global(html.dark) .dp-footer-cancel { border-color: rgba(255,255,255,.1); }

.dp-footer-apply {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 18px; border-radius: 6px; border: none;
  background: var(--ds-accent, hsl(220,14%,50%));
  color: #fff; font-size: .66rem; font-weight: 600;
  cursor: pointer; font-family: inherit;
  letter-spacing: .03em; transition: all .15s;
  box-shadow: 0 2px 8px rgba(0,0,0,.12);
}
.dp-footer-apply:hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,.15); }
.dp-footer-apply:active { transform: translateY(0); }

.dp-applied-toast {
  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
  padding: 6px 16px; border-radius: 8px;
  background: hsl(142, 60%, 42%); color: #fff;
  font-size: .64rem; font-weight: 600; letter-spacing: .03em;
  box-shadow: 0 4px 16px rgba(0,0,0,.15);
  pointer-events: none; white-space: nowrap;
  margin-bottom: 8px;
}

/* ── Fade transition ── */
.dp-fade-enter-active { transition: opacity .2s ease, transform .2s ease; }
.dp-fade-leave-active { transition: opacity .15s ease, transform .15s ease; }
.dp-fade-enter-from { opacity: 0; transform: translateY(6px); }
.dp-fade-leave-to { opacity: 0; transform: translateY(6px); }

/* ── Presets: 2-column grid for many presets ── */
@media (max-width: 480px) {
  .dp-presets { grid-template-columns: 1fr; }
}

/* ══════════════════════════════════════════════════════
   INSPECT MODE STYLES
   ══════════════════════════════════════════════════════ */
.dp-icon-btn--inspect-active {
  opacity: 1 !important;
  background: hsl(200, 80%, 50%) !important;
  color: #fff !important;
  border-color: hsl(200, 80%, 45%) !important;
}

.dp-inspect-overlay {
  position: fixed; inset: 0; z-index: 9999;
  pointer-events: none;
}

.dp-inspect-highlight {
  position: fixed; pointer-events: none;
  border: 2px solid hsl(200, 85%, 55%);
  background: hsla(200, 85%, 55%, .08);
  border-radius: 3px;
  transition: all .08s ease;
  box-shadow: 0 0 0 1px hsla(200, 85%, 55%, .2), 0 0 12px hsla(200, 85%, 55%, .1);
}

.dp-inspect-tooltip {
  position: fixed; pointer-events: none;
  background: hsl(220, 20%, 16%); color: #e8e8eb;
  padding: 5px 9px; border-radius: 6px;
  font-size: .6rem; line-height: 1.4;
  box-shadow: 0 4px 16px rgba(0,0,0,.25);
  max-width: 280px; z-index: 10001;
  white-space: nowrap;
}
.dp-inspect-tag {
  color: hsl(200, 80%, 70%); font-weight: 600;
}
.dp-inspect-classes {
  color: hsl(35, 80%, 70%); margin-left: 4px; font-size: .56rem;
}
.dp-inspect-props {
  display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px;
}
.dp-inspect-prop-chip {
  padding: 1px 6px; border-radius: 3px;
  background: hsla(200, 80%, 55%, .2); color: hsl(200, 80%, 75%);
  font-size: .52rem; font-weight: 500;
}

/* ── Inspect result card ── */
.dp-inspect-result {
  position: fixed; z-index: 10002; pointer-events: auto;
  width: 260px; max-height: 360px; overflow-y: auto;
  background: hsl(220, 20%, 14%); color: #e0e0e4;
  border-radius: 10px; padding: 0;
  box-shadow: 0 8px 32px rgba(0,0,0,.35), 0 0 0 1px hsla(200, 80%, 55%, .15);
  font-size: .62rem;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.1) transparent;
}
.dp-inspect-result-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px 6px; border-bottom: 1px solid rgba(255,255,255,.06);
}
.dp-inspect-result-tag {
  font-size: .7rem; font-weight: 700; color: hsl(200, 80%, 70%);
}
.dp-inspect-result-close {
  background: none; border: none; color: rgba(255,255,255,.3);
  cursor: pointer; font-size: .6rem; padding: 2px 4px;
}
.dp-inspect-result-close:hover { color: rgba(255,255,255,.7); }

.dp-inspect-result-info { padding: 8px 12px 12px; }
.dp-inspect-result-classes {
  color: hsl(35, 80%, 70%); font-size: .58rem; margin-bottom: 8px;
}
.dp-inspect-result-sections { margin-bottom: 10px; }
.dp-inspect-result-label {
  display: block; font-size: .52rem; text-transform: uppercase;
  letter-spacing: .1em; opacity: .35; margin-bottom: 5px; font-weight: 600;
}
.dp-inspect-section-link {
  display: inline-block; padding: 3px 9px; border-radius: 4px;
  background: hsla(200, 80%, 55%, .15); color: hsl(200, 80%, 70%);
  border: 1px solid hsla(200, 80%, 55%, .2);
  font-size: .58rem; font-weight: 600; cursor: pointer;
  font-family: inherit; margin: 0 3px 3px 0;
  transition: all .12s;
}
.dp-inspect-section-link:hover {
  background: hsla(200, 80%, 55%, .3); color: #fff;
}

.dp-inspect-result-tokens { margin-top: 4px; }
.dp-inspect-token-list { display: flex; flex-direction: column; gap: 2px; }
.dp-inspect-token-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 3px 6px; border-radius: 4px;
  background: rgba(255,255,255,.03);
}
.dp-inspect-token-name {
  font-size: .56rem; color: hsl(300, 40%, 75%); font-weight: 500;
}
.dp-inspect-token-value {
  font-size: .54rem; color: rgba(255,255,255,.5);
  font-family: 'JetBrains Mono', monospace;
  max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ── Quick-edit section inside inspect result ── */
.dp-inspect-result { max-height: 480px; width: 300px !important; }
.dp-qe-section {
  padding: 8px 12px 4px;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.dp-qe-label {
  font-size: .5rem; text-transform: uppercase; letter-spacing: .12em;
  opacity: .35; font-weight: 700; margin-bottom: 7px;
  color: hsl(200, 60%, 70%);
}
.dp-qe-row {
  display: grid;
  grid-template-columns: 56px 1fr 34px;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.dp-qe-name {
  font-size: .57rem; color: rgba(255,255,255,.55); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.dp-qe-range {
  -webkit-appearance: none; appearance: none;
  height: 3px; border-radius: 99px;
  background: rgba(255,255,255,.12); outline: none; cursor: pointer;
  width: 100%;
}
.dp-qe-range::-webkit-slider-thumb {
  -webkit-appearance: none; width: 12px; height: 12px;
  border-radius: 50%; background: hsl(200, 80%, 62%);
  cursor: pointer; box-shadow: 0 0 0 2px rgba(0,0,0,.3);
  transition: transform .1s;
}
.dp-qe-range::-webkit-slider-thumb:hover { transform: scale(1.25); }
.dp-qe-range::-moz-range-thumb {
  width: 12px; height: 12px; border-radius: 50%;
  background: hsl(200, 80%, 62%); border: none; cursor: pointer;
}
.dp-qe-val {
  font-size: .55rem; color: hsl(200, 60%, 70%);
  font-variant-numeric: tabular-nums; text-align: right;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  white-space: nowrap;
}

/* ══════════════════════════════════════════════════════
   COMPONENT INSPECTOR STYLES
   ══════════════════════════════════════════════════════ */
.dp-comp-layer {
  position: fixed; inset: 0; z-index: 10003;
  pointer-events: none;
}

/* Hover highlight box (like CSS inspector) */
.dp-comp-highlight {
  position: fixed; pointer-events: none;
  border: 2px solid hsl(215, 85%, 60%);
  background: hsla(215, 85%, 60%, .08);
  border-radius: 3px;
  transition: all .08s ease;
  box-shadow: 0 0 0 1px hsla(215, 85%, 60%, .2), 0 0 12px hsla(215, 85%, 60%, .1);
}

/* Hover tooltip (follows cursor) */
.dp-comp-tooltip {
  position: fixed; pointer-events: none;
  background: hsl(230, 18%, 11%); color: #e0e4f0;
  border-radius: 7px; padding: 6px 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,.35), 0 0 0 1px hsla(220, 70%, 65%, .18);
  font-size: .62rem; line-height: 1.4;
  max-width: 320px;
  display: flex; flex-direction: column; gap: 3px;
}
.dp-comp-tag {
  font-weight: 700; color: hsl(215, 85%, 72%); font-size: .66rem; white-space: nowrap;
}
.dp-comp-path {
  font-size: .57rem; color: rgba(255,255,255,.45); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; max-width: 300px;
}
.dp-comp-hint {
  font-size: .52rem; color: rgba(255,255,255,.3); letter-spacing: .04em;
}
.dp-comp-link {
  font-size: .55rem; color: hsl(145, 65%, 55%); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; max-width: 300px;
  font-family: 'JetBrains Mono', monospace;
}

/* Locked result card */
.dp-comp-result {
  position: fixed; z-index: 10004; pointer-events: auto;
  width: 240px;
  background: hsl(230, 18%, 11%); color: #e0e4f0;
  border-radius: 10px; padding: 0;
  box-shadow: 0 8px 32px rgba(0,0,0,.4), 0 0 0 1px hsla(215, 80%, 65%, .18);
  font-size: .62rem; overflow: hidden;
}
.dp-comp-result-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px 5px; border-bottom: 1px solid rgba(255,255,255,.06);
}
.dp-comp-result-label {
  font-size: .5rem; text-transform: uppercase; letter-spacing: .12em;
  color: rgba(255,255,255,.3); font-weight: 700;
}
.dp-comp-close {
  background: none; border: none; color: rgba(255,255,255,.3);
  cursor: pointer; font-size: .6rem; padding: 2px 4px; line-height: 1;
}
.dp-comp-close:hover { color: rgba(255,255,255,.7); }
.dp-comp-result-name {
  padding: 10px 12px 2px;
  font-size: .78rem; font-weight: 700; color: hsl(215, 85%, 72%);
  letter-spacing: .01em;
}
.dp-comp-result-path {
  padding: 0 12px 10px;
  font-size: .56rem; color: hsl(35, 70%, 65%);
  font-family: 'JetBrains Mono', monospace; letter-spacing: .01em;
}
.dp-comp-result-link {
  padding: 8px 12px;
  border-top: 1px solid rgba(255,255,255,.06);
  border-bottom: 1px solid rgba(255,255,255,.06);
  display: flex; flex-direction: column; gap: 2px;
}
.dp-comp-result-link-label {
  font-size: .48rem; text-transform: uppercase; letter-spacing: .1em;
  color: rgba(255,255,255,.3); font-weight: 600;
}
.dp-comp-result-link-value {
  font-size: .58rem; color: hsl(145, 65%, 55%);
  font-family: 'JetBrains Mono', monospace; letter-spacing: .01em;
  word-break: break-all;
}
.dp-comp-copy-btn {
  display: flex; align-items: center; gap: 6px;
  width: 100%; padding: 9px 12px; border: none; background: transparent;
  color: rgba(255,255,255,.55); font-size: .62rem; cursor: pointer;
  font-family: inherit; letter-spacing: .02em;
  transition: background .1s, color .1s;
}
.dp-comp-copy-btn:hover { background: rgba(255,255,255,.06); color: #fff; }

/* ── Inupt / select preview elements (inputs tab) ── */
.dp-demo-input {
  display: block; width: 100%;
  font-family: inherit; font-size: var(--ds-text-sm, .8rem);
  color: var(--glass-text);
  /* background/border/radius are applied inline via :style binding */
}
</style>
