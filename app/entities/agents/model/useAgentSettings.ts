type AgentSettingsMap = Record<string, Record<string, unknown>>

const AGENT_SETTINGS_STATE_KEY = 'agent-settings-map'

export function useAgentSettings() {
	const settings = useState<AgentSettingsMap>(AGENT_SETTINGS_STATE_KEY, () => ({}))

	function getAgentSettings(agentId: string) {
		return settings.value[agentId] ?? {}
	}

	function setAgentSetting(agentId: string, key: string, value: unknown) {
		const current = settings.value[agentId] ?? {}
		settings.value[agentId] = {
			...current,
			[key]: value,
		}
	}

	function mergeAgentSettings(agentId: string, partial: Record<string, unknown>) {
		const current = settings.value[agentId] ?? {}
		settings.value[agentId] = {
			...current,
			...partial,
		}
	}

	function clearAgentSettings(agentId?: string) {
		if (!agentId) {
			settings.value = {}
			return
		}

		const { [agentId]: _removed, ...rest } = settings.value
		settings.value = rest
	}

	return {
		settings,
		getAgentSettings,
		setAgentSetting,
		mergeAgentSettings,
		clearAgentSettings,
	}
}

