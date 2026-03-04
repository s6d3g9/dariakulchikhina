<template>
  <div class="ces-wrap">
    <!-- Loading -->
    <div v-if="pending" class="ces-loading">
      <div class="ces-skeleton" v-for="i in 3" :key="i"/>
    </div>
    <template v-else>

      <!-- ── Мои запросы ─────────────────────────────────────────── -->
      <div v-if="services.length" class="ces-section">
        <div class="ces-section-title">мои запросы</div>
        <div class="ces-my-list">
          <div
            v-for="svc in services"
            :key="svc.id"
            class="ces-my-card"
            :class="`ces-my-card--${svc.status}`"
          >
            <div class="ces-my-card-head">
              <span class="ces-status-badge" :style="`background:${statusMap[svc.status]?.color || '#888'}`">
                {{ statusMap[svc.status]?.label || svc.status }}
              </span>
              <span class="ces-my-date">{{ formatDate(svc.createdAt) }}</span>
            </div>
            <div class="ces-my-title">{{ svc.title }}</div>
            <div v-if="svc.description" class="ces-my-desc">{{ svc.description }}</div>

            <div class="ces-my-meta">
              <span>{{ svc.quantity }} {{ svc.unit }}</span>
              <span v-if="svc.unitPrice" class="ces-meta-price">
                {{ svc.unitPrice.toLocaleString('ru-RU') }} ₽ / {{ svc.unit }}
              </span>
              <span v-if="svc.totalPrice" class="ces-meta-total">
                итого: <strong>{{ svc.totalPrice.toLocaleString('ru-RU') }} ₽</strong>
              </span>
            </div>

            <div v-if="svc.clientNotes" class="ces-my-notes">
              <span class="ces-notes-label">ваша заметка:</span> {{ svc.clientNotes }}
            </div>

            <!-- Документы для скачивания -->
            <div v-if="svc.contractDocId || svc.invoiceDocId" class="ces-my-docs">
              <a v-if="svc.contractDocId" @click.prevent="openDoc(svc.contractDocId)"
                 href="#" class="ces-doc-btn">📄 Доп. соглашение</a>
              <a v-if="svc.invoiceDocId"  @click.prevent="openDoc(svc.invoiceDocId)"
                 href="#" class="ces-doc-btn">🧾 Счёт на оплату</a>
            </div>

            <!-- CTA по статусу -->
            <div class="ces-my-actions">
              <!-- quoted: клиент должен одобрить или отказаться -->
              <template v-if="svc.status === 'quoted'">
                <div class="ces-quoted-banner">
                  Дизайнер назначил стоимость.
                  Пожалуйста, подтвердите или откажитесь.
                </div>
                <button class="ces-btn ces-btn--approve" :disabled="acting === svc.id" @click="approve(svc)">
                  {{ acting === svc.id ? '...' : '✓ подтвердить' }}
                </button>
                <button class="ces-btn ces-btn--cancel" :disabled="acting === svc.id" @click="cancel(svc)">
                  отказаться
                </button>
              </template>

              <!-- contract_sent: ждём оплату -->
              <div v-else-if="svc.status === 'contract_sent'" class="ces-pay-banner">
                Договор и счёт сформированы. Пожалуйста, произведите оплату и сообщите дизайнеру.
              </div>

              <!-- in_progress -->
              <div v-else-if="svc.status === 'in_progress'" class="ces-progress-banner">
                Услуга в работе
              </div>

              <!-- done -->
              <div v-else-if="svc.status === 'done'" class="ces-done-banner">
                ✓ Услуга выполнена
              </div>

              <!-- Можно отменить если requested -->
              <button
                v-if="svc.status === 'requested'"
                class="ces-btn ces-btn--cancel"
                :disabled="acting === svc.id"
                @click="cancel(svc)"
              >
                отменить запрос
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Каталог услуг ──────────────────────────────────────── -->
      <div class="ces-section ces-catalog-section">
        <div class="ces-section-header">
          <div class="ces-section-title">каталог услуг</div>
          <div class="ces-section-hint">выберите услугу из каталога или опишите своими словами</div>
        </div>

        <div
          v-for="cat in catalogCategories"
          :key="cat.key"
          class="ces-cat-group"
        >
          <div class="ces-cat-label">{{ EXTRA_SERVICE_CATEGORY_LABELS[cat.key] }}</div>
          <div class="ces-cat-items">
            <button
              v-for="item in cat.items"
              :key="item.key"
              type="button"
              class="ces-cat-item"
              :class="{ 'ces-cat-item--selected': selectedItem?.key === item.key }"
              @click="selectItem(item)"
            >
              <span class="ces-cat-item-title">{{ item.title }}</span>
              <span v-if="item.defaultPrice" class="ces-cat-item-price">от {{ item.defaultPrice.toLocaleString('ru-RU') }} ₽</span>
              <span v-else class="ces-cat-item-price ces-cat-item-price--calc">цена по запросу</span>
              <span class="ces-cat-item-unit">/ {{ item.unit }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Форма запроса ─────────────────────────────────────────── -->
      <div class="ces-request-form" :class="{ 'ces-request-form--visible': showForm }">
        <div class="ces-form-title">
          {{ selectedItem ? selectedItem.title : 'свой запрос' }}
        </div>

        <div class="ces-form-row">
          <label class="ces-form-label">услуга *</label>
          <input v-model="form.title" class="ces-input" placeholder="Название услуги" />
        </div>
        <div class="ces-form-row">
          <label class="ces-form-label">описание (необязательно)</label>
          <textarea v-model="form.description" class="ces-input ces-textarea" rows="3"
            placeholder="Опишите подробнее, что вам нужно..." />
        </div>
        <div class="ces-form-row ces-form-row--inline">
          <div>
            <label class="ces-form-label">количество</label>
            <input v-model="form.quantity" class="ces-input" style="width:80px" placeholder="1" />
          </div>
          <div>
            <label class="ces-form-label">ед. изм.</label>
            <input v-model="form.unit" class="ces-input" style="width:130px" placeholder="услуга" />
          </div>
        </div>
        <div class="ces-form-row">
          <label class="ces-form-label">ваши пожелания</label>
          <textarea v-model="form.clientNotes" class="ces-input ces-textarea" rows="2"
            placeholder="Сроки, особенности, ссылки..." />
        </div>

        <div class="ces-form-actions">
          <button
            class="ces-btn ces-btn--submit"
            :disabled="!form.title.trim() || submitting"
            @click="submitRequest"
          >
            {{ submitting ? '...' : 'отправить запрос →' }}
          </button>
          <button class="ces-btn ces-btn--cancel" @click="resetForm">отмена</button>
        </div>
      </div>

      <!-- Нет запросов и форма закрыта -->
      <div v-if="!services.length && !showForm" class="ces-invite">
        Нет активных запросов. Выберите услугу из каталога выше или опишите свой запрос.
        <button class="ces-btn ces-btn--submit" style="margin-top:12px;display:inline-block" @click="openCustomForm">
          + свой запрос
        </button>
      </div>

    </template>

    <!-- Doc viewer modal -->
    <Teleport to="body">
      <div v-if="docModal" class="ces-doc-modal-overlay" @click.self="docModal = null">
        <div class="ces-doc-modal">
          <div class="ces-doc-modal-head">
            <span class="ces-doc-modal-title">{{ docModal.title }}</span>
            <button class="ces-doc-modal-close" @click="docModal = null">✕</button>
          </div>
          <pre class="ces-doc-content">{{ docModal.content }}</pre>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  EXTRA_SERVICE_STATUS_MAP,
  EXTRA_SERVICE_CATALOG,
  EXTRA_SERVICE_CATEGORY_LABELS,
  type ExtraServiceCatalogItem,
} from '~~/shared/types/catalogs'

