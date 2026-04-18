<template>
  <div class="cab-section" data-section="sellers">
    <div class="u-section-title" :class="{ 'ds-section-head--brutalist': isBrutalist }"><h2>Продавцы / Поставщики</h2></div>
    <div v-if="sellers.length" class="pivot-list">
      <div
        v-for="s in sellers"
        :key="s.id"
        class="pivot-banner glass-surface"
        :class="{ 'pivot-banner--brutalist': isBrutalist }"
        @click="drillToEntityCabinet('sellers', s.id, s.name)"
      >
        <div class="pivot-banner-left">
          <span class="pivot-banner-name">{{ s.name }}</span>
          <span v-if="s.companyName" class="pivot-banner-contact">{{ s.companyName }}</span>
          <span v-if="s.phone || s.email" class="pivot-banner-contact">
            {{ [s.phone, s.email].filter(Boolean).join(' / ') }}
          </span>
          <span v-if="s.city" class="pivot-banner-contact">{{ s.city }}</span>
        </div>
        <div class="pivot-banner-right">
          <span class="pivot-banner-count">{{ s.projects.length }} {{ pluralProjects(s.projects.length) }}</span>
          <span class="pivot-banner-arrow">→</span>
        </div>
      </div>
    </div>
    <div v-else class="u-empty glass-surface" :class="{ 'u-empty--brutalist': isBrutalist }"><p>Поставщиков пока нет.</p></div>
  </div>
</template>

<script setup lang="ts">
import { useAdminNav } from '~/entities/admin-navigation/model/useAdminNav'
import { pluralProjects } from '../model/cabinet-formatters'

interface SellerRow {
  id: number
  name: string
  companyName?: string | null
  phone?: string | null
  email?: string | null
  city?: string | null
  projects: unknown[]
}

defineProps<{
  sellers: SellerRow[]
  isBrutalist: boolean
}>()

const { drillToEntityCabinet } = useAdminNav()
</script>
