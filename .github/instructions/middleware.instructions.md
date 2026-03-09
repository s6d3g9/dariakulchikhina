---
applyTo: "app/middleware/**"
---

# Middleware — клиентские guard-ы маршрутов

> Nuxt route middleware выполняется до рендера страницы.

## Три роли → три middleware

| Файл | Маршруты | Проверяет |
|---|---|---|
| `admin.ts` | `/admin/**` | `role === 'designer'` |
| `client.ts` | `/project/**` | `role === 'client'` |
| `contractor.ts` | `/contractor/**` | `role === 'contractor'` |

## Паттерн — проверка auth

```ts
// app/middleware/admin.ts
export default defineNuxtRouteMiddleware(async () => {
  try {
    const headers = process.server ? useRequestHeaders(['cookie']) : undefined
    const data = await $fetch<{ role?: string }>('/api/auth/me', { headers })
    if (data?.role !== 'designer') {
      return navigateTo('/admin/login')
    }
  } catch {
    return navigateTo('/admin/login')
  }
})
```

## Подключение к странице

```vue
<!-- app/pages/admin/index.vue -->
<script setup>
definePageMeta({ middleware: 'admin' })
</script>
```

## Правила

- Middleware только проверяет роль — не загружает данные
- При ошибке fetch → всегда редирект на login (не показывать ошибку)
- `process.server` проверка для SSR — передавать cookie заголовки
- Не использовать `navigateTo` с `external: true` для внутренних маршрутов
- Не добавлять бизнес-логику в middleware — только auth проверка

## ЗАПРЕЩЕНО

- ❌ Загружать данные в middleware (только auth check)
- ❌ `window.*` без проверки `process.client`
- ❌ Хранить токены в middleware — только через `/api/auth/me`
