<template>
  <div class="ctz-wrap glass-card">
    <div v-if="pending" class="ctz-loading">Загрузка...</div>
    <template v-else-if="sections.length">
      <div v-for="sec in sections" :key="sec.id" class="ctz-section">
        <div class="ctz-section-title">{{ sec.title || sec.heading || '(без названия)' }}</div>
        <div v-if="sec.image" class="ctz-section-img">
          <img :src="resolveImg(sec.image)" :alt="sec.title" />
        </div>
        <ul v-if="sec.questions?.length" class="ctz-list">
          <li v-for="(q, qi) in sec.questions" :key="qi" class="ctz-item">
            <span class="ctz-item-label">{{ q.label }}</span>
            <span v-if="q.type" class="ctz-item-type">{{ typeLabel(q.type) }}</span>
            <div v-if="q.image" class="ctz-item-img">
              <img :src="resolveImg(q.image)" :alt="q.label" />
            </div>
          </li>
        </ul>
      </div>
    </template>
    <div v-else class="ctz-empty">Техническое задание ещё не заполнено</div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

interface Question { label: string; type: string; image?: string }
interface Section { id: string; title: string; heading: string; image?: string; questions: Question[] }

const { data: raw, pending } = await useFetch<any>(
  () => `/api/projects/${props.slug}/page-content?page=tz`,
)

const sections = computed<Section[]>(() => {
  const c = raw.value?.content ?? raw.value ?? {}
  return Array.isArray(c?.sections) ? c.sections : []
})

function resolveImg(img: string) {
  if (!img) return ''
  if (img.startsWith('http') || img.startsWith('/')) return img
  return `/uploads/${img}`
}

function typeLabel(t: string) {
  const map: Record<string, string> = { text: 'текст', select: 'выбор', number: 'число', yesno: 'да/нет' }
  return map[t] || t
}
</script>

<style scoped>
.ctz-wrap { padding: 16px; }
.ctz-loading { font-size: .85rem; color: #999; }
.ctz-empty { font-size: .85rem; color: #999; padding: 20px 0; }

.ctz-section { margin-bottom: 28px; }
.ctz-section-title {
  font-size: .72rem; text-transform: uppercase; letter-spacing: 1px;
  color: var(--glass-text); opacity: .5; margin-bottom: 12px;
  padding-bottom: 8px; border-bottom: 1px solid var(--glass-border);
}
.ctz-section-img { margin-bottom: 12px; }
.ctz-section-img img { max-width: 100%; border-radius: 6px; }

.ctz-list { list-style: none; padding: 0; margin: 0; }
.ctz-item {
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
  padding: 8px 0; border-bottom: 1px solid var(--glass-border);
}
.ctz-item:last-child { border-bottom: none; }
.ctz-item-label { font-size: .85rem; color: var(--glass-text); flex: 1; }
.ctz-item-type {
  font-size: .7rem; color: var(--glass-text); opacity: .4;
  text-transform: uppercase; letter-spacing: .5px;
}
.ctz-item-img { width: 100%; margin-top: 6px; }
.ctz-item-img img { max-width: 200px; border-radius: 4px; }
</style>
