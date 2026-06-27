import { toValue, type MaybeRefOrGetter } from 'vue'

import type { ApiV1ClientProjectDocuments, ApiV1Envelope } from '~~/shared/types/api-v1'

export function useClientProjectDocuments(slug: MaybeRefOrGetter<string>) {
  const requestHeaders = useRequestHeaders(['cookie'])

  return useFetch<ApiV1Envelope<ApiV1ClientProjectDocuments>>(
    () => `/api/v1/client/projects/${toValue(slug)}/documents`,
    { headers: requestHeaders },
  )
}
