<template>
  <div class="aes-wrap">
    <!-- Loading -->
    <div v-if="pending" class="ent-content-loading">
      <div class="ent-skeleton-line" v-for="i in 5" :key="i"/>
    </div>
    <template v-else>

      <!-- ── Заголовок + добавить ────────────────────────────────── -->
      <div class="aes-header">
        <div>
          <div class="aes-title">дополнительные услуги</div>
          <div class="aes-subtitle">запросы клиента и инициативы дизайнера</div>
        </div>
        <button class="aes-btn-add" @click="openAddForm">+ добавить услугу</button>
      </div>

      <!-- ── Список услуг ──────────────────────────────────────────── -->
      <div v-if="services.length" class="aes-list">
        <div
          v-for="svc in services"
          :key="svc.id"
          class="aes-card"
          :class="`aes-card--${svc.status}`"
        >
          <!-- Строка заголовка -->
          <div class="aes-card-head">
            <div class="aes-card-left">
              <span class="aes-card-badge" :style="`background:${statusMap[svc.status as ExtraServiceStatus]?.color || 'var(--glass-text)'}`">
                {{ statusMap[svc.status as ExtraServiceStatus]?.label || svc.status }}
              </span>
              <span class="aes-card-source" :class="svc.requestedBy === 'admin' ? 'aes-card-source--admin' : 'aes-card-source--client'">
                {{ svc.requestedBy === 'admin' ? '✏ дизайнер' : '👤 клиент' }}
              </span>
            </div>
            <div class="aes-card-date">{{ formatDate(svc.createdAt) }}</div>
          </div>

          <div class="aes-card-title">{{ svc.title }}</div>
          <div v-if="svc.description" class="aes-card-desc">{{ svc.description }}</div>

          <!-- Объём + цена -->
          <div class="aes-card-meta">
            <span>{{ svc.quantity }} {{ svc.unit }}</span>
            <span v-if="svc.unitPrice" class="aes-card-price">
              {{ svc.unitPrice.toLocaleString('ru-RU') }} ₽ / {{ svc.unit }}
            </span>
            <span v-if="svc.totalPrice" class="aes-card-total">
              итого: <strong>{{ svc.totalPrice.toLocaleString('ru-RU') }} ₽</strong>
            </span>
          </div>

          <!-- Заметки -->
          <div v-if="svc.clientNotes" class="aes-card-notes aes-card-notes--client">
            <span class="aes-notes-label">клиент:</span> {{ svc.clientNotes }}
          </div>
          <div v-if="svc.adminNotes" class="aes-card-notes aes-card-notes--admin">
            <span class="aes-notes-label">дизайнер:</span> {{ svc.adminNotes }}
          </div>

          <!-- Документы -->
          <div v-if="svc.contractDocId || svc.invoiceDocId" class="aes-card-docs">
            <a v-if="svc.contractDocId" @click.prevent="viewDoc(svc.contractDocId)" href="#" class="aes-doc-link">📄 Доп. соглашение</a>
            <a v-if="svc.invoiceDocId"  @click.prevent="viewDoc(svc.invoiceDocId)"  href="#" class="aes-doc-link">🧾 Счёт</a>
          </div>

          <!-- Действия (в зависимости от статуса) -->
          <div class="aes-card-actions">

            <!-- Если requested — нужно назначить цену -->
            <template v-if="svc.status === 'requested'">
              <button class="aes-btn-sm aes-btn-sm--primary" @click="openPriceForm(svc)">назначить цену</button>
              <button class="aes-btn-sm aes-btn-sm--danger"  @click="setStatus(svc, 'rejected')">отклонить</button>
            </template>

            <!-- quoted — клиент должен одобрить или отклонить, дизайнер ждёт -->
            <template v-else-if="svc.status === 'quoted'">
              <span class="aes-card-waiting">⏳ ожидаем одобрения клиента</span>
              <button class="aes-btn-sm" @click="openPriceForm(svc)">изменить цену</button>
            </template>

            <!-- approved — можно выпустить документы -->
            <template v-else-if="svc.status === 'approved'">
              <button class="aes-btn-sm aes-btn-sm--success" :disabled="generating === svc.id" @click="generateDocs(svc)">
                {{ generating === svc.id ? '...' : '📑 выпустить договор + счёт' }}
              </button>
            </template>

            <!-- contract_sent — ждём оплату -->
            <template v-else-if="svc.status === 'contract_sent'">
              <button class="aes-btn-sm aes-btn-sm--primary" @click="setStatus(svc, 'paid')">✅ оплата получена</button>
            </template>

            <!-- paid → in_progress -->
            <template v-else-if="svc.status === 'paid'">
              <button class="aes-btn-sm aes-btn-sm--success" @click="setStatus(svc, 'in_progress')">▶ взять в работу</button>
            </template>

            <!-- in_progress → done -->
            <template v-else-if="svc.status === 'in_progress'">
              <button class="aes-btn-sm aes-btn-sm--success" @click="setStatus(svc, 'done')">✓ завершить</button>
            </template>

            <!-- Редактировать примечание -->
            <button v-if="!['done','rejected','cancelled'].includes(svc.status)" class="aes-btn-sm" @click="openNotesForm(svc)">
              заметка
            </button>

            <!-- Удалить -->
            <button class="aes-btn-sm aes-btn-sm--danger" @click="deleteService(svc)">✕</button>
          </div>
        </div>
      </div>

      <div v-else class="aes-empty">
        Запросов на дополнительные услуги пока нет
      </div>

      <!-- ── Модальное окно: добавить услугу ──────────────────────── -->
      <Teleport to="body">
        <div v-if="showAddModal" class="aes-modal-overlay" @click.self="showAddModal = false">
          <div class="aes-modal">
            <div class="aes-modal-title">добавить дополнительную услугу</div>

            <!-- Каталог -->
            <div class="aes-catalog">
              <div
                v-for="cat in catalogCategories"
                :key="cat.key"
                class="aes-catalog-section"
              >
                <div class="aes-catalog-cat-label">{{ EXTRA_SERVICE_CATEGORY_LABELS[cat.key] }}</div>
                <div class="aes-catalog-items">
                  <button
                    v-for="item in cat.items"
                    :key="item.key"
                    type="button"
                    class="aes-catalog-item"
                    :class="{ 'aes-catalog-item--selected': addForm.serviceKey === item.key }"
                    @click="selectCatalogItem(item)"
                  >
                    <span class="aes-catalog-item-title">{{ item.title }}</span>
                    <span v-if="item.defaultPrice" class="aes-catalog-item-price">от {{ item.defaultPrice.toLocaleString('ru-RU') }} ₽</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="aes-form-row">
              <label class="aes-form-label">услуга *</label>
              <input v-model="addForm.title" class="glass-input" placeholder="Название услуги" />
            </div>
            <div class="aes-form-row">
              <label class="aes-form-label">описание</label>
              <textarea v-model="addForm.description" class="glass-input glass-textarea" rows="2" placeholder="Детали..."/>
            </div>
            <div class="aes-form-row-duo">
              <div>
                <label class="aes-form-label">кол-во</label>
                <input v-model="addForm.quantity" class="glass-input" style="width:80px" placeholder="1" />
              </div>
              <div>
                <label class="aes-form-label">ед. изм.</label>
                <input v-model="addForm.unit" class="glass-input" style="width:120px" placeholder="услуга" />
              </div>
              <div>
                <label class="aes-form-label">цена за ед. ₽</label>
                <input v-model.number="addForm.unitPrice" type="number" min="0" class="glass-input" style="width:140px" placeholder="0" />
              </div>
            </div>
            <div class="aes-form-row">
              <label class="aes-form-label">примечание дизайнера</label>
              <textarea v-model="addForm.adminNotes" class="glass-input glass-textarea" rows="2" placeholder="Внутренняя заметка..."/>
            </div>

            <div class="aes-modal-actions">
              <button class="aes-btn-sm aes-btn-sm--primary" :disabled="!addForm.title.trim() || saving" @click="submitAdd">
                {{ saving ? '...' : 'добавить' }}
              </button>
              <button class="aes-btn-sm" @click="showAddModal = false">отмена</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ── Модальное окно: назначить цену ────────────────────────── -->
      <Teleport to="body">
        <div v-if="showPriceModal" class="aes-modal-overlay" @click.self="showPriceModal = false">
          <div class="aes-modal aes-modal--small">
            <div class="aes-modal-title">назначить цену</div>
            <div v-if="priceTarget" class="aes-modal-svc-name">{{ priceTarget.title }}</div>
            <div class="aes-form-row-duo">
              <div>
                <label class="aes-form-label">кол-во</label>
                <input v-model="priceForm.quantity" class="glass-input" style="width:80px" />
              </div>
              <div>
                <label class="aes-form-label">ед. изм.</label>
                <input v-model="priceForm.unit" class="glass-input" style="width:120px" />
              </div>
              <div>
                <label class="aes-form-label">цена за ед. ₽</label>
                <input v-model.number="priceForm.unitPrice" type="number" min="0" class="glass-input" style="width:140px" />
              </div>
            </div>
            <div class="aes-form-row">
              <label class="aes-form-label">итоговая сумма ₽ (авто)</label>
              <input :value="computedTotal" class="glass-input" disabled style="background:var(--glass-bg)"/>
            </div>
            <div class="aes-form-row">
              <label class="aes-form-label">заметка дизайнера</label>
              <textarea v-model="priceForm.adminNotes" class="glass-input glass-textarea" rows="2" />
            </div>
            <div class="aes-modal-actions">
              <button class="aes-btn-sm aes-btn-sm--primary" :disabled="saving" @click="submitPrice">
                {{ saving ? '...' : 'сохранить и выставить' }}
              </button>
              <button class="aes-btn-sm" @click="showPriceModal = false">отмена</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ── Модальное окно: заметка ────────────────────────────────── -->
      <Teleport to="body">
        <div v-if="showNotesModal" class="aes-modal-overlay" @click.self="showNotesModal = false">
          <div class="aes-modal aes-modal--small">
            <div class="aes-modal-title">заметка дизайнера</div>
            <div v-if="notesTarget" class="aes-modal-svc-name">{{ notesTarget.title }}</div>
            <textarea v-model="notesText" class="glass-input glass-textarea" rows="4" placeholder="Внутренняя заметка..."/>
            <div class="aes-modal-actions">
              <button class="aes-btn-sm aes-btn-sm--primary" :disabled="saving" @click="submitNotes">
                {{ saving ? '...' : 'сохранить' }}
              </button>
              <button class="aes-btn-sm" @click="showNotesModal = false">отмена</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- ── Doc viewer modal ─────────────────────────────────────── -->
      <Teleport to="body">
        <div v-if="docModal" class="aes-modal-overlay" @click.self="docModal = null">
          <div class="aes-modal">
            <div class="aes-modal-title">{{ docModal.title }}</div>
            <pre class="aes-doc-content">{{ docModal.content }}</pre>
            <div class="aes-modal-actions">
              <button class="aes-btn-sm" @click="docModal = null">закрыть</button>
            </div>
          </div>
        </div>
      </Teleport>

    </template>
  </div>
