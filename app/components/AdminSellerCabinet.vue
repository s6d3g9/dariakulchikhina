<template>
  <div class="scab-wrap" v-if="sellerId">
    <div v-if="pending && !seller" class="ent-page-skeleton">
      <div class="ent-sk-sidebar"><div class="ent-nav-skeleton" v-for="i in 6" :key="i"/></div>
      <div class="ent-sk-main"><div class="ent-skeleton-line" v-for="i in 5" :key="i"/></div>
    </div>

    <div v-else-if="seller" class="scab-body">
      <!-- Sidebar -->
      <aside class="scab-sidebar glass-surface std-sidenav">
        <nav class="scab-nav std-nav">
          <button
            v-for="item in NAV"
            :key="item.key"
            class="scab-nav-item std-nav-item"
            :class="{ 'std-nav-item--active': section === item.key }"
            @click="section = item.key"
          >
            <span>{{ item.label }}</span>
          </button>
        </nav>
      </aside>

      <!-- Main -->
      <main class="scab-main">
        <div class="scab-section-head">
          <span class="scab-section-title">{{ seller.name }}</span>
          <span class="scab-status-dot" :class="`dot-${seller.status}`"></span>
          <span v-if="savedAt" class="scab-saved">✓ сохранено {{ savedAt }}</span>
        </div>

        <!-- ══════════════ ОБЗОР ══════════════ -->
        <template v-if="section === 'overview'">
          <div class="scab-overview-stats">
            <div class="scov-stat glass-surface">
              <div class="scov-stat-val">{{ seller.projectCount ?? 0 }}</div>
              <div class="scov-stat-lbl">проектов</div>
            </div>
            <div class="scov-stat glass-surface">
              <div class="scov-stat-val">{{ seller.categories?.length ?? 0 }}</div>
              <div class="scov-stat-lbl">категорий</div>
            </div>
            <div class="scov-stat glass-surface">
              <div class="scov-stat-val">{{ TYPE_LABELS[seller.type] ?? seller.type }}</div>
              <div class="scov-stat-lbl">тип</div>
            </div>
          </div>

          <div class="scov-info-grid glass-surface">
            <div v-if="seller.contactPerson" class="scov-info-row">
              <span class="scov-lbl">Контактное лицо</span>
              <span>{{ seller.contactPerson }}</span>
            </div>
            <div v-if="seller.phone" class="scov-info-row">
              <span class="scov-lbl">Телефон</span>
              <a :href="`tel:${seller.phone}`" class="scov-link">{{ seller.phone }}</a>
            </div>
            <div v-if="seller.email" class="scov-info-row">
              <span class="scov-lbl">Email</span>
              <a :href="`mailto:${seller.email}`" class="scov-link">{{ seller.email }}</a>
            </div>
            <div v-if="seller.website" class="scov-info-row">
              <span class="scov-lbl">Сайт</span>
              <a :href="seller.website" target="_blank" class="scov-link">{{ seller.website }}</a>
            </div>
            <div v-if="seller.city" class="scov-info-row">
              <span class="scov-lbl">Город</span>
              <span>{{ seller.city }}</span>
            </div>
            <div v-if="seller.telegram" class="scov-info-row">
              <span class="scov-lbl">Telegram</span>
              <a :href="`https://t.me/${seller.telegram.replace('@','')}`" target="_blank" class="scov-link">{{ seller.telegram }}</a>
            </div>
          </div>

          <div v-if="seller.categories?.length" class="scov-cats-block glass-surface">
            <div class="scov-cats-title">Категории товаров</div>
            <div class="scov-cats">
              <span v-for="cat in seller.categories" :key="cat" class="scov-cat-tag">
                {{ CATEGORIES.find(c => c.key === cat)?.label ?? cat }}
              </span>
            </div>
          </div>
        </template>

        <!-- ══════════════ ПРОФИЛЬ ══════════════ -->
        <template v-if="section === 'profile'">
          <div class="scab-form-block glass-surface">
            <div class="scab-form-title">Основные данные</div>
            <div class="scab-form-grid">
              <div class="scab-field">
                <label class="scab-lbl">Название *</label>
                <input v-model="form.name" class="glass-input" placeholder="Название магазина" @blur="save" />
              </div>
              <div class="scab-field">
                <label class="scab-lbl">Компания</label>
                <input v-model="form.companyName" class="glass-input" placeholder="ООО / ИП..." @blur="save" />
              </div>
              <div class="scab-field">
                <label class="scab-lbl">Контактное лицо</label>
                <input v-model="form.contactPerson" class="glass-input" placeholder="ФИО менеджера" @blur="save" />
              </div>
              <div class="scab-field">
                <label class="scab-lbl">Телефон</label>
                <input v-model="form.phone" class="glass-input" placeholder="+7 (___) ___-__-__"
                  @input="formatPhone" @blur="save" />
              </div>
              <div class="scab-field">
                <label class="scab-lbl">Email</label>
                <input v-model="form.email" type="email" class="glass-input" placeholder="mail@example.com" @blur="save" />
              </div>
              <div class="scab-field">
                <label class="scab-lbl">Telegram</label>
                <input v-model="form.telegram" class="glass-input" placeholder="@username" @blur="save" />
              </div>
              <div class="scab-field">
                <label class="scab-lbl">WhatsApp</label>
                <input v-model="form.whatsapp" class="glass-input" placeholder="+7..." @blur="save" />
              </div>
              <div class="scab-field">
                <label class="scab-lbl">Сайт</label>
                <input v-model="form.website" class="glass-input" placeholder="https://..." @blur="save" />
              </div>
              <div class="scab-field">
                <label class="scab-lbl">Город</label>
                <input v-model="form.city" class="glass-input" placeholder="Москва" @blur="save" />
              </div>
              <div class="scab-field">
                <label class="scab-lbl">Мессенджер</label>
                <select v-model="form.messenger" class="glass-input" @change="save">
                  <option value="">—</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Telegram">Telegram</option>
                  <option value="Viber">Viber</option>
                </select>
              </div>
              <div class="scab-field">
                <label class="scab-lbl">Ник мессенджера</label>
                <input v-model="form.messengerNick" class="glass-input" placeholder="@username или номер" @blur="save" />
              </div>
              <div class="scab-field">
                <label class="scab-lbl">Статус</label>
                <select v-model="form.status" class="glass-input" @change="save">
                  <option value="active">Активный</option>
                  <option value="inactive">Неактивный</option>
                  <option value="potential">Потенциальный</option>
                </select>
              </div>
              <div class="scab-field">
                <label class="scab-lbl">Тип</label>
                <select v-model="form.type" class="glass-input" @change="save">
                  <option value="link">Ссылка (для клиентов)</option>
                  <option value="marketplace">Партнёр (маркетплейс)</option>
                </select>
              </div>
            </div>

            <!-- Категории -->
            <div class="scab-field scab-field--full">
              <label class="scab-lbl">Категории товаров</label>
              <div class="scab-cats-picker">
                <label v-for="c in CATEGORIES" :key="c.key" class="scab-cat-chip"
                  :class="{ 'scab-cat-chip--on': form.categories.includes(c.key) }">
                  <input type="checkbox" :value="c.key" v-model="form.categories" @change="save" style="display:none" />
                  {{ c.label }}
                </label>
              </div>
            </div>

            <!-- Примечания -->
            <div class="scab-field scab-field--full">
              <label class="scab-lbl">Примечания</label>
              <textarea v-model="form.notes" class="glass-input scab-ta" rows="3" placeholder="Особые условия, важные заметки..." @blur="save" />
            </div>
          </div>
        </template>

        <!-- ══════════════ РЕКВИЗИТЫ ══════════════ -->
        <template v-if="section === 'requisites'">
          <div class="scab-form-block glass-surface">
            <div class="scab-form-title">Реквизиты</div>
            <div class="scab-form-grid">
              <div v-for="field in REQ_FIELDS" :key="field.key" class="scab-field">
                <label class="scab-lbl">{{ field.label }}</label>
                <input v-model="form.requisites[field.key]" class="glass-input" :placeholder="field.placeholder" @blur="save" />
              </div>
            </div>
          </div>
        </template>

        <!-- ══════════════ УСЛОВИЯ ══════════════ -->
        <template v-if="section === 'conditions'">
          <div class="scab-form-block glass-surface">
            <div class="scab-form-title">Условия сотрудничества</div>
            <textarea v-model="form.conditions" class="glass-input scab-ta scab-ta--lg" rows="10"
              placeholder="Условия оплаты, скидки, сроки поставки, особые договорённости..." @blur="save" />
          </div>
        </template>

        <!-- ══════════════ ПРОЕКТЫ ══════════════ -->
        <template v-if="section === 'projects'">
          <div class="scab-form-block glass-surface">
            <div class="scab-form-title">Связанные проекты</div>
            <div v-if="!seller.linkedProjects?.length" class="scab-empty">Проекты не привязаны</div>
            <div v-else class="scab-proj-list">
              <NuxtLink
                v-for="p in seller.linkedProjects"
                :key="p.id"
                :to="`/admin/projects/${p.slug}`"
                class="scab-proj-row glass-card"
              >
                <span class="scab-proj-title">{{ p.title || p.slug }}</span>
                <span class="scab-proj-status">{{ STATUS_LABELS[p.status] ?? p.status }}</span>
              </NuxtLink>
            </div>
          </div>
        </template>

      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ sellerId: number }>()

