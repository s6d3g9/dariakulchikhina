/**
 * packages/shell-panels/types.ts
 *
 * Контракты panel-provider'ов, используемые всеми card-types.
 * Shell не знает про домены — он знает только про эти контракты.
 *
 * См. docs/architecture-v6/05-shell-entity-model.md для полной семантики
 * инверсии instance ⇄ type и как 4 панели перерисовываются.
 */

export type PanelSlot = 'top' | 'left' | 'right' | 'bottom'
export type ViewMode = 'instance' | 'type'
export type EntityMode = 'consumer' | 'provider' | 'creator' | 'marketplace' | string

/**
 * Контекст, который shell передаёт в panel-provider'ы каждого card-type.
 */
export interface PanelContext<TData = unknown> {
  /** kind card-type (car, flight-ticket, pet, …) */
  kind: string
  /** ID экземпляра в instance-view, или ID типа в type-view. */
  entityId: string
  /** Вид — определяет, какую половину panel-providers использовать. */
  view: ViewMode
  /** Подрежим (provider / consumer / creator / marketplace — опционально). */
  mode?: EntityMode
  /** Разрешённая user'у глубина доступа (readonly, edit, admin). */
  access: 'readonly' | 'edit' | 'admin'
  /** Runtime policy-engine decision (см. инвариант I8). */
  policy?: PolicyDecision
  /** Дополнительные данные от card-type (напр. pre-loaded entity). */
  data?: TData
}

export interface PolicyDecision {
  effect: 'allow' | 'distill' | 'deny'
  reason?: string
  /** Для distill — какие поля/секции скрыть или трансформировать. */
  mask?: string[]
}

/**
 * Панель, которую рендерит card-type в конкретном слоте и виде.
 */
export interface PanelProvider<TProps = unknown> {
  slot: PanelSlot
  view: ViewMode
  /** Lazy-loaded renderer-specific component. */
  component: () => Promise<{ default: unknown }>
  /** Какие данные/события предвыбрать перед рендером. */
  prefetch?: (ctx: PanelContext) => Promise<TProps>
}

/**
 * Helper для card-type автора — собирает 8 panel-providers в описание.
 */
export function definePanels<T = unknown>(panels: {
  top: { instance: PanelProvider<T>; type: PanelProvider<T> }
  left: { instance: PanelProvider<T>; type: PanelProvider<T> }
  right: { instance: PanelProvider<T>; type: PanelProvider<T> }
  bottom: { instance: PanelProvider<T>; type: PanelProvider<T> }
}): typeof panels {
  return panels
}
