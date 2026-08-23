import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  ShellNavigationFrame,
  ShellPersistentSurface,
  ShellTransientLayer,
  ShellUiCommand,
} from '../../contracts-domain/shell-ui.ts'
import {
  MAX_SHELL_NAVIGATION_DEPTH,
  MAX_SHELL_TRANSIENT_LAYERS,
  applyShellUiCommand,
  createShellUiState,
  validateShellUiState,
} from '../src/ui-runtime.ts'

function frame(id: string): ShellNavigationFrame {
  return {
    frameId: 'frame-' + id,
    destinationId: 'destination-' + id,
    nodeId: 'node-' + id,
    context: { id },
    scrollPosition: 0,
  }
}

function surface(id: string, slot: 'left' | 'right'): ShellPersistentSurface {
  return {
    surfaceId: id,
    kind: slot === 'left' ? 'navigation-tree' : 'persistent-panel',
    slot,
    triggerId: 'trigger-' + id,
  }
}

function layer(id: string, overrides: Partial<ShellTransientLayer> = {}): ShellTransientLayer {
  return {
    layerId: id,
    kind: 'command-menu',
    triggerId: 'trigger-' + id,
    modal: false,
    dismiss: { escape: true, outside: true, back: true },
    ...overrides,
  }
}

test('wide mode composes one left and one right persistent surface', () => {
  let state = createShellUiState({ viewportMode: 'wide' })
  const left = applyShellUiCommand(state, {
    commandId: 'open-left',
    type: 'surface.open',
    surface: surface('objects', 'left'),
  })
  assert.equal(left.ok, true)
  if (!left.ok) return
  state = left.state

  const right = applyShellUiCommand(state, {
    commandId: 'open-right',
    type: 'surface.open',
    surface: surface('chat', 'right'),
  })
  assert.equal(right.ok, true)
  if (!right.ok) return
  assert.equal(right.state.persistent.left?.surfaceId, 'objects')
  assert.equal(right.state.persistent.right?.surfaceId, 'chat')
  assert.deepEqual(validateShellUiState(right.state), [])
})

test('compact projection keeps only the last interacted side surface', () => {
  let state = createShellUiState({ viewportMode: 'wide' })
  for (const command of [
    { commandId: 'left', type: 'surface.open', surface: surface('sections', 'left') },
    { commandId: 'right', type: 'surface.open', surface: surface('chat', 'right') },
  ] satisfies ShellUiCommand[]) {
    const result = applyShellUiCommand(state, command)
    assert.equal(result.ok, true)
    if (result.ok) state = result.state
  }

  const compact = applyShellUiCommand(state, {
    commandId: 'compact',
    type: 'viewport.set',
    mode: 'compact',
  })
  assert.equal(compact.ok, true)
  if (!compact.ok) return
  assert.equal(compact.state.persistent.left, null)
  assert.equal(compact.state.persistent.right?.surfaceId, 'chat')
  assert.deepEqual(compact.effects, [{
    type: 'surface.closed',
    surfaceId: 'sections',
    slot: 'left',
    reason: 'viewport-reconcile',
  }])
})

test('opening the opposite compact surface replaces instead of overlaps', () => {
  let state = createShellUiState({ viewportMode: 'compact' })
  const opened = applyShellUiCommand(state, {
    commandId: 'left',
    type: 'surface.open',
    surface: surface('objects', 'left'),
  })
  assert.equal(opened.ok, true)
  if (!opened.ok) return
  state = opened.state

  const replaced = applyShellUiCommand(state, {
    commandId: 'right',
    type: 'surface.open',
    surface: surface('chat', 'right'),
  })
  assert.equal(replaced.ok, true)
  if (!replaced.ok) return
  assert.equal(replaced.state.persistent.left, null)
  assert.equal(replaced.state.persistent.right?.surfaceId, 'chat')
  assert.equal(replaced.effects[0]?.type, 'surface.closed')
})

test('Escape dismisses exactly the top layer and restores its trigger focus', () => {
  let state = createShellUiState()
  for (const selected of [layer('account'), layer('share')]) {
    const opened = applyShellUiCommand(state, {
      commandId: 'open-' + selected.layerId,
      type: 'layer.open',
      layer: selected,
    })
    assert.equal(opened.ok, true)
    if (opened.ok) state = opened.state
  }

  const dismissed = applyShellUiCommand(state, {
    commandId: 'escape-top',
    type: 'layer.dismiss-top',
    reason: 'escape',
  })
  assert.equal(dismissed.ok, true)
  if (!dismissed.ok) return
  assert.deepEqual(dismissed.state.transientLayers.map(item => item.layerId), ['account'])
  assert.deepEqual(dismissed.effects, [{
    type: 'focus.restore',
    targetId: 'trigger-share',
    sourceId: 'share',
  }])
})

