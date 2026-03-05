/**
 * Returns a reactive `active` ref that is `true` when the current
 * keep-alive page is mounted / activated, and `false` when deactivated.
 *
 * Usage in page template:
 *   <Teleport to="#admin-sidebar-portal" :disabled="!sidebarActive">
 *
 * Usage in script:
 *   const sidebarActive = useSidebarActive()
 */
export function useSidebarActive() {
  const active = ref(true)

  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false })

  return active
}
