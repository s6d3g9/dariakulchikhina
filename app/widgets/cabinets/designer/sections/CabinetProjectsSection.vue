<template>
  <div class="cab-section" data-section="projects">
    <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalist }">
      <h2>Мои проекты</h2>
      <GlassButton variant="primary" @click="showNewProjectModal = true">＋ Новый проект</GlassButton>
    </div>
    <p v-if="projectEditError" class="cab-inline-error">{{ projectEditError }}</p>
    <p v-if="projectEditSuccess" class="cab-inline-success">{{ projectEditSuccess }}</p>

    <!-- New project modal -->
    <div v-if="showNewProjectModal" class="u-modal glass-surface" :class="{ 'u-modal--brutalist-project': isBrutalist }">
      <div class="u-modal__head">
        <span class="u-modal__title">Создать проект</span>
        <button class="u-modal__close" @click="showNewProjectModal = false">✕</button>
      </div>
      <div class="u-modal__body">
        <div class="u-field">
          <label class="u-field__label">Название проекта *</label>
          <GlassInput v-model="newProject.title" placeholder="Квартира на Арбате" @input="newProject.slug = autoSlug(newProject.title)" />
        </div>
        <div class="u-field">
          <label class="u-field__label">Slug (URL)</label>
          <GlassInput v-model="newProject.slug" placeholder="kvartira-na-arbate" />
        </div>
        <div class="u-field">
          <label class="u-field__label">Пакет услуг</label>
          <select v-model="newProject.packageKey" class="glass-input">
            <option value="">— без пакета —</option>
            <option v-for="pkg in availablePackages" :key="pkg.key" :value="pkg.key">
              {{ getPackageDisplayTitle(pkg) }} ({{ (pkg.pricePerSqm ?? 0).toLocaleString('ru-RU') }} ₽/м²)
            </option>
          </select>
        </div>
        <div class="u-modal__row2">
          <div class="u-field">
            <label class="u-field__label">Цена за м²</label>
            <GlassInput v-model.number="newProject.pricePerSqm" type="number" min="0" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Площадь (м²)</label>
            <GlassInput v-model.number="newProject.area" type="number" min="0" />
          </div>
        </div>
        <div v-if="newProject.pricePerSqm && newProject.area" class="proj-total glass-surface" :class="{ 'proj-total--brutalist': isBrutalist }">
          <span>Итого:</span>
          <strong>{{ (newProject.pricePerSqm * newProject.area).toLocaleString('ru-RU') }} ₽</strong>
        </div>
        <div class="u-field">
          <label class="u-field__label">Примечание</label>
          <textarea v-model="newProject.notes" class="glass-input u-ta" rows="2" placeholder="Комментарий к проекту…" />
        </div>
      </div>
      <div class="u-modal__foot">
        <GlassButton
          variant="primary"
          :disabled="creatingProject || !newProject.title.trim() || !newProject.slug.trim()"
          @click="doCreateProject"
        >{{ creatingProject ? 'Создание…' : 'Создать проект' }}</GlassButton>
        <GlassButton variant="secondary" density="compact" @click="showNewProjectModal = false">Отмена</GlassButton>
      </div>
    </div>

    <!-- Project list -->
    <div v-if="!projects.length && !showNewProjectModal" class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalist }">
      <span>◒</span>
      <p>Проектов пока нет.<br>Создайте первый проект, чтобы начать работу.</p>
    </div>

    <div v-for="dp in projects" :key="dp.id" class="proj-card glass-surface" :class="{ 'proj-card--brutalist': isBrutalist }">
      <div class="proj-card-head">
        <div class="proj-card-title-row">
          <h3 class="proj-card-title">{{ dp.projectTitle }}</h3>
          <span class="u-status" :class="`u-status--${dp.status}`">
            {{ DESIGNER_PROJECT_STATUS_LABELS[dp.status as keyof typeof DESIGNER_PROJECT_STATUS_LABELS] || dp.status }}
          </span>
          <GlassButton variant="secondary" density="compact" type="button" @click="startEditDesignerProject(dp)">редактировать</GlassButton>
          <GlassButton as="NuxtLink" v-if="dp.projectSlug" :to="`/admin/projects/${dp.projectSlug}`" variant="secondary" density="compact" class="proj-card-admin-link">→ управление проектом</GlassButton>
        </div>
        <div class="proj-card-meta">
          <span v-if="dp.packageKey" class="proj-card-pkg">{{ getPackageTitle(dp.packageKey) }}</span>
          <span v-if="dp.area" class="proj-card-area">{{ dp.area }} м²</span>
          <span v-if="dp.pricePerSqm" class="proj-card-ppm">{{ dp.pricePerSqm.toLocaleString('ru-RU') }} ₽/м²</span>
          <span v-if="dp.totalPrice" class="proj-card-total">{{ dp.totalPrice.toLocaleString('ru-RU') }} ₽</span>
        </div>
      </div>

      <div v-if="editingDesignerProjectId === dp.id" class="u-modal glass-surface" :class="{ 'u-modal--brutalist-project': isBrutalist }" style="margin-top:10px">
        <div class="u-modal__body">
          <div class="u-modal__row2">
            <div class="u-field">
              <label class="u-field__label">Название проекта</label>
              <GlassInput v-model="projectEdit.title" @blur="queueProjectEditSave" />
            </div>
            <div class="u-field">
              <label class="u-field__label">Статус</label>
              <select v-model="projectEdit.status" class="glass-input" @change="queueProjectEditSave">
                <option value="draft">Черновик</option>
                <option value="active">В работе</option>
                <option value="paused">Пауза</option>
                <option value="completed">Завершён</option>
                <option value="archived">Архив</option>
              </select>
            </div>
            <div class="u-field">
              <label class="u-field__label">Пакет</label>
              <select v-model="projectEdit.packageKey" class="glass-input" @change="queueProjectEditSave">
                <option value="">— без пакета —</option>
                <option v-for="pkg in packages" :key="pkg.key" :value="pkg.key">{{ getPackageDisplayTitle(pkg) }}</option>
              </select>
            </div>
            <div class="u-field">
              <label class="u-field__label">Цена за м²</label>
              <GlassInput v-model.number="projectEdit.pricePerSqm" type="number" min="0" @blur="queueProjectEditSave" />
            </div>
            <div class="u-field">
              <label class="u-field__label">Площадь (м²)</label>
              <GlassInput v-model.number="projectEdit.area" type="number" min="0" @blur="queueProjectEditSave" />
            </div>
            <div class="u-field">
              <label class="u-field__label">Итого</label>
              <GlassInput :value="((projectEdit.pricePerSqm || 0) * (projectEdit.area || 0)).toLocaleString('ru-RU') + ' ₽'" readonly />
            </div>
          </div>
          <div class="u-field" style="margin-top:8px">
            <label class="u-field__label">Примечание</label>
            <textarea v-model="projectEdit.notes" class="glass-input u-ta" rows="2" @blur="queueProjectEditSave" />
          </div>
        </div>
        <div class="u-modal__foot">
          <span class="cab-autosave-status" :class="autosaveStatusClass(projectEditState)">{{ autosaveStatusLabel(projectEditState) }}</span>
          <GlassButton variant="secondary" density="compact" type="button" @click="cancelEditDesignerProject">свернуть</GlassButton>
        </div>
      </div>

      <div v-if="dp.notes" class="proj-notes">{{ dp.notes }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  DESIGNER_PROJECT_STATUS_LABELS,
  DESIGNER_PACKAGE_TEMPLATES,
  type DesignerPackage,
} from '~~/shared/types/designer'
import { getDesignerPackagePersistedKey } from '~~/shared/utils/designer-catalogs'

