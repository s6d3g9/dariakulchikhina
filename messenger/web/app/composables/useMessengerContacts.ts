import type { MessengerContactsOverview } from './useMessengerAuth'

export function useMessengerContacts() {
  const auth = useMessengerAuth()
  const overview = useState<MessengerContactsOverview>('messenger-contacts-overview', () => ({
    contacts: [],
    invites: [],
    discover: [],
  }))
  const query = useState<string>('messenger-contacts-query', () => '')
  const pending = useState<boolean>('messenger-contacts-pending', () => false)

  async function refresh(nextQuery = query.value) {
    pending.value = true
    query.value = nextQuery

    try {
      overview.value = await auth.request<MessengerContactsOverview>('/contacts/overview', {
        method: 'GET',
        query: nextQuery ? { query: nextQuery } : undefined,
      })
    } finally {
      pending.value = false
    }
  }

  async function invite(targetUserId: string) {
    await auth.request('/contacts/invites', {
      method: 'POST',
      body: { targetUserId },
    })
    await refresh(query.value)
  }

  async function accept(inviteId: string) {
    await auth.request(`/contacts/invites/${inviteId}/accept`, {
      method: 'POST',
    })
    await refresh(query.value)
  }

  async function reject(inviteId: string) {
    await auth.request(`/contacts/invites/${inviteId}/reject`, {
      method: 'POST',
    })
    await refresh(query.value)
  }

  async function removeContact(peerUserId: string) {
    await auth.request(`/contacts/${peerUserId}`, {
      method: 'DELETE',
    })
    await refresh(query.value)
  }

  return {
    overview,
    query,
    pending,
    refresh,
    invite,
    accept,
    reject,
    removeContact,
  }
}