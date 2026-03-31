<template>
  <div class="aps-wrap">
    <div v-if="pending" class="ent-content-loading">
      <div class="ent-skeleton-line" v-for="i in 6" :key="i" />
    </div>
    <template v-else-if="project">

      <!-- ── Тип объекта ──────────────────────────────── -->
      <div class="aps-section">
        <div class="aps-section-title">тип объекта</div>
        <div class="aps-current-type">
          <span class="aps-type-icon">{{ currentPreset?.icon }}</span>
          <span class="aps-type-label">{{ currentPreset?.label ?? project.projectType }}</span>
          <span class="aps-type-cat">{{ currentPreset?.category === 'residential' ? 'жилой' : 'коммерческий' }}</span>
        </div>
        <div class="aps-preset-groups">
          <div v-for="cat in ['residential', 'commercial']" :key="cat" class="aps-preset-group">
            <div class="aps-preset-cat-label">{{ cat === 'residential' ? 'Жилые' : 'Коммерческие' }}</div>
            <div class="aps-preset-grid">
              <button
                v-for="p in getPresetsByCategory(cat as 'residential' | 'commercial')"
                :key="p.key"
                type="button"
                class="aps-preset-card"
                :class="{ 'aps-preset-card--active': form.projectType === p.key }"
                :disabled="saving"
                @click="selectType(p.key)"
              >
                <span class="aps-preset-icon">{{ p.icon }}</span>
                <span class="aps-preset-name">{{ p.label }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Название и статус ────────────────────────── -->
      <div class="aps-section">
        <div class="aps-section-title">основные параметры</div>
        <div class="u-form-section">
          <div class="u-field">
            <label class="u-field__label">Название проекта</label>
            <input v-model="form.title" class="glass-input" type="text" placeholder="Название" @blur="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">Статус</label>
            <select v-model="form.status" class="glass-input" @change="save">
              <option v-for="s in PROJECT_PHASES" :key="s.key" :value="s.key">{{ s.label }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- ── Активные разделы ─────────────────────────── -->
      <div class="aps-section">
        <div class="aps-section-title">активные разделы проекта</div>
        <div class="aps-pages-hint">Отметьте разделы, которые используются в этом проекте</div>
        <div v-for="group in pageGroups" :key="group.label" class="aps-phase-group">
          <div class="aps-phase-label">{{ group.label }}</div>
          <div class="aps-pages-grid">
            <button
              v-for="pg in group.pages"
              :key="pg.slug"
              type="button"
              class="aps-page-toggle"
              :class="{ 'aps-page-toggle--on': form.pages.includes(pg.slug) }"
              :disabled="saving"
              @click="togglePage(pg.slug)"
            >
              <span v-if="pg.icon" class="aps-page-icon">{{ pg.icon }}</span>
              {{ pg.title.replace(/^\d+\.\d+\s*/, '') }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Footer ──────────────────────────────────── -->
      <div class="aps-footer">
        <span v-if="savedAt" class="aps-saved">✓ сохранено {{ savedAt }}</span>
        <button class="a-btn-save" :disabled="saving" @click="save">
          {{ saving ? 'сохранение...' : 'сохранить настройки' }}
        </button>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { PROJECT_PRESETS, getPresetsByCategory, findPreset } from '~~/shared/constants/presets'
import { getAdminNavGroups } from '~~/shared/constants/pages'
import { PROJECT_PHASES } from '~~/shared/types/catalogs'

const props = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const form = reactive({
  title: '',
  status: 'lead',
  projectType: 'apartment',
  pages: [] as string[],
})

watch(project, (p) => {
  if (!p) return
  form.title       = p.title       || ''
  form.status      = p.status      || 'lead'
  form.projectType = p.projectType || 'apartment'
  form.pages       = [...(p.pages  || [])]
}, { immediate: true })

const currentPreset = computed(() => findPreset(form.projectType))
const pageGroups    = computed(() => getAdminNavGroups())

function selectType(key: string) {
  form.projectType = key
  save()
}

function togglePage(slug: string) {
  const idx = form.pages.indexOf(slug)
  if (idx === -1) form.pages.push(slug)
  else form.pages.splice(idx, 1)
  save()
}

const saving = ref(false)
const { savedAt, touch: markSaved } = useTimestamp()

async function save() {
  saving.value = true
  try {
    await $fetch(`/api/projects/${props.slug}`, {
      method: 'PUT',
      body: {
        title:       form.title,
        status:      form.status,
        projectType: form.projectType,
        pages:       form.pages,
      },
    })
    if (project.value) {
      project.value.title       = form.title
      project.value.status      = form.status
      project.value.projectType = form.projectType
      project.value.pages       = [...form.pages]
    }
    markSaved()
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.aps-wrap { padding: 4px 0 56px; }

/* Секции */
.aps-section { margin-bottom: 36px; }
.aps-section-title {
  font-size: .72rem; text-transform: uppercase; letter-spacing: 1px;
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  margin-bottom: 16px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border, #ececec);
}

/* Текущий тип */
.aps-current-type {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 18px; padding: 12px 16px;
  background: color-mix(in srgb, var(--ds-accent) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--ds-accent) 20%, transparent);
  border-radius: 8px;
}
.aps-type-icon { font-size: 1.4rem; }
.aps-type-label { font-size: .92rem; font-weight: 600; color: var(--glass-text); }
.aps-type-cat {
  font-size: .7rem; text-transform: uppercase; letter-spacing: .5px;
  color: color-mix(in srgb, var(--glass-text) 45%, transparent);
  margin-left: auto;
}

/* Группы пресетов */
.aps-preset-groups { display: flex; flex-direction: column; gap: 20px; }
.aps-preset-group + .aps-preset-group { margin-top: 4px; }
.aps-preset-cat-label {
  font-size: .7rem; text-transform: uppercase; letter-spacing: .5px;
  color: color-mix(in srgb, var(--glass-text) 40%, transparent);
  margin-bottom: 8px;
}
.aps-preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}
.aps-preset-card {
  display: flex; flex-direction: column; align-items: center;
  gap: 4px; padding: 10px 8px;
  border: 1.5px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: color-mix(in srgb, var(--glass-bg, #fff) 80%, transparent);
  cursor: pointer; font-family: inherit;
  border-radius: 6px; transition: border-color .15s, background .15s;
}
.aps-preset-card:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--glass-text) 35%, transparent);
}
.aps-preset-card--active {
  border: 2px solid var(--glass-text);
  background: color-mix(in srgb, var(--glass-text) 6%, transparent);
}
.aps-preset-icon { font-size: 1.2rem; }
.aps-preset-name { font-size: .7rem; text-align: center; color: var(--glass-text); }

/* Разделы */
.aps-pages-hint {
  font-size: .76rem; color: color-mix(in srgb, var(--glass-text) 50%, transparent);
  margin-bottom: 16px;
}
.aps-phase-group { margin-bottom: 18px; }
.aps-phase-label {
  font-size: .68rem; text-transform: uppercase; letter-spacing: .5px;
  color: color-mix(in srgb, var(--glass-text) 38%, transparent);
  margin-bottom: 8px;
}
.aps-pages-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.aps-page-toggle {
  padding: 5px 12px; font-size: .75rem; cursor: pointer; font-family: inherit;
  border: 1px solid color-mix(in srgb, var(--glass-text) 16%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--glass-bg, #fff) 88%, transparent);
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  transition: background .15s, color .15s, border-color .15s;
  display: flex; align-items: center; gap: 4px;
}
.aps-page-toggle:hover:not(:disabled) { color: var(--glass-text); border-color: color-mix(in srgb, var(--glass-text) 35%, transparent); }
.aps-page-toggle--on {
  background: transparent;
  color: var(--glass-text);
  border: 2px solid var(--glass-text);
  font-weight: 600;
}
.aps-page-icon { font-size: .85rem; }

/* Footer */
.aps-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 16px;
  padding-top: 20px; border-top: 1px solid var(--border, #ececec);
}
.aps-saved { font-size: .76rem; color: var(--ds-success); }

@media (max-width: 768px) {
  .aps-preset-grid { grid-template-columns: repeat(3, 1fr); }
  .aps-footer { flex-direction: column; align-items: stretch; }
}
</style>
