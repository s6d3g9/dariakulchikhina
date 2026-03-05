<template>
  <div class="ca-page">
    <div class="ca-card glass-surface">

      <!-- Success state -->
      <div v-if="submitted" class="ca-success">
        <div class="ca-success-icon">✓</div>
        <h2 class="ca-success-title">Заявка отправлена!</h2>
        <p class="ca-success-text">Мы свяжемся с вами в ближайшее время и расскажем о дальнейших шагах.</p>
      </div>

      <!-- Form -->
      <template v-else>
        <div class="ca-header">
          <h1 class="ca-title">Стать подрядчиком</h1>
          <p class="ca-subtitle">Заполните анкету — мы рассмотрим её и свяжемся с вами</p>
        </div>

        <form class="ca-form" @submit.prevent="submitForm" novalidate>

          <!-- Name -->
          <div class="ca-field" :class="{ 'ca-field--error': errors.name }">
            <label class="ca-label">Имя и фамилия <span class="ca-req">*</span></label>
            <input v-model="form.name" class="ca-input" placeholder="Иван Иванов" autocomplete="name" />
            <span v-if="errors.name" class="ca-error">{{ errors.name }}</span>
          </div>

          <!-- Company -->
          <div class="ca-field">
            <label class="ca-label">Компания / ИП</label>
            <input v-model="form.companyName" class="ca-input" placeholder="ООО «СтройМастер»" />
          </div>

          <!-- Phone -->
          <div class="ca-field" :class="{ 'ca-field--error': errors.phone }">
            <label class="ca-label">Телефон <span class="ca-req">*</span></label>
            <input v-model="form.phone" class="ca-input" type="tel" placeholder="+7 999 123-45-67" autocomplete="tel" />
            <span v-if="errors.phone" class="ca-error">{{ errors.phone }}</span>
          </div>

          <!-- Email -->
          <div class="ca-field" :class="{ 'ca-field--error': errors.email }">
            <label class="ca-label">Email</label>
            <input v-model="form.email" class="ca-input" type="email" placeholder="ivan@mail.ru" autocomplete="email" />
            <span v-if="errors.email" class="ca-error">{{ errors.email }}</span>
          </div>

          <!-- City -->
          <div class="ca-field">
            <label class="ca-label">Город</label>
            <input v-model="form.city" class="ca-input" placeholder="Москва" />
          </div>

          <!-- Work types -->
          <div class="ca-field" :class="{ 'ca-field--error': errors.workTypes }">
            <label class="ca-label">Виды работ <span class="ca-req">*</span></label>
            <p class="ca-field-hint">Выберите один или несколько видов работ, которые вы выполняете</p>
            <div class="ca-wt-grid">
              <label
                v-for="opt in workTypeGroups" :key="opt.value"
                class="ca-wt-item"
                :class="{ 'ca-wt-item--active': form.workTypes.includes(opt.value) }"
              >
                <input
                  type="checkbox"
                  :value="opt.value"
                  v-model="form.workTypes"
                  class="ca-wt-cb"
                />
                {{ opt.label }}
              </label>
            </div>
            <span v-if="errors.workTypes" class="ca-error">{{ errors.workTypes }}</span>
          </div>

          <!-- Notes -->
          <div class="ca-field">
            <label class="ca-label">Дополнительная информация</label>
            <textarea
              v-model="form.notes"
              class="ca-input ca-textarea"
              rows="3"
              placeholder="Опыт, сертификаты, портфолио…"
            />
          </div>

          <div v-if="serverError" class="ca-server-error">{{ serverError }}</div>

          <button type="submit" class="ca-submit" :disabled="sending">
            <span v-if="sending" class="ca-spinner" />
            {{ sending ? 'Отправка…' : 'Отправить заявку' }}
          </button>

        </form>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CONTRACTOR_WORK_TYPE_OPTIONS } from '~~/shared/types/catalogs'

definePageMeta({ layout: 'default', auth: false })

const workTypeGroups = CONTRACTOR_WORK_TYPE_OPTIONS

const form = reactive({
  name: '',
  companyName: '',
  phone: '',
  email: '',
  city: '',
  workTypes: [] as string[],
  notes: '',
})

