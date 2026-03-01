<template>
  <div class="mpe-wrap">
    <div class="mpe-header">
      <span class="mpe-title">Свойства материала</span>
      <button
        v-if="!expanded"
        class="mpe-expand-btn"
        @click="expanded = true"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        развернуть
      </button>
      <button
        v-else
        class="mpe-expand-btn"
        @click="expanded = false"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
        свернуть
      </button>
    </div>

    <Transition name="mpe-slide">
      <div v-if="expanded" class="mpe-body">
        <!-- Табы групп -->
        <div class="mpe-tabs">
          <button
            v-for="group in groups"
            :key="group.key"
            class="mpe-tab"
            :class="{
              'mpe-tab--active': activeGroup === group.key,
              'mpe-tab--filled': isGroupFilled(group.key),
            }"
            @click="activeGroup = group.key"
          >
            {{ group.label }}
            <span v-if="isGroupFilled(group.key)" class="mpe-tab-dot" />
          </button>
        </div>

        <!-- Поля группы -->
        <Transition name="mpe-fade" mode="out-in">
          <div :key="activeGroup" class="mpe-fields">

            <!-- Физические -->
            <template v-if="activeGroup === 'physical'">
              <MpeField label="Тип материала" v-model="data.physical!.material" placeholder="керамогранит, ламинат, мрамор..." />
              <MpeField label="Размеры" v-model="data.physical!.dimensions" placeholder="600×600×10 мм" />
              <MpeField label="Масса" v-model="data.physical!.weight" placeholder="18.5 кг/м²" />
              <MpeField label="Плотность" v-model="data.physical!.density" placeholder="2400 кг/м³" />
              <MpeField label="Твёрдость" v-model="data.physical!.hardness" placeholder="6 по Моосу" />
              <MpeField label="Прочность" v-model="data.physical!.strength" placeholder="45 МПа, R11" />
              <MpeField label="Пористость" v-model="data.physical!.porosity" placeholder="< 0.5%" />
              <MpeField label="Водопоглощение" v-model="data.physical!.waterAbsorption" placeholder="< 0.1%" />
              <MpeField label="Морозостойкость" v-model="data.physical!.frostResistance" placeholder="200 циклов" />
              <MpeField label="Огнестойкость" v-model="data.physical!.fireClass" placeholder="КМ0 (НГ)" />
              <MpeField label="Теплопроводность" v-model="data.physical!.thermalConductivity" placeholder="1.3 Вт/(м·К)" />
              <MpeField label="Звукоизоляция" v-model="data.physical!.soundInsulation" placeholder="19 дБ" />
              <MpeField label="Диапазон температур" v-model="data.physical!.temperatureRange" placeholder="-40...+60°C" />
              <MpeField label="Линейное расширение" v-model="data.physical!.thermalExpansion" placeholder="6×10⁻⁶ /°C" />
            </template>

            <!-- Тактильные -->
            <template v-if="activeGroup === 'tactile'">
              <MpeField label="Текстура" v-model="data.tactile!.texture" placeholder="шелковистая, рельефная, бархатная..." />
              <MpeField label="Ощущение температуры" v-model="data.tactile!.temperatureFeel" placeholder="тёплый, нейтральный, холодный" />
              <MpeField label="Сцепление" v-model="data.tactile!.grip" placeholder="высокий R10" />
              <MpeField label="Комфорт" v-model="data.tactile!.comfort" placeholder="комфортный босиком" />
              <MpeField label="Поверхность" v-model="data.tactile!.surface" placeholder="матовая, полированная..." />
              <MpeField label="Визуальный вес" v-model="data.tactile!.perceivedWeight" placeholder="лёгкий, массивный..." />
              <MpeField label="Эластичность" v-model="data.tactile!.flexibility" placeholder="жёсткий, упругий, мягкий" />
              <MpeField label="Акустика" v-model="data.tactile!.acousticFeel" placeholder="глухой, звонкий, приглушённый" />
            </template>

            <!-- Химические -->
            <template v-if="activeGroup === 'chemical'">
              <MpeField label="Состав" v-model="data.chemical!.composition" placeholder="полевой шпат, кварц, каолин" full />
              <MpeField label="Стойкость к pH" v-model="data.chemical!.phResistance" placeholder="pH 3–12" />
              <MpeField label="Стойкость к пятнам" v-model="data.chemical!.stainResistance" placeholder="класс 5" />
              <MpeField label="Устойчивость к химии" v-model="data.chemical!.chemicalResistance" placeholder="устойчив к бытовой химии" />
              <MpeField label="Эмиссия VOC" v-model="data.chemical!.voc" placeholder="A+" />
              <MpeField label="Экологический класс" v-model="data.chemical!.ecologyClass" placeholder="E0, E1, FSC" />
              <MpeField label="UV-стойкость" v-model="data.chemical!.uvResistance" placeholder="высокая" />
              <MpeField label="Стойкость к коррозии" v-model="data.chemical!.corrosionResistance" placeholder="высокая" />
              <MpeBool label="Антибактериальный" v-model="data.chemical!.antibacterial" />
              <MpeBool label="Гипоаллергенный" v-model="data.chemical!.hypoallergenic" />
            </template>

            <!-- Визуальные -->
            <template v-if="activeGroup === 'visual'">
              <MpeArray label="Цвета" v-model="data.visual!.colors" placeholder="ivory, #F5F0E8..." />
              <MpeField label="Рисунок" v-model="data.visual!.pattern" placeholder="мраморные прожилки, древесный..." />
              <MpeField label="Финиш" v-model="data.visual!.finish" placeholder="сатинированная, глянцевая..." />
              <MpeField label="Прозрачность" v-model="data.visual!.translucency" placeholder="непрозрачный" />
              <MpeField label="Прожилки" v-model="data.visual!.veining" placeholder="хаотичные золотистые" />
              <MpeField label="Блеск" v-model="data.visual!.gloss" placeholder="5 GU, 90 GU" />
              <MpeField label="Вариация" v-model="data.visual!.variation" placeholder="V1 однородный...V4 случайный" />
              <MpeField label="Глубина" v-model="data.visual!.depthEffect" placeholder="плоский, 3D-рельеф, глубокий" />
            </template>

            <!-- Эксплуатация -->
            <template v-if="activeGroup === 'performance'">
              <MpeField label="Класс износа" v-model="data.performance!.wearClass" placeholder="PEI V, AC5/33" />
              <MpeField label="Антискольжение" v-model="data.performance!.slipResistance" placeholder="R10, R11" />
              <MpeField label="Влагостойкость" v-model="data.performance!.moistureClass" placeholder="IP68" />
              <MpeField label="Несущая нагрузка" v-model="data.performance!.loadCapacity" placeholder="до 500 кг/м²" />
              <MpeField label="Срок службы" v-model="data.performance!.lifespan" placeholder="> 50 лет" />
              <MpeField label="Обслуживание" v-model="data.performance!.maintenanceLevel" placeholder="минимальный, средний, высокий" />
              <MpeField label="Стойкость цвета" v-model="data.performance!.colorFastness" placeholder="высокая" />
              <MpeField label="Ударопрочность" v-model="data.performance!.impactResistance" placeholder="класс 1" />
              <MpeBool label="Тёплый пол" v-model="data.performance!.underfloorHeating" />
              <MpeBool label="Для фасадов" v-model="data.performance!.facadeUse" />
              <MpeBool label="Для влажных зон" v-model="data.performance!.wetRoomUse" />
            </template>

            <!-- Применение -->
            <template v-if="activeGroup === 'application'">
              <MpeArray label="Зоны применения" v-model="data.application!.zones" placeholder="ванная, кухня, терраса..." />
              <MpeField label="Метод монтажа" v-model="data.application!.method" placeholder="клеевой, плавающий, механический" />
              <MpeField label="Основание" v-model="data.application!.substrate" placeholder="ровная стяжка ≤ 2мм/2м" />
              <MpeField label="Затирка / шов" v-model="data.application!.grout" placeholder="эпоксидная 2мм" />
              <MpeField label="Клей / адгезив" v-model="data.application!.adhesive" placeholder="C2TE S1" />
              <MpeField label="Расход" v-model="data.application!.consumptionRate" placeholder="4.5 кг/м² (клей)" />
              <MpeArray label="Сочетания" v-model="data.application!.combinations" placeholder="дерево, стекло, металл..." />
              <MpeArray label="Ограничения" v-model="data.application!.restrictions" placeholder="не для наружного применения..." />
            </template>

            <!-- Коммерция -->
            <template v-if="activeGroup === 'commercial'">
              <MpeField label="Производитель" v-model="data.commercial!.manufacturer" placeholder="Atlas Concorde, Kerama Marazzi..." />
              <MpeField label="Коллекция" v-model="data.commercial!.collection" placeholder="Marvel Pro" />
              <MpeField label="Артикул" v-model="data.commercial!.article" placeholder="ADPV" />
              <MpeField label="Страна" v-model="data.commercial!.countryOfOrigin" placeholder="Италия" />
              <MpeField label="Цена" v-model="data.commercial!.pricePerUnit" placeholder="3 450 ₽/м²" />
              <MpeField label="Единица" v-model="data.commercial!.unit" placeholder="м², шт, п.м." />
              <MpeField label="Срок поставки" v-model="data.commercial!.leadTime" placeholder="2–4 недели" />
              <MpeField label="Мин. заказ" v-model="data.commercial!.minOrder" placeholder="от 10 м²" />
              <div class="mpe-field mpe-field--full">
                <label class="mpe-label">Наличие</label>
                <select v-model="data.commercial!.availability" class="glass-input mpe-input">
                  <option value="">—</option>
                  <option value="in-stock">В наличии</option>
                  <option value="to-order">Под заказ</option>
                  <option value="discontinued">Снято с производства</option>
                </select>
              </div>
              <MpeField label="Гарантия" v-model="data.commercial!.warranty" placeholder="25 лет" />
            </template>

            <!-- Сертификаты -->
            <template v-if="activeGroup === 'certifications'">
              <div v-for="(cert, i) in certifications" :key="i" class="mpe-cert-row">
                <input v-model="cert.name" class="glass-input mpe-input" placeholder="ГОСТ 6787-2001">
                <input v-model="cert.number" class="glass-input mpe-input mpe-input--sm" placeholder="№">
                <input v-model="cert.validUntil" class="glass-input mpe-input mpe-input--sm" placeholder="до (дата)">
                <button class="mpe-del-btn" @click="certifications.splice(i, 1)">×</button>
              </div>
              <button class="mpe-add-btn" @click="certifications.push({ name: '', number: '', validUntil: '', document: '' })">
                + сертификат
              </button>
            </template>

            <!-- Пользовательские группы -->
            <template v-if="activeGroup === 'custom'">
              <div v-for="(cg, gi) in customGroups" :key="gi" class="mpe-custom-block">
                <div class="mpe-custom-header">
                  <input v-model="cg.groupName" class="glass-input mpe-input" placeholder="Название группы">
                  <button class="mpe-del-btn" @click="customGroups.splice(gi, 1)">×</button>
                </div>
                <div v-for="(item, ii) in cg.items" :key="ii" class="mpe-custom-row">
                  <input v-model="item.label" class="glass-input mpe-input" placeholder="Свойство">
                  <input v-model="item.value" class="glass-input mpe-input" placeholder="Значение">
                  <button class="mpe-del-btn" @click="cg.items.splice(ii, 1)">×</button>
                </div>
                <button class="mpe-add-btn mpe-add-btn--sub" @click="cg.items.push({ label: '', value: '' })">+ свойство</button>
              </div>
              <button class="mpe-add-btn" @click="customGroups.push({ groupName: '', items: [{ label: '', value: '' }] })">
                + произвольная группа
              </button>
            </template>

            <!-- Заметки (всегда в конце) -->
            <template v-if="activeGroup === 'notes'">
              <div class="mpe-field mpe-field--full">
                <label class="mpe-label">Общие заметки</label>
                <textarea v-model="notes" class="glass-input mpe-input mpe-textarea" rows="4" placeholder="Дополнительная информация о материале..."></textarea>
              </div>
            </template>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { MaterialProperties, MaterialCertification, MaterialCustomGroup } from '~~/shared/types/material'

