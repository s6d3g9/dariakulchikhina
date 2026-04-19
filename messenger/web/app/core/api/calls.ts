import { buildMessengerUrl } from '../../utils/messenger-url'

export function useCallsApi() {
  const auth = useMessengerAuth()

  function postCallInsight(
    projectRootUrl: string,
    projectSlug: string,
    body: {
      title?: string
      summary: string
      transcript: string
      callId: string
      conversationId: string
      happenedAt: string
      actorName?: string
    },
  ) {
    return $fetch<{
      insight?: { id?: string }
      meta?: { blockerCountAdded?: number; checkpointCreated?: boolean }
    }>(
      buildMessengerUrl(projectRootUrl, `/api/projects/${encodeURIComponent(projectSlug)}/communications/call-insights`),
      { method: 'POST', credentials: 'include', body },
    )
  }

  function postCallInsightApply(projectRootUrl: string, projectSlug: string, insightId: string) {
    return $fetch<{
      meta?: { createdTaskCount?: number; createdSprint?: boolean }
    }>(
      buildMessengerUrl(projectRootUrl, `/api/projects/${encodeURIComponent(projectSlug)}/communications/call-insights/${encodeURIComponent(insightId)}/apply`),
      { method: 'POST', credentials: 'include', body: {} },
    )
  }

  function postLiveKitToken(conversationId: string) {
    return auth.request<{ token: string; serverUrl: string }>(
      `/conversations/${encodeURIComponent(conversationId)}/calls/livekit-token`,
      { method: 'POST' },
    )
  }

  return { postCallInsight, postCallInsightApply, postLiveKitToken }
}
