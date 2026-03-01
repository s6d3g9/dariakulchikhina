<!--
  AdminNavChipTab
  Кнопка‑таб с текущим кружком и выпадающим меню.
  Props:
    label     — текст кнопки (кликабельная ссылка)
    to        — куда ведёт основная часть кнопки (строка или объект route)
    active    — подсвечивать как активный таб
    chip      — двухбуквенная аббревиатура для кружка (если задана — кружок показывается)
    chipTitle — подсказка над кружком
    items     — массив { label, to, initials?, active? } для меню
-->
<template>
  <div ref="root" class="nct-wrap" :class="{ 'nct-wrap--active': active }">
    <NuxtLink :to="to" class="nct-label admin-tab glass-chip" :class="{ 'admin-tab--active': active }">
      {{ label }}
    </NuxtLink>

    <button
      v-if="chip || items.length"
      type="button"
      class="nct-chip"
      :class="{ 'nct-chip--lit': chip }"
      :title="chipTitle || ''"
      @click.stop="open = !open"
    >{{ chip || '…' }}</button>

    <Teleport to="body">
      <div
        v-if="open"
        class="nct-dropdown glass-surface"
        :style="dropdownStyle"
        @click.stop
      >
        <slot name="menu-header" />
        <button
          v-for="item in items"
          :key="item.label"
          type="button"
          class="nct-option"
          :class="{ 'nct-option--active': item.active }"
          @click="pick(item)"
        >
          <span class="nct-option-ini">{{ item.initials || item.label.slice(0, 2).toUpperCase() }}</span>
          <span class="nct-option-lbl">{{ item.label }}</span>
        </button>
        <div v-if="!items.length" class="nct-empty">нет данных</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
export interface NavChipItem {
  label: string
  to: string | Record<string, unknown>
  initials?: string
  active?: boolean
}

const props = withDefaults(defineProps<{
  label: string
  to: string | Record<string, unknown>
  active?: boolean
  chip?: string
  chipTitle?: string
  items?: NavChipItem[]
}>(), { items: () => [], active: false })

const emit = defineEmits<{ select: [item: NavChipItem] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

/* Position dropdown under the chip button */
const dropdownStyle = ref<Record<string, string>>({})

watch(open, (v) => {
  if (!v || !root.value) return
  const rect = root.value.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 6}px`,
    left: `${rect.left}px`,
    zIndex: '9999',
  }
})

function pick(item: NavChipItem) {
  open.value = false
  emit('select', item)
  navigateTo(item.to as string)
}

function onOutside(e: MouseEvent) {
  if (!open.value) return
  if (root.value && root.value.contains(e.target as Node)) return
  open.value = false
}

const route = useRoute()
watch(() => route.fullPath, () => { open.value = false })
onMounted(() => document.addEventListener('click', onOutside, true))
onBeforeUnmount(() => document.removeEventListener('click', onOutside, true))
</script>

<style scoped>
.nct-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.nct-label {
  /* inherits .admin-tab + .glass-chip from layout */
  text-decoration: none;
}

.nct-chip {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--glass-text);
  font-size: .58rem;
  font-weight: 700;
  letter-spacing: .04em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: .42;
  transition: opacity .15s, background .15s;
  padding: 0;
  flex-shrink: 0;
}
.nct-chip--lit {
  opacity: 1;
  background: var(--glass-bg);
}
.nct-chip:hover { opacity: 1; }

.nct-dropdown {
  min-width: 260px;
  max-height: 340px;
  overflow: auto;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  padding: 6px;
  background: var(--glass-surface-bg, #fff);
  box-shadow: 0 8px 32px rgba(0,0,0,.10);
}

.nct-option {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--glass-text);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  text-align: left;
  cursor: pointer;
}
.nct-option:hover { background: color-mix(in srgb, var(--glass-bg) 85%, transparent); }
.nct-option--active { background: color-mix(in srgb, var(--glass-bg) 94%, transparent); font-weight: 600; }

.nct-option-ini {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  font-size: .58rem;
  font-weight: 700;
  flex-shrink: 0;
}
.nct-option-lbl { font-size: .76rem; }
.nct-empty { font-size: .76rem; color: var(--glass-text); opacity: .4; padding: 10px 8px; }
</style>
