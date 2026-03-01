<template>
  <div class="ccd-wrap glass-card">
    <div class="ccd-section">
      <div class="ccd-title">контактные данные клиента</div>
      <div class="ccd-rows">
        <div class="ccd-row">
          <label class="ccd-lbl">ФИО</label>
          <input v-model="form.fio" class="ccd-inp" type="text" placeholder="Фамилия Имя Отчество" @blur="save" />
        </div>

        <div class="ccd-row">
          <label class="ccd-lbl">Телефон</label>
          <input v-model="form.phone" class="ccd-inp" type="text" placeholder="+7 (___) ___-__-__" @blur="save" />
        </div>

        <div class="ccd-row">
          <label class="ccd-lbl">Почта</label>
          <input v-model="form.email" class="ccd-inp" type="email" placeholder="name@example.com" @blur="save" />
        </div>

        <div class="ccd-row">
          <label class="ccd-lbl">Мессенджер</label>
          <input v-model="form.messenger" class="ccd-inp" type="text" placeholder="Telegram / WhatsApp" @blur="save" />
        </div>

        <div class="ccd-row">
          <label class="ccd-lbl">Ник в мессенджере</label>
          <input v-model="form.messengerNick" class="ccd-inp" type="text" placeholder="@username" @blur="save" />
        </div>

        <div class="ccd-row">
          <label class="ccd-lbl">Предпочтительный способ связи</label>
          <input v-model="form.preferredContact" class="ccd-inp" type="text" placeholder="Звонок / Telegram / WhatsApp / Email" @blur="save" />
        </div>

        <div class="ccd-row">
          <label class="ccd-lbl">Адрес</label>
          <AppAddressInput v-model="form.address" input-class="ccd-inp" placeholder="Ваш адрес" @blur="save" />
        </div>

        <div class="ccd-row">
          <label class="ccd-lbl">Адрес объекта</label>
          <AppAddressInput v-model="form.objectAddress" @blur="save" />
        </div>
      </div>
    </div>

    <div class="ccd-footer">
      <span v-if="savedAt" class="ccd-saved">✓ сохранено {{ savedAt }}</span>
      <button class="ccd-btn" @click="save" :disabled="saving">{{ saving ? 'сохранение...' : 'сохранить' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: project, pending } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const form = reactive<Record<string, any>>({
  fio: '',
  phone: '',
  email: '',
  messenger: '',
  messengerNick: '',
  preferredContact: '',
  address: '',
  objectAddress: '',
})

watch(project, (p) => {
  if (p?.profile) {
    Object.assign(form, {
      fio: p.profile.fio || '',
      phone: p.profile.phone || '',
      email: p.profile.email || '',
      messenger: p.profile.messenger || '',
      messengerNick: p.profile.messengerNick || '',
      preferredContact: p.profile.preferredContact || '',
      address: p.profile.address || '',
      objectAddress: p.profile.objectAddress || '',
    })
  }
}, { immediate: true })

const saving = ref(false)
const { savedAt, touch: markSaved } = useTimestamp()

async function save() {
  if (pending.value) return
  saving.value = true
  try {
    await $fetch(`/api/projects/${props.slug}/client-profile`, {
      method: 'PUT',
      body: {
        fio: form.fio,
        phone: form.phone,
        email: form.email,
        messenger: form.messenger,
        messengerNick: form.messengerNick,
        preferredContact: form.preferredContact,
        address: form.address,
        objectAddress: form.objectAddress,
      },
    })
    if (project.value?.profile) {
      Object.assign(project.value.profile, {
        fio: form.fio,
        phone: form.phone,
        email: form.email,
        messenger: form.messenger,
        messengerNick: form.messengerNick,
        preferredContact: form.preferredContact,
        address: form.address,
        objectAddress: form.objectAddress,
      })
    }
    markSaved()
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.ccd-wrap { padding: 16px; }
.ccd-section { margin-bottom: 20px; }
.ccd-title {
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--glass-text);
  opacity: .5;
  margin-bottom: 12px;
}
.ccd-rows { display: flex; flex-direction: column; gap: 6px; }
.ccd-row {
  display: grid;
  grid-template-columns: 190px 1fr;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--glass-border);
  padding: 8px 0;
}
.ccd-lbl {
  font-size: .78rem;
  color: var(--glass-text);
  opacity: .6;
}
.ccd-inp {
  border: none;
  border-bottom: 1px solid var(--glass-border);
  background: transparent;
  color: var(--glass-text);
  padding: 6px 0;
  font-size: .88rem;
  font-family: inherit;
  outline: none;
}
.ccd-inp:focus { border-bottom-color: var(--glass-text); }

.ccd-row :deep(.aai-wrap) { width: 100%; }

.ccd-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 14px;
  margin-top: 10px;
}
.ccd-saved { font-size: .75rem; color: #8bbf8b; }
.ccd-btn {
  border: none;
  background: var(--glass-bg);
  color: var(--glass-text);
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-family: inherit;
  font-size: .82rem;
}
.ccd-btn:disabled { opacity: .6; cursor: default; }

@media (max-width: 760px) {
  .ccd-row {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 8px;
  }
}
</style>
