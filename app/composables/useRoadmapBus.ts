/**
 * Лёгкая шина: AdminRoadmap вызывает notifySaved() после сохранения,
 * AdminProjectPhase следит за lastSaved и обновляет свой фетч.
 */
export const useRoadmapBus = () => {
  const lastSaved = useState<number>('roadmap-last-saved', () => 0)
  function notifySaved() { lastSaved.value = Date.now() }
  return { lastSaved, notifySaved }
}
