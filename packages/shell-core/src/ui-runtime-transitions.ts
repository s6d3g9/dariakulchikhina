import {
  SHELL_UI_CONTRACT_VERSION,
  type ShellBottomToolbar,
  type ShellNavigationFrame,
  type ShellPersistentSurface,
  type ShellTransientLayer,
  type ShellUiCommand,
  type ShellUiEffect,
  type ShellUiState,
  type ShellUiTransition,
  type ShellUiValidationIssue,
  type ShellViewportMode,
} from '../../contracts-domain/shell-ui.ts'
import {
  MAX_RECENT_SHELL_COMMANDS,
  MAX_SHELL_NAVIGATION_DEPTH,
  MAX_SHELL_TRANSIENT_LAYERS,
} from './ui-runtime-constants.ts'
import { validateShellUiCommand } from './ui-runtime-command-validation.ts'
import { shellUiIssue, validateShellUiState } from './ui-runtime-validation.ts'

export interface CreateShellUiStateOptions<TContext> {
  viewportMode?: ShellViewportMode
  navigationStack?: Array<ShellNavigationFrame<TContext>>
}

interface TransitionDraft<TContext> {
  state: ShellUiState<TContext>
  changed: boolean
  effects: ShellUiEffect[]
  issues: ShellUiValidationIssue[]
}

function unchanged<TContext>(state: ShellUiState<TContext>): TransitionDraft<TContext> {
  return { state, changed: false, effects: [], issues: [] }
}

function changed<TContext>(
  state: ShellUiState<TContext>,
  effects: ShellUiEffect[] = [],
): TransitionDraft<TContext> {
  return { state, changed: true, effects, issues: [] }
}

function rejected<TContext>(
  state: ShellUiState<TContext>,
  issue: ShellUiValidationIssue,
): TransitionDraft<TContext> {
  return { state, changed: false, effects: [], issues: [issue] }
}

export function createShellUiState<TContext = Record<string, unknown>>(
  options: CreateShellUiStateOptions<TContext> = {},
): ShellUiState<TContext> {
  return {
    contractVersion: SHELL_UI_CONTRACT_VERSION,
    revision: 0,
    viewportMode: options.viewportMode ?? 'wide',
    navigationStack: [...(options.navigationStack ?? [])],
    persistent: { left: null, right: null, bottom: null },
    transientLayers: [],
    lastInteractedSide: null,
    recentCommandIds: [],
  }
}

function sameSurface(
  left: ShellPersistentSurface | null,
  right: ShellPersistentSurface,
): boolean {
  return Boolean(
    left
    && left.surfaceId === right.surfaceId
    && left.kind === right.kind
    && left.slot === right.slot
    && left.triggerId === right.triggerId
    && left.label === right.label,
  )
}

function sameToolbar(
  left: ShellBottomToolbar | null,
  right: ShellBottomToolbar,
): boolean {
  return Boolean(left && left.surfaceId === right.surfaceId && left.label === right.label)
}

function sameLayer(left: ShellTransientLayer, right: ShellTransientLayer): boolean {
  return (
    left.layerId === right.layerId
    && left.kind === right.kind
    && left.triggerId === right.triggerId
    && left.label === right.label
    && left.modal === right.modal
    && left.dismiss.escape === right.dismiss.escape
    && left.dismiss.outside === right.dismiss.outside
    && left.dismiss.back === right.dismiss.back
  )
}

function focusRestoreEffect(
  triggerId: string | undefined,
  sourceId: string,
): ShellUiEffect[] {
  return triggerId
    ? [{ type: 'focus.restore', targetId: triggerId, sourceId }]
    : []
}

function appendRecentCommand(commandIds: readonly string[], commandId: string): string[] {
  return [...commandIds.slice(-(MAX_RECENT_SHELL_COMMANDS - 1)), commandId]
}

function closeSurfaceEffect(
  selected: ShellPersistentSurface,
  reason: Extract<ShellUiEffect, { type: 'surface.closed' }>['reason'],
): ShellUiEffect {
  return {
    type: 'surface.closed',
    surfaceId: selected.surfaceId,
    slot: selected.slot,
    reason,
  }
}

function setViewport<TContext>(
  state: ShellUiState<TContext>,
  command: Extract<ShellUiCommand<TContext>, { type: 'viewport.set' }>,
): TransitionDraft<TContext> {
  if (command.mode === state.viewportMode) return unchanged(state)
  let left = state.persistent.left
  let right = state.persistent.right
  const effects: ShellUiEffect[] = []
  if (command.mode === 'compact' && left && right) {
    const keep = state.lastInteractedSide === 'left' ? 'left' : 'right'
    const closing = keep === 'left' ? right : left
    if (keep === 'left') right = null
    else left = null
    effects.push(closeSurfaceEffect(closing, 'viewport-reconcile'))
  }
  return changed({
    ...state,
    viewportMode: command.mode,
    persistent: { ...state.persistent, left, right },
  }, effects)
}

