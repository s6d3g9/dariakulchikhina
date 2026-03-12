<template>
  <div class="asb-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <div v-for="section in activeSections" :key="section.key" class="asb-section">
        <!-- Заголовок секции -->
        <div class="asb-section-title">
          {{ section.title }}
          <template v-if="section.key === 'requirements'">
            <span v-if="form.objectType" class="asb-type-hint">{{ objectTypeLabel }}</span>
            <span v-else class="asb-type-hint asb-type-hint--warn">⚠ укажите тип объекта в параметрах (0.1) для точных тегов</span>
          </template>
        </div>

        <!-- Обычные поля формы -->
        <div v-if="section.type === 'fields'" class="ass-upload-zone">
          <div v-for="f in section.fields" :key="f.key" class="ass-upload-row">
            <label class="ass-field-label">{{ f.label }}</label>
            <div v-if="f.type === 'options'" class="asb-btngroup">
              <button
                v-for="option in f.options"
                :key="`${f.key}-${option}`"
                type="button"
                class="asb-btnopt"
                :class="{ 'asb-btnopt--on': form[f.key] === option }"
                @click="toggleSingleChoiceAndSave(f.key, option)"
              >{{ option }}</button>
            </div>
            <textarea
              v-else-if="f.type === 'textarea'"
              v-model="form[f.key]"
              class="glass-input"
              :placeholder="f.placeholder || ''"
              rows="2"
              @blur="save"
            />
            <input
              v-else
              v-model="form[f.key]"
              class="glass-input"
              type="text"
              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>

        <!-- Сетка тегов-требований -->
        <div v-else-if="section.type === 'requirements'" class="asb-checks-grid">
          <button
            v-for="req in filteredRequirements"
            :key="req.key"
            type="button"
            class="asb-tagopt"
            :class="{ 'asb-tagopt--on': !!form[req.key] }"
            @click="toggle(req.key)"
          >{{ req.label }}</button>
        </div>
      </div>

      <!-- Footer -->
      <div class="asb-footer">
        <span v-if="savedAt" class="asb-saved">✓ сохранено {{ savedAt }}</span>
        <button class="asb-btn-save" @click="save" :disabled="saving">
          {{ saving ? 'сохранение...' : 'сохранить бриф' }}
        </button>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { getBriefSections } from '~~/shared/constants/brief-sections'
import { BRIEF_REQUIREMENTS, OBJECT_TYPE_LABELS } from '~/utils/brief-requirements'

const props = withDefaults(defineProps<{ slug: string; clientMode?: boolean }>(), {
  clientMode: false,
})

// Forward cookies so SSR works both в admin-контексте и в ClientBrief.vue
const reqHeaders = useRequestHeaders(['cookie'])
const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`, { headers: reqHeaders })

const form = reactive<Record<string, any>>({})

watch(project, (p) => {
  if (p?.profile) {
    Object.assign(form, p.profile)
  }
}, { immediate: true })

const objectTypeLabel = computed(() => {
  const key = String(form.objectType || '') as keyof typeof OBJECT_TYPE_LABELS
  return OBJECT_TYPE_LABELS[key] || String(form.objectType || '')
})

// Секции брифинга по типу объекта (data-driven из brief-sections.ts)
const activeSections = computed(() => {
  const projectType = project.value?.projectType || 'apartment'
  return getBriefSections(projectType)
})

// Теги-требования для секции requirements
const filteredRequirements = computed(() => {
  const objType = String(form.objectType || '') as keyof typeof BRIEF_REQUIREMENTS
  const specific = BRIEF_REQUIREMENTS[objType] || BRIEF_REQUIREMENTS.apartment || []
  const common = BRIEF_REQUIREMENTS._common || []
  const seen = new Set(specific.map((r: { key: string }) => r.key))
  return [...specific, ...common.filter((r: { key: string }) => !seen.has(r.key))]
})

function toggle(key: string) {
  form[key] = !form[key]
  save()
}

function toggleSingleChoiceAndSave(key: string, option: string) {
  form[key] = form[key] === option ? '' : option
  save()
}

// ── Save ──────────────────────────────────────────────────────────
const saving = ref(false)
const { savedAt, touch: markSaved } = useTimestamp()

async function save() {
  saving.value = true
  try {
    // Проверяем — достаточно ли полей заполнено чтобы считать бриф завершённым
    const filledCount = Object.entries(form)
      .filter(([k, v]) => k.startsWith('brief_') && typeof v === 'string' && v.trim())
      .length
    const briefCompleted = filledCount >= 4 || (form as any).brief_completed
    if (props.clientMode) {
      await $fetch(`/api/projects/${props.slug}/client-profile`, {
        method: 'PUT',
        body: { ...form, brief_completed: briefCompleted },
      })
      if (project.value?.profile) {
        Object.assign(project.value.profile, { ...form, brief_completed: briefCompleted })
      }
    } else {
      await $fetch(`/api/projects/${props.slug}`, {
        method: 'PUT',
        body: { profile: { ...project.value?.profile, ...form, brief_completed: briefCompleted } }
      })
    }
    markSaved()
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.asb-wrap { padding: 4px 0 48px; }
.asb-loading { font-size: .88rem; color: color-mix(in srgb, var(--glass-text) 55%, transparent); }

/* Sections */
.asb-section { margin-bottom: 32px; }
.asb-section-title {
  font-size: .72rem; text-transform: uppercase; letter-spacing: 1px; color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  margin-bottom: 14px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border, #ececec);
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.asb-type-hint {
  font-size: .7rem; text-transform: none; letter-spacing: 0;
  background: color-mix(in srgb, var(--ds-accent) 12%, transparent); color: var(--ds-accent); padding: 2px 8px; border-radius: 10px; font-weight: 500;
}
.asb-type-hint--warn { background: color-mix(in srgb, var(--ds-warning) 12%, transparent); color: var(--ds-warning); }

/* Requirements tag cloud */
.asb-checks-grid {
  display: flex; flex-wrap: wrap; gap: 6px;
}


/* Form rows */

/* Footer */
.asb-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 16px;
  padding-top: 20px; border-top: 1px solid var(--border, #ececec); margin-top: 8px;
}
.asb-saved { font-size: .76rem; color: var(--ds-success); }
.asb-btn-save {
  border: 1px solid var(--text, #1a1a1a); background: var(--text, #1a1a1a);
  color: var(--bg, #fff); padding: 10px 24px; font-size: .85rem;
  cursor: pointer; font-family: inherit;
}
.asb-btn-save:disabled { opacity: .55; cursor: default; }
.asb-btn-save:hover:not(:disabled) { opacity: .85; }

/* Button group — single choice */
.asb-btngroup {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0;
}
.asb-btnopt {
  padding: 6px 14px; font-size: .76rem; cursor: pointer; user-select: none;
  border: 1px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  border-radius: 999px; font-family: inherit;
  background: color-mix(in srgb, var(--glass-bg, #fff) 88%, transparent);
  color: color-mix(in srgb, var(--glass-text) 55%, transparent);
  transition: background .16s, color .16s, border-color .16s;
}
.asb-btnopt:hover { color: var(--text, #1a1a1a); border-color: var(--text, #1a1a1a); }
.asb-btnopt--on {
  background: transparent;
  color: var(--glass-text, #1a1a1a);
  border: 2px solid var(--glass-text, #1a1a1a);
  font-weight: 600;
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .asb-footer { flex-direction: column; align-items: stretch; gap: 10px; }
  .asb-btn-save { width: 100%; text-align: center; }
  .asb-section-title { flex-direction: column; align-items: flex-start; }
}

</style>
