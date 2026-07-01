/**
 * packages/card-types/_registry.ts
 *
 * Единственное место импорта card-types. Shell и панели ищут card-types
 * только через этот реестр — прямой импорт `packages/card-types/<name>/`
 * из `apps/shell-*` запрещён (см. инвариант I2).
 *
 * Каждый новый card-type:
 *   1. Создаётся как `packages/card-types/<name>/` по шаблону `_template/`.
 *   2. Реализует `instance.view` + `type.view` + 8 panel-providers.
 *   3. Регистрируется здесь.
 *   4. Добавляется в `docs/architecture-v6/06-card-types-matrix.md`.
 *
 * Импорт динамический (lazy): карт-тайпы грузятся по требованию, чтобы
 * shell не тащил все вертикали сразу в бандл.
 */

// NOTE: реальные плагины появляются в Фазе 3. Сейчас — только type-контракт.
// import personProfile from './person-profile'
// import car from './car'
// import realEstate from './real-estate'
// import flightTicket from './flight-ticket'
// ...

export type CardTypeKind = string // в будущем — union из всех зарегистрированных

export interface CardTypeDefinition {
  kind: CardTypeKind
  primitives: readonly string[] // имена сервисов из services/*
  instance: CardTypeView
  type: CardTypeView
  modes?: readonly string[]
  link?: {
    instanceToType?: (instanceId: string) => Promise<string | null>
  }
}

export interface CardTypeView {
  view: () => Promise<unknown>
  top: () => Promise<unknown>
  left: () => Promise<unknown>
  right: () => Promise<unknown>
  bottom: () => Promise<unknown>
}

/**
 * Глобальный реестр card-types. Пуст на Фазе 0 — заполняется по мере появления
 * вертикалей в Фазе 3+.
 */
export const cardTypeRegistry: Record<CardTypeKind, CardTypeDefinition> = {
  // 'person-profile': personProfile,
  // 'car': car,
  // 'flight-ticket': flightTicket,
  // ...
}

/**
 * Поиск card-type по kind. Падает, если не зарегистрирован.
 */
export function resolveCardType(kind: CardTypeKind): CardTypeDefinition {
  const def = cardTypeRegistry[kind]
  if (!def) {
    throw new Error(
      `[card-types] Unknown card-type "${kind}". ` +
        `Register it in packages/card-types/_registry.ts`,
    )
  }
  return def
}

/**
 * Список всех зарегистрированных kind'ов — для switcher и admin-панелей.
 */
export function listCardTypes(): CardTypeKind[] {
  return Object.keys(cardTypeRegistry)
}
