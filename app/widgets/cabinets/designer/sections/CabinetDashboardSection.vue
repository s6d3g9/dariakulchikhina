<template>
  <div class="cab-section" data-section="dashboard">
    <section v-if="showBrutalistHero" class="ds-cab-hero">
      <div class="ds-cab-hero-topline">дизайнерский кабинет</div>
      <div class="ds-cab-hero-grid">
        <div class="ds-cab-hero-main">
          <div class="ds-cab-hero-avatar">{{ designer?.name?.charAt(0)?.toUpperCase() || '◑' }}</div>
          <div class="ds-cab-hero-copy">
            <h2 class="ds-cab-hero-title">{{ designer?.name }}</h2>
            <p class="ds-cab-hero-subtitle">{{ heroSubtitle }}</p>
          </div>
        </div>
        <div class="ds-cab-hero-facts">
          <div v-for="fact in dashboardFacts" :key="fact.label" class="ds-cab-hero-fact">
            <span class="ds-cab-hero-fact-label">{{ fact.label }}</span>
            <span class="ds-cab-hero-fact-value">{{ fact.value }}</span>
          </div>
        </div>
      </div>
    </section>

    <div v-if="!showBrutalistHero" class="dash-welcome glass-surface">
      <div class="dash-welcome-left">
        <div class="dash-avatar">{{ designer?.name?.charAt(0)?.toUpperCase() || '◑' }}</div>
        <div>
          <div class="dash-welcome-name">{{ designer?.name }}</div>
          <div class="dash-welcome-role">
            Дизайнер интерьеров
            <span v-if="designer?.city"> · {{ designer.city }}</span>
          </div>
        </div>
      </div>
      <div class="dash-profile-progress">
        <div class="dash-profile-pct-ring" :style="{ '--pct': profilePct }">
          <span class="dash-profile-pct-val">{{ profilePct }}%</span>
        </div>
        <div class="dash-profile-progress-info">
          <span class="dash-profile-progress-label">Профиль заполнен</span>
          <button v-if="profilePct < 100" class="dash-profile-fill-btn" @click="emit('navigate', 'profile')">Заполнить →</button>
        </div>
      </div>
    </div>

    <div v-show="!showAll" class="dash-quick-nav" :class="{ 'dash-quick-nav--brutalist': isBrutalist }">
      <button class="dash-quick-btn glass-surface" :class="{ 'dash-quick-btn--brutalist': isBrutalist }" @click="emit('navigate', 'services')">
        <span class="dash-quick-icon">◎</span>
        <span class="dash-quick-label">Услуги и цены</span>
        <span v-if="servicesCount" class="dash-quick-badge">{{ servicesCount }}</span>
      </button>
      <button class="dash-quick-btn glass-surface" :class="{ 'dash-quick-btn--brutalist': isBrutalist }" @click="emit('navigate', 'packages')">
        <span class="dash-quick-icon">◑</span>
        <span class="dash-quick-label">Пакеты</span>
        <span v-if="packagesCount" class="dash-quick-badge">{{ packagesCount }}</span>
      </button>
      <button class="dash-quick-btn glass-surface" :class="{ 'dash-quick-btn--brutalist': isBrutalist }" @click="emit('navigate', 'subscriptions')">
        <span class="dash-quick-icon">⟳</span>
        <span class="dash-quick-label">Подписки</span>
        <span v-if="subscriptionsCount" class="dash-quick-badge">{{ subscriptionsCount }}</span>
      </button>
      <button class="dash-quick-btn glass-surface" :class="{ 'dash-quick-btn--brutalist': isBrutalist }" @click="emit('navigate', 'projects')">
        <span class="dash-quick-icon">◒</span>
        <span class="dash-quick-label">Проекты</span>
        <span v-if="projectsCount" class="dash-quick-badge">{{ projectsCount }}</span>
      </button>
      <button class="dash-quick-btn glass-surface" :class="{ 'dash-quick-btn--brutalist': isBrutalist }" @click="emit('navigate', 'profile')">
        <span class="dash-quick-icon">◓</span>
        <span class="dash-quick-label">Профиль</span>
      </button>
    </div>

    <div class="dash-stats" :class="{ 'dash-stats--brutalist': isBrutalist }">
      <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalist }">
        <div class="dash-stat-val">{{ stats.active }}</div>
        <div class="dash-stat-label">Активных проектов</div>
      </div>
      <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalist }">
        <div class="dash-stat-val">{{ uniqueClientsCount }}</div>
        <div class="dash-stat-label">Клиентов</div>
      </div>
      <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalist }">
        <div class="dash-stat-val">{{ uniqueContractorsCount }}</div>
        <div class="dash-stat-label">Подрядчиков</div>
      </div>
      <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalist }">
        <div class="dash-stat-val">{{ sellersCount }}</div>
        <div class="dash-stat-label">Поставщиков</div>
      </div>
      <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalist }">
        <div class="dash-stat-val">{{ stats.totalRevenue.toLocaleString('ru-RU') }} ₽</div>
        <div class="dash-stat-label">Общая выручка</div>
      </div>
      <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalist }">
        <div class="dash-stat-val">{{ stats.total ? Math.round(stats.totalRevenue / stats.total).toLocaleString('ru-RU') : 0 }} ₽</div>
        <div class="dash-stat-label">Ср. стоимость проекта</div>
      </div>
      <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalist }">
        <div class="dash-stat-val">{{ servicesCount }}</div>
        <div class="dash-stat-label">Услуг настроено</div>
      </div>
      <div class="dash-stat glass-surface" :class="{ 'dash-stat--brutalist': isBrutalist }">
        <div class="dash-stat-val">{{ packagesCount }}</div>
        <div class="dash-stat-label">Пакетов</div>
      </div>
    </div>

    <div v-if="!servicesCount" class="cab-cta glass-surface" :class="{ 'cab-cta--brutalist': isBrutalist }">
      <div class="cab-cta-icon">💡</div>
      <div>
        <strong>Начните с настройки прайс-листа</strong><br>
        Добавьте свои услуги, пакеты и подписки, чтобы генерировать проекты с автоматическим роадмепом.
      </div>
      <button class="cab-cta-btn" @click="emit('init-from-templates')">Загрузить шаблон цен (Москва)</button>
    </div>

    <div v-if="recentProjects.length" class="dash-projects glass-surface" :class="{ 'dash-projects--brutalist': isBrutalist }">
      <div class="u-section-title">Последние проекты</div>
      <div class="dash-projects-grid">
        <NuxtLink
          v-for="dp in recentProjects"
          :key="dp.id"
          :to="dp.projectSlug ? `/admin/projects/${dp.projectSlug}` : undefined"
          class="dash-project-card"
          :class="{ 'dash-project-card--link': dp.projectSlug, 'dash-project-card--brutalist': isBrutalist }"
        >
          <span class="dash-project-name">{{ dp.projectTitle }}</span>
          <span class="dash-project-status u-status" :class="`u-status--${dp.status}`">
            {{ DESIGNER_PROJECT_STATUS_LABELS[dp.status as keyof typeof DESIGNER_PROJECT_STATUS_LABELS] || dp.status }}
          </span>
          <span v-if="dp.totalPrice" class="dash-project-price">{{ dp.totalPrice.toLocaleString('ru-RU') }} ₽</span>
          <span v-if="dp.area" class="dash-project-area">{{ dp.area }} м²</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DESIGNER_PROJECT_STATUS_LABELS } from '~~/shared/types/designer'

interface DesignerInfo {
  name?: string | null
  city?: string | null
}

interface DashFact {
  label: string
  value: string | number
}

interface DashStats {
  active: number
  total: number
  totalRevenue: number
}

interface RecentProject {
  id: number | string
  projectSlug?: string | null
  projectTitle: string
  status: string
  totalPrice?: number | null
  area?: number | null
}

const props = defineProps<{
  designer: DesignerInfo | null | undefined
  showBrutalistHero: boolean
  heroSubtitle: string
  dashboardFacts: DashFact[]
  profilePct: number
  isBrutalist: boolean
  showAll: boolean
  stats: DashStats
  servicesCount: number
  packagesCount: number
  subscriptionsCount: number
  projectsCount: number
  uniqueClientsCount: number
  uniqueContractorsCount: number
  sellersCount: number
  projects: RecentProject[]
}>()

const emit = defineEmits<{
  navigate: [section: string]
  'init-from-templates': []
}>()

const recentProjects = computed(() => props.projects.slice(0, 6))
</script>
