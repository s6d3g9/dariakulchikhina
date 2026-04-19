import type { MessengerContactsOverview } from '../../entities/auth/model/useMessengerAuth'

export function useContactsApi() {
  const auth = useMessengerAuth()

  async function getContactsOverview(query?: string): Promise<MessengerContactsOverview> {
    return await auth.request<MessengerContactsOverview>('/contacts/overview', {
      method: 'GET',
      query: query ? { query } : undefined,
    })
  }

  async function inviteContact(targetUserId: string): Promise<void> {
    await auth.request('/contacts/invites', {
      method: 'POST',
      body: { targetUserId },
    })
  }

  async function acceptInvite(inviteId: string): Promise<void> {
    await auth.request(`/contacts/invites/${inviteId}/accept`, {
      method: 'POST',
    })
  }

  async function rejectInvite(inviteId: string): Promise<void> {
    await auth.request(`/contacts/invites/${inviteId}/reject`, {
      method: 'POST',
    })
  }

  async function removeContact(peerUserId: string): Promise<void> {
    await auth.request(`/contacts/${peerUserId}`, {
      method: 'DELETE',
    })
  }

  return {
    getContactsOverview,
    inviteContact,
    acceptInvite,
    rejectInvite,
    removeContact,
  }
}
