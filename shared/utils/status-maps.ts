/**
 * Единые карты статусов договоров и оплаты.
 * Используются в AdminToRContract и ClientContracts.
 */

export interface StatusOption {
  value:  string
  label:  string
  color:  string   // hex для кнопок
  token:  string   // именованный токен (gray/blue/green/red/yellow) для CSS-классов
}

export const CONTRACT_STATUSES: StatusOption[] = [
  { value: 'draft',    label: 'черновик',    color: '#9e9e9e', token: 'gray'   },
  { value: 'sent',     label: 'отправлен',   color: '#2196f3', token: 'blue'   },
  { value: 'signed',   label: 'подписан ✓',  color: '#4caf50', token: 'green'  },
  { value: 'rejected', label: 'отклонён',    color: '#f44336', token: 'red'    },
]

export const PAYMENT_STATUSES: StatusOption[] = [
  { value: 'pending', label: 'ожидает',    color: '#9e9e9e', token: 'gray'   },
  { value: 'partial', label: 'частично',   color: '#ffb300', token: 'yellow' },
  { value: 'paid',    label: 'оплачен ✓',  color: '#4caf50', token: 'green'  },
]

/** Быстрый поиск по значению: `CONTRACT_STATUS_MAP['signed']` */
export const CONTRACT_STATUS_MAP = Object.fromEntries(
  CONTRACT_STATUSES.map(s => [s.value, s]),
) as Record<string, StatusOption>

export const PAYMENT_STATUS_MAP = Object.fromEntries(
  PAYMENT_STATUSES.map(s => [s.value, s]),
) as Record<string, StatusOption>
