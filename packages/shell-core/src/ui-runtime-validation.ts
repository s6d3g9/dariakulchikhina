import {
  SHELL_UI_CONTRACT_VERSION,
  type ShellSideSlot,
  type ShellUiState,
  type ShellUiValidationIssue,
  type ShellViewportMode,
} from '../../contracts-domain/shell-ui.ts'
import {
  MAX_RECENT_SHELL_COMMANDS,
  MAX_SHELL_NAVIGATION_DEPTH,
  MAX_SHELL_TRANSIENT_LAYERS,
} from './ui-runtime-constants.ts'

export const VIEWPORT_MODES = new Set<ShellViewportMode>(['compact', 'medium', 'wide'])
export const SIDE_SLOTS = new Set<ShellSideSlot>(['left', 'right'])
const PERSISTENT_KINDS = new Set(['navigation-tree', 'persistent-panel'])
const TRANSIENT_KINDS = new Set([
  'command-menu',
  'select-listbox',
  'context-menu',
  'dialog',
  'sheet',
  'notification',
])

type RuntimeRecord = Record<string, unknown>

export function shellUiIssue(
  code: string,
  path: string,
  message: string,
): ShellUiValidationIssue {
  return { code, path, message }
}

export function isRecord(value: unknown): value is RuntimeRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function validId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 160
}

export function validateOptionalId(
  value: unknown,
  path: string,
  issues: ShellUiValidationIssue[],
): void {
  if (value !== undefined && !validId(value)) {
    issues.push(shellUiIssue(
      'id.invalid',
      path,
      'Optional identifiers must be non-empty strings of at most 160 characters.',
    ))
  }
}

function validateOptionalText(
  value: unknown,
  path: string,
  issues: ShellUiValidationIssue[],
  maxLength: number,
): void {
  if (
    value !== undefined
    && (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength)
  ) {
    issues.push(shellUiIssue(
      'text.invalid',
      path,
      `Optional text must be non-empty and at most ${maxLength} characters.`,
    ))
  }
}

function validateFocus(value: unknown, path: string): ShellUiValidationIssue[] {
  if (!isRecord(value)) {
    return [shellUiIssue('focus.invalid', path, 'Focus must be an object.')]
  }
  const issues: ShellUiValidationIssue[] = []
  for (const key of ['kind', 'id']) {
    if (!validId(value[key])) {
      issues.push(shellUiIssue(
        'focus.invalid-id',
        path + '.' + key,
        'Focus identifiers are required.',
      ))
    }
  }
  if (value.view !== 'instance' && value.view !== 'type') {
    issues.push(shellUiIssue(
      'focus.invalid-view',
      path + '.view',
      'Focus view must be instance or type.',
    ))
  }
  validateOptionalId(value.mode, path + '.mode', issues)
  return issues
}

export function validateFrame(value: unknown, path: string): ShellUiValidationIssue[] {
  if (!isRecord(value)) {
    return [shellUiIssue(
      'navigation.invalid-frame',
      path,
      'Navigation frame must be an object.',
    )]
  }
  const issues: ShellUiValidationIssue[] = []
  for (const key of ['frameId', 'destinationId', 'nodeId']) {
    if (!validId(value[key])) {
      issues.push(shellUiIssue(
        'navigation.invalid-id',
        path + '.' + key,
        'Navigation identifiers are required.',
      ))
    }
  }
  validateOptionalText(value.label, path + '.label', issues, 240)
  validateOptionalText(value.href, path + '.href', issues, 2048)
  validateOptionalId(value.activeLeafId, path + '.activeLeafId', issues)
  if (value.focus !== undefined) issues.push(...validateFocus(value.focus, path + '.focus'))
  if (!Number.isFinite(value.scrollPosition) || Number(value.scrollPosition) < 0) {
    issues.push(shellUiIssue(
      'navigation.invalid-scroll',
      path + '.scrollPosition',
      'Scroll position must be finite and non-negative.',
    ))
  }
  if (!('context' in value) || value.context === undefined) {
    issues.push(shellUiIssue(
      'navigation.missing-context',
      path + '.context',
      'Navigation context must travel atomically with its frame.',
    ))
  }
  if (value.filter !== undefined && !isRecord(value.filter)) {
    issues.push(shellUiIssue(
      'navigation.invalid-filter',
      path + '.filter',
      'Navigation filter must be a record.',
    ))
  }
  return issues
}

