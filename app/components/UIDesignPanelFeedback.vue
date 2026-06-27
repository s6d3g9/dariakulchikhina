<template>
  <div>
    <!-- ═══ Инпуты ═══ -->
    <div v-show="activeTab === 'inputs'" class="dp-page dp-page--cols">
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
    <div v-show="activeTab === 'tags'" class="dp-page dp-page--cols">
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

    <!-- ═══ Статусы и пин-бары ═══ -->
    <div v-show="activeTab === 'statuses'" class="dp-page dp-page--cols">
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
          <span v-for="s in statusPreviews" :key="s.label"
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
    <div v-show="activeTab === 'popups'" class="dp-page dp-page--cols">
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
    <div v-show="activeTab === 'scrollbar'" class="dp-page dp-page--cols">
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
    <div v-show="activeTab === 'tables'" class="dp-page dp-page--cols">
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
              <tr v-for="(row, i) in tableRows" :key="i"
                :style="{ background: i % 2 === 0 ? `color-mix(in srgb, var(--glass-text) ${Math.round(tokens.tableRowHoverOpacity*100)}%, transparent)` : 'transparent' }">
                <td v-for="cell in row" :key="cell" :style="{ padding:'6px 10px', color:'var(--glass-text)', borderBottom:`1px solid color-mix(in srgb, var(--glass-text) ${Math.round(tokens.tableBorderOpacity*100)}%, transparent)` }">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══ Значки / счётчики ═══ -->
    <div v-show="activeTab === 'badges'" class="dp-page dp-page--cols">
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
  </div>
</template>

<script setup lang="ts">
import { useDesignPanelHelpers } from '~/composables/useDesignPanelHelpers'

defineProps<{ activeTab: string }>()

const { tokens, set, onRange, onFloat, pct } = useDesignPanelHelpers()

const accentColor = computed(() =>
  `hsl(${tokens.value.accentHue}, ${tokens.value.accentSaturation}%, ${tokens.value.accentLightness}%)`
)

const statusPreviews = [
  { label: 'ожидание',  color: 'var(--glass-text)', bg: 'var(--rm-bg-pending)' },
  { label: 'в работе',  color: 'var(--ds-warning)',  bg: 'var(--rm-bg-progress)' },
  { label: 'выполнено', color: 'var(--ds-success)',  bg: 'var(--rm-bg-done)' },
  { label: 'пропущено', color: 'var(--glass-text)',  bg: 'var(--rm-bg-skipped)' },
  { label: 'запланировано', color: 'var(--ds-accent)', bg: 'var(--ws-bg-planned)' },
  { label: 'на паузе', color: 'var(--ds-accent)', bg: 'var(--ws-bg-paused)' },
  { label: 'отмена',   color: 'var(--ds-error)',  bg: 'var(--ws-bg-cancelled)' },
]

const tableRows = [
  ['Проект A', 'В работе', '01.03'],
  ['Проект B', 'Готово', '15.02'],
  ['Проект C', 'Ожидание', '...'],
]
</script>
