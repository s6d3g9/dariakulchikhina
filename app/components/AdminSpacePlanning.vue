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
      </div>

      <!-- Section: General info -->
      <div class="asp-section">
        <div class="asp-section-title">общая информация</div>
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
      <div class="asp-section">
        <div class="asp-section-title">файлы планировок</div>

        <div class="asp-files-list" v-if="form.sp_files && form.sp_files.length">
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
      <div class="asp-section">
        <div class="asp-section-title">согласование</div>
        <div class="asp-checks-row">
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

    </template>
  </div>
</template>

<script setup lang="ts">
import { buildWipe2Cards } from '~/composables/useWipe2'
import type { Wipe2EntityData } from '~/shared/types/wipe2'

const props = defineProps<{ slug: string }>()

// ── Wipe 2 global state — пишем ДО await ──────────────────────
// useState работает как глобальный синглтон, доступный без provide/inject
const _w2 = useState<Wipe2EntityData | null>('wipe2-entity-data', () => null)

const STATUS_LABELS_SP: Record<string, string> = {
  '': 'не задан', in_work: 'в работе', sent_to_client: 'отправлен клиенту',
  revision: 'на доработке', approved: 'согласован',
}
const STATUS_COLOR_SP: Record<string, string> = {
  '': 'muted', in_work: 'blue', sent_to_client: 'amber', revision: 'red', approved: 'green',
}

// ── form + wipe2 регистрируются ДО await, чтобы inject работал синхронно ──
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
})

const statusColor = useStatusColor(form, 'sp_status')

// ── Синхронизируем wipe2 данные при изменении формы ─────────────
// watch вместо watchEffect — явные зависимости, гарантированно реактивно
watch(
  () => ({
    status: form.sp_status,
    version: form.sp_version,
    sentDate: form.sp_sent_date,
    approvedDate: form.sp_approved_date,
    architectNotes: form.sp_architect_notes,
    clientNotes: form.sp_client_notes,
    files: form.sp_files ? [...form.sp_files] : [],
    dimChecked: form.sp_dimensions_checked,
    zonesApproved: form.sp_zones_approved,
    geoLocked: form.sp_geometry_locked,
  }),
  (v) => {
    _w2.value = {
      entityTitle: 'Планировочные решения',
      entitySubtitle: v.version ? `версия ${v.version}` : undefined,
      entityStatus: (STATUS_LABELS_SP[v.status] ?? v.status) || undefined,
      entityStatusColor: STATUS_COLOR_SP[v.status] ?? 'muted',
      sections: [
        {
          title: 'Общая информация',
          fields: [
            { label: 'Версия комплекта', value: v.version },
            { label: 'Статус', value: v.status, type: 'status' as const },
            { label: 'Отправлено клиенту', value: v.sentDate, type: 'date' as const },
            { label: 'Согласовано', value: v.approvedDate, type: 'date' as const },
            { label: 'Комментарий архитектора', value: v.architectNotes, type: 'multiline' as const },
            { label: 'Замечания клиента', value: v.clientNotes, type: 'multiline' as const },
          ],
        },
        {
          title: 'Согласование',
          fields: [
            { label: 'Размеры проверены', value: v.dimChecked, type: 'boolean' as const },
            { label: 'Зонирование согласовано', value: v.zonesApproved, type: 'boolean' as const },
            { label: 'Геометрия заморожена', value: v.geoLocked, type: 'boolean' as const },
          ],
        },
        ...(v.files.length ? [{
          title: 'Файлы планировок',
          fields: v.files.map((f: any) => ({
            label: f.label || f.filename || 'файл',
            value: f.approval ? (STATUS_LABELS_SP[f.approval] ?? f.approval) : 'на рассмотрении',
            type: 'status' as const,
          })),
        }] : []),
      ],
    }
  },
  { immediate: true, deep: true }
)

onUnmounted(() => { _w2.value = null })

// ── Данные проекта — после await ──────────────────────────────────
const { data: project, pending, refresh } = await useFetch<any>(() => `/api/projects/${props.slug}`)

// Заполняем форму когда данные загружены
watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => {
    if (pf[k] !== undefined) (form as any)[k] = pf[k]
  })
}, { immediate: true })

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
</script>

<style scoped>
.asp-wrap { padding: 4px 0 40px; }
.asp-loading { padding: 40px 0; font-size: .82rem; color: var(--ds-muted, #aaa); }

.asp-status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
.asp-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
/* dot colors: → main.css [class*="-dot--*"] */
</style>
