export function useMessengerFeatures() {
  const config = useRuntimeConfig()

  const agentsEnabled = computed(() => (
    config.public.messengerAgentsEnabled !== false
    && String(config.public.messengerAgentsEnabled) !== 'false'
  ))

  return {
    agentsEnabled: readonly(agentsEnabled),
  }
}