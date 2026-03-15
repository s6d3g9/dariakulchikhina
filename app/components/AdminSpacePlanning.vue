<template>
  <div class="asp-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
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
        <button
          class="a-btn-sm"
          :class="{ 'asp-align-on': alignMode }"
          :title="alignMode ? 'Выключить режим выравнивания' : 'Включить драг-выравнивание по сетке'"
          @click="alignMode = !alignMode"
        >⊞ {{ alignMode ? 'выравнивание' : 'выровнять' }}</button>
        <button
          v-if="alignMode && layoutBlocks.length"
          class="a-btn-sm a-btn-danger"
          @click="clearLayout"
        >↺</button>
      </div>

      <!-- Section: General info -->
      <div class="u-form-section" data-cv-unit="section">
        <div class="u-section-title">общая информация</div>
        <div class="u-grid-2">
          <div class="u-field">
            <label class="u-field__label">версия комплекта</label>
            <input v-model="form.sp_version" class="glass-input" placeholder="v1, v2, финальная..." @blur="save">
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
                <input v-model="file.comment" class="glass-input glass-input--inline" placeholder="комментарий..." @blur="save">
              </div>
            </div>
            <button class="asp-file-del" @click="removeFile(Number(idx))" title="удалить">×</button>
          </div>
        </div>
        <div v-else class="asp-files-empty">Файлы ещё не загружены</div>

        <label class="asp-upload-btn" :class="{ 'asp-upload-btn--loading': uploading }">
          {{ uploading ? 'загрузка...' : '+ добавить файл' }}
          <input type="file" multiple accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.webp" style="display:none" @change="onFileInput" :disabled="uploading">
        </label>
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
            @mousedown.stop="startBlockDrag(block, $event)"
          >
            <span class="asp-block__lbl">{{ block.label }}</span>
            <button v-if="alignMode" class="asp-block__del" @click.stop="removeBlock(block.id)">×</button>
            <div v-if="alignMode" class="asp-block__rsz" @mousedown.stop="startBlockResize(block, $event)" />
          </div>
          <div v-if="!layoutBlocks.length" class="asp-canvas-empty">
            <span v-if="alignMode">введите название зоны и нажмите «+ добавить»</span>
            <span v-else>нажмите «выровнять» чтобы добавить зоны на схему</span>
          </div>
        </div>

        <!-- Add-block toolbar -->
        <Transition name="asp-slide">
          <div v-if="alignMode" class="asp-add-bar">
            <input
              v-model="newBlockLabel"
              class="glass-input"
              placeholder="название зоны (гостиная, кухня, санузел...)"
              @keydown.enter="addBlock"
            >
            <div class="asp-presets">
              <button
                v-for="ps in BLOCK_PRESETS"
                :key="ps.key"
                class="a-btn-sm"
                :class="{ 'asp-preset--on': selectedPreset === ps.key }"
                :title="`${ps.w / GRID}×${ps.h / GRID} ячеек`"
                @click="selectedPreset = ps.key"
              >{{ ps.key }}</button>
            </div>
            <button class="a-btn-sm" @click="addBlock">+ добавить</button>
          </div>
        </Transition>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { registerWipe2Data } from '~/composables/useWipe2'

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
const BLOCK_COLORS = ['#4a80f0','#f57c00','#43a047','#e53935','#8e24aa','#00897b','#f5a623','#0288d1']
const BLOCK_PRESETS = [
  { key: 'S',  w: 3 * GRID, h: 2 * GRID },
  { key: 'M',  w: 6 * GRID, h: 4 * GRID },
  { key: 'L',  w: 8 * GRID, h: 5 * GRID },
  { key: 'XL', w: 12 * GRID, h: 8 * GRID },
]

interface LayoutBlock { id: string; label: string; x: number; y: number; w: number; h: number; color: string }

