import type { ProjectCommunicationBootstrap } from '~~/shared/types/communications/communications'
import type {
  ApiV1ClientProjectCommunicationsBootstrap,
  ApiV1Envelope,
} from '~~/shared/types/api-v1'

type ProjectCommunicationsBootstrapApiScope = 'legacy' | 'client'

type ProjectCommunicationsBootstrapOptions = {
  apiScope?: MaybeRefOrGetter<ProjectCommunicationsBootstrapApiScope | null | undefined>
}

function isApiV1Envelope(
  payload: ProjectCommunicationBootstrap | ApiV1Envelope<ApiV1ClientProjectCommunicationsBootstrap>,
): payload is ApiV1Envelope<ApiV1ClientProjectCommunicationsBootstrap> {
  return Boolean(payload && typeof payload === 'object' && 'data' in payload && 'meta' in payload && 'errors' in payload)
}

export function useProjectCommunicationsBootstrap(
  projectSlug: MaybeRefOrGetter<string | null | undefined>,
  options: ProjectCommunicationsBootstrapOptions = {},
) {
  const slug = computed(() => toValue(projectSlug)?.trim() || '')
  const apiScope = computed<ProjectCommunicationsBootstrapApiScope>(() => toValue(options.apiScope) || 'legacy')
  const state = useFetch<ProjectCommunicationBootstrap>(
    () => apiScope.value === 'client'
      ? `/api/v1/client/projects/${slug.value}/communications/bootstrap`
      : `/api/projects/${slug.value}/communications/bootstrap`,
    {
      server: false,
      immediate: false,
      transform: (
        payload: ProjectCommunicationBootstrap | ApiV1Envelope<ApiV1ClientProjectCommunicationsBootstrap>,
      ) => isApiV1Envelope(payload)
        ? payload.data as ProjectCommunicationBootstrap
        : payload,
    })

  watch([slug, apiScope], async ([value]) => {
    if (!value) {
      state.clear()
      return
    }

    await state.execute()
  }, { immediate: true })

  return state
}
