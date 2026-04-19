import type { MessengerContactsOverview } from '../../auth/model/useMessengerAuth'

export function useMessengerContacts() {
  const contactsApi = useContactsApi()
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
      overview.value = await contactsApi.getContactsOverview(nextQuery)
    } finally {
      pending.value = false
    }
  }

  async function invite(targetUserId: string) {
    await contactsApi.inviteContact(targetUserId)
    await refresh(query.value)
  }

  async function accept(inviteId: string) {
    await contactsApi.acceptInvite(inviteId)
    await refresh(query.value)
  }

  async function reject(inviteId: string) {
    await contactsApi.rejectInvite(inviteId)
    await refresh(query.value)
  }

  async function removeContact(peerUserId: string) {
    await contactsApi.removeContact(peerUserId)
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