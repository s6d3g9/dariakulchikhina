export const SHELL_UI_CONTRACT_VERSION = '1.0.0' as const

export type ShellViewportMode = 'compact' | 'medium' | 'wide'
export type ShellSideSlot = 'left' | 'right'

export type ShellSurfaceKind =
  | 'navigation-tree'
  | 'persistent-panel'
  | 'command-menu'
  | 'select-listbox'
  | 'context-menu'
  | 'toolbar'
  | 'dialog'
  | 'sheet'
  | 'notification'

export type ShellPersistentSurfaceKind = Extract<
  ShellSurfaceKind,
  'navigation-tree' | 'persistent-panel'
>

export type ShellTransientLayerKind = Extract<
  ShellSurfaceKind,
  'command-menu' | 'select-listbox' | 'context-menu' | 'dialog' | 'sheet' | 'notification'
>

export interface ShellFocusRef {
  kind: string
  id: string
  view: 'instance' | 'type'
  mode?: string
}

export interface ShellNavigationFrame<TContext = Record<string, unknown>> {
  frameId: string
  destinationId: string
  nodeId: string
  label?: string
  href?: string
  focus?: ShellFocusRef
  activeLeafId?: string
  context: TContext
  scrollPosition: number
  filter?: Record<string, unknown>
}

export interface ShellPersistentSurface {
  surfaceId: string
  kind: ShellPersistentSurfaceKind
  slot: ShellSideSlot
  triggerId?: string
  label?: string
}

export interface ShellBottomToolbar {
  surfaceId: string
  kind: 'toolbar'
  slot: 'bottom'
  label?: string
}

export interface ShellLayerDismissPolicy {
  escape: boolean
  outside: boolean
  back: boolean
}

export interface ShellTransientLayer {
  layerId: string
  kind: ShellTransientLayerKind
  triggerId?: string
  label?: string
  modal: boolean
  dismiss: ShellLayerDismissPolicy
}

export interface ShellUiState<TContext = Record<string, unknown>> {
  contractVersion: typeof SHELL_UI_CONTRACT_VERSION
  revision: number
  viewportMode: ShellViewportMode
  navigationStack: Array<ShellNavigationFrame<TContext>>
  persistent: {
    left: ShellPersistentSurface | null
    right: ShellPersistentSurface | null
    bottom: ShellBottomToolbar | null
  }
  transientLayers: ShellTransientLayer[]
  lastInteractedSide: ShellSideSlot | null
  recentCommandIds: string[]
}

interface ShellUiCommandBase {
  commandId: string
}

export type ShellUiCommand<TContext = Record<string, unknown>> =
  | (ShellUiCommandBase & {
      type: 'viewport.set'
      mode: ShellViewportMode
    })
  | (ShellUiCommandBase & {
      type: 'navigation.push'
      frame: ShellNavigationFrame<TContext>
    })
  | (ShellUiCommandBase & {
      type: 'navigation.replace'
      frame: ShellNavigationFrame<TContext>
    })
  | (ShellUiCommandBase & {
      type: 'navigation.back'
    })
  | (ShellUiCommandBase & {
      type: 'navigation.reset'
      frames: Array<ShellNavigationFrame<TContext>>
    })
  | (ShellUiCommandBase & {
      type: 'surface.open'
      surface: ShellPersistentSurface
    })
  | (ShellUiCommandBase & {
      type: 'surface.toggle'
      surface: ShellPersistentSurface
    })
  | (ShellUiCommandBase & {
      type: 'surface.close'
      slot: ShellSideSlot
      surfaceId?: string
    })
  | (ShellUiCommandBase & {
      type: 'toolbar.set'
      toolbar: ShellBottomToolbar
    })
  | (ShellUiCommandBase & {
      type: 'toolbar.clear'
      surfaceId?: string
    })
  | (ShellUiCommandBase & {
      type: 'layer.open'
      layer: ShellTransientLayer
    })
  | (ShellUiCommandBase & {
      type: 'layer.close'
      layerId?: string
    })
  | (ShellUiCommandBase & {
      type: 'layer.dismiss-top'
      reason: 'escape' | 'outside' | 'back'
    })

export type ShellUiEffect =
  | {
      type: 'focus.restore'
      targetId: string
      sourceId: string
    }
  | {
      type: 'surface.closed'
      surfaceId: string
      slot: ShellSideSlot
      reason: 'replaced' | 'viewport-reconcile' | 'explicit'
    }

export interface ShellUiValidationIssue {
  code: string
  path: string
  message: string
}

export type ShellUiTransition<TContext = Record<string, unknown>> =
  | {
      ok: true
      state: ShellUiState<TContext>
      changed: boolean
      replayed: boolean
      effects: ShellUiEffect[]
    }
  | {
      ok: false
      state: ShellUiState<TContext>
      issues: ShellUiValidationIssue[]
    }

