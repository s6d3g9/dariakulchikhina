# Pinia Stores — Паттерны (RAG)

> Источники: pinia.vuejs.org (core-concepts, composing-stores)
> Версия: Pinia 3.0.x + @pinia/nuxt 0.11.x

---

## 1. Определение Store

### Option Store (классический)
```ts
export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'Eduardo'
  }),
  getters: {
    doubleCount: (state) => state.count * 2,
    // getter с аргументом (через замыкание)
    getUserById: (state) => (userId: number) =>
      state.users.find(u => u.id === userId)
  },
  actions: {
    increment() {
      this.count++          // `this` = store instance
    },
    async fetchData() {
      this.data = await api.get('/data')
    }
  }
})
```

### Setup Store (рекомендуется!)
```ts
// app/stores/project.ts
export const useProjectStore = defineStore('project', () => {
  // ref() → state
  const projects = ref<Project[]>([])
  const loading = ref(false)
  const currentId = ref<number | null>(null)

  // computed() → getters
  const currentProject = computed(() =>
    projects.value.find(p => p.id === currentId.value)
  )
  const activeProjects = computed(() =>
    projects.value.filter(p => p.status === 'active')
  )

  // function → actions
  async function fetchProjects() {
    loading.value = true
    try {
      projects.value = await $fetch('/api/projects')
    } finally {
      loading.value = false
    }
  }

  function setCurrentId(id: number) {
    currentId.value = id
  }

  // watch — доступны в setup stores
  watch(currentId, async (newId) => {
    if (newId) await fetchProjectDetails(newId)
  })

  // ОБЯЗАТЕЛЬНО: вернуть всё, что нужно снаружи
  return {
    projects, loading, currentId,
    currentProject, activeProjects,
    fetchProjects, setCurrentId
  }
})
```

### Маппинг: Option → Setup

| Option Store | Setup Store |
|-------------|-------------|
| `state: () => ({})` | `ref()` |
| `getters: {}` | `computed()` |
| `actions: {}` | `function` |
| `this.count` | `count.value` |
| — | `watch()`, `watchEffect()` — можно! |

---

## 2. Использование Store в компонентах

### Базовое
```vue
<script setup>
const store = useProjectStore()

// Реактивный доступ:
store.projects     // state
store.activeCount  // getter
store.fetchAll()   // action
</script>
```

### storeToRefs — КРИТИЧНО для деструктуризации!
```vue
<script setup>
const store = useProjectStore()

// ❌ НЕПРАВИЛЬНО — потеря реактивности:
const { projects, loading } = store

// ✅ ПРАВИЛЬНО — storeToRefs:
const { projects, loading, activeProjects } = storeToRefs(store)

// Actions деструктурируем напрямую (они не реактивные):
const { fetchProjects, setCurrentId } = store
</script>
```

### $reset — сброс состояния (только Option stores)
```ts
const store = useCounterStore()
store.$reset()  // сброс к начальному state
```

### $patch — групповое обновление
```ts
// Объект
store.$patch({
  count: store.count + 1,
  name: 'New Name'
})

// Функция (для массивов!)
store.$patch((state) => {
  state.items.push(newItem)
  state.hasChanged = true
})
```

### $subscribe — подписка на изменения
```ts
store.$subscribe((mutation, state) => {
  // mutation.type: 'direct' | 'patch object' | 'patch function'
  // mutation.storeId: 'counter'
  localStorage.setItem('cart', JSON.stringify(state))
})
```

---

## 3. Composing Stores (вложенные)

### Одна store вызывает другую
```ts
export const useOrderStore = defineStore('order', () => {
  const userStore = useUserStore()    // ← вызываем внутри setup
  const cartStore = useCartStore()

  const canOrder = computed(() =>
    userStore.isLoggedIn && cartStore.items.length > 0
  )

  async function placeOrder() {
    if (!canOrder.value) return
    await $fetch('/api/orders', {
      method: 'POST',
      body: {
        userId: userStore.currentUser.id,
        items: cartStore.items
      }
    })
    cartStore.clearCart()
  }

  return { canOrder, placeOrder }
})
```

### Shared Getters / Actions
```ts
// shared/stores/helpers.ts
export function useSharedFilters(items: Ref<Item[]>) {
  const searchTerm = ref('')

  const filtered = computed(() =>
    items.value.filter(item =>
      item.name.toLowerCase().includes(searchTerm.value.toLowerCase())
    )
  )

  return { searchTerm, filtered }
}

// В store:
export const useProductStore = defineStore('product', () => {
  const products = ref<Product[]>([])
  const { searchTerm, filtered: filteredProducts } = useSharedFilters(products)
  return { products, searchTerm, filteredProducts }
})
```

---

## 4. Правила Pinia в Nuxt

### Auto-import
`@pinia/nuxt` автоматически импортирует:
- `defineStore`
- `storeToRefs`
- Все stores из `stores/` директории

### ⚠️ Нельзя вызывать useStore до await!
```ts
// ❌ НЕПРАВИЛЬНО:
export default defineEventHandler(async (event) => {
  const data = await fetchSomething()
  const store = useMyStore()  // ← После await — currentInstance потерян!
})

// ✅ ПРАВИЛЬНО:
export default defineEventHandler(async (event) => {
  const store = useMyStore()  // ← До await
  const data = await fetchSomething()
  store.setData(data)
})
```

### SSR — store на сервере
```vue
<script setup>
const store = useProjectStore()
// При SSR store состояние сериализуется в __NUXT_STATE__
// и гидратируется на клиенте автоматически
await store.fetchProjects()  // вызвать в setup или useFetch
</script>
```

---

## 5. Типизация

### Type inference
```ts
const store = useProjectStore()
// store автоматически типизирован из return объекта setup функции
store.projects  // Ref<Project[]> → Project[] (auto-unwrap)
```

### Типизация аргументов actions
```ts
export const useProjectStore = defineStore('project', () => {
  async function updateProject(id: number, data: Partial<Project>) {
    await $fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      body: data
    })
  }
  return { updateProject }
})
```

---

## Быстрая шпаргалка

| Задача | Код |
|--------|-----|
| Создать store | `defineStore('name', () => { ... return {} })` |
| State | `const x = ref(initialValue)` |
| Getter | `const y = computed(() => ...)` |
| Action | `function doSomething() { ... }` |
| Деструктуризация state | `const { x } = storeToRefs(store)` |
| Деструктуризация actions | `const { doSomething } = store` |
| Batch update | `store.$patch({ ... })` или `store.$patch(s => { ... })` |
| Подписка | `store.$subscribe((mutation, state) => { ... })` |
| Nested store | `const other = useOtherStore()` внутри setup |
| Watch в store | `watch(ref, callback)` — только в setup stores |