export function validatePersistentSurface(value: unknown, path: string): ShellUiValidationIssue[] {
  if (!isRecord(value)) {
    return [shellUiIssue('surface.invalid', path, 'Persistent surface must be an object.')]
  }
  const issues: ShellUiValidationIssue[] = []
  if (!validId(value.surfaceId)) {
    issues.push(shellUiIssue('surface.invalid-id', path + '.surfaceId', 'Surface id is required.'))
  }
  if (!PERSISTENT_KINDS.has(String(value.kind))) {
    issues.push(shellUiIssue(
      'surface.invalid-kind',
      path + '.kind',
      'Persistent surfaces must be navigation-tree or persistent-panel.',
    ))
  }
  if (!SIDE_SLOTS.has(value.slot as ShellSideSlot)) {
    issues.push(shellUiIssue(
      'surface.invalid-slot',
      path + '.slot',
      'Persistent surface slot must be left or right.',
    ))
  }
  validateOptionalId(value.triggerId, path + '.triggerId', issues)
  validateOptionalText(value.label, path + '.label', issues, 240)
  return issues
}

export function validateToolbar(value: unknown, path: string): ShellUiValidationIssue[] {
  if (!isRecord(value)) {
    return [shellUiIssue('toolbar.invalid', path, 'Toolbar must be an object.')]
  }
  const issues: ShellUiValidationIssue[] = []
  if (!validId(value.surfaceId)) {
    issues.push(shellUiIssue('toolbar.invalid-id', path + '.surfaceId', 'Toolbar id is required.'))
  }
  if (value.kind !== 'toolbar' || value.slot !== 'bottom') {
    issues.push(shellUiIssue(
      'toolbar.invalid-contract',
      path,
      'Toolbar must use kind toolbar and slot bottom.',
    ))
  }
  validateOptionalText(value.label, path + '.label', issues, 240)
  return issues
}

export function validateLayer(value: unknown, path: string): ShellUiValidationIssue[] {
  if (!isRecord(value)) {
    return [shellUiIssue('layer.invalid', path, 'Transient layer must be an object.')]
  }
  const issues: ShellUiValidationIssue[] = []
  if (!validId(value.layerId)) {
    issues.push(shellUiIssue('layer.invalid-id', path + '.layerId', 'Layer id is required.'))
  }
  if (!TRANSIENT_KINDS.has(String(value.kind))) {
    issues.push(shellUiIssue(
      'layer.invalid-kind',
      path + '.kind',
      'Transient layer kind is not supported.',
    ))
  }
  validateOptionalId(value.triggerId, path + '.triggerId', issues)
  validateOptionalText(value.label, path + '.label', issues, 240)
  if (typeof value.modal !== 'boolean') {
    issues.push(shellUiIssue(
      'layer.invalid-modal',
      path + '.modal',
      'Layer modal flag must be boolean.',
    ))
  }
  if (!isRecord(value.dismiss)) {
    issues.push(shellUiIssue(
      'layer.invalid-dismiss',
      path + '.dismiss',
      'Dismiss policy is required.',
    ))
  } else {
    for (const key of ['escape', 'outside', 'back']) {
      if (typeof value.dismiss[key] !== 'boolean') {
        issues.push(shellUiIssue(
          'layer.invalid-dismiss',
          path + '.dismiss.' + key,
          'Dismiss flags must be boolean.',
        ))
      }
    }
  }
  return issues
}

export function uniqueIds(values: unknown[], path: string, code: string): ShellUiValidationIssue[] {
  const validValues = values.filter(validId)
  const seen = new Set<string>()
  const issues: ShellUiValidationIssue[] = []
  for (const value of validValues) {
    if (seen.has(value)) {
      issues.push(shellUiIssue(
        code,
        path,
        'Identifiers in an ordered shell collection must be unique.',
      ))
    }
    seen.add(value)
  }
  return issues
}

function validateStateHeader(value: RuntimeRecord): ShellUiValidationIssue[] {
  const issues: ShellUiValidationIssue[] = []
  if (value.contractVersion !== SHELL_UI_CONTRACT_VERSION) {
    issues.push(shellUiIssue(
      'state.contract-version',
      'contractVersion',
      'Unsupported shell UI contract version.',
    ))
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 0) {
    issues.push(shellUiIssue(
      'state.invalid-revision',
      'revision',
      'Revision must be a non-negative integer.',
    ))
  }
  if (!VIEWPORT_MODES.has(value.viewportMode as ShellViewportMode)) {
    issues.push(shellUiIssue(
      'state.invalid-viewport',
      'viewportMode',
      'Viewport mode is not supported.',
    ))
  }
  return issues
}

