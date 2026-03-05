# Vue 3 + Nuxt — Official Patterns (RAG)

> Источник: vuejs.org (SFC CSS Features, Composables, Performance, Class/Style Bindings)
> Версия: Vue 3.4+, Nuxt 4.x

---

## 1. SFC CSS Features

### Scoped CSS
```vue
<style scoped>
.example { color: red; }
</style>
```
- Компиляция: `.example[data-v-xxxxxxxx] { color: red; }`
- Дочерние компоненты **не** затрагиваются (кроме root-элемента дочернего).
- ID-селекторы и classы работают одинаково по скорости в scoped.

### :deep() — стилизация дочерних компонентов
```vue
<style scoped>
.a :deep(.b) { /* ... */ }
</style>
```
Компилируется в: `.a[data-v-xxx] .b { ... }`

### :slotted() — стилизация слотового контента
```vue
<style scoped>
:slotted(div) { color: red; }
</style>
```

### :global() — глобальное правило внутри scoped
```vue
<style scoped>
:global(.red) { color: red; }
</style>
```

### CSS Modules
```vue
<template>
  <p :class="$style.red">Hello</p>
</template>
<style module>
.red { color: red; }
</style>
```
- Именованные модули: `<style module="classes">` → `classes.red`
- Composable: `useCssModule('classes')`

### v-bind() в CSS — РЕАКТИВНЫЕ ТОКЕНЫ
```vue
<script setup>
const theme = ref({ color: 'red' })
</script>
<style scoped>
p { color: v-bind('theme.color'); }
</style>
```
- Компилируется в хэшированную CSS custom property.
- Применяется через inline styles на root-элемент.
- **Реактивно обновляется** при изменении ref.
- Синтаксис: `v-bind('выражение')` (кавычки обязательны для точечной нотации).

---

## 2. Composables — Best Practices

### Соглашения
| Правило | Описание |
|---------|----------|
| Именование | `use*` (camelCase): `useFeatureX()` |
| Вызов | Только в `<script setup>` или `setup()`, **синхронно** |
| Аргументы | Принимать `ref` или plain value; использовать `toValue()` |
| Возврат | ВСЕГДА plain object с `ref`-ами (не `reactive`) |
| Side effects | DOM — в `onMounted`; cleanup — в `onUnmounted` |
| SSR | Помнить о `process.server` / `process.client` |

### Паттерн возврата
```ts
// ✅ Правильно — деструктуризация работает с реактивностью
export function useMouse() {
  const x = ref(0)
  const y = ref(0)
  // ...listeners
  return { x, y }  // plain object с ref
}

// ❌ Неправильно — reactive() теряет реактивность при деструктуризации
export function useMouse() {
  return reactive({ x: 0, y: 0 })
}
```

### toValue() для гибких входов
```ts
import { toValue } from 'vue'

export function useFeature(maybeRefOrGetter) {
  watchEffect(() => {
    const val = toValue(maybeRefOrGetter) // ref | getter | plain → value
  })
}
```

### Ограничения
- **Нельзя** вызывать после `await` в setup (потеря контекста компонента).
- `onMounted`, `onUnmounted` и т.д. — только если composable вызван синхронно в setup.

---

## 3. Performance Best Practices

### Props Stability
- Компонент ре-рендерится когда ЛЮБОЙ prop меняется.
- Стабилизируй пропсы: передавай ID вместо индекса в списках.

```vue
<!-- ❌ Нестабильный prop — index меняется при удалении -->
<ListItem v-for="(item, index) in list" :id="index" />

<!-- ✅ Стабильный prop — id не меняется -->
<ListItem v-for="item in list" :id="item.id" />
```

### v-once — рендер один раз
```vue
<span v-once>{{ expensiveComputation }}</span>
```

### v-memo — кэширование поддеревьев
```vue
<div v-for="item in list" :key="item.id" v-memo="[item.selected]">
  <!-- Ре-рендер только когда item.selected изменился -->
  <p>{{ item.name }}</p>
  <p>{{ item.selected ? '✓' : '' }}</p>
</div>
```

### Computed Stability (v3.4+)
- Computed не тригерит эффекты если новое значение === старое.
- Кэш автоматический.

### Виртуализация больших списков
- Для 1000+ элементов: `vue-virtual-scroller` или `vue-virtual-scroll-grid`.
- Рендерит только видимые элементы.

### shallowRef / shallowReactive
- Для больших неизменяемых объектов: `shallowRef()` — реактивность только на `.value`.
- Не трекает вложенные свойства → быстрее для деревьев данных.

### Избегай лишних абстракций
- Не создавай wrapper-компоненты "для красоты" — каждый компонент = стоимость.
- Renderless components допустимы, но не злоупотребляй.

---

## 4. Class & Style Bindings

### Object Syntax
```vue
<div :class="{ active: isActive, 'text-danger': hasError }"></div>
```

### Array Syntax
```vue
<div :class="[activeClass, errorClass]"></div>
<div :class="[isActive ? activeClass : '', errorClass]"></div>
<div :class="[{ active: isActive }, errorClass]"></div>
```

### Computed Class Object
```ts
const classObject = computed(() => ({
  active: isActive.value && !error.value,
  'text-danger': error.value?.type === 'fatal'
}))
```
```vue
<div :class="classObject"></div>
```

### Binding на компоненты
- Если компонент имеет один root-элемент, class прокидывается автоматически.
- Мержится с существующими классами компонента.
- `$attrs.class` для ручного контроля в multi-root компоненте.

### Inline Styles
```vue
<div :style="{ color: activeColor, fontSize: fontSize + 'px' }"></div>
<div :style="[baseStyles, overridingStyles]"></div>
```
- camelCase и kebab-case поддерживаются.
- Auto-prefixing для вендорных свойств.
- Множественные значения: `:style="{ display: ['-webkit-box', 'flex'] }"` — последнее поддерживаемое.

---

## 5. Nuxt-специфичные паттерны

### Auto-imports
- Composables из `composables/` директории авто-импортируются.
- Компоненты из `components/` авто-регистрируются.
- Utils из `utils/` авто-импортируются.

### Layouts
```vue
<!-- pages/admin.vue -->
<script setup>
definePageMeta({ layout: 'admin' })
</script>
```

### Middleware
```ts
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  if (!useAuth().isAuthenticated) {
    return navigateTo('/login')
  }
})
```

### Data Fetching
```vue
<script setup>
// SSR-friendly, кэшированный
const { data, error } = await useFetch('/api/users')

// Только клиент
const { data } = await useFetch('/api/data', { 
  server: false,
  lazy: true 
})
</script>
```

### Runtime Config
```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    secretKey: '',             // Server only
    public: { apiBase: '' }   // Client + Server
  }
})

// В composable/API
const config = useRuntimeConfig()
config.secretKey       // только на сервере
config.public.apiBase  // везде
```

---

## Быстрая шпаргалка

| Задача | Решение |
|--------|---------|
| Стили дочерних компонентов | `:deep(.class)` в scoped |
| Реактивный CSS-токен | `v-bind('ref.value')` в `<style>` |
| Composable input | `toValue(maybeRef)` |
| Composable return | `{ x: ref(), y: ref() }` plain object |
| Большой список | vue-virtual-scroller |
| Тяжёлые данные | `shallowRef()` |
| Класс по условию | `:class="{ active: isActive }"` |
| Массив классов | `:class="[cls1, cls2]"` |
| Computed класс | `:class="computedObj"` |
| Недорогой skip render | `v-memo="[deps]"` |