</template>

<script setup lang="ts">
import {
  EXTRA_SERVICE_STATUS_MAP,
  EXTRA_SERVICE_CATALOG,
  EXTRA_SERVICE_CATEGORY_LABELS,
  type ExtraServiceCategory,
  type ExtraServiceStatus,
  type ExtraServiceCatalogItem,
} from '~~/shared/types/catalogs'

const props = defineProps<{
  slug: string
}>()

const statusMap = EXTRA_SERVICE_STATUS_MAP

// ── Fetch ────────────────────────────────────────────────────────
const { data: services, pending, refresh } = await useFetch<any[]>(
  () => `/api/projects/${props.slug}/extra-services`,
  { default: () => [] },
)

// ── Каталог (сгруппированный) ────────────────────────────────────
const catalogCategories = computed(() => {
  const cat: Record<string, { key: ExtraServiceCategory; items: ExtraServiceCatalogItem[] }> = {}
  for (const item of EXTRA_SERVICE_CATALOG) {
    if (!cat[item.category]) cat[item.category] = { key: item.category, items: [] }
    cat[item.category].items.push(item)
  }
  return Object.values(cat)
})

// ── Add Form ────────────────────────────────────────────────────
const showAddModal = ref(false)
const saving = ref(false)
const addForm = reactive({
  serviceKey: '',
  title: '',
  description: '',
  quantity: '1',
  unit: 'услуга',
  unitPrice: null as number | null,
  adminNotes: '',
})

