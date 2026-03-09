---
mode: 'agent'
description: 'Создать новый Vue компонент для admin-панели'
---

# Новый Vue компонент

## Правила

- Файл: `app/components/Admin{Name}.vue`
- `<script setup lang="ts">` — только Composition API
- CSS только через глобальные примитивы из `main.css` (`glass-card`, `a-btn-sm`, `u-field`, etc.)
- Тёмная тема: `html.dark .class { }` — не `@media prefers-color-scheme`
- Строки интерфейса — на русском

## Структура компонента

```vue
<template>
  <div class="glass-card">
    <!-- контент -->
  </div>
</template>

<script setup lang="ts">
// props / emits / composables
</script>

<style scoped>
/* только уникальные стили, не дублируй глобальные примитивы */
</style>
```

## Запрос

Создай компонент: ${input:name:Admin___}

Описание: ${input:description:что делает компонент}
