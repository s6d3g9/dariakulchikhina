<template>
  <div class="csp-root">

    <!-- Step indicator -->
    <div class="csp-stepper">
      <button
        v-for="(step, i) in steps"
        :key="i"
        class="csp-step"
        :class="{
          'csp-step--active':    currentStep === i,
          'csp-step--done':      currentStep > i,
          'csp-step--future':    currentStep < i,
        }"
        @click="goTo(i)"
      >
        <span class="csp-step-num">{{ currentStep > i ? '✓' : i + 1 }}</span>
        <span class="csp-step-label">{{ step.title }}</span>
      </button>
      <div class="csp-step-bar">
        <div class="csp-step-fill" :style="`width:${(currentStep / (steps.length - 1)) * 100}%`"></div>
      </div>
    </div>

    <!-- Step content -->
    <div class="csp-body">

      <!-- Step 0: Контакты -->
      <transition name="csp-fade" mode="out-in">
      <div v-if="currentStep === 0" key="s0" class="csp-step-body">
        <h2 class="csp-step-title">Контактные данные</h2>
        <p class="csp-step-hint">Основная информация, по которой с вами можно связаться</p>
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
          <div class="csp-field">
            <label>Мессенджер</label>
            <select v-model="form.messenger">
              <option value="">—</option>
              <option>WhatsApp</option>
              <option>Telegram</option>
              <option>Viber</option>
            </select>
          </div>
          <div class="csp-field">
            <label>Ник / номер в мессенджере</label>
            <input v-model="form.messengerNick" type="text" placeholder="@username">
          </div>
          <div class="csp-field csp-field--full">
            <label>Удобный способ связи</label>
            <select v-model="form.preferredContact">
              <option value="">—</option>
              <option>Звонок</option>
              <option>WhatsApp</option>
              <option>Telegram</option>
              <option>Email</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Step 1: Личные данные -->
      <div v-else-if="currentStep === 1" key="s1" class="csp-step-body">
        <h2 class="csp-step-title">Личные данные</h2>
        <p class="csp-step-hint">Эта информация помогает нам создать пространство под ваш образ жизни</p>
        <div class="csp-fields">
          <div class="csp-field">
            <label>Дата рождения</label>
            <input v-model="form.birthday" type="date">
          </div>
          <div class="csp-field">
            <label>Семейное положение</label>
            <select v-model="form.familyStatus">
              <option value="">—</option>
              <option>один / одна</option>
              <option>пара без детей</option>
              <option>семья с детьми</option>
              <option>расширенная семья</option>
            </select>
          </div>
          <div class="csp-field">
            <label>Дети (возраст)</label>
            <input v-model="form.children" type="text" placeholder="нет / 5 лет / 8 и 12 лет">
          </div>
          <div class="csp-field">
            <label>Питомцы</label>
            <input v-model="form.pets" type="text" placeholder="кот, собака породы...">
          </div>
          <div class="csp-field">
            <label>Хобби и увлечения</label>
            <input v-model="form.hobbies" type="text" placeholder="спорт, живопись, готовка...">
          </div>
          <div class="csp-field csp-field--full">
            <label>Образ жизни</label>
            <textarea v-model="form.lifestyle" rows="2" placeholder="частые гости, работа дома, активный спорт..."></textarea>
          </div>
        </div>
      </div>

      <!-- Step 2: Объект -->
      <div v-else-if="currentStep === 2" key="s2" class="csp-step-body">
        <h2 class="csp-step-title">Об объекте</h2>
        <p class="csp-step-hint">Параметры квартиры или помещения</p>
        <div class="csp-fields">
          <div class="csp-field csp-field--full">
            <label>Адрес объекта</label>
            <input v-model="form.objectAddress" type="text" placeholder="ЖК Crystal, корп 2, кв 45">
          </div>
          <div class="csp-field">
            <label>Тип</label>
            <select v-model="form.objectType">
              <option value="">—</option>
              <option>новостройка</option>
              <option>вторичное жильё</option>
              <option>частный дом</option>
              <option>коммерческое помещение</option>
            </select>
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
          <div class="csp-field">
            <label>Балкон / лоджия</label>
            <select v-model="form.hasBalcony">
              <option value="">—</option>
              <option>нет</option>
              <option>балкон</option>
              <option>лоджия</option>
              <option>два балкона</option>
            </select>
          </div>
          <div class="csp-field">
            <label>Парковка</label>
            <select v-model="form.parking">
              <option value="">—</option>
              <option>нет</option>
              <option>наземная</option>
              <option>подземная</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Step 3: Пожелания -->
      <div v-else-if="currentStep === 3" key="s3" class="csp-step-body">
        <h2 class="csp-step-title">Пожелания к проекту</h2>
        <p class="csp-step-hint">Расскажите о ваших предпочтениях и важных деталях</p>
        <div class="csp-fields">
          <div class="csp-field">
            <label>Бюджет проекта</label>
            <input v-model="form.budget" type="text" placeholder="₽ 3 000 000">
          </div>
          <div class="csp-field">
            <label>Желаемый срок</label>
            <input v-model="form.deadline" type="text" placeholder="до декабря 2025">
          </div>
          <div class="csp-field">
            <label>Стиль</label>
            <select v-model="form.stylePreferences">
              <option value="">—</option>
              <option>минимализм</option>
              <option>скандинавский</option>
              <option>контемпорари</option>
              <option>ар-деко</option>
              <option>неоклассика</option>
              <option>лофт</option>
              <option>японский</option>
              <option>без предпочтений</option>
            </select>
          </div>
          <div class="csp-field">
            <label>Цветовая гамма</label>
            <select v-model="form.colorPreferences">
              <option value="">—</option>
              <option>светлая нейтральная</option>
              <option>тёплая земляная</option>
              <option>тёмная насыщенная</option>
              <option>контрастная</option>
            </select>
          </div>
          <div class="csp-field csp-field--full">
            <label>Что нравится (ссылки на Pinterest, описание)</label>
            <textarea v-model="form.brief_like_refs" rows="2" placeholder="ссылки или описание..."></textarea>
          </div>
          <div class="csp-field csp-field--full">
            <label>Что не нравится / нельзя</label>
            <textarea v-model="form.dislikes" rows="2" placeholder="цвета, материалы, стили..."></textarea>
          </div>
          <div class="csp-field csp-field--full">
            <label>Особые пожелания</label>
            <textarea v-model="form.notes" rows="2" placeholder="аллергии, дети, питомцы, спецтребования..."></textarea>
          </div>
        </div>
      </div>

      <!-- Step 4: Готово -->
      <div v-else-if="currentStep === 4" key="s4" class="csp-step-body csp-done">
        <div class="csp-done-icon">✓</div>
        <h2 class="csp-step-title">Анкета заполнена</h2>
        <p class="csp-step-hint">Ваши данные сохранены. Дизайнер просмотрит их и свяжется с вами при необходимости.</p>
        <NuxtLink :to="`/client/${slug}`" class="csp-btn csp-btn--outline">← На главную</NuxtLink>
      </div>
      </transition>
    </div>

    <!-- Navigation buttons -->
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
const props = defineProps<{ slug: string }>()

