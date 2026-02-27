<template>
  <div class="asb-wrap">
    <div v-if="pending" class="asb-loading">Загрузка...</div>
    <template v-else>

      <!-- Section: Family -->
      <div class="asb-section">
        <div class="asb-section-title">состав семьи и образ жизни</div>
        <div class="asb-rows">
          <div v-for="f in familyFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-if="f.multi"
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              :placeholder="f.placeholder || ''"
              rows="2"
              @blur="save"
            />
            <select
              v-else-if="f.options"
              v-model="(form as any)[f.key]"
              class="asb-inp asb-select"
              @change="save"
            >
              <option value="">—</option>
              <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
            </select>
            <input
              v-else
              v-model="(form as any)[f.key]"
              class="asb-inp"
              type="text"
              :placeholder="f.placeholder || ''"
              @blur="save"
            >
          </div>
        </div>
      </div>

      <!-- Section: Routines -->
      <div class="asb-section">
        <div class="asb-section-title">ритуалы и распорядок</div>
        <div class="asb-rows">
          <div v-for="f in routineFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              rows="2"
              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Style -->
      <div class="asb-section">
        <div class="asb-section-title">стиль и эстетика</div>
        <div class="asb-rows">
          <div v-for="f in styleFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-if="f.multi"
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              rows="2"
              :placeholder="f.placeholder || ''"
              @blur="save"
            />
            <select
              v-else-if="f.options"
              v-model="(form as any)[f.key]"
              class="asb-inp asb-select"
              @change="save"
            >
              <option value="">—</option>
              <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
            </select>
            <input
              v-else
              v-model="(form as any)[f.key]"
              class="asb-inp"
              type="text"
              @blur="save"
            >
          </div>
        </div>
      </div>

      <!-- Section: Restrictions -->
      <div class="asb-section">
        <div class="asb-section-title">ограничения и особые условия</div>
        <div class="asb-rows">
          <div v-for="f in restrictFields" :key="f.key" class="asb-row">
            <label class="asb-lbl">{{ f.label }}</label>
            <textarea
              v-model="(form as any)[f.key]"
              class="asb-inp asb-ta"
              rows="2"
              :placeholder="f.placeholder || ''"
              @blur="save"
            />
          </div>
        </div>
      </div>

      <!-- Section: Requirements -->
      <div class="asb-section">
        <div class="asb-section-title">требования к проекту</div>
        <div class="asb-checks-grid">
          <label v-for="req in requirements" :key="req.key" class="asb-check-item">
            <input
              type="checkbox"
              :checked="!!(form as any)[req.key]"
              @change="toggle(req.key)"
              class="asb-checkbox"
            >
            <span class="asb-check-label">{{ req.label }}</span>
            <span class="asb-check-tag">{{ req.tag }}</span>
          </label>
        </div>
      </div>

      <!-- Generated tags banner -->
      <div class="asb-tags-banner" v-if="autoTags.length">
        <span class="asb-tags-label">теги проекта:</span>
        <span v-for="tag in autoTags" :key="tag" class="asb-tag">{{ tag }}</span>
      </div>
      <div class="asb-tags-banner asb-tags-banner--empty" v-else>
        <span class="asb-tags-label">теги сформируются автоматически по ответам анкеты</span>
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
const props = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const form = reactive<Record<string, any>>({})

watch(project, (p) => {
  if (p?.profile) {
    Object.assign(form, p.profile)
  }
}, { immediate: true })

// ── Requirements checkboxes ───────────────────────────────────────
const requirements = [
  { key: 'brief_smart_home',      label: 'Умный дом',             tag: '#smart_home'      },
  { key: 'brief_kids_room',       label: 'Детская / зоны для детей', tag: '#kids_room'    },
  { key: 'brief_work_from_home',  label: 'Работа из дома',        tag: '#home_office'     },
  { key: 'brief_soundproofing',   label: 'Шумоизоляция',          tag: '#soundproofing'   },
  { key: 'brief_pets',            label: 'Питомцы',               tag: '#pets_friendly'   },
  { key: 'brief_storage',         label: 'Много хранения',        tag: '#storage_wall'    },
  { key: 'brief_home_gym',        label: 'Тренажёрный зал',       tag: '#home_gym'        },
  { key: 'brief_home_cinema',     label: 'Домашний кинотеатр',    tag: '#home_cinema'     },
  { key: 'brief_chef_kitchen',    label: 'Профессиональная кухня', tag: '#chef_kitchen'   },
  { key: 'brief_sauna',           label: 'Баня / хаммам',         tag: '#sauna_hammam'    },
  { key: 'brief_gallery',         label: 'Коллекция / галерея',   tag: '#art_gallery'     },
  { key: 'brief_wine_cellar',     label: 'Винный погреб',         tag: '#wine_cellar'     },
]

const autoTags = computed(() =>
  requirements.filter(r => form[r.key]).map(r => r.tag)
)

function toggle(key: string) {
  form[key] = !form[key]
  save()
}

// ── Form field definitions ────────────────────────────────────────
const familyFields = [
  { key: 'brief_adults_count',    label: 'Взрослых в семье', placeholder: 'например: 2' },
  { key: 'brief_kids_ages',       label: 'Дети (возраст)',   placeholder: 'например: 4 и 8 лет' },
  { key: 'brief_pets_desc',       label: 'Питомцы',          placeholder: 'порода, размер' },
  { key: 'brief_remote_work',     label: 'Удалённая работа', options: ['нет', 'частично', 'постоянно', 'оба партнёра'] },
  { key: 'brief_guests_freq',     label: 'Частота гостей',   options: ['редко', 'несколько раз в месяц', 'еженедельно', 'постоянно'] },
  { key: 'brief_hobbies',         label: 'Хобби и увлечения', placeholder: 'музыка, живопись, спорт...', multi: true },
]

