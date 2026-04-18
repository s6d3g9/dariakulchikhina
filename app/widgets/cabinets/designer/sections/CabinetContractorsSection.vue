<template>
  <div class="cab-section" data-section="contractors">
    <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalist }"><h2>Подрядчики</h2></div>
    <div v-if="contractors.length" class="pivot-list">
      <div
        v-for="c in contractors"
        :key="c.id"
        class="pivot-banner glass-surface"
        :class="{ 'pivot-banner--brutalist': isBrutalist }"
        @click="drillToEntityCabinet('contractors', c.id, c.name)"
      >
        <div class="pivot-banner-left">
          <span class="pivot-banner-name">{{ c.name }}</span>
          <span v-if="c.role" class="pivot-banner-contact">{{ c.role }}</span>
        </div>
        <span class="pivot-banner-arrow">→</span>
      </div>
    </div>
    <div v-else class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalist }"><p>Подрядчиков пока нет. Добавьте подрядчика в проект.</p></div>
  </div>
</template>

<script setup lang="ts">
import { useAdminNav } from '~/entities/admin-navigation/model/useAdminNav'

interface ContractorRow {
  id: number
  name: string
  role: string | null
}

defineProps<{
  contractors: ContractorRow[]
  isBrutalist: boolean
}>()

const { drillToEntityCabinet } = useAdminNav()
</script>
