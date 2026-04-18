<template>
  <section v-if="blockers.length" class="cpc-section">
    <div class="cpc-section__head">
      <div>
        <div class="cpc-section__title">Текущие блокеры</div>
        <div class="cpc-section__meta">Что мешает движению</div>
      </div>
    </div>
    <div class="cpc-blocker-list">
      <div
        v-for="(blocker, index) in blockers"
        :key="`client-blocker-${index}`"
        class="cpc-blocker"
      >
        {{ blocker }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  blockers: string[]
}>()
</script>
