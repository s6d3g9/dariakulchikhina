<template>
  <div>
    <div class="a-card" style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;margin-bottom:16px">
      <span style="font-size:.78rem;color:#888;text-transform:uppercase;letter-spacing:.5px">шаблоны и сценарии проектов</span>
      <button class="a-btn-save" @click="openCreate" style="padding:7px 18px;font-size:.82rem">+ добавить шаблон</button>
    </div>

    <div v-if="pending" style="font-size:.88rem;color:#999">Загрузка...</div>
    <div v-else-if="!templates?.length" style="font-size:.88rem;color:#999">Нет шаблонов</div>
    <div v-else>
      <div v-for="tpl in templates" :key="tpl.key" class="a-card" style="padding:16px 20px;margin-bottom:8px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <div>
            <div style="font-size:.9rem;font-weight:500;color:#1a1a1a;margin-bottom:3px">{{ tpl.title }}</div>
            <div style="font-size:.76rem;color:#888;margin-bottom:4px">
              {{ objectLabel(tpl.objectType) }} · {{ clientLabel(tpl.clientType) }} · {{ complexityLabel(tpl.complexity) }}
            </div>
            <div style="font-size:.76rem;color:#aaa">этапов: {{ tpl.stages?.length || 0 }} · {{ tpl.isBuiltIn ? 'встроенный' : 'пользовательский' }}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
            <button class="a-btn-sm" @click="cloneTemplate(tpl)">клонировать</button>
            <button class="a-btn-sm" :disabled="tpl.isBuiltIn" @click="openEdit(tpl)">изменить</button>
            <button class="a-btn-sm a-btn-danger" :disabled="tpl.isBuiltIn" @click="removeTemplate(tpl)">удалить</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="a-modal-backdrop" @click.self="closeModal">
      <div class="a-modal" style="width:760px;max-width:94vw">
        <h3 style="font-size:.85rem;font-weight:400;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:20px">
          {{ editingKey ? 'редактировать шаблон' : 'новый шаблон' }}
        </h3>

        <form @submit.prevent="saveTemplate">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="a-field">
              <label>Название *</label>
              <input v-model="form.title" class="a-input" required>
            </div>
            <div class="a-field">
              <label>Сложность *</label>
              <select v-model="form.complexity" class="a-input" style="border:1px solid #ddd;padding:8px" required>
                <option v-for="opt in ROADMAP_COMPLEXITY_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="a-field">
              <label>Тип объекта *</label>
              <select v-model="form.objectType" class="a-input" style="border:1px solid #ddd;padding:8px" required>
                <option v-for="opt in OBJECT_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="a-field">
              <label>Тип клиента *</label>
              <select v-model="form.clientType" class="a-input" style="border:1px solid #ddd;padding:8px" required>
                <option v-for="opt in CLIENT_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>

          <div class="a-field">
            <label>Описание</label>
            <textarea v-model="form.description" class="a-input" rows="2" style="border:1px solid #ddd;padding:8px"></textarea>
          </div>

          <div class="a-field">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <label>Этапы шаблона *</label>
              <button type="button" class="a-btn-sm" @click="addStage">+ этап</button>
            </div>
            <div style="display:grid;gap:8px;max-height:300px;overflow:auto;padding-right:4px">
              <div v-for="(stage, idx) in form.stages" :key="idx" class="a-stage-item">
                <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end">
                  <div>
                    <label style="font-size:.72rem;color:#888">Название этапа</label>
                    <input v-model="stage.title" class="a-input" required>
                  </div>
                  <div>
                    <label style="font-size:.72rem;color:#888">Тип этапа</label>
                    <select v-model="stage.stageKey" class="a-input" style="border:1px solid #ddd;padding:8px" required>
                      <option v-for="opt in ROADMAP_STAGE_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                  <button type="button" class="a-btn-sm a-btn-danger" @click="delStage(idx)">удалить</button>
                </div>
                <div style="margin-top:8px">
                  <label style="font-size:.72rem;color:#888">Описание этапа</label>
                  <input v-model="stage.description" class="a-input">
                </div>
              </div>
            </div>
          </div>

          <p v-if="formError" style="color:#c00;font-size:.8rem;margin-bottom:10px">{{ formError }}</p>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
            <button type="button" class="a-btn-sm" @click="closeModal">отмена</button>
            <button type="submit" class="a-btn-save" :disabled="saving">{{ saving ? '...' : 'сохранить' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CLIENT_TYPE_OPTIONS,
  OBJECT_TYPE_OPTIONS,
  ROADMAP_COMPLEXITY_OPTIONS,
  ROADMAP_STAGE_TYPE_OPTIONS,
} from '~~/shared/types/catalogs'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

const { data: templates, pending, refresh } = await useFetch<any[]>('/api/roadmap-templates')

const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const editingKey = ref<string | null>(null)

const form = reactive({
  title: '',
  objectType: 'apartment',
  clientType: 'physical_person',
  complexity: 'standard',
  description: '',
  stages: [
    { stageKey: 'brief', title: 'Бриф', description: '' },
    { stageKey: 'concept', title: 'Концепция', description: '' },
  ] as Array<{ stageKey: string; title: string; description: string }>,
})

function objectLabel(value: string) {
  return OBJECT_TYPE_OPTIONS.find(o => o.value === value)?.label || value
}
function clientLabel(value: string) {
  return CLIENT_TYPE_OPTIONS.find(o => o.value === value)?.label || value
}
function complexityLabel(value: string) {
  return ROADMAP_COMPLEXITY_OPTIONS.find(o => o.value === value)?.label || value
}

function addStage() {
  form.stages.push({ stageKey: 'planning', title: 'Новый этап', description: '' })
}
function delStage(idx: number) {
  form.stages.splice(idx, 1)
}

function resetForm() {
  Object.assign(form, {
    title: '',
    objectType: 'apartment',
    clientType: 'physical_person',
    complexity: 'standard',
    description: '',
  })
  form.stages = [
    { stageKey: 'brief', title: 'Бриф', description: '' },
    { stageKey: 'concept', title: 'Концепция', description: '' },
  ]
}

function openCreate() {
  editingKey.value = null
  formError.value = ''
  resetForm()
  showModal.value = true
}

function openEdit(tpl: any) {
  editingKey.value = tpl.key
  formError.value = ''
  form.title = tpl.title
  form.objectType = tpl.objectType
  form.clientType = tpl.clientType
  form.complexity = tpl.complexity
  form.description = tpl.description || ''
  form.stages = (tpl.stages || []).map((s: any) => ({
    stageKey: s.stageKey,
    title: s.title,
    description: s.description || '',
  }))
  showModal.value = true
}

function cloneTemplate(tpl: any) {
  editingKey.value = null
  formError.value = ''
  form.title = `${tpl.title} (копия)`
  form.objectType = tpl.objectType
  form.clientType = tpl.clientType
  form.complexity = tpl.complexity
  form.description = tpl.description || ''
  form.stages = (tpl.stages || []).map((s: any) => ({
    stageKey: s.stageKey,
    title: s.title,
    description: s.description || '',
  }))
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingKey.value = null
}

async function saveTemplate() {
  if (!form.stages.length) {
    formError.value = 'Добавьте хотя бы один этап'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const body = {
      title: form.title,
      objectType: form.objectType,
      clientType: form.clientType,
      complexity: form.complexity,
      description: form.description,
      stages: form.stages.map((s) => ({
        stageKey: s.stageKey,
        title: s.title,
        description: s.description || undefined,
      })),
    }
    if (editingKey.value) {
      await $fetch(`/api/roadmap-templates/${editingKey.value}`, { method: 'PUT', body })
    } else {
      await $fetch('/api/roadmap-templates', { method: 'POST', body })
    }
    closeModal()
    refresh()
  } catch (e: any) {
    formError.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}

async function removeTemplate(tpl: any) {
  if (tpl.isBuiltIn) return
  if (!confirm(`Удалить шаблон "${tpl.title}"?`)) return
  await $fetch(`/api/roadmap-templates/${tpl.key}`, { method: 'DELETE' })
  refresh()
}
</script>

<style scoped>
.a-card { background: #fff; border: 1px solid #e0e0e0; }
.a-btn-sm {
  border: 1px solid #ddd; background: transparent; padding: 4px 10px;
  font-size: .78rem; cursor: pointer; font-family: inherit; border-radius: 2px;
}
.a-btn-sm:hover { border-color: #1a1a1a; }
.a-btn-sm:disabled { opacity: .5; cursor: default; }
.a-btn-danger { color: #c00; border-color: #c00; }
.a-btn-danger:hover { background: #c00; color: #fff; }
.a-btn-save {
  border: 1px solid #1a1a1a; background: #1a1a1a; color: #fff;
  padding: 10px 24px; font-size: .85rem; cursor: pointer; font-family: inherit;
}
.a-btn-save:hover { background: #333; }
.a-field { margin-bottom: 14px; }
.a-field label { display: block; font-size: .76rem; color: #888; margin-bottom: 5px; }
.a-input {
  display: block; width: 100%; border: none; border-bottom: 1px solid #ddd;
  padding: 8px 0; font-size: .88rem; outline: none; font-family: inherit;
}
.a-input:focus { border-bottom-color: #1a1a1a; }
.a-modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.3);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.a-modal { background: #fff; border: 1px solid #e0e0e0; padding: 24px; max-height: 90vh; overflow: auto; }
.a-stage-item { border: 1px solid #eee; padding: 10px; }
html.dark .a-stage-item { border-color: #2d2d2d; background: #1e1e20; }
</style>
