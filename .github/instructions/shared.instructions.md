---
applyTo: "shared/types/**,shared/constants/**,shared/utils/**"
---

# Shared — общие контракты, source-of-truth константы и pure utilities

> Код из `shared/` используется и на клиенте, и на сервере. Он должен оставаться изоморфным и без runtime side-effects.

## Структура

```text
shared/
  types/        — TS + Zod contracts: project, navigation, communications, design-mode, app-catalog, etc.
  constants/    — source-of-truth lists and maps: admin-navigation, pages, design-modes, presets
  utils/        — pure helper modules: project-control, communications-e2ee, status maps, work-status
```

## Реальные домены shared-слоя

- `shared/types/navigation.ts` — navigation contract для `useAdminNav` и sidebar shells
- `shared/types/communications.ts` — E2EE rooms/messages/signals DTOs
- `shared/types/design-mode.ts` + `shared/constants/design-modes.ts` — design mode / concept contracts
- `shared/constants/admin-navigation.ts` — основная source-of-truth карта admin/menu structure
- `shared/constants/pages.ts` — project pages registry
- `shared/utils/project-control*.ts` — project control helpers

## Паттерны

```ts
import { z } from 'zod'

export const ExampleDtoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
})

export type ExampleDto = z.infer<typeof ExampleDtoSchema>

export interface ExampleViewModel {
  id: string
  title: string
}
```

- Zod-схемы в `shared/types/**` допустимы и приветствуются, если контракт реально делится между клиентом и сервером.
- Source-of-truth списки/мапы держать в `shared/constants/**`, а не размножать локальными копиями в composables/components.

## Правила

- Использовать только именованные экспорты.
- Код должен быть pure и безопасным для любого runtime.
- Не привязывать shared-слой к Nuxt/Vue/H3/Node-specific API.
- Enum-подобные наборы значений предпочитать через literal arrays + `z.enum()`/union types.
- Если меняешь navigation/design/pages contract, обновляй все места, которые считают этот файл source of truth.

## Запрещено

- ❌ импорты из `vue`, `nuxt`, `h3` и browser-only API в `shared/`
- ❌ side-effects при импорте файла
- ❌ дублирование navigation/page/design constants локально в feature code
- ❌ `export default` для shared contracts
