<template>
  <form class="cab-form" @submit.prevent="$emit('submit')">
    <div class="u-form-section">
      <h3>Система налогообложения</h3>
      <div class="u-grid-2">
        <div class="u-field">
          <label>СНО</label>
          <select v-model="form.taxSystem" class="glass-input cab-select">
            <option value="">— не указана —</option>
            <option value="osn">ОСН (общая)</option>
            <option value="usn6">УСН 6%</option>
            <option value="usn15">УСН 15%</option>
            <option value="patent">Патент</option>
            <option value="npd">НПД (самозанятый)</option>
            <option value="other">Другая</option>
          </select>
        </div>
        <div class="u-field">
          <label>Ставка / стоимость часа</label>
          <GlassInput v-model="form.hourlyRate" placeholder="2 500 ₽/час" />
        </div>
      </div>
    </div>

    <div class="u-form-section">
      <h3>Способы оплаты</h3>
      <div class="u-tags">
        <button
          v-for="pm in PAYMENT_METHOD_OPTIONS"
          :key="`pay-${pm.value}`"
          type="button"
          class="u-tag u-tag--picker"
          :class="{ 'u-tag--active': form.paymentMethods.includes(pm.value) }"
          @click="toggleArr(form.paymentMethods, pm.value)"
        >{{ pm.label }}</button>
      </div>
    </div>

    <div class="u-form-section">
      <h3>Страхование</h3>
      <div class="u-grid-2">
        <div class="u-field">
          <label class="cab-checkbox-label">
            <input v-model="form.hasInsurance" type="checkbox" class="cab-checkbox" />
            Есть страховка ответственности
          </label>
        </div>
        <div v-if="form.hasInsurance" class="u-field u-field--full">
          <label>Детали страхования</label>
          <textarea v-model="form.insuranceDetails" class="glass-input u-ta" rows="2" placeholder="Компания, номер полиса, срок…" />
        </div>
      </div>
    </div>

    <div class="u-form-section">
      <h3>Сертификаты и допуски</h3>
      <div class="cab-certs-list">
        <div v-for="(cert, idx) in form.certifications" :key="idx" class="cab-cert-item">
          <span>{{ cert }}</span>
          <button type="button" class="cab-cert-del" @click="removeCert(idx)">✕</button>
        </div>
      </div>
      <div class="cab-cert-add">
        <GlassInput v-model="newCert" placeholder="Новый сертификат / допуск" @keydown.enter.prevent="addCert" />
        <button type="button" class="cab-task-save" @click="addCert">+</button>
      </div>
    </div>

    <div class="u-form-foot">
      <GlassButton variant="primary" type="submit" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</GlassButton>
      <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { PAYMENT_METHOD_OPTIONS } from '~/entities/contractors/model/useContractorCabinet'

interface FinancesForm {
  taxSystem: string
  hourlyRate: string
  paymentMethods: string[]
  hasInsurance: boolean
  insuranceDetails: string
  certifications: string[]
}

const props = defineProps<{
  form: FinancesForm
  saving: boolean
  saveMsg: string
}>()

defineEmits<{
  submit: []
}>()

const newCert = ref('')

function toggleArr(arr: string[], val: string) {
  const idx = arr.indexOf(val)
  if (idx === -1) arr.push(val)
  else arr.splice(idx, 1)
}

function addCert() {
  const v = newCert.value.trim()
  if (v && !props.form.certifications.includes(v)) props.form.certifications.push(v)
  newCert.value = ''
}

function removeCert(idx: number) {
  props.form.certifications.splice(idx, 1)
}
</script>