function openAddForm() {
  Object.assign(addForm, { serviceKey: '', title: '', description: '', quantity: '1', unit: 'услуга', unitPrice: null, adminNotes: '' })
  showAddModal.value = true
}

function selectCatalogItem(item: ExtraServiceCatalogItem) {
  addForm.serviceKey   = item.key
  addForm.title        = item.title
  addForm.description  = item.description
  addForm.unit         = item.unit
  addForm.unitPrice    = item.defaultPrice || null
}

async function submitAdd() {
  if (!addForm.title.trim()) return
  saving.value = true
  try {
    await $fetch(`/api/projects/${props.slug}/extra-services`, {
      method: 'POST',
      body: {
        serviceKey:  addForm.serviceKey || undefined,
        title:       addForm.title.trim(),
        description: addForm.description.trim() || undefined,
        quantity:    addForm.quantity,
        unit:        addForm.unit,
        unitPrice:   addForm.unitPrice || undefined,
        totalPrice:  addForm.unitPrice ? Math.round(addForm.unitPrice * Number(addForm.quantity)) : undefined,
        adminNotes:  addForm.adminNotes.trim() || undefined,
      },
    })
    showAddModal.value = false
    await refresh()
  } catch (e: any) {
    alert(e?.data?.message || 'Ошибка')
  } finally {
    saving.value = false
  }
}