const props = defineProps<{ slug: string }>()

const statusMap = EXTRA_SERVICE_STATUS_MAP

// ── Fetch services ──────────────────────────────────────────────
const { data: services, pending, refresh } = await useFetch<any[]>(
  () => `/api/projects/${props.slug}/extra-services`,
  { default: () => [] },
)

// ── Catalog ─────────────────────────────────────────────────────
const catalogCategories = computed(() => {
  const cat: Record<string, { key: any; items: ExtraServiceCatalogItem[] }> = {}
  for (const item of EXTRA_SERVICE_CATALOG) {
    if (!cat[item.category]) cat[item.category] = { key: item.category, items: [] }
    cat[item.category].items.push(item)
  }
  return Object.values(cat)
})

// ── Form ─────────────────────────────────────────────────────────
const selectedItem = ref<ExtraServiceCatalogItem | null>(null)
const showForm = ref(false)

const form = reactive({
  serviceKey:  '',
  title:       '',
  description: '',
  quantity:    '1',
  unit:        'услуга',
  clientNotes: '',
})

function selectItem(item: ExtraServiceCatalogItem) {
  selectedItem.value  = item
  form.serviceKey     = item.key
  form.title          = item.title
  form.description    = item.description
  form.unit           = item.unit
  form.quantity       = '1'
  showForm.value      = true
  nextTick(() => {
    const formEl = document.querySelector('.ces-request-form')
    formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function openCustomForm() {
  selectedItem.value  = null
  form.serviceKey     = ''
  form.title          = ''
  form.description    = ''
  form.quantity       = '1'
  form.unit           = 'услуга'
  form.clientNotes    = ''
  showForm.value      = true
}

function resetForm() {
  selectedItem.value = null
  showForm.value     = false
}

const submitting = ref(false)

async function submitRequest() {
  if (!form.title.trim()) return
  submitting.value = true
  try {
    await $fetch(`/api/projects/${props.slug}/extra-services`, {
      method: 'POST',
      body: {
        serviceKey:  form.serviceKey || undefined,
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        quantity:    form.quantity,
        unit:        form.unit,
        clientNotes: form.clientNotes.trim() || undefined,
      },
    })
    resetForm()
    await refresh()
  } catch (e: any) {
    alert(e?.data?.message || 'Ошибка отправки запроса')
  } finally {
    submitting.value = false
  }
}

// ── Actions ──────────────────────────────────────────────────────
const acting = ref<number | null>(null)

async function approve(svc: any) {
  acting.value = svc.id
  try {
    await $fetch(`/api/projects/${props.slug}/extra-services/${svc.id}`, {
      method: 'PUT',
      body: { status: 'approved' },
    })
    await refresh()
  } catch (e: any) {
    alert(e?.data?.message || 'Ошибка')
  } finally {
    acting.value = null
  }
}

async function cancel(svc: any) {
  if (!confirm(`Отменить запрос «${svc.title}»?`)) return
  acting.value = svc.id
  try {
    await $fetch(`/api/projects/${props.slug}/extra-services/${svc.id}`, {
      method: 'PUT',
      body: { status: 'cancelled' },
    })
    await refresh()
  } catch (e: any) {
    alert(e?.data?.message || 'Ошибка')
  } finally {
    acting.value = null
  }
}

// ── Doc viewer ────────────────────────────────────────────────────
const docModal = ref<{ title: string; content: string } | null>(null)

async function openDoc(docId: number) {
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
.ces-wrap { padding: 4px 0 40px; }

/* Состояние загрузки */
.ces-loading { display:flex; flex-direction:column; gap:10px; }
.ces-skeleton { height:80px; background:#111; border:1px solid #1a1a1a; border-radius:10px; animation:shim 1.4s infinite ease-in-out; }
@keyframes shim { 0%,100%{opacity:.4} 50%{opacity:.7} }

/* Секции */
.ces-section        { margin-bottom:32px; }
.ces-catalog-section{ margin-bottom:20px; }
.ces-section-header { margin-bottom:16px; }
.ces-section-title  { font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#888; margin-bottom:4px; }
.ces-section-hint   { font-size:.75rem; color:#555; }

/* Мои запросы */
.ces-my-list { display:flex; flex-direction:column; gap:10px; }
.ces-my-card {
  background:#111; border:1px solid #222; border-radius:10px; padding:14px 16px;
  border-left:3px solid #333;
}
.ces-my-card--requested     { border-left-color:#607d8b; }
.ces-my-card--quoted        { border-left-color:#1976d2; background:#0d1828; border-color:#1a3060; }
.ces-my-card--approved      { border-left-color:#0288d1; }
.ces-my-card--contract_sent { border-left-color:#7b1fa2; background:#150f28; border-color:#3a1a6a; }
.ces-my-card--paid          { border-left-color:#2e7d32; }
.ces-my-card--in_progress   { border-left-color:#ef6c00; }
.ces-my-card--done          { border-left-color:#388e3c; opacity:.7; }
.ces-my-card--rejected      { border-left-color:#c62828; opacity:.6; }
.ces-my-card--cancelled     { border-left-color:#555; opacity:.55; }

.ces-my-card-head  { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.ces-status-badge  { font-size:.68rem; font-weight:700; color:#fff; padding:2px 8px; border-radius:4px; text-transform:uppercase; letter-spacing:.04em; }
.ces-my-date       { font-size:.72rem; color:#555; }
.ces-my-title      { font-size:.92rem; font-weight:600; color:#ddd; margin-bottom:4px; }
.ces-my-desc       { font-size:.78rem; color:#777; margin-bottom:8px; }
.ces-my-meta       { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:6px; }
.ces-my-meta span  { font-size:.77rem; color:#888; }
.ces-meta-price    { color:#8ab4f8 !important; }
.ces-meta-total    { color:#5ecb6b !important; }
.ces-meta-total strong { color:#5ecb6b; }

.ces-my-notes      { font-size:.76rem; background:#1a2030; color:#8ab4f8; padding:6px 10px; border-radius:6px; margin-bottom:8px; }
.ces-notes-label   { font-weight:700; opacity:.7; }

.ces-my-docs       { display:flex; gap:10px; margin-bottom:8px; flex-wrap:wrap; }
.ces-doc-btn       { font-size:.78rem; color:#9575cd; text-decoration:none; border:1px solid #3a2a6a; background:#180f2a; padding:4px 10px; border-radius:5px; }
.ces-doc-btn:hover { background:#220f3a; text-decoration:none; }

.ces-my-actions   { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:10px; }

.ces-quoted-banner  { width:100%; font-size:.78rem; color:#8ab4f8; background:#0d1828; border:1px solid #1a3060; padding:8px 12px; border-radius:6px; margin-bottom:8px; }
.ces-pay-banner     { width:100%; font-size:.78rem; color:#ce93d8; background:#150f28; border:1px solid #3a1a6a; padding:8px 12px; border-radius:6px; }
.ces-progress-banner{ font-size:.78rem; color:#ffb74d; }
.ces-done-banner    { font-size:.78rem; color:#81c784; }

/* Каталог */
.ces-cat-group  { margin-bottom:20px; }
.ces-cat-label  { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:8px; }
.ces-cat-items  { display:flex; flex-wrap:wrap; gap:8px; }
.ces-cat-item   {
  background:#0e0e0e; border:1px solid #2a2a2a; border-radius:10px;
  padding:10px 14px; cursor:pointer; display:flex; flex-direction:column; gap:4px;
  text-align:left; transition:border-color .15s,background .15s;
  max-width:220px; min-width:150px;
}
.ces-cat-item:hover            { border-color:#4a6080; background:#101820; }
.ces-cat-item--selected        { border-color:#2a4a8a; background:#101828; box-shadow:0 0 0 1px #2a4a8a; }
.ces-cat-item-title { font-size:.8rem; color:#ccc; font-weight:600; }
.ces-cat-item-price { font-size:.72rem; color:#8ab4f8; }
.ces-cat-item-price--calc { color:#888; }
.ces-cat-item-unit  { font-size:.68rem; color:#555; }

/* Форма запроса */
.ces-request-form {
  background:#0e0e0e; border:1px solid #222; border-radius:12px; padding:20px;
  margin-top:8px; display:none;
}
.ces-request-form--visible { display:block; }
.ces-form-title { font-size:.88rem; font-weight:700; color:#ddd; margin-bottom:16px; }
.ces-form-row       { margin-bottom:12px; }
.ces-form-row--inline { display:flex; gap:12px; flex-wrap:wrap; }
.ces-form-label     { display:block; font-size:.75rem; color:#666; margin-bottom:4px; }
.ces-input {
  background:#0a0a0a; border:1px solid #222; border-radius:6px;
  color:#ccc; padding:8px 12px; font-size:.82rem; width:100%;
  box-sizing:border-box; outline:none;
}
.ces-input:focus { border-color:#4a6080; }
.ces-textarea { resize:vertical; min-height:64px; }

/* Кнопки */
.ces-form-actions   { display:flex; gap:10px; flex-wrap:wrap; margin-top:16px; }
.ces-btn            { padding:8px 18px; border-radius:8px; border:1px solid #333; background:#141414; color:#aaa; font-size:.8rem; cursor:pointer; transition:all .15s; }
.ces-btn:disabled   { opacity:.5; cursor:default; }
.ces-btn--submit    { background:#1a2a50; border-color:#2a4a8a; color:#8ab4f8; font-weight:600; }
.ces-btn--submit:hover:not(:disabled) { background:#203060; }
.ces-btn--approve   { background:#0f2a17; border-color:#1b4a2a; color:#81c784; font-weight:600; }
.ces-btn--approve:hover:not(:disabled) { background:#163520; }
.ces-btn--cancel    { background:#181818; border-color:#333; color:#888; }
.ces-btn--cancel:hover:not(:disabled) { background:#222; }

/* Приглашение */
.ces-invite { text-align:center; padding:40px 20px; color:#555; font-size:.84rem; }

/* Модальное окно документа */
.ces-doc-modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.8); z-index:9900;
  display:flex; align-items:center; justify-content:center; padding:20px;
}
.ces-doc-modal {
  background:#0e0e0e; border:1px solid #2a2a2a; border-radius:12px;
  width:100%; max-width:760px; max-height:90vh; overflow:hidden;
  display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,.8);
}
.ces-doc-modal-head {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 20px; border-bottom:1px solid #1a1a1a; flex-shrink:0;
}
.ces-doc-modal-title { font-size:.84rem; font-weight:600; color:#ddd; }
.ces-doc-modal-close { background:none; border:none; color:#888; font-size:1.1rem; cursor:pointer; padding:4px 8px; }
.ces-doc-modal-close:hover { color:#ccc; }
.ces-doc-content {
  padding:20px; overflow-y:auto; font-size:.76rem; color:#bbb;
  font-family:'Courier New',monospace; white-space:pre-wrap; line-height:1.6;
  flex:1;
}
</style>