const props = defineProps<{
  modelValue: MaterialProperties
}>()

const emit = defineEmits<{
  'update:modelValue': [value: MaterialProperties]
}>()

const expanded = ref(false)
const activeGroup = ref('physical')

const groups = [
  { key: 'physical', label: 'Физические' },
  { key: 'tactile', label: 'Тактильные' },
  { key: 'chemical', label: 'Химические' },
  { key: 'visual', label: 'Визуальные' },
  { key: 'performance', label: 'Эксплуатация' },
  { key: 'application', label: 'Применение' },
  { key: 'commercial', label: 'Коммерция' },
  { key: 'certifications', label: 'Сертификаты' },
  { key: 'custom', label: 'Другое' },
  { key: 'notes', label: 'Заметки' },
]

// Reactive deep copy of the data
const data = reactive<MaterialProperties>({
  physical: {},
  tactile: {},
  chemical: {},
  visual: {},
  performance: {},
  application: {},
  commercial: {},
})

const certifications = ref<MaterialCertification[]>([])
const customGroups = ref<MaterialCustomGroup[]>([])
const notes = ref('')

// Sync from parent
watch(() => props.modelValue, (v) => {
  if (!v) return
  Object.assign(data.physical!, v.physical || {})
  Object.assign(data.tactile!, v.tactile || {})
  Object.assign(data.chemical!, v.chemical || {})
  Object.assign(data.visual!, v.visual || {})
  Object.assign(data.performance!, v.performance || {})
  Object.assign(data.application!, v.application || {})
  Object.assign(data.commercial!, v.commercial || {})
  certifications.value = v.certifications ? JSON.parse(JSON.stringify(v.certifications)) : []
  customGroups.value = v.custom ? JSON.parse(JSON.stringify(v.custom)) : []
  notes.value = v.notes || ''
}, { immediate: true, deep: false })