const routineFields = [
  { key: 'brief_morning_routine', label: 'Утренний ритуал', placeholder: 'кофе в тишине, утренняя пробежка, завтрак всей семьёй...' },
  { key: 'brief_evening_routine', label: 'Вечерний ритуал', placeholder: 'кино, ужин с гостями, чтение, йога...' },
  { key: 'brief_cooking_role',    label: 'Роль кухни',      placeholder: 'готовим сами, заказываем, профессиональная готовка...' },
  { key: 'brief_bedroom_needs',   label: 'Спальня / сон',   placeholder: 'раздельные спальни, звукоизоляция, электрошторы...' },
]

const styleFields = [
  { key: 'brief_style_prefer',    label: 'Стиль',          options: ['минимализм', 'скандинавский', 'контемпорари', 'ар-деко', 'неоклассика', 'лофт', 'японский', 'без предпочтений'] },
  { key: 'brief_color_mood',      label: 'Цветовая гамма', options: ['светлая нейтральная', 'тёплая земляная', 'тёмная насыщенная', 'контрастная', 'без предпочтений'] },
  { key: 'brief_like_refs',       label: 'Нравится (ссылки / описание)', multi: true, placeholder: 'ссылки на Pinterest, описание...' },
  { key: 'brief_dislike_refs',    label: 'Не нравится',               multi: true, placeholder: 'что точно нельзя...' },
  { key: 'brief_material_prefs',  label: 'Материалы',                  multi: true, placeholder: 'натуральный камень, дерево, металл...' },
]

const restrictFields = [
  { key: 'brief_allergies',       label: 'Аллергии / чувствительность', placeholder: 'на запахи, пыль, материалы...' },
  { key: 'brief_deadlines_hard',  label: 'Жёсткие сроки',               placeholder: 'дата заезда, мероприятие...' },
  { key: 'brief_budget_limits',   label: 'Бюджетные ограничения',       placeholder: 'не превышать по категориям...' },
  { key: 'brief_special_notes',   label: 'Особые пожелания',            placeholder: 'любые важные детали...' },
]

// ── Save ──────────────────────────────────────────────────────────
const saving = ref(false)
const savedAt = ref('')

async function save() {
  saving.value = true
  try {
    await $fetch(`/api/projects/${props.slug}`, {
      method: 'PUT',
      body: { profile: { ...project.value?.profile, ...form } }
    })
    const now = new Date()
    savedAt.value = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.asb-wrap { padding: 4px 0 48px; }
.asb-loading { font-size: .88rem; color: #999; }

/* Tags banner */
.asb-tags-banner {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
  padding: 12px 16px; margin-bottom: 24px;
  border: 1px solid var(--border, #e0e0e0);
  background: var(--surface, #fafafa);
}
.asb-tags-banner--empty { opacity: .55; }
.asb-tags-label { font-size: .72rem; color: #999; letter-spacing: .6px; text-transform: uppercase; margin-right: 6px; white-space: nowrap; }
.asb-tag {
  font-size: .76rem; padding: 3px 10px;
  background: var(--text, #1a1a1a); color: var(--bg, #fff);
  border-radius: 2px; font-family: monospace; letter-spacing: .3px;
}

/* Sections */
.asb-section { margin-bottom: 32px; }
.asb-section-title {
  font-size: .72rem; text-transform: uppercase; letter-spacing: 1px; color: #999;
  margin-bottom: 14px; padding-bottom: 8px;
  border-bottom: 1px solid var(--border, #ececec);
}

/* Checkboxes grid */
.asb-checks-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px 16px;
}
.asb-check-item {
  display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 0;
}
.asb-checkbox { width: 14px; height: 14px; cursor: pointer; accent-color: var(--text, #1a1a1a); flex-shrink: 0; }
.asb-check-label { font-size: .82rem; color: var(--text, #333); flex: 1; }
.asb-check-tag { font-size: .68rem; font-family: monospace; color: #aaa; white-space: nowrap; }

/* Form rows */
.asb-rows { display: flex; flex-direction: column; gap: 4px; }
.asb-row {
  display: grid; grid-template-columns: 160px 1fr; align-items: start;
  padding: 8px 0; border-bottom: 1px solid var(--border, #f0f0f0);
}
.asb-row:last-child { border-bottom: none; }
.asb-lbl { font-size: .76rem; color: #888; padding-top: 6px; }
.asb-inp {
  border: none; border-bottom: 1px solid var(--border, #ddd);
  padding: 6px 0; font-size: .88rem; background: transparent; outline: none;
  font-family: inherit; color: var(--text, inherit); width: 100%;
}
.asb-inp:focus { border-bottom-color: var(--text, #1a1a1a); }
.asb-ta { resize: vertical; min-height: 36px; }
.asb-select { appearance: none; cursor: pointer; }

/* Footer */
.asb-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 16px;
  padding-top: 20px; border-top: 1px solid var(--border, #ececec); margin-top: 8px;
}
.asb-saved { font-size: .76rem; color: #9d9; }
.asb-btn-save {
  border: 1px solid var(--text, #1a1a1a); background: var(--text, #1a1a1a);
  color: var(--bg, #fff); padding: 10px 24px; font-size: .85rem;
  cursor: pointer; font-family: inherit;
}
.asb-btn-save:disabled { opacity: .55; cursor: default; }
.asb-btn-save:hover:not(:disabled) { opacity: .85; }
</style>
