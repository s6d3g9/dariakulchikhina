export interface AgentRegistryItem {
	id: string
	name: string
	enabled: boolean
	metadata?: Record<string, unknown>
}

const AGENT_REGISTRY_STATE_KEY = 'agent-registry-items'

export function useAgentRegistry() {
	const registry = useState<AgentRegistryItem[]>(AGENT_REGISTRY_STATE_KEY, () => [])

	function registerAgent(agent: AgentRegistryItem) {
		const existingIndex = registry.value.findIndex(item => item.id === agent.id)

		if (existingIndex === -1) {
			registry.value.push(agent)
			return
		}

		registry.value[existingIndex] = agent
	}

	function unregisterAgent(agentId: string) {
		registry.value = registry.value.filter(item => item.id !== agentId)
	}

	function setAgentEnabled(agentId: string, enabled: boolean) {
		const agent = registry.value.find(item => item.id === agentId)
		if (!agent) {
			return
		}

		agent.enabled = enabled
	}

	function clearAgentRegistry() {
		registry.value = []
	}

	return {
		registry,
		registerAgent,
		unregisterAgent,
		setAgentEnabled,
		clearAgentRegistry,
	}
}