// Emit changes back to parent (debounced)
let emitTimer: ReturnType<typeof setTimeout>
function emitUpdate() {
  clearTimeout(emitTimer)
  emitTimer = setTimeout(() => {
    const result: MaterialProperties = {}
    // Only include groups that have filled data
    if (hasFilledFields(data.physical)) result.physical = { ...data.physical }
    if (hasFilledFields(data.tactile)) result.tactile = { ...data.tactile }
    if (hasFilledFields(data.chemical)) result.chemical = { ...data.chemical }
    if (hasFilledFields(data.visual)) result.visual = cleanVisual(data.visual!)
    if (hasFilledFields(data.performance)) result.performance = { ...data.performance }
    if (hasFilledFields(data.application)) result.application = cleanApplication(data.application!)
    if (hasFilledFields(data.commercial)) result.commercial = { ...data.commercial }
    if (certifications.value.length && certifications.value.some((c) => c.name)) {
      result.certifications = certifications.value.filter((c) => c.name)
    }
    if (customGroups.value.length && customGroups.value.some((cg) => cg.groupName)) {
      result.custom = customGroups.value.filter((cg) => cg.groupName && cg.items.some((i) => i.label))
    }
    if (notes.value) result.notes = notes.value
    emit('update:modelValue', result)
  }, 300)
}

