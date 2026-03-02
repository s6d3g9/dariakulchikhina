<template>
  <div class="dp-wrap">
    <!-- ═══ Trigger ═══ -->
    <button type="button" class="dp-trigger" @click.stop="open = !open" title="Дизайн-система">
      <svg class="dp-trigger-icon" width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 3h11M2 7.5h11M2 12h11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        <circle cx="5" cy="3" r="1.5" fill="currentColor"/>
        <circle cx="10" cy="7.5" r="1.5" fill="currentColor"/>
        <circle cx="6.5" cy="12" r="1.5" fill="currentColor"/>
      </svg>
      <span class="dp-trigger-label">дизайн</span>
    </button>

    <!-- ═══ Panel ═══ -->
    <Teleport to="body">
      <Transition name="dp-slide">
        <div v-if="open" class="dp-overlay" @click.self="open = false">
          <div class="dp-panel" @click.stop>

            <!-- ── Header ── -->
            <header class="dp-header">
              <div class="dp-header-left">
                <span class="dp-title">Дизайн-система</span>
                <span class="dp-version">v2</span>
              </div>
              <div class="dp-header-actions">
                <button type="button" class="dp-icon-btn" :disabled="!canUndo" @click="undo" title="Отменить (Ctrl+Z)">
                  <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 7h8M3 7l3-3M3 7l3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button type="button" class="dp-icon-btn" :disabled="!canRedo" @click="redo" title="Повторить (Ctrl+Y)">
                  <svg width="14" height="14" viewBox="0 0 14 14"><path d="M11 7H3M11 7l-3-3M11 7l-3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button type="button" class="dp-icon-btn" @click="showExport = !showExport" title="Экспорт / Импорт">
                  <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 2v7M4 6l3 3 3-3M3 11h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button type="button" class="dp-icon-btn" :class="{ 'dp-icon-btn--inspect-active': inspectMode }" @click="toggleInspect" title="Инспектор элементов">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l4.5 10 1.5-3.5L11.5 7z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 8l3.5 3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                </button>
                <button type="button" class="dp-icon-btn dp-icon-btn--danger" @click="resetAll" title="Сбросить всё">
                  <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2.5 4.5h9M5.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5M4 4.5v7a1 1 0 001 1h4a1 1 0 001-1v-7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <button type="button" class="dp-icon-btn" @click="open = false" title="Закрыть (Esc)">✕</button>
              </div>
            </header>

            <!-- ── Export/Import drawer ── -->
            <Transition name="dp-drawer">
              <div v-if="showExport" class="dp-export">
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
            </Transition>

            <!-- ── Body ── -->
            <div class="dp-search-bar">
              <svg class="dp-search-icon" width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" stroke-width="1.2"/>
                <path d="M8.5 8.5L12 12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
              </svg>
              <input
                v-model="searchQuery"
                class="dp-search-input"
                placeholder="Поиск настроек…"
                type="text"
              >
              <button v-if="searchQuery" type="button" class="dp-search-clear" @click="searchQuery = ''">✕</button>
            </div>

            <div class="dp-body">

              <!-- ═══ S0: Design Presets ═══ -->
              <section class="dp-section" v-show="isSectionVisible('presets')">
                <button class="dp-section-header" @click="toggle('presets')">
                  <span class="dp-section-title">рецепты дизайна</span>
                  <span class="dp-chevron" :class="{ 'dp-chevron--open': sections.presets }">›</span>
                </button>
                <Transition name="dp-collapse">
                  <div v-if="sections.presets" class="dp-section-body">
                    <div class="dp-presets">
                      <button
                        v-for="p in DESIGN_PRESETS"
                        :key="p.id"
                        type="button"
                        class="dp-preset-card"
                        :class="{ 'dp-preset-card--active': activePresetId === p.id }"
                        @click="pickPreset(p)"
                      >
                        <span class="dp-preset-icon">{{ p.icon }}</span>
                        <span class="dp-preset-info">
                          <span class="dp-preset-name">{{ p.name }}</span>
                          <span class="dp-preset-desc">{{ p.description }}</span>
                        </span>
                      </button>
                    </div>
                  </div>
                </Transition>
              </section>

              <!-- ═══ S1: Color palette ═══ -->
              <section class="dp-section" v-show="isSectionVisible('palette')">
                <button class="dp-section-header" @click="toggle('palette')">
                  <span class="dp-section-title">палитра</span>
                  <span class="dp-chevron" :class="{ 'dp-chevron--open': sections.palette }">›</span>
                </button>
                <Transition name="dp-collapse">
                  <div v-if="sections.palette" class="dp-section-body">
                    <div class="dp-preset-grid">
                      <button
                        v-for="t in UI_THEMES"
                        :key="t.id"
                        type="button"
                        class="dp-swatch-btn"
                        :class="{ 'dp-swatch-btn--active': themeId === t.id }"
                        @click="pickTheme(t.id)"
                      >
                        <span class="dp-swatch" :style="{ background: t.swatch }" />
                        <span class="dp-swatch-name">{{ t.label }}</span>
                      </button>
                    </div>

                    <!-- Accent color -->
                    <div class="dp-field dp-field--mt">
                      <label class="dp-label">акцентный цвет</label>
                      <div class="dp-accent-row">
                        <div class="dp-accent-preview" :style="{ background: accentColor }" />
                        <div class="dp-accent-controls">
                          <div class="dp-micro-field">
                            <span class="dp-micro-label">H</span>
                            <input type="range" min="0" max="360" step="1" :value="tokens.accentHue" class="dp-range dp-range--hue" @input="onRange('accentHue', $event)">
                            <span class="dp-micro-val">{{ tokens.accentHue }}°</span>
                          </div>
                          <div class="dp-micro-field">
                            <span class="dp-micro-label">S</span>
                            <input type="range" min="0" max="100" step="1" :value="tokens.accentSaturation" class="dp-range" @input="onRange('accentSaturation', $event)">
                            <span class="dp-micro-val">{{ tokens.accentSaturation }}%</span>
                          </div>
                          <div class="dp-micro-field">
                            <span class="dp-micro-label">L</span>
                            <input type="range" min="20" max="80" step="1" :value="tokens.accentLightness" class="dp-range" @input="onRange('accentLightness', $event)">
                            <span class="dp-micro-val">{{ tokens.accentLightness }}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </section>

              <!-- ═══ S2: Buttons ═══ -->
              <section class="dp-section" v-show="isSectionVisible('buttons')">
                <button class="dp-section-header" @click="toggle('buttons')">
                  <span class="dp-section-title">кнопки</span>
                  <span class="dp-chevron" :class="{ 'dp-chevron--open': sections.buttons }">›</span>
                </button>
                <Transition name="dp-collapse">
                  <div v-if="sections.buttons" class="dp-section-body">
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
                      <label class="dp-label">закругление <span class="dp-val">{{ tokens.btnRadius }}px</span></label>
                      <input type="range" min="0" max="32" step="1" :value="tokens.btnRadius" class="dp-range" @input="onRange('btnRadius', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">насыщенность <span class="dp-val">{{ tokens.btnWeight }}</span></label>
                      <input type="range" min="400" max="700" step="100" :value="tokens.btnWeight" class="dp-range" @input="onRange('btnWeight', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">регистр</label>
                      <div class="dp-chips">
                        <button v-for="s in textTransforms" :key="s.id" type="button" class="dp-chip" :class="{ 'dp-chip--active': tokens.btnTransform === s.id }" @click="set('btnTransform', s.id)">{{ s.label }}</button>
                      </div>
                    </div>
                    <!-- live preview -->
                    <div class="dp-live-preview">
                      <span class="dp-live-label">превью</span>
                      <div class="dp-btn-preview">
                        <button type="button" class="dp-demo-btn" :style="previewBtnStyle">Сохранить</button>
                        <button type="button" class="dp-demo-btn dp-demo-btn--sm" :style="previewSmBtnStyle">Отмена</button>
                        <button type="button" class="dp-demo-btn dp-demo-btn--ghost" :style="previewGhostBtnStyle">Ещё</button>
                      </div>
                    </div>
                  </div>
                </Transition>
              </section>

              <!-- ═══ S3: Typography ═══ -->
              <section class="dp-section" v-show="isSectionVisible('type')">
                <button class="dp-section-header" @click="toggle('type')">
                  <span class="dp-section-title">типографика</span>
                  <span class="dp-chevron" :class="{ 'dp-chevron--open': sections.type }">›</span>
                </button>
                <Transition name="dp-collapse">
                  <div v-if="sections.type" class="dp-section-body">
                    <div class="dp-field">
                      <label class="dp-label">шрифт</label>
                      <div class="dp-font-grid">
                        <button
                          v-for="f in FONT_OPTIONS"
                          :key="f.id"
                          type="button"
                          class="dp-font-btn"
                          :class="{ 'dp-font-btn--active': currentFontId === f.id }"
                          :style="{ fontFamily: f.value }"
                          @click="pickFont(f.id)"
                        >{{ f.label }}</button>
                      </div>
                    </div>
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
                    <div class="dp-field">
                      <label class="dp-label">абзацы <span class="dp-val">{{ tokens.paragraphSpacing.toFixed(2) }}rem</span></label>
                      <input type="range" min="0" max="2" step="0.05" :value="tokens.paragraphSpacing" class="dp-range" @input="onFloat('paragraphSpacing', $event)">
                    </div>
                    <!-- Type preview -->
                    <div class="dp-live-preview">
                      <span class="dp-live-label">превью</span>
                      <div class="dp-type-sample" :style="typeSampleStyle">
                        <div class="dp-type-h" :style="{ fontWeight: String(tokens.headingWeight) }">Заголовок страницы</div>
                        <div class="dp-type-p">Дизайн-система позволяет управлять каждым визуальным элементом: типографикой, цветами, отступами, скруглениями и анимациями.</div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </section>

              <!-- ═══ S4: Surfaces ═══ -->
              <section class="dp-section" v-show="isSectionVisible('surface')">
                <button class="dp-section-header" @click="toggle('surface')">
                  <span class="dp-section-title">поверхности и стекло</span>
                  <span class="dp-chevron" :class="{ 'dp-chevron--open': sections.surface }">›</span>
                </button>
                <Transition name="dp-collapse">
                  <div v-if="sections.surface" class="dp-section-body">
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

                    <div class="dp-separator" />

                    <div class="dp-field">
                      <label class="dp-label">тень Y <span class="dp-val">{{ tokens.shadowOffsetY }}px</span></label>
                      <input type="range" min="0" max="24" step="1" :value="tokens.shadowOffsetY" class="dp-range" @input="onRange('shadowOffsetY', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">тень размытие <span class="dp-val">{{ tokens.shadowBlurRadius }}px</span></label>
                      <input type="range" min="0" max="64" step="1" :value="tokens.shadowBlurRadius" class="dp-range" @input="onRange('shadowBlurRadius', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">тень spread <span class="dp-val">{{ tokens.shadowSpread }}px</span></label>
                      <input type="range" min="-8" max="8" step="1" :value="tokens.shadowSpread" class="dp-range" @input="onRange('shadowSpread', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">тень прозрачность <span class="dp-val">{{ pct(tokens.shadowOpacity) }}</span></label>
                      <input type="range" min="0" max="0.4" step="0.01" :value="tokens.shadowOpacity" class="dp-range" @input="onFloat('shadowOpacity', $event)">
                    </div>
                    <!-- Surface preview -->
                    <div class="dp-live-preview">
                      <span class="dp-live-label">превью</span>
                      <div class="dp-surface-demo">
                        <div class="dp-surface-card" :style="surfaceStyle">
                          <div class="dp-surface-title">Карточка</div>
                          <div class="dp-surface-text">Пример поверхности с текущими настройками стекла и теней.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </section>

              <!-- ═══ S5: Radii & Spacing ═══ -->
              <section class="dp-section" v-show="isSectionVisible('radii')">
                <button class="dp-section-header" @click="toggle('radii')">
                  <span class="dp-section-title">скругления и отступы</span>
                  <span class="dp-chevron" :class="{ 'dp-chevron--open': sections.radii }">›</span>
                </button>
                <Transition name="dp-collapse">
                  <div v-if="sections.radii" class="dp-section-body">
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
                      <label class="dp-label">модальные окна <span class="dp-val">{{ tokens.modalRadius }}px</span></label>
                      <input type="range" min="0" max="28" step="1" :value="tokens.modalRadius" class="dp-range" @input="onRange('modalRadius', $event)">
                    </div>
                    <div class="dp-separator" />
                    <div class="dp-field">
                      <label class="dp-label">базовый юнит <span class="dp-val">{{ tokens.spacingBase }}px</span></label>
                      <input type="range" min="2" max="12" step="1" :value="tokens.spacingBase" class="dp-range" @input="onRange('spacingBase', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">масштаб <span class="dp-val">{{ pct(tokens.spacingScale) }}</span></label>
                      <input type="range" min="0.6" max="1.8" step="0.05" :value="tokens.spacingScale" class="dp-range" @input="onFloat('spacingScale', $event)">
                    </div>
                    <!-- Radii preview -->
                    <div class="dp-live-preview">
                      <span class="dp-live-label">превью</span>
                      <div class="dp-radii-row">
                        <div class="dp-radii-box" :style="{ borderRadius: tokens.cardRadius + 'px' }">card</div>
                        <div class="dp-radii-box" :style="{ borderRadius: tokens.inputRadius + 'px' }">input</div>
                        <div class="dp-radii-box" :style="{ borderRadius: tokens.chipRadius + 'px' }">chip</div>
                        <div class="dp-radii-box" :style="{ borderRadius: tokens.modalRadius + 'px' }">modal</div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </section>

              <!-- ═══ S6: Animation ═══ -->
              <section class="dp-section" v-show="isSectionVisible('anim')">
                <button class="dp-section-header" @click="toggle('anim')">
                  <span class="dp-section-title">анимация</span>
                  <span class="dp-chevron" :class="{ 'dp-chevron--open': sections.anim }">›</span>
                </button>
                <Transition name="dp-collapse">
                  <div v-if="sections.anim" class="dp-section-body">
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
                    <!-- Anim preview -->
                    <div class="dp-live-preview">
                      <span class="dp-live-label">превью</span>
                      <div class="dp-anim-demo">
                        <div
                          class="dp-anim-ball"
                          :style="{ transitionDuration: tokens.animDuration + 'ms', transitionTimingFunction: tokens.animEasing }"
                          :class="{ 'dp-anim-ball--moved': animPlaying }"
                        />
                        <button type="button" class="dp-sm-btn" @click="playAnim">▶ запуск</button>
                      </div>
                    </div>
                  </div>
                </Transition>
              </section>

              <!-- ═══ S7: Grid / Layout ═══ -->
              <section class="dp-section" v-show="isSectionVisible('grid')">
                <button class="dp-section-header" @click="toggle('grid')">
                  <span class="dp-section-title">сетка и макет</span>
                  <span class="dp-chevron" :class="{ 'dp-chevron--open': sections.grid }">›</span>
                </button>
                <Transition name="dp-collapse">
                  <div v-if="sections.grid" class="dp-section-body">
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
                    <div class="dp-separator" />
                    <div class="dp-field">
                      <label class="dp-label">толщина обводки <span class="dp-val">{{ tokens.borderWidth }}px</span></label>
                      <input type="range" min="0" max="3" step="0.5" :value="tokens.borderWidth" class="dp-range" @input="onFloat('borderWidth', $event)">
                    </div>
                    <div class="dp-field">
                      <label class="dp-label">стиль обводки</label>
                      <div class="dp-chips">
                        <button type="button" class="dp-chip" :class="{ 'dp-chip--active': tokens.borderStyle === 'solid' }" @click="set('borderStyle', 'solid')">solid</button>
                        <button type="button" class="dp-chip" :class="{ 'dp-chip--active': tokens.borderStyle === 'none' }" @click="set('borderStyle', 'none')">none</button>
                      </div>
                    </div>
                  </div>
                </Transition>
              </section>

              <!-- ═══ S8: Type Scale ═══ -->
              <section class="dp-section" v-show="isSectionVisible('typeScale')">
                <button class="dp-section-header" @click="toggle('typeScale')">
                  <span class="dp-section-title">модулярная шкала</span>
                  <span class="dp-chevron" :class="{ 'dp-chevron--open': sections.typeScale }">›</span>
                </button>
                <Transition name="dp-collapse">
                  <div v-if="sections.typeScale" class="dp-section-body">
                    <div class="dp-field">
                      <label class="dp-label">ratio <span class="dp-val">{{ currentScaleLabel }}</span></label>
                      <div class="dp-chips">
                        <button
                          v-for="s in TYPE_SCALE_OPTIONS"
                          :key="s.ratio"
                          type="button"
                          class="dp-chip"
                          :class="{ 'dp-chip--active': Math.abs(tokens.typeScale - s.ratio) < 0.005 }"
                          @click="set('typeScale', s.ratio)"
                        >{{ s.label }}</button>
                      </div>
                    </div>
                    <!-- Type scale visual -->
                    <div class="dp-live-preview">
                      <span class="dp-live-label">шкала</span>
                      <div class="dp-scale-visual">
                        <div
                          v-for="s in typeScaleSizes"
                          :key="s.name"
                          class="dp-scale-row"
                          :style="{ fontSize: s.size + 'rem', fontFamily: tokens.fontFamily }"
                        >
                          <span class="dp-scale-name">{{ s.name }}</span>
                          <span class="dp-scale-sample">Аа</span>
                          <span class="dp-scale-px">{{ (s.size * 16).toFixed(0) }}px</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </section>

              <!-- ═══ S9: Dark Mode Fine-tuning ═══ -->
              <section class="dp-section" v-show="isSectionVisible('darkMode')">
                <button class="dp-section-header" @click="toggle('darkMode')">
                  <span class="dp-section-title">тёмная тема</span>
                  <span class="dp-chevron" :class="{ 'dp-chevron--open': sections.darkMode }">›</span>
                </button>
                <Transition name="dp-collapse">
                  <div v-if="sections.darkMode" class="dp-section-body">
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
                    <!-- Dark mode preview -->
                    <div class="dp-live-preview dp-dark-preview">
                      <span class="dp-live-label">превью</span>
                      <div class="dp-dark-cards">
                        <div
                          class="dp-dark-card"
                          :style="{
                            background: `hsl(220, ${tokens.darkSaturation}%, ${8 + tokens.darkElevation * 0.5}%)`,
                            borderRadius: tokens.cardRadius + 'px',
                            border: `${tokens.borderWidth}px ${tokens.borderStyle} hsl(220, ${tokens.darkSaturation * 0.3}%, ${15 + tokens.darkElevation}%)`,
                          }"
                        >
                          <div class="dp-dark-card-title" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.2}%, 88%)` }">Карточка</div>
                          <div class="dp-dark-card-text" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.15}%, 62%)` }">Пример текста в тёмной теме с текущими настройками.</div>
                        </div>
                        <div
                          class="dp-dark-card"
                          :style="{
                            background: `hsl(220, ${tokens.darkSaturation}%, ${10 + tokens.darkElevation * 0.8}%)`,
                            borderRadius: tokens.cardRadius + 'px',
                            border: `${tokens.borderWidth}px ${tokens.borderStyle} hsl(220, ${tokens.darkSaturation * 0.3}%, ${15 + tokens.darkElevation}%)`,
                          }"
                        >
                          <div class="dp-dark-card-title" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.2}%, 88%)` }">Элевация +1</div>
                          <div class="dp-dark-card-text" :style="{ color: `hsl(220, ${tokens.darkSaturation * 0.15}%, 62%)` }">Вложенная поверхность с большей яркостью.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </section>

            </div><!-- /.dp-body -->

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
        </div>
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
          </div>
        </Transition>
        <!-- Click result panel -->
        <Transition name="dp-fade">
          <div v-if="inspectResult" class="dp-inspect-result" :style="inspectResultStyle">
            <div class="dp-inspect-result-header">
              <span class="dp-inspect-result-tag">{{ inspectResult.tag }}</span>
              <button type="button" class="dp-inspect-result-close" @click="inspectResult = null">✕</button>
            </div>
            <div class="dp-inspect-result-info">
              <div v-if="inspectResult.classes" class="dp-inspect-result-classes">.{{ inspectResult.classes }}</div>
              <div class="dp-inspect-result-sections">
                <span class="dp-inspect-result-label">Связанные секции:</span>
                <button
                  v-for="s in inspectResult.sections"
                  :key="s"
                  type="button"
                  class="dp-inspect-section-link"
                  @click="jumpToSection(s)"
                >{{ sectionLabels[s] || s }}</button>
              </div>
              <div class="dp-inspect-result-tokens">
                <span class="dp-inspect-result-label">Токены:</span>
                <div class="dp-inspect-token-list">
                  <div v-for="tk in inspectResult.tokenInfo" :key="tk.name" class="dp-inspect-token-row">
                    <span class="dp-inspect-token-name">{{ tk.name }}</span>
                    <span class="dp-inspect-token-value">{{ tk.value }}</span>
                  </div>
                </div>
              </div>
            </div>
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
const { themeId, applyTheme, UI_THEMES } = useUITheme()

const open = ref(false)
const showExport = ref(false)
const exportTab = ref<'json' | 'css'>('json')
const importBuffer = ref('')
const copyLabel = ref('копировать')
const animPlaying = ref(false)
const searchQuery = ref('')
const appliedFlash = ref(false)

/* ── Collapsible sections ─────────────────────────── */
const sections = reactive({
  presets: true,
  palette: true,
  buttons: false,
  type: false,
  typeScale: false,
  surface: false,
  radii: false,
  anim: false,
  grid: false,
  darkMode: false,
})
function toggle(key: keyof typeof sections) { sections[key] = !sections[key] }

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
  palette:  ['палитра', 'цвет', 'акцент', 'color', 'theme', 'accent', 'hue'],
  buttons:  ['кнопк', 'button', 'стиль', 'размер', 'закругл', 'регистр', 'btn'],
  type:     ['типограф', 'шрифт', 'font', 'размер', 'вес', 'межбукв', 'межстроч', 'letter', 'line-height'],
  typeScale: ['масштаб', 'scale', 'шкала', 'ratio', 'модуляр'],
  surface:  ['стекло', 'glass', 'поверхность', 'размытие', 'blur', 'тень', 'shadow', 'прозрачн'],
  radii:    ['скруглен', 'radius', 'отступ', 'spacing', 'карточ', 'chip', 'modal'],
  anim:     ['анимац', 'animation', 'easing', 'длительн', 'duration'],
  grid:     ['сетк', 'grid', 'макет', 'layout', 'контейнер', 'container', 'sidebar', 'обводк', 'border'],
  darkMode: ['тёмн', 'темн', 'dark', 'mode', 'elevation', 'saturation'],
}

function isSectionVisible(key: string): boolean {
  if (!searchQuery.value.trim()) return true
  const q = searchQuery.value.toLowerCase()
  const words = sectionSearchMap[key] || []
  return words.some(w => w.includes(q) || q.includes(w))
}

function pct(v: number) { return `${(v * 100).toFixed(0)}%` }

function pickFont(id: string) {
  const f = FONT_OPTIONS.find(o => o.id === id)
  if (f) set('fontFamily', f.value)
}
function pickTheme(id: string) { applyTheme(id) }

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
}

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
  const leftEdge = r.x + r.w + 12
  const useLeft = leftEdge + 260 < window.innerWidth
  return {
    top: `${Math.max(8, Math.min(r.y, window.innerHeight - 300))}px`,
    left: useLeft ? `${leftEdge}px` : `${Math.max(8, r.x - 272)}px`,
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
  // Open panel if needed
  if (!open.value) open.value = true
  // Open the section
  const key = sec as keyof typeof sections
  if (key in sections) {
    sections[key] = true
  }
  // Scroll to it after DOM update
  nextTick(() => {
    const sectionEl = document.querySelector(`.dp-body .dp-section:nth-child(${getSectionIndex(sec) + 1})`)
    sectionEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
  // Exit inspect mode
  disableInspect()
}

function getSectionIndex(sec: string): number {
  const order = ['presets', 'palette', 'buttons', 'type', 'surface', 'radii', 'anim', 'grid', 'typeScale', 'darkMode']
  return order.indexOf(sec)
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

/* ── Keyboard ────────────────────────────────────── */
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && inspectMode.value) { disableInspect(); return }
  if (e.key === 'Escape' && open.value) { open.value = false; return }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && open.value) { e.preventDefault(); undo() }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y' && open.value) { e.preventDefault(); redo() }
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  if (inspectMode.value) disableInspect()
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════
   UIDesignPanel v2 — world-class slide-out design control
   ═══════════════════════════════════════════════════════════ */

/* ── Trigger ── */
.dp-trigger {
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid var(--btn-sm-border, rgba(0,0,0,.11));
  background: var(--btn-sm-bg, transparent); color: var(--btn-color, inherit);
  border-radius: var(--btn-radius, 3px); padding: 4px 10px 4px 7px;
  font-size: .72rem; letter-spacing: .03em; cursor: pointer;
  font-family: inherit; opacity: .68; transition: opacity .15s;
}
.dp-trigger:hover { opacity: 1; }
.dp-trigger-icon { display: flex; opacity: .7; }
.dp-trigger-label { line-height: 1; }

/* ── Overlay ── */
.dp-overlay {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,.2); display: flex; justify-content: flex-end;
}

/* ── Panel ── */
.dp-panel {
  width: 380px; max-width: 94vw; height: 100vh;
  background: var(--glass-page-bg, #f4f4f2);
  border-left: 1px solid rgba(0,0,0,.06);
  box-shadow: -20px 0 60px rgba(0,0,0,.08);
  display: flex; flex-direction: column; overflow: hidden;
}
:global(html.dark) .dp-panel { background: #111113; border-left-color: rgba(255,255,255,.06); }

/* ── Header ── */
.dp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid rgba(0,0,0,.05); flex-shrink: 0;
}
.dp-header-left { display: flex; align-items: baseline; gap: 6px; }
.dp-title { font-size: .78rem; font-weight: 600; letter-spacing: .03em; color: var(--glass-text); }
.dp-version { font-size: .54rem; opacity: .3; font-weight: 500; }
.dp-header-actions { display: flex; gap: 4px; }

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
  padding: 10px 16px; border-bottom: 1px solid rgba(0,0,0,.05);
  background: rgba(0,0,0,.015); flex-shrink: 0;
}
.dp-export-tabs { display: flex; gap: 4px; margin-bottom: 8px; }
.dp-export-tab {
  padding: 3px 10px; border-radius: 4px; border: 1px solid rgba(0,0,0,.08);
  background: transparent; font-size: .62rem; cursor: pointer; opacity: .5;
  font-family: inherit; color: var(--glass-text); transition: all .12s;
}
.dp-export-tab.active { opacity: 1; background: rgba(0,0,0,.05); font-weight: 600; }
.dp-export-area {
  width: 100%; height: 100px; border: 1px solid rgba(0,0,0,.08);
  border-radius: 6px; background: transparent; color: var(--glass-text);
  font-size: .62rem; font-family: 'JetBrains Mono', monospace; padding: 8px;
  resize: vertical; outline: none;
}
.dp-export-actions { display: flex; gap: 6px; margin-top: 6px; }
:global(html.dark) .dp-export { background: rgba(255,255,255,.02); }
:global(html.dark) .dp-export-area { border-color: rgba(255,255,255,.08); }

.dp-sm-btn {
  padding: 4px 10px; border-radius: 4px; border: 1px solid rgba(0,0,0,.1);
  background: transparent; font-size: .62rem; cursor: pointer; opacity: .65;
  font-family: inherit; color: var(--glass-text); transition: all .12s;
}
.dp-sm-btn:hover { opacity: 1; }

/* ── Body ── */
.dp-body {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  scrollbar-width: thin; scrollbar-color: rgba(0,0,0,.08) transparent;
}

/* ── Section ── */
.dp-section { border-bottom: 1px solid rgba(0,0,0,.04); }
.dp-section:last-child { border-bottom: none; }
:global(html.dark) .dp-section { border-bottom-color: rgba(255,255,255,.04); }

.dp-section-header {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border: none; background: transparent;
  cursor: pointer; font-family: inherit; color: var(--glass-text);
}
.dp-section-header:hover { background: rgba(0,0,0,.015); }
:global(html.dark) .dp-section-header:hover { background: rgba(255,255,255,.02); }

.dp-section-title {
  font-size: .6rem; letter-spacing: .11em; text-transform: uppercase; opacity: .4; font-weight: 600;
}
.dp-chevron {
  font-size: .7rem; opacity: .3; transition: transform .15s; display: inline-block;
}
.dp-chevron--open { transform: rotate(90deg); }

.dp-section-body { padding: 4px 16px 16px; }

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

/* ── Presets grid ── */
.dp-presets { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.dp-preset-card {
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
  padding: 8px 10px; border-radius: 8px; border: 1px solid transparent;
  background: transparent; cursor: pointer; font-family: inherit;
  color: var(--glass-text); transition: all .12s; text-align: left; width: 100%;
}
.dp-preset-card:hover { background: rgba(0,0,0,.025); }
.dp-preset-card--active { border-color: rgba(0,0,0,.14); background: rgba(0,0,0,.03); }
.dp-preset-icon { font-size: .9rem; width: 24px; text-align: center; opacity: .6; }
.dp-preset-info { display: flex; flex-direction: column; gap: 1px; }
.dp-preset-name { font-size: .66rem; font-weight: 600; }
.dp-preset-desc { font-size: .54rem; opacity: .4; line-height: 1.3; }
:global(html.dark) .dp-preset-card:hover { background: rgba(255,255,255,.03); }
:global(html.dark) .dp-preset-card--active { border-color: rgba(255,255,255,.14); background: rgba(255,255,255,.04); }

/* ── Swatch grid (color themes) ── */
.dp-preset-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
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

/* ── Transitions ── */
.dp-slide-enter-active { transition: opacity .2s ease, transform .2s cubic-bezier(0.16,1,0.3,1); }
.dp-slide-leave-active { transition: opacity .14s ease, transform .14s ease; }
.dp-slide-enter-from { opacity: 0; }
.dp-slide-enter-from .dp-panel { transform: translateX(100%); }
.dp-slide-leave-to { opacity: 0; }
.dp-slide-leave-to .dp-panel { transform: translateX(100%); }

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
@media (max-width: 480px) {
  .dp-panel { width: 100vw; }
  .dp-preset-grid { grid-template-columns: repeat(3, 1fr); }
  .dp-font-grid { grid-template-columns: 1fr; }
  .dp-radii-row { grid-template-columns: repeat(2, 1fr); }
}

/* ── Search bar ── */
.dp-search-bar {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 16px; border-bottom: 1px solid rgba(0,0,0,.04);
  flex-shrink: 0;
}
.dp-search-icon { opacity: .3; flex-shrink: 0; color: var(--glass-text); }
.dp-search-input {
  flex: 1; border: none; background: transparent; outline: none;
  font-size: .68rem; color: var(--glass-text); font-family: inherit;
  letter-spacing: .02em;
}
.dp-search-input::placeholder { color: var(--glass-text); opacity: .3; }
.dp-search-clear {
  background: none; border: none; color: var(--glass-text);
  opacity: .3; cursor: pointer; font-size: .6rem; padding: 2px;
}
.dp-search-clear:hover { opacity: .7; }
:global(html.dark) .dp-search-bar { border-bottom-color: rgba(255,255,255,.04); }

/* ── Type scale visual ── */
.dp-scale-visual { display: flex; flex-direction: column; gap: 3px; }
.dp-scale-row {
  display: flex; align-items: baseline; gap: 8px;
  line-height: 1.3; color: var(--glass-text);
}
.dp-scale-name { font-size: .5rem; opacity: .3; width: 28px; text-align: right; font-variant-numeric: tabular-nums; }
.dp-scale-sample { flex: 1; }
.dp-scale-px { font-size: .48rem; opacity: .3; font-variant-numeric: tabular-nums; }

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
</style>