const { data: project } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const currentStep = ref(0)
const saving = ref(false)
const saveError = ref('')

const steps = [
  { title: 'Контакты' },
  { title: 'Личные данные' },
  { title: 'Объект' },
  { title: 'Пожелания' },
]

const form = reactive<Record<string, any>>({
  fio: '', phone: '', email: '', messenger: '', messengerNick: '', preferredContact: '',
  birthday: '', familyStatus: '', children: '', pets: '', hobbies: '', lifestyle: '',
  objectAddress: '', objectType: '', objectArea: '', roomCount: '', floor: '',
  ceilingHeight: '', hasBalcony: '', parking: '',
  budget: '', deadline: '', stylePreferences: '', colorPreferences: '',
  brief_like_refs: '', dislikes: '', notes: '',
})

watch(project, (p) => {
  if (p?.profile) {
    Object.keys(form).forEach(k => {
      if (p.profile[k] !== undefined) form[k] = p.profile[k]
    })
  }
}, { immediate: true })

function goTo(i: number) {
  if (i <= currentStep.value) currentStep.value = i
}
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
.csp-root { padding: 4px 0 48px; }

/* Stepper */
.csp-stepper {
  display: flex; align-items: flex-start; gap: 0;
  margin-bottom: 36px; position: relative; padding-bottom: 0;
}
.csp-step-bar {
  display: none;
}
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
.csp-step--active .csp-step-num { border-color: var(--c-text, #1a1a1a); color: var(--c-text, #1a1a1a); font-weight: 600; }
.csp-step-num {
  width: 22px; height: 22px; border-radius: 50%;
  border: 1.5px solid var(--c-border, #e8e8e4);
  display: flex; align-items: center; justify-content: center;
  font-size: .7rem; color: var(--c-muted, #aaa);
  background: var(--c-bg, #fff); position: relative; z-index: 1;
}
.csp-step-label { font-size: .58rem; text-transform: uppercase; letter-spacing: .5px; color: var(--c-muted, #aaa); }
.csp-step--active .csp-step-label { color: var(--c-text, #1a1a1a); }

/* Body */
.csp-body { min-height: 300px; }
.csp-step-body {}
.csp-step-title { font-size: 1.2rem; font-weight: 300; color: var(--c-text, #1a1a1a); margin: 0 0 6px; }
.csp-step-hint  { font-size: .78rem; color: var(--c-muted, #888); margin: 0 0 24px; }

/* Fields */
.csp-fields {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0;
  border: 1px solid var(--c-border, #e8e8e4);
}
.csp-field {
  padding: 14px 18px; border-right: 1px solid var(--c-border, #e8e8e4);
  border-bottom: 1px solid var(--c-border, #e8e8e4);
}
.csp-field:nth-child(2n) { border-right: none; }
.csp-field--full { grid-column: 1 / -1; border-right: none; }

.csp-field label {
  display: block; font-size: .62rem; text-transform: uppercase; letter-spacing: .8px;
  color: var(--c-muted, #aaa); margin-bottom: 6px;
}
.csp-field input,
.csp-field select,
.csp-field textarea {
  width: 100%; border: none; background: transparent;
  font-size: .88rem; color: var(--c-text, #1a1a1a); font-family: inherit;
  outline: none; padding: 0; resize: none;
  border-bottom: 1px solid transparent;
}
.csp-field input:focus,
.csp-field select:focus,
.csp-field textarea:focus {
  border-bottom-color: var(--c-text, #1a1a1a);
}
.csp-field select { appearance: none; cursor: pointer; }

/* Done */
.csp-done { text-align: center; padding: 48px 0; }
.csp-done-icon { font-size: 2.5rem; margin-bottom: 16px; opacity: .4; }

/* Navigation */
.csp-nav { display: flex; align-items: center; gap: 12px; padding-top: 24px; margin-top: 24px; border-top: 1px solid var(--c-border, #e8e8e4); }
.csp-spacer { flex: 1; }
.csp-error { font-size: .76rem; color: var(--c-err, #ba2626); margin: 0; }
.csp-btn {
  padding: 10px 24px; font-size: .82rem; cursor: pointer; font-family: inherit;
  border-radius: 0; white-space: nowrap; text-decoration: none; display: inline-block;
}
.csp-btn--primary {
  background: var(--c-text, #1a1a1a); color: var(--c-bg, #fff);
  border: 1px solid var(--c-text, #1a1a1a);
}
.csp-btn--primary:hover { opacity: .85; }
.csp-btn--primary:disabled { opacity: .45; cursor: default; }
.csp-btn--outline {
  background: transparent; color: var(--c-text, #1a1a1a);
  border: 1px solid var(--c-border, #e8e8e4);
}
.csp-btn--outline:hover { border-color: var(--c-text, #1a1a1a); }

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