watch(data, emitUpdate, { deep: true })
watch(certifications, emitUpdate, { deep: true })
watch(customGroups, emitUpdate, { deep: true })
watch(notes, emitUpdate)

function hasFilledFields(obj: Record<string, unknown> | undefined): boolean {
  if (!obj) return false
  return Object.values(obj).some((v) => {
    if (v === undefined || v === null || v === '' || v === false) return false
    if (Array.isArray(v)) return v.length > 0
    return true
  })
}

function cleanVisual(v: Record<string, unknown>) {
  const result = { ...v }
  if (Array.isArray(result.colors)) result.colors = (result.colors as string[]).filter(Boolean)
  return result
}

function cleanApplication(v: Record<string, unknown>) {
  const result = { ...v }
  if (Array.isArray(result.zones)) result.zones = (result.zones as string[]).filter(Boolean)
  if (Array.isArray(result.combinations)) result.combinations = (result.combinations as string[]).filter(Boolean)
  if (Array.isArray(result.restrictions)) result.restrictions = (result.restrictions as string[]).filter(Boolean)
  return result
}

function isGroupFilled(key: string): boolean {
  if (key === 'certifications') return certifications.value.some((c) => c.name)
  if (key === 'custom') return customGroups.value.some((c) => c.groupName)
  if (key === 'notes') return !!notes.value
  const groupData = data[key as keyof MaterialProperties]
  return hasFilledFields(groupData as Record<string, unknown> | undefined)
}

