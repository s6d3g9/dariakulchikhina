<template>
  <div class="cl-wrap">

    <!-- Header -->
    <div class="cl-header glass-surface glass-card">
      <div class="cl-header-left">
        <span class="cl-title">клиенты</span>
        <span class="cl-badge">{{ clients?.length ?? 0 }}</span>
      </div>
      <button class="cl-add-btn" @click="openAdd">+ добавить клиента</button>
    </div>

    <!-- Loading / Empty -->
    <div v-if="pending" class="cl-empty glass-card glass-surface">Загрузка…</div>
    <div v-else-if="!clients?.length" class="cl-empty glass-card glass-surface">
      <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      Нет клиентов — добавьте первого
    </div>

    <!-- Client cards -->
    <div v-else class="cl-grid">
      <div v-for="c in clients" :key="c.id" class="cl-card glass-card">
        <div class="cl-card-head">
          <div class="cl-card-name">{{ c.name }}</div>
          <div class="cl-card-actions">
            <button class="cl-icon-btn" title="Редактировать" @click="openEdit(c)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            </button>
            <button class="cl-icon-btn cl-icon-btn--del" title="Удалить" @click="del(c.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>

        <div class="cl-contacts">
          <span v-if="c.phone" class="cl-contact">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.17 11.91 19.79 19.79 0 0 1 1.1 3.27 2 2 0 0 1 3.07 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" stroke="currentColor" stroke-width="1.5"/></svg>
            {{ c.phone }}
          </span>
          <span v-if="c.email" class="cl-contact">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="1.5"/><polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="1.5"/></svg>
            {{ c.email }}
          </span>
          <span v-if="c.messengerNick" class="cl-contact">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.5"/></svg>
            {{ c.messenger ? c.messenger + ' ' : '' }}{{ c.messengerNick }}
          </span>
          <span v-if="c.address" class="cl-contact">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/></svg>
            {{ c.address }}
          </span>
        </div>

        <p v-if="c.notes" class="cl-notes">{{ c.notes }}</p>

        <div v-if="c.linkedProjects?.length" class="cl-linked">
          <span class="cl-linked-label">проекты:</span>
          <NuxtLink
            v-for="p in c.linkedProjects"
            :key="p.slug"
            :to="`/admin/projects/${p.slug}`"
            class="cl-linked-chip glass-chip"
          >{{ p.title }}</NuxtLink>
        </div>

        <!-- Login credentials (ID + PIN) -->
        <div v-if="c.pin" class="cl-credentials">
          <span class="cl-cred-item">ID: <b>{{ c.id }}</b></span>
          <span class="cl-cred-sep">·</span>
          <span class="cl-cred-item">PIN: <b>{{ c.pin }}</b></span>
        </div>

        <div class="cl-card-foot">
          <button class="cl-link-btn" @click="openLink(c)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            {{ c.linkedProjects?.length ? 'сменить проект' : 'привязать к проекту' }}
          </button>
          <NuxtLink
            :to="`/client/brief/${c.id}`"
            class="cl-cabinet-btn"
            target="_blank"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 15L21 3M21 9v12H3V3h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            кабинет
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Add/Edit modal -->
    <div v-if="showModal" class="cl-backdrop" @click.self="closeModal">
      <div class="cl-modal glass-surface glass-card">
        <div class="cl-modal-head">
          <span>{{ editingId ? 'редактировать клиента' : 'новый клиент' }}</span>
          <button class="cl-close" @click="closeModal">✕</button>
        </div>
        <form class="cl-form" @submit.prevent="save">
          <div class="cl-field">
            <label>Имя / Название *</label>
            <input v-model="form.name" class="cl-input glass-input" required placeholder="Иванова Анна Сергеевна" autofocus>
          </div>
          <div class="cl-row">
            <div class="cl-field">
              <label>Телефон</label>
              <input v-model="form.phone" class="cl-input glass-input" placeholder="+7 999 000 00 00">
            </div>
            <div class="cl-field">
              <label>Email</label>
              <input v-model="form.email" class="cl-input glass-input" type="email" placeholder="client@mail.ru">
            </div>
          </div>
          <div class="cl-row">
            <div class="cl-field">
              <label>Мессенджер</label>
              <select v-model="form.messenger" class="cl-input glass-input cl-select">
                <option value="">— не указан</option>
                <option value="Telegram">Telegram</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Viber">Viber</option>
              </select>
            </div>
            <div class="cl-field">
              <label>Ник / номер</label>
              <input v-model="form.messengerNick" class="cl-input glass-input" placeholder="@username">
            </div>
          </div>
          <div class="cl-field">
            <label>Адрес (домашний)</label>
            <input v-model="form.address" class="cl-input glass-input" placeholder="г. Москва, ул. ...">
          </div>
          <div class="cl-field">
            <label>Заметки</label>
            <textarea v-model="form.notes" class="cl-input cl-ta glass-input" rows="3" placeholder="Любые пометки"></textarea>
          </div>
          <div class="cl-field">
            <label>PIN-код для входа в кабинет</label>
            <input v-model="form.pin" class="cl-input glass-input" placeholder="Например: 1234" maxlength="12">
            <span class="cl-field-hint">Клиент войдёт по ID + PIN на /client/brief-login</span>
          </div>
          <p v-if="saveError" class="cl-error">{{ saveError }}</p>
          <div class="cl-modal-foot">
            <button type="button" class="cl-cancel-btn" @click="closeModal">отмена</button>
            <button type="submit" class="cl-save-btn" :disabled="saving">
              {{ saving ? '...' : (editingId ? 'сохранить' : 'добавить') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Link-to-project modal -->
    <div v-if="showLink" class="cl-backdrop" @click.self="showLink = false">
      <div class="cl-modal glass-surface glass-card">
        <div class="cl-modal-head">
          <span>привязать «{{ linkClient?.name }}» к проекту</span>
          <button class="cl-close" @click="showLink = false">✕</button>
        </div>
        <div class="cl-form">
          <div class="cl-field">
            <label>Выберите проект</label>
            <select v-model="linkProjectSlug" class="cl-input glass-input cl-select">
              <option value="">— выберите проект —</option>
              <option v-for="p in allProjects" :key="p.slug" :value="p.slug">
                {{ p.title }}
              </option>
            </select>
          </div>
          <div v-if="linkProjectSlug" class="cl-link-preview glass-surface">
            <p class="cl-link-preview-title">Будет заполнено в профиле проекта:</p>
            <ul class="cl-link-list">
              <li><b>Имя клиента</b> → {{ linkClient?.name }}</li>
              <li v-if="linkClient?.phone"><b>Телефон</b> → {{ linkClient?.phone }}</li>
              <li v-if="linkClient?.email"><b>Email</b> → {{ linkClient?.email }}</li>
              <li v-if="linkClient?.address"><b>Адрес объекта</b> → {{ linkClient?.address }} (если не заполнен)</li>
            </ul>
          </div>
          <p v-if="linkError" class="cl-error">{{ linkError }}</p>
          <div class="cl-modal-foot">
            <button type="button" class="cl-cancel-btn" @click="showLink = false">отмена</button>
            <button class="cl-save-btn" :disabled="!linkProjectSlug || linking" @click="doLink">
              {{ linking ? '...' : 'привязать' }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const { data: clients, pending, refresh } = await useFetch<any[]>('/api/clients')
const { data: allProjects } = await useFetch<any[]>('/api/projects')

// ── Add / Edit ─────────────────────────────────────────
const showModal = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const saveError = ref('')

const defaultForm = () => ({ name: '', phone: '', email: '', messenger: '', messengerNick: '', address: '', notes: '', pin: '' })
const form = ref(defaultForm())

function openAdd() { editingId.value = null; form.value = defaultForm(); saveError.value = ''; showModal.value = true }
function openEdit(c: any) {
  editingId.value = c.id
  form.value = { name: c.name ?? '', phone: c.phone ?? '', email: c.email ?? '', messenger: c.messenger ?? '', messengerNick: c.messengerNick ?? '', address: c.address ?? '', notes: c.notes ?? '', pin: c.pin ?? '' }
  saveError.value = ''; showModal.value = true
}
function closeModal() { showModal.value = false }

async function save() {
  saving.value = true; saveError.value = ''
  try {
    if (editingId.value) await $fetch(`/api/clients/${editingId.value}`, { method: 'PUT', body: form.value })
    else await $fetch('/api/clients', { method: 'POST', body: form.value })
    await refresh(); closeModal()
  } catch (e: any) { saveError.value = e?.data?.statusMessage || 'Ошибка' }
  finally { saving.value = false }
}

// ── Delete ─────────────────────────────────────────────
async function del(id: number) {
  if (!confirm('Удалить клиента?')) return
  await $fetch(`/api/clients/${id}`, { method: 'DELETE' })
  await refresh()
}

// ── Link to project ────────────────────────────────────
const showLink = ref(false)
const linkClient = ref<any>(null)
const linkProjectSlug = ref('')
const linking = ref(false)
const linkError = ref('')

function openLink(c: any) { linkClient.value = c; linkProjectSlug.value = ''; linkError.value = ''; showLink.value = true }

async function doLink() {
  if (!linkProjectSlug.value || !linkClient.value) return
  linking.value = true; linkError.value = ''
  try {
    await $fetch(`/api/clients/${linkClient.value.id}/link-project`, { method: 'POST', body: { projectSlug: linkProjectSlug.value } })
    await refresh(); showLink.value = false
  } catch (e: any) { linkError.value = e?.data?.statusMessage || 'Ошибка' }
  finally { linking.value = false }
}
</script>

<style scoped>
.cl-wrap { padding-bottom: 64px; }

.cl-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; margin-bottom: 20px; gap: 12px; flex-wrap: wrap;
}
.cl-header-left { display: flex; align-items: center; gap: 8px; }
.cl-title { font-size: .72rem; letter-spacing: 1.2px; text-transform: uppercase; color: var(--glass-text); opacity: .55; }
.cl-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; padding: 0 5px; border-radius: 999px;
  background: rgba(0,0,0,.08); color: var(--glass-text); font-size: .62rem;
}
.cl-add-btn {
  padding: 8px 18px; border-radius: 8px; font-size: .78px;
  border: 1px solid var(--glass-border); background: var(--glass-text);
  color: var(--glass-page-bg); cursor: pointer; font-family: inherit;
  white-space: nowrap; transition: opacity .15s; font-size: .78rem;
}
.cl-add-btn:hover { opacity: .82; }

.cl-empty {
  padding: 60px 24px; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  font-size: .82rem; color: var(--glass-text); opacity: .35; letter-spacing: .5px;
}

.cl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }

.cl-card {
  display: flex; flex-direction: column; padding: 16px 18px 14px;
  transition: transform .18s ease, box-shadow .18s ease;
}
.cl-card:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(0,0,0,.12); }

.cl-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.cl-card-name { font-size: .95rem; font-weight: 500; color: var(--glass-text); line-height: 1.3; word-break: break-word; }
.cl-card-actions { display: flex; gap: 5px; flex-shrink: 0; }
.cl-icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 7px; cursor: pointer;
  border: 1px solid var(--glass-border); background: var(--glass-bg);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  color: var(--glass-text); opacity: .6; transition: opacity .15s;
}
.cl-icon-btn:hover { opacity: 1; }
.cl-icon-btn--del { color: rgba(200,40,40,.9); border-color: rgba(200,40,40,.3); background: rgba(200,40,40,.06); opacity: 1; }
.cl-icon-btn--del:hover { background: rgba(200,40,40,.85); color: #fff; border-color: transparent; }

.cl-contacts { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.cl-contact { display: flex; align-items: center; gap: 6px; font-size: .78rem; color: var(--glass-text); opacity: .6; line-height: 1.3; word-break: break-all; }
.cl-contact svg { flex-shrink: 0; opacity: .7; }

.cl-notes { font-size: .76rem; color: var(--glass-text); opacity: .45; line-height: 1.45; margin: 0 0 8px; font-style: italic; }

.cl-credentials { display: flex; align-items: center; gap: 6px; margin: 4px 0 8px; padding: 7px 10px; border-radius: 7px; background: rgba(0,0,0,.04); }
.cl-cred-item { font-size: .72rem; color: var(--glass-text); opacity: .6; }
.cl-cred-item b { font-weight: 600; opacity: 1; font-family: monospace; letter-spacing: .5px; }
.cl-cred-sep { color: var(--glass-text); opacity: .25; }

.cl-field-hint { font-size: .65rem; color: var(--glass-text); opacity: .35; margin-top: 2px; }

.cl-linked { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin-top: 4px; margin-bottom: 8px; }
.cl-linked-label { font-size: .65rem; text-transform: uppercase; letter-spacing: .5px; color: var(--glass-text); opacity: .35; flex-shrink: 0; }
.cl-linked-chip {
  font-size: .7rem; padding: 2px 9px; border-radius: 999px;
  text-decoration: none; color: var(--glass-text);
  border: 1px solid var(--glass-border); background: var(--glass-bg);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  opacity: .75; transition: opacity .15s;
}
.cl-linked-chip:hover { opacity: 1; }

.cl-card-foot { margin-top: auto; padding-top: 10px; border-top: 1px solid var(--glass-border); display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.cl-link-btn {
  display: flex; align-items: center; gap: 5px;
  font-size: .74rem; cursor: pointer; background: none; border: none;
  color: var(--glass-text); opacity: .5; font-family: inherit; padding: 0; transition: opacity .15s;
}
.cl-link-btn:hover { opacity: 1; }
.cl-cabinet-btn {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: .74rem; text-decoration: none; font-family: inherit;
  color: var(--glass-page-bg); background: var(--glass-text);
  padding: 5px 10px; border-radius: 7px; border: none; cursor: pointer;
  opacity: .75; transition: opacity .15s; white-space: nowrap;
}
.cl-cabinet-btn:hover { opacity: 1; }

.cl-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.35);
  -webkit-backdrop-filter: blur(5px); backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.cl-modal { width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; padding: 24px 26px 28px; }
.cl-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
.cl-modal-head span { font-size: .72rem; text-transform: uppercase; letter-spacing: 1.2px; color: var(--glass-text); opacity: .5; }
.cl-close {
  width: 28px; height: 28px; border-radius: 7px; border: none;
  background: rgba(0,0,0,.08); color: var(--glass-text); cursor: pointer; font-size: 1rem;
  display: flex; align-items: center; justify-content: center; transition: background .15s;
}
.cl-close:hover { background: rgba(0,0,0,.16); }

.cl-form { display: flex; flex-direction: column; gap: 14px; }
.cl-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cl-field { display: flex; flex-direction: column; gap: 5px; }
.cl-field label { font-size: .7rem; text-transform: uppercase; letter-spacing: .5px; color: var(--glass-text); opacity: .45; }
.cl-input { padding: 8px 12px; border-radius: 8px; font-size: .88rem; font-family: inherit; width: 100%; box-sizing: border-box; }
.cl-ta { resize: vertical; min-height: 72px; }
.cl-select { cursor: pointer; }
.cl-error { font-size: .78rem; color: #dc2626; margin: 0; padding: 7px 12px; background: rgba(220,38,38,.08); border-radius: 6px; }

.cl-link-preview { padding: 12px 14px; border-radius: 10px; font-size: .8rem; }
.cl-link-preview-title { font-size: .68rem; text-transform: uppercase; letter-spacing: .5px; opacity: .45; margin: 0 0 8px; }
.cl-link-list { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 4px; color: var(--glass-text); opacity: .7; }
.cl-link-list b { opacity: 1; font-weight: 500; }

.cl-modal-foot { display: flex; gap: 8px; justify-content: flex-end; padding-top: 4px; }
.cl-cancel-btn {
  padding: 8px 16px; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: .8rem;
  border: 1px solid var(--glass-border); background: transparent;
  color: var(--glass-text); opacity: .65; transition: opacity .15s;
}
.cl-cancel-btn:hover { opacity: 1; }
.cl-save-btn {
  padding: 8px 20px; border-radius: 8px; cursor: pointer; font-family: inherit; font-size: .8rem; font-weight: 500;
  border: none; background: var(--glass-text); color: var(--glass-page-bg); transition: opacity .15s;
}
.cl-save-btn:hover:not(:disabled) { opacity: .82; }
.cl-save-btn:disabled { opacity: .4; cursor: default; }

@media (max-width: 600px) {
  .cl-row { grid-template-columns: 1fr; }
  .cl-grid { grid-template-columns: 1fr; }
}
</style>