// shared with UIDesignPanel dp-topbar button
const alignMode = useState('asp-align-mode', () => false)
const canvasRef      = ref<HTMLElement | null>(null)
const newBlockLabel  = ref('')
const selectedPreset = ref('M')
const layoutBlocks   = ref<LayoutBlock[]>([])

watch(() => form.sp_layout, (val: any) => {
  if (Array.isArray(val?.blocks)) layoutBlocks.value = val.blocks
}, { immediate: true })

function snap(v: number) { return Math.round(v / GRID) * GRID }
function canvasBounds() {
  return { w: canvasRef.value?.clientWidth ?? 700, h: CANVAS_H }
}

// ── Drag ────────────────────────────────────────────────────────
interface DragState { block: LayoutBlock; startMX: number; startMY: number; origX: number; origY: number }
const dragState = ref<DragState | null>(null)

function startBlockDrag(block: LayoutBlock, e: MouseEvent) {
  if (!alignMode.value) return
  e.preventDefault()
  dragState.value = { block, startMX: e.clientX, startMY: e.clientY, origX: block.x, origY: block.y }
  const bounds = canvasBounds()
  function onMove(e: MouseEvent) {
    if (!dragState.value) return
    const { startMX, startMY, origX, origY } = dragState.value
    block.x = snap(Math.max(0, Math.min(bounds.w - block.w, origX + e.clientX - startMX)))
    block.y = snap(Math.max(0, Math.min(bounds.h - block.h, origY + e.clientY - startMY)))
  }
  function onUp() {
    dragState.value = null
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    persistLayout()
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

// ── Resize ──────────────────────────────────────────────────────
interface ResizeState { block: LayoutBlock; startMX: number; startMY: number; origW: number; origH: number }
const resizeState = ref<ResizeState | null>(null)

function startBlockResize(block: LayoutBlock, e: MouseEvent) {
  e.preventDefault()
  resizeState.value = { block, startMX: e.clientX, startMY: e.clientY, origW: block.w, origH: block.h }
  const bounds = canvasBounds()
  function onMove(e: MouseEvent) {
    if (!resizeState.value) return
    const { startMX, startMY, origW, origH } = resizeState.value
    block.w = snap(Math.max(GRID * 2, Math.min(bounds.w - block.x, origW + e.clientX - startMX)))
    block.h = snap(Math.max(GRID * 2, Math.min(bounds.h - block.y, origH + e.clientY - startMY)))
  }
  function onUp() {
    resizeState.value = null
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    persistLayout()
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function addBlock() {
  const label = newBlockLabel.value.trim()
  if (!label) return
  const preset = BLOCK_PRESETS.find(p => p.key === selectedPreset.value) ?? BLOCK_PRESETS[1]
  const col = layoutBlocks.value.length % 3
  const row = Math.floor(layoutBlocks.value.length / 3)
  layoutBlocks.value.push({
    id: `b-${Date.now()}`,
    label,
    x: snap(GRID + col * (preset.w + GRID * 2)),
    y: snap(GRID + row * (preset.h + GRID * 2)),
    w: preset.w,
    h: preset.h,
    color: BLOCK_COLORS[layoutBlocks.value.length % BLOCK_COLORS.length],
  })
  newBlockLabel.value = ''
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

<style scoped>
.asp-wrap { padding: 4px 0 40px; }

.asp-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; flex-wrap: wrap; }
.asp-status-row__spacer { flex: 1; }
.asp-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
/* dot colors: → main.css [class*="-dot--*"] */
.asp-saved { font-size: .75rem; opacity: .5; }

/* ── File list ── */
.asp-files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.asp-file-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--card-radius, 10px);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
}

.asp-file-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
  width: 30px;
  text-align: center;
  line-height: 1;
  padding-top: 2px;
}

.asp-file-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.asp-file-name {
  font-size: .88rem;
  font-weight: 500;
  color: var(--glass-text);
  text-decoration: none;
  word-break: break-all;
  opacity: .85;
}
.asp-file-name:hover { opacity: 1; text-decoration: underline; }

.asp-file-row2 {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.asp-file-del {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--glass-text);
  opacity: .35;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  padding: 2px 4px;
  transition: opacity .15s;
}
.asp-file-del:hover { opacity: 1; }

.asp-files-empty {
  padding: 12px 0;
  font-size: .82rem;
  opacity: .4;
}

/* ── Upload button ── */
.asp-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 7px 16px;
  border: 1px dashed var(--glass-border);
  border-radius: var(--card-radius, 8px);
  font-size: .8rem;
  cursor: pointer;
  opacity: .6;
  transition: opacity .15s, border-color .15s;
}
.asp-upload-btn:hover { opacity: 1; border-color: var(--glass-text); }
.asp-upload-btn--loading { opacity: .35; cursor: default; pointer-events: none; }

