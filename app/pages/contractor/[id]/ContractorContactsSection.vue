<template>
  <form class="cab-form" @submit.prevent="$emit('submit')">
    <div class="u-form-section">
      <h3>Основные контакты</h3>
      <div class="u-grid-2">
        <div class="u-field">
          <label>Имя / название</label>
          <GlassInput v-model="form.name" required />
        </div>
        <div class="u-field">
          <label>Компания</label>
          <GlassInput v-model="form.companyName" placeholder="ООО / ИП…" />
        </div>
        <div class="u-field">
          <label>Телефон</label>
          <GlassInput v-model="form.phone" type="tel" placeholder="+7 (___) ___-__-__" />
        </div>
        <div class="u-field">
          <label>Email</label>
          <GlassInput v-model="form.email" type="email" placeholder="mail@example.com" />
        </div>
      </div>
    </div>

    <div class="u-form-section">
      <h3>Мессенджеры</h3>
      <div class="u-grid-2">
        <div class="u-field">
          <label>Telegram</label>
          <GlassInput v-model="form.telegram" placeholder="@username или номер" />
        </div>
        <div class="u-field">
          <label>WhatsApp</label>
          <GlassInput v-model="form.whatsapp" placeholder="+7 (___) ___-__-__" />
        </div>
        <div class="u-field">
          <label>Мессенджер (другой)</label>
          <select v-model="form.messenger" class="glass-input cab-select">
            <option value="">—</option>
            <option>telegram</option>
            <option>whatsapp</option>
            <option>viber</option>
          </select>
        </div>
        <div class="u-field">
          <label>Ник / номер</label>
          <GlassInput v-model="form.messengerNick" />
        </div>
      </div>
    </div>

    <div class="u-form-section">
      <h3>Адрес и география</h3>
      <div class="u-grid-2">
        <div class="u-field">
          <label>Город</label>
          <GlassInput v-model="form.city" placeholder="Москва" />
        </div>
        <div class="u-field">
          <label>Радиус выезда</label>
          <GlassInput v-model="form.workRadius" placeholder="50 км / Москва и МО" />
        </div>
        <div class="u-field u-field--full">
          <label>Фактический адрес</label>
          <GlassInput v-model="form.factAddress" placeholder="Адрес для корреспонденции" />
        </div>
        <div class="u-field u-field--full">
          <label>Сайт / портфолио</label>
          <GlassInput v-model="form.website" placeholder="https://example.com" />
        </div>
      </div>
    </div>

    <div class="u-form-foot">
      <GlassButton variant="primary" type="submit" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</GlassButton>
      <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
    </div>
  </form>
</template>

<script setup lang="ts">
interface ContactsForm {
  name: string
  companyName: string
  phone: string
  email: string
  telegram: string
  whatsapp: string
  messenger: string
  messengerNick: string
  city: string
  workRadius: string
  factAddress: string
  website: string
}

defineProps<{
  form: ContactsForm
  saving: boolean
  saveMsg: string
}>()

defineEmits<{
  submit: []
}>()
</script>
