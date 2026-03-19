import type { ProjectCommunicationBootstrap } from '~~/shared/types/communications'

export function useStandaloneCommunicationsBootstrap() {
  return useFetch<ProjectCommunicationBootstrap>('/api/chat/communications/bootstrap', {
    server: false,
    immediate: true,
  })
}