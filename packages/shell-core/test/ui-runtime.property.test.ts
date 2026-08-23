import assert from 'node:assert/strict'
import test from 'node:test'
import type { ShellUiCommand, ShellUiState } from '../../contracts-domain/shell-ui.ts'
import {
  applyShellUiCommand,
  createShellUiState,
  validateShellUiState,
} from '../src/ui-runtime.ts'

function generator(seed: number) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value
  }
}

function generatedCommand(index: number, value: number): ShellUiCommand {
  const id = 'property-' + index
  const slot = value % 2 === 0 ? 'left' : 'right'
  switch (value % 8) {
    case 0:
      return { commandId: id, type: 'viewport.set', mode: ['compact', 'medium', 'wide'][value % 3] as 'compact' | 'medium' | 'wide' }
    case 1:
      return {
        commandId: id,
        type: 'surface.open',
        surface: {
          surfaceId: 'surface-' + (value % 7),
          kind: slot === 'left' ? 'navigation-tree' : 'persistent-panel',
          slot,
          triggerId: 'trigger-' + slot,
        },
      }
    case 2:
      return { commandId: id, type: 'surface.close', slot }
    case 3:
      return {
        commandId: id,
        type: 'layer.open',
        layer: {
          layerId: 'layer-' + index,
          kind: 'command-menu',
          triggerId: 'trigger-layer-' + index,
          modal: false,
          dismiss: { escape: true, outside: true, back: true },
        },
      }
    case 4:
      return { commandId: id, type: 'layer.dismiss-top', reason: 'escape' }
    case 5:
      return {
        commandId: id,
        type: 'navigation.push',
        frame: {
          frameId: 'frame-' + index,
          destinationId: 'destination-' + (value % 13),
          nodeId: 'node-' + index,
          context: { generated: value },
          scrollPosition: value % 1000,
        },
      }
    case 6:
      return { commandId: id, type: 'navigation.back' }
    default:
      return {
        commandId: id,
        type: 'toolbar.set',
        toolbar: { surfaceId: 'toolbar-' + (value % 3), kind: 'toolbar', slot: 'bottom' },
      }
  }
}

function run(seed: number): ShellUiState {
  const next = generator(seed)
  let state = createShellUiState()
  for (let index = 0; index < 500; index += 1) {
    const result = applyShellUiCommand(state, generatedCommand(index, next()))
    if (result.ok) state = result.state
    assert.deepEqual(validateShellUiState(state), [])
  }
  return state
}

test('generated command sequences preserve every state invariant', () => {
  for (const seed of [1, 7, 42, 20260822, 0xffffffff]) run(seed)
})

test('generated command sequences are deterministic by seed', () => {
  for (const seed of [2, 11, 99]) assert.deepEqual(run(seed), run(seed))
})

