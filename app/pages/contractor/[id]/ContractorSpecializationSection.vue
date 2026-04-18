<template>
  <form class="cab-form" @submit.prevent="$emit('submit')">
    <div class="u-form-section">
      <h3>Роль / профессия</h3>
      <div class="u-field u-field--full">
        <div v-for="group in ROLE_GROUPS" :key="group.label" class="u-tag-group">
          <div class="u-tag-group__label">{{ group.label }}</div>
          <div class="u-tags">
            <button
              v-for="r in group.items"
              :key="`role-${group.label}-${r.value}`"
              type="button"
              class="u-tag u-tag--picker"
              :class="{ 'u-tag--active': form.roleTypes.includes(r.value) }"
              @click="toggleArr(form.roleTypes, r.value)"
            >{{ r.label }}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="u-form-section">
      <h3>Виды работ</h3>
      <div class="u-field u-field--full">
        <div v-for="group in WORK_GROUPS" :key="group.label" class="u-tag-group">
          <div class="u-tag-group__label">{{ group.label }}</div>
          <div class="u-tags">
            <button
              v-for="w in group.items"
              :key="`work-${group.label}-${w.value}`"
              type="button"
              class="u-tag u-tag--picker"
              :class="{ 'u-tag--active': form.workTypes.includes(w.value) }"
              @click="toggleArr(form.workTypes, w.value)"
            >{{ w.label }}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="u-form-section">
      <h3>Опыт</h3>
      <div class="u-grid-2">
        <div class="u-field">
          <label>Стаж (лет)</label>
          <GlassInput v-model.number="form.experienceYears" type="number" min="0" max="100" placeholder="10" />
        </div>
        <div class="u-field">
          <label>Образование</label>
          <GlassInput v-model="form.education" placeholder="Высшее строительное…" />
        </div>
      </div>
    </div>

    <div class="u-form-section">
      <h3>О себе</h3>
      <div class="u-field u-field--full">
        <label>Заметки / описание</label>
        <textarea v-model="form.notes" class="glass-input u-ta" rows="4" placeholder="Опыт, специализация, особые условия работы…" />
      </div>
    </div>

    <div class="u-form-foot">
      <GlassButton variant="primary" type="submit" :disabled="saving">{{ saving ? 'Сохранение…' : 'Сохранить' }}</GlassButton>
      <span v-if="saveMsg" class="u-save-msg">{{ saveMsg }}</span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ROLE_GROUPS, WORK_GROUPS } from '~/entities/contractors/model/useContractorCabinet'

interface SpecializationForm {
  roleTypes: string[]
  workTypes: string[]
  experienceYears: number | null
  education: string
  notes: string
}

defineProps<{
  form: SpecializationForm
  saving: boolean
  saveMsg: string
}>()

defineEmits<{
  submit: []
}>()

function toggleArr(arr: string[], val: string) {
  const idx = arr.indexOf(val)
  if (idx === -1) arr.push(val)
  else arr.splice(idx, 1)
}
</script>