// ── Price Form ──────────────────────────────────────────────────
const showPriceModal  = ref(false)
const priceTarget     = ref<any>(null)
const priceForm       = reactive({ quantity: '1', unit: 'услуга', unitPrice: null as number | null, adminNotes: '' })
const computedTotal   = computed(() =>
  priceForm.unitPrice ? (priceForm.unitPrice * Number(priceForm.quantity)).toLocaleString('ru-RU') + ' ₽' : '—'
)

function openPriceForm(svc: any) {
  priceTarget.value = svc
  Object.assign(priceForm, {
    quantity:   svc.quantity || '1',
    unit:       svc.unit || 'услуга',
    unitPrice:  svc.unitPrice || null,
    adminNotes: svc.adminNotes || '',
  })
  showPriceModal.value = true
}

async function submitPrice() {
  if (!priceTarget.value) return
  saving.value = true
  try {
    const qty = Number(priceForm.quantity) || 1
    await $fetch(`/api/projects/${props.slug}/extra-services/${priceTarget.value.id}`, {
      method: 'PUT',
      body: {
        quantity:   priceForm.quantity,
        unit:       priceForm.unit,
        unitPrice:  priceForm.unitPrice,
        totalPrice: priceForm.unitPrice ? Math.round(priceForm.unitPrice * qty) : null,
        adminNotes: priceForm.adminNotes.trim() || null,
        status:     'quoted',
      },
    })
    showPriceModal.value = false
    await refresh()
  } catch (e: any) {
    alert(e?.data?.message || 'Ошибка')
  } finally {
    saving.value = false
  }
}

// ── Notes Form ──────────────────────────────────────────────────
const showNotesModal = ref(false)
const notesTarget    = ref<any>(null)
const notesText      = ref('')

function openNotesForm(svc: any) {
  notesTarget.value = svc
  notesText.value   = svc.adminNotes || ''
  showNotesModal.value = true
}

