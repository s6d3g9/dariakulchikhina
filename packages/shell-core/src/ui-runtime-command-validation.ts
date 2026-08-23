import {
  type ShellSideSlot,
  type ShellUiCommand,
  type ShellUiValidationIssue,
  type ShellViewportMode,
} from '../../contracts-domain/shell-ui.ts'
import { MAX_SHELL_NAVIGATION_DEPTH } from './ui-runtime-constants.ts'
import {
  SIDE_SLOTS,
  VIEWPORT_MODES,
  isRecord,
  shellUiIssue,
  uniqueIds,
  validId,
  validateFrame,
  validateLayer,
  validateOptionalId,
  validatePersistentSurface,
  validateToolbar,
} from './ui-runtime-validation.ts'

type RuntimeRecord = Record<string, unknown>
type CommandValidator = (value: RuntimeRecord, issues: ShellUiValidationIssue[]) => void

function validateViewportCommand(
  value: RuntimeRecord,
  issues: ShellUiValidationIssue[],
): void {
  if (!VIEWPORT_MODES.has(value.mode as ShellViewportMode)) {
    issues.push(shellUiIssue(
      'command.invalid-viewport',
      'mode',
      'Viewport mode is not supported.',
    ))
  }
}

function validateFrameCommand(
  value: RuntimeRecord,
  issues: ShellUiValidationIssue[],
): void {
  issues.push(...validateFrame(value.frame, 'frame'))
}

function validateResetCommand(
  value: RuntimeRecord,
  issues: ShellUiValidationIssue[],
): void {
  if (!Array.isArray(value.frames)) {
    issues.push(shellUiIssue(
      'command.invalid-frames',
      'frames',
      'Navigation reset requires an array.',
    ))
    return
  }
  if (value.frames.length > MAX_SHELL_NAVIGATION_DEPTH) {
    issues.push(shellUiIssue(
      'command.navigation-overflow',
      'frames',
      'Navigation reset exceeds its bound.',
    ))
  }
  value.frames.forEach((frame, index) => {
    issues.push(...validateFrame(frame, 'frames.' + index))
  })
  issues.push(...uniqueIds(
    value.frames.map(frame => isRecord(frame) ? frame.frameId : undefined),
    'frames',
    'command.duplicate-frame',
  ))
}

function validateSurfaceCommand(
  value: RuntimeRecord,
  issues: ShellUiValidationIssue[],
): void {
  issues.push(...validatePersistentSurface(value.surface, 'surface'))
}

function validateSurfaceCloseCommand(
  value: RuntimeRecord,
  issues: ShellUiValidationIssue[],
): void {
  if (!SIDE_SLOTS.has(value.slot as ShellSideSlot)) {
    issues.push(shellUiIssue(
      'command.invalid-slot',
      'slot',
      'Surface close slot must be left or right.',
    ))
  }
  validateOptionalId(value.surfaceId, 'surfaceId', issues)
}

function validateToolbarCommand(
  value: RuntimeRecord,
  issues: ShellUiValidationIssue[],
): void {
  issues.push(...validateToolbar(value.toolbar, 'toolbar'))
}

function validateToolbarClearCommand(
  value: RuntimeRecord,
  issues: ShellUiValidationIssue[],
): void {
  validateOptionalId(value.surfaceId, 'surfaceId', issues)
}

function validateLayerCommand(
  value: RuntimeRecord,
  issues: ShellUiValidationIssue[],
): void {
  issues.push(...validateLayer(value.layer, 'layer'))
}

function validateLayerCloseCommand(
  value: RuntimeRecord,
  issues: ShellUiValidationIssue[],
): void {
  validateOptionalId(value.layerId, 'layerId', issues)
}

function validateDismissCommand(
  value: RuntimeRecord,
  issues: ShellUiValidationIssue[],
): void {
  if (!['escape', 'outside', 'back'].includes(String(value.reason))) {
    issues.push(shellUiIssue(
      'command.invalid-dismiss-reason',
      'reason',
      'Dismiss reason is not supported.',
    ))
  }
}

function acceptCommand(): void {}

const COMMAND_VALIDATORS: Record<string, CommandValidator> = {
  'viewport.set': validateViewportCommand,
  'navigation.push': validateFrameCommand,
  'navigation.replace': validateFrameCommand,
  'navigation.back': acceptCommand,
  'navigation.reset': validateResetCommand,
  'surface.open': validateSurfaceCommand,
  'surface.toggle': validateSurfaceCommand,
  'surface.close': validateSurfaceCloseCommand,
  'toolbar.set': validateToolbarCommand,
  'toolbar.clear': validateToolbarClearCommand,
  'layer.open': validateLayerCommand,
  'layer.close': validateLayerCloseCommand,
  'layer.dismiss-top': validateDismissCommand,
}

export function validateShellUiCommand<TContext>(
  command: ShellUiCommand<TContext>,
): ShellUiValidationIssue[] {
  const value = command as unknown
  if (!isRecord(value)) {
    return [shellUiIssue('command.invalid', 'command', 'Shell command must be an object.')]
  }
  const issues: ShellUiValidationIssue[] = []
  if (!validId(value.commandId)) {
    issues.push(shellUiIssue('command.invalid-id', 'commandId', 'Command id is required.'))
  }
  const validator = COMMAND_VALIDATORS[String(value.type)]
  if (!validator) {
    issues.push(shellUiIssue(
      'command.invalid-type',
      'type',
      'Shell command type is not supported.',
    ))
    return issues
  }
  validator(value, issues)
  return issues
}