const NAV = [
  { key: 'overview',    label: 'Обзор' },
  { key: 'profile',     label: 'Профиль' },
  { key: 'requisites',  label: 'Реквизиты' },
  { key: 'conditions',  label: 'Условия' },
  { key: 'projects',    label: 'Проекты' },
]

const CATEGORIES = [
  { key: 'finish',    label: 'Отделочные материалы' },
  { key: 'plumbing',  label: 'Сантехника' },
  { key: 'electrical',label: 'Электрика' },
  { key: 'lighting',  label: 'Освещение' },
  { key: 'furniture', label: 'Мебель' },
  { key: 'textile',   label: 'Текстиль' },
  { key: 'decor',     label: 'Декор' },
  { key: 'windows',   label: 'Двери и окна' },
  { key: 'climate',   label: 'Климат (кондиционеры)' },
  { key: 'kitchen',   label: 'Кухни' },
  { key: 'bathroom',  label: 'Ванные комнаты' },
  { key: 'flooring',  label: 'Напольные покрытия' },
  { key: 'paint',     label: 'Краски и покрытия' },
  { key: 'other',     label: 'Прочее' },
]

const REQ_FIELDS = [
  { key: 'inn',       label: 'ИНН',         placeholder: '7700000000' },
  { key: 'ogrn',      label: 'ОГРН',        placeholder: '1000000000000' },
  { key: 'kpp',       label: 'КПП',         placeholder: '770000000' },
  { key: 'legalName', label: 'Юр. название', placeholder: 'ООО «Компания»' },
  { key: 'address',   label: 'Юр. адрес',   placeholder: 'г. Москва, ул...' },
  { key: 'bank',      label: 'Банк',        placeholder: 'АО «Альфа-Банк»' },
  { key: 'bik',       label: 'БИК',         placeholder: '044525593' },
  { key: 'account',   label: 'Расчётный счёт', placeholder: '40702810...' },
  { key: 'corAccount',label: 'Корр. счёт',  placeholder: '30101810...' },
]