const errors = reactive<Record<string, string>>({})
const sending = ref(false)
const submitted = ref(false)
const serverError = ref('')

function validate() {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!form.name.trim()) errors.name = 'Укажите имя'
  if (!form.phone.trim()) errors.phone = 'Укажите телефон'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Некорректный email'
  if (!form.workTypes.length) errors.workTypes = 'Выберите хотя бы один вид работ'
  return Object.keys(errors).length === 0
}

async function submitForm() {
  if (!validate()) return
  sending.value = true
  serverError.value = ''
  try {
    await $fetch('/api/contractor-intake', {
      method: 'POST',
      body: { ...form },
    })
    submitted.value = true
  } catch (e: any) {
    serverError.value = e?.data?.message || 'Ошибка сервера. Попробуйте позже.'
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.ca-page {
  min-height: 100vh;
  display: flex; align-items: flex-start; justify-content: center;
  padding: 48px 16px 64px;
  background: var(--bg, #f7f7f7);
}
.ca-card {
  width: 100%; max-width: 600px;
  border-radius: 16px;
  padding: 36px 40px;
}
@media (max-width: 640px) { .ca-card { padding: 24px 18px; } }

/* Header */
.ca-title     { font-size: 1.5rem; font-weight: 700; margin-bottom: 6px; }
.ca-subtitle  { font-size: .9rem; opacity: .55; margin-bottom: 32px; }

/* Form */
.ca-form { display: flex; flex-direction: column; gap: 20px; }
.ca-field { display: flex; flex-direction: column; gap: 5px; }
.ca-label { font-size: .82rem; font-weight: 500; opacity: .7; }
.ca-req   { color: #e53e3e; }
.ca-field-hint { font-size: .75rem; opacity: .45; margin: -2px 0 4px; }
.ca-input {
  width: 100%; padding: 9px 12px; border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 15%, transparent);
  background: color-mix(in srgb, var(--glass-bg) 50%, transparent);
  color: var(--glass-text); font-size: .88rem; font-family: inherit;
  outline: none; transition: border-color .12s;
  box-sizing: border-box;
}
.ca-input:focus {
  border-color: color-mix(in srgb, var(--glass-text) 35%, transparent);
}
.ca-textarea { resize: vertical; min-height: 80px; }
.ca-field--error .ca-input { border-color: #e53e3e; }
.ca-error { font-size: .75rem; color: #e53e3e; }

/* Work types grid */
.ca-wt-grid {
  display: flex; flex-wrap: wrap; gap: 7px;
}
.ca-wt-item {
  font-size: .75rem; padding: 4px 11px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  border-radius: 16px; cursor: pointer; opacity: .55;
  transition: all .12s; user-select: none;
}
.ca-wt-item:hover { opacity: .8; }
.ca-wt-item--active {
  opacity: 1; font-weight: 600;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  border-color: color-mix(in srgb, var(--glass-text) 28%, transparent);
}
.ca-wt-cb { display: none; }

/* Submit */
.ca-submit {
  margin-top: 8px; padding: 12px 28px;
  background: #2563eb; color: #fff;
  border: none; border-radius: 10px; font-size: .88rem; font-weight: 600;
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  transition: opacity .12s;
  font-family: inherit;
}
.ca-submit:disabled { opacity: .6; cursor: not-allowed; }
.ca-submit:not(:disabled):hover { opacity: .88; }
.ca-spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  animation: ca-spin .75s linear infinite;
}
@keyframes ca-spin { to { transform: rotate(360deg); } }

.ca-server-error {
  font-size: .82rem; color: #e53e3e;
  padding: 8px 12px; border-radius: 8px;
  background: color-mix(in srgb, #e53e3e 8%, transparent);
  border: 1px solid color-mix(in srgb, #e53e3e 15%, transparent);
}

/* Success */
.ca-success { text-align: center; padding: 24px 0; }
.ca-success-icon  { font-size: 3rem; color: #16a34a; margin-bottom: 12px; }
.ca-success-title { font-size: 1.3rem; font-weight: 700; margin-bottom: 8px; }
.ca-success-text  { font-size: .9rem; opacity: .6; max-width: 340px; margin: 0 auto; }
</style>
