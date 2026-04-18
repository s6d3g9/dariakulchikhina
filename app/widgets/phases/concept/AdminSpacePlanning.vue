<template>
  <div class="asp-wrap">
    <div v-if="pending" class="ent-content-loading asp-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <!-- Status row -->
      <div class="asp-status-row">
        <span class="asp-dot" :class="`asp-dot--${statusColor}`"></span>
        <select v-model="form.sp_status" class="u-status-sel" @change="save">
          <option value="">статус не задан</option>
          <option value="in_work">в работе</option>
          <option value="sent_to_client">отправлен клиенту</option>
          <option value="revision">на доработке</option>
          <option value="approved">согласован ✓</option>
        </select>
        <span v-if="savedAt" class="asp-saved">✓ {{ savedAt }}</span>
        <div class="asp-status-row__spacer" />
        <GlassButton variant="secondary" density="compact"
          
          :class="{ 'asp-align-on': alignMode }"
          :title="alignMode ? 'Выключить режим выравнивания' : 'Включить драг-выравнивание по сетке'"
          @click="alignMode = !alignMode"
        >⊞ {{ alignMode ? 'выравнивание' : 'выровнять' }}</GlassButton>
        <GlassButton variant="danger" density="compact"
          v-if="alignMode && layoutBlocks.length"
          
          @click="clearLayout"
        >↺</GlassButton>
      </div>

      <!-- Section: General info -->
      <div class="u-form-section" data-cv-unit="section">
        <div class="u-section-title">общая информация</div>
        <div class="u-grid-2">
          <div class="u-field">
            <label class="u-field__label">версия комплекта</label>
            <GlassInput v-model="form.sp_version"  placeholder="v1, v2, финальная..." @blur="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">дата отправки клиенту</label>
            <AppDatePicker v-model="form.sp_sent_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">дата согласования</label>
            <AppDatePicker v-model="form.sp_approved_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">комментарий архитектора</label>
            <textarea v-model="form.sp_architect_notes" class="glass-input u-ta" rows="2" @blur="save" />
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">замечания клиента (revision)</label>
            <textarea v-model="form.sp_client_notes" class="glass-input u-ta" rows="2" @blur="save" />
          </div>
        </div>
      </div>

      <!-- Section: Layout files -->
      <div class="u-form-section" data-cv-unit="section">
        <div class="u-section-title">файлы планировок</div>

        <!-- data-cv-unit="item" — pager treats the whole list as one block, prevents freeze -->
        <div v-if="form.sp_files && form.sp_files.length" class="asp-files-list" data-cv-unit="item">
          <div v-for="(file, idx) in form.sp_files" :key="idx" class="asp-file-item">
            <div class="asp-file-icon">{{ fileIcon(file) }}</div>
            <div class="asp-file-meta">
              <a :href="file.url" target="_blank" class="asp-file-name">{{ file.label || file.filename }}</a>
              <div class="asp-file-row2">
                <select v-model="file.approval" class="u-status-sel" @change="save">
                  <option value="">на рассмотрении</option>
                  <option value="sent">отправлен</option>
                  <option value="approved">согласован ✓</option>
                  <option value="revision">доработка ↩</option>
                </select>
                <GlassInput v-model="file.comment" class="glass-input --inline" placeholder="комментарий..." @blur="save" />
              </div>
            </div>
            <button class="asp-file-del" @click="removeFile(Number(idx))" title="удалить">×</button>
          </div>
        </div>
        <div v-else class="asp-files-empty">Файлы ещё не загружены</div>

        <label class="asp-upload-btn" :class="{ 'asp-upload-btn--loading': uploading }">
          + добавить файл
          <input type="file" multiple accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.webp" style="display:none" @change="onFileInput" :disabled="uploading">
        </label>
        <div v-if="uploading" class="u-inline-loading asp-inline-loading" aria-live="polite">
          <span class="u-inline-loading__label">[ ЗАГРУЖАЕМ ФАЙЛЫ ПЛАНИРОВКИ ]</span>
          <span class="u-inline-loading__line" />
        </div>
      </div>

      <!-- Section: Approval options -->
      <div class="u-form-section" data-cv-unit="section">
        <div class="u-section-title">согласование</div>
        <div class="asp-checks-row" data-cv-unit="item">
          <label class="asp-check-item">
            <input type="checkbox" v-model="form.sp_dimensions_checked" @change="save"> размеры проверены
          </label>
          <label class="asp-check-item">
            <input type="checkbox" v-model="form.sp_zones_approved" @change="save"> зонирование согласовано
          </label>
          <label class="asp-check-item">
            <input type="checkbox" v-model="form.sp_geometry_locked" @change="save"> геометрия заморожена 🔒
          </label>
        </div>
      </div>

      <!-- Section: Zone layout canvas -->
      <div class="u-form-section asp-layout-section" data-cv-unit="section">
        <div class="u-section-title">схема зонирования</div>

        <!-- Canvas -->
        <div ref="canvasRef" class="asp-canvas" :class="{ 'asp-canvas--align': alignMode }">
          <div
            v-for="block in layoutBlocks"
            :key="block.id"
            class="asp-block"
            :class="{ 'asp-block--active': dragState?.block.id === block.id || resizeState?.block.id === block.id }"
            :style="{
              left: block.x + 'px',
              top: block.y + 'px',
              width: block.w + 'px',
              height: block.h + 'px',
              '--block-color': block.color,
            }"
            @pointerdown.stop="startBlockDrag(block, $event)"
          >
            <div class="asp-block__body">
              <span class="asp-block__lbl">{{ block.label }}</span>
              <span class="asp-block__meta">{{ categoryLabel(block.category) }}</span>
            </div>
            <button v-if="alignMode" class="asp-block__del" @click.stop="removeBlock(block.id)">×</button>
            <div v-if="alignMode" class="asp-block__rsz" @pointerdown.stop="startBlockResize(block, $event)" />
          </div>
          <div v-if="!layoutBlocks.length" class="asp-canvas-empty">
            <span v-if="alignMode">введите название зоны и нажмите «+ добавить»</span>
            <span v-else>нажмите «выровнять» чтобы добавить зоны на схему</span>
          </div>
        </div>

        <!-- Add-block toolbar -->
        <Transition name="asp-slide">
          <div v-if="alignMode" class="asp-add-bar">
            <div class="asp-template-groups">
              <div v-for="group in groupedTemplates" :key="group.category" class="asp-template-group">
                <span class="asp-template-group__title">{{ group.title }}</span>
                <div class="asp-template-list">
                  <GlassButton variant="secondary" density="compact"
                    v-for="template in group.items"
                    :key="template.id"
                    
                    :class="{ 'asp-template--on': selectedTemplateId === template.id }"
                    :title="template.description"
                    @click="selectedTemplateId = template.id"
                  >{{ template.title }}</GlassButton>
                </div>
              </div>
            </div>
            <GlassInput
              v-model="newBlockLabel"
              
              :placeholder="`${getLayoutTemplateById(selectedTemplateId).defaultLabel} или своё название`"
              @keydown.enter="addBlock"
             />
            <div class="asp-presets">
              <GlassButton variant="secondary" density="compact"
                v-for="ps in layoutPresetOptions"
                :key="ps.key"
                
                :class="{ 'asp-preset--on': selectedPreset === ps.key }"
                :title="`${ps.cellsX}×${ps.cellsY} ячеек`"
                @click="selectedPreset = ps.key"
              >{{ ps.key }}</GlassButton>
            </div>
            <GlassButton variant="secondary" density="compact"  @click="addBlock">+ добавить</GlassButton>
          </div>
        </Transition>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { registerWipe2Data } from '~/entities/design-system/model/useWipe2'
