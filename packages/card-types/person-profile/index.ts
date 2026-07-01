/**
 * packages/card-types/person-profile/index.ts
 *
 * Эталонный card-type v6. Первая реализация — в Фазе 3.
 * Сейчас — декларация contract'а для fractal-harness.
 */

import type { CardTypeDefinition } from '../_registry'

const personProfile: CardTypeDefinition = {
  kind: 'person-profile',
  primitives: [
    'identity',
    'feed',
    'messenger',
    'media-pipeline',
    'subscription-engine',
    'reviews-ratings',
    'authorship-registry',
    'credentials-vault',
    'policy-engine',
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
  modes: ['consumer', 'provider'],
  link: {
    instanceToType: async (instanceId: string) => {
      // resolveInstance → user.primaryRoleId
      // Placeholder: реализация в Фазе 3
      void instanceId
      return null
    },
  },
}

export default personProfile