const TYPE_LABELS: Record<string, string>   = { marketplace: 'Партнёр', link: 'Ссылка' }
const STATUS_LABELS: Record<string, string> = { lead: 'Лид', brief: 'Бриф', contract: 'Договор', active: 'Активен', paused: 'Пауза', completed: 'Завершён' }

const section = ref('overview')
const savedAt = ref('')
let savedTimer: ReturnType<typeof setTimeout> | null = null

const { data: seller, pending, refresh } = await useFetch<any>(() => `/api/sellers/${props.sellerId}`, { server: false })

const form = reactive({
  name:         '',
  companyName:  '',
  contactPerson:'',
  phone:        '',
  email:        '',
  telegram:     '',
  whatsapp:     '',
  website:      '',
  city:         '',
  messenger:    '',
  messengerNick:'',
  categories:   [] as string[],
  requisites:   {} as Record<string, string>,
  conditions:   '',
  notes:        '',
  status:       'active',
  type:         'link',
})

watch(seller, (s) => {
  if (!s) return
  form.name          = s.name          ?? ''
  form.companyName   = s.companyName   ?? ''
  form.contactPerson = s.contactPerson ?? ''
  form.phone         = s.phone         ?? ''
  form.email         = s.email         ?? ''
  form.telegram      = s.telegram      ?? ''
  form.whatsapp      = s.whatsapp      ?? ''
  form.website       = s.website       ?? ''
  form.city          = s.city          ?? ''
  form.messenger     = s.messenger     ?? ''
  form.messengerNick = s.messengerNick ?? ''
  form.categories    = Array.isArray(s.categories) ? [...s.categories] : []
  form.requisites    = s.requisites    ? { ...s.requisites } : {}
  form.conditions    = s.conditions    ?? ''
  form.notes         = s.notes         ?? ''
  form.status        = s.status        ?? 'active'
  form.type          = s.type          ?? 'link'
}, { immediate: true })

async function save() {
  await $fetch(`/api/sellers/${props.sellerId}`, { method: 'PUT', body: { ...form } })
  if (seller.value) Object.assign(seller.value, form)
  savedAt.value = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (savedTimer) clearTimeout(savedTimer)
  savedTimer = setTimeout(() => { savedAt.value = '' }, 4000)
}

