export type MessengerBalancingModel = 'haiku' | 'sonnet' | 'opus'
export type MessengerBalancingAgentStyle = 'subagent' | 'tmux-session' | 'mixed'

export interface MessengerBalancingPreset {
  id: string
  name: string
  description: string
  model: MessengerBalancingModel
  agentStyle: MessengerBalancingAgentStyle
  useWorktree: boolean
  maxParallel: number
  whenToUse: string
}

export interface MessengerBalancingState {
  activePresetId: string | null
  presets: MessengerBalancingPreset[]
}

const MODEL_OPTIONS: Array<{ title: string; value: MessengerBalancingModel }> = [
  { title: 'Haiku (быстро, дёшево)', value: 'haiku' },
  { title: 'Sonnet (баланс)', value: 'sonnet' },
  { title: 'Opus (максимум качества)', value: 'opus' },
]

const AGENT_STYLE_OPTIONS: Array<{ title: string; value: MessengerBalancingAgentStyle }> = [
  { title: 'Subagent (внутренний Agent())', value: 'subagent' },
  { title: 'Tmux-session (видимый)', value: 'tmux-session' },
  { title: 'Смешанный', value: 'mixed' },
]

export function useMessengerBalancing() {
  const api = useBalancingApi()
  const state = useState<MessengerBalancingState | null>('messenger-balancing-state', () => null)
  const configPath = useState<string>('messenger-balancing-path', () => '')
  const pending = useState<boolean>('messenger-balancing-pending', () => false)
  const saving = useState<boolean>('messenger-balancing-saving', () => false)
  const error = useState<string | null>('messenger-balancing-error', () => null)

  const activePreset = computed<MessengerBalancingPreset | null>(() => {
    const s = state.value
    if (!s || !s.activePresetId) return null
    return s.presets.find(p => p.id === s.activePresetId) ?? null
  })

  const mode = computed<'auto' | 'manual'>(() => (state.value?.activePresetId ? 'manual' : 'auto'))

  async function refresh() {
    pending.value = true
    error.value = null
    try {
      const res = await api.getBalancing()
      state.value = res.state
      configPath.value = res.configPath
    }
    catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Не удалось загрузить конфиг балансировки'
    }
    finally {
      pending.value = false
    }
  }

  async function save(next: MessengerBalancingState) {
    saving.value = true
    error.value = null
    try {
      const res = await api.putBalancing(next)
      state.value = res.state
      configPath.value = res.configPath
    }
    catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Не удалось сохранить конфиг балансировки'
      throw err
    }
    finally {
      saving.value = false
    }
  }

  async function setActivePreset(presetId: string | null) {
    if (!state.value) return
    await save({ ...state.value, activePresetId: presetId })
  }

  async function updatePreset(presetId: string, patch: Partial<MessengerBalancingPreset>) {
    if (!state.value) return
    const nextPresets = state.value.presets.map(p => (p.id === presetId ? { ...p, ...patch } : p))
    await save({ ...state.value, presets: nextPresets })
  }

  async function reset() {
    saving.value = true
    error.value = null
    try {
      const res = await api.resetBalancing()
      state.value = res.state
      configPath.value = res.configPath
    }
    finally {
      saving.value = false
    }
  }

  return {
    state,
    configPath,
    pending,
    saving,
    error,
    activePreset,
    mode,
    modelOptions: MODEL_OPTIONS,
    agentStyleOptions: AGENT_STYLE_OPTIONS,
    refresh,
    save,
    setActivePreset,
    updatePreset,
    reset,
  }
}
