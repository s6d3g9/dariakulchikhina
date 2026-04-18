<template>
  <form class="cab-form" @submit.prevent="$emit('submit')">
    <div class="u-form-section">
      <h3>Юридические данные</h3>
      <div class="u-grid-2">
        <div class="u-field">
          <label>ИНН</label>
          <GlassInput v-model="form.inn" placeholder="000000000000" maxlength="12" />
        </div>
        <div class="u-field">
          <label>КПП</label>
          <GlassInput v-model="form.kpp" placeholder="000000000" maxlength="9" />
        </div>
        <div class="u-field">
          <label>ОГРН / ОГРНИП</label>
          <GlassInput v-model="form.ogrn" placeholder="0000000000000" maxlength="15" />
        </div>
        <div class="u-field u-field--full">
          <label>Юридический адрес</label>
          <GlassInput v-model="form.legalAddress" placeholder="Адрес регистрации ИП / ООО" />
        </div>
        <div class="u-field u-field--full">
          <label>Фактический адрес</label>
          <GlassInput v-model="form.factAddress" placeholder="Адрес ведения деятельности" />
        </div>
      </div>
    </div>

    <div class="u-form-section">
      <h3>Банковские реквизиты</h3>
      <div class="u-grid-2">
        <div class="u-field u-field--full">
          <label>Наименование банка</label>
          <GlassInput v-model="form.bankName" placeholder="ПАО Сбербанк" />
        </div>
        <div class="u-field">
          <label>БИК</label>
          <GlassInput v-model="form.bik" placeholder="000000000" maxlength="9" />
        </div>
        <div class="u-field">
          <label>Расчётный счёт</label>
          <GlassInput v-model="form.settlementAccount" placeholder="00000000000000000000" maxlength="20" />
        </div>
        <div class="u-field">
          <label>Корреспондентский счёт</label>
          <GlassInput v-model="form.correspondentAccount" placeholder="00000000000000000000" maxlength="20" />
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
interface RequisitesForm {
  inn: string
  kpp: string
  ogrn: string
  legalAddress: string
  factAddress: string
  bankName: string
  bik: string
  settlementAccount: string
  correspondentAccount: string
}

defineProps<{
  form: RequisitesForm
  saving: boolean
  saveMsg: string
}>()

defineEmits<{
  submit: []
}>()
</script>
