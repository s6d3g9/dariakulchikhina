<template>
  <div class="csp-root">

    <!-- Step indicator -->
    <div class="csp-stepper">
      <button
        v-for="(step, i) in steps"
        :key="i"
        class="csp-step"
        :class="{
          'csp-step--active':  currentStep === i,
          'csp-step--done':    currentStep > i,
          'csp-step--future':  currentStep < i,
        }"
        @click="goTo(i)"
      >
        <span class="csp-step-num">{{ currentStep > i ? '✓' : i + 1 }}</span>
        <span class="csp-step-label">{{ step.title }}</span>
      </button>
    </div>

    <!-- Step content -->
    <div class="csp-body">
      <transition name="csp-fade" mode="out-in">

        <!-- Step 0: Контакты -->
        <div v-if="currentStep === 0" key="s0" class="csp-step-body">
          <h2 class="csp-step-title">Контактные данные</h2>
          <p class="csp-step-hint">Основная информация для связи</p>
          <div class="csp-fields">
            <div class="csp-field csp-field--full">
              <label>ФИО</label>
              <input v-model="form.fio" type="text" placeholder="Иванова Мария Сергеевна">
            </div>
            <div class="csp-field">
              <label>Телефон</label>
              <input v-model="form.phone" type="tel" placeholder="+7 900 000 00 00">
            </div>
            <div class="csp-field">
              <label>Email</label>
              <input v-model="form.email" type="email" placeholder="email@example.com">
            </div>
            <div class="csp-field csp-field--full">
              <label>Мессенджер</label>
              <div class="csp-tagsel">
                <span v-for="o in MESSENGER_OPTIONS" :key="o"
                  class="csp-tagopt" :class="{ 'csp-tagopt--on': form.messenger === o }"
                  @click="form.messenger = (form.messenger === o ? '' : o)">{{ o }}</span>
              </div>
            </div>
            <div class="csp-field">
              <label>Ник / номер в мессенджере</label>
              <input v-model="form.messengerNick" type="text" placeholder="@username">
            </div>
            <div class="csp-field csp-field--full">
              <label>Удобный способ связи</label>
              <div class="csp-tagsel">
                <span v-for="o in PREFERRED_CONTACT_OPTIONS" :key="o"
                  class="csp-tagopt" :class="{ 'csp-tagopt--on': form.preferredContact === o }"
                  @click="form.preferredContact = (form.preferredContact === o ? '' : o)">{{ o }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 1: Объект и семья -->
        <div v-else-if="currentStep === 1" key="s1" class="csp-step-body">
          <h2 class="csp-step-title">Объект и состав семьи</h2>
          <p class="csp-step-hint">Параметры помещения и информация о жильцах</p>
          <div class="csp-section-label">объект</div>
          <div class="csp-fields">
            <div class="csp-field csp-field--full">
              <label>Адрес объекта</label>
              <AppAddressInput v-model="form.objectAddress" placeholder="ЖК Crystal, корп 2, кв 45" />
            </div>
            <div class="csp-field csp-field--full">
              <label>Тип объекта</label>
              <div class="csp-tagsel">
                <span v-for="o in OBJECT_TYPE_OPTIONS" :key="o"
                  class="csp-tagopt" :class="{ 'csp-tagopt--on': form.objectType === o }"
                  @click="form.objectType = (form.objectType === o ? '' : o)">{{ o }}</span>
              </div>
            </div>
            <div class="csp-field">
              <label>Площадь (м²)</label>
              <input v-model="form.objectArea" type="text" placeholder="87">
            </div>
            <div class="csp-field">
              <label>Количество комнат</label>
              <input v-model="form.roomCount" type="text" placeholder="3">
            </div>
            <div class="csp-field">
              <label>Этаж</label>
              <input v-model="form.floor" type="text" placeholder="12 из 25">
            </div>
            <div class="csp-field">
              <label>Высота потолков</label>
              <input v-model="form.ceilingHeight" type="text" placeholder="2.8 м">
            </div>
            <div class="csp-field csp-field--full">
              <label>Балкон / лоджия</label>
              <div class="csp-tagsel">
                <span v-for="o in BALCONY_OPTIONS" :key="o"
                  class="csp-tagopt" :class="{ 'csp-tagopt--on': form.hasBalcony === o }"
                  @click="form.hasBalcony = (form.hasBalcony === o ? '' : o)">{{ o }}</span>
              </div>
            </div>
            <div class="csp-field csp-field--full">
              <label>Парковка</label>
              <div class="csp-tagsel">
                <span v-for="o in PARKING_OPTIONS" :key="o"
                  class="csp-tagopt" :class="{ 'csp-tagopt--on': form.parking === o }"
                  @click="form.parking = (form.parking === o ? '' : o)">{{ o }}</span>
              </div>
            </div>
          </div>
          <div class="csp-section-label" style="margin-top:18px">состав семьи и образ жизни</div>
          <div class="csp-fields">
            <div class="csp-field">
              <label>Взрослых</label>
              <input v-model="form.brief_adults_count" type="text" placeholder="2">
            </div>
            <div class="csp-field">
              <label>Дети (возраст)</label>
              <input v-model="form.brief_kids_ages" type="text" placeholder="4 и 8 лет">
            </div>
            <div class="csp-field">
              <label>Питомцы</label>
              <input v-model="form.brief_pets_desc" type="text" placeholder="кот, собака породы...">
            </div>
            <div class="csp-field">
              <label>Зона питомца</label>
              <input v-model="form.brief_pets_zone_detail" type="text" placeholder="лапомойка, миски, лоток...">
            </div>
            <div class="csp-field csp-field--full">
              <label>Удалённая работа</label>
              <div class="csp-tagsel">
                <span v-for="o in BRIEF_REMOTE_WORK_OPTIONS" :key="o"
                  class="csp-tagopt" :class="{ 'csp-tagopt--on': form.brief_remote_work === o }"
                  @click="form.brief_remote_work = (form.brief_remote_work === o ? '' : o)">{{ o }}</span>
              </div>
            </div>
            <div class="csp-field csp-field--full">
              <label>Частота гостей</label>
              <div class="csp-tagsel">
                <span v-for="o in BRIEF_GUESTS_FREQ_OPTIONS" :key="o"
                  class="csp-tagopt" :class="{ 'csp-tagopt--on': form.brief_guests_freq === o }"
                  @click="form.brief_guests_freq = (form.brief_guests_freq === o ? '' : o)">{{ o }}</span>
              </div>
            </div>
            <div class="csp-field csp-field--full">
              <label>Хобби и увлечения</label>
              <textarea v-model="form.brief_hobbies" rows="2" placeholder="спорт, музыка, живопись, готовка..."></textarea>
            </div>
          </div>
        </div>

        <!-- Step 2: Стиль и эстетика -->
        <div v-else-if="currentStep === 2" key="s2" class="csp-step-body">
          <h2 class="csp-step-title">Стиль и эстетика</h2>
          <p class="csp-step-hint">Ваши предпочтения по визуальному образу пространства</p>
          <div class="csp-fields">
            <div class="csp-field csp-field--full">
              <label>Стилевое направление</label>
              <div class="csp-tagsel">
                <span v-for="o in BRIEF_STYLE_OPTIONS" :key="o"
                  class="csp-tagopt" :class="{ 'csp-tagopt--on': form.brief_style_prefer === o }"
                  @click="form.brief_style_prefer = (form.brief_style_prefer === o ? '' : o)">{{ o }}</span>
              </div>
            </div>
            <div class="csp-field csp-field--full">
              <label>Цветовая гамма</label>
              <div class="csp-tagsel">
                <span v-for="o in BRIEF_COLOR_OPTIONS" :key="o"
                  class="csp-tagopt" :class="{ 'csp-tagopt--on': form.brief_color_mood === o }"
                  @click="form.brief_color_mood = (form.brief_color_mood === o ? '' : o)">{{ o }}</span>
              </div>
            </div>
            <div class="csp-field csp-field--full">
              <label>Цветовая палитра подробнее</label>
              <textarea v-model="form.brief_color_palette" rows="2" placeholder="любимые сочетания, акцентные цвета, табу-цвета..."></textarea>
            </div>
            <div class="csp-field csp-field--full">
              <label>Что нравится — ссылки, Pinterest, описание</label>
              <textarea v-model="form.brief_like_refs" rows="2" placeholder="ссылки или описание вдохновляющих интерьеров..."></textarea>
            </div>
            <div class="csp-field csp-field--full">
              <label>Что не нравится / точно нельзя</label>
              <textarea v-model="form.brief_dislike_refs" rows="2" placeholder="цвета, материалы, стили..."></textarea>
            </div>
            <div class="csp-field csp-field--full">
              <label>Предпочтения по материалам</label>
              <textarea v-model="form.brief_material_prefs" rows="2" placeholder="натуральный камень, дерево, металл, текстиль..."></textarea>
            </div>
          </div>
        </div>

        <!-- Step 3: Концепция и пожелания -->
        <div v-else-if="currentStep === 3" key="s3" class="csp-step-body">
          <h2 class="csp-step-title">Концепция и пожелания</h2>
          <p class="csp-step-hint">Расскажите об ощущениях и важных деталях</p>
          <div class="csp-fields">
            <div class="csp-field csp-field--full">
              <label>Каким должен быть дом — настроение и ощущения</label>
              <textarea v-model="form.brief_home_mood" rows="3" placeholder="уютный и тихий / яркий и вдохновляющий / строгий и функциональный..."></textarea>
            </div>
            <div class="csp-field csp-field--full">
              <label>Что хочется чувствовать, открывая дверь домой</label>
              <textarea v-model="form.brief_return_emotion" rows="2" placeholder="покой, энергию, вдохновение..."></textarea>
            </div>
            <div class="csp-field csp-field--full">
              <label>Ассоциация — это пространство как...</label>
              <textarea v-model="form.brief_space_image" rows="2" placeholder="отель / лес / галерея / рабочий кабинет..."></textarea>
            </div>
            <div class="csp-field csp-field--full">
              <label>Утренний ритуал</label>
              <textarea v-model="form.brief_morning_routine" rows="2" placeholder="кофе в тишине, утренняя пробежка, завтрак всей семьёй..."></textarea>
            </div>
            <div class="csp-field csp-field--full">
              <label>Вечерний ритуал</label>
              <textarea v-model="form.brief_evening_routine" rows="2" placeholder="кино, ужин с гостями, чтение, йога..."></textarea>
            </div>
            <div class="csp-field">
              <label>Бюджет на реализацию</label>
              <input v-model="form.brief_budget_limits" type="text" placeholder="₽ 3 000 000">
            </div>
            <div class="csp-field">
              <label>Желаемый срок сдачи</label>
              <input v-model="form.brief_deadlines_hard" type="text" placeholder="до декабря 2025">
            </div>
            <div class="csp-field csp-field--full">
              <label>Особые пожелания, аллергии, ограничения</label>
              <textarea v-model="form.brief_special_notes" rows="2" placeholder="аллергии на запахи, дети до 3 лет, инвалидная коляска, питомцы..."></textarea>
            </div>
          </div>
        </div>

        <!-- Step 4: Готово -->
        <div v-else-if="currentStep === 4" key="s4" class="csp-step-body csp-done">
          <div class="csp-done-icon">✓</div>
          <h2 class="csp-step-title">Анкета заполнена</h2>
          <p class="csp-step-hint">Ваши данные сохранены. Дизайнер просмотрит их в ближайшее время.</p>
          <NuxtLink :to="`/client/${slug}`" class="csp-btn csp-btn--outline">← На главную</NuxtLink>
        </div>

      </transition>
    </div>

    <!-- Navigation -->
    <div class="csp-nav" v-if="currentStep < 4">
      <button v-if="currentStep > 0" class="csp-btn csp-btn--outline" @click="prev">← Назад</button>
      <span class="csp-spacer"></span>
      <p v-if="saveError" class="csp-error">{{ saveError }}</p>
      <button v-if="currentStep < 3" class="csp-btn csp-btn--primary" @click="nextAndSave">Далее →</button>
      <button v-else class="csp-btn csp-btn--primary" @click="finish" :disabled="saving">
        {{ saving ? 'Сохранение...' : 'Сохранить ✓' }}
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import {
  MESSENGER_OPTIONS,
  PREFERRED_CONTACT_OPTIONS,
  OBJECT_TYPE_OPTIONS,
  BALCONY_OPTIONS,
  PARKING_OPTIONS,
  BRIEF_REMOTE_WORK_OPTIONS,
  BRIEF_GUESTS_FREQ_OPTIONS,
  BRIEF_STYLE_OPTIONS,
  BRIEF_COLOR_OPTIONS,
  createEmptyClientProfileDraft,
} from '~~/shared/constants/profile-fields'
const props = defineProps<{ slug: string }>()

const { data: project } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const currentStep = ref(0)
const saving = ref(false)
const saveError = ref('')

const steps = [
  { title: 'Контакты' },
  { title: 'Объект' },
  { title: 'Стиль' },
  { title: 'Концепция' },
]

const form = reactive<Record<string, any>>(createEmptyClientProfileDraft())

watch(project, (p) => {
  if (p?.profile) {
    Object.keys(form).forEach(k => {
      if (p.profile[k] !== undefined && p.profile[k] !== null) form[k] = p.profile[k]
    })
  }
}, { immediate: true })

function goTo(i: number) { if (i <= currentStep.value) currentStep.value = i }
function prev() { if (currentStep.value > 0) currentStep.value-- }

async function nextAndSave() {
  await saveData()
  if (!saveError.value) currentStep.value++
}
async function finish() {
  await saveData()
  if (!saveError.value) currentStep.value = 4
}

async function saveData() {
  saving.value = true
  saveError.value = ''
  try {
    await $fetch(`/api/projects/${props.slug}/client-profile`, {
      method: 'PUT',
      body: { ...form }
    })
  } catch (e: any) {
    saveError.value = e.data?.message || 'Ошибка сохранения'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.csp-field :deep(.aai-wrap) { flex: 1; min-width: 0; }
.csp-field :deep(.aai-wrap input) {
  width: 100%; border: none; background: transparent;
  font-size: .88rem; color: var(--c-text, #1a1a1a); font-family: inherit;
  outline: none; padding: 0;
  border-bottom: 1px solid transparent;
}
.csp-field :deep(.aai-wrap input:focus) { border-bottom-color: var(--c-text, #1a1a1a); }

.csp-root { padding: 4px 0 48px; }

/* Stepper */
.csp-stepper { display: flex; align-items: flex-start; margin-bottom: 36px; }
.csp-step {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  flex: 1; background: none; border: none; cursor: pointer; padding: 0 4px 12px;
  position: relative; font-family: inherit;
}
.csp-step:not(:last-child)::after {
  content: ''; position: absolute;
  top: 10px; left: calc(50% + 11px); right: calc(-50% + 11px);
  height: 1px; background: var(--c-border, #e8e8e4);
}
.csp-step--done .csp-step-num  { background: var(--c-text, #1a1a1a); border-color: var(--c-text, #1a1a1a); color: var(--c-bg, #fff); }
.csp-step--done::after          { background: var(--c-text, #1a1a1a) !important; }
.csp-step--active .csp-step-num { color: var(--c-text, #1a1a1a); font-weight: 600; }
.csp-step-num {
  width: 22px; height: 22px; border-radius: 50%;
  border: none;
  display: flex; align-items: center; justify-content: center;
  font-size: .7rem; color: var(--c-muted, #aaa);
  background: var(--c-bg, #fff); position: relative; z-index: 1;
}
.csp-step-label { font-size: .58rem; text-transform: uppercase; letter-spacing: .5px; color: var(--c-muted, #aaa); }
.csp-step--active .csp-step-label { color: var(--c-text, #1a1a1a); }

/* Section label */
.csp-section-label {
  font-size: .6rem; text-transform: uppercase; letter-spacing: .8px;
  color: var(--c-muted, #aaa); padding: 10px 18px 6px;
  border: none;
}

/* Body */
.csp-body { min-height: 300px; }
.csp-step-title { font-size: 1.2rem; font-weight: 300; color: var(--c-text, #1a1a1a); margin: 0 0 6px; }
.csp-step-hint  { font-size: .78rem; color: var(--c-muted, #888); margin: 0 0 20px; }

/* Fields grid */
.csp-fields {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0;
  border: none;
  border-radius: 14px;
  background: color-mix(in srgb, var(--glass-bg, #fff) 90%, transparent);
}
.csp-field {
  padding: 14px 18px; border-right: none;
  border-bottom: none;
}
.csp-field:nth-child(2n) { border-right: none; }
.csp-field--full { grid-column: 1 / -1; border-right: none; }
.csp-field label {
  display: block; font-size: .6rem; text-transform: uppercase; letter-spacing: .8px;
  color: var(--c-muted, #aaa); margin-bottom: 8px;
}
.csp-field input,
.csp-field textarea {
  width: 100%; border: none; background: transparent;
  font-size: .88rem; color: var(--c-text, #1a1a1a); font-family: inherit;
  outline: none; padding: 0; resize: vertical;
  border-bottom: 1px solid transparent;
}
.csp-field input:focus,
.csp-field textarea:focus { border-bottom-color: var(--c-text, #1a1a1a); }

/* Tags */
.csp-tagsel { display: flex; flex-wrap: wrap; gap: 6px; }
.csp-tagopt {
  padding: 4px 10px; font-size: .76rem; cursor: pointer; user-select: none;
  border: none; color: #aaa; line-height: 1.4;
  background: color-mix(in srgb, var(--glass-bg, #fff) 88%, transparent);
  border-radius: 999px;
  transition: background .1s, color .1s, border-color .1s;
}
.csp-tagopt:hover { color: var(--c-text, #1a1a1a); }
.csp-tagopt--on {
  background: var(--c-text, #1a1a1a); color: var(--c-bg, #fff);
}

/* Done */
.csp-done { text-align: center; padding: 48px 0; }
.csp-done-icon { font-size: 2.5rem; margin-bottom: 16px; opacity: .4; }

/* Navigation */
.csp-nav {
  display: flex; align-items: center; gap: 12px;
  padding-top: 24px; margin-top: 24px;
  border-top: none;
}
.csp-spacer { flex: 1; }
.csp-error { font-size: .76rem; color: var(--c-err, #ba2626); margin: 0; }
.csp-btn {
  padding: 10px 24px; font-size: .82rem; cursor: pointer; font-family: inherit;
  border-radius: 0; white-space: nowrap; text-decoration: none; display: inline-block;
}
.csp-btn--primary {
  background: var(--c-text, #1a1a1a); color: var(--c-bg, #fff);
  border: none;
}
.csp-btn--primary:hover { opacity: .85; }
.csp-btn--primary:disabled { opacity: .45; cursor: default; }
.csp-btn--outline {
  background: transparent; color: var(--c-text, #1a1a1a);
  border: none;
  background: color-mix(in srgb, var(--glass-bg, #fff) 90%, transparent);
  border-radius: 999px;
}
.csp-btn--outline:hover { opacity: .9; }

/* Transition */
.csp-fade-enter-active, .csp-fade-leave-active { transition: opacity .18s, transform .18s; }
.csp-fade-enter-from { opacity: 0; transform: translateX(8px); }
.csp-fade-leave-to   { opacity: 0; transform: translateX(-8px); }

@media (max-width: 640px) {
  .csp-fields { grid-template-columns: 1fr; }
  .csp-field:nth-child(2n) { border-right: none; }
  .csp-step-label { display: none; }
}
</style>
