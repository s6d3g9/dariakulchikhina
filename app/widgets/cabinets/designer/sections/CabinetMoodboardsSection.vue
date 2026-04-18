<template>
  <div class="cab-section" data-section="moodboards">
    <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalist }"><h2>Мудборды</h2></div>
    <div v-if="items.length" class="gallery-grid">
      <div
        v-for="g in items"
        :key="g.id"
        class="gallery-card glass-surface"
        :class="{ 'gallery-card--brutalist': isBrutalist }"
      >
        <div v-if="g.image" class="gallery-card-img">
          <img :src="`/uploads/${g.image}`" :alt="g.title" loading="lazy" />
        </div>
        <div class="gallery-card-body">
          <span class="gallery-card-title">{{ g.title }}</span>
          <div v-if="g.tags?.length" class="gallery-card-tags">
            <span v-for="t in g.tags" :key="t" class="gallery-tag">{{ t }}</span>
          </div>
          <span v-if="g.featured" class="gallery-card-feat">Избранное</span>
        </div>
      </div>
    </div>
    <div v-else class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalist }"><p>Мудбордов пока нет.</p></div>
  </div>
</template>

<script setup lang="ts">
interface MoodboardRow {
  id: number
  title: string
  image?: string | null
  tags?: string[] | null
  featured?: boolean | null
}

defineProps<{
  items: MoodboardRow[]
  isBrutalist: boolean
}>()
</script>
