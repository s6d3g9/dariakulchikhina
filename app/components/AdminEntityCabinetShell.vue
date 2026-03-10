<template>
  <div class="admin-entity-cabinet-shell">
    <AdminEntityHero
      v-if="showHero"
      :kicker="kicker"
      :title="title"
      :facts="facts"
      :meta-columns="metaColumns"
    >
      <template v-if="$slots.heroActions" #actions>
        <slot name="heroActions" />
      </template>
    </AdminEntityHero>

    <AdminEntityHeader v-else :title="title">
      <template v-if="$slots.headerActions" #actions>
        <slot name="headerActions" />
      </template>
    </AdminEntityHeader>

    <section class="admin-entity-cabinet-shell__body" :class="{ 'admin-entity-cabinet-shell__body--brutalist': brutalist }">
      <slot />
    </section>
  </div>
</template>

<script setup lang="ts">
type HeroFact = {
  label: string
  value: string
}

withDefaults(defineProps<{
  showHero: boolean
  title: string
  kicker: string
  facts?: HeroFact[]
  metaColumns?: number
  brutalist?: boolean
}>(), {
  facts: () => [],
  metaColumns: 3,
  brutalist: false,
})
</script>

<style scoped>
.admin-entity-cabinet-shell__body--brutalist {
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  padding-top: 18px;
}
</style>