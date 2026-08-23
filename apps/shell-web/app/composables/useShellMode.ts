import { ref, type Ref } from 'vue'

export type ShellView = 'instance' | 'type'

export interface ShellAllowedModes {
  instance: readonly string[]
  type: readonly string[]
}

export interface ShellModeState {
  view: Ref<ShellView>
  mode: Ref<string>
  toggleView: () => void
  setMode: (nextMode: string) => void
}

function firstMode(allowedModes: ShellAllowedModes, view: ShellView): string {
  return allowedModes[view][0] ?? ''
}

export function useShellMode(allowedModes: ShellAllowedModes): ShellModeState {
  const view = ref<ShellView>('instance')
  const mode = ref(firstMode(allowedModes, view.value))

  function toggleView() {
    view.value = view.value === 'instance' ? 'type' : 'instance'
    mode.value = firstMode(allowedModes, view.value)
  }

  function setMode(nextMode: string) {
    if (allowedModes[view.value].includes(nextMode)) {
      mode.value = nextMode
    }
  }

  return {
    view,
    mode,
    toggleView,
    setMode,
  }
}