import {
  getLayoutTemplateById,
  LAYOUT_BLOCK_CATEGORY_LABELS,
  LAYOUT_BLOCK_PRESETS,
  LAYOUT_BLOCK_TEMPLATES,
} from '~~/shared/constants/app-catalog'
import type {
  LayoutBlockCategory,
  LayoutBlockConfig,
  LayoutBlockPresetKey,
  LayoutBlockTemplateDef,
} from '~~/shared/types/app-catalog'

const props = defineProps<{ slug: string }>()

const { savedAt, touch: markSaved } = useTimestamp()
const uploading = ref(false)

const form = reactive<any>({
  sp_status:             '',
  sp_version:            '',
  sp_sent_date:          '',
  sp_approved_date:      '',
  sp_architect_notes:    '',
  sp_client_notes:       '',
  sp_files:              [],
  sp_dimensions_checked: false,
  sp_zones_approved:     false,
  sp_geometry_locked:    false,
  sp_layout:             null as any,
})

const statusColor = useStatusColor(form, 'sp_status')

// ── Данные проекта ─────────────────────────────────────────────
const { data: project, pending, refresh } = await useFetch<any>(() => `/api/projects/${props.slug}`)

// Заполняем форму когда данные загружены
watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => {
    if (pf[k] !== undefined) (form as any)[k] = pf[k]
  })
}, { immediate: true })