async function submitNotes() {
  if (!notesTarget.value) return
  saving.value = true
  try {
    await $fetch(`/api/projects/${props.slug}/extra-services/${notesTarget.value.id}`, {
      method: 'PUT',
      body: { adminNotes: notesText.value.trim() || null },
    })
    showNotesModal.value = false
    await refresh()
  } catch (e: any) {
    alert(e?.data?.message || 'Ошибка')
  } finally {
    saving.value = false
  }
}

// ── Status change ───────────────────────────────────────────────
async function setStatus(svc: any, status: string) {
  try {
    await $fetch(`/api/projects/${props.slug}/extra-services/${svc.id}`, {
      method: 'PUT',
      body: { status },
    })
    await refresh()
  } catch (e: any) {
    alert(e?.data?.message || 'Ошибка')
  }
}

// ── Generate docs ────────────────────────────────────────────────
const generating = ref<number | null>(null)

async function generateDocs(svc: any) {
  if (!confirm(`Сформировать договор и счёт для «${svc.title}»?\nСтатус изменится на «Договор выставлен».`)) return
  generating.value = svc.id
  try {
    const result = await $fetch<any>(`/api/projects/${props.slug}/extra-services/${svc.id}/generate-docs`, {
      method: 'POST',
    })
    await refresh()
    alert(`Документы сформированы:\n• ${result.contractDoc.title}\n• ${result.invoiceDoc.title}`)
  } catch (e: any) {
    alert(e?.data?.message || 'Ошибка генерации документов')
  } finally {
    generating.value = null
  }
}

// ── Delete ───────────────────────────────────────────────────────
async function deleteService(svc: any) {
  if (!confirm(`Удалить услугу «${svc.title}»?`)) return
  try {
    await $fetch(`/api/projects/${props.slug}/extra-services/${svc.id}`, { method: 'DELETE' })
    await refresh()
  } catch (e: any) {
    alert(e?.data?.message || 'Ошибка удаления')
  }
}

// ── Doc viewer ────────────────────────────────────────────────────
const docModal = ref<{ title: string; content: string } | null>(null)

async function viewDoc(docId: number) {
  try {
    const doc = await $fetch<any>(`/api/documents/${docId}`)
    docModal.value = { title: doc.title, content: doc.content || '' }
  } catch {
    alert('Не удалось загрузить документ')
  }
}

// ── Utils ────────────────────────────────────────────────────────
function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.aes-wrap { padding: 4px 0 32px; }

/* Header */
.aes-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
.aes-title  { font-size:.82rem; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:color-mix(in srgb, var(--glass-text) 80%, transparent); }
.aes-subtitle { font-size:.75rem; color:color-mix(in srgb, var(--glass-text) 42%, transparent); margin-top:2px; }

