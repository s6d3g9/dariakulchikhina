import { toValue, type MaybeRefOrGetter } from 'vue'

import type { ApiV1ClientProjectProfile, ApiV1Envelope } from '~~/shared/types/api-v1'

export function useClientProjectProfile(slug: MaybeRefOrGetter<string>) {
  const requestHeaders = useRequestHeaders(['cookie'])

  return useFetch<ApiV1Envelope<ApiV1ClientProjectProfile>>(
    () => `/api/v1/client/projects/${toValue(slug)}/profile`,
    { headers: requestHeaders },
  )
}

export function updateClientProjectProfile(
  slug: MaybeRefOrGetter<string>,
  profile: Record<string, unknown>,
) {
  const requestHeaders = useRequestHeaders(['cookie'])

  return $fetch<ApiV1Envelope<ApiV1ClientProjectProfile>>(
    `/api/v1/client/projects/${toValue(slug)}/profile`,
    {
      method: 'PUT',
      headers: requestHeaders,
      body: { profile },
    },
  )
}