function validateNavigationStack(value: unknown): ShellUiValidationIssue[] {
  if (!Array.isArray(value)) {
    return [shellUiIssue(
      'state.invalid-navigation',
      'navigationStack',
      'Navigation stack must be an array.',
    )]
  }
  const issues: ShellUiValidationIssue[] = []
  if (value.length > MAX_SHELL_NAVIGATION_DEPTH) {
    issues.push(shellUiIssue(
      'state.navigation-overflow',
      'navigationStack',
      'Navigation stack exceeds its bound.',
    ))
  }
  value.forEach((frame, index) => {
    issues.push(...validateFrame(frame, 'navigationStack.' + index))
  })
  issues.push(...uniqueIds(
    value.map(frame => isRecord(frame) ? frame.frameId : undefined),
    'navigationStack',
    'state.duplicate-frame',
  ))
  return issues
}

function validatePersistentState(
  value: unknown,
  viewportMode: unknown,
): ShellUiValidationIssue[] {
  if (!isRecord(value)) {
    return [shellUiIssue(
      'state.invalid-persistent',
      'persistent',
      'Persistent surface state must be an object.',
    )]
  }
  const issues: ShellUiValidationIssue[] = []
  for (const slot of ['left', 'right'] as const) {
    const selected = value[slot]
    if (selected === undefined) {
      issues.push(shellUiIssue(
        'state.missing-slot',
        'persistent.' + slot,
        'Persistent side slots must be explicit.',
      ))
    } else if (selected !== null) {
      issues.push(...validatePersistentSurface(selected, 'persistent.' + slot))
      if (isRecord(selected) && selected.slot !== slot) {
        issues.push(shellUiIssue(
          'state.slot-mismatch',
          'persistent.' + slot + '.slot',
          'Surface slot must match its state key.',
        ))
      }
    }
  }
  if (value.bottom === undefined) {
    issues.push(shellUiIssue(
      'state.missing-slot',
      'persistent.bottom',
      'Persistent bottom slot must be explicit.',
    ))
  } else if (value.bottom !== null) {
    issues.push(...validateToolbar(value.bottom, 'persistent.bottom'))
  }
  if (viewportMode === 'compact' && value.left !== null && value.right !== null) {
    issues.push(shellUiIssue(
      'state.compact-overlap',
      'persistent',
      'Compact mode permits only one side surface.',
    ))
  }
  return issues
}

function validateTransientLayers(value: unknown): ShellUiValidationIssue[] {
  if (!Array.isArray(value)) {
    return [shellUiIssue(
      'state.invalid-layers',
      'transientLayers',
      'Transient layers must be an array.',
    )]
  }
  const issues: ShellUiValidationIssue[] = []
  if (value.length > MAX_SHELL_TRANSIENT_LAYERS) {
    issues.push(shellUiIssue(
      'state.layer-overflow',
      'transientLayers',
      'Transient layer stack exceeds its bound.',
    ))
  }
  value.forEach((layer, index) => {
    issues.push(...validateLayer(layer, 'transientLayers.' + index))
  })
  issues.push(...uniqueIds(
    value.map(layer => isRecord(layer) ? layer.layerId : undefined),
    'transientLayers',
    'state.duplicate-layer',
  ))
  return issues
}

function validateLastSide(value: unknown): ShellUiValidationIssue[] {
  if (value === null || SIDE_SLOTS.has(value as ShellSideSlot)) return []
  return [shellUiIssue(
    'state.invalid-last-side',
    'lastInteractedSide',
    'Last side must be left, right or null.',
  )]
}

function validateRecentCommands(value: unknown): ShellUiValidationIssue[] {
  if (!Array.isArray(value)) {
    return [shellUiIssue(
      'state.invalid-recent-commands',
      'recentCommandIds',
      'Recent command ids must be an array.',
    )]
  }
  const issues: ShellUiValidationIssue[] = []
  if (value.length > MAX_RECENT_SHELL_COMMANDS) {
    issues.push(shellUiIssue(
      'state.command-history-overflow',
      'recentCommandIds',
      'Recent command history exceeds its bound.',
    ))
  }
  for (const [index, commandId] of value.entries()) {
    if (!validId(commandId)) {
      issues.push(shellUiIssue(
        'state.invalid-command-id',
        'recentCommandIds.' + index,
        'Command id is invalid.',
      ))
    }
  }
  issues.push(...uniqueIds(value, 'recentCommandIds', 'state.duplicate-command'))
  return issues
}

export function validateShellUiState<TContext>(
  state: ShellUiState<TContext>,
): ShellUiValidationIssue[] {
  const value = state as unknown
  if (!isRecord(value)) {
    return [shellUiIssue('state.invalid', 'state', 'Shell UI state must be an object.')]
  }
  return [
    ...validateStateHeader(value),
    ...validateNavigationStack(value.navigationStack),
    ...validatePersistentState(value.persistent, value.viewportMode),
    ...validateTransientLayers(value.transientLayers),
    ...validateLastSide(value.lastInteractedSide),
    ...validateRecentCommands(value.recentCommandIds),
  ]
}
