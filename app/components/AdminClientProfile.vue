<template>
  <div>
    <div v-if="pending" style="font-size:.88rem;color:#999">Загрузка...</div>
    <template v-else>
      <div class="acp-card">
        <!-- photo upload -->
        <div class="acp-upload-row" style="margin-bottom:20px">
          <label class="acp-lbl" style="width:140px">фото клиента:</label>
          <input v-model="form.photo" class="acp-inp" type="text" placeholder="имя файла">
          <label class="acp-btn-upload">
            загрузить
            <input type="file" accept="image/*" style="display:none" @change="uploadPhoto">
          </label>
          <img v-if="form.photo" :src="form.photo.startsWith('/') ? form.photo : `/uploads/${form.photo}`" class="acp-img-prev">
        </div>

        <div v-for="field in fields" :key="field.key" class="acp-row">
          <label class="acp-lbl">{{ field.label }}:</label>
          <textarea v-if="field.multi" v-model="(form as any)[field.key]" class="acp-inp acp-ta" rows="2" />
          <input v-else v-model="(form as any)[field.key]" class="acp-inp" type="text">
        </div>
      </div>

      <div class="acp-actions">
        <p v-if="error" style="color:#c00;font-size:.8rem;margin-right:auto">{{ error }}</p>
        <button class="a-btn-save" :disabled="saving" @click="save">{{ saving ? '...' : 'сохранить' }}</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: project, pending, refresh } = await useFetch<any>(`/api/projects/${props.slug}`)

const saving = ref(false)
const error = ref('')

const fields = [
  { key: 'fio', label: 'фио' },
  { key: 'email', label: 'email' },
  { key: 'messengers', label: 'мессенджеры' },
  { key: 'phone', label: 'номер телефона' },
  { key: 'address', label: 'адрес' },
  { key: 'objectAddress', label: 'адрес объекта' },
  { key: 'paymentMethod', label: 'способ оплаты' },
  { key: 'familyStatus', label: 'семейное положение' },
  { key: 'children', label: 'дети' },
  { key: 'pets', label: 'питомцы' },
  { key: 'budget', label: 'бюджет' },
  { key: 'deadline', label: 'сроки проекта' },
  { key: 'notes', label: 'дополнительно', multi: true },
]

const form = reactive<Record<string, string>>({
  fio: '', email: '', messengers: '', phone: '', address: '',
  objectAddress: '', paymentMethod: '', familyStatus: '',
  children: '', pets: '', budget: '', deadline: '', notes: '', photo: ''
})

watch(project, (p) => {
  if (p?.profile) {
    Object.assign(form, p.profile)
  }
}, { immediate: true })

async function uploadPhoto(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  try {
    const res = await $fetch<{ filename: string }>('/api/upload', { method: 'POST', body: fd })
    form.photo = res.filename
  } catch { error.value = 'Ошибка загрузки' }
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/projects/${props.slug}`, {
      method: 'PUT',
      body: { profile: { ...form } }
    })
    refresh()
  } catch (e: any) {
    error.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.acp-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  padding: 24px;
  margin-bottom: 16px;
}
.acp-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
  border-bottom: 1px solid #f5f5f5;
  padding-bottom: 10px;
}
.acp-lbl {
  font-size: .78rem;
  color: #888;
  width: 160px;
  flex-shrink: 0;
  padding-top: 6px;
}
.acp-inp {
  flex: 1;
  border: none;
  border-bottom: 1px solid #ddd;
  padding: 6px 0;
  font-size: .88rem;
  outline: none;
  font-family: inherit;
  background: transparent;
}
.acp-inp:focus { border-bottom-color: #1a1a1a; }
.acp-ta {
  resize: vertical;
  border: 1px solid #ddd;
  padding: 6px 8px;
  border-radius: 2px;
  line-height: 1.5;
}
.acp-upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.acp-btn-upload {
  border: 1px solid #1a1a1a;
  background: transparent;
  padding: 4px 10px;
  font-size: .78rem;
  cursor: pointer;
  font-family: inherit;
  border-radius: 2px;
  white-space: nowrap;
}
.acp-btn-upload:hover { background: #1a1a1a; color: #fff; }
.acp-img-prev {
  max-width: 120px;
  max-height: 90px;
  object-fit: cover;
  border: 1px solid #ddd;
  border-radius: 2px;
}
.acp-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
  margin-top: 8px;
}
</style>
