<template>
  <div class="esw-wrap">
    <!-- Header-button — always visible -->
    <button class="esw-head" :class="{ 'esw-head--open': open }" @click="open = !open">
      <span class="esw-title">{{ title }}</span>
      <span v-if="count != null && !open" class="esw-count">{{ count }}</span>
      <span class="esw-chevron">›</span>
    </button>

    <!-- Switchable body -->
    <Transition name="esw-fade" mode="out-in">

      <!-- Section picker -->
      <div v-if="open" key="picker" class="esw-picker">
        <NuxtLink
          v-for="s in SECTIONS"
          :key="s.to"
          :to="s.to"
          class="esw-item"
          :class="{ 'esw-item--active': s.label === title }"
          @click="open = false"
        >{{ s.label }}</NuxtLink>
      </div>

      <!-- Normal sidebar content -->
      <div v-else key="content" class="esw-content">
        <slot />
      </div>

    </Transition>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; count?: number | null }>()

const open = ref(false)

const SECTIONS = [
  { label: 'проекты',    to: '/admin' },
  { label: 'клиенты',    to: '/admin/clients' },
  { label: 'дизайнеры',  to: '/admin/designers' },
  { label: 'подрядчики', to: '/admin/contractors' },
  { label: 'поставщики', to: '/admin/sellers' },
  { label: 'галерея',    to: '/admin/gallery' },
  { label: 'документы',  to: '/admin/documents' },
  { label: 'настройки',  to: '/admin/settings' },
]
</script>

<style scoped>
.esw-wrap {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* Header */
.esw-head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  flex-shrink: 0;
}
.esw-title {
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--glass-text);
  flex: 1;
}
.esw-head:hover .esw-title { opacity: .7; }
.esw-count {
  font-size: .66rem;
  color: var(--glass-text);
  opacity: .35;
}
.esw-chevron {
  font-size: .85rem;
  color: var(--glass-text);
  opacity: .25;
  transition: transform .2s, opacity .15s;
}
.esw-head--open .esw-chevron { transform: rotate(90deg); opacity: .55; }

/* Sections */
.esw-picker {
  display: flex;
  flex-direction: column;
  padding: 4px 0 8px;
}
.esw-item {
  display: block;
  padding: 9px 14px;
  font-size: .78rem;
  letter-spacing: .04em;
  color: var(--glass-text);
  text-decoration: none;
  opacity: .4;
  transition: opacity .12s, padding-left .12s;
  white-space: nowrap;
}
.esw-item:hover { opacity: .8; padding-left: 18px; }
.esw-item--active { opacity: 1; font-weight: 600; padding-left: 18px; }

/* Normal content wrapper */
.esw-content {
  display: contents;
}

/* Slide-fade transition */
.esw-fade-enter-active {
  transition: opacity .2s cubic-bezier(.4,0,.2,1), transform .2s cubic-bezier(.4,0,.2,1);
}
.esw-fade-leave-active {
  transition: opacity .12s cubic-bezier(.4,0,.2,1), transform .12s cubic-bezier(.4,0,.2,1);
}
.esw-fade-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(.98);
}
.esw-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(.98);
}
</style>