// ── Sub-components (inline) ─────────────────────────
// Simple field
const MpeField = defineComponent({
  props: {
    label: String,
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    full: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', { class: ['mpe-field', props.full && 'mpe-field--full'] }, [
      h('label', { class: 'mpe-label' }, props.label),
      h('input', {
        class: 'glass-input mpe-input',
        value: props.modelValue || '',
        placeholder: props.placeholder,
        onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
      }),
    ])
  },
})

// Boolean toggle
const MpeBool = defineComponent({
  props: {
    label: String,
    modelValue: { type: Boolean, default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', { class: 'mpe-field mpe-field--bool' }, [
      h('label', { class: 'mpe-label-bool' }, [
        h('input', {
          type: 'checkbox',
          checked: props.modelValue || false,
          class: 'mpe-checkbox',
          onChange: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).checked),
        }),
        h('span', null, props.label),
      ]),
    ])
  },
})

// Array field (comma-separated)
const MpeArray = defineComponent({
  props: {
    label: String,
    modelValue: { type: Array as () => string[], default: () => [] },
    placeholder: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const str = computed(() => (props.modelValue || []).join(', '))
    function onInput(e: Event) {
      const val = (e.target as HTMLInputElement).value
      emit('update:modelValue', val.split(',').map((s: string) => s.trim()).filter(Boolean))
    }
    return () => h('div', { class: 'mpe-field mpe-field--full' }, [
      h('label', { class: 'mpe-label' }, props.label),
      h('input', {
        class: 'glass-input mpe-input',
        value: str.value,
        placeholder: props.placeholder,
        onInput,
      }),
      h('span', { class: 'mpe-hint' }, 'через запятую'),
    ])
  },
})
</script>

<style scoped>
.mpe-wrap {
  border: 1px solid color-mix(in srgb, var(--glass-border, #333) 40%, transparent);
  border-radius: 10px;
  overflow: hidden;
  margin-top: 12px;
}

.mpe-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--glass-bg, #1a1a1a) 40%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--glass-border, #333) 25%, transparent);
}

.mpe-title {
  font-size: .82rem;
  font-weight: 500;
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 70%, transparent);
  text-transform: uppercase;
  letter-spacing: .3px;
}

