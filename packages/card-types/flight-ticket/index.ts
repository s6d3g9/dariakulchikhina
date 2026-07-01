/**
 * packages/card-types/flight-ticket/index.ts
 * Полёт как Pattern-Card. Фаза 3.
 */

import type { CardTypeDefinition } from '../_registry'

const flightTicket: CardTypeDefinition = {
  kind: 'flight-ticket',
  primitives: [
    'identity',
    'booking',
    'inventory',
    'payments',
    'credentials-vault',
    'policy-engine',
    'escrow-service',
    'notifications',
  ],
  instance: {
    view: () => import('./instance.view'),
    top: () => import('./panels/top.instance'),
    left: () => import('./panels/left.instance'),
    right: () => import('./panels/right.instance'),
    bottom: () => import('./panels/bottom.instance'),
  },
  type: {
    view: () => import('./type.view'),
    top: () => import('./panels/top.type'),
    left: () => import('./panels/left.type'),
    right: () => import('./panels/right.type'),
    bottom: () => import('./panels/bottom.type'),
  },
  modes: ['consumer'],
  link: {
    instanceToType: async (instanceId: string) => {
      // flight instance (PNR-based) → route / aircraft type
      void instanceId
      return null
    },
  },
}

export default flightTicket
