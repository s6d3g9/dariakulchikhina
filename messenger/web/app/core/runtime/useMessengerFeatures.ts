export function useMessengerFeatures() {
  const config = useRuntimeConfig()

  const agentsEnabled = computed(() => {
    const raw = config.public?.messengerAgentsEnabled
    // Default ON unless explicitly disabled. Previously nullish/undefined
    // could flip this false on some render paths, hiding the Sessions tab.
    if (raw === false || raw === 'false' || raw === '0') return false
    return true
  })

  return {
    agentsEnabled: readonly(agentsEnabled),
  }
}