const props = defineProps<{
  designerId: number
  packages: DesignerPackage[]
  projects: any[]
  isBrutalist: boolean
}>()

const emit = defineEmits<{ refresh: [] }>()

// ── Local helpers ──

type InlineAutosaveState = '' | 'saving' | 'saved' | 'error'

function autosaveStatusClass(state: InlineAutosaveState) {
  return state ? `cab-autosave-status--${state}` : 'cab-autosave-status--idle'
}

function autosaveStatusLabel(state: InlineAutosaveState) {
  if (state === 'saving') return '[ СОХРАНЕНИЕ... ]'
  if (state === 'saved') return '[ СОХРАНЕНО ]'
  if (state === 'error') return '[ ОШИБКА СОХРАНЕНИЯ ]'
  return '[ AUTOSAVE ]'
}

function setAutosaveSettled(state: { value: InlineAutosaveState }, expected: InlineAutosaveState) {
  setTimeout(() => {
    if (state.value === expected) state.value = ''
  }, 2200)
}

// ── Package helpers ──

function getPackagePersistedKey(pkg: DesignerPackage, index = props.packages.findIndex(item => item === pkg)) {
  return getDesignerPackagePersistedKey(pkg, Math.max(index, 0))
}

function getPackageDisplayTitle(pkg: DesignerPackage | null | undefined, index = 0): string {
  if (!pkg) return `Пакет ${index + 1}`
  const title = String(pkg.title || '').trim()
  if (title) return title
  const template = DESIGNER_PACKAGE_TEMPLATES.find(item => item.key === pkg.key)
  if (template?.title) return template.title
  return `Пакет ${index + 1}`
}

function getPackageTitle(key: string): string {
  const pkg = props.packages.find(p => p.key === key)
  if (pkg) return pkg.title
  const tmpl = DESIGNER_PACKAGE_TEMPLATES.find(t => t.key === key)
  return tmpl?.title || key
}

const availablePackages = computed(() => {
  if (props.packages.length) return props.packages.filter(p => p.enabled)
  return DESIGNER_PACKAGE_TEMPLATES.map(t => ({
    key: t.key,
    title: t.title,
    pricePerSqm: t.suggestedPricePerSqm,
    enabled: true,
    description: t.description,
    serviceKeys: t.serviceKeys,
  }))
})

// ── Slug helper ──

function autoSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[а-яё]/g, (ch) => {
      const map: Record<string, string> = {
        а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
        з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
        п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
        ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
      }
      return map[ch] || ch
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

// ── New project state ──

const showNewProjectModal = ref(false)
const creatingProject = ref(false)
const newProject = reactive({
  title: '',
  slug: '',
  packageKey: '',
  pricePerSqm: 0,
  area: 0,
  notes: '',
})

watch(() => newProject.packageKey, (pk) => {
  if (!pk) return
  const tmpl = DESIGNER_PACKAGE_TEMPLATES.find(p => p.key === pk)
  if (tmpl) newProject.pricePerSqm = tmpl.suggestedPricePerSqm
  const custom = props.packages.find(p => p.key === pk)
  if (custom) newProject.pricePerSqm = custom.pricePerSqm
})

async function doCreateProject() {
  if (!newProject.title.trim() || !newProject.slug.trim()) return
  creatingProject.value = true
  try {
    await $fetch(`/api/designers/${props.designerId}/create-project`, {
      method: 'POST',
      body: {
        designerId: props.designerId,
        title: newProject.title,
        slug: newProject.slug,
        packageKey: newProject.packageKey || undefined,
        pricePerSqm: newProject.pricePerSqm || undefined,
        area: newProject.area || undefined,
        totalPrice: (newProject.pricePerSqm && newProject.area)
          ? newProject.pricePerSqm * newProject.area
          : undefined,
        notes: newProject.notes || undefined,
      },
    })
    emit('refresh')
    showNewProjectModal.value = false
    newProject.title = ''
    newProject.slug = ''
    newProject.packageKey = ''
    newProject.pricePerSqm = 0
    newProject.area = 0
    newProject.notes = ''
  } finally {
    creatingProject.value = false
  }
}

// ── Project edit state ──

const editingDesignerProjectId = ref<number | null>(null)
const savingProject = ref(false)
const projectEditError = ref('')
const projectEditSuccess = ref('')
const projectEditState = ref<InlineAutosaveState>('')
const projectEditSnapshot = ref('')
let projectEditTimer: ReturnType<typeof setTimeout> | null = null
const projectEdit = reactive({
  designerProjectId: 0,
  title: '',
  packageKey: '',
  pricePerSqm: 0,
  area: 0,
  status: 'draft' as 'draft' | 'active' | 'paused' | 'completed' | 'archived',
  notes: '',
})

function clearProjectEditTimer() {
  if (!projectEditTimer) return
  clearTimeout(projectEditTimer)
  projectEditTimer = null
}

function serializeProjectEdit() {
  return JSON.stringify({
    designerProjectId: projectEdit.designerProjectId,
    title: projectEdit.title,
    packageKey: projectEdit.packageKey,
    pricePerSqm: projectEdit.pricePerSqm,
    area: projectEdit.area,
    status: projectEdit.status,
    notes: projectEdit.notes,
  })
}

function startEditDesignerProject(dp: any) {
  projectEditError.value = ''
  projectEditSuccess.value = ''
  projectEditState.value = ''
  editingDesignerProjectId.value = dp.id
  projectEdit.designerProjectId = dp.id
  projectEdit.title = String(dp.projectTitle || '')
  projectEdit.packageKey = String(dp.packageKey || '')
  projectEdit.pricePerSqm = Number(dp.pricePerSqm || 0)
  projectEdit.area = Number(dp.area || 0)
  projectEdit.status = (dp.status || 'draft') as any
  projectEdit.notes = String(dp.notes || '')
  projectEditSnapshot.value = serializeProjectEdit()
}

function cancelEditDesignerProject() {
  clearProjectEditTimer()
  editingDesignerProjectId.value = null
  projectEditError.value = ''
  projectEditState.value = ''
}

async function saveDesignerProjectEdits() {
  clearProjectEditTimer()
  projectEditError.value = ''
  if (!projectEdit.title.trim()) {
    projectEditError.value = 'Укажите название проекта'
    projectEditState.value = 'error'
    return
  }

  savingProject.value = true
  projectEditState.value = 'saving'
  try {
    await $fetch(`/api/designers/${props.designerId}/project`, {
      method: 'PUT',
      body: {
        designerProjectId: projectEdit.designerProjectId,
        title: projectEdit.title.trim(),
        packageKey: projectEdit.packageKey || null,
        pricePerSqm: Number(projectEdit.pricePerSqm || 0),
        area: Number(projectEdit.area || 0),
        status: projectEdit.status,
        notes: projectEdit.notes || null,
      },
    })
    emit('refresh')
    projectEditSnapshot.value = serializeProjectEdit()
    projectEditState.value = 'saved'
    setAutosaveSettled(projectEditState, 'saved')
  } catch (e: any) {
    projectEditError.value = e?.data?.message || 'Не удалось сохранить проект'
    projectEditState.value = 'error'
  } finally {
    savingProject.value = false
  }
}

function queueProjectEditSave() {
  if (!editingDesignerProjectId.value) return
  const nextSnapshot = serializeProjectEdit()
  if (nextSnapshot === projectEditSnapshot.value) return
  clearProjectEditTimer()
  projectEditTimer = setTimeout(() => { saveDesignerProjectEdits() }, 120)
}
</script>
