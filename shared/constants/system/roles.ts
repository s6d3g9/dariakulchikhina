export const SYSTEM_ROLE_VALUES = [
  'admin',
  'designer',
  'client',
  'contractor',
  'seller',
  'manager',
  'service',
] as const

export type SystemRole = typeof SYSTEM_ROLE_VALUES[number]
