---
applyTo: "app/stores/**,app/composables/**"
---

# Pinia Stores и Composables — паттерны

> Источник истины: `docs/rag/PINIA_STORES.md`

## Стек
Pinia 3.x · @pinia/nuxt · Vue 3 Composition API

## Store — Setup Store (всегда этот паттерн)

```ts
// app/stores/project.ts
export const useProjectStore = defineStore('project', () => {
  // state → ref()
  const items = ref<Project[]>([])
  const loading = ref(false)
  const currentId = ref<number | null>(null)

  // getters → computed()
  const current = computed(() => items.value.find(p => p.id === currentId.value))
  const active = computed(() => items.value.filter(p => p.status === 'active'))

  // actions → async function
  async function fetchAll() {
    loading.value = true
    try {
      items.value = await $fetch('/api/projects')
    } finally {
      loading.value = false
    }
  }

  async function create(data: CreateProjectDto) {
    const created = await $fetch('/api/projects', { method: 'POST', body: data })
    items.value.unshift(created)
    return created
  }

  return { items, loading, currentId, current, active, fetchAll, create }
})
```

## Использование в компоненте

```vue
<script setup lang="ts">
const store = useProjectStore()
const { items, loading } = storeToRefs(store) // реактивно!
// store.fetchAll() — методы напрямую
</script>
```

**Никогда** `store.items` без `storeToRefs` — потеряешь реактивность.

## Composable — паттерн

```ts
// app/composables/useGallery.ts
export function useGallery() {
  const items = ref<GalleryItem[]>([])
  const { data, pending, error, refresh } = useFetch('/api/gallery')

  return { items, pending, error, refresh }
}
```

## $fetch vs useFetch

| | `$fetch` | `useFetch` |
|---|---|---|
| Где | В actions/handlers | В `<script setup>` |
| SSR | Дублирует запрос | Автоматически дедуп |
| Реактивность | Нет | `data`, `pending`, `error` |

## ЗАПРЕЩЕНО

- ❌ Options Store (`defineStore('id', { state, getters, actions })`) — только Setup Store
- ❌ `store.items` без `storeToRefs` в шаблоне
- ❌ `$fetch` в `<script setup>` напрямую — используй `useFetch`
- ❌ Мутировать state напрямую снаружи store — только через actions
- ❌ `localStorage` напрямую — используй `useDesignSystem` для токенов
