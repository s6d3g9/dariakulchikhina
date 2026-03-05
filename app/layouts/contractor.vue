<template>
  <div class="contractor-root glass-page">
    <header class="contractor-header glass-surface">
      <div class="contractor-brand">
        <span class="contractor-title">кабинет подрядчика</span>
        <span v-if="contractorName" class="contractor-user-name">{{ contractorName }}</span>
      </div>
      <div class="contractor-actions">
        <div v-if="profilePct < 100" class="contractor-progress" :title="`Профиль заполнен на ${profilePct}%`">
          <div class="contractor-progress-bar">
            <div class="contractor-progress-fill" :style="{ width: profilePct + '%' }" />
          </div>
          <span class="contractor-progress-label">{{ profilePct }}%</span>
        </div>
        <button
          type="button"
          class="contractor-theme-btn"
          @click="toggleTheme"
        >{{ isDark ? 'светло' : 'темно' }}</button>
        <button class="contractor-logout-btn" @click="logout">Выйти</button>
      </div>
    </header>
    <main class="contractor-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const route = useRoute()
const { isDark, toggleTheme } = useThemeToggle()

// Получаем данные текущего авторизованного подрядчика
const { data: meData } = await useFetch<any>('/api/auth/me')
const contractorId = computed(() => meData.value?.contractorId)

const { data: contractor } = await useFetch<any>(
  () => contractorId.value ? `/api/contractors/${contractorId.value}` : '',
  { watch: [contractorId], immediate: true }
)

const contractorName = computed(() => contractor.value?.name || '')

// Процент заполненности профиля
const profilePct = computed(() => {
  const c = contractor.value
  if (!c) return 0
  const fields = [
    c.name, c.phone, c.email,
    c.telegram || c.whatsapp || c.messengerNick,
    c.city,
    c.passportSeries, c.passportNumber,
    c.inn,
    c.workTypes?.length > 0,
    c.roleTypes?.length > 0,
    c.notes,
    c.bankName,
  ]
  const filled = fields.filter(Boolean).length
  return Math.round((filled / fields.length) * 100)
})

async function logout() {
  await $fetch('/api/auth/contractor-logout', { method: 'POST' })
  router.push('/contractor/login')
}
</script>

<style scoped>
.contractor-root {
  --bg: var(--glass-page-bg, #ffffff);
  --border: var(--glass-border, #e6e6e6);
  --title: color-mix(in srgb, var(--glass-text, #888) 55%, transparent);

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.contractor-header {
  border-bottom: 1px solid transparent;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 0 0 16px 16px;
}

.contractor-brand {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.contractor-title {
  font-size: .74rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--title);
}

.contractor-user-name {
  font-size: .82rem;
  font-weight: 600;
  color: var(--glass-text, #1a1a2e);
  opacity: .7;
}

.contractor-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.contractor-progress {
  display: flex;
  align-items: center;
  gap: 6px;
}

.contractor-progress-bar {
  width: 60px;
  height: 4px;
  background: color-mix(in srgb, var(--glass-text, #000) 8%, transparent);
  border-radius: 99px;
  overflow: hidden;
}

.contractor-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--ds-accent, #4a80f0), var(--ds-accent-dark, #6c47ff));
  border-radius: 99px;
  transition: width 0.5s;
}

.contractor-progress-label {
  font-size: .68rem;
  font-weight: 700;
  opacity: .55;
  white-space: nowrap;
}

.contractor-logout-btn {
  font-size: .78rem;
  padding: 5px 14px;
  border-radius: 0;
  border: 1px solid var(--glass-border, rgba(255,255,255,0.3));
  background: none;
  cursor: pointer;
  color: var(--glass-text, #1a1a2e);
  opacity: .6;
  transition: opacity 0.15s;
}
.contractor-logout-btn:hover { opacity: 1; }

.contractor-main {
  flex: 1;
  padding: 24px;
}

.contractor-theme-btn {
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 0;
  color: var(--glass-text, #1a1a1a);
  opacity: .55;
  cursor: pointer;
  font-size: .62rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 3px 8px;
  appearance: none;
  -webkit-appearance: none;
  transition: opacity .15s;
}
.contractor-theme-btn:hover { opacity: 1; }

@media (max-width: 640px) {
  .contractor-header { flex-wrap: wrap; gap: 8px; }
  .contractor-brand { width: 100%; }
  .contractor-progress-bar { width: 40px; }
}
</style>