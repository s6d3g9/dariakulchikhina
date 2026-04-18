<template>
  <form class="cab-form" @submit.prevent="$emit('submit')">
    <div class="u-form-section">
      <h3>Паспорт гражданина РФ</h3>
      <div class="u-grid-2">
        <div class="u-field">
          <label>Серия</label>
          <GlassInput v-model="form.passportSeries" placeholder="00 00" maxlength="5" />
        </div>
        <div class="u-field">
          <label>Номер</label>
          <GlassInput v-model="form.passportNumber" placeholder="000000" maxlength="7" />
        </div>
        <div class="u-field u-field--full">
          <label>Кем выдан</label>
          <GlassInput v-model="form.passportIssuedBy" placeholder="ОВД района…" />
        </div>
        <div class="u-field">
          <label>Дата выдачи</label>
          <GlassInput v-model="form.passportIssueDate" placeholder="дд.мм.гггг" />
        </div>
        <div class="u-field">
          <label>Код подразделения</label>
          <GlassInput v-model="form.passportDepartmentCode" placeholder="000-000" maxlength="7" />
        </div>
      </div>
    </div>

    <div class="u-form-section">
      <h3>Персональные данные</h3>
      <div class="u-grid-2">
        <div class="u-field">
          <label>Дата рождения</label>
          <GlassInput v-model="form.birthDate" placeholder="дд.мм.гггг" />
        </div>
        <div class="u-field">
          <label>Место рождения</label>
          <GlassInput v-model="form.birthPlace" placeholder="г. Москва" />
        </div>
        <div class="u-field u-field--full">
          <label>Адрес регистрации</label>
          <GlassInput v-model="form.registrationAddress" placeholder="Адрес по прописке" />
        </div>
        <div class="u-field">
          <label>СНИЛС</label>
          <GlassInput v-model="form.snils" placeholder="000-000-000 00" maxlength="14" />
        </div>
        <div class="u-field">
          <label>ИНН</label>
          <GlassInput v-model="form.inn" placeholder="000000000000" maxlength="12" />
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
interface PassportForm {
  passportSeries: string
  passportNumber: string
  passportIssuedBy: string
  passportIssueDate: string
  passportDepartmentCode: string
  birthDate: string
  birthPlace: string
  registrationAddress: string
  snils: string
  inn: string
}

defineProps<{
  form: PassportForm
  saving: boolean
  saveMsg: string
}>()

defineEmits<{
  submit: []
}>()
</script>
