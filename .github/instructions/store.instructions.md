---
applyTo: "app/stores/**,app/composables/**"
---

# Main App State — composables-first, не Pinia-first

> Источник истины: `docs/rag/PINIA_STORES.md` полезен как reference, но в **основной платформе** состояние сейчас живет в `app/composables/**` и `useState()`. `app/stores/` в репозитории отсутствует.

## Текущий контракт

- Для main app по умолчанию создавать composable, а не Pinia store.
- `useState()` использовать для cross-page / shell-level state с устойчивым ключом.
- Local component state оставлять локальным (`ref`, `computed`), если он не нужен между страницами/слоями.
- `messenger/web` — отдельный контур со своими state правилами; этот файл описывает `app/composables/**` основной платформы.

## Канонический паттерн composable

```ts
export function useFeatureState() {
  const items = useState<string[]>('feature-items', () => [])
  const pending = useState<boolean>('feature-pending', () => false)

  async function refresh() {
    pending.value = true
    try {
      items.value = await $fetch('/api/feature')
    } finally {
      pending.value = false
    }
  }

  return {
    items,
    pending,
    refresh,
  }
}
```

## Реальные ориентиры в репо

- `useAdminNav.ts` — глобальная навигация и shell state
- `useDesignSystem.ts` / `useUITheme.ts` — theme/design runtime
- `useProjectCommunicationsBootstrap.ts` — bootstrap для project communications
- `useStandaloneCommunicationsBootstrap.ts` — bootstrap встроенного standalone chat
- `useWipe2.ts` — пример composable с `useState()`-контрактом

## Правила

- Именовать composable через `useXxx`.
- Ключи `useState()` делать стабильными и уникальными по продуктовой сущности.
- Fetch/auth logic для SSR-защищенных внутренних API делать осторожно: при server-side выполнении, где нужно, использовать request-bound fetch подходы.
- Не размазывать одну и ту же shared state модель по нескольким несогласованным composables.
- Если нужен единый source of truth, сначала проверь `shared/constants/**` и существующие composables.

## Когда Pinia допустима

- Только если задача явно требует внедрить store-layer в основной платформе.
- Если Pinia все-таки вводится, использовать Setup Store и не смешивать его с Options Store legacy-подходом.

## Запрещено

- ❌ создавать `app/stores/*` по инерции, игнорируя текущий composables-first контракт
- ❌ использовать `localStorage` напрямую вне специальных theme/design helpers
- ❌ плодить параллельные state-модели для одного и того же shell/flow
- ❌ делать composable просто прокладкой без state/behavior, если достаточно pure helper в `shared/utils/**`