function formatPhone(e: Event) {
  const input = e.target as HTMLInputElement
  let v = input.value.replace(/\D/g, '')
  if (v.startsWith('8')) v = '7' + v.slice(1)
  if (!v.startsWith('7')) v = '7' + v
  v = v.slice(0, 11)
  let result = '+7'
  if (v.length > 1) result += ' (' + v.slice(1, 4)
  if (v.length >= 4) result += ') ' + v.slice(4, 7)
  if (v.length >= 7) result += '-' + v.slice(7, 9)
  if (v.length >= 9) result += '-' + v.slice(9, 11)
  form.phone = result
  input.value = result
}
</script>

<style scoped>
.scab-wrap { display: flex; flex-direction: column; }
.scab-body { display: flex; gap: 20px; align-items: flex-start; }

.scab-sidebar { width: 180px; flex-shrink: 0; border-radius: 14px; padding: 10px; }
.scab-nav { display: flex; flex-direction: column; gap: 2px; }
.scab-nav-item { text-align: left; padding: 8px 12px; border-radius: 8px; background: transparent; border: none; cursor: pointer; font-size: .78rem; color: inherit; opacity: .65; transition: background .12s, opacity .12s; width: 100%; }
.scab-nav-item:hover { background: color-mix(in srgb, var(--glass-text) 6%, transparent); opacity: 1; }
.std-nav-item--active { background: color-mix(in srgb, var(--glass-text) 10%, transparent) !important; opacity: 1 !important; font-weight: 600; }

.scab-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.scab-section-head { display: flex; align-items: center; gap: 10px; padding-bottom: 12px; }
.scab-section-title { font-size: .9rem; font-weight: 700; }
.scab-status-dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-active   { background: #10b981; }
.dot-inactive { background: #94a3b8; }
.dot-potential { background: #f59e0b; }
.scab-saved { font-size: .7rem; color: #10b981; margin-left: auto; }

/* Form */
.scab-form-block { border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.scab-form-title { font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .1em; opacity: .45; }
.scab-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; }
@media (max-width: 700px) { .scab-form-grid { grid-template-columns: 1fr; } }

.scab-field { display: flex; flex-direction: column; gap: 5px; }
.scab-field--full { grid-column: 1 / -1; }
.scab-lbl { font-size: .64rem; text-transform: uppercase; letter-spacing: .08em; opacity: .45; }
.scab-ta { resize: vertical; min-height: 60px; }
.scab-ta--lg { min-height: 160px; }

.scab-cats-picker { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 4px; }
.scab-cat-chip { font-size: .7rem; padding: 4px 10px; border-radius: 20px; cursor: pointer; border: 1px solid var(--glass-border); background: color-mix(in srgb, var(--glass-text) 5%, transparent); transition: all .12s; user-select: none; }
.scab-cat-chip:hover { background: color-mix(in srgb, var(--glass-text) 10%, transparent); }
.scab-cat-chip--on { background: color-mix(in srgb, #6366f1 15%, transparent); border-color: rgba(99,102,241,.5); color: #6366f1; font-weight: 600; }

/* Overview */
.scab-overview-stats { display: flex; gap: 12px; flex-wrap: wrap; }
.scov-stat { border-radius: 12px; padding: 14px 18px; flex: 1; min-width: 100px; }
.scov-stat-val { font-size: 1.2rem; font-weight: 700; }
.scov-stat-lbl { font-size: .65rem; opacity: .5; text-transform: uppercase; letter-spacing: .06em; margin-top: 2px; }

.scov-info-grid { border-radius: 14px; padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
.scov-info-row { display: flex; gap: 12px; align-items: baseline; font-size: .8rem; }
.scov-lbl { min-width: 140px; font-size: .68rem; opacity: .45; text-transform: uppercase; letter-spacing: .06em; }
.scov-link { color: #6366f1; text-decoration: none; }
.scov-link:hover { text-decoration: underline; }

.scov-cats-block { border-radius: 14px; padding: 16px 20px; }
.scov-cats-title { font-size: .68rem; text-transform: uppercase; letter-spacing: .08em; opacity: .45; margin-bottom: 10px; }
.scov-cats { display: flex; flex-wrap: wrap; gap: 6px; }
.scov-cat-tag { font-size: .7rem; padding: 4px 10px; border-radius: 20px; background: color-mix(in srgb, var(--glass-text) 7%, transparent); border: 1px solid var(--glass-border); }

/* Projects */
.scab-empty { font-size: .78rem; opacity: .4; padding: 20px 0; text-align: center; }
.scab-proj-list { display: flex; flex-direction: column; gap: 8px; }
.scab-proj-row { padding: 12px 16px; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; text-decoration: none; color: inherit; font-size: .8rem; cursor: pointer; }
.scab-proj-row:hover { transform: translateY(-1px); }
.scab-proj-title { font-weight: 500; }
.scab-proj-status { font-size: .68rem; opacity: .5; }
</style>