.mpe-expand-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 55%, transparent);
  font-size: .76rem;
  cursor: pointer;
  font-family: inherit;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all .15s;
}
.mpe-expand-btn:hover {
  color: var(--glass-text, #e0e0e0);
  background: color-mix(in srgb, var(--glass-bg, #1a1a1a) 60%, transparent);
}

.mpe-body { padding: 0 14px 14px; }

/* ── Табы ──────────────────────────────────────── */
.mpe-tabs {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  padding: 10px 0 8px;
  scrollbar-width: none;
}
.mpe-tabs::-webkit-scrollbar { display: none; }

.mpe-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: none;
  background: transparent;
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 50%, transparent);
  font-size: .74rem;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  border-radius: 6px;
  transition: all .13s;
}
.mpe-tab:hover {
  color: var(--glass-text, #e0e0e0);
  background: color-mix(in srgb, var(--glass-bg, #1a1a1a) 40%, transparent);
}
.mpe-tab--active {
  color: var(--glass-text, #e0e0e0);
  background: color-mix(in srgb, var(--glass-bg, #1a1a1a) 60%, transparent);
}

.mpe-tab-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #4ade80;
}

/* ── Поля ──────────────────────────────────────── */
.mpe-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 14px;
  padding-top: 4px;
}

.mpe-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.mpe-field--full { grid-column: 1 / -1; }
.mpe-field--bool { justify-content: center; }

.mpe-label {
  font-size: .7rem;
  text-transform: uppercase;
  letter-spacing: .3px;
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 45%, transparent);
}

.mpe-label-bool {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: .82rem;
  cursor: pointer;
  color: var(--glass-text, #e0e0e0);
}

.mpe-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #4ade80;
}

.mpe-input {
  padding: 5px 8px !important;
  font-size: .82rem !important;
  font-family: inherit;
  border: 1px solid color-mix(in srgb, var(--glass-border, #333) 30%, transparent) !important;
  border-radius: 6px;
  background: transparent !important;
  color: var(--glass-text, #e0e0e0);
  transition: border-color .15s;
}
.mpe-input:focus {
  border-color: color-mix(in srgb, var(--glass-text, #e0e0e0) 35%, #667eea) !important;
  outline: none;
}
.mpe-input--sm { max-width: 120px; }

.mpe-textarea {
  resize: vertical;
  min-height: 60px;
}

.mpe-hint {
  font-size: .68rem;
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 35%, transparent);
  font-style: italic;
}

/* ── Cert / Custom blocks ─────────────────────── */
.mpe-cert-row, .mpe-custom-row {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
  grid-column: 1 / -1;
}

.mpe-custom-block {
  grid-column: 1 / -1;
  padding: 10px;
  border: 1px dashed color-mix(in srgb, var(--glass-border, #333) 35%, transparent);
  border-radius: 8px;
  margin-bottom: 8px;
}
.mpe-custom-header {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
}

.mpe-del-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #f87171;
  font-size: 1.1rem;
  cursor: pointer;
  border-radius: 4px;
  flex-shrink: 0;
  transition: background .1s;
}
.mpe-del-btn:hover { background: #f8717120; }

.mpe-add-btn {
  grid-column: 1 / -1;
  border: 1px dashed color-mix(in srgb, var(--glass-border, #333) 40%, transparent);
  background: transparent;
  color: color-mix(in srgb, var(--glass-text, #e0e0e0) 50%, transparent);
  padding: 8px;
  font-size: .78rem;
  cursor: pointer;
  font-family: inherit;
  border-radius: 6px;
  transition: all .15s;
}
.mpe-add-btn:hover {
  color: var(--glass-text, #e0e0e0);
  border-color: color-mix(in srgb, var(--glass-border, #333) 60%, transparent);
}
.mpe-add-btn--sub { margin-top: 4px; }

/* ── Transitions ───────────────────────────────── */
.mpe-slide-enter-active, .mpe-slide-leave-active { transition: all .2s ease; }
.mpe-slide-enter-from, .mpe-slide-leave-to { opacity: 0; max-height: 0; overflow: hidden; }
.mpe-slide-enter-to, .mpe-slide-leave-from { max-height: 2000px; }

.mpe-fade-enter-active, .mpe-fade-leave-active { transition: opacity .12s; }
.mpe-fade-enter-from, .mpe-fade-leave-to { opacity: 0; }
</style>
