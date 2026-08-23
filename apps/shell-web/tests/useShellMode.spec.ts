import { describe, expect, it } from 'vitest'
import { useShellMode } from '../app/composables/useShellMode'

const allowedModes = {
  instance: ['consumer', 'provider'],
  type: ['explore', 'connect'],
}

describe('useShellMode', () => {
  it('starts in instance view with the first instance mode', () => {
    const shellMode = useShellMode(allowedModes)

    expect(shellMode.view.value).toBe('instance')
    expect(shellMode.mode.value).toBe('consumer')
  })

  it('toggles to type view and resets mode to the first type mode', () => {
    const shellMode = useShellMode(allowedModes)

    shellMode.toggleView()

    expect(shellMode.view.value).toBe('type')
    expect(shellMode.mode.value).toBe('explore')
  })

  it('changes to a valid mode and ignores an invalid mode', () => {
    const shellMode = useShellMode(allowedModes)

    shellMode.setMode('provider')
    shellMode.setMode('explore')

    expect(shellMode.mode.value).toBe('provider')
  })

  it('returns to the initial view and mode after a double toggle', () => {
    const shellMode = useShellMode(allowedModes)

    shellMode.toggleView()
    shellMode.toggleView()

    expect(shellMode.view.value).toBe('instance')
    expect(shellMode.mode.value).toBe('consumer')
  })
})
