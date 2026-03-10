<template>
  <div class="new-project-page">
    <div class="page-header">
      <NuxtLink to="/designer" class="back-link">← Мои проекты</NuxtLink>
      <h1 class="page-title">Новый проект</h1>
    </div>

    <form @submit.prevent="submit" class="project-form glass-surface">
      <!-- Основное -->
      <section class="form-section">
        <h2 class="section-title">Проект</h2>
        <div class="field-row">
          <div class="field field-wide">
            <label>Название проекта <span class="req">*</span></label>
            <input v-model="form.title" type="text" placeholder="Квартира Ивановых, ЖК Альфа" required class="input" />
          </div>
          <div class="field">
            <label>Статус</label>
            <select v-model="form.status" class="input">
              <option value="draft">Черновик</option>
              <option value="active">Активный</option>
              <option value="paused">Пауза</option>
              <option value="completed">Завершён</option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Площадь, м²</label>
            <input v-model.number="form.area" type="number" min="0" step="0.1" placeholder="85" class="input" />
          </div>
          <div class="field">
            <label>Пакет услуг</label>
            <input v-model="form.packageKey" type="text" placeholder="Стандарт, Премиум…" class="input" />
          </div>
          <div class="field">
            <label>Цена за м², ₽</label>
            <input v-model.number="form.pricePerSqm" type="number" min="0" placeholder="3500" class="input" />
          </div>
          <div class="field">
            <label>Итого, ₽</label>
            <input v-model.number="form.totalPrice" type="number" min="0" :placeholder="computedTotal > 0 ? String(computedTotal) : '0'" class="input" />
          </div>
        </div>
        <div class="field">
          <label>Примечания</label>
          <textarea v-model="form.notes" rows="2" placeholder="Особенности, пожелания…" class="input"></textarea>
        </div>
      </section>

      <!-- Клиент -->
      <section class="form-section">
        <h2 class="section-title">Клиент</h2>
        <div class="client-search-row">
          <input
            v-model="clientSearch"
            @input="onClientSearch"
            type="text"
            placeholder="Поиск по имени или телефону…"
            class="input"
          />
          <button type="button" @click="clientMode = 'new'" class="btn-secondary">Создать нового</button>
        </div>

        <!-- Результаты поиска -->
        <div v-if="clientResults.length" class="client-results">
          <div
            v-for="c in clientResults"
            :key="c.id"
            @click="selectClient(c)"
            class="client-result-item"
            :class="{ selected: selectedClient?.id === c.id }"
          >
            <span class="cr-name">{{ c.name }}</span>
            <span class="cr-phone">{{ c.phone }}</span>
            <span v-if="selectedClient?.id === c.id" class="cr-check">✓</span>
          </div>
        </div>

        <!-- Выбранный существующий -->
        <div v-if="selectedClient && clientMode !== 'new'" class="selected-client-badge">
          ✓ {{ selectedClient.name }}
          <button type="button" @click="selectedClient = null; clientSearch = ''" class="clear-btn">×</button>
        </div>

        <!-- Форма нового клиента -->
        <div v-if="clientMode === 'new'" class="new-client-form">
          <div class="field-row">
            <div class="field">
              <label>Имя <span class="req">*</span></label>
              <input v-model="newClient.name" type="text" placeholder="Иванова Мария" class="input" required />
            </div>
            <div class="field">
              <label>Телефон <span class="req">*</span></label>
              <input v-model="newClient.phone" type="tel" placeholder="+7 900 000 00 00" class="input" required />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Email</label>
              <input v-model="newClient.email" type="email" placeholder="email@mail.ru" class="input" />
            </div>
            <div class="field">
              <label>Мессенджер</label>
              <select v-model="newClient.messenger" class="input">
                <option value="">—</option>
                <option>Telegram</option>
                <option>WhatsApp</option>
                <option>Viber</option>
              </select>
            </div>
            <div class="field">
              <label>Ник</label>
              <input v-model="newClient.messengerNick" type="text" placeholder="@nickname" class="input" />
            </div>
          </div>
          <div class="field">
            <label>Адрес объекта</label>
            <input v-model="newClient.address" type="text" placeholder="г. Москва, ул. Ленина 1, кв. 10" class="input" />
          </div>
          <button type="button" @click="clientMode = 'search'; newClient = { name:'', phone:'', email:'', messenger:'', messengerNick:'', address:'' }" class="btn-text">
            ← Вернуться к поиску
          </button>
        </div>
      </section>

      <div v-if="errorMsg" class="form-error">{{ errorMsg }}</div>

      <div class="form-actions">
        <NuxtLink to="/designer" class="btn-cancel">Отмена</NuxtLink>
        <button type="submit" :disabled="submitting" class="btn-submit">
          <span v-if="submitting" class="spinner-sm"></span>
          {{ submitting ? 'Создаём…' : 'Создать проект' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'designer', middleware: 'designer' })

const router = useRouter()

// Project form
const form = reactive({
  title: '',
  status: 'draft',
  area: null as number | null,
  packageKey: '',
  pricePerSqm: null as number | null,
  totalPrice: null as number | null,
  notes: '',
})

const computedTotal = computed(() =>
  (form.pricePerSqm && form.area) ? form.pricePerSqm * form.area : 0
)

// Client
const clientSearch = ref('')
const clientResults = ref<any[]>([])
const selectedClient = ref<any>(null)
const clientMode = ref<'search' | 'new'>('search')
const newClient = reactive({ name: '', phone: '', email: '', messenger: '', messengerNick: '', address: '' })

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onClientSearch() {
  selectedClient.value = null
  if (searchTimer) clearTimeout(searchTimer)
  if (clientSearch.value.trim().length < 2) { clientResults.value = []; return }
  searchTimer = setTimeout(async () => {
    const data = await $fetch<any[]>(`/api/designer/search-clients?q=${encodeURIComponent(clientSearch.value)}`)
    clientResults.value = data
  }, 300)
}

