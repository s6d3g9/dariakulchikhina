<template>
  <div class="esw-root" ref="rootRef">
    <!-- ── Заголовок-кнопка ── -->
    <button
      type="button"
      class="esw-head"
      :class="{ 'esw-head--open': open }"
      @click.stop="open = !open"
    >
      <span class="esw-head-title">{{ title }}</span>
      <span class="esw-head-count" v-if="count !== undefined">{{ count }}</span>
      <svg class="esw-head-arrow" :class="{ 'esw-head-arrow--open': open }"
        width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- ── Поиск (всегда виден) ── -->
    <div class="esw-search-wrap">
      <svg class="esw-search-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="5" cy="5" r="3.5" stroke="currentColor" stroke-width="1.2"/>
        <path d="M8 8l2.5 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <input
        class="esw-search"
        type="search"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        placeholder="поиск..."
        autocomplete="off"
        spellcheck="false"
      />
    </div>

    <!-- ── Выпадающий список разделов ── -->
    <Transition name="esw-drop">
      <nav v-if="open" class="esw-dropdown" @click.stop>
        <component
          :is="item.external ? 'a' : 'button'"
          v-for="item in SECTIONS"
          :key="item.key"
          type="button"
          class="esw-item"
          :class="{ 'esw-item--active': isActive(item) }"
          @click="navigate(item)"
        >{{ item.label }}</component>
      </nav>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  count?: number
  modelValue?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
}>()

const route  = useRoute()
const router = useRouter()
const open   = ref(false)
const rootRef = ref<HTMLElement | null>(null)

// ── Список разделов согласно спецификации ───────────────────────
const SECTIONS = [
  { key: 'projects',     label: 'проекты',     path: '/admin' },
  { key: 'clients',      label: 'клиенты',     path: '/admin/clients' },
  { key: 'contractors',  label: 'подрядчики',  path: '/admin/contractors' },
  { key: 'designers',    label: 'дизайнеры',   path: '/admin/designers' },
  { key: 'sellers',      label: 'поставщики',  path: '/admin/sellers' },
  { key: 'gallery',      label: 'галерея',     path: '/admin/gallery/interiors' },
  { key: 'documents',    label: 'документы',   path: '/admin/documents' },
]

// ── Определяем активный раздел по текущему маршруту ──────────────
function isActive(item: { key: string; path: string }) {
  const p = route.path
  if (item.key === 'projects') return p === '/admin' || p.startsWith('/admin/projects')
  if (item.key === 'gallery')  return p.startsWith('/admin/gallery')
  return p.startsWith(item.path)
}

// ── Запоминаем slug активного проекта из query ──────────────────
const projectSlug = computed(() => {
  const q = route.query.projectSlug
  return Array.isArray(q) ? q[0] : q ?? null
})

// ── Навигация: сохраняем контекст проекта ─────────────────────
function navigate(item: { path: string }) {
  open.value = false
  const target = projectSlug.value
    ? { path: item.path, query: { projectSlug: projectSlug.value } }
    : item.path
  router.push(target)
}

// ── Закрытие по клику вне компонента ────────────────────────────
function onOutsideClick(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false
  }
}
onMounted(() => document.addEventListener('click', onOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', onOutsideClick))
</script>

<style scoped>
/* ── Root ── */
.esw-root {
  position: relative;
  width: 100%;
}

/* ── Header button ── */
.esw-head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: transparent;
  border: none;
  padding: 10px 10px 8px;
  cursor: pointer;
  font-family: var(--ds-font-family, inherit);
  text-align: left;
}
.esw-head-title {
  font-size: .68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--glass-text);
  opacity: .55;
  font-weight: 400;
  flex: 1;
  transition: opacity .15s;
}
.esw-head:hover .esw-head-title,
.esw-head--open .esw-head-title {
  opacity: 1;
}
.esw-head-count {
  font-size: .6rem;
  color: var(--glass-text);
  opacity: .30;
  min-width: 18px;
  text-align: right;
  letter-spacing: 0;
}
.esw-head-arrow {
  color: var(--glass-text);
  opacity: .30;
  flex-shrink: 0;
  transition: transform .15s ease, opacity .15s;
}
.esw-head:hover .esw-head-arrow { opacity: .6; }
.esw-head-arrow--open {
  transform: rotate(180deg);
  opacity: .6;
}

/* ── Search ── */
.esw-search-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}
.esw-search-icon {
  color: var(--glass-text);
  opacity: .30;
  flex-shrink: 0;
}
.esw-search {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--ds-font-family, inherit);
  font-size: .70rem;
  color: var(--glass-text);
  opacity: .55;
  letter-spacing: 0.05em;
  padding: 2px 0;
  width: 100%;
  transition: opacity .15s;
}
.esw-search::placeholder {
  opacity: .40;
  color: var(--glass-text);
}
.esw-search:focus { opacity: 1; }
/* убираем X и иконку лупы из нативного input[type=search] */
.esw-search::-webkit-search-decoration,
.esw-search::-webkit-search-cancel-button { display: none; }

/* ── Dropdown ── */
.esw-dropdown {
  position: relative;
  background: var(--glass-page-bg);
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  z-index: 1;
  padding: 4px 0;
}

/* ── Items ── */
.esw-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 6%, transparent);
  font-family: var(--ds-font-family, inherit);
  font-size: .68rem;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--glass-text);
  opacity: .38;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  transition: opacity .12s;
}
.esw-item:last-child { border-bottom: none; }
.esw-item:hover { opacity: .75; }
.esw-item--active { opacity: 1; }

/* ── Transition ── */
.esw-drop-enter-active,
.esw-drop-leave-active {
  transition: opacity .12s ease, transform .12s ease;
}
.esw-drop-enter-from,
.esw-drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