// ── Wipe2: регистрируем данные для карточного режима ──────────
const _SP_STATUS_LABELS: Record<string, string> = {
  '': 'не задан', in_work: 'в работе', sent_to_client: 'отправлен клиенту',
  revision: 'на доработке', approved: 'согласован',
}
const _SP_STATUS_COLORS: Record<string, string> = {
  '': 'muted', in_work: 'blue', sent_to_client: 'amber', revision: 'red', approved: 'green',
}
registerWipe2Data(computed(() => ({
  entityTitle: 'Планировочные решения',
  entitySubtitle: form.sp_version ? `версия ${form.sp_version}` : undefined,
  entityStatus: (_SP_STATUS_LABELS[form.sp_status] ?? form.sp_status) || undefined,
  entityStatusColor: _SP_STATUS_COLORS[form.sp_status] ?? 'muted',
  sections: [
    {
      title: 'Общая информация',
      fields: [
        { label: 'Версия комплекта', value: form.sp_version ?? '' },
        { label: 'Статус', value: form.sp_status ?? '', type: 'status' as const },
        { label: 'Отправлено клиенту', value: form.sp_sent_date ?? '', type: 'date' as const },
        { label: 'Согласовано', value: form.sp_approved_date ?? '', type: 'date' as const },
        { label: 'Комментарий архитектора', value: form.sp_architect_notes ?? '', type: 'multiline' as const },
        { label: 'Замечания клиента', value: form.sp_client_notes ?? '', type: 'multiline' as const },
      ],
    },
    {
      title: 'Согласование',
      fields: [
        { label: 'Размеры проверены', value: !!form.sp_dimensions_checked, type: 'boolean' as const },
        { label: 'Зонирование согласовано', value: !!form.sp_zones_approved, type: 'boolean' as const },
        { label: 'Геометрия заморожена', value: !!form.sp_geometry_locked, type: 'boolean' as const },
      ],
    },
    ...(form.sp_files?.length ? [{
      title: 'Файлы планировок',
      fields: (form.sp_files as any[]).map((f: any) => ({
        label: f.label || f.filename || 'файл',
        value: f.approval ? (_SP_STATUS_LABELS[f.approval] ?? f.approval) : 'на рассмотрении',
        type: 'status' as const,
      })),
    }] : []),
  ],
})))

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), ...form } },
  })
  markSaved()
}

async function onFileInput(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files?.length) return
  uploading.value = true
  for (const f of Array.from(files)) {
    const fd = new FormData()
    fd.append('file', f)
    const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
    form.sp_files.push({
      url:      res.url,
      filename: f.name,
      label:    f.name.replace(/\.[^.]+$/, ''),
      approval: '',
      comment:  '',
      type:     fileType(f.name),
    })
  }
  uploading.value = false
  await save();
  (e.target as HTMLInputElement).value = ''
}

function removeFile(idx: number) {
  form.sp_files.splice(idx, 1)
  save()
}

function fileType(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['dwg','dxf'].includes(ext)) return 'cad'
  if (['pdf'].includes(ext))       return 'pdf'
  return 'image'
}

function fileIcon(f: any) {
  const t = f.type || fileType(f.filename || '')
  if (t === 'cad')   return '📐'
  if (t === 'pdf')   return '📄'
  return '🖼'
}

// ─── Alignment canvas ────────────────────────────────────────────────────────
const GRID = 20
const CANVAS_H = 400

// shared with UIDesignPanel dp-topbar button
const alignMode = useState('asp-align-mode', () => false)
const canvasRef      = ref<HTMLElement | null>(null)
const newBlockLabel  = ref('')
const selectedTemplateId = ref<string>('custom')
const selectedPreset = ref<LayoutBlockPresetKey>('M')
const layoutBlocks   = ref<LayoutBlockConfig[]>([])

const layoutPresetOptions = Object.values(LAYOUT_BLOCK_PRESETS)

const groupedTemplates = computed(() => {
  const groups = new Map<LayoutBlockCategory, LayoutBlockTemplateDef[]>()
  for (const template of LAYOUT_BLOCK_TEMPLATES) {
    const items = groups.get(template.category) ?? []
    items.push(template)
    groups.set(template.category, items)
  }

  return Array.from(groups.entries()).map(([category, items]) => ({
    category,
    title: LAYOUT_BLOCK_CATEGORY_LABELS[category] ?? category,
    items,
  }))
})

