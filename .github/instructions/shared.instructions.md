---
applyTo: "shared/types/**,shared/constants/**,shared/utils/**"
---

# Shared — общие типы, константы, утилиты

> Код в `shared/` доступен и на клиенте и на сервере.

## Структура

```
shared/
  types/        — TypeScript интерфейсы и типы
  constants/    — Константы (pages.ts, profile-fields.ts)
  utils/        — Утилиты без side-effects
```

## Типы — паттерн

```ts
// shared/types/project.ts
export interface Project {
  id: number
  slug: string
  name: string
  status: ProjectStatus
  createdAt: string
}

export type ProjectStatus = 'active' | 'archived' | 'draft'

// DTO для создания
export interface CreateProjectDto {
  name: string
  slug: string
  clientId?: number
}
```

## NavigationNode — ключевой тип

```ts
// shared/types/navigation.ts
export interface NavigationNode {
  id: string
  label: string
  type: 'section' | 'page' | 'cabinet'
  children?: NavigationNode[]
  payload?: Record<string, unknown>
}
```

Используется в `AdminNestedNav` и `useAdminNav`. Не менять структуру без обновления обоих файлов.

## Константы — паттерн

```ts
// shared/constants/pages.ts
export const PROJECT_PAGES: ProjectPage[] = [
  { slug: 'first_contact', phase: 0, label: 'Первичный контакт' },
  // ...
]
```

## Правила

- Только чистые типы и константы — никаких импортов Nuxt/Vue/H3
- Нет side-effects — код должен работать в любом окружении
- Типы экспортировать именованно (не `export default`)
- DTO (Data Transfer Objects) именовать с суффиксом `Dto`
- Enum-подобные типы — через `type X = 'a' | 'b'` (не `enum`)

## ЗАПРЕЩЕНО

- ❌ Импорты из `vue`, `nuxt`, `h3` в `shared/`
- ❌ `enum` — используй `type X = 'a' | 'b' | 'c'`
- ❌ Классы — только интерфейсы и типы
- ❌ Бизнес-логика с side-effects