function pushNavigation<TContext>(
  state: ShellUiState<TContext>,
  command: Extract<ShellUiCommand<TContext>, { type: 'navigation.push' }>,
): TransitionDraft<TContext> {
  if (state.navigationStack.some(frame => frame.frameId === command.frame.frameId)) {
    return rejected(state, shellUiIssue(
      'navigation.frame-id-collision',
      'frame.frameId',
      'A pushed navigation frame must have a unique frame id.',
    ))
  }
  return changed({
    ...state,
    navigationStack: [...state.navigationStack, command.frame]
      .slice(-MAX_SHELL_NAVIGATION_DEPTH),
  })
}

function replaceNavigation<TContext>(
  state: ShellUiState<TContext>,
  command: Extract<ShellUiCommand<TContext>, { type: 'navigation.replace' }>,
): TransitionDraft<TContext> {
  const current = state.navigationStack.at(-1)
  if (current === command.frame) return unchanged(state)
  if (state.navigationStack.slice(0, -1).some(frame => frame.frameId === command.frame.frameId)) {
    return rejected(state, shellUiIssue(
      'navigation.frame-id-collision',
      'frame.frameId',
      'A replacement frame cannot collide with a lower navigation frame.',
    ))
  }
  const stack = state.navigationStack.length > 0
    ? [...state.navigationStack.slice(0, -1), command.frame]
    : [command.frame]
  return changed({ ...state, navigationStack: stack })
}

function backNavigation<TContext>(
  state: ShellUiState<TContext>,
): TransitionDraft<TContext> {
  if (state.navigationStack.length <= 1) return unchanged(state)
  return changed({ ...state, navigationStack: state.navigationStack.slice(0, -1) })
}

function resetNavigation<TContext>(
  state: ShellUiState<TContext>,
  command: Extract<ShellUiCommand<TContext>, { type: 'navigation.reset' }>,
): TransitionDraft<TContext> {
  const sameFrames = state.navigationStack.length === command.frames.length
    && state.navigationStack.every((frame, index) => frame === command.frames[index])
  if (sameFrames) return unchanged(state)
  return changed({ ...state, navigationStack: [...command.frames] })
}

function setSurface<TContext>(
  state: ShellUiState<TContext>,
  command: Extract<ShellUiCommand<TContext>, { type: 'surface.open' | 'surface.toggle' }>,
): TransitionDraft<TContext> {
  const selected = command.surface
  const current = state.persistent[selected.slot]
  if (command.type === 'surface.toggle' && current?.surfaceId === selected.surfaceId) {
    return changed({
      ...state,
      persistent: { ...state.persistent, [selected.slot]: null },
      lastInteractedSide: selected.slot,
    }, [
      closeSurfaceEffect(current, 'explicit'),
      ...focusRestoreEffect(current.triggerId, current.surfaceId),
    ])
  }
  if (sameSurface(current, selected)) return unchanged(state)

  let left = state.persistent.left
  let right = state.persistent.right
  const effects: ShellUiEffect[] = []
  if (current) effects.push(closeSurfaceEffect(current, 'replaced'))
  if (selected.slot === 'left') left = selected
  else right = selected

  if (state.viewportMode === 'compact') {
    const opposite = selected.slot === 'left' ? right : left
    if (opposite) effects.push(closeSurfaceEffect(opposite, 'replaced'))
    if (selected.slot === 'left') right = null
    else left = null
  }
  return changed({
    ...state,
    persistent: { ...state.persistent, left, right },
    lastInteractedSide: selected.slot,
  }, effects)
}

function closeSurface<TContext>(
  state: ShellUiState<TContext>,
  command: Extract<ShellUiCommand<TContext>, { type: 'surface.close' }>,
): TransitionDraft<TContext> {
  const current = state.persistent[command.slot]
  if (!current || (command.surfaceId && current.surfaceId !== command.surfaceId)) {
    return unchanged(state)
  }
  return changed({
    ...state,
    persistent: { ...state.persistent, [command.slot]: null },
    lastInteractedSide: command.slot,
  }, [
    closeSurfaceEffect(current, 'explicit'),
    ...focusRestoreEffect(current.triggerId, current.surfaceId),
  ])
}

function setToolbar<TContext>(
  state: ShellUiState<TContext>,
  command: Extract<ShellUiCommand<TContext>, { type: 'toolbar.set' }>,
): TransitionDraft<TContext> {
  if (sameToolbar(state.persistent.bottom, command.toolbar)) return unchanged(state)
  return changed({
    ...state,
    persistent: { ...state.persistent, bottom: command.toolbar },
  })
}

