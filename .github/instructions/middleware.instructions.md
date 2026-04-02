---
applyTo: "app/middleware/**"
---

# Middleware — Nuxt route guards основной платформы

> Route middleware выполняется до рендера страницы. Здесь держим только auth/canonicalization для `app/**`.

## Текущие middleware-файлы

| Файл | Назначение |
|---|---|
| `admin.ts` | Guard для `/admin/**`; допускает роли `admin` и `designer` |
| `client.ts` | Guard для `/client/**`; допускает admin/designer preview и проверяет slug клиентской сессии |
| `contractor.ts` | Guard для `/contractor/**`; допускает admin/designer preview и канонизирует contractor id |
| `admin-project-canonical.ts` | Переводит `/admin/projects/:numericId` в `/admin/projects/:slug` |

## Канонический паттерн

```ts
export default defineNuxtRouteMiddleware(async (to) => {
  try {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const data = await $fetch<{ role?: string }>('/api/auth/me', { headers })

    if (data?.role !== 'admin' && data?.role !== 'designer') {
      return navigateTo('/admin/login')
    }
  } catch {
    return navigateTo('/admin/login')
  }
})
```

## Правила по ролям

- `admin.ts`: не ограничивать только `designer`; текущий код принимает `admin` **или** `designer`.
- `client.ts`: admin/designer могут открывать client routes как preview; client session должна совпадать с route slug.
- `contractor.ts`: admin/designer могут preview contractor cabinet; contractor session при mismatch уводится на собственный `/contractor/:id`.
- `admin-project-canonical.ts`: это middleware канонизации маршрута, а не auth guard.

## Redirect contract

- Role-specific login pages (`/admin/login`, `/client/login`, `/contractor/login`, `/project/login`) сейчас в основном редиректят в единый auth-flow `/login?role=...`.
- В middleware можно редиректить на alias route, если именно он является текущей точкой входа для пользователя.
- Не использовать `external: true` для внутренних route redirects.

## Правила

- Middleware не должен загружать бизнес-данные сверх auth/canonical checks.
- Для SSR-запросов передавать cookie через `import.meta.server ? useRequestHeaders(['cookie']) : undefined`.
- Любой DOM/browser API только под client guard; обычно route middleware в этом репо в них не нуждается.
- Если задача требует preload данных, выноси это в page/composable, а не в middleware.

## Запрещено

- ❌ превращать middleware в data loader
- ❌ использовать устаревший пример `role === 'designer'` для admin guard
- ❌ хранить токены/секреты в middleware
- ❌ писать business branching, которое должно жить в composable/page shell