watch(() => form.sp_layout, (val: any) => {
  if (!Array.isArray(val?.blocks)) return

  layoutBlocks.value = val.blocks.map((block: Partial<LayoutBlockConfig> & { id: string }) => {
    const template = getLayoutTemplateById(block.templateId || 'custom')
    const preset = LAYOUT_BLOCK_PRESETS[template.preset]

    return {
      id: block.id,
      templateId: block.templateId || template.id,
      category: block.category || template.category,
      label: block.label || template.defaultLabel,
      x: block.x ?? GRID,
      y: block.y ?? GRID,
      w: block.w ?? preset.cellsX * GRID,
      h: block.h ?? preset.cellsY * GRID,
      color: block.color || template.color,
    }
  })
}, { immediate: true })

watch(selectedTemplateId, (templateId) => {
  const template = getLayoutTemplateById(templateId)
  selectedPreset.value = template.preset
  if (!newBlockLabel.value.trim()) {
    newBlockLabel.value = template.defaultLabel
  }
}, { immediate: true })

function snap(v: number) { return Math.round(v / GRID) * GRID }
function canvasBounds() {
  return { w: canvasRef.value?.clientWidth ?? 700, h: CANVAS_H }
}
function presetSize(key: LayoutBlockPresetKey) {
  const preset = LAYOUT_BLOCK_PRESETS[key]
  return {
    w: preset.cellsX * GRID,
    h: preset.cellsY * GRID,
  }
}
function categoryLabel(category: LayoutBlockCategory) {
  return LAYOUT_BLOCK_CATEGORY_LABELS[category] ?? category
}

// ── Drag ────────────────────────────────────────────────────────
interface DragState { block: LayoutBlockConfig; startMX: number; startMY: number; origX: number; origY: number }
const dragState = ref<DragState | null>(null)

function startBlockDrag(block: LayoutBlockConfig, e: PointerEvent) {
  if (!alignMode.value) return
  const blockId = block.id
  const startMX = e.clientX
  const startMY = e.clientY
  const origX = block.x
  const origY = block.y
  dragState.value = { block, startMX, startMY, origX, origY }

  function onMove(ev: PointerEvent) {
    const b = layoutBlocks.value.find(x => x.id === blockId)
    if (!b) return
    const bounds = canvasBounds()
    b.x = snap(Math.max(0, Math.min(bounds.w - b.w, origX + ev.clientX - startMX)))
    b.y = snap(Math.max(0, Math.min(bounds.h - b.h, origY + ev.clientY - startMY)))
  }
  function onUp() {
    dragState.value = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    persistLayout()
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

// ── Resize ──────────────────────────────────────────────────────
interface ResizeState { block: LayoutBlockConfig; startMX: number; startMY: number; origW: number; origH: number }
const resizeState = ref<ResizeState | null>(null)

function startBlockResize(block: LayoutBlockConfig, e: PointerEvent) {
  const blockId = block.id
  const startMX = e.clientX
  const startMY = e.clientY
  const origW = block.w
  const origH = block.h
  resizeState.value = { block, startMX, startMY, origW, origH }

  function onMove(ev: PointerEvent) {
    const b = layoutBlocks.value.find(x => x.id === blockId)
    if (!b) return
    const bounds = canvasBounds()
    b.w = snap(Math.max(GRID * 2, Math.min(bounds.w - b.x, origW + ev.clientX - startMX)))
    b.h = snap(Math.max(GRID * 2, Math.min(bounds.h - b.y, origH + ev.clientY - startMY)))
  }
  function onUp() {
    resizeState.value = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    persistLayout()
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function addBlock() {
  const template = getLayoutTemplateById(selectedTemplateId.value)
  const label = newBlockLabel.value.trim() || template.defaultLabel
  const preset = presetSize(selectedPreset.value)
  const col = layoutBlocks.value.length % 3
  const row = Math.floor(layoutBlocks.value.length / 3)
  layoutBlocks.value.push({
    id: `b-${Date.now()}`,
    templateId: template.id,
    category: template.category,
    label,
    x: snap(GRID + col * (preset.w + GRID * 2)),
    y: snap(GRID + row * (preset.h + GRID * 2)),
    w: preset.w,
    h: preset.h,
    color: template.color,
  })
  newBlockLabel.value = template.defaultLabel
  persistLayout()
}

function removeBlock(id: string) {
  layoutBlocks.value = layoutBlocks.value.filter(b => b.id !== id)
  persistLayout()
}

function clearLayout() {
  if (!window.confirm('Очистить холст? Все блоки будут удалены.')) return
  layoutBlocks.value = []
  persistLayout()
}

function persistLayout() {
  form.sp_layout = { blocks: layoutBlocks.value.map(b => ({ ...b })) }
  save()
}
</script>

<style scoped src="./AdminSpacePlanning.scoped.css"></style>
