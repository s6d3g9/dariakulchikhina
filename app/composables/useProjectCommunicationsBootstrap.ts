import type { ProjectCommunicationBootstrap } from '~~/shared/types/communications'

export function useProjectCommunicationsBootstrap(projectSlug: MaybeRefOrGetter<string | null | undefined>) {
  return useFetch<ProjectCommunicationBootstrap>(() => {
    const slug = toValue(projectSlug)?.trim()
    return slug ? `/api/projects/${slug}/communications/bootstrap` : null
  }, {
    server: false,
    immediate: true,
  })
}