function clearToolbar<TContext>(
  state: ShellUiState<TContext>,
  command: Extract<ShellUiCommand<TContext>, { type: 'toolbar.clear' }>,
): TransitionDraft<TContext> {
  if (
    !state.persistent.bottom
    || (command.surfaceId && state.persistent.bottom.surfaceId !== command.surfaceId)
  ) {
    return unchanged(state)
  }
  return changed({
    ...state,
    persistent: { ...state.persistent, bottom: null },
  })
}

function openLayer<TContext>(
  state: ShellUiState<TContext>,
  command: Extract<ShellUiCommand<TContext>, { type: 'layer.open' }>,
): TransitionDraft<TContext> {
  const existing = state.transientLayers.find(item => item.layerId === command.layer.layerId)
  if (existing && !sameLayer(existing, command.layer)) {
    return rejected(state, shellUiIssue(
      'layer.id-collision',
      'layer.layerId',
      'A layer id cannot be reopened with different semantics.',
    ))
  }
  if (existing) return unchanged(state)
  if (state.transientLayers.length >= MAX_SHELL_TRANSIENT_LAYERS) {
    return rejected(state, shellUiIssue(
      'layer.stack-full',
      'transientLayers',
      'Transient layer stack is full; opening another layer fails closed.',
    ))
  }
  return changed({
    ...state,
    transientLayers: [...state.transientLayers, command.layer],
  })
}

function closeLayer<TContext>(
  state: ShellUiState<TContext>,
  command: Extract<ShellUiCommand<TContext>, { type: 'layer.close' }>,
): TransitionDraft<TContext> {
  const top = state.transientLayers.at(-1)
  if (!top) return unchanged(state)
  if (command.layerId && command.layerId !== top.layerId) {
    const existsBelow = state.transientLayers.some(item => item.layerId === command.layerId)
    return existsBelow
      ? rejected(state, shellUiIssue(
          'layer.not-top',
          'layerId',
          'Nested layers must close from the top of the stack.',
        ))
      : unchanged(state)
  }
  return changed(
    { ...state, transientLayers: state.transientLayers.slice(0, -1) },
    focusRestoreEffect(top.triggerId, top.layerId),
  )
}

function dismissLayer<TContext>(
  state: ShellUiState<TContext>,
  command: Extract<ShellUiCommand<TContext>, { type: 'layer.dismiss-top' }>,
): TransitionDraft<TContext> {
  const top = state.transientLayers.at(-1)
  if (!top || !top.dismiss[command.reason]) return unchanged(state)
  return changed(
    { ...state, transientLayers: state.transientLayers.slice(0, -1) },
    focusRestoreEffect(top.triggerId, top.layerId),
  )
}

function reduceValidCommand<TContext>(
  state: ShellUiState<TContext>,
  command: ShellUiCommand<TContext>,
): TransitionDraft<TContext> {
  switch (command.type) {
    case 'viewport.set': return setViewport(state, command)
    case 'navigation.push': return pushNavigation(state, command)
    case 'navigation.replace': return replaceNavigation(state, command)
    case 'navigation.back': return backNavigation(state)
    case 'navigation.reset': return resetNavigation(state, command)
    case 'surface.open':
    case 'surface.toggle': return setSurface(state, command)
    case 'surface.close': return closeSurface(state, command)
    case 'toolbar.set': return setToolbar(state, command)
    case 'toolbar.clear': return clearToolbar(state, command)
    case 'layer.open': return openLayer(state, command)
    case 'layer.close': return closeLayer(state, command)
    case 'layer.dismiss-top': return dismissLayer(state, command)
  }
}

export function applyShellUiCommand<TContext>(
  state: ShellUiState<TContext>,
  command: ShellUiCommand<TContext>,
): ShellUiTransition<TContext> {
  const stateIssues = validateShellUiState(state)
  if (stateIssues.length > 0) return { ok: false, state, issues: stateIssues }

  const commandIssues = validateShellUiCommand(command)
  if (commandIssues.length > 0) return { ok: false, state, issues: commandIssues }

  if (state.recentCommandIds.includes(command.commandId)) {
    return { ok: true, state, changed: false, replayed: true, effects: [] }
  }

  const result = reduceValidCommand(state, command)
  if (result.issues.length > 0) return { ok: false, state, issues: result.issues }

  const withMetadata: ShellUiState<TContext> = {
    ...result.state,
    revision: result.changed ? state.revision + 1 : state.revision,
    recentCommandIds: appendRecentCommand(state.recentCommandIds, command.commandId),
  }
  const nextIssues = validateShellUiState(withMetadata)
  if (nextIssues.length > 0) return { ok: false, state, issues: nextIssues }
  return {
    ok: true,
    state: withMetadata,
    changed: result.changed,
    replayed: false,
    effects: result.effects,
  }
}