/* Buttons */
.aes-btn-add      { background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); border:1px solid color-mix(in srgb, var(--ds-accent) 35%, transparent); color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); border-radius:8px; padding:6px 14px; font-size:.78rem; cursor:pointer; transition:background .15s; }
.aes-btn-add:hover{ background:color-mix(in srgb, var(--ds-accent) 20%, var(--glass-bg)); }
.aes-btn-sm       { padding:4px 10px; border-radius:6px; border:1px solid color-mix(in srgb, var(--glass-text) 20%, transparent); background:color-mix(in srgb, var(--glass-text) 4%, var(--glass-bg)); color:color-mix(in srgb, var(--glass-text) 65%, transparent); font-size:.74rem; cursor:pointer; transition:background .15s; }
.aes-btn-sm:hover { background:color-mix(in srgb, var(--glass-text) 6%, var(--glass-bg)); }
.aes-btn-sm:disabled { opacity:.5; cursor:default; }
.aes-btn-sm--primary { border-color:color-mix(in srgb, var(--ds-accent) 35%, transparent); background:color-mix(in srgb, var(--ds-accent) 10%, var(--glass-bg)); color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); }
.aes-btn-sm--primary:hover { background:color-mix(in srgb, var(--ds-accent) 20%, var(--glass-bg)); }
.aes-btn-sm--success { border-color:color-mix(in srgb, var(--ds-success) 25%, transparent); background:color-mix(in srgb, var(--ds-success) 10%, var(--glass-bg)); color:var(--ds-success); }
.aes-btn-sm--success:hover { background:color-mix(in srgb, var(--ds-success) 15%, var(--glass-bg)); }
.aes-btn-sm--danger  { border-color:#4a1b1b; background:#2a0f0f; color:var(--ds-error); }
.aes-btn-sm--danger:hover  { background:color-mix(in srgb, var(--ds-error) 12%, var(--glass-bg)); }

/* List */
.aes-list { display:flex; flex-direction:column; gap:12px; }

/* Card */
.aes-card { background:var(--glass-bg); border:1px solid color-mix(in srgb, var(--glass-text) 12%, transparent); border-radius:10px; padding:14px 16px; transition:border-color .2s; }
.aes-card--requested     { border-left:3px solid color-mix(in srgb, var(--ds-accent) 35%, var(--glass-text)); }
.aes-card--quoted        { border-left:3px solid var(--ds-accent); }
.aes-card--approved      { border-left:3px solid var(--ds-accent); }
.aes-card--contract_sent { border-left:3px solid var(--phase-violet, #7c3aed); }
.aes-card--paid          { border-left:3px solid var(--ds-success); }
.aes-card--in_progress   { border-left:3px solid var(--ds-warning); }
.aes-card--done          { border-left:3px solid var(--ds-success); opacity:.75; }
.aes-card--rejected      { border-left:3px solid var(--ds-error); opacity:.65; }
.aes-card--cancelled     { border-left:3px solid color-mix(in srgb, var(--glass-text) 60%, transparent); opacity:.65; }

.aes-card-head   { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
.aes-card-left   { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.aes-card-badge  { display:inline-block; color:white; font-size:.68rem; font-weight:600; padding:2px 7px; border-radius:4px; text-transform:uppercase; letter-spacing:.04em; }
.aes-card-source { font-size:.71rem; padding:2px 7px; border-radius:4px; }
.aes-card-source--client { background:color-mix(in srgb, var(--ds-accent) 8%, var(--glass-bg)); color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); }
.aes-card-source--admin  { background:#1a2a1a; color:var(--ds-success-light, color-mix(in srgb, var(--ds-success) 70%, white)); }
.aes-card-date   { font-size:.72rem; color:color-mix(in srgb, var(--glass-text) 35%, transparent); }

.aes-card-title  { font-size:.9rem; font-weight:600; color:color-mix(in srgb, var(--glass-text) 87%, transparent); margin-bottom:4px; }
.aes-card-desc   { font-size:.78rem; color:color-mix(in srgb, var(--glass-text) 48%, transparent); margin-bottom:8px; }
.aes-card-meta   { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:6px; }
.aes-card-meta span { font-size:.77rem; color:color-mix(in srgb, var(--glass-text) 55%, transparent); }
.aes-card-price  { color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)) !important; }
.aes-card-total  { color:var(--ds-success) !important; }
.aes-card-total strong { color:var(--ds-success); }

.aes-card-notes     { font-size:.76rem; padding:6px 10px; border-radius:6px; margin-bottom:4px; }
.aes-card-notes--client { background:color-mix(in srgb, var(--ds-accent) 8%, var(--glass-bg)); color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); }
.aes-card-notes--admin  { background:#1a2a1a; color:var(--ds-success-light, color-mix(in srgb, var(--ds-success) 70%, white)); }
.aes-notes-label    { font-weight:700; opacity:.7; }

.aes-card-docs   { display:flex; gap:10px; margin-bottom:8px; flex-wrap:wrap; }
.aes-doc-link    { font-size:.75rem; color:var(--phase-violet, #7c3aed); text-decoration:none; }
.aes-doc-link:hover { text-decoration:underline; }

.aes-card-actions { display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-top:8px; }
.aes-card-waiting { font-size:.75rem; color:color-mix(in srgb, var(--glass-text) 55%, transparent); font-style:italic; }

/* Empty */
.aes-empty { text-align:center; padding:40px; color:color-mix(in srgb, var(--glass-text) 30%, transparent); font-size:.84rem; }

/* Modal */
.aes-modal-overlay {
  position:fixed; inset:0; background:color-mix(in srgb, var(--glass-page-bg) 75%, transparent); z-index:9900;
  display:flex; align-items:center; justify-content:center; padding:20px;
}
.aes-modal {
  background:var(--glass-bg); border:1px solid color-mix(in srgb, var(--glass-text) 14%, transparent); border-radius:14px;
  padding:24px; width:100%; max-width:680px; max-height:90vh;
  overflow-y:auto; box-shadow:0 20px 60px color-mix(in srgb, black 70%, transparent);
}
.aes-modal--small { max-width:420px; }
.aes-modal-title  { font-size:.85rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:color-mix(in srgb, var(--glass-text) 65%, transparent); margin-bottom:16px; }
.aes-modal-svc-name { font-size:.88rem; color:color-mix(in srgb, var(--glass-text) 87%, transparent); font-weight:600; margin-bottom:12px; background:color-mix(in srgb, var(--glass-text) 4%, var(--glass-bg)); padding:8px 12px; border-radius:6px; }
.aes-modal-actions  { display:flex; gap:8px; margin-top:16px; }

/* Form rows */
.aes-form-row      { margin-bottom:12px; }
.aes-form-label    { display:block; font-size:.75rem; color:color-mix(in srgb, var(--glass-text) 48%, transparent); margin-bottom:4px; }
.aes-form-row-duo  { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px; }

/* Catalog */
.aes-catalog{ margin-bottom:16px; max-height:260px; overflow-y:auto; }
.aes-catalog-section { margin-bottom:12px; }
.aes-catalog-cat-label { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:color-mix(in srgb, var(--glass-text) 42%, transparent); margin-bottom:6px; }
.aes-catalog-items{ display:flex; flex-wrap:wrap; gap:6px; }
.aes-catalog-item { background:var(--glass-bg); border:1px solid color-mix(in srgb, var(--glass-text) 14%, transparent); border-radius:8px; padding:6px 10px; cursor:pointer; display:flex; flex-direction:column; gap:2px; text-align:left; transition:border-color .15s,background .15s; max-width:200px; }
.aes-catalog-item:hover { border-color:color-mix(in srgb, var(--ds-accent) 40%, var(--glass-text)); background:color-mix(in srgb, var(--ds-accent) 8%, var(--glass-bg)); }
.aes-catalog-item--selected { border-color:color-mix(in srgb, var(--ds-accent) 35%, transparent); background:#1a2040; }
.aes-catalog-item-title { font-size:.76rem; color:color-mix(in srgb, var(--glass-text) 80%, transparent); }
.aes-catalog-item-price { font-size:.68rem; color:var(--ds-accent-light, color-mix(in srgb, var(--ds-accent) 70%, white)); }

/* Glass inputs */
.glass-input {
  background:var(--glass-page-bg); border:1px solid color-mix(in srgb, var(--glass-text) 12%, transparent); border-radius:6px; color:color-mix(in srgb, var(--glass-text) 80%, transparent);
  padding:7px 10px; font-size:.82rem; width:100%; box-sizing:border-box; outline:none;
}
.glass-input:focus { border-color:color-mix(in srgb, var(--ds-accent) 40%, var(--glass-text)); }
.glass-textarea { resize:vertical; min-height:60px; }

/* Doc viewer */
.aes-doc-content {
  font-family:'Courier New',monospace; font-size:.72rem; color:color-mix(in srgb, var(--glass-text) 73%, transparent);
  white-space:pre-wrap; line-height:1.6; max-height:70vh; overflow-y:auto;
  background:#050505; padding:16px; border-radius:8px; border:1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  margin-bottom:12px;
}
</style>