/* ── Checkboxes ── */
.asp-checks-row {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
.asp-check-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: .85rem;
  cursor: pointer;
}

/* ─── Layout canvas ────────────────────────────────────────────── */
.asp-layout-section { margin-top: 8px; }

.asp-align-on {
  background: color-mix(in srgb, var(--ds-accent, #4a80f0) 16%, transparent) !important;
  border-color: color-mix(in srgb, var(--ds-accent, #4a80f0) 60%, var(--glass-border)) !important;
  color: var(--ds-accent, #4a80f0) !important;
}

/* Canvas */
.asp-canvas {
  position: relative;
  width: 100%;
  height: 400px;
  border-radius: var(--card-radius, 10px);
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  overflow: hidden;
  user-select: none;
  transition: background .2s;
}
.asp-canvas--align {
  background-image:
    linear-gradient(color-mix(in srgb, var(--glass-text) 7%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--glass-text) 7%, transparent) 1px, transparent 1px);
  background-size: 20px 20px;
  cursor: default;
}

.asp-canvas-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .82rem;
  opacity: .35;
  pointer-events: none;
}

/* Block */
.asp-block {
  position: absolute;
  border: 2px solid var(--block-color);
  background: color-mix(in srgb, var(--block-color) 13%, transparent);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow .12s;
  overflow: hidden;
}
.asp-canvas--align .asp-block { cursor: move; }
.asp-block--active {
  box-shadow: 0 0 0 2px var(--block-color), 0 6px 24px -4px color-mix(in srgb, var(--block-color) 35%, transparent);
  z-index: 10;
}

.asp-block__lbl {
  font-size: .75rem;
  font-weight: 700;
  color: var(--block-color);
  text-align: center;
  padding: 4px 20px 4px 6px;
  word-break: break-word;
  line-height: 1.2;
  pointer-events: none;
}
.asp-block__del {
  position: absolute;
  top: 3px;
  right: 4px;
  background: none;
  border: none;
  color: var(--block-color);
  opacity: .4;
  font-size: .88rem;
  line-height: 1;
  padding: 0 2px;
  cursor: pointer;
  transition: opacity .12s;
}
.asp-block__del:hover { opacity: 1; }

.asp-block__rsz {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 14px;
  height: 14px;
  cursor: se-resize;
  opacity: .55;
  background: linear-gradient(-45deg, var(--block-color) 35%, transparent 35%);
  border-radius: 0 0 4px 0;
}
.asp-block__rsz:hover { opacity: 1; }

/* Add toolbar */
.asp-add-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.asp-presets { display: flex; gap: 4px; }
.asp-preset--on {
  background: color-mix(in srgb, var(--ds-accent, #4a80f0) 16%, transparent) !important;
  border-color: color-mix(in srgb, var(--ds-accent, #4a80f0) 50%, var(--glass-border)) !important;
  color: var(--ds-accent, #4a80f0) !important;
}

/* Transition */
.asp-slide-enter-active, .asp-slide-leave-active { transition: all .18s ease; }
.asp-slide-enter-from, .asp-slide-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