test('a nondismissible top layer prevents Escape tunnelling', () => {
  let state = createShellUiState()
  for (const selected of [
    layer('lower'),
    layer('critical', { dismiss: { escape: false, outside: false, back: false } }),
  ]) {
    const result = applyShellUiCommand(state, {
      commandId: 'open-' + selected.layerId,
      type: 'layer.open',
      layer: selected,
    })
    assert.equal(result.ok, true)
    if (result.ok) state = result.state
  }
  const result = applyShellUiCommand(state, {
    commandId: 'escape-blocked',
    type: 'layer.dismiss-top',
    reason: 'escape',
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.changed, false)
  assert.deepEqual(result.state.transientLayers.map(item => item.layerId), ['lower', 'critical'])
})

test('replaying a command id is an idempotent no-op', () => {
  const initial = createShellUiState()
  const command: ShellUiCommand = {
    commandId: 'one-open',
    type: 'layer.open',
    layer: layer('one'),
  }
  const first = applyShellUiCommand(initial, command)
  assert.equal(first.ok, true)
  if (!first.ok) return
  const replay = applyShellUiCommand(first.state, command)
  assert.equal(replay.ok, true)
  if (!replay.ok) return
  assert.equal(replay.replayed, true)
  assert.equal(replay.changed, false)
  assert.equal(replay.state, first.state)
})

test('navigation frame and context move atomically in one bounded stack', () => {
  let state = createShellUiState()
  for (let index = 0; index < MAX_SHELL_NAVIGATION_DEPTH + 4; index += 1) {
    const result = applyShellUiCommand(state, {
      commandId: 'navigate-' + index,
      type: 'navigation.push',
      frame: frame(String(index)),
    })
    assert.equal(result.ok, true)
    if (result.ok) state = result.state
  }
  assert.equal(state.navigationStack.length, MAX_SHELL_NAVIGATION_DEPTH)
  assert.equal(state.navigationStack[0]?.frameId, 'frame-4')
  assert.equal(state.navigationStack.at(-1)?.frameId, 'frame-23')
})

test('invalid current state and invalid commands fail closed without mutation', () => {
  const invalid = createShellUiState({ viewportMode: 'compact' })
  invalid.persistent.left = surface('left', 'left')
  invalid.persistent.right = surface('right', 'right')
  const result = applyShellUiCommand(invalid, {
    commandId: 'attempt',
    type: 'navigation.push',
    frame: frame('next'),
  })
  assert.equal(result.ok, false)
  assert.equal(result.state, invalid)
  if (result.ok) return
  assert.ok(result.issues.some(issue => issue.code === 'state.compact-overlap'))
})

test('malformed persistent state fails closed without throwing', () => {
  const invalid = {
    ...createShellUiState(),
    persistent: null,
  } as unknown as ReturnType<typeof createShellUiState>
  const result = applyShellUiCommand(invalid, {
    commandId: 'safe-failure',
    type: 'navigation.push',
    frame: frame('next'),
  })
  assert.equal(result.ok, false)
  assert.equal(result.state, invalid)
  if (result.ok) return
  assert.ok(result.issues.some(issue => issue.code === 'state.invalid-persistent'))
})

test('malformed nested state values are validation errors rather than exceptions', () => {
  const invalid = {
    ...createShellUiState({ viewportMode: 'compact' }),
    navigationStack: [null],
    persistent: { left: 42, right: null, bottom: undefined },
    transientLayers: [null],
  } as unknown as ReturnType<typeof createShellUiState>
  assert.doesNotThrow(() => validateShellUiState(invalid))
  const result = applyShellUiCommand(invalid, { commandId: 'safe', type: 'navigation.back' })
  assert.equal(result.ok, false)
  assert.equal(result.state, invalid)
})

test('replace and reset refresh atomic frame context even when frame ids stay stable', () => {
  const original = frame('stable')
  let state = createShellUiState({ navigationStack: [original] })
  const replacement = { ...original, context: { id: 'updated' } }
  const replaced = applyShellUiCommand(state, {
    commandId: 'replace-context',
    type: 'navigation.replace',
    frame: replacement,
  })
  assert.equal(replaced.ok, true)
  if (!replaced.ok) return
  state = replaced.state
  assert.deepEqual(state.navigationStack[0]?.context, { id: 'updated' })

  const resetFrame = { ...replacement, context: { id: 'reset' } }
  const reset = applyShellUiCommand(state, {
    commandId: 'reset-context',
    type: 'navigation.reset',
    frames: [resetFrame],
  })
  assert.equal(reset.ok, true)
  if (!reset.ok) return
  assert.deepEqual(reset.state.navigationStack[0]?.context, { id: 'reset' })

  const collision = applyShellUiCommand(reset.state, {
    commandId: 'push-collision',
    type: 'navigation.push',
    frame: { ...resetFrame },
  })
  assert.equal(collision.ok, false)
  if (collision.ok) return
  assert.ok(collision.issues.some(issue => issue.code === 'navigation.frame-id-collision'))
})

test('navigation accepts a useful long href but rejects an undefined context', () => {
  const withHref = frame('href')
  withHref.href = '/objects?' + new URLSearchParams(
    Array.from({ length: 20 }, (_, index) => ['filter-' + index, 'value-' + index] as [string, string]),
  ).toString()
  assert.deepEqual(validateShellUiState(createShellUiState({ navigationStack: [withHref] })), [])

  const withoutContext = { ...frame('missing'), context: undefined }
  const issues = validateShellUiState(createShellUiState({ navigationStack: [withoutContext] }))
  assert.ok(issues.some(issue => issue.code === 'navigation.missing-context'))
})

test('a layer id collision fails closed', () => {
  const initial = createShellUiState()
  const first = applyShellUiCommand(initial, {
    commandId: 'open-shared-id',
    type: 'layer.open',
    layer: layer('shared-id'),
  })
  assert.equal(first.ok, true)
  if (!first.ok) return
  const collision = applyShellUiCommand(first.state, {
    commandId: 'open-shared-id-again',
    type: 'layer.open',
    layer: layer('shared-id', { kind: 'dialog', modal: true }),
  })
  assert.equal(collision.ok, false)
  assert.equal(collision.state, first.state)
  if (collision.ok) return
  assert.ok(collision.issues.some(issue => issue.code === 'layer.id-collision'))
})

test('a lower layer cannot close through the top layer', () => {
  let state = createShellUiState()
  for (const selected of [layer('lower'), layer('top')]) {
    const result = applyShellUiCommand(state, {
      commandId: 'open-' + selected.layerId,
      type: 'layer.open',
      layer: selected,
    })
    assert.equal(result.ok, true)
    if (result.ok) state = result.state
  }
  const result = applyShellUiCommand(state, {
    commandId: 'close-lower',
    type: 'layer.close',
    layerId: 'lower',
  })
  assert.equal(result.ok, false)
  assert.equal(result.state, state)
  if (result.ok) return
  assert.ok(result.issues.some(issue => issue.code === 'layer.not-top'))
})

test('the transient layer stack is bounded and fails closed at capacity', () => {
  let state = createShellUiState()
  for (let index = 0; index < MAX_SHELL_TRANSIENT_LAYERS; index += 1) {
    const result = applyShellUiCommand(state, {
      commandId: 'open-layer-' + index,
      type: 'layer.open',
      layer: layer('layer-' + index),
    })
    assert.equal(result.ok, true)
    if (result.ok) state = result.state
  }
  const overflow = applyShellUiCommand(state, {
    commandId: 'open-overflow',
    type: 'layer.open',
    layer: layer('overflow'),
  })
  assert.equal(overflow.ok, false)
  assert.equal(overflow.state, state)
  if (overflow.ok) return
  assert.ok(overflow.issues.some(issue => issue.code === 'layer.stack-full'))
})

test('the same command sequence is deterministic', () => {
  const commands: ShellUiCommand[] = [
    { commandId: 'n1', type: 'navigation.push', frame: frame('home') },
    { commandId: 's1', type: 'surface.open', surface: surface('objects', 'left') },
    { commandId: 'l1', type: 'layer.open', layer: layer('menu') },
    { commandId: 'v1', type: 'viewport.set', mode: 'compact' },
    { commandId: 'd1', type: 'layer.dismiss-top', reason: 'escape' },
  ]
  const run = () => commands.reduce((state, command) => {
    const result = applyShellUiCommand(state, command)
    assert.equal(result.ok, true)
    return result.ok ? result.state : state
  }, createShellUiState())
  assert.deepEqual(run(), run())
})

