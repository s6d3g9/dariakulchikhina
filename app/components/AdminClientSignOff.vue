<template>
  <div class="acso-wrap">
    <div v-if="pending" class="acso-loading">Загрузка...</div>
    <template v-else>

      <!-- Status banner -->
      <div class="acso-banner" :class="`acso-banner--${form.cso_status || 'none'}`">
        <div class="acso-banner-icon">{{ statusIcon }}</div>
        <div class="acso-banner-body">
          <select v-model="form.cso_status" class="acso-status-sel" @change="save">
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
        <div class="acso-rows">
          <div class="acso-row">
            <label class="acso-lbl">дата отправки клиенту</label>
            <AppDatePicker v-model="form.cso_sent_date" model-type="iso" input-class="acso-inp" @update:model-value="save" />
          </div>
          <div class="acso-row">
            <label class="acso-lbl">дата подписания</label>
            <AppDatePicker v-model="form.cso_sign_date" model-type="iso" input-class="acso-inp" @update:model-value="save" />
          </div>
          <div class="acso-row">
            <label class="acso-lbl">клиент (ФИО)</label>
            <input v-model="form.cso_client_name" class="acso-inp" placeholder="Иванов Иван Иванович" @blur="save">
          </div>
          <div class="acso-row">
            <label class="acso-lbl">версия акта</label>
            <input v-model="form.cso_version" class="acso-inp" placeholder="v1" @blur="save">
          </div>
          <div class="acso-row acso-row--full">
            <label class="acso-lbl">комментарий клиента</label>
            <textarea v-model="form.cso_client_comment" class="acso-inp acso-ta" rows="3" @blur="save" />
          </div>
          <div class="acso-row acso-row--full">
            <label class="acso-lbl">внутренние заметки</label>
            <textarea v-model="form.cso_notes" class="acso-inp acso-ta" rows="2" @blur="save" />
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
.acso-banner--signed { border-color: #5caa7f; background: color-mix(in srgb, #5caa7f 8%, transparent); }
.acso-banner--disputed { border-color: #e8b84b; background: color-mix(in srgb, #e8b84b 8%, transparent); }
.acso-banner-icon { font-size: 1.6rem; }
.acso-banner-body { display: flex; align-items: center; gap: 12px; flex: 1; flex-wrap: wrap; }
.acso-status-sel { background: none; border: 1px solid var(--border, #e0e0e0); padding: 5px 10px; font-size: .82rem; font-family: inherit; color: inherit; cursor: pointer; }
.acso-saved { font-size: .72rem; color: #5caa7f; margin-left: auto; }
.acso-section { margin-bottom: 32px; }
.acso-section-title { font-size: .68rem; text-transform: uppercase; letter-spacing: 1.2px; color: #aaa; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border, #ececec); }
.acso-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
.acso-row { display: flex; flex-direction: column; gap: 5px; }
.acso-row--full { grid-column: 1 / -1; }
.acso-lbl { font-size: .72rem; color: #999; }
.acso-inp { border: 1px solid var(--border, #e0e0e0); padding: 7px 10px; font-size: .82rem; background: none; color: inherit; font-family: inherit; outline: none; }
.acso-inp:focus { border-color: #aaa; }
.acso-ta { resize: vertical; }
.acso-file-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.acso-file-link { font-size: .8rem; color: inherit; text-decoration: none; }
.acso-file-link:hover { text-decoration: underline; }
.acso-file-del { background: none; border: none; cursor: pointer; color: #bbb; font-size: .76rem; }
.acso-file-del:hover { color: #c00; }
.acso-upload-btn { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--border, #e0e0e0); padding: 7px 14px; font-size: .78rem; color: #666; cursor: pointer; user-select: none; }
.acso-upload-btn:hover { border-color: #aaa; color: inherit; }
.acso-uploading { font-size: .76rem; color: #999; margin-left: 10px; }
.acso-complete-card { display: flex; align-items: flex-start; gap: 14px; padding: 16px 18px; border: 1px solid #5caa7f; background: color-mix(in srgb, #5caa7f 8%, transparent); }
.acso-complete-icon { font-size: 2rem; }
.acso-complete-text strong { display: block; font-size: .88rem; margin-bottom: 4px; }
.acso-complete-text p { font-size: .78rem; color: inherit; opacity: .7; margin: 0; }
</style>