function selectClient(c: any) {
  selectedClient.value = c
  clientSearch.value = c.name
  clientResults.value = []
}

// Submit
const submitting = ref(false)
const errorMsg = ref('')

function generateSlug(title: string): string {
  const tr: Record<string, string> = {
    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',
    н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',
    ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
  }
  const base = title.toLowerCase()
    .split('').map(c => tr[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 40)
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

async function submit() {
  if (!form.title.trim()) { errorMsg.value = 'Введите название проекта'; return }
  if (clientMode.value === 'new' && (!newClient.name.trim() || !newClient.phone.trim())) {
    errorMsg.value = 'Введите имя и телефон клиента'
    return
  }

  submitting.value = true
  errorMsg.value = ''

  try {
    const slug = generateSlug(form.title)
    const dp = await $fetch<any>('/api/designer/create-project', {
      method: 'POST',
      body: {
        title: form.title,
        slug,
        packageKey: form.packageKey || undefined,
        pricePerSqm: form.pricePerSqm || undefined,
        area: form.area || undefined,
        totalPrice: form.totalPrice || (computedTotal.value > 0 ? computedTotal.value : undefined),
        notes: form.notes || undefined,
      },
    })

    const dpId: number = dp.designerProject.id

    // Update status if not draft
    if (form.status !== 'draft') {
      await $fetch('/api/designer/update-project', {
        method: 'PUT',
        body: { designerProjectId: dpId, status: form.status },
      })
    }

    // Create or use client
    let clientId: number | null = null
    if (clientMode.value === 'new' && newClient.name) {
      const client = await $fetch<any>('/api/designer/clients', {
        method: 'POST',
        body: { ...newClient },
      })
      clientId = client.id
    } else if (selectedClient.value) {
      clientId = selectedClient.value.id
    }

    if (clientId) {
      await $fetch('/api/designer/team', {
        method: 'POST',
        body: { action: 'add-client', designerProjectId: dpId, clientId },
      })
    }

    router.push(`/designer/projects/${dpId}`)
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || e?.message || 'Ошибка при создании'
    submitting.value = false
  }
}
</script>

<style scoped>
.new-project-page { padding: 0; }

.page-header { margin-bottom: 1.5rem; }

.back-link {
  font-size: 0.85rem;
  color: var(--glass-accent, #6366f1);
  text-decoration: none;
  display: inline-block;
  margin-bottom: 0.5rem;
}
.back-link:hover { text-decoration: underline; }

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--glass-text, #111);
}

.project-form {
  border-radius: 14px;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-section { display: flex; flex-direction: column; gap: 1rem; }

.section-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--glass-text, #111);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--glass-border, #eee);
}

.field-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
  min-width: 140px;
}

.field-wide { flex: 2.5; }

.field label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--glass-label, #666);
}

.req { color: #ef4444; }

.input {
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--glass-border, #ddd);
  background: var(--glass-input-bg, rgba(255,255,255,0.6));
  color: var(--glass-text, #111);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}
.input:focus { border-color: var(--glass-accent, #6366f1); }
textarea.input { resize: vertical; }

.client-search-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.client-search-row .input { flex: 1; }

.client-results {
  border: 1px solid var(--glass-border, #ddd);
  border-radius: 8px;
  overflow: hidden;
  max-height: 200px;
  overflow-y: auto;
}

.client-result-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.9rem;
  cursor: pointer;
  transition: background 0.1s;
  font-size: 0.9rem;
}
.client-result-item:hover, .client-result-item.selected {
  background: color-mix(in srgb, var(--glass-accent,#6366f1) 8%, transparent);
}
.cr-name { font-weight: 500; }
.cr-phone { color: var(--glass-label, #888); font-size: 0.82rem; margin-left: auto; }
.cr-check { color: var(--glass-accent, #6366f1); font-weight: 700; margin-left: 0.5rem; }

.selected-client-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.85rem;
  background: color-mix(in srgb, var(--glass-accent, #6366f1) 12%, transparent);
  color: var(--glass-accent, #6366f1);
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}
.clear-btn {
  background: none; border: none; cursor: pointer;
  font-size: 1rem; color: inherit; opacity: 0.6; padding: 0;
}

.new-client-form { display: flex; flex-direction: column; gap: 0.75rem; }

.btn-text {
  background: none; border: none; cursor: pointer;
  color: var(--glass-accent, #6366f1); font-size: 0.85rem;
  padding: 0; text-align: left;
}
.btn-text:hover { text-decoration: underline; }

.form-error {
  padding: 0.75rem 1rem;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 8px;
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  align-items: center;
}

.btn-cancel {
  padding: 0.55rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--glass-border, #ddd);
  color: var(--glass-label, #666);
  font-size: 0.875rem;
  text-decoration: none;
  transition: background 0.1s;
}
.btn-cancel:hover { background: var(--glass-border, #f0f0f0); }

.btn-secondary {
  padding: 0.55rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--glass-border, #ddd);
  background: transparent;
  color: var(--glass-text, #333);
  font-size: 0.875rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s;
}
.btn-secondary:hover { background: var(--glass-border, #f0f0f0); }

.btn-submit {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.4rem;
  background: var(--glass-accent, #6366f1);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-submit:hover { opacity: 0.88; }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.spinner-sm {
  display: inline-block;
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
