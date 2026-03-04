<template>
  <div class="acso-wrap">
    <div v-if="pending" class="ent-content-loading"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    <template v-else>

      <!-- Status banner -->
      <div class="acso-banner" :class="`acso-banner--${form.cso_status || 'none'}`">
        <div class="acso-banner-icon">{{ statusIcon }}</div>
        <div class="acso-banner-body">
          <select v-model="form.cso_status" class="u-status-sel" @change="save">
            <option value="">ожидание подписи</option>
            <option value="sent">акт отправлен клиенту</option>
            <option value="signed">подписан клиентом ✓</option>
            <option value="disputed">есть разногласия</option>
          </select>
          <span v-if="savedAt" class="acso-saved">✓ {{ savedAt }}</span>
        </div>
      </div>

      <div class="acso-section">
        <div class="acso-section-title">данные подписания</div>
        <div class="u-grid-2">
          <div class="u-field">
            <label class="u-field__label">дата отправки клиенту</label>
            <AppDatePicker v-model="form.cso_sent_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">дата подписания</label>
            <AppDatePicker v-model="form.cso_sign_date" model-type="iso" input-class="glass-input" @update:model-value="save" />
          </div>
          <div class="u-field">
            <label class="u-field__label">клиент (ФИО)</label>
            <input v-model="form.cso_client_name" class="glass-input" placeholder="Иванов Иван Иванович" @blur="save">
          </div>
          <div class="u-field">
            <label class="u-field__label">версия акта</label>
            <input v-model="form.cso_version" class="glass-input" placeholder="v1" @blur="save">
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">комментарий клиента</label>
            <textarea v-model="form.cso_client_comment" class="glass-input u-ta" rows="3" @blur="save" />
          </div>
          <div class="u-field u-field--full">
            <label class="u-field__label">внутренние заметки</label>
            <textarea v-model="form.cso_notes" class="glass-input u-ta" rows="2" @blur="save" />
          </div>
        </div>
      </div>

      <div class="acso-section">
        <div class="acso-section-title">файл акта с подписью</div>
        <div v-if="form.cso_file" class="acso-file-row">
          <a :href="form.cso_file" target="_blank" class="acso-file-link">📄 {{ form.cso_filename || 'открыть документ' }}</a>
          <button class="acso-file-del" @click="form.cso_file = ''; form.cso_filename = ''; save()">удалить</button>
        </div>
        <label class="acso-upload-btn">
          {{ form.cso_file ? 'заменить файл' : '📎 загрузить подписанный акт' }}
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" style="display:none" @change="uploadFile">
        </label>
        <span v-if="uploading" class="acso-uploading">загрузка...</span>
      </div>

      <div v-if="form.cso_status === 'signed'" class="acso-complete-card">
        <div class="acso-complete-icon">🎉</div>
        <div class="acso-complete-text">
          <strong>Проект завершён</strong>
          <p>Акт подписан{{ form.cso_sign_date ? ` ${form.cso_sign_date}` : '' }}. Можно переводить проект в статус «Завершено».</p>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()
const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)
const { savedAt, touch: markSaved } = useTimestamp()
const uploading = ref(false)

const form = reactive<any>({
  cso_status: '',
  cso_sent_date: '',
  cso_sign_date: '',
  cso_client_name: '',
  cso_version: '',
  cso_client_comment: '',
  cso_notes: '',
  cso_file: '',
  cso_filename: '',
})

watch(project, (p) => {
  if (!p?.profile) return
  const pf = p.profile
  Object.keys(form).forEach(k => { if (pf[k] !== undefined) (form as any)[k] = pf[k] })
}, { immediate: true })

const statusIcon = computed(() => {
  const icons: Record<string, string> = { sent: '📨', signed: '✅', disputed: '⚠️' }
  return icons[form.cso_status] || '📋'
})

async function save() {
  await $fetch(`/api/projects/${props.slug}`, {
    method: 'PUT',
    body: { profile: { ...(project.value?.profile || {}), ...form } },
  })
  markSaved()
}

async function uploadFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  uploading.value = true
  const fd = new FormData(); fd.append('file', f)
  const res = await $fetch<any>('/api/upload', { method: 'POST', body: fd })
  form.cso_file = res.url
  form.cso_filename = f.name
  uploading.value = false
  await save()
}
</script>

<style scoped>
.acso-wrap { padding: 4px 0 40px; }
.acso-loading { padding: 40px 0; font-size: .82rem; color: #aaa; }
.acso-banner { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid var(--border, #ececec); margin-bottom: 28px; }
.acso-banner--signed { border-color: var(--ds-success, #5caa7f); background: color-mix(in srgb, var(--ds-success, #5caa7f) 8%, transparent); }
.acso-banner--disputed { border-color: #e8b84b; background: color-mix(in srgb, #e8b84b 8%, transparent); }
.acso-banner-icon { font-size: 1.6rem; }
.acso-banner-body { display: flex; align-items: center; gap: 12px; flex: 1; flex-wrap: wrap; }
</style